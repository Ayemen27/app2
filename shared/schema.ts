import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, jsonb, uuid, inet, serial, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Monitoring Tables (OTLP Compatible) ---

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  model: text("model"),
  manufacturer: text("manufacturer"),
  osVersion: text("os_version"),
  sdkVersion: integer("sdk_version"),
  appVersion: text("app_version"),
  lastSeen: timestamp("last_seen").defaultNow(),
  metadata: jsonb("metadata"),
});

export const crashes = pgTable("crashes", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  exceptionType: text("exception_type"),
  message: text("message"),
  stackTrace: text("stack_trace"),
  severity: text("severity"), // 'critical', 'warning', 'info'
  appState: jsonb("app_state"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
  appVersion: text("app_version"),
});

export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  metricName: text("metric_name").notNull(),
  value: decimal("value", { precision: 20, scale: 4 }).notNull(),
  unit: text("unit"),
  attributes: jsonb("attributes"),
  timestamp: timestamp("timestamp").defaultNow(),
});

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
  email: text("email").notNull().unique(),
  password: text("password").notNull(), 
  passwordAlgo: text("password_algo").default("argon2id").notNull(), // argon2id, legacy
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name"),
  phone: text("phone"),
  birthDate: text("birth_date"),
  birthPlace: text("birth_place"),
  gender: text("gender"),
  role: text("role").notNull().default("admin"), 
  isActive: boolean("is_active").default(true).notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(false).notNull(), 
  emailVerifiedAt: timestamp("email_verified_at"), 
  totpSecret: text("totp_secret"), 
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(), 
  fcmToken: text("fcm_token"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  // Refresh Token fields
  refreshTokenHash: text("refresh_token_hash"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
  version: integer("version").default(1).notNull(), 
  lastModifiedBy: varchar("last_modified_by"),
}, (table) => ({
  // Define constraints if needed
}));

// Update syncFields after users is defined
// (syncFields as any).lastModifiedBy = varchar("last_modified_by").references(() => users.id);


// Refresh Tokens table (جدول توكنات التحديث)
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  replacedBy: uuid("replaced_by"), // Rotation: المعرف الجديد الذي حل محل هذا التوكن
  revoked: boolean("revoked").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"), // للتأكد من أن التوكن يستخدم من نفس الجهاز
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Logs table (جدول سجلات التدقيق)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Emergency Users table (جدول مستخدمي الطوارئ - محلي فقط)
export const emergencyUsers = pgTable("emergency_users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks table (جدول المهام)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true,
  createdAt: true 
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;


// Authentication User Sessions table (جدول جلسات المستخدمين)
export const authUserSessions = pgTable("auth_user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionToken: varchar("session_token"),
  deviceFingerprint: varchar("device_fingerprint"),
  userAgent: text("user_agent"),
  ipAddress: inet("ip_address"),
  locationData: jsonb("location_data"),
  isTrustedDevice: boolean("is_trusted_device").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  refreshTokenHash: text("refresh_token_hash"),
  accessTokenHash: text("access_token_hash"),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: varchar("revoked_reason"),
});

// Notifications table (جدول الإشعارات)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null if broadcast
  title: text("title").notNull(),
  body: text("body").notNull(),
  message: text("message"), // Keeping for backward compatibility if needed, but 'body' is preferred
  type: text("type").notNull().default("system"),
  priority: integer("priority").default(3),
  projectId: varchar("project_id").references(() => projects.id),
  createdBy: varchar("created_by").references(() => users.id),
  recipients: text("recipients").array(), // For targeted multiple users
  payload: jsonb("payload"),
  meta: jsonb("meta"),
  readBy: text("read_by").array(),
  deliveredTo: text("delivered_to").array(),
  scheduledAt: timestamp("scheduled_at"),
  channelPreference: jsonb("channel_preference"),
  isRead: boolean("is_read").default(false).notNull(),
  targetPlatform: text("target_platform").default("all").notNull(), // 'all', 'android', 'web'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true,
  isRead: true 
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Email Verification Tokens table (جدول رموز التحقق من البريد الإلكتروني)
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  email: text("email").notNull(), // البريد الإلكتروني المراد التحقق منه
  token: varchar("token").notNull().unique(), // الرمز المرسل للمستخدم (6 أرقام)
  tokenHash: varchar("token_hash").notNull(), // hash الرمز المحفوظ في قاعدة البيانات
  verificationLink: text("verification_link").notNull(), // رابط التحقق الكامل
  expiresAt: timestamp("expires_at").notNull(), // انتهاء صلاحية الرمز (عادة 24 ساعة)
  verifiedAt: timestamp("verified_at"), // متى تم التحقق من البريد
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: inet("ip_address"), // IP الذي طلب التحقق
  userAgent: text("user_agent"), // User Agent الذي طلب التحقق
  attemptsCount: integer("attempts_count").default(0).notNull(), // عدد محاولات استخدام الرمز
});

