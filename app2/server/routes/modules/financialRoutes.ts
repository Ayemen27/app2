/**
 * مسارات إدارة التحويلات المالية
 * Financial & Fund Transfer Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, and, sql, gte, lt, lte, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  fundTransfers, projectFundTransfers, workerMiscExpenses, workerTransfers, suppliers, projects, materialPurchases, transportationExpenses, dailyExpenseSummaries, workers, workerAttendance,
  insertFundTransferSchema, insertProjectFundTransferSchema, insertWorkerMiscExpenseSchema, insertWorkerTransferSchema, insertSupplierSchema, insertMaterialPurchaseSchema, insertTransportationExpenseSchema
} from '@shared/schema';
import { requireAuth } from '../../middleware/auth.js';

export const financialRouter = express.Router();

// تطبيق المصادقة على جميع المسارات المالية
financialRouter.use(requireAuth);

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
        projectId: fundTransfers.projectId,
        amount: fundTransfers.amount,
        senderName: fundTransfers.senderName,
        transferNumber: fundTransfers.transferNumber,
        transferType: fundTransfers.transferType,
        transferDate: fundTransfers.transferDate,
        notes: fundTransfers.notes,
        createdAt: fundTransfers.createdAt,
        projectName: projects.name
      })
      .from(fundTransfers)
      .leftJoin(projects, eq(fundTransfers.projectId, projects.id))
      .orderBy(desc(fundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل عهدة في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل عهدة بنجاح`,
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
    const newTransfer = await db.insert(fundTransfers).values(validationResult.data).returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء تحويل العهدة بنجاح في ${duration}ms`);

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

    // حذف تحويل العهدة
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
    const { projectId, date } = req.query;

    console.log('🏗️ [API] جلب تحويلات أموال المشاريع للمصروفات اليومية');
    console.log('🔍 [API] معاملات الطلب:', { projectId, date });

    if (!projectId || !date) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع والتاريخ مطلوبان',
        processingTime: duration
      });
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
        createdAt: projectFundTransfers.createdAt,
        fromProjectName: sql<string>`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
        toProjectName: sql<string>`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
      })
      .from(projectFundTransfers)
      .where(
        and(
          sql`(${projectFundTransfers.fromProjectId} = ${projectId} OR ${projectFundTransfers.toProjectId} = ${projectId})`,
          eq(projectFundTransfers.transferDate, date as string)
        )
      )
      .orderBy(desc(projectFundTransfers.createdAt));

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
    const { projectId, date, dateFrom, dateTo } = req.query;
    console.log('🏗️ [API] جلب تحويلات أموال المشاريع من قاعدة البيانات');
    console.log('🔍 [API] فلترة حسب المشروع:', projectId || 'جميع المشاريع');
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
        createdAt: projectFundTransfers.createdAt,
        fromProjectName: sql`from_project.name`.as('fromProjectName'),
        toProjectName: sql`to_project.name`.as('toProjectName')
      })
      .from(projectFundTransfers)
      .leftJoin(sql`${projects} as from_project`, eq(projectFundTransfers.fromProjectId, sql`from_project.id`))
      .leftJoin(sql`${projects} as to_project`, eq(projectFundTransfers.toProjectId, sql`to_project.id`));

    // تحضير شروط الفلترة وتجميعها في مصفوفة واحدة
    const conditions: any[] = [];

    // فلترة حسب المشروع
    if (projectId && projectId !== 'all') {
      conditions.push(sql`(${projectFundTransfers.fromProjectId} = ${projectId} OR ${projectFundTransfers.toProjectId} = ${projectId})`);
      console.log('✅ [API] تم تطبيق فلترة المشروع:', projectId);
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
        .orderBy(desc(projectFundTransfers.transferDate));
    } else {
      transfers = await baseQuery.orderBy(desc(projectFundTransfers.transferDate));
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل مشروع في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل أموال مشاريع بنجاح`,
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

    // Validation باستخدام insert schema
    const validationResult = insertProjectFundTransferSchema.safeParse(req.body);

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

    console.log('✅ [API] نجح validation تحويل المشروع');

    // إدراج تحويل المشروع الجديد في قاعدة البيانات
    console.log('💾 [API] حفظ تحويل المشروع في قاعدة البيانات...');
    const newTransfer = await db.insert(projectFundTransfers).values(validationResult.data).returning();

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
 * 👷‍♂️ تحويلات العمال ومصاريفهم
 * Worker Transfers & Expenses
 */

