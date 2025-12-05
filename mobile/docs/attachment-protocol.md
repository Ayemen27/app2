# بروتوكول المرفقات والوسائط

## 1. نظرة عامة

بروتوكول شامل لإدارة المرفقات (صور الفواتير، صور المشاريع، المستندات) مع دعم:
- ضغط تلقائي
- رفع مجزأ (Chunked Upload)
- استئناف الرفع
- التخزين المحلي المؤقت

---

## 2. حدود وقيود المرفقات

### 2.1 الحدود العامة
| القيد | القيمة | السبب |
|-------|--------|-------|
| حجم الصورة الأصلية | 20MB max | حدود الكاميرا |
| حجم الصورة المضغوطة | 500KB max | توفير البيانات |
| أبعاد الصورة المضغوطة | 1920x1920 max | جودة كافية |
| عدد المرفقات لكل كيان | 5 max | الأداء |
| إجمالي التخزين المحلي | 500MB | مساحة الجهاز |
| حجم الدفعة للرفع | 100KB chunks | استقرار الاتصال |

### 2.2 الصيغ المدعومة
| النوع | الصيغ | الاستخدام |
|-------|-------|----------|
| صور | JPEG, PNG, WebP, HEIC | الفواتير، المشاريع |
| مستندات | PDF | التقارير (مستقبلي) |
| ضغط الإخراج | WebP (Android 9+), JPEG | توفير المساحة |

---

## 3. خوارزمية ضغط الصور

### 3.1 التكوين
```typescript
interface CompressionConfig {
  maxWidth: number;       // 1920
  maxHeight: number;      // 1920
  quality: number;        // 0.8 (80%)
  outputFormat: 'webp' | 'jpeg';
  maxSizeKB: number;      // 500
  generateThumbnail: boolean;
  thumbnailSize: number;  // 200
}

const defaultConfig: CompressionConfig = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  outputFormat: 'webp',
  maxSizeKB: 500,
  generateThumbnail: true,
  thumbnailSize: 200
};
```

### 3.2 خوارزمية الضغط التكيفي
```typescript
async function compressImage(
  imageUri: string,
  config: CompressionConfig = defaultConfig
): Promise<CompressedImage> {
  let quality = config.quality;
  let compressed: Blob;
  
  // محاولة الضغط مع تقليل الجودة تدريجياً
  while (quality >= 0.3) {
    compressed = await imageCompression(imageUri, {
      maxWidthOrHeight: Math.max(config.maxWidth, config.maxHeight),
      quality,
      fileType: config.outputFormat === 'webp' ? 'image/webp' : 'image/jpeg'
    });
    
    if (compressed.size <= config.maxSizeKB * 1024) {
      break;
    }
    
    quality -= 0.1;
  }
  
  // إنشاء الصورة المصغرة
  let thumbnail: string | undefined;
  if (config.generateThumbnail) {
    thumbnail = await generateThumbnail(compressed, config.thumbnailSize);
  }
  
  return {
    blob: compressed,
    size: compressed.size,
    width: getImageWidth(compressed),
    height: getImageHeight(compressed),
    format: config.outputFormat,
    quality,
    thumbnail
  };
}
```

### 3.3 التحقق من الحجم النهائي
```typescript
async function validateAttachment(file: File): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // فحص الحجم
  if (file.size > 20 * 1024 * 1024) {
    errors.push('حجم الملف يتجاوز 20MB');
  }
  
  // فحص النوع
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('نوع الملف غير مدعوم');
  }
  
  // فحص الأبعاد (للصور)
  if (file.type.startsWith('image/')) {
    const dimensions = await getImageDimensions(file);
    if (dimensions.width < 100 || dimensions.height < 100) {
      errors.push('الصورة صغيرة جداً (الحد الأدنى 100x100)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 4. التخزين المحلي

### 4.1 هيكل المجلدات
```
/data/data/com.construction.manager/files/
├── attachments/
│   ├── pending/           # مرفقات تنتظر الرفع
│   │   └── {uuid}.webp
│   ├── uploaded/          # مرفقات تم رفعها
│   │   └── {uuid}.webp
│   └── thumbnails/        # صور مصغرة
│       └── {uuid}_thumb.webp
└── temp/                  # ملفات مؤقتة
    └── capture_{timestamp}.jpg
```

### 4.2 إدارة المساحة
```typescript
class AttachmentStorageManager {
  private readonly MAX_STORAGE_MB = 500;
  private readonly CLEANUP_THRESHOLD_MB = 400;
  
