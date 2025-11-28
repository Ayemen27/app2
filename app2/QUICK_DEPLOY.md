# 🚀 دليل النشر السريع

## المتطلبات
- `sshpass` مثبت على النظام (لإرسال كلمة السر تلقائياً)
  ```bash
  # على macOS
  brew install sshpass
  
  # على Linux (Debian/Ubuntu)
  sudo apt-get install sshpass
  
  # على Linux (RedHat/CentOS)
  sudo yum install sshpass
  ```

## الخطوات السريعة

### 1. النشر الكامل (الطريقة الموصى بها)
```bash
chmod +x DEPLOY_TO_SERVER.sh
./DEPLOY_TO_SERVER.sh
```

هذا السكريبت سيقوم بـ:
- ✅ بناء التطبيق
- ✅ إنشاء حزمة النشر
- ✅ رفع الحزمة إلى السيرفر
- ✅ فك الحزمة
- ✅ تثبيت dependencies
- ✅ إعادة تشغيل التطبيق على PM2
- ✅ التحقق من حالة التطبيق

### 2. التحقق من حالة التطبيق بعد النشر
```bash
# على السيرفر
ssh administrator@93.127.142.144
pm2 status
pm2 logs construction-app --lines 20
```

### 3. المنفذ والرابط
- **المنفذ**: 6000
- **الرابط**: http://93.127.142.144:6000
- **صحة التطبيق**: http://93.127.142.144:6000/api/health

## متغيرات البيئة المطلوبة
السكريبت سيقرأ هذه من Secrets:
- `SSH_HOST` - 93.127.142.144
- `SSH_USER` - administrator
- `SSH_PASSWORD` - كلمة السر
- `SSH_PORT` - 22 (اختياري)

## استكشاف الأخطاء

### إذا فشل النشر:
```bash
# قم بالنشر اليدوي:
scp app2/deployment-package.tar.gz administrator@93.127.142.144:/home/administrator/construction-app/

# ثم على السيرفر:
cd /home/administrator/construction-app
tar -xzf deployment-package.tar.gz
npm install
pm2 delete all
pm2 start ecosystem.config.cjs
```

### عرض السجلات:
```bash
pm2 logs construction-app
pm2 logs construction-app --err  # أخطاء فقط
```

### إعادة تشغيل التطبيق:
```bash
pm2 restart construction-app
pm2 save  # احفظ الحالة الحالية
```

## 🎯 النسخة الحالية
- **آخر تحديث**: التحديثات الفورية للحذف والتعديل
- **البناء**: ✅ يعمل بنجاح
- **المنفذ**: 6000
- **الحالة**: جاهز للنشر

