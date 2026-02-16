import { apiRequest } from "./queryClient";

export async function syncLocalData(table: string, data: any[]) {
  try {
    const response = await apiRequest("POST", "/api/sync/instant-sync", { tables: [table], data });
    return await response.json();
  } catch (error) {
    console.error(`[Sync] خطأ مزامنة جدول ${table}:`, error);
    throw error;
  }
}

export async function syncEncryptedData(table: string, data: any) {
  try {
    const response = await apiRequest("POST", "/api/sync/instant-sync", {
      tables: [table],
      encrypted: true,
      data: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error(`[Sync] خطأ مزامنة مشفرة لجدول ${table}:`, error);
    throw error;
  }
}

export async function performDeltaSync(lastSyncTime?: number) {
  try {
    const url = lastSyncTime
      ? `/api/sync/full-backup?lastSyncTime=${new Date(lastSyncTime).toISOString()}`
      : '/api/sync/full-backup';
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Sync] خطأ في المزامنة التفاضلية:', error);
    throw error;
  }
}

export async function initializeObjectStores() {
  const { smartSave } = await import('../offline/storage-factory');
  return true;
}
