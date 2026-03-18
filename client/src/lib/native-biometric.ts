import { registerPlugin } from '@capacitor/core';

export interface IsAvailableResult {
  isAvailable: boolean;
  biometryType?: number;
  deviceIsSecure?: boolean;
  strongBiometryIsAvailable?: boolean;
}

export interface BiometricCredentials {
  username: string;
  password: string;
}

export interface NativeBiometricPlugin {
  isAvailable(): Promise<IsAvailableResult>;

  verifyIdentity(options: {
    reason: string;
    title?: string;
    subtitle?: string;
    description?: string;
    useFallback?: boolean;
    fallbackTitle?: string;
    maxAttempts?: number;
  }): Promise<void>;

  getCredentials(options: {
    server: string;
  }): Promise<BiometricCredentials>;

  setCredentials(options: {
    username: string;
    password: string;
    server: string;
  }): Promise<void>;

  deleteCredentials(options: {
    server: string;
  }): Promise<void>;
}

const NativeBiometric = registerPlugin<NativeBiometricPlugin>('NativeBiometric');

export default NativeBiometric;
