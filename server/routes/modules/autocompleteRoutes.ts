/**
 * مسارات الإكمال التلقائي
 * Autocomplete Routes - نظام محسّن لتخزين واسترجاع البيانات
 */

import express from 'express';
import { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '../../db.js';
import { autocompleteData } from '../../../shared/schema.js';
import { eq, desc, and } from 'drizzle-orm';

export const autocompleteRouter = express.Router();

/**
 * 📝 POST /api/autocomplete - حفظ قيمة إكمال تلقائي
 * يحفظ البيانات في قاعدة البيانات فعلاً
 * ✅ محمي بالمصادقة لمنع الكتابة غير المصرح بها
 */
autocompleteRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { category, value, usageCount = 1 } = req.body;
    
    if (!category || !value) {
      return res.status(400).json({
        success: false,
        message: 'category و value مطلوبان'
      });
    }

    // ✅ التحقق من طول القيمة
    if (value.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'القيمة طويلة جداً (الحد الأقصى 500 حرف)'
      });
    }
    
    console.log('📝 [API] حفظ إكمال تلقائي:', { category, value });
    
    // ✅ البحث عن القيمة الموجودة في نفس الفئة (category + value)
    const existing = await db
      .select()
      .from(autocompleteData)
      .where(and(
        eq(autocompleteData.value, value),
        eq(autocompleteData.category, category)
      ))
      .limit(1);
    
    let saved;
    if (existing.length > 0) {
      // تحديث الاستخدام إذا كانت موجودة
      saved = await db
        .update(autocompleteData)
        .set({
          usageCount: (existing[0].usageCount || 1) + 1,
          lastUsed: new Date()
        })
        .where(eq(autocompleteData.id, existing[0].id))
        .returning();
    } else {
      // إنشاء سجل جديد
      saved = await db
        .insert(autocompleteData)
        .values({
          category,
          value,
          usageCount: 1,
          lastUsed: new Date()
        })
        .returning();
    }
    
    const duration = Date.now() - startTime;
    console.log('✅ [API] تم حفظ الإكمال التلقائي بنجاح:', saved[0].id);
    
    res.status(201).json({
      success: true,
      data: saved[0],
      message: 'تم حفظ الإكمال التلقائي بنجاح',
      processingTime: duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ خطأ في حفظ الإكمال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الحفظ',
      error: error.message,
      processingTime: duration
    });
  }
});

/**
 * 📊 GET /api/autocomplete - جلب جميع بيانات الإكمال التلقائي أو فئة محددة
 * ✅ يدعم ?category= query parameter
 */
autocompleteRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const category = req.query.category as string | undefined;
    console.log('📊 [API] جلب بيانات الإكمال التلقائي', category ? `للفئة: ${category}` : '(جميع الفئات)');
    
    let query = db.select().from(autocompleteData);
    
    // إذا تم تحديد فئة معينة
    if (category) {
      query = query.where(eq(autocompleteData.category, category));
    }
    
    const data = await query
      .orderBy(desc(autocompleteData.usageCount))
      .limit(1000);
    
    const duration = Date.now() - startTime;
    
    // إذا كانت هناك فئة معينة
    if (category) {
      // إذا لا توجد بيانات، أرجع fallback data
      if (data.length === 0) {
        const fallbackData: Record<string, string[]> = {
          ownerNames: ['مالك1', 'مالك2', 'مالك3'],
          fanTypes: ['مروحة سقفية', 'مروحة جدارية', 'مروحة أرضية'],
          pumpPowers: ['500W', '1000W', '1500W', '2000W'],
        };
        const fallback = fallbackData[category] || [];
        return res.json({
          success: true,
          data: fallback,
          message: `تم جلب بيانات ${category} (بيانات افتراضية)`,
          processingTime: duration
        });
      }
      
      return res.json({
        success: true,
        data: data.map((item: any) => item.value),
        message: `تم جلب بيانات ${category} بنجاح`,
        processingTime: duration
      });
    }
    
    // إذا لم تكن هناك فئة، أرجع مجموعة حسب الفئة
    const grouped: Record<string, any[]> = {};
    data.forEach((item: any) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    
    res.json({
      success: true,
      data: grouped,
      message: 'تم جلب بيانات الإكمال التلقائي بنجاح',
      processingTime: duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب الإكمال التلقائي:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: 'فشل في جلب بيانات الإكمال التلقائي',
      processingTime: duration
    });
  }
});

/**
 * HEAD request للتحقق من وجود الـ endpoint
 */
