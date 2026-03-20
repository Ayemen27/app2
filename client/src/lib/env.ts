import type { ClientPlatform, AppEnv, AuthStrategy } from '@shared/env-types';
import { trackLog } from './debug-tracker';

const PRODUCTION_DOMAIN = 'https://app2.binarjoinanelytic.info';
const PRODUCTION_HOSTS = ['app2.binarjoinanelytic.info', 'binarjoinanelytic.info', 'www.binarjoinanelytic.info'];

let _cachedPlatform: ClientPlatform | null = null;

function detectPlatform(): ClientPlatform {
  if (_cachedPlatform) return _cachedPlatform;
  if (typeof window === 'undefined') return 'web';

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

  if (result !== 'web') {
    _cachedPlatform = result;
  }
  return result;
}

function getPlatform(): ClientPlatform {
  return detectPlatform();
}

function getIsNative(): boolean {
  return getPlatform() !== 'web';
}

function detectEnvironment(): AppEnv {
  const p = getPlatform();
  if (p !== 'web') return 'production';
  if (typeof window === 'undefined') return 'development';
  if (PRODUCTION_HOSTS.includes(window.location.hostname)) return 'production';
  if (import.meta.env?.DEV) return 'development';
  return 'production';
}

function resolveApiBaseUrl(): string {
  if (getIsNative()) return PRODUCTION_DOMAIN;
  if (detectEnvironment() === 'production') return PRODUCTION_DOMAIN;
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
