# ✅ قائمة التحقق قبل النشر

## 📋 المتطلبات الأساسية
- [ ] تم تثبيت `sshpass` على جهازك
  ```bash
  brew install sshpass  # macOS
  sudo apt-get install sshpass  # Ubuntu
  ```

- [ ] الـ Secrets موجودة في Replit:
  - `SSH_HOST` = 93.127.142.144
  - `SSH_USER` = administrator
  - `SSH_PASSWORD` = كلمة المرور

## 🚀 النشر من Replit

### الطريقة 1️⃣: استخدام Workflow (الأسهل)
1. اضغط على الـ "Run" button في الأعلى
2. اختر "Deploy to Production" من القائمة
3. انتظر انتهاء النشر (~3 دقائق)
4. تحقق من الرابط: https://app2.binarjoinanelytic.info

### الطريقة 2️⃣: من Terminal
```bash
cd app2
chmod +x RUN_DEPLOYMENT.sh
./RUN_DEPLOYMENT.sh
```

## 🧪 التحقق من النشر الناجح

```bash
# الرابط الرئيسي
https://app2.binarjoinanelytic.info

# فحص الصحة
curl https://app2.binarjoinanelytic.info/api/health

# عرض السجلات (على السيرفر)
ssh administrator@93.127.142.144
pm2 logs construction-app
```

## ⚡ نصائح مهمة

1. **First Time?** تأكد من تثبيت `sshpass` أولاً
2. **Slow Network?** قد يستغرق النشر 3-5 دقائق
3. **Failed?** شاهد السجلات في console وتحقق من الأخطاء
4. **Stuck?** اضغط Ctrl+C وحاول مرة أخرى

