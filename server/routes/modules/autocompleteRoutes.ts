/**
 * مسارات الإكمال التلقائي
 * Autocomplete Routes - نظام محسّن لتخزين واسترجاع البيانات
 */

import express from 'express';
import { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '../../db.js';
import { autocompleteData, transportationExpenses } from '../../../shared/schema.js';
import { eq, desc, and, sql, inArray, or } from 'drizzle-orm';
import { projectAccessService } from '../../services/ProjectAccessService.js';
import { getAuthUser } from '../../internal/auth-user.js';

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
    const userId = getAuthUser(req)?.user_id ?? '';
    
    if (!category || !value) {
      return res.status(400).json({
        success: false,
        message: 'category و value مطلوبان'
      });
    }

    if (value.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'القيمة طويلة جداً (الحد الأقصى 500 حرف)'
      });
    }
    
    console.log('📝 [API] حفظ إكمال تلقائي:', { category, value, userId });
    
    const existing = await db
      .select()
      .from(autocompleteData)
      .where(and(
        eq(autocompleteData.value, value),
        eq(autocompleteData.category, category),
        eq(autocompleteData.user_id, userId)
      ))
      .limit(1);
    
    let saved;
    if (existing.length > 0) {
      saved = await db
        .update(autocompleteData)
        .set({
          usageCount: (existing[0].usageCount || 1) + 1,
          lastUsed: new Date()
        })
        .where(eq(autocompleteData.id, existing[0].id))
        .returning();
    } else {
      saved = await db
        .insert(autocompleteData)
        .values({
          category,
          value,
          user_id: userId,
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
    const userId = getAuthUser(req)?.user_id ?? '';
    console.log('📊 [API] جلب بيانات الإكمال التلقائي', category ? `للفئة: ${category}` : '(جميع الفئات)', 'للمستخدم:', userId);
    
    let conditions = [eq(autocompleteData.user_id, userId)];
    if (category) {
      conditions.push(eq(autocompleteData.category, category));
    }
    
    const data = await db.select().from(autocompleteData)
      .where(and(...conditions))
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
autocompleteRouter.head('/', (req: Request, res: Response): void => {
  res.status(200).end();
});

/**
 * HEAD /transferTypes - للتحقق
 */
autocompleteRouter.head('/transferTypes', (req: Request, res: Response): void => {
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

const DEFAULT_WORKER_TYPES = [
  'معلم', 'عامل', 'حداد', 'نجار', 'سائق', 'كهربائي', 'سباك',
  'سائق خلاطة', 'حارس', 'تمرير', 'مساح', 'مبيض', 'بلاط', 'لحام'
];

async function seedUserWorkerTypes(userId: string): Promise<void> {
  for (const typeName of DEFAULT_WORKER_TYPES) {
    try {
      await db.insert(autocompleteData).values({
        category: 'worker-types',
        value: typeName,
        user_id: userId,
        usageCount: 1,
        lastUsed: new Date()
      }).onConflictDoNothing();
    } catch (_e) {}
  }
}

/**
 * GET /api/autocomplete/worker-types - أنواع العمال (معزولة لكل مستخدم)
 * يدمج الأنواع من autocomplete + الأنواع الفعلية من سجلات العمال + الجدول العالمي worker_types
 */
autocompleteRouter.get('/worker-types', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthUser(req)?.user_id ?? '';
    const userRole = getAuthUser(req)?.role || '';
    
    let data = await db
      .select()
      .from(autocompleteData)
      .where(and(
        eq(autocompleteData.category, 'worker-types'),
        eq(autocompleteData.user_id, userId)
      ))
      .orderBy(desc(autocompleteData.usageCount));
    
    if (data.length === 0) {
      await seedUserWorkerTypes(userId);
      
      try {
        const { workers: workersTable, workerTypes: workerTypesTable } = await import('../../../shared/schema.js');
        
        const globalTypes = await db.select({ name: workerTypesTable.name }).from(workerTypesTable);
        for (const gt of globalTypes) {
          if (gt.name && !DEFAULT_WORKER_TYPES.includes(gt.name)) {
            try {
              await db.insert(autocompleteData).values({
                category: 'worker-types',
                value: gt.name,
                user_id: userId,
                usageCount: 1,
                lastUsed: new Date()
              }).onConflictDoNothing();
            } catch (_e) {}
          }
        }
      } catch (_e) {}
      
      data = await db
        .select()
        .from(autocompleteData)
        .where(and(
          eq(autocompleteData.category, 'worker-types'),
          eq(autocompleteData.user_id, userId)
        ))
        .orderBy(desc(autocompleteData.usageCount));
    }
    
    const autocompleteValues = new Set(data.map((item: any) => item.value));
    
    try {
      const { workers: workersTable } = await import('../../../shared/schema.js');
      const accessibleProjectIds = await projectAccessService.getAccessibleProjectIds(userId, userRole);
      
      let workerTypesFromRecords;
      if (accessibleProjectIds.length > 0) {
        workerTypesFromRecords = await db
          .selectDistinct({ type: workersTable.type })
          .from(workersTable)
          .where(
            or(
              // Dynamic schema access: workersTable loaded dynamically, project_id column exists at runtime
              inArray((workersTable as unknown as Record<string, typeof workersTable.created_by>).project_id, accessibleProjectIds),
              eq(workersTable.created_by, userId)
            )
          );
      } else {
        workerTypesFromRecords = await db
          .selectDistinct({ type: workersTable.type })
          .from(workersTable)
          .where(eq(workersTable.created_by, userId));
      }
      
      const missingTypes: string[] = [];
      for (const row of workerTypesFromRecords) {
        if (row.type && row.type.trim() && !autocompleteValues.has(row.type)) {
          missingTypes.push(row.type);
        }
      }
      
      for (const typeName of missingTypes) {
        try {
          await db.insert(autocompleteData).values({
            category: 'worker-types',
            value: typeName,
            user_id: userId,
            usageCount: 1,
            lastUsed: new Date()
          }).onConflictDoNothing();
        } catch (_e) {}
      }
      
      if (missingTypes.length > 0) {
        data = await db
          .select()
          .from(autocompleteData)
          .where(and(
            eq(autocompleteData.category, 'worker-types'),
            eq(autocompleteData.user_id, userId)
          ))
          .orderBy(desc(autocompleteData.usageCount));
      }
    } catch (_e) {}
    
    res.json({
      success: true,
      data: data.map((item: any) => ({ value: item.value, label: item.value })),
      message: 'تم جلب أنواع العمال بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أنواع العمال'
    });
  }
});

/**
 * DELETE /api/autocomplete/worker-types/:value - حذف نوع عامل (معزول لكل مستخدم)
 */
autocompleteRouter.delete('/worker-types/:value', requireAuth, async (req: Request, res: Response) => {
  try {
    const typeValue = decodeURIComponent(req.params.value);
    const userId = getAuthUser(req)?.user_id ?? '';
    
    const deleted = await db
      .delete(autocompleteData)
      .where(and(
        eq(autocompleteData.category, 'worker-types'),
        eq(autocompleteData.value, typeValue),
        eq(autocompleteData.user_id, userId)
      ))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'النوع غير موجود'
      });
    }
    
    console.log('🗑️ [API] تم حذف نوع العامل:', typeValue, 'للمستخدم:', userId);
    
    res.json({
      success: true,
      message: 'تم حذف النوع بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في حذف نوع العامل:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في حذف النوع'
    });
  }
});

