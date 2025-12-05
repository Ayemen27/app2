# تصميم نظام المزامنة الذكية (Smart Sync)

## نظرة عامة

نظام مزامنة ثنائي الاتجاه يدعم العمل Offline بالكامل مع حل ذكي للتضارب.

```
┌─────────────────────┐                    ┌─────────────────────┐
│   التطبيق (Mobile)  │                    │   السيرفر (Express) │
│                     │                    │                     │
│  ┌───────────────┐  │                    │  ┌───────────────┐  │
│  │  RxDB/SQLite  │  │◄──── Sync ────────►│  │  PostgreSQL   │  │
│  │  (محلي)       │  │                    │  │  (مركزي)      │  │
│  └───────────────┘  │                    │  └───────────────┘  │
│         │           │                    │         │           │
│  ┌──────▼────────┐  │                    │  ┌──────▼────────┐  │
│  │  Sync Queue   │  │──── Push ─────────►│  │  Change Log   │  │
│  │  (طابور)      │  │                    │  │  (سجل)        │  │
│  └───────────────┘  │                    │  └───────────────┘  │
│                     │                    │                     │
│  ┌───────────────┐  │                    │  ┌───────────────┐  │
│  │  lastSyncToken│  │◄──── Pull ────────│  │  Delta Query  │  │
│  │  (آخر مزامنة) │  │                    │  │  (التغييرات)  │  │
│  └───────────────┘  │                    │  └───────────────┘  │
└─────────────────────┘                    └─────────────────────┘
```

---

## 1. هيكل قاعدة البيانات المحلية

### 1.1 الحقول المشتركة (Base Fields)
```typescript
interface BaseEntity {
  id: string;              // UUID فريد
  updatedAt: number;       // timestamp آخر تعديل
  syncStatus: SyncStatus;  // حالة المزامنة
  originDeviceId: string;  // معرف الجهاز المصدر
  version: number;         // رقم الإصدار للتضارب
}

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
```

### 1.2 جدول طابور المزامنة (sync_queue)
```typescript
interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  tableName: string;
  entityId: string;
  payload: any;
  createdAt: number;
  retryCount: number;
  lastError?: string;
  priority: number;  // 1 = عالية، 5 = منخفضة
}
```

### 1.3 جدول المرفقات (attachments)
```typescript
interface Attachment {
  id: string;
  localPath: string;        // المسار المحلي
  remotePath?: string;      // المسار على السيرفر (بعد الرفع)
  mimeType: string;
  size: number;
  status: 'local' | 'uploading' | 'uploaded' | 'failed';
  entityType: string;       // 'material_purchase', 'project'
  entityId: string;
  createdAt: number;
}
```

---

## 2. API المزامنة

### 2.1 Push Changes (رفع التغييرات)
```http
POST /api/sync/push
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "device-uuid",
  "changes": [
    {
      "table": "worker_attendance",
      "operation": "create",
      "data": {
        "id": "attendance-uuid",
        "workerId": "worker-uuid",
        "projectId": "project-uuid",
        "date": "2025-12-05",
        "workDays": 1,
        "paidAmount": 500,
        "updatedAt": 1733400000000,
        "version": 1
      }
    },
    {
      "table": "projects",
      "operation": "update",
      "data": {
        "id": "project-uuid",
        "name": "مشروع البناء",
        "status": "active",
        "updatedAt": 1733400100000,
        "version": 5
      }
    }
  ]
}

Response:
{
  "success": true,
  "processed": 2,
  "conflicts": [],
  "errors": [],
  "serverTime": 1733400200000
}
```

### 2.2 Pull Changes (سحب التغييرات)
```http
GET /api/sync/changes?since=<lastSyncToken>&tables=projects,workers,attendance&limit=100
Authorization: Bearer <token>

Response:
{
  "changes": [
    {
      "table": "workers",
      "operation": "update",
      "data": {
        "id": "worker-uuid",
        "name": "أحمد محمد",
        "dailyWage": 600,
        "updatedAt": 1733400300000,
        "version": 3
      }
    }
  ],
  "hasMore": false,
  "newToken": "token-1733400300000",
  "serverTime": 1733400400000
}
```

