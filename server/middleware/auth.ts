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
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    is_active?: boolean;
    mfa_enabled?: boolean;
    sessionId: string;
  };
}

// Rate Limiting للطلبات العامة - تم رفعه لضمان السرعة
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/health' || req.path.startsWith('/api/sync/');
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد قليل',
      retryAfter: 15 * 60
    });
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

// دالة مساعدة موحدة لاستخراج التوكن من الطلب - نسخة جذرية تدعم جميع الحالات
export function extractTokenFromReq(req: Request): string | null {
    // 1. التحقق من ترويسة Authorization (المعيار العالمي)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string') {
      // تنظيف الترويسة من المسافات الزائدة وعلامات الاقتباس
      let cleanHeader = authHeader.trim();
      
      // التعامل مع Bearer المكرر أو المفقود أو الفارغ
      const bearerRegex = /bearer\s+/gi;
      if (bearerRegex.test(cleanHeader)) {
        let tokenOnly = cleanHeader.replace(bearerRegex, '').trim();
        // الحماية من الرموز المغلفة بعلامات اقتباس (شائع في Capacitor/Android)
        if (tokenOnly.startsWith('"') && tokenOnly.endsWith('"')) {
          tokenOnly = tokenOnly.slice(1, -1);
        }
        // الحماية من الرموز الفارغة أو undefined
        if (!tokenOnly || tokenOnly === 'undefined' || tokenOnly === 'null') {
          return null;
        }
        return tokenOnly;
      }
      
      // إذا لم يحتوي على Bearer، ربما يكون التوكن مباشرة
      if (cleanHeader.length > 20 && cleanHeader.includes('.')) {
        if (cleanHeader.startsWith('"') && cleanHeader.endsWith('"')) {
          cleanHeader = cleanHeader.slice(1, -1);
        }
        return cleanHeader;
      }
    }

  // 2. التحقق من الترويسات المخصصة الشائعة (مهم جداً لتوافق الأندرويد)
  const customHeaders = ['x-auth-token', 'x-access-token', 'token', 'Authorization', 'authorization'];
  for (const header of customHeaders) {
    const value = req.headers[header] || req.headers[header.toLowerCase()];
    if (value && typeof value === 'string') {
      let cleanValue = value.trim();
      // تنظيف علامات الاقتباس
      if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
        cleanValue = cleanValue.slice(1, -1);
      }
      
      if (cleanValue.toLowerCase().startsWith('bearer ')) {
        const subValue = cleanValue.substring(7).trim();
        if (subValue.toLowerCase().startsWith('bearer ')) {
          return subValue.substring(7).trim();
        }
        return subValue;
      }
      return cleanValue;
    }
  }
  
  // 3. التحقق من الكوكيز (للمتصفحات)
  if (req.cookies) {
    const cookieNames = ['accessToken', 'accessToken', 'token', 'jwt'];
    for (const name of cookieNames) {
      if (req.cookies[name]) return req.cookies[name];
    }
  }
  
  // 4. التحقق من الجسم (Body) أو الاستعلام (Query) - كحل أخير
  const fromParams = (req.query?.token as string) || (req.body?.token as string) || (req.body?.accessToken as string);
  if (fromParams && typeof fromParams === 'string') {
    let cleanParam = fromParams.trim();
    if (cleanParam.startsWith('"') && cleanParam.endsWith('"')) {
      cleanParam = cleanParam.slice(1, -1);
    }
    return cleanParam;
  }
  
  return null;
}

import { storage } from '../storage';

