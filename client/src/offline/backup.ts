import { smartGetAll, smartClear, smartSave } from './storage-factory';
import { downloadFile } from '@/utils/webview-download';

const BACKUP_STORES = ['syncQueue', 'userData', 'projects', 'workers', 'materials', 'suppliers', 'expenses'];

export async function exportLocalData(): Promise<string> {
  const exportData: Record<string, any> = {};

  for (const store of BACKUP_STORES) {
    try {
      exportData[store] = await smartGetAll(store);
    } catch {
      exportData[store] = [];
    }
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const fileName = `binarjoin-backup-${new Date().toISOString().split('T')[0]}.json`;
  await downloadFile(blob, fileName, 'application/json');

  return 'تم تصدير البيانات بنجاح';
}

export async function importLocalData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    const stores = Object.keys(data);

    for (const storeName of stores) {
      const items = data[storeName];
      if (Array.isArray(items) && items.length > 0) {
        await smartClear(storeName);
        await smartSave(storeName, items);
      }
    }
  } catch (error) {
    console.error('[Backup] Import failed:', error);
    throw new Error('فشل استيراد البيانات: تنسيق غير صالح');
  }
}
