import { apiRequest } from "./queryClient";

/**
 * 🔄 مزامنة البيانات المحلية مع الخادم
 */
export async function syncLocalData(table: string, data: any[]) {
  try {
    const response = await apiRequest("POST", "/api/sync", { table, data });
    return await response.json();
  } catch (error) {
    console.error(`❌ Sync error for table ${table}:`, error);
    throw error;
  }
}

/**
 * 🔒 مزامنة البيانات المشفرة
 */
export async function syncEncryptedData(table: string, data: any) {
  try {
    const response = await apiRequest("POST", "/api/sync", { 
      encrypted: true, 
      data: JSON.stringify(data) 
    });
    return await response.json();
  } catch (error) {
    console.error(`❌ Encrypted sync error for table ${table}:`, error);
    throw error;
  }
}

/**
 * 📦 تهيئة مخازن البيانات في المتصفح (IndexedDB)
 */
export async function initializeObjectStores() {
  const dbName = 'axion_offline_db';
  const version = 1;
  const tables = [
    'projects', 'workers', 'materials', 'suppliers', 'wells', 
    'project_types', 'financial_summary', 'worker_attendance',
    'material_purchases', 'transportation_expenses', 'worker_transfers',
    'worker_misc_expenses', 'daily_expense_summaries', 'fund_transfers'
  ];

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      tables.forEach(table => {
        if (!db.objectStoreNames.contains(table)) {
          db.createObjectStore(table, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => {
      console.error("❌ IndexedDB Error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}
