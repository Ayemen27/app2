/**
 * Biometric Authentication Client
 * --------------------------------
 * Implements global standards (W3C WebAuthn L3 + FIDO Alliance Passkey UX):
 *
 *  WEB:
 *   • Discoverable credentials (resident keys) → usernameless login.
 *   • Conditional UI (autofill) via isConditionalMediationAvailable().
 *   • credentialId stored locally as a "hint" for re-auth (allowCredentials filter).
 *   • Survives logout — only cleared on explicit "disable biometric".
 *
 *  ANDROID (Capacitor + @capgo/capacitor-native-biometric):
 *   • Stores a dedicated long-lived biometric_refresh_token (NOT the access token).
 *   • Hardware-backed Keystore via the plugin's Keychain abstraction.
 *   • Uses POST /api/auth/biometric/exchange to obtain fresh access+refresh tokens.
 *   • Failure tolerance: counts consecutive failures, only wipes after 3 in a row.
 */

import { ENV } from './env';
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders, isWebCookieMode } from '@/lib/auth-token-store';
import { Capacitor } from '@capacitor/core';
import NativeBiometric from '@/lib/native-biometric';

const CREDENTIAL_SERVER = 'axion-app2';

// localStorage keys (kept stable across versions)
const LS_REGISTERED_FLAG = 'biometric_credential_registered';
const LS_USER_EMAIL      = 'biometric_user_email';
const LS_CREDENTIAL_ID   = 'biometric_credential_id';   // WebAuthn credential id hint
const LS_DEVICE_ID       = 'biometric_device_id';        // stable per-device id
const LS_FAILURE_COUNT   = 'biometric_failure_count';
const MAX_CONSECUTIVE_FAILURES = 3;

// ─── Helpers ────────────────────────────────────────────────────────────────

function isNativePlatform(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

function isNativeBiometricAvailable(): boolean {
  // لا نستخدم isPluginAvailable() — تُرجع false في Capacitor 8 حتى للإضافات الموجودة.
  // نعيد true على المنصة الأصلية ونترك الخطأ الفعلي لنداء الإضافة.
  try {
    return isNativePlatform();
  } catch { return false; }
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(LS_DEVICE_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LS_DEVICE_ID, id);
  }
  return id;
}

function getDeviceLabel(): string {
  if (isNativePlatform()) {
    try {
      const platform = Capacitor.getPlatform();
      return platform === 'android' ? 'Android Device' : (platform === 'ios' ? 'iOS Device' : 'Mobile');
    } catch { return 'Mobile'; }
  }
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//.test(ua)) return 'Google Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Web Browser';
}

function recordFailure(): number {
  const n = (parseInt(localStorage.getItem(LS_FAILURE_COUNT) || '0', 10) || 0) + 1;
  localStorage.setItem(LS_FAILURE_COUNT, String(n));
  return n;
}

function resetFailures(): void {
  localStorage.removeItem(LS_FAILURE_COUNT);
}

function clearLocalBiometricHints(): void {
  localStorage.removeItem(LS_REGISTERED_FLAG);
  localStorage.removeItem(LS_USER_EMAIL);
  localStorage.removeItem(LS_CREDENTIAL_ID);
  resetFailures();
}

function commonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getClientPlatformHeader(),
    'x-request-nonce': crypto.randomUUID(),
    'x-request-timestamp': new Date().toISOString(),
    ...extra,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  if (isNativePlatform()) {
    // On native Android/iOS we return true optimistically — the device almost certainly
    // has hardware-backed biometrics.  Calling NativeBiometric.isAvailable() here can
    // throw or return false due to Capacitor-bridge timing before plugins are fully
    // registered.  Real errors are caught and handled in loginWithBiometricNative().
    return true;
  }
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

