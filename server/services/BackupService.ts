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
    const credentials = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentials) return;

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });

      const drive = google.drive({ version: "v3", auth });
      const fileMetadata = {
        name: filename,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || ""],
      };
      const media = {
        mimeType: "application/gzip",
        body: fs.createReadStream(filepath),
      };

      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id",
      });
      console.log("✅ Backup uploaded to Google Drive");
    } catch (e) {
      console.error("Google Drive Upload Failed", e);
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

      await execPromise(`pg_dump "${dbUrl}" -F p -f "${filepath}"`);
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
