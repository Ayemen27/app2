/**
 * مسارات إدارة التحويلات المالية
 * Financial & Fund Transfer Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, and, sql, gte, lt, lte, desc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import {
  fundTransfers, projectFundTransfers, workerMiscExpenses, workerTransfers, suppliers, projects, materialPurchases, transportationExpenses, dailyExpenseSummaries, workers, workerAttendance, materials, equipment,
  insertFundTransferSchema, insertProjectFundTransferSchema, insertWorkerMiscExpenseSchema, insertWorkerTransferSchema, insertSupplierSchema, insertMaterialPurchaseSchema, insertTransportationExpenseSchema, insertMaterialSchema,
  insertDailyExpenseSummarySchema
} from '@shared/schema';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { ExpenseLedgerService } from '../../services/ExpenseLedgerService';
import { FinancialLedgerService } from '../../services/FinancialLedgerService';
import { storage } from '../../storage';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';

export const financialRouter = express.Router();

// تطبيق المصادقة وتحميل المشاريع المتاحة على جميع المسارات المالية
financialRouter.use(requireAuth);
financialRouter.use(attachAccessibleProjects);

/**
 * 📊 الملخص المالي الموحد
 * Unified Financial Summary - Single Source of Truth
 * GET /api/financial-summary
 */
import { sendSuccess, sendError } from '../../middleware/api-response.js';

financialRouter.get('/financial-summary', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date, dateFrom, dateTo } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    
    // تنظيف المدخلات لمنع أرسال سلاسل نصية فارغة
    const cleanProjectId = project_id && project_id !== "" && project_id !== "all-projects-total" ? project_id as string : "all";
    const cleanDate = date && date !== "" ? date as string : undefined;
    const cleanDateFrom = dateFrom && dateFrom !== "" ? dateFrom as string : undefined;
    const cleanDateTo = dateTo && dateTo !== "" ? dateTo as string : undefined;

    console.log('📊 [API] جلب الملخص المالي الموحد', { project_id: cleanProjectId, date: cleanDate, dateFrom: cleanDateFrom, dateTo: cleanDateTo });

    if (cleanProjectId && cleanProjectId !== 'all') {
      const accessibleIds = accessReq.accessibleProjectIds ?? [];
      if (!isAdminUser && !accessibleIds.includes(cleanProjectId)) {
        return sendError(res, 'ليس لديك صلاحية عرض بيانات هذا المشروع', 403);
      }
      
      const summary = await ExpenseLedgerService.getProjectFinancialSummary(
        cleanProjectId, 
        cleanDate, 
        cleanDateFrom, 
        cleanDateTo
      );

      return sendSuccess(res, summary, 'تم جلب الملخص المالي بنجاح', { processingTime: Date.now() - startTime });
    } else {
      let summaries = await ExpenseLedgerService.getAllProjectsStats(
        cleanDate,
        cleanDateFrom,
        cleanDateTo
      );
      
      if (!isAdminUser) {
        const idSet = new Set(accessReq.accessibleProjectIds ?? []);
        summaries = summaries.filter((s: any) => {
          const pid = s.project_id || s.projectId;
          return pid && idSet.has(pid);
        });
      }
      
      const totalInterProjectTransfers = summaries.reduce((sum: number, s: any) => 
        sum + (s.income?.incomingProjectTransfers || 0), 0);

      const rawTotals = summaries.reduce((acc: any, s: any) => ({
        totalIncome: acc.totalIncome + s.income.totalIncome,
        totalCashExpenses: acc.totalCashExpenses + s.expenses.totalCashExpenses,
        totalAllExpenses: acc.totalAllExpenses + s.expenses.totalAllExpenses,
        cashBalance: acc.cashBalance + s.cashBalance,
        totalBalance: acc.totalBalance + s.totalBalance,
        totalWorkers: acc.totalWorkers + s.workers.totalWorkers,
        activeWorkers: acc.activeWorkers + s.workers.activeWorkers,
        materialExpensesCredit: acc.materialExpensesCredit + s.expenses.materialExpensesCredit,
        carriedForwardBalance: acc.carriedForwardBalance + (s.income.carriedForwardBalance || 0)
      }), { 
        totalIncome: 0, 
        totalCashExpenses: 0, 
        totalAllExpenses: 0, 
        cashBalance: 0, 
        totalBalance: 0, 
        totalWorkers: 0, 
        activeWorkers: 0,
        materialExpensesCredit: 0,
        carriedForwardBalance: 0
      });

      const totalSummary = {
        ...rawTotals,
        totalIncome: rawTotals.totalIncome - totalInterProjectTransfers,
        totalCashExpenses: rawTotals.totalCashExpenses - totalInterProjectTransfers,
        totalAllExpenses: rawTotals.totalAllExpenses - totalInterProjectTransfers,
      };

      return sendSuccess(res, {
        projects: summaries,
        totals: totalSummary,
        projectsCount: summaries.length
      }, `تم جلب الملخص المالي لـ ${summaries.length} مشروع`, { processingTime: Date.now() - startTime });
    }
  } catch (error: any) {
    return sendError(res, 'فشل في جلب الملخص المالي', 500, [{ message: error.message }]);
  }
});

/**
 * 📝 ملخص المصروفات اليومية
 * Daily Expense Summaries
 */

// جلب ملخص يومي محدد
financialRouter.get('/daily-expense-summaries', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;
    if (!project_id || !date) {
      return sendError(res, 'معرف المشروع والتاريخ مطلوبان', 400);
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return sendError(res, 'ليس لديك صلاحية للوصول لهذا المشروع', 403);
    }

    // تنظيف التاريخ لضمان صيغة YYYY-MM-DD ومطابقته لما هو مخزن
    let cleanDate = date as string;
    if (cleanDate.includes('T')) {
      cleanDate = cleanDate.split('T')[0];
    } else if (cleanDate.includes(' ')) {
      // التعامل مع التواريخ التي تحتوي على وقت (مثل 2026-01-15 12:00:00)
      cleanDate = cleanDate.split(' ')[0];
    }

    console.log(`🔍 [API] جلب الملخص اليومي للمشروع ${project_id} بتاريخ ${cleanDate}`);
    
    // البحث في قاعدة البيانات باستخدام التاريخ المنظف
    // نستخدم db مباشرة لتجنب التخمين في storage interface
    const results = await db.select()
      .from(dailyExpenseSummaries)
      .where(
        and(
          eq(dailyExpenseSummaries.project_id, project_id as string),
          eq(dailyExpenseSummaries.date, cleanDate)
        )
      )
      .limit(1);
    
    const summary = results[0] || null;
    
    if (!summary) {
      return sendSuccess(res, null, 'لا يوجد ملخص لهذا التاريخ', { processingTime: Date.now() - startTime });
    }

    return sendSuccess(res, summary, 'تم جلب الملخص اليومي بنجاح', { processingTime: Date.now() - startTime });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب الملخص اليومي:', error);
    return sendError(res, 'فشل في جلب الملخص اليومي', 500, [{ message: error.message }]);
  }
});

// حفظ أو تحديث ملخص يومي
financialRouter.post('/daily-expense-summaries', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('📝 [API] حفظ ملخص مصروفات يومي جديد:', req.body);
    const body = req.body;

    // التحقق من صحة البيانات باستخدام Zod schema
    const result = insertDailyExpenseSummarySchema.safeParse(body);
    if (!result.success) {
      return sendError(res, 'بيانات الملخص غير صحيحة', 400, result.error.issues);
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && result.data.project_id && !accessibleIds.includes(result.data.project_id)) {
      return sendError(res, 'ليس لديك صلاحية للوصول لهذا المشروع', 403);
    }

    const summary = await storage.createOrUpdateDailyExpenseSummary(result.data);
    return sendSuccess(res, summary, 'تم حفظ الملخص اليومي بنجاح', { processingTime: Date.now() - startTime });
  } catch (error: any) {
    console.error('❌ [API] خطأ في حفظ الملخص اليومي:', error);
    return sendError(res, 'فشل في حفظ الملخص اليومي', 500, [{ message: error.message }]);
  }
});

/**
 * 💰 تحويلات الأموال العامة
 * General Fund Transfers
 */

