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
import ProfessionalLoader from "@/components/ui/professional-loader";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Loader2, 
  CheckCircle, 
  RefreshCw,
  ArrowLeft,
  Shield,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
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

  // استخراج المعطيات من URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const email = urlParams.get('email');
    const token = urlParams.get('token');

    if (userId && email) {
      setUserInfo({ id: userId, email });
    }

    // إذا كان هناك token في URL، تحقق تلقائي
    if (token && userId) {
      verifyMutation.mutate({ code: token });
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
    mutationFn: async (data: VerificationFormData) => {
      console.log('🔍 [EmailVerification] بدء التحقق من الرمز:', {
        code: data.code,
        userId: userInfo.id
      });

      if (!userInfo.id) {
        throw new Error('معرف المستخدم مطلوب');
      }

      const response = await apiRequest('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          userId: userInfo.id,
          code: data.code
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل التحقق من الرمز');
      }

      return response.json() as Promise<VerificationResponse>;
    },
    onSuccess: (data) => {
      console.log('✅ [EmailVerification] تم التحقق بنجاح:', data);
      
      if (data.success) {
        setStep('verified');
        toast({
          title: "نجح التحقق! 🎉",
          description: data.message,
        });

        // انتقال تلقائي إلى صفحة تسجيل الدخول بعد 3 ثوان
        setTimeout(() => {
          navigate('/login');
        }, 3000);
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

      const response = await apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({
          userId: userInfo.id,
          email: userInfo.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل إعادة الإرسال');
      }

      return response.json() as Promise<VerificationResponse>;
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

  if (step === 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 relative">
        <AnimatedBackground />
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-gradient-to-r from-green-600 to-blue-600 rounded-full p-4 w-20 h-20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              تم التحقق بنجاح! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              تم تأكيد بريدك الإلكتروني بنجاح
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-gray-600">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 relative">
      <AnimatedBackground />
      
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-4 w-20 h-20 flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            تحقق من بريدك الإلكتروني
          </CardTitle>
          <CardDescription className="text-lg">
            أدخل رمز التحقق المرسل إلى بريدك الإلكتروني
          </CardDescription>
          {userInfo.email && (
            <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded-lg">
              📧 {userInfo.email}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                فشل في التحقق من الرمز. يرجى التأكد من صحة الرمز والمحاولة مرة أخرى.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">رمز التحقق</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        className="text-center text-2xl font-mono tracking-widest h-14 border-2 focus:border-blue-500"
                        disabled={verifyMutation.isPending}
                        data-testid="input-verification-code"
                        onChange={(e) => {
                          // قبول الأرقام فقط
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
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

          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">أو</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={countdown > 0 || resendMutation.isPending}
                className="w-full border-2 hover:bg-gray-50"
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
                className="w-full text-gray-600 hover:text-gray-800"
                data-testid="button-back-login"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                العودة إلى تسجيل الدخول
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 نصائح مهمة:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
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