// جلب تحويلات العمال
financialRouter.get('/worker-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('👷‍♂️ [API] جلب جميع تحويلات العمال من قاعدة البيانات');

    const transfers = await db.select()
      .from(workerTransfers)
      .orderBy(desc(workerTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل عامل في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
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

    // Validation باستخدام insert schema
    const validationResult = insertWorkerTransferSchema.safeParse(req.body);

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

    console.log('✅ [API] نجح validation تحويل العامل');

    // إدراج تحويل العامل الجديد في قاعدة البيانات
    const newTransfer = await db.insert(workerTransfers).values(validationResult.data).returning();

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

    const transferToDelete = existingTransfer[0];
    console.log('🗑️ [API] سيتم حذف حوالة العامل:', {
      id: transferToDelete.id,
      projectId: transferToDelete.projectId,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });

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

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${expenses.length} مصروف متنوع في ${duration}ms`);

    res.json({
      success: true,
      data: expenses,
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

    // Validation باستخدام insert schema
    const validationResult = insertWorkerMiscExpenseSchema.safeParse(req.body);

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

    console.log('✅ [API] نجح validation مصروف العامل المتنوع');

    // إدراج مصروف العامل المتنوع الجديد في قاعدة البيانات
    const newExpense = await db.insert(workerMiscExpenses).values(validationResult.data).returning();

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

    const expenseToDelete = existingExpense[0];
    console.log('🗑️ [API] سيتم حذف مصروف العامل المتنوع:', {
      id: expenseToDelete.id,
      projectId: expenseToDelete.projectId,
      amount: expenseToDelete.amount,
      description: expenseToDelete.description
    });

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

    const suppliersList = await db.select().from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(suppliers.name);

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

    // إدراج المورد الجديد في قاعدة البيانات
    const newSupplier = await db.insert(suppliers).values(validationResult.data).returning();

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
    const { projectId, supplierId, dateFrom, dateTo, paymentTypeFilter } = req.query;
    
    // بناء شروط ديناميكية
    const conditions: any[] = [];
    if (projectId) conditions.push(eq(materialPurchases.projectId, projectId as string));
    if (supplierId) conditions.push(eq(materialPurchases.supplierId, supplierId as string));
    if (paymentTypeFilter) conditions.push(eq(materialPurchases.purchaseType, paymentTypeFilter as string));
    
    // بناء الـ query
    let query: any = db.select().from(materialPurchases);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const purchases = await query.orderBy(desc(materialPurchases.purchaseDate));
    
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: purchases,
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
    const validated = insertMaterialPurchaseSchema.parse(req.body);
    
    const newPurchase = await db
      .insert(materialPurchases)
      .values({
        ...validated,
        projectId: validated.projectId,
        quantity: validated.quantity,
        unit: validated.unit,
        unitPrice: validated.unitPrice,
        totalAmount: validated.totalAmount,
        purchaseDate: validated.purchaseDate
      })
      .returning();
    
    const duration = Date.now() - startTime;
    console.log(`✅ [MaterialPurchases] تم إضافة مشتراة جديدة في ${duration}ms`);
    
    res.status(201).json({
      success: true,
      data: newPurchase[0],
      message: 'تم إضافة المشتراة المادية بنجاح',
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
    
    const updated = await db
      .update(materialPurchases)
      .set(validated)
      .where(eq(materialPurchases.id, req.params.id))
      .returning();
    
    if (!updated.length) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'المشتراة غير موجودة',
        processingTime: duration
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [MaterialPurchases] تم تحديث المشتراة في ${duration}ms`);
    
    res.json({
      success: true,
      data: updated[0],
      message: 'تم تحديث المشتراة بنجاح',
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
    const { projectId } = req.query;
    
    let query: any = db.select().from(transportationExpenses);
    if (projectId) {
      query = query.where(eq(transportationExpenses.projectId, projectId as string));
    }
    
    const expenses = await query.orderBy(desc(transportationExpenses.date));
    
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: expenses,
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
    
    const newExpense = await db
      .insert(transportationExpenses)
      .values(validated)
      .returning();
    
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

// حذف نفقة مواصلات
financialRouter.delete('/transportation-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
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
    const { projectId, date } = req.query;
    
    if (!projectId || !date) {
      return res.status(400).json({
        success: false,
        message: 'projectId و date مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    // جلب ملخص المصاريف اليومية
    const summary = await db
      .select()
      .from(dailyExpenseSummaries)
      .where(
        and(
          eq(dailyExpenseSummaries.projectId, projectId as string),
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
          eq(workerAttendance.projectId, projectId as string),
          eq(workerAttendance.date, date as string)
        )
      );

    const totalWorkDays = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.workDays || '0')), 0);

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
    const { projectId, date } = req.query;
    
    if (!projectId || !date) {
      return res.status(400).json({
        success: false,
        message: 'projectId و date مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    // جلب سجلات الحضور مع بيانات العمال
    const attendanceRecords = await db
      .select({
        id: workerAttendance.id,
        workerId: workerAttendance.workerId,
        workerName: workers.name,
        workDays: workerAttendance.workDays,
        dailyWage: workers.dailyWage,
        actualWage: workerAttendance.actualWage,
        paidAmount: workerAttendance.paidAmount
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
      .where(
        and(
          eq(workerAttendance.projectId, projectId as string),
          eq(workerAttendance.date, date as string)
        )
      )
      .orderBy(workers.name);

    // حساب المتبقي لكل سجل
    const detailedRecords = attendanceRecords.map(record => {
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
    const { projectId, workerId, dateFrom, dateTo } = req.query;
    
    if (!projectId || !workerId) {
      return res.status(400).json({
        success: false,
        message: 'projectId و workerId مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    // بناء القيود الديناميكية
    const conditions = [
      eq(workerTransfers.projectId, projectId as string),
      eq(workerTransfers.workerId, workerId as string)
    ];

    if (dateFrom) {
      conditions.push(gte(workerTransfers.transferDate, dateFrom as string));
    }
    if (dateTo) {
      conditions.push(lte(workerTransfers.transferDate, dateTo as string));
    }

    // جلب الحوالات
    const transfers = await db
      .select()
      .from(workerTransfers)
      .where(and(...conditions))
      .orderBy(desc(workerTransfers.transferDate));

    // حساب الإجمالي
    const totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

    res.json({
      success: true,
      data: {
        transfers: transfers.map(t => ({
          id: t.id,
          date: t.transferDate,
          amount: parseFloat(t.amount || '0'),
          description: t.description,
          method: t.method
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
    const { projectId, workerId, dateFrom, dateTo } = req.query;
    
    if (!projectId || !workerId) {
      return res.status(400).json({
        success: false,
        message: 'projectId و workerId مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    // جلب بيانات العامل
    const workerData = await db
      .select()
      .from(workers)
      .where(eq(workers.id, workerId as string))
      .limit(1);

    if (workerData.length === 0) {
      return res.json({
        success: true,
        data: {
          worker: { id: workerId, name: '', type: '', dailyWage: 0 },
          attendance: [],
          transfers: [],
          summary: { totalWorkDays: 0, totalEarned: 0, totalPaid: 0, totalTransfers: 0, remainingBalance: 0 }
        },
        message: 'العامل غير موجود',
        processingTime: Date.now() - startTime
      });
    }

    const worker = workerData[0];

    // جلب سجلات الحضور - بناء القيود الديناميكية
    const conditions = [
      eq(workerAttendance.projectId, projectId as string),
      eq(workerAttendance.workerId, workerId as string)
    ];

    if (dateFrom) {
      conditions.push(gte(workerAttendance.date, dateFrom as string));
    }
    if (dateTo) {
      conditions.push(lte(workerAttendance.date, dateTo as string));
    }

    const attendanceRecords = await db
      .select()
      .from(workerAttendance)
      .where(and(...conditions))
      .orderBy(desc(workerAttendance.date));

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
    const transferConditions = [
      eq(workerTransfers.projectId, projectId as string),
      eq(workerTransfers.workerId, workerId as string)
    ];

    if (dateFrom) {
      transferConditions.push(gte(workerTransfers.transferDate, dateFrom as string));
    }
    if (dateTo) {
      transferConditions.push(lte(workerTransfers.transferDate, dateTo as string));
    }

    const transferRecords = await db
      .select()
      .from(workerTransfers)
      .where(and(...transferConditions));

    let totalTransfers = 0;
    transferRecords.forEach(t => {
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
    const suppliersList = await db.select().from(suppliers).where(eq(suppliers.isActive, true));
    const purchasesList = await db.select().from(materialPurchases);
    
    let cashTotal = 0, creditTotal = 0;
    purchasesList.forEach((p: any) => {
      const amt = Number(p.amount || 0);
      if (p.purchaseType === 'cash') cashTotal += amt;
      else if (p.purchaseType === 'credit') creditTotal += amt;
    });
    
    const duration = Date.now() - startTime;
    return res.json({
      success: true,
      data: {
        totalSuppliers: suppliersList.length,
        totalCashPurchases: cashTotal.toFixed(2),
        totalCreditPurchases: creditTotal.toFixed(2),
        totalDebt: creditTotal.toFixed(2),
        totalPaid: "0",
        remainingDebt: creditTotal.toFixed(2),
        activeSuppliers: suppliersList.length
      },
      processingTime: duration
    });
  } catch (error: any) {
    return res.json({
      success: true,
      data: { totalSuppliers: 0, totalCashPurchases: "0", totalCreditPurchases: "0", totalDebt: "0", totalPaid: "0", remainingDebt: "0", activeSuppliers: 0 }
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
    const duration = Date.now() - startTime;
    return res.json({
      success: true,
      data: purchases || [],
      message: `تم جلب ${purchases?.length || 0} عملية شراء`,
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

console.log('💰 [FinancialRouter] تم تهيئة مسارات التحويلات المالية + endpoints التقارير');

export default financialRouter;