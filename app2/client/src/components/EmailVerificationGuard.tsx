
/**
 * حارس التحقق من البريد الإلكتروني
 * يمنع الوصول للتطبيق حتى يتم التحقق من البريد الإلكتروني
 */

import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "./AuthProvider";
import ProfessionalLoader from "./ui/professional-loader";

interface EmailVerificationGuardProps {
  children: ReactNode;
}

export default function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <ProfessionalLoader />
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل دخول، توجيه لتسجيل الدخول
  if (!user) {
    return <Redirect to="/login" />;
  }

  // إذا لم يتم التحقق من البريد الإلكتروني، توجيه لصفحة التحقق
  if (!user.emailVerified) {
    console.log('🚫 [EmailVerificationGuard] المستخدم لم يتم التحقق من البريد، توجيه للتحقق');
    return (
      <Redirect 
        to={`/verify-email?userId=${user.id}&email=${encodeURIComponent(user.email)}`} 
      />
    );
  }

  // السماح بالوصول للمحتوى
  return <>{children}</>;
}