### 2.3 Upload Attachment (رفع مرفق)
```http
POST /api/sync/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
entityType: material_purchase
entityId: purchase-uuid

Response:
{
  "success": true,
  "remotePath": "/uploads/2025/12/invoice-123.jpg",
  "size": 245000
}
```

---

## 3. خوارزمية المزامنة

### 3.1 دورة المزامنة الكاملة
```typescript
async function performFullSync(): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: [],
    errors: []
  };

  try {
    // 1. التحقق من الاتصال
    if (!await isOnline()) {
      return { ...result, status: 'offline' };
    }

    // 2. رفع التغييرات المحلية (Push)
    const pendingItems = await syncQueue.getPending();
    if (pendingItems.length > 0) {
      const pushResponse = await api.post('/api/sync/push', {
        deviceId: getDeviceId(),
        changes: pendingItems.map(formatForPush)
      });
      
      // معالجة النتيجة
      for (const item of pendingItems) {
        if (pushResponse.errors.includes(item.id)) {
          await syncQueue.markError(item.id, pushResponse.errors[item.id]);
        } else {
          await syncQueue.remove(item.id);
          await markEntitySynced(item.tableName, item.entityId);
        }
      }
      result.pushed = pushResponse.processed;
    }

    // 3. سحب التغييرات من السيرفر (Pull)
    let hasMore = true;
    const lastToken = await getLastSyncToken();
    
    while (hasMore) {
      const pullResponse = await api.get('/api/sync/changes', {
        since: lastToken,
        limit: 100
      });
      
      // تطبيق التغييرات
      for (const change of pullResponse.changes) {
        const conflict = await applyRemoteChange(change);
        if (conflict) {
          result.conflicts.push(conflict);
        }
        result.pulled++;
      }
      
      hasMore = pullResponse.hasMore;
      await setLastSyncToken(pullResponse.newToken);
    }

    // 4. رفع المرفقات المعلقة
    await uploadPendingAttachments();

    return { ...result, status: 'success' };
    
  } catch (error) {
    return { ...result, status: 'error', error: error.message };
  }
}
```

### 3.2 تطبيق تغيير من السيرفر
```typescript
async function applyRemoteChange(change: RemoteChange): Promise<Conflict | null> {
  const { table, operation, data } = change;
  const collection = getCollection(table);
  
  if (operation === 'delete') {
    await collection.findOne(data.id).remove();
    return null;
  }
  
  const localDoc = await collection.findOne(data.id).exec();
  
  if (!localDoc) {
    // سجل جديد - إضافة مباشرة
    await collection.insert({ ...data, syncStatus: 'synced' });
    return null;
  }
  
  // فحص التضارب
  if (localDoc.syncStatus === 'pending' && localDoc.version !== data.version) {
    // يوجد تضارب
    const resolved = await resolveConflict(table, localDoc, data);
    return resolved.hadConflict ? { table, localDoc, remoteData: data, resolution: resolved } : null;
  }
  
  // تحديث عادي
  await collection.upsert({ ...data, syncStatus: 'synced' });
  return null;
}
```

---

## 4. استراتيجيات حل التضارب

### 4.1 آخر تعديل يفوز (Default)
```typescript
// للجداول: projects, workers, suppliers, materials
function lastWriteWins(local: any, remote: any): Resolution {
  if (local.updatedAt > remote.updatedAt) {
    return { winner: 'local', data: local, hadConflict: true };
  }
  return { winner: 'remote', data: remote, hadConflict: true };
}
```

### 4.2 تجميع ذكي (للحضور)
```typescript
// للجدول: worker_attendance
function mergeAttendance(local: Attendance, remote: Attendance): Resolution {
  // إذا كان نفس اليوم - جمع القيم
  if (local.date === remote.date && local.workerId === remote.workerId) {
    return {
      winner: 'merged',
      data: {
        ...remote,
        workDays: local.workDays + remote.workDays,
        paidAmount: local.paidAmount + remote.paidAmount,
        updatedAt: Math.max(local.updatedAt, remote.updatedAt),
        version: remote.version + 1
      },
      hadConflict: true
    };
  }
  return lastWriteWins(local, remote);
}
```

