/**
 * مسارات المزامنة المتقدمة (Synchronization Routes)
 * Advanced Sync API for Offline-First Mobile Apps
 * يدعم 68 جدول للمزامنة الكاملة
 */

import express from 'express';
import { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db, pool } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { SyncAuditService } from '../../services/SyncAuditService.js';

export const syncRouter = express.Router();

const ALL_DATABASE_TABLES = [
  'users', 'emergency_users', 'auth_user_sessions', 'email_verification_tokens', 'password_reset_tokens',
  'project_types', 'projects', 'workers', 'wells',
  'fund_transfers', 'worker_attendance', 'suppliers', 'materials', 'material_purchases',
  'supplier_payments', 'transportation_expenses', 'worker_transfers', 'worker_balances',
  'daily_expense_summaries', 'worker_types', 'autocomplete_data', 'worker_misc_expenses',
  'backup_logs', 'backup_settings', 'print_settings', 'project_fund_transfers',
  'security_policies', 'security_policy_suggestions', 'security_policy_implementations', 'security_policy_violations',
  'user_project_permissions', 'permission_audit_logs',
  'report_templates', 'notification_read_states', 'build_deployments',
  'notifications', 'ai_chat_sessions', 'ai_chat_messages', 'ai_usage_stats',
  'well_tasks', 'well_task_accounts', 'well_expenses', 'well_audit_logs', 'material_categories'
];

const MAX_BATCH_SIZE = 5;

function getEffectiveBatchSize(): number {
  const poolMax = (pool as any).options?.max || (pool as any)._max || 10;
  return Math.min(MAX_BATCH_SIZE, Math.max(1, poolMax - 2));
}

const TABLE_COLUMN_CACHE = new Map<string, string[]>();

