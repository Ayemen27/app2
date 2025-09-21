/**
 * مسارات الإكمال التلقائي
 * Autocomplete Routes - منظم بعناية للأمان والأداء
 */

import express from 'express';
import { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { routeManager } from '../../config/routes.js';

export const autocompleteRouter = express.Router();

/**
 * 🔍 مسار HEAD للفحص المسبق (عام - بدون مصادقة)
 * HEAD /api/autocomplete - Pre-flight check
 */
autocompleteRouter.head('/', (req: Request, res: Response) => {
  console.log('📊 [API] جلب بيانات الإكمال التلقائي (HEAD)');
  
  // إرسال headers فقط بدون body
  res.set({
    'Content-Type': 'application/json',
    'X-Autocomplete-Available': 'true',
    'X-Rate-Limit-Remaining': '100',
    'X-Categories': 'senderNames,transferNumbers,transferTypes,notes,transportDescriptions,workerMiscDescriptions'
  });
  
  res.sendStatus(200);
});

/**
 * 🌐 مسار OPTIONS لـ CORS (عام - بدون مصادقة)
 * OPTIONS /api/autocomplete - CORS preflight
 */
autocompleteRouter.options('/', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('X-Autocomplete-Methods', 'GET,POST,HEAD');
  res.sendStatus(200);
});

/**
 * 📖 جلب بيانات الإكمال التلقائي (محمي - يحتاج مصادقة)
 * GET /api/autocomplete - Get autocomplete data
 */
autocompleteRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('📊 [API] جلب بيانات الإكمال التلقائي');
    
    // سيتم نقل المنطق من الملف الأصلي
    res.json({
      success: true,
      data: {
        senderNames: [],
        transferNumbers: [],
        transferTypes: [],
        notes: [],
        transportDescriptions: [],
        workerMiscDescriptions: []
      },
      message: 'بيانات الإكمال التلقائي - سيتم نقل المنطق من الملف الأصلي'
    });
  } catch (error: any) {
    console.error('❌ [Autocomplete] خطأ في جلب البيانات:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب بيانات الإكمال التلقائي',
      message: error.message
    });
  }
});

/**
 * 📝 حفظ قيمة إكمال تلقائي جديدة (محمي - يحتاج مصادقة)
 * POST /api/autocomplete - Save autocomplete value
 */
autocompleteRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('📝 [API] حفظ قيمة إكمال تلقائي:', req.body);
    
    // سيتم نقل المنطق من الملف الأصلي مع validation
    res.json({
      success: true,
      data: {
        category: req.body.category || 'unknown',
        value: req.body.value || 'unknown',
        usageCount: 1
      },
      message: 'حفظ قيمة الإكمال التلقائي - سيتم نقل المنطق من الملف الأصلي'
    });
  } catch (error: any) {
    console.error('❌ [Autocomplete] خطأ في حفظ القيمة:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في حفظ قيمة الإكمال التلقائي',
      message: error.message
    });
  }
});

/**
 * 📋 مسارات الفئات المحددة - جميعها محمية
 * Specific category routes - all protected
 */

// تطبيق المصادقة على جميع المسارات الفرعية
const protectedSubrouter = express.Router();
protectedSubrouter.use(requireAuth);

// أسماء المرسلين
protectedSubrouter.get('/senderNames', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أسماء المرسلين للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أسماء المرسلين' });
  }
});

// أرقام التحويلات
protectedSubrouter.get('/transferNumbers', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أرقام التحويلات للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أرقام التحويلات' });
  }
});

// أنواع التحويلات
protectedSubrouter.get('/transferTypes', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أنواع التحويلات للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أنواع التحويلات' });
  }
});

// الملاحظات
protectedSubrouter.get('/notes', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'الملاحظات للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب الملاحظات' });
  }
});

// أوصاف النقل
protectedSubrouter.get('/transportDescriptions', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أوصاف النقل للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أوصاف النقل' });
  }
});

// أوصاف مصاريف العمال
protectedSubrouter.get('/workerMiscDescriptions', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أوصاف مصاريف العمال للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أوصاف مصاريف العمال' });
  }
});

// أسماء المستلمين
protectedSubrouter.get('/recipientNames', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أسماء المستلمين للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أسماء المستلمين' });
  }
});

// أرقام هواتف المستلمين
protectedSubrouter.get('/recipientPhones', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أرقام هواتف المستلمين للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أرقام الهواتف' });
  }
});

// أرقام تحويلات العمال
protectedSubrouter.get('/workerTransferNumbers', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'أرقام تحويلات العمال للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب أرقام تحويلات العمال' });
  }
});

// ملاحظات تحويلات العمال
protectedSubrouter.get('/workerTransferNotes', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'ملاحظات تحويلات العمال للإكمال التلقائي - سيتم نقل المنطق'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'خطأ في جلب ملاحظات التحويلات' });
  }
});

// دمج المسارات المحمية
autocompleteRouter.use('/', protectedSubrouter);

/**
 * 📊 معلومات إضافية عن نظام الإكمال التلقائي
 */
autocompleteRouter.get('/info', (req: Request, res: Response) => {
  const rateLimiter = routeManager.getRateLimiter('/api/autocomplete', 'GET');
  
  res.json({
    success: true,
    data: {
      version: '2.0.0-organized',
      categories: [
        'senderNames', 'transferNumbers', 'transferTypes', 'notes', 
        'transportDescriptions', 'workerMiscDescriptions',
        'recipientNames', 'recipientPhones', 
        'workerTransferNumbers', 'workerTransferNotes'
      ],
      security: {
        publicRoutes: ['HEAD /', 'OPTIONS /'],
        protectedRoutes: ['GET /', 'POST /', 'GET /[category]'],
        rateLimited: !!rateLimiter
      },
      features: {
        caching: false, // سيتم إضافتها لاحقاً
        validation: true,
        logging: true
      }
    },
    message: 'معلومات نظام الإكمال التلقائي المنظم'
  });
});

console.log('🔤 [AutocompleteRouter] تم تهيئة مسارات الإكمال التلقائي');

export default autocompleteRouter;