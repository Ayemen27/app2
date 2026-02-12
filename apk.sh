#!/bin/bash
# AXION AI Build Engine v30.0.0 (The Final Hybrid - Professional Edition)
# Professional Grade - Handles local validation AND remote deployment autonomously

set -e

# Configuration
LOG_FILE="/tmp/axion_smart_build_$(date +%s).log"
PROJECT_ROOT=$(pwd)
APK_OUTPUT_DIR="$PROJECT_ROOT/output_apks"
ANDROID_ROOT="$PROJECT_ROOT/android"

# External Server Details (From Environment)
SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"

log() {
    echo -e "\e[34m[AXION]\e[0m $1" | tee -a "$LOG_FILE"
}

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "   AXION Build Engine v30.0.0 - Professional   "
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Decision Logic: Are we on the remote server or local environment?
if [ "$HOSTNAME" == "mr-199" ] || [ -d "/home/administrator/app2" ]; then
    log "📍 Mode: [REMOTE SERVER] - Starting Native Build..."
    
    # 1. Environment Sync (Remote specific)
    export PATH="/home/administrator/.nvm/versions/node/v22.22.0/bin:$PATH"
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
    export PATH="$JAVA_HOME/bin:$PATH"

    # 2. Reconstruct Core Files (Ensures structural integrity)
    mkdir -p android/app/src/main/java/com/axion/app
    
    # 3. Packaging & Conflict Resolution
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
        }
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
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
}
apply from: 'capacitor.build.gradle'
EOF

    # 4. Execute Native Build Logic (Re-using the remote's existing build engine if present, or triggering gradlew)
    log "🚀 Launching Gradle Build..."
    cd android && ./gradlew clean assembleDebug --no-daemon
    
else
    log "📍 Mode: [REPLIT ENVIRONMENT] - Orchestrating Remote Deployment..."
    
    if [ -z "$SSH_PASS" ]; then
        log "❌ Error: SSH_PASSWORD not found in environment."
        log "Please ensure the secret SSH_PASSWORD is set in Replit Secrets."
        exit 1
    fi

    log "🔗 Connecting to $REMOTE_HOST via SSH..."
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "cd /home/administrator/app2 && ./apk.sh"
    log "✅ Remote build sequence initiated successfully."
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ AXION Engine: Operation Complete."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
