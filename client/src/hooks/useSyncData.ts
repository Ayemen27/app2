import { useState, useEffect, useCallback } from 'react';
import { 
  subscribeSyncState, 
  getSyncState, 
  initSyncListener, 
  syncOfflineData 
} from '@/offline/sync';
import { getSyncStats } from '@/offline/offline';

export interface UseSyncDataReturn {
  isSyncing: boolean;
  offlineCount: number;
  lastSync: number;
  lastError?: string;
  isOnline: boolean;
  manualSync: () => Promise<void>;
}

/**
 * Hook لمراقبة حالة المزامنة والاتصال بالإنترنت
 * 
 * @returns {UseSyncDataReturn} حالة المزامنة والعمليات
 * 
 * @example
 * ```typescript
 * const { isSyncing, offlineCount, isOnline } = useSyncData();
 * 
 * return (
 *   <div>
 *     {!isOnline && <p>❌ بدون إنترنت</p>}
 *     {isSyncing && <p>🔄 جاري المزامنة...</p>}
 *     {offlineCount > 0 && <p>⏳ عمليات معلقة: {offlineCount}</p>}
 *   </div>
 * );
 * ```
 */
export function useSyncData(): UseSyncDataReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [lastSync, setLastSync] = useState(0);
  const [lastError, setLastError] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // تحديث حالة المزامنة من المحرك
  useEffect(() => {
    // تهيئة مراقب الاتصال في المرة الأولى
    initSyncListener();

    // الاشتراك في التحديثات
    const unsubscribe = subscribeSyncState(state => {
      setIsSyncing(state.isSyncing);
      setLastSync(state.lastSync);
      setLastError(state.lastError);
      
      // تحديث عدد العمليات المعلقة
      if (state.pendingCount >= 0) {
        setOfflineCount(state.pendingCount);
      }
    });

    return unsubscribe;
  }, []);

  // مراقبة حالة الاتصال بالإنترنت
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[useSyncData] ✅ الاتصال متصل');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[useSyncData] ❌ الاتصال منقطع');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحديث عدد العمليات المعلقة بشكل دوري
  useEffect(() => {
    const updateCount = async () => {
      try {
        const stats = await getSyncStats();
        setOfflineCount(stats.pendingSync);
      } catch (err) {
        console.error('[useSyncData] خطأ في جلب الإحصائيات:', err);
      }
    };

    // تحديث عند تحميل الـ hook
    updateCount();

    // تحديث دوري كل 5 ثوان
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // دالة للمزامنة اليدوية
  const manualSync = useCallback(async () => {
    console.log('[useSyncData] بدء مزامنة يدوية');
    await syncOfflineData();
  }, []);

  return {
    isSyncing,
    offlineCount,
    lastSync,
    lastError,
    isOnline,
    manualSync
  };
}
