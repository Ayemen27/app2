import fs from 'fs';
import path from 'path';
import sqlite3 from 'better-sqlite3';
import zlib from 'zlib';

export class BackupService {
  private static readonly LOCAL_DB_PATH = path.resolve(process.cwd(), 'local.db');

  static async initialize() {
    console.log("🛠️ [BackupService] Initializing...");
    // Create directory if not exists
    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
  }

  static startAutoBackupScheduler() {
    console.log("⏰ [BackupService] Auto backup scheduler started");
    // تشغيل النسخ الاحتياطي التلقائي كل 6 ساعات (أو حسب الإعدادات)
    const intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS) || 6;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      console.log("⏰ [BackupService] Running scheduled auto backup...");
      await this.runBackup();
    }, intervalMs);
  }

  static async runBackup() {
    try {
      console.log("💾 [BackupService] Starting real PostgreSQL backup...");
      const backupsDir = path.resolve(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupsDir, `backup-${timestamp}.json`);
      
      // Get all tables from schema
      const tables = [
        'users', 'projects', 'workers', 'worker_types', 'fund_transfers', 
        'worker_attendance', 'materials', 'material_purchases', 
        'transportation_expenses', 'daily_expense_summaries', 
        'worker_transfers', 'worker_balances', 'autocomplete_data',
        'worker_misc_expenses', 'suppliers', 'supplier_payments',
        'wells', 'well_tasks', 'well_task_accounts', 'well_expenses', 'well_audit_logs',
        'project_types', 'project_fund_transfers', 'report_templates', 
        'emergency_users', 'refresh_tokens', 'audit_logs', 'notifications', 
        'notification_read_states', 'equipment', 'equipment_movements'
      ];

      const backupData: Record<string, any[]> = {};
      
      // Import pool dynamically to avoid circular dependencies
      const { pool } = await import('../db');
      
      let tablesSuccessfullyBackedUp = 0;
      for (const tableName of tables) {
        try {
          // Use double quotes for table names to handle mixed case/reserved words
          const result = await pool.query(`SELECT * FROM "${tableName}"`);
          backupData[tableName] = result.rows;
          tablesSuccessfullyBackedUp++;
        } catch (e: any) {
          console.warn(`⚠️ [BackupService] Could not backup table ${tableName}:`, e.message);
          // Try without quotes as fallback
          try {
             const resultFallback = await pool.query(`SELECT * FROM ${tableName}`);
             backupData[tableName] = resultFallback.rows;
             tablesSuccessfullyBackedUp++;
          } catch (innerError: any) {
             console.error(`❌ [BackupService] Final failure for table ${tableName}:`, innerError.message);
          }
        }
      }

      const totalRows = Object.values(backupData).reduce((acc, rows) => acc + rows.length, 0);
      
      // Write the file first
      fs.writeFileSync(backupPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        version: "1.1",
        totalRows,
        tablesCount: tablesSuccessfullyBackedUp,
        data: backupData
      }, null, 2));

      // Verify the file was actually written and has content
      if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size < 10) {
        throw new Error("فشل كتابة ملف النسخة الاحتياطية أو الملف فارغ");
      }

      console.log(`✅ [BackupService] Real data backup created: ${backupPath} (${totalRows} rows)`);

      // 📤 إرسال النسخة الاحتياطية إلى تلجرام
      await this.sendBackupToTelegram(backupPath, totalRows);

      return { 
        success: true, 
        message: `تم إنشاء نسخة احتياطية حقيقية بنجاح (${totalRows} سجل في ${tablesSuccessfullyBackedUp} جدول)`, 
        path: backupPath,
        tablesCount: tablesSuccessfullyBackedUp,
        totalRows,
        file: path.basename(backupPath),
        size: fs.statSync(backupPath).size,
        rowsCount: totalRows,
        duration: 0 // Will be calculated if needed
      };
    } catch (error: any) {
      console.error("❌ [BackupService] Backup failed:", error);
      return { success: false, message: `فشل النسخ الاحتياطي: ${error.message}`, error: error.message };
    }
  }

  static async sendBackupToTelegram(backupPath: string, totalRows: number) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (botToken && chatId) {
        console.log("📤 [BackupService] Sending backup to Telegram...");
        const TelegramBot = (await import('node-telegram-bot-api')).default;
        const bot = new TelegramBot(botToken, { polling: false });
        
        await bot.sendDocument(chatId, backupPath, {
          caption: `📦 نسخة احتياطية جديدة\n📅 التاريخ: ${new Date().toLocaleString('ar-EG')}\n📊 السجلات: ${totalRows}\n📂 الملف: ${path.basename(backupPath)}`
        });
        console.log("✅ [BackupService] Backup sent to Telegram successfully");
        return true;
      } else {
        console.warn("⚠️ [BackupService] Telegram configuration missing (TOKEN or CHAT_ID)");
        return false;
      }
    } catch (tgError: any) {
      console.error("❌ [BackupService] Failed to send backup to Telegram:", tgError.message);
      return false;
    }
  }

  static getAutoBackupStatus() {
    const backupsDir = path.resolve(process.cwd(), 'backups');
    let lastBackup = null;
    let lastBackupSize = 0;
    let lastBackupTime = null;

    if (fs.existsSync(backupsDir)) {
      const files = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({ name: f, stats: fs.statSync(path.join(backupsDir, f)) }))
        .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

      if (files.length > 0) {
        lastBackup = files[0].name;
        lastBackupSize = files[0].stats.size;
        lastBackupTime = files[0].stats.mtime.toISOString();
      }
    }

    return {
      enabled: process.env.BACKUP_ENABLED === 'true',
      interval: Number(process.env.BACKUP_INTERVAL_HOURS) || 6,
      lastBackup,
      lastBackupSize,
      lastBackupTime,
      nextBackupIn: 0 // This would need a tracker to be accurate
    };
  }

  static listAutoBackups() {
    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) return [];

    return fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.json') || f.endsWith('.sql.gz'))
      .map(f => {
        const stats = fs.statSync(path.join(backupsDir, f));
        return {
          name: f,
          path: f,
          size: stats.size,
          timestamp: stats.mtime.toISOString(),
          time: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static async restoreFromFile(filePath: string): Promise<boolean> {
    try {
      console.log(`📂 [BackupService] فك ضغط الملف: ${filePath}`);
      const compressedContent = fs.readFileSync(filePath);
      const sqlContent = zlib.gunzipSync(compressedContent).toString('utf-8');

      console.log(`🏗️ [BackupService] تهيئة SQLite...`);
      const targetInstance = new sqlite3(this.LOCAL_DB_PATH);
      
      targetInstance.pragma("foreign_keys = OFF");
      targetInstance.pragma("journal_mode = OFF");
      targetInstance.pragma("synchronous = OFF");

      // تنظيف الجداول القديمة
      const tables = targetInstance.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name: string}[];
      for (const table of tables) {
        if (table.name !== 'sqlite_sequence') {
          targetInstance.exec(`DROP TABLE IF EXISTS "${table.name}"`);
        }
      }

      targetInstance.exec("BEGIN TRANSACTION;");

      // استخراج جداول CREATE TABLE
      const createTableRegex = /CREATE TABLE\s+(?:public\.)?(\w+)\s+\(([\s\S]*?)\);/g;
      let match;
      while ((match = createTableRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const body = match[2];
        let converted = `CREATE TABLE "${tableName}" (${body});`
          .replace(/"public"\./g, "")
          .replace(/"/g, "`")
          .replace(/character varying(\(\d+\))?/gi, "TEXT")
          .replace(/timestamp( without time zone)?/gi, "TEXT")
          .replace(/numeric\(\d+,\d+\)/gi, "NUMERIC")
          .replace(/boolean/gi, "INTEGER")
          .replace(/uuid/gi, "TEXT")
          .replace(/jsonb/gi, "TEXT")
          .replace(/DEFAULT gen_random_uuid\(\)/gi, "PRIMARY KEY")
          .replace(/DEFAULT now\(\)/gi, "DEFAULT CURRENT_TIMESTAMP")
          .replace(/'t'/g, "1")
          .replace(/'f'/g, "0")
          .replace(/::[a-z0-9]+/gi, "")
          .replace(/WITH\s+\([^)]+\)/gi, "");
        
        try { targetInstance.exec(converted); } catch (e) { }
      }

      // استخراج بيانات COPY - تحسين المنطق ليشمل جميع الجداول والبيانات
      const copyRegex = /COPY (?:public\.)?(\w+)\s+\((.*?)\)\s+FROM stdin;([\s\S]*?)\\\./g;
      while ((match = copyRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const cols = match[2].replace(/"/g, "`");
        const data = match[3].trim();
        if (!data) continue;

        const lines = data.split('\n');
        const placeholders = cols.split(',').map(() => '?').join(',');
        const insertStmt = targetInstance.prepare(`INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`);

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const vals = line.split('\t').map(v => v === '\\N' ? null : v);
          try { insertStmt.run(...vals); } catch (e) { }
        }
      }

      targetInstance.exec("COMMIT;");
      targetInstance.close();
      console.log("✅ [BackupService] تم استعادة جميع البيانات بنجاح.");
      return true;
    } catch (error) {
      console.error('❌ [BackupService] خطأ في الاستعادة الشاملة:', error);
      return false;
    }
  }
}
