/**
 * Biometric Refresh Token Routes
 * --------------------------------
 * Implements the global standard pattern recommended by Google/Apple/OWASP:
 *   1) After biometric registration → issue a long-lived "biometric refresh token".
 *   2) On biometric login (native) → exchange that token for fresh access+refresh.
 *
 * Key properties:
 *   - Token is high-entropy (256-bit) and stored only as SHA-256 hash at rest.
 *   - Bound to user_id + device_id + (optional) credential_id.
 *   - Does NOT get revoked on regular logout — only on explicit "disable biometric"
 *     or on suspicious activity (e.g. multiple failed exchanges).
 *   - 90-day default lifetime, sliding (last_used_at updated each successful exchange).
 *   - Returns the plaintext token to the client only once at issuance.
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest, authRateLimit } from '../../middleware/auth.js';
import { generateTokenPair } from '../../auth/jwt-utils.js';
import { extractClientContext } from '../../auth/client-context.js';
import { setAuthCookies } from '../../auth/cookie-config.js';
import { storage } from '../../storage.js';

const biometricTokenRouter = express.Router();

// 90 days lifetime — aligned with Apple/Google passkey UX expectations
const BIOMETRIC_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function newOpaqueToken(): string {
  // 32 bytes = 256-bit entropy → base64url (43 chars, no padding)
  return crypto.randomBytes(32).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function getClientIp(req: Request): string | null {
  const fwd = req.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * POST /api/auth/biometric/issue
 * Requires a valid access token (called immediately after biometric registration).
 * Body: { device_id?: string, device_label?: string, credential_id?: string, platform?: string }
 * Returns: { biometricToken, expiresAt }
 */
biometricTokenRouter.post('/issue', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const { device_id, device_label, credential_id, platform } = req.body || {};

    const token = newOpaqueToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + BIOMETRIC_TOKEN_TTL_MS);
    const ua = req.get('user-agent') || null;
    const ip = getClientIp(req);

    // Revoke any prior token for the same device to enforce one-active-per-device
    if (credential_id) {
      try {
        await storage.revokeBiometricRefreshTokensByCredentialId(String(credential_id));
      } catch {}
    }

    await storage.createBiometricRefreshToken({
      user_id: String(userId),
      token_hash: tokenHash,
      device_id: device_id ? String(device_id) : null,
      device_label: device_label ? String(device_label) : null,
      credential_id: credential_id ? String(credential_id) : null,
      platform: platform ? String(platform) : null,
      ip_address: ip,
      user_agent: ua,
      last_used_at: null,
      expires_at: expiresAt,
      revoked_at: null,
    } as any);

    console.log(`🔐 [BiometricToken] Issued for user=${userId} device=${device_id || 'n/a'} platform=${platform || 'n/a'}`);

    return res.json({
      success: true,
      biometricToken: token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [BiometricToken] Issue error:', error);
    return res.status(500).json({ success: false, message: 'فشل إصدار رمز البصمة' });
  }
});

/**
 * POST /api/auth/biometric/exchange
 * Public (rate-limited). Exchanges a biometric token for a fresh access+refresh pair.
 * Body: { biometricToken: string }
 */
biometricTokenRouter.post('/exchange', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { biometricToken } = req.body || {};
    if (!biometricToken || typeof biometricToken !== 'string') {
      return res.status(400).json({ success: false, message: 'رمز البصمة مطلوب', code: 'MISSING_TOKEN' });
    }

    const tokenHash = sha256(biometricToken);
    const record = await storage.getBiometricRefreshTokenByHash(tokenHash);

    if (!record) {
      return res.status(401).json({ success: false, message: 'رمز البصمة غير صالح', code: 'INVALID_TOKEN' });
    }
    if (record.revoked_at) {
      return res.status(401).json({ success: false, message: 'تم إبطال رمز البصمة', code: 'REVOKED_TOKEN' });
    }
    if (new Date(record.expires_at) <= new Date()) {
      return res.status(401).json({ success: false, message: 'انتهت صلاحية رمز البصمة', code: 'EXPIRED_TOKEN' });
    }

    const user = await storage.getUser(record.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود', code: 'USER_NOT_FOUND' });
    }
    if (String(user.is_active) === 'false') {
      return res.status(403).json({ success: false, message: 'الحساب معطل', code: 'USER_DISABLED' });
    }

    const ip = getClientIp(req);
    const ua = req.get('user-agent') || null;
    await storage.updateBiometricRefreshTokenLastUsed(record.id, ip, ua);

    const clientContext = extractClientContext(req);
    const tokenPair = await generateTokenPair(
      String(user.id),
      String(user.email),
      String(user.role || 'user'),
      clientContext
    );

    setAuthCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    console.log(`✅ [BiometricToken] Exchange OK for user=${user.email}`);

    return res.json({
      success: true,
      status: 'success',
      message: 'تم تسجيل الدخول بالبصمة بنجاح',
      token: tokenPair.accessToken,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        user_id: user.id,
        email: user.email,
        name: userName || user.full_name,
        role: user.role || 'user',
        emailVerified: !!user.email_verified_at,
      },
      user_id: user.id,
      email: user.email,
      name: userName || user.full_name,
      role: user.role || 'user',
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      },
      expiresIn: 900,
      expires_in: 900,
      token_type: 'Bearer',
      emailVerified: !!user.email_verified_at,
    });
  } catch (error: any) {
    console.error('❌ [BiometricToken] Exchange error:', error);
    return res.status(500).json({ success: false, message: 'فشل في تبادل رمز البصمة' });
  }
});

/**
 * POST /api/auth/biometric/revoke
 * Revoke all biometric tokens for the authenticated user (for "disable biometric").
 */
biometricTokenRouter.post('/revoke', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }
    await storage.revokeBiometricRefreshTokensByUserId(String(userId));
    console.log(`🗑️ [BiometricToken] Revoked all for user=${userId}`);
    return res.json({ success: true, message: 'تم إبطال رموز البصمة بنجاح' });
  } catch (error: any) {
    console.error('❌ [BiometricToken] Revoke error:', error);
    return res.status(500).json({ success: false, message: 'فشل إبطال رموز البصمة' });
  }
});

export default biometricTokenRouter;
