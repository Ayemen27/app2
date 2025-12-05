# ملحق الأمان والخصوصية - تطبيق إدارة مشاريع البناء

## 1. نموذج التهديدات (Threat Model)

### 1.1 الأصول المحمية
| الأصل | الحساسية | التأثير إذا تسرب |
|-------|----------|------------------|
| بيانات العمال | عالية | خصوصية، قانوني |
| التحويلات المالية | حرجة | مالي، قانوني |
| كلمات المرور | حرجة | اختراق الحساب |
| صور الفواتير | متوسطة | مالي |
| بيانات المشاريع | متوسطة | تنافسي |
| مواقع GPS | متوسطة | خصوصية |

### 1.2 التهديدات المحتملة

| التهديد | الاحتمالية | التأثير | التخفيف |
|---------|------------|--------|---------|
| فقدان الهاتف | عالية | حرج | تشفير + biometric |
| اعتراض الاتصال | متوسطة | عالي | TLS 1.3 + Certificate Pinning |
| هجوم MITM | منخفضة | حرج | Certificate Pinning |
| تسريب قاعدة البيانات | منخفضة | حرج | تشفير SQLite |
| Reverse Engineering | متوسطة | متوسط | ProGuard + obfuscation |
| حقن SQL | منخفضة | حرج | Parameterized queries |
| XSS | منخفضة | متوسط | Input sanitization |

### 1.3 سيناريو الهاتف المفقود
```
1. المستخدم يفقد هاتفه
2. المهاجم يحاول الوصول للتطبيق
3. خطوط الدفاع:
   - قفل الشاشة (OS level)
   - Biometric للتطبيق (App level)
   - تشفير SQLite (Data level)
   - Session timeout (Token level)
   - Remote wipe capability (Future)
```

---

## 2. تشفير البيانات المحلية

### 2.1 الحقول المشفرة
```typescript
const encryptedFields = {
  users: ['password', 'refreshToken'],
  fund_transfers: ['amount', 'senderName', 'transferNumber'],
  supplier_payments: ['amount', 'paymentDetails'],
  workers: ['nationalId', 'phone'],
  settings: ['authToken', 'deviceKey']
};
```

### 2.2 تقنية التشفير
```typescript
// SQLCipher للتشفير الكامل
import { CapacitorSQLite } from '@capacitor-community/sqlite';

const db = await CapacitorSQLite.createConnection({
  database: 'construction_db',
  encrypted: true,
  mode: 'secret',
  readonly: false,
  version: 1
});

// AES-256-GCM للحقول الفردية
import { AES } from 'crypto-js';

function encryptField(value: string, key: string): string {
  return AES.encrypt(value, key).toString();
}

function decryptField(encrypted: string, key: string): string {
  return AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
}
```

### 2.3 إدارة مفتاح التشفير
```typescript
// مفتاح مشتق من الجهاز + المستخدم
async function deriveEncryptionKey(): Promise<string> {
  const deviceId = await Device.getId();
  const userPin = await getSecureStoragePin();
  
  return pbkdf2(
    userPin,
    deviceId.identifier,
    { iterations: 100000, keyLength: 256 / 8 }
  );
}
```

---

## 3. المصادقة والجلسات

### 3.1 JWT Configuration
```typescript
const jwtConfig = {
  accessToken: {
    algorithm: 'RS256',
    expiresIn: '15m',
    issuer: 'construction-app'
  },
  refreshToken: {
    algorithm: 'RS256',
    expiresIn: '7d',
    issuer: 'construction-app'
  }
};
```

### 3.2 Biometric Authentication
```typescript
import { BiometricAuth } from '@capacitor-community/biometric-auth';

async function authenticateWithBiometric(): Promise<boolean> {
  const available = await BiometricAuth.isAvailable();
  
  if (!available.has) {
    return false;
  }
  
  try {
    await BiometricAuth.authenticate({
      reason: 'يرجى التحقق من هويتك',
      cancelTitle: 'إلغاء',
      allowDeviceCredential: true,
      iosFallbackTitle: 'استخدام كلمة المرور'
    });
    return true;
  } catch {
    return false;
  }
}
```

