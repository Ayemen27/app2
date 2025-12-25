# BinarJoin Android App - Automated Build & Deploy

## 📋 Project Overview
Automated deployment system for BinarJoin Android app with:
- Auto version increment (MAJOR.MINOR.PATCH)
- Secure SSH file transfer to remote server
- Automated APK building with Gradle
- Production server integration (https://app2.binarjoinanelytic.info)

## ✅ Latest Status
- **Current Version**: 1.0.8 (auto-incremented)
- **APK Built**: ✅ Successfully (7.4MB, Dec 25 13:59 UTC)
- **Server**: administrator@93.127.142.144:22
- **APK Location**: /home/administrator/app2/android/app/build/outputs/apk/debug/app-debug.apk

## 🚀 Usage

### Build & Deploy
```bash
npm run android:deploy
# or
bash scripts/build-and-deploy.sh
```

### What happens:
1. ✅ Version auto-increments in package.json & Android build files
2. ✅ Project files compressed and transferred via SSH
3. ✅ Remote server extracts files and builds APK with Gradle
4. ✅ APK ready for testing/distribution

## 🔧 Configuration

### Environment Variables (Required)
- `SSH_HOST`: 93.127.142.144
- `SSH_USER`: administrator
- `SSH_PORT`: 22
- `SSH_PASSWORD`: [from Secrets]

### GitHub Integration
- `GITHUB_TOKEN`: [available in Secrets]
- `GITHUB_USERNAME`: [available in Secrets]
- `GITHUB_EMAIL`: [available in Secrets]

## 📁 Key Files

### Build System
- **scripts/build-and-deploy.sh** - Main deployment script
  - Auto-version updates (package.json + Android build.gradle)
  - SSH file transfer & remote build execution
  - Error handling & clean logging

### Android Configuration
- **android/app/build.gradle**
  - minSdkVersion: 24
  - targetSdkVersion: 34
  - versionCode: auto-generated (1.0.8 = 10008)
  - versionName: auto-incremented
  - Gradle 8.11.1

- **capacitor.config.json**
  - Server URL: https://app2.binarjoinanelytic.info
  - App name: BinarJoin
  - Package: com.binarjoin.mobile

### Development Files
- **package.json** - npm scripts & dependencies
- **android/gradle.properties** - Gradle memory config
- **android/app/capacitor.build.gradle** - Capacitor setup

## 🔨 Build Details

### Server Setup
- OS: Ubuntu 24.04.3 LTS
- Java: OpenJDK 21 (binary target: 17)
- Android SDK: /opt/android-sdk
- Gradle: 8.11.1 (no daemon mode for stability)

### Build Time
- ~56 seconds (clean build with all dependencies)
- File extraction to APK generation
- No internet required after initial setup

## ✨ Features

✅ **Auto Version Management**
- Reads current version
- Increments PATCH number
- Updates: package.json, versionCode, versionName

✅ **Secure SSH Transfer**
- SSHPASS for authentication (no interactive prompts)
- Compressed tar.gz archives (exclude build artifacts)
- Remote extraction & cleanup

✅ **Remote Build Automation**
- Gradle daemon management
- Clean builds for consistency
- Error detection & reporting

✅ **Production Server Integration**
- Mobile app connects to: https://app2.binarjoinanelytic.info
- HTTPS/SSL enabled
- Mobile API endpoints configured

## 📝 Notes

### Why This Approach?
- Replit blocks direct Git operations (.git folder)
- SSH transfer avoids Git restrictions
- Remote building ensures proper Java/Gradle environment
- Version auto-increment eliminates manual tracking

### Troubleshooting

**Build fails with kotlinOptions error:**
- ✅ Fixed: Removed kotlinOptions() from build.gradle (not needed without Kotlin plugin)

**SSH connection timeout:**
- Check SSH credentials in Secrets
- Verify server IP: 93.127.142.144
- Confirm port: 22

**Archive extraction fails:**
- Remote server may lack space
- Check /home/administrator/app2 permissions
- Verify tar.gz integrity

## 🎯 Next Steps
1. Test APK on Android devices
2. Configure production signing certificate
3. Set up continuous integration (optional)
4. Monitor build logs for any issues
