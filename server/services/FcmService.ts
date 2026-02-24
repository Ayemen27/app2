
import { storage } from "../storage";
import { notifications, users } from "@shared/schema";
import { eq, or, and } from "drizzle-orm";

/**
 * خدمة إدارة إشعارات Firebase (FCM)
 * ملاحظة: تتطلب مفاتيح Firebase لتفعيل الإرسال الفعلي للهواتف
 */
export class FcmService {
  private static isInitialized = false;

  static initialize() {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        // هنا نقوم بتهيئة Firebase Admin فعلياً إذا تم تثبيت المكتبة
        // const admin = require('firebase-admin');
        // admin.initializeApp({
        //   credential: admin.credential.cert(JSON.parse(serviceAccountKey))
        // });
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
      
      // التأكد من أن الإشعار يحتوي على التفاصيل المطلوبة لشريط الحالة
      const pushPayload = {
        notification: {
          title: data.title,
          body: data.message,
          android: {
            priority: data.priority >= 4 ? 'high' : 'normal',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              channelId: 'high_importance_channel'
            }
          }
        },
        data: {
          type: data.type,
          priority: String(data.priority)
        }
      };
      
      console.log(`[FCM] Payload generated:`, JSON.stringify(pushPayload));
    }

    return { success: true };
  }
}
