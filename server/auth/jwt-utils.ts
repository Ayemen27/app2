/**
 * نظام JWT وإدارة الرموز المتقدم
 * يدعم Access Tokens, Refresh Tokens, وإدارة الجلسات
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and, lt, or, ne } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';

// ملاحظة: نظام الجلسات معطل مؤقتاً لعدم وجود authUserSessions table
// سيتم استخدام JWT stateless حتى يتم إنشاء table الجلسات

// إعدادات JWT
const JWT_CONFIG = {
  accessTokenSecret: (process.env.JWT_ACCESS_SECRET || 'construction-app-access-secret-2025') as string,
  refreshTokenSecret: (process.env.JWT_REFRESH_SECRET || 'construction-app-refresh-secret-2025') as string,
  accessTokenExpiry: '15m', // 15 دقيقة
  refreshTokenExpiry: '30d', // 30 يوم
  issuer: 'construction-management-app',
  algorithm: 'HS256' as const,
};

// واجهة بيانات JWT
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
}

// واجهة نتيجة إنشاء الرموز
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * إنشاء Access Token مبسط
 */
export function generateAccessToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(
    payload,
    JWT_CONFIG.accessTokenSecret,
    { 
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer
    }
  );
}

/**
 * إنشاء Refresh Token مبسط
 */
export function generateRefreshToken(payload: { userId: string; email: string }): string {
  return jwt.sign(
    payload,
    JWT_CONFIG.refreshTokenSecret,
    { 
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer
    }
  );
}

/**
 * إنشاء زوج من الرموز (Access + Refresh) - نسخة مبسطة
 */
export async function generateTokenPair(
  userId: string,
  email: string,
  role: string,
  ipAddress?: string,
  userAgent?: string,
  deviceInfo?: any
): Promise<TokenPair> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 دقيقة
  const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 يوم

  // إنشاء Access Token
  const accessToken = generateAccessToken({ userId, email, role });

  // إنشاء Refresh Token
  const refreshToken = generateRefreshToken({ userId, email });

  // ملاحظة: حفظ الجلسة معطل مؤقتاً لعدم وجود authUserSessions table

  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresAt,
    refreshExpiresAt,
  };
}

/**
 * التحقق من صحة Access Token - نسخة مبسطة
 */
export async function verifyAccessToken(token: string): Promise<{ success: boolean; user?: any } | null> {
  try {
    const payload = jwt.verify(token, JWT_CONFIG.accessTokenSecret, {
      issuer: JWT_CONFIG.issuer,
    }) as any;

    // التحقق من وجود المستخدم في قاعدة البيانات
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length === 0 || !user[0].isActive) {
      return null;
    }

    return {
      success: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        sessionId: 'simple-session' // مؤقتاً
      }
    };
  } catch (error) {
    console.error('خطأ في التحقق من Access Token:', error);
    return null;
  }
}

/**
 * التحقق من صحة Refresh Token - نسخة مبسطة
 */
export async function verifyRefreshToken(token: string): Promise<any | null> {
  try {
    const payload = jwt.verify(token, JWT_CONFIG.refreshTokenSecret, {
      issuer: JWT_CONFIG.issuer,
    }) as any;

    // التحقق من وجود المستخدم في قاعدة البيانات
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length === 0 || !user[0].isActive) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('خطأ في التحقق من Refresh Token:', error);
    return null;
  }
}

/**
 * تجديد Access Token باستخدام Refresh Token - نسخة مبسطة
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }

  // الحصول على بيانات المستخدم الحالية
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (user.length === 0 || !user[0].isActive) {
    return null;
  }

  // إنشاء رموز جديدة ببساطة
  return generateTokenPair(
    payload.userId,
    payload.email,
    user[0].role
  );
}

/**
 * إبطال رمز أو جلسة
 */
export async function revokeToken(tokenOrSessionId: string, reason?: string): Promise<boolean> {
  try {
    const updated = await db
      .update(authUserSessions)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason || 'manual_revoke',
      })
      .where(
        or(
          eq(authUserSessions.accessTokenHash, tokenOrSessionId),
          eq(authUserSessions.refreshTokenHash, tokenOrSessionId),
          eq(authUserSessions.deviceId, tokenOrSessionId)
        )
      );

    return (updated.rowCount || 0) > 0;
  } catch (error) {
    console.error('خطأ في إبطال الرمز:', error);
    return false;
  }
}

/**
 * إبطال جميع جلسات المستخدم
 */
export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  try {
    const conditions = [
      eq(authUserSessions.userId, userId),
      eq(authUserSessions.isRevoked, false),
    ];

    if (exceptSessionId) {
      conditions.push(ne(authUserSessions.deviceId, exceptSessionId));
    }

    const updated = await db
      .update(authUserSessions)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'logout_all_devices',
      })
      .where(and(...conditions));

    return updated.rowCount || 0;
  } catch (error) {
    console.error('خطأ في إبطال جلسات المستخدم:', error);
    return 0;
  }
}

/**
 * تنظيف الجلسات المنتهية الصلاحية
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const now = new Date();
    
    const deleted = await db
      .delete(authUserSessions)
      .where(
        lt(authUserSessions.expiresAt, now)
      );

    console.log(`🧹 تم حذف ${deleted.rowCount || 0} جلسة منتهية الصلاحية`);
    return deleted.rowCount || 0;
  } catch (error) {
    console.error('خطأ في تنظيف الجلسات:', error);
    return 0;
  }
}

/**
 * الحصول على جلسات المستخدم النشطة
 */
export async function getUserActiveSessions(userId: string) {
  return db
    .select({
      sessionId: authUserSessions.deviceId,
      ipAddress: authUserSessions.ipAddress,
      userAgent: authUserSessions.browserName,
      deviceInfo: authUserSessions.deviceType,
      issuedAt: authUserSessions.createdAt,
      lastUsedAt: authUserSessions.lastActivity,
      expiresAt: authUserSessions.expiresAt,
    })
    .from(authUserSessions)
    .where(
      and(
        eq(authUserSessions.userId, userId),
        eq(authUserSessions.isRevoked, false)
      )
    )
    .orderBy(authUserSessions.lastActivity);
}

/**
 * فك تشفير رمز بدون التحقق من الصلاحية (للأغراض التشخيصية)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

// تصدير إعدادات JWT للاستخدام في أماكن أخرى
export { JWT_CONFIG };