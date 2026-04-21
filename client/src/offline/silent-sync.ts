import { intelligentMonitor } from './intelligent-monitor';
import {
  getPendingSyncQueue, removeSyncQueueItem, markItemInFlight,
  markItemFailed, markItemDuplicateResolved, logSyncResult,
  moveToDLQ, SyncQueueItem
} from './offline';
import { smartGet, smartPut } from './storage-factory';
import { apiRequest } from '../lib/queryClient';
import { resolveConflictLWW, logConflict } from './conflict-resolver';
import type { ConflictData } from './conflict-resolver';
import { endpointToStore } from './store-registry';
import { isCurrentTabLeader } from './sync-leader';
import { isSyncEngineActive } from './sync';
import { withMutex, SYNC_LOCKS, MutexBusyError } from './sync-mutex';

let _isSyncing = false;

// 📡 بثّ تقدم المزامنة الحقيقي (يستهلكه sync-progress-tracker)
function emitSyncProgress(done: number, total: number, phase: 'start' | 'tick' | 'end' = 'tick') {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('sync:progress', {
      detail: { done, total, phase, percent: total > 0 ? Math.round((done / total) * 100) : 0 },
    }));
  } catch (err) {
    intelligentMonitor.logEvent({
      type: 'sync',
      severity: 'low',
      message: 'Failed to emit sync progress event',
      metadata: { error: err }
    });
  }
}

const SYNC_CONFIG = {
  maxRetries: 8,
  baseDelayMs: 500,
  maxDelayMs: 60000,
  jitterFactor: 0.3,
  nonRetryableStatuses: [400, 401, 403, 404, 422] as number[],
};

function calculateBackoffDelay(retryCount: number): number {
  const exponentialDelay = SYNC_CONFIG.baseDelayMs * Math.pow(2, retryCount);
  const cappedDelay = Math.min(exponentialDelay, SYNC_CONFIG.maxDelayMs);
  return Math.max(0, Math.round(cappedDelay)); // تم إزالة الـ jitter (العشوائية) لضمان الشفافية المطلقة في توقيت المزامنة
}

function isRetryableError(statusCode: number): boolean {
  if (statusCode === 409) return false;
  return !SYNC_CONFIG.nonRetryableStatuses.includes(statusCode);
}

export async function runSilentSync() {
  if (_isSyncing) return;
  if (!isCurrentTabLeader()) return;
  if (isSyncEngineActive()) return;
  _isSyncing = true;
  try {
    // قفل عبر التبويبات: لو هناك تبويب آخر يقوم بالـ flush، نتخطى بدون انتظار
    await withMutex(SYNC_LOCKS.OUTBOX_FLUSH, async () => {
      await _executeSilentSync();
    }, { ifAvailable: true });
  } catch (err) {
    if (err instanceof MutexBusyError) {
      // تبويب آخر يعالج — طبيعي
      return;
    }
    console.warn('[silent-sync] خطأ غير متوقع:', err);
  } finally {
    _isSyncing = false;
  }
}

function extractStatusCode(error: any): number {
  if (error?.status) return error.status;
  if (error?.statusCode) return error.statusCode;
  const msg = error?.message || String(error);
  const match = msg.match(/status:\s*(\d{3})/i);
  if (match) return parseInt(match[1], 10);
  if (msg.includes('مسجل بالفعل') || msg.includes('duplicate') || msg.includes('already exists')) return 409;
  if (msg.includes('التاريخ يجب') || msg.includes('validation') || msg.includes('صيغة')) return 400;
  return 0;
}

function getPayloadSummary(payload: Record<string, any>): string {
  const parts: string[] = [];
  if (payload.transferNumber) parts.push(`رقم: ${payload.transferNumber}`);
  if (payload.amount) parts.push(`مبلغ: ${payload.amount}`);
  if (payload.id) parts.push(`ID: ${String(payload.id).substring(0, 8)}`);
  return parts.join(' | ') || 'بدون تفاصيل';
}

function extractRecordIdFromItem(item: { endpoint: string; payload: Record<string, any> }): string | null {
  if (item.payload?.id) return String(item.payload.id);
  const parts = item.endpoint.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length > 8 && lastPart !== parts[parts.length - 2]) {
    return lastPart;
  }
  return null;
}

function buildLWWFetchUrl(endpoint: string, recordId: string): string {
  if (endpoint.includes(recordId)) {
    return endpoint;
  }
  return `${endpoint}/${recordId}`;
}

function extractServerRecord(response: any): any {
  if (!response) return null;
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  return response;
}

