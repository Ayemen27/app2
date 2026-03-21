
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/AuthProvider";
import { useToast } from "../hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { trackLog } from "@/lib/debug-tracker";
import { setStatusBarForPage } from "@/services/statusBarManager";
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
  X,
  Activity
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormData = z.infer<typeof loginSchema>;

import logoHeaderLight from "/assets/logo_header_light.png";
import logoHeaderDark from "/assets/logo_header_dark.png";
import appIconLight from "/assets/app_icon_light.png";
import appIconDark from "/assets/app_icon_dark.png";

const AppLogo = () => (
  <div className="flex flex-col items-center justify-center mb-6 animate-in fade-in zoom-in duration-700">
    <div className="relative mb-2 group cursor-pointer">
      <div className="w-16 h-16 bg-[#3b82f6] dark:bg-white rounded-[18px] flex items-center justify-center shadow-xl shadow-blue-600/20 dark:shadow-white/5 transition-all duration-500 hover:scale-105 active:scale-95 border-2 border-white/20 dark:border-slate-800 p-2">
        <img 
          src={appIconLight} 
          alt="AXION Icon" 
          className="w-full h-full object-contain dark:hidden"
        />
        <img 
          src={appIconDark} 
          alt="AXION Icon" 
          className="w-full h-full object-contain hidden dark:block"
        />
      </div>
    </div>
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <img 
          src={logoHeaderLight} 
          alt="AXION" 
          className="h-8 object-contain dark:hidden"
        />
        <img 
          src={logoHeaderDark} 
          alt="AXION" 
          className="h-8 object-contain hidden dark:block"
        />
      </div>
      <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black tracking-[0.4em] uppercase block">Real Assets Management</span>
    </div>
  </div>
);

