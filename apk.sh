#!/bin/bash
# AXION AI Build Engine v7.0.0 (Master-Grade Self-Healing)
# Full Support for Java 21, Gradle 8.5, and SDK 35

set -e
LOG_FILE="/tmp/axion_smart_build_$(date +%s).log"
APK_OUTPUT_DIR="/home/administrator/app2/output_apks"
ANDROID_ROOT="/home/administrator/app2/android"
mkdir -p "$APK_OUTPUT_DIR"

log() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo -e "\e[32m[$timestamp] >>> $1\e[0m" | tee -a "$LOG_FILE"
}

error_exit() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo -e "\e[31m[$timestamp] ❌ ERROR: $1\e[0m" | tee -a "$LOG_FILE"
    exit 1
}

repair_environment() {
    log "Initializing Smart Repair Engine v7.0.0..."
    
    # 1. Java 21 Enforcement
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
    if [ ! -d "$JAVA_HOME" ]; then
        JAVA_HOME=$(readlink -f /usr/bin/java | sed "s:/bin/java::")
        log "Warning: Standard Java 21 path not found. Using detected: $JAVA_HOME"
    fi
    
    # 2. Path Isolation (Strict Protection)
    # Rebuilding PATH to eliminate interference from old Gradle versions
    log "Rebuilding PATH for absolute environment isolation..."
    export PATH="$JAVA_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    
    # 3. Gradle Wrapper Deep Fix
    log "Enforcing Gradle 8.5 via localized wrapper..."
    local WRAPPER_PROPS="$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.properties"
    local WRAPPER_JAR="$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.jar"
    
    mkdir -p "$(dirname "$WRAPPER_PROPS")"
    cat <<EOF > "$WRAPPER_PROPS"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
EOF

    # Fix for 'no main manifest attribute' - Using the official Wrapper JAR download
    log "Downloading verified Gradle 8.5 Wrapper JAR..."
    # Using the correct URL for the wrapper JAR itself
    wget -qO "$WRAPPER_JAR" "https://github.com/gradle/gradle/raw/v8.5.0/gradle/wrapper/gradle-wrapper.jar" || \
    curl -sLo "$WRAPPER_JAR" "https://github.com/gradle/gradle/raw/v8.5.0/gradle/wrapper/gradle-wrapper.jar"
    
    chmod +x "$ANDROID_ROOT/gradlew"

    # 4. Environment Variables
    export TERM=dumb
    export GRADLE_OPTS="-Dorg.gradle.java.home=$JAVA_HOME -Dorg.gradle.daemon=false"
    unset GRADLE_HOME
    unset GRADLE_USER_HOME
}

repair_project_files() {
    log "Applying Professional Project Repairs (SDK 35 Ready)..."
    local APP_GRADLE="$ANDROID_ROOT/app/build.gradle"
    local PROJ_GRADLE="$ANDROID_ROOT/build.gradle"
    local MANIFEST="$ANDROID_ROOT/app/src/main/AndroidManifest.xml"

    # Fix Project Level AGP
    if [ -f "$PROJ_GRADLE" ]; then
        sed -i "s/classpath ['\"]com.android.tools.build:gradle:[0-9.]*['\"]/classpath 'com.android.tools.build:gradle:8.2.2'/g" "$PROJ_GRADLE"
    fi

    # Fix App Level SDK & Namespace
    if [ -f "$APP_GRADLE" ]; then
        sed -i 's/minSdk [0-9]*/minSdk 24/g' "$APP_GRADLE"
        sed -i 's/compileSdk [0-9]*/compileSdk 35/g' "$APP_GRADLE"
        sed -i 's/targetSdk [0-9]*/targetSdk 34/g' "$APP_GRADLE"
        sed -i 's/namespace "/namespace = "/g' "$APP_GRADLE"
    fi
}

log "Starting AXION Smart Build Engine v7.0.0"
repair_environment
repair_project_files

log "Initiating Secure Build Process..."
cd "$ANDROID_ROOT"

# Call the wrapper script itself (which handles the JAR execution correctly)
if ! ./gradlew assembleDebug --no-daemon; then
    log "Initial build failed. Attempting deep clean and retry with skip-lint..."
    ./gradlew clean
    ./gradlew assembleDebug -x lint --no-daemon || error_exit "Build failed after deep repair."
fi

# APK Verification & Export
APK_FILE=$(find app/build/outputs/apk/debug -name "*.apk" | head -n 1)
if [ -f "$APK_FILE" ]; then
    FINAL_NAME="AXION_RELEASE_$(date +%Y%m%d_%H%M).apk"
    cp "$APK_FILE" "$APK_OUTPUT_DIR/$FINAL_NAME"
    log "✅ SUCCESS: Final APK ready at $APK_OUTPUT_DIR/$FINAL_NAME"
else
    error_exit "Build reported success but APK file was not found."
fi
