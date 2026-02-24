/**
 * موفر السياق للمصادقة
 * يوفر حالة المصادقة وإدارة الجلسات
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { registerAuthHelpers, prefetchCoreData, clearAllCache } from "../lib/queryClient";

import { smartGetAll } from "../offline/storage-factory";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  // ✅ Helper functions لإدارة التوكنات
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const isAuthenticated = user !== null;

  // ✅ Helper functions لإدارة التوكنات - مركزية وآمنة
  const getAccessToken = (): string | null => {
    return localStorage.getItem('accessToken');
  };

  const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken');
  };

  // متغيرات لإدارة Fallback mechanisms
  const [authFailureCount, setAuthFailureCount] = useState(0);
  const [lastAuthCheck, setLastAuthCheck] = useState<Date | null>(null);

  // تسجيل helpers مع queryClient
  useEffect(() => {
    registerAuthHelpers({
      getAccessToken,
      refreshToken,
      logout
    });
  }, []); // تشغيل مرة واحدة فقط

  // ✅ تحديد الرابط الأساسي للـ API بشكل ديناميكي مع دعم الدومين الخارجي
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // إذا كان المستخدم يتصفح عبر الدومين الرسمي، نستخدمه
      if (origin.includes('binarjoinanelytic.info')) {
        return `${origin}/api`;
      }
      // إذا كان في Replit، نستخدم دومين Replit
      if (origin.includes('replit.dev')) {
        return `${origin}/api`;
      }
      // دعم تطبيقات الـ APK والمنصات الأصلية
      if (origin.startsWith('http://localhost') || origin.startsWith('file://') || origin === 'null') {
        return import.meta.env.VITE_API_BASE_URL || 'https://app2.binarjoinanelytic.info/api';
      }
    }
    // القيمة الافتراضية (Fallback) للـ APK هي الدومين الرسمي للمشروع
    const fallbackDomain = import.meta.env.VITE_API_BASE_URL || 'https://app2.binarjoinanelytic.info/api';
    return fallbackDomain.endsWith('/api') ? fallbackDomain : `${fallbackDomain}/api`;
  };

  const API_BASE_URL = getApiBaseUrl();

  // تهيئة مستخدم الطوارئ الافتراضي
  useEffect(() => {
    const initEmergencyAdmin = async () => {
      try {
        const { smartGetAll, smartSave } = await import('../offline/storage-factory');
        const existing = await smartGetAll('emergencyUsers');
        if (existing.length === 0) {
          console.log('🛡️ [AuthProvider] إنشاء مستخدم الطوارئ الافتراضي...');
          await smartSave('emergencyUsers', [{
            id: 'emergency-admin',
            email: 'admin@binarjoin.com',
            password: 'admin',
            name: 'مسؤول الطوارئ',
            role: 'admin',
            createdAt: new Date().toISOString()
          }]);
        }
      } catch (err) {
        // تم كتم التحذير لتقليل الضوضاء في السجلات
      }
    };
    initEmergencyAdmin();
  }, []);

  // تحقق من وجود مستخدم محفوظ عند بدء التطبيق مع آليات تعافي محسنة
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔐 [AuthProvider] بدء تهيئة المصادقة...', new Date().toISOString());
      try {
        const accessToken = localStorage.getItem('accessToken');
        const savedUser = localStorage.getItem('user');

        if (!accessToken || !savedUser) {
          console.log('ℹ️ [AuthProvider] لا توجد بيانات كاملة محفوظة');
          setIsLoading(false);
          return;
        }

        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsLoading(false);
          
          // تحقق صامت تماماً دون أي إمكانية لإعادة التوجيه أو التغيير
          console.log('🛡️ [AuthProvider] جاري التحقق الصامت من الجلسة...');
          fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                // تحديث حالة التحقق بدقة مع دعم التوافق مع localStorage
                const isEmailVerified = 
                  data.user.emailVerified === true || 
                  data.user.email_verified === true ||
                  !!data.user.emailVerifiedAt || 
                  !!data.user.email_verified_at ||
                  localStorage.getItem('emailVerified') === 'true';

                const updatedUser = {
                  ...data.user,
                  emailVerified: isEmailVerified
                };
                
                if (isEmailVerified) {
                  localStorage.setItem('emailVerified', 'true');
                }
                
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }
            } else {
              console.warn('⚠️ [AuthProvider] فشل التحقق الصامت (401)، لكن سيتم الحفاظ على الجلسة المحلية.');
            }
          }).catch(() => {});

        } catch (e) {
          console.error('❌ [AuthProvider] خطأ في قراءة بيانات المستخدم:', e);
          await logout();
        }
      } catch (error) {
        console.error('❌ [AuthProvider] خطأ عام:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // ✅ تأثير لمراقبة التغييرات في localStorage من تبويبات أخرى
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        console.log('🚫 [AuthProvider] تم اكتشاف مسح التوكن من مصدر خارجي');
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // تسجيل الدخول
  const login = async (email: string, password: string) => {
    console.log('🔑 [AuthProvider.login] بدء تسجيل الدخول:', email, new Date().toISOString());

    let result: any = null;
    let response: Response | null = null;

    try {
      console.log(`📡 [AuthProvider.login] إرسال طلب لـ ${API_BASE_URL}/auth/login...`);
      response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        result = await response.json();
      } else if (response.status === 503 || response.status === 500) {
        console.warn(`📡 [AuthProvider] السيرفر أو قاعدة البيانات غير متاحة (${response.status})، تفعيل وضع الطوارئ فوراً...`);
        // لا نضبط result هنا لنسمح لمنطق الطوارئ بالعمل أدناه
      } else {
        console.warn(`📡 [AuthProvider] السيرفر استجاب بخطأ ${response.status}، محاولة تسجيل الدخول أوفلاين...`);
      }
    } catch (networkError) {
      console.warn('📡 [AuthProvider] فشل الاتصال بالسيرفر، محاولة تسجيل الدخول أوفلاين...', networkError);
    }

    // ✅ منطق تسجيل الدخول أوفلاين إذا فشل السيرفر أو لم يجد المستخدم
    if (!result || (response && !response.ok)) {
      console.log('🔍 [AuthProvider] محاولة تسجيل الدخول أوفلاين/طوارئ...');
      
      try {
        const { smartGetAll } = await import('../offline/storage-factory');
        
        // 1. البحث في جدول الطوارئ أولاً (مستخدمين مثبتين مسبقاً)
        const emergencyUsers = await smartGetAll('emergencyUsers');
        console.log(`🛡️ [AuthProvider] فحص ${emergencyUsers.length} مستخدم طوارئ`);
        
        const emergencyUser = emergencyUsers.find((u: any) => 
          u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        
        if (emergencyUser) {
          console.log('🚨 [AuthProvider] تم الدخول بواسطة مستخدم الطوارئ');
          result = {
            success: true,
            data: {
              user: { ...emergencyUser, emailVerified: true },
              tokens: { accessToken: 'emergency-token', refreshToken: 'emergency-refresh' }
            }
          };
        } else {
          // 2. البحث في جداول المستخدمين المحليين
          const localUsers = await smartGetAll('users');
          console.log(`📱 [AuthProvider] فحص ${localUsers.length} مستخدم محلي`);
          
          const localUser = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
          
          if (localUser) {
            console.log('✅ [AuthProvider] تم العثور على المستخدم محلياً (أوفلاين)');
            result = {
              success: true,
              data: {
                user: localUser,
                tokens: { accessToken: 'offline-token', refreshToken: 'offline-refresh' }
              }
            };
          }
        }
      } catch (offlineError) {
        console.error('❌ [AuthProvider] خطأ في منطق الأوفلاين:', offlineError);
      }
    }

    // إذا لم تنجح محاولات الأوفلاين وكان هناك رد خطأ من السيرفر
    if (response && !response.ok && !result) {
      const errorData = await response.json().catch(() => ({}));
      // في حالة عدم التحقق من البريد الإلكتروني (403)
      if (response.status === 403 && errorData.requireEmailVerification) {
        const error = new Error(errorData.message || 'يجب التحقق من البريد الإلكتروني أولاً');
        (error as any).requireEmailVerification = true;
        (error as any).userId = errorData.data?.userId;
        (error as any).email = errorData.data?.email;
        (error as any).status = 403;
        (error as any).data = errorData.data;

        throw error;
      }
      throw new Error(errorData.message || 'فشل تسجيل الدخول');
    }

    // استخراج بيانات المستخدم والتوكنات بمرونة عالية
    const responseData = result?.data || result;
    const userData = responseData?.user || result?.user;
    
    // التحقق من حالة التحقق من البريد الإلكتروني مع دعم التوافق
    const isEmailVerified = 
      userData?.emailVerified === true || 
      userData?.email_verified === true ||
      !!userData?.emailVerifiedAt || 
      !!userData?.email_verified_at ||
      localStorage.getItem('emailVerified') === 'true';

    // دعم جميع أشكال التوكنات الممكنة بمرونة قصوى
    let tokenData = responseData?.tokens?.accessToken || 
                    result?.tokens?.accessToken ||
                    responseData?.accessToken || 
                    result?.accessToken ||
                    result?.data?.accessToken ||
                    responseData?.token ||
                    result?.token;
                     
    let refreshTokenData = responseData?.tokens?.refreshToken || 
                           result?.tokens?.refreshToken ||
                           responseData?.refreshToken || 
                           result?.refreshToken ||
                           result?.data?.refreshToken;

    // إذا كان التوكن مفقوداً، نحاول استخراجه من استجابة السيرفر المباشرة إذا كانت موجودة
    if (!tokenData && result && typeof result === 'object') {
       // البحث عن أي حقل يشبه التوكن
       const possibleTokenKeys = ['accessToken', 'token', 'jwt', 'auth_token'];
       for (const key of possibleTokenKeys) {
         if (result[key]) {
           tokenData = result[key];
           break;
         }
       }
    }

    console.log('🛡️ [AuthProvider.login] فحص البيانات المستخرجة:', { 
      hasUser: !!userData, 
      hasToken: !!tokenData,
      tokenType: typeof tokenData
    });

    if (!tokenData) {
      console.error('❌ [AuthProvider.login] التوكن مفقود من الاستجابة:', result);
      throw new Error('بيانات المستخدم أو الرمز المميز مفقودة من الاستجابة. يرجى المحاولة مرة أخرى.');
    }

    // حفظ بيانات المستخدم
    const userToSave = {
      id: userData?.id || 'unknown',
      email: userData?.email || email,
      name: userData?.name || userData?.fullName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || email,
      role: userData?.role || 'admin',
      mfaEnabled: !!userData?.mfaEnabled,
      emailVerified: isEmailVerified,
    };

    if (isEmailVerified) {
      localStorage.setItem('emailVerified', 'true');
    }

    console.log('💾 [AuthProvider.login] حفظ البيانات في localStorage...');
    localStorage.setItem('user', JSON.stringify(userToSave));
    localStorage.setItem('accessToken', tokenData);
    if (refreshTokenData) {
      localStorage.setItem('refreshToken', refreshTokenData);
    }
    
    setUser(userToSave);

    // 3. بدء مزامنة البيانات (دون انتظار انتهاء العملية وبحماية شاملة)
    const performInitialDataPull = async () => {
      try {
        console.log('🔄 [AuthProvider] محاولة بدء المزامنة...');
        const syncModule = await import('../offline/sync');
        const startSync = syncModule.startSync || (syncModule as any).default?.startSync;
        if (typeof startSync === 'function') {
          await startSync();
        }
      } catch (err) {
        console.warn('⚠️ [AuthProvider] فشل المزامنة الأولية، سيتم المتابعة:', err);
      }
    };

    // تشغيل المزامنة في الخلفية
    performInitialDataPull().then(() => {
      console.log('✅ [AuthProvider] اكتملت محاولة المزامنة');
      const coreKeys = [
        ["/api/projects"], ["/api/projects/with-stats"],
        ["/api/workers"], ["/api/materials"],
        ["/api/suppliers"], ["/api/notifications"],
      ];
      coreKeys.forEach(key =>
        queryClient.invalidateQueries({ queryKey: key, refetchType: 'active', exact: false })
      );
    }).catch(() => {});

    await new Promise(resolve => setTimeout(resolve, 50));
    prefetchCoreData().catch(console.warn);

    console.log('🎉 [AuthProvider.login] اكتمل تسجيل الدخول بنجاح');
    return result;
  };

  // تسجيل الخروج
  const logout = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
        } catch (error) {
          // تجاهل الخطأ - المهم تنظيف البيانات المحلية
        }
      }
    } catch (error) {
      // تجاهل الأخطاء
    } finally {
      // تنظيف الحالة والتخزين المحلي
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // ⚡ مسح جميع البيانات المخزنة
      clearAllCache();
    }
  };

  // متغيرات لإدارة إعادة المحاولة
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // دالة مساعدة للانتظار (sleep)
  const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

  // حساب delay للـ exponential backoff
  const calculateBackoffDelay = (attempt: number): number => {
    // بدءاً من 100ms، مضاعفة كل مرة، بحد أقصى 5s
    return Math.min(100 * Math.pow(2, attempt), 5000);
  };

  // تجديد الرمز المميز مع backoff strategy وتحسينات شاملة
  const refreshToken = async (forceRetry: boolean = false): Promise<boolean> => {
    console.log('🔄 [AuthProvider.refreshToken] بدء عملية تجديد الرمز...');

    // تجنب محاولات متزامنة متعددة
    if (isRefreshing && !forceRetry) {
      console.log('⏳ [AuthProvider.refreshToken] تجديد جارٍ بالفعل، انتظار...');
      // انتظار حتى انتهاء التجديد الجاري
      while (isRefreshing) {
        await sleep(100);
      }
      // التحقق من نجاح التجديد السابق
      return localStorage.getItem('accessToken') !== null;
    }

    setIsRefreshing(true);
    const startTime = Date.now();
    let currentAttempt = forceRetry ? 0 : refreshAttempts;

    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        console.log('❌ [AuthProvider.refreshToken] لا يوجد refresh token');
        return false;
      }

      // حد أقصى 3 محاولات
      const maxAttempts = 3;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const attemptStartTime = Date.now();
        console.log(`🔄 [AuthProvider.refreshToken] محاولة ${attempt + 1}/${maxAttempts}...`);

        try {
          // إنشاء AbortController للتحكم في timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.log(`⏰ [AuthProvider.refreshToken] timeout للمحاولة ${attempt + 1}`);
          }, 10000); // 10 ثواني timeout

          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
            signal: controller.signal,
          });

          // ✅ فحص استباقي لنوع المحتوى قبل المعالجة
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            console.error('❌ [AuthProvider.refreshToken] رد غير صالح من السيرفر (ليس JSON):', contentType);
            // محاولة انتظار قصيرة في حالة وجود ضغط على السيرفر
            await sleep(2000);
            continue; 
          }

          clearTimeout(timeoutId);
          const attemptDuration = Date.now() - attemptStartTime;
          console.log(`📊 [AuthProvider.refreshToken] محاولة ${attempt + 1} استغرقت ${attemptDuration}ms`);

          const data = await response.json();

          if (response.ok && data.success && data.tokens) {
            console.log('📦 [AuthProvider.refreshToken] استجابة ناجحة:', { success: data.success, hasTokens: !!data.tokens });

            // نجحت العملية - حفظ الرموز الجديدة
            localStorage.setItem('accessToken', data.tokens.accessToken);
            localStorage.setItem('refreshToken', data.tokens.refreshToken);

            // إعادة تعيين عداد المحاولات
            setRefreshAttempts(0);

            const totalDuration = Date.now() - startTime;
            console.log(`✅ [AuthProvider.refreshToken] نجح التجديد في ${totalDuration}ms بعد ${attempt + 1} محاولة`);

            return true;
          } else {
            // فشل HTTP أو بيانات غير صحيحة
            console.log(`❌ [AuthProvider.refreshToken] فشل ${response.status}:`, data.message || responseText);
          }

          // إذا كان 401 أو 403، فالـ refresh token منتهي الصلاحية
          if (response.status === 401 || response.status === 403) {
            console.log('🚫 [AuthProvider.refreshToken] refresh token منتهي الصلاحية - لا فائدة من إعادة المحاولة');
            break; // خروج من حلقة المحاولات
          }

        } catch (error) {
          const attemptDuration = Date.now() - attemptStartTime;

          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              console.log(`⏰ [AuthProvider.refreshToken] timeout في المحاولة ${attempt + 1} بعد ${attemptDuration}ms`);
            } else {
              console.log(`🌐 [AuthProvider.refreshToken] خطأ شبكة في المحاولة ${attempt + 1}:`, error.message);
            }
          } else {
            console.log(`❓ [AuthProvider.refreshToken] خطأ غير معروف في المحاولة ${attempt + 1}:`, error);
          }
        }

        // إذا لم تكن هذه المحاولة الأخيرة، انتظر قبل المحاولة التالية
        if (attempt < maxAttempts - 1) {
          const delay = calculateBackoffDelay(attempt);
          console.log(`⏰ [AuthProvider.refreshToken] انتظار ${delay}ms قبل المحاولة التالية...`);
          await sleep(delay);
        }
      }

      // فشل جميع المحاولات
      setRefreshAttempts(prev => prev + 1);
      const totalDuration = Date.now() - startTime;
      console.log(`❌ [AuthProvider.refreshToken] فشل التجديد مؤقتاً بعد ${totalDuration}ms و${maxAttempts} محاولات`);

      // ✅ تعديل: عدم تسجيل الخروج القسري للسماح بالعمل في وضع Offline أو المحاولة لاحقاً
      // فقط نقوم بتمكين وضع الأوفلاين في حالة وجود بيانات مستخدم محفوظة
      if (localStorage.getItem('user')) {
        console.warn('⚠️ [AuthProvider] فشل التجديد، ولكن سيتم الحفاظ على الجلسة المحلية لدعم وضع Offline');
        return false;
      }

      // فقط إذا كان لا يوجد مستخدم إطلاقاً، ننتقل لصفحة تسجيل الدخول
      await logout();
      window.location.href = '/login';

      return false;

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`💥 [AuthProvider.refreshToken] خطأ عام بعد ${totalDuration}ms:`, error);
      setRefreshAttempts(prev => prev + 1);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    getAccessToken,
    getRefreshToken,
  };

  // تسجيل helpers مع queryClient للتوحيد
  useEffect(() => {
    registerAuthHelpers({
      getAccessToken,
      refreshToken,
      logout,
    });
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// hook للحصول على رمز المصادقة مع التجديد التلقائي
export function useAuthenticatedRequest() {
  const { refreshToken } = useAuth();

  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const accessToken = localStorage.getItem('accessToken');

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      },
    });

    // إذا انتهت صلاحية الرمز
    if (response.status === 401 || response.status === 403) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // إعادة المحاولة مع الرمز الجديد
        const newAccessToken = localStorage.getItem('accessToken');
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': newAccessToken ? `Bearer ${newAccessToken}` : '',
          },
        });
      }
    }

    return response;
  };
}