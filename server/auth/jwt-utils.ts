/**
 * نظام JWT وإدارة الرموز المتقدم
 * يدعم Access Tokens, Refresh Tokens, وإدارة الجلسات
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and, lt, or, ne, gte } from 'drizzle-orm';
import { db } from '../db.js';
import { users, authUserSessions } from '../../shared/schema.js';
import { hashToken } from './crypto-utils.js';
import type { ClientContext } from './client-context.js';

// ملاحظة: تم تفعيل نظام الجلسات مع جدول authUserSessions

const isProduction = process.env.NODE_ENV === 'production' && !process.env.REPLIT_ID;

function getRequiredSecret(envVar: string, name: string): string {
  const value = process.env[envVar];
  if (value) return value;

  if (isProduction) {
    console.error(`FATAL: ${envVar} environment variable is required in production`);
    process.exit(1);
  }

  console.warn(`[JWT] ${envVar} not set - using development-only fallback for ${name}. DO NOT use in production.`);
  return `dev-only-${name}-fallback-${envVar}-not-set`;
}

const ACCESS_SECRET = getRequiredSecret('JWT_ACCESS_SECRET', 'access-token');
const REFRESH_SECRET = getRequiredSecret('JWT_REFRESH_SECRET', 'refresh-token');

export const JWT_ACCESS_SECRET = ACCESS_SECRET;
export const JWT_REFRESH_SECRET = REFRESH_SECRET;

export const JWT_CONFIG = {
  accessTokenSecret: ACCESS_SECRET,
  refreshTokenSecret: REFRESH_SECRET,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '14d',
  issuer: 'construction-management-app-v2',
  algorithm: 'HS256' as const,
} as const;

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  user_id?: string;
  id?: string;
  sub?: string;
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
    { ...payload, type: 'access' },
    JWT_ACCESS_SECRET,
    { 
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer
    } as jwt.SignOptions
  );
}

/**
 * إنشاء Refresh Token مبسط
 */
export function generateRefreshToken(payload: { userId: string; email: string }): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer
    } as jwt.SignOptions
  );
}

/**
 * إنشاء زوج من الرموز (Access + Refresh) مع حفظ الجلسة
 */
export async function generateTokenPair(
  userId: string,
  email: string,
  role: string,
  clientContext?: ClientContext
): Promise<TokenPair> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  const accessPayload = { userId, email, role, sessionId, type: 'access' as const };
  const refreshPayload = { userId, email, sessionId, type: 'refresh' as const };

  const accessToken = jwt.sign(accessPayload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    issuer: JWT_CONFIG.issuer
  } as jwt.SignOptions);
  
  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    issuer: JWT_CONFIG.issuer
  } as jwt.SignOptions);

  const accessTokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);

  try {
    const sessionData: Record<string, unknown> = {
      user_id: userId,
      sessionToken: sessionId,
      accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      expiresAt: refreshExpiresAt,
      isTrustedDevice: false,
      loginMethod: 'password',
      securityFlags: { status: 'active', createdAt: now.toISOString() },
    };

    if (clientContext) {
      sessionData.deviceId = clientContext.deviceId;
      sessionData.deviceFingerprint = clientContext.deviceHash;
      sessionData.userAgent = clientContext.userAgent;
      sessionData.ipAddress = clientContext.ip;
      sessionData.osName = clientContext.osName;
      sessionData.osVersion = clientContext.osVersion;
      sessionData.browserName = clientContext.browserName;
      sessionData.browserVersion = clientContext.browserVersion;
      sessionData.deviceType = clientContext.deviceType;
      sessionData.securityFlags = {
        platform: clientContext.platform,
        ipRange: clientContext.ipRange,
        appVersion: clientContext.appVersion,
        hasStableDeviceId: clientContext.hasStableDeviceId,
        status: 'active',
        boundAt: now.toISOString(),
      };
    }
    
    try {
      await db.insert(authUserSessions).values(sessionData);
      console.log('✅ [JWT] تم حفظ الجلسة بنجاح في قاعدة البيانات:', { userId, sessionId: sessionId.substring(0, 8) + '...', deviceId: clientContext?.deviceId?.substring(0, 8) });
    } catch (sessionError: unknown) {
      console.error('❌ [JWT] فشل في حفظ الجلسة في DB:', sessionError instanceof Error ? sessionError.message : sessionError);
      const isFlexibleEnv = process.env.NODE_ENV !== 'production' || process.env.REPL_ID !== undefined;
      if (isFlexibleEnv) {
        console.warn('⚠️ [JWT] استمرار العمل في وضع المصادقة المرن رغم فشل حفظ الجلسة');
      } else {
        throw sessionError;
      }
    }
  } catch (error) {
    console.error('❌ [JWT] خطأ في إنشاء التوكينات:', error);
    throw new Error('فشل في إنشاء جلسة المستخدم');
  }

  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresAt,
    refreshExpiresAt,
  };
}