### 3.3 Session Management
```typescript
const sessionConfig = {
  idleTimeout: 5 * 60 * 1000,    // 5 دقائق
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 ساعات
  backgroundTimeout: 2 * 60 * 1000,    // 2 دقيقة في الخلفية
  refreshThreshold: 60 * 1000          // تجديد قبل انتهاء بدقيقة
};

class SessionManager {
  private lastActivity: number = Date.now();
  
  async checkSession(): Promise<boolean> {
    const now = Date.now();
    const idle = now - this.lastActivity;
    
    if (idle > sessionConfig.idleTimeout) {
      await this.requireReauth();
      return false;
    }
    
    if (this.tokenExpiresIn() < sessionConfig.refreshThreshold) {
      await this.refreshToken();
    }
    
    return true;
  }
  
  async handleAppBackground(): Promise<void> {
    this.backgroundStart = Date.now();
  }
  
  async handleAppForeground(): Promise<void> {
    const backgroundTime = Date.now() - this.backgroundStart;
    
    if (backgroundTime > sessionConfig.backgroundTimeout) {
      await this.requireReauth();
    }
  }
}
```

---

## 4. أمان الاتصال

### 4.1 TLS Configuration
```typescript
// Server-side (Express)
const httpsOptions = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':')
};
```

### 4.2 Certificate Pinning (اختياري)
```typescript
// android/app/src/main/res/xml/network_security_config.xml
/*
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config>
        <domain includeSubdomains="true">api.construction-app.com</domain>
        <pin-set expiration="2026-01-01">
            <pin digest="SHA-256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</pin>
            <pin digest="SHA-256">BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
*/
```

### 4.3 Request Signing
```typescript
async function signRequest(payload: any): Promise<string> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = JSON.stringify({ ...payload, timestamp, nonce });
  
  return hmacSHA256(message, await getRequestSigningKey());
}
```

---

## 5. إدارة الأسرار

### 5.1 أسرار البناء (Build-time)
```bash
# .env.production (لا ترفع للـ Git!)
API_BASE_URL=https://api.construction-app.com
SENTRY_DSN=https://xxx@sentry.io/xxx
FCM_SENDER_ID=123456789

# استخدام في CI/CD
# GitHub Actions secrets
# - ANDROID_KEYSTORE_BASE64
# - ANDROID_KEYSTORE_PASSWORD
# - FCM_SERVER_KEY
# - SENTRY_AUTH_TOKEN
```

### 5.2 أسرار التشغيل (Runtime)
```typescript
// استخدام Capacitor Preferences للتخزين الآمن
import { Preferences } from '@capacitor/preferences';

async function setSecureValue(key: string, value: string): Promise<void> {
  // التشفير قبل التخزين
  const encrypted = await encrypt(value);
  await Preferences.set({ key, value: encrypted });
}

async function getSecureValue(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  return decrypt(value);
}
```

### 5.3 ما لا يجب تخزينه
```typescript
// ❌ ممنوع
const NEVER_STORE = [
  'API keys في الكود',
  'Database passwords',
  'JWT secrets',
  'Encryption keys (hardcoded)',
  'OAuth client secrets'
];

// ✅ مسموح
const SAFE_TO_STORE = [
  'API base URL (public)',
  'App version',
  'Feature flags (public)',
  'Analytics IDs'
];
```

---

## 6. أذونات النظام

### 6.1 الأذونات المطلوبة
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### 6.2 طلب الأذونات
```typescript
async function requestCameraPermission(): Promise<boolean> {
  const status = await Camera.checkPermissions();
  
  if (status.camera === 'granted') {
    return true;
  }
  
  if (status.camera === 'denied') {
    // عرض رسالة توضيحية
    const confirmed = await showPermissionRationale(
      'الكاميرا',
      'نحتاج الكاميرا لتصوير الفواتير والمستندات'
    );
    
    if (!confirmed) {
      return false;
    }
  }
  
  const result = await Camera.requestPermissions();
  return result.camera === 'granted';
}
```

