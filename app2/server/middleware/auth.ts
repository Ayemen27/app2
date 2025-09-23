import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, authUserSessions } from '../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';

// تم إزالة express-slow-down لأنه غير مستخدم حالياً

// تعريف نوع الـ Request مع user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive: boolean;
    mfaEnabled?: boolean;
    sessionId: string;
  };
}

// Rate Limiting للطلبات العامة
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 1000, // 1000 طلب لكل IP
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد قليل',
    retryAfter: 15 * 60 // 15 دقيقة
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // تجاهل Rate Limiting للـ health checks
    return req.path === '/api/health' || req.path === '/health';
  }
});

// Rate Limiting للمصادقة (أكثر صرامة)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 10, // 10 محاولات تسجيل دخول لكل IP
  message: {
    success: false,
    message: 'تم تجاوز عدد محاولات تسجيل الدخول المسموحة، يرجى المحاولة بعد 15 دقيقة',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // لا تحسب الطلبات الناجحة
});

// Rate Limiting للعمليات الحساسة
export const sensitiveOperationsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 دقائق
  max: 5, // 5 عمليات فقط
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح للعمليات الحساسة، يرجى المحاولة بعد 5 دقائق',
    retryAfter: 5 * 60
  }
});

// تم إزالة speedLimiter مؤقتاً - يمكن إضافته لاحقاً عند الحاجة

// التحقق من صحة الـ Token
const verifyToken = async (token: string): Promise<any> => {
  try {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET غير موجود');
    }
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('رمز المصادقة غير صالح');
  }
};

// التحقق من الجلسة في قاعدة البيانات
const verifySession = async (userId: string, sessionId: string) => {
  try {
    const session = await db
      .select()
      .from(authUserSessions)
      .where(
        and(
          eq(authUserSessions.userId, userId),
          eq(authUserSessions.sessionToken, sessionId),
          eq(authUserSessions.isRevoked, false),
          gt(authUserSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return session.length > 0 ? session[0] : null;
  } catch (error) {
    console.error('❌ خطأ في التحقق من الجلسة:', error);
    return null;
  }
};

// Middleware الأمان المتقدم
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // إضافة headers أمنية
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // CSP Header (مُحسن للتطوير والإنتاج)
  const isDev = process.env.NODE_ENV === 'development';
  const cspPolicy = isDev
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' ws: wss:;"
    : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self';";

  res.setHeader('Content-Security-Policy', cspPolicy);

  next();
};

// Middleware لتتبع محاولات المصادقة المشبوهة
const suspiciousActivityTracker = new Map<string, { attempts: number; lastAttempt: number }>();

export const trackSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  // تتبع الأنشطة المشبوهة
  const activity = suspiciousActivityTracker.get(ip) || { attempts: 0, lastAttempt: 0 };
  const now = Date.now();

  // إعادة تعيين العداد كل ساعة
  if (now - activity.lastAttempt > 60 * 60 * 1000) {
    activity.attempts = 0;
  }

  activity.attempts++;
  activity.lastAttempt = now;
  suspiciousActivityTracker.set(ip, activity);

  // حظر IP إذا تجاوز 50 محاولة في الساعة
  if (activity.attempts > 50) {
    console.warn(`🚨 نشاط مشبوه من IP: ${ip}, User-Agent: ${userAgent}`);
    return res.status(429).json({
      success: false,
      message: 'تم حظر هذا العنوان مؤقتاً بسبب النشاط المشبوه'
    });
  }

  next();
};

// Middleware المصادقة الأساسي
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    console.log(`🔍 [AUTH] فحص متقدم - المسار: ${req.method} ${req.originalUrl} | IP: ${ip}`);

    // التحقق من وجود الـ token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] لا يوجد token في الطلب');
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول - لا يوجد رمز مصادقة',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    // التحقق من صحة الـ token
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      console.log('❌ [AUTH] token غير صالح:', error);
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح أو منتهي الصلاحية',
        code: 'INVALID_TOKEN'
      });
    }

    // التحقق من الجلسة
    const session = await verifySession(decoded.userId, decoded.sessionId);
    if (!session) {
      console.log('❌ [AUTH] الجلسة غير موجودة أو منتهية');
      return res.status(401).json({
        success: false,
        message: 'الجلسة غير صالحة أو منتهية الصلاحية',
        code: 'INVALID_SESSION'
      });
    }

    // جلب بيانات المستخدم
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user.length || !user[0].isActive) {
      console.log('❌ [AUTH] المستخدم غير موجود أو غير نشط');
      return res.status(401).json({
        success: false,
        message: 'حساب المستخدم غير نشط أو غير موجود',
        code: 'USER_INACTIVE'
      });
    }

    // تحديث آخر نشاط للجلسة
    await db
      .update(authUserSessions)
      .set({
        lastActivity: new Date(),
        ipAddress: ip,
        userAgent: req.get('User-Agent') || 'unknown'
      })
      .where(eq(authUserSessions.sessionToken, decoded.sessionId));

    // إضافة بيانات المستخدم للـ request
    req.user = {
      ...user[0],
      sessionId: decoded.sessionId
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [AUTH] مصادقة ناجحة للمستخدم: ${user[0].email} | ${req.method} ${req.originalUrl} | ${duration}ms`);

    next();
  } catch (error) {
    console.error('❌ [AUTH] خطأ في المصادقة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في خادم المصادقة',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Middleware للتحقق من صلاحيات الإدارة
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح لك بالوصول',
      code: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'admin') {
    console.log(`🚫 [AUTH] محاولة وصول غير مصرح بها من: ${req.user.email} للمسار: ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: 'تحتاج صلاحيات إدارية للوصول لهذا المحتوى',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Middleware للطلبات الاختيارية (لا تتطلب مصادقة إجبارية)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      const session = await verifySession(decoded.userId, decoded.sessionId);

      if (session) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (user.length && user[0].isActive) {
          req.user = { ...user[0], sessionId: decoded.sessionId };
        }
      }
    }
  } catch (error) {
    console.log('⚠️ [AUTH] خطأ في المصادقة الاختيارية:', error);
  }

  next();
};

// تنظيف البيانات المؤقتة كل ساعة
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (const [ip, activity] of suspiciousActivityTracker.entries()) {
    if (now - activity.lastAttempt > oneHour) {
      suspiciousActivityTracker.delete(ip);
    }
  }
}, oneHour);

// تصدير middleware الأساسي
export const requireAuth = authenticate;

// تصدير middleware للأدوار
export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول',
        code: 'UNAUTHORIZED'
      });
    }

    if (req.user.role !== role) {
      console.log(`🚫 [AUTH] محاولة وصول غير مصرح بها من: ${req.user.email} للدور: ${role}`);
      return res.status(403).json({
        success: false,
        message: `تحتاج صلاحيات ${role} للوصول لهذا المحتوى`,
        code: 'ROLE_REQUIRED'
      });
    }

    next();
  };
};

// تصدير middleware للصلاحيات
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول',
        code: 'UNAUTHORIZED'
      });
    }

    // يمكن إضافة منطق الصلاحيات هنا حسب الحاجة
    // حالياً نسمح للـ admin بكل شيء
    if (req.user.role === 'admin') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `تحتاج صلاحية ${permission} للوصول لهذا المحتوى`,
      code: 'PERMISSION_REQUIRED'
    });
  };
};

export default authenticate;