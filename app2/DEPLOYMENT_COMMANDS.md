# أوامر نشر التطبيق على السيرفر 🚀

## المتطلبات الأساسية على السيرفر
```bash
# 1. Node.js و npm
node --version  # v18+
npm --version   # v9+

# 2. PM2 (لإدارة العمليات)
sudo npm install -g pm2

# 3. مجلد التطبيق
mkdir -p /home/administrator/construction-app
cd /home/administrator/construction-app
```

## خطوات النشر (على السيرفر)

### 1️⃣ نسخ الملفات
```bash
# من جهازك المحلي - انسخ الملفات المجمعة:
scp -r dist/ administrator@93.127.142.144:/home/administrator/construction-app/
scp package.json administrator@93.127.142.144:/home/administrator/construction-app/
scp ecosystem.config.js administrator@93.127.142.144:/home/administrator/construction-app/
scp .env.production administrator@93.127.142.144:/home/administrator/construction-app/.env
```

### 2️⃣ إعداد البيئة على السيرفر
```bash
ssh administrator@93.127.142.144

# انتقل إلى مجلد التطبيق
cd /home/administrator/construction-app

# قم بإنشاء متغيرات البيئة (استخدم القيم الفعلية)
export DATABASE_URL="postgresql://newuser:newpassword@localhost:5432/newdb"
export JWT_ACCESS_SECRET="your-secret-here"
export JWT_REFRESH_SECRET="your-secret-here"
export SESSION_SECRET="your-secret-here"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="K2Panel.1@gmail.com"
export SMTP_PASS="nrac bbcf nwqw lugh"
```

### 3️⃣ تشغيل التطبيق باستخدام PM2
```bash
# تشغيل التطبيق
pm2 start ecosystem.config.js

# عرض الحالة
pm2 status

# عرض السجلات
pm2 logs construction-app

# إعادة التشغيل
pm2 restart construction-app

# الحفظ للبدء التلقائي عند إعادة التشغيل
pm2 startup
pm2 save
```

### 4️⃣ التحقق من النشر
```bash
# التحقق من أن التطبيق يعمل
curl http://localhost:5000/api/health

# عرض المسارات المتاحة
curl http://localhost:5000/api/status

# اختبار المصادقة
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## استكشاف الأخطاء

### إذا لم يشغل التطبيق
```bash
# عرض السجلات التفصيلية
pm2 logs construction-app --lines 100

# إعادة تشغيل
pm2 restart construction-app

# حذف وتشغيل جديد
pm2 delete construction-app
pm2 start ecosystem.config.js
```

### فحص قاعدة البيانات
```bash
psql -h localhost -U newuser -d newdb -c "SELECT version();"
```

### فحص المنفذ
```bash
lsof -i :5000
netstat -tuln | grep 5000
```

## الخطوات التالية بعد النشر

1. ✅ إعداد Nginx/Apache (reverse proxy)
2. ✅ إعداد SSL/TLS (Let's Encrypt)
3. ✅ إعداد المراقبة والتنبيهات
4. ✅ إعداد النسخ الاحتياطية
5. ✅ توثيق عملية التطوير والنشر
