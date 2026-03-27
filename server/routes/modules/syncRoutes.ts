/**
 * مسارات المزامنة المتقدمة (Synchronization Routes)
 * Advanced Sync API for Offline-First Mobile Apps
 * يدعم 68 جدول للمزامنة الكاملة
 */

import express from 'express';
import { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db, pool } from '../../db.js';
import { SummaryRebuildService } from '../../services/SummaryRebuildService';
import { requireAuth, syncRateLimit } from '../../middleware/auth.js';
import { SyncAuditService } from '../../services/SyncAuditService.js';
import { SYNCABLE_TABLES } from '../../../shared/schema.js';
import { getAuthUser, isAdmin, getUserDisplayName } from '../../internal/auth-user.js';
import { projectAccessService } from '../../services/ProjectAccessService.js';
import { z } from 'zod';

export const syncRouter = express.Router();

syncRouter.use(requireAuth);
syncRouter.use(syncRateLimit);

const ALL_DATABASE_TABLES: readonly string[] = SYNCABLE_TABLES;

const MAX_BATCH_SIZE = 5;

function getEffectiveBatchSize(): number {
  const poolMax = 10;
  return Math.min(MAX_BATCH_SIZE, Math.max(1, poolMax - 2));
}

const TABLE_COLUMN_CACHE = new Map<string, string[]>();

async function getTableDateColumns(table: string): Promise<string[]> {
  if (TABLE_COLUMN_CACHE.has(table)) return TABLE_COLUMN_CACHE.get(table)!;
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name IN ('updated_at', 'created_at')`,
    [table]
  );
  const cols = result.rows.map((r: { column_name: string }) => r.column_name);
  TABLE_COLUMN_CACHE.set(table, cols);
  return cols;
}

function isTransientError(error: any): boolean {
  const msg = String(error?.message || error || '').toLowerCase();
  const code = error?.code || '';
  return (
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused') ||
    msg.includes('connection terminated') ||
    msg.includes('deadlock') ||
    msg.includes('too many clients') ||
    msg.includes('connection timeout') ||
    msg.includes('server closed the connection') ||
    code === '40001' ||
    code === '40P01' ||
    code === '57P01' ||
    code === '08006' ||
    code === '08001'
  );
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 200
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries && isTransientError(error)) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        console.warn(`[Sync] خطأ مؤقت (محاولة ${attempt + 1}/${maxRetries + 1}): ${error.message} - إعادة بعد ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

const TABLE_PK_CACHE = new Map<string, string>();

async function getTablePrimaryKey(table: string): Promise<string> {
  if (TABLE_PK_CACHE.has(table)) return TABLE_PK_CACHE.get(table)!;
  const result = await pool.query(
    `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    [table]
  );
  const pk = result.rows.length > 0 ? (result.rows[0] as { attname: string }).attname : 'id';
  TABLE_PK_CACHE.set(table, pk);
  return pk;
}

interface FetchTableOptions {
  table: string;
  lastSyncTime?: string;
  cursor?: string;
  pageSize?: number;
}

interface FetchTableResult {
  table: string;
  rows: Record<string, unknown>[];
  error?: string;
  deltaApplied?: boolean;
  nextCursor?: string | null;
  hasMore?: boolean;
  totalFetched?: number;
}

const DEFAULT_PAGE_SIZE = 5000;
const MAX_PAGE_SIZE = 10000;

async function fetchTableData(table: string, lastSyncTime?: string): Promise<FetchTableResult> {
  return fetchTableDataPaginated({ table, lastSyncTime });
}

async function fetchTableDataPaginated(opts: FetchTableOptions): Promise<FetchTableResult> {
  const { table, lastSyncTime, cursor } = opts;
  const pageSize = Math.min(opts.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  if (!ALL_DATABASE_TABLES.includes(table)) {
    return { table, rows: [], error: 'Invalid table name' };
  }
  try {
    const params: unknown[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];
    let deltaApplied = false;

    if (lastSyncTime) {
      const parsed = new Date(lastSyncTime);
      if (isNaN(parsed.getTime())) {
        return { table, rows: [], error: 'Invalid lastSyncTime' };
      }
      const isoTime = parsed.toISOString();
      const cols = await getTableDateColumns(table);
      if (cols.includes('updated_at') && cols.includes('created_at')) {
        conditions.push(`(updated_at > $${paramIndex} OR created_at > $${paramIndex})`);
        params.push(isoTime);
        paramIndex++;
        deltaApplied = true;
      } else if (cols.includes('updated_at')) {
        conditions.push(`updated_at > $${paramIndex}`);
        params.push(isoTime);
        paramIndex++;
        deltaApplied = true;
      } else if (cols.includes('created_at')) {
        conditions.push(`created_at > $${paramIndex}`);
        params.push(isoTime);
        paramIndex++;
        deltaApplied = true;
      }
    }

    const pk = await getTablePrimaryKey(table);

    if (cursor) {
      conditions.push(`"${pk}" > $${paramIndex}`);
      const numericCursor = /^\d+$/.test(cursor) ? Number(cursor) : cursor;
      params.push(numericCursor);
      paramIndex++;
    }

    let query = `SELECT * FROM "${table}"`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY "${pk}" ASC LIMIT $${paramIndex}`;
    params.push(pageSize + 1);

    const result = await retryWithBackoff(() => pool.query(query, params));
    const hasMore = result.rows.length > pageSize;
    const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const nextCursor = hasMore && rows.length > 0
      ? String((rows[rows.length - 1] as Record<string, unknown>)[pk])
      : null;

    return { table, rows, deltaApplied, nextCursor, hasMore, totalFetched: rows.length };
  } catch (e: any) {
    return { table, rows: [], error: e.message };
  }
}

async function fetchTablesInBatches(tables: string[], lastSyncTime?: string) {
  const results: Record<string, Record<string, unknown>[]> = {};
  let successCount = 0;
  let errorCount = 0;
  let deltaTablesCount = 0;
  let fullTablesCount = 0;
  const batchSize = getEffectiveBatchSize();

  for (let i = 0; i < tables.length; i += batchSize) {
    const batch = tables.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(t => fetchTableData(t, lastSyncTime))
    );
    for (const r of batchResults) {
      results[r.table] = r.rows;
      if (r.error) {
        errorCount++;
        console.warn(`⚠️ [Sync] تخطي ${r.table}: ${r.error}`);
      } else {
        successCount++;
        if (lastSyncTime) {
          if (r.deltaApplied) deltaTablesCount++;
          else fullTablesCount++;
        }
      }
    }
  }

  return { results, successCount, errorCount, deltaTablesCount, fullTablesCount };
}

