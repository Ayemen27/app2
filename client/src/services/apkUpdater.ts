import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface ApkDownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
}

export interface ApkDownloadResult {
  path: string;
  size: number;
}

interface ApkUpdaterPlugin {
  download(options: { url: string; fileName?: string }): Promise<ApkDownloadResult>;
  cancel(): Promise<void>;
  install(options: { path: string }): Promise<{ started?: boolean; requiresPermission?: boolean }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: ApkDownloadProgress) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'downloadComplete',
    listenerFunc: (data: ApkDownloadResult) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'downloadError',
    listenerFunc: (data: { error: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'downloadCancelled',
    listenerFunc: (data: { cancelled: boolean }) => void,
  ): Promise<PluginListenerHandle>;
}

const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater');

export function isApkUpdaterAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getApkFileName(versionName: string): string {
  const safeVersion = (versionName || 'unknown').replace(/[^0-9.a-zA-Z_-]/g, '_');
  return `AXION_v${safeVersion}_update.apk`;
}

// ─── كاش مسار APK في localStorage ────────────────────────────────────────────
// المشكلة الجذرية: البلغن يحفظ الملف في مسار خاص به (مختلف عن Directory.Cache).
// الحل: نحفظ المسار الحقيقي الذي يُعيده البلغن بعد التحميل ونُعيد استخدامه.
const APK_PATH_CACHE_KEY = 'axion_apk_path_cache';

export function saveApkPathCache(versionName: string, path: string): void {
  try {
    const entry = { versionName, path, savedAt: Date.now() };
    localStorage.setItem(APK_PATH_CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

export function getSavedApkPath(versionName: string): string | null {
  try {
    const raw = localStorage.getItem(APK_PATH_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry?.versionName === versionName && entry?.path) return entry.path;
    return null;
  } catch {
    return null;
  }
}

export function clearApkPathCache(): void {
  try {
    localStorage.removeItem(APK_PATH_CACHE_KEY);
  } catch {}
}

/**
 * يفحص وجود ملف APK محلياً بنفس رقم الإصدار المطلوب.
 *
 * الترتيب (مهم للتصحيح):
 * 1. يفحص المسار المحفوظ من آخر تحميل ناجح (المسار الحقيقي للبلغن)
 * 2. يفحص Directory.Cache كـ fallback
 *
 * العائد:
 *   - { exists: true, path } → الملف موجود وصالح (≥ 1MB)
 *   - { exists: false }      → يجب التحميل
 */
export async function checkLocalApk(
  versionName: string,
): Promise<{ exists: boolean; path?: string; size?: number }> {
  if (!Capacitor.isNativePlatform()) return { exists: false };

  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  // ── الفحص الأول: المسار المحفوظ من البلغن (الأكثر موثوقية) ─────────────
  const savedPath = getSavedApkPath(versionName);
  if (savedPath) {
    try {
      const stat = await Filesystem.stat({ path: savedPath });
      const size = (stat as any).size ?? 0;
      if (size >= 1024 * 1024) {
        return { exists: true, path: savedPath, size };
      }
      // الملف موجود لكن ناقص أو تالف → امسح الكاش
      clearApkPathCache();
    } catch {
      // المسار المحفوظ لم يعد موجوداً → امسح الكاش
      clearApkPathCache();
    }
  }

  // ── الفحص الثاني: Directory.Cache كـ fallback ───────────────────────────
  try {
    const fileName = getApkFileName(versionName);

    const stat = await Filesystem.stat({
      path: fileName,
      directory: Directory.Cache,
    });

    const size = (stat as any).size ?? 0;
    if (size < 1024 * 1024) return { exists: false };

    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    // وجدنا الملف في الكاش → احفظ المسار الحقيقي
    saveApkPathCache(versionName, uri);
    return { exists: true, path: uri, size };
  } catch {
    return { exists: false };
  }
}

/**
 * يحذف ملفات APK القديمة من الكاش لتحرير المساحة.
 */
export async function cleanOldApkCache(currentVersionName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { files } = await Filesystem.readdir({
      path: '',
      directory: Directory.Cache,
    });

    const currentFileName = getApkFileName(currentVersionName);

    for (const file of files) {
      const name = typeof file === 'string' ? file : (file as any).name;
      if (
        name &&
        name.startsWith('AXION_') &&
        name.endsWith('_update.apk') &&
        name !== currentFileName
      ) {
        try {
          await Filesystem.deleteFile({ path: name, directory: Directory.Cache });
        } catch {}
      }
    }
  } catch {}
}

export interface DownloadAndInstallCallbacks {
  onProgress?: (progress: ApkDownloadProgress) => void;
  onComplete?: (result: ApkDownloadResult) => void;
  onError?: (error: string) => void;
}

export async function downloadApk(
  url: string,
  callbacks: DownloadAndInstallCallbacks = {},
  versionName?: string,
): Promise<ApkDownloadResult> {
  const fileName = versionName
    ? getApkFileName(versionName)
    : `AXION_update_${Date.now()}.apk`;

  const handles: PluginListenerHandle[] = [];

  const cleanup = async () => {
    for (const h of handles) {
      try {
        await h.remove();
      } catch {}
    }
  };

  try {
    if (callbacks.onProgress) {
      handles.push(await ApkUpdater.addListener('downloadProgress', callbacks.onProgress));
    }
    if (callbacks.onError) {
      handles.push(
        await ApkUpdater.addListener('downloadError', (e) => callbacks.onError?.(e.error)),
      );
    }
    if (callbacks.onComplete) {
      handles.push(await ApkUpdater.addListener('downloadComplete', callbacks.onComplete));
    }

    const result = await ApkUpdater.download({ url, fileName });

    // ── احفظ المسار الحقيقي فور نجاح التحميل ───────────────────────────────
    // هذا يحل مشكلة إعادة التحميل في كل مرة: الكاش يعتمد على المسار الحقيقي
    if (versionName && result.path) {
      saveApkPathCache(versionName, result.path);
    }

    return result;
  } finally {
    await cleanup();
  }
}

export async function cancelDownload(): Promise<void> {
  try {
    await ApkUpdater.cancel();
  } catch {}
}

export async function installApk(
  path: string,
): Promise<{ started?: boolean; requiresPermission?: boolean }> {
  return ApkUpdater.install({ path });
}
