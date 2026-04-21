# دليل تدوير المفاتيح المسرّبة ومسح تاريخ Git

> **تحذير حرج**: المفاتيح التالية موجودة في تاريخ Git وتُعتبر **مكشوفة بالكامل**. مجرد حذفها من تاريخ Git **لا يكفي** — يجب توليد مفاتيح جديدة وإبطال القديمة.

## الملفات المسرّبة

| الملف | أول commit مسرّب | الخطورة |
|---|---|---|
| `android/app/axion-release.keystore` | `0d349291` (2026-04-15) | 🔴 حرجة — يمكن لأي شخص توقيع APK مزيف باسم تطبيقك |
| `administrator/.axion-keystore/axion-release.keystore` | `9690906` (2026-03-02) | 🔴 حرجة — نفس المفتاح |
| `google-services.json` | في التاريخ | 🟠 متوسطة — يكشف Firebase project ID وAPI key (قابلة للتقييد، لا للإبطال) |

---

## الخطوة 1: توليد keystore جديد لـ Android (يدوياً)

```bash
keytool -genkey -v \
  -keystore android/app/axion-release-NEW.keystore \
  -alias axion-release \
  -keyalg RSA -keysize 4096 -validity 10000

# سيطلب منك:
# - كلمة مرور keystore (احفظها في Replit Secrets كـ KEYSTORE_PASSWORD)
# - الاسم/المنظمة
# - كلمة مرور alias (احفظها كـ KEYSTORE_KEY_PASSWORD)
```

**ثم**:
1. استبدل الملف القديم: `mv android/app/axion-release-NEW.keystore android/app/axion-release.keystore`
2. حدّث `Replit Secrets`: `KEYSTORE_PASSWORD` و `KEYSTORE_KEY_PASSWORD`
3. أعد توقيع أي APK سابق ووزّعه (المستخدمون لن يستطيعوا تحديث التطبيق القديم بنسخة موقّعة بالمفتاح الجديد — هذا قرار حاسم).

⚠️ **إذا كان التطبيق منشوراً على Google Play**: استخدم Play App Signing لتدوير المفتاح بدون كسر التحديثات.

---

## الخطوة 2: تدوير Firebase / FCM

`google-services.json` لا يحوي أسراراً قابلة للإبطال (فقط `project_id` و `api_key` المُقيَّدة). لكن:

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/) → Project Settings
2. **API Restrictions**: Google Cloud Console → APIs & Services → Credentials → قيّد الـ API keys بـ:
   - Android apps: SHA-1 fingerprint للـ keystore الجديد فقط
   - iOS apps: bundle ID
3. إذا كنتَ تستخدم Service Account لـ FCM (متغير `FIREBASE_SERVICE_ACCOUNT_KEY`): أنشئ مفتاحاً جديداً وأبطل القديم في Google Cloud Console → IAM → Service Accounts.

---

## الخطوة 3: مسح الأسرار من تاريخ Git (تدميري)

> **لا تُنفّذ هذه الخطوة قبل إكمال الخطوة 1 و2** — مسح Git وحده لا يحمي من النسخ الموجودة.

### الطريقة الموصى بها: `git-filter-repo`

```bash
# تثبيت
pip install git-filter-repo

# أنشئ نسخة احتياطية أولاً
cd ..
cp -r workspace workspace-backup-$(date +%Y%m%d)
cd workspace

# امسح من التاريخ
git filter-repo --invert-paths \
  --path android/app/axion-release.keystore \
  --path administrator/.axion-keystore/axion-release.keystore \
  --path google-services.json \
  --force

# ادفع التاريخ المُعاد كتابته (سيرفض إذا لم يكن لديك صلاحية force)
git push origin --force --all
git push origin --force --tags
```

### تحذيرات حاسمة قبل التنفيذ:
- 🔴 كل من نسخ المستودع سابقاً سيحتفظ بالأسرار في نسخته
- 🔴 PRs/branches قديمة سترتفع بعد إعادة الكتابة
- 🔴 commit hashes ستتغير → روابط Issues/PRs قديمة قد تنكسر
- 🔴 إذا كان CI/CD يعتمد على hashes محددة، سيحتاج تحديث

---

## الخطوة 4: التحقق من نجاح التدوير

```bash
# تأكد لا تظهر الأسرار في التاريخ
git log --all --source --remotes --oneline -- "*.keystore" "google-services.json"
# يجب ألا يُرجع شيئاً

# تأكد .gitignore يستثنيها (تم تطبيقه بالفعل)
git check-ignore android/app/axion-release.keystore
# يجب أن يُرجع المسار (مما يعني أنه مُتجاهل)
```

---

## الحالة الراهنة في هذا المشروع

| البند | الحالة |
|---|---|
| `.gitignore` يستثني keystore و google-services.json | ✅ تم |
| توليد keystore جديد على السيرفر | ✅ تم (2026-04-21) |
| Replit Secrets محدّثة (`KEYSTORE_PASSWORD`, `KEYSTORE_KEY_PASSWORD`) | ✅ تم |
| إضافة SHA-1 الجديد إلى Firebase | ✅ تم |
| تقييد Google Cloud API keys بـ SHA-1 الجديد | ✅ تم |
| تحديث `google-services.json` المحلي + رفعه للسيرفر في `/home/administrator/.axion-secrets/` | ✅ تم |
| إضافة fallback في deployment-engine لاستعادة `google-services.json` من المسار الآمن | ✅ تم |
| تدوير `FIREBASE_SERVICE_ACCOUNT_KEY` (Service Account جديد، Firebase Admin يُهيَّأ بنجاح) | ✅ تم |
| **حذف Service Account القديم من Google Cloud IAM** | ⏳ يحتاج تنفيذك (الخطوة الحاسمة لإبطاله) |
| مسح تاريخ Git | ⏳ يحتاج إذنك الصريح (تدميري) |
| تنظيف Git index من keystore tracked files | ⏳ يحتاج إذنك الصريح (تدميري) |

## معلومات keystore الجديد (2026-04-21)

- **Package name:** `com.axion.app`
- **Alias:** `axion-release`
- **SHA-1:** `7A:14:D0:2E:37:A2:70:4D:5C:59:DE:67:26:CF:0A:7D:B9:AE:CF:76`
- **صلاحية:** حتى 2053-09-06 (27 سنة)
- **خوارزمية:** RSA 4096-bit
- **مكان السيرفر:** `/home/administrator/.axion-keystore/axion-release.keystore`
- **النسخة الاحتياطية للقديم:** `/home/administrator/.axion-keystore/backups/axion-release.OLD-LEAKED.*.keystore`

عند الجاهزية لتنفيذ مسح Git، اطلب صراحة: **"امسح الأسرار من تاريخ git"** وسيتم إنشاء مهمة منفصلة لتنفيذها بأمان.
