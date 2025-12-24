import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';

/**
 * حفظ عملية في قائمة الانتظار للمزامنة لاحقاً
 */
export async function queueForSync(
  action: 'create' | 'update' | 'delete',
  endpoint: string,
  payload: Record<string, any>
): Promise<string> {
  const db = await getDB();
  const id = uuidv4();

  const queueItem = {
    id,
    action,
    endpoint,
    payload,
    timestamp: Date.now(),
    retries: 0,
    lastError: undefined
  };

  await db.add('syncQueue', queueItem);
  console.log(`[Offline] تم إضافة عملية إلى قائمة الانتظار: ${id}`);

  return id;
}

/**
 * جلب جميع العمليات المعلقة من قائمة الانتظار
 */
export async function getPendingSyncQueue() {
  const db = await getDB();
  const allItems = await db.getAll('syncQueue');
  return allItems.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * إزالة عملية من قائمة الانتظار بعد المزامنة الناجحة
 */
export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
  console.log(`[Offline] تم حذف عملية من قائمة الانتظار: ${id}`);
}

/**
 * تحديث عدد محاولات إعادة التجربة
 */
export async function updateSyncRetries(
  id: string,
  retries: number,
  error?: string
): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  
  if (item) {
    item.retries = retries;
    if (error) {
      item.lastError = error;
    }
    await db.put('syncQueue', item);
  }
}

/**
 * حفظ بيانات محلية بسرعة (قبل إرسالها للـ API)
 */
export async function saveUserDataLocal(
  type: string,
  data: Record<string, any>
): Promise<string> {
  const db = await getDB();
  const id = data.id || uuidv4();

  const userData = {
    id,
    type,
    data,
    syncedAt: 0,
    createdAt: Date.now()
  };

  await db.put('userData', userData);
  console.log(`[Offline] تم حفظ بيانات محلية: ${type}/${id}`);

  return id;
}

/**
 * جلب بيانات محلية حسب النوع
 */
export async function getUserDataLocal(type: string) {
  const db = await getDB();
  const index = db.transaction('userData').objectStore('userData').index('type');
  return await index.getAll(type);
}

/**
 * حفظ قائمة API (projects, workers, etc) محلياً
 */
export async function saveListLocal(
  storeName: 'projects' | 'workers' | 'materials' | 'suppliers' | 'expenses',
  items: Record<string, any>[],
  metadata?: { syncedAt: number; totalCount: number }
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');

  // حذف البيانات القديمة
  const store = tx.objectStore(storeName);
  const allKeys = await store.getAllKeys();
  for (const key of allKeys) {
    await store.delete(key);
  }

  // إضافة البيانات الجديدة
  for (const item of items) {
    await store.put({
      ...item,
      createdAt: item.createdAt || Date.now(),
      _syncedAt: metadata?.syncedAt || Date.now()
    });
  }

  await tx.done;
  console.log(`[Offline] تم حفظ ${items.length} عنصر من ${storeName}`);
}

/**
 * جلب قائمة محلية
 */
export async function getListLocal(
  storeName: 'projects' | 'workers' | 'materials' | 'suppliers' | 'expenses'
) {
  const db = await getDB();
  return await db.getAll(storeName);
}

/**
 * البحث عن عنصر محلي
 */
export async function getItemLocal(
  storeName: 'projects' | 'workers' | 'materials' | 'suppliers' | 'expenses',
  id: string
) {
  const db = await getDB();
  return await db.get(storeName, id);
}

/**
 * تحديث عنصر محلي
 */
export async function updateItemLocal(
  storeName: 'projects' | 'workers' | 'materials' | 'suppliers' | 'expenses',
  id: string,
  updates: Record<string, any>
): Promise<void> {
  const db = await getDB();
  const item = await db.get(storeName, id);

  if (item) {
    const updated = {
      ...item,
      ...updates,
      _updatedAt: Date.now()
    };
    await db.put(storeName, updated);
    console.log(`[Offline] تم تحديث عنصر محلي: ${storeName}/${id}`);
  }
}

/**
 * إضافة عنصر محلي
 */
export async function addItemLocal(
  storeName: 'projects' | 'workers' | 'materials' | 'suppliers' | 'expenses',
  item: Record<string, any>
): Promise<string> {
  const db = await getDB();
  const id = item.id || uuidv4();

  const newItem = {
    ...item,
    id,
    createdAt: item.createdAt || Date.now(),
    _isLocal: true
  };

  await db.put(storeName, newItem);
  console.log(`[Offline] تم إضافة عنصر محلي: ${storeName}/${id}`);

  return id;
}

/**
 * حذف عنصر محلي
 */
export async function deleteItemLocal(
  storeName: 'projects' | 'workers' | 'materials' | 'suppliers' | 'expenses',
  id: string
): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
  console.log(`[Offline] تم حذف عنصر محلي: ${storeName}/${id}`);
}

/**
 * مسح جميع البيانات المحلية (للـ logout)
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  const stores = ['syncQueue', 'userData', 'projects', 'workers', 'materials', 'suppliers', 'expenses'];

  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    await tx.objectStore(store).clear();
    await tx.done;
  }

  console.log('[Offline] تم مسح جميع البيانات المحلية');
}

/**
 * الحصول على إحصائيات العمليات المعلقة
 */
export async function getSyncStats() {
  const db = await getDB();
  const pendingCount = await db.count('syncQueue');
  const userDataCount = await db.count('userData');

  return {
    pendingSync: pendingCount,
    localUserData: userDataCount,
    lastUpdate: Date.now()
  };
}
