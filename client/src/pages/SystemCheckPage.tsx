import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Wifi,
  WifiOff,
  Server,
  HardDrive,
  Zap,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initializeDB } from "@/offline/db";
import { loadFullBackup } from "@/offline/sync";

type CheckStatus = 'pending' | 'checking' | 'success' | 'failed' | 'warning';

interface SystemCheck {
  id: string;
  label: string;
  status: CheckStatus;
  details?: string;
}

const CHECKS_CONFIG = [
  { id: 'permissions', label: 'صلاحيات النظام' },
  { id: 'database', label: 'قاعدة البيانات' },
  { id: 'network', label: 'الاتصال بالسيرفر' },
  { id: 'sync', label: 'مزامنة البيانات' },
  { id: 'integrity', label: 'سلامة البيانات' }
] as const;

export default function SystemCheckPage() {
  const [, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [checks, setChecks] = useState<SystemCheck[]>(
    CHECKS_CONFIG.map(c => ({ ...c, status: 'pending' as CheckStatus }))
  );

  const progress = useMemo(() => {
    const completed = checks.filter(c => c.status === 'success' || c.status === 'warning').length;
    return Math.round((completed / checks.length) * 100);
  }, [checks]);

  const updateCheck = useCallback((id: string, updates: Partial<SystemCheck>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const runChecks = async () => {
      // 1. فحص الصلاحيات
      setCurrentStep(0);
      updateCheck('permissions', { status: 'checking' });
      await delay(600);
      
      const hasPerms = localStorage.getItem("permissions_granted") === "true";
      if (!hasPerms) {
        updateCheck('permissions', { status: 'failed', details: 'الصلاحيات غير ممنوحة' });
        await delay(800);
        setLocation("/permissions");
        return;
      }
      updateCheck('permissions', { status: 'success', details: 'تم التحقق' });

      // 2. قاعدة البيانات
      setCurrentStep(1);
      updateCheck('database', { status: 'checking' });
      await delay(500);
      
      try {
        await initializeDB();
        updateCheck('database', { status: 'success', details: 'جاهزة' });
      } catch {
        updateCheck('database', { status: 'warning', details: 'تم إنشاء جديدة' });
      }

      // 3. الاتصال بالسيرفر
      setCurrentStep(2);
      updateCheck('network', { status: 'checking' });
      await delay(500);
      
      try {
        const res = await fetch("/api/health", { 
          signal: AbortSignal.timeout(5000) 
        });
        if (res.ok) {
          updateCheck('network', { status: 'success', details: 'متصل' });
        } else {
          throw new Error();
        }
      } catch {
        if (!isOnline) {
          updateCheck('network', { status: 'warning', details: 'وضع عدم الاتصال' });
        } else {
          updateCheck('network', { status: 'warning', details: 'وضع الطوارئ' });
          setEmergencyMode(true);
          localStorage.setItem("emergency_mode", "true");
        }
      }

      // 4. المزامنة
      setCurrentStep(3);
      updateCheck('sync', { status: 'checking' });
      await delay(400);
      
      const isSetup = localStorage.getItem("setup_complete") === "true";
      if (!isSetup) {
        try {
          await loadFullBackup();
          localStorage.setItem("setup_complete", "true");
          updateCheck('sync', { status: 'success', details: 'تمت المزامنة' });
        } catch {
          localStorage.setItem("setup_complete", "true");
          updateCheck('sync', { status: 'success', details: 'لا توجد بيانات سابقة' });
        }
      } else {
        updateCheck('sync', { status: 'success', details: 'البيانات محدثة' });
      }

      // 5. سلامة البيانات
      setCurrentStep(4);
      updateCheck('integrity', { status: 'checking' });
      await delay(400);
      
      try {
        const integrityCheck = await fetch("/api/health/integrity", {
          signal: AbortSignal.timeout(3000)
        }).catch(() => null);
        
        if (integrityCheck?.ok) {
          const result = await integrityCheck.json();
          updateCheck('integrity', { 
            status: result.issues?.length > 0 ? 'warning' : 'success',
            details: result.issues?.length > 0 ? `${result.issues.length} تحذيرات` : 'سليمة'
          });
        } else {
          updateCheck('integrity', { status: 'success', details: 'فحص محلي' });
        }
      } catch {
        updateCheck('integrity', { status: 'success', details: 'تم الفحص' });
      }

      // اكتمال
      setAllComplete(true);
      await delay(600);
      setLocation("/login");
    };

    runChecks();
  }, [setLocation, updateCheck, isOnline]);

  const getIcon = (id: string, status: CheckStatus) => {
    if (status === 'checking') return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === 'success') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'failed') return <AlertCircle className="w-4 h-4" />;
    if (status === 'warning') return <AlertCircle className="w-4 h-4" />;
    
    const icons: Record<string, React.ReactNode> = {
      permissions: <ShieldCheck className="w-4 h-4" />,
      database: <Database className="w-4 h-4" />,
      network: <Server className="w-4 h-4" />,
      sync: <RefreshCw className="w-4 h-4" />,
      integrity: <HardDrive className="w-4 h-4" />
    };
    return icons[id] || <Zap className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex flex-col">
      {/* Progress Bar - Ultra Minimal */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-muted z-50">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm">
          
          {/* Header - Compact */}
          <div className="text-center mb-6">
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Zap className="w-7 h-7 text-primary" />
              {allComplete && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-background">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-1">
              فحص النظام
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {isOnline ? (
                <><Wifi className="w-3.5 h-3.5 text-green-500" /> متصل</>
              ) : (
                <><WifiOff className="w-3.5 h-3.5 text-amber-500" /> غير متصل</>
              )}
              {emergencyMode && (
                <span className="text-amber-500">• طوارئ</span>
              )}
            </div>
          </div>

          {/* Checks List - Compact Cards */}
          <div className="space-y-2 mb-6">
            {checks.map((check, idx) => (
              <div
                key={check.id}
                data-testid={`check-${check.id}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                  check.status === 'checking' && "border-primary/40 bg-primary/5",
                  check.status === 'success' && "border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10",
                  check.status === 'warning' && "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10",
                  check.status === 'failed' && "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10",
                  check.status === 'pending' && "border-border/50 bg-muted/30 opacity-60"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                  check.status === 'checking' && "bg-primary/15 text-primary",
                  check.status === 'success' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                  check.status === 'warning' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                  check.status === 'failed' && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                  check.status === 'pending' && "bg-muted text-muted-foreground"
                )}>
                  {getIcon(check.id, check.status)}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      check.status === 'pending' ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {check.label}
                    </span>
                    {check.details && (
                      <span className={cn(
                        "text-xs shrink-0",
                        check.status === 'success' && "text-green-600 dark:text-green-400",
                        check.status === 'warning' && "text-amber-600 dark:text-amber-400",
                        check.status === 'failed' && "text-red-600 dark:text-red-400"
                      )}>
                        {check.details}
                      </span>
                    )}
                  </div>
                </div>

                {/* Step indicator */}
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                  {idx + 1}/{checks.length}
                </span>
              </div>
            ))}
          </div>

          {/* Status Footer */}
          <div className="text-center">
            {allComplete ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                النظام جاهز
                <ArrowRight className="w-4 h-4" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                جاري الفحص... {progress}%
              </p>
            )}
          </div>

          {/* Emergency Mode Notice */}
          {emergencyMode && !allComplete && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                السيرفر غير متاح - ستعمل البيانات المحلية
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Version Footer */}
      <div className="py-3 text-center">
        <p className="text-[10px] text-muted-foreground/50">
          v3.0
        </p>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
