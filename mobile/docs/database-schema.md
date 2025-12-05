# تصميم قاعدة البيانات المحلية - تطبيق إدارة مشاريع البناء

## نظرة عامة

قاعدة بيانات SQLite محلية باستخدام RxDB للتخزين الـ Reactive والمزامنة.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   projects   │  │   workers    │  │  worker_attendance   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  suppliers   │  │  materials   │  │  material_purchases  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │fund_transfers│  │ attachments  │  │     sync_queue       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │daily_expenses│  │   settings   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. الحقول الأساسية المشتركة (Base Schema)

```typescript
interface BaseEntity {
  id: string;              // UUID v4 - المعرف الفريد
  createdAt: number;       // timestamp الإنشاء
  updatedAt: number;       // timestamp آخر تحديث
  syncStatus: SyncStatus;  // حالة المزامنة
  originDeviceId: string;  // معرف الجهاز المصدر
  version: number;         // رقم الإصدار للتضارب
  isDeleted: boolean;      // soft delete
}

type SyncStatus = 
  | 'pending'    // ينتظر المزامنة
  | 'syncing'    // جاري المزامنة
  | 'synced'     // تمت المزامنة
  | 'conflict'   // يوجد تضارب
  | 'error';     // خطأ في المزامنة
```

---

## 2. جدول المشاريع (projects)

```typescript
interface Project extends BaseEntity {
  name: string;              // اسم المشروع
  description?: string;      // وصف المشروع
  status: ProjectStatus;     // حالة المشروع
  startDate?: string;        // تاريخ البداية (ISO)
  endDate?: string;          // تاريخ النهاية (ISO)
  budget?: number;           // الميزانية
  location?: GeoLocation;    // الموقع GPS
  managerId?: string;        // معرف المدير
  notes?: string;            // ملاحظات
}

type ProjectStatus = 'active' | 'completed' | 'suspended' | 'cancelled';

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

// RxDB Schema
const projectSchema = {
  title: 'projects',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    name: { type: 'string', maxLength: 255 },
    description: { type: 'string' },
    status: { type: 'string', enum: ['active', 'completed', 'suspended', 'cancelled'] },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    budget: { type: 'number' },
    location: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        accuracy: { type: 'number' },
        address: { type: 'string' }
      }
    },
    managerId: { type: 'string' },
    notes: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    syncStatus: { type: 'string' },
    originDeviceId: { type: 'string' },
    version: { type: 'number' },
    isDeleted: { type: 'boolean' }
  },
  required: ['id', 'name', 'status', 'createdAt', 'updatedAt', 'syncStatus', 'version'],
  indexes: ['name', 'status', 'syncStatus', 'updatedAt']
};
```

---

## 3. جدول العمال (workers)

```typescript
interface Worker extends BaseEntity {
  name: string;              // اسم العامل
  phone?: string;            // رقم الهاتف
  nationalId?: string;       // رقم الهوية
  workerType: WorkerType;    // نوع العامل
  dailyWage: number;         // الأجر اليومي
  projectId?: string;        // المشروع الحالي
  status: WorkerStatus;      // حالة العامل
  startDate?: string;        // تاريخ البداية
  notes?: string;            // ملاحظات
  photoPath?: string;        // مسار الصورة
}

type WorkerType = 'skilled' | 'unskilled' | 'supervisor' | 'driver' | 'other';
type WorkerStatus = 'active' | 'inactive' | 'terminated';

// RxDB Schema
const workerSchema = {
  title: 'workers',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    name: { type: 'string', maxLength: 255 },
    phone: { type: 'string', maxLength: 20 },
    nationalId: { type: 'string', maxLength: 20 },
    workerType: { type: 'string', enum: ['skilled', 'unskilled', 'supervisor', 'driver', 'other'] },
    dailyWage: { type: 'number' },
    projectId: { type: 'string' },
    status: { type: 'string', enum: ['active', 'inactive', 'terminated'] },
    startDate: { type: 'string' },
    notes: { type: 'string' },
    photoPath: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    syncStatus: { type: 'string' },
    originDeviceId: { type: 'string' },
    version: { type: 'number' },
    isDeleted: { type: 'boolean' }
  },
  required: ['id', 'name', 'workerType', 'dailyWage', 'status', 'createdAt', 'updatedAt', 'syncStatus', 'version'],
  indexes: ['name', 'projectId', 'status', 'syncStatus', 'updatedAt']
};
```

