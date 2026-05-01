import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';
import { compareHlc } from '../../../shared/hlc';
import { intelligentMonitor } from './intelligent-monitor';

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

/**
 * 🪦 smartReconcile - مزامنة جدول كامل مع السيرفر:
 *  - يضيف/يحدّث السجلات الواردة
 *  - يحذف من المحلي أي سجل غير موجود في الاستجابة (= soft-deleted على السيرفر)
 *  - يحترم السجلات المحلية المعلّقة (_pendingSync) فلا يلمسها
 */
export async function smartReconcile(tableName: string, serverRecords: any[]): Promise<{ saved: number; removed: number }> {
  await ensureInitialized();
  const incomingIds = new Set(
    (serverRecords || [])
      .filter((r: any) => r && (r.id || r.key))
      .map((r: any) => (r.id || r.key).toString())
  );
  let saved = 0;
  let removed = 0;

  if (isNative()) {
    const existing = await nativeStorage.getAll(tableName);
    const localMap = new Map<string, any>();
    for (const rec of existing) {
      if (rec) {
        const id = (rec.id || rec.key)?.toString();
        if (id) localMap.set(id, rec);
      }
    }

    for (const rec of existing) {
      if (!rec) continue;
      const id = (rec.id || rec.key)?.toString();
      if (id && !incomingIds.has(id) && !rec._pendingSync) {
        await nativeStorage.delete(tableName, id);
        removed++;
      }
    }

    for (const record of (serverRecords || [])) {
      if (record && (record.id || record.key)) {
        const id = (record.id || record.key).toString();
        const existingLocal = localMap.get(id);

        if (existingLocal?._pendingSync) {
          const remoteHlc = record.hlc_timestamp || record.hlcTimestamp;
          const localHlc = existingLocal.hlc_timestamp || existingLocal.hlcTimestamp;

          if (compareHlc(localHlc, remoteHlc) > 0) {
            // Local is newer, keep local and skip
            intelligentMonitor.logEvent({
              type: 'sync',
              severity: 'low',
              message: `Sync overwrite prevented for ${tableName}:${id} (Local HLC is newer)`,
              metadata: { tableName, id, localHlc, remoteHlc, reason: 'local_newer' }
            });
            continue;
          } else {
            // Remote is newer or tie, but we have pending sync. 
            // Mark conflict and keep local version to avoid losing user's unsynced changes
            intelligentMonitor.logEvent({
              type: 'sync',
              severity: 'medium',
              message: `Conflict detected for ${tableName}:${id} (Remote is newer but local has pending changes)`,
              metadata: { tableName, id, localHlc, remoteHlc, reason: 'conflict_pending' }
            });
            await nativeStorage.set(tableName, id, { ...existingLocal, _conflictDetected: true });
            continue;
          }
        }

        await nativeStorage.set(tableName, id, record);
        saved++;
      }
    }
    return { saved, removed };
  }

  const db = await getIDB();
  if (!db.objectStoreNames.contains(tableName)) return { saved: 0, removed: 0 };
  try {
    const tx = db.transaction(tableName as any, 'readwrite');
    const store = tx.objectStore(tableName as any);
    const allLocal = await store.getAll();
    const localMap = new Map<string, any>();
    for (const rec of allLocal) {
      if (rec) {
        const id = (rec.id || rec.key)?.toString();
        if (id) localMap.set(id, rec);
      }
    }

    for (const rec of allLocal) {
      if (!rec) continue;
      const id = (rec.id || rec.key)?.toString();
      if (id && !incomingIds.has(id) && !rec._pendingSync) {
        try { store.delete(id); removed++; } catch {}
      }
    }

    for (const record of (serverRecords || [])) {
      if (record && (record.id || record.key)) {
        const id = (record.id || record.key).toString();
        const existingLocal = localMap.get(id);

        if (existingLocal?._pendingSync) {
          const remoteHlc = record.hlc_timestamp || record.hlcTimestamp;
          const localHlc = existingLocal.hlc_timestamp || existingLocal.hlcTimestamp;

          if (compareHlc(localHlc, remoteHlc) > 0) {
            intelligentMonitor.logEvent({
              type: 'sync',
              severity: 'low',
              message: `Sync overwrite prevented for ${tableName}:${id} (Local HLC is newer)`,
              metadata: { tableName, id, localHlc, remoteHlc, reason: 'local_newer' }
            });
            continue;
          } else {
            intelligentMonitor.logEvent({
              type: 'sync',
              severity: 'medium',
              message: `Conflict detected for ${tableName}:${id} (Remote is newer but local has pending changes)`,
              metadata: { tableName, id, localHlc, remoteHlc, reason: 'conflict_pending' }
            });
            try { store.put({ ...existingLocal, _conflictDetected: true }); } catch {}
            continue;
          }
        }

        try { store.put(record); saved++; } catch {}
      }
    }
    await tx.done;
  } catch (e) {
    console.warn('[smartReconcile] error:', e);
  }
  return { saved, removed };
}

