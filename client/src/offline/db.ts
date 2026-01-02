import { openDB, DBSchema, IDBPDatabase } from 'idb';

// تعريف schema قاعدة البيانات - مرآة كاملة 100% من الخادم (66 جدول)
export interface BinarJoinDB extends DBSchema {
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: 'create' | 'update' | 'delete';
      endpoint: string;
      payload: Record<string, any>;
      timestamp: number;
      retries: number;
      lastError?: string;
      errorType?: 'timeout' | 'network' | 'server' | 'validation' | 'unknown';
    };
  };
  syncMetadata: {
    key: string;
    value: {
      key: string;
      timestamp: number;
      version: string;
      recordCount: number;
      lastSyncTime?: number;
      tableList?: string[];
    };
  };
  // جميع جداول الخادم - 66 جدول
  users: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  authUserSessions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  emailVerificationTokens: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  passwordResetTokens: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  projectTypes: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  projects: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  workers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  wells: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  fundTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  workerAttendance: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  suppliers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  materials: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  materialPurchases: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  supplierPayments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  transportationExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  workerTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  workerBalances: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  dailyExpenseSummaries: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  workerTypes: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  autocompleteData: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  workerMiscExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  printSettings: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  projectFundTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  securityPolicies: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  securityPolicyImplementations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  securityPolicySuggestions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  securityPolicyViolations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  permissionAuditLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  userProjectPermissions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  materialCategories: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolCategories: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  tools: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolMovements: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolStock: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolReservations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolPurchaseItems: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolCostTracking: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolMaintenanceLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolUsageAnalytics: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  toolNotifications: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  maintenanceSchedules: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  maintenanceTasks: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  wellTasks: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  wellExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  wellAuditLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  wellTaskAccounts: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  messages: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  channels: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  notifications: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  notificationReadStates: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  systemNotifications: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  systemEvents: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  actions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  aiChatSessions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  aiChatMessages: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  aiUsageStats: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  buildDeployments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  approvals: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  transactions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  transactionLines: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  journals: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  accounts: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  accountBalances: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  financePayments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  financeEvents: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
  reportTemplates: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean } };
}

let dbInstance: IDBPDatabase<BinarJoinDB> | null = null;

// قائمة جميع الجداول (66 جدول)
const ALL_STORES = [
  'users', 'authUserSessions', 'emailVerificationTokens', 'passwordResetTokens',
  'projectTypes', 'projects', 'workers', 'wells', 'fundTransfers',
  'workerAttendance', 'suppliers', 'materials', 'materialPurchases',
  'supplierPayments', 'transportationExpenses', 'workerTransfers',
  'workerBalances', 'dailyExpenseSummaries', 'workerTypes', 'autocompleteData',
  'workerMiscExpenses', 'printSettings', 'projectFundTransfers',
  'securityPolicies', 'securityPolicyImplementations',
  'securityPolicySuggestions', 'securityPolicyViolations',
  'permissionAuditLogs', 'userProjectPermissions', 'materialCategories',
  'toolCategories', 'tools', 'toolMovements', 'toolStock', 'toolReservations',
  'toolPurchaseItems', 'toolCostTracking', 'toolMaintenanceLogs',
  'toolUsageAnalytics', 'toolNotifications', 'maintenanceSchedules',
  'maintenanceTasks', 'wellTasks', 'wellExpenses', 'wellAuditLogs',
  'wellTaskAccounts', 'messages', 'channels', 'notifications',
  'notificationReadStates', 'systemNotifications', 'systemEvents', 'actions',
  'aiChatSessions', 'aiChatMessages', 'aiUsageStats', 'buildDeployments',
  'approvals', 'transactions', 'transactionLines', 'journals', 'accounts',
  'accountBalances', 'financePayments', 'financeEvents', 'reportTemplates'
] as const;

/**
 * فتح أو إنشاء قاعدة البيانات المحلية (مرآة 100% من الخادم)
 */
export async function initializeDB(): Promise<IDBPDatabase<BinarJoinDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<BinarJoinDB>('binarjoin-db', 3, {
    upgrade(db) {
      // Object Store للبيانات المعلقة للمزامنة
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp');
        syncStore.createIndex('action', 'action');
      }

      // Store لحفظ metadata المزامنة
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' });
      }

      // إنشاء جميع الجداول - مرآة 100% من الخادم
      for (const storeName of ALL_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          try {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt');
            store.createIndex('projectId', 'projectId');
          } catch (e) {
            console.warn(`[DB] Store ${storeName} creation handled`, e);
          }
        }
      }
    }
  });

  return dbInstance;
}

/**
 * الحصول على instance قاعدة البيانات
 */
export async function getDB(): Promise<IDBPDatabase<BinarJoinDB>> {
  if (!dbInstance) {
    return await initializeDB();
  }
  return dbInstance;
}

/**
 * إغلاق قاعدة البيانات
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * حذف قاعدة البيانات بالكامل (للاستعادة)
 */
export async function deleteDB(): Promise<void> {
  closeDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('binarjoin-db');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * تحديث سجل مزامنة
 */
export async function updateSyncMetadata(key: string, metadata: Record<string, any>): Promise<void> {
  const db = await getDB();
  await db.put('syncMetadata', {
    key,
    timestamp: Date.now(),
    ...metadata
  });
}

/**
 * الحصول على آخر وقت مزامنة
 */
export async function getLastSyncTime(): Promise<number> {
  const db = await getDB();
  const metadata = await db.get('syncMetadata', 'lastSync');
  return metadata?.lastSyncTime || 0;
}

/**
 * حفظ بيانات من الخادم إلى IndexedDB
 */
export async function saveSyncedData(tableName: string, records: any[]): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(tableName as any, 'readwrite');
  const store = tx.objectStore(tableName as any);
  let count = 0;
  
  for (const record of records) {
    if (record && record.id) {
      await store.put(record);
      count++;
    }
  }
  
  await tx.done;
  return count;
}

/**
 * إضافة عملية إلى طابور المزامنة وتنفيذها محلياً فوراً
 */
export async function performLocalOperation(
  tableName: string,
  action: 'create' | 'update' | 'delete',
  payload: Record<string, any>,
  endpoint: string
): Promise<any> {
  const db = await getDB();
  const id = payload.id || crypto.randomUUID();
  const record = { ...payload, id, _isLocal: true, _pendingSync: true };

  // 1. تنفيذ العملية محلياً فوراً (المصدر الأساسي للحقيقة)
  const tx = db.transaction([tableName as any, 'syncQueue'], 'readwrite');
  const store = tx.objectStore(tableName as any);
  const queueStore = tx.objectStore('syncQueue');

  if (action === 'delete') {
    await store.delete(id);
  } else {
    await store.put(record);
  }

  // 2. إضافة العملية إلى طابور المزامنة للخلفية
  await queueStore.put({
    id: crypto.randomUUID(),
    action,
    endpoint,
    payload: record,
    timestamp: Date.now(),
    retries: 0
  });

  await tx.done;
  
  console.log(`🚀 [DB] تم التنفيذ محلياً: ${action} على ${tableName}`);
  return record;
}

/**
 * حذف جميع البيانات من جدول معين
 */
export async function clearTable(tableName: string): Promise<void> {
  const db = await getDB();
  await db.clear(tableName as any);
}

// ⚠️ ملاحظة: استخدم clearAllLocalData() من data-cleanup.ts بدلاً من clearAllData()
// لتجنب التكرار والحفاظ على نظام موحد
