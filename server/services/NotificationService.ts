import { 
  notifications, 
  notificationReadStates, 
  users,
  type Notification,
  type InsertNotification
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, or, inArray, sql, isNull } from "drizzle-orm";
import Mustache from 'mustache';
import { z } from 'zod';
import { TelegramService } from './TelegramService';

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  payload?: Record<string, any>;
  priority?: number;
  recipients?: string[] | string;
  projectId?: string;
  scheduledAt?: Date;
  channelPreference?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
}

// تعريف أولويات الإشعارات
export const NotificationPriority = {
  INFO: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  EMERGENCY: 5,
} as const;

// تعريف أنواع الإشعارات
export const NotificationTypes = {
  SYSTEM: 'system',
  SAFETY: 'safety',
  TASK: 'task',
  PAYROLL: 'payroll',
  ANNOUNCEMENT: 'announcement',
  MAINTENANCE: 'maintenance',
  WARRANTY: 'warranty',
} as const;

// تعريف حالات الإشعارات
export const NotificationStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

/**
 * خدمة الإشعارات المتكاملة
 * تدعم إنشاء وإرسال وإدارة الإشعارات عبر قنوات متعددة
 */
export class NotificationService {
  constructor() {
    // خدمة مستقلة لا تحتاج لـ storage
  }

  /**
   * إنشاء إشعار جديد
   */
  async createNotification(data: NotificationPayload): Promise<Notification> {
    console.log(`📨 إنشاء إشعار جديد: ${data.title}`);
    
    // تحويل المستقبلين إلى مصفوفة
    let recipients: string[] = [];
    if (typeof data.recipients === 'string') {
      recipients = [data.recipients];
    } else if (Array.isArray(data.recipients)) {
      recipients = data.recipients;
    }

    const notificationData: InsertNotification = {
      projectId: data.projectId || null,
      type: data.type,
      title: data.title,
      body: data.body,
      payload: data.payload || null,
      priority: data.priority || NotificationPriority.MEDIUM,
      recipients: recipients.length > 0 ? recipients : null,
      channelPreference: data.channelPreference || { push: true, email: false, sms: false },
      scheduledAt: data.scheduledAt || null,
      createdBy: null,
    };

    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();

    console.log(`✅ تم إنشاء الإشعار: ${notification.id}`);

    // إرسال عبر FCM إذا كان التوكن متوفراً
    if (recipients.length > 0) {
      console.log(`ℹ️ [NotificationService] سيتم إرسال إشعارات لـ ${recipients.length} مستلم`);
    }

    TelegramService.sendNotification({
      type: data.type,
      title: data.title,
      body: data.body,
      priority: data.priority,
      projectId: data.projectId,
    }).catch((err) => {
      console.warn(`⚠️ [NotificationService] فشل إرسال تيليجرام: ${err.message}`);
    });

    return notification;
  }

  /**
   * إرسال إشعارات Push (تعطيل مؤقت لتجنب الأخطاء)
   */
  private async sendPushNotifications(recipients: string[], title: string, body: string, payload?: any): Promise<void> {
    console.log(`📱 [Push] محاكاة إرسال لـ ${recipients.length} مستخدم: ${title}`);
  }

  /**
   * إنشاء إشعار أمني طارئ
   */
  async createSafetyAlert(data: {
    title: string;
    body: string;
    location?: { lat: number; lng: number };
    severity: 'low' | 'medium' | 'high' | 'critical';
    projectId: string;
    recipients?: string[];
  }): Promise<Notification> {
    console.log(`🚨 إنشاء تنبيه أمني: ${data.severity}`);

    const priority = data.severity === 'critical' ? NotificationPriority.EMERGENCY :
                    data.severity === 'high' ? NotificationPriority.HIGH :
                    data.severity === 'medium' ? NotificationPriority.MEDIUM :
                    NotificationPriority.LOW;

    const payload = {
      type: 'safety',
      severity: data.severity,
      location: data.location,
      action: 'open_emergency'
    };

    return await this.createNotification({
      type: NotificationTypes.SAFETY,
      title: data.title,
      body: data.body,
      payload,
      priority,
      recipients: data.recipients || [],
      projectId: data.projectId,
      channelPreference: {
        push: true,
        email: data.severity === 'critical',
        sms: data.severity === 'critical'
      }
    });
  }

