# 🚀 دليل النشر النهائي

## ✅ الحالة الحالية
التطبيق مُجمع تماماً وجاهز للنشر على السيرفر!

## 📦 الملفات الجاهزة
- ✅ `deployment-package.tar.gz` (852 KB) - حزمة النشر الكاملة
- ✅ `deploy.sh` - script النشر التلقائي
- ✅ `ecosystem.config.js` - إعدادات PM2
- ✅ `dist/` - الملفات المجمعة

## 🚀 طريقة النشر السريعة

### من terminal جهازك (في مجلد المشروع):

```bash
# الطريقة 1: استخدام script النشر (الأسهل)
cd ~/workspace
bash app2/deploy.sh
# سيطلب منك كلمة السر (اضغط Enter إذا كانت مخزنة)
```

### أو استخدم الأوامر مباشرة:

```bash
# 1. نسخ الحزمة
scp app2/deployment-package.tar.gz administrator@93.127.142.144:/home/administrator/construction-app/
# كلمة السر: Ay**772283228

# 2. فك الضغط (من SSH)
ssh administrator@93.127.142.144
cd /home/administrator/construction-app
tar -xzf deployment-package.tar.gz
rm deployment-package.tar.gz
```

## ⚙️ التشغيل على السيرفر

بعد النسخ، قم بتشغيل هذه الأوامر على السيرفر:

```bash
ssh administrator@93.127.142.144

# تشغيل التطبيق
cd /home/administrator/construction-app
pm2 start ecosystem.config.js

# التحقق من الحالة
pm2 status

# عرض السجلات
pm2 logs construction-app

# حفظ للبدء التلقائي
pm2 save
```

## ✅ التحقق من النشر

```bash
# من السيرفر نفسه أو من أي مكان:
curl http://93.127.142.144:5000/api/health

# يجب أن ترى رد موجب
```

## 🔐 متغيرات البيئة المطلوبة

تأكد من وجود هذه المتغيرات في `/home/administrator/construction-app/.env`:

```
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://newuser:newpassword@localhost:5432/newdb"
JWT_ACCESS_SECRET="your-secret"
JWT_REFRESH_SECRET="your-secret"
SESSION_SECRET="your-secret"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="K2Panel.1@gmail.com"
SMTP_PASS="nrac bbcf nwqw lugh"
```

## 📚 ملفات المساعدة

- `README_DEPLOYMENT.md` - دليل شامل
- `DEPLOY_INSTRUCTIONS.md` - تفاصيل كاملة
- `DEPLOYMENT_CHECKLIST.md` - قائمة التحقق

## 🎯 الملخص

| الخطوة | الأمر |
|------|--------|
| 1 | `bash app2/deploy.sh` أو `scp` يدويًا |
| 2 | `ssh administrator@93.127.142.144` |
| 3 | `pm2 start ecosystem.config.js` |
| 4 | `pm2 status` للتحقق |

---

**جاهز للنشر! اتبع الخطوات أعلاه. 🚀**
