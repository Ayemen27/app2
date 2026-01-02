import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { getDB, saveSyncedData } from './db';
import { clearAllLocalData } from './data-cleanup';
import { detectConflict, resolveConflict, logConflict } from './conflict-resolver';
import { apiRequest } from '../lib/queryClient';

const MAX_RETRIES = 5;
const INITIAL_SYNC_DELAY = 2000; 
let isSyncing = false;
let syncListeners: ((state: SyncState) => void)[] = [];
let syncInterval: NodeJS.Timeout | null = null;

export interface SyncState {
  isSyncing: boolean;
  lastSync: number;
  pendingCount: number;
  lastError?: string;
  isOnline: boolean;
  syncedCount?: number;
  failedCount?: number;
}

let currentSyncState: SyncState = {
  isSyncing: false,
  lastSync: 0,
  pendingCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
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

/**
 * 📥 سحب البيانات الكاملة من الخادم لمرة واحدة (التكامل التام)
 */
export async function performInitialDataPull(): Promise<boolean> {
  if (!navigator.onLine) {
    console.warn('📡 [Sync] لا يمكن السحب الأولي بدون إنترنت');
    return false;
  }

  try {
    console.log('📥 [Sync] بدء سحب البيانات الكاملة من الخادم...');
    updateSyncState({ isSyncing: true });

    const result = await apiRequest('/api/sync/full-backup', 'GET');
    
    if (!result || !result.success || !result.data) {
      console.error('❌ [Sync] فشل جلب البيانات من السيرفر');
      return false;
    }

    const { data } = result;
    const db = await getDB();

    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        await saveSyncedData(tableName, records);
        console.log(`✅ [Sync] تم مزامنة ${records.length} سجل في ${tableName}`);
      }
    }

    await db.put('syncMetadata', {
      key: 'lastSync',
      timestamp: Date.now(),
      version: '3.0',
      recordCount: result.recordCount || 0
    });

    console.log('🎉 [Sync] اكتملت المزامنة الأولية بنجاح!');
    updateSyncState({ isSyncing: false, lastSync: Date.now() });
    return true;
  } catch (error) {
    console.error('❌ [Sync] خطأ في المزامنة الأولية:', error);
    updateSyncState({ isSyncing: false });
    return false;
  }
}

/**
 * مزامنة جميع البيانات المعلقة
 */
export async function syncOfflineData(): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) {
    updateSyncState({ isOnline: false });
    return;
  }

  isSyncing = true;
  updateSyncState({ isSyncing: true, isOnline: true });

  try {
    const pending = await getPendingSyncQueue();
    if (pending.length === 0) {
      updateSyncState({ isSyncing: false });
      isSyncing = false;
      return;
    }

    console.log(`🔄 [Sync] جاري مزامنة ${pending.length} عملية...`);
    
    let successCount = 0;
    for (const item of pending) {
      try {
        const result = await apiRequest(item.endpoint, item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE', item.payload);
        if (result) {
          await removeSyncQueueItem(item.id);
          successCount++;
        }
      } catch (e) {
        console.error('❌ [Sync] فشل مزامنة عنصر:', e);
      }
    }

    updateSyncState({ 
      lastSync: Date.now(),
      isSyncing: false,
      syncedCount: successCount
    });
  } catch (error) {
    console.error('❌ [Sync] خطأ في المزامنة:', error);
    updateSyncState({ isSyncing: false });
  } finally {
    isSyncing = false;
  }
}

/**
 * تهيئة مستمع المزامنة
 */
export function initSyncListener(): void {
  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    performInitialDataPull();
    syncOfflineData();
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });

  setTimeout(() => {
    performInitialDataPull();
    syncOfflineData();
  }, INITIAL_SYNC_DELAY);

  setInterval(() => {
    if (navigator.onLine) syncOfflineData();
  }, 60000);
}

export function stopSyncListener(): void {
  if (syncInterval) clearInterval(syncInterval);
}

export function triggerSync() {
  syncOfflineData().catch(err => console.error('❌ [Sync] خطأ في المزامنة الفورية:', err));
}

export function startBackgroundSync(): void {
  if (isSyncing) return;
  syncOfflineData().catch(err => {
    console.error('❌ [Sync] فشل المزامنة الخلفية:', err);
  });
}
