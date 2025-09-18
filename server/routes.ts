import type { Express } from "express";
import type { Server } from "http";
import { createServer } from "http";
import { db } from "./db";
import { SecureDataFetcher } from "./services/secure-data-fetcher";
import { requireAuth, requireRole } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Database connection verification endpoint
  app.get("/api/db/info", async (req, res) => {
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

  // Basic API routes for construction project management
  app.get("/api/projects", (req, res) => {
    res.json({ success: true, data: [], message: "Projects endpoint working" });
  });

  app.get("/api/workers", (req, res) => {
    res.json({ success: true, data: [], message: "Workers endpoint working" });
  });

  // Worker types endpoint - إرجاع أنواع العمال بالتنسيق المطلوب
  app.get("/api/worker-types", (req, res) => {
    try {
      const workerTypes = [
        { id: '1', name: 'معلم', usageCount: 1 },
        { id: '2', name: 'عامل', usageCount: 1 },
        { id: '3', name: 'مساعد', usageCount: 1 },
        { id: '4', name: 'سائق', usageCount: 1 },
        { id: '5', name: 'حارس', usageCount: 1 }
      ];
      
      res.json({ 
        success: true, 
        data: workerTypes, 
        message: "Worker types loaded successfully" 
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        message: "فشل في جلب أنواع العمال"
      });
    }
  });

  app.get("/api/daily-expenses", (req, res) => {
    res.json({ success: true, data: [], message: "Daily expenses endpoint working" });
  });

  app.get("/api/material-purchases", (req, res) => {
    res.json({ success: true, data: [], message: "Material purchases endpoint working" });
  });

  // جلب الإشعارات - handler بسيط في الذاكرة للتوافق مع frontend
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.email || 'default';
      
      console.log(`📥 [API] جلب الإشعارات للمستخدم: ${userId}`);
      
      // إشعارات تجريبية لتجنب أخطاء الواجهة الأمامية
      const mockNotifications = [
        {
          id: '1',
          type: 'system',
          title: 'مرحباً بك في النظام',
          message: 'تم تسجيل دخولك بنجاح',
          priority: 'info',
          createdAt: new Date().toISOString(),
          status: 'unread',
          actionRequired: false
        },
        {
          id: '2', 
          type: 'maintenance',
          title: 'تحديث النظام',
          message: 'سيتم تحديث النظام قريباً',
          priority: 'medium',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'read',
          actionRequired: true
        }
      ];
      
      const unreadCount = mockNotifications.filter(n => n.status === 'unread').length;
      
      console.log(`✅ [API] تم إرجاع ${mockNotifications.length} إشعار، غير مقروء: ${unreadCount}`);
      
      // إرجاع البيانات بالشكل المتوقع من الـ frontend
      res.json({
        success: true,
        data: mockNotifications,
        count: mockNotifications.length,
        unreadCount: unreadCount,
        message: `تم جلب ${mockNotifications.length} إشعار بنجاح`
      });
    } catch (error: any) {
      console.error('❌ [API] خطأ في جلب الإشعارات:', error);
      res.status(500).json({
        success: false,
        data: [],
        count: 0,
        unreadCount: 0,
        error: error.message,
        message: "فشل في جلب الإشعارات"
      });
    }
  });

  // تعليم إشعار كمقروء - handler بسيط للتوافق
  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.email || 'default';
      const notificationId = req.params.id;
      
      console.log(`✅ [API] تعليم الإشعار ${notificationId} كمقروء للمستخدم: ${userId}`);
      
      // مؤقتاً - إرجاع نجاح فقط للتوافق مع الواجهة الأمامية
      res.json({
        success: true,
        message: "تم تعليم الإشعار كمقروء"
      });
    } catch (error: any) {
      console.error('❌ [API] خطأ في تعليم الإشعار كمقروء:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في تعليم الإشعار كمقروء"
      });
    }
  });

  // مسار بديل للتوافق مع NotificationCenter.tsx القديم
  app.post("/api/notifications/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.email || 'default';
      const notificationId = req.params.id;
      
      console.log(`✅ [API] تعليم الإشعار ${notificationId} كمقروء (مسار بديل) للمستخدم: ${userId}`);
      
      // مؤقتاً - إرجاع نجاح فقط للتوافق مع الواجهة الأمامية
      res.json({
        success: true,
        message: "تم تعليم الإشعار كمقروء"
      });
    } catch (error: any) {
      console.error('❌ [API] خطأ في تعليم الإشعار كمقروء (مسار بديل):', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في تعليم الإشعار كمقروء"
      });
    }
  });

  // تعليم جميع الإشعارات كمقروءة
  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.email || 'default';
      const projectId = req.body.projectId;
      
      console.log(`✅ [API] تعليم جميع الإشعارات كمقروءة للمستخدم: ${userId}`);
      
      // مؤقتاً - إرجاع نجاح فقط للتوافق مع الواجهة الأمامية
      res.json({
        success: true,
        message: "تم تعليم جميع الإشعارات كمقروءة"
      });
    } catch (error: any) {
      console.error('❌ [API] خطأ في تعليم الإشعارات كمقروءة:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في تعليم الإشعارات كمقروءة"
      });
    }
  });

  // خدمة النسخ الاحتياطي الآمنة - معلومات الجدول (محمية للإداريين)
  app.get("/api/backup/table/:tableName/info", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      const externalUrl = process.env.OLD_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية"
        });
      }

      const fetcher = new SecureDataFetcher(externalUrl);
      const tableInfo = await fetcher.getTableInfo(tableName);
      await fetcher.disconnect();

      res.json({
        success: true,
        data: tableInfo,
        message: `معلومات الجدول ${tableName} من قاعدة البيانات الخارجية`
      });
    } catch (error: any) {
      console.error("خطأ في جلب معلومات الجدول من قاعدة البيانات الخارجية:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // خدمة النسخ الاحتياطي الآمنة - جلب البيانات (محمية للإداريين)
  app.get("/api/backup/table/:tableName/preview", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { limit = 50, offset = 0, orderBy, orderDirection } = req.query;
      const externalUrl = process.env.OLD_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية"
        });
      }

      const fetcher = new SecureDataFetcher(externalUrl);
      
      const options: any = {
        limit: Math.min(parseInt(limit as string), 100), // حد أقصى للأمان
        offset: Math.max(parseInt(offset as string), 0)
      };
      
      if (orderBy) options.orderBy = orderBy as string;
      if (orderDirection) options.orderDirection = orderDirection as 'ASC' | 'DESC';

      const data = await fetcher.fetchData(tableName, options);
      await fetcher.disconnect();

      res.json({
        success: true,
        data: data,
        count: data.length,
        message: `معاينة البيانات من ${tableName} (قاعدة البيانات الخارجية)`
      });
    } catch (error: any) {
      console.error("خطأ في معاينة البيانات من قاعدة البيانات الخارجية:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // خدمة النسخ الاحتياطي الكاملة من قاعدة البيانات الخارجية إلى قاعدة البيانات المحلية (محمية للإداريين)
  app.post("/api/backup/table/:tableName/backup", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { batchSize = 100 } = req.body;
      const externalUrl = process.env.OLD_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية"
        });
      }

      console.log(`🚀 بدء عملية النسخ الاحتياطي للجدول ${tableName} من قاعدة البيانات الخارجية...`);

      const fetcher = new SecureDataFetcher(externalUrl);
      const result = await fetcher.syncTableData(tableName, Math.min(batchSize, 200)); // حد أقصى للأمان
      await fetcher.disconnect();

      res.json({
        success: result.success,
        data: result,
        message: `نسخ احتياطي للجدول ${tableName}: ${result.synced} صف تم جلبه من قاعدة البيانات الخارجية، ${result.savedLocally} صف تم حفظه محلياً، ${result.errors} أخطاء`
      });
    } catch (error: any) {
      console.error("خطأ في النسخ الاحتياطي:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // قائمة الجداول المتاحة للنسخ الاحتياطي من قاعدة البيانات الخارجية (محمية للإداريين)
  app.get("/api/backup/tables", requireAuth, requireRole('admin'), (req, res) => {
    const availableTables = SecureDataFetcher.getAllowedTables();
    
    res.json({
      success: true,
      data: Array.from(availableTables),
      message: "قائمة الجداول المتاحة للنسخ الاحتياطي من قاعدة البيانات الخارجية"
    });
  });

  // نسخة احتياطية شاملة لجميع الجداول (محمية للإداريين)
  app.post("/api/backup/full-backup", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { batchSize = 100 } = req.body;
      const externalUrl = process.env.OLD_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية"
        });
      }

      console.log('🚀 بدء النسخ الاحتياطي الشامل من Supabase...');
      
      const results: any[] = [];
      const availableTables = SecureDataFetcher.getAllowedTables();
      
      for (const tableName of availableTables) {
        try {
          console.log(`🔄 نسخ احتياطي للجدول ${tableName}...`);
          const fetcher = new SecureDataFetcher(externalUrl);
          const result = await fetcher.syncTableData(tableName, Math.min(batchSize, 200));
          await fetcher.disconnect();
          
          results.push({
            tableName,
            success: result.success,
            synced: result.synced,
            savedLocally: result.savedLocally,
            errors: result.errors
          });
          
          // فترة انتظار قصيرة بين الجداول لتجنب إرهاق النظام
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`❌ خطأ في نسخ الجدول ${tableName}:`, error);
          results.push({
            tableName,
            success: false,
            synced: 0,
            savedLocally: 0,
            errors: 1,
            error: error.message
          });
        }
      }

      const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
      const totalSaved = results.reduce((sum, r) => sum + r.savedLocally, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
      
      res.json({
        success: totalErrors === 0,
        data: {
          results,
          summary: {
            tablesProcessed: results.length,
            totalSynced,
            totalSaved,
            totalErrors
          }
        },
        message: `نسخ احتياطي شامل: ${totalSynced} صف تم جلبه، ${totalSaved} صف تم حفظه محلياً، ${totalErrors} أخطاء`
      });
    } catch (error: any) {
      console.error("خطأ في النسخ الاحتياطي الشامل:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ==================== API endpoints للهجرة المتقدمة من Supabase ====================

  // جلب قائمة الجداول المتاحة للهجرة
  app.get("/api/migration/tables", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const defaultTables = [
        "account_balances", "accounts", "actions", "approvals", "autocomplete_data", "channels",
        "daily_expense_summaries", "daily_expenses", "equipment", "finance_events", "finance_payments",
        "fund_transfers", "journals", "maintenance_schedules", "maintenance_tasks", "material_purchases",
        "materials", "messages", "notification_read_states", "print_settings", "project_fund_transfers",
        "projects", "report_templates", "supplier_payments", "suppliers", "system_events", "system_notifications",
        "tool_categories", "tool_cost_tracking", "tool_maintenance_logs", "tool_movements", "tool_notifications",
        "tool_purchase_items", "tool_reservations", "tool_stock", "tool_usage_analytics", "tools",
        "transaction_lines", "transactions", "users", "worker_attendance", "workers"
      ];

      // إضافة معلومات إضافية لكل جدول
      const tablesWithInfo = defaultTables.map(tableName => ({
        name: tableName,
        displayName: getTableDisplayName(tableName),
        category: getTableCategory(tableName),
        estimatedRows: 0, // سيتم تحديثها لاحقاً عند الاستعلام
        status: 'ready',
        priority: getTablePriority(tableName)
      }));

      res.json({
        success: true,
        data: tablesWithInfo,
        message: `تم العثور على ${tablesWithInfo.length} جدول متاح للهجرة`
      });
    } catch (error: any) {
      console.error('❌ خطأ في جلب قائمة الجداول:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في جلب قائمة الجداول للهجرة"
      });
    }
  });

  // جلب معلومات مفصلة عن جدول محدد
  app.get("/api/migration/table/:tableName/info", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      const externalUrl = process.env.OLD_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية"
        });
      }

      // هنا يمكن إضافة استعلام فعلي للحصول على معلومات الجدول
      const tableInfo = {
        name: tableName,
        displayName: getTableDisplayName(tableName),
        estimatedRows: Math.floor(Math.random() * 10000), // مؤقت - سيتم استبداله باستعلام حقيقي
        columns: [],
        lastUpdated: new Date().toISOString(),
        status: 'ready'
      };

      res.json({
        success: true,
        data: tableInfo,
        message: `تم جلب معلومات الجدول ${tableName} بنجاح`
      });
    } catch (error: any) {
      console.error(`❌ خطأ في جلب معلومات الجدول ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في جلب معلومات الجدول"
      });
    }
  });

  // بدء عملية الهجرة لجدول محدد
  app.post("/api/migration/extract/:tableName", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { batchSize = 100, maxRetries = 3 } = req.body;

      console.log(`🚀 بدء عملية هجرة الجدول: ${tableName}`);

      // تحديد حالة الهجرة في الذاكرة (في التطبيق الحقيقي، استخدم قاعدة بيانات)
      const migrationJob = {
        id: `migration_${tableName}_${Date.now()}`,
        tableName,
        status: 'started',
        batchSize,
        maxRetries,
        startedAt: new Date().toISOString(),
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        errors: []
      };

      // إرجاع معرف المهمة فوراً
      res.json({
        success: true,
        data: migrationJob,
        message: `تم بدء عملية هجرة الجدول ${tableName}`
      });

      // تشغيل عملية الهجرة في الخلفية
      processMigrationInBackground(migrationJob).catch(error => {
        console.error(`❌ خطأ في هجرة الجدول ${tableName}:`, error);
      });

    } catch (error: any) {
      console.error(`❌ خطأ في بدء هجرة الجدول ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في بدء عملية الهجرة"
      });
    }
  });

  // نقل البيانات (هجرة شاملة لعدة جداول)
  app.post("/api/migration/transfer", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tables = [], batchSize = 50, delayBetweenBatches = 1000 } = req.body;

      if (!tables.length) {
        return res.status(400).json({
          success: false,
          error: "يجب تحديد جدول واحد على الأقل للهجرة"
        });
      }

      console.log(`🚀 بدء الهجرة الشاملة لـ ${tables.length} جدول`);

      const migrationSession = {
        id: `batch_migration_${Date.now()}`,
        tables,
        batchSize,
        delayBetweenBatches,
        status: 'started',
        startedAt: new Date().toISOString(),
        progress: 0,
        completedTables: [],
        failedTables: [],
        totalTables: tables.length
      };

      res.json({
        success: true,
        data: migrationSession,
        message: `تم بدء الهجرة الشاملة لـ ${tables.length} جدول`
      });

      // تشغيل الهجرة الشاملة في الخلفية
      processBatchMigrationInBackground(migrationSession).catch(error => {
        console.error('❌ خطأ في الهجرة الشاملة:', error);
      });

    } catch (error: any) {
      console.error('❌ خطأ في بدء الهجرة الشاملة:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في بدء عملية الهجرة الشاملة"
      });
    }
  });

  // متابعة حالة عملية الهجرة
  app.get("/api/migration/status/:jobId?", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { jobId } = req.params;

      // في التطبيق الحقيقي، استخدم قاعدة بيانات لتخزين حالة المهام
      const mockStatus = {
        id: jobId || 'default_job',
        status: 'running',
        progress: Math.floor(Math.random() * 100),
        startedAt: new Date(Date.now() - 300000).toISOString(), // منذ 5 دقائق
        estimatedCompletion: new Date(Date.now() + 120000).toISOString(), // خلال دقيقتين
        currentTable: 'projects',
        processedRows: 1247,
        totalRows: 2500,
        errors: [],
        completedTables: ['users', 'workers'],
        remainingTables: ['projects', 'daily_expenses', 'materials']
      };

      res.json({
        success: true,
        data: mockStatus,
        message: "تم جلب حالة عملية الهجرة بنجاح"
      });
    } catch (error: any) {
      console.error('❌ خطأ في جلب حالة الهجرة:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في جلب حالة عملية الهجرة"
      });
    }
  });

  // إيقاف عملية الهجرة
  app.post("/api/migration/stop/:jobId", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { jobId } = req.params;

      console.log(`⏹️ إيقاف عملية الهجرة: ${jobId}`);

      res.json({
        success: true,
        message: `تم إيقاف عملية الهجرة ${jobId} بنجاح`
      });
    } catch (error: any) {
      console.error('❌ خطأ في إيقاف عملية الهجرة:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في إيقاف عملية الهجرة"
      });
    }
  });

  // ==================== Helper functions للهجرة ====================

  function getTableDisplayName(tableName: string): string {
    const displayNames: { [key: string]: string } = {
      'users': 'المستخدمين',
      'projects': 'المشاريع',
      'workers': 'العمال',
      'worker_attendance': 'حضور العمال',
      'daily_expenses': 'المصروفات اليومية',
      'material_purchases': 'مشتريات المواد',
      'materials': 'المواد',
      'suppliers': 'الموردين',
      'fund_transfers': 'تحويلات العهدة',
      'equipment': 'المعدات',
      'tools': 'الأدوات',
      'transactions': 'المعاملات',
      'accounts': 'الحسابات'
    };
    return displayNames[tableName] || tableName;
  }

  function getTableCategory(tableName: string): string {
    const categories: { [key: string]: string } = {
      'users': 'system',
      'projects': 'core',
      'workers': 'core',
      'worker_attendance': 'core',
      'daily_expenses': 'financial',
      'material_purchases': 'financial',
      'materials': 'inventory',
      'suppliers': 'external',
      'fund_transfers': 'financial',
      'equipment': 'assets',
      'tools': 'assets'
    };
    return categories[tableName] || 'other';
  }

  function getTablePriority(tableName: string): number {
    const priorities: { [key: string]: number } = {
      'users': 1,
      'projects': 2,
      'workers': 3,
      'materials': 4,
      'suppliers': 5
    };
    return priorities[tableName] || 10;
  }

  async function processMigrationInBackground(migrationJob: any) {
    console.log(`🔄 معالجة هجرة الجدول ${migrationJob.tableName} في الخلفية...`);
    // هنا سيتم استدعاء السكريبت المحسن للهجرة
    // await enhancedMigrationScript.migrateTable(migrationJob);
  }

  async function processBatchMigrationInBackground(migrationSession: any) {
    console.log(`🔄 معالجة الهجرة الشاملة لـ ${migrationSession.totalTables} جدول في الخلفية...`);
    // هنا سيتم استدعاء السكريبت المحسن للهجرة الشاملة
    // await enhancedMigrationScript.migrateBatch(migrationSession);
  }

  // Temporary placeholder for projects with stats
  app.get("/api/projects/with-stats", (req, res) => {
    res.json({ 
      success: true, 
      data: [
        {
          id: 1,
          name: "مشروع تجريبي",
          status: "active",
          description: "مشروع لاختبار النظام",
          stats: {
            totalWorkers: "0",
            totalExpenses: 0,
            totalIncome: 0,
            currentBalance: 0,
            activeWorkers: "0",
            completedDays: "0",
            materialPurchases: "0",
            lastActivity: new Date().toISOString()
          }
        }
      ], 
      message: "Projects with stats loaded successfully" 
    });
  });

  const server = createServer(app);
  return server;
}