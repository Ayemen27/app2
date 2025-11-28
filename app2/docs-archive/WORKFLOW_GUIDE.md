# 🎯 دليل استخدام Workflow النشر

## 📌 ما هو Workflow؟

Workflow في Replit هو سير عمل مؤتمت يمكنك تشغيله بضغطة زر واحدة. تم إنشاء workflow جديد يقوم بـ:
- ✅ بناء التطبيق
- ✅ إنشاء حزمة النشر
- ✅ رفع الحزمة إلى السيرفر
- ✅ تثبيت dependencies
- ✅ إعادة تشغيل مع PM2
- ✅ التحقق من الصحة

---

## 🚀 كيفية استخدام Workflow

### الخطوة 1️⃣: ابحث عن Workflow
في الأعلى يسار شاشة Replit، اضغط على **"Run"** أو ابحث عن قائمة الـ Workflows

### الخطوة 2️⃣: اختر "Deploy to Production"
ستظهر قائمة بـ Workflows المتاحة:
- ✅ **Deploy to Production** ← اختر هذا
- Start application

### الخطوة 3️⃣: اضغط "Run"
الـ Workflow سيبدأ فوراً ويقوم بـ:
```
🔨 بناء التطبيق...
📦 إنشاء حزمة النشر...
📡 رفع الحزمة...
⚙️ تثبيت dependencies...
🚀 إعادة تشغيل PM2...
✅ التحقق من الصحة...
```

### الخطوة 4️⃣: انتظر النتائج
- ⏱️ الوقت المتوقع: **2-3 دقائق**
- 📊 شاهد السجلات في console
- ✅ عندما ترى رسالة "🎉 اكتمل النشر بنجاح!" = تم!

---

## 🧪 التحقق من النشر الناجح

بعد انتهاء الـ Workflow:

```bash
# 1. اختبر الرابط الرئيسي
https://app2.binarjoinanelytic.info

# 2. فحص الصحة
curl https://app2.binarjoinanelytic.info/api/health

# 3. عرض السجلات (إذا فشل)
ssh administrator@93.127.142.144
pm2 logs construction-app
```

---

## ⚠️ المتطلبات الأساسية

**تأكد من هذه المتطلبات قبل تشغيل Workflow:**

1. ✅ **sshpass مثبت على جهازك** (ليس على السيرفر)
   ```bash
   # macOS
   brew install sshpass
   
   # Ubuntu/Debian
   sudo apt-get install sshpass
   
   # CentOS/RedHat
   sudo yum install sshpass
   ```

2. ✅ **الـ Secrets موجودة في Replit**
   - `SSH_HOST` = 93.127.142.144
   - `SSH_USER` = administrator
   - `SSH_PASSWORD` = كلمة المرور

3. ✅ **الاتصال بالسيرفر يعمل**
   ```bash
   ssh administrator@93.127.142.144
   # يجب تدخل كلمة المرور
   ```

---

## 🔄 إعادة تشغيل Workflow

إذا فشل الـ Workflow لسبب ما:

### الحل 1️⃣: تشغيل يدوي من Terminal
```bash
cd app2
chmod +x RUN_DEPLOYMENT.sh
./RUN_DEPLOYMENT.sh
```

### الحل 2️⃣: النشر اليدوي الكامل
```bash
# 1. رفع الملفات
scp app2/deployment-package.tar.gz \
    administrator@93.127.142.144:/home/administrator/construction-app/

# 2. على السيرفر
ssh administrator@93.127.142.144
cd /home/administrator/construction-app
tar -xzf deployment-package.tar.gz
npm install
pm2 delete all
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 🐛 استكشاف الأخطاء

| المشكلة | الحل |
|--------|------|
| sshpass غير مثبت | `brew install sshpass` |
| لم تظهر رسالة النجاح | انتظر 3-5 دقائق إضافية |
| فشل الاتصال | تحقق من SSH_HOST و SSH_PASSWORD |
| Port in use | على السيرفر: `lsof -i :6000` |

---

## 📊 معلومات الـ Workflow

| المعلومة | التفصيل |
|---------|----------|
| **الاسم** | Deploy to Production |
| **الأمر** | `cd app2 && bash DEPLOY_CUSTOM_DOMAIN.sh` |
| **النوع** | Console (عرض السجلات) |
| **الوقت** | ~2-3 دقائق |
| **التكرار** | يمكن تشغيله أي عدد مرات |

---

## 🎯 الفوائد

✅ نشر بضغطة زر واحدة  
✅ لا حاجة لكتابة أوامر  
✅ تلقائي وآمن  
✅ يعرض التقدم والأخطاء  
✅ يتحقق من الصحة بعد النشر  

---

**استمتع بالنشر السهل! 🚀**

