import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, QrCode, MessageSquare, AlertCircle, RefreshCw, Smartphone, Key } from "lucide-react";
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
      
      // إذا كان البوت متصلاً، قم بإفراغ رقم الهاتف والكود
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">ربط الواتساب الذكي</h1>
          <p className="text-slate-500 dark:text-slate-400">إدارة وربط خدمة الواتساب لتلقي المصاريف آلياً</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => handleRestart()}
          className="flex gap-2"
          disabled={status === "connecting"}
        >
          <RefreshCw className={`h-4 w-4 ${status === "connecting" ? "animate-spin" : ""}`} />
          إعادة تشغيل الخدمة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-100 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              طريقة الربط بالكود (QR)
            </CardTitle>
            <CardDescription>
              امسح الكود باستخدام تطبيق الواتساب
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            {status === "open" ? (
              <div className="text-center space-y-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-8 rounded-full">
                  <CheckCircle2 className="h-20 w-20 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700 dark:text-green-400">متصل بنجاح</h3>
                <p className="text-sm text-slate-500">البوت يعمل الآن ويستقبل الرسائل</p>
              </div>
            ) : qrCode ? (
              <div className="p-4 bg-white rounded-xl shadow-inner border">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`} 
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 mx-auto"
                />
              </div>
            ) : status === "connecting" && !pairingCode ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <p className="text-slate-500">جاري إنشاء رمز الربط...</p>
              </div>
            ) : (
              <div className="text-center space-y-4 text-slate-400">
                <AlertCircle className="h-16 w-16 mx-auto opacity-20" />
                <p>استخدم الهاتف للربط البديل أدناه</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-100 dark:border-indigo-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-indigo-600" />
              الربط برقم الهاتف (بدون كاميرا)
            </CardTitle>
            <CardDescription>
              أدخل رقم الهاتف مع رمز الدولة (مثال: 966500000000)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="9665XXXXXXXX" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={status === "open" || status === "connecting"}
              />
              <Button 
                onClick={() => handleRestart(phoneNumber)}
                disabled={!phoneNumber || status === "open" || isRequestingCode}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                طلب كود
              </Button>
            </div>

            {pairingCode && (
              <div className="mt-6 p-6 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl text-center relative group">
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2 font-bold flex items-center justify-center gap-2">
                  <Key className="h-4 w-4" /> كود الربط الخاص بك:
                </p>
                <div 
                  className="text-4xl font-black tracking-[0.5em] text-indigo-900 dark:text-white font-mono cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => copyToClipboard(pairingCode)}
                  title="اضغط للنسخ"
                >
                  {pairingCode}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  افتح واتساب {">"} الأجهزة المرتبطة {">"} ربط جهاز {">"} الربط برقم الهاتف بدلاً من ذلك {">"} أدخل هذا الكود
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(pairingCode)}
                >
                  نسخ
                </Button>
              </div>
            )}

            {status === "open" && (
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">الجهاز مرتبط حالياً</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              معلومات إضافية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h4 className="font-bold text-sm mb-2">طريقة الهاتف (Pairing Code):</h4>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                  <li>أدخل رقم هاتفك في الخانة المخصصة</li>
                  <li>اضغط "طلب كود" وانتظر ظهور الكود</li>
                  <li>في واتساب الهاتف: الأجهزة المرتبطة {">"} ربط جهاز</li>
                  <li>اختر "الربط برقم الهاتف بدلاً من ذلك"</li>
                  <li>أدخل الكود المكون من 8 أرقام</li>
                </ol>
              </div>
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-lg">
                <h4 className="font-bold text-sm mb-2 italic">مثال للرسائل المفهومة:</h4>
                <code className="text-xs block bg-white dark:bg-black p-2 rounded border">
                  5000 مصاريف عبدالله عادل
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