  /**
   * إنشاء إشعار مهمة جديدة
   */
  async createTaskNotification(data: {
    title: string;
    body: string;
    taskId: string;
    projectId: string;
    assignedTo: string[];
    dueDate?: Date;
  }): Promise<Notification> {
    console.log(`📋 إنشاء إشعار مهمة: ${data.title}`);

    const payload = {
      type: 'task',
      taskId: data.taskId,
      dueDate: data.dueDate?.toISOString(),
      action: 'open_task'
    };

    return await this.createNotification({
      type: NotificationTypes.TASK,
      title: data.title,
      body: data.body,
      payload,
      priority: NotificationPriority.HIGH,
      recipients: data.assignedTo,
      projectId: data.projectId,
      channelPreference: {
        push: true,
        email: true,
        sms: false
      }
    });
  }

  /**
   * إنشاء إشعار راتب
   */
  async createPayrollNotification(data: {
    workerId: string;
    workerName: string;
    amount: number;
    projectId: string;
    paymentType: 'salary' | 'bonus' | 'advance';
  }): Promise<Notification> {
    console.log(`💰 إنشاء إشعار راتب: ${data.workerName} - ${data.amount}`);

    const title = data.paymentType === 'salary' ? 'راتب مستحق' :
                  data.paymentType === 'bonus' ? 'مكافأة إضافية' :
                  'سلفة مالية';

    const payload = {
      type: 'payroll',
      workerId: data.workerId,
      amount: data.amount,
      paymentType: data.paymentType,
      action: 'open_payroll'
    };

    return await this.createNotification({
      type: NotificationTypes.PAYROLL,
      title: title,
      body: `تم ${title} للعامل ${data.workerName} بمبلغ ${data.amount} ريال`,
      payload,
      priority: NotificationPriority.MEDIUM,
      recipients: [data.workerId],
      projectId: data.projectId
    });
  }

  /**
   * إنشاء إعلان عام
   */
  async createAnnouncement(data: {
    title: string;
    body: string;
    projectId?: string;
    recipients: string[] | 'all';
    priority?: number;
  }): Promise<Notification> {
    console.log(`📢 إنشاء إعلان عام: ${data.title}`);

    let recipients: string[] = [];
    if (data.recipients === 'all') {
      // جلب جميع المستخدمين النشطين
      recipients = await this.getAllActiveUserIds();
    } else {
      recipients = data.recipients;
    }

    const payload = {
      type: 'announcement',
      action: 'open_announcement'
    };

    return await this.createNotification({
      type: NotificationTypes.ANNOUNCEMENT,
      title: data.title,
      body: data.body,
      payload,
      priority: data.priority || NotificationPriority.INFO,
      recipients,
      projectId: data.projectId,
      channelPreference: {
        push: true,
        email: false,
        sms: false
      }
    });
  }

  /**
   * جلب جميع معرفات المستخدمين النشطين
   */
  async getAllActiveUserIds(): Promise<string[]> {
    try {
      const users = await db.query.users.findMany({
        columns: {
          id: true
        }
      });
      
      const userIds = users.map(user => user.id);
      console.log(`📋 تم جلب ${userIds.length} مستخدم نشط للإشعارات`);
      return userIds;
    } catch (error) {
      console.error('خطأ في جلب المستخدمين النشطين:', error);
      // محاولة الحصول على مستخدم افتراضي من قاعدة البيانات بدلاً من 'default'
      try {
        const defaultUser = await db.query.users.findFirst({
          columns: { id: true },
          where: (users, { eq, or }) => or(
            eq(users.role, 'admin'),
            eq(users.email, 'admin')
          )
        });
        return defaultUser ? [defaultUser.id] : [];
      } catch {
        console.warn('⚠️ لا يمكن العثور على مستخدم افتراضي - سيتم إرسال إشعارات عامة فقط');
        return [];
      }
    }
  }

