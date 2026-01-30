#!/bin/bash
set -e

# البحث عن المجلد App2
TARGET_DIR=$(find ~ -maxdepth 2 -name "App2" -type d | head -n 1)

if [ -z "$TARGET_DIR" ]; then
    echo "❌ خطأ: المجلد App2 غير موجود في مسار المستخدم."
    echo "المجلدات المتاحة:"
    ls -F ~
    exit 1
fi

cd "$TARGET_DIR"
echo "✅ تم الدخول إلى المجلد: $PWD"

echo "--- 📥 سحب التحديثات من GitHub ---"
git pull origin main || echo "⚠️ تنبيه: فشل git pull (قد لا يكون مستودع git)، سأستمر..."

echo "--- 🌐 بناء تطبيق الويب ---"
if [ -f "package.json" ]; then
    echo "📦 تثبيت الاعتمادات..."
    npm install --quiet
    echo "🏗️ تشغيل بناء الويب..."
    npm run build
else
    echo "ℹ️ لا يوجد package.json، تخطي بناء الويب."
fi

echo "--- 📱 بناء تطبيق الأندرويد ---"
# البحث عن سكربت الأندرويد داخل المجلد
ANDROID_SCRIPT=$(find . -name "build-android.sh" | head -n 1)

if [ -n "$ANDROID_SCRIPT" ]; then
    echo "🚀 تنفيذ سكربت الأندرويد: $ANDROID_SCRIPT"
    chmod +x "$ANDROID_SCRIPT"
    ./"$ANDROID_SCRIPT"
else
    echo "❌ خطأ: لم يتم العثور على سكربت بناء الأندرويد."
    exit 1
fi
