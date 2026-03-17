import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import CentralLogService from '../../services/CentralLogService.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { getAuthUser } from '../../internal/auth-user.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    page, limit, level, source, module, action, status,
    project_id, actor_user_id, search, dateFrom, dateTo
  } = req.query;

  const service = CentralLogService.getInstance();
  const result = await service.query({
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 50,
    level: level as string,
    source: source as string,
    module: module as string,
    action: action as string,
    status: status as string,
    project_id: project_id as string,
    actorUserId: actor_user_id as string,
    search: search as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
  });

  res.json({
    success: true,
    data: result.logs,
    total: result.total,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 50,
  });
}));

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const { timeRange } = req.query;
  const service = CentralLogService.getInstance();
  const stats = await service.getStats(timeRange as string);

  let trendData: { hour: string; count: number }[] = [];
  try {
    const { pool } = await import('../../db.js');
    const trendResult = await pool.query(`
      SELECT
        date_trunc('hour', event_time) AS hour,
        count(*)::int AS count
      FROM central_event_logs
      WHERE event_time >= now() - interval '24 hours'
      GROUP BY hour
      ORDER BY hour
    `);
    trendData = trendResult.rows.map((r: any) => ({
      hour: r.hour,
      count: r.count,
    }));
  } catch {}

  res.json({
    success: true,
    data: {
      ...stats,
      trend: trendData,
    },
  });
}));

router.get('/export', asyncHandler(async (req: Request, res: Response) => {
  const {
    format: exportFormat, level, source, module, action, status,
    project_id, actor_user_id, search, dateFrom, dateTo
  } = req.query;

  const service = CentralLogService.getInstance();
  const result = await service.query({
    page: 1,
    limit: 200,
    level: level as string,
    source: source as string,
    module: module as string,
    action: action as string,
    status: status as string,
    project_id: project_id as string,
    actorUserId: actor_user_id as string,
    search: search as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
  });

  if (exportFormat === 'csv') {
    const headers = ['id', 'event_time', 'level', 'source', 'module', 'action', 'status', 'actor_user_id', 'project_id', 'entity_type', 'entity_id', 'duration_ms', 'message', 'amount'];
    const csvRows = [headers.join(',')];
    for (const log of result.logs) {
      const row = headers.map(h => {
        const key = h === 'event_time' ? 'eventTime' : h === 'actor_user_id' ? 'actorUserId' : h === 'project_id' ? 'project_id' : h === 'entity_type' ? 'entityType' : h === 'entity_id' ? 'entityId' : h === 'duration_ms' ? 'durationMs' : h;
        const val = (log as any)[key];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvRows.push(row.join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="central-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csvRows.join('\n'));
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="central-logs-${new Date().toISOString().split('T')[0]}.json"`);
  res.json({ success: true, data: result.logs, total: result.total });
}));

router.delete('/purge', asyncHandler(async (req: Request, res: Response) => {
  const service = CentralLogService.getInstance();
  const user = getAuthUser(req);
  console.log(`🗑️ [CentralLog] تنظيف يدوي بواسطة: ${user?.user_id}`);
  const result = await service.purge();
  res.json({
    success: true,
    message: `تم حذف ${result.deleted} سجل`,
    data: result,
  });
}));

export default router;
