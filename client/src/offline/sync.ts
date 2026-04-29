import {
  getPendingSyncQueue, removeSyncQueueItem, markItemInFlight,
  markItemFailed, markItemDuplicateResolved, logSyncResult
} from './offline';
import { clearAllLocalData } from './data-cleanup';
import { resolveConflictLWW, logConflict } from './conflict-resolver';
import type { ConflictData } from './conflict-resolver';
import { apiRequest } from '../lib/api-client';
import { smartSave, smartGetAll, smartClear, smartPut, smartGet, applyServerRecordsWithTombstones } from './storage-factory';
import { getGlobalCursor, setGlobalCursor } from './sync-cursors';
import { intelligentMonitor } from './intelligent-monitor';
import { ENV } from '../lib/env';
import { getAccessToken, isWebCookieMode } from '../lib/auth-token-store';
import { SYNCABLE_TABLES, SERVER_TO_IDB_TABLE_MAP } from '@shared/schema';
import { endpointToStore } from './store-registry';
import { initLeaderElection, isCurrentTabLeader, onLeaderChange } from './sync-leader';
import { Capacitor } from '@capacitor/core';
import { createSyncSpan, SpanStatusCode } from '../lib/instrumentation';
import * as performanceMonitor from './performance-monitor';
import * as Sentry from '@sentry/react';

