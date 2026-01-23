import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database, RefreshCw, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { name: "تهيئة قاعدة البيانات المحلية", icon: Database },
    { name: "استعادة البيانات من النسخة الاحتياطية", icon: RefreshCw },
    { name: "جاهز للعمل", icon: CheckCircle2 }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) {
          if (step < steps.length - 1) {
            setStep(step + 1);
            return 0;
          } else {
            clearInterval(timer);
            localStorage.setItem("setup_complete", "true");
            setTimeout(() => setLocation("/login"), 1000);
            return 100;
          }
        }
        return Math.min(oldProgress + 5, 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [step, setLocation]);

  const CurrentIcon = steps[step].icon;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">إعداد النظام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 py-8">
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
        </CardContent>
      </Card>
    </div>
  );
}
