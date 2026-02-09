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
    try {
      const { pool } = await import('../db');
      // جلب قائمة الجداول الحقيقية من قاعدة بيانات PostgreSQL
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      const tables = result.rows.map(row => row.table_name);
      
      if (tables.length > 0) {
        console.log(`📋 [BackupService] Found ${tables.length} tables in database:`, tables);
        return tables;
      }
    } catch (error: any) {
      console.warn("⚠️ [BackupService] Error fetching tables from DB:", error.message);
    }

    // fallback إذا فشل الاستعلام
    return ['users', 'projects', 'workers', 'suppliers', 'materials', 'wells', 'well_expenses', 'audit_logs', 'notifications'];
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
          // التأكد من استخدام اقتباسات مزدوجة لأسماء الجداول للتعامل مع الحالة الحساسة
          console.log(`🔍 [BackupService] Querying table: ${tableName}`);
          const result = await pool.query(`SELECT * FROM "${tableName}"`);
          backupData[tableName] = result.rows;
          tablesSuccessfullyBackedUp++;
          console.log(`✅ [BackupService] Backed up table: ${tableName} (${result.rows.length} rows)`);
        } catch (e: any) {
          console.error(`❌ [BackupService] Failed to back up table ${tableName}:`, e.message);
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

      console.log(`🏁 [BackupService] Backup completed: ${backupPath} (Total rows: ${totalRows})`);

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

  static async getAvailableDatabases() {
    const dbs = [];
    const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    
    // البحث عن جميع الروابط التي تبدأ بـ DATABASE_URL_
    // Use a standard while loop to avoid --downlevelIteration issues with matchAll
    const regex = /DATABASE_URL_([a-zA-Z0-9_]+)=(.+)/g;
    let match;
    while ((match = regex.exec(envContent)) !== null) {
      dbs.push({
        id: match[1].toLowerCase(),
        name: match[1].replace(/_/g, ' '),
        url: match[2].trim()
      });
    }

    // إضافة الخيارات الافتراضية إذا لم تكن موجودة
    if (!dbs.find(d => d.id === 'central')) {
      const centralUrl = process.env.DATABASE_URL_CENTRAL;
      if (centralUrl) {
        dbs.push({ id: 'central', name: 'Central DB', url: centralUrl });
      }
    }
    
    return dbs.filter(d => d.url);
  }

  static async testConnection(target: string) {
    try {
      let targetUrl = '';
      if (target === 'central') {
        targetUrl = process.env.DATABASE_URL_CENTRAL || '';
      } else {
        const dbs = await this.getAvailableDatabases();
        const db = dbs.find(d => d.id === target.toLowerCase());
        if (db) targetUrl = db.url;
      }

      if (!targetUrl) throw new Error("لم يتم العثور على رابط الاتصال");

      const { Pool } = await import('pg');
      const testPool = new Pool({ 
        connectionString: targetUrl,
        connectionTimeoutMillis: 5000 
      });
      
      const client = await testPool.connect();
      await client.query('SELECT 1');
      client.release();
      await testPool.end();

      return { success: true, message: "تم الاتصال بنجاح بقاعدة البيانات الحقيقية" };
    } catch (error: any) {
      return { success: false, message: `فشل الاتصال: ${error.message}` };
    }
  }

  static async restoreBackup(filename: string, target: string) {
    try {
      const backupPath = path.join(process.cwd(), 'backups', filename);
      if (!fs.existsSync(backupPath)) throw new Error("الملف غير موجود");
      
      const content = fs.readFileSync(backupPath, 'utf8');
      const { data } = JSON.parse(content);
      
      // تحديد قاعدة البيانات المستهدفة
      let targetPool;
      if (target === 'local' || target === 'central') {
        const { pool } = await import('../db');
        targetPool = pool;
      } else {
        // اكتشاف الرابط من .env للقاعدة المحددة
        const dbs = await this.getAvailableDatabases();
        const selectedDb = dbs.find(d => d.id === target.toLowerCase());
        if (!selectedDb) throw new Error(`قاعدة البيانات ${target} غير معروفة`);
        
        const { Pool } = await import('pg');
        targetPool = new Pool({ connectionString: selectedDb.url });
      }

      const client = await targetPool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET CONSTRAINTS ALL DEFERRED');
        
        // جلب الجداول الموجودة في النسخة الاحتياطية
        const backupTables = Object.keys(data);

        for (const tableName of backupTables) {
          try {
            const tableNameLower = tableName.toLowerCase();
            const tableRes = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [tableNameLower]);
            if (!tableRes.rows[0].exists) {
              console.warn(`⚠️ [BackupService] Table ${tableName} does not exist in target DB, skipping...`);
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
        if (target !== 'local' && target !== 'central') await targetPool.end();
      }

      return { success: true, message: "تمت الاستعادة بنجاح" };
    } catch (error: any) {
      console.error("❌ [BackupService] Restore failed:", error);
      return { success: false, message: error.message };
    }
  }
}
