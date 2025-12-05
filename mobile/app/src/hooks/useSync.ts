import { useState, useEffect, useCallback } from 'react';

export type SyncState = 
  | 'synced'
  | 'syncing'
  | 'pending'
  | 'offline'
  | 'error'
  | 'conflict';

export interface UseSyncResult {
  syncState: SyncState;
  pendingCount: number;
  lastSyncTime: Date | null;
  sync: () => Promise<void>;
  isOnline: boolean;
}

export function useSync(): UseSyncResult {
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setSyncState('offline');
    } else if (pendingCount > 0) {
      setSyncState('pending');
    } else {
      setSyncState('synced');
    }
  }, [isOnline, pendingCount]);

  const sync = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    try {
      setSyncState('syncing');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPendingCount(0);
      setLastSyncTime(new Date());
      setSyncState('synced');
    } catch {
      setSyncState('error');
    }
  }, [isOnline]);

  return {
    syncState,
    pendingCount,
    lastSyncTime,
    sync,
    isOnline
  };
}

export default useSync;
