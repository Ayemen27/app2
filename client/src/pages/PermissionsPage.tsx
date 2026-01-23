import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Bell, 
  Shield, 
  Wifi, 
  HardDrive,
  Check,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useLocation } from "wouter";
import { requestAllPermissions } from "@/services/capacitorPush";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { initializeDB } from "@/offline/db";

interface Permission {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
}

export default function PermissionsPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'storage',
      icon: Database,
      title: 'التخزين المحلي',
      description: 'حفظ البيانات على جهازك',
      required: true,
      granted: false
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'الإشعارات',
      description: 'تنبيهات فورية',
      required: true,
      granted: false
    },
    {
      id: 'network',
      icon: Wifi,
      title: 'الاتصال',
      description: 'مزامنة البيانات',
      required: true,
      granted: false
    },
    {
      id: 'background',
      icon: HardDrive,
      title: 'الخلفية',
      description: 'مزامنة تلقائية',
      required: false,
      granted: false
    }
  ]);

  useEffect(() => {
    const check = async () => {
      const granted = localStorage.getItem("permissions_granted") === "true";
      const setup = localStorage.getItem("setup_complete") === "true";
      
      if (granted) {
        setLocation(setup ? "/login" : "/setup");
        return;
      }
      
      // فحص حقيقي للصلاحيات
      const updated = [...permissions];
      
      try {
        await initializeDB();
        updated[0].granted = true;
      } catch (e) {
        updated[0].granted = false;
      }
      
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
        updated[2].granted = res.ok;
      } catch {
        updated[2].granted = navigator.onLine;
      }
      
      if (!Capacitor.isNativePlatform()) {
        if ('Notification' in window) {
          updated[1].granted = Notification.permission === 'granted';
        }
        updated[3].granted = true;
      }
      
      setPermissions(updated);
      setCheckingStatus(false);
    };
    
    check();
  }, [setLocation]);

  const handleRequest = async () => {
    setLoading(true);
    const updated = [...permissions];
    
    for (let i = 0; i < permissions.length; i++) {
      setCurrentStep(i);
      
      if (i === 0) {
        try {
          await initializeDB();
          updated[0].granted = true;
        } catch {}
      } else if (i === 1) {
        if (Capacitor.isNativePlatform()) {
          try {
            await requestAllPermissions();
            updated[1].granted = true;
          } catch {}
        } else if ('Notification' in window && Notification.permission !== 'granted') {
          const result = await Notification.requestPermission();
          updated[1].granted = result === 'granted';
        } else {
          updated[1].granted = true;
        }
      } else if (i === 2) {
        try {
          const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
          updated[2].granted = res.ok;
        } catch {
          updated[2].granted = navigator.onLine;
        }
      } else {
        updated[3].granted = true;
      }
      
      setPermissions([...updated]);
    }
    
    setCurrentStep(-1);
    setLoading(false);
    
    if (updated.filter(p => p.required).every(p => p.granted)) {
      localStorage.setItem("permissions_granted", "true");
      localStorage.setItem("permissions_timestamp", new Date().toISOString());
      setLocation("/setup");
    }
  };

  const allRequired = permissions.filter(p => p.required).every(p => p.granted);
  const progress = (permissions.filter(p => p.granted).length / permissions.length) * 100;

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
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            الصلاحيات المطلوبة
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            يحتاج التطبيق إلى بعض الصلاحيات للعمل بشكل صحيح
          </p>
        </div>

        {/* Permissions List */}
        <div className="flex-1 space-y-3">
          {permissions.map((perm, idx) => {
            const Icon = perm.icon;
            const isActive = loading && currentStep === idx;
            
            return (
              <div
                key={perm.id}
                data-testid={`permission-${perm.id}`}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
                  perm.granted 
                    ? "border-primary/20 bg-primary/5"
                    : isActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                  perm.granted 
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}>
                  {perm.granted ? (
                    <Check className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium text-sm",
                      perm.granted ? "text-primary" : "text-foreground"
                    )}>
                      {perm.title}
                    </span>
                    {perm.required && !perm.granted && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        مطلوب
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {perm.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button
            data-testid="btn-grant"
            className="w-full h-12 text-base font-medium"
            onClick={allRequired ? () => setLocation("/setup") : handleRequest}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري التفعيل
              </>
            ) : allRequired ? (
              <>
                متابعة
                <ArrowLeft className="w-4 h-4 mr-2" />
              </>
            ) : (
              "تفعيل الصلاحيات"
            )}
          </Button>
          
          {!allRequired && (
            <Button
              data-testid="btn-skip"
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => {
                localStorage.setItem("permissions_granted", "true");
                setLocation("/setup");
              }}
              disabled={loading}
            >
              تخطي
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          بياناتك محمية ولن يتم مشاركتها مع أي طرف خارجي
        </p>
      </div>
    </div>
  );
}
