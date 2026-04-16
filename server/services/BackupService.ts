import fs from 'fs';
import path from 'path';
import { createGzip, createGunzip, gunzipSync } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable, Writable } from 'stream';
import cron from 'node-cron';
import { TelegramService } from './TelegramService';
import { GoogleDriveService } from './GoogleDriveService';
import { getFullTableDDL, getSequencesDDL } from './backup/ddl-generator';
import { computeChecksum, verifyChecksum, validateBackupStructure, validateDecompressedSize, redactSensitiveData } from './backup/integrity-checker';
import { restoreData } from './backup/restore-engine';
import { exportStreamingBackup } from './backup/streaming-exporter';
import { restoreStreamingBackup } from './backup/streaming-restorer';

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
  checksum?: string;
  skippedTables?: string[];
  triggeredBy?: string;
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

  private static async getTableDDL(pool: any, tableName: string): Promise<string | null> {
    try {
      return await getFullTableDDL(pool, tableName);
    } catch (e: any) {
      console.warn(`⚠️ [BackupService] فشل DDL لـ ${tableName}: ${e.message}`);
      return null;
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

  static async runBackup(triggeredBy: string = 'manual', format: 'json' | 'streaming' = 'json'): Promise<any> {
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
      console.log(`💾 [BackupService] بدء النسخ الاحتياطي (${triggeredBy}, format=${format})...`);

      const { pool } = await import('../db');

      if (format === 'streaming') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDirName = `backup-${timestamp}`;
        const backupDir = path.join(BACKUPS_DIR, backupDirName);

        const exportReport = await exportStreamingBackup(pool, backupDir);

        const manifestPath = path.join(backupDir, 'manifest.json');
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          manifest.triggeredBy = triggeredBy;
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch (_) {}

        this.status.lastSuccessAt = new Date().toISOString();
        this.status.totalSuccess++;
        this.status.lastError = null;
        this.status.isRunning = false;

        await this.enforceRetentionPolicy();

        const durationMs = Date.now() - startTime;
        console.log(`✅ [BackupService] نسخ احتياطي streaming ناجح: ${backupDirName}`);
        console.log(`   📊 ${exportReport.manifest.totalTables} جدول | ${exportReport.totalRows} صف | ${(exportReport.totalSizeBytes / 1024 / 1024).toFixed(2)} MB | ${durationMs}ms`);

        return {
          success: true,
          message: `تم النسخ الاحتياطي لـ ${exportReport.manifest.totalTables} جدول (${exportReport.totalRows} صف) بنجاح (streaming)`,
          filename: backupDirName,
          path: backupDir,
          format: 'streaming-dir',
          totalRows: exportReport.totalRows,
          tablesCount: exportReport.manifest.totalTables,
          sizeBytes: exportReport.totalSizeBytes,
          sizeMB: (exportReport.totalSizeBytes / 1024 / 1024).toFixed(2),
          durationMs,
          triggeredBy,
          driveUploaded: false,
          telegramSent: false,
          hasSequences: true,
        };
      }

      const tables = await this.getAllTables();
      
      if (tables.length === 0) {
        throw new Error('لم يتم العثور على أي جداول في قاعدة البيانات');
      }

      const backupData: Record<string, any[]> = {};
      const tableCounts: Record<string, number> = {};
      const schemasDDL: Record<string, string> = {};
      const skippedTables: string[] = [];
      let totalRows = 0;

      for (const tableName of tables) {
        try {
          const result = await pool.query(`SELECT * FROM "${tableName}"`);
          backupData[tableName] = result.rows;
          tableCounts[tableName] = result.rows.length;
          totalRows += result.rows.length;
        } catch (e: any) {
          console.error(`❌ [BackupService] فشل قراءة جدول ${tableName}: ${e.message}`);
          skippedTables.push(tableName);
        }
      }

      if (skippedTables.length > 0 && Object.keys(backupData).length === 0) {
        throw new Error(`فشل قراءة جميع الجداول: ${skippedTables.join(', ')}`);
      }

      for (const tableName of tables) {
        if (skippedTables.includes(tableName)) continue;
        try {
          const ddl = await this.getTableDDL(pool, tableName);
          if (ddl) schemasDDL[tableName] = ddl;
        } catch (e: any) {
          console.warn(`⚠️ [BackupService] تخطي DDL لـ ${tableName}: ${e.message}`);
        }
      }

      let sequencesDDL: string[] = [];
      try {
        sequencesDDL = await getSequencesDDL(pool);
      } catch (e: any) {
        console.warn(`⚠️ [BackupService] فشل جلب التسلسلات: ${e.message}`);
      }

      const dataChecksum = computeChecksum(JSON.stringify(backupData));

      const durationMs = Date.now() - startTime;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const meta: BackupMeta = {
        version: '4.0',
        timestamp: new Date().toISOString(),
        totalRows,
        tablesCount: Object.keys(backupData).length,
        tables: tableCounts,
        compressed: true,
        durationMs,
        environment: process.env.NODE_ENV || 'development',
        checksum: dataChecksum,
        skippedTables: skippedTables.length > 0 ? skippedTables : undefined,
        triggeredBy,
      };

      const fullData = JSON.stringify({ meta, schemas: schemasDDL, sequences: sequencesDDL, data: backupData });
      const gzFilename = `backup-${timestamp}.json.gz`;
      const gzPath = path.join(BACKUPS_DIR, gzFilename);

      await pipeline(
        Readable.from(Buffer.from(fullData, 'utf-8')),
        createGzip({ level: 6 }),
        fs.createWriteStream(gzPath)
      );

      try { fs.writeFileSync(gzPath + '.meta', JSON.stringify(meta), 'utf-8'); } catch (_) {}

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

      const skippedWarning = skippedTables.length > 0 ? ` | ⚠️ ${skippedTables.length} جدول لم يُنسخ: ${skippedTables.join(', ')}` : '';
      const result: any = {
        success: true,
        message: `تم النسخ الاحتياطي لـ ${Object.keys(backupData).length} جدول (${totalRows} صف) بنجاح${skippedWarning}`,
        filename: gzFilename,
        path: gzPath,
        format: 'json.gz',
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
        checksum: dataChecksum,
        skippedTables: skippedTables.length > 0 ? skippedTables : undefined,
        hasSequences: sequencesDDL.length > 0,
      };

      await this.postBackupActions(result, gzPath, backupData, schemasDDL, sequencesDDL);

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

  private static async createRedactedBackup(redactedData: Record<string, any[]>, meta: any, schemas: any, sequences: any): Promise<string | null> {
    try {
      const redactedPayload = JSON.stringify({ meta, schemas, sequences, data: redactedData });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const redactedPath = path.join(BACKUPS_DIR, `.redacted-${timestamp}.json.gz`);

      await pipeline(
        Readable.from(Buffer.from(redactedPayload, 'utf-8')),
        createGzip({ level: 6 }),
        fs.createWriteStream(redactedPath)
      );

      return redactedPath;
    } catch (e: any) {
      console.warn(`⚠️ [BackupService] فشل إنشاء نسخة محجوبة: ${e.message}`);
      return null;
    }
  }

  private static cleanupRedactedFile(filePath: string | null): void {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  }

  private static async postBackupActions(result: any, filePath: string, backupData?: Record<string, any[]>, schemas?: Record<string, string>, sequences?: string[]): Promise<void> {
    const hasSensitive = backupData ? Object.keys(backupData).some(t => ['users', 'refresh_tokens', 'sessions'].includes(t)) : false;
    let externalFilePath = filePath;
    let redactedPath: string | null = null;

    if (hasSensitive && backupData) {
      console.log('🔒 [BackupService] إنشاء نسخة محجوبة للإرسال الخارجي...');
      const redactedData = redactSensitiveData(backupData, 'external');
      const redactedChecksum = computeChecksum(JSON.stringify(redactedData));
      const redactedMeta = { ...result, checksum: redactedChecksum, redacted: true };
      redactedPath = await this.createRedactedBackup(redactedData, redactedMeta, schemas || {}, sequences || []);
      if (redactedPath) {
        externalFilePath = redactedPath;
        console.log('✅ [BackupService] تم إنشاء نسخة محجوبة (كلمات المرور/التوكنات محذوفة)');
      } else {
        console.warn('⚠️ [BackupService] فشل إنشاء النسخة المحجوبة - إرسال إشعار نصي فقط');
      }
    }

    try {
      if (GoogleDriveService.isEnabled()) {
        console.log('☁️ [BackupService] رفع النسخة إلى Google Drive...');
        const uploadPath = hasSensitive && redactedPath ? redactedPath : filePath;
        const driveResult = await GoogleDriveService.uploadBackupFile(uploadPath, result.filename);
        result.driveUploaded = driveResult.success;
        result.driveUrl = driveResult.webViewLink || null;
        result.driveFileId = driveResult.fileId || null;
        result.driveRedacted = hasSensitive && !!redactedPath;
        if (driveResult.success) {
          console.log(`✅ [BackupService] تم الرفع إلى Drive: ${driveResult.fileId}${result.driveRedacted ? ' (محجوبة)' : ''}`);
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

        const now = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
        const driveStatus = result.driveUploaded
          ? `✅ Google Drive`
          : `⚠️ Drive غير مرفوع`;
        const redactedNote = hasSensitive ? '\n🔒 البيانات الحساسة محجوبة' : '';

        const caption = [
          `💾 <b>نسخة احتياطية - AXION</b>`,
          `📊 ${result.tablesCount} جدول | ${result.totalRows} سجل`,
          `💿 ${result.sizeMB} MB | ضغط ${result.compressionRatio}`,
          `⏱ ${((result.durationMs || 0) / 1000).toFixed(1)} ثانية`,
          `🔧 ${result.triggeredBy === 'auto' ? 'تلقائي' : 'يدوي'} | ☁️ ${driveStatus}`,
          `🕐 ${now}${redactedNote}`,
        ].join('\n');

        if (hasSensitive && !redactedPath) {
          console.log('🔒 [BackupService] تخطي إرسال الملف لـ Telegram (بيانات حساسة + فشل إنشاء نسخة محجوبة)');
          const sent = await TelegramService.sendBackupNotification(result);
          result.telegramSent = sent;
          result.telegramFileSent = false;
        } else if (fileSizeMB > 0 && fileSizeMB <= TELEGRAM_FILE_LIMIT_MB && result.success) {
          console.log(`📤 [BackupService] إرسال ملف النسخة إلى Telegram (${fileSizeMB.toFixed(2)} MB)...`);

          const telegramPath = hasSensitive && redactedPath ? redactedPath : filePath;
          const fileSent = await TelegramService.sendDocument({
            filePath: telegramPath,
            caption,
            parseMode: 'HTML',
          });
          result.telegramSent = fileSent;
          result.telegramFileSent = fileSent;
          result.telegramRedacted = hasSensitive && !!redactedPath;

          if (fileSent) {
            console.log(`✅ [BackupService] تم إرسال ملف النسخة إلى Telegram${result.telegramRedacted ? ' (محجوبة)' : ''}`);
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

    this.cleanupRedactedFile(redactedPath);
  }

  static async restoreBackup(filename: string, target: string = 'local'): Promise<any> {
    if (this.status.isRunning) {
      return { success: false, message: 'يوجد عملية نسخ/استعادة قيد التشغيل' };
    }

    if (!this.isValidFilename(filename) && !this.isValidStreamingDirName(filename)) {
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

      const isStreamingDir = fs.statSync(backupPath).isDirectory() &&
        fs.existsSync(path.join(backupPath, 'manifest.json'));

      if (isStreamingDir) {
        let targetPool;
        let shouldClosePool = false;
        const { pool } = await import('../db');

        if (target === 'local') {
          targetPool = pool;
        } else if (target === 'central') {
          const centralUrl = process.env.DATABASE_URL_CENTRAL;
          if (centralUrl) {
            const { Pool } = await import('pg');
            targetPool = new Pool({ connectionString: centralUrl.trim().replace(/^["']|["']$/g, ''), connectionTimeoutMillis: 10000 });
            shouldClosePool = true;
          } else {
            targetPool = pool;
            console.warn('⚠️ [Restore] DATABASE_URL_CENTRAL غير معرّف - استخدام القاعدة المحلية');
          }
        } else {
          const dbs = await this.getAvailableDatabases();
          const selectedDb = dbs.find(d => d.id === target.toLowerCase());
          if (!selectedDb) throw new Error(`قاعدة البيانات ${target} غير معروفة`);
          const { Pool } = await import('pg');
          targetPool = new Pool({ connectionString: selectedDb.url, connectionTimeoutMillis: 10000 });
          shouldClosePool = true;
        }

        try {
          const report = await restoreStreamingBackup(targetPool, backupPath, {
            target,
            failFast: true,
          });

          this.status.isRunning = false;
          const durationMs = Date.now() - startTime;

          const successCount = report.tableReports.filter(r => r.status === 'success').length;
          const failedCount = report.tableReports.filter(r => r.status === 'failed' || r.status === 'skipped').length;

          console.log(`✅ [BackupService] استعادة streaming ناجحة: ${successCount} جدول | ${report.totalRowsInserted} صف | ${durationMs}ms`);

          return {
            success: true,
            message: `تمت الاستعادة (streaming): ${successCount} جدول (${report.totalRowsInserted} صف) في ${(durationMs / 1000).toFixed(1)} ثانية`,
            report: report.tableReports,
            format: 'streaming-dir',
            durationMs,
            tablesRestored: report.tablesRestored,
            tablesFailed: failedCount,
            totalRows: report.totalRowsInserted,
            partialRestore: report.partialRestore,
          };
        } finally {
          if (shouldClosePool) await targetPool.end();
        }
      }

      if (filename.endsWith('.gz')) {
        const sizeOk = await validateDecompressedSize(backupPath, 500);
        if (!sizeOk) {
          this.status.isRunning = false;
          throw new Error('حجم الملف بعد فك الضغط يتجاوز الحد المسموح (500 MB)');
        }
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

      const structureValidation = validateBackupStructure(parsed);
      if (!structureValidation.valid) {
        this.status.isRunning = false;
        throw new Error(`بنية ملف النسخة غير صالحة: ${structureValidation.errors.join('; ')}`);
      }

      if (parsed.meta?.checksum) {
        const dataStr = JSON.stringify(parsed.data);
        if (!verifyChecksum(dataStr, parsed.meta.checksum)) {
          this.status.isRunning = false;
          throw new Error('فشل التحقق من سلامة البيانات (checksum غير مطابق) - الملف قد يكون تالفاً');
        }
        console.log('✅ [Restore] تم التحقق من سلامة البيانات (checksum صحيح)');
      }

      const data = parsed.data;
      const schemas: Record<string, string> = parsed.schemas || {};
      const sequences: string[] = parsed.sequences || [];

      let targetPool;
      let shouldClosePool = false;
      const { pool } = await import('../db');

      if (target === 'local') {
        targetPool = pool;
      } else if (target === 'central') {
        const centralUrl = process.env.DATABASE_URL_CENTRAL;
        if (centralUrl) {
          const { Pool } = await import('pg');
          targetPool = new Pool({ connectionString: centralUrl.trim().replace(/^["']|["']$/g, ''), connectionTimeoutMillis: 10000 });
          shouldClosePool = true;
        } else {
          targetPool = pool;
          console.warn('⚠️ [Restore] DATABASE_URL_CENTRAL غير معرّف - استخدام القاعدة المحلية');
        }
      } else {
        const dbs = await this.getAvailableDatabases();
        const selectedDb = dbs.find(d => d.id === target.toLowerCase());
        if (!selectedDb) throw new Error(`قاعدة البيانات ${target} غير معروفة`);
        const { Pool } = await import('pg');
        targetPool = new Pool({ connectionString: selectedDb.url, connectionTimeoutMillis: 10000 });
        shouldClosePool = true;
      }

      const client = await targetPool.connect();

      try {
        await client.query('BEGIN');
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        const report = await restoreData(client, data, schemas, { failFast: true });

        if (sequences.length > 0) {
          for (const seqSql of sequences) {
            try {
              await client.query(seqSql);
            } catch (_) {}
          }
          console.log(`🔢 [Restore] تم تنفيذ ${sequences.length} عملية تسلسل`);
        }

        await client.query('COMMIT');

        this.status.isRunning = false;
        const durationMs = Date.now() - startTime;

        const successCount = report.tableReports.filter(r => r.status === 'success').length;
        const emptyCount = report.tableReports.filter(r => r.status === 'empty').length;
        const failedCount = report.tableReports.filter(r => r.status === 'failed' || r.status === 'skipped').length;

        console.log(`✅ [BackupService] استعادة ذرية ناجحة: ${successCount} جدول | ${report.totalRowsInserted} صف | ${report.tablesCreated} جدول جديد | ${durationMs}ms`);

        return {
          success: true,
          message: `تمت الاستعادة: ${successCount} جدول (${report.totalRowsInserted} صف)${report.tablesCreated > 0 ? ` | ${report.tablesCreated} جدول جديد تم إنشاؤه` : ''} في ${(durationMs / 1000).toFixed(1)} ثانية`,
          report: report.tableReports,
          format: 'json.gz',
          durationMs,
          tablesRestored: successCount,
          tablesCreated: report.tablesCreated,
          tablesFailed: failedCount,
          tablesEmpty: emptyCount,
          totalRows: report.totalRowsInserted,
          checksumVerified: !!parsed.meta?.checksum,
        };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
        if (shouldClosePool) await targetPool.end();
      }
    } catch (error: any) {
      this.status.isRunning = false;
      console.error('❌ [BackupService] فشل الاستعادة:', error.message);
      return { success: false, message: error.message };
    }
  }

  static async listBackups() {
    try {
      await this.initialize();
      const entries = fs.readdirSync(BACKUPS_DIR);
      const logs: any[] = [];

      for (const f of entries) {
        try {
          const filePath = path.join(BACKUPS_DIR, f);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory() && f.startsWith('backup-')) {
            const manifestPath = path.join(filePath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) continue;

            let manifest: any = null;
            let totalSize = 0;
            try {
              manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
              const dirEntries = this.getDirSizeRecursive(filePath);
              totalSize = dirEntries;
            } catch (_) {}

            logs.push({
              filename: f,
              size: (totalSize / (1024 * 1024)).toFixed(2),
              sizeBytes: totalSize,
              compressed: true,
              format: 'streaming-dir',
              status: 'success',
              created_at: manifest?.timestamp || stats.mtime.toISOString(),
              tablesCount: manifest?.totalTables || (manifest?.tables ? Object.keys(manifest.tables || {}).length : null),
              totalRows: manifest?.totalRows || null,
              durationMs: manifest?.durationMs || null,
              triggeredBy: manifest?.triggeredBy || null,
            });
            continue;
          }

          if (f.endsWith('.meta')) continue;
          if (!f.startsWith('backup-') || !(f.endsWith('.json.gz') || f.endsWith('.json') || f.endsWith('.db'))) {
            continue;
          }

          let meta: any = null;
          const sidecarPath = filePath + '.meta';
          if (fs.existsSync(sidecarPath)) {
            try {
              meta = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
            } catch (_) {}
          }
          if (!meta && f.endsWith('.json.gz')) {
            try {
              const decompressed = gunzipSync(fs.readFileSync(filePath));
              const parsed = JSON.parse(decompressed.toString('utf-8'));
              if (parsed.meta) {
                meta = parsed.meta;
              } else if (parsed.version && parsed.data) {
                const tables = parsed.data || {};
                const tableNames = Object.keys(tables);
                let totalRows = 0;
                const tableCounts: Record<string, number> = {};
                for (const t of tableNames) {
                  const count = Array.isArray(tables[t]) ? tables[t].length : 0;
                  tableCounts[t] = count;
                  totalRows += count;
                }
                meta = {
                  version: parsed.version || '3.0',
                  timestamp: parsed.timestamp || stats.mtime.toISOString(),
                  totalRows,
                  tablesCount: tableNames.length,
                  tables: tableCounts,
                  compressed: true,
                  environment: parsed.environment || 'unknown',
                };
              } else if (parsed.data && typeof parsed.data === 'object') {
                const tables = parsed.data;
                const tableNames = Object.keys(tables);
                let totalRows = 0;
                const tableCounts: Record<string, number> = {};
                for (const t of tableNames) {
                  const count = Array.isArray(tables[t]) ? tables[t].length : 0;
                  tableCounts[t] = count;
                  totalRows += count;
                }
                meta = {
                  version: 'legacy',
                  timestamp: stats.mtime.toISOString(),
                  totalRows,
                  tablesCount: tableNames.length,
                  tables: tableCounts,
                  compressed: true,
                  environment: 'unknown',
                };
              }
              if (meta) {
                try { fs.writeFileSync(sidecarPath, JSON.stringify(meta), 'utf-8'); } catch (_) {}
              }
            } catch (gzErr: any) {
              console.warn(`⚠️ [BackupService] فشل قراءة meta من ${f}: ${gzErr.message}`);
            }
          } else if (!meta && f.endsWith('.json') && stats.size < 500 * 1024) {
            try {
              const content = fs.readFileSync(filePath, 'utf-8');
              const parsed = JSON.parse(content);
              if (parsed.meta) meta = parsed.meta;
              else if (parsed.version) meta = parsed;
            } catch (_) {}
          }

          logs.push({
            filename: f,
            size: (stats.size / (1024 * 1024)).toFixed(2),
            sizeBytes: stats.size,
            compressed: f.endsWith('.gz'),
            format: f.endsWith('.gz') ? 'json.gz' : f.endsWith('.json') ? 'json' : 'sqlite',
            status: 'success',
            created_at: meta?.timestamp || stats.mtime.toISOString(),
            tablesCount: meta?.tablesCount || (meta?.tables ? Object.keys(meta.tables || {}).length : null),
            totalRows: meta?.totalRows || null,
            durationMs: meta?.durationMs || null,
            triggeredBy: meta?.triggeredBy || null,
          });
        } catch (e) {
          continue;
        }
      }

      logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { success: true, logs, total: logs.length };
    } catch (error: any) {
      return { success: false, message: error.message, logs: [], total: 0 };
    }
  }

  private static getDirSizeRecursive(dirPath: string): number {
    let totalSize = 0;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemStats = fs.statSync(itemPath);
      if (itemStats.isDirectory()) {
        totalSize += this.getDirSizeRecursive(itemPath);
      } else {
        totalSize += itemStats.size;
      }
    }
    return totalSize;
  }

  private static isValidFilename(filename: string): boolean {
    if (!filename) return false;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
    if (!(/^backup-[\w\-]+\.(json\.gz|json|db)$/.test(filename))) return false;
    const resolved = path.resolve(BACKUPS_DIR, filename);
    if (!resolved.startsWith(BACKUPS_DIR)) return false;
    return true;
  }

  private static isValidStreamingDirName(filename: string): boolean {
    if (!filename) return false;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
    if (!(/^backup-[\w\-]+$/.test(filename))) return false;
    const resolved = path.resolve(BACKUPS_DIR, filename);
    if (!resolved.startsWith(BACKUPS_DIR)) return false;
    return true;
  }

  static async deleteBackup(filename: string): Promise<any> {
    try {
      if (!this.isValidFilename(filename) && !this.isValidStreamingDirName(filename)) {
        return { success: false, message: 'اسم ملف غير صالح' };
      }

      const filePath = path.join(BACKUPS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'الملف غير موجود' };
      }

      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`🗑️ [BackupService] حذف نسخة streaming: ${filename}`);
      } else {
        fs.unlinkSync(filePath);
        const sidecar = filePath + '.meta';
        if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
        console.log(`🗑️ [BackupService] حذف نسخة: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
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

  static async analyzeDatabase(target: string = 'local') {
    try {
      let targetPool;
      let shouldClosePool = false;
      const { pool } = await import('../db');

      if (target === 'local') {
        targetPool = pool;
      } else if (target === 'central') {
        const centralUrl = process.env.DATABASE_URL_CENTRAL;
        if (centralUrl) {
          const { Pool } = await import('pg');
          targetPool = new Pool({ connectionString: centralUrl.trim().replace(/^["']|["']$/g, ''), connectionTimeoutMillis: 10000 });
          shouldClosePool = true;
        } else {
          targetPool = pool;
        }
      } else {
        const dbs = await this.getAvailableDatabases();
        const selectedDb = dbs.find(d => d.id === target.toLowerCase());
        if (!selectedDb) throw new Error(`قاعدة البيانات ${target} غير معروفة`);
        const { Pool } = await import('pg');
        targetPool = new Pool({ connectionString: selectedDb.url, connectionTimeoutMillis: 10000 });
        shouldClosePool = true;
      }

      const tablesRes = await targetPool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name
      `);
      const tables = tablesRes.rows.map((r: any) => r.table_name);
      const report = [];

      for (const table of tables) {
        try {
          const countRes = await targetPool.query(`SELECT COUNT(*) as count FROM "${table}"`);
          report.push({
            table,
            status: 'exists',
            rows: parseInt(countRes.rows[0].count, 10),
          });
        } catch (e: any) {
          report.push({ table, status: 'error', rows: 0, error: e.message });
        }
      }

      if (shouldClosePool) await targetPool.end();

      return { success: true, report, target };
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
        .filter(f => f.startsWith('backup-') && !f.endsWith('.meta'))
        .map(f => ({
          name: f,
          path: path.join(BACKUPS_DIR, f),
          mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
          isDir: fs.statSync(path.join(BACKUPS_DIR, f)).isDirectory(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > MAX_RETENTION) {
        const toDelete = files.slice(MAX_RETENTION);
        for (const file of toDelete) {
          if (file.isDir) {
            fs.rmSync(file.path, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file.path);
            const sidecar = file.path + '.meta';
            if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
          }
          console.log(`🗑️ [Retention] حذف نسخة قديمة: ${file.name}`);
        }
        console.log(`📋 [Retention] تم حذف ${toDelete.length} نسخة قديمة (الاحتفاظ بآخر ${MAX_RETENTION})`);
      }

      const allFiles = fs.readdirSync(BACKUPS_DIR);
      for (const f of allFiles) {
        if (!f.endsWith('.meta')) continue;
        const baseName = f.replace(/\.meta$/, '');
        const basePath = path.join(BACKUPS_DIR, baseName);
        if (!fs.existsSync(basePath)) {
          try {
            fs.unlinkSync(path.join(BACKUPS_DIR, f));
            console.log(`🧹 [Retention] حذف sidecar يتيم: ${f}`);
          } catch {}
        }
      }
    } catch (error: any) {
      console.warn('⚠️ [Retention] فشل تطبيق سياسة الاحتفاظ:', error.message);
    }
  }
}
