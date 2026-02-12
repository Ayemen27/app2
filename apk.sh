#!/bin/bash
# AXION AI Build Engine v29.0.0 (The Final Resolution - Final Deployment)
# Professional Grade - Autonomous Remote Repair & Build Dispatch

set -e
SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"

log_local() { echo -e "\e[34m[AXION]\e[0m $1"; }

if [ -z "$SSH_PASS" ]; then
    log_local "❌ Error: SSH_PASSWORD not found."
    exit 1
fi

log_local "🚀 Deploying AXION Ultimate Build Engine v29.0.0..."

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "bash -s" <<'REMOTE_EOF'
    # Remote Execution Environment
    cd /home/administrator/app2
    
    # 1. Environment Restore (Node 22 is required for Capacitor 7/8)
    # We force the path to use the remote Node 22 bin
    export PATH="/home/administrator/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin"
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
    export PATH="$JAVA_HOME/bin:$PATH"

    # 2. Fix Build Configurations
    mkdir -p android/app/src/main/java/com/axion/app
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
            pickFirsts += 'META-INF/INDEX.LIST'
            pickFirsts += 'META-INF/io.netty.versions.properties'
            excludes += 'META-INF/*.kotlin_module'
            excludes += 'META-INF/ASL2.0'
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

    # 3. Remote Sync & Build Dispatch
    chmod +x ./apk.sh
    # Use 'nohup' or similar if we want to ensure it finishes after SSH disconnects, 
    # but for now we run it to get immediate feedback.
    ./apk.sh
REMOTE_EOF

log_local "✅ AXION Engine: Final dispatch completed successfully."
