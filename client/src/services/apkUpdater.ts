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

/**
 * اسم ملف APK ثابت وحتمي بناءً على رقم الإصدار.
 * يضمن أن نفس الإصدار دائماً يُحفظ في نفس المسار → لا إعادة تحميل.
 */
export function getApkFileName(versionName: string): string {
  const safeVersion = (versionName || 'unknown').replace(/[^0-9.a-zA-Z_-]/g, '_');
  return `AXION_v${safeVersion}_update.apk`;
}

/**
 * يفحص وجود ملف APK محلياً بنفس رقم الإصدار المطلوب.
 * يستخدم @capacitor/filesystem للفحص الحقيقي على الجهاز.
 *
 * العائد:
 *   - { exists: true, path } → الملف موجود وصالح
 *   - { exists: false }      → يجب التحميل
 */
export async function checkLocalApk(versionName: string): Promise<{ exists: boolean; path?: string; size?: number }> {
  if (!Capacitor.isNativePlatform()) return { exists: false };

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const fileName = getApkFileName(versionName);

    const stat = await Filesystem.stat({
      path: fileName,
      directory: Directory.Cache,
    });

    const size = (stat as any).size ?? 0;

    if (size < 1024 * 1024) {
      return { exists: false };
    }

    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    return { exists: true, path: uri, size };
  } catch {
    return { exists: false };
  }
}

/**
 * يحذف ملفات APK القديمة من الكاش لتحرير المساحة.
 * يُنفَّذ بعد نجاح التثبيت أو قبل بدء تحميل إصدار جديد.
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
      if (name && name.startsWith('AXION_') && name.endsWith('_update.apk') && name !== currentFileName) {
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
      try { await h.remove(); } catch {}
    }
  };

  try {
    if (callbacks.onProgress) {
      handles.push(await ApkUpdater.addListener('downloadProgress', callbacks.onProgress));
    }
    if (callbacks.onError) {
      handles.push(await ApkUpdater.addListener('downloadError', (e) => callbacks.onError?.(e.error)));
    }
    if (callbacks.onComplete) {
      handles.push(await ApkUpdater.addListener('downloadComplete', callbacks.onComplete));
    }

    const result = await ApkUpdater.download({ url, fileName });
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

export async function installApk(path: string): Promise<{ started?: boolean; requiresPermission?: boolean }> {
  return ApkUpdater.install({ path });
}
