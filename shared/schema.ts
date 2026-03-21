import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, jsonb, uuid, inet, serial, doublePrecision, index, uniqueIndex, check, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Monitoring Tables (OTLP Compatible) ---

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique("devices_device_id_key"),
  model: text("model"),
  manufacturer: varchar("manufacturer"),
  osVersion: text("os_version"),
  sdkVersion: integer("sdk_version"),
  appVersion: text("app_version"),
  lastSeen: timestamp("last_seen", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
  metadata: jsonb("metadata"),
});

export const crashes = pgTable("crashes", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id"),
  exceptionType: text("exception_type"),
  message: text("message"),
  stackTrace: text("stack_trace").notNull(),
  severity: text("severity"),
  appState: jsonb("app_state"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
  appVersion: text("app_version"),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    crashes_device_id_fkey: foreignKey({ name: "crashes_device_id_fkey", columns: [table.deviceId], foreignColumns: [devices.deviceId] })
  }));

export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id"),
  metricName: text("metric_name").notNull(),
  metricValue: doublePrecision("metric_value").notNull(),
  unit: text("unit"),
  attributes: jsonb("attributes"),
  timestamp: timestamp("timestamp", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    metrics_device_id_fkey: foreignKey({ name: "metrics_device_id_fkey", columns: [table.deviceId], foreignColumns: [devices.deviceId] })
  }));

export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, lastSeen: true });
export const insertCrashSchema = createInsertSchema(crashes).omit({ id: true, timestamp: true });
export const insertMetricSchema = createInsertSchema(metrics).omit({ id: true, timestamp: true });

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Crash = typeof crashes.$inferSelect;
export type InsertCrash = z.infer<typeof insertCrashSchema>;
export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;

// --- Existing Tables ---

// Helper to add sync flags to any table
export const syncFields = {
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  version: integer("version").default(1).notNull(), // For Vector Clocks / State Sync
  lastModifiedBy: varchar("last_modified_by"),
};

// Users table (جدول المستخدمين)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique("users_email_unique"),
  password: text("password").notNull(), 
  password_algo: text("password_algo").default("argon2id"), // argon2id, legacy
  first_name: text("first_name"),
  last_name: text("last_name"),
  full_name: text("full_name"),
  phone: text("phone"),
  birth_date: text("birth_date"),
  birth_place: text("birth_place"),
  gender: text("gender"),
  role: text("role").notNull().default("admin"), 
  is_active: boolean("is_active").default(true).notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(false).notNull(), 
  email_verified_at: timestamp("email_verified_at"), 
  totp_secret: text("totp_secret"), 
  mfa_enabled: boolean("mfa_enabled").default(false).notNull(), 
  fcm_token: text("fcm_token"), 
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  last_login: timestamp("last_login"),
  // Refresh Token fields
  refresh_token_hash: text("refresh_token_hash"),
  refresh_token_expires_at: timestamp("refresh_token_expires_at"),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  version: integer("version").default(1).notNull(), 
  lastModifiedBy: varchar("last_modified_by"),
}, (table): Record<string, any> => ({
    users_last_modified_by_fkey: foreignKey({ name: "users_last_modified_by_fkey", columns: [table.lastModifiedBy], foreignColumns: [users.id] })
  }));

// Update syncFields after users is defined
// (syncFields as any).lastModifiedBy = varchar("last_modified_by");


// Refresh Tokens table (جدول توكنات التحديث)
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  replacedBy: uuid("replaced_by"),
  revoked: boolean("revoked").default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  parentId: uuid("parent_id"),
}, (table): Record<string, any> => ({
  idxRefreshTokensTokenHash: index("idx_refresh_tokens_token_hash").on(table.tokenHash),
  idxRefreshTokensUserId: index("idx_refresh_tokens_user_id").on(table.user_id),
    refresh_tokens_parent_id_fkey: foreignKey({ name: "refresh_tokens_parent_id_fkey", columns: [table.parentId], foreignColumns: [refreshTokens.id] }),
    refresh_tokens_replaced_by_fkey: foreignKey({ name: "refresh_tokens_replaced_by_fkey", columns: [table.replacedBy], foreignColumns: [refreshTokens.id] }),
    refresh_tokens_user_id_fkey: foreignKey({ name: "refresh_tokens_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] }).onDelete("cascade")
  }));

// Audit Logs table (جدول سجلات التدقيق)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  user_id: text("user_id"),
  action: text("action").notNull(),
  entityName: text("entity_name"),
  entityId: text("entity_id"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  meta: jsonb("meta"),
  ipAddress: text("ip_address"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxAuditLogsTimestamp: index("idx_audit_logs_timestamp").on(table.timestamp),
  idxAuditLogsUserId: index("idx_audit_logs_user_id").on(table.user_id),
}));

// Emergency Users table (جدول مستخدمي الطوارئ - محلي فقط)
export const emergencyUsers = pgTable("emergency_users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique("emergency_users_email_key"),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmergencyUserSchema = createInsertSchema(emergencyUsers);
export type EmergencyUser = typeof emergencyUsers.$inferSelect;
export type InsertEmergencyUser = z.infer<typeof insertEmergencyUserSchema>;

// Tasks table (جدول المهام)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true,
  created_at: true 
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;


// Authentication User Sessions table (جدول جلسات المستخدمين)
export const authUserSessions = pgTable("auth_user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  sessionToken: varchar("session_token"),
  deviceFingerprint: varchar("device_fingerprint"),
  userAgent: text("user_agent"),
  ipAddress: inet("ip_address"),
  locationData: jsonb("location_data"),
  isTrustedDevice: boolean("is_trusted_device").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deviceId: varchar("device_id"),
  deviceName: varchar("device_name"),
  browserName: varchar("browser_name"),
  browserVersion: varchar("browser_version"),
  osName: varchar("os_name"),
  osVersion: varchar("os_version"),
  country: varchar("country"),
  city: varchar("city"),
  timezone: varchar("timezone"),
  loginMethod: varchar("login_method"),
  securityFlags: jsonb("security_flags"),
  deviceType: varchar("device_type"),
  refresh_token_hash: text("refresh_token_hash"),
  accessTokenHash: text("access_token_hash"),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: varchar("revoked_reason"),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Auth Request Nonces table (جدول حماية إعادة التشغيل)
export const authRequestNonces = pgTable("auth_request_nonces", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nonce: varchar("nonce", { length: 128 }).notNull().unique("auth_request_nonces_nonce_key"),
  user_id: varchar("user_id"),
  endpoint: text("endpoint").notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  ipAddress: text("ip_address"),
  requestTimestamp: timestamp("request_timestamp").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  idxNonce: index("idx_auth_request_nonces_nonce").on(table.nonce),
  idxExpiresAt: index("idx_auth_request_nonces_expires").on(table.expiresAt),
    auth_request_nonces_user_id_fkey: foreignKey({ name: "auth_request_nonces_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] }).onDelete("cascade")
  
  }));

export const insertAuthRequestNonceSchema = createInsertSchema(authRequestNonces).omit({ id: true, receivedAt: true });
export type AuthRequestNonce = typeof authRequestNonces.$inferSelect;
export type InsertAuthRequestNonce = z.infer<typeof insertAuthRequestNonceSchema>;

// Notifications table (جدول الإشعارات)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id"), // null if broadcast
  title: text("title").notNull(),
  body: text("body").notNull(),
  message: text("message"), // Keeping for backward compatibility if needed, but 'body' is preferred
  type: text("type").notNull(),
  priority: integer("priority").default(3).notNull(),
  project_id: varchar("project_id"),
  createdBy: varchar("created_by"),
  recipients: text("recipients").array(), // For targeted multiple users
  payload: jsonb("payload"),
  meta: jsonb("meta"),
  readBy: text("read_by").array(),
  deliveredTo: text("delivered_to").array(),
  scheduledAt: timestamp("scheduled_at"),
  channelPreference: jsonb("channel_preference"),
  isRead: boolean("is_read").default(false).notNull(),
  targetPlatform: text("target_platform").default("all").notNull(), // 'all', 'android', 'web'
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxNotificationsCreatedAt: index("idx_notifications_created_at").on(table.created_at),
  idxNotificationsProjectId: index("idx_notifications_project_id").on(table.project_id),
    notifications_user_id_fkey: foreignKey({ name: "notifications_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] })
  
  }));

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  created_at: true,
  isRead: true 
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Email Verification Tokens table (جدول رموز التحقق من البريد الإلكتروني)
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  email: text("email").notNull(), 
  token: varchar("token").notNull(), 
  tokenHash: varchar("token_hash").notNull(), 
  verificationLink: text("verification_link").notNull(), 
  expiresAt: timestamp("expires_at").notNull(), 
  verifiedAt: timestamp("verified_at"), 
  created_at: timestamp("created_at").defaultNow().notNull(),
  ipAddress: inet("ip_address"), 
  userAgent: text("user_agent"), 
  attemptsCount: integer("attempts_count").default(0).notNull(), 
  identifier: text("identifier").unique("email_verification_tokens_identifier_key"),
  metadata: jsonb("metadata"), // بيانات إضافية للتحقق الذكي
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Password Reset Tokens table (جدول رموز استرجاع كلمة المرور)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  token: varchar("token").notNull(), // الرمز المرسل للمستخدم
  tokenHash: varchar("token_hash").notNull(), // hash الرمز المحفوظ في قاعدة البيانات
  expiresAt: timestamp("expires_at").notNull(), // انتهاء صلاحية الرمز (عادة ساعة واحدة)
  usedAt: timestamp("used_at"), // متى تم استخدام الرمز
  created_at: timestamp("created_at").defaultNow().notNull(),
  ipAddress: inet("ip_address"), // IP الذي طلب الاسترجاع
  userAgent: text("user_agent"), // User Agent الذي طلب الاسترجاع
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Project Types table (أنواع المشاريع) - يجب تعريفه قبل projects
export const projectTypes = pgTable("project_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  ...syncFields,
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
    project_types_last_modified_by_fkey: foreignKey({ name: "project_types_last_modified_by_fkey", columns: [table.lastModifiedBy], foreignColumns: [users.id] })
  }));

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"), // إعادة إضافة الوصف
  location: text("location"), // إعادة إضافة الموقع
  clientName: text("client_name"), // إعادة إضافة اسم العميل
  budget: decimal("budget", { precision: 15, scale: 2 }), // إعادة إضافة الميزانية
  startDate: date("start_date"), // إعادة إضافة تاريخ البدء
  endDate: date("end_date"), // إعادة إضافة تاريخ الانتهاء
  status: text("status").notNull().default("active"), // active, completed, paused
  engineerId: varchar("engineer_id"), // معرف المهندس/المشرف من جدول المستخدمين
  managerName: text("manager_name"), // إعادة إضافة اسم المدير
  contactPhone: text("contact_phone"), // إعادة إضافة رقم الهاتف
  notes: text("notes"), // إعادة إضافة الملاحظات
  imageUrl: text("image_url"), // صورة المشروع (اختيارية)
  project_type_id: integer("project_type_id"), // نوع المشروع
  is_active: boolean("is_active").default(true).notNull(), // إعادة إضافة الحالة النشطة
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(), // إعادة إضافة تحديث الوقت
  ...syncFields,
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxProjectsCreatedAt: index("idx_projects_created_at").on(table.created_at),
    projects_last_modified_by_fkey: foreignKey({ name: "projects_last_modified_by_fkey", columns: [table.lastModifiedBy], foreignColumns: [users.id] })
  
  }));

// Workers table
export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // معلم (master), عامل (worker)
  dailyWage: decimal("daily_wage", { precision: 15, scale: 2 }).notNull(),
  phone: text("phone"), // رقم الهاتف
  hireDate: text("hire_date"), // تاريخ التوظيف (YYYY-MM-DD)
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  created_by: varchar("created_by"),
  ...syncFields,
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueWorkerPerUser: uniqueIndex("workers_name_created_by_unique").on(table.name, table.created_by),
    workers_created_by_fkey: foreignKey({ name: "workers_created_by_fkey", columns: [table.created_by], foreignColumns: [users.id] }),
    workers_last_modified_by_fkey: foreignKey({ name: "workers_last_modified_by_fkey", columns: [table.lastModifiedBy], foreignColumns: [users.id] })
  
  }));

