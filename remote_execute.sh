#!/bin/bash
set -e

# المجلد الذي وجدناه في ls هو app2 (بالحروف الصغيرة)
TARGET_DIR="$HOME/app2"

if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ خطأ: المجلد $TARGET_DIR غير موجود."
    exit 1
fi

cd "$TARGET_DIR"
echo "✅ تم الدخول إلى المجلد: $PWD"

echo "--- 📥 سحب التحديثات من GitHub ---"
git pull origin main || echo "⚠️ تنبيه: فشل git pull، سأستمر..."

echo "--- 🌐 بناء تطبيق الويب ---"
if [ -f "package.json" ]; then
    echo "📦 تثبيت الاعتمادات..."
    npm install --quiet
    echo "🏗️ تشغيل بناء الويب..."
    npm run build
fi

echo "--- 📱 بناء تطبيق الأندرويد ---"
# البحث عن السكربت المطور في app2
ANDROID_SCRIPT=$(find . -name "build-android.sh" | head -n 1)

if [ -n "$ANDROID_SCRIPT" ]; then
    echo "🚀 تنفيذ سكربت الأندرويد: $ANDROID_SCRIPT"
    chmod +x "$ANDROID_SCRIPT"
    ./"$ANDROID_SCRIPT"
else
    echo "⚠️ لم يتم العثور على build-android.sh، سأبحث عن أي سكربت بناء أندرويد..."
    ALT_SCRIPT=$(find . -name "*android*" -name "*.sh" | head -n 1)
    if [ -n "$ALT_SCRIPT" ]; then
        echo "🚀 تنفيذ السكربت البديل: $ALT_SCRIPT"
        chmod +x "$ALT_SCRIPT"
        ./"$ALT_SCRIPT"
    else
        echo "❌ خطأ: لم يتم العثور على أي سكربت لبناء الأندرويد."
        exit 1
    fi
fi
