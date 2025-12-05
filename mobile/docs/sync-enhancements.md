# تحسينات نظام المزامنة - ملحق تقني

## 1. حدود الدُفعات وسياسات Rate Limiting

### 1.1 حدود الدفعات (Batching Limits)
```typescript
const SYNC_LIMITS = {
  MAX_BATCH_SIZE: 50,           // عدد السجلات في الدفعة الواحدة
  MAX_BATCH_SIZE_KB: 500,       // حجم الدفعة بالكيلوبايت
  MIN_SYNC_INTERVAL_MS: 5000,   // الحد الأدنى بين المزامنات
  MAX_CONCURRENT_UPLOADS: 2,    // رفع ملفين بالتوازي فقط
  DEBOUNCE_MS: 3000,           // انتظار 3 ثواني بعد آخر تغيير
  IDLE_SYNC_INTERVAL_MS: 60000 // مزامنة كل دقيقة في الخمول
};
```

### 1.2 Rate Limiting
```typescript
class SyncRateLimiter {
  private lastSyncTime: number = 0;
  private syncCount: number = 0;
  private windowStart: number = Date.now();
  
  private readonly MAX_SYNCS_PER_MINUTE = 10;
  private readonly WINDOW_MS = 60000;
  
  canSync(): boolean {
    const now = Date.now();
    
    // إعادة تعيين النافذة
    if (now - this.windowStart > this.WINDOW_MS) {
      this.windowStart = now;
      this.syncCount = 0;
    }
    
    // فحص الحد الأدنى
    if (now - this.lastSyncTime < SYNC_LIMITS.MIN_SYNC_INTERVAL_MS) {
      return false;
    }
    
    // فحص حد النافذة
    if (this.syncCount >= this.MAX_SYNCS_PER_MINUTE) {
      return false;
    }
    
    return true;
  }
  
  recordSync(): void {
    this.lastSyncTime = Date.now();
    this.syncCount++;
  }
}
```

---

## 2. Backoff Strategy

### 2.1 Exponential Backoff مع Jitter
```typescript
interface BackoffConfig {
  initialDelay: number;    // 1000ms
  maxDelay: number;        // 60000ms (1 دقيقة)
  multiplier: number;      // 2
  jitterFactor: number;    // 0.2 (20%)
}

const DEFAULT_BACKOFF: BackoffConfig = {
  initialDelay: 1000,
  maxDelay: 60000,
  multiplier: 2,
  jitterFactor: 0.2
};

function calculateBackoff(attempt: number, config: BackoffConfig = DEFAULT_BACKOFF): number {
  // الحساب الأساسي
  let delay = config.initialDelay * Math.pow(config.multiplier, attempt);
  
  // الحد الأقصى
  delay = Math.min(delay, config.maxDelay);
  
  // إضافة Jitter لتجنب الـ thundering herd
  const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
  delay += jitter;
  
  return Math.round(delay);
}

// مثال الاستخدام
// attempt 0: 1000ms ± 200ms
// attempt 1: 2000ms ± 400ms
// attempt 2: 4000ms ± 800ms
// attempt 3: 8000ms ± 1600ms
// attempt 4+: 60000ms (cap)
```

### 2.2 Circuit Breaker Pattern
```typescript
enum CircuitState {
  CLOSED = 'closed',     // طبيعي
  OPEN = 'open',         // مفتوح (لا مزامنة)
  HALF_OPEN = 'half_open' // اختبار
}

class SyncCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailure: number = 0;
  
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIMEOUT = 30000; // 30 ثانية
  
  canAttempt(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
        
      case CircuitState.OPEN:
        if (Date.now() - this.lastFailure > this.RECOVERY_TIMEOUT) {
          this.state = CircuitState.HALF_OPEN;
          return true;
        }
        return false;
        
      case CircuitState.HALF_OPEN:
        return true;
    }
  }
  
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }
  
  recordFailure(): void {
    this.failureCount++;
    this.lastFailure = Date.now();
    
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.state = CircuitState.OPEN;
    }
  }
}
```

---

## 3. Integrity Checks والتحقق من السلامة

### 3.1 Checksum للبيانات
```typescript
import { createHash } from 'crypto';

function calculateChecksum(data: any): string {
  const json = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

// في Push request
interface PushChange {
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  checksum: string;  // التحقق من سلامة البيانات
  timestamp: number;
  deviceId: string;
}

// التحقق في السيرفر
function verifyPushChange(change: PushChange): boolean {
  const expectedChecksum = calculateChecksum(change.data);
  return expectedChecksum === change.checksum;
}
```

