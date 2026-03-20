import type { ClientPlatform, AppEnv, AuthStrategy } from '@shared/env-types';

const PRODUCTION_DOMAIN = 'https://app2.binarjoinanelytic.info';
const PRODUCTION_HOSTS = ['app2.binarjoinanelytic.info', 'binarjoinanelytic.info', 'www.binarjoinanelytic.info'];

let _cachedPlatform: ClientPlatform | null = null;

function detectPlatform(): ClientPlatform {
  if (_cachedPlatform) return _cachedPlatform;
  if (typeof window === 'undefined') return 'web';
  try {
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const p = cap.getPlatform?.();
      _cachedPlatform = p === 'ios' ? 'ios' : 'android';
      return _cachedPlatform;
    }
    if (cap?.isNative === true) {
      _cachedPlatform = 'android';
      return _cachedPlatform;
    }
  } catch {}
  const proto = window.location?.protocol;
  if (proto === 'capacitor:' || proto === 'ionic:') {
    _cachedPlatform = 'android';
    return _cachedPlatform;
  }
  const ua = navigator?.userAgent || '';
  if (/android/i.test(ua) && /wv|capacitor/i.test(ua)) {
    _cachedPlatform = 'android';
    return _cachedPlatform;
  }
  return 'web';
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