// Wells table (جدول الآبار) - يدير بيانات الآبار والملاك والمواقع والخصائص الفنية
// تم تحسين هذا الجدول لدعم تتبع حالة الإنجاز ونسب التنفيذ تلقائياً
export const wells = pgTable("wells", {
  id: serial("id").primaryKey(),
  project_id: varchar("project_id", { length: 255 }).notNull(),
  wellNumber: integer("well_number").notNull(), // رقم البئر
  ownerName: text("owner_name").notNull(), // اسم المالك
  region: varchar("region", { length: 100 }).notNull(), // المنطقة
  numberOfBases: integer("number_of_bases").notNull(), // عدد القواعد
  baseCount: integer("base_count"), // إعادة إضافة base_count للتوافق
  numberOfPanels: integer("number_of_panels").notNull(), // عدد الألواح
  panelCount: integer("panel_count"), // إعادة إضافة panel_count للتوافق
  wellDepth: integer("well_depth").notNull(), // عمق البئر بالمتر
  waterLevel: integer("water_level"), // منسوب الماء (nullable)
  numberOfPipes: integer("number_of_pipes").notNull(), // عدد المواسير
  pipeCount: integer("pipe_count"), // إعادة إضافة pipe_count للتوافق
  fanType: varchar("fan_type", { length: 100 }), // نوع المراوح (nullable)
  pumpPower: integer("pump_power"), // قدرة الغطاس kw (nullable)
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  completionPercentage: decimal("completion_percentage", { precision: 5, scale: 2 }).default('0').notNull(),
  startDate: date("start_date"), // تاريخ البدء (nullable)
  completionDate: date("completion_date"), // تاريخ الانتهاء (nullable)
  notes: text("notes"),
  beneficiaryPhone: text("beneficiary_phone"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  ...syncFields,
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
    wells_last_modified_by_fkey: foreignKey({ name: "wells_last_modified_by_fkey", columns: [table.lastModifiedBy], foreignColumns: [users.id] })
  }));

// Fund transfers (تحويلات العهدة)
export const fundTransfers = pgTable("fund_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  senderName: text("sender_name"), // اسم المرسل
  transferNumber: text("transfer_number").unique("fund_transfers_transfer_number_unique"), // رقم الحولة - فريد
  transferType: text("transfer_type").notNull(), // حولة، تسليم يدوي، صراف
  transferDate: timestamp("transfer_date").notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxFundTransfersProjectDate: index("idx_fund_transfers_project_date").on(table.project_id, table.transferDate),
  chkFundAmountPositive: check("chk_fund_amount_positive", sql`amount > 0`),
  }));

// Worker attendance
export const workerAttendance = pgTable("worker_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull(),
  worker_id: varchar("worker_id").notNull(),
  attendanceDate: text("attendance_date").notNull(), // YYYY-MM-DD format
  date: text("date"), // عمود إضافي للتاريخ - nullable
  startTime: text("start_time"), // HH:MM format
  endTime: text("end_time"), // HH:MM format
  workDescription: text("work_description"),
  isPresent: boolean("is_present"), // nullable في قاعدة البيانات
  // أعمدة قديمة موجودة في قاعدة البيانات
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }).default('8.00'),
  overtime: decimal("overtime", { precision: 5, scale: 2 }).default('0.00'),
  overtimeRate: decimal("overtime_rate", { precision: 15, scale: 2 }).default('0.00'),
  // أعمدة جديدة
  workDays: decimal("work_days", { precision: 3, scale: 2 }).default('0.00'), // عدد أيام العمل (مثل 0.5، 1.0، 1.5) - افتراضي 0
  dailyWage: decimal("daily_wage", { precision: 15, scale: 2 }).notNull(), // الأجر اليومي الكامل
  actualWage: decimal("actual_wage", { precision: 15, scale: 2 }), // الأجر الفعلي = dailyWage * workDays - nullable في قاعدة البيانات
  totalPay: decimal("total_pay", { precision: 15, scale: 2 }).notNull(), // إجمالي الدفع المطلوب = actualWage
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default('0'), // المبلغ المدفوع فعلياً (الصرف) - nullable في قاعدة البيانات
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).default('0'), // المتبقي في حساب العامل - nullable في قاعدة البيانات
  paymentType: text("payment_type").default("partial"), // "full" | "partial" | "credit" - nullable في قاعدة البيانات
  notes: text("notes"), // ملاحظات
  well_id: integer("well_id"), // ربط ببئر محدد (اختياري)
  well_ids: text("well_ids"), // JSON array of well IDs e.g. "[1,5]" for multi-well
  crew_type: varchar("crew_type", { length: 255 }), // welding, steel_installation, panel_installation
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  description: text("description"),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueWorkerDate: uniqueIndex("worker_attendance_worker_id_attendance_date_project_id_unique").on(table.worker_id, table.attendanceDate, table.project_id),
  idxAttendanceProjectDate: index("idx_worker_attendance_project_date").on(table.project_id, table.attendanceDate),
  idxAttendanceWorkerId: index("idx_worker_attendance_worker_id").on(table.worker_id),
  chkAttendanceDateFormat: check("chk_attendance_date_format", sql`attendance_date ~ '^\d{4}-\d{2}-\d{2}$'`),
  chkAttendanceDateNotEmpty: check("chk_attendance_date_not_empty", sql`attendance_date <> ''`),
  chkWorkDaysPositive: check("chk_work_days_positive", sql`work_days >= 0`),
}));

// Suppliers (الموردين)
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactPerson: text("contact_person"), // الشخص المسؤول
  phone: text("phone"),
  address: text("address"),
  paymentTerms: text("payment_terms").default("نقد"), // نقد، 30 يوم، 60 يوم، etc
  totalDebt: decimal("total_debt", { precision: 12, scale: 2 }).default('0').notNull(), // إجمالي المديونية
  is_active: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  created_by: varchar("created_by"),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueSupplierPerUser: uniqueIndex("suppliers_name_created_by_unique").on(table.name, table.created_by),
    suppliers_created_by_fkey: foreignKey({ name: "suppliers_created_by_fkey", columns: [table.created_by], foreignColumns: [users.id] })
  
  }));

// Materials
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // حديد، أسمنت، رمل، etc
  unit: text("unit").notNull(), // طن، كيس، متر مكعب، etc
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Material purchases - محسن للمحاسبة الصحيحة
export const materialPurchases = pgTable("material_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  supplier_id: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }), // ربط بالمورد
  material_id: varchar("material_id"), // إعادة إضافة المادة للتوافق
  materialName: text("material_name").notNull(), // اسم المادة بدلاً من material_id
  materialCategory: text("material_category"), // فئة المادة (حديد، أسمنت، إلخ)
  materialUnit: text("material_unit"), // وحدة المادة الأساسية
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(), // وحدة القياس - موجودة في قاعدة البيانات
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  purchaseType: text("purchase_type").notNull().default("نقد"), // نقد، أجل، مخزن
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default('0').notNull(), // المبلغ المدفوع
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).default('0').notNull(), // المتبقي
  supplierName: text("supplier_name"), // اسم المورد (للتوافق العكسي)
  receiptNumber: text("receipt_number"), // رقم الإيصال - موجود في قاعدة البيانات
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"), // تاريخ الفاتورة - YYYY-MM-DD format - nullable في قاعدة البيانات
  dueDate: text("due_date"), // تاريخ الاستحقاق للفواتير الآجلة - YYYY-MM-DD format
  invoicePhoto: text("invoice_photo"), // base64 or file path
  notes: text("notes"),
  purchaseDate: text("purchase_date").notNull(), // YYYY-MM-DD format
  well_id: integer("well_id"), // ربط ببئر محدد (اختياري)
  well_ids: text("well_ids"), // JSON array of well IDs for multi-well
  crew_type: varchar("crew_type", { length: 255 }),
  addToInventory: boolean("add_to_inventory").default(false), // إضافة المادة للمخزن/المعدات تلقائياً
  equipmentId: integer("equipment_id"), // ربط بالمعدة المنشأة تلقائياً (إن وجدت)
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  description: text("description"),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxMaterialPurchasesProjectDate: index("idx_material_purchases_project_date").on(table.project_id, table.purchaseDate),
  idxMaterialPurchasesProjectPurchaseDate: index("idx_material_purchases_project_purchase_date").on(table.project_id, table.purchaseDate),
  chkPurchaseDateFormat: check("chk_purchase_date_format", sql`purchase_date ~ '^\d{4}-\d{2}-\d{2}$'`),
  chkPurchaseDateNotEmpty: check("chk_purchase_date_not_empty", sql`purchase_date <> ''`),
  chkQuantityPositive: check("chk_quantity_positive", sql`quantity >= 0`),
  chkTotalAmountNonNegative: check("chk_total_amount_non_negative", sql`total_amount >= 0`),
}));

// Supplier payments (مدفوعات الموردين)
export const supplierPayments = pgTable("supplier_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplier_id: varchar("supplier_id").notNull(),
  project_id: varchar("project_id").notNull(),
  purchase_id: varchar("purchase_id"), // ربط بفاتورة محددة
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("نقد"), // نقد، حوالة، شيك
  paymentDate: text("payment_date").notNull(), // YYYY-MM-DD format
  referenceNumber: text("reference_number"), // رقم المرجع أو الشيك
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxSupplierPaymentsSupplierId: index("idx_supplier_payments_supplier_id").on(table.supplier_id),
  chkSuppAmountPositive: check("chk_supp_amount_positive", sql`amount > 0`),
}));

// Transportation expenses (أجور المواصلات)
export const transportationExpenses = pgTable("transportation_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull(),
  worker_id: varchar("worker_id"), // optional, for worker-specific transport
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("other"), // نقل عمال، توريد مواد، صيانة، بترول، إلخ
  date: text("date").notNull(), // YYYY-MM-DD format
  notes: text("notes"),
  well_id: integer("well_id"), // ربط ببئر محدد (اختياري)
  well_ids: text("well_ids"), // JSON array of well IDs for multi-well
  crew_type: varchar("crew_type", { length: 255 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxTransportExpensesProjectDate: index("idx_transport_expenses_project_date").on(table.project_id, table.date),
  idxTransportationExpensesProjectDate: index("idx_transportation_expenses_project_date").on(table.project_id, table.date),
  chkDateFormat: check("chk_date_format", sql`date ~ '^\d{4}-\d{2}-\d{2}$'`),
  chkDateNotEmpty: check("chk_date_not_empty", sql`date <> ''`),
  chkTransAmountPositive: check("chk_trans_amount_positive", sql`amount > 0`),
}));

// Worker balance transfers (حوالات الحساب للأهالي)
export const workerTransfers = pgTable("worker_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  worker_id: varchar("worker_id").notNull(),
  project_id: varchar("project_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transferNumber: text("transfer_number"), // رقم الحوالة
  senderName: text("sender_name"), // اسم المرسل
  recipientName: text("recipient_name").notNull(), // اسم المستلم (الأهل)
  recipientPhone: text("recipient_phone"), // رقم هاتف المستلم
  transferMethod: text("transfer_method").notNull(), // "hawaleh" | "bank" | "cash"
  transferDate: text("transfer_date").notNull(), // YYYY-MM-DD format
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  description: text("description"),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxWorkerTransfersProjectDate: index("idx_worker_transfers_project_date").on(table.project_id, table.transferDate),
  chkTransferDateFormat: check("chk_transfer_date_format", sql`transfer_date ~ '^\d{4}-\d{2}-\d{2}$'`),
  chkTransferDateNotEmpty: check("chk_transfer_date_not_empty", sql`transfer_date <> ''`),
  chkWorkerTransAmountPositive: check("chk_worker_trans_amount_positive", sql`amount > 0`),
}));

// Worker Project Wages (أجور العمال حسب المشروع)
export const workerProjectWages = pgTable("worker_project_wages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  worker_id: varchar("worker_id").notNull(),
  project_id: varchar("project_id").notNull(),
  dailyWage: decimal("daily_wage", { precision: 15, scale: 2 }).notNull(),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueWorkerProjectEffective: uniqueIndex("worker_project_wages_worker_id_project_id_effective_from_key").on(table.worker_id, table.project_id, table.effectiveFrom),
  idxWorkerProjectWagesWorker: index("idx_worker_project_wages_worker").on(table.worker_id),
  idxWorkerProjectWagesProject: index("idx_worker_project_wages_project").on(table.project_id),
  idxWorkerProjectWagesEffective: index("idx_worker_project_wages_effective").on(table.worker_id, table.project_id, table.effectiveFrom),
    worker_project_wages_created_by_fkey: foreignKey({ name: "worker_project_wages_created_by_fkey", columns: [table.created_by], foreignColumns: [users.id] }),
    worker_project_wages_project_id_fkey: foreignKey({ name: "worker_project_wages_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] }).onDelete("cascade"),
    worker_project_wages_worker_id_fkey: foreignKey({ name: "worker_project_wages_worker_id_fkey", columns: [table.worker_id], foreignColumns: [workers.id] }).onDelete("cascade")
  
  }));

