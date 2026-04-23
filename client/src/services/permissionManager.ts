import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'axion_perms_v2';

interface PermRecord {
  askedAt: number;
  deniedCount: number;
  granted: boolean;
}

interface PermStorage {
  push: PermRecord;
  local: PermRecord;
}

const DEFAULT_RECORD: PermRecord = { askedAt: 0, deniedCount: 0, granted: false };
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_AUTO_ASKS = 2;

function loadStorage(): PermStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { push: { ...DEFAULT_RECORD }, local: { ...DEFAULT_RECORD } };
}

function saveStorage(data: PermStorage) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function canAutoAsk(rec: PermRecord): boolean {
  if (rec.granted) return false;
  if (rec.deniedCount >= MAX_AUTO_ASKS) return false;
  if (rec.deniedCount > 0 && Date.now() - rec.askedAt < COOLDOWN_MS) return false;
  return true;
}

function needsSettingsRedirect(rec: PermRecord): boolean {
  return !rec.granted && rec.deniedCount >= MAX_AUTO_ASKS;
}

export type PermissionId = 'push' | 'local';

export interface PermissionInfo {
  id: PermissionId;
  needsRationale: boolean;
  needsSettings: boolean;
  granted: boolean;
}

export async function checkAllPermissions(): Promise<PermissionInfo[]> {
  if (!Capacitor.isNativePlatform()) return [];

  const storage = loadStorage();
  const result: PermissionInfo[] = [];

  // PushNotifications — نستدعي مباشرة بدون isPluginAvailable (لا تعمل في Capacitor 8)
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = await PushNotifications.checkPermissions();
    const granted = status.receive === 'granted';
    if (granted) storage.push.granted = true;
    saveStorage(storage);
    result.push({
      id: 'push',
      granted,
      needsRationale: !granted && canAutoAsk(storage.push),
      needsSettings: !granted && needsSettingsRedirect(storage.push),
    });
  } catch {}

  // LocalNotifications
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const status = await LocalNotifications.checkPermissions();
    const granted = status.display === 'granted';
    if (granted) storage.local.granted = true;
    saveStorage(storage);
    result.push({
      id: 'local',
      granted,
      needsRationale: !granted && canAutoAsk(storage.local),
      needsSettings: !granted && needsSettingsRedirect(storage.local),
    });
  } catch {}

  return result;
}

export async function requestPermission(id: PermissionId): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const storage = loadStorage();
  const rec = storage[id];
  rec.askedAt = Date.now();

  try {
    if (id === 'push') {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.requestPermissions();
      const granted = result.receive === 'granted';
      if (granted) {
        rec.granted = true;
        rec.deniedCount = 0;
        saveStorage(storage);
        try {
          const userId = (() => {
            try { return JSON.parse(localStorage.getItem('user') || '{}')?.id || ''; } catch { return ''; }
          })();
          const { initializeNativePush } = await import('./capacitorPush');
          await initializeNativePush(String(userId));
        } catch {}
        return true;
      } else {
        rec.deniedCount += 1;
        saveStorage(storage);
        return false;
      }
    }

    if (id === 'local') {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      if (granted) {
        rec.granted = true;
        rec.deniedCount = 0;
        saveStorage(storage);
        return true;
      } else {
        rec.deniedCount += 1;
        saveStorage(storage);
        return false;
      }
    }
  } catch {
    rec.deniedCount += 1;
    saveStorage(storage);
  }

  return false;
}

export function markGranted(id: PermissionId) {
  const storage = loadStorage();
  storage[id].granted = true;
  storage[id].deniedCount = 0;
  saveStorage(storage);
}

export function hasAnyPendingPermission(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const storage = loadStorage();
  return !storage.push.granted || !storage.local.granted;
}
