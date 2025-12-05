# خطة المواءمة مع Backend - PostgreSQL ↔ SQLite

## 1. ربط الجداول (Schema Mapping)

### 1.1 جداول PostgreSQL الأساسية (47 جدول)

| الجدول في PostgreSQL | الجدول في SQLite | الأولوية | MVP |
|---------------------|------------------|----------|-----|
| `users` | `users` | 🔴 حرجة | ✅ |
| `projects` | `projects` | 🔴 حرجة | ✅ |
| `workers` | `workers` | 🔴 حرجة | ✅ |
| `worker_attendance` | `worker_attendance` | 🔴 حرجة | ✅ |
| `fund_transfers` | `fund_transfers` | 🔴 حرجة | ✅ |
| `material_purchases` | `material_purchases` | 🔴 حرجة | ✅ |
| `suppliers` | `suppliers` | 🔴 حرجة | ✅ |
| `supplier_payments` | `supplier_payments` | 🟡 عالية | ⬜ |
| `transportation_expenses` | `transportation_expenses` | 🟡 عالية | ⬜ |
| `worker_transfers` | `worker_transfers` | 🟡 عالية | ⬜ |
| `worker_misc_expenses` | `worker_misc_expenses` | 🟡 عالية | ⬜ |
| `daily_expense_summaries` | `daily_expense_summaries` | 🟡 عالية | ⬜ |
| `project_fund_transfers` | `project_fund_transfers` | 🟡 عالية | ⬜ |
| `worker_balances` | `worker_balances` | 🟡 عالية | ⬜ |
| `materials` | `materials` | 🟢 متوسطة | ⬜ |
| `tools` | `tools` | 🟢 متوسطة | ⬜ |
| `tool_movements` | `tool_movements` | 🟢 متوسطة | ⬜ |
| `notifications` | `notifications` | 🟢 متوسطة | ⬜ |
| `notification_read_states` | `notification_read_states` | 🟢 متوسطة | ⬜ |
| `sessions` | - | ❌ لا يُزامن | - |
| `security_policies` | - | ❌ لا يُزامن | - |
| `autocomplete_*` | `autocomplete_cache` | 🔵 منخفضة | ⬜ |

### 1.2 الحقول الإضافية في SQLite (للمزامنة)

```typescript
// حقول إضافية في كل جدول محلي
interface SyncFields {
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
  originDeviceId: string;
  version: number;
  localCreatedAt: number;
  localUpdatedAt: number;
  serverCreatedAt?: number;
  serverUpdatedAt?: number;
  isDeleted: boolean;
  deletedAt?: number;
}
```

---

## 2. عقود API (API Contracts)

### 2.1 Sync API Endpoints

```yaml
# POST /api/sync/push
Request:
  deviceId: string
  lastSyncToken: string?
  changes:
    - table: string
      operation: create | update | delete
      data: object
      checksum: string
      timestamp: number
      version: number

Response:
  success: boolean
  processed: number
  conflicts: ConflictItem[]
  errors: ErrorItem[]
  serverTime: number

# GET /api/sync/changes
Query:
  since: string (lastSyncToken)
  tables: string[] (optional)
  limit: number (default: 100)

Response:
  changes: ChangeItem[]
  hasMore: boolean
  newToken: string
  serverTime: number
  schemaVersion: number
```

### 2.2 Attachment API Endpoints

```yaml
# POST /api/attachments/upload/init
Request:
  fileName: string
  fileSize: number
  mimeType: string
  checksum: string
  entityType: string
  entityId: string

Response:
  sessionId: string
  chunkSize: number
  totalChunks: number
  expiresAt: string

# PUT /api/attachments/upload/{sessionId}/chunks/{index}
Request: binary data
Response:
  chunkIndex: number
  received: boolean
  checksum: string

# POST /api/attachments/upload/{sessionId}/complete
Response:
  attachmentId: string
  remotePath: string
  url: string
```

---

## 3. خطة ترحيل البيانات (Migration Plan)

### 3.1 الترحيل الأولي (First Sync)

