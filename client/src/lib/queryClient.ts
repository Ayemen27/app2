import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isOnline } from "@/offline/offline-queries";
import { smartGetAll, smartSave } from "@/offline/storage-factory";
import { ENV } from './env';
import { offlineApiInterceptor, isOfflineSupportedEndpoint, triggerBackgroundSync } from "@/offline/offline-api-interceptor";
import { isValidJwt, getValidToken, isTokenExpired } from './token-utils';
import { queryKeyToStore as resolveStoreForQueryKey } from "@/offline/store-registry";
import { shouldUseBearerAuth, getAccessToken, getRefreshToken, getFetchCredentials, getClientPlatformHeader, storeTokens, clearTokens } from '@/lib/auth-token-store';

function cacheResponseToLocal(storeName: string, data: any) {
  try {
    let records: any[] = [];
    if (Array.isArray(data)) {
      records = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      records = data.data;
    } else if (data && typeof data === 'object' && data.success && Array.isArray(data.data)) {
      records = data.data;
    }
    
    let droppedCount = 0;
    const normalizedRecords = records.map((r: any) => {
      if (!r) { droppedCount++; return null; }
      if (r.id || r.key) return r;
      if (r.value !== undefined) {
        return { ...r, id: String(r.value) };
      }
      droppedCount++;
      return null;
    }).filter(Boolean);

    if (droppedCount > 0) {
      console.warn(`[Cache] ${droppedCount} سجل محذوف (بدون id/key) من ${storeName}`);
    }
    
    if (normalizedRecords.length > 0) {
      smartSave(storeName, normalizedRecords).catch((err) => {
        console.warn(`[Cache] فشل حفظ ${storeName}:`, err?.message || err);
      });
    }
  } catch (err: any) {
    console.warn(`[Cache] خطأ في تحليل بيانات ${storeName}:`, err?.message || err);
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = "حدث خطأ غير متوقع";

    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch (jsonError) {
      // معالجة خاصة لأخطاء الخادم
      if (res.status === 400) {
        errorMessage = "البيانات المدخلة غير صحيحة";
      } else if (res.status === 404) {
        errorMessage = "العنصر المطلوب غير موجود";
      } else if (res.status === 502 || res.status === 503) {
        errorMessage = "الخادم مشغول حالياً، سيتم إعادة المحاولة تلقائياً...";
      } else if (res.status === 500) {
        errorMessage = "حدث خطأ في الخادم";
      } else if (res.status >= 500) {
        errorMessage = "حدث خطأ في الخادم، يرجى المحاولة لاحقاً";
      } else {
        errorMessage = "حدث خطأ في الاتصال";
      }
    }

    const error = new Error(errorMessage) as any;
    error.status = res.status;
    throw error;
  }
}

// ✅ تم نقل إدارة التوكنات إلى AuthProvider - سيتم ربطها لاحقاً
let authProviderHelpers: {
  getAccessToken: () => string | null;
  refreshToken: () => Promise<boolean>;
  logout: () => Promise<void>;
} | null = null;

// تسجيل helpers من AuthProvider
export function registerAuthHelpers(helpers: typeof authProviderHelpers) {
  authProviderHelpers = helpers;
}

// دالة مساعدة للحصول على التوكن
function getStoredAccessToken(): string | null {
  if (authProviderHelpers) {
    return authProviderHelpers.getAccessToken();
  }
  return getAccessToken();
}

// دالة تجديد التوكن - تستخدم AuthProvider الآن
async function refreshAuthToken(): Promise<boolean> {
  if (authProviderHelpers) {
    return await authProviderHelpers.refreshToken();
  }

  // fallback للتوافق المؤقت
  if (import.meta.env.DEV) console.warn('AuthProvider helpers not registered - using fallback');
  return false;
}

