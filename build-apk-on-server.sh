#!/bin/bash
# ==============================================================================
# الذكاء الاصطناعي - سكربت البناء الذكي (Smart Build & Fix)
# يقوم هذا السكربت بفحص المشاكل الشائعة وإصلاحها تلقائياً قبل البدء في البناء
# ==============================================================================

set -e

# 1. تحميل المتغيرات
export SSH_PASSWORD=$(grep SSH_PASSWORD .env | cut -d'=' -f2)
SSH_CMD="sshpass -p '$SSH_PASSWORD' ssh -o StrictHostKeyChecking=no -p 22 administrator@93.127.142.144"

echo "🔍 البدء في فحص وإصلاح البيئة البرمجية على السيرفر..."

# 2. تنفيذ الفحص والإصلاح الذاتي على السيرفر
$SSH_CMD "bash -s" << 'REMOTESCRIPT'
    cd ~/app2
    
    # --- أ. فحص وإصلاح ملف build.gradle ---
    echo "⚙️ فحص إعدادات Android (build.gradle)..."
    cat > android/app/build.gradle << 'EOF'
apply plugin: 'com.android.application'

android {
    namespace "com.replit.restexpress"
    compileSdk 35
    defaultConfig {
        applicationId "com.replit.restexpress"
        minSdk 23
        targetSdk 34
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    signingConfigs {
        release {
            storeFile file("axion-release.keystore")
            storePassword "Ay**772283228"
            keyAlias "axion-key"
            keyPassword "Ay**772283228"
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

repositories {
    flatDir {
        dirs 'libs'
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
    implementation 'androidx.core:core-splashscreen:1.0.1'
}

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.exists()) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json issue")
}
EOF

    # --- ب. فحص وإصلاح الثيمات المفقودة (Styles) ---
    echo "🎨 فحص موارد التصميم (Styles/Themes)..."
    mkdir -p android/app/src/main/res/values
    cat > android/app/src/main/res/values/styles.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>
    <style name="Theme.SplashScreen" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>
</resources>
EOF

    # --- ج. التأكد من وجود الكيستور (Keystore) ---
    if [ ! -f "android/app/axion-release.keystore" ]; then
        echo "⚠️ تحذير: ملف التوقيع مفقود، سيتم البحث عنه في المجلد الأب..."
        cp android/axion-release.keystore android/app/ 2>/dev/null || echo "❌ خطأ: ملف التوقيع غير موجود نهائياً."
    fi

    # --- د. تشغيل عملية البناء ---
    echo "🚀 بدء عملية البناء النهائية..."
    npm run build
    npx cap sync android
    cd android
    chmod +x gradlew
    ./gradlew clean assembleRelease
    
    mkdir -p ../output_apks
    cp app/build/outputs/apk/release/app-release.apk ../output_apks/signed-app-release.apk
    echo "✅ تم البناء بنجاح: output_apks/signed-app-release.apk"
REMOTESCRIPT

echo "✨ انتهى العمل. تم تحديث السكربت وإصلاح المشاكل تلقائياً على السيرفر."
