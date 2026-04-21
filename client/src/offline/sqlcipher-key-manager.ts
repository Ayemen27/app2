import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const KEY_ALIAS = 'sqlcipher_encryption_key';

export async function getEncryptionKey(): Promise<string> {
  const platform = Capacitor.getPlatform();
  
  let key: string | null = null;
  
  if (platform === 'web') {
    key = localStorage.getItem(KEY_ALIAS);
    if (!key) {
      key = generateSecureKey();
      localStorage.setItem(KEY_ALIAS, key);
      console.warn('[SQLCipher] Web platform detected. Encryption key stored in localStorage (Not secure for production).');
    }
  } else {
    const { value } = await Preferences.get({ key: KEY_ALIAS });
    key = value;
    
    if (!key) {
      key = generateSecureKey();
      await Preferences.set({ key: KEY_ALIAS, value: key });
    }
  }
  
  return key;
}

function generateSecureKey(): string {
  const array = new Uint8Array(32); // 256-bit
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
