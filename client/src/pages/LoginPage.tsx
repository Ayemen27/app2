
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/AuthProvider";
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
  Eye, 
  EyeOff, 
  Loader2,
  ShieldCheck,
  Smartphone,
  Fingerprint,
  HeadphonesIcon,
  HelpCircle,
  Scan,
  MoreHorizontal,
  Mail,
  Users,
  X
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const AppLogo = () => (
  <div className="flex flex-col items-center justify-center mb-6 animate-in fade-in zoom-in duration-700">
    <div className="relative mb-4">
      <div className="w-24 h-24 bg-gradient-to-br from-[#0f172a] to-[#334155] rounded-[28px] rotate-6 flex items-center justify-center shadow-2xl shadow-slate-900/40 ring-4 ring-white/50">
        <div className="relative w-14 h-14 -rotate-6 flex items-center justify-center">
          <ShieldCheck className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={1.2} />
          <div className="absolute inset-0 flex items-center justify-center pt-1">
            <span className="text-white font-black text-xl tracking-tighter">O</span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center ring-2 ring-gray-50">
        <div className="w-6 h-6 bg-blue-600 rounded-lg animate-pulse shadow-inner" />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-4xl font-black text-[#1A1A1A] tracking-tighter">أوركس <span className="text-slate-800 text-2xl font-bold block mt-[-4px]">ORAX</span></h1>
    </div>
  </div>
);

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [loginMode, setLoginMode] = useState<'online' | 'offline'>('online');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountMessage, setShowAccountMessage] = useState(false);
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await login(data.email, data.password);
    },
    onSuccess: () => {
      toast({
        title: "تم تسجيل الدخول",
        description: "مرحباً بك في نظام أوركس",
      });
      navigate("/");
    },
    onError: (error: any) => {
      // التحقق من حالة عدم تفعيل البريد الإلكتروني
      if (error.requireEmailVerification || error.status === 403) {
        toast({
          title: "يجب التحقق من البريد الإلكتروني",
          description: "تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني",
          variant: "default",
        });
        // التوجيه إلى صفحة التحقق من البريد مع المعلومات اللازمة
        const userId = error.userId || error.data?.userId;
        const email = error.email || error.data?.email || form.getValues('email');
        navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(email)}`);
        return;
      }
      
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message || "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="h-screen w-full bg-background dark:bg-slate-950 flex flex-col items-center overflow-hidden font-sans select-none relative transition-colors duration-500" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%230f172a\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '45px 45px' 
           }}>
      </div>

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-between">
        <div className="flex flex-col flex-1 gap-1">
          {/* Header - Compact */}
          <div className="flex justify-between items-center mb-1 animate-in slide-in-from-top duration-500 fill-mode-both" dir="rtl">
            <div className="text-right flex flex-col items-end">
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">مرحباً بعودتك</h2>
              <span className="text-[8px] text-gray-300 dark:text-slate-600 font-bold">WELCOME BACK</span>
            </div>
            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-md active:scale-95 group border-2 border-white dark:border-slate-800 hover:rotate-12 transition-transform">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
              </div>
            </Button>
          </div>

          {/* Logo Section - Scaled Down */}
          <div className="flex flex-col items-center justify-center mb-2 animate-in zoom-in duration-700 delay-150 fill-mode-both">
            <div className="relative mb-2 group cursor-pointer">
              <div className="w-16 h-16 bg-card dark:bg-slate-900 rounded-[20px] flex items-center justify-center shadow-xl border border-border dark:border-slate-800 group-hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-1">
                <div className="w-13 h-13 bg-slate-900 dark:bg-white rounded-[16px] flex items-center justify-center">
                  <div className="relative">
                    <ShieldCheck className="w-8 h-8 text-white dark:text-slate-900" strokeWidth={1.5} />
                    <div className="absolute inset-0 flex items-center justify-center pt-0.5">
                      <span className="text-white dark:text-slate-900 font-black text-xs">O</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">أوركس</h1>
              <span className="text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-[0.3em] uppercase block mt-1">ORAX SYSTEM</span>
            </div>
          </div>

          {/* Mode Switcher - Compact */}
          <div className="grid grid-cols-2 gap-2 mb-2 animate-in slide-in-from-bottom duration-500 delay-300 fill-mode-both">
            <button 
              type="button"
              onClick={() => setLoginMode('offline')}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-14 shadow-sm active:scale-95 ${loginMode === 'offline' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white ring-2 ring-slate-900/10' : 'bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-gray-500'}`}
            >
              <div className="flex flex-col items-start leading-none text-right w-full">
                <span className={`text-[8px] font-bold ${loginMode === 'offline' ? 'text-slate-300 dark:text-slate-600' : 'text-gray-400'}`}>الدخول</span>
                <span className="text-[11px] font-black">وضع الأوفلاين</span>
              </div>
              <div className={`p-1.5 rounded-lg ${loginMode === 'offline' ? 'bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>
                <Scan className="w-4 h-4" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => setLoginMode('online')}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-14 shadow-sm active:scale-95 ${loginMode === 'online' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white ring-2 ring-slate-900/10' : 'bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-gray-500'}`}
            >
              <div className="flex flex-col items-start leading-none text-right w-full">
                <span className={`text-[8px] font-bold ${loginMode === 'online' ? 'text-slate-300 dark:text-slate-600' : 'text-gray-400'}`}>الدخول</span>
                <span className="text-[11px] font-black">وضع السحابي</span>
              </div>
              <div className={`p-1.5 rounded-lg ${loginMode === 'online' ? 'bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Form - Slim Fields */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-2 animate-in fade-in slide-in-from-bottom duration-700 delay-500 fill-mode-both">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className={`bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-16 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-slate-900/5 dark:focus-within:ring-white/5 ${form.formState.errors.email ? 'border-red-500' : 'border-border dark:border-slate-800'}`}>
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-gray-400 dark:text-slate-500 font-black text-right uppercase tracking-tighter">Identity / البريد</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text"
                            autoComplete="off"
                            placeholder="username@orax.system"
                            className="border-none p-0 h-6 text-base font-black text-slate-900 dark:text-white focus-visible:ring-0 placeholder:text-gray-200 dark:placeholder:text-slate-700 text-right bg-transparent shadow-none"
                            data-testid="input-email"
                          />
                        </FormControl>
                      </div>
                      <button type="button" onClick={() => setShowAccountMessage(true)} className="flex items-center justify-center ml-2 text-slate-300 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-400 transition-colors" data-testid="button-switch-account">
                        <Users className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className={`bg-card dark:bg-slate-900 rounded-xl border shadow-sm h-16 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-slate-900/5 dark:focus-within:ring-white/5 ${form.formState.errors.password ? 'border-red-500' : 'border-border dark:border-slate-800'}`}>
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-gray-400 dark:text-slate-500 font-black text-right uppercase tracking-tighter">Security / كلمة المرور</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                            autoComplete="off"
                            placeholder="••••••••"
                            className="border-none p-0 h-6 text-base font-black text-slate-900 dark:text-white text-right focus-visible:ring-0 placeholder:text-gray-200 dark:placeholder:text-slate-700 bg-transparent shadow-none"
                            data-testid="input-password"
                            hidePasswordToggle={true}
                          />
                        </FormControl>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex items-center justify-center ml-2 transition-colors"
                        data-testid="button-toggle-password"
                      >
                        <div className="relative flex items-center justify-center">
                          <EyeOff className={`w-5 h-5 transition-transform duration-200 ${showPassword ? 'hidden scale-0' : 'text-slate-400 dark:text-slate-600 scale-100'}`} />
                          <Eye className={`w-5 h-5 transition-transform duration-200 ${showPassword ? 'text-blue-600 dark:text-blue-400 scale-100' : 'hidden scale-0'}`} />
                        </div>
                      </button>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-between px-1">
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-[10px] font-bold text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors" data-testid="link-forgot-password">استعادة الوصول؟</button>
                <button type="button" className="text-[10px] font-bold text-blue-600 dark:text-blue-400">طلب مساعدة</button>
              </div>

              <div className="space-y-2 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "دخول النظام"}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-slate-500 dark:text-slate-400 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900"
                  onClick={() => navigate('/register')}
                  data-testid="button-create-account"
                >
                  ليس لديك حساب؟ اطلب صلاحية
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer - Global Tech Style */}
        <div className="flex flex-col items-center gap-3 pb-4 relative animate-in fade-in duration-1000 delay-700 fill-mode-both">
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800"></div>
            <span className="text-[8px] font-black text-gray-300 dark:text-slate-700 tracking-[0.2em] uppercase">Security Layer 2.0</span>
            <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800"></div>
          </div>
          
          <div className="flex gap-4">
            {[
              { Icon: Fingerprint, label: 'Biometric', testId: 'button-fingerprint' },
              { Icon: Scan, label: 'QR Scan', testId: 'button-scan-qr' },
              { Icon: HeadphonesIcon, label: 'Support', testId: 'button-support' }
            ].map(({ Icon, label, testId }, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={() => {
                  alert(`${label} feature coming soon on Orax Mobile.`);
                }}
                className="w-12 h-12 bg-card dark:bg-slate-900 rounded-2xl shadow-sm border border-border dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white hover:shadow-md transition-all active:scale-90"
                data-testid={testId}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </button>
            ))}
          </div>

          <div className="w-full flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 tracking-wider">ORAX CORE v3.9.1 - SECURE</span>
            </div>
            <span className="text-[8px] text-gray-300 dark:text-slate-700">© 2026 ORAX OPERATIONS MANAGEMENT</span>
          </div>

          {/* Notification Overlay */}
          {showAccountMessage && (
            <div className="absolute bottom-16 left-0 right-0 px-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 dark:bg-white h-12 rounded-xl flex items-center justify-between px-4 shadow-2xl border border-white/10 dark:border-black/5">
                <span className="text-white dark:text-slate-900 text-[11px] font-medium text-right w-full ml-4">لا توجد لديك حسابات نشطة أخرى حالياً</span>
                <button 
                  onClick={() => setShowAccountMessage(false)}
                  className="w-6 h-6 bg-white/10 dark:bg-slate-900/10 rounded-lg flex items-center justify-center hover:bg-white/20 dark:hover:bg-slate-900/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white dark:text-slate-900" strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




