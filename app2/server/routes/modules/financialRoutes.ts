/**
 * مسارات إدارة التحويلات المالية
 * Financial & Fund Transfer Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, and, sql, gte, lt, lte, desc } from 'drizzle-orm';
import { db } from '../../db';
import { 
  fundTransfers, projectFundTransfers, workerMiscExpenses, workerTransfers, suppliers, projects,
  insertFundTransferSchema, insertProjectFundTransferSchema, insertWorkerMiscExpenseSchema, insertWorkerTransferSchema, insertSupplierSchema
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
    
    const transfers = await db.select().from(fundTransfers).orderBy(desc(fundTransfers.transferDate));
    
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

// جلب تحويلات أموال المشاريع
financialRouter.get('/project-fund-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('🏗️ [API] جلب جميع تحويلات أموال المشاريع من قاعدة البيانات');
    
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
        fromProjectName: sql`from_project.name`.as('fromProjectName'),
        toProjectName: sql`to_project.name`.as('toProjectName')
      })
      .from(projectFundTransfers)
      .leftJoin(sql`${projects} as from_project`, eq(projectFundTransfers.fromProjectId, sql`from_project.id`))
      .leftJoin(sql`${projects} as to_project`, eq(projectFundTransfers.toProjectId, sql`to_project.id`))
      .orderBy(desc(projectFundTransfers.transferDate));
    
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

/**
 * 👷‍♂️ تحويلات العمال ومصاريفهم
 * Worker Transfers & Expenses
 */

// جلب تحويلات العمال
financialRouter.get('/worker-transfers', async (req: Request, res: Response) => {
  try {
    console.log('👷‍♂️ [API] جلب تحويلات العمال');
    
    res.json({
      success: true,
      data: [],
      message: 'تحويلات العمال - سيتم نقل المنطق'
    });
  } catch (error: any) {
    console.error('❌ [Financial] خطأ في جلب تحويلات العمال:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب تحويلات العمال',
      message: error.message
    });
  }
});

// إضافة تحويل عامل جديد
financialRouter.post('/worker-transfers', async (req: Request, res: Response) => {
  try {
    console.log('👷‍♂️ [API] إضافة تحويل عامل جديد');
    
    res.json({
      success: true,
      message: 'إضافة تحويل عامل - سيتم نقل المنطق'
    });
  } catch (error: any) {
    console.error('❌ [Financial] خطأ في إضافة تحويل العامل:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إضافة تحويل العامل',
      message: error.message
    });
  }
});

// تعديل تحويل عامل
financialRouter.patch('/worker-transfers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('👷‍♂️ [API] تعديل تحويل العامل:', id);
    
    res.json({
      success: true,
      message: `تعديل تحويل العامل ${id} - سيتم نقل المنطق`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'خطأ في تعديل تحويل العامل'
    });
  }
});

// حذف تحويل عامل
financialRouter.delete('/worker-transfers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('👷‍♂️ [API] حذف تحويل العامل:', id);
    
    res.json({
      success: true,
      message: `حذف تحويل العامل ${id} - سيتم نقل المنطق`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'خطأ في حذف تحويل العامل'
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
  try {
    console.log('💸 [API] إضافة مصروف عامل متنوع جديد');
    
    res.json({
      success: true,
      message: 'إضافة مصروف عامل متنوع - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'خطأ في إضافة مصروف العامل'
    });
  }
});

// تعديل مصروف عامل متنوع
financialRouter.patch('/worker-misc-expenses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('💸 [API] تعديل مصروف العامل:', id);
    
    res.json({
      success: true,
      message: `تعديل مصروف العامل ${id} - سيتم نقل المنطق`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'خطأ في تعديل مصروف العامل'
    });
  }
});

// حذف مصروف عامل متنوع
financialRouter.delete('/worker-misc-expenses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('💸 [API] حذف مصروف العامل:', id);
    
    res.json({
      success: true,
      message: `حذف مصروف العامل ${id} - سيتم نقل المنطق`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'خطأ في حذف مصروف العامل'
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
 * 📊 التقارير المالية
 * Financial Reports
 */
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
      message: 'ملخص التقارير المالية - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب ملخص التقارير المالية'
    });
  }
});

console.log('💰 [FinancialRouter] تم تهيئة مسارات التحويلات المالية');

export default financialRouter;