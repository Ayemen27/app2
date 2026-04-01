/**
 * موفر السياق للمصادقة
 * يوفر حالة المصادقة وإدارة الجلسات
 */

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { registerAuthHelpers, prefetchCoreData, clearAllCache } from "../lib/queryClient";
import { isValidJwt, clearInvalidTokens, setAuthMode, getAuthMode, isOfflineMode } from "../lib/token-utils";
import { storeTokens, clearTokens, getAccessToken as storeGetAccessToken, getRefreshToken as storeGetRefreshToken, isWebCookieMode, getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';
import { ENV } from "../lib/env";
import { trackLog } from "../lib/debug-tracker";

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
    return storeGetAccessToken();
  };

  const getRefreshToken = (): string | null => {
    return storeGetRefreshToken();
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

  const getApiBaseUrl = () => {
    const base = ENV.getApiBaseUrl();
    return base ? `${base}/api` : '/api';
  };

  // تحقق من وجود مستخدم محفوظ عند بدء التطبيق مع آليات تعافي محسنة
  useEffect(() => {
    const initAuth = async () => {
      trackLog('AUTH_INIT_START', {
        platform: ENV.platform,
        isNative: ENV.isNative,
        authStrategy: ENV.authStrategy,
        apiBase: ENV.getApiBaseUrl(),
        isWebCookie: isWebCookieMode(),
        credentials: getFetchCredentials(),
      });
      clearInvalidTokens();
      try {
        const accessToken = storeGetAccessToken();
        const savedUser = localStorage.getItem('user');

        if (isWebCookieMode()) {
          try {
            const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
              credentials: getFetchCredentials(),
              headers: { ...getClientPlatformHeader() }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                const isEmailVerified =
                  data.user.emailVerified === true ||
                  !!data.user.email_verified_at ||
                  localStorage.getItem('emailVerified') === 'true';

                const resolvedName = data.user.name ||
                  [data.user.first_name, data.user.last_name].filter(Boolean).join(' ') ||
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
                setAuthMode('online');
              }
            } else if (savedUser) {
              setUser(null);
              localStorage.removeItem('user');
              clearTokens();
              setAuthMode('online');
            }
          } catch {
            if (savedUser) {
              try {
                const parsedUser = JSON.parse(savedUser);
                if (isOfflineMode()) {
                  setUser(parsedUser);
                }
              } catch {
              }
            }
          }
          setIsLoading(false);
          return;
        }

        if (!savedUser) {
          setIsLoading(false);
          return;
        }

        if (!accessToken && !isOfflineMode()) {
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
              } else {
              }
            } catch {
            }
            setIsLoading(false);
            return;
          }
          
          setUser(parsedUser);
          setIsLoading(false);
          
          if (!accessToken) {
            return;
          }

          fetch(`${getApiBaseUrl()}/auth/me`, {
            credentials: getFetchCredentials(),
            headers: { ...getAuthHeaders(), ...getClientPlatformHeader() }
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
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
              setUser(null);
              localStorage.removeItem('user');
              clearTokens();
              setAuthMode('online');
            }
          }).catch(() => {});

        } catch (e) {
          await logout();
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!user) return;

    const revalidateSession = async () => {
      const accessToken = storeGetAccessToken();
      if (!accessToken && !isWebCookieMode()) return;

      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
          credentials: getFetchCredentials(),
          headers: { ...getAuthHeaders(), ...getClientPlatformHeader() }
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
    const loginApiUrl = getApiBaseUrl();
    const platformInfo = {
      platform: ENV.platform,
      isNative: ENV.isNative,
      authStrategy: ENV.authStrategy,
      apiBaseUrl: loginApiUrl,
      credentials: getFetchCredentials(),
      clientPlatformHeader: getClientPlatformHeader(),
      isWebCookieMode: isWebCookieMode(),
      windowCapacitor: !!(window as any).Capacitor,
      protocol: window.location?.protocol,
    };
    trackLog('LOGIN_FN_START', platformInfo);

    let result: any = null;
    let response: Response | null = null;
    let errorBody: any = null;
    let rawResponseText: string | null = null;

    try {
      const fullUrl = `${loginApiUrl}/auth/login`;
      trackLog('LOGIN_FETCH_START', { url: fullUrl });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      response = await fetch(fullUrl, {
        method: 'POST',
        credentials: getFetchCredentials(),
        headers: {
          'Content-Type': 'application/json',
          ...getClientPlatformHeader(),
          'x-request-nonce': crypto.randomUUID(),
          'x-request-timestamp': new Date().toISOString(),
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || 'unknown';
      trackLog('LOGIN_RESPONSE', {
        status: response.status,
        ok: response.ok,
        type: response.type,
        contentType,
      });

      rawResponseText = await response.text();
      trackLog('LOGIN_BODY', { length: rawResponseText.length, preview: rawResponseText.substring(0, 200) });

      if (response.ok) {
        try {
          result = JSON.parse(rawResponseText);
          trackLog('LOGIN_PARSED_OK', { keys: Object.keys(result).join(','), hasToken: !!(result?.token || result?.accessToken) });
        } catch (parseErr: any) {
          trackLog('LOGIN_PARSE_FAIL', { error: parseErr.message, raw: rawResponseText.substring(0, 100) });
          throw new Error(`LOGIN_RESPONSE_PARSE_FAILED: status=${response.status} contentType=${contentType}`);
        }
      } else {
        try {
          errorBody = JSON.parse(rawResponseText);
        } catch {
          errorBody = { message: rawResponseText.substring(0, 200) };
        }
        trackLog('LOGIN_SERVER_ERROR', { status: response.status, message: errorBody?.message });
      }
    } catch (networkError: any) {
      trackLog('LOGIN_NETWORK_ERROR', { name: networkError?.name, message: networkError?.message });
      if (networkError?.message?.includes('LOGIN_RESPONSE_PARSE_FAILED')) throw networkError;
    }

    if (!result && (!response || response.status === 503 || response.status === 500 || !navigator.onLine)) {
      trackLog('LOGIN_OFFLINE_ATTEMPT', { responseStatus: response?.status, online: navigator.onLine });
      
      try {
        const { smartGetAll } = await import('../offline/storage-factory');
        
        const localUsers = await smartGetAll('users');
        const emergencyUsers = await smartGetAll('emergencyUsers');
        const allUsers = [...localUsers, ...emergencyUsers];
        trackLog('LOGIN_OFFLINE_USERS', { count: allUsers.length });
        
        const localUser = allUsers.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase());
        
        if (localUser) {
          let passwordVerified = false;
          
          if (localUser.passwordHash) {
            try {
              const { verifyOfflinePassword } = await import('../offline/crypto-utils');
              passwordVerified = await verifyOfflinePassword(password, localUser.passwordHash);
              trackLog('LOGIN_OFFLINE_VERIFY', { verified: passwordVerified });
            } catch (hashErr: any) {
              trackLog('LOGIN_OFFLINE_VERIFY_ERROR', { error: hashErr?.message });
              passwordVerified = false;
            }
          } else {
            trackLog('LOGIN_OFFLINE_NO_HASH', 'no passwordHash stored');
            passwordVerified = false;
          }

          if (passwordVerified) {
            setAuthMode('offline');
            trackLog('LOGIN_OFFLINE_SUCCESS', { email: localUser.email });
            result = {
              success: true,
              data: {
                user: localUser,
                tokens: null
              }
            };
          }
        } else {
          trackLog('LOGIN_OFFLINE_NO_MATCH', { email });
        }
      } catch (offlineError: any) {
        trackLog('LOGIN_OFFLINE_ERROR', { error: offlineError?.message });
      }
    }

    if (response && !response.ok && !result) {
      const errorData = errorBody || {};
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

    trackLog('LOGIN_EXTRACTED', {
      hasUser: !!userData,
      hasToken: !!tokenData,
      hasRefresh: !!refreshTokenData,
      tokenLen: tokenData ? String(tokenData).length : 0,
      userKeys: userData ? Object.keys(userData).join(',') : 'null',
      authMode: getAuthMode(),
      isWebCookie: isWebCookieMode(),
    });

    if (!result) {
      trackLog('LOGIN_FAIL_NO_RESULT', { responseStatus: response?.status });
      throw new Error('فشل تسجيل الدخول. لا يمكن الوصول للخادم ولا يوجد بيانات أوفلاين صالحة.');
    }

    if (!tokenData && getAuthMode() !== 'offline' && !isWebCookieMode()) {
      trackLog('LOGIN_FAIL_NO_TOKEN', { resultKeys: Object.keys(result).join(',') });
      throw new Error('بيانات المستخدم أو الرمز المميز مفقودة من الاستجابة. يرجى المحاولة مرة أخرى.');
    }

    if (!userData && getAuthMode() !== 'offline') {
      trackLog('LOGIN_FAIL_NO_USER', { resultKeys: Object.keys(result).join(',') });
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
      trackLog('LOGIN_FAIL_NO_USER_ID', { userData: userData ? Object.keys(userData).join(',') : 'null' });
      throw new Error('معرف المستخدم مفقود. لا يمكن إتمام تسجيل الدخول.');
    }

    if (isEmailVerified) {
      localStorage.setItem('emailVerified', 'true');
    }

    trackLog('LOGIN_SAVING_USER', { id: userToSave.id, email: userToSave.email, role: userToSave.role });
    localStorage.setItem('user', JSON.stringify(userToSave));
    const tokenValid = tokenData && isValidJwt(tokenData);
    const refreshValid = refreshTokenData && isValidJwt(refreshTokenData);
    trackLog('LOGIN_TOKEN_VALIDATE', { tokenValid, refreshValid, tokenLen: tokenData?.length, refreshLen: refreshTokenData?.length });
    if (tokenValid) {
      storeTokens(tokenData, refreshValid ? refreshTokenData : '');
      setAuthMode('online');
      const storedBack = localStorage.getItem('accessToken');
      trackLog('LOGIN_TOKEN_STORED', { stored: !!storedBack, storedLen: storedBack?.length });
    } else if (isWebCookieMode()) {
      trackLog('LOGIN_COOKIE_MODE', 'skipping token storage');
      setAuthMode('online');
    } else {
      trackLog('LOGIN_WARN_NO_TOKEN', { tokenPreview: tokenData ? tokenData.substring(0, 20) + '...' : 'null' });
    }
    
    setUser(userToSave);
    trackLog('LOGIN_COMPLETE', { email: userToSave.email, role: userToSave.role });

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
      } catch (offlineHashErr) {
      }
    }

    // 3. بدء مزامنة البيانات (دون انتظار انتهاء العملية وبحماية شاملة)
    const performInitialDataPull = async () => {
      try {
        const syncModule = await import('../offline/sync');
        const startSync = (syncModule as any).startSync || (syncModule as any).default?.startSync;
        if (typeof startSync === 'function') {
          await startSync();
        }
      } catch (err) {
      }
    };

    // تشغيل المزامنة في الخلفية
    performInitialDataPull().then(() => {
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
    prefetchCoreData().catch(() => {});

    promptBiometricRegistration();

    return result;
  };

  const promptBiometricRegistration = async () => {
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
      storeTokens(tokenData, refreshTokenData || '');
      setAuthMode('online');
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

    prefetchCoreData().catch(() => {});
  };

  // تسجيل الخروج
  const logout = async () => {
    try {
      const accessToken = storeGetAccessToken();
      try {
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          credentials: getFetchCredentials(),
          headers: {
            ...getAuthHeaders(),
            ...getClientPlatformHeader(),
            'x-request-nonce': crypto.randomUUID(),
            'x-request-timestamp': new Date().toISOString(),
          },
        });
      } catch (error) {
      }
    } catch (error) {
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      clearTokens();
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
      } catch {}
    }
  };

  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

  // حساب delay للـ exponential backoff
  const calculateBackoffDelay = (attempt: number): number => {
    // بدءاً من 100ms، مضاعفة كل مرة، بحد أقصى 5s
    return Math.min(100 * Math.pow(2, attempt), 5000);
  };

  const refreshToken = async (forceRetry: boolean = false): Promise<boolean> => {

    if (refreshPromiseRef.current && !forceRetry) {
      return refreshPromiseRef.current;
    }

    const doRefresh = async (): Promise<boolean> => {
    const startTime = Date.now();
    let currentAttempt = forceRetry ? 0 : refreshAttempts;

    try {
      const refreshTokenValue = storeGetRefreshToken();
      if (!refreshTokenValue) {
        return false;
      }

      // حد أقصى 3 محاولات
      const maxAttempts = 3;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const attemptStartTime = Date.now();

        try {
          // إنشاء AbortController للتحكم في timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, 10000); // 10 ثواني timeout

          const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
            method: 'POST',
            credentials: getFetchCredentials(),
            headers: {
              'Content-Type': 'application/json',
              ...getClientPlatformHeader(),
              'x-request-nonce': crypto.randomUUID(),
              'x-request-timestamp': new Date().toISOString(),
            },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
            signal: controller.signal,
          });

          // ✅ فحص استباقي لنوع المحتوى قبل المعالجة
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            // محاولة انتظار قصيرة في حالة وجود ضغط على السيرفر
            await sleep(2000);
            continue; 
          }

          clearTimeout(timeoutId);
          const attemptDuration = Date.now() - attemptStartTime;

          const data = await response.json();

          if (response.ok && data.success && data.tokens) {

            storeTokens(data.tokens.accessToken, data.tokens.refreshToken);

            // إعادة تعيين عداد المحاولات
            setRefreshAttempts(0);

            const totalDuration = Date.now() - startTime;

            return true;
          } else {
            // فشل HTTP أو بيانات غير صحيحة
          }

          // إذا كان 401 أو 403، فالـ refresh token منتهي الصلاحية
          if (response.status === 401 || response.status === 403) {
            break; // خروج من حلقة المحاولات
          }

        } catch (error) {
          const attemptDuration = Date.now() - attemptStartTime;

          if (error instanceof Error) {
            if (import.meta.env.DEV) {
              if (error.name === 'AbortError') {
              } else {
              }
            }
          } else {
          }
        }

        // إذا لم تكن هذه المحاولة الأخيرة، انتظر قبل المحاولة التالية
        if (attempt < maxAttempts - 1) {
          const delay = calculateBackoffDelay(attempt);
          await sleep(delay);
        }
      }

      // فشل جميع المحاولات
      setRefreshAttempts(prev => prev + 1);
      const totalDuration = Date.now() - startTime;

      // ✅ تعديل: عدم تسجيل الخروج القسري للسماح بالعمل في وضع Offline أو المحاولة لاحقاً
      // فقط نقوم بتمكين وضع الأوفلاين في حالة وجود بيانات مستخدم محفوظة
      if (localStorage.getItem('user')) {
        return false;
      }

      // فقط إذا كان لا يوجد مستخدم إطلاقاً، ننتقل لصفحة تسجيل الدخول
      await logout();
      window.location.href = '/login';

      return false;

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      setRefreshAttempts(prev => prev + 1);
      return false;
    }
    };

    const promise = doRefresh().finally(() => {
      refreshPromiseRef.current = null;
    });
    refreshPromiseRef.current = promise;
    return promise;
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
    const method = ((options.method || 'GET') as string).toUpperCase();
    const replayHeaders: Record<string, string> = method !== 'GET' ? { 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() } : {};
    const response = await fetch(url, {
      ...options,
      credentials: getFetchCredentials(),
      headers: {
        ...options.headers,
        ...getAuthHeaders(),
        ...getClientPlatformHeader(),
        ...replayHeaders,
      },
    });

    if (response.status === 401 || response.status === 403) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const retryReplayHeaders: Record<string, string> = method !== 'GET' ? { 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() } : {};
        return fetch(url, {
          ...options,
          credentials: getFetchCredentials(),
          headers: {
            ...options.headers,
            ...getAuthHeaders(),
            ...getClientPlatformHeader(),
            ...retryReplayHeaders,
          },
        });
      }
    }

    return response;
  };
}