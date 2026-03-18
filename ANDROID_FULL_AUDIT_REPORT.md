# تقرير الفحص الشامل لتطبيق Android — AXION
### التاريخ: 2026-03-18
### السيرفر: 93.127.142.144 (app2.binarjoinanelytic.info)
### إصدار التطبيق: v1.0.29 | Capacitor 7.0.0 | Node.js v22

---

## ملخص تنفيذي

| # | البند | الحالة | الدرجة |
|---|-------|--------|--------|
| 1 | التثبيت والتوافق | 🟡 جاهز جزئياً | 60% |
| 2 | تسجيل الدخول والمصادقة | ✅ يعمل | 95% |
| 3 | الوصول إلى الإنترنت والخدمات | ✅ يعمل | 98% |
| 4 | إشعارات Push | 🟡 Backend جاهز — Android ناقص | 55% |
| 5 | قواعد البيانات المحلية | ✅ مُعدّ | 85% |
| 6 | الأداء واستهلاك الموارد | 🟡 مقبول مع تحفظات | 65% |
| 7 | توافق واجهة المستخدم | ✅ مُعدّ | 80% |
| 8 | الخدمات الخلفية | ✅ يعمل | 85% |
| 9 | التعامل مع الأخطاء | ✅ جيد | 90% |
| 10 | الأمان | 🟡 جيد مع ثغرات | 70% |

**الدرجة العامة: 78% — التطبيق يحتاج إصلاحات قبل النشر على Play Store**

---

## 1. التثبيت والتوافق (60%)

### ما هو جاهز:
| البند | القيمة | الحالة |
|-------|--------|--------|
| `compileSdk` | 35 (Android 15) | ✅ |
| `targetSdk` | 34 (Android 14) | ✅ |
| `minSdk` | 23 (Android 6.0) | ✅ يغطي ~97% من الأجهزة |
| `appId` | `com.axion.app` | ✅ |
| مشروع Capacitor | 7.0.0 | ✅ |
| Android SDK | مُثبت (`/opt/android-sdk`) | ✅ |
| Build Tools | 28.0.3, 34.0.0, 35.0.0 | ✅ |
| Platforms | android-21, 29, 34, 35, 36 | ✅ |
| Gradle | 8.11.1 | ✅ |
| Java | OpenJDK 21.0.10 | ✅ |
| `gradlew` | موجود + executable | ✅ |
| `AndroidManifest.xml` | موجود + RTL مفعّل | ✅ |
| `MainActivity.java` | موجود | ✅ |

### ما ينقص (لا يمكن بناء APK بدونه):

| البند | الحالة | الأثر |
|-------|--------|-------|
| `google-services.json` | ❌ **غير موجود** | لن تعمل Firebase/FCM |
| `axion-release.keystore` | ❌ **غير موجود** | لن يُنتج signed APK |
| `KEYSTORE_PASSWORD` env | ❌ غير مُعدّ | مطلوب للـ release build |
| www/ ↔ Android assets sync | ⚠️ **غير متزامن** | www = 165 ملف، Android = 145 ملف |
| Cairo font في Android | ❌ **غير موجود في assets** | الخط لن يظهر في التطبيق |
| Firebase CLI | ❌ غير مثبت | لن يعمل Test Lab من السيرفر |

### الإجراءات المطلوبة:
```bash
# 1. إنشاء google-services.json من Firebase Console
# Firebase Project: app2-eb4df

# 2. إنشاء keystore
cd /home/administrator/app2/android/app
keytool -genkey -v -keystore axion-release.keystore \
  -alias axion-key -keyalg RSA -keysize 2048 -validity 10000

# 3. مزامنة www → Android
cd /home/administrator/app2
npx cap sync android

# 4. تثبيت Firebase CLI
npm install -g firebase-tools
```

---

## 2. تسجيل الدخول والمصادقة (95%)

### طرق المصادقة المدعومة:

| الطريقة | الحالة | ملاحظة |
|---------|--------|--------|
| Email + Password | ✅ يعمل | الطريقة الرئيسية |
| Emergency Login | ✅ موجود | `/api/auth/emergency/login` |
| Google OAuth | ❌ غير موجود | لا يوجد كود OAuth |
| Facebook OAuth | ❌ غير موجود | لا يوجد كود OAuth |
| WebAuthn/Biometric | ✅ كود موجود | `client/src/lib/webauthn.ts` |

