import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { initializeNativePush } from './capacitorPush';

const PERM_LAST_ASKED_KEY = 'push_permission_last_asked_at';
const PERM_DENIED_COUNT_KEY = 'push_permission_denied_count';
const ASK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type PermissionState = 'granted' | 'prompt' | 'denied' | 'cooldown';

let resumeListenerRegistered = false;

function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.id ? String(parsed.id) : '';
  } catch {
    return '';
  }
}

async function getPermissionState(): Promise<PermissionState> {
  if (!Capacitor.isNativePlatform()) return 'denied';

  try {
    const status = await PushNotifications.checkPermissions();
    if (status.receive === 'granted') return 'granted';
    if (status.receive === 'prompt') return 'prompt';

    const lastAsked = localStorage.getItem(PERM_LAST_ASKED_KEY);
    if (lastAsked) {
      const elapsed = Date.now() - parseInt(lastAsked, 10);
      if (elapsed < ASK_COOLDOWN_MS) return 'cooldown';
    }

    return 'denied';
  } catch {
    return 'denied';
  }
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const state = await getPermissionState();

    if (state === 'granted') {
      await initializeNativePush(getCurrentUserId());
      return true;
    }

    if (state === 'cooldown') return false;

    if (state === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      localStorage.setItem(PERM_LAST_ASKED_KEY, Date.now().toString());

      if (result.receive === 'granted') {
        localStorage.setItem(PERM_DENIED_COUNT_KEY, '0');
        await initializeNativePush(getCurrentUserId());
        return true;
      }

      incrementDeniedCount();
      return false;
    }

    if (state === 'denied') {
      localStorage.setItem(PERM_LAST_ASKED_KEY, Date.now().toString());
      return false;
    }

    return false;
  } catch (err) {
    return false;
  }
}

function incrementDeniedCount() {
  const current = parseInt(localStorage.getItem(PERM_DENIED_COUNT_KEY) || '0', 10);
  localStorage.setItem(PERM_DENIED_COUNT_KEY, (current + 1).toString());
}

function getDeniedCount(): number {
  return parseInt(localStorage.getItem(PERM_DENIED_COUNT_KEY) || '0', 10);
}

function shouldShowSettingsPrompt(): boolean {
  return getDeniedCount() >= 2;
}

async function registerResumeListener() {
  if (resumeListenerRegistered) return;
  if (!Capacitor.isNativePlatform()) return;

  resumeListenerRegistered = true;

  const { App } = await import('@capacitor/app');
  App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) return;

    try {
      const status = await PushNotifications.checkPermissions();
      if (status.receive === 'granted') {
        localStorage.setItem(PERM_DENIED_COUNT_KEY, '0');
        await initializeNativePush(getCurrentUserId());
      }
    } catch {}
  });
}

export {
  getPermissionState,
  requestNotificationPermission,
  shouldShowSettingsPrompt,
  getDeniedCount,
  registerResumeListener,
};
