import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isOnline } from "@/offline/offline-queries";
import { smartGetAll } from "@/offline/storage-factory";
import { ENV } from './env';
import { offlineApiInterceptor, isOfflineSupportedEndpoint, triggerBackgroundSync } from "@/offline/offline-api-interceptor";

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
  // fallback للتوافق المؤقت
  return localStorage.getItem('accessToken');
}

// دالة تجديد التوكن - تستخدم AuthProvider الآن
async function refreshAuthToken(): Promise<boolean> {
  if (authProviderHelpers) {
    return await authProviderHelpers.refreshToken();
  }

  // fallback للتوافق المؤقت
  console.warn('⚠️ AuthProvider helpers غير مسجلة - استخدام fallback');
  return false;
}

export async function apiRequest(
  endpoint: string,
  method: string = "GET",
  data?: any,
  retryCount: number = 0
): Promise<any> {
  // اكتشاف البيئة تلقائياً لدعم دومين الإنتاج ودومين Replit
  const apiBase = ENV.getApiBaseUrl();

  let url = endpoint;
  if (!endpoint.startsWith("http")) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    url = `${apiBase}${cleanEndpoint}`;
  }

  // ✅ جلب التوكن من localStorage بشكل مباشر
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  if (!token) {
    console.warn(`⚠️ [apiRequest] لا يوجد توكن للطلب: ${method} ${endpoint}`);
    // إذا لم يكن هناك توكن ولسنا في صفحة تسجيل الدخول، نطلب تسجيل الدخول
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !endpoint.includes('/auth/login')) {
       // بدلاً من التوجيه الفوري، سنسمح للـ fetch بالفشل بـ 401 أو نلقي خطأ
    }
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // ✅ إضافة التوكن إذا كان موجوداً
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // ✅ لا نرسل x-auth-token أو user-id headers لضمان توافق CORS
  // الخادم يستخدم Authorization Bearer للمصادقة فقط

  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (data && method !== "GET") {
    config.body = JSON.stringify(data);
  }

  try {
    if (!navigator.onLine && method !== 'GET' && isOfflineSupportedEndpoint(endpoint)) {
      console.log(`📴 [apiRequest] بدون اتصال - تحويل لحفظ محلي: ${method} ${endpoint}`);
      const offlineResult = await offlineApiInterceptor(endpoint, method, data);
      if (offlineResult.success) {
        window.dispatchEvent(new CustomEvent('offline-mutation-queued', { 
          detail: { endpoint, method, pendingSync: true } 
        }));
        return { ...offlineResult.data, isOffline: true, pendingSync: true };
      }
    }

    console.log(`🔄 API Request: ${method} ${endpoint}`, data || '');

    const response = await fetch(url, config);

    // فحص نوع المحتوى
    const contentType = response.headers.get("content-type");

    // إذا كان الرد 401 ولم نحاول التجديد بعد
    if (response.status === 401) {
      console.log('🔄 [apiRequest] 401 Unauthorized - Checking tokens...');
      
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (refreshTokenValue && retryCount === 0) {
        try {
          const apiBase = ENV.getApiBaseUrl();
          const refreshUrl = `${apiBase}/api/auth/refresh`;
          
          console.log('🔄 [apiRequest] Attempting silent refresh...');
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: refreshTokenValue })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newAccessToken = refreshData.data?.accessToken || refreshData.accessToken;
            const newRefreshToken = refreshData.data?.refreshToken || refreshData.refreshToken;
            
            if (newAccessToken) {
              console.log('✅ [apiRequest] Refresh successful, retrying request');
              localStorage.setItem("accessToken", newAccessToken);
              if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
              
              // ✅ تحديث الـ headers للطلب المعاد
              const retryHeaders = {
                ...headers,
                'Authorization': `Bearer ${newAccessToken}`
              };
              
              const retryConfig = {
                ...config,
                headers: retryHeaders
              };
              
              const retryResponse = await fetch(url, retryConfig);
              if (!retryResponse.ok) throw new Error("فشل الطلب بعد تجديد الرمز");
              return await retryResponse.json();
            }
          } else {
            console.error('❌ [apiRequest] Refresh response not OK:', refreshResponse.status);
          }
        } catch (e) {
          console.error('❌ [apiRequest] Refresh failed:', e);
        }
      }

      // إذا وصلنا هنا، يعني فشل التجديد أو لا يوجد توكن
      if (!window.location.pathname.includes('/login')) {
        console.warn('🚫 [apiRequest] Session expired, but staying in-place for offline support.');
        // ✅ منع التوجيه القسري لضمان استمرارية العمل أوفلاين
        return null; 
      }
      throw new Error('انتهت الجلسة');
    }

    if (!response.ok) {
      // محاولة استخراج رسالة الخطأ من JSON
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          const errorText = await response.text();
          console.error('❌ [apiRequest] الخادم أرسل text/html; charset=UTF-8 بدلاً من JSON:', {
            url: endpoint,
            method,
            status: response.status,
            contentType,
            responsePreview: errorText.substring(0, 200)
          });
        }
      } catch (e) {
        // إذا فشل parse JSON، استخدم الرسالة الافتراضية
      }
      throw new Error(errorMessage);
    }

    // تحقق من أن الاستجابة هي JSON
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      console.error('❌ [apiRequest] الخادم أرسل text/html; charset=UTF-8 بدلاً من JSON:', {
        url: endpoint,
        method,
        status: response.status,
        contentType,
        responsePreview: responseText.substring(0, 200)
      });
      throw new Error(`خطأ في نوع الاستجابة: متوقع JSON لكن تم استلام ${contentType}`);
    }

    const result = await response.json();
    console.log(`✅ API Response: ${method} ${endpoint}`, result);
    return result;
  } catch (error) {
    if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Network request failed'))) {
      if (method !== 'GET' && isOfflineSupportedEndpoint(endpoint)) {
        console.log(`📴 [apiRequest] خطأ شبكة - تحويل لحفظ محلي: ${method} ${endpoint}`);
        try {
          const offlineResult = await offlineApiInterceptor(endpoint, method, data);
          if (offlineResult.success) {
            window.dispatchEvent(new CustomEvent('offline-mutation-queued', {
              detail: { endpoint, method, pendingSync: true }
            }));
            return { ...offlineResult.data, isOffline: true, pendingSync: true };
          }
        } catch (offErr) {
          console.error('❌ [apiRequest] فشل الحفظ المحلي أيضاً:', offErr);
        }
      }
    }
    console.error(`❌ API Error: ${method} ${endpoint}`, error);
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
          console.log(`🌐 [QueryClient] حالة الاتصال: ${online ? 'متصل' : 'غير متصل'}`);

          if (!online && useLocalFallback) {
            console.log(`📡 [QueryClient] بدون إنترنت - محاولة جلب البيانات محلياً لـ: ${(queryKey as any[]).join("/")}`);
            try {
              const tableName = (queryKey as any[])[0].startsWith('/api/') ? (queryKey as any[])[0].substring(5) : (queryKey as any[])[0];
              const localData = await smartGetAll(tableName as string);
              if (localData && Array.isArray(localData) && localData.length > 0) {
                console.log(`✅ [QueryClient] تم استعادة ${localData.length} سجل محلياً`);
                return localData as any;
              }
            } catch (localError) {
              console.error(`❌ [QueryClient] فشل جلب البيانات المحلية:`, localError);
            }
          }

        // إعداد headers مع Authorization
        const headers: Record<string, string> = {};
        const accessToken = getStoredAccessToken();
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        console.log(`🔍 [QueryClient] إرسال طلب: ${url}`, {
          hasToken: !!accessToken,
          online: isOnline()
        });

        const res = await fetch(url, {
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          if (res.status === 401 && retryCount === 0) {
            console.log('🔄 [QueryClient] 401 - محاولة تجديد التوكن...');
            const refreshTokenValue = localStorage.getItem("refreshToken");
            if (refreshTokenValue) {
              try {
                const refreshApiBase = ENV.getApiBaseUrl();
                const refreshUrl = `${refreshApiBase}/api/auth/refresh`;
                const refreshRes = await fetch(refreshUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken: refreshTokenValue })
                });
                if (refreshRes.ok) {
                  const refreshData = await refreshRes.json();
                  const newToken = refreshData.data?.accessToken || refreshData.accessToken;
                  const newRefresh = refreshData.data?.refreshToken || refreshData.refreshToken;
                  if (newToken) {
                    console.log('✅ [QueryClient] تم تجديد التوكن بنجاح، إعادة الطلب...');
                    localStorage.setItem("accessToken", newToken);
                    if (newRefresh) localStorage.setItem("refreshToken", newRefresh);
                    return makeQueryRequest(retryCount + 1);
                  }
                }
              } catch (refreshErr) {
                console.error('❌ [QueryClient] فشل تجديد التوكن:', refreshErr);
              }
            }
            console.error('❌ [QueryClient] Unauthorized (401) - فشل التجديد');
            throw new Error(`Authentication Error (401)`);
          }
          if (res.status === 401) {
            throw new Error(`Authentication Error (401)`);
          }
          const errorData = await res.json().catch(() => ({ message: `Error ${res.status}` }));
          throw new Error(errorData?.message || `Error ${res.status}`);
        }

        const data = await res.json();

        console.log(`✅ [QueryClient] استجابة ناجحة لـ ${queryKey.join("/")}:`, {
          hasData: !!data,
          dataType: typeof data
        });

        // تسجيل مبسط في بيئة التطوير فقط
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 ${queryKey[0]} - تم استلام البيانات بنجاح`);

          // إضافة debugging خاص للإشعارات - مع guard للأمان
          if (typeof queryKey[0] === 'string' && queryKey[0].includes('notifications')) {
            console.log('🔍 [DEBUG] تفاصيل استجابة الإشعارات:', {
              dataType: typeof data,
              isArray: Array.isArray(data),
              dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A',
              dataContent: data
            });
          }
        }

        // 🔍 تشخيص مفصل للبيانات المستلمة
        console.log(`📊 [QueryClient] تحليل البيانات لـ ${queryKey.join("/")}:`, {
          dataType: typeof data,
          isObject: data && typeof data === 'object',
          hasSuccess: data?.success !== undefined,
          hasDataProperty: data?.data !== undefined,
          actualDataValue: data?.data,
          rawData: data
        });

        // استخراج البيانات الفعلية دون إجبار على مصفوفة فارغة
        if (data && typeof data === 'object') {
          // للتحقق من endpoints الهجرة التي تُرجع objects
          const isMigrationEndpoint = typeof queryKey[0] === 'string' && queryKey[0].includes('migration');

          // إذا كانت البيانات في الشكل { success, data, count } (شكل API)
          if (data.success !== undefined && data.hasOwnProperty('data')) {
            console.log(`✅ [QueryClient] بيانات API صحيحة لـ ${queryKey.join("/")}:`, {
              success: data.success,
              dataExists: data.data !== undefined,
              dataType: typeof data.data
            });

            // لنقاط النهاية الخاصة بالهجرة، نُرجع البيانات كما هي
            if (isMigrationEndpoint) {
              return data.data;
            }

            // إذا كانت null أو undefined، إرجاع مصفوفة فارغة لضمان عدم كسر الواجهة
            if (data.data === null || data.data === undefined) {
              return [];
            }

            return data.data;
          }

          // إذا كانت البيانات مصفوفة مباشرة (شكل Replit)
          if (Array.isArray(data)) {
            console.log(`📋 [QueryClient] مصفوفة مباشرة لـ ${queryKey.join("/")}:`, data.length);
            return data;
          }

          // إذا كان لديها خاصية data مباشرة
          if (data.data !== undefined) {
            console.log(`🔗 [QueryClient] خاصية data مباشرة لـ ${queryKey.join("/")}:`, data.data);
            return data.data !== null ? data.data : [];
          }
        }

        console.log(`🔄 [QueryClient] إرجاع البيانات كما هي لـ ${queryKey.join("/")}:`, data);
        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ [QueryClient] timeout لـ ${queryKey.join("/")}`);
          throw new Error('انتهت مهلة الطلب، يرجى المحاولة مرة أخرى');
        }

        console.error(`❌ [QueryClient] خطأ في ${queryKey.join("/")}`, error);
        throw error;
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
      // ⚡ البيانات تبقى صالحة لـ 10 دقائق للبيانات المرجعية و 5 للديناميكية
      staleTime: 1000 * 60 * 5, 
      // ⚡ الاحتفاظ بالبيانات في الذاكرة لـ 60 دقيقة
      gcTime: 1000 * 60 * 60,
      retry: false,
      refetchOnReconnect: false,
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
  console.log('🚀 [Prefetch] بدء تحميل البيانات الأساسية مسبقاً...');
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
    console.log(`✅ [Prefetch] تم تحميل جميع البيانات الأساسية في ${duration}ms`);
  } catch (error) {
    console.warn('⚠️ [Prefetch] فشل تحميل بعض البيانات:', error);
  }
}

// ⚡ دالة لمسح الكاش عند تسجيل الخروج
export function clearAllCache() {
  console.log('🧹 [Cache] مسح جميع البيانات المخزنة...');
  queryClient.clear();
}

export async function invalidateAllProjectData(projectId?: string) {
  console.log('⚡ [QueryClient] تحديث فوري لجميع بيانات المشروع:', projectId);
  
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

  if (projectId && projectId !== 'all') {
    invalidatePromises.push(
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some(k => String(k) === projectId);
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
  console.log(`✅ [QueryClient] تم تحديث جميع البيانات في ${duration}ms`);
}

export function invalidateDateRelatedData(projectId: string, date: string) {
  console.log('🔄 [QueryClient] تحديث فوري لبيانات التاريخ:', { projectId, date });
  
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.dailyExpenses(projectId, date),
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.previousBalance(projectId, date),
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.dailySummary(projectId, date),
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: QUERY_KEYS.dailyProjectTransfers(projectId, date),
    refetchType: 'active'
  });
}
