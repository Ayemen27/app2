
/**
 * صفحة تسجيل الدخول المتطورة - نظام المصادقة المتقدم
 * مع تأثيرات بصرية احترافية ونظام التبويبات
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input, useFormMemory } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProfessionalLoader from "@/components/ui/professional-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { showToast } from "@/utils/toast";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Shield, 
  Mail, 
  User,
  UserPlus,
  KeyRound,
  ArrowRight,
  Sparkles,
  Lock,
  Phone
} from "lucide-react";

// مخططات التحقق من البيانات
const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  totpCode: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(50, "الاسم طويل جداً"),
  email: z.string().email("بريد إلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
  phone: z.string().min(9, "رقم الهاتف غير صحيح").optional(),
  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "كلمة المرور يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// واجهات الاستجابة
interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    mfaEnabled: boolean;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
  requireMFA?: boolean;
  requireVerification?: boolean;
  message: string;
}

interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  requireVerification?: boolean;
  requireEmailVerification?: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      fullName: string;
      createdAt: string;
    };
  };
  message: string;
}

// مكون الخلفية المتحركة
const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-blob"></div>
    <div className="absolute -bottom-32 -left-40 w-96 h-96 bg-gradient-to-tr from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
  </div>
);

// مكون شعار الشركة المتطور
const CompanyLogo = () => (
  <div className="flex flex-col items-center space-y-1">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-75 animate-pulse"></div>
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-1.5">
        <Shield className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
        نظام إدارة المشاريع
      </h1>
      <p className="text-[10px] text-gray-600 mt-0.5">الحل الشامل لإدارة المشاريع الإنشائية</p>
    </div>
  </div>
);

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa' | 'verification'>('credentials');

  // نماذج التحقق
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      totpCode: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // طفرة تسجيل الدخول
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      console.log('🚀 [AuthPage.loginMutation] بدء عملية تسجيل الدخول:', {
        email: data.email,
        hasPassword: !!data.password,
        timestamp: new Date().toISOString()
      });
      
      try {
        const result = await login(data.email, data.password);
        console.log('✅ [AuthPage.loginMutation] تمت عملية login بنجاح:', result);
        return result;
      } catch (error) {
        console.error('❌ [AuthPage.loginMutation] خطأ في login:', error);
        throw error;
      }
    },
    onSuccess: (result: any) => {
      console.log('🎉 [AuthPage.loginMutation] نجح تسجيل الدخول:', result);
      
      // لا توجد حاجة لهذا التحقق لأن الخادم لن يسمح بالدخول بدون تحقق
      
      // استخراج اسم المستخدم من النتيجة
      const userName = result?.data?.user?.name || result?.user?.name;
      toast({
        title: `أهلاً وسهلاً ${userName ? userName : 'بك'}!`,
        description: "تم تسجيل الدخول بنجاح. مرحباً بعودتك إلى نظام إدارة المشاريع",
      });

      setTimeout(() => {
        navigate("/");
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.href = '/';
          }
        }, 1000);
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ [AuthPage.loginMutation] فشل تسجيل الدخول:', error);
      console.error('❌ [AuthPage.loginMutation] تفاصيل الخطأ:', {
        status: error?.status,
        message: error?.message,
        response: error?.response,
        data: error?.data
      });
      
      // التحقق من حالة عدم تفعيل البريد الإلكتروني - تحسين المنطق
      const isEmailNotVerified = 
        error?.status === 403 ||
        error?.message?.includes('requireEmailVerification') || 
        error?.message?.includes('يجب تأكيد البريد') ||
        error?.message?.includes('يجب التحقق من بريدك الإلكتروني') ||
        (error as any)?.response?.data?.requireEmailVerification ||
        (error as any)?.response?.status === 403 ||
        error?.data?.requireEmailVerification;
      
      if (isEmailNotVerified) {
        const errorData = error?.data || (error as any)?.response?.data;
        const userId = errorData?.data?.userId || errorData?.userId;
        const email = errorData?.data?.email || errorData?.email;
        
        // استخدام نظام Toast الجديد المحسن للهواتف
        showToast({
          title: "البريد الإلكتروني غير مفعل",
          message: "يجب التحقق من بريدك الإلكتروني أولاً. تم إرسال رمز تحقق جديد.",
          variant: "error",
          duration: 5000 // عرض لمدة 5 ثواني لإعطاء وقت للقراءة
        });
        
        // توجيه إلى صفحة التحقق من البريد بعد 3 ثوان لإعطاء وقت أكثر لقراءة الرسالة
        setTimeout(() => {
          if (userId && email) {
            navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(email)}`);
          } else {
            // في حالة عدم وجود معرف المستخدم، نحاول استخدام البريد من النموذج
            const formEmail = loginForm.getValues('email');
            if (formEmail) {
              navigate(`/verify-email?email=${encodeURIComponent(formEmail)}`);
            }
          }
        }, 3000);
        return;
      }
      
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message || "حدث خطأ أثناء الاتصال بالخادم",
        variant: "destructive",
      });
    },
  });

  // طفرة التسجيل
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData): Promise<RegisterResponse> => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      });

      if (!response.ok && response.status !== 201 && response.status !== 202) {
        throw new Error(`خطأ في الشبكة: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ [RegisterMutation] استجابة التسجيل:', data);
      
      if (data.success) {
        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
        });

        // توجيه تلقائي إلى صفحة التحقق من البريد الإلكتروني
        // استخراج معرف المستخدم والإيميل من الاستجابة
        if (data.user?.id && data.user?.email) {
          const userId = data.user.id;
          const userEmail = data.user.email;
          console.log('🔄 [RegisterMutation] التوجيه إلى صفحة التحقق:', { userId, userEmail });
          
          setTimeout(() => {
            navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(userEmail)}`);
          }, 1500);
        } else if (data.data?.user?.id && data.data?.user?.email) {
          // احتياطي في حال كان في data.data
          const userId = data.data.user.id;
          const userEmail = data.data.user.email;
          console.log('🔄 [RegisterMutation] التوجيه إلى صفحة التحقق (احتياطي):', { userId, userEmail });
          
          setTimeout(() => {
            navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(userEmail)}`);
          }, 1500);
        } else {
          console.log('⚠️ [RegisterMutation] لم يتم العثور على بيانات المستخدم للتوجيه');
          setActiveTab('login');
        }
        
      } else {
        toast({
          title: "فشل إنشاء الحساب",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء الحساب",
        description: "حدث خطأ أثناء الاتصال بالخادم",
        variant: "destructive",
      });
      console.error('Register error:', error);
    },
  });

  // طفرة استرجاع كلمة المرور
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('فشل في إرسال طلب استرجاع كلمة المرور');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال رابط الاسترجاع",
        description: "يرجى التحقق من بريدك الإلكتروني",
      });
      setActiveTab('login');
    },
    onError: (error) => {
      toast({
        title: "خطأ في استرجاع كلمة المرور",
        description: "حدث خطأ أثناء المعالجة",
        variant: "destructive",
      });
    },
  });

  // دوال التحقق التفاعلي
  const emailValidator = useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return { isValid: false, message: "البريد الإلكتروني مطلوب" };
    if (!emailRegex.test(value)) return { isValid: false, message: "تنسيق البريد الإلكتروني غير صحيح" };
    return { isValid: true, message: "البريد الإلكتروني صحيح" };
  }, []);

  const passwordValidator = useCallback((value: string) => {
    if (!value) return { isValid: false, message: "كلمة المرور مطلوبة" };
    if (value.length < 8) return { isValid: false, message: "كلمة المرور قصيرة جداً" };
    
    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/\d/.test(value)) strength++;
    if (/[^A-Za-z0-9]/.test(value)) strength++;
    
    return { 
      isValid: true, 
      message: "كلمة المرور قوية", 
      strength: Math.min(strength, 4) 
    };
  }, []);

  // دوال التعامل مع النماذج
  const onLoginSubmit = (data: LoginFormData) => {
    console.log('🚀 [AuthPage.onLoginSubmit] تسجيل دخول:', { 
      email: data.email, 
      hasPassword: !!data.password,
      timestamp: new Date().toISOString()
    });
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  // دالة الدخول السريع
  const handleQuickLogin = () => {
    console.log('🎯 [AuthPage.QuickLogin] الضغط على زر الدخول السريع');
    loginForm.setValue('email', "demo@test.com");
    loginForm.setValue('password', "Demo@123456");
    
    setTimeout(() => {
      const data = loginForm.getValues();
      onLoginSubmit(data);
    }, 100);
  };

  return (
    <div className="h-screen relative overflow-hidden" dir="rtl">
      {/* الخلفية المتحركة */}
      <AnimatedBackground />
      
      {/* تأثير التدرج */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/90 to-purple-50/80 backdrop-blur-sm"></div>
      
      {/* المحتوى الرئيسي */}
      <div className="relative z-10 h-screen flex items-center justify-center p-2 overflow-y-auto">
        <div className="w-full max-w-md space-y-1">
          
          {/* شعار الشركة */}
          <CompanyLogo />

          {/* البطاقة الرئيسية مع التأثيرات */}
          <Card className="glass-morphism border-0 shadow-2xl backdrop-blur-xl">
            <CardHeader className="space-y-0 text-center pt-3 px-3">
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                مرحباً بك
              </CardTitle>
              <CardDescription className="text-xs text-gray-600">
                اختر العملية المطلوبة من الأسفل
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-2 px-3">
              {/* نظام التبويبات المتطور */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 glass-tabs gap-1">
                  <TabsTrigger 
                    value="login" 
                    className="flex items-center gap-1 tab-trigger px-3 py-2 text-sm"
                  >
                    <Shield className="w-3 h-3" />
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="flex items-center gap-1 tab-trigger px-3 py-2 text-sm"
                  >
                    <UserPlus className="w-3 h-3" />
                    حساب جديد
                  </TabsTrigger>
                </TabsList>

                {/* محتوى تسجيل الدخول */}
                <TabsContent value="login" className="space-y-2 tab-content mt-2">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-2">
                      
                      {loginStep === 'credentials' && (
                        <>
                          <FormField
                            control={loginForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-gray-700 font-medium">البريد الإلكتروني</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="email"
                                    placeholder="admin@example.com"
                                    leftIcon={<Mail className="h-4 w-4" />}
                                    validator={emailValidator}
                                    fieldType="email"
                                    validationContext="login"
                                    showValidation={true}
                                    enableMemory={true}
                                    memoryKey="login-email"
                                    className="enhanced-input"
                                    data-testid="input-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-gray-700 font-medium">كلمة المرور</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="كلمة المرور"
                                    validator={passwordValidator}
                                    fieldType="password"
                                    showValidation={false}
                                    enableMemory={true}
                                    memoryKey="login-password"
                                    className="enhanced-input"
                                    data-testid="input-password"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* خيارات تسجيل الدخول */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <input
                                type="checkbox"
                                id="remember-me"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="remember-me" className="text-sm text-gray-600">
                                تذكرني
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('forgot')}
                              className="text-sm text-blue-600 hover:text-blue-500 cursor-pointer transition-colors duration-200"
                            >
                              نسيت كلمة المرور؟
                            </button>
                          </div>
                        </>
                      )}

                      {loginStep === 'mfa' && (
                        <FormField
                          control={loginForm.control}
                          name="totpCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">رمز التحقق الثنائي</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="000000"
                                  maxLength={6}
                                  className="text-center text-2xl tracking-widest enhanced-input"
                                  data-testid="input-totp-code"
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-sm text-gray-500 text-center">
                                أدخل الرمز من تطبيق المصادقة
                              </p>
                            </FormItem>
                          )}
                        />
                      )}

                      <Button
                        type="submit"
                        loading={loginMutation.isPending}
                        loadingText="جارِ تسجيل الدخول..."
                        enableRateLimit={true}
                        rateLimitDelay={2000}
                        className="w-full h-8 text-sm"
                        data-testid="button-login"
                      >
                        <ArrowRight className="ml-2 h-3 w-3" />
                        {loginStep === 'credentials' && 'تسجيل الدخول'}
                        {loginStep === 'mfa' && 'تأكيد الرمز'}
                      </Button>

                      {loginStep === 'credentials' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-8 text-sm"
                          onClick={handleQuickLogin}
                          loading={loginMutation.isPending}
                          enableRateLimit={true}
                          data-testid="button-quick-login"
                        >
                          <Sparkles className="ml-2 h-3 w-3" />
                          تسجيل دخول سريع (تجريبي)
                        </Button>
                      )}
                    </form>
                  </Form>
                </TabsContent>

                {/* محتوى التسجيل */}
                <TabsContent value="register" className="space-y-2 tab-content mt-2">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-2">
                      
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">الاسم الكامل</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <User className="absolute right-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="text"
                                  placeholder="أحمد محمد"
                                  className="pr-10 enhanced-input"
                                  data-testid="input-name"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute right-2 top-2 h-3 w-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="email"
                                  placeholder="ahmed@example.com"
                                  className="pr-10 enhanced-input"
                                  validator={emailValidator}
                                  fieldType="email"
                                  validationContext="register"
                                  showValidation={true}
                                  data-testid="input-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">رقم الهاتف (اختياري)</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Phone className="absolute right-2 top-2 h-3 w-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="tel"
                                  placeholder="771234567"
                                  className="pr-10 enhanced-input"
                                  data-testid="input-phone"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">كلمة المرور</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="كلمة المرور"
                                  className="pl-10 enhanced-input"
                                  validator={passwordValidator}
                                  fieldType="password"
                                  showValidation={true}
                                  strengthIndicator={true}
                                  data-testid="input-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute left-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                                  data-testid="button-toggle-password"
                                >
                                  {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500">
                              يجب أن تحتوي على 8 أحرف، حروف كبيرة وصغيرة، وأرقام
                            </p>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">تأكيد كلمة المرور</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="تأكيد كلمة المرور"
                                  className="pl-10 enhanced-input"
                                  data-testid="input-confirm-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute left-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                                  data-testid="button-toggle-confirm-password"
                                >
                                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full h-8 text-sm enhanced-button"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                            جارِ إنشاء الحساب...
                          </>
                        ) : (
                          <>
                            <UserPlus className="ml-2 h-3 w-3" />
                            إنشاء حساب جديد
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* محتوى استرجاع كلمة المرور */}
                <TabsContent value="forgot" className="space-y-2 tab-content mt-2">
                  <div className="text-center space-y-1">
                    <Lock className="w-8 h-8 text-blue-500 mx-auto" />
                    <h3 className="text-sm font-semibold text-gray-900">استرجاع كلمة المرور</h3>
                    <p className="text-xs text-gray-600">
                      أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
                    </p>
                  </div>

                  <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-2">
                      
                      <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-700 font-medium">البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute right-2 top-2 h-3 w-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                  {...field} 
                                  type="email"
                                  placeholder="أدخل بريدك الإلكتروني"
                                  className="pr-10 enhanced-input"
                                  validator={emailValidator}
                                  fieldType="email"
                                  showValidation={true}
                                  data-testid="input-forgot-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full h-8 text-sm enhanced-button"
                        disabled={forgotPasswordMutation.isPending}
                        data-testid="button-forgot-password"
                      >
                        {forgotPasswordMutation.isPending ? (
                          <>
                            <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                            جارِ الإرسال...
                          </>
                        ) : (
                          <>
                            <Mail className="ml-2 h-3 w-3" />
                            إرسال رابط الاسترجاع
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 space-y-0">
            <p className="text-[10px]">© 2025 نظام إدارة المشاريع الإنشائية</p>
            <p className="text-[10px]">جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
