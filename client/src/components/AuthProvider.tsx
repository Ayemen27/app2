/**
 * موفر السياق للمصادقة
 * يوفر حالة المصادقة وإدارة الجلسات
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { registerAuthHelpers, prefetchCoreData, clearAllCache } from "../lib/queryClient";
import { isValidJwt, clearInvalidTokens, setAuthMode, getAuthMode, isOfflineMode, getValidToken } from "../lib/token-utils";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfa_enabled: boolean;
  emailVerified: boolean;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  loginWithBiometric: (email?: string) => Promise<void>;
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

  const getAccessToken = (): string | null => {
    return getValidToken('accessToken');
  };

  const getRefreshToken = (): string | null => {
    return getValidToken('refreshToken');
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
      if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost') || origin.startsWith('capacitor://') || origin.startsWith('file://') || origin === 'null') {
        return 'https://app2.binarjoinanelytic.info/api';
      }
    }
    return 'https://app2.binarjoinanelytic.info/api';
  };

  const API_BASE_URL = getApiBaseUrl();


  // تحقق من وجود مستخدم محفوظ عند بدء التطبيق مع آليات تعافي محسنة
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔐 [AuthProvider] بدء تهيئة المصادقة...', new Date().toISOString());
      clearInvalidTokens();
      try {
        const accessToken = getValidToken('accessToken');
        const savedUser = localStorage.getItem('user');

        if (!savedUser) {
          console.log('ℹ️ [AuthProvider] لا توجد بيانات مستخدم محفوظة');
          setIsLoading(false);
          return;
        }

        if (!accessToken && !isOfflineMode()) {
          console.log('ℹ️ [AuthProvider] لا يوجد توكن صالح والتطبيق ليس في وضع أوفلاين');
          setIsLoading(false);
          return;
        }

        try {
          const parsedUser = JSON.parse(savedUser);
          
          if (!accessToken && isOfflineMode()) {
            try {
              const { smartGet } = await import('../offline/storage-factory');
              const emergencyUser = await smartGet('emergencyUsers', String(parsedUser.id));
              if (emergencyUser?.passwordHash?.startsWith('pbkdf2:')) {
                const verifiedRole = emergencyUser.role || parsedUser.role;
                const trustedUser = { ...parsedUser, role: verifiedRole };
                setUser(trustedUser);
                console.log('📴 [AuthProvider] وضع أوفلاين - بيانات اعتماد مُتحقق منها مسبقاً');
              } else {
                console.log('⚠️ [AuthProvider] لا توجد بيانات اعتماد أوفلاين مُتحقق منها');
              }
            } catch {
              console.log('⚠️ [AuthProvider] فشل فحص بيانات الأوفلاين');
            }
            setIsLoading(false);
            return;
          }
          
          setUser(parsedUser);
          setIsLoading(false);
          
          if (!accessToken) {
            console.log('📴 [AuthProvider] وضع أوفلاين - تخطي التحقق من السيرفر');
            return;
          }

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
                  data.user.emailVerified === true ||
                  !!data.user.email_verified_at || 
                  !!data.user.email_verified_at ||
                  localStorage.getItem('emailVerified') === 'true';

                const resolvedName = data.user.name || 
                  [data.user.first_name, data.user.last_name].filter(Boolean).join(' ') || 
                  parsedUser.name ||
                  data.user.email;

                const updatedUser = {
                  ...data.user,
                  name: resolvedName,
                  emailVerified: isEmailVerified
                };
                
                if (isEmailVerified) {
                  localStorage.setItem('emailVerified', 'true');
                }
                
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }
            } else if (res.status === 401) {
              console.warn('⚠️ [AuthProvider] فشل التحقق الصامت (401) - مسح الجلسة');
              setUser(null);
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              setAuthMode('online');
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

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        console.log('[AuthProvider] Token cleared externally');
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!user) return;

    const revalidateSession = async () => {
      const accessToken = getValidToken('accessToken');
      if (!accessToken) return;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const resolvedName = data.user.name ||
              [data.user.first_name, data.user.last_name].filter(Boolean).join(' ') ||
              user.name ||
              data.user.email;

            const isEmailVerified =
              data.user.emailVerified === true ||
              !!data.user.email_verified_at ||
              localStorage.getItem('emailVerified') === 'true';

            const updatedUser = {
              ...data.user,
              name: resolvedName,
              emailVerified: isEmailVerified
            };

            if (isEmailVerified) {
              localStorage.setItem('emailVerified', 'true');
            }

            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setAuthMode('online');
          }
        } else if (res.status === 401) {
          console.warn('[AuthProvider] Session invalid on revalidation, logging out');
          await logout();
        }
      } catch {
      }
    };

    const handleOnline = () => {
      revalidateSession();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user]);

  // تسجيل الدخول
  const login = async (email: string, password: string) => {
    console.log('🔑 [AuthProvider.login] بدء تسجيل الدخول:', email, new Date().toISOString());

    let result: any = null;
    let response: Response | null = null;

    try {
      console.log(`📡 [AuthProvider.login] إرسال طلب لـ ${API_BASE_URL}/auth/login...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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

    if (!result && (!response || response.status === 503 || response.status === 500 || !navigator.onLine)) {
      console.log('🔍 [AuthProvider] السيرفر غير متاح، محاولة تسجيل الدخول أوفلاين...');
      
      try {
        const { smartGetAll } = await import('../offline/storage-factory');
        
        const localUsers = await smartGetAll('users');
        const emergencyUsers = await smartGetAll('emergencyUsers');
        const allUsers = [...localUsers, ...emergencyUsers];
        console.log(`📱 [AuthProvider] فحص ${allUsers.length} مستخدم محلي`);
        
        const localUser = allUsers.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase());
        
        if (localUser) {
          let passwordVerified = false;
          
          if (localUser.passwordHash) {
            try {
              const { verifyOfflinePassword } = await import('../offline/crypto-utils');
              passwordVerified = await verifyOfflinePassword(password, localUser.passwordHash);
              if (passwordVerified) {
                console.log('✅ [AuthProvider] تسجيل دخول أوفلاين ناجح بعد التحقق من كلمة المرور');
              } else {
                console.log('❌ [AuthProvider] كلمة المرور غير صحيحة (أوفلاين)');
              }
            } catch (hashErr) {
              console.warn('⚠️ [AuthProvider] فشل التحقق من كلمة المرور أوفلاين:', hashErr);
              passwordVerified = false;
            }
          } else {
            console.log('⚠️ [AuthProvider] لا يوجد hash محلي - رفض الدخول أوفلاين');
            passwordVerified = false;
          }

          if (passwordVerified) {
            setAuthMode('offline');
            result = {
              success: true,
              data: {
                user: localUser,
                tokens: null
              }
            };
          }
        }
      } catch (offlineError) {
        console.error('❌ [AuthProvider] خطأ في منطق الأوفلاين:', offlineError);
      }
    }

    if (response && !response.ok && !result) {
      const errorData = await response.json().catch(() => ({}));
      // في حالة عدم التحقق من البريد الإلكتروني (403)
      if (response.status === 403 && errorData.requireEmailVerification) {
        const error = new Error(errorData.message || 'يجب التحقق من البريد الإلكتروني أولاً');
        (error as any).requireEmailVerification = true;
        (error as any).user_id = errorData.data?.user_id;
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

    // دعم جميع أشكال التوكنات الممكنة بمرونة قصوى
    let tokenData = responseData?.token ||
                    responseData?.accessToken ||
                    result?.token ||
                    result?.accessToken ||
                    responseData?.tokens?.accessToken ||
                    result?.tokens?.accessToken ||
                    result?.data?.token ||
                    result?.data?.accessToken;

    let refreshTokenData = responseData?.refreshToken ||
                           result?.refreshToken ||
                           responseData?.tokens?.refreshToken ||
                           result?.tokens?.refreshToken ||
                           result?.data?.refreshToken;

    // إذا كان التوكن مفقوداً، نحاول استخراجه من أي حقل محتمل
    if (!tokenData && result && typeof result === 'object') {
       const possibleTokenKeys = ['accessToken', 'token', 'jwt', 'auth_token', 'accessToken'];
       const searchIn = [result, responseData, result?.data].filter(Boolean);
       for (const obj of searchIn) {
         for (const key of possibleTokenKeys) {
           if (obj[key]) {
             tokenData = obj[key];
             break;
           }
         }
         if (tokenData) break;
       }
    }

    if (!refreshTokenData && result && typeof result === 'object') {
       const possibleRefreshKeys = ['refreshToken', 'refreshToken'];
       const searchIn = [result, responseData, result?.data].filter(Boolean);
       for (const obj of searchIn) {
         for (const key of possibleRefreshKeys) {
           if (obj[key]) {
             refreshTokenData = obj[key];
             break;
           }
         }
         if (refreshTokenData) break;
       }
    }

    console.log('🛡️ [AuthProvider.login] فحص البيانات المستخرجة:', { 
      hasUser: !!userData, 
      hasToken: !!tokenData,
      tokenType: typeof tokenData
    });

    if (!result) {
      throw new Error('فشل تسجيل الدخول. لا يمكن الوصول للخادم ولا يوجد بيانات أوفلاين صالحة.');
    }

    if (!tokenData && getAuthMode() !== 'offline') {
      console.error('❌ [AuthProvider.login] التوكن مفقود من الاستجابة');
      throw new Error('بيانات المستخدم أو الرمز المميز مفقودة من الاستجابة. يرجى المحاولة مرة أخرى.');
    }

    if (!userData && getAuthMode() !== 'offline') {
      throw new Error('بيانات المستخدم مفقودة من الاستجابة.');
    }

    const isEmailVerified = 
      userData?.emailVerified === true || 
      !!userData?.email_verified_at || 
      !!userData?.emailVerified ||
      localStorage.getItem('emailVerified') === 'true';

    const userToSave = {
      id: userData?.id || userData?.user_id,
      email: userData?.email || email,
      name: userData?.name || userData?.full_name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || email,
      role: userData?.role || 'user',
      mfa_enabled: !!userData?.mfa_enabled,
      emailVerified: isEmailVerified,
    };

    if (!userToSave.id) {
      throw new Error('معرف المستخدم مفقود. لا يمكن إتمام تسجيل الدخول.');
    }

    if (isEmailVerified) {
      localStorage.setItem('emailVerified', 'true');
    }

    console.log('💾 [AuthProvider.login] حفظ البيانات في localStorage...');
    localStorage.setItem('user', JSON.stringify(userToSave));
    if (tokenData && isValidJwt(tokenData)) {
      localStorage.setItem('accessToken', tokenData);
      setAuthMode('online');
    }
    if (refreshTokenData && isValidJwt(refreshTokenData)) {
      localStorage.setItem('refreshToken', refreshTokenData);
    }
    
    setUser(userToSave);

    if (getAuthMode() !== 'offline') {
      try {
        const { hashPasswordForOffline } = await import('../offline/crypto-utils');
        const { smartPut } = await import('../offline/storage-factory');
        const offlineHash = await hashPasswordForOffline(password);
        await smartPut('emergencyUsers', {
          id: String(userToSave.id),
          email: userToSave.email,
          passwordHash: offlineHash,
          name: userToSave.name,
          role: userToSave.role
        });
        console.log('✅ [AuthProvider] تم حفظ بيانات الدخول الأوفلاين بنجاح');
      } catch (offlineHashErr) {
        console.warn('⚠️ [AuthProvider] فشل حفظ بيانات الدخول الأوفلاين:', offlineHashErr);
      }
    }

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

    promptBiometricRegistration();

    return result;
  };

  const promptBiometricRegistration = async () => {
    console.log('ℹ️ [AuthProvider] تفعيل البصمة متاح من الإعدادات > الأمان');
  };

  const loginWithBiometric = async (email?: string) => {
    const { loginWithBiometric: biometricLogin } = await import('../lib/webauthn');
    const result = await biometricLogin(email);

    if (!result.success) {
      throw new Error(result.message || 'فشل تسجيل الدخول بالبصمة');
    }

    const responseData = result.data || result;
    const userData = responseData.user || result.user;
    const tokenData = result.token || result.accessToken || responseData.token || responseData.accessToken || result.tokens?.accessToken;
    const refreshTokenData = result.refreshToken || responseData.refreshToken || result.tokens?.refreshToken;

    if (tokenData) {
      localStorage.setItem('accessToken', tokenData);
      setAuthMode('online');
    }
    if (refreshTokenData) {
      localStorage.setItem('refreshToken', refreshTokenData);
    }

    const userToSave = {
      id: userData?.id || userData?.user_id || 'unknown',
      email: userData?.email || email || '',
      name: userData?.name || userData?.full_name || userData?.email || '',
      role: userData?.role || 'user',
      mfa_enabled: !!userData?.mfa_enabled,
      emailVerified: !!userData?.emailVerified || !!userData?.email_verified_at,
    };

    localStorage.setItem('user', JSON.stringify(userToSave));
    setUser(userToSave);

    prefetchCoreData().catch(console.warn);
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
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAuthMode('online');
      clearAllCache();
      
      try {
        const { smartClear } = await import('../offline/storage-factory');
        const userDataStores = [
          'userData', 'syncQueue', 'syncHistory', 'syncMetadata', 'deadLetterQueue'
        ];
        for (const store of userDataStores) {
          try { await smartClear(store); } catch {}
        }
        if ('caches' in window) {
          try { await caches.delete('api-data-v2'); } catch {}
        }
        console.log('🧹 [AuthProvider] تم تنظيف بيانات الأوفلاين عند الخروج');
      } catch {}
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
            console.log(`❌ [AuthProvider.refreshToken] فشل ${response.status}:`, data.message || 'خطأ غير معروف');
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
    loginWithBiometric,
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