import { v4 as uuid } from 'uuid';
import { getDatabase } from '../../db/rxdb';
import type { Worker, WorkerType, WorkerStatus, SyncStatus } from '../../db/schema';

export interface CreateWorkerInput {
  name: string;
  phone?: string;
  nationalId?: string;
  workerType: WorkerType;
  dailyWage: number;
  projectId?: string;
  status?: WorkerStatus;
  startDate?: string;
  notes?: string;
  photoPath?: string;
}

export interface UpdateWorkerInput extends Partial<CreateWorkerInput> {
  id: string;
}

function getDeviceId(): string {
  const stored = localStorage.getItem('deviceId');
  if (stored) {
    return stored;
  }
  const newId = uuid();
  localStorage.setItem('deviceId', newId);
  return newId;
}

export async function createWorker(input: CreateWorkerInput): Promise<Worker> {
  const db = await getDatabase();
  const now = Date.now();
  
  const worker: Worker = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending' as SyncStatus,
    originDeviceId: getDeviceId(),
    version: 1,
    isDeleted: false,
    name: input.name,
    phone: input.phone,
    nationalId: input.nationalId,
    workerType: input.workerType,
    dailyWage: input.dailyWage,
    projectId: input.projectId,
    status: input.status || 'active',
    startDate: input.startDate,
    notes: input.notes,
    photoPath: input.photoPath,
  };

  await db.workers.insert(worker);
  console.log('✅ [WorkerRepo] تم إنشاء عامل:', worker.name);
  
  return worker;
}

export async function updateWorker(input: UpdateWorkerInput): Promise<Worker | null> {
  const db = await getDatabase();
  const doc = await db.workers.findOne(input.id).exec();
  
  if (!doc) {
    console.warn('⚠️ [WorkerRepo] العامل غير موجود:', input.id);
    return null;
  }

  const { id, ...updateData } = input;
  
  await doc.patch({
    ...updateData,
    updatedAt: Date.now(),
    syncStatus: 'pending' as SyncStatus,
    version: doc.version + 1,
  });

  const updated = await db.workers.findOne(id).exec();
  console.log('✅ [WorkerRepo] تم تحديث عامل:', updated?.name);
  
  return updated?.toJSON() as Worker;
}

export async function deleteWorker(id: string): Promise<boolean> {
  const db = await getDatabase();
  const doc = await db.workers.findOne(id).exec();
  
  if (!doc) {
    console.warn('⚠️ [WorkerRepo] العامل غير موجود:', id);
    return false;
  }

  await doc.patch({
    isDeleted: true,
    updatedAt: Date.now(),
    syncStatus: 'pending' as SyncStatus,
    version: doc.version + 1,
  });

  console.log('✅ [WorkerRepo] تم حذف عامل (soft delete)');
  return true;
}

export async function getWorker(id: string): Promise<Worker | null> {
  const db = await getDatabase();
  const doc = await db.workers.findOne(id).exec();
  
  if (!doc || doc.isDeleted) {
    return null;
  }

  return doc.toJSON() as Worker;
}

export async function listWorkers(options?: {
  status?: WorkerStatus | 'all';
  workerType?: WorkerType | 'all';
  projectId?: string;
  search?: string;
  includeDeleted?: boolean;
}): Promise<Worker[]> {
  const db = await getDatabase();
  
  let query = db.workers.find();

  if (!options?.includeDeleted) {
    query = query.where('isDeleted').eq(false);
  }

  if (options?.status && options.status !== 'all') {
    query = query.where('status').eq(options.status);
  }

  if (options?.workerType && options.workerType !== 'all') {
    query = query.where('workerType').eq(options.workerType);
  }

  if (options?.projectId) {
    query = query.where('projectId').eq(options.projectId);
  }

  const docs = await query.exec();
  let workers = docs.map(doc => doc.toJSON() as Worker);

  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    workers = workers.filter(w => 
      w.name.toLowerCase().includes(searchLower) ||
      w.phone?.includes(searchLower) ||
      w.nationalId?.includes(searchLower)
    );
  }

  workers.sort((a, b) => b.createdAt - a.createdAt);
  
  console.log('📋 [WorkerRepo] جلب العمال:', workers.length);
  return workers;
}

export async function countWorkers(): Promise<{
  total: number;
  active: number;
  inactive: number;
  terminated: number;
  pending: number;
  byType: Record<WorkerType, number>;
}> {
  const db = await getDatabase();
  
  const all = await db.workers.find().where('isDeleted').eq(false).exec();
  
  const stats = {
    total: all.length,
    active: 0,
    inactive: 0,
    terminated: 0,
    pending: 0,
    byType: {
      skilled: 0,
      unskilled: 0,
      supervisor: 0,
      driver: 0,
      other: 0,
    } as Record<WorkerType, number>,
  };

  all.forEach(doc => {
    const worker = doc.toJSON() as Worker;
    if (worker.status === 'active') stats.active++;
    else if (worker.status === 'inactive') stats.inactive++;
    else if (worker.status === 'terminated') stats.terminated++;
    
    if (worker.syncStatus === 'pending') stats.pending++;
    
    stats.byType[worker.workerType]++;
  });

  return stats;
}

export async function getPendingWorkers(): Promise<Worker[]> {
  const db = await getDatabase();
  
  const docs = await db.workers
    .find()
    .where('syncStatus').eq('pending')
    .exec();

  return docs.map(doc => doc.toJSON() as Worker);
}

export async function getWorkersByProject(projectId: string): Promise<Worker[]> {
  const db = await getDatabase();
  
  const docs = await db.workers
    .find()
    .where('isDeleted').eq(false)
    .where('projectId').eq(projectId)
    .exec();

  const workers = docs.map(doc => doc.toJSON() as Worker);
  workers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  
  return workers;
}
