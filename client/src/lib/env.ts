import type { ClientPlatform, AppEnv, AuthStrategy } from '@shared/env-types';
import { trackLog } from './debug-tracker';

const PRODUCTION_DOMAIN = import.meta.env.VITE_PRODUCTION_DOMAIN || '';
const PRODUCTION_HOSTS = (import.meta.env.VITE_PRODUCTION_HOSTS || '').split(',').map((h: string) => h.trim()).filter(Boolean);

let _cachedPlatform: ClientPlatform | null = null;

function detectPlatform(): ClientPlatform {
  if (_cachedPlatform) return _cachedPlatform;
  if (typeof window === 'undefined') {
    _cachedPlatform = 'web';
    return 'web';
  }

  const cap = (window as any).Capacitor;
  const proto = window.location?.protocol || '';
  const ua = navigator?.userAgent || '';

  const checks = {
    capExists: !!cap,
    capIsNativePlatform: false,
    capIsNative: false,
    capGetPlatform: 'N/A',
    protocol: proto,
    uaAndroid: /android/i.test(ua),
    uaWv: /wv/i.test(ua),
    uaCapacitor: /capacitor/i.test(ua),
  };

  try {
    if (cap) {
      checks.capIsNativePlatform = !!cap.isNativePlatform?.();
      checks.capIsNative = cap.isNative === true;
      checks.capGetPlatform = cap.getPlatform?.() || 'N/A';
    }
  } catch {}

  let result: ClientPlatform = 'web';
  let reason = 'default';

  if (checks.capIsNativePlatform) {
    result = checks.capGetPlatform === 'ios' ? 'ios' : 'android';
    reason = 'Capacitor.isNativePlatform()';
  } else if (checks.capIsNative) {
    result = 'android';
    reason = 'Capacitor.isNative=true';
  } else if (proto === 'capacitor:' || proto === 'ionic:') {
    result = 'android';
    reason = `protocol=${proto}`;
  } else if (checks.uaAndroid && (checks.uaWv || checks.uaCapacitor)) {
    result = 'android';
    reason = 'userAgent match';
  }

  trackLog('DETECT_PLATFORM', { ...checks, result, reason, ua: ua.substring(0, 100) });

  _cachedPlatform = result;
  return result;
}

function getPlatform(): ClientPlatform {
  return detectPlatform();
}

function getIsNative(): boolean {
  return getPlatform() !== 'web';
}

let _cachedEnv: AppEnv | null = null;
function detectEnvironment(): AppEnv {
  if (_cachedEnv) return _cachedEnv;
  const p = getPlatform();
  if (p !== 'web') { _cachedEnv = 'production'; return 'production'; }
  if (typeof window === 'undefined') { _cachedEnv = 'development'; return 'development'; }
  if (PRODUCTION_HOSTS.includes(window.location.hostname)) { _cachedEnv = 'production'; return 'production'; }
  if (import.meta.env?.DEV) { _cachedEnv = 'development'; return 'development'; }
  _cachedEnv = 'production';
  return 'production';
}

let _cachedApiBase: string | null = null;
function resolveApiBaseUrl(): string {
  if (_cachedApiBase !== null) return _cachedApiBase;
  if (getIsNative()) { _cachedApiBase = PRODUCTION_DOMAIN; return PRODUCTION_DOMAIN; }
  if (detectEnvironment() === 'production') { _cachedApiBase = PRODUCTION_DOMAIN; return PRODUCTION_DOMAIN; }
  _cachedApiBase = '';
  return '';
}

export const ENV = {
  get platform() { return getPlatform(); },
  get environment() { return detectEnvironment(); },
  get isProduction() { return detectEnvironment() === 'production'; },
  get isNative() { return getIsNative(); },
  get isAndroid() { return getPlatform() === 'android'; },
  get authStrategy(): AuthStrategy { return getIsNative() ? 'bearer' : 'cookie'; },
  get apiBaseUrl() { return resolveApiBaseUrl(); },
  productionDomain: PRODUCTION_DOMAIN,

  getApiUrl: (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${resolveApiBaseUrl()}${cleanPath}`;
  },

  getApiBaseUrl: (): string => resolveApiBaseUrl(),

  getExternalServerUrl: (): string => PRODUCTION_DOMAIN,
};

export function getApiUrl(path: string): string {
  return ENV.getApiUrl(path);
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

export function shouldUseBearerAuth(): boolean {
  return getIsNative();
}

export function isNativePlatform(): boolean {
  return getIsNative();
}

export function getFetchCredentials(): RequestCredentials {
  return getIsNative() ? 'omit' : 'include';
}

export function getClientPlatformHeader(): Record<string, string> {
  return { 'x-client-platform': getIsNative() ? 'native' : 'web' };
}
