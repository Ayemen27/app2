import { createRxDatabase, addRxPlugin } from 'rxdb';
import type { RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

import {
  projectSchema,
  workerSchema,
  attendanceSchema,
  supplierSchema,
  materialSchema,
  transferSchema,
  attachmentSchema,
  syncQueueSchema,
} from './schemas';

import type {
  Project,
  Worker,
  WorkerAttendance,
  Supplier,
  MaterialPurchase,
  FundTransfer,
  Attachment,
  SyncQueueItem,
} from './schema';

const isDev = typeof window !== 'undefined' && window.location?.hostname === 'localhost';
if (isDev) {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);

export type ProjectCollection = RxCollection<Project>;
export type WorkerCollection = RxCollection<Worker>;
export type AttendanceCollection = RxCollection<WorkerAttendance>;
export type SupplierCollection = RxCollection<Supplier>;
export type MaterialCollection = RxCollection<MaterialPurchase>;
export type TransferCollection = RxCollection<FundTransfer>;
export type AttachmentCollection = RxCollection<Attachment>;
export type SyncQueueCollection = RxCollection<SyncQueueItem>;

export type DatabaseCollections = {
  projects: ProjectCollection;
  workers: WorkerCollection;
  attendance: AttendanceCollection;
  suppliers: SupplierCollection;
  materials: MaterialCollection;
  transfers: TransferCollection;
  attachments: AttachmentCollection;
  sync_queue: SyncQueueCollection;
};

export type AppDatabase = RxDatabase<DatabaseCollections>;

let dbInstance: AppDatabase | null = null;

export async function createDatabase(): Promise<AppDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const storage = getRxStorageDexie();

  const db = await createRxDatabase<DatabaseCollections>({
    name: 'construction_manager_db',
    storage,
    multiInstance: false,
    ignoreDuplicate: true,
  });

  await db.addCollections({
    projects: {
      schema: projectSchema,
    },
    workers: {
      schema: workerSchema,
    },
    attendance: {
      schema: attendanceSchema,
    },
    suppliers: {
      schema: supplierSchema,
    },
    materials: {
      schema: materialSchema,
    },
    transfers: {
      schema: transferSchema,
    },
    attachments: {
      schema: attachmentSchema,
    },
    sync_queue: {
      schema: syncQueueSchema,
    },
  });

  dbInstance = db;
  console.log('✅ [RxDB] تم إنشاء قاعدة البيانات بنجاح');
  return db;
}

export async function getDatabase(): Promise<AppDatabase> {
  if (!dbInstance) {
    return createDatabase();
  }
  return dbInstance;
}

export async function destroyDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    console.log('🗑️ [RxDB] تم حذف قاعدة البيانات');
  }
}

export async function resetDatabase(): Promise<AppDatabase> {
  await destroyDatabase();
  return createDatabase();
}

export { dbInstance };