### اختبارات المصادقة (من داخل السيرفر):

| الاختبار | النتيجة | الزمن |
|---------|---------|-------|
| تسجيل دخول صحيح | ✅ Success + Token (404 chars) | 35ms |
| كلمة مرور خاطئة | ✅ `بيانات تسجيل الدخول غير صحيحة` | — |
| بيانات فارغة | ✅ `يرجى إدخال البريد الإلكتروني وكلمة المرور` | — |
| بدون token | ✅ 401 `NO_TOKEN` | — |
| Rate limiting | ✅ يُفعّل بعد 2-3 محاولات (429) | — |

### Session Binding:
- ✅ ربط الجلسة بالجهاز (platform + deviceHash + ipRange)
- ✅ حماية من سرقة Token بين المنصات
- ✅ `Capacitor/7.0.0` في User-Agent يُعرّف كـ `android`

### JWT Cookies:
- ✅ `accessToken` — JWT في Cookie
- ✅ `refreshToken` — HttpOnly Cookie
- ✅ Auto-refresh عند انتهاء الصلاحية

**ملاحظة:** لا يوجد تسجيل دخول عبر Google/Facebook. التطبيق يعتمد على Email فقط.

---

## 3. الوصول إلى الإنترنت والخدمات (98%)

### جميع الـ API endpoints (اختبار من localhost:6000):

| المسار | HTTP | الزمن | البيانات |
|--------|------|-------|----------|
| `/api/auth/me` | 200 | **35ms** | معلومات المستخدم |
| `/api/projects` | 200 | **36ms** | 7 مشاريع |
| `/api/workers` | 200 | **49ms** | 57 عامل |
| `/api/wells` | 200 | **112ms** | 81 بئر |
| `/api/notifications` | 200 | **90ms** | 50 إشعار |
| `/api/equipment` | 200 | **74ms** | 12 معدة |
| `/api/financial-summary` | 200 | **341ms** | ملخص مالي |
| `/api/worker-misc-expenses` | 200 | **57ms** | 311 مصروف |
| `/api/material-purchases` | 200 | **60ms** | 182 عملية |
| `/api/recent-activities` | 200 | **82ms** | 20 نشاط |
| `/api/inventory/stock` | 200 | **73ms** | 6 أصناف |
| `/api/preferences` | 200 | **63ms** | تفضيلات |
| `/api/permissions/my` | 200 | **63ms** | 7 صلاحيات |
| `/api/project-types` | 200 | **30ms** | 8 أنواع |
| `/api/autocomplete/materialNames` | 200 | **41ms** | 108 أسماء |
| `/api/central-logs` | 200 | **69ms** | 50 سجل |

**النتيجة: 16/16 endpoint — 0 أخطاء — متوسط الاستجابة 75ms**

### مقارنة الأداء الشبكي:

| المصدر | متوسط الزمن | السبب |
|--------|------------|-------|
| من داخل السيرفر (localhost) | **75ms** | لا latency |
| من Replit (عبر الإنترنت) | **1100ms** | ~900ms network roundtrip |
| من تطبيق Android (تقدير) | **150-500ms** | يعتمد على جودة الشبكة |

### CORS للتطبيق:
- ✅ `Access-Control-Allow-Origin: capacitor://localhost`
- ✅ `Access-Control-Allow-Credentials: true`
- ✅ جميع HTTP methods مدعومة
- ✅ Preflight caching 24 ساعة

---

## 4. إشعارات Push (55%)

### حالة Firebase:

| البند | الحالة |
|-------|--------|
| Firebase Project | ✅ `app2-eb4df` |
| `VITE_FIREBASE_APP_ID` | ✅ `1:364100399820:android:05fb7a9df8da1b771cc869` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ✅ مُعدّ في `.env` |
| `firebase-admin` npm | ✅ مثبت |
| Firebase Admin Init | ✅ `Firebase Admin Initialized Successfully` |
| `@capacitor/push-notifications` | ✅ مثبت |
| Frontend `capacitorPush.ts` | ✅ يطلب الصلاحيات + يسجل Token |
| Frontend `firebase.ts` | ✅ Firebase Web Messaging |
| Backend `FcmService.ts` | ✅ يحفظ + يرسل إشعارات |
| Service Worker `firebase-messaging-sw.js` | ⚠️ **placeholder** (apiKey = "placeholder") |

