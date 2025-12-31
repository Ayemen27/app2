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
  lastErrorType?: 'timeout' | 'network' | 'server' | 'validation' | 'unknown';
  lastErrorDetails?: any;
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
 * تحميل جميع بيانات الخادم للـ offline sync
 */
export async function loadFullBackup(): Promise<void> {
  try {
    console.log('📥 [Sync] جاري تحميل نسخة احتياطية كاملة...');
    const response = await fetch('/api/sync/full-backup');
    
    if (!response.ok) {
      throw new Error(`Failed to load backup: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Backup failed on server');
    }
    
    const { data } = result;
    const db = await getDB();
    
    // حفظ جميع البيانات في IndexedDB
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records) && tableName !== 'timestamp') {
        for (const record of records) {
          await db.put(tableName as any, record);
        }
      }
    }
    
    // تحديث metadata
    await db.put('syncMetadata', {
      key: 'lastSync',
      timestamp: Date.now(),
      version: '1.0',
      recordCount: result.recordCount || 0,
      lastSyncTime: Date.now()
    });
    
    console.log('✅ [Sync] تم تحميل النسخة الاحتياطية بنجاح');
  } catch (error: any) {
    console.error('❌ [Sync] خطأ في تحميل النسخة الاحتياطية:', error);
    throw error;
  }
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
    const errorType = classifyError(error);
    console.error(`❌ [Sync] خطأ عام (${errorType}):`, errorMsg);
    updateSyncState({ 
      lastError: errorMsg,
      lastErrorType: errorType,
      lastErrorDetails: error instanceof Error ? { message: error.message, stack: error.stack } : error,
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
        const errorType = classifySyncError(response.status);
        console.error(`❌ [Sync] فشل: ${item.endpoint} - ${response.status} (${errorType})`);
        failureCount++;
        
        // حفظ نوع الخطأ مع الرسالة
        const errorMsg = `[${errorType}] ${error.substring(0, 100)}`;
        
        if (item.retries < MAX_RETRIES && response.status < 500) {
          await updateSyncRetries(item.id, item.retries + 1, errorMsg, errorType);
        } else if (response.status >= 500 && item.retries < MAX_RETRIES) {
          await updateSyncRetries(item.id, item.retries + 1, errorMsg, errorType);
        } else if (response.status >= 400 && response.status < 500) {
          // خطأ في البيانات - لا داعي لإعادة المحاولة
          await updateSyncRetries(item.id, MAX_RETRIES + 1, errorMsg, errorType);
        }
      }
    } catch (error) {
      failureCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorType = classifyError(error);
      console.error(`❌ [Sync] خطأ في المزامنة (${errorType}):`, errorMsg);
      
      if (item.retries < MAX_RETRIES && errorType !== 'network') {
        await updateSyncRetries(item.id, item.retries + 1, errorMsg, errorType);
      } else if (errorType === 'network') {
        // خطأ شبكة فعلي - حاول لاحقاً
        await updateSyncRetries(item.id, item.retries + 1, errorMsg, errorType);
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

/**
 * تصنيف نوع الخطأ
 */
function classifyError(error: any): 'timeout' | 'network' | 'server' | 'validation' | 'unknown' {
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
    return 'timeout';
  } else if (errorMsg.includes('Network') || errorMsg.includes('Failed to fetch') || errorMsg.includes('offline')) {
    return 'network';
  } else if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
    return 'server';
  } else if (errorMsg.includes('400') || errorMsg.includes('validation') || errorMsg.includes('invalid')) {
    return 'validation';
  }
  
  return 'unknown';
}

/**
 * تصنيف خطأ المزامنة حسب رمز HTTP
 */
function classifySyncError(status: number): 'timeout' | 'network' | 'server' | 'validation' | 'unknown' {
  if (status === 408 || status === 504) {
    return 'timeout';
  } else if (status >= 500) {
    return 'server';
  } else if (status >= 400 && status < 500) {
    return 'validation';
  }
  return 'unknown';
}
