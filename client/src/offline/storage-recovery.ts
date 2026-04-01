import { toast } from '@/hooks/use-toast';

const CLEANUP_STORES_PRIORITY = [
  'syncHistory',
  'localAuditLog',
  'deadLetterQueue',
  'userData',
  'syncMetadata',
] as const;

const DATA_STORES_BY_AGE = [
  'aiChatMessages',
  'aiChatSessions',
  'aiUsageStats',
  'notificationReadStates',
  'notifications',
  'buildDeployments',
  'reportTemplates',
  'backupLogs',
  'backupSettings',
  'permissionAuditLogs',
] as const;

let _recoveryInProgress = false;
let _lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN_MS = 30_000;

function notifyUser(message: string, variant: 'destructive' | 'default' = 'destructive') {
  const now = Date.now();
  if (now - _lastNotificationTime < NOTIFICATION_COOLDOWN_MS) return;
  _lastNotificationTime = now;

  try {
    toast({
      title: 'تحذير التخزين',
      description: message,
      variant,
    });
  } catch {
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.code === 22 ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('quota') || msg.includes('storage full') || msg.includes('disk');
  }
  return false;
}

export function isCorruptionError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException) {
    return (
      error.name === 'InvalidStateError' ||
      error.name === 'UnknownError' ||
      error.name === 'AbortError' ||
      error.name === 'NotFoundError'
    );
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('corrupt') ||
      msg.includes('invalid state') ||
      msg.includes('connection is closing') ||
      msg.includes('database is not open') ||
      msg.includes('objectstore was deleted')
    );
  }
  return false;
}

async function clearStore(storeName: string): Promise<number> {
  try {
    const { getDB } = await import('./db');
    const db = await getDB();
    if (db && typeof db.count === 'function') {
      const count = await db.count(storeName);
      if (count > 0) {
        await db.clear(storeName);
        return count;
      }
    }
  } catch (e) {
  }
  return 0;
}

async function trimOldestRecords(storeName: string, keepCount: number): Promise<number> {
  try {
    const { getDB } = await import('./db');
    const db = await getDB();
    if (!db || typeof db.getAll !== 'function') return 0;

    const all = await db.getAll(storeName);
    if (all.length <= keepCount) return 0;

    all.sort((a: any, b: any) => {
      const tA = a.timestamp || a.created_at || a.movedAt || 0;
      const tB = b.timestamp || b.created_at || b.movedAt || 0;
      return tA - tB;
    });

    const toRemove = all.slice(0, all.length - keepCount);
    let removed = 0;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of toRemove) {
      const key = item.id || item.key;
      if (key) {
        try {
          store.delete(key);
          removed++;
        } catch {
        }
      }
    }
    await tx.done;
    return removed;
  } catch (e) {
    return 0;
  }
}

export async function handleQuotaExceeded(): Promise<boolean> {
  if (_recoveryInProgress) return false;
  _recoveryInProgress = true;

  notifyUser('مساحة التخزين ممتلئة. جاري تنظيف البيانات القديمة...');

  try {
    let freedTotal = 0;

    for (const store of CLEANUP_STORES_PRIORITY) {
      const freed = await clearStore(store);
      freedTotal += freed;
      if (freed > 0) {
        const canWrite = await testWrite();
        if (canWrite) {
          notifyUser('تم تنظيف التخزين بنجاح. يمكنك متابعة العمل.', 'default');
          return true;
        }
      }
    }

    for (const store of DATA_STORES_BY_AGE) {
      const freed = await clearStore(store);
      freedTotal += freed;
      if (freed > 0) {
        const canWrite = await testWrite();
        if (canWrite) {
          notifyUser('تم تنظيف التخزين بنجاح. يمكنك متابعة العمل.', 'default');
          return true;
        }
      }
    }

    const trimTargets = ['workers', 'workerAttendance', 'materialPurchases', 'transportationExpenses'];
    for (const store of trimTargets) {
      const freed = await trimOldestRecords(store, 500);
      freedTotal += freed;
      if (freed > 0) {
        const canWrite = await testWrite();
        if (canWrite) {
          notifyUser('تم تنظيف التخزين بنجاح. يمكنك متابعة العمل.', 'default');
          return true;
        }
      }
    }

    notifyUser('فشل تنظيف التخزين. قد تحتاج لمسح بيانات المتصفح يدوياً.');
    return false;
  } catch (e) {
    return false;
  } finally {
    _recoveryInProgress = false;
  }
}

async function testWrite(): Promise<boolean> {
  try {
    const { getDB } = await import('./db');
    const db = await getDB();
    if (!db || typeof db.put !== 'function') return false;
    const testRecord = {
      key: '__quota_test__',
      timestamp: Date.now(),
      version: 'test',
      recordCount: 0,
    };
    await db.put('syncMetadata', testRecord);
    await db.delete('syncMetadata', '__quota_test__');
    return true;
  } catch {
    return false;
  }
}

export async function handleCorruption(): Promise<boolean> {
  if (_recoveryInProgress) return false;
  _recoveryInProgress = true;

  notifyUser('تم اكتشاف خلل في قاعدة البيانات المحلية. جاري الإصلاح...');

  try {
    const { closeDB, deleteDB, initializeDB } = await import('./db');

    closeDB();

    try {
      await deleteDB();
    } catch (e) {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('binarjoin-db');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => {
          resolve();
        };
      });
    }

    await initializeDB();
    const { resetInitState } = await import('./storage-factory');
    resetInitState();
    notifyUser('تم إصلاح قاعدة البيانات المحلية. سيتم إعادة مزامنة البيانات.', 'default');
    return true;
  } catch (e) {
    notifyUser('فشل إصلاح قاعدة البيانات. يرجى مسح بيانات المتصفح وإعادة تسجيل الدخول.');
    return false;
  } finally {
    _recoveryInProgress = false;
  }
}

export async function handleStorageError(error: unknown): Promise<boolean> {
  if (isQuotaExceededError(error)) {
    return await handleQuotaExceeded();
  }
  if (isCorruptionError(error)) {
    return await handleCorruption();
  }
  return false;
}
