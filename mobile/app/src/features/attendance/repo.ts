import { v4 as uuid } from 'uuid';
import { getDatabase } from '../../db/rxdb';
import type { WorkerAttendance, GeoLocation, SyncStatus } from '../../db/schema';

export interface CreateAttendanceInput {
  workerId: string;
  projectId: string;
  date: string;
  workDays: number;
  dailyWage: number;
  paidAmount: number;
  notes?: string;
  geoTag?: GeoLocation;
}

export interface UpdateAttendanceInput extends Partial<CreateAttendanceInput> {
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

export async function createAttendance(input: CreateAttendanceInput): Promise<WorkerAttendance> {
  const db = await getDatabase();
  const now = Date.now();
  
  const attendance: WorkerAttendance = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending' as SyncStatus,
    originDeviceId: getDeviceId(),
    version: 1,
    isDeleted: false,
    workerId: input.workerId,
    projectId: input.projectId,
    date: input.date,
    workDays: input.workDays,
    dailyWage: input.dailyWage,
    paidAmount: input.paidAmount,
    notes: input.notes,
    geoTag: input.geoTag,
  };

  await db.attendance.insert(attendance);
  console.log('✅ [AttendanceRepo] تم تسجيل حضور:', input.date);
  
  return attendance;
}

export async function updateAttendance(input: UpdateAttendanceInput): Promise<WorkerAttendance | null> {
  const db = await getDatabase();
  const doc = await db.attendance.findOne(input.id).exec();
  
  if (!doc) {
    console.warn('⚠️ [AttendanceRepo] سجل الحضور غير موجود:', input.id);
    return null;
  }

  const { id, ...updateData } = input;
  
  await doc.patch({
    ...updateData,
    updatedAt: Date.now(),
    syncStatus: 'pending' as SyncStatus,
    version: doc.version + 1,
  });

  const updated = await db.attendance.findOne(id).exec();
  console.log('✅ [AttendanceRepo] تم تحديث سجل الحضور');
  
  return updated?.toJSON() as WorkerAttendance;
}

export async function deleteAttendance(id: string): Promise<boolean> {
  const db = await getDatabase();
  const doc = await db.attendance.findOne(id).exec();
  
  if (!doc) {
    console.warn('⚠️ [AttendanceRepo] سجل الحضور غير موجود:', id);
    return false;
  }

  await doc.patch({
    isDeleted: true,
    updatedAt: Date.now(),
    syncStatus: 'pending' as SyncStatus,
    version: doc.version + 1,
  });

  console.log('✅ [AttendanceRepo] تم حذف سجل الحضور (soft delete)');
  return true;
}

export async function getAttendance(id: string): Promise<WorkerAttendance | null> {
  const db = await getDatabase();
  const doc = await db.attendance.findOne(id).exec();
  
  if (!doc || doc.isDeleted) {
    return null;
  }

  return doc.toJSON() as WorkerAttendance;
}

export async function listAttendance(options?: {
  workerId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
}): Promise<WorkerAttendance[]> {
  const db = await getDatabase();
  
  let query = db.attendance.find();

  if (!options?.includeDeleted) {
    query = query.where('isDeleted').eq(false);
  }

  if (options?.workerId) {
    query = query.where('workerId').eq(options.workerId);
  }

  if (options?.projectId) {
    query = query.where('projectId').eq(options.projectId);
  }

  const docs = await query.exec();
  let records = docs.map(doc => doc.toJSON() as WorkerAttendance);

  if (options?.startDate) {
    records = records.filter(r => r.date >= options.startDate!);
  }

  if (options?.endDate) {
    records = records.filter(r => r.date <= options.endDate!);
  }

  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  console.log('📋 [AttendanceRepo] جلب سجلات الحضور:', records.length);
  return records;
}

export async function getAttendanceByWorkerAndDate(
  workerId: string,
  date: string
): Promise<WorkerAttendance | null> {
  const db = await getDatabase();
  
  const docs = await db.attendance
    .find()
    .where('isDeleted').eq(false)
    .where('workerId').eq(workerId)
    .where('date').eq(date)
    .exec();

  if (docs.length === 0) {
    return null;
  }

  return docs[0].toJSON() as WorkerAttendance;
}

export async function getTodayAttendance(projectId?: string): Promise<WorkerAttendance[]> {
  const today = new Date().toISOString().split('T')[0];
  return listAttendance({ projectId, startDate: today, endDate: today });
}

export async function countAttendance(options?: {
  workerId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  totalRecords: number;
  totalWorkDays: number;
  totalPaid: number;
  totalOwed: number;
  pendingSync: number;
}> {
  const records = await listAttendance(options);
  
  const stats = {
    totalRecords: records.length,
    totalWorkDays: 0,
    totalPaid: 0,
    totalOwed: 0,
    pendingSync: 0,
  };

  records.forEach(record => {
    stats.totalWorkDays += record.workDays;
    stats.totalPaid += record.paidAmount;
    const owed = (record.workDays * record.dailyWage) - record.paidAmount;
    stats.totalOwed += owed > 0 ? owed : 0;
    
    if (record.syncStatus === 'pending') stats.pendingSync++;
  });

  return stats;
}

export async function getPendingAttendance(): Promise<WorkerAttendance[]> {
  const db = await getDatabase();
  
  const docs = await db.attendance
    .find()
    .where('syncStatus').eq('pending')
    .exec();

  return docs.map(doc => doc.toJSON() as WorkerAttendance);
}

export async function getWorkerAttendanceSummary(workerId: string): Promise<{
  totalDays: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  lastAttendance: string | null;
}> {
  const records = await listAttendance({ workerId });
  
  const summary = {
    totalDays: 0,
    totalEarned: 0,
    totalPaid: 0,
    balance: 0,
    lastAttendance: null as string | null,
  };

  if (records.length === 0) {
    return summary;
  }

  records.forEach(record => {
    summary.totalDays += record.workDays;
    summary.totalEarned += record.workDays * record.dailyWage;
    summary.totalPaid += record.paidAmount;
  });

  summary.balance = summary.totalEarned - summary.totalPaid;
  summary.lastAttendance = records[0].date;

  return summary;
}
