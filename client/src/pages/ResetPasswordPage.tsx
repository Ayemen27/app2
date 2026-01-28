/**
 * صفحة إعادة تعيين كلمة المرور المتقدمة
 * يمكن الوصول إليها عبر رابط البريد الإلكتروني المرسل
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useToast } from "../hooks/use-toast";
import { 
  Loader2, 
  ArrowLeft,
  CheckCircle,
  Lock,
  KeyRound,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react";

// مخطط التحقق من البيانات
const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "كلمة المرور يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// مكون الخلفية المتحركة
const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-full blur-3xl animate-blob"></div>
    <div className="absolute -bottom-32 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-400/20 to-red-600/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-pink-400/20 to-purple-600/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
  </div>
);

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // استخراج الرمز من URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      // يمكن إضافة تحقق من صحة الرمز هنا
      setIsTokenValid(true);
    } else {
      setIsTokenValid(false);
    }
  }, []);

  // طفرة إعادة تعيين كلمة المرور
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData): Promise<ResetPasswordResponse> => {
      if (!token) {
        throw new Error('رمز الاسترجاع غير موجود');
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في إعادة تعيين كلمة المرور');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsSuccess(true);
        toast({
          title: "تم إعادة تعيين كلمة المرور",
          description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة",
        });
      } else {
        toast({
          title: "فشل في إعادة تعيين كلمة المرور",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ في إعادة تعيين كلمة المرور",
        description: error.message || "حدث خطأ أثناء المعالجة",
        variant: "destructive",
      });
      console.error('Reset password error:', error);
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data);
  };

  // مكون قوة كلمة المرور
  const PasswordStrengthIndicator = ({ password }: { password: string }) => {
    const getStrength = () => {
      if (!password) return { score: 0, label: "", color: "" };
      
      let score = 0;
      if (password.length >= 8) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      
      const labels = ["ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "قوية جداً"];
      const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"];
      
      return { score, label: labels[score - 1] || "", color: colors[score - 1] || "" };
    };
    
    const strength = getStrength();
    
    if (!password) return null;
    
    return (
      <div className="mt-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">قوة كلمة المرور</span>
          <span className={`text-xs font-medium ${strength.score >= 3 ? 'text-green-600' : 'text-orange-600'}`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  // في حالة الرمز غير صالح
  if (isTokenValid === false) {
    return (
      <div className="min-h-screen relative overflow-hidden" dir="rtl">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 dark:from-red-950/40 via-white/90 dark:via-slate-900/90 to-pink-50/80 dark:to-pink-950/40 backdrop-blur-sm"></div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="glass-morphism border-0 shadow-2xl backdrop-blur-xl max-w-md w-full">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-lg opacity-75 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-red-500 to-pink-500 rounded-full p-4">
                    <AlertTriangle className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-700">
                رابط غير صالح
              </CardTitle>
              <CardDescription className="text-gray-600">
                رابط استرجاع كلمة المرور غير صالح أو منتهي الصلاحية
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-1">
              <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  قد يكون الرابط منتهي الصلاحية أو تم استخدامه مسبقاً. يرجى طلب رابط جديد لاسترجاع كلمة المرور.
                </AlertDescription>
              </Alert>

              <div className="space-y-1">
                <Button
                  onClick={() => navigate("/forgot-password")}
                  className="w-full enhanced-button"
                >
                  <KeyRound className="ml-2 h-4 w-4" />
                  طلب رابط جديد
                </Button>

                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="w-full enhanced-outline-button"
                >
                  <ArrowLeft className="ml-2 h-4 w-4" />
                  العودة لتسجيل الدخول
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // في حالة نجاح إعادة تعيين كلمة المرور
  if (isSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden" dir="rtl">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 dark:from-green-950/40 via-white/90 dark:via-slate-900/90 to-emerald-50/80 dark:to-emerald-950/40 backdrop-blur-sm"></div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="glass-morphism border-0 shadow-2xl backdrop-blur-xl max-w-md w-full">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-lg opacity-75 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-4">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">
                تمت بنجاح!
              </CardTitle>
              <CardDescription className="text-gray-600">
                تم إعادة تعيين كلمة المرور بنجاح
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-1">
              <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => navigate("/login")}
                className="w-full enhanced-button"
              >
                <ArrowLeft className="ml-2 h-4 w-4" />
                تسجيل الدخول الآن
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      {/* الخلفية المتحركة */}
      <AnimatedBackground />
      
      {/* تأثير التدرج */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 dark:from-red-950/40 via-white/90 dark:via-slate-900/90 to-pink-50/80 dark:to-pink-950/40 backdrop-blur-sm"></div>
      
      {/* المحتوى الرئيسي */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-1">
          
          {/* العودة للصفحة الرئيسية */}
          <div className="flex items-center justify-center">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="ml-2 h-4 w-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>

          {/* شعار إعادة تعيين كلمة المرور */}
          <div className="flex flex-col items-center space-y-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 rounded-full blur-lg opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-red-600 to-pink-600 rounded-full p-4">
                <KeyRound className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                إعادة تعيين كلمة المرور
              </h1>
              <p className="text-gray-600 mt-2">أدخل كلمة المرور الجديدة</p>
            </div>
          </div>

          {/* البطاقة الرئيسية */}
          <Card className="glass-morphism border-0 shadow-2xl backdrop-blur-xl">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center">
                <Lock className="w-16 h-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                كلمة مرور جديدة
              </CardTitle>
              <CardDescription className="text-gray-600">
                اختر كلمة مرور قوية لحماية حسابك
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
                  
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">كلمة المرور الجديدة</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors z-10" />
                            <Input 
                              {...field} 
                              type={showNewPassword ? "text" : "password"}
                              placeholder="أدخل كلمة مرور قوية"
                              className="pr-10 pl-10 enhanced-input text-right"
                              data-testid="input-new-password"
                              showValidation={false}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors"
                              data-testid="button-toggle-new-password"
                            >
                              {showNewPassword ? (
                                <Eye className="h-4 w-4 text-red-500" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400 hover:text-red-500" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <PasswordStrengthIndicator password={field.value} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">تأكيد كلمة المرور</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors z-10" />
                            <Input 
                              {...field} 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="أعد إدخال كلمة المرور"
                              className="pr-10 pl-10 enhanced-input text-right"
                              data-testid="input-confirm-password"
                              showValidation={false}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors"
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? (
                                <Eye className="h-4 w-4 text-red-500" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400 hover:text-red-500" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full enhanced-button"
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-reset-password"
                    style={{
                      background: "linear-gradient(135deg, #dc2626 0%, #ec4899 100%)"
                    }}
                  >
                    {resetPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جارِ إعادة التعيين...
                      </>
                    ) : (
                      <>
                        <KeyRound className="ml-2 h-4 w-4" />
                        إعادة تعيين كلمة المرور
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="text-center space-y-2 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  تذكرت كلمة المرور؟{" "}
                  <Link href="/login">
                    <span className="text-red-600 hover:text-red-500 font-medium cursor-pointer">
                      تسجيل الدخول
                    </span>
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* تعليمات الأمان */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">نصائح الأمان:</p>
                  <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• استخدم كلمة مرور قوية ومعقدة</li>
                    <li>• تجنب استخدام معلومات شخصية</li>
                    <li>• احتفظ بكلمة المرور في مكان آمن</li>
                    <li>• لا تشارك كلمة المرور مع أي شخص</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            <p>© 2025 نظام إدارة المشاريع الإنشائية</p>
            <p>جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    </div>
  );
}