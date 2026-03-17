import { db } from '../db.js';
import { syncAuditLogs, users, projects } from '../../shared/schema.js';
import { desc, eq, sql, and, gte, lte, ilike } from 'drizzle-orm';

const MODULE_MAP: Record<string, string> = {
  'fund-transfers': 'مالية',
  'fund_transfers': 'مالية',
  'project-fund-transfers': 'مالية',
  'project_fund_transfers': 'مالية',
  'workers': 'عمال',
  'worker-attendance': 'عمال',
  'worker_attendance': 'عمال',
  'worker-transfers': 'عمال',
  'worker_transfers': 'عمال',
  'worker-misc-expenses': 'عمال',
  'worker_misc_expenses': 'عمال',
  'worker-balances': 'عمال',
  'worker_balances': 'عمال',
  'suppliers': 'موردين',
  'supplier-payments': 'موردين',
  'supplier_payments': 'موردين',
  'materials': 'مواد',
  'material-purchases': 'مواد',
  'material_purchases': 'مواد',
  'transportation-expenses': 'نقل',
  'transportation_expenses': 'نقل',
  'projects': 'مشاريع',
  'project-types': 'مشاريع',
  'project_types': 'مشاريع',
  'wells': 'آبار',
  'well-tasks': 'آبار',
  'well_tasks': 'آبار',
  'well-expenses': 'آبار',
  'well_expenses': 'آبار',
  'well-audit-logs': 'آبار',
  'well_audit_logs': 'آبار',
  'equipment': 'معدات',
  'equipment-transfers': 'معدات',
  'equipment_transfers': 'معدات',
  'daily-activity-logs': 'أنشطة',
  'daily_activity_logs': 'أنشطة',
  'daily-expense-summaries': 'مصروفات',
  'daily_expense_summaries': 'مصروفات',
  'backup-logs': 'نظام',
  'backup_logs': 'نظام',
  'users': 'نظام',
  'tasks': 'نظام',
  'notifications': 'نظام',
  'autocomplete-data': 'نظام',
  'autocomplete_data': 'نظام',
};

const TABLE_LABELS: Record<string, string> = {
  'fund-transfers': 'تحويلات مالية',
  'fund_transfers': 'تحويلات مالية',
  'project-fund-transfers': 'تحويلات بين المشاريع',
  'project_fund_transfers': 'تحويلات بين المشاريع',
  'workers': 'العمال',
  'worker-attendance': 'حضور العمال',
  'worker_attendance': 'حضور العمال',
  'worker-transfers': 'تحويلات العمال',
  'worker_transfers': 'تحويلات العمال',
  'worker-misc-expenses': 'مصروفات عمال متنوعة',
  'worker_misc_expenses': 'مصروفات عمال متنوعة',
  'worker-balances': 'أرصدة العمال',
  'worker_balances': 'أرصدة العمال',
  'suppliers': 'الموردين',
  'supplier-payments': 'مدفوعات الموردين',
  'supplier_payments': 'مدفوعات الموردين',
  'materials': 'المواد',
  'material-purchases': 'مشتريات المواد',
  'material_purchases': 'مشتريات المواد',
  'transportation-expenses': 'مصاريف النقل',
  'transportation_expenses': 'مصاريف النقل',
  'projects': 'المشاريع',
  'wells': 'الآبار',
  'well-tasks': 'مهام الآبار',
  'well_tasks': 'مهام الآبار',
  'equipment': 'المعدات',
  'daily-activity-logs': 'سجلات النشاط اليومي',
  'daily_activity_logs': 'سجلات النشاط اليومي',
};

const ACTION_LABELS: Record<string, string> = {
  'create': 'إضافة',
  'update': 'تعديل',
  'delete': 'حذف',
  'sync_push': 'رفع مزامنة',
  'sync_pull': 'سحب مزامنة',
  'full_backup': 'نسخة كاملة',
  'delta_sync': 'مزامنة تفاضلية',
  'instant_sync': 'مزامنة فورية',
};

