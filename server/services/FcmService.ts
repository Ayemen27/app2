
import { storage } from "../storage";
import { notifications, users } from "@shared/schema";
import { eq, or, and } from "drizzle-orm";

/**
 * خدمة إدارة إشعارات Firebase (FCM)
 * ملاحظة: تتطلب مفاتيح Firebase لتفعيل الإرسال الفعلي للهواتف
 */
export class FcmService {
  private static isInitialized = false;

  static async initialize() {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        try {
          const { default: admin } = await import('firebase-admin');
          if (!admin.apps.length) {
            admin.initializeApp({
              credential: admin.credential.cert(JSON.parse(serviceAccountKey))
            });
          }
          const messaging = admin.messaging();
          console.log("✅ [FCM] Firebase Admin Initialized Successfully");
        } catch (e: any) {
          console.error("❌ [FCM] Failed to initialize Firebase Admin:", e.message);
        }
        console.log("✅ [FCM] Firebase Service Account Key Loaded");
      } else {
        console.warn("⚠️ [FCM] FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables");
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("❌ [FCM] Error initializing Firebase:", error);
    }
  }

  static async sendNotification(data: {
    title: string;
    message: string;
    type: string;
    priority: number;
    targetPlatform: 'all' | 'android' | 'web';
    recipients: 'all' | 'admins' | 'workers' | string[];
  }) {
    // 1. حفظ في قاعدة البيانات (لإظهارها في الويب)
    if (data.targetPlatform === 'all' || data.targetPlatform === 'web') {
      const dbNotification = {
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        targetPlatform: data.targetPlatform,
        isRead: false,
      };

      await storage.createNotification(dbNotification as any);
    }

    // 2. إرسال عبر Firebase (لأندرويد)
    if (data.targetPlatform === 'all' || data.targetPlatform === 'android') {
      console.log(`[FCM] Sending push notification to Android: ${data.title}`);
      
      try {
        const { default: admin } = await import('firebase-admin');
        const message = {
          notification: {
            title: data.title,
            body: data.message,
          },
          android: {
            priority: data.priority >= 4 ? 'high' : 'normal',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              channelId: 'high_importance_channel',
              icon: 'notification_icon'
            }
          },
          data: {
            type: data.type,
            priority: String(data.priority),
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          topic: data.targetPlatform === 'android' ? 'android_users' : 'all_users'
        };

        const response = await admin.messaging().send(message as any);
        console.log(`✅ [FCM] Successfully sent message:`, response);
        return { success: true, messageId: response };
      } catch (error: any) {
        console.error(`❌ [FCM] Error sending push notification:`, error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }
}
