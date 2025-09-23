
/**
 * تم نقل محتوى هذه الصفحة إلى صفحة المصادقة الموحدة (LoginPage.tsx)
 * الآن يمكن الوصول لجميع عمليات المصادقة من صفحة واحدة مع نظام التبويبات
 */

import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RegisterPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // إعادة توجيه إلى الصفحة الموحدة
    navigate("/login");
  }, [navigate]);

  return null;
}
