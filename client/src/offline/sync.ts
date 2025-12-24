import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { getDB } from './db';

const MAX_RETRIES = 3;
let isSyncing = false;
let syncListeners: ((state: SyncState) => void)[] = [];

export interface SyncState {
  isSyncing: boolean;
  lastSync: number;
  pendingCount: number;
  lastError?: string;
}

let currentSyncState: SyncState = {
  isSyncing: false,
  lastSync: 0,
  pendingCount: 0
};

export function subscribeSyncState(listener: (state: SyncState) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function updateSyncState(updates: Partial<SyncState>) {
  currentSyncState = { ...currentSyncState, ...updates };
  syncListeners.forEach(listener => listener(currentSyncState));
}

export function getSyncState(): SyncState {
  return { ...currentSyncState };
}

export async function syncOfflineData(): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  isSyncing = true;
  updateSyncState({ isSyncing: true });

  try {
    const pending = await getPendingSyncQueue();

    if (pending.length === 0) {
      updateSyncState({ 
        lastSync: Date.now(),
        pendingCount: 0,
        isSyncing: false 
      });
      isSyncing = false;
      return;
    }

    updateSyncState({ pendingCount: pending.length });

    let successCount = 0;
    let failureCount = 0;

    for (const item of pending) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.action === 'delete' ? 'DELETE' : item.action === 'create' ? 'POST' : 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
          },
          body: item.action === 'delete' ? undefined : JSON.stringify(item.payload)
        });

        if (response.ok) {
          await removeSyncQueueItem(item.id);
          successCount++;
        } else {
          const error = await response.text();
          failureCount++;
          if (item.retries < MAX_RETRIES) {
            await updateSyncRetries(item.id, item.retries + 1, error);
          }
        }
      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (item.retries < MAX_RETRIES) {
          await updateSyncRetries(item.id, item.retries + 1, errorMsg);
        }
      }
    }

    updateSyncState({ 
      lastSync: Date.now(),
      pendingCount: failureCount,
      isSyncing: false 
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    updateSyncState({ 
      lastError: errorMsg,
      isSyncing: false 
    });
  } finally {
    isSyncing = false;
  }
}

export function initSyncListener(): void {
  window.addEventListener('online', () => {
    syncOfflineData().catch(console.error);
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isSyncing: false });
  });

  if (navigator.onLine) {
    syncOfflineData().catch(console.error);
  }
}
