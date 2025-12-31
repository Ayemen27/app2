import { openDB, DBSchema, IDBPDatabase } from 'idb';

// تعريف schema قاعدة البيانات - مرآة كاملة من الخادم
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
    };
  };
  // الجداول الرئيسية - جميعها تحتوي على بيانات من الخادم
  users: { key: string; value: Record<string, any> };
  projects: { key: string; value: Record<string, any> };
  workers: { key: string; value: Record<string, any> };
  wells: { key: string; value: Record<string, any> };
  materials: { key: string; value: Record<string, any> };
  suppliers: { key: string; value: Record<string, any> };
  projectTypes: { key: string; value: Record<string, any> };
  workerTypes: { key: string; value: Record<string, any> };
  materialCategories: { key: string; value: Record<string, any> };
  toolCategories: { key: string; value: Record<string, any> };
  
  // جداول البيانات المالية والعمليات
  workerAttendance: { key: string; value: Record<string, any> };
  materialPurchases: { key: string; value: Record<string, any> };
  supplierPayments: { key: string; value: Record<string, any> };
  transportationExpenses: { key: string; value: Record<string, any> };
  fundTransfers: { key: string; value: Record<string, any> };
  projectFundTransfers: { key: string; value: Record<string, any> };
  workerTransfers: { key: string; value: Record<string, any> };
  workerBalances: { key: string; value: Record<string, any> };
  workerMiscExpenses: { key: string; value: Record<string, any> };
  dailyExpenseSummaries: { key: string; value: Record<string, any> };
  
  // جداول الأدوات والصيانة
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
  
  // جداول الآبار والمشاريع
  wellTasks: { key: string; value: Record<string, any> };
  wellExpenses: { key: string; value: Record<string, any> };
  wellAuditLogs: { key: string; value: Record<string, any> };
  wellTaskAccounts: { key: string; value: Record<string, any> };
  
  // جداول الرسائل والإشعارات
  messages: { key: string; value: Record<string, any> };
  channels: { key: string; value: Record<string, any> };
  notifications: { key: string; value: Record<string, any> };
  notificationReadStates: { key: string; value: Record<string, any> };
  systemNotifications: { key: string; value: Record<string, any> };
  
  // جداول الأمان والمراجعة
  authUserSessions: { key: string; value: Record<string, any> };
  emailVerificationTokens: { key: string; value: Record<string, any> };
  passwordResetTokens: { key: string; value: Record<string, any> };
  securityPolicies: { key: string; value: Record<string, any> };
  securityPolicyImplementations: { key: string; value: Record<string, any> };
  securityPolicySuggestions: { key: string; value: Record<string, any> };
  securityPolicyViolations: { key: string; value: Record<string, any> };
  permissionAuditLogs: { key: string; value: Record<string, any> };
  userProjectPermissions: { key: string; value: Record<string, any> };
  
  // جداول المالية والحسابات
  transactions: { key: string; value: Record<string, any> };
  transactionLines: { key: string; value: Record<string, any> };
  journals: { key: string; value: Record<string, any> };
  accounts: { key: string; value: Record<string, any> };
  accountBalances: { key: string; value: Record<string, any> };
  financePayments: { key: string; value: Record<string, any> };
  financeEvents: { key: string; value: Record<string, any> };
  
  // جداول الإعدادات والتقارير
  printSettings: { key: string; value: Record<string, any> };
  reportTemplates: { key: string; value: Record<string, any> };
  autocompleteData: { key: string; value: Record<string, any> };
  
  // جداول الأحداث والذكاء الاصطناعي
  systemEvents: { key: string; value: Record<string, any> };
  actions: { key: string; value: Record<string, any> };
  aiChatSessions: { key: string; value: Record<string, any> };
  aiChatMessages: { key: string; value: Record<string, any> };
  aiUsageStats: { key: string; value: Record<string, any> };
  
  // جداول النشر والبناء
  buildDeployments: { key: string; value: Record<string, any> };
  approvals: { key: string; value: Record<string, any> };
}

let dbInstance: IDBPDatabase<BinarJoinDB> | null = null;

/**
 * فتح أو إنشاء قاعدة البيانات المحلية
 */
export async function initializeDB(): Promise<IDBPDatabase<BinarJoinDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<BinarJoinDB>('binarjoin-db', 2, {
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

      // قائمة الجداول التي سيتم إنشاؤها
      const allStores = [
        'users', 'projects', 'workers', 'wells', 'materials', 'suppliers',
        'projectTypes', 'workerTypes', 'materialCategories', 'toolCategories',
        'workerAttendance', 'materialPurchases', 'supplierPayments',
        'transportationExpenses', 'fundTransfers', 'projectFundTransfers',
        'workerTransfers', 'workerBalances', 'workerMiscExpenses',
        'dailyExpenseSummaries', 'tools', 'toolMovements', 'toolStock',
        'toolReservations', 'toolPurchaseItems', 'toolCostTracking',
        'toolMaintenanceLogs', 'toolUsageAnalytics', 'toolNotifications',
        'maintenanceSchedules', 'maintenanceTasks', 'wellTasks',
        'wellExpenses', 'wellAuditLogs', 'wellTaskAccounts', 'messages',
        'channels', 'notifications', 'notificationReadStates',
        'systemNotifications', 'authUserSessions', 'emailVerificationTokens',
        'passwordResetTokens', 'securityPolicies', 'securityPolicyImplementations',
        'securityPolicySuggestions', 'securityPolicyViolations',
        'permissionAuditLogs', 'userProjectPermissions', 'transactions',
        'transactionLines', 'journals', 'accounts', 'accountBalances',
        'financePayments', 'financeEvents', 'printSettings', 'reportTemplates',
        'autocompleteData', 'systemEvents', 'actions', 'aiChatSessions',
        'aiChatMessages', 'aiUsageStats', 'buildDeployments', 'approvals'
      ] as const;
      
      // إنشاء جميع الجداول
      for (const storeName of allStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          try {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt');
          } catch (e) {
            // إذا فشل، قد يكون الجدول موجود بالفعل
            console.warn(`[DB] Store ${storeName} creation skipped`, e);
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
