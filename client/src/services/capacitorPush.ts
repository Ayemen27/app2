import { ENV } from "@/lib/env";
import { authFetch } from '@/lib/auth-token-store';
import { PushNotifications, PermissionStatus, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const requestAllPermissions = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pushPerm = await PushNotifications.requestPermissions();
    console.log('[Permissions] Push status:', pushPerm.receive);

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const localPerm = await LocalNotifications.requestPermissions();
      console.log('[Permissions] LocalNotifications status:', localPerm.display);

      try {
        const exactSetting = await LocalNotifications.checkExactNotificationSetting();
        console.log('[Permissions] ExactAlarm status:', exactSetting.value);
        if (exactSetting.value !== 'granted') {
          console.log('[Permissions] ExactAlarm not granted, prompting user...');
          await LocalNotifications.changeExactNotificationSetting();
        }
      } catch (exactErr) {
        console.log('[Permissions] ExactAlarm check not supported on this API level');
      }
    } catch (localErr) {
      console.error('[Permissions] LocalNotifications error:', localErr);
    }

    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      const bioResult = await NativeBiometric.isAvailable();
      console.log('[Permissions] Biometric available:', bioResult.isAvailable, 'type:', bioResult.biometryType);
    } catch (bioErr) {
      console.log('[Permissions] Biometric check skipped:', bioErr);
    }
  } catch (err) {
    console.error('[Permissions] Error requesting permissions:', err);
  }
};

/**
 * Native Push Notifications Service using Capacitor
 * Handles registration, permissions, and listeners for Android/iOS
 */
export const initializeNativePush = async (_user_id: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('[NativePush] Not a native platform, skipping initialization');
    return;
  }

  try {
    let permStatus: PermissionStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('⚠️ [NativePush] User denied permissions, skipping registration');
      return; // لا ترفع خطأ يسبب انهيار التطبيق، فقط توقف عن التسجيل
    }

    await PushNotifications.register();

    // Listeners
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[NativePush] Registration token:', token.value);
      
      // Save token to backend
      try {
        await authFetch(ENV.getApiUrl('/api/push/token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
        });
      } catch (err) {
        console.error('[NativePush] Failed to send token to backend:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err: any) => {
      console.error('[NativePush] Registration error:', err.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('[NativePush] Notification received:', notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('[NativePush] Action performed:', notification.actionId);
    });

  } catch (error) {
    console.error('[NativePush] Error during initialization:', error);
  }
};
