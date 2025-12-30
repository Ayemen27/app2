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
  expenses: {
    key: string;
    value: Record<string, any>;
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
      const stores = ['projects', 'workers', 'materials', 'suppliers', 'expenses'];
      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'createdAt');
        }
      });
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