```typescript
async function performInitialSync(userId: string): Promise<InitialSyncResult> {
  // 1. جلب بيانات المستخدم
  const userData = await api.get(`/api/sync/initial/${userId}`);
  
  // 2. إنشاء الجداول المحلية
  await createLocalDatabase();
  
  // 3. إدراج البيانات
  for (const table of SYNC_TABLES) {
    const data = userData[table] || [];
    await localDb[table].bulkInsert(
      data.map(item => ({
        ...item,
        syncStatus: 'synced',
        originDeviceId: DEVICE_ID,
        version: item.version || 1
      }))
    );
  }
  
  // 4. حفظ sync token
  await saveLastSyncToken(userData.syncToken);
  
  return { success: true, recordsImported: userData.totalRecords };
}
```

### 3.2 ترحيل الإصدارات (Schema Versioning)

```typescript
const SCHEMA_VERSIONS = {
  1: {
    tables: ['projects', 'workers', 'worker_attendance', 'fund_transfers', 
             'material_purchases', 'suppliers'],
    migrations: []
  },
  2: {
    tables: [...SCHEMA_VERSIONS[1].tables, 'supplier_payments', 'transportation_expenses'],
    migrations: [
      {
        name: 'add_supplier_payments',
        up: 'CREATE TABLE supplier_payments (...)',
        down: 'DROP TABLE supplier_payments'
      }
    ]
  }
};

async function migrateSchema(from: number, to: number): Promise<void> {
  for (let v = from + 1; v <= to; v++) {
    const version = SCHEMA_VERSIONS[v];
    for (const migration of version.migrations) {
      await localDb.exec(migration.up);
    }
    await setSchemaVersion(v);
  }
}
```

---

## 4. خطة الإصلاح والاسترداد (Recovery Plan)

### 4.1 اكتشاف عدم التزامن (Desync Detection)

```typescript
interface SyncHealthCheck {
  timestamp: number;
  localRecordCount: Record<string, number>;
  serverRecordCount: Record<string, number>;
  checksumMatch: boolean;
  status: 'healthy' | 'minor_desync' | 'major_desync' | 'critical';
}

async function checkSyncHealth(): Promise<SyncHealthCheck> {
  const local = await getLocalRecordCounts();
  const server = await api.get('/api/sync/health');
  
  const diffs = [];
  for (const table of SYNC_TABLES) {
    const diff = Math.abs(local[table] - server.counts[table]);
    if (diff > 0) {
      diffs.push({ table, diff, percentage: diff / server.counts[table] });
    }
  }
  
  let status: SyncHealthCheck['status'] = 'healthy';
  if (diffs.some(d => d.percentage > 0.1)) {
    status = 'critical';
  } else if (diffs.some(d => d.percentage > 0.01)) {
    status = 'major_desync';
  } else if (diffs.length > 0) {
    status = 'minor_desync';
  }
  
  return { timestamp: Date.now(), localRecordCount: local, 
           serverRecordCount: server.counts, checksumMatch: server.checksum === local.checksum,
           status };
}
```

### 4.2 إصلاح قاعدة البيانات (Database Repair)

```typescript
enum RepairStrategy {
  INCREMENTAL = 'incremental',  // إصلاح السجلات المختلفة فقط
  FULL_RESYNC = 'full_resync',  // إعادة مزامنة كاملة
  RESET = 'reset'               // حذف وإعادة تنزيل
}

async function repairDatabase(strategy: RepairStrategy): Promise<RepairResult> {
  switch (strategy) {
    case RepairStrategy.INCREMENTAL:
      // 1. جلب قائمة السجلات المختلفة
      const diff = await api.get('/api/sync/diff', { checksums: await getLocalChecksums() });
      
      // 2. تحديث السجلات المختلفة فقط
      for (const item of diff.updates) {
        await localDb[item.table].upsert(item.data);
      }
      for (const item of diff.deletes) {
        await localDb[item.table].delete(item.id);
      }
      break;
      
    case RepairStrategy.FULL_RESYNC:
      // 1. حفظ التغييرات المحلية غير المزامنة
      const pending = await getPendingChanges();
      
      // 2. مسح القاعدة
      await clearAllTables();
      
      // 3. إعادة التنزيل
      await performInitialSync(currentUserId);
      
      // 4. إعادة تطبيق التغييرات المحلية
      for (const change of pending) {
        await localDb[change.table].upsert({ ...change.data, syncStatus: 'pending' });
      }
      break;
      
    case RepairStrategy.RESET:
      // حذف كامل وإعادة بدء
      await localDb.destroy();
      await createLocalDatabase();
      await performInitialSync(currentUserId);
      break;
  }
  
  return { success: true, strategy };
}
```

