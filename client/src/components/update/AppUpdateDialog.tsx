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
  HardDrive,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  downloadApk,
  installApk,
  cancelDownload,
  checkLocalApk,
  cleanOldApkCache,
  clearApkPathCache,
  type ApkDownloadProgress,
} from "@/services/apkUpdater";

type UpdateState =
  | "idle"
  | "checking_local"
  | "preparing"
  | "downloading"
  | "ready_to_install"
  | "installing"
  | "permission_required"
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
  const [cachedSize, setCachedSize] = useState<number>(0);
  const [usingCache, setUsingCache] = useState(false);
  const isForced = info.forceUpdate === true;
  const downloadUrl = info.latest.downloadUrl;
  const nativeReady = Capacitor.isNativePlatform();
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

  const handleNativeUpdate = useCallback(async () => {
    if (!downloadUrl) return;
    cancelledRef.current = false;
    setErrorMsg("");
    setProgress(0);
    setDownloaded(0);
    setTotal(0);
    setUsingCache(false);

    try {
      // ── الخطوة 1: فحص الكاش المحلي أولاً ──────────────────────────────
      setState("checking_local");
      const localApk = await checkLocalApk(info.latest.versionName);

      if (cancelledRef.current) return;

      if (localApk.exists && localApk.path) {
        // الملف موجود محلياً وصالح → تخطّي التحميل كلياً
        setUsingCache(true);
        setCachedSize(localApk.size ?? 0);
        setApkPath(localApk.path);
        setProgress(100);
        setState("ready_to_install");
        return;
      }

      // ── الخطوة 2: لا يوجد كاش → تحميل جديد ────────────────────────────
      await cleanOldApkCache(info.latest.versionName);

      setState("preparing");
      await new Promise((r) => setTimeout(r, 200));

      const result = await downloadApk(
        downloadUrl,
        {
          onProgress: (p: ApkDownloadProgress) => {
            if (cancelledRef.current) return;
            setState("downloading");
            setProgress(Math.min(99, Math.round(p.percent)));
            setDownloaded(p.downloaded);
            setTotal(p.total);
          },
        },
        info.latest.versionName,
        // المسار يُحفظ تلقائياً داخل downloadApk بعد نجاح التحميل
      );

      if (cancelledRef.current) return;
      setProgress(100);
      setDownloaded(result.size);
      setTotal(result.size);
      setApkPath(result.path);
      setState("ready_to_install");
    } catch (err: any) {
      if (cancelledRef.current) return;
      const msg = err?.message || String(err);
      const isPluginMissing =
        msg.includes('not implemented') ||
        msg.includes('UNIMPLEMENTED') ||
        msg.includes('not found') ||
        msg.includes('غير متوفر') ||
        msg.includes('plugin');
      if (isPluginMissing) {
        await handleBrowserFallback();
      } else {
        setErrorMsg(msg || "فشل التحميل");
        setState("failed");
      }
    }
  }, [downloadUrl, info.latest.versionName, handleBrowserFallback]);

  // ── التثبيت ────────────────────────────────────────────────────────────────
  // المشكلة الجذرية لـ "التطبيق ليس مثبتاً":
  // أندرويد يُرجع requiresPermission:true لكن الكود القديم كان يتجاهله
  const doInstall = useCallback(async (path: string) => {
    setState("installing");
    try {
      const result = await installApk(path);

      if (result?.requiresPermission) {
        // المستخدم لم يمنح صلاحية "تثبيت تطبيقات من مصادر خارجية"
        setState("permission_required");
        return;
      }
      // نجح فتح المثبّت — لا نغيّر الحالة، المستخدم يتعامل مع نافذة أندرويد
    } catch (err: any) {
      setErrorMsg(err?.message || "فشل فتح المثبّت");
      setState("failed");
    }
  }, []);

  const handleInstall = useCallback(() => doInstall(apkPath), [apkPath, doInstall]);

  const handleRetryInstall = useCallback(() => doInstall(apkPath), [apkPath, doInstall]);

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
    setUsingCache(false);
    // امسح الكاش المحفوظ — الملف قد يكون تالفاً
    clearApkPathCache();
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
    setUsingCache(false);
  }, []);

  const isProcessing =
    state === "checking_local" ||
    state === "preparing" ||
    state === "downloading" ||
    state === "retrying" ||
    state === "installing";

  const showInstallButton = state === "ready_to_install" && nativeReady;

  const stateLabel: Record<UpdateState, string> = {
    idle: "",
    checking_local: "جاري فحص الملفات المحلية...",
    preparing: "جاري التجهيز...",
    downloading: "جاري التحميل...",
    ready_to_install: usingCache ? "الملف متوفر محلياً" : "اكتمل التحميل",
    installing: "فتح المثبّت...",
    permission_required: "مطلوب منح صلاحية التثبيت",
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

          {/* ── الترويسة ─────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  state === "permission_required"
                    ? "bg-orange-500/10 dark:bg-orange-500/20"
                    : isForced
                    ? "bg-red-500/10 dark:bg-red-500/20"
                    : state === "ready_to_install" && usingCache
                    ? "bg-amber-500/10 dark:bg-amber-500/20"
                    : showInstallButton
                    ? "bg-emerald-500/10 dark:bg-emerald-500/20"
                    : "bg-blue-500/10 dark:bg-blue-500/20"
                }`}
              >
                {state === "permission_required" ? (
                  <ShieldAlert className="w-6 h-6 text-orange-500" />
                ) : isForced ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : state === "ready_to_install" && usingCache ? (
                  <HardDrive className="w-6 h-6 text-amber-500" />
                ) : showInstallButton ? (
                  <PackageCheck className="w-6 h-6 text-emerald-500" />
                ) : (
                  <ArrowDownToLine className="w-6 h-6 text-blue-500" />
                )}
              </div>
              <div>
                <h3
                  className={`text-base font-bold ${
                    state === "permission_required"
                      ? "text-orange-600 dark:text-orange-400"
                      : isForced
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  }`}
                  data-testid="text-update-title"
                >
                  {state === "permission_required"
                    ? "مطلوب صلاحية التثبيت"
                    : state === "ready_to_install" && usingCache
                    ? "الملف جاهز للتثبيت"
                    : showInstallButton
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

            {!isForced &&
              !isProcessing &&
              state !== "ready_to_install" &&
              state !== "permission_required" && (
                <button
                  onClick={onDismiss}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                  data-testid="button-dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
          </div>

          {/* ── تحذير إجباري ──────────────────────────────────────────────── */}
          {isForced && state !== "permission_required" && (
            <p className="text-xs text-red-500 dark:text-red-400 font-medium" data-testid="text-force-warning">
              لا يمكن استخدام التطبيق بالإصدار الحالي v{info.current.versionName}
            </p>
          )}

          {/* ── بطاقة: يحتاج صلاحية تثبيت التطبيقات ─────────────────────── */}
          {state === "permission_required" && (
            <div
              className="space-y-3 p-4 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20"
              data-testid="permission-required-card"
            >
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                يحتاج التطبيق صلاحية تثبيت التطبيقات من مصادر خارجية
              </p>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>افتح <span className="font-semibold text-foreground">الإعدادات</span> على جهازك</li>
                <li>اختر <span className="font-semibold text-foreground">التطبيقات</span> ثم <span className="font-semibold text-foreground">AXION</span></li>
                <li>فعّل <span className="font-semibold text-foreground">تثبيت تطبيقات غير معروفة</span></li>
                <li>عد هنا واضغط <span className="font-semibold text-foreground">إعادة محاولة التثبيت</span></li>
              </ol>
            </div>
          )}

          {/* ── بطاقة الكاش المحلي ────────────────────────────────────────── */}
          {state === "ready_to_install" && usingCache && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
              data-testid="text-cache-notice"
            >
              <HardDrive className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-relaxed">
                <span>تم العثور على الملف محلياً</span>
                {cachedSize > 0 && (
                  <span className="text-amber-600 dark:text-amber-500 mr-1">
                    ({formatBytes(cachedSize)})
                  </span>
                )}
                <br />
                <span className="font-normal opacity-80">لن يتم استهلاك بيانات الإنترنت</span>
              </div>
            </div>
          )}

          {/* ── ملاحظات الإصدار ───────────────────────────────────────────── */}
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

          {/* ── شريط التقدم ───────────────────────────────────────────────── */}
          {(isProcessing || state === "ready_to_install") && (
            <div className="space-y-2" data-testid="progress-section">
              {state !== "checking_local" && (
                <Progress value={progress} className="h-2" />
              )}
              <div className="flex items-center justify-between">
                <span
                  className="text-xs text-muted-foreground flex items-center gap-1.5"
                  data-testid="text-progress-label"
                >
                  {state === "checking_local" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {stateLabel[state]}
                </span>
                {state !== "checking_local" && (
                  <span className="text-xs font-mono text-muted-foreground" data-testid="text-progress-percent">
                    {progress}%
                  </span>
                )}
              </div>
              {total > 0 && !usingCache && (
                <div className="text-[11px] font-mono text-muted-foreground text-center" data-testid="text-bytes">
                  {formatBytes(downloaded)} / {formatBytes(total)}
                </div>
              )}
            </div>
          )}

          {/* ── رسالة الخطأ ───────────────────────────────────────────────── */}
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

          {/* ── رسالة نسخ الرابط ──────────────────────────────────────────── */}
          {state === "copied" && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400"
              data-testid="text-copied-message"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">تم نسخ رابط التحميل — الصقه في المتصفح</span>
            </div>
          )}

          {/* ── الأزرار ───────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 pt-1">
            {!downloadUrl && (
              <p className="text-xs text-amber-500 font-medium text-center" data-testid="text-no-download">
                رابط التحميل غير متوفر حالياً — أعد المحاولة لاحقاً
              </p>
            )}

            {/* زر: إعادة محاولة التثبيت (بعد منح الصلاحية) */}
            {state === "permission_required" && (
              <>
                <Button
                  onClick={handleRetryInstall}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  data-testid="button-retry-install"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>إعادة محاولة التثبيت</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      // فتح إعدادات التطبيق في أندرويد
                      window.open('app-settings:', '_system');
                    } catch {}
                  }}
                  className="w-full"
                  data-testid="button-open-settings"
                >
                  <Settings className="w-4 h-4" />
                  <span>فتح إعدادات الجهاز</span>
                </Button>
              </>
            )}

            {/* زر: تثبيت الآن */}
            {showInstallButton && state !== "permission_required" && (
              <Button
                onClick={handleInstall}
                className={`w-full text-white ${
                  usingCache ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
                data-testid="button-install-now"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{usingCache ? "تثبيت (من الذاكرة المحلية)" : "تثبيت الآن"}</span>
              </Button>
            )}

            {/* زر: تحديث الآن (بدء التحميل) */}
            {downloadUrl &&
              state !== "failed" &&
              state !== "ready_to_install" &&
              state !== "permission_required" && (
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

            {/* زر: إلغاء التحميل */}
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

            {/* زر: إعادة المحاولة (بعد فشل التحميل) */}
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

            {/* زر: نسخ رابط التحميل */}
            {downloadUrl &&
              state !== "ready_to_install" &&
              state !== "installing" &&
              state !== "checking_local" &&
              state !== "permission_required" && (
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  disabled={isProcessing}
                  className="w-full"
                  data-testid="button-copy-link"
                >
                  {state === "copied" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{state === "copied" ? "تم النسخ" : "نسخ رابط التحميل"}</span>
                </Button>
              )}

            {/* زر: لاحقاً */}
            {!isForced &&
              !isProcessing &&
              state !== "ready_to_install" &&
              state !== "permission_required" && (
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
