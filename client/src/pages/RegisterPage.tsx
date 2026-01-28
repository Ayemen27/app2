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
          </div>

          {/* Form */}
          <Form {...form}>
            <form className="space-y-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="اسمك الرباعي"
                          className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent shadow-none ring-0"
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
                  <FormItem>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          placeholder="البريد الإلكتروني"
                          className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent shadow-none ring-0"
                        />
                      </FormControl>
                      <Mail className="w-5 h-5 text-[#006699] mr-2" />
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-[100px_1fr] gap-2">
                 <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-2 justify-between">
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-800" dir="ltr">+967</span>
                    <img src="https://flagcdn.com/w20/ye.png" alt="YE" className="w-5 h-auto rounded-sm" />
                 </div>
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="أدخل رقم الهاتف"
                            className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent shadow-none ring-0"
                          />
                        </FormControl>
                        <Smartphone className="w-5 h-5 text-[#006699] mr-2" />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="birthPlace"
                  render={({ field }) => (
                    <FormItem>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="مكان الميلاد"
                            className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent shadow-none ring-0"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="تاريخ الميلاد"
                            className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent shadow-none ring-0"
                          />
                        </FormControl>
                        <Calendar className="w-4 h-4 text-[#006699] mr-2" />
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
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4 justify-between">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                           <span className="text-[8px] text-gray-400">الجنس</span>
                           <span className="text-sm font-bold text-gray-800">ذكر</span>
                        </div>
                        <User className="w-5 h-5 text-[#006699]" />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-center gap-2 py-2">
                <Checkbox id="terms" className="rounded-sm border-gray-300" />
                <label htmlFor="terms" className="text-[11px] font-bold text-gray-600">
                  أوافق على <span className="text-[#006699] underline">الشروط والأحكام</span>
                </label>
              </div>

              <Button 
                type="button" 
                className="w-full h-12 bg-[#006699] hover:bg-[#005580] text-white text-lg font-bold rounded-xl shadow-md border-none"
              >
                إنشاء حساب
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold text-gray-600"
                >
                  لديك حساب؟ <span className="text-[#C8102E]">تسجيل الدخول</span>
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
