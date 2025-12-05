# الهندسة المعمارية - تطبيق إدارة مشاريع البناء

## نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────────┐
│                     تطبيق Android (Capacitor)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   React UI   │  │   RxDB       │  │   Capacitor Plugins  │  │
│  │   (Reused)   │  │   (Reactive) │  │   Camera/GPS/Push    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│           │                │                    │               │
│           └────────────────┼────────────────────┘               │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │              Sync Engine (المزامنة الذكية)                 │  │
│  │  ┌─────────┐  ┌─────────────┐  ┌──────────────────────┐   │  │
│  │  │ Queue   │  │ Conflict    │  │ Network Monitor      │   │  │
│  │  │ Manager │  │ Resolver    │  │ (الاتصال)            │   │  │
│  │  └─────────┘  └─────────────┘  └──────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                    SQLite Database                         │  │
│  │  projects | workers | attendance | transfers | sync_queue  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTPS/TLS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express.js Backend                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth API    │  │  Sync API    │  │   Business APIs      │  │
│  │  (JWT)       │  │  push/pull   │  │   CRUD Operations    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                    PostgreSQL Database                     │  │
│  │              (المصدر الرئيسي للحقيقة)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. طبقة العرض (Presentation Layer)

### 1.1 React Components (إعادة الاستخدام)
```
mobile/app/src/
├── features/
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── ProjectForm.tsx
│   ├── workers/
│   │   ├── WorkerList.tsx
│   │   ├── WorkerDetail.tsx
│   │   └── WorkerForm.tsx
│   ├── attendance/
│   │   ├── AttendanceList.tsx
│   │   └── AttendanceForm.tsx
│   └── expenses/
│       ├── DailyExpenses.tsx
│       └── MaterialPurchase.tsx
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── SyncIndicator.tsx
└── i18n/
    └── ar.json
```

### 1.2 التنقل (Navigation)
- React Navigation (Stack + Bottom Tabs)
- Deep Linking للإشعارات
- حفظ حالة التنقل

---

## 2. طبقة البيانات (Data Layer)

### 2.1 RxDB + SQLite
```typescript
// إعداد قاعدة البيانات
import { createRxDatabase } from 'rxdb';
import { getRxStorageSQLite } from 'rxdb-premium/plugins/storage-sqlite';

const db = await createRxDatabase({
  name: 'construction_mgmt',
  storage: getRxStorageSQLite({
    sqliteQueryWithRecursiveRealTimeSupport: true
  })
});
```

### 2.2 Repository Pattern
```typescript
// مثال: WorkerRepository
class WorkerRepository {
  private collection: RxCollection<WorkerDocument>;

  async getAll(): Promise<Worker[]> {
    return this.collection.find().exec();
  }

  async getById(id: string): Promise<Worker | null> {
    return this.collection.findOne(id).exec();
  }

  async save(worker: Worker): Promise<void> {
    await this.collection.upsert({
      ...worker,
      syncStatus: 'pending',
      updatedAt: Date.now(),
      originDeviceId: getDeviceId()
    });
  }

  async getPendingSync(): Promise<Worker[]> {
    return this.collection.find({
      selector: { syncStatus: 'pending' }
    }).exec();
  }
}
```

---

## 3. طبقة المزامنة (Sync Layer)

### 3.1 هيكل Sync Engine
```typescript
class SyncEngine {
  private queue: SyncQueue;
  private resolver: ConflictResolver;
  private network: NetworkMonitor;

  async startSync(): Promise<SyncResult> {
    if (!this.network.isOnline()) {
      return { status: 'offline', pending: this.queue.count() };
    }

    // 1. رفع التغييرات المحلية
    const pushResult = await this.pushChanges();
    
    // 2. سحب التغييرات من السيرفر
    const pullResult = await this.pullChanges();
    
    // 3. حل التضارب
    const conflicts = await this.resolver.resolve(pullResult.conflicts);
    
    return { status: 'success', pushed: pushResult.count, pulled: pullResult.count };
  }

  private async pushChanges(): Promise<PushResult> {
    const pending = await this.queue.getPending();
    const response = await api.post('/api/sync/push', { changes: pending });
    await this.queue.markSynced(pending.map(p => p.id));
    return response;
  }

  private async pullChanges(): Promise<PullResult> {
    const lastToken = await this.getLastSyncToken();
    const response = await api.get('/api/sync/changes', { since: lastToken });
    await this.applyRemoteChanges(response.changes);
    await this.setLastSyncToken(response.newToken);
    return response;
  }
}
```