### ما ينقص:

| البند | الحالة | الأثر |
|-------|--------|-------|
| `google-services.json` | ❌ **غير موجود** في مجلد Android | التطبيق لن يتصل بـ Firebase على Android |
| firebase-messaging-sw.js | ⚠️ placeholder values | إشعارات الويب في الخلفية لن تعمل |

### ما يعمل حالياً:
- ✅ الإشعارات تُحفظ في قاعدة البيانات (50 إشعار موجود)
- ✅ Backend يُهيئ Firebase Admin بنجاح
- ✅ كود Android Push جاهز في `capacitorPush.ts`
- ❌ لا يمكن إرسال FCM للأندرويد بدون `google-services.json`

### الإصلاح:
1. تحميل `google-services.json` من Firebase Console → Project Settings → Android app
2. وضعه في `/home/administrator/app2/android/app/google-services.json`
3. تشغيل `npx cap sync android`

---

## 5. قواعد البيانات المحلية (85%)

### المحرك:
| المنصة | المحرك | Fallback |
|--------|--------|----------|
| Android/iOS | **SQLite** (عبر `native-db.ts`) | IndexedDB |
| Web | **IndexedDB** (عبر `idb` library) | — |

### البنية (IndexedDB Schema):
| الجدول | الوظيفة |
|--------|---------|
| `syncQueue` | طابور المزامنة (create/update/delete) |
| Store tables | نسخ محلية من بيانات السيرفر |

### المزامنة (Sync Engine):
| البند | التفاصيل |
|-------|----------|
| الآلية | **Leader Election** (tab واحد يزامن) |
| إعادة المحاولة | Exponential backoff (max 8 retries, max 60s delay) |
| حل النزاعات | **LWW** (Last Write Wins) مع conflict logging |
| Dead Letter Queue | العناصر الفاشلة تُنقل لـ DLQ بعد MAX_RETRIES |
| Status codes غير قابلة لإعادة المحاولة | 400, 401, 403, 404, 422 |
| Silent Sync | مزامنة صامتة في الخلفية |

### الوضع بدون إنترنت (Offline):
| البند | الحالة |
|-------|--------|
| Service Worker | ✅ `sw.js` — caching App Shell + API data |
| Cache version | `binarjoin-v6` |
| Offline page | ✅ `offline.html` موجودة |
| App Shell caching | ✅ `/`, `/offline.html`, `/manifest.json`, icons |
| API caching | ✅ `api-data-v2` cache |

### ملاحظة:
- ✅ الكود ناضج ومُعدّ للعمل offline
- ⚠️ على Android — SQLite يحتاج `@capacitor-community/sqlite` plugin (غير مؤكد وجوده)
- ✅ Fallback لـ IndexedDB إذا فشل SQLite

---

## 6. الأداء واستهلاك الموارد (65%)

### موارد السيرفر:

| المورد | القيمة | الحالة |
|--------|--------|--------|
| CPU | 2 cores | ✅ مقبول |
| RAM | 3.8GB (1.9GB مستخدم) | ✅ مقبول |
| Swap | 2GB (1.8GB مستخدم — **90%**) | 🔴 **حرج** |
| Disk | 63GB (57GB مستخدم — **95%**) | 🔴 **حرج** |
| Load Average | 0.19, 0.32, 0.40 | ✅ منخفض |

### التطبيق (PM2):

| البند | Instance 2 | Instance 3 |
|-------|-----------|-----------|
| الحالة | 🟢 online | 🟢 online |
| الذاكرة | **367 MB** | **370 MB** |
| CPU | 0-4% | 0-4% |
| إعادة التشغيل | 63 مرة | 63 مرة |
| Uptime | ~15 دقيقة | ~15 دقيقة |

### مشاكل الأداء:

| المشكلة | الخطورة | التفاصيل |
|---------|---------|----------|
| Swap 90% | 🔴 حرج | يُبطئ النظام بشكل عام |
| Disk 95% | 🔴 حرج | قد يتوقف النظام عن العمل |
| 63 restart | ⚠️ متوسط | عدد إعادة التشغيل مرتفع |
| BackupService DDL errors | ⚠️ متوسط | 50% من error log = `fk.columns.map is not a function` |
| financial-summary 341ms | ⚠️ خفيف | أبطأ endpoint (92 SQL query) |