/** Conditional UI capability (Chrome/Safari autofill passkeys). */
export async function isConditionalUIAvailable(): Promise<boolean> {
  try {
    const PKC: any = (window as any).PublicKeyCredential;
    if (!PKC || typeof PKC.isConditionalMediationAvailable !== 'function') return false;
    return await PKC.isConditionalMediationAvailable();
  } catch { return false; }
}

export function hasBiometricCredentialStored(): boolean {
  return localStorage.getItem(LS_REGISTERED_FLAG) === 'true';
}

export function getStoredCredentialIdHint(): string | null {
  return localStorage.getItem(LS_CREDENTIAL_ID);
}

export function getStoredBiometricEmail(): string | null {
  return localStorage.getItem(LS_USER_EMAIL);
}

export async function registerBiometric(accessToken: string): Promise<{ success: boolean; message: string }> {
  if (isNativePlatform()) return await registerBiometricNative(accessToken);
  return await registerBiometricWebAuthn(accessToken);
}

export async function loginWithBiometric(email?: string): Promise<any> {
  if (isNativePlatform()) return await loginWithBiometricNative();
  return await loginWithBiometricWebAuthn(email);
}

export async function checkBiometricRegistered(email?: string): Promise<boolean> {
  if (hasBiometricCredentialStored()) return true;
  try {
    const apiBase = ENV.getApiBaseUrl();
    const token = getAccessToken();
    if (token || isWebCookieMode()) {
      const res = await fetch(`${apiBase}/api/webauthn/status`, {
        credentials: getFetchCredentials(),
        headers: { ...getClientPlatformHeader(), ...getAuthHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enabled) {
          localStorage.setItem(LS_REGISTERED_FLAG, 'true');
          if (data.credentials?.[0]?.id) {
            localStorage.setItem(LS_CREDENTIAL_ID, String(data.credentials[0].id));
          }
          return true;
        }
      }
    }
    if (isNativePlatform()) {
      try {
        const creds = await NativeBiometric.getCredentials({ server: CREDENTIAL_SERVER });
        if (creds?.password) {
          localStorage.setItem(LS_REGISTERED_FLAG, 'true');
          if (creds.username) localStorage.setItem(LS_USER_EMAIL, creds.username);
          return true;
        }
      } catch {}
      return false;
    }
    if (email) {
      const res = await fetch(`${apiBase}/api/webauthn/login/options`, {
        method: 'POST',
        headers: commonHeaders(),
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return false;
      const { options } = await res.json();
      if (Array.isArray(options?.allowCredentials) && options.allowCredentials.length > 0) {
        localStorage.setItem(LS_REGISTERED_FLAG, 'true');
        return true;
      }
    }
    return false;
  } catch { return false; }
}

/**
 * Called explicitly when the user disables biometric in settings, OR after
 * exceeding MAX_CONSECUTIVE_FAILURES. NOT called on normal logout.
 */
export async function clearAllBiometricData(): Promise<void> {
  clearLocalBiometricHints();
  if (isNativePlatform()) {
    try { await NativeBiometric.deleteCredentials({ server: CREDENTIAL_SERVER }); } catch {}
  }
}

// ─── Native (Android/iOS via Capgo) ─────────────────────────────────────────

async function registerBiometricNative(accessToken: string): Promise<{ success: boolean; message: string }> {
  let available: any;
  try {
    available = await NativeBiometric.isAvailable();
  } catch {
    throw new Error('إضافة البصمة غير متوفرة في هذا الإصدار من التطبيق');
  }
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
  const authHeader: Record<string, string> = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};

  // Identify the user to bind the biometric token to
  const meRes = await fetch(`${apiBase}/api/auth/me`, {
    credentials: getFetchCredentials(),
    headers: commonHeaders(authHeader),
  });
  if (!meRes.ok) throw new Error('فشل في جلب بيانات المستخدم');
  const userData = await meRes.json();
  const userEmail = userData.user?.email || userData.email || '';

  // Issue a long-lived biometric refresh token (server-bound, hashed at rest)
  const deviceId = getOrCreateDeviceId();
  const issueRes = await fetch(`${apiBase}/api/auth/biometric/issue`, {
    method: 'POST',
    credentials: getFetchCredentials(),
    headers: commonHeaders(authHeader),
    body: JSON.stringify({
      device_id: deviceId,
      device_label: getDeviceLabel(),
      platform: Capacitor.getPlatform(),
    }),
  });

  if (!issueRes.ok) {
    const err = await issueRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل إصدار رمز البصمة');
  }

  const { biometricToken } = await issueRes.json();
  if (!biometricToken) throw new Error('لم يتم استلام رمز البصمة من الخادم');

  // Persist the biometric refresh token in the OS Keystore via Capgo plugin
  await NativeBiometric.setCredentials({
    server: CREDENTIAL_SERVER,
    username: userEmail,
    password: biometricToken,
  });

  localStorage.setItem(LS_REGISTERED_FLAG, 'true');
  localStorage.setItem(LS_USER_EMAIL, userEmail);
  resetFailures();

  return { success: true, message: 'تم تسجيل البصمة بنجاح' };
}

async function loginWithBiometricNative(): Promise<any> {
  try {
    const check = await NativeBiometric.isAvailable();
    if (!check.isAvailable) {
      const e = new Error('البصمة غير متاحة على هذا الجهاز');
      (e as any).code = 'UNAVAILABLE';
      throw e;
    }
  } catch (checkErr: any) {
    if (checkErr.code === 'UNAVAILABLE') throw checkErr;
    throw new Error('إضافة البصمة غير متوفرة — يرجى تحديث التطبيق');
  }
  await NativeBiometric.verifyIdentity({
    reason: 'تسجيل الدخول بالبصمة',
    title: 'تسجيل الدخول',
    subtitle: 'ضع بصمتك للمتابعة',
    useFallback: true,
    fallbackTitle: 'استخدام رمز PIN',
    maxAttempts: 3,
  });

  let creds: any = null;
  try {
    creds = await NativeBiometric.getCredentials({ server: CREDENTIAL_SERVER });
  } catch (credErr: any) {
    clearLocalBiometricHints();
    const noCredError = new Error('لم يُعثر على بيانات البصمة — يرجى إعادة تفعيلها من الإعدادات بعد تسجيل الدخول بكلمة المرور');
    (noCredError as any).code = 'NO_CREDENTIALS';
    throw noCredError;
  }

  if (!creds?.password) {
    clearLocalBiometricHints();
    const noCredError = new Error('لم يتم تسجيل البصمة بعد. سجّل الدخول بكلمة المرور أولاً ثم فعّل البصمة من الإعدادات');
    (noCredError as any).code = 'NO_CREDENTIALS';
    throw noCredError;
  }

  const biometricToken = creds.password;
  const apiBase = ENV.getApiBaseUrl();

  const exchangeRes = await fetch(`${apiBase}/api/auth/biometric/exchange`, {
    method: 'POST',
    credentials: getFetchCredentials(),
    headers: commonHeaders({ 'x-client-platform': 'native' }),
    body: JSON.stringify({ biometricToken }),
  });

  if (!exchangeRes.ok) {
    let code = 'EXCHANGE_FAILED';
    try { code = (await exchangeRes.clone().json())?.code || code; } catch {}

    // Only wipe the credential if the server explicitly says it's invalid/revoked/expired
    const fatal = ['INVALID_TOKEN', 'REVOKED_TOKEN', 'EXPIRED_TOKEN', 'USER_DISABLED', 'USER_NOT_FOUND'].includes(code);
    if (fatal) {
      await clearAllBiometricData();
      const e = new Error('انتهت صلاحية البصمة. يرجى إعادة تفعيلها من الإعدادات بعد تسجيل الدخول بكلمة المرور');
      (e as any).code = 'TOKEN_EXPIRED';
      throw e;
    }

    // Transient failure (network/5xx/429) → don't wipe; just count
    const failures = recordFailure();
    if (failures >= MAX_CONSECUTIVE_FAILURES) {
      await clearAllBiometricData();
      const e = new Error('فشلت محاولات البصمة عدة مرات. يرجى تسجيل الدخول بكلمة المرور');
      (e as any).code = 'TOO_MANY_FAILURES';
      throw e;
    }
    const e = new Error('تعذّر إكمال تسجيل الدخول بالبصمة. حاول مرة أخرى');
    (e as any).code = code;
    throw e;
  }

  const responseData = await exchangeRes.json();

  // Token rotation: server issues a fresh biometric token each exchange.
  // Store it in the device keystore so the next login uses the new valid secret.
  if (responseData.newBiometricToken && creds?.username) {
    try {
      await NativeBiometric.setCredentials({
        server: CREDENTIAL_SERVER,
        username: creds.username,
        password: responseData.newBiometricToken,
      });
    } catch {
      // Non-fatal: old token already revoked server-side; user will need to
      // re-register biometric from settings on next attempt.
    }
  }

  resetFailures();
  return responseData;
}

// ─── Web (WebAuthn / Passkeys) ──────────────────────────────────────────────

async function registerBiometricWebAuthn(accessToken: string): Promise<{ success: boolean; message: string }> {
  const apiBase = ENV.getApiBaseUrl();
  const authHeader: Record<string, string> = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};

  const optionsRes = await fetch(`${apiBase}/api/webauthn/register/options`, {
    method: 'POST',
    credentials: getFetchCredentials(),
    headers: commonHeaders(authHeader),
  });
  if (!optionsRes.ok) {
    const err = await optionsRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في الحصول على خيارات التسجيل');
  }
  const { options } = await optionsRes.json();

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    user: { ...options.user, id: base64urlToBuffer(options.user.id) },
    excludeCredentials: (options.excludeCredentials || []).map((cred: any) => ({
      ...cred,
      id: base64urlToBuffer(cred.id),
    })),
  };

  const credential = await navigator.credentials.create({ publicKey: publicKeyOptions }) as PublicKeyCredential;
  if (!credential) throw new Error('لم يتم إنشاء بيانات الاعتماد');

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
    headers: commonHeaders(authHeader),
    body: JSON.stringify({ credential: credentialJSON, deviceLabel: getDeviceLabel() }),
  });
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في التحقق من التسجيل');
  }

  const result = await verifyRes.json();
  if (result.success) {
    localStorage.setItem(LS_REGISTERED_FLAG, 'true');
    localStorage.setItem(LS_CREDENTIAL_ID, credential.id);
    // remember the email hint for future re-auth filtering
    try {
      const meRes = await fetch(`${apiBase}/api/auth/me`, {
        credentials: getFetchCredentials(),
        headers: commonHeaders(authHeader),
      });
      if (meRes.ok) {
        const me = await meRes.json();
        const email = me.user?.email || me.email || '';
        if (email) localStorage.setItem(LS_USER_EMAIL, email);
      }
    } catch {}
    resetFailures();
  }
  return result;
}

