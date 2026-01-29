#!/bin/bash

# Smart Build Pro v2.1.0 - AXION Edition
# محسّن لإصلاح أخطاء MultiDex و Gradle تلقائياً

set -e

echo "=============================================="
echo ">>> AXION Smart Build Pro v2.1.0"
echo "=============================================="

# تحديد المسارات
ANDROID_DIR="./android"
APP_GRADLE="$ANDROID_DIR/app/build.gradle"

# 1. التحقق من وجود مجلد أندرويد
if [ ! -d "$ANDROID_DIR" ]; then
    echo "❌ Error: Android directory not found at $ANDROID_DIR"
    exit 1
fi

echo ">>> Patching app/build.gradle for MultiDex and SDK..."

# 2. إصلاح ملف app/build.gradle (مشروع المستخدم فقط)
if [ -f "$APP_GRADLE" ]; then
    # إضافة multiDexEnabled true إذا لم يكن موجوداً
    if ! grep -q "multiDexEnabled true" "$APP_GRADLE"; then
        sed -i '/defaultConfig {/a \        multiDexEnabled true' "$APP_GRADLE"
        echo "✅ Enabled MultiDex in defaultConfig"
    fi

    # إضافة التبعية الصحيحة في بلوك dependencies
    if ! grep -q "androidx.multidex:multidex" "$APP_GRADLE"; then
        # البحث عن بلوك dependencies وإضافة التبعية
        sed -i '/dependencies {/a \    implementation "androidx.multidex:multidex:2.0.1"' "$APP_GRADLE"
        echo "✅ Added MultiDex dependency"
    fi
    
    # إصلاح مشكلة Groovy space assignment syntax
    sed -i 's/namespace "/namespace = "/g' "$APP_GRADLE"
    echo "✅ Fixed namespace syntax"
else
    echo "⚠️ Warning: $APP_GRADLE not found"
fi

# 3. تنظيف الكاش
echo ">>> Cleaning Gradle caches..."
cd "$ANDROID_DIR"
./gradlew clean

# 4. بدء البناء
echo ">>> Starting Debug Build..."
./gradlew assembleDebug

echo "=============================================="
echo "✅ BUILD SUCCESSFUL"
echo "=============================================="
