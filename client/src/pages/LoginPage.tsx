
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/AuthProvider";
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
  MoreHorizontal
} from "lucide-react";

const loginSchema = z.object({
  phone: z.string().min(9, "رقم الهاتف يجب أن يكون 9 أرقام على الأقل"),
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
  const { login } = useAuth();
  const [loginMode, setLoginMode] = useState<'online' | 'offline'>('online');
  const [showPassword, setShowPassword] = useState(false);
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "772293228",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await login(data.phone, data.password);
    },
    onSuccess: () => navigate("/"),
  });

  return (
    <div className="h-screen w-full bg-[#F5F7F9] flex flex-col items-center overflow-hidden font-sans select-none relative" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%23006699\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '40px 40px' 
           }}>
      </div>

      <div className="w-full max-w-[420px] h-full z-10 flex flex-col p-5 pt-safe justify-between relative">
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="icon" className="w-11 h-11 rounded-full bg-[#006699] flex items-center justify-center shadow-md active:scale-95 group border-2 border-white">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </Button>
            <h2 className="text-xl font-bold text-[#555] ml-4">مرحباً بعودتك</h2>
          </div>

          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative mb-2">
              <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center shadow-lg border border-gray-50">
                <div className="w-20 h-20 bg-[#006699] rounded-[24px] flex items-center justify-center">
                  <ShieldCheck className="w-12 h-12 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-black text-[#006699] tracking-tighter leading-none">فلوسك</h1>
              <span className="text-[#C8102E] text-lg font-bold tracking-[0.3em] uppercase block mt-1">Floosak</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
              type="button"
              onClick={() => setLoginMode('offline')}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all h-20 shadow-sm ${loginMode === 'offline' ? 'bg-[#EBF5FF] border-[#006699]/20' : 'bg-white border-gray-100 opacity-80'}`}
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[11px] text-gray-400 font-bold">الدخول</span>
                <span className={`text-sm font-black ${loginMode === 'offline' ? 'text-[#006699]' : 'text-gray-500'}`}>بدون إنترنت</span>
              </div>
              <div className={`p-2.5 rounded-xl ${loginMode === 'offline' ? 'bg-white text-[#006699] shadow-sm border border-blue-100' : 'bg-gray-50 text-gray-400'}`}>
                <Scan className="w-6 h-6" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => setLoginMode('online')}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all h-20 shadow-sm ${loginMode === 'online' ? 'bg-[#EBF5FF] border-[#006699]/20' : 'bg-white border-gray-100 opacity-80'}`}
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[11px] text-gray-400 font-bold">الدخول</span>
                <span className={`text-sm font-black ${loginMode === 'online' ? 'text-[#006699]' : 'text-gray-500'}`}>بوضع الإنترنت</span>
              </div>
              <div className={`p-2.5 rounded-xl ${loginMode === 'online' ? 'bg-white text-[#006699] shadow-sm border border-blue-100' : 'bg-gray-50 text-gray-400'}`}>
                <Smartphone className="w-6 h-6" />
              </div>
            </button>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-[84px] flex items-center px-6 relative group">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[12px] text-gray-400 font-bold mb-1 text-right">أدخل رقم الهاتف</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="أدخل رقم الهاتف"
                            className="border-none p-0 h-auto text-xl font-bold text-gray-800 focus-visible:ring-0 placeholder:text-gray-300 text-right"
                          />
                        </FormControl>
                      </div>
                      <div className="flex items-center justify-center ml-4 text-gray-400">
                        <Smartphone className="w-7 h-7" strokeWidth={1.5} />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-[84px] flex items-center px-6 relative group">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[12px] text-gray-400 font-bold mb-1 text-right">كلمة المرور</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                            placeholder="كلمة المرور"
                            className="border-none p-0 h-auto text-xl font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300"
                          />
                        </FormControl>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex items-center justify-center ml-4 text-gray-400 hover:text-[#006699] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                      </button>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-start px-1">
                <button type="button" className="text-sm font-bold text-gray-500">هل نسيت كلمة المرور؟</button>
              </div>

              <div className="space-y-4 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-16 bg-[#006699] hover:bg-[#005580] text-white text-xl font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] border-none"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="animate-spin h-7 w-7" /> : "تسجيل الدخول"}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full h-12 text-[#006699] text-xl font-bold rounded-2xl hover:bg-transparent"
                  onClick={() => navigate('/register')}
                >
                  إنشاء حساب جديد
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-6 pb-2">
          <div className="relative">
            <button className="relative w-24 h-24 flex items-center justify-center transition-all active:scale-90">
               <Fingerprint className="w-20 h-20 text-[#006699]" strokeWidth={1.2} />
            </button>
          </div>

          <div className="flex gap-10">
            <button className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
              <Scan className="w-6 h-6" />
            </button>
            <button className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
              <Smartphone className="w-6 h-6" />
            </button>
            <button className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
              <HelpCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full flex justify-center text-gray-400 text-[13px] font-bold">
            <span>الإصدار: 391</span>
          </div>
        </div>
      </div>
    </div>
  );
}



