import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Database, 
  Bell, 
  Shield, 
  Wifi, 
  HardDrive,
  CheckCircle2,
  ChevronRight,
  Smartphone,
  Globe,
  Lock
} from "lucide-react";
import { useLocation } from "wouter";
import { requestAllPermissions } from "@/services/capacitorPush";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface Permission {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
}

export default function PermissionsPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [platform, setPlatform] = useState<'web' | 'android' | 'ios'>('web');
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'storage',
      icon: <Database className="w-6 h-6" />,
      title: 'التخزين المحلي',
      description: 'لإنشاء قاعدة البيانات المحلية وحفظ البيانات',
      required: true,
      granted: false
    },
    {
      id: 'notifications',
      icon: <Bell className="w-6 h-6" />,
      title: 'الإشعارات',
      description: 'للتنبيهات الفورية والمهام العاجلة',
      required: true,
      granted: false
    },
    {
      id: 'network',
      icon: <Wifi className="w-6 h-6" />,
      title: 'الشبكة',
      description: 'للمزامنة مع السيرفر المركزي',
      required: true,
      granted: false
    },
    {
      id: 'background',
      icon: <HardDrive className="w-6 h-6" />,
      title: 'العمل في الخلفية',
      description: 'للمزامنة التلقائية والنسخ الاحتياطي',
      required: false,
      granted: false
    }
  ]);

  useEffect(() => {
    const p = Capacitor.getPlatform();
    setPlatform(p === 'android' ? 'android' : p === 'ios' ? 'ios' : 'web');
    
    if (p === 'web') {
      setPermissions(prev => prev.map(perm => ({
        ...perm,
        granted: perm.id === 'storage' || perm.id === 'network'
      })));
    }
  }, []);

  const requestPermissions = async () => {
    setLoading(true);
    
    try {
      for (let i = 0; i < permissions.length; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 600));
        
        if (Capacitor.isNativePlatform()) {
          await requestAllPermissions();
        }
        
        setPermissions(prev => prev.map((p, idx) => 
          idx <= i ? { ...p, granted: true } : p
        ));
      }
      
      localStorage.setItem("permissions_granted", "true");
      localStorage.setItem("permissions_timestamp", new Date().toISOString());
      
      await new Promise(r => setTimeout(r, 500));
      setLocation("/setup");
    } catch (err) {
      console.error('❌ [Permissions] فشل طلب الصلاحيات:', err);
    } finally {
      setLoading(false);
    }
  };

  const skipPermissions = () => {
    localStorage.setItem("permissions_granted", "true");
    setLocation("/setup");
  };

  const allGranted = permissions.filter(p => p.required).every(p => p.granted);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden">
        <div className="w-full max-w-lg flex flex-col max-h-full overflow-hidden">
          {/* Header Section - Fixed */}
          <div className="text-center mb-3 sm:mb-4 flex-shrink-0">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 mb-3 shadow-lg shadow-primary/30">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
              إعداد الصلاحيات
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              نحتاج بعض الصلاحيات لضمان عمل التطبيق بشكل مثالي
            </p>
          </div>

          {/* Platform Badge - Fixed */}
          <div className="flex items-center justify-center gap-2 mb-3 flex-shrink-0">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              platform === 'android' 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : platform === 'ios'
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            )}>
              {platform === 'android' && <Smartphone className="w-3.5 h-3.5" />}
              {platform === 'ios' && <Smartphone className="w-3.5 h-3.5" />}
              {platform === 'web' && <Globe className="w-3.5 h-3.5" />}
              {platform === 'android' ? 'أندرويد' : platform === 'ios' ? 'iOS' : 'متصفح ويب'}
            </span>
          </div>

          {/* Main Card - Scrollable Content */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <CardContent className="p-3 sm:p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Permissions List - Scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 sm:space-y-2.5 pb-2">
                {permissions.map((permission, index) => (
                  <div
                    key={permission.id}
                    data-testid={`permission-item-${permission.id}`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                      permission.granted
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                        : loading && currentStep === index
                          ? "bg-primary/5 border border-primary/30 animate-pulse"
                          : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg transition-colors flex-shrink-0",
                      permission.granted
                        ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    )}>
                      {permission.granted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span className="[&>svg]:w-5 [&>svg]:h-5">{permission.icon}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm">
                          {permission.title}
                        </h3>
                        {permission.required && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            مطلوب
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {permission.description}
                      </p>
                    </div>

                    {permission.granted && (
                      <div className="text-green-500 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions - Fixed at bottom */}
              <div className="mt-3 space-y-2 flex-shrink-0">
                <Button
                  data-testid="button-grant-permissions"
                  className="w-full h-11 sm:h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  onClick={requestPermissions}
                  disabled={loading || allGranted}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري منح الصلاحيات...
                    </span>
                  ) : allGranted ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      تم منح جميع الصلاحيات
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      منح الصلاحيات المطلوبة
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                {platform === 'web' && (
                  <Button
                    data-testid="button-skip-permissions"
                    variant="ghost"
                    className="w-full h-9 text-sm text-muted-foreground"
                    onClick={skipPermissions}
                  >
                    تخطي (للمتصفح فقط)
                  </Button>
                )}
              </div>

              {/* Privacy Notice - Compact */}
              <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-medium text-blue-900 dark:text-blue-100">خصوصيتك محمية</span> - بياناتك مشفرة ومحفوظة محلياً
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step Indicators - Fixed */}
          <div className="mt-3 flex justify-center gap-1.5 flex-shrink-0">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  step === 0 
                    ? "bg-primary w-5" 
                    : "bg-slate-300 dark:bg-slate-600 w-1.5"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
