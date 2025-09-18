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