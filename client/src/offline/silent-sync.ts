import {
  getPendingSyncQueue, removeSyncQueueItem, markItemInFlight,
  markItemFailed, markItemDuplicateResolved, logSyncResult,
  SyncQueueItem
} from './offline';
import { smartGet, smartPut } from './storage-factory';
import { apiRequest } from '../lib/queryClient';

let _isSyncing = false;
const MAX_RETRIES_PER_ITEM = 5;

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

async function _executeSilentSync() {
  const queue = await getPendingSyncQueue();
  if (queue.length === 0) return;

  console.log(`🔄 [Silent-Sync] بدء معالجة ${queue.length} عملية...`);

  for (const item of queue) {
    try {
      if (item.retries >= MAX_RETRIES_PER_ITEM) {
        console.warn(`⚠️ [Silent-Sync] العملية ${item.id} تجاوزت الحد الأقصى (${MAX_RETRIES_PER_ITEM}) - تبقى في failed`);
        await markItemFailed(item.id, `تجاوز الحد الأقصى للمحاولات (${MAX_RETRIES_PER_ITEM})`, 'max_retries');
        continue;
      }

      await markItemInFlight(item.id);
      await new Promise(resolve => setTimeout(resolve, 300));

      const method = item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE';
      const startTime = Date.now();

      let response: any;
      try {
        response = await apiRequest(item.endpoint, method, item.payload);
      } catch (apiError: any) {
        const statusCode = extractStatusCode(apiError);
        const errorMsg = apiError?.message || apiError?.error || String(apiError);

        if (statusCode === 409) {
          console.log(`🔁 [Silent-Sync] عملية مكررة (409): ${item.id} - ${errorMsg}`);
          await markItemDuplicateResolved(item.id, errorMsg);
          await updateLocalItemSyncStatus(item, true);
          continue;
        }

        if (statusCode === 400 || statusCode === 422) {
          console.error(`❌ [Silent-Sync] خطأ تحقق (${statusCode}): ${item.id} - ${errorMsg}`);
          await markItemFailed(item.id, errorMsg, 'validation');
          await logSyncResult({
            queueItemId: item.id,
            action: item.action,
            endpoint: item.endpoint,
            status: 'failed',
            duration: Date.now() - startTime,
            errorMessage: errorMsg,
            errorCode: String(statusCode),
            payloadSummary: getPayloadSummary(item.payload),
            retryCount: item.retries + 1
          });
          continue;
        }

        await markItemFailed(item.id, errorMsg, 'network');
        await logSyncResult({
          queueItemId: item.id,
          action: item.action,
          endpoint: item.endpoint,
          status: 'failed',
          duration: Date.now() - startTime,
          errorMessage: errorMsg,
          errorCode: String(statusCode),
          payloadSummary: getPayloadSummary(item.payload),
          retryCount: item.retries + 1
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
          retryCount: item.retries
        });

        console.log(`✅ [Silent-Sync] نجحت: ${item.id} (${duration}ms)`);
      } else {
        const errMsg = response?.message || response?.error || 'استجابة غير ناجحة';
        await markItemFailed(item.id, errMsg, 'server');
        await logSyncResult({
          queueItemId: item.id,
          action: item.action,
          endpoint: item.endpoint,
          status: 'failed',
          duration,
          errorMessage: errMsg,
          payloadSummary: getPayloadSummary(item.payload),
          retryCount: item.retries + 1
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
    // تجاهل أخطاء تحديث الحالة المحلية
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
