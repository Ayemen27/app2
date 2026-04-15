
import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, inArray, isNotNull } from "drizzle-orm";

/**
 * خدمة إدارة إشعارات Firebase (FCM)
 * تدعم الإرسال للأجهزة الأندرويد عبر FCM tokens
 */
export class FcmService {
  private static isInitialized = false;
  private static adminInstance: any = null;

  static async initialize() {
    try {
      const { default: admin } = await import('firebase-admin');

      if (admin.apps.length) {
        this.adminInstance = admin;
        this.isInitialized = true;
        console.log("✅ [FCM] Firebase Admin already initialized");
        return;
      }

      let serviceAccountJson: object | null = null;

      // المصدر 1: متغير البيئة JSON مباشرة
      const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (envKey) {
        try {
          serviceAccountJson = JSON.parse(envKey);
          console.log("🔑 [FCM] تم قراءة Service Account من متغير البيئة FIREBASE_SERVICE_ACCOUNT_KEY");
        } catch (e: any) {
          console.error(`❌ [FCM] خطأ في تحليل FIREBASE_SERVICE_ACCOUNT_KEY JSON: ${e.message}`);
        }
      }

      // المصدر 2: مسار ملف JSON (FIREBASE_SERVICE_ACCOUNT_PATH)
      if (!serviceAccountJson) {
        const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (keyPath) {
          try {
            const { readFileSync } = await import('fs');
            const content = readFileSync(keyPath, 'utf-8');
            serviceAccountJson = JSON.parse(content);
            console.log(`🔑 [FCM] تم قراءة Service Account من الملف: ${keyPath}`);
          } catch (e: any) {
            console.error(`❌ [FCM] خطأ في قراءة/تحليل ملف Service Account (${keyPath}): ${e.message}`);
          }
        } else {
          console.debug("ℹ️ [FCM] FIREBASE_SERVICE_ACCOUNT_PATH غير معرّف - سيتم تخطيه");
        }
      }

      if (serviceAccountJson) {
        // التحقق من تطابق project_id مع إعدادات Firebase Frontend
        const expectedProjectId = process.env.VITE_FIREBASE_PROJECT_ID;
        const keyProjectId = (serviceAccountJson as any).project_id;
        if (expectedProjectId && keyProjectId && keyProjectId !== expectedProjectId) {
          console.warn(`⚠️ [FCM] تحذير: project_id في Service Account (${keyProjectId}) لا يتطابق مع VITE_FIREBASE_PROJECT_ID (${expectedProjectId})`);
          console.warn("⚠️ [FCM] إشعارات FCM للأجهزة ستفشل - تأكد من استخدام مفتاح Firebase الصحيح للمشروع:", expectedProjectId);
        }

        try {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJson as any)
          });
          this.adminInstance = admin;
          console.log(`✅ [FCM] Firebase Admin تم التهيئة بنجاح (مشروع: ${keyProjectId})`);
          this.isInitialized = true;
        } catch (e: any) {
          console.error("❌ [FCM] فشل تهيئة Firebase Admin:", e.message);
          this.isInitialized = false;
        }
      } else {
        console.warn("⚠️ [FCM] لم يتم تعيين FIREBASE_SERVICE_ACCOUNT_KEY أو FIREBASE_SERVICE_ACCOUNT_PATH - الإشعارات معطلة");
        console.warn("⚠️ [FCM] الخيارات المتاحة:");
        console.warn("  1. تعيين FIREBASE_SERVICE_ACCOUNT_KEY كمتغير بيئة JSON");
        console.warn("  2. تعيين FIREBASE_SERVICE_ACCOUNT_PATH كمسار ملف JSON");
        console.warn(`⚠️ [FCM] لتفعيل الإشعارات: احصل على Service Account Key من Firebase Console للمشروع: ${process.env.VITE_FIREBASE_PROJECT_ID || 'app2-eb4df'}`);
        this.isInitialized = false;
      }
    } catch (error) {
      console.error("❌ [FCM] خطأ في تهيئة Firebase:", error);
      this.isInitialized = false;
    }
  }

  /**
   * إرسال إشعار لقائمة FCM tokens مباشرة
   */
  static async sendToTokens(tokens: string[], payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: 'high' | 'normal';
    channelId?: string;
  }): Promise<{ sent: number; failed: number }> {
    if (!this.isInitialized || !this.adminInstance) {
      console.warn("⚠️ [FCM] Not initialized - skipping push to tokens");
      return { sent: 0, failed: 0 };
    }

    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const validTokens = tokens.filter(t => t && t.length > 0);
    if (validTokens.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    try {
      const admin = this.adminInstance;
      const messaging = admin.messaging();

      const messages = validTokens.map((token: string) => ({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        android: {
          priority: payload.priority || 'high',
          notification: {
            sound: 'default',
            channelId: payload.channelId || (
              (payload.priority === 'high' || payload.priority === 5 as any)
                ? 'high_priority'
                : payload.data?.type === 'financial'
                ? 'financial'
                : 'default'
            ),
            icon: 'ic_notification',
            color: '#2563EB',
          },
        },
        data: {
          ...(payload.data || {}),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      }));

      const batchSize = 500;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        try {
          const response = await messaging.sendEach(batch);
          sent += response.successCount;
          failed += response.failureCount;

          if (response.failureCount > 0) {
            response.responses.forEach((r: any, idx: number) => {
              if (!r.success) {
                console.warn(`⚠️ [FCM] Token failed: ${batch[idx].token?.substring(0, 20)}... | ${r.error?.message}`);
              }
            });
          }
        } catch (batchErr: any) {
          console.error(`❌ [FCM] Batch send error:`, batchErr.message);
          failed += batch.length;
        }
      }

      console.log(`📱 [FCM] Push sent: ${sent} success, ${failed} failed`);
    } catch (error: any) {
      console.error("❌ [FCM] sendToTokens error:", error.message);
      failed = validTokens.length;
    }

    return { sent, failed };
  }

  /**
   * إرسال إشعار لمجموعة من معرفات المستخدمين (يجلب tokens تلقائياً)
   */
  static async sendToUsers(userIds: string[], payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: 'high' | 'normal';
    channelId?: string;
  }): Promise<{ sent: number; failed: number; skipped: number }> {
    if (!this.isInitialized) {
      return { sent: 0, failed: 0, skipped: userIds.length };
    }

    try {
      const targetUsers = await db
        .select({ fcm_token: users.fcm_token })
        .from(users)
        .where(inArray(users.id, userIds));

      const tokens = targetUsers
        .map((u: { fcm_token: string | null }) => u.fcm_token)
        .filter((t): t is string => !!t && t.length > 0);

      const skipped = userIds.length - tokens.length;

      if (tokens.length === 0) {
        console.log(`ℹ️ [FCM] No FCM tokens found for ${userIds.length} users`);
        return { sent: 0, failed: 0, skipped };
      }

      const result = await this.sendToTokens(tokens, payload);
      return { ...result, skipped };
    } catch (error: any) {
      console.error("❌ [FCM] sendToUsers error:", error.message);
      return { sent: 0, failed: 0, skipped: userIds.length };
    }
  }

  /**
   * إرسال إشعار لجميع المستخدمين المفعّلة إشعاراتهم
   */
  static async sendToAllActiveUsers(payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: 'high' | 'normal';
  }): Promise<{ sent: number; failed: number; skipped: number }> {
    if (!this.isInitialized) {
      return { sent: 0, failed: 0, skipped: 0 };
    }

    try {
      const activeUsers = await db
        .select({ fcm_token: users.fcm_token })
        .from(users)
        .where(isNotNull(users.fcm_token));

      const tokens = activeUsers
        .map((u: { fcm_token: string | null }) => u.fcm_token)
        .filter((t): t is string => !!t && t.length > 0);

      if (tokens.length === 0) {
        return { sent: 0, failed: 0, skipped: 0 };
      }

      const result = await this.sendToTokens(tokens, payload);
      return { ...result, skipped: 0 };
    } catch (error: any) {
      console.error("❌ [FCM] sendToAllActiveUsers error:", error.message);
      return { sent: 0, failed: 0, skipped: 0 };
    }
  }

  /**
   * الإرسال العام (للتوافق مع الكود القديم)
   */
  static async sendNotification(data: {
    title: string;
    message: string;
    type: string;
    priority: number;
    targetPlatform: 'all' | 'android' | 'web';
    recipients: 'all' | 'admins' | 'workers' | string[];
  }) {
    if (data.targetPlatform === 'all' || data.targetPlatform === 'web') {
      try {
        await storage.createNotification({
          title: data.title,
          body: data.message,
          type: data.type,
          priority: data.priority,
          targetPlatform: data.targetPlatform,
        });
      } catch (err: any) {
        console.warn("⚠️ [FCM] DB notification save failed:", err.message);
      }
    }

    if (data.targetPlatform === 'all' || data.targetPlatform === 'android') {
      const pushPayload = {
        title: data.title,
        body: data.message,
        data: { type: data.type, priority: String(data.priority) },
        priority: (data.priority >= 4 ? 'high' : 'normal') as 'high' | 'normal',
      };

      if (data.recipients === 'all') {
        return await this.sendToAllActiveUsers(pushPayload);
      } else if (Array.isArray(data.recipients)) {
        const result = await this.sendToUsers(data.recipients, pushPayload);
        return { success: result.sent > 0, ...result };
      }
    }

    return { success: false, sent: 0, failed: 0, reason: 'NO_VALID_RECIPIENT_OR_UNINITIALIZED' };
  }

  static get initialized() {
    return this.isInitialized;
  }
}
