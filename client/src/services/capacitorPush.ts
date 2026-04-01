import { ENV } from "@/lib/env";
import { authFetch } from '@/lib/auth-token-store';
import { PushNotifications, PermissionStatus, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const requestAllPermissions = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pushPerm = await PushNotifications.requestPermissions();

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const localPerm = await LocalNotifications.requestPermissions();

      try {
        const exactSetting = await LocalNotifications.checkExactNotificationSetting();
        if (exactSetting.exact_alarm !== 'granted') {
          await LocalNotifications.changeExactNotificationSetting();
        }
      } catch (exactErr) {
      }
    } catch (localErr) {
    }

    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      const bioResult = await NativeBiometric.isAvailable();
    } catch (bioErr) {
    }
  } catch (err) {
  }
};

/**
 * Native Push Notifications Service using Capacitor
 * Handles registration, permissions, and listeners for Android/iOS
 */
export const initializeNativePush = async (_user_id: string) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    let permStatus: PermissionStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return; // لا ترفع خطأ يسبب انهيار التطبيق، فقط توقف عن التسجيل
    }

    await PushNotifications.register();

    // Listeners
    await PushNotifications.addListener('registration', async (token: Token) => {
      
      // Save token to backend
      try {
        await authFetch(ENV.getApiUrl('/api/push/token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
        });
      } catch (err) {
      }
    });

    await PushNotifications.addListener('registrationError', (err: any) => {
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
    });

  } catch (error) {
  }
};
