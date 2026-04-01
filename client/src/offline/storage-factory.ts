import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';

function isNative(): boolean {
  try {
    const p = Capacitor.getPlatform();
    return p === 'android' || p === 'ios';
  } catch {
    return false;
  }
}

let _initPromise: Promise<void> | null = null;

async function getIDB() {
  const { getDB: getIDBInstance } = await import('./db');
  return await getIDBInstance();
}

export function resetInitState() {
  _initPromise = null;
}

export async function initializeStorage() {
  if (!_initPromise) {
    _initPromise = isNative()
      ? nativeStorage.waitForReady()
      : getIDB().then(() => {});
  }
  await _initPromise;
}

async function ensureInitialized() {
  if (!_initPromise) {
    await initializeStorage();
  } else {
    await _initPromise;
  }
}

export async function smartGet(tableName: string, id: string): Promise<any | null> {
  await ensureInitialized();
  if (isNative()) {
    return await nativeStorage.get(tableName, id);
  }
  const db = await getIDB();
  try {
    if (!db.objectStoreNames.contains(tableName)) return null;
    return await db.get(tableName as any, id);
  } catch {
    return null;
  }
}

export async function smartGetAll(tableName: string): Promise<any[]> {
  await ensureInitialized();
  if (isNative()) {
    return await nativeStorage.getAll(tableName);
  }
  const db = await getIDB();
  try {
    if (!db.objectStoreNames.contains(tableName)) return [];
    return await db.getAll(tableName as any);
  } catch {
    return [];
  }
}

export async function smartPut(tableName: string, record: any): Promise<void> {
  await ensureInitialized();
  const id = (record.id || record.key || '').toString();
  if (!id) return;
  
  if (isNative()) {
    await nativeStorage.set(tableName, id, record);
  } else {
    const db = await getIDB();
    if (!db.objectStoreNames.contains(tableName)) {
      return;
    }
    try {
      await db.put(tableName as any, record);
    } catch (error) {
      const { isQuotaExceededError, isCorruptionError, handleStorageError } = await import('./storage-recovery');
      if (isQuotaExceededError(error) || isCorruptionError(error)) {
        const recovered = await handleStorageError(error);
        if (recovered) {
          const retryDb = await getIDB();
          await retryDb.put(tableName as any, record);
          return;
        }
      }
      throw error;
    }
  }
}

export async function smartAdd(tableName: string, record: any): Promise<void> {
  await ensureInitialized();
  const id = (record.id || record.key || '').toString();
  if (!id) return;
  
  if (isNative()) {
    await nativeStorage.set(tableName, id, record);
  } else {
    try {
      const db = await getIDB();
      await db.add(tableName as any, record);
    } catch (error: any) {
      const { isQuotaExceededError, isCorruptionError, handleStorageError } = await import('./storage-recovery');
      if (isQuotaExceededError(error) || isCorruptionError(error)) {
        const recovered = await handleStorageError(error);
        if (recovered) {
          const db = await getIDB();
          await db.add(tableName as any, record);
          return;
        }
      }
      throw error;
    }
  }
}

export async function smartDelete(tableName: string, id: string): Promise<void> {
  await ensureInitialized();
  if (isNative()) {
    await nativeStorage.delete(tableName, id);
  } else {
    try {
      const db = await getIDB();
      await db.delete(tableName as any, id);
    } catch (error: any) {
      const { isCorruptionError, handleStorageError } = await import('./storage-recovery');
      if (isCorruptionError(error)) {
        await handleStorageError(error);
      }
      throw error;
    }
  }
}

export async function smartClear(tableName: string): Promise<void> {
  await ensureInitialized();
  if (isNative()) {
    await nativeStorage.clearTable(tableName);
  } else {
    const db = await getIDB();
    try {
      await db.clear(tableName as any);
    } catch (e: any) {
      const { isCorruptionError, handleStorageError } = await import('./storage-recovery');
      if (isCorruptionError(e)) {
        await handleStorageError(e);
        return;
      }
    }
  }
}

export async function smartCount(tableName: string): Promise<number> {
  await ensureInitialized();
  if (isNative()) {
    return await nativeStorage.count(tableName);
  }
  const db = await getIDB();
  try {
    return await db.count(tableName as any);
  } catch {
    return 0;
  }
}

export async function smartSave(tableName: string, records: any[]): Promise<number> {
  if (!records || records.length === 0) return 0;
  await ensureInitialized();
  if (isNative()) {
    let count = 0;
    for (const record of records) {
      if (record && (record.id || record.key)) {
        const id = (record.id || record.key).toString();
        await nativeStorage.set(tableName, id, record);
        count++;
      }
    }
    return count;
  } else {
    const db = await getIDB();
    if (!db.objectStoreNames.contains(tableName)) {
      return 0;
    }
    let count = 0;
    try {
      const tx = db.transaction(tableName as any, 'readwrite');
      const store = tx.objectStore(tableName as any);
      for (const record of records) {
        if (record && (record.id || record.key)) {
          try {
            store.put(record);
            count++;
          } catch (e) {
          }
        }
      }
      await tx.done;
    } catch (e) {
      const { isQuotaExceededError, isCorruptionError, handleStorageError } = await import('./storage-recovery');
      if (isQuotaExceededError(e) || isCorruptionError(e)) {
        const recovered = await handleStorageError(e);
        if (recovered) {
          const retryDb = await getIDB();
          let retryCount = 0;
          const retryTx = retryDb.transaction(tableName as any, 'readwrite');
          const retryStore = retryTx.objectStore(tableName as any);
          for (const record of records) {
            if (record && (record.id || record.key)) {
              try {
                retryStore.put(record);
                retryCount++;
              } catch {
              }
            }
          }
          await retryTx.done;
          return retryCount;
        }
      }
      for (const record of records) {
        if (record && (record.id || record.key)) {
          try {
            await db.put(tableName as any, record);
            count++;
          } catch (putErr) {
          }
        }
      }
    }
    return count;
  }
}

export async function smartQuery(tableName: string, filterFn: (item: any) => boolean): Promise<any[]> {
  await ensureInitialized();
  if (isNative()) {
    return await nativeStorage.query(tableName, filterFn);
  }
  const db = await getIDB();
  try {
    const all = await db.getAll(tableName as any);
    return all.filter(filterFn);
  } catch {
    return [];
  }
}

export async function smartBulkSave(tableName: string, records: any[], clearFirst: boolean = false): Promise<number> {
  if (clearFirst) {
    await smartClear(tableName);
  }
  return await smartSave(tableName, records);
}

export async function smartGetAllKeys(tableName: string): Promise<string[]> {
  await ensureInitialized();
  if (isNative()) {
    const all = await nativeStorage.getAll(tableName);
    return all.map((r: any) => (r.id || r.key || '').toString()).filter(Boolean);
  }
  const db = await getIDB();
  try {
    const keys = await db.getAllKeys(tableName as any);
    return keys.map((k: any) => k.toString());
  } catch {
    return [];
  }
}
