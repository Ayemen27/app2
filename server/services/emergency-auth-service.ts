/**
 * خدمة المصادقة في وضع الطوارئ
 * Emergency Mode Authentication Service
 * يتعامل مع مصادقة المستخدمين الطارئين عند فشل الاتصال بقاعدة البيانات الرئيسية
 */

import { db } from '../db';
import { emergencyUsers } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../auth/crypto-utils';
import { generateAccessToken, generateRefreshToken } from '../auth/jwt-utils';

const EMERGENCY_ACCESS_LIMIT = 5; // محاولات تسجيل دخول محدودة في وضع الطوارئ
const EMERGENCY_LOCK_DURATION = 15 * 60 * 1000; // قفل لمدة 15 دقيقة

interface EmergencyLoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, EmergencyLoginAttempt>();

export class EmergencyAuthService {
  /**
   * التحقق من وجود بيانات اعتماد طارئة مشروعة (من متغيرات البيئة فقط)
   */
  static getEmergencyAdminCredentials(): {
    email: string;
    password: string;
  } | null {
    const email = process.env.EMERGENCY_ADMIN_EMAIL;
    const password = process.env.EMERGENCY_ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn('⚠️ [EMERGENCY] بيانات اعتماد المسؤول في وضع الطوارئ غير مكونة');
      return null;
    }

