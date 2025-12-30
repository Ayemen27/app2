import { useEffect, useState } from 'react';
import { subscribeSyncState, getSyncState, syncOfflineData } from '@/offline/sync';

export function useSyncData() {
  const [syncState, setSyncState] = useState(() => getSyncState());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // اشتراك في تحديثات حالة المزامنة
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState(state);
    });

    // مراقبة اتصال الإنترنت
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData().catch(console.error);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const manualSync = async () => {
    if (isOnline) {
      await syncOfflineData();
    }
  };

  return {
    isSyncing: syncState.isSyncing,
    offlineCount: syncState.pendingCount,
    lastSync: syncState.lastSync,
    lastError: syncState.lastError,
    isOnline,
    manualSync,
  };
}

// مكون لعرض حالة المزامنة
export function SyncStatus() {
  const { isSyncing, offlineCount, isOnline, lastSync } = useSyncData();

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
        ⚠️ بدون اتصال إنترنت {offlineCount > 0 && `(${offlineCount} عملية معلقة)`}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-pulse">
        🔄 جاري المزامنة...
      </div>
    );
  }

  if (offlineCount > 0) {
    return (
      <div className="fixed bottom-4 left-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
        ⏳ {offlineCount} عملية معلقة
      </div>
    );
  }

  if (lastSync > 0) {
    const timeAgo = Math.floor((Date.now() - lastSync) / 1000);
    const timeStr = timeAgo < 60 ? 'الآن' : `منذ ${Math.floor(timeAgo / 60)} دقيقة`;
    return (
      <div className="fixed bottom-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
        ✅ متزامن - {timeStr}
      </div>
    );
  }

  return null;
}
