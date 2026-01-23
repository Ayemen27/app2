import { useEffect, useState } from "react";
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Server
} from "lucide-react";
import { useLocation } from "wouter";
import { initializeDB } from "@/offline/db";
import { loadFullBackup } from "@/offline/sync";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepStatus = 'pending' | 'loading' | 'success' | 'error';

interface Step {
  id: string;
  title: string;
  status: StepStatus;
  message?: string;
}

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [steps, setSteps] = useState<Step[]>([
    { id: 'db', title: 'تهيئة قاعدة البيانات', status: 'pending' },
    { id: 'sync', title: 'مزامنة البيانات', status: 'pending' },
    { id: 'ready', title: 'جاهز للعمل', status: 'pending' }
  ]);

  const updateStep = (id: string, updates: Partial<Step>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  useEffect(() => {
    const check = async () => {
      const setup = localStorage.getItem("setup_complete") === "true";
      const emergency = localStorage.getItem("emergency_mode") === "true";
      
      if (setup || emergency) {
        setLocation("/login");
        return;
      }
      
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error();
      } catch {
        // السيرفر غير متاح - تشغيل وضع الطوارئ
        localStorage.setItem("emergency_mode", "true");
        setLocation("/login");
        return;
      }
      
      setCheckingStatus(false);
    };
    
    check();
  }, [setLocation]);

  useEffect(() => {
    if (checkingStatus) return;
    
    const run = async () => {
      try {
        // الخطوة 1: قاعدة البيانات
        updateStep('db', { status: 'loading' });
        await initializeDB();
        updateStep('db', { status: 'success', message: 'تم بنجاح' });
        
        // الخطوة 2: المزامنة
        updateStep('sync', { status: 'loading' });
        try {
          await loadFullBackup();
          updateStep('sync', { status: 'success', message: 'تم بنجاح' });
        } catch (e) {
          updateStep('sync', { status: 'success', message: 'لا توجد بيانات سابقة' });
        }
        
        // الخطوة 3: جاهز
        updateStep('ready', { status: 'success', message: 'النظام جاهز' });
        localStorage.setItem("setup_complete", "true");
        
        setTimeout(() => setLocation("/login"), 1000);
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء الإعداد");
      }
    };
    
    run();
  }, [checkingStatus, setLocation]);

  const getIcon = (step: Step) => {
    if (step.status === 'loading') return <Loader2 className="w-5 h-5 animate-spin" />;
    if (step.status === 'success') return <CheckCircle2 className="w-5 h-5" />;
    if (step.status === 'error') return <AlertCircle className="w-5 h-5" />;
    
    switch (step.id) {
      case 'db': return <Database className="w-5 h-5" />;
      case 'sync': return <RefreshCw className="w-5 h-5" />;
      default: return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  const completedSteps = steps.filter(s => s.status === 'success').length;
  const progress = (completedSteps / steps.length) * 100;

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-12">
        {/* Header */}
        <div className="text-center space-y-3 mb-12">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            إعداد النظام
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            جاري تجهيز النظام للاستخدام
          </p>
        </div>

        {/* Error State */}
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              حدث خطأ
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {error}
            </p>
            <Button onClick={() => window.location.reload()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : (
          <>
            {/* Steps */}
            <div className="flex-1 space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  data-testid={`setup-step-${step.id}`}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                    step.status === 'success'
                      ? "border-primary/20 bg-primary/5"
                      : step.status === 'loading'
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                  )}
                >
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                    step.status === 'success'
                      ? "bg-primary text-primary-foreground"
                      : step.status === 'loading'
                        ? "bg-primary/20 text-primary"
                        : step.status === 'error'
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                  )}>
                    {getIcon(step)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "font-medium text-sm",
                      step.status === 'success' ? "text-primary" : "text-foreground"
                    )}>
                      {step.title}
                    </span>
                    {step.message && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.message}
                      </p>
                    )}
                  </div>
                  
                  {/* Step Number */}
                  <span className="text-xs text-muted-foreground">
                    {idx + 1}/{steps.length}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer Message */}
            <p className="text-center text-xs text-muted-foreground mt-8">
              {completedSteps === steps.length 
                ? "اكتمل الإعداد - جاري التحويل..."
                : "الرجاء الانتظار..."
              }
            </p>
          </>
        )}
      </div>
    </div>
  );
}
