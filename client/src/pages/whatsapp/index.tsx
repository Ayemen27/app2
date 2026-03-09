import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, CheckCircle2, QrCode, MessageSquare, AlertCircle,
  RefreshCw, Smartphone, ShieldCheck, Zap, History, BarChart3,
  Settings2, Copy, Shield, Clock, WifiOff, Wifi, PhoneCall,
  Lock, Unlock, AlertTriangle, Activity, Timer, Send,
  ChevronDown, ChevronUp, Eye, EyeOff, Power, RotateCcw,
  CheckCircle, XCircle, Info, Gauge, TrendingUp, Users,
  LinkIcon, Unlink, UserCheck, Trash2
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { formatDate } from "@/lib/utils";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { cn } from "@/lib/utils";

const ANTI_BAN_TIPS = [
  { icon: Clock, title: "تأخير الردود", desc: "يتم إضافة تأخير عشوائي 2-5 ثوانٍ قبل كل رد لمحاكاة السلوك البشري", status: "active" },
  { icon: Shield, title: "تنويع المحتوى", desc: "إضافة أحرف غير مرئية لكل رسالة لتجنب اكتشاف التكرار", status: "active" },
  { icon: RefreshCw, title: "تحديث الإصدار", desc: "يتم جلب أحدث إصدار WhatsApp Web تلقائياً عند كل اتصال", status: "active" },
  { icon: Activity, title: "إعادة الاتصال الذكي", desc: "عند انقطاع الاتصال يُعاد تلقائياً مع تأخير متزايد (Exponential Backoff)", status: "active" },
  { icon: Users, title: "تصفية المستخدمين", desc: "فقط الأرقام المصرح لها يمكنها التفاعل مع البوت", status: "active" },
  { icon: Lock, title: "محاكاة المتصفح", desc: "يتم تقديم الاتصال كمتصفح Chrome حقيقي وليس كبوت", status: "active" },
];

const CONNECTION_STEPS = [
  { step: 1, title: "افتح واتساب", desc: "افتح تطبيق واتساب على هاتفك المحمول", icon: Smartphone },
  { step: 2, title: "الإعدادات", desc: "اذهب إلى الإعدادات ← الأجهزة المرتبطة", icon: Settings2 },
  { step: 3, title: "ربط جهاز", desc: "اضغط على \"ربط جهاز جديد\"", icon: Zap },
  { step: 4, title: "المسح أو الكود", desc: "امسح رمز QR أو أدخل كود الربط المعروض", icon: QrCode },
];

type ProtectionLevel = "maximum" | "balanced" | "minimal";

