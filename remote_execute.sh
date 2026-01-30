#!/bin/bash
set -e

echo "--- سحب التحديثات من GitHub ---"
cd ~/App2 || { echo "المجلد App2 غير موجود"; exit 1; }
git pull origin main

echo "--- بناء تطبيق الويب ---"
# افتراض وجود npm وتحميل الاعتمادات
if [ -f "package.json" ]; then
  npm install
  npm run build
fi

echo "--- بناء تطبيق الأندرويد ---"
# استخدام السكربت المطور المذكور في الطلب
if [ -f "scripts/build-android.sh" ]; then
  chmod +x scripts/build-android.sh
  ./scripts/build-android.sh
else
  echo "سكربت بناء الأندرويد غير موجود في scripts/build-android.sh، سأبحث في المجلد الرئيسي..."
  find . -name "*android*" -type f
fi