// Password Reset Tokens table (جدول رموز استرجاع كلمة المرور)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(), // الرمز المرسل للمستخدم
  tokenHash: varchar("token_hash").notNull(), // hash الرمز المحفوظ في قاعدة البيانات
  expiresAt: timestamp("expires_at").notNull(), // انتهاء صلاحية الرمز (عادة ساعة واحدة)
  usedAt: timestamp("used_at"), // متى تم استخدام الرمز
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: inet("ip_address"), // IP الذي طلب الاسترجاع
  userAgent: text("user_agent"), // User Agent الذي طلب الاسترجاع
});

// Project Types table (أنواع المشاريع) - يجب تعريفه قبل projects
export const projectTypes = pgTable("project_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ...syncFields,
}, (table) => ({
  uniqueProjectTypeName: sql`UNIQUE ("name")`,
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
  projectTypeId: integer("project_type_id").references(() => projectTypes.id, { onDelete: "set null" }), // نوع المشروع
  isActive: boolean("is_active").default(true).notNull(), // إعادة إضافة الحالة النشطة
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // إعادة إضافة تحديث الوقت
  ...syncFields,
}, (table) => ({
  uniqueProjectName: sql`UNIQUE ("name")`,
}));

// Workers table
export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // معلم (master), عامل (worker)
  dailyWage: decimal("daily_wage", { precision: 15, scale: 2 }).notNull(),
  phone: text("phone"), // رقم الهاتف
  hireDate: text("hire_date"), // تاريخ التوظيف (YYYY-MM-DD)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ...syncFields,
}, (table) => ({
  uniqueWorkerName: sql`UNIQUE ("name")`,
}));

// Wells table (جدول الآبار) - يدير بيانات الآبار والملاك والمواقع والخصائص الفنية
// تم تحسين هذا الجدول لدعم تتبع حالة الإنجاز ونسب التنفيذ تلقائياً
export const wells = pgTable("wells", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
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
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ...syncFields,
}, (table) => ({
  uniqueWellNumberInProject: sql`UNIQUE (project_id, well_number)`,
}));

// Fund transfers (تحويلات العهدة)
export const fundTransfers = pgTable("fund_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  senderName: text("sender_name"), // اسم المرسل
  transferNumber: text("transfer_number").unique(), // رقم الحولة - فريد
  transferType: text("transfer_type").notNull(), // حولة، تسليم يدوي، صراف
  transferDate: text("transfer_date").notNull(), // YYYY-MM-DD format
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Worker attendance
export const workerAttendance = pgTable("worker_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
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
  workDays: decimal("work_days", { precision: 10, scale: 2 }).default('0.00'), // عدد أيام العمل (مثل 0.5، 1.0، 1.5) - افتراضي 0
  dailyWage: decimal("daily_wage", { precision: 15, scale: 2 }).notNull(), // الأجر اليومي الكامل
  actualWage: decimal("actual_wage", { precision: 15, scale: 2 }), // الأجر الفعلي = dailyWage * workDays - nullable في قاعدة البيانات
  totalPay: decimal("total_pay", { precision: 15, scale: 2 }).notNull(), // إجمالي الدفع المطلوب = actualWage
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default('0'), // المبلغ المدفوع فعلياً (الصرف) - nullable في قاعدة البيانات
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).default('0'), // المتبقي في حساب العامل - nullable في قاعدة البيانات
  paymentType: text("payment_type").default("partial"), // "full" | "partial" | "credit" - nullable في قاعدة البيانات
  notes: text("notes"), // ملاحظات
  wellId: integer("well_id").references(() => wells.id, { onDelete: "set null" }), // ربط ببئر محدد (اختياري)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // قيد فريد لمنع تسجيل حضور مكرر لنفس العامل في نفس اليوم
  uniqueWorkerDate: sql`UNIQUE (worker_id, attendance_date, project_id)`,
}));

