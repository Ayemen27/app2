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
  refreshTokenExpiry: '7d',
  issuer: 'construction-management-app-v2',
  algorithm: 'HS256' as const,
};

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
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

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
 * تجديد Access Token باستخدام Refresh Token مع تدوير الرموز
 */
/**
 * تجديد Access Token للتطوير مع تدوير كامل للرموز وكشف إعادة الاستخدام
 */
async function refreshAccessTokenDev(refreshToken: string, clientContext?: ClientContext): Promise<TokenPair | null> {
  const startTime = Date.now();
  console.log('🔄 [JWT-DEV] بدء تجديد مع تدوير كامل...');

  try {
    let payload: JWTPayload | null;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
        issuer: JWT_CONFIG.issuer,
      }) as JWTPayload;
    } catch (verifyError: unknown) {
      console.warn(`⚠️ [JWT-DEV] فشل التحقق من refresh token: ${verifyError instanceof Error ? verifyError.message : verifyError}`);
      return null;
    }

    console.log('🔄 [JWT-DEV] Payload processing:', { userId: payload.userId, type: payload.type });

    if (payload.type && payload.type !== 'refresh') {
      console.log('❌ [JWT-DEV] نوع رمز خاطئ:', payload.type);
      return null;
    }

    const refreshTokenHash = hashToken(refreshToken);

    const userWithSession = await db
      .select({
        user: users,
        session: authUserSessions
      })
      .from(users)
      .leftJoin(authUserSessions, and(
          eq(authUserSessions.user_id, users.id),
        eq(authUserSessions.sessionToken, payload.sessionId),
        gte(authUserSessions.expiresAt, new Date())
      ))
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (userWithSession.length === 0 || !userWithSession[0].user || userWithSession[0].user.is_active === false) {
      console.log('❌ [JWT-DEV] مستخدم غير موجود أو غير نشط');
      return null;
    }

    const user = userWithSession[0].user;
    const session = userWithSession[0].session;

    if (session) {
      if (session.isRevoked) {
        console.warn('🚨 [JWT-DEV] كشف إعادة استخدام refresh token لجلسة ملغاة! إبطال جميع جلسات المستخدم:', {
          userId: payload.userId,
          sessionId: payload.sessionId?.substring(0, 8) + '...',
        });
        await revokeAllUserSessions(payload.userId);
        return null;
      }

      if (session.refresh_token_hash && session.refresh_token_hash !== refreshTokenHash) {
        console.warn('🚨 [JWT-DEV] كشف إعادة استخدام refresh token قديم! إبطال جميع جلسات المستخدم:', {
          userId: payload.userId,
          sessionId: payload.sessionId?.substring(0, 8) + '...',
        });
        await revokeAllUserSessions(payload.userId);
        return null;
      }
    }

    if (!session) {
      console.log('⚠️ [JWT-DEV] لم تُوجد جلسة في قاعدة البيانات - استمرار التجديد بدون تحديث الجلسة');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const newSessionId = crypto.randomUUID();
    const accessPayload = { userId: payload.userId, email: user.email, role: user.role, sessionId: newSessionId, type: 'access' as const };
    const refreshPayload = { userId: payload.userId, email: user.email, sessionId: newSessionId, type: 'refresh' as const };

    const newAccessToken = jwt.sign(accessPayload, JWT_ACCESS_SECRET, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer
    } as jwt.SignOptions);
    
    const newRefreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer
    } as jwt.SignOptions);

    if (session) {
      const newAccessTokenHash = hashToken(newAccessToken);
      const newRefreshTokenHash = hashToken(newRefreshToken);
      const updateData: Record<string, unknown> = {
        sessionToken: newSessionId,
        accessTokenHash: newAccessTokenHash,
        refresh_token_hash: newRefreshTokenHash,
        expiresAt: refreshExpiresAt,
        lastActivity: now,
        securityFlags: {
          ...(typeof session.securityFlags === 'object' && session.securityFlags !== null ? session.securityFlags : {}),
          status: 'active',
          lastRotatedAt: now.toISOString(),
          previousSessionId: payload.sessionId,
        },
      };

      if (clientContext) {
        updateData.ipAddress = clientContext.ip;
        updateData.userAgent = clientContext.userAgent;
      }

      try {
        await db
          .update(authUserSessions)
          .set(updateData)
          .where(eq(authUserSessions.id, session.id));
      } catch (updateError) {
        console.warn('⚠️ [JWT-DEV] تحذير: فشل تحديث الجلسة (لكن سيتم الاستمرار):', updateError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [JWT-DEV] تدوير كامل مكتمل في ${duration}ms:`, {
      userId: payload.userId,
      oldSessionId: payload.sessionId?.substring(0, 8) + '...',
      newSessionId: newSessionId.substring(0, 8) + '...',
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: newSessionId,
      expiresAt,
      refreshExpiresAt,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [JWT-DEV] خطأ في التجديد بعد ${duration}ms:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * تجديد Access Token باستخدام Refresh Token (النسخة الكاملة للإنتاج مع كشف إعادة الاستخدام)
 */
async function refreshAccessTokenProd(refreshToken: string, clientContext?: ClientContext): Promise<TokenPair | null> {
  const startTime = Date.now();
  console.log('🔄 [JWT-PROD] بدء تجديد كامل للإنتاج...');

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
      issuer: JWT_CONFIG.issuer,
    }) as JWTPayload;

    if (payload.type !== 'refresh') {
      return null;
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length === 0 || user[0].is_active === false) {
      console.log('❌ [JWT-PROD] User not found or inactive:', { userId: payload.userId });
      return null;
    }

    const refreshTokenHash = hashToken(refreshToken);

    const sessionByHash = await db
      .select()
      .from(authUserSessions)
      .where(
        and(
          eq(authUserSessions.user_id, payload.userId),
          eq(authUserSessions.refresh_token_hash, refreshTokenHash),
          eq(authUserSessions.isRevoked, false),
          gte(authUserSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (sessionByHash.length === 0) {
      const revokedSession = await db
        .select()
        .from(authUserSessions)
        .where(
          and(
            eq(authUserSessions.user_id, payload.userId),
            eq(authUserSessions.sessionToken, payload.sessionId)
          )
        )
        .limit(1);

      if (revokedSession.length > 0 && (revokedSession[0].isRevoked || revokedSession[0].refresh_token_hash !== refreshTokenHash)) {
        console.warn('🚨 [JWT-PROD] كشف إعادة استخدام refresh token! إبطال جميع جلسات المستخدم:', {
          userId: payload.userId,
          sessionId: payload.sessionId?.substring(0, 8) + '...',
          wasRevoked: revokedSession[0].isRevoked,
          hashMismatch: revokedSession[0].refresh_token_hash !== refreshTokenHash,
        });
        await revokeAllUserSessions(payload.userId);
      }

      return null;
    }

    const session = sessionByHash[0];

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const newSessionId = crypto.randomUUID();
    const accessPayload = { userId: payload.userId, email: user[0].email, role: user[0].role, sessionId: newSessionId, type: 'access' as const };
    const refreshPayload = { userId: payload.userId, email: user[0].email, sessionId: newSessionId, type: 'refresh' as const };

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

    const updateData: Record<string, unknown> = {
      sessionToken: newSessionId,
      accessTokenHash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      expiresAt: refreshExpiresAt,
      lastActivity: now,
      securityFlags: {
        ...(typeof session.securityFlags === 'object' && session.securityFlags !== null ? session.securityFlags : {}),
        status: 'active',
        lastRotatedAt: now.toISOString(),
        previousSessionId: session.sessionToken,
      },
    };

    if (clientContext) {
      updateData.ipAddress = clientContext.ip;
      updateData.userAgent = clientContext.userAgent;
    }

    await db
      .update(authUserSessions)
      .set(updateData)
      .where(eq(authUserSessions.id, session.id));

    const duration = Date.now() - startTime;
    console.log(`✅ [JWT-PROD] تم تدوير الرموز بنجاح في ${duration}ms:`, { 
      userId: payload.userId, 
      oldSessionId: session.sessionToken?.substring(0, 8) + '...',
      newSessionId: newSessionId.substring(0, 8) + '...'
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: newSessionId,
      expiresAt,
      refreshExpiresAt,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [JWT-PROD] خطأ في تجديد الرمز بعد ${duration}ms`);
    return null;
  }
}

/**
 * تجديد Access Token - يختار النسخة المناسبة حسب البيئة
 */
export async function refreshAccessToken(refreshToken: string, clientContext?: ClientContext): Promise<TokenPair | null> {
  if ((globalThis as any).isEmergencyMode) {
    return await refreshAccessTokenEmergency(refreshToken);
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return await refreshAccessTokenDev(refreshToken, clientContext);
  } else {
    return await refreshAccessTokenProd(refreshToken, clientContext);
  }
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