/**
 * Standard (modal) WebAuthn login.
 * - If we have a credentialId hint or an email, server returns allowCredentials.
 * - Otherwise, browser uses discoverable credentials (resident keys) automatically.
 */
async function loginWithBiometricWebAuthn(email?: string): Promise<any> {
  const apiBase = ENV.getApiBaseUrl();

  const effectiveEmail = email || getStoredBiometricEmail() || undefined;

  const optionsRes = await fetch(`${apiBase}/api/webauthn/login/options`, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify({ email: effectiveEmail }),
  });
  if (!optionsRes.ok) {
    const err = await optionsRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في الحصول على خيارات المصادقة');
  }
  const { options } = await optionsRes.json();

  const serverAllow: any[] = Array.isArray(options.allowCredentials) ? options.allowCredentials : [];
  const localHint = getStoredCredentialIdHint();
  const hasAnyCredential = serverAllow.length > 0 || !!localHint;

  if (!hasAnyCredential && !effectiveEmail) {
    // We can still try discoverable credentials, but warn if user isn't a returning one
    if (!hasBiometricCredentialStored()) {
      const noCredError = new Error('لم يتم تسجيل البصمة بعد. سجّل الدخول بكلمة المرور أولاً ثم فعّل البصمة من الإعدادات');
      (noCredError as any).code = 'NO_CREDENTIALS';
      throw noCredError;
    }
  }

  // Build allowCredentials: prefer server list; if empty, fall back to local hint
  const allowCredentialsTransformed = serverAllow.length > 0
    ? serverAllow.map((cred: any) => ({ ...cred, id: base64urlToBuffer(cred.id) }))
    : (localHint
        ? [{ id: base64urlToBuffer(localHint), type: 'public-key' as const, transports: ['internal'] }]
        : []);

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    allowCredentials: allowCredentialsTransformed,
  };

  const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions }) as PublicKeyCredential;
  if (!assertion) throw new Error('لم يتم الحصول على بيانات المصادقة');

  return await verifyWebAuthnAssertion(assertion);
}

