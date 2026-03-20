/**
 * خدمة المصادقة في وضع الطوارئ
 * Emergency Mode Authentication Service
 * يتعامل مع مصادقة المستخدمين الطارئين عند فشل الاتصال بقاعدة البيانات الرئيسية
 */

import { db, isEmergencyMode, sqliteInstance } from '../db';
import { emergencyUsers } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../auth/crypto-utils';
import { generateTokenPair } from '../auth/jwt-utils';

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
  private static isInEmergencyMode(): boolean {
    return isEmergencyMode || globalThis.isEmergencyMode === true;
  }

  private static querySqliteEmergencyUsers(email?: string, userId?: string): any[] {
    if (!sqliteInstance) return [];
    try {
      sqliteInstance.exec(`
        CREATE TABLE IF NOT EXISTS emergency_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      if (email) {
        return sqliteInstance.prepare('SELECT * FROM emergency_users WHERE LOWER(email) = LOWER(?)').all(email);
      }
      if (userId) {
        return sqliteInstance.prepare('SELECT * FROM emergency_users WHERE id = ?').all(userId);
      }
      return [];
    } catch (err: any) {
      console.error('❌ [EMERGENCY] SQLite query failed:', err.message);
      return [];
    }
  }

  private static tryEnvAdminLogin(email: string, password: string): {
    matched: boolean;
    credentialsValid: boolean;
    adminCreds: { email: string; password: string } | null;
  } {
    const adminCreds = this.getEmergencyAdminCredentials();
    if (!adminCreds || adminCreds.email.toLowerCase() !== email.toLowerCase()) {
      return { matched: false, credentialsValid: false, adminCreds };
    }
    return { matched: true, credentialsValid: adminCreds.password === password, adminCreds };
  }

  private static async buildEnvAdminResponse(adminCreds: { email: string; password: string }): Promise<{
    success: boolean;
    message: string;
    data: {
      user_id: string;
      email: string;
      name: string;
      role: string;
      accessToken: string;
      refreshToken: string;
    };
  }> {
    const tokens = await generateTokenPair(
      'emergency-admin',
      adminCreds.email,
      'admin'
    );
    console.log('✅ [EMERGENCY] تم تسجيل دخول المسؤول الطارئ بنجاح');
    return {
      success: true,
      message: 'تم تسجيل الدخول بنجاح (وضع الطوارئ)',
      data: {
        user_id: 'emergency-admin',
        email: adminCreds.email,
        name: 'Administrator (Emergency Mode)',
        role: 'admin',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  static async loginEmergencyUser(email: string, password: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      user_id: string;
      email: string;
      name: string;
      role: string;
      accessToken: string;
      refreshToken: string;
    };
  }> {
    try {
      const rateLimit = this.checkRateLimit(email);
      if (!rateLimit.allowed) {
        console.warn(`⚠️ [EMERGENCY] محاولات تسجيل دخول زائدة للبريد: ${email}`);
        return {
          success: false,
          message: `تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد ${Math.ceil((rateLimit.lockedUntil!.getTime() - Date.now()) / 60000)} دقيقة`,
        };
      }

      const envLogin = this.tryEnvAdminLogin(email, password);
      if (envLogin.matched) {
        if (envLogin.credentialsValid) {
          this.clearAttempts(email);
          return await this.buildEnvAdminResponse(envLogin.adminCreds!);
        } else {
          this.recordFailedAttempt(email);
          return { success: false, message: 'بيانات تسجيل الدخول غير صحيحة' };
        }
      }

      let user;

      if (this.isInEmergencyMode()) {
        console.log('🔄 [EMERGENCY] Emergency mode active, using SQLite fallback for login');
        const sqliteResults = this.querySqliteEmergencyUsers(email);
        user = sqliteResults[0];
      } else {
        try {
          const result = await db
            .select()
            .from(emergencyUsers)
            .where(eq(emergencyUsers.email, email));
          user = result[0];
        } catch (dbError: any) {
          console.error('❌ [EMERGENCY] فشل الوصول إلى جدول المستخدمين الطارئين:', dbError.message);
          const sqliteResults = this.querySqliteEmergencyUsers(email);
          user = sqliteResults[0];
        }
      }

      if (!user) {
        this.recordFailedAttempt(email);
        console.warn(`⚠️ [EMERGENCY] محاولة تسجيل دخول من مستخدم غير موجود: ${email}`);
        return { success: false, message: 'بيانات تسجيل الدخول غير صحيحة' };
      }

      const passwordMatch = await verifyPassword(password, String(user.password));
      if (!passwordMatch) {
        this.recordFailedAttempt(email);
        console.warn(`⚠️ [EMERGENCY] محاولة تسجيل دخول برمز خاطئ: ${email}`);
        return { success: false, message: 'بيانات تسجيل الدخول غير صحيحة' };
      }

      this.clearAttempts(email);

      const tokens = await generateTokenPair(
        String(user.id),
        String(user.email),
        String(user.role)
      );

      console.log('✅ [EMERGENCY] تم تسجيل دخول المستخدم الطارئ بنجاح:', {
        user_id: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح (وضع الطوارئ)',
        data: {
          user_id: String(user.id),
          email: String(user.email),
          name: String(user.name),
          role: String(user.role),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (error: unknown) {
      console.error('❌ [EMERGENCY] خطأ في تسجيل الدخول الطارئ:', error);
      const envLogin = this.tryEnvAdminLogin(email, password);
      if (envLogin.matched && envLogin.credentialsValid) {
        try {
          this.clearAttempts(email);
          return await this.buildEnvAdminResponse(envLogin.adminCreds!);
        } catch (lastResortError) {
          console.error('❌ [EMERGENCY] Last resort env admin login also failed:', lastResortError);
        }
      }
      return { success: false, message: 'خطأ في نظام الطوارئ' };
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

      if (!email || !password || !name) {
        return { success: false, message: 'البريد والكلمة والاسم مطلوبان' };
      }

      const hashedPassword = await hashPassword(password);
      const newId = `emergency-${Date.now()}`;

      if (this.isInEmergencyMode()) {
        console.log('🔄 [EMERGENCY] Emergency mode active, using SQLite for createEmergencyUser');
        if (!sqliteInstance) {
          return { success: false, message: 'SQLite غير متاح في وضع الطوارئ' };
        }
        try {
          sqliteInstance.exec(`
            CREATE TABLE IF NOT EXISTS emergency_users (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL UNIQUE,
              password TEXT NOT NULL,
              name TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'admin',
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `);
          const existing = sqliteInstance.prepare('SELECT id FROM emergency_users WHERE LOWER(email) = LOWER(?)').all(email);
          if (existing.length > 0) {
            return { success: false, message: 'المستخدم موجود بالفعل' };
          }
          sqliteInstance.prepare('INSERT INTO emergency_users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(newId, email, hashedPassword, name, role);
          console.log('✅ [EMERGENCY] تم إنشاء مستخدم طارئ جديد في SQLite:', { id: newId, email, name, role });
          return { success: true, message: 'تم إنشاء المستخدم الطارئ بنجاح', data: { id: newId, email, name, role } };
        } catch (sqliteErr: any) {
          console.error('❌ [EMERGENCY] SQLite create failed:', sqliteErr.message);
          return { success: false, message: 'فشل في إنشاء المستخدم الطارئ' };
        }
      }

      const existing = await db
        .select()
        .from(emergencyUsers)
        .where(eq(emergencyUsers.email, email));

      if (existing.length > 0) {
        return { success: false, message: 'المستخدم موجود بالفعل' };
      }

      const result = await db
        .insert(emergencyUsers)
        .values({
          id: newId,
          email,
          password: hashedPassword,
          name,
          role,
          created_at: new Date(),
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
        data: { id: result[0]?.id, email, name, role },
      };
    } catch (error: unknown) {
      console.error('❌ [EMERGENCY] خطأ في إنشاء مستخدم طارئ:', error);
      return { success: false, message: 'فشل في إنشاء المستخدم الطارئ' };
    }
  }

  /**
   * الحصول على معلومات مستخدم طارئ
   */
  static async getEmergencyUser(user_id: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: Date;
  } | null> {
    if (user_id === 'emergency-admin') {
      const adminCreds = this.getEmergencyAdminCredentials();
      if (adminCreds) {
        return {
          id: 'emergency-admin',
          email: adminCreds.email,
          name: 'Administrator (Emergency Mode)',
          role: 'admin',
          created_at: new Date(),
        };
      }
    }

    if (this.isInEmergencyMode()) {
      console.log('🔄 [EMERGENCY] Emergency mode active, using SQLite for getEmergencyUser');
      const sqliteResults = this.querySqliteEmergencyUsers(undefined, user_id);
      if (sqliteResults.length > 0) {
        const u = sqliteResults[0];
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          created_at: new Date(u.created_at || Date.now()),
        };
      }
      return null;
    }

    try {
      const result = await db
        .select()
        .from(emergencyUsers)
        .where(eq(emergencyUsers.id, user_id));

      return result[0] || null;
    } catch (error: unknown) {
      console.error('❌ [EMERGENCY] خطأ في جلب معلومات المستخدم:', error);
      const sqliteResults = this.querySqliteEmergencyUsers(undefined, user_id);
      if (sqliteResults.length > 0) {
        const u = sqliteResults[0];
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          created_at: new Date(u.created_at || Date.now()),
        };
      }
      return null;
    }
  }
}

export default EmergencyAuthService;
