import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, authUserSessions } from '../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { JWT_ACCESS_SECRET } from '../auth/jwt-utils';
import { ENV as envConfig } from '../config/env';
import { extractClientContext, validateSessionBinding, type ClientContext } from '../auth/client-context';
import { CentralLogService } from '../services/CentralLogService';

// تم إزالة express-slow-down لأنه غير مستخدم حالياً

// تعريف نوع الـ Request مع user
export interface AuthenticatedRequest extends Request {
  user?: {
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
    return req.path === '/api/health' || req.path === '/health';
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد قليل',
      retryAfter: 15 * 60
    });
  }
});

// Rate Limiting لمسارات المزامنة (أعلى من العادي لكن ليس بلا حدود)
export const syncRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'تم تجاوز الحد المسموح من طلبات المزامنة، يرجى المحاولة بعد قليل',
      retryAfter: 15 * 60
    });
  }
});

// Rate Limiting للمصادقة — يعتمد على (IP + البريد) بدل IP فقط لتجنب حظر جماعي خلف proxy
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').toLowerCase().trim();
    return email ? `${ip}:${email}` : ip;
  },
  message: {
    success: false,
    message: 'تم تجاوز عدد محاولات تسجيل الدخول المسموحة، يرجى المحاولة بعد 15 دقيقة',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Rate Limiting للعمليات الحساسة (إنشاء/حذف/استعادة)
export const sensitiveOperationsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح للعمليات الحساسة، يرجى المحاولة بعد 5 دقائق',
    retryAfter: 5 * 60
  }
});

// Rate Limiting للقراءة والاستعلام (أكثر تساهلاً)
export const readOperationsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: {
    success: false,
    message: 'تم تجاوز حد الاستعلامات، يرجى المحاولة بعد دقيقة',
    retryAfter: 60
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

  // 2. التحقق من الكوكيز (للمتصفحات)
  if (req.cookies) {
    const cookieNames = ['accessToken', 'token', 'jwt'];
    for (const name of cookieNames) {
      if (req.cookies[name]) return req.cookies[name];
    }
  }
  
  return null;
}

import { storage } from '../storage';

export type SessionBindingPolicy = 'strict' | 'relaxed';

const STRICT_POLICY_PATHS: string[] = [
  '/api/auth/change-password',
  '/api/auth/update-profile',
  '/api/users/role',
  '/api/permissions',
  '/api/financial',
  '/api/fund-transfers',
  '/api/backup',
  '/api/admin',
];

function getBindingPolicy(path: string, method: string): SessionBindingPolicy {
  if (method === 'GET') return 'relaxed';
  for (const prefix of STRICT_POLICY_PATHS) {
    if (path.startsWith(prefix)) return 'strict';
  }
  return 'relaxed';
}

// التحقق من صحة الـ Token مع دعم Argon2-based Session
interface DecodedToken {
  userId?: string;
  sub?: string;
  user_id?: string;
  id?: string;
  email: string;
  role: string;
  sessionId?: string;
  type?: string;
  exp?: number;
  iat?: number;
}

const verifyToken = async (token: string): Promise<DecodedToken> => {
  let cleanToken = token.trim();
  if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
    cleanToken = cleanToken.slice(1, -1);
  }

  const secret = JWT_ACCESS_SECRET;
  const issuer = 'construction-management-app-v2';
  
  return jwt.verify(cleanToken, secret, {
    issuer: issuer,
    algorithms: ['HS256'],
    ignoreExpiration: false,
    clockTolerance: 60 
  }) as DecodedToken;
};