### 3.2 Replay Protection
```typescript
interface SyncNonce {
  deviceId: string;
  nonce: string;    // UUID فريد لكل طلب
  timestamp: number;
  signature: string;
}

class ReplayProtection {
  private processedNonces: Set<string> = new Set();
  private readonly NONCE_TTL = 5 * 60 * 1000; // 5 دقائق
  
  async validateNonce(nonce: SyncNonce): Promise<boolean> {
    // 1. فحص التوقيت
    if (Date.now() - nonce.timestamp > this.NONCE_TTL) {
      return false; // طلب قديم
    }
    
    // 2. فحص عدم التكرار
    const nonceKey = `${nonce.deviceId}:${nonce.nonce}`;
    if (this.processedNonces.has(nonceKey)) {
      return false; // تكرار
    }
    
    // 3. فحص التوقيع
    if (!await verifySignature(nonce)) {
      return false;
    }
    
    // تسجيل الـ nonce
    this.processedNonces.add(nonceKey);
    
    return true;
  }
}
```

### 3.3 Data Integrity Audit
```typescript
interface IntegrityReport {
  timestamp: number;
  localRecords: number;
  serverRecords: number;
  mismatches: IntegrityMismatch[];
  status: 'healthy' | 'degraded' | 'critical';
}

interface IntegrityMismatch {
  table: string;
  entityId: string;
  type: 'missing_local' | 'missing_remote' | 'data_mismatch';
  localVersion?: number;
  remoteVersion?: number;
}

async function runIntegrityAudit(tables: string[]): Promise<IntegrityReport> {
  const report: IntegrityReport = {
    timestamp: Date.now(),
    localRecords: 0,
    serverRecords: 0,
    mismatches: [],
    status: 'healthy'
  };
  
  for (const table of tables) {
    // جلب checksums من المحلي والسيرفر
    const localChecksums = await getLocalChecksums(table);
    const serverChecksums = await getServerChecksums(table);
    
    report.localRecords += localChecksums.size;
    report.serverRecords += serverChecksums.size;
    
    // المقارنة
    for (const [id, localHash] of localChecksums) {
      const serverHash = serverChecksums.get(id);
      
      if (!serverHash) {
        report.mismatches.push({
          table, entityId: id, type: 'missing_remote'
        });
      } else if (localHash !== serverHash) {
        report.mismatches.push({
          table, entityId: id, type: 'data_mismatch'
        });
      }
    }
    
    for (const [id] of serverChecksums) {
      if (!localChecksums.has(id)) {
        report.mismatches.push({
          table, entityId: id, type: 'missing_local'
        });
      }
    }
  }
  
  // تحديد الحالة
  const mismatchRate = report.mismatches.length / 
    Math.max(report.localRecords, report.serverRecords);
  
  if (mismatchRate > 0.1) {
    report.status = 'critical';
  } else if (mismatchRate > 0.01) {
    report.status = 'degraded';
  }
  
  return report;
}
```

---

## 4. Schema Versioning

### 4.1 إصدارات المخطط
```typescript
interface SchemaVersion {
  version: number;
  createdAt: string;
  migrations: Migration[];
}

interface Migration {
  from: number;
  to: number;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const CURRENT_SCHEMA_VERSION = 1;

const migrations: Migration[] = [
  {
    from: 0,
    to: 1,
    up: async () => {
      // إنشاء الجداول الأولية
      await db.projects.create();
      await db.workers.create();
      // ...
    },
    down: async () => {
      // حذف الجداول
      await db.drop();
    }
  },
  // إضافة migrations مستقبلية هنا
];
```

### 4.2 ترحيل البيانات
```typescript
class SchemaMigrator {
  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = CURRENT_SCHEMA_VERSION;
    
    if (currentVersion === targetVersion) {
      return; // لا حاجة للترحيل
    }
    
    // تشغيل الترحيلات المطلوبة
    const requiredMigrations = migrations.filter(m => 
      m.from >= currentVersion && m.to <= targetVersion
    );
    
    for (const migration of requiredMigrations) {
      try {
        await migration.up();
        await this.setVersion(migration.to);
      } catch (error) {
        // rollback
        await migration.down();
        throw error;
      }
    }
  }
}
```

---

## 5. سياسة التضارب المالي التفصيلية

### 5.1 قفل تفاؤلي (Optimistic Locking)
```typescript
interface FinancialEntity {
  id: string;
  amount: number;
  version: number;         // رقم الإصدار
  lockedBy?: string;       // معرف الجهاز القافل
  lockedAt?: number;       // وقت القفل
}

async function updateFinancialRecord(
  record: FinancialEntity,
  changes: Partial<FinancialEntity>
): Promise<UpdateResult> {
  // 1. التحقق من الإصدار
  const current = await db.findById(record.id);
  
  if (current.version !== record.version) {
    return {
      success: false,
      error: 'VERSION_CONFLICT',
      serverVersion: current.version,
      serverData: current
    };
  }
  
  // 2. التحديث مع زيادة الإصدار
  await db.update({
    ...record,
    ...changes,
    version: record.version + 1,
    updatedAt: Date.now()
  });
  
  return { success: true };
}
```

