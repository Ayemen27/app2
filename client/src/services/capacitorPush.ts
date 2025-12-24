import { PushNotifications, PermissionStatus, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Native Push Notifications Service using Capacitor
 * Handles registration, permissions, and listeners for Android/iOS
 */
export const initializeNativePush = async (_userId: string) => {
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
      throw new Error('User denied permissions!');
    }

    await PushNotifications.register();

    // Listeners
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[NativePush] Registration token:', token.value);
      
      // Save token to backend
      try {
        await fetch('/api/push/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
