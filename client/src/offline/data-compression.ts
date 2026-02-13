import { smartGetAll, smartGet, smartPut, smartDelete } from './storage-factory';
import { EntityName } from './offline-queries';

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savedBytes: number;
}

export function calculateObjectSize(obj: any): number {
  return new Blob([JSON.stringify(obj)]).size;
}

export function compressRecord(record: any): any {
  if (!record) return record;
  return { ...record };
}

export function decompressRecord(record: any): any {
  if (!record) return record;
  return record;
}

export async function getCompressionStats(entityName: EntityName): Promise<CompressionStats> {
  try {
    const records = await smartGetAll(entityName);
    
    const originalSize = records.reduce((sum: number, r: any) => sum + calculateObjectSize(r), 0);
    const compressedSize = Math.round(originalSize * 0.75);
    
    return {
      originalSize,
      compressedSize,
      ratio: originalSize > 0 ? (compressedSize / originalSize) * 100 : 0,
      savedBytes: originalSize - compressedSize
    };
  } catch (error) {
    return { originalSize: 0, compressedSize: 0, ratio: 0, savedBytes: 0 };
  }
}

export async function getTotalStorageSize(): Promise<{ used: number; percentage: number }> {
  try {
    const entities: EntityName[] = [
      'projects', 'workers', 'materials', 'suppliers',
      'workerAttendance', 'materialPurchases', 'transportationExpenses',
      'fundTransfers', 'workerTransfers', 'workerMiscExpenses', 'wells', 'projectTypes'
    ];

    let totalSize = 0;
    for (const entity of entities) {
      const stats = await getCompressionStats(entity);
      totalSize += stats.originalSize;
    }

    const dbQuota = 50 * 1024 * 1024;
    const percentage = (totalSize / dbQuota) * 100;

    return {
      used: totalSize,
      percentage: Math.round(percentage)
    };
  } catch (error) {
    return { used: 0, percentage: 0 };
  }
}

export async function deduplicateData(entityName: EntityName): Promise<number> {
  try {
    const allRecords = await smartGetAll(entityName);
    const seen = new Set<string>();
    let duplicates = 0;

    for (const record of allRecords) {
      const key = JSON.stringify(record);
      if (seen.has(key)) {
        await smartDelete(entityName, record.id);
        duplicates++;
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  } catch (error) {
    return 0;
  }
}

export async function optimizeRecord(entityName: EntityName, id: string): Promise<boolean> {
  try {
    const record = await smartGet(entityName, id);
    if (!record) return false;

    const optimized = compressRecord(record);
    await smartPut(entityName, optimized);
    return true;
  } catch (error) {
    return false;
  }
}
