import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { 
  ShieldCheck,
  Smartphone,
  Calendar,
  MapPin,
  ChevronDown,
  Mail,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Activity
} from "lucide-react";

const countries = [
  { name: "اليمن", code: "+967", flag: "https://flagcdn.com/w20/ye.png" },
  { name: "السعودية", code: "+966", flag: "https://flagcdn.com/w20/sa.png" },
  { name: "الإمارات", code: "+971", flag: "https://flagcdn.com/w20/ae.png" },
  { name: "عمان", code: "+968", flag: "https://flagcdn.com/w20/om.png" },
  { name: "الكويت", code: "+965", flag: "https://flagcdn.com/w20/kw.png" },
  { name: "قطر", code: "+974", flag: "https://flagcdn.com/w20/qa.png" },
  { name: "البحرين", code: "+973", flag: "https://flagcdn.com/w20/bh.png" },
  { name: "مصر", code: "+20", flag: "https://flagcdn.com/w20/eg.png" },
  { name: "الأردن", code: "+962", flag: "https://flagcdn.com/w20/jo.png" },
  { name: "العراق", code: "+964", flag: "https://flagcdn.com/w20/iq.png" },
  { name: "سوريا", code: "+963", flag: "https://flagcdn.com/w20/sy.png" },
  { name: "لبنان", code: "+961", flag: "https://flagcdn.com/w20/lb.png" },
  { name: "فلسطين", code: "+970", flag: "https://flagcdn.com/w20/ps.png" },
  { name: "المغرب", code: "+212", flag: "https://flagcdn.com/w20/ma.png" },
  { name: "الجزائر", code: "+213", flag: "https://flagcdn.com/w20/dz.png" },
  { name: "تونس", code: "+216", flag: "https://flagcdn.com/w20/tn.png" },
  { name: "ليبيا", code: "+218", flag: "https://flagcdn.com/w20/ly.png" },
  { name: "السودان", code: "+249", flag: "https://flagcdn.com/w20/sd.png" },
  { name: "موريتانيا", code: "+222", flag: "https://flagcdn.com/w20/mr.png" },
  { name: "تركيا", code: "+90", flag: "https://flagcdn.com/w20/tr.png" },
  { name: "الولايات المتحدة", code: "+1", flag: "https://flagcdn.com/w20/us.png" },
  { name: "المملكة المتحدة", code: "+44", flag: "https://flagcdn.com/w20/gb.png" },
];

