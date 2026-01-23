import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { initializeDB } from "@/offline/db";
import { loadFullBackup } from "@/offline/sync";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { name: "تهيئة قاعدة البيانات المحلية", icon: Database },
    { name: "استعادة البيانات من النسخة الاحتياطية", icon: RefreshCw },
    { name: "جاهز للعمل", icon: CheckCircle2 }
  ];

  useEffect(() => {
    const runSetup = async () => {
      try {
        setError(null);
        // الخطوة 1: تهيئة قاعدة البيانات
        setStep(0);
        setProgress(20);
        await initializeDB();
        setProgress(100);
        await new Promise(r => setTimeout(r, 500));

        // الخطوة 2: استعادة البيانات
        setStep(1);
        setProgress(20);
        try {
          // محاولة استعادة البيانات من قوقل درايف أو النسخة الاحتياطية الأخيرة
          await loadFullBackup();
        } catch (e) {
          console.warn("⚠️ [Setup] فشل استعادة النسخة الاحتياطية، قد تكون أول مرة:", e);
        }
        setProgress(100);
        await new Promise(r => setTimeout(r, 500));

        // الخطوة 3: النهاية
        setStep(2);
        setProgress(100);
        localStorage.setItem("setup_complete", "true");
        setTimeout(() => setLocation("/login"), 1000);
      } catch (err: any) {
        console.error("❌ [Setup] فشل الإعداد:", err);
        setError(err.message || "حدث خطأ غير متوقع أثناء إعداد النظام");
      }
    };

    runSetup();
  }, [setLocation]);

  const CurrentIcon = steps[step].icon;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">إعداد النظام الاحترافي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 py-8">
          {error ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-destructive/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">إعادة المحاولة</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full animate-pulse">
                  <CurrentIcon className="w-12 h-12 text-primary" />
                </div>
                <p className="text-xl font-medium text-center">{steps[step].name}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>تقدم العملية</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-2">
                {steps.map((s, idx) => (
                  <div key={idx} className={`flex items-center gap-2 text-sm ${idx <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    <div className={`w-2 h-2 rounded-full ${idx < step ? "bg-primary" : idx === step ? "bg-primary animate-ping" : "bg-muted"}`} />
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