// Worker account balances (أرصدة حسابات العمال)
export const workerBalances = pgTable("worker_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  worker_id: varchar("worker_id").notNull(),
  project_id: varchar("project_id").notNull(),
  totalEarned: decimal("total_earned", { precision: 15, scale: 2 }).default('0').notNull(),
  totalPaid: decimal("total_paid", { precision: 15, scale: 2 }).default('0').notNull(),
  totalTransferred: decimal("total_transferred", { precision: 15, scale: 2 }).default('0').notNull(),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default('0').notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => [
  uniqueIndex("idx_worker_balances_worker_project").on(table.worker_id, table.project_id),
]);

// Daily Activity Logs (سجلات النشاط اليومي)
export const dailyActivityLogs = pgTable("daily_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull(),
  engineerId: varchar("engineer_id").notNull(),
  logDate: text("log_date").notNull(), // YYYY-MM-DD
  activityTitle: text("activity_title").notNull(),
  description: text("description"),
  progressPercentage: integer("progress_percentage").default(0),
  weatherConditions: text("weather_conditions"),
  images: jsonb("images").default(sql`'[]'::jsonb`),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    daily_activity_logs_engineer_id_fkey: foreignKey({ name: "daily_activity_logs_engineer_id_fkey", columns: [table.engineerId], foreignColumns: [users.id] }),
    daily_activity_logs_project_id_fkey: foreignKey({ name: "daily_activity_logs_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] }).onDelete("cascade")
  }));

export const insertDailyActivityLogSchema = createInsertSchema(dailyActivityLogs).omit({ id: true, created_at: true, updated_at: true });
export type DailyActivityLog = typeof dailyActivityLogs.$inferSelect;
export type InsertDailyActivityLog = z.infer<typeof insertDailyActivityLogSchema>;

// Zod Schemas for validation
export const dateStringSchema = z.preprocess((val) => {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string' && val.includes('T')) {
    return val.split('T')[0];
  }
  return val;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ يجب أن يكون بصيغة YYYY-MM-DD"));

// Daily expense summaries (ملخص المصروفات اليومية)
export const dailyExpenseSummaries = pgTable("daily_expense_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  carriedForwardAmount: decimal("carried_forward_amount", { precision: 15, scale: 2 }).default('0').notNull(),
  totalFundTransfers: decimal("total_fund_transfers", { precision: 15, scale: 2 }).default('0').notNull(),
  totalWorkerWages: decimal("total_worker_wages", { precision: 15, scale: 2 }).default('0').notNull(),
  totalMaterialCosts: decimal("total_material_costs", { precision: 15, scale: 2 }).default('0').notNull(),
  totalTransportationCosts: decimal("total_transportation_costs", { precision: 15, scale: 2 }).default('0').notNull(),
  totalWorkerTransfers: decimal("total_worker_transfers", { precision: 15, scale: 2 }).default('0').notNull(),
  totalWorkerMiscExpenses: decimal("total_worker_misc_expenses", { precision: 15, scale: 2 }).default('0').notNull(),
  totalIncome: decimal("total_income", { precision: 15, scale: 2 }).notNull(),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }).notNull(),
  remainingBalance: decimal("remaining_balance", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  description: text("description"),
}, (table) => ({
  uniqueProjectDate: uniqueIndex("unique_project_date").on(table.project_id, table.date),
  idxDailyExpenseSummariesProjectDate: index("idx_daily_expense_summaries_project_date").on(table.project_id, table.date),
  idxDailySummariesProjectDate: index("idx_daily_summaries_project_date").on(table.project_id, table.date),
  }));

// Worker types table (أنواع العمال)
export const workerTypes = pgTable("worker_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique("worker_types_name_unique"), // اسم نوع العامل
  usageCount: integer("usage_count").default(1).notNull(), // عدد مرات الاستخدام
  lastUsed: timestamp("last_used").defaultNow().notNull(), // آخر استخدام
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Autocomplete data table (بيانات الإكمال التلقائي)
export const autocompleteData = pgTable("autocomplete_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  value: text("value").notNull(),
  user_id: varchar("user_id"),
  usageCount: integer("usage_count").default(1).notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxAutocompleteUserCategory: index("idx_autocomplete_user_category").on(table.user_id, table.category, table.usageCount),
}));

// Worker miscellaneous expenses table (نثريات العمال)
export const workerMiscExpenses = pgTable("worker_misc_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(), // وصف النثريات
  date: text("date").notNull(), // تاريخ النثريات
  notes: text("notes"), // ملاحظات إضافية
  well_id: integer("well_id"), // ربط ببئر محدد (اختياري)
  well_ids: text("well_ids"), // JSON array of well IDs for multi-well
  crew_type: varchar("crew_type", { length: 255 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxWorkerMiscExpensesProjectDate: index("idx_worker_misc_expenses_project_date").on(table.project_id, table.date),
  chkMiscDateFormat: check("chk_misc_date_format", sql`date ~ '^\d{4}-\d{2}-\d{2}$'`),
  chkMiscDateNotEmpty: check("chk_misc_date_not_empty", sql`date <> ''`),
}));

// Backup Logs Table (سجل النسخ الاحتياطي)
export const backupLogs = pgTable("backup_logs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  size: text("size"),
  status: text("status").notNull(),
  destination: text("destination").notNull(),
  errorMessage: text("error_message"),
  triggeredBy: uuid("triggered_by"),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
});

// Backup Settings Table (إعدادات النسخ الاحتياطي)
export const backupSettings = pgTable("backup_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique("backup_settings_key_key"),
  value: text("value").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
});

export const insertBackupLogSchema = createInsertSchema(backupLogs);
export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = z.infer<typeof insertBackupLogSchema>;

export const insertBackupSettingsSchema = createInsertSchema(backupSettings);
export type BackupSettings = typeof backupSettings.$inferSelect;
export type InsertBackupSettings = z.infer<typeof insertBackupSettingsSchema>;

// Monitoring and System Logs
export const monitoringData = pgTable("monitoring_data", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  type: varchar("type", { length: 50 }).notNull(),
  value: jsonb("value").notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  level: varchar("level", { length: 20 }).notNull(),
  message: text("message").notNull(),
  context: jsonb("context"),
});

export const insertMonitoringDataSchema = createInsertSchema(monitoringData);
export const insertSystemLogSchema = createInsertSchema(systemLogs);

export type MonitoringData = typeof monitoringData.$inferSelect;
export type InsertMonitoringData = z.infer<typeof insertMonitoringDataSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

// Print Settings Table (إعدادات الطباعة)
export const printSettings = pgTable('print_settings', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  reportType: text('report_type').notNull().default('worker_statement'),
  name: text('name').notNull(),

  // Page settings
  pageSize: text('page_size').notNull().default('A4'),
  pageOrientation: text('page_orientation').notNull().default('portrait'),
  marginTop: decimal('margin_top', { precision: 5, scale: 2 }).notNull().default('15.00'),
  marginBottom: decimal('margin_bottom', { precision: 5, scale: 2 }).notNull().default('15.00'),
  marginLeft: decimal('margin_left', { precision: 5, scale: 2 }).notNull().default('15.00'),
  marginRight: decimal('margin_right', { precision: 5, scale: 2 }).notNull().default('15.00'),

  // Font settings
  fontFamily: text('font_family').notNull().default('Arial'),
  fontSize: integer('font_size').notNull().default(12),
  headerFontSize: integer('header_font_size').notNull().default(16),
  tableFontSize: integer('table_font_size').notNull().default(10),

  // Color settings
  headerBackgroundColor: text('header_background_color').notNull().default('#1e40af'),
  headerTextColor: text('header_text_color').notNull().default('#ffffff'),
  tableHeaderColor: text('table_header_color').notNull().default('#1e40af'),
  tableRowEvenColor: text('table_row_even_color').notNull().default('#ffffff'),
  tableRowOddColor: text('table_row_odd_color').notNull().default('#f9fafb'),
  tableBorderColor: text('table_border_color').notNull().default('#000000'),

  // Table settings
  tableBorderWidth: integer('table_border_width').notNull().default(1),
  tableCellPadding: integer('table_cell_padding').notNull().default(3),
  tableColumnWidths: text('table_column_widths').notNull().default('[8,12,10,30,12,15,15,12]'),

  // Visual elements settings
  showHeader: boolean('show_header').notNull().default(true),
  showLogo: boolean('show_logo').notNull().default(true),
  showProjectInfo: boolean('show_project_info').notNull().default(true),
  showWorkerInfo: boolean('show_worker_info').notNull().default(true),
  showAttendanceTable: boolean('show_attendance_table').notNull().default(true),
  showTransfersTable: boolean('show_transfers_table').notNull().default(true),
  showSummary: boolean('show_summary').notNull().default(true),
  showSignatures: boolean('show_signatures').notNull().default(true),

  // System settings
  isDefault: boolean('is_default').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  user_id: text('user_id'),

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Project fund transfers table (ترحيل الأموال بين المشاريع)
export const projectFundTransfers = pgTable("project_fund_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromProjectId: varchar("from_project_id").notNull(),
  toProjectId: varchar("to_project_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"), // وصف الترحيل
  transferReason: text("transfer_reason"), // سبب الترحيل
  transferDate: text("transfer_date").notNull(), // YYYY-MM-DD format
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxProjectFundTransfersFromDate: index("idx_project_fund_transfers_from_date").on(table.fromProjectId, table.transferDate),
  idxProjectFundTransfersToDate: index("idx_project_fund_transfers_to_date").on(table.toProjectId, table.transferDate),
  idxProjectFundTransfersFromProjectDate: index("idx_project_fund_transfers_from_project_date").on(table.fromProjectId, table.transferDate),
  idxProjectFundTransfersToProjectDate: index("idx_project_fund_transfers_to_project_date").on(table.toProjectId, table.transferDate),
  idxProjectFundTransfersTransferDate: index("idx_project_fund_transfers_transfer_date").on(table.transferDate),
  chkProjectTransferDateNotEmpty: check("chk_project_transfer_date_not_empty", sql`transfer_date <> ''`),
}));

