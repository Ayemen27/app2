import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Info, RefreshCw } from "lucide-react";

// المعايير العالمية: نسخة التطبيق الحالية
const CURRENT_VERSION = "2.1.0"; 

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [serverVersion, setServerVersion] = useState(CURRENT_VERSION);

  useEffect(() => {
    // التحقق من وجود تحديث كل 5 دقائق
    const checkUpdate = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch("/api/system/version", {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        const data = await response.json();
        
        if (data.success && data.version !== CURRENT_VERSION) {
          setServerVersion(data.version);
          setShowUpdate(true);
        }
      } catch (e) {
        console.error("Failed to check for updates");
      }
    };

    checkUpdate();
    const interval = setInterval(checkUpdate, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    // توجيه المستخدم لتحميل النسخة الجديدة
    window.location.href = "/AXION_FINAL_BUILD.apk";
  };

  return (
    <Dialog open={showUpdate} onOpenChange={setShowUpdate}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-md">
        <DialogHeader className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <RefreshCw className="h-6 w-6 animate-spin-slow" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">تحديث جديد متاح!</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            يتوفر إصدار جديد من AXION ({serverVersion}). يتضمن التحديث تحسينات أمنية وإصلاحات للأخطاء البرمجية لضمان استقرار المزامنة.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-3">
          <div className="rounded-lg bg-secondary/50 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <Info className="h-4 w-4 text-primary" />
              <span>ما الجديد في هذا الإصدار:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-secondary-foreground/80">
              <li>إصلاح مشكلة "transaction is not a function" على الأندرويد.</li>
              <li>تحسين سرعة معالجة البيانات المالية.</li>
              <li>دعم المزامنة التلقائية عند العودة للإنترنت.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowUpdate(false)}
            className="w-full sm:flex-1"
          >
            ليس الآن
          </Button>
          <Button 
            onClick={handleUpdate}
            className="w-full sm:flex-1 bg-primary hover:bg-primary/90"
          >
            <Download className="ml-2 h-4 w-4" />
            تحديث الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
