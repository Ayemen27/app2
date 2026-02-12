#!/bin/bash
# AXION AI Build Engine v22.0.0 (The Final Resolution - Deep Asset & Manifest Alignment)
# Professional Grade - Autonomous Remote Sync & Repair

set -e
SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"

log() { echo -e "\e[34m[AXION]\e[0m $1"; }

if [ -z "$SSH_PASS" ]; then
    log "❌ Error: SSH_PASSWORD not found."
    exit 1
fi

log "🚀 Deploying AXION Final Resolution Engine v22.0.0..."

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "bash -s" <<'REMOTE_EOF'
    cd /home/administrator/app2
    
    # 1. Purge and Reconstruct Manifest & Values for fresh build
    mkdir -p android/app/src/main/res/values
    cat <<EOF > android/app/src/main/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">AXION</string>
    <string name="title_activity_main">AXION</string>
    <string name="package_name">com.axion.app</string>
    <string name="custom_url_scheme">com.axion.app</string>
</resources>
EOF

    cat <<EOF > android/app/src/main/res/values/styles.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
    </style>
    <style name="AppTheme.NoActionBar.Launch" parent="AppTheme.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>
</resources>
EOF

    # 2. Re-apply Packaging Fix with broader exclusions
    cat <<EOF > android/app/build.gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'

android {
    namespace 'com.axion.app'
    compileSdk 35
    defaultConfig {
        applicationId "com.axion.app"
        minSdk 24
        targetSdk 34
        versionCode 27
        versionName "1.0.27"
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }
    packagingOptions {
        resources {
            pickFirsts += 'META-INF/AL2.0'
            pickFirsts += 'META-INF/LGPL2.1'
            pickFirsts += 'META-INF/DEPENDENCIES'
            pickFirsts += 'META-INF/LICENSE'
            pickFirsts += 'META-INF/NOTICE'
            pickFirsts += 'META-INF/license.txt'
            pickFirsts += 'META-INF/notice.txt'
            excludes += 'META-INF/*.kotlin_module'
            excludes += 'META-INF/INDEX.LIST'
        }
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
}
apply from: 'capacitor.build.gradle'
EOF

    # 3. Final Build Dispatch
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
    export PATH="\$JAVA_HOME/bin:/usr/local/bin:/usr/bin:/bin"
    ./apk.sh
REMOTE_EOF

log "✅ AXION Engine: Final resolution dispatched. All conflicts resolved."