/**
 * التحقق من صحة Access Token مع فحص الجلسة في قاعدة البيانات
 */
export async function verifyAccessToken(token: string): Promise<{ success: boolean; user?: { userId: string; email: string; role: string; sessionId: string } } | null> {
  try {
    // تنظيف التوكن من أي علامات اقتباس أو مسافات زائدة
    let cleanToken = token.trim();
    if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }

    const payload = jwt.verify(cleanToken, JWT_ACCESS_SECRET, {
      issuer: JWT_CONFIG.issuer,
    }) as JWTPayload;

    // التحقق من نوع الرمز
    if (payload.type !== 'access') {
      return null;
    }

    // التحقق من وجود المستخدم في قاعدة البيانات
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length === 0 || user[0].is_active === false) {
      console.log('❌ [JWT] User not found or inactive:', { userId: payload.userId });
      return null;
    }

    // التحقق من صحة الجلسة في قاعدة البيانات
    const tokenHash = hashToken(token);
    const session = await db
      .select()
      .from(authUserSessions)
      .where(
        and(
          eq(authUserSessions.user_id, payload.userId),
          eq(authUserSessions.accessTokenHash, tokenHash),
          eq(authUserSessions.isRevoked, false),
          gte(authUserSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (session.length === 0) {
      // الجلسة غير موجودة أو ملغاة أو منتهية الصلاحية
      return null;
    }

    // تحديث آخر نشاط للجلسة
    await db
      .update(authUserSessions)
      .set({ lastActivity: new Date() })
      .where(eq(authUserSessions.id, session[0].id));

    return {
      success: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        sessionId: session[0].sessionToken
      }
    };
  } catch (error) {
    // تقليل تسجيل الأخطاء الحساسة
    console.error('خطأ في التحقق من Access Token');
    return null;
  }
}

/**
 * التحقق من صحة Refresh Token - نسخة مبسطة
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(p => p.length === 0)) {
      console.warn('⚠️ [JWT] refresh token ليس بصيغة JWT صالحة');
      return null;
    }

    const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: JWT_CONFIG.issuer,
    }) as JWTPayload;

    console.log('🔍 [JWT] فك تشفير refresh token:', { 
      hasUserId: !!payload.userId, 
      hasEmail: !!payload.email,
      hasType: !!payload.type,
      exp: payload.exp,
      iat: payload.iat 
    });

    // التحقق من نوع الرمز للأمان
    if (payload.type && payload.type !== 'refresh') {
      console.log('❌ [JWT] نوع رمز خاطئ:', payload.type);
      return null;
    }

    // إرجاع payload مع التحقق الأساسي
    return payload;

  } catch (error: unknown) {
    console.error('❌ [JWT] خطأ في التحقق من refresh token:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * نافذة السماح للتوكن القديم بعد التدوير (30 ثانية)
 * تمنع فشل الطلبات المتزامنة من نفس الجهاز
 */
const REFRESH_GRACE_WINDOW_MS = 30_000;

/**
 * التحقق من refresh token hash مع دعم نافذة السماح للتوكن السابق
 */
function isValidRefreshHash(session: any, refreshTokenHash: string): boolean {
  if (session.refresh_token_hash === refreshTokenHash) return true;

  const flags = typeof session.securityFlags === 'object' && session.securityFlags !== null
    ? session.securityFlags as Record<string, unknown>
    : {};
  const prevHash = flags.previousRefreshTokenHash as string | undefined;
  const prevValidUntil = flags.previousRefreshTokenValidUntil as string | undefined;

  if (prevHash && prevHash === refreshTokenHash && prevValidUntil) {
    const validUntil = new Date(prevValidUntil).getTime();
    if (Date.now() <= validUntil) {
      console.log('🔄 [JWT] قبول refresh token سابق ضمن نافذة السماح');
      return true;
    }
  }

  return false;
}

/**
 * تجديد Access Token مع الحفاظ على ثبات الجلسة (Stable Session)
 * لا يتم تغيير sessionToken — فقط يتم تدوير access + refresh token hashes
 * يدعم multi-device: كل جهاز له جلسته المستقلة
 */
