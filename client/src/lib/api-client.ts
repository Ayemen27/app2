import { Capacitor } from '@capacitor/core';
import { ENV } from './env';
import { getValidToken, isValidJwt, isTokenExpired } from './token-utils';
import { shouldUseBearerAuth, getAccessToken, getRefreshToken, getFetchCredentials, getClientPlatformHeader, storeTokens, clearTokens } from '@/lib/auth-token-store';

export function getReplayHeaders(): Record<string, string> {
  return {
    'x-request-nonce': crypto.randomUUID(),
    'x-request-timestamp': new Date().toISOString(),
  };
}

let _sharedRefreshPromise: Promise<string | null> | null = null;

async function getValidTokenWithRefresh(): Promise<string | null> {
  if (!shouldUseBearerAuth()) return null;

  const validToken = getValidToken('accessToken');
  if (validToken) return validToken;

  const rawToken = getAccessToken();
  if (!rawToken || !isValidJwt(rawToken) || !isTokenExpired(rawToken)) return null;

  const refreshTokenVal = getRefreshToken();
  if (!refreshTokenVal || !isValidJwt(refreshTokenVal) || isTokenExpired(refreshTokenVal)) return null;

  if (_sharedRefreshPromise) return _sharedRefreshPromise;

  _sharedRefreshPromise = (async () => {
    try {
      if (import.meta.env.DEV) console.log('[Auth] Proactive token refresh...');
      const baseURL = ENV.getApiBaseUrl();
      const res = await fetch(`${baseURL}/api/auth/refresh`, {
        method: 'POST',
        credentials: getFetchCredentials(),
        headers: { 'Content-Type': 'application/json', ...getClientPlatformHeader() },
        body: JSON.stringify({ refreshToken: refreshTokenVal })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newToken = data.data?.accessToken || data.accessToken;
      const newRefresh = data.data?.refreshToken || data.refreshToken;
      if (newToken) {
        storeTokens(newToken, newRefresh || refreshTokenVal);
        return newToken;
      }
      return null;
    } catch (e) {
      console.error('[Auth] Proactive refresh failed:', e);
      return null;
    } finally {
      setTimeout(() => { _sharedRefreshPromise = null; }, 200);
    }
  })();

  return _sharedRefreshPromise;
}

async function checkNetworkOnNative(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Network')) {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      return status.connected;
    }
  } catch {}
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

class ApiClient {
  private get baseURL(): string {
    return `${ENV.getApiBaseUrl()}/api`;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (Capacitor.isNativePlatform()) {
      const online = await checkNetworkOnNative();
      if (!online) {
        console.warn(`[API] Offline on native: skipping ${endpoint}`);
        throw new Error('OFFLINE_MODE');
      }
    }

    const isAuthEndpoint = endpoint === '/auth/refresh' || endpoint === '/auth/login';
    const token = isAuthEndpoint
      ? getAccessToken()
      : await getValidTokenWithRefresh();

    try {
      const url = `${this.baseURL}${endpoint}`;
      if (import.meta.env.DEV) console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, options.body || '');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getClientPlatformHeader(),
      };

      if (shouldUseBearerAuth() && token && token !== 'undefined' && token !== 'null') {
        const cleanToken = token.replace(/^["'](.+)["']$/, '$1');
        headers['Authorization'] = `Bearer ${cleanToken}`;
        headers['x-auth-token'] = cleanToken;
      }

      const reqMethod = (options.method || 'GET').toUpperCase();
      if (reqMethod !== 'GET') {
        headers['x-request-nonce'] = crypto.randomUUID();
        headers['x-request-timestamp'] = new Date().toISOString();
      }

      const response = await fetch(url, {
        ...options,
        credentials: getFetchCredentials(),
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.code === 'TOKEN_EXPIRED' && endpoint !== '/auth/refresh') {
          if (import.meta.env.DEV) console.log('[API] Token expired, attempting refresh...');
          try {
            const currentRefreshToken = getRefreshToken();
            const refreshResponse = await this.post<{accessToken: string, refreshToken: string}>('/auth/refresh', {
              refreshToken: currentRefreshToken
            });
            
            if (refreshResponse && refreshResponse.accessToken) {
              storeTokens(refreshResponse.accessToken, refreshResponse.refreshToken || currentRefreshToken || '');
              return this.request<T>(endpoint, options);
            }
          } catch (refreshError) {
            console.error('[API] Refresh failed:', refreshError);
            if (typeof window !== 'undefined') {
              clearTokens();
              localStorage.removeItem('user');
              window.location.href = '/auth';
            }
          }
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (import.meta.env.DEV) console.log(`✅ API Response: ${options.method || 'GET'} ${endpoint}`, data);
        return data;
      } else {
        const text = await response.text();
        if (import.meta.env.DEV) console.log(`✅ API Response (non-JSON): ${options.method || 'GET'} ${endpoint}`);
        return text as unknown as T;
      }
    } catch (error) {
      console.error(`❌ API Error: ${options.method || 'GET'} ${endpoint}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

export async function apiRequest(
  endpoint: string,
  method: string = "GET",
  data?: any,
  timeoutMs: number = 30000
): Promise<any> {
  const baseURL = ENV.getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getClientPlatformHeader(),
  };

  const token = await getValidTokenWithRefresh();

  if (shouldUseBearerAuth() && token) {
    const cleanToken = token.replace(/^["'](.+)["']$/, '$1');
    headers['Authorization'] = `Bearer ${cleanToken}`;
    headers['x-auth-token'] = cleanToken;
  }

  if (method !== 'GET') {
    headers['x-request-nonce'] = crypto.randomUUID();
    headers['x-request-timestamp'] = new Date().toISOString();
  }

  const controller = new AbortController();
  const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(url, {
      method,
      headers,
      credentials: getFetchCredentials(),
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal
    });

    if (timeout) clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    throw error;
  }
}
