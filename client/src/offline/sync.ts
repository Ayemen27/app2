import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { getDB } from './db';

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
        isSyncing: false 
      });
      isSyncing = false;
      return;
    }

    console.log(`🔄 [Sync] جاري مزامنة ${pending.length} عملية...`);
    updateSyncState({ pendingCount: pending.length });

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
          
          // إعادة محاولة إذا كانت هناك رسالة تحت 500
          if (item.retries < MAX_RETRIES && response.status < 500) {
            await updateSyncRetries(item.id, item.retries + 1, error);
          } else if (response.status >= 500 && item.retries < MAX_RETRIES) {
            // محاولة أخرى لأخطاء الخادم
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

    console.log(`✅ [Sync] انتهت المزامنة: ${successCount} نجحت، ${failureCount} فشلت`);
    updateSyncState({ 
      lastSync: Date.now(),
      pendingCount: failureCount,
      isSyncing: false 
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

export function initSyncListener(): void {
  console.log('🔌 [Sync] تفعيل نظام المزامنة...');

  // الاستماع لحدث الاتصال بالإنترنت
  const handleOnline = () => {
    console.log('📡 [Sync] تم استعادة الاتصال بالإنترنت!');
    updateSyncState({ isOnline: true });
    // بدء المزامنة فوراً
    syncOfflineData().catch(console.error);
  };

  const handleOffline = () => {
    console.log('📡 [Sync] فقدان الاتصال بالإنترنت');
    updateSyncState({ isSyncing: false, isOnline: false });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // محاولة المزامنة كل 30 ثانية إذا كان هناك اتصال
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      syncOfflineData().catch(console.error);
    }
  }, 30000);

  // بدء المزامنة في البداية إذا كان هناك اتصال
  if (navigator.onLine) {
    console.log('✅ [Sync] متصل بالإنترنت - بدء المزامنة الفوري');
    syncOfflineData().catch(console.error);
  }
}
