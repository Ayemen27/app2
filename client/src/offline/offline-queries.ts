import {
  smartGet, smartGetAll, smartPut, smartDelete,
  smartCount, smartClear, smartQuery
} from './storage-factory';
import { ENTITY_STORES } from './store-registry';

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export async function getLocalRecord<T>(
  entityName: keyof typeof ENTITY_STORES,
  id: string
): Promise<T | null> {
  try {
    const storeName = ENTITY_STORES[entityName];
    if (!storeName) return null;
    return await smartGet(storeName, id);
  } catch (error) {
    return null;
  }
}

export async function saveLocalRecord(
  entityName: keyof typeof ENTITY_STORES,
  record: any
): Promise<boolean> {
  try {
    const storeName = ENTITY_STORES[entityName];
    if (!storeName) return false;
    await smartPut(storeName, record);
    return true;
  } catch (error) {
    return false;
  }
}

export async function deleteLocalRecord(
  entityName: keyof typeof ENTITY_STORES,
  id: string
): Promise<boolean> {
  try {
    const storeName = ENTITY_STORES[entityName];
    if (!storeName) return false;
    await smartDelete(storeName, id);
    return true;
  } catch (error) {
    return false;
  }
}

export async function isDataUpToDate(maxAge: number = 5 * 60 * 1000): Promise<boolean> {
  try {
    const metadata = await smartGet('syncMetadata', 'lastSync');
    
    if (!metadata) {
      return false;
    }

    const age = Date.now() - metadata.timestamp;
    return age < maxAge;
  } catch (error) {
    return false;
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  try {
    const metadata = await smartGet('syncMetadata', 'lastSync');
    return metadata?.timestamp || null;
  } catch (error) {
    return null;
  }
}

export type EntityName = keyof typeof ENTITY_STORES;

export async function getLocalDataStats(): Promise<Record<EntityName, number>> {
  const stats: Record<EntityName, number> = {} as any;

  for (const [entity, store] of Object.entries(ENTITY_STORES)) {
    try {
      stats[entity as EntityName] = await smartCount(store);
    } catch (error) {
      stats[entity as EntityName] = 0;
    }
  }

  return stats;
}

export async function cleanupOldLocalData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const cutoffTime = Date.now() - maxAge;

    for (const store of Object.values(ENTITY_STORES)) {
      const allRecords = await smartGetAll(store);
      for (const record of allRecords) {
        if (record.created_at && record.created_at < cutoffTime) {
          await smartDelete(store, record.id);
        }
      }
    }
  } catch (error) {
  }
}
