# 📱 دليل النشر النهائي - Construction Management System

## 🎯 حالة التطبيق الحالية
- ✅ **البناء**: ناجح
- ✅ **التحديثات الفورية**: مُصلحة (الحذف والتعديل يعملان فوراً)
- ✅ **المنفذ**: 6000
- ✅ **السيرفر**: 93.127.142.144
- ✅ **مدير العمليات**: PM2 (2 instances في cluster mode)

## 📋 الخطوات الأولى

### 1️⃣ التحقق من المتطلبات
```bash
# تأكد من وجود sshpass
which sshpass || echo "تثبيت sshpass مطلوب"

# تحقق من بيانات الاتصال في Secrets
echo $SSH_HOST        # يجب أن يُظهر: 93.127.142.144
echo $SSH_USER        # يجب أن يُظهر: administrator
```

### 2️⃣ النشر الأول (الطريقة السهلة)
```bash
cd app2
chmod +x RUN_DEPLOYMENT.sh
./RUN_DEPLOYMENT.sh
```

### 3️⃣ اختبر التطبيق
```bash
# بعد انتظار 30 ثانية
curl http://93.127.142.144:6000/api/health
```

---

## 🔄 ما يفعله السكريبت

| الخطوة | الوصف | الوقت |
|--------|-------|------|
| 1 | فحص متغيرات البيئة | 5 ثواني |
| 2 | بناء التطبيق (vite + esbuild) | 40 ثانية |
| 3 | إنشاء حزمة النشر | 5 ثواني |
| 4 | رفع الحزمة إلى السيرفر | 30 ثانية |
| 5 | فك الحزمة | 5 ثواني |
| 6 | تثبيت npm dependencies | 60 ثانية |
| 7 | إعادة تشغيل مع PM2 | 10 ثواني |
| 8 | التحقق من الصحة | 5 ثواني |
| **إجمالي** | | **~160 ثانية** |

---

## 🚀 النشر المتقدم

### نشر يدوي بدون السكريبت
```bash
# من مجلد app2

# 1. بناء التطبيق
npm run build

# 2. إرسال الملفات
scp -r dist ecosystem.config.cjs package*.json .env.production \
    administrator@93.127.142.144:/home/administrator/construction-app/

# 3. على السيرفر
ssh administrator@93.127.142.144

# فك الحزمة وتثبيت
cd /home/administrator/construction-app
npm install
pm2 delete all
pm2 start ecosystem.config.cjs
pm2 save
```

### عرض السجلات
```bash
# قيد التشغيل على السيرفر
ssh administrator@93.127.142.144
pm2 logs construction-app
pm2 logs construction-app --err  # أخطاء فقط
pm2 monit  # مراقبة فورية
```

### إعادة تشغيل سريعة
```bash
# على السيرفر
cd /home/administrator/construction-app
pm2 restart construction-app
pm2 save
```

---

## 🔒 بيانات الاتصال

بيانات الاتصال مخزنة **بشكل آمن** في Secrets:

| المتغير | الغرض |
|---------|--------|
| `SSH_HOST` | عنوان السيرفر IP |
| `SSH_USER` | اسم المستخدم (administrator) |
| `SSH_PASSWORD` | كلمة المرور المشفرة |
| `SSH_PORT` | منفذ SSH (22) |
| `DATABASE_URL` | اتصال قاعدة البيانات |

---

## 🐛 استكشاف الأخطاء

### المشكلة: "Cannot find module"
```bash
# الحل: أعد تثبيت dependencies على السيرفر
cd /home/administrator/construction-app
npm install
pm2 restart construction-app
```

### المشكلة: "Port already in use"
```bash
# الحل: اقتل العملية القديمة
lsof -i :6000
kill -9 <PID>

# ثم أعد التشغيل
pm2 start ecosystem.config.cjs
```

### المشكلة: "Cannot connect to database"
```bash
# تحقق من متغيرات البيئة
env | grep DATABASE_URL

# أعد تشغيل التطبيق
pm2 restart construction-app
```

---

## 📊 أوامر PM2 المهمة

```bash
# عرض جميع العمليات
pm2 status

# عرض السجلات
pm2 logs

# إيقاف تطبيق
pm2 stop construction-app

# إعادة تشغيل
pm2 restart construction-app

# حذف تطبيق
pm2 delete construction-app

# حفظ الحالة الحالية
pm2 save

# استعادة العمليات المحفوظة
pm2 resurrect

# مراقبة فورية
pm2 monit
```

---

## ✅ قائمة التحقق قبل النشر

- [ ] تم بناء التطبيق بنجاح: `npm run build`
- [ ] التحديثات الفورية تعمل في بيئة التطوير
- [ ] جميع متغيرات البيئة موجودة في Secrets
- [ ] السيرفر يمكن الوصول إليه: `ssh administrator@93.127.142.144`
- [ ] مساحة تخزين على السيرفر متاحة: `df -h`
- [ ] كلمة المرور صحيحة

---

## 📞 معلومات الاتصال

| العنصر | التفاصيل |
|--------|----------|
| **IP السيرفر** | 93.127.142.144 |
| **المنفذ** | 6000 |
| **اسم التطبيق** | construction-app |
| **عدد الـ Instances** | 2 (cluster mode) |
| **الذاكرة لكل Instance** | ~50-60 MB |
| **حد الذاكرة العام** | 1 GB |

---

## 🎉 بعد النشر الناجح

```bash
# الرابط:
http://93.127.142.144:6000

# اختبر الـ Health Check:
curl http://93.127.142.144:6000/api/health

# عرض السجلات الأخيرة:
pm2 logs construction-app --lines 50
```

---

## 📝 ملاحظات هامة

- التطبيق يعمل على **البورت 6000** (وليس 5000)
- **2 instances** تعمل في **cluster mode** لتحقيق موثوقية أفضل
- السجلات محفوظة في `/home/administrator/construction-app/logs/`
- قاعدة البيانات متصلة بـ PostgreSQL الخارجية
- تحديثات البيانات تظهر **فوراً** عند الحذف أو التعديل

---

**آخر تحديث**: 28 نوفمبر 2025  
**نسخة التطبيق**: 1.0.0  
**البناء**: ✅ ناجح وجاهز للنشر

