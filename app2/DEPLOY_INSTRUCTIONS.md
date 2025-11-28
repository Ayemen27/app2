# 🚀 دليل نشر التطبيق على السيرفر البعيد

## المعلومات الأساسية
```
السيرفر: 93.127.142.144
المنفذ: 22
المستخدم: administrator
المجلد المقترح: /home/administrator/construction-app
```

## ✅ الملفات المُحضرة للنشر

الملفات المجمعة موجودة بالفعل في `app2/dist/`:
- ✅ `dist/index.js` (840 KB) - التطبيق الخادم المجمع
- ✅ `dist/public/` - الملفات الثابتة (HTML, CSS, JS)
- ✅ `ecosystem.config.js` - إعدادات PM2
- ✅ `package.json` - معلومات المشروع
- ✅ `.env.production` - ملف البيئة

## 🔧 خطوات النشر اليدوية

### الخطوة 1: الاتصال بالسيرفر
```bash
ssh administrator@93.127.142.144
```

### الخطوة 2: إعداد مجلد التطبيق
```bash
# إنشاء المجلد
mkdir -p /home/administrator/construction-app
cd /home/administrator/construction-app

# حذف الملفات القديمة (إذا كانت موجودة)
rm -rf dist ecosystem.config.js package.json .env 2>/dev/null || true
```

### الخطوة 3: نسخ الملفات من جهازك (من terminal جديد)
```bash
# نسخ حزمة النشر (من جهازك المحلي)
scp app2/deployment-package.tar.gz administrator@93.127.142.144:/home/administrator/construction-app/

# أو نسخ الملفات مباشرة:
cd app2
scp -r dist/ administrator@93.127.142.144:/home/administrator/construction-app/
scp ecosystem.config.js administrator@93.127.142.144:/home/administrator/construction-app/
scp package.json administrator@93.127.142.144:/home/administrator/construction-app/
scp .env.production administrator@93.127.142.144:/home/administrator/construction-app/.env
```

### الخطوة 4: فك ضغط الحزمة (على السيرفر)
```bash
cd /home/administrator/construction-app
tar -xzf deployment-package.tar.gz
rm deployment-package.tar.gz
ls -lah
```

### الخطوة 5: تثبيت المتطلبات (على السيرفر)
```bash
cd /home/administrator/construction-app

# تثبيت PM2 عالمياً
sudo npm install -g pm2

# تثبيت الـ dependencies (اختياري إذا لم تكن موجودة)
# npm install --production
```

### الخطوة 6: تكوين متغيرات البيئة (على السيرفر)
```bash
# تحرير ملف .env
nano /home/administrator/construction-app/.env

# أضف المتغيرات التالية:
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://newuser:newpassword@localhost:5432/newdb"
JWT_ACCESS_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-secret-key"
SESSION_SECRET="your-secret-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="K2Panel.1@gmail.com"
SMTP_PASS="nrac bbcf nwqw lugh"
```

### الخطوة 7: تشغيل التطبيق (على السيرفر)
```bash
cd /home/administrator/construction-app

# بدء التطبيق باستخدام PM2
pm2 start ecosystem.config.js

# التحقق من الحالة
pm2 status

# عرض السجلات
pm2 logs construction-app

# إعادة التشغيل
pm2 restart construction-app

# الحفظ للبدء التلقائي
pm2 startup
pm2 save
```

## ✅ التحقق من النشر

### اختبار API
```bash
# التحقق من صحة التطبيق
curl http://localhost:5000/api/health

# عرض حالة النظام
curl http://localhost:5000/api/status

# قائمة الجداول
curl http://localhost:5000/api/health
```

### عرض السجلات
```bash
# السجلات الحية
pm2 logs construction-app

# آخر 100 سطر
pm2 logs construction-app --lines 100

# حفظ السجلات
pm2 logs construction-app > /tmp/app.log
```

## 🔧 استكشاف الأخطاء

### المشكلة: التطبيق لا يبدأ
```bash
# عرض التفاصيل
pm2 logs construction-app --lines 200

# إعادة بدء الخادم
pm2 restart construction-app

# حذف وتشغيل جديد
pm2 delete construction-app
pm2 start ecosystem.config.js
```

### المشكلة: خطأ في قاعدة البيانات
```bash
# اختبار الاتصال
psql -h localhost -U newuser -d newdb -c "SELECT 1;"

# عرض الأخطاء
pm2 logs construction-app | grep -i "database\|error"
```

### المشكلة: المنفذ مشغول
```bash
# التحقق من المنفذ 5000
lsof -i :5000
netstat -tuln | grep 5000

# قتل العملية إذا لزم الأمر
pkill -f "node dist/index.js"
pm2 kill
```

## 📊 معلومات مفيدة

### عرض حالة العمليات
```bash
# جميع العمليات
pm2 status

# تفاصيل عملية معينة
pm2 describe construction-app

# الموارد المستهلكة
pm2 monit
```

### إدارة العمليات
```bash
# إيقاف العملية
pm2 stop construction-app

# إعادة تشغيل
pm2 restart construction-app

# حذف
pm2 delete construction-app

# حذف جميع العمليات
pm2 delete all
```

## 🔐 الأمان

- تأكد من استخدام HTTPS (إعداد Nginx/Apache)
- استخدم firewall لتقييد الوصول
- قم بحماية ملف .env (chmod 600)
- أضف كلمات مرور قوية للـ Secrets

## 🚀 الخطوات التالية

1. إعداد Nginx/Apache كـ reverse proxy
2. إعداد SSL/TLS باستخدام Let's Encrypt
3. إعداد المراقبة والتنبيهات
4. إعداد النسخ الاحتياطية التلقائية
5. توثيق العملية

---

**ملاحظة**: جميع الملفات جاهزة والتطبيق مُجمع بنجاح. قم بتتبع الخطوات أعلاه للنشر على السيرفر.
