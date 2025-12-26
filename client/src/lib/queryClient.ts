import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  // استخدام API_BASE_URL من متغيرات البيئة الآمنة (Secrets)
  // أولاً نحاول VITE_API_BASE_URL (للـ production)، ثم VITE_API_URL، ثم window.location.origin
  const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || window.location.origin;
  const url = `${endpoint.startsWith("http") ? "" : apiBase}${endpoint}`;

  // ✅ جلب التوكن من localStorage بشكل مباشر - لا تعتمد على authProviderHelpers
  const token = localStorage.getItem('accessToken');
  
  // ✅ تسجيل شامل لحالة التوكن
  if (!token) {
    console.error(`❌ [apiRequest] لا يوجد توكن في localStorage للطلب: ${method} ${endpoint}`);
    console.error(`❌ [apiRequest] localStorage contents:`, Object.keys(localStorage));
  } else {
    console.log(`🔐 [apiRequest] ✅ تم إضافة التوكن للطلب: ${method} ${endpoint}`);
    console.log(`🔐 [apiRequest] التوكن الأول 20 حرف: ${token.substring(0, 20)}...`);
  }
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // ✅ يجب إضافة التوكن حتماً إذا كان موجوداً
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log(`🔐 [apiRequest] تم إضافة رأس Authorization:`, Object.keys(headers));
  } else {
    console.error(`❌ [apiRequest] تحذير: إرسال طلب بدون توكن!`);
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (data && method !== "GET") {
    config.body = JSON.stringify(data);
  }

  try {
    console.log(`🔄 API Request: ${method} ${endpoint}`, data || '');

    const response = await fetch(url, config);

    // فحص نوع المحتوى
    const contentType = response.headers.get("content-type");

    // إذا كان الرد 401 ولم نحاول التجديد بعد
    if (response.status === 401 && retryCount === 0) {
      console.log('🔄 [apiRequest] محاولة تجديد الـ token...');

      // محاولة تجديد الـ token
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || window.location.origin;
          const refreshResponse = await fetch(`${apiBase}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ refreshToken })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            
            // التحقق من نجاح الاستجابة
            if (refreshData.success === false) {
              console.log('❌ [apiRequest] فشل تجديد الـ token: الاستجابة غير ناجحة');
            } else {
              const newAccessToken = refreshData.data?.accessToken || refreshData.accessToken;
              const newRefreshToken = refreshData.data?.refreshToken || refreshData.refreshToken;
              
              if (newAccessToken) {
                localStorage.setItem("accessToken", newAccessToken);
                
                // حفظ refreshToken الجديد إذا تم إرجاعه
                if (newRefreshToken) {
                  localStorage.setItem("refreshToken", newRefreshToken);
                }
                
                console.log('✅ [apiRequest] تم تجديد الـ token بنجاح، إعادة المحاولة...');

                // إعادة المحاولة مع الـ token الجديد
                return apiRequest(endpoint, method, data, retryCount + 1);
              }
            }
          }
        } catch (refreshError) {
          console.error('❌ [apiRequest] فشل تجديد الـ token:', refreshError);
        }
      }

      // إذا فشل التجديد، حذف البيانات وإعادة التوجيه
      console.log('🚪 [apiRequest] فشل تجديد الـ token، إعادة التوجيه لتسجيل الدخول...');
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = '/login';
      throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
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
    console.error(`❌ API Error: ${method} ${endpoint}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {

    async function makeQueryRequest(retryCount = 0): Promise<any> {
      // إعداد timeout للطلب
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        // إعداد headers مع Authorization
        const headers: Record<string, string> = {};
        const accessToken = getStoredAccessToken();
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        console.log(`🔍 [QueryClient] إرسال طلب: ${queryKey.join("/")}`, {
          hasToken: !!accessToken
        });

        const res = await fetch(queryKey.join("/") as string, {
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

      // التعامل مع خطأ 401 - إظهار السبب الحقيقي
        if (res.status === 401) {
          console.error(`🚫 [QueryClient] خطأ 401 غير مصرح لـ ${queryKey.join("/")}`, { 
            retryCount,
            hasToken: !!localStorage.getItem('accessToken'),
            queryKey: queryKey.join("/")
          });

          // ❌ إزالة returnNull التي تُخفي الأخطاء الحقيقية
          // if (unauthorizedBehavior === "returnNull") {
          //   return null as any;
          // }

          // محاولة تجديد التوكن إذا كانت المحاولة الأولى
          if (retryCount === 0) {
            console.log('🔄 محاولة تجديد التوكن في query...');
            const refreshed = await refreshAuthToken();
            if (refreshed) {
              console.log('✅ تم تجديد التوكن، إعادة تشغيل query...');
              return makeQueryRequest(1);
            }
          }

          // إذا فشل التجديد - إظهار الخطأ الحقيقي بدلاً من إخفاءه
          console.error('❌ فشل المصادقة - إظهار الخطأ الحقيقي');
          throw new Error(`خطأ في المصادقة (401): ${queryKey.join("/")} - يرجى تسجيل الدخول مرة أخرى`);
        }

        await throwIfResNotOk(res);
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
          if (data.success !== undefined && data.data !== undefined) {
            console.log(`✅ [QueryClient] بيانات API صحيحة لـ ${queryKey.join("/")}:`, {
              success: data.success,
              dataExists: data.data !== null,
              dataType: typeof data.data,
              isArray: Array.isArray(data.data)
            });

            // لنقاط النهاية الخاصة بالهجرة، نُرجع البيانات كما هي
            if (isMigrationEndpoint) {
              return data.data; // إرجاع البيانات كما هي (object أو array)
            }

            // ✅ إصلاح جذري: إرجاع البيانات كما هي دون تعديل
            // إذا كانت null أو undefined فقط، إرجاع مصفوفة فارغة
            if (data.data === null || data.data === undefined) {
              console.warn(`⚠️ [QueryClient] البيانات null/undefined لـ ${queryKey.join("/")} - إرجاع مصفوفة فارغة`);
              return [];
            }

            return data.data; // إرجاع البيانات الحقيقية كما هي
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
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // ⚡ تعطيل إعادة الجلب عند التركيز لتحسين الأداء
      refetchOnWindowFocus: false,
      // ⚡ البيانات تبقى صالحة لـ 5 دقائق (بدلاً من 3 ثوان)
      staleTime: CACHE_TIMES.ACTIVE_DATA,
      // ⚡ الاحتفاظ بالبيانات في الذاكرة لـ 30 دقيقة
      gcTime: CACHE_TIMES.GC_TIME,
      retry: 1,
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

// ⚡ Query Keys للتخزين المؤقت الذكي
export const QUERY_KEYS = {
  // بيانات مرجعية (تخزين طويل)
  PROJECTS: ["/api/projects"],
  PROJECTS_WITH_STATS: ["/api/projects/with-stats"],
  WORKERS: ["/api/workers"],
  MATERIALS: ["/api/materials"],
  SUPPLIERS: ["/api/suppliers"],
  AUTOCOMPLETE: ["/api/autocomplete"],
  
  // بيانات ديناميكية (تخزين متوسط)
  NOTIFICATIONS: ["/api/notifications"],
  FUND_TRANSFERS: ["/api/fund-transfers"],
  WORKER_ATTENDANCE: ["/api/worker-attendance"],
  MATERIAL_PURCHASES: ["/api/material-purchases"],
  TRANSPORTATION: ["/api/transportation-expenses"],
  WORKER_TRANSFERS: ["/api/worker-transfers"],
  WORKER_MISC: ["/api/worker-misc-expenses"],
};

// ⚡ دالة لتحميل البيانات مسبقاً عند تسجيل الدخول
export async function prefetchCoreData() {
  console.log('🚀 [Prefetch] بدء تحميل البيانات الأساسية مسبقاً...');
  const startTime = Date.now();
  
  const prefetchPromises = [
    // بيانات مرجعية بـ staleTime طويل (10 دقائق)
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.PROJECTS,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.PROJECTS_WITH_STATS,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.WORKERS,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.MATERIALS,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.SUPPLIERS,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.AUTOCOMPLETE,
      staleTime: CACHE_TIMES.REFERENCE_DATA,
    }),
    // الإشعارات
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.NOTIFICATIONS,
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
    queryKey: ["/api/projects", projectId, "daily-expenses", date],
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: ["/api/projects", projectId, "previous-balance", date],
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: ["/api/projects", projectId, "daily-summary", date],
    refetchType: 'active'
  });
  queryClient.invalidateQueries({ 
    queryKey: ["/api/daily-project-transfers", projectId, date],
    refetchType: 'active'
  });
}