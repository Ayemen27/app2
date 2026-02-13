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

export async function initializeStorage() {
  if (!_initPromise) {
    _initPromise = isNative()
      ? nativeStorage.initialize()
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
    await db.put(tableName as any, record);
  }
}

export async function smartAdd(tableName: string, record: any): Promise<void> {
  await ensureInitialized();
  const id = (record.id || record.key || '').toString();
  if (!id) return;
  
  if (isNative()) {
    await nativeStorage.set(tableName, id, record);
  } else {
    const db = await getIDB();
    await db.add(tableName as any, record);
  }
}

export async function smartDelete(tableName: string, id: string): Promise<void> {
  await ensureInitialized();
  if (isNative()) {
    await nativeStorage.delete(tableName, id);
  } else {
    const db = await getIDB();
    await db.delete(tableName as any, id);
  }
}

export async function smartClear(tableName: string): Promise<void> {
  await ensureInitialized();
  if (isNative()) {
    await nativeStorage.clearTable(tableName);
  } else {
    const db = await getIDB();
    const tx = db.transaction(tableName as any, 'readwrite');
    await tx.objectStore(tableName as any).clear();
    await tx.done;
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
    const { saveSyncedData } = await import('./db');
    return await saveSyncedData(tableName, records);
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
