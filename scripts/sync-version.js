import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve('package.json');
const versionPropertiesPath = path.resolve('android/app/version.properties');
const androidAppDir = path.resolve('android/app');

function syncVersion() {
    try {
        // Read package.json to get version
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        let version = packageJson.version;

        // Check if a version argument was provided via CLI
        const cliVersion = process.argv[2];
        if (cliVersion) {
            version = cliVersion;
            // Update package.json with the new version
            packageJson.version = version;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
            console.log(`✅ Updated package.json version to ${version}`);
        }

        // Convert version (e.g., 1.0.27) to numeric code (e.g., 27)
        const versionCode = parseInt(version.split('.').pop()) || 1;

        // Ensure android/app directory exists
        if (!fs.existsSync(androidAppDir)) {
            fs.mkdirSync(androidAppDir, { recursive: true });
        }

        // Write version.properties file for Android build
        const versionPropertiesContent = `VERSION_CODE=${versionCode}\nVERSION_NAME=${version}\n`;
        fs.writeFileSync(versionPropertiesPath, versionPropertiesContent);

        console.log(`✅ Synced Android version to ${version} (code: ${versionCode})`);
        console.log(`✅ Created/updated ${versionPropertiesPath}`);
    } catch (error) {
        console.error('❌ Error syncing version:', error.message);
        process.exit(1);
    }
}

syncVersion();
