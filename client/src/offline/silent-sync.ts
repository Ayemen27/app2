import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { smartGet, smartPut } from './storage-factory';
import { apiRequest } from '../lib/queryClient';

let _isSyncing = false;

export async function runSilentSync() {
  if (_isSyncing) return;
  _isSyncing = true;
  try {
    await _executeSilentSync();
  } finally {
    _isSyncing = false;
  }
}

async function _executeSilentSync() {
  const queue = await getPendingSyncQueue();
  if (queue.length === 0) return;

  for (const item of queue) {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await apiRequest(item.endpoint, item.action === 'create' ? 'POST' : 'PATCH', item.payload);
      
      if (response.success) {
        await removeSyncQueueItem(item.id);
        
        const storeName = item.endpoint.split('/')[2];
        
        if (storeName && item.payload.id) {
          const localItem = await smartGet(storeName, item.payload.id);
          if (localItem) {
            localItem._pendingSync = false;
            localItem._isLocal = false;
            await smartPut(storeName, localItem);
          }
        }
      }
    } catch (error: any) {
      console.error(`[Silent-Sync] Failed ${item.id}:`, error);
      await updateSyncRetries(item.id, item.retries + 1, error.message, 'network');
    }
  }
}

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _onlineHandler: (() => void) | null = null;

export function initSilentSyncObserver(intervalMs = 30000) {
  if (_intervalId !== null) {
    return;
  }

  runSilentSync();
  
  _intervalId = setInterval(() => {
    if (navigator.onLine) {
      runSilentSync();
    }
  }, intervalMs);

  _onlineHandler = () => {
    runSilentSync();
  };
  window.addEventListener('online', _onlineHandler);
}

export function stopSilentSyncObserver() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_onlineHandler !== null) {
    window.removeEventListener('online', _onlineHandler);
    _onlineHandler = null;
  }
}
