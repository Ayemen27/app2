import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, QrCode, MessageSquare, AlertCircle, RefreshCw, Smartphone, Key, ShieldCheck, Zap, History, BarChart3, Settings2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { formatDate } from "@/lib/utils";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export default function WhatsAppSetupPage() {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "close">("idle");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  const { data: botStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/whatsapp-ai/status"],
    refetchInterval: (query) => {
      const data = query.state.data as any;
      return (data?.status === "connecting" || (!data?.qr && !data?.pairingCode)) ? 2000 : 5000;
    },
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["/api/sync-audit/logs", { module: "whatsapp" }],
    enabled: true
  });

  // Fetch real stats from database/API
  const { data: realStats } = useQuery({
    queryKey: ["/api/whatsapp-ai/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/whatsapp-ai/stats");
      return res;
    }
  });

  useEffect(() => {
    if (botStatus) {
      setStatus(botStatus.status);
      setQrCode(botStatus.qr || null);
      setPairingCode(botStatus.pairingCode || null);
      
      if (botStatus.status === "open") {
        setPhoneNumber("");
      }
    }
  }, [botStatus]);

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    try {
      // Basic country detection from input
      const phone = parsePhoneNumberFromString(value.startsWith('+') ? value : `+${value}`);
      if (phone && phone.country) {
        setCountryCode(phone.country);
      } else {
        setCountryCode("");
      }
    } catch (e) {
      setCountryCode("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: "تم نسخ الكود إلى الحافظة",
    });
  };

  const handleRestart = async (phone?: string) => {
    try {
      setIsRequestingCode(!!phone);
      await apiRequest("POST", "/api/whatsapp-ai/restart", { phoneNumber: phone });
      toast({
        title: phone ? "جاري طلب كود الربط" : "جاري إعادة التشغيل",
        description: phone ? "يتم الآن إنشاء كود الربط لرقم الهاتف..." : "يتم الآن إعادة تشغيل بوت الواتساب...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/status"] });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تنفيذ العملية",
        variant: "destructive",
      });
    } finally {
      setIsRequestingCode(false);
    }
  };

  const stats = [
    { title: "حالة الاتصال", value: status === "open" ? "متصل" : "غير متصل", icon: Zap, color: status === "open" ? "green" : "red" },
    { title: "الرسائل المعالجة", value: realStats?.totalMessages?.toString() || "0", icon: MessageSquare, color: "blue" },
    { title: "آخر مزامنة", value: realStats?.lastSync ? formatDate(realStats.lastSync) : "لا يوجد", icon: RefreshCw, color: "purple" },
    { title: "دقة التحليل", value: realStats?.accuracy || "0%", icon: ShieldCheck, color: "teal" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dynamic Header Action Button */}
      <div id="header-action-portal" className="hidden">
        <Button 
          size="sm"
          className="gap-2 bg-primary text-white hover:bg-primary/90"
          onClick={() => {/* logic */}}
        >
          <Plus className="h-4 w-4" />
          إضافة جديد
        </Button>
      </div>

      <style>{`
        #header-action-portal { display: none; }
        .layout-header #header-custom-button { display: flex; }
      `}</style>
      
      <UnifiedStats stats={stats} columns={4} hideHeader />

      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="connection" className="rounded-lg flex gap-2">
            <Settings2 className="h-4 w-4" /> الربط
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg flex gap-2">
            <History className="h-4 w-4" /> السجل
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-lg flex gap-2">
            <BarChart3 className="h-4 w-4" /> إحصائيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Card */}
              <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
                <div className="h-1 bg-blue-500 w-full" />
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-blue-500" /> مسح الرمز
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
                  {status === "open" ? (
                    <div className="text-center space-y-3">
                      <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full inline-block">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                      </div>
                      <p className="font-bold text-green-600">الجهاز متصل بنجاح</p>
                    </div>
                  ) : qrCode ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`} 
                      alt="WhatsApp QR"
                      className="w-48 h-48"
                    />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center">
                      <Loader2 className="h-10 w-10 animate-spin mb-2" />
                      <p className="text-sm">جاري إنشاء الرمز...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Phone Card */}
              <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
                <div className="h-1 bg-indigo-500 w-full" />
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-indigo-500" /> ربط رقم الهاتف
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">رقم الهاتف الدولي</label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          placeholder="9665XXXXXXXX" 
                          value={phoneNumber} 
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          disabled={status === "open"}
                          className="rounded-xl font-mono pl-10"
                        />
                        {countryCode && (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <img 
                              src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
                              alt={countryCode}
                              className="w-5 h-auto rounded-sm"
                            />
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleRestart(phoneNumber)} 
                        disabled={!phoneNumber || status === "open"}
                        data-restart-trigger
                      >
                        {isRequestingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "طلب كود"}
                      </Button>
                    </div>
                  </div>
                  {pairingCode && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed text-center">
                      <p className="text-[10px] font-black text-indigo-600 mb-2">كود الاقتران</p>
                      <div className="text-2xl font-mono font-bold tracking-widest cursor-pointer" onClick={() => copyToClipboard(pairingCode)}>
                        {pairingCode}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-md bg-slate-50 dark:bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" /> خطوات الربط
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p>1. افتح واتساب على هاتفك</p>
                  <p>2. اذهب للإعدادات {">"} الأجهزة المرتبطة</p>
                  <p>3. اختر "ربط جهاز جديد"</p>
                  <p>4. امسح الرمز أو ادخل كود الهاتف</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border-none shadow-md bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-blue-500" /> سجل العمليات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>العملية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.length > 0 ? syncLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="font-bold">{log.action}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status === 'success' ? 'ناجح' : 'فشل'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{log.description}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-400">لا توجد سجلات حالياً</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-md bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-lg">إحصائيات الرسائل</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>سيتم عرض الرسوم البيانية هنا قريباً</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-lg">توزيع العمليات</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>تحليل البيانات قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
