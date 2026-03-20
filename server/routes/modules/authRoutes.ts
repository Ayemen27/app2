/**
 * مسارات المصادقة - تسجيل الدخول والخروج والتسجيل
 * Authentication Routes - Login, Register, Logout
 */

import express from 'express';
import { Request, Response } from 'express';
import { db } from '../../db.js';
import { sql, eq, and, desc, gte, gt, lte, or, like, isNull } from 'drizzle-orm';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  generateTokenPair,
  refreshAccessToken,
  revokeToken,
  JWT_CONFIG 
} from '../../auth/jwt-utils.js';
import { hashPassword, verifyPassword } from '../../auth/crypto-utils.js';
import { extractClientContext } from '../../auth/client-context.js';
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE_OPTIONS } from '../../auth/cookie-config.js';
import { sendVerificationEmail, verifyEmailToken } from '../../services/email-service.js';
import * as schema from '@shared/schema';
import { users } from '@shared/schema';
import { requireAuth, AuthenticatedRequest, authRateLimit } from '../../middleware/auth.js';
import { requireFreshRequest } from '../../middleware/replay-protection.js';
import { EmergencyAuthService } from '../../services/emergency-auth-service.js';
import { storage } from '../../storage.js';
import { getAuthUser } from '../../internal/auth-user.js';
import { CentralLogService } from '../../services/CentralLogService.js';

interface DbUserRow {
  id: string;
  email: string;
  role: string;
  password: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  is_active: boolean | string | number;
  mfa_enabled: boolean | null;
  email_verified_at: Date | string | null;
  last_login: Date | string | null;
  created_at: Date | string | null;
}

declare global {
  var isEmergencyMode: boolean | undefined;
}

function isNativeClient(req: Request): boolean {
  const raw = req.headers['x-client-platform'];
  if (raw) {
    const vals = (Array.isArray(raw) ? raw.join(',') : String(raw))
      .toLowerCase().split(',').map(v => v.trim());
    if (vals.some(v => ['native','android','ios','capacitor'].includes(v))) return true;
  }
  const origin = (req.headers['origin'] || '') as string;
  if (/^(capacitor|ionic|https?:\/\/localhost)/i.test(origin)) return true;
  const ua = (req.headers['user-agent'] || '') as string;
  if (/capacitor|android.*wv|ionic|dalvik/i.test(ua)) return true;
  return false;
}

const authRouter = express.Router();

/**
 * 🔐 تسجيل الدخول
 * POST /api/auth/login
 */