async function refreshAccessTokenStable(refreshToken: string, clientContext?: ClientContext): Promise<TokenPair | null> {
  const startTime = Date.now();
  const envLabel = isProduction ? 'PROD' : 'DEV';
  console.log(`🔄 [JWT-${envLabel}] بدء تجديد مستقر (Stable Session)...`);

  try {
    let payload: JWTPayload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
        issuer: JWT_CONFIG.issuer,
      }) as JWTPayload;
    } catch (verifyError: unknown) {
      console.warn(`⚠️ [JWT-${envLabel}] فشل التحقق من refresh token: ${verifyError instanceof Error ? verifyError.message : verifyError}`);
      return null;
    }

    if (payload.type && payload.type !== 'refresh') {
      console.log(`❌ [JWT-${envLabel}] نوع رمز خاطئ:`, payload.type);
      return null;
    }

    const userId = payload.userId;
    const sessionId = payload.sessionId;
    if (!userId || !sessionId) {
      console.warn(`⚠️ [JWT-${envLabel}] بيانات ناقصة في payload`);
      return null;
    }

    const refreshTokenHash = hashToken(refreshToken);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || user[0].is_active === false) {
      console.log(`❌ [JWT-${envLabel}] مستخدم غير موجود أو غير نشط`);
      return null;
    }

    const sessionRows = await db
      .select()
      .from(authUserSessions)
      .where(
        and(
          eq(authUserSessions.user_id, userId),
          eq(authUserSessions.sessionToken, sessionId),
          gte(authUserSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    const session = sessionRows.length > 0 ? sessionRows[0] : null;

    if (!session) {
      console.log(`⚠️ [JWT-${envLabel}] لم تُوجد جلسة في قاعدة البيانات للمعرف: ${sessionId.substring(0, 8)}...`);
      return null;
    }

    if (session.isRevoked) {
      console.warn(`🚨 [JWT-${envLabel}] محاولة تجديد جلسة ملغاة — إبطال هذه الجلسة فقط`, {
        userId,
        sessionId: sessionId.substring(0, 8) + '...',
      });
      return null;
    }

    if (session.refresh_token_hash && !isValidRefreshHash(session, refreshTokenHash)) {
      console.warn(`🚨 [JWT-${envLabel}] كشف refresh token غير متطابق — إبطال هذه الجلسة فقط (وليس كل الجلسات)`, {
        userId,
        sessionId: sessionId.substring(0, 8) + '...',
      });
      await revokeToken(sessionId, 'refresh_token_reuse_detected');
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const stableSessionId = sessionId;
    const accessPayload = { userId, email: user[0].email, role: user[0].role, sessionId: stableSessionId, type: 'access' as const };
    const refreshPayload = { userId, email: user[0].email, sessionId: stableSessionId, type: 'refresh' as const };

    const newAccessToken = jwt.sign(accessPayload, JWT_ACCESS_SECRET, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer
    } as jwt.SignOptions);

    const newRefreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer
    } as jwt.SignOptions);

    const newAccessTokenHash = hashToken(newAccessToken);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const previousFlags = typeof session.securityFlags === 'object' && session.securityFlags !== null
      ? session.securityFlags as Record<string, unknown>
      : {};

    const graceDeadline = new Date(now.getTime() + REFRESH_GRACE_WINDOW_MS).toISOString();

    const updateData: Record<string, unknown> = {
      accessTokenHash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      expiresAt: refreshExpiresAt,
      lastActivity: now,
      securityFlags: {
        ...previousFlags,
        status: 'active',
        lastRotatedAt: now.toISOString(),
        previousRefreshTokenHash: session.refresh_token_hash,
        previousRefreshTokenValidUntil: graceDeadline,
      },
    };

    if (clientContext) {
      updateData.ipAddress = clientContext.ip;
      updateData.userAgent = clientContext.userAgent;
    }

    try {
      const updateResult = await db
        .update(authUserSessions)
        .set(updateData)
        .where(
          and(
            eq(authUserSessions.id, session.id),
            eq(authUserSessions.isRevoked, false),
            eq(authUserSessions.refresh_token_hash, session.refresh_token_hash || '')
          )
        );

      if ((updateResult.rowCount || 0) === 0) {
        console.warn(`⚠️ [JWT-${envLabel}] CAS فشل — طلب refresh متزامن سبقه طلب آخر. إعادة المحاولة...`);
        const retrySession = await db
          .select()
          .from(authUserSessions)
          .where(
            and(
              eq(authUserSessions.id, session.id),
              eq(authUserSessions.isRevoked, false)
            )
          )
          .limit(1);

        if (retrySession.length > 0 && isValidRefreshHash(retrySession[0], refreshTokenHash)) {
          console.log(`🔄 [JWT-${envLabel}] التوكن لا يزال ضمن نافذة السماح — إصدار توكنات جديدة بدون تحديث DB`);
          return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            sessionId: stableSessionId,
            expiresAt,
            refreshExpiresAt,
          };
        }

        console.warn(`⚠️ [JWT-${envLabel}] CAS فشل نهائياً — الجلسة تغيرت`);
        return null;
      }
    } catch (updateError) {
      console.warn(`⚠️ [JWT-${envLabel}] تحذير: فشل تحديث الجلسة:`, updateError);
      return null;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [JWT-${envLabel}] تجديد مستقر مكتمل في ${duration}ms:`, {
      userId,
      sessionId: stableSessionId.substring(0, 8) + '... (ثابت)',
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: stableSessionId,
      expiresAt,
      refreshExpiresAt,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [JWT-${envLabel}] خطأ في التجديد بعد ${duration}ms:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * تجديد Access Token — نسخة موحدة ومستقرة لجميع البيئات
 * تحافظ على sessionToken ثابت وتدعم multi-device
 */
export async function refreshAccessToken(refreshToken: string, clientContext?: ClientContext): Promise<TokenPair | null> {
  if ((globalThis as any).isEmergencyMode) {
    return await refreshAccessTokenEmergency(refreshToken);
  }

  return await refreshAccessTokenStable(refreshToken, clientContext);
}

async function refreshAccessTokenEmergency(refreshToken: string): Promise<TokenPair | null> {
  try {
    let payload: JWTPayload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
        issuer: JWT_CONFIG.issuer,
      }) as JWTPayload;
    } catch {
      console.warn('⚠️ [JWT-EMERGENCY] Invalid refresh token');
      return null;
    }

    if (payload.type && payload.type !== 'refresh') return null;

    const userId = payload.userId || payload.user_id || payload.sub || payload.id;
    if (!userId) return null;

    const now = new Date();
    const newSessionId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const newAccessToken = jwt.sign(
      { userId, email: payload.email, role: payload.role || 'admin', sessionId: newSessionId, type: 'access' as const },
      JWT_ACCESS_SECRET,
      { expiresIn: JWT_CONFIG.accessTokenExpiry, issuer: JWT_CONFIG.issuer } as jwt.SignOptions
    );

    const newRefreshToken = jwt.sign(
      { userId, email: payload.email, sessionId: newSessionId, type: 'refresh' as const },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_CONFIG.refreshTokenExpiry, issuer: JWT_CONFIG.issuer } as jwt.SignOptions
    );

    console.log(`✅ [JWT-EMERGENCY] Token refresh completed (no DB) for user: ${userId}`);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, sessionId: newSessionId, expiresAt, refreshExpiresAt };
  } catch (error) {
    console.error('❌ [JWT-EMERGENCY] Refresh failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * إبطال جلسة بناءً على sessionId أو token hash
 */
export async function revokeToken(tokenOrSessionId: string, reason?: string): Promise<boolean> {
  try {
    const revokeData = {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason || 'manual_revoke',
      securityFlags: { status: 'revoked', revokedAt: new Date().toISOString(), reason: reason || 'manual_revoke' },
    };

    let updated = await db
      .update(authUserSessions)
      .set(revokeData)
      .where(eq(authUserSessions.sessionToken, tokenOrSessionId));

    if ((updated.rowCount || 0) === 0) {
      updated = await db
        .update(authUserSessions)
        .set(revokeData)
        .where(
          or(
            eq(authUserSessions.accessTokenHash, tokenOrSessionId),
            eq(authUserSessions.refresh_token_hash, tokenOrSessionId),
            eq(authUserSessions.deviceId, tokenOrSessionId)
          )
        );
    }

    const success = (updated.rowCount || 0) > 0;
    if (success) {
      console.log('✅ [JWT] تم إبطال الجلسة بنجاح:', { 
        sessionId: tokenOrSessionId.length > 32 ? 'token' : tokenOrSessionId.substring(0, 8) + '...',
        reason
      });
    }

    return success;
  } catch (error) {
    console.error('خطأ في إبطال الجلسة');
    return false;
  }
}

/**
 * إبطال جميع جلسات المستخدم
 */
export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  try {
    const conditions = [
      eq(authUserSessions.user_id, userId),
      eq(authUserSessions.isRevoked, false),
    ];

    if (exceptSessionId) {
      conditions.push(ne(authUserSessions.sessionToken, exceptSessionId));
    }

    const updated = await db
      .update(authUserSessions)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'logout_all_devices',
        securityFlags: { status: 'revoked', revokedAt: new Date().toISOString(), reason: 'logout_all_devices' },
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
      issuedAt: authUserSessions.created_at,
      lastUsedAt: authUserSessions.lastActivity,
      expiresAt: authUserSessions.expiresAt,
    })
    .from(authUserSessions)
    .where(
      and(
        eq(authUserSessions.user_id, userId),
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

// تم تصدير JWT_CONFIG في بداية الملف