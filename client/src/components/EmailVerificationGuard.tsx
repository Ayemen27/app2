
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

  // إذا كان المستخدم مديراً، اسمح له بالدخول دائماً (لأن بريدهم محقق يدوياً أو مستثنى)
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // إذا لم يتم التحقق من البريد الإلكتروني (emailVerified === false أو undefined)، توجيه لصفحة التحقق
  if (user.emailVerified === false) {
    console.log('🚫 [EmailVerificationGuard] المستخدم لم يتم التحقق من البريد، توجيه للتحقق', { emailVerified: user.emailVerified });
    
    // فحص localStorage كحماية إضافية (Redundancy)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.emailVerified === true) {
          console.log('✅ [EmailVerificationGuard] تم العثور على حالة تحقق في localStorage، السماح بالمرور');
          return <>{children}</>;
        }
      } catch (e) {}
    }

    return (
      <Redirect 
        to={`/verify-email?userId=${user.id}&email=${encodeURIComponent(user.email)}`} 
      />
    );
  }

  // السماح بالوصول للمحتوى
  return <>{children}</>;
}
