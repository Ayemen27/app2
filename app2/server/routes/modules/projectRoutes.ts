/**
 * مسارات إدارة المشاريع
 * Project Management Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, and, sql, gte, lt, lte, desc } from 'drizzle-orm';
import { db } from '../../db';
import { 
  projects, workers, materials, suppliers, materialPurchases, workerAttendance, 
  fundTransfers, transportationExpenses, dailyExpenseSummaries, tools, toolMovements,
  workerTransfers, workerMiscExpenses, workerBalances, projectFundTransfers,
  enhancedInsertProjectSchema, enhancedInsertWorkerSchema,
  insertMaterialSchema, insertSupplierSchema, insertMaterialPurchaseSchema,
  insertWorkerAttendanceSchema, insertFundTransferSchema, insertTransportationExpenseSchema,
  insertDailyExpenseSummarySchema, insertToolSchema, insertToolMovementSchema,
  insertWorkerTransferSchema, insertWorkerMiscExpenseSchema, insertWorkerBalanceSchema
} from '../../../shared/schema';
import { requireAuth } from '../../middleware/auth';

export const projectRouter = express.Router();

// تطبيق المصادقة على جميع مسارات المشاريع
projectRouter.use(requireAuth);

/**
 * 📊 جلب قائمة المشاريع
 * GET /api/projects
 */
projectRouter.get('/', async (req: Request, res: Response) => {
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

/**
 * 📊 جلب المشاريع مع الإحصائيات
 * GET /api/projects/with-stats
 */
projectRouter.get('/with-stats', async (req: Request, res: Response) => {
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

        // حساب التحويلات الصادرة إلى مشاريع أخرى (تُحسب كمصاريف)
        const outgoingProjectTransfersStats = await db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as outgoing_project_transfers
          FROM project_fund_transfers 
          WHERE from_project_id = ${projectId}
        `);

        // حساب التحويلات الواردة من مشاريع أخرى (تُحسب كدخل إضافي)
        const incomingProjectTransfersStats = await db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as incoming_project_transfers
          FROM project_fund_transfers 
          WHERE to_project_id = ${projectId}
        `);

        // استخراج القيم مع تنظيف البيانات المحسن
        const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || '0', 'integer');
        const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || '0', 'integer');
        const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || '0');
        const materialPurchases = cleanDbValue(materialStats.rows[0]?.material_purchases || '0', 'integer');
        const workerWages = cleanDbValue(workerWagesStats.rows[0]?.worker_wages || '0');
        const completedDays = cleanDbValue(workerWagesStats.rows[0]?.completed_days || '0', 'integer');
        const fundTransfersIncome = cleanDbValue(fundTransfersStats.rows[0]?.total_income || '0');
        const transportExpenses = cleanDbValue(transportStats.rows[0]?.transport_expenses || '0');
        const workerTransfers = cleanDbValue(workerTransfersStats.rows[0]?.worker_transfers || '0');
        const miscExpenses = cleanDbValue(miscExpensesStats.rows[0]?.misc_expenses || '0');
        const outgoingProjectTransfers = cleanDbValue(outgoingProjectTransfersStats.rows[0]?.outgoing_project_transfers || '0');
        const incomingProjectTransfers = cleanDbValue(incomingProjectTransfersStats.rows[0]?.incoming_project_transfers || '0');

        // فحص إضافي للتأكد من منطقية العدد
        if (totalWorkers > 1000) {
          console.warn(`⚠️ [API] عدد عمال غير منطقي للمشروع ${project.name}: ${totalWorkers}`);
        }

        // حساب إجمالي الدخل (تحويلات العهدة + التحويلات من مشاريع أخرى)
        const totalIncome = fundTransfersIncome + incomingProjectTransfers;
        
        // حساب إجمالي المصاريف (تشمل التحويلات إلى مشاريع أخرى)
        const totalExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses + outgoingProjectTransfers;
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

/**
 * 📝 إضافة مشروع جديد
 * POST /api/projects
 */