  /**
   * تحديد ما إذا كان المستخدم مسؤولاً
   */
  private async isAdmin(userId: string): Promise<boolean> {
    try {
      // التحقق السريع من المعرفات المعروفة
      if (userId === 'admin' || userId === 'مسؤول') {
        return true;
      }

      // التحقق من قاعدة البيانات
      const user = await db.query.users.findFirst({
        where: (users, { eq, or }) => or(
          eq(users.id, userId),
          eq(users.email, userId)
        )
      });

      if (!user) {
        console.log(`❌ لم يتم العثور على المستخدم: ${userId}`);
        return false;
      }

      // تحديد المسؤول بناءً على الدور - يشمل جميع أدوار الإدارة
      const adminRoles = ['admin', 'manager', 'مدير', 'مسؤول', 'مشرف'];
      const isAdminUser = adminRoles.includes(user.role || '');

      console.log(`🔍 فحص صلاحيات المستخدم ${user.email}: ${isAdminUser ? 'مسؤول' : 'مستخدم عادي'} (الدور: ${user.role})`);
      return isAdminUser;
    } catch (error) {
      console.error('خطأ في فحص صلاحيات المستخدم:', error);
      return false;
    }
  }

  /**
   * تحديد نوع الإشعارات المسموحة للمستخدم حسب الدور
   */
  private async getAllowedNotificationTypes(userId: string): Promise<string[]> {
    try {
      const user = await db.query.users.findFirst({
        where: (users, { eq, or }) => or(
          eq(users.id, userId),
          eq(users.email, userId)
        )
      });

      if (!user) {
        // مستخدم غير موجود - إشعارات أساسية فقط
        return ['user-welcome'];
      }

      const role = user.role || 'user';
      const adminRoles = ['admin', 'manager', 'مدير', 'مسؤول', 'مشرف'];
      
      if (adminRoles.includes(role)) {
        // المسؤول يرى جميع الإشعارات
        return ['system', 'security', 'error', 'maintenance', 'task', 'payroll', 'announcement', 'warranty', 'damaged', 'user-welcome'];
      } else {
        // المستخدم العادي يرى إشعارات محددة فقط - لا يرى إشعارات النظام أو الأمان
        return ['task', 'payroll', 'announcement', 'maintenance', 'warranty', 'user-welcome'];
      }
    } catch (error) {
      console.error('خطأ في تحديد الأنواع المسموحة:', error);
      return ['user-welcome']; // إشعارات أساسية في حالة الخطأ
    }
  }

