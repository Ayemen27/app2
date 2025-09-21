/**
 * Middleware للمصادقة والترخيص - نظام متطور
 * يدعم إدارة المسارات العامة والخاصة مع أداء محسن وأمان عالي
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt-utils.js';
import jwt from 'jsonwebtoken';
import { routeManager, HttpMethod, publicRouteRateLimit, authRouteRateLimit } from '../config/routes.js';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
  };
}

/**
 * Middleware متطور للتحقق من المصادقة
 * يستخدم نظام إدارة المسارات المتقدم مع أداء محسن وأمان عالي
 */
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  try {
    const path = req.path || req.url || '';
    const method = (req.method || 'GET') as HttpMethod;
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    
    console.log(`🔍 [AUTH] فحص متقدم - المسار: ${method} ${path} | IP: ${clientIP}`);
    
    // 🚀 **استخدام النظام المتطور لفحص المسارات العامة**
    // يدعم Set/Map للبحث السريع، wildcards، regex، والمعاملات الديناميكية
    const isPublicRoute = routeManager.isPublicRoute(path, method);
    
    if (isPublicRoute) {
      const processingTime = Date.now() - startTime;
      console.log(`✅ [AUTH] مسار عام معتمد: ${method} ${path} | معالج في ${processingTime}ms`);
      
      // تطبيق rate limiting للمسارات العامة حسب النوع
      if (path.startsWith('/api/auth/')) {
        // Rate limiting خاص لمسارات المصادقة
        console.log(`🛡️ [AUTH] تطبيق rate limiting للمصادقة على: ${method} ${path}`);
        return authRouteRateLimit(req, res, next);
      } else {
        // Rate limiting عام للمسارات العامة الأخرى
        return publicRouteRateLimit(req, res, next);
      }
    }
    
    // 🛡️ **تطبيق المصادقة افتراضياً للمسارات غير العامة**
    // المنطق الآمن: إذا لم يكن المسار عام صريح، طبق المصادقة
    // هذا يضمن الأمان الكامل ويترك Express يتعامل مع 404 للمسارات غير موجودة فعلياً
    console.log(`🔐 [AUTH] تطبيق المصادقة الافتراضية على المسار: ${method} ${path}`);
    
    // فحص rate limiting للمسار (عام أو محمي)
    const routeRateLimiter = routeManager.getRateLimiter(path, method);
    if (routeRateLimiter) {
      console.log(`🛡️ [AUTH] تطبيق rate limiting مخصص للمسار: ${method} ${path}`);
      routeRateLimiter(req, res, () => {
        // المتابعة بعد rate limiting
        authenticateUser(req, res, next, path, method, startTime, clientIP);
      });
    } else {
      // المتابعة مباشرة للمصادقة
      authenticateUser(req, res, next, path, method, startTime, clientIP);
    }
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [AUTH] خطأ في معالجة المصادقة: ${error.message} | ${processingTime}ms`);
    return res.status(500).json({
      success: false,
      message: 'خطأ داخلي في نظام المصادقة',
      code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

/**
 * دالة مساعدة للمصادقة الفعلية
 */
async function authenticateUser(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction, 
  path: string, 
  method: HttpMethod, 
  startTime: number,
  clientIP: string
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const processingTime = Date.now() - startTime;
      console.warn(`🚫 [AUTH] رمز مصادقة مفقود: ${method} ${path} | IP: ${clientIP} | ${processingTime}ms`);
      return res.status(401).json({
        success: false,
        message: 'لم يتم العثور على رمز المصادقة',
        code: 'MISSING_AUTH_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    
    // التحقق من صحة الرمز باستخدام النظام الآمن
    const decoded = await verifyAccessToken(token);
    
    if (!decoded || !decoded.success || !decoded.user) {
      const processingTime = Date.now() - startTime;
      console.warn(`🚫 [AUTH] رمز مصادقة غير صالح: ${method} ${path} | IP: ${clientIP} | ${processingTime}ms`);
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح أو منتهي الصلاحية',
        code: 'INVALID_AUTH_TOKEN'
      });
    }

    // إضافة معلومات المستخدم للطلب
    req.user = decoded.user;
    
    // معاملات المسار متاحة بالفعل في req.params بواسطة Express
    // لا حاجة لاستخراج إضافي - تحسين الأداء
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ [AUTH] مصادقة ناجحة للمستخدم: ${decoded.user.email} | ${method} ${path} | ${processingTime}ms`);
    
    next();
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [AUTH] خطأ في التحقق من الرمز: ${error.message} | ${processingTime}ms`);
    return res.status(401).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة',
      code: 'AUTH_VERIFICATION_ERROR'
    });
  }
}

/**
 * Middleware للتحقق من الصلاحيات
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'غير مصرح'
        });
      }

      // المدير لديه جميع الصلاحيات
      if (req.user.role === 'admin') {
        return next();
      }

      // TODO: تنفيذ نظام الصلاحيات المتقدم هنا
      // حالياً نسمح للمستخدمين العاديين بالوصول الأساسي
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'ممنوع - ليس لديك الصلاحية المطلوبة'
      });
    }
  };
};

/**
 * Middleware للتحقق من الدور
 */
export const requireRole = (roles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ممنوع - ليس لديك الدور المطلوب'
      });
    }

    next();
  };
};