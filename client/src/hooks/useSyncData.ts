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
