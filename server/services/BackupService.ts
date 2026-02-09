import fs from 'fs';
import path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable, Writable } from 'stream';
import cron from 'node-cron';
import { TelegramService } from './TelegramService';
import { GoogleDriveService } from './GoogleDriveService';

const BACKUPS_DIR = path.resolve(process.cwd(), 'backups');
const MAX_RETENTION = Number(process.env.BACKUP_MAX_RETENTION) || 20;
const CRON_SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || '0 */6 * * *';

interface BackupStatus {
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  totalSuccess: number;
  totalFailure: number;
  isRunning: boolean;
  schedulerEnabled: boolean;
  cronSchedule: string;
  nextRunAt: string | null;
}

interface BackupMeta {
  version: string;
  timestamp: string;
  totalRows: number;
  tablesCount: number;
  tables: Record<string, number>;
  compressed: boolean;
  sizeBytes?: number;
  durationMs?: number;
  environment: string;
}

export class BackupService {
  private static status: BackupStatus = {
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
    totalSuccess: 0,
    totalFailure: 0,
    isRunning: false,
    schedulerEnabled: false,
    cronSchedule: CRON_SCHEDULE,
    nextRunAt: null,
  };

  private static cronTask: ReturnType<typeof cron.schedule> | null = null;

  static async initialize() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    console.log(`📁 [BackupService] مجلد النسخ: ${BACKUPS_DIR}`);
  }

  static startAutoBackupScheduler() {
    if (this.cronTask) {
      this.cronTask.stop();
    }

    if (!cron.validate(CRON_SCHEDULE)) {
      console.error(`❌ [BackupService] جدول cron غير صالح: ${CRON_SCHEDULE}`);
      return;
    }

    this.cronTask = cron.schedule(CRON_SCHEDULE, async () => {
      console.log('⏰ [BackupService] بدء النسخ الاحتياطي التلقائي المجدول...');
      await this.runBackup('auto');
    }, {
      timezone: process.env.TZ || 'Asia/Riyadh',
    });

    this.status.schedulerEnabled = true;
    this.status.cronSchedule = CRON_SCHEDULE;
    console.log(`⏰ [BackupService] الجدولة نشطة: ${CRON_SCHEDULE}`);
  }

  static stopScheduler() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      this.status.schedulerEnabled = false;
      console.log('⏹️ [BackupService] تم إيقاف الجدولة');
    }
  }

  private static async getAllTables(): Promise<string[]> {
    try {
      const { pool } = await import('../db');
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      return result.rows.map(row => row.table_name);
    } catch (error: any) {
      console.warn('⚠️ [BackupService] فشل جلب الجداول:', error.message);
      return [];
    }
  }

  static async runBackup(triggeredBy: string = 'manual'): Promise<any> {
    if (this.status.isRunning) {
      return { 
        success: false, 
        message: 'يوجد نسخ احتياطي قيد التشغيل حالياً، انتظر حتى ينتهي',
        code: 'BACKUP_IN_PROGRESS'
      };
    }

    this.status.isRunning = true;
    this.status.lastRunAt = new Date().toISOString();
    const startTime = Date.now();

    try {
      await this.initialize();
      console.log(`💾 [BackupService] بدء النسخ الاحتياطي (${triggeredBy})...`);

      const { pool } = await import('../db');
      const tables = await this.getAllTables();
      
      if (tables.length === 0) {
        throw new Error('لم يتم العثور على أي جداول في قاعدة البيانات');
      }

      const backupData: Record<string, any[]> = {};
      const tableCounts: Record<string, number> = {};
      let totalRows = 0;

      for (const tableName of tables) {
        try {
          const result = await pool.query(`SELECT * FROM "${tableName}"`);
          backupData[tableName] = result.rows;
          tableCounts[tableName] = result.rows.length;
          totalRows += result.rows.length;
        } catch (e: any) {
          console.warn(`⚠️ [BackupService] تخطي جدول ${tableName}: ${e.message}`);
        }
      }

      const durationMs = Date.now() - startTime;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const meta: BackupMeta = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        totalRows,
        tablesCount: Object.keys(backupData).length,
        tables: tableCounts,
        compressed: true,
        durationMs,
        environment: process.env.NODE_ENV || 'development',
      };

      const fullData = JSON.stringify({ meta, data: backupData });
      const gzFilename = `backup-${timestamp}.json.gz`;
      const gzPath = path.join(BACKUPS_DIR, gzFilename);

      await pipeline(
        Readable.from(Buffer.from(fullData, 'utf-8')),
        createGzip({ level: 6 }),
        fs.createWriteStream(gzPath)
      );

      const stats = fs.statSync(gzPath);
      const originalSize = Buffer.byteLength(fullData, 'utf-8');
      const compressedSize = stats.size;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

      this.status.lastSuccessAt = new Date().toISOString();
      this.status.totalSuccess++;
      this.status.lastError = null;
      this.status.isRunning = false;

      await this.enforceRetentionPolicy();

      console.log(`✅ [BackupService] نسخ احتياطي ناجح: ${gzFilename}`);
      console.log(`   📊 ${Object.keys(backupData).length} جدول | ${totalRows} صف | ${(compressedSize / 1024 / 1024).toFixed(2)} MB | ضغط ${compressionRatio}% | ${durationMs}ms`);

      const result: any = {
        success: true,
        message: `تم النسخ الاحتياطي لـ ${Object.keys(backupData).length} جدول (${totalRows} صف) بنجاح`,
        filename: gzFilename,
        path: gzPath,
        totalRows,
        tablesCount: Object.keys(backupData).length,
        sizeBytes: compressedSize,
        sizeMB: (compressedSize / 1024 / 1024).toFixed(2),
        originalSizeMB: (originalSize / 1024 / 1024).toFixed(2),
        compressionRatio: `${compressionRatio}%`,
        durationMs,
        triggeredBy,
        driveUploaded: false,
        telegramSent: false,
      };

      await this.postBackupActions(result, gzPath);

      return result;
    } catch (error: any) {
      this.status.lastFailureAt = new Date().toISOString();
      this.status.lastError = error.message;
      this.status.totalFailure++;
      this.status.isRunning = false;
      console.error('❌ [BackupService] فشل النسخ:', error.message);

      TelegramService.sendBackupNotification({
        success: false,
        message: error.message,
        triggeredBy,
      }).catch(() => {});

      return { success: false, message: error.message };
    }
  }

  private static async postBackupActions(result: any, filePath: string): Promise<void> {
    try {
      if (GoogleDriveService.isEnabled()) {
        console.log('☁️ [BackupService] رفع النسخة إلى Google Drive...');
        const driveResult = await GoogleDriveService.uploadBackupFile(filePath, result.filename);
        result.driveUploaded = driveResult.success;
        result.driveUrl = driveResult.webViewLink || null;
        result.driveFileId = driveResult.fileId || null;
        if (driveResult.success) {
          console.log(`✅ [BackupService] تم الرفع إلى Drive: ${driveResult.fileId}`);
        } else {
          console.warn(`⚠️ [BackupService] فشل الرفع إلى Drive: ${driveResult.message}`);
        }
      } else {
        console.log('ℹ️ [BackupService] Google Drive غير مفعّل - تخطي الرفع');
      }
    } catch (error: any) {
      console.error('❌ [BackupService] خطأ في رفع Drive:', error.message);
      result.driveUploaded = false;
    }

    try {
      if (TelegramService.isEnabled()) {
        const fileSizeMB = result.sizeBytes ? result.sizeBytes / (1024 * 1024) : 0;
        const TELEGRAM_FILE_LIMIT_MB = 50;

        if (fileSizeMB > 0 && fileSizeMB <= TELEGRAM_FILE_LIMIT_MB && result.success) {
          console.log(`📤 [BackupService] إرسال ملف النسخة إلى Telegram (${fileSizeMB.toFixed(2)} MB)...`);

          const now = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
          const driveStatus = result.driveUploaded
            ? `✅ Google Drive`
            : `⚠️ Drive غير مرفوع`;

          const caption = [
            `💾 <b>نسخة احتياطية - AXION</b>`,
            `📊 ${result.tablesCount} جدول | ${result.totalRows} سجل`,
            `💿 ${result.sizeMB} MB | ضغط ${result.compressionRatio}`,
            `⏱ ${((result.durationMs || 0) / 1000).toFixed(1)} ثانية`,
            `🔧 ${result.triggeredBy === 'auto' ? 'تلقائي' : 'يدوي'} | ☁️ ${driveStatus}`,
            `🕐 ${now}`,
          ].join('\n');

          const fileSent = await TelegramService.sendDocument({
            filePath,
            caption,
            parseMode: 'HTML',
          });
          result.telegramSent = fileSent;
          result.telegramFileSent = fileSent;

          if (fileSent) {
            console.log('✅ [BackupService] تم إرسال ملف النسخة إلى Telegram');
          } else {
            console.warn('⚠️ [BackupService] فشل إرسال الملف - إرسال الإشعار النصي فقط');
            const sent = await TelegramService.sendBackupNotification(result);
            result.telegramSent = sent;
            result.telegramFileSent = false;
          }
        } else if (fileSizeMB > TELEGRAM_FILE_LIMIT_MB) {
          console.log(`⚠️ [BackupService] حجم الملف (${fileSizeMB.toFixed(1)} MB) يتجاوز حد Telegram (${TELEGRAM_FILE_LIMIT_MB} MB) - إرسال إشعار نصي فقط`);
          const sent = await TelegramService.sendBackupNotification(result);
          result.telegramSent = sent;
          result.telegramFileSent = false;
        } else {
          const sent = await TelegramService.sendBackupNotification(result);
          result.telegramSent = sent;
          result.telegramFileSent = false;
        }
      } else {
        console.log('ℹ️ [BackupService] Telegram غير مفعّل - تخطي الإشعار');
      }
    } catch (error: any) {
      console.error('❌ [BackupService] خطأ في إشعار/ملف Telegram:', error.message);
      result.telegramSent = false;
      result.telegramFileSent = false;
    }
  }

  static async restoreBackup(filename: string, target: string = 'local'): Promise<any> {
    if (this.status.isRunning) {
      return { success: false, message: 'يوجد عملية نسخ/استعادة قيد التشغيل' };
    }

    if (!this.isValidFilename(filename)) {
      return { success: false, message: 'اسم ملف غير صالح' };
    }

    this.status.isRunning = true;
    const startTime = Date.now();

    try {
      const backupPath = path.resolve(BACKUPS_DIR, filename);
      if (!backupPath.startsWith(BACKUPS_DIR) || !fs.existsSync(backupPath)) {
        this.status.isRunning = false;
        throw new Error('ملف النسخة الاحتياطية غير موجود');
      }

      let rawContent: string;

      if (filename.endsWith('.gz')) {
        const chunks: Buffer[] = [];
        await pipeline(
          fs.createReadStream(backupPath),
          createGunzip(),
          new Writable({
            write(chunk, _encoding, callback) {
              chunks.push(chunk);
              callback();
            }
          })
        );
        rawContent = Buffer.concat(chunks).toString('utf-8');
      } else {
        rawContent = fs.readFileSync(backupPath, 'utf-8');
      }

      const parsed = JSON.parse(rawContent);
      const data = parsed.data || parsed;

      let targetPool;
      const { pool } = await import('../db');

      if (target === 'local' || target === 'central') {
        targetPool = pool;
      } else {
        const dbs = await this.getAvailableDatabases();
        const selectedDb = dbs.find(d => d.id === target.toLowerCase());
        if (!selectedDb) throw new Error(`قاعدة البيانات ${target} غير معروفة`);
        const { Pool } = await import('pg');
        targetPool = new Pool({ connectionString: selectedDb.url, connectionTimeoutMillis: 10000 });
      }

      const client = await targetPool.connect();
      const report: { table: string; rows: number; status: string; error?: string }[] = [];

      try {
        await client.query('BEGIN');
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        const backupTables = Object.keys(data);

        for (const tableName of backupTables) {
          const tableNameLower = tableName.toLowerCase();
          try {
            const tableRes = await client.query(
              `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
              [tableNameLower]
            );
            if (tableRes.rows[0].exists) {
              await client.query(`TRUNCATE TABLE "${tableNameLower}" RESTART IDENTITY CASCADE`);
            }
          } catch (e: any) {
            console.warn(`⚠️ [Restore] تخطي تجهيز ${tableName}: ${e.message}`);
          }
        }

        for (const [tableName, rows] of Object.entries(data as Record<string, any[]>)) {
          const tableNameLower = tableName.toLowerCase();
          try {
            if (!rows || rows.length === 0) {
              report.push({ table: tableName, rows: 0, status: 'empty' });
              continue;
            }

            const tableCheck = await client.query(
              `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
              [tableNameLower]
            );
            if (!tableCheck.rows[0].exists) {
              report.push({ table: tableName, rows: 0, status: 'skipped', error: 'الجدول غير موجود' });
              continue;
            }

            const columns = Object.keys(rows[0]);
            const colList = columns.map(c => `"${c}"`).join(', ');

            const BATCH_SIZE = 100;
            let insertedCount = 0;

            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
              const batch = rows.slice(i, i + BATCH_SIZE);
              const valueParts: string[] = [];
              const allValues: any[] = [];
              let paramIdx = 1;

              for (const row of batch) {
                const placeholders = columns.map(() => `$${paramIdx++}`).join(', ');
                valueParts.push(`(${placeholders})`);
                for (const col of columns) {
                  let val = row[col];
                  if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                    val = JSON.stringify(val);
                  }
                  allValues.push(val);
                }
              }

              try {
                await client.query(
                  `INSERT INTO "${tableNameLower}" (${colList}) VALUES ${valueParts.join(', ')} ON CONFLICT DO NOTHING`,
                  allValues
                );
                insertedCount += batch.length;
              } catch (batchErr: any) {
                for (const row of batch) {
                  try {
                    const values = columns.map(col => {
                      let val = row[col];
                      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                        val = JSON.stringify(val);
                      }
                      return val;
                    });
                    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
                    await client.query(
                      `INSERT INTO "${tableNameLower}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                      values
                    );
                    insertedCount++;
                  } catch (_) {}
                }
              }
            }

            report.push({ table: tableName, rows: insertedCount, status: 'success' });
          } catch (e: any) {
            report.push({ table: tableName, rows: 0, status: 'error', error: e.message });
          }
        }

        for (const tableName of backupTables) {
          const tableNameLower = tableName.toLowerCase();
          try {
            const seqRes = await client.query(`
              SELECT pg_get_serial_sequence($1, 'id') as seq_name
            `, [tableNameLower]);
            
            if (seqRes.rows[0]?.seq_name) {
              const maxRes = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM "${tableNameLower}"`);
              const maxId = maxRes.rows[0]?.max_id || 0;
              if (maxId > 0) {
                await client.query(`SELECT setval($1, $2, true)`, [seqRes.rows[0].seq_name, maxId]);
                console.log(`🔢 [Restore] إصلاح تسلسل ${tableNameLower}: ${maxId}`);
              }
            }
          } catch (_) {}
        }

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
        if (target !== 'local' && target !== 'central') await targetPool.end();
      }

      this.status.isRunning = false;
      const durationMs = Date.now() - startTime;
      const successCount = report.filter(r => r.status === 'success').length;
      const totalRestoredRows = report.reduce((acc, r) => acc + r.rows, 0);

      console.log(`✅ [BackupService] استعادة ناجحة: ${successCount} جدول | ${totalRestoredRows} صف | ${durationMs}ms`);

      return {
        success: true,
        message: `تمت الاستعادة: ${successCount} جدول (${totalRestoredRows} صف) في ${(durationMs / 1000).toFixed(1)} ثانية`,
        report,
        durationMs,
        tablesRestored: successCount,
        totalRows: totalRestoredRows,
      };
    } catch (error: any) {
      this.status.isRunning = false;
      console.error('❌ [BackupService] فشل الاستعادة:', error.message);
      return { success: false, message: error.message };
    }
  }

  static async listBackups() {
    try {
      await this.initialize();
      const files = fs.readdirSync(BACKUPS_DIR);
      const logs = files
        .filter(f => f.startsWith('backup-') && (f.endsWith('.json.gz') || f.endsWith('.json') || f.endsWith('.db')))
        .map((f) => {
          try {
            const filePath = path.join(BACKUPS_DIR, f);
            const stats = fs.statSync(filePath);

            let meta: any = null;
            if (f.endsWith('.json') && stats.size < 500 * 1024) {
              try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(content);
                if (parsed.meta) meta = parsed.meta;
                else if (parsed.version) meta = parsed;
              } catch (_) {}
            }

            return {
              filename: f,
              size: (stats.size / (1024 * 1024)).toFixed(2),
              sizeBytes: stats.size,
              compressed: f.endsWith('.gz'),
              format: f.endsWith('.gz') ? 'json.gz' : f.endsWith('.json') ? 'json' : 'sqlite',
              status: 'success',
              createdAt: stats.mtime.toISOString(),
              tablesCount: meta?.tablesCount || (meta?.tables ? Object.keys(meta.tables || {}).length : null),
              totalRows: meta?.totalRows || null,
              durationMs: meta?.durationMs || null,
            };
          } catch (e) {
            return null;
          }
        })
        .filter((log): log is NonNullable<typeof log> => log !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { success: true, logs, total: logs.length };
    } catch (error: any) {
      return { success: false, message: error.message, logs: [], total: 0 };
    }
  }

  private static isValidFilename(filename: string): boolean {
    if (!filename) return false;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
    if (!(/^backup-[\w\-]+\.(json\.gz|json|db)$/.test(filename))) return false;
    const resolved = path.resolve(BACKUPS_DIR, filename);
    if (!resolved.startsWith(BACKUPS_DIR)) return false;
    return true;
  }

  static async deleteBackup(filename: string): Promise<any> {
    try {
      if (!this.isValidFilename(filename)) {
        return { success: false, message: 'اسم ملف غير صالح' };
      }

      const filePath = path.join(BACKUPS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'الملف غير موجود' };
      }

      const stats = fs.statSync(filePath);
      fs.unlinkSync(filePath);

      console.log(`🗑️ [BackupService] حذف نسخة: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return { success: true, message: `تم حذف النسخة ${filename} بنجاح` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static getBackupFilePath(filename: string): string | null {
    if (!this.isValidFilename(filename)) return null;
    const filePath = path.resolve(BACKUPS_DIR, filename);
    if (!filePath.startsWith(BACKUPS_DIR)) return null;
    return fs.existsSync(filePath) ? filePath : null;
  }

  static getAutoBackupStatus(): BackupStatus {
    return { ...this.status };
  }

  static async getAvailableDatabases() {
    const dbs: any[] = [];

    const envKeys = Object.keys(process.env);
    for (const key of envKeys) {
      if (key.startsWith('DATABASE_URL_')) {
        const id = key.replace('DATABASE_URL_', '').toLowerCase();
        const url = process.env[key];
        if (url && !dbs.find(d => d.id === id)) {
          dbs.push({
            id,
            name: id.toUpperCase().replace(/_/g, ' '),
            url: url.trim().replace(/^["']|["']$/g, '')
          });
        }
      }
    }

    const defaults = [
      { key: 'DATABASE_URL_CENTRAL', id: 'central', name: 'CENTRAL' },
      { key: 'DATABASE_URL_SUPABASE', id: 'supabase', name: 'SUPABASE' },
      { key: 'DATABASE_URL', id: 'local', name: 'LOCAL' }
    ];

    for (const def of defaults) {
      const url = process.env[def.key];
      if (url && !dbs.find(d => d.id === def.id)) {
        dbs.push({ id: def.id, name: def.name, url: url.trim().replace(/^["']|["']$/g, '') });
      }
    }

    return dbs.filter(d => d.url && !d.url.includes('helium'));
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

      if (!targetUrl) throw new Error('لم يتم العثور على رابط الاتصال');

      const { Pool } = await import('pg');
      const testPool = new Pool({ connectionString: targetUrl, connectionTimeoutMillis: 5000 });
      const client = await testPool.connect();
      const startTime = Date.now();
      await client.query('SELECT 1');
      const latency = Date.now() - startTime;
      client.release();
      await testPool.end();

      return { success: true, message: `تم الاتصال بنجاح (${latency}ms)`, latency };
    } catch (error: any) {
      return { success: false, message: `فشل الاتصال: ${error.message}` };
    }
  }

  static async analyzeDatabase(target: 'local' | 'cloud') {
    try {
      const { pool } = await import('../db');
      const tables = await this.getAllTables();
      const report = [];

      for (const table of tables) {
        try {
          const res = await pool.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
            [table]
          );
          const countRes = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
          report.push({
            table,
            status: res.rows[0].exists ? 'exists' : 'missing',
            rows: parseInt(countRes.rows[0].count, 10),
          });
        } catch (e: any) {
          report.push({ table, status: 'error', rows: 0, error: e.message });
        }
      }

      return { success: true, report };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getStorageInfo() {
    try {
      await this.initialize();
      const files = fs.readdirSync(BACKUPS_DIR);
      let totalSize = 0;
      let fileCount = 0;

      for (const f of files) {
        try {
          const stats = fs.statSync(path.join(BACKUPS_DIR, f));
          totalSize += stats.size;
          fileCount++;
        } catch (_) {}
      }

      return {
        success: true,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        totalSizeBytes: totalSize,
        fileCount,
        maxRetention: MAX_RETENTION,
        backupsDir: BACKUPS_DIR,
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  private static async enforceRetentionPolicy() {
    try {
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('backup-'))
        .map(f => ({
          name: f,
          path: path.join(BACKUPS_DIR, f),
          mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > MAX_RETENTION) {
        const toDelete = files.slice(MAX_RETENTION);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          console.log(`🗑️ [Retention] حذف نسخة قديمة: ${file.name}`);
        }
        console.log(`📋 [Retention] تم حذف ${toDelete.length} نسخة قديمة (الاحتفاظ بآخر ${MAX_RETENTION})`);
      }
    } catch (error: any) {
      console.warn('⚠️ [Retention] فشل تطبيق سياسة الاحتفاظ:', error.message);
    }
  }
}
