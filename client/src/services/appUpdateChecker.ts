import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'app_update_last_check';
const DISMISSED_VERSION_KEY = 'app_update_dismissed_version';

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

    const res = await fetch(
      `${baseUrl}/api/deployment/app/check-update?versionCode=${current.versionCode}&versionName=${current.versionName}`,
      { headers: { 'Accept': 'application/json' } }
    );

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
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  } catch {
    window.open(url, '_blank');
  }
}

interface UpdateCallbacks {
  onUpdateAvailable: (info: UpdateInfo) => void;
  onNoUpdate?: () => void;
}

async function initUpdateChecker(callbacks: UpdateCallbacks) {
  if (!Capacitor.isNativePlatform()) return;

  const info = await checkForUpdate();
  if (!info || !info.updateAvailable) {
    callbacks.onNoUpdate?.();
    return;
  }

  if (!info.forceUpdate && wasDismissed(info.latest.versionCode)) {
    return;
  }

  callbacks.onUpdateAvailable(info);

  App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) return;
    const fresh = await checkForUpdate();
    if (fresh?.updateAvailable) {
      if (!fresh.forceUpdate && wasDismissed(fresh.latest.versionCode)) return;
      callbacks.onUpdateAvailable(fresh);
    }
  });
}

export {
  checkForUpdate,
  initUpdateChecker,
  openDownloadUrl,
  dismissVersion,
  getAppVersion,
  type UpdateInfo,
};
