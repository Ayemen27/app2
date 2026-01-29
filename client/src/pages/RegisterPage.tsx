import { useState } from "react";
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
  EyeOff
} from "lucide-react";

const countries = [
  { name: "اليمن", code: "+967", flag: "https://flagcdn.com/w20/ye.png" },
  { name: "السعودية", code: "+966", flag: "https://flagcdn.com/w20/sa.png" },
  { name: "الإمارات", code: "+971", flag: "https://flagcdn.com/w20/ae.png" },
  { name: "مصر", code: "+20", flag: "https://flagcdn.com/w20/eg.png" },
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

      <div className="w-full max-w-[400px] h-full z-10 flex flex-col p-3 pt-safe justify-between relative">
        <div className="flex flex-col flex-1 gap-0.5 px-1 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-0.5 animate-in slide-in-from-top duration-500 fill-mode-both" dir="rtl">
            <div className="text-right flex flex-col items-end">
              <h2 className="text-[9px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-widest leading-none">إنضم إلينا</h2>
              <span className="text-[7px] text-blue-600/30 dark:text-blue-400/30 font-bold uppercase">JOIN ORAX OPS</span>
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

          <div className="flex flex-col items-center justify-center mb-1 animate-in zoom-in duration-700 delay-150 fill-mode-both">
            <div className="relative mb-1 group cursor-pointer">
              <div className="w-12 h-12 bg-card dark:bg-slate-900 rounded-[16px] flex items-center justify-center shadow-lg border border-border dark:border-slate-800 group-hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 bg-blue-600 rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <div className="text-center leading-none">
              <h1 className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-tighter">أوركس بروفيشنال</h1>
              <span className="text-blue-600/60 dark:text-blue-400/60 text-[7px] font-black tracking-[0.3em] uppercase block">ORAX OPS SYSTEM</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-1 animate-in fade-in slide-in-from-bottom duration-700 delay-500 fill-mode-both">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-3 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[7px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Full Name / الاسم</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="اسمك الرباعي"
                            className="border-none p-0 h-4 text-[12px] font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
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
                    <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-3 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[7px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Identity / البريد</span>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="username@orax.system"
                            className="border-none p-0 h-4 text-[12px] font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                            data-testid="input-email"
                          />
                        </FormControl>
                      </div>
                      <Mail className="w-3.5 h-3.5 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-[80px_1fr] gap-1">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-2 justify-between hover:bg-muted/50 transition-colors">
                      <ChevronDown className="w-3 h-3 text-blue-600/30" />
                      <span className="text-[11px] font-black text-foreground" dir="ltr">{selectedCountry.code}</span>
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
                      <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
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
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-3 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[7px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Smartphone / الهاتف</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="7xxxxxxxx"
                              className="border-none p-0 h-4 text-[12px] font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                              data-testid="input-phone"
                            />
                          </FormControl>
                        </div>
                        <Smartphone className="w-3.5 h-3.5 text-blue-600/30 dark:text-blue-400/30 ml-2" />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-1">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-3 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[7px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Security / كلمة المرور</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="border-none p-0 h-4 text-[12px] font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
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
                            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" strokeWidth={2} />
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
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-3 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[7px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Verify / تأكيد</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="border-none p-0 h-4 text-[12px] font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
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
                            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-1">
                <FormField
                  control={form.control}
                  name="birthPlace"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-3 group transition-all focus-within:ring-2 focus-within:ring-blue-600/10">
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-[7px] text-blue-600/50 dark:text-blue-400/50 font-black text-right uppercase tracking-tighter">Location / مكان الميلاد</span>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="المدينة"
                              className="border-none p-0 h-4 text-[12px] font-bold text-foreground text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent shadow-none"
                            />
                          </FormControl>
                        </div>
                        <MapPin className="w-3.5 h-3.5 text-blue-600/30 dark:text-blue-400/30 ml-2" />
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
                            className="w-full bg-card dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-sm h-9 flex items-center px-3 justify-between hover:bg-muted/50 transition-colors"
                            data-testid="button-birth-date"
                          >
                            <Calendar className="w-3.5 h-3.5 text-blue-600/30" />
                            <span className={`text-[11px] font-black ${field.value ? 'text-foreground' : 'text-muted-foreground/30'}`}>
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
                              type="button"
                              className="w-full h-12 bg-blue-600 text-white font-black rounded-xl"
                              onClick={() => {
                                const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                                field.onChange(formattedDate);
                                setIsDateDialogOpen(false);
                              }}
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
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 px-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="w-3.5 h-3.5 rounded-sm border-blue-600/30"
                      />
                    </FormControl>
                    <div className="leading-none mr-2">
                      <FormLabel className="text-[9px] font-bold text-blue-600/60 dark:text-blue-400/60">
                        أوافق على <span className="text-blue-600 hover:underline cursor-pointer">شروط الخدمة</span> و <span className="text-blue-600 hover:underline cursor-pointer">سياسة الخصوصية</span>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-10 bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-300 text-white dark:text-slate-950 text-[14px] font-black rounded-xl shadow-lg transition-all active:scale-[0.98] border-none mt-1"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "إنشاء الحساب"}
              </Button>
            </form>
          </Form>

          <button 
            type="button"
            className="w-full text-center text-[10px] font-bold text-blue-600/60 dark:text-blue-400/60 mt-2"
            onClick={() => navigate('/login')}
          >
            لديك حساب بالفعل؟ <span className="text-blue-600 underline">تسجيل الدخول</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 pb-2 animate-in fade-in duration-1000 delay-700 fill-mode-both">
          <div className="flex items-center gap-4 w-full px-4">
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30 opacity-50"></div>
            <span className="text-[7px] font-black text-blue-600/30 dark:text-blue-400/30 tracking-[0.2em] uppercase">Secure Registration</span>
            <div className="flex-1 h-[1px] bg-blue-100 dark:bg-blue-900/30 opacity-50"></div>
          </div>
          <span className="text-[7px] text-blue-600/20 dark:text-blue-400/20">© 2026 ORAX OPERATIONS MANAGEMENT</span>
        </div>
      </div>
    </div>
  );
}
