import { Capacitor } from '@capacitor/core';

declare const __APP_VERSION__: string;

function getBundleVersion(): string {
  try {
    return (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ && __APP_VERSION__ !== '0.0.0')
      ? __APP_VERSION__
      : '';
  } catch {
    return '';
  }
}

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
      return true;
    }
    if (cap && cap.Plugins && cap.Plugins.App) {
      return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

async function getAppVersion(): Promise<{ versionName: string; versionCode: number; unknown: boolean }> {
  const { trackLog } = await import('../lib/debug-tracker');

  if (!Capacitor.isNativePlatform()) {
    trackLog('GET_APP_VERSION_NOT_NATIVE', {});
    return { versionName: '0.0.0', versionCode: 0, unknown: true };
  }

  const bridgeReady = await waitForCapacitorBridge(5000);
  trackLog('GET_APP_VERSION_BRIDGE', { bridgeReady });

  const MAX_ATTEMPTS = 4;
  const DELAYS = [0, 500, 1000, 2000];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      if (DELAYS[attempt] > 0) {
        await new Promise(r => setTimeout(r, DELAYS[attempt]));
      }

      const { App } = await import('@capacitor/app');
      trackLog('GET_APP_VERSION_ATTEMPT', { attempt: attempt + 1, appPlugin: !!App, hasGetInfo: typeof App?.getInfo });
      const info = await App.getInfo();

      trackLog('GET_APP_VERSION_RAW', {
        attempt: attempt + 1,
        version: info?.version,
        build: info?.build,
        name: info?.name,
        id: info?.id,
        allKeys: Object.keys(info || {}),
      });

      const versionName = info.version && info.version.length > 0 ? info.version : '';
      const buildStr = info.build && info.build.length > 0 ? info.build : '0';
      const versionCode = parseInt(buildStr, 10) || 0;

      if (versionName && versionName !== '0.0.0' && versionName !== '') {
        trackLog('GET_APP_VERSION_OK', { versionName, versionCode });
        return { versionName, versionCode, unknown: false };
      }

      if (versionCode > 0) {
        trackLog('GET_APP_VERSION_OK_BY_CODE', { versionName, versionCode });
        return { versionName: versionName || '0.0.0', versionCode, unknown: false };
      }

      trackLog('GET_APP_VERSION_EMPTY', { attempt: attempt + 1, versionName, versionCode });
    } catch (err: any) {
      trackLog('GET_APP_VERSION_FAIL', { attempt: attempt + 1, error: err?.message || String(err) });
    }
  }

  trackLog('GET_APP_VERSION_ALL_FAILED', { attempts: MAX_ATTEMPTS });
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

    const bundleVersion = getBundleVersion();
    const checkVersion = current.unknown
      ? (bundleVersion || '0.0.0')
      : current.versionName;
    const checkCode = current.unknown ? 0 : current.versionCode;
    if (current.unknown) {
      trackLog('CHECK_FOR_UPDATE_UNKNOWN_FALLBACK', { usingVersion: checkVersion, bundleVersion, reason: 'native_version_unknown_using_bundle' });
    }

    const baseUrl = Capacitor.isNativePlatform()
      ? (import.meta.env.VITE_PRODUCTION_DOMAIN || '')
      : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `${baseUrl}/api/deployment/app/check-update?versionCode=${checkCode}&versionName=${encodeURIComponent(checkVersion)}`;
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

interface DownloadResult {
  success: boolean;
  method: 'capacitor_browser' | 'location_assign' | 'intent_chrome' | 'clipboard' | 'window_open' | 'none';
  error?: string;
}

let _downloadInProgress = false;

function sanitizeUrlForLog(url: string): string {
  if (!url) return '';
  try {
    return url.substring(0, 120);
  } catch {
    return url.substring(0, 120);
  }
}

function buildFullUrl(url: string): string {
  if (url && url.startsWith('http')) return url;
  const base = Capacitor.isNativePlatform()
    ? (import.meta.env.VITE_PRODUCTION_DOMAIN || '')
    : window.location.origin;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function tryLocationAssign(fullUrl: string): Promise<boolean> {
  window.location.assign(fullUrl);
  return true;
}

async function tryCopyToClipboard(fullUrl: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(fullUrl);
    return true;
  }
  const textArea = document.createElement('textarea');
  textArea.value = fullUrl;
  textArea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
  document.body.appendChild(textArea);
  textArea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textArea);
  return ok;
}

async function tryCapacitorBrowser(fullUrl: string): Promise<boolean> {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: fullUrl, windowName: '_system' });
    return true;
  } catch {
    return false;
  }
}

