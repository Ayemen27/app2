#!/bin/bash
set -e

LOG_FILE="/tmp/axion_smart_build_$(date +%s).log"
PROJECT_ROOT=$(pwd)
APK_OUTPUT_DIR="$PROJECT_ROOT/output_apks"
ANDROID_ROOT="$PROJECT_ROOT/android"

SSH_PASS="${SSH_PASSWORD}"
REMOTE_HOST="93.127.142.144"
REMOTE_USER="administrator"
REMOTE_PROJECT="/home/administrator/app2"

BUILD_TYPE="${BUILD_TYPE:-release}"
KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-}"
KEYSTORE_ALIAS="${KEYSTORE_ALIAS:-axion-key}"
KEYSTORE_KEY_PASSWORD="${KEYSTORE_KEY_PASSWORD:-$KEYSTORE_PASSWORD}"

log() {
    echo -e "\e[34m[AXION]\e[0m $1" | tee -a "$LOG_FILE"
}

ok() {
    echo -e "\e[32m[OK]\e[0m $1" | tee -a "$LOG_FILE"
}

err() {
    echo -e "\e[31m[ERROR]\e[0m $1" | tee -a "$LOG_FILE"
}

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "   AXION Build Engine v32.0.0 - com.axion.app    "
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Build type: $BUILD_TYPE"

if [ "$BUILD_TYPE" = "release" ] && [ -z "$KEYSTORE_PASSWORD" ]; then
    err "KEYSTORE_PASSWORD environment variable is required for release builds."
    err "Set it via: export KEYSTORE_PASSWORD=your_password"
    exit 1
fi

if [ "$HOSTNAME" == "mr-199" ] || [ -d "/home/administrator/app2" ]; then
    log "Mode: [REMOTE SERVER] - Starting Native Build..."
    
    export PATH="/home/administrator/.nvm/versions/node/v22.22.0/bin:$PATH"
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
    export PATH="$JAVA_HOME/bin:$PATH"
    export ANDROID_HOME="/opt/android-sdk"
    export PATH="$ANDROID_HOME/platform-tools:$PATH"

    mkdir -p android/app/src/main/java/com/axion/app

    if [ -f "google-services.json" ] && [ ! -f "android/app/google-services.json" ]; then
        cp google-services.json android/app/google-services.json
        ok "Copied google-services.json to android/app/"
    fi

    rm -rf android/app/build android/.gradle android/build

    if [ "$BUILD_TYPE" = "release" ]; then
        log "Launching Gradle Release Build..."
        cd android && chmod +x gradlew
        ./gradlew clean assembleRelease --no-daemon --warning-mode=none 2>&1 | tail -20
        BUILD_EXIT=$?
        APK_SEARCH_PATH="*/release/*"
    else
        log "Launching Gradle Debug Build..."
        cd android && chmod +x gradlew
        ./gradlew clean assembleDebug --no-daemon --warning-mode=none 2>&1 | tail -20
        BUILD_EXIT=$?
        APK_SEARCH_PATH="*/debug/*"
    fi
    
    if [ $BUILD_EXIT -eq 0 ]; then
        APK_PATH=$(find . -name '*.apk' -path "$APK_SEARCH_PATH" | head -1)
        if [ -z "$APK_PATH" ]; then
            APK_PATH=$(find . -name '*.apk' | head -1)
        fi
        if [ -n "$APK_PATH" ]; then
            cp "$APK_PATH" "$PROJECT_ROOT/AXION_LATEST.apk"
            ok "APK built: $(ls -lh $PROJECT_ROOT/AXION_LATEST.apk | awk '{print $5}')"
        else
            err "APK not found after build"
            exit 1
        fi
    else
        err "Gradle build failed"
        exit 1
    fi
    
