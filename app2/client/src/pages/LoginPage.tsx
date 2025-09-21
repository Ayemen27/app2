/**
 * صفحة تسجيل الدخول - نظام المصادقة المتقدم
 */

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Shield, Mail } from "lucide-react";

// مخطط التحقق من البيانات
const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  totpCode: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

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

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa' | 'verification'>('credentials');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      totpCode: "",
    },
  });

  // طفرة تسجيل الدخول المبسطة
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      console.log('🔑 بدء تسجيل الدخول:', data.email);
      return login(data.email, data.password);
    },
    onSuccess: () => {
      console.log('✅ نجح تسجيل الدخول');
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "أهلاً وسهلاً",
      });

      // التوجه إلى الصفحة الرئيسية مع تأخير بسيط للتأكد من تحديث الحالة
      console.log('🚀 [LoginPage] بدء التوجيه للصفحة الرئيسية...');
      setTimeout(() => {
        console.log('🎯 [LoginPage] تنفيذ التوجيه إلى /');
        navigate("/");

        // إجبار إعادة تحميل الصفحة إذا لم يتم التوجيه
        setTimeout(() => {
          console.log('🔄 [LoginPage] التحقق من التوجيه الناجح...');
          if (window.location.pathname === '/login') {
            console.log('⚠️ [LoginPage] لم يتم التوجيه، إعادة تحميل الصفحة');
            window.location.href = '/';
          }
        }, 1000);
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ فشل تسجيل الدخول:', error);
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message || "حدث خطأ أثناء الاتصال بالخادم",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  // وظيفة لتعيين البريد وكلمة المرور (مستخدمة في زر الدخول التجريبي)
  const setEmail = (email: string) => form.setValue('email', email);
  const setPassword = (password: string) => form.setValue('password', password);
  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault(); // منع السلوك الافتراضي إذا تم تمرير الحدث
    const data = form.getValues();
    onSubmit(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-blue-600 rounded-full p-3">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">تسجيل الدخول</h1>
          <p className="text-gray-600">نظام إدارة المشاريع الإنشائية</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">أهلاً وسهلاً</CardTitle>
            <CardDescription>
              {loginStep === 'credentials' && 'أدخل بيانات تسجيل الدخول'}
              {loginStep === 'mfa' && 'أدخل رمز التحقق الثنائي'}
              {loginStep === 'verification' && 'يرجى التحقق من بريدك الإلكتروني'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* خطوة بيانات تسجيل الدخول */}
                {loginStep === 'credentials' && (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                              <Input 
                                {...field} 
                                type="email"
                                placeholder="admin@example.com"
                                className="pr-10"
                                data-testid="input-email"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="كلمة المرور"
                                className="pl-10"
                                data-testid="input-password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? <EyeOff /> : <Eye />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* خطوة التحقق الثنائي */}
                {loginStep === 'mfa' && (
                  <FormField
                    control={form.control}
                    name="totpCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رمز التحقق الثنائي</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            className="text-center text-2xl tracking-widest"
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

                {/* خطوة التحقق من البريد */}
                {loginStep === 'verification' && (
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      يرجى التحقق من بريدك الإلكتروني وإكمال عملية التحقق قبل تسجيل الدخول.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جارِ تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      {loginStep === 'credentials' && 'تسجيل الدخول'}
                      {loginStep === 'mfa' && 'تأكيد الرمز'}
                      {loginStep === 'verification' && 'إعادة إرسال رمز التحقق'}
                    </>
                  )}
                </Button>

                {/* زر دخول تجريبي سريع */}
                {loginStep === 'credentials' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => {
                      setEmail("admin@demo.local");
                      setPassword("bypass-demo-login");
                      // تفعيل تسجيل الدخول التلقائي
                      setTimeout(() => {
                        handleSubmit({ preventDefault: () => {} } as any);
                      }, 100);
                    }}
                    disabled={loginMutation.isPending}
                    data-testid="button-quick-login"
                  >
                    <Shield className="ml-2 h-4 w-4" />
                    تسجيل دخول سريع (تجريبي)
                  </Button>
                )}

                {loginStep !== 'credentials' && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setLoginStep('credentials');
                      form.reset();
                    }}
                    data-testid="button-back"
                  >
                    العودة لتسجيل الدخول
                  </Button>
                )}
              </form>
            </Form>

            <div className="text-center space-y-2 pt-4 border-t">
              <p className="text-sm text-gray-600">
                ليس لديك حساب؟{" "}
                <Link href="/register">
                  <span className="text-blue-600 hover:text-blue-500 font-medium cursor-pointer" data-testid="link-register">
                    إنشاء حساب جديد
                  </span>
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                <Link href="/forgot-password">
                  <span className="text-blue-600 hover:text-blue-500 cursor-pointer" data-testid="link-forgot-password">
                    نسيت كلمة المرور؟
                  </span>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 نظام إدارة المشاريع الإنشائية</p>
          <p>جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}