// جلب جميع تحويلات الأموال
financialRouter.get('/fund-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('💰 [API] جلب جميع تحويلات العهدة من قاعدة البيانات');

    const transfers = await db
      .select({
        id: fundTransfers.id,
        project_id: fundTransfers.project_id,
        amount: fundTransfers.amount,
        senderName: fundTransfers.senderName,
        transferNumber: fundTransfers.transferNumber,
        transferType: fundTransfers.transferType,
        transferDate: fundTransfers.transferDate,
        notes: fundTransfers.notes,
        created_at: fundTransfers.created_at,
        projectName: projects.name
      })
      .from(fundTransfers)
      .leftJoin(projects, eq(fundTransfers.project_id, projects.id))
      .orderBy(desc(sql`(CASE WHEN transfer_date IS NULL OR transfer_date::text = '' THEN NULL ELSE transfer_date::date END)`));

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    const filteredTransfers = isAdminUser
      ? transfers
      : transfers.filter((t: any) => t.project_id && accessibleIds.includes(t.project_id));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${filteredTransfers.length} تحويل عهدة في ${duration}ms`);

    res.json({
      success: true,
      status: "success",
      message: `تم جلب ${filteredTransfers.length} تحويل عهدة بنجاح`,
      data: filteredTransfers,
      timestamp: new Date().toISOString(),
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في جلب تحويلات العهدة:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'خطأ في جلب تحويلات العهدة',
      message: error.message,
      processingTime: duration
    });
  }
});

// إضافة تحويل عهدة جديد
financialRouter.post('/fund-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('💰 [API] إضافة تحويل عهدة جديد:', req.body);

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.transferDate === undefined) {
      body.transferDate = body.selectedDate;
    }

    // Validation باستخدام insert schema
    const validationResult = insertFundTransferSchema.safeParse(body);

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

    if (validationResult.data.project_id === 'all') {
      return res.status(400).json({
        success: false,
        error: 'مشروع غير صالح',
        message: 'لا يمكن إضافة تحويل عهدة لـ "جميع المشاريع". يرجى اختيار مشروع محدد.',
        processingTime: Date.now() - startTime
      });
    }
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    if (!isAdminUser && validationResult.data.project_id && !accessibleIds.includes(validationResult.data.project_id)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا التحويل',
        processingTime: Date.now() - startTime
      });
    }

    console.log('✅ [API] نجح validation تحويل العهدة');

    // معالجة التاريخ لضمان أنه نصي بصيغة YYYY-MM-DD
    const transferData = { ...validationResult.data };
    if (typeof transferData.transferDate === 'string' && transferData.transferDate.includes('T')) {
      transferData.transferDate = transferData.transferDate.split('T')[0];
    } else if ((transferData.transferDate as any) instanceof Date) {
      transferData.transferDate = (transferData.transferDate as any).toISOString().split('T')[0];
    }

    // التحقق المسبق من رقم التحويل لمنع أخطاء التكرار
    if (transferData.transferNumber) {
      const existing = await db.select()
        .from(fundTransfers)
        .where(eq(fundTransfers.transferNumber, transferData.transferNumber))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'رقم التحويل موجود مسبقاً',
          message: `رقم التحويل ${transferData.transferNumber} مسجل بالفعل في النظام بتاريخ ${existing[0].transferDate}`,
          processingTime: Date.now() - startTime
        });
      }
    }

    // إدراج تحويل العهدة الجديد في قاعدة البيانات
    const newTransfer = await db.insert(fundTransfers).values(transferData).returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء تحويل العهدة بنجاح في ${duration}ms`);

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.recordFundTransfer(
        newTransfer[0].project_id,
        parseFloat(newTransfer[0].amount),
        newTransfer[0].transferDate,
        newTransfer[0].id,
        (req as any).user?.id
      ),
      'fund-transfer/POST'
    );

    res.status(201).json({
      success: true,
      data: newTransfer[0],
      message: `تم إنشاء تحويل عهدة بقيمة ${newTransfer[0].amount} بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في إضافة تحويل العهدة:', error);

    let errorMessage = 'فشل في إنشاء تحويل العهدة';
    let statusCode = 500;

    if (error.code === '23505') errorMessage = 'رقم التحويل موجود مسبقاً', statusCode = 409;
    else if (error.code === '23503') errorMessage = 'المشروع المحدد غير موجود', statusCode = 400;
    else if (error.code === '23502') errorMessage = 'بيانات تحويل العهدة ناقصة', statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});

// تعديل تحويل عهدة
financialRouter.patch('/fund-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🔄 [API] طلب تحديث تحويل العهدة من المستخدم:', (req as any).user?.email);
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingTransfer[0]?.project_id && !accessibleIds.includes(existingTransfer[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا التحويل' });
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
    const validationResult = insertFundTransferSchema.partial().safeParse(body);

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

    const updatedTransfer = await db
      .update(fundTransfers)
      .set(validationResult.data)
      .where(eq(fundTransfers.id, transferId))
      .returning();

    const t = updatedTransfer[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('fund_transfers', transferId, 'تعديل تحويل عهدة', (req as any).user?.id);
      return FinancialLedgerService.recordFundTransfer(
        t.project_id, parseFloat(t.amount), t.transferDate, t.id, (req as any).user?.id
      );
    }, 'fund-transfer/PATCH');

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

// حذف تحويل عهدة
financialRouter.delete('/fund-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🗑️ [API] طلب حذف تحويل العهدة:', transferId);

    if (!transferId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف تحويل العهدة مطلوب',
        message: 'لم يتم توفير معرف تحويل العهدة للحذف',
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingTransfer[0]?.project_id && !accessibleIds.includes(existingTransfer[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا التحويل' });
    }

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('fund_transfers', transferId, 'حذف تحويل عهدة', (req as any).user?.id).then(() => ''),
      'fund-transfer/DELETE'
    );

    const deletedTransfer = await db
      .delete(fundTransfers)
      .where(eq(fundTransfers.id, transferId))
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف تحويل العهدة بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: deletedTransfer[0],
      message: `تم حذف تحويل العهدة بقيمة ${deletedTransfer[0]?.amount || 'غير محدد'} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف تحويل العهدة:', error);

    let errorMessage = 'فشل في حذف تحويل العهدة';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'لا يمكن حذف تحويل العهدة لوجود مراجع مرتبطة به';
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

/**
 * 🏗️ تحويلات أموال المشاريع
 * Project Fund Transfers
 */

// جلب تحويلات أموال المشاريع - خاص بصفحة المصروفات اليومية
financialRouter.get('/daily-project-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;

    console.log('🏗️ [API] جلب تحويلات أموال المشاريع للمصروفات اليومية');
    console.log('🔍 [API] معاملات الطلب:', { project_id, date });

    if (!project_id || !date) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع والتاريخ مطلوبان',
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // استعلام مباشر للحصول على التحويلات الخاصة بالمشروع والتاريخ المحدد
    const transfers = await db
      .select({
        id: projectFundTransfers.id,
        fromProjectId: projectFundTransfers.fromProjectId,
        toProjectId: projectFundTransfers.toProjectId,
        amount: projectFundTransfers.amount,
        description: projectFundTransfers.description,
        transferReason: projectFundTransfers.transferReason,
        transferDate: projectFundTransfers.transferDate,
        created_at: projectFundTransfers.created_at,
        fromProjectName: sql<string>`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
        toProjectName: sql<string>`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
      })
      .from(projectFundTransfers)
      .where(
        and(
          sql`(${projectFundTransfers.fromProjectId} = ${project_id} OR ${projectFundTransfers.toProjectId} = ${project_id})`,
          sql`(CASE WHEN ${projectFundTransfers.transferDate} IS NULL OR ${projectFundTransfers.transferDate}::text = '' THEN NULL ELSE ${projectFundTransfers.transferDate}::date END) = ${date}::date`
        )
      )
      .orderBy(desc(projectFundTransfers.created_at));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل مشروع للصفحة اليومية في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل أموال مشاريع بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب تحويلات أموال المشاريع للصفحة اليومية:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب تحويلات أموال المشاريع',
      message: error.message,
      processingTime: duration
    });
  }
});

// جلب تحويلات أموال المشاريع مع فلترة محسنة
financialRouter.get('/project-fund-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date, dateFrom, dateTo } = req.query;
    console.log('🏗️ [API] جلب تحويلات أموال المشاريع من قاعدة البيانات');
    console.log('🔍 [API] فلترة حسب المشروع:', project_id || 'جميع المشاريع');
    console.log('📅 [API] فلترة حسب التاريخ:', { date, dateFrom, dateTo });

    let baseQuery = db
      .select({
        id: projectFundTransfers.id,
        fromProjectId: projectFundTransfers.fromProjectId,
        toProjectId: projectFundTransfers.toProjectId,
        amount: projectFundTransfers.amount,
        description: projectFundTransfers.description,
        transferReason: projectFundTransfers.transferReason,
        transferDate: projectFundTransfers.transferDate,
        created_at: projectFundTransfers.created_at,
        fromProjectName: sql`from_project.name`.as('fromProjectName'),
        toProjectName: sql`to_project.name`.as('toProjectName')
      })
      .from(projectFundTransfers)
      .leftJoin(sql`${projects} as from_project`, eq(projectFundTransfers.fromProjectId, sql`from_project.id`))
      .leftJoin(sql`${projects} as to_project`, eq(projectFundTransfers.toProjectId, sql`to_project.id`));

    // تحضير شروط الفلترة وتجميعها في مصفوفة واحدة
    const conditions: any[] = [];

    // فلترة حسب المشروع
    if (project_id && project_id !== 'all') {
      conditions.push(sql`(${projectFundTransfers.fromProjectId} = ${project_id} OR ${projectFundTransfers.toProjectId} = ${project_id})`);
      console.log('✅ [API] تم تطبيق فلترة المشروع:', project_id);
    }

    // فلترة حسب التاريخ - محسنة لتحسين الأداء
    if (date) {
      // فلترة ليوم محدد باستخدام نطاق زمني بدلاً من DATE()
      const startOfDay = `${date} 00:00:00`;
      const endOfDay = `${date} 23:59:59.999`;
      conditions.push(and(
        gte(projectFundTransfers.transferDate, startOfDay),
        lte(projectFundTransfers.transferDate, endOfDay)
      ));
      console.log('✅ [API] تم تطبيق فلترة تاريخ محدد:', date);
    } else if (dateFrom && dateTo) {
      // فلترة لفترة زمنية
      const startOfPeriod = `${dateFrom} 00:00:00`;
      const endOfPeriod = `${dateTo} 23:59:59.999`;
      conditions.push(and(
        gte(projectFundTransfers.transferDate, startOfPeriod),
        lte(projectFundTransfers.transferDate, endOfPeriod)
      ));
      console.log('✅ [API] تم تطبيق فلترة فترة زمنية:', `${dateFrom} - ${dateTo}`);
    } else if (dateFrom) {
      // فلترة من تاريخ معين
      const startOfPeriod = `${dateFrom} 00:00:00`;
      conditions.push(gte(projectFundTransfers.transferDate, startOfPeriod));
      console.log('✅ [API] تم تطبيق فلترة من تاريخ:', dateFrom);
    } else if (dateTo) {
      // فلترة حتى تاريخ معين
      const endOfPeriod = `${dateTo} 23:59:59.999`;
      conditions.push(lte(projectFundTransfers.transferDate, endOfPeriod));
      console.log('✅ [API] تم تطبيق فلترة حتى تاريخ:', dateTo);
    }

    // تطبيق جميع الشروط في استدعاء .where() واحد
    let transfers;
    if (conditions.length > 0) {
      // دمج الشروط باستخدام AND
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      transfers = await baseQuery
        .where(whereClause)
        .orderBy(desc(sql`(CASE WHEN ${projectFundTransfers.transferDate} IS NULL OR ${projectFundTransfers.transferDate}::text = '' THEN NULL ELSE ${projectFundTransfers.transferDate}::date END)`));
    } else {
      transfers = await baseQuery.orderBy(desc(sql`(CASE WHEN ${projectFundTransfers.transferDate} IS NULL OR ${projectFundTransfers.transferDate}::text = '' THEN NULL ELSE ${projectFundTransfers.transferDate}::date END)`));
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    const filteredTransfers = isAdminUser
      ? transfers
      : transfers.filter((t: any) => {
          const from = t.fromProjectId;
          const to = t.toProjectId;
          return (from && accessibleIds.includes(from)) || (to && accessibleIds.includes(to));
        });

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${filteredTransfers.length} تحويل مشروع في ${duration}ms`);

    res.json({
      success: true,
      data: filteredTransfers,
      message: `تم جلب ${filteredTransfers.length} تحويل أموال مشاريع بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في جلب تحويلات المشاريع:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'خطأ في جلب تحويلات أموال المشاريع',
      message: error.message,
      processingTime: duration
    });
  }
});