// Security Policies (سياسات الأمان)
export const securityPolicies = pgTable("security_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull().default("medium"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  complianceLevel: varchar("compliance_level", { length: 100 }),
  requirements: jsonb("requirements"),
  implementation: jsonb("implementation"),
  checkCriteria: jsonb("check_criteria"),
  checkInterval: integer("check_interval"),
  nextCheck: timestamp("next_check"),
  violationsCount: integer("violations_count").notNull().default(0),
  lastViolation: timestamp("last_violation"),
  createdBy: varchar("created_by"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Security Policy Suggestions (اقتراحات سياسات الأمان)
export const securityPolicySuggestions = pgTable("security_policy_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  suggestedPolicyId: varchar("suggested_policy_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  confidence: integer("confidence").notNull().default(50),
  reasoning: text("reasoning"),
  estimatedImpact: varchar("estimated_impact", { length: 500 }),
  implementationEffort: varchar("implementation_effort", { length: 100 }),
  prerequisites: jsonb("prerequisites"),
  sourceType: varchar("source_type", { length: 100 }),
  sourceData: jsonb("source_data"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  implementedAs: varchar("implemented_as"),
  implementedAt: timestamp("implemented_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Security Policy Implementations (تنفيذ سياسات الأمان)
export const securityPolicyImplementations = pgTable("security_policy_implementations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull(),
  implementationId: varchar("implementation_id").notNull(),
  implementationType: varchar("implementation_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  configuration: jsonb("configuration"),
  deploymentDetails: jsonb("deployment_details"),
  successCriteria: jsonb("success_criteria"),
  rollbackPlan: jsonb("rollback_plan"),
  implementedBy: varchar("implemented_by"),
  implementationDate: timestamp("implementation_date"),
  verificationDate: timestamp("verification_date"),
  nextReview: timestamp("next_review"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Security Policy Violations (انتهاكات سياسات الأمان)
export const securityPolicyViolations = pgTable("security_policy_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull(),
  violationId: varchar("violation_id").notNull(),
  violatedRule: varchar("violated_rule", { length: 500 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull().default("medium"),
  status: varchar("status", { length: 50 }).notNull().default("open"),
  violationDetails: jsonb("violation_details"),
  affectedResources: jsonb("affected_resources"),
  impactAssessment: text("impact_assessment"),
  remediation_steps: jsonb("remediation_steps"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// User Project Permissions table (صلاحيات المستخدمين على المشاريع)
export const userProjectPermissions = pgTable("user_project_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  project_id: varchar("project_id").notNull(),
  canView: boolean("can_view").default(true).notNull(),
  canAdd: boolean("can_add").default(false).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  assignedBy: varchar("assigned_by"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Permission Audit Logs table (سجل تغييرات الصلاحيات)
export const permissionAuditLogs = pgTable("permission_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action").notNull(), // assign, unassign, update_permissions
  actorId: varchar("actor_id").notNull(),
  targetUserId: varchar("target_user_id"),
  project_id: varchar("project_id"),
  oldPermissions: jsonb("old_permissions"), // الصلاحيات القديمة
  newPermissions: jsonb("new_permissions"), // الصلاحيات الجديدة
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Schema definitions for forms
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, created_at: true });
export const insertWorkerSchema = createInsertSchema(workers).omit({ id: true, created_at: true });
export const insertFundTransferSchema = createInsertSchema(fundTransfers).omit({ id: true, created_at: true }).extend({
  transferDate: dateStringSchema,
  amount: z.preprocess((val) => (val === null || val === undefined) ? "0" : val.toString(), z.string()),
});
export const insertWorkerAttendanceSchema = createInsertSchema(workerAttendance).omit({ id: true, created_at: true }).extend({
  attendanceDate: dateStringSchema,
  dailyWage: z.coerce.string(),
  actualWage: z.coerce.string().optional(),
  totalPay: z.coerce.string(),
  paidAmount: z.coerce.string().optional(),
  remainingAmount: z.coerce.string().optional(),
  paymentType: z.string().optional().default("partial"), // نوع الدفع
  hoursWorked: z.coerce.string().optional(), // ساعات العمل
  overtime: z.coerce.string().optional(), // ساعات إضافية
  overtimeRate: z.coerce.string().optional(), // معدل الساعات الإضافية
  notes: z.string().optional(), // ملاحظات
  // إضافة validation للأوقات
  startTime: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val);
  }, "تنسيق الوقت يجب أن يكون HH:MM"),
  endTime: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val);
  }, "تنسيق الوقت يجب أن يكون HH:MM"),
}).refine((data) => {
  // التحقق من أن وقت البداية أقل من وقت النهاية
  if (data.startTime && data.endTime) {
    const startMinutes = parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1]);
    const endMinutes = parseInt(data.endTime.split(':')[0]) * 60 + parseInt(data.endTime.split(':')[1]);
    return startMinutes < endMinutes || (endMinutes < startMinutes); // يدعم الورديات الليلية
  }
  return true;
}, {
  message: "وقت البداية يجب أن يكون قبل وقت النهاية (للورديات العادية)",
  path: ["endTime"]
});
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, created_at: true });
export const insertMaterialPurchaseSchema = createInsertSchema(materialPurchases).omit({ id: true, created_at: true }).extend({
  purchaseDate: dateStringSchema,
  quantity: z.coerce.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن تكون الكمية 0 أو أكثر"), 
  unit: z.string().min(1, "وحدة القياس مطلوبة").default("كيس"), 
  unitPrice: z.coerce.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون سعر الوحدة 0 أو أكثر").optional().or(z.literal("")), 
  totalAmount: z.coerce.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون إجمالي المبلغ 0 أو أكثر").optional().or(z.literal("")), 
  purchaseType: z.string().default("نقد"), 
  paidAmount: z.coerce.string().default("0").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون المبلغ المدفوع 0 أو أكثر"), 
  remainingAmount: z.coerce.string().default("0").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون المبلغ المتبقي 0 أو أكثر"), 
});
export const insertTransportationExpenseSchema = createInsertSchema(transportationExpenses).omit({ id: true, created_at: true }).extend({
  date: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});
export const insertWorkerTransferSchema = createInsertSchema(workerTransfers).omit({ id: true, created_at: true }).extend({
  transferDate: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal في قاعدة البيانات
});
export const insertProjectFundTransferSchema = createInsertSchema(projectFundTransfers).omit({ id: true, created_at: true }).extend({
  transferDate: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});
export const insertDailyExpenseSummarySchema = createInsertSchema(dailyExpenseSummaries).omit({ id: true, created_at: true, updated_at: true });
export const insertWorkerTypeSchema = createInsertSchema(workerTypes).omit({ id: true, created_at: true, lastUsed: true });
export const insertAutocompleteDataSchema = createInsertSchema(autocompleteData).omit({ id: true, created_at: true, lastUsed: true });
export const insertWorkerMiscExpenseSchema = createInsertSchema(workerMiscExpenses).omit({ id: true, created_at: true }).extend({
  date: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});

// 🔐 **User Project Permissions Schema**
export const insertUserProjectPermissionSchema = createInsertSchema(userProjectPermissions).omit({ 
  id: true, 
  assignedAt: true, 
  updated_at: true 
});

// 📋 **Permission Audit Log Schema**
export const insertPermissionAuditLogSchema = createInsertSchema(permissionAuditLogs).omit({ 
  id: true, 
  created_at: true 
});

// 🛡️ **Enhanced User Input Validation - حماية أمنية محسّنة**
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  last_login: true 
}).extend({
  email: z.string()
    .min(5, "البريد الإلكتروني قصير جداً")
    .max(255, "البريد الإلكتروني طويل جداً") 
    .email("تنسيق البريد الإلكتروني غير صحيح")
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "البريد الإلكتروني يحتوي على أحرف غير مسموحة"),
  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جداً")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, 
           "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص"),
  first_name: z.string()
    .min(1, "الاسم الأول مطلوب")
    .max(100, "الاسم الأول طويل جداً")
    .regex(/^[a-zA-Zا-ي0-9\s\-']+$/, "الاسم يحتوي على أحرف غير مسموحة"),
  last_name: z.string()
    .max(100, "اسم العائلة طويل جداً")
    .regex(/^[a-zA-Zا-ي0-9\s\-']*$/, "اسم العائلة يحتوي على أحرف غير مسموحة")
    .optional(),
  role: z.enum(['admin', 'manager', 'user']).describe("الدور يجب أن يكون admin أو manager أو user")
});

// 🛡️ **Enhanced Worker Input Validation**
export const enhancedInsertWorkerSchema = createInsertSchema(workers).omit({ 
  id: true, 
  created_at: true 
}).extend({
  name: z.string()
    .min(2, "اسم العامل قصير جداً")
    .max(100, "اسم العامل طويل جداً")
    .regex(/^[a-zA-Zا-ي0-9\s\-']+$/, "اسم العامل يحتوي على أحرف غير مسموحة"),
  type: z.string()
    .min(1, "نوع العامل مطلوب")
    .max(100, "نوع العامل طويل جداً"),
  dailyWage: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "الأجر اليومي يجب أن يكون رقماً صحيحاً")
    .refine((val) => parseFloat(val) > 0, {
      message: "الأجر اليومي يجب أن يكون أكبر من صفر"
    })
});

// 🛡️ **Enhanced Project Input Validation**  
export const enhancedInsertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  created_at: true
}).extend({
  name: z.string()
    .min(2, "اسم المشروع قصير جداً")
    .max(200, "اسم المشروع طويل جداً")
    .regex(/^[a-zA-Zا-ي0-9\s\-_().]+$/, "اسم المشروع يحتوي على أحرف غير مسموحة"),
  status: z.enum(['active', 'completed', 'paused']),
  imageUrl: z.string()
    .url("رابط الصورة غير صحيح")
    .optional()
    .or(z.literal(""))
});

// 🛡️ **Project Update Schema - لإصلاح الثغرة الأمنية في PATCH**
export const updateProjectSchema = enhancedInsertProjectSchema.partial().omit({
  // الحقول المحظور تعديلها لأسباب أمنية
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "يجب توفير حقل واحد على الأقل للتحديث" }
);

// UUID validation schema
export const uuidSchema = z.string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "معرف UUID غير صحيح")
  .or(z.string().regex(/^[a-z0-9-]{8,50}$/, "معرف غير صحيح"));

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, created_at: true });
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true, created_at: true }).extend({
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});
export const insertPrintSettingsSchema = createInsertSchema(printSettings).omit({ id: true, created_at: true, updated_at: true });