### 3.2 استراتيجيات حل التضارب
```typescript
interface ConflictStrategy {
  resolve(local: any, remote: any): any;
}

// 1. آخر تعديل يفوز (للبيانات العامة)
class LastWriteWinsStrategy implements ConflictStrategy {
  resolve(local: any, remote: any) {
    return local.updatedAt > remote.updatedAt ? local : remote;
  }
}

// 2. تجميع ذكي (للحضور)
class AttendanceMergeStrategy implements ConflictStrategy {
  resolve(local: AttendanceRecord, remote: AttendanceRecord) {
    return {
      ...remote,
      workDays: local.workDays + remote.workDays,
      paidAmount: local.paidAmount + remote.paidAmount,
      syncStatus: 'synced'
    };
  }
}

// 3. موافقة يدوية (للتحويلات المالية)
class ManualApprovalStrategy implements ConflictStrategy {
  resolve(local: Transfer, remote: Transfer) {
    return { ...local, syncStatus: 'conflict', conflictWith: remote };
  }
}
```

---

## 4. طبقة Native (Capacitor Plugins)

### 4.1 الكاميرا
```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

async function captureInvoicePhoto(): Promise<string> {
  const image = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera
  });
  
  // ضغط الصورة
  const compressed = await compressImage(image.dataUrl, { maxWidth: 1200 });
  
  // حفظ محلياً
  const localPath = await saveToLocalStorage(compressed);
  
  return localPath;
}
```

### 4.2 GPS
```typescript
import { Geolocation } from '@capacitor/geolocation';

async function getProjectLocation(): Promise<GeoLocation> {
  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000
  });
  
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy
  };
}
```

### 4.3 الإشعارات
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

async function initPushNotifications() {
  // طلب الإذن
  const permission = await PushNotifications.requestPermissions();
  
  if (permission.receive === 'granted') {
    // التسجيل
    await PushNotifications.register();
    
    // استقبال الإشعارات
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      handleNotification(notification);
    });
  }
}
```

---

## 5. أنماط التصميم المستخدمة

### 5.1 Repository Pattern
- فصل منطق البيانات عن الواجهة
- سهولة اختبار الكود
- مرونة تغيير مصدر البيانات

### 5.2 Observer Pattern (RxDB)
- تحديث الواجهة تلقائياً عند تغيير البيانات
- اشتراكات reactive

### 5.3 Queue Pattern
- طابور المزامنة للعمليات المؤجلة
- إعادة المحاولة مع backoff

### 5.4 Strategy Pattern
- استراتيجيات حل التضارب المختلفة
- مرونة إضافة استراتيجيات جديدة

---

## 6. الأمان

### 6.1 تشفير البيانات المحلية
```typescript
// تشفير البيانات الحساسة فقط
const encryptedFields = ['password', 'token', 'financialData'];

const encryptionPlugin = createEncryptionPlugin({
  password: getDeviceEncryptionKey(),
  fields: encryptedFields
});
```

### 6.2 المصادقة
- JWT مع Access + Refresh tokens
- تخزين آمن في Secure Storage
- تجديد تلقائي للتوكن

### 6.3 اتصال آمن
- HTTPS فقط
- Certificate Pinning (اختياري)
- عدم تخزين بيانات حساسة في logs

---

## 7. مراقبة الأداء

### 7.1 Metrics المتتبعة
- زمن تحميل الشاشات
- زمن المزامنة
- استهلاك الذاكرة
- معدل الأعطال

### 7.2 أدوات المراقبة
- Firebase Crashlytics
- Firebase Performance
- Custom analytics

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