authRouter.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    console.log('🔐 [AUTH] محاولة تسجيل دخول:', { email: req.body.email, timestamp: new Date().toISOString() });

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ [AUTH] بيانات ناقصة - البريد أو كلمة المرور مفقودة');
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور للمتابعة.'
      });
    }

    // البحث عن المستخدم في قاعدة البيانات (case insensitive)
    let userResult;
    try {
      // التحقق من صحة البريد قبل الاستعلام
      if (!email || typeof email !== 'string') {
        throw new Error('البريد الإلكتروني غير صالح');
      }

      console.log(`🔍 [AUTH] محاولة البحث عن مستخدم: ${email}`);
      
      // ✅ استخدام استعلام SQL خام مباشر لتجنب تعقيدات ORM حالياً
      const rawResult = await db.execute({
        text: 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        values: [email]
      });
      
      userResult = { rows: rawResult.rows || [] };
      console.log(`✅ [AUTH] نتيجة البحث: ${userResult.rows.length} مستخدم`);
    } catch (dbError: any) {
      console.error('🚨 [AUTH] فشل الاتصال بالقاعدة المركزية، جاري الانتقال للطوارئ:', dbError.message);
      
      // محاولة تسجيل الدخول عبر خدمة الطوارئ (الأوفلاين)
      try {
        const emergencyResult = await EmergencyAuthService.loginEmergencyUser(email, password);
        if (emergencyResult.success && emergencyResult.data) {
          console.log('🛡️ [AUTH] تم تسجيل الدخول بنجاح عبر وضع الطوارئ');
          
          setAuthCookies(res, emergencyResult.data.accessToken, emergencyResult.data.refreshToken);

          return res.json({
            success: true,
            status: "success",
            message: emergencyResult.message,
            token: emergencyResult.data.accessToken,
            accessToken: emergencyResult.data.accessToken,
            user: {
              id: emergencyResult.data.user_id,
              email: emergencyResult.data.email,
              name: emergencyResult.data.name,
              role: emergencyResult.data.role,
              emailVerified: true
            }
          });
        }
      } catch (emergencyError: any) {
        console.error('🚨 [AUTH] فشل حتى في وضع الطوارئ:', emergencyError.message);
      }

      return res.status(503).json({
        success: false,
        message: 'عذراً، السيرفر المركزي معطل حالياً ولم نتمكن من التحقق من هويتك في وضع الطوارئ. يرجى المحاولة لاحقاً.',
        error: dbError.message
      });
    }

    if (userResult.rows.length === 0) {
      console.log('❌ [AUTH] المستخدم غير موجود:', email);
      return res.status(401).json({
        success: false,
        message: 'عذراً، البريد الإلكتروني أو كلمة المرور التي أدخلتها غير صحيحة. يرجى التأكد والمحاولة مرة أخرى.'
      });
    }

    const user = userResult.rows[0] as DbUserRow;

    // 🚫 التحقق من حالة الحساب (نشط أم معطل)
    if (user.is_active === false || user.is_active === 0 || user.is_active === 'false') {
      console.log('❌ [AUTH] محاولة دخول لحساب معطل:', email);
      return res.status(403).json({
        success: false,
        message: 'عذراً، حسابك معطل حالياً من قبل الإدارة. يرجى مراجعة الإدارة لتفعيل حسابك.'
      });
    }

    // التحقق من تفعيل البريد الإلكتروني - منع الدخول نهائياً (إلا إذا كان دور المستخدم مسؤولاً أو طوارئ)
    if (!user.email_verified_at && user.role !== 'admin' && user.role !== 'emergency') {
      console.log('❌ [AUTH] البريد الإلكتروني غير مفعل للمستخدم:', email, '- التحقق من وجود رمز صالح');

      // البحث عن رمز نشط لم ينتهِ
      const [existingToken] = await db.select().from(schema.emailVerificationTokens)
        .where(and(
          eq(schema.emailVerificationTokens.user_id, user.id),
          gt(schema.emailVerificationTokens.expiresAt, new Date()),
          isNull(schema.emailVerificationTokens.verifiedAt)
        )).limit(1);

      if (!existingToken) {
        console.log('📧 [AUTH] لا يوجد رمز نشط، إرسال رمز جديد تلقائياً');
        const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined;
        void sendVerificationEmail(
          user.id,
          user.email,
          req.ip || 'unknown',
          req.get('user-agent') || 'unknown',
          userFullName
        ).catch(err => console.error('❌ [AUTH] Error sending auto-email:', err));
      }

      return res.status(403).json({
        success: false,
        requireEmailVerification: true,
        message: 'يجب التحقق من بريدك الإلكتروني أولاً قبل تسجيل الدخول. تم إرسال/تحديث رمز التحقق الخاص بك.',
        data: {
          user_id: user.id,
          email: user.email,
          needsVerification: true
        }
      });
    }

    // التحقق من كلمة المرور باستخدام crypto-utils الموحد
    const passwordMatch = await verifyPassword(password, String(user.password));

    if (!passwordMatch) {
      console.log('❌ [AUTH] كلمة مرور خاطئة للمستخدم:', email);

      try {
        CentralLogService.getInstance().log({
          level: 'warn',
          source: 'auth',
          module: 'أمان',
          action: 'auth_failed',
          status: 'failed',
          actorUserId: user.id,
          ipAddress: req.ip || req.connection?.remoteAddress || undefined,
          userAgent: req.get('user-agent') || undefined,
          message: `فشل تسجيل الدخول - كلمة مرور خاطئة: ${email}`,
          details: { email, reason: 'invalid_password' },
        });
      } catch {}

      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    const clientContext = extractClientContext(req);

    const tokenPair = await generateTokenPair(
      String(user.id),
      String(user.email),
      String(user.role || 'user'),
      clientContext
    );

    console.log('✅ [AUTH-DEBUG] تم توليد زوج الرموز بنجاح:', {
      user_id: user.id,
      accessTokenLength: tokenPair.accessToken?.length || 0,
      refreshTokenLength: tokenPair.refreshToken?.length || 0
    });

    setAuthCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

    const nativeClient = isNativeClient(req);
    const userInfo = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role || 'user',
      emailVerified: !!user.email_verified_at
    };

    const responseData: Record<string, any> = {
      success: true,
      status: "success",
      message: 'تم تسجيل الدخول بنجاح',
      tokenDelivery: nativeClient ? 'bearer' : 'cookie+bearer',
      user: userInfo,
      user_id: user.id,
      email: user.email,
      name: userInfo.name,
      role: user.role || 'user',
      expiresIn: 900,
      expires_in: 900,
      token_type: "Bearer",
      emailVerified: !!user.email_verified_at,
      token: tokenPair.accessToken,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokens: { accessToken: tokenPair.accessToken, refreshToken: tokenPair.refreshToken },
      data: {
        user: userInfo,
        triggerSync: true,
        initialSyncDelay: 1000,
        token: tokenPair.accessToken,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      }
    };

    console.log('📤 [AUTH-DEBUG] إرسال الاستجابة النهائية:', {
      user_id: user.id,
      hasToken: !!responseData.token,
      tokenPreview: responseData.token ? (responseData.token.substring(0, 10) + '...') : 'null',
      timestamp: new Date().toISOString()
    });

    res.json(responseData);

    try {
      CentralLogService.getInstance().log({
        level: 'info',
        source: 'auth',
        module: 'أمان',
        action: 'login',
        status: 'success',
        actorUserId: user.id,
        ipAddress: req.ip || req.connection?.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
        message: `تسجيل دخول ناجح: ${user.email}`,
        details: { email: user.email, role: user.role },
      });
    } catch {}

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء تسجيل الدخول',
      error: error.message
    });
  }
});

