
import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/AuthProvider";
import {
  Card,
  CardContent,
} from "../components/ui/card";
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
  Shield, 
  Mail, 
  User,
  Phone
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "رقم الهاتف مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const CompanyLogo = () => (
  <div className="flex flex-col items-center justify-center gap-2 mb-8">
    <div className="flex items-center gap-2">
      <div className="text-4xl font-bold tracking-tighter flex items-center">
        <span className="text-blue-600">فلو</span>
        <div className="relative mx-1">
          <Shield className="w-8 h-8 text-blue-600" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
             <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
        </div>
        <span className="text-blue-600">ك</span>
      </div>
    </div>
    <div className="flex gap-4 text-[10px] tracking-[0.3em] font-bold text-red-500 uppercase">
      <span>F</span><span>l</span><span>o</span><span>o</span><span>s</span><span>a</span><span>k</span>
    </div>
  </div>
);

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [loginMode, setLoginMode] = useState<'online' | 'offline'>('online');
  const [showPassword, setShowPassword] = useState(false);
  
  const loginForm = useForm<LoginFormData>({
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
      navigate("/");
    }
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen relative bg-white px-4 py-8 overflow-y-auto" dir="rtl">
      <div className="flex justify-between items-start mb-4">
         <Button variant="ghost" size="icon" className="rounded-full border border-gray-200 w-10 h-10">
            <div className="flex gap-0.5">
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            </div>
         </Button>
         <h2 className="text-xl font-medium text-gray-700">مرحباً بعودتك</h2>
      </div>

      <CompanyLogo />

      <div className="max-w-md mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all border-2 rounded-2xl ${loginMode === 'online' ? 'border-blue-100 bg-blue-50/50' : 'border-transparent bg-gray-50'}`}
            onClick={() => setLoginMode('online')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-right">
                <p className="text-[10px] text-gray-400">الدخول</p>
                <p className="font-bold text-gray-700 text-sm">بوضع الإنترنت</p>
              </div>
              <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all border-2 rounded-2xl ${loginMode === 'offline' ? 'border-red-100 bg-red-50/50' : 'border-transparent bg-gray-50'}`}
            onClick={() => setLoginMode('offline')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-right">
                <p className="text-[10px] text-gray-400">الدخول</p>
                <p className="font-bold text-gray-700 text-sm">بدون إنترنت</p>
              </div>
              <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect width="20" height="14" x="2" y="6" rx="2"/><path d="M12 22v-4"/></svg>
              </div>
            </CardContent>
          </Card>
        </div>

        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <Input 
                      {...field} 
                      placeholder="772293228"
                      className="h-16 bg-gray-50 border-none rounded-2xl text-left pr-12 font-bold text-xl focus-visible:ring-1 focus-visible:ring-blue-200"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                       <span className="text-[10px] text-gray-400 mb-0.5">أدخل رقم الهاتف</span>
                       <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-400" />
                       </div>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="كلمة المرور"
                      className="h-16 bg-gray-50 border-none rounded-2xl text-right pl-12 font-bold text-xl focus-visible:ring-1 focus-visible:ring-blue-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                    >
                      <div className="w-8 h-8 rounded-full border border-red-500 flex items-center justify-center text-red-500">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </div>
                    </button>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-700">كلمة المرور</div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-right pr-2">
               <Link href="/forgot-password">
                  <a className="text-sm text-gray-500 font-bold">هل نسيت كلمة المرور؟</a>
               </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-[#0077b6] hover:bg-[#005f8d] text-white text-xl font-bold rounded-2xl shadow-md"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? <Loader2 className="animate-spin" /> : "تسجيل الدخول"}
            </Button>

            <Button 
              type="button"
              variant="outline"
              className="w-full h-14 border-gray-200 text-[#0077b6] text-xl font-bold rounded-2xl"
              onClick={() => navigate('/register')}
            >
              إنشاء حساب جديد
            </Button>
          </form>
        </Form>

        <div className="flex flex-col items-center gap-8 pt-4">
           <div className="relative w-20 h-20 flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" fill="#E5E7EB"/>
                <path d="M12 6c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" fill="#3B82F6" fillOpacity="0.2"/>
                <path d="M12 8c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 12c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
           </div>

           <div className="flex gap-6">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-500">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-500">
                 <Phone className="w-6 h-6" />
              </div>
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-500">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
              </div>
           </div>

           <div className="w-full flex justify-between items-center px-4 mt-4">
              <p className="text-gray-400 text-xs font-bold">الإصدار: 391</p>
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