// Type definitions
export type Project = typeof projects.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type FundTransfer = typeof fundTransfers.$inferSelect;
export type WorkerAttendance = typeof workerAttendance.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type MaterialPurchase = typeof materialPurchases.$inferSelect;
export type TransportationExpense = typeof transportationExpenses.$inferSelect;
export type WorkerTransfer = typeof workerTransfers.$inferSelect;
export type WorkerBalance = typeof workerBalances.$inferSelect;
// WhatsApp Stats table (جدول إحصائيات الواتساب)
export const whatsappStats = pgTable("whatsapp_stats", {
  id: serial("id").primaryKey(),
  totalMessages: integer("total_messages").default(0).notNull(),
  lastSync: timestamp("last_sync"),
  accuracy: text("accuracy").default("0%").notNull(),
  status: text("status").default("disconnected"),
  phoneNumber: text("phone_number"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

export const insertWhatsAppStatsSchema = createInsertSchema(whatsappStats).omit({ id: true, created_at: true, updated_at: true });
export type WhatsAppStats = typeof whatsappStats.$inferSelect;
export type InsertWhatsAppStats = z.infer<typeof insertWhatsAppStatsSchema>;

// WhatsApp Messages table (جدول رسائل الواتساب)
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  wa_id: text("wa_id").notNull(),
  sender: text("sender").notNull(),
  content: text("content"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").default("received"),
  metadata: jsonb("metadata"),
  user_id: varchar("user_id"),
  project_id: varchar("project_id"),
  phone_number: varchar("phone_number", { length: 20 }),
  is_authorized: boolean("is_authorized").default(false),
  blocked_reason: text("blocked_reason"),
  intent: text("intent"),
  security_scope: jsonb("security_scope"),
}, (table) => ({
    whatsapp_messages_project_id_fkey: foreignKey({ name: "whatsapp_messages_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] }).onDelete("set null"),
    whatsapp_messages_user_id_fkey: foreignKey({ name: "whatsapp_messages_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] }).onDelete("set null")
  }));

export const insertWhatsAppMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, timestamp: true });
export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = z.infer<typeof insertWhatsAppMessageSchema>;

// WhatsApp Security Events table (جدول أحداث أمان الواتساب)
export const whatsappSecurityEvents = pgTable("whatsapp_security_events", {
  id: serial("id").primaryKey(),
  phone_number: varchar("phone_number", { length: 20 }).notNull(),
  user_id: varchar("user_id"),
  event_type: varchar("event_type").notNull(), // blocked, denied, sql_blocked, whitelist_rejected, unauthorized
  reason: text("reason"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    whatsapp_security_events_user_id_fkey: foreignKey({ name: "whatsapp_security_events_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] }).onDelete("set null")
  }));

export const insertWhatsAppSecurityEventSchema = createInsertSchema(whatsappSecurityEvents).omit({ id: true, created_at: true });
export type WhatsAppSecurityEvent = typeof whatsappSecurityEvents.$inferSelect;
export type InsertWhatsAppSecurityEvent = z.infer<typeof insertWhatsAppSecurityEventSchema>;

export type DailyExpenseSummary = typeof dailyExpenseSummaries.$inferSelect;
export type WorkerType = typeof workerTypes.$inferSelect;
export type AutocompleteData = typeof autocompleteData.$inferSelect;
export type WorkerMiscExpense = typeof workerMiscExpenses.$inferSelect;
export type User = typeof users.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type PrintSettings = typeof printSettings.$inferSelect;
export type ProjectFundTransfer = typeof projectFundTransfers.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type InsertFundTransfer = z.infer<typeof insertFundTransferSchema>;
export type InsertWorkerAttendance = z.infer<typeof insertWorkerAttendanceSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type InsertMaterialPurchase = z.infer<typeof insertMaterialPurchaseSchema>;
export type InsertTransportationExpense = z.infer<typeof insertTransportationExpenseSchema>;
export type InsertWorkerTransfer = z.infer<typeof insertWorkerTransferSchema>;
export const insertWorkerProjectWageSchema = createInsertSchema(workerProjectWages).omit({ id: true, created_at: true, updated_at: true });
export type WorkerProjectWage = typeof workerProjectWages.$inferSelect;
export type InsertWorkerProjectWage = z.infer<typeof insertWorkerProjectWageSchema>;
export const insertWorkerBalanceSchema = createInsertSchema(workerBalances);
export type InsertWorkerBalance = z.infer<typeof insertWorkerBalanceSchema>;
export type InsertDailyExpenseSummary = z.infer<typeof insertDailyExpenseSummarySchema>;
export type InsertWorkerType = z.infer<typeof insertWorkerTypeSchema>;
export type InsertAutocompleteData = z.infer<typeof insertAutocompleteDataSchema>;
export type InsertWorkerMiscExpense = z.infer<typeof insertWorkerMiscExpenseSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;
export type InsertPrintSettings = z.infer<typeof insertPrintSettingsSchema>;
export type InsertProjectFundTransfer = z.infer<typeof insertProjectFundTransferSchema>;

// Auth User Sessions Schemas
export const insertAuthUserSessionSchema = createInsertSchema(authUserSessions).omit({
  id: true,
  created_at: true,
  updated_at: true,
  lastActivity: true,
});

export type AuthUserSession = typeof authUserSessions.$inferSelect;
export type InsertAuthUserSession = z.infer<typeof insertAuthUserSessionSchema>;



// Report Templates Schema - إعدادات تصميم التقارير
export const reportTemplates = pgTable('report_templates', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  templateName: text('template_name').notNull().default('default'),

  // إعدادات الرأس
  headerTitle: text('header_title').notNull().default('نظام إدارة مشاريع البناء'),
  headerSubtitle: text('header_subtitle').default('تقرير مالي'),
  companyName: text('company_name').notNull().default('شركة البناء والتطوير'),
  companyAddress: text('company_address').default('صنعاء - اليمن'),
  companyPhone: text('company_phone').default('+967 1 234567'),
  companyEmail: text('company_email').default('info@company.com'),

  // إعدادات الذيل
  footerText: text('footer_text').default('تم إنشاء هذا التقرير بواسطة نظام إدارة المشاريع'),
  footerContact: text('footer_contact').default('للاستفسار: info@company.com | +967 1 234567'),

  // إعدادات الألوان
  primaryColor: text('primary_color').notNull().default('#1f2937'), // رمادي داكن
  secondaryColor: text('secondary_color').notNull().default('#3b82f6'), // أزرق
  accentColor: text('accent_color').notNull().default('#10b981'), // أخضر
  textColor: text('text_color').notNull().default('#1f2937'),
  backgroundColor: text('background_color').notNull().default('#ffffff'),

  // إعدادات التصميم
  fontSize: integer('font_size').notNull().default(11),
  fontFamily: text('font_family').notNull().default('Arial'),
  logoUrl: text('logo_url'), // رابط الشعار

  // إعدادات الطباعة
  pageOrientation: text('page_orientation').notNull().default('portrait'), // portrait أو landscape
  pageSize: text('page_size').notNull().default('A4'),
  margins: jsonb('margins').default(sql`'{"top": 1, "left": 0.75, "right": 0.75, "bottom": 1}'::jsonb`),

  // تفعيل/إلغاء العناصر
  showHeader: boolean('show_header').notNull().default(true),
  showFooter: boolean('show_footer').notNull().default(true),
  showLogo: boolean('show_logo').notNull().default(true),
  showDate: boolean('show_date').notNull().default(true),
  showPageNumbers: boolean('show_page_numbers').notNull().default(true),

  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens);
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

export const insertAuditLogSchema = createInsertSchema(auditLogs);
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;


// Notification Read States (حالات قراءة الإشعارات)
// جدول بسيط لحفظ الإشعارات المقروءة - يحل مشكلة اختفاء الحالة عند إعادة تشغيل الخادم
export const notificationReadStates = pgTable("notification_read_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationId: text("notification_id").notNull(), // معرف الإشعار (مثل maintenance-tool-id)
  user_id: varchar("user_id"), // المستخدم الذي قرأ الإشعار (null للعام)
  isRead: boolean("is_read").default(true).notNull(), // حالة القراءة
  readAt: timestamp("read_at").defaultNow().notNull(), // تاريخ القراءة
  deviceInfo: text("device_info"), // معلومات الجهاز للمراجعة
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Build & Deployment table (جدول عمليات البناء والنشر)
export const buildDeployments = pgTable("build_deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildNumber: integer("build_number").notNull().unique("build_deployments_build_number_unique"),
  buildTarget: text("build_target").default("server"),
  status: text("status").notNull().default("running"),
  currentStep: text("current_step").notNull(),
  progress: integer("progress").notNull().default(0),
  version: text("version").notNull(),
  appType: text("app_type").notNull().default("web"),
  environment: text("environment").notNull().default("production"),
  branch: text("branch").default("main"),
  commitHash: text("commit_hash"),
  commitMessage: text("commit_message"),
  pipeline: text("pipeline").notNull().default("web-deploy"),
  deploymentType: text("deployment_type").notNull().default("standard"),
  errorMessage: text("error_message"),
  artifactUrl: text("artifact_url"),
  artifactSize: text("artifact_size"),
  serverHealthResult: jsonb("server_health_result"),
  rollbackInfo: jsonb("rollback_info"),
  environmentSnapshot: jsonb("environment_snapshot"),
  cleanupLog: jsonb("cleanup_log"),
  releaseNotes: text("release_notes"),
  logs: jsonb("logs").notNull().default([]),
  steps: jsonb("steps").notNull().default([]),
  duration: integer("duration"),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  triggeredBy: varchar("triggered_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

export const deploymentEvents = pgTable("deployment_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id").notNull(),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
    deployment_events_deployment_id_fkey: foreignKey({ name: "deployment_events_deployment_id_fkey", columns: [table.deploymentId], foreignColumns: [buildDeployments.id] }).onDelete("cascade")
  }));

export const insertBuildDeploymentSchema = createInsertSchema(buildDeployments).omit({
  id: true,
  created_at: true,
});

export const insertDeploymentEventSchema = createInsertSchema(deploymentEvents).omit({
  id: true,
});

export type BuildDeployment = typeof buildDeployments.$inferSelect;
export type InsertBuildDeployment = z.infer<typeof insertBuildDeploymentSchema>;
export type DeploymentEvent = typeof deploymentEvents.$inferSelect;
export type InsertDeploymentEvent = z.infer<typeof insertDeploymentEventSchema>;



// Insert schema for notification read states
export const insertNotificationReadStateSchema = createInsertSchema(notificationReadStates).omit({
  id: true,
  created_at: true,
});
export type InsertNotificationReadState = z.infer<typeof insertNotificationReadStateSchema>;
export type NotificationReadState = typeof notificationReadStates.$inferSelect;


// ==================== جداول الوكيل الذكي AI Agent ====================

// جلسات المحادثات
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  title: text("title").default("محادثة جديدة"),
  is_active: boolean("is_active").default(true).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  messagesCount: integer("messages_count").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// رسائل المحادثات
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  model: text("model"), // gpt-4o, gemini-1.5-flash
  provider: text("provider"), // openai, gemini
  tokensUsed: integer("tokens_used"),
  action: text("action"), // نوع الأمر المنفذ
  actionData: jsonb("action_data"), // بيانات الأمر
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxAiChatMessagesSessionId: index("idx_ai_chat_messages_session_id").on(table.sessionId),
  }));

// إحصائيات استخدام النماذج
export const aiUsageStats = pgTable("ai_usage_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  provider: text("provider").notNull(), // openai, gemini
  model: text("model").notNull(),
  requestsCount: integer("requests_count").default(0).notNull(),
  tokensUsed: integer("tokens_used").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Schemas for AI tables
export const insertAiChatSessionSchema = createInsertSchema(aiChatSessions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  created_at: true,
});

export const insertAiUsageStatsSchema = createInsertSchema(aiUsageStats).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types for AI tables
export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type InsertAiChatSession = z.infer<typeof insertAiChatSessionSchema>;

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;

export type AiUsageStats = typeof aiUsageStats.$inferSelect;
export type InsertAiUsageStats = z.infer<typeof insertAiUsageStatsSchema>;

// ==================== جداول نظام متابعة الآبار Wells Tracking System ====================

// ملاحظة: جداول projectTypes و wells تم تعريفها في بداية الملف

// 3. جدول مهام البئر (well_tasks)
export const wellTasks = pgTable("well_tasks", {
  id: serial("id").primaryKey(),
  well_id: integer("well_id").notNull(),
  taskType: varchar("task_type", { length: 50 }).notNull(), // نجارة، حفر، صبة، تركيب_ألواح، تركيب_مضخة، تمديدات، اختبار
  description: text("description"), // استرجاع الوصف
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }), // استرجاع التكلفة التقديرية
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }), // استرجاع التكلفة الفعلية
  taskOrder: integer("task_order").notNull(), // ترتيب المهمة
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  assignedWorkerId: varchar("assigned_worker_id", { length: 255 }),
  startDate: date("start_date"),
  completionDate: date("completion_date"),
  completedBy: varchar("completed_by"),
  createdBy: varchar("created_by", { length: 255 }),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxWellTasksWellId: index("idx_well_tasks_well_id").on(table.well_id),
}));

// 4. جدول محاسبة المهام (well_task_accounts)
export const wellTaskAccounts = pgTable("well_task_accounts", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  accountedBy: varchar("accounted_by", { length: 255 }).notNull(),
  accountedAt: timestamp("accounted_at").defaultNow().notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// 5. جدول مصاريف البئر (well_expenses)
export const wellExpenses = pgTable("well_expenses", {
  id: serial("id").primaryKey(),
  well_id: integer("well_id").notNull(),
  expenseType: varchar("expense_type", { length: 50 }).notNull(), // labor, operational_material, consumable_material, transport, service
  referenceType: varchar("reference_type", { length: 50 }), // worker_attendance, material_purchase, transport
  referenceId: varchar("reference_id"), // ID من الجدول المرجعي
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  notes: text("notes"),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
  idxWellExpensesWellId: index("idx_well_expenses_well_id").on(table.well_id),
}));

