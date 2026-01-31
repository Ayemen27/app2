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

# 3.1 Pre-build validation
log "Running Pre-build validation..."

# Check google-services.json
if [ ! -f "$ANDROID_ROOT/app/google-services.json" ]; then
    log "❌ ERROR: google-services.json is missing!"
    exit 1
fi

# Extract package name from google-services.json
GS_PACKAGE=$(grep -o '"package_name": "[^"]*"' "$ANDROID_ROOT/app/google-services.json" | head -n 1 | cut -d'"' -f4)
# Extract applicationId from build.gradle
GRADLE_PACKAGE=$(grep "applicationId" "$ANDROID_ROOT/app/build.gradle" | sed 's/.*"\(.*\)".*/\1/')

if [ "$GS_PACKAGE" != "$GRADLE_PACKAGE" ]; then
    log "❌ ERROR: Package mismatch!"
    log "   google-services.json: $GS_PACKAGE"
    log "   build.gradle: $GRADLE_PACKAGE"
    exit 1
fi
log "✅ Package names match: $GS_PACKAGE"

# Check signing keystore
DEBUG_KEYSTORE="/home/administrator/.android/debug.keystore"
if [ ! -f "$DEBUG_KEYSTORE" ]; then
    log "⚠️ WARNING: debug.keystore not found. Creating a new one..."
    mkdir -p /home/administrator/.android
    keytool -genkey -v -keystore "$DEBUG_KEYSTORE" -alias AndroidDebugKey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" -storepass android -keypass android
fi

# Test Firebase connection (Verify API key in JSON)
API_KEY=$(grep -o '"current_key": "[^"]*"' "$ANDROID_ROOT/app/google-services.json" | head -n 1 | cut -d'"' -f4)
if [ -z "$API_KEY" ]; then
    log "❌ ERROR: No API key found in google-services.json"
    exit 1
fi
log "✅ Firebase API Key detected"

# 4. Repair build.gradle files
sed -i "s/classpath ['\"]com.android.tools.build:gradle:[0-9.]*['\"]/classpath 'com.android.tools.build:gradle:8.2.2'/g" "$ANDROID_ROOT/build.gradle"
sed -i 's/minSdk [0-9]*/minSdk 24/g' "$ANDROID_ROOT/app/build.gradle"
sed -i 's/compileSdk [0-9]*/compileSdk 35/g' "$ANDROID_ROOT/app/build.gradle"
sed -i 's/targetSdk [0-9]*/targetSdk 34/g' "$ANDROID_ROOT/app/build.gradle"

# 4.1 Force resolution for androidx.core:core-ktx to prevent build failure on SDK 35
log "Patching build.gradle to handle SDK 35 dependencies..."
if ! grep -q "configurations.all" "$ANDROID_ROOT/app/build.gradle"; then
    cat <<EOF >> "$ANDROID_ROOT/app/build.gradle"

configurations.all {
    resolutionStrategy {
        force 'androidx.core:core:1.13.1'
        force 'androidx.core:core-ktx:1.13.1'
    }
}
EOF
fi

# 5. Execute build using the wrapper's JAR directly with Java 21
log "Starting Final Build Attempt..."
cd "$ANDROID_ROOT"
# Use Java 21 to run the wrapper directly for cleaning
"$JAVA_HOME/bin/java" -Dorg.gradle.appname=gradlew -classpath "gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain clean --no-daemon
# Now build
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
