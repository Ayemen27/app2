import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { getDB, saveSyncedData } from './db';
import { clearAllLocalData } from './data-cleanup';
import { detectConflict, resolveConflict, logConflict } from './conflict-resolver';
import { apiRequest } from '../lib/queryClient';
import { smartSave } from './storage-factory';
import { intelligentMonitor } from './intelligent-monitor';

const MAX_RETRIES = 5;
const INITIAL_SYNC_DELAY = 2000; 
let isSyncing = false;
let syncListeners: ((state: SyncState) => void)[] = [];
let syncInterval: NodeJS.Timeout | null = null;
let retryCount = 0;

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
 * حساب وقت الانتظار (Exponential Backoff)
 */
function getBackoffDelay(retries: number): number {
  return Math.min(30000, INITIAL_SYNC_DELAY * Math.pow(2, retries));
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

    // 1. مزامنة المستخدمين أولاً لضمان عمل Auth
    if (data.users && Array.isArray(data.users)) {
      await smartSave('users', data.users);
      console.log(`✅ [Sync] تم مزامنة ${data.users.length} مستخدم لضمان الدخول Offline`);
    }

    // 2. مزامنة بقية الجداول
    for (const [tableName, records] of Object.entries(data)) {
      if (tableName !== 'users' && Array.isArray(records)) {
        await smartSave(tableName, records);
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
      retryCount = 0;
      return;
    }

    console.log(`🔄 [Sync] جاري مزامنة ${pending.length} عملية...`);
    
    let successCount = 0;
    for (const item of pending) {
      try {
        const result = await apiRequest(item.endpoint, item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE', item.payload);
        if (result) {
          await removeSyncQueueItem(item.id);
          
          const db = await getDB();
          const recordId = item.payload.id;
          const tableName = item.endpoint.split('/')[2]; 
          
          if (tableName && recordId) {
            const tx = db.transaction(tableName as any, 'readwrite');
            const store = tx.objectStore(tableName as any);
            const record = await store.get(recordId);
            if (record) {
              record.synced = true;
              record._pendingSync = false;
              record._isLocal = false;
              await store.put(record);
            }
            await tx.done;
          }
          
          successCount++;
        }
      } catch (e) {
        retryCount++;
        const delay = getBackoffDelay(retryCount);
        
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: retryCount > 3 ? 'high' : 'medium',
          message: `فشل مزامنة عنصر: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`,
          metadata: { retryCount, nextRetryDelay: delay, itemId: item.id }
        });

        await new Promise(resolve => setTimeout(resolve, delay));
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
    
    intelligentMonitor.logEvent({
      type: 'error',
      severity: 'high',
      message: `خطأ حرج في محرك المزامنة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
    });
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

  const runSync = async () => {
    console.log('🚀 [Sync] بدء المزامنة التلقائية الفورية...');
    await performInitialDataPull();
    await syncOfflineData();
  };

  runSync();

  setInterval(() => {
    if (navigator.onLine) syncOfflineData();
  }, 30000);
}

export function stopSyncListener(): void {
  if (syncInterval) clearInterval(syncInterval);
}

export function triggerSync() {
  syncOfflineData().catch(err => console.error('❌ [Sync] خطأ في المزامنة الفورية:', err));
}

export async function loadFullBackup(): Promise<{ recordCount: number }> {
  try {
    console.log('📥 [Sync] جاري تحميل نسخة احتياطية كاملة من الخادم...');
    const result = await apiRequest('/api/sync/full-backup', 'GET');
    
    if (!result.success) {
      throw new Error('Backup failed on server');
    }
    
    const { data, recordCount } = result;
    const db = await getDB();
    
    let totalSaved = 0;
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records) && tableName !== 'timestamp') {
        const savedCount = await smartSave(tableName, records);
        totalSaved += savedCount;
        console.log(`✅ [Sync] تم حفظ ${savedCount} سجل من ${tableName}`);
      }
    }
    
    await db.put('syncMetadata', {
      key: 'lastSync',
      timestamp: Date.now(),
      version: '3.0',
      recordCount: totalSaved
    });
    
    return { recordCount: totalSaved };
  } catch (error: any) {
    console.error('❌ [Sync] خطأ في تحميل النسخة الاحتياطية:', error);
    throw error;
  }
}

export function startBackgroundSync(): void {
  if (isSyncing) return;
  syncOfflineData().catch(err => {
    console.error('❌ [Sync] فشل المزامنة الخلفية:', err);
  });
}