/**
 * 📝 تسجيل حساب جديد
 * POST /api/auth/register
 */
authRouter.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    console.log('📝 [AUTH] محاولة تسجيل حساب جديد:', { email: req.body.email });

    const { email, password, full_name, phone, birth_date, birth_place, gender } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'الحقول الأساسية (البريد، كلمة المرور، الاسم الكامل) مطلوبة'
      });
    }

    // التحقق من وجود المستخدم مسبقاً (case insensitive)
    const existingUser = await db.execute({
      text: 'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      values: [email]
    });

    if (existingUser.rows.length > 0) {
      console.log('❌ [AUTH] المستخدم موجود مسبقاً:', email);
      return res.status(409).json({
        success: false,
        message: 'البريد الإلكتروني الذي أدخلته مسجل مسبقاً في النظام. يرجى تسجيل الدخول أو استخدام خيار استعادة كلمة المرور.'
      });
    }

    // تشفير كلمة المرور باستخدام crypto-utils الموحد
    const hashedPassword = await hashPassword(password);

    // إنشاء المستخدم الجديد
    // تقسيم full_name إلى first_name و last_name (للتوافق مع الحقول القديمة)
    const names = full_name.trim().split(/\s+/);
    const first_name = names[0] || '';
    const last_name = names.slice(1).join(' ') || '';

    const newUserResult = await db.execute({
      text: `INSERT INTO users (
        email, password, first_name, last_name, full_name, 
        phone, birth_date, birth_place, gender, 
        role, is_active, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, 
        'user', true, NOW()
      )
      RETURNING id, email, full_name, created_at`,
      values: [email, hashedPassword, first_name, last_name, full_name, phone || null, birth_date || null, birth_place || null, gender || null]
    });

    const newUser = newUserResult.rows[0] as DbUserRow;

    console.log('✅ [AUTH] تم إنشاء حساب جديد:', { 
      user_id: newUser.id, 
      email: newUser.email,
      full_name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim()
    });

    // إرسال رمز التحقق من البريد الإلكتروني في الخلفية (بدون انتظار)
    void sendVerificationEmail(
      newUser.id,
      newUser.email,
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown',
      full_name  // تمرير الاسم مباشرة من نموذج التسجيل - بدون استعلام إضافي
    ).then(emailResult => {
      console.log('📧 [AUTH] نتيجة إرسال بريد التحقق:', emailResult);
    }).catch(emailError => {
      console.error('❌ [AUTH] فشل في إرسال بريد التحقق:', emailError);
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب',
      requireEmailVerification: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          created_at: newUser.created_at
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في تسجيل حساب جديد:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء إنشاء الحساب',
      error: error.message
    });
  }
});

