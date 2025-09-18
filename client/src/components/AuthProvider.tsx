/**
 * موفر السياق للمصادقة
 * يوفر حالة المصادقة وإدارة الجلسات
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
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

  // تحقق من وجود مستخدم محفوظ عند بدء التطبيق
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔐 [AuthProvider] بدء تهيئة المصادقة...', new Date().toISOString());
      try {
        const savedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        
        console.log('🔍 [AuthProvider] فحص البيانات المحفوظة:', {
          hasUser: !!savedUser,
          hasToken: !!accessToken,
          userPreview: savedUser ? JSON.parse(savedUser).email : 'غير موجود'
        });
        
        if (savedUser && accessToken) {
          console.log('✅ [AuthProvider] تم العثور على بيانات محفوظة، التحقق من صحتها...');
          // التحقق من صحة الرمز المميز مع النظام المتقدم
          try {
            console.log('📡 [AuthProvider] إرسال طلب التحقق إلى /api/auth/me');
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
            
            console.log('📨 [AuthProvider] استجابة /api/auth/me:', response.status);
            
            if (response.ok) {
              const data = await response.json();
              console.log('📋 [AuthProvider] بيانات المستخدم من API:', data);
              if (data.success) {
                console.log('✅ [AuthProvider] تم التحقق بنجاح، حفظ المستخدم:', data.user.email);
                setUser(data.user);
                return;
              }
            }
            
            console.log('🔄 [AuthProvider] فشل التحقق، محاولة تجديد الرمز...');
            // إذا فشل التحقق، محاولة تجديد الرمز
            const refreshSuccess = await refreshToken();
            if (!refreshSuccess) {
              console.log('❌ [AuthProvider] فشل تجديد الرمز، مسح البيانات المحفوظة');
              // مسح البيانات المحفوظة إذا فشل التجديد
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            } else {
              console.log('✅ [AuthProvider] نجح تجديد الرمز');
            }
          } catch (error) {
            console.error('❌ [AuthProvider] خطأ في التحقق من الرمز:', error);
            // مسح البيانات المحفوظة في حالة الخطأ
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        } else {
          console.log('ℹ️ [AuthProvider] لا توجد بيانات محفوظة');
        }
      } catch (error) {
        console.error('❌ [AuthProvider] خطأ في تحقق المصادقة:', error);
        // إذا حدث خطأ، لا تسجل خروج، فقط امسح التحميل
      } finally {
        console.log('🏁 [AuthProvider] انتهاء تهيئة المصادقة، isLoading = false');
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // تسجيل الدخول
  const login = async (email: string, password: string) => {
    console.log('🔑 [AuthProvider.login] بدء تسجيل الدخول:', email, new Date().toISOString());
    
    console.log('📡 [AuthProvider.login] إرسال طلب تسجيل الدخول إلى /api/auth/login');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('📨 [AuthProvider.login] استجابة تسجيل الدخول:', response.status);
    const data = await response.json();
    console.log('📋 [AuthProvider.login] بيانات الاستجابة:', data);

    if (data.success) {
      console.log('✅ [AuthProvider.login] نجح تسجيل الدخول، حفظ بيانات المستخدم:', data.user?.email || data.data?.user?.email);
      
      const userData = data.user || data.data?.user;
      const tokensData = data.tokens || data.data;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // معالجة كلاً من tokens.accessToken و token (للتوافق مع Vercel)
      if (tokensData?.accessToken) {
        console.log('💾 [AuthProvider.login] حفظ الرموز من tokens object');
        localStorage.setItem('accessToken', tokensData.accessToken);
        localStorage.setItem('refreshToken', tokensData.refreshToken || '');
      } else if (data.token) {
        console.log('💾 [AuthProvider.login] حفظ الرموز من token field');
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken || '');
      }
      
      console.log('🔄 [AuthProvider.login] تحديث cache queries');
      queryClient.invalidateQueries();
      console.log('🎉 [AuthProvider.login] اكتمل تسجيل الدخول بنجاح');
    } else {
      console.log('❌ [AuthProvider.login] فشل تسجيل الدخول:', data.message);
      throw new Error(data.message);
    }
  };

  // تسجيل الخروج
  const logout = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      queryClient.clear();
    }
  };

  // تجديد الرمز المميز
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('خطأ في تجديد الرمز:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
  };

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