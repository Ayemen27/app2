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
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: 'default',
      name: 'الإشعارات العامة',
      description: 'الإشعارات الرئيسية لتطبيق AXION',
      importance: 4,
      visibility: 1,
      vibration: true,
      sound: 'default',
    });

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
      console.log('[Push] Registered with token:', token.value);
      // Save token to backend
      try {
        await authFetch(ENV.getApiUrl('/api/push/token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
        });
      } catch (err) {
        console.error('[Push] Failed to save token to backend:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err: any) => {
      console.error('[Push] FCM registration error:', err);
    });

    await PushNotifications.addListener('pushNotificationReceived', async (notification: any) => {
      console.log('[Push] Notification received:', notification);
      
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [
            {
              title: notification.title || 'إشعار جديد',
              body: notification.body || '',
              id: Math.floor(Math.random() * 10000),
              schedule: { at: new Date(Date.now() + 100) },
              extra: notification.data,
              channelId: 'default'
            }
          ]
        });
      } catch (err) {
        console.error('[Push] Error showing local notification:', err);
      }
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('[Push] Notification action performed:', notification);
    });

  } catch (error) {
  }
};
