/**
 * مسارات API لنظام المصادقة المتقدم
 */

import { Router, Request } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { verifyPassword } from '../auth/crypto-utils.js';
import {
  loginUser,
  registerUser,
  verifyEmail,
  setupTOTP,
  enableTOTP,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  changePassword,
  refreshAccessToken as refreshAccessTokenService,
  verifyAccessToken,
} from '../auth/auth-service';
import {
  generateTokenPair,
  verifyAccessToken as verifyJWT,
  verifyRefreshToken,
  refreshAccessToken,
  JWT_CONFIG
} from '../auth/jwt-utils.js';
import jwt from 'jsonwebtoken';

// إعداد JWT Secrets - استخدام نفس المصدر من jwt-utils
console.log('🔧 [Auth] إعداد JWT secrets:', {
  accessSecret: JWT_CONFIG.accessTokenSecret ? 'متوفر' : 'غير متوفر',
  refreshSecret: JWT_CONFIG.refreshTokenSecret ? 'متوفر' : 'غير متوفر',
  source: 'jwt-utils.ts'
});

const router = Router();

// مخططات التحقق
const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً'),
  totpCode: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون على الأقل 8 أحرف'),
  name: z.string().min(2, 'الاسم قصير جداً'),
  phone: z.string().optional(),
  role: z.string().optional(),
});

const verifyEmailSchema = z.object({
  userId: z.string(),
  code: z.string().length(6, 'رمز التحقق يجب أن يكون 6 أرقام'),
});

const enableTOTPSchema = z.object({
  totpCode: z.string().length(6, 'رمز TOTP يجب أن يكون 6 أرقام'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string().min(8, 'كلمة المرور الجديدة يجب أن تكون على الأقل 8 أحرف'),
});

// تعريف الأنواع المخصصة
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
  };
}

// استيراد middleware من ملف منفصل

import { requireAuth, requirePermission, requireRole } from '../middleware/auth';

// دالة مساعدة للحصول على معلومات الطلب
function getRequestInfo(req: any) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    deviceInfo: {
      type: req.headers['x-device-type'] || 'web',
      name: req.headers['x-device-name'] || 'unknown',
    }
  };
}