export default function WhatsAppSetupPage() {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "close">("idle");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [linkPhoneNumber, setLinkPhoneNumber] = useState("");
  const [linkCountryCode, setLinkCountryCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [protectionLevel, setProtectionLevel] = useState<ProtectionLevel>("maximum");
  const [activeTab, setActiveTab] = useState("mylink");

  const { data: botStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/whatsapp-ai/status"],
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data?.status === "close" || data?.status === "idle") return 10000;
      if (data?.status === "connecting") return 3000;
      return 5000;
    },
  });

  const { data: myLink, isLoading: isLoadingMyLink } = useQuery({
    queryKey: ["/api/whatsapp-ai/my-link"],
  });

  const { data: allLinks = [], isLoading: isLoadingAllLinks } = useQuery({
    queryKey: ["/api/whatsapp-ai/all-links"],
  });

  const linkPhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      return await apiRequest("/api/whatsapp-ai/link-phone", "POST", { phoneNumber: phone });
    },
    onSuccess: () => {
      toast({ title: "تم الربط", description: "تم ربط رقم الواتساب بحسابك بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/my-link"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
      setLinkPhoneNumber("");
      setLinkCountryCode("");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في ربط الرقم", variant: "destructive" });
    }
  });

  const unlinkPhoneMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/whatsapp-ai/unlink-phone", "POST");
    },
    onSuccess: () => {
      toast({ title: "تم إلغاء الربط", description: "تم إلغاء ربط رقم الواتساب من حسابك" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/my-link"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في إلغاء الربط", variant: "destructive" });
    }
  });

  const adminUnlinkMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/whatsapp-ai/admin-unlink/${userId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "تم", description: "تم إلغاء ربط المستخدم" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
    },
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["/api/sync-audit/logs", { module: "whatsapp" }],
  });

  const { data: realStats } = useQuery({
    queryKey: ["/api/whatsapp-ai/stats"],
    queryFn: async () => {
      const res = await apiRequest("/api/whatsapp-ai/stats", "GET");
      return res;
    }
  });

  useEffect(() => {
    if (botStatus) {
      setStatus(botStatus.status);
      setQrCode(botStatus.qr || null);
      setPairingCode(botStatus.pairingCode || null);
      if (botStatus.status === "open") setPhoneNumber("");
    }
  }, [botStatus]);

  const handlePhoneChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d+]/g, "");
    setPhoneNumber(cleanValue);
    try {
      const phone = parsePhoneNumberFromString(cleanValue.startsWith('+') ? cleanValue : `+${cleanValue}`);
      setCountryCode(phone?.country || "");
    } catch {
      setCountryCode("");
    }
  }, []);

  const handleLinkPhoneChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d+]/g, "");
    setLinkPhoneNumber(cleanValue);
    try {
      const phone = parsePhoneNumberFromString(cleanValue.startsWith('+') ? cleanValue : `+${cleanValue}`);
      setLinkCountryCode(phone?.country || "");
    } catch {
      setLinkCountryCode("");
    }
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ الكود إلى الحافظة" });
  }, [toast]);

  const handleRestart = useCallback(async (phone?: string) => {
    try {
      setIsRequestingCode(!!phone);
      let formattedPhone = phone;
      if (phone) {
        const cleanPhone = phone.replace(/[^\d]/g, "");
        if (cleanPhone.length < 8) throw new Error("رقم الهاتف غير صالح (يجب أن يكون 8 أرقام على الأقل)");
        formattedPhone = cleanPhone;
      }
      await apiRequest("/api/whatsapp-ai/restart", "POST", { phoneNumber: formattedPhone });
      toast({
        title: phone ? "جاري طلب كود الربط" : "جاري إعادة التشغيل",
        description: phone ? `يتم إنشاء كود الربط للرقم ${phone}...` : "يتم إعادة تشغيل بوت الواتساب...",
      });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/status"] }), 1000);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل في تنفيذ العملية", variant: "destructive" });
    } finally {
      setIsRequestingCode(false);
    }
  }, [toast]);

  const isConnected = status === "open";
  const isConnecting = status === "connecting";

  const statusConfig = useMemo(() => ({
    open: { label: "متصل", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: Wifi, pulse: "bg-emerald-500" },
    connecting: { label: "جاري الاتصال...", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: Loader2, pulse: "bg-amber-500" },
    close: { label: "غير متصل", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", icon: WifiOff, pulse: "bg-red-500" },
    idle: { label: "في الانتظار", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900", border: "border-slate-200 dark:border-slate-800", icon: Clock, pulse: "bg-slate-400" },
  }), []);

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const stats = useMemo(() => [
    {
      title: "حالة الاتصال",
      value: currentStatus.label,
      icon: isConnected ? Wifi : WifiOff,
      color: isConnected ? "green" as const : "red" as const,
      status: isConnected ? "normal" as const : "critical" as const
    },
    { title: "الرسائل المعالجة", value: realStats?.totalMessages?.toString() || "0", icon: MessageSquare, color: "blue" as const },
    { title: "مستوى الحماية", value: protectionLevel === "maximum" ? "أقصى" : protectionLevel === "balanced" ? "متوازن" : "أدنى", icon: Shield, color: "purple" as const },
    { title: "دقة التحليل", value: realStats?.accuracy || "0%", icon: TrendingUp, color: "teal" as const },
  ], [status, realStats, protectionLevel, currentStatus, isConnected]);

  const protectionScore = useMemo(() => {
    const scores: Record<ProtectionLevel, number> = { maximum: 95, balanced: 75, minimal: 45 };
    return scores[protectionLevel];
  }, [protectionLevel]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* Connection Status Banner */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-4 transition-all duration-500",
          currentStatus.bg, currentStatus.border
        )}>
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }} />
          </div>
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", isConnected ? "bg-emerald-500" : isConnecting ? "bg-amber-500" : "bg-slate-400")}>
                <SiWhatsapp className="h-7 w-7 text-white" />
                <span className={cn("absolute -top-1 -right-1 flex h-4 w-4")}>
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", currentStatus.pulse)} />
                  <span className={cn("relative inline-flex rounded-full h-4 w-4 border-2 border-white dark:border-slate-900", currentStatus.pulse)} />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={cn("text-lg font-black", currentStatus.color)}>
                    <StatusIcon className={cn("inline h-4 w-4 mr-1", isConnecting && "animate-spin")} />
                    {currentStatus.label}
                  </h2>
                  <Badge variant="outline" className={cn("text-[10px] font-bold", currentStatus.color, currentStatus.border)}>
                    {isConnected ? "مباشر" : "غير نشط"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isConnected ? "الاتصال مستقر — جميع الخدمات تعمل بشكل طبيعي" :
                   isConnecting ? "جاري محاولة الاتصال، يرجى الانتظار..." :
                   "يرجى ربط الجهاز لبدء استقبال الرسائل"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Button
                  data-testid="btn-disconnect"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 font-bold gap-1.5"
                  onClick={() => {
                    if (confirm("هل تريد فصل الاتصال بواتساب؟")) {
                    apiRequest("/api/whatsapp-ai/disconnect", "POST").then(() => {
                      toast({ title: "تم فصل الاتصال", description: "تم فصل واتساب بنجاح" });
                      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/status"] }), 1000);
                    }).catch(() => toast({ title: "خطأ", description: "فشل في فصل الاتصال", variant: "destructive" }));
                  }
                  }}
                >
                  <Power className="h-3.5 w-3.5" /> فصل
                </Button>
              )}
              <Button
                data-testid="btn-restart"
                variant={isConnected ? "outline" : "default"}
                size="sm"
                className={cn("rounded-xl font-bold gap-1.5", !isConnected && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                onClick={() => handleRestart()}
              >
                <RotateCcw className="h-3.5 w-3.5" /> إعادة تشغيل
              </Button>
            </div>
          </div>
        </div>

        <UnifiedStats stats={stats} columns={4} hideHeader />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5 lg:w-[700px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-sm h-12">
            <TabsTrigger data-testid="tab-mylink" value="mylink" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white font-bold text-xs gap-1.5 transition-all">
              <LinkIcon className="h-3.5 w-3.5" /> ربط رقمي
            </TabsTrigger>
            <TabsTrigger data-testid="tab-connection" value="connection" className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white font-bold text-xs gap-1.5 transition-all">
              <QrCode className="h-3.5 w-3.5" /> البوت
            </TabsTrigger>
            <TabsTrigger data-testid="tab-users" value="users" className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white font-bold text-xs gap-1.5 transition-all">
              <Users className="h-3.5 w-3.5" /> المستخدمون
            </TabsTrigger>
            <TabsTrigger data-testid="tab-protection" value="protection" className="rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white font-bold text-xs gap-1.5 transition-all">
              <Shield className="h-3.5 w-3.5" /> الحماية
            </TabsTrigger>
            <TabsTrigger data-testid="tab-stats" value="stats" className="rounded-xl data-[state=active]:bg-teal-500 data-[state=active]:text-white font-bold text-xs gap-1.5 transition-all">
              <BarChart3 className="h-3.5 w-3.5" /> إحصائيات
            </TabsTrigger>
          </TabsList>

          {/* My Link Tab - Per User Phone Registration */}
          <TabsContent value="mylink" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                  <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 font-black">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <LinkIcon className="h-4 w-4 text-emerald-600" />
                      </div>
                      ربط رقم واتساب الخاص بك
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {isLoadingMyLink ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                      </div>
                    ) : (myLink as any)?.linked ? (
                      <div className="space-y-4">
                        <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <UserCheck className="h-7 w-7 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-black text-emerald-700 dark:text-emerald-400 text-lg">رقمك مربوط</p>
                              <p className="text-sm font-mono text-emerald-600 dark:text-emerald-500 mt-0.5" dir="ltr">
                                +{(myLink as any).phoneNumber}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] font-black">
                                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> نشط
                                </Badge>
                                <span className="text-[10px] text-slate-500">
                                  {(myLink as any).totalMessages} رسالة
                                </span>
                                {(myLink as any).lastMessageAt && (
                                  <span className="text-[10px] text-slate-400">
                                    آخر رسالة: {formatDate((myLink as any).lastMessageAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-black text-blue-700 dark:text-blue-400">كيف تستخدم واتساب مع النظام؟</p>
                              <p className="text-[11px] text-blue-600 dark:text-blue-500 mt-1 leading-relaxed">
                                أرسل رسالة لبوت الشركة من هاتفك المربوط. سيتعرف عليك تلقائياً ويعرض مشاريعك فقط.
                                جرّب: "مشاريعي" أو "مساعدة" أو "5000 مصاريف اسم_العامل"
                              </p>
                            </div>
                          </div>
                        </div>

                        <Button
                          data-testid="btn-unlink-phone"
                          variant="outline"
                          className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 font-bold gap-2"
                          onClick={() => {
                            if (confirm("هل تريد إلغاء ربط رقم الواتساب؟")) {
                              unlinkPhoneMutation.mutate();
                            }
                          }}
                          disabled={unlinkPhoneMutation.isPending}
                        >
                          {unlinkPhoneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                          إلغاء ربط الرقم
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-black text-amber-700 dark:text-amber-400">رقمك غير مربوط</p>
                              <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                                اربط رقم واتساب الخاص بك لتتمكن من التفاعل مع بوت الشركة.
                                عند إرسال رسالة للبوت سيتعرف عليك تلقائياً ويعرض مشاريعك فقط.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            رقم واتساب الخاص بك (مع مفتاح الدولة)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                data-testid="input-link-phone"
                                placeholder="967772293228"
                                value={linkPhoneNumber}
                                onChange={(e) => handleLinkPhoneChange(e.target.value)}
                                className="rounded-xl font-mono text-base h-12 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30"
                                dir="ltr"
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                {linkCountryCode ? (
                                  <img
                                    src={`https://flagcdn.com/w40/${linkCountryCode.toLowerCase()}.png`}
                                    alt={linkCountryCode}
                                    className="w-6 h-4 rounded-sm shadow-sm object-cover"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                  />
                                ) : (
                                  <Smartphone className="h-4 w-4 text-slate-400" />
                                )}
                                {linkCountryCode && <span className="text-[10px] font-bold text-slate-400">{linkCountryCode}</span>}
                              </div>
                            </div>
                            <Button
                              data-testid="btn-link-phone"
                              onClick={() => linkPhoneMutation.mutate(linkPhoneNumber)}
                              disabled={!linkPhoneNumber || linkPhoneNumber.length < 8 || linkPhoneMutation.isPending}
                              className="h-12 px-6 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
                            >
                              {linkPhoneMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <LinkIcon className="h-4 w-4" />
                                  <span className="hidden sm:inline">ربط الرقم</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            أدخل رقمك كما يظهر في واتساب — مثال: 967772293228
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 font-black">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Info className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      كيف يعمل النظام؟
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { num: "1", title: "اربط رقمك", desc: "سجّل رقم واتساب الخاص بك هنا", icon: LinkIcon },
                        { num: "2", title: "أرسل رسالة للبوت", desc: "راسل رقم بوت الشركة من واتساب", icon: Send },
                        { num: "3", title: "يتعرف عليك تلقائياً", desc: "البوت يعرف من أنت ويعرض مشاريعك فقط", icon: UserCheck },
                        { num: "4", title: "بياناتك معزولة", desc: "لا يمكنك رؤية مشاريع المستخدمين الآخرين", icon: Shield },
                      ].map((step) => (
                        <div key={step.num} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-blue-600">{step.num}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-700 dark:text-slate-300">{step.title}</p>
                            <p className="text-[10px] text-slate-500">{step.desc}</p>
                          </div>
                          <step.icon className="h-4 w-4 text-slate-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 font-black">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      أوامر واتساب المتاحة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { cmd: "مساعدة", desc: "عرض جميع الأوامر" },
                        { cmd: "مشاريعي", desc: "عرض المشاريع المرتبطة بك" },
                        { cmd: "5000 مصاريف أحمد", desc: "تسجيل مصروف لعامل" },
                        { cmd: "إلغاء", desc: "إلغاء العملية الحالية" },
                      ].map((item) => (
                        <div key={item.cmd} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <code className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.cmd}</code>
                          <span className="text-[10px] text-slate-500">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab - Admin: all linked users */}
          <TabsContent value="users" className="mt-6">
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-purple-400 via-violet-500 to-fuchsia-500" />
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 font-black">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  المستخدمون المربوطون
                  <Badge variant="secondary" className="text-[9px] font-black">{Array.isArray(allLinks) ? allLinks.length : 0} مستخدم</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2">
                        <TableHead className="font-black text-[11px]">المستخدم</TableHead>
                        <TableHead className="font-black text-[11px]">رقم الواتساب</TableHead>
                        <TableHead className="font-black text-[11px]">الحالة</TableHead>
                        <TableHead className="font-black text-[11px]">الرسائل</TableHead>
                        <TableHead className="font-black text-[11px]">آخر رسالة</TableHead>
                        <TableHead className="font-black text-[11px]">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(allLinks) && allLinks.length > 0 ? allLinks.map((link: any) => (
                        <TableRow key={link.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableCell>
                            <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{link.userName || '—'}</p>
                              <p className="text-[10px] text-slate-500">{link.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono" dir="ltr">+{link.phoneNumber}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[9px] font-black gap-1",
                              link.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            )}>
                              {link.isActive ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                              {link.isActive ? 'نشط' : 'معطل'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-bold">{link.totalMessages}</TableCell>
                          <TableCell className="text-xs text-slate-500">{link.lastMessageAt ? formatDate(link.lastMessageAt) : '—'}</TableCell>
                          <TableCell>
                            <Button
                              data-testid={`btn-admin-unlink-${link.user_id}`}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg gap-1"
                              onClick={() => {
                                if (confirm(`هل تريد إلغاء ربط ${link.userName || link.userEmail}؟`)) {
                                  adminUnlinkMutation.mutate(link.user_id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Users className="h-8 w-8 text-slate-300" />
                              </div>
                              <p className="text-sm font-bold text-slate-400">لا يوجد مستخدمون مربوطون</p>
                              <p className="text-xs text-slate-400">يمكن لكل مستخدم ربط رقمه من تبويب "ربط رقمي"</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bot Connection Tab - Admin only */}
          <TabsContent value="connection" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                  <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 font-black">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <QrCode className="h-4 w-4 text-emerald-600" />
                      </div>
                      ربط بوت الشركة
                      <Badge variant="secondary" className="text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-2">
                        مسؤول فقط
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    {isConnected ? (
                      <div className="text-center space-y-4 py-6">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                            <CheckCircle2 className="h-12 w-12 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg">
                            <SiWhatsapp className="h-4 w-4 text-emerald-500" />
                          </div>
                        </div>
                        <div>
                          <p className="font-black text-emerald-600 text-lg">بوت الشركة متصل</p>
                          <p className="text-xs text-slate-500 mt-1">جاهز لاستقبال رسائل المستخدمين</p>
                        </div>
                      </div>
                    ) : qrCode ? (
                      <div className="space-y-4">
                        <div className="relative p-3 bg-white rounded-2xl shadow-inner border-2 border-dashed border-emerald-200 dark:border-emerald-800">
                          <img
                            data-testid="img-qr-code"
                            src={`/api/whatsapp-ai/qr-image`}
                            alt="WhatsApp QR"
                            className="w-56 h-56 rounded-xl"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode || '')}&bgcolor=ffffff&color=1a1a2e`;
                            }}
                          />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white shadow-lg flex items-center justify-center">
                            <SiWhatsapp className="h-6 w-6 text-emerald-500" />
                          </div>
                        </div>
                        <p className="text-center text-xs text-slate-500 font-medium">
                          امسح هذا الرمز بهاتف بوت الشركة
                        </p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3 py-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">جاري إنشاء رمز QR...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                  <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 font-black">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <PhoneCall className="h-4 w-4 text-blue-600" />
                      </div>
                      ربط بكود الاقتران
                      <Badge variant="secondary" className="text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full px-2">
                        بديل عن QR
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        رقم هاتف البوت (مع مفتاح الدولة)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            data-testid="input-phone"
                            placeholder="967772293228"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            disabled={isConnected}
                            className="rounded-xl font-mono text-base h-12 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/30"
                            dir="ltr"
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            {countryCode ? (
                              <img
                                src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                                alt={countryCode}
                                className="w-6 h-4 rounded-sm shadow-sm object-cover"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            ) : (
                              <Smartphone className="h-4 w-4 text-slate-400" />
                            )}
                            {countryCode && <span className="text-[10px] font-bold text-slate-400">{countryCode}</span>}
                          </div>
                        </div>
                        <Button
                          data-testid="btn-request-code"
                          onClick={() => handleRestart(phoneNumber)}
                          disabled={!phoneNumber || phoneNumber.length < 8 || isConnected || isRequestingCode}
                          className="h-12 px-6 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20"
                        >
                          {isRequestingCode ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span className="hidden sm:inline">طلب الكود</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {pairingCode && (
                      <div className="relative p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-center">
                        <div className="absolute top-2 right-3">
                          <Badge className="bg-indigo-600 text-white text-[8px] font-black animate-pulse">
                            ينتهي خلال 60 ثانية
                          </Badge>
                        </div>
                        <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-wider">
                          كود الاقتران
                        </p>
                        <div
                          data-testid="text-pairing-code"
                          className="text-4xl font-mono font-black tracking-[0.4em] text-indigo-700 dark:text-indigo-300 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => copyToClipboard(pairingCode)}
                          title="انقر للنسخ"
                        >
                          {pairingCode.split('').map((char, i) => (
                            <span key={i} className={i === 3 ? "mr-4" : ""}>{char}</span>
                          ))}
                        </div>
                        <Button
                          data-testid="btn-copy-code"
                          variant="ghost"
                          size="sm"
                          className="mt-3 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 font-bold gap-1.5 rounded-xl"
                          onClick={() => copyToClipboard(pairingCode)}
                        >
                          <Copy className="h-3.5 w-3.5" /> نسخ الكود
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 font-black">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Info className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      خطوات ربط بوت الشركة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CONNECTION_STEPS.map((s) => (
                        <div key={s.step} className="relative flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <span className="text-[9px] font-black text-slate-500">{s.step}</span>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center mb-2">
                            <s.icon className="h-5 w-5 text-emerald-600" />
                          </div>
                          <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">{s.title}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Protection Tab */}
          <TabsContent value="protection" className="mt-6 space-y-6">
            {/* Protection Score */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500" />
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    <div className="w-36 h-36 rounded-full border-[6px] border-slate-100 dark:border-slate-800 flex items-center justify-center relative">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 144 144">
                        <circle cx="72" cy="72" r="66" fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800" />
                        <circle cx="72" cy="72" r="66" fill="none" strokeWidth="6"
                          strokeDasharray={`${protectionScore * 4.15} 415`}
                          className={cn(
                            "transition-all duration-1000",
                            protectionScore >= 80 ? "stroke-emerald-500" : protectionScore >= 60 ? "stroke-amber-500" : "stroke-red-500"
                          )}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="text-center z-10">
                        <span className={cn(
                          "text-3xl font-black",
                          protectionScore >= 80 ? "text-emerald-600" : protectionScore >= 60 ? "text-amber-600" : "text-red-600"
                        )}>
                          {protectionScore}%
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">مستوى الأمان</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        نظام الحماية من حظر الرقم
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        يتضمن النظام طبقات حماية متعددة لتقليل مخاطر حظر الرقم من واتساب
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(["maximum", "balanced", "minimal"] as ProtectionLevel[]).map((level) => {
                        const configs: Record<ProtectionLevel, { label: string; color: string; bg: string }> = {
                          maximum: { label: "حماية قصوى", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700" },
                          balanced: { label: "متوازن", color: "text-amber-700", bg: "bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700" },
                          minimal: { label: "أدنى حماية", color: "text-red-700", bg: "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700" },
                        };
                        const c = configs[level];
                        return (
                          <button
                            key={level}
                            data-testid={`btn-protection-${level}`}
                            onClick={() => setProtectionLevel(level)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-black border-2 transition-all",
                              protectionLevel === level ? cn(c.bg, c.color, "ring-2 ring-offset-1", level === "maximum" ? "ring-emerald-400" : level === "balanced" ? "ring-amber-400" : "ring-red-400") : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                            )}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Protection Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ANTI_BAN_TIPS.map((tip, i) => (
                <Card key={i} className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shrink-0">
                        <tip.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">{tip.title}</h4>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[8px] font-black shrink-0">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> مفعّل
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tip.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Advanced Settings */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl">
              <CardHeader className="cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 font-black">
                    <Settings2 className="h-4 w-4 text-slate-500" />
                    إعدادات متقدمة
                  </CardTitle>
                  {showAdvanced ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4 pt-0">
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <Timer className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">تأخير عشوائي للردود</p>
                          <p className="text-[10px] text-slate-500">2-5 ثوانٍ بين كل رسالة</p>
                        </div>
                      </div>
                      <Switch data-testid="switch-random-delay" defaultChecked disabled={protectionLevel === "minimal"} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <EyeOff className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">أحرف غير مرئية</p>
                          <p className="text-[10px] text-slate-500">إضافة أحرف Zero-Width لتنويع المحتوى</p>
                        </div>
                      </div>
                      <Switch data-testid="switch-zero-width" defaultChecked disabled={protectionLevel === "minimal"} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">تحديث الإصدار التلقائي</p>
                          <p className="text-[10px] text-slate-500">جلب أحدث إصدار عند كل اتصال</p>
                        </div>
                      </div>
                      <Switch data-testid="switch-auto-version" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <Gauge className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">حد الرسائل اليومي</p>
                          <p className="text-[10px] text-slate-500">الحد الأقصى: {protectionLevel === "maximum" ? "50" : protectionLevel === "balanced" ? "100" : "500"} رسالة/يوم</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {protectionLevel === "maximum" ? "50" : protectionLevel === "balanced" ? "100" : "500"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400">تنبيه مهم</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                          استخدام واتساب بطريقة آلية يخالف شروط الخدمة ويمكن أن يؤدي لحظر الرقم.
                          مستوى الحماية القصوى يقلل المخاطر لكن لا يمنعها تماماً.
                          يُنصح باستخدام رقم مخصص وليس رقمك الشخصي.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    ملخص النشاط
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-center">
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{realStats?.totalMessages || 0}</p>
                      <p className="text-[10px] font-bold text-blue-500 mt-1">رسالة معالجة</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center">
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{realStats?.accuracy || "0%"}</p>
                      <p className="text-[10px] font-bold text-emerald-500 mt-1">دقة التحليل</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-center">
                      <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
                        {realStats?.lastSync ? "نشط" : "—"}
                      </p>
                      <p className="text-[10px] font-bold text-purple-500 mt-1">آخر نشاط</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-center">
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
                        {protectionScore}%
                      </p>
                      <p className="text-[10px] font-bold text-amber-500 mt-1">نقاط الأمان</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    حالة الحماية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "تأخير الردود", active: protectionLevel !== "minimal", desc: "2-5 ثوانٍ" },
                    { label: "تنويع المحتوى", active: protectionLevel !== "minimal", desc: "Zero-Width" },
                    { label: "تحديث الإصدار", active: true, desc: "تلقائي" },
                    { label: "إعادة الاتصال", active: true, desc: "Backoff" },
                    { label: "تصفية الأرقام", active: true, desc: "مصرح فقط" },
                    { label: "محاكاة المتصفح", active: true, desc: "Chrome 121" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        {item.active ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold",
                        item.active ? "text-emerald-600 border-emerald-200" : "text-red-500 border-red-200"
                      )}>
                        {item.desc}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