async function checkLWWConflict(item: SyncQueueItem): Promise<'proceed' | 'skip'> {
  if (item.action !== 'update') return 'proceed';

  const recordId = extractRecordIdFromItem(item);
  if (!recordId) return 'proceed';

  try {
    const fetchUrl = buildLWWFetchUrl(item.endpoint, recordId);
    const rawResponse = await apiRequest(fetchUrl, 'GET');
    const serverRecord = extractServerRecord(rawResponse);

    if (!serverRecord || serverRecord.error) {
      return 'proceed';
    }

    const serverUpdatedAt = serverRecord.updated_at || serverRecord.updatedAt;
    if (!serverUpdatedAt) {
      return 'proceed';
    }

    const serverTimestamp = new Date(serverUpdatedAt).getTime();
    const clientTimestamp = item.lastModifiedAt || item.timestamp;

    const conflictData: ConflictData = {
      clientVersion: item.payload,
      serverVersion: serverRecord,
      clientTimestamp,
      serverTimestamp,
    };

    const resolved = resolveConflictLWW(conflictData);

    if (resolved === conflictData.serverVersion) {
      await logConflict('update', String(recordId), conflictData, 'server-wins');
      return 'skip';
    }

    await logConflict('update', String(recordId), conflictData, 'client-wins');
    return 'proceed';
  } catch (error) {
    return 'proceed';
  }
}

async function processBatch(batchId: string, items: SyncQueueItem[]): Promise<void> {
  const startTime = Date.now();

  for (const item of items) {
    await markItemInFlight(item.id);
  }

  const itemsToSend: SyncQueueItem[] = [];
  for (const item of items) {
    const lwwDecision = await checkLWWConflict(item);
    if (lwwDecision === 'skip') {
      await removeSyncQueueItem(item.id);
      await updateLocalItemSyncStatus(item, true);
      await logSyncResult({
        queueItemId: item.id,
        action: item.action,
        endpoint: item.endpoint,
        status: 'success',
        duration: Date.now() - startTime,
        payloadSummary: getPayloadSummary(item.payload),
        retryCount: item.retries,
      });
    } else {
      itemsToSend.push(item);
    }
  }

  if (itemsToSend.length === 0) {
    return;
  }

  try {
    const operations = itemsToSend.map(item => ({
      action: item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE',
      endpoint: item.endpoint,
      payload: item.payload,
      _metadata: {
        clientTimestamp: item.lastModifiedAt || item.timestamp,
        deviceId: localStorage.getItem('deviceId') || 'web-client',
      },
    }));

    const batchIdempotencyKey = `batch:${batchId}:${items[0]?.retries || 0}`;
    const response = await apiRequest('/api/sync/batch', 'POST', { operations }, 0, {
      'x-idempotency-key': batchIdempotencyKey,
    });

    if (response && response.success) {
      for (const item of itemsToSend) {
        await removeSyncQueueItem(item.id);
        await updateLocalItemSyncStatus(item, true);
        await logSyncResult({
          queueItemId: item.id,
          action: item.action,
          endpoint: item.endpoint,
          status: 'success',
          duration: Date.now() - startTime,
          payloadSummary: getPayloadSummary(item.payload),
          retryCount: item.retries,
        });
      }
    } else {
      const statusCode = response?.status;
      if (statusCode === 401 || statusCode === 403) {
        const { stopSyncListener } = await import('./sync');
        stopSyncListener();
        window.dispatchEvent(new CustomEvent('sync:auth-required'));
        intelligentMonitor.logEvent({
          type: 'auth',
          severity: 'high',
          message: 'Silent batch sync stopped: Authentication required (401/403)',
          metadata: { status: statusCode }
        });
        return;
      }
      const errMsg = response?.message || response?.error || 'فشل الدفعة';
      throw new Error(errMsg);
    }
  } catch (error: any) {
    const statusCode = extractStatusCode(error);
    const errorMsg = error?.message || String(error);

    if (statusCode === 401 || statusCode === 403) {
      const { stopSyncListener } = await import('./sync');
      stopSyncListener();
      window.dispatchEvent(new CustomEvent('sync:auth-required'));
      intelligentMonitor.logEvent({
        type: 'auth',
        severity: 'high',
        message: 'Silent batch sync stopped: Authentication required (401/403)',
        metadata: { status: statusCode }
      });
      return;
    }

    for (const item of itemsToSend) {
      if (!isRetryableError(statusCode) && statusCode > 0) {
        await moveToDLQ({
          ...item,
          retries: item.retries + 1,
          lastError: errorMsg,
          errorType: 'validation',
        });
      } else {
        const nextRetryAt = Date.now() + calculateBackoffDelay(item.retries + 1);
        await markItemFailed(item.id, errorMsg, 'batch');
        const failedItem = await smartGet('syncQueue', item.id);
        if (failedItem) {
          failedItem.nextRetryAt = nextRetryAt;
          await smartPut('syncQueue', failedItem);
        }
      }

      await logSyncResult({
        queueItemId: item.id,
        action: item.action,
        endpoint: item.endpoint,
        status: 'failed',
        duration: Date.now() - startTime,
        errorMessage: errorMsg,
        errorCode: String(statusCode),
        payloadSummary: getPayloadSummary(item.payload),
        retryCount: item.retries + 1,
      });
    }
  }
}