---

## 4. جدول الحضور (worker_attendance)

```typescript
interface WorkerAttendance extends BaseEntity {
  workerId: string;          // معرف العامل
  projectId: string;         // معرف المشروع
  date: string;              // التاريخ (YYYY-MM-DD)
  workDays: number;          // عدد أيام العمل (0.5, 1, 1.5, etc.)
  dailyWage: number;         // الأجر اليومي (في وقت التسجيل)
  paidAmount: number;        // المبلغ المدفوع
  notes?: string;            // ملاحظات
  geoTag?: GeoLocation;      // موقع التسجيل
}

// RxDB Schema
const attendanceSchema = {
  title: 'worker_attendance',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    workerId: { type: 'string', maxLength: 36 },
    projectId: { type: 'string', maxLength: 36 },
    date: { type: 'string', maxLength: 10 },
    workDays: { type: 'number' },
    dailyWage: { type: 'number' },
    paidAmount: { type: 'number' },
    notes: { type: 'string' },
    geoTag: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        accuracy: { type: 'number' }
      }
    },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    syncStatus: { type: 'string' },
    originDeviceId: { type: 'string' },
    version: { type: 'number' },
    isDeleted: { type: 'boolean' }
  },
  required: ['id', 'workerId', 'projectId', 'date', 'workDays', 'paidAmount', 'createdAt', 'updatedAt', 'syncStatus', 'version'],
  indexes: [
    'workerId',
    'projectId',
    'date',
    ['projectId', 'date'],
    ['workerId', 'date'],
    'syncStatus',
    'updatedAt'
  ]
};
```

---

## 5. جدول الموردين (suppliers)

```typescript
interface Supplier extends BaseEntity {
  name: string;              // اسم المورد
  phone?: string;            // رقم الهاتف
  address?: string;          // العنوان
  category?: string;         // التصنيف
  balance: number;           // الرصيد (موجب = له، سالب = عليه)
  notes?: string;            // ملاحظات
}

// RxDB Schema
const supplierSchema = {
  title: 'suppliers',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    name: { type: 'string', maxLength: 255 },
    phone: { type: 'string', maxLength: 20 },
    address: { type: 'string' },
    category: { type: 'string' },
    balance: { type: 'number' },
    notes: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    syncStatus: { type: 'string' },
    originDeviceId: { type: 'string' },
    version: { type: 'number' },
    isDeleted: { type: 'boolean' }
  },
  required: ['id', 'name', 'balance', 'createdAt', 'updatedAt', 'syncStatus', 'version'],
  indexes: ['name', 'category', 'syncStatus', 'updatedAt']
};
```

---

## 6. جدول شراء المواد (material_purchases)

```typescript
interface MaterialPurchase extends BaseEntity {
  projectId: string;         // معرف المشروع
  supplierId?: string;       // معرف المورد
  date: string;              // التاريخ
  materialName: string;      // اسم المادة
  quantity: number;          // الكمية
  unit: string;              // الوحدة
  unitPrice: number;         // سعر الوحدة
  totalAmount: number;       // المبلغ الإجمالي
  paidAmount: number;        // المبلغ المدفوع
  invoiceNumber?: string;    // رقم الفاتورة
  notes?: string;            // ملاحظات
  attachmentIds: string[];   // معرفات المرفقات
}

// RxDB Schema
const materialPurchaseSchema = {
  title: 'material_purchases',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    projectId: { type: 'string', maxLength: 36 },
    supplierId: { type: 'string', maxLength: 36 },
    date: { type: 'string', maxLength: 10 },
    materialName: { type: 'string', maxLength: 255 },
    quantity: { type: 'number' },
    unit: { type: 'string', maxLength: 50 },
    unitPrice: { type: 'number' },
    totalAmount: { type: 'number' },
    paidAmount: { type: 'number' },
    invoiceNumber: { type: 'string' },
    notes: { type: 'string' },
    attachmentIds: {
      type: 'array',
      items: { type: 'string' }
    },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    syncStatus: { type: 'string' },
    originDeviceId: { type: 'string' },
    version: { type: 'number' },
    isDeleted: { type: 'boolean' }
  },
  required: ['id', 'projectId', 'date', 'materialName', 'quantity', 'totalAmount', 'createdAt', 'updatedAt', 'syncStatus', 'version'],
  indexes: ['projectId', 'supplierId', 'date', 'syncStatus', 'updatedAt']
};
```

