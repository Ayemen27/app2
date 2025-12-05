#!/bin/bash

set -e

echo "🔨 بناء تطبيق Android..."
echo "=========================="

cd "$(dirname "$0")/.."
APP_DIR="$(pwd)/app"

if [ ! -d "$APP_DIR" ]; then
    echo "❌ مجلد app غير موجود!"
    exit 1
fi

cd "$APP_DIR"

echo "📦 تثبيت الحزم..."
npm install

echo "🏗️ بناء المشروع..."
npm run build

echo "🔄 مزامنة Capacitor..."
npx cap sync android

BUILD_TYPE="${1:-debug}"

cd android

if [ "$BUILD_TYPE" = "release" ]; then
    echo "📱 بناء APK Release..."
    
    if [ -z "$KEYSTORE_PATH" ] || [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
        echo "⚠️ متغيرات بيئة التوقيع غير موجودة!"
        echo "المطلوب: KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD"
        echo "سيتم بناء debug بدلاً من release..."
        ./gradlew assembleDebug
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    else
        ./gradlew assembleRelease
        APK_PATH="app/build/outputs/apk/release/app-release.apk"
    fi
elif [ "$BUILD_TYPE" = "bundle" ]; then
    echo "📦 بناء AAB للنشر..."
    
    if [ -z "$KEYSTORE_PATH" ]; then
        echo "❌ KEYSTORE_PATH مطلوب لبناء AAB!"
        exit 1
    fi
    
    ./gradlew bundleRelease
    APK_PATH="app/build/outputs/bundle/release/app-release.aab"
else
    echo "📱 بناء APK Debug..."
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

if [ -f "android/$APK_PATH" ]; then
    echo ""
    echo "✅ تم البناء بنجاح!"
    echo "📍 الملف: android/$APK_PATH"
    echo ""
    
    FILE_SIZE=$(du -h "android/$APK_PATH" | cut -f1)
    echo "📊 الحجم: $FILE_SIZE"
else
    echo "❌ فشل البناء!"
    exit 1
fi

echo ""
echo "🎉 انتهى!"