// Suppliers (الموردين)
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"), // الشخص المسؤول
  phone: text("phone"),
  address: text("address"),
  paymentTerms: text("payment_terms").default("نقد"), // نقد، 30 يوم، 60 يوم، etc
  totalDebt: decimal("total_debt", { precision: 12, scale: 2 }).default('0').notNull(), // إجمالي المديونية
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Materials
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // حديد، أسمنت، رمل، etc
  unit: text("unit").notNull(), // طن، كيس، متر مكعب، etc
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Material purchases - محسن للمحاسبة الصحيحة
export const materialPurchases = pgTable("material_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }), // ربط بالمورد
  materialId: varchar("material_id").references(() => materials.id, { onDelete: "set null" }), // إعادة إضافة المادة للتوافق
  materialName: text("material_name").notNull(), // اسم المادة بدلاً من materialId
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
  wellId: integer("well_id").references(() => wells.id, { onDelete: "set null" }), // ربط ببئر محدد (اختياري)
  addToInventory: boolean("add_to_inventory").default(false), // إضافة المادة للمخزن/المعدات تلقائياً
  equipmentId: integer("equipment_id"), // ربط بالمعدة المنشأة تلقائياً (إن وجدت)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // إضافة قيد فريد لضمان عدم تكرار الفواتير بشكل غير مقصود
  uniqueInvoice: sql`UNIQUE (project_id, supplier_id, invoice_number, purchase_date)`,
}));

