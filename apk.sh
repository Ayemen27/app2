#!/bin/bash
# AXION AI Build Engine v15.0.0 (The Final Architect - Clean Environment)
# Professional Grade - Remote Workspace Purge & Precision Reconstruction

set -e
LOG_FILE="/tmp/axion_architect_$(date +%s).log"
SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"

log() { echo -e "\e[34m[AXION]\e[0m $1" | tee -a "$LOG_FILE"; }
error_handler() { log "❌ Failure at line $1"; exit 1; }
trap 'error_handler $LINENO' ERR

log "🏗️ Initiating AXION Remote Workspace Reconstruction v15.0.0..."

if [ -z "$SSH_PASS" ]; then
    log "❌ Error: SSH_PASSWORD not found."
    exit 1
fi

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "bash -s" <<'REMOTE_EOF'
    cd /home/administrator/app2
    log() { echo ">>> $1"; }
    
    log "🧹 PHASE 0: Cleaning Broken Android Structure..."
    rm -rf android
    mkdir -p android/app/src/main/java/com/axion/app
    mkdir -p android/app/src/main/res/values
    mkdir -p android/gradle/wrapper

    log "🛠️ PHASE 1: Reconstructing Core Files..."

    # 1. Root build.gradle
    cat <<EOF > android/build.gradle
buildscript {
    repositories { google(); mavenCentral() }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
        classpath 'com.google.gms:google-services:4.4.1'
    }
}
allprojects {
    repositories { google(); mavenCentral() }
}
EOF

    # 2. App build.gradle
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
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.13.1'
            force 'androidx.core:core-ktx:1.13.1'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-analytics'
}
EOF

    # 3. settings.gradle
    echo "include ':app'" > android/settings.gradle

    # 4. variables.gradle
    cat <<EOF > android/variables.gradle
ext {
    minSdkVersion = 24
    compileSdkVersion = 35
    targetSdkVersion = 34
    androidxCoreVersion = '1.13.1'
}
EOF

    # 5. MainActivity.java
    cat <<EOF > android/app/src/main/java/com/axion/app/MainActivity.java
package com.axion.app;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {}
EOF

    # 6. AndroidManifest.xml
    cat <<EOF > android/app/src/main/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:label="AXION"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

    # 7. google-services.json
    cat <<EOF > android/app/google-services.json
{
  "project_info": { "project_number": "364100399820", "project_id": "app2-eb4df", "storage_bucket": "app2-eb4df.firebasestorage.app" },
  "client": [
    {
      "client_info": { "mobilesdk_app_id": "1:364100399820:android:05fb7a9df8da1b771cc869", "android_client_info": { "package_name": "com.axion.app" } },
      "api_key": [ { "current_key": "AIzaSyBhVNHGcHWZqbbInv9WUZeyBoPEx3yvN8U" } ],
      "services": { "appinvite_service": { "other_platform_oauth_client": [] } }
    }
  ],
  "configuration_version": "1"
}
EOF

    # 8. Gradle Wrapper
    cat <<EOF > android/gradle/wrapper/gradle-wrapper.properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
EOF
    wget -qO android/gradlew "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradlew"
    chmod +x android/gradlew

    log "🛠️ PHASE 2: Final Build Dispatch..."
    ./apk.sh
REMOTE_EOF

log "✅ AXION Engine: Full remote reconstruction and build dispatched."