### 4.3 استرداد من Corruption

```typescript
async function handleDatabaseCorruption(): Promise<void> {
  try {
    // 1. محاولة الإصلاح
    await localDb.exec('PRAGMA integrity_check');
  } catch {
    // 2. إذا فشل، استخدم النسخة الاحتياطية
    const hasBackup = await restoreFromBackup();
    
    if (!hasBackup) {
      // 3. إذا لا يوجد نسخة، أعد التنزيل
      await repairDatabase(RepairStrategy.RESET);
    }
  }
}

// نسخ احتياطي تلقائي
async function createBackup(): Promise<void> {
  const backupPath = `${BACKUP_DIR}/backup_${Date.now()}.sqlite`;
  await Filesystem.copy({
    from: DATABASE_PATH,
    to: backupPath
  });
  
  // حذف النسخ القديمة (الاحتفاظ بآخر 3)
  await cleanOldBackups(3);
}
```

---

## 5. تطور Schema في Backend

### 5.1 التعامل مع تغييرات Backend

```typescript
interface SchemaChange {
  version: number;
  changes: {
    addedTables: string[];
    removedTables: string[];
    addedColumns: { table: string; column: string; type: string }[];
    removedColumns: { table: string; column: string }[];
    renamedColumns: { table: string; from: string; to: string }[];
  };
  migrationScript: string;
}

async function handleBackendSchemaChange(change: SchemaChange): Promise<void> {
  // 1. التحقق من التوافق
  if (change.version > SUPPORTED_SCHEMA_VERSION + 1) {
    // يتطلب تحديث التطبيق
    await promptAppUpdate();
    return;
  }
  
  // 2. تطبيق التغييرات
  await migrateLocalSchema(change);
  
  // 3. إعادة المزامنة للجداول المتأثرة
  for (const table of [...change.addedTables, 
                       ...change.changes.addedColumns.map(c => c.table)]) {
    await resyncTable(table);
  }
}
```

### 5.2 Backward Compatibility

```typescript
// التطبيق يدعم إصدارات Backend متعددة
const SUPPORTED_BACKEND_VERSIONS = ['1.0', '1.1', '1.2'];

function transformApiResponse(response: any, backendVersion: string): any {
  if (backendVersion === '1.0') {
    // تحويل من الإصدار القديم
    return {
      ...response,
      newField: response.oldField || defaultValue
    };
  }
  return response;
}
```

---

## 6. سياسة تخزين الوسائط

### 6.1 التخزين المحلي

```typescript
const STORAGE_POLICY = {
  maxTotalSizeMB: 500,
  maxFileSizeMB: 20,
  retentionDays: {
    pending: Infinity,  // لا تحذف حتى الرفع
    uploaded: 30,       // 30 يوم بعد الرفع
    thumbnails: 90      // 90 يوم للصور المصغرة
  },
  autoCleanupThresholdMB: 400
};

async function cleanupStorage(): Promise<CleanupResult> {
  let freedBytes = 0;
  
  // 1. حذف المرفقات المرفوعة القديمة
  const oldUploaded = await getUploadedOlderThan(STORAGE_POLICY.retentionDays.uploaded);
  for (const file of oldUploaded) {
    await Filesystem.deleteFile({ path: file.localPath });
    freedBytes += file.size;
  }
  
  // 2. حذف الصور المصغرة القديمة
  const oldThumbnails = await getThumbnailsOlderThan(STORAGE_POLICY.retentionDays.thumbnails);
  for (const file of oldThumbnails) {
    await Filesystem.deleteFile({ path: file.path });
    freedBytes += file.size;
  }
  
  return { freedBytes, filesDeleted: oldUploaded.length + oldThumbnails.length };
}
```

### 6.2 التخزين على السيرفر

```yaml
# سياسة التخزين على السيرفر
storage_policy:
  provider: S3 / local filesystem
  bucket: construction-attachments
  
  structure:
    - /uploads/{year}/{month}/{entity_type}/{entity_id}/{filename}
    
  retention:
    active_projects: indefinite
    completed_projects: 2 years
    deleted_entities: 30 days
    
  backup:
    frequency: daily
    retention: 90 days
```

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