/**
 * 🔑 تحديث دور المستخدم
 * PATCH /api/users/:id/role
 */
authRouter.patch('/users/:id/role', requireAuth, requireFreshRequest({ windowSec: 60 }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    console.log(`🔐 [AUTH] محاولة تحديث دور المستخدم ${id} إلى ${role}`);

    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل أدوار المستخدمين'
      });
    }

    const validRoles = ['admin', 'manager', 'user'] as const;
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `الدور المطلوب غير صالح. الأدوار المسموحة: ${validRoles.join(', ')}`
      });
    }

    const updatedUser = await storage.updateUserRole(id, role);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث دور المستخدم بنجاح',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في تحديث دور المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء تحديث دور المستخدم',
      error: error.message
    });
  }
});

/**
 * 🚪 تسجيل الخروج
 * POST /api/auth/logout
 */
authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.user?.sessionId;
    const userId = req.user?.user_id;
    console.log('🚪 [AUTH] تسجيل خروج المستخدم:', { userId, sessionId: sessionId?.substring(0, 8) + '...' });

    if (sessionId) {
      const revoked = await revokeToken(sessionId, 'logout');
      if (revoked) {
        console.log('✅ [AUTH] تم إبطال الجلسة في قاعدة البيانات بنجاح');
      } else {
        console.warn('⚠️ [AUTH] لم يتم العثور على جلسة لإبطالها أو فشل الإبطال');
      }
    }

    clearAuthCookies(res);

    try {
      CentralLogService.getInstance().log({
        level: 'info',
        source: 'auth',
        module: 'أمان',
        action: 'logout',
        status: 'success',
        actorUserId: userId || undefined,
        ipAddress: req.ip || req.connection?.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
        message: `تسجيل خروج: ${req.user?.email || userId}`,
        details: { email: req.user?.email },
      });
    } catch {}

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في تسجيل الخروج:', error);
    clearAuthCookies(res);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الخروج',
      error: error.message
    });
  }
});

/**
 * 🔄 تجديد Access Token
 * POST /api/auth/refresh
 */
