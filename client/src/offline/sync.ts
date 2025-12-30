import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { getDB } from './db';
import { detectConflict, resolveConflict, logConflict } from './conflict-resolver';

const MAX_RETRIES = 5;
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
 * مزامنة جميع البيانات المعلقة
 */
export async function syncOfflineData(): Promise<void> {
  if (isSyncing) {
    console.log('🔄 [Sync] مزامنة قيد التنفيذ بالفعل');
    return;
  }
  
  if (!navigator.onLine) {
    console.log('📡 [Sync] لا يوجد اتصال بالإنترنت');
    updateSyncState({ isOnline: false });
    return;
  }

  isSyncing = true;
  updateSyncState({ isSyncing: true, isOnline: true });
  console.log('🔄 [Sync] بدء المزامنة...');

  try {
    const pending = await getPendingSyncQueue();

    if (pending.length === 0) {
      console.log('✅ [Sync] لا توجد بيانات معلقة');
      updateSyncState({ 
        lastSync: Date.now(),
        pendingCount: 0,
        isSyncing: false,
        syncedCount: 0,
        failedCount: 0
      });
      isSyncing = false;
      return;
    }

    console.log(`🔄 [Sync] جاري مزامنة ${pending.length} عملية...`);
    updateSyncState({ pendingCount: pending.length });

    let successCount = 0;
    let failureCount = 0;

    // محاولة استخدام batch endpoint أولاً
    const batchResult = await syncBatch(pending);
    if (batchResult.success) {
      successCount = batchResult.successCount;
      failureCount = batchResult.failureCount;
    } else {
      // إذا فشل batch، حاول واحدة تلو الأخرى
      const result = await syncIndividual(pending);
      successCount = result.successCount;
      failureCount = result.failureCount;
    }

    console.log(`✅ [Sync] انتهت المزامنة: ${successCount} نجحت، ${failureCount} فشلت`);
    updateSyncState({ 
      lastSync: Date.now(),
      pendingCount: failureCount,
      isSyncing: false,
      syncedCount: successCount,
      failedCount: failureCount
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ [Sync] خطأ عام:`, errorMsg);
    updateSyncState({ 
      lastError: errorMsg,
      isSyncing: false
    });
  } finally {
    isSyncing = false;
  }
}

/**
 * مزامنة batch - إرسال عمليات متعددة في طلب واحد
 */
async function syncBatch(pending: any[]) {
  try {
    const token = localStorage.getItem('accessToken');
    const url = `${window.location.origin}/api/sync/batch`;

    console.log(`🔄 [Sync] إرسال batch من ${pending.length} عملية...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        operations: pending.map(item => ({
          id: item.id,
          action: item.action,
          endpoint: item.endpoint,
          payload: item.payload,
          timestamp: item.timestamp
        }))
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ [Sync] فشل batch endpoint: ${response.status}`);
      return { success: false };
    }

    const result = await response.json();
    console.log(`✅ [Sync] نجح batch:`, result.stats);

    // معالجة النتائج
    for (const operation of result.results || []) {
      if (operation.success) {
        await removeSyncQueueItem(operation.id);
      } else {
        if (operation.conflict) {
          console.warn(`🚨 [Sync] تضارع في ${operation.id}: ${operation.conflictMessage}`);
          // حل التضارع
          await handleConflict(operation.id, operation.conflict);
        } else {
          await updateSyncRetries(operation.id, operation.retries || 1, operation.error);
        }
      }
    }

    return {
      success: true,
      successCount: result.stats?.successful || 0,
      failureCount: result.stats?.failed || 0
    };
  } catch (error) {
    console.error(`❌ [Sync] خطأ في batch:`, error);
    return { success: false };
  }
}

/**
 * مزامنة واحدة تلو الأخرى
 */
async function syncIndividual(pending: any[]) {
  let successCount = 0;
  let failureCount = 0;

  for (const item of pending) {
    try {
      const token = localStorage.getItem('accessToken');
      const url = item.endpoint.startsWith('http') 
        ? item.endpoint 
        : `${window.location.origin}${item.endpoint}`;

      console.log(`📤 [Sync] إرسال: ${item.action.toUpperCase()} ${item.endpoint}`);

      const response = await fetch(url, {
        method: item.action === 'delete' ? 'DELETE' : item.action === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: item.action === 'delete' ? undefined : JSON.stringify(item.payload)
      });

      if (response.ok) {
        console.log(`✅ [Sync] نجحت المزامنة: ${item.endpoint}`);
        await removeSyncQueueItem(item.id);
        successCount++;
      } else {
        const error = await response.text();
        console.error(`❌ [Sync] فشل: ${item.endpoint} - ${response.status}`);
        failureCount++;
        
        if (item.retries < MAX_RETRIES && response.status < 500) {
          await updateSyncRetries(item.id, item.retries + 1, error);
        } else if (response.status >= 500 && item.retries < MAX_RETRIES) {
          await updateSyncRetries(item.id, item.retries + 1, error);
        }
      }
    } catch (error) {
      failureCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [Sync] خطأ في المزامنة:`, errorMsg);
      
      if (item.retries < MAX_RETRIES) {
        await updateSyncRetries(item.id, item.retries + 1, errorMsg);
      }
    }
  }

  return { successCount, failureCount };
}

/**
 * معالجة التضارعات
 */
async function handleConflict(operationId: string, conflictData: any) {
  try {
    const conflict = {
      clientVersion: conflictData.clientVersion,
      serverVersion: conflictData.serverVersion,
      clientTimestamp: conflictData.clientTimestamp,
      serverTimestamp: conflictData.serverTimestamp
    };

    // استخدم Last-Write-Wins كاستراتيجية افتراضية
    const resolved = resolveConflict(conflict, { strategy: 'last-write-wins' });
    
    console.log(`✅ [Sync] تم حل التضارع: ${operationId}`);
    
    // حفظ القيمة المحلولة
    // يمكن تنفيذ logic إضافي هنا

    // حاول مزامنة العملية مجدداً
    await updateSyncRetries(operationId, 0);
    
    // سجل التضارع
    await logConflict('sync_operation', operationId, conflict, resolved);
  } catch (error) {
    console.error(`❌ [Sync] فشل حل التضارع:`, error);
  }
}

/**
 * تهيئة مستمع المزامنة
 */
export function initSyncListener(): void {
  console.log('🔌 [Sync] تفعيل نظام المزامنة...');

  const handleOnline = () => {
    console.log('📡 [Sync] تم استعادة الاتصال بالإنترنت!');
    updateSyncState({ isOnline: true });
    syncOfflineData().catch(console.error);
  };

  const handleOffline = () => {
    console.log('📡 [Sync] فقدان الاتصال بالإنترنت');
    updateSyncState({ isSyncing: false, isOnline: false });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // محاولة المزامنة كل 30 ثانية
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      syncOfflineData().catch(console.error);
    }
  }, 30000);

  if (navigator.onLine) {
    console.log('✅ [Sync] متصل بالإنترنت - بدء المزامنة الفوري');
    syncOfflineData().catch(console.error);
  }
}

/**
 * إيقاف مستمع المزامنة
 */
export function stopSyncListener(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  console.log('🛑 [Sync] توقف نظام المزامنة');
}
