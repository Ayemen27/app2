import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const LEGACY_KEY_ALIAS = 'sqlcipher_encryption_key';
const KEYSTORE_SERVER = 'com.axion.app.sqlcipher.master';
const KEYSTORE_USERNAME = 'sqlcipher_master_key';
const LOG_TAG = '[SQLCipherKey]';

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta) fn(`${LOG_TAG} ${message}`, meta);
  else fn(`${LOG_TAG} ${message}`);
}

function generateSecureKey(): string {
  const array = new Uint8Array(32); // 256-bit AES key
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readFromKeystore(): Promise<string | null> {
  try {
    const creds = await NativeBiometric.getCredentials({ server: KEYSTORE_SERVER });
    return creds?.password || null;
  } catch {
    return null;
  }
}

async function writeToKeystore(key: string): Promise<boolean> {
  try {
    await NativeBiometric.setCredentials({
      server: KEYSTORE_SERVER,
      username: KEYSTORE_USERNAME,
      password: key,
    });
    return true;
  } catch (e: any) {
    log('warn', 'Failed to write key to native Keystore/Keychain:', { error: String(e?.message ?? e) });
    return false;
  }
}

async function readLegacyFromPreferences(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: LEGACY_KEY_ALIAS });
    return value || null;
  } catch {
    return null;
  }
}

async function writeLegacyToPreferences(key: string): Promise<void> {
  try {
    await Preferences.set({ key: LEGACY_KEY_ALIAS, value: key });
  } catch (e: any) {
    log('warn', 'Failed to write key to Preferences fallback:', { error: String(e?.message ?? e) });
  }
}

async function clearLegacyPreferences(): Promise<void> {
  try {
    await Preferences.remove({ key: LEGACY_KEY_ALIAS });
  } catch {
    // Best-effort cleanup
  }
}

async function getOrCreateWebKey(): Promise<string> {
  let key = localStorage.getItem(LEGACY_KEY_ALIAS);
  if (!key) {
    key = generateSecureKey();
    localStorage.setItem(LEGACY_KEY_ALIAS, key);
    log('warn', 'Web platform: encryption key stored in localStorage (not secure for production).');
  }
  return key;
}

export async function getEncryptionKey(): Promise<string> {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    return getOrCreateWebKey();
  }

  const keystoreAvailable = Capacitor.isPluginAvailable('NativeBiometric');

  if (keystoreAvailable) {
    const fromKeystore = await readFromKeystore();
    if (fromKeystore) {
      return fromKeystore;
    }

    const legacy = await readLegacyFromPreferences();
    if (legacy) {
      log('info', 'Migrating SQLCipher key from Preferences → native Keystore/Keychain.');
      const ok = await writeToKeystore(legacy);
      if (ok) {
        await clearLegacyPreferences();
        return legacy;
      }
      log('warn', 'Migration to Keystore failed; continuing to use legacy Preferences key.');
      return legacy;
    }

    const fresh = generateSecureKey();
    const ok = await writeToKeystore(fresh);
    if (ok) {
      log('info', 'Generated new SQLCipher key and stored it in native Keystore/Keychain.');
      return fresh;
    }

    log('warn', 'Could not store key in Keystore; falling back to Preferences.');
    await writeLegacyToPreferences(fresh);
    return fresh;
  }

  log('warn', 'NativeBiometric plugin unavailable on this device; using Preferences fallback.');
  const legacy = await readLegacyFromPreferences();
  if (legacy) return legacy;

  const fresh = generateSecureKey();
  await writeLegacyToPreferences(fresh);
  return fresh;
}