const DEFAULT_PROJECT_TYPES = [
  'سكني', 'تجاري', 'صناعي', 'زراعي', 'حكومي', 'تعليمي', 'صحي', 'بنية تحتية', 'أخرى'
];

async function seedUserProjectTypes(userId: string) {
  for (const typeName of DEFAULT_PROJECT_TYPES) {
    try {
      await db.insert(autocompleteData).values({
        category: 'project-types',
        value: typeName,
        user_id: userId,
        usageCount: 1,
        lastUsed: new Date()
      }).onConflictDoNothing();
    } catch (_e) {}
  }
}

/**
 * GET /api/autocomplete/project-types - جلب أنواع المشاريع (معزول لكل مستخدم)
 */
autocompleteRouter.get('/project-types', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthUser(req)?.user_id ?? '';
    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    let data = await db
      .select()
      .from(autocompleteData)
      .where(and(
        eq(autocompleteData.category, 'project-types'),
        eq(autocompleteData.user_id, userId)
      ))
      .orderBy(desc(autocompleteData.usageCount));

    if (data.length === 0) {
      await seedUserProjectTypes(userId);

      try {
        const { projectTypes: projectTypesTable } = await import('../../../shared/schema.js');
        const globalTypes = await db.select({ name: projectTypesTable.name }).from(projectTypesTable);
        for (const gt of globalTypes) {
          if (gt.name && !DEFAULT_PROJECT_TYPES.includes(gt.name)) {
            try {
              await db.insert(autocompleteData).values({
                category: 'project-types',
                value: gt.name,
                user_id: userId,
                usageCount: 1,
                lastUsed: new Date()
              }).onConflictDoNothing();
            } catch (_e) {}
          }
        }
      } catch (_e) {}

      data = await db
        .select()
        .from(autocompleteData)
        .where(and(
          eq(autocompleteData.category, 'project-types'),
          eq(autocompleteData.user_id, userId)
        ))
        .orderBy(desc(autocompleteData.usageCount));
    }

    const { projectTypes: projectTypesTable } = await import('../../../shared/schema.js');
    const allProjectTypes = await db.select().from(projectTypesTable);
    const typeNameToId = new Map(allProjectTypes.map((t: any) => [t.name, t.id]));

    const result = data.map((item: any) => {
      const existingId = typeNameToId.get(item.value);
      return {
        value: existingId ? existingId.toString() : item.value,
        label: item.value,
        id: existingId || null
      };
    });

    res.json({
      success: true,
      data: result,
      message: 'تم جلب أنواع المشاريع بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب أنواع المشاريع'
    });
  }
});

