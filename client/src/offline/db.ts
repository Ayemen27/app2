import { openDB, DBSchema, IDBPDatabase } from 'idb';

// تعريف schema قاعدة البيانات
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
    };
  };
  userData: {
    key: string;
    value: {
      id: string;
      type: string;
      data: Record<string, any>;
      syncedAt: number;
      createdAt: number;
    };
  };
  projects: {
    key: string;
    value: Record<string, any>;
  };
  workers: {
    key: string;
    value: Record<string, any>;
  };
  materials: {
    key: string;
    value: Record<string, any>;
  };
  suppliers: {
    key: string;
    value: Record<string, any>;
  };
  workerAttendance: {
    key: string;
    value: Record<string, any>;
  };
  materialPurchases: {
    key: string;
    value: Record<string, any>;
  };
  transportationExpenses: {
    key: string;
    value: Record<string, any>;
  };
  fundTransfers: {
    key: string;
    value: Record<string, any>;
  };
  workerTransfers: {
    key: string;
    value: Record<string, any>;
  };
  workerMiscExpenses: {
    key: string;
    value: Record<string, any>;
  };
  wells: {
    key: string;
    value: Record<string, any>;
  };
  projectTypes: {
    key: string;
    value: Record<string, any>;
  };
  syncMetadata: {
    key: string;
    value: {
      key: string;
      timestamp: number;
      version: string;
      recordCount: number;
    };
  };
}

let dbInstance: IDBPDatabase<BinarJoinDB> | null = null;

/**
 * فتح أو إنشاء قاعدة البيانات المحلية
 */
export async function initializeDB(): Promise<IDBPDatabase<BinarJoinDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<BinarJoinDB>('binarjoin-db', 1, {
    upgrade(db) {
      // Object Store للبيانات المعلقة للمزامنة
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp');
        syncStore.createIndex('action', 'action');
      }

      // Object Store لبيانات المستخدم
      if (!db.objectStoreNames.contains('userData')) {
        const userStore = db.createObjectStore('userData', { keyPath: 'id' });
        userStore.createIndex('type', 'type');
        userStore.createIndex('syncedAt', 'syncedAt');
      }

      // Object Stores للبيانات الرئيسية
      const mainStores = [
        'projects', 'workers', 'materials', 'suppliers',
        'workerAttendance', 'materialPurchases', 'transportationExpenses',
        'fundTransfers', 'workerTransfers', 'workerMiscExpenses',
        'wells', 'projectTypes'
      ] as const;
      
      for (const storeName of mainStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'createdAt');
        }
      }
      
      // Store لحفظ metadata المزامنة
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' });
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
