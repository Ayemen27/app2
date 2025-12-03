/**
 * مسارات إدارة العمال
 * Worker Management Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../../db.js';
import {
  workers, workerAttendance, workerTransfers, workerMiscExpenses, workerBalances,
  transportationExpenses, enhancedInsertWorkerSchema, insertWorkerAttendanceSchema,
  insertWorkerTransferSchema, insertWorkerMiscExpenseSchema, workerTypes
} from '@shared/schema';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const workerRouter = express.Router();

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

// تطبيق المصادقة على جميع مسارات العمال (بعد الـ public endpoints)
workerRouter.use(requireAuth);

/**
 * 👷 جلب قائمة العمال
 * GET /api/workers
 */
workerRouter.get('/workers', async (req: Request, res: Response) => {
  try {
    console.log('👷 [API] جلب قائمة العمال من قاعدة البيانات');
    
    const workersList = await db.select().from(workers).orderBy(workers.createdAt);
    
    console.log(`✅ [API] تم جلب ${workersList.length} عامل من قاعدة البيانات`);
    
    res.json({ 
      success: true, 
      data: workersList, 
      message: `تم جلب ${workersList.length} عامل بنجاح` 
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب العمال:', error);
    res.status(500).json({ 
      success: false, 
      data: [], 
      error: error.message,
      message: "فشل في جلب قائمة العمال" 
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
    
    // إدراج العامل الجديد في قاعدة البيانات
    console.log('💾 [API] حفظ العامل في قاعدة البيانات...');
    const newWorker = await db.insert(workers).values(validationResult.data).returning();
    
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
 * 🔍 جلب عامل محدد
 * GET /api/workers/:id
 */
workerRouter.get('/workers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const workerId = req.params.id;
    console.log('🔍 [API] طلب جلب عامل محدد:', workerId);
    
    if (!workerId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل',
        processingTime: duration
      });
    }
    
    const worker = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    
    if (worker.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${workerId}`,
        processingTime: duration
      });
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
      dailyWage: updatedWorker[0].dailyWage
    });
    
    res.json({
      success: true,
      data: updatedWorker[0],
      message: `تم تحديث العامل "${updatedWorker[0].name}" (${updatedWorker[0].type}) بنجاح`,
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
    const workerId = req.params.id;
    console.log('🗑️ [API] طلب حذف العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID العامل:', workerId);
    
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
    
    const transferToDelete = existingTransfer[0];
    console.log('🗑️ [API] سيتم حذف حوالة العامل:', {
      id: transferToDelete.id,
      workerId: transferToDelete.workerId,
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
    const { projectId, date } = req.query;
    console.log('📊 [API] جلب مصاريف العمال المتنوعة');
    console.log('🔍 [API] معاملات الفلترة:', { projectId, date });
    
    // بناء الاستعلام مع الفلترة
    let query;
    
    // تطبيق الفلترة حسب المعاملات الموجودة
    if (projectId && date) {
      // فلترة بكل من المشروع والتاريخ
      query = db.select().from(workerMiscExpenses).where(and(
        eq(workerMiscExpenses.projectId, projectId as string),
        eq(workerMiscExpenses.date, date as string)
      ));
    } else if (projectId) {
      // فلترة بالمشروع فقط
      query = db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.projectId, projectId as string));
    } else if (date) {
      // فلترة بالتاريخ فقط
      query = db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.date, date as string));
    } else {
      // بدون فلترة
      query = db.select().from(workerMiscExpenses);
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
 * GET /projects/:projectId/worker-attendance
 */
workerRouter.get('/projects/:projectId/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { date } = req.query;
    
    console.log(`📊 [API] جلب حضور العمال للمشروع: ${projectId}${date ? ` للتاريخ: ${date}` : ''}`);
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    // بناء الاستعلام مع إمكانية الفلترة بالتاريخ
    let whereCondition;
    
    if (date) {
      whereCondition = and(
        eq(workerAttendance.projectId, projectId),
        eq(workerAttendance.date, date as string)
      )!;
    } else {
      whereCondition = eq(workerAttendance.projectId, projectId);
    }

    const attendance = await db.select({
      id: workerAttendance.id,
      workerId: workerAttendance.workerId,
      projectId: workerAttendance.projectId,
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
      createdAt: workerAttendance.createdAt,
      workerName: workers.name
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
    .where(whereCondition)
    .orderBy(workerAttendance.date);
    
    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);
    
    res.json({
      success: true,
      data: attendance,
      message: `تم جلب ${attendance.length} سجل حضور للمشروع${date ? ` في التاريخ ${date}` : ''}`,
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
    console.log('🗑️ [API] سيتم حذف سجل الحضور:', {
      id: attendanceToDelete.id,
      workerId: attendanceToDelete.workerId,
      date: attendanceToDelete.date,
      projectId: attendanceToDelete.projectId
    });
    
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
        projectId: deletedAttendance[0].projectId,
        date: deletedAttendance[0].date
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف سجل الحضور بنجاح في ${duration}ms:`, {
      id: deletedAttendance[0].id,
      workerId: deletedAttendance[0].workerId,
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
    
    // Validation باستخدام insert schema
    const validationResult = insertWorkerAttendanceSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation حضور العامل:', validationResult.error.flatten());
      
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات حضور العامل غير صحيحة';
      
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
    const actualWageValue = parseFloat(validationResult.data.dailyWage) * validationResult.data.workDays;
    const dataWithCalculatedFields = {
      ...validationResult.data,
      workDays: validationResult.data.workDays.toString(), // تحويل إلى string للتوافق مع decimal
      actualWage: actualWageValue.toString(),
      totalPay: actualWageValue.toString() // totalPay = actualWage
    };
    
    // إدراج حضور العامل الجديد في قاعدة البيانات
    console.log('💾 [API] حفظ حضور العامل في قاعدة البيانات...');
    const newAttendance = await db.insert(workerAttendance).values([dataWithCalculatedFields]).returning();
    
    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء حضور العامل بنجاح في ${duration}ms:`, {
      id: newAttendance[0].id,
      workerId: newAttendance[0].workerId,
      date: newAttendance[0].date
    });
    
    // 🔌 Broadcast real-time update via WebSocket
    const io = (global as any).io;
    if (io) {
      io.emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        projectId: newAttendance[0].projectId,
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
    
    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في إنشاء حضور العامل';
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
    
    // Validation باستخدام تحقيق يدوي للبيانات - نسمح بتحديث جزئي
    const validationResult = { success: true, data: req.body, error: null }; // متاح للتحديث الجزئي
    
    // التحقق من صحة البيانات الأساسية
    if (!req.body || typeof req.body !== 'object') {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث حضور العامل غير صحيحة',
        message: 'البيانات المرسلة غير صالحة أو فارغة',
        processingTime: duration
      });
    }

    // حساب actualWage إذا تم تحديث dailyWage أو workDays وتحويل workDays إلى string
    const updateData: any = { ...validationResult.data };
    
    // تحويل workDays إلى string إذا كان موجوداً
    if (updateData.workDays !== undefined) {
      updateData.workDays = updateData.workDays.toString();
    }
    
    // حساب actualWage
    if (updateData.dailyWage && updateData.workDays) {
      const actualWageValue = parseFloat(updateData.dailyWage) * parseFloat(updateData.workDays);
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();
    } else if (updateData.dailyWage && existingAttendance[0].workDays) {
      const actualWageValue = parseFloat(updateData.dailyWage) * parseFloat(existingAttendance[0].workDays);
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();
    } else if (updateData.workDays && existingAttendance[0].dailyWage) {
      const actualWageValue = parseFloat(existingAttendance[0].dailyWage) * parseFloat(updateData.workDays);
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();
    }

    // تحديث حضور العامل
    const updatedAttendance = await db
      .update(workerAttendance)
      .set(updateData)
      .where(eq(workerAttendance.id, attendanceId))
      .returning();
    
    // 🔌 Broadcast real-time update via WebSocket
    const io = (global as any).io;
    if (io && updatedAttendance[0]) {
      io.emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        projectId: updatedAttendance[0].projectId,
        date: updatedAttendance[0].date
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث حضور العامل بنجاح في ${duration}ms`);
    
    res.json({
      success: true,
      data: updatedAttendance[0],
      message: `تم تحديث حضور العامل بتاريخ ${updatedAttendance[0].date} بنجاح`,
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
    
    const transferToDelete = existingTransfer[0];
    console.log('🗑️ [API] سيتم حذف حوالة العامل:', {
      id: transferToDelete.id,
      workerId: transferToDelete.workerId,
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
 * GET /projects/:projectId/worker-misc-expenses
 */
workerRouter.get('/projects/:projectId/worker-misc-expenses', async (req: Request, res: Response) => {
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
 */
workerRouter.get('/workers/:id/stats', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const workerId = req.params.id;
    console.log('📊 [API] جلب إحصائيات العامل:', workerId);
    
    if (!workerId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل',
        processingTime: duration
      });
    }
    
    // التحقق من وجود العامل أولاً
    const worker = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    
    if (worker.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${workerId}`,
        processingTime: duration
      });
    }
    
    // حساب إجمالي عدد أيام العمل من جدول workerAttendance
    const totalWorkDaysResult = await db.select({
      totalDays: sql`COALESCE(SUM(CAST(COALESCE(${workerAttendance.workDays}, '0') AS DECIMAL)), 0)`
    })
    .from(workerAttendance)
    .where(eq(workerAttendance.workerId, workerId));
    
    const totalWorkDays = Number(totalWorkDaysResult[0]?.totalDays) || 0;
    console.log(`📊 [API] إجمالي أيام العمل للعامل ${workerId}: ${totalWorkDays}`);
    
    // جلب تاريخ آخر حضور للعامل
    const lastAttendanceResult = await db.select({
      lastAttendanceDate: workerAttendance.attendanceDate,
      projectId: workerAttendance.projectId
    })
    .from(workerAttendance)
    .where(eq(workerAttendance.workerId, workerId))
    .orderBy(sql`${workerAttendance.attendanceDate} DESC`)
    .limit(1);
    
    const lastAttendanceDate = lastAttendanceResult[0]?.lastAttendanceDate || null;
    
    // حساب معدل الحضور الشهري (عدد أيام الحضور في آخر 30 يوماً)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // حساب معدل الحضور الشهري
    const monthlyAttendanceResult = await db.select({
      monthlyDays: sql`COALESCE(SUM(CAST(COALESCE(${workerAttendance.workDays}, '0') AS DECIMAL)), 0)`
    })
    .from(workerAttendance)
    .where(and(
      eq(workerAttendance.workerId, workerId),
      sql`${workerAttendance.attendanceDate} >= ${thirtyDaysAgoString}`
    ));
    
    const monthlyAttendanceRate = Number(monthlyAttendanceResult[0]?.monthlyDays) || 0;
    console.log(`📊 [API] أيام العمل في آخر 30 يوم: ${monthlyAttendanceRate}`);
    
    // حساب إجمالي التحويلات المالية من جدول workerTransfers
    const totalTransfersResult = await db.select({
      totalTransfers: sql`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
      transfersCount: sql`COUNT(*)`
    })
    .from(workerTransfers)
    .where(eq(workerTransfers.workerId, workerId));
    
    const totalTransfersOnly = Number(totalTransfersResult[0]?.totalTransfers) || 0;
    const transfersCount = Number(totalTransfersResult[0]?.transfersCount) || 0;
    
    // حساب إجمالي الأجور المدفوعة من جدول workerAttendance (paidAmount)
    const totalPaidWagesResult = await db.select({
      totalPaidWages: sql`COALESCE(SUM(CAST(COALESCE(${workerAttendance.paidAmount}, '0') AS DECIMAL)), 0)`
    })
    .from(workerAttendance)
    .where(eq(workerAttendance.workerId, workerId));
    
    const totalPaidWages = Number(totalPaidWagesResult[0]?.totalPaidWages) || 0;
    console.log(`💰 [API] إجمالي الأجور المدفوعة (paidAmount) للعامل ${workerId}: ${totalPaidWages}`);
    
    // إجمالي السحبيات = التحويلات + الأجور المدفوعة
    const totalTransfers = totalTransfersOnly + totalPaidWages;
    console.log(`💰 [API] إجمالي السحبيات (تحويلات ${totalTransfersOnly} + أجور ${totalPaidWages}): ${totalTransfers}`);
    
    // حساب عدد المشاريع التي عمل بها العامل
    const projectsWorkedResult = await db.select({
      projectsCount: sql`COUNT(DISTINCT ${workerAttendance.projectId})`
    })
    .from(workerAttendance)
    .where(eq(workerAttendance.workerId, workerId));
    
    const projectsWorked = Number(projectsWorkedResult[0]?.projectsCount) || 0;
    
    // حساب إجمالي الأرباح باستخدام الأجر اليومي الحالي للعامل × عدد أيام العمل
    // بدلاً من استخدام actualWage المحفوظ في السجل
    const currentDailyWage = parseFloat(worker[0].dailyWage || '0');
    const totalEarnings = currentDailyWage * totalWorkDays;
    console.log(`💰 [API] إجمالي الأرباح (الأجر الحالي × الأيام): ${currentDailyWage} × ${totalWorkDays} = ${totalEarnings}`);
    
    // تجميع الإحصائيات
    const stats = {
      totalWorkDays: totalWorkDays,
      lastAttendanceDate: lastAttendanceDate,
      monthlyAttendanceRate: monthlyAttendanceRate,
      totalTransfers: totalTransfers,
      transfersCount: transfersCount,
      projectsWorked: projectsWorked,
      totalEarnings: totalEarnings,
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
      projectsWorked
    });
    
    res.json({
      success: true,
      data: stats,
      message: `تم جلب إحصائيات العامل "${worker[0].name}" بنجاح`,
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