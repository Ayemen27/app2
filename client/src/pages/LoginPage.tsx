
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
      <div className="w-24 h-24 bg-gradient-to-br from-[#006699] to-[#0099CC] rounded-[28px] rotate-6 flex items-center justify-center shadow-2xl shadow-blue-900/30 ring-4 ring-white/50">
        <ShieldCheck className="w-14 h-14 text-white -rotate-6 drop-shadow-lg" strokeWidth={1.5} />
      </div>
      <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center ring-2 ring-gray-50">
        <div className="w-6 h-6 bg-[#C8102E] rounded-lg animate-pulse shadow-inner" />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-4xl font-black text-[#1A1A1A] tracking-tighter">فلوسك <span className="text-[#006699] text-2xl font-bold block mt-[-4px]">Floosak</span></h1>
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
        description: "مرحباً بك في نظام فلوسك",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="h-screen w-full bg-[#F5F7F9] flex flex-col items-center overflow-hidden font-sans select-none relative" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%23006699\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '35px 35px' 
           }}>
      </div>

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-between">
        <div className="flex flex-col flex-1 gap-1">
          {/* Header - Compact */}
          <div className="flex justify-between items-center mb-1">
            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-[#006699] flex items-center justify-center shadow-md active:scale-95 group border-2 border-white">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </Button>
            <h2 className="text-xs font-bold text-gray-500">مرحباً بعودتك</h2>
          </div>

          {/* Logo Section - Scaled Down */}
          <div className="flex flex-col items-center justify-center mb-1">
            <div className="relative mb-1">
              <div className="w-14 h-14 bg-white rounded-[18px] flex items-center justify-center shadow-md border border-gray-50">
                <div className="w-11 h-11 bg-[#006699] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-black text-[#006699] tracking-tighter leading-none">فلوسك</h1>
              <span className="text-[#C8102E] text-[9px] font-bold tracking-[0.2em] uppercase block">Floosak</span>
            </div>
          </div>

          {/* Mode Switcher - Compact */}
          <div className="grid grid-cols-2 gap-2 mb-1">
            <button 
              type="button"
              onClick={() => setLoginMode('offline')}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-12 shadow-sm ${loginMode === 'offline' ? 'bg-[#EBF5FF] border-[#006699]/20' : 'bg-white border-gray-100'}`}
            >
              <div className="flex flex-col items-start leading-none">
                <span className="text-[8px] text-gray-400 font-bold">الدخول</span>
                <span className={`text-[10px] font-black ${loginMode === 'offline' ? 'text-[#006699]' : 'text-gray-500'}`}>بدون إنترنت</span>
              </div>
              <div className={`p-1 rounded-lg ${loginMode === 'offline' ? 'bg-white text-[#006699] border border-blue-50' : 'bg-gray-50 text-gray-400'}`}>
                <Scan className="w-4 h-4" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => setLoginMode('online')}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all h-12 shadow-sm ${loginMode === 'online' ? 'bg-[#EBF5FF] border-[#006699]/20' : 'bg-white border-gray-100'}`}
            >
              <div className="flex flex-col items-start leading-none">
                <span className="text-[8px] text-gray-400 font-bold">الدخول</span>
                <span className={`text-[10px] font-black ${loginMode === 'online' ? 'text-[#006699]' : 'text-gray-500'}`}>بوضع الإنترنت</span>
              </div>
              <div className={`p-1 rounded-lg ${loginMode === 'online' ? 'bg-white text-[#006699] border border-blue-50' : 'bg-gray-50 text-gray-400'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Form - Slim Fields */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-1.5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className={`bg-white rounded-xl border shadow-sm h-14 flex items-center px-4 group ${form.formState.errors.email ? 'border-[#C8102E]' : 'border-gray-100'}`}>
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-gray-400 font-bold text-right">أدخل البريد الإلكتروني</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text"
                            autoComplete="off"
                            placeholder="أدخل البريد الإلكتروني"
                            className="border-none p-0 h-5 text-base font-bold text-gray-800 focus-visible:ring-0 placeholder:text-gray-200 text-right bg-transparent"
                            data-testid="input-email"
                          />
                        </FormControl>
                      </div>
                      <button type="button" onClick={() => setShowAccountMessage(true)} className="flex items-center justify-center ml-2 text-gray-300" data-testid="button-switch-account">
                        <Users className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-[10px] font-bold text-[#C8102E] text-right px-1 mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className={`bg-white rounded-xl border shadow-sm h-14 flex items-center px-4 group ${form.formState.errors.password ? 'border-[#C8102E]' : 'border-gray-100'}`}>
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-gray-400 font-bold text-right">كلمة المرور</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                            autoComplete="off"
                            placeholder="كلمة المرور"
                            className="border-none p-0 h-5 text-base font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-200 bg-transparent"
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
                          <EyeOff className={`w-5 h-5 ${showPassword ? 'hidden' : 'text-[#006699]'}`} />
                          <Eye className={`w-5 h-5 ${showPassword ? 'text-red-500' : 'hidden'}`} />
                          {!showPassword && <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />}
                        </div>
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-[10px] font-bold text-[#C8102E] text-right px-1 mt-1">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex justify-start px-1">
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-[10px] font-bold text-gray-400" data-testid="link-forgot-password">هل نسيت كلمة المرور؟</button>
              </div>

              <div className="space-y-1.5 pt-1">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#006699] hover:bg-[#005580] text-white text-base font-bold rounded-xl shadow-md transition-all active:scale-[0.98] border-none"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "تسجيل الدخول"}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full h-9 text-[#006699] text-sm font-bold rounded-xl hover:bg-transparent"
                  onClick={() => navigate('/register')}
                  data-testid="button-create-account"
                >
                  إنشاء حساب جديد
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer - Compact */}
        <div className="flex flex-col items-center gap-2 pb-2 relative">
          <button 
            type="button"
            onClick={() => {
              // Biometric authentication placeholder
              // Note: Full biometric auth requires native mobile APIs (e.g., Capacitor Biometric plugin)
              alert('تسجيل الدخول بالبصمة غير متوفر حالياً. هذه الميزة تتطلب تطبيق الهاتف المحمول.');
            }}
            className="relative w-12 h-12 flex items-center justify-center transition-all active:scale-90 bg-white rounded-full shadow-md border border-gray-50"
            data-testid="button-fingerprint"
          >
             <Fingerprint className="w-8 h-8 text-[#006699]" strokeWidth={1} />
          </button>

          <div className="flex gap-4">
            {[
              { Icon: Scan, label: 'مسح QR', testId: 'button-scan-qr' },
              { Icon: Smartphone, label: 'تطبيق الهاتف', testId: 'button-mobile-app' },
              { Icon: HeadphonesIcon, label: 'الدعم الفني', testId: 'button-support' }
            ].map(({ Icon, label, testId }, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={() => {
                  // Placeholder handlers for footer actions
                  alert(`${label} - قريباً`);
                }}
                className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-50 flex items-center justify-center text-gray-300"
                data-testid={testId}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          <div className="w-full flex justify-center text-gray-400 text-[9px] font-bold">
            <span>الإصدار: 391</span>
          </div>

          {/* Toast Notification Overlay */}
          {showAccountMessage && (
            <div className="absolute bottom-8 left-0 right-0 px-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-[#01689b] h-10 rounded-md flex items-center justify-between px-4 shadow-xl border border-white/10">
                <span className="text-white text-[11px] font-medium">لا توجد لديك حسابات أخرى لتغييرها</span>
                <button 
                  onClick={() => setShowAccountMessage(false)}
                  className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm"
                >
                  <X className="w-3 h-3 text-[#01689b]" strokeWidth={3} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




