import type { ClientPlatform, AppEnv, AuthStrategy } from '@shared/env-types';

const PRODUCTION_DOMAIN = 'https://app2.binarjoinanelytic.info';
const PRODUCTION_HOSTS = ['app2.binarjoinanelytic.info', 'binarjoinanelytic.info', 'www.binarjoinanelytic.info'];

function detectPlatform(): ClientPlatform {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    const p = cap.getPlatform?.();
    if (p === 'ios') return 'ios';
    return 'android';
  }
  if (cap?.isNative === true) return 'android';
  const proto = window.location.protocol;
  if (proto === 'capacitor:' || proto === 'ionic:') return 'android';
  return 'web';
}

function detectEnvironment(platform: ClientPlatform): AppEnv {
  if (platform !== 'web') return 'production';
  if (typeof window === 'undefined') return 'development';
  if (PRODUCTION_HOSTS.includes(window.location.hostname)) return 'production';
  if (import.meta.env?.DEV) return 'development';
  return 'production';
}

function resolveApiBaseUrl(platform: ClientPlatform, environment: AppEnv): string {
  if (platform !== 'web') return PRODUCTION_DOMAIN;
  if (environment === 'production') return PRODUCTION_DOMAIN;
  return '';
}

const platform = detectPlatform();
const environment = detectEnvironment(platform);
const isNative = platform !== 'web';
const apiBaseUrl = resolveApiBaseUrl(platform, environment);

export const ENV = {
  platform,
  environment,
  isProduction: environment === 'production',
  isNative,
  isAndroid: platform === 'android',
  authStrategy: (isNative ? 'bearer' : 'cookie') as AuthStrategy,
  apiBaseUrl,
  productionDomain: PRODUCTION_DOMAIN,

  getApiUrl: (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${apiBaseUrl}${cleanPath}`;
  },

  getApiBaseUrl: (): string => apiBaseUrl,

  getExternalServerUrl: (): string => PRODUCTION_DOMAIN,
} as const;

export function getApiUrl(path: string): string {
  return ENV.getApiUrl(path);
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function shouldUseBearerAuth(): boolean {
  return isNative;
}

export function isNativePlatform(): boolean {
  return isNative;
}

export function getFetchCredentials(): RequestCredentials {
  return isNative ? 'omit' : 'include';
}

export function getClientPlatformHeader(): Record<string, string> {
  return { 'x-client-platform': isNative ? 'native' : 'web' };
}