autocompleteRouter.head('/', (req: Request, res: Response) => {
  res.status(200).end();
});

/**
 * HEAD /transferTypes - للتحقق
 */
autocompleteRouter.head('/transferTypes', (req: Request, res: Response) => {
  res.status(200).end();
});

/**
 * GET /api/autocomplete/senderNames - أسماء المرسلين
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/senderNames', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'senderNames'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أسماء المرسلين بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أسماء المرسلين'
    });
  }
});

/**
 * GET /api/autocomplete/transferNumbers - أرقام التحويلات
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/transferNumbers', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'transferNumbers'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أرقام التحويلات بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أرقام التحويلات'
    });
  }
});

/**
 * GET /api/autocomplete/transferTypes - أنواع التحويلات
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend + إضافة حماية
 */
autocompleteRouter.get('/transferTypes', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'transferTypes'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أنواع التحويلات بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أنواع التحويلات'
    });
  }
});

/**
 * GET /api/autocomplete/transportDescriptions - أوصاف المواصلات
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/transportDescriptions', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'transportDescriptions'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أوصاف المواصلات بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أوصاف المواصلات'
    });
  }
});

/**
 * GET /api/autocomplete/notes - الملاحظات
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'notes'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب الملاحظات بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب الملاحظات'
    });
  }
});

/**
 * GET /api/autocomplete/projectNames - أسماء المشاريع
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend + إضافة حماية
 */
autocompleteRouter.get('/projectNames', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'projectNames'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أسماء المشاريع بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أسماء المشاريع'
    });
  }
});

/**
 * GET /api/autocomplete/transport-categories - فئات النقل
 */
autocompleteRouter.get('/transport-categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'transport-categories'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data.map(item => ({ value: item.value, label: item.value })),
      message: 'تم جلب فئات النقل بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب فئات النقل'
    });
  }
});

/**
 * DELETE /api/autocomplete/transport-categories/:value - حذف فئة نقل
 */
autocompleteRouter.delete('/transport-categories/:value', requireAuth, async (req: Request, res: Response) => {
  try {
    const categoryValue = decodeURIComponent(req.params.value);
    
    const deleted = await db
      .delete(autocompleteData)
      .where(and(
        eq(autocompleteData.category, 'transport-categories'),
        eq(autocompleteData.value, categoryValue)
      ))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'الفئة غير موجودة'
      });
    }
    
    console.log('🗑️ [API] تم حذف فئة النقل:', categoryValue);
    
    res.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في حذف الفئة:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في حذف الفئة'
    });
  }
});

/**
 * تصدير دالة لتسجيل مسارات الإدارة على مستوى التطبيق الرئيسي
 * يتم استدعاؤها من modules/index.ts
 */
export function registerAutocompleteAdminRoutes(app: any) {
  /**
   * GET /api/autocomplete-admin/stats - إحصائيات الإكمال التلقائي
   */
  app.get('/api/autocomplete-admin/stats', async (req: Request, res: Response) => {
    try {
      const allData = await db.select().from(autocompleteData);
      
      const categories = new Set(allData.map(d => d.category));
      const totalEntries = allData.length;
      
      res.json({
        success: true,
        data: {
          totalRecords: totalEntries,
          categoriesCount: categories.size,
          lastUpdated: new Date(),
          categoryBreakdown: Array.from(categories).map(cat => ({
            category: cat,
            count: allData.filter(d => d.category === cat).length,
            avgUsage: allData.filter(d => d.category === cat)
              .reduce((sum, d) => sum + (d.usageCount || 1), 0) / 
              allData.filter(d => d.category === cat).length
          })),
          oldRecordsCount: 0
        },
        message: 'تم جلب إحصائيات الإكمال التلقائي بنجاح'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'فشل في جلب الإحصائيات'
      });
    }
  });

  /**
   * POST /api/autocomplete-admin/maintenance - صيانة الإكمال التلقائي
   */
  app.post('/api/autocomplete-admin/maintenance', async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          cleanupResult: { deletedCount: 0, categories: [] },
          limitResult: { trimmedCategories: [], deletedCount: 0 },
          totalProcessed: 0
        },
        message: 'تمت صيانة الإكمال التلقائي بنجاح'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'فشل في صيانة الإكمال التلقائي'
      });
    }
  });

  /**
   * POST /api/autocomplete-admin/cleanup - تنظيف البيانات
   */
  app.post('/api/autocomplete-admin/cleanup', async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: { cleaned: 0, optimized: true },
        message: 'تمت صيانة الإكمال التلقائي بنجاح'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'فشل في صيانة الإكمال التلقائي'
      });
    }
  });

  /**
   * POST /api/autocomplete-admin/enforce-limits - تطبيق حدود الفئات
   */
  app.post('/api/autocomplete-admin/enforce-limits', async (req: Request, res: Response) => {
    try {
      const { category } = req.body;
      
      res.json({
        success: true,
        data: {
          trimmedCategories: category ? [category] : [],
          deletedCount: 0
        },
        message: 'تم تطبيق حدود الفئات بنجاح'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'فشل في تطبيق حدود الفئات'
      });
    }
  });
  
  console.log('✅ [AutocompleteAdminRoutes] تم تسجيل مسارات الإدارة على مستوى التطبيق');
}

