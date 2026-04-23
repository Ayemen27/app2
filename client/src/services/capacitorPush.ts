import { ENV } from "@/lib/env";
import { authFetch } from '@/lib/auth-token-store';
import { PushNotifications, PermissionStatus, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// ملاحظة: لا نستخدم Capacitor.isPluginAvailable() لأنها تُرجع false في Capacitor 8
// حتى للإضافات المُضمَّنة في APK. نستدعي كل إضافة مباشرة ونعالج الأخطاء.

export const requestAllPermissions = async () => {
  if (!Capacitor.isNativePlatform()) return;

  // Push Notifications
  try {
    const pushPerm = await PushNotifications.requestPermissions();
    console.log('[Push] Push permission status:', pushPerm.receive);
  } catch (err) {
    console.warn('[Push] Failed to request push permissions:', err);
  }

  // Local Notifications
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const localPerm = await LocalNotifications.requestPermissions();
    console.log('[Push] Local notification permission:', localPerm.display);
    try {
      const exactSetting = await LocalNotifications.checkExactNotificationSetting();
      if (exactSetting.exact_alarm !== 'granted') {
        await LocalNotifications.changeExactNotificationSetting();
      }
    } catch (exactErr) {
      console.warn('[Push] Could not check exact alarm setting:', exactErr);
    }
  } catch (localErr) {
    console.warn('[Push] Local notifications not available:', localErr);
  }

  // Biometric — فحص التوافر فقط (لا يتطلب صلاحية)
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    const bioResult = await NativeBiometric.isAvailable();
    console.log('[Biometric] Available:', bioResult.isAvailable, '| Type:', bioResult.biometryType);
  } catch (bioErr) {
    console.warn('[Biometric] Not available on this device:', bioErr);
  }
};

/**
 * تهيئة خدمة الإشعارات الأصلية عبر Capacitor FCM
 */
export const initializeNativePush = async (user_id: string) => {
  if (!Capacitor.isNativePlatform()) return;

  // إنشاء قنوات الإشعارات (LocalNotifications)
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: 'default', name: 'الإشعارات العامة',
      description: 'الإشعارات الرئيسية لتطبيق AXION',
      importance: 4, visibility: 1, vibration: true, sound: 'default',
    });
    await LocalNotifications.createChannel({
      id: 'high_priority', name: 'إشعارات الأولوية العالية',
      description: 'تنبيهات السلامة والطوارئ',
      importance: 5, visibility: 1, vibration: true, sound: 'default',
    });
    await LocalNotifications.createChannel({
      id: 'financial', name: 'الإشعارات المالية',
      description: 'إشعارات الرواتب والتحويلات المالية',
      importance: 4, visibility: 1, vibration: true, sound: 'default',
    });
  } catch (channelErr) {
    console.warn('[Push] Failed to create notification channels:', channelErr);
  }

  // تسجيل FCM (PushNotifications)
  try {
    let permStatus: PermissionStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Notification permission denied — registration skipped');
      return;
    }

    await PushNotifications.register();
    console.log('[Push] FCM registration initiated for user:', user_id);

    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Push] FCM token received, length:', token.value.length);
      try {
        const response = await authFetch(ENV.getApiUrl('/api/push/token'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-nonce': crypto.randomUUID(),
            'x-request-timestamp': new Date().toISOString(),
          },
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform(), user_id }),
        });
        if (response.ok) {
          console.log('[Push] FCM token registered successfully');
        } else {
          console.warn('[Push] Backend rejected FCM token:', response.status);
        }
      } catch (err) {
        console.error('[Push] Failed to save FCM token:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err: any) => {
      console.error('[Push] FCM registration error:', JSON.stringify(err));
    });

    await PushNotifications.addListener('pushNotificationReceived', async (notification: any) => {
      console.log('[Push] Foreground notification:', notification.title);
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [{
            title:     notification.title || 'إشعار جديد',
            body:      notification.body  || '',
            id:        Math.floor(Math.random() * 100000),
            schedule:  { at: new Date(Date.now() + 100) },
            extra:     notification.data || {},
            channelId: notification.data?.channelId || 'default',
          }],
        });
      } catch (err) {
        console.error('[Push] Error showing local notification:', err);
      }
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('[Push] Notification tapped:', notification.notification?.title);
      const deepLink = notification.notification?.data?.url;
      if (deepLink) console.log('[Push] Deep link:', deepLink);
    });

  } catch (error) {
    console.error('[Push] Fatal error in initializeNativePush:', error);
  }
};

export const unregisterPushToken = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.unregister();
    console.log('[Push] FCM token unregistered');
  } catch (err) {
    console.warn('[Push] Failed to unregister FCM token:', err);
  }
};