/**
 * 🔄 تحميل النسخة الاحتياطية الكاملة (Full Backup Download)
 * GET /api/sync/full-backup
 * يدعم 68 جدول للمزامنة الكاملة
 */
syncRouter.get('/full-backup', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  const startTime = Date.now();
  try {
    const { lastSyncTime } = req.query;
    console.log(`🔄 [Sync] طلب نسخة احتياطية${lastSyncTime ? ' تفاضلية منذ ' + lastSyncTime : ' كاملة'} (${ALL_DATABASE_TABLES.length} جدول، parallel batches)`);

    const { results, successCount, errorCount, deltaTablesCount, fullTablesCount } = await fetchTablesInBatches(
      ALL_DATABASE_TABLES as unknown as string[],
      lastSyncTime as string | undefined
    );

    const duration = Date.now() - startTime;
    const totalRecords = Object.values(results).reduce((sum, rows) => sum + rows.length, 0);
    console.log(`✅ [Sync] تم تجهيز ${totalRecords} سجل في ${duration}ms (${successCount} ناجح، ${errorCount} تخطي${lastSyncTime ? `, ${deltaTablesCount} تفاضلي، ${fullTablesCount} كامل` : ''})`);


    SyncAuditService.logBulkSync({
      user_id: getAuthUser(req)?.user_id,
      userName: getUserDisplayName(getAuthUser(req)),
      syncType: lastSyncTime ? 'delta_sync' : 'full_backup',
      tablesCount: ALL_DATABASE_TABLES.length,
      totalRecords,
      durationMs: duration,
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      isDelta: !!lastSyncTime,
      deltaTablesCount,
      fullTablesCount,
    }).catch(() => {});

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({
      success: true,
      status: "success",
      message: "تم تجهيز البيانات بنجاح",
      data: results,
      timestamp: new Date().toISOString(),
      metadata: {
        timestamp: Date.now(),
        version: '3.1-parallel-sync',
        duration,
        tablesCount: ALL_DATABASE_TABLES.length,
        totalRecords,
        successCount,
        errorCount,
        isDelta: !!lastSyncTime,
        deltaTablesCount,
        fullTablesCount
      }
    }));
  } catch (error: unknown) {
    console.error('❌ [Sync] خطأ فادح في المزامنة:', error);
    SyncAuditService.logBulkSync({
      user_id: getAuthUser(req)?.user_id,
      userName: getUserDisplayName(getAuthUser(req)),
      syncType: 'full_backup',
      tablesCount: ALL_DATABASE_TABLES.length,
      totalRecords: 0,
      durationMs: Date.now() - startTime,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "حدث خطأ غير متوقع في الخادم"
    }));
  }
});

/**
 * 🔄 تحميل النسخة الاحتياطية الكاملة (POST method)
 * POST /api/sync/full-backup
 */
syncRouter.post('/full-backup', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  const startTime = Date.now();
  try {
    const { lastSyncTime } = req.body || {};
    console.log(`🔄 [Sync] POST نسخة${lastSyncTime ? ' تفاضلية' : ' كاملة'} (parallel batches)`);

    const { results, successCount, errorCount, deltaTablesCount, fullTablesCount } = await fetchTablesInBatches(
      ALL_DATABASE_TABLES as unknown as string[],
      lastSyncTime
    );

    const duration = Date.now() - startTime;
    const totalRecords = Object.values(results).reduce((sum, rows) => sum + rows.length, 0);
    console.log(`✅ [Sync] POST اكتملت: ${totalRecords} سجل في ${duration}ms`);

    SyncAuditService.logBulkSync({
      user_id: getAuthUser(req)?.user_id,
      userName: getUserDisplayName(getAuthUser(req)),
      syncType: lastSyncTime ? 'delta_sync' : 'full_backup',
      tablesCount: ALL_DATABASE_TABLES.length,
      totalRecords,
      durationMs: duration,
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      isDelta: !!lastSyncTime,
      deltaTablesCount,
      fullTablesCount,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      status: "success",
      message: "تم تجهيز البيانات بنجاح",
      data: results,
      timestamp: new Date().toISOString(),
      metadata: {
        timestamp: Date.now(),
        version: '3.1-parallel-sync',
        duration,
        tablesCount: ALL_DATABASE_TABLES.length,
        totalRecords,
        successCount,
        errorCount,
        isDelta: !!lastSyncTime,
        deltaTablesCount,
        fullTablesCount
      }
    });
  } catch (error: unknown) {
    console.error('❌ [Sync] خطأ فادح:', error);
    SyncAuditService.logBulkSync({
      user_id: getAuthUser(req)?.user_id,
      userName: getUserDisplayName(getAuthUser(req)),
      syncType: 'full_backup',
      tablesCount: ALL_DATABASE_TABLES.length,
      totalRecords: 0,
      durationMs: Date.now() - startTime,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "حدث خطأ غير متوقع في الخادم"
    });
  }
});

