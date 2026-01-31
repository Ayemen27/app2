#!/bin/bash
# AXION AI Build Engine v8.0.0 (The Final Fix)
# Absolute Isolation & Forced Wrapper Execution

set -e
LOG_FILE="/tmp/axion_smart_build_$(date +%s).log"
APK_OUTPUT_DIR="/home/administrator/app2/output_apks"
ANDROID_ROOT="/home/administrator/app2/android"
mkdir -p "$APK_OUTPUT_DIR"

log() {
    echo -e "\e[32m>>> $1\e[0m" | tee -a "$LOG_FILE"
}

# 1. Force environment isolation
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:/usr/local/bin:/usr/bin:/bin"
export GRADLE_OPTS="-Dorg.gradle.java.home=$JAVA_HOME"

# 2. Repair Gradle Wrapper Properties
mkdir -p "$ANDROID_ROOT/gradle/wrapper"
cat <<EOF > "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.properties"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
EOF

# 3. Download fresh Wrapper JAR to be absolutely sure
wget -qO "$ANDROID_ROOT/gradle/wrapper/gradle-wrapper.jar" "https://github.com/gradle/gradle/raw/v8.5.0/gradle/wrapper/gradle-wrapper.jar"
chmod +x "$ANDROID_ROOT/gradlew"

# 4. Repair build.gradle files
sed -i "s/classpath ['\"]com.android.tools.build:gradle:[0-9.]*['\"]/classpath 'com.android.tools.build:gradle:8.2.2'/g" "$ANDROID_ROOT/build.gradle"
sed -i 's/minSdk [0-9]*/minSdk 24/g' "$ANDROID_ROOT/app/build.gradle"
sed -i 's/compileSdk [0-9]*/compileSdk 34/g' "$ANDROID_ROOT/app/build.gradle"
sed -i 's/targetSdk [0-9]*/targetSdk 34/g' "$ANDROID_ROOT/app/build.gradle"

# 4.1 Ensure proper signing for debug (common cause for parse error)
log "Ensuring debug signing configuration..."
if ! grep -q "signingConfig signingConfigs.debug" "$ANDROID_ROOT/app/build.gradle"; then
    sed -i '/buildTypes {/a \        debug {\n            signingConfig signingConfigs.debug\n        }' "$ANDROID_ROOT/app/build.gradle"
fi

# 5. Execute build using the wrapper's JAR directly with Java 21
# This bypasses the shell script and any system-level Gradle interference
log "Starting Final Build Attempt..."
cd "$ANDROID_ROOT"
"$JAVA_HOME/bin/java" -Dorg.gradle.appname=gradlew -classpath "gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain assembleDebug --no-daemon

# 6. Verify and Copy
APK_FILE=$(find app/build/outputs/apk/debug -name "*.apk" | head -n 1)
if [ -f "$APK_FILE" ]; then
    FINAL_NAME="AXION_FINAL_$(date +%s).apk"
    cp "$APK_FILE" "$APK_OUTPUT_DIR/$FINAL_NAME"
    log "✅ SUCCESS: APK saved as $FINAL_NAME"
else
    log "❌ Build failed. Check logs."
    exit 1
fi