  async checkStorage(): Promise<StorageStatus> {
    const usedBytes = await this.calculateUsedSpace();
    const usedMB = usedBytes / (1024 * 1024);
    
    return {
      usedMB,
      maxMB: this.MAX_STORAGE_MB,
      percentage: (usedMB / this.MAX_STORAGE_MB) * 100,
      needsCleanup: usedMB > this.CLEANUP_THRESHOLD_MB
    };
  }
  
  async cleanup(): Promise<number> {
    let freedBytes = 0;
    
    // 1. حذف الملفات المؤقتة القديمة (> 24 ساعة)
    freedBytes += await this.deleteTempFiles(24 * 60 * 60 * 1000);
    
    // 2. حذف المرفقات المرفوعة القديمة (> 30 يوم)
    freedBytes += await this.deleteOldUploaded(30 * 24 * 60 * 60 * 1000);
    
    // 3. حذف thumbnails للمرفقات المحذوفة
    freedBytes += await this.cleanOrphanedThumbnails();
    
    return freedBytes;
  }
}
```

---

## 5. بروتوكول الرفع المجزأ

### 5.1 خوارزمية الرفع
```typescript
interface ChunkUploadConfig {
  chunkSize: number;        // 100KB
  maxRetries: number;       // 3
  retryDelay: number;       // 1000ms
  timeout: number;          // 30000ms
  concurrentChunks: number; // 1
}

interface UploadSession {
  sessionId: string;
  attachmentId: string;
  totalChunks: number;
  uploadedChunks: number[];
  startTime: number;
  lastChunkTime: number;
}

async function uploadAttachment(
  attachment: LocalAttachment,
  config: ChunkUploadConfig
): Promise<UploadResult> {
  // 1. إنشاء جلسة رفع
  const session = await createUploadSession(attachment);
  
  // 2. قراءة الملف كـ chunks
  const file = await readFile(attachment.localPath);
  const chunks = splitIntoChunks(file, config.chunkSize);
  
  // 3. رفع كل chunk
  for (let i = 0; i < chunks.length; i++) {
    // تخطي الـ chunks المرفوعة مسبقاً (للاستئناف)
    if (session.uploadedChunks.includes(i)) {
      continue;
    }
    
    await retryWithBackoff(
      () => uploadChunk(session.sessionId, i, chunks[i]),
      config.maxRetries,
      config.retryDelay
    );
    
    // تحديث الحالة
    await updateUploadProgress(session.sessionId, i);
  }
  
  // 4. تأكيد اكتمال الرفع
  const result = await completeUpload(session.sessionId);
  
  return result;
}
```

### 5.2 API للرفع المجزأ
```http
# إنشاء جلسة رفع
POST /api/attachments/upload/init
Content-Type: application/json
Authorization: Bearer <token>

{
  "fileName": "invoice_123.webp",
  "fileSize": 450000,
  "mimeType": "image/webp",
  "checksum": "sha256:abc123...",
  "entityType": "material_purchase",
  "entityId": "purchase-uuid"
}

Response:
{
  "sessionId": "upload-session-uuid",
  "chunkSize": 102400,
  "totalChunks": 5,
  "expiresAt": "2025-12-05T15:00:00Z"
}

# رفع chunk
PUT /api/attachments/upload/{sessionId}/chunks/{chunkIndex}
Content-Type: application/octet-stream
Authorization: Bearer <token>
Content-Length: 102400

<binary data>

Response:
{
  "chunkIndex": 0,
  "received": true,
  "checksum": "sha256:chunk123..."
}

# إكمال الرفع
POST /api/attachments/upload/{sessionId}/complete
Authorization: Bearer <token>

