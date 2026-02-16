import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';

/**
 * دالة ذكية لاختيار المحرك المناسب (SQLite للأندرويد حصراً)
 */
export async function getSmartStorage() {
  const platform = Capacitor.getPlatform();
  
  // 🚀 إجبار النظام على استخدام SQLite فقط وفقط في بيئة الأندرويد/iOS
  if (platform === 'android' || platform === 'ios') {
    try {
      console.log('📱 [DB] محاولة تهيئة محرك SQLite للأندرويد...');
      const waitPromise = nativeStorage.waitForReady();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SQLite Initialization Timeout')), 5000)
      );
      await Promise.race([waitPromise, timeoutPromise]);
      console.log('✅ [DB] تم تهيئة محرك SQLite بنجاح');
      return nativeStorage;
    } catch (e) {
      console.error("🔴 SQLite Engine Critical Failure, falling back to IDB:", e);
      // Fallback to IndexedDB if SQLite fails to prevent app crash
      if (!dbInstance) {
        dbInstance = await initializeDB();
      }
      return dbInstance;
    }
  }
  
  // المتصفح (Web) يستخدم IndexedDB (الذي يدعمه openDB)
  if (!dbInstance) {
    dbInstance = await initializeDB();
  }
  return dbInstance;
}

/**
 * @deprecated Use smart functions from storage-factory.ts instead
 */
export async function getSafeTransaction(storeNames: string | string[], mode: 'readonly' | 'readwrite' = 'readonly') {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') {
    return null;
  }
  const db = await initializeDB();
  return db.transaction(storeNames, mode);
}

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
  users: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  authUserSessions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  emailVerificationTokens: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  passwordResetTokens: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  projectTypes: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  projects: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wells: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  fundTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerAttendance: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  suppliers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  materials: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  materialPurchases: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  supplierPayments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  transportationExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerBalances: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  dailyExpenseSummaries: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerTypes: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  autocompleteData: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  workerMiscExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  printSettings: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  projectFundTransfers: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicies: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicyImplementations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicySuggestions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  securityPolicyViolations: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  permissionAuditLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  userProjectPermissions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  materialCategories: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellTasks: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellExpenses: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellAuditLogs: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  wellTaskAccounts: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  notifications: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  notificationReadStates: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  aiChatSessions: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  aiChatMessages: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  aiUsageStats: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  emergencyUsers: { key: string; value: Record<string, any> };
  buildDeployments: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  reportTemplates: { key: string; value: Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean } };
  userData: { key: string; value: { id: string; type: string; data: any; syncedAt: number; createdAt: number } };
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
  'wellTasks', 'wellExpenses', 'wellAuditLogs',
  'wellTaskAccounts', 'notifications',
  'notificationReadStates',
  'aiChatSessions', 'aiChatMessages', 'aiUsageStats', 'buildDeployments',
  'reportTemplates', 
  'emergencyUsers', 'syncQueue', 'syncMetadata', 'userData', 'workerMiscExpenses',
  'autocompleteData', 'printSettings', 'workerTypes', 'syncHistory'
] as const;

// فتح أو إنشاء قاعدة البيانات المحلية (مرآة 100% من الخادم)
export async function initializeDB(): Promise<IDBPDatabase<BinarJoinDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<BinarJoinDB>('binarjoin-db', 11, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`[DB] Upgrading from ${oldVersion} to ${newVersion}`);
        
        // التأكد من وجود جميع الجداول المطلوبة
        for (const storeName of ALL_STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            if (storeName === 'syncQueue') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('timestamp', 'timestamp');
              // @ts-ignore
              store.createIndex('action', 'action');
            } else if (storeName === 'userData') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('type', 'type');
            } else if (storeName === 'syncMetadata') {
              // @ts-ignore
              db.createObjectStore(storeName, { keyPath: 'key' });
            } else {
              // @ts-ignore
              const store = db.createObjectStore(storeName as any, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('createdAt', 'createdAt');
              // @ts-ignore
              store.createIndex('projectId', 'projectId');
              // @ts-ignore
              store.createIndex('synced', 'synced');
              // @ts-ignore
              store.createIndex('_pendingSync', '_pendingSync');
              // @ts-ignore
              store.createIndex('version', 'version'); // New index for State Sync
              // @ts-ignore
              store.createIndex('lastModifiedAt', 'lastModifiedAt');
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("[DB] Critical initialization error:", error);
    throw error;
  }

  return dbInstance;
}

/**
 * الحصول على instance قاعدة البيانات (أو المحرك الأصلي)
 */
export async function getDB(): Promise<any> {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') {
    // في الأندرويد، نستخدم المحرك الأصلي دائماً
    const storage = await getSmartStorage();
    if (storage) return storage;
  }

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

export async function updateSyncMetadata(key: string, metadata: Record<string, any>): Promise<void> {
  const { smartPut } = await import('./storage-factory');
  await smartPut('syncMetadata', {
    key,
    id: key,
    timestamp: Date.now(),
    version: metadata.version || '3.0',
    recordCount: metadata.recordCount || 0,
    ...metadata
  });
}

export async function getLastSyncTime(): Promise<number> {
  const { smartGet } = await import('./storage-factory');
  const metadata = await smartGet('syncMetadata', 'lastSync');
  return metadata?.lastSyncTime || 0;
}

export async function saveSyncedData(tableName: string, records: any[]): Promise<number> {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'android' || platform === 'ios') {
    const { nativeStorage } = await import('./native-db');
    let count = 0;
    for (const record of records) {
      if (record && record.id) {
        await nativeStorage.set(tableName, record.id.toString(), record);
        count++;
      }
    }
    return count;
  }

  const db = await initializeDB();
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

export async function performLocalOperation(
  tableName: string,
  action: 'create' | 'update' | 'delete',
  payload: Record<string, any>,
  endpoint: string
): Promise<any> {
  const { smartPut, smartDelete, smartAdd } = await import('./storage-factory');
  const id = payload.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
  const record = { ...payload, id, _isLocal: true, _pendingSync: true };

  if (action === 'delete') {
    await smartDelete(tableName, id);
  } else {
    await smartPut(tableName, record);
  }

  const queueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  await smartAdd('syncQueue', {
    id: queueId,
    action,
    endpoint,
    payload: record,
    timestamp: Date.now(),
    retries: 0
  });

  return record;
}

export async function getListLocal(storeName: string) {
  const { smartGetAll } = await import('./storage-factory');
  const items = await smartGetAll(storeName);
  return items.sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

export async function getItemLocal(storeName: string, id: string) {
  const { smartGet } = await import('./storage-factory');
  return await smartGet(storeName, id);
}

export async function clearTable(tableName: string): Promise<void> {
  const { smartClear } = await import('./storage-factory');
  await smartClear(tableName);
}
