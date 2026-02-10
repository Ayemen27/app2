import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, authUserSessions } from '../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { JWT_SHARED_SECRET } from '../auth/jwt-utils';
import { envConfig } from '../utils/unified-env';

// تم إزالة express-slow-down لأنه غير مستخدم حالياً

// تعريف نوع الـ Request مع user
export interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive?: boolean;
    mfaEnabled?: boolean;
    sessionId: string;
  };
}

// Rate Limiting للطلبات العامة - تم رفعه لضمان السرعة
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5000, // زيادة كبيرة للحد
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد قليل',
    retryAfter: 15 * 60 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/health' || req.path.startsWith('/api/sync/');
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

// دالة مساعدة موحدة لاستخراج التوكن من الطلب
function extractTokenFromReq(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  }
  if (req.headers['x-auth-token']) return req.headers['x-auth-token'] as string;
  if (req.headers['token']) return req.headers['token'] as string;
  
  // الكوكيز: التحقق من الأسماء الشائعة
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  if (req.cookies?.access_token) return req.cookies.access_token;
  if (req.cookies?.token) return req.cookies.token;
  
  // Query parameter (للدعم السريع أو الروابط)
  if (req.query?.token) return req.query.token as string;
  
  return null;
}

import { storage } from '../storage';

// التحقق من صحة الـ Token مع دعم Argon2-based Session
const verifyToken = async (token: string): Promise<any> => {
  try {
    // استخدام JWT_SHARED_SECRET الموحد من jwt-utils
    const secret = JWT_SHARED_SECRET;
    const issuer = 'construction-management-app-v2';
    
    return jwt.verify(token, secret, {
      issuer: issuer,
      algorithms: ['HS256'],
      ignoreExpiration: false,
      clockTolerance: 60 
    });
  } catch (error: any) {
    throw error;
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

  // CSP Header (مُحسن للتطوير والإنتاج) - تم نقله إلى Helmet
  // تم حذف CSP من هنا لتجنب الصراع مع Helmet headers

  next();
};

// ⚠️ تم تعطيل خدمة تتبع النشاط المشبوه
// Middleware لتتبع محاولات المصادقة المشبوهة - معطل حالياً
// const suspiciousActivityTracker = new Map<string, { attempts: number; lastAttempt: number }>();

export const trackSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  // ✅ تم تعطيل هذه الخدمة - السماح بجميع الطلبات
  next();
};

