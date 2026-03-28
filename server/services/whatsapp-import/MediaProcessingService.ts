import { db } from "../../db.js";
import { waMediaAssets } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

export interface MediaProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  totalText: number;
}

async function ocrImage(filePath: string): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(filePath, 'ara+eng');
  return data.text || '';
}

async function extractPdfText(filePath: string): Promise<string> {
  const pdf = (await import('pdf-parse')).default;
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  return data.text || '';
}

async function extractExcelText(filePath: string): Promise<string> {
  const XLSX = (await import('xlsx')).default;
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      lines.push(`[${sheetName}]`);
      lines.push(csv.trim());
    }
  }
  return lines.join('\n');
}

export async function processMediaForBatch(batchId: number): Promise<MediaProcessingResult> {
  const result: MediaProcessingResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    totalText: 0,
  };

  const assets = await db.select()
    .from(waMediaAssets)
    .where(eq(waMediaAssets.batchId, batchId));

  for (const asset of assets) {
    if (asset.ocrText) {
      result.skipped++;
      continue;
    }

    if (asset.mediaStatus === 'skipped_unsupported' || asset.mediaStatus === 'skipped_too_large') {
      result.skipped++;
      continue;
    }

    if (!fs.existsSync(asset.filePath)) {
      result.skipped++;
      continue;
    }

    let mime = asset.mimeType || '';

    if (!mime) {
      const ext = path.extname(asset.originalFilename || asset.filePath || '').toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
        '.pdf': 'application/pdf',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
      };
      mime = mimeMap[ext] || '';
      if (mime) {
        console.log(`[MediaProcessing] Detected mime by extension: ${ext} → ${mime} for asset ${asset.id}`);
      }
    }

    try {
      let extractedText = '';

      if (mime.startsWith('image/')) {
        extractedText = await ocrImage(asset.filePath);
      } else if (mime === 'application/pdf') {
        extractedText = await extractPdfText(asset.filePath);
      } else if (
        mime.startsWith('application/vnd.openxmlformats') ||
        mime === 'application/vnd.ms-excel'
      ) {
        extractedText = await extractExcelText(asset.filePath);
      } else {
        await db.update(waMediaAssets)
          .set({ mediaStatus: 'skipped_unsupported', skipReason: `نوع غير مدعوم: ${mime || 'مجهول'}` })
          .where(eq(waMediaAssets.id, asset.id));
        result.skipped++;
        continue;
      }

      const trimmedText = extractedText.trim();
      if (trimmedText) {
        await db.update(waMediaAssets)
          .set({
            ocrText: trimmedText,
            mediaStatus: 'ocr_completed',
          })
          .where(eq(waMediaAssets.id, asset.id));
        result.processed++;
        result.totalText += trimmedText.length;
      } else {
        await db.update(waMediaAssets)
          .set({ mediaStatus: 'ocr_completed' })
          .where(eq(waMediaAssets.id, asset.id));
        result.processed++;
      }
    } catch (err: any) {
      console.error(`[MediaProcessing] Failed to process asset ${asset.id} (${asset.originalFilename}): ${err.message}`);
      await db.update(waMediaAssets)
        .set({
          mediaStatus: 'ocr_failed',
          skipReason: err.message || 'OCR/extraction failed',
        })
        .where(eq(waMediaAssets.id, asset.id));
      result.failed++;
    }
  }

  return result;
}
