import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { usePush } from "@/hooks/usePush";
import { useState, useEffect } from "react";

export function PushTestButton() {
  const { isPushSupported, isPermissionGranted, isInitializing, error, requestPushPermission } = usePush();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (error) {
      setStatus("error");
    }
  }, [error]);

  const handleRequestPermission = async () => {
    setStatus("loading");
    const success = await requestPushPermission();
    setStatus(success ? "success" : "error");
  };

  if (!isPushSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Push غير مدعوم</span>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant={isPermissionGranted ? "default" : "outline"}
      onClick={handleRequestPermission}
      disabled={isInitializing || status === "loading"}
      className="gap-2"
      data-testid="button-push-notifications"
    >
      <Bell className="h-4 w-4" />
      <span>
        {isInitializing || status === "loading"
          ? "جاري..."
          : isPermissionGranted
            ? "✓ مفعل"
            : "تفعيل الإشعارات"}
      </span>
    </Button>
  );
}
