import { useEffect, useState, useCallback } from 'react';
import { subscribeSyncState, getSyncState, syncOfflineData } from '@/offline/sync';
import {
  cancelSyncQueueItem, cancelAllSyncQueueItems, getPendingSyncQueue,
  getAllSyncQueueItems, getSyncHistory, getFailedSyncItems,
  getDuplicateResolvedItems, retryFailedItem, retryAllFailed,
  getSyncStats as getOfflineSyncStats,
  SyncQueueItem, SyncLogEntry
} from '@/offline/offline';

export function useSyncData() {
  const [syncState, setSyncState] = useState(() => getSyncState());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [allQueueItems, setAllQueueItems] = useState<SyncQueueItem[]>([]);
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [duplicateItems, setDuplicateItems] = useState<SyncQueueItem[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncLogEntry[]>([]);
  const [offlineStats, setOfflineStats] = useState<any>(null);

  const refreshData = useCallback(async () => {
    try {
      const [pending, all, failed, duplicates, history, stats] = await Promise.all([
        getPendingSyncQueue(),
        getAllSyncQueueItems(),
        getFailedSyncItems(),
        getDuplicateResolvedItems(),
        getSyncHistory(100),
        getOfflineSyncStats()
      ]);
      setPendingItems(pending);
      setAllQueueItems(all);
      setFailedItems(failed);
      setDuplicateItems(duplicates);
      setSyncHistory(history);
      setOfflineStats(stats);
    } catch (e) {
      console.warn('⚠️ [useSyncData] فشل تحديث البيانات:', e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState(state);
      refreshData();
    });

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData().catch(console.error);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshData();
    const interval = setInterval(refreshData, 10000);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshData]);

  const manualSync = async () => {
    if (isOnline) {
      await syncOfflineData();
      await refreshData();
    }
  };

  const cancelOperation = async (operationId: string) => {
    await cancelSyncQueueItem(operationId);
    await refreshData();
  };

  const cancelAllOperations = async () => {
    await cancelAllSyncQueueItems();
    await refreshData();
  };

  const retryOperation = async (operationId: string) => {
    await retryFailedItem(operationId);
    await refreshData();
  };

  const retryAllOperations = async () => {
    await retryAllFailed();
    await refreshData();
  };

  return {
    isSyncing: syncState.isSyncing,
    offlineCount: syncState.pendingCount,
    lastSync: syncState.lastSync,
    lastError: syncState.lastError,
    lastErrorType: syncState.lastErrorType,
    lastErrorDetails: syncState.lastErrorDetails,
    isOnline,
    latency: syncState.latency,
    progress: syncState.progress,

    pendingItems,
    allQueueItems,
    failedItems,
    duplicateItems,
    syncHistory,
    offlineStats,

    manualSync,
    cancelOperation,
    cancelAllOperations,
    retryOperation,
    retryAllOperations,
    refreshData,
  };
}
