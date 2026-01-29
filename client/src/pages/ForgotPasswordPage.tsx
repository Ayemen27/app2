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
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { 
  ShieldCheck,
  Mail,
  Loader2,
  CheckCircle,
  X,
  Activity
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
      <div className="h-screen w-full bg-background dark:bg-slate-950 flex flex-col items-center overflow-hidden font-sans select-none relative transition-colors duration-500" dir="rtl">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
             style={{ 
               backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%232563eb\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
               backgroundSize: '45px 45px' 
             }}>
        </div>

        <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-center items-center gap-6">
          <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-blue-600" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-blue-600 dark:text-blue-400">تم إرسال الرابط بنجاح</h2>
            <p className="text-sm text-blue-600/60 dark:text-blue-400/60 font-bold">
              تم إرسال رابط استرجاع كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.
            </p>
          </div>

          <Button 
            onClick={() => navigate('/login')}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
            data-testid="button-back-to-login"
          >
            العودة لتسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background dark:bg-slate-950 flex flex-col items-center overflow-hidden font-sans select-none relative transition-colors duration-500" dir="rtl">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%232563eb\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '45px 45px' 
           }}>
      </div>

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-between">
        <div className="flex flex-col flex-1 gap-4">
          <div className="flex justify-between items-center mb-1 animate-in slide-in-from-top duration-500 fill-mode-both" dir="rtl">
            <div className="text-right flex flex-col items-end">
              <h2 className="text-[10px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-widest leading-none">استعادة الوصول</h2>
              <span className="text-[8px] text-blue-600/30 dark:text-blue-400/30 font-bold uppercase">RECOVER ACCESS</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-md active:scale-95 group border-2 border-white dark:border-slate-800 hover:rotate-12 transition-transform"
              onClick={() => navigate('/login')}
              data-testid="button-back"
            >
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </Button>
          </div>

          {/* Logo Section - AXION Real Assets */}
          <div className="flex flex-col items-center justify-center mb-6 animate-in zoom-in duration-700 delay-150 fill-mode-both">
            <div className="relative mb-4 group cursor-pointer">
              <div className="w-20 h-20 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 relative">
                <img 
                  src="/assets/app_icon_light.png" 
                  alt="AXION Logo" 
                  className="w-full h-full object-contain dark:hidden"
                />
                <img 
                  src="/assets/app_icon_dark.png" 
                  alt="AXION Logo" 
                  className="w-full h-full object-contain hidden dark:block"
                />
                <div className="absolute top-4 right-4 w-3.5 h-3.5 bg-blue-500 rounded-full border-[2.5px] border-white dark:border-[#1a1c1e] shadow-md animate-pulse"></div>
              </div>
            </div>
            <div className="text-center relative">
              <div className="flex items-center justify-center gap-3 mb-1.5">
                <img 
                  src="/assets/logo_header_light.png" 
                  alt="AXION | أكسيون" 
                  className="h-8 object-contain dark:hidden"
                />
                <img 
                  src="/assets/logo_header_dark.png" 
                  alt="AXION | أكسيون" 
                  className="h-8 object-contain hidden dark:block"
                />
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-lg font-black text-blue-600 dark:text-blue-400 mb-1">نسيت كلمة المرور؟</h2>
            <p className="text-sm text-blue-600/60 dark:text-blue-400/60 font-bold">أدخل بريدك الإلكتروني وسنرسل لك رابط لاسترجاع كلمة المرور</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => forgotPasswordMutation.mutate(data))} className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700 delay-500 fill-mode-both">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-14 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Identity / البريد</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            autoComplete="email"
                            placeholder="username@orax.system"
                            className="border-none p-0 h-5 text-base font-black text-foreground focus-visible:ring-0 placeholder:text-muted-foreground/30 text-right bg-transparent shadow-none"
                            data-testid="input-email"
                          />
                        </FormControl>
                      </div>
                      <Mail className="w-5 h-5 text-blue-600/30 dark:text-blue-400/30 ml-2" strokeWidth={1.5} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-300 text-white dark:text-slate-950 text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-submit"
              >
                {forgotPasswordMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "إرسال رابط الاسترجاع"}
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold text-blue-600/60 dark:text-blue-400/60"
                  data-testid="link-login"
                >
                  تذكرت كلمة المرور؟ <span className="text-blue-600 underline">تسجيل الدخول</span>
                </button>
              </div>
            </form>
          </Form>
        </div>

        <div className="flex flex-col items-center gap-2 pb-4 animate-in fade-in duration-1000 delay-700 fill-mode-both">
          <div className="flex items-center gap-4 w-full px-4">
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30 opacity-50"></div>
            <span className="text-[8px] font-black text-blue-600/30 dark:text-blue-400/30 tracking-[0.2em] uppercase">Secure Recovery</span>
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30 opacity-50"></div>
          </div>
          <span className="text-[8px] text-blue-600/20 dark:text-blue-400/20">© 2026 ORAX OPERATIONS MANAGEMENT</span>
        </div>
      </div>
    </div>
  );
}
