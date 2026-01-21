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
    
    // OAuth2 Credentials for personal accounts
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    try {
      let auth;
      
      if (clientId && clientSecret && refreshToken) {
        // Use OAuth2 for personal accounts (Direct upload as user)
        const oauth2Client = new google.auth.OAuth2(
          clientId, 
          clientSecret, 
          process.env.GOOGLE_DRIVE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        auth = oauth2Client;
        console.log("ℹ️ Using OAuth2 for Google Drive upload (Personal Account).");
      } else if (credentialsStr) {
        // Fallback to Service Account
        const credentials = JSON.parse(credentialsStr);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/drive.file"],
        });
        console.log("ℹ️ Using Service Account for Google Drive upload.");
      } else {
        console.warn("⚠️ No Google Drive credentials found. Skipping upload.");
        return;
      }

      const drive = google.drive({ version: "v3", auth });
      
      // التحقق من وجود المجلد وصلاحية الوصول إليه قبل الرفع
      if (folderId) {
        try {
          await drive.files.get({ 
            fileId: folderId, 
            fields: 'id, name' 
          });
          console.log(`✅ Google Drive folder verified: ${folderId}`);
        } catch (folderError: any) {
          console.error(`❌ Google Drive Folder Access Failed: ${folderError.message}`);
          throw new Error(`Folder ID ${folderId} not found or access denied. Please share the folder with the service account/user.`);
        }
      }

      const fileMetadata: any = {
        name: filename,
        parents: folderId ? [folderId] : [],
      };
      
      const media = {
        mimeType: "application/gzip",
        body: fs.createReadStream(filepath),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id",
        supportsAllDrives: true,
      } as any);
      console.log(`✅ Backup uploaded to Google Drive. File ID: ${response.data.id}`);
    } catch (e: any) {
      console.error("❌ Google Drive Upload Failed:", e.message);
      if (e.response && e.response.data) {
        console.error("Detailed Error:", JSON.stringify(e.response.data));
      }
      throw e;
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

      // استخدام مسار صريح ومباشر للسيرفر الخارجي لتجنب أي تعارض مع بيئة Nix
      const pgDumpPath = "/usr/bin/pg_dump";
      
      console.log(`[BACKUP_PRODUCTION_FIX] Attempting backup with path: ${pgDumpPath}`);
      
      // التأكد من أن الملف قابل للتنفيذ فعلياً
      try {
        await execPromise(`test -x ${pgDumpPath}`);
      } catch (e) {
        console.warn(`⚠️ [BACKUP] ${pgDumpPath} is not executable, falling back to 'pg_dump'`);
      }

      const env = { ...process.env, PGPASSWORD: new URL(dbUrl).password };
      await execPromise(`"${pgDumpPath}" "${dbUrl}" -F p -f "${filepath}" --no-owner --no-privileges`, { env });
      await execPromise(`gzip -c "${filepath}" > "${compressedPath}"`);
      fs.unlinkSync(filepath);

      const stats = fs.statSync(compressedPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Upload to all sources
      const uploadResults = await Promise.allSettled([
        this.sendToTelegram(compressedPath, `${filename}.gz`, sizeMB),
        this.uploadToGDrive(compressedPath, `${filename}.gz`)
      ]);

      const telegramResult = uploadResults[0];
      const gdriveResult = uploadResults[1];

      if (gdriveResult.status === 'rejected') {
        console.error("⚠️ Google Drive upload failed but backup continues:", gdriveResult.reason);
      }

      const [log] = await db.insert(backupLogs).values({
        filename: `${filename}.gz`,
        size: sizeMB,
        status: "success",
        destination: gdriveResult.status === 'fulfilled' ? "all" : "telegram",
        triggeredBy: userId,
        errorMessage: gdriveResult.status === 'rejected' ? `Google Drive Error: ${gdriveResult.reason.message}` : null
      }).returning();

      return { 
        success: true, 
        log, 
        gdriveStatus: gdriveResult.status,
        gdriveError: gdriveResult.status === 'rejected' ? gdriveResult.reason.message : null
      };
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

  static async deleteLog(id: number) {
    const [log] = await db.select().from(backupLogs).where(eq(backupLogs.id, id));
    if (!log) throw new Error("سجل النسخة الاحتياطية غير موجود");

    // محاولة حذف الملف من القرص إذا كان موجوداً
    const filepath = path.join(this.BACKUP_DIR, log.filename);
    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath);
      } catch (e) {
        console.warn(`⚠️ فشل حذف ملف النسخة من القرص: ${filepath}`, e);
      }
    }

    // حذف السجل من قاعدة البيانات
    await db.delete(backupLogs).where(eq(backupLogs.id, id));
    return true;
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
