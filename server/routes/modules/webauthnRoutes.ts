import express from 'express';
import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { requireAuth, AuthenticatedRequest, authRateLimit } from '../../middleware/auth.js';
import { generateTokenPair } from '../../auth/jwt-utils.js';
import { storage } from '../../storage.js';
import { db } from '../../db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const webauthnRouter = express.Router();

const RP_NAME = 'AXION';

const CONFIGURED_RP_ID = process.env.WEBAUTHN_RP_ID || '';
const CONFIGURED_ORIGIN = process.env.WEBAUTHN_ORIGIN || '';

function getRpId(req: Request): string {
  if (CONFIGURED_RP_ID) return CONFIGURED_RP_ID;
  const host = req.get('host') || 'localhost';
  return host.split(':')[0];
}

function getOrigin(req: Request): string {
  if (CONFIGURED_ORIGIN) return CONFIGURED_ORIGIN;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host') || 'localhost';
  return `${protocol}://${host}`;
}

function base64urlEncode(buffer: Buffer | Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

function normalizeBase64url(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

webauthnRouter.post('/register/options', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const existingCredentials = await storage.getWebAuthnCredentialsByUserId(userId);

    const rpId = getRpId(req);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userName: userEmail,
      userDisplayName: req.user?.first_name
        ? `${req.user.first_name} ${req.user.last_name || ''}`.trim()
        : userEmail,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credential_id,
        type: 'public-key' as const,
        transports: (cred.transports as any[]) || [],
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
      timeout: 60000,
    });

    const challengeStr = typeof options.challenge === 'string'
      ? normalizeBase64url(options.challenge)
      : base64urlEncode(Buffer.from(options.challenge));

    await storage.createWebAuthnChallenge({
      user_id: userId,
      challenge: challengeStr,
      type: 'register',
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log(`🔐 [WebAuthn] Registration options generated for user: ${userEmail}`);

    res.json({
      success: true,
      options,
    });
  } catch (error: any) {
    console.error('❌ [WebAuthn] Error generating registration options:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خيارات التسجيل',
      error: error.message,
    });
  }
});

webauthnRouter.post('/register/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const { credential, deviceLabel } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'بيانات الاعتماد مطلوبة' });
    }

    const clientDataRaw = credential.response?.clientDataJSON;
    if (!clientDataRaw) {
      return res.status(400).json({ success: false, message: 'بيانات العميل مفقودة' });
    }

    const clientDataStr = Buffer.from(base64urlDecode(clientDataRaw)).toString('utf-8');
    const clientData = JSON.parse(clientDataStr);
    const challengeStr = normalizeBase64url(clientData.challenge);

    if (!challengeStr) {
      return res.status(400).json({ success: false, message: 'التحدي غير موجود في البيانات' });
    }

    const storedChallenge = await storage.getWebAuthnChallenge(challengeStr);

    if (!storedChallenge) {
      return res.status(400).json({ success: false, message: 'التحدي غير صالح أو منتهي الصلاحية' });
    }

    if (storedChallenge.type !== 'register') {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'نوع التحدي غير صحيح' });
    }

    if (storedChallenge.user_id !== userId) {
      return res.status(400).json({ success: false, message: 'التحدي لا يتطابق مع المستخدم' });
    }

    if (new Date() > new Date(storedChallenge.expires_at)) {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'انتهت صلاحية التحدي' });
    }

    const rpId = getRpId(req);
    const origin = getOrigin(req);

    const verification = await verifyRegistrationResponse({
      response: credential as RegistrationResponseJSON,
      expectedChallenge: challengeStr,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'فشل التحقق من بيانات الاعتماد' });
    }

    const { credential: registrationCredential, credentialDeviceType } = verification.registrationInfo;

    const credentialIdStr = typeof registrationCredential.id === 'string'
      ? normalizeBase64url(registrationCredential.id)
      : base64urlEncode(Buffer.from(registrationCredential.id));
    const publicKeyStr = base64urlEncode(Buffer.from(registrationCredential.publicKey));

    await storage.createWebAuthnCredential({
      user_id: userId,
      credential_id: credentialIdStr,
      public_key: publicKeyStr,
      counter: registrationCredential.counter,
      transports: (credential.response?.transports as string[]) || null,
      device_label: deviceLabel || `جهاز ${credentialDeviceType || 'غير معروف'}`,
    });

    await storage.deleteWebAuthnChallenge(challengeStr);

    console.log(`✅ [WebAuthn] Credential registered successfully for user: ${userEmail}`);

    res.json({
      success: true,
      message: 'تم تسجيل البصمة بنجاح',
    });
  } catch (error: any) {
    console.error('❌ [WebAuthn] Error verifying registration:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من التسجيل',
      error: error.message,
    });
  }
});

