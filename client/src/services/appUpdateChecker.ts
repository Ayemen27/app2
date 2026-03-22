import { Capacitor } from '@capacitor/core';

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

async function waitForCapacitorBridge(maxWaitMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const cap = (window as any).Capacitor;
    if (cap && cap.PluginHeaders && cap.PluginHeaders.length > 0) {
      console.log(`[waitForBridge] Bridge ready in ${Date.now() - start}ms, plugins: ${cap.PluginHeaders.length}`);
      return true;
    }
    if (cap && cap.Plugins && cap.Plugins.App) {
      console.log(`[waitForBridge] Plugins.App found in ${Date.now() - start}ms`);
      return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.warn(`[waitForBridge] Timeout after ${maxWaitMs}ms`);
  return false;
}

async function getAppVersion(): Promise<{ versionName: string; versionCode: number; unknown: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    return { versionName: '0.0.0', versionCode: 0, unknown: true };
  }

  await waitForCapacitorBridge(5000);

  const MAX_ATTEMPTS = 4;
  const DELAYS = [0, 1000, 2000, 3000];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      if (DELAYS[attempt] > 0) {
        await new Promise(r => setTimeout(r, DELAYS[attempt]));
      }

      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();

      console.log(`[getAppVersion] attempt=${attempt + 1} raw:`, JSON.stringify(info));

      const versionName = info.version && info.version.length > 0 ? info.version : '';
      const buildStr = info.build && info.build.length > 0 ? info.build : '0';
      const versionCode = parseInt(buildStr, 10) || 0;

      if (versionName && versionName !== '0.0.0' && versionName !== '') {
        console.log(`[getAppVersion] OK: ${versionName} (code: ${versionCode})`);
        return { versionName, versionCode, unknown: false };
      }

      if (versionCode > 0) {
        console.log(`[getAppVersion] OK by code: ${versionCode} (name: ${versionName || 'empty'})`);
        return { versionName: versionName || '0.0.0', versionCode, unknown: false };
      }

      console.warn(`[getAppVersion] attempt=${attempt + 1} returned empty — retrying...`);
    } catch (err: any) {
      console.error(`[getAppVersion] attempt=${attempt + 1} failed:`, err?.message || err);
    }
  }

  console.error(`[getAppVersion] all ${MAX_ATTEMPTS} attempts failed — returning unknown`);
  return { versionName: '0.0.0', versionCode: 0, unknown: true };
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
  const { trackLog } = await import('../lib/debug-tracker');
  trackLog('CHECK_FOR_UPDATE_CALL', { bypassCooldown, shouldCheck: shouldCheck() });
  if (!bypassCooldown && !shouldCheck()) {
    trackLog('CHECK_FOR_UPDATE_COOLDOWN_SKIP', { lastCheck: localStorage.getItem(LAST_CHECK_KEY) });
    return null;
  }

  try {
    trackLog('CHECK_FOR_UPDATE_GET_VERSION', { step: 'getAppVersion' });
    const current = await getAppVersion();
    trackLog('CHECK_FOR_UPDATE_VERSION_RESULT', { versionName: current.versionName, versionCode: current.versionCode, unknown: current.unknown });

    if (current.unknown) {
      trackLog('CHECK_FOR_UPDATE_UNKNOWN_VERSION', { skipped: true });
      return null;
    }

    const baseUrl = Capacitor.isNativePlatform()
      ? 'https://app2.binarjoinanelytic.info'
      : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `${baseUrl}/api/deployment/app/check-update?versionCode=${current.versionCode}&versionName=${encodeURIComponent(current.versionName)}`;
    trackLog('CHECK_FOR_UPDATE_FETCH', { url, currentVersion: current.versionName });

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    trackLog('CHECK_FOR_UPDATE_RESPONSE', { status: res.status, ok: res.ok });
    if (!res.ok) {
      trackLog('CHECK_FOR_UPDATE_FETCH_FAIL', { status: res.status });
      return null;
    }

    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    const data = await res.json();
    trackLog('CHECK_FOR_UPDATE_RESULT', {
      updateAvailable: data.updateAvailable,
      forceUpdate: data.forceUpdate,
      latestVersion: data.latest?.versionName,
      hasDownloadUrl: !!data.latest?.downloadUrl,
    });
    return data;
  } catch (err: any) {
    trackLog('CHECK_FOR_UPDATE_ERROR', { error: err?.message || String(err) });
    return null;
  }
}