// 6. جدول سجل تدقيق الآبار (well_audit_logs)
export const wellAuditLogs = pgTable("well_audit_logs", {
  id: serial("id").primaryKey(),
  well_id: integer("well_id"),
  taskId: integer("task_id"),
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, status_change, account
  entityType: varchar("entity_type", { length: 50 }).notNull(), // well, task, expense, account
  entityId: integer("entity_id").notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  user_id: varchar("user_id").notNull(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// 7. جدول تصنيفات المواد (material_categories)
export const materialCategories = pgTable("material_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // operational, consumable
  unit: varchar("unit", { length: 20 }).notNull(),
  description: text("description"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(), // استخدام الاسم الموحد
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

// Insert Schemas for Wells Tracking System
export const insertProjectTypeSchema = createInsertSchema(projectTypes).omit({
  id: true,
  created_at: true,
});

export const insertWellSchema = createInsertSchema(wells).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertWellTaskSchema = createInsertSchema(wellTasks).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertWellTaskAccountSchema = createInsertSchema(wellTaskAccounts).omit({
  id: true,
  accountedAt: true,
});

export const insertWellExpenseSchema = createInsertSchema(wellExpenses).omit({
  id: true,
  created_at: true,
});

export const insertWellAuditLogSchema = createInsertSchema(wellAuditLogs).omit({
  id: true,
  created_at: true,
});

export const insertMaterialCategorySchema = createInsertSchema(materialCategories).omit({
  id: true,
});

// Types for Wells Tracking System
export type ProjectType = typeof projectTypes.$inferSelect;
export type InsertProjectType = z.infer<typeof insertProjectTypeSchema>;

export type Well = typeof wells.$inferSelect;
export type InsertWell = z.infer<typeof insertWellSchema>;

export type WellTask = typeof wellTasks.$inferSelect;
export type InsertWellTask = z.infer<typeof insertWellTaskSchema>;

export type WellTaskAccount = typeof wellTaskAccounts.$inferSelect;
export type InsertWellTaskAccount = z.infer<typeof insertWellTaskAccountSchema>;

export type WellExpense = typeof wellExpenses.$inferSelect;
export type InsertWellExpense = z.infer<typeof insertWellExpenseSchema>;

export type WellAuditLog = typeof wellAuditLogs.$inferSelect;
export type InsertWellAuditLog = z.infer<typeof insertWellAuditLogSchema>;

export type MaterialCategory = typeof materialCategories.$inferSelect;
export type InsertMaterialCategory = z.infer<typeof insertMaterialCategorySchema>;

// 8. جدول طواقم العمل (well_work_crews)
export const wellWorkCrews = pgTable("well_work_crews", {
  id: serial("id").primaryKey(),
  well_id: integer("well_id").notNull(),
  crewType: varchar("crew_type", { length: 255 }).notNull(), // welding, steel_installation, panel_installation
  teamName: text("team_name"),
  workersCount: decimal("workers_count", { precision: 10, scale: 4 }).default('0').notNull(),
  mastersCount: decimal("masters_count", { precision: 10, scale: 4 }).default('0').notNull(),
  workDays: decimal("work_days", { precision: 10, scale: 4 }).default('0').notNull(),
  workerDailyWage: decimal("worker_daily_wage", { precision: 12, scale: 2 }),
  masterDailyWage: decimal("master_daily_wage", { precision: 12, scale: 2 }),
  totalWages: decimal("total_wages", { precision: 12, scale: 2 }),
  crewDues: decimal("crew_dues", { precision: 12, scale: 2 }),
  workDate: date("work_date"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    well_work_crews_created_by_fkey: foreignKey({ name: "well_work_crews_created_by_fkey", columns: [table.createdBy], foreignColumns: [users.id] }),
    well_work_crews_well_id_fkey: foreignKey({ name: "well_work_crews_well_id_fkey", columns: [table.well_id], foreignColumns: [wells.id] }).onDelete("cascade")
  }));

// 8b. جدول ربط العمال بطواقم الآبار (well_crew_workers)
export const wellCrewWorkers = pgTable("well_crew_workers", {
  id: serial("id").primaryKey(),
  crew_id: integer("crew_id").notNull(),
  worker_id: varchar("worker_id").notNull(),
  daily_wage_snapshot: decimal("daily_wage_snapshot", { precision: 12, scale: 2 }),
  work_days: decimal("work_days", { precision: 10, scale: 4 }),
  crew_type: varchar("crew_type", { length: 50 }),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  wellCrewWorkersCrewWorkerIdx: uniqueIndex("well_crew_workers_crew_worker_idx").on(table.crew_id, table.worker_id),
    well_crew_workers_crew_id_fkey: foreignKey({ name: "well_crew_workers_crew_id_fkey", columns: [table.crew_id], foreignColumns: [wellWorkCrews.id] }).onDelete("cascade"),
    well_crew_workers_worker_id_fkey: foreignKey({ name: "well_crew_workers_worker_id_fkey", columns: [table.worker_id], foreignColumns: [workers.id] }).onDelete("cascade")
  
  }));

// 9. جدول مكونات الطاقة الشمسية (well_solar_components)
export const wellSolarComponents = pgTable("well_solar_components", {
  id: serial("id").primaryKey(),
  well_id: integer("well_id").notNull().unique("well_solar_components_well_id_key"),
  inverter: text("inverter"),
  collectionBox: text("collection_box"),
  carbonCarrier: text("carbon_carrier"),
  steelConverterTop: text("steel_converter_top"),
  clampConverterBottom: text("clamp_converter_bottom"),
  bindingCable6mm: text("binding_cable_6mm"),
  groundingCable10x2mm: text("grounding_cable_10x2mm"),
  jointThermalLiquid: text("joint_thermal_liquid"),
  groundingClip: text("grounding_clip"),
  groundingPlate: text("grounding_plate"),
  groundingRod: text("grounding_rod"),
  cable16x3mmLength: decimal("cable_16x3mm_length", { precision: 10, scale: 2 }),
  cable10x2mmLength: decimal("cable_10x2mm_length", { precision: 10, scale: 2 }),
  extraPipes: integer("extra_pipes"),
  extraPipesReason: text("extra_pipes_reason"),
  extraCable: decimal("extra_cable", { precision: 10, scale: 2 }),
  extraCableReason: text("extra_cable_reason"),
  fanCount: integer("fan_count"),
  submersiblePump: boolean("submersible_pump").default(true),
  installationStatus: varchar("installation_status", { length: 30 }).default("not_installed"),
  installedComponents: text("installed_components"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    well_solar_components_created_by_fkey: foreignKey({ name: "well_solar_components_created_by_fkey", columns: [table.createdBy], foreignColumns: [users.id] }),
    well_solar_components_well_id_fkey: foreignKey({ name: "well_solar_components_well_id_fkey", columns: [table.well_id], foreignColumns: [wells.id] }).onDelete("cascade")
  }));

// 10. جدول تفاصيل النقل (well_transport_details)
export const wellTransportDetails = pgTable("well_transport_details", {
  id: serial("id").primaryKey(),
  well_id: integer("well_id").notNull(),
  railType: varchar("rail_type", { length: 20 }), // new, old
  withPanels: boolean("with_panels").default(false),
  transportPrice: decimal("transport_price", { precision: 12, scale: 2 }),
  crewEntitlements: decimal("crew_entitlements", { precision: 12, scale: 2 }),
  transportDate: date("transport_date"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    well_transport_details_created_by_fkey: foreignKey({ name: "well_transport_details_created_by_fkey", columns: [table.createdBy], foreignColumns: [users.id] }),
    well_transport_details_well_id_fkey: foreignKey({ name: "well_transport_details_well_id_fkey", columns: [table.well_id], foreignColumns: [wells.id] }).onDelete("cascade")
  }));

// 11. جدول استلام الآبار (well_receptions)
export const wellReceptions = pgTable("well_receptions", {
  id: serial("id").primaryKey(),
  well_id: integer("well_id").notNull(),
  receivedBy: varchar("received_by"),
  receiverName: text("receiver_name"),
  inspectionStatus: varchar("inspection_status", { length: 50 }).default("pending"), // pending, passed, failed
  inspectionNotes: text("inspection_notes"),
  receivedAt: timestamp("received_at"),
  receptionDate: date("reception_date"),
  engineers: text("engineers"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    well_receptions_created_by_fkey: foreignKey({ name: "well_receptions_created_by_fkey", columns: [table.createdBy], foreignColumns: [users.id] }),
    well_receptions_received_by_fkey: foreignKey({ name: "well_receptions_received_by_fkey", columns: [table.receivedBy], foreignColumns: [users.id] }),
    well_receptions_well_id_fkey: foreignKey({ name: "well_receptions_well_id_fkey", columns: [table.well_id], foreignColumns: [wells.id] }).onDelete("cascade")
  }));

// Insert Schemas for new well tables
export const insertWellWorkCrewSchema = createInsertSchema(wellWorkCrews).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertWellSolarComponentSchema = createInsertSchema(wellSolarComponents).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertWellTransportDetailSchema = createInsertSchema(wellTransportDetails).omit({
  id: true,
  created_at: true,
});

export const insertWellReceptionSchema = createInsertSchema(wellReceptions).omit({
  id: true,
  created_at: true,
});

// Types for new well tables
export type WellWorkCrew = typeof wellWorkCrews.$inferSelect;
export type InsertWellWorkCrew = z.infer<typeof insertWellWorkCrewSchema>;

export type WellSolarComponent = typeof wellSolarComponents.$inferSelect;
export type InsertWellSolarComponent = z.infer<typeof insertWellSolarComponentSchema>;

export type WellTransportDetail = typeof wellTransportDetails.$inferSelect;
export type InsertWellTransportDetail = z.infer<typeof insertWellTransportDetailSchema>;

export type WellReception = typeof wellReceptions.$inferSelect;
export type InsertWellReception = z.infer<typeof insertWellReceptionSchema>;

export const insertWellCrewWorkerSchema = createInsertSchema(wellCrewWorkers).omit({
  id: true,
  created_at: true,
});

export type WellCrewWorker = typeof wellCrewWorkers.$inferSelect;
export type InsertWellCrewWorker = z.infer<typeof insertWellCrewWorkerSchema>;

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  code: text("code"),
  name: text("name").notNull(),
  sku: text("sku"),
  type: text("type"),
  unit: text("unit").default("قطعة"),
  quantity: integer("quantity").default(1).notNull(),
  status: text("status").default("active"),
  condition: text("condition").default("excellent"),
  description: text("description"),
  purchaseDate: text("purchase_date"),
  purchasePrice: text("purchase_price"),
  project_id: varchar("project_id"),
  imageUrl: text("image_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxEquipmentCode: index("idx_equipment_code").on(table.code),
    equipment_project_id_fkey: foreignKey({ name: "equipment_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] })
  
  }));

export const equipmentMovements = pgTable("equipment_movements", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id"),
  fromProjectId: varchar("from_project_id"),
  toProjectId: varchar("to_project_id"),
  quantity: integer("quantity").default(1).notNull(),
  movementDate: timestamp("movement_date").defaultNow(),
  reason: text("reason"),
  performedBy: text("performed_by"),
  notes: text("notes"),
}, (table) => ({
  idxEquipmentMovementsEquipmentId: index("idx_equipment_movements_equipment_id").on(table.equipmentId),
    equipment_movements_equipment_id_fkey: foreignKey({ name: "equipment_movements_equipment_id_fkey", columns: [table.equipmentId], foreignColumns: [equipment.id] }),
    equipment_movements_from_project_id_fkey: foreignKey({ name: "equipment_movements_from_project_id_fkey", columns: [table.fromProjectId], foreignColumns: [projects.id] }),
    equipment_movements_to_project_id_fkey: foreignKey({ name: "equipment_movements_to_project_id_fkey", columns: [table.toProjectId], foreignColumns: [projects.id] })
  
  }));

export type Equipment = typeof equipment.$inferSelect;
export const insertEquipmentSchema = createInsertSchema(equipment).omit({ id: true, created_at: true });
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;

export type EquipmentMovement = typeof equipmentMovements.$inferSelect;
export const insertEquipmentMovementSchema = createInsertSchema(equipmentMovements).omit({ id: true });
export type InsertEquipmentMovement = z.infer<typeof insertEquipmentMovementSchema>;

// ========================
// نظام إدارة المخزن (Inventory Management System)
// FIFO-based stock management with lot tracking
// ========================

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull().default("قطعة"),
  sku: text("sku"),
  minQuantity: decimal("min_quantity", { precision: 10, scale: 3 }).default('0'),
  isActive: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxInventoryItemsName: index("idx_inventory_items_name").on(table.name),
  idxInventoryItemsCategory: index("idx_inventory_items_category").on(table.category),
}));

export const inventoryLots = pgTable("inventory_lots", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  purchaseId: varchar("purchase_id").references(() => materialPurchases.id, { onDelete: "set null" }),
  receivedQty: decimal("received_qty", { precision: 10, scale: 3 }).notNull(),
  remainingQty: decimal("remaining_qty", { precision: 10, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 15, scale: 2 }).notNull().default('0'),
  receiptDate: text("receipt_date").notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxInventoryLotsItemId: index("idx_inventory_lots_item_id").on(table.itemId),
  idxInventoryLotsSupplier: index("idx_inventory_lots_supplier").on(table.supplierId),
  idxInventoryLotsDate: index("idx_inventory_lots_date").on(table.receiptDate),
}));

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  lotId: integer("lot_id").references(() => inventoryLots.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 15, scale: 2 }).default('0'),
  totalCost: decimal("total_cost", { precision: 15, scale: 2 }).default('0'),
  fromProjectId: varchar("from_project_id").references(() => projects.id, { onDelete: "set null" }),
  toProjectId: varchar("to_project_id").references(() => projects.id, { onDelete: "set null" }),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  performedBy: text("performed_by"),
  transactionDate: text("transaction_date").notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxInventoryTxItemDate: index("idx_inventory_tx_item_date").on(table.itemId, table.transactionDate),
  idxInventoryTxType: index("idx_inventory_tx_type").on(table.type),
  idxInventoryTxToProject: index("idx_inventory_tx_to_project").on(table.toProjectId),
}));

export type InventoryItem = typeof inventoryItems.$inferSelect;
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, created_at: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type InventoryLot = typeof inventoryLots.$inferSelect;
export const insertInventoryLotSchema = createInsertSchema(inventoryLots).omit({ id: true, created_at: true });
export type InsertInventoryLot = z.infer<typeof insertInventoryLotSchema>;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true, created_at: true });
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

// ========================
// نظام دفتر الأستاذ والقيد المزدوج (Double-Entry Ledger System)
// يتبع المعايير المحاسبية العالمية: GAAP/IFRS
// ========================