/**
 * 🔄 applyServerRecordsWithTombstones - تطبيق ردود delta-sync:
 *  - السجلات التي فيها deleted_at != null تُحذف محليًا (شواهد حذف صريحة)
 *  - السجلات الحية تُحفظ مع احترام HLC للتعارض مع التغييرات المعلّقة محليًا
 *  - لا يوجد diff؛ نعتمد فقط على ما يرسله الخادم
 *  - مناسبة لـ delta sync (not full pull) — للـ full pull استخدم smartReconcile مرة واحدة فقط
 */
export async function applyServerRecordsWithTombstones(
  tableName: string,
  serverRecords: any[],
): Promise<{ saved: number; deleted: number; conflicts: number; skipped: number }> {
  await ensureInitialized();
  let saved = 0;
  let deleted = 0;
  let conflicts = 0;
  let skipped = 0;

  if (!Array.isArray(serverRecords) || serverRecords.length === 0) {
    return { saved, deleted, conflicts, skipped };
  }

  const isDeleted = (r: any): boolean => {
    const v = r?.deleted_at ?? r?.deletedAt;
    return !!v && v !== '0' && v !== 0;
  };

  if (isNative()) {
    for (const record of serverRecords) {
      if (!record || (!record.id && !record.key)) {
        skipped++;
        continue;
      }
      const id = (record.id || record.key).toString();

      try {
        if (isDeleted(record)) {
          const existing = await nativeStorage.get(tableName, id);
          if (existing?._pendingSync) {
            skipped++;
            continue;
          }
          await nativeStorage.delete(tableName, id);
          deleted++;
          continue;
        }

        const existing = await nativeStorage.get(tableName, id);
        if (existing?._pendingSync) {
          const remoteHlc = record.hlc_timestamp || record.hlcTimestamp;
          const localHlc = existing.hlc_timestamp || existing.hlcTimestamp;
          if (compareHlc(localHlc, remoteHlc) > 0) {
            skipped++;
            continue;
          }
          await nativeStorage.set(tableName, id, { ...existing, _conflictDetected: true });
          conflicts++;
          continue;
        }

        await nativeStorage.set(tableName, id, record);
        saved++;
      } catch (err: any) {
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: 'low',
          message: `[applyServerRecords] failed for ${tableName}:${id}`,
          metadata: { error: err?.message ?? err },
        });
        skipped++;
      }
    }
    return { saved, deleted, conflicts, skipped };
  }

  const db = await getIDB();
  if (!db.objectStoreNames.contains(tableName)) return { saved, deleted, conflicts, skipped };

  try {
    const tx = db.transaction(tableName as any, 'readwrite');
    const store = tx.objectStore(tableName as any);

    for (const record of serverRecords) {
      if (!record || (!record.id && !record.key)) {
        skipped++;
        continue;
      }
      const id = (record.id || record.key).toString();

      try {
        if (isDeleted(record)) {
          const existing = await store.get(id);
          if (existing?._pendingSync) {
            skipped++;
            continue;
          }
          try { store.delete(id); deleted++; } catch { skipped++; }
          continue;
        }

        const existing = await store.get(id);
        if (existing?._pendingSync) {
          const remoteHlc = record.hlc_timestamp || record.hlcTimestamp;
          const localHlc = existing.hlc_timestamp || existing.hlcTimestamp;
          if (compareHlc(localHlc, remoteHlc) > 0) {
            skipped++;
            continue;
          }
          try { store.put({ ...existing, _conflictDetected: true }); conflicts++; } catch { skipped++; }
          continue;
        }

        try { store.put(record); saved++; } catch { skipped++; }
      } catch {
        skipped++;
      }
    }

    await tx.done;
  } catch (e) {
    console.warn('[applyServerRecordsWithTombstones] tx error:', e);
  }

  return { saved, deleted, conflicts, skipped };
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

/**
 * 🚀 smartQueryByColumn - استعلام مفهرس عبر عمود علاقي حقيقي.
 *
 * Native (SQLite): يستخدم WHERE column = value مع index → أداء × N.
 * Web (IDB): يحاول استخدام index الـ object store إن وُجد، وإلا يفلتر في الذاكرة.
 *
 * مناسب فقط للجداول المعرّفة في `RELATIONAL_COLUMNS_MAP` (workers, projects،
 * materialPurchases, fundTransfers, workerAttendance, suppliers, equipment).
 *
 * @example const list = await smartQueryByColumn('workers', 'project_id', projId);
 */
export async function smartQueryByColumn(
  tableName: string,
  column: string,
  value: any,
): Promise<any[]> {
  await ensureInitialized();

  if (isNative()) {
    return await (nativeStorage as any).queryByColumn(tableName, column, value);
  }

  // Web: نحاول index في IDB، ثم نقع على فلترة في الذاكرة
  const db = await getIDB();
  try {
    const tx = db.transaction(tableName as any, 'readonly');
    const store = tx.objectStore(tableName as any);
    try {
      const idx = store.index(column);
      const all = await idx.getAll(value);
      return all || [];
    } catch {
      // لا يوجد index بهذا الاسم - فلترة في الذاكرة
      const all = await store.getAll();
      const camel = column.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      return (all || []).filter((r: any) => r?.[column] === value || r?.[camel] === value);
    }
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