---

## 7. جدول التحويلات المالية (fund_transfers)

```typescript
interface FundTransfer extends BaseEntity {
  projectId: string;         // معرف المشروع
  date: string;              // التاريخ
  amount: number;            // المبلغ
  transferType: TransferType; // نوع التحويل
  senderName?: string;       // اسم المرسل
  transferNumber?: string;   // رقم الحوالة
  notes?: string;            // ملاحظات
  attachmentIds: string[];   // معرفات المرفقات
  approvalStatus?: ApprovalStatus; // حالة الموافقة (للتضارب)
}

type TransferType = 'cash' | 'bank' | 'check' | 'mobile';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// RxDB Schema
const fundTransferSchema = {
  title: 'fund_transfers',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    projectId: { type: 'string', maxLength: 36 },
    date: { type: 'string', maxLength: 10 },
    amount: { type: 'number' },
    transferType: { type: 'string', enum: ['cash', 'bank', 'check', 'mobile'] },
    senderName: { type: 'string' },
    transferNumber: { type: 'string' },
    notes: { type: 'string' },
    attachmentIds: {
      type: 'array',
      items: { type: 'string' }
    },
    approvalStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    syncStatus: { type: 'string' },
    originDeviceId: { type: 'string' },
    version: { type: 'number' },
    isDeleted: { type: 'boolean' }
  },
  required: ['id', 'projectId', 'date', 'amount', 'transferType', 'createdAt', 'updatedAt', 'syncStatus', 'version'],
  indexes: ['projectId', 'date', 'syncStatus', 'updatedAt', 'approvalStatus']
};
```

---

## 8. جدول المرفقات (attachments)

```typescript
interface Attachment extends BaseEntity {
  localPath: string;         // المسار المحلي
  remotePath?: string;       // المسار على السيرفر
  fileName: string;          // اسم الملف
  mimeType: string;          // نوع الملف
  size: number;              // الحجم بالبايت
  uploadStatus: UploadStatus; // حالة الرفع
  entityType: string;        // نوع الكيان المرتبط
  entityId: string;          // معرف الكيان المرتبط
  thumbnailPath?: string;    // مسار الصورة المصغرة
}

type UploadStatus = 'local' | 'uploading' | 'uploaded' | 'failed';

// RxDB Schema
const attachmentSchema = {
  title: 'attachments',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    localPath: { type: 'string' },
    remotePath: { type: 'string' },
    fileName: { type: 'string', maxLength: 255 },
    mimeType: { type: 'string', maxLength: 100 },
    size: { type: 'number' },
    uploadStatus: { type: 'string', enum: ['local', 'uploading', 'uploaded', 'failed'] },
    entityType: { type: 'string', maxLength: 50 },
    entityId: { type: 'string', maxLength: 36 },
    thumbnailPath: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    syncStatus: { type: 'string' },
    originDeviceId: { type: 'string' },
    version: { type: 'number' },
    isDeleted: { type: 'boolean' }
  },
  required: ['id', 'localPath', 'fileName', 'mimeType', 'size', 'uploadStatus', 'entityType', 'entityId', 'createdAt', 'updatedAt', 'syncStatus', 'version'],
  indexes: ['entityType', 'entityId', 'uploadStatus', 'syncStatus']
};
```

---

## 9. جدول طابور المزامنة (sync_queue)

