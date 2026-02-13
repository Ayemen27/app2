import { v4 as uuidv4 } from 'uuid';
import {
  smartGet, smartGetAll, smartPut, smartAdd, smartDelete,
  smartClear, smartCount, smartSave, smartQuery
} from './storage-factory';

export async function queueForSync(
  action: 'create' | 'update' | 'delete',
  endpoint: string,
  payload: Record<string, any>
): Promise<string> {
  const id = uuidv4();

  const queueItem = {
    id,
    action,
    endpoint,
    payload,
    timestamp: Date.now(),
    retries: 0,
    lastError: undefined
  };

  await smartAdd('syncQueue', queueItem);
  return id;
}

export async function getPendingSyncQueue() {
  const allItems = await smartGetAll('syncQueue');
  return allItems.sort((a: any, b: any) => a.timestamp - b.timestamp);
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await smartDelete('syncQueue', id);
}

export async function updateSyncRetries(
  id: string,
  retries: number,
  error?: string,
  errorType?: string
): Promise<void> {
  const item = await smartGet('syncQueue', id);
  
  if (item) {
    item.retries = retries;
    if (error) {
      item.lastError = error;
    }
    if (errorType) {
      item.errorType = errorType;
    }
    await smartPut('syncQueue', item);
  }
}

export async function cancelSyncQueueItem(id: string): Promise<void> {
  await smartDelete('syncQueue', id);
}

export async function cancelAllSyncQueueItems(): Promise<number> {
  const items = await getPendingSyncQueue();
  const count = items.length;
  await smartClear('syncQueue');
  return count;
}

export async function saveUserDataLocal(
  type: string,
  data: Record<string, any>
): Promise<string> {
  const id = data.id || uuidv4();

  const userData = {
    id,
    type,
    data,
    syncedAt: 0,
    createdAt: Date.now()
  };

  await smartPut('userData', userData);
  return id;
}

export async function getUserDataLocal(type: string) {
  return await smartQuery('userData', (item: any) => item.type === type);
}

export async function saveListLocal(
  storeName: string,
  items: Record<string, any>[],
  metadata?: { syncedAt: number; totalCount: number }
): Promise<void> {
  await smartClear(storeName);

  const enrichedItems = items.map(item => ({
    ...item,
    createdAt: item.createdAt || Date.now(),
    _syncedAt: metadata?.syncedAt || Date.now()
  }));

  await smartSave(storeName, enrichedItems);
}

export async function getListLocal(storeName: string) {
  const items = await smartGetAll(storeName);
  return items.sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

export async function getItemLocal(storeName: string, id: string) {
  return await smartGet(storeName, id);
}

export async function updateItemLocal(
  storeName: string,
  id: string,
  updates: Record<string, any>
): Promise<void> {
  const item = await smartGet(storeName, id);

  if (item) {
    const updated = {
      ...item,
      ...updates,
      _updatedAt: Date.now()
    };
    await smartPut(storeName, updated);
  }
}

export async function addLocalFirst(
  storeName: string,
  item: Record<string, any>,
  endpoint: string
): Promise<string> {
  const id = item.id || uuidv4();
  
  const newItem = {
    ...item,
    id,
    _isLocal: true,
    _pendingSync: true,
    createdAt: item.createdAt || new Date().toISOString()
  };

  await smartPut(storeName, newItem);
  await queueForSync('create', endpoint, newItem);
  
  return id;
}

export async function updateLocalFirst(
  storeName: string,
  id: string,
  updates: Record<string, any>,
  endpoint: string
): Promise<void> {
  const item = await smartGet(storeName, id);
  
  if (item) {
    const updatedItem = {
      ...item,
      ...updates,
      _pendingSync: true,
      updatedAt: new Date().toISOString()
    };
    
    await smartPut(storeName, updatedItem);
    await queueForSync('update', `${endpoint}/${id}`, updates);
  }
}

export async function getSyncStats() {
  const pendingCount = await smartCount('syncQueue');
  const userDataCount = await smartCount('userData');

  return {
    pendingSync: pendingCount,
    localUserData: userDataCount,
    lastUpdate: Date.now()
  };
}
