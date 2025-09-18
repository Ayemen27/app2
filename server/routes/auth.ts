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
  refreshAccessToken,
  verifyAccessToken,
} from '../auth/auth-service';
import jwt from 'jsonwebtoken';

// دوال مساعدة لإنشاء الرموز المميزة
const generateAccessToken = (payload: { userId: string; email: string; role: string }) => {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'demo-access-secret',
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (payload: { userId: string; email: string }) => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret',
    { expiresIn: '30d' }
  );
};

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

    // التحقق من تسجيل الدخول السريع
    const isBypassLogin = (email === 'admin@demo.local' && password === 'bypass-demo-login');
    
    if (isBypassLogin) {
      console.log('🚀 [Auth] تسجيل دخول سريع تجريبي');
      
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
          emailVerifiedAt: new Date(),
        }).returning();
        
        user = newUser;
      }

      // إنشاء التوكينات
      const accessToken = generateAccessToken({
        userId: user[0].id,
        email: user[0].email,
        role: user[0].role
      });

      const refreshToken = generateRefreshToken({
        userId: user[0].id,
        email: user[0].email
      });

      console.log('✅ [Auth] تم تسجيل الدخول السريع بنجاح');

      return res.status(200).json({
        success: true,
        message: "تم تسجيل الدخول السريع بنجاح",
        data: {
          user: {
            id: user[0].id,
            email: user[0].email,
            firstName: user[0].firstName,
            lastName: user[0].lastName,
            name: `${user[0].firstName || ''} ${user[0].lastName || ''}`.trim() || user[0].email,
            role: user[0].role
          },
          accessToken,
          refreshToken
        }
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

    // إنشاء التوكينات
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email
    });

    console.log('📝 [Auth] تحديث آخر تسجيل دخول...');

    // تحديث آخر تسجيل دخول
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    console.log('✅ [Auth] تم تسجيل الدخول بنجاح');

    res.status(200).json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error("❌ [Auth] خطأ في تسجيل الدخول:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في الخادم، يرجى المحاولة لاحقاً",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const sessionId = req.user!.sessionId;

    const success = await terminateSession(req.user!.userId, sessionId, 'user_logout');

    res.json({
      success,
      message: success ? 'تم تسجيل الخروج بنجاح' : 'فشل في تسجيل الخروج'
    });

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