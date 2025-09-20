import { 
  notifications, 
  notificationReadStates, 
  systemNotifications,
  type Notification,
  type InsertNotification,
  type SystemNotification,
  type InsertSystemNotification
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, or, inArray, sql } from "drizzle-orm";
import Mustache from 'mustache';
import { z } from 'zod';

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
      createdBy: null, // سيتم تحديثه لاحقاً بناء على السياق
    };

    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();

    console.log(`✅ تم إنشاء الإشعار: ${notification.id}`);
    return notification;
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
      return ['default']; // المستخدم الافتراضي كحل احتياطي
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
    if (isUserAdmin) {
      // المسؤول يرى جميع الإشعارات أو التي تخصه
      conditions.push(
        or(
          sql`${notifications.recipients} @> ${JSON.stringify([userId])}::jsonb`,
          sql`${notifications.recipients} @> ${JSON.stringify(['admin'])}::jsonb`,
          sql`${notifications.recipients} @> ${JSON.stringify(['مسؤول'])}::jsonb`,
          eq(notifications.recipients, null) // الإشعارات العامة
        )
      );
    } else {
      // المستخدم العادي يرى فقط إشعاراته الشخصية والعامة (من الأنواع المسموحة)
      conditions.push(
        or(
          sql`${notifications.recipients} @> ${JSON.stringify([userId])}::jsonb`,
          eq(notifications.recipients, null) // الإشعارات العامة
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

    // دمج حالة القراءة مع الإشعارات
    const enrichedNotifications = notificationList.map((notification: any) => {
      const readState = readStates.find((rs: any) => rs.notificationId === notification.id);
      return {
        ...notification,
        isRead: readState ? readState.isRead : false,
        readAt: readState ? readState.readAt : null
      };
    });

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
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS notification_read_states (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          notification_id VARCHAR NOT NULL,
          is_read BOOLEAN DEFAULT false NOT NULL,
          read_at TIMESTAMP,
          action_taken BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          UNIQUE(user_id, notification_id)
        )
      `);
      
      console.log('✅ تم التأكد من وجود جدول notification_read_states (البيانات محفوظة)');
    } catch (error) {
      console.error('❌ خطأ في التأكد من الجدول:', error);
      throw error;
    }
  }

  /**
   * تعليم إشعار كمقروء - حل مبسط
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    console.log(`✅ بدء تعليم الإشعار كمقروء: ${notificationId} للمستخدم: ${userId}`);

    try {
      // حذف السجل الموجود أولاً (إن وجد)
      const deleteResult = await db.execute(sql`
        DELETE FROM notification_read_states 
        WHERE user_id = ${userId} AND notification_id = ${notificationId}
      `);
      console.log(`🗑️ تم حذف ${deleteResult.rowCount || 0} سجل سابق`);
      
      // إدراج سجل جديد
      const insertResult = await db.execute(sql`
        INSERT INTO notification_read_states (user_id, notification_id, is_read, read_at, action_taken)
        VALUES (${userId}, ${notificationId}, true, NOW(), true)
      `);
      console.log(`➕ تم إدراج سجل جديد: ${insertResult.rowCount || 0} صف`);
      
      // تحقق من الحفظ
      const verifyResult = await db.execute(sql`
        SELECT * FROM notification_read_states 
        WHERE user_id = ${userId} AND notification_id = ${notificationId}
      `);
      console.log(`🔍 تحقق من الحفظ: تم العثور على ${verifyResult.rows.length} سجل`);
      
      console.log(`✅ تم تعليم الإشعار ${notificationId} كمقروء بنجاح`);
    } catch (error) {
      console.error(`❌ خطأ في تعليم الإشعار ${notificationId} كمقروء:`, error);
      throw error; // أرمي الخطأ بدلاً من تجاهله لأرى السبب
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
   * حذف إشعار
   */
  async deleteNotification(notificationId: string): Promise<void> {
    console.log(`🗑️ حذف الإشعار: ${notificationId}`);

    // حذف حالات القراءة أولاً
    await db
      .delete(notificationReadStates)
      .where(eq(notificationReadStates.notificationId, notificationId));

    // ملاحظة: تم تبسيط النظام - لا يوجد طابور إرسال حالياً

    // حذف الإشعار
    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));

    console.log(`✅ تم حذف الإشعار: ${notificationId}`);
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
      conditions.push(
        or(
          sql`${notifications.recipients} @> ${JSON.stringify([userId])}::jsonb`,
          sql`${notifications.recipients} @> ${JSON.stringify(['admin'])}::jsonb`,
          sql`${notifications.recipients} @> ${JSON.stringify(['مسؤول'])}::jsonb`,
          eq(notifications.recipients, null)
        )!
      );
    } else {
      conditions.push(
        or(
          sql`${notifications.recipients} @> ${JSON.stringify([userId])}::jsonb`,
          eq(notifications.recipients, null)
        )!
      );
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

  // ==================== دوال القوالب المتقدمة ====================

  /**
   * مخطط التحقق من صحة القوالب
   */
  private templateSchema = z.object({
    name: z.string().min(1, 'اسم القالب مطلوب'),
    type: z.string().min(1, 'نوع القالب مطلوب'),
    titleTemplate: z.string().min(1, 'قالب العنوان مطلوب'),
    bodyTemplate: z.string().min(1, 'قالب المحتوى مطلوب'),
    isActive: z.boolean().optional().default(true),
    priority: z.number().optional().default(NotificationPriority.MEDIUM),
    channelPreference: z.any().optional(), // سنستخدم any لتجنب مشاكل النوع مؤقتاً
    variables: z.array(z.object({
      name: z.string().min(1, 'اسم المتغير مطلوب'),
      type: z.string().optional().default('string'),
      required: z.boolean().optional().default(false),
      example: z.string().optional()
    })).optional().default([])
  });

  /**
   * إنشاء قالب إشعار جديد
   */
  async createNotificationTemplate(data: any): Promise<DBNotificationTemplate> {
    console.log(`🎨 إنشاء قالب إشعار جديد: ${data.name}`);
    
    try {
      // التحقق من صحة البيانات
      const validated = this.templateSchema.parse(data);
      
      // التحقق من عدم وجود قالب بنفس الاسم والنوع
      const existing = await db
        .select()
        .from(notificationTemplates)
        .where(
          and(
            eq(notificationTemplates.name, validated.name),
            eq(notificationTemplates.type, validated.type)
          )
        );
      
      if (existing.length > 0) {
        throw new Error(`قالب بالاسم "${validated.name}" ونوع "${validated.type}" موجود بالفعل`);
      }
      
      // تحضير البيانات للإدراج (بدون variables مؤقتاً)
      const templateData: InsertNotificationTemplate = {
        name: validated.name,
        type: validated.type,
        titleTemplate: validated.titleTemplate,
        bodyTemplate: validated.bodyTemplate,
        isActive: validated.isActive,
        priority: validated.priority,
        channelPreference: validated.channelPreference || { push: true, email: false, sms: false }
      };
      
      // إدراج القالب
      const [template] = await db
        .insert(notificationTemplates)
        .values(templateData)
        .returning();
      
      console.log(`✅ تم إنشاء القالب بنجاح: ${template.id}`);
      return template;
      
    } catch (error) {
      console.error(`❌ خطأ في إنشاء القالب:`, error);
      if (error instanceof z.ZodError) {
        const arabicErrors = error.errors.map(err => {
          const field = err.path.join('.');
          return `${err.message}`;
        }).join(', ');
        throw new Error(`بيانات غير صحيحة: ${arabicErrors}`);
      }
      throw error;
    }
  }

  /**
   * تحديث قالب إشعار موجود
   */
  async updateTemplate(id: string, data: any): Promise<DBNotificationTemplate> {
    console.log(`🎨 تحديث القالب: ${id}`);
    
    try {
      // التحقق من وجود القالب أولاً
      const [existing] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.id, id));
      
      if (!existing) {
        throw new Error(`القالب بالمعرف ${id} غير موجود`);
      }
      
      // التحقق من صحة البيانات الجديدة (partial)
      const validated = this.templateSchema.partial().parse(data);
      
      // التحقق من عدم تضارب الاسم والنوع (إذا تم تغييرهما)
      if (validated.name || validated.type) {
        const checkName = validated.name || existing.name;
        const checkType = validated.type || existing.type;
        
        const conflicting = await db
          .select()
          .from(notificationTemplates)
          .where(
            and(
              eq(notificationTemplates.name, checkName),
              eq(notificationTemplates.type, checkType),
              sql`${notificationTemplates.id} != ${id}`
            )
          );
        
        if (conflicting.length > 0) {
          throw new Error(`قالب آخر بالاسم "${checkName}" ونوع "${checkType}" موجود بالفعل`);
        }
      }
      
      // تحديث البيانات
      const updateData = {
        ...validated,
        updatedAt: new Date()
      };
      
      const [updated] = await db
        .update(notificationTemplates)
        .set(updateData)
        .where(eq(notificationTemplates.id, id))
        .returning();
      
      console.log(`✅ تم تحديث القالب بنجاح: ${updated.id}`);
      return updated;
      
    } catch (error) {
      console.error(`❌ خطأ في تحديث القالب:`, error);
      if (error instanceof z.ZodError) {
        const arabicErrors = error.errors.map(err => {
          const field = err.path.join('.');
          return `${field}: ${err.message}`;
        }).join(', ');
        throw new Error(`بيانات غير صحيحة: ${arabicErrors}`);
      }
      throw error;
    }
  }

  /**
   * التحقق من صحة متغيرات القالب
   */
  validateTemplateVariables(
    templateRecord: ExtendedNotificationTemplate, 
    payloadVars: Record<string, any>
  ): { ok: boolean; missing: string[]; invalid: string[] } {
    console.log(`🔍 التحقق من متغيرات القالب: ${templateRecord.name}`);
    
    const variables = templateRecord.variables || [];
    const missing: string[] = [];
    const invalid: string[] = [];
    
    // فحص المتغيرات المطلوبة
    for (const variable of variables) {
      if (variable.required && !(variable.name in payloadVars)) {
        missing.push(variable.name);
      }
      
      // فحص نوع البيانات إذا كان محدداً
      if (variable.name in payloadVars && variable.type) {
        const value = payloadVars[variable.name];
        const expectedType = variable.type;
        const actualType = typeof value;
        
        // تحقق بسيط من النوع
        if (expectedType === 'number' && actualType !== 'number') {
          invalid.push(`${variable.name}: متوقع رقم، تم تمرير ${actualType}`);
        } else if (expectedType === 'string' && actualType !== 'string') {
          invalid.push(`${variable.name}: متوقع نص، تم تمرير ${actualType}`);
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          invalid.push(`${variable.name}: متوقع true/false، تم تمرير ${actualType}`);
        }
      }
    }
    
    const result = {
      ok: missing.length === 0 && invalid.length === 0,
      missing,
      invalid
    };
    
    console.log(`📊 نتيجة التحقق:`, result);
    return result;
  }

  /**
   * عرض القالب مع البيانات (آمن - لا يسمح بتنفيذ الكود)
   */
  renderTemplate(
    titleTemplate: string, 
    bodyTemplate: string, 
    vars: Record<string, any>
  ): { title: string; body: string } {
    console.log(`🎨 عرض القالب مع البيانات`);
    
    try {
      // تنظيف البيانات من أي كود ضار محتمل
      const safeVars = this.sanitizeTemplateVars(vars);
      
      // استخدام Mustache لعرض آمن (لا يدعم تنفيذ الكود)
      const title = Mustache.render(titleTemplate, safeVars);
      const body = Mustache.render(bodyTemplate, safeVars);
      
      console.log(`✅ تم عرض القالب بنجاح`);
      return { title, body };
      
    } catch (error: unknown) {
      console.error(`❌ خطأ في عرض القالب:`, error);
      throw new Error(`فشل في عرض القالب: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  }

  /**
   * تنظيف متغيرات القالب من أي كود ضار
   */
  private sanitizeTemplateVars(vars: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(vars)) {
      if (typeof value === 'string') {
        // إزالة أي محاولات لحقن كود
        sanitized[key] = value
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/{{[^}]*}}/g, '') // منع القوالب المتداخلة
          .trim();
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = '';
      } else {
        // تحويل الكائنات والمصفوفات إلى نص آمن
        sanitized[key] = JSON.stringify(value).replace(/[<>"']/g, '');
      }
    }
    
    return sanitized;
  }

  /**
   * إنشاء إشعار من قالب
   */
  async createNotificationFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    options: {
      recipients: string[];
      projectId?: string;
      scheduledAt?: Date;
      overrides?: {
        priority?: number;
        channelPreference?: { push?: boolean; email?: boolean; sms?: boolean };
      }
    }
  ): Promise<Notification> {
    console.log(`🎨 إنشاء إشعار من القالب: ${templateId}`);
    
    try {
      // جلب القالب
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.id, templateId));
      
      if (!template) {
        throw new Error(`القالب بالمعرف ${templateId} غير موجود`);
      }
      
      if (!template.isActive) {
        throw new Error(`القالب "${template.name}" غير نشط`);
      }
      
      // إنشاء قالب موسع مع متغيرات افتراضية للاختبار
      const extendedTemplate: ExtendedNotificationTemplate = {
        ...template,
        variables: [] // سنضيف المتغيرات لاحقاً عند تحديث Schema
      };
      
      // التحقق من صحة المتغيرات
      const validation = this.validateTemplateVariables(extendedTemplate, variables);
      if (!validation.ok) {
        const errors = [];
        if (validation.missing.length > 0) {
          errors.push(`متغيرات مفقودة: ${validation.missing.join(', ')}`);
        }
        if (validation.invalid.length > 0) {
          errors.push(`متغيرات غير صحيحة: ${validation.invalid.join(', ')}`);
        }
        throw new Error(errors.join(' | '));
      }
      
      // عرض القالب
      const rendered = this.renderTemplate(
        template.titleTemplate,
        template.bodyTemplate,
        variables
      );
      
      // إنشاء الإشعار
      const notificationData: NotificationPayload = {
        type: template.type,
        title: rendered.title,
        body: rendered.body,
        payload: {
          templateId: template.id,
          variables
        },
        priority: options.overrides?.priority || template.priority,
        recipients: options.recipients,
        projectId: options.projectId,
        scheduledAt: options.scheduledAt,
        channelPreference: options.overrides?.channelPreference || (template.channelPreference as any)
      };
      
      return await this.createNotification(notificationData);
      
    } catch (error: unknown) {
      console.error(`❌ خطأ في إنشاء إشعار من القالب:`, error);
      throw error;
    }
  }

  /**
   * جلب جميع القوالب مع الفلترة
   */
  async getTemplates(filters: {
    type?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: DBNotificationTemplate[]; total: number }> {
    console.log(`📋 جلب قوالب الإشعارات`);
    
    const conditions = [];
    
    if (filters.type) {
      conditions.push(eq(notificationTemplates.type, filters.type));
    }
    
    if (filters.isActive !== undefined) {
      conditions.push(eq(notificationTemplates.isActive, filters.isActive));
    }
    
    if (filters.search) {
      conditions.push(
        or(
          sql`${notificationTemplates.name} ILIKE ${'%' + filters.search + '%'}`,
          sql`${notificationTemplates.titleTemplate} ILIKE ${'%' + filters.search + '%'}`
        )
      );
    }
    
    const query = conditions.length > 0 
      ? db.select().from(notificationTemplates).where(and(...conditions))
      : db.select().from(notificationTemplates);
    
    const templates = await query
      .orderBy(desc(notificationTemplates.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);
    
    // حساب العدد الكلي
    const countQuery = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)` }).from(notificationTemplates).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(notificationTemplates);
    
    const [{ count }] = await countQuery;
    
    console.log(`📊 تم جلب ${templates.length} قالب من أصل ${count}`);
    
    return {
      templates,
      total: count
    };
  }

  /**
   * حذف قالب
   */
  async deleteTemplate(id: string): Promise<void> {
    console.log(`🗑️ حذف القالب: ${id}`);
    
    // التحقق من وجود إشعارات تستخدم هذا القالب
    const usedNotifications = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(sql`${notifications.payload}->>'templateId' = ${id}`)
      .limit(1);
    
    if (usedNotifications.length > 0) {
      throw new Error('لا يمكن حذف القالب لأنه مستخدم في إشعارات موجودة');
    }
    
    await db
      .delete(notificationTemplates)
      .where(eq(notificationTemplates.id, id));
    
    console.log(`✅ تم حذف القالب: ${id}`);
  }
}