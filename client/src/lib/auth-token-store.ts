import { ENV, shouldUseBearerAuth as _shouldUseBearerAuth, isNativePlatform as _isNativePlatform, getFetchCredentials as _getFetchCredentials, getClientPlatformHeader as _getClientPlatformHeader } from './env';

export const isNativePlatform = _isNativePlatform;
export const isWebCookieMode = (): boolean => !_isNativePlatform();
export const shouldUseBearerAuth = _shouldUseBearerAuth;
export const getFetchCredentials = _getFetchCredentials;
export const getClientPlatformHeader = _getClientPlatformHeader;

export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function clearTokens(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}