async function isNetworkAvailable(): Promise<boolean> {
  // لا نستخدم isPluginAvailable('Network') — لا تعمل في Capacitor 8. نستدعي مباشرة.
  if (Capacitor.isNativePlatform()) {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      return status.connected;
    } catch (err) {
      intelligentMonitor.logEvent({ 
        type: 'sync', 
        severity: 'low', 
        message: 'Network status check failed silently', 
        metadata: { error: err } 
      });
    }
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export const ALL_SYNC_TABLES = SYNCABLE_TABLES;

const SERVER_TO_IDB_MAP: Record<string, string> = SERVER_TO_IDB_TABLE_MAP;

export function serverTableToIDB(serverName: string): string {
  return SERVER_TO_IDB_MAP[serverName] || serverName;
}

const MAX_RETRIES = 5;
const INITIAL_SYNC_DELAY = 2000; 
let isSyncing = false;

export function isSyncEngineActive(): boolean {
  return isSyncing;
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
let syncListeners: ((state: SyncState) => void)[] = [];
let syncInterval: NodeJS.Timeout | null = null;

export interface SyncState {
  isSyncing: boolean;
  lastSync: number;
  pendingCount: number;
  lastError?: string;
  lastErrorType?: any;
  lastErrorDetails?: any;
  isOnline: boolean;
  syncedCount?: number;
  failedCount?: number;
  latency?: number; // زمن الاستجابة بالملي ثانية
  progress?: {
    total: number;
    current: number;
    tableName: string;
    percentage: number;
  };
}

let currentSyncState: SyncState = {
  isSyncing: false,
  lastSync: 0,
  pendingCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastErrorType: undefined,
  lastErrorDetails: undefined
};

export function subscribeSyncState(listener: (state: SyncState) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function updateSyncState(updates: Partial<SyncState>) {
  currentSyncState = { ...currentSyncState, ...updates };
  syncListeners.forEach(listener => listener(currentSyncState));
}

/**
 * Force sync a single table with new data
 */
export async function forceSyncTable(tableName: string, data: any[]) {
  try {
    await smartClear(tableName);
    await smartSave(tableName, data);
    return true;
  } catch (error) {
    return false;
  }
}

export function getSyncState(): SyncState {
  return { ...currentSyncState };
}

/**
 * حساب وقت الانتظار (Exponential Backoff)
 */
function getBackoffDelay(retries: number): number {
  return Math.min(30000, INITIAL_SYNC_DELAY * Math.pow(2, retries));
}

/**
 * 📥 سحب البيانات الكاملة من الخادم لمرة واحدة (التكامل التام)
 */
export async function performInitialDataPull(): Promise<boolean> {
  if (!isWebCookieMode()) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      return false;
    }
  }

  const online = await isNetworkAvailable();
  if (!online) {
    return false;
  }

  if (!isCurrentTabLeader()) {
    return false;
  }

  if (isSyncing) {
    return false;
  }

  try {
    updateSyncState({ isSyncing: true });

    // 🔄 Delta Sync: read cursor, request only what changed since then.
    // First-time = no cursor = full pull. Subsequent = delta only.
    const lastCursor = await getGlobalCursor();
    const isDeltaMode = !!lastCursor;
    const span = createSyncSpan(isDeltaMode ? 'delta-sync' : 'full-backup');
    const requestBody = isDeltaMode ? { lastSyncTime: lastCursor } : {};

    if (isDeltaMode) {
      console.log(`[sync] 🔄 Delta pull since ${lastCursor}`);
    } else {
      console.log('[sync] 📥 First-time full pull (no cursor)');
    }

    const result = await apiRequest('/api/sync/full-backup', 'POST', requestBody, 0);
    
    if (!result || (typeof result === 'object' && result.code === 'INVALID_TOKEN') || result.status === 401 || result.status === 403) {
      if (result?.status === 401 || result?.status === 403) {
        stopSyncListener();
        window.dispatchEvent(new CustomEvent('sync:auth-required'));
        intelligentMonitor.logEvent({
          type: 'auth',
          severity: 'high',
          message: 'Sync stopped: Authentication required (401/403)',
          metadata: { status: result.status }
        });
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Auth required' });
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid token or server error' });
      }
      span.end();
      return false;
    }
    
    if (!result.success || !result.data) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Sync failed on server' });
      span.end();
      return false;
    }

    const { data } = result;
    const tableEntries = Object.entries(data);
    const totalTables = tableEntries.length;
    let processedTables = 0;
    let totalSaved = 0;
    
    // تسجيل حجم البيانات (تقديري)
    const payloadBytes = JSON.stringify(data).length;
    performanceMonitor.recordPayloadSize(payloadBytes, 'pull');
    span.setAttributes({
      'sync.payload_bytes': payloadBytes,
      'sync.tables_count': totalTables
    });

    if (data.users && Array.isArray(data.users)) {
      processedTables++;
      updateSyncState({ 
        progress: { 
          total: totalTables, 
          current: processedTables, 
          tableName: 'users',
          percentage: Math.round((processedTables / totalTables) * 100)
        } 
      });
      await smartSave('users', data.users);
      
      const existingEmergency = await smartGetAll('emergencyUsers');
      const existingMap = new Map(existingEmergency.map((e: any) => [e.id, e]));
      
      const emergencyData = data.users.map((u: any) => {
        const existing = existingMap.get(u.id.toString());
        return {
          id: u.id.toString(),
          email: u.email,
          passwordHash: (existing?.passwordHash && existing.passwordHash.startsWith('pbkdf2:')) 
            ? existing.passwordHash 
            : '',
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
          role: u.role || 'user'
        };
      });
      await smartSave('emergencyUsers', emergencyData);
    }

    const BATCH_SIZE = 5;
    let totalDeleted = 0;
    let totalConflicts = 0;
    for (let i = 0; i < tableEntries.length; i += BATCH_SIZE) {
      const batch = tableEntries.slice(i, i + BATCH_SIZE);
      for (const [serverTableName, records] of batch) {
        if (serverTableName !== 'users' && Array.isArray(records)) {
          processedTables++;
          const idbStore = serverTableToIDB(serverTableName);
          updateSyncState({ 
            progress: { 
              total: totalTables, 
              current: processedTables, 
              tableName: idbStore,
              percentage: Math.min(100, Math.round((processedTables / totalTables) * 100))
            } 
          });

          if (isDeltaMode) {
            // 🪦 Delta mode: تطبيق ما يرسله السيرفر فقط (upserts + tombstones صريحة)
            const { saved, deleted, conflicts } = await applyServerRecordsWithTombstones(
              idbStore,
              records as any[],
            );
            totalSaved += saved;
            totalDeleted += deleted;
            totalConflicts += conflicts;
            if (deleted > 0) console.log(`[sync] 🪦 ${idbStore}: حُذف ${deleted} (tombstone صريح)`);
            if (conflicts > 0) console.log(`[sync] ⚔️ ${idbStore}: ${conflicts} تعارض`);
          } else {
            // 📥 First-time full pull: استخدم reconcile (يتضمن diff للأمان)
            const { smartReconcile } = await import('./storage-factory');
            const { saved, removed } = await smartReconcile(idbStore, records as any[]);
            totalSaved += saved;
            totalDeleted += removed;
            if (removed > 0) console.log(`[sync] 🪦 ${idbStore}: حُذف ${removed} سجلاً (full reconcile)`);
          }
        }
      }
    }

    // 🔖 حفظ الوقت الذي أرسله السيرفر كـ cursor للمزامنة التالية
    const serverTimestamp: string =
      result.timestamp ||
      result.metadata?.timestamp ||
      new Date().toISOString();

    await setGlobalCursor(serverTimestamp);

    await smartPut('syncMetadata', {
      id: 'lastSync',
      key: 'lastSync',
      timestamp: Date.now(),
      version: '4.0-delta',
      recordCount: totalSaved,
      lastSyncTime: Date.now(),
      deletedCount: totalDeleted,
      conflictsCount: totalConflicts,
      isDeltaMode,
      serverCursor: serverTimestamp,
    });

    console.log(
      `[sync] ✅ ${isDeltaMode ? 'Delta' : 'Full'} pull done: ` +
      `+${totalSaved} saved, -${totalDeleted} deleted, ${totalConflicts} conflicts`,
    );

    updateSyncState({ isSyncing: false, lastSync: Date.now(), progress: undefined });
    span.setAttributes({
      'sync.duration_ms': Date.now() - (span as any).startTime?.[0] || 0, // Fallback if internal access fails, but we can just use simple logic
      'sync.records_count': totalSaved
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Capture critical errors in Sentry
    Sentry.captureException(error, { tags: { component: 'sync', operation: 'full-backup' } });

    updateSyncState({ 
      isSyncing: false, 
      lastError: `فشل الاستيراد: ${errorMsg}` 
    });

    // معالجة سيناريو "انقطاع الإنترنت المفاجئ أثناء الاستيراد"
    if (error instanceof Error && error.name === 'AbortError') {
    }
    
    return false;
  } finally {
    isSyncing = false;
  }
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

async function checkLWWConflict(item: { action: string; endpoint: string; payload: Record<string, any>; timestamp: number; lastModifiedAt?: number; id: string }): Promise<'proceed' | 'skip'> {
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

/**
 * مزامنة جميع البيانات المعلقة
 */
export async function syncOfflineData(): Promise<void> {
  if (isSyncing) return;
  const online = await isNetworkAvailable();
  if (!online) {
    updateSyncState({ isOnline: false });
    return;
  }
  if (!isCurrentTabLeader()) return;

  isSyncing = true;
  updateSyncState({ isSyncing: true, isOnline: true });
  const span = createSyncSpan('sync-offline-data');

  try {
    const pending = await getPendingSyncQueue();
    span.setAttribute('sync.pending_count', pending.length);
    if (pending.length === 0) {
      updateSyncState({ isSyncing: false });
      isSyncing = false;
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return;
    }

    
    let successCount = 0;
    let failedCount = 0;
    let totalPayloadBytes = 0;

    for (const item of pending) {
      if (item.retries >= MAX_RETRIES) {
        await markItemFailed(item.id, `تجاوز الحد الأقصى للمحاولات (${MAX_RETRIES})`, 'max_retries');
        failedCount++;
        continue;
      }

      try {
        await markItemInFlight(item.id);
        const startTime = Date.now();

        const lwwDecision = await checkLWWConflict(item);
        if (lwwDecision === 'skip') {
          await removeSyncQueueItem(item.id);
          await logSyncResult({
            queueItemId: item.id,
            action: item.action,
            endpoint: item.endpoint,
            status: 'success',
            duration: Date.now() - startTime,
            retryCount: item.retries,
          });
          successCount++;
          continue;
        }

        const payloadString = JSON.stringify(item.payload);
        totalPayloadBytes += payloadString.length;
        const signature = btoa(encodeURIComponent(payloadString).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16)))).substring(0, 32);
        
        let result: any;
        try {
          result = await apiRequest(item.endpoint, item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE', {
            ...item.payload,
            _metadata: {
              signature,
              version: item.payload.version || 1,
              clientTimestamp: item.lastModifiedAt || item.timestamp,
              deviceId: localStorage.getItem('deviceId') || 'web-client'
            }
          });
        } catch (apiError: any) {
          const statusCode = extractStatusCode(apiError);
          const errorMsg = apiError?.message || apiError?.error || String(apiError);

          if (statusCode === 401 || statusCode === 403) {
            stopSyncListener();
            window.dispatchEvent(new CustomEvent('sync:auth-required'));
            intelligentMonitor.logEvent({
              type: 'auth',
              severity: 'high',
              message: 'Sync stopped: Authentication required (401/403)',
              metadata: { status: statusCode }
            });
            isSyncing = false;
            updateSyncState({ isSyncing: false });
            return;
          }

          if (statusCode === 409) {
            await markItemDuplicateResolved(item.id, errorMsg);
            successCount++;
            continue;
          }

          if (statusCode === 400 || statusCode === 422) {
            await markItemFailed(item.id, errorMsg, 'validation');
            await logSyncResult({
              queueItemId: item.id,
              action: item.action,
              endpoint: item.endpoint,
              status: 'failed',
              duration: Date.now() - startTime,
              errorMessage: errorMsg,
              errorCode: String(statusCode),
              retryCount: item.retries + 1
            });
            failedCount++;
            continue;
          }

          await markItemFailed(item.id, errorMsg, 'network');
          failedCount++;

          intelligentMonitor.logEvent({
            type: 'sync',
            severity: item.retries > 2 ? 'high' : 'medium',
            message: `فشل مزامنة عنصر: ${errorMsg}`,
            metadata: { retryCount: item.retries + 1, itemId: item.id }
          });

          const delay = getBackoffDelay(item.retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const requestLatency = Date.now() - startTime;

        if (result && result.success !== false) {
          await removeSyncQueueItem(item.id);
          
          const recordId = item.payload.id;
          const tableName = endpointToStore(item.endpoint);
          
          if (tableName && recordId) {
            try {
              const localRecords = await smartGetAll(tableName);
              const record = localRecords.find((r: any) => (r.id || r.key) === recordId);
              if (record) {
                record.synced = true;
                record.pendingSync = false;
                record.isLocal = false;
                await smartSave(tableName, [record]);
              }
            } catch (updateError) {
              intelligentMonitor.logEvent({
                type: 'sync',
                severity: 'medium',
                message: 'Failed to update local item sync status after success',
                metadata: { error: updateError, tableName, recordId }
              });
            }
          }
          
          await logSyncResult({
            queueItemId: item.id,
            action: item.action,
            endpoint: item.endpoint,
            status: 'success',
            duration: requestLatency,
            retryCount: item.retries
          });

          successCount++;
          updateSyncState({ latency: requestLatency, pendingCount: pending.length - successCount - failedCount });
        } else {
          const errMsg = result?.message || result?.error || 'استجابة غير ناجحة';
          await markItemFailed(item.id, errMsg, 'server');
          failedCount++;
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'خطأ غير معروف';
        await markItemFailed(item.id, errorMsg, 'unknown');
        failedCount++;
        
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: 'high',
          message: `فشل مزامنة عنصر: ${errorMsg}`,
          metadata: { itemId: item.id }
        });
      }
    }

    performanceMonitor.recordPayloadSize(totalPayloadBytes, 'push');
    span.setAttributes({
      'sync.synced_count': successCount,
      'sync.failed_count': failedCount,
      'sync.payload_bytes': totalPayloadBytes
    });
    span.setStatus({ code: failedCount === 0 ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    span.end();

    updateSyncState({ 
      lastSync: Date.now(),
      isSyncing: false,
      syncedCount: successCount,
      failedCount
    });
  } catch (error) {
    updateSyncState({ isSyncing: false });
    Sentry.captureException(error, { tags: { component: 'sync', operation: 'sync-offline-data' } });
    
    intelligentMonitor.logEvent({
      type: 'error',
      severity: 'high',
      message: `خطأ حرج في محرك المزامنة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : 'Unknown error' });
    span.end();
  } finally {
    isSyncing = false;
  }
}

/**
 * تهيئة مستمع المزامنة
 */
export function initSyncListener(): void {
  initLeaderElection();
  _initSyncListenerAsync().catch(err => {
    intelligentMonitor.logEvent({
      type: 'sync',
      severity: 'high',
      message: 'Async sync listener initialization failed',
      metadata: { error: err }
    });
  });
}

async function _initSyncListenerAsync(): Promise<void> {

  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    if (isCurrentTabLeader()) {
      performInitialDataPull().catch(err => {
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: 'medium',
          message: 'Initial data pull failed on network reconnect',
          metadata: { error: err }
        });
      });
      syncOfflineData().catch(err => {
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: 'medium',
          message: 'Offline data sync failed on network reconnect',
          metadata: { error: err }
        });
      });
    }
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });

  onLeaderChange((leader) => {
    if (leader) {
      isNetworkAvailable().then(online => {
        if (online) {
          performInitialDataPull().catch(err => {
            intelligentMonitor.logEvent({
              type: 'sync',
              severity: 'medium',
              message: 'Initial data pull failed on leader change',
              metadata: { error: err }
            });
          });
          syncOfflineData().catch(err => {
            intelligentMonitor.logEvent({
              type: 'sync',
              severity: 'medium',
              message: 'Offline data sync failed on leader change',
              metadata: { error: err }
            });
          });
        }
      });
    }
  });

  if (isCurrentTabLeader()) {
    const runSync = async () => {
      await performInitialDataPull();
      await syncOfflineData();
    };
    runSync().catch(err => {
      intelligentMonitor.logEvent({
        type: 'sync',
        severity: 'medium',
        message: 'Initial runSync failed',
        metadata: { error: err }
      });
    });
  }

  syncInterval = setInterval(async () => {
    if (isCurrentTabLeader()) {
      const online = await isNetworkAvailable();
      if (online) syncOfflineData().catch(err => {
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: 'low',
          message: 'Interval sync failed',
          metadata: { error: err }
        });
      });
    }
  }, 30000);

  if (Capacitor.isNativePlatform()) {
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          const online = await isNetworkAvailable();
          if (online) {
            updateSyncState({ isOnline: true });
            await syncOfflineData().catch(err => {
              intelligentMonitor.logEvent({
                type: 'sync',
                severity: 'medium',
                message: 'App foreground sync failed',
                metadata: { error: err }
              });
            });
          }
        }
      });
    } catch (err) {
      intelligentMonitor.logEvent({
        type: 'sync',
        severity: 'low',
        message: 'App state change listener registration failed',
        metadata: { error: err }
      });
    }
  }
}

export function stopSyncListener(): void {
  if (syncInterval) clearInterval(syncInterval);
}

export function triggerSync() {
  if (!isCurrentTabLeader()) return;
  syncOfflineData().catch(err => {
    intelligentMonitor.logEvent({
      type: 'sync',
      severity: 'medium',
      message: 'Triggered sync failed',
      metadata: { error: err }
    });
  });
}

export async function loadFullBackup(): Promise<{ recordCount: number }> {
  try {
    const result = await apiRequest('/api/sync/full-backup', 'POST', {}, 0);
    
    if (!result || !result.success || !result.data) {
      throw new Error('Backup failed on server');
    }
    
    const { data } = result;
    
    let totalSaved = 0;
    for (const [serverTable, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        const idbStore = serverTableToIDB(serverTable);
        await smartSave(idbStore, records);
        totalSaved += records.length;
      }
    }
    
    await smartPut('syncMetadata', {
      id: 'lastSync',
      key: 'lastSync',
      timestamp: Date.now(),
      version: '3.0',
      recordCount: totalSaved
    });
    
    return { recordCount: totalSaved };
  } catch (error: any) {
    throw error;
  }
}

export function startBackgroundSync(): void {
  if (isSyncing) return;
  if (!isCurrentTabLeader()) return;
  syncOfflineData().catch(err => {
    intelligentMonitor.logEvent({
      type: 'sync',
      severity: 'medium',
      message: 'Background sync failed',
      metadata: { error: err }
    });
  });
}

/**
 * ⚡ المزامنة الفورية (Instant Sync)
 * مزامنة فورية لجداول محددة أو جميع الجداول
 */
export async function performInstantSync(tables?: string[], lastSyncTime?: number): Promise<{
  success: boolean;
  totalRecords: number;
  duration: number;
}> {
  if (!isCurrentTabLeader()) {
    return { success: false, totalRecords: 0, duration: 0 };
  }
  try {
    const startTime = Date.now();
    
    const result = await apiRequest('/api/sync/instant-sync', 'POST', {
      tables: tables || [],
      lastSyncTime
    }, 60000);
    
    if (!result || !result.success || !result.data) {
      throw new Error('Instant sync failed');
    }
    
    const { data } = result;
    let totalSaved = 0;
    
    for (const [serverTable, records] of Object.entries(data)) {
      if (Array.isArray(records) && records.length > 0) {
        const idbStore = serverTableToIDB(serverTable);
        await smartSave(idbStore, records);
        totalSaved += records.length;
      }
    }
    
    const duration = Date.now() - startTime;
    
    updateSyncState({ lastSync: Date.now() });
    
    return {
      success: true,
      totalRecords: totalSaved,
      duration
    };
  } catch (error) {
    return {
      success: false,
      totalRecords: 0,
      duration: 0
    };
  }
}

/**
 * ✅ التحقق من التطابق مع الخادم
 * مقارنة عدد السجلات بين العميل والخادم
 */
export async function verifySyncStatus(): Promise<{
  isMatched: boolean;
  differences: Array<{ table: string; serverCount: number; clientCount: number; diff: number }>;
  summary: { totalServerRecords: number; totalClientRecords: number; matchedTables: number; mismatchedTables: number };
}> {
  try {
    
    const clientCounts: Record<string, number> = {};
    
    for (const tableName of ALL_SYNC_TABLES) {
      try {
        const records = await smartGetAll(tableName);
        clientCounts[tableName] = records?.length || 0;
      } catch {
        clientCounts[tableName] = 0;
      }
    }
    
    const result = await apiRequest('/api/sync/verify-sync', 'POST', { clientCounts }, 30000);
    
    if (!result || !result.success) {
      throw new Error('Verify sync failed');
    }
    
    
    return {
      isMatched: result.isMatched,
      differences: result.differences || [],
      summary: result.summary || {
        totalServerRecords: 0,
        totalClientRecords: 0,
        matchedTables: 0,
        mismatchedTables: 0
      }
    };
  } catch (error) {
    return {
      isMatched: false,
      differences: [],
      summary: {
        totalServerRecords: 0,
        totalClientRecords: 0,
        matchedTables: 0,
        mismatchedTables: 0
      }
    };
  }
}

/**
 * 📊 الحصول على إحصائيات المزامنة
 */
export async function getSyncStats(): Promise<{
  stats: Record<string, number>;
  totalRecords: number;
}> {
  try {
    const result = await apiRequest('/api/sync/stats', 'GET', undefined, 30000);
    
    if (!result || !result.success) {
      return { stats: {}, totalRecords: 0 };
    }
    
    return {
      stats: result.stats || {},
      totalRecords: result.summary?.totalRecords || 0
    };
  } catch (error) {
    return { stats: {}, totalRecords: 0 };
  }
}