export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique("account_types_code_key"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  category: text("category").notNull(), // asset, liability, equity, revenue, expense
  normalBalance: text("normal_balance").notNull(), // debit, credit
  parentId: integer("parent_id"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryNumber: serial("entry_number"),
  project_id: varchar("project_id"),
  entryDate: text("entry_date").notNull(), // YYYY-MM-DD
  description: text("description").notNull(),
  sourceTable: text("source_table").notNull(), // fund_transfers, material_purchases, etc
  sourceId: text("source_id").notNull(),
  entryType: text("entry_type").notNull(), // original, reversal, adjustment
  reversalOfId: uuid("reversal_of_id"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("posted"), // draft, posted, reversed
  createdBy: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  ...syncFields,
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
}, (table) => ({
    journal_entries_created_by_fkey: foreignKey({ name: "journal_entries_created_by_fkey", columns: [table.createdBy], foreignColumns: [users.id] }),
    journal_entries_project_id_fkey: foreignKey({ name: "journal_entries_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] })
  }));

export const journalLines = pgTable("journal_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  journalEntryId: uuid("journal_entry_id").notNull(),
  accountCode: varchar("account_code", { length: 20 }).notNull(),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0"),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    journal_lines_journal_entry_id_fkey: foreignKey({ name: "journal_lines_journal_entry_id_fkey", columns: [table.journalEntryId], foreignColumns: [journalEntries.id] })
  }));

export const financialAuditLog = pgTable("financial_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_id: varchar("project_id"),
  action: text("action").notNull(), // create, update, delete, reverse
  entityType: text("entity_type").notNull(), // fund_transfer, material_purchase, etc
  entityId: text("entity_id").notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  changedFields: jsonb("changed_fields"),
  user_id: varchar("user_id"),
  userEmail: text("user_email"),
  reason: text("reason"),
  ipAddress: inet("ip_address"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    financial_audit_log_project_id_fkey: foreignKey({ name: "financial_audit_log_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] }),
    financial_audit_log_user_id_fkey: foreignKey({ name: "financial_audit_log_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] })
  }));

export const reconciliationRecords = pgTable("reconciliation_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_id: varchar("project_id").notNull(),
  reconciliationDate: text("reconciliation_date").notNull(), // YYYY-MM-DD
  ledgerBalance: decimal("ledger_balance", { precision: 15, scale: 2 }).notNull(),
  computedBalance: decimal("computed_balance", { precision: 15, scale: 2 }).notNull(),
  discrepancy: decimal("discrepancy", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, matched, discrepancy, resolved
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    reconciliation_records_project_id_fkey: foreignKey({ name: "reconciliation_records_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] }),
    reconciliation_records_resolved_by_fkey: foreignKey({ name: "reconciliation_records_resolved_by_fkey", columns: [table.resolvedBy], foreignColumns: [users.id] })
  }));

export const summaryInvalidations = pgTable("summary_invalidations", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_id: varchar("project_id").notNull(),
  invalidatedFrom: text("invalidated_from").notNull(), // YYYY-MM-DD
  reason: text("reason").notNull(),
  sourceTable: text("source_table"),
  sourceId: text("source_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    summary_invalidations_project_id_fkey: foreignKey({ name: "summary_invalidations_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] })
  }));

export const insertAccountTypeSchema = createInsertSchema(accountTypes).omit({ id: true, created_at: true });
export type AccountType = typeof accountTypes.$inferSelect;
export type InsertAccountType = z.infer<typeof insertAccountTypeSchema>;

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, entryNumber: true, created_at: true });
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export const insertJournalLineSchema = createInsertSchema(journalLines).omit({ id: true, created_at: true });
export type JournalLine = typeof journalLines.$inferSelect;
export type InsertJournalLine = z.infer<typeof insertJournalLineSchema>;

export const insertFinancialAuditLogSchema = createInsertSchema(financialAuditLog).omit({ id: true, created_at: true });
export type FinancialAuditLog = typeof financialAuditLog.$inferSelect;
export type InsertFinancialAuditLog = z.infer<typeof insertFinancialAuditLogSchema>;

export const insertReconciliationRecordSchema = createInsertSchema(reconciliationRecords).omit({ id: true, created_at: true });
export type ReconciliationRecord = typeof reconciliationRecords.$inferSelect;
export type InsertReconciliationRecord = z.infer<typeof insertReconciliationRecordSchema>;

export const insertSummaryInvalidationSchema = createInsertSchema(summaryInvalidations).omit({ id: true, created_at: true });
export type SummaryInvalidation = typeof summaryInvalidations.$inferSelect;
export type InsertSummaryInvalidation = z.infer<typeof insertSummaryInvalidationSchema>;

export const syncAuditLogs = pgTable("sync_audit_logs", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id"),
  userName: text("user_name"),
  module: varchar("module", { length: 50 }).notNull(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: text("record_id"),
  action: varchar("action", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("success"),
  description: text("description").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  errorMessage: text("error_message"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  durationMs: integer("duration_ms"),
  syncType: varchar("sync_type", { length: 30 }),
  project_id: varchar("project_id"),
  projectName: text("project_name"),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxSyncAuditCreatedAt: index("idx_sync_audit_created_at").on(table.created_at),
  idxSyncAuditModule: index("idx_sync_audit_module").on(table.module),
  idxSyncAuditProjectId: index("idx_sync_audit_project_id").on(table.project_id),
  idxSyncAuditStatus: index("idx_sync_audit_status").on(table.status),
  idxSyncAuditUserId: index("idx_sync_audit_user_id").on(table.user_id),
  idxSyncAuditModuleStatusCreatedAt: index("idx_sync_audit_module_status_created_at").on(table.module, table.status, table.created_at),
  idxSyncAuditUserCreatedAt: index("idx_sync_audit_user_created_at").on(table.user_id, table.created_at),
  idxSyncAuditActionCreatedAt: index("idx_sync_audit_action_created_at").on(table.action, table.created_at),
    sync_audit_logs_project_id_fkey: foreignKey({ name: "sync_audit_logs_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] }),
    sync_audit_logs_user_id_fkey: foreignKey({ name: "sync_audit_logs_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] })
  
  }));

export const insertSyncAuditLogSchema = createInsertSchema(syncAuditLogs).omit({ id: true, created_at: true });
export type SyncAuditLog = typeof syncAuditLogs.$inferSelect;
export type InsertSyncAuditLog = z.infer<typeof insertSyncAuditLogSchema>;

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique("idempotency_keys_key_unique"),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code").notNull(),
  responseBody: jsonb("response_body"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertIdempotencyKeySchema = createInsertSchema(idempotencyKeys).omit({ id: true, created_at: true });
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type InsertIdempotencyKey = z.infer<typeof insertIdempotencyKeySchema>;

// WebAuthn Credentials table (جدول بيانات اعتماد WebAuthn للمصادقة البيومترية)
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  credential_id: text("credential_id").notNull().unique("webauthn_credentials_credential_id_key"),
  public_key: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports").array(),
  device_label: text("device_label"),
  created_at: timestamp("created_at").defaultNow(),
  last_used_at: timestamp("last_used_at"),
});

export const insertWebAuthnCredentialSchema = createInsertSchema(webauthnCredentials).omit({ id: true, created_at: true });
export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebAuthnCredential = z.infer<typeof insertWebAuthnCredentialSchema>;

// WebAuthn Challenges table (جدول تحديات WebAuthn المؤقتة)
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: serial("id").primaryKey(),
  user_id: text("user_id"),
  challenge: text("challenge").notNull().unique("webauthn_challenges_challenge_key"),
  type: text("type").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  expires_at: timestamp("expires_at").notNull(),
});

export const insertWebAuthnChallengeSchema = createInsertSchema(webauthnChallenges).omit({ id: true, created_at: true });
export type WebAuthnChallenge = typeof webauthnChallenges.$inferSelect;
export type InsertWebAuthnChallenge = z.infer<typeof insertWebAuthnChallengeSchema>;

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull().unique("user_preferences_user_id_key"),
  language: text("language").default("ar").notNull(),
  auto_update: boolean("auto_update").default(true).notNull(),
  dark_mode: boolean("dark_mode").default(false).notNull(),
  font_size: text("font_size").default("medium").notNull(),
  push_notifications: boolean("push_notifications").default(true).notNull(),
  expense_alerts: boolean("expense_alerts").default(true).notNull(),
  attendance_alerts: boolean("attendance_alerts").default(false).notNull(),
  app_lock: boolean("app_lock").default(false).notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    user_preferences_user_id_fkey: foreignKey({ name: "user_preferences_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] }).onDelete("cascade")
  }));

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, updated_at: true });
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export const whatsappUserLinks = pgTable("whatsapp_user_links", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull().unique("whatsapp_user_links_user_id_key"),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique("whatsapp_user_links_phone_number_key"),
  isActive: boolean("is_active").default(true).notNull(),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at"),
  totalMessages: integer("total_messages").default(0).notNull(),
  permissionsMode: varchar("permissions_mode", { length: 20 }).default("inherit_user").notNull(),
  canRead: boolean("can_read").default(true).notNull(),
  canAdd: boolean("can_add").default(true).notNull(),
  canEdit: boolean("can_edit").default(true).notNull(),
  canDelete: boolean("can_delete").default(true).notNull(),
  scopeAllProjects: boolean("scope_all_projects").default(true).notNull(),
}, (table) => ({
    whatsapp_user_links_user_id_fkey: foreignKey({ name: "whatsapp_user_links_user_id_fkey", columns: [table.user_id], foreignColumns: [users.id] }).onDelete("cascade")
  }));

export const insertWhatsappUserLinkSchema = createInsertSchema(whatsappUserLinks).omit({ id: true, linkedAt: true, lastMessageAt: true, totalMessages: true });
export type WhatsappUserLink = typeof whatsappUserLinks.$inferSelect;
export type InsertWhatsappUserLink = z.infer<typeof insertWhatsappUserLinkSchema>;

export const whatsappLinkProjects = pgTable("whatsapp_link_projects", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").notNull(),
  project_id: varchar("project_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueLinkProject: uniqueIndex("whatsapp_link_projects_link_id_project_id_key").on(table.linkId, table.project_id),
    whatsapp_link_projects_link_id_fkey: foreignKey({ name: "whatsapp_link_projects_link_id_fkey", columns: [table.linkId], foreignColumns: [whatsappUserLinks.id] }).onDelete("cascade"),
    whatsapp_link_projects_project_id_fkey: foreignKey({ name: "whatsapp_link_projects_project_id_fkey", columns: [table.project_id], foreignColumns: [projects.id] }).onDelete("cascade")
  
  }));

export const insertWhatsappLinkProjectSchema = createInsertSchema(whatsappLinkProjects).omit({ id: true, createdAt: true });
export type WhatsappLinkProject = typeof whatsappLinkProjects.$inferSelect;
export type InsertWhatsappLinkProject = z.infer<typeof insertWhatsappLinkProjectSchema>;

export const whatsappAllowedNumbers = pgTable("whatsapp_allowed_numbers", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  label: varchar("label", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  addedBy: varchar("added_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueAllowedPhone: uniqueIndex("whatsapp_allowed_numbers_phone_number_key").on(table.phoneNumber),
    whatsapp_allowed_numbers_added_by_fkey: foreignKey({ name: "whatsapp_allowed_numbers_added_by_fkey", columns: [table.addedBy], foreignColumns: [users.id] }).onDelete("set null")
  
  }));

export const insertWhatsappAllowedNumberSchema = createInsertSchema(whatsappAllowedNumbers).omit({ id: true, createdAt: true });
export type WhatsappAllowedNumber = typeof whatsappAllowedNumbers.$inferSelect;
export type InsertWhatsappAllowedNumber = z.infer<typeof insertWhatsappAllowedNumberSchema>;

