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
        message: "Connected to Supabase app2data successfully" 
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

  app.get("/api/daily-expenses", (req, res) => {
    res.json({ success: true, data: [], message: "Daily expenses endpoint working" });
  });

  app.get("/api/material-purchases", (req, res) => {
    res.json({ success: true, data: [], message: "Material purchases endpoint working" });
  });

  // خدمة النسخ الاحتياطي الآمنة - معلومات الجدول (محمية للإداريين)
  app.get("/api/backup/table/:tableName/info", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      const externalUrl = process.env.OLD_DB_URL || process.env.SUPABASE_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية (Supabase)"
        });
      }

      const fetcher = new SecureDataFetcher(externalUrl);
      const tableInfo = await fetcher.getTableInfo(tableName);
      await fetcher.disconnect();

      res.json({
        success: true,
        data: tableInfo,
        message: `معلومات الجدول ${tableName} من Supabase`
      });
    } catch (error: any) {
      console.error("خطأ في جلب معلومات الجدول من Supabase:", error);
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
      const externalUrl = process.env.OLD_DB_URL || process.env.SUPABASE_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية (Supabase)"
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
        message: `معاينة البيانات من ${tableName} (Supabase)`
      });
    } catch (error: any) {
      console.error("خطأ في معاينة البيانات من Supabase:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // خدمة النسخ الاحتياطي الكاملة من Supabase إلى قاعدة البيانات الجديدة (محمية للإداريين)
  app.post("/api/backup/table/:tableName/backup", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { batchSize = 100 } = req.body;
      const externalUrl = process.env.OLD_DB_URL || process.env.SUPABASE_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية (Supabase)"
        });
      }

      console.log(`🚀 بدء عملية النسخ الاحتياطي للجدول ${tableName} من Supabase...`);

      const fetcher = new SecureDataFetcher(externalUrl);
      const result = await fetcher.syncTableData(tableName, Math.min(batchSize, 200)); // حد أقصى للأمان
      await fetcher.disconnect();

      res.json({
        success: result.success,
        data: result,
        message: `نسخ احتياطي للجدول ${tableName}: ${result.synced} صف تم جلبه من Supabase، ${result.savedLocally} صف تم حفظه محلياً، ${result.errors} أخطاء`
      });
    } catch (error: any) {
      console.error("خطأ في النسخ الاحتياطي:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // قائمة الجداول المتاحة للنسخ الاحتياطي من Supabase (محمية للإداريين)
  app.get("/api/backup/tables", requireAuth, requireRole('admin'), (req, res) => {
    const availableTables = SecureDataFetcher.getAllowedTables();
    
    res.json({
      success: true,
      data: Array.from(availableTables),
      message: "قائمة الجداول المتاحة للنسخ الاحتياطي من Supabase"
    });
  });

  // نسخة احتياطية شاملة لجميع الجداول (محمية للإداريين)
  app.post("/api/backup/full-backup", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { batchSize = 100 } = req.body;
      const externalUrl = process.env.OLD_DB_URL || process.env.SUPABASE_DB_URL;
      
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "لم يتم تكوين اتصال قاعدة البيانات الخارجية (Supabase)"
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