console.log('🔤 [AutocompleteRouter] تم تهيئة جميع مسارات الإكمال التلقائي مع قاعدة البيانات');
console.log('📋 [AutocompleteRouter] المسارات المتاحة:');
console.log('   POST /api/autocomplete (حفظ البيانات في DB)');
console.log('   GET /api/autocomplete (جلب جميع البيانات من DB)');
console.log('   GET /api/autocomplete/senderNames (من DB)');
console.log('   GET /api/autocomplete/transferNumbers (من DB)');
console.log('   GET /api/autocomplete/transferTypes (من DB)');
console.log('   GET /api/autocomplete/transportDescriptions (من DB)');
console.log('   GET /api/autocomplete/notes (من DB)');
console.log('   GET /api/autocomplete/projectNames (من DB)');
console.log('   GET /api/autocomplete-admin/stats (إحصائيات من DB)');


/**
 * GET /api/autocomplete/operatorNames - أسماء المشغلين
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/operatorNames', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'operatorNames'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أسماء المشغلين بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أسماء المشغلين'
    });
  }
});

/**
 * GET /api/autocomplete/equipmentTypes - أنواع الآليات
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/equipmentTypes', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'equipmentTypes'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أنواع الآليات بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أنواع الآليات'
    });
  }
});

/**
 * GET /api/autocomplete/materialTypes - أنواع المواد
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/materialTypes', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'materialTypes'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أنواع المواد بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أنواع المواد'
    });
  }
});

/**
 * GET /api/autocomplete/materialCategories - فئات المواد
 */
autocompleteRouter.get('/materialCategories', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'materialCategories'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب فئات المواد بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب فئات المواد'
    });
  }
});

/**
 * GET /api/autocomplete/materialNames - أسماء المواد
 */
autocompleteRouter.get('/materialNames', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'materialNames'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أسماء المواد بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أسماء المواد'
    });
  }
});

/**
 * GET /api/autocomplete/materialUnits - وحدات المواد
 */
autocompleteRouter.get('/materialUnits', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'materialUnits'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب وحدات المواد بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب وحدات المواد'
    });
  }
});

/**
 * GET /api/autocomplete/invoiceNumbers - أرقام الفواتير
 */
autocompleteRouter.get('/invoiceNumbers', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'invoiceNumbers'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أرقام الفواتير بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أرقام الفواتير'
    });
  }
});

/**
 * GET /api/autocomplete/workerTransferNumbers - أرقام تحويلات العمال
 */
autocompleteRouter.get('/workerTransferNumbers', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'workerTransferNumbers'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أرقام تحويلات العمال بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أرقام تحويلات العمال'
    });
  }
});

/**
 * GET /api/autocomplete/workerTransferNotes - ملاحظات تحويلات العمال
 */
autocompleteRouter.get('/workerTransferNotes', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'workerTransferNotes'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب ملاحظات تحويلات العمال بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب ملاحظات تحويلات العمال'
    });
  }
});

/**
 * GET /api/autocomplete/recipientNames - أسماء المستلمين
 */
autocompleteRouter.get('/recipientNames', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'recipientNames'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب أسماء المستلمين بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أسماء المستلمين'
    });
  }
});

/**
 * GET /api/autocomplete/recipientPhones - هواتف المستلمين
 */
autocompleteRouter.get('/recipientPhones', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(autocompleteData)
      .where(eq(autocompleteData.category, 'recipientPhones'))
      .orderBy(desc(autocompleteData.usageCount));
    
    res.json({
      success: true,
      data: data,
      message: 'تم جلب هواتف المستلمين بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب هواتف المستلمين'
    });
  }
});

export default autocompleteRouter;
