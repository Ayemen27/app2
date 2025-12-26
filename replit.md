# BinarJoin Build & Deployment Console

## 📋 Project Overview
Advanced deployment and build management system for BinarJoin with:
- Web and Android app building
- Real-time deployment console with progress tracking
- Visual build pipeline with step-by-step execution
- Production server integration (https://app2.binarjoinanelytic.info)
- Database logging of all build operations

## ✅ Latest Status (Dec 26, 2025)
- **Deployment Console**: ✅ Fully functional
- **Build API**: ✅ Connected to production server
- **Splash Screen**: ✅ Configured in capacitor.config.json and styles.xml
- **MainActivity**: ✅ Updated with onCreate override for better splash handling
- **Server URL**: https://app2.binarjoinanelytic.info
- **Database**: ✅ Schema updated with build_deployments.app_type
- **API Port**: 5000 (Replit) ↔ Production API

## 🚀 Build & Deployment Console

Access the deployment console at `/deployment` route:
1. Select app type (Web or Android)
2. Click "ابدأ النشر الآن" (Start Deployment)
3. Watch real-time progress in the pipeline
4. Monitor build logs in the console

### Features:
- ✅ Visual pipeline with step tracking (pending → running → success/failed)
- ✅ Real-time log streaming with timestamps
- ✅ Build progress percentage
- ✅ Automatic database logging of all builds
- ✅ Support for both Web and Android builds

## 🔧 Configuration

### External Server URL
- **Default**: `https://app2.binarjoinanelytic.info`
- **Environment Variable**: `EXTERNAL_SERVER_URL`
- **Required Endpoints on Server**:
  - `POST /api/build/install` - Install dependencies
  - `POST /api/build/web` - Build web app
  - `POST /api/build/android` - Build Android APK
  - `POST /api/build/deploy` - Deploy APK

### Database Schema
- **Table**: `build_deployments`
- **Columns**: 
  - `app_type` (TEXT) - 'web' or 'android'
  - `status` (TEXT) - 'running', 'success', 'failed'
  - `logs` (JSONB) - Array of build log entries
  - `progress` (INTEGER) - Build progress 0-100
  - `triggeredBy` (VARCHAR) - User ID who triggered build

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
