
/**
 * مكون حماية الصفحات - يحمي الصفحات من الوصول غير المصرح به
 */

import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { ProfessionalLoader } from "./ui/professional-loader";
import { Redirect } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // فحص إضافي للتأكد من وجود بيانات محفوظة
  const hasStoredAuth = typeof window !== 'undefined' && 
    localStorage.getItem('user') && 
    localStorage.getItem('accessToken');

  console.log('🛡️ [ProtectedRoute] فحص الحماية:', {
    isLoading,
    isAuthenticated,
    hasStoredAuth,
    userEmail: user?.email || 'غير موجود',
    authCheckComplete,
    timestamp: new Date().toISOString()
  });

  // انتظار تحميل AuthProvider لفترة معقولة
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setAuthCheckComplete(true);
      }, 1000); // انتظار ثانية واحدة للتأكد من تحميل البيانات

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // إظهار شاشة التحميل أثناء التحقق من المصادقة
  if (isLoading || (!authCheckComplete && hasStoredAuth)) {
    console.log('⏳ [ProtectedRoute] في حالة تحميل، إظهار شاشة التحميل');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ProfessionalLoader />
      </div>
    );
  }

  // إذا كان مصادق عليه، اسمح بالدخول
  if (isAuthenticated && user) {
    console.log('✅ [ProtectedRoute] مصادق عليه، إظهار المحتوى للمستخدم:', user.email);
    return <>{children}</>;
  }

  // إذا كانت هناك بيانات محفوظة ولكن لم يتم تحميل المستخدم، محاولة أخيرة
  if (hasStoredAuth && !user && authCheckComplete) {
    console.log('⚠️ [ProtectedRoute] بيانات محفوظة موجودة لكن المستخدم غير محمل، إعادة المحاولة...');
    
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.email) {
          console.log('✅ [ProtectedRoute] تم استرجاع بيانات المستخدم من localStorage');
          return <>{children}</>;
        }
      }
    } catch (error) {
      console.error('❌ [ProtectedRoute] خطأ في استرجاع بيانات المستخدم من localStorage:', error);
    }
  }

  // إذا لم توجد بيانات مصادقة، إعادة توجيه لتسجيل الدخول
  if (!isAuthenticated && !hasStoredAuth) {
    console.log('🚫 [ProtectedRoute] غير مصادق عليه، إعادة توجيه إلى /login');
    return <Redirect to="/login" />;
  }

  // في حالة وجود بيانات محفوظة لكن المصادقة فاشلة، تنظيف البيانات وإعادة التوجيه
  if (hasStoredAuth && !isAuthenticated && authCheckComplete) {
    console.log('🧹 [ProtectedRoute] تنظيف البيانات الفاسدة وإعادة التوجيه');
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return <Redirect to="/login" />;
  }

  // حالة افتراضية - إظهار شاشة التحميل
  console.log('⏳ [ProtectedRoute] حالة افتراضية، إظهار شاشة التحميل');
  return (
    <div className="min-h-screen flex items-center justify-center">
      <ProfessionalLoader />
    </div>
  );
}
