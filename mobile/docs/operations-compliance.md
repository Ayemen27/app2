# خطة التشغيل والامتثال

## 1. Firebase Crashlytics & Analytics

### 1.1 إعداد Firebase

```bash
# 1. إنشاء مشروع Firebase
# https://console.firebase.google.com

# 2. تثبيت الحزم
npm install @capacitor-firebase/crashlytics @capacitor-firebase/analytics

# 3. تنزيل google-services.json
# وضعه في android/app/google-services.json
```

### 1.2 التكوين

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  plugins: {
    FirebaseCrashlytics: {
      enabled: true
    },
    FirebaseAnalytics: {
      enabled: true
    }
  }
};
```

```groovy
// android/app/build.gradle
dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-crashlytics'
    implementation 'com.google.firebase:firebase-analytics'
}

apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.crashlytics'
```

### 1.3 التهيئة في الكود

```typescript
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

async function initFirebase(): Promise<void> {
  // Crashlytics
  await FirebaseCrashlytics.setEnabled({ enabled: true });
  await FirebaseCrashlytics.setUserId({ userId: hashUserId(currentUser.id) });
  await FirebaseCrashlytics.setCustomKey({ key: 'app_version', value: APP_VERSION, type: 'string' });
  await FirebaseCrashlytics.setCustomKey({ key: 'device_type', value: getDeviceType(), type: 'string' });
  
  // Analytics
  await FirebaseAnalytics.setEnabled({ enabled: true });
  await FirebaseAnalytics.setUserId({ userId: hashUserId(currentUser.id) });
  await FirebaseAnalytics.setUserProperty({ key: 'user_role', value: currentUser.role });
}

// تسجيل الأخطاء
async function logError(error: Error, context?: Record<string, any>): Promise<void> {
  await FirebaseCrashlytics.log({ message: `Error: ${error.message}` });
  
  if (context) {
    await FirebaseCrashlytics.log({ message: `Context: ${JSON.stringify(context)}` });
  }
  
  await FirebaseCrashlytics.recordException({
    message: error.message,
    stacktrace: error.stack
  });
}

// تتبع الشاشات
async function trackScreen(screenName: string): Promise<void> {
  await FirebaseAnalytics.setCurrentScreen({
    screenName,
    screenClassOverride: screenName
  });
}

// تتبع الأحداث
async function trackEvent(name: string, params?: Record<string, any>): Promise<void> {
  await FirebaseAnalytics.logEvent({ name, params });
}
```

### 1.4 الأحداث المتتبعة

```typescript
const TRACKED_EVENTS = {
  // المصادقة
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  
  // المزامنة
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  SYNC_CONFLICT: 'sync_conflict',
  
  // Offline
  WENT_OFFLINE: 'went_offline',
  WENT_ONLINE: 'went_online',
  OFFLINE_ACTION: 'offline_action',
  
  // المرفقات
  PHOTO_CAPTURED: 'photo_captured',
  UPLOAD_STARTED: 'upload_started',
  UPLOAD_COMPLETED: 'upload_completed',
  UPLOAD_FAILED: 'upload_failed',
  
  // الأعمال
  PROJECT_CREATED: 'project_created',
  WORKER_ADDED: 'worker_added',
  ATTENDANCE_RECORDED: 'attendance_recorded',
  EXPENSE_ADDED: 'expense_added',
  TRANSFER_CREATED: 'transfer_created'
};
```

---

## 2. إدارة الأسرار في CI/CD

### 2.1 GitHub Actions Secrets

```yaml
# المطلوب إضافتها في GitHub Repository Settings > Secrets
secrets:
  # التوقيع
  ANDROID_KEYSTORE_BASE64: <base64 encoded keystore file>
  ANDROID_KEYSTORE_PASSWORD: <keystore password>
  ANDROID_KEY_ALIAS: <key alias>
  ANDROID_KEY_PASSWORD: <key password>
  
  # Firebase
  GOOGLE_SERVICES_JSON: <base64 encoded google-services.json>
  FIREBASE_TOKEN: <firebase CLI token>
  
  # API
  API_BASE_URL: https://api.construction-app.com
  
  # Play Store
  PLAY_STORE_SERVICE_ACCOUNT_JSON: <base64 encoded service account>
