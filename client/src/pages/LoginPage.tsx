
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
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(0,102,153,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,153,0.1) 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
           }}>
      </div>

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-between">
        <div className="flex flex-col">
          {/* Navigation Header */}
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95 group">
              <MoreHorizontal className="w-5 h-5 text-gray-400 group-hover:text-[#006699]" />
            </Button>
            <h2 className="text-base font-bold text-gray-600">مرحباً بعودتك</h2>
          </div>

          {/* Brand Logo - Compacted */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="relative mb-2">
              <div className="w-20 h-20 bg-[#006699] rounded-[22px] flex items-center justify-center shadow-xl shadow-blue-900/20">
                <ShieldCheck className="w-11 h-11 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-[#C8102E] rounded-md shadow-inner" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tighter flex flex-col items-center">
                فلوسك
                <span className="text-[#006699] text-sm font-bold tracking-widest uppercase">Floosak</span>
              </h1>
            </div>
          </div>

          {/* Connectivity Switcher - Smaller */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button 
              type="button"
              onClick={() => setLoginMode('online')}
              className={`flex flex-col items-center justify-center p-2 rounded-[20px] border transition-all h-20 relative shadow-sm ${loginMode === 'online' ? 'bg-[#EBF5FF] border-[#006699]/30 ring-2 ring-[#006699]/5' : 'bg-white border-gray-100 opacity-60'}`}
            >
              <div className={`p-2 rounded-xl mb-1 ${loginMode === 'online' ? 'bg-[#006699] text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-center leading-none">
                <span className={`text-[9px] font-bold ${loginMode === 'online' ? 'text-[#006699]' : 'text-gray-400'}`}>الدخول</span>
                <span className={`text-[11px] font-black ${loginMode === 'online' ? 'text-[#006699]' : 'text-gray-500'}`}>بوضع الإنترنت</span>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => setLoginMode('offline')}
              className={`flex flex-col items-center justify-center p-2 rounded-[20px] border transition-all h-20 relative shadow-sm ${loginMode === 'offline' ? 'bg-[#EBF5FF] border-[#006699]/30 ring-2 ring-[#006699]/5' : 'bg-white border-gray-100 opacity-60'}`}
            >
              <div className={`p-2 rounded-xl mb-1 ${loginMode === 'offline' ? 'bg-[#006699] text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>
                <Scan className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-center leading-none">
                <span className={`text-[9px] font-bold ${loginMode === 'offline' ? 'text-[#006699]' : 'text-gray-400'}`}>الدخول</span>
                <span className={`text-[11px] font-black ${loginMode === 'offline' ? 'text-[#006699]' : 'text-gray-500'}`}>بدون إنترنت</span>
              </div>
            </button>
          </div>

          {/* Authentication Form - More compact fields */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#006699]/5 focus-within:border-[#006699]/30 h-[72px] flex items-center px-4 group">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[10px] text-gray-400 font-bold mb-0.5 text-right">أدخل رقم الهاتف</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="772293228"
                            className="border-none p-0 h-auto text-xl font-black text-gray-800 focus-visible:ring-0 placeholder:text-gray-200 text-center tracking-widest"
                            style={{ direction: 'ltr' }}
                          />
                        </FormControl>
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-xl text-gray-300 group-focus-within:text-[#006699]">
                        <Smartphone className="w-6 h-6" strokeWidth={1.5} />
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
                    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#006699]/5 focus-within:border-[#006699]/30 h-[72px] flex items-center px-4 group">
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 hover:text-[#006699] focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <div className="flex-1 text-right px-3">
                        <span className="text-[10px] text-gray-400 font-bold mb-0.5">كلمة المرور</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="border-none p-0 h-auto text-xl font-black text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-200"
                          />
                        </FormControl>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end px-1">
                <button type="button" className="text-[12px] font-bold text-[#006699] hover:underline">هل نسيت كلمة المرور؟؟</button>
              </div>

              <div className="space-y-3 pt-1">
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-[#006699] hover:bg-[#005580] text-white text-lg font-black rounded-[20px] shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] border-none"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "تسجيل الدخول"}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-[#006699] text-base font-bold rounded-[20px] hover:bg-white/50 transition-all"
                  onClick={() => navigate('/register')}
                >
                  إنشاء حساب جديد
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Global Standards Footer - More compressed */}
        <div className="flex flex-col items-center gap-4 pb-2">
          <div className="relative">
            <button className="relative w-20 h-20 rounded-[28px] bg-white shadow-lg border border-gray-50 flex flex-col items-center justify-center transition-all active:scale-90 group overflow-hidden">
               <div className="relative flex flex-col items-center">
                 <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50/50 mb-0.5">
                   <Fingerprint className="w-9 h-9 text-[#006699]" strokeWidth={1.2} />
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
              { icon: HeadphonesIcon },
              { icon: Smartphone },
              { icon: Scan }
            ].map((item, idx) => (
              <button key={idx} className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-50 flex items-center justify-center text-gray-400 hover:text-[#006699] transition-all">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
              </button>
            ))}
          </div>

          <div className="w-full flex justify-between items-center text-gray-400 text-[10px] font-bold px-2">
            <span>الإصدار: v3.9.1</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span>متصل</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


