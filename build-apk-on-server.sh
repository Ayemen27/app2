#!/bin/bash
set -e

export SSH_PASSWORD=$(grep SSH_PASSWORD .env | cut -d'=' -f2)
SSH_CMD="sshpass -p '$SSH_PASSWORD' ssh -o StrictHostKeyChecking=no -p 22 administrator@93.127.142.144"

KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-}"
KEYSTORE_ALIAS="${KEYSTORE_ALIAS:-axion-key}"
KEYSTORE_KEY_PASSWORD="${KEYSTORE_KEY_PASSWORD:-$KEYSTORE_PASSWORD}"

if [ -z "$KEYSTORE_PASSWORD" ]; then
    echo "❌ Error: KEYSTORE_PASSWORD environment variable is required"
    exit 1
fi

echo "🔍 Starting build environment setup on remote server..."

$SSH_CMD "bash -s" << REMOTESCRIPT
    cd ~/app2
    
    export KEYSTORE_PASSWORD='${KEYSTORE_PASSWORD}'
    export KEYSTORE_ALIAS='${KEYSTORE_ALIAS}'
    export KEYSTORE_KEY_PASSWORD='${KEYSTORE_KEY_PASSWORD}'
    
    echo "⚙️ Configuring Android build.gradle..."
    cat > android/app/build.gradle << 'EOF'
apply plugin: 'com.android.application'

android {
    namespace "com.axion.app"
    compileSdk 35
    defaultConfig {
        applicationId "com.axion.app"
        minSdk 23
        targetSdk 34
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    signingConfigs {
        release {
            storeFile file("axion-release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias System.getenv("KEYSTORE_ALIAS") ?: "axion-key"
            keyPassword System.getenv("KEYSTORE_KEY_PASSWORD") ?: ""
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

    echo "🎨 Configuring themes and styles..."
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

    echo "📋 Ensuring google-services.json is in place..."
    if [ -f "google-services.json" ] && [ ! -f "android/app/google-services.json" ]; then
        cp google-services.json android/app/google-services.json
    fi

    if [ ! -f "android/app/axion-release.keystore" ]; then
        echo "⚠️ Keystore not found in android/app/, searching parent..."
        cp android/axion-release.keystore android/app/ 2>/dev/null || echo "❌ Error: Keystore file not found."
    fi

    echo "🚀 Starting build..."
    npm run build
    npx cap sync android
    cd android
    chmod +x gradlew
    ./gradlew clean assembleRelease
    
    mkdir -p ../output_apks
    cp app/build/outputs/apk/release/app-release.apk ../output_apks/signed-app-release.apk
    echo "✅ Build successful: output_apks/signed-app-release.apk"
REMOTESCRIPT

echo "✨ Build complete."
