import {
  getPendingSyncQueue, removeSyncQueueItem, markItemInFlight,
  markItemFailed, markItemDuplicateResolved, logSyncResult,
  moveToDLQ, SyncQueueItem
} from './offline';
import { smartGet, smartPut } from './storage-factory';
import { apiRequest } from '../lib/queryClient';

let _isSyncing = false;

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
  const jitter = cappedDelay * SYNC_CONFIG.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(cappedDelay + jitter));
}

function isRetryableError(statusCode: number): boolean {
  if (statusCode === 409) return false;
  return !SYNC_CONFIG.nonRetryableStatuses.includes(statusCode);
}

export async function runSilentSync() {
  if (_isSyncing) return;
  _isSyncing = true;
  try {
    await _executeSilentSync();
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

async function processBatch(batchId: string, items: SyncQueueItem[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[Silent-Sync] معالجة دفعة ${batchId} (${items.length} عملية)...`);

  for (const item of items) {
    await markItemInFlight(item.id);
  }

  try {
    const operations = items.map(item => ({
      action: item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE',
      endpoint: item.endpoint,
      payload: item.payload,
    }));

    const response = await apiRequest('/api/sync/batch', 'POST', { operations });

    if (response && response.success) {
      for (const item of items) {
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
      console.log(`[Silent-Sync] دفعة ${batchId} نجحت (${Date.now() - startTime}ms)`);
    } else {
      const errMsg = response?.message || response?.error || 'فشل الدفعة';
      throw new Error(errMsg);
    }
  } catch (error: any) {
    const statusCode = extractStatusCode(error);
    const errorMsg = error?.message || String(error);
    console.error(`[Silent-Sync] فشل الدفعة ${batchId}:`, errorMsg);

    for (const item of items) {
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

  console.log(`[Silent-Sync] بدء معالجة ${readyItems.length} عملية (${batches.size} دفعات، ${unbatched.length} منفردة) من أصل ${queue.length}...`);

  for (const [batchId, batchItems] of batches) {
    await processBatch(batchId, batchItems);
  }

  for (const item of unbatched) {
    try {
      if (item.retries >= SYNC_CONFIG.maxRetries) {
        console.warn(`[Silent-Sync] نقل ${item.id} إلى DLQ بعد ${item.retries} محاولة`);
        await moveToDLQ(item);
        continue;
      }

      await markItemInFlight(item.id);

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
        response = await apiRequest(item.endpoint, method, item.payload, 0, {
          'x-idempotency-key': idempotencyKey,
        });
      } catch (apiError: any) {
        const statusCode = extractStatusCode(apiError);
        const errorMsg = apiError?.message || apiError?.error || String(apiError);

        if (statusCode === 409) {
          console.log(`[Silent-Sync] عملية مكررة (409): ${item.id}`);
          await markItemDuplicateResolved(item.id, errorMsg);
          await updateLocalItemSyncStatus(item, true);
          continue;
        }

        if (!isRetryableError(statusCode)) {
          console.error(`[Silent-Sync] خطأ غير قابل للإعادة (${statusCode}): ${item.id}`);
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

        console.log(`[Silent-Sync] نجحت: ${item.id} (${duration}ms)`);
      } else {
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
      console.error(`[Silent-Sync] خطأ غير متوقع ${item.id}:`, error);
      await markItemFailed(item.id, error.message || String(error), 'unknown');
    }
  }
}

async function updateLocalItemSyncStatus(item: SyncQueueItem, synced: boolean): Promise<void> {
  try {
    const storeName = item.endpoint.split('/')[2];
    const recordId = item.payload?.id;
    if (!storeName || !recordId) return;

    const localItem = await smartGet(storeName, recordId);
    if (localItem) {
      localItem._pendingSync = !synced;
      localItem._isLocal = !synced;
      await smartPut(storeName, localItem);
    }
  } catch {
  }
}

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _onlineHandler: (() => void) | null = null;

export function initSilentSyncObserver(intervalMs = 30000) {
  if (_intervalId !== null) {
    return;
  }

  runSilentSync();

  _intervalId = setInterval(() => {
    if (navigator.onLine) {
      runSilentSync();
    }
  }, intervalMs);

  _onlineHandler = () => {
    runSilentSync();
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