webauthnRouter.post('/login/options', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const rpId = getRpId(req);

    let allowCredentials: any[] = [];

    if (email) {
      const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (userResult.length > 0) {
        const userCredentials = await storage.getWebAuthnCredentialsByUserId(userResult[0].id);
        allowCredentials = userCredentials.map((cred) => ({
          id: cred.credential_id,
          type: 'public-key' as const,
          transports: (cred.transports as string[]) || [],
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
    });

    const challengeStr = typeof options.challenge === 'string'
      ? normalizeBase64url(options.challenge)
      : base64urlEncode(Buffer.from(options.challenge));

    const userResult = email
      ? await db.select().from(users).where(eq(users.email, email)).limit(1)
      : [];

    await storage.createWebAuthnChallenge({
      user_id: userResult.length > 0 ? userResult[0].id : null,
      challenge: challengeStr,
      type: 'login',
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log(`🔐 [WebAuthn] Authentication options generated${email ? ` for: ${email}` : ''}`);

    res.json({
      success: true,
      options,
    });
  } catch (error: any) {
    console.error('❌ [WebAuthn] Error generating authentication options:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خيارات المصادقة',
      error: error.message,
    });
  }
});

webauthnRouter.post('/login/verify', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'بيانات الاعتماد مطلوبة' });
    }

    const clientDataRaw = credential.response?.clientDataJSON;
    if (!clientDataRaw) {
      return res.status(400).json({ success: false, message: 'بيانات العميل مفقودة' });
    }

    const clientDataStr = Buffer.from(base64urlDecode(clientDataRaw)).toString('utf-8');
    const clientData = JSON.parse(clientDataStr);
    const challengeStr = normalizeBase64url(clientData.challenge);

    if (!challengeStr) {
      return res.status(400).json({ success: false, message: 'التحدي غير موجود في البيانات' });
    }

    const storedChallenge = await storage.getWebAuthnChallenge(challengeStr);

    if (!storedChallenge) {
      return res.status(400).json({ success: false, message: 'التحدي غير صالح أو منتهي الصلاحية' });
    }

    if (storedChallenge.type !== 'login') {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'نوع التحدي غير صحيح' });
    }

    if (new Date() > new Date(storedChallenge.expires_at)) {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'انتهت صلاحية التحدي' });
    }

    const credentialIdFromAssertion = normalizeBase64url(credential.id || credential.rawId || '');
    if (!credentialIdFromAssertion) {
      return res.status(400).json({ success: false, message: 'معرف الاعتماد مفقود' });
    }

    const storedCredential = await storage.getWebAuthnCredentialByCredentialId(credentialIdFromAssertion);

    if (!storedCredential) {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'بيانات الاعتماد غير مسجلة' });
    }

    if (storedChallenge.user_id && storedChallenge.user_id !== storedCredential.user_id) {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'بيانات الاعتماد لا تتطابق مع المستخدم' });
    }

    const rpId = getRpId(req);
    const origin = getOrigin(req);

    const verification = await verifyAuthenticationResponse({
      response: credential as AuthenticationResponseJSON,
      expectedChallenge: challengeStr,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
      credential: {
        id: storedCredential.credential_id,
        publicKey: base64urlDecode(storedCredential.public_key),
        counter: storedCredential.counter,
        transports: (storedCredential.transports as any[]) || [],
      },
    });

    if (!verification.verified) {
      await storage.deleteWebAuthnChallenge(challengeStr);
      return res.status(400).json({ success: false, message: 'فشل التحقق من المصادقة' });
    }

    await storage.updateWebAuthnCredentialCounter(
      storedCredential.credential_id,
      verification.authenticationInfo.newCounter
    );

    await storage.deleteWebAuthnChallenge(challengeStr);

    const user = await storage.getUser(storedCredential.user_id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (user.is_active === 'false' || user.is_active === false) {
      return res.status(403).json({ success: false, message: 'الحساب معطل' });
    }

    const tokenPair = await generateTokenPair(
      String(user.id),
      String(user.email),
      String(user.role || 'user'),
      req.ip,
      req.get('user-agent'),
      { deviceId: 'biometric-login' }
    );

    res.cookie('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    console.log(`✅ [WebAuthn] Biometric login successful for user: ${user.email}`);

    res.json({
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
      data: {
        token: tokenPair.accessToken,
        accessToken: tokenPair.accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: userName || user.full_name,
          role: user.role || 'user',
          emailVerified: !!user.email_verified_at,
        },
        triggerSync: true,
        initialSyncDelay: 1000,
      },
    });
  } catch (error: any) {
    console.error('❌ [WebAuthn] Error verifying authentication:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة',
      error: error.message,
    });
  }
});

webauthnRouter.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const credentials = await storage.getWebAuthnCredentialsByUserId(userId);
    res.json({
      success: true,
      enabled: credentials.length > 0,
      count: credentials.length,
      credentials: credentials.map(c => ({
        id: c.credential_id,
        label: c.device_label,
        created_at: c.created_at,
        last_used_at: c.last_used_at,
      })),
    });
  } catch (error: any) {
    console.error('❌ [WebAuthn] Error checking status:', error);
    res.status(500).json({ success: false, message: 'خطأ في التحقق من حالة البصمة' });
  }
});

webauthnRouter.delete('/credentials', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    await storage.deleteAllWebAuthnCredentialsByUserId(userId);
    console.log(`🗑️ [WebAuthn] All credentials deleted for user: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'تم إلغاء تفعيل البصمة بنجاح',
    });
  } catch (error: any) {
    console.error('❌ [WebAuthn] Error deleting credentials:', error);
    res.status(500).json({ success: false, message: 'خطأ في إلغاء البصمة' });
  }
});

export default webauthnRouter;