  /**
   * جلب الإشعارات للمستخدم مع الفلترة المحسنة
   */
  async getUserNotifications(
    userId: string, 
    filters: {
      type?: string;
      unreadOnly?: boolean;
      projectId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    notifications: Notification[];
    unreadCount: number;
    total: number;
  }> {
    const isUserAdmin = await this.isAdmin(userId);
    console.log(`📥 جلب إشعارات المستخدم: ${userId} (نوع: ${isUserAdmin ? 'مسؤول' : 'مستخدم عادي'})`);

    const conditions = [];
    const allowedTypes = await this.getAllowedNotificationTypes(userId);

    // فلترة حسب الأنواع المسموحة للمستخدم - لا نفلتر إذا كان المستخدم مسؤول
    if (!isUserAdmin) {
      conditions.push(inArray(notifications.type, allowedTypes));
    }

    // فلترة حسب النوع المحدد
    if (filters.type && allowedTypes.includes(filters.type)) {
      conditions.push(eq(notifications.type, filters.type));
    }

    // فلترة حسب المشروع
    if (filters.projectId) {
      conditions.push(eq(notifications.projectId, filters.projectId));
    }

    // فلترة الإشعارات للمستخدم - تحسين البحث
    // ملاحظة: عمود recipients مخزن كنص وليس مصفوفة، نستخدم LIKE للبحث
    if (isUserAdmin) {
      // المسؤول يرى جميع الإشعارات أو التي تخصه
      conditions.push(
        or(
          sql`notifications.recipients::text LIKE '%' || ${userId} || '%'`,
          sql`notifications.recipients::text LIKE '%admin%'`,
          sql`notifications.recipients::text LIKE '%مسؤول%'`,
          isNull(notifications.recipients) // الإشعارات العامة
        )
      );
    } else {
      // المستخدم العادي يرى فقط إشعاراته الشخصية والعامة (من الأنواع المسموحة)
      conditions.push(
        or(
          sql`notifications.recipients::text LIKE '%' || ${userId} || '%'`,
          isNull(notifications.recipients) // الإشعارات العامة
        )
      );
    }

    // جلب الإشعارات
    const notificationList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    console.log(`🔍 تم العثور على ${notificationList.length} إشعار للمستخدم ${userId}`);

    // جلب حالة القراءة للإشعارات (مخصصة لكل مستخدم)
    const notificationIds = notificationList.map((n: any) => n.id);
    const readStates = notificationIds.length > 0 ? 
      await db
        .select()
        .from(notificationReadStates)
        .where(
          and(
            eq(notificationReadStates.userId, userId), // مهم: حالة القراءة مخصصة للمستخدم
            inArray(notificationReadStates.notificationId, notificationIds)
          )
        ) : [];

    console.log(`📖 تم العثور على ${readStates.length} حالة قراءة للمستخدم ${userId}`);
    
    // تسجيل تفاصيل حالات القراءة للتشخيص
    if (readStates.length > 0) {
      console.log(`📋 [DEBUG] عينة من حالات القراءة:`, readStates.slice(0, 3).map((rs: any) => ({
        notificationId: rs.notificationId,
        userId: rs.userId,
        isRead: rs.isRead,
        readAt: rs.readAt
      })));
    }

    // إنشاء خريطة للبحث السريع - استخدام notificationId من Drizzle
    const readStateMap = new Map<string, any>();
    for (const rs of readStates) {
      readStateMap.set(rs.notificationId, rs);
    }

    // دمج حالة القراءة مع الإشعارات
    const enrichedNotifications = notificationList.map((notification: any) => {
      const readState = readStateMap.get(notification.id);
      const isRead = readState ? readState.isRead === true : false;
      return {
        ...notification,
        isRead: isRead,
        status: isRead ? 'read' : 'unread',
        readAt: readState ? readState.readAt : null
      };
    });
    
    // تسجيل عينة من النتائج للتأكد
    console.log(`📋 [DEBUG] عينة من الإشعارات المدمجة:`, enrichedNotifications.slice(0, 2).map((n: any) => ({
      id: n.id,
      title: n.title?.substring(0, 30),
      isRead: n.isRead,
      status: n.status
    })));

    // فلترة غير المقروءة إذا طُلب ذلك
    const filteredNotifications = filters.unreadOnly 
      ? enrichedNotifications.filter((n: any) => !n.isRead)
      : enrichedNotifications;

    // حساب عدد غير المقروءة
    const unreadCount = enrichedNotifications.filter((n: any) => !n.isRead).length;

    console.log(`📊 المستخدم ${userId}: ${filteredNotifications.length} إشعار، غير مقروء: ${unreadCount}`);

    return {
      notifications: filteredNotifications,
      unreadCount,
      total: notificationList.length
    };
  }

  /**
   * فحص حالة قراءة إشعار معين للمستخدم
   */
  async checkNotificationReadState(notificationId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🔍 بدء فحص حالة الإشعار ${notificationId} للمستخدم ${userId}`);
      
      const readState = await db
        .select()
        .from(notificationReadStates)
        .where(
          and(
            eq(notificationReadStates.userId, userId),
            eq(notificationReadStates.notificationId, notificationId)
          )
        )
        .limit(1);
      
      console.log(`📖 نتائج فحص الإشعار ${notificationId}:`, readState);
      
      const isRead = readState.length > 0 && readState[0].isRead;
      console.log(`🎯 حالة النهائية للإشعار ${notificationId} للمستخدم ${userId}: ${isRead ? 'مقروء' : 'غير مقروء'}`);
      
      return isRead;
    } catch (error) {
      console.error(`❌ خطأ في فحص حالة الإشعار ${notificationId}:`, error);
      return false;
    }
  }

  /**
   * إعادة إنشاء جدول حالات القراءة
   */
  async recreateReadStatesTable(): Promise<void> {
    try {
      console.log('🔧 التأكد من وجود جدول notification_read_states (بدون حذف البيانات)...');
      
      // إنشاء الجدول فقط إذا لم يكن موجوداً (بدون حذف البيانات الموجودة)
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS notification_read_states (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          userId VARCHAR NOT NULL,
          notification_id VARCHAR NOT NULL,
          is_read BOOLEAN DEFAULT false NOT NULL,
          read_at TIMESTAMP,
          action_taken BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          UNIQUE(userId, notification_id)
        )
      `));
      
