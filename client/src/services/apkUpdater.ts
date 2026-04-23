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
    if (!Capacitor.isNativePlatform()) return false;

    if (Capacitor.isPluginAvailable('ApkUpdater')) return true;

    const plugins = (window as any)?.Capacitor?.Plugins;
    if (plugins && typeof plugins === 'object' && 'ApkUpdater' in plugins) return true;

    const nativeImpl = (window as any)?.Capacitor?.nativeCallback;
    if (nativeImpl) return true;

    return false;
  } catch {
    return false;
  }
}

export interface DownloadAndInstallCallbacks {
  onProgress?: (progress: ApkDownloadProgress) => void;
  onComplete?: (result: ApkDownloadResult) => void;
  onError?: (error: string) => void;
}

export async function downloadApk(
  url: string,
  callbacks: DownloadAndInstallCallbacks = {},
): Promise<ApkDownloadResult> {
  const fileName = `AXION_update_${Date.now()}.apk`;
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
