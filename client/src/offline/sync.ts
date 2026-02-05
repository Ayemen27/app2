import { getPendingSyncQueue, removeSyncQueueItem, updateSyncRetries } from './offline';
import { getDB, saveSyncedData } from './db';
import { clearAllLocalData } from './data-cleanup';
import { detectConflict, resolveConflict, logConflict } from './conflict-resolver';
import { apiRequest } from '../lib/api-client';
import { smartSave, smartGetAll } from './storage-factory';
import { intelligentMonitor } from './intelligent-monitor';
import { ENV } from '../lib/env';

export const ALL_SYNC_TABLES = [
  'users', 'emergency_users', 'auth_user_sessions', 'email_verification_tokens', 'password_reset_tokens',
  'project_types', 'projects', 'workers', 'wells',
  'fund_transfers', 'worker_attendance', 'suppliers', 'materials', 'material_purchases',
  'supplier_payments', 'transportation_expenses', 'worker_transfers', 'worker_balances',
  'daily_expense_summaries', 'worker_types', 'autocomplete_data', 'worker_misc_expenses',
  'backup_logs', 'backup_settings', 'print_settings', 'project_fund_transfers',
  'security_policies', 'security_policy_suggestions', 'security_policy_implementations', 'security_policy_violations',
  'user_project_permissions', 'permission_audit_logs',
  'report_templates', 'tool_categories', 'tools', 'tool_stock', 'tool_movements',
  'tool_maintenance_logs', 'tool_usage_analytics', 'tool_purchase_items', 'maintenance_schedules', 'maintenance_tasks',
  'tool_cost_tracking', 'tool_reservations', 'system_notifications', 'notification_read_states', 'build_deployments',
  'tool_notifications', 'approvals', 'channels', 'messages', 'actions', 'system_events',
  'accounts', 'transactions', 'transaction_lines', 'journals', 'finance_payments', 'finance_events', 'account_balances',
  'notifications', 'ai_chat_sessions', 'ai_chat_messages', 'ai_usage_stats',
  'well_tasks', 'well_task_accounts', 'well_expenses', 'well_audit_logs', 'material_categories'
] as const;