// Supplier payments (مدفوعات الموردين)
export const supplierPayments = pgTable("supplier_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  purchaseId: varchar("purchase_id").references(() => materialPurchases.id, { onDelete: "set null" }), // ربط بفاتورة محددة
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("نقد"), // نقد، حوالة، شيك
  paymentDate: text("payment_date").notNull(), // YYYY-MM-DD format
  referenceNumber: text("reference_number"), // رقم المرجع أو الشيك
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transportation expenses (أجور المواصلات)
export const transportationExpenses = pgTable("transportation_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id").references(() => workers.id, { onDelete: "set null" }), // optional, for worker-specific transport
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("other"), // نقل عمال، توريد مواد، صيانة، بترول، إلخ
  date: text("date").notNull(), // YYYY-MM-DD format
  notes: text("notes"),
  wellId: integer("well_id").references(() => wells.id, { onDelete: "set null" }), // ربط ببئر محدد (اختياري)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Worker balance transfers (حوالات الحساب للأهالي)
export const workerTransfers = pgTable("worker_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transferNumber: text("transfer_number"), // رقم الحوالة
  senderName: text("sender_name"), // اسم المرسل
  recipientName: text("recipient_name").notNull(), // اسم المستلم (الأهل)
  recipientPhone: text("recipient_phone"), // رقم هاتف المستلم
  transferMethod: text("transfer_method").notNull(), // "hawaleh" | "bank" | "cash"
  transferDate: text("transfer_date").notNull(), // YYYY-MM-DD format
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Worker account balances (أرصدة حسابات العمال)
export const workerBalances = pgTable("worker_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  totalEarned: decimal("total_earned", { precision: 15, scale: 2 }).default('0').notNull(), // إجمالي المكتسب
  totalPaid: decimal("total_paid", { precision: 15, scale: 2 }).default('0').notNull(), // إجمالي المدفوع
  totalTransferred: decimal("total_transferred", { precision: 15, scale: 2 }).default('0').notNull(), // إجمالي المحول للأهل
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default('0').notNull(), // الرصيد الحالي
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily Activity Logs (سجلات النشاط اليومي)
export const dailyActivityLogs = pgTable("daily_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  engineerId: varchar("engineer_id").notNull().references(() => users.id),
  logDate: text("log_date").notNull(), // YYYY-MM-DD
  activityTitle: text("activity_title").notNull(),
  description: text("description"),
  progressPercentage: integer("progress_percentage").default(0),
  weatherConditions: text("weather_conditions"), // حقول جديدة تم تحديدها في التفكير التحليلي
  temperature: integer("temperature"),
  humidity: integer("humidity"),
  images: jsonb("images").default([]), // Array of image URLs/metadata
  wellId: integer("well_id").references(() => wells.id, { onDelete: "set null" }), // ربط بالبئر
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDailyActivityLogSchema = createInsertSchema(dailyActivityLogs).omit({ id: true, createdAt: true, updatedAt: true });
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
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Worker types table (أنواع العمال)
export const workerTypes = pgTable("worker_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // اسم نوع العامل
  usageCount: integer("usage_count").default(1).notNull(), // عدد مرات الاستخدام
  lastUsed: timestamp("last_used").defaultNow().notNull(), // آخر استخدام
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Autocomplete data table (بيانات الإكمال التلقائي)
export const autocompleteData = pgTable("autocomplete_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // نوع البيانات: senderNames, recipientNames, etc
  value: text("value").notNull(), // القيمة المحفوظة
  usageCount: integer("usage_count").default(1).notNull(), // عدد مرات الاستخدام
  lastUsed: timestamp("last_used").defaultNow().notNull(), // آخر استخدام
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Worker miscellaneous expenses table (نثريات العمال)
export const workerMiscExpenses = pgTable("worker_misc_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(), // وصف النثريات
  date: text("date").notNull(), // تاريخ النثريات
  notes: text("notes"), // ملاحظات إضافية
  wellId: integer("well_id").references(() => wells.id, { onDelete: "set null" }), // ربط ببئر محدد (اختياري)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Backup Logs Table (سجل النسخ الاحتياطي)
export const backupLogs = pgTable("backup_logs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  size: decimal("size", { precision: 15, scale: 2 }), // بالحجم الميجابايت
  status: text("status").notNull(), // success, failed, in_progress
  destination: text("destination").notNull(), // local, gdrive, telegram, all
  errorMessage: text("error_message"),
  triggeredBy: varchar("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Backup Settings Table (إعدادات النسخ الاحتياطي)
export const backupSettings = pgTable("backup_settings", {
  id: serial("id").primaryKey(),
  autoBackupEnabled: boolean("auto_backup_enabled").default(true).notNull(),
  intervalMinutes: integer("interval_minutes").default(1440).notNull(), // افتراضي يومياً
  telegramNotificationsEnabled: boolean("telegram_notifications_enabled").default(false).notNull(),
  gdriveEnabled: boolean("gdrive_enabled").default(false).notNull(),
  retentionDays: integer("retention_days").default(30).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metricName: varchar("metric_name", { length: 255 }).notNull(),
  metricValue: doublePrecision("metric_value").notNull(),
  metadata: jsonb("metadata"),
});

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  level: varchar("level", { length: 50 }).notNull(), // info, warn, error, fatal
  source: varchar("source", { length: 255 }).notNull(),
  message: text("message").notNull(),
  details: jsonb("details"),
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
  isActive: boolean('is_active').notNull().default(true),
  userId: text('user_id'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Project fund transfers table (ترحيل الأموال بين المشاريع)
export const projectFundTransfers = pgTable("project_fund_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromProjectId: varchar("from_project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  toProjectId: varchar("to_project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"), // وصف الترحيل
  transferReason: text("transfer_reason"), // سبب الترحيل
  transferDate: text("transfer_date").notNull(), // YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Security Policies (سياسات الأمان)
export const securityPolicies = pgTable("security_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull().unique(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  implementedAs: varchar("implemented_as").references(() => securityPolicies.id, { onDelete: "set null" }),
  implementedAt: timestamp("implemented_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Security Policy Implementations (تنفيذ سياسات الأمان)
export const securityPolicyImplementations = pgTable("security_policy_implementations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull().references(() => securityPolicies.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Security Policy Violations (انتهاكات سياسات الأمان)
export const securityPolicyViolations = pgTable("security_policy_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull().references(() => securityPolicies.id, { onDelete: "cascade" }),
  violationId: varchar("violation_id").notNull().unique(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User Project Permissions table (صلاحيات المستخدمين على المشاريع)
export const userProjectPermissions = pgTable("user_project_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  canView: boolean("can_view").default(true).notNull(),
  canAdd: boolean("can_add").default(false).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserProject: sql`UNIQUE (user_id, project_id)`
}));

// Permission Audit Logs table (سجل تغييرات الصلاحيات)
export const permissionAuditLogs = pgTable("permission_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action").notNull(), // assign, unassign, update_permissions
  actorId: varchar("actor_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  oldPermissions: jsonb("old_permissions"), // الصلاحيات القديمة
  newPermissions: jsonb("new_permissions"), // الصلاحيات الجديدة
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema definitions for forms
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertWorkerSchema = createInsertSchema(workers).omit({ id: true, createdAt: true });
export const insertFundTransferSchema = createInsertSchema(fundTransfers).omit({ id: true, createdAt: true }).extend({
  transferDate: dateStringSchema,
  amount: z.preprocess((val) => (val === null || val === undefined) ? "0" : val.toString(), z.string()),
});
export const insertWorkerAttendanceSchema = createInsertSchema(workerAttendance).omit({ id: true, createdAt: true }).extend({
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
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertMaterialPurchaseSchema = createInsertSchema(materialPurchases).omit({ id: true, createdAt: true }).extend({
  purchaseDate: dateStringSchema,
  quantity: z.coerce.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن تكون الكمية 0 أو أكثر"), 
  unit: z.string().min(1, "وحدة القياس مطلوبة").default("كيس"), 
  unitPrice: z.coerce.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون سعر الوحدة 0 أو أكثر").optional().or(z.literal("")), 
  totalAmount: z.coerce.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون إجمالي المبلغ 0 أو أكثر").optional().or(z.literal("")), 
  purchaseType: z.string().default("نقد"), 
  paidAmount: z.coerce.string().default("0").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون المبلغ المدفوع 0 أو أكثر"), 
  remainingAmount: z.coerce.string().default("0").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون المبلغ المتبقي 0 أو أكثر"), 
});
export const insertTransportationExpenseSchema = createInsertSchema(transportationExpenses).omit({ id: true, createdAt: true }).extend({
  date: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});
export const insertWorkerTransferSchema = createInsertSchema(workerTransfers).omit({ id: true, createdAt: true }).extend({
  transferDate: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal في قاعدة البيانات
});
export const insertProjectFundTransferSchema = createInsertSchema(projectFundTransfers).omit({ id: true, createdAt: true }).extend({
  transferDate: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});
export const insertDailyExpenseSummarySchema = createInsertSchema(dailyExpenseSummaries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkerTypeSchema = createInsertSchema(workerTypes).omit({ id: true, createdAt: true, lastUsed: true });
export const insertAutocompleteDataSchema = createInsertSchema(autocompleteData).omit({ id: true, createdAt: true, lastUsed: true });
export const insertWorkerMiscExpenseSchema = createInsertSchema(workerMiscExpenses).omit({ id: true, createdAt: true }).extend({
  date: dateStringSchema,
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});

// 🔐 **User Project Permissions Schema**
export const insertUserProjectPermissionSchema = createInsertSchema(userProjectPermissions).omit({ 
  id: true, 
  assignedAt: true, 
  updatedAt: true 
});

// 📋 **Permission Audit Log Schema**
export const insertPermissionAuditLogSchema = createInsertSchema(permissionAuditLogs).omit({ 
  id: true, 
  createdAt: true 
});

// 🛡️ **Enhanced User Input Validation - حماية أمنية محسّنة**
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  lastLogin: true 
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
  firstName: z.string()
    .min(1, "الاسم الأول مطلوب")
    .max(100, "الاسم الأول طويل جداً")
    .regex(/^[a-zA-Zا-ي0-9\s\-']+$/, "الاسم يحتوي على أحرف غير مسموحة"),
  lastName: z.string()
    .max(100, "اسم العائلة طويل جداً")
    .regex(/^[a-zA-Zا-ي0-9\s\-']*$/, "اسم العائلة يحتوي على أحرف غير مسموحة")
    .optional(),
  role: z.enum(['admin', 'manager', 'user'], {
    errorMap: () => ({ message: "الدور يجب أن يكون admin أو manager أو user" })
  })
});

// 🛡️ **Enhanced Worker Input Validation**
export const enhancedInsertWorkerSchema = createInsertSchema(workers).omit({ 
  id: true, 
  createdAt: true 
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
  createdAt: true
}).extend({
  name: z.string()
    .min(2, "اسم المشروع قصير جداً")
    .max(200, "اسم المشروع طويل جداً")
    .regex(/^[a-zA-Zا-ي0-9\s\-_().]+$/, "اسم المشروع يحتوي على أحرف غير مسموحة"),
  status: z.enum(['active', 'completed', 'paused'], {
    errorMap: () => ({ message: "حالة المشروع يجب أن تكون active أو completed أو paused" })
  }),
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

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true, createdAt: true }).extend({
  amount: z.coerce.string(), // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
});
export const insertPrintSettingsSchema = createInsertSchema(printSettings).omit({ id: true, createdAt: true, updatedAt: true });

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
  createdAt: true,
  updatedAt: true,
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
  margins: jsonb('margins').default({ top: 1, bottom: 1, left: 0.75, right: 0.75 }),

  // تفعيل/إلغاء العناصر
  showHeader: boolean('show_header').notNull().default(true),
  showFooter: boolean('show_footer').notNull().default(true),
  showLogo: boolean('show_logo').notNull().default(true),
  showDate: boolean('show_date').notNull().default(true),
  showPageNumbers: boolean('show_page_numbers').notNull().default(true),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  userId: varchar("user_id").references(() => users.id), // المستخدم الذي قرأ الإشعار (null للعام)
  isRead: boolean("is_read").default(true).notNull(), // حالة القراءة
  readAt: timestamp("read_at").defaultNow().notNull(), // تاريخ القراءة
  deviceInfo: text("device_info"), // معلومات الجهاز للمراجعة
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // قيد فريد لمنع تكرار الإدخال لنفس الإشعار والمستخدم
  uniqueNotificationUser: sql`UNIQUE (notification_id, user_id)`
}));

// Build & Deployment table (جدول عمليات البناء والنشر)
export const buildDeployments = pgTable("build_deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildNumber: integer("build_number").notNull(),
  status: text("status").notNull().default("running"), // pending, running, success, failed
  currentStep: text("current_step").notNull(),
  progress: integer("progress").notNull().default(0),
  version: text("version").notNull(),
  appType: text("app_type").notNull().default("web"), // web, android
  logs: jsonb("logs").notNull().default([]), // Array of {timestamp, message, type}
  steps: jsonb("steps").notNull().default([]), // Array of {name, status, duration}
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  triggeredBy: varchar("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBuildDeploymentSchema = createInsertSchema(buildDeployments).omit({
  id: true,
  createdAt: true,
});

export type BuildDeployment = typeof buildDeployments.$inferSelect;
export type InsertBuildDeployment = z.infer<typeof insertBuildDeploymentSchema>;



// Insert schema for notification read states
export const insertNotificationReadStateSchema = createInsertSchema(notificationReadStates).omit({
  id: true,
  createdAt: true,
});
export type InsertNotificationReadState = z.infer<typeof insertNotificationReadStateSchema>;
export type NotificationReadState = typeof notificationReadStates.$inferSelect;


// ==================== جداول الوكيل الذكي AI Agent ====================

// جلسات المحادثات
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").default("محادثة جديدة"),
  isActive: boolean("is_active").default(true).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  messagesCount: integer("messages_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// رسائل المحادثات
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiChatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  model: text("model"), // gpt-4o, gemini-1.5-flash
  provider: text("provider"), // openai, gemini
  tokensUsed: integer("tokens_used"),
  action: text("action"), // نوع الأمر المنفذ
  actionData: jsonb("action_data"), // بيانات الأمر
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// إحصائيات استخدام النماذج
export const aiUsageStats = pgTable("ai_usage_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  provider: text("provider").notNull(), // openai, gemini
  model: text("model").notNull(),
  requestsCount: integer("requests_count").default(0).notNull(),
  tokensUsed: integer("tokens_used").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schemas for AI tables
export const insertAiChatSessionSchema = createInsertSchema(aiChatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAiUsageStatsSchema = createInsertSchema(aiUsageStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  wellId: integer("well_id").notNull().references(() => wells.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 50 }).notNull(), // نجارة، حفر، صبة، تركيب_ألواح، تركيب_مضخة، تمديدات، اختبار
  description: text("description"), // استرجاع الوصف
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }), // استرجاع التكلفة التقديرية
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }), // استرجاع التكلفة الفعلية
  taskOrder: integer("task_order").notNull(), // ترتيب المهمة
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  assignedWorkerId: varchar("assigned_worker_id").references(() => workers.id, { onDelete: "set null" }),
  startDate: date("start_date"),
  completionDate: date("completion_date"),
  completedBy: varchar("completed_by").references(() => users.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }), // استرجاع المنشئ
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. جدول محاسبة المهام (well_task_accounts)
export const wellTaskAccounts = pgTable("well_task_accounts", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().unique().references(() => wellTasks.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  accountedBy: varchar("accounted_by").notNull().references(() => users.id),
  accountedAt: timestamp("accounted_at").defaultNow().notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
});

// 5. جدول مصاريف البئر (well_expenses)
export const wellExpenses = pgTable("well_expenses", {
  id: serial("id").primaryKey(),
  wellId: integer("well_id").notNull().references(() => wells.id, { onDelete: "cascade" }),
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
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notes: text("notes"),
});

// 6. جدول سجل تدقيق الآبار (well_audit_logs)
export const wellAuditLogs = pgTable("well_audit_logs", {
  id: serial("id").primaryKey(),
  wellId: integer("well_id").references(() => wells.id, { onDelete: "set null" }),
  taskId: integer("task_id").references(() => wellTasks.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, status_change, account
  entityType: varchar("entity_type", { length: 50 }).notNull(), // well, task, expense, account
  entityId: integer("entity_id").notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  userId: varchar("user_id").notNull().references(() => users.id),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. جدول تصنيفات المواد (material_categories)
export const materialCategories = pgTable("material_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // operational, consumable
  unit: varchar("unit", { length: 20 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), // استخدام الاسم الموحد
});

// Insert Schemas for Wells Tracking System
export const insertProjectTypeSchema = createInsertSchema(projectTypes).omit({
  id: true,
  createdAt: true,
});

export const insertWellSchema = createInsertSchema(wells).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWellTaskSchema = createInsertSchema(wellTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWellTaskAccountSchema = createInsertSchema(wellTaskAccounts).omit({
  id: true,
  accountedAt: true,
});

export const insertWellExpenseSchema = createInsertSchema(wellExpenses).omit({
  id: true,
  createdAt: true,
});

export const insertWellAuditLogSchema = createInsertSchema(wellAuditLogs).omit({
  id: true,
  createdAt: true,
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
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  code: text("code"),
  name: text("name").notNull(),
  sku: text("sku"),
  type: text("type"),
  unit: text("unit").default("قطعة"),
  quantity: integer("quantity").default(1).notNull(),
  status: text("status").default("available"),
  condition: text("condition").default("excellent"),
  description: text("description"),
  purchaseDate: text("purchase_date"),
  purchasePrice: text("purchase_price"),
  projectId: varchar("project_id").references(() => projects.id),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const equipmentMovements = pgTable("equipment_movements", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => equipment.id),
  fromProjectId: varchar("from_project_id").references(() => projects.id),
  toProjectId: varchar("to_project_id").references(() => projects.id),
  quantity: integer("quantity").default(1).notNull(),
  movementDate: timestamp("movement_date").defaultNow(),
  reason: text("reason"),
  performedBy: text("performed_by"),
  notes: text("notes"),
});

export type Equipment = typeof equipment.$inferSelect;
export const insertEquipmentSchema = createInsertSchema(equipment).omit({ id: true, createdAt: true });
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;

export type EquipmentMovement = typeof equipmentMovements.$inferSelect;
export const insertEquipmentMovementSchema = createInsertSchema(equipmentMovements).omit({ id: true });
export type InsertEquipmentMovement = z.infer<typeof insertEquipmentMovementSchema>;

// ========================
// نظام دفتر الأستاذ والقيد المزدوج (Double-Entry Ledger System)
// يتبع المعايير المحاسبية العالمية: GAAP/IFRS
// ========================

export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  category: text("category").notNull(), // asset, liability, equity, revenue, expense
  normalBalance: text("normal_balance").notNull(), // debit, credit
  parentId: integer("parent_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryNumber: serial("entry_number"),
  projectId: varchar("project_id").references(() => projects.id),
  entryDate: text("entry_date").notNull(), // YYYY-MM-DD
  description: text("description").notNull(),
  sourceTable: text("source_table").notNull(), // fund_transfers, material_purchases, etc
  sourceId: text("source_id").notNull(),
  entryType: text("entry_type").notNull(), // original, reversal, adjustment
  reversalOfId: uuid("reversal_of_id"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("posted"), // draft, posted, reversed
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ...syncFields,
});

export const journalLines = pgTable("journal_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id).notNull(),
  accountCode: varchar("account_code", { length: 20 }).notNull(),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialAuditLog = pgTable("financial_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: varchar("project_id").references(() => projects.id),
  action: text("action").notNull(), // create, update, delete, reverse
  entityType: text("entity_type").notNull(), // fund_transfer, material_purchase, etc
  entityId: text("entity_id").notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  changedFields: jsonb("changed_fields"),
  userId: varchar("user_id").references(() => users.id),
  userEmail: text("user_email"),
  reason: text("reason"),
  ipAddress: inet("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reconciliationRecords = pgTable("reconciliation_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  reconciliationDate: text("reconciliation_date").notNull(), // YYYY-MM-DD
  ledgerBalance: decimal("ledger_balance", { precision: 15, scale: 2 }).notNull(),
  computedBalance: decimal("computed_balance", { precision: 15, scale: 2 }).notNull(),
  discrepancy: decimal("discrepancy", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, matched, discrepancy, resolved
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const summaryInvalidations = pgTable("summary_invalidations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  invalidatedFrom: text("invalidated_from").notNull(), // YYYY-MM-DD
  reason: text("reason").notNull(),
  sourceTable: text("source_table"),
  sourceId: text("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccountTypeSchema = createInsertSchema(accountTypes).omit({ id: true, createdAt: true });
export type AccountType = typeof accountTypes.$inferSelect;
export type InsertAccountType = z.infer<typeof insertAccountTypeSchema>;

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, entryNumber: true, createdAt: true });
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export const insertJournalLineSchema = createInsertSchema(journalLines).omit({ id: true, createdAt: true });
export type JournalLine = typeof journalLines.$inferSelect;
export type InsertJournalLine = z.infer<typeof insertJournalLineSchema>;

export const insertFinancialAuditLogSchema = createInsertSchema(financialAuditLog).omit({ id: true, createdAt: true });
export type FinancialAuditLog = typeof financialAuditLog.$inferSelect;
export type InsertFinancialAuditLog = z.infer<typeof insertFinancialAuditLogSchema>;

export const insertReconciliationRecordSchema = createInsertSchema(reconciliationRecords).omit({ id: true, createdAt: true });
export type ReconciliationRecord = typeof reconciliationRecords.$inferSelect;
export type InsertReconciliationRecord = z.infer<typeof insertReconciliationRecordSchema>;

export const insertSummaryInvalidationSchema = createInsertSchema(summaryInvalidations).omit({ id: true, createdAt: true });
export type SummaryInvalidation = typeof summaryInvalidations.$inferSelect;
export type InsertSummaryInvalidation = z.infer<typeof insertSummaryInvalidationSchema>;

export const syncAuditLogs = pgTable("sync_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
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
  projectId: varchar("project_id").references(() => projects.id),
  projectName: text("project_name"),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSyncAuditLogSchema = createInsertSchema(syncAuditLogs).omit({ id: true, createdAt: true });
export type SyncAuditLog = typeof syncAuditLogs.$inferSelect;
export type InsertSyncAuditLog = z.infer<typeof insertSyncAuditLogSchema>;

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code").notNull(),
  responseBody: jsonb("response_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertIdempotencyKeySchema = createInsertSchema(idempotencyKeys).omit({ id: true, createdAt: true });
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type InsertIdempotencyKey = z.infer<typeof insertIdempotencyKeySchema>;

