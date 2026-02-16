import express from 'express';
import { SyncAuditService } from '../../services/SyncAuditService.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.get('/logs', authenticate, async (req, res) => {
  try {
    const { page, limit, module, status, action, userId, projectId, search, dateFrom, dateTo } = req.query;
    const result = await SyncAuditService.getLogs({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
      module: module as string,
      status: status as string,
      action: action as string,
      userId: userId as string,
      projectId: projectId as string,
      search: search as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('خطأ في جلب سجلات التدقيق:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب سجلات التدقيق' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await SyncAuditService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات التدقيق:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

router.get('/modules', authenticate, async (_req, res) => {
  try {
    const modules = await SyncAuditService.getModules();
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الأقسام' });
  }
});

export default router;
