# خطة النشر على Google Play - تطبيق إدارة مشاريع البناء

## 1. متطلبات Google Play

### 1.1 متطلبات الحساب
- [ ] حساب مطور Google Play ($25 رسوم لمرة واحدة)
- [ ] التحقق من الهوية
- [ ] عنوان فعلي للنشاط التجاري
- [ ] بريد إلكتروني للدعم

### 1.2 متطلبات التطبيق
| المتطلب | الحالة | ملاحظات |
|---------|--------|---------|
| اسم التطبيق بالعربية | ⬜ | إدارة مشاريع البناء |
| اسم التطبيق بالإنجليزية | ⬜ | Construction Project Manager |
| وصف قصير (80 حرف) | ⬜ | |
| وصف كامل (4000 حرف) | ⬜ | |
| أيقونة التطبيق (512x512) | ⬜ | PNG, 32-bit |
| Feature Graphic (1024x500) | ⬜ | |
| لقطات شاشة (8 على الأقل) | ⬜ | Phone + Tablet |
| سياسة الخصوصية | ⬜ | رابط URL |
| تصنيف المحتوى | ⬜ | استبيان IARC |

---

## 2. إعداد التوقيع (App Signing)

### 2.1 إنشاء Keystore
```bash
# إنشاء keystore جديد
keytool -genkey -v \
  -keystore construction-app-release.keystore \
  -alias construction-app \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass [SECURE_PASSWORD] \
  -keypass [SECURE_PASSWORD] \
  -dname "CN=Construction App, OU=Mobile, O=Company, L=Riyadh, ST=Riyadh, C=SA"
```

### 2.2 Play App Signing
- [ ] تفعيل Google Play App Signing
- [ ] رفع Upload Key Certificate
- [ ] حفظ Keystore في مكان آمن (غير المستودع!)

### 2.3 متغيرات البيئة للـ CI/CD
```env
ANDROID_KEYSTORE_BASE64=<base64 encoded keystore>
ANDROID_KEYSTORE_PASSWORD=<password>
ANDROID_KEY_ALIAS=construction-app
ANDROID_KEY_PASSWORD=<password>
```

---

## 3. بناء التطبيق للإنتاج

### 3.1 Capacitor Build
```bash
# 1. بناء الويب
cd mobile/app
npm run build

# 2. نسخ للـ Android
npx cap sync android

# 3. فتح Android Studio
npx cap open android
```

### 3.2 Gradle Build (Release)
```bash
cd mobile/app/android

# بناء APK
./gradlew assembleRelease

# أو بناء AAB (مطلوب لـ Play Store)
./gradlew bundleRelease

# الملف الناتج
# app/build/outputs/bundle/release/app-release.aab
```

### 3.3 Gradle Configuration
```groovy
// android/app/build.gradle
android {
    defaultConfig {
        applicationId "com.company.construction"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 4. سياسة الخصوصية

### 4.1 البيانات المجمعة
```markdown
# سياسة الخصوصية - تطبيق إدارة مشاريع البناء

## البيانات التي نجمعها
1. **بيانات الحساب**: الاسم، البريد الإلكتروني، كلمة المرور (مشفرة)
2. **بيانات المشاريع**: أسماء المشاريع، المواقع، الميزانيات
3. **بيانات العمال**: الأسماء، الحضور، الرواتب
4. **بيانات الموقع**: عند استخدام GPS (اختياري)
5. **الصور**: صور الفواتير والمشاريع (اختياري)

## كيف نستخدم البيانات
- تقديم خدمات إدارة المشاريع
- مزامنة البيانات بين الأجهزة
- إرسال إشعارات مهمة

## مشاركة البيانات
- لا نبيع بياناتك لأطراف ثالثة
- لا نشارك بياناتك إلا بموافقتك

## الأمان
- تشفير البيانات أثناء النقل (HTTPS)
- تشفير البيانات المحلية
- حماية بكلمة مرور

## حقوقك
- حذف حسابك وبياناتك
- تصدير بياناتك
- تعديل معلوماتك

