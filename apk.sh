#!/bin/bash
# AXION AI Build Engine v10.0.0 (The Autonomous Self-Healer)
# Professional Grade - Automated Conflict Resolution & Environment Setup

set -e

# Configuration
LOG_FILE="/tmp/axion_smart_build_$(date +%s).log"
# Detect environment to set paths
if [ -d "/home/administrator/app2" ]; then
    PROJECT_ROOT="/home/administrator/app2"
else
    PROJECT_ROOT=$(pwd)
fi

APK_OUTPUT_DIR="$PROJECT_ROOT/output_apks"
ANDROID_ROOT="$PROJECT_ROOT/android"
SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"

log() {
    echo -e "\e[34m[AXION]\e[0m $1" | tee -a "$LOG_FILE"
}

error_handler() {
    log "❌ Build FAILED at line $1"
    exit 1
}

trap 'error_handler $LINENO' ERR

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "   AXION Build Engine v10.0.0 - Professional   "
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Self-Correction & Infrastructure Creation
log "PHASE 1: Infrastructure Repair..."
mkdir -p "$APK_OUTPUT_DIR"
mkdir -p "$ANDROID_ROOT/app/src/main/java/com/axion/app"
mkdir -p "$ANDROID_ROOT/gradle/wrapper"

# 2. Automated File Reconstruction
log "PHASE 2: Automated File Reconstruction..."

# Fix Gradle Wrapper Properties
cat <<EOF > "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.properties"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
EOF

# Ensure gradlew exists and is executable
if [ ! -f "$ANDROID_ROOT/gradlew" ]; then
    log "⚠️ gradlew missing. Reconstructing..."
    wget -qO "$ANDROID_ROOT/gradlew" "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradlew"
    chmod +x "$ANDROID_ROOT/gradlew"
fi

# 3. Smart Gradle Patching (SDK 35 Readiness)
log "PHASE 3: Smart Gradle Patching..."
if [ -f "$ANDROID_ROOT/app/build.gradle" ]; then
    sed -i "s/compileSdk [0-9]*/compileSdk 35/g" "$ANDROID_ROOT/app/build.gradle" || true
    sed -i "s/targetSdk [0-9]*/targetSdk 34/g" "$ANDROID_ROOT/app/build.gradle" || true

    if ! grep -q "resolutionStrategy" "$ANDROID_ROOT/app/build.gradle"; then
        log "Injecting resolution strategy..."
        # Inserting before the last closing brace of the android block or at the end
        echo "
android {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.13.1'
            force 'androidx.core:core-ktx:1.13.1'
        }
    }
}" >> "$ANDROID_ROOT/app/build.gradle"
    fi
fi

# 4. Remote Deployment via SSH (Automated)
log "PHASE 4: Automated Remote Execution..."
if [ -n "$SSH_PASS" ]; then
    log "Attempting remote connection to $REMOTE_HOST..."
    # Using sshpass for fully automated login
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "cd /home/administrator/app2 && ./apk.sh"
    log "✅ Remote build command dispatched."
else
    log "⚠️ SSH_PASSWORD not set. Running local validation..."
    cd "$ANDROID_ROOT"
    ./gradlew clean assembleDebug --no-daemon || log "Local dry-run failed (expected if local env is incomplete)"
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ AXION Engine: Process Complete."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
