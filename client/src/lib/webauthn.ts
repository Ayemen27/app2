import { ENV } from './env';
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders, isWebCookieMode } from '@/lib/auth-token-store';
import { Capacitor } from '@capacitor/core';
import NativeBiometric from '@/lib/native-biometric';

const CREDENTIAL_SERVER = 'axion-app2';

function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      console.log('[Biometric] Checking native biometric availability...');
      const result = await NativeBiometric.isAvailable();
      console.log('[Biometric] isAvailable result:', JSON.stringify(result));
      return result.isAvailable;
    } catch (err: any) {
      console.error('[Biometric] Native isAvailable error:', err?.message || err, err?.code);
      return false;
    }
  }

  if (!window.PublicKeyCredential) {
    console.log('[Biometric] PublicKeyCredential not available');
    return false;
  }
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    console.log('[Biometric] WebAuthn platform authenticator available:', available);
    return available;
  } catch (err: any) {
    console.error('[Biometric] WebAuthn check error:', err?.message || err);
    return false;
  }
}

export function hasBiometricCredentialStored(): boolean {
  return localStorage.getItem('biometric_credential_registered') === 'true';
}

export async function registerBiometric(accessToken: string): Promise<{ success: boolean; message: string }> {
  if (isNativePlatform()) {
    return await registerBiometricNative(accessToken);
  }
  return await registerBiometricWebAuthn(accessToken);
}

export async function checkBiometricRegistered(email?: string): Promise<boolean> {
  if (hasBiometricCredentialStored()) {
    return true;
  }

  try {
    const apiBase = ENV.getApiBaseUrl();

    const token = getAccessToken();
    if (token || isWebCookieMode()) {
      const res = await fetch(`${apiBase}/api/webauthn/status`, {
        credentials: getFetchCredentials(),
        headers: {
          ...getClientPlatformHeader(),
          ...getAuthHeaders(),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enabled) {
          localStorage.setItem('biometric_credential_registered', 'true');
          return true;
        }
      }
    }

    if (isNativePlatform()) {
      try {
        const creds = await NativeBiometric.getCredentials({ server: CREDENTIAL_SERVER });
        if (creds?.username) {
          localStorage.setItem('biometric_credential_registered', 'true');
          return true;
        }
      } catch {
      }
      return false;
    }

    if (email) {
      const res = await fetch(`${apiBase}/api/webauthn/login/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return false;
      const { options } = await res.json();
      if (Array.isArray(options?.allowCredentials) && options.allowCredentials.length > 0) {
        localStorage.setItem('biometric_credential_registered', 'true');
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function loginWithBiometric(email?: string): Promise<any> {
  if (isNativePlatform()) {
    return await loginWithBiometricNative(email);
  }
  return await loginWithBiometricWebAuthn(email);
}

async function registerBiometricNative(accessToken: string): Promise<{ success: boolean; message: string }> {
  const available = await NativeBiometric.isAvailable();
  if (!available.isAvailable) {
    throw new Error('البصمة غير متاحة على هذا الجهاز');
  }

  await NativeBiometric.verifyIdentity({
    reason: 'تسجيل البصمة لتطبيق Axion',
    title: 'تسجيل البصمة',
    subtitle: 'ضع بصمتك لتفعيل تسجيل الدخول السريع',
    useFallback: true,
    fallbackTitle: 'استخدام رمز PIN',
    maxAttempts: 3,
  });

  const apiBase = ENV.getApiBaseUrl();
  const meRes = await fetch(`${apiBase}/api/auth/me`, {
    credentials: getFetchCredentials(),
    headers: {
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      ...getClientPlatformHeader(),
      'x-request-nonce': crypto.randomUUID(),
      'x-request-timestamp': new Date().toISOString(),
    },
  });

  if (!meRes.ok) {
    throw new Error('فشل في جلب بيانات المستخدم');
  }

  const userData = await meRes.json();
  const userEmail = userData.user?.email || userData.email || '';

  await NativeBiometric.setCredentials({
    server: CREDENTIAL_SERVER,
    username: userEmail,
    password: accessToken,
  });

  localStorage.setItem('biometric_credential_registered', 'true');
  localStorage.setItem('biometric_user_email', userEmail);

  return { success: true, message: 'تم تسجيل البصمة بنجاح' };
}

async function loginWithBiometricNative(email?: string): Promise<any> {
  await NativeBiometric.verifyIdentity({
    reason: 'تسجيل الدخول بالبصمة',
    title: 'تسجيل الدخول',
    subtitle: 'ضع بصمتك للمتابعة',
    useFallback: true,
    fallbackTitle: 'استخدام رمز PIN',
    maxAttempts: 3,
  });

  const creds = await NativeBiometric.getCredentials({ server: CREDENTIAL_SERVER });
  if (!creds?.password) {
    const noCredError = new Error('لم يتم تسجيل البصمة بعد. سجّل الدخول بكلمة المرور أولاً ثم فعّل البصمة من الإعدادات');
    (noCredError as any).code = 'NO_CREDENTIALS';
    throw noCredError;
  }

  const storedToken = creds.password;
  const storedEmail = creds.username;
  const apiBase = ENV.getApiBaseUrl();

  const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storedToken}`,
      'x-client-platform': 'native',
      'x-request-nonce': crypto.randomUUID(),
      'x-request-timestamp': new Date().toISOString(),
    },
    body: JSON.stringify({ email: storedEmail }),
  });

  if (!refreshRes.ok) {
    localStorage.removeItem('biometric_credential_registered');
    localStorage.removeItem('biometric_user_email');
    try { await NativeBiometric.deleteCredentials({ server: CREDENTIAL_SERVER }); } catch {}
    const expiredError = new Error('انتهت صلاحية الجلسة. سجّل الدخول بكلمة المرور مرة أخرى');
    (expiredError as any).code = 'TOKEN_EXPIRED';
    throw expiredError;
  }

  const authResult = await refreshRes.json();

  if (authResult.accessToken || authResult.token) {
    const newToken = authResult.accessToken || authResult.token;
    await NativeBiometric.setCredentials({
      server: CREDENTIAL_SERVER,
      username: storedEmail,
      password: newToken,
    });
  }

  return authResult;
}

async function registerBiometricWebAuthn(accessToken: string): Promise<{ success: boolean; message: string }> {
  const apiBase = ENV.getApiBaseUrl();

  const authHeader: Record<string, string> = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
  const optionsRes = await fetch(`${apiBase}/api/webauthn/register/options`, {
    method: 'POST',
    credentials: getFetchCredentials(),
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...getClientPlatformHeader(),
      'x-request-nonce': crypto.randomUUID(),
      'x-request-timestamp': new Date().toISOString(),
    },
  });

  if (!optionsRes.ok) {
    const err = await optionsRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في الحصول على خيارات التسجيل');
  }

  const { options } = await optionsRes.json();

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64urlToBuffer(options.user.id),
    },
    excludeCredentials: (options.excludeCredentials || []).map((cred: any) => ({
      ...cred,
      id: base64urlToBuffer(cred.id),
    })),
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('لم يتم إنشاء بيانات الاعتماد');
  }

  const attestationResponse = credential.response as AuthenticatorAttestationResponse;

  const credentialJSON = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
      attestationObject: bufferToBase64url(attestationResponse.attestationObject),
      transports: attestationResponse.getTransports ? attestationResponse.getTransports() : [],
    },
  };

  const verifyRes = await fetch(`${apiBase}/api/webauthn/register/verify`, {
    method: 'POST',
    credentials: getFetchCredentials(),
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...getClientPlatformHeader(),
      'x-request-nonce': crypto.randomUUID(),
      'x-request-timestamp': new Date().toISOString(),
    },
    body: JSON.stringify({ credential: credentialJSON }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في التحقق من التسجيل');
  }

  const result = await verifyRes.json();

  if (result.success) {
    localStorage.setItem('biometric_credential_registered', 'true');
  }

  return result;
}

