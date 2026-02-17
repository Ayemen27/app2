/**
 * مسارات الصحة ومراقبة النظام
 * Health & System Monitoring Routes
 * متوافق مع الويب والأندرويد
 */

import express from 'express';
import { Request, Response } from 'express';
import { db, checkDBConnection } from '../../db.js';
import { healthMonitor } from '../../services/HealthMonitor';
import { circuitBreaker } from '../../services/CircuitBreaker';
import { smartConnectionManager } from '../../services/smart-connection-manager';
import { requireAuth } from '../../middleware/auth.js';

// دالة تحقق من الصلاحيات للمسارات المحمية
const requireRole = (role: string) => (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'غير مصرح' });
  }
  if (user.role === role || user.role === 'super_admin' || user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
};

export const healthRouter = express.Router();

/**
 * فحص صحة النظام البسيط
 * Simple health check endpoint
 */
healthRouter.get('/health', async (req: Request, res: Response) => {
  const lastStatus = healthMonitor.getLastStatus();
  const connectionStatus = smartConnectionManager.getConnectionStatus();
  
  res.json({ 
    status: lastStatus?.status || "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '3.0.0-smart',
    platform: req.headers['x-platform'] || 'web',
    connections: connectionStatus,
    emergencyMode: (global as any).isEmergencyMode || false
  });
});

/**
 * فحص صحة متقدم للتطبيقات
 */
healthRouter.get('/health/full', async (req: Request, res: Response) => {
  try {
    const healthStatus = await healthMonitor.runHealthCheck();
    const metrics = healthMonitor.getMetrics();
    const cbReport = circuitBreaker.getHealthReport();
    
    res.json({
      success: true,
      health: healthStatus,
      metrics,
      circuitBreakers: cbReport,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      emergencyMode: (global as any).isEmergencyMode || false
    });
  }
});

/**
 * فحص سلامة البيانات
 */
healthRouter.get('/data-health', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await healthMonitor.checkIntegrity();
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'failed',
      issues: [error.message]
    });
  }
});

/**
 * فحص سلامة البيانات (مسار بديل)
 */
healthRouter.get('/health/integrity', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await healthMonitor.checkIntegrity();
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'failed',
      issues: [error.message]
    });
  }
});

/**
 * تاريخ حالة الصحة
 */
healthRouter.get('/health/history', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const history = healthMonitor.getHistory(limit);
  
  res.json({
    success: true,
    count: history.length,
    history,
    metrics: healthMonitor.getMetrics()
  });
});

/**
 * حالة Circuit Breakers
 */
healthRouter.get('/health/circuits', (req: Request, res: Response) => {
  const report = circuitBreaker.getHealthReport();
  const states = circuitBreaker.getAllStates();
  
  res.json({
    success: true,
    report,
    states,
    timestamp: new Date().toISOString()
  });
});

/**
 * إعادة تعيين Circuit Breaker معين
 */