projectRouter.post('/', async (req: Request, res: Response) => {
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

/**
 * 🔍 جلب مشروع محدد
 * GET /api/projects/:id
 */
projectRouter.get('/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    console.log('🔍 [API] طلب جلب مشروع محدد من المستخدم:', req.user?.email);
    console.log('📋 [API] معرف المشروع:', id);

    // التحقق من وجود معرف المشروع
    if (!id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        message: 'لم يتم توفير معرف المشروع',
        processingTime: duration
      });
    }

    // البحث عن المشروع في قاعدة البيانات
    console.log('🔍 [API] البحث عن المشروع في قاعدة البيانات...');
    const projectResult = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

    if (projectResult.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] المشروع غير موجود:', id);
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود',
        message: `لم يتم العثور على مشروع بالمعرف: ${id}`,
        processingTime: duration
      });
    }

    const project = projectResult[0];

    // جلب إحصائيات المشروع (optional - يمكن إضافة query parameter للتحكم بها)
    const includeStats = req.query.includeStats === 'true';
    let projectWithStats = { ...project };

    if (includeStats) {
      try {
        console.log('📊 [API] حساب إحصائيات المشروع...');

        // دالة مساعدة لتنظيف القيم
        const cleanDbValue = (value: any, type: 'integer' | 'decimal' = 'decimal'): number => {
          if (value === null || value === undefined) return 0;
          const strValue = String(value).trim();
          const parsed = type === 'integer' ? parseInt(strValue, 10) : parseFloat(strValue);
          return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed);
        };

        // حساب الإحصائيات بشكل متوازي
        const [
          workersStats,
          materialStats,
          workerWagesStats,
          fundTransfersStats,
          transportStats,
          workerTransfersStats,
          miscExpensesStats
        ] = await Promise.all([
          db.execute(sql`
            SELECT 
              COUNT(DISTINCT wa.worker_id) as total_workers,
              COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
            FROM worker_attendance wa
            INNER JOIN workers w ON wa.worker_id = w.id
            WHERE wa.project_id = ${id}
          `),
          db.execute(sql`
            SELECT 
              COUNT(*) as material_purchases,
              COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
            FROM material_purchases 
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT 
              COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
              COUNT(DISTINCT date) as completed_days
            FROM worker_attendance 
            WHERE project_id = ${id} AND is_present = true
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
            FROM fund_transfers 
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
            FROM transportation_expenses 
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
            FROM worker_transfers 
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
            FROM worker_misc_expenses 
            WHERE project_id = ${id}
          `)
        ]);

        // استخراج القيم وتنظيفها
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

        // حساب إجمالي المصروفات والرصيد
        const totalExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses;
        const currentBalance = totalIncome - totalExpenses;

        projectWithStats = {
          ...project,
          stats: {
            totalWorkers: Math.max(0, totalWorkers),
            totalExpenses: Math.max(0, totalExpenses),
            totalIncome: Math.max(0, totalIncome),
            currentBalance: currentBalance,
            activeWorkers: Math.max(0, activeWorkers),
            completedDays: Math.max(0, completedDays),
            materialPurchases: Math.max(0, materialPurchases),
            lastActivity: project.createdAt.toISOString()
          }
        } as any;

        console.log('✅ [API] تم حساب إحصائيات المشروع بنجاح');
      } catch (statsError) {
        console.error('⚠️ [API] خطأ في حساب إحصائيات المشروع:', statsError);
        // إرجاع المشروع بدون إحصائيات في حالة فشل حساب الإحصائيات
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب المشروع بنجاح في ${duration}ms:`, {
      id: project.id,
      name: project.name,
      status: project.status,
      includeStats
    });

    res.json({
      success: true,
      data: projectWithStats,
      message: `تم جلب المشروع "${project.name}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب المشروع:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في جلب المشروع';
    let statusCode = 500;

    if (error.code === '22P02') { // invalid input syntax for UUID
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

/**
 * 🔄 تعديل مشروع
 * PATCH /api/projects/:id
 */
projectRouter.patch('/:id', async (req: Request, res: Response) => {
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

/**
 * 🗑️ حذف مشروع
 * DELETE /api/projects/:id
 */
projectRouter.delete('/:id', async (req: Request, res: Response) => {
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

/**
 * 📊 مسارات فرعية للمشروع
 * Project sub-routes
 */

/**
 * 📊 جلب تحويلات العهدة لمشروع محدد
 * GET /api/projects/:projectId/fund-transfers
 */
projectRouter.get('/:projectId/fund-transfers', async (req: Request, res: Response) => {
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

/**
 * 📊 جلب حضور العمال لمشروع محدد
 * GET /api/projects/:projectId/worker-attendance
 */
projectRouter.get('/:projectId/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;

    console.log(`📊 [API] جلب حضور العمال للمشروع: ${projectId}`);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const attendance = await db.select({
      id: workerAttendance.id,
      workerId: workerAttendance.workerId,
      projectId: workerAttendance.projectId,
      date: workerAttendance.date,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      isPresent: workerAttendance.isPresent,
      createdAt: workerAttendance.createdAt,
      workerName: workers.name
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
    .where(eq(workerAttendance.projectId, projectId))
    .orderBy(workerAttendance.date);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);

    res.json({
      success: true,
      data: attendance,
      message: `تم جلب ${attendance.length} سجل حضور للمشروع`,
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

/**
 * 📊 جلب مشتريات المواد لمشروع محدد
 * GET /api/projects/:projectId/material-purchases
 */
projectRouter.get('/:projectId/material-purchases', async (req: Request, res: Response) => {
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

/**
 * 📊 جلب مصاريف النقل لمشروع محدد
 * GET /api/projects/:projectId/transportation-expenses
 */
projectRouter.get('/:projectId/transportation-expenses', async (req: Request, res: Response) => {
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

/**
 * 📊 جلب المصاريف المتنوعة للعمال لمشروع محدد
 * GET /api/projects/:projectId/worker-misc-expenses
 */
projectRouter.get('/:projectId/worker-misc-expenses', async (req: Request, res: Response) => {
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

/**
 * 🔄 جلب التحويلات الواردة لمشروع محدد (من مشاريع أخرى)
 * GET /api/project-fund-transfers?toProjectId=:projectId
 */
projectRouter.get('/fund-transfers/incoming/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;

    console.log(`📥 [API] جلب التحويلات الواردة للمشروع: ${projectId}`);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const transfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      transferDate: projectFundTransfers.transferDate,
      description: projectFundTransfers.description,
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.toProjectId, projectId))
    .orderBy(desc(projectFundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل وارد في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل وارد بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب التحويلات الواردة:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب التحويلات الواردة',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 🔄 جلب التحويلات الصادرة لمشروع محدد (إلى مشاريع أخرى)
 * GET /api/project-fund-transfers?fromProjectId=:projectId
 */
projectRouter.get('/fund-transfers/outgoing/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;

    console.log(`📤 [API] جلب التحويلات الصادرة للمشروع: ${projectId}`);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const transfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      transferDate: projectFundTransfers.transferDate,
      description: projectFundTransfers.description,
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.fromProjectId, projectId))
    .orderBy(desc(projectFundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل صادر في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل صادر بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب التحويلات الصادرة:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب التحويلات الصادرة',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب حوالات العمال لمشروع محدد
 * GET /api/projects/:projectId/worker-transfers
 */
projectRouter.get('/:projectId/worker-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;

    console.log(`📊 [API] جلب حوالات العمال للمشروع: ${projectId}`);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const transfers = await db.select({
      id: workerTransfers.id,
      workerId: workerTransfers.workerId,
      projectId: workerTransfers.projectId,
      amount: workerTransfers.amount,
      recipientName: workerTransfers.recipientName,
      recipientPhone: workerTransfers.recipientPhone,
      transferMethod: workerTransfers.transferMethod,
      transferNumber: workerTransfers.transferNumber,
      transferDate: workerTransfers.transferDate,
      notes: workerTransfers.notes,
      createdAt: workerTransfers.createdAt,
      workerName: workers.name
    })
    .from(workerTransfers)
    .leftJoin(workers, eq(workerTransfers.workerId, workers.id))
    .where(eq(workerTransfers.projectId, projectId))
    .orderBy(workerTransfers.transferDate);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} حولة عمال في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} حولة عمال للمشروع`,
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

/**
 * 🔍 جلب التحويلات الحقيقية بين المشاريع (للتشخيص)
 * GET /api/projects/:projectId/actual-transfers
 */
projectRouter.get('/:projectId/actual-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;

    console.log(`🔍 [API] جلب التحويلات الحقيقية للمشروع: ${projectId}`);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    // جلب التحويلات الواردة الحقيقية
    const incomingTransfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      createdAt: projectFundTransfers.createdAt,
      direction: sql`'incoming'`.as('direction'),
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.toProjectId, projectId))
    .orderBy(desc(projectFundTransfers.transferDate));

    // جلب التحويلات الصادرة الحقيقية
    const outgoingTransfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      createdAt: projectFundTransfers.createdAt,
      direction: sql`'outgoing'`.as('direction'),
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.fromProjectId, projectId))
    .orderBy(desc(projectFundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${incomingTransfers.length} تحويل وارد و ${outgoingTransfers.length} تحويل صادر في ${duration}ms`);

    res.json({
      success: true,
      data: {
        incoming: incomingTransfers,
        outgoing: outgoingTransfers,
        summary: {
          totalIncoming: incomingTransfers.length,
          totalOutgoing: outgoingTransfers.length,
          incomingAmount: incomingTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0),
          outgoingAmount: outgoingTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0)
        }
      },
      message: `تم جلب ${incomingTransfers.length + outgoingTransfers.length} تحويل حقيقي للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب التحويلات الحقيقية:', error);
    res.status(500).json({
      success: false,
      data: { incoming: [], outgoing: [], summary: {} },
      error: error.message,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب الملخص اليومي للمشروع - جلب الملخص المالي ليوم محدد
 * GET /api/projects/:id/daily-summary/:date
 */
projectRouter.get('/:id/daily-summary/:date', async (req: Request, res: Response) => {
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
        total_worker_transfers: sql`COALESCE(CAST(${dailyExpenseSummaries.totalWorkerTransfers} AS DECIMAL), 0)`,
        total_worker_misc_expenses: sql`COALESCE(CAST(${dailyExpenseSummaries.totalWorkerMiscExpenses} AS DECIMAL), 0)`,
        total_income: dailyExpenseSummaries.totalIncome,
        total_expenses: dailyExpenseSummaries.totalExpenses,
        remaining_balance: dailyExpenseSummaries.remainingBalance,
        notes: dailyExpenseSummaries.notes,
        created_at: dailyExpenseSummaries.createdAt,
        updated_at: dailyExpenseSummaries.updatedAt,
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

/**
 * 📊 جلب المصاريف اليومية للمشروع
 * GET /api/projects/:projectId/daily-expenses/:date
 */
projectRouter.get('/:projectId/daily-expenses/:date', async (req: Request, res: Response) => {
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

    // 💰 جلب الرصيد المرحل من اليوم السابق
    let carriedForward = 0;
    let carriedForwardSource = 'none';

    try {
      console.log(`💰 [API] حساب الرصيد المرحل لتاريخ: ${date}`);

      // حساب التاريخ السابق
      const currentDate = new Date(date);
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      console.log(`💰 [API] البحث عن الرصيد المتبقي ليوم: ${previousDateStr}`);

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
          carriedForward = summaryBalance;
          carriedForwardSource = 'summary';
          console.log(`💰 [API] تم العثور على ملخص لليوم السابق: ${carriedForward}`);
        } else {
          // إذا كان الملخص لتاريخ أقدم، احسب من ذلك التاريخ إلى اليوم السابق
          console.log(`💰 [API] آخر ملخص محفوظ في ${summaryDate}, حساب تراكمي إلى ${previousDateStr}`);

          const startFromDate = new Date(summaryDate);
          startFromDate.setDate(startFromDate.getDate() + 1);
          const startFromStr = startFromDate.toISOString().split('T')[0];

          // حساب تراكمي من startFromStr إلى previousDateStr
          const cumulativeBalance = await calculateCumulativeBalance(projectId, startFromStr, previousDateStr);
          carriedForward = summaryBalance + cumulativeBalance;
          carriedForwardSource = 'computed-from-summary';
          console.log(`💰 [API] رصيد تراكمي من ${summaryDate} (${summaryBalance}) + ${cumulativeBalance} = ${carriedForward}`);
        }
      } else {
        // لا يوجد ملخص محفوظ، حساب تراكمي من البداية
        console.log(`💰 [API] لا يوجد ملخص محفوظ، حساب تراكمي من البداية`);
        carriedForward = await calculateCumulativeBalance(projectId, null, previousDateStr);
        carriedForwardSource = 'computed-full';
        console.log(`💰 [API] رصيد تراكمي كامل: ${carriedForward}`);
      }
    } catch (error) {
      console.warn(`⚠️ [API] خطأ في حساب الرصيد المرحل، استخدام القيمة الافتراضية 0:`, error);
      carriedForward = 0;
      carriedForwardSource = 'error';
    }

    // 💡 الحساب الصحيح: الرصيد المرحل + الدخل - المصروفات
    const remainingBalance = carriedForward + totalIncome - totalExpenses;

    const responseData = {
      date,
      projectName: projectInfo[0]?.name || 'مشروع غير معروف',
      projectId,
      carriedForward: parseFloat(carriedForward.toFixed(2)),
      carriedForwardSource,
      totalIncome,
      totalExpenses,
      remainingBalance: parseFloat(remainingBalance.toFixed(2)),
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

/**
 * 💰 جلب الرصيد المتبقي من اليوم السابق
 * GET /api/projects/:projectId/previous-balance/:date
 */
projectRouter.get('/:projectId/previous-balance/:date', async (req: Request, res: Response) => {
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

/**
 * 💰 دالة مساعدة لحساب الرصيد التراكمي
 * Helper function for calculating cumulative balance
 */
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

console.log('🏗️ [ProjectRouter] تم تهيئة مسارات إدارة المشاريع');

export default projectRouter;