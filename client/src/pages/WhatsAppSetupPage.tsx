import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, QrCode, MessageSquare, AlertCircle, RefreshCw, Smartphone, Key, ShieldCheck, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function WhatsAppSetupPage() {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "close">("idle");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  const { data: botStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/whatsapp-ai/status"],
    refetchInterval: (query) => {
      const data = query.state.data as any;
      return (data?.status === "connecting" || (!data?.qr && !data?.pairingCode)) ? 2000 : 5000;
    },
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

  return (
    <div className="container mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
      {/* Header Section - Title removed from content as requested */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">حالة الربط الذكي</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${status === 'open' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {status === "open" ? "الخدمة متصلة وتعمل بكفاءة" : "الخدمة بانتظار الربط"}
              </p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => handleRestart()}
          className="flex gap-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-2"
          disabled={status === "connecting"}
        >
          <RefreshCw className={`h-4 w-4 ${status === "connecting" ? "animate-spin" : ""}`} />
          إعادة تشغيل المحرك
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Connection Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Connection Card */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden group">
              <div className="h-1 bg-blue-500 w-full" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="h-5 w-5 text-blue-500" />
                  مسح رمز الاستجابة
                </CardTitle>
                <CardDescription>الربط السريع عبر كاميرا الهاتف</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[320px] p-8">
                {status === "open" ? (
                  <div className="text-center space-y-4 animate-in zoom-in duration-300">
                    <div className="bg-green-50 dark:bg-green-900/20 p-8 rounded-full inline-block relative">
                      <CheckCircle2 className="h-20 w-20 text-green-500" />
                      <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 rounded-full p-2 shadow-sm border">
                        <ShieldCheck className="h-6 w-6 text-blue-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">تم الربط بنجاح</h3>
                      <p className="text-sm text-slate-500 mt-1">حسابك الآن مرتبط بالنظام الذكي</p>
                    </div>
                  </div>
                ) : qrCode ? (
                  <div className="relative p-6 bg-white rounded-2xl shadow-inner border-4 border-slate-50 group-hover:border-blue-50 transition-colors">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`} 
                      alt="WhatsApp QR Code"
                      className="w-56 h-56 mx-auto"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/10 backdrop-blur-[1px] transition-opacity pointer-events-none" />
                  </div>
                ) : status === "connecting" && !pairingCode ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <Loader2 className="h-16 w-16 animate-spin text-blue-500 opacity-20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-blue-500 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-slate-500 font-medium">جاري تأمين قناة الاتصال...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4 text-slate-300">
                    <QrCode className="h-20 w-20 mx-auto opacity-10" />
                    <p className="text-sm font-medium">اختر طريقة الربط للبدء</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phone Number Card */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
              <div className="h-1 bg-indigo-500 w-full" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5 text-indigo-500" />
                  الربط برقم الهاتف
                </CardTitle>
                <CardDescription>مناسب عند عدم توفر كاميرا</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">رقم الهاتف الدولي</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="9665XXXXXXXX" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={status === "open" || status === "connecting"}
                      className="rounded-xl border-2 focus-visible:ring-indigo-500 font-mono text-lg py-6"
                    />
                    <Button 
                      onClick={() => handleRestart(phoneNumber)}
                      disabled={!phoneNumber || status === "open" || isRequestingCode}
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6 py-6 shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                    >
                      {isRequestingCode ? <Loader2 className="h-5 w-5 animate-spin" /> : "طلب كود"}
                    </Button>
                  </div>
                </div>

                {pairingCode && (
                  <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 text-center relative group animate-in slide-in-from-bottom-4 duration-500">
                    <p className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-4 font-black flex items-center justify-center gap-2">
                      <Key className="h-4 w-4" /> كود الاقتران النشط
                    </p>
                    <div 
                      className="text-4xl font-black tracking-[0.2em] text-indigo-900 dark:text-white font-mono cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => copyToClipboard(pairingCode)}
                    >
                      {pairingCode.split('').map((char, i) => (
                        <span key={i} className={i === 4 ? "mx-2 opacity-30" : ""}>{char}</span>
                      ))}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-4 text-xs text-slate-500 hover:text-indigo-600"
                      onClick={() => copyToClipboard(pairingCode)}
                    >
                      اضغط للنسخ السريع
                    </Button>
                  </div>
                )}
                
                {status === "open" && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/10 border-2 border-green-100 dark:border-green-800/30 rounded-xl flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">الجهاز متصل حالياً</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions Sidebar */}
        <div className="space-y-6">
          <Card className="border-none shadow-md bg-slate-50 dark:bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                خطوات الربط الاحترافي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  "افتح تطبيق واتساب على هاتفك",
                  "انقر على القائمة أو الإعدادات",
                  "اختر الأجهزة المرتبطة",
                  "انقر على ربط جهاز جديد",
                  "وجه الكاميرا للرمز أو اختر الربط بالرقم"
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm group">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border flex items-center justify-center font-bold text-xs group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      {i + 1}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-blue-600 text-white overflow-hidden relative">
            <Zap className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 rotate-12" />
            <CardHeader>
              <CardTitle className="text-md font-bold">المساعد الذكي نشط</CardTitle>
              <CardDescription className="text-blue-100">بمجرد الربط، يمكنك إرسال:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 font-mono text-xs">
                "5000 مصاريف توريد أسمنت لموقع النرجس"
              </div>
              <p className="mt-4 text-[10px] text-blue-100 opacity-70">
                سيقوم النظام بتحليل الرسالة وإضافتها للمصاريف آلياً
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
