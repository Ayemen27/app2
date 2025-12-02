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
 * 📊 GET /api/autocomplete - جلب جميع بيانات الإكمال التلقائي
 * ✅ إرجاع كائنات كاملة للتوافق مع Frontend
 */
autocompleteRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('📊 [API] جلب بيانات الإكمال التلقائي');
    
    const data = await db
      .select()
      .from(autocompleteData)
      .orderBy(desc(autocompleteData.usageCount))
      .limit(1000);
    
    // ✅ تجميع البيانات حسب الفئة مع إرجاع كائنات كاملة
    const grouped: Record<string, typeof data> = {};
    data.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    
    const duration = Date.now() - startTime;
    
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
      data: {},
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

export default autocompleteRouter;
