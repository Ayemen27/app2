export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  originDeviceId: string;
  version: number;
  isDeleted: boolean;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export type ProjectStatus = 'active' | 'completed' | 'suspended' | 'cancelled';

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  location?: GeoLocation;
  managerId?: string;
  notes?: string;
}

export type WorkerType = 'skilled' | 'unskilled' | 'supervisor' | 'driver' | 'other';
export type WorkerStatus = 'active' | 'inactive' | 'terminated';

export interface Worker extends BaseEntity {
  name: string;
  phone?: string;
  nationalId?: string;
  workerType: WorkerType;
  dailyWage: number;
  projectId?: string;
  status: WorkerStatus;
  startDate?: string;
  notes?: string;
  photoPath?: string;
}

export interface WorkerAttendance extends BaseEntity {
  workerId: string;
  projectId: string;
  date: string;
  workDays: number;
  dailyWage: number;
  paidAmount: number;
  notes?: string;
  geoTag?: GeoLocation;
}

export interface Supplier extends BaseEntity {
  name: string;
  phone?: string;
  address?: string;
  category?: string;
  balance: number;
  notes?: string;
}

export interface MaterialPurchase extends BaseEntity {
  projectId: string;
  supplierId?: string;
  date: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  invoiceNumber?: string;
  notes?: string;
  attachmentIds: string[];
}

export type TransferType = 'cash' | 'bank' | 'check' | 'mobile';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface FundTransfer extends BaseEntity {
  projectId: string;
  date: string;
  amount: number;
  transferType: TransferType;
  senderName?: string;
  transferNumber?: string;
  notes?: string;
  attachmentIds: string[];
  approvalStatus?: ApprovalStatus;
}

export type UploadStatus = 'local' | 'uploading' | 'uploaded' | 'failed';

export interface Attachment extends BaseEntity {
  localPath: string;
  remotePath?: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadStatus: UploadStatus;
  entityType: string;
  entityId: string;
  thumbnailPath?: string;
}

export type SyncOperation = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  tableName: string;
  entityId: string;
  payload: unknown;
  createdAt: number;
  retryCount: number;
  lastError?: string;
  priority: number;
  status: QueueStatus;
}

export interface AppSettings {
  id: string;
  userId?: string;
  lastSyncToken?: string;
  lastSyncTime?: number;
  deviceId: string;
  language: string;
  theme: 'light' | 'dark';
  autoSync: boolean;
  syncInterval: number;
  offlineMode: boolean;
}
