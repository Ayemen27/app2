import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { smartGet, smartPut } from './storage-factory';
import { apiRequest } from '../lib/queryClient';

export async function runSilentSync() {
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

export function initSilentSyncObserver(intervalMs = 30000) {
  runSilentSync();
  
  setInterval(() => {
    if (navigator.onLine) {
      runSilentSync();
    }
  }, intervalMs);

  window.addEventListener('online', () => {
    runSilentSync();
  });
}
