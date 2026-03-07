import { Capacitor } from '@capacitor/core';
import { ENV } from './env';
import { getValidToken, isValidJwt, isTokenExpired } from './token-utils';

// عميل API محسن لمعالجة الأخطاء والاتصالات
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = `${ENV.getApiBaseUrl()}/api`;
  }

  private async getTokenWithRefresh(): Promise<string | null> {
    let token = getValidToken('accessToken');
    if (token) return token;

    const rawToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (rawToken && isValidJwt(rawToken) && isTokenExpired(rawToken)) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && isValidJwt(refreshToken) && !isTokenExpired(refreshToken)) {
        try {
          console.log('[ApiClient] Access token expired, attempting proactive refresh...');
          const refreshResponse = await this.post<{accessToken: string, refreshToken: string}>('/auth/refresh', {
            refreshToken
          });
          if (refreshResponse && refreshResponse.accessToken) {
            localStorage.setItem('accessToken', refreshResponse.accessToken);
            if (refreshResponse.refreshToken) {
              localStorage.setItem('refreshToken', refreshResponse.refreshToken);
            }
            return refreshResponse.accessToken;
          }
        } catch (e) {
          console.error('[ApiClient] Proactive refresh failed:', e);
        }
      }
    }
    return null;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (Capacitor.getPlatform() !== 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn(`[API] Offline mode on ${Capacitor.getPlatform()}: skipping direct request to ${endpoint}`);
      throw new Error('OFFLINE_MODE');
    }

    const isAuthEndpoint = endpoint === '/auth/refresh' || endpoint === '/auth/login';
    const token = isAuthEndpoint
      ? (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null)
      : await this.getTokenWithRefresh();

    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, options.body || '');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token && token !== 'undefined' && token !== 'null') {
        const cleanToken = token.replace(/^["'](.+)["']$/, '$1');
        headers['Authorization'] = `Bearer ${cleanToken}`;
        headers['x-auth-token'] = cleanToken;
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.code === 'TOKEN_EXPIRED' && endpoint !== '/auth/refresh') {
          console.log('🔄 [API] Token expired, attempting refresh...');
          try {
            const refreshResponse = await this.post<{accessToken: string, refreshToken: string}>('/auth/refresh', {
              refreshToken: localStorage.getItem('refreshToken')
            });
            
            if (refreshResponse && refreshResponse.accessToken) {
              localStorage.setItem('accessToken', refreshResponse.accessToken);
              if (refreshResponse.refreshToken) {
                localStorage.setItem('refreshToken', refreshResponse.refreshToken);
              }
              
              // Retry the original request
              return this.request<T>(endpoint, options);
            }
          } catch (refreshError) {
            console.error('❌ [API] Refresh failed:', refreshError);
            // تسجيل الخروج تلقائياً عند فشل التجديد نهائياً
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              // إعادة التوجيه لصفحة تسجيل الدخول
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
        console.log(`✅ API Response: ${options.method || 'GET'} ${endpoint}`, data);
        return data;
      } else {
        const text = await response.text();
        console.log(`✅ API Response (non-JSON): ${options.method || 'GET'} ${endpoint}`);
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

// Helper for making API requests (for backward compatibility)
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
  };

  let token = getValidToken('accessToken');
  if (!token) {
    const rawToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (rawToken && isValidJwt(rawToken) && isTokenExpired(rawToken)) {
      const refreshTokenVal = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (refreshTokenVal && isValidJwt(refreshTokenVal) && !isTokenExpired(refreshTokenVal)) {
        try {
          console.log('[apiRequest] Access token expired, attempting proactive refresh...');
          const refreshUrl = `${baseURL}/api/auth/refresh`;
          const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: refreshTokenVal })
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.data?.accessToken || refreshData.accessToken;
            const newRefresh = refreshData.data?.refreshToken || refreshData.refreshToken;
            if (newToken) {
              localStorage.setItem('accessToken', newToken);
              if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
              token = newToken;
            }
          }
        } catch (e) {
          console.error('[apiRequest] Proactive refresh failed:', e);
        }
      }
    }
  }

  if (token) {
    const cleanToken = token.replace(/^["'](.+)["']$/, '$1');
    headers['Authorization'] = `Bearer ${cleanToken}`;
    headers['x-auth-token'] = cleanToken;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeout);

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
    clearTimeout(timeout);
    throw error;
  }
}
