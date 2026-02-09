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
healthRouter.get('/data-health', async (req: Request, res: Response) => {
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
healthRouter.get('/health/integrity', async (req: Request, res: Response) => {
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
healthRouter.get('/health/connections', async (req: Request, res: Response) => {
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
    // Assuming db is already imported and available globally or passed correctly
    // If not, you might need to import it here as well:
    // const { db } = await import('../../db.js');
    // const { sql } = await import('drizzle-orm'); // If using drizzle-orm

    // Mocking sql function if drizzle-orm is not used or available
    const sql = (query: TemplateStringsArray) => query.join('');

    // Get tables from database
    const dbTablesResult = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const dbTables = dbTablesResult.rows.map((row: any) => row.table_name);

    // Expected tables from schema
    const expectedTables = [
      'users', 'auth_user_sessions', 'email_verification_tokens', 'password_reset_tokens',
      'projects', 'workers', 'fund_transfers', 'worker_attendance', 'suppliers', 'materials',
      'material_purchases', 'supplier_payments', 'transportation_expenses', 'worker_transfers',
      'worker_balances', 'daily_expense_summaries', 'worker_types', 'autocomplete_data',
      'worker_misc_expenses', 'print_settings', 'project_fund_transfers', 'notifications'
    ];

    const missingTables = expectedTables.filter((table: string) => !dbTables.includes(table));
    const extraTables = dbTables.filter((table: string) => 
      !expectedTables.includes(table) && 
      !table.startsWith('drizzle') &&
      !table.startsWith('pg_')
    );

    const isConsistent = missingTables.length === 0 && extraTables.length === 0;

    res.json({
      success: true,
      isConsistent,
      status: isConsistent ? 'healthy' : 'warning',
      details: {
        totalTables: dbTables.length,
        expectedTables: expectedTables.length,
        missingTables,
        extraTables,
        timestamp: new Date().toISOString()
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
 * جلب إحصائيات النظام لمحاكاة بيانات SigNoz/Prometheus
 */
healthRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    // محاكاة بيانات المراقبة - في الإنتاج سيتم جلبها من SigNoz API
    const stats = {
      cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
      memoryUsage: Math.floor(Math.random() * 40) + 20, // 20-60%
      activeRequests: Math.floor(Math.random() * 50) + 5,
      errorRate: (Math.random() * 2).toFixed(2), // 0-2%
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات النظام'
    });
  }
});

// Alias for compatibility if needed
healthRouter.get('/health/stats', async (_req: Request, res: Response) => {
  try {
    const stats = {
      cpuUsage: Math.floor(Math.random() * 30) + 10,
      memoryUsage: Math.floor(Math.random() * 40) + 20,
      activeRequests: Math.floor(Math.random() * 50) + 5,
      errorRate: (Math.random() * 2).toFixed(2),
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات النظام'
    });
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
        dbType: backupStatus.enabled ? "النسخ التلقائي مبرمج" : "يدوي",
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


console.log('🏥 [HealthRouter] تم تهيئة مسارات الصحة والمراقبة');

export default healthRouter;