      console.log('✅ تم التأكد من وجود جدول notification_read_states (البيانات محفوظة)');
    } catch (error) {
      console.error('❌ خطأ في التأكد من الجدول:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    console.log(`✅ بدء تعليم الإشعار كمقروء: ${notificationId} للمستخدم: ${userId}`);

    try {
      await db
        .delete(notificationReadStates)
        .where(
          and(
            eq(notificationReadStates.userId, userId),
            eq(notificationReadStates.notificationId, notificationId)
          )
        );

      await db
        .insert(notificationReadStates)
        .values({
          userId,
          notificationId,
          isRead: true,
          readAt: new Date(),
        });
      
      console.log(`✅ تم تعليم الإشعار ${notificationId} كمقروء بنجاح`);
    } catch (error) {
      console.error(`❌ خطأ في تعليم الإشعار ${notificationId} كمقروء:`, error);
      throw error;
    }
  }

  /**
   * تعليم جميع الإشعارات كمقروءة
   */
  async markAllAsRead(userId: string, projectId?: string): Promise<void> {
    console.log(`✅ تعليم جميع الإشعارات كمقروءة للمستخدم: ${userId}`);

    // جلب جميع الإشعارات أولاً للفحص
    const allNotifications = await db
      .select({ 
        id: notifications.id, 
        recipients: notifications.recipients, 
        type: notifications.type,
        title: notifications.title 
      })
      .from(notifications)
      .limit(10);

    console.log(`📊 إجمالي الإشعارات في قاعدة البيانات: ${allNotifications.length}`);
    console.log(`📋 عينة من الإشعارات:`, allNotifications.map(n => ({
      id: n.id,
      recipients: n.recipients,
      type: n.type,
      title: n.title
    })));

    // شروط البحث المحسنة - جلب جميع الإشعارات للمستخدم
    const conditions = [];
    
    // إضافة شروط متعددة للتأكد من جلب جميع الإشعارات المناسبة
    if (projectId) {
      conditions.push(eq(notifications.projectId, projectId));
    }

    // إصلاح الاستعلام لتجنب مشاكل النوع
    const userNotifications = conditions.length > 0 
      ? await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(...conditions))
      : await db
          .select({ id: notifications.id })
          .from(notifications);

    console.log(`🎯 عدد الإشعارات المُفلترة: ${userNotifications.length}`);

    // تعليم كل إشعار كمقروء بشكل متتالي لضمان عدم حدوث تضارب
    let markedCount = 0;
    for (const notification of userNotifications) {
      try {
        await this.markAsRead(notification.id, userId);
        markedCount++;
        console.log(`✅ تم تعليم الإشعار ${notification.id} كمقروء`);
      } catch (error) {
        console.error(`❌ خطأ في تعليم الإشعار ${notification.id} كمقروء:`, error);
      }
    }

    console.log(`✅ تم تعليم ${markedCount} إشعار كمقروء`);
  }

  /**
   * جلب إحصائيات الإشعارات
   */
  /**
   * جلب إحصائيات الإشعارات
   */
  /**
   * جلب إحصائيات الإشعارات
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    critical: number;
    userStats: any[];
    typeStats: Record<string, number>;
  }> {
    try {
      const allNotifications = await db.select().from(notifications);
      const total = allNotifications.length;
      
      const readStates = await db.select().from(notificationReadStates);
      const userReadStates = readStates.filter(rs => rs.userId === userId);
      const readIds = new Set(userReadStates.filter(rs => rs.isRead).map(rs => rs.notificationId));
      
      const unreadCount = allNotifications.filter(n => !readIds.has(n.id)).length;
      const criticalCount = allNotifications.filter(n => n.priority === NotificationPriority.EMERGENCY || n.priority === NotificationPriority.HIGH || n.priority === 5 || n.priority === 1).length;
      
      const typeStats: Record<string, number> = {};
      allNotifications.forEach(n => {
        typeStats[n.type] = (typeStats[n.type] || 0) + 1;
      });

      // جلب إحصائيات المستخدمين بناءً على البيانات الفعلية
      const allUsers = await db.select().from(users).limit(10);

      const enrichedUserStats = allUsers.map(u => {
        const userSpecificReadStates = readStates.filter(rs => rs.userId === u.id);
        const lastRead = userSpecificReadStates
          .filter(rs => rs.readAt)
          .sort((a, b) => {
             const da = a.readAt ? new Date(a.readAt).getTime() : 0;
             const db_val = b.readAt ? new Date(b.readAt).getTime() : 0;
             return db_val - da;
          })[0];

        return {
          userId: u.id,
          userName: u.name || u.fullName || u.username || "مستخدم",
          userEmail: u.email,
          totalNotifications: total,
          readNotifications: userSpecificReadStates.filter(rs => rs.isRead).length,
          lastReadAt: lastRead ? lastRead.readAt : null
        };
      });

      return {
        total,
        unread: unreadCount,
        critical: criticalCount,
        userStats: enrichedUserStats,
        typeStats
      };
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      return { total: 0, unread: 0, critical: 0, userStats: [], typeStats: {} };
    }
  }


  async deleteNotification(notificationId: string, userId?: string): Promise<void> {
    console.log(`🗑️ حذف الإشعار: ${notificationId}${userId ? ` للمستخدم: ${userId}` : ''}`);

    try {
      // حذف حالات القراءة المرتبطة بالإشعار
      const readStatesConditions = [eq(notificationReadStates.notificationId, notificationId)];
      if (userId) {
        readStatesConditions.push(eq(notificationReadStates.userId, userId));
      }

      await db
        .delete(notificationReadStates)
        .where(and(...readStatesConditions));

      // حذف الإشعار نفسه من جدول الإشعارات
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
        
      console.log(`✅ تم حذف الإشعار ${notificationId} بنجاح`);
    } catch (error) {
      console.error(`❌ خطأ في حذف الإشعار ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات الإشعارات
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<number, number>;
    userType: 'admin' | 'user';
    allowedTypes: string[];
  }> {
    console.log(`📊 حساب إحصائيات الإشعارات للمستخدم: ${userId}`);

    const isAdmin = await this.isAdmin(userId);
    const allowedTypes = await this.getAllowedNotificationTypes(userId);
    
    // بناء شروط البحث مع فصل الصلاحيات
    const conditions = [inArray(notifications.type, allowedTypes)];
    
    if (isAdmin) {
      const adminCondition = or(
        sql`${notifications.recipients} @> ARRAY[${userId}]`,
        sql`${notifications.recipients} @> ARRAY['admin']`,
        sql`${notifications.recipients} @> ARRAY['مسؤول']`,
        sql`${notifications.recipients} IS NULL`
      );
      if (adminCondition) {
        conditions.push(adminCondition);
      }
    } else {
      const userCondition = or(
        sql`${notifications.recipients} @> ARRAY[${userId}]`,
        sql`${notifications.recipients} IS NULL`
      );
      if (userCondition) {
        conditions.push(userCondition);
      }
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions));

    const readStates = await db
      .select()
      .from(notificationReadStates)
      .where(eq(notificationReadStates.userId, userId));

    const readNotificationIds = readStates
      .filter((rs: any) => rs.isRead)
      .map((rs: any) => rs.notificationId);

    const unread = userNotifications.filter((n: any) => !readNotificationIds.includes(n.id));

    // إحصائيات حسب النوع
    const byType: Record<string, number> = {};
    userNotifications.forEach((n: any) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    // إحصائيات حسب الأولوية
    const byPriority: Record<number, number> = {};
    userNotifications.forEach((n: any) => {
      byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
    });

    const stats = {
      total: userNotifications.length,
      unread: unread.length,
      byType,
      byPriority,
      userType: isAdmin ? 'admin' as const : 'user' as const,
      allowedTypes
    };

    console.log(`📊 مستخدم ${userId} (نوع: ${stats.userType}): ${stats.total} إشعار، ${stats.unread} غير مقروء`);
    return stats;
  }

  /**
   * جلب جميع الإشعارات للمسؤول مع إحصائيات القراءة
   */
  async getAllNotificationsForAdmin(options: {
    limit?: number;
    offset?: number;
    type?: string;
    priority?: number;
  } = {}): Promise<{
    notifications: any[];
    total: number;
  }> {
    console.log('📋 [Admin] جلب جميع الإشعارات للمسؤول');
    
    const { limit = 50, offset = 0, type, priority } = options;
    
    // بناء شروط البحث
    const conditions: any[] = [];
    
    if (type) {
      conditions.push(eq(notifications.type, type));
    }
    
    if (priority !== undefined) {
      conditions.push(eq(notifications.priority, priority));
    }
    
    // جلب الإشعارات
    let query = db.select().from(notifications);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const allNotifications = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    // جلب حالات القراءة لكل إشعار
    const notificationsWithStats = await Promise.all(
      allNotifications.map(async (notification: any) => {
        const readStates = await db
          .select()
          .from(notificationReadStates)
          .where(eq(notificationReadStates.notificationId, notification.id));
        
        const totalReads = readStates.filter((rs: any) => rs.isRead).length;
        const totalUsers = readStates.length || 1;
        
        return {
          ...notification,
          readStates: readStates.map((rs: any) => ({
            userId: rs.userId,
            isRead: rs.isRead,
            readAt: rs.readAt,
            actionTaken: rs.actionTaken || false
          })),
          totalReads,
          totalUsers
        };
      })
    );
    
    // عدد إجمالي الإشعارات
    const countQuery = db.select({ count: sql`count(*)` }).from(notifications);
    if (conditions.length > 0) {
      (countQuery as any).where(and(...conditions));
    }
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);
    
    console.log(`✅ [Admin] تم جلب ${notificationsWithStats.length} إشعار من أصل ${total}`);
    
    return {
      notifications: notificationsWithStats,
      total
    };
  }

  /**
   * جلب إحصائيات نشاط المستخدمين للإشعارات
   */
  async getUserActivityStats(): Promise<any[]> {
    console.log('📊 [Admin] جلب إحصائيات نشاط المستخدمين');
    
    // جلب جميع المستخدمين
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role
    }).from(users);
    
    // جلب إحصائيات لكل مستخدم
    const userStats = await Promise.all(
      allUsers.map(async (user: any) => {
        // جلب حالات قراءة المستخدم
        const userReadStates = await db
          .select()
          .from(notificationReadStates)
          .where(eq(notificationReadStates.userId, user.id));
        
        const readNotifications = userReadStates.filter((rs: any) => rs.isRead).length;
        const unreadNotifications = userReadStates.filter((rs: any) => !rs.isRead).length;
        const totalNotifications = userReadStates.length;
        
        // آخر نشاط
        const lastRead = userReadStates
          .filter((rs: any) => rs.readAt)
          .sort((a: any, b: any) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime())[0];
        
        return {
          userId: user.id,
          userName: user.name || user.email?.split('@')[0] || 'مستخدم',
          userEmail: user.email,
          userRole: user.role || 'user',
          totalNotifications,
          readNotifications,
          unreadNotifications,
          lastActivity: lastRead?.readAt || null,
          readPercentage: totalNotifications > 0 
            ? Math.round((readNotifications / totalNotifications) * 100) 
            : 0
        };
      })
    );
    
    console.log(`✅ [Admin] تم جلب إحصائيات ${userStats.length} مستخدم`);
    
    return userStats;
  }
}