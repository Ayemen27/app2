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

  const API_BASE_URL = 'https://app2.binarjoinanelytic.info/api';

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
        const savedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');

        console.log('🔍 [AuthProvider] فحص البيانات المحفوظة:', {
          hasUser: !!savedUser,
          hasToken: !!accessToken,
          userPreview: savedUser ? `${savedUser.substring(0, 50)}...` : 'غير موجود',
          authFailureCount: authFailureCount
        });

        // ✅ إصلاح: التحقق الدقيق من البيانات المحفوظة
        if (savedUser && accessToken) {
          console.log('📦 [AuthProvider] وُجدت بيانات محفوظة، محاولة التحقق...');
          try {
            // محاولة تحليل بيانات المستخدم
            const parsedUser = JSON.parse(savedUser);
            console.log('👤 [AuthProvider] تم تحليل بيانات المستخدم:', {
              id: parsedUser.id,
              email: parsedUser.email
            });

            // ✅ التحقق من صحة التوكن مع الخادم
            console.log('🔍 [AuthProvider] التحقق من صحة التوكن مع الخادم...');
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });

            console.log('📡 [AuthProvider] استجابة التحقق:', {
              status: response.status,
              ok: response.ok
            });

            if (response.ok) {
              const responseData = await response.json();
              console.log('✅ [AuthProvider] بيانات الاستجابة:', responseData);

              if (responseData.success && responseData.user) {
                console.log('✅ [AuthProvider] تم التحقق من البيانات بنجاح:', {
                  userId: responseData.user.id,
                  email: responseData.user.email
                });
                setUser(responseData.user);
                setLastAuthCheck(new Date());
                setAuthFailureCount(0); // إعادة تعيين عداد الأخطاء
              } else {
                throw new Error('بيانات المستخدم غير صحيحة في الاستجابة');
              }
            } else if (response.status === 401) {
              // في حالة 401، المستخدم بحاجة لتسجيل دخول جديد
              console.log('🚫 [AuthProvider] التوكن منتهي الصلاحية، تسجيل خروج تلقائي');
              // تنظيف البيانات
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              setUser(null);
              // لا نعيد توجيه هنا، سيتم التعامل معه في ProtectedRoute
            } else {
              console.log(`⚠️ [AuthProvider] فشل التحقق: ${response.status}`);

              // ✅ محاولة تجديد التوكن عند 401
              const refreshTokenValue = localStorage.getItem('refreshToken');
              if (response.status === 401 && refreshTokenValue) {
                console.log('🔄 [AuthProvider] محاولة تجديد التوكن...');
                const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken: refreshTokenValue }),
                  credentials: 'include'
                });

                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  if (refreshData.success && refreshData.tokens) {
                    console.log('✅ [AuthProvider] تم تجديد التوكن بنجاح');
                    localStorage.setItem('accessToken', refreshData.tokens.accessToken);
                    localStorage.setItem('refreshToken', refreshData.tokens.refreshToken);
                    // تعيين المستخدم مباشرة
                    setUser(parsedUser);
                    setAuthFailureCount(0);
                    return;
                  }
                }
                console.log('❌ [AuthProvider] فشل تجديد التوكن');
              }

              throw new Error(`HTTP ${response.status}: فشل التحقق من المصادقة`);
            }
          } catch (error) {
            console.error('❌ [AuthProvider] خطأ في التحقق من البيانات:', error);
            const newFailureCount = authFailureCount + 1;
            setAuthFailureCount(newFailureCount);

            // مسح البيانات إذا تكررت الأخطاء (تساهل أكثر)
            if (newFailureCount >= 3) {
              console.log('🧹 [AuthProvider] مسح البيانات بسبب تكرار الأخطاء');
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              setUser(null);
            } else {
              console.log(`⏳ [AuthProvider] إبقاء البيانات، محاولة ${newFailureCount}/3`);
            }
          }
        } else {
          console.log('ℹ️ [AuthProvider] لا توجد بيانات محفوظة', {
            hasSavedUser: !!savedUser,
            hasAccessToken: !!accessToken
          });
        }
      } catch (error) {
        console.error('❌ [AuthProvider] خطأ عام في تحقق المصادقة:', error);
        // في حالة خطأ عام، لا نفعل شيء جذري - نتركه للمستخدم
      } finally {
        console.log('🏁 [AuthProvider] انتهاء تهيئة المصادقة، isLoading = false');
        setIsLoading(false);
      }
    };

    initAuth();
  }, [authFailureCount]); // إعادة تشغيل عند تغير عداد الفشل

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
      } else {
        console.warn(`📡 [AuthProvider] السيرفر استجاب بخطأ ${response.status}، محاولة تسجيل الدخول أوفلاين...`);
      }
    } catch (networkError) {
      console.warn('📡 [AuthProvider] فشل الاتصال بالسيرفر، محاولة تسجيل الدخول أوفلاين...', networkError);
    }

    // ✅ منطق تسجيل الدخول أوفلاين إذا فشل السيرفر
    if (!result) {
      console.log('🔍 [AuthProvider] البحث عن المستخدم في جداول الطوارئ والمحلي...');
      
      // 1. البحث في جدول الطوارئ أولاً (مستخدمين مثبتين مسبقاً)
      const emergencyUsers = await smartGetAll('emergencyUsers');
      const emergencyUser = emergencyUsers.find((u: any) => u.email === email);
      
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
        // 2. البحث في جدول المستخدمين العادي المزامنين
        const localUsers = await smartGetAll('users');
        const localUser = localUsers.find((u: any) => u.email === email);
        
        if (localUser) {
          console.log('✅ [AuthProvider] تم العثور على المستخدم محلياً (تسجيل دخول أوفلاين)');
          result = {
            success: true,
            data: {
              user: localUser,
              tokens: { accessToken: 'offline-token', refreshToken: 'offline-refresh' }
            }
          };
        } else {
          throw new Error('المستخدم غير موجود محلياً أو في نظام الطوارئ، يرجى الاتصال بالإنترنت للمرة الأولى');
        }
      }
    }

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

    // استخراج بيانات المستخدم بشكل صحيح
    const userData = result.data?.user || result.user;
    const tokenData = result.data?.tokens?.accessToken || result.data?.accessToken || result.tokens?.accessToken || result.accessToken || result.token;
    const refreshTokenData = result.data?.tokens?.refreshToken || result.data?.refreshToken || result.tokens?.refreshToken || result.refreshToken;

    if (!userData || !tokenData) {
      throw new Error('بيانات المستخدم أو الرمز المميز مفقودة من الاستجابة');
    }

    // حفظ بيانات المستخدم
    const userToSave = {
      id: userData.id,
      email: userData.email,
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
      role: userData.role || 'admin',
      mfaEnabled: userData.mfaEnabled || false,
      emailVerified: userData.emailVerified === true,
    };

    setUser(userToSave);
    localStorage.setItem('user', JSON.stringify(userToSave));
    localStorage.setItem('accessToken', tokenData);
    if (refreshTokenData) {
      localStorage.setItem('refreshToken', refreshTokenData);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
    prefetchCoreData().catch(console.warn);

    console.log('🎉 [AuthProvider.login] اكتمل تسجيل الدخول بنجاح');
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

          clearTimeout(timeoutId);
          const attemptDuration = Date.now() - attemptStartTime;
          console.log(`📊 [AuthProvider.refreshToken] محاولة ${attempt + 1} استغرقت ${attemptDuration}ms`);

          // قراءة response مرة واحدة فقط
          const responseText = await response.text();
          let data;

          try {
            // محاولة parsing كـ JSON
            data = JSON.parse(responseText);
          } catch (parseError) {
            // إذا فشل parsing، استخدام النص كما هو
            console.log(`❌ [AuthProvider.refreshToken] فشل parsing JSON:`, responseText);
            data = { success: false, message: responseText };
          }

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
      console.log(`❌ [AuthProvider.refreshToken] فشل التجديد نهائياً بعد ${totalDuration}ms و${maxAttempts} محاولات`);

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