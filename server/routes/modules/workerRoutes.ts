/**
 * مسارات إدارة العمال
 * Worker Management Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, sql, and, or } from 'drizzle-orm';
import { db } from '../../db.js';
import {
  workers, workerAttendance, workerTransfers, workerMiscExpenses, workerBalances,
  transportationExpenses, enhancedInsertWorkerSchema, insertWorkerAttendanceSchema,
  insertWorkerTransferSchema, insertWorkerMiscExpenseSchema, workerTypes
} from '@shared/schema';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { getAuthUser } from '../../internal/auth-user.js';
import { FinancialLedgerService } from '../../services/FinancialLedgerService.js';
import { attachAccessibleProjects, ProjectAccessRequest, requireProjectAccess } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';
import { inArray } from 'drizzle-orm';

export const workerRouter = express.Router();

function checkProjectAccess(req: Request, projectId: string | null | undefined, allowNullProject: boolean = false): { allowed: boolean; isAdmin: boolean } {
  const accessReq = req as ProjectAccessRequest;
  const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
  if (isAdminUser) return { allowed: true, isAdmin: true };
  if (!projectId) return { allowed: allowNullProject, isAdmin: false };
  const accessibleIds = accessReq.accessibleProjectIds ?? [];
  if (!accessibleIds.includes(projectId)) return { allowed: false, isAdmin: false };
  return { allowed: true, isAdmin: false };
}

/**
 * 📋 جلب أنواع العمال - بدون مصادقة (بيانات عامة)
 * GET /worker-types
 */
workerRouter.get('/worker-types', async (req: Request, res: Response) => {
  try {
    const allWorkerTypes = await db.select().from(workerTypes).orderBy(workerTypes.name);

    res.json({ 
      success: true, 
      data: allWorkerTypes, 
      message: "تم جلب أنواع العمال بنجاح" 
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب أنواع العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: "فشل في جلب أنواع العمال"
    });
  }
});

// تطبيق المصادقة وتحميل المشاريع المتاحة على جميع مسارات العمال (بعد الـ public endpoints)
workerRouter.use(requireAuth);
workerRouter.use(attachAccessibleProjects);

/**
 * 👷 جلب قائمة العمال
 * GET /api/workers
 */
import { sendSuccess, sendError } from '../../middleware/api-response.js';

