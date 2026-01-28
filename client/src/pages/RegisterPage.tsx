import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { 
  ShieldCheck,
  Smartphone,
  Calendar,
  MapPin,
  ChevronDown,
  User,
  Mail
} from "lucide-react";

const registerSchema = z.object({
  fullName: z.string().min(1, "الاسم الرباعي مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(9, "رقم الهاتف غير صحيح"),
  birthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthPlace: z.string().min(1, "مكان الميلاد مطلوب"),
  gender: z.string().min(1, "الجنس مطلوب"),
  terms: z.boolean().refine(v => v === true, "يجب الموافقة على الشروط"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, navigate] = useLocation();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      birthDate: "",
      birthPlace: "",
      gender: "ذكر",
      terms: false,
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

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-4 pt-safe justify-between relative">
        <div className="flex flex-col flex-1 gap-1">
          {/* Header */}
          <div className="flex justify-end items-center mb-1">
            <h2 className="text-sm font-bold text-[#006699]">مساء الخير</h2>
          </div>

          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#006699] tracking-tighter leading-none">فلوسك</h1>
              <span className="text-[#C8102E] text-[10px] font-bold tracking-[0.2em] uppercase block">Floosak</span>
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-sm font-bold text-gray-600">قم بإنشاء حسابك</p>
            <p className="text-sm font-bold text-gray-600">في محفظة فلوسك</p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form className="space-y-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-[#EAECEF] rounded-xl h-14 flex flex-col justify-center px-4 relative">
                      <span className="text-[10px] text-gray-500 font-bold text-right absolute top-2 right-4">اسمك الرباعي</span>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="عمار محمد"
                          className="border-none p-0 h-8 text-lg font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-400 bg-transparent shadow-none ring-0 mt-3"
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <Input {...field} />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-[100px_1fr] gap-2">
                 <div className="bg-[#EAECEF] rounded-xl h-14 flex items-center px-2 justify-between">
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                    <span className="text-lg font-bold text-gray-800" dir="ltr">+967</span>
                    <img src="https://flagcdn.com/w20/ye.png" alt="YE" className="w-6 h-auto rounded-sm" />
                 </div>
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <div className="bg-[#EAECEF] rounded-xl h-14 flex flex-col justify-center px-4 relative">
                        <span className="text-[10px] text-gray-500 font-bold text-right absolute top-2 right-4">أدخل رقم الهاتف</span>
                        <div className="flex items-center justify-between mt-3">
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="772293228"
                              className="border-none p-0 h-8 text-lg font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-400 bg-transparent shadow-none ring-0 flex-1"
                            />
                          </FormControl>
                          <Smartphone className="w-6 h-6 text-[#006699] mr-2 p-1 border-2 border-[#006699] rounded-md" />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="bg-[#EAECEF] rounded-xl h-14 flex flex-col justify-center px-4 relative">
                        <span className="text-[10px] text-gray-500 font-bold text-right absolute top-2 right-4">تاريخ الميلاد</span>
                        <div className="flex items-center justify-between mt-3">
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="1999-12-04"
                              className="border-none p-0 h-8 text-lg font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-400 bg-transparent shadow-none ring-0 flex-1"
                            />
                          </FormControl>
                          <Calendar className="w-5 h-5 text-[#006699] mr-2" />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthPlace"
                  render={({ field }) => (
                    <FormItem>
                      <div className="bg-[#EAECEF] rounded-xl h-14 flex flex-col justify-center px-4 relative">
                        <span className="text-[10px] text-gray-500 font-bold text-right absolute top-2 right-4">مكان الميلاد</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="صنعاء"
                            className="border-none p-0 h-8 text-lg font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-400 bg-transparent shadow-none ring-0 mt-3"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-[#EAECEF] rounded-xl h-14 flex items-center px-4 justify-between relative">
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] text-gray-500 font-bold absolute top-2 right-12">الجنس</span>
                           <span className="text-lg font-bold text-gray-800 mt-3">ذكر</span>
                        </div>
                        <User className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-start gap-2 py-2 px-1">
                <Checkbox id="terms" className="rounded-md border-gray-400 w-5 h-5 data-[state=checked]:bg-[#006699]" />
                <label htmlFor="terms" className="text-[13px] font-bold text-gray-800">
                  أوافق على <span className="text-[#006699] underline">الشروط والأحكام</span>
                </label>
              </div>

              <Button 
                type="button" 
                className="w-full h-14 bg-[#006699] hover:bg-[#005580] text-white text-xl font-bold rounded-xl shadow-lg border-none active:scale-[0.98] transition-all"
              >
                إنشاء حساب
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-bold text-gray-600"
                >
                  لديك حساب؟ <span className="text-red-600">تسجيل الدخول</span>
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
