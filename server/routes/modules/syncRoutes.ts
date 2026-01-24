/**
 * مسارات المزامنة المتقدمة (Synchronization Routes)
 * Advanced Sync API for Offline-First Mobile Apps
 * يدعم 68 جدول للمزامنة الكاملة
 */

import express from 'express';
import { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db.js';
import { ALL_SYNC_TABLES, getAllTablesData, verifySync } from '../../sync.js';

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
  'report_templates', 'tool_categories', 'tools', 'tool_stock', 'tool_movements',
  'tool_maintenance_logs', 'tool_usage_analytics', 'tool_purchase_items', 'maintenance_schedules', 'maintenance_tasks',
  'tool_cost_tracking', 'tool_reservations', 'system_notifications', 'notification_read_states', 'build_deployments',
  'tool_notifications', 'approvals', 'channels', 'messages', 'actions', 'system_events',
  'accounts', 'transactions', 'transaction_lines', 'journals', 'finance_payments', 'finance_events', 'account_balances',
  'notifications', 'ai_chat_sessions', 'ai_chat_messages', 'ai_usage_stats',
  'well_tasks', 'well_task_accounts', 'well_expenses', 'well_audit_logs', 'material_categories'
];

/**
 * 🔄 تحميل النسخة الاحتياطية الكاملة (Full Backup Download)
 * GET /api/sync/full-backup
 * يدعم 68 جدول للمزامنة الكاملة
 */
syncRouter.get('/full-backup', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    console.log('🔄 [Sync] طلب تحميل النسخة الاحتياطية الكاملة (68 جدول)');
    
    const results: any = {};
    let successCount = 0;
    let errorCount = 0;
    
    for (const table of ALL_DATABASE_TABLES) {
      try {
        const queryResult = await db.execute(sql.raw(`SELECT * FROM ${table} LIMIT 50000`));
        results[table] = queryResult.rows;
        successCount++;
      } catch (e: any) {
        console.warn(`⚠️ [Sync] تخطي جدول ${table}:`, e.message);
        results[table] = [];
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [Sync] تم تجهيز البيانات في ${duration}ms (${successCount} ناجح، ${errorCount} تخطي)`);
    
    res.setHeader('Content-Type', 'application/json');
    const response = {
      success: true,
      status: "success",
      message: "تم تجهيز البيانات بنجاح",
      data: results,
      timestamp: new Date().toISOString(),
      metadata: {
        timestamp: Date.now(),
        version: '2.0-full-sync',
        duration,
        tablesCount: ALL_DATABASE_TABLES.length,
        successCount,
        errorCount
      }
    };
    return res.status(200).send(JSON.stringify(response));
  } catch (error: any) {
    console.error('❌ [Sync] خطأ فادح في المزامنة:', error);
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
    console.log('🔄 [Sync] طلب مزامنة كاملة (POST) - 68 جدول');
    
    const results: any = {};
    let successCount = 0;
    let errorCount = 0;
    
    for (const table of ALL_DATABASE_TABLES) {
      try {
        const queryResult = await db.execute(sql.raw(`SELECT * FROM ${table} LIMIT 50000`));
        results[table] = queryResult.rows;
        successCount++;
      } catch (e: any) {
        console.warn(`⚠️ [Sync] تخطي جدول ${table}:`, e.message);
        results[table] = [];
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [Sync] اكتملت المزامنة الكاملة في ${duration}ms`);
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      status: "success",
      message: "تم تجهيز البيانات بنجاح",
      data: results,
      timestamp: new Date().toISOString(),
      metadata: {
        timestamp: Date.now(),
        version: '2.0-full-sync',
        duration,
        tablesCount: ALL_DATABASE_TABLES.length,
        successCount,
        errorCount
      }
    });
  } catch (error: any) {
    console.error('❌ [Sync] خطأ فادح:', error);
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
    
    console.log('⚡ [Sync] طلب مزامنة فورية');
    
    const tablesToSync = requestedTables && Array.isArray(requestedTables) && requestedTables.length > 0
      ? requestedTables.filter((t: string) => ALL_DATABASE_TABLES.includes(t))
      : ALL_DATABASE_TABLES;
    
    const results: any = {};
    let totalRecords = 0;
    
    for (const table of tablesToSync) {
      try {
        let query = `SELECT * FROM ${table}`;
        
        if (lastSyncTime) {
          query += ` WHERE updated_at > '${new Date(lastSyncTime).toISOString()}' OR created_at > '${new Date(lastSyncTime).toISOString()}'`;
        }
        
        query += ' LIMIT 10000';
        
        const queryResult = await db.execute(sql.raw(query));
        results[table] = queryResult.rows;
        totalRecords += queryResult.rows.length;
      } catch (e: any) {
        try {
          const fallbackResult = await db.execute(sql.raw(`SELECT * FROM ${table} LIMIT 10000`));
          results[table] = fallbackResult.rows;
          totalRecords += fallbackResult.rows.length;
        } catch {
          results[table] = [];
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`⚡ [Sync] المزامنة الفورية اكتملت: ${totalRecords} سجل في ${duration}ms`);
    
    return res.status(200).json({
      success: true,
      message: "تمت المزامنة الفورية بنجاح",
      data: results,
      metadata: {
        timestamp: Date.now(),
        duration,
        tablesCount: tablesToSync.length,
        totalRecords,
        version: '2.0-instant'
      }
    });
  } catch (error: any) {
    console.error('❌ [Sync] خطأ في المزامنة الفورية:', error);
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
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
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
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
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

export default syncRouter;