authRouter.post('/refresh', authRateLimit, async (req: Request, res: Response) => {
  try {
    console.log('🔄 [AUTH] طلب تجديد Access Token');

    const { refreshToken: bodyToken } = req.body;
    const cookieToken = req.cookies?.refreshToken;
    const refreshToken = cookieToken || bodyToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token مطلوب'
      });
    }

    // التحقق من صحة refresh token
    try {
      const decoded = await verifyRefreshToken(refreshToken);

      if (!decoded) {
        console.log('❌ [AUTH] Refresh token غير صالح أو منتهي');
        return res.status(401).json({
          success: false,
          message: 'جلسة العمل منتهية، يرجى تسجيل الدخول مرة أخرى'
        });
      }

      // استخراج المعرف بشكل مرن لدعم مختلف هياكل الـ JWT (userId أو id)
      const userId = decoded.userId || decoded.user_id || decoded.id || decoded.sub;

      if (!userId) {
        console.error('❌ [AUTH] معرف المستخدم مفقود في الرمز:', decoded);
        return res.status(401).json({ success: false, message: 'بيانات الاعتماد غير صالحة' });
      }

      if (globalThis.isEmergencyMode && (userId === 'emergency-admin' || decoded.role === 'admin')) {
        console.log('🛡️ [AUTH/refresh] Emergency mode - bypassing DB lookup for token refresh');

        const clientContext = extractClientContext(req);
        const tokenPair = await refreshAccessToken(refreshToken, clientContext);

        if (!tokenPair) {
          return res.status(401).json({
            success: false,
            message: 'فشل تجديد الجلسة، يرجى تسجيل الدخول'
          });
        }

        setAuthCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

        const nativeClient = isNativeClient(req);
        const emergencyUser = {
          id: userId,
          email: decoded.email || 'emergency@admin',
          name: decoded.email || 'Emergency Admin',
          role: decoded.role || 'admin'
        };
        const responseData: Record<string, any> = {
          success: true,
          message: 'تم تجديد الرموز بنجاح (وضع الطوارئ)',
          tokenDelivery: nativeClient ? 'bearer' : 'cookie+bearer',
          expiresIn: 900,
          token: tokenPair.accessToken,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          user: emergencyUser,
          data: {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken
          }
        };

        return res.json(responseData);
      }

      // البحث عن المستخدم في قاعدة البيانات
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        console.error('❌ [AUTH] المستخدم غير موجود في قاعدة البيانات:', { userId });
        return res.status(401).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      // التحقق من حالة الحساب
      if (user.is_active === "false" || user.is_active === false) {
        return res.status(403).json({ success: false, message: 'الحساب معطل' });
      }

      const clientContext = extractClientContext(req);
      const tokenPair = await refreshAccessToken(refreshToken, clientContext);

      if (!tokenPair) {
        return res.status(401).json({
          success: false,
          message: 'فشل تجديد الجلسة، يرجى تسجيل الدخول'
        });
      }

      console.log('✅ [AUTH] تم تجديد الرموز بنجاح:', { user_id: user.id });

      setAuthCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

      const nativeClient = isNativeClient(req);
      const responseData: Record<string, any> = {
        success: true,
        message: 'تم تجديد الرموز بنجاح',
        tokenDelivery: nativeClient ? 'bearer' : 'cookie+bearer',
        expiresIn: 900,
        token: tokenPair.accessToken,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          role: user.role || 'user'
        },
        data: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken
        }
      };

      return res.json(responseData);

    } catch (tokenError: any) {
      console.log('❌ [AUTH] Refresh token غير صالح:', tokenError.message);
      return res.status(401).json({
        success: false,
        message: 'Refresh token غير صالح أو منتهي الصلاحية'
      });
    }

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في تجديد Token:', error);
    res.status(401).json({
      success: false,
      message: 'خطأ في تجديد Access Token',
      error: error.message
    });
  }
});

/**
 * 📧 تحقق من البريد الإلكتروني - GET (من الرابط في البريل)
 * GET /api/auth/verify-email?user_id=...&token=...
 */
authRouter.get('/verify-email', async (req: Request, res: Response) => {
  try {
    console.log('📧 [AUTH] GET طلب تحقق من البريد الإلكتروني من الرابط');

    const { user_id, token } = req.query;

    if (!user_id || !token) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم ورمز التحقق مطلوبان'
      });
    }

    // التحقق من الرمز
    const result = await verifyEmailToken(user_id as string, token as string);

    console.log('📧 [AUTH] نتيجة التحقق:', result);

    if (result.success) {
      console.log('✅ [AUTH] تم التحقق من البريد بنجاح (GET):', { user_id });
      
      // جلب بيانات المستخدم المحدثة
      const userResult = await db.execute({
        text: 'SELECT id, email, role, first_name, last_name FROM users WHERE id = $1',
        values: [user_id]
      });
      const user = userResult.rows[0] as DbUserRow;

      res.json({
        success: true,
        message: result.message,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          role: user.role || 'user',
          emailVerified: true
        }
      });
    } else {
      console.log('❌ [AUTH] فشل في التحقق من البريد:', result.message);
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ [AUTH] خطأ في التحقق من البريد:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء التحقق',
      error: errMsg
    });
  }
});

/**
 * 📧 تحقق من البريد الإلكتروني - POST (من الـ frontend form)
 * POST /api/auth/verify-email
 */
