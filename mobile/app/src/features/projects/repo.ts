import { v4 as uuid } from 'uuid';
import { getDatabase } from '../../db/rxdb';
import type { Project, SyncStatus } from '../../db/schema';

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: 'active' | 'completed' | 'suspended' | 'cancelled';
  startDate?: string;
  endDate?: string;
  budget?: number;
  managerId?: string;
  notes?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string;
}

function getDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuid();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const db = await getDatabase();
  const now = Date.now();
  
  const project: Project = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending' as SyncStatus,
    originDeviceId: getDeviceId(),
    version: 1,
    isDeleted: false,
    name: input.name,
    description: input.description,
    status: input.status || 'active',
    startDate: input.startDate,
    endDate: input.endDate,
    budget: input.budget,
    managerId: input.managerId,
    notes: input.notes,
  };

  await db.projects.insert(project);
  console.log('✅ [ProjectRepo] تم إنشاء مشروع:', project.name);
  
  return project;
}

export async function updateProject(input: UpdateProjectInput): Promise<Project | null> {
  const db = await getDatabase();
  const doc = await db.projects.findOne(input.id).exec();
  
  if (!doc) {
    console.warn('⚠️ [ProjectRepo] المشروع غير موجود:', input.id);
    return null;
  }

  const { id, ...updateData } = input;
  
  await doc.patch({
    ...updateData,
    updatedAt: Date.now(),
    syncStatus: 'pending' as SyncStatus,
    version: doc.version + 1,
  });

  const updated = await db.projects.findOne(id).exec();
  console.log('✅ [ProjectRepo] تم تحديث مشروع:', updated?.name);
  
  return updated?.toJSON() as Project;
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = await getDatabase();
  const doc = await db.projects.findOne(id).exec();
  
  if (!doc) {
    console.warn('⚠️ [ProjectRepo] المشروع غير موجود:', id);
    return false;
  }

  await doc.patch({
    isDeleted: true,
    updatedAt: Date.now(),
    syncStatus: 'pending' as SyncStatus,
    version: doc.version + 1,
  });

  console.log('✅ [ProjectRepo] تم حذف مشروع (soft delete)');
  return true;
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDatabase();
  const doc = await db.projects.findOne(id).exec();
  
  if (!doc || doc.isDeleted) {
    return null;
  }

  return doc.toJSON() as Project;
}

export async function listProjects(options?: {
  status?: string;
  search?: string;
  includeDeleted?: boolean;
}): Promise<Project[]> {
  const db = await getDatabase();
  
  let query = db.projects.find();

  if (!options?.includeDeleted) {
    query = query.where('isDeleted').eq(false);
  }

  if (options?.status && options.status !== 'all') {
    query = query.where('status').eq(options.status);
  }

  const docs = await query.exec();
  let projects = docs.map(doc => doc.toJSON() as Project);

  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    projects = projects.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower)
    );
  }

  projects.sort((a, b) => b.createdAt - a.createdAt);
  
  console.log('📋 [ProjectRepo] جلب المشاريع:', projects.length);
  return projects;
}

export async function countProjects(): Promise<{
  total: number;
  active: number;
  completed: number;
  suspended: number;
  pending: number;
}> {
  const db = await getDatabase();
  
  const all = await db.projects.find().where('isDeleted').eq(false).exec();
  
  const stats = {
    total: all.length,
    active: 0,
    completed: 0,
    suspended: 0,
    pending: 0,
  };

  all.forEach(doc => {
    const project = doc.toJSON() as Project;
    if (project.status === 'active') stats.active++;
    else if (project.status === 'completed') stats.completed++;
    else if (project.status === 'suspended') stats.suspended++;
    
    if (project.syncStatus === 'pending') stats.pending++;
  });

  return stats;
}

export async function getPendingProjects(): Promise<Project[]> {
  const db = await getDatabase();
  
  const docs = await db.projects
    .find()
    .where('syncStatus').eq('pending')
    .exec();

  return docs.map(doc => doc.toJSON() as Project);
}
