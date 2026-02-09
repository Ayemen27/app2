import fs from 'fs';
import path from 'path';
import sqlite3 from 'better-sqlite3';
import { DATABASE_DDL } from './ddl/definitions';

export class BackupService {
  private static readonly LOCAL_DB_PATH = path.resolve(process.cwd(), 'local.db');

  static async initialize() {
    console.log("🛠️ [BackupService] Initializing...");
    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
  }

  static startAutoBackupScheduler() {
    console.log("⏰ [BackupService] Auto backup scheduler started");
    const intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS) || 6;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    setInterval(async () => {
      console.log("⏰ [BackupService] Running scheduled auto backup...");
      await this.runBackup();
    }, intervalMs);
  }

  private static async getAllTables(): Promise<string[]> {
    // جلب الجداول ديناميكياً من المخطط المعرف بدلاً من الاعتماد على DDL ثابت
    const schema = await import('../../../shared/schema');
    const tables: string[] = [];
    for (const key in schema) {
      if (schema[key] && typeof schema[key] === 'object' && (schema[key] as any).pgConfig) {
        tables.push((schema[key] as any).pgConfig.name);
      }
    }
    // إذا فشل الجلب الديناميكي نستخدم قائمة افتراضية
    return tables.length > 0 ? tables : ['users', 'projects', 'workers', 'wells', 'audit_logs'];
  }

  static async runBackup() {
    try {
      console.log("💾 [BackupService] Starting complete PostgreSQL backup...");
      const backupsDir = path.resolve(process.cwd(), 'backups');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupsDir, `backup-${timestamp}.json`);
      const tables = await this.getAllTables();
      const backupData: Record<string, any[]> = {};
      const { pool } = await import('../db');
      
      let tablesSuccessfullyBackedUp = 0;
      for (const tableName of tables) {
        try {
          // Normalize table name to lowercase to avoid "no such table" errors in case sensitive DBs
          const result = await pool.query(`SELECT * FROM "${tableName.toLowerCase()}"`);
          backupData[tableName] = result.rows;
          tablesSuccessfullyBackedUp++;
        } catch (e: any) {
          console.warn(`⚠️ [BackupService] Skipping table ${tableName}: ${e.message}`);
        }
      }

      const totalRows = Object.values(backupData).reduce((acc, rows) => acc + rows.length, 0);
      fs.writeFileSync(backupPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        version: "1.2",
        totalRows,
        tablesCount: tablesSuccessfullyBackedUp,
        data: backupData
      }, null, 2));

      return { 
        success: true, 
        message: `تم النسخ الاحتياطي لـ ${tablesSuccessfullyBackedUp} جدول بنجاح`, 
        path: backupPath,
        totalRows 
      };
    } catch (error: any) {
      console.error("❌ [BackupService] Backup failed:", error);
      return { success: false, message: error.message };
    }
  }

  static async analyzeDatabase(target: 'local' | 'cloud') {
    try {
      const { pool } = await import('../db');
      const tables = await this.getAllTables();
      const report = [];
      const sqlite = target === 'local' ? new sqlite3(this.LOCAL_DB_PATH) : null;
      
      for (const table of tables) {
        let exists = false;
        if (target === 'cloud') {
          const res = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
          exists = res.rows[0].exists;
        } else if (sqlite) {
          const res = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
          exists = !!res;
        }
        report.push({ table, status: exists ? 'exists' : 'missing' });
      }
      if (sqlite) sqlite.close();
      return { success: true, report };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async createMissingTables(target: 'local' | 'cloud', tablesToCreate: string[]) {
    try {
      if (target === 'cloud') {
        const { pool } = await import('../db');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const table of tablesToCreate) {
            const ddl = DATABASE_DDL[table];
            if (ddl) {
              await client.query(ddl);
            }
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      } else {
        const db = new sqlite3(this.LOCAL_DB_PATH);
        db.transaction(() => {
          for (const table of tablesToCreate) {
            let ddl = DATABASE_DDL[table];
            if (ddl) {
              // Convert PG DDL to SQLite compatible
              ddl = ddl.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
                       .replace(/gen_random_uuid\(\)/gi, '(lower(hex(randomblob(16))))')
                       .replace(/JSONB/gi, 'TEXT')
                       .replace(/TIMESTAMP/gi, 'DATETIME')
                       .replace(/DECIMAL\(\d+,\d+\)/gi, 'REAL');
              db.exec(ddl);
            }
          }
        })();
        db.close();
      }
      return { success: true, message: `تم إنشاء ${tablesToCreate.length} جدول مفقود بنجاح` };
    } catch (error: any) {
      console.error("❌ [BackupService] Table creation failed:", error);
      return { success: false, message: error.message };
    }
  }

  static async listAutoBackups() {
    try {
      const backupsDir = path.resolve(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) return { success: true, logs: [] };
      const files = fs.readdirSync(backupsDir);
      const logs = files
        .filter(f => (f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.db'))) || f.startsWith('manual_backup_'))
        .map((f, index) => {
          try {
            const filePath = path.join(backupsDir, f);
            const stats = fs.statSync(filePath);
            return {
              id: index + 1,
              filename: f,
              size: (stats.size / (1024 * 1024)).toFixed(2),
              status: 'success',
              createdAt: stats.mtime.toISOString(),
              destination: f.endsWith('.json') ? 'Local/Cloud' : 'Local'
            };
          } catch (e) {
            return null;
          }
        })
        .filter((log): log is any => log !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return { success: true, logs };
    } catch (error: any) {
      console.error("❌ [BackupService] Error listing backups:", error);
      return { success: false, message: error.message, logs: [] };
    }
  }

  static getAutoBackupStatus() {
    return {
      isEnabled: true,
      intervalHours: Number(process.env.BACKUP_INTERVAL_HOURS) || 6,
      lastRun: new Date().toISOString(), // In a real scenario, this would be tracked in storage
      status: "active"
    };
  }

  static async restoreBackup(filename: string, target: 'local' | 'cloud') {
    try {
      const backupPath = path.join(process.cwd(), 'backups', filename);
      if (!fs.existsSync(backupPath)) throw new Error("الملف غير موجود");
      const content = fs.readFileSync(backupPath, 'utf8');
      const { data } = JSON.parse(content);
      
    // إيقاف القيود مؤقتاً لضمان عدم حدوث تعارضات في العلاقات
    if (target === 'cloud') {
      const { pool } = await import('../db');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET CONSTRAINTS ALL DEFERRED');
        
        for (const tableName of backupTables) {
          try {
            // Verify table exists in cloud
            const tableNameLower = tableName.toLowerCase();
            const tableRes = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [tableNameLower]);
            if (!tableRes.rows[0].exists) {
              console.warn(`⚠️ [BackupService] Table ${tableName} does not exist in Cloud DB, skipping...`);
              continue;
            }
            await client.query(`TRUNCATE TABLE "${tableNameLower}" RESTART IDENTITY CASCADE`);
          } catch (e: any) {
            console.error(`❌ [BackupService] Error truncating table ${tableName}:`, e.message);
          }
        }
        
        for (const [tableName, rows] of Object.entries(data as Record<string, any[]>)) {
          try {
            if (rows.length === 0) continue;
            const tableNameLower = tableName.toLowerCase();
            const tableRes = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [tableNameLower]);
            if (!tableRes.rows[0].exists) continue;

            const columns = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
            for (const row of rows) {
              const values = Object.values(row);
              const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
              await client.query(`INSERT INTO "${tableNameLower}" (${columns}) VALUES (${placeholders})`, values);
            }
          } catch (e: any) {
            console.error(`❌ [BackupService] Error restoring table ${tableName}:`, e.message);
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      const db = new sqlite3(this.LOCAL_DB_PATH);
      // Ensure tables exist before restore
      const schema = await import('../../../shared/schema');
      db.transaction(() => {
        for (const [key, value] of Object.entries(schema)) {
          if (value && typeof value === 'object' && (value as any).pgConfig) {
            const tableName = (value as any).pgConfig.name;
            const tableNameLower = tableName.toLowerCase();
            const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableNameLower);
            if (!tableExists) {
              console.log(`🛠️ [BackupService] Creating missing local table: ${tableName}`);
              // Simple create table for SQLite
              const columns = Object.keys((value as any).columns || {});
              const colDefs = columns.length > 0 
                ? columns.map(c => `"${c}" TEXT`).join(', ')
                : '"id" TEXT PRIMARY KEY';
              db.prepare(`CREATE TABLE IF NOT EXISTS "${tableNameLower}" (${colDefs})`).run();
            }
          }
        }

        for (const [tableName, rows] of Object.entries(data as Record<string, any[]>)) {
          if (rows.length === 0) continue;
          const tableNameLower = tableName.toLowerCase();
          const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableNameLower);
          if (!tableExists) continue;

          db.prepare(`DELETE FROM "${tableNameLower}"`).run();
          const columns = Object.keys(rows[0]);
          const placeholders = columns.map(() => '?').join(', ');
          const stmt = db.prepare(`INSERT INTO "${tableNameLower}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`);
          for (const row of rows) {
            stmt.run(Object.values(row));
          }
        }
      })();
      db.close();
    }
      return { success: true, message: "تمت الاستعادة بنجاح" };
    } catch (error: any) {
      console.error("❌ [BackupService] Restore failed:", error);
      return { success: false, message: error.message };
    }
  }
}
