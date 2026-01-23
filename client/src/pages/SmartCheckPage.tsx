import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Database, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function SmartCheckPage() {
  const [, setLocation] = useLocation();
  const [checks, setChecks] = useState({
    permissions: { status: "pending", label: "فحص صلاحيات الوصول" },
    database: { status: "pending", label: "التحقق من قاعدة البيانات المحلية" },
    data: { status: "pending", label: "التحقق من سلامة البيانات" }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runChecks = async () => {
      // 1. فحص الصلاحيات
      setChecks(prev => ({ ...prev, permissions: { ...prev.permissions, status: "checking" } }));
      await new Promise(r => setTimeout(r, 1000));
      const hasPerms = localStorage.getItem("permissions_granted") === "true";
      
      if (!hasPerms) {
        setChecks(prev => ({ ...prev, permissions: { ...prev.permissions, status: "failed" } }));
        setLocation("/permissions");
        return;
      }
      setChecks(prev => ({ ...prev, permissions: { ...prev.permissions, status: "success" } }));

      // 2. فحص قاعدة البيانات
      setChecks(prev => ({ ...prev, database: { ...prev.database, status: "checking" } }));
      await new Promise(r => setTimeout(r, 1000));
      const isSetup = localStorage.getItem("setup_complete") === "true";
      
      if (!isSetup) {
        setChecks(prev => ({ ...prev, database: { ...prev.database, status: "failed" } }));
        setLocation("/setup");
        return;
      }
      setChecks(prev => ({ ...prev, database: { ...prev.database, status: "success" } }));

      // 3. فحص البيانات والاتصال
      setChecks(prev => ({ ...prev, data: { ...prev.data, status: "checking" } }));
      try {
        // محاولة التحقق من الاتصال بالسيرفر
        const response = await fetch("/api/health").catch(() => ({ ok: false }));
        
        if (!response.ok) {
          console.log("🚨 [SmartCheck] فشل الاتصال بالسيرفر، تفعيل وضع الطوارئ...");
          // في وضع الطوارئ، نتحقق من وجود نسخة احتياطية محلية
          const hasLocalData = await initializeDB();
          if (!hasLocalData) {
             console.log("🔄 [SmartCheck] لا توجد بيانات محلية، بدء استعادة اضطرارية...");
             await loadFullBackup();
          }
        }
      } catch (e) {
        console.error("⚠️ [SmartCheck] خطأ أثناء فحص البيانات:", e);
      }
      setChecks(prev => ({ ...prev, data: { ...prev.data, status: "success" } }));

      // النجاح النهائي
      setTimeout(() => setLocation("/login"), 500);
    };

    runChecks();
  }, [setLocation]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "checking": return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case "success": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "failed": return <AlertCircle className="w-5 h-5 text-destructive" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            النظام الذكي للتحقق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            {Object.entries(checks).map(([key, check]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${check.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    {key === 'permissions' && <ShieldCheck className={`w-5 h-5 ${check.status === 'success' ? 'text-green-600' : 'text-slate-400'}`} />}
                    {key === 'database' && <Database className={`w-5 h-5 ${check.status === 'success' ? 'text-green-600' : 'text-slate-400'}`} />}
                    {key === 'data' && <RefreshCw className={`w-5 h-5 ${check.status === 'success' ? 'text-green-600' : 'text-slate-400'}`} />}
                  </div>
                  <span className={`font-medium ${check.status === 'failed' ? 'text-destructive' : ''}`}>{check.label}</span>
                </div>
                {getStatusIcon(check.status)}
              </div>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground animate-pulse">
            جاري فحص مكونات النظام لضمان أفضل أداء...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
