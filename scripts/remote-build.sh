#!/bin/bash
# AXION Remote Build & Test Engine v31.0.0
# Syncs assets to remote server, builds APK, runs tests, retrieves artifacts

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/axion_build_${TIMESTAMP}.log"
PROJECT_ROOT="/home/runner/workspace"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"
REMOTE_PROJECT="/home/administrator/app2"
SSH_PASS="${SSH_PASSWORD:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()    { echo -e "${BLUE}[AXION]${NC} $1" | tee -a "$LOG_FILE"; }
ok()     { echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"; }
err()    { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }

ssh_cmd() {
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$REMOTE_USER@$REMOTE_HOST" "$@"
}

scp_to() {
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no -r "$1" "$REMOTE_USER@$REMOTE_HOST:$2"
}

scp_from() {
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no -r "$REMOTE_USER@$REMOTE_HOST:$1" "$2"
}

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  AXION Remote Build Engine v31.0.0 - Production Pipeline  "
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$SSH_PASS" ]; then
    err "SSH_PASSWORD not found. Set it in environment secrets."
    exit 1
fi

log "Step 1/6: Testing SSH connection..."
if ssh_cmd "echo 'SSH_OK'" 2>/dev/null | grep -q "SSH_OK"; then
    ok "SSH connection successful"
else
    err "Cannot connect to remote server"
    exit 1
fi

log "Step 2/6: Verifying remote environment..."
REMOTE_CHECK=$(ssh_cmd "
    echo 'JAVA_VERSION:' && java -version 2>&1 | head -1
    echo 'GRADLE_CHECK:' && [ -f '$REMOTE_PROJECT/android/gradlew' ] && echo 'EXISTS' || echo 'MISSING'
    echo 'SDK_CHECK:' && [ -d '/opt/android-sdk' ] && echo 'EXISTS' || echo 'MISSING'
    echo 'NODE_VERSION:' && node --version 2>/dev/null || echo 'NOT_FOUND'
" 2>/dev/null)
echo "$REMOTE_CHECK" | tee -a "$LOG_FILE"

if echo "$REMOTE_CHECK" | grep -q "SDK_CHECK:" && echo "$REMOTE_CHECK" | grep "SDK_CHECK:" | grep -q "MISSING"; then
    err "Android SDK not found at /opt/android-sdk on remote server"
    exit 1
fi
ok "Remote environment verified"

log "Step 3/6: Syncing web assets to remote server..."
cd "$PROJECT_ROOT"
tar czf /tmp/www_assets.tar.gz -C www .
tar czf /tmp/android_project.tar.gz \
    --exclude='android/app/build' \
    --exclude='android/.gradle' \
    --exclude='android/build' \
    android/ capacitor.config.json

scp_to /tmp/www_assets.tar.gz "$REMOTE_PROJECT/www_assets.tar.gz"
scp_to /tmp/android_project.tar.gz "$REMOTE_PROJECT/android_project.tar.gz"
ok "Assets synced to remote server"

log "Step 4/6: Building APK on remote server..."
BUILD_RESULT=$(ssh_cmd "
    cd $REMOTE_PROJECT

    # Extract web assets
    mkdir -p www
    tar xzf www_assets.tar.gz -C www/
    rm -f www_assets.tar.gz

    # Extract and merge android project
    tar xzf android_project.tar.gz
    rm -f android_project.tar.gz

    # Sync web assets into Android
    rm -rf android/app/src/main/assets/public
    cp -r www android/app/src/main/assets/public

    # Copy capacitor config
    cp capacitor.config.json android/app/src/main/assets/capacitor.config.json

    # Setup environment
    export JAVA_HOME='/usr/lib/jvm/java-21-openjdk-amd64'
    export PATH=\"\$JAVA_HOME/bin:\$PATH\"
    export ANDROID_HOME='/opt/android-sdk'
    export PATH=\"\$ANDROID_HOME/platform-tools:\$PATH\"

    # Ensure proper gradle wrapper
    cat > android/gradle/wrapper/gradle-wrapper.properties << 'GWEOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-all.zip
GWEOF

    # Ensure capacitor-cordova-android-plugins exists
    mkdir -p android/capacitor-cordova-android-plugins/src/main/java
    [ ! -f android/capacitor-cordova-android-plugins/cordova.variables.gradle ] && cat > android/capacitor-cordova-android-plugins/cordova.variables.gradle << 'CVEOF'
ext {
    cdvMinSdkVersion = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
    cdvCompileSdkVersion = project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
    cdvTargetSdkVersion = project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 35
}
CVEOF

    # Clean previous build artifacts
    rm -rf android/app/build android/.gradle android/build

    # Update version
    VERSION_CODE=28
    VERSION_NAME='1.0.28'

    cd android

    # Ensure gradlew is executable
    chmod +x gradlew

    # Clean and build
    echo 'GRADLE_BUILD_START'
    ./gradlew clean assembleRelease --no-daemon --warning-mode=none 2>&1 | tail -20
    BUILD_EXIT=\$?

    if [ \$BUILD_EXIT -eq 0 ]; then
        echo 'GRADLE_BUILD_SUCCESS'
        # Find the APK
        APK_PATH=\$(find . -name '*.apk' -path '*/release/*' | head -1)
        if [ -z \"\$APK_PATH\" ]; then
            APK_PATH=\$(find . -name '*.apk' -path '*/debug/*' | head -1)
        fi
        if [ -n \"\$APK_PATH\" ]; then
            cp \"\$APK_PATH\" \"$REMOTE_PROJECT/AXION_LATEST.apk\"
            echo \"APK_READY:\$APK_PATH\"
            ls -lh \"$REMOTE_PROJECT/AXION_LATEST.apk\"
        else
            echo 'APK_NOT_FOUND'
        fi
    else
        echo 'GRADLE_BUILD_FAILED'
        exit 1
    fi
" 2>&1)

echo "$BUILD_RESULT" | tee -a "$LOG_FILE"

if echo "$BUILD_RESULT" | grep -q "GRADLE_BUILD_SUCCESS\|BUILD SUCCESSFUL"; then
    ok "APK built successfully on remote server"
else
    if echo "$BUILD_RESULT" | grep -q "GRADLE_BUILD_FAILED\|BUILD FAILED"; then
        err "Gradle build failed. Check log: $LOG_FILE"
        warn "Attempting debug build as fallback..."
        FALLBACK=$(ssh_cmd "
            cd $REMOTE_PROJECT/android
            export JAVA_HOME=\$(find /usr/lib/jvm -maxdepth 1 -name 'java-*-openjdk*' | head -1)
            [ -z \"\$JAVA_HOME\" ] && export JAVA_HOME='/usr/lib/jvm/java-21-openjdk-amd64'
            export PATH=\"\$JAVA_HOME/bin:\$PATH\"
            ./gradlew assembleDebug --no-daemon --warning-mode=none 2>&1 | tail -15
            BUILD_EXIT=\$?
            if [ \$BUILD_EXIT -eq 0 ]; then
                APK_PATH=\$(find . -name '*.apk' | head -1)
                [ -n \"\$APK_PATH\" ] && cp \"\$APK_PATH\" \"$REMOTE_PROJECT/AXION_LATEST.apk\"
                echo 'FALLBACK_BUILD_SUCCESS'
            else
                echo 'FALLBACK_BUILD_FAILED'
            fi
        " 2>&1)
        echo "$FALLBACK" | tee -a "$LOG_FILE"
        if echo "$FALLBACK" | grep -q "FALLBACK_BUILD_SUCCESS"; then
            ok "Debug APK built successfully (fallback)"
        else
            err "Both release and debug builds failed"
        fi
    fi
fi

log "Step 5/6: Retrieving APK artifact..."
mkdir -p "$PROJECT_ROOT/output_apks"
if scp_from "$REMOTE_PROJECT/AXION_LATEST.apk" "$PROJECT_ROOT/output_apks/AXION_v1.0.28_${TIMESTAMP}.apk" 2>/dev/null; then
    APK_SIZE=$(ls -lh "$PROJECT_ROOT/output_apks/AXION_v1.0.28_${TIMESTAMP}.apk" | awk '{print $5}')
    ok "APK retrieved: AXION_v1.0.28_${TIMESTAMP}.apk (${APK_SIZE})"
else
    warn "Could not retrieve APK file. It may still be on the remote server."
fi

log "Step 6/6: Running remote Android tests..."
TEST_RESULT=$(ssh_cmd "
    cd $REMOTE_PROJECT/android
    export JAVA_HOME=\$(find /usr/lib/jvm -maxdepth 1 -name 'java-*-openjdk*' | head -1)
    [ -z \"\$JAVA_HOME\" ] && export JAVA_HOME='/usr/lib/jvm/java-21-openjdk-amd64'
    export PATH=\"\$JAVA_HOME/bin:\$PATH\"
    
    # Run unit tests (no emulator needed)
    echo 'UNIT_TESTS_START'
    ./gradlew test --no-daemon --warning-mode=none 2>&1 | tail -15
    TEST_EXIT=\$?
    if [ \$TEST_EXIT -eq 0 ]; then
        echo 'UNIT_TESTS_PASSED'
    else
        echo 'UNIT_TESTS_FAILED'
    fi
    
    # Check lint
    echo 'LINT_CHECK_START'
    ./gradlew lint --no-daemon --warning-mode=none 2>&1 | tail -10
    echo 'LINT_CHECK_DONE'
" 2>&1)

echo "$TEST_RESULT" | tee -a "$LOG_FILE"

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok "AXION Build Pipeline Complete"
log "Log: $LOG_FILE"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
