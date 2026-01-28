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
  User,
  Mail,
  Search,
  X,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";

const countries = [
  { name: "اليمن", code: "+967", flag: "https://flagcdn.com/w20/ye.png" },
  { name: "أفغانستان", code: "+93", flag: "https://flagcdn.com/w20/af.png" },
  { name: "جزر أولاند", code: "+358", flag: "https://flagcdn.com/w20/ax.png" },
  { name: "ألبانيا", code: "+355", flag: "https://flagcdn.com/w20/al.png" },
  { name: "الجزائر", code: "+213", flag: "https://flagcdn.com/w20/dz.png" },
  { name: "ساموا الأمريكية", code: "+1", flag: "https://flagcdn.com/w20/as.png" },
  { name: "أندورا", code: "+376", flag: "https://flagcdn.com/w20/ad.png" },
  { name: "أنغولا", code: "+244", flag: "https://flagcdn.com/w20/ao.png" },
  { name: "أنغويلا", code: "+1", flag: "https://flagcdn.com/w20/ai.png" },
  { name: "أنتيغوا وبربودا", code: "+1", flag: "https://flagcdn.com/w20/ag.png" },
  { name: "الأرجنتين", code: "+54", flag: "https://flagcdn.com/w20/ar.png" },
  { name: "أرمينيا", code: "+374", flag: "https://flagcdn.com/w20/am.png" },
  { name: "أروبا", code: "+297", flag: "https://flagcdn.com/w20/aw.png" },
  { name: "جزيرة أسنسيون", code: "+247", flag: "https://flagcdn.com/w20/sh.png" },
  { name: "النمسا", code: "+61", flag: "https://flagcdn.com/w20/at.png" },
  { name: "أستراليا", code: "+43", flag: "https://flagcdn.com/w20/au.png" },
  { name: "أذربيجان", code: "+994", flag: "https://flagcdn.com/w20/az.png" },
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
  const [isGenderDialogOpen, setIsGenderDialogOpen] = useState(false);
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
    onSuccess: () => {
      toast({
        title: "تم إنشاء الحساب",
        description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
      });
      navigate("/login");
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
            <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="اسمك الرباعي"
                          className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent"
                          data-testid="input-fullname"
                        />
                      </FormControl>
                    </div>
                    {form.formState.errors.fullName && (
                      <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                        {form.formState.errors.fullName.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          placeholder="البريد الإلكتروني"
                          className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <Mail className="w-5 h-5 text-[#006699] mr-2" />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-[100px_1fr] gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-2 justify-between hover:bg-gray-50 transition-colors">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-gray-800" dir="ltr">{selectedCountry.code}</span>
                      <img src={selectedCountry.flag} alt={selectedCountry.name} className="w-5 h-auto rounded-sm" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[400px] w-[95%] p-0 rounded-t-3xl sm:rounded-3xl border-none shadow-2xl overflow-hidden" dir="rtl">
                    <div className="bg-white p-4">
                      <div className="relative mb-4">
                        <Input
                          placeholder="بحث"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-12 bg-gray-50 border-none rounded-xl text-right pr-10 pl-4 text-sm font-bold focus-visible:ring-0"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {filteredCountries.map((country) => (
                          <button
                            key={country.name + country.code}
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsDialogOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors mb-1"
                          >
                            <img src={country.flag} alt={country.name} className="w-6 h-auto rounded-sm shadow-sm" />
                            <span className="text-sm font-bold text-gray-800 flex-1 text-right px-4" dir="ltr">{country.code}</span>
                            <span className="text-sm font-bold text-gray-600 min-w-[100px] text-left">{country.name}</span>
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
                    <FormItem className="space-y-1">
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="أدخل رقم الهاتف"
                            className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent"
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <Smartphone className="w-5 h-5 text-[#006699] mr-2" />
                      </div>
                      {form.formState.errors.phone && (
                        <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex flex-row-reverse items-center px-4 overflow-visible gap-2">
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="flex items-center justify-center transition-colors"
                          data-testid="button-toggle-password"
                        >
                          <EyeOff className={`w-4 h-4 ${showPassword ? 'hidden' : 'text-[#006699]'}`} />
                          <Eye className={`w-4 h-4 ${showPassword ? 'text-red-500' : 'hidden'}`} />
                        </button>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                            placeholder="كلمة المرور"
                            className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent flex-1"
                            showValidation={false}
                            hidePasswordToggle={true}
                            data-testid="input-password"
                          />
                        </FormControl>
                      </div>
                      {form.formState.errors.password && (
                        <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                          {form.formState.errors.password.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex flex-row-reverse items-center px-4 overflow-visible gap-2">
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="flex items-center justify-center transition-colors"
                          data-testid="button-toggle-confirm-password"
                        >
                          <EyeOff className={`w-4 h-4 ${showConfirmPassword ? 'hidden' : 'text-[#006699]'}`} />
                          <Eye className={`w-4 h-4 ${showConfirmPassword ? 'text-red-500' : 'hidden'}`} />
                        </button>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="تأكيد الكلمة"
                            className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent flex-1"
                            showValidation={false}
                            hidePasswordToggle={true}
                            data-testid="input-confirm-password"
                          />
                        </FormControl>
                      </div>
                      {form.formState.errors.confirmPassword && (
                        <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                          {form.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="birthPlace"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4">
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="مكان الميلاد"
                            className="border-none p-0 h-full text-sm font-bold text-gray-800 text-right focus-visible:ring-0 placeholder:text-gray-300 bg-transparent"
                          />
                        </FormControl>
                      </div>
                      {form.formState.errors.birthPlace && (
                        <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                          {form.formState.errors.birthPlace.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
                        <DialogTrigger asChild>
                          <button 
                            type="button" 
                            className="w-full bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4 justify-between hover:bg-gray-50 transition-colors"
                            data-testid="button-birth-date"
                          >
                            <Calendar className="w-4 h-4 text-[#006699]" />
                            <span className={`text-sm font-bold ${field.value ? 'text-gray-800' : 'text-gray-300'}`}>
                              {field.value || "تاريخ الميلاد"}
                            </span>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[350px] w-[95%] p-0 rounded-3xl border-none shadow-2xl overflow-hidden" dir="rtl">
                          <div className="bg-white p-4">
                            <DialogHeader className="pb-4 border-b border-gray-100">
                              <DialogTitle className="text-center text-lg font-bold text-gray-800">تاريخ الميلاد</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-3 gap-2 py-6">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 mb-2">السنة</span>
                                <div className="h-40 overflow-y-auto custom-scrollbar w-full">
                                  {Array.from({ length: 80 }, (_, i) => 2025 - i).map((year) => (
                                    <button
                                      key={year}
                                      type="button"
                                      onClick={() => setSelectedYear(year)}
                                      className={`w-full py-2 text-center font-bold transition-colors ${selectedYear === year ? 'bg-[#006699] text-white rounded-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                      {year}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 mb-2">الشهر</span>
                                <div className="h-40 overflow-y-auto custom-scrollbar w-full">
                                  {["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"].map((month, idx) => (
                                    <button
                                      key={month}
                                      type="button"
                                      onClick={() => setSelectedMonth(idx + 1)}
                                      className={`w-full py-2 text-center font-bold text-sm transition-colors ${selectedMonth === idx + 1 ? 'bg-[#006699] text-white rounded-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                      {month}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 mb-2">اليوم</span>
                                <div className="h-40 overflow-y-auto custom-scrollbar w-full">
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => setSelectedDay(day)}
                                      className={`w-full py-2 text-center font-bold transition-colors ${selectedDay === day ? 'bg-[#006699] text-white rounded-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                      {day}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                                field.onChange(formattedDate);
                                setIsDateDialogOpen(false);
                              }}
                              className="w-full h-12 bg-[#006699] hover:bg-[#005580] text-white text-base font-bold rounded-xl"
                              data-testid="button-confirm-date"
                            >
                              تأكيد
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {form.formState.errors.birthDate && (
                        <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                          {form.formState.errors.birthDate.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <Dialog open={isGenderDialogOpen} onOpenChange={setIsGenderDialogOpen}>
                      <DialogTrigger asChild>
                        <button type="button" className="w-full bg-white rounded-xl border border-gray-100 shadow-sm h-12 flex items-center px-4 justify-between hover:bg-gray-50 transition-colors">
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                               <span className="text-[8px] text-gray-400">الجنس</span>
                               <span className="text-sm font-bold text-gray-800">{field.value}</span>
                            </div>
                            <User className="w-5 h-5 text-[#006699]" />
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[300px] w-[90%] p-2 rounded-2xl border-none shadow-2xl" dir="rtl">
                        <div className="flex flex-col gap-1">
                          {["ذكر", "أنثى"].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                field.onChange(g);
                                setIsGenderDialogOpen(false);
                              }}
                              className={`w-full p-4 text-right font-bold rounded-xl transition-colors ${field.value === g ? 'bg-[#EBF5FF] text-[#006699]' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    {form.formState.errors.gender && (
                      <p className="text-[10px] font-bold text-[#C8102E] text-right px-1">
                        {form.formState.errors.gender.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex flex-col items-center py-2">
                <div className="flex items-center justify-center gap-2">
                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="rounded-sm border-gray-300" 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <label htmlFor="terms" className="text-[11px] font-bold text-gray-600">
                    أوافق على <span className="text-[#006699] underline">الشروط والأحكام</span>
                  </label>
                </div>
                {form.formState.errors.terms && (
                  <p className="text-[10px] font-bold text-[#C8102E] mt-1">
                    {form.formState.errors.terms.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#006699] hover:bg-[#005580] text-white text-lg font-bold rounded-xl shadow-md border-none transition-all active:scale-95"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "إنشاء حساب"}
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold text-gray-600"
                  data-testid="link-login"
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
