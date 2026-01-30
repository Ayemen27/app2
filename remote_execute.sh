#!/bin/bash
set -e

TARGET_DIR="$HOME/app2"
cd "$TARGET_DIR"

echo "--- 📥 سحب التحديثات من GitHub ---"
# جلب التغييرات وتجاوز التعارضات بشكل بسيط
git fetch origin main
git merge -s recursive -X theirs origin/main || echo "⚠️ تنبيه: تم الدمج مع وجود بعض الملاحظات."

echo "--- 🌐 بناء تطبيق الويب ---"
if [ -f "package.json" ]; then
    echo "📦 تثبيت الاعتمادات (Legacy Peer Deps)..."
    npm install --quiet --legacy-peer-deps
    echo "🏗️ تشغيل بناء الويب..."
    npm run build
fi

echo "--- 📱 بناء تطبيق الأندرويد ---"
# البحث عن سكربت يحتوي على كلمة apk في الجذر
echo "🔍 البحث عن سكربت بناء يحتوي على 'apk' في الجذر: $PWD"
APK_SCRIPT=$(ls | grep -i "apk" | grep "\.sh$" | head -n 1)

if [ -n "$APK_SCRIPT" ]; then
    echo "🚀 تنفيذ سكربت الأندرويد المكتشف: $APK_SCRIPT"
    chmod +x "$APK_SCRIPT"
    ./"$APK_SCRIPT"
else
    echo "❌ خطأ: لم يتم العثور على سكربت يحتوي على 'apk' في الجذر."
    echo "قائمة الملفات في الجذر:"
    ls -F
    exit 1
fi