async function loginWithBiometricWebAuthn(email?: string): Promise<any> {
  const apiBase = ENV.getApiBaseUrl();

  const optionsRes = await fetch(`${apiBase}/api/webauthn/login/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
    body: JSON.stringify({ email }),
  });

  if (!optionsRes.ok) {
    const err = await optionsRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في الحصول على خيارات المصادقة');
  }

  const { options } = await optionsRes.json();

  const hasServerCredentials = Array.isArray(options.allowCredentials) && options.allowCredentials.length > 0;
  const hasLocalFlag = hasBiometricCredentialStored();

  if (!hasServerCredentials && !hasLocalFlag) {
    const noCredError = new Error('لم يتم تسجيل البصمة بعد. سجّل الدخول بكلمة المرور أولاً ثم فعّل البصمة من الإعدادات');
    (noCredError as any).code = 'NO_CREDENTIALS';
    throw noCredError;
  }

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    allowCredentials: hasServerCredentials
      ? options.allowCredentials.map((cred: any) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        }))
      : [],
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential;

  if (!assertion) {
    throw new Error('لم يتم الحصول على بيانات المصادقة');
  }

  const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

  const credentialJSON = {
    id: assertion.id,
    rawId: bufferToBase64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
      authenticatorData: bufferToBase64url(assertionResponse.authenticatorData),
      signature: bufferToBase64url(assertionResponse.signature),
      userHandle: assertionResponse.userHandle
        ? bufferToBase64url(assertionResponse.userHandle)
        : null,
    },
  };

  const verifyRes = await fetch(`${apiBase}/api/webauthn/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
    body: JSON.stringify({ credential: credentialJSON }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في التحقق من المصادقة');
  }

  return await verifyRes.json();
}
