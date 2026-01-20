import { db } from "../db";
import { backupLogs, backupSettings } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import axios from "axios";
import { google } from "googleapis";

const execPromise = promisify(exec);

export class BackupService {
  private static BACKUP_DIR = path.join(process.cwd(), "backups");

  static async initialize() {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  private static async uploadToGDrive(filepath: string, filename: string) {
    const credentialsStr = process.env.GOOGLE_DRIVE_CREDENTIALS;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    if (!credentialsStr) {
      console.warn("⚠️ GOOGLE_DRIVE_CREDENTIALS is not set. Skipping Google Drive upload.");
      return;
    }

    try {
      const credentials = JSON.parse(credentialsStr);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
        clientOptions: {
          subject: process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL, // البريد الذي سيتم انتحاله (صاحب المساحة)
        },
      });

      const drive = google.drive({ version: "v3", auth });
      const fileMetadata: any = {
        name: filename,
      };
      
      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: "application/gzip",
        body: fs.createReadStream(filepath),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id",
        supportsAllDrives: true, // دعم المجلدات المشتركة والمشاركة الخارجية
      } as any);
      console.log(`✅ Backup uploaded to Google Drive. File ID: ${response.data.id}`);
    } catch (e: any) {
      console.error("❌ Google Drive Upload Failed:", e.message);
    }
  }

  static async runBackup(userId?: string, manual = false): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(this.BACKUP_DIR, filename);
    const compressedPath = `${filepath}.gz`;

    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error("DATABASE_URL not found");

      // استخدام pg_dump v16 بشكل صريح من المسار المتوفر في بيئة Nix
      const pgDumpPath = "/nix/store/bgwr5i8jf8jpg75rr53rz3fqv5k8yrwp-postgresql-16.10/bin/pg_dump";
      await execPromise(`"${pgDumpPath}" "${dbUrl}" -F p -f "${filepath}" --no-owner --no-privileges`);
      await execPromise(`gzip -c "${filepath}" > "${compressedPath}"`);
      fs.unlinkSync(filepath);

      const stats = fs.statSync(compressedPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Upload to all sources
      await Promise.allSettled([
        this.sendToTelegram(compressedPath, `${filename}.gz`, sizeMB),
        this.uploadToGDrive(compressedPath, `${filename}.gz`)
      ]);

      const [log] = await db.insert(backupLogs).values({
        filename: `${filename}.gz`,
        size: sizeMB,
        status: "success",
        destination: "all",
        triggeredBy: userId,
      }).returning();

      // إشعار المستخدم بنجاح العملية وتنبيهه لمشكلة قوقل درايف إذا حدثت
      return { success: true, log };
    } catch (error: any) {
      console.error("❌ Backup Failed:", error);
      await db.insert(backupLogs).values({
        filename,
        status: "failed",
        destination: "all",
        errorMessage: error.message,
        triggeredBy: userId,
      });
      throw error;
    }
  }

  private static async sendToTelegram(filepath: string, filename: string, sizeMB: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) return;

    try {
      const message = `📂 *نسخة احتياطية جديدة*\n\n📄 الملف: ${filename}\n⚖️ الحجم: ${sizeMB} MB\n📅 التاريخ: ${new Date().toLocaleString('ar-SA')}`;
      
      const form = new FormData();
      const fileBuffer = fs.readFileSync(filepath);
      const blob = new Blob([fileBuffer]);
      form.append('chat_id', chatId);
      form.append('caption', message);
      form.append('parse_mode', 'Markdown');
      form.append('document', blob, filename);

      await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form);
      console.log("✅ Backup sent to Telegram");
    } catch (e: any) {
      console.error("Telegram Notification Failed", e.response?.data || e.message);
    }
  }

  static async getLogs() {
    return await db.select().from(backupLogs).orderBy(desc(backupLogs.createdAt)).limit(50);
  }

  static async restore(logId: number) {
    const [log] = await db.select().from(backupLogs).where(eq(backupLogs.id, logId));
    if (!log || log.status !== "success") throw new Error("Invalid backup file");

    const filepath = path.join(this.BACKUP_DIR, log.filename);
    if (!fs.existsSync(filepath)) throw new Error("Backup file missing from storage");

    // عملية الاستعادة خطيرة جداً، سنقوم بفك الضغط أولاً
    const uncompressedPath = filepath.replace(".gz", "");
    await execPromise(`gunzip -c "${filepath}" > "${uncompressedPath}"`);

    // تنفيذ الاستعادة (تحذير: هذا سيقوم بمسح البيانات الحالية وتعويضها)
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not found");

    // 1. مسح المخطط العام (Public Schema) لإعادة بنائه نظيفاً
    await execPromise(`psql "${dbUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`);
    
    // 2. استعادة البيانات من الملف
    await execPromise(`psql "${dbUrl}" -f "${uncompressedPath}"`);
    
    fs.unlinkSync(uncompressedPath);
    return true;
  }
}
