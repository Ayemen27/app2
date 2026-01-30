import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { 
  Loader2, 
  CheckCircle,
  Lock,
  KeyRound,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity
} from "lucide-react";

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      setIsTokenValid(true);
    } else {
      setIsTokenValid(false);
    }
  }, []);

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
    onError: (error: any) => {
      toast({
        title: "خطأ في إعادة تعيين كلمة المرور",
        description: error.message || "حدث خطأ أثناء المعالجة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data);
  };

  if (isTokenValid === false) {
    return (
      <div className="h-screen w-full bg-background dark:bg-slate-950 flex flex-col items-center overflow-hidden font-sans select-none relative transition-colors duration-500" dir="rtl">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
             style={{ 
               backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%232563eb\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
               backgroundSize: '45px 45px' 
             }}>
        </div>

        <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-center items-center gap-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-red-600">رابط غير صالح</h2>
            <p className="text-sm text-red-600/60 font-bold">
              رابط استرجاع كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.
            </p>
          </div>

          <div className="w-full space-y-2">
            <Button 
              onClick={() => navigate('/forgot-password')}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
            >
              طلب رابط جديد
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate('/login')}
              className="w-full h-12 text-blue-600 font-bold"
            >
              العودة لتسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-xl font-black text-blue-600 dark:text-blue-400">تمت بنجاح!</h2>
            <p className="text-sm text-blue-600/60 dark:text-blue-400/60 font-bold">
              تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.
            </p>
          </div>

          <Button 
            onClick={() => navigate('/login')}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
          >
            تسجيل الدخول الآن
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
              <h2 className="text-[10px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-widest leading-none">تأمين الحساب</h2>
              <span className="text-[8px] text-blue-600/30 dark:text-blue-400/30 font-bold uppercase">SECURE ACCOUNT</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-md active:scale-95 group border-2 border-white dark:border-slate-800 hover:rotate-12 transition-transform"
              onClick={() => navigate('/login')}
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
              <div className="flex items-center justify-center gap-2">
                <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-blue-200 dark:to-blue-900"></span>
                <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black tracking-[0.5em] uppercase">AXION Operations Management</span>
                <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-blue-200 dark:to-blue-900"></span>
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-lg font-black text-blue-600 dark:text-blue-400 mb-1">إعادة تعيين كلمة المرور</h2>
            <p className="text-sm text-blue-600/60 dark:text-blue-400/60 font-bold">أدخل كلمة المرور الجديدة لحماية حسابك</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700 delay-500 fill-mode-both">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-14 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Security / كلمة المرور</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showNewPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="border-none p-0 h-5 text-base font-black text-foreground focus-visible:ring-0 placeholder:text-muted-foreground/30 text-right bg-transparent shadow-none"
                            hidePasswordToggle={true}
                          />
                        </FormControl>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="flex items-center justify-center ml-2 transition-colors"
                      >
                        {showNewPassword ? <Eye className="w-5 h-5 text-blue-600" /> : <EyeOff className="w-5 h-5 text-blue-600/30" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-14 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Verify / تأكيد</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="border-none p-0 h-5 text-base font-black text-foreground focus-visible:ring-0 placeholder:text-muted-foreground/30 text-right bg-transparent shadow-none"
                            hidePasswordToggle={true}
                          />
                        </FormControl>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="flex items-center justify-center ml-2 transition-colors"
                      >
                        {showConfirmPassword ? <Eye className="w-5 h-5 text-blue-600" /> : <EyeOff className="w-5 h-5 text-blue-600/30" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-300 text-white dark:text-slate-950 text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "إعادة تعيين كلمة المرور"}
              </Button>
            </form>
          </Form>
        </div>

        <div className="flex flex-col items-center gap-2 pb-4 animate-in fade-in duration-1000 delay-700 fill-mode-both">
          <div className="flex items-center gap-4 w-full px-4">
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30 opacity-50"></div>
            <span className="text-[8px] font-black text-blue-600/30 dark:text-blue-400/30 tracking-[0.2em] uppercase">Secure System</span>
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30 opacity-50"></div>
          </div>
          <span className="text-[8px] text-blue-600/20 dark:text-blue-400/20">© 2026 AXION OPERATIONS MANAGEMENT</span>
        </div>
      </div>
    </div>
  );
}