/**
 * تسجيل الدخول
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    console.log('🔑 [Auth] طلب تسجيل دخول جديد:', { email: req.body?.email, hasPassword: !!req.body?.password });

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ [Auth] بيانات ناقصة:', { email: !!email, password: !!password });
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني وكلمة المرور مطلوبان"
      });
    }

    console.log('🔍 [Auth] البحث عن المستخدم:', email.toLowerCase());

    // التحقق من تسجيل الدخول السريع (فقط في بيئة التطوير)
    const isDevEnvironment = process.env.NODE_ENV === 'development';
    const quickLoginEnabled = process.env.ENABLE_QUICK_LOGIN !== 'false'; // Default true for dev
    const isBypassLogin = (email === 'admin@demo.local' && password === 'bypass-demo-login');
    
    if (isBypassLogin && isDevEnvironment && quickLoginEnabled) {
      console.log('🚀 [Auth] تسجيل دخول سريع تجريبي (بيئة تطوير فقط)');
      
      // البحث عن أي مستخدم admin أو إنشاء واحد
      let user = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
      
      if (user.length === 0) {
        console.log('👤 [Auth] إنشاء مستخدم admin تجريبي');
        const newUser = await db.insert(users).values({
          email: 'admin@demo.local',
          password: 'demo-hash', // كلمة مرور وهمية
          firstName: 'مدير',
          lastName: 'النظام',
          role: 'admin',
          isActive: true,
        }).returning();
        
        user = newUser;
      }

      // إنشاء التوكينات باستخدام jwt-utils
      const { accessToken, refreshToken } = await generateTokenPair(
        user[0].id,
        user[0].email,
        user[0].role
      );

      console.log('✅ [Auth] تم تسجيل الدخول السريع بنجاح');

      const quickLoginResponse = {
        success: true,
        message: "تم تسجيل الدخول السريع بنجاح",
        data: {
          user: {
            id: user[0].id,
            email: user[0].email,
            firstName: user[0].firstName,
            lastName: user[0].lastName,
            name: `${user[0].firstName || ''} ${user[0].lastName || ''}`.trim() || user[0].email,
            role: user[0].role,
            mfaEnabled: false
          },
          accessToken,
          refreshToken
        }
      };

      console.log('🚀 [Auth] إرسال بيانات تسجيل الدخول السريع:', {
        hasUser: !!quickLoginResponse.data.user,
        userId: quickLoginResponse.data.user.id,
        userEmail: quickLoginResponse.data.user.email,
        hasToken: !!quickLoginResponse.data.accessToken,
        responseStructure: {
          success: quickLoginResponse.success,
          hasData: !!quickLoginResponse.data,
          dataKeys: Object.keys(quickLoginResponse.data),
          userKeys: quickLoginResponse.data.user ? Object.keys(quickLoginResponse.data.user) : 'none'
        }
      });

      // ازالة تسجيل البيانات الحساسة - لا نطبع الرموز بشكل كامل
      console.log('✅ [Auth] تم إعداد استجابة تسجيل الدخول السريع بنجاح');

      return res.status(200).json(quickLoginResponse);
    }
    
    // رفض تسجيل الدخول السريع في بيئة الإنتاج
    if (isBypassLogin && !isDevEnvironment) {
      console.log('🚫 [Auth] محاولة تسجيل دخول سريع في بيئة الإنتاج - مرفوض');
      return res.status(401).json({
        success: false,
        message: "بيانات تسجيل الدخول غير صحيحة"
      });
    }
    
    if (isBypassLogin && !quickLoginEnabled) {
      console.log('🚫 [Auth] تسجيل الدخول السريع معطل');
      return res.status(401).json({
        success: false,
        message: "بيانات تسجيل الدخول غير صحيحة"
      });
    }

    // البحث عن المستخدم العادي
    const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

    if (userResult.length === 0) {
      console.log('❌ [Auth] المستخدم غير موجود:', email);
      return res.status(401).json({
        success: false,
        message: "بيانات تسجيل الدخول غير صحيحة"
      });
    }

    const user = userResult[0];
    console.log('✅ [Auth] تم العثور على المستخدم:', { id: user.id, email: user.email, isActive: user.isActive });

    // التحقق من كلمة المرور
    const isValidPassword = await verifyPassword(password, user.password);
    console.log('🔐 [Auth] نتيجة التحقق من كلمة المرور:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ [Auth] كلمة المرور غير صحيحة');
      return res.status(401).json({
        success: false,
        message: "بيانات تسجيل الدخول غير صحيحة"
      });
    }

    // التحقق من حالة المستخدم
    if (!user.isActive) {
      console.log('❌ [Auth] الحساب معطل');
      return res.status(403).json({
        success: false,
        message: "الحساب معطل، يرجى الاتصال بالمدير"
      });
    }

    console.log('🎯 [Auth] إنشاء التوكينات...');

    // إنشاء التوكينات باستخدام jwt-utils
    const { accessToken, refreshToken } = await generateTokenPair(
      user.id,
      user.email,
      user.role
    );

    console.log('📝 [Auth] تحديث آخر تسجيل دخول...');

    // تحديث آخر تسجيل دخول
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    console.log('✅ [Auth] تم تسجيل الدخول بنجاح');

    const responseData = {
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          role: user.role,
          mfaEnabled: false
        },
        accessToken,
        refreshToken
      }
    };

    console.log('📤 [Auth] إرسال بيانات تسجيل الدخول:', {
      hasUser: !!responseData.data.user,
      userId: responseData.data.user.id,
      userEmail: responseData.data.user.email,
      userRole: responseData.data.user.role,
      hasToken: !!responseData.data.accessToken,
      hasRefreshToken: !!responseData.data.refreshToken,
      responseStructure: {
        success: responseData.success,
        hasData: !!responseData.data,
        dataKeys: Object.keys(responseData.data),
        userKeys: responseData.data.user ? Object.keys(responseData.data.user) : 'none'
      }
    });

    // ازالة تسجيل البيانات الحساسة - لا نطبع الرموز بشكل كامل
    console.log('✅ [Auth] تم إعداد استجابة تسجيل الدخول بنجاح');

    res.status(200).json(responseData);

  } catch (error) {
    console.error("❌ [Auth] خطأ في تسجيل الدخول:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في الخادم، يرجى المحاولة لاحقاً",
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});

/**
 * تسجيل حساب جديد
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const requestInfo = getRequestInfo(req);
    const result = await registerUser({
      ...validation.data,
      ...requestInfo
    });

    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API التسجيل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * التحقق من البريد الإلكتروني
 * POST /api/auth/verify-email
 */
