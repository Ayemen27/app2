import { ENV, shouldUseBearerAuth as _shouldUseBearerAuth, isNativePlatform as _isNativePlatform, getFetchCredentials as _getFetchCredentials, getClientPlatformHeader as _getClientPlatformHeader } from './env';

export const isNativePlatform = _isNativePlatform;
export const isWebCookieMode = (): boolean => !_isNativePlatform();
export const shouldUseBearerAuth = _shouldUseBearerAuth;
export const getFetchCredentials = _getFetchCredentials;
export const getClientPlatformHeader = _getClientPlatformHeader;

export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  if (!_isNativePlatform()) return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  if (!_isNativePlatform()) return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  if (!_isNativePlatform()) return null;
  return localStorage.getItem('refreshToken');
}

export function clearTokens(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAuthHeaders(): Record<string, string> {
  if (!_shouldUseBearerAuth()) return {};
  const token = getAccessToken();
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}

let _refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const { ENV: env } = await import('./env');
      const isNative = _isNativePlatform();
      const refreshTokenValue = isNative ? getRefreshToken() : null;

      if (isNative && !refreshTokenValue) return false;

      const body = refreshTokenValue
        ? JSON.stringify({ refreshToken: refreshTokenValue })
        : undefined;

      const res = await fetch(env.getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: _getFetchCredentials(),
        headers: { 'Content-Type': 'application/json', ..._getClientPlatformHeader() },
        ...(body ? { body } : {}),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const newAccess = data.data?.accessToken || data.accessToken;
      const newRefresh = data.data?.refreshToken || data.refreshToken;
      if (newAccess) {
        if (isNative) storeTokens(newAccess, newRefresh || refreshTokenValue || '');
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

  const method = (init?.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  try {
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

    if (isGet && response.ok) {
      try {
        const { cacheGetResponse } = await import('@/offline/offline-fallback');
        void cacheGetResponse(url, response);
      } catch {
        // never block on cache
      }
    }

    return response;
  } catch (err: any) {
    if (isGet) {
      try {
        const { isNetworkError, buildOfflineResponse } = await import('@/offline/offline-fallback');
        if (isNetworkError(err)) {
          const local = await buildOfflineResponse(url);
          if (local) {
            console.warn('[authFetch] Network error — served from local cache:', url);
            return local;
          }
        }
      } catch {
        // fall through to original error
      }
    }
    throw err;
  }
}
