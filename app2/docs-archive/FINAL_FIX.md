# 🔧 تصحيح نهائي

## المشكلة
التطبيق يحتاج لـ dev dependencies (مثل vite و غيرها) حتى مع بناء esbuild.

## الحل على السيرفر
```bash
# من ~/construction-app
npm install   # بدون --production

pm2 restart construction-app

# التحقق
pm2 status
pm2 logs construction-app
```

## بعد ذلك
- اختبر الاتصال: `curl http://localhost:5000/api/health`
- احفظ العملية: `pm2 save`
