import { ENV } from './env';
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';

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
  if (!window.PublicKeyCredential) {
    return false;
  }
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

export function hasBiometricCredentialStored(): boolean {
  return localStorage.getItem('biometric_credential_registered') === 'true';
}

export async function registerBiometric(accessToken: string): Promise<{ success: boolean; message: string }> {
  const apiBase = ENV.getApiBaseUrl();

  const optionsRes = await fetch(`${apiBase}/api/webauthn/register/options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
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
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
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

export async function checkBiometricRegistered(email?: string): Promise<boolean> {
  if (hasBiometricCredentialStored()) {
    return true;
  }

  try {
    const apiBase = ENV.getApiBaseUrl();

    const token = getAccessToken();
    if (token) {
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