/**
 * 📄 المزامنة بالصفحات (Paginated Sync)
 * POST /api/sync/paginated
 * جلب بيانات جدول واحد بنظام الصفحات (cursor-based)
 */
const paginatedSyncSchema = z.object({
  table: z.string().min(1).max(100),
  lastSyncTime: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().min(100).max(MAX_PAGE_SIZE).optional(),
});

syncRouter.post('/paginated', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  const parsed = paginatedSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'بيانات الطلب غير صالحة',
      errors: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  const { table, lastSyncTime, cursor, pageSize } = parsed.data;
  const startTime = Date.now();

  if (!ALL_DATABASE_TABLES.includes(table)) {
    return res.status(400).json({ success: false, message: `جدول غير صالح: ${table}` });
  }

  try {
    const result = await fetchTableDataPaginated({ table, lastSyncTime, cursor, pageSize });
    const duration = Date.now() - startTime;

    SyncAuditService.logOperation({
      user_id: getAuthUser(req)?.user_id,
      userName: getUserDisplayName(getAuthUser(req)),
      action: 'paginated_sync',
      tableName: table,
      status: result.error ? 'failed' : 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      durationMs: duration,
      syncType: 'paginated',
      description: `صفحة: ${result.totalFetched || 0} سجل${result.hasMore ? ' (يوجد المزيد)' : ' (آخر صفحة)'}`,
    }).catch(() => {});

    if (result.error) {
      return res.status(500).json({ success: false, message: result.error });
    }

    return res.status(200).json({
      success: true,
      table: result.table,
      data: result.rows,
      pagination: {
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        pageSize: pageSize || DEFAULT_PAGE_SIZE,
        fetched: result.totalFetched,
      },
      deltaApplied: result.deltaApplied,
      metadata: {
        duration,
        timestamp: Date.now(),
        version: '4.0-paginated',
      },
    });
  } catch (error: unknown) {
    console.error(`❌ [Sync-Paginated] خطأ في جلب ${table}:`, error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 📋 قائمة الجداول المتاحة للمزامنة بالصفحات
 * GET /api/sync/tables
 */
syncRouter.get('/tables', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const tableInfo: { name: string; hasUpdatedAt: boolean; hasCreatedAt: boolean }[] = [];
    for (const table of ALL_DATABASE_TABLES) {
      const cols = await getTableDateColumns(table as string);
      tableInfo.push({
        name: table as string,
        hasUpdatedAt: cols.includes('updated_at'),
        hasCreatedAt: cols.includes('created_at'),
      });
    }

    return res.status(200).json({
      success: true,
      tables: tableInfo,
      totalTables: tableInfo.length,
      defaultPageSize: DEFAULT_PAGE_SIZE,
      maxPageSize: MAX_PAGE_SIZE,
    });
  } catch (error: unknown) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * ⚡ المزامنة الفورية (Instant Sync)
 * POST /api/sync/instant-sync
 * مزامنة فورية لجداول محددة
 */
syncRouter.post('/instant-sync', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  const startTime = Date.now();
  try {
    const { tables: requestedTables, lastSyncTime } = req.body;

    console.log(`⚡ [Sync] مزامنة فورية${lastSyncTime ? ' تفاضلية' : ''}`);

    const tablesToSync: string[] = requestedTables && Array.isArray(requestedTables) && requestedTables.length > 0
      ? requestedTables.filter((t: string) => (ALL_DATABASE_TABLES as readonly string[]).includes(t))
      : [...ALL_DATABASE_TABLES];

    const syncTime = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
    const { results, successCount, errorCount } = await fetchTablesInBatches(tablesToSync, syncTime);

    const totalRecords = Object.values(results).reduce((sum, rows) => sum + rows.length, 0);
    const duration = Date.now() - startTime;
    console.log(`⚡ [Sync] اكتملت: ${totalRecords} سجل في ${duration}ms`);

    SyncAuditService.logBulkSync({
      user_id: getAuthUser(req)?.user_id,
      userName: getUserDisplayName(getAuthUser(req)),
      syncType: 'instant_sync',
      tablesCount: tablesToSync.length,
      totalRecords,
      durationMs: duration,
      status: 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      isDelta: !!lastSyncTime,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "تمت المزامنة الفورية بنجاح",
      data: results,
      metadata: {
        timestamp: Date.now(),
        duration,
        tablesCount: tablesToSync.length,
        totalRecords,
        successCount,
        errorCount,
        isDelta: !!lastSyncTime,
        version: '3.1-instant'
      }
    });
  } catch (error: unknown) {
    console.error('❌ [Sync] خطأ في المزامنة الفورية:', error);
    SyncAuditService.logBulkSync({
      user_id: getAuthUser(req)?.user_id,
      userName: getUserDisplayName(getAuthUser(req)),
      syncType: 'instant_sync',
      tablesCount: 0,
      totalRecords: 0,
      durationMs: Date.now() - startTime,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "فشلت المزامنة الفورية"
    });
  }
});

/**
 * ✅ التحقق من التطابق (Verify Sync)
 * POST /api/sync/verify-sync
 * مقارنة عدد السجلات بين الخادم والعميل
 */
syncRouter.post('/verify-sync', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  try {
    const startTime = Date.now();
    const { clientCounts } = req.body;
    
    console.log('✅ [Sync] طلب التحقق من التطابق');
    
    if (!clientCounts || typeof clientCounts !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'clientCounts is required',
        message: "يجب إرسال عدد السجلات لكل جدول"
      });
    }
    
    const serverCounts: Record<string, number> = {};
    const differences: Array<{ table: string; serverCount: number; clientCount: number; diff: number }> = [];
    let totalServerRecords = 0;
    let totalClientRecords = 0;
    
    for (const table of ALL_DATABASE_TABLES) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const serverCount = Number(countResult.rows[0]?.count || 0);
        serverCounts[table] = serverCount;
        totalServerRecords += serverCount;
        
        const clientCount = clientCounts[table] || 0;
        totalClientRecords += clientCount;
        
        if (serverCount !== clientCount) {
          differences.push({
            table,
            serverCount,
            clientCount,
            diff: serverCount - clientCount
          });
        }
      } catch (e: any) {
        serverCounts[table] = 0;
      }
    }
    
    const duration = Date.now() - startTime;
    const isMatched = differences.length === 0;
    
    console.log(`✅ [Sync] التحقق اكتمل: ${isMatched ? 'متطابق ✓' : `${differences.length} اختلاف`}`);
    
    return res.status(200).json({
      success: true,
      isMatched,
      message: isMatched ? "البيانات متطابقة تماماً" : `توجد ${differences.length} اختلافات`,
      serverCounts,
      differences,
      summary: {
        totalServerRecords,
        totalClientRecords,
        matchedTables: ALL_DATABASE_TABLES.length - differences.length,
        mismatchedTables: differences.length,
        tablesChecked: ALL_DATABASE_TABLES.length
      },
      metadata: {
        timestamp: Date.now(),
        duration,
        version: '2.0-verify'
      }
    });
  } catch (error: unknown) {
    console.error('❌ [Sync] خطأ في التحقق:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "فشل التحقق من التطابق"
    });
  }
});