async function openDownloadUrl(url: string) {
  const { trackLog } = await import('../lib/debug-tracker');
  trackLog('OPEN_DOWNLOAD_URL_START', { url: url?.substring(0, 100), isNative: Capacitor.isNativePlatform() });
  try {
    let fullUrl = url;
    if (url && !url.startsWith('http')) {
      const base = Capacitor.isNativePlatform()
        ? 'https://app2.binarjoinanelytic.info'
        : window.location.origin;
      fullUrl = `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    trackLog('OPEN_DOWNLOAD_URL_FULL', { fullUrl: fullUrl?.substring(0, 120) });

    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        trackLog('OPEN_DOWNLOAD_URL_BROWSER_OPEN', { method: 'capacitor-browser' });
        await Browser.open({ url: fullUrl, presentationStyle: 'popover' });
        trackLog('OPEN_DOWNLOAD_URL_BROWSER_OK', { success: true });
        return;
      } catch (browserErr: any) {
        trackLog('OPEN_DOWNLOAD_URL_BROWSER_FAIL', { error: browserErr?.message || String(browserErr) });
        window.open(fullUrl, '_system');
        return;
      }
    }
    window.open(fullUrl, '_blank');
  } catch (err: any) {
    trackLog('OPEN_DOWNLOAD_URL_ERROR', { error: err?.message || String(err) });
    const base = 'https://app2.binarjoinanelytic.info';
    window.open(`${base}${url.startsWith('/') ? '' : '/'}${url}`, '_system');
  }
}

const NOTIFIED_VERSION_KEY = 'app_update_notified_version';

async function showUpdateNotification(info: UpdateInfo) {
  if (!Capacitor.isNativePlatform()) return;

  const alreadyNotified = localStorage.getItem(NOTIFIED_VERSION_KEY);
  if (alreadyNotified === String(info.latest.versionCode)) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const permResult = await LocalNotifications.checkPermissions();
    if (permResult.display !== 'granted') {
      const reqResult = await LocalNotifications.requestPermissions();
      if (reqResult.display !== 'granted') {
        console.warn('[updateNotification] إذن الإشعارات مرفوض');
        return;
      }
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'تحديث جديد متوفر لـ AXION',
          body: `الإصدار ${info.latest.versionName} متوفر الآن. قم بالتحديث للحصول على أحدث الميزات والتحسينات.`,
          id: info.latest.versionCode,
          channelId: 'app-updates',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          sound: 'default',
          extra: {
            type: 'app_update',
            versionName: info.latest.versionName,
            versionCode: String(info.latest.versionCode),
            downloadUrl: info.latest.downloadUrl || '',
          },
        },
      ],
    });

    localStorage.setItem(NOTIFIED_VERSION_KEY, String(info.latest.versionCode));
    console.log(`[updateNotification] إشعار تحديث v${info.latest.versionName} تم إرساله`);
  } catch (err) {
    console.warn('[updateNotification] فشل إرسال الإشعار المحلي:', err);
  }
}

async function createUpdateNotificationChannel() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: 'app-updates',
      name: 'تحديثات التطبيق',
      description: 'إشعارات عند توفر تحديث جديد لتطبيق AXION',
      importance: 4,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });
    console.log('[updateNotification] قناة الإشعارات أُنشئت');
  } catch (err) {
    console.warn('[updateNotification] فشل إنشاء قناة الإشعارات:', err);
  }
}

interface UpdateCallbacks {
  onUpdateAvailable: (info: UpdateInfo) => void;
  onNoUpdate?: () => void;
}

async function initUpdateChecker(callbacks: UpdateCallbacks) {
  const { trackLog } = await import('../lib/debug-tracker');
  trackLog('INIT_UPDATE_CHECKER_START', { isNative: Capacitor.isNativePlatform() });
  if (!Capacitor.isNativePlatform()) return;

  activeCallbacks = callbacks;

  await createUpdateNotificationChannel();

  trackLog('INIT_UPDATE_CHECKER_CALLING_CHECK', { bypassCooldown: true });
  const info = await checkForUpdate(true);
  trackLog('INIT_UPDATE_CHECKER_CHECK_RESULT', {
    hasInfo: !!info,
    updateAvailable: info?.updateAvailable,
    forceUpdate: info?.forceUpdate,
    latestVersion: info?.latest?.versionName,
    hasDownloadUrl: !!info?.latest?.downloadUrl,
  });

  if (!info || !info.updateAvailable) {
    trackLog('INIT_UPDATE_CHECKER_NO_UPDATE', { reason: !info ? 'null_info' : 'not_available' });
    callbacks.onNoUpdate?.();
  } else if (info.forceUpdate || !wasDismissed(info.latest.versionCode)) {
    trackLog('INIT_UPDATE_CHECKER_NOTIFY', { forceUpdate: info.forceUpdate, version: info.latest.versionName });
    callbacks.onUpdateAvailable(info);
    showUpdateNotification(info);
  }

  if (!resumeListenerAdded) {
    resumeListenerAdded = true;
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive || !activeCallbacks) return;
        const fresh = await checkForUpdate(true);
        if (fresh?.updateAvailable) {
          if (!fresh.forceUpdate && wasDismissed(fresh.latest.versionCode)) return;
          activeCallbacks.onUpdateAvailable(fresh);
          showUpdateNotification(fresh);
        }
      });
    } catch (e: any) {
      trackLog('INIT_UPDATE_CHECKER_LISTENER_ERROR', { error: e?.message || String(e) });
    }
  }
  trackLog('INIT_UPDATE_CHECKER_DONE', { success: true });
}

export {
  checkForUpdate,
  initUpdateChecker,
  openDownloadUrl,
  dismissVersion,
  getAppVersion,
  showUpdateNotification,
  type UpdateInfo,
};
