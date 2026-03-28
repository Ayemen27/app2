import { db } from "../../db.js";
import { waImportBatches, waRawMessages, waMediaAssets } from "@shared/schema";
import type { InsertWaImportBatch, InsertWaMediaAsset, WaImportBatch } from "@shared/schema";
import { eq } from "drizzle-orm";
import { parseWhatsAppChat, detectChatSource } from "./WhatsAppParserService.js";
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";

const MAX_ZIP_SIZE = 500 * 1024 * 1024;
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2000;
const MAX_TOTAL_UNCOMPRESSED = 2 * 1024 * 1024 * 1024;
const UPLOAD_DIR = "uploads/wa-import";
const ALLOWED_MEDIA_MIMES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
  '.opus': 'audio/ogg', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function computeSha256FromBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function isPathTraversal(entryPath: string, destDir: string): boolean {
  const resolved = path.resolve(destDir, entryPath);
  return !resolved.startsWith(path.resolve(destDir));
}

function getMimeType(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_MEDIA_MIMES[ext] || null;
}

export class WhatsAppIngestionService {
  private ensureUploadDir(): string {
    const dir = path.resolve(UPLOAD_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async processZipUpload(
    zipBuffer: Buffer,
    filename: string,
    uploadedBy: string
  ): Promise<WaImportBatch> {
    if (zipBuffer.length > MAX_ZIP_SIZE) {
      throw new Error(`ZIP file exceeds maximum size of ${MAX_ZIP_SIZE / 1024 / 1024}MB`);
    }

    const zipSha256 = computeSha256FromBuffer(zipBuffer);

    const existingBatch = await db.select()
      .from(waImportBatches)
      .where(eq(waImportBatches.zipSha256, zipSha256))
      .limit(1);

    if (existingBatch.length > 0) {
      throw new Error(`Duplicate ZIP file detected. This file was already imported in batch #${existingBatch[0].id}`);
    }

    const uploadDir = this.ensureUploadDir();
    const batchDir = path.join(uploadDir, `batch-${Date.now()}`);
    fs.mkdirSync(batchDir, { recursive: true });

    let chatContent = '';
    let chatSource = 'other';
    const mediaFiles: Array<{ filePath: string; originalFilename: string; sha256: string; mimeType: string; fileSize: number; mediaStatus?: string; skipReason?: string }> = [];

    try {
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      if (entries.length > MAX_ZIP_ENTRIES) {
        throw new Error(`ZIP contains ${entries.length} entries, exceeding limit of ${MAX_ZIP_ENTRIES}`);
      }

      let totalUncompressed = 0;

      for (const entry of entries) {
        if (entry.isDirectory) continue;

        totalUncompressed += entry.header.size;
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
          throw new Error(`ZIP total uncompressed size exceeds ${MAX_TOTAL_UNCOMPRESSED / 1024 / 1024 / 1024}GB limit`);
        }

        const entryName = entry.entryName;
        if (isPathTraversal(entryName, batchDir)) {
          console.warn(`[WAImport] ZIP-slip attempt blocked: ${entryName}`);
          continue;
        }

        const targetPath = path.join(batchDir, path.basename(entryName));

        if (entryName.endsWith('.txt') && !chatContent) {
          chatContent = entry.getData().toString('utf-8');
          chatSource = detectChatSource(chatContent);
        } else {
          const mimeType = getMimeType(entryName);
          if (!mimeType) {
            console.log(`[WAImport] Skipped unsupported media file: ${path.basename(entryName)}`);
            mediaFiles.push({
              filePath: path.join(batchDir, path.basename(entryName)),
              originalFilename: path.basename(entryName),
              sha256: computeSha256FromBuffer(entry.getData()),
              mimeType: 'application/octet-stream',
              fileSize: entry.header.size,
              mediaStatus: 'skipped_unsupported' as const,
              skipReason: `Unsupported file extension: ${path.extname(entryName).toLowerCase()}`,
            });
            continue;
          }

          const entryData = entry.getData();
          if (entryData.length > MAX_MEDIA_SIZE) {
            mediaFiles.push({
              filePath: targetPath,
              originalFilename: path.basename(entryName),
              sha256: computeSha256FromBuffer(entryData),
              mimeType,
              fileSize: entryData.length,
            });
            continue;
          }

          fs.writeFileSync(targetPath, entryData);
          mediaFiles.push({
            filePath: targetPath,
            originalFilename: path.basename(entryName),
            sha256: computeSha256FromBuffer(entryData),
            mimeType,
            fileSize: entryData.length,
          });
        }
      }

      if (!chatContent) {
        throw new Error('No chat TXT file found in the ZIP archive');
      }

      const [batch] = await db.insert(waImportBatches).values({
        filename,
        zipSha256,
        chatSource,
        status: 'processing',
        uploadedBy,
        totalMessages: 0,
        totalMedia: 0,
      }).returning();

      const parsedMessages = parseWhatsAppChat(chatContent, batch.id, chatSource);

      if (parsedMessages.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < parsedMessages.length; i += CHUNK_SIZE) {
          const chunk = parsedMessages.slice(i, i + CHUNK_SIZE);
          await db.insert(waRawMessages).values(chunk);
        }
      }

      const insertedMessages = await db.select()
        .from(waRawMessages)
        .where(eq(waRawMessages.batchId, batch.id));

      const messagesByAttachment = new Map<string, number>();
      for (const msg of insertedMessages) {
        if (msg.attachmentRef) {
          const basename = msg.attachmentRef.trim();
          messagesByAttachment.set(basename, msg.id);
        }
      }

      for (const media of mediaFiles) {
        const linkedMessageId = messagesByAttachment.get(media.originalFilename) || null;
        const mediaStatus = media.mediaStatus || (media.fileSize > MAX_MEDIA_SIZE ? 'skipped_too_large' : 'processed');
        const skipReason = media.skipReason || (media.fileSize > MAX_MEDIA_SIZE ? `File size ${(media.fileSize / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_MEDIA_SIZE / 1024 / 1024}MB limit` : null);

        await db.insert(waMediaAssets).values({
          batchId: batch.id,
          messageId: linkedMessageId,
          filePath: media.filePath,
          originalFilename: media.originalFilename,
          sha256: media.sha256,
          mimeType: media.mimeType,
          fileSize: media.fileSize,
          mediaStatus,
          skipReason,
        });
      }

      const [updatedBatch] = await db.update(waImportBatches)
        .set({
          status: 'completed',
          totalMessages: parsedMessages.length,
          totalMedia: mediaFiles.length,
          completedAt: new Date(),
        })
        .where(eq(waImportBatches.id, batch.id))
        .returning();

      return updatedBatch;

    } catch (error: any) {
      if (error.message?.includes('Duplicate ZIP') || error.message?.includes('No chat TXT')) {
        throw error;
      }

      try {
        const existingBatchCheck = await db.select()
          .from(waImportBatches)
          .where(eq(waImportBatches.zipSha256, zipSha256))
          .limit(1);

        if (existingBatchCheck.length > 0) {
          const [failedBatch] = await db.update(waImportBatches)
            .set({
              status: 'failed',
              errorMessage: error.message || 'Unknown error',
            })
            .where(eq(waImportBatches.id, existingBatchCheck[0].id))
            .returning();
          return failedBatch;
        } else {
          const [failedBatch] = await db.insert(waImportBatches).values({
            filename,
            zipSha256,
            chatSource,
            status: 'failed',
            errorMessage: error.message || 'Unknown error',
            uploadedBy,
          }).returning();
          return failedBatch;
        }
      } catch {
        throw error;
      }
    } finally {
      console.log(`[WAImport] Media files preserved in: ${batchDir}`);
    }
  }

  async getBatches(): Promise<WaImportBatch[]> {
    return db.select().from(waImportBatches).orderBy(waImportBatches.createdAt);
  }

  async getBatch(id: number): Promise<WaImportBatch | undefined> {
    const [batch] = await db.select()
      .from(waImportBatches)
      .where(eq(waImportBatches.id, id))
      .limit(1);
    return batch;
  }

  async getBatchMessages(batchId: number, limit = 100, offset = 0) {
    return db.select()
      .from(waRawMessages)
      .where(eq(waRawMessages.batchId, batchId))
      .orderBy(waRawMessages.messageOrder)
      .limit(limit)
      .offset(offset);
  }

  async getBatchMedia(batchId: number) {
    return db.select()
      .from(waMediaAssets)
      .where(eq(waMediaAssets.batchId, batchId));
  }
}

export const waIngestionService = new WhatsAppIngestionService();
