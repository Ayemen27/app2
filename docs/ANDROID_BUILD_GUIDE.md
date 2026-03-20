# 📱 Axion Android Build Guide

## Package Name
The app uses the unified package name `com.axion.app` across all configuration:
- `capacitor.config.json` — `appId: "com.axion.app"`
- `android/app/build.gradle` — `namespace` and `applicationId`
- `google-services.json` — Firebase client `package_name`

## 🔐 Environment Variables Required

### Signing (for release builds)
```
KEYSTORE_PASSWORD=<your keystore password>
KEYSTORE_ALIAS=axion-key
KEYSTORE_KEY_PASSWORD=<your key password>
```

### SSH (for remote builds from Replit)
```
SSH_PASSWORD=<server password>
```

### Firebase
```
FIREBASE_SERVICE_ACCOUNT_KEY=<JSON service account key>
VITE_FIREBASE_API_KEY=<api key>
VITE_FIREBASE_APP_ID=<app id>
VITE_FIREBASE_AUTH_DOMAIN=<auth domain>
VITE_FIREBASE_PROJECT_ID=<project id>
VITE_FIREBASE_STORAGE_BUCKET=<storage bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender id>
VITE_FIREBASE_VAPID_KEY=<vapid key>
```

### VAPID Key
The `VITE_FIREBASE_VAPID_KEY` is required for web push notifications. To generate one:
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Under "Web configuration", find or generate a Web Push certificate
3. Copy the Key pair value (a base64-encoded string, typically 87 characters)
4. Set it as `VITE_FIREBASE_VAPID_KEY` in your `.env` file

---

## 🚀 Build Commands

All builds are managed through the **Deployment Console** in the AXION web interface:

1. Navigate to **Deployment Console** page in the app
2. Select a pipeline:
   - `android-build` — Build Android APK only
   - `full-deploy` — Full deployment (server + Android)
   - `git-android-build` — Git push + Android build
   - `android-build-test` — Android build + Firebase Test Lab
3. Click **Start Deployment**
4. Monitor progress in real-time via the console

> **Note:** Legacy scripts (`apk.sh`, `build-apk-on-server.sh`) have been archived. The Deployment Engine (`server/services/deployment-engine.ts`) is the single source of truth for all builds.

---

## 📋 Key Files

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Capacitor app config (appId: com.axion.app) |
| `google-services.json` | Firebase Android config |
| `server/services/deployment-engine.ts` | Unified deployment engine (all pipelines) |
| `server/routes/modules/deploymentRoutes.ts` | Deployment API endpoints |
| `client/src/pages/deployment-console.tsx` | Deployment Console UI |
| `client/src/services/firebase.ts` | Firebase web SDK initialization |
| `client/src/services/capacitorPush.ts` | Native push notification handling |
| `server/services/FcmService.ts` | Server-side FCM notification sending |

---

## 🔧 google-services.json

The `google-services.json` file must be placed at `android/app/google-services.json` for Firebase to work. The build scripts automatically copy it from the project root if it's missing from the android directory.

The file contains the Firebase project config for `com.axion.app` under project `app2-eb4df`.

---

## 🔒 Security

- Keystore passwords are transferred via SCP to temp files (mode 600) on the build server — never interpolated into shell commands
- SSH authentication uses `sshpass -e` (reads from SSHPASS env var) — no password in command strings
- Temp secret files are cleaned up after each build step
- Git push never uses `--force`

---

## 🐛 Troubleshooting

### BUILD FAILED
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Firebase not initializing
- Check that `google-services.json` is at `android/app/google-services.json`
- Verify the package name matches `com.axion.app`
- Ensure `com.google.gms.google-services` plugin is applied in build.gradle

### Missing APK after build
- Check the Deployment Console logs for error details
- Verify releases directory exists on server: `/home/administrator/app2/releases/`
- Use the download button in deployment history for successful builds