### التوصيات العاجلة:
```bash
# 1. تنظيف القرص
sudo journalctl --vacuum-size=100M
sudo apt clean
find /var/log -name "*.gz" -delete

# 2. إيقاف Warp (يستهلك RAM/Swap)
sudo systemctl stop warp-svc
sudo systemctl disable warp-svc

# 3. مراقبة الذاكرة
pm2 monit
```

---

## 7. توافق واجهة المستخدم (80%)

### إعدادات الـ Viewport والـ Layout:

| البند | الحالة |
|-------|--------|
| `viewport meta` | ✅ `width=device-width, initial-scale=1.0` |
| `dir="rtl"` | ✅ مُفعّل في `<html>` |
| `lang="ar"` | ✅ |
| Cairo Variable Font | ✅ في `www/fonts/cairo/` (172KB) |
| Cairo في `www/index.html` | ❌ **لا يوجد reference** |
| منصة CSS | Tailwind CSS |
| Icon library | Lucide React |

### مشاكل UI:

| المشكلة | الخطورة | التفاصيل |
|---------|---------|----------|
| Cairo font غير مُرجع في index.html | ⚠️ متوسط | الملف موجود لكن لا يُحمّل في www |
| Cairo غير موجود في Android assets | 🔴 مرتفع | `cap sync` لم يُنفّذ بعد آخر تحديث |
| www/ غير متزامن مع Android | ⚠️ متوسط | 165 ملف www مقابل 145 في assets |

### AndroidManifest UI:
- ✅ `android:supportsRtl="true"` — يدعم RTL
- ✅ `configChanges` يشمل orientation و screenSize
- ✅ `singleTask` launch mode (مناسب لـ deep links)

### الإصلاح:
```bash
# مزامنة www → Android assets
cd /home/administrator/app2
npx cap sync android
# هذا سيحل مشكلة Cairo + جميع الملفات الناقصة
```

---

## 8. الخدمات الخلفية (85%)

### العمليات على السيرفر:

| العملية | الحالة | الوظيفة |
|---------|--------|---------|
| `construction-app` (PM2 × 2) | 🟢 يعمل | التطبيق الرئيسي |
| `pm2-administrator` (systemd) | 🟢 يعمل | إدارة العمليات |
| `warp-svc` (systemd) | 🟢 يعمل | Cloudflare Tunnel |
| `docker` (systemd) | 🟢 يعمل | حاويات (Ollama, etc) |
| `bolt` (PM2) | 🔴 متوقف | تطبيق ثانوي |
| Cron jobs | ❌ لا يوجد | لا يوجد مهام مجدولة |

### خدمات التطبيق الداخلية:

| الخدمة | الحالة | الملاحظة |
|--------|--------|---------|
| Sync Engine | ✅ كود جاهز | Leader election + exponential backoff |
| Silent Sync | ✅ كود جاهز | مزامنة صامتة في الخلفية |
| FCM Service | ✅ يعمل | Firebase Admin مُهيأ |
| Notification Service | ✅ يعمل | يحفظ + يُرسل |
| BackupService | ⚠️ خطأ DDL | `fk.columns.map is not a function` |
| ExpenseLedger | ✅ يعمل | 341ms (92 query) |
| WhatsApp Bot | ✅ كود موجود | AI agent integration |
| Ollama LLM | ✅ يعمل | llama3.2 + qwen2.5 |

### ملاحظات:
- لا يوجد Cron jobs (المزامنة تتم عبر Sync Engine في المتصفح)
- BackupService يملأ logs بأخطاء DDL لكن لا يؤثر على العمل
- PM2 cluster mode (2 instances) يوفر load balancing

---

## 9. التعامل مع الأخطاء (90%)

### اختبارات الأخطاء (من داخل السيرفر):