authRouter.post('/verify-email', authRateLimit, async (req: Request, res: Response) => {
  try {
    console.log('📧 [AUTH] POST طلب تحقق من البريد الإلكتروني');

    const { user_id, code } = req.body;

    if (!user_id || !code) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم ورمز التحقق مطلوبان'
      });
    }

    // التحقق من الرمز
    const result = await verifyEmailToken(user_id, code);

    if (result.success) {
      console.log('✅ [AUTH] تم التحقق من البريد بنجاح (POST):', { user_id });
      
      // جلب بيانات المستخدم المحدثة
      const userResult = await db.execute({
        text: 'SELECT id, email, role, first_name, last_name FROM users WHERE id = $1',
        values: [user_id]
      });
      const user = userResult.rows[0] as DbUserRow;

      res.json({
        success: true,
        message: result.message,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          role: user.role || 'user',
          emailVerified: true
        }
      });
    } else {
      console.log('❌ [AUTH] فشل في التحقق من البريد:', result.message);
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في التحقق من البريد:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء التحقق',
      error: error.message
    });
  }
});

/**
 * 🔄 إعادة إرسال رمز التحقق
 * POST /api/auth/resend-verification
 */
authRouter.post('/resend-verification', authRateLimit, async (req: Request, res: Response) => {
  try {
    console.log('🔄 [AUTH] طلب إعادة إرسال رمز التحقق');

    const { user_id, email } = req.body;

    if (!user_id || !email) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم والبريد الإلكتروني مطلوبان'
      });
    }

    // إرسال رمز تحقق جديد في الخلفية (بدون انتظار)
    void sendVerificationEmail(
      user_id,
      email,
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    ).then(result => {
      console.log('✅ [AUTH] تم إعادة إرسال رمز التحقق بنجاح:', { user_id, email, success: result.success });
    }).catch(error => {
      console.error('❌ [AUTH] فشل في إعادة إرسال رمز التحقق:', error);
    });

    // الرد فوراً دون انتظار
    console.log('🚀 [AUTH] تم استلام طلب إعادة الإرسال، سيتم الإرسال في الخلفية');
    res.json({
      success: true,
      message: 'تم استلام طلبك. سيتم إرسال رمز التحقق إلى بريدك الإلكتروني خلال لحظات'
    });

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في إعادة إرسال رمز التحقق:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء إعادة الإرسال',
      error: error.message
    });
  }
});

/**
 * 🔍 التحقق من صحة حقل (البريد الإلكتروني أو كلمة المرور)
 * POST /api/auth/validate-field
 */
authRouter.post('/validate-field', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { field, value, context } = req.body;

    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value || !emailRegex.test(value)) {
        return res.json({
          success: true,
          isValid: false,
          message: 'تنسيق البريد الإلكتروني غير صحيح'
        });
      }

      // التحقق من وجود البريد في قاعدة البيانات إذا كان السياق هو التسجيل
      if (context === 'register') {
        const existingUser = await db.execute(sql`
          SELECT id FROM users WHERE LOWER(email) = LOWER(${value})
        `);

        if (existingUser.rows.length > 0) {
          return res.json({
            success: true,
            isValid: false,
            message: 'هذا البريد الإلكتروني مسجل مسبقاً'
          });
        }
      }

      return res.json({
        success: true,
        isValid: true,
        message: 'البريد الإلكتروني متاح وصحيح'
      });
    }

    if (field === 'password') {
      if (!value || value.length < 8) {
        return res.json({
          success: true,
          isValid: false,
          message: 'كلمة المرور قصيرة جداً (8 أحرف على الأقل)',
          strength: 1
        });
      }

      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[a-z]/.test(value)) strength++;
      if (/\d/.test(value)) strength++;
      
      return res.json({
        success: true,
        isValid: true,
        message: strength >= 3 ? 'كلمة مرور قوية' : 'كلمة مرور مقبولة',
        strength: Math.min(strength, 4)
      });
    }

    return res.status(400).json({ success: false, message: 'حقل غير مدعوم' });
  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في التحقق من الحقل:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * جلب جميع المستخدمين (للمسؤولين فقط)
 * GET /api/auth/users
 */
