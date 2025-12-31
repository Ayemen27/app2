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
  users: { key: string; value: Record<string, any> };
  authUserSessions: { key: string; value: Record<string, any> };
  emailVerificationTokens: { key: string; value: Record<string, any> };
  passwordResetTokens: { key: string; value: Record<string, any> };
  projectTypes: { key: string; value: Record<string, any> };
  projects: { key: string; value: Record<string, any> };
  workers: { key: string; value: Record<string, any> };
  wells: { key: string; value: Record<string, any> };
  fundTransfers: { key: string; value: Record<string, any> };
  workerAttendance: { key: string; value: Record<string, any> };
  suppliers: { key: string; value: Record<string, any> };
  materials: { key: string; value: Record<string, any> };
  materialPurchases: { key: string; value: Record<string, any> };
  supplierPayments: { key: string; value: Record<string, any> };
  transportationExpenses: { key: string; value: Record<string, any> };
  workerTransfers: { key: string; value: Record<string, any> };
  workerBalances: { key: string; value: Record<string, any> };
  dailyExpenseSummaries: { key: string; value: Record<string, any> };
  workerTypes: { key: string; value: Record<string, any> };
  autocompleteData: { key: string; value: Record<string, any> };
  workerMiscExpenses: { key: string; value: Record<string, any> };
  printSettings: { key: string; value: Record<string, any> };
  projectFundTransfers: { key: string; value: Record<string, any> };
  securityPolicies: { key: string; value: Record<string, any> };
  securityPolicyImplementations: { key: string; value: Record<string, any> };
  securityPolicySuggestions: { key: string; value: Record<string, any> };
  securityPolicyViolations: { key: string; value: Record<string, any> };
  permissionAuditLogs: { key: string; value: Record<string, any> };
  userProjectPermissions: { key: string; value: Record<string, any> };
  materialCategories: { key: string; value: Record<string, any> };
  toolCategories: { key: string; value: Record<string, any> };
  tools: { key: string; value: Record<string, any> };
  toolMovements: { key: string; value: Record<string, any> };
  toolStock: { key: string; value: Record<string, any> };
  toolReservations: { key: string; value: Record<string, any> };
  toolPurchaseItems: { key: string; value: Record<string, any> };
  toolCostTracking: { key: string; value: Record<string, any> };
  toolMaintenanceLogs: { key: string; value: Record<string, any> };
  toolUsageAnalytics: { key: string; value: Record<string, any> };
  toolNotifications: { key: string; value: Record<string, any> };
  maintenanceSchedules: { key: string; value: Record<string, any> };
  maintenanceTasks: { key: string; value: Record<string, any> };
  wellTasks: { key: string; value: Record<string, any> };
  wellExpenses: { key: string; value: Record<string, any> };
  wellAuditLogs: { key: string; value: Record<string, any> };
  wellTaskAccounts: { key: string; value: Record<string, any> };
  messages: { key: string; value: Record<string, any> };
  channels: { key: string; value: Record<string, any> };
  notifications: { key: string; value: Record<string, any> };
  notificationReadStates: { key: string; value: Record<string, any> };
  systemNotifications: { key: string; value: Record<string, any> };
  systemEvents: { key: string; value: Record<string, any> };
  actions: { key: string; value: Record<string, any> };
  aiChatSessions: { key: string; value: Record<string, any> };
  aiChatMessages: { key: string; value: Record<string, any> };
  aiUsageStats: { key: string; value: Record<string, any> };
  buildDeployments: { key: string; value: Record<string, any> };
  approvals: { key: string; value: Record<string, any> };
  transactions: { key: string; value: Record<string, any> };
  transactionLines: { key: string; value: Record<string, any> };
  journals: { key: string; value: Record<string, any> };
  accounts: { key: string; value: Record<string, any> };
  accountBalances: { key: string; value: Record<string, any> };
  financePayments: { key: string; value: Record<string, any> };
  financeEvents: { key: string; value: Record<string, any> };
  reportTemplates: { key: string; value: Record<string, any> };
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
  let count = 0;
  for (const record of records) {
    if (record && record.id) {
      await db.put(tableName as any, record);
      count++;
    }
  }
  return count;
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
