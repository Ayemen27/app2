/**
 * مسارات المصادقة - تسجيل الدخول والخروج والتسجيل
 * Authentication Routes - Login, Register, Logout
 */

import express from 'express';
import { Request, Response } from 'express';
import { db } from '../../db.js';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../auth/jwt-utils.js';

export const authRouter = express.Router();

/**
 * 🔐 تسجيل الدخول
 * POST /api/auth/login
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('🔐 [AUTH] محاولة تسجيل دخول:', { email: req.body.email, timestamp: new Date().toISOString() });
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ [AUTH] بيانات ناقصة - البريد أو كلمة المرور مفقودة');
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // البحث عن المستخدم في قاعدة البيانات
    const userResult = await db.execute(sql`
      SELECT id, email, password, full_name, created_at
      FROM users 
      WHERE email = ${email}
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ [AUTH] المستخدم غير موجود:', email);
      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    const user = userResult.rows[0] as any;
    
    // التحقق من كلمة المرور
    const passwordMatch = await bcrypt.compare(password, String(user.password));
    
    if (!passwordMatch) {
      console.log('❌ [AUTH] كلمة مرور خاطئة للمستخدم:', email);
      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    // إنشاء JWT tokens
    const accessToken = generateAccessToken({
      userId: String(user.id),
      email: String(user.email),
      role: 'user' // افتراضي
    });
    const refreshToken = generateRefreshToken({
      userId: String(user.id),
      email: String(user.email)
    });
    
    console.log('✅ [AUTH] تم تسجيل الدخول بنجاح:', { 
      userId: user.id, 
      email: user.email,
      fullName: user.full_name
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          createdAt: user.created_at
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

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
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    console.log('📝 [AUTH] محاولة تسجيل حساب جديد:', { email: req.body.email });
    
    const { email, password, fullName } = req.body;
    
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة (البريد، كلمة المرور، الاسم الكامل)'
      });
    }

    // التحقق من وجود المستخدم مسبقاً
    const existingUser = await db.execute(sql`
      SELECT id FROM users WHERE email = ${email}
    `);

    if (existingUser.rows.length > 0) {
      console.log('❌ [AUTH] المستخدم موجود مسبقاً:', email);
      return res.status(409).json({
        success: false,
        message: 'المستخدم موجود بالفعل بهذا البريد الإلكتروني'
      });
    }

    // تشفير كلمة المرور
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // إنشاء المستخدم الجديد
    const newUserResult = await db.execute(sql`
      INSERT INTO users (email, password, full_name, created_at)
      VALUES (${email}, ${hashedPassword}, ${fullName}, NOW())
      RETURNING id, email, full_name, created_at
    `);

    const newUser = newUserResult.rows[0] as any;

    console.log('✅ [AUTH] تم إنشاء حساب جديد:', { 
      userId: newUser.id, 
      email: newUser.email,
      fullName: newUser.full_name
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          createdAt: newUser.created_at
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
 * 🚪 تسجيل الخروج
 * POST /api/auth/logout
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    console.log('🚪 [AUTH] تسجيل خروج المستخدم');
    
    // في المستقبل يمكن إضافة blacklist للـ tokens
    // أو إلغاء refresh token من قاعدة البيانات
    
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في تسجيل الخروج:', error);
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
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [AUTH] طلب تجديد Access Token');
    
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token مطلوب'
      });
    }

    // التحقق من صحة refresh token
    try {
      const decoded = verifyRefreshToken(refreshToken) as any;
      
      if (!decoded) {
        console.log('❌ [AUTH] Refresh token غير صالح');
        return res.status(401).json({
          success: false,
          message: 'Refresh token غير صالح'
        });
      }

      // البحث عن المستخدم مرة أخرى للتأكد
      const userResult = await db.execute(sql`
        SELECT id, email, full_name, created_at
        FROM users 
        WHERE id = ${decoded.userId || decoded.id}
      `);

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      const user = userResult.rows[0] as any;
      
      // إنشاء access token جديد
      const newAccessToken = generateAccessToken({
        userId: String(user.id),
        email: String(user.email),
        role: 'user'
      });
    
      console.log('✅ [AUTH] تم تجديد Access Token بنجاح:', { userId: user.id });

      res.json({
        success: true,
        message: 'تم تجديد Access Token بنجاح',
        data: {
          accessToken: newAccessToken
        }
      });

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
 * 👤 معلومات المستخدم الحالي
 * GET /api/auth/me
 */
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    console.log('👤 [AUTH] طلب معلومات المستخدم الحالي');
    
    // سيتم إضافة middleware للتحقق من المصادقة هنا لاحقاً
    res.json({
      success: true,
      message: 'معلومات المستخدم - سيتم تطبيق المنطق الكامل',
      data: {
        user: null
      }
    });

  } catch (error: any) {
    console.error('❌ [AUTH] خطأ في جلب معلومات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معلومات المستخدم',
      error: error.message
    });
  }
});

console.log('🔐 [AuthRouter] تم تهيئة مسارات المصادقة');

export default authRouter;