else
    log "Mode: [REPLIT ENVIRONMENT] - Remote Deployment..."
    
    if [ -z "$SSH_PASS" ]; then
        err "SSH_PASSWORD not found in environment secrets."
        exit 1
    fi

    log "Step 1: Building web assets..."
    cd "$PROJECT_ROOT"
    npm run build:client 2>&1 | tail -5
    ok "Web assets built ($(du -sh www | awk '{print $1}'))"

    log "Step 2: Syncing to remote server..."
    tar czf /tmp/www_assets.tar.gz -C www .
    tar czf /tmp/android_project.tar.gz \
        --exclude='android/app/build' \
        --exclude='android/.gradle' \
        --exclude='android/build' \
        android/ capacitor.config.json google-services.json apk.sh

    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no /tmp/www_assets.tar.gz "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PROJECT/www_assets.tar.gz"
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no /tmp/android_project.tar.gz "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PROJECT/android_project.tar.gz"
    ok "Assets synced"

    GRADLE_TASK="assembleDebug"
    APK_SUBPATH="debug"
    if [ "$BUILD_TYPE" = "release" ]; then
        GRADLE_TASK="assembleRelease"
        APK_SUBPATH="release"
    fi

    log "Step 3: Building $BUILD_TYPE APK on remote server..."
    BUILD_RESULT=$(sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$REMOTE_USER@$REMOTE_HOST" "
        cd $REMOTE_PROJECT

        mkdir -p www
        tar xzf www_assets.tar.gz -C www/
        rm -f www_assets.tar.gz

        tar xzf android_project.tar.gz
        rm -f android_project.tar.gz

        rm -rf android/app/src/main/assets/public
        mkdir -p android/app/src/main/assets/public
        cp -r www/* android/app/src/main/assets/public/

        cp capacitor.config.json android/app/src/main/assets/capacitor.config.json

        if [ -f google-services.json ] && [ ! -f android/app/google-services.json ]; then
            cp google-services.json android/app/google-services.json
        fi

        export JAVA_HOME='/usr/lib/jvm/java-21-openjdk-amd64'
        export PATH=\"\$JAVA_HOME/bin:\$PATH\"
        export ANDROID_HOME='/opt/android-sdk'
        export PATH=\"\$ANDROID_HOME/platform-tools:\$PATH\"

        export KEYSTORE_PASSWORD='${KEYSTORE_PASSWORD}'
        export KEYSTORE_ALIAS='${KEYSTORE_ALIAS}'
        export KEYSTORE_KEY_PASSWORD='${KEYSTORE_KEY_PASSWORD}'

        cat > android/gradle/wrapper/gradle-wrapper.properties << 'GWEOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-all.zip
GWEOF

        mkdir -p android/capacitor-cordova-android-plugins/src/main/java
        [ ! -f android/capacitor-cordova-android-plugins/cordova.variables.gradle ] && cat > android/capacitor-cordova-android-plugins/cordova.variables.gradle << 'CVEOF'
ext {
    cdvMinSdkVersion = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
    cdvCompileSdkVersion = project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
    cdvTargetSdkVersion = project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 35
}
CVEOF

        rm -rf android/app/build android/.gradle android/build

        cd android
        chmod +x gradlew

        echo 'GRADLE_BUILD_START'
        ./gradlew clean $GRADLE_TASK --no-daemon --warning-mode=none 2>&1 | tail -20
        BUILD_EXIT=\$?

        if [ \$BUILD_EXIT -eq 0 ]; then
            echo 'GRADLE_BUILD_SUCCESS'
            APK_PATH=\$(find . -name '*.apk' -path '*/$APK_SUBPATH/*' | head -1)
            if [ -z \"\$APK_PATH\" ]; then
                APK_PATH=\$(find . -name '*.apk' | head -1)
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
        fi
    " 2>&1)

    echo "$BUILD_RESULT" | tee -a "$LOG_FILE"

    if echo "$BUILD_RESULT" | grep -q "GRADLE_BUILD_SUCCESS"; then
        ok "APK built successfully"
    else
        err "Build failed. Check log: $LOG_FILE"
        exit 1
    fi

    log "Step 4: Retrieving APK..."
    mkdir -p "$APK_OUTPUT_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    APK_FILENAME="AXION_${BUILD_TYPE}_${TIMESTAMP}.apk"
    if sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PROJECT/AXION_LATEST.apk" "$APK_OUTPUT_DIR/$APK_FILENAME" 2>/dev/null; then
        APK_SIZE=$(ls -lh "$APK_OUTPUT_DIR/$APK_FILENAME" | awk '{print $5}')
        ok "APK retrieved: $APK_FILENAME (${APK_SIZE})"
    else
        err "Could not retrieve APK"
        exit 1
    fi
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok "AXION Build Engine: Complete ($BUILD_TYPE)"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
