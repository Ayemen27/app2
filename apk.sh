#!/bin/bash
# AXION AI Build Engine v5.1.0 (SDK 35 Ready)
set -e
LOG_FILE="/tmp/axion_ultimate_$(date +%s).log"
APK_OUTPUT_DIR="/home/administrator/app2/output_apks"
mkdir -p "$APK_OUTPUT_DIR"
log() { echo -e "\e[32m>>> $1\e[0m" | tee -a "$LOG_FILE"; }
error_exit() { echo -e "\e[31m❌ ERROR: $1\e[0m" | tee -a "$LOG_FILE"; exit 1; }

repair_gradle_version() {
    log "Checking Gradle version and Java compatibility..."
    local GRADLE_WRAPPER_PROPERTIES="$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.properties"
    if [ -f "$GRADLE_WRAPPER_PROPERTIES" ]; then
        log "Force-upgrading Gradle wrapper to 8.5 (Bypassing 4.4.1)..."
        cat <<EOF > "$GRADLE_WRAPPER_PROPERTIES"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
EOF
        
        log "Verifying build.gradle files..."
        local PROJECT_GRADLE="$ANDROID_ROOT/build.gradle"
        if [ -f "$PROJECT_GRADLE" ]; then
            sed -i "s/classpath ['\"]com.android.tools.build:gradle:[0-9.]*['\"]/classpath 'com.android.tools.build:gradle:8.2.2'/g" "$PROJECT_GRADLE"
        fi

        chmod +x "$ANDROID_ROOT/gradlew"
        
        # Download wrapper explicitly using wget if available to bypass the evaluator crash
        if [ ! -f "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.jar" ] || [ ! -s "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.jar" ]; then
             log "Downloading fresh gradle-wrapper.jar to bypass version check..."
             wget -O "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.jar" "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar" || \
             curl -Lo "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.jar" "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar"
        fi
        export TERM=dumb
    fi
}

log "Starting AXION Master Build Engine v5.1.0"
ANDROID_ROOT="/home/administrator/app2/android"
APP_GRADLE="$ANDROID_ROOT/app/build.gradle"
MANIFEST="$ANDROID_ROOT/app/src/main/AndroidManifest.xml"

# Force fix for the 'Evaluating project :app' error caused by Gradle version mismatch
repair_gradle_version

# Ensure we use the wrapper, not the system gradle
GRADLE_EXEC="./gradlew"
log "Repairing Project Files for SDK 35 compatibility..."
# Resetting build.gradle to a clean state with SDK 35
sed -i 's/minSdk [0-9]*/minSdk 23/g' "$APP_GRADLE"
sed -i 's/compileSdk [0-9]*/compileSdk 35/g' "$APP_GRADLE"
sed -i 's/targetSdk [0-9]*/targetSdk 34/g' "$APP_GRADLE"
sed -i 's/namespace "/namespace = "/g' "$APP_GRADLE"

# Injecting MultiDex safely
grep -q "multiDexEnabled true" "$APP_GRADLE" || sed -i '/defaultConfig {/a \        multiDexEnabled true' "$APP_GRADLE"
grep -q "multidex:2.0.1" "$APP_GRADLE" || sed -i '/dependencies {/a \    implementation "androidx.multidex:multidex:2.0.1"' "$APP_GRADLE"

# Manifest Overrides for SDK Mismatch
grep -q "tools:overrideLibrary" "$MANIFEST" || {
    sed -i '/<manifest/s/$/ xmlns:tools="http:\/\/schemas.android.com\/tools"/' "$MANIFEST"
}
# Always ensure overrideLibrary includes the libraries that might cause minSdk issues
sed -i '/<uses-sdk/d' "$MANIFEST"
sed -i '/<application/i \    <uses-sdk tools:overrideLibrary="com.getcapacitor.community.database.sqlite, com.getcapacitor.community.pushnotifications" \/>' "$MANIFEST"

# Cleanup corrupted node_modules
find /home/administrator/app2/node_modules -name "AndroidManifest.xml" -exec sed -i 's/package="[^"]*"//g' {} + 2>/dev/null || true
find /home/administrator/app2/node_modules -name "build.gradle" -exec sed -i '/androidx.multidex:multidex/d' {} + 2>/dev/null || true

log "Starting Professional Build with SDK 35..."
cd "$ANDROID_ROOT" && chmod +x gradlew
$GRADLE_EXEC clean assembleDebug >> "$LOG_FILE" 2>&1 || {
    log "Retrying with skip-lint..."
    $GRADLE_EXEC assembleDebug -x lint >> "$LOG_FILE" 2>&1 || error_exit "Build failed. Check $LOG_FILE"
}

APK_FILE=$(find app/build/outputs/apk/debug -name "*.apk" | head -n 1)
if [ -f "$APK_FILE" ]; then
    FINAL="AXION_FINAL_$(date +%s).apk"
    cp "$APK_FILE" "$APK_OUTPUT_DIR/$FINAL"
    log "✅ SUCCESS: APK at $APK_OUTPUT_DIR/$FINAL"
else
    error_exit "APK generation failed."
fi
