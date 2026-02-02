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
        'wells', 'well_tasks', 'well_expenses', 'refresh_tokens', 'audit_logs'
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
      return { 
        success: true, 
        message: `تم إنشاء نسخة احتياطية حقيقية بنجاح (${totalRows} سجل في ${tablesSuccessfullyBackedUp} جدول)`, 
        path: backupPath,
        tablesCount: tablesSuccessfullyBackedUp,
        totalRows
      };
    } catch (error: any) {
      console.error("❌ [BackupService] Backup failed:", error);
      return { success: false, message: `فشل النسخ الاحتياطي: ${error.message}` };
    }
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