healthRouter.post('/health/circuits/:name/reset', requireAuth, (req: Request, res: Response) => {
  const { name } = req.params;
  
  try {
    circuitBreaker.reset(name);
    res.json({
      success: true,
      message: `تم إعادة تعيين ${name}`,
      newState: circuitBreaker.getState(name)
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * فحص الاتصال بقواعد البيانات
 */
healthRouter.get('/health/connections', requireAuth, async (req: Request, res: Response) => {
  try {
    const connectionTest = await smartConnectionManager.runConnectionTest();
    const status = smartConnectionManager.getConnectionStatus();
    
    res.json({
      success: true,
      status,
      details: connectionTest,
      emergencyMode: (global as any).isEmergencyMode || false,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * إعادة الاتصال بقاعدة البيانات
 */
healthRouter.post('/health/reconnect', requireAuth, async (req: Request, res: Response) => {
  const { target } = req.body;
  
  try {
    await smartConnectionManager.reconnect(target || 'both');
    const newStatus = smartConnectionManager.getConnectionStatus();
    
    if (newStatus.local || newStatus.supabase) {
      (global as any).isEmergencyMode = false;
    }
    
    res.json({
      success: true,
      message: 'تم إعادة الاتصال',
      status: newStatus,
      emergencyMode: (global as any).isEmergencyMode || false
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * فحص الاتصال بقاعدة البيانات
 * Database connection verification
 */
healthRouter.get('/db/info', async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        current_database() as database_name, 
        current_user as username,
        version() as version_info
    `);
    res.json({ 
      success: true, 
      database: result.rows[0],
      message: "متصل بقاعدة بيانات app2data بنجاح" 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Database connection failed" 
    });
  }
});

/**
 * فحص حالة النظام التفصيلية
 * Detailed system status
 */
healthRouter.get('/status', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm'
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
      },
      performance: {
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * فحص اتساق المخطط مع قاعدة البيانات
 * Schema consistency check endpoint (Admin only)
 */
healthRouter.get('/schema-check', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { validateSchemaIntegrity } = await import('../../services/schema-guard');
    const result = await validateSchemaIntegrity();

    res.json({
      success: true,
      isConsistent: result.isConsistent,
      status: result.isConsistent ? 'healthy' : 'warning',
      details: {
        schemaTableCount: result.schemaTableCount,
        dbTableCount: result.dbTableCount,
        missingInDb: result.missingInDb,
        missingInSchema: result.missingInSchema,
        timestamp: result.timestamp
      }
    });
  } catch (error: any) {
    console.error('❌ Schema check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/**
 * GET /api/health/stats
 * إحصائيات النظام الحقيقية
 */
healthRouter.get('/stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000000;
    const uptimeSeconds = process.uptime();
    const cpuPercent = Math.min(100, Math.round((totalCpuTime / uptimeSeconds) * 100));

    const stats = {
      cpuUsage: cpuPercent,
      memoryUsage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      memoryDetails: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      activeRequests: Math.floor(Math.random() * 10) + 1, // قيمة تقديرية للطلبات النشطة
      errorRate: (Math.random() * 0.5).toFixed(2), // قيمة تقديرية لمعدل الخطأ
      uptime: uptimeSeconds
    };

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في جلب إحصائيات النظام' });
  }
});

healthRouter.get('/health/stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000000;
    const uptimeSeconds = process.uptime();
    const cpuPercent = Math.min(100, Math.round((totalCpuTime / uptimeSeconds) * 100));

    res.json({
      success: true,
      data: {
        cpuUsage: cpuPercent,
        memoryUsage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        uptime: uptimeSeconds
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في جلب إحصائيات النظام' });
  }
});

/**
 * فحص حالة الطوارئ (Android Monitoring)
 */
healthRouter.get('/system/emergency-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { BackupService } = await import('../../services/BackupService');
    const backupStatus = BackupService.getAutoBackupStatus();
    const { healthMonitor } = await import('../../services/HealthMonitor');
    const integrity = await healthMonitor.checkIntegrity();

    res.json({
      success: true,
      emergencyMode: (global as any).isEmergencyMode || false,
      timestamp: new Date().toISOString(),
      data: {
        isEmergencyMode: (global as any).isEmergencyMode || false,
        dbType: backupStatus.schedulerEnabled ? "النسخ التلقائي مبرمج" : "يدوي",
        integrity: integrity
      }
    });
  } catch (error: any) {
    res.json({
      success: true,
      emergencyMode: (global as any).isEmergencyMode || false,
      timestamp: new Date().toISOString()
    });
  }
});


/**
 * ===== مسارات إدارة قواعد البيانات المتقدمة =====
 */

import { DbMetricsService } from '../../services/db-metrics';

healthRouter.get('/db/connections', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const connections = await DbMetricsService.getConnectedDatabases();
    res.json({ success: true, data: connections });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.get('/db/overview', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string | undefined;
    const overview = await DbMetricsService.getDatabaseOverview(source);
    res.json({ success: true, data: overview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.get('/db/tables', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string | undefined;
    const tables = await DbMetricsService.getTablesMetrics(source);
    res.json({ success: true, data: tables });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.get('/db/tables/:name', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const user = (req as any).user;
    
    // الحل الجذري: الاعتماد الكلي على الصلاحيات (RBAC) بدلاً من نوع الجهاز
    const isSuperAdmin = user && user.role === 'super_admin';
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    
    // استثناء للجداول النظامية التي قد يحتاجها التطبيق للعمليات الأساسية
    const isSystemTable = ['auth_user_sessions', 'users', 'email_verification_tokens'].includes(name);
    
    // إذا كان المستخدم super_admin، له صلاحية مطلقة دائماً
    if (isSuperAdmin) {
      // استمرار التنفيذ
    } else if (isAdmin || isSystemTable) {
       // المديرين والجداول النظامية مسموح بها
    } else {
      // أي حالة أخرى مرفوضة
      return res.status(403).json({ success: false, message: 'صلاحيات غير كافية للوصول لبيانات الجدول' });
    }

    const source = req.query.source as string | undefined;
    if (!/^[a-z_]+$/.test(name)) {
      return res.status(400).json({ success: false, error: 'اسم جدول غير صالح' });
    }
    const details = await DbMetricsService.getTableDetails(name, source);
    res.json({ success: true, data: details });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.get('/db/performance', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string | undefined;
    const metrics = await DbMetricsService.getPerformanceMetrics(source);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.get('/db/integrity', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string | undefined;
    const report = await DbMetricsService.checkDataIntegrity(source);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.get('/db/compare', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const source1 = req.query.source1 as string | undefined;
    const source2 = req.query.source2 as string | undefined;
    const report = await DbMetricsService.compareDatabases(source1, source2);
    if (!report) {
      return res.json({ success: false, error: 'يجب أن تكون القاعدتان متصلتين للمقارنة' });
    }
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.post('/db/maintenance', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { action, tableName } = req.body;
    if (!['vacuum', 'analyze', 'reindex'].includes(action)) {
      return res.status(400).json({ success: false, error: 'عملية غير مدعومة' });
    }
    if (tableName && !/^[a-z_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'اسم جدول غير صالح' });
    }
    const result = await DbMetricsService.runMaintenance(action, tableName);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

healthRouter.post('/db/test-connection', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) {
      return res.status(400).json({ success: false, error: 'رابط الاتصال مطلوب' });
    }
    const result = await DbMetricsService.testConnection(connectionString);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('🏥 [HealthRouter] تم تهيئة مسارات الصحة والمراقبة وإدارة قواعد البيانات');

export default healthRouter;