/**
 * مكون حماية الصفحات - يحمي الصفحات من الوصول غير المصرح به
 * ✅ نسخة مبسطة ومحسنة لحل مشكلة الشاشة البيضاء
 */

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // ✅ الحالة 1: جاري التحميل - إظهار شاشة التحميل
  if (isLoading) {
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 bg-card rounded-lg border shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm animate-pulse">جاري التحقق من الجلسة...</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4 text-xs opacity-50 hover:opacity-100"
            onClick={() => window.location.reload()}
          >
            إعادة تحميل التطبيق
          </Button>
        </div>
      </div>
    );
  }

  // ✅ الحالة 2: غير مسجل دخول - السماح بالمرور للمسارات المستثناة لتجنب الحلقات اللانهائية
  if (!isAuthenticated || !user) {
    const excludedPaths = ['/check', '/permissions', '/setup', '/login', '/verify-email', '/reset-password'];
    
    if (excludedPaths.includes(window.location.pathname)) {
      return <>{children}</>;
    }

    return <Redirect to="/login" />;
  }

  // ✅ الحالة 3: مسجل دخول - إظهار المحتوى
  return <>{children}</>;
}