### 5.2 معالجة تضارب التحويلات المالية
```typescript
interface FinancialConflict {
  type: 'fund_transfer' | 'supplier_payment' | 'worker_payment';
  localRecord: FinancialEntity;
  serverRecord: FinancialEntity;
  resolution: 'pending' | 'local_wins' | 'server_wins' | 'manual';
}

async function handleFinancialConflict(
  conflict: FinancialConflict
): Promise<ResolutionResult> {
  // 1. حفظ التضارب للمراجعة اليدوية
  await db.conflicts.insert({
    ...conflict,
    createdAt: Date.now(),
    status: 'pending_review'
  });
  
  // 2. إشعار المستخدم
  await notifyUser({
    type: 'financial_conflict',
    title: 'تضارب في التحويل المالي',
    message: `يوجد تضارب في التحويل رقم ${conflict.localRecord.id}. يرجى المراجعة.`,
    action: 'review_conflict',
    data: conflict
  });
  
  // 3. عدم تطبيق أي تغيير حتى المراجعة
  return {
    resolution: 'pending',
    requiresAction: true
  };
}
```

### 5.3 واجهة حل التضارب
```typescript
interface ConflictResolutionUI {
  showConflict(conflict: FinancialConflict): void;
  getOptions(): ConflictOption[];
  applyResolution(option: ConflictOption): Promise<void>;
}

const CONFLICT_OPTIONS: ConflictOption[] = [
  {
    id: 'keep_local',
    label: 'الاحتفاظ بالنسخة المحلية',
    description: 'تجاهل التغييرات من السيرفر',
    risk: 'medium'
  },
  {
    id: 'keep_server',
    label: 'الاحتفاظ بنسخة السيرفر',
    description: 'تجاهل التغييرات المحلية',
    risk: 'medium'
  },
  {
    id: 'merge',
    label: 'دمج التغييرات',
    description: 'محاولة دمج البيانات (إذا أمكن)',
    risk: 'low'
  },
  {
    id: 'cancel_local',
    label: 'إلغاء العملية المحلية',
    description: 'حذف التغيير المحلي بالكامل',
    risk: 'high'
  }
];
```

---

## 6. سيناريوهات الانقطاع

### 6.1 الانقطاع أثناء الكتابة
```typescript
class AtomicWriter {
  async writeWithRecovery<T>(
    table: string,
    data: T,
    operation: 'create' | 'update' | 'delete'
  ): Promise<WriteResult> {
    const transactionId = generateTransactionId();
    
    try {
      // 1. كتابة في journal أولاً
      await this.writeJournal(transactionId, { table, data, operation });
      
      // 2. تنفيذ العملية
      await this.executeOperation(table, data, operation);
      
      // 3. تأكيد الكتابة
      await this.commitJournal(transactionId);
      
      return { success: true };
      
    } catch (error) {
      // rollback
      await this.rollbackJournal(transactionId);
      throw error;
    }
  }
  
  async recoverPendingWrites(): Promise<void> {
    // عند بدء التطبيق
    const pendingTransactions = await this.getPendingJournalEntries();
    
    for (const tx of pendingTransactions) {
      try {
        // إعادة تنفيذ العملية
        await this.executeOperation(tx.table, tx.data, tx.operation);
        await this.commitJournal(tx.id);
      } catch {
        await this.rollbackJournal(tx.id);
      }
    }
  }
}
```

### 6.2 الانقطاع أثناء المزامنة
```typescript
class SyncRecovery {
  async recoverPartialSync(sessionId: string): Promise<void> {
    const session = await this.getSyncSession(sessionId);
    
    if (!session) return;
    
    switch (session.phase) {
      case 'pushing':
        // استئناف Push من آخر نقطة
        await this.resumePush(session);
        break;
        
      case 'pulling':
        // إعادة Pull من آخر token
        await this.resumePull(session);
        break;
        
      case 'applying':
        // إعادة تطبيق التغييرات المحلية
        await this.reapplyChanges(session);
        break;
    }
  }
}
```

---

## 7. معايير القبول الإضافية

### 7.1 أداء المزامنة
| المعيار | الهدف | الحد الأقصى |
|---------|-------|-------------|
| مزامنة 50 سجل | < 1 ثانية | 2 ثانية |
| مزامنة 500 سجل | < 5 ثواني | 10 ثواني |
| استئناف بعد انقطاع | < 2 ثانية | 5 ثواني |
| Integrity audit | < 30 ثانية | 60 ثانية |

### 7.2 موثوقية البيانات
| المعيار | الهدف |
|---------|-------|
| عدم فقدان بيانات | 100% |
| حل تضارب تلقائي | 95%+ |
| استرداد من crash | 100% |
| سلامة البيانات | 99.99% |

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