router.post('/verify-email', async (req, res) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { userId, code } = validation.data;
    const requestInfo = getRequestInfo(req);

    const result = await verifyEmail(userId, code, requestInfo.ipAddress, requestInfo.userAgent);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API التحقق من البريد:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تجديد الرمز المميز
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'رمز التجديد مطلوب'
      });
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'رمز التجديد غير صالح'
      });
    }

    res.json({
      success: true,
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      }
    });

  } catch (error) {
    console.error('خطأ في API تجديد الرمز:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

// تم نقل middleware إلى ملف منفصل

/**
 * إعداد المصادقة الثنائية
 * POST /api/auth/setup-mfa (Protected)
 */
router.post('/setup-mfa', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const email = req.user!.email;

    const result = await setupTOTP(userId, email);

    res.json(result);

  } catch (error) {
    console.error('خطأ في API إعداد MFA:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تفعيل المصادقة الثنائية
 * POST /api/auth/enable-mfa (Protected)
 */
router.post('/enable-mfa', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const validation = enableTOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const { totpCode } = validation.data;
    const requestInfo = getRequestInfo(req);

    const result = await enableTOTP(userId, totpCode, requestInfo.ipAddress, requestInfo.userAgent);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API تفعيل MFA:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على الجلسات النشطة
 * GET /api/auth/sessions (Protected)
 */
router.get('/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const sessions = await getActiveSessions(userId);

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('خطأ في API الجلسات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * إنهاء جلسة معينة
 * DELETE /api/auth/sessions/:sessionId (Protected)
 */
router.delete('/sessions/:sessionId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    const success = await terminateSession(userId, sessionId, 'user_terminated');

    res.json({
      success,
      message: success ? 'تم إنهاء الجلسة بنجاح' : 'فشل في إنهاء الجلسة'
    });

  } catch (error) {
    console.error('خطأ في API إنهاء الجلسة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * إنهاء جميع الجلسات الأخرى
 * DELETE /api/auth/sessions (Protected)
 */
router.delete('/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const currentSessionId = req.user!.sessionId;

    const terminatedCount = await terminateAllOtherSessions(userId, currentSessionId);

    res.json({
      success: true,
      message: `تم إنهاء ${terminatedCount} جلسة`,
      terminatedCount
    });

  } catch (error) {
    console.error('خطأ في API إنهاء الجلسات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تغيير كلمة المرور
 * PUT /api/auth/password (Protected)
 */
router.put('/password', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const { currentPassword, newPassword } = validation.data;
    const requestInfo = getRequestInfo(req);

    const result = await changePassword(
      userId,
      currentPassword,
      newPassword,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API تغيير كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تسجيل الخروج
 * POST /api/auth/logout (Protected)
 */
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const sessionId = req.user!.sessionId;
    const userEmail = req.user!.email;
    
    console.log('🚪 [Auth] بدء عملية تسجيل الخروج للمستخدم:', userEmail);
    
    // إبطال الجلسة الحالية في قاعدة البيانات
    const success = await terminateSession(userId, sessionId, 'user_logout');
    
    if (success) {
      console.log('✅ [Auth] تم تسجيل الخروج وإبطال الجلسة بنجاح');
      
      res.json({
        success: true,
        message: 'تم تسجيل الخروج بنجاح'
      });
    } else {
      console.log('⚠️ [Auth] لم يتم العثور على الجلسة للإبطال، ولكن العملية نجحت من جانب العميل');
      
      // حتى لو لم نجد الجلسة في قاعدة البيانات، نعتبر logout ناجح من جانب العميل
      res.json({
        success: true,
        message: 'تم تسجيل الخروج بنجاح'
      });
    }

  } catch (error) {
    console.error('خطأ في API تسجيل الخروج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على معلومات المستخدم الحالي
 * GET /api/auth/me (Protected)
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user?.userId || '',
        email: req.user?.email || '',
        role: req.user?.role || 'user',
        sessionId: req.user?.sessionId || '',
      }
    });
  } catch (error) {
    console.error('خطأ في API معلومات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});


export default router;