const registerSchema = z.object({
  fullName: z.string().min(1, "الاسم الرباعي مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(9, "رقم الهاتف غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن لا تقل عن 6 أحرف"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  birthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  birthPlace: z.string().min(1, "مكان الميلاد مطلوب"),
  gender: z.string().min(1, "الجنس مطلوب"),
  terms: z.boolean().refine(v => v === true, "يجب الموافقة على الشروط"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

import logoHeaderLight from "/assets/logo_header_light.png";
import logoHeaderDark from "/assets/logo_header_dark.png";
import appIconLight from "/assets/app_icon_light.png";
import appIconDark from "/assets/app_icon_dark.png";

const RegisterPageHeader = () => (
  <div className="flex flex-col items-center justify-center mb-4 animate-in zoom-in duration-700 delay-150 fill-mode-both">
    <div className="relative mb-3 group cursor-pointer">
      <div className="w-20 h-20 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 relative">
        <img 
          src={appIconLight} 
          alt="AXION Logo" 
          className="w-full h-full object-contain dark:hidden"
        />
        <img 
          src={appIconDark} 
          alt="AXION Logo" 
          className="w-full h-full object-contain hidden dark:block"
        />
        <div className="absolute top-4 right-4 w-3.5 h-3.5 bg-blue-500 rounded-full border-[2.5px] border-white dark:border-[#1a1c1e] shadow-md animate-pulse"></div>
      </div>
    </div>
    <div className="text-center relative">
      <div className="flex items-center justify-center gap-3 mb-1.5">
        <img 
          src={logoHeaderLight} 
          alt="AXION | أكسيون" 
          className="h-8 object-contain dark:hidden"
        />
        <img 
          src={logoHeaderDark} 
          alt="AXION | أكسيون" 
          className="h-8 object-contain hidden dark:block"
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-blue-200 dark:to-blue-900"></span>
        <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black tracking-[0.5em] uppercase">Real Assets Management</span>
        <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-blue-200 dark:to-blue-900"></span>
      </div>
    </div>
  </div>
);

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2000);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    // محاولة اكتشاف الدولة تلقائياً بناءً على المنطقة الزمنية
    const detectCountry = () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone.includes('Aden') || timezone.includes('Sanaa')) setSelectedCountry(countries.find(c => c.code === '+967') || countries[0]);
        else if (timezone.includes('Riyadh')) setSelectedCountry(countries.find(c => c.code === '+966') || countries[0]);
        else if (timezone.includes('Dubai') || timezone.includes('Abu_Dhabi')) setSelectedCountry(countries.find(c => c.code === '+971') || countries[0]);
        else if (timezone.includes('Cairo')) setSelectedCountry(countries.find(c => c.code === '+20') || countries[0]);
        else if (timezone.includes('Muscat')) setSelectedCountry(countries.find(c => c.code === '+968') || countries[0]);
        else if (timezone.includes('Kuwait')) setSelectedCountry(countries.find(c => c.code === '+965') || countries[0]);
        else if (timezone.includes('Qatar')) setSelectedCountry(countries.find(c => c.code === '+974') || countries[0]);
        else if (timezone.includes('Bahrain')) setSelectedCountry(countries.find(c => c.code === '+973') || countries[0]);
        else if (timezone.includes('Amman')) setSelectedCountry(countries.find(c => c.code === '+962') || countries[0]);
        else if (timezone.includes('Baghdad')) setSelectedCountry(countries.find(c => c.code === '+964') || countries[0]);
        else if (timezone.includes('Damascus')) setSelectedCountry(countries.find(c => c.code === '+963') || countries[0]);
        else if (timezone.includes('Beirut')) setSelectedCountry(countries.find(c => c.code === '+961') || countries[0]);
        else if (timezone.includes('Gaza') || timezone.includes('Hebron')) setSelectedCountry(countries.find(c => c.code === '+970') || countries[0]);
        else if (timezone.includes('Casablanca')) setSelectedCountry(countries.find(c => c.code === '+212') || countries[0]);
        else if (timezone.includes('Algiers')) setSelectedCountry(countries.find(c => c.code === '+213') || countries[0]);
        else if (timezone.includes('Tunis')) setSelectedCountry(countries.find(c => c.code === '+216') || countries[0]);
        else if (timezone.includes('Tripoli')) setSelectedCountry(countries.find(c => c.code === '+218') || countries[0]);
        else if (timezone.includes('Khartoum')) setSelectedCountry(countries.find(c => c.code === '+249') || countries[0]);
        else if (timezone.includes('Istanbul')) setSelectedCountry(countries.find(c => c.code === '+90') || countries[0]);
      } catch (e) {
        console.error("Failed to detect country:", e);
      }
    };
    detectCountry();
  }, []);

  const filteredCountries = countries.filter(c => 
    c.name.includes(searchQuery) || c.code.includes(searchQuery)
  );

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      birthDate: "",
      birthPlace: "",
      gender: "ذكر",
      terms: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل إنشاء الحساب");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
      });
      const userId = data?.data?.user?.id;
      const email = data?.data?.user?.email || form.getValues('email');
      navigate(`/verify-email?userId=${userId}&email=${encodeURIComponent(email)}`);
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إنشاء الحساب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="h-screen w-full bg-background dark:bg-slate-950 flex flex-col items-center overflow-hidden font-sans select-none relative transition-colors duration-500" dir="rtl">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0l30 30-30 30-30-30z\' fill=\'%232563eb\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '45px 45px' 
           }}>
      </div>

      <div className="w-full max-w-[420px] h-full z-10 flex flex-col p-4 pt-safe justify-center relative">
        <div className="flex flex-col gap-2 px-1 pt-2">
          <div className="flex justify-between items-center mb-1 animate-in slide-in-from-top duration-500 fill-mode-both" dir="rtl">
            <div className="text-right flex flex-col items-end">
              <h2 className="text-[10px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-widest leading-none">إنضم إلينا</h2>
              <span className="text-[8px] text-blue-600/30 dark:text-blue-400/30 font-bold uppercase">JOIN AXION OPS</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-md active:scale-95 group border-2 border-white dark:border-slate-800 hover:rotate-12 transition-transform"
              onClick={() => navigate('/login')}
              data-testid="button-back"
            >
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </Button>
          </div>

          {/* Logo Section - AXION Real Assets */}
          <RegisterPageHeader />

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-2 animate-in fade-in slide-in-from-bottom duration-700 delay-500 fill-mode-both">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Full Name / الاسم</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="اسمك الرباعي"
                            className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                            data-testid="input-fullname"
                          />
                        </FormControl>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Identity / البريد</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="username@axion.system"
                            className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                            data-testid="input-email"
                          />
                        </FormControl>
                      </div>
                      <Mail className="w-4 h-4 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-2 justify-between hover:bg-muted/50 transition-colors">
                      <ChevronDown className="w-3 h-3 text-blue-600/30" />
                      <span className="text-xs font-black text-foreground" dir="ltr">{selectedCountry.code}</span>
                      <img src={selectedCountry.flag} alt={selectedCountry.name} className="w-4 h-auto rounded-sm" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[400px] w-[95%] p-0 rounded-3xl border-border dark:border-slate-800 bg-card dark:bg-slate-900 shadow-2xl overflow-hidden" dir="rtl">
                    <div className="p-4">
                      <div className="relative mb-4">
                        <Input
                          placeholder="بحث"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-12 bg-muted/50 dark:bg-slate-800/50 border-none rounded-xl text-right pr-10 pl-4 text-sm font-bold focus-visible:ring-0"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <div className="max-h-[40vh] overflow-y-auto custom-scrollbar">
                        {filteredCountries.map((country) => (
                          <button
                            key={country.name + country.code}
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsDialogOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 dark:hover:bg-slate-800/50 rounded-xl transition-colors mb-1"
                          >
                            <img src={country.flag} alt={country.name} className="w-6 h-auto rounded-sm shadow-sm" />
                            <span className="text-sm font-bold text-foreground flex-1 text-right px-4" dir="ltr">{country.code}</span>
                            <span className="text-sm font-bold text-muted-foreground min-w-[100px] text-left">{country.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Smartphone / الهاتف</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="7xxxxxxxx"
                              className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                              data-testid="input-phone"
                            />
                          </FormControl>
                        </div>
                        <Smartphone className="w-4 h-4 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Security / كلمة المرور</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                              data-testid="input-password"
                              hidePasswordToggle={true}
                            />
                          </FormControl>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="flex items-center justify-center ml-1 transition-colors"
                        >
                          {showPassword ? (
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-600" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Verify / تأكيد</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                              data-testid="input-confirm-password"
                              hidePasswordToggle={true}
                            />
                          </FormControl>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="flex items-center justify-center ml-1 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-600" strokeWidth={2} />
                          )}
                        </button>
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
                    <FormItem className="space-y-0">
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-4 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[9px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Location / مكان الميلاد</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="المدينة"
                              className="border-none p-0 h-5 text-sm font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                            />
                          </FormControl>
                        </div>
                        <MapPin className="w-4 h-4 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
                        <DialogTrigger asChild>
                          <button 
                            type="button" 
                            className="w-full bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-12 flex items-center px-4 justify-between hover:bg-muted/50 transition-colors"
                            data-testid="button-birth-date"
                          >
                            <Calendar className="w-4 h-4 text-blue-600/30" />
                            <span className={`text-xs font-bold ${field.value ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                              {field.value || "تاريخ الميلاد"}
                            </span>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[350px] w-[95%] p-0 rounded-3xl border-border dark:border-slate-800 bg-card dark:bg-slate-900 shadow-2xl overflow-hidden" dir="rtl">
                          <div className="p-4">
                            <DialogHeader className="pb-4 border-b border-border dark:border-slate-800">
                              <DialogTitle className="text-center text-lg font-black text-foreground">تاريخ الميلاد</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-3 gap-2 py-6">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-muted-foreground mb-2">السنة</span>
                                <div className="h-40 overflow-y-auto custom-scrollbar w-full">
                                  {Array.from({ length: 80 }, (_, i) => 2025 - i).map((year) => (
                                    <button
                                      key={year}
                                      type="button"
                                      onClick={() => setSelectedYear(year)}
                                      className={`w-full py-2 text-center font-bold transition-colors ${selectedYear === year ? 'bg-primary text-primary-foreground rounded-lg' : 'text-foreground hover:bg-muted dark:hover:bg-slate-800'}`}
                                    >
                                      {year}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-muted-foreground mb-2">الشهر</span>
                                <div className="h-40 overflow-y-auto custom-scrollbar w-full">
                                  {["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"].map((month, idx) => (
                                    <button
                                      key={month}
                                      type="button"
                                      onClick={() => setSelectedMonth(idx + 1)}
                                      className={`w-full py-2 text-center font-bold text-sm transition-colors ${selectedMonth === idx + 1 ? 'bg-primary text-primary-foreground rounded-lg' : 'text-foreground hover:bg-muted dark:hover:bg-slate-800'}`}
                                    >
                                      {month}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-muted-foreground mb-2">اليوم</span>
                                <div className="h-40 overflow-y-auto custom-scrollbar w-full">
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => setSelectedDay(day)}
                                      className={`w-full py-2 text-center font-bold transition-colors ${selectedDay === day ? 'bg-primary text-primary-foreground rounded-lg' : 'text-foreground hover:bg-muted dark:hover:bg-slate-800'}`}
                                    >
                                      {day}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Button 
                              onClick={() => {
                                const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                                form.setValue("birthDate", formattedDate);
                                setIsDateDialogOpen(false);
                              }}
                              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl"
                            >
                              تأكيد التاريخ
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-center space-x-2 space-y-0 py-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="rounded-sm border-blue-600/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </FormControl>
                    <div className="leading-none text-right px-2">
                      <FormLabel className="text-[10px] font-bold text-muted-foreground">
                        أوافق على <span className="text-blue-600 dark:text-blue-400">شروط الاستخدام</span> و <span className="text-blue-600 dark:text-blue-400">سياسة الخصوصية</span>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl font-black text-base shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                disabled={registerMutation.isPending}
                data-testid="button-submit"
              >
                {registerMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>إنشاء الحساب الآن</span>
                    <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-2 text-center pb-2 animate-in fade-in duration-1000 delay-700 fill-mode-both">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              لديك حساب بالفعل؟ 
              <button 
                onClick={() => navigate('/login')}
                className="text-blue-600 dark:text-blue-400 mr-1 hover:underline underline-offset-4"
              >
                تسجيل الدخول
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
