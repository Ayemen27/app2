# تقرير اختبار تطبيق Android
### التاريخ: 2026-03-18
### Axion v3.9.1

---

## النتيجة: ❌ لا يمكن بناء أو تشغيل التطبيق حالياً

---

## A. هل التطبيق يفتح بنجاح؟

**لا** — مشروع Android غير مكتمل ولا يمكن بناؤه (APK).

---

## B. تفاصيل المشكلة

مشروع Android الموجود يحتوي **ملف واحد فقط** (`android/app/build.gradle`). جميع الملفات الأساسية الأخرى ناقصة:

### ملفات مفقودة (8 عناصر حرجة):

| # | الملف/المجلد | الوظيفة | الحالة |
|---|-------------|---------|--------|
| 1 | `android/build.gradle` (root) | تعريف المشروع الرئيسي | ❌ مفقود |
| 2 | `android/settings.gradle` | ربط الـ modules | ❌ مفقود |
| 3 | `android/gradlew` + `android/gradle/` | Gradle wrapper للبناء | ❌ مفقود |
| 4 | `android/app/src/main/AndroidManifest.xml` | تعريف التطبيق والصلاحيات | ❌ مفقود |
| 5 | `android/app/src/main/java/.../MainActivity.java` | Activity الرئيسي (Capacitor WebView) | ❌ مفقود |
| 6 | `android/app/src/main/res/` | الموارد (icons, layouts, splash) | ❌ مفقود |
| 7 | `android/capacitor-android/` | مكتبة Capacitor المحلية | ❌ مفقود |
| 8 | `android/capacitor-cordova-android-plugins/` | ملحقات Cordova | ❌ مفقود |

### بيئة البناء:

| الأداة | الحالة |
|--------|--------|
| Java | ✅ OpenJDK 19.0.2 (GraalVM) |
| Android SDK | ❌ غير مثبت (`ANDROID_HOME` غير مُعرّف) |
| ADB | ❌ غير موجود |
| Android Emulator | ❌ غير موجود |
| Gradle | ❌ غير موجود |
| Capacitor CLI | ✅ v7.0.0 |

---

## C. ما الموجود وما حالته؟

### ✅ يعمل بشكل صحيح:

| العنصر | الحالة | ملاحظة |
|--------|--------|--------|
| `capacitor.config.json` | ✅ | `appId: com.axion.app`, `webDir: www` |
| `www/` (build output) | ✅ | 137 ملف، index.html + JS bundle (1.6MB) + CSS (230KB) |
| `www/index.html` | ✅ | صفحة SPA عربية RTL |
| `www/manifest.json` | ✅ | PWA manifest كامل |
| Capacitor plugins (npm) | ✅ | `@capacitor/android`, `app`, `device`, `filesystem`, `push-notifications`, `share` |
| Capacitor مُضمّن في JS bundle | ✅ | 3 مراجع في `index-DZ_mdpx-.js` |
| `android/app/build.gradle` | ⚠️ | موجود لكن بدون باقي ملفات المشروع |

### ⚠️ مشاكل في www/:

| المشكلة | التفاصيل |
|---------|----------|
| خط Cairo مفقود | `www/assets/` لا يحتوي Cairo-Variable.woff2 — رغم إصلاحه في الكود المصدري |
| Build قديم | التاريخ: Mar 12 — قبل إصلاحات Cairo و Supabase |

---

## D. الخطوات المطلوبة لتشغيل التطبيق

### الخيار 1: إعادة توليد مشروع Android عبر Capacitor (الموصى)

```bash
# 1. بناء الواجهة الأمامية
npm run build

# 2. نسخ الملفات إلى www/
npx cap copy android

# 3. توليد مشروع Android الكامل
npx cap add android

# 4. مزامنة plugins
npx cap sync android
```

هذا سيُنشئ تلقائياً:
- `android/build.gradle` (root)
- `android/settings.gradle`
- `android/gradlew` + `gradle/`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/axion/app/MainActivity.java`
- `android/app/src/main/res/` (icons, layouts)
- `android/capacitor-android/`

### الخيار 2: بناء APK (يتطلب Android SDK)

```bash
# بعد الخيار 1:
cd android
./gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

**ملاحظة:** Android SDK غير متوفر في بيئة Replit — البناء النهائي يحتاج بيئة محلية أو CI/CD.

---

## E. ملخص التقييم

| السؤال | الإجابة |
|--------|---------|
| هل التطبيق يفتح بنجاح؟ | ❌ لا يمكن بناؤه |
| أي crash أو exception في Logcat؟ | ⬜ غير قابل للاختبار |
| أي أخطاء WebView؟ | ⬜ غير قابل للاختبار |
| زمن تحميل الصفحة الأولى؟ | ⬜ غير قابل للاختبار |

**السبب:** مشروع Android غير مكتمل (ملف `build.gradle` فقط بدون باقي الهيكل) + بيئة Replit لا تحتوي Android SDK.

**التوصية:** تنفيذ `npx cap add android` لتوليد المشروع الكامل، ثم بناء الـ APK في بيئة تحتوي Android SDK (محلياً أو عبر GitHub Actions).
