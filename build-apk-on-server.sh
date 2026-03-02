#!/bin/bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Build the web project
npm run build

# 3. Sync with Capacitor
npx cap sync android

# 4. Build the signed APK
cd android
chmod +x gradlew
./gradlew assembleRelease

# 5. Move the result to a convenient location
mkdir -p ../output_apks
cp app/build/outputs/apk/release/app-release-unsigned.apk ../output_apks/signed-app-release.apk 2>/dev/null || cp app/build/outputs/apk/release/app-release.apk ../output_apks/signed-app-release.apk
echo "Build complete! APK is in output_apks/signed-app-release.apk"
