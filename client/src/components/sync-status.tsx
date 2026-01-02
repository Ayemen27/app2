import { useEffect, useState } from 'react';
import { subscribeSyncState } from '@/offline/sync';
import { Check, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: number;
  pendingCount: number;
  lastError?: string;
  isOnline: boolean;
}

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: 0,
    pendingCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setStatus(state);
    });

    return () => unsubscribe();
  }, []);

  const getLastSyncText = () => {
    if (status.lastSync === 0) return 'لم تتم مزامنة بعد';
    const diff = Date.now() - status.lastSync;
    const minutes = Math.floor(diff / 60000);
    if (minutes === 0) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    return `منذ ${Math.floor(minutes / 60)} ساعة`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm">
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        {status.isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
      </div>

      {/* Sync Status */}
      <div className="flex items-center gap-1">
        {status.isSyncing ? (
          <>
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-blue-600">جاري المزامنة...</span>
          </>
        ) : status.pendingCount > 0 ? (
          <>
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-orange-600">{status.pendingCount} معلق</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-600">{getLastSyncText()}</span>
          </>
        )}
      </div>

      {/* Error Message */}
      {status.lastError && (
        <div className="text-xs text-red-600 truncate" title={status.lastError}>
          خطأ: {status.lastError.substring(0, 20)}...
        </div>
      )}
    </div>
  );
}