Response:
{
  "attachmentId": "attachment-uuid",
  "remotePath": "/uploads/2025/12/invoice_123.webp",
  "size": 450000,
  "url": "https://cdn.example.com/uploads/..."
}
```

### 5.3 استئناف الرفع
```typescript
async function resumeUpload(sessionId: string): Promise<UploadResult> {
  // جلب حالة الجلسة
  const session = await getUploadSession(sessionId);
  
  if (!session) {
    throw new Error('جلسة الرفع منتهية الصلاحية');
  }
  
  // معرفة الـ chunks المتبقية
  const missingChunks = [];
  for (let i = 0; i < session.totalChunks; i++) {
    if (!session.uploadedChunks.includes(i)) {
      missingChunks.push(i);
    }
  }
  
  if (missingChunks.length === 0) {
    // كل الـ chunks مرفوعة، فقط أكمل
    return await completeUpload(sessionId);
  }
  
  // قراءة الملف المحلي
  const file = await readFile(session.localPath);
  const chunks = splitIntoChunks(file, session.chunkSize);
  
  // رفع الـ chunks المتبقية فقط
  for (const index of missingChunks) {
    await uploadChunk(sessionId, index, chunks[index]);
  }
  
  return await completeUpload(sessionId);
}
```

---

## 6. معالجة الأخطاء

### 6.1 أنواع الأخطاء
```typescript
enum AttachmentError {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UPLOAD_TIMEOUT = 'UPLOAD_TIMEOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SERVER_ERROR = 'SERVER_ERROR',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH'
}

const errorMessages: Record<AttachmentError, string> = {
  FILE_TOO_LARGE: 'حجم الملف كبير جداً (الحد الأقصى 20MB)',
  UNSUPPORTED_FORMAT: 'صيغة الملف غير مدعومة',
  COMPRESSION_FAILED: 'فشل ضغط الصورة',
  STORAGE_FULL: 'مساحة التخزين ممتلئة',
  NETWORK_ERROR: 'خطأ في الاتصال',
  UPLOAD_TIMEOUT: 'انتهت مهلة الرفع',
  SESSION_EXPIRED: 'انتهت صلاحية جلسة الرفع',
  SERVER_ERROR: 'خطأ في السيرفر',
  CHECKSUM_MISMATCH: 'خطأ في التحقق من سلامة الملف'
};
```

### 6.2 إعادة المحاولة
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  baseDelay: number
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // لا تعيد المحاولة للأخطاء النهائية
      if (isFatalError(error)) {
        throw error;
      }
      
      // انتظار تصاعدي
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function isFatalError(error: any): boolean {
  const fatalErrors = [
    AttachmentError.FILE_TOO_LARGE,
    AttachmentError.UNSUPPORTED_FORMAT,
    AttachmentError.STORAGE_FULL,
    AttachmentError.CHECKSUM_MISMATCH
  ];
  
  return fatalErrors.includes(error.code);
}
```

---

## 7. مزامنة المرفقات

### 7.1 طابور رفع المرفقات
```typescript
interface AttachmentQueueItem {
  id: string;
  attachmentId: string;
  localPath: string;
  priority: number;
  retryCount: number;
  lastAttempt?: number;
  sessionId?: string;
  status: 'pending' | 'uploading' | 'paused' | 'failed';
}

class AttachmentUploadQueue {
  async processQueue(): Promise<void> {
    const pending = await this.getPending();
    
    for (const item of pending) {
      // تخطي العناصر التي فشلت كثيراً
      if (item.retryCount >= 5) {
        await this.markFailed(item.id);
        continue;
      }
      
      try {
        await this.markUploading(item.id);
        
        if (item.sessionId) {
          // استئناف رفع سابق
          await resumeUpload(item.sessionId);
        } else {
          // رفع جديد
          const attachment = await getAttachment(item.attachmentId);
          await uploadAttachment(attachment);
        }
        
        await this.markCompleted(item.id);
        
      } catch (error) {
        await this.handleError(item, error);
      }
    }
  }
}
```

### 7.2 الأولوية في الرفع
```typescript
// الأولويات (1 = الأعلى)
const UPLOAD_PRIORITIES = {
  FUND_TRANSFER: 1,      // التحويلات المالية أولاً
  MATERIAL_PURCHASE: 2,  // ثم المشتريات
  PROJECT_PHOTO: 3,      // ثم صور المشاريع
  OTHER: 5               // الباقي
};
```

---

## 8. معايير القبول

### 8.1 الأداء
| المعيار | الهدف | الحد الأقصى |
|---------|-------|-------------|
| وقت الضغط | < 2 ثانية | 5 ثواني |
| وقت رفع 500KB (4G) | < 5 ثواني | 15 ثانية |
| وقت رفع 500KB (3G) | < 15 ثانية | 30 ثانية |
| استئناف الرفع | < 3 ثواني | 10 ثواني |

### 8.2 الموثوقية
| المعيار | الهدف |
|---------|-------|
| نجاح الرفع (WiFi) | > 99% |
| نجاح الرفع (4G) | > 95% |
| نجاح الرفع (3G) | > 85% |
| استرداد بعد انقطاع | 100% |

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