export const whatsappBotSettings = pgTable("whatsapp_bot_settings", {
  id: serial("id").primaryKey(),
  botName: varchar("bot_name", { length: 100 }).default("مساعد إدارة المشاريع").notNull(),
  botDescription: varchar("bot_description", { length: 500 }).default("بوت ذكي لإدارة المشاريع والمصروفات"),
  language: varchar("language", { length: 10 }).default("ar").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Riyadh").notNull(),

  deletePreviousMessages: boolean("delete_previous_messages").default(false).notNull(),
  boldHeadings: boolean("bold_headings").default(true).notNull(),
  useEmoji: boolean("use_emoji").default(true).notNull(),
  welcomeMessage: text("welcome_message").default(""),
  unavailableMessage: text("unavailable_message").default("عذراً، الخدمة غير متاحة حالياً. حاول لاحقاً."),
  footerText: varchar("footer_text", { length: 200 }).default("*0* القائمة | *#* رجوع"),

  menuMainTitle: varchar("menu_main_title", { length: 100 }).default("القائمة الرئيسية"),
  menuExpensesTitle: varchar("menu_expenses_title", { length: 100 }).default("المصروفات"),
  menuProjectsTitle: varchar("menu_projects_title", { length: 100 }).default("المشاريع"),
  menuReportsTitle: varchar("menu_reports_title", { length: 100 }).default("التقارير"),
  menuExportTitle: varchar("menu_export_title", { length: 100 }).default("تصدير الكشوفات"),
  menuHelpTitle: varchar("menu_help_title", { length: 100 }).default("المساعدة"),
  menuExpensesEmoji: varchar("menu_expenses_emoji", { length: 10 }).default("💰"),
  menuProjectsEmoji: varchar("menu_projects_emoji", { length: 10 }).default("🏗️"),
  menuReportsEmoji: varchar("menu_reports_emoji", { length: 10 }).default("📊"),
  menuExportEmoji: varchar("menu_export_emoji", { length: 10 }).default("📤"),
  menuHelpEmoji: varchar("menu_help_emoji", { length: 10 }).default("❓"),

  botEnabled: boolean("bot_enabled").default(true).notNull(),
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  maintenanceMessage: text("maintenance_message").default("🔧 البوت في وضع الصيانة حالياً. سنعود قريباً."),

  businessHoursEnabled: boolean("business_hours_enabled").default(false).notNull(),
  businessHoursStart: varchar("business_hours_start", { length: 5 }).default("08:00").notNull(),
  businessHoursEnd: varchar("business_hours_end", { length: 5 }).default("17:00").notNull(),
  businessDays: varchar("business_days", { length: 50 }).default("0,1,2,3,4").notNull(),
  outsideHoursMessage: text("outside_hours_message").default("⏰ عذراً، ساعات العمل من {start} إلى {end}. سنرد عليك في أقرب وقت."),

  smartGreeting: boolean("smart_greeting").default(true).notNull(),
  goodbyeMessage: text("goodbye_message").default(""),
  waitingMessage: text("waiting_message").default("⏳ جاري معالجة طلبك..."),
  typingIndicator: boolean("typing_indicator").default(true).notNull(),

  sessionTimeoutMinutes: integer("session_timeout_minutes").default(30).notNull(),
  maxMessageLength: integer("max_message_length").default(4000).notNull(),
  perUserDailyLimit: integer("per_user_daily_limit").default(100).notNull(),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(10).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),

  adminNotifyPhone: varchar("admin_notify_phone", { length: 20 }).default(""),
  mediaEnabled: boolean("media_enabled").default(true).notNull(),

  protectionLevel: varchar("protection_level", { length: 20 }).default("balanced").notNull(),
  responseDelayMin: integer("response_delay_min").default(2000).notNull(),
  responseDelayMax: integer("response_delay_max").default(5000).notNull(),
  dailyMessageLimit: integer("daily_message_limit").default(50).notNull(),

  notifyNewMessage: boolean("notify_new_message").default(false).notNull(),
  notifyOnError: boolean("notify_on_error").default(true).notNull(),
  notifyOnDisconnect: boolean("notify_on_disconnect").default(true).notNull(),

  debugMode: boolean("debug_mode").default(false).notNull(),
  messageLogging: boolean("message_logging").default(true).notNull(),
  autoReconnect: boolean("auto_reconnect").default(true).notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by"),
}, (table) => ({
    whatsapp_bot_settings_updated_by_fkey: foreignKey({ name: "whatsapp_bot_settings_updated_by_fkey", columns: [table.updatedBy], foreignColumns: [users.id] }).onDelete("set null")
  }));

export const insertWhatsappBotSettingsSchema = createInsertSchema(whatsappBotSettings).omit({ id: true, updatedAt: true });
export type WhatsappBotSettings = typeof whatsappBotSettings.$inferSelect;
export type InsertWhatsappBotSettings = z.infer<typeof insertWhatsappBotSettingsSchema>;

// Worker Settlements (تصفية حساب العمال)
export const workerSettlements = pgTable("worker_settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settlementDate: text("settlement_date").notNull(),
  settlementProjectId: varchar("settlement_project_id").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default('0').notNull(),
  workerCount: integer("worker_count").default(0).notNull(),
  transferCount: integer("transfer_count").default(0).notNull(),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxWorkerSettlementsDate: index("idx_worker_settlements_date").on(table.settlementDate),
  idxWorkerSettlementsProject: index("idx_worker_settlements_project").on(table.settlementProjectId),
    worker_settlements_created_by_fkey: foreignKey({ name: "worker_settlements_created_by_fkey", columns: [table.createdBy], foreignColumns: [users.id] }).onDelete("set null"),
    worker_settlements_settlement_project_id_fkey: foreignKey({ name: "worker_settlements_settlement_project_id_fkey", columns: [table.settlementProjectId], foreignColumns: [projects.id] }).onDelete("cascade")
  
  }));

// Worker Settlement Lines (تفاصيل تصفية حساب العمال)
export const workerSettlementLines = pgTable("worker_settlement_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settlementId: varchar("settlement_id").notNull(),
  workerId: varchar("worker_id").notNull(),
  fromProjectId: varchar("from_project_id").notNull(),
  toProjectId: varchar("to_project_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }).default('0').notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).default('0').notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxWorkerSettlementLinesSettlement: index("idx_worker_settlement_lines_settlement").on(table.settlementId),
  idxWorkerSettlementLinesWorker: index("idx_worker_settlement_lines_worker").on(table.workerId),
    worker_settlement_lines_from_project_id_fkey: foreignKey({ name: "worker_settlement_lines_from_project_id_fkey", columns: [table.fromProjectId], foreignColumns: [projects.id] }).onDelete("cascade"),
    worker_settlement_lines_settlement_id_fkey: foreignKey({ name: "worker_settlement_lines_settlement_id_fkey", columns: [table.settlementId], foreignColumns: [workerSettlements.id] }).onDelete("cascade"),
    worker_settlement_lines_to_project_id_fkey: foreignKey({ name: "worker_settlement_lines_to_project_id_fkey", columns: [table.toProjectId], foreignColumns: [projects.id] }).onDelete("cascade"),
    worker_settlement_lines_worker_id_fkey: foreignKey({ name: "worker_settlement_lines_worker_id_fkey", columns: [table.workerId], foreignColumns: [workers.id] }).onDelete("cascade")
  
  }));

export const insertWorkerSettlementSchema = createInsertSchema(workerSettlements).omit({ id: true, created_at: true });
export type WorkerSettlement = typeof workerSettlements.$inferSelect;
export type InsertWorkerSettlement = z.infer<typeof insertWorkerSettlementSchema>;

export const insertWorkerSettlementLineSchema = createInsertSchema(workerSettlementLines).omit({ id: true, created_at: true });
export type WorkerSettlementLine = typeof workerSettlementLines.$inferSelect;
export type InsertWorkerSettlementLine = z.infer<typeof insertWorkerSettlementLineSchema>;

export const centralEventLogs = pgTable("central_event_logs", {
  id: serial("id").primaryKey(),
  eventTime: timestamp("event_time", { withTimezone: true }).defaultNow().notNull(),
  level: varchar("level", { length: 10 }).notNull(),
  source: varchar("source", { length: 30 }).notNull(),
  module: varchar("module", { length: 50 }),
  action: varchar("action", { length: 50 }),
  status: varchar("status", { length: 20 }),
  actorUserId: varchar("actor_user_id", { length: 255 }),
  project_id: varchar("project_id", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: text("entity_id"),
  requestId: uuid("request_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  durationMs: integer("duration_ms"),
  message: text("message").notNull(),
  details: jsonb("details"),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCentralEventLogSchema = createInsertSchema(centralEventLogs).omit({ id: true, eventTime: true, created_at: true });
export type CentralEventLog = typeof centralEventLogs.$inferSelect;
export type InsertCentralEventLog = z.infer<typeof insertCentralEventLogSchema>;

export const SYNCABLE_TABLES = [
  'project_types', 'projects', 'workers', 'wells',
  'fund_transfers', 'worker_attendance', 'suppliers', 'materials', 'material_purchases',
  'supplier_payments', 'transportation_expenses', 'worker_transfers', 'worker_balances',
  'daily_expense_summaries', 'worker_types', 'autocomplete_data', 'worker_misc_expenses',
  'backup_logs', 'backup_settings', 'print_settings', 'project_fund_transfers',
  'security_policies', 'security_policy_suggestions', 'security_policy_implementations', 'security_policy_violations',
  'user_project_permissions', 'permission_audit_logs',
  'report_templates', 'notification_read_states', 'build_deployments',
  'notifications', 'ai_chat_sessions', 'ai_chat_messages', 'ai_usage_stats',
  'well_tasks', 'well_task_accounts', 'well_expenses', 'well_audit_logs', 'material_categories',
  'well_work_crews', 'well_crew_workers', 'well_solar_components', 'well_transport_details', 'well_receptions',
  'equipment', 'equipment_movements',
  'worker_settlements', 'worker_settlement_lines',
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

export const SERVER_TO_IDB_TABLE_MAP: Record<string, string> = {
  'emergency_users': 'emergencyUsers',
  'auth_user_sessions': 'authUserSessions',
  'email_verification_tokens': 'emailVerificationTokens',
  'password_reset_tokens': 'passwordResetTokens',
  'project_types': 'projectTypes',
  'fund_transfers': 'fundTransfers',
  'worker_attendance': 'workerAttendance',
  'material_purchases': 'materialPurchases',
  'supplier_payments': 'supplierPayments',
  'transportation_expenses': 'transportationExpenses',
  'worker_transfers': 'workerTransfers',
  'worker_balances': 'workerBalances',
  'daily_expense_summaries': 'dailyExpenseSummaries',
  'worker_types': 'workerTypes',
  'autocomplete_data': 'autocompleteData',
  'worker_misc_expenses': 'workerMiscExpenses',
  'backup_logs': 'backupLogs',
  'backup_settings': 'backupSettings',
  'print_settings': 'printSettings',
  'project_fund_transfers': 'projectFundTransfers',
  'security_policies': 'securityPolicies',
  'security_policy_suggestions': 'securityPolicySuggestions',
  'security_policy_implementations': 'securityPolicyImplementations',
  'security_policy_violations': 'securityPolicyViolations',
  'user_project_permissions': 'userProjectPermissions',
  'permission_audit_logs': 'permissionAuditLogs',
  'report_templates': 'reportTemplates',
  'notification_read_states': 'notificationReadStates',
  'build_deployments': 'buildDeployments',
  'ai_chat_sessions': 'aiChatSessions',
  'ai_chat_messages': 'aiChatMessages',
  'ai_usage_stats': 'aiUsageStats',
  'well_tasks': 'wellTasks',
  'well_task_accounts': 'wellTaskAccounts',
  'well_expenses': 'wellExpenses',
  'well_audit_logs': 'wellAuditLogs',
  'material_categories': 'materialCategories',
  'well_work_crews': 'wellWorkCrews',
  'well_crew_workers': 'wellCrewWorkers',
  'well_solar_components': 'wellSolarComponents',
  'well_transport_details': 'wellTransportDetails',
  'well_receptions': 'wellReceptions',
  'equipment_movements': 'equipmentMovements',
  'auth_request_nonces': 'authRequestNonces',
  'worker_settlements': 'workerSettlements',
  'worker_settlement_lines': 'workerSettlementLines',
};

export interface ErrorLog {
  id: number;
  timestamp: string;
  type: string;
  path: string;
  error: string;
  status: string;
  statusCode: number;
  userAgent?: string | null;
  ip?: string | null;
  stack?: string | null;
}

export type InsertErrorLog = Omit<ErrorLog, 'id'>;

export interface DiagnosticCheck {
  id: number;
  name: string;
  description: string;
  status: 'running' | 'success' | 'failure' | 'warning';
  message?: string | null;
  duration?: number | null;
  created_at?: Date | null;
}

export type InsertDiagnosticCheck = Omit<DiagnosticCheck, 'id' | 'created_at' | 'message' | 'duration'>;

export interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  created_at: string;
  resolved_at?: string | null;
}

// --- Deployment RBAC & Approval Tables ---

export const deploymentApprovals = pgTable("deployment_approvals", {
  id: serial("id").primaryKey(),
  deploymentId: varchar("deployment_id", { length: 255 }).notNull(),
  requestedBy: varchar("requested_by", { length: 255 }).notNull(),
  approvedBy: varchar("approved_by", { length: 255 }),
  status: text("status").notNull().default("pending"),
  pipeline: text("pipeline").notNull(),
  environment: text("environment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxDeploymentApprovalsDeploymentId: index("idx_deployment_approvals_deployment_id").on(table.deploymentId),
  idxDeploymentApprovalsStatus: index("idx_deployment_approvals_status").on(table.status),
}));

export const insertDeploymentApprovalSchema = createInsertSchema(deploymentApprovals).omit({
  id: true,
  createdAt: true,
});

export type DeploymentApproval = typeof deploymentApprovals.$inferSelect;
export type InsertDeploymentApproval = z.infer<typeof insertDeploymentApprovalSchema>;

export const deploymentPermissions = pgTable("deployment_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  allowedPipelines: text("allowed_pipelines").array().notNull(),
  allowedEnvironments: text("allowed_environments").array().notNull(),
  requiresApproval: boolean("requires_approval").default(true).notNull(),
  maxDailyDeploys: integer("max_daily_deploys").default(10).notNull(),
}, (table) => ({
  idxDeploymentPermissionsUserId: index("idx_deployment_permissions_user_id").on(table.userId),
}));

export const insertDeploymentPermissionSchema = createInsertSchema(deploymentPermissions).omit({
  id: true,
});

export type DeploymentPermission = typeof deploymentPermissions.$inferSelect;
export type InsertDeploymentPermission = z.infer<typeof insertDeploymentPermissionSchema>;