authRouter.get('/users', requireAuth, async (req: any, res: Response) => {
  console.log('🔍 [AUTH/users] تم استقبال طلب جلب المستخدمين');
  try {
    console.log('👥 [AUTH/users] طلب جلب المستخدمين من:', req.user?.email);
    console.log('🔍 [AUTH/users] معاملات البحث:', { search: req.query.search, role: req.query.role, status: req.query.status, verified: req.query.verified });

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      console.log('❌ [AUTH/users] غير مصرح - الدور:', req.user?.role);
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { search, role, status, verified } = req.query;

    let query = db.select().from(users);

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.first_name, `%${search}%`),
          like(users.last_name, `%${search}%`)
        )
      );
    }
    if (role) conditions.push(eq(users.role, role as string));
    if (status === 'active') conditions.push(eq(users.is_active, true));
    if (status === 'inactive') conditions.push(eq(users.is_active, false));
    if (verified === 'verified') conditions.push(sql`${users.email_verified_at} IS NOT NULL`);
    if (verified === 'unverified') conditions.push(sql`${users.email_verified_at} IS NULL`);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    console.log('📊 [AUTH/users] تنفيذ الاستعلام...');
    const usersList = await query.orderBy(desc(users.created_at));
    console.log(`✅ [AUTH/users] تم جلب ${usersList.length} مستخدم من قاعدة البيانات`);

    type UserRow = typeof usersList[number];
    const sanitizedUsers = usersList.map((u: UserRow) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      is_active: u.is_active,
      email_verified_at: u.email_verified_at,
      last_login: u.last_login,
      created_at: u.created_at,
    }));

    console.log('📤 [AUTH/users] إرسال الاستجابة:', { 
      success: true, 
      usersCount: sanitizedUsers.length,
      sampleUser: sanitizedUsers[0] ? {
        id: sanitizedUsers[0].id,
        email: sanitizedUsers[0].email,
        first_name: sanitizedUsers[0].first_name
      } : 'لا يوجد مستخدمين'
    });

    return res.json({ success: true, users: sanitizedUsers });
  } catch (error) {
    console.error('❌ [AUTH/users] خطأ في جلب المستخدمين:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم', error: (error as Error).message });
  }
});

/**
 * تحديث مستخدم
 * PATCH /api/auth/users/:user_id
 */
authRouter.patch('/users/:user_id', requireAuth, async (req: any, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { user_id } = req.params;

    const allowedFields = ['first_name', 'last_name', 'role', 'is_active'] as const;
    const validRoles = ['admin', 'manager', 'user'];

    const unexpectedFields = Object.keys(req.body).filter(
      (k) => !(allowedFields as readonly string[]).includes(k)
    );
    if (unexpectedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `حقول غير مسموحة: ${unexpectedFields.join(', ')}`
      });
    }

    const { first_name, last_name, role, is_active } = req.body;

    if (role !== undefined && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `الدور غير صالح. الأدوار المسموحة: ${validRoles.join(', ')}`
      });
    }

    if (is_active !== undefined && typeof is_active !== 'boolean' && is_active !== 'true' && is_active !== 'false') {
      return res.status(400).json({
        success: false,
        message: 'قيمة is_active يجب أن تكون true أو false'
      });
    }

    const updateData: Record<string, unknown> = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === 'true';

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user_id));

    return res.json({ success: true, message: 'تم تحديث المستخدم بنجاح' });
  } catch (error) {
    console.error('خطأ في تحديث المستخدم:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * حذف مستخدم
 * DELETE /api/auth/users/:user_id
 */
authRouter.delete('/users/:user_id', requireAuth, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'يتطلب صلاحيات المدير أو المدير الأول' });
    }

    const { user_id } = req.params;

    if (user_id === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك الخاص' });
    }

    await db.delete(users).where(eq(users.id, user_id));

    return res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف المستخدم:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * تبديل حالة المستخدم
 * POST /api/auth/users/:user_id/toggle-status
 */
authRouter.post('/users/:user_id/toggle-status', requireAuth, async (req: any, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { user_id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined || (typeof is_active !== 'boolean' && is_active !== 'true' && is_active !== 'false')) {
      return res.status(400).json({ success: false, message: 'قيمة is_active مطلوبة ويجب أن تكون true أو false' });
    }

    if (user_id === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تعطيل حسابك الخاص' });
    }

    await db
      .update(users)
      .set({ is_active })
      .where(eq(users.id, user_id));

    return res.json({ success: true, message: 'تم تحديث حالة المستخدم' });
  } catch (error) {
    console.error('خطأ في تحديث حالة المستخدم:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * 🚨 مسارات المصادقة في وضع الطوارئ
 * Emergency Mode Authentication Routes
 */

/**
 * تسجيل دخول الطوارئ
 * POST /api/auth/emergency/login
 */
authRouter.post('/emergency/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    const result = await EmergencyAuthService.loginEmergencyUser(email, password);

    if (result.success) {
      console.log('✅ [EMERGENCY] تسجيل دخول ناجح في وضع الطوارئ:', { email });
      res.json(result);
    } else {
      console.warn('⚠️ [EMERGENCY] محاولة تسجيل دخول فاشلة:', { email, reason: result.message });
      res.status(401).json(result);
    }

  } catch (error: any) {
    console.error('❌ [EMERGENCY] خطأ في تسجيل دخول الطوارئ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في نظام الطوارئ',
      error: error.message
    });
  }
});