/**
 * 📊 الحصول على إحصائيات المزامنة
 * GET /api/sync/stats
 */
syncRouter.get('/stats', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  try {
    const startTime = Date.now();
    const stats: Record<string, number> = {};
    let totalRecords = 0;
    
    for (const table of ALL_DATABASE_TABLES) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = Number(countResult.rows[0]?.count || 0);
        stats[table] = count;
        totalRecords += count;
      } catch {
        stats[table] = 0;
      }
    }
    
    const duration = Date.now() - startTime;
    
    return res.status(200).json({
      success: true,
      stats,
      summary: {
        totalTables: ALL_DATABASE_TABLES.length,
        totalRecords,
        timestamp: Date.now()
      },
      metadata: {
        duration,
        version: '2.0-stats'
      }
    });
  } catch (error: unknown) {
    console.error('❌ [Sync] خطأ في جلب الإحصائيات:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});


/**
 * 🔄 Atomic Batch Sync
 * POST /api/sync/batch
 */
const SAFE_COLUMN_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const SERVER_MANAGED_COLUMNS = new Set([
  'created_at', 'updated_at',
  'is_local', 'synced', 'pending_sync', 'version', 'last_modified_by',
]);

const ALLOWED_COLUMNS_BY_TABLE: Record<string, { insert: Set<string>; update: Set<string> }> = {
  fund_transfers: {
    insert: new Set(['id', 'project_id', 'amount', 'sender_name', 'transfer_number', 'transfer_type', 'transfer_date', 'notes']),
    update: new Set(['amount', 'sender_name', 'transfer_number', 'transfer_type', 'transfer_date', 'notes']),
  },
  worker_attendance: {
    insert: new Set(['id', 'project_id', 'worker_id', 'attendance_date', 'date', 'start_time', 'end_time', 'work_description', 'is_present', 'hours_worked', 'overtime', 'overtime_rate', 'work_days', 'daily_wage', 'actual_wage', 'total_pay', 'paid_amount', 'remaining_amount', 'payment_type', 'notes', 'well_id', 'well_ids', 'crew_type', 'description']),
    update: new Set(['attendance_date', 'date', 'start_time', 'end_time', 'work_description', 'is_present', 'hours_worked', 'overtime', 'overtime_rate', 'work_days', 'daily_wage', 'actual_wage', 'total_pay', 'paid_amount', 'remaining_amount', 'payment_type', 'notes', 'well_id', 'well_ids', 'crew_type', 'description']),
  },
  transportation_expenses: {
    insert: new Set(['id', 'project_id', 'worker_id', 'amount', 'description', 'category', 'date', 'notes', 'well_id', 'well_ids', 'crew_type']),
    update: new Set(['amount', 'description', 'category', 'date', 'notes', 'worker_id', 'well_id', 'well_ids', 'crew_type']),
  },
  material_purchases: {
    insert: new Set(['id', 'project_id', 'supplier_id', 'material_id', 'material_name', 'material_category', 'material_unit', 'quantity', 'unit', 'unit_price', 'total_amount', 'purchase_type', 'paid_amount', 'remaining_amount', 'supplier_name', 'receipt_number', 'invoice_number', 'invoice_date', 'due_date', 'invoice_photo', 'notes', 'purchase_date', 'well_id', 'well_ids', 'crew_type', 'add_to_inventory', 'equipment_id', 'description']),
    update: new Set(['supplier_id', 'material_id', 'material_name', 'material_category', 'material_unit', 'quantity', 'unit', 'unit_price', 'total_amount', 'purchase_type', 'paid_amount', 'remaining_amount', 'supplier_name', 'receipt_number', 'invoice_number', 'invoice_date', 'due_date', 'invoice_photo', 'notes', 'purchase_date', 'well_id', 'well_ids', 'crew_type', 'add_to_inventory', 'equipment_id', 'description']),
  },
  worker_transfers: {
    insert: new Set(['id', 'worker_id', 'project_id', 'amount', 'transfer_number', 'sender_name', 'recipient_name', 'recipient_phone', 'transfer_method', 'transfer_date', 'notes', 'description']),
    update: new Set(['amount', 'transfer_number', 'sender_name', 'recipient_name', 'recipient_phone', 'transfer_method', 'transfer_date', 'notes', 'description']),
  },
  worker_misc_expenses: {
    insert: new Set(['id', 'project_id', 'amount', 'description', 'date', 'notes', 'well_id', 'well_ids', 'crew_type']),
    update: new Set(['amount', 'description', 'date', 'notes', 'well_id', 'well_ids', 'crew_type']),
  },
  projects: {
    insert: new Set(['id', 'name', 'description', 'location', 'client_name', 'budget', 'start_date', 'end_date', 'status', 'engineer_id', 'manager_name', 'contact_phone', 'notes', 'image_url', 'project_type_id', 'is_active']),
    update: new Set(['name', 'description', 'location', 'client_name', 'budget', 'start_date', 'end_date', 'status', 'engineer_id', 'manager_name', 'contact_phone', 'notes', 'image_url', 'project_type_id', 'is_active']),
  },
  workers: {
    insert: new Set(['id', 'name', 'type', 'daily_wage', 'phone', 'hire_date', 'is_active', 'created_by']),
    update: new Set(['name', 'type', 'daily_wage', 'phone', 'hire_date', 'is_active']),
  },
  suppliers: {
    insert: new Set(['id', 'name', 'contact_person', 'phone', 'address', 'payment_terms', 'is_active', 'notes', 'created_by']),
    update: new Set(['name', 'contact_person', 'phone', 'address', 'payment_terms', 'is_active', 'notes']),
  },
  materials: {
    insert: new Set(['id', 'name', 'category', 'unit']),
    update: new Set(['name', 'category', 'unit']),
  },
  wells: {
    insert: new Set(['project_id', 'well_number', 'owner_name', 'region', 'number_of_bases', 'base_count', 'number_of_panels', 'panel_count', 'well_depth', 'water_level', 'number_of_pipes', 'pipe_count', 'fan_type', 'pump_power', 'status', 'completion_percentage', 'start_date', 'completion_date', 'notes', 'beneficiary_phone', 'created_by']),
    update: new Set(['well_number', 'owner_name', 'region', 'number_of_bases', 'base_count', 'number_of_panels', 'panel_count', 'well_depth', 'water_level', 'number_of_pipes', 'pipe_count', 'fan_type', 'pump_power', 'status', 'completion_percentage', 'start_date', 'completion_date', 'notes', 'beneficiary_phone']),
  },
  project_types: {
    insert: new Set(['name', 'description', 'is_active']),
    update: new Set(['name', 'description', 'is_active']),
  },
  supplier_payments: {
    insert: new Set(['id', 'supplier_id', 'project_id', 'purchase_id', 'amount', 'payment_method', 'payment_date', 'reference_number', 'notes']),
    update: new Set(['amount', 'payment_method', 'payment_date', 'reference_number', 'notes', 'purchase_id']),
  },
  autocomplete_data: {
    insert: new Set(['id', 'category', 'value', 'user_id', 'usage_count']),
    update: new Set(['value', 'usage_count']),
  },
};

function sanitizeColumns(
  payload: Record<string, any>,
  tableName: string,
  action: 'insert' | 'update'
): { columns: string[]; values: any[] } {
  const columns: string[] = [];
  const values: any[] = [];

  const tableAllowlist = ALLOWED_COLUMNS_BY_TABLE[tableName];
  if (!tableAllowlist) {
    throw new Error(`لا توجد قائمة أعمدة مسموحة للجدول: ${tableName}`);
  }
  const allowedSet = action === 'insert' ? tableAllowlist.insert : tableAllowlist.update;

  for (const [key, value] of Object.entries(payload)) {
    if (!SAFE_COLUMN_REGEX.test(key)) {
      throw new Error(`اسم عمود غير صالح: ${key}`);
    }
    if (SERVER_MANAGED_COLUMNS.has(key)) {
      continue;
    }
    if (!allowedSet.has(key)) {
      continue;
    }
    columns.push(key);
    values.push(value);
  }
  return { columns, values };
}

const batchOperationSchema = z.object({
  action: z.enum(['POST', 'PATCH', 'PUT', 'DELETE']),
  endpoint: z.string().min(1).max(500),
  payload: z.record(z.string(), z.unknown()).optional(),
  _metadata: z.object({
    clientTimestamp: z.string().optional(),
  }).optional(),
});

const batchRequestSchema = z.object({
  operations: z.array(batchOperationSchema).min(1).max(200),
});

const ALLOWED_BATCH_TABLES: Record<string, string> = {
  'fund-transfers': 'fund_transfers',
  'fund_transfers': 'fund_transfers',
  'worker-attendance': 'worker_attendance',
  'worker_attendance': 'worker_attendance',
  'transportation-expenses': 'transportation_expenses',
  'transportation_expenses': 'transportation_expenses',
  'material-purchases': 'material_purchases',
  'material_purchases': 'material_purchases',
  'worker-transfers': 'worker_transfers',
  'worker_transfers': 'worker_transfers',
  'worker-misc-expenses': 'worker_misc_expenses',
  'worker_misc_expenses': 'worker_misc_expenses',
  'projects': 'projects',
  'workers': 'workers',
  'suppliers': 'suppliers',
  'materials': 'materials',
  'wells': 'wells',
  'project-types': 'project_types',
  'project_types': 'project_types',
  'supplier-payments': 'supplier_payments',
  'supplier_payments': 'supplier_payments',
  'autocomplete': 'autocomplete_data',
  'autocomplete_data': 'autocomplete_data',
};

const TABLES_WITHOUT_PROJECT_ID = new Set(['project_types', 'autocomplete_data']);

syncRouter.post('/batch', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  const parsed = batchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'بيانات الطلب غير صالحة',
      errors: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  const authUser = getAuthUser(req);
  const userId = authUser?.user_id;
  const userIsAdmin = isAdmin(req);
  const startTime = Date.now();

  const client = await pool.connect();
  try {
    const { operations } = parsed.data;

    if (!userIsAdmin) {
      const hasGlobalTableOp = operations.some((op: any) => {
        const cleanEndpoint = (op.endpoint || '').split('?')[0];
        const parts = cleanEndpoint.split('/').filter(Boolean);
        if (parts[0] !== 'api' || parts.length < 2) return false;
        const rawTableName = parts.slice(1).join('-');
        const tableName = ALLOWED_BATCH_TABLES[rawTableName];
        return tableName && TABLES_WITHOUT_PROJECT_ID.has(tableName);
      });
      if (hasGlobalTableOp) {
        return res.status(403).json({
          success: false,
          message: 'صلاحيات المسؤول مطلوبة لتعديل الجداول العامة'
        });
      }
    }

    console.log(`[Sync-Batch] بدء معالجة دفعة ذرية (${operations.length} عملية)...`);

    await client.query('BEGIN');

    const results: unknown[] = [];
    const projectAccessCache = new Map<string, boolean>();

    const FINANCIAL_TABLES_SET = new Set([
      'fund_transfers', 'worker_attendance', 'transportation_expenses',
      'material_purchases', 'worker_transfers', 'worker_misc_expenses',
      'supplier_payments', 'project_fund_transfers'
    ]);
    const DATE_FIELD_DB_MAP: Record<string, string> = {
      'fund_transfers': 'transfer_date',
      'worker_attendance': 'date',
      'transportation_expenses': 'date',
      'material_purchases': 'purchase_date',
      'worker_transfers': 'transfer_date',
      'worker_misc_expenses': 'date',
      'supplier_payments': 'payment_date',
      'project_fund_transfers': 'transfer_date',
    };
    const batchInvalidations = new Map<string, string>();
    function trackInvalidation(pid: string, d: string) {
      const clean = String(d || '').substring(0, 10);
      if (!clean || !/^\d{4}-\d{2}-\d{2}$/.test(clean)) return;
      const existing = batchInvalidations.get(pid);
      if (!existing || clean < existing) batchInvalidations.set(pid, clean);
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];
    const userName = getUserDisplayName(authUser);
    const auditPromises: Promise<void>[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const { action, endpoint } = op;
      const payload = op.payload as Record<string, any> | undefined;
      const opStartTime = Date.now();

      if (!action || !endpoint) {
        throw new Error(`عملية ${i} غير صالحة: action و endpoint مطلوبان`);
      }

      const cleanEndpoint = endpoint.split('?')[0];
      const parts = cleanEndpoint.split('/').filter(Boolean);

      if (parts[0] !== 'api' || parts.length < 2) {
        throw new Error(`عملية ${i}: endpoint غير صالح: ${endpoint}`);
      }

      const rawTableName = parts.slice(1).join('-');
      const tableName = ALLOWED_BATCH_TABLES[rawTableName];
      if (!tableName) {
        throw new Error(`عملية ${i}: جدول غير مسموح به: ${rawTableName}`);
      }

      if (!userIsAdmin && !TABLES_WITHOUT_PROJECT_ID.has(tableName)) {
        let projectId = payload?.project_id;
        if (!projectId && (action === 'PATCH' || action === 'PUT' || action === 'DELETE') && payload?.id) {
          const existing = await client.query(`SELECT project_id FROM "${tableName}" WHERE id = $1 LIMIT 1`, [payload.id]);
          if (existing.rows.length > 0) {
            projectId = (existing.rows[0] as Record<string, unknown>).project_id as string;
          }
        }
        if (!projectId) {
          throw new Error(`عملية ${i}: project_id مطلوب للجدول ${tableName}`);
        }
        if (!projectAccessCache.has(projectId)) {
          const hasAccess = userId
            ? await projectAccessService.checkProjectAccess(userId, authUser!.role, projectId, 'edit')
            : false;
          projectAccessCache.set(projectId, hasAccess);
        }
        if (!projectAccessCache.get(projectId)) {
          throw new Error(`عملية ${i}: ليس لديك صلاحية تعديل بيانات المشروع ${projectId}`);
        }
      }

      const requiresProjectScope = !userIsAdmin && !TABLES_WITHOUT_PROJECT_ID.has(tableName);
      const actionMap: Record<string, string> = { 'POST': 'create', 'PATCH': 'update', 'PUT': 'update', 'DELETE': 'delete' };
      const auditAction = actionMap[action] || action.toLowerCase();

      if (action === 'POST') {
        if (!payload || !payload.id) {
          throw new Error(`عملية ${i}: payload.id مطلوب للإنشاء`);
        }
        const { _metadata: _postMeta, ...insertFields } = payload;
        const { columns, values } = sanitizeColumns(insertFields as Record<string, any>, tableName, 'insert');

        const dateCols = await getTableDateColumns(tableName);
        if (dateCols.includes('updated_at') && !columns.includes('updated_at')) {
          columns.push('updated_at');
          values.push(new Date().toISOString());
        }
        if (dateCols.includes('created_at') && !columns.includes('created_at')) {
          columns.push('created_at');
          values.push(new Date().toISOString());
        }

        if (columns.length === 0) {
          throw new Error(`عملية ${i}: لا توجد أعمدة صالحة للإدراج في الجدول ${tableName}`);
        }

        const placeholders = columns.map((_, idx) => `$${idx + 1}`);
        const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (id) DO NOTHING RETURNING *`;
        const result = await client.query(query, values);
        const inserted = result.rows[0];
        const status = inserted ? 'success' : 'duplicate';
        results.push({ index: i, success: true, data: inserted || payload });

        if (inserted && FINANCIAL_TABLES_SET.has(tableName)) {
          const rec = inserted as Record<string, any>;
          const pid = rec.project_id;
          const dateCol = DATE_FIELD_DB_MAP[tableName];
          if (pid && dateCol && rec[dateCol]) trackInvalidation(pid, rec[dateCol]);
          if (tableName === 'worker_attendance' && pid && rec.attendance_date) trackInvalidation(pid, rec.attendance_date);
          if (tableName === 'project_fund_transfers') {
            const d = rec.transfer_date ? String(rec.transfer_date).substring(0, 10) : '';
            if (rec.from_project_id && d) trackInvalidation(rec.from_project_id, d);
            if (rec.to_project_id && d) trackInvalidation(rec.to_project_id, d);
          }
        }

        auditPromises.push(SyncAuditService.logOperation({
          user_id: userId, userName, action: auditAction, endpoint, tableName,
          recordId: payload.id, status, newValues: inserted || payload,
          ipAddress, userAgent, durationMs: Date.now() - opStartTime,
          syncType: 'batch', project_id: payload.project_id,
        }));
      } else if (action === 'PATCH' || action === 'PUT') {
        if (!payload || !payload.id) {
          throw new Error(`عملية ${i}: payload.id مطلوب للتعديل`);
        }
        const { id, _metadata, ...updateFields } = payload;

        let oldValues: any = null;
        if (requiresProjectScope) {
          const existing = await client.query(`SELECT * FROM "${tableName}" WHERE id = $1`, [id]);
          if (existing.rows.length > 0) {
            oldValues = existing.rows[0];
            const actualProjectId = (oldValues as Record<string, unknown>).project_id as string;
            if (actualProjectId && !projectAccessCache.get(actualProjectId)) {
              const hasAccess = userId
                ? await projectAccessService.checkProjectAccess(userId, authUser!.role, actualProjectId, 'edit')
                : false;
              if (!hasAccess) {
                throw new Error(`عملية ${i}: ليس لديك صلاحية تعديل سجل ينتمي للمشروع ${actualProjectId}`);
              }
            }
          }
        } else {
          const existing = await client.query(`SELECT * FROM "${tableName}" WHERE id = $1`, [id]);
          if (existing.rows.length > 0) oldValues = existing.rows[0];
        }

        const clientTimestamp = _metadata?.clientTimestamp || op._metadata?.clientTimestamp;
        const { columns, values: colValues } = sanitizeColumns(updateFields as Record<string, any>, tableName, 'update');
        if (columns.length === 0) {
          results.push({ index: i, success: true, data: payload });
          auditPromises.push(SyncAuditService.logOperation({
            user_id: userId, userName, action: auditAction, endpoint, tableName,
            recordId: id, status: 'skipped', oldValues, newValues: payload,
            ipAddress, userAgent, durationMs: Date.now() - opStartTime,
            syncType: 'batch', project_id: payload.project_id,
            description: 'تخطي - لا حقول للتعديل',
          }));
          continue;
        }

        const dateCols = await getTableDateColumns(tableName);
        const hasUpdatedAt = dateCols.includes('updated_at');

        if (hasUpdatedAt && !columns.includes('updated_at')) {
          columns.push('updated_at');
          colValues.push(new Date().toISOString());
        } else if (hasUpdatedAt) {
          const uIdx = columns.indexOf('updated_at');
          colValues[uIdx] = new Date().toISOString();
        }

        const setClauses = columns.map((col, idx) => `"${col}" = $${idx + 2}`);
        const values = [id, ...colValues];

        let query: string;
        if (hasUpdatedAt && clientTimestamp) {
          const tsParamIndex = values.length + 1;
          values.push(new Date(clientTimestamp).toISOString());
          query = `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE id = $1 AND (updated_at IS NULL OR updated_at <= $${tsParamIndex}) RETURNING *`;
        } else {
          query = `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`;
        }

        const result = await client.query(query, values);

        if (result.rowCount === 0 && hasUpdatedAt && clientTimestamp) {
          const existingRow = await client.query(`SELECT * FROM "${tableName}" WHERE id = $1`, [id]);
          if (existingRow.rows.length > 0) {
            console.log(`[Sync-Batch] LWW conflict resolved (server wins) for ${tableName} id=${id}`);
            results.push({ index: i, success: true, conflictResolved: true, resolution: 'server_wins', data: existingRow.rows[0] });
            auditPromises.push(SyncAuditService.logOperation({
              user_id: userId, userName, action: auditAction, endpoint, tableName,
              recordId: id, status: 'conflict', oldValues, newValues: existingRow.rows[0],
              ipAddress, userAgent, durationMs: Date.now() - opStartTime,
              syncType: 'batch', project_id: payload.project_id,
              description: 'تعارض - الخادم أحدث (LWW)',
            }));
          } else {
            results.push({ index: i, success: true, data: payload });
            auditPromises.push(SyncAuditService.logOperation({
              user_id: userId, userName, action: auditAction, endpoint, tableName,
              recordId: id, status: 'success', oldValues, newValues: payload,
              ipAddress, userAgent, durationMs: Date.now() - opStartTime,
              syncType: 'batch', project_id: payload.project_id,
            }));
          }
        } else {
          results.push({ index: i, success: true, data: result.rows[0] || payload });
          if (FINANCIAL_TABLES_SET.has(tableName)) {
            const dateCol = DATE_FIELD_DB_MAP[tableName];
            const oldRec = oldValues as Record<string, any> | null;
            const newRec = (result.rows[0] || payload) as Record<string, any>;
            const oldPid = oldRec?.project_id;
            const newPid = newRec?.project_id;
            if (oldPid && dateCol && oldRec?.[dateCol]) trackInvalidation(oldPid, oldRec[dateCol]);
            if (newPid && dateCol && newRec?.[dateCol]) trackInvalidation(newPid, newRec[dateCol]);
            if (tableName === 'worker_attendance') {
              if (oldPid && oldRec?.attendance_date) trackInvalidation(oldPid, oldRec.attendance_date);
              if (newPid && newRec?.attendance_date) trackInvalidation(newPid, newRec.attendance_date);
            }
            if (tableName === 'project_fund_transfers') {
              const oldD = oldRec?.transfer_date ? String(oldRec.transfer_date).substring(0, 10) : '';
              const newD = newRec?.transfer_date ? String(newRec.transfer_date).substring(0, 10) : '';
              if (oldRec?.from_project_id && oldD) trackInvalidation(oldRec.from_project_id, oldD);
              if (oldRec?.to_project_id && oldD) trackInvalidation(oldRec.to_project_id, oldD);
              if (newRec?.from_project_id && newD) trackInvalidation(newRec.from_project_id, newD);
              if (newRec?.to_project_id && newD) trackInvalidation(newRec.to_project_id, newD);
            }
          }
          auditPromises.push(SyncAuditService.logOperation({
            user_id: userId, userName, action: auditAction, endpoint, tableName,
            recordId: id, status: 'success', oldValues, newValues: result.rows[0] || payload,
            ipAddress, userAgent, durationMs: Date.now() - opStartTime,
            syncType: 'batch', project_id: payload.project_id,
          }));
        }
      } else if (action === 'DELETE') {
        const id = payload?.id || parts[parts.length - 1];
        if (!id) {
          throw new Error(`عملية ${i}: id مطلوب للحذف`);
        }

        let oldValues: any = null;
        const existingBefore = await client.query(`SELECT * FROM "${tableName}" WHERE id = $1`, [id]);
        if (existingBefore.rows.length > 0) oldValues = existingBefore.rows[0];

        if (requiresProjectScope && oldValues) {
          const actualProjectId = (oldValues as Record<string, unknown>).project_id as string;
          if (actualProjectId && !projectAccessCache.get(actualProjectId)) {
            const hasAccess = userId
              ? await projectAccessService.checkProjectAccess(userId, authUser!.role, actualProjectId, 'edit')
              : false;
            if (!hasAccess) {
              throw new Error(`عملية ${i}: ليس لديك صلاحية حذف سجل ينتمي للمشروع ${actualProjectId}`);
            }
          }
        }

        await client.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
        results.push({ index: i, success: true });

        if (oldValues && FINANCIAL_TABLES_SET.has(tableName)) {
          const oldRec = oldValues as Record<string, any>;
          const dateCol = DATE_FIELD_DB_MAP[tableName];
          const pid = oldRec.project_id;
          if (pid && dateCol && oldRec[dateCol]) trackInvalidation(pid, oldRec[dateCol]);
          if (tableName === 'worker_attendance' && pid && oldRec.attendance_date) trackInvalidation(pid, oldRec.attendance_date);
          if (tableName === 'project_fund_transfers') {
            const d = oldRec.transfer_date ? String(oldRec.transfer_date).substring(0, 10) : '';
            if (oldRec.from_project_id && d) trackInvalidation(oldRec.from_project_id, d);
            if (oldRec.to_project_id && d) trackInvalidation(oldRec.to_project_id, d);
          }
        }

        auditPromises.push(SyncAuditService.logOperation({
          user_id: userId, userName, action: auditAction, endpoint, tableName,
          recordId: id, status: 'success', oldValues,
          ipAddress, userAgent, durationMs: Date.now() - opStartTime,
          syncType: 'batch', project_id: oldValues?.project_id || payload?.project_id,
        }));
      } else {
        throw new Error(`عملية ${i}: action غير مدعوم: ${action}`);
      }
    }

    await client.query('COMMIT');

    for (const [pid, fromDate] of batchInvalidations) {
      SummaryRebuildService.markInvalid(pid, fromDate).catch(e =>
        console.error(`[Sync-Batch] markInvalid error for ${pid}:`, e)
      );
    }

    Promise.all(auditPromises).catch(err => {
      console.error('[Sync-Batch] خطأ في تسجيل التدقيق:', err);
    });

    const duration = Date.now() - startTime;
    console.log(`[Sync-Batch] اكتملت الدفعة بنجاح (${operations.length} عملية في ${duration}ms)`);

    return res.status(200).json({
      success: true,
      message: `تم تنفيذ ${operations.length} عملية بنجاح`,
      results,
      metadata: {
        operationsCount: operations.length,
        duration,
        timestamp: Date.now(),
      }
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('[Sync-Batch] فشل الدفعة - تم التراجع:', error instanceof Error ? error.message : String(error));

    SyncAuditService.logOperation({
      user_id: userId, userName: getUserDisplayName(authUser),
      action: 'batch_sync', tableName: 'sync_batch',
      status: 'failed', errorMessage: error instanceof Error ? error.message : String(error),
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      durationMs: Date.now() - startTime, syncType: 'batch',
    }).catch(() => {});

    return res.status(500).json({
      success: false,
      message: `فشل تنفيذ الدفعة: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    client.release();
  }
});

export default syncRouter;