const verifySession = async (user_id: string, sessionId: string, clientContext?: ClientContext, policy?: SessionBindingPolicy) => {
  try {
    if ((globalThis as any).isEmergencyMode) {
      console.warn('⚠️ [SESSION] Emergency mode active - skipping DB session verification');
      return { session: null, bindingResult: null };
    }

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

    const found = session.length > 0 ? session[0] : null;

    if (!found) {
      return { session: null, bindingResult: null };
    }

    if (clientContext) {
      const secFlags = (found.securityFlags || {}) as Record<string, unknown>;
      const storedContext = {
        deviceHash: found.deviceFingerprint || undefined,
        platform: (secFlags.platform as string) || undefined,
        ipRange: (secFlags.ipRange as string) || undefined,
        deviceId: found.deviceId || undefined,
        hasStableDeviceId: secFlags.hasStableDeviceId === true,
      };

      const strictMode = policy === 'strict';
      const bindingResult = validateSessionBinding(storedContext, clientContext, strictMode);

      if (bindingResult.action === 'block') {
        console.warn(`🚫 [SESSION-BINDING] Blocked: user=${user_id} reason=${bindingResult.reason}`);
        return { session: null, bindingResult };
      }

      if (bindingResult.action === 'step_up') {
        console.warn(`⚠️ [SESSION-BINDING] Step-up required: user=${user_id} reason=${bindingResult.reason}`);
      }

      return { session: found, bindingResult };
    }

    return { session: found, bindingResult: null };
  } catch (error: unknown) {
    console.error('❌ خطأ في التحقق من الجلسة:', error instanceof Error ? error.message : error);
    return { session: null, bindingResult: null };
  }
};

// Middleware الأمان المتقدم
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // إضافة headers أمنية
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // CSP Header (مُحسن للتطوير والإنتاج) - تم نقله إلى Helmet
  // تم حذف CSP من هنا لتجنب الصراع مع Helmet headers

  next();
};

const suspiciousActivityTracker = new Map<string, { attempts: number; lastAttempt: number; blockedUntil: number }>();
const SUSPICIOUS_WINDOW_MS = 15 * 60 * 1000;
const SUSPICIOUS_MAX_ATTEMPTS = 15;
const SUSPICIOUS_BLOCK_MS = 30 * 60 * 1000;

const TRUSTED_IPS = new Set([
  '127.0.0.1', '::1', '::ffff:127.0.0.1',
  '10.0.0.1', '172.16.0.1',
]);

function isTrustedIp(ip: string): boolean {
  if (TRUSTED_IPS.has(ip)) return true;
  if (ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.')) return true;
  return false;
}

export const trackSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (isTrustedIp(ip)) return next();

  const now = Date.now();

  const entry = suspiciousActivityTracker.get(ip);
  if (entry) {
    if (entry.blockedUntil > now) {
      console.warn(`🚫 [SuspiciousActivity] Blocked IP ${ip} — ${Math.round((entry.blockedUntil - now) / 1000)}s remaining`);
      return res.status(429).json({ success: false, message: 'تم حظر الوصول مؤقتاً بسبب نشاط مشبوه', code: 'SUSPICIOUS_BLOCK' });
    }
    if (now - entry.lastAttempt > SUSPICIOUS_WINDOW_MS) {
      suspiciousActivityTracker.delete(ip);
    } else {
      entry.attempts++;
      entry.lastAttempt = now;
      if (entry.attempts >= SUSPICIOUS_MAX_ATTEMPTS) {
        entry.blockedUntil = now + SUSPICIOUS_BLOCK_MS;
        console.error(`🚨 [SuspiciousActivity] IP ${ip} blocked after ${entry.attempts} failed attempts`);
        return res.status(429).json({ success: false, message: 'تم حظر الوصول مؤقتاً بسبب نشاط مشبوه', code: 'SUSPICIOUS_BLOCK' });
      }
    }
  }

  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      const existing = suspiciousActivityTracker.get(ip);
      if (existing) {
        existing.attempts++;
        existing.lastAttempt = Date.now();
      } else {
        suspiciousActivityTracker.set(ip, { attempts: 1, lastAttempt: Date.now(), blockedUntil: 0 });
      }
    }
    return originalEnd.apply(res, args);
  } as any;

  next();
};