workerRouter.get('/workers', async (req: Request, res: Response) => {
  try {
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    
    let workersList;
    if (isAdminUser) {
      workersList = await db.select().from(workers).orderBy(workers.name);
    } else {
      const userId = accessReq.user?.user_id;
      if (!userId) {
        workersList = [];
      } else {
        workersList = await db.select().from(workers)
          .where(eq(workers.created_by, userId))
          .orderBy(workers.name);
      }
    }
    console.log(`👷 [API] isAdmin: ${isAdminUser}, userId: ${accessReq.user?.user_id}, total: ${workersList.length}`);
    console.log(`👷 [API] تم جلب ${workersList.length} عامل`);
    res.json({
      success: true,
      data: workersList,
      message: `تم جلب ${workersList.length} عامل بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب العمال:', error);
    res.status(500).json({
      success: false,
      error: "فشل في جلب قائمة العمال",
      message: error.message
    });
  }
});

/**
 * 👷‍♂️ إضافة عامل جديد
 * POST /api/workers
 */
workerRouter.post('/workers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('👷 [API] طلب إضافة عامل جديد من المستخدم:', req.user?.email);
    console.log('📋 [API] بيانات العامل المرسلة:', req.body);

    if (req.body.project_id) {
      const { allowed } = checkProjectAccess(req, req.body.project_id);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
      }
    }

    // Validation باستخدام enhanced schema
    const validationResult = enhancedInsertWorkerSchema.safeParse(req.body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    console.log('✅ [API] نجح validation العامل');

    const userId = getAuthUser(req)?.user_id;
    const workerData = { ...validationResult.data, created_by: userId || null };

    console.log('💾 [API] حفظ العامل في قاعدة البيانات...');
    const newWorker = await db.insert(workers).values(workerData).returning();

    // إضافة رصيد مبدئي للعامل في جميع المشاريع النشطة لتجنب جلب الإحصائيات المكثف لاحقاً
    try {
      const activeProjects = await db.execute(sql`SELECT id FROM projects WHERE status = 'active' OR status = 'in_progress'`);
      if (activeProjects.rows.length > 0) {
        const balanceEntries = activeProjects.rows.map((p: any) => ({
          worker_id: newWorker[0].id,
          project_id: p.id,
          totalEarned: '0',
          totalPaid: '0',
          totalTransferred: '0',
          currentBalance: '0'
        }));
        await db.insert(workerBalances).values(balanceEntries as any);
      }
    } catch (e) {
      console.error('⚠️ [API] فشل في إنشاء أرصدة مبدئية للعامل:', e);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء العامل بنجاح في ${duration}ms:`, {
      id: newWorker[0].id,
      name: newWorker[0].name,
      type: newWorker[0].type,
      dailyWage: newWorker[0].dailyWage
    });

    res.status(201).json({
      success: true,
      data: newWorker[0],
      message: `تم إنشاء العامل "${newWorker[0].name}" (${newWorker[0].type}) بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إنشاء العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في إنشاء العامل';
    let statusCode = 500;

    if (error.code === '23505') { // duplicate key
      errorMessage = 'اسم العامل موجود مسبقاً';
      statusCode = 409;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات العامل ناقصة';
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
 * 🔍 البحث عن عامل بالاسم أو معرف
 * GET /api/workers/search/:query
 */
workerRouter.get('/workers/search/:query', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const query = req.params.query?.trim().toLowerCase();
    if (!query || query.length < 1) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'البحث مطلوب',
        message: 'الرجاء إدخال اسم أو معرف العامل للبحث',
        processingTime: duration
      });
    }

    console.log(`🔍 [API] البحث عن عامل: "${query}"`);

    // البحث في الاسم أو المعرف
    let searchResults = await db.select().from(workers).where(
      sql`LOWER(${workers.name}) LIKE LOWER('%' || ${query} || '%') OR LOWER(${workers.id}) LIKE LOWER('%' || ${query} || '%')`
    );

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser) {
      const accessibleIds = accessReq.accessibleProjectIds ?? [];
      const idSet = new Set(accessibleIds);
      searchResults = searchResults.filter((w: any) => w.project_id && idSet.has(w.project_id));
    }

    if (searchResults.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالبحث عن: "${query}"`,
        processingTime: duration
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم العثور على ${searchResults.length} عامل بنجاح`);

    res.json({
      success: true,
      data: searchResults,
      message: `تم العثور على ${searchResults.length} عامل`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في البحث عن عامل:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في البحث',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 🔍 جلب عامل محدد
 * GET /api/workers/:id
 */
workerRouter.get('/workers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    console.log('🔍 [API] طلب جلب عامل محدد:', worker_id);

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل',
        processingTime: duration
      });
    }

    const worker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (worker.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && worker[0].created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا العامل' });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب العامل بنجاح في ${duration}ms:`, {
      id: worker[0].id,
      name: worker[0].name,
      type: worker[0].type
    });

    res.json({
      success: true,
      data: worker[0],
      message: `تم جلب العامل "${worker[0].name}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب العامل:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب العامل',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * ✏️ تعديل عامل
 * PATCH /api/workers/:id
 */
workerRouter.patch('/workers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    console.log('🔄 [API] طلب تحديث العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID العامل:', worker_id);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل للتحديث',
        processingTime: duration
      });
    }

    const existingWorker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (existingWorker.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] العامل غير موجود:', worker_id);
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && existingWorker[0].created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا العامل' });
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

    // التحقق مما إذا كان يتم تحديث اليومية
    const oldDailyWage = existingWorker[0].dailyWage;
    const newDailyWage = validationResult.data.dailyWage;
    const isDailyWageChanged = newDailyWage && newDailyWage !== oldDailyWage;

    // تحديث العامل في قاعدة البيانات
    console.log('💾 [API] تحديث العامل في قاعدة البيانات...');
    const [updatedWorker] = await db
      .update(workers)
      .set(validationResult.data)
      .where(eq(workers.id, worker_id))
      .returning();

    // إذا تم تغيير اليومية، نقوم بتحديث جميع سجلات الحضور السابقة وإعادة حساب الأرصدة
    let attendanceUpdatedCount = 0;
    if (isDailyWageChanged) {
      console.log(`💰 [API] تم تغيير اليومية من ${oldDailyWage} إلى ${newDailyWage} - جاري تحديث جميع سجلات الحضور السابقة وإعادة الحساب...`);
      
      // عملية واحدة لتحديث كافة السجلات وإعادة حساب القيم المالية
      const attendanceUpdateResult = await db.execute(sql`
        UPDATE worker_attendance
        SET 
          daily_wage = ${newDailyWage},
          actual_wage = CAST(${newDailyWage} AS DECIMAL(15,2)) * COALESCE(work_days, 0),
          total_pay = CAST(${newDailyWage} AS DECIMAL(15,2)) * COALESCE(work_days, 0),
          remaining_amount = (CAST(${newDailyWage} AS DECIMAL(15,2)) * COALESCE(work_days, 0)) - COALESCE(paid_amount, 0)
        WHERE worker_id = ${worker_id}
      `);
      
      attendanceUpdatedCount = attendanceUpdateResult.rowCount || 0;
      console.log(`✅ [API] تم تحديث ${attendanceUpdatedCount} سجل حضور بالأجر الجديد`);

      // تحديث أرصدة العامل في جميع المشاريع المرتبطة بشكل فوري
      await db.execute(sql`
        UPDATE worker_balances wb
        SET 
          total_earned = COALESCE((
            SELECT SUM(CAST(total_pay AS DECIMAL(15,2)))
            FROM worker_attendance wa
            WHERE wa.worker_id = wb.worker_id AND wa.project_id = wb.project_id
          ), 0),
          current_balance = COALESCE((
            SELECT SUM(CAST(total_pay AS DECIMAL(15,2)))
            FROM worker_attendance wa
            WHERE wa.worker_id = wb.worker_id AND wa.project_id = wb.project_id
          ), 0) - COALESCE(wb.total_paid, 0) - COALESCE(wb.total_transferred, 0),
          last_updated = NOW()
        WHERE wb.worker_id = ${worker_id}
      `);
      console.log('✅ [API] تم إعادة حساب وتحديث كافة أرصدة العامل بنجاح');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث العامل بنجاح في ${duration}ms:`, {
      id: updatedWorker.id,
      name: updatedWorker.name,
      dailyWage: updatedWorker.dailyWage,
      attendanceRecordsUpdated: attendanceUpdatedCount
    });

    res.json({
      success: true,
      data: updatedWorker,
      message: isDailyWageChanged 
        ? `تم تحديث الأجر وتعديل ${attendanceUpdatedCount} سجل حضور وإعادة حساب الأرصدة بنجاح`
        : `تم تحديث بيانات العامل بنجاح`,
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
 * 🗑️ حذف عامل
 * DELETE /api/workers/:id
 * يتطلب صلاحيات مدير
 */
workerRouter.delete('/workers/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    console.log('🗑️ [API] طلب حذف العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID العامل:', worker_id);

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود العامل أولاً وجلب بياناته للـ logging
    const existingWorker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (existingWorker.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] العامل غير موجود:', worker_id);
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const workerToDelete = existingWorker[0];

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && workerToDelete.created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لحذف هذا العامل' });
    }

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
      project_id: workerAttendance.project_id
    })
    .from(workerAttendance)
    .where(eq(workerAttendance.worker_id, worker_id))
    .limit(5); // جلب 5 سجلات كحد أقصى للمعاينة

    if (attendanceRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي سجلات الحضور
      const totalAttendanceCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(workerAttendance)
      .where(eq(workerAttendance.worker_id, worker_id));

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
      .where(eq(workerTransfers.worker_id, worker_id))
      .limit(1);

    if (transferRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي التحويلات المالية
      const totalTransfersCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(workerTransfers)
      .where(eq(workerTransfers.worker_id, worker_id));

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
      .where(eq(transportationExpenses.worker_id, worker_id))
      .limit(1);

    if (transportRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي مصاريف النقل
      const totalTransportCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(transportationExpenses)
      .where(eq(transportationExpenses.worker_id, worker_id));

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
      .where(eq(workerBalances.worker_id, worker_id))
      .limit(1);

    if (balanceRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي سجلات الأرصدة
      const totalBalanceCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(workerBalances)
      .where(eq(workerBalances.worker_id, worker_id));

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
      .where(eq(workers.id, worker_id))
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
      errorMessage = 'لا يمكن حذف العامل لوجود سجلات مرتبطة لم يتم اكتشافها مسبقاً';
      statusCode = 409;
      userAction = 'تحقق من جميع السجلات المرتبطة بالعامل في النظام وقم بحذفها أولاً';

      relatedInfo = {
        raceConditionDetected: true,
        constraintViolated: error.constraint || 'غير محدد',
        affectedTable: error.table || 'غير محدد',
        affectedColumn: error.column || 'غير محدد'
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
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: `خطأ في حذف العامل: ${error.message}`,
      userAction,
      processingTime: duration,
      troubleshooting: relatedInfo
    });
  }
});

// ===========================================
// Worker Transfers Routes (تحويلات العمال)
// ===========================================

/**
 * 🔄 تحديث تحويل عامل موجود
 * PATCH /worker-transfers/:id
 */
workerRouter.patch('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🔄 [API] طلب تحديث تحويل العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID تحويل العامل:', transferId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!transferId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف تحويل العامل مطلوب',
        message: 'لم يتم توفير معرف تحويل العامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود تحويل العامل أولاً
    const existingTransfer = await db.select().from(workerTransfers).where(eq(workerTransfers.id, transferId)).limit(1);

    if (existingTransfer.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'تحويل العامل غير موجود',
        message: `لم يتم العثور على تحويل عامل بالمعرف: ${transferId}`,
        processingTime: duration
      });
    }

    const { allowed: transferPatchAllowed } = checkProjectAccess(req, existingTransfer[0].project_id);
    if (!transferPatchAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا التحويل' });
    }

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.transferDate === undefined) {
      body.transferDate = body.selectedDate;
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerTransferSchema.partial().safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحديث تحويل العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث تحويل العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث تحويل العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    // تحديث تحويل العامل
    const updatedTransfer = await db
      .update(workerTransfers)
      .set(validationResult.data)
      .where(eq(workerTransfers.id, transferId))
      .returning();

    const t = updatedTransfer[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('worker_transfers', transferId, 'تعديل تحويل عامل', getAuthUser(req)?.user_id);
      return FinancialLedgerService.recordWorkerTransfer(
        t.project_id, parseFloat(t.amount), t.transferDate, t.id, getAuthUser(req)?.user_id
      );
    }, 'worker-transfers/PATCH');

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث تحويل العامل بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: updatedTransfer[0],
      message: `تم تحديث تحويل العامل بقيمة ${updatedTransfer[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث تحويل العامل:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في تحديث تحويل العامل',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 🗑️ حذف تحويل عامل
 * DELETE /worker-transfers/:id
 */
workerRouter.delete('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🗑️ [API] طلب حذف حوالة العامل:', transferId);
    console.log('👤 [API] المستخدم:', req.user?.email);

    if (!transferId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف حوالة العامل مطلوب',
        message: 'لم يتم توفير معرف الحوالة للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود الحوالة أولاً
    const existingTransfer = await db.select().from(workerTransfers).where(eq(workerTransfers.id, transferId)).limit(1);

    if (existingTransfer.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] حوالة العامل غير موجودة:', transferId);
      return res.status(404).json({
        success: false,
        error: 'حوالة العامل غير موجودة',
        message: `لم يتم العثور على حوالة بالمعرف: ${transferId}`,
        processingTime: duration
      });
    }

    const { allowed: transferDeleteAllowed } = checkProjectAccess(req, existingTransfer[0].project_id);
    if (!transferDeleteAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لحذف هذا التحويل' });
    }

    const transferToDelete = existingTransfer[0];
    console.log('🗑️ [API] سيتم حذف حوالة العامل:', {
      id: transferToDelete.id,
      worker_id: transferToDelete.worker_id,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('worker_transfers', transferId, 'حذف', getAuthUser(req)?.user_id).then(() => ''),
      'worker-transfers/DELETE'
    );

    // حذف حوالة العامل من قاعدة البيانات
    console.log('🗑️ [API] حذف حوالة العامل من قاعدة البيانات...');
    const deletedTransfer = await db
      .delete(workerTransfers)
      .where(eq(workerTransfers.id, transferId))
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف حوالة العامل بنجاح في ${duration}ms:`, {
      id: deletedTransfer[0].id,
      amount: deletedTransfer[0].amount,
      recipientName: deletedTransfer[0].recipientName
    });

    res.json({
      success: true,
      data: deletedTransfer[0],
      message: `تم حذف حوالة العامل إلى "${deletedTransfer[0].recipientName}" بقيمة ${deletedTransfer[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف حوالة العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في حذف حوالة العامل';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'لا يمكن حذف حوالة العامل - مرتبطة ببيانات أخرى';
      statusCode = 409;
    } else if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف حوالة العامل غير صحيح';
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

// ===========================================
// Worker Misc Expenses Routes (مصاريف العمال المتنوعة)
// ===========================================

/**
 * 📊 جلب مصاريف العمال المتنوعة
 * GET /worker-misc-expenses
 */
workerRouter.get('/worker-misc-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {project_id, date} = req.query;
    console.log('📊 [API] جلب مصاريف العمال المتنوعة');
    console.log('🔍 [API] معاملات الفلترة:', {project_id, date});

    if (project_id) {
      const { allowed } = checkProjectAccess(req, project_id as string);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
      }
    }

    // بناء الاستعلام مع الفلترة
    let query;

    const accessReqMisc = req as ProjectAccessRequest;
    const isAdminMisc = projectAccessService.isAdmin(accessReqMisc.user?.role || '');
    const accessibleMiscIds = accessReqMisc.accessibleProjectIds ?? [];

    // تطبيق الفلترة حسب المعاملات الموجودة
    if (project_id && date) {
      query = db.select().from(workerMiscExpenses).where(and(
        eq(workerMiscExpenses.project_id, project_id as string),
        eq(workerMiscExpenses.date, date as string)
      ));
    } else if (project_id) {
      query = db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.project_id, project_id as string));
    } else if (date) {
      if (!isAdminMisc && accessibleMiscIds.length > 0) {
        query = db.select().from(workerMiscExpenses).where(and(
          eq(workerMiscExpenses.date, date as string),
          inArray(workerMiscExpenses.project_id, accessibleMiscIds)
        ));
      } else if (!isAdminMisc) {
        query = db.select().from(workerMiscExpenses).where(sql`1=0`);
      } else {
        query = db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.date, date as string));
      }
    } else {
      if (!isAdminMisc && accessibleMiscIds.length > 0) {
        query = db.select().from(workerMiscExpenses).where(inArray(workerMiscExpenses.project_id, accessibleMiscIds));
      } else if (!isAdminMisc) {
        query = db.select().from(workerMiscExpenses).where(sql`1=0`);
      } else {
        query = db.select().from(workerMiscExpenses);
      }
    }

    const expenses = await query.orderBy(workerMiscExpenses.date);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${expenses.length} مصروف متنوع في ${duration}ms`);

    res.json({
      success: true,
      data: expenses,
      message: `تم جلب ${expenses.length} مصروف متنوع بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب المصاريف المتنوعة:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: 'فشل في جلب المصاريف المتنوعة',
      processingTime: duration
    });
  }
});

/**
 * 🔄 تحديث مصروف متنوع للعامل
 * PATCH /worker-misc-expenses/:id
 */
workerRouter.patch('/worker-misc-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log('🔄 [API] طلب تحديث المصروف المتنوع للعامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID المصروف المتنوع:', expenseId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!expenseId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المصروف المتنوع للعامل مطلوب',
        message: 'لم يتم توفير معرف المصروف المتنوع للعامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود المصروف المتنوع أولاً
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.id, expenseId)).limit(1);

    if (existingExpense.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'المصروف المتنوع للعامل غير موجود',
        message: `لم يتم العثور على مصروف متنوع للعامل بالمعرف: ${expenseId}`,
        processingTime: duration
      });
    }

    const { allowed: expPatchAllowed } = checkProjectAccess(req, existingExpense[0].project_id);
    if (!expPatchAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا المصروف' });
    }

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.date === undefined) {
      body.date = body.selectedDate;
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerMiscExpenseSchema.partial().safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحديث المصروف المتنوع للعامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المصروف المتنوع للعامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث المصروف المتنوع للعامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    // تحديث المصروف المتنوع للعامل
    const updatedExpense = await db
      .update(workerMiscExpenses)
      .set(validationResult.data)
      .where(eq(workerMiscExpenses.id, expenseId))
      .returning();

    const t = updatedExpense[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('worker_misc_expenses', expenseId, 'تعديل مصروف متنوع', getAuthUser(req)?.user_id);
      return FinancialLedgerService.recordMiscExpense(
        t.project_id, parseFloat(t.amount), t.date, t.id, getAuthUser(req)?.user_id
      );
    }, 'worker-misc-expenses/PATCH');

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث المصروف المتنوع للعامل بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: updatedExpense[0],
      message: `تم تحديث المصروف المتنوع للعامل بقيمة ${updatedExpense[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث المصروف المتنوع للعامل:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في تحديث المصروف المتنوع للعامل',
      message: error.message,
      processingTime: duration
    });
  }
});

// ===========================================
// Worker Autocomplete Routes (الإكمال التلقائي للعمال)
// ===========================================

/**
 * 📝 جلب وصف المصاريف المتنوعة للإكمال التلقائي
 * GET /autocomplete/workerMiscDescriptions
 */
workerRouter.get('/autocomplete/workerMiscDescriptions', async (req: Request, res: Response) => {
  try {
    console.log('📝 [API] جلب وصف المصاريف المتنوعة للإكمال التلقائي');

    // جلب وصف المصاريف المتنوعة للعمال من قاعدة البيانات أو إرجاع قائمة فارغة
    res.json({
      success: true,
      data: [],
      message: 'تم جلب وصف المصاريف المتنوعة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب وصف المصاريف المتنوعة:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب وصف المصاريف المتنوعة'
    });
  }
});

// ===========================================
// Worker Types Routes (أنواع العمال)
// ===========================================

/**
 * ➕ إضافة نوع عامل جديد
 * POST /worker-types
 */
workerRouter.post('/worker-types', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { name } = req.body;

    console.log('➕ [API] طلب إضافة نوع عامل جديد:', name);

    if (!name || typeof name !== 'string' || !name.trim()) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'اسم نوع العامل مطلوب',
        message: 'يرجى تقديم اسم صحيح لنوع العامل',
        processingTime: duration
      });
    }

    // التحقق من عدم تكرار النوع في قاعدة البيانات
    const existingType = await db.select().from(workerTypes)
      .where(sql`LOWER(name) = LOWER(${name.trim()})`);

    if (existingType.length > 0) {
      const duration = Date.now() - startTime;
      return res.status(409).json({
        success: false,
        error: 'نوع العامل موجود مسبقاً',
        message: `نوع العامل "${name.trim()}" موجود في النظام`,
        processingTime: duration
      });
    }

    // إدراج نوع عامل جديد في قاعدة البيانات
    const newWorkerType = await db.insert(workerTypes).values({
      name: name.trim()
    }).returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إضافة نوع عامل جديد "${name}" بنجاح في ${duration}ms`);

    res.status(201).json({
      success: true,
      data: newWorkerType[0],
      message: `تم إضافة نوع العامل "${name.trim()}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إضافة نوع عامل جديد:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إضافة نوع العامل',
      message: error.message,
      processingTime: duration
    });
  }
});

