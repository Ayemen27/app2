/**
 * مكون حماية الصفحات - يحمي الصفحات من الوصول غير المصرح به
 * ✅ نسخة مبسطة ومحسنة لحل مشكلة الشاشة البيضاء
 */

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('🛡️ [ProtectedRoute] فحص الحماية:', {
    isLoading,
    isAuthenticated,
    hasUser: !!user,
    userEmail: user?.email || 'غير موجود',
    timestamp: new Date().toISOString()
  });

  // ✅ الحالة 1: جاري التحميل - إظهار شاشة التحميل
  if (isLoading) {
    console.log('⏳ [ProtectedRoute] جاري التحميل...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 bg-card rounded-lg border shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm animate-pulse">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  // ✅ الحالة 2: غير مسجل دخول - توجيه فوري لصفحة الدخول
  if (!isAuthenticated || !user) {
    console.log('🚫 [ProtectedRoute] غير مصادق، توجيه إلى /login');
    return <Redirect to="/login" />;
  }

  // ✅ الحالة 3: مسجل دخول - إظهار المحتوى
  console.log('✅ [ProtectedRoute] مصادق عليه، إظهار المحتوى للمستخدم:', user.email);
  return <>{children}</>;
}