export async function apiRequest(
  endpoint: string,
  method: string = "GET",
  data?: any,
  retryCount: number = 0,
  extraHeaders?: Record<string, string>
): Promise<any> {
  // اكتشاف البيئة تلقائياً لدعم دومين الإنتاج ودومين Replit
  const apiBase = ENV.getApiBaseUrl();

  let url = endpoint;
  if (!endpoint.startsWith("http")) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    url = `${apiBase}${cleanEndpoint}`;
  }

  const token = shouldUseBearerAuth() ? (typeof window !== 'undefined' ? getValidToken('accessToken') : null) : null;
  
  if (shouldUseBearerAuth() && !token) {
    console.warn(`[apiRequest] No token for request: ${method} ${endpoint}`);
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      const authError: any = new Error('انتهت الجلسة - يرجى تسجيل الدخول مجدداً');
      authError.code = 'AUTH_TOKEN_MISSING';
      authError.status = 401;
      throw authError;
    }
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...getClientPlatformHeader(),
    ...(extraHeaders || {}),
  };

  if (shouldUseBearerAuth() && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (method !== 'GET') {
    headers['x-request-nonce'] = crypto.randomUUID();
    headers['x-request-timestamp'] = new Date().toISOString();
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: getFetchCredentials(),
  };

  if (data && method !== "GET") {
    config.body = JSON.stringify(data);
  }

  try {
    if (!navigator.onLine && method !== 'GET') {
      if (isOfflineSupportedEndpoint(endpoint)) {
        if (import.meta.env.DEV) console.log(`[apiRequest] Offline - saving locally: ${method} ${endpoint}`);
        try {
          const offlineResult = await offlineApiInterceptor(endpoint, method, data);
          if (offlineResult.success) {
            window.dispatchEvent(new CustomEvent('offline-mutation-queued', { 
              detail: { endpoint, method, pendingSync: true } 
            }));
            return { ...offlineResult.data, isOffline: true, pendingSync: true };
          }
        } catch (offErr: any) {
          console.warn('[apiRequest] Local save failed:', offErr);
          throw new Error('لا يمكن حفظ البيانات محلياً بدون اتصال', { cause: offErr });
        }
      } else {
        console.warn(`[apiRequest] Endpoint not supported offline: ${endpoint}`);
        throw new Error('هذه العملية غير متاحة بدون اتصال بالإنترنت');
      }
    }

    if (import.meta.env.DEV) console.log(`[apiRequest] ${method} ${endpoint}`);

    const response = await fetch(url, config);

    // فحص نوع المحتوى
    const contentType = response.headers.get("content-type");

    if (response.status === 401) {
      if (import.meta.env.DEV) console.log('[apiRequest] 401 Unauthorized - Checking tokens...');
      
      const refreshTokenValue = shouldUseBearerAuth() ? getRefreshToken() : getValidToken("refreshToken");
      if (refreshTokenValue && isValidJwt(refreshTokenValue) && retryCount === 0) {
        try {
          const apiBase = ENV.getApiBaseUrl();
          const refreshUrl = `${apiBase}/api/auth/refresh`;
          
          if (import.meta.env.DEV) console.log('[apiRequest] Attempting silent refresh...');
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            credentials: getFetchCredentials(),
            headers: { 'Content-Type': 'application/json', ...getClientPlatformHeader() },
            body: JSON.stringify({ refreshToken: refreshTokenValue })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newAccessToken = refreshData.data?.accessToken || refreshData.accessToken;
            const newRefreshToken = refreshData.data?.refreshToken || refreshData.refreshToken;
            
            if (newAccessToken) {
              if (import.meta.env.DEV) console.log('[apiRequest] Refresh successful, retrying request');
              storeTokens(newAccessToken, newRefreshToken || refreshTokenValue);
              
              const retryHeaders: Record<string, string> = {
                ...(headers as Record<string, string>),
                ...getClientPlatformHeader(),
              };
              if (shouldUseBearerAuth()) {
                retryHeaders['Authorization'] = `Bearer ${newAccessToken}`;
              }
              
              if (method !== 'GET') {
                retryHeaders['x-request-nonce'] = crypto.randomUUID();
                retryHeaders['x-request-timestamp'] = new Date().toISOString();
              }
              const retryConfig = {
                ...config,
                credentials: getFetchCredentials(),
                headers: retryHeaders
              };
              
              const retryResponse = await fetch(url, retryConfig);
              if (!retryResponse.ok) throw new Error("فشل الطلب بعد تجديد الرمز");
              return await retryResponse.json();
            }
          } else {
            console.error('[apiRequest] Refresh response not OK:', refreshResponse.status);
          }
        } catch (e) {
          console.error('[apiRequest] Refresh failed:', e);
        }
      }

      console.warn('[apiRequest] Session expired - throwing auth error');
      throw new Error('انتهت الجلسة - يرجى تسجيل الدخول مجدداً');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let fullErrorData: any = null;
      try {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          fullErrorData = errorData;
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error(`[apiRequest] Non-JSON error response: ${method} ${endpoint} [${response.status}]`, errorText?.substring(0, 200));
        }
      } catch (parseErr: any) {
        console.warn(`[apiRequest] Failed to parse error body: ${method} ${endpoint}`, parseErr?.message);
      }
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.responseData = fullErrorData;
      throw error;
    }

    // تحقق من أن الاستجابة هي JSON
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      if (import.meta.env.DEV) console.error('[apiRequest] Server sent non-JSON response:', {
        url: endpoint,
        status: response.status,
        contentType
      });
      throw new Error(`خطأ في نوع الاستجابة: متوقع JSON لكن تم استلام ${contentType}`);
    }

    const result = await response.json();
    if (import.meta.env.DEV) console.log(`API Response: ${method} ${endpoint}`);

    if (method === 'GET') {
      try {
        const { cacheGetResponseFromJson } = await import('@/offline/offline-fallback');
        void cacheGetResponseFromJson(endpoint, result);
      } catch {
        // never block on cache
      }
    }

    return result;
  } catch (error) {
    if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Network request failed'))) {
      if (method !== 'GET') {
        if (isOfflineSupportedEndpoint(endpoint)) {
          if (import.meta.env.DEV) console.log(`[apiRequest] Network error - saving locally: ${method} ${endpoint}`);
          try {
            const offlineResult = await offlineApiInterceptor(endpoint, method, data);
            if (offlineResult.success) {
              window.dispatchEvent(new CustomEvent('offline-mutation-queued', {
                detail: { endpoint, method, pendingSync: true }
              }));
              return { ...offlineResult.data, isOffline: true, pendingSync: true };
            }
          } catch (offErr: any) {
            console.warn('[apiRequest] Network error - local save failed:', offErr);
            throw new Error('لا يمكن حفظ البيانات بدون اتصال', { cause: offErr });
          }
        } else {
          throw new Error('هذه العملية غير متاحة بدون اتصال بالإنترنت');
        }
      }
      if (method === 'GET') {
        try {
          const { getLocalFallbackPayload } = await import('@/offline/offline-fallback');
          const local = await getLocalFallbackPayload(endpoint);
          if (local) {
            console.warn(`[apiRequest] Network error — served GET from local cache: ${endpoint}`);
            return local;
          }
        } catch {
          // fall through
        }
        console.warn(`[apiRequest] GET request failed offline (no cache): ${endpoint}`);
        throw new Error('لا يوجد اتصال بالإنترنت');
      }
    }
    console.error(`[apiRequest] Error: ${method} ${endpoint}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * QueryFunction محسّن يفحص الاتصال تلقائياً
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  useLocalFallback?: boolean;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, useLocalFallback = true }) =>
    async ({ queryKey }: any) => {
      // استخدام نظام اكتشاف البيئة الموحد
      const apiBase = ENV.getApiBaseUrl();

      const endpoint = (queryKey as any[]).join("/");
      let url = endpoint;
      
      if (!endpoint.startsWith("http")) {
        if (apiBase) {
          // Ensure we don't double the domain if endpoint already includes it incorrectly
          const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
          url = `${apiBase}${cleanEndpoint}`;
        } else if (!endpoint.startsWith('/')) {
          url = `/${endpoint}`;
        }
      }
      
      async function makeQueryRequest(retryCount = 0): Promise<any> {
        // إعداد timeout للطلب
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s

        try {
          // ✅ فحص الاتصال قبل البدء
          const online = isOnline();

          if (!online && useLocalFallback) {
            console.warn(`[QueryClient] Offline - fetching local data for: ${(queryKey as any[]).join("/")}`);
            try {
              const storeName = resolveStoreForQueryKey(queryKey);
              if (storeName) {
                const localData = await smartGetAll(storeName);
                if (localData && Array.isArray(localData) && localData.length > 0) {
                  return localData as any;
                }
              }
              console.warn(`[QueryClient] No local data for ${(queryKey as any[]).join("/")}`);
              return [] as any;
            } catch (localError: any) {
              console.warn('[QueryClient] Failed to fetch local data:', localError?.message || localError);
              return [] as any;
            }
          }

        const headers: Record<string, string> = {
          ...getClientPlatformHeader(),
        };
        let accessToken = getStoredAccessToken();

        if (accessToken && isTokenExpired(accessToken)) {
          if (import.meta.env.DEV) console.log('[QueryClient] Access token expired, attempting proactive refresh...');
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            accessToken = getStoredAccessToken();
          } else {
            accessToken = null;
          }
        }

        if (shouldUseBearerAuth() && accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        if (import.meta.env.DEV) console.log(`[QueryClient] Sending request: ${url}`);

        const res = await fetch(url, {
          headers,
          credentials: getFetchCredentials(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          if (res.status === 401 && retryCount === 0) {
            if (import.meta.env.DEV) console.log('[QueryClient] 401 - attempting token refresh...');
            const refreshTokenValue = shouldUseBearerAuth() ? getRefreshToken() : getValidToken("refreshToken");
            if (refreshTokenValue && isValidJwt(refreshTokenValue)) {
              try {
                const refreshApiBase = ENV.getApiBaseUrl();
                const refreshUrl = `${refreshApiBase}/api/auth/refresh`;
                const refreshRes = await fetch(refreshUrl, {
                  method: 'POST',
                  credentials: getFetchCredentials(),
                  headers: { 'Content-Type': 'application/json', ...getClientPlatformHeader() },
                  body: JSON.stringify({ refreshToken: refreshTokenValue })
                });
                if (refreshRes.ok) {
                  const refreshData = await refreshRes.json();
                  const newToken = refreshData.data?.accessToken || refreshData.accessToken;
                  const newRefresh = refreshData.data?.refreshToken || refreshData.refreshToken;
                  if (newToken) {
                    if (import.meta.env.DEV) console.log('[QueryClient] Token refreshed successfully, retrying...');
                    storeTokens(newToken, newRefresh || refreshTokenValue);
                    return makeQueryRequest(retryCount + 1);
                  }
                }
              } catch (refreshErr) {
                console.error('[QueryClient] Token refresh failed:', refreshErr);
              }
            }
            console.error('[QueryClient] Unauthorized (401) - refresh failed');
            throw new Error(`Authentication Error (401)`);
          }
          if (res.status === 401) {
            throw new Error(`Authentication Error (401)`);
          }
          const errorData = await res.json().catch(() => ({ message: `Error ${res.status}` }));
          throw new Error(errorData?.message || errorData?.error || `Error ${res.status}`);
        }

        const data = await res.json();

        if (import.meta.env.DEV) console.log(`[QueryClient] Response received for ${queryKey.join("/")}`);

        // استخراج البيانات الفعلية دون إجبار على مصفوفة فارغة
        if (data && typeof data === 'object') {
          // للتحقق من endpoints الهجرة التي تُرجع objects
          const isMigrationEndpoint = typeof queryKey[0] === 'string' && queryKey[0].includes('migration');

          // إذا كانت البيانات في الشكل { success, data, count } (شكل API)
          if (data.success !== undefined && data.hasOwnProperty('data')) {

            // لنقاط النهاية الخاصة بالهجرة، نُرجع البيانات كما هي
            if (isMigrationEndpoint) {
              return data.data;
            }

            if (data.data === null || data.data === undefined) {
              return [];
            }

            const cacheStore = resolveStoreForQueryKey(queryKey);
            if (cacheStore && data.data) {
              cacheResponseToLocal(cacheStore, data.data);
            }

            return data.data;
          }

          if (Array.isArray(data)) {
            const cacheStore = resolveStoreForQueryKey(queryKey);
            if (cacheStore) {
              cacheResponseToLocal(cacheStore, data);
            }
            return data;
          }

          if (data.data !== undefined) {
            const cacheStore = resolveStoreForQueryKey(queryKey);
            if (cacheStore && data.data) {
              cacheResponseToLocal(cacheStore, data.data);
            }
            return data.data !== null ? data.data : [];
          }
        }

        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && (
          fetchError.message.includes('Failed to fetch') || 
          fetchError.message.includes('NetworkError') || 
          fetchError.message.includes('Network request failed') ||
          fetchError.name === 'AbortError' ||
          fetchError.name === 'TypeError'
        )) {
          console.warn(`[QueryClient] Network error - fetching local data for: ${(queryKey as any[]).join("/")}`);
          try {
            const storeName = resolveStoreForQueryKey(queryKey);
            if (storeName) {
              const localData = await smartGetAll(storeName);
              if (localData && Array.isArray(localData) && localData.length > 0) {
                return localData as any;
              }
            }
            console.warn(`[QueryClient] Network error + no local fallback for ${(queryKey as any[]).join("/")}`);
            return [] as any;
          } catch (fallbackErr: any) {
            console.warn(`[QueryClient] Local fallback also failed for ${(queryKey as any[]).join("/")}:`, fallbackErr?.message || fallbackErr);
            return [] as any;
          }
        }

        throw fetchError;
      }
    }

    return makeQueryRequest();
  };

// ⚡ إعدادات التخزين المؤقت الذكي للأداء العالي
const CACHE_TIMES = {
  // البيانات المرجعية (نادراً ما تتغير): 10 دقائق
  REFERENCE_DATA: 1000 * 60 * 10,
  // البيانات النشطة (تتغير أكثر): 5 دقائق  
  ACTIVE_DATA: 1000 * 60 * 5,
  // وقت الاحتفاظ بالذاكرة: 30 دقيقة
  GC_TIME: 1000 * 60 * 30,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw", useLocalFallback: true }),
      refetchInterval: false,
      // ⚡ تعطيل إعادة الجلب عند التركيز لتحسين الأداء
      refetchOnWindowFocus: false,
      // ⚡ البيانات تبقى صالحة لـ دقيقة كافتراضي
      staleTime: 60 * 1000, 
      // ⚡ الاحتفاظ بالبيانات في الذاكرة لـ 5 دقائق
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 429) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnReconnect: 'always',
      // ⚡ لا تعيد الجلب عند التحميل إذا كانت البيانات محفوظة
      refetchOnMount: false,
      // ⚡ الاحتفاظ بالبيانات السابقة أثناء التحميل
      placeholderData: (previousData: any) => previousData,
    },
    mutations: {
      retry: 1,
    },
  },
});

import { QUERY_KEYS as UNIFIED_KEYS } from "@/constants/queryKeys";
import { API_ENDPOINTS } from "@/constants/api";

// Use unified keys
export const QUERY_KEYS = UNIFIED_KEYS;


// ⚡ دالة لتحميل البيانات مسبقاً عند تسجيل الدخول
export async function prefetchCoreData() {
  if (import.meta.env.DEV) console.log('[Prefetch] Prefetching core data...');
  const startTime = Date.now();
  
  const prefetchPromises = [
    // بيانات مرجعية بـ staleTime طويل (10 دقائق)
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.projects,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.projectsWithStats,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.workers,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.materials,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.suppliers,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.autocomplete,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    // الإشعارات
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.notifications,
      staleTime: CACHE_TIMES.ACTIVE_DATA,
    }),
  ];
  
  try {
    await Promise.all(prefetchPromises);
    const duration = Date.now() - startTime;
    if (import.meta.env.DEV) console.log(`[Prefetch] Core data loaded in ${duration}ms`);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[Prefetch] Failed to load some data:', error);
  }
}

// ⚡ دالة لمسح الكاش عند تسجيل الخروج
export function clearAllCache() {
  if (import.meta.env.DEV) console.log('[Cache] Clearing all cached data...');
  queryClient.clear();
}

export async function invalidateAllProjectData(project_id?: string) {
  if (import.meta.env.DEV) console.log('[QueryClient] Invalidating all project data:', project_id);
  
  const startTime = Date.now();
  
  const keysToInvalidate = [
    ["/api/projects"],
    ["/api/projects/with-stats"],
    ["/api/workers"],
    ["/api/worker-attendance"],
    ["/api/material-purchases"],
    ["/api/fund-transfers"],
    ["/api/transportation-expenses"],
    ["/api/worker-transfers"],
    ["/api/worker-misc-expenses"],
    ["/api/suppliers"],
    ["/api/daily-expense-summaries"],
    ["/api/materials"],
    ["/api/notifications"],
  ];

  await queryClient.cancelQueries();

  const invalidatePromises = keysToInvalidate.map(key => 
    queryClient.invalidateQueries({ 
      queryKey: key, 
      refetchType: 'all',
      exact: false 
    })
  );

  if (project_id && project_id !== 'all') {
    invalidatePromises.push(
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some(k => String(k) === project_id);
        },
        refetchType: 'all'
      })
    );
  }

  await Promise.all(invalidatePromises);

  await queryClient.refetchQueries({ 
    type: 'active',
    exact: false
  });

  const duration = Date.now() - startTime;
  if (import.meta.env.DEV) console.log(`[QueryClient] All data invalidated in ${duration}ms`);
}

export function invalidateDateRelatedData(project_id: string, date: string) {
  if (import.meta.env.DEV) console.log('[QueryClient] Invalidating date-related data:', { project_id, date });
  
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.dailyExpenses(project_id, date),
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.previousBalance(project_id, date),
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.dailySummary(project_id, date),
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.dailyProjectTransfers(project_id, date),
    refetchType: 'active'
  });
}
