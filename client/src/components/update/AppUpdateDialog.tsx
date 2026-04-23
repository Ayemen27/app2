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
  PackageCheck,
} from "lucide-react";
import {
  isApkUpdaterAvailable,
  downloadApk,
  installApk,
  cancelDownload,
  type ApkDownloadProgress,
} from "@/services/apkUpdater";

type UpdateState =
  | "idle"
  | "preparing"
  | "downloading"
  | "ready_to_install"
  | "installing"
  | "retrying"
  | "copied"
  | "failed";

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

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 ميغابايت";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} ميغابايت`;
}

export function AppUpdateDialog({ info, onDismiss, onUpdateNow, onCopyLink }: AppUpdateDialogProps) {
  const [state, setState] = useState<UpdateState>("idle");
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [apkPath, setApkPath] = useState<string>("");
  const isForced = info.forceUpdate === true;
  const downloadUrl = info.latest.downloadUrl;
  const nativeReady = isApkUpdaterAvailable();
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      if (state === "downloading") {
        cancelledRef.current = true;
        cancelDownload().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNativeUpdate = useCallback(async () => {
    if (!downloadUrl) return;
    cancelledRef.current = false;
    setErrorMsg("");
    setProgress(0);
    setDownloaded(0);
    setTotal(0);
    setState("preparing");

    try {
      const result = await downloadApk(downloadUrl, {
        onProgress: (p: ApkDownloadProgress) => {
          if (cancelledRef.current) return;
          setState("downloading");
          setProgress(Math.min(99, Math.round(p.percent)));
          setDownloaded(p.downloaded);
          setTotal(p.total);
        },
      });

      if (cancelledRef.current) return;
      setProgress(100);
      setDownloaded(result.size);
      setTotal(result.size);
      setApkPath(result.path);
      setState("ready_to_install");
    } catch (err: any) {
      if (cancelledRef.current) return;
      setErrorMsg(err?.message || "فشل التحميل");
      setState("failed");
    }
  }, [downloadUrl]);

  const handleInstall = useCallback(async () => {
    if (!apkPath) return;
    setState("installing");
    try {
      await installApk(apkPath);
    } catch (err: any) {
      setErrorMsg(err?.message || "فشل فتح المثبّت");
      setState("failed");
    }
  }, [apkPath]);

  const handleBrowserFallback = useCallback(async () => {
    if (!downloadUrl) return;
    setState("preparing");
    setProgress(0);
    await new Promise((r) => setTimeout(r, 300));
    setState("downloading");
    setProgress(50);
    const result = await onUpdateNow(downloadUrl);
    if (result.success) {
      setProgress(100);
      setState("idle");
    } else {
      setErrorMsg(result.error || "فشل فتح رابط التحميل");
      setState("failed");
    }
  }, [downloadUrl, onUpdateNow]);

  const handleUpdate = useCallback(async () => {
    if (nativeReady) {
      await handleNativeUpdate();
    } else {
      await handleBrowserFallback();
    }
  }, [nativeReady, handleNativeUpdate, handleBrowserFallback]);

  const handleRetry = useCallback(async () => {
    setState("retrying");
    setErrorMsg("");
    await new Promise((r) => setTimeout(r, 400));
    await handleUpdate();
  }, [handleUpdate]);

  const handleCopy = useCallback(() => {
    if (!downloadUrl) return;
    onCopyLink(downloadUrl);
    setState("copied");
    setTimeout(() => setState((s) => (s === "copied" ? "idle" : s)), 3000);
  }, [downloadUrl, onCopyLink]);

  const handleCancel = useCallback(async () => {
    cancelledRef.current = true;
    await cancelDownload();
    setState("idle");
    setProgress(0);
    setDownloaded(0);
    setTotal(0);
  }, []);

  const isProcessing = state === "preparing" || state === "downloading" || state === "retrying" || state === "installing";
  const showInstallButton = state === "ready_to_install" && nativeReady;

  const stateLabel: Record<UpdateState, string> = {
    idle: "",
    preparing: "جاري التجهيز...",
    downloading: "جاري التحميل...",
    ready_to_install: "اكتمل التحميل",
    installing: "فتح المثبّت...",
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
                ) : showInstallButton ? (
                  <PackageCheck className="w-6 h-6 text-emerald-500" />
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
                  {showInstallButton
                    ? "جاهز للتثبيت"
                    : isForced
                    ? "تحديث إجباري مطلوب"
                    : "تحديث جديد متاح"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-version-info">
                  v{info.current.versionName} &larr; v{info.latest.versionName}
                </p>
              </div>
            </div>

            {!isForced && !isProcessing && state !== "ready_to_install" && (
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

          {info.latest.releaseNotes && state === "idle" && (
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

          {(isProcessing || state === "ready_to_install") && (
            <div className="space-y-2" data-testid="progress-section">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground" data-testid="text-progress-label">
                  {stateLabel[state]}
                </span>
                <span className="text-xs font-mono text-muted-foreground" data-testid="text-progress-percent">
                  {progress}%
                </span>
              </div>
              {total > 0 && (
                <div className="text-[11px] font-mono text-muted-foreground text-center" data-testid="text-bytes">
                  {formatBytes(downloaded)} / {formatBytes(total)}
                </div>
              )}
            </div>
          )}

          {state === "failed" && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400"
              data-testid="text-error-message"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs font-medium leading-relaxed">
                {errorMsg || "فشل التحميل — جرّب نسخ الرابط وفتحه في المتصفح"}
              </span>
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

            {showInstallButton && (
              <Button
                onClick={handleInstall}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="button-install-now"
              >
                <PackageCheck className="w-4 h-4" />
                <span>تثبيت الآن</span>
              </Button>
            )}

            {downloadUrl && state !== "failed" && state !== "ready_to_install" && (
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

            {state === "downloading" && (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full"
                data-testid="button-cancel-download"
              >
                <X className="w-4 h-4" />
                <span>إلغاء التحميل</span>
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

            {downloadUrl && state !== "ready_to_install" && state !== "installing" && (
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

            {!isForced && !isProcessing && state !== "ready_to_install" && (
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