// Middleware المصادقة الأساسي
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // ✅ فحص استثناءات المصادقة (المسارات العامة)
    const publicPaths = [
      '/api/auth/login', 
      '/api/auth/register', 
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/sync/full-backup', 
      '/api/health',
      '/api/auth/resend-verification',
      '/api/auth/verify-email',
      '/api/auth/refresh' // السماح بمسار التجديد دائماً
    ];
    if (publicPaths.includes(req.path) || 
        req.originalUrl.includes('/api/auth/login') || 
        req.originalUrl.includes('/api/auth/forgot-password') ||
        req.originalUrl.includes('/api/auth/reset-password') ||
        req.originalUrl.includes('/api/auth/resend-verification')) {
      return next();
    }
  try {
    const startTime = Date.now();
    let token: string | null = null;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // console.log(`🔍 [AUTH] فحص متقدم - المسار: ${req.method} ${req.originalUrl} | IP: ${ip}`);

    // محاولة استخراج التوكن من مصادر متعددة باستخدام الدالة الموحدة
    token = extractTokenFromReq(req);

    // سجل إضافي لتشخيص مشاكل الموبايل
    if (!token && (req.get('user-agent')?.includes('Android') || req.get('user-agent')?.includes('okhttp'))) {
      console.warn(`⚠️ [AUTH-MOBILE] محاولة وصول بدون توكن من جهاز أندرويد | المسار: ${req.originalUrl}`);
      
      // Allow mobile apps to access certain endpoints if needed or just log it
      // For now, let's try to see if token is in other headers mobile might use
      token = req.headers['authorization'] as string || req.headers['Authorization'] as string;
      if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.substring(7);
      }
      
      if (!token && req.path === '/api/auth/refresh') {
        token = req.body.refreshToken || req.cookies?.refreshToken;
      }
    }

    // التحقق من وجود الـ token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول - لا يوجد رمز مصادقة',
        code: 'NO_TOKEN'
      });
    }

    // التحقق من صحة الـ token
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error: any) {
      if (req.path === '/api/auth/refresh') {
        return next();
      }

      console.warn(`⚠️ [AUTH] Invalid token for ${req.path}: ${error.message}`);

      if (error.name === 'TokenExpiredError' || error.message?.includes('expired')) {
        return res.status(401).json({
          success: false,
          message: 'انتهت الجلسة - يرجى تجديد الدخول',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح',
        code: 'INVALID_TOKEN'
      });
    }

    // جلب بيانات المستخدم - دعم Argon2-based identity
    const user = await storage.getUser(decoded.sub || decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'حساب المستخدم غير نشط أو غير موجود',
        code: 'USER_INACTIVE'
      });
    }

    // إضافة بيانات المستخدم للـ request مع ضمان تحديث الدور من قاعدة البيانات مباشرة
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role || 'user', // استخدام الدور من قاعدة البيانات مباشرة
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled || undefined,
      sessionId: decoded.sessionId || 'jwt-session'
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [AUTH] مصادقة ناجحة للمستخدم: ${user.email} | ${req.method} ${req.originalUrl} | ${duration}ms`);

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

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    console.log(`🚫 [AUTH] محاولة وصول غير مصرح بها من: ${req.user.email} للمسار: ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: 'تحتاج صلاحيات إدارية للوصول لهذا المحتوى',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

export function isReadOnly(req: AuthenticatedRequest) {
  return req.user?.role === "user";
}

export function checkWriteAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // التحقق من أن المستخدم مسجل دخوله أولاً
  if (!req.user) {
    return next(); // سيتم التعامل معه في middleware المصادقة
  }

  console.log(`🛡️ [WRITE-ACCESS] فحص الصلاحية للمسار: ${req.method} ${req.originalUrl} | الدور: ${req.user.role}`);
  
  if (req.method !== "GET" && isReadOnly(req)) {
    console.warn(`🚫 [WRITE-ACCESS] منع محاولة تعديل من مستخدم "قراءة فقط": ${req.user.email}`);
    return res.status(403).json({ 
      success: false,
      message: "لا تملك صلاحية تعديل البيانات. يرجى التواصل مع المسؤول للحصول على صلاحيات إضافية." 
    });
  }
  next();
}

// Middleware للطلبات الاختيارية (لا تتطلب مصادقة إجبارية)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromReq(req);

    if (token) {
      const decoded = await verifyToken(token);
      const session = await verifySession(decoded.userId, decoded.sessionId);

      if (session) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (user.length && user[0].isActive) {
          req.user = {
            id: user[0].id,
            userId: user[0].id,
            email: user[0].email,
            firstName: user[0].firstName || undefined,
            lastName: user[0].lastName || undefined,
            role: user[0].role,
            isActive: user[0].isActive,
            mfaEnabled: user[0].mfaEnabled || undefined,
            sessionId: decoded.sessionId
          };
        }
      }
    }
  } catch (error: any) {
    console.log('⚠️ [AUTH] خطأ في المصادقة الاختيارية:', error?.message || error);
  }

  next();
};

// ✅ تم تعطيل تنظيف البيانات المؤقتة - الميزة معطلة حالياً
// const oneHour = 60 * 60 * 1000;
// setInterval(() => {
//   const now = Date.now();
//   for (const [ip, activity] of Array.from(suspiciousActivityTracker.entries())) {
//     if (now - activity.lastAttempt > oneHour) {
//       suspiciousActivityTracker.delete(ip);
//     }
//   }
// }, oneHour);

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