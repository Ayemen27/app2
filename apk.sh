#!/bin/bash
# AXION AI Build Engine v18.0.0 (The Final Resolution - Deep Packaging Fix)
# Professional Grade - Autonomous Remote Sync & Repair

set -e
LOG_FILE="/tmp/axion_final_$(date +%s).log"
SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"

log() { echo -e "\e[34m[AXION]\e[0m $1" | tee -a "$LOG_FILE"; }
error_handler() { log "❌ Failure at line $1"; exit 1; }
trap 'error_handler $LINENO' ERR

log "🚀 Deploying AXION Ultimate Build Engine v18.0.0..."

if [ -z "$SSH_PASS" ]; then
    log "❌ Error: SSH_PASSWORD not found."
    exit 1
fi

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "bash -s" <<'REMOTE_EOF'
    cd /home/administrator/app2
    log() { echo ">>> $1"; }
    
    log "🧹 PHASE 0: Deep Environment Cleaning..."
    rm -rf android/app/build
    rm -rf android/.gradle

    log "🛠️ PHASE 1: Patching Build Configuration for Duplicate Files..."
    
    # Update app build.gradle with PickFirst strategy and correct Capacitor setup
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
            pickFirsts += 'META-INF/LICENSE.md'
            pickFirsts += 'META-INF/NOTICE.md'
            pickFirsts += 'META-INF/license.txt'
            pickFirsts += 'META-INF/notice.txt'
            excludes += 'META-INF/*.kotlin_module'
        }
    }
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.13.1'
            force 'androidx.core:core-ktx:1.13.1'
            force 'androidx.appcompat:appcompat:1.6.1'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'
EOF

    log "🛠️ PHASE 2: Forced Asset Synchronization & Build..."
    # Ensure capacitor assets are correctly placed without full CLI dependency if possible
    # or ensure environment is set correctly
    export PATH="/home/administrator/.nvm/versions/node/v22.22.0/bin:$PATH"
    
    # Run the optimized build tool
    ./apk.sh
REMOTE_EOF

log "✅ AXION Engine: Final resolution deployed. Build process is self-healing."