async function getTableDateColumns(table: string): Promise<string[]> {
  if (TABLE_COLUMN_CACHE.has(table)) return TABLE_COLUMN_CACHE.get(table)!;
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name IN ('updated_at', 'created_at')`,
    [table]
  );
  const cols = result.rows.map((r: any) => r.column_name as string);
  TABLE_COLUMN_CACHE.set(table, cols);
  return cols;
}

async function fetchTableData(table: string, lastSyncTime?: string): Promise<{ table: string; rows: any[]; error?: string; deltaApplied?: boolean }> {
  if (!ALL_DATABASE_TABLES.includes(table)) {
    return { table, rows: [], error: 'Invalid table name' };
  }
  try {
    const params: any[] = [];
    let query = `SELECT * FROM "${table}"`;
    let deltaApplied = false;

    if (lastSyncTime) {
      const parsed = new Date(lastSyncTime);
      if (isNaN(parsed.getTime())) {
        return { table, rows: [], error: 'Invalid lastSyncTime' };
      }
      const isoTime = parsed.toISOString();
      const cols = await getTableDateColumns(table);
      if (cols.includes('updated_at') && cols.includes('created_at')) {
        query += ` WHERE (updated_at > $1 OR created_at > $1)`;
        params.push(isoTime);
        deltaApplied = true;
      } else if (cols.includes('updated_at')) {
        query += ` WHERE updated_at > $1`;
        params.push(isoTime);
        deltaApplied = true;
      } else if (cols.includes('created_at')) {
        query += ` WHERE created_at > $1`;
        params.push(isoTime);
        deltaApplied = true;
      }
    }

    query += ' LIMIT 50000';
    const result = await pool.query(query, params);
    return { table, rows: result.rows, deltaApplied };
  } catch (e: any) {
    return { table, rows: [], error: e.message };
  }
}

async function fetchTablesInBatches(tables: string[], lastSyncTime?: string) {
  const results: Record<string, any[]> = {};
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
  try {
    const startTime = Date.now();
    const { lastSyncTime } = req.query;
    console.log(`🔄 [Sync] طلب نسخة احتياطية${lastSyncTime ? ' تفاضلية منذ ' + lastSyncTime : ' كاملة'} (${ALL_DATABASE_TABLES.length} جدول، parallel batches)`);

    const { results, successCount, errorCount, deltaTablesCount, fullTablesCount } = await fetchTablesInBatches(
      ALL_DATABASE_TABLES,
      lastSyncTime as string | undefined
    );

    const duration = Date.now() - startTime;
    const totalRecords = Object.values(results).reduce((sum, rows) => sum + (rows as any[]).length, 0);
    console.log(`✅ [Sync] تم تجهيز ${totalRecords} سجل في ${duration}ms (${successCount} ناجح، ${errorCount} تخطي${lastSyncTime ? `, ${deltaTablesCount} تفاضلي، ${fullTablesCount} كامل` : ''})`);

    SyncAuditService.logBulkSync({
      userId: (req as any).user?.id,
      userName: (req as any).user?.name || (req as any).user?.email,
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
  } catch (error: any) {
    console.error('❌ [Sync] خطأ فادح في المزامنة:', error);
    SyncAuditService.logBulkSync({
      userId: (req as any).user?.id,
      userName: (req as any).user?.name || (req as any).user?.email,
      syncType: 'full_backup',
      tablesCount: ALL_DATABASE_TABLES.length,
      totalRecords: 0,
      durationMs: Date.now() - startTime,
      status: 'failed',
      errorMessage: error.message,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع في الخادم"
    }));
  }
});

/**
 * 🔄 تحميل النسخة الاحتياطية الكاملة (POST method)
 * POST /api/sync/full-backup
 */
syncRouter.post('/full-backup', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { lastSyncTime } = req.body;
    console.log(`🔄 [Sync] POST نسخة${lastSyncTime ? ' تفاضلية' : ' كاملة'} (parallel batches)`);

    const { results, successCount, errorCount, deltaTablesCount, fullTablesCount } = await fetchTablesInBatches(
      ALL_DATABASE_TABLES,
      lastSyncTime
    );

    const duration = Date.now() - startTime;
    const totalRecords = Object.values(results).reduce((sum, rows) => sum + (rows as any[]).length, 0);
    console.log(`✅ [Sync] POST اكتملت: ${totalRecords} سجل في ${duration}ms`);

    SyncAuditService.logBulkSync({
      userId: (req as any).user?.id,
      userName: (req as any).user?.name || (req as any).user?.email,
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
  } catch (error: any) {
    console.error('❌ [Sync] خطأ فادح:', error);
    SyncAuditService.logBulkSync({
      userId: (req as any).user?.id,
      userName: (req as any).user?.name || (req as any).user?.email,
      syncType: 'full_backup',
      tablesCount: ALL_DATABASE_TABLES.length,
      totalRecords: 0,
      durationMs: Date.now() - startTime,
      status: 'failed',
      errorMessage: error.message,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع في الخادم"
    });
  }
});

/**
 * ⚡ المزامنة الفورية (Instant Sync)
 * POST /api/sync/instant-sync
 * مزامنة فورية لجداول محددة
 */
syncRouter.post('/instant-sync', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { tables: requestedTables, lastSyncTime } = req.body;

    console.log(`⚡ [Sync] مزامنة فورية${lastSyncTime ? ' تفاضلية' : ''}`);

    const tablesToSync = requestedTables && Array.isArray(requestedTables) && requestedTables.length > 0
      ? requestedTables.filter((t: string) => ALL_DATABASE_TABLES.includes(t))
      : ALL_DATABASE_TABLES;

    const syncTime = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
    const { results, successCount, errorCount } = await fetchTablesInBatches(tablesToSync, syncTime);

    const totalRecords = Object.values(results).reduce((sum, rows) => sum + (rows as any[]).length, 0);
    const duration = Date.now() - startTime;
    console.log(`⚡ [Sync] اكتملت: ${totalRecords} سجل في ${duration}ms`);

    SyncAuditService.logBulkSync({
      userId: (req as any).user?.id,
      userName: (req as any).user?.name || (req as any).user?.email,
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
  } catch (error: any) {
    console.error('❌ [Sync] خطأ في المزامنة الفورية:', error);
    SyncAuditService.logBulkSync({
      userId: (req as any).user?.id,
      userName: (req as any).user?.name || (req as any).user?.email,
      syncType: 'instant_sync',
      tablesCount: 0,
      totalRecords: 0,
      durationMs: Date.now() - startTime,
      status: 'failed',
      errorMessage: error.message,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    return res.status(500).json({
      success: false,
      error: error.message,
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
  } catch (error: any) {
    console.error('❌ [Sync] خطأ في التحقق:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "فشل التحقق من التطابق"
    });
  }
});

/**
 * 📊 الحصول على إحصائيات المزامنة
 * GET /api/sync/stats
 */
syncRouter.get('/stats', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('❌ [Sync] خطأ في جلب الإحصائيات:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📋 الحصول على قائمة الجداول المدعومة
 * GET /api/sync/tables
 */
syncRouter.get('/tables', async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    tables: ALL_DATABASE_TABLES,
    count: ALL_DATABASE_TABLES.length,
    version: '2.0'
  });
});

/**
 * 🔄 Atomic Batch Sync
 * POST /api/sync/batch
 */
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
  'autocomplete': 'autocomplete',
};

syncRouter.post('/batch', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال مصفوفة من العمليات'
      });
    }

    console.log(`[Sync-Batch] بدء معالجة دفعة ذرية (${operations.length} عملية)...`);
    const startTime = Date.now();

    await client.query('BEGIN');

    const results: any[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const { action, endpoint, payload } = op;

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

      if (action === 'POST') {
        if (!payload || !payload.id) {
          throw new Error(`عملية ${i}: payload.id مطلوب للإنشاء`);
        }
        const columns = Object.keys(payload);
        const values = Object.values(payload);
        const placeholders = columns.map((_, idx) => `$${idx + 1}`);
        const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (id) DO NOTHING RETURNING *`;
        const result = await client.query(query, values);
        results.push({ index: i, success: true, data: result.rows[0] || payload });
      } else if (action === 'PATCH' || action === 'PUT') {
        if (!payload || !payload.id) {
          throw new Error(`عملية ${i}: payload.id مطلوب للتعديل`);
        }
        const { id, ...updateFields } = payload;
        const columns = Object.keys(updateFields);
        if (columns.length === 0) {
          results.push({ index: i, success: true, data: payload });
          continue;
        }
        const setClauses = columns.map((col, idx) => `"${col}" = $${idx + 2}`);
        const values = [id, ...Object.values(updateFields)];
        const query = `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`;
        const result = await client.query(query, values);
        results.push({ index: i, success: true, data: result.rows[0] || payload });
      } else if (action === 'DELETE') {
        const id = payload?.id || parts[parts.length - 1];
        if (!id) {
          throw new Error(`عملية ${i}: id مطلوب للحذف`);
        }
        await client.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
        results.push({ index: i, success: true });
      } else {
        throw new Error(`عملية ${i}: action غير مدعوم: ${action}`);
      }
    }

    await client.query('COMMIT');

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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[Sync-Batch] فشل الدفعة - تم التراجع:', error.message);
    return res.status(500).json({
      success: false,
      message: `فشل تنفيذ الدفعة: ${error.message}`,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

export default syncRouter;