// إضافة تحويل أموال مشروع جديد
financialRouter.post('/project-fund-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('🏗️ [API] طلب إضافة تحويل أموال مشروع جديد من المستخدم:', (req as any).user?.email);
    console.log('📋 [API] بيانات تحويل المشروع المرسلة:', req.body);

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.transferDate === undefined) {
      body.transferDate = body.selectedDate;
    }

    // Validation باستخدام insert schema
    const validationResult = insertProjectFundTransferSchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحويل المشروع:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحويل المشروع غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحويل المشروع غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    if (validationResult.data.fromProjectId === 'all' || validationResult.data.toProjectId === 'all') {
      return res.status(400).json({
        success: false,
        error: 'مشروع غير صالح',
        message: 'لا يمكن استخدام "جميع المشاريع" في تحويلات المشاريع. يرجى اختيار مشاريع محددة.',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser) {
      const fromOk = !validationResult.data.fromProjectId || accessibleIds.includes(validationResult.data.fromProjectId);
      const toOk = !validationResult.data.toProjectId || accessibleIds.includes(validationResult.data.toProjectId);
      if (!fromOk || !toOk) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لأحد المشاريع في هذا التحويل' });
      }
    }

    console.log('✅ [API] نجح validation تحويل المشروع');

    // إدراج تحويل المشروع الجديد في قاعدة البيانات
    console.log('💾 [API] حفظ تحويل المشروع في قاعدة البيانات...');
    const newTransfer = await db.insert(projectFundTransfers).values(validationResult.data).returning();

    const record = newTransfer[0];
    FinancialLedgerService.safeRecord(
      async () => {
        await FinancialLedgerService.recordProjectTransfer(
          record.fromProjectId, record.toProjectId, parseFloat(record.amount), record.transferDate, record.id, (req as any).user?.id
        );
        return '';
      },
      'project-fund-transfers/POST'
    );

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء تحويل المشروع بنجاح في ${duration}ms:`, {
      id: newTransfer[0].id,
      fromProjectId: newTransfer[0].fromProjectId,
      toProjectId: newTransfer[0].toProjectId,
      amount: newTransfer[0].amount
    });

    res.status(201).json({
      success: true,
      data: newTransfer[0],
      message: `تم إنشاء تحويل مشروع بقيمة ${newTransfer[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إنشاء تحويل المشروع:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في إنشاء تحويل المشروع';
    let statusCode = 500;

    if (error.code === '23505') { // duplicate key
      errorMessage = 'رقم تحويل المشروع موجود مسبقاً';
      statusCode = 409;
    } else if (error.code === '23503') { // foreign key violation
      errorMessage = 'أحد المشاريع المحددة غير موجود';
      statusCode = 400;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات تحويل المشروع ناقصة';
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

// حذف تحويل أموال مشروع
financialRouter.delete('/project-fund-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    console.log('🗑️ [API] طلب حذف تحويل أموال مشروع:', id);

    // التحقق من وجود السجل
    const transfer = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    
    if (!transfer || transfer.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] تحويل المشروع غير موجود:', id);
      return res.status(404).json({
        success: false,
        error: 'تحويل المشروع غير موجود',
        message: `لم يتم العثور على تحويل المشروع برقم ${id}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser) {
      const fromOk = !transfer[0].fromProjectId || accessibleIds.includes(transfer[0].fromProjectId);
      const toOk = !transfer[0].toProjectId || accessibleIds.includes(transfer[0].toProjectId);
      if (!fromOk || !toOk) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا التحويل' });
      }
    }

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('project_fund_transfers', id, 'حذف', (req as any).user?.id).then(() => ''),
      'project-fund-transfers/DELETE'
    );

    // حذف السجل
    console.log('🗑️ [API] حذف السجل من قاعدة البيانات...');
    const result = await db.delete(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    console.log('✅ [API] تم حذف السجل:', { deletedCount: result.rowCount });

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف تحويل المشروع بنجاح في ${duration}ms:`, id);

    // إرسال response صحيح مع رسالة نجاح
    res.json({
      success: true,
      data: transfer[0],
      message: 'تم حذف تحويل المشروع بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف تحويل المشروع:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في حذف تحويل المشروع',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 🔄 تحديث تحويل أموال مشروع
 * PATCH /api/project-fund-transfers/:id
 */
financialRouter.patch('/project-fund-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    console.log('🔄 [API] طلب تحديث تحويل أموال مشروع:', id);

    if (!id) {
      return res.status(400).json({ success: false, error: 'معرف التحويل مطلوب' });
    }

    const existingTransfer = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id)).limit(1);
    if (existingTransfer.length === 0) {
      return res.status(404).json({ success: false, error: 'التحويل غير موجود' });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser) {
      const fromOk = !existingTransfer[0].fromProjectId || accessibleIds.includes(existingTransfer[0].fromProjectId);
      const toOk = !existingTransfer[0].toProjectId || accessibleIds.includes(existingTransfer[0].toProjectId);
      if (!fromOk || !toOk) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا التحويل' });
      }
    }

    const validationResult = insertProjectFundTransferSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, error: 'بيانات التحديث غير صحيحة' });
    }

    const updatedTransfer = await db
      .update(projectFundTransfers)
      .set({
        ...validationResult.data,
        updated_at: new Date()
      } as any)
      .where(eq(projectFundTransfers.id, id))
      .returning();

    if (updatedTransfer.length === 0) {
      return res.status(404).json({ success: false, error: 'التحويل غير موجود' });
    }

    const t = updatedTransfer[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('project_fund_transfers', id, 'تعديل تحويل مشروع', (req as any).user?.id);
      await FinancialLedgerService.recordProjectTransfer(
        t.fromProjectId, t.toProjectId, parseFloat(t.amount), t.transferDate, t.id, (req as any).user?.id
      );
      return '';
    }, 'project-fund-transfers/PATCH');

    res.json({
      success: true,
      data: updatedTransfer[0],
      message: 'تم تحديث عملية الترحيل بنجاح',
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'فشل في تحديث تحويل المشروع', message: error.message });
  }
});

/**
 * 👷‍♂️ تحويلات العمال ومصاريفهم
 * Worker Transfers & Expenses
 */

// جلب تحويلات العمال مع دعم فلترة اختيارية بالمشروع
financialRouter.get('/worker-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const project_id = req.query.project_id as string | undefined;
    console.log('👷‍♂️ [API] جلب تحويلات العمال:', project_id ? `للمشروع ${project_id}` : 'جميع المشاريع');

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    if (!isAdminUser && project_id && project_id !== 'all' && !accessibleIds.includes(project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    let query = db.select().from(workerTransfers);
    
    if (project_id && project_id !== 'all') {
      query = query.where(eq(workerTransfers.project_id, project_id)) as any;
    }
    
    const transfers = await query.orderBy(desc(workerTransfers.transferDate));

    const filteredTransfers = isAdminUser
      ? transfers
      : transfers.filter((t: any) => t.project_id && accessibleIds.includes(t.project_id));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${filteredTransfers.length} تحويل عامل في ${duration}ms`);

    res.json({
      success: true,
      data: filteredTransfers,
      message: `تم جلب ${transfers.length} تحويل عامل بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في جلب تحويلات العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'خطأ في جلب تحويلات العمال',
      message: error.message,
      processingTime: duration
    });
  }
});

// إضافة تحويل عامل جديد
financialRouter.post('/worker-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('👷‍♂️ [API] إضافة تحويل عامل جديد:', req.body);

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.transferDate === undefined) {
      body.transferDate = body.selectedDate;
    }

    // Validation باستخدام insert schema
    const validationResult = insertWorkerTransferSchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحويل العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحويل العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحويل العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && validationResult.data.project_id && !accessibleIds.includes(validationResult.data.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    console.log('✅ [API] نجح validation تحويل العامل');

    const newTransfer = await db.insert(workerTransfers).values(validationResult.data).returning();

    const wt = newTransfer[0];
    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.recordWorkerTransfer(
        wt.project_id, parseFloat(wt.amount), wt.transferDate, wt.id, (req as any).user?.id
      ),
      'worker-transfer/POST'
    );

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء تحويل العامل بنجاح في ${duration}ms`);

    res.status(201).json({
      success: true,
      data: newTransfer[0],
      message: `تم إنشاء تحويل عامل بقيمة ${newTransfer[0].amount} بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في إضافة تحويل العامل:', error);

    let errorMessage = 'فشل في إنشاء تحويل العامل';
    let statusCode = 500;

    if (error.code === '23503') errorMessage = 'العامل أو المشروع المحدد غير موجود', statusCode = 400;
    else if (error.code === '23502') errorMessage = 'بيانات تحويل العامل ناقصة', statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});