/**
 * حالة نظام الطوارئ
 * GET /api/auth/emergency/status
 */
authRouter.get('/emergency/status', async (req: Request, res: Response) => {
  try {
    const isEmergencyMode = globalThis.isEmergencyMode || false;
    const adminCreds = EmergencyAuthService.getEmergencyAdminCredentials();

    res.json({
      success: true,
      data: {
        isEmergencyMode,
        hasEmergencyAdmin: !!adminCreds,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ [EMERGENCY] خطأ في جلب حالة الطوارئ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة الطوارئ'
    });
  }
});

/**
 * إنشاء مستخدم طارئ جديد (للمسؤولين فقط)
 * POST /api/auth/emergency/create-user
 */
authRouter.post('/emergency/create-user', authRateLimit, requireAuth, async (req: any, res: Response) => {
  try {
    // تحقق من صلاحيات المسؤول
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - يتطلب صلاحيات المسؤول'
      });
    }

    const { email, password, name, role } = req.body;

    const result = await EmergencyAuthService.createEmergencyUser({
      email,
      password,
      name,
      role: role || 'admin'
    });

    if (result.success) {
      console.log('✅ [EMERGENCY] تم إنشاء مستخدم طارئ جديد:', { email, name });
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error: any) {
    console.error('❌ [EMERGENCY] خطأ في إنشاء مستخدم طارئ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المستخدم الطارئ',
      error: error.message
    });
  }
});

authRouter.get('/me', requireAuth, (req: any, res: Response) => {
  if (req.user) {
    if (globalThis.isEmergencyMode) {
      console.log('🛡️ [AUTH/me] Emergency mode - returning user from middleware directly');
    }
    res.json({ success: true, user: req.user });
  } else {
    res.status(401).json({ success: false, message: "غير مصرح" });
  }
});

/**
 * 🔑 نسيت كلمة المرور
 * POST /api/auth/forgot-password
 */
authRouter.post('/forgot-password', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    console.log(`🔍 [AUTH] طلب استعادة كلمة المرور لـ: ${email}`);

    const { sendPasswordResetEmail } = await import('../../services/email-service.js');
    const emailResult = await sendPasswordResetEmail(
      email,
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );

    return res.json({
      success: true,
      message: 'إذا كان البريد مسجلاً لدينا، فستتلقى تعليمات استعادة كلمة المرور قريباً'
    });

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في forgot-password:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * 🔐 إعادة تعيين كلمة المرور
 * POST /api/auth/reset-password
 */
authRouter.post('/reset-password', authRateLimit, requireFreshRequest({ windowSec: 60 }), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'رمز الاسترجاع وكلمة المرور الجديدة مطلوبان' 
      });
    }

    console.log('🔐 [AUTH] طلب إعادة تعيين كلمة المرور');

    const { resetPasswordWithToken } = await import('../../services/email-service.js');
    const result = await resetPasswordWithToken(token, newPassword);

    if (result.success) {
      console.log('✅ [AUTH] تم إعادة تعيين كلمة المرور بنجاح');
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      console.log('❌ [AUTH] فشل في إعادة تعيين كلمة المرور:', result.message);
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في reset-password:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'خطأ في الخادم أثناء إعادة تعيين كلمة المرور' 
    });
  }
});

// تأكد من تسجيل المسارات في الكونسول للتأكد من التحميل
console.log('🔐 [AuthRouter] تم تهيئة مسارات المصادقة والمزامنة');

export { authRouter };
export default authRouter;