/**
 * نظام مراقبة الأداء والإحصائيات
 */

import { getSyncState } from './sync';
import { getTotalStorageSize } from './data-compression';
import { getPendingSyncQueue } from './offline';

async function getPendingOperationsCount(): Promise<number> {
  const pending = await getPendingSyncQueue();
  return pending.length;
}

async function getSyncStatistics() {
  const pending = await getPendingSyncQueue();
  const creates = pending.filter(p => p.action === 'create').length;
  const updates = pending.filter(p => p.action === 'update').length;
  const deletes = pending.filter(p => p.action === 'delete').length;
  const failedOps = pending.filter(p => p.retries > 0).length;

  return {
    totalPending: pending.length,
    creates,
    updates,
    deletes,
    failedOperations: failedOps,
    oldestOperation: pending.length > 0 ? new Date(pending[0].timestamp) : null
  };
}

export interface PerformanceMetrics {
  timestamp: number;
  syncStatus: {
    isSyncing: boolean;
    lastSync: number;
    pendingCount: number;
    isOnline: boolean;
  };
  storage: {
    used: number;
    usagePercentage: number;
  };
  operations: {
    pending: number;
    creates: number;
    updates: number;
    deletes: number;
    failedOps: number;
  };
  conflicts: {
    total: number;
    lww: number;
    merge: number;
    serverWins: number;
    clientWins: number;
  };
  payloadSize: {
    lastPushBytes: number;
    lastPullBytes: number;
    totalBytes: number;
  };
  timing: {
    lastSyncDuration?: number;
  };
}

const metrics: PerformanceMetrics[] = [];
const MAX_METRICS_HISTORY = 100;
let lastSyncStartTime: number | null = null;

const conflictStats = {
  total: 0,
  lww: 0,
  merge: 0,
  serverWins: 0,
  clientWins: 0
};

const payloadStats = {
  lastPushBytes: 0,
  lastPullBytes: 0,
  totalBytes: 0
};

/**
 * تسجيل تعارض
 */
export function recordConflict(strategy: 'last-write-wins' | 'server-wins' | 'client-wins' | 'merge'): void {
  conflictStats.total++;
  if (strategy === 'last-write-wins') conflictStats.lww++;
  else if (strategy === 'server-wins') conflictStats.serverWins++;
  else if (strategy === 'client-wins') conflictStats.clientWins++;
  else if (strategy === 'merge') conflictStats.merge++;
}

/**
 * تسجيل حجم البيانات
 */
export function recordPayloadSize(bytes: number, type: 'push' | 'pull'): void {
  if (type === 'push') {
    payloadStats.lastPushBytes = bytes;
  } else {
    payloadStats.lastPullBytes = bytes;
  }
  payloadStats.totalBytes += bytes;
}

/**
 * ابدأ قياس المزامنة
 */
export function startSyncMeasurement(): void {
  lastSyncStartTime = Date.now();
}

/**
 * انتهي من قياس المزامنة
 */
export function endSyncMeasurement(): number {
  if (!lastSyncStartTime) return 0;
  const duration = Date.now() - lastSyncStartTime;
  lastSyncStartTime = null;
  return duration;
}

/**
 * احمّع مقاييس الأداء الحالية
 */
export async function collectMetrics(): Promise<PerformanceMetrics> {
  const syncState = getSyncState();
  const storage = await getTotalStorageSize();
  const pendingOps = await getPendingOperationsCount();
  const syncStats = await getSyncStatistics();

  const metric: PerformanceMetrics = {
    timestamp: Date.now(),
    syncStatus: {
      isSyncing: syncState.isSyncing,
      lastSync: syncState.lastSync,
      pendingCount: syncState.pendingCount,
      isOnline: syncState.isOnline
    },
    storage: {
      used: storage.used,
      usagePercentage: storage.percentage
    },
    operations: {
      pending: pendingOps,
      creates: syncStats.creates,
      updates: syncStats.updates,
      deletes: syncStats.deletes,
      failedOps: syncStats.failedOperations
    },
    conflicts: { ...conflictStats },
    payloadSize: { ...payloadStats },
    timing: {
      lastSyncDuration: lastSyncStartTime ? Date.now() - lastSyncStartTime : undefined
    }
  };

  metrics.push(metric);
  if (metrics.length > MAX_METRICS_HISTORY) {
    metrics.shift();
  }

  return metric;
}

/**
 * احصل على المقاييس المحفوظة
 */
export function getMetricsHistory(): PerformanceMetrics[] {
  return [...metrics];
}

/**
 * احصل على إحصائيات الأداء
 */
export function getPerformanceStats() {
  if (metrics.length === 0) {
    return null;
  }

  const avgStorageUsage = metrics.reduce((sum, m) => sum + m.storage.usagePercentage, 0) / metrics.length;
  const avgPendingOps = metrics.reduce((sum, m) => sum + m.operations.pending, 0) / metrics.length;
  const maxStorageUsage = Math.max(...metrics.map(m => m.storage.usagePercentage));
  const maxPendingOps = Math.max(...metrics.map(m => m.operations.pending));
  const onlineTime = metrics.filter(m => m.syncStatus.isOnline).length;
  const uptime = (onlineTime / metrics.length) * 100;

  return {
    avgStorageUsage: Math.round(avgStorageUsage),
    maxStorageUsage,
    avgPendingOps: Math.round(avgPendingOps),
    maxPendingOps,
    uptime: Math.round(uptime),
    metricsCollected: metrics.length,
    periodMs: metrics[metrics.length - 1]?.timestamp - metrics[0]?.timestamp
  };
}

/**
 * اطبع تقرير الأداء
 */
export async function printPerformanceReport(): Promise<void> {
  const metric = await collectMetrics();
  const stats = getPerformanceStats();

}

/**
 * مراقب الأداء الدوري
 */
let monitorInterval: NodeJS.Timeout | null = null;

export function startPerformanceMonitoring(intervalMs: number = 60000): void {
  if (monitorInterval) {
    return;
  }

  monitorInterval = setInterval(async () => {
    const metric = await collectMetrics();
    
    if (metric.storage.usagePercentage > 80) {
    }

    if (metric.operations.failedOps > 5) {
    }
  }, intervalMs);

}

export function stopPerformanceMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