### 4.3 موافقة يدوية (للتحويلات المالية)
```typescript
// للجداول: fund_transfers, supplier_payments
function requireManualApproval(local: Transfer, remote: Transfer): Resolution {
  return {
    winner: 'pending',
    data: {
      ...local,
      syncStatus: 'conflict',
      conflictData: remote,
      conflictType: 'financial'
    },
    hadConflict: true,
    requiresUserAction: true
  };
}
```

---

## 5. إدارة الاتصال

### 5.1 مراقب الشبكة
```typescript
class NetworkMonitor {
  private listeners: Set<(online: boolean) => void> = new Set();
  private isOnlineStatus: boolean = true;
  
  constructor() {
    Network.addListener('networkStatusChange', (status) => {
      this.isOnlineStatus = status.connected;
      this.notifyListeners();
      
      if (status.connected) {
        // بدء المزامنة التلقائية
        SyncEngine.getInstance().startSync();
      }
    });
  }
  
  isOnline(): boolean {
    return this.isOnlineStatus;
  }
  
  onStatusChange(callback: (online: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
```

### 5.2 إعادة المحاولة مع Backoff
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

---

## 6. مؤشرات حالة المزامنة

### 6.1 حالات الـ UI
```typescript
type SyncUIState = 
  | 'synced'      // كل شيء متزامن ✓
  | 'syncing'     // جاري المزامنة ↻
  | 'pending'     // هناك تغييرات معلقة (رقم)
  | 'offline'     // غير متصل ✕
  | 'error'       // خطأ في المزامنة ⚠
  | 'conflict';   // يوجد تضارب يحتاج تدخل !

function getSyncUIState(): SyncUIState {
  const isOnline = networkMonitor.isOnline();
  const pendingCount = syncQueue.count();
  const hasConflicts = conflictStore.hasUnresolved();
  const lastSyncError = syncStore.getLastError();
  
  if (hasConflicts) return 'conflict';
  if (lastSyncError && !isOnline) return 'error';
  if (!isOnline) return 'offline';
  if (syncEngine.isSyncing()) return 'syncing';
  if (pendingCount > 0) return 'pending';
  return 'synced';
}
```

### 6.2 مكون عرض الحالة
```tsx
function SyncIndicator() {
  const state = useSyncState();
  const pendingCount = usePendingCount();
  
  return (
    <View style={styles.indicator}>
      {state === 'synced' && <Icon name="check" color="green" />}
      {state === 'syncing' && <ActivityIndicator />}
      {state === 'pending' && (
        <Badge count={pendingCount}>
          <Icon name="cloud-upload" color="orange" />
        </Badge>
      )}
      {state === 'offline' && <Icon name="cloud-off" color="gray" />}
      {state === 'error' && <Icon name="alert" color="red" />}
      {state === 'conflict' && <Icon name="warning" color="yellow" />}
    </View>
  );
}
```

---

## 7. تحسينات الأداء

### 7.1 Debounce للتغييرات المتكررة
```typescript
const debouncedSync = debounce(async () => {
  await syncEngine.startSync();
}, 5000); // انتظر 5 ثواني بعد آخر تغيير
```

### 7.2 Batch Processing
```typescript
// تجميع التغييرات وإرسالها دفعة واحدة
const BATCH_SIZE = 50;
const BATCH_DELAY = 2000;

async function batchPush() {
  const pending = await syncQueue.getPending();
  const batches = chunk(pending, BATCH_SIZE);
  
  for (const batch of batches) {
    await api.post('/api/sync/push', { changes: batch });
    await delay(100); // تجنب الضغط على السيرفر
  }
}
```

### 7.3 Delta Sync
```typescript
// سحب التغييرات منذ آخر مزامنة فقط
const changes = await api.get('/api/sync/changes', {
  since: lastSyncToken,
  tables: ['workers', 'attendance'], // الجداول المطلوبة فقط
  limit: 100
});
```

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
