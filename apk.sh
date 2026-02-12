#!/bin/bash
# AXION AI Build Engine v14.0.0 (The Final Fix - Namespace & API Alignment)
# Professional Grade - Final Dependency and Namespace Resolution

set -e
LOG_FILE="/tmp/axion_final_fix_$(date +%s).log"
SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"

log() { echo -e "\e[34m[AXION]\e[0m $1" | tee -a "$LOG_FILE"; }
error_handler() { log "❌ Failure at line $1"; exit 1; }
trap 'error_handler $LINENO' ERR

log "🚀 Resolving Final Android Namespaces and Dependencies..."

if [ -z "$SSH_PASS" ]; then
    log "❌ Error: SSH_PASSWORD not found."
    exit 1
fi

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "bash -s" <<'REMOTE_EOF'
    cd /home/administrator/app2
    log() { echo ">>> $1"; }
    
    log "🛠️ PHASE 1: Dependency & Namespace Hard-Fix..."
    
    # 1. Update variables.gradle with correct Capacitor-friendly versions
    cat <<EOF > android/variables.gradle
ext {
    minSdkVersion = 24
    compileSdkVersion = 35
    targetSdkVersion = 34
    androidxActivityVersion = '1.9.0'
    androidxAppCompatVersion = '1.7.0'
    androidxCoreVersion = '1.13.1'
    androidxMaterialVersion = '1.12.0'
    androidxBrowserVersion = '1.8.0'
    androidxLocalBroadcastManagerVersion = '1.1.0'
    androidxExifInterfaceVersion = '1.3.7'
}
EOF

    # 2. Reconstruct App build.gradle with forced resolutions and correct plugins
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
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }

    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.13.1'
            force 'androidx.core:core-ktx:1.13.1'
            force 'androidx.appcompat:appcompat:1.7.0'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.google.android.material:material:1.12.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
    implementation platform('com.google.firebase:firebase-bom:33.1.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-messaging'
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text.contains('com.axion.app')) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.warn("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
EOF

    log "🛠️ PHASE 2: Re-triggering Build..."
    ./apk.sh
REMOTE_EOF

log "✅ AXION Engine: Final patch deployed. Build in progress."