async function _executeSilentSync() {
  const queue = await getPendingSyncQueue();
  if (queue.length === 0) return;

  const now = Date.now();
  const readyItems = queue.filter(item => {
    if (item.nextRetryAt && item.nextRetryAt > now) return false;
    return true;
  });

  if (readyItems.length === 0) return;

  const batches = new Map<string, SyncQueueItem[]>();
  const unbatched: SyncQueueItem[] = [];

  for (const item of readyItems) {
    if (item.batchId) {
      if (!batches.has(item.batchId)) batches.set(item.batchId, []);
      batches.get(item.batchId)!.push(item);
    } else {
      unbatched.push(item);
    }
  }

  const totalOps = readyItems.length;
  let doneOps = 0;
  emitSyncProgress(0, totalOps, 'start');

  for (const [batchId, batchItems] of batches) {
    await processBatch(batchId, batchItems);
    doneOps += batchItems.length;
    emitSyncProgress(doneOps, totalOps, 'tick');
  }

  for (const item of unbatched) {
    try {
      if (item.retries >= SYNC_CONFIG.maxRetries) {
        await moveToDLQ(item);
        continue;
      }

      await markItemInFlight(item.id);

      const lwwDecision = await checkLWWConflict(item);
      if (lwwDecision === 'skip') {
        await removeSyncQueueItem(item.id);
        await updateLocalItemSyncStatus(item, true);
        await logSyncResult({
          queueItemId: item.id,
          action: item.action,
          endpoint: item.endpoint,
          status: 'success',
          duration: 0,
          payloadSummary: getPayloadSummary(item.payload),
          retryCount: item.retries,
        });
        continue;
      }

      if (item.retries > 0) {
        const delay = calculateBackoffDelay(item.retries);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const method = item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE';
      const startTime = Date.now();

      let response: any;
      try {
        const idempotencyKey = item.idempotencyKey || `sync:${item.id}:${item.retries}`;
        const payloadWithMeta = {
          ...item.payload,
          _metadata: {
            clientTimestamp: item.lastModifiedAt || item.timestamp,
            deviceId: localStorage.getItem('deviceId') || 'web-client',
          },
        };
        response = await apiRequest(item.endpoint, method, payloadWithMeta, 0, {
          'x-idempotency-key': idempotencyKey,
        });
      } catch (apiError: any) {
        const statusCode = extractStatusCode(apiError);
        const errorMsg = apiError?.message || apiError?.error || String(apiError);

        if (statusCode === 401 || statusCode === 403) {
          const { stopSyncListener } = await import('./sync');
          stopSyncListener();
          window.dispatchEvent(new CustomEvent('sync:auth-required'));
          intelligentMonitor.logEvent({
            type: 'auth',
            severity: 'high',
            message: 'Silent sync stopped: Authentication required (401/403)',
            metadata: { status: statusCode }
          });
          return;
        }

        if (statusCode === 409) {
          await markItemDuplicateResolved(item.id, errorMsg);
          await updateLocalItemSyncStatus(item, true);
          continue;
        }

        if (!isRetryableError(statusCode)) {
          await moveToDLQ({
            ...item,
            retries: item.retries + 1,
            lastError: errorMsg,
            errorType: 'validation',
          });
          await logSyncResult({
            queueItemId: item.id,
            action: item.action,
            endpoint: item.endpoint,
            status: 'failed',
            duration: Date.now() - startTime,
            errorMessage: `نُقلت إلى DLQ: ${errorMsg}`,
            errorCode: String(statusCode),
            payloadSummary: getPayloadSummary(item.payload),
            retryCount: item.retries + 1,
          });
          continue;
        }

        const nextRetryAt = Date.now() + calculateBackoffDelay(item.retries + 1);
        await markItemFailed(item.id, errorMsg, 'network');

        const failedItem = await smartGet('syncQueue', item.id);
        if (failedItem) {
          failedItem.nextRetryAt = nextRetryAt;
          await smartPut('syncQueue', failedItem);
        }

        await logSyncResult({
          queueItemId: item.id,
          action: item.action,
          endpoint: item.endpoint,
          status: 'failed',
          duration: Date.now() - startTime,
          errorMessage: errorMsg,
          errorCode: String(statusCode),
          payloadSummary: getPayloadSummary(item.payload),
          retryCount: item.retries + 1,
        });
        continue;
      }

      const duration = Date.now() - startTime;

      if (response && (response.success !== false)) {
        await removeSyncQueueItem(item.id);
        await updateLocalItemSyncStatus(item, true);

        await logSyncResult({
          queueItemId: item.id,
          action: item.action,
          endpoint: item.endpoint,
          status: 'success',
          duration,
          payloadSummary: getPayloadSummary(item.payload),
          retryCount: item.retries,
        });

      } else {
        const statusCode = response?.status;
        if (statusCode === 401 || statusCode === 403) {
          const { stopSyncListener } = await import('./sync');
          stopSyncListener();
          window.dispatchEvent(new CustomEvent('sync:auth-required'));
          intelligentMonitor.logEvent({
            type: 'auth',
            severity: 'high',
            message: 'Silent sync stopped: Authentication required (401/403)',
            metadata: { status: statusCode }
          });
          return;
        }
        const errMsg = response?.message || response?.error || 'استجابة غير ناجحة';
        const nextRetryAt = Date.now() + calculateBackoffDelay(item.retries + 1);
        await markItemFailed(item.id, errMsg, 'server');

        const failedItem = await smartGet('syncQueue', item.id);
        if (failedItem) {
          failedItem.nextRetryAt = nextRetryAt;
          await smartPut('syncQueue', failedItem);
        }

        await logSyncResult({
          queueItemId: item.id,
          action: item.action,
          endpoint: item.endpoint,
          status: 'failed',
          duration,
          errorMessage: errMsg,
          payloadSummary: getPayloadSummary(item.payload),
          retryCount: item.retries + 1,
        });
      }
    } catch (error: any) {
      await markItemFailed(item.id, error.message || String(error), 'unknown');
      intelligentMonitor.logEvent({
        type: 'sync',
        severity: 'medium',
        message: 'Silent sync operation failed unexpectedly',
        metadata: { error: error, itemId: item.id }
      });
    } finally {
      doneOps += 1;
      emitSyncProgress(doneOps, totalOps, 'tick');
    }
  }

  emitSyncProgress(totalOps, totalOps, 'end');
}

async function updateLocalItemSyncStatus(item: SyncQueueItem, synced: boolean): Promise<void> {
  try {
    const storeName = endpointToStore(item.endpoint);
    const recordId = item.payload?.id;
    if (!storeName || !recordId) return;

    const localItem = await smartGet(storeName, recordId);
    if (localItem) {
      localItem._pendingSync = !synced;
      localItem._isLocal = !synced;
      await smartPut(storeName, localItem);
    }
  } catch (err) {
    intelligentMonitor.logEvent({
      type: 'sync',
      severity: 'low',
      message: 'Failed to update local item sync status in silent sync',
      metadata: { error: err, itemId: item.id }
    });
  }
}

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _onlineHandler: (() => void) | null = null;

export function initSilentSyncObserver(intervalMs = 30000) {
  if (_intervalId !== null) {
    return;
  }

  if (isCurrentTabLeader()) {
    runSilentSync().catch(err => {
      intelligentMonitor.logEvent({
        type: 'sync',
        severity: 'medium',
        message: 'Initial silent sync failed',
        metadata: { error: err }
      });
    });
  }

  _intervalId = setInterval(() => {
    if (navigator.onLine && isCurrentTabLeader()) {
      runSilentSync().catch(err => {
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: 'low',
          message: 'Interval silent sync failed',
          metadata: { error: err }
        });
      });
    }
  }, intervalMs);

  _onlineHandler = () => {
    if (isCurrentTabLeader()) {
      runSilentSync().catch(err => {
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: 'medium',
          message: 'Online-triggered silent sync failed',
          metadata: { error: err }
        });
      });
    }
  };
  window.addEventListener('online', _onlineHandler);
}

export function stopSilentSyncObserver() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_onlineHandler !== null) {
    window.removeEventListener('online', _onlineHandler);
    _onlineHandler = null;
  }
}
