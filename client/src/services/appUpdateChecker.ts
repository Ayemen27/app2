import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'app_update_last_check';
const DISMISSED_VERSION_KEY = 'app_update_dismissed_version';

let resumeListenerAdded = false;
let activeCallbacks: UpdateCallbacks | null = null;

interface UpdateInfo {
  updateAvailable: boolean;
  forceUpdate: boolean;
  latest: {
    versionName: string;
    versionCode: number;
    downloadUrl: string | null;
    releasedAt: string;
  };
  current: {
    versionName: string;
    versionCode: number;
  };
}

async function getAppVersion(): Promise<{ versionName: string; versionCode: number }> {
  if (!Capacitor.isNativePlatform()) {
    return { versionName: '0.0.0', versionCode: 0 };
  }
  try {
    const info = await App.getInfo();
    return {
      versionName: info.version || '0.0.0',
      versionCode: parseInt(info.build || '0', 10),
    };
  } catch {
    return { versionName: '0.0.0', versionCode: 0 };
  }
}

function shouldCheck(): boolean {
  const last = localStorage.getItem(LAST_CHECK_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > CHECK_COOLDOWN_MS;
}

function wasDismissed(versionCode: number): boolean {
  const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
  return dismissed === String(versionCode);
}

function dismissVersion(versionCode: number) {
  localStorage.setItem(DISMISSED_VERSION_KEY, String(versionCode));
}

async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!shouldCheck()) return null;

  try {
    const current = await getAppVersion();
    const baseUrl = Capacitor.isNativePlatform()
      ? 'https://app2.binarjoinanelytic.info'
      : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `${baseUrl}/api/deployment/app/check-update?versionCode=${current.versionCode}&versionName=${encodeURIComponent(current.versionName)}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    return await res.json();
  } catch {
    return null;
  }
}

async function openDownloadUrl(url: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
        return;
      } catch {
        window.location.href = url;
        return;
      }
    }
    window.open(url, '_blank');
  } catch {
    window.location.href = url;
  }
}

interface UpdateCallbacks {
  onUpdateAvailable: (info: UpdateInfo) => void;
  onNoUpdate?: () => void;
}

async function initUpdateChecker(callbacks: UpdateCallbacks) {
  if (!Capacitor.isNativePlatform()) return;

  activeCallbacks = callbacks;

  const info = await checkForUpdate();
  if (!info || !info.updateAvailable) {
    callbacks.onNoUpdate?.();
  } else if (info.forceUpdate || !wasDismissed(info.latest.versionCode)) {
    callbacks.onUpdateAvailable(info);
  }

  if (!resumeListenerAdded) {
    resumeListenerAdded = true;

    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive || !activeCallbacks) return;
      const fresh = await checkForUpdate();
      if (fresh?.updateAvailable) {
        if (!fresh.forceUpdate && wasDismissed(fresh.latest.versionCode)) return;
        activeCallbacks.onUpdateAvailable(fresh);
      }
    });
  }
}

export {
  checkForUpdate,
  initUpdateChecker,
  openDownloadUrl,
  dismissVersion,
  getAppVersion,
  type UpdateInfo,
};