export default function LoginPage() {
  trackLog('LOGIN_PAGE_RENDER', { timestamp: Date.now() });
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, loginWithBiometric: authBiometricLogin } = useAuth();
  const [loginMode, setLoginMode] = useState<'online' | 'offline'>('online');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountMessage, setShowAccountMessage] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; field: string } | null>(null);

  useEffect(() => {
    setStatusBarForPage('login');
    const checkBiometric = async () => {
      const { isBiometricAvailable } = await import("../lib/webauthn");
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    const { isBiometricAvailable, checkBiometricRegistered } = await import("../lib/webauthn");
    const available = await isBiometricAvailable();
    if (!available) {
      toast({
        title: "غير مدعوم",
        description: "جهازك لا يدعم تسجيل الدخول بالبصمة",
        variant: "destructive",
      });
      return;
    }

    setBiometricLoading(true);
    try {
      const email = form.getValues('email') || undefined;

      const { hasBiometricCredentialStored } = await import("../lib/webauthn");
      const hasLocal = hasBiometricCredentialStored();
      
      if (!hasLocal) {
        const hasCredentials = await checkBiometricRegistered(email);
        if (!hasCredentials) {
          toast({
            title: "البصمة غير مفعّلة",
            description: "سجّل الدخول بكلمة المرور أولاً، ثم فعّل البصمة من الإعدادات > الأمان",
          });
          setBiometricLoading(false);
          return;
        }
      }

      await authBiometricLogin(email);

      toast({
        title: "تم تسجيل الدخول",
        description: "تم تسجيل الدخول بالبصمة بنجاح",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    } catch (error: any) {
      if (error.code === 'NO_CREDENTIALS') {
        toast({
          title: "البصمة غير مفعّلة",
          description: "سجّل الدخول بكلمة المرور أولاً، ثم فعّل البصمة من الإعدادات > الأمان",
        });
      } else if (error.name === 'NotAllowedError') {
        toast({
          title: "تم الإلغاء",
          description: "تم إلغاء عملية المصادقة بالبصمة",
        });
      } else {
        toast({
          title: "فشل تسجيل الدخول",
          description: toUserMessage(error, "حدث خطأ أثناء تسجيل الدخول بالبصمة"),
          variant: "destructive",
        });
      }
    } finally {
      setBiometricLoading(false);
    }
  };
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      trackLog('LOGIN_SUBMIT', { email: data.email, mode: loginMode });
      return await login(data.email, data.password);
    },
    onSuccess: () => {
      trackLog('LOGIN_SUCCESS', { mode: loginMode });
      toast({
        title: "تم تسجيل الدخول",
        description: loginMode === 'offline' ? "تم الدخول بوضع الأوفلاين" : "مرحباً بك في نظام أكسيون",
      });
      navigate("/");
    },
    onError: (error: any) => {
      trackLog('LOGIN_ERROR', {
        message: error?.message,
        name: error?.name,
        status: error?.status,
        requireEmailVerification: error?.requireEmailVerification,
      });
      if (error.requireEmailVerification || error.status === 403) {
        toast({
          title: "يجب التحقق من البريد الإلكتروني",
          description: "تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني",
          variant: "default",
        });
        const user_id = error.user_id || error.data?.user_id;
        const email = error.email || error.data?.email || form.getValues('email');
        navigate(`/verify-email?user_id=${user_id}&email=${encodeURIComponent(email)}`);
        return;
      }
      
      const errorField = error?.errorField || error?.data?.errorField;
      const errorMessage = error?.message || error?.data?.message || toUserMessage(error, "حدث خطأ أثناء تسجيل الدخول");
      
      setServerError({ message: errorMessage, field: errorField || 'general' });

      if (errorField === 'email') {
        form.setError('email', { message: errorMessage });
      } else if (errorField === 'password') {
        form.setError('password', { message: errorMessage });
      }
      
      toast({
        title: errorField === 'connection' ? "خطأ في الاتصال" : "فشل تسجيل الدخول",
        description: errorMessage,
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
            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-blue-600 dark:bg-slate-100 flex items-center justify-center shadow-md active:scale-95 group border-2 border-white dark:border-slate-800 hover:rotate-12 transition-transform">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
                <div className="w-1 h-1 bg-white dark:bg-slate-900 rounded-full" />
              </div>
            </Button>
          </div>

          {/* Logo Section - AXION Real Assets */}
          <div className="flex flex-col items-center justify-center mb-6 animate-in zoom-in duration-700 delay-150 fill-mode-both">
            <div className="relative mb-4 group cursor-pointer">
              {/* Outer Glow / Halo */}
              <div className="absolute -inset-1.5 bg-blue-500/10 rounded-[24px] blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>
              
              <div className="w-24 h-24 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 relative bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-2 border border-white/20 overflow-hidden">
                <img 
                  src={appIconLight} 
                  alt="AXION Logo" 
                  className="w-full h-full object-cover rounded-xl"
                  data-testid="img-logo-light"
                />
                {/* Status Indicator / Pulse Point - Matching the Image */}
                <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-blue-500 rounded-full border-[2.5px] border-white dark:border-[#1a1c1e] shadow-md ring-2 ring-blue-400/20 animate-pulse"></div>
              </div>
            </div>
            <div className="text-center relative">
              <div className="flex items-center justify-center gap-3 mb-1.5">
                <img 
                  src={logoHeaderLight} 
                  alt="AXION | أكسيون" 
                  className="h-12 object-contain bg-white/30 dark:bg-white/5 backdrop-blur-sm rounded-lg px-4 py-1 border border-white/10"
                  data-testid="img-header-light"
                />
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-blue-200 dark:to-blue-900"></span>
                <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black tracking-[0.5em] uppercase">Real Assets Management</span>
                <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-blue-200 dark:to-blue-900"></span>
              </div>
            </div>
          </div>

          {/* Mode Switcher - Compact */}
          <div className="grid grid-cols-2 gap-2 mb-2 animate-in slide-in-from-bottom duration-500 delay-300 fill-mode-both">
            <button 
              type="button"
              onClick={() => setLoginMode('offline')}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-14 shadow-sm active:scale-95 ${loginMode === 'offline' ? 'bg-blue-600 dark:bg-white text-white dark:text-slate-900 border-blue-600 dark:border-white ring-2 ring-blue-600/10' : 'bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-gray-500'}`}
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
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-14 shadow-sm active:scale-95 ${loginMode === 'online' ? 'bg-blue-600 dark:bg-white text-white dark:text-slate-900 border-blue-600 dark:border-white ring-2 ring-blue-600/10' : 'bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-gray-500'}`}
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
            <form onSubmit={form.handleSubmit(
              (data) => loginMutation.mutate(data),
              (errors) => {
                const messages: string[] = [];
                if (errors.email) messages.push(errors.email.message || "البريد الإلكتروني غير صحيح");
                if (errors.password) messages.push(errors.password.message || "كلمة المرور مطلوبة");
                toast({
                  title: "خطأ في البيانات",
                  description: messages.join(" · "),
                  variant: "destructive",
                });
              }
            )} className="space-y-2 animate-in fade-in slide-in-from-bottom duration-700 delay-500 fill-mode-both">
              {serverError && (
                <div data-testid="text-server-error" className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top duration-300 ${
                  serverError.field === 'connection' 
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  <Activity className="w-4 h-4 shrink-0" />
                  <span>{serverError.message}</span>
                </div>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className={`bg-card dark:bg-slate-900 rounded-xl border-2 shadow-sm h-16 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-slate-900/5 dark:focus-within:ring-white/5 ${form.formState.errors.email ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50 dark:bg-red-950/10' : 'border-border dark:border-slate-800'}`}>
                      <div className="flex-1 flex flex-col justify-center">
                        <span className={`text-[9px] font-black text-right uppercase tracking-tighter ${form.formState.errors.email ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}`}>Identity / البريد</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text"
                            autoComplete="off"
                            placeholder="username@axion.system"
                            onChange={(e) => {
                              field.onChange(e);
                              if (serverError?.field === 'email') setServerError(null);
                              form.clearErrors('email');
                            }}
                            className="border-none p-0 h-6 text-base font-black text-foreground focus-visible:ring-0 placeholder:text-muted-foreground/30 text-right bg-transparent shadow-none"
                            data-testid="input-email"
                          />
                        </FormControl>
                      </div>
                      {form.formState.errors.email ? (
                        <div className="flex items-center justify-center ml-2">
                          <Mail className="w-5 h-5 text-red-500" strokeWidth={2} />
                        </div>
                      ) : (
                        <button type="button" onClick={() => setShowAccountMessage(true)} className="flex items-center justify-center ml-2 text-slate-300 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-400 transition-colors" data-testid="button-switch-account">
                          <Users className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                    <FormMessage data-testid="text-error-email" className="text-[11px] font-bold text-red-500 pr-1 mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className={`bg-card dark:bg-slate-900 rounded-xl border-2 shadow-sm h-16 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-slate-900/5 dark:focus-within:ring-white/5 ${form.formState.errors.password ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50 dark:bg-red-950/10' : 'border-border dark:border-slate-800'}`}>
                      <div className="flex-1 flex flex-col justify-center">
                        <span className={`text-[9px] font-black text-right uppercase tracking-tighter ${form.formState.errors.password ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}`}>Security / كلمة المرور</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                            autoComplete="off"
                            placeholder="••••••••"
                            onChange={(e) => {
                              field.onChange(e);
                              if (serverError?.field === 'password') setServerError(null);
                              form.clearErrors('password');
                            }}
                            className="border-none p-0 h-6 text-base font-black text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
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
                        {showPassword ? (
                          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                        ) : (
                          <EyeOff className={`w-5 h-5 ${form.formState.errors.password ? 'text-red-400' : 'text-slate-400 dark:text-slate-600'}`} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                    <FormMessage data-testid="text-error-password" className="text-[11px] font-bold text-red-500 pr-1 mt-1" />
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
                  className="w-full h-12 bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-300 text-white dark:text-slate-950 text-base font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "دخول النظام"}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-blue-600/70 dark:text-blue-400/70 text-sm font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => navigate('/register')}
                  data-testid="button-create-account"
                >
                  ليس لديك حساب؟ اطلب صلاحية
                </Button>
              </div>
            </form>
          </Form>
        </div>

          <div className="flex flex-col items-center gap-3 pb-12 relative animate-in fade-in duration-1000 delay-700 fill-mode-both">
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30"></div>
              <span className="text-[8px] font-black text-blue-400 dark:text-blue-700 tracking-[0.2em] uppercase">Axion Security v2.0</span>
              <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30"></div>
            </div>
          
          <div className="flex gap-4 mb-4">
            {[
              { Icon: Fingerprint, label: 'Biometric', testId: 'button-fingerprint', action: handleBiometricLogin, loading: biometricLoading },
              { Icon: Scan, label: 'QR Scan', testId: 'button-scan-qr', action: () => alert('QR Scan feature coming soon on Axion Mobile.'), loading: false },
              { Icon: HeadphonesIcon, label: 'Support', testId: 'button-support', action: () => alert('Support feature coming soon on Axion Mobile.'), loading: false }
            ].map(({ Icon, label, testId, action, loading }, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={action}
                disabled={loading}
                className="w-12 h-12 bg-card dark:bg-slate-900 rounded-2xl shadow-sm border border-border dark:border-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md transition-all active:scale-90 disabled:opacity-50"
                data-testid={testId}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" strokeWidth={1.5} />}
              </button>
            ))}
          </div>

          <div className="w-full flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 tracking-wider" data-testid="text-app-version">AXION CORE v{__APP_VERSION__} - SECURE</span>
            </div>
            <span className="text-[8px] text-gray-300 dark:text-slate-700">© 2026 AXION OPERATIONS MANAGEMENT</span>
          </div>

          {/* Notification Overlay */}
          {showAccountMessage && (
            <div className="absolute bottom-16 left-0 right-0 px-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-600 dark:bg-white h-12 rounded-xl flex items-center justify-between px-4 shadow-2xl border border-white/10 dark:border-black/5">
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