/**
 * Conditional UI WebAuthn — call once on login page mount with the email input
 * focused. The browser will offer the user a passkey via the autofill UI.
 *
 * Usage:
 *   const ac = new AbortController();
 *   loginWithBiometricConditional(ac.signal).then(handleResult).catch(handleErr);
 */
export async function loginWithBiometricConditional(signal?: AbortSignal): Promise<any> {
  if (isNativePlatform()) {
    throw new Error('Conditional UI is web-only');
  }
  if (!(await isConditionalUIAvailable())) {
    throw new Error('Conditional UI غير مدعوم على هذا المتصفح');
  }

  const apiBase = ENV.getApiBaseUrl();

  // No email passed → server returns options without allowCredentials
  // → browser surfaces discoverable passkeys via autofill.
  const optionsRes = await fetch(`${apiBase}/api/webauthn/login/options`, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify({}),
  });
  if (!optionsRes.ok) throw new Error('فشل في الحصول على خيارات المصادقة');
  const { options } = await optionsRes.json();

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    allowCredentials: [],
  };

  const assertion = await (navigator.credentials as any).get({
    publicKey: publicKeyOptions,
    mediation: 'conditional',
    signal,
  }) as PublicKeyCredential;

  if (!assertion) throw new Error('لم يتم اختيار بصمة');
  return await verifyWebAuthnAssertion(assertion);
}

async function verifyWebAuthnAssertion(assertion: PublicKeyCredential): Promise<any> {
  const apiBase = ENV.getApiBaseUrl();
  const assertionResponse = assertion.response as AuthenticatorAssertionResponse;
  const credentialJSON = {
    id: assertion.id,
    rawId: bufferToBase64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
      authenticatorData: bufferToBase64url(assertionResponse.authenticatorData),
      signature: bufferToBase64url(assertionResponse.signature),
      userHandle: assertionResponse.userHandle ? bufferToBase64url(assertionResponse.userHandle) : null,
    },
  };

  const verifyRes = await fetch(`${apiBase}/api/webauthn/login/verify`, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify({ credential: credentialJSON }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.message || 'فشل في التحقق من المصادقة');
  }

  // Cache credential id hint and email for the next time
  try {
    localStorage.setItem(LS_REGISTERED_FLAG, 'true');
    localStorage.setItem(LS_CREDENTIAL_ID, assertion.id);
  } catch {}
  resetFailures();

  const result = await verifyRes.json();
  if (result?.user?.email) {
    try { localStorage.setItem(LS_USER_EMAIL, String(result.user.email)); } catch {}
  }
  return result;
}
