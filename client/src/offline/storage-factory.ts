import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';
import { getDB as getIDB, saveSyncedData as saveIDBSyncedData } from './db';

/**
 * دالة تهيئة التخزين الذكي
 */
export async function initializeStorage() {
  if (Capacitor.getPlatform() !== 'web') {
    await nativeStorage.initialize();
  } else {
    await getIDB();
  }
}

/**
 * حفظ البيانات بشكل ذكي
 */
export async function smartSave(tableName: string, records: any[]) {
  if (Capacitor.getPlatform() !== 'web') {
    for (const record of records) {
      await nativeStorage.set(tableName, record.id, record);
    }
    return records.length;
  } else {
    // في المتصفح، نحفظ أيضاً في IndexedDB
    return await saveIDBSyncedData(tableName, records);
  }
}

/**
 * جلب البيانات بشكل ذكي
 */
export async function smartGet(tableName: string, id: string) {
  if (Capacitor.getPlatform() !== 'web') {
    return await nativeStorage.get(tableName, id);
  } else {
    const db = await getIDB();
    return await db.get(tableName as any, id);
  }
}

/**
 * جلب جميع السجلات من جدول بشكل ذكي (لأغراض المصادقة أوفلاين)
 */
export async function smartGetAll(tableName: string): Promise<any[]> {
  if (Capacitor.getPlatform() !== 'web') {
    // سيتم تنفيذها لاحقاً في nativeStorage
    return [];
  } else {
    const db = await getIDB();
    return await db.getAll(tableName as any);
  }
}