```typescript
interface SyncQueueItem {
  id: string;                // معرف العنصر
  operation: SyncOperation;  // نوع العملية
  tableName: string;         // اسم الجدول
  entityId: string;          // معرف الكيان
  payload: any;              // البيانات
  createdAt: number;         // وقت الإنشاء
  retryCount: number;        // عدد المحاولات
  lastError?: string;        // آخر خطأ
  priority: number;          // الأولوية (1 = عالية)
  status: QueueStatus;       // الحالة
}

type SyncOperation = 'create' | 'update' | 'delete';
type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

// RxDB Schema
const syncQueueSchema = {
  title: 'sync_queue',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    operation: { type: 'string', enum: ['create', 'update', 'delete'] },
    tableName: { type: 'string', maxLength: 50 },
    entityId: { type: 'string', maxLength: 36 },
    payload: { type: 'object' },
    createdAt: { type: 'number' },
    retryCount: { type: 'number' },
    lastError: { type: 'string' },
    priority: { type: 'number' },
    status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] }
  },
  required: ['id', 'operation', 'tableName', 'entityId', 'payload', 'createdAt', 'priority', 'status'],
  indexes: ['status', 'priority', 'createdAt', 'tableName']
};
```

---

## 10. جدول الإعدادات (settings)

```typescript
interface AppSettings {
  id: string;                // 'app_settings' (ثابت)
  userId?: string;           // معرف المستخدم
  lastSyncToken?: string;    // آخر توكن مزامنة
  lastSyncTime?: number;     // وقت آخر مزامنة
  deviceId: string;          // معرف الجهاز
  language: string;          // اللغة
  theme: 'light' | 'dark';   // السمة
  autoSync: boolean;         // المزامنة التلقائية
  syncInterval: number;      // فترة المزامنة (ميلي ثانية)
  offlineMode: boolean;      // وضع Offline القسري
}

// RxDB Schema
const settingsSchema = {
  title: 'settings',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 50 },
    userId: { type: 'string' },
    lastSyncToken: { type: 'string' },
    lastSyncTime: { type: 'number' },
    deviceId: { type: 'string' },
    language: { type: 'string' },
    theme: { type: 'string', enum: ['light', 'dark'] },
    autoSync: { type: 'boolean' },
    syncInterval: { type: 'number' },
    offlineMode: { type: 'boolean' }
  },
  required: ['id', 'deviceId', 'language', 'autoSync']
};
```

---

## 11. إنشاء قاعدة البيانات

```typescript
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageSQLite } from 'rxdb-premium/plugins/storage-sqlite';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

// إضافة plugin للتطوير
if (__DEV__) {
  addRxPlugin(RxDBDevModePlugin);
}

export async function createDatabase() {
  const db = await createRxDatabase({
    name: 'construction_db',
    storage: getRxStorageSQLite({
      sqliteQueryWithRecursiveRealTimeSupport: true
    }),
    multiInstance: false,
    ignoreDuplicate: true
  });

  // إضافة الـ Collections
  await db.addCollections({
    projects: { schema: projectSchema },
    workers: { schema: workerSchema },
    worker_attendance: { schema: attendanceSchema },
    suppliers: { schema: supplierSchema },
    material_purchases: { schema: materialPurchaseSchema },
    fund_transfers: { schema: fundTransferSchema },
    attachments: { schema: attachmentSchema },
    sync_queue: { schema: syncQueueSchema },
    settings: { schema: settingsSchema }
  });

  return db;
}
```

---

## 12. العلاقات بين الجداول

```
┌─────────────┐     1:N     ┌─────────────────────┐
│  projects   │────────────►│  worker_attendance  │
└─────────────┘             └─────────────────────┘
       │                              ▲
       │                              │ N:1
       │ 1:N                  ┌───────┴───────┐
       ▼                      │    workers    │
┌─────────────┐               └───────────────┘
│fund_transfers│
└─────────────┘

┌─────────────┐     1:N     ┌─────────────────────┐
│  projects   │────────────►│  material_purchases │
└─────────────┘             └─────────────────────┘
                                      │ N:1
                              ┌───────▼───────┐
                              │   suppliers   │
                              └───────────────┘

┌─────────────────────┐     1:N     ┌─────────────┐
│  material_purchases │────────────►│ attachments │
│  fund_transfers     │             └─────────────┘
└─────────────────────┘
```

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