| الاختبار | HTTP | الرسالة | الحالة |
|---------|------|---------|--------|
| كلمة مرور خاطئة | 401 | `بيانات تسجيل الدخول غير صحيحة` | ✅ رسالة واضحة بالعربي |
| بيانات فارغة | 400 | `يرجى إدخال البريد الإلكتروني وكلمة المرور` | ✅ |
| بدون token | 401 | `غير مصرح لك بالوصول - لا يوجد رمز مصادقة` | ✅ |
| SQL Injection (`1;DROP TABLE`) | 200 | `تم جلب 0 مصروف` (**محمي**) | ✅ |
| XSS في المدخلات | 401 | يُعامل كبيانات خاطئة | ✅ |
| Payload كبير (50KB) | 401 | يُرفض بدون crash | ✅ |
| JSON غير صالح | 400 | `INTERNAL_SERVER_ERROR` | ⚠️ رسالة غير واضحة |
| مسار غير موجود | 404 | `المسار غير موجود: /api/does-not-exist` | ✅ |

### Frontend Error Handling:
- ✅ Auto-refresh للـ Token عند انتهاء الصلاحية
- ✅ Redirect لصفحة الدخول عند فشل الـ refresh
- ✅ `OFFLINE_MODE` error عند انقطاع الإنترنت
- ✅ حفظ العمليات في `syncQueue` عند عدم الاتصال

### نقطة ضعف واحدة:
- ⚠️ عند إرسال JSON غير صالح، الرسالة `INTERNAL_SERVER_ERROR` بدل رسالة أوضح مثل "JSON غير صالح"

---

## 10. الأمان (70%)

### ✅ نقاط القوة:

