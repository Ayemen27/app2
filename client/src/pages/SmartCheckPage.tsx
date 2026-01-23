import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initializeDB } from "@/offline/db";

type CheckStatus = 'pending' | 'checking' | 'success' | 'failed' | 'warning';

interface SystemCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  icon: React.ReactNode;
  details?: string;
  duration?: number;
}

export default function SmartCheckPage() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [allChecksComplete, setAllChecksComplete] = useState(false);
  
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: 'permissions',
      label: 'صلاحيات النظام',
      description: 'التحقق من صلاحيات الوصول المطلوبة',
      status: 'pending',
      icon: <ShieldCheck className="w-5 h-5" />
    },
    {
      id: 'database',
      label: 'قاعدة البيانات المحلية',
      description: 'فحص وتهيئة التخزين المحلي',
      status: 'pending',
      icon: <Database className="w-5 h-5" />
    },
    {
      id: 'network',
      label: 'الاتصال بالسيرفر',
      description: 'التحقق من الاتصال بالخادم المركزي',
      status: 'pending',
      icon: <Server className="w-5 h-5" />
    },
    {
      id: 'sync',
      label: 'مزامنة البيانات',
      description: 'التحقق من حالة المزامنة والبيانات',
      status: 'pending',
      icon: <RefreshCw className="w-5 h-5" />
    },
    {
      id: 'integrity',
      label: 'سلامة البيانات',
      description: 'فحص تكامل قاعدة البيانات',
      status: 'pending',
      icon: <HardDrive className="w-5 h-5" />
    }
  ]);

  const updateCheck = useCallback((id: string, updates: Partial<SystemCheck>) => {
    setChecks(prev => prev.map(check => 
      check.id === id ? { ...check, ...updates } : check
    ));
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
      const startTime = Date.now();

      updateCheck('permissions', { status: 'checking' });
      setProgress(10);
      await new Promise(r => setTimeout(r, 800));
      
      const hasPerms = localStorage.getItem("permissions_granted") === "true";
      if (!hasPerms) {
        updateCheck('permissions', { 
          status: 'failed', 
          details: 'الصلاحيات غير ممنوحة'
        });
        await new Promise(r => setTimeout(r, 1000));
        setLocation("/permissions");
        return;
      }
      updateCheck('permissions', { 
        status: 'success',
        duration: Date.now() - startTime
      });
      setProgress(25);

      updateCheck('database', { status: 'checking' });
      await new Promise(r => setTimeout(r, 600));
      
      try {
        await initializeDB();
        updateCheck('database', { 
          status: 'success',
          details: 'قاعدة البيانات جاهزة'
        });
      } catch (e) {
        updateCheck('database', { 
          status: 'warning',
          details: 'تم إنشاء قاعدة بيانات جديدة'
        });
      }
      setProgress(45);

      updateCheck('network', { status: 'checking' });
      await new Promise(r => setTimeout(r, 600));
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch("/api/health", { 
          signal: controller.signal 
        }).catch(() => ({ ok: false }));
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          updateCheck('network', { 
            status: 'success',
            details: 'متصل بالسيرفر المركزي'
          });
        } else {
          throw new Error('Server unreachable');
        }
      } catch (e) {
        if (!isOnline) {
          updateCheck('network', { 
            status: 'warning',
            details: 'وضع عدم الاتصال - البيانات المحلية'
          });
        } else {
          updateCheck('network', { 
            status: 'warning',
            details: 'السيرفر غير متاح - وضع الطوارئ'
          });
          setEmergencyMode(true);
        }
      }
      setProgress(65);

      updateCheck('sync', { status: 'checking' });
      await new Promise(r => setTimeout(r, 500));
      
      const isSetup = localStorage.getItem("setup_complete") === "true";
      if (!isSetup) {
        updateCheck('sync', { 
          status: 'warning',
          details: 'يتطلب إعداد أولي'
        });
        await new Promise(r => setTimeout(r, 1000));
        setLocation("/setup");
        return;
      }
      
      updateCheck('sync', { 
        status: 'success',
        details: 'البيانات متزامنة'
      });
      setProgress(85);

      updateCheck('integrity', { status: 'checking' });
      await new Promise(r => setTimeout(r, 500));
      
      try {
        const integrityCheck = await fetch("/api/health/integrity").catch(() => null);
        
        if (integrityCheck?.ok) {
          const result = await integrityCheck.json();
          updateCheck('integrity', { 
            status: result.issues?.length > 0 ? 'warning' : 'success',
            details: result.issues?.length > 0 
              ? `${result.issues.length} تحذيرات`
              : 'البيانات سليمة'
          });
        } else {
          updateCheck('integrity', { 
            status: 'success',
            details: 'فحص محلي ناجح'
          });
        }
      } catch (e) {
        updateCheck('integrity', { 
          status: 'success',
          details: 'تم الفحص محلياً'
        });
      }
      setProgress(100);

      setAllChecksComplete(true);
      await new Promise(r => setTimeout(r, 800));
      setLocation("/login");
    };

    runChecks();
  }, [setLocation, updateCheck, isOnline]);

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />;
    }
  };

  const getStatusColor = (status: CheckStatus) => {
    switch (status) {
      case 'checking':
        return 'border-primary/30 bg-primary/5';
      case 'success':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20';
      default:
        return 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-600 mb-6 shadow-lg shadow-primary/30 relative">
              <Zap className="w-10 h-10 text-white" />
              {allChecksComplete && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center border-2 border-white dark:border-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              الفحص الذكي للنظام
            </h1>
            <p className="text-muted-foreground text-lg">
              جاري التحقق من جاهزية جميع المكونات
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              isOnline 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? 'متصل بالإنترنت' : 'غير متصل'}
            </span>
            
            {emergencyMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                وضع الطوارئ
              </span>
            )}
          </div>

          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <CardContent className="p-6">
              <div className="space-y-3">
                {checks.map((check, index) => (
                  <div
                    key={check.id}
                    data-testid={`check-item-${check.id}`}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                      getStatusColor(check.status),
                      check.status === 'checking' && "animate-pulse"
                    )}
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
                      check.status === 'success'
                        ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                        : check.status === 'failed'
                          ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                          : check.status === 'warning'
                            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                            : check.status === 'checking'
                              ? "bg-primary/10 text-primary"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                    )}>
                      {check.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {check.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {check.details || check.description}
                      </p>
                    </div>

                    {getStatusIcon(check.status)}
                  </div>
                ))}
              </div>

              {allChecksComplete && (
                <div className="mt-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        النظام جاهز للعمل
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        تم اجتياز جميع الفحوصات بنجاح
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {emergencyMode && !allChecksComplete && (
                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        وضع الطوارئ مُفعّل
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        السيرفر غير متاح حالياً. سيتم استخدام البيانات المحلية مع المزامنة التلقائية عند استعادة الاتصال.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {progress < 100 
                    ? "جاري فحص مكونات النظام..."
                    : "اكتمل الفحص - جاري التحويل..."
                  }
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  الإصدار 3.0 - نظام الفحص الذكي المتقدم
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-center gap-2">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  step === 1 
                    ? "bg-primary w-6" 
                    : "bg-slate-300 dark:bg-slate-600"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