    return { email, password };
  }

  /**
   * التحقق من محاولات تسجيل الدخول الزائدة
   */
  static checkRateLimit(email: string): {
    allowed: boolean;
    remainingAttempts: number;
    lockedUntil: Date | null;
  } {
    const now = Date.now();
    const attempt = loginAttempts.get(email);

    if (!attempt) {
      return {
        allowed: true,
        remainingAttempts: EMERGENCY_ACCESS_LIMIT,
        lockedUntil: null,
      };
    }

    // تحقق إذا كان المستخدم مقفول
    if (attempt.lockedUntil && attempt.lockedUntil > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: new Date(attempt.lockedUntil),
      };
    }

    // أعد تعيين المحاولات إذا انقضت المدة الزمنية (10 دقائق)
    if (now - attempt.lastAttempt > 10 * 60 * 1000) {
      loginAttempts.delete(email);
      return {
        allowed: true,
        remainingAttempts: EMERGENCY_ACCESS_LIMIT,
        lockedUntil: null,
      };
    }

    // تحقق من عدد المحاولات
    if (attempt.attempts >= EMERGENCY_ACCESS_LIMIT) {
      const newLockedUntil = now + EMERGENCY_LOCK_DURATION;
      loginAttempts.set(email, {
        ...attempt,
        lockedUntil: newLockedUntil,
        lastAttempt: now,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: new Date(newLockedUntil),
      };
    }

    return {
      allowed: true,
      remainingAttempts: EMERGENCY_ACCESS_LIMIT - attempt.attempts,
      lockedUntil: null,
    };
  }

  /**
   * تسجيل محاولة فاشلة
   */
  static recordFailedAttempt(email: string): void {
    const now = Date.now();
    const current = loginAttempts.get(email);

    if (!current) {
      loginAttempts.set(email, {
        email,
        attempts: 1,
        lastAttempt: now,
        lockedUntil: null,
      });
    } else {
      loginAttempts.set(email, {
        ...current,
        attempts: current.attempts + 1,
        lastAttempt: now,
      });
    }
  }

  /**
   * مسح محاولات تسجيل الدخول الناجحة
   */
  static clearAttempts(email: string): void {
    loginAttempts.delete(email);
  }

  /**
   * تسجيل دخول المستخدم الطارئ
   */
  static async loginEmergencyUser(email: string, password: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      userId: string;
      email: string;
      name: string;
      role: string;
      accessToken: string;
      refreshToken: string;
    };
  }> {
    try {
      // التحقق من حد المحاولات
      const rateLimit = this.checkRateLimit(email);
      if (!rateLimit.allowed) {
        console.warn(`⚠️ [EMERGENCY] محاولات تسجيل دخول زائدة للبريد: ${email}`);
        return {
          success: false,
          message: `تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد ${Math.ceil((rateLimit.lockedUntil!.getTime() - Date.now()) / 60000)} دقيقة`,
        };
      }

      // البحث عن المستخدم الطارئ في قاعدة البيانات
      let user;
      try {
        const result = await db
          .select()
          .from(emergencyUsers)
          .where(eq(emergencyUsers.email, email));
        user = result[0];
      } catch (dbError: any) {
        console.error('❌ [EMERGENCY] فشل الوصول إلى جدول المستخدمين الطارئين:', dbError.message);
        // في حالة الفشل الكامل، اسمح فقط بالمسؤول الطارئ
        const adminCreds = this.getEmergencyAdminCredentials();
        if (
          adminCreds &&
          adminCreds.email.toLowerCase() === email.toLowerCase()
        ) {
          // تحقق من كلمة المرور
          if (adminCreds.password === password) {
            this.clearAttempts(email);
            const token = generateAccessToken({
              userId: 'emergency-admin',
              email: adminCreds.email,
              role: 'admin',
            });

            const refreshToken = await generateRefreshToken({
              userId: 'emergency-admin',
              email: adminCreds.email,
              role: 'admin',
            });

            console.log('✅ [EMERGENCY] تم تسجيل دخول المسؤول الطارئ بنجاح');
            return {
              success: true,
              message: 'تم تسجيل الدخول بنجاح (وضع الطوارئ)',
              data: {
                userId: 'emergency-admin',
                email: adminCreds.email,
                name: 'Administrator (Emergency Mode)',
                role: 'admin',
                accessToken: token,
                refreshToken,
              },
            };
          } else {
            this.recordFailedAttempt(email);
            return {
              success: false,
              message: 'بيانات تسجيل الدخول غير صحيحة',
            };
          }
        }

        return {
          success: false,
          message: 'فشل التحقق من بيانات الاعتماد في وضع الطوارئ',
        };
      }

      if (!user) {
        this.recordFailedAttempt(email);
        console.warn(`⚠️ [EMERGENCY] محاولة تسجيل دخول من مستخدم غير موجود: ${email}`);
        return {
          success: false,
          message: 'بيانات تسجيل الدخول غير صحيحة',
        };
      }

      // التحقق من كلمة المرور
      const passwordMatch = await verifyPassword(password, String(user.password));
      if (!passwordMatch) {
        this.recordFailedAttempt(email);
        console.warn(`⚠️ [EMERGENCY] محاولة تسجيل دخول برمز خاطئ: ${email}`);
        return {
          success: false,
          message: 'بيانات تسجيل الدخول غير صحيحة',
        };
      }

      // مسح المحاولات الناجحة
      this.clearAttempts(email);

      // إنشاء رموز الوصول
      const accessToken = generateAccessToken({
        userId: String(user.id),
        email: String(user.email),
        role: String(user.role),
      });

      const refreshToken = await generateRefreshToken({
        userId: String(user.id),
        email: String(user.email),
        role: String(user.role),
      });

      console.log('✅ [EMERGENCY] تم تسجيل دخول المستخدم الطارئ بنجاح:', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح (وضع الطوارئ)',
        data: {
          userId: String(user.id),
          email: String(user.email),
          name: String(user.name),
          role: String(user.role),
          accessToken,
          refreshToken,
        },
      };
    } catch (error: any) {
      console.error('❌ [EMERGENCY] خطأ في تسجيل الدخول الطارئ:', error);
      return {
        success: false,
        message: 'خطأ في نظام الطوارئ',
      };
    }
  }

  /**
   * إضافة مستخدم طارئ جديد (للمسؤولين فقط)
   */
  static async createEmergencyUser(params: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const { email, password, name, role = 'admin' } = params;

      // التحقق من صحة البيانات
      if (!email || !password || !name) {
        return {
          success: false,
          message: 'البريد والكلمة والاسم مطلوبان',
        };
      }

      // التحقق من عدم وجود المستخدم مسبقاً
      const existing = await db
        .select()
        .from(emergencyUsers)
        .where(eq(emergencyUsers.email, email));

      if (existing.length > 0) {
        return {
          success: false,
          message: 'المستخدم موجود بالفعل',
        };
      }

      // تشفير كلمة المرور
      const hashedPassword = await hashPassword(password);

      // إنشاء المستخدم
      const result = await db
        .insert(emergencyUsers)
        .values({
          id: `emergency_${Date.now()}`,
          email,
          password: hashedPassword,
          name,
          role,
          createdAt: new Date(),
        })
        .returning();

      console.log('✅ [EMERGENCY] تم إنشاء مستخدم طارئ جديد:', {
        id: result[0]?.id,
        email,
        name,
        role,
      });

      return {
        success: true,
        message: 'تم إنشاء المستخدم الطارئ بنجاح',
        data: {
          id: result[0]?.id,
          email,
          name,
          role,
        },
      };
    } catch (error: any) {
      console.error('❌ [EMERGENCY] خطأ في إنشاء مستخدم طارئ:', error);
      return {
        success: false,
        message: 'فشل في إنشاء المستخدم الطارئ',
      };
    }
  }

  /**
   * الحصول على معلومات مستخدم طارئ
   */
  static async getEmergencyUser(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
  } | null> {
    try {
      const result = await db
        .select()
        .from(emergencyUsers)
        .where(eq(emergencyUsers.id, userId));

      return result[0] || null;
    } catch (error: any) {
      console.error('❌ [EMERGENCY] خطأ في جلب معلومات المستخدم:', error);
      return null;
    }
  }
}

export default EmergencyAuthService;
