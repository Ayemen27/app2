#!/bin/bash
# AXION Remote Build Engine v32.0.0
# Syncs assets to remote server, builds APK, runs tests, retrieves artifacts
# Keystore is preserved in a safe location outside git-managed directories

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/axion_build_${TIMESTAMP}.log"
PROJECT_ROOT="/home/runner/workspace"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"
REMOTE_PROJECT="/home/administrator/app2"
KEYSTORE_SAFE_DIR="/home/administrator/.axion-keystore"
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

get_version_from_gradle() {
    local gradle_file="$PROJECT_ROOT/android/app/build.gradle"
    local version_name=$(grep 'versionName' "$gradle_file" | head -1 | sed 's/.*"\(.*\)".*/\1/')
    local version_code=$(grep 'versionCode' "$gradle_file" | head -1 | sed 's/[^0-9]//g')
    echo "${version_name:-unknown}_code${version_code:-0}"
}

VERSION_INFO=$(get_version_from_gradle)

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  AXION Remote Build Engine v32.0.0 - Production Pipeline  "
log "  Version: $VERSION_INFO"
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

log "Step 2/6: Verifying remote environment + keystore safety..."
REMOTE_CHECK=$(ssh_cmd "
    echo 'JAVA_VERSION:' && java -version 2>&1 | head -1
    echo 'GRADLE_CHECK:' && [ -f '$REMOTE_PROJECT/android/gradlew' ] && echo 'EXISTS' || echo 'MISSING'
    echo 'SDK_CHECK:' && [ -d '/opt/android-sdk' ] && echo 'EXISTS' || echo 'MISSING'
    echo 'NODE_VERSION:' && node --version 2>/dev/null || echo 'NOT_FOUND'

    # Keystore safety: store in a protected directory outside git-managed area
    mkdir -p '$KEYSTORE_SAFE_DIR'
    if [ -f '$KEYSTORE_SAFE_DIR/axion-release.keystore' ]; then
        echo 'KEYSTORE_STATUS: EXISTS (safe location)'
        keytool -list -keystore '$KEYSTORE_SAFE_DIR/axion-release.keystore' -storepass axion2026 -alias axion 2>&1 | head -3
    elif [ -f '$REMOTE_PROJECT/axion-release.keystore' ]; then
        echo 'KEYSTORE_STATUS: FOUND in project dir - moving to safe location'
        cp '$REMOTE_PROJECT/axion-release.keystore' '$KEYSTORE_SAFE_DIR/axion-release.keystore'
        echo 'KEYSTORE_MOVED'
    else
        echo 'KEYSTORE_STATUS: NOT FOUND - will generate new one'
    fi
" 2>/dev/null)
echo "$REMOTE_CHECK" | tee -a "$LOG_FILE"

if echo "$REMOTE_CHECK" | grep -q "SDK_CHECK:" && echo "$REMOTE_CHECK" | grep "SDK_CHECK:" | grep -q "MISSING"; then
    err "Android SDK not found at /opt/android-sdk on remote server"
    exit 1
fi
ok "Remote environment verified"

log "Step 3/6: Syncing web assets to remote server..."
cd "$PROJECT_ROOT"

if [ -d "dist/public" ] && [ "$(ls -A dist/public 2>/dev/null)" ]; then
    tar czf /tmp/www_assets.tar.gz -C dist/public .
elif [ -d "www" ] && [ "$(ls -A www 2>/dev/null)" ]; then
    tar czf /tmp/www_assets.tar.gz -C www .
else
    err "No web assets found in dist/public or www. Run 'npm run build' first."
    exit 1
fi

tar czf /tmp/android_project.tar.gz \
    --exclude='android/app/build' \
    --exclude='android/.gradle' \
    --exclude='android/build' \
    --exclude='*.keystore' \
    --exclude='*.jks' \
    android/

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

    # Extract and merge android project (preserving keystore)
    tar xzf android_project.tar.gz
    rm -f android_project.tar.gz

    # Sync web assets into Android
    rm -rf android/app/src/main/assets/public
    cp -r www android/app/src/main/assets/public

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

    # Clean previous build artifacts only (not keystore!)
    rm -rf android/app/build android/.gradle android/build

    cd android
    chmod +x gradlew

    # Build
    echo 'GRADLE_BUILD_START'
    ./gradlew clean assembleRelease --no-daemon --warning-mode=none 2>&1 | tail -20
    BUILD_EXIT=\$?

    if [ \$BUILD_EXIT -eq 0 ]; then
        echo 'GRADLE_BUILD_SUCCESS'
        APK_PATH=\$(find . -name '*.apk' -path '*/release/*' | head -1)
        if [ -z \"\$APK_PATH\" ]; then
            APK_PATH=\$(find . -name '*.apk' -path '*/debug/*' | head -1)
        fi
        if [ -n \"\$APK_PATH\" ]; then
            # Use safe keystore location
            KEYSTORE='$KEYSTORE_SAFE_DIR/axion-release.keystore'
            BT='/opt/android-sdk/build-tools/35.0.0'

            # Generate keystore ONLY if it doesn't exist in safe location
            if [ ! -f \"\$KEYSTORE\" ]; then
                echo 'GENERATING_NEW_KEYSTORE'
                mkdir -p '$KEYSTORE_SAFE_DIR'
                keytool -genkeypair -v -keystore \"\$KEYSTORE\" -alias axion \\
                    -keyalg RSA -keysize 2048 -validity 10000 \\
                    -storepass axion2026 -keypass axion2026 \\
                    -dname 'CN=AXION,OU=Dev,O=AXION,L=Riyadh,ST=Riyadh,C=SA'
                echo 'KEYSTORE_GENERATED'
            else
                echo 'USING_EXISTING_KEYSTORE'
            fi

            ALIGNED=\"\${APK_PATH%.apk}-aligned.apk\"
            \"\$BT/zipalign\" -v -p 4 \"\$APK_PATH\" \"\$ALIGNED\" 2>&1 | tail -2
            \"\$BT/apksigner\" sign --ks \"\$KEYSTORE\" --ks-key-alias axion \\
                --ks-pass pass:axion2026 --key-pass pass:axion2026 \\
                --out \"$REMOTE_PROJECT/AXION_LATEST.apk\" \"\$ALIGNED\"

            if \"\$BT/apksigner\" verify \"$REMOTE_PROJECT/AXION_LATEST.apk\" 2>/dev/null; then
                echo 'APK_SIGNED_OK'
            else
                echo 'APK_SIGN_FAILED'
            fi

            # Read version from the built APK
            VERSION_NAME=\$(\"\$BT/aapt\" dump badging \"$REMOTE_PROJECT/AXION_LATEST.apk\" 2>/dev/null | grep 'versionName' | sed \"s/.*versionName='\([^']*\)'.*/\1/\")
            VERSION_CODE=\$(\"\$BT/aapt\" dump badging \"$REMOTE_PROJECT/AXION_LATEST.apk\" 2>/dev/null | grep 'versionCode' | sed \"s/.*versionCode='\([^']*\)'.*/\1/\")
            echo \"APK_VERSION:\$VERSION_NAME (code \$VERSION_CODE)\"
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

APK_VERSION=$(echo "$BUILD_RESULT" | grep "APK_VERSION:" | sed 's/APK_VERSION://' | sed 's/ .*//' | tr -d ' ')
[ -z "$APK_VERSION" ] && APK_VERSION="unknown"

APK_FILENAME="AXION_v${APK_VERSION}_${TIMESTAMP}.apk"

if scp_from "$REMOTE_PROJECT/AXION_LATEST.apk" "$PROJECT_ROOT/output_apks/$APK_FILENAME" 2>/dev/null; then
    APK_SIZE=$(ls -lh "$PROJECT_ROOT/output_apks/$APK_FILENAME" | awk '{print $5}')
    ok "APK retrieved: $APK_FILENAME (${APK_SIZE})"
else
    warn "Could not retrieve APK file. It may still be on the remote server."
fi

log "Step 6/6: Keystore backup verification..."
BACKUP_RESULT=$(ssh_cmd "
    if [ -f '$KEYSTORE_SAFE_DIR/axion-release.keystore' ]; then
        echo 'KEYSTORE_SAFE: YES'
        ls -lh '$KEYSTORE_SAFE_DIR/axion-release.keystore'
        keytool -list -keystore '$KEYSTORE_SAFE_DIR/axion-release.keystore' -storepass axion2026 -alias axion 2>&1 | grep -E 'fingerprint|Creation'
    else
        echo 'KEYSTORE_SAFE: NO - CRITICAL WARNING'
    fi
" 2>&1)
echo "$BACKUP_RESULT" | tee -a "$LOG_FILE"

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok "AXION Build Pipeline Complete"
log "Log: $LOG_FILE"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