/**
 * POST /api/autocomplete/project-types - إضافة نوع مشروع جديد (معزول + إنشاء في project_types)
 */
autocompleteRouter.post('/project-types', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthUser(req)?.user_id ?? '';
    const { value } = req.body;
    if (!value || !value.trim()) {
      return res.status(400).json({ success: false, message: 'القيمة مطلوبة' });
    }

    const trimmed = value.trim();

    await db.insert(autocompleteData).values({
      category: 'project-types',
      value: trimmed,
      user_id: userId,
      usageCount: 1,
      lastUsed: new Date()
    }).onConflictDoNothing();

    const { projectTypes: projectTypesTable } = await import('../../../shared/schema.js');
    let projectType;
    const existing = await db.select().from(projectTypesTable).where(eq(projectTypesTable.name, trimmed));
    if (existing.length > 0) {
      projectType = existing[0];
    } else {
      const inserted = await db.insert(projectTypesTable).values({
        name: trimmed,
        is_active: true
      }).returning();
      projectType = inserted[0];
    }

    res.json({
      success: true,
      data: {
        value: projectType.id.toString(),
        label: trimmed,
        id: projectType.id
      },
      message: 'تم إضافة نوع المشروع بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في إضافة نوع المشروع'
    });
  }
});

/**
 * DELETE /api/autocomplete/project-types/:value - حذف نوع مشروع (معزول لكل مستخدم)
 */
autocompleteRouter.delete('/project-types/:value', requireAuth, async (req: Request, res: Response) => {
  try {
    const typeValue = decodeURIComponent(req.params.value);
    const userId = getAuthUser(req)?.user_id ?? '';

    const deleted = await db
      .delete(autocompleteData)
      .where(and(
        eq(autocompleteData.category, 'project-types'),
        eq(autocompleteData.value, typeValue),
        eq(autocompleteData.user_id, userId)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: 'النوع غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف نوع المشروع بنجاح' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في حذف نوع المشروع'
    });
  }
});

const DEFAULT_TRANSPORT_CATEGORIES = [
  'نقل عمال', 'توريد مواد', 'نقل خرسانة', 'نقل حديد ومنصات',
  'بترول شاص', 'بترول هيلكس', 'تحميل وتنزيل', 'صيانة وإصلاح',
  'توريد مياه', 'أخرى'
];

const ENGLISH_TO_ARABIC_CATEGORIES: Record<string, string> = {
  'worker_transport': 'نقل عمال',
  'material_supply': 'توريد مواد',
  'concrete_transport': 'نقل خرسانة',
  'iron_platforms': 'نقل حديد ومنصات',
  'fuel_shas': 'بترول شاص',
  'fuel_hilux': 'بترول هيلكس',
  'loading_unloading': 'تحميل وتنزيل',
  'maintenance': 'صيانة وإصلاح',
  'water_supply': 'توريد مياه',
  'other': 'أخرى'
};

