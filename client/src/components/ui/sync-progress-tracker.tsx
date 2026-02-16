import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CloudOff, RefreshCw, CheckCircle2, Wifi, ChevronUp } from 'lucide-react';
import { getPendingSyncQueue } from '@/offline/offline';
import { runSilentSync } from '@/offline/silent-sync';

type SyncStatus = 'online' | 'offline' | 'syncing' | 'completed';

export function SyncProgressTracker() {
  const [status, setStatus] = useState<SyncStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const checkPendingQueue = useCallback(async () => {
    try {
      const queue = await getPendingSyncQueue();
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setStatus('offline');
        setDismissed(false);
        checkPendingQueue();
      } else if (status === 'offline') {
        setStatus('syncing');
        setDismissed(false);
        handleAutoSync();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const handleMutationQueued = () => {
      checkPendingQueue();
      setDismissed(false);
    };
    window.addEventListener('offline-mutation-queued', handleMutationQueued);

    if (!navigator.onLine) {
      setStatus('offline');
    }
    checkPendingQueue();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('offline-mutation-queued', handleMutationQueued);
    };
  }, [status, checkPendingQueue]);

  const handleAutoSync = useCallback(async () => {
    setStatus('syncing');
    setProgress(10);

    try {
      const queue = await getPendingSyncQueue();
      if (queue.length === 0) {
        setStatus('completed');
        setProgress(100);
        setShowCompleted(true);
        setTimeout(() => {
          setShowCompleted(false);
          setStatus('online');
          setProgress(0);
        }, 2500);
        return;
      }

      const total = queue.length;
      let processed = 0;

      const progressInterval = setInterval(() => {
        processed = Math.min(processed + 1, total);
        setProgress(Math.round((processed / total) * 100));
      }, 500);

      await runSilentSync();
      clearInterval(progressInterval);

      setProgress(100);
      setStatus('completed');
      setShowCompleted(true);
      setPendingCount(0);

      setTimeout(() => {
        setShowCompleted(false);
        setStatus('online');
        setProgress(0);
      }, 2500);
    } catch (error) {
      console.error('[SyncTracker] فشل المزامنة:', error);
      setStatus('online');
      setProgress(0);
      checkPendingQueue();
    }
  }, [checkPendingQueue]);

  if (status === 'online' && !showCompleted && pendingCount === 0) return null;
  if (dismissed && status === 'offline' && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 z-[100] transition-all duration-300 max-w-sm mx-auto",
        "pointer-events-auto"
      )}
      dir="rtl"
      data-testid="sync-progress-tracker"
    >
      <div className={cn(
        "rounded-xl px-3 py-2 shadow-lg border flex items-center gap-2",
        status === 'offline' && "bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800",
        status === 'syncing' && "bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800",
        (status === 'completed' || showCompleted) && "bg-green-50 dark:bg-green-950/80 border-green-200 dark:border-green-800",
        status === 'online' && pendingCount > 0 && "bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800"
      )}>
        <div className={cn(
          "shrink-0 p-1.5 rounded-lg",
          status === 'offline' && "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
          status === 'syncing' && "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
          (status === 'completed' || showCompleted) && "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400",
          status === 'online' && pendingCount > 0 && "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
        )}>
          {status === 'offline' && <CloudOff className="w-4 h-4" />}
          {status === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
          {(status === 'completed' || showCompleted) && <CheckCircle2 className="w-4 h-4" />}
          {status === 'online' && pendingCount > 0 && <Wifi className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-xs font-medium leading-tight",
            status === 'offline' && "text-amber-800 dark:text-amber-300",
            status === 'syncing' && "text-blue-800 dark:text-blue-300",
            (status === 'completed' || showCompleted) && "text-green-800 dark:text-green-300",
            status === 'online' && pendingCount > 0 && "text-amber-800 dark:text-amber-300"
          )}>
            {status === 'offline' && (
              pendingCount > 0
                ? `بدون اتصال \u00B7 ${pendingCount} عملية معلقة`
                : 'بدون اتصال \u00B7 يمكنك متابعة العمل'
            )}
            {status === 'syncing' && `جاري المزامنة... ${progress}%`}
            {(status === 'completed' || showCompleted) && 'تمت المزامنة'}
            {status === 'online' && pendingCount > 0 && `${pendingCount} عملية بانتظار المزامنة`}
          </p>
          {status === 'syncing' && (
            <Progress value={progress} className="h-1 mt-1 bg-blue-100 dark:bg-blue-900" />
          )}
        </div>

        {status === 'offline' && (
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-1 rounded-md text-amber-500 dark:text-amber-400 hover-elevate"
            data-testid="button-dismiss-offline"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}

        {status === 'online' && pendingCount > 0 && (
          <button
            onClick={handleAutoSync}
            className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-md bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 hover-elevate"
            data-testid="button-sync-now"
          >
            مزامنة
          </button>
        )}
        {status === 'syncing' && (
          <button
            disabled
            className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-md bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 opacity-60 cursor-not-allowed"
            data-testid="button-sync-disabled"
          >
            جاري...
          </button>
        )}
      </div>
    </div>
  );
}
