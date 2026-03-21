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
    const versionName = info.version || '0.0.0';
    const versionCode = parseInt(info.build || '0', 10);
    console.log(`[getAppVersion] raw info:`, JSON.stringify({ version: info.version, build: info.build, name: info.name, id: info.id }));
    console.log(`[getAppVersion] parsed: versionName=${versionName}, versionCode=${versionCode}`);
    if (versionName === '0.0.0' && versionCode === 0) {
      console.warn(`[getAppVersion] App.getInfo() returned empty version — possible Capacitor plugin issue`);
    }
    return { versionName, versionCode };
  } catch (err) {
    console.error(`[getAppVersion] App.getInfo() failed:`, err);
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

async function checkForUpdate(bypassCooldown = false): Promise<UpdateInfo | null> {
  if (!bypassCooldown && !shouldCheck()) return null;

  try {
    const current = await getAppVersion();
    const baseUrl = Capacitor.isNativePlatform()
      ? 'https://app2.binarjoinanelytic.info'
      : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `${baseUrl}/api/deployment/app/check-update?versionCode=${current.versionCode}&versionName=${encodeURIComponent(current.versionName)}`;
    console.log(`[update-checker] فحص التحديث: ${url}`);
    console.log(`[update-checker] الإصدار الحالي: ${current.versionName} (code: ${current.versionCode})`);

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      console.error(`[update-checker] فشل الطلب: status=${res.status}`);
      return null;
    }

    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    const data = await res.json();
    console.log(`[update-checker] النتيجة:`, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error(`[update-checker] خطأ في فحص التحديث:`, err);
    return null;
  }
}

async function openDownloadUrl(url: string) {
  try {
    let fullUrl = url;
    if (url && !url.startsWith('http')) {
      const base = Capacitor.isNativePlatform()
        ? 'https://app2.binarjoinanelytic.info'
        : window.location.origin;
      fullUrl = `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    console.log(`[openDownloadUrl] Opening: ${fullUrl}`);

    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: fullUrl, presentationStyle: 'popover' });
        return;
      } catch (browserErr) {
        console.warn(`[openDownloadUrl] Browser plugin failed, using window.location:`, browserErr);
        window.open(fullUrl, '_system');
        return;
      }
    }
    window.open(fullUrl, '_blank');
  } catch (err) {
    console.error(`[openDownloadUrl] Error:`, err);
    const base = 'https://app2.binarjoinanelytic.info';
    window.open(`${base}${url.startsWith('/') ? '' : '/'}${url}`, '_system');
  }
}

interface UpdateCallbacks {
  onUpdateAvailable: (info: UpdateInfo) => void;
  onNoUpdate?: () => void;
}

async function initUpdateChecker(callbacks: UpdateCallbacks) {
  if (!Capacitor.isNativePlatform()) return;

  activeCallbacks = callbacks;

  const info = await checkForUpdate(true);
  if (!info || !info.updateAvailable) {
    callbacks.onNoUpdate?.();
  } else if (info.forceUpdate || !wasDismissed(info.latest.versionCode)) {
    callbacks.onUpdateAvailable(info);
  }

  if (!resumeListenerAdded) {
    resumeListenerAdded = true;

    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive || !activeCallbacks) return;
      const fresh = await checkForUpdate(true);
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