// Middleware المصادقة الأساسي
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const publicPaths = [
      '/api/auth/login', 
      '/api/auth/register', 
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/health',
      '/api/auth/resend-verification',
      '/api/auth/verify-email',
      '/api/auth/refresh',
      '/api/webauthn/login/options',
      '/api/webauthn/login/verify'
    ];
    const requestPath = req.originalUrl?.split('?')[0] || req.path;
    if (publicPaths.includes(requestPath) || publicPaths.includes(req.path)) {
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
      const userAgent = req.get('user-agent') || 'unknown';
      const isSessionProbe = req.originalUrl === '/api/auth/me' && req.method === 'GET';

      if (!isSessionProbe) {
        console.warn(`🚨 [AUTH-FAIL] محاولة وصول بدون توكن | المسار: ${req.method} ${req.originalUrl} | IP: ${ip} | UA: ${userAgent}`);
        
        try {
          CentralLogService.getInstance().log({
            level: 'warn',
            source: 'auth',
            module: 'أمان',
            action: 'auth_failed',
            status: 'failed',
            ipAddress: ip,
            userAgent,
            message: `فشل المصادقة - لا يوجد توكن: ${req.method} ${req.originalUrl}`,
            details: { reason: 'no_token', path: req.originalUrl, method: req.method },
          });
        } catch (auditErr: any) {
          console.warn('[AUTH] فشل تسجيل حدث المصادقة (غير حرج):', auditErr?.message);
        }
      }

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
    } catch (error: unknown) {
      if (req.path === '/api/auth/refresh') {
        return next();
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));
      const errorName = (error as { name?: string })?.name;
      console.warn(`⚠️ [AUTH] Invalid token for ${req.path}: ${errorObj.message}`);

      if (errorName === 'TokenExpiredError' || errorObj.message?.includes('expired')) {
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

    const user_id = decoded.userId || decoded.sub || decoded.user_id || decoded.id;
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'بيانات الاعتماد غير صالحة', code: 'INVALID_TOKEN' });
    }

    const isEmergency = !!(globalThis as any).isEmergencyMode;
    const isEmergencyUser = user_id === 'emergency-admin' || user_id.startsWith('emergency-') || user_id.startsWith('emergency_');

    if (isEmergency && isEmergencyUser) {
      const sessionId = decoded.sessionId || '';
      const isWriteOp = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      const readOnlyRole = isWriteOp ? 'viewer' : 'admin';

      (req as any).user = {
        user_id: user_id,
        email: decoded.email || 'emergency@system.local',
        first_name: 'Emergency',
        last_name: 'Admin',
        full_name: 'Emergency Admin',
        role: readOnlyRole,
        is_active: true,
        mfa_enabled: false,
        sessionId: sessionId,
        isEmergencyMode: true,
      };

      const duration = Date.now() - startTime;
      console.warn(`⚠️ [AUTH-EMERGENCY] Emergency user (read-only enforced for writes): ${decoded.email} | ${req.method} ${req.originalUrl} | ${duration}ms`);

      if (isWriteOp) {
        const isSafeWrite = req.originalUrl.startsWith('/api/auth/');
        if (!isSafeWrite) {
          return res.status(403).json({
            success: false,
            message: 'وضع الطوارئ: العمليات الكتابية محظورة — النظام في وضع القراءة فقط',
            code: 'EMERGENCY_READ_ONLY'
          });
        }
      }

      return next();
    }

    const user = await storage.getUser(user_id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'حساب المستخدم غير نشط أو غير موجود',
        code: 'USER_INACTIVE'
      });
    }

    const sessionId = decoded.sessionId;
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'رمز الوصول لا يحتوي على معرف جلسة - يرجى تسجيل الدخول مجدداً',
        code: 'SESSION_MISSING'
      });
    }

    const clientContext = extractClientContext(req);
    const requestPath = req.originalUrl?.split('?')[0] || req.path;
    const bindingPolicy = getBindingPolicy(requestPath, req.method);

    const { session, bindingResult } = await verifySession(user_id, sessionId, clientContext, bindingPolicy);
    if (!session) {
      if (bindingResult && bindingResult.action === 'block') {
        console.warn(`🚫 [AUTH] Session binding blocked for user ${user_id}: ${bindingResult.reason}`);
        return res.status(403).json({
          success: false,
          message: 'تم رفض الوصول - الجهاز أو المنصة غير متطابقة مع الجلسة الأصلية',
          code: 'SESSION_BINDING_FAILED',
          reason: bindingResult.reason,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'الجلسة منتهية أو ملغاة - يرجى تسجيل الدخول مجدداً',
        code: 'SESSION_REVOKED'
      });
    }

    if (bindingResult && bindingResult.action === 'step_up' && bindingPolicy === 'strict') {
      console.warn(`⚠️ [AUTH] Step-up required for sensitive route: user=${user_id} path=${requestPath} reason=${bindingResult.reason}`);
      return res.status(403).json({
        success: false,
        message: 'يرجى إعادة تسجيل الدخول للوصول إلى هذا المورد الحساس',
        code: 'STEP_UP_REQUIRED',
        reason: bindingResult.reason,
      });
    }

    req.user = {
      user_id: user.id,
      email: user.email,
      first_name: user.first_name || undefined,
      last_name: user.last_name || undefined,
      full_name: user.full_name || undefined,
      role: user.role || 'user',
      is_active: user.is_active === true,
      mfa_enabled: user.mfa_enabled || undefined,
      sessionId: sessionId || ''
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [AUTH] مصادقة ناجحة للمستخدم: ${user.email} | ${req.method} ${req.originalUrl} | ${duration}ms`);

    next();
  } catch (error: unknown) {
    console.error('❌ [AUTH] خطأ في المصادقة:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: 'خطأ في خادم المصادقة',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Middleware للتحقق من صلاحيات الإدارة
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
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
      const decodedUserId = decoded.userId || decoded.sub || decoded.user_id || decoded.id;
      const decodedSessionId = decoded.sessionId;
      if (!decodedUserId) return next();

      const isEmergency = !!(globalThis as any).isEmergencyMode;
      const isEmergencyUser = decodedUserId === 'emergency-admin' || decodedUserId.startsWith('emergency-') || decodedUserId.startsWith('emergency_');

      if (isEmergency && isEmergencyUser) {
        (req as any).user = {
          user_id: decodedUserId,
          email: decoded.email || 'emergency@system.local',
          first_name: 'Emergency',
          last_name: 'Admin',
          full_name: 'Emergency Admin',
          role: decoded.role || 'admin',
          is_active: true,
          mfa_enabled: false,
          sessionId: decodedSessionId || ''
        };
        return next();
      }

      const sessionResult = decodedSessionId ? await verifySession(decodedUserId, decodedSessionId) : { session: true, bindingResult: null };
      const session = typeof sessionResult === 'object' && sessionResult !== null && 'session' in sessionResult ? sessionResult.session : sessionResult;

      if (session) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, decodedUserId))
          .limit(1);

        if (user.length && user[0].is_active) {
          (req as any).user = {
            user_id: user[0].id,
            email: user[0].email,
            first_name: user[0].first_name || undefined,
            last_name: user[0].last_name || undefined,
            full_name: user[0].full_name || undefined,
            role: user[0].role,
            is_active: user[0].is_active,
            mfa_enabled: user[0].mfa_enabled || undefined,
            sessionId: decodedSessionId || ''
          };
        }
      }
    }
  } catch (error: unknown) {
    console.log('⚠️ [AUTH] خطأ في المصادقة الاختيارية:', error instanceof Error ? error.message : error);
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

export const requireAdminOrEditor = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح لك بالوصول',
      code: 'UNAUTHORIZED'
    });
  }
  const role = req.user.role;
  if (role !== 'admin' && role !== 'editor' && role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'تحتاج صلاحيات admin أو editor للوصول لهذا المحتوى',
      code: 'ROLE_REQUIRED'
    });
  }
  next();
};

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

    const userRole = req.user.role;
    const hasRole = userRole === role || (role === 'admin' && userRole === 'super_admin');

    if (!hasRole) {
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
    // حالياً نسمح للـ admin و super_admin بكل شيء
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
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