```

### 2.2 GitHub Actions Workflow

```yaml
# .github/workflows/android-build.yml
name: Android Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          
      - name: Install dependencies
        run: |
          cd mobile/app
          npm ci
          
      - name: Decode Keystore
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > mobile/app/android/app/release.keystore
          
      - name: Decode google-services.json
        run: |
          echo "${{ secrets.GOOGLE_SERVICES_JSON }}" | base64 -d > mobile/app/android/app/google-services.json
          
      - name: Build Web
        run: |
          cd mobile/app
          npm run build
          
      - name: Sync Capacitor
        run: |
          cd mobile/app
          npx cap sync android
          
      - name: Build APK
        run: |
          cd mobile/app/android
          ./gradlew assembleRelease
        env:
          KEYSTORE_PATH: app/release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: mobile/app/android/app/build/outputs/apk/release/app-release.apk
```

### 2.3 متغيرات البيئة المحلية

```bash
# mobile/app/.env.local (لا ترفع للـ Git!)
API_BASE_URL=http://localhost:5000
ENVIRONMENT=development

# mobile/app/.env.production
API_BASE_URL=https://api.construction-app.com
ENVIRONMENT=production
```

```typescript
// استخدام المتغيرات
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  environment: import.meta.env.VITE_ENVIRONMENT
};
```

---

## 3. سياسة الخصوصية

### 3.1 رابط السياسة

```
URL: https://construction-app.com/privacy-policy
أو
URL: https://sites.google.com/view/construction-app-privacy
```

### 3.2 محتوى السياسة (ملخص)

```markdown
# سياسة الخصوصية - تطبيق إدارة مشاريع البناء

آخر تحديث: ديسمبر 2025

## البيانات التي نجمعها
1. بيانات الحساب: الاسم، البريد الإلكتروني
2. بيانات العمل: المشاريع، العمال، المصروفات
3. بيانات الموقع: عند استخدام GPS (اختياري)
4. صور الفواتير: عند التصوير (اختياري)

## كيف نستخدم البيانات
- تقديم خدمات إدارة المشاريع
- مزامنة البيانات بين الأجهزة
- تحسين أداء التطبيق

## مشاركة البيانات
- لا نبيع بياناتك
- لا نشاركها مع أطراف ثالثة إلا:
  - بموافقتك
  - للامتثال القانوني

## تخزين البيانات
- البيانات مشفرة أثناء النقل (HTTPS)
- البيانات المحلية مشفرة
- السيرفرات في [الموقع]

## حقوقك
- حذف حسابك
- تصدير بياناتك
- تعديل معلوماتك

## التواصل
البريد: privacy@construction-app.com
```

### 3.3 موافقة المستخدم

```typescript
// عند أول تشغيل
async function showPrivacyConsent(): Promise<boolean> {
  const hasConsented = await getStoredConsent();
  
  if (hasConsented) {
    return true;
  }
  
  const result = await showDialog({
    title: 'سياسة الخصوصية',
    message: 'يرجى قراءة والموافقة على سياسة الخصوصية للمتابعة.',
    buttons: [
      { text: 'قراءة السياسة', handler: () => openPrivacyPolicy() },
      { text: 'أوافق', role: 'accept' },
      { text: 'أرفض', role: 'cancel' }
    ]
  });
  
  if (result.role === 'accept') {
    await storeConsent(true);
    return true;
  }
  
  return false;
}
```

---

## 4. أصول Play Store

### 4.1 قائمة الأصول المطلوبة

| الأصل | المواصفات | الحالة |
|-------|-----------|--------|
| أيقونة التطبيق | 512x512 PNG, 32-bit | ⬜ |
| Feature Graphic | 1024x500 PNG/JPEG | ⬜ |
| لقطات هاتف | 2-8 صور، 16:9 أو 9:16 | ⬜ |
| لقطات تابلت 7" | 2-8 صور (اختياري) | ⬜ |
| لقطات تابلت 10" | 2-8 صور (اختياري) | ⬜ |
| فيديو ترويجي | YouTube URL (اختياري) | ⬜ |

### 4.2 الوصف

```yaml
# الوصف القصير (80 حرف)
ar: "تطبيق إدارة مشاريع البناء - يعمل بدون إنترنت مع مزامنة ذكية"
en: "Construction Project Management - Works offline with smart sync"

