import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { 
  ShieldCheck,
  Mail,
  Loader2,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل إرسال رابط الاسترجاع");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "تم إرسال الرابط",
        description: "يرجى التحقق من بريدك الإلكتروني لاستكمال استعادة كلمة المرور",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إرسال الرابط",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isSuccess) {
    return (
      <div className="h-screen w-full bg-[#F5F7F9] flex flex-col items-center overflow-hidden font-sans select-none relative" dir="rtl">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0" 
             style={{ 
               backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%23006699\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
               backgroundSize: '35px 35px' 
             }}>
        </div>

        <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-center items-center gap-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-800">تم إرسال الرابط بنجاح</h2>
            <p className="text-sm text-gray-600">
              تم إرسال رابط استرجاع كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.
            </p>
          </div>

          <Button 
            onClick={() => navigate('/login')}
            className="w-full h-12 bg-[#006699] hover:bg-[#005580] text-white text-base font-bold rounded-xl shadow-md transition-all active:scale-[0.98] border-none"
            data-testid="button-back-to-login"
          >
            العودة لتسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F5F7F9] flex flex-col items-center overflow-hidden font-sans select-none relative" dir="rtl">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%23006699\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '35px 35px' 
           }}>
      </div>

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-between">
        <div className="flex flex-col flex-1 gap-4">
          <div className="flex justify-start items-center mb-2">
            <button 
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-[#006699] font-bold text-sm"
              data-testid="button-back"
            >
              <ArrowRight className="w-5 h-5" />
              <span>رجوع</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center mb-4">
            <div className="relative mb-2">
              <div className="w-16 h-16 bg-white rounded-[20px] flex items-center justify-center shadow-md border border-gray-50">
                <div className="w-12 h-12 bg-[#006699] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#006699] tracking-tighter leading-none">فلوسك</h1>
              <span className="text-[#C8102E] text-[10px] font-bold tracking-[0.2em] uppercase block">Floosak</span>
            </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-1">نسيت كلمة المرور؟</h2>
            <p className="text-sm text-gray-500">أدخل بريدك الإلكتروني وسنرسل لك رابط لاسترجاع كلمة المرور</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => forgotPasswordMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-14 flex items-center px-4 group">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-gray-400 font-bold text-right">البريد الإلكتروني</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            autoComplete="email"
                            placeholder="أدخل البريد الإلكتروني"
                            className="border-none p-0 h-5 text-base font-bold text-gray-800 focus-visible:ring-0 placeholder:text-gray-200 text-right bg-transparent"
                            data-testid="input-email"
                            showValidation={false}
                          />
                        </FormControl>
                      </div>
                      <Mail className="w-5 h-5 text-[#006699] ml-2" strokeWidth={1.5} />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-[10px] font-bold text-[#C8102E] text-right px-1 mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {forgotPasswordMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600 font-bold text-right">
                    {forgotPasswordMutation.error?.message || "حدث خطأ أثناء إرسال الرابط"}
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#006699] hover:bg-[#005580] text-white text-base font-bold rounded-xl shadow-md transition-all active:scale-[0.98] border-none"
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-submit"
              >
                {forgotPasswordMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "إرسال رابط الاسترجاع"}
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold text-gray-600"
                  data-testid="link-login"
                >
                  تذكرت كلمة المرور؟ <span className="text-[#C8102E]">تسجيل الدخول</span>
                </button>
              </div>
            </form>
          </Form>
        </div>

        <div className="flex justify-center text-gray-400 text-[9px] font-bold pb-4">
          <span>© 2025 فلوسك - جميع الحقوق محفوظة</span>
        </div>
      </div>
    </div>
  );
}
