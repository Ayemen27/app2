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

let _refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const refreshTokenValue = getRefreshToken();
      if (!refreshTokenValue) return false;
      const { ENV: env } = await import('./env');
      const res = await fetch(env.getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: _getFetchCredentials(),
        headers: { 'Content-Type': 'application/json', ..._getClientPlatformHeader() },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });
      if (!res.ok) return false;
      const data = await res.json();
      const newAccess = data.data?.accessToken || data.accessToken;
      const newRefresh = data.data?.refreshToken || data.refreshToken;
      if (newAccess) {
        storeTokens(newAccess, newRefresh || refreshTokenValue);
        return true;
      }
      return false;
    } catch { return false; }
    finally { _refreshPromise = null; }
  })();
  return _refreshPromise;
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const makeHeaders = (): HeadersInit => ({
    ...getAuthHeaders(),
    ..._getClientPlatformHeader(),
    ...(init?.headers || {}),
  });

  let response = await fetch(url, {
    ...init,
    credentials: _getFetchCredentials(),
    headers: makeHeaders(),
  });

  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await fetch(url, {
        ...init,
        credentials: _getFetchCredentials(),
        headers: makeHeaders(),
      });
    }
  }

  return response;
}