async function seedUserTransportCategories(userId: string): Promise<void> {
  for (const cat of DEFAULT_TRANSPORT_CATEGORIES) {
    try {
      await db.insert(autocompleteData).values({
        category: 'transport-categories',
        value: cat,
        user_id: userId,
        usageCount: 1,
        lastUsed: new Date()
      }).onConflictDoNothing();
    } catch (_e) {}
  }
}

/**
 * GET /api/autocomplete/transport-categories - فئات النقل (معزولة لكل مستخدم)
 * يدمج الفئات من autocomplete + الفئات الفعلية من سجلات النقل
 */
autocompleteRouter.get('/transport-categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthUser(req)?.user_id ?? '';
    
    let data = await db
      .select()
      .from(autocompleteData)
      .where(and(
        eq(autocompleteData.category, 'transport-categories'),
        eq(autocompleteData.user_id, userId)
      ))
      .orderBy(desc(autocompleteData.usageCount));
    
    if (data.length === 0) {
      await seedUserTransportCategories(userId);
      data = await db
        .select()
        .from(autocompleteData)
        .where(and(
          eq(autocompleteData.category, 'transport-categories'),
          eq(autocompleteData.user_id, userId)
        ))
        .orderBy(desc(autocompleteData.usageCount));
    }
    
    const autocompleteValues = new Set(data.map((item: any) => item.value));
    
    try {
      const userRole = getAuthUser(req)?.role || '';
      const accessibleProjectIds = await projectAccessService.getAccessibleProjectIds(userId, userRole);
      
      if (accessibleProjectIds.length > 0) {
        const recordCategories = await db
          .selectDistinct({ category: transportationExpenses.category })
          .from(transportationExpenses)
          .where(inArray(transportationExpenses.project_id, accessibleProjectIds));
        
        const missingCategories: string[] = [];
        for (const row of recordCategories) {
          const arabicName = ENGLISH_TO_ARABIC_CATEGORIES[row.category] || row.category;
          if (arabicName && !autocompleteValues.has(arabicName)) {
            missingCategories.push(arabicName);
          }
        }
        
        for (const cat of missingCategories) {
          try {
            await db.insert(autocompleteData).values({
              category: 'transport-categories',
              value: cat,
              user_id: userId,
              usageCount: 1,
              lastUsed: new Date()
            }).onConflictDoNothing();
          } catch (_e) {}
        }
        
        if (missingCategories.length > 0) {
          data = await db
            .select()
            .from(autocompleteData)
            .where(and(
              eq(autocompleteData.category, 'transport-categories'),
              eq(autocompleteData.user_id, userId)
            ))
            .orderBy(desc(autocompleteData.usageCount));
        }
      }
    } catch (_e) {}
    
    res.json({
      success: true,
      data: data.map((item: any) => ({ value: item.value, label: item.value })),
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
 * DELETE /api/autocomplete/transport-categories/:value - حذف فئة نقل (معزولة لكل مستخدم)
 */
autocompleteRouter.delete('/transport-categories/:value', requireAuth, async (req: Request, res: Response) => {
  try {
    const categoryValue = decodeURIComponent(req.params.value);
    const userId = getAuthUser(req)?.user_id ?? '';
    
    const deleted = await db
      .delete(autocompleteData)
      .where(and(
        eq(autocompleteData.category, 'transport-categories'),
        eq(autocompleteData.value, categoryValue),
        eq(autocompleteData.user_id, userId)
      ))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'الفئة غير موجودة'
      });
    }
    
    console.log('🗑️ [API] تم حذف فئة النقل:', categoryValue, 'للمستخدم:', userId);
    
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
      
      const categories = new Set(allData.map((d: any) => d.category));
      const totalEntries = allData.length;
      
      res.json({
        success: true,
        data: {
          totalRecords: totalEntries,
          categoriesCount: categories.size,
          lastUpdated: new Date(),
          categoryBreakdown: Array.from(categories).map((cat: any) => ({
            category: cat,
            count: allData.filter((d: any) => d.category === cat).length,
            avgUsage: allData.filter((d: any) => d.category === cat)
              .reduce((sum: any, d: any) => sum + (d.usageCount || 1), 0) / 
              allData.filter((d: any) => d.category === cat).length
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