### 6.3 التعامل مع الرفض
```typescript
async function handlePermissionDenied(permission: string): Promise<void> {
  const alternatives = {
    camera: 'يمكنك اختيار صورة من المعرض بدلاً من التصوير',
    location: 'يمكنك إدخال الموقع يدوياً',
    storage: 'لن تتمكن من حفظ الملفات محلياً'
  };
  
  await showAlert({
    title: 'إذن مطلوب',
    message: alternatives[permission] || 'هذه الميزة تتطلب إذناً',
    buttons: [
      { text: 'موافق', role: 'cancel' },
      { 
        text: 'فتح الإعدادات', 
        handler: () => openAppSettings() 
      }
    ]
  });
}
```

---

## 7. مراقبة الأخطاء

### 7.1 Firebase Crashlytics
```typescript
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

async function initCrashlytics(): Promise<void> {
  await FirebaseCrashlytics.setEnabled({ enabled: true });
  
  // معلومات المستخدم (بدون بيانات حساسة)
  await FirebaseCrashlytics.setUserId({ userId: 'user-hash' });
  
  // معلومات إضافية
  await FirebaseCrashlytics.setCustomKey({
    key: 'app_version',
    value: APP_VERSION,
    type: 'string'
  });
}

// تسجيل أخطاء غير قاتلة
async function logError(error: Error, context?: object): Promise<void> {
  await FirebaseCrashlytics.recordException({
    message: error.message,
    stacktrace: error.stack
  });
  
  if (context) {
    await FirebaseCrashlytics.log({ message: JSON.stringify(context) });
  }
}
```

### 7.2 Firebase Analytics
```typescript
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

async function trackScreen(screenName: string): Promise<void> {
  await FirebaseAnalytics.setCurrentScreen({
    screenName,
    screenClassOverride: screenName
  });
}

async function trackEvent(name: string, params?: object): Promise<void> {
  await FirebaseAnalytics.logEvent({
    name,
    params
  });
}

// أحداث مهمة
const TRACKED_EVENTS = {
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  OFFLINE_ACTION: 'offline_action',
  CAMERA_USED: 'camera_used',
  GPS_USED: 'gps_used'
};
```

---

## 8. سياسة الخصوصية (GDPR/محلي)

### 8.1 البيانات المجمعة
| البيانات | الغرض | الاحتفاظ | المشاركة |
|----------|-------|----------|----------|
| الاسم والبريد | الحساب | طوال الاستخدام | لا |
| بيانات المشاريع | الخدمة | طوال الاستخدام | لا |
| بيانات العمال | الخدمة | طوال الاستخدام | لا |
| الموقع | ميزة اختيارية | مؤقت | لا |
| صور الفواتير | الخدمة | طوال الاستخدام | لا |
| Analytics | تحسين الخدمة | 26 شهر | Google |
| Crashes | إصلاح الأخطاء | 90 يوم | Firebase |

### 8.2 حقوق المستخدم
- ✅ حذف الحساب والبيانات
- ✅ تصدير البيانات
- ✅ تعديل البيانات
- ✅ إلغاء الموافقة
- ✅ طلب نسخة من البيانات

### 8.3 تنفيذ الحذف
```typescript
async function deleteUserData(userId: string): Promise<void> {
  // 1. حذف من الجهاز
  await localDb.deleteAllUserData(userId);
  await Preferences.clear();
  await clearLocalFiles();
  
  // 2. طلب حذف من السيرفر
  await api.delete(`/users/${userId}/data`);
  
  // 3. تسجيل الخروج
  await logout();
}
```

---

## 9. قائمة التحقق الأمني

### قبل الإطلاق
- [ ] تشفير SQLite مفعل
- [ ] TLS 1.3 فقط
- [ ] ProGuard مفعل
- [ ] لا توجد logs حساسة
- [ ] لا توجد أسرار في الكود
- [ ] Certificate Pinning (اختياري)
- [ ] Biometric متاح
- [ ] Session timeout مفعل
- [ ] Crashlytics مفعل
- [ ] سياسة الخصوصية منشورة

### مراجعة دورية
- [ ] تحديث الحزم الأمنية
- [ ] مراجعة الأذونات
- [ ] فحص الثغرات
- [ ] اختبار اختراق (سنوي)

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