## التواصل
support@company.com
```

---

## 5. مراحل النشر

### 5.1 Internal Testing (أسبوع 1)
- [ ] رفع أول AAB
- [ ] إضافة 5-10 مختبرين داخليين
- [ ] اختبار جميع الوظائف الأساسية
- [ ] جمع التعليقات

### 5.2 Closed Testing (أسبوع 2)
- [ ] إصلاح الأخطاء من Internal
- [ ] توسيع لـ 50-100 مختبر
- [ ] اختبار على أجهزة مختلفة
- [ ] مراقبة Crashlytics

### 5.3 Open Testing (أسبوع 3)
- [ ] نشر للجميع (Beta)
- [ ] جمع تقييمات ومراجعات
- [ ] مراقبة الأداء والأعطال

### 5.4 Production Release (أسبوع 4)
- [ ] إصلاح جميع الأخطاء الحرجة
- [ ] نشر تدريجي (Staged Rollout)
  - 5% → 20% → 50% → 100%
- [ ] مراقبة مستمرة

---

## 6. استبيان تصنيف المحتوى (IARC)

### 6.1 الإجابات المتوقعة
| السؤال | الإجابة |
|--------|---------|
| هل يحتوي على عنف؟ | لا |
| هل يحتوي على محتوى جنسي؟ | لا |
| هل يحتوي على مقامرة؟ | لا |
| هل يجمع بيانات شخصية؟ | نعم |
| هل يحتوي على إعلانات؟ | لا |
| هل يسمح بالتفاعل بين المستخدمين؟ | لا |
| هل يحتوي على مشتريات داخلية؟ | لا |

### 6.2 التصنيف المتوقع
- **PEGI**: 3+
- **ESRB**: Everyone
- **IARC**: 3+

---

## 7. متطلبات Data Safety

### 7.1 إعلان البيانات
```yaml
Data collected:
  Personal info:
    - Name: Required for account
    - Email: Required for account
  Financial info:
    - Purchase history: For expense tracking
  Location:
    - Approximate: Optional, for project sites
  Photos:
    - Photos: Optional, for invoices

Data shared:
  - None shared with third parties

Security practices:
  - Data encrypted in transit
  - Data encrypted at rest
  - Deletion available on request
```

---

## 8. Firebase Setup

### 8.1 Firebase Console
- [ ] إنشاء مشروع Firebase
- [ ] تفعيل Crashlytics
- [ ] تفعيل Performance Monitoring
- [ ] تفعيل Cloud Messaging (Push)
- [ ] تفعيل Analytics

### 8.2 google-services.json
```json
{
  "project_info": {
    "project_number": "...",
    "project_id": "construction-app",
    "storage_bucket": "..."
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "...",
        "android_client_info": {
          "package_name": "com.company.construction"
        }
      }
    }
  ]
}
```

---

## 9. Checklist النهائي قبل النشر

### 9.1 التقني
- [ ] كل الاختبارات ناجحة
- [ ] لا يوجد أخطاء حرجة
- [ ] الأداء ضمن المعايير
- [ ] ProGuard/R8 مفعل
- [ ] حجم التطبيق < 50MB
- [ ] minSdk = 24, targetSdk = 34

### 9.2 المحتوى
- [ ] جميع النصوص بالعربية
- [ ] لا يوجد بيانات تجريبية
- [ ] لا يوجد logs حساسة
- [ ] الأيقونات والرسومات جاهزة

### 9.3 القانوني
- [ ] سياسة الخصوصية منشورة
- [ ] شروط الاستخدام واضحة
- [ ] Data Safety مكتمل
- [ ] تصنيف المحتوى صحيح

### 9.4 البنية التحتية
- [ ] السيرفر جاهز للإنتاج
- [ ] قاعدة البيانات مهيأة
- [ ] SSL certificates سارية
- [ ] Monitoring مفعل

---

## 10. ما بعد النشر

### 10.1 المراقبة اليومية
- معدل الأعطال (< 1%)
- تقييم المتجر (> 4.0)
- عدد التحميلات
- نسبة الحذف (Uninstall Rate)

### 10.2 التحديثات
| النوع | التكرار | المحتوى |
|-------|---------|---------|
| Hotfix | عند الحاجة | إصلاح أخطاء حرجة |
| Minor | أسبوعي | تحسينات وإصلاحات |
| Major | شهري | ميزات جديدة |

### 10.3 دعم المستخدمين
- بريد الدعم: support@company.com
- وقت الاستجابة: < 24 ساعة
- قنوات: البريد، المتجر، التطبيق

---
**التاريخ**: ديسمبر 2025
**الإصدار**: 1.0
