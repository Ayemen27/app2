
import { useState } from "react";
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
  Mail,
  QrCode,
  Info
} from "lucide-react";

const loginSchema = z.object({
  phone: z.string().min(9, "رقم الهاتف يجب أن يكون 9 أرقام على الأقل"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const AppLogo = () => (
  <div className="flex flex-col items-center justify-center mb-8 animate-in fade-in zoom-in duration-500">
    <div className="relative mb-3">
      <div className="w-20 h-20 bg-gradient-to-tr from-[#006699] to-[#0099CC] rounded-2xl rotate-12 flex items-center justify-center shadow-xl shadow-blue-900/20">
        <ShieldCheck className="w-12 h-12 text-white -rotate-12" strokeWidth={1.5} />
      </div>
      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl shadow-lg flex items-center justify-center">
        <div className="w-5 h-5 bg-[#C8102E] rounded-lg animate-pulse" />
      </div>
    </div>
    <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tight">إنجاز <span className="text-[#006699]">برو</span></h1>
    <p className="text-[10px] font-bold text-gray-400 tracking-[0.4em] uppercase mt-1">Enjaz Professional</p>
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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center p-6 font-sans select-none overflow-x-hidden" dir="rtl">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none z-0" 
           style={{ backgroundImage: 'linear-gradient(30deg, #006699 12%, transparent 12.5%, transparent 87%, #006699 87.5%, #006699), linear-gradient(150deg, #006699 12%, transparent 12.5%, transparent 87%, #006699 87.5%, #006699), linear-gradient(30deg, #006699 12%, transparent 12.5%, transparent 87%, #006699 87.5%, #006699), linear-gradient(150deg, #006699 12%, transparent 12.5%, transparent 87%, #006699 87.5%, #006699), linear-gradient(60deg, #006699 25%, transparent 25.5%, transparent 75%, #006699 75%, #006699), linear-gradient(60deg, #006699 25%, transparent 25.5%, transparent 75%, #006699 75%, #006699)', backgroundSize: '40px 70px' }}>
      </div>

      <div className="w-full max-w-[420px] z-10 flex flex-col flex-1">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-10 pt-4">
          <Button variant="ghost" size="icon" className="w-11 h-11 rounded-2xl border border-gray-200/50 bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center gap-1 hover:bg-white transition-all group">
            <div className="w-1.5 h-1.5 bg-[#C8102E] rounded-full group-hover:scale-125 transition-transform"></div>
            <div className="w-1.5 h-1.5 bg-[#C8102E] rounded-full group-hover:scale-125 transition-transform delay-75"></div>
            <div className="w-1.5 h-1.5 bg-[#C8102E] rounded-full group-hover:scale-125 transition-transform delay-150"></div>
          </Button>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-800">مرحباً بك مجدداً</h2>
            <p className="text-xs text-gray-400 font-medium">سجل دخولك لمتابعة أعمالك</p>
          </div>
        </div>

        {/* Brand Logo */}
        <AppLogo />

        {/* Connectivity Switcher */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            type="button"
            onClick={() => setLoginMode('online')}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all h-20 bg-white relative overflow-hidden group ${loginMode === 'online' ? 'border-[#006699]/20 shadow-lg shadow-blue-900/5' : 'border-transparent grayscale'}`}
          >
            {loginMode === 'online' && <div className="absolute top-0 right-0 w-12 h-12 bg-[#006699]/5 rounded-bl-[40px]" />}
            <div className="flex flex-col items-start text-right z-10">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">الاتصال</span>
              <span className={`text-sm font-black ${loginMode === 'online' ? 'text-[#006699]' : 'text-gray-500'}`}>أونلاين</span>
            </div>
            <div className={`p-2.5 rounded-xl z-10 transition-colors ${loginMode === 'online' ? 'bg-[#006699] text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Smartphone className="w-5 h-5" />
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setLoginMode('offline')}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all h-20 bg-white relative overflow-hidden group ${loginMode === 'offline' ? 'border-[#006699]/20 shadow-lg shadow-blue-900/5' : 'border-transparent grayscale'}`}
          >
            {loginMode === 'offline' && <div className="absolute top-0 right-0 w-12 h-12 bg-[#006699]/5 rounded-bl-[40px]" />}
            <div className="flex flex-col items-start text-right z-10">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">الاتصال</span>
              <span className={`text-sm font-black ${loginMode === 'offline' ? 'text-[#006699]' : 'text-gray-500'}`}>أوفلاين</span>
            </div>
            <div className={`p-2.5 rounded-xl z-10 transition-colors ${loginMode === 'offline' ? 'bg-[#006699] text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Info className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Authentication Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#006699]/10 focus-within:border-[#006699]/30 h-[76px] flex items-center px-5">
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-[10px] text-gray-400 font-black mb-0.5 uppercase tracking-wide">رقم الهاتف</span>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="77XXXXXXX"
                          className="border-none p-0 h-auto text-xl font-black text-gray-800 focus-visible:ring-0 placeholder:text-gray-200"
                          style={{ direction: 'ltr', textAlign: 'left' }}
                        />
                      </FormControl>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-xl text-gray-400">
                      <Smartphone className="w-5 h-5" />
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
                  <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#006699]/10 focus-within:border-[#006699]/30 h-[76px] flex items-center px-5">
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#C8102E] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 text-right px-4">
                      <span className="text-[10px] text-gray-400 font-black mb-0.5 uppercase tracking-wide">كلمة المرور</span>
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

            <div className="flex justify-end px-2">
              <button type="button" className="text-sm font-black text-gray-400 hover:text-[#006699] transition-colors">هل تواجه مشكلة في الدخول؟</button>
            </div>

            <div className="space-y-4 pt-4">
              <Button 
                type="submit" 
                className="w-full h-15 bg-[#006699] hover:bg-[#005580] text-white text-lg font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] border-b-4 border-blue-900"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="animate-spin" /> : "دخول آمن"}
              </Button>

              <Button 
                type="button"
                variant="outline"
                className="w-full h-15 border-2 border-gray-100 text-gray-700 text-lg font-black rounded-2xl bg-white hover:bg-gray-50 transition-all active:scale-[0.98]"
                onClick={() => navigate('/register')}
              >
                إنشاء حساب احترافي
              </Button>
            </div>
          </form>
        </Form>

        {/* Global Standards Footer */}
        <div className="mt-auto pt-10 pb-6 flex flex-col items-center gap-12">
          <div className="relative group">
            <div className="absolute -inset-4 bg-[#006699]/10 rounded-full blur-xl group-hover:bg-[#006699]/20 transition-all" />
            <button className="relative w-22 h-22 rounded-3xl bg-white shadow-2xl border border-gray-50 flex items-center justify-center transition-transform active:scale-90 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50" />
               <div className="relative flex flex-col items-center gap-1">
                 <ShieldCheck className="w-12 h-12 text-[#006699]" strokeWidth={1} />
                 <span className="text-[8px] font-bold text-gray-300 tracking-tighter">SECURE ID</span>
               </div>
            </button>
          </div>

          <div className="flex gap-8">
            {[
              { icon: Mail, label: "دعم" },
              { icon: Smartphone, label: "تواصل" },
              { icon: QrCode, label: "مسح" }
            ].map((item, idx) => (
              <button key={idx} className="flex flex-col items-center gap-2 group">
                <div className="w-15 h-15 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-[#006699] group-hover:border-[#006699]/30 transition-all group-hover:-translate-y-1">
                  <item.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="w-full flex justify-between items-center text-gray-300 text-[10px] font-black px-4 pt-4 border-t border-gray-100/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>الخادم نشط - v3.9.1</span>
            </div>
            <div className="flex gap-2">
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
