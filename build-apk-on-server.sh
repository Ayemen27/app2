#!/bin/bash
set -e
export SSH_PASSWORD=$(grep SSH_PASSWORD .env | cut -d'=' -f2)
sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no -p 22 administrator@93.127.142.144 "cd ~/app2 && npm run build && npx cap sync android && cd android && ./gradlew clean assembleRelease && mkdir -p ../output_apks && cp app/build/outputs/apk/release/app-release.apk ../output_apks/signed-app-release.apk"
echo "Build complete! Signed APK is at ~/app2/output_apks/signed-app-release.apk on the server."