// تعديل تحويل عامل
financialRouter.patch('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🔄 [API] طلب تحديث تحويل العامل من المستخدم:', (req as any).user?.email);
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingTransfer[0]?.project_id && !accessibleIds.includes(existingTransfer[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا التحويل' });
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerTransferSchema.partial().safeParse(req.body);

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
      await FinancialLedgerService.findAndReverseBySource('worker_transfers', transferId, 'تعديل تحويل عامل', (req as any).user?.id);
      return FinancialLedgerService.recordWorkerTransfer(
        t.project_id, parseFloat(t.amount), t.transferDate, t.id, (req as any).user?.id
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

// حذف تحويل عامل
financialRouter.delete('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log('🗑️ [API] طلب حذف حوالة العامل:', transferId);
    console.log('👤 [API] المستخدم:', (req as any).user?.email);

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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingTransfer[0]?.project_id && !accessibleIds.includes(existingTransfer[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا التحويل' });
    }

    const transferToDelete = existingTransfer[0];
    console.log('🗑️ [API] سيتم حذف حوالة العامل:', {
      id: transferToDelete.id,
      project_id: transferToDelete.project_id,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('worker_transfers', transferId, 'حذف', (req as any).user?.id).then(() => ''),
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

/**
 * 💸 مصاريف العمال المتنوعة
 * Worker Miscellaneous Expenses
 */

// جلب مصاريف العمال المتنوعة
financialRouter.get('/worker-misc-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('💸 [API] جلب جميع مصاريف العمال المتنوعة من قاعدة البيانات');

    const expenses = await db.select().from(workerMiscExpenses).orderBy(desc(workerMiscExpenses.date));

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    const filteredExpenses = isAdminUser
      ? expenses
      : expenses.filter((e: any) => e.project_id && accessibleIds.includes(e.project_id));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${filteredExpenses.length} مصروف متنوع في ${duration}ms`);

    res.json({
      success: true,
      data: filteredExpenses,
      message: `تم جلب ${expenses.length} مصروف متنوع للعمال بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في جلب مصاريف العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'خطأ في جلب مصاريف العمال المتنوعة',
      message: error.message,
      processingTime: duration
    });
  }
});

// إضافة مصروف عامل متنوع جديد
financialRouter.post('/worker-misc-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('💸 [API] إضافة مصروف عامل متنوع جديد:', req.body);

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.date === undefined) {
      body.date = body.selectedDate;
    }

    // Validation باستخدام insert schema
    const validationResult = insertWorkerMiscExpenseSchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation مصروف العامل المتنوع:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات مصروف العامل المتنوع غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات مصروف العامل المتنوع غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    if (validationResult.data.project_id === 'all') {
      return res.status(400).json({
        success: false,
        error: 'مشروع غير صالح',
        message: 'لا يمكن إضافة نثريات لـ "جميع المشاريع". يرجى اختيار مشروع محدد.',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && validationResult.data.project_id && !accessibleIds.includes(validationResult.data.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    console.log('✅ [API] نجح validation مصروف العامل المتنوع');

    // إدراج مصروف العامل المتنوع الجديد في قاعدة البيانات
    const newExpense = await db.insert(workerMiscExpenses).values(validationResult.data).returning();

    const record = newExpense[0];
    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.recordMiscExpense(
        record.project_id, parseFloat(record.amount), record.date, record.id, (req as any).user?.id
      ),
      'worker-misc-expenses/POST'
    );

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء مصروف العامل المتنوع بنجاح في ${duration}ms`);

    res.status(201).json({
      success: true,
      data: newExpense[0],
      message: `تم إنشاء مصروف عامل متنوع بقيمة ${newExpense[0].amount} بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في إضافة مصروف العامل:', error);

    let errorMessage = 'فشل في إنشاء مصروف العامل المتنوع';
    let statusCode = 500;

    if (error.code === '23503') errorMessage = 'العامل أو المشروع المحدد غير موجود', statusCode = 400;
    else if (error.code === '23502') errorMessage = 'بيانات مصروف العامل المتنوع ناقصة', statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});

// تعديل مصروف عامل متنوع
financialRouter.patch('/worker-misc-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log('🔄 [API] طلب تحديث المصروف المتنوع للعامل من المستخدم:', (req as any).user?.email);
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingExpense[0]?.project_id && !accessibleIds.includes(existingExpense[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerMiscExpenseSchema.partial().safeParse(req.body);

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
      await FinancialLedgerService.findAndReverseBySource('worker_misc_expenses', expenseId, 'تعديل مصروف متنوع', (req as any).user?.id);
      return FinancialLedgerService.recordMiscExpense(
        t.project_id, parseFloat(t.amount), t.date, t.id, (req as any).user?.id
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

// حذف مصروف عامل متنوع
financialRouter.delete('/worker-misc-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log('🗑️ [API] طلب حذف مصروف العامل المتنوع:', expenseId);
    console.log('👤 [API] المستخدم:', (req as any).user?.email);

    if (!expenseId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف مصروف العامل المتنوع مطلوب',
        message: 'لم يتم توفير معرف المصروف للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود المصروف أولاً
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.id, expenseId)).limit(1);

    if (existingExpense.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] مصروف العامل المتنوع غير موجود:', expenseId);
      return res.status(404).json({
        success: false,
        error: 'مصروف العامل المتنوع غير موجود',
        message: `لم يتم العثور على مصروف بالمعرف: ${expenseId}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingExpense[0]?.project_id && !accessibleIds.includes(existingExpense[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const expenseToDelete = existingExpense[0];
    console.log('🗑️ [API] سيتم حذف مصروف العامل المتنوع:', {
      id: expenseToDelete.id,
      project_id: expenseToDelete.project_id,
      amount: expenseToDelete.amount,
      description: expenseToDelete.description
    });

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('worker_misc_expenses', expenseId, 'حذف', (req as any).user?.id).then(() => ''),
      'worker-misc-expenses/DELETE'
    );

    // حذف مصروف العامل المتنوع من قاعدة البيانات
    console.log('🗑️ [API] حذف مصروف العامل المتنوع من قاعدة البيانات...');
    const deletedExpense = await db
      .delete(workerMiscExpenses)
      .where(eq(workerMiscExpenses.id, expenseId))
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف مصروف العامل المتنوع بنجاح في ${duration}ms:`, {
      id: deletedExpense[0].id,
      amount: deletedExpense[0].amount,
      description: deletedExpense[0].description
    });

    res.json({
      success: true,
      data: deletedExpense[0],
      message: `تم حذف مصروف العامل المتنوع "${deletedExpense[0].description}" بقيمة ${deletedExpense[0].amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف مصروف العامل المتنوع:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في حذف مصروف العامل المتنوع';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'لا يمكن حذف مصروف العامل المتنوع - مرتبط ببيانات أخرى';
      statusCode = 409;
    } else if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف مصروف العامل المتنوع غير صحيح';
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
 * 📊 التقارير المالية
 * Financial Reports
 */

// ملخص التقارير المالية العامة
financialRouter.get('/reports/summary', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('📊 [API] جلب ملخص التقارير المالية العامة');
    console.log('👤 [API] المستخدم:', (req as any).user?.email);

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser) {
      return res.status(403).json({ success: false, message: 'هذا التقرير متاح للمسؤولين فقط' });
    }

    // جلب إحصائيات شاملة من قاعدة البيانات
    const [
      fundTransfersStats,
      projectFundTransfersStats,
      workerTransfersStats,
      workerMiscExpensesStats,
      projectsCount,
      workersCount
    ] = await Promise.all([
      // إحصائيات تحويلات العهدة
      db.execute(sql`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM fund_transfers
      `),
      // إحصائيات تحويلات المشاريع
      db.execute(sql`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM project_fund_transfers
      `),
      // إحصائيات تحويلات العمال
      db.execute(sql`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM worker_transfers
      `),
      // إحصائيات مصاريف العمال المتنوعة
      db.execute(sql`
        SELECT
          COUNT(*) as total_expenses,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM worker_misc_expenses
      `),
      // عدد المشاريع
      db.execute(sql`SELECT COUNT(*) as total_projects FROM projects`),
      // عدد العمال
      db.execute(sql`SELECT COUNT(*) as total_workers FROM workers WHERE is_active = true`)
    ]);

    // استخراج البيانات وتنظيفها
    const cleanValue = (value: any): number => {
      if (value === null || value === undefined) return 0;
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    };

    const cleanCount = (value: any): number => {
      if (value === null || value === undefined) return 0;
      const parsed = parseInt(String(value), 10);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    };

    // تجميع البيانات
    const summary = {
      // إحصائيات التحويلات المالية
      fundTransfers: {
        totalTransfers: cleanCount(fundTransfersStats.rows[0]?.total_transfers),
        totalAmount: cleanValue(fundTransfersStats.rows[0]?.total_amount)
      },
      // إحصائيات تحويلات المشاريع
      projectFundTransfers: {
        totalTransfers: cleanCount(projectFundTransfersStats.rows[0]?.total_transfers),
        totalAmount: cleanValue(projectFundTransfersStats.rows[0]?.total_amount)
      },
      // إحصائيات تحويلات العمال
      workerTransfers: {
        totalTransfers: cleanCount(workerTransfersStats.rows[0]?.total_transfers),
        totalAmount: cleanValue(workerTransfersStats.rows[0]?.total_amount)
      },
      // إحصائيات مصاريف العمال المتنوعة
      workerMiscExpenses: {
        totalExpenses: cleanCount(workerMiscExpensesStats.rows[0]?.total_expenses),
        totalAmount: cleanValue(workerMiscExpensesStats.rows[0]?.total_amount)
      },
      // إحصائيات عامة
      general: {
        totalProjects: cleanCount(projectsCount.rows[0]?.total_projects),
        totalActiveWorkers: cleanCount(workersCount.rows[0]?.total_workers)
      }
    };

    // حساب المجاميع العامة
    const totalIncome = summary.fundTransfers.totalAmount + summary.projectFundTransfers.totalAmount;
    const totalExpenses = summary.workerTransfers.totalAmount + summary.workerMiscExpenses.totalAmount;
    const netBalance = totalIncome - totalExpenses;

    const finalSummary = {
      ...summary,
      // ملخص مالي إجمالي
      financialOverview: {
        totalIncome,
        totalExpenses,
        netBalance,
        lastUpdated: new Date().toISOString()
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ملخص التقارير المالية بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: finalSummary,
      message: 'تم جلب ملخص التقارير المالية بنجاح',
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب ملخص التقارير المالية:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب ملخص التقارير المالية',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 🏪 إدارة الموردين
 * Suppliers Management
 */

// جلب جميع الموردين
financialRouter.get('/suppliers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('🏪 [API] جلب جميع الموردين من قاعدة البيانات');

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const userId = accessReq.user?.id;

    let suppliersList;
    if (isAdminUser) {
      suppliersList = await db.select().from(suppliers)
        .where(eq(suppliers.is_active, true))
        .orderBy(suppliers.name);
    } else {
      suppliersList = await db.select().from(suppliers)
        .where(and(
          eq(suppliers.is_active, true),
          eq(suppliers.created_by, userId!)
        ))
        .orderBy(suppliers.name);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${suppliersList.length} مورد في ${duration}ms`);

    res.json({
      success: true,
      data: suppliersList,
      message: `تم جلب ${suppliersList.length} مورد بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في جلب الموردين:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: 'خطأ في جلب قائمة الموردين',
      message: error.message,
      processingTime: duration
    });
  }
});

// إضافة مورد جديد
financialRouter.post('/suppliers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('🏪 [API] إضافة مورد جديد:', req.body);

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

    const userId = (req as any).user?.id;
    const supplierData = { ...validationResult.data, created_by: userId || null };

    const newSupplier = await db.insert(suppliers).values(supplierData).returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء المورد بنجاح في ${duration}ms`);

    res.status(201).json({
      success: true,
      data: newSupplier[0],
      message: `تم إنشاء المورد "${newSupplier[0].name}" بنجاح`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Financial] خطأ في إضافة المورد:', error);

    let errorMessage = 'فشل في إنشاء المورد';
    let statusCode = 500;

    if (error.code === '23505') errorMessage = 'اسم المورد موجود مسبقاً', statusCode = 409;
    else if (error.code === '23502') errorMessage = 'بيانات المورد ناقصة', statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 🛒 المشتريات المادية
 * Material Purchases
 */

// جلب جميع المشتريات المادية مع الفلاتر
financialRouter.get('/material-purchases', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, supplier_id, dateFrom, dateTo, purchaseType } = req.query;
    
    console.log('📋 [MaterialPurchases] معاملات الطلب:', { project_id, supplier_id, dateFrom, dateTo, purchaseType });
    
    // بناء شروط ديناميكية
    const conditions: any[] = [];
    if (project_id && project_id !== 'all') {
      conditions.push(eq(materialPurchases.project_id, project_id as string));
    }
    if (supplier_id && supplier_id !== 'all') {
      conditions.push(eq(materialPurchases.supplier_id, supplier_id as string));
    }
    if (purchaseType && purchaseType !== 'all') {
      conditions.push(eq(materialPurchases.purchaseType, purchaseType as string));
      console.log('✅ [MaterialPurchases] تطبيق فلترة نوع الدفع:', purchaseType);
    }
    if (dateFrom) {
      conditions.push(gte(materialPurchases.purchaseDate, dateFrom as string));
    }
    if (dateTo) {
      conditions.push(lte(materialPurchases.purchaseDate, dateTo as string));
    }
    
    // جلب المشتريات مع الانضمام لجدول المشاريع للحصول على اسم المشروع
    let query = db
      .select({
        id: materialPurchases.id,
        project_id: materialPurchases.project_id,
        materialName: materialPurchases.materialName,
        materialCategory: materialPurchases.materialCategory,
        materialUnit: materialPurchases.materialUnit,
        quantity: materialPurchases.quantity,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        supplierName: materialPurchases.supplierName,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        purchaseDate: materialPurchases.purchaseDate,
        notes: materialPurchases.notes,
        projectName: projects.name
      })
      .from(materialPurchases)
      .leftJoin(projects, eq(materialPurchases.project_id, projects.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const purchases = await query.orderBy(desc(materialPurchases.purchaseDate));

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    const filteredPurchases = isAdminUser
      ? purchases
      : purchases.filter((p: any) => p.project_id && accessibleIds.includes(p.project_id));
    
    const duration = Date.now() - startTime;
    console.log(`✅ [MaterialPurchases] تم جلب ${filteredPurchases.length} مشترية في ${duration}ms`);
    
    res.json({
      success: true,
      data: filteredPurchases,
      message: `تم جلب ${purchases.length} عملية شراء مادية`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [MaterialPurchases] خطأ في جلب المشتريات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المشتريات المادية',
      message: error.message,
      processingTime: duration
    });
  }
});

// إضافة مشتراة مادية جديدة
financialRouter.post('/material-purchases', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const validationResult = insertMaterialPurchaseSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('❌ [API] فشل في validation مشتريات المواد:', validationResult.error.flatten());
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'بيانات غير صحيحة',
        message: validationResult.error.issues[0]?.message || 'بيانات غير صحيحة',
        details: validationResult.error.flatten().fieldErrors,
        processingTime: duration
      });
    }

    const validated = validationResult.data;

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && validated.project_id && !accessibleIds.includes(validated.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    
    // حساب المبالغ تلقائياً بناءً على نوع الشراء
    const totalAmount = (parseFloat(validated.quantity || "0") * parseFloat(validated.unitPrice || "0")).toString();
    let paidAmount = "0";
    let remainingAmount = "0";

    if (validated.purchaseType === 'نقد' || validated.purchaseType === 'نقداً') {
      paidAmount = totalAmount;
      remainingAmount = '0';
    } else if (validated.purchaseType === 'آجل') {
      paidAmount = "0";
      remainingAmount = totalAmount;
    } else if (validated.purchaseType === 'مخزن') {
      paidAmount = "0";
      remainingAmount = "0";
    }

    const { addToInventory: _addToInv, ...validatedWithoutInventory } = validated as any;
    const purchaseData = { 
      ...validatedWithoutInventory,
      addToInventory: false,
      unitPrice: validated.unitPrice || "0",
      totalAmount: validated.totalAmount || totalAmount,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      materialCategory: validated.materialCategory || null
    } as any;

    // التصحيح النهائي للقيم لضمان الدقة المحاسبية
    if (purchaseData.purchaseType === 'نقد' || purchaseData.purchaseType === 'نقداً') {
      purchaseData.paidAmount = purchaseData.totalAmount;
      purchaseData.remainingAmount = '0';
    } else if (purchaseData.purchaseType === 'آجل') {
      purchaseData.paidAmount = '0';
      purchaseData.remainingAmount = purchaseData.totalAmount;
    } else if (purchaseData.purchaseType === 'مخزن') {
      purchaseData.paidAmount = '0';
      purchaseData.remainingAmount = '0';
    }

    // التحقق من أن المبلغ الإجمالي ليس سالباً
    if (parseFloat(purchaseData.totalAmount) < 0) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'فشل في إضافة المشتراة المادية',
        message: 'يجب ألا يكون المبلغ الإجمالي سالباً',
        processingTime: duration
      });
    }

    const newPurchase = await db
      .insert(materialPurchases)
      .values(purchaseData)
      .returning();
    
    const p = newPurchase[0];
    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.recordMaterialPurchase(
        p.project_id, parseFloat(p.totalAmount || '0'), p.purchaseDate, p.id, p.purchaseType || 'نقد', (req as any).user?.id
      ),
      'material-purchase/POST'
    );

    let createdEquipment = null;
    const shouldAddToInventory = req.body.addToInventory === true || req.body.addToInventory === 'true';
    
    if (shouldAddToInventory) {
      try {
        const rawQty = parseInt(String(p.quantity || '1'), 10);
        const qty = Number.isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;
        const totalAmountVal = parseFloat(p.totalAmount || '0');
        const safePurchasePrice = Number.isNaN(totalAmountVal) || totalAmountVal < 0 ? '0' : String(totalAmountVal);
        
        const [newEquipment] = await db.insert(equipment).values({
          name: p.materialName,
          type: p.materialCategory || null,
          unit: p.materialUnit || p.unit || 'قطعة',
          quantity: qty,
          status: 'available',
          condition: 'excellent',
          description: p.notes || null,
          purchaseDate: p.purchaseDate,
          purchasePrice: safePurchasePrice,
          project_id: p.project_id,
        }).returning();

        const eqCode = `EQ-${String(newEquipment.id).padStart(5, '0')}`;
        await db.update(equipment)
          .set({ code: eqCode })
          .where(eq(equipment.id, newEquipment.id));

        createdEquipment = { ...newEquipment, code: eqCode };

        await db.update(materialPurchases)
          .set({ equipmentId: newEquipment.id, addToInventory: true })
          .where(eq(materialPurchases.id, p.id));

        console.log(`📦 [MaterialPurchases→Equipment] تم إنشاء معدة #${newEquipment.id} (${newEquipment.name}) كود: ${eqCode} تلقائياً من المشتراة ${p.id}`);
      } catch (eqError: any) {
        console.error('⚠️ [MaterialPurchases→Equipment] فشل إنشاء المعدة تلقائياً:', eqError.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [MaterialPurchases] تم إضافة مشتراة جديدة في ${duration}ms`);
    
    res.status(201).json({
      success: true,
      data: { ...newPurchase[0], equipmentId: createdEquipment?.id || null },
      equipmentCreated: !!createdEquipment,
      equipmentData: createdEquipment,
      message: createdEquipment 
        ? 'تم إضافة المشتراة وإنشاء المعدة في المخزن بنجاح'
        : 'تم إضافة المشتراة المادية بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [MaterialPurchases] خطأ في إضافة المشتراة:', error);
    res.status(400).json({
      success: false,
      error: 'فشل في إضافة المشتراة المادية',
      message: error.message,
      processingTime: duration
    });
  }
});

// جلب تفاصيل مشتراة مادية محددة
financialRouter.get('/material-purchases/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const purchase = await db
      .select()
      .from(materialPurchases)
      .where(eq(materialPurchases.id, req.params.id));
    
    if (!purchase.length) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'المشتراة غير موجودة',
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && purchase[0].project_id && !accessibleIds.includes(purchase[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: purchase[0],
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [MaterialPurchases] خطأ في جلب المشتراة:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المشتراة',
      message: error.message,
      processingTime: duration
    });
  }
});

// تحديث مشتراة مادية
financialRouter.patch('/material-purchases/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const validated = insertMaterialPurchaseSchema.partial().parse(req.body);
    const { addToInventory: _addToInv, equipmentId: _eqId, ...validatedWithoutInventory } = validated as any;

    const shouldAddToInventory = req.body.addToInventory === true || req.body.addToInventory === 'true';

    const [existing] = await db.select({ equipmentId: materialPurchases.equipmentId, addToInventory: materialPurchases.addToInventory, project_id: materialPurchases.project_id })
      .from(materialPurchases).where(eq(materialPurchases.id, req.params.id));

    if (!existing) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'المشتراة غير موجودة',
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existing.project_id && !accessibleIds.includes(existing.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const alreadyHasEquipment = !!existing.equipmentId;
    const preservedAddToInventory = alreadyHasEquipment ? true : (shouldAddToInventory ? false : (existing.addToInventory ?? false));

    const updated = await db
      .update(materialPurchases)
      .set({
        ...validatedWithoutInventory,
        addToInventory: preservedAddToInventory,
      })
      .where(eq(materialPurchases.id, req.params.id))
      .returning();
    
    const mp = updated[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('material_purchases', req.params.id, 'تعديل مشتراة', (req as any).user?.id);
      return FinancialLedgerService.recordMaterialPurchase(
        mp.project_id, parseFloat(mp.totalAmount || '0'), mp.purchaseDate, mp.id, mp.purchaseType || 'نقد', (req as any).user?.id
      );
    }, 'material-purchase/PATCH');

    let createdEquipment = null;

    if (shouldAddToInventory && !alreadyHasEquipment) {
      try {
        const rawQty = parseInt(String(mp.quantity || '1'), 10);
        const qty = Number.isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;
        const totalAmountVal = parseFloat(mp.totalAmount || '0');
        const safePurchasePrice = Number.isNaN(totalAmountVal) || totalAmountVal < 0 ? '0' : String(totalAmountVal);

        const [newEquipment] = await db.insert(equipment).values({
          name: mp.materialName,
          type: mp.materialCategory || null,
          unit: mp.materialUnit || mp.unit || 'قطعة',
          quantity: qty,
          status: 'available',
          condition: 'excellent',
          description: mp.notes || null,
          purchaseDate: mp.purchaseDate,
          purchasePrice: safePurchasePrice,
          project_id: mp.project_id,
        }).returning();

        const eqCode2 = `EQ-${String(newEquipment.id).padStart(5, '0')}`;
        await db.update(equipment)
          .set({ code: eqCode2 })
          .where(eq(equipment.id, newEquipment.id));

        createdEquipment = { ...newEquipment, code: eqCode2 };

        await db.update(materialPurchases)
          .set({ equipmentId: newEquipment.id, addToInventory: true })
          .where(eq(materialPurchases.id, mp.id));

        console.log(`📦 [MaterialPurchases→Equipment/PATCH] تم إنشاء معدة #${newEquipment.id} (${newEquipment.name}) كود: ${eqCode2} تلقائياً من المشتراة ${mp.id}`);
      } catch (eqError: any) {
        console.error('⚠️ [MaterialPurchases→Equipment/PATCH] فشل إنشاء المعدة تلقائياً:', eqError.message);
      }
    }

    const finalAddToInventory = !!createdEquipment || alreadyHasEquipment;
    const finalEquipmentId = createdEquipment?.id || existing.equipmentId || null;

    const duration = Date.now() - startTime;
    console.log(`✅ [MaterialPurchases] تم تحديث المشتراة في ${duration}ms`);
    
    res.json({
      success: true,
      data: { ...mp, equipmentId: finalEquipmentId, addToInventory: finalAddToInventory },
      equipmentCreated: !!createdEquipment,
      equipmentData: createdEquipment,
      message: createdEquipment
        ? 'تم تحديث المشتراة وإنشاء المعدة في المخزن بنجاح'
        : 'تم تحديث المشتراة بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [MaterialPurchases] خطأ في تحديث المشتراة:', error);
    res.status(400).json({
      success: false,
      error: 'فشل في تحديث المشتراة',
      message: error.message,
      processingTime: duration
    });
  }
});

// حذف مشتراة مادية
financialRouter.delete('/material-purchases/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const existingPurchase = await db.select().from(materialPurchases).where(eq(materialPurchases.id, req.params.id)).limit(1);
    if (!existingPurchase.length) {
      return res.status(404).json({ success: false, error: 'المشتراة غير موجودة', processingTime: Date.now() - startTime });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingPurchase[0].project_id && !accessibleIds.includes(existingPurchase[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('material_purchases', req.params.id, 'حذف مشتراة', (req as any).user?.id).then(() => ''),
      'material-purchase/DELETE'
    );

    const deleted = await db
      .delete(materialPurchases)
      .where(eq(materialPurchases.id, req.params.id))
      .returning();
    
    if (!deleted.length) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'المشتراة غير موجودة',
        processingTime: duration
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [MaterialPurchases] تم حذف المشتراة في ${duration}ms`);
    
    res.json({
      success: true,
      data: deleted[0],
      message: 'تم حذف المشتراة بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [MaterialPurchases] خطأ في حذف المشتراة:', error);
    res.status(400).json({
      success: false,
      error: 'فشل في حذف المشتراة',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 🚚 نفقات المواصلات
 * Transportation Expenses
 */

// جلب جميع نفقات المواصلات
financialRouter.get('/transportation-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.query;

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    if (!isAdminUser && project_id && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    
    let query: any = db.select().from(transportationExpenses);
    if (project_id) {
      query = query.where(eq(transportationExpenses.project_id, project_id as string));
    }
    
    const expenses = await query.orderBy(desc(transportationExpenses.date));

    const filteredExpenses = isAdminUser
      ? expenses
      : expenses.filter((e: any) => e.project_id && accessibleIds.includes(e.project_id));
    
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: filteredExpenses,
      message: `تم جلب ${expenses.length} نفقة مواصلات`,
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [TransportationExpenses] خطأ:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب النفقات',
      message: error.message,
      processingTime: duration
    });
  }
});

// إضافة نفقة مواصلات جديدة
financialRouter.post('/transportation-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const validated = insertTransportationExpenseSchema.parse(req.body);

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && validated.project_id && !accessibleIds.includes(validated.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    
    const newExpense = await db
      .insert(transportationExpenses)
      .values(validated)
      .returning();
    
    const te = newExpense[0];
    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.recordTransportExpense(
        te.project_id, parseFloat(te.amount || '0'), te.date, te.id, (req as any).user?.id
      ),
      'transport-expense/POST'
    );

    const duration = Date.now() - startTime;
    console.log(`✅ [TransportationExpenses] تم إضافة نفقة جديدة في ${duration}ms`);
    
    res.status(201).json({
      success: true,
      data: newExpense[0],
      message: 'تم إضافة نفقة المواصلات بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [TransportationExpenses] خطأ في الإضافة:', error);
    res.status(400).json({
      success: false,
      error: 'فشل في إضافة النفقة',
      message: error.message,
      processingTime: duration
    });
  }
});

// جلب تفاصيل نفقة محددة
financialRouter.get('/transportation-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const expense = await db
      .select()
      .from(transportationExpenses)
      .where(eq(transportationExpenses.id, req.params.id));
    
    if (!expense.length) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'النفقة غير موجودة',
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && expense[0].project_id && !accessibleIds.includes(expense[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: expense[0],
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [TransportationExpenses] خطأ:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب النفقة',
      message: error.message,
      processingTime: duration
    });
  }
});

// تحديث نفقة مواصلات
financialRouter.patch('/transportation-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const existingExpense = await db.select().from(transportationExpenses).where(eq(transportationExpenses.id, req.params.id)).limit(1);
    if (!existingExpense.length) {
      return res.status(404).json({ success: false, error: 'النفقة غير موجودة', processingTime: Date.now() - startTime });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingExpense[0].project_id && !accessibleIds.includes(existingExpense[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const validated = insertTransportationExpenseSchema.partial().parse(req.body);
    
    const updated = await db
      .update(transportationExpenses)
      .set(validated)
      .where(eq(transportationExpenses.id, req.params.id))
      .returning();
    
    if (!updated.length) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'النفقة غير موجودة',
        processingTime: duration
      });
    }
    
    const tu = updated[0];
    FinancialLedgerService.safeRecord(async () => {
      await FinancialLedgerService.findAndReverseBySource('transportation_expenses', req.params.id, 'تعديل نفقة نقل', (req as any).user?.id);
      return FinancialLedgerService.recordTransportExpense(
        tu.project_id, parseFloat(tu.amount || '0'), tu.date, tu.id, (req as any).user?.id
      );
    }, 'transport-expense/PATCH');

    const duration = Date.now() - startTime;
    console.log(`✅ [TransportationExpenses] تم التحديث في ${duration}ms`);
    
    res.json({
      success: true,
      data: updated[0],
      message: 'تم تحديث النفقة بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [TransportationExpenses] خطأ في التحديث:', error);
    res.status(400).json({
      success: false,
      error: 'فشل في تحديث النفقة',
      message: error.message,
      processingTime: duration
    });
  }
});

financialRouter.delete('/transportation-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const existingExpense = await db.select().from(transportationExpenses).where(eq(transportationExpenses.id, req.params.id)).limit(1);
    if (!existingExpense.length) {
      return res.status(404).json({ success: false, error: 'النفقة غير موجودة', processingTime: Date.now() - startTime });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingExpense[0].project_id && !accessibleIds.includes(existingExpense[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    FinancialLedgerService.safeRecord(
      () => FinancialLedgerService.findAndReverseBySource('transportation_expenses', req.params.id, 'حذف نفقة نقل', (req as any).user?.id).then(() => ''),
      'transport-expense/DELETE'
    );

    const deleted = await db
      .delete(transportationExpenses)
      .where(eq(transportationExpenses.id, req.params.id))
      .returning();
    
    if (!deleted.length) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'النفقة غير موجودة',
        processingTime: duration
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [TransportationExpenses] تم الحذف في ${duration}ms`);
    
    res.json({
      success: true,
      data: deleted[0],
      message: 'تم حذف النفقة بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [TransportationExpenses] خطأ في الحذف:', error);
    res.status(400).json({
      success: false,
      error: 'فشل في حذف النفقة',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * 📊 التقارير المالية
 * Financial Reports
 */

/**
 * GET /api/daily-expenses-excel - جلب مصاريف يوم واحد
 */
financialRouter.get('/daily-expenses-excel', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;
    
    if (!project_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'project_id و date مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // جلب ملخص المصاريف اليومية
    const summary = await db
      .select()
      .from(dailyExpenseSummaries)
      .where(
        and(
          eq(dailyExpenseSummaries.project_id, project_id as string),
          eq(dailyExpenseSummaries.date, date as string)
        )
      )
      .limit(1);

    // جلب عدد أيام العمل من سجلات الحضور
    const attendanceRecords = await db
      .select()
      .from(workerAttendance)
      .where(
        and(
          eq(workerAttendance.project_id, project_id as string),
          eq(workerAttendance.date, date as string)
        )
      );

    const totalWorkDays = attendanceRecords.reduce((sum: any, record: any) => sum + (parseFloat(record.workDays || '0')), 0);

    if (summary.length === 0) {
      return res.json({
        success: true,
        data: {
          date: date as string,
          workerWages: 0,
          workDays: totalWorkDays,
          materialCosts: 0,
          transportation: 0,
          miscExpenses: 0,
          total: 0
        },
        message: 'لا توجد مصاريف لهذا اليوم',
        processingTime: Date.now() - startTime
      });
    }

    const data = summary[0];
    res.json({
      success: true,
      data: {
        date: data.date,
        workerWages: parseFloat(data.totalWorkerWages || '0'),
        workDays: totalWorkDays,
        materialCosts: parseFloat(data.totalMaterialCosts || '0'),
        transportation: parseFloat(data.totalTransportationCosts || '0'),
        miscExpenses: parseFloat(data.totalWorkerMiscExpenses || '0'),
        total: parseFloat(data.totalExpenses || '0')
      },
      message: 'تم جلب مصاريف اليوم بنجاح',
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [DailyExpenses] خطأ في جلب مصاريف اليوم:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب المصاريف',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * GET /api/daily-attendance-details - جلب تفاصيل سجلات الحضور اليومية
 */
financialRouter.get('/daily-attendance-details', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;
    
    if (!project_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'project_id و date مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // جلب سجلات الحضور مع بيانات العمال
    const attendanceRecords = await db
      .select({
        id: workerAttendance.id,
        worker_id: workerAttendance.worker_id,
        workerName: workers.name,
        workDays: workerAttendance.workDays,
        dailyWage: workers.dailyWage,
        actualWage: workerAttendance.actualWage,
        paidAmount: workerAttendance.paidAmount
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
      .where(
        and(
          eq(workerAttendance.project_id, project_id as string),
          eq(workerAttendance.date, date as string)
        )
      )
      .orderBy(workers.name);

    // حساب المتبقي لكل سجل
    const detailedRecords = attendanceRecords.map((record: any) => {
      const actualWage = parseFloat(record.actualWage || '0');
      const paidAmount = parseFloat(record.paidAmount || '0');
      const remainingAmount = actualWage - paidAmount;
      
      return {
        ...record,
        actualWage: actualWage,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount
      };
    });

    res.json({
      success: true,
      data: detailedRecords,
      message: `تم جلب ${detailedRecords.length} سجل حضور`,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [DailyAttendance] خطأ في جلب السجلات:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب سجلات الحضور',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * GET /api/worker-transfers - جلب حوالات العامل في فترة زمنية
 */
financialRouter.get('/worker-transfers-by-period', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, worker_id, dateFrom, dateTo } = req.query;
    
    if (!project_id || !worker_id) {
      return res.status(400).json({
        success: false,
        message: 'project_id و worker_id مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // جلب جميع الحوالات أولاً (بدون فلترة في قاعدة البيانات)
    let transfers = await db
      .select()
      .from(workerTransfers)
      .where(and(
        eq(workerTransfers.project_id, project_id as string),
        eq(workerTransfers.worker_id, worker_id as string)
      ))
      .orderBy(desc(workerTransfers.transferDate));
    
    console.log(`📌 [Transfers] عدد الحوالات الكاملة: ${transfers.length}`);
    
    // فلترة يدوية حسب التاريخ
    if (dateFrom && dateFrom !== '') {
      transfers = transfers.filter((t: any) => t.transferDate >= (dateFrom as string));
      console.log(`📌 [Transfers] بعد dateFrom: ${transfers.length}`);
    }
    if (dateTo && dateTo !== '') {
      transfers = transfers.filter((t: any) => t.transferDate <= (dateTo as string));
      console.log(`📌 [Transfers] بعد dateTo: ${transfers.length}`);
    }

    // حساب الإجمالي
    const totalTransfers = transfers.reduce((sum: any, t: any) => sum + parseFloat(t.amount || '0'), 0);

    res.json({
      success: true,
      data: {
        transfers: transfers.map((t: any) => ({
          id: t.id,
          date: t.transferDate,
          amount: parseFloat(t.amount || '0'),
          description: t.notes || '',
          method: t.transferMethod || ''
        })),
        total: totalTransfers
      },
      message: `تم جلب ${transfers.length} حوالة`,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [WorkerTransfers] خطأ في جلب الحوالات:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الحوالات',
      message: error.message,
      processingTime: duration
    });
  }
});

/**
 * GET /api/worker-statement-excel - جلب بيان العامل
 */
financialRouter.get('/worker-statement-excel', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, worker_id, dateFrom, dateTo } = req.query;
    
    console.log('📋 [WorkerStatement] طلب بيان العامل:', { project_id, worker_id, dateFrom, dateTo });
    
    if (!project_id || !worker_id) {
      return res.status(400).json({
        success: false,
        message: 'project_id و worker_id مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // جلب بيانات العامل
    const workerData = await db
      .select()
      .from(workers)
      .where(eq(workers.id, worker_id as string))
      .limit(1);

    if (workerData.length === 0) {
      return res.json({
        success: true,
        data: {
          worker: { id: worker_id, name: '', type: '', dailyWage: 0 },
          attendance: [],
          transfers: [],
          summary: { totalWorkDays: 0, totalEarned: 0, totalPaid: 0, totalTransfers: 0, remainingBalance: 0 }
        },
        message: 'العامل غير موجود',
        processingTime: Date.now() - startTime
      });
    }

    const worker = workerData[0];

    // جلب سجلات الحضور - بدون فلترة التواريخ (جميع السجلات)
    let attendanceRecords = await db
      .select()
      .from(workerAttendance)
      .where(and(
        eq(workerAttendance.project_id, project_id as string),
        eq(workerAttendance.worker_id, worker_id as string)
      ))
      .orderBy(desc(workerAttendance.date));
    
    console.log(`🔍 [WorkerStatement] عدد سجلات الحضور الكاملة: ${attendanceRecords.length}`);
    
    // فلترة يدوية حسب التاريخ على مستوى التطبيق
    if (dateFrom && dateFrom !== '') {
      attendanceRecords = attendanceRecords.filter((r: any) => r.date && r.date >= (dateFrom as string));
      console.log(`🔍 [WorkerStatement] بعد فلترة dateFrom (${dateFrom}): ${attendanceRecords.length} سجل`);
    }
    if (dateTo && dateTo !== '') {
      attendanceRecords = attendanceRecords.filter((r: any) => r.date && r.date <= (dateTo as string));
      console.log(`🔍 [WorkerStatement] بعد فلترة dateTo (${dateTo}): ${attendanceRecords.length} سجل`);
    }

    // حساب الملخص
    let totalWorkDays = 0;
    let totalEarned = 0;
    let totalPaid = 0;

    const attendanceData = attendanceRecords.map((record: any) => {
      const workDays = parseFloat(record.workDays || '0');
      const dailyWage = parseFloat(worker.dailyWage || '0');
      const actualWage = workDays * dailyWage;
      const paidAmount = parseFloat(record.paidAmount || '0');
      const remainingAmount = actualWage - paidAmount;

      totalWorkDays += workDays;
      totalEarned += actualWage;
      totalPaid += paidAmount;

      return {
        date: record.date,
        workDays,
        dailyWage,
        actualWage: actualWage.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        remainingAmount: remainingAmount.toFixed(2),
        workDescription: record.workDescription || ''
      };
    });

    // جلب الحوالات أيضاً لحساب المتبقي بشكل صحيح
    let transferRecords = await db
      .select()
      .from(workerTransfers)
      .where(and(
        eq(workerTransfers.project_id, project_id as string),
        eq(workerTransfers.worker_id, worker_id as string)
      ));
    
    console.log(`🔍 [WorkerStatement] عدد الحوالات الكاملة: ${transferRecords.length}`);
    
    // فلترة يدوية حسب التاريخ على مستوى التطبيق
    if (dateFrom && dateFrom !== '') {
      transferRecords = transferRecords.filter((t: any) => t.transferDate >= (dateFrom as string));
      console.log(`🔍 [WorkerStatement] بعد فلترة dateFrom (${dateFrom}): ${transferRecords.length} حوالة`);
    }
    if (dateTo && dateTo !== '') {
      transferRecords = transferRecords.filter((t: any) => t.transferDate <= (dateTo as string));
      console.log(`🔍 [WorkerStatement] بعد فلترة dateTo (${dateTo}): ${transferRecords.length} حوالة`);
    }

    let totalTransfers = 0;
    transferRecords.forEach((t: any) => {
      totalTransfers += parseFloat(t.amount || '0');
    });

    res.json({
      success: true,
      data: {
        worker: {
          id: worker.id,
          name: worker.name,
          type: worker.type || '',
          dailyWage: parseFloat(worker.dailyWage || '0')
        },
        attendance: attendanceData,
        summary: {
          totalWorkDays: totalWorkDays.toFixed(2),
          totalEarned: totalEarned.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          totalTransfers: totalTransfers.toFixed(2),
          remainingBalance: (totalEarned - totalPaid - totalTransfers).toFixed(2)
        }
      },
      message: 'تم جلب بيان العامل بنجاح',
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [WorkerStatement] خطأ في جلب بيان العامل:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب البيان',
      message: error.message,
      processingTime: duration
    });
  }
});

financialRouter.get('/reports/summary', async (req: Request, res: Response) => {
  try {
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser) {
      return res.status(403).json({ success: false, message: 'هذا التقرير متاح للمسؤولين فقط' });
    }

    res.json({
      success: true,
      data: {
        totalFundTransfers: 0,
        totalWorkerTransfers: 0,
        totalWorkerExpenses: 0,
        totalProjectFunds: 0
      },
      message: 'ملخص التقارير المالية'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب ملخص التقارير المالية'
    });
  }
});

/**
 * 📊 إحصائيات الموردين
 * Suppliers Statistics
 */
financialRouter.get('/suppliers/statistics', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { supplier_id, project_id, dateFrom, dateTo, purchaseType } = req.query;
    
    // بناء شروط الفلترة
    const conditions: any[] = [];
    if (supplier_id && supplier_id !== 'all') {
      conditions.push(eq(materialPurchases.supplier_id, supplier_id as string));
    }
    if (project_id && project_id !== 'all') {
      conditions.push(eq(materialPurchases.project_id, project_id as string));
    }
    if (purchaseType && purchaseType !== 'all') {
      conditions.push(eq(materialPurchases.purchaseType, purchaseType as string));
    }
    if (dateFrom) {
      conditions.push(gte(materialPurchases.purchaseDate, dateFrom as string));
    }
    if (dateTo) {
      conditions.push(lte(materialPurchases.purchaseDate, dateTo as string));
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const userId = accessReq.user?.id;

    let suppliersList;
    if (isAdminUser) {
      suppliersList = await db.select().from(suppliers).where(eq(suppliers.is_active, true));
    } else {
      suppliersList = await db.select().from(suppliers).where(and(
        eq(suppliers.is_active, true),
        eq(suppliers.created_by, userId!)
      ));
    }
    
    if (!isAdminUser) {
      const accessibleIds = accessReq.accessibleProjectIds ?? [];
      if (accessibleIds.length > 0) {
        conditions.push(inArray(materialPurchases.project_id, accessibleIds));
      } else {
        conditions.push(eq(materialPurchases.project_id, '__none__'));
      }
    }

    let purchasesQuery = db.select().from(materialPurchases);
    if (conditions.length > 0) {
      purchasesQuery = purchasesQuery.where(and(...conditions)) as any;
    }
    const purchasesList = await purchasesQuery;
    
    // حساب الإحصائيات
    let cashTotal = 0, creditTotal = 0, totalPaid = 0, totalDebt = 0;
    
    purchasesList.forEach((p: any) => {
      const totalAmount = parseFloat(p.totalAmount || '0');
      const paidAmount = parseFloat(p.paidAmount || '0');
      const remainingAmount = parseFloat(p.remainingAmount || '0');
      
      if (p.purchaseType === 'نقد') {
        cashTotal += totalAmount;
        totalPaid += totalAmount; // المشتريات النقدية مدفوعة بالكامل
      } else if (p.purchaseType === 'أجل' || p.purchaseType === 'آجل') {
        creditTotal += totalAmount;
        totalDebt += remainingAmount;
        totalPaid += paidAmount;
      }
    });
    
    const duration = Date.now() - startTime;
    return res.json({
      success: true,
      data: {
        totalSuppliers: suppliersList.length,
        totalCashPurchases: cashTotal.toFixed(2),
        totalCreditPurchases: creditTotal.toFixed(2),
        totalDebt: totalDebt.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        remainingDebt: totalDebt.toFixed(2),
        activeSuppliers: suppliersList.filter((s: any) => parseFloat(s.totalDebt || '0') > 0).length
      },
      processingTime: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [Suppliers] خطأ في جلب إحصائيات الموردين:', error);
    return res.status(500).json({
      success: false,
      data: { totalSuppliers: 0, totalCashPurchases: "0", totalCreditPurchases: "0", totalDebt: "0", totalPaid: "0", remainingDebt: "0", activeSuppliers: 0 },
      error: error.message,
      processingTime: duration
    });
  }
});

/**
 * 📅 جلب المشتريات بنطاق تاريخي
 * Material Purchases Date Range
 */
financialRouter.get('/material-purchases/date-range', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const purchases = await db.select().from(materialPurchases).orderBy(desc(materialPurchases.purchaseDate));

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    const filteredPurchases = isAdminUser
      ? purchases
      : purchases.filter((p: any) => p.project_id && accessibleIds.includes(p.project_id));

    const duration = Date.now() - startTime;
    return res.json({
      success: true,
      data: filteredPurchases || [],
      message: `تم جلب ${filteredPurchases?.length || 0} عملية شراء`,
      processingTime: duration
    });
  } catch (error: any) {
    return res.json({
      success: true,
      data: [],
      message: 'تم جلب المشتريات'
    });
  }
});

/**
 * 📦 المواد
 * Materials Management
 */

// جلب جميع المواد
financialRouter.get('/materials', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const materialsList = await db.select().from(materials).orderBy(desc(materials.created_at));
    const duration = Date.now() - startTime;
    
    return res.json({
      success: true,
      data: materialsList || [],
      message: `تم جلب ${materialsList?.length || 0} مادة`,
      processingTime: duration
    });
  } catch (error: any) {
    console.error('❌ [Materials] خطأ في جلب المواد:', error);
    return res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: 'فشل في جلب المواد'
    });
  }
});

// إضافة مادة جديدة
financialRouter.post('/materials', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const validatedData = insertMaterialSchema.parse(req.body);
    
    const [newMaterial] = await db.insert(materials).values(validatedData).returning();
    const duration = Date.now() - startTime;
    
    console.log('✅ [Materials] تم إضافة مادة جديدة:', newMaterial.id);
    
    return res.status(201).json({
      success: true,
      data: newMaterial,
      message: 'تم إضافة المادة بنجاح',
      processingTime: duration
    });
  } catch (error: any) {
    console.error('❌ [Materials] خطأ في إضافة المادة:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في إضافة المادة'
    });
  }
});

// جلب مادة بالـ ID
financialRouter.get('/materials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'المادة غير موجودة'
      });
    }
    
    return res.json({
      success: true,
      data: material,
      message: 'تم جلب المادة بنجاح'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب المادة'
    });
  }
});

// تحديث مادة
financialRouter.patch('/materials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const [updatedMaterial] = await db.update(materials)
      .set(updateData)
      .where(eq(materials.id, id))
      .returning();
    
    if (!updatedMaterial) {
      return res.status(404).json({
        success: false,
        message: 'المادة غير موجودة'
      });
    }
    
    return res.json({
      success: true,
      data: updatedMaterial,
      message: 'تم تحديث المادة بنجاح'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في تحديث المادة'
    });
  }
});

// حذف مادة
financialRouter.delete('/materials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [deletedMaterial] = await db.delete(materials)
      .where(eq(materials.id, id))
      .returning();
    
    if (!deletedMaterial) {
      return res.status(404).json({
        success: false,
        message: 'المادة غير موجودة'
      });
    }
    
    return res.json({
      success: true,
      data: deletedMaterial,
      message: 'تم حذف المادة بنجاح'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في حذف المادة'
    });
  }
});

console.log('💰 [FinancialRouter] تم تهيئة مسارات التحويلات المالية + endpoints التقارير');
console.log('📦 [FinancialRouter] تم تهيئة مسارات المواد: /api/materials');

export default financialRouter;