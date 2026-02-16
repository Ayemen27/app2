import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';

/**
 * دالة ذكية لاختيار المحرك المناسب (SQLite للأندرويد حصراً)
 */
export async function getSmartStorage() {
  const platform = Capacitor.getPlatform();
  
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
      if (!dbInstance) {
        dbInstance = await initializeDB();
      }
      return dbInstance;
    }
  }
  
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

type StoreValue = Record<string, any> & { _isLocal?: boolean; _pendingSync?: boolean; synced?: boolean };

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
  syncHistory: {
    key: string;
    value: {
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
    };
  };
  userData: { key: string; value: { id: string; type: string; data: any; syncedAt: number; createdAt: number } };
  emergencyUsers: { key: string; value: Record<string, any> };
  users: { key: string; value: StoreValue };
  authUserSessions: { key: string; value: StoreValue };
  emailVerificationTokens: { key: string; value: StoreValue };
  passwordResetTokens: { key: string; value: StoreValue };
  projectTypes: { key: string; value: StoreValue };
  projects: { key: string; value: StoreValue };
  workers: { key: string; value: StoreValue };
  wells: { key: string; value: StoreValue };
  fundTransfers: { key: string; value: StoreValue };
  workerAttendance: { key: string; value: StoreValue };
  suppliers: { key: string; value: StoreValue };
  materials: { key: string; value: StoreValue };
  materialPurchases: { key: string; value: StoreValue };
  supplierPayments: { key: string; value: StoreValue };
  transportationExpenses: { key: string; value: StoreValue };
  workerTransfers: { key: string; value: StoreValue };
  workerBalances: { key: string; value: StoreValue };
  dailyExpenseSummaries: { key: string; value: StoreValue };
  workerTypes: { key: string; value: StoreValue };
  autocompleteData: { key: string; value: StoreValue };
  workerMiscExpenses: { key: string; value: StoreValue };
  printSettings: { key: string; value: StoreValue };
  projectFundTransfers: { key: string; value: StoreValue };
  securityPolicies: { key: string; value: StoreValue };
  securityPolicyImplementations: { key: string; value: StoreValue };
  securityPolicySuggestions: { key: string; value: StoreValue };
  securityPolicyViolations: { key: string; value: StoreValue };
  permissionAuditLogs: { key: string; value: StoreValue };
  userProjectPermissions: { key: string; value: StoreValue };
  materialCategories: { key: string; value: StoreValue };
  wellTasks: { key: string; value: StoreValue };
  wellExpenses: { key: string; value: StoreValue };
  wellAuditLogs: { key: string; value: StoreValue };
  wellTaskAccounts: { key: string; value: StoreValue };
  notifications: { key: string; value: StoreValue };
  notificationReadStates: { key: string; value: StoreValue };
  aiChatSessions: { key: string; value: StoreValue };
  aiChatMessages: { key: string; value: StoreValue };
  aiUsageStats: { key: string; value: StoreValue };
  buildDeployments: { key: string; value: StoreValue };
  reportTemplates: { key: string; value: StoreValue };
  backupLogs: { key: string; value: StoreValue };
  backupSettings: { key: string; value: StoreValue };
  deadLetterQueue: {
    key: string;
    value: {
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
    };
  };
  localAuditLog: {
    key: string;
    value: {
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      payload: Record<string, any>;
      timestamp: number;
      sequence: number;
      hash: string;
      previousHash: string;
    };
  };
}

let dbInstance: IDBPDatabase<BinarJoinDB> | null = null;

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
  'reportTemplates', 'backupLogs', 'backupSettings',
  'emergencyUsers', 'syncQueue', 'syncMetadata', 'userData', 'syncHistory',
  'deadLetterQueue', 'localAuditLog'
] as const;

export async function initializeDB(): Promise<IDBPDatabase<BinarJoinDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<BinarJoinDB>('binarjoin-db', 14, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`[DB] Upgrading from ${oldVersion} to ${newVersion}`);
        
        for (const storeName of ALL_STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            if (storeName === 'syncQueue') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('timestamp', 'timestamp');
              // @ts-ignore
              store.createIndex('action', 'action');
              // @ts-ignore
              store.createIndex('status', 'status');
            } else if (storeName === 'syncHistory') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('timestamp', 'timestamp');
              // @ts-ignore
              store.createIndex('status', 'status');
            } else if (storeName === 'userData') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('type', 'type');
            } else if (storeName === 'syncMetadata') {
              // @ts-ignore
              db.createObjectStore(storeName, { keyPath: 'key' });
            } else if (storeName === 'deadLetterQueue') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('movedAt', 'movedAt');
              // @ts-ignore
              store.createIndex('errorType', 'errorType');
            } else if (storeName === 'localAuditLog') {
              // @ts-ignore
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              // @ts-ignore
              store.createIndex('timestamp', 'timestamp');
              // @ts-ignore
              store.createIndex('sequence', 'sequence');
              // @ts-ignore
              store.createIndex('entityType', 'entityType');
            } else {
              // @ts-ignore
              const store = db.createObjectStore(storeName as any, { keyPath: 'id' });
              try {
                // @ts-ignore
                store.createIndex('synced', 'synced');
                // @ts-ignore
                store.createIndex('_pendingSync', '_pendingSync');
              } catch {}
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

export async function getDB(): Promise<any> {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') {
    const storage = await getSmartStorage();
    if (storage) return storage;
  }

  if (!dbInstance) {
    return await initializeDB();
  }
  return dbInstance;
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

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
