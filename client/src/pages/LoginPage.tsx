
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
    <div className="h-screen w-full bg-[#F2F5F8] flex flex-col items-center overflow-hidden font-sans select-none relative" dir="rtl">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
           style={{ backgroundImage: 'radial-gradient(#006699 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[30%] bg-[#006699]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[30%] bg-[#C8102E]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] h-full z-10 flex flex-col p-6 pt-safe">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95 group">
            <MoreHorizontal className="w-6 h-6 text-gray-400 group-hover:text-[#006699]" />
          </Button>
          <div className="text-right">
            <h2 className="text-xl font-black text-gray-800 leading-tight">مرحباً بعودتك</h2>
          </div>
        </div>

        {/* Brand Logo */}
        <AppLogo />

        {/* Connectivity Switcher */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button 
            type="button"
            onClick={() => setLoginMode('online')}
            className={`flex flex-col items-center justify-center p-3 rounded-[24px] border-2 transition-all h-24 relative overflow-hidden group shadow-sm ${loginMode === 'online' ? 'bg-[#EBF5FF] border-[#006699]/20 ring-4 ring-[#006699]/5' : 'bg-white border-transparent'}`}
          >
            <div className={`p-2.5 rounded-2xl mb-1.5 transition-colors ${loginMode === 'online' ? 'bg-[#006699] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-50 text-gray-400'}`}>
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-[11px] font-bold ${loginMode === 'online' ? 'text-[#006699]' : 'text-gray-400'}`}>الدخول</span>
              <span className={`text-xs font-black ${loginMode === 'online' ? 'text-[#006699]' : 'text-gray-500'}`}>بوضع الإنترنت</span>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setLoginMode('offline')}
            className={`flex flex-col items-center justify-center p-3 rounded-[24px] border-2 transition-all h-24 relative overflow-hidden group shadow-sm ${loginMode === 'offline' ? 'bg-[#EBF5FF] border-[#006699]/20 ring-4 ring-[#006699]/5' : 'bg-white border-transparent'}`}
          >
            <div className={`p-2.5 rounded-2xl mb-1.5 transition-colors ${loginMode === 'offline' ? 'bg-[#006699] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-50 text-gray-400'}`}>
              <Scan className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-[11px] font-bold ${loginMode === 'offline' ? 'text-[#006699]' : 'text-gray-400'}`}>الدخول</span>
              <span className={`text-xs font-black ${loginMode === 'offline' ? 'text-[#006699]' : 'text-gray-500'}`}>بدون إنترنت</span>
            </div>
          </button>
        </div>

        {/* Authentication Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm transition-all focus-within:ring-4 focus-within:ring-[#006699]/5 focus-within:border-[#006699]/30 h-[84px] flex items-center px-6 group">
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-[11px] text-gray-400 font-bold mb-0.5 text-right">أدخل رقم الهاتف</span>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="77XXXXXXX"
                          className="border-none p-0 h-auto text-2xl font-black text-gray-800 focus-visible:ring-0 placeholder:text-gray-100 text-center tracking-wider"
                          style={{ direction: 'ltr' }}
                        />
                      </FormControl>
                    </div>
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded-2xl text-gray-300 group-focus-within:text-[#006699] transition-colors">
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
                  <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm transition-all focus-within:ring-4 focus-within:ring-[#006699]/5 focus-within:border-[#006699]/30 h-[84px] flex items-center px-6 group">
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 hover:text-[#006699] focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                    <div className="flex-1 text-right px-4">
                      <span className="text-[11px] text-gray-400 font-bold mb-0.5">كلمة المرور</span>
                      <FormControl>
                        <Input 
                          {...field} 
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="border-none p-0 h-auto text-2xl font-black text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-100"
                        />
                      </FormControl>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-start px-2">
              <button type="button" className="text-sm font-bold text-[#006699] hover:underline transition-all">هل نسيت كلمة المرور؟</button>
            </div>

            <div className="space-y-4 pt-2">
              <Button 
                type="submit" 
                className="w-full h-16 bg-[#006699] hover:bg-[#005580] text-white text-xl font-black rounded-[24px] shadow-2xl shadow-blue-900/30 transition-all active:scale-[0.98] border-none"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="animate-spin h-7 w-7" /> : "تسجيل الدخول"}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full h-12 text-[#006699] text-lg font-bold rounded-[24px] hover:bg-white/50 transition-all"
                onClick={() => navigate('/register')}
              >
                إنشاء حساب جديد
              </Button>
            </div>
          </form>
        </Form>

        {/* Global Standards Footer */}
        <div className="mt-auto flex flex-col items-center gap-6 pb-4">
          <div className="relative">
            <div className="absolute -inset-8 bg-[#006699]/5 rounded-full blur-[40px]" />
            <button className="relative w-24 h-24 rounded-[32px] bg-white shadow-xl border border-gray-50 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 group overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 group-hover:from-blue-50 transition-colors" />
               <div className="relative flex flex-col items-center">
                 <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-50/50 mb-1">
                   <Fingerprint className="w-10 h-10 text-[#006699]" strokeWidth={1.2} />
                 </div>
                 <div className="flex gap-0.5">
                   <div className="w-1.5 h-1.5 bg-[#C8102E] rounded-full" />
                   <div className="w-1.5 h-1.5 bg-[#006699] rounded-full" />
                   <div className="w-1.5 h-1.5 bg-[#006699] rounded-full" />
                 </div>
               </div>
            </button>
          </div>

          <div className="flex gap-6">
            {[
              { icon: HeadphonesIcon, label: "دعم" },
              { icon: Smartphone, label: "تواصل" },
              { icon: Scan, label: "مسح" }
            ].map((item, idx) => (
              <button key={idx} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#006699] group-hover:shadow-md transition-all">
                  <item.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </button>
            ))}
          </div>

          <div className="w-full flex justify-center items-center text-gray-400 text-[11px] font-bold gap-3 pt-2">
            <span>الإصدار: v3.9.1</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span>متصل</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

