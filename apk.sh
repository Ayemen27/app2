#!/bin/bash
# AXION AI Build Engine v5.1.0 (SDK 35 Ready)
set -e
LOG_FILE="/tmp/axion_ultimate_$(date +%s).log"
APK_OUTPUT_DIR="/home/administrator/app2/output_apks"
mkdir -p "$APK_OUTPUT_DIR"

log() { echo -e "\e[32m>>> $1\e[0m" >> "$LOG_FILE" 2>&1; echo -e "\e[32m>>> $1\e[0m"; }
error_exit() { echo -e "\e[31m❌ ERROR: $1\e[0m" >> "$LOG_FILE" 2>&1; echo -e "\e[31m❌ ERROR: $1\e[0m"; exit 1; }

repair_gradle_version() {
    log "Checking Gradle version and Java compatibility..."
    local GRADLE_WRAPPER_PROPERTIES="$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.properties"
    if [ -f "$GRADLE_WRAPPER_PROPERTIES" ]; then
        log "Force-upgrading Gradle wrapper to 8.5..."
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
        
        log "Enforcing environment variables..."
        export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
        export ANDROID_HOME="/home/administrator/android-sdk"
        # Reset PATH to prioritize Java 21 and remove system gradle paths
        export PATH="$JAVA_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
        
        # REMOVE SYSTEM GRADLE FROM PATH COMPLETELY
        export PATH=$(echo $PATH | tr ":" "\n" | grep -v "gradle" | tr "\n" ":" | sed 's/:$//')
        
        export TERM=dumb
        unset GRADLE_HOME
        
        log "Downloading fresh gradle-wrapper.jar if needed..."
        wget -O "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.jar" "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar" || true
    fi
}

log "Starting AXION Master Build Engine v5.1.0"
ANDROID_ROOT="/home/administrator/app2/android"
APP_GRADLE="$ANDROID_ROOT/app/build.gradle"
MANIFEST="$ANDROID_ROOT/app/src/main/AndroidManifest.xml"

repair_gradle_version
# IMPORTANT: Use the wrapper explicitly
GRADLE_EXEC="./gradlew"

log "Repairing Project Files for SDK 35 compatibility..."
sed -i 's/minSdk [0-9]*/minSdk 23/g' "$APP_GRADLE"
sed -i 's/compileSdk [0-9]*/compileSdk 35/g' "$APP_GRADLE"
sed -i 's/targetSdk [0-9]*/targetSdk 34/g' "$APP_GRADLE"
sed -i 's/namespace "/namespace = "/g' "$APP_GRADLE"

grep -q "multiDexEnabled true" "$APP_GRADLE" || sed -i '/defaultConfig {/a \        multiDexEnabled true' "$APP_GRADLE"
grep -q "multidex:2.0.1" "$APP_GRADLE" || sed -i '/dependencies {/a \    implementation "androidx.multidex:multidex:2.0.1"' "$APP_GRADLE"

grep -q "tools:overrideLibrary" "$MANIFEST" || {
    sed -i '/<manifest/s/$/ xmlns:tools="http:\/\/schemas.android.com\/tools"/' "$MANIFEST"
}
sed -i '/<uses-sdk/d' "$MANIFEST"
sed -i '/<application/i \    <uses-sdk tools:overrideLibrary="com.getcapacitor.community.database.sqlite, com.getcapacitor.community.pushnotifications" \/>' "$MANIFEST"

log "Starting Professional Build with SDK 35..."
cd "$ANDROID_ROOT" && chmod +x gradlew
# Execute build using the wrapper directly with Java 21
$GRADLE_EXEC assembleDebug >> "$LOG_FILE" 2>&1 || {
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
