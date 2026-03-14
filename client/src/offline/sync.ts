import {
  getPendingSyncQueue, removeSyncQueueItem, markItemInFlight,
  markItemFailed, markItemDuplicateResolved, logSyncResult
} from './offline';
import { clearAllLocalData } from './data-cleanup';
import { resolveConflictLWW, logConflict } from './conflict-resolver';
import type { ConflictData } from './conflict-resolver';
import { apiRequest } from '../lib/api-client';
import { smartSave, smartGetAll, smartClear, smartPut, smartGet } from './storage-factory';
import { intelligentMonitor } from './intelligent-monitor';
import { ENV } from '../lib/env';
import { getAccessToken } from '../lib/auth-token-store';
import { SYNCABLE_TABLES, SERVER_TO_IDB_TABLE_MAP } from '@shared/schema';
import { endpointToStore } from './store-registry';
import { initLeaderElection, isCurrentTabLeader, onLeaderChange } from './sync-leader';

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
    console.log(`✅ [ForceSync] Table ${tableName} synced with ${data.length} records`);
    return true;
  } catch (error) {
    console.error(`❌ [ForceSync] Failed to sync ${tableName}:`, error);
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
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    console.warn('🔑 [Sync] لا يمكن السحب الأولي بدون توكن');
    return false;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('📡 [Sync] لا يمكن السحب الأولي بدون إنترنت');
    return false;
  }

  if (!isCurrentTabLeader()) {
    console.log('🔄 [Sync] هذا التبويب ليس القائد، تخطي السحب الأولي');
    return false;
  }

  if (isSyncing) {
    console.log('🔄 [Sync] المزامنة جارية بالفعل، تخطي الطلب الجديد');
    return false;
  }

  try {
    console.log('📥 [Sync] بدء سحب البيانات الكاملة من الخادم...');
    updateSyncState({ isSyncing: true });

    // محاولة جلب البيانات مع مهلة زمنية (Timeout) للتعامل مع ضعف الإنترنت
    // ترقية: استخدام نقطة النهاية المخصصة للمزامنة الكاملة بدلاً من المسار القديم
    console.log('📡 [Sync] إرسال طلب apiRequest إلى /api/sync/full-backup');
    const result = await apiRequest('/api/sync/full-backup', 'POST', undefined, 120000);
    console.log('📡 [Sync] نتيجة الطلب:', result ? 'نجح' : 'فشل');
    
    if (!result || (typeof result === 'object' && result.code === 'INVALID_TOKEN')) {
      console.error('❌ [Sync] فشل المصادقة أو انتهت المهلة، يجب تسجيل الدخول مرة أخرى');
      return false;
    }
    
    if (!result.success || !result.data) {
      console.error('❌ [Sync] فشل جلب البيانات من السيرفر:', result?.error || 'بيانات غير صالحة', result);
      return false;
    }

    const { data } = result;
    const tableEntries = Object.entries(data);
    const totalTables = tableEntries.length;
    let processedTables = 0;
    let totalSaved = 0;
    
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
          await smartSave(idbStore, records);
          totalSaved += records.length;
        }
      }
    }

    await smartPut('syncMetadata', {
      id: 'lastSync',
      key: 'lastSync',
      timestamp: Date.now(),
      version: '3.1',
      recordCount: totalSaved,
      lastSyncTime: Date.now()
    });

    console.log('🎉 [Sync] اكتملت المزامنة والاستيراد بنجاح!');
    updateSyncState({ isSyncing: false, lastSync: Date.now(), progress: undefined });
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [Sync] خطأ في المزامنة الأولية:', errorMsg);
    
    updateSyncState({ 
      isSyncing: false, 
      lastError: `فشل الاستيراد: ${errorMsg}` 
    });

    // معالجة سيناريو "انقطاع الإنترنت المفاجئ أثناء الاستيراد"
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('📡 [Sync] تم إلغاء المزامنة بسبب بطء الاتصال، سيتم المحاولة لاحقاً');
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
      console.log(`[Sync-LWW] Could not fetch server version for ${recordId}, proceeding with update`);
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
      console.log(`[Sync-LWW] Server version is newer for ${recordId} (server: ${serverTimestamp}, client: ${clientTimestamp}), skipping update`);
      await logConflict('update', String(recordId), conflictData, 'server-wins');
      return 'skip';
    }

    console.log(`[Sync-LWW] Client version is newer for ${recordId} (client: ${clientTimestamp}, server: ${serverTimestamp}), proceeding`);
    await logConflict('update', String(recordId), conflictData, 'client-wins');
    return 'proceed';
  } catch (error) {
    console.warn(`[Sync-LWW] Error checking server version for ${recordId}, proceeding with update:`, error);
    return 'proceed';
  }
}