const MAX_RETRIES = 5;
const INITIAL_SYNC_DELAY = 2000; 
let isSyncing = false;
let syncListeners: ((state: SyncState) => void)[] = [];
let syncInterval: NodeJS.Timeout | null = null;
let retryCount = 0;

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
  const accessToken = localStorage.getItem('accessToken');
  
  // فحص صارم للإنترنت والتوكن قبل بدء المزامنة الثقيلة
  if (!accessToken) {
    console.warn('🔑 [Sync] لا يمكن السحب الأولي بدون توكن');
    return false;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('📡 [Sync] لا يمكن السحب الأولي بدون إنترنت');
    return false;
  }

  // منع المزامنة المتكررة إذا كانت جارية بالفعل
  if (isSyncing) {
    console.log('🔄 [Sync] المزامنة جارية بالفعل، تخطي الطلب الجديد');
    return false;
  }

  try {
    console.log('📥 [Sync] بدء سحب البيانات الكاملة من الخادم...');
    updateSyncState({ isSyncing: true });

    // محاولة جلب البيانات مع مهلة زمنية (Timeout) للتعامل مع ضعف الإنترنت
    // ترقية: استخدام نقطة النهاية المخصصة للمزامنة الكاملة بدلاً من المسار القديم
    const result = await apiRequest('/api/sync/full-backup', 'POST', undefined, 60000);
    
    if (!result || (typeof result === 'object' && result.code === 'INVALID_TOKEN')) {
      console.error('❌ [Sync] فشل المصادقة أو انتهت المهلة، يجب تسجيل الدخول مرة أخرى');
      return false;
    }
    
    if (!result.success || !result.data) {
      console.error('❌ [Sync] فشل جلب البيانات من السيرفر:', result?.error || 'بيانات غير صالحة');
      return false;
    }

    const { data } = result;
    const db = await getDB();
    const tableEntries = Object.entries(data);
    const totalTables = tableEntries.length;
    let processedTables = 0;
    let totalSaved = 0;

    // ترقية: استخدام Transaction واحدة ضخمة لضمان سلامة البيانات (Atomic Import)
    // ملاحظة: بما أن smartSave قد يستخدم محركات مختلفة، سنكتفي بالمعالجة المتوازية المحسنة
    
    // 1. مزامنة المستخدمين أولاً لضمان عمل Auth (حرج جداً)
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
      
      // حفظ بيانات الطوارئ (Offline Login)
      const emergencyData = data.users.map((u: any) => ({
        id: u.id.toString(),
        email: u.email,
        password: u.password,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        role: u.role || 'user'
      }));
      await smartSave('emergencyUsers', emergencyData);
    }

    // 2. مزامنة بقية الجداول (Batch processing لتجنب تعليق المتصفح)
    const BATCH_SIZE = 5;
    for (let i = 0; i < tableEntries.length; i += BATCH_SIZE) {
      const batch = tableEntries.slice(i, i + BATCH_SIZE);
      for (const [tableName, records] of batch) {
        if (tableName !== 'users' && Array.isArray(records)) {
          processedTables++;
          updateSyncState({ 
            progress: { 
              total: totalTables, 
              current: processedTables, 
              tableName,
              percentage: Math.min(100, Math.round((processedTables / totalTables) * 100))
            } 
          });
          await smartSave(tableName, records);
          totalSaved += records.length;
        }
      }
    }

    await db.put('syncMetadata', {
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

/**
 * مزامنة جميع البيانات المعلقة
 */
export async function syncOfflineData(): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) {
    updateSyncState({ isOnline: false });
    return;
  }

  isSyncing = true;
  updateSyncState({ isSyncing: true, isOnline: true });

  try {
    const pending = await getPendingSyncQueue();
    if (pending.length === 0) {
      updateSyncState({ isSyncing: false });
      isSyncing = false;
      retryCount = 0;
      return;
    }

    console.log(`🔄 [Sync] جاري مزامنة ${pending.length} عملية...`);
    
    let successCount = 0;
    for (const item of pending) {
      try {
        const startTime = Date.now();
        // المعايير العالمية: إضافة توقيع رقمي للتحقق من سلامة البيانات
        // استخدام HMAC أو توقيع مشابه في الإنتاج، هنا نستخدم نسخة مبسطة للمعايير يدعم العربية
        const payloadString = JSON.stringify(item.payload);
        const signature = btoa(encodeURIComponent(payloadString).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16)))).substring(0, 32);
        
        const result = await apiRequest(item.endpoint, item.action === 'create' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE', {
          ...item.payload,
          _metadata: {
            signature,
            version: item.payload.version || 1,
            clientTimestamp: Date.now(),
            deviceId: localStorage.getItem('deviceId') || 'web-client'
          }
        });
        const endTime = Date.now();
        const requestLatency = endTime - startTime;

          if (result) {
            await removeSyncQueueItem(item.id);
            
            const db = await getDB();
            const recordId = item.payload.id;
            const tableName = item.endpoint.split('/')[2]; 
            
            if (tableName && recordId) {
              try {
                // محاولة تحديث حالة المزامنة في التخزين الذكي (يدعم SQLite و IDB)
                const localRecords = await smartGetAll(tableName);
                const record = localRecords.find((r: any) => (r.id || r.key) === recordId);
                if (record) {
                  record.synced = true;
                  record.pendingSync = false;
                  record.isLocal = false;
                  await smartSave(tableName, [record]);
                  console.log(`✅ [Sync] تم تحديث حالة المزامنة لـ ${tableName}:${recordId}`);
                }
              } catch (updateError) {
                console.warn(`⚠️ [Sync] فشل تحديث حالة المزامنة محلياً لـ ${tableName}:`, updateError);
              }
            }
            
            successCount++;
            updateSyncState({ latency: requestLatency, pendingCount: pending.length - successCount });
          } else {
            // إذا لم تنجح الاستجابة، قد يكون هناك خطأ في البيانات، نحتاج لتجاوزه لمنع تعليق الطابور
            console.error(`❌ [Sync] فشل مزامنة العنصر ${item.id} - سيتم المحاولة لاحقاً أو تخطيه`);
            if (retryCount > MAX_RETRIES) {
               await removeSyncQueueItem(item.id);
               console.warn(`⚠️ [Sync] تم تخطي العنصر ${item.id} بعد تجاوز محاولات المزامنة`);
            }
          }
      } catch (e) {
        retryCount++;
        const delay = getBackoffDelay(retryCount);
        
        intelligentMonitor.logEvent({
          type: 'sync',
          severity: retryCount > 3 ? 'high' : 'medium',
          message: `فشل مزامنة عنصر: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`,
          metadata: { retryCount, nextRetryDelay: delay, itemId: item.id }
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    updateSyncState({ 
      lastSync: Date.now(),
      isSyncing: false,
      syncedCount: successCount
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
  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    performInitialDataPull();
    syncOfflineData();
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });

  const runSync = async () => {
    console.log('🚀 [Sync] بدء المزامنة التلقائية الفورية...');
    await performInitialDataPull();
    await syncOfflineData();
  };

  runSync();

  setInterval(() => {
    if (navigator.onLine) syncOfflineData();
  }, 30000);
}

export function stopSyncListener(): void {
  if (syncInterval) clearInterval(syncInterval);
}

export function triggerSync() {
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
    const db = await getDB();
    
    let totalSaved = 0;
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        await smartSave(tableName, records);
        console.log(`✅ [Sync] تم مزامنة ${records.length} سجل في ${tableName}`);
        totalSaved += records.length;
      }
    }
    
    await db.put('syncMetadata', {
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
    
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records) && records.length > 0) {
        await smartSave(tableName, records);
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
