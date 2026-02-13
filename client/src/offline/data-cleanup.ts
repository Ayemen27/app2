import {
  smartGetAll, smartDelete, smartClear, smartCount
} from './storage-factory';
import { EntityName } from './offline-queries';

export async function deleteOldRecords(
  entityName: EntityName,
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000
): Promise<number> {
  try {
    const allRecords = await smartGetAll(entityName);
    const cutoffTime = Date.now() - maxAgeMs;
    let deleted = 0;

    for (const record of allRecords) {
      const createdAt = record.createdAt ? new Date(record.createdAt).getTime() : 0;
      if (createdAt > 0 && createdAt < cutoffTime) {
        await smartDelete(entityName, record.id);
        deleted++;
      }
    }

    return deleted;
  } catch (error) {
    console.error('[Cleanup] Error deleting old records:', error);
    return 0;
  }
}

export async function deleteSoftDeletedRecords(
  entityName: EntityName,
  deletedField: string = 'isDeleted'
): Promise<number> {
  try {
    const allRecords = await smartGetAll(entityName);
    let deleted = 0;

    for (const record of allRecords) {
      if (record[deletedField] === true) {
        await smartDelete(entityName, record.id);
        deleted++;
      }
    }

    return deleted;
  } catch (error) {
    console.error('[Cleanup] Error deleting soft-deleted records:', error);
    return 0;
  }
}

export async function clearAllLocalData(): Promise<boolean> {
  try {
    const entities: EntityName[] = [
      'projects', 'workers', 'materials', 'suppliers',
      'workerAttendance', 'materialPurchases', 'transportationExpenses',
      'fundTransfers', 'workerTransfers', 'workerMiscExpenses', 'wells', 'projectTypes'
    ];

    for (const entity of entities) {
      await smartClear(entity);
    }

    return true;
  } catch (error) {
    console.error('[Cleanup] Error clearing all data:', error);
    return false;
  }
}

export async function secureDelete(
  entityName: EntityName,
  id: string,
  overwrites: number = 3
): Promise<boolean> {
  try {
    for (let i = 0; i < overwrites; i++) {
      await smartDelete(entityName, id);
    }
    return true;
  } catch (error) {
    console.error('[Cleanup] Secure delete error:', error);
    return false;
  }
}

export async function clearPendingSyncData(): Promise<number> {
  try {
    const queue = await smartGetAll('syncQueue');
    const count = queue.length;
    await smartClear('syncQueue');
    return count;
  } catch (error) {
    console.error('[Cleanup] Error clearing pending sync:', error);
    return 0;
  }
}

export async function runCleanupPolicy(): Promise<{
  totalDeleted: number;
  deletedByType: Record<string, number>;
}> {
  try {
    const entities: EntityName[] = [
      'projects', 'workers', 'materials', 'suppliers',
      'workerAttendance', 'materialPurchases', 'transportationExpenses',
      'fundTransfers', 'workerTransfers', 'workerMiscExpenses', 'wells', 'projectTypes'
    ];

    const deletedByType: Record<string, number> = {};
    let totalDeleted = 0;

    for (const entity of entities) {
      const deleted = await deleteOldRecords(entity, 30 * 24 * 60 * 60 * 1000);
      deletedByType[entity] = deleted;
      totalDeleted += deleted;
    }

    return { totalDeleted, deletedByType };
  } catch (error) {
    console.error('[Cleanup] Cleanup policy error:', error);
    return { totalDeleted: 0, deletedByType: {} };
  }
}
