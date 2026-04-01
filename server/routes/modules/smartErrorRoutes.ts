import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../../middleware/auth.js';
import { smartErrorHandler } from '../../services/SmartErrorHandler.js';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

router.get('/statistics', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const statistics = await smartErrorHandler.getErrorStatistics();
    res.json({ success: true, statistics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في جلب إحصائيات الأخطاء' });
  }
});

router.post('/test', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const testError = await smartErrorHandler.handleDatabaseError(
      {
        message: 'test error for smart error system validation',
        code: '23505',
        constraint: 'test_unique_constraint',
      },
      {
        operation: 'insert',
        tableName: 'test_table',
        columnName: 'test_column',
        additionalContext: { source: 'manual_test' },
      },
      false
    );

    res.json({
      success: true,
      message: 'تم اختبار نظام كشف الأخطاء الذكي بنجاح',
      testError: {
        type: testError.errorType,
        severity: testError.severity,
        friendlyMessage: testError.friendlyMessage,
        fingerprint: testError.fingerprint,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في اختبار النظام الذكي' });
  }
});

export default router;