| البند | التفاصيل |
|-------|----------|
| HTTPS | ✅ Let's Encrypt — صالح حتى 28 أبريل 2026 |
| TLS | ✅ TLSv1.2 + TLSv1.3 فقط |
| Password Hashing | ✅ **bcrypt** (salt rounds مُعدّ) |
| Rate Limiting | ✅ يُفعّل بعد 2-3 محاولات (429) |
| Session Binding | ✅ ربط بالجهاز + المنصة + IP |
| CSP Header | ✅ شامل ومفصّل |
| HSTS | ✅ `max-age=31536000; includeSubDomains` |
| X-Frame-Options | ✅ `DENY` |
| X-Content-Type-Options | ✅ `nosniff` |
| X-XSS-Protection | ✅ `1; mode=block` |
| Referrer-Policy | ✅ `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ `geolocation=(), microphone=(), camera=()` |
| SQL Injection | ✅ محمي (Drizzle ORM + parameterized queries) |
| JWT Cookies | ✅ HttpOnly + SameSite=Lax |

### 🔴 ثغرات أمنية:

| الثغرة | الخطورة | التفاصيل |
|--------|---------|----------|
| **PostgreSQL مفتوح للعالم** | 🔴 حرج | `host all all 0.0.0.0/0 md5` — أي IP يمكنه المحاولة |
| **MySQL مفتوح للعالم** | 🔴 حرج | port 3306 listening على `0.0.0.0` |
| **n8n port 5678 مفتوح** | ⚠️ متوسط | يمكن الوصول من الخارج |
| **Port 8085 مفتوح** | ⚠️ متوسط | خدمة غير معروفة مكشوفة |
| **server_tokens لم يُعطّل** | ⚠️ خفيف | Nginx يكشف رقم الإصدار |
| **Firebase SW placeholder** | ⚠️ خفيف | `firebase-messaging-sw.js` بقيم وهمية |

### المنافذ المفتوحة:

| المنفذ | الخدمة | الوصول | الحالة |
|--------|--------|--------|--------|
| 22 | SSH | 0.0.0.0 | ✅ مطلوب |
| 80 | HTTP (redirect) | 0.0.0.0 | ✅ مطلوب |
| 443 | HTTPS (Nginx) | 0.0.0.0 | ✅ مطلوب |
| 6000 | Node.js App | 0.0.0.0 | ⚠️ يجب أن يكون 127.0.0.1 |
| **5432** | **PostgreSQL** | **0.0.0.0** | 🔴 **يجب إغلاقه** |
| **3306** | **MySQL** | **0.0.0.0** | 🔴 **يجب إغلاقه** |
| **5678** | **n8n** | **0.0.0.0** | 🔴 **يجب إغلاقه** |
| **8085** | **Unknown** | **0.0.0.0** | ⚠️ **يجب فحصه** |
| 11434 | Ollama | 127.0.0.1 | ✅ محلي فقط |
| 27017 | MongoDB | 127.0.0.1 | ✅ محلي فقط |
| 33060 | MySQL X Protocol | 127.0.0.1 | ✅ محلي فقط |

### الإصلاحات الأمنية العاجلة:
```bash
# 1. إغلاق PostgreSQL للعالم الخارجي
sudo sed -i '/0.0.0.0\/0/d' /etc/postgresql/*/main/pg_hba.conf
sudo systemctl reload postgresql

# 2. ربط PostgreSQL بـ localhost فقط
# في postgresql.conf: listen_addresses = 'localhost'

# 3. إغلاق MySQL
sudo ufw deny 3306
sudo ufw deny 5678
sudo ufw deny 8085

# 4. إخفاء Nginx version
# في nginx.conf: server_tokens off;
```

---

## خطة Firebase Test Lab

### المتطلبات قبل التشغيل:

| # | المهمة | الحالة | الأولوية |
|---|--------|--------|---------|
| 1 | إنشاء `google-services.json` من Firebase Console | ❌ لم يُنفذ | 🔴 |
| 2 | إنشاء Keystore للتوقيع | ❌ لم يُنفذ | 🔴 |
| 3 | مزامنة `npx cap sync android` | ❌ لم يُنفذ | 🔴 |
| 4 | تثبيت Firebase CLI | ❌ لم يُنفذ | 🔴 |
| 5 | بناء APK (`./gradlew assembleDebug`) | ❌ لم يُنفذ | 🔴 |
| 6 | رفع APK إلى Test Lab | ❌ لم يُنفذ | ⬜ |

### تقدير الوقت:
- الخطوات 1-5: **~30 دقيقة** (يدوية + بناء)
- الخطوة 6: **~5 دقائق** رفع + **15-30 دقيقة** اختبار Robo

### ما يمكن اختباره في Test Lab:

| الاختبار | نوع Test Lab | يغطي السؤال # |
|---------|-------------|---------------|
| التثبيت على أجهزة مختلفة | Robo Test (تلقائي) | 1 |
| تسجيل الدخول | Instrumentation Test | 2 |
| تحميل البيانات من API | Robo Test | 3 |
| الإشعارات | يحتاج Instrumentation | 4 |
| حفظ بيانات محلية | Instrumentation Test | 5 |
| CPU/Memory metrics | تلقائي مع كل اختبار | 6 |
| UI على أحجام مختلفة | Robo Test | 7 |
| Sync/Jobs | Instrumentation Test | 8 |
| Crash reports | تلقائي مع كل اختبار | 9 |
| Security scanning | Crashlytics + تلقائي | 10 |

---

## ملخص الإجراءات حسب الأولوية

### 🔴 عاجل (قبل أي بناء):

| # | الإجراء | السبب |
|---|--------|-------|
| 1 | تنزيل `google-services.json` من Firebase Console | مطلوب لـ Firebase + FCM |
| 2 | إغلاق PostgreSQL/MySQL للعالم الخارجي | **ثغرة أمنية حرجة** |
| 3 | تنظيف القرص (95% ممتلئ) | قد يتوقف النظام |
| 4 | إنشاء release keystore | مطلوب لـ signed APK |

### 🟡 مهم (قبل النشر):

| # | الإجراء | السبب |
|---|--------|-------|
| 5 | `npx cap sync android` | مزامنة www + Cairo font |
| 6 | تثبيت Firebase CLI | مطلوب لـ Test Lab |
| 7 | إيقاف Warp (Swap 90%) | تحسين أداء السيرفر |
| 8 | إصلاح `firebase-messaging-sw.js` | إشعارات الويب في الخلفية |
| 9 | إغلاق ports 5678, 8085 | أمان |

### 🟢 تحسينات:

| # | الإجراء | السبب |
|---|--------|-------|
| 10 | `server_tokens off` في Nginx | إخفاء الإصدار |
| 11 | إضافة Google/Facebook OAuth | طلب المستخدم |
| 12 | تحسين financial-summary (92 query) | أداء |
| 13 | إصلاح BackupService DDL error | تنظيف logs |
| 14 | كتابة Instrumentation Tests | للاختبار الآلي المتقدم |