/**
 * مزامنة جميع البيانات المعلقة
 */
export async function syncOfflineData(): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) {
    updateSyncState({ isOnline: false });
    return;
  }
  if (!isCurrentTabLeader()) return;

  isSyncing = true;
  updateSyncState({ isSyncing: true, isOnline: true });

  try {
    const pending = await getPendingSyncQueue();
    if (pending.length === 0) {
      updateSyncState({ isSyncing: false });
      isSyncing = false;
      return;
    }

    console.log(`🔄 [Sync] جاري مزامنة ${pending.length} عملية...`);
    
    let successCount = 0;
    let failedCount = 0;

    for (const item of pending) {
      if (item.retries >= MAX_RETRIES) {
        console.warn(`⚠️ [Sync] العملية ${item.id} تجاوزت الحد الأقصى - تبقى في failed`);
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
          console.log(`[Sync] Skipped update for ${item.id} - server version is newer (LWW)`);
          continue;
        }

        const payloadString = JSON.stringify(item.payload);
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

          if (statusCode === 409) {
            console.log(`🔁 [Sync] عملية مكررة (409): ${item.id}`);
            await markItemDuplicateResolved(item.id, errorMsg);
            successCount++;
            continue;
          }

          if (statusCode === 400 || statusCode === 422) {
            console.error(`❌ [Sync] خطأ تحقق (${statusCode}): ${item.id}`);
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
              console.warn(`⚠️ [Sync] فشل تحديث الحالة المحلية لـ ${tableName}:`, updateError);
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

    updateSyncState({ 
      lastSync: Date.now(),
      isSyncing: false,
      syncedCount: successCount,
      failedCount
    });
  } catch (error) {
    console.error('❌ [Sync] خطأ في المزامنة:', error);
    updateSyncState({ isSyncing: false });
    
    intelligentMonitor.logEvent({
      type: 'error',
      severity: 'high',
      message: `خطأ حرج في محرك المزامنة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
    });
  } finally {
    isSyncing = false;
  }
}

/**
 * تهيئة مستمع المزامنة
 */
export function initSyncListener(): void {
  initLeaderElection();

  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    if (isCurrentTabLeader()) {
      performInitialDataPull();
      syncOfflineData();
    }
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });

  onLeaderChange((leader) => {
    if (leader && navigator.onLine) {
      console.log('[Sync] This tab became leader, starting sync...');
      performInitialDataPull();
      syncOfflineData();
    }
  });

  if (isCurrentTabLeader()) {
    const runSync = async () => {
      console.log('[Sync] Leader tab starting initial sync...');
      await performInitialDataPull();
      await syncOfflineData();
    };
    runSync();
  }

  syncInterval = setInterval(() => {
    if (navigator.onLine && isCurrentTabLeader()) syncOfflineData();
  }, 30000);
}

export function stopSyncListener(): void {
  if (syncInterval) clearInterval(syncInterval);
}

export function triggerSync() {
  if (!isCurrentTabLeader()) return;
  syncOfflineData().catch(err => console.error('❌ [Sync] خطأ في المزامنة الفورية:', err));
}

export async function loadFullBackup(): Promise<{ recordCount: number }> {
  try {
    console.log('📥 [Sync] جاري تحميل نسخة احتياطية كاملة من الخادم...');
    const result = await apiRequest('/api/sync/full-backup', 'POST', undefined, 60000);
    
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
    console.error('❌ [Sync] خطأ في تحميل النسخة الاحتياطية:', error);
    throw error;
  }
}

export function startBackgroundSync(): void {
  if (isSyncing) return;
  if (!isCurrentTabLeader()) return;
  syncOfflineData().catch(err => {
    console.error('❌ [Sync] فشل المزامنة الخلفية:', err);
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
    console.log('⚡ [Sync] بدء المزامنة الفورية...');
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
    console.log(`⚡ [Sync] المزامنة الفورية اكتملت: ${totalSaved} سجل في ${duration}ms`);
    
    updateSyncState({ lastSync: Date.now() });
    
    return {
      success: true,
      totalRecords: totalSaved,
      duration
    };
  } catch (error) {
    console.error('❌ [Sync] خطأ في المزامنة الفورية:', error);
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
    console.log('✅ [Sync] بدء التحقق من التطابق...');
    
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
    
    console.log(`✅ [Sync] التحقق اكتمل: ${result.isMatched ? 'متطابق ✓' : `${result.differences?.length || 0} اختلاف`}`);
    
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
    console.error('❌ [Sync] خطأ في التحقق:', error);
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
    console.error('❌ [Sync] خطأ في جلب الإحصائيات:', error);
    return { stats: {}, totalRecords: 0 };
  }
}