async function openDownloadUrl(url: string): Promise<DownloadResult> {
  const { trackLog } = await import('../lib/debug-tracker');

  if (_downloadInProgress) {
    trackLog('OPEN_DOWNLOAD_URL_DEBOUNCED', { reason: 'download_already_in_progress' });
    return { success: false, method: 'none', error: 'download_already_in_progress' };
  }
  _downloadInProgress = true;
  setTimeout(() => { _downloadInProgress = false; }, 8000);

  const fullUrl = buildFullUrl(url);
  trackLog('OPEN_DOWNLOAD_URL_START', { url: sanitizeUrlForLog(fullUrl), isNative: Capacitor.isNativePlatform() });

  try {
    if (!Capacitor.isNativePlatform()) {
      window.open(fullUrl, '_blank');
      _downloadInProgress = false;
      return { success: true, method: 'window_open' };
    }

    trackLog('OPEN_DOWNLOAD_URL_TRY', { method: 'capacitor_browser' });
    try {
      const opened = await tryCapacitorBrowser(fullUrl);
      if (opened) {
        trackLog('OPEN_DOWNLOAD_URL_OK', { method: 'capacitor_browser' });
        return { success: true, method: 'capacitor_browser' };
      }
    } catch (e: any) {
      trackLog('OPEN_DOWNLOAD_URL_FAIL', { method: 'capacitor_browser', error: e?.message || String(e) });
    }

    trackLog('OPEN_DOWNLOAD_URL_TRY', { method: 'location_assign' });
    try {
      await tryLocationAssign(fullUrl);
      trackLog('OPEN_DOWNLOAD_URL_OK', { method: 'location_assign' });

      const confirmed = await waitForVisibilityConfirmation(1500);
      if (confirmed) {
        return { success: true, method: 'location_assign' };
      }
      trackLog('OPEN_DOWNLOAD_URL_NO_CONFIRM', { method: 'location_assign', note: 'no_visibility_change_detected' });
    } catch (e: any) {
      trackLog('OPEN_DOWNLOAD_URL_FAIL', { method: 'location_assign', error: e?.message || String(e) });
    }

    trackLog('OPEN_DOWNLOAD_URL_TRY', { method: 'clipboard' });
    try {
      const copied = await tryCopyToClipboard(fullUrl);
      if (copied) {
        trackLog('OPEN_DOWNLOAD_URL_OK', { method: 'clipboard' });
        return { success: true, method: 'clipboard' };
      }
    } catch (e: any) {
      trackLog('OPEN_DOWNLOAD_URL_FAIL', { method: 'clipboard', error: e?.message || String(e) });
    }

    trackLog('OPEN_DOWNLOAD_URL_ALL_FAILED', { attempts: 3 });
    return { success: false, method: 'none', error: 'all_methods_failed' };
  } catch (err: any) {
    trackLog('OPEN_DOWNLOAD_URL_ERROR', { error: err?.message || String(err) });
    return { success: false, method: 'none', error: err?.message || String(err) };
  } finally {
    setTimeout(() => { _downloadInProgress = false; }, 3000);
  }
}

function waitForVisibilityConfirmation(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.hidden) {
      resolve(true);
      return;
    }

    let resolved = false;
    const handler = () => {
      if (!resolved && document.hidden) {
        resolved = true;
        document.removeEventListener('visibilitychange', handler);
        resolve(true);
      }
    };

    document.addEventListener('visibilitychange', handler);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        document.removeEventListener('visibilitychange', handler);
        resolve(false);
      }
    }, timeoutMs);
  });
}

async function openDownloadUrlWithRetry(url: string, maxAttempts = 2): Promise<DownloadResult> {
  const { trackLog } = await import('../lib/debug-tracker');
  const delays = [0, 2000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (delays[attempt] > 0) {
      trackLog('OPEN_DOWNLOAD_RETRY_WAIT', { attempt: attempt + 1, delayMs: delays[attempt] });
      await new Promise(r => setTimeout(r, delays[attempt]));
    }

    const result = await openDownloadUrl(url);
    if (result.success) {
      trackLog('OPEN_DOWNLOAD_RETRY_OK', { attempt: attempt + 1, method: result.method });
      return result;
    }

    trackLog('OPEN_DOWNLOAD_RETRY_FAIL', { attempt: attempt + 1, error: result.error });
  }

  return { success: false, method: 'none', error: 'all_retry_attempts_exhausted' };
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
  } catch (err) {
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
  } catch (err) {
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
  openDownloadUrlWithRetry,
  dismissVersion,
  getAppVersion,
  showUpdateNotification,
  type UpdateInfo,
  type DownloadResult,
};
