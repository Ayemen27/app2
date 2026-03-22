import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  X,
  AlertTriangle,
  Loader2,
  ArrowDownToLine,
  Sparkles,
} from "lucide-react";

type UpdateState = "idle" | "preparing" | "downloading" | "retrying" | "copied" | "failed";

export interface UpdateDialogInfo {
  updateAvailable: boolean;
  forceUpdate: boolean;
  latest: {
    versionName: string;
    versionCode: number;
    downloadUrl: string | null;
    releasedAt?: string;
    releaseNotes?: string;
  };
  current: {
    versionName: string;
    versionCode: number;
  };
}

interface AppUpdateDialogProps {
  info: UpdateDialogInfo;
  onDismiss: () => void;
  onUpdateNow: (url: string) => Promise<{ success: boolean; method?: string; error?: string }>;
  onCopyLink: (url: string) => void;
}

export function AppUpdateDialog({ info, onDismiss, onUpdateNow, onCopyLink }: AppUpdateDialogProps) {
  const [state, setState] = useState<UpdateState>("idle");
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isForced = info.forceUpdate === true;
  const downloadUrl = info.latest.downloadUrl;

  const stopProgress = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgress();
  }, [stopProgress]);

  const startFakeProgress = useCallback(() => {
    stopProgress();
    setProgress(0);
    let current = 0;
    progressInterval.current = setInterval(() => {
      current += Math.random() * 8 + 2;
      if (current >= 85) {
        current = 85;
        stopProgress();
      }
      setProgress(Math.min(current, 85));
    }, 300);
  }, [stopProgress]);

  const handleUpdate = useCallback(async () => {
    if (!downloadUrl) return;
    setState("preparing");
    setProgress(0);

    await new Promise((r) => setTimeout(r, 400));
    setState("downloading");
    startFakeProgress();

    const result = await onUpdateNow(downloadUrl);

    stopProgress();

    if (result.success) {
      setProgress(100);
      setState("idle");
    } else {
      setState("failed");
    }
  }, [downloadUrl, onUpdateNow, startFakeProgress, stopProgress]);

  const handleRetry = useCallback(async () => {
    setState("retrying");
    setProgress(0);

    await new Promise((r) => setTimeout(r, 600));
    setState("downloading");
    startFakeProgress();

    if (!downloadUrl) {
      stopProgress();
      setState("failed");
      return;
    }

    const result = await onUpdateNow(downloadUrl);
    stopProgress();

    if (result.success) {
      setProgress(100);
      setState("idle");
    } else {
      setState("failed");
    }
  }, [downloadUrl, onUpdateNow, startFakeProgress, stopProgress]);

  const handleCopy = useCallback(() => {
    if (!downloadUrl) return;
    onCopyLink(downloadUrl);
    setState("copied");
    setTimeout(() => {
      if (state === "copied") setState("idle");
    }, 3000);
  }, [downloadUrl, onCopyLink, state]);

  const isProcessing = state === "preparing" || state === "downloading" || state === "retrying";

  const stateLabel: Record<UpdateState, string> = {
    idle: "",
    preparing: "جاري التجهيز...",
    downloading: "جاري التحميل...",
    retrying: "إعادة المحاولة...",
    copied: "تم نسخ الرابط",
    failed: "فشل التحميل",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      data-testid="update-dialog-overlay"
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border animate-in zoom-in-95 fade-in duration-300"
        dir="rtl"
        data-testid="update-dialog"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isForced
                    ? "bg-red-500/10 dark:bg-red-500/20"
                    : "bg-blue-500/10 dark:bg-blue-500/20"
                }`}
              >
                {isForced ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <ArrowDownToLine className="w-6 h-6 text-blue-500" />
                )}
              </div>
              <div>
                <h3
                  className={`text-base font-bold ${
                    isForced ? "text-red-600 dark:text-red-400" : "text-foreground"
                  }`}
                  data-testid="text-update-title"
                >
                  {isForced ? "تحديث إجباري مطلوب" : "تحديث جديد متاح"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-version-info">
                  v{info.current.versionName} &larr; v{info.latest.versionName}
                </p>
              </div>
            </div>

            {!isForced && !isProcessing && (
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                data-testid="button-dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isForced && (
            <p className="text-xs text-red-500 dark:text-red-400 font-medium" data-testid="text-force-warning">
              لا يمكن استخدام التطبيق بالإصدار الحالي v{info.current.versionName}
            </p>
          )}

          {info.latest.releaseNotes && (
            <div
              className="bg-muted/50 rounded-xl p-3 text-right max-h-[160px] overflow-y-auto"
              data-testid="release-notes"
            >
              <p className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5 justify-end">
                <span>ما الجديد</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </p>
              <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {info.latest.releaseNotes}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2" data-testid="progress-section">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground" data-testid="text-progress-label">
                  {stateLabel[state]}
                </span>
                <span className="text-xs font-mono text-muted-foreground" data-testid="text-progress-percent">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}

          {state === "failed" && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400"
              data-testid="text-error-message"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">فشل التحميل — جرّب نسخ الرابط وفتحه في المتصفح</span>
            </div>
          )}

          {state === "copied" && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400"
              data-testid="text-copied-message"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">تم نسخ رابط التحميل — الصقه في المتصفح</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {!downloadUrl && (
              <p className="text-xs text-amber-500 font-medium text-center" data-testid="text-no-download">
                رابط التحميل غير متوفر حالياً — أعد المحاولة لاحقاً
              </p>
            )}

            {downloadUrl && state !== "failed" && (
              <Button
                onClick={handleUpdate}
                disabled={isProcessing}
                className="w-full"
                data-testid="button-update-now"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isProcessing ? stateLabel[state] : "تحديث الآن"}</span>
              </Button>
            )}

            {downloadUrl && state === "failed" && (
              <Button
                onClick={handleRetry}
                className="w-full"
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </Button>
            )}

            {downloadUrl && (
              <Button
                variant="outline"
                onClick={handleCopy}
                disabled={isProcessing}
                className="w-full"
                data-testid="button-copy-link"
              >
                {state === "copied" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{state === "copied" ? "تم النسخ" : "نسخ رابط التحميل"}</span>
              </Button>
            )}

            {!isForced && !isProcessing && (
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="w-full"
                data-testid="button-update-later"
              >
                <span>لاحقاً</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