# الوصف الكامل (4000 حرف)
ar: |
  تطبيق إدارة مشاريع البناء الاحترافي
  
  ✅ يعمل بدون إنترنت بالكامل
  ✅ مزامنة ذكية عند الاتصال
  ✅ واجهة عربية كاملة
  
  المميزات:
  • إدارة المشاريع والميزانيات
  • تسجيل حضور العمال
  • تتبع المصروفات اليومية
  • إدارة الموردين والمشتريات
  • تصوير الفواتير وإرفاقها
  • تقارير مالية شاملة
  
  مثالي لـ:
  • شركات المقاولات
  • مدراء المشاريع
  • المهندسين الميدانيين
  • المحاسبين
```

### 4.3 معلومات التطبيق

```yaml
category: Business
content_rating: Everyone
target_audience: 18+
countries: All
languages: Arabic, English
```

---

## 5. الموارد والأدوار

### 5.1 فريق العمل

| الدور | العدد | المسؤوليات |
|-------|-------|------------|
| مطور Mobile Lead | 1 | معمارية، كود أساسي، مراجعة |
| مطور Mobile | 1-2 | الشاشات، الميزات |
| مطور Backend | 1 | Sync API، الصيانة |
| QA Engineer | 1 | اختبار، أتمتة |
| UI/UX Designer | 0.5 | أصول، تحسينات |
| DevOps | 0.5 | CI/CD، النشر |

### 5.2 المسار الحرج

```
المرحلة 0 (أسبوع 1):
├── [حرج] إعداد Capacitor + Android Studio
├── [حرج] إعداد RxDB + SQLite
└── [حرج] أول APK تجريبي

المرحلة 1 (أسبوع 2-3):
├── [حرج] شاشات المشاريع والعمال
├── [حرج] شاشة الحضور
└── [عادي] UI Polish

المرحلة 2 (أسبوع 4-5):
├── [حرج] Sync Engine
├── [حرج] Conflict Resolution
└── [حرج] Sync API (Backend)

المرحلة 3 (أسبوع 6-7):
├── [حرج] الكاميرا + الضغط
├── [عادي] GPS
└── [عادي] Push Notifications

المرحلة 4 (أسبوع 8-10):
├── [حرج] اختبار ميداني
├── [حرج] إصلاح الأخطاء
├── [حرج] Play Store submission
└── [عادي] Monitoring setup
```

### 5.3 سجل المخاطر

| المخاطر | الاحتمالية | التأثير | التخفيف |
|---------|------------|--------|---------|
| تأخر في Sync Engine | عالية | عالي | بدء مبكر، prototype |
| مشاكل توافق Android | متوسطة | متوسط | اختبار على أجهزة متعددة مبكراً |
| رفض Play Store | منخفضة | عالي | مراجعة السياسات قبل الإرسال |
| أداء ضعيف | متوسطة | عالي | قياس مستمر، تحسين تدريجي |
| تضارب بيانات معقد | عالية | عالي | استراتيجيات حل متعددة، اختبار مكثف |
| استهلاك بطارية | متوسطة | متوسط | تحسين دورة المزامنة |

---

## 6. معايير القبول الموسعة

### 6.1 UX/Conflict Handling

| المعيار | القبول |
|---------|--------|
| عرض التضارب للمستخدم | رسالة واضحة + خيارات |
| وقت حل التضارب اليدوي | < 3 نقرات |
| إشعار عند وجود تضارب | فوري |
| حفظ قرار الحل | مع سجل للمراجعة |

### 6.2 Media Upload SLAs

| المعيار | الهدف | الحد الأقصى |
|---------|-------|-------------|
| نجاح الرفع (WiFi) | 99% | 95% |
| نجاح الرفع (4G) | 95% | 90% |
| زمن رفع 500KB (WiFi) | 3 ثواني | 10 ثواني |
| زمن رفع 500KB (4G) | 8 ثواني | 20 ثانية |
| استئناف بعد انقطاع | 100% | 100% |

### 6.3 Permissions/Consent UX

| المعيار | القبول |
|---------|--------|
| شرح سبب الإذن | قبل الطلب |
| التعامل مع الرفض | بديل + توجيه للإعدادات |
| موافقة الخصوصية | قبل الاستخدام الأول |
| إمكانية سحب الموافقة | متاحة في الإعدادات |

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
