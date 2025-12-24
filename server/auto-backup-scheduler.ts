/**
 * 🕐 نظام النسخ الاحتياطي التلقائي
 * ينشئ نسخ احتياطية كاملة لقاعدة البيانات كل 30 دقيقة
 * مع آلية تنظيف تلقائية تحافظ على 20 نسخة كحد أقصى
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';

const BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 دقيقة
const MAX_BACKUPS = 20;
const BACKUP_TIMEOUT_MS = 5 * 60 * 1000; // 5 دقائق كحد أقصى للنسخة الواحدة
const BACKUP_DIR = join(process.cwd(), 'backups', 'auto');

interface BackupStatus {
  lastBackupTime: string | null;
  lastBackupSuccess: boolean;
  lastBackupFile: string | null;
  lastBackupSize: number;
  totalBackups: number;
  nextBackupIn: number;
  isRunning: boolean;
  lastError: string | null;
}

interface BackupResult {
  success: boolean;
  file: string;
  size: number;
  tablesCount: number;
  rowsCount: number;
  duration: number;
  error?: string;
}

let schedulerInterval: NodeJS.Timeout | null = null;
let isBackupRunning = false;
let backupStatus: BackupStatus = {
  lastBackupTime: null,
  lastBackupSuccess: false,
  lastBackupFile: null,
  lastBackupSize: 0,
  totalBackups: 0,
  nextBackupIn: BACKUP_INTERVAL_MS,
  isRunning: false,
  lastError: null
};

function initializeBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 [AutoBackup] تم إنشاء مجلد النسخ الاحتياطية: ${BACKUP_DIR}`);
  }
}

async function getAllTables(): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map((row: any) => row.table_name);
  } catch (error) {
    console.error('❌ [AutoBackup] فشل جلب قائمة الجداول:', error);
    return [];
  }
}

async function dumpAllTables(): Promise<{
  timestamp: string;
  tables: Array<{
    name: string;
    columns: any[];
    data: any[];
    rowCount: number;
  }>;
  totalRows: number;
}> {
  const tables = await getAllTables();
  const dumpedTables = [];
  let totalRows = 0;

  for (const tableName of tables) {
    try {
      const columnsResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `);

      const dataResult = await db.execute(sql.raw(`SELECT * FROM "${tableName}"`));
      
      const columns = columnsResult.rows.map((row: any) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      }));

      dumpedTables.push({
        name: tableName,
        columns,
        data: dataResult.rows,
        rowCount: dataResult.rows.length
      });

      totalRows += dataResult.rows.length;
    } catch (error) {
      console.warn(`   ⚠️ [AutoBackup] تعذر نسخ جدول ${tableName}`);
      dumpedTables.push({
        name: tableName,
        columns: [],
        data: [],
        rowCount: 0
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    tables: dumpedTables,
    totalRows
  };
}

async function createFullBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  const dateTime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = join(BACKUP_DIR, `full_backup_${dateTime}.json`);

  try {
    console.log('💾 [AutoBackup] بدء إنشاء نسخة احتياطية كاملة...');

    const dumpData = await dumpAllTables();
    const content = JSON.stringify(dumpData, null, 2);
    const size = Buffer.byteLength(content, 'utf-8');

    writeFileSync(backupFile, content, 'utf-8');

    const duration = Date.now() - startTime;
    console.log(`✅ [AutoBackup] اكتملت النسخة الاحتياطية في ${(duration / 1000).toFixed(1)} ثانية`);
    console.log(`   📊 ${dumpData.tables.length} جدول، ${dumpData.totalRows} صف، ${(size / 1024 / 1024).toFixed(2)} MB`);

    return {
      success: true,
      file: backupFile,
      size,
      tablesCount: dumpData.tables.length,
      rowsCount: dumpData.totalRows,
      duration
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('❌ [AutoBackup] فشل إنشاء النسخة الاحتياطية:', errorMsg);
    return {
      success: false,
      file: '',
      size: 0,
      tablesCount: 0,
      rowsCount: 0,
      duration: Date.now() - startTime,
      error: errorMsg
    };
  }
}

function cleanupOldBackups(): void {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('full_backup_') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: join(BACKUP_DIR, f),
        time: statSync(join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        unlinkSync(file.path);
        console.log(`🗑️ [AutoBackup] تم حذف النسخة القديمة: ${file.name}`);
      }
    }

    backupStatus.totalBackups = Math.min(files.length, MAX_BACKUPS);
  } catch (error) {
    console.warn('⚠️ [AutoBackup] خطأ في تنظيف النسخ القديمة:', error);
  }
}

async function runScheduledBackup(): Promise<void> {
  if (isBackupRunning) {
    console.log('⏳ [AutoBackup] نسخة احتياطية قيد التنفيذ بالفعل، تخطي...');
    return;
  }

  isBackupRunning = true;
  backupStatus.isRunning = true;

  try {
    const timeoutPromise = new Promise<BackupResult>((_, reject) => {
      setTimeout(() => reject(new Error('Backup timeout')), BACKUP_TIMEOUT_MS);
    });

    const result = await Promise.race([createFullBackup(), timeoutPromise]);

    if (result.success) {
      backupStatus.lastBackupTime = new Date().toISOString();
      backupStatus.lastBackupSuccess = true;
      backupStatus.lastBackupFile = result.file;
      backupStatus.lastBackupSize = result.size;
      backupStatus.lastError = null;

      cleanupOldBackups();
    } else {
      backupStatus.lastBackupSuccess = false;
      backupStatus.lastError = result.error || 'فشل غير معروف';
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('❌ [AutoBackup] خطأ في النسخ المجدول:', errorMsg);
    backupStatus.lastBackupSuccess = false;
    backupStatus.lastError = errorMsg;
  } finally {
    isBackupRunning = false;
    backupStatus.isRunning = false;
  }
}

export function startAutoBackupScheduler(): void {
  console.log('🕐 [AutoBackup] بدء نظام النسخ الاحتياطي التلقائي...');
  console.log(`   ⏱️ التكرار: كل ${BACKUP_INTERVAL_MS / 60000} دقيقة`);
  console.log(`   📦 الحد الأقصى: ${MAX_BACKUPS} نسخة`);

  initializeBackupDir();

  setTimeout(() => {
    runScheduledBackup();
  }, 10000);

  schedulerInterval = setInterval(() => {
    runScheduledBackup();
  }, BACKUP_INTERVAL_MS);

  console.log('✅ [AutoBackup] تم تشغيل نظام النسخ الاحتياطي التلقائي');
}

export function stopAutoBackupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏹️ [AutoBackup] تم إيقاف نظام النسخ الاحتياطي التلقائي');
  }
}

export function getAutoBackupStatus(): BackupStatus {
  const now = Date.now();
  const lastBackupTime = backupStatus.lastBackupTime 
    ? new Date(backupStatus.lastBackupTime).getTime() 
    : now;
  
  const timeSinceLastBackup = now - lastBackupTime;
  const nextBackupIn = Math.max(0, BACKUP_INTERVAL_MS - timeSinceLastBackup);

  return {
    ...backupStatus,
    nextBackupIn
  };
}

export async function triggerManualBackup(): Promise<BackupResult> {
  console.log('🔧 [AutoBackup] تشغيل نسخة احتياطية يدوية...');
  
  if (isBackupRunning) {
    return {
      success: false,
      file: '',
      size: 0,
      tablesCount: 0,
      rowsCount: 0,
      duration: 0,
      error: 'نسخة احتياطية قيد التنفيذ بالفعل'
    };
  }

  isBackupRunning = true;
  backupStatus.isRunning = true;

  try {
    const result = await createFullBackup();
    
    if (result.success) {
      backupStatus.lastBackupTime = new Date().toISOString();
      backupStatus.lastBackupSuccess = true;
      backupStatus.lastBackupFile = result.file;
      backupStatus.lastBackupSize = result.size;
      backupStatus.lastError = null;
      cleanupOldBackups();
    } else {
      backupStatus.lastBackupSuccess = false;
      backupStatus.lastError = result.error || 'فشل غير معروف';
    }

    return result;
  } finally {
    isBackupRunning = false;
    backupStatus.isRunning = false;
  }
}

export function listAutoBackups(): Array<{
  file: string;
  size: number;
  createdAt: string;
}> {
  try {
    initializeBackupDir();
    
    return readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('full_backup_') && f.endsWith('.json'))
      .map(f => {
        const filePath = join(BACKUP_DIR, f);
        const stats = statSync(filePath);
        return {
          file: f,
          size: stats.size,
          createdAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('❌ [AutoBackup] خطأ في قراءة قائمة النسخ:', error);
    return [];
  }
}
