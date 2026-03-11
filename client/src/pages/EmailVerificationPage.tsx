/**
 * صفحة التحقق من البريد الإلكتروني
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
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
import AxionLoader from "../components/ui/axion-loader";
import { useToast } from "../hooks/use-toast";
import { 
  Mail, 
  Loader2, 
  CheckCircle, 
  RefreshCw,
  ArrowLeft,
  Shield,
  Clock,
  Copy,
  Check
} from "lucide-react";
import { apiRequest } from "../lib/queryClient";

// مخطط التحقق
const verificationSchema = z.object({
  code: z.string().length(6, "رمز التحقق يجب أن يكون 6 أرقام").regex(/^\d+$/, "رمز التحقق يجب أن يحتوي على أرقام فقط"),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

// واجهات الاستجابة
interface VerificationResponse {
  success: boolean;
  message: string;
}

// مكون الخلفية المتحركة
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-blob"></div>
    <div className="absolute -bottom-32 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
  </div>
);

export default function EmailVerificationPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'input' | 'verified' | 'error'>('input');
  const [userInfo, setUserInfo] = useState<{ id?: string; email?: string }>({});
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);

  // استخراج المعطيات من URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const user_id = urlParams.get('user_id');
    const email = urlParams.get('email');
    const token = urlParams.get('token');

    if (user_id && email) {
      setUserInfo({ id: user_id, email });
    }

    // إذا كان هناك token في URL، تحقق تلقائي مع تمرير user_id مباشرة
    if (token && user_id) {
      console.log('🔄 [EmailVerification] التحقق التلقائي من الرابط:', { token, user_id });
      verifyMutation.mutate({ code: token, user_id: user_id });
    }
  }, []);

  // عداد إعادة الإرسال
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // نموذج التحقق
  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  // طفرة التحقق من الرمز
  const verifyMutation = useMutation({
    mutationFn: async (data: VerificationFormData & { user_id?: string }) => {
      console.log('🔍 [EmailVerification] بدء التحقق من الرمز:', {
        code: data.code,
        user_id: data.user_id || userInfo.id
      });

      const user_id = data.user_id || userInfo.id;
      if (!user_id) {
        throw new Error('معرف المستخدم مطلوب');
      }

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          code: data.code
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'فشل التحقق من الرمز');
      }

      return result as VerificationResponse;
    },
    onSuccess: (data) => {
      console.log('✅ [EmailVerification] تم التحقق بنجاح:', data);
      
      if (data.success) {
        // نجح التحقق! تحديث حالة المستخدم محلياً فوراً لمنع إعادة التوجيه
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          const updatedUser = { ...user, emailVerified: true };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          // لا نحتاج لاستدعاء setUser هنا لأننا سننتقل لصفحة أخرى أو نعيد التحميل
          // ولكن للتأكد من أن الحراس (Guards) يرون التغيير إذا بقوا في الصفحة
        }

        setStep('verified');
        toast({
          title: "نجح التحقق! 🎉",
          description: data.message,
        });

        // انتقال تلقائي إلى الصفحة الرئيسية أو لوحة التحكم بدلاً من تسجيل الدخول
        // بما أن المستخدم مسجل دخول بالفعل (لهذا هو في هذه الصفحة)
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setStep('error');
        toast({
          title: "فشل التحقق",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('❌ [EmailVerification] خطأ في التحقق:', error);
      setStep('error');
      
      toast({
        title: "فشل التحقق",
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: "destructive",
      });
    }
  });

  // طفرة إعادة الإرسال
  const resendMutation = useMutation({
    mutationFn: async () => {
      console.log('📧 [EmailVerification] إعادة إرسال رمز التحقق');

      if (!userInfo.id || !userInfo.email) {
        throw new Error('بيانات المستخدم مطلوبة');
      }

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userInfo.id,
          email: userInfo.email
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'فشل إعادة الإرسال');
      }

      return result as VerificationResponse;
    },
    onSuccess: (data) => {
      console.log('✅ [EmailVerification] تم إعادة الإرسال بنجاح:', data);
      
      toast({
        title: "تم إعادة الإرسال",
        description: data.message,
      });

      setCountdown(60); // منع إعادة الإرسال لمدة 60 ثانية
      form.reset(); // إعادة تعيين النموذج
    },
    onError: (error) => {
      console.error('❌ [EmailVerification] خطأ في إعادة الإرسال:', error);
      
      toast({
        title: "فشل إعادة الإرسال",
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: VerificationFormData) => {
    verifyMutation.mutate(data);
  };

  const handleResend = () => {
    if (countdown === 0) {
      resendMutation.mutate();
    }
  };

  const handleCopyCode = async () => {
    const code = form.getValues('code');
    if (code && code.length === 6) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        toast({
          title: "تم النسخ!",
          description: "تم نسخ رمز التحقق إلى الحافظة",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: "فشل النسخ",
          description: "حدث خطأ أثناء نسخ الرمز",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "لا يوجد رمز للنسخ",
        description: "يرجى إدخال رمز التحقق أولاً",
        variant: "destructive",
      });
    }
  };

  if (step === 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative">
        <AnimatedBackground />
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto bg-blue-600 dark:bg-white rounded-full p-4 w-20 h-20 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <CheckCircle className="w-10 h-10 text-white dark:text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              تم التحقق بنجاح! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              تم تأكيد بريدك الإلكتروني بنجاح
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-center space-y-1">
              <p className="text-muted-foreground">
                سيتم توجيهك إلى صفحة تسجيل الدخول خلال ثوانِ...
              </p>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                data-testid="button-continue-login"
              >
                المتابعة إلى تسجيل الدخول
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative py-8">
      <AnimatedBackground />
      
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto bg-blue-600 dark:bg-white rounded-full p-4 w-20 h-20 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Mail className="w-10 h-10 text-white dark:text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            تحقق من بريدك الإلكتروني
          </CardTitle>
          <CardDescription className="text-lg">
            أدخل رمز التحقق المرسل إلى بريدك الإلكتروني
          </CardDescription>
          {userInfo.email && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded-lg">
              📧 {userInfo.email}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-1">
          {step === 'error' && (
            <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <AlertDescription className="text-red-700 dark:text-red-400">
                فشل في التحقق من الرمز. يرجى التأكد من صحة الرمز والمحاولة مرة أخرى.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-1">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">رمز التحقق</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="000000"
                          className="text-center text-2xl font-mono tracking-widest h-14 border-2 focus:border-blue-500 pr-12"
                          disabled={verifyMutation.isPending}
                          data-testid="input-verification-code"
                          onChange={(e) => {
                            // قبول الأرقام فقط
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyCode}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        title="نسخ الرمز إلى الحافظة"
                        data-testid="button-copy-verification-code"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg shadow-lg"
                disabled={verifyMutation.isPending}
                data-testid="button-verify-email"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    تحقق من الرمز
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center space-y-1">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">أو</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={countdown > 0 || resendMutation.isPending}
                className="w-full border-2 hover:bg-muted"
                data-testid="button-resend-code"
              >
                {resendMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    انتظر {countdown} ثانية
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    إعادة إرسال الرمز
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="w-full text-muted-foreground hover:text-foreground"
                data-testid="button-back-login"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                العودة إلى تسجيل الدخول
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-300">💡 نصائح مهمة:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• تحقق من مجلد الرسائل غير المرغوب فيها</li>
              <li>• الرمز صالح لمدة 24 ساعة فقط</li>
              <li>• الرمز يحتوي على 6 أرقام</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}