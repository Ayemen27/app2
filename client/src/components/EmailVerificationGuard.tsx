
/**
 * حارس التحقق من البريد الإلكتروني
 * يمنع الوصول للتطبيق حتى يتم التحقق من البريد الإلكتروني
 */

import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "./AuthProvider";
import AxionLoader from "./ui/axion-loader";

interface EmailVerificationGuardProps {
  children: ReactNode;
}

export default function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { user, isLoading } = useAuth();

  // التحقق من حالة التحقق من البريد الإلكتروني مع دعم التوافق
  const isEmailVerified = 
    user?.emailVerified === true || 
    localStorage.getItem('emailVerified') === 'true';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <AxionLoader isLoading={true} message="جاري التحقق من البريد الإلكتروني..." />
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل دخول، توجيه لتسجيل الدخول
  if (!user) {
    return <Redirect to="/login" />;
  }

  // إذا كان المستخدم مديراً، اسمح له بالدخول دائماً
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // إذا لم يتم التحقق من البريد الإلكتروني، توجيه لصفحة التحقق
  if (!isEmailVerified) {
    return (
      <Redirect 
        to={`/verify-email?user_id=${user.id}&email=${encodeURIComponent(user.email)}`} 
      />
    );
  }

  // السماح بالوصول للمحتوى
  return <>{children}</>;
}
