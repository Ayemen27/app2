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
      const stats = fs.statSync(backupPath);
      if (!fs.existsSync(backupPath) || stats.size < 100) {
        throw new Error("فشل التحقق من سلامة الملف: الملف مفقود أو حجمه غير منطقي");
      }

      // Integrity Check: Parse and verify structure
      const content = fs.readFileSync(backupPath, 'utf8');
      const parsed = JSON.parse(content);
      if (!parsed.data || Object.keys(parsed.data).length === 0) {
        throw new Error("فشل التحقق من سلامة البيانات: النسخة الاحتياطية فارغة");
      }

      console.log(`✅ [BackupService] Backup Integrity Verified: ${backupPath} (${stats.size} bytes)`);

      // تسجيل العملية في Audit Log
      try {
        const { storage } = await import('../storage');
        // @ts-ignore - Ignoring LSP error as we're adding the method to IStorage/DatabaseStorage
        await storage.createAuditLog({
          action: "BACKUP_CREATED",
          meta: { path: backupPath, totalRows, tablesCount: tablesSuccessfullyBackedUp, size: stats.size },
          createdAt: new Date()
        });
      } catch (logErr) {
        console.warn("⚠️ [BackupService] Failed to log backup action:", logErr);
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

  static async testConnection(target: 'local' | 'cloud') {
    try {
      if (target === 'local') {
        const db = new sqlite3(this.LOCAL_DB_PATH);
        db.close();
        return { success: true, message: "تم الاتصال بقاعدة البيانات المحلية بنجاح" };
      } else {
        const { pool } = await import('../db');
        const client = await pool.connect();
        const res = await client.query('SELECT current_database()');
        client.release();
        return { success: true, message: `تم الاتصال بالقاعدة السحابية: ${res.rows[0].current_database}` };
      }
    } catch (error: any) {
      return { success: false, message: `فشل الاتصال: ${error.message}` };
    }
  }

  static async analyzeDatabase(target: 'local' | 'cloud') {
    try {
      const { pool } = await import('../db');
      const client = target === 'cloud' ? await pool.connect() : null;
      
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

      const report = [];
      for (const table of tables) {
        try {
          let exists = false;
          if (target === 'cloud' && client) {
            const res = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
            exists = res.rows[0].exists;
          } else {
            const sqlite = new sqlite3(this.LOCAL_DB_PATH);
            const res = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
            exists = !!res;
            sqlite.close();
          }
          report.push({ table, status: exists ? 'exists' : 'missing' });
        } catch (e) {
          report.push({ table, status: 'error', error: (e as any).message });
        }
      }
      if (client) client.release();
      return { success: true, report };
    } catch (error: any) {
      return { success: false, message: error.message };
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

  static async restoreFromFile(filePath: string, targetDatabase: 'cloud' | 'local' = 'local'): Promise<boolean> {
    try {
      console.log(`📂 [BackupService] فك ضغط الملف: ${filePath} للاستعادة إلى ${targetDatabase}`);
      
      let backupData: any;
      if (filePath.endsWith('.json')) {
        backupData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } else if (filePath.endsWith('.gz')) {
        const compressedContent = fs.readFileSync(filePath);
        const sqlContent = zlib.gunzipSync(compressedContent).toString('utf-8');
        // If it's SQL, we might need a different parser, but the current backup is JSON
        // Let's assume we are handling the JSON format primarily as per runBackup()
        backupData = JSON.parse(sqlContent);
      }

      if (targetDatabase === 'local') {
        return await this.restoreToLocal(backupData.data);
      } else {
        return await this.restoreToCloud(backupData.data);
      }
    } catch (error) {
      console.error('❌ [BackupService] خطأ في الاستعادة:', error);
      return false;
    }
  }

  private static async restoreToLocal(data: Record<string, any[]>): Promise<boolean> {
    try {
      const targetInstance = new sqlite3(this.LOCAL_DB_PATH);
      targetInstance.pragma("foreign_keys = OFF");
      
      for (const [tableName, rows] of Object.entries(data)) {
        // Create table if not exists - simple version for SQLite
        if (rows.length > 0) {
          const firstRow = rows[0];
          const columns = Object.keys(firstRow).map(col => `"${col}" TEXT`).join(', ');
          targetInstance.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`);
          
          targetInstance.exec(`DELETE FROM "${tableName}"`);
          const colNames = Object.keys(firstRow).map(c => `"${c}"`).join(',');
          const placeholders = Object.keys(firstRow).map(() => '?').join(',');
          const stmt = targetInstance.prepare(`INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`);
          
          const transaction = targetInstance.transaction((items) => {
            for (const item of items) {
              const vals = Object.values(item).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
              stmt.run(...vals);
            }
          });
          transaction(rows);
        }
      }
      targetInstance.close();
      return true;
    } catch (e) {
      console.error("Local restore error:", e);
      return false;
    }
  }

  private static async restoreToCloud(data: Record<string, any[]>): Promise<boolean> {
    const { pool } = await import('../db');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Disable triggers to avoid issues during restore
      await client.query('SET session_replication_role = "replica"');

      for (const [tableName, rows] of Object.entries(data)) {
        if (rows.length === 0) continue;

        // Try to clear table
        try {
          await client.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
        } catch (e) {
          await client.query(`DELETE FROM "${tableName}"`);
        }

        const firstRow = rows[0];
        const columns = Object.keys(firstRow).map(c => `"${c}"`).join(', ');
        
        for (const row of rows) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          await client.query(`INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`, values);
        }
      }

      await client.query('SET session_replication_role = "origin"');
      await client.query('COMMIT');
      return true;
    } catch (e) {
      if (client) await client.query('ROLLBACK');
      console.error("Cloud restore error:", e);
      return false;
    } finally {
      if (client) client.release();
    }
  }
}
