import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, QrCode, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function WhatsAppSetupPage() {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "close">("idle");

  const { data: botStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/whatsapp-ai/status"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (botStatus) {
      setStatus(botStatus.status);
      if (botStatus.qr) {
        setQrCode(botStatus.qr);
      } else {
        setQrCode(null);
      }
    }
  }, [botStatus]);

  const handleRestart = async () => {
    try {
      await apiRequest("POST", "/api/whatsapp-ai/restart");
      toast({
        title: "جاري إعادة التشغيل",
        description: "يتم الآن إعادة تشغيل بوت الواتساب...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/status"] });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إعادة تشغيل البوت",
        variant: "destructive",
      });
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
          onClick={handleRestart}
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
              رمز الربط (QR Code)
            </CardTitle>
            <CardDescription>
              امسح الكود باستخدام تطبيق الواتساب (الأجهزة المرتبطة)
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
                {/* هنا سيتم عرض الـ QR الفعلي المرسل من السيرفر */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
                <p className="mt-4 text-xs text-center text-slate-400 font-mono">{qrCode.substring(0, 20)}...</p>
              </div>
            ) : status === "connecting" ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <p className="text-slate-500">جاري إنشاء رمز الربط...</p>
              </div>
            ) : (
              <div className="text-center space-y-4 text-slate-400">
                <AlertCircle className="h-16 w-16 mx-auto opacity-20" />
                <p>لا يوجد كود نشط حالياً</p>
                <Button variant="link" onClick={handleRestart}>اضغط لطلب كود جديد</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              حالة الخدمة والمعلومات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <span className="text-sm font-medium">الحالة الحالية:</span>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  status === "open" ? "bg-green-500 animate-pulse" : 
                  status === "connecting" ? "bg-yellow-500 animate-bounce" : 
                  "bg-red-500"
                }`} />
                <span className="font-bold">
                  {status === "open" ? "نشط" : status === "connecting" ? "جاري الاتصال" : "متوقف"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">طريقة الاستخدام:</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                <li>افتح واتساب على هاتفك</li>
                <li>انتقل إلى الإعدادات {">"} الأجهزة المرتبطة</li>
                <li>اضغط على "ربط جهاز" وامسح الكود المجاور</li>
                <li>بعد الربط، يمكنك إرسال المصاريف من الرقم المرخص</li>
              </ul>
            </div>

            <div className="p-4 border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 italic">مثال للرسائل المفهومة:</h4>
              <code className="text-xs block bg-white dark:bg-black p-2 rounded border">
                5000 مصاريف عبدالله عادل
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
