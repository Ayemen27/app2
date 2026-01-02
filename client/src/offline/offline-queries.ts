import { getDB } from './db';
import { apiRequest } from '@/lib/queryClient';

/**
 * تحقق من حالة الاتصال بالإنترنت
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * احصل على البيانات من IndexedDB مباشرة (المصدر الوحيد للحقيقة)
 */
export async function getDataWithFallback<T>(
  endpoint: string,
  entityName: keyof typeof ENTITY_STORES,
  options?: {
    forceServer?: boolean;
    forceLocal?: boolean;
    timeout?: number;
  }
): Promise<{ data: T[]; source: 'server' | 'local' | 'empty'; isStale: boolean }> {
  console.log(`📦 [Absolute-Offline] جلب البيانات المحلية لـ ${entityName}`);
  
  const localData = await getLocalData(entityName);
  return {
    data: localData,
    source: 'local',
    isStale: false,
  };
}

/**
 * دالة جلب مع تعطيل الشبكة تماماً
 */
async function fetchWithTimeout(
  endpoint: string,
  timeout: number = 5000
): Promise<any> {
  console.warn('📡 [Absolute-Offline] محاولة اتصال بالشبكة تم حجبها');
  return [];
}

/**
 * احصل على البيانات المحلية من IndexedDB
 */
async function getLocalData(entityName: keyof typeof ENTITY_STORES): Promise<any[]> {
  try {
    const db = await getDB();
    const storeName = ENTITY_STORES[entityName];
    
    if (!storeName) {
      console.warn(`⚠️ [OfflineQueries] اسم المخزن غير معروف: ${entityName}`);
      return [];
    }

    const data = await db.getAll(storeName as any);
    console.log(`📦 [OfflineQueries] تم جلب ${data.length} سجل من ${storeName}`);
    return data;
  } catch (error) {
    console.error(`❌ [OfflineQueries] فشل جلب البيانات المحلية:`, error);
    return [];
  }
}

/**
 * احصل على سجل واحد محلياً بواسطة ID
 */
export async function getLocalRecord<T>(
  entityName: keyof typeof ENTITY_STORES,
  id: string
): Promise<T | null> {
  try {
    const db = await getDB();
    const storeName = ENTITY_STORES[entityName];
    
    if (!storeName) return null;

    const record = await db.get(storeName as any, id);
    return record || null;
  } catch (error) {
    console.error(`❌ [OfflineQueries] فشل جلب السجل:`, error);
    return null;
  }
}

/**
 * احفظ سجل محلياً
 */
export async function saveLocalRecord(
  entityName: keyof typeof ENTITY_STORES,
  record: any
): Promise<boolean> {
  try {
    const db = await getDB();
    const storeName = ENTITY_STORES[entityName];
    
    if (!storeName) return false;

    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.put(record);
    await tx.done;
    
    console.log(`✅ [OfflineQueries] تم حفظ السجل محلياً: ${storeName}/${record.id}`);
    return true;
  } catch (error) {
    console.error(`❌ [OfflineQueries] فشل حفظ السجل:`, error);
    return false;
  }
}

/**
 * احذف سجل محلياً
 */
export async function deleteLocalRecord(
  entityName: keyof typeof ENTITY_STORES,
  id: string
): Promise<boolean> {
  try {
    const db = await getDB();
    const storeName = ENTITY_STORES[entityName];
    
    if (!storeName) return false;

    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
    
    console.log(`🗑️ [OfflineQueries] تم حذف السجل محلياً: ${storeName}/${id}`);
    return true;
  } catch (error) {
    console.error(`❌ [OfflineQueries] فشل حذف السجل:`, error);
    return false;
  }
}

/**
 * تحقق من حداثة البيانات المحلية
 */
export async function isDataUpToDate(maxAge: number = 5 * 60 * 1000): Promise<boolean> {
  try {
    const db = await getDB();
    const metadata = await db.get('syncMetadata', 'lastSync');
    
    if (!metadata) {
      console.log('⚠️ [OfflineQueries] لا توجد بيانات مزامنة سابقة');
      return false;
    }

    const age = Date.now() - metadata.timestamp;
    const isUpToDate = age < maxAge;
    
    console.log(`📊 [OfflineQueries] عمر البيانات: ${Math.round(age / 1000)}s، محدثة: ${isUpToDate}`);
    return isUpToDate;
  } catch (error) {
    console.error(`❌ [OfflineQueries] فشل فحص حداثة البيانات:`, error);
    return false;
  }
}

/**
 * احصل على آخر وقت مزامنة
 */
export async function getLastSyncTime(): Promise<number | null> {
  try {
    const db = await getDB();
    const metadata = await db.get('syncMetadata', 'lastSync');
    return metadata?.timestamp || null;
  } catch (error) {
    console.error(`❌ [OfflineQueries] فشل جلب وقت المزامنة:`, error);
    return null;
  }
}

/**
 * خريطة الـ entity names إلى store names
 */
const ENTITY_STORES = {
  projects: 'projects',
  workers: 'workers',
  materials: 'materials',
  suppliers: 'suppliers',
  workerAttendance: 'workerAttendance',
  materialPurchases: 'materialPurchases',
  transportationExpenses: 'transportationExpenses',
  fundTransfers: 'fundTransfers',
  workerTransfers: 'workerTransfers',
  workerMiscExpenses: 'workerMiscExpenses',
  wells: 'wells',
  projectTypes: 'projectTypes',
} as const;

/**
 * نوع entity الذي يمكن البحث عنه
 */
export type EntityName = keyof typeof ENTITY_STORES;

/**
 * احصل على حالة جميع البيانات المحلية
 */
export async function getLocalDataStats(): Promise<Record<EntityName, number>> {
  const db = await getDB();
  const stats: Record<EntityName, number> = {} as any;

  for (const [entity, store] of Object.entries(ENTITY_STORES)) {
    try {
      const count = await db.count(store as any);
      stats[entity as EntityName] = count;
    } catch (error) {
      stats[entity as EntityName] = 0;
    }
  }

  return stats;
}

/**
 * نظّف البيانات المحلية القديمة
 */
export async function cleanupOldLocalData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const db = await getDB();
    const cutoffTime = Date.now() - maxAge;

    for (const store of Object.values(ENTITY_STORES)) {
      const tx = db.transaction(store, 'readwrite');
      const allRecords = await tx.store.getAll();

      for (const record of allRecords) {
        if (record.createdAt && record.createdAt < cutoffTime) {
          await tx.store.delete(record.id);
        }
      }
      await tx.done;
    }

    console.log(`🧹 [OfflineQueries] تم تنظيف البيانات القديمة`);
  } catch (error) {
    console.error(`❌ [OfflineQueries] فشل تنظيف البيانات:`, error);
  }
}
