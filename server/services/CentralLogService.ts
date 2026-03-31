import { pool } from '../db';
import { db } from '../db';
import { centralEventLogs } from '@shared/schema';
import { desc, eq, and, gte, lte, ilike, sql } from 'drizzle-orm';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'apikey', 'jwt', 'set-cookie', 'creditcard'];

function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(s => lowerKey.includes(s))) {
      result[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = redactSensitive(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

export interface CentralEventInput {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  source: string;
  module?: string;
  action?: string;
  status?: string;
  actorUserId?: string;
  project_id?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  message: string;
  details?: any;
  amount?: number;
}

export interface LogContext {
  source: string;
  module?: string;
  action?: string;
  actorUserId?: string;
  project_id?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface HttpLogMeta {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  query?: any;
}

export interface DomainLogMeta {
  source: string;
  module: string;
  action: string;
  level?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  status?: string;
  actorUserId?: string;
  project_id?: string;
  entityType?: string;
  entityId?: string;
  message: string;
  details?: any;
  amount?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogQueryFilters {
  page?: number;
  limit?: number;
  level?: string;
  source?: string;
  module?: string;
  action?: string;
  status?: string;
  project_id?: string;
  actorUserId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RetentionPolicy {
  debug?: number;
  info?: number;
  warn?: number;
  error?: number;
  critical?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  byModule: Record<string, number>;
}

const BATCH_SIZE = 200;
const FLUSH_INTERVAL_MS = 2000;

class CentralLogService {
  private static instance: CentralLogService;
  private queue: CentralEventInput[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;
  private indexesCreated = false;

  private constructor() {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => console.warn('⚠️ [CentralLog] Background flush failed:', err?.message));
    }, FLUSH_INTERVAL_MS);

    process.on('beforeExit', () => {
      this.flush().catch(err => console.warn('⚠️ [CentralLog] Exit flush failed:', err?.message));
    });
  }

  static getInstance(): CentralLogService {
    if (!CentralLogService.instance) {
      CentralLogService.instance = new CentralLogService();
    }
    return CentralLogService.instance;
  }

  async ensureTable(): Promise<void> {
    if (this.indexesCreated) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS central_event_logs (
          id SERIAL PRIMARY KEY,
          event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
          level VARCHAR(10) NOT NULL,
          source VARCHAR(30) NOT NULL,
          module VARCHAR(50),
          action VARCHAR(50),
          status VARCHAR(20),
          actor_user_id VARCHAR(255),
          project_id VARCHAR(255),
          entity_type VARCHAR(50),
          entity_id TEXT,
          request_id UUID,
          ip_address TEXT,
          user_agent TEXT,
          duration_ms INTEGER,
          message TEXT NOT NULL,
          details JSONB,
          amount NUMERIC(15,2),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cel_time_brin ON central_event_logs USING BRIN(event_time)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cel_level_time ON central_event_logs(level, event_time DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cel_module_time ON central_event_logs(module, event_time DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cel_source_time ON central_event_logs(source, event_time DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cel_project_time ON central_event_logs(project_id, event_time DESC) WHERE project_id IS NOT NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cel_actor_time ON central_event_logs(actor_user_id, event_time DESC) WHERE actor_user_id IS NOT NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cel_details_gin ON central_event_logs USING GIN(details jsonb_path_ops)`);
      this.indexesCreated = true;
    } catch (err) {
      console.error('⚠️ [CentralLog] فشل إنشاء الجدول/الفهارس:', err);
    }
  }

  log(event: CentralEventInput): void {
    try {
      const sanitized = { ...event };
      if (sanitized.details) {
        sanitized.details = redactSensitive(sanitized.details);
      }
      this.queue.push(sanitized);
      if (this.queue.length >= BATCH_SIZE) {
        this.flush().catch(err => console.warn('⚠️ [CentralLog] Batch flush failed:', err?.message));
      }
    } catch (err: any) {
      console.warn('⚠️ [CentralLog] log() internal error:', err?.message);
    }
  }

  logError(error: Error, context: LogContext): void {
    this.log({
      level: 'error',
      source: context.source,
      module: context.module,
      action: context.action,
      status: 'failed',
      actorUserId: context.actorUserId,
      project_id: context.project_id,
      entityType: context.entityType,
      entityId: context.entityId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      message: error.message || 'Unknown error',
      details: redactSensitive({ stack: error.stack, name: error.name }),
    });
  }

  logHttp(meta: HttpLogMeta): void {
    if (meta.statusCode >= 500) {
      this.log({
        level: 'error',
        source: 'api',
        action: `${meta.method} ${meta.path}`,
        status: 'failed',
        actorUserId: meta.actorUserId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        durationMs: meta.durationMs,
        message: `${meta.method} ${meta.path} → ${meta.statusCode} (${meta.durationMs}ms)`,
        details: redactSensitive({ statusCode: meta.statusCode, method: meta.method, path: meta.path, userAgent: meta.userAgent, query: meta.query }),
      });
    } else if (meta.statusCode >= 400 && Math.random() < 0.2) {
      this.log({
        level: 'warn',
        source: 'api',
        action: `${meta.method} ${meta.path}`,
        status: 'failed',
        actorUserId: meta.actorUserId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        durationMs: meta.durationMs,
        message: `${meta.method} ${meta.path} → ${meta.statusCode} (${meta.durationMs}ms)`,
        details: redactSensitive({ statusCode: meta.statusCode, method: meta.method, path: meta.path, userAgent: meta.userAgent, query: meta.query }),
      });
    }
    if (meta.durationMs > 1500) {
      this.log({
        level: 'warn',
        source: 'api',
        action: 'slow_request',
        actorUserId: meta.actorUserId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        durationMs: meta.durationMs,
        message: `${meta.method} ${meta.path} → ${meta.statusCode} (${meta.durationMs}ms)`,
        details: redactSensitive({ statusCode: meta.statusCode, method: meta.method, path: meta.path, userAgent: meta.userAgent, query: meta.query }),
      });
    }
  }

  logDomain(meta: DomainLogMeta): void {
    this.log({
      level: meta.level || 'info',
      source: meta.source,
      module: meta.module,
      action: meta.action,
      status: meta.status,
      actorUserId: meta.actorUserId,
      project_id: meta.project_id,
      entityType: meta.entityType,
      entityId: meta.entityId,
      message: meta.message,
      details: meta.details,
      amount: meta.amount,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, BATCH_SIZE);

    try {
      await this.ensureTable();

      const columns = [
        'level', 'source', 'module', 'action', 'status',
        'actor_user_id', 'project_id', 'entity_type', 'entity_id',
        'request_id', 'ip_address', 'user_agent', 'duration_ms',
        'message', 'details', 'amount'
      ];

      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const event of batch) {
        const rowPlaceholders: string[] = [];
        const row = [
          event.level,
          event.source,
          event.module || null,
          event.action || null,
          event.status || null,
          event.actorUserId || null,
          event.project_id || null,
          event.entityType || null,
          event.entityId || null,
          event.requestId || null,
          event.ipAddress || null,
          event.userAgent || null,
          event.durationMs != null ? event.durationMs : null,
          event.message,
          event.details ? JSON.stringify(event.details) : null,
          event.amount != null ? String(event.amount) : null,
        ];
        for (const val of row) {
          rowPlaceholders.push(`$${paramIndex++}`);
          values.push(val);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      }

      const query = `INSERT INTO central_event_logs (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
      await pool.query(query, values);
    } catch (err) {
      console.error('⚠️ [CentralLog] فشل إدراج السجلات:', err);
    } finally {
      this.flushing = false;
      if (this.queue.length >= BATCH_SIZE) {
        this.flush().catch(err => console.warn('⚠️ [CentralLog] Post-flush retry failed:', err?.message));
      }
    }
  }

  async purge(policy?: RetentionPolicy): Promise<{ deleted: number }> {
    const defaultPolicy: RetentionPolicy = {
      debug: 3,
      info: 14,
      warn: 60,
      error: 180,
      critical: 180,
    };
    const p = { ...defaultPolicy, ...policy };
    let totalDeleted = 0;

    try {
      await this.ensureTable();
      for (const [level, days] of Object.entries(p)) {
        if (days == null) continue;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const result = await pool.query(
          `DELETE FROM central_event_logs WHERE level = $1 AND event_time < $2`,
          [level, cutoff.toISOString()]
        );
        totalDeleted += result.rowCount || 0;
      }
    } catch (err) {
      console.error('⚠️ [CentralLog] فشل تنظيف السجلات:', err);
    }

    return { deleted: totalDeleted };
  }

  async query(filters: LogQueryFilters): Promise<{ logs: any[], total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 50));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters.level && filters.level !== 'all') {
      conditions.push(eq(centralEventLogs.level, filters.level));
    }
    if (filters.source && filters.source !== 'all') {
      conditions.push(eq(centralEventLogs.source, filters.source));
    }
    if (filters.module && filters.module !== 'all') {
      conditions.push(eq(centralEventLogs.module, filters.module));
    }
    if (filters.action && filters.action !== 'all') {
      conditions.push(eq(centralEventLogs.action, filters.action));
    }
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(centralEventLogs.status, filters.status));
    }
    if (filters.project_id && filters.project_id !== 'all') {
      conditions.push(eq(centralEventLogs.project_id, filters.project_id));
    }
    if (filters.actorUserId) {
      conditions.push(eq(centralEventLogs.actorUserId, filters.actorUserId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(centralEventLogs.eventTime, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(centralEventLogs.eventTime, toDate));
    }
    if (filters.search) {
      conditions.push(ilike(centralEventLogs.message, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    try {
      const [logs, countResult] = await Promise.all([
        db.select()
          .from(centralEventLogs)
          .where(whereClause)
          .orderBy(desc(centralEventLogs.eventTime))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` })
          .from(centralEventLogs)
          .where(whereClause),
      ]);

      return {
        logs,
        total: countResult[0]?.count || 0,
      };
    } catch (err) {
      console.error('⚠️ [CentralLog] فشل الاستعلام:', err);
      return { logs: [], total: 0 };
    }
  }

  async getStats(timeRange?: string): Promise<LogStats> {
    try {
      let timeFilter = '';
      if (timeRange === '24h') {
        timeFilter = `WHERE event_time >= now() - interval '24 hours'`;
      } else if (timeRange === '7d') {
        timeFilter = `WHERE event_time >= now() - interval '7 days'`;
      } else if (timeRange === '30d') {
        timeFilter = `WHERE event_time >= now() - interval '30 days'`;
      }

      const totalResult = await pool.query(`SELECT count(*)::int as total FROM central_event_logs ${timeFilter}`);
      const levelResult = await pool.query(`SELECT level, count(*)::int as count FROM central_event_logs ${timeFilter} GROUP BY level`);
      const sourceResult = await pool.query(`SELECT source, count(*)::int as count FROM central_event_logs ${timeFilter} GROUP BY source`);
      const moduleResult = await pool.query(`SELECT module, count(*)::int as count FROM central_event_logs ${timeFilter} GROUP BY module`);

      const byLevel: Record<string, number> = {};
      for (const row of levelResult.rows) {
        byLevel[row.level] = row.count;
      }

      const bySource: Record<string, number> = {};
      for (const row of sourceResult.rows) {
        bySource[row.source] = row.count;
      }

      const byModule: Record<string, number> = {};
      for (const row of moduleResult.rows) {
        if (row.module) byModule[row.module] = row.count;
      }

      return {
        total: totalResult.rows[0]?.total || 0,
        byLevel,
        bySource,
        byModule,
      };
    } catch (err) {
      console.error('⚠️ [CentralLog] فشل جلب الإحصائيات:', err);
      return { total: 0, byLevel: {}, bySource: {}, byModule: {} };
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export { CentralLogService, redactSensitive };
export default CentralLogService;