function extractTableFromEndpoint(endpoint: string): string {
  const parts = endpoint.replace(/^\/api\//, '').split('/');
  if (parts.length >= 2 && parts[1]) {
    return parts[1];
  }
  return parts[0] || endpoint;
}

function buildDescription(action: string, tableName: string, payload?: any): string {
  const actionLabel = ACTION_LABELS[action] || action;
  const tableLabel = TABLE_LABELS[tableName] || tableName;
  let desc = `${actionLabel} - ${tableLabel}`;

  if (payload) {
    if (payload.transferNumber) desc += ` رقم ${payload.transferNumber}`;
    if (payload.name) desc += ` (${payload.name})`;
    if (payload.amount) desc += ` بمبلغ ${Number(payload.amount).toLocaleString('ar-SA')}`;
    if (payload.materialName) desc += ` - ${payload.materialName}`;
    if (payload.workerName) desc += ` - ${payload.workerName}`;
    if (payload.supplierName) desc += ` - ${payload.supplierName}`;
  }

  return desc;
}

export class SyncAuditService {
  static async logOperation(params: {
    user_id?: string;
    userName?: string;
    action: string;
    endpoint?: string;
    tableName?: string;
    recordId?: string;
    status: 'success' | 'failed' | 'duplicate' | 'skipped' | 'conflict';
    description?: string;
    oldValues?: any;
    newValues?: any;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    durationMs?: number;
    syncType?: string;
    project_id?: string;
    projectName?: string;
    amount?: number;
    payload?: any;
  }) {
    try {
      const table = params.tableName || (params.endpoint ? extractTableFromEndpoint(params.endpoint) : 'unknown');
      const module = MODULE_MAP[table] || 'أخرى';
      const description = params.description || buildDescription(params.action, table, params.payload || params.newValues);

      await db.insert(syncAuditLogs).values({
        user_id: params.user_id || null,
        userName: params.userName || null,
        module,
        tableName: table,
        recordId: params.recordId || params.payload?.id || params.newValues?.id || null,
        action: params.action,
        status: params.status,
        description,
        oldValues: params.oldValues || null,
        newValues: params.newValues || params.payload || null,
        errorMessage: params.errorMessage || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        durationMs: params.durationMs || null,
        syncType: params.syncType || null,
        project_id: params.project_id || params.payload?.project_id || null,
        projectName: params.projectName || null,
        amount: params.amount != null ? String(params.amount) : (params.payload?.amount ? String(params.payload.amount) : null),
      });
    } catch (error) {
      console.error('⚠️ [SyncAudit] فشل تسجيل عملية التدقيق:', error);
    }
  }

  static async logBulkSync(params: {
    user_id?: string;
    userName?: string;
    syncType: 'full_backup' | 'delta_sync' | 'instant_sync';
    tablesCount: number;
    totalRecords: number;
    durationMs: number;
    status: 'success' | 'failed';
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    isDelta?: boolean;
    deltaTablesCount?: number;
    fullTablesCount?: number;
  }) {
    try {
      const syncLabel = params.syncType === 'full_backup'
        ? (params.isDelta ? 'مزامنة تفاضلية' : 'نسخة احتياطية كاملة')
        : params.syncType === 'instant_sync'
        ? 'مزامنة فورية'
        : 'مزامنة';

      const description = params.status === 'success'
        ? `${syncLabel}: ${params.totalRecords} سجل من ${params.tablesCount} جدول في ${params.durationMs}ms`
          + (params.isDelta ? ` (${params.deltaTablesCount || 0} تفاضلي، ${params.fullTablesCount || 0} كامل)` : '')
        : `فشل ${syncLabel}: ${params.errorMessage}`;

      await db.insert(syncAuditLogs).values({
        user_id: params.user_id || null,
        userName: params.userName || null,
        module: 'مزامنة',
        tableName: 'sync_operation',
        action: params.syncType,
        status: params.status,
        description,
        newValues: {
          tablesCount: params.tablesCount,
          totalRecords: params.totalRecords,
          isDelta: params.isDelta,
          deltaTablesCount: params.deltaTablesCount,
          fullTablesCount: params.fullTablesCount,
        },
        errorMessage: params.errorMessage || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        durationMs: params.durationMs,
        syncType: params.syncType,
      });
    } catch (error) {
      console.error('⚠️ [SyncAudit] فشل تسجيل عملية المزامنة الجماعية:', error);
    }
  }

  static async getLogs(params: {
    page?: number;
    limit?: number;
    module?: string;
    status?: string;
    action?: string;
    user_id?: string;
    project_id?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(200, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (params.module && params.module !== 'all') {
      conditions.push(eq(syncAuditLogs.module, params.module));
    }
    if (params.status && params.status !== 'all') {
      if (params.status.includes(',')) {
        const statuses = params.status.split(',').map((s: string) => s.trim());
        conditions.push(sql`${syncAuditLogs.status} IN (${sql.join(statuses.map((s: string) => sql`${s}`), sql`, `)})`);
      } else {
        conditions.push(eq(syncAuditLogs.status, params.status));
      }
    }
    if (params.action && params.action !== 'all') {
      conditions.push(eq(syncAuditLogs.action, params.action));
    }
    if (params.user_id) {
      conditions.push(eq(syncAuditLogs.user_id, params.user_id));
    }
    if (params.project_id && params.project_id !== 'all') {
      conditions.push(eq(syncAuditLogs.project_id, params.project_id));
    }
    if (params.dateFrom) {
      conditions.push(gte(syncAuditLogs.created_at, new Date(params.dateFrom)));
    }
    if (params.dateTo) {
      const toDate = new Date(params.dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(syncAuditLogs.created_at, toDate));
    }
    if (params.search) {
      conditions.push(ilike(syncAuditLogs.description, `%${params.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, countResult] = await Promise.all([
      db.select()
        .from(syncAuditLogs)
        .where(whereClause)
        .orderBy(desc(syncAuditLogs.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(syncAuditLogs)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getStats() {
    const [result] = await db.select({
      total: sql<number>`count(*)::int`,
      success: sql<number>`count(*) filter (where status = 'success')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      duplicate: sql<number>`count(*) filter (where status = 'duplicate')::int`,
      conflict: sql<number>`count(*) filter (where status = 'conflict')::int`,
      skipped: sql<number>`count(*) filter (where status = 'skipped')::int`,
      todayCount: sql<number>`count(*) filter (where created_at >= current_date)::int`,
      lastSyncAt: sql<string>`max(created_at)::text`,
    }).from(syncAuditLogs);

    const moduleStats = await db.select({
      module: syncAuditLogs.module,
      count: sql<number>`count(*)::int`,
    })
    .from(syncAuditLogs)
    .groupBy(syncAuditLogs.module)
    .orderBy(desc(sql`count(*)`));

    return { ...result, moduleStats };
  }

  static async getModules() {
    return Object.entries(MODULE_MAP).reduce((acc, [key, value]) => {
      if (!acc.find(m => m.value === value)) {
        acc.push({ value, label: value });
      }
      return acc;
    }, [] as { value: string; label: string }[]);
  }

  static async deleteLog(id: number): Promise<boolean> {
    const result = await db.delete(syncAuditLogs).where(eq(syncAuditLogs.id, id));
    return ((result as { rowCount?: number }).rowCount || 0) > 0;
  }

  static async deleteByStatus(status: string): Promise<{ deletedCount: number }> {
    const result = await db.delete(syncAuditLogs).where(eq(syncAuditLogs.status, status));
    return { deletedCount: (result as { rowCount?: number }).rowCount || 0 };
  }

  static async deleteAll(): Promise<{ deletedCount: number }> {
    const result = await db.delete(syncAuditLogs);
    return { deletedCount: (result as { rowCount?: number }).rowCount || 0 };
  }

  static async purgeLogs(olderThanDays: number = 90): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db.delete(syncAuditLogs).where(
      lte(syncAuditLogs.created_at, cutoffDate)
    );
    const deletedCount = (result as { rowCount?: number }).rowCount || 0;
    return { deletedCount };
  }

  static async archiveLogs(olderThanDays: number = 90): Promise<{ archivedCount: number }> {
    const result = await this.purgeLogs(olderThanDays);
    return { archivedCount: result.deletedCount };
  }

  static async getLogsSizeInfo(): Promise<{ totalLogs: number; oldestLog: string | null; newestLog: string | null }> {
    const [result] = await db.select({
      totalLogs: sql<number>`count(*)::int`,
      oldestLog: sql<string>`min(created_at)::text`,
      newestLog: sql<string>`max(created_at)::text`,
    }).from(syncAuditLogs);

    return {
      totalLogs: result?.totalLogs || 0,
      oldestLog: result?.oldestLog || null,
      newestLog: result?.newestLog || null,
    };
  }
}
