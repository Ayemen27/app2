import { v4 as uuidv4 } from 'uuid';
import {
  smartGet, smartGetAll, smartPut, smartAdd, smartDelete,
  smartClear, smartCount, smartSave, smartQuery
} from './storage-factory';

export type SyncItemStatus = 'pending' | 'in-flight' | 'failed' | 'conflict' | 'duplicate-resolved';

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: Record<string, any>;
  timestamp: number;
  lastModifiedAt?: number;
  retries: number;
  status: SyncItemStatus;
  lastError?: string;
  errorType?: string;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  idempotencyKey?: string;
  batchId?: string;
}

export interface DeadLetterItem {
  id: string;
  originalId: string;
  action: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: Record<string, any>;
  timestamp: number;
  movedAt: number;
  totalRetries: number;
  lastError: string;
  errorType: string;
  idempotencyKey?: string;
}

export interface SyncLogEntry {
  id: string;
  queueItemId: string;
  action: string;
  endpoint: string;
  status: 'success' | 'failed' | 'duplicate' | 'conflict' | 'skipped';
  timestamp: number;
  duration?: number;
  errorMessage?: string;
  errorCode?: string;
  payloadSummary?: string;
  retryCount?: number;
}

function generateIdempotencyKey(action: string, endpoint: string, payload: Record<string, any>): string {
  const recordId = payload.id || payload.transferNumber || '';
  if (action === 'create') {
    return `${action}:${endpoint}:${recordId}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
  }
  return `${action}:${endpoint}:${recordId}`;
}

function normalizeDateFields(payload: Record<string, any>): Record<string, any> {
  const dateFields = ['transferDate', 'selectedDate', 'date', 'paymentDate', 'attendanceDate', 'expenseDate'];
  const result = { ...payload };
  for (const field of dateFields) {
    if (result[field]) {
      const val = result[field];
      if (typeof val === 'string' && val.includes('T')) {
        result[field] = val.split('T')[0];
      } else if (val instanceof Date) {
        result[field] = val.toISOString().split('T')[0];
      } else if (typeof val === 'number') {
        result[field] = new Date(val).toISOString().split('T')[0];
      }
    }
  }
  if (result.selectedDate && !result.transferDate) {
    result.transferDate = result.selectedDate;
  }
  return result;
}

function getPayloadSummary(payload: Record<string, any>): string {
  const summary: string[] = [];
  if (payload.transferNumber) summary.push(`رقم: ${payload.transferNumber}`);
  if (payload.amount) summary.push(`مبلغ: ${payload.amount}`);
  if (payload.name) summary.push(`اسم: ${payload.name}`);
  if (payload.project_id) summary.push(`مشروع: ${payload.project_id}`);
  if (payload.id) summary.push(`ID: ${String(payload.id).substring(0, 8)}`);
  return summary.join(' | ') || 'بدون تفاصيل';
}

export async function queueForSync(
  action: 'create' | 'update' | 'delete',
  endpoint: string,
  payload: Record<string, any>
): Promise<string> {
  payload = normalizeDateFields(payload);
  const idempotencyKey = generateIdempotencyKey(action, endpoint, payload);

  const existingItems = await smartGetAll('syncQueue');
  const duplicate = existingItems.find((item: SyncQueueItem) =>
    item.idempotencyKey === idempotencyKey &&
    item.status !== 'failed' &&
    item.status !== 'duplicate-resolved'
  );

  if (duplicate) {
    console.log(`⚠️ [Queue] عملية مكررة تم تجاهلها: ${idempotencyKey}`);
    if (action === 'update') {
      duplicate.payload = { ...duplicate.payload, ...payload };
      duplicate.lastModifiedAt = Date.now();
      await smartPut('syncQueue', duplicate);
      console.log(`🔄 [Queue] تم تحديث payload العملية المكررة: ${duplicate.id}`);
    }
    return duplicate.id;
  }

  const now = Date.now();
  const id = uuidv4();
  const queueItem: SyncQueueItem = {
    id,
    action,
    endpoint,
    payload,
    timestamp: now,
    lastModifiedAt: now,
    retries: 0,
    status: 'pending',
    idempotencyKey
  };

  await smartAdd('syncQueue', queueItem);
  return id;
}

const IN_FLIGHT_TIMEOUT = 120000;

export async function recoverStaleInFlightItems(): Promise<number> {
  const allItems = await smartGetAll('syncQueue');
  const now = Date.now();
  let recovered = 0;
  for (const item of allItems) {
    if (item.status === 'in-flight' && item.lastAttemptAt && (now - item.lastAttemptAt) > IN_FLIGHT_TIMEOUT) {
      item.status = 'failed';
      item.lastError = 'تعافي: عملية عالقة بعد انقطاع';
      await smartPut('syncQueue', item);
      recovered++;
    }
  }
  if (recovered > 0) {
    console.log(`🔧 [Queue] تم استعادة ${recovered} عمليات عالقة (in-flight)`);
  }
  return recovered;
}

export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  await recoverStaleInFlightItems();
  const allItems = await smartGetAll('syncQueue');
  return allItems
    .filter((item: SyncQueueItem) => item.status === 'pending' || item.status === 'failed' || !item.status)
    .sort((a: any, b: any) => a.timestamp - b.timestamp);
}

export async function getAllSyncQueueItems(): Promise<SyncQueueItem[]> {
  const allItems = await smartGetAll('syncQueue');
  return allItems.sort((a: any, b: any) => b.timestamp - a.timestamp);
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await smartDelete('syncQueue', id);
}

export async function markItemInFlight(id: string): Promise<void> {
  const item = await smartGet('syncQueue', id);
  if (item) {
    item.status = 'in-flight';
    item.lastAttemptAt = Date.now();
    await smartPut('syncQueue', item);
  }
}

export async function markItemFailed(id: string, error: string, errorType?: string): Promise<void> {
  const item = await smartGet('syncQueue', id);
  if (item) {
    item.status = 'failed';
    item.retries = (item.retries || 0) + 1;
    item.lastError = error;
    item.errorType = errorType || 'unknown';
    item.lastAttemptAt = Date.now();
    await smartPut('syncQueue', item);
  }
}

export async function markItemDuplicateResolved(id: string, message: string): Promise<void> {
  const item = await smartGet('syncQueue', id);
  if (item) {
    item.status = 'duplicate-resolved';
    item.lastError = message;
    item.lastAttemptAt = Date.now();
    await smartPut('syncQueue', item);

    await logSyncResult({
      queueItemId: id,
      action: item.action,
      endpoint: item.endpoint,
      status: 'duplicate',
      errorMessage: message,
      payloadSummary: getPayloadSummary(item.payload),
      retryCount: item.retries
    });
  }
}

export async function updateSyncRetries(
  id: string,
  retries: number,
  error?: string,
  errorType?: string
): Promise<void> {
  const item = await smartGet('syncQueue', id);
  if (item) {
    item.retries = retries;
    item.status = 'failed';
    item.lastAttemptAt = Date.now();
    if (error) item.lastError = error;
    if (errorType) item.errorType = errorType;
    await smartPut('syncQueue', item);
  }
}

export async function cancelSyncQueueItem(id: string): Promise<void> {
  const item = await smartGet('syncQueue', id);
  if (item) {
    await logSyncResult({
      queueItemId: id,
      action: item.action,
      endpoint: item.endpoint,
      status: 'skipped',
      errorMessage: 'تم الإلغاء يدوياً بواسطة المستخدم',
      payloadSummary: getPayloadSummary(item.payload),
      retryCount: item.retries
    });
  }
  await smartDelete('syncQueue', id);
}

export async function cancelAllSyncQueueItems(): Promise<number> {
  const items = await getPendingSyncQueue();
  const count = items.length;
  for (const item of items) {
    await logSyncResult({
      queueItemId: item.id,
      action: item.action,
      endpoint: item.endpoint,
      status: 'skipped',
      errorMessage: 'تم الإلغاء يدوياً (إلغاء جماعي)',
      payloadSummary: getPayloadSummary(item.payload),
      retryCount: item.retries
    });
  }
  await smartClear('syncQueue');
  return count;
}

export async function logSyncResult(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): Promise<void> {
  const logEntry: SyncLogEntry = {
    id: uuidv4(),
    timestamp: Date.now(),
    ...entry
  };
  try {
    await smartAdd('syncHistory', logEntry);
    const allLogs = await smartGetAll('syncHistory');
    if (allLogs.length > 500) {
      const sorted = allLogs.sort((a: SyncLogEntry, b: SyncLogEntry) => b.timestamp - a.timestamp);
      const toRemove = sorted.slice(500);
      for (const old of toRemove) {
        await smartDelete('syncHistory', old.id);
      }
    }
  } catch (e) {
    console.warn('⚠️ [SyncLog] فشل تسجيل السجل:', e);
  }
}

export async function getSyncHistory(limit = 50): Promise<SyncLogEntry[]> {
  try {
    const all = await smartGetAll('syncHistory');
    return all
      .sort((a: SyncLogEntry, b: SyncLogEntry) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  const allItems = await smartGetAll('syncQueue');
  return allItems
    .filter((item: SyncQueueItem) => item.status === 'failed' || item.status === 'conflict')
    .sort((a: any, b: any) => b.lastAttemptAt - a.lastAttemptAt);
}

export async function getDuplicateResolvedItems(): Promise<SyncQueueItem[]> {
  const allItems = await smartGetAll('syncQueue');
  return allItems
    .filter((item: SyncQueueItem) => item.status === 'duplicate-resolved')
    .sort((a: any, b: any) => b.lastAttemptAt - a.lastAttemptAt);
}

export async function retryFailedItem(id: string): Promise<void> {
  const item = await smartGet('syncQueue', id);
  if (item && (item.status === 'failed' || item.status === 'conflict')) {
    item.status = 'pending';
    item.lastError = undefined;
    await smartPut('syncQueue', item);
  }
}

export async function retryAllFailed(): Promise<number> {
  const failed = await getFailedSyncItems();
  let count = 0;
  for (const item of failed) {
    item.status = 'pending';
    item.lastError = undefined;
    await smartPut('syncQueue', item);
    count++;
  }
  return count;
}

export async function saveUserDataLocal(
  type: string,
  data: Record<string, any>
): Promise<string> {
  const id = data.id || uuidv4();
  const userData = {
    id, type, data,
    syncedAt: 0,
    created_at: Date.now()
  };
  await smartPut('userData', userData);
  return id;
}

export async function getUserDataLocal(type: string) {
  return await smartQuery('userData', (item: any) => item.type === type);
}

export async function saveListLocal(
  storeName: string,
  items: Record<string, any>[],
  metadata?: { syncedAt: number; totalCount: number }
): Promise<void> {
  await smartClear(storeName);
  const enrichedItems = items.map(item => ({
    ...item,
    created_at: item.created_at || Date.now(),
    _syncedAt: metadata?.syncedAt || Date.now()
  }));
  await smartSave(storeName, enrichedItems);
}

export async function getListLocal(storeName: string) {
  const items = await smartGetAll(storeName);
  return items.sort((a: any, b: any) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });
}

export async function getItemLocal(storeName: string, id: string) {
  return await smartGet(storeName, id);
}

export async function updateItemLocal(
  storeName: string,
  id: string,
  updates: Record<string, any>
): Promise<void> {
  const item = await smartGet(storeName, id);
  if (item) {
    const updated = { ...item, ...updates, _updated_at: Date.now() };
    await smartPut(storeName, updated);
  }
}

export async function addLocalFirst(
  storeName: string,
  item: Record<string, any>,
  endpoint: string
): Promise<string> {
  const id = item.id || uuidv4();
  const newItem = {
    ...item,
    id,
    _isLocal: true,
    _pendingSync: true,
    created_at: item.created_at || new Date().toISOString()
  };
  await smartPut(storeName, newItem);
  await queueForSync('create', endpoint, newItem);
  return id;
}

export async function updateLocalFirst(
  storeName: string,
  id: string,
  updates: Record<string, any>,
  endpoint: string
): Promise<void> {
  const item = await smartGet(storeName, id);
  if (item) {
    const updatedItem = {
      ...item,
      ...updates,
      _pendingSync: true,
      updated_at: new Date().toISOString()
    };
    await smartPut(storeName, updatedItem);
    await queueForSync('update', `${endpoint}/${id}`, updates);
  }
}

export async function getSyncStats() {
  const pendingCount = await smartCount('syncQueue');
  const userDataCount = await smartCount('userData');
  const allItems = await smartGetAll('syncQueue');
  const failedCount = allItems.filter((i: SyncQueueItem) => i.status === 'failed' || i.status === 'conflict').length;
  const duplicateCount = allItems.filter((i: SyncQueueItem) => i.status === 'duplicate-resolved').length;

  let history: SyncLogEntry[] = [];
  try {
    history = await getSyncHistory(100);
  } catch { /* ignore */ }

  const successCount = history.filter(h => h.status === 'success').length;
  const recentFailures = history.filter(h => h.status === 'failed').length;

  const dlqCount = await smartCount('deadLetterQueue');

  return {
    pendingSync: pendingCount - failedCount - duplicateCount,
    failedSync: failedCount,
    duplicateResolved: duplicateCount,
    deadLetterCount: dlqCount,
    localUserData: userDataCount,
    totalSuccessful: successCount,
    totalRecentFailures: recentFailures,
    lastUpdate: Date.now()
  };
}

export async function moveToDLQ(item: SyncQueueItem): Promise<void> {
  const dlqItem: DeadLetterItem = {
    id: uuidv4(),
    originalId: item.id,
    action: item.action,
    endpoint: item.endpoint,
    payload: item.payload,
    timestamp: item.timestamp,
    movedAt: Date.now(),
    totalRetries: item.retries,
    lastError: item.lastError || 'تجاوز الحد الأقصى للمحاولات',
    errorType: item.errorType || 'max_retries',
    idempotencyKey: item.idempotencyKey,
  };

  await smartAdd('deadLetterQueue', dlqItem);
  await removeSyncQueueItem(item.id);

  await logSyncResult({
    queueItemId: item.id,
    action: item.action,
    endpoint: item.endpoint,
    status: 'failed',
    errorMessage: `نُقلت إلى قائمة العمليات المعلقة نهائياً بعد ${item.retries} محاولة`,
    payloadSummary: getPayloadSummary(item.payload),
    retryCount: item.retries,
  });
}

export async function getDLQItems(): Promise<DeadLetterItem[]> {
  const items = await smartGetAll('deadLetterQueue');
  return items.sort((a: DeadLetterItem, b: DeadLetterItem) => b.movedAt - a.movedAt);
}

export async function getDLQCount(): Promise<number> {
  return await smartCount('deadLetterQueue');
}

export async function retryDLQItem(dlqItemId: string): Promise<void> {
  const dlqItem: DeadLetterItem | null = await smartGet('deadLetterQueue', dlqItemId);
  if (!dlqItem) return;

  const newQueueItem: SyncQueueItem = {
    id: uuidv4(),
    action: dlqItem.action,
    endpoint: dlqItem.endpoint,
    payload: dlqItem.payload,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
    idempotencyKey: dlqItem.idempotencyKey,
  };

  await smartAdd('syncQueue', newQueueItem);
  await smartDelete('deadLetterQueue', dlqItemId);
}

export async function retryAllDLQ(): Promise<number> {
  const items = await getDLQItems();
  let count = 0;
  for (const item of items) {
    await retryDLQItem(item.id);
    count++;
  }
  return count;
}

export async function removeDLQItem(id: string): Promise<void> {
  await smartDelete('deadLetterQueue', id);
}

export async function clearDLQ(): Promise<number> {
  const items = await getDLQItems();
  const count = items.length;
  await smartClear('deadLetterQueue');
  return count;
}
