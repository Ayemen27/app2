import { db } from "../db";
import { backupLogs, users } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import axios from "axios";
import { google } from "googleapis";
import Database from "better-sqlite3";

const execPromise = promisify(exec);

export class BackupService {
  private static BACKUP_DIR = path.join(process.cwd(), "backups");

  static async initialize() {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  private static async uploadToGDrive(filepath: string, filename: string) {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    try {
      if (!clientId || !clientSecret || !refreshToken) return;
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      await drive.files.create({
        requestBody: { name: filename, parents: folderId ? [folderId] : [] },
        media: { mimeType: "application/gzip", body: fs.createReadStream(filepath) },
        fields: "id"
      } as any);
      console.log(`✅ Backup uploaded to Google Drive: ${filename}`);
    } catch (e: any) { console.error("❌ GDrive Error:", e.message); }
  }

  static async runBackup(userId?: string, manual = false): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(this.BACKUP_DIR, filename);
    const compressedPath = `${filepath}.gz`;
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error("DATABASE_URL missing");
      const env = { ...process.env, PGPASSWORD: new URL(dbUrl).password };
      await execPromise(`pg_dump "${dbUrl}" -F p -f "${filepath}" --no-owner --no-privileges`, { env });
      await execPromise(`gzip -c "${filepath}" > "${compressedPath}"`);
      fs.unlinkSync(filepath);
      const sizeMB = (fs.statSync(compressedPath).size / (1024 * 1024)).toFixed(2);
      await Promise.allSettled([this.sendToTelegram(compressedPath, `${filename}.gz`, sizeMB), this.uploadToGDrive(compressedPath, `${filename}.gz`)]);
      const [log] = await db.insert(backupLogs).values({ filename: `${filename}.gz`, size: sizeMB, status: "success", destination: "all", triggeredBy: userId }).returning();
      
      // مزامنة تلقائية مع المجلد المحلي لحالات الطوارئ
      const emergencyPath = path.join(process.cwd(), "backups", "emergency-latest.sql.gz");
      fs.copyFileSync(compressedPath, emergencyPath);
      
      return { success: true, log };
    } catch (error: any) {
      await db.insert(backupLogs).values({ filename, status: "failed", destination: "all", errorMessage: error.message, triggeredBy: userId });
      throw error;
    }
  }

  private static async sendToTelegram(filepath: string, filename: string, sizeMB: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try {
      const form = new FormData();
      const fileBuffer = fs.readFileSync(filepath);
      form.append('chat_id', chatId);
      form.append('caption', `📂 Backup: ${filename} (${sizeMB} MB)`);
      form.append('parse_mode', 'Markdown');
      form.append('document', new Blob([fileBuffer]), filename);
      await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form);
      console.log("✅ Backup sent to Telegram");
    } catch (e: any) { console.error("Telegram Error:", e.message); }
  }

  static async getLogs() { return await db.select().from(backupLogs).orderBy(desc(backupLogs.createdAt)).limit(50); }

  static startAutoBackupScheduler() {
    console.log("⏰ Backup Scheduler Started");
    setTimeout(async () => {
      try { await BackupService.runBackup(); } catch (e) {}
    }, 60000);
    setInterval(async () => {
      try { await BackupService.runBackup(); } catch (e) {}
    }, 6 * 3600000);
  }

  static async deleteLog(id: number) {
    const [log] = await db.select().from(backupLogs).where(eq(backupLogs.id, id));
    if (!log) throw new Error("سجل النسخة الاحتياطية غير موجود");
    const filepath = path.join(this.BACKUP_DIR, log.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    await db.delete(backupLogs).where(eq(backupLogs.id, id));
    return true;
  }

  static async restore(logId: number) {
    const [log] = await db.select().from(backupLogs).where(eq(backupLogs.id, logId));
    if (!log || log.status !== "success") throw new Error("ملف نسخة احتياطية غير صالح");
    
    return await this.restoreFromFile(path.join(this.BACKUP_DIR, log.filename));
  }

  static async restoreFromFile(filepath: string) {
    const uncompressedPath = filepath.replace(".gz", "");
    
    try {
      // فك الضغط
      console.log(`📂 [BackupService] فك ضغط الملف: ${filepath}`);
      await execPromise(`gunzip -c "${filepath}" > "${uncompressedPath}"`);
      
      // اختيار قاعدة البيانات بناءً على الوضع الحالي
      const isEmergency = (global as any).isEmergencyMode || !process.env.DATABASE_URL;
      const dbUrl = isEmergency 
        ? null // لا يوجد URL لـ SQLite
        : (process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL_SUPABASE || process.env.DATABASE_URL);

      if (isEmergency || !dbUrl) {
        console.log("🔄 جاري استعادة البيانات إلى قاعدة البيانات المحلية (SQLite)...");
        const sqlContent = fs.readFileSync(uncompressedPath, 'utf8');
        
        // تحسين تقسيم الأوامر للتعامل مع النسخ الكبيرة
        const commands = sqlContent.split(/;\s*$/m).filter(cmd => cmd.trim().length > 0);
        console.log(`📊 [BackupService] جاري تنفيذ ${commands.length} أمر SQL...`);
        
        const { sqliteInstance: globalSqlite } = await import("../db");
        const targetInstance = globalSqlite || new Database(path.resolve(process.cwd(), "local.db"), { timeout: 300000 });
        
        // استخدام .exec() المباشر لسرعة فائقة ودعم أوامر متعددة
        targetInstance.pragma("foreign_keys = OFF");
        targetInstance.pragma("journal_mode = OFF");
        targetInstance.pragma("synchronous = OFF");
        targetInstance.pragma("busy_timeout = 300000"); // 5 دقائق
        
        try {
          // محاولة معالجة الأوامر التي قد لا تتوافق مع SQLite
          const filteredSql = sqlContent
            // تحويل علامات الاقتباس المزدوجة PostgreSQL إلى backticks SQLite
            .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"/g, "`$1`")
            // تحويلات PostgreSQL -> SQLite
            .replace(/gen_random_uuid\(\)/g, "hex(randomblob(16))")
            .replace(/SERIAL PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
            .replace(/BIGSERIAL PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
            .replace(/TIMESTAMP WITH TIME ZONE/gi, "DATETIME")
            .replace(/TIMESTAMP WITHOUT TIME ZONE/gi, "DATETIME")
            .replace(/TIMESTAMPTZ/gi, "DATETIME")
            .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
            .replace(/CURRENT_TIMESTAMP AT TIME ZONE[^,)]+/gi, "CURRENT_TIMESTAMP")
            .replace(/::text/g, "")
            .replace(/::jsonb/g, "")
            .replace(/::json/g, "")
            .replace(/::integer/g, "")
            .replace(/::boolean/g, "")
            .replace(/::varchar(\(\d+\))?/g, "")
            .replace(/::numeric(\(\d+,\d+\))?/g, "")
            .replace(/RETURNING [^;]+/gi, "")
            .replace(/ON CONFLICT[^;]+DO NOTHING/gi, "OR IGNORE")
            .replace(/ON CONFLICT[^;]+DO UPDATE[^;]+/gi, "OR REPLACE")
            // إزالة أوامر PostgreSQL غير المدعومة
            .replace(/CREATE EXTENSION[^;]*;/gi, "")
            .replace(/SET [^;]+;/gi, "")
            .replace(/SELECT pg_catalog[^;]+;/gi, "")
            .replace(/COMMENT ON[^;]+;/gi, "")
            .replace(/ALTER TABLE[^;]*OWNER TO[^;]*;/gi, "")
            .replace(/GRANT [^;]+;/gi, "")
            .replace(/REVOKE [^;]+;/gi, "");

          targetInstance.exec("BEGIN TRANSACTION;");
          targetInstance.exec(filteredSql);
          targetInstance.exec("COMMIT;");
        } catch (transError: any) {
          try { targetInstance.exec("ROLLBACK;"); } catch (e) {}
          console.error("❌ SQL Error during batch execution:", transError.message);
          
          // Fallback: تقسيم الملف الكبير إلى أجزاء أصغر لتجنب تجميد المحرك
          console.log("🔄 Fallback: Executing statements in batches...");
          const sqlParts = sqlContent.split(/;\s*$/m).filter(cmd => cmd.trim().length > 0);
          
          for (let i = 0; i < sqlParts.length; i += 50) {
            const batch = sqlParts.slice(i, i + 50);
            targetInstance.exec("BEGIN TRANSACTION;");
            for (const cmd of batch) {
              try {
                const sqliteCmd = cmd
                  // تحويل علامات الاقتباس المزدوجة PostgreSQL
                  .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"/g, "`$1`")
                  .replace(/gen_random_uuid\(\)/g, "hex(randomblob(16))")
                  .replace(/SERIAL PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
                  .replace(/BIGSERIAL PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
                  .replace(/TIMESTAMP WITH TIME ZONE/gi, "DATETIME")
                  .replace(/TIMESTAMP WITHOUT TIME ZONE/gi, "DATETIME")
                  .replace(/TIMESTAMPTZ/gi, "DATETIME")
                  .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
                  .replace(/::text/g, "")
                  .replace(/::jsonb/g, "")
                  .replace(/::json/g, "")
                  .replace(/::integer/g, "")
                  .replace(/::boolean/g, "")
                  .replace(/::varchar(\(\d+\))?/g, "")
                  .replace(/RETURNING [^;]+/gi, "");
                
                const trimmed = sqliteCmd.trim();
                if (trimmed.startsWith("CREATE SCHEMA") || trimmed.startsWith("SET ") || 
                    trimmed.startsWith("SELECT pg_catalog") || trimmed.startsWith("COMMENT ON") ||
                    trimmed.startsWith("CREATE EXTENSION") || trimmed.startsWith("ALTER TABLE") && trimmed.includes("OWNER TO") ||
                    trimmed.startsWith("GRANT ") || trimmed.startsWith("REVOKE ")) continue;
                
                targetInstance.exec(trimmed);
              } catch (e) {}
            }
            targetInstance.exec("COMMIT;");
          }
        }
        
        targetInstance.pragma("journal_mode = DELETE");
        targetInstance.pragma("synchronous = FULL");
        targetInstance.pragma("foreign_keys = ON");
      } else {
        console.log("🔄 جاري استعادة البيانات إلى القاعدة السحابية...");
        const env = { ...process.env, PGPASSWORD: new URL(dbUrl).password };
        await execPromise(`psql "${dbUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`, { env });
        await execPromise(`psql "${dbUrl}" -f "${uncompressedPath}"`, { env });
      }
      
      if (fs.existsSync(uncompressedPath)) fs.unlinkSync(uncompressedPath);
      console.log("✅ تمت استعادة البيانات بنجاح");
      
      // تشغيل فحص التكامل فوراً بعد الاستعادة
      await this.runIntegrityCheck();
      
      return true;
    } catch (error: any) {
      if (fs.existsSync(uncompressedPath)) fs.unlinkSync(uncompressedPath);
      console.error("❌ فشل استعادة البيانات:", error.message);
      throw new Error(`فشل الاستعادة: ${error.message}`);
    }
  }

  static async runIntegrityCheck() {
    console.log("🔍 [BackupService] بدء فحص تكامل البيانات...");
    const checkResult: any = {
      status: "success",
      lastChecked: new Date().toISOString(),
      issues: []
    };

    try {
      const isEmergency = (global as any).isEmergencyMode;
      const currentDb = db;

      const tables = ['projects', 'workers', 'users', 'wells'];
      for (const table of tables) {
        try {
          await currentDb.execute(sql.raw(`SELECT count(*) FROM ${table} LIMIT 1`));
        } catch (e: any) {
          checkResult.status = "warning";
          checkResult.issues.push(`جدول مفقود أو غير قابل للقراءة: ${table}`);
        }
      }

      if (!isEmergency) {
        const userCount = await currentDb.select().from(users).limit(1);
        if (userCount.length === 0) {
          checkResult.status = "warning";
          checkResult.issues.push("لم يتم العثور على مستخدمين في قاعدة البيانات الحالية");
        }
      }

      (global as any).lastIntegrityCheck = checkResult;
      console.log(`✅ [BackupService] اكتمل فحص التكامل بحالة: ${checkResult.status}`);
      return checkResult;
    } catch (error: any) {
      checkResult.status = "failed";
      checkResult.issues.push(`خطأ فني أثناء الفحص: ${error.message}`);
      (global as any).lastIntegrityCheck = checkResult;
      return checkResult;
    }
  }
}
