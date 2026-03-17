import express, { Request, Response } from 'express';
import { SyncAuditService } from '../../services/SyncAuditService.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { page, limit, module, status, action, user_id, project_id, search, dateFrom, dateTo } = req.query;
    const result = await SyncAuditService.getLogs({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
      module: module as string,
      status: status as string,
      action: action as string,
      user_id: user_id as string,
      project_id: project_id as string,
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

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await SyncAuditService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات التدقيق:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

router.get('/modules', async (_req, res) => {
  try {
    const modules = await SyncAuditService.getModules();
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الأقسام' });
  }
});

router.get('/size-info', async (_req: Request, res: Response) => {
  try {
    const info = await SyncAuditService.getLogsSizeInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    console.error('خطأ في جلب معلومات حجم السجلات:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب معلومات الحجم' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const deleted = await SyncAuditService.deleteLog(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    }
    res.json({ success: true, message: 'تم حذف السجل بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف السجل:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف السجل' });
  }
});

router.delete('/by-status/:status', async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const result = await SyncAuditService.deleteByStatus(status);
    res.json({
      success: true,
      message: `تم حذف ${result.deletedCount} سجل بحالة "${status}"`,
      data: result,
    });
  } catch (error) {
    console.error('خطأ في حذف السجلات:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف السجلات' });
  }
});

router.delete('/all', async (_req: Request, res: Response) => {
  try {
    const result = await SyncAuditService.deleteAll();
    res.json({
      success: true,
      message: `تم حذف جميع السجلات (${result.deletedCount})`,
      data: result,
    });
  } catch (error) {
    console.error('خطأ في حذف جميع السجلات:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف جميع السجلات' });
  }
});

router.post('/purge', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 90 } = req.body;
    const days = Math.max(7, Math.min(365, Number(olderThanDays) || 90));
    const result = await SyncAuditService.purgeLogs(days);
    res.json({
      success: true,
      message: `تم حذف ${result.deletedCount} سجل أقدم من ${days} يوم نهائياً`,
      data: result,
    });
  } catch (error) {
    console.error('خطأ في تنظيف السجلات:', error);
    res.status(500).json({ success: false, message: 'خطأ في تنظيف السجلات' });
  }
});

router.post('/archive', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 90 } = req.body;
    const days = Math.max(7, Math.min(365, Number(olderThanDays) || 90));
    const result = await SyncAuditService.purgeLogs(days);
    res.json({
      success: true,
      message: `تم حذف ${result.deletedCount} سجل أقدم من ${days} يوم`,
      data: { archivedCount: result.deletedCount },
    });
  } catch (error) {
    console.error('خطأ في أرشفة السجلات:', error);
    res.status(500).json({ success: false, message: 'خطأ في أرشفة السجلات' });
  }
});

export default router;