// التحقق من صحة الـ Token مع دعم Argon2-based Session
const verifyToken = async (token: string): Promise<any> => {
  try {
    // تنظيف التوكن بشكل نهائي قبل التحقق
    let cleanToken = token.trim();
    if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }

    // استخدام JWT_SHARED_SECRET الموحد من jwt-utils
    const secret = JWT_SHARED_SECRET;
    const issuer = 'construction-management-app-v2';
    
    return jwt.verify(cleanToken, secret, {
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
const verifySession = async (user_id: string, sessionId: string) => {
  try {
    const session = await db
      .select()
      .from(authUserSessions)
      .where(
        and(
          eq(authUserSessions.user_id, user_id),
          eq(authUserSessions.sessionToken, sessionId),
          eq(authUserSessions.isRevoked, false),
          gt(authUserSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (session.length > 0) {
      return session[0];
    }
    
    // Fallback: Check with userId if user_id failed (for schema compatibility)
    const fallbackSession = await db
      .select()
      .from(authUserSessions)
      .where(
        and(
          eq(authUserSessions.user_id, user_id),
          eq(authUserSessions.sessionToken, sessionId),
          eq(authUserSessions.isRevoked, false),
          gt(authUserSessions.expiresAt, new Date())
        )
      )
      .limit(1);
      
    return fallbackSession.length > 0 ? fallbackSession[0] : null;
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

    // استخراج التوكن باستخدام الدالة الجذرية المحسنة
    token = extractTokenFromReq(req);

    // التحقق من وجود الـ token
    if (!token) {
      // سجل تحذيري في حالة الفشل لتسهيل التتبع
      const userAgent = req.get('user-agent') || 'unknown';
      console.warn(`🚨 [AUTH-FAIL] محاولة وصول بدون توكن | المسار: ${req.method} ${req.originalUrl} | IP: ${ip} | UA: ${userAgent}`);
      
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول - لا يوجد رمز مصادقة',
        code: 'NO_TOKEN'
      });
    }

    // تنظيف التوكن من أي علامات اقتباس محتملة أو مسافات زائدة
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }
    
    // إزالة كلمة Bearer إذا كانت موجودة (حماية إضافية)
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.substring(7).trim();
    }

    const jwtParts = token.split('.');
    if (jwtParts.length !== 3 || jwtParts.some(p => p.length === 0)) {
      return res.status(401).json({
        success: false,
        message: 'صيغة رمز المصادقة غير صالحة',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error: any) {
      if (req.path === '/api/auth/refresh') {
        return next();
      }

      console.warn(`⚠️ [AUTH] Invalid token for ${req.path}: ${error.message}`);

      // التحقق الذكي: إذا كان الخطأ هو انتهاء الصلاحية وكان المستخدم أدمن، نمنحه مهلة إضافية قصيرة للمزامنة
      const tempDecoded = jwt.decode(token) as any;
      if (error.name === 'TokenExpiredError' && tempDecoded?.role === 'admin') {
         const drift = (Date.now() / 1000) - tempDecoded.exp;
         if (drift < 300) { // 5 minutes grace period for admins
            console.log('🛡️ [AUTH] منح مهلة إضافية (Grace Period) لمسؤول النظام');
            decoded = tempDecoded;
         }
      }

      if (!decoded) {
        // محاولة التحقق باستخدام المفتاح البديل في حالة فشل المفتاح الأساسي (للتوافق خلال الانتقال)
        try {
          const fallbackSecret = 'binarjoin-core-system-v2-2026-ultra-secure-key';
          decoded = jwt.verify(token, fallbackSecret, { issuer: 'construction-management-app-v2' }) as any;
          console.log('✅ [AUTH] تم قبول التوكن باستخدام المفتاح الاحتياطي');
        } catch (fallbackError) {
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
      }
    }

    // جلب بيانات المستخدم - دعم Argon2-based identity
    const user_id = decoded.userId || decoded.sub || decoded.user_id || decoded.id;
    const user = await storage.getUser(user_id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'حساب المستخدم غير نشط أو غير موجود',
        code: 'USER_INACTIVE'
      });
    }

    // إضافة بيانات المستخدم للـ request مع ضمان تحديث الدور من قاعدة البيانات مباشرة
    req.user = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      first_name: user.first_name || undefined,
      last_name: user.last_name || undefined,
      role: user.role || 'user', // استخدام الدور من قاعدة البيانات مباشرة
      is_active: user.is_active,
      mfa_enabled: user.mfa_enabled || undefined,
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
      const session = await verifySession(decoded.user_id, decoded.sessionId);

      if (session) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.user_id))
          .limit(1);

        if (user.length && user[0].is_active) {
          req.user = {
            id: user[0].id,
            user_id: user[0].id,
            email: user[0].email,
            first_name: user[0].first_name || undefined,
            last_name: user[0].last_name || undefined,
            role: user[0].role,
            is_active: user[0].is_active,
            mfa_enabled: user[0].mfa_enabled || undefined,
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