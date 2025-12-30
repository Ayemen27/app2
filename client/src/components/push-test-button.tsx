import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";
import { usePush } from "@/hooks/usePush";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function PushTestButton() {
  const { isPushSupported, isPermissionGranted, isInitializing, error, requestPushPermission } = usePush();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (error) {
      setStatus("error");
    }
  }, [error]);

  useEffect(() => {
    // إظهار النافذة المنبثقة إذا كانت الإشعارات غير مفعلة ولم يتم رفض الطلب مؤخراً
    if (!isInitializing && isPushSupported && !isPermissionGranted) {
      const timer = setTimeout(() => setShowPopup(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInitializing, isPushSupported, isPermissionGranted]);

  const handleRequestPermission = async () => {
    setStatus("loading");
    const success = await requestPushPermission();
    setStatus(success ? "success" : "error");
    if (success) {
      setTimeout(() => setShowPopup(false), 1500);
    }
  };

  if (!isPushSupported || isPermissionGranted || !showPopup) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[200] animate-in fade-in slide-in-from-bottom-5">
      <Card className="border-primary/20 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        <div className="bg-primary/10 p-2 flex justify-between items-center border-b border-primary/10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary">تفعيل التنبيهات</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 p-0 hover:bg-primary/20" 
            onClick={() => setShowPopup(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            قم بتفعيل الإشعارات لتصلك تنبيهات فورية عن العمليات والحوالات الجديدة في مشاريعك.
          </p>
          <Button
            size="sm"
            className="w-full gap-2 text-xs h-8"
            onClick={handleRequestPermission}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Bell className="h-3 w-3" />
            )}
            تفعيل الإشعارات الآن
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
