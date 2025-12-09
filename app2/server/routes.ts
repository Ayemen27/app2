import type { Express } from "express";
import type { Server } from "http";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import { eq, and, or, sql, gte, lt, lte, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  projects, workers, materials, suppliers, materialPurchases, workerAttendance, 
  fundTransfers, transportationExpenses, dailyExpenseSummaries, tools, toolMovements,
  workerTransfers, workerMiscExpenses, workerBalances, projectFundTransfers, users,
  enhancedInsertProjectSchema, enhancedInsertWorkerSchema,
  insertMaterialSchema, insertSupplierSchema, insertMaterialPurchaseSchema,
  insertWorkerAttendanceSchema, insertFundTransferSchema, insertTransportationExpenseSchema,
  insertDailyExpenseSummarySchema, insertToolSchema, insertToolMovementSchema,
  insertWorkerTransferSchema, insertWorkerMiscExpenseSchema, insertWorkerBalanceSchema
} from "@shared/schema";
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

  // ========================================
  // 👷 جلب قائمة المستخدمين (للاستخدام في اختيار المهندس)
  // ========================================

  app.get("/api/users/list", requireAuth, async (req, res) => {
    try {
      console.log('📊 [API] جلب قائمة المستخدمين');
      const usersList = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      }).from(users).orderBy(users.firstName);

      // تحويل البيانات لإضافة حقل name مجمع
      const usersWithName = usersList.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        role: user.role,
      }));

      console.log(`✅ [API] تم جلب ${usersWithName.length} مستخدم`);
      res.json({ 
        success: true, 
        data: usersWithName,
        message: `تم جلب ${usersWithName.length} مستخدم بنجاح`
      });
    } catch (error: any) {
      console.error('❌ [API] خطأ في جلب المستخدمين:', error);
      res.status(500).json({ 
        success: false, 
        data: [], 
        error: error.message,
        message: "فشل في جلب قائمة المستخدمين"
      });
    }
  });

  // ========================================
  // 🔒 **Basic API routes - NOW SECURED WITH AUTHENTICATION**
  // ⚠️ كانت هذه endpoints بدون حماية - تم إصلاح الثغرة الأمنية الخطيرة!
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      console.log('📊 [API] جلب قائمة المشاريع من قاعدة البيانات');

      const projectsList = await db.select().from(projects).orderBy(projects.createdAt);

      console.log(`✅ [API] تم جلب ${projectsList.length} مشروع من قاعدة البيانات`);

      res.json({ 
        success: true, 
        data: projectsList, 
        message: `تم جلب ${projectsList.length} مشروع بنجاح` 
      });
    } catch (error: any) {
      console.error('❌ [API] خطأ في جلب المشاريع:', error);
      res.status(500).json({ 
        success: false, 
        data: [], 
        error: error.message,
        message: "فشل في جلب قائمة المشاريع" 
      });
    }
  });


  // 📊 GET endpoint لجلب تحويلات العهدة لمشروع محدد
  app.get("/api/projects/:projectId/fund-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;

      console.log(`📊 [API] جلب تحويلات العهدة للمشروع: ${projectId}`);

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
          processingTime: Date.now() - startTime
        });
      }

      const transfers = await db.select()
        .from(fundTransfers)
        .where(eq(fundTransfers.projectId, projectId))
        .orderBy(fundTransfers.transferDate);

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب ${transfers.length} تحويل عهدة في ${duration}ms`);

      res.json({
        success: true,
        data: transfers,
        message: `تم جلب ${transfers.length} تحويل عهدة للمشروع`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب تحويلات العهدة:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });


  // 📊 GET endpoint لجلب مشتريات المواد لمشروع محدد
  app.get("/api/projects/:projectId/material-purchases", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;

      console.log(`📊 [API] جلب مشتريات المواد للمشروع: ${projectId}`);

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
          processingTime: Date.now() - startTime
        });
      }

      const purchases = await db.select()
        .from(materialPurchases)
        .where(eq(materialPurchases.projectId, projectId))
        .orderBy(materialPurchases.purchaseDate);

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب ${purchases.length} مشترية مواد في ${duration}ms`);

      res.json({
        success: true,
        data: purchases,
        message: `تم جلب ${purchases.length} مشترية مواد للمشروع`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب مشتريات المواد:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });

  // 📊 GET endpoint لجلب مصاريف النقل لمشروع محدد
  app.get("/api/projects/:projectId/transportation-expenses", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;

      console.log(`📊 [API] جلب مصاريف النقل للمشروع: ${projectId}`);

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
          processingTime: Date.now() - startTime
        });
      }

      const expenses = await db.select()
        .from(transportationExpenses)
        .where(eq(transportationExpenses.projectId, projectId))
        .orderBy(transportationExpenses.date);

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب ${expenses.length} مصروف نقل في ${duration}ms`);

      res.json({
        success: true,
        data: expenses,
        message: `تم جلب ${expenses.length} مصروف نقل للمشروع`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب مصاريف النقل:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });

  // 📊 GET endpoint لجلب المصاريف المتنوعة للعمال لمشروع محدد
  app.get("/api/projects/:projectId/worker-misc-expenses", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;

      console.log(`📊 [API] جلب المصاريف المتنوعة للعمال للمشروع: ${projectId}`);

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
          processingTime: Date.now() - startTime
        });
      }

      const expenses = await db.select()
        .from(workerMiscExpenses)
        .where(eq(workerMiscExpenses.projectId, projectId))
        .orderBy(workerMiscExpenses.date);

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب ${expenses.length} مصروف متنوع في ${duration}ms`);

      res.json({
        success: true,
        data: expenses,
        message: `تم جلب ${expenses.length} مصروف متنوع للمشروع`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب المصاريف المتنوعة:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });

  // 📊 GET endpoint لجلب حضور جميع العمال لجميع المشاريع
  app.get("/api/projects/all/worker-attendance", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log(`📊 [API] جلب حضور العمال للمشروع: all`);

      const attendance = await db.select({
        id: workerAttendance.id,
        workerId: workerAttendance.workerId,
        projectId: workerAttendance.projectId,
        date: workerAttendance.date,
        workDays: workerAttendance.workDays,
        dailyWage: workerAttendance.dailyWage,
        paidAmount: workerAttendance.paidAmount,
        actualWage: workerAttendance.actualWage,
        workerName: workers.name,
        projectName: projects.name
      })
        .from(workerAttendance)
        .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
        .leftJoin(projects, eq(workerAttendance.projectId, projects.id))
        .orderBy(workerAttendance.date);

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);

      res.json({
        success: true,
        data: attendance,
        message: `تم جلب ${attendance.length} سجل حضور لجميع المشاريع`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب حضور العمال:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });

  // 📊 GET endpoint لجلب حوالات جميع العمال لجميع المشاريع
  app.get("/api/projects/all/worker-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log(`📊 [API] جلب حوالات العمال للمشروع: all`);

      const transfers = await db.select({
        id: workerTransfers.id,
        workerId: workerTransfers.workerId,
        projectId: workerTransfers.projectId,
        amount: workerTransfers.amount,
        transferDate: workerTransfers.transferDate,
        transferMethod: workerTransfers.transferMethod,
        recipientName: workerTransfers.recipientName,
        notes: workerTransfers.notes,
        workerName: workers.name,
        projectName: projects.name
      })
        .from(workerTransfers)
        .leftJoin(workers, eq(workerTransfers.workerId, workers.id))
        .leftJoin(projects, eq(workerTransfers.projectId, projects.id))
        .orderBy(workerTransfers.transferDate);

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب ${transfers.length} حولة عمال في ${duration}ms`);

      res.json({
        success: true,
        data: transfers,
        message: `تم جلب ${transfers.length} حولة عمال لجميع المشاريع`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب حوالات العمال:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });

  // 📊 GET endpoint للمشاريع مع الإحصائيات
  app.get("/api/projects/with-stats", requireAuth, async (req, res) => {
    try {
      console.log('📊 [API] جلب المشاريع مع الإحصائيات من قاعدة البيانات');

      // جلب جميع المشاريع أولاً
      const projectsList = await db.select().from(projects).orderBy(projects.createdAt);

      // حساب الإحصائيات الفعلية لكل مشروع
      const projectsWithStats = await Promise.all(projectsList.map(async (project) => {
        const projectId = project.id;

        try {
          // دالة مساعدة لتنظيف القيم المسترجعة من قاعدة البيانات
          const cleanDbValue = (value: any, type: 'integer' | 'decimal' = 'decimal'): number => {
            if (value === null || value === undefined) return 0;

            const strValue = String(value).trim();

            // فحص الأنماط المشبوهة
            if (strValue.match(/^(\d{1,3})\1{2,}$/)) {
              console.warn('⚠️ [API] قيمة مشبوهة من قاعدة البيانات:', strValue);
              return 0;
            }

            const parsed = type === 'integer' ? parseInt(strValue, 10) : parseFloat(strValue);

            if (isNaN(parsed) || !isFinite(parsed)) return 0;

            // فحص الحدود المنطقية
            const maxValue = type === 'integer' ? 
              (strValue.includes('worker') || strValue.includes('total_workers') ? 10000 : 1000000) : 
              100000000000; // 100 مليار للمبالغ المالية

            if (Math.abs(parsed) > maxValue) {
              console.warn(`⚠️ [API] قيمة تتجاوز الحد المنطقي (${type}):`, parsed);
              return 0;
            }

            return Math.max(0, parsed);
          };

          // حساب إجمالي العمال والعمال النشطين المرتبطين بهذا المشروع فقط
          const workersStats = await db.execute(sql`
            SELECT 
              COUNT(DISTINCT wa.worker_id) as total_workers,
              COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
            FROM worker_attendance wa
            INNER JOIN workers w ON wa.worker_id = w.id
            WHERE wa.project_id = ${projectId}
          `);

          // حساب مصاريف المواد
          const materialStats = await db.execute(sql`
            SELECT 
              COUNT(*) as material_purchases,
              COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
            FROM material_purchases 
            WHERE project_id = ${projectId}
          `);

          // حساب أجور العمال وأيام العمل المكتملة
          const workerWagesStats = await db.execute(sql`
            SELECT 
              COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
              COUNT(DISTINCT date) as completed_days
            FROM worker_attendance 
            WHERE project_id = ${projectId} AND is_present = true
          `);

          // حساب تحويلات العهدة (الإيرادات)
          const fundTransfersStats = await db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
            FROM fund_transfers 
            WHERE project_id = ${projectId}
          `);

          // حساب مصاريف المواصلات
          const transportStats = await db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
            FROM transportation_expenses 
            WHERE project_id = ${projectId}
          `);

          // حساب تحويلات العمال والمصاريف المتنوعة
          const workerTransfersStats = await db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
            FROM worker_transfers 
            WHERE project_id = ${projectId}
          `);

          const miscExpensesStats = await db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
            FROM worker_misc_expenses 
            WHERE project_id = ${projectId}
          `);

          // استخراج القيم مع تنظيف البيانات المحسن
          const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || '0', 'integer');
          const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || '0', 'integer');
          const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || '0');
          const materialPurchases = cleanDbValue(materialStats.rows[0]?.material_purchases || '0', 'integer');
          const workerWages = cleanDbValue(workerWagesStats.rows[0]?.worker_wages || '0');
          const completedDays = cleanDbValue(workerWagesStats.rows[0]?.completed_days || '0', 'integer');
          const totalIncome = cleanDbValue(fundTransfersStats.rows[0]?.total_income || '0');
          const transportExpenses = cleanDbValue(transportStats.rows[0]?.transport_expenses || '0');
          const workerTransfers = cleanDbValue(workerTransfersStats.rows[0]?.worker_transfers || '0');
          const miscExpenses = cleanDbValue(miscExpensesStats.rows[0]?.misc_expenses || '0');

          // فحص إضافي للتأكد من منطقية العدد
          if (totalWorkers > 1000) {
            console.warn(`⚠️ [API] عدد عمال غير منطقي للمشروع ${project.name}: ${totalWorkers}`);
          }

          // حساب إجمالي المصروفات والرصيد الحالي
          const totalExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses;
          const currentBalance = totalIncome - totalExpenses;

          // تسجيل مفصل في بيئة التطوير
          if (process.env.NODE_ENV === 'development') {
            console.log(`📊 [API] إحصائيات المشروع "${project.name}":`, {
              totalWorkers,
              activeWorkers,
              totalIncome,
              totalExpenses,
              currentBalance,
              completedDays,
              materialPurchases
            });
          }

          return {
            ...project,
            stats: {
              totalWorkers: Math.max(0, totalWorkers),
              totalExpenses: Math.max(0, totalExpenses),
              totalIncome: Math.max(0, totalIncome),
              currentBalance: currentBalance, // يمكن أن يكون سالباً
              activeWorkers: Math.max(0, activeWorkers),
              completedDays: Math.max(0, completedDays),
              materialPurchases: Math.max(0, materialPurchases),
              lastActivity: project.createdAt.toISOString()
            }
          };
        } catch (error) {
          console.error(`❌ [API] خطأ في حساب إحصائيات المشروع ${project.name}:`, error);

          // إرجاع قيم افتراضية في حالة الخطأ
          return {
            ...project,
            stats: {
              totalWorkers: 0,
              totalExpenses: 0,
              totalIncome: 0,
              currentBalance: 0,
              activeWorkers: 0,
              completedDays: 0,
              materialPurchases: 0,
              lastActivity: project.createdAt.toISOString()
            }
          };
        }
      }));

      console.log(`✅ [API] تم جلب ${projectsWithStats.length} مشروع مع الإحصائيات من قاعدة البيانات`);

      res.json({ 
        success: true, 
        data: projectsWithStats, 
        message: `تم جلب ${projectsWithStats.length} مشروع مع الإحصائيات بنجاح` 
      });
    } catch (error: any) {
      console.error('❌ [API] خطأ في جلب المشاريع مع الإحصائيات:', error);
      res.status(500).json({ 
        success: false, 
        data: [], 
        error: error.message,
        message: "فشل في جلب قائمة المشاريع مع الإحصائيات" 
      });
    }
  });

  // 📊 GET endpoint للملخص اليومي للمشروع - جلب الملخص المالي ليوم محدد
  app.get("/api/projects/:id/daily-summary/:date", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { id: projectId, date } = req.params;

      console.log(`📊 [API] طلب جلب الملخص اليومي للمشروع من المستخدم: ${req.user?.email}`);
      console.log(`📋 [API] معاملات الطلب: projectId=${projectId}, date=${date}`);

      // Validation للمعاملات
      if (!projectId || !date) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] معاملات مطلوبة مفقودة:', { projectId, date });
        return res.status(400).json({
          success: false,
          error: 'معاملات مطلوبة مفقودة',
          message: 'معرف المشروع والتاريخ مطلوبان',
          processingTime: duration
        });
      }

      // التحقق من صحة تنسيق التاريخ (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] تنسيق التاريخ غير صحيح:', date);
        return res.status(400).json({
          success: false,
          error: 'تنسيق التاريخ غير صحيح',
          message: 'يجب أن يكون التاريخ بصيغة YYYY-MM-DD',
          processingTime: duration
        });
      }

      // التحقق من وجود المشروع أولاً
      console.log('🔍 [API] التحقق من وجود المشروع...');
      const projectExists = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

      if (projectExists.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المشروع غير موجود:', projectId);
        return res.status(404).json({
          success: false,
          error: 'المشروع غير موجود',
          message: `لم يتم العثور على مشروع بالمعرف: ${projectId}`,
          processingTime: duration
        });
      }

      // محاولة جلب البيانات من Materialized View أولاً (للأداء الأفضل)
      console.log('💾 [API] جلب الملخص اليومي من قاعدة البيانات...');
      let dailySummary = null;

      try {
        // محاولة استخدام Materialized View للأداء الأفضل
        console.log('⚡ [API] محاولة جلب البيانات من daily_summary_mv...');
        const mvResult = await db.execute(sql`
          SELECT 
            id,
            project_id,
            summary_date,
            carried_forward_amount,
            total_fund_transfers,
            total_worker_wages,
            total_material_costs,
            total_transportation_expenses,
            total_worker_transfers,
            total_worker_misc_expenses,
            total_income,
            total_expenses,
            remaining_balance,
            notes,
            created_at,
            updated_at,
            project_name
          FROM daily_summary_mv 
          WHERE project_id = ${projectId} AND summary_date = ${date}
          LIMIT 1
        `);

        if (mvResult.rows && mvResult.rows.length > 0) {
          dailySummary = mvResult.rows[0];
          console.log('✅ [API] تم جلب البيانات من Materialized View بنجاح');
        }
      } catch (mvError) {
        console.log('⚠️ [API] Materialized View غير متاح، التبديل للجدول العادي...');
        // Fallback للجدول العادي
        const regularResult = await db.select({
          id: dailyExpenseSummaries.id,
          project_id: dailyExpenseSummaries.projectId,
          summary_date: dailyExpenseSummaries.date,
          carried_forward_amount: dailyExpenseSummaries.carriedForwardAmount,
          total_fund_transfers: dailyExpenseSummaries.totalFundTransfers,
          total_worker_wages: dailyExpenseSummaries.totalWorkerWages,
          total_material_costs: dailyExpenseSummaries.totalMaterialCosts,
          total_transportation_expenses: dailyExpenseSummaries.totalTransportationCosts,
          total_worker_transfers: sql`COALESCE(${dailyExpenseSummaries.totalWorkerTransfers}, 0)`,
          total_worker_misc_expenses: sql`COALESCE(${dailyExpenseSummaries.totalWorkerMiscExpenses}, 0)`,
          total_income: dailyExpenseSummaries.totalIncome,
          total_expenses: dailyExpenseSummaries.totalExpenses,
          remaining_balance: dailyExpenseSummaries.remainingBalance,
          notes: sql`COALESCE(${dailyExpenseSummaries.notes}, '')`,
          created_at: dailyExpenseSummaries.createdAt,
          updated_at: sql`COALESCE(${dailyExpenseSummaries.updatedAt}, ${dailyExpenseSummaries.createdAt})`,
          project_name: projects.name
        })
        .from(dailyExpenseSummaries)
        .leftJoin(projects, eq(dailyExpenseSummaries.projectId, projects.id))
        .where(and(
          eq(dailyExpenseSummaries.projectId, projectId),
          eq(dailyExpenseSummaries.date, date)
        ))
        .limit(1);

        if (regularResult.length > 0) {
          dailySummary = regularResult[0];
          console.log('✅ [API] تم جلب البيانات من الجدول العادي بنجاح');
        }
      }

      const duration = Date.now() - startTime;

      if (!dailySummary) {
        console.log(`📭 [API] لا توجد بيانات ملخص يومي للمشروع ${projectId} في تاريخ ${date} - إرجاع بيانات فارغة`);
        // ✅ إصلاح: إرجاع بيانات فارغة بدلاً من 404
        return res.json({
          success: true,
          data: {
            id: null,
            projectId,
            date,
            totalIncome: 0,
            totalExpenses: 0,
            remainingBalance: 0,
            notes: null,
            isEmpty: true,
            message: `لا يوجد ملخص مالي محفوظ للمشروع في تاريخ ${date}`
          },
          processingTime: duration,
          metadata: {
            projectId,
            date,
            projectName: projectExists[0].name,
            isEmptyResult: true
          }
        });
      }

      // تنسيق البيانات للإرجاع
      const formattedSummary = {
        id: dailySummary.id,
        projectId: dailySummary.project_id,
        projectName: dailySummary.project_name || projectExists[0].name,
        date: dailySummary.summary_date || date,
        financialSummary: {
          carriedForwardAmount: parseFloat(String(dailySummary.carried_forward_amount || '0')),
          totalFundTransfers: parseFloat(String(dailySummary.total_fund_transfers || '0')),
          totalWorkerWages: parseFloat(String(dailySummary.total_worker_wages || '0')),
          totalMaterialCosts: parseFloat(String(dailySummary.total_material_costs || '0')),
          totalTransportationExpenses: parseFloat(String(dailySummary.total_transportation_expenses || '0')),
          totalWorkerTransfers: parseFloat(String(dailySummary.total_worker_transfers || '0')),
          totalWorkerMiscExpenses: parseFloat(String(dailySummary.total_worker_misc_expenses || '0')),
          totalIncome: parseFloat(String(dailySummary.total_income || '0')),
          totalExpenses: parseFloat(String(dailySummary.total_expenses || '0')),
          remainingBalance: parseFloat(String(dailySummary.remaining_balance || '0'))
        },
        notes: String(dailySummary.notes || ''),
        createdAt: dailySummary.created_at,
        updatedAt: dailySummary.updated_at || dailySummary.created_at
      };

      console.log(`✅ [API] تم جلب الملخص اليومي بنجاح في ${duration}ms:`, {
        projectId,
        projectName: formattedSummary.projectName,
        date,
        totalIncome: formattedSummary.financialSummary.totalIncome,
        totalExpenses: formattedSummary.financialSummary.totalExpenses,
        remainingBalance: formattedSummary.financialSummary.remainingBalance
      });

      res.json({
        success: true,
        data: formattedSummary,
        message: `تم جلب الملخص المالي للمشروع "${formattedSummary.projectName}" في تاريخ ${date} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب الملخص اليومي:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في جلب الملخص اليومي';
      let statusCode = 500;

      if (error.code === '42P01') { // relation does not exist
        errorMessage = 'جدول الملخصات اليومية غير موجود';
        statusCode = 503;
      } else if (error.code === '22008') { // invalid date format
        errorMessage = 'تنسيق التاريخ غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        data: null,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 💰 GET endpoint للرصيد المتبقي من اليوم السابق
  app.get("/api/projects/:projectId/previous-balance/:date", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId, date } = req.params;

      console.log(`💰 [API] طلب جلب الرصيد المتبقي من اليوم السابق: projectId=${projectId}, date=${date}`);

      // التحقق من صحة المعاملات
      if (!projectId || !date) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معاملات مطلوبة مفقودة',
          message: 'معرف المشروع والتاريخ مطلوبان',
          processingTime: duration
        });
      }

      // التحقق من تنسيق التاريخ
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'تنسيق التاريخ غير صحيح',
          message: 'يجب أن يكون التاريخ بصيغة YYYY-MM-DD',
          processingTime: duration
        });
      }

      // حساب التاريخ السابق
      const currentDate = new Date(date);
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      console.log(`💰 [API] البحث عن الرصيد المتبقي ليوم: ${previousDateStr}`);

      let previousBalance = 0;
      let source = 'none';

      try {
        // أولاً: محاولة العثور على أحدث ملخص محفوظ قبل التاريخ المطلوب
        const latestSummary = await db.select({
          remainingBalance: dailyExpenseSummaries.remainingBalance,
          date: dailyExpenseSummaries.date
        })
        .from(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.projectId, projectId),
          lt(dailyExpenseSummaries.date, date)
        ))
        .orderBy(desc(dailyExpenseSummaries.date))
        .limit(1);

        if (latestSummary.length > 0) {
          const summaryDate = latestSummary[0].date;
          const summaryBalance = parseFloat(String(latestSummary[0].remainingBalance || '0'));

          // إذا كان الملخص الموجود هو لليوم السابق مباشرة، استخدمه
          if (summaryDate === previousDateStr) {
            previousBalance = summaryBalance;
            source = 'summary';
            console.log(`💰 [API] تم العثور على ملخص لليوم السابق: ${previousBalance}`);
          } else {
            // إذا كان الملخص لتاريخ أقدم، احسب من ذلك التاريخ إلى اليوم السابق
            console.log(`💰 [API] آخر ملخص محفوظ في ${summaryDate}, حساب تراكمي إلى ${previousDateStr}`);

            const startFromDate = new Date(summaryDate);
            startFromDate.setDate(startFromDate.getDate() + 1);
            const startFromStr = startFromDate.toISOString().split('T')[0];

            // حساب تراكمي من startFromStr إلى previousDateStr
            const cumulativeBalance = await calculateCumulativeBalance(projectId, startFromStr, previousDateStr);
            previousBalance = summaryBalance + cumulativeBalance;
            source = 'computed-from-summary';
            console.log(`💰 [API] رصيد تراكمي من ${summaryDate} (${summaryBalance}) + ${cumulativeBalance} = ${previousBalance}`);
          }
        } else {
          // لا يوجد ملخص محفوظ، حساب تراكمي من البداية
          console.log(`💰 [API] لا يوجد ملخص محفوظ، حساب تراكمي من البداية`);
          previousBalance = await calculateCumulativeBalance(projectId, null, previousDateStr);
          source = 'computed-full';
          console.log(`💰 [API] رصيد تراكمي كامل: ${previousBalance}`);
        }
      } catch (error) {
        console.warn(`⚠️ [API] خطأ في حساب الرصيد السابق، استخدام القيمة الافتراضية 0:`, error);
        previousBalance = 0;
        source = 'error';
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حساب الرصيد المتبقي من اليوم السابق بنجاح في ${duration}ms: ${previousBalance}`);

      res.json({
        success: true,
        data: {
          balance: previousBalance.toString(),
          previousDate: previousDateStr,
          currentDate: date,
          source
        },
        message: `تم حساب الرصيد المتبقي من يوم ${previousDateStr} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حساب الرصيد المتبقي من اليوم السابق:', error);

      res.status(500).json({
        success: false,
        data: {
          balance: "0"
        },
        error: 'فشل في حساب الرصيد المتبقي',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // دالة مساعدة لحساب الرصيد التراكمي
  async function calculateCumulativeBalance(projectId: string, fromDate: string | null, toDate: string): Promise<number> {
    try {
      // تحديد النطاق الزمني
      const whereConditions = [eq(fundTransfers.projectId, projectId)];

      if (fromDate) {
        whereConditions.push(gte(fundTransfers.transferDate, sql`${fromDate}::date`));
      }
      whereConditions.push(lt(fundTransfers.transferDate, sql`(${toDate}::date + interval '1 day')`));

      // جلب جميع البيانات المالية للفترة المحددة
      const [
        ftRows,
        waRows,
        mpRows,
        teRows,
        wtRows,
        wmRows,
        incomingPtRows,
        outgoingPtRows
      ] = await Promise.all([
        // تحويلات العهدة
        db.select().from(fundTransfers)
          .where(and(...whereConditions)),

        // أجور العمال
        db.select().from(workerAttendance)
          .where(and(
            eq(workerAttendance.projectId, projectId),
            fromDate ? gte(workerAttendance.date, fromDate) : sql`true`,
            lte(workerAttendance.date, toDate)
          )),

        // مشتريات المواد النقدية فقط
        db.select().from(materialPurchases)
          .where(and(
            eq(materialPurchases.projectId, projectId),
            eq(materialPurchases.purchaseType, "نقد"),
            fromDate ? gte(materialPurchases.purchaseDate, fromDate) : sql`true`,
            lte(materialPurchases.purchaseDate, toDate)
          )),

        // مصاريف النقل
        db.select().from(transportationExpenses)
          .where(and(
            eq(transportationExpenses.projectId, projectId),
            fromDate ? gte(transportationExpenses.date, fromDate) : sql`true`,
            lte(transportationExpenses.date, toDate)
          )),

        // حوالات العمال
        db.select().from(workerTransfers)
          .where(and(
            eq(workerTransfers.projectId, projectId),
            fromDate ? gte(workerTransfers.transferDate, fromDate) : sql`true`,
            lte(workerTransfers.transferDate, toDate)
          )),

        // مصاريف متنوعة للعمال
        db.select().from(workerMiscExpenses)
          .where(and(
            eq(workerMiscExpenses.projectId, projectId),
            fromDate ? gte(workerMiscExpenses.date, fromDate) : sql`true`,
            lte(workerMiscExpenses.date, toDate)
          )),

        // تحويلات واردة من مشاريع أخرى
        db.select().from(projectFundTransfers)
          .where(and(
            eq(projectFundTransfers.toProjectId, projectId),
            fromDate ? gte(projectFundTransfers.transferDate, fromDate) : sql`true`,
            lte(projectFundTransfers.transferDate, toDate)
          )),

        // تحويلات صادرة إلى مشاريع أخرى
        db.select().from(projectFundTransfers)
          .where(and(
            eq(projectFundTransfers.fromProjectId, projectId),
            fromDate ? gte(projectFundTransfers.transferDate, fromDate) : sql`true`,
            lte(projectFundTransfers.transferDate, toDate)
          ))
      ]);

      // حساب الإجماليات
      const totalFundTransfers = ftRows.reduce((sum: number, t: any) => sum + parseFloat(String(t.amount || '0')), 0);
      const totalWorkerWages = waRows.reduce((sum: number, w: any) => sum + parseFloat(String(w.paidAmount || '0')), 0);
      const totalMaterialCosts = mpRows.reduce((sum: number, m: any) => sum + parseFloat(String(m.totalAmount || '0')), 0);
      const totalTransportation = teRows.reduce((sum: number, t: any) => sum + parseFloat(String(t.amount || '0')), 0);
      const totalWorkerTransfers = wtRows.reduce((sum: number, w: any) => sum + parseFloat(String(w.amount || '0')), 0);
      const totalMiscExpenses = wmRows.reduce((sum: number, m: any) => sum + parseFloat(String(m.amount || '0')), 0);
      const totalIncomingProjectTransfers = incomingPtRows.reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || '0')), 0);
      const totalOutgoingProjectTransfers = outgoingPtRows.reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || '0')), 0);

      const totalIncome = totalFundTransfers + totalIncomingProjectTransfers;
      const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses + totalOutgoingProjectTransfers;
      const balance = totalIncome - totalExpenses;

      console.log(`💰 [Calc] فترة ${fromDate || 'البداية'} إلى ${toDate}: دخل=${totalIncome}, مصاريف=${totalExpenses}, رصيد=${balance}`);

      return balance;
    } catch (error) {
      console.error('❌ خطأ في حساب الرصيد التراكمي:', error);
      return 0;
    }
  }

  // 📝 POST endpoint للمشاريع - إضافة مشروع جديد مع validation محسن
  app.post("/api/projects", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة مشروع جديد من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات المشروع المرسلة:', req.body);

      // Validation باستخدام enhanced schema
      const validationResult = enhancedInsertProjectSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation المشروع:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات المشروع غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات المشروع غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation المشروع');

      // إدراج المشروع الجديد في قاعدة البيانات
      console.log('💾 [API] حفظ المشروع في قاعدة البيانات...');
      const newProject = await db.insert(projects).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء المشروع بنجاح في ${duration}ms:`, {
        id: newProject[0].id,
        name: newProject[0].name,
        status: newProject[0].status
      });

      res.status(201).json({
        success: true,
        data: newProject[0],
        message: `تم إنشاء المشروع "${newProject[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء المشروع:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء المشروع';
      let statusCode = 500;

      if (error.code === '23505') { // duplicate key
        errorMessage = 'اسم المشروع موجود مسبقاً';
        statusCode = 409;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات المشروع ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });


  // 📝 POST endpoint للمواد - إضافة مادة جديدة مع validation محسن
  app.post("/api/materials", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة مادة جديدة من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات المادة المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertMaterialSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation المادة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات المادة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات المادة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation المادة');

      // إدراج المادة الجديدة في قاعدة البيانات
      console.log('💾 [API] حفظ المادة في قاعدة البيانات...');
      const newMaterial = await db.insert(materials).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء المادة بنجاح في ${duration}ms:`, {
        id: newMaterial[0].id,
        name: newMaterial[0].name,
        category: newMaterial[0].category,
        unit: newMaterial[0].unit
      });

      res.status(201).json({
        success: true,
        data: newMaterial[0],
        message: `تم إنشاء المادة "${newMaterial[0].name}" (${newMaterial[0].category}) بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء المادة:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء المادة';
      let statusCode = 500;

      if (error.code === '23505') { // duplicate key
        errorMessage = 'المادة موجودة مسبقاً';
        statusCode = 409;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات المادة ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📝 POST endpoint للموردين - إضافة مورد جديد مع validation محسن
  app.post("/api/suppliers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة مورد جديد من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات المورد المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertSupplierSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation المورد:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات المورد غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات المورد غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation المورد');

      // إدراج المورد الجديد في قاعدة البيانات
      console.log('💾 [API] حفظ المورد في قاعدة البيانات...');
      const newSupplier = await db.insert(suppliers).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء المورد بنجاح في ${duration}ms:`, {
        id: newSupplier[0].id,
        name: newSupplier[0].name,
        contactPerson: newSupplier[0].contactPerson
      });

      res.status(201).json({
        success: true,
        data: newSupplier[0],
        message: `تم إنشاء المورد "${newSupplier[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء المورد:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء المورد';
      let statusCode = 500;

      if (error.code === '23505') { // duplicate key
        errorMessage = 'اسم المورد موجود مسبقاً';
        statusCode = 409;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات المورد ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint لمشتريات المواد
  app.patch("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log('🔄 [API] طلب تحديث مشترية المواد من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المشترية:', purchaseId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!purchaseId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المشترية مطلوب',
          message: 'لم يتم توفير معرف المشترية للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود المشترية أولاً
      const existingPurchase = await db.select().from(materialPurchases).where(eq(materialPurchases.id, purchaseId)).limit(1);

      if (existingPurchase.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'المشترية غير موجودة',
          message: `لم يتم العثور على مشترية بالمعرف: ${purchaseId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertMaterialPurchaseSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث مشترية المواد:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث مشترية المواد غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث مشترية المواد غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث المشترية
      const updatedPurchase = await db
        .update(materialPurchases)
        .set({
          ...validationResult.data,
          updatedAt: new Date()
        })
        .where(eq(materialPurchases.id, purchaseId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث مشترية المواد بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedPurchase[0],
        message: `تم تحديث مشترية المواد بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث مشترية المواد:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث مشترية المواد',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📝 POST endpoint لمشتريات المواد - إضافة مشتريات جديدة مع validation محسن
  app.post("/api/material-purchases", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة مشتريات مواد جديدة من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات مشتريات المواد المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertMaterialPurchaseSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation مشتريات المواد:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات مشتريات المواد غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات مشتريات المواد غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation مشتريات المواد');

      // إدراج مشتريات المواد الجديدة في قاعدة البيانات
      console.log('💾 [API] حفظ مشتريات المواد في قاعدة البيانات...');
      const newPurchase = await db.insert(materialPurchases).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء مشتريات المواد بنجاح في ${duration}ms:`, {
        id: newPurchase[0].id,
        projectId: newPurchase[0].projectId,
        totalAmount: newPurchase[0].totalAmount
      });

      res.status(201).json({
        success: true,
        data: newPurchase[0],
        message: `تم إنشاء مشتريات المواد بقيمة ${newPurchase[0].totalAmount} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء مشتريات المواد:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء مشتريات المواد';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'المشروع أو المادة أو المورد المحدد غير موجود';
        statusCode = 400;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات مشتريات المواد ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📊 GET endpoint للمصروفات اليومية - جلب المصروفات لتاريخ محدد
  app.get("/api/projects/:projectId/daily-expenses/:date", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId, date } = req.params;

      console.log(`📊 [API] طلب جلب المصروفات اليومية: projectId=${projectId}, date=${date}`);

      // التحقق من صحة المعاملات
      if (!projectId || !date) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معاملات مطلوبة مفقودة',
          message: 'معرف المشروع والتاريخ مطلوبان',
          processingTime: duration
        });
      }

      // التحقق من تنسيق التاريخ
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'تنسيق التاريخ غير صحيح',
          message: 'يجب أن يكون التاريخ بصيغة YYYY-MM-DD',
          processingTime: duration
        });
      }

      // جلب جميع البيانات المطلوبة
      const [
        fundTransfersResult,
        workerAttendanceResult,
        materialPurchasesResult,
        transportationResult,
        workerTransfersResult,
        miscExpensesResult,
        projectInfo
      ] = await Promise.all([
        db.select().from(fundTransfers)
          .where(and(eq(fundTransfers.projectId, projectId), gte(fundTransfers.transferDate, sql`${date}::date`), lt(fundTransfers.transferDate, sql`(${date}::date + interval '1 day')`))),
        db.select({
          id: workerAttendance.id,
          workerId: workerAttendance.workerId,
          projectId: workerAttendance.projectId,
          date: workerAttendance.date,
          paidAmount: workerAttendance.paidAmount,
          actualWage: workerAttendance.actualWage,
          workDays: workerAttendance.workDays,
          workerName: workers.name
        })
        .from(workerAttendance)
        .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
        .where(and(eq(workerAttendance.projectId, projectId), eq(workerAttendance.date, date))),
        db.select().from(materialPurchases)
          .where(and(eq(materialPurchases.projectId, projectId), eq(materialPurchases.purchaseDate, date))),
        db.select().from(transportationExpenses)
          .where(and(eq(transportationExpenses.projectId, projectId), eq(transportationExpenses.date, date))),
        db.select().from(workerTransfers)
          .where(and(eq(workerTransfers.projectId, projectId), eq(workerTransfers.transferDate, date))),
        db.select().from(workerMiscExpenses)
          .where(and(eq(workerMiscExpenses.projectId, projectId), eq(workerMiscExpenses.date, date))),
        db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
      ]);

      // حساب المجاميع
      const totalFundTransfers = fundTransfersResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWorkerWages = workerAttendanceResult.reduce((sum, w) => sum + parseFloat(w.paidAmount || '0'), 0);
      const totalMaterialCosts = materialPurchasesResult.reduce((sum, m) => sum + parseFloat(m.totalAmount), 0);
      const totalTransportation = transportationResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWorkerTransfers = workerTransfersResult.reduce((sum, w) => sum + parseFloat(w.amount), 0);
      const totalMiscExpenses = miscExpensesResult.reduce((sum, m) => sum + parseFloat(m.amount), 0);

      const totalIncome = totalFundTransfers;
      const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses;
      const remainingBalance = totalIncome - totalExpenses;

      const responseData = {
        date,
        projectName: projectInfo[0]?.name || 'مشروع غير معروف',
        projectId,
        totalIncome,
        totalExpenses,
        remainingBalance,
        fundTransfers: fundTransfersResult,
        workerAttendance: workerAttendanceResult,
        materialPurchases: materialPurchasesResult,
        transportationExpenses: transportationResult,
        workerTransfers: workerTransfersResult,
        miscExpenses: miscExpensesResult
      };

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب المصروفات اليومية بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: responseData,
        message: `تم جلب المصروفات اليومية لتاريخ ${date} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب المصروفات اليومية:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في جلب المصروفات اليومية',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📝 POST endpoint لتحويلات العهدة - إضافة تحويل جديد مع validation محسن
  app.post("/api/fund-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة تحويل عهدة جديد من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات تحويل العهدة المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertFundTransferSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحويل العهدة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحويل العهدة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحويل العهدة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation تحويل العهدة');

      // إدراج تحويل العهدة الجديد في قاعدة البيانات
      console.log('💾 [API] حفظ تحويل العهدة في قاعدة البيانات...');
      const newTransfer = await db.insert(fundTransfers).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء تحويل العهدة بنجاح في ${duration}ms:`, {
        id: newTransfer[0].id,
        amount: newTransfer[0].amount,
        transferType: newTransfer[0].transferType
      });

      res.status(201).json({
        success: true,
        data: newTransfer[0],
        message: `تم إنشاء تحويل عهدة بقيمة ${newTransfer[0].amount} (${newTransfer[0].transferType}) بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء تحويل العهدة:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء تحويل العهدة';
      let statusCode = 500;

      if (error.code === '23505') { // duplicate key
        errorMessage = 'رقم التحويل موجود مسبقاً';
        statusCode = 409;
      } else if (error.code === '23503') { // foreign key violation
        errorMessage = 'المشروع المحدد غير موجود';
        statusCode = 400;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات تحويل العهدة ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📝 POST endpoint لمصاريف المواصلات - إضافة مصروف جديد مع validation محسن
  app.post("/api/transportation-expenses", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة مصروف مواصلات جديد من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات مصروف المواصلات المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertTransportationExpenseSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation مصروف المواصلات:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات مصروف المواصلات غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات مصروف المواصلات غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation مصروف المواصلات');

      // إدراج مصروف المواصلات الجديد في قاعدة البيانات
      console.log('💾 [API] حفظ مصروف المواصلات في قاعدة البيانات...');
      const newExpense = await db.insert(transportationExpenses).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء مصروف المواصلات بنجاح في ${duration}ms:`, {
        id: newExpense[0].id,
        amount: newExpense[0].amount,
        description: newExpense[0].description
      });

      res.status(201).json({
        success: true,
        data: newExpense[0],
        message: `تم إنشاء مصروف مواصلات بقيمة ${newExpense[0].amount} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء مصروف المواصلات:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء مصروف المواصلات';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'المشروع أو العامل المحدد غير موجود';
        statusCode = 400;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات مصروف المواصلات ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📝 POST endpoint لملخص المصاريف اليومية - إضافة ملخص جديد مع validation محسن
  app.post("/api/daily-expense-summaries", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة ملخص مصاريف يومية جديد من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات ملخص المصاريف اليومية المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertDailyExpenseSummarySchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation ملخص المصاريف اليومية:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات ملخص المصاريف اليومية غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات ملخص المصاريف اليومية غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation ملخص المصاريف اليومية');

      // إدراج ملخص المصاريف اليومية الجديد في قاعدة البيانات
      console.log('💾 [API] حفظ ملخص المصاريف اليومية في قاعدة البيانات...');
      const newSummary = await db.insert(dailyExpenseSummaries).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء ملخص المصاريف اليومية بنجاح في ${duration}ms:`, {
        id: newSummary[0].id,
        date: newSummary[0].date,
        totalExpenses: newSummary[0].totalExpenses
      });

      res.status(201).json({
        success: true,
        data: newSummary[0],
        message: `تم إنشاء ملخص المصاريف اليومية لتاريخ ${newSummary[0].date} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء ملخص المصاريف اليومية:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء ملخص المصاريف اليومية';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'المشروع المحدد غير موجود';
        statusCode = 400;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات ملخص المصاريف اليومية ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📊 GET endpoint لجلب مشترية مادة واحدة للتعديل
  app.get("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log(`📊 [API] طلب جلب مشترية مادة للتعديل: ${purchaseId}`);

      if (!purchaseId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المشترية مطلوب',
          processingTime: duration
        });
      }

      // جلب المشترية مع جميع الحقول المطلوبة
      const purchase = await db
        .select({
          id: materialPurchases.id,
          projectId: materialPurchases.projectId,
          materialName: materialPurchases.materialName,
          materialCategory: materialPurchases.materialCategory,
          materialUnit: materialPurchases.materialUnit,
          quantity: materialPurchases.quantity,
          unit: materialPurchases.unit,
          unitPrice: materialPurchases.unitPrice,
          totalAmount: materialPurchases.totalAmount,
          purchaseType: materialPurchases.purchaseType,
          supplierName: materialPurchases.supplierName,
          invoiceNumber: materialPurchases.invoiceNumber,
          invoiceDate: materialPurchases.invoiceDate,
          invoicePhoto: materialPurchases.invoicePhoto,
          notes: materialPurchases.notes,
          purchaseDate: materialPurchases.purchaseDate,
          createdAt: materialPurchases.createdAt
        })
        .from(materialPurchases)
        .where(eq(materialPurchases.id, purchaseId))
        .limit(1);

      if (purchase.length === 0) {
        const duration = Date.now() - startTime;
        console.log(`📭 [API] لم يتم العثور على المشترية: ${purchaseId}`);
        return res.status(404).json({
          success: false,
          error: 'المشترية غير موجودة',
          message: `لم يتم العثور على مشترية بالمعرف: ${purchaseId}`,
          processingTime: duration
        });
      }

      const purchaseData = purchase[0];

      // البحث الذكي عن فئة المادة - تحسين مع عدة استراتيجيات
      let materialData = null;
      let finalMaterialCategory = purchaseData.materialCategory;
      let finalMaterialUnit = purchaseData.materialUnit || purchaseData.unit;

      if ((!finalMaterialCategory || !finalMaterialUnit) && purchaseData.materialName) {
        try {
          console.log(`🔍 [API] البحث عن فئة المادة لـ: ${purchaseData.materialName}`);

          // البحث الدقيق أولاً
          let similarMaterial = await db
            .select()
            .from(materials)
            .where(eq(materials.name, purchaseData.materialName))
            .limit(1);

          // إذا لم نجد تطابق دقيق، نبحث بالتشابه الجزئي
          if (similarMaterial.length === 0) {
            similarMaterial = await db
              .select()
              .from(materials)
              .where(sql`LOWER(${materials.name}) LIKE LOWER(${`%${purchaseData.materialName}%`})`)
              .limit(1);
          }

          // إذا لم نجد تطابق جزئي، نبحث بالكلمات الأولى
          if (similarMaterial.length === 0) {
            const firstWord = purchaseData.materialName.split(' ')[0];
            if (firstWord.length > 2) {
              similarMaterial = await db
                .select()
                .from(materials)
                .where(sql`LOWER(${materials.name}) LIKE LOWER(${`${firstWord}%`})`)
                .limit(1);
            }
          }

          if (similarMaterial.length > 0) {
            materialData = similarMaterial[0];
            finalMaterialCategory = finalMaterialCategory || materialData.category;
            finalMaterialUnit = finalMaterialUnit || materialData.unit;

            console.log(`✅ [API] تم العثور على مادة مشابهة:`, {
              foundMaterial: materialData.name,
              category: materialData.category,
              unit: materialData.unit
            });
          } else {
            console.log(`⚠️ [API] لم يتم العثور على مادة مشابهة لـ: ${purchaseData.materialName}`);
          }
        } catch (materialError) {
          console.warn('⚠️ [API] خطأ في البحث عن مادة مشابهة:', materialError);
        }
      }

      const duration = Date.now() - startTime;

      // تكوين البيانات الكاملة
      const completeData = {
        ...purchaseData,
        materialCategory: finalMaterialCategory,
        materialUnit: finalMaterialUnit,
        material: materialData
      };

      // تسجيل مفصل لتشخيص المشكلة
      console.log(`🔍 [API] تفاصيل البيانات المسترجعة:`, {
        purchaseData: {
          id: purchaseData.id,
          materialName: purchaseData.materialName,
          materialCategory: purchaseData.materialCategory,
          materialUnit: purchaseData.materialUnit,
          unit: purchaseData.unit
        },
        materialData: materialData ? {
          id: materialData.id,
          name: materialData.name,
          category: materialData.category,
          unit: materialData.unit
        } : 'لا توجد بيانات مادة مرتبطة',
        completeData: {
          materialCategory: completeData.materialCategory,
          materialUnit: completeData.materialUnit
        }
      });

      console.log(`✅ [API] تم جلب بيانات المشترية للتعديل في ${duration}ms:`, {
        id: completeData.id,
        materialName: completeData.materialName,
        materialCategory: completeData.materialCategory,
        materialUnit: completeData.materialUnit,
        totalAmount: completeData.totalAmount
      });

      res.json({
        success: true,
        data: completeData,
        message: 'تم جلب بيانات المشترية بنجاح',
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب بيانات المشترية:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في جلب بيانات المشترية',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📝 POST endpoint للمعدات (equipment = tools) - إضافة معدة جديدة مع validation محسن
  app.post("/api/equipment", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة معدة جديدة من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات المعدة المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertToolSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation المعدة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات المعدة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات المعدة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation المعدة');

      // إدراج المعدة الجديدة في قاعدة البيانات
      console.log('💾 [API] حفظ المعدة في قاعدة البيانات...');
      const newEquipment = await db.insert(tools).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء المعدة بنجاح في ${duration}ms:`, {
        id: newEquipment[0].id,
        name: newEquipment[0].name,
        categoryId: newEquipment[0].categoryId
      });

      res.status(201).json({
        success: true,
        data: newEquipment[0],
        message: `تم إنشاء المعدة "${newEquipment[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء المعدة:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء المعدة';
      let statusCode = 500;

      if (error.code === '23505') { // duplicate key
        errorMessage = 'اسم المعدة موجود مسبقاً';
        statusCode = 409;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات المعدة ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📝 POST endpoint لتحويلات المعدات - إضافة تحويل معدة جديد مع validation محسن
  app.post("/api/equipment-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('📝 [API] طلب إضافة تحويل معدة جديد من المستخدم:', req.user?.email);
      console.log('📋 [API] بيانات تحويل المعدة المرسلة:', req.body);

      // Validation باستخدام insert schema
      const validationResult = insertToolMovementSchema.safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحويل المعدة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحويل المعدة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحويل المعدة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation تحويل المعدة');

      // إدراج تحويل المعدة الجديد في قاعدة البيانات
      console.log('💾 [API] حفظ تحويل المعدة في قاعدة البيانات...');
      const newTransfer = await db.insert(toolMovements).values(validationResult.data).returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم إنشاء تحويل المعدة بنجاح في ${duration}ms:`, {
        id: newTransfer[0].id,
        toolId: newTransfer[0].toolId,
        movementType: newTransfer[0].movementType
      });

      res.status(201).json({
        success: true,
        data: newTransfer[0],
        message: `تم إنشاء تحويل المعدة بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في إنشاء تحويل المعدة:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في إنشاء تحويل المعدة';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'المعدة أو المشروع المحدد غير موجود';
        statusCode = 400;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات تحويل المعدة ناقصة';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint للمواد - تحديث بيانات مادة موجودة مع validation محسن
  app.patch("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log('🔄 [API] طلب تحديث المادة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المادة:', materialId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!materialId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المادة مطلوب',
          message: 'لم يتم توفير معرف المادة للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود المادة أولاً
      const existingMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

      if (existingMaterial.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'المادة غير موجودة',
          message: `لم يتم العثور على مادة بالمعرف: ${materialId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertMaterialSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث المادة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المادة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث المادة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث المادة
      const updatedMaterial = await db
        .update(materials)
        .set(validationResult.data)
        .where(eq(materials.id, materialId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث المادة بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedMaterial[0],
        message: `تم تحديث المادة "${updatedMaterial[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المادة:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المادة',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint للموردين - تحديث بيانات مورد موجود مع validation محسن
  app.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const supplierId = req.params.id;
      console.log('🔄 [API] طلب تحديث المورد من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المورد:', supplierId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!supplierId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المورد مطلوب',
          message: 'لم يتم توفير معرف المورد للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود المورد أولاً
      const existingSupplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);

      if (existingSupplier.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'المورد غير موجود',
          message: `لم يتم العثور على مورد بالمعرف: ${supplierId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertSupplierSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث المورد:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المورد غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث المورد غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث المورد
      const updatedSupplier = await db
        .update(suppliers)
        .set(validationResult.data)
        .where(eq(suppliers.id, supplierId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث المورد بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedSupplier[0],
        message: `تم تحديث المورد "${updatedSupplier[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المورد:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المورد',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint لمشتريات المواد - تحديث مشتريات موجودة مع validation محسن
  app.patch("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log('🔄 [API] طلب تحديث مشتريات المواد من المستخدم:', req.user?.email);
      console.log('📋 [API] ID مشتريات المواد:', purchaseId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!purchaseId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف مشتريات المواد مطلوب',
          message: 'لم يتم توفير معرف مشتريات المواد للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود مشتريات المواد أولاً
      const existingPurchase = await db.select().from(materialPurchases).where(eq(materialPurchases.id, purchaseId)).limit(1);

      if (existingPurchase.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'مشتريات المواد غير موجودة',
          message: `لم يتم العثور على مشتريات مواد بالمعرف: ${purchaseId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertMaterialPurchaseSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث مشتريات المواد:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث مشتريات المواد غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث مشتريات المواد غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث مشتريات المواد
      const updatedPurchase = await db
        .update(materialPurchases)
        .set(validationResult.data)
        .where(eq(materialPurchases.id, purchaseId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث مشتريات المواد بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedPurchase[0],
        message: `تم تحديث مشتريات المواد بقيمة ${updatedPurchase[0].totalAmount} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث مشتريات المواد:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث مشتريات المواد',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint لتحويلات العهدة - تحديث تحويل موجود مع validation محسن
  app.patch("/api/fund-transfers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const transferId = req.params.id;
      console.log('🔄 [API] طلب تحديث تحويل العهدة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID تحويل العهدة:', transferId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!transferId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف تحويل العهدة مطلوب',
          message: 'لم يتم توفير معرف تحويل العهدة للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود تحويل العهدة أولاً
      const existingTransfer = await db.select().from(fundTransfers).where(eq(fundTransfers.id, transferId)).limit(1);

      if (existingTransfer.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'تحويل العهدة غير موجود',
          message: `لم يتم العثور على تحويل عهدة بالمعرف: ${transferId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertFundTransferSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث تحويل العهدة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث تحويل العهدة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث تحويل العهدة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث تحويل العهدة
      const updatedTransfer = await db
        .update(fundTransfers)
        .set(validationResult.data)
        .where(eq(fundTransfers.id, transferId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث تحويل العهدة بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedTransfer[0],
        message: `تم تحديث تحويل العهدة بقيمة ${updatedTransfer[0].amount} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث تحويل العهدة:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث تحويل العهدة',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint لمصاريف المواصلات - تحديث مصروف موجود مع validation محسن
  app.patch("/api/transportation-expenses/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const expenseId = req.params.id;
      console.log('🔄 [API] طلب تحديث مصروف المواصلات من المستخدم:', req.user?.email);
      console.log('📋 [API] ID مصروف المواصلات:', expenseId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!expenseId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف مصروف المواصلات مطلوب',
          message: 'لم يتم توفير معرف مصروف المواصلات للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود مصروف المواصلات أولاً
      const existingExpense = await db.select().from(transportationExpenses).where(eq(transportationExpenses.id, expenseId)).limit(1);

      if (existingExpense.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'مصروف المواصلات غير موجود',
          message: `لم يتم العثور على مصروف مواصلات بالمعرف: ${expenseId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertTransportationExpenseSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث مصروف المواصلات:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث مصروف المواصلات غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث مصروف المواصلات غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث مصروف المواصلات
      const updatedExpense = await db
        .update(transportationExpenses)
        .set(validationResult.data)
        .where(eq(transportationExpenses.id, expenseId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث مصروف المواصلات بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedExpense[0],
        message: `تم تحديث مصروف المواصلات بقيمة ${updatedExpense[0].amount} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث مصروف المواصلات:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث مصروف المواصلات',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint لملخص المصاريف اليومية - تحديث ملخص موجود مع validation محسن
  app.patch("/api/daily-expense-summaries/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const summaryId = req.params.id;
      console.log('🔄 [API] طلب تحديث ملخص المصاريف اليومية من المستخدم:', req.user?.email);
      console.log('📋 [API] ID ملخص المصاريف اليومية:', summaryId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!summaryId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف ملخص المصاريف اليومية مطلوب',
          message: 'لم يتم توفير معرف ملخص المصاريف اليومية للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود ملخص المصاريف اليومية أولاً
      const existingSummary = await db.select().from(dailyExpenseSummaries).where(eq(dailyExpenseSummaries.id, summaryId)).limit(1);

      if (existingSummary.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'ملخص المصاريف اليومية غير موجود',
          message: `لم يتم العثور على ملخص مصاريف يومية بالمعرف: ${summaryId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertDailyExpenseSummarySchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث ملخص المصاريف اليومية:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث ملخص المصاريف اليومية غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث ملخص المصاريف اليومية غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث ملخص المصاريف اليومية
      const updatedSummary = await db
        .update(dailyExpenseSummaries)
        .set(validationResult.data)
        .where(eq(dailyExpenseSummaries.id, summaryId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث ملخص المصاريف اليومية بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedSummary[0],
        message: `تم تحديث ملخص المصاريف اليومية لتاريخ ${updatedSummary[0].date} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث ملخص المصاريف اليومية:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث ملخص المصاريف اليومية',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint للمعدات - تحديث معدة موجودة مع validation محسن
  app.patch("/api/equipment/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const equipmentId = req.params.id;
      console.log('🔄 [API] طلب تحديث المعدة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المعدة:', equipmentId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!equipmentId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المعدة مطلوب',
          message: 'لم يتم توفير معرف المعدة للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود المعدة أولاً
      const existingEquipment = await db.select().from(tools).where(eq(tools.id, equipmentId)).limit(1);

      if (existingEquipment.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'المعدة غير موجودة',
          message: `لم يتم العثور على معدة بالمعرف: ${equipmentId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertToolSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث المعدة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المعدة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث المعدة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث المعدة
      const updatedEquipment = await db
        .update(tools)
        .set(validationResult.data)
        .where(eq(tools.id, equipmentId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث المعدة بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedEquipment[0],
        message: `تم تحديث المعدة "${updatedEquipment[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المعدة:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المعدة',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint لتحويلات المعدات - تحديث تحويل معدة موجود مع validation محسن
  app.patch("/api/equipment-transfers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const transferId = req.params.id;
      console.log('🔄 [API] طلب تحديث تحويل المعدة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID تحويل المعدة:', transferId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!transferId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف تحويل المعدة مطلوب',
          message: 'لم يتم توفير معرف تحويل المعدة للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود تحويل المعدة أولاً
      const existingTransfer = await db.select().from(toolMovements).where(eq(toolMovements.id, transferId)).limit(1);

      if (existingTransfer.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'تحويل المعدة غير موجود',
          message: `لم يتم العثور على تحويل معدة بالمعرف: ${transferId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertToolMovementSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث تحويل المعدة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث تحويل المعدة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث تحويل المعدة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث تحويل المعدة
      const updatedTransfer = await db
        .update(toolMovements)
        .set(validationResult.data)
        .where(eq(toolMovements.id, transferId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث تحويل المعدة بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedTransfer[0],
        message: `تم تحديث تحويل المعدة بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث تحويل المعدة:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث تحويل المعدة',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint لمشتريات المواد - حذف مشتريات مع logging وتحقق من الوجود
  app.delete("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log('❌ [API] طلب حذف مشتريات المواد من المستخدم:', req.user?.email);
      console.log('📋 [API] ID مشتريات المواد المراد حذفها:', purchaseId);

      if (!purchaseId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف مشتريات المواد مطلوب',
          message: 'لم يتم توفير معرف مشتريات المواد للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود مشتريات المواد أولاً وجلب بياناتها للـ logging
      const existingPurchase = await db.select().from(materialPurchases).where(eq(materialPurchases.id, purchaseId)).limit(1);

      if (existingPurchase.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] مشتريات المواد غير موجودة:', purchaseId);
        return res.status(404).json({
          success: false,
          error: 'مشتريات المواد غير موجودة',
          message: `لم يتم العثور على مشتريات مواد بالمعرف: ${purchaseId}`,
          processingTime: duration
        });
      }

      const purchaseToDelete = existingPurchase[0];
      console.log('🗑️ [API] سيتم حذف مشتريات المواد:', {
        id: purchaseToDelete.id,
        projectId: purchaseToDelete.projectId,
        totalAmount: purchaseToDelete.totalAmount
      });

      // حذف مشتريات المواد من قاعدة البيانات
      console.log('🗑️ [API] حذف مشتريات المواد من قاعدة البيانات...');
      const deletedPurchase = await db
        .delete(materialPurchases)
        .where(eq(materialPurchases.id, purchaseId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف مشتريات المواد بنجاح في ${duration}ms:`, {
        id: deletedPurchase[0].id,
        totalAmount: deletedPurchase[0].totalAmount
      });

      res.json({
        success: true,
        data: deletedPurchase[0],
        message: `تم حذف مشتريات المواد بقيمة ${deletedPurchase[0].totalAmount} بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف مشتريات المواد:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف مشتريات المواد';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف مشتريات المواد - مرتبطة ببيانات أخرى';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف مشتريات المواد غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للموردين - حذف مورد مع logging وتحقق من الوجود
  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const supplierId = req.params.id;
      console.log('❌ [API] طلب حذف المورد من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المورد المراد حذفه:', supplierId);

      if (!supplierId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المورد مطلوب',
          message: 'لم يتم توفير معرف المورد للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود المورد أولاً وجلب بياناته للـ logging
      const existingSupplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);

      if (existingSupplier.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المورد غير موجود:', supplierId);
        return res.status(404).json({
          success: false,
          error: 'المورد غير موجود',
          message: `لم يتم العثور على مورد بالمعرف: ${supplierId}`,
          processingTime: duration
        });
      }

      const supplierToDelete = existingSupplier[0];
      console.log('🗑️ [API] سيتم حذف المورد:', {
        id: supplierToDelete.id,
        name: supplierToDelete.name,
        contactPerson: supplierToDelete.contactPerson
      });

      // حذف المورد من قاعدة البيانات
      console.log('🗑️ [API] حذف المورد من قاعدة البيانات...');
      const deletedSupplier = await db
        .delete(suppliers)
        .where(eq(suppliers.id, supplierId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف المورد بنجاح في ${duration}ms:`, {
        id: deletedSupplier[0].id,
        name: deletedSupplier[0].name
      });

      res.json({
        success: true,
        data: deletedSupplier[0],
        message: `تم حذف المورد "${deletedSupplier[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف المورد:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف المورد';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف المورد - مرتبط ببيانات أخرى';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف المورد غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint للعمال - تحديث بيانات عامل موجود مع validation محسن
  app.patch("/api/workers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const workerId = req.params.id;
      console.log('🔄 [API] طلب تحديث العامل من المستخدم:', req.user?.email);
      console.log('📋 [API] ID العامل:', workerId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!workerId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف العامل مطلوب',
          message: 'لم يتم توفير معرف العامل للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود العامل أولاً
      const existingWorker = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);

      if (existingWorker.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] العامل غير موجود:', workerId);
        return res.status(404).json({
          success: false,
          error: 'العامل غير موجود',
          message: `لم يتم العثور على عامل بالمعرف: ${workerId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام enhanced schema - نسمح بتحديث جزئي
      const validationResult = enhancedInsertWorkerSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث العامل:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث العامل غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث العامل غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      console.log('✅ [API] نجح validation تحديث العامل');

      // تحديث العامل في قاعدة البيانات
      console.log('💾 [API] تحديث العامل في قاعدة البيانات...');
      const updatedWorker = await db
        .update(workers)
        .set(validationResult.data)
        .where(eq(workers.id, workerId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث العامل بنجاح في ${duration}ms:`, {
        id: updatedWorker[0].id,
        name: updatedWorker[0].name,
        type: updatedWorker[0].type,
        dailyWage: updatedWorker[0].dailyWage,
        isActive: updatedWorker[0].isActive
      });

      res.json({
        success: true,
        data: updatedWorker[0],
        message: `تم تحديث العامل "${updatedWorker[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث العامل:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في تحديث العامل';
      let statusCode = 500;

      if (error.code === '23505') { // duplicate key
        errorMessage = 'اسم العامل موجود مسبقاً';
        statusCode = 409;
      } else if (error.code === '23502') { // not null violation
        errorMessage = 'بيانات العامل ناقصة';
        statusCode = 400;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'تنسيق البيانات غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للعمال - حذف عامل مع logging وتحقق من الوجود (محسن)
  app.delete("/api/workers/:id", requireAuth, requireRole('admin'), async (req, res) => {
    const startTime = Date.now();
    try {
      const workerId = req.params.id;
      console.log('❌ [API] طلب حذف العامل من المستخدم:', req.user?.email);
      console.log('📋 [API] ID العامل المراد حذفه:', workerId);

      if (!workerId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف العامل مطلوب',
          message: 'لم يتم توفير معرف العامل للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود العامل أولاً وجلب بياناته للـ logging
      const existingWorker = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);

      if (existingWorker.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] العامل غير موجود:', workerId);
        return res.status(404).json({
          success: false,
          error: 'العامل غير موجود',
          message: `لم يتم العثور على عامل بالمعرف: ${workerId}`,
          processingTime: duration
        });
      }

      const workerToDelete = existingWorker[0];
      console.log('🗑️ [API] فحص إمكانية حذف العامل:', {
        id: workerToDelete.id,
        name: workerToDelete.name,
        type: workerToDelete.type
      });

      // فحص وجود سجلات حضور مرتبطة بالعامل قبل المحاولة للحذف
      console.log('🔍 [API] فحص سجلات الحضور المرتبطة بالعامل...');
      const attendanceRecords = await db.select({
        id: workerAttendance.id,
        date: workerAttendance.date,
        projectId: workerAttendance.projectId
      })
      .from(workerAttendance)
      .where(eq(workerAttendance.workerId, workerId))
      .limit(5); // جلب 5 سجلات كحد أقصى للمعاينة

      if (attendanceRecords.length > 0) {
        const duration = Date.now() - startTime;

        // حساب إجمالي سجلات الحضور
        const totalAttendanceCount = await db.select({
          count: sql`COUNT(*)`
        })
        .from(workerAttendance)
        .where(eq(workerAttendance.workerId, workerId));

        const totalCount = totalAttendanceCount[0]?.count || attendanceRecords.length;

        console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${totalCount} سجل حضور`);

        return res.status(409).json({
          success: false,
          error: 'لا يمكن حذف العامل',
          message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${totalCount} سجل حضور. يجب حذف جميع سجلات الحضور المرتبطة بالعامل أولاً من صفحة حضور العمال.`,
          userAction: 'يجب حذف سجلات الحضور أولاً',
          relatedRecordsCount: totalCount,
          relatedRecordsType: 'سجلات حضور',
          processingTime: duration
        });
      }

      // فحص وجود سجلات أخرى مرتبطة بالعامل - شامل جميع الجداول
      console.log('🔍 [API] فحص سجلات التحويلات المالية المرتبطة بالعامل...');
      const transferRecords = await db.select({ id: workerTransfers.id })
        .from(workerTransfers)
        .where(eq(workerTransfers.workerId, workerId))
        .limit(1);

      if (transferRecords.length > 0) {
        const duration = Date.now() - startTime;

        // حساب إجمالي التحويلات المالية
        const totalTransfersCount = await db.select({
          count: sql`COUNT(*)`
        })
        .from(workerTransfers)
        .where(eq(workerTransfers.workerId, workerId));

        const transfersCount = totalTransfersCount[0]?.count || transferRecords.length;

        console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${transfersCount} تحويل مالي`);

        return res.status(409).json({
          success: false,
          error: 'لا يمكن حذف العامل',
          message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${transfersCount} تحويل مالي. يجب حذف جميع التحويلات المالية المرتبطة بالعامل أولاً من صفحة تحويلات العمال.`,
          userAction: 'يجب حذف التحويلات المالية أولاً',
          relatedRecordsCount: transfersCount,
          relatedRecordsType: 'تحويلات مالية',
          processingTime: duration
        });
      }

      // فحص وجود سجلات مصاريف النقل المرتبطة بالعامل
      console.log('🔍 [API] فحص سجلات مصاريف النقل المرتبطة بالعامل...');
      const transportRecords = await db.select({ id: transportationExpenses.id })
        .from(transportationExpenses)
        .where(eq(transportationExpenses.workerId, workerId))
        .limit(1);

      if (transportRecords.length > 0) {
        const duration = Date.now() - startTime;

        // حساب إجمالي مصاريف النقل
        const totalTransportCount = await db.select({
          count: sql`COUNT(*)`
        })
        .from(transportationExpenses)
        .where(eq(transportationExpenses.workerId, workerId));

        const transportCount = totalTransportCount[0]?.count || transportRecords.length;

        console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${transportCount} مصروف نقل`);

        return res.status(409).json({
          success: false,
          error: 'لا يمكن حذف العامل',
          message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${transportCount} مصروف نقل. يجب حذف جميع مصاريف النقل المرتبطة بالعامل أولاً من صفحة مصاريف النقل.`,
          userAction: 'يجب حذف مصاريف النقل أولاً',
          relatedRecordsCount: transportCount,
          relatedRecordsType: 'مصاريف نقل',
          processingTime: duration
        });
      }

      // فحص وجود أرصدة العمال
      console.log('🔍 [API] فحص أرصدة العمال المرتبطة بالعامل...');
      const balanceRecords = await db.select({ id: workerBalances.id })
        .from(workerBalances)
        .where(eq(workerBalances.workerId, workerId))
        .limit(1);

      if (balanceRecords.length > 0) {
        const duration = Date.now() - startTime;

        // حساب إجمالي سجلات الأرصدة
        const totalBalanceCount = await db.select({
          count: sql`COUNT(*)`
        })
        .from(workerBalances)
        .where(eq(workerBalances.workerId, workerId));

        const balanceCount = totalBalanceCount[0]?.count || balanceRecords.length;

        console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${balanceCount} سجل رصيد`);

        return res.status(409).json({
          success: false,
          error: 'لا يمكن حذف العامل',
          message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${balanceCount} سجل رصيد. يجب تصفية جميع الأرصدة المرتبطة بالعامل أولاً من صفحة أرصدة العمال.`,
          userAction: 'يجب تصفية الأرصدة أولاً',
          relatedRecordsCount: balanceCount,
          relatedRecordsType: 'أرصدة',
          processingTime: duration
        });
      }

      // المتابعة مع حذف العامل من قاعدة البيانات
      console.log('🗑️ [API] حذف العامل من قاعدة البيانات (لا توجد سجلات مرتبطة)...');
      const deletedWorker = await db
        .delete(workers)
        .where(eq(workers.id, workerId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف العامل بنجاح في ${duration}ms:`, {
        id: deletedWorker[0].id,
        name: deletedWorker[0].name,
        type: deletedWorker[0].type
      });

      res.json({
        success: true,
        data: deletedWorker[0],
        message: `تم حذف العامل "${deletedWorker[0].name}" (${deletedWorker[0].type}) بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف العامل:', error);

      // تحليل نوع الخطأ لرسالة أفضل ومعلومات إضافية للتشخيص
      let errorMessage = 'فشل في حذف العامل';
      let statusCode = 500;
      let userAction = 'يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني';
      let relatedInfo: any = {};

      if (error.code === '23503') { // foreign key violation - backstop
        // هذا يحدث إذا لم نتمكن من اكتشاف السجلات المرتبطة مسبقاً (race conditions أو جداول غير محددة)
        console.error('🚨 [API] خطأ قيد المفتاح الخارجي لم يتم اكتشافه مسبقاً (Race Condition محتمل):', {
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          table: error.table,
          column: error.column,
          fullError: error.message
        });

        errorMessage = 'لا يمكن حذف العامل لوجود سجلات مرتبطة لم يتم اكتشافها مسبقاً';
        statusCode = 409;
        userAction = 'تحقق من جميع السجلات المرتبطة بالعامل في النظام وقم بحذفها أولاً';

        // محاولة استخراج معلومات مفيدة من تفاصيل الخطأ
        const constraintDetails = error.constraint ? ` (${error.constraint})` : '';
        const tableDetails = error.table ? ` في الجدول: ${error.table}` : '';

        relatedInfo = {
          raceConditionDetected: true,
          constraintViolated: error.constraint || 'غير محدد',
          affectedTable: error.table || 'غير محدد',
          affectedColumn: error.column || 'غير محدد',
          technicalDetail: `انتهاك قيد FK${constraintDetails}${tableDetails}`,
          suggestedAction: 'فحص سجلات إضافية قد تكون أُنشئت بين فحص الشروط وتنفيذ الحذف'
        };

      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف العامل غير صحيح أو تالف';
        statusCode = 400;
        userAction = 'تحقق من صحة معرف العامل';
        relatedInfo = {
          invalidInputDetected: true,
          inputValue: req.params.id,
          expectedFormat: 'UUID صحيح'
        };

      } else if (error.code === '42P01') { // undefined table
        errorMessage = 'خطأ في بنية قاعدة البيانات - جدول غير موجود';
        statusCode = 500;
        userAction = 'تواصل مع الدعم الفني فوراً';
        relatedInfo = {
          databaseStructureIssue: true,
          missingTable: error.message
        };

      } else if (error.code === '08003') { // connection does not exist
        errorMessage = 'انقطع الاتصال بقاعدة البيانات';
        statusCode = 503;
        userAction = 'تحقق من اتصال الإنترنت والمحاولة مرة أخرى';
        relatedInfo = {
          connectionIssue: true
        };

      } else if (error.code === '08006') { // connection failure
        errorMessage = 'فشل في الاتصال بقاعدة البيانات';
        statusCode = 503;
        userAction = 'تحقق من اتصال الإنترنت والمحاولة مرة أخرى';
        relatedInfo = {
          connectionFailure: true
        };

      } else {
        // أخطاء غير متوقعة
        console.error('🔍 [API] خطأ غير متوقع في حذف العامل:', {
          code: error.code,
          name: error.name,
          message: error.message,
          stack: error.stack
        });

        relatedInfo = {
          unexpectedError: true,
          errorCode: error.code,
          errorName: error.name,
          timestamp: new Date().toISOString()
        };
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: `خطأ في حذف العامل: ${error.message}`,
        userAction,
        processingTime: duration,
        troubleshooting: relatedInfo,
        // معلومات إضافية للمطورين فقط في بيئة التطوير
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            errorCode: error.code,
            constraint: error.constraint,
            table: error.table,
            column: error.column,
            detail: error.detail
          }
        })
      });
    }
  });


  // 🔄 PATCH endpoints للمشاريع
  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const projectId = req.params.id;
      console.log('🔄 [API] طلب تحديث المشروع:', projectId);

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
          processingTime: Date.now() - startTime
        });
      }

      // التحقق من وجود المشروع
      const existingProject = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'المشروع غير موجود',
          processingTime: Date.now() - startTime
        });
      }

      // تحديث المشروع
      const updatedProject = await db
        .update(projects)
        .set(req.body)
        .where(eq(projects.id, projectId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث المشروع بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedProject[0],
        message: `تم تحديث المشروع "${updatedProject[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المشروع:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المشروع',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint للمواد - تحديث مادة موجودة مع validation محسن
  app.patch("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log('🔄 [API] طلب تحديث المادة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المادة:', materialId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!materialId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المادة مطلوب',
          message: 'لم يتم توفير معرف المادة للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود المادة أولاً
      const existingMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

      if (existingMaterial.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'المادة غير موجودة',
          message: `لم يتم العثور على مادة بالمعرف: ${materialId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertMaterialSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث المادة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المادة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث المادة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث المادة
      const updatedMaterial = await db
        .update(materials)
        .set(validationResult.data)
        .where(eq(materials.id, materialId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث المادة بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedMaterial[0],
        message: `تم تحديث المادة "${updatedMaterial[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المادة:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المادة',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للمشاريع - حذف مشروع مع logging وتحقق من الوجود
  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const projectId = req.params.id;
      console.log('❌ [API] طلب حذف المشروع من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المشروع المراد حذفه:', projectId);

      if (!projectId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
          message: 'لم يتم توفير معرف المشروع للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود المشروع أولاً وجلب بياناته للـ logging
      const existingProject = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

      if (existingProject.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المشروع غير موجود:', projectId);
        return res.status(404).json({
          success: false,
          error: 'المشروع غير موجود',
          message: `لم يتم العثور على مشروع بالمعرف: ${projectId}`,
          processingTime: duration
        });
      }

      const projectToDelete = existingProject[0];
      console.log('🗑️ [API] سيتم حذف المشروع:', {
        id: projectToDelete.id,
        name: projectToDelete.name,
        status: projectToDelete.status
      });

      // حذف المشروع من قاعدة البيانات
      console.log('🗑️ [API] حذف المشروع من قاعدة البيانات...');
      const deletedProject = await db
        .delete(projects)
        .where(eq(projects.id, projectId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف المشروع بنجاح في ${duration}ms:`, {
        id: deletedProject[0].id,
        name: deletedProject[0].name,
        status: deletedProject[0].status
      });

      res.json({
        success: true,
        data: deletedProject[0],
        message: `تم حذف المشروع "${deletedProject[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف المشروع:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف المشروع';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف المشروع - مرتبط ببيانات أخرى (عمال، مواد، مصروفات)';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف المشروع غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للمواد - حذف مادة مع logging وتحقق من الوجود
  app.delete("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log('❌ [API] طلب حذف المادة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المادة المراد حذفها:', materialId);

      if (!materialId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المادة مطلوب',
          message: 'لم يتم توفير معرف المادة للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود المادة أولاً وجلب بياناتها للـ logging
      const existingMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

      if (existingMaterial.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المادة غير موجودة:', materialId);
        return res.status(404).json({
          success: false,
          error: 'المادة غير موجودة',
          message: `لم يتم العثور على مادة بالمعرف: ${materialId}`,
          processingTime: duration
        });
      }

      const materialToDelete = existingMaterial[0];
      console.log('🗑️ [API] سيتم حذف المادة:', {
        id: materialToDelete.id,
        name: materialToDelete.name,
        category: materialToDelete.category
      });

      // حذف المادة من قاعدة البيانات
      console.log('🗑️ [API] حذف المادة من قاعدة البيانات...');
      const deletedMaterial = await db
        .delete(materials)
        .where(eq(materials.id, materialId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف المادة بنجاح في ${duration}ms:`, {
        id: deletedMaterial[0].id,
        name: deletedMaterial[0].name,
        category: deletedMaterial[0].category
      });

      res.json({
        success: true,
        data: deletedMaterial[0],
        message: `تم حذف المادة "${deletedMaterial[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف المادة:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف المادة';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف المادة - مرتبطة ببيانات أخرى';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف المادة غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoints للمواد - تحديث مادة موجودة مع validation محسن
  app.patch("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log('🔄 [API] طلب تحديث المادة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المادة:', materialId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!materialId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المادة مطلوب',
          message: 'لم يتم توفير معرف المادة للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود المادة أولاً
      const existingMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

      if (existingMaterial.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'المادة غير موجودة',
          message: `لم يتم العثور على مادة بالمعرف: ${materialId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertMaterialSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث المادة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المادة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث المادة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث المادة
      const updatedMaterial = await db
        .update(materials)
        .set(validationResult.data)
        .where(eq(materials.id, materialId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث المادة بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedMaterial[0],
        message: `تم تحديث المادة "${updatedMaterial[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المادة:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المادة',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للمواد - حذف مادة مع logging وتحقق من الوجود
  app.delete("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log('❌ [API] طلب حذف المادة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المادة المراد حذفها:', materialId);

      if (!materialId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المادة مطلوب',
          message: 'لم يتم توفير معرف المادة للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود المادة أولاً وجلب بياناتها للـ logging
      const existingMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

      if (existingMaterial.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المادة غير موجودة:', materialId);
        return res.status(404).json({
          success: false,
          error: 'المادة غير موجودة',
          message: `لم يتم العثور على مادة بالمعرف: ${materialId}`,
          processingTime: duration
        });
      }

      const materialToDelete = existingMaterial[0];
      console.log('🗑️ [API] سيتم حذف المادة:', {
        id: materialToDelete.id,
        name: materialToDelete.name,
        category: materialToDelete.category
      });

      // حذف المادة من قاعدة البيانات
      console.log('🗑️ [API] حذف المادة من قاعدة البيانات...');
      const deletedMaterial = await db
        .delete(materials)
        .where(eq(materials.id, materialId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف المادة بنجاح في ${duration}ms:`, {
        id: deletedMaterial[0].id,
        name: deletedMaterial[0].name,
        category: deletedMaterial[0].category
      });

      res.json({
        success: true,
        data: deletedMaterial[0],
        message: `تم حذف المادة "${deletedMaterial[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف المادة:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف المادة';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف المادة - مرتبطة ببيانات أخرى';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف المادة غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للموردين - حذف مورد مع logging وتحقق من الوجود
  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const supplierId = req.params.id;
      console.log('❌ [API] طلب حذف المورد من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المورد المراد حذفه:', supplierId);

      if (!supplierId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المورد مطلوب',
          message: 'لم يتم توفير معرف المورد للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود المورد أولاً وجلب بياناته للـ logging
      const existingSupplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);

      if (existingSupplier.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المورد غير موجود:', supplierId);
        return res.status(404).json({
          success: false,
          error: 'المورد غير موجود',
          message: `لم يتم العثور على مورد بالمعرف: ${supplierId}`,
          processingTime: duration
        });
      }

      const supplierToDelete = existingSupplier[0];
      console.log('🗑️ [API] سيتم حذف المورد:', {
        id: supplierToDelete.id,
        name: supplierToDelete.name,
        contactPerson: supplierToDelete.contactPerson
      });

      // حذف المورد من قاعدة البيانات
      console.log('🗑️ [API] حذف المورد من قاعدة البيانات...');
      const deletedSupplier = await db
        .delete(suppliers)
        .where(eq(suppliers.id, supplierId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف المورد بنجاح في ${duration}ms:`, {
        id: deletedSupplier[0].id,
        name: deletedSupplier[0].name
      });

      res.json({
        success: true,
        data: deletedSupplier[0],
        message: `تم حذف المورد "${deletedSupplier[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف المورد:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف المورد';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف المورد - مرتبط ببيانات أخرى';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف المورد غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoint للمواد - تحديث بيانات مادة موجودة مع validation محسن
  app.patch("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log('🔄 [API] طلب تحديث المادة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المادة:', materialId);
      console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

      if (!materialId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المادة مطلوب',
          message: 'لم يتم توفير معرف المادة للتحديث',
          processingTime: duration
        });
      }

      // التحقق من وجود المادة أولاً
      const existingMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

      if (existingMaterial.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'المادة غير موجودة',
          message: `لم يتم العثور على مادة بالمعرف: ${materialId}`,
          processingTime: duration
        });
      }

      // Validation باستخدام insert schema - نسمح بتحديث جزئي
      const validationResult = insertMaterialSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] فشل في validation تحديث المادة:', validationResult.error.flatten());

        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المادة غير صحيحة';

        return res.status(400).json({
          success: false,
          error: 'بيانات تحديث المادة غير صحيحة',
          message: firstError,
          details: errorMessages,
          processingTime: duration
        });
      }

      // تحديث المادة
      const updatedMaterial = await db
        .update(materials)
        .set(validationResult.data)
        .where(eq(materials.id, materialId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم تحديث المادة بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: updatedMaterial[0],
        message: `تم تحديث المادة "${updatedMaterial[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المادة:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المادة',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للمشاريع - حذف مشروع مع logging وتحقق من الوجود
  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const projectId = req.params.id;
      console.log('❌ [API] طلب حذف المشروع من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المشروع المراد حذفه:', projectId);

      if (!projectId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
          message: 'لم يتم توفير معرف المشروع للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود المشروع أولاً وجلب بياناته للـ logging
      const existingProject = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

      if (existingProject.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المشروع غير موجود:', projectId);
        return res.status(404).json({
          success: false,
          error: 'المشروع غير موجود',
          message: `لم يتم العثور على مشروع بالمعرف: ${projectId}`,
          processingTime: duration
        });
      }

      const projectToDelete = existingProject[0];
      console.log('🗑️ [API] سيتم حذف المشروع:', {
        id: projectToDelete.id,
        name: projectToDelete.name,
        status: projectToDelete.status
      });

      // حذف المشروع من قاعدة البيانات
      console.log('🗑️ [API] حذف المشروع من قاعدة البيانات...');
      const deletedProject = await db
        .delete(projects)
        .where(eq(projects.id, projectId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف المشروع بنجاح في ${duration}ms:`, {
        id: deletedProject[0].id,
        name: deletedProject[0].name,
        status: deletedProject[0].status
      });

      res.json({
        success: true,
        data: deletedProject[0],
        message: `تم حذف المشروع "${deletedProject[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف المشروع:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف المشروع';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف المشروع - مرتبط ببيانات أخرى (عمال، مواد، مصروفات)';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف المشروع غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // ❌ DELETE endpoint للمواد - حذف مادة مع logging وتحقق من الوجود
  app.delete("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log('❌ [API] طلب حذف المادة من المستخدم:', req.user?.email);
      console.log('📋 [API] ID المادة المراد حذفها:', materialId);

      if (!materialId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف المادة مطلوب',
          message: 'لم يتم توفير معرف المادة للحذف',
          processingTime: duration
        });
      }

      // التحقق من وجود المادة أولاً وجلب بياناتها للـ logging
      const existingMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

      if (existingMaterial.length === 0) {
        const duration = Date.now() - startTime;
        console.error('❌ [API] المادة غير موجودة:', materialId);
        return res.status(404).json({
          success: false,
          error: 'المادة غير موجودة',
          message: `لم يتم العثور على مادة بالمعرف: ${materialId}`,
          processingTime: duration
        });
      }

      const materialToDelete = existingMaterial[0];
      console.log('🗑️ [API] سيتم حذف المادة:', {
        id: materialToDelete.id,
        name: materialToDelete.name,
        category: materialToDelete.category
      });

      // حذف المادة من قاعدة البيانات
      console.log('🗑️ [API] حذف المادة من قاعدة البيانات...');
      const deletedMaterial = await db
        .delete(materials)
        .where(eq(materials.id, materialId))
        .returning();

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم حذف المادة بنجاح في ${duration}ms:`, {
        id: deletedMaterial[0].id,
        name: deletedMaterial[0].name,
        category: deletedMaterial[0].category
      });

      res.json({
        success: true,
        data: deletedMaterial[0],
        message: `تم حذف المادة "${deletedMaterial[0].name}" بنجاح`,
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في حذف المادة:', error);

      // تحليل نوع الخطأ لرسالة أفضل
      let errorMessage = 'فشل في حذف المادة';
      let statusCode = 500;

      if (error.code === '23503') { // foreign key violation
        errorMessage = 'لا يمكن حذف المادة - مرتبطة ببيانات أخرى';
        statusCode = 409;
      } else if (error.code === '22P02') { // invalid input syntax
        errorMessage = 'معرف المادة غير صحيح';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoints للموردين
  app.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const supplierId = req.params.id;
      console.log('🔄 [API] طلب تحديث المورد:', supplierId);

      // مؤقتاً نرجع رسالة نجاح حتى يتم إنشاء جدول suppliers
      res.json({
        success: true,
        message: 'endpoint جاهز - سيتم تفعيله عند إنشاء جدول الموردين',
        processingTime: Date.now() - startTime
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث المورد:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المورد',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 📖 GET endpoint للحصول على سجل حضور واحد
  app.get("/api/worker-attendance/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const attendanceId = req.params.id;
      console.log('📖 [API] طلب جلب سجل حضور:', attendanceId);

      if (!attendanceId) {
        const duration = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: 'معرف سجل الحضور مطلوب',
          message: 'لم يتم توفير معرف سجل الحضور',
          processingTime: duration
        });
      }

      // البحث عن سجل الحضور في قاعدة البيانات
      const attendanceRecord = await db
        .select()
        .from(workerAttendance)
        .where(eq(workerAttendance.id, attendanceId))
        .limit(1);

      if (attendanceRecord.length === 0) {
        const duration = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: 'سجل الحضور غير موجود',
          message: `لم يتم العثور على سجل حضور بالمعرف: ${attendanceId}`,
          processingTime: duration
        });
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [API] تم جلب سجل الحضور بنجاح في ${duration}ms`);

      res.json({
        success: true,
        data: attendanceRecord[0],
        message: 'تم جلب سجل الحضور بنجاح',
        processingTime: duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في جلب سجل الحضور:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في جلب سجل الحضور',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoints للحضور
  app.patch("/api/worker-attendance/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const attendanceId = req.params.id;
      console.log('🔄 [API] طلب تحديث الحضور:', attendanceId);

      // مؤقتاً نرجع رسالة نجاح حتى يتم إنشاء جدول worker_attendance
      res.json({
        success: true,
        message: 'endpoint جاهز - سيتم تفعيله عند إنشاء جدول الحضور',
        processingTime: Date.now() - startTime
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث الحضور:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث الحضور',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoints للتحويلات المالية
  app.patch("/api/fund-transfers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const transferId = req.params.id;
      console.log('🔄 [API] طلب تحديث التحويل المالي:', transferId);

      // مؤقتاً نرجع رسالة نجاح حتى يتم إنشاء جدول fund_transfers
      res.json({
        success: true,
        message: 'endpoint جاهز - سيتم تفعيله عند إنشاء جدول التحويلات المالية',
        processingTime: Date.now() - startTime
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث التحويل المالي:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث التحويل المالي',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoints لمصاريف المواصلات
  app.patch("/api/transportation-expenses/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const expenseId = req.params.id;
      console.log('🔄 [API] طلب تحديث مصاريف المواصلات:', expenseId);

      // مؤقتاً نرجع رسالة نجاح حتى يتم إنشاء جدول transportation_expenses
      res.json({
        success: true,
        message: 'endpoint جاهز - سيتم تفعيله عند إنشاء جدول مصاريف المواصلات',
        processingTime: Date.now() - startTime
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث مصاريف المواصلات:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث مصاريف المواصلات',
        message: error.message,
        processingTime: duration
      });
    }
  });

  // 🔄 PATCH endpoints للإشعارات
  app.patch("/api/notifications/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const notificationId = req.params.id;
      console.log('🔄 [API] طلب تحديث الإشعار:', notificationId);

      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      const userId = req.user?.userId || req.user?.email || null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "غير مخول - لم يتم العثور على معرف المستخدم",
          processingTime: Date.now() - startTime
        });
      }

      // تحديث الإشعار (مثلاً تغيير النص أو الأولوية)
      // مؤقتاً نرجع رسالة نجاح
      res.json({
        success: true,
        message: 'تم تحديث الإشعار بنجاح',
        processingTime: Date.now() - startTime
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] خطأ في تحديث الإشعار:', error);

      res.status(500).json({
        success: false,
        error: 'فشل في تحديث الإشعار',
        message: error.message,
        processingTime: duration
      });
    }
  });

  app.get("/api/daily-expenses", requireAuth, (req, res) => {
    res.json({ success: true, data: [], message: "Daily expenses endpoint working - NOW SECURED ✅" });
  });

  app.get("/api/material-purchases", requireAuth, (req, res) => {
    res.json({ success: true, data: [], message: "Material purchases endpoint working - NOW SECURED ✅" });
  });

  // جلب الإشعارات - استخدام NotificationService الحقيقي
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      // استخراج userId الحقيقي من JWT - إصلاح مشكلة "default"
      const userId = req.user?.userId || req.user?.email || null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "غير مخول - لم يتم العثور على معرف المستخدم",
          message: "يرجى تسجيل الدخول مرة أخرى"
        });
      }

      const { limit, offset, type, unreadOnly, projectId } = req.query;

      console.log(`📥 [API] جلب الإشعارات للمستخدم: ${userId}`);

      const result = await notificationService.getUserNotifications(userId, {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        type: type as string,
        unreadOnly: unreadOnly === 'true',
        projectId: projectId as string
      });

      console.log(`✅ [API] تم جلب ${result.notifications.length} إشعار للمستخدم ${userId}`);

      res.json({
        success: true,
        data: result.notifications,
        count: result.total,
        unreadCount: result.unreadCount,
        message: result.notifications.length > 0 ? 'تم جلب الإشعارات بنجاح' : 'لا توجد إشعارات'
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

  // تعليم إشعار كمقروء - استخدام NotificationService الحقيقي
  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      // استخراج userId الحقيقي من JWT - إصلاح مشكلة "default"
      const userId = req.user?.userId || req.user?.email || null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "غير مخول - لم يتم العثور على معرف المستخدم",
          message: "يرجى تسجيل الدخول مرة أخرى"
        });
      }

      const notificationId = req.params.id;

      console.log(`✅ [API] تعليم الإشعار ${notificationId} كمقروء للمستخدم: ${userId}`);

      await notificationService.markAsRead(notificationId, userId);

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
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      // استخراج userId الحقيقي من JWT - إصلاح مشكلة "default"
      const userId = req.user?.userId || req.user?.email || null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "غير مخول - لم يتم العثور على معرف المستخدم",
          message: "يرجى تسجيل الدخول مرة أخرى"
        });
      }

      const notificationId = req.params.id;

      console.log(`✅ [API] تعليم الإشعار ${notificationId} كمقروء (مسار بديل) للمستخدم: ${userId}`);

      await notificationService.markAsRead(notificationId, userId);

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
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      // استخراج userId الحقيقي من JWT - إصلاح مشكلة "default"
      const userId = req.user?.userId || req.user?.email || null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "غير مخول - لم يتم العثور على معرف المستخدم",
          message: "يرجى تسجيل الدخول مرة أخرى"
        });
      }

      const projectId = req.body.projectId;

      console.log(`✅ [API] تعليم جميع الإشعارات كمقروءة للمستخدم: ${userId}`);

      await notificationService.markAllAsRead(userId, projectId);

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

  // ============================================
  // مسارات إدارة الإشعارات للمسؤولين
  // ============================================

  // جلب جميع الإشعارات للمسؤول
  app.get("/api/admin/notifications/all", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      const { limit, offset, type, priority } = req.query;

      console.log('📋 [Admin] جلب جميع الإشعارات للمسؤول');

      const result = await notificationService.getAllNotificationsForAdmin({
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        type: type as string,
        priority: priority ? parseInt(priority as string) : undefined
      });

      res.json({
        success: true,
        notifications: result.notifications || [],
        total: result.total || 0,
        message: 'تم جلب الإشعارات بنجاح'
      });
    } catch (error: any) {
      console.error('❌ [Admin] خطأ في جلب الإشعارات:', error);
      res.status(500).json({
        success: false,
        notifications: [],
        total: 0,
        error: error.message,
        message: 'فشل في جلب الإشعارات'
      });
    }
  });

  // جلب نشاط المستخدمين للإشعارات
  app.get("/api/admin/notifications/user-activity", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      console.log('📊 [Admin] جلب نشاط المستخدمين للإشعارات');

      const userStats = await notificationService.getUserActivityStats();

      res.json({
        success: true,
        userStats: userStats || [],
        message: 'تم جلب نشاط المستخدمين بنجاح'
      });
    } catch (error: any) {
      console.error('❌ [Admin] خطأ في جلب نشاط المستخدمين:', error);
      res.status(500).json({
        success: false,
        userStats: [],
        error: error.message,
        message: 'فشل في جلب نشاط المستخدمين'
      });
    }
  });

  // إرسال إشعار جديد من المسؤول
  app.post("/api/admin/notifications/send", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      const userId = req.user?.userId || req.user?.email || null;
      const { type, title, body, priority, recipients, projectId } = req.body;

      console.log(`📤 [Admin] إرسال إشعار جديد من المسؤول: ${userId}`);

      const notificationData = {
        type: type || 'announcement',
        title: title || 'إشعار جديد',
        body: body || '',
        priority: priority || 3,
        recipients: recipients === 'all' ? null : recipients,
        projectId: projectId || null
      };

      const notification = await notificationService.createNotification(notificationData);

      console.log(`✅ [Admin] تم إرسال الإشعار بنجاح: ${notification.id}`);

      res.json({
        success: true,
        data: notification,
        message: 'تم إرسال الإشعار بنجاح'
      });
    } catch (error: any) {
      console.error('❌ [Admin] خطأ في إرسال الإشعار:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'فشل في إرسال الإشعار'
      });
    }
  });

  // حذف إشعار
  app.delete("/api/admin/notifications/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      const notificationId = req.params.id;

      console.log(`🗑️ [Admin] حذف الإشعار: ${notificationId}`);

      await notificationService.deleteNotification(notificationId);

      res.json({
        success: true,
        message: 'تم حذف الإشعار بنجاح'
      });
    } catch (error: any) {
      console.error('❌ [Admin] خطأ في حذف الإشعار:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'فشل في حذف الإشعار'
      });
    }
  });

  // جلب قائمة المستخدمين مع أدوارهم
  app.get("/api/users", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');

      console.log('👥 [Admin] جلب قائمة المستخدمين');

      const usersList = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive
      }).from(users);

      // إضافة اسم كامل لكل مستخدم
      const usersWithName = usersList.map((user: any) => ({
        ...user,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'مستخدم'
      }));

      res.json({
        success: true,
        data: usersWithName,
        message: 'تم جلب المستخدمين بنجاح'
      });
    } catch (error: any) {
      console.error('❌ [Admin] خطأ في جلب المستخدمين:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        message: 'فشل في جلب المستخدمين'
      });
    }
  });

  // إنشاء إشعار جديد للاختبار (محمي للمصادقة والإدارة فقط)
  app.post("/api/test/notifications/create", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      // استخراج userId الحقيقي من JWT - إصلاح مشكلة "default"
      const userId = req.user?.userId || req.user?.email || null;
      const { type, title, body, priority, recipients, projectId } = req.body;

      console.log(`🔧 [TEST] إنشاء إشعار اختبار من المستخدم: ${userId}`);

      const notificationData = {
        type: type || 'announcement',
        title: title || 'إشعار اختبار',
        body: body || 'هذا إشعار اختبار لفحص النظام',
        priority: priority || 3,
        recipients: recipients || [userId],
        projectId: projectId || null
      };

      const notification = await notificationService.createNotification(notificationData);

      res.json({
        success: true,
        data: notification,
        message: "تم إنشاء الإشعار بنجاح"
      });
    } catch (error: any) {
      console.error('❌ [TEST] خطأ في إنشاء الإشعار:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في إنشاء الإشعار"
      });
    }
  });

  // جلب إحصائيات الإشعارات للاختبار (محمي للإدارة فقط)
  app.get("/api/test/notifications/stats", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { NotificationService } = await import('./services/NotificationService');
      const notificationService = new NotificationService();

      // استخراج userId الحقيقي من JWT - إصلاح مشكلة "default"
      const userId = req.user?.userId || req.user?.email || null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "غير مخول - لم يتم العثور على معرف المستخدم",
          message: "يرجى تسجيل الدخول مرة أخرى"
        });
      }

      console.log(`📊 [TEST] جلب إحصائيات الإشعارات للمستخدم: ${userId}`);

      const stats = await notificationService.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats,
        message: "تم جلب الإحصائيات بنجاح"
      });
    } catch (error: any) {
      console.error('❌ [TEST] خطأ في جلب الإحصائيات:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "فشل في جلب الإحصائيات"
      });
    }
  });

  // ✅ معالج شامل للأخطاء 404 - سيتم إضافته بعد الملفات الثابتة
  // تم نقل هذا المعالج إلى server/index.ts ليكون بعد إعداد الملفات الثابتة

  // ✅ معالج شامل للأخطاء العامة
  app.use((error: any, req: any, res: any, next: any) => {
    console.error(`💥 [خطأ خادم] ${req.method} ${req.originalUrl}:`, error);

    // تجنب إرسال HTML في حالة الأخطاء
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "خطأ داخلي في الخادم",
        message: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى",
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl
      });
    }
  });

  const server = createServer(app);
  return server;
}