// ===========================================
// Worker Attendance Routes (حضور العمال)
// ===========================================

/**
 * 📊 جلب حضور العمال لمشروع محدد
 * GET /api/worker-attendance
 */
workerRouter.get('/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;

    console.log(`📊 [API] جلب حضور العمال للمشروع: ${project_id}${date ? ` للتاريخ: ${date}` : ''}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const { allowed: attGetAllowed } = checkProjectAccess(req, project_id as string);
    if (!attGetAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // تنظيف التاريخ إذا وجد
    let cleanDate = date as string;
    if (cleanDate && cleanDate.includes(' ')) {
      cleanDate = cleanDate.split(' ')[0];
    } else if (cleanDate && cleanDate.includes('T')) {
      cleanDate = cleanDate.split('T')[0];
    }

    // بناء الاستعلام مع إمكانية الفلترة بالتاريخ
    let whereCondition;

    if (cleanDate) {
      whereCondition = and(
        eq(workerAttendance.project_id, project_id as string),
        eq(workerAttendance.attendanceDate, cleanDate)
      )!;
    } else {
      whereCondition = eq(workerAttendance.project_id, project_id as string);
    }

    const attendance = await db.select({
      id: workerAttendance.id,
      worker_id: workerAttendance.worker_id,
      project_id: workerAttendance.project_id,
      date: workerAttendance.date,
      attendanceDate: workerAttendance.attendanceDate,
      startTime: workerAttendance.startTime,
      endTime: workerAttendance.endTime,
      workDescription: workerAttendance.workDescription,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      remainingAmount: workerAttendance.remainingAmount,
      paymentType: workerAttendance.paymentType,
      isPresent: workerAttendance.isPresent,
      created_at: workerAttendance.created_at,
      workerName: workers.name
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
    .where(whereCondition)
    .orderBy(workerAttendance.attendanceDate);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);

    res.json({
      success: true,
      data: attendance,
      message: `تم جلب ${attendance.length} سجل حضور للمشروع${cleanDate ? ` في التاريخ ${cleanDate}` : ''}`,
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
 * 📊 جلب حضور العمال لمشروع محدد (مسار قديم للتوافق)
 * GET /projects/:project_id/worker-attendance
 */
workerRouter.get('/projects/:project_id/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {project_id} = req.params;
    const {date} = req.query;

    console.log(`📊 [API] جلب حضور العمال للمشروع (مسار قديم): ${project_id}${date ? ` للتاريخ: ${date}` : ''}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const { allowed: attLegacyAllowed } = checkProjectAccess(req, project_id);
    if (!attLegacyAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // تنظيف التاريخ إذا وجد
    let cleanDate = date as string;
    if (cleanDate && cleanDate.includes(' ')) {
      cleanDate = cleanDate.split(' ')[0];
    } else if (cleanDate && cleanDate.includes('T')) {
      cleanDate = cleanDate.split('T')[0];
    }

    // بناء الاستعلام مع إمكانية الفلترة بالتاريخ
    let whereCondition;

    if (cleanDate) {
      whereCondition = and(
        eq(workerAttendance.project_id, project_id),
        eq(workerAttendance.attendanceDate, cleanDate)
      )!;
    } else {
      whereCondition = eq(workerAttendance.project_id, project_id);
    }

    const attendance = await db.select({
      id: workerAttendance.id,
      worker_id: workerAttendance.worker_id,
      project_id: workerAttendance.project_id,
      date: workerAttendance.date,
      attendanceDate: workerAttendance.attendanceDate,
      startTime: workerAttendance.startTime,
      endTime: workerAttendance.endTime,
      workDescription: workerAttendance.workDescription,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      remainingAmount: workerAttendance.remainingAmount,
      paymentType: workerAttendance.paymentType,
      isPresent: workerAttendance.isPresent,
      created_at: workerAttendance.created_at,
      workerName: workers.name
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
    .where(whereCondition)
    .orderBy(workerAttendance.attendanceDate);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);

    res.json({
      success: true,
      data: attendance,
      message: `تم جلب ${attendance.length} سجل حضور للمشروع${cleanDate ? ` في التاريخ ${cleanDate}` : ''}`,
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
 * 🗑️ حذف سجل حضور عامل
 * DELETE /worker-attendance/:id
 * يجب أن يكون قبل POST لتجنب تضارب المسارات
 */
workerRouter.delete('/worker-attendance/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const attendanceId = req.params.id;
    console.log('🗑️ [API] طلب حذف سجل حضور العامل:', attendanceId);
    console.log('👤 [API] المستخدم:', req.user?.email);
    console.log('🔍 [API] المسار الكامل:', req.originalUrl);
    console.log('🔍 [API] Method:', req.method);

    if (!attendanceId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف سجل الحضور مطلوب',
        message: 'لم يتم توفير معرف سجل الحضور للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود سجل الحضور أولاً
    const existingAttendance = await db.select().from(workerAttendance).where(eq(workerAttendance.id, attendanceId)).limit(1);

    if (existingAttendance.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] سجل الحضور غير موجود:', attendanceId);
      return res.status(404).json({
        success: false,
        error: 'سجل الحضور غير موجود',
        message: `لم يتم العثور على سجل حضور بالمعرف: ${attendanceId}`,
        processingTime: duration
      });
    }

    const attendanceToDelete = existingAttendance[0];

    const { allowed: attDelAllowed } = checkProjectAccess(req, attendanceToDelete.project_id);
    if (!attDelAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لحذف هذا السجل' });
    }

    console.log('🗑️ [API] سيتم حذف سجل الحضور:', {
      id: attendanceToDelete.id,
      worker_id: attendanceToDelete.worker_id,
      date: attendanceToDelete.date,
      project_id: attendanceToDelete.project_id
    });

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('worker_attendance', attendanceId, 'حذف', getAuthUser(req)?.user_id).then(() => ''),
      'worker-attendance/DELETE'
    );

    // حذف سجل الحضور من قاعدة البيانات
    console.log('🗑️ [API] حذف سجل الحضور من قاعدة البيانات...');
    const deletedAttendance = await db
      .delete(workerAttendance)
      .where(eq(workerAttendance.id, attendanceId))
      .returning();

    // 🔌 Broadcast real-time update via WebSocket
    const io = (global as any).io;
    if (io && deletedAttendance[0]) {
      io.emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        project_id: deletedAttendance[0].project_id,
        date: deletedAttendance[0].date
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف سجل الحضور بنجاح في ${duration}ms:`, {
      id: deletedAttendance[0].id,
      worker_id: deletedAttendance[0].worker_id,
      date: deletedAttendance[0].date
    });

    res.json({
      success: true,
      data: deletedAttendance[0],
      message: `تم حذف سجل الحضور بتاريخ ${deletedAttendance[0].date} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف سجل الحضور:', error);

    let errorMessage = 'فشل في حذف سجل الحضور';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'لا يمكن حذف سجل الحضور - مرتبط ببيانات أخرى';
      statusCode = 409;
    } else if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف سجل الحضور غير صحيح';
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
 * 📝 إضافة حضور عامل جديد
 * POST /worker-attendance
 */
workerRouter.post('/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('📝 [API] طلب إضافة حضور عامل جديد من المستخدم:', req.user?.email);
    console.log('📋 [API] بيانات حضور العامل المرسلة:', req.body);

    const { allowed: attPostAllowed } = checkProjectAccess(req, req.body.project_id);
    if (!attPostAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // Validation باستخدام insert schema مع معالجة خاصة للسحب المقدم
    const recordType = (req.body as any).recordType || 'work';

    // للسحب المقدم: نسمح بـ workDays = 0
    if (recordType === 'advance' && req.body.workDays === 0) {
      req.body.workDays = 0.001; // قيمة صغيرة جداً لتمرير الـ validation
    }

    const attendanceData = {
      ...req.body,
      attendanceDate: req.body.attendanceDate || req.body.selectedDate,
      date: req.body.date || req.body.selectedDate,
      workDays: req.body.workDays?.toString(),
    };
    const validationResult = insertWorkerAttendanceSchema.safeParse(attendanceData);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation حضور العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;

      // إنشاء رسالة خطأ مفصلة وواضحة
      let detailedMessage = '⚠️ خطأ في البيانات:\n';

      if (errorMessages.workDays) {
        detailedMessage += '• عدد الأيام: ' + errorMessages.workDays[0] + '\n';
      }
      if (errorMessages.paidAmount) {
        detailedMessage += '• المبلغ المدفوع: ' + errorMessages.paidAmount[0] + '\n';
      }
      if (errorMessages.date) {
        detailedMessage += '• التاريخ: ' + errorMessages.date[0] + '\n';
      }
      if (errorMessages.project_id) {
        detailedMessage += '• المشروع: يجب اختيار مشروع محدد\n';
      }
      if (errorMessages.worker_id) {
        detailedMessage += '• العامل: يجب اختيار عامل\n';
      }

      const firstError = detailedMessage || 'بيانات حضور العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات حضور العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    console.log('✅ [API] نجح validation حضور العامل');

    // حساب actualWage و totalPay = dailyWage * workDays وتحويل workDays إلى string
    const attendanceDate = req.body.attendanceDate || req.body.date;
    const dailyWage = parseFloat(validationResult.data.dailyWage || "0");
    const workDays = Number(validationResult.data.workDays) || 0;
    const actualWageValue = dailyWage * workDays;
    
    const dataWithCalculatedFields = {
      ...validationResult.data,
      dailyWage: dailyWage.toString(),
      date: attendanceDate, // التأكد من تعيين التاريخ
      workDays: workDays.toString(), // تحويل إلى string للتوافق مع decimal
      actualWage: actualWageValue.toString(),
      totalPay: actualWageValue.toString(), // totalPay = actualWage
      notes: req.body.notes || validationResult.data.notes || "" // تأكد من جلب الملاحظات من جسم الطلب
    };

    // التحقق من وجود سجل مماثل لمنع التكرار (نفس التاريخ، العامل، المشروع، المبلغ، وأيام العمل)
    const existingAttendance = await db.select()
      .from(workerAttendance)
      .where(and(
        eq(workerAttendance.worker_id, validationResult.data.worker_id),
        eq(workerAttendance.project_id, validationResult.data.project_id),
        eq(workerAttendance.date, attendanceDate),
        sql`CAST(${workerAttendance.paidAmount} AS DECIMAL(15,2)) = CAST(${validationResult.data.paidAmount} AS DECIMAL(15,2))`,
        sql`CAST(${workerAttendance.workDays} AS DECIMAL(15,2)) = CAST(${workDays} AS DECIMAL(15,2))`
      ))
      .limit(1);

    if (existingAttendance.length > 0) {
      const duration = Date.now() - startTime;
      console.warn('⚠️ [API] محاولة تسجيل حضور مكرر:', validationResult.data);
      return res.status(409).json({
        success: false,
        error: 'سجل مكرر',
        message: 'تم تسجيل هذا الحضور بالفعل (نفس العامل، التاريخ، المشروع، المبلغ، وأيام العمل)',
        processingTime: duration
      });
    }

    // إدراج حضور العامل أو تحديثه إذا كان مكرراً (Upsert Pattern للمعايير العالمية)
    console.log('💾 [API] حفظ حضور العامل في قاعدة البيانات...');
    console.log('📝 [API] البيانات المُدرجة تشمل الملاحظات:', { notes: dataWithCalculatedFields.notes });
    
    const newAttendance = await db.insert(workerAttendance)
      .values([dataWithCalculatedFields])
      .onConflictDoUpdate({
        target: [workerAttendance.worker_id, workerAttendance.attendanceDate, workerAttendance.project_id],
        set: {
          workDays: dataWithCalculatedFields.workDays,
          dailyWage: dataWithCalculatedFields.dailyWage,
          actualWage: dataWithCalculatedFields.actualWage,
          totalPay: dataWithCalculatedFields.totalPay,
          paidAmount: dataWithCalculatedFields.paidAmount,
          remainingAmount: dataWithCalculatedFields.remainingAmount,
          paymentType: dataWithCalculatedFields.paymentType,
          notes: dataWithCalculatedFields.notes,
          updated_at: new Date()
        }
      })
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء حضور العامل بنجاح في ${duration}ms:`, {
      id: newAttendance[0].id,
      worker_id: newAttendance[0].worker_id,
      date: newAttendance[0].date
    });

    const record = newAttendance[0];
    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.recordWorkerWage(
        record.project_id, parseFloat(record.actualWage || '0'), record.date, record.id, getAuthUser(req)?.user_id
      ),
      'worker-attendance/POST'
    );

    // 🔌 Broadcast real-time update via WebSocket
    const io = (global as any).io;
    if (io) {
      io.emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        project_id: newAttendance[0].project_id,
        date: newAttendance[0].date
      });
    }

    res.status(201).json({
      success: true,
      data: newAttendance[0],
      message: `تم تسجيل حضور العامل بتاريخ ${newAttendance[0].date} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إنشاء حضور العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل ومفصلة
    let errorMessage = 'فشل في إنشاء حضور العامل';
    let detailedMessage = error.message;
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = '⚠️ خطأ في البيانات المرتبطة';
      detailedMessage = 'العامل أو المشروع المحدد غير موجود في النظام. تأكد من:\n• اختيار مشروع موجود\n• اختيار عامل موجود';
      statusCode = 400;
    } else if (error.code === '23502') { // not null violation
      errorMessage = '⚠️ بيانات ناقصة';
      detailedMessage = 'بعض الحقول المطلوبة فارغة:\n' + (error.column ? `• ${error.column} مطلوب` : '• تأكد من ملء جميع الحقول المطلوبة');
      statusCode = 400;
    } else if (error.code === '23505') { // unique violation
      errorMessage = '⚠️ سجل مكرر';
      detailedMessage = 'تم تسجيل حضور هذا العامل مسبقاً لهذا التاريخ.\nاستخدم زر "تعديل" لتحديث السجل الموجود.';
      statusCode = 409;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: detailedMessage,
      processingTime: duration
    });
  }
});

/**
 * 🔄 تحديث حضور عامل موجود
 * PATCH /worker-attendance/:id
 */
workerRouter.patch('/worker-attendance/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const attendanceId = req.params.id;
    console.log('🔄 [API] طلب تحديث حضور العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID حضور العامل:', attendanceId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!attendanceId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف حضور العامل مطلوب',
        message: 'لم يتم توفير معرف حضور العامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود حضور العامل أولاً
    const existingAttendance = await db.select().from(workerAttendance).where(eq(workerAttendance.id, attendanceId)).limit(1);

    if (existingAttendance.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'حضور العامل غير موجود',
        message: `لم يتم العثور على حضور عامل بالمعرف: ${attendanceId}`,
        processingTime: duration
      });
    }

    const { allowed: attPatchAllowed } = checkProjectAccess(req, existingAttendance[0].project_id);
    if (!attPatchAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا السجل' });
    }

    // Validation باستخدام تحقيق يدوي للبيانات - نسمح بتحديث جزئي
    const updateData: any = { ...req.body };

    // تحويل workDays إلى string إذا كان موجوداً لتجاوز خطأ الـ validation
    if (updateData.workDays !== undefined && updateData.workDays !== null) {
      updateData.workDays = updateData.workDays.toString();
    }

    // تأكد من أن الملاحظات ووصف العمل يتم تضمينهما إذا تم إرسالهما
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.workDescription !== undefined) updateData.workDescription = req.body.workDescription;

    // حساب actualWage
    const dailyWage = updateData.dailyWage || existingAttendance[0].dailyWage;
    const workDays = updateData.workDays || existingAttendance[0].workDays;

    if (dailyWage && workDays) {
      const actualWageValue = parseFloat(dailyWage) * parseFloat(workDays);
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();
      
      // تحديث المتبقي إذا تم تحديث المدفوع أو الأيام
      const paidAmount = updateData.paidAmount !== undefined ? updateData.paidAmount : existingAttendance[0].paidAmount;
      if (paidAmount !== undefined) {
        updateData.remainingAmount = (actualWageValue - parseFloat(paidAmount)).toString();
        updateData.paymentType = parseFloat(paidAmount) >= actualWageValue ? "full" : "partial";
      }
    }

    // تحديث حضور العامل
    const updated_attendance = await db
      .update(workerAttendance)
      .set(updateData)
      .where(eq(workerAttendance.id, attendanceId))
      .returning();

    const t = updated_attendance[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('worker_attendance', attendanceId, 'تعديل حضور عامل', getAuthUser(req)?.user_id);
      return FinancialLedgerService.recordWorkerWage(
        t.project_id, parseFloat(t.actualWage || '0'), t.date, t.id, getAuthUser(req)?.user_id
      );
    }, 'worker-attendance/PATCH');

    // 🔌 Broadcast real-time update via WebSocket
    const io = (global as any).io;
    if (io && updated_attendance[0]) {
      io.emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        project_id: updated_attendance[0].project_id,
        date: updated_attendance[0].date
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث حضور العامل بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: updated_attendance[0],
      message: `تم تحديث حضور العامل بتاريخ ${updated_attendance[0].date} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث حضور العامل:', error);

    let errorMessage = 'فشل في تحديث حضور العامل';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'العامل أو المشروع المحدد غير موجود';
      statusCode = 400;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات حضور العامل ناقصة';
      statusCode = 400;
    } else if (error.code === '23505') { // unique violation
      errorMessage = 'تم تسجيل حضور هذا العامل مسبقاً لهذا التاريخ';
      statusCode = 409;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});

// ===========================================
// Worker Transfers Routes (تحويلات العمال)
// ===========================================

/**
 * 🔄 تحديث تحويل عامل موجود
 * PATCH /worker-transfers/:id
 */
workerRouter.patch('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🔄 [API] طلب تحديث تحويل العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID تحويل العامل:', transferId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!transferId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف تحويل العامل مطلوب',
        message: 'لم يتم توفير معرف تحويل العامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود تحويل العامل أولاً
    const existingTransfer = await db.select().from(workerTransfers).where(eq(workerTransfers.id, transferId)).limit(1);

    if (existingTransfer.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'تحويل العامل غير موجود',
        message: `لم يتم العثور على تحويل عامل بالمعرف: ${transferId}`,
        processingTime: duration
      });
    }

    const { allowed: transferPatch2Allowed } = checkProjectAccess(req, existingTransfer[0].project_id);
    if (!transferPatch2Allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا التحويل' });
    }

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.transferDate === undefined) {
      body.transferDate = body.selectedDate;
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerTransferSchema.partial().safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحديث تحويل العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث تحويل العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث تحويل العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    // تحديث تحويل العامل
    const updatedTransfer = await db
      .update(workerTransfers)
      .set(validationResult.data)
      .where(eq(workerTransfers.id, transferId))
      .returning();

    const t = updatedTransfer[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('worker_transfers', transferId, 'تعديل تحويل عامل', getAuthUser(req)?.user_id);
      return FinancialLedgerService.recordWorkerTransfer(
        t.project_id, parseFloat(t.amount), t.transferDate, t.id, getAuthUser(req)?.user_id
      );
    }, 'worker-transfers/PATCH');

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث تحويل العامل بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: updatedTransfer[0],
      message: `تم تحديث تحويل العامل بقيمة ${updatedTransfer[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث تحويل العامل:', error);

    let errorMessage = 'فشل في تحديث تحويل العامل';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'العامل المحدد غير موجود';
      statusCode = 400;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات تحويل العامل ناقصة';
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
 * 🗑️ حذف تحويل عامل
 * DELETE /worker-transfers/:id
 */
workerRouter.delete('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🗑️ [API] طلب حذف حوالة العامل:', transferId);
    console.log('👤 [API] المستخدم:', req.user?.email);

    if (!transferId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف حوالة العامل مطلوب',
        message: 'لم يتم توفير معرف الحوالة للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود الحوالة أولاً
    const existingTransfer = await db.select().from(workerTransfers).where(eq(workerTransfers.id, transferId)).limit(1);

    if (existingTransfer.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] حوالة العامل غير موجودة:', transferId);
      return res.status(404).json({
        success: false,
        error: 'حوالة العامل غير موجودة',
        message: `لم يتم العثور على حوالة بالمعرف: ${transferId}`,
        processingTime: duration
      });
    }

    const { allowed: transferDel2Allowed } = checkProjectAccess(req, existingTransfer[0].project_id);
    if (!transferDel2Allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لحذف هذا التحويل' });
    }

    const transferToDelete = existingTransfer[0];
    console.log('🗑️ [API] سيتم حذف حوالة العامل:', {
      id: transferToDelete.id,
      worker_id: transferToDelete.worker_id,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('worker_transfers', transferId, 'حذف', getAuthUser(req)?.user_id).then(() => ''),
      'worker-transfers/DELETE'
    );

    // حذف حوالة العامل من قاعدة البيانات
    console.log('🗑️ [API] حذف حوالة العامل من قاعدة البيانات...');
    const deletedTransfer = await db
      .delete(workerTransfers)
      .where(eq(workerTransfers.id, transferId))
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف حوالة العامل بنجاح في ${duration}ms:`, {
      id: deletedTransfer[0].id,
      amount: deletedTransfer[0].amount,
      recipientName: deletedTransfer[0].recipientName
    });

    res.json({
      success: true,
      data: deletedTransfer[0],
      message: `تم حذف حوالة العامل بقيمة ${deletedTransfer[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف حوالة العامل:', error);

    let errorMessage = 'فشل في حذف حوالة العامل';
    let statusCode = 500;

    if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف الحوالة غير صحيح';
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

// ===========================================
// Worker Misc Expenses Routes (المصاريف المتنوعة للعمال)
// ===========================================

/**
 * 📊 جلب المصاريف المتنوعة للعمال لمشروع محدد
 * GET /projects/:project_id/worker-misc-expenses
 */
workerRouter.get('/projects/:project_id/worker-misc-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {project_id} = req.params;

    console.log(`📊 [API] جلب المصاريف المتنوعة للعمال للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const { allowed: miscProjAllowed } = checkProjectAccess(req, project_id);
    if (!miscProjAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const expenses = await db.select()
      .from(workerMiscExpenses)
      .where(eq(workerMiscExpenses.project_id, project_id))
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
 * 🔄 تحديث مصروف متنوع للعامل
 * PATCH /worker-misc-expenses/:id
 */
workerRouter.patch('/worker-misc-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log('🔄 [API] طلب تحديث المصروف المتنوع للعامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID المصروف المتنوع:', expenseId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!expenseId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المصروف المتنوع للعامل مطلوب',
        message: 'لم يتم توفير معرف المصروف المتنوع للعامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود المصروف المتنوع أولاً
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.id, expenseId)).limit(1);

    if (existingExpense.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'المصروف المتنوع للعامل غير موجود',
        message: `لم يتم العثور على مصروف متنوع للعامل بالمعرف: ${expenseId}`,
        processingTime: duration
      });
    }

    const { allowed: expPatch2Allowed } = checkProjectAccess(req, existingExpense[0].project_id);
    if (!expPatch2Allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا المصروف' });
    }

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.date === undefined) {
      body.date = body.selectedDate;
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerMiscExpenseSchema.partial().safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحديث المصروف المتنوع للعامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المصروف المتنوع للعامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث المصروف المتنوع للعامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    // تحديث المصروف المتنوع للعامل
    const updatedExpense = await db
      .update(workerMiscExpenses)
      .set(validationResult.data)
      .where(eq(workerMiscExpenses.id, expenseId))
      .returning();

    const t = updatedExpense[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('worker_misc_expenses', expenseId, 'تعديل مصروف متنوع', getAuthUser(req)?.user_id);
      return FinancialLedgerService.recordMiscExpense(
        t.project_id, parseFloat(t.amount), t.date, t.id, getAuthUser(req)?.user_id
      );
    }, 'worker-misc-expenses/PATCH');

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث المصروف المتنوع للعامل بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: updatedExpense[0],
      message: `تم تحديث المصروف المتنوع بقيمة ${updatedExpense[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث المصروف المتنوع للعامل:', error);

    let errorMessage = 'فشل في تحديث المصروف المتنوع للعامل';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'العامل أو المشروع المحدد غير موجود';
      statusCode = 400;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات المصروف المتنوع ناقصة';
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
 * 📊 جلب إحصائيات العامل
 * GET /api/workers/:id/stats
 * Query params:
 *   - project_id: فلترة بمشروع محدد (اختياري)
 *   - 'all' أو عدم التحديد = جميع المشاريع
 */
workerRouter.get('/workers/:id/stats', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    const project_id = req.query.project_id as string | undefined;
    const isAllProjects = !project_id || project_id === 'all';

    console.log('📊 [API] جلب إحصائيات العامل:', worker_id);
    console.log('📊 [API] فلترة بمشروع:', project_id || 'جميع المشاريع');

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل',
        processingTime: duration
      });
    }

    // التحقق من وجود العامل أولاً
    const worker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (worker.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && worker[0].created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا العامل' });
    }

    if (!isAllProjects) {
      const { allowed: statsProjAllowed } = checkProjectAccess(req, project_id!);
      if (!statsProjAllowed) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
      }
    }

    // بناء شرط الفلترة بالمشروع
    const attendanceWhereCondition = isAllProjects 
      ? eq(workerAttendance.worker_id, worker_id)
      : and(eq(workerAttendance.worker_id, worker_id), eq(workerAttendance.project_id, project_id));

    const transfersWhereCondition = isAllProjects
      ? eq(workerTransfers.worker_id, worker_id)
      : and(eq(workerTransfers.worker_id, worker_id), eq(workerTransfers.project_id, project_id));

    // حساب إجمالي عدد أيام العمل من جدول workerAttendance
    const totalWorkDaysResult = await db.select({
      totalDays: sql`COALESCE(SUM(CAST(COALESCE(${workerAttendance.workDays}, '0') AS DECIMAL)), 0)`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const totalWorkDays = Number(totalWorkDaysResult[0]?.totalDays) || 0;
    console.log(`📊 [API] إجمالي أيام العمل للعامل ${worker_id}${!isAllProjects ? ` في المشروع ${project_id}` : ''}: ${totalWorkDays}`);

    // جلب تاريخ آخر حضور للعامل
    const lastAttendanceResult = await db.select({
      lastAttendanceDate: workerAttendance.attendanceDate,
      project_id: workerAttendance.project_id
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition)
    .orderBy(sql`${workerAttendance.attendanceDate} DESC`)
    .limit(1);

    const lastAttendanceDate = lastAttendanceResult[0]?.lastAttendanceDate || null;

    // حساب معدل الحضور الشهري (عدد أيام الحضور في آخر 30 يوماً)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    // حساب معدل الحضور الشهري
    const monthlyAttendanceCondition = isAllProjects
      ? and(eq(workerAttendance.worker_id, worker_id), sql`${workerAttendance.attendanceDate} >= ${thirtyDaysAgoString}`)
      : and(eq(workerAttendance.worker_id, worker_id), eq(workerAttendance.project_id, project_id), sql`${workerAttendance.attendanceDate} >= ${thirtyDaysAgoString}`);

    const monthlyAttendanceResult = await db.select({
      monthlyDays: sql`COALESCE(SUM(CAST(COALESCE(${workerAttendance.workDays}, '0') AS DECIMAL)), 0)`
    })
    .from(workerAttendance)
    .where(monthlyAttendanceCondition);

    const monthlyAttendanceRate = Number(monthlyAttendanceResult[0]?.monthlyDays) || 0;
    console.log(`📊 [API] أيام العمل في آخر 30 يوم: ${monthlyAttendanceRate}`);

    // حساب إجمالي التحويلات المالية من جدول workerTransfers
    const totalTransfersResult = await db.select({
      totalTransfers: sql`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
      transfersCount: sql`COUNT(*)`
    })
    .from(workerTransfers)
    .where(transfersWhereCondition);

    const totalTransfersOnly = Number(totalTransfersResult[0]?.totalTransfers) || 0;
    const transfersCount = Number(totalTransfersResult[0]?.transfersCount) || 0;

    // حساب إجمالي الأجور المدفوعة من جدول workerAttendance (paidAmount)
    const totalPaidWagesResult = await db.select({
      totalPaidWages: sql`COALESCE(SUM(CAST(COALESCE(${workerAttendance.paidAmount}, '0') AS DECIMAL)), 0)`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const totalPaidWages = Number(totalPaidWagesResult[0]?.totalPaidWages) || 0;
    console.log(`💰 [API] إجمالي الأجور المدفوعة (paidAmount) للعامل ${worker_id}: ${totalPaidWages}`);

    // إجمالي السحبيات = التحويلات + الأجور المدفوعة
    const totalTransfers = totalTransfersOnly + totalPaidWages;
    console.log(`💰 [API] إجمالي السحبيات (تحويلات ${totalTransfersOnly} + أجور ${totalPaidWages}): ${totalTransfers}`);

    // حساب عدد المشاريع التي عمل بها العامل
    const projectsWorkedResult = await db.select({
      projectsCount: sql`COUNT(DISTINCT ${workerAttendance.project_id})`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const projectsWorked = isAllProjects ? (Number(projectsWorkedResult[0]?.projectsCount) || 0) : (totalWorkDays > 0 ? 1 : 0);

    // حساب إجمالي المستحقات من dailyWage * workDays لضمان الدقة
    // نستخدم dailyWage من سجل الحضور نفسه (وليس من جدول العمال) لأنه قد يتغير بين المشاريع
    const totalEarningsResult = await db.select({
      totalEarnings: sql`COALESCE(SUM(
        CAST(COALESCE(${workerAttendance.dailyWage}, '0') AS DECIMAL) * 
        CAST(COALESCE(${workerAttendance.workDays}, '0') AS DECIMAL)
      ), 0)`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const totalEarnings = Number(totalEarningsResult[0]?.totalEarnings) || 0;
    console.log(`💰 [API] إجمالي المستحقات (dailyWage × workDays من جميع السجلات): ${totalEarnings}`);

    // تجميع الإحصائيات
    const stats = {
      totalWorkDays: totalWorkDays,
      lastAttendanceDate: lastAttendanceDate,
      monthlyAttendanceRate: monthlyAttendanceRate,
      totalTransfers: totalTransfers,
      transfersCount: transfersCount,
      projectsWorked: projectsWorked,
      totalEarnings: totalEarnings,
      project_id: isAllProjects ? null : project_id,
      isFilteredByProject: !isAllProjects,
      workerInfo: {
        id: worker[0].id,
        name: worker[0].name,
        type: worker[0].type,
        dailyWage: worker[0].dailyWage
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب إحصائيات العامل "${worker[0].name}" بنجاح في ${duration}ms`);
    console.log('📊 [API] إحصائيات العامل:', {
      totalWorkDays,
      lastAttendanceDate,
      monthlyAttendanceRate,
      totalTransfers,
      projectsWorked,
      filteredByProject: !isAllProjects ? project_id : 'جميع المشاريع'
    });

    res.json({
      success: true,
      data: stats,
      message: `تم جلب إحصائيات العامل "${worker[0].name}"${!isAllProjects ? ` للمشروع المحدد` : ''} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب إحصائيات العامل:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب إحصائيات العامل',
      message: error.message,
      processingTime: duration
    });
  }
});

console.log('👷 [WorkerRouter] تم تهيئة مسارات إدارة العمال');

export default workerRouter;