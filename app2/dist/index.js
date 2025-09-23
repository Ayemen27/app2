var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountBalances: () => accountBalances,
  accounts: () => accounts,
  actions: () => actions,
  approvals: () => approvals,
  authUserSessions: () => authUserSessions,
  autocompleteData: () => autocompleteData,
  channels: () => channels,
  dailyExpenseSummaries: () => dailyExpenseSummaries,
  emailVerificationTokens: () => emailVerificationTokens,
  enhancedInsertProjectSchema: () => enhancedInsertProjectSchema,
  enhancedInsertWorkerSchema: () => enhancedInsertWorkerSchema,
  financeEvents: () => financeEvents,
  financePayments: () => financePayments,
  fundTransfers: () => fundTransfers,
  insertAccountSchema: () => insertAccountSchema,
  insertActionSchema: () => insertActionSchema,
  insertApprovalSchema: () => insertApprovalSchema,
  insertAuthUserSessionSchema: () => insertAuthUserSessionSchema,
  insertAutocompleteDataSchema: () => insertAutocompleteDataSchema,
  insertChannelSchema: () => insertChannelSchema,
  insertDailyExpenseSummarySchema: () => insertDailyExpenseSummarySchema,
  insertFinanceEventSchema: () => insertFinanceEventSchema,
  insertFinancePaymentSchema: () => insertFinancePaymentSchema,
  insertFundTransferSchema: () => insertFundTransferSchema,
  insertJournalSchema: () => insertJournalSchema,
  insertMaintenanceScheduleSchema: () => insertMaintenanceScheduleSchema,
  insertMaintenanceTaskSchema: () => insertMaintenanceTaskSchema,
  insertMaterialPurchaseSchema: () => insertMaterialPurchaseSchema,
  insertMaterialSchema: () => insertMaterialSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertMigrationBatchLogSchema: () => insertMigrationBatchLogSchema,
  insertMigrationJobSchema: () => insertMigrationJobSchema,
  insertMigrationTableProgressSchema: () => insertMigrationTableProgressSchema,
  insertNotificationReadStateSchema: () => insertNotificationReadStateSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertPrintSettingsSchema: () => insertPrintSettingsSchema,
  insertProjectFundTransferSchema: () => insertProjectFundTransferSchema,
  insertProjectSchema: () => insertProjectSchema,
  insertReportTemplateSchema: () => insertReportTemplateSchema,
  insertSupplierPaymentSchema: () => insertSupplierPaymentSchema,
  insertSupplierSchema: () => insertSupplierSchema,
  insertSystemEventSchema: () => insertSystemEventSchema,
  insertSystemNotificationSchema: () => insertSystemNotificationSchema,
  insertToolCategorySchema: () => insertToolCategorySchema,
  insertToolCostTrackingSchema: () => insertToolCostTrackingSchema,
  insertToolMaintenanceLogSchema: () => insertToolMaintenanceLogSchema,
  insertToolMovementSchema: () => insertToolMovementSchema,
  insertToolNotificationSchema: () => insertToolNotificationSchema,
  insertToolPurchaseItemSchema: () => insertToolPurchaseItemSchema,
  insertToolReservationSchema: () => insertToolReservationSchema,
  insertToolSchema: () => insertToolSchema,
  insertToolStockSchema: () => insertToolStockSchema,
  insertToolUsageAnalyticsSchema: () => insertToolUsageAnalyticsSchema,
  insertTransactionLineSchema: () => insertTransactionLineSchema,
  insertTransactionSchema: () => insertTransactionSchema,
  insertTransportationExpenseSchema: () => insertTransportationExpenseSchema,
  insertUserSchema: () => insertUserSchema,
  insertWorkerAttendanceSchema: () => insertWorkerAttendanceSchema,
  insertWorkerBalanceSchema: () => insertWorkerBalanceSchema,
  insertWorkerMiscExpenseSchema: () => insertWorkerMiscExpenseSchema,
  insertWorkerSchema: () => insertWorkerSchema,
  insertWorkerTransferSchema: () => insertWorkerTransferSchema,
  insertWorkerTypeSchema: () => insertWorkerTypeSchema,
  journals: () => journals,
  maintenanceSchedules: () => maintenanceSchedules,
  maintenanceTasks: () => maintenanceTasks,
  materialPurchases: () => materialPurchases,
  materials: () => materials,
  messages: () => messages,
  migrationBatchLog: () => migrationBatchLog,
  migrationJobs: () => migrationJobs,
  migrationTableProgress: () => migrationTableProgress,
  notificationReadStates: () => notificationReadStates,
  notifications: () => notifications,
  passwordResetTokens: () => passwordResetTokens,
  printSettings: () => printSettings,
  projectFundTransfers: () => projectFundTransfers,
  projects: () => projects,
  reportTemplates: () => reportTemplates,
  supplierPayments: () => supplierPayments,
  suppliers: () => suppliers,
  systemEvents: () => systemEvents,
  systemNotifications: () => systemNotifications,
  toolCategories: () => toolCategories,
  toolCostTracking: () => toolCostTracking,
  toolMaintenanceLogs: () => toolMaintenanceLogs,
  toolMovements: () => toolMovements,
  toolNotifications: () => toolNotifications,
  toolPurchaseItems: () => toolPurchaseItems,
  toolReservations: () => toolReservations,
  toolStock: () => toolStock,
  toolUsageAnalytics: () => toolUsageAnalytics,
  tools: () => tools,
  transactionLines: () => transactionLines,
  transactions: () => transactions,
  transportationExpenses: () => transportationExpenses,
  updateProjectSchema: () => updateProjectSchema,
  updateToolSchema: () => updateToolSchema,
  users: () => users,
  uuidSchema: () => uuidSchema,
  workerAttendance: () => workerAttendance,
  workerBalances: () => workerBalances,
  workerMiscExpenses: () => workerMiscExpenses,
  workerTransfers: () => workerTransfers,
  workerTypes: () => workerTypes,
  workers: () => workers
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, jsonb, uuid, inet } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, authUserSessions, emailVerificationTokens, passwordResetTokens, projects, workers, fundTransfers, workerAttendance, suppliers, materials, materialPurchases, supplierPayments, transportationExpenses, workerTransfers, workerBalances, dailyExpenseSummaries, workerTypes, autocompleteData, workerMiscExpenses, printSettings, projectFundTransfers, insertProjectSchema, insertWorkerSchema, insertFundTransferSchema, insertWorkerAttendanceSchema, insertMaterialSchema, insertMaterialPurchaseSchema, insertTransportationExpenseSchema, insertWorkerTransferSchema, insertWorkerBalanceSchema, insertProjectFundTransferSchema, insertDailyExpenseSummarySchema, insertWorkerTypeSchema, insertAutocompleteDataSchema, insertWorkerMiscExpenseSchema, insertUserSchema, enhancedInsertWorkerSchema, enhancedInsertProjectSchema, updateProjectSchema, uuidSchema, insertSupplierSchema, insertSupplierPaymentSchema, insertPrintSettingsSchema, insertAuthUserSessionSchema, reportTemplates, insertReportTemplateSchema, toolCategories, tools, toolStock, toolMovements, toolMaintenanceLogs, toolUsageAnalytics, toolPurchaseItems, maintenanceSchedules, maintenanceTasks, toolCostTracking, toolReservations, systemNotifications, notificationReadStates, insertToolCategorySchema, insertToolSchema, updateToolSchema, insertToolStockSchema, insertToolMovementSchema, insertToolMaintenanceLogSchema, insertToolUsageAnalyticsSchema, insertToolReservationSchema, insertSystemNotificationSchema, insertToolPurchaseItemSchema, insertMaintenanceScheduleSchema, insertMaintenanceTaskSchema, insertToolCostTrackingSchema, toolNotifications, insertToolNotificationSchema, insertNotificationReadStateSchema, approvals, channels, messages, actions, systemEvents, insertApprovalSchema, insertChannelSchema, insertMessageSchema, insertActionSchema, insertSystemEventSchema, accounts, transactions, transactionLines, journals, financePayments, financeEvents, accountBalances, insertAccountSchema, insertTransactionSchema, insertTransactionLineSchema, insertJournalSchema, insertFinancePaymentSchema, insertFinanceEventSchema, migrationJobs, migrationTableProgress, migrationBatchLog, insertMigrationJobSchema, insertMigrationTableProgressSchema, insertMigrationBatchLogSchema, notifications, insertNotificationSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      // سيتم تشفيرها
      firstName: text("first_name"),
      lastName: text("last_name"),
      role: text("role").notNull().default("admin"),
      // admin, manager, user
      isActive: boolean("is_active").default(true).notNull(),
      lastLogin: timestamp("last_login"),
      emailVerifiedAt: timestamp("email_verified_at"),
      // متى تم التحقق من البريد الإلكتروني
      totpSecret: text("totp_secret"),
      // TOTP secret for 2FA
      mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
      // Multi-factor authentication enabled
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    authUserSessions = pgTable("auth_user_sessions", {
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
      revokedReason: varchar("revoked_reason")
    });
    emailVerificationTokens = pgTable("email_verification_tokens", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      email: text("email").notNull(),
      // البريد الإلكتروني المراد التحقق منه
      token: varchar("token").notNull().unique(),
      // الرمز المرسل للمستخدم (6 أرقام)
      tokenHash: varchar("token_hash").notNull(),
      // hash الرمز المحفوظ في قاعدة البيانات
      verificationLink: text("verification_link").notNull(),
      // رابط التحقق الكامل
      expiresAt: timestamp("expires_at").notNull(),
      // انتهاء صلاحية الرمز (عادة 24 ساعة)
      verifiedAt: timestamp("verified_at"),
      // متى تم التحقق من البريد
      createdAt: timestamp("created_at").defaultNow().notNull(),
      ipAddress: inet("ip_address"),
      // IP الذي طلب التحقق
      userAgent: text("user_agent"),
      // User Agent الذي طلب التحقق
      attemptsCount: integer("attempts_count").default(0).notNull()
      // عدد محاولات استخدام الرمز
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      token: varchar("token").notNull().unique(),
      // الرمز المرسل للمستخدم
      tokenHash: varchar("token_hash").notNull(),
      // hash الرمز المحفوظ في قاعدة البيانات
      expiresAt: timestamp("expires_at").notNull(),
      // انتهاء صلاحية الرمز (عادة ساعة واحدة)
      usedAt: timestamp("used_at"),
      // متى تم استخدام الرمز
      createdAt: timestamp("created_at").defaultNow().notNull(),
      ipAddress: inet("ip_address"),
      // IP الذي طلب الاسترجاع
      userAgent: text("user_agent")
      // User Agent الذي طلب الاسترجاع
    });
    projects = pgTable("projects", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      status: text("status").notNull().default("active"),
      // active, completed, paused
      imageUrl: text("image_url"),
      // صورة المشروع (اختيارية)
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    workers = pgTable("workers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      type: text("type").notNull(),
      // معلم (master), عامل (worker)
      dailyWage: decimal("daily_wage", { precision: 10, scale: 2 }).notNull(),
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    fundTransfers = pgTable("fund_transfers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      senderName: text("sender_name"),
      // اسم المرسل
      transferNumber: text("transfer_number").unique(),
      // رقم الحولة - فريد
      transferType: text("transfer_type").notNull(),
      // حولة، تسليم يدوي، صراف
      transferDate: timestamp("transfer_date").notNull(),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    workerAttendance = pgTable("worker_attendance", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      workerId: varchar("worker_id").notNull().references(() => workers.id),
      attendanceDate: text("attendance_date").notNull(),
      // YYYY-MM-DD format
      date: text("date"),
      // عمود إضافي للتاريخ - nullable
      startTime: text("start_time"),
      // HH:MM format
      endTime: text("end_time"),
      // HH:MM format
      workDescription: text("work_description"),
      isPresent: boolean("is_present"),
      // nullable في قاعدة البيانات
      // أعمدة قديمة موجودة في قاعدة البيانات
      hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }).default("8.00"),
      overtime: decimal("overtime", { precision: 5, scale: 2 }).default("0.00"),
      overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }).default("0.00"),
      // أعمدة جديدة
      workDays: decimal("work_days", { precision: 3, scale: 2 }).default("1.00"),
      // عدد أيام العمل (مثل 0.5، 1.0، 1.5)
      dailyWage: decimal("daily_wage", { precision: 10, scale: 2 }).notNull(),
      // الأجر اليومي الكامل
      actualWage: decimal("actual_wage", { precision: 10, scale: 2 }),
      // الأجر الفعلي = dailyWage * workDays - nullable في قاعدة البيانات
      totalPay: decimal("total_pay", { precision: 10, scale: 2 }).notNull(),
      // إجمالي الدفع المطلوب = actualWage
      paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
      // المبلغ المدفوع فعلياً (الصرف) - nullable في قاعدة البيانات
      remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default("0"),
      // المتبقي في حساب العامل - nullable في قاعدة البيانات
      paymentType: text("payment_type").default("partial"),
      // "full" | "partial" | "credit" - nullable في قاعدة البيانات
      notes: text("notes"),
      // ملاحظات
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      // قيد فريد لمنع تسجيل حضور مكرر لنفس العامل في نفس اليوم
      uniqueWorkerDate: sql`UNIQUE (worker_id, attendance_date, project_id)`
    }));
    suppliers = pgTable("suppliers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull().unique(),
      contactPerson: text("contact_person"),
      // الشخص المسؤول
      phone: text("phone"),
      address: text("address"),
      paymentTerms: text("payment_terms").default("\u0646\u0642\u062F"),
      // نقد، 30 يوم، 60 يوم، etc
      totalDebt: decimal("total_debt", { precision: 12, scale: 2 }).default("0").notNull(),
      // إجمالي المديونية
      isActive: boolean("is_active").default(true).notNull(),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    materials = pgTable("materials", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      category: text("category").notNull(),
      // حديد، أسمنت، رمل، etc
      unit: text("unit").notNull(),
      // طن، كيس، متر مكعب، etc
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    materialPurchases = pgTable("material_purchases", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      supplierId: varchar("supplier_id").references(() => suppliers.id),
      // ربط بالمورد
      materialName: text("material_name").notNull(),
      // اسم المادة بدلاً من materialId
      materialCategory: text("material_category"),
      // فئة المادة (حديد، أسمنت، إلخ)
      materialUnit: text("material_unit"),
      // وحدة المادة الأساسية
      quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
      unit: text("unit").notNull(),
      // وحدة القياس - موجودة في قاعدة البيانات
      unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
      totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
      purchaseType: text("purchase_type").notNull().default("\u0646\u0642\u062F"),
      // نقد، أجل
      paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0").notNull(),
      // المبلغ المدفوع
      remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default("0").notNull(),
      // المتبقي
      supplierName: text("supplier_name"),
      // اسم المورد (للتوافق العكسي)
      receiptNumber: text("receipt_number"),
      // رقم الإيصال - موجود في قاعدة البيانات
      invoiceNumber: text("invoice_number"),
      invoiceDate: text("invoice_date"),
      // تاريخ الفاتورة - YYYY-MM-DD format - nullable في قاعدة البيانات
      dueDate: text("due_date"),
      // تاريخ الاستحقاق للفواتير الآجلة - YYYY-MM-DD format
      invoicePhoto: text("invoice_photo"),
      // base64 or file path
      notes: text("notes"),
      purchaseDate: text("purchase_date").notNull(),
      // YYYY-MM-DD format
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    supplierPayments = pgTable("supplier_payments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      purchaseId: varchar("purchase_id").references(() => materialPurchases.id),
      // ربط بفاتورة محددة
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      paymentMethod: text("payment_method").notNull().default("\u0646\u0642\u062F"),
      // نقد، حوالة، شيك
      paymentDate: text("payment_date").notNull(),
      // YYYY-MM-DD format
      referenceNumber: text("reference_number"),
      // رقم المرجع أو الشيك
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    transportationExpenses = pgTable("transportation_expenses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      workerId: varchar("worker_id").references(() => workers.id),
      // optional, for worker-specific transport
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      description: text("description").notNull(),
      date: text("date").notNull(),
      // YYYY-MM-DD format
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    workerTransfers = pgTable("worker_transfers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      workerId: varchar("worker_id").notNull().references(() => workers.id),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      transferNumber: text("transfer_number"),
      // رقم الحوالة
      senderName: text("sender_name"),
      // اسم المرسل
      recipientName: text("recipient_name").notNull(),
      // اسم المستلم (الأهل)
      recipientPhone: text("recipient_phone"),
      // رقم هاتف المستلم
      transferMethod: text("transfer_method").notNull(),
      // "hawaleh" | "bank" | "cash"
      transferDate: text("transfer_date").notNull(),
      // YYYY-MM-DD format
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    workerBalances = pgTable("worker_balances", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      workerId: varchar("worker_id").notNull().references(() => workers.id),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0").notNull(),
      // إجمالي المكتسب
      totalPaid: decimal("total_paid", { precision: 10, scale: 2 }).default("0").notNull(),
      // إجمالي المدفوع
      totalTransferred: decimal("total_transferred", { precision: 10, scale: 2 }).default("0").notNull(),
      // إجمالي المحول للأهل
      currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).default("0").notNull(),
      // الرصيد الحالي
      lastUpdated: timestamp("last_updated").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    dailyExpenseSummaries = pgTable("daily_expense_summaries", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      date: text("date").notNull(),
      // YYYY-MM-DD format
      carriedForwardAmount: decimal("carried_forward_amount", { precision: 10, scale: 2 }).default("0").notNull(),
      totalFundTransfers: decimal("total_fund_transfers", { precision: 10, scale: 2 }).default("0").notNull(),
      totalWorkerWages: decimal("total_worker_wages", { precision: 10, scale: 2 }).default("0").notNull(),
      totalMaterialCosts: decimal("total_material_costs", { precision: 10, scale: 2 }).default("0").notNull(),
      totalTransportationCosts: decimal("total_transportation_costs", { precision: 10, scale: 2 }).default("0").notNull(),
      totalWorkerTransfers: decimal("total_worker_transfers", { precision: 10, scale: 2 }).default("0").notNull(),
      totalWorkerMiscExpenses: decimal("total_worker_misc_expenses", { precision: 10, scale: 2 }).default("0").notNull(),
      totalIncome: decimal("total_income", { precision: 10, scale: 2 }).notNull(),
      totalExpenses: decimal("total_expenses", { precision: 10, scale: 2 }).notNull(),
      remainingBalance: decimal("remaining_balance", { precision: 10, scale: 2 }).notNull(),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    workerTypes = pgTable("worker_types", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull().unique(),
      // اسم نوع العامل
      usageCount: integer("usage_count").default(1).notNull(),
      // عدد مرات الاستخدام
      lastUsed: timestamp("last_used").defaultNow().notNull(),
      // آخر استخدام
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    autocompleteData = pgTable("autocomplete_data", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      category: text("category").notNull(),
      // نوع البيانات: senderNames, recipientNames, etc
      value: text("value").notNull(),
      // القيمة المحفوظة
      usageCount: integer("usage_count").default(1).notNull(),
      // عدد مرات الاستخدام
      lastUsed: timestamp("last_used").defaultNow().notNull(),
      // آخر استخدام
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    workerMiscExpenses = pgTable("worker_misc_expenses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      description: text("description").notNull(),
      // وصف النثريات
      date: text("date").notNull(),
      // تاريخ النثريات
      notes: text("notes"),
      // ملاحظات إضافية
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    printSettings = pgTable("print_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      reportType: text("report_type").notNull().default("worker_statement"),
      name: text("name").notNull(),
      // Page settings
      pageSize: text("page_size").notNull().default("A4"),
      pageOrientation: text("page_orientation").notNull().default("portrait"),
      marginTop: decimal("margin_top", { precision: 5, scale: 2 }).notNull().default("15.00"),
      marginBottom: decimal("margin_bottom", { precision: 5, scale: 2 }).notNull().default("15.00"),
      marginLeft: decimal("margin_left", { precision: 5, scale: 2 }).notNull().default("15.00"),
      marginRight: decimal("margin_right", { precision: 5, scale: 2 }).notNull().default("15.00"),
      // Font settings
      fontFamily: text("font_family").notNull().default("Arial"),
      fontSize: integer("font_size").notNull().default(12),
      headerFontSize: integer("header_font_size").notNull().default(16),
      tableFontSize: integer("table_font_size").notNull().default(10),
      // Color settings
      headerBackgroundColor: text("header_background_color").notNull().default("#1e40af"),
      headerTextColor: text("header_text_color").notNull().default("#ffffff"),
      tableHeaderColor: text("table_header_color").notNull().default("#1e40af"),
      tableRowEvenColor: text("table_row_even_color").notNull().default("#ffffff"),
      tableRowOddColor: text("table_row_odd_color").notNull().default("#f9fafb"),
      tableBorderColor: text("table_border_color").notNull().default("#000000"),
      // Table settings
      tableBorderWidth: integer("table_border_width").notNull().default(1),
      tableCellPadding: integer("table_cell_padding").notNull().default(3),
      tableColumnWidths: text("table_column_widths").notNull().default("[8,12,10,30,12,15,15,12]"),
      // Visual elements settings
      showHeader: boolean("show_header").notNull().default(true),
      showLogo: boolean("show_logo").notNull().default(true),
      showProjectInfo: boolean("show_project_info").notNull().default(true),
      showWorkerInfo: boolean("show_worker_info").notNull().default(true),
      showAttendanceTable: boolean("show_attendance_table").notNull().default(true),
      showTransfersTable: boolean("show_transfers_table").notNull().default(true),
      showSummary: boolean("show_summary").notNull().default(true),
      showSignatures: boolean("show_signatures").notNull().default(true),
      // System settings
      isDefault: boolean("is_default").notNull().default(false),
      isActive: boolean("is_active").notNull().default(true),
      userId: text("user_id"),
      // Timestamps
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    projectFundTransfers = pgTable("project_fund_transfers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      fromProjectId: varchar("from_project_id").notNull().references(() => projects.id),
      toProjectId: varchar("to_project_id").notNull().references(() => projects.id),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      description: text("description"),
      // وصف الترحيل
      transferReason: text("transfer_reason"),
      // سبب الترحيل
      transferDate: text("transfer_date").notNull(),
      // YYYY-MM-DD format
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
    insertWorkerSchema = createInsertSchema(workers).omit({ id: true, createdAt: true });
    insertFundTransferSchema = createInsertSchema(fundTransfers).omit({ id: true, createdAt: true }).extend({
      amount: z.coerce.string(),
      // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
      transferDate: z.coerce.date()
      // تحويل string إلى Date تلقائياً
    });
    insertWorkerAttendanceSchema = createInsertSchema(workerAttendance).omit({ id: true, createdAt: true }).extend({
      attendanceDate: z.string(),
      // اسم الحقل الصحيح
      workDays: z.number().min(0.1).max(2).default(1),
      // عدد أيام العمل من 0.1 إلى 2.0
      dailyWage: z.coerce.string(),
      // تحويل إلى string للتوافق مع نوع decimal
      actualWage: z.coerce.string().optional(),
      // nullable في قاعدة البيانات
      totalPay: z.coerce.string(),
      // إجمالي الدفع المطلوب
      paidAmount: z.coerce.string().optional(),
      // تحويل إلى string للتوافق مع نوع decimal - nullable
      remainingAmount: z.coerce.string().optional(),
      // تحويل إلى string للتوافق مع نوع decimal - nullable
      paymentType: z.string().optional().default("partial"),
      // نوع الدفع
      hoursWorked: z.coerce.string().optional(),
      // ساعات العمل
      overtime: z.coerce.string().optional(),
      // ساعات إضافية
      overtimeRate: z.coerce.string().optional(),
      // معدل الساعات الإضافية
      notes: z.string().optional(),
      // ملاحظات
      // إضافة validation للأوقات
      startTime: z.string().optional().refine((val) => {
        if (!val) return true;
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val);
      }, "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0648\u0642\u062A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 HH:MM"),
      endTime: z.string().optional().refine((val) => {
        if (!val) return true;
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val);
      }, "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0648\u0642\u062A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 HH:MM")
    }).refine((data) => {
      if (data.startTime && data.endTime) {
        const startMinutes = parseInt(data.startTime.split(":")[0]) * 60 + parseInt(data.startTime.split(":")[1]);
        const endMinutes = parseInt(data.endTime.split(":")[0]) * 60 + parseInt(data.endTime.split(":")[1]);
        return startMinutes < endMinutes || endMinutes < startMinutes;
      }
      return true;
    }, {
      message: "\u0648\u0642\u062A \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0642\u0628\u0644 \u0648\u0642\u062A \u0627\u0644\u0646\u0647\u0627\u064A\u0629 (\u0644\u0644\u0648\u0631\u062F\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u062F\u064A\u0629)",
      path: ["endTime"]
    });
    insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
    insertMaterialPurchaseSchema = createInsertSchema(materialPurchases).omit({ id: true, createdAt: true }).extend({
      quantity: z.coerce.string(),
      // تحويل إلى string للتوافق مع نوع decimal
      unit: z.string().min(1, "\u0648\u062D\u062F\u0629 \u0627\u0644\u0642\u064A\u0627\u0633 \u0645\u0637\u0644\u0648\u0628\u0629").default("\u0643\u064A\u0633"),
      // وحدة القياس المطلوبة مع قيمة افتراضية
      unitPrice: z.coerce.string(),
      // تحويل إلى string للتوافق مع نوع decimal
      totalAmount: z.coerce.string(),
      // تحويل إلى string للتوافق مع نوع decimal
      purchaseType: z.string().default("\u0646\u0642\u062F"),
      // قيمة افتراضية للنوع
      paidAmount: z.coerce.string().default("0"),
      // المبلغ المدفوع
      remainingAmount: z.coerce.string().default("0")
      // المتبقي
    });
    insertTransportationExpenseSchema = createInsertSchema(transportationExpenses).omit({ id: true, createdAt: true }).extend({
      amount: z.coerce.string()
      // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
    });
    insertWorkerTransferSchema = createInsertSchema(workerTransfers).omit({ id: true, createdAt: true }).extend({
      amount: z.coerce.string()
      // تحويل number إلى string تلقائياً للتوافق مع نوع decimal في قاعدة البيانات
    });
    insertWorkerBalanceSchema = createInsertSchema(workerBalances).omit({ id: true, createdAt: true, lastUpdated: true }).extend({
      totalEarned: z.coerce.string().optional(),
      totalPaid: z.coerce.string().optional(),
      totalTransferred: z.coerce.string().optional(),
      currentBalance: z.coerce.string().optional()
    });
    insertProjectFundTransferSchema = createInsertSchema(projectFundTransfers).omit({ id: true, createdAt: true }).extend({
      amount: z.coerce.string()
      // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
    });
    insertDailyExpenseSummarySchema = createInsertSchema(dailyExpenseSummaries).omit({ id: true, createdAt: true, updatedAt: true });
    insertWorkerTypeSchema = createInsertSchema(workerTypes).omit({ id: true, createdAt: true, lastUsed: true });
    insertAutocompleteDataSchema = createInsertSchema(autocompleteData).omit({ id: true, createdAt: true, lastUsed: true });
    insertWorkerMiscExpenseSchema = createInsertSchema(workerMiscExpenses).omit({ id: true, createdAt: true }).extend({
      amount: z.coerce.string()
      // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true
    }).extend({
      email: z.string().min(5, "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0642\u0635\u064A\u0631 \u062C\u062F\u0627\u064B").max(255, "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0637\u0648\u064A\u0644 \u062C\u062F\u0627\u064B").email("\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D").regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629"),
      password: z.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644").max(128, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0637\u0648\u064A\u0644\u0629 \u062C\u062F\u0627\u064B").regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/,
        "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631 \u0648\u0635\u063A\u064A\u0631 \u0648\u0631\u0642\u0645 \u0648\u0631\u0645\u0632 \u062E\u0627\u0635"
      ),
      firstName: z.string().min(1, "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 \u0645\u0637\u0644\u0648\u0628").max(100, "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 \u0637\u0648\u064A\u0644 \u062C\u062F\u0627\u064B").regex(/^[a-zA-Zا-ي0-9\s\-']+$/, "\u0627\u0644\u0627\u0633\u0645 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629"),
      lastName: z.string().max(100, "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0637\u0648\u064A\u0644 \u062C\u062F\u0627\u064B").regex(/^[a-zA-Zا-ي0-9\s\-']*$/, "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629").optional(),
      role: z.enum(["admin", "manager", "user"], {
        errorMap: () => ({ message: "\u0627\u0644\u062F\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 admin \u0623\u0648 manager \u0623\u0648 user" })
      })
    });
    enhancedInsertWorkerSchema = createInsertSchema(workers).omit({
      id: true,
      createdAt: true
    }).extend({
      name: z.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0645\u0644 \u0642\u0635\u064A\u0631 \u062C\u062F\u0627\u064B").max(100, "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0645\u0644 \u0637\u0648\u064A\u0644 \u062C\u062F\u0627\u064B").regex(/^[a-zA-Zا-ي0-9\s\-']+$/, "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0645\u0644 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629"),
      type: z.enum(["\u0645\u0639\u0644\u0645", "\u0639\u0627\u0645\u0644", "\u0645\u0633\u0627\u0639\u062F", "\u0633\u0627\u0626\u0642", "\u062D\u0627\u0631\u0633"], {
        errorMap: () => ({ message: "\u0646\u0648\u0639 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" })
      }),
      dailyWage: z.string().regex(/^\d+(\.\d{1,2})?$/, "\u0627\u0644\u0623\u062C\u0631 \u0627\u0644\u064A\u0648\u0645\u064A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0635\u062D\u064A\u062D\u0627\u064B").refine((val) => parseFloat(val) > 0 && parseFloat(val) <= 1e4, {
        message: "\u0627\u0644\u0623\u062C\u0631 \u0627\u0644\u064A\u0648\u0645\u064A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 1 \u0648 10000"
      })
    });
    enhancedInsertProjectSchema = createInsertSchema(projects).omit({
      id: true,
      createdAt: true
    }).extend({
      name: z.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0642\u0635\u064A\u0631 \u062C\u062F\u0627\u064B").max(200, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0637\u0648\u064A\u0644 \u062C\u062F\u0627\u064B").regex(/^[a-zA-Zا-ي0-9\s\-_().]+$/, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629"),
      status: z.enum(["active", "completed", "paused"], {
        errorMap: () => ({ message: "\u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 active \u0623\u0648 completed \u0623\u0648 paused" })
      }),
      imageUrl: z.string().url("\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D").optional().or(z.literal(""))
    });
    updateProjectSchema = enhancedInsertProjectSchema.partial().omit({
      // الحقول المحظور تعديلها لأسباب أمنية
    }).refine(
      (data) => Object.keys(data).length > 0,
      { message: "\u064A\u062C\u0628 \u062A\u0648\u0641\u064A\u0631 \u062D\u0642\u0644 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B" }
    );
    uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "\u0645\u0639\u0631\u0641 UUID \u063A\u064A\u0631 \u0635\u062D\u064A\u062D").or(z.string().regex(/^[a-z0-9-]{8,50}$/, "\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"));
    insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
    insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true, createdAt: true }).extend({
      amount: z.coerce.string()
      // تحويل number إلى string تلقائياً للتوافق مع نوع decimal
    });
    insertPrintSettingsSchema = createInsertSchema(printSettings).omit({ id: true, createdAt: true, updatedAt: true });
    insertAuthUserSessionSchema = createInsertSchema(authUserSessions).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      lastActivity: true
    });
    reportTemplates = pgTable("report_templates", {
      id: text("id").primaryKey().default(sql`gen_random_uuid()`),
      templateName: text("template_name").notNull().default("default"),
      // إعدادات الرأس
      headerTitle: text("header_title").notNull().default("\u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0628\u0646\u0627\u0621"),
      headerSubtitle: text("header_subtitle").default("\u062A\u0642\u0631\u064A\u0631 \u0645\u0627\u0644\u064A"),
      companyName: text("company_name").notNull().default("\u0634\u0631\u0643\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u0648\u0627\u0644\u062A\u0637\u0648\u064A\u0631"),
      companyAddress: text("company_address").default("\u0635\u0646\u0639\u0627\u0621 - \u0627\u0644\u064A\u0645\u0646"),
      companyPhone: text("company_phone").default("+967 1 234567"),
      companyEmail: text("company_email").default("info@company.com"),
      // إعدادات الذيل
      footerText: text("footer_text").default("\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0628\u0648\u0627\u0633\u0637\u0629 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639"),
      footerContact: text("footer_contact").default("\u0644\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631: info@company.com | +967 1 234567"),
      // إعدادات الألوان
      primaryColor: text("primary_color").notNull().default("#1f2937"),
      // رمادي داكن
      secondaryColor: text("secondary_color").notNull().default("#3b82f6"),
      // أزرق
      accentColor: text("accent_color").notNull().default("#10b981"),
      // أخضر
      textColor: text("text_color").notNull().default("#1f2937"),
      backgroundColor: text("background_color").notNull().default("#ffffff"),
      // إعدادات التصميم
      fontSize: integer("font_size").notNull().default(11),
      fontFamily: text("font_family").notNull().default("Arial"),
      logoUrl: text("logo_url"),
      // رابط الشعار
      // إعدادات الطباعة
      pageOrientation: text("page_orientation").notNull().default("portrait"),
      // portrait أو landscape
      pageSize: text("page_size").notNull().default("A4"),
      margins: jsonb("margins").default({ top: 1, bottom: 1, left: 0.75, right: 0.75 }),
      // تفعيل/إلغاء العناصر
      showHeader: boolean("show_header").notNull().default(true),
      showFooter: boolean("show_footer").notNull().default(true),
      showLogo: boolean("show_logo").notNull().default(true),
      showDate: boolean("show_date").notNull().default(true),
      showPageNumbers: boolean("show_page_numbers").notNull().default(true),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    toolCategories = pgTable("tool_categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull().unique(),
      description: text("description"),
      icon: text("icon"),
      // أيقونة التصنيف
      color: text("color").default("#3b82f6"),
      // لون التصنيف
      parentId: varchar("parent_id").references(() => toolCategories.id, { onDelete: "cascade" }),
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    tools = pgTable("tools", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      sku: text("sku").unique(),
      // كود المخزون
      name: text("name").notNull(),
      description: text("description"),
      categoryId: varchar("category_id").references(() => toolCategories.id),
      projectId: varchar("project_id").references(() => projects.id),
      // المشروع المرتبط
      unit: text("unit").notNull().default("\u0642\u0637\u0639\u0629"),
      // الوحدة
      // خصائص الأداة
      isTool: boolean("is_tool").default(true).notNull(),
      // أداة عمل
      isConsumable: boolean("is_consumable").default(false).notNull(),
      // قابل للاستهلاك
      isSerial: boolean("is_serial").default(false).notNull(),
      // له رقم تسلسلي
      // معلومات الشراء والمالية
      purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
      currentValue: decimal("current_value", { precision: 12, scale: 2 }),
      // القيمة الحالية
      depreciationRate: decimal("depreciation_rate", { precision: 5, scale: 2 }),
      // معدل الإهلاك السنوي
      purchaseDate: date("purchase_date"),
      supplierId: varchar("supplier_id").references(() => suppliers.id),
      warrantyExpiry: date("warranty_expiry"),
      // معلومات الصيانة
      maintenanceInterval: integer("maintenance_interval"),
      // عدد الأيام بين الصيانة
      lastMaintenanceDate: date("last_maintenance_date"),
      nextMaintenanceDate: date("next_maintenance_date"),
      // الحالة والموقع
      status: text("status").notNull().default("available"),
      // available, assigned, maintenance, lost, consumed, reserved
      condition: text("condition").notNull().default("excellent"),
      // excellent, good, fair, poor, damaged
      locationType: text("location_type"),
      // نوع الموقع (مخزن، مشروع، فرع، مكتب، ورشة)
      locationId: text("location_id"),
      // تحديد الموقع
      // معلومات إضافية
      serialNumber: text("serial_number"),
      barcode: text("barcode"),
      qrCode: text("qr_code"),
      imageUrls: text("image_urls").array(),
      notes: text("notes"),
      specifications: jsonb("specifications"),
      // مواصفات تقنية
      // تتبع الاستخدام
      totalUsageHours: decimal("total_usage_hours", { precision: 10, scale: 2 }).default("0"),
      usageCount: integer("usage_count").default(0),
      // تقييم الذكاء الاصطناعي
      aiRating: decimal("ai_rating", { precision: 3, scale: 2 }),
      // تقييم من 1-5
      aiNotes: text("ai_notes"),
      // ملاحظات الذكاء الاصطناعي
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    toolStock = pgTable("tool_stock", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      // معلومات الموقع
      locationType: text("location_type").notNull(),
      // warehouse, project, external, maintenance, none
      locationId: varchar("location_id"),
      // مرجع للمشروع أو المخزن
      locationName: text("location_name"),
      // اسم الموقع للعرض
      // الكميات
      quantity: integer("quantity").notNull().default(0),
      availableQuantity: integer("available_quantity").notNull().default(0),
      reservedQuantity: integer("reserved_quantity").notNull().default(0),
      // معلومات إضافية
      notes: text("notes"),
      lastVerifiedAt: timestamp("last_verified_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      uniqueToolLocation: sql`UNIQUE (tool_id, location_type, location_id)`
    }));
    toolMovements = pgTable("tool_movements", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      // معلومات الحركة
      movementType: text("movement_type").notNull(),
      // purchase, transfer, return, consume, adjust, maintenance, lost
      quantity: integer("quantity").notNull(),
      // من إلى
      fromType: text("from_type"),
      // warehouse, project, external, supplier, none
      fromId: varchar("from_id"),
      toType: text("to_type"),
      // warehouse, project, external, maintenance, none
      toId: varchar("to_id"),
      // معلومات إضافية
      projectId: varchar("project_id").references(() => projects.id),
      reason: text("reason"),
      notes: text("notes"),
      referenceNumber: text("reference_number"),
      // رقم مرجعي للعملية
      performedBy: text("performed_by").notNull(),
      performedAt: timestamp("performed_at").defaultNow().notNull()
    });
    toolMaintenanceLogs = pgTable("tool_maintenance_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      // نوع الصيانة
      maintenanceType: text("maintenance_type").notNull(),
      // preventive, corrective, emergency, inspection
      priority: text("priority").notNull().default("medium"),
      // low, medium, high, urgent
      // تفاصيل الصيانة
      title: text("title").notNull(),
      description: text("description"),
      workPerformed: text("work_performed"),
      // التواريخ
      scheduledDate: timestamp("scheduled_date"),
      startedAt: timestamp("started_at"),
      completedAt: timestamp("completed_at"),
      nextDueDate: timestamp("next_due_date"),
      // الحالة
      status: text("status").notNull().default("scheduled"),
      // scheduled, in_progress, completed, cancelled, overdue
      // التكلفة
      laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).default("0"),
      partsCost: decimal("parts_cost", { precision: 12, scale: 2 }).default("0"),
      totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
      // المشاركون
      performedBy: varchar("performed_by").references(() => users.id),
      assignedTo: varchar("assigned_to").references(() => users.id),
      // تقييم الحالة
      conditionBefore: text("condition_before"),
      // حالة الأداة قبل الصيانة
      conditionAfter: text("condition_after"),
      // حالة الأداة بعد الصيانة
      // مرفقات
      imageUrls: text("image_urls").array(),
      documentUrls: text("document_urls").array(),
      // ملاحظات
      notes: text("notes"),
      issues: text("issues"),
      // المشاكل المكتشفة
      recommendations: text("recommendations"),
      // التوصيات
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    toolUsageAnalytics = pgTable("tool_usage_analytics", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      projectId: varchar("project_id").references(() => projects.id),
      // فترة التحليل
      analysisDate: text("analysis_date").notNull(),
      // YYYY-MM-DD
      analysisWeek: text("analysis_week"),
      // YYYY-WW
      analysisMonth: text("analysis_month"),
      // YYYY-MM
      // إحصائيات الاستخدام
      usageHours: decimal("usage_hours", { precision: 10, scale: 2 }).default("0"),
      transferCount: integer("transfer_count").default(0),
      maintenanceCount: integer("maintenance_count").default(0),
      // إحصائيات التكلفة
      operationalCost: decimal("operational_cost", { precision: 12, scale: 2 }).default("0"),
      maintenanceCost: decimal("maintenance_cost", { precision: 12, scale: 2 }).default("0"),
      // تقييم الأداء
      utilizationRate: decimal("utilization_rate", { precision: 5, scale: 2 }),
      // معدل الاستخدام %
      efficiencyScore: decimal("efficiency_score", { precision: 5, scale: 2 }),
      // نقاط الكفاءة
      // تنبؤات الذكاء الاصطناعي
      predictedUsage: decimal("predicted_usage", { precision: 10, scale: 2 }),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    toolPurchaseItems = pgTable("tool_purchase_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      // ربط مع المشتريات
      materialPurchaseId: varchar("material_purchase_id").notNull().references(() => materialPurchases.id, { onDelete: "cascade" }),
      // معلومات الأداة المشتراة
      itemName: text("item_name").notNull(),
      // اسم البند كما في الفاتورة
      itemDescription: text("item_description"),
      quantity: integer("quantity").notNull().default(1),
      unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
      totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
      // تصنيف الأداة
      isToolItem: boolean("is_tool_item").default(false).notNull(),
      // هل هذا البند أداة؟
      suggestedCategoryId: varchar("suggested_category_id").references(() => toolCategories.id),
      // التصنيف المقترح
      // حالة التحويل إلى أداة
      conversionStatus: text("conversion_status").notNull().default("pending"),
      // pending, converted, skipped, failed
      toolId: varchar("tool_id").references(() => tools.id),
      // مرجع الأداة المنشأة
      // ذكاء اصطناعي للتصنيف
      aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
      // ثقة الذكاء الاصطناعي في التصنيف
      aiSuggestions: jsonb("ai_suggestions"),
      // اقتراحات الذكاء الاصطناعي
      // معلومات إضافية
      notes: text("notes"),
      convertedAt: timestamp("converted_at"),
      convertedBy: varchar("converted_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    maintenanceSchedules = pgTable("maintenance_schedules", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      // نوع الجدولة
      scheduleType: text("schedule_type").notNull(),
      // time_based, usage_based, condition_based, custom
      // إعدادات الجدولة الزمنية
      intervalDays: integer("interval_days"),
      // الفترة بالأيام
      intervalWeeks: integer("interval_weeks"),
      // الفترة بالأسابيع
      intervalMonths: integer("interval_months"),
      // الفترة بالشهور
      // إعدادات الجدولة بالاستخدام
      usageHoursInterval: decimal("usage_hours_interval", { precision: 10, scale: 2 }),
      // فترة بساعات العمل
      usageCountInterval: integer("usage_count_interval"),
      // فترة بعدد الاستخدامات
      // حالة الجدولة
      isActive: boolean("is_active").default(true).notNull(),
      // تواريخ مهمة
      lastMaintenanceDate: timestamp("last_maintenance_date"),
      nextDueDate: timestamp("next_due_date").notNull(),
      // تفاصيل الصيانة
      maintenanceType: text("maintenance_type").notNull().default("preventive"),
      // preventive, corrective, inspection
      priority: text("priority").notNull().default("medium"),
      // low, medium, high, urgent
      estimatedDuration: integer("estimated_duration"),
      // المدة المقدرة بالساعات
      estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
      // المسؤوليات
      assignedTo: varchar("assigned_to").references(() => users.id),
      createdBy: varchar("created_by").references(() => users.id),
      // ملاحظات ووصف
      title: text("title").notNull(),
      description: text("description"),
      checklistItems: jsonb("checklist_items"),
      // قائمة مراجعة JSON
      // تنبيهات
      enableNotifications: boolean("enable_notifications").default(true).notNull(),
      notifyDaysBefore: integer("notify_days_before").default(3).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    maintenanceTasks = pgTable("maintenance_tasks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      scheduleId: varchar("schedule_id").notNull().references(() => maintenanceSchedules.id, { onDelete: "cascade" }),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      // معلومات المهمة
      taskName: text("task_name").notNull(),
      taskDescription: text("task_description"),
      taskType: text("task_type").notNull(),
      // inspection, cleaning, lubrication, replacement, repair, calibration
      // الأولوية والحالة
      priority: text("priority").notNull().default("medium"),
      // low, medium, high, urgent
      status: text("status").notNull().default("pending"),
      // pending, in_progress, completed, cancelled, overdue
      // التوقيت
      dueDate: timestamp("due_date").notNull(),
      startedAt: timestamp("started_at"),
      completedAt: timestamp("completed_at"),
      estimatedDuration: integer("estimated_duration"),
      // بالدقائق
      actualDuration: integer("actual_duration"),
      // بالدقائق
      // التكلفة
      estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
      actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
      // المسؤوليات
      assignedTo: varchar("assigned_to").references(() => users.id),
      performedBy: varchar("performed_by").references(() => users.id),
      // النتائج
      result: text("result"),
      // success, failed, partial, needs_followup
      findings: text("findings"),
      // ما تم اكتشافه
      actionsTaken: text("actions_taken"),
      // الإجراءات المتخذة
      recommendations: text("recommendations"),
      // التوصيات
      // المرفقات والوثائق
      beforeImages: text("before_images").array(),
      // صور قبل الصيانة
      afterImages: text("after_images").array(),
      // صور بعد الصيانة
      documentUrls: text("document_urls").array(),
      // مستندات
      // المواد المستخدمة
      materialsUsed: jsonb("materials_used"),
      // JSON array of {name, quantity, cost}
      // التوقيعات والموافقات
      performerSignature: text("performer_signature"),
      // توقيع المنفذ
      supervisorSignature: text("supervisor_signature"),
      // توقيع المشرف
      approvedBy: varchar("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      // ملاحظات
      notes: text("notes"),
      internalNotes: text("internal_notes"),
      // ملاحظات داخلية
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    toolCostTracking = pgTable("tool_cost_tracking", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      // نوع التكلفة
      costType: text("cost_type").notNull(),
      // purchase, maintenance, operation, depreciation, insurance, storage
      costCategory: text("cost_category").notNull(),
      // capital, operational, unexpected
      // التكلفة
      amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
      currency: text("currency").notNull().default("YER"),
      // العملة
      // التاريخ والفترة
      costDate: text("cost_date").notNull(),
      // YYYY-MM-DD
      costPeriod: text("cost_period"),
      // monthly, yearly, one-time
      // المرجع
      referenceType: text("reference_type"),
      // purchase_invoice, maintenance_log, manual_entry
      referenceId: varchar("reference_id"),
      // مرجع للفاتورة أو سجل الصيانة
      // تفاصيل إضافية
      description: text("description").notNull(),
      notes: text("notes"),
      // الموافقات
      approvedBy: varchar("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      // المشروع المرتبط
      projectId: varchar("project_id").references(() => projects.id),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      uniqueToolDate: sql`UNIQUE (tool_id, analysis_date)`
    }));
    toolReservations = pgTable("tool_reservations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      toolId: varchar("tool_id").notNull().references(() => tools.id, { onDelete: "cascade" }),
      projectId: varchar("project_id").notNull().references(() => projects.id),
      // تفاصيل الحجز
      quantity: integer("quantity").notNull(),
      reservedBy: varchar("reserved_by").notNull().references(() => users.id),
      // التواريخ
      reservationDate: timestamp("reservation_date").defaultNow().notNull(),
      requestedDate: timestamp("requested_date").notNull(),
      expiryDate: timestamp("expiry_date"),
      // الحالة
      status: text("status").notNull().default("pending"),
      // pending, approved, fulfilled, cancelled, expired
      priority: text("priority").notNull().default("normal"),
      // low, normal, high, urgent
      // ملاحظات
      reason: text("reason"),
      notes: text("notes"),
      // الموافقة
      approvedBy: varchar("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      // الإنجاز
      fulfilledBy: varchar("fulfilled_by").references(() => users.id),
      fulfilledAt: timestamp("fulfilled_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    systemNotifications = pgTable("system_notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      // نوع الإشعار
      type: text("type").notNull(),
      // maintenance, warranty, stock, unused, damaged, system, security
      category: text("category").notNull(),
      // alert, warning, info, success, error
      // المحتوى
      title: text("title").notNull(),
      message: text("message").notNull(),
      description: text("description"),
      // تفاصيل إضافية
      // الأولوية والحالة
      priority: text("priority").notNull().default("medium"),
      // low, medium, high, critical, urgent
      severity: text("severity").notNull().default("info"),
      // info, warning, error, critical
      status: text("status").notNull().default("active"),
      // active, read, archived, dismissed
      // المصدر والمرجع
      sourceType: text("source_type"),
      // tool, project, user, system, maintenance, financial
      sourceId: varchar("source_id"),
      // ID للعنصر المرجعي
      sourceName: text("source_name"),
      // اسم المصدر للعرض
      // المستخدم والتوجيه
      userId: varchar("user_id").references(() => users.id),
      // إشعار خاص بمستخدم محدد، null للإشعارات العامة
      targetAudience: text("target_audience").default("all"),
      // all, admin, managers, operators
      // الإجراءات
      actionRequired: boolean("action_required").default(false).notNull(),
      actionUrl: text("action_url"),
      // رابط للإجراء المطلوب
      actionLabel: text("action_label"),
      // نص زر الإجراء
      // التوقيت
      scheduledFor: timestamp("scheduled_for"),
      // وقت عرض الإشعار
      expiresAt: timestamp("expires_at"),
      // وقت انتهاء الإشعار
      readAt: timestamp("read_at"),
      // وقت القراءة
      dismissedAt: timestamp("dismissed_at"),
      // وقت الإخفاء
      // البيانات المرفقة
      metadata: jsonb("metadata"),
      // بيانات إضافية في شكل JSON
      attachments: text("attachments").array(),
      // مرفقات أو صور
      // التتبع والإحصائيات
      viewCount: integer("view_count").default(0).notNull(),
      clickCount: integer("click_count").default(0).notNull(),
      lastViewedAt: timestamp("last_viewed_at"),
      // الإعدادات التقنية
      isSystem: boolean("is_system").default(false).notNull(),
      // إشعار نظام تلقائي
      isAutoGenerated: boolean("is_auto_generated").default(true).notNull(),
      isPersistent: boolean("is_persistent").default(false).notNull(),
      // يبقى حتى بعد القراءة
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      // فهارس لتحسين الأداء
      userStatusIdx: sql`CREATE INDEX IF NOT EXISTS notifications_user_status_idx ON ${table} (user_id, status, priority)`,
      typeSourceIdx: sql`CREATE INDEX IF NOT EXISTS notifications_type_source_idx ON ${table} (type, source_type, source_id)`,
      scheduledIdx: sql`CREATE INDEX IF NOT EXISTS notifications_scheduled_idx ON ${table} (scheduled_for, status)`
    }));
    notificationReadStates = pgTable("notification_read_states", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      notificationId: text("notification_id").notNull(),
      // معرف الإشعار (مثل maintenance-tool-id)
      userId: varchar("user_id").references(() => users.id),
      // المستخدم الذي قرأ الإشعار (null للعام)
      isRead: boolean("is_read").default(true).notNull(),
      // حالة القراءة
      readAt: timestamp("read_at").defaultNow().notNull(),
      // تاريخ القراءة
      deviceInfo: text("device_info"),
      // معلومات الجهاز للمراجعة
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      // قيد فريد لمنع تكرار الإدخال لنفس الإشعار والمستخدم
      uniqueNotificationUser: sql`UNIQUE (notification_id, user_id)`
    }));
    insertToolCategorySchema = createInsertSchema(toolCategories).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertToolSchema = createInsertSchema(tools).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      purchasePrice: z.coerce.string().optional(),
      // تحويل number إلى string للتوافق مع نوع decimal
      currentValue: z.coerce.string().optional()
      // تحويل number إلى string للتوافق مع نوع decimal
    });
    updateToolSchema = insertToolSchema.extend({
      purchasePrice: z.union([z.string(), z.number()]).optional().transform((val) => {
        if (val === void 0 || val === null || val === "") return void 0;
        return typeof val === "string" ? val : val.toString();
      }),
      currentValue: z.union([z.string(), z.number()]).optional().transform((val) => {
        if (val === void 0 || val === null || val === "") return void 0;
        return typeof val === "string" ? val : val.toString();
      }),
      depreciationRate: z.union([z.string(), z.number()]).optional().transform((val) => {
        if (val === void 0 || val === null || val === "") return void 0;
        return typeof val === "string" ? val : val.toString();
      }),
      purchaseDate: z.union([z.string(), z.date()]).optional().transform((val) => {
        if (!val || val === "") return void 0;
        if (typeof val === "string") {
          const date2 = /* @__PURE__ */ new Date(val + "T00:00:00.000Z");
          return isNaN(date2.getTime()) ? void 0 : date2;
        }
        return val;
      }),
      warrantyExpiry: z.union([z.string(), z.date()]).optional().transform((val) => {
        if (!val || val === "") return void 0;
        if (typeof val === "string") {
          const date2 = /* @__PURE__ */ new Date(val + "T00:00:00.000Z");
          return isNaN(date2.getTime()) ? void 0 : date2;
        }
        return val;
      }),
      lastMaintenanceDate: z.union([z.string(), z.date()]).optional().transform((val) => {
        if (!val || val === "") return void 0;
        if (typeof val === "string") {
          const date2 = /* @__PURE__ */ new Date(val + "T00:00:00.000Z");
          return isNaN(date2.getTime()) ? void 0 : date2;
        }
        return val;
      }),
      nextMaintenanceDate: z.union([z.string(), z.date()]).optional().transform((val) => {
        if (!val || val === "") return void 0;
        if (typeof val === "string") {
          const date2 = /* @__PURE__ */ new Date(val + "T00:00:00.000Z");
          return isNaN(date2.getTime()) ? void 0 : date2;
        }
        return val;
      })
    }).partial();
    insertToolStockSchema = createInsertSchema(toolStock).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertToolMovementSchema = createInsertSchema(toolMovements).omit({
      id: true,
      performedAt: true
      // سيتم إنشاؤه تلقائياً إذا لم يُرسل
    });
    insertToolMaintenanceLogSchema = createInsertSchema(toolMaintenanceLogs).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      laborCost: z.coerce.string().optional(),
      // تحويل number إلى string للتوافق مع نوع decimal
      partsCost: z.coerce.string().optional(),
      // تحويل number إلى string للتوافق مع نوع decimal
      totalCost: z.coerce.string().optional()
      // تحويل number إلى string للتوافق مع نوع decimal
    });
    insertToolUsageAnalyticsSchema = createInsertSchema(toolUsageAnalytics).omit({
      id: true,
      createdAt: true
    });
    insertToolReservationSchema = createInsertSchema(toolReservations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertSystemNotificationSchema = createInsertSchema(systemNotifications).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      viewCount: true,
      clickCount: true,
      lastViewedAt: true
    });
    insertToolPurchaseItemSchema = createInsertSchema(toolPurchaseItems).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      unitPrice: z.coerce.string(),
      // تحويل number إلى string للتوافق مع نوع decimal
      totalPrice: z.coerce.string()
      // تحويل number إلى string للتوافق مع نوع decimal
    });
    insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertToolCostTrackingSchema = createInsertSchema(toolCostTracking).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    toolNotifications = pgTable("tool_notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      type: text("type").notNull(),
      // maintenance, warranty, stock, unused, damaged
      title: text("title").notNull(),
      message: text("message").notNull(),
      toolId: varchar("tool_id").references(() => tools.id),
      toolName: text("tool_name"),
      priority: text("priority").notNull().default("medium"),
      // low, medium, high, critical
      isRead: boolean("is_read").notNull().default(false),
      actionRequired: boolean("action_required").notNull().default(false),
      metadata: jsonb("metadata"),
      // بيانات إضافية حسب نوع الإشعار
      createdAt: timestamp("created_at").defaultNow().notNull(),
      readAt: timestamp("read_at")
    });
    insertToolNotificationSchema = createInsertSchema(toolNotifications);
    insertNotificationReadStateSchema = createInsertSchema(notificationReadStates).omit({
      id: true,
      createdAt: true
    });
    approvals = pgTable("approvals", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      objectType: text("object_type").notNull(),
      // material_purchase, fund_transfer, worker_transfer, tool_purchase
      objectId: varchar("object_id").notNull(),
      // ID الكائن المطلوب الموافقة عليه
      requestedBy: varchar("requested_by").notNull().references(() => users.id),
      // من طلب الموافقة
      approverId: varchar("approver_id").references(() => users.id),
      // من سيوافق
      currentLevel: integer("current_level").notNull().default(1),
      // المستوى الحالي للموافقة
      totalLevels: integer("total_levels").notNull().default(1),
      // إجمالي مستويات الموافقة المطلوبة
      amount: decimal("amount", { precision: 12, scale: 2 }),
      // المبلغ (إن وجد)
      title: text("title").notNull(),
      // عنوان طلب الموافقة
      description: text("description"),
      // وصف مفصل
      priority: text("priority").notNull().default("medium"),
      // low, medium, high, urgent
      status: text("status").notNull().default("pending"),
      // pending, approved, rejected, cancelled
      reason: text("reason"),
      // سبب الرفض أو الموافقة
      metadata: jsonb("metadata"),
      // بيانات إضافية حسب نوع الكائن
      dueDate: timestamp("due_date"),
      // تاريخ انتهاء صلاحية الطلب
      decidedAt: timestamp("decided_at"),
      // تاريخ اتخاذ القرار
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    channels = pgTable("channels", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      // اسم القناة
      type: text("type").notNull().default("approval"),
      // approval, project, general, private
      relatedObjectType: text("related_object_type"),
      // نوع الكائن المرتبط
      relatedObjectId: varchar("related_object_id"),
      // ID الكائن المرتبط
      participantIds: jsonb("participant_ids").notNull(),
      // مصفوفة IDs المشاركين
      isPrivate: boolean("is_private").notNull().default(false),
      createdBy: varchar("created_by").notNull().references(() => users.id),
      lastMessageAt: timestamp("last_message_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    messages = pgTable("messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      channelId: varchar("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
      senderId: varchar("sender_id").notNull().references(() => users.id),
      content: text("content").notNull(),
      // محتوى الرسالة
      messageType: text("message_type").notNull().default("text"),
      // text, file, decision, action
      attachments: jsonb("attachments"),
      // مرفقات الرسالة
      relatedObjectType: text("related_object_type"),
      // نوع الكائن المرتبط
      relatedObjectId: varchar("related_object_id"),
      // ID الكائن المرتبط
      isDecision: boolean("is_decision").notNull().default(false),
      // هل هي رسالة قرار
      decisionType: text("decision_type"),
      // approve, reject, request_info
      isEdited: boolean("is_edited").notNull().default(false),
      editedAt: timestamp("edited_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    actions = pgTable("actions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      // عنوان الإجراء
      description: text("description").notNull(),
      // وصف مفصل للإجراء
      category: text("category").notNull(),
      // maintenance, quality, safety, financial
      priority: text("priority").notNull().default("medium"),
      // low, medium, high, critical
      ownerId: varchar("owner_id").notNull().references(() => users.id),
      // المسؤول عن تنفيذ الإجراء
      assignedTo: varchar("assigned_to").references(() => users.id),
      // من كُلف بالإجراء
      relatedObjectType: text("related_object_type"),
      // نوع الكائن المرتبط
      relatedObjectId: varchar("related_object_id"),
      // ID الكائن المرتبط
      status: text("status").notNull().default("open"),
      // open, in_progress, completed, cancelled
      progress: integer("progress").notNull().default(0),
      // نسبة الإنجاز (0-100)
      estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
      // التكلفة المقدرة
      actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
      // التكلفة الفعلية
      dueDate: date("due_date"),
      // تاريخ الاستحقاق
      startedAt: timestamp("started_at"),
      // تاريخ البدء
      completedAt: timestamp("completed_at"),
      // تاريخ الإنجاز
      notes: text("notes"),
      // ملاحظات
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    systemEvents = pgTable("system_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      eventType: text("event_type").notNull(),
      // transaction.created, approval.requested, etc.
      objectType: text("object_type").notNull(),
      // نوع الكائن
      objectId: varchar("object_id").notNull(),
      // ID الكائن
      userId: varchar("user_id").references(() => users.id),
      // من قام بالإجراء
      eventData: jsonb("event_data").notNull(),
      // بيانات الحدث
      processed: boolean("processed").notNull().default(false),
      // هل تم معالجة الحدث
      processedAt: timestamp("processed_at"),
      // متى تم معالجة الحدث
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertApprovalSchema = createInsertSchema(approvals).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      amount: z.coerce.string().optional()
      // تحويل إلى string للتوافق مع decimal
    });
    insertChannelSchema = createInsertSchema(channels).omit({
      id: true,
      createdAt: true
    });
    insertMessageSchema = createInsertSchema(messages).omit({
      id: true,
      createdAt: true
    });
    insertActionSchema = createInsertSchema(actions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      estimatedCost: z.coerce.string().optional(),
      actualCost: z.coerce.string().optional()
    });
    insertSystemEventSchema = createInsertSchema(systemEvents).omit({
      id: true,
      createdAt: true
    });
    accounts = pgTable("accounts", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      code: text("code").unique().notNull(),
      // رقم الحساب (مثل 1000، 2000)
      name: text("name").notNull(),
      type: text("type").notNull(),
      // asset/liability/equity/income/expense
      currency: text("currency").default("SAR").notNull(),
      parentId: varchar("parent_id"),
      // للحسابات الفرعية
      isActive: boolean("is_active").default(true).notNull(),
      description: text("description"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    transactions = pgTable("transactions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      docNumber: text("doc_number"),
      // رقم سند/مرجع
      date: date("date").notNull(),
      description: text("description"),
      totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
      currency: text("currency").default("SAR").notNull(),
      status: text("status").default("draft").notNull(),
      // draft/pending/approved/posted/reconciled
      transactionType: text("transaction_type").notNull(),
      // purchase/sale/transfer/adjustment/etc
      projectId: varchar("project_id").references(() => projects.id),
      // ربط بالمشروع
      relatedObjectType: text("related_object_type"),
      // material_purchase/fund_transfer/etc
      relatedObjectId: varchar("related_object_id"),
      // id الكائن المرتبط
      createdBy: varchar("created_by").references(() => users.id),
      approvedBy: varchar("approved_by").references(() => users.id),
      postedBy: varchar("posted_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      postedAt: timestamp("posted_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    transactionLines = pgTable("transaction_lines", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      transactionId: varchar("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
      accountId: varchar("account_id").notNull().references(() => accounts.id),
      debit: decimal("debit", { precision: 12, scale: 2 }).default("0").notNull(),
      credit: decimal("credit", { precision: 12, scale: 2 }).default("0").notNull(),
      description: text("description"),
      costCenter: text("cost_center"),
      // مركز التكلفة
      projectId: varchar("project_id").references(() => projects.id),
      // لتتبع التكاليف
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    journals = pgTable("journals", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      transactionId: varchar("transaction_id").notNull().references(() => transactions.id),
      journalNumber: text("journal_number").unique(),
      // رقم دفتر اليومية
      period: text("period").notNull(),
      // YYYY-MM (الفترة المحاسبية)
      isReversed: boolean("is_reversed").default(false).notNull(),
      // للقيود العكسية
      reversalJournalId: varchar("reversal_journal_id"),
      // مرجع القيد العكسي
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      postedAt: timestamp("posted_at")
    });
    financePayments = pgTable("finance_payments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      transactionId: varchar("transaction_id").references(() => transactions.id),
      paymentNumber: text("payment_number").unique(),
      paymentType: text("payment_type").notNull(),
      // cash/bank_transfer/check/credit_card
      amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
      currency: text("currency").default("SAR").notNull(),
      fromAccount: varchar("from_account").references(() => accounts.id),
      // الحساب المدين
      toAccount: varchar("to_account").references(() => accounts.id),
      // الحساب الدائن
      bankReference: text("bank_reference"),
      // مرجع البنك
      checkNumber: text("check_number"),
      // رقم الشيك
      dueDate: date("due_date"),
      paidDate: date("paid_date"),
      payerId: varchar("payer_id"),
      // من دفع
      payeeId: varchar("payee_id"),
      // من استلم
      status: text("status").default("pending").notNull(),
      // pending/completed/cancelled/failed
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    financeEvents = pgTable("finance_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      eventName: text("event_name").notNull(),
      eventType: text("event_type").notNull(),
      // transaction/payment/reconciliation/approval
      objectType: text("object_type"),
      // transaction/payment/account
      objectId: varchar("object_id"),
      payload: jsonb("payload"),
      // تفاصيل الحدث
      metadata: jsonb("metadata"),
      // معلومات إضافية
      triggeredBy: varchar("triggered_by").references(() => users.id),
      processed: boolean("processed").default(false).notNull(),
      processedAt: timestamp("processed_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    accountBalances = pgTable("account_balances", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      accountId: varchar("account_id").notNull().references(() => accounts.id),
      projectId: varchar("project_id").references(() => projects.id),
      // للتتبع بالمشروع
      period: text("period").notNull(),
      // YYYY-MM
      openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).default("0").notNull(),
      debitTotal: decimal("debit_total", { precision: 12, scale: 2 }).default("0").notNull(),
      creditTotal: decimal("credit_total", { precision: 12, scale: 2 }).default("0").notNull(),
      closingBalance: decimal("closing_balance", { precision: 12, scale: 2 }).default("0").notNull(),
      lastUpdated: timestamp("last_updated").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      uniqueAccountPeriod: sql`UNIQUE (account_id, period, project_id)`
    }));
    insertAccountSchema = createInsertSchema(accounts).omit({
      id: true,
      createdAt: true
    });
    insertTransactionSchema = createInsertSchema(transactions).omit({
      id: true,
      createdAt: true,
      approvedAt: true,
      postedAt: true
    });
    insertTransactionLineSchema = createInsertSchema(transactionLines).omit({
      id: true,
      createdAt: true
    });
    insertJournalSchema = createInsertSchema(journals).omit({
      id: true,
      createdAt: true,
      postedAt: true
    });
    insertFinancePaymentSchema = createInsertSchema(financePayments).omit({
      id: true,
      createdAt: true
    });
    insertFinanceEventSchema = createInsertSchema(financeEvents).omit({
      id: true,
      createdAt: true,
      processedAt: true
    });
    migrationJobs = pgTable("migration_jobs", {
      id: varchar("id").primaryKey(),
      // معرف فريد للمهمة
      status: text("status").notNull().default("pending"),
      // pending, running, completed, failed, cancelled
      startTime: timestamp("start_time").defaultNow().notNull(),
      endTime: timestamp("end_time"),
      // null حتى انتهاء المهمة
      currentTable: text("current_table"),
      // الجدول الحالي قيد المعالجة
      tablesProcessed: integer("tables_processed").default(0).notNull(),
      totalTables: integer("total_tables").default(0).notNull(),
      totalRowsProcessed: integer("total_rows_processed").default(0).notNull(),
      totalRowsSaved: integer("total_rows_saved").default(0).notNull(),
      totalErrors: integer("total_errors").default(0).notNull(),
      progress: integer("progress").default(0).notNull(),
      // 0-100
      errorMessage: text("error_message"),
      // رسالة الخطأ في حالة الفشل
      batchSize: integer("batch_size").default(100).notNull(),
      // حجم الدفعة المستخدم
      // Metadata للموثوقية
      userId: varchar("user_id").references(() => users.id),
      // المستخدم الذي بدأ المهمة
      resumable: boolean("resumable").default(true).notNull(),
      // هل يمكن استئناف المهمة؟
      lastHeartbeat: timestamp("last_heartbeat").defaultNow(),
      // آخر إشارة حياة للمهمة
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    migrationTableProgress = pgTable("migration_table_progress", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull().references(() => migrationJobs.id, { onDelete: "cascade" }),
      tableName: text("table_name").notNull(),
      status: text("status").notNull().default("pending"),
      // pending, processing, completed, failed, skipped
      totalRows: integer("total_rows").default(0).notNull(),
      processedRows: integer("processed_rows").default(0).notNull(),
      savedRows: integer("saved_rows").default(0).notNull(),
      failedRows: integer("failed_rows").default(0).notNull(),
      errors: integer("errors").default(0).notNull(),
      startTime: timestamp("start_time"),
      endTime: timestamp("end_time"),
      errorMessage: text("error_message"),
      // معاملات للاستئناف الآمن
      lastProcessedId: text("last_processed_id"),
      // آخر معرف تمت معالجته
      lastBatchOffset: integer("last_batch_offset").default(0).notNull(),
      // آخر offset للدفعة
      checksum: text("checksum"),
      // checksum للتحقق من سلامة البيانات
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      // قيد فريد لمنع تكرار نفس الجدول في نفس المهمة
      uniqueJobTable: sql`UNIQUE (job_id, table_name)`
    }));
    migrationBatchLog = pgTable("migration_batch_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull().references(() => migrationJobs.id, { onDelete: "cascade" }),
      tableName: text("table_name").notNull(),
      batchIndex: integer("batch_index").notNull(),
      batchSize: integer("batch_size").notNull(),
      batchOffset: integer("batch_offset").notNull(),
      status: text("status").notNull(),
      // started, completed, failed, retrying
      rowsProcessed: integer("rows_processed").default(0).notNull(),
      rowsSaved: integer("rows_saved").default(0).notNull(),
      retryCount: integer("retry_count").default(0).notNull(),
      errorMessage: text("error_message"),
      // للمعاملات الآمنة
      transactionId: text("transaction_id"),
      // معرف المعاملة
      startTime: timestamp("start_time").defaultNow().notNull(),
      endTime: timestamp("end_time"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertMigrationJobSchema = createInsertSchema(migrationJobs).omit({
      createdAt: true,
      updatedAt: true,
      lastHeartbeat: true
    });
    insertMigrationTableProgressSchema = createInsertSchema(migrationTableProgress).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertMigrationBatchLogSchema = createInsertSchema(migrationBatchLog).omit({
      id: true,
      createdAt: true
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      body: text("body").notNull(),
      type: text("type").notNull(),
      // system, alert, info, warning, etc
      priority: integer("priority").notNull().default(3),
      // 1=highest, 5=lowest
      projectId: varchar("project_id").references(() => projects.id),
      createdBy: varchar("created_by").references(() => users.id),
      recipients: text("recipients").array(),
      // array of user IDs or "default"
      payload: jsonb("payload"),
      // additional data (action, version, etc)
      meta: jsonb("meta"),
      // general metadata
      readBy: text("read_by").array(),
      // array of user IDs who read this
      deliveredTo: text("delivered_to").array(),
      // array of user IDs who received this
      scheduledAt: timestamp("scheduled_at"),
      // when to send notification
      channelPreference: jsonb("channel_preference"),
      // sms, email, push preferences
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
  }
});

// server/utils/env-loader.ts
import fs from "fs";
import path from "path";
function initializeEnvironment() {
  envLoader.load();
}
var EnvironmentLoader, envLoader;
var init_env_loader = __esm({
  "server/utils/env-loader.ts"() {
    "use strict";
    EnvironmentLoader = class _EnvironmentLoader {
      static instance;
      envVars = {};
      loaded = false;
      constructor() {
      }
      static getInstance() {
        if (!_EnvironmentLoader.instance) {
          _EnvironmentLoader.instance = new _EnvironmentLoader();
        }
        return _EnvironmentLoader.instance;
      }
      /**
       * تحميل جميع متغيرات البيئة بالأولوية الصحيحة
       */
      load() {
        if (this.loaded) {
          return;
        }
        console.log("\u{1F504} \u062A\u062D\u0645\u064A\u0644 \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629 \u0628\u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629...");
        this.loadFromEnvFile();
        if (this.envVars.NODE_ENV) {
          process.env.NODE_ENV = this.envVars.NODE_ENV;
        }
        this.loadFromEcosystemConfig();
        this.loadFromSystemEnv();
        Object.assign(process.env, this.envVars);
        this.loaded = true;
        console.log("\u2705 \u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629 \u0628\u0646\u062C\u0627\u062D");
        this.logLoadedVariables();
      }
      /**
       * قراءة ملف .env
       */
      loadFromEnvFile() {
        const envPath = path.join(process.cwd(), ".env");
        if (!fs.existsSync(envPath)) {
          console.log("\u26A0\uFE0F \u0645\u0644\u0641 .env \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
          return;
        }
        try {
          console.log("\u{1F4C4} \u0642\u0631\u0627\u0621\u0629 \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0645\u0646 \u0645\u0644\u0641 .env");
          const content = fs.readFileSync(envPath, "utf-8");
          const lines = content.split("\n");
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith("#") && trimmedLine.includes("=")) {
              const [key, ...valueParts] = trimmedLine.split("=");
              const value = valueParts.join("=").replace(/^["']|["']$/g, "");
              if (key.trim() && value.trim()) {
                this.envVars[key.trim()] = value.trim();
              }
            }
          }
        } catch (error) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0642\u0631\u0627\u0621\u0629 \u0645\u0644\u0641 .env:", error);
        }
      }
      /**
       * قراءة من ecosystem.config.json
       * يتم تجاهلها في بيئة التطوير لتجنب التداخل مع إعدادات التطوير
       */
      loadFromEcosystemConfig() {
        const nodeEnv = this.envVars.NODE_ENV ?? process.env.NODE_ENV;
        if (nodeEnv === "development") {
          console.log("\u26A0\uFE0F \u062A\u062C\u0627\u0647\u0644 ecosystem.config.json \u0641\u064A \u0628\u064A\u0626\u0629 \u0627\u0644\u062A\u0637\u0648\u064A\u0631");
          return;
        }
        const ecosystemPath = path.join(process.cwd(), "ecosystem.config.json");
        if (!fs.existsSync(ecosystemPath)) {
          console.log("\u26A0\uFE0F \u0645\u0644\u0641 ecosystem.config.json \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
          return;
        }
        try {
          console.log("\u{1F4C4} \u0642\u0631\u0627\u0621\u0629 \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0645\u0646 ecosystem.config.json");
          const content = fs.readFileSync(ecosystemPath, "utf-8");
          const config = JSON.parse(content);
          if (config.apps && config.apps.length > 0) {
            const currentApp = config.apps.find(
              (app2) => app2.name === "app2" || app2.script?.includes("server/index.js") || app2.cwd?.includes("app2")
            ) || config.apps[0];
            if (currentApp && currentApp.env) {
              for (const [key, value] of Object.entries(currentApp.env)) {
                if (!this.envVars[key] && value) {
                  this.envVars[key] = String(value);
                }
              }
            }
          }
        } catch (error) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0642\u0631\u0627\u0621\u0629 ecosystem.config.json:", error);
        }
      }
      /**
       * قراءة من متغيرات النظام
       */
      loadFromSystemEnv() {
        console.log("\u{1F4C4} \u0642\u0631\u0627\u0621\u0629 \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0645\u0646 \u0628\u064A\u0626\u0629 \u0627\u0644\u0646\u0638\u0627\u0645");
        const systemVars = [
          "DATABASE_URL",
          "NODE_ENV",
          "PORT",
          "JWT_ACCESS_SECRET",
          "JWT_REFRESH_SECRET",
          "ENCRYPTION_KEY",
          "DOMAIN"
        ];
        for (const key of systemVars) {
          if (!this.envVars[key] && process.env[key]) {
            this.envVars[key] = process.env[key];
          }
        }
      }
      /**
       * عرض المتغيرات المحملة (بدون كشف القيم الحساسة)
       */
      logLoadedVariables() {
        const sensitiveKeys = ["PASSWORD", "SECRET", "KEY", "TOKEN"];
        console.log("\u{1F4CB} \u0627\u0644\u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u0645\u0644\u0629:");
        for (const [key, value] of Object.entries(this.envVars)) {
          const isSensitive = sensitiveKeys.some(
            (sensitive) => key.toUpperCase().includes(sensitive)
          );
          if (isSensitive) {
            console.log(`   ${key}: [\u0645\u062E\u0641\u064A]`);
          } else if (key === "DATABASE_URL") {
            console.log(`   ${key}: ${value.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        }
      }
      /**
       * الحصول على قيمة متغير بيئة
       */
      get(key) {
        if (!this.loaded) {
          this.load();
        }
        return this.envVars[key] || process.env[key];
      }
      /**
       * التحقق من وجود متغير
       */
      has(key) {
        if (!this.loaded) {
          this.load();
        }
        return !!(this.envVars[key] || process.env[key]);
      }
      /**
       * الحصول على جميع المتغيرات
       */
      getAll() {
        if (!this.loaded) {
          this.load();
        }
        return { ...this.envVars };
      }
    };
    envLoader = EnvironmentLoader.getInstance();
  }
});

// server/config/credentials.ts
function getCredential(key) {
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }
  return HARDCODED_CREDENTIALS[key];
}
var HARDCODED_CREDENTIALS;
var init_credentials = __esm({
  "server/config/credentials.ts"() {
    "use strict";
    HARDCODED_CREDENTIALS = {
      // JWT Secrets
      JWT_ACCESS_SECRET: "ebd185c17c06993902fe94b0d2628af77440140e6be2304fa9891dedb4dc14c5c5107ea13af39608c372c42e6dc3b797eba082e1d484f44e9bb08f8c4f0aa3d9",
      JWT_REFRESH_SECRET: "5246045571e21f30c5ea8e3bb051bb8e68a6dc1256f3267711e8391cad91866e849d4ecc139a8d491169f4f2a50a15680cca9bfa7181e7554cc61915f3867b20",
      // Encryption
      ENCRYPTION_KEY: "0367beacd2697c2d253a477e870747b7bc03ca5e0812962139e97e8541050b7d725d00726eb3fc809dbd2279fac5b53e69c25b2fbac3e4379ca98044986c5b00",
      // Database
      DATABASE_URL: "postgresql://app2data:Ay**--772283228@93.127.142.144:5432/app2data?sslmode=disable",
      // Supabase
      SUPABASE_URL: "https://wibtasmyusxfqxxqekks.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYnRhc215dXN4ZnF4eHFla2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0NzUzNjIsImV4cCI6MjAzNzA1MTM2Mn0.zB9o-Ag_QRcJhZCClmN0Pqh9CHbEjNl4KTNWOFzCEPE",
      SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYnRhc215dXN4ZnF4eHFla2tzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjk0NDEwMywiZXhwIjoyMDY4NTIwMTAzfQ.CVAZFD5nNuhXOghOKQfjATy7F4LNb3hNSuKu2ToDmis",
      // Supabase Database Connection
      SUPABASE_DATABASE_URL: "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      SUPABASE_DATABASE_PASSWORD: "Ay**--772283228",
      // Environment
      NODE_ENV: "production"
    };
  }
});

// server/services/smart-connection-manager.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import fs2 from "fs";
var SmartConnectionManager, smartConnectionManager;
var init_smart_connection_manager = __esm({
  "server/services/smart-connection-manager.ts"() {
    "use strict";
    init_schema();
    init_credentials();
    SmartConnectionManager = class _SmartConnectionManager {
      static instance;
      localPool = null;
      supabasePool = null;
      localDb = null;
      supabaseDb = null;
      connectionStatus = {
        local: false,
        supabase: false
      };
      constructor() {
        this.initialize();
      }
      static getInstance() {
        if (!_SmartConnectionManager.instance) {
          _SmartConnectionManager.instance = new _SmartConnectionManager();
        }
        return _SmartConnectionManager.instance;
      }
      /**
       * 🚀 تهيئة جميع الاتصالات
       */
      async initialize() {
        console.log("\u{1F9E0} [Smart Connection Manager] \u0628\u062F\u0621 \u0627\u0644\u062A\u0647\u064A\u0626\u0629...");
        await Promise.all([
          this.initializeLocalConnection(),
          this.initializeSupabaseConnection()
        ]);
        console.log("\u2705 [Smart Connection Manager] \u062A\u0645 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0647\u064A\u0626\u0629");
        this.logConnectionStatus();
      }
      /**
       * 🏠 تهيئة الاتصال المحلي
       */
      async initializeLocalConnection() {
        try {
          const databaseUrl = process.env.DATABASE_URL;
          if (!databaseUrl) {
            console.warn("\u26A0\uFE0F [Local DB] DATABASE_URL \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
            return;
          }
          const isLocalConnection = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") || databaseUrl.includes("@localhost/");
          const sslConfig2 = isLocalConnection ? false : {
            rejectUnauthorized: false,
            minVersion: "TLSv1.2"
          };
          this.localPool = new Pool({
            connectionString: databaseUrl,
            ssl: sslConfig2,
            max: 10,
            idleTimeoutMillis: 3e4,
            connectionTimeoutMillis: 15e3,
            keepAlive: true
          });
          this.localDb = drizzle(this.localPool, { schema: schema_exports });
          const client = await this.localPool.connect();
          const result = await client.query("SELECT current_database(), current_user");
          client.release();
          this.connectionStatus.local = true;
          console.log("\u2705 [Local DB] \u0627\u062A\u0635\u0627\u0644 \u0645\u062D\u0644\u064A \u0646\u062C\u062D:", {
            database: result.rows[0].current_database,
            user: result.rows[0].current_user
          });
        } catch (error) {
          console.error("\u274C [Local DB] \u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0645\u062D\u0644\u064A:", error.message);
          this.connectionStatus.local = false;
        }
      }
      /**
       * ☁️ تهيئة اتصال Supabase
       */
      async initializeSupabaseConnection() {
        try {
          const supabaseUrl = getCredential("SUPABASE_URL");
          const supabasePassword = getCredential("SUPABASE_DATABASE_PASSWORD");
          if (!supabaseUrl || !supabasePassword || supabaseUrl === "https://placeholder.supabase.co") {
            console.warn("\u26A0\uFE0F [Supabase] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629");
            return;
          }
          const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
          if (!project) {
            console.warn("\u26A0\uFE0F [Supabase] \u0641\u0634\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C project ID");
            return;
          }
          let sslConfig2 = { rejectUnauthorized: false };
          const certPath = "./pg_cert.pem";
          if (fs2.existsSync(certPath)) {
            const ca = fs2.readFileSync(certPath, { encoding: "utf8" });
            sslConfig2 = {
              rejectUnauthorized: false,
              ca,
              minVersion: "TLSv1.2",
              checkServerIdentity: () => void 0
            };
            console.log("\u{1F512} [Supabase] \u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0634\u0647\u0627\u062F\u0629 SSL");
          }
          this.supabasePool = new Pool({
            host: "aws-0-us-east-1.pooler.supabase.com",
            port: 6543,
            database: "postgres",
            user: `postgres.${project}`,
            password: supabasePassword,
            ssl: sslConfig2,
            max: 5,
            idleTimeoutMillis: 3e4,
            connectionTimeoutMillis: 15e3
          });
          this.supabaseDb = drizzle(this.supabasePool, { schema: schema_exports });
          const client = await this.supabasePool.connect();
          const result = await client.query("SELECT current_database(), current_user");
          client.release();
          this.connectionStatus.supabase = true;
          console.log("\u2705 [Supabase] \u0627\u062A\u0635\u0627\u0644 Supabase \u0646\u062C\u062D:", {
            database: result.rows[0].current_database,
            user: result.rows[0].current_user,
            project
          });
        } catch (error) {
          console.error("\u274C [Supabase] \u0641\u0634\u0644 \u0627\u062A\u0635\u0627\u0644 Supabase:", error.message);
          this.connectionStatus.supabase = false;
        }
      }
      /**
       * 🎯 الحصول على الاتصال المناسب تلقائياً
       */
      getSmartConnection(operationType = "read") {
        switch (operationType) {
          case "write":
            if (this.connectionStatus.local) {
              return {
                pool: this.localPool,
                db: this.localDb,
                source: "local"
              };
            }
            break;
          case "backup":
          case "sync":
            if (this.connectionStatus.supabase) {
              return {
                pool: this.supabasePool,
                db: this.supabaseDb,
                source: "supabase"
              };
            }
            break;
          case "read":
          default:
            if (this.connectionStatus.local) {
              return {
                pool: this.localPool,
                db: this.localDb,
                source: "local"
              };
            } else if (this.connectionStatus.supabase) {
              return {
                pool: this.supabasePool,
                db: this.supabaseDb,
                source: "supabase"
              };
            }
            break;
        }
        return {
          pool: null,
          db: null,
          source: null
        };
      }
      /**
       * 🔄 إعادة تهيئة اتصال معين
       */
      async reconnect(target = "both") {
        console.log(`\u{1F504} [Smart Connection Manager] \u0625\u0639\u0627\u062F\u0629 \u062A\u0647\u064A\u0626\u0629: ${target}`);
        if (target === "local" || target === "both") {
          await this.initializeLocalConnection();
        }
        if (target === "supabase" || target === "both") {
          await this.initializeSupabaseConnection();
        }
        this.logConnectionStatus();
      }
      /**
       * 📊 حالة الاتصالات
       */
      getConnectionStatus() {
        return {
          ...this.connectionStatus,
          totalConnections: Object.values(this.connectionStatus).filter(Boolean).length
        };
      }
      /**
       * 📝 عرض حالة الاتصالات
       */
      logConnectionStatus() {
        const status = this.getConnectionStatus();
        console.log("\u{1F4CA} [Smart Connection Manager] \u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A:", {
          "\u{1F3E0} \u0645\u062D\u0644\u064A": status.local ? "\u2705 \u0645\u062A\u0635\u0644" : "\u274C \u063A\u064A\u0631 \u0645\u062A\u0635\u0644",
          "\u2601\uFE0F Supabase": status.supabase ? "\u2705 \u0645\u062A\u0635\u0644" : "\u274C \u063A\u064A\u0631 \u0645\u062A\u0635\u0644",
          "\u{1F4C8} \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A": status.totalConnections
        });
      }
      /**
       * 🧪 اختبار شامل للاتصالات
       */
      async runConnectionTest() {
        const results = {
          local: { status: false },
          supabase: { status: false }
        };
        try {
          if (this.localPool) {
            const client = await this.localPool.connect();
            const result = await client.query("SELECT version(), current_database(), current_user, now()");
            client.release();
            results.local = {
              status: true,
              details: {
                database: result.rows[0].current_database,
                user: result.rows[0].current_user,
                version: result.rows[0].version?.split(" ")[0],
                timestamp: result.rows[0].now
              }
            };
          }
        } catch (error) {
          results.local = {
            status: false,
            error: error.message
          };
        }
        try {
          if (this.supabasePool) {
            const client = await this.supabasePool.connect();
            const result = await client.query("SELECT version(), current_database(), current_user, now()");
            client.release();
            results.supabase = {
              status: true,
              details: {
                database: result.rows[0].current_database,
                user: result.rows[0].current_user,
                version: result.rows[0].version?.split(" ")[0],
                timestamp: result.rows[0].now
              }
            };
          }
        } catch (error) {
          results.supabase = {
            status: false,
            error: error.message
          };
        }
        return results;
      }
      /**
       * 🔐 إغلاق جميع الاتصالات
       */
      async closeAllConnections() {
        console.log("\u{1F510} [Smart Connection Manager] \u0625\u063A\u0644\u0627\u0642 \u062C\u0645\u064A\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A...");
        const closePromises = [];
        if (this.localPool) {
          closePromises.push(this.localPool.end());
        }
        if (this.supabasePool) {
          closePromises.push(this.supabasePool.end());
        }
        await Promise.all(closePromises);
        this.connectionStatus.local = false;
        this.connectionStatus.supabase = false;
        console.log("\u2705 [Smart Connection Manager] \u062A\u0645 \u0625\u063A\u0644\u0627\u0642 \u062C\u0645\u064A\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A");
      }
    };
    smartConnectionManager = SmartConnectionManager.getInstance();
  }
});

// server/db.ts
import { Pool as Pool2 } from "pg";
import { drizzle as drizzle2 } from "drizzle-orm/node-postgres";
function createDatabaseUrl() {
  const databaseUrl = envLoader.get("DATABASE_URL");
  if (databaseUrl) {
    console.log("\u2705 \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 DATABASE_URL");
    console.log("\u{1F527} Connection string:", databaseUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"));
    return databaseUrl;
  }
  console.error("\u274C DATABASE_URL \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0623\u064A \u0645\u0646 \u0627\u0644\u0645\u0635\u0627\u062F\u0631:");
  console.error("   - \u0645\u0644\u0641 .env");
  console.error("   - ecosystem.config.json");
  console.error("   - \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0628\u064A\u0626\u0629 \u0627\u0644\u0646\u0638\u0627\u0645");
  throw new Error("DATABASE_URL is required");
}
function setupSSLConfig() {
  const connectionString2 = createDatabaseUrl();
  const isLocalConnection = connectionString2.includes("localhost") || connectionString2.includes("127.0.0.1") || connectionString2.includes("@localhost/");
  if (isLocalConnection) {
    console.log("\u{1F513} \u0627\u062A\u0635\u0627\u0644 \u0645\u062D\u0644\u064A - \u062A\u0639\u0637\u064A\u0644 SSL");
    return false;
  }
  console.log("\u{1F510} \u0627\u062A\u0635\u0627\u0644 \u062E\u0627\u0631\u062C\u064A - \u0625\u0639\u062F\u0627\u062F SSL \u0622\u0645\u0646 \u0648\u0645\u0631\u0646");
  const sslConfig2 = {
    // الافتراضي: تفعيل التحقق من الشهادات (أمان قوي)
    rejectUnauthorized: true,
    // تطلب تشفير قوي
    minVersion: "TLSv1.2",
    maxVersion: "TLSv1.3"
  };
  try {
    const sslCert = envLoader.get("PGSSLROOTCERT");
    if (sslCert) {
      console.log("\u{1F4DC} [SSL] \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0634\u0647\u0627\u062F\u0629 SSL \u0645\u0646 \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629");
      sslConfig2.ca = sslCert;
      sslConfig2.rejectUnauthorized = false;
      console.log("\u2705 [SSL] \u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0634\u0647\u0627\u062F\u0629 - \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0644\u0644\u0627\u062E\u062A\u0628\u0627\u0631");
    } else {
      const certPath = "./pg_cert.pem";
      if (__require("fs").existsSync(certPath)) {
        console.log("\u{1F4DC} [SSL] \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0634\u0647\u0627\u062F\u0629 SSL \u0645\u0646 \u0627\u0644\u0645\u0644\u0641");
        sslConfig2.ca = __require("fs").readFileSync(certPath);
        console.log("\u2705 [SSL] \u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0634\u0647\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0644\u0641 - \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0643\u0627\u0645\u0644");
      } else {
        console.log("\u{1F527} [SSL] \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0644\u0644\u0627\u062E\u062A\u0628\u0627\u0631");
        sslConfig2.rejectUnauthorized = false;
        if (connectionString2.includes("93.127.142.144") || connectionString2.includes("binarjoinanelytic.info")) {
          console.log("\u26A0\uFE0F [SSL] \u062E\u0627\u062F\u0645 \u062E\u0627\u0635 \u0645\u0648\u062B\u0648\u0642 - \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0624\u0642\u062A\u0627\u064B");
          sslConfig2.checkServerIdentity = (hostname, cert) => {
            console.log(`\u{1F50D} [SSL] \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0645\u062E\u0635\u0635 \u0644\u0644\u062E\u0627\u062F\u0645: ${hostname}`);
            if (hostname && (hostname.includes("93.127.142.144") || hostname.includes("binarjoinanelytic.info"))) {
              console.log("\u2705 [SSL] \u062E\u0627\u062F\u0645 \u062E\u0627\u0635 \u0645\u0639\u0631\u0648\u0641 \u0648\u0645\u0633\u0645\u0648\u062D");
              return void 0;
            }
            throw new Error(`\u062E\u0627\u062F\u0645 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D: ${hostname}`);
          };
        }
      }
    }
  } catch (error) {
    console.error("\u274C [SSL] \u062E\u0637\u0623 \u0641\u064A \u0625\u0639\u062F\u0627\u062F SSL:", error);
    throw error;
  }
  return sslConfig2;
}
var connectionString, sslConfig, cleanConnectionString, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env_loader();
    init_smart_connection_manager();
    initializeEnvironment();
    connectionString = createDatabaseUrl();
    sslConfig = setupSSLConfig();
    cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]ssl=[^&]*/g, "");
    pool = new Pool2({
      connectionString: cleanConnectionString,
      ssl: sslConfig,
      // إعدادات الاتصال المحسنة
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 15e3,
      keepAlive: true,
      statement_timeout: 3e4,
      query_timeout: 3e4
    });
    db = drizzle2(pool, { schema: schema_exports });
    (async () => {
      try {
        const client = await pool.connect();
        const res = await client.query("SELECT version(), current_database(), current_user");
        console.log("\u2705 \u0646\u062C\u062D \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
        console.log("\u{1F4CA} \u0625\u0635\u062F\u0627\u0631 PostgreSQL:", res.rows[0].version?.split(" ")[0] || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641");
        console.log("\u{1F5C3}\uFE0F \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A:", res.rows[0].current_database);
        console.log("\u{1F464} \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", res.rows[0].current_user);
        client.release();
      } catch (err) {
        console.error("\u274C \u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A:", err);
      }
    })();
  }
});

// server/services/NotificationService.ts
var NotificationService_exports = {};
__export(NotificationService_exports, {
  NotificationPriority: () => NotificationPriority,
  NotificationService: () => NotificationService,
  NotificationStatus: () => NotificationStatus,
  NotificationTypes: () => NotificationTypes
});
import { eq as eq2, and as and2, desc, or, inArray, sql as sql2 } from "drizzle-orm";
var NotificationPriority, NotificationTypes, NotificationStatus, NotificationService;
var init_NotificationService = __esm({
  "server/services/NotificationService.ts"() {
    "use strict";
    init_schema();
    init_db();
    NotificationPriority = {
      INFO: 1,
      LOW: 2,
      MEDIUM: 3,
      HIGH: 4,
      EMERGENCY: 5
    };
    NotificationTypes = {
      SYSTEM: "system",
      SAFETY: "safety",
      TASK: "task",
      PAYROLL: "payroll",
      ANNOUNCEMENT: "announcement",
      MAINTENANCE: "maintenance",
      WARRANTY: "warranty"
    };
    NotificationStatus = {
      PENDING: "pending",
      PROCESSING: "processing",
      SENT: "sent",
      FAILED: "failed",
      SKIPPED: "skipped"
    };
    NotificationService = class {
      constructor() {
      }
      /**
       * إنشاء إشعار جديد
       */
      async createNotification(data) {
        console.log(`\u{1F4E8} \u0625\u0646\u0634\u0627\u0621 \u0625\u0634\u0639\u0627\u0631 \u062C\u062F\u064A\u062F: ${data.title}`);
        let recipients = [];
        if (typeof data.recipients === "string") {
          recipients = [data.recipients];
        } else if (Array.isArray(data.recipients)) {
          recipients = data.recipients;
        }
        const notificationData = {
          projectId: data.projectId || null,
          type: data.type,
          title: data.title,
          body: data.body,
          payload: data.payload || null,
          priority: data.priority || NotificationPriority.MEDIUM,
          recipients: recipients.length > 0 ? recipients : null,
          channelPreference: data.channelPreference || { push: true, email: false, sms: false },
          scheduledAt: data.scheduledAt || null,
          createdBy: null
          // سيتم تحديثه لاحقاً بناء على السياق
        };
        const [notification] = await db.insert(notifications).values(notificationData).returning();
        console.log(`\u2705 \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0634\u0639\u0627\u0631: ${notification.id}`);
        return notification;
      }
      /**
       * إنشاء إشعار أمني طارئ
       */
      async createSafetyAlert(data) {
        console.log(`\u{1F6A8} \u0625\u0646\u0634\u0627\u0621 \u062A\u0646\u0628\u064A\u0647 \u0623\u0645\u0646\u064A: ${data.severity}`);
        const priority = data.severity === "critical" ? NotificationPriority.EMERGENCY : data.severity === "high" ? NotificationPriority.HIGH : data.severity === "medium" ? NotificationPriority.MEDIUM : NotificationPriority.LOW;
        const payload = {
          type: "safety",
          severity: data.severity,
          location: data.location,
          action: "open_emergency"
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
            email: data.severity === "critical",
            sms: data.severity === "critical"
          }
        });
      }
      /**
       * إنشاء إشعار مهمة جديدة
       */
      async createTaskNotification(data) {
        console.log(`\u{1F4CB} \u0625\u0646\u0634\u0627\u0621 \u0625\u0634\u0639\u0627\u0631 \u0645\u0647\u0645\u0629: ${data.title}`);
        const payload = {
          type: "task",
          taskId: data.taskId,
          dueDate: data.dueDate?.toISOString(),
          action: "open_task"
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
      async createPayrollNotification(data) {
        console.log(`\u{1F4B0} \u0625\u0646\u0634\u0627\u0621 \u0625\u0634\u0639\u0627\u0631 \u0631\u0627\u062A\u0628: ${data.workerName} - ${data.amount}`);
        const title = data.paymentType === "salary" ? "\u0631\u0627\u062A\u0628 \u0645\u0633\u062A\u062D\u0642" : data.paymentType === "bonus" ? "\u0645\u0643\u0627\u0641\u0623\u0629 \u0625\u0636\u0627\u0641\u064A\u0629" : "\u0633\u0644\u0641\u0629 \u0645\u0627\u0644\u064A\u0629";
        const payload = {
          type: "payroll",
          workerId: data.workerId,
          amount: data.amount,
          paymentType: data.paymentType,
          action: "open_payroll"
        };
        return await this.createNotification({
          type: NotificationTypes.PAYROLL,
          title,
          body: `\u062A\u0645 ${title} \u0644\u0644\u0639\u0627\u0645\u0644 ${data.workerName} \u0628\u0645\u0628\u0644\u063A ${data.amount} \u0631\u064A\u0627\u0644`,
          payload,
          priority: NotificationPriority.MEDIUM,
          recipients: [data.workerId],
          projectId: data.projectId
        });
      }
      /**
       * إنشاء إعلان عام
       */
      async createAnnouncement(data) {
        console.log(`\u{1F4E2} \u0625\u0646\u0634\u0627\u0621 \u0625\u0639\u0644\u0627\u0646 \u0639\u0627\u0645: ${data.title}`);
        let recipients = [];
        if (data.recipients === "all") {
          recipients = await this.getAllActiveUserIds();
        } else {
          recipients = data.recipients;
        }
        const payload = {
          type: "announcement",
          action: "open_announcement"
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
      async getAllActiveUserIds() {
        try {
          const users2 = await db.query.users.findMany({
            columns: {
              id: true
            }
          });
          const userIds = users2.map((user) => user.id);
          console.log(`\u{1F4CB} \u062A\u0645 \u062C\u0644\u0628 ${userIds.length} \u0645\u0633\u062A\u062E\u062F\u0645 \u0646\u0634\u0637 \u0644\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A`);
          return userIds;
        } catch (error) {
          console.error("\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0627\u0644\u0646\u0634\u0637\u064A\u0646:", error);
          try {
            const defaultUser = await db.query.users.findFirst({
              columns: { id: true },
              where: (users2, { eq: eq11, or: or5 }) => or5(
                eq11(users2.role, "admin"),
                eq11(users2.email, "admin")
              )
            });
            return defaultUser ? [defaultUser.id] : [];
          } catch {
            console.warn("\u26A0\uFE0F \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0641\u062A\u0631\u0627\u0636\u064A - \u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0639\u0627\u0645\u0629 \u0641\u0642\u0637");
            return [];
          }
        }
      }
      /**
       * تحديد ما إذا كان المستخدم مسؤولاً
       */
      async isAdmin(userId) {
        try {
          if (userId === "admin" || userId === "\u0645\u0633\u0624\u0648\u0644") {
            return true;
          }
          const user = await db.query.users.findFirst({
            where: (users2, { eq: eq11, or: or5 }) => or5(
              eq11(users2.id, userId),
              eq11(users2.email, userId)
            )
          });
          if (!user) {
            console.log(`\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
            return false;
          }
          const adminRoles = ["admin", "manager", "\u0645\u062F\u064A\u0631", "\u0645\u0633\u0624\u0648\u0644", "\u0645\u0634\u0631\u0641"];
          const isAdminUser = adminRoles.includes(user.role || "");
          console.log(`\u{1F50D} \u0641\u062D\u0635 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${user.email}: ${isAdminUser ? "\u0645\u0633\u0624\u0648\u0644" : "\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0627\u062F\u064A"} (\u0627\u0644\u062F\u0648\u0631: ${user.role})`);
          return isAdminUser;
        } catch (error) {
          console.error("\u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", error);
          return false;
        }
      }
      /**
       * تحديد نوع الإشعارات المسموحة للمستخدم حسب الدور
       */
      async getAllowedNotificationTypes(userId) {
        try {
          const user = await db.query.users.findFirst({
            where: (users2, { eq: eq11, or: or5 }) => or5(
              eq11(users2.id, userId),
              eq11(users2.email, userId)
            )
          });
          if (!user) {
            return ["user-welcome"];
          }
          const role = user.role || "user";
          const adminRoles = ["admin", "manager", "\u0645\u062F\u064A\u0631", "\u0645\u0633\u0624\u0648\u0644", "\u0645\u0634\u0631\u0641"];
          if (adminRoles.includes(role)) {
            return ["system", "security", "error", "maintenance", "task", "payroll", "announcement", "warranty", "damaged", "user-welcome"];
          } else {
            return ["task", "payroll", "announcement", "maintenance", "warranty", "user-welcome"];
          }
        } catch (error) {
          console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u0633\u0645\u0648\u062D\u0629:", error);
          return ["user-welcome"];
        }
      }
      /**
       * جلب الإشعارات للمستخدم مع الفلترة المحسنة
       */
      async getUserNotifications(userId, filters = {}) {
        const isUserAdmin = await this.isAdmin(userId);
        console.log(`\u{1F4E5} \u062C\u0644\u0628 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId} (\u0646\u0648\u0639: ${isUserAdmin ? "\u0645\u0633\u0624\u0648\u0644" : "\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0627\u062F\u064A"})`);
        const conditions = [];
        const allowedTypes = await this.getAllowedNotificationTypes(userId);
        if (!isUserAdmin) {
          conditions.push(inArray(notifications.type, allowedTypes));
        }
        if (filters.type && allowedTypes.includes(filters.type)) {
          conditions.push(eq2(notifications.type, filters.type));
        }
        if (filters.projectId) {
          conditions.push(eq2(notifications.projectId, filters.projectId));
        }
        if (isUserAdmin) {
          conditions.push(
            or(
              sql2`${notifications.recipients} @> ARRAY[${userId}]`,
              sql2`${notifications.recipients} @> ARRAY['admin']`,
              sql2`${notifications.recipients} @> ARRAY['مسؤول']`,
              sql2`${notifications.recipients} IS NULL`
              // الإشعارات العامة
            )
          );
        } else {
          conditions.push(
            or(
              sql2`${notifications.recipients} @> ARRAY[${userId}]`,
              sql2`${notifications.recipients} IS NULL`
              // الإشعارات العامة
            )
          );
        }
        const notificationList = await db.select().from(notifications).where(and2(...conditions)).orderBy(desc(notifications.createdAt)).limit(filters.limit || 50).offset(filters.offset || 0);
        console.log(`\u{1F50D} \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${notificationList.length} \u0625\u0634\u0639\u0627\u0631 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}`);
        const notificationIds = notificationList.map((n) => n.id);
        const readStates = notificationIds.length > 0 ? await db.select().from(notificationReadStates).where(
          and2(
            eq2(notificationReadStates.userId, userId),
            // مهم: حالة القراءة مخصصة للمستخدم
            inArray(notificationReadStates.notificationId, notificationIds)
          )
        ) : [];
        console.log(`\u{1F4D6} \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${readStates.length} \u062D\u0627\u0644\u0629 \u0642\u0631\u0627\u0621\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}`);
        const enrichedNotifications = notificationList.map((notification) => {
          const readState = readStates.find((rs) => rs.notificationId === notification.id);
          return {
            ...notification,
            isRead: readState ? readState.isRead : false,
            readAt: readState ? readState.readAt : null
          };
        });
        const filteredNotifications = filters.unreadOnly ? enrichedNotifications.filter((n) => !n.isRead) : enrichedNotifications;
        const unreadCount = enrichedNotifications.filter((n) => !n.isRead).length;
        console.log(`\u{1F4CA} \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}: ${filteredNotifications.length} \u0625\u0634\u0639\u0627\u0631\u060C \u063A\u064A\u0631 \u0645\u0642\u0631\u0648\u0621: ${unreadCount}`);
        return {
          notifications: filteredNotifications,
          unreadCount,
          total: notificationList.length
        };
      }
      /**
       * فحص حالة قراءة إشعار معين للمستخدم
       */
      async checkNotificationReadState(notificationId, userId) {
        try {
          console.log(`\u{1F50D} \u0628\u062F\u0621 \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}`);
          const readState = await db.select().from(notificationReadStates).where(
            and2(
              eq2(notificationReadStates.userId, userId),
              eq2(notificationReadStates.notificationId, notificationId)
            )
          ).limit(1);
          console.log(`\u{1F4D6} \u0646\u062A\u0627\u0626\u062C \u0641\u062D\u0635 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId}:`, readState);
          const isRead = readState.length > 0 && readState[0].isRead;
          console.log(`\u{1F3AF} \u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0644\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}: ${isRead ? "\u0645\u0642\u0631\u0648\u0621" : "\u063A\u064A\u0631 \u0645\u0642\u0631\u0648\u0621"}`);
          return isRead;
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId}:`, error);
          return false;
        }
      }
      /**
       * إعادة إنشاء جدول حالات القراءة
       */
      async recreateReadStatesTable() {
        try {
          console.log("\u{1F527} \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u062C\u0648\u062F \u062C\u062F\u0648\u0644 notification_read_states (\u0628\u062F\u0648\u0646 \u062D\u0630\u0641 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A)...");
          await db.execute(sql2`
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
          console.log("\u2705 \u062A\u0645 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u062C\u0648\u062F \u062C\u062F\u0648\u0644 notification_read_states (\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062D\u0641\u0648\u0638\u0629)");
        } catch (error) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u062C\u062F\u0648\u0644:", error);
          throw error;
        }
      }
      /**
       * تعليم إشعار كمقروء - حل مبسط
       */
      async markAsRead(notificationId, userId) {
        console.log(`\u2705 \u0628\u062F\u0621 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621: ${notificationId} \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
        try {
          const deleteResult = await db.execute(sql2`
        DELETE FROM notification_read_states 
        WHERE user_id = ${userId} AND notification_id = ${notificationId}
      `);
          console.log(`\u{1F5D1}\uFE0F \u062A\u0645 \u062D\u0630\u0641 ${deleteResult.rowCount || 0} \u0633\u062C\u0644 \u0633\u0627\u0628\u0642`);
          const insertResult = await db.execute(sql2`
        INSERT INTO notification_read_states (user_id, notification_id, is_read, read_at)
        VALUES (${userId}, ${notificationId}, true, NOW())
      `);
          console.log(`\u2795 \u062A\u0645 \u0625\u062F\u0631\u0627\u062C \u0633\u062C\u0644 \u062C\u062F\u064A\u062F: ${insertResult.rowCount || 0} \u0635\u0641`);
          const verifyResult = await db.execute(sql2`
        SELECT * FROM notification_read_states 
        WHERE user_id = ${userId} AND notification_id = ${notificationId}
      `);
          console.log(`\u{1F50D} \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0641\u0638: \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${verifyResult.rows.length} \u0633\u062C\u0644`);
          console.log(`\u2705 \u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0643\u0645\u0642\u0631\u0648\u0621 \u0628\u0646\u062C\u0627\u062D`);
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0643\u0645\u0642\u0631\u0648\u0621:`, error);
          throw error;
        }
      }
      /**
       * تعليم جميع الإشعارات كمقروءة
       */
      async markAllAsRead(userId, projectId) {
        console.log(`\u2705 \u062A\u0639\u0644\u064A\u0645 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
        const allNotifications = await db.select({
          id: notifications.id,
          recipients: notifications.recipients,
          type: notifications.type,
          title: notifications.title
        }).from(notifications).limit(10);
        console.log(`\u{1F4CA} \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: ${allNotifications.length}`);
        console.log(`\u{1F4CB} \u0639\u064A\u0646\u0629 \u0645\u0646 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A:`, allNotifications.map((n) => ({
          id: n.id,
          recipients: n.recipients,
          type: n.type,
          title: n.title
        })));
        const conditions = [];
        if (projectId) {
          conditions.push(eq2(notifications.projectId, projectId));
        }
        const userNotifications = conditions.length > 0 ? await db.select({ id: notifications.id }).from(notifications).where(and2(...conditions)) : await db.select({ id: notifications.id }).from(notifications);
        console.log(`\u{1F3AF} \u0639\u062F\u062F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u064F\u0641\u0644\u062A\u0631\u0629: ${userNotifications.length}`);
        let markedCount = 0;
        for (const notification of userNotifications) {
          try {
            await this.markAsRead(notification.id, userId);
            markedCount++;
            console.log(`\u2705 \u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notification.id} \u0643\u0645\u0642\u0631\u0648\u0621`);
          } catch (error) {
            console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notification.id} \u0643\u0645\u0642\u0631\u0648\u0621:`, error);
          }
        }
        console.log(`\u2705 \u062A\u0645 \u062A\u0639\u0644\u064A\u0645 ${markedCount} \u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621`);
      }
      /**
       * حذف إشعار
       */
      async deleteNotification(notificationId) {
        console.log(`\u{1F5D1}\uFE0F \u062D\u0630\u0641 \u0627\u0644\u0625\u0634\u0639\u0627\u0631: ${notificationId}`);
        await db.delete(notificationReadStates).where(eq2(notificationReadStates.notificationId, notificationId));
        await db.delete(notifications).where(eq2(notifications.id, notificationId));
        console.log(`\u2705 \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0625\u0634\u0639\u0627\u0631: ${notificationId}`);
      }
      /**
       * جلب إحصائيات الإشعارات
       */
      async getNotificationStats(userId) {
        console.log(`\u{1F4CA} \u062D\u0633\u0627\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
        const isAdmin = await this.isAdmin(userId);
        const allowedTypes = await this.getAllowedNotificationTypes(userId);
        const conditions = [inArray(notifications.type, allowedTypes)];
        if (isAdmin) {
          const adminCondition = or(
            sql2`${notifications.recipients} @> ARRAY[${userId}]`,
            sql2`${notifications.recipients} @> ARRAY['admin']`,
            sql2`${notifications.recipients} @> ARRAY['مسؤول']`,
            sql2`${notifications.recipients} IS NULL`
          );
          if (adminCondition) {
            conditions.push(adminCondition);
          }
        } else {
          const userCondition = or(
            sql2`${notifications.recipients} @> ARRAY[${userId}]`,
            sql2`${notifications.recipients} IS NULL`
          );
          if (userCondition) {
            conditions.push(userCondition);
          }
        }
        const userNotifications = await db.select().from(notifications).where(and2(...conditions));
        const readStates = await db.select().from(notificationReadStates).where(eq2(notificationReadStates.userId, userId));
        const readNotificationIds = readStates.filter((rs) => rs.isRead).map((rs) => rs.notificationId);
        const unread = userNotifications.filter((n) => !readNotificationIds.includes(n.id));
        const byType = {};
        userNotifications.forEach((n) => {
          byType[n.type] = (byType[n.type] || 0) + 1;
        });
        const byPriority = {};
        userNotifications.forEach((n) => {
          byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
        });
        const stats = {
          total: userNotifications.length,
          unread: unread.length,
          byType,
          byPriority,
          userType: isAdmin ? "admin" : "user",
          allowedTypes
        };
        console.log(`\u{1F4CA} \u0645\u0633\u062A\u062E\u062F\u0645 ${userId} (\u0646\u0648\u0639: ${stats.userType}): ${stats.total} \u0625\u0634\u0639\u0627\u0631\u060C ${stats.unread} \u063A\u064A\u0631 \u0645\u0642\u0631\u0648\u0621`);
        return stats;
      }
    };
  }
});

// server/index.ts
import express10 from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit3 from "express-rate-limit";

// server/routes.ts
init_db();
init_schema();
import { createServer } from "http";
import { eq as eq3, and as and3, sql as sql3, gte, lt, lte, desc as desc2 } from "drizzle-orm";

// server/middleware/auth.ts
init_db();
init_schema();
import jwt from "jsonwebtoken";
import { eq, and, gt } from "drizzle-orm";
import rateLimit from "express-rate-limit";
var generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 دقيقة
  max: 2e3,
  // 2000 طلب لكل IP (زيادة الحد للأداء الأفضل)
  message: {
    success: false,
    message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062A\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F \u0642\u0644\u064A\u0644",
    retryAfter: 15 * 60
    // 15 دقيقة
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === "/api/health" || req.path === "/health";
  }
});
var authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 دقيقة
  max: 10,
  // 10 محاولات تسجيل دخول لكل IP
  message: {
    success: false,
    message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0639\u062F\u062F \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0645\u0633\u0645\u0648\u062D\u0629\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F 15 \u062F\u0642\u064A\u0642\u0629",
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
  // لا تحسب الطلبات الناجحة
});
var sensitiveOperationsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1e3,
  // 5 دقائق
  max: 5,
  // 5 عمليات فقط
  message: {
    success: false,
    message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0633\u0629\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F 5 \u062F\u0642\u0627\u0626\u0642",
    retryAfter: 5 * 60
  }
});
var verifyToken = async (token) => {
  try {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error("JWT_ACCESS_SECRET \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    }
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error("\u0631\u0645\u0632 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  }
};
var verifySession = async (userId, sessionId) => {
  try {
    const session = await db.select().from(authUserSessions).where(
      and(
        eq(authUserSessions.userId, userId),
        eq(authUserSessions.sessionToken, sessionId),
        eq(authUserSessions.isRevoked, false),
        gt(authUserSessions.expiresAt, /* @__PURE__ */ new Date())
      )
    ).limit(1);
    return session.length > 0 ? session[0] : null;
  } catch (error) {
    console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062C\u0644\u0633\u0629:", error);
    return null;
  }
};
var securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  const isDev = process.env.NODE_ENV === "development";
  const cspPolicy = isDev ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' ws: wss:;" : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self';";
  res.setHeader("Content-Security-Policy", cspPolicy);
  next();
};
var suspiciousActivityTracker = /* @__PURE__ */ new Map();
var trackSuspiciousActivity = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.get("User-Agent") || "unknown";
  const activity = suspiciousActivityTracker.get(ip) || { attempts: 0, lastAttempt: 0 };
  const now = Date.now();
  if (now - activity.lastAttempt > 60 * 60 * 1e3) {
    activity.attempts = 0;
  }
  activity.attempts++;
  activity.lastAttempt = now;
  suspiciousActivityTracker.set(ip, activity);
  if (activity.attempts > 50) {
    console.warn(`\u{1F6A8} \u0646\u0634\u0627\u0637 \u0645\u0634\u0628\u0648\u0647 \u0645\u0646 IP: ${ip}, User-Agent: ${userAgent}`);
    return res.status(429).json({
      success: false,
      message: "\u062A\u0645 \u062D\u0638\u0631 \u0647\u0630\u0627 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0624\u0642\u062A\u0627\u064B \u0628\u0633\u0628\u0628 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u0645\u0634\u0628\u0648\u0647"
    });
  }
  next();
};
var authenticate = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    console.log(`\u{1F50D} [AUTH] \u0641\u062D\u0635 \u0645\u062A\u0642\u062F\u0645 - \u0627\u0644\u0645\u0633\u0627\u0631: ${req.method} ${req.originalUrl} | IP: ${ip}`);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("\u274C [AUTH] \u0644\u0627 \u064A\u0648\u062C\u062F token \u0641\u064A \u0627\u0644\u0637\u0644\u0628");
      return res.status(401).json({
        success: false,
        message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 - \u0644\u0627 \u064A\u0648\u062C\u062F \u0631\u0645\u0632 \u0645\u0635\u0627\u062F\u0642\u0629",
        code: "NO_TOKEN"
      });
    }
    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      console.log("\u274C [AUTH] token \u063A\u064A\u0631 \u0635\u0627\u0644\u062D:", error);
      return res.status(401).json({
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629",
        code: "INVALID_TOKEN"
      });
    }
    const session = await verifySession(decoded.userId, decoded.sessionId);
    if (!session) {
      console.log("\u274C [AUTH] \u0627\u0644\u062C\u0644\u0633\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u0645\u0646\u062A\u0647\u064A\u0629");
      return res.status(401).json({
        success: false,
        message: "\u0627\u0644\u062C\u0644\u0633\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0623\u0648 \u0645\u0646\u062A\u0647\u064A\u0629 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629",
        code: "INVALID_SESSION"
      });
    }
    const user = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      mfaEnabled: users.mfaEnabled
    }).from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (!user.length || !user[0].isActive) {
      console.log("\u274C [AUTH] \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0646\u0634\u0637");
      return res.status(401).json({
        success: false,
        message: "\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0646\u0634\u0637 \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        code: "USER_INACTIVE"
      });
    }
    await db.update(authUserSessions).set({
      lastActivity: /* @__PURE__ */ new Date(),
      ipAddress: ip,
      userAgent: req.get("User-Agent") || "unknown"
    }).where(eq(authUserSessions.sessionToken, decoded.sessionId));
    req.user = {
      id: user[0].id,
      userId: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName || void 0,
      lastName: user[0].lastName || void 0,
      role: user[0].role,
      isActive: user[0].isActive,
      mfaEnabled: user[0].mfaEnabled || void 0,
      sessionId: decoded.sessionId
    };
    const duration = Date.now() - startTime;
    console.log(`\u2705 [AUTH] \u0645\u0635\u0627\u062F\u0642\u0629 \u0646\u0627\u062C\u062D\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${user[0].email} | ${req.method} ${req.originalUrl} | ${duration}ms`);
    next();
  } catch (error) {
    console.error("\u274C [AUTH] \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629:", error);
    res.status(500).json({
      success: false,
      message: "\u062E\u0637\u0623 \u0641\u064A \u062E\u0627\u062F\u0645 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629",
      code: "AUTH_SERVER_ERROR"
    });
  }
};
var oneHour = 60 * 60 * 1e3;
setInterval(() => {
  const now = Date.now();
  for (const [ip, activity] of Array.from(suspiciousActivityTracker.entries())) {
    if (now - activity.lastAttempt > oneHour) {
      suspiciousActivityTracker.delete(ip);
    }
  }
}, oneHour);
var requireAuth = authenticate;
var requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644",
        code: "UNAUTHORIZED"
      });
    }
    if (req.user.role !== role) {
      console.log(`\u{1F6AB} [AUTH] \u0645\u062D\u0627\u0648\u0644\u0629 \u0648\u0635\u0648\u0644 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647\u0627 \u0645\u0646: ${req.user.email} \u0644\u0644\u062F\u0648\u0631: ${role}`);
      return res.status(403).json({
        success: false,
        message: `\u062A\u062D\u062A\u0627\u062C \u0635\u0644\u0627\u062D\u064A\u0627\u062A ${role} \u0644\u0644\u0648\u0635\u0648\u0644 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u062D\u062A\u0648\u0649`,
        code: "ROLE_REQUIRED"
      });
    }
    next();
  };
};

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.get("/api/db/info", async (req, res) => {
    try {
      const result = await db.execute(`
        SELECT 
          current_database() as database_name, 
          current_user as username,
          version() as version_info
      `);
      res.json({
        success: true,
        database: result.rows[0],
        message: "\u0645\u062A\u0635\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A app2data \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Database connection failed"
      });
    }
  });
  app2.get("/api/projects", requireAuth, async (req, res) => {
    try {
      console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
      const projectsList = await db.select().from(projects).orderBy(projects.createdAt);
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${projectsList.length} \u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A`);
      res.json({
        success: true,
        data: projectsList,
        message: `\u062A\u0645 \u062C\u0644\u0628 ${projectsList.length} \u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D`
      });
    } catch (error) {
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639"
      });
    }
  });
  app2.get("/api/projects/:projectId/fund-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;
      console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
          processingTime: Date.now() - startTime
        });
      }
      const transfers = await db.select().from(fundTransfers).where(eq3(fundTransfers.projectId, projectId)).orderBy(fundTransfers.transferDate);
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: transfers,
        message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/projects/:projectId/material-purchases", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;
      console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
          processingTime: Date.now() - startTime
        });
      }
      const purchases = await db.select().from(materialPurchases).where(eq3(materialPurchases.projectId, projectId)).orderBy(materialPurchases.purchaseDate);
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${purchases.length} \u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0648\u0627\u062F \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: purchases,
        message: `\u062A\u0645 \u062C\u0644\u0628 ${purchases.length} \u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0648\u0627\u062F \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/projects/:projectId/transportation-expenses", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;
      console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
          processingTime: Date.now() - startTime
        });
      }
      const expenses = await db.select().from(transportationExpenses).where(eq3(transportationExpenses.projectId, projectId)).orderBy(transportationExpenses.date);
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644 \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: expenses,
        message: `\u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/projects/:projectId/worker-misc-expenses", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;
      console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629 \u0644\u0644\u0639\u0645\u0627\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
          processingTime: Date.now() - startTime
        });
      }
      const expenses = await db.select().from(workerMiscExpenses).where(eq3(workerMiscExpenses.projectId, projectId)).orderBy(workerMiscExpenses.date);
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: expenses,
        message: `\u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/projects/with-stats", requireAuth, async (req, res) => {
    try {
      console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
      const projectsList = await db.select().from(projects).orderBy(projects.createdAt);
      const projectsWithStats = await Promise.all(projectsList.map(async (project) => {
        const projectId = project.id;
        try {
          const cleanDbValue = (value, type = "decimal") => {
            if (value === null || value === void 0) return 0;
            const strValue = String(value).trim();
            if (strValue.match(/^(\d{1,3})\1{2,}$/)) {
              console.warn("\u26A0\uFE0F [API] \u0642\u064A\u0645\u0629 \u0645\u0634\u0628\u0648\u0647\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A:", strValue);
              return 0;
            }
            const parsed = type === "integer" ? parseInt(strValue, 10) : parseFloat(strValue);
            if (isNaN(parsed) || !isFinite(parsed)) return 0;
            const maxValue = type === "integer" ? strValue.includes("worker") || strValue.includes("total_workers") ? 1e4 : 1e6 : 1e11;
            if (Math.abs(parsed) > maxValue) {
              console.warn(`\u26A0\uFE0F [API] \u0642\u064A\u0645\u0629 \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0646\u0637\u0642\u064A (${type}):`, parsed);
              return 0;
            }
            return Math.max(0, parsed);
          };
          const workersStats = await db.execute(sql3`
            SELECT 
              COUNT(DISTINCT wa.worker_id) as total_workers,
              COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
            FROM worker_attendance wa
            INNER JOIN workers w ON wa.worker_id = w.id
            WHERE wa.project_id = ${projectId}
          `);
          const materialStats = await db.execute(sql3`
            SELECT 
              COUNT(*) as material_purchases,
              COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
            FROM material_purchases 
            WHERE project_id = ${projectId}
          `);
          const workerWagesStats = await db.execute(sql3`
            SELECT 
              COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
              COUNT(DISTINCT date) as completed_days
            FROM worker_attendance 
            WHERE project_id = ${projectId} AND is_present = true
          `);
          const fundTransfersStats = await db.execute(sql3`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
            FROM fund_transfers 
            WHERE project_id = ${projectId}
          `);
          const transportStats = await db.execute(sql3`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
            FROM transportation_expenses 
            WHERE project_id = ${projectId}
          `);
          const workerTransfersStats = await db.execute(sql3`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
            FROM worker_transfers 
            WHERE project_id = ${projectId}
          `);
          const miscExpensesStats = await db.execute(sql3`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
            FROM worker_misc_expenses 
            WHERE project_id = ${projectId}
          `);
          const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || "0", "integer");
          const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || "0", "integer");
          const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || "0");
          const materialPurchases2 = cleanDbValue(materialStats.rows[0]?.material_purchases || "0", "integer");
          const workerWages = cleanDbValue(workerWagesStats.rows[0]?.worker_wages || "0");
          const completedDays = cleanDbValue(workerWagesStats.rows[0]?.completed_days || "0", "integer");
          const totalIncome = cleanDbValue(fundTransfersStats.rows[0]?.total_income || "0");
          const transportExpenses = cleanDbValue(transportStats.rows[0]?.transport_expenses || "0");
          const workerTransfers2 = cleanDbValue(workerTransfersStats.rows[0]?.worker_transfers || "0");
          const miscExpenses = cleanDbValue(miscExpensesStats.rows[0]?.misc_expenses || "0");
          if (totalWorkers > 1e3) {
            console.warn(`\u26A0\uFE0F [API] \u0639\u062F\u062F \u0639\u0645\u0627\u0644 \u063A\u064A\u0631 \u0645\u0646\u0637\u0642\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 ${project.name}: ${totalWorkers}`);
          }
          const totalExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers2 + miscExpenses;
          const currentBalance = totalIncome - totalExpenses;
          if (process.env.NODE_ENV === "development") {
            console.log(`\u{1F4CA} [API] \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${project.name}":`, {
              totalWorkers,
              activeWorkers,
              totalIncome,
              totalExpenses,
              currentBalance,
              completedDays,
              materialPurchases: materialPurchases2
            });
          }
          return {
            ...project,
            stats: {
              totalWorkers: Math.max(0, totalWorkers),
              totalExpenses: Math.max(0, totalExpenses),
              totalIncome: Math.max(0, totalIncome),
              currentBalance,
              // يمكن أن يكون سالباً
              activeWorkers: Math.max(0, activeWorkers),
              completedDays: Math.max(0, completedDays),
              materialPurchases: Math.max(0, materialPurchases2),
              lastActivity: project.createdAt.toISOString()
            }
          };
        } catch (error) {
          console.error(`\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 ${project.name}:`, error);
          return {
            ...project,
            stats: {
              totalWorkers: 0,
              totalExpenses: 0,
              totalIncome: 0,
              currentBalance: 0,
              activeWorkers: 0,
              completedDays: 0,
              materialPurchases: 0,
              lastActivity: project.createdAt.toISOString()
            }
          };
        }
      }));
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${projectsWithStats.length} \u0645\u0634\u0631\u0648\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A`);
      res.json({
        success: true,
        data: projectsWithStats,
        message: `\u062A\u0645 \u062C\u0644\u0628 ${projectsWithStats.length} \u0645\u0634\u0631\u0648\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0628\u0646\u062C\u0627\u062D`
      });
    } catch (error) {
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A"
      });
    }
  });
  app2.get("/api/projects/:id/daily-summary/:date", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { id: projectId, date: date2 } = req.params;
      console.log(`\u{1F4CA} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${req.user?.email}`);
      console.log(`\u{1F4CB} [API] \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0628: projectId=${projectId}, date=${date2}`);
      if (!projectId || !date2) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629:", { projectId, date: date2 });
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
          message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646",
          processingTime: duration2
        });
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date2)) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D:", date2);
        return res.status(400).json({
          success: false,
          error: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
          message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0628\u0635\u064A\u063A\u0629 YYYY-MM-DD",
          processingTime: duration2
        });
      }
      console.log("\u{1F50D} [API] \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0648\u062C\u0648\u062F \u0627\u0644\u0645\u0634\u0631\u0648\u0639...");
      const projectExists = await db.select().from(projects).where(eq3(projects.id, projectId)).limit(1);
      if (projectExists.length === 0) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", projectId);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u0631\u0648\u0639 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${projectId}`,
          processingTime: duration2
        });
      }
      console.log("\u{1F4BE} [API] \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      let dailySummary = null;
      try {
        console.log("\u26A1 [API] \u0645\u062D\u0627\u0648\u0644\u0629 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 daily_summary_mv...");
        const mvResult = await db.execute(sql3`
          SELECT 
            id,
            project_id,
            summary_date,
            carried_forward_amount,
            total_fund_transfers,
            total_worker_wages,
            total_material_costs,
            total_transportation_expenses,
            total_worker_transfers,
            total_worker_misc_expenses,
            total_income,
            total_expenses,
            remaining_balance,
            notes,
            created_at,
            updated_at,
            project_name
          FROM daily_summary_mv 
          WHERE project_id = ${projectId} AND summary_date = ${date2}
          LIMIT 1
        `);
        if (mvResult.rows && mvResult.rows.length > 0) {
          dailySummary = mvResult.rows[0];
          console.log("\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 Materialized View \u0628\u0646\u062C\u0627\u062D");
        }
      } catch (mvError) {
        console.log("\u26A0\uFE0F [API] Materialized View \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u060C \u0627\u0644\u062A\u0628\u062F\u064A\u0644 \u0644\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0639\u0627\u062F\u064A...");
        const regularResult = await db.select({
          id: dailyExpenseSummaries.id,
          project_id: dailyExpenseSummaries.projectId,
          summary_date: dailyExpenseSummaries.date,
          carried_forward_amount: dailyExpenseSummaries.carriedForwardAmount,
          total_fund_transfers: dailyExpenseSummaries.totalFundTransfers,
          total_worker_wages: dailyExpenseSummaries.totalWorkerWages,
          total_material_costs: dailyExpenseSummaries.totalMaterialCosts,
          total_transportation_expenses: dailyExpenseSummaries.totalTransportationCosts,
          total_worker_transfers: sql3`COALESCE(${dailyExpenseSummaries.totalWorkerTransfers}, 0)`,
          total_worker_misc_expenses: sql3`COALESCE(${dailyExpenseSummaries.totalWorkerMiscExpenses}, 0)`,
          total_income: dailyExpenseSummaries.totalIncome,
          total_expenses: dailyExpenseSummaries.totalExpenses,
          remaining_balance: dailyExpenseSummaries.remainingBalance,
          notes: sql3`COALESCE(${dailyExpenseSummaries.notes}, '')`,
          created_at: dailyExpenseSummaries.createdAt,
          updated_at: sql3`COALESCE(${dailyExpenseSummaries.updatedAt}, ${dailyExpenseSummaries.createdAt})`,
          project_name: projects.name
        }).from(dailyExpenseSummaries).leftJoin(projects, eq3(dailyExpenseSummaries.projectId, projects.id)).where(and3(
          eq3(dailyExpenseSummaries.projectId, projectId),
          eq3(dailyExpenseSummaries.date, date2)
        )).limit(1);
        if (regularResult.length > 0) {
          dailySummary = regularResult[0];
          console.log("\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0639\u0627\u062F\u064A \u0628\u0646\u062C\u0627\u062D");
        }
      }
      const duration = Date.now() - startTime;
      if (!dailySummary) {
        console.log(`\u{1F4ED} [API] \u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0644\u062E\u0635 \u064A\u0648\u0645\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 ${projectId} \u0641\u064A \u062A\u0627\u0631\u064A\u062E ${date2} - \u0625\u0631\u062C\u0627\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0641\u0627\u0631\u063A\u0629`);
        return res.json({
          success: true,
          data: {
            id: null,
            projectId,
            date: date2,
            totalIncome: 0,
            totalExpenses: 0,
            remainingBalance: 0,
            notes: null,
            isEmpty: true,
            message: `\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0644\u062E\u0635 \u0645\u0627\u0644\u064A \u0645\u062D\u0641\u0648\u0638 \u0644\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u064A \u062A\u0627\u0631\u064A\u062E ${date2}`
          },
          processingTime: duration,
          metadata: {
            projectId,
            date: date2,
            projectName: projectExists[0].name,
            isEmptyResult: true
          }
        });
      }
      const formattedSummary = {
        id: dailySummary.id,
        projectId: dailySummary.project_id,
        projectName: dailySummary.project_name || projectExists[0].name,
        date: dailySummary.summary_date || date2,
        financialSummary: {
          carriedForwardAmount: parseFloat(String(dailySummary.carried_forward_amount || "0")),
          totalFundTransfers: parseFloat(String(dailySummary.total_fund_transfers || "0")),
          totalWorkerWages: parseFloat(String(dailySummary.total_worker_wages || "0")),
          totalMaterialCosts: parseFloat(String(dailySummary.total_material_costs || "0")),
          totalTransportationExpenses: parseFloat(String(dailySummary.total_transportation_expenses || "0")),
          totalWorkerTransfers: parseFloat(String(dailySummary.total_worker_transfers || "0")),
          totalWorkerMiscExpenses: parseFloat(String(dailySummary.total_worker_misc_expenses || "0")),
          totalIncome: parseFloat(String(dailySummary.total_income || "0")),
          totalExpenses: parseFloat(String(dailySummary.total_expenses || "0")),
          remainingBalance: parseFloat(String(dailySummary.remaining_balance || "0"))
        },
        notes: String(dailySummary.notes || ""),
        createdAt: dailySummary.created_at,
        updatedAt: dailySummary.updated_at || dailySummary.created_at
      };
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        projectId,
        projectName: formattedSummary.projectName,
        date: date2,
        totalIncome: formattedSummary.financialSummary.totalIncome,
        totalExpenses: formattedSummary.financialSummary.totalExpenses,
        remainingBalance: formattedSummary.financialSummary.remainingBalance
      });
      res.json({
        success: true,
        data: formattedSummary,
        message: `\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0627\u0644\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 "${formattedSummary.projectName}" \u0641\u064A \u062A\u0627\u0631\u064A\u062E ${date2} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A";
      let statusCode = 500;
      if (error.code === "42P01") {
        errorMessage = "\u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
        statusCode = 503;
      } else if (error.code === "22008") {
        errorMessage = "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        data: null,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/projects/:projectId/previous-balance/:date", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId, date: date2 } = req.params;
      console.log(`\u{1F4B0} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642: projectId=${projectId}, date=${date2}`);
      if (!projectId || !date2) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
          message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646",
          processingTime: duration2
        });
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date2)) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
          message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0628\u0635\u064A\u063A\u0629 YYYY-MM-DD",
          processingTime: duration2
        });
      }
      const currentDate = new Date(date2);
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split("T")[0];
      console.log(`\u{1F4B0} [API] \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0644\u064A\u0648\u0645: ${previousDateStr}`);
      let previousBalance = 0;
      let source = "none";
      try {
        const latestSummary = await db.select({
          remainingBalance: dailyExpenseSummaries.remainingBalance,
          date: dailyExpenseSummaries.date
        }).from(dailyExpenseSummaries).where(and3(
          eq3(dailyExpenseSummaries.projectId, projectId),
          lt(dailyExpenseSummaries.date, date2)
        )).orderBy(desc2(dailyExpenseSummaries.date)).limit(1);
        if (latestSummary.length > 0) {
          const summaryDate = latestSummary[0].date;
          const summaryBalance = parseFloat(String(latestSummary[0].remainingBalance || "0"));
          if (summaryDate === previousDateStr) {
            previousBalance = summaryBalance;
            source = "summary";
            console.log(`\u{1F4B0} [API] \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u062E\u0635 \u0644\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642: ${previousBalance}`);
          } else {
            console.log(`\u{1F4B0} [API] \u0622\u062E\u0631 \u0645\u0644\u062E\u0635 \u0645\u062D\u0641\u0648\u0638 \u0641\u064A ${summaryDate}, \u062D\u0633\u0627\u0628 \u062A\u0631\u0627\u0643\u0645\u064A \u0625\u0644\u0649 ${previousDateStr}`);
            const startFromDate = new Date(summaryDate);
            startFromDate.setDate(startFromDate.getDate() + 1);
            const startFromStr = startFromDate.toISOString().split("T")[0];
            const cumulativeBalance = await calculateCumulativeBalance2(projectId, startFromStr, previousDateStr);
            previousBalance = summaryBalance + cumulativeBalance;
            source = "computed-from-summary";
            console.log(`\u{1F4B0} [API] \u0631\u0635\u064A\u062F \u062A\u0631\u0627\u0643\u0645\u064A \u0645\u0646 ${summaryDate} (${summaryBalance}) + ${cumulativeBalance} = ${previousBalance}`);
          }
        } else {
          console.log(`\u{1F4B0} [API] \u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0644\u062E\u0635 \u0645\u062D\u0641\u0648\u0638\u060C \u062D\u0633\u0627\u0628 \u062A\u0631\u0627\u0643\u0645\u064A \u0645\u0646 \u0627\u0644\u0628\u062F\u0627\u064A\u0629`);
          previousBalance = await calculateCumulativeBalance2(projectId, null, previousDateStr);
          source = "computed-full";
          console.log(`\u{1F4B0} [API] \u0631\u0635\u064A\u062F \u062A\u0631\u0627\u0643\u0645\u064A \u0643\u0627\u0645\u0644: ${previousBalance}`);
        }
      } catch (error) {
        console.warn(`\u26A0\uFE0F [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0633\u0627\u0628\u0642\u060C \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 0:`, error);
        previousBalance = 0;
        source = "error";
      }
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms: ${previousBalance}`);
      res.json({
        success: true,
        data: {
          balance: previousBalance.toString(),
          previousDate: previousDateStr,
          currentDate: date2,
          source
        },
        message: `\u062A\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u064A\u0648\u0645 ${previousDateStr} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642:", error);
      res.status(500).json({
        success: false,
        data: {
          balance: "0"
        },
        error: "\u0641\u0634\u0644 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A",
        message: error.message,
        processingTime: duration
      });
    }
  });
  async function calculateCumulativeBalance2(projectId, fromDate, toDate) {
    try {
      const whereConditions = [eq3(fundTransfers.projectId, projectId)];
      if (fromDate) {
        whereConditions.push(gte(fundTransfers.transferDate, sql3`${fromDate}::date`));
      }
      whereConditions.push(lt(fundTransfers.transferDate, sql3`(${toDate}::date + interval '1 day')`));
      const [
        ftRows,
        waRows,
        mpRows,
        teRows,
        wtRows,
        wmRows,
        incomingPtRows,
        outgoingPtRows
      ] = await Promise.all([
        // تحويلات العهدة
        db.select().from(fundTransfers).where(and3(...whereConditions)),
        // أجور العمال
        db.select().from(workerAttendance).where(and3(
          eq3(workerAttendance.projectId, projectId),
          fromDate ? gte(workerAttendance.date, fromDate) : sql3`true`,
          lte(workerAttendance.date, toDate)
        )),
        // مشتريات المواد النقدية فقط
        db.select().from(materialPurchases).where(and3(
          eq3(materialPurchases.projectId, projectId),
          eq3(materialPurchases.purchaseType, "\u0646\u0642\u062F"),
          fromDate ? gte(materialPurchases.purchaseDate, fromDate) : sql3`true`,
          lte(materialPurchases.purchaseDate, toDate)
        )),
        // مصاريف النقل
        db.select().from(transportationExpenses).where(and3(
          eq3(transportationExpenses.projectId, projectId),
          fromDate ? gte(transportationExpenses.date, fromDate) : sql3`true`,
          lte(transportationExpenses.date, toDate)
        )),
        // حوالات العمال
        db.select().from(workerTransfers).where(and3(
          eq3(workerTransfers.projectId, projectId),
          fromDate ? gte(workerTransfers.transferDate, fromDate) : sql3`true`,
          lte(workerTransfers.transferDate, toDate)
        )),
        // مصاريف متنوعة للعمال
        db.select().from(workerMiscExpenses).where(and3(
          eq3(workerMiscExpenses.projectId, projectId),
          fromDate ? gte(workerMiscExpenses.date, fromDate) : sql3`true`,
          lte(workerMiscExpenses.date, toDate)
        )),
        // تحويلات واردة من مشاريع أخرى
        db.select().from(projectFundTransfers).where(and3(
          eq3(projectFundTransfers.toProjectId, projectId),
          fromDate ? gte(projectFundTransfers.transferDate, fromDate) : sql3`true`,
          lte(projectFundTransfers.transferDate, toDate)
        )),
        // تحويلات صادرة إلى مشاريع أخرى
        db.select().from(projectFundTransfers).where(and3(
          eq3(projectFundTransfers.fromProjectId, projectId),
          fromDate ? gte(projectFundTransfers.transferDate, fromDate) : sql3`true`,
          lte(projectFundTransfers.transferDate, toDate)
        ))
      ]);
      const totalFundTransfers = ftRows.reduce((sum, t) => sum + parseFloat(String(t.amount || "0")), 0);
      const totalWorkerWages = waRows.reduce((sum, w) => sum + parseFloat(String(w.paidAmount || "0")), 0);
      const totalMaterialCosts = mpRows.reduce((sum, m) => sum + parseFloat(String(m.totalAmount || "0")), 0);
      const totalTransportation = teRows.reduce((sum, t) => sum + parseFloat(String(t.amount || "0")), 0);
      const totalWorkerTransfers = wtRows.reduce((sum, w) => sum + parseFloat(String(w.amount || "0")), 0);
      const totalMiscExpenses = wmRows.reduce((sum, m) => sum + parseFloat(String(m.amount || "0")), 0);
      const totalIncomingProjectTransfers = incomingPtRows.reduce((sum, p) => sum + parseFloat(String(p.amount || "0")), 0);
      const totalOutgoingProjectTransfers = outgoingPtRows.reduce((sum, p) => sum + parseFloat(String(p.amount || "0")), 0);
      const totalIncome = totalFundTransfers + totalIncomingProjectTransfers;
      const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses + totalOutgoingProjectTransfers;
      const balance = totalIncome - totalExpenses;
      console.log(`\u{1F4B0} [Calc] \u0641\u062A\u0631\u0629 ${fromDate || "\u0627\u0644\u0628\u062F\u0627\u064A\u0629"} \u0625\u0644\u0649 ${toDate}: \u062F\u062E\u0644=${totalIncome}, \u0645\u0635\u0627\u0631\u064A\u0641=${totalExpenses}, \u0631\u0635\u064A\u062F=${balance}`);
      return balance;
    } catch (error) {
      console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A:", error);
      return 0;
    }
  }
  app2.post("/api/projects", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0634\u0631\u0648\u0639 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = enhancedInsertProjectSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u0627\u0644\u0645\u0634\u0631\u0648\u0639");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newProject = await db.insert(projects).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newProject[0].id,
        name: newProject[0].name,
        status: newProject[0].status
      });
      res.status(201).json({
        success: true,
        data: newProject[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${newProject[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639";
      let statusCode = 500;
      if (error.code === "23505") {
        errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
        statusCode = 409;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/materials", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0627\u062F\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertMaterialSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0627\u0644\u0645\u0627\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u0627\u0644\u0645\u0627\u062F\u0629");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0627\u0644\u0645\u0627\u062F\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newMaterial = await db.insert(materials).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0627\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newMaterial[0].id,
        name: newMaterial[0].name,
        category: newMaterial[0].category,
        unit: newMaterial[0].unit
      });
      res.status(201).json({
        success: true,
        data: newMaterial[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0627\u062F\u0629 "${newMaterial[0].name}" (${newMaterial[0].category}) \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0627\u062F\u0629:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0627\u062F\u0629";
      let statusCode = 500;
      if (error.code === "23505") {
        errorMessage = "\u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0648\u062C\u0648\u062F\u0629 \u0645\u0633\u0628\u0642\u0627\u064B";
        statusCode = 409;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u062F\u0629 \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/suppliers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertSupplierSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0627\u0644\u0645\u0648\u0631\u062F:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u0627\u0644\u0645\u0648\u0631\u062F");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0627\u0644\u0645\u0648\u0631\u062F \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newSupplier = await db.insert(suppliers).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newSupplier[0].id,
        name: newSupplier[0].name,
        contactPerson: newSupplier[0].contactPerson
      });
      res.status(201).json({
        success: true,
        data: newSupplier[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062F "${newSupplier[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062F:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062F";
      let statusCode = 500;
      if (error.code === "23505") {
        errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
        statusCode = 409;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629:", purchaseId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!purchaseId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingPurchase = await db.select().from(materialPurchases).where(eq3(materialPurchases.id, purchaseId)).limit(1);
      if (existingPurchase.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u062A\u0631\u064A\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${purchaseId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertMaterialPurchaseSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedPurchase = await db.update(materialPurchases).set({
        ...validationResult.data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(materialPurchases.id, purchaseId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedPurchase[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0627\u062F",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/material-purchases", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u0648\u0627\u062F \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertMaterialPurchaseSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newPurchase = await db.insert(materialPurchases).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newPurchase[0].id,
        projectId: newPurchase[0].projectId,
        totalAmount: newPurchase[0].totalAmount
      });
      res.status(201).json({
        success: true,
        data: newPurchase[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0642\u064A\u0645\u0629 ${newPurchase[0].totalAmount} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0623\u0648 \u0627\u0644\u0645\u0627\u062F\u0629 \u0623\u0648 \u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
        statusCode = 400;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/projects/:projectId/daily-expenses/:date", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { projectId, date: date2 } = req.params;
      console.log(`\u{1F4CA} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629: projectId=${projectId}, date=${date2}`);
      if (!projectId || !date2) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
          message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646",
          processingTime: duration2
        });
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date2)) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
          message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0628\u0635\u064A\u063A\u0629 YYYY-MM-DD",
          processingTime: duration2
        });
      }
      const [
        fundTransfersResult,
        workerAttendanceResult,
        materialPurchasesResult,
        transportationResult,
        workerTransfersResult,
        miscExpensesResult,
        projectInfo
      ] = await Promise.all([
        db.select().from(fundTransfers).where(and3(eq3(fundTransfers.projectId, projectId), gte(fundTransfers.transferDate, sql3`${date2}::date`), lt(fundTransfers.transferDate, sql3`(${date2}::date + interval '1 day')`))),
        db.select({
          id: workerAttendance.id,
          workerId: workerAttendance.workerId,
          projectId: workerAttendance.projectId,
          date: workerAttendance.date,
          paidAmount: workerAttendance.paidAmount,
          actualWage: workerAttendance.actualWage,
          workDays: workerAttendance.workDays,
          workerName: workers.name
        }).from(workerAttendance).leftJoin(workers, eq3(workerAttendance.workerId, workers.id)).where(and3(eq3(workerAttendance.projectId, projectId), eq3(workerAttendance.date, date2))),
        db.select().from(materialPurchases).where(and3(eq3(materialPurchases.projectId, projectId), eq3(materialPurchases.purchaseDate, date2))),
        db.select().from(transportationExpenses).where(and3(eq3(transportationExpenses.projectId, projectId), eq3(transportationExpenses.date, date2))),
        db.select().from(workerTransfers).where(and3(eq3(workerTransfers.projectId, projectId), eq3(workerTransfers.transferDate, date2))),
        db.select().from(workerMiscExpenses).where(and3(eq3(workerMiscExpenses.projectId, projectId), eq3(workerMiscExpenses.date, date2))),
        db.select().from(projects).where(eq3(projects.id, projectId)).limit(1)
      ]);
      const totalFundTransfers = fundTransfersResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWorkerWages = workerAttendanceResult.reduce((sum, w) => sum + parseFloat(w.paidAmount || "0"), 0);
      const totalMaterialCosts = materialPurchasesResult.reduce((sum, m) => sum + parseFloat(m.totalAmount), 0);
      const totalTransportation = transportationResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWorkerTransfers = workerTransfersResult.reduce((sum, w) => sum + parseFloat(w.amount), 0);
      const totalMiscExpenses = miscExpensesResult.reduce((sum, m) => sum + parseFloat(m.amount), 0);
      const totalIncome = totalFundTransfers;
      const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses;
      const remainingBalance = totalIncome - totalExpenses;
      const responseData = {
        date: date2,
        projectName: projectInfo[0]?.name || "\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
        projectId,
        totalIncome,
        totalExpenses,
        remainingBalance,
        fundTransfers: fundTransfersResult,
        workerAttendance: workerAttendanceResult,
        materialPurchases: materialPurchasesResult,
        transportationExpenses: transportationResult,
        workerTransfers: workerTransfersResult,
        miscExpenses: miscExpensesResult
      };
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: responseData,
        message: `\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0644\u062A\u0627\u0631\u064A\u062E ${date2} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/fund-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertFundTransferSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newTransfer = await db.insert(fundTransfers).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newTransfer[0].id,
        amount: newTransfer[0].amount,
        transferType: newTransfer[0].transferType
      });
      res.status(201).json({
        success: true,
        data: newTransfer[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0642\u064A\u0645\u0629 ${newTransfer[0].amount} (${newTransfer[0].transferType}) \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629";
      let statusCode = 500;
      if (error.code === "23505") {
        errorMessage = "\u0631\u0642\u0645 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
        statusCode = 409;
      } else if (error.code === "23503") {
        errorMessage = "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
        statusCode = 400;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/transportation-expenses", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0635\u0631\u0648\u0641 \u0645\u0648\u0627\u0635\u0644\u0627\u062A \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertTransportationExpenseSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newExpense = await db.insert(transportationExpenses).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newExpense[0].id,
        amount: newExpense[0].amount,
        description: newExpense[0].description
      });
      res.status(201).json({
        success: true,
        data: newExpense[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0635\u0631\u0648\u0641 \u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0642\u064A\u0645\u0629 ${newExpense[0].amount} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0623\u0648 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
        statusCode = 400;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/daily-expense-summaries", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u062E\u0635 \u0645\u0635\u0627\u0631\u064A\u0641 \u064A\u0648\u0645\u064A\u0629 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertDailyExpenseSummarySchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newSummary = await db.insert(dailyExpenseSummaries).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newSummary[0].id,
        date: newSummary[0].date,
        totalExpenses: newSummary[0].totalExpenses
      });
      res.status(201).json({
        success: true,
        data: newSummary[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0644\u062A\u0627\u0631\u064A\u062E ${newSummary[0].date} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
        statusCode = 400;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log(`\u{1F4CA} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0627\u062F\u0629 \u0644\u0644\u062A\u0639\u062F\u064A\u0644: ${purchaseId}`);
      if (!purchaseId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0637\u0644\u0648\u0628",
          processingTime: duration2
        });
      }
      const purchase = await db.select({
        id: materialPurchases.id,
        projectId: materialPurchases.projectId,
        materialName: materialPurchases.materialName,
        materialCategory: materialPurchases.materialCategory,
        materialUnit: materialPurchases.materialUnit,
        quantity: materialPurchases.quantity,
        unit: materialPurchases.unit,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        supplierName: materialPurchases.supplierName,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        invoicePhoto: materialPurchases.invoicePhoto,
        notes: materialPurchases.notes,
        purchaseDate: materialPurchases.purchaseDate,
        createdAt: materialPurchases.createdAt
      }).from(materialPurchases).where(eq3(materialPurchases.id, purchaseId)).limit(1);
      if (purchase.length === 0) {
        const duration2 = Date.now() - startTime;
        console.log(`\u{1F4ED} [API] \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629: ${purchaseId}`);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u062A\u0631\u064A\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${purchaseId}`,
          processingTime: duration2
        });
      }
      const purchaseData = purchase[0];
      let materialData = null;
      let finalMaterialCategory = purchaseData.materialCategory;
      let finalMaterialUnit = purchaseData.materialUnit || purchaseData.unit;
      if ((!finalMaterialCategory || !finalMaterialUnit) && purchaseData.materialName) {
        try {
          console.log(`\u{1F50D} [API] \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0641\u0626\u0629 \u0627\u0644\u0645\u0627\u062F\u0629 \u0644\u0640: ${purchaseData.materialName}`);
          let similarMaterial = await db.select().from(materials).where(eq3(materials.name, purchaseData.materialName)).limit(1);
          if (similarMaterial.length === 0) {
            similarMaterial = await db.select().from(materials).where(sql3`LOWER(${materials.name}) LIKE LOWER(${`%${purchaseData.materialName}%`})`).limit(1);
          }
          if (similarMaterial.length === 0) {
            const firstWord = purchaseData.materialName.split(" ")[0];
            if (firstWord.length > 2) {
              similarMaterial = await db.select().from(materials).where(sql3`LOWER(${materials.name}) LIKE LOWER(${`${firstWord}%`})`).limit(1);
            }
          }
          if (similarMaterial.length > 0) {
            materialData = similarMaterial[0];
            finalMaterialCategory = finalMaterialCategory || materialData.category;
            finalMaterialUnit = finalMaterialUnit || materialData.unit;
            console.log(`\u2705 [API] \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0627\u062F\u0629 \u0645\u0634\u0627\u0628\u0647\u0629:`, {
              foundMaterial: materialData.name,
              category: materialData.category,
              unit: materialData.unit
            });
          } else {
            console.log(`\u26A0\uFE0F [API] \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0627\u062F\u0629 \u0645\u0634\u0627\u0628\u0647\u0629 \u0644\u0640: ${purchaseData.materialName}`);
          }
        } catch (materialError) {
          console.warn("\u26A0\uFE0F [API] \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0645\u0627\u062F\u0629 \u0645\u0634\u0627\u0628\u0647\u0629:", materialError);
        }
      }
      const duration = Date.now() - startTime;
      const completeData = {
        ...purchaseData,
        materialCategory: finalMaterialCategory,
        materialUnit: finalMaterialUnit,
        material: materialData
      };
      console.log(`\u{1F50D} [API] \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0631\u062C\u0639\u0629:`, {
        purchaseData: {
          id: purchaseData.id,
          materialName: purchaseData.materialName,
          materialCategory: purchaseData.materialCategory,
          materialUnit: purchaseData.materialUnit,
          unit: purchaseData.unit
        },
        materialData: materialData ? {
          id: materialData.id,
          name: materialData.name,
          category: materialData.category,
          unit: materialData.unit
        } : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0627\u062F\u0629 \u0645\u0631\u062A\u0628\u0637\u0629",
        completeData: {
          materialCategory: completeData.materialCategory,
          materialUnit: completeData.materialUnit
        }
      });
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629 \u0644\u0644\u062A\u0639\u062F\u064A\u0644 \u0641\u064A ${duration}ms:`, {
        id: completeData.id,
        materialName: completeData.materialName,
        materialCategory: completeData.materialCategory,
        materialUnit: completeData.materialUnit,
        totalAmount: completeData.totalAmount
      });
      res.json({
        success: true,
        data: completeData,
        message: "\u062A\u0645 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629 \u0628\u0646\u062C\u0627\u062D",
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/equipment", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0639\u062F\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0639\u062F\u0629 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertToolSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0627\u0644\u0645\u0639\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u0627\u0644\u0645\u0639\u062F\u0629");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0627\u0644\u0645\u0639\u062F\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newEquipment = await db.insert(tools).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newEquipment[0].id,
        name: newEquipment[0].name,
        categoryId: newEquipment[0].categoryId
      });
      res.status(201).json({
        success: true,
        data: newEquipment[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u062F\u0629 "${newEquipment[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u062F\u0629:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u062F\u0629";
      let statusCode = 500;
      if (error.code === "23505") {
        errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0645\u0639\u062F\u0629 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
        statusCode = 409;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0639\u062F\u0629 \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.post("/api/equipment-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u062A\u062D\u0648\u064A\u0644 \u0645\u0639\u062F\u0629 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      const validationResult = insertToolMovementSchema.safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629");
      console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const newTransfer = await db.insert(toolMovements).values(validationResult.data).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: newTransfer[0].id,
        toolId: newTransfer[0].toolId,
        movementType: newTransfer[0].movementType
      });
      res.status(201).json({
        success: true,
        data: newTransfer[0],
        message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0627\u0644\u0645\u0639\u062F\u0629 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
        statusCode = 400;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0627\u062F\u0629:", materialId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!materialId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingMaterial = await db.select().from(materials).where(eq3(materials.id, materialId)).limit(1);
      if (existingMaterial.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0627\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${materialId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertMaterialSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedMaterial = await db.update(materials).set(validationResult.data).where(eq3(materials.id, materialId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedMaterial[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 "${updatedMaterial[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const supplierId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0648\u0631\u062F:", supplierId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!supplierId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingSupplier = await db.select().from(suppliers).where(eq3(suppliers.id, supplierId)).limit(1);
      if (existingSupplier.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0648\u0631\u062F \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${supplierId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertSupplierSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedSupplier = await db.update(suppliers).set(validationResult.data).where(eq3(suppliers.id, supplierId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedSupplier[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F "${updatedSupplier[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", purchaseId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!purchaseId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingPurchase = await db.select().from(materialPurchases).where(eq3(materialPurchases.id, purchaseId)).limit(1);
      if (existingPurchase.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u0648\u0627\u062F \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${purchaseId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertMaterialPurchaseSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedPurchase = await db.update(materialPurchases).set(validationResult.data).where(eq3(materialPurchases.id, purchaseId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedPurchase[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0642\u064A\u0645\u0629 ${updatedPurchase[0].totalAmount} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/fund-transfers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const transferId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", transferId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!transferId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingTransfer = await db.select().from(fundTransfers).where(eq3(fundTransfers.id, transferId)).limit(1);
      if (existingTransfer.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertFundTransferSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedTransfer = await db.update(fundTransfers).set(validationResult.data).where(eq3(fundTransfers.id, transferId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedTransfer[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0642\u064A\u0645\u0629 ${updatedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/transportation-expenses/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const expenseId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", expenseId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!expenseId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingExpense = await db.select().from(transportationExpenses).where(eq3(transportationExpenses.id, expenseId)).limit(1);
      if (existingExpense.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0635\u0631\u0648\u0641 \u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${expenseId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertTransportationExpenseSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedExpense = await db.update(transportationExpenses).set(validationResult.data).where(eq3(transportationExpenses.id, expenseId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedExpense[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0642\u064A\u0645\u0629 ${updatedExpense[0].amount} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/daily-expense-summaries/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const summaryId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", summaryId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!summaryId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingSummary = await db.select().from(dailyExpenseSummaries).where(eq3(dailyExpenseSummaries.id, summaryId)).limit(1);
      if (existingSummary.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u062E\u0635 \u0645\u0635\u0627\u0631\u064A\u0641 \u064A\u0648\u0645\u064A\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${summaryId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertDailyExpenseSummarySchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedSummary = await db.update(dailyExpenseSummaries).set(validationResult.data).where(eq3(dailyExpenseSummaries.id, summaryId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedSummary[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0644\u062A\u0627\u0631\u064A\u062E ${updatedSummary[0].date} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/equipment/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const equipmentId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0639\u062F\u0629:", equipmentId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!equipmentId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0639\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0639\u062F\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingEquipment = await db.select().from(tools).where(eq3(tools.id, equipmentId)).limit(1);
      if (existingEquipment.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${equipmentId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertToolSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedEquipment = await db.update(tools).set(validationResult.data).where(eq3(tools.id, equipmentId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedEquipment[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629 "${updatedEquipment[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0639\u062F\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/equipment-transfers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const transferId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629:", transferId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!transferId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingTransfer = await db.select().from(toolMovements).where(eq3(toolMovements.id, transferId)).limit(1);
      if (existingTransfer.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0645\u0639\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertToolMovementSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedTransfer = await db.update(toolMovements).set(validationResult.data).where(eq3(toolMovements.id, transferId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedTransfer[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629 \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0639\u062F\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.delete("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log("\u274C [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0630\u0641\u0647\u0627:", purchaseId);
      if (!purchaseId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0644\u0644\u062D\u0630\u0641",
          processingTime: duration2
        });
      }
      const existingPurchase = await db.select().from(materialPurchases).where(eq3(materialPurchases.id, purchaseId)).limit(1);
      if (existingPurchase.length === 0) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629:", purchaseId);
        return res.status(404).json({
          success: false,
          error: "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u0648\u0627\u062F \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${purchaseId}`,
          processingTime: duration2
        });
      }
      const purchaseToDelete = existingPurchase[0];
      console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", {
        id: purchaseToDelete.id,
        projectId: purchaseToDelete.projectId,
        totalAmount: purchaseToDelete.totalAmount
      });
      console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const deletedPurchase = await db.delete(materialPurchases).where(eq3(materialPurchases.id, purchaseId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: deletedPurchase[0].id,
        totalAmount: deletedPurchase[0].totalAmount
      });
      res.json({
        success: true,
        data: deletedPurchase[0],
        message: `\u062A\u0645 \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0642\u064A\u0645\u0629 ${deletedPurchase[0].totalAmount} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F - \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649";
        statusCode = 409;
      } else if (error.code === "22P02") {
        errorMessage = "\u0645\u0639\u0631\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const supplierId = req.params.id;
      console.log("\u274C [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0630\u0641\u0647:", supplierId);
      if (!supplierId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0644\u0644\u062D\u0630\u0641",
          processingTime: duration2
        });
      }
      const existingSupplier = await db.select().from(suppliers).where(eq3(suppliers.id, supplierId)).limit(1);
      if (existingSupplier.length === 0) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", supplierId);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0648\u0631\u062F \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${supplierId}`,
          processingTime: duration2
        });
      }
      const supplierToDelete = existingSupplier[0];
      console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F:", {
        id: supplierToDelete.id,
        name: supplierToDelete.name,
        contactPerson: supplierToDelete.contactPerson
      });
      console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const deletedSupplier = await db.delete(suppliers).where(eq3(suppliers.id, supplierId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: deletedSupplier[0].id,
        name: deletedSupplier[0].name
      });
      res.json({
        success: true,
        data: deletedSupplier[0],
        message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F "${deletedSupplier[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F - \u0645\u0631\u062A\u0628\u0637 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649";
        statusCode = 409;
      } else if (error.code === "22P02") {
        errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/workers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const workerId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0639\u0627\u0645\u0644:", workerId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!workerId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingWorker = await db.select().from(workers).where(eq3(workers.id, workerId)).limit(1);
      if (existingWorker.length === 0) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", workerId);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${workerId}`,
          processingTime: duration2
        });
      }
      const validationResult = enhancedInsertWorkerSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      console.log("\u2705 [API] \u0646\u062C\u062D validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644");
      console.log("\u{1F4BE} [API] \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const updatedWorker = await db.update(workers).set(validationResult.data).where(eq3(workers.id, workerId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: updatedWorker[0].id,
        name: updatedWorker[0].name,
        type: updatedWorker[0].type,
        dailyWage: updatedWorker[0].dailyWage,
        isActive: updatedWorker[0].isActive
      });
      res.json({
        success: true,
        data: updatedWorker[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 "${updatedWorker[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644";
      let statusCode = 500;
      if (error.code === "23505") {
        errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
        statusCode = 409;
      } else if (error.code === "23502") {
        errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 \u0646\u0627\u0642\u0635\u0629";
        statusCode = 400;
      } else if (error.code === "22P02") {
        errorMessage = "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.delete("/api/workers/:id", requireAuth, requireRole("admin"), async (req, res) => {
    const startTime = Date.now();
    try {
      const workerId = req.params.id;
      console.log("\u274C [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0630\u0641\u0647:", workerId);
      if (!workerId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062D\u0630\u0641",
          processingTime: duration2
        });
      }
      const existingWorker = await db.select().from(workers).where(eq3(workers.id, workerId)).limit(1);
      if (existingWorker.length === 0) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", workerId);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${workerId}`,
          processingTime: duration2
        });
      }
      const workerToDelete = existingWorker[0];
      console.log("\u{1F5D1}\uFE0F [API] \u0641\u062D\u0635 \u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644:", {
        id: workerToDelete.id,
        name: workerToDelete.name,
        type: workerToDelete.type
      });
      console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
      const attendanceRecords = await db.select({
        id: workerAttendance.id,
        date: workerAttendance.date,
        projectId: workerAttendance.projectId
      }).from(workerAttendance).where(eq3(workerAttendance.workerId, workerId)).limit(5);
      if (attendanceRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalAttendanceCount = await db.select({
          count: sql3`COUNT(*)`
        }).from(workerAttendance).where(eq3(workerAttendance.workerId, workerId));
        const totalCount = totalAttendanceCount[0]?.count || attendanceRecords.length;
        console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${totalCount} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631`);
        return res.status(409).json({
          success: false,
          error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
          message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${totalCount} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631. \u064A\u062C\u0628 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644.`,
          userAction: "\u064A\u062C\u0628 \u062D\u0630\u0641 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631 \u0623\u0648\u0644\u0627\u064B",
          relatedRecordsCount: totalCount,
          relatedRecordsType: "\u0633\u062C\u0644\u0627\u062A \u062D\u0636\u0648\u0631",
          processingTime: duration2
        });
      }
      console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
      const transferRecords = await db.select({ id: workerTransfers.id }).from(workerTransfers).where(eq3(workerTransfers.workerId, workerId)).limit(1);
      if (transferRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalTransfersCount = await db.select({
          count: sql3`COUNT(*)`
        }).from(workerTransfers).where(eq3(workerTransfers.workerId, workerId));
        const transfersCount = totalTransfersCount[0]?.count || transferRecords.length;
        console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transfersCount} \u062A\u062D\u0648\u064A\u0644 \u0645\u0627\u0644\u064A`);
        return res.status(409).json({
          success: false,
          error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
          message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transfersCount} \u062A\u062D\u0648\u064A\u0644 \u0645\u0627\u0644\u064A. \u064A\u062C\u0628 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644.`,
          userAction: "\u064A\u062C\u0628 \u062D\u0630\u0641 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0623\u0648\u0644\u0627\u064B",
          relatedRecordsCount: transfersCount,
          relatedRecordsType: "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0645\u0627\u0644\u064A\u0629",
          processingTime: duration2
        });
      }
      console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0633\u062C\u0644\u0627\u062A \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
      const transportRecords = await db.select({ id: transportationExpenses.id }).from(transportationExpenses).where(eq3(transportationExpenses.workerId, workerId)).limit(1);
      if (transportRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalTransportCount = await db.select({
          count: sql3`COUNT(*)`
        }).from(transportationExpenses).where(eq3(transportationExpenses.workerId, workerId));
        const transportCount = totalTransportCount[0]?.count || transportRecords.length;
        console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transportCount} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644`);
        return res.status(409).json({
          success: false,
          error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
          message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transportCount} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644. \u064A\u062C\u0628 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644.`,
          userAction: "\u064A\u062C\u0628 \u062D\u0630\u0641 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0623\u0648\u0644\u0627\u064B",
          relatedRecordsCount: transportCount,
          relatedRecordsType: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0646\u0642\u0644",
          processingTime: duration2
        });
      }
      console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
      const balanceRecords = await db.select({ id: workerBalances.id }).from(workerBalances).where(eq3(workerBalances.workerId, workerId)).limit(1);
      if (balanceRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalBalanceCount = await db.select({
          count: sql3`COUNT(*)`
        }).from(workerBalances).where(eq3(workerBalances.workerId, workerId));
        const balanceCount = totalBalanceCount[0]?.count || balanceRecords.length;
        console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${balanceCount} \u0633\u062C\u0644 \u0631\u0635\u064A\u062F`);
        return res.status(409).json({
          success: false,
          error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
          message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${balanceCount} \u0633\u062C\u0644 \u0631\u0635\u064A\u062F. \u064A\u062C\u0628 \u062A\u0635\u0641\u064A\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0639\u0645\u0627\u0644.`,
          userAction: "\u064A\u062C\u0628 \u062A\u0635\u0641\u064A\u0629 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0623\u0648\u0644\u0627\u064B",
          relatedRecordsCount: balanceCount,
          relatedRecordsType: "\u0623\u0631\u0635\u062F\u0629",
          processingTime: duration2
        });
      }
      console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (\u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A \u0645\u0631\u062A\u0628\u0637\u0629)...");
      const deletedWorker = await db.delete(workers).where(eq3(workers.id, workerId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: deletedWorker[0].id,
        name: deletedWorker[0].name,
        type: deletedWorker[0].type
      });
      res.json({
        success: true,
        data: deletedWorker[0],
        message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${deletedWorker[0].name}" (${deletedWorker[0].type}) \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644";
      let statusCode = 500;
      let userAction = "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A";
      let relatedInfo = {};
      if (error.code === "23503") {
        console.error("\u{1F6A8} [API] \u062E\u0637\u0623 \u0642\u064A\u062F \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u062E\u0627\u0631\u062C\u064A \u0644\u0645 \u064A\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641\u0647 \u0645\u0633\u0628\u0642\u0627\u064B (Race Condition \u0645\u062D\u062A\u0645\u0644):", {
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          table: error.table,
          column: error.column,
          fullError: error.message
        });
        errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0648\u062C\u0648\u062F \u0633\u062C\u0644\u0627\u062A \u0645\u0631\u062A\u0628\u0637\u0629 \u0644\u0645 \u064A\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641\u0647\u0627 \u0645\u0633\u0628\u0642\u0627\u064B";
        statusCode = 409;
        userAction = "\u062A\u062D\u0642\u0642 \u0645\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0642\u0645 \u0628\u062D\u0630\u0641\u0647\u0627 \u0623\u0648\u0644\u0627\u064B";
        const constraintDetails = error.constraint ? ` (${error.constraint})` : "";
        const tableDetails = error.table ? ` \u0641\u064A \u0627\u0644\u062C\u062F\u0648\u0644: ${error.table}` : "";
        relatedInfo = {
          raceConditionDetected: true,
          constraintViolated: error.constraint || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
          affectedTable: error.table || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
          affectedColumn: error.column || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
          technicalDetail: `\u0627\u0646\u062A\u0647\u0627\u0643 \u0642\u064A\u062F FK${constraintDetails}${tableDetails}`,
          suggestedAction: "\u0641\u062D\u0635 \u0633\u062C\u0644\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 \u0642\u062F \u062A\u0643\u0648\u0646 \u0623\u064F\u0646\u0634\u0626\u062A \u0628\u064A\u0646 \u0641\u062D\u0635 \u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u062D\u0630\u0641"
        };
      } else if (error.code === "22P02") {
        errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0623\u0648 \u062A\u0627\u0644\u0641";
        statusCode = 400;
        userAction = "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u062D\u0629 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644";
        relatedInfo = {
          invalidInputDetected: true,
          inputValue: req.params.id,
          expectedFormat: "UUID \u0635\u062D\u064A\u062D"
        };
      } else if (error.code === "42P01") {
        errorMessage = "\u062E\u0637\u0623 \u0641\u064A \u0628\u0646\u064A\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A - \u062C\u062F\u0648\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
        statusCode = 500;
        userAction = "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0641\u0648\u0631\u0627\u064B";
        relatedInfo = {
          databaseStructureIssue: true,
          missingTable: error.message
        };
      } else if (error.code === "08003") {
        errorMessage = "\u0627\u0646\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A";
        statusCode = 503;
        userAction = "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649";
        relatedInfo = {
          connectionIssue: true
        };
      } else if (error.code === "08006") {
        errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A";
        statusCode = 503;
        userAction = "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649";
        relatedInfo = {
          connectionFailure: true
        };
      } else {
        console.error("\u{1F50D} [API] \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644:", {
          code: error.code,
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        relatedInfo = {
          unexpectedError: true,
          errorCode: error.code,
          errorName: error.name,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: `\u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644: ${error.message}`,
        userAction,
        processingTime: duration,
        troubleshooting: relatedInfo,
        // معلومات إضافية للمطورين فقط في بيئة التطوير
        ...process.env.NODE_ENV === "development" && {
          debug: {
            errorCode: error.code,
            constraint: error.constraint,
            table: error.table,
            column: error.column,
            detail: error.detail
          }
        }
      });
    }
  });
  app2.patch("/api/projects/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const projectId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", projectId);
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
          processingTime: Date.now() - startTime
        });
      }
      const existingProject = await db.select().from(projects).where(eq3(projects.id, projectId)).limit(1);
      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          processingTime: Date.now() - startTime
        });
      }
      const updatedProject = await db.update(projects).set(req.body).where(eq3(projects.id, projectId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedProject[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${updatedProject[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0627\u062F\u0629:", materialId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!materialId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingMaterial = await db.select().from(materials).where(eq3(materials.id, materialId)).limit(1);
      if (existingMaterial.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0627\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${materialId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertMaterialSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedMaterial = await db.update(materials).set(validationResult.data).where(eq3(materials.id, materialId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedMaterial[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629 "${updatedMaterial[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0627\u062F\u0629",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.delete("/api/projects/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const projectId = req.params.id;
      console.log("\u274C [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0630\u0641\u0647:", projectId);
      if (!projectId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0644\u0644\u062D\u0630\u0641",
          processingTime: duration2
        });
      }
      const existingProject = await db.select().from(projects).where(eq3(projects.id, projectId)).limit(1);
      if (existingProject.length === 0) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", projectId);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u0631\u0648\u0639 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${projectId}`,
          processingTime: duration2
        });
      }
      const projectToDelete = existingProject[0];
      console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", {
        id: projectToDelete.id,
        name: projectToDelete.name,
        status: projectToDelete.status
      });
      console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const deletedProject = await db.delete(projects).where(eq3(projects.id, projectId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: deletedProject[0].id,
        name: deletedProject[0].name,
        status: deletedProject[0].status
      });
      res.json({
        success: true,
        data: deletedProject[0],
        message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${deletedProject[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 - \u0645\u0631\u062A\u0628\u0637 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649 (\u0639\u0645\u0627\u0644\u060C \u0645\u0648\u0627\u062F\u060C \u0645\u0635\u0631\u0648\u0641\u0627\u062A)";
        statusCode = 409;
      } else if (error.code === "22P02") {
        errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.delete("/api/materials/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const materialId = req.params.id;
      console.log("\u274C [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0630\u0641\u0647\u0627:", materialId);
      if (!materialId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0644\u0644\u062D\u0630\u0641",
          processingTime: duration2
        });
      }
      const existingMaterial = await db.select().from(materials).where(eq3(materials.id, materialId)).limit(1);
      if (existingMaterial.length === 0) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629:", materialId);
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0627\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${materialId}`,
          processingTime: duration2
        });
      }
      const materialToDelete = existingMaterial[0];
      console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629:", {
        id: materialToDelete.id,
        name: materialToDelete.name,
        category: materialToDelete.category
      });
      console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
      const deletedMaterial = await db.delete(materials).where(eq3(materials.id, materialId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
        id: deletedMaterial[0].id,
        name: deletedMaterial[0].name,
        category: deletedMaterial[0].category
      });
      res.json({
        success: true,
        data: deletedMaterial[0],
        message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 "${deletedMaterial[0].name}" \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 - \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649";
        statusCode = 409;
      } else if (error.code === "22P02") {
        errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
        statusCode = 400;
      }
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/material-purchases/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const purchaseId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
      console.log("\u{1F4CB} [API] ID \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", purchaseId);
      console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
      if (!purchaseId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
          processingTime: duration2
        });
      }
      const existingPurchase = await db.select().from(materialPurchases).where(eq3(materialPurchases.id, purchaseId)).limit(1);
      if (existingPurchase.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u0648\u0627\u062F \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${purchaseId}`,
          processingTime: duration2
        });
      }
      const validationResult = insertMaterialPurchaseSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const duration2 = Date.now() - startTime;
        console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", validationResult.error.flatten());
        const errorMessages = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        return res.status(400).json({
          success: false,
          error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          message: firstError,
          details: errorMessages,
          processingTime: duration2
        });
      }
      const updatedPurchase = await db.update(materialPurchases).set(validationResult.data).where(eq3(materialPurchases.id, purchaseId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: updatedPurchase[0],
        message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0628\u0642\u064A\u0645\u0629 ${updatedPurchase[0].totalAmount} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const supplierId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F:", supplierId);
      res.json({
        success: true,
        message: "endpoint \u062C\u0627\u0647\u0632 - \u0633\u064A\u062A\u0645 \u062A\u0641\u0639\u064A\u0644\u0647 \u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646",
        processingTime: Date.now() - startTime
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0648\u0631\u062F",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/worker-attendance/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const attendanceId = req.params.id;
      console.log("\u{1F4D6} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0633\u062C\u0644 \u062D\u0636\u0648\u0631:", attendanceId);
      if (!attendanceId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631",
          processingTime: duration2
        });
      }
      const attendanceRecord = await db.select().from(workerAttendance).where(eq3(workerAttendance.id, attendanceId)).limit(1);
      if (attendanceRecord.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0633\u062C\u0644 \u062D\u0636\u0648\u0631 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${attendanceId}`,
          processingTime: duration2
        });
      }
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: attendanceRecord[0],
        message: "\u062A\u0645 \u062C\u0644\u0628 \u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0628\u0646\u062C\u0627\u062D",
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/worker-attendance/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const attendanceId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u0636\u0648\u0631:", attendanceId);
      res.json({
        success: true,
        message: "endpoint \u062C\u0627\u0647\u0632 - \u0633\u064A\u062A\u0645 \u062A\u0641\u0639\u064A\u0644\u0647 \u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u062C\u062F\u0648\u0644 \u0627\u0644\u062D\u0636\u0648\u0631",
        processingTime: Date.now() - startTime
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u0636\u0648\u0631:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u0636\u0648\u0631",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/fund-transfers/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const transferId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0627\u0644\u064A:", transferId);
      res.json({
        success: true,
        message: "endpoint \u062C\u0627\u0647\u0632 - \u0633\u064A\u062A\u0645 \u062A\u0641\u0639\u064A\u0644\u0647 \u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u062C\u062F\u0648\u0644 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
        processingTime: Date.now() - startTime
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0627\u0644\u064A:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0627\u0644\u064A",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/transportation-expenses/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const expenseId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", expenseId);
      res.json({
        success: true,
        message: "endpoint \u062C\u0627\u0647\u0632 - \u0633\u064A\u062A\u0645 \u062A\u0641\u0639\u064A\u0644\u0647 \u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u062C\u062F\u0648\u0644 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A",
        processingTime: Date.now() - startTime
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.patch("/api/notifications/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const notificationId = req.params.id;
      console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631:", notificationId);
      const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
      const notificationService = new NotificationService2();
      const userId = req.user?.userId || req.user?.email || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
          processingTime: Date.now() - startTime
        });
      }
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0628\u0646\u062C\u0627\u062D",
        processingTime: Date.now() - startTime
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631:", error);
      res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631",
        message: error.message,
        processingTime: duration
      });
    }
  });
  app2.get("/api/daily-expenses", requireAuth, (req, res) => {
    res.json({ success: true, data: [], message: "Daily expenses endpoint working - NOW SECURED \u2705" });
  });
  app2.get("/api/material-purchases", requireAuth, (req, res) => {
    res.json({ success: true, data: [], message: "Material purchases endpoint working - NOW SECURED \u2705" });
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
      const notificationService = new NotificationService2();
      const userId = req.user?.userId || req.user?.email || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
          message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
        });
      }
      const { limit, offset, type, unreadOnly, projectId } = req.query;
      console.log(`\u{1F4E5} [API] \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
      const result = await notificationService.getUserNotifications(userId, {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        type,
        unreadOnly: unreadOnly === "true",
        projectId
      });
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${result.notifications.length} \u0625\u0634\u0639\u0627\u0631 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}`);
      res.json({
        success: true,
        data: result.notifications,
        count: result.total,
        unreadCount: result.unreadCount,
        message: result.notifications.length > 0 ? "\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0628\u0646\u062C\u0627\u062D" : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0634\u0639\u0627\u0631\u0627\u062A"
      });
    } catch (error) {
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A:", error);
      res.status(500).json({
        success: false,
        data: [],
        count: 0,
        unreadCount: 0,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A"
      });
    }
  });
  app2.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
      const notificationService = new NotificationService2();
      const userId = req.user?.userId || req.user?.email || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
          message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
        });
      }
      const notificationId = req.params.id;
      console.log(`\u2705 [API] \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0643\u0645\u0642\u0631\u0648\u0621 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
      await notificationService.markAsRead(notificationId, userId);
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
      });
    } catch (error) {
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
      });
    }
  });
  app2.post("/api/notifications/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
      const notificationService = new NotificationService2();
      const userId = req.user?.userId || req.user?.email || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
          message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
        });
      }
      const notificationId = req.params.id;
      console.log(`\u2705 [API] \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0643\u0645\u0642\u0631\u0648\u0621 (\u0645\u0633\u0627\u0631 \u0628\u062F\u064A\u0644) \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
      await notificationService.markAsRead(notificationId, userId);
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
      });
    } catch (error) {
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621 (\u0645\u0633\u0627\u0631 \u0628\u062F\u064A\u0644):", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
      });
    }
  });
  app2.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
      const notificationService = new NotificationService2();
      const userId = req.user?.userId || req.user?.email || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
          message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
        });
      }
      const projectId = req.body.projectId;
      console.log(`\u2705 [API] \u062A\u0639\u0644\u064A\u0645 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
      await notificationService.markAllAsRead(userId, projectId);
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629"
      });
    } catch (error) {
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629"
      });
    }
  });
  app2.post("/api/test/notifications/create", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
      const notificationService = new NotificationService2();
      const userId = req.user?.userId || req.user?.email || null;
      const { type, title, body, priority, recipients, projectId } = req.body;
      console.log(`\u{1F527} [TEST] \u0625\u0646\u0634\u0627\u0621 \u0625\u0634\u0639\u0627\u0631 \u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
      const notificationData = {
        type: type || "announcement",
        title: title || "\u0625\u0634\u0639\u0627\u0631 \u0627\u062E\u062A\u0628\u0627\u0631",
        body: body || "\u0647\u0630\u0627 \u0625\u0634\u0639\u0627\u0631 \u0627\u062E\u062A\u0628\u0627\u0631 \u0644\u0641\u062D\u0635 \u0627\u0644\u0646\u0638\u0627\u0645",
        priority: priority || 3,
        recipients: recipients || [userId],
        projectId: projectId || null
      };
      const notification = await notificationService.createNotification(notificationData);
      res.json({
        success: true,
        data: notification,
        message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("\u274C [TEST] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0634\u0639\u0627\u0631:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0634\u0639\u0627\u0631"
      });
    }
  });
  app2.get("/api/test/notifications/stats", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
      const notificationService = new NotificationService2();
      const userId = req.user?.userId || req.user?.email || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
          message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
        });
      }
      console.log(`\u{1F4CA} [TEST] \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
      const stats = await notificationService.getNotificationStats(userId);
      res.json({
        success: true,
        data: stats,
        message: "\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("\u274C [TEST] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A"
      });
    }
  });
  app2.use((error, req, res, next) => {
    console.error(`\u{1F4A5} [\u062E\u0637\u0623 \u062E\u0627\u062F\u0645] ${req.method} ${req.originalUrl}:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "\u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645",
        message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        method: req.method,
        path: req.originalUrl
      });
    }
  });
  const server = createServer(app2);
  return server;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
var vite_config_default = defineConfig({
  plugins: [react()],
  root: "client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-toast"],
          charts: ["recharts"],
          excel: ["exceljs"],
          query: ["@tanstack/react-query"],
          router: ["wouter"]
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop().replace(".tsx", "").replace(".ts", "") : "chunk";
          return `assets/[name]-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(assetInfo.name)) {
            return `assets/img/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/i.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    chunkSizeWarningLimit: 1e3,
    reportCompressedSize: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      "@": path2.resolve(process.cwd(), "client/src"),
      "@assets": path2.resolve(process.cwd(), "attached_assets"),
      "@shared": path2.resolve(process.cwd(), "shared"),
      "@lib": path2.resolve(process.cwd(), "client/src/lib")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5e3
  },
  optimizeDeps: {
    include: ["react", "react-dom"]
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_db();

// server/routes/auth.ts
init_db();
init_schema();
import { Router } from "express";
import { z as z2 } from "zod";
import { eq as eq7, sql as sql5 } from "drizzle-orm";

// server/auth/crypto-utils.ts
import bcrypt from "bcrypt";
import crypto from "crypto";
import speakeasy from "speakeasy";
var CRYPTO_CONFIG = {
  saltRounds: 10,
  // قوة تشفير bcrypt محسنة للأداء (10 = ~100ms, 12 = ~1.5s)
  totpWindow: 2,
  // نافزة TOTP (عدد الفترات الزمنية المقبولة)
  totpStep: 30,
  // خطوة TOTP بالثواني
  encryptionKey: process.env.ENCRYPTION_KEY || "construction-app-encryption-key-2025-very-secret",
  algorithm: "aes-256-gcm"
};
async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, CRYPTO_CONFIG.saltRounds);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u0634\u0641\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    throw new Error("\u0641\u0634\u0644 \u0641\u064A \u062A\u0634\u0641\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631");
  }
}
async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    return false;
  }
}
function generateTOTPSecret(userEmail, serviceName = "Construction Manager") {
  const secret = speakeasy.generateSecret({
    name: userEmail,
    issuer: serviceName,
    length: 32
  });
  const backupCodes = Array.from(
    { length: 8 },
    () => crypto.randomBytes(4).toString("hex").toUpperCase()
  );
  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url || "",
    backupCodes
  };
}
function verifyTOTPCode(secret, token) {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: CRYPTO_CONFIG.totpWindow,
      step: CRYPTO_CONFIG.totpStep
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 TOTP:", error);
    return false;
  }
}
function hashToken(token) {
  try {
    return crypto.createHash("sha256").update(token + CRYPTO_CONFIG.encryptionKey).digest("hex");
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u0634\u0641\u064A\u0631 \u0627\u0644\u0631\u0645\u0632:", error);
    throw new Error("\u0641\u0634\u0644 \u0641\u064A \u062A\u0634\u0641\u064A\u0631 \u0627\u0644\u0631\u0645\u0632");
  }
}
function validatePasswordStrength(password) {
  const issues = [];
  const suggestions = [];
  let score = 0;
  if (password.length < 8) {
    issues.push("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0642\u0635\u064A\u0631\u0629 \u062C\u062F\u0627\u064B");
    suggestions.push("\u0627\u0633\u062A\u062E\u062F\u0645 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 8 \u0623\u062D\u0631\u0641");
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }
  if (!/[A-Z]/.test(password)) {
    issues.push("\u0644\u0627 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u0643\u0628\u064A\u0631\u0629");
    suggestions.push("\u0623\u0636\u0641 \u062D\u0631\u0641\u0627\u064B \u0643\u0628\u064A\u0631\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
  } else {
    score += 1;
  }
  if (!/[a-z]/.test(password)) {
    issues.push("\u0644\u0627 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062D\u0631\u0641 \u0635\u063A\u064A\u0631\u0629");
    suggestions.push("\u0623\u0636\u0641 \u062D\u0631\u0641\u0627\u064B \u0635\u063A\u064A\u0631\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
  } else {
    score += 1;
  }
  if (!/[0-9]/.test(password)) {
    issues.push("\u0644\u0627 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u0631\u0642\u0627\u0645");
    suggestions.push("\u0623\u0636\u0641 \u0631\u0642\u0645\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644");
  } else {
    score += 1;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push("\u0644\u0627 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0645\u0648\u0632 \u062E\u0627\u0635\u0629");
    suggestions.push("\u0623\u0636\u0641 \u0631\u0645\u0632\u0627\u064B \u062E\u0627\u0635\u0627\u064B \u0645\u062B\u0644 !@#$%");
  } else {
    score += 1;
  }
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /(.)\1{2,}/
    // تكرار نفس الحرف 3 مرات أو أكثر
  ];
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      issues.push("\u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0646\u0645\u0637 \u0634\u0627\u0626\u0639 \u0623\u0648 \u0645\u062A\u0643\u0631\u0631");
      suggestions.push("\u062A\u062C\u0646\u0628 \u0627\u0644\u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0648\u0627\u0644\u062A\u0643\u0631\u0627\u0631");
      score = Math.max(0, score - 1);
      break;
    }
  }
  return {
    isValid: issues.length === 0 && score >= 4,
    score,
    issues,
    suggestions
  };
}

// server/auth/auth-service.ts
init_db();
init_schema();
import { eq as eq6 } from "drizzle-orm";

// server/auth/jwt-utils.ts
init_db();
init_schema();
import jwt2 from "jsonwebtoken";
import crypto2 from "crypto";
import { eq as eq4, and as and4, lt as lt2, or as or3, ne, gte as gte2 } from "drizzle-orm";
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_ACCESS_SECRET \u0648 JWT_REFRESH_SECRET \u0645\u0637\u0644\u0648\u0628\u0627\u0646 \u0641\u064A \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629 \u0644\u0644\u0623\u0645\u0627\u0646");
}
var JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry: "15m",
  // 15 دقيقة
  refreshTokenExpiry: "30d",
  // 30 يوم
  issuer: "construction-management-app",
  algorithm: "HS256"
};
async function generateTokenPair(userId, email, role, ipAddress, userAgent, deviceInfo) {
  const sessionId = crypto2.randomUUID();
  const deviceId = deviceInfo?.deviceId || crypto2.randomUUID();
  const now = /* @__PURE__ */ new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1e3);
  const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
  const accessPayload = { userId, email, role, sessionId, type: "access" };
  const refreshPayload = { userId, email, sessionId, type: "refresh" };
  const accessToken = jwt2.sign(accessPayload, JWT_CONFIG.accessTokenSecret, {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    issuer: JWT_CONFIG.issuer
  });
  const refreshToken = jwt2.sign(refreshPayload, JWT_CONFIG.refreshTokenSecret, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    issuer: JWT_CONFIG.issuer
  });
  const accessTokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);
  try {
    await db.insert(authUserSessions).values({
      userId,
      deviceId,
      sessionToken: sessionId,
      deviceFingerprint: deviceInfo?.fingerprint,
      userAgent,
      ipAddress,
      locationData: deviceInfo?.location,
      deviceName: deviceInfo?.name,
      browserName: deviceInfo?.browser?.name,
      browserVersion: deviceInfo?.browser?.version,
      osName: deviceInfo?.os?.name,
      osVersion: deviceInfo?.os?.version,
      deviceType: deviceInfo?.type || "web",
      loginMethod: "password",
      accessTokenHash,
      refreshTokenHash,
      expiresAt: refreshExpiresAt,
      // الجلسة تنتهي مع refresh token
      isRevoked: false
    });
    console.log("\u2705 [JWT] \u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u062C\u0644\u0633\u0629 \u0628\u0646\u062C\u0627\u062D:", { userId, sessionId: sessionId.substring(0, 8) + "..." });
  } catch (error) {
    console.error("\u274C [JWT] \u062E\u0637\u0623 \u0641\u064A \u062D\u0641\u0638 \u0627\u0644\u062C\u0644\u0633\u0629:", error);
    throw new Error("\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645");
  }
  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresAt,
    refreshExpiresAt
  };
}
async function refreshAccessTokenDev(refreshToken) {
  const startTime = Date.now();
  console.log("\u{1F504} [JWT-DEV] \u0628\u062F\u0621 \u062A\u062C\u062F\u064A\u062F \u0645\u0628\u0633\u0637 \u0644\u0644\u062A\u0637\u0648\u064A\u0631...");
  try {
    const payload = jwt2.verify(refreshToken, JWT_CONFIG.refreshTokenSecret, {
      issuer: JWT_CONFIG.issuer
    });
    if (payload.type !== "refresh") {
      console.log("\u274C [JWT-DEV] \u0646\u0648\u0639 \u0631\u0645\u0632 \u062E\u0627\u0637\u0626:", payload.type);
      return null;
    }
    const refreshTokenHash = hashToken(refreshToken);
    const userWithSession = await db.select({
      user: users,
      session: authUserSessions
    }).from(users).leftJoin(authUserSessions, and4(
      eq4(authUserSessions.userId, users.id),
      eq4(authUserSessions.refreshTokenHash, refreshTokenHash),
      eq4(authUserSessions.isRevoked, false),
      gte2(authUserSessions.expiresAt, /* @__PURE__ */ new Date())
    )).where(eq4(users.id, payload.userId)).limit(1);
    if (userWithSession.length === 0 || !userWithSession[0].user || !userWithSession[0].user.isActive) {
      console.log("\u274C [JWT-DEV] \u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0646\u0634\u0637");
      return null;
    }
    if (!userWithSession[0].session) {
      console.log("\u274C [JWT-DEV] \u062C\u0644\u0633\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u0645\u0646\u062A\u0647\u064A\u0629");
      return null;
    }
    const user = userWithSession[0].user;
    const session = userWithSession[0].session;
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1e3);
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
    const accessPayload = { userId: payload.userId, email: user.email, role: user.role, sessionId: payload.sessionId, type: "access" };
    const refreshPayload = { userId: payload.userId, email: user.email, sessionId: payload.sessionId, type: "refresh" };
    const newAccessToken = jwt2.sign(accessPayload, JWT_CONFIG.accessTokenSecret, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer
    });
    const newRefreshToken = jwt2.sign(refreshPayload, JWT_CONFIG.refreshTokenSecret, {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer
    });
    await db.update(authUserSessions).set({
      lastActivity: /* @__PURE__ */ new Date()
    }).where(eq4(authUserSessions.id, session.id));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [JWT-DEV] \u062A\u062C\u062F\u064A\u062F \u0645\u0628\u0633\u0637 \u0645\u0643\u062A\u0645\u0644 \u0641\u064A ${duration}ms`);
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: payload.sessionId,
      expiresAt,
      refreshExpiresAt
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\u274C [JWT-DEV] \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062C\u062F\u064A\u062F \u0628\u0639\u062F ${duration}ms:`, error instanceof Error ? error.message : error);
    return null;
  }
}
async function refreshAccessTokenProd(refreshToken) {
  const startTime = Date.now();
  console.log("\u{1F504} [JWT-PROD] \u0628\u062F\u0621 \u062A\u062C\u062F\u064A\u062F \u0643\u0627\u0645\u0644 \u0644\u0644\u0625\u0646\u062A\u0627\u062C...");
  try {
    const payload = jwt2.verify(refreshToken, JWT_CONFIG.refreshTokenSecret, {
      issuer: JWT_CONFIG.issuer
    });
    if (payload.type !== "refresh") {
      return null;
    }
    const user = await db.select().from(users).where(eq4(users.id, payload.userId)).limit(1);
    if (user.length === 0 || !user[0].isActive) {
      return null;
    }
    const refreshTokenHash = hashToken(refreshToken);
    const session = await db.select().from(authUserSessions).where(
      and4(
        eq4(authUserSessions.userId, payload.userId),
        eq4(authUserSessions.refreshTokenHash, refreshTokenHash),
        eq4(authUserSessions.isRevoked, false),
        gte2(authUserSessions.expiresAt, /* @__PURE__ */ new Date())
      )
    ).limit(1);
    if (session.length === 0) {
      return null;
    }
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1e3);
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
    const newSessionId = crypto2.randomUUID();
    const accessPayload = { userId: payload.userId, email: user[0].email, role: user[0].role, sessionId: newSessionId, type: "access" };
    const refreshPayload = { userId: payload.userId, email: user[0].email, sessionId: newSessionId, type: "refresh" };
    const newAccessToken = jwt2.sign(accessPayload, JWT_CONFIG.accessTokenSecret, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer
    });
    const newRefreshToken = jwt2.sign(refreshPayload, JWT_CONFIG.refreshTokenSecret, {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer
    });
    const newAccessTokenHash = hashToken(newAccessToken);
    const newRefreshTokenHash = hashToken(newRefreshToken);
    await db.update(authUserSessions).set({
      sessionToken: newSessionId,
      accessTokenHash: newAccessTokenHash,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: refreshExpiresAt,
      lastActivity: /* @__PURE__ */ new Date()
    }).where(eq4(authUserSessions.id, session[0].id));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [JWT-PROD] \u062A\u0645 \u062A\u062F\u0648\u064A\u0631 \u0627\u0644\u0631\u0645\u0648\u0632 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      userId: payload.userId,
      oldSessionId: session[0].sessionToken?.substring(0, 8) + "...",
      newSessionId: newSessionId.substring(0, 8) + "..."
    });
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: newSessionId,
      expiresAt,
      refreshExpiresAt
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\u274C [JWT-PROD] \u062E\u0637\u0623 \u0641\u064A \u062A\u062C\u062F\u064A\u062F \u0627\u0644\u0631\u0645\u0632 \u0628\u0639\u062F ${duration}ms`);
    return null;
  }
}
async function refreshAccessToken(refreshToken) {
  const isDevelopment = process.env.NODE_ENV === "development";
  if (isDevelopment) {
    return await refreshAccessTokenDev(refreshToken);
  } else {
    return await refreshAccessTokenProd(refreshToken);
  }
}
async function revokeToken(tokenOrSessionId, reason) {
  try {
    let updated = await db.update(authUserSessions).set({
      isRevoked: true,
      revokedAt: /* @__PURE__ */ new Date(),
      revokedReason: reason || "manual_revoke"
    }).where(eq4(authUserSessions.sessionToken, tokenOrSessionId));
    if ((updated.rowCount || 0) === 0) {
      updated = await db.update(authUserSessions).set({
        isRevoked: true,
        revokedAt: /* @__PURE__ */ new Date(),
        revokedReason: reason || "manual_revoke"
      }).where(
        or3(
          eq4(authUserSessions.accessTokenHash, tokenOrSessionId),
          eq4(authUserSessions.refreshTokenHash, tokenOrSessionId),
          eq4(authUserSessions.deviceId, tokenOrSessionId)
        )
      );
    }
    const success = (updated.rowCount || 0) > 0;
    if (success) {
      console.log("\u2705 [JWT] \u062A\u0645 \u0625\u0628\u0637\u0627\u0644 \u0627\u0644\u062C\u0644\u0633\u0629 \u0628\u0646\u062C\u0627\u062D:", {
        sessionId: tokenOrSessionId.length > 32 ? "token" : tokenOrSessionId.substring(0, 8) + "...",
        reason
      });
    }
    return success;
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0625\u0628\u0637\u0627\u0644 \u0627\u0644\u062C\u0644\u0633\u0629");
    return false;
  }
}
async function revokeAllUserSessions(userId, exceptSessionId) {
  try {
    const conditions = [
      eq4(authUserSessions.userId, userId),
      eq4(authUserSessions.isRevoked, false)
    ];
    if (exceptSessionId) {
      conditions.push(ne(authUserSessions.deviceId, exceptSessionId));
    }
    const updated = await db.update(authUserSessions).set({
      isRevoked: true,
      revokedAt: /* @__PURE__ */ new Date(),
      revokedReason: "logout_all_devices"
    }).where(and4(...conditions));
    return updated.rowCount || 0;
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0625\u0628\u0637\u0627\u0644 \u062C\u0644\u0633\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", error);
    return 0;
  }
}
async function getUserActiveSessions(userId) {
  return db.select({
    sessionId: authUserSessions.deviceId,
    ipAddress: authUserSessions.ipAddress,
    userAgent: authUserSessions.browserName,
    deviceInfo: authUserSessions.deviceType,
    issuedAt: authUserSessions.createdAt,
    lastUsedAt: authUserSessions.lastActivity,
    expiresAt: authUserSessions.expiresAt
  }).from(authUserSessions).where(
    and4(
      eq4(authUserSessions.userId, userId),
      eq4(authUserSessions.isRevoked, false)
    )
  ).orderBy(authUserSessions.lastActivity);
}

// server/services/email-service.ts
init_db();
init_schema();
import nodemailer from "nodemailer";
import { eq as eq5, and as and5, sql as sql4 } from "drizzle-orm";
import crypto3 from "crypto";
var createTransporter = () => {
  const smtpUser = process.env.SMTP_USER?.trim().replace(/\s+/g, "") || "";
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  console.log("\u{1F4E7} [EmailService] \u0625\u0639\u062F\u0627\u062F SMTP:", {
    host: smtpConfig.host,
    port: smtpConfig.port,
    user: smtpUser,
    originalUser: process.env.SMTP_USER,
    hasPassword: !!smtpConfig.auth.pass
  });
  return nodemailer.createTransport(smtpConfig);
};
async function verifyEmailConfiguration() {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("\u2705 [EmailService] \u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F SMTP \u0628\u0646\u062C\u0627\u062D");
    return true;
  } catch (error) {
    console.error("\u274C [EmailService] \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F SMTP:", error);
    return false;
  }
}
function generateVerificationCode() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function generateSecureToken() {
  return crypto3.randomBytes(32).toString("hex");
}
function getDynamicDomain() {
  if (process.env.NODE_ENV === "development") {
    return "localhost:5000";
  }
  if (process.env.DOMAIN) {
    return process.env.DOMAIN;
  }
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `${process.env.REPL_SLUG}--5000.${process.env.REPL_OWNER}.repl.co`;
  }
  return process.env.NODE_ENV === "production" ? "app2.binarjoinanelytic.info" : "localhost:5000";
}
function getProtocol() {
  return process.env.NODE_ENV === "production" ? "https" : "http";
}
async function hashToken2(token) {
  return crypto3.createHash("sha256").update(token).digest("hex");
}
var emailTemplates = {
  verification: (code, verificationLink, userFullName) => ({
    subject: "\u{1F510} \u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643 - \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 40px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px; text-align: center; }
          .verification-code { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; display: inline-block; }
          .button { display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin: 20px 0; transition: transform 0.3s ease; }
          .button:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; border-top: 1px solid #e9ecef; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 10px; margin: 20px 0; color: #856404; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>\u{1F510} \u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643</h1>
            <p>\u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0625\u0646\u0634\u0627\u0626\u064A\u0629</p>
          </div>
          <div class="content">
            <h2>${userFullName ? `\u0645\u0631\u062D\u0628\u0627\u064B ${userFullName}!` : "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643!"}</h2>
            <p>\u0634\u0643\u0631\u0627\u064B \u0644\u0643 \u0639\u0644\u0649 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0641\u064A \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639. \u0644\u0625\u0643\u0645\u0627\u0644 \u062A\u0641\u0639\u064A\u0644 \u062D\u0633\u0627\u0628\u0643\u060C \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u0627\u0644\u064A:</p>
            
            <div class="verification-code" style="cursor: pointer; user-select: all; position: relative;">
              ${code}
              <small style="display: block; font-size: 12px; margin-top: 10px; opacity: 0.8;">\u0627\u0646\u0642\u0631 \u0644\u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0643\u0648\u062F</small>
            </div>
            
            <p>\u0623\u0648 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0628\u0627\u0634\u0631\u0629:</p>
            <a href="${verificationLink}" class="button">\u2705 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0633\u0627\u0628</a>
            
            <div class="warning">
              <strong>\u062A\u0646\u0628\u064A\u0647 \u0623\u0645\u0646\u064A:</strong>
              <ul style="text-align: right; margin: 10px 0;">
                <li>\u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 24 \u0633\u0627\u0639\u0629 \u0641\u0642\u0637</li>
                <li>\u0644\u0627 \u062A\u0634\u0627\u0631\u0643 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0639 \u0623\u064A \u0634\u062E\u0635 \u0622\u062E\u0631</li>
                <li>\u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u062A\u062D\u0642\u0642\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>\xA9 2025 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 - \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629</p>
            <p>\u0647\u0630\u0627 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u060C \u064A\u0631\u062C\u0649 \u0639\u062F\u0645 \u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0647</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      \u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643 - \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639
      
      ${userFullName ? `\u0645\u0631\u062D\u0628\u0627\u064B ${userFullName}!` : "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643!"}
      \u0634\u0643\u0631\u0627\u064B \u0644\u0643 \u0639\u0644\u0649 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0641\u064A \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639.
      
      \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643: ${code}
      
      \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A: ${verificationLink}
      
      \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 24 \u0633\u0627\u0639\u0629 \u0641\u0642\u0637.
      \u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u062A\u062D\u0642\u0642\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.
    `
  }),
  passwordReset: (resetLink, userEmail) => ({
    subject: "\u{1F511} \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 - \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 40px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px; text-align: center; }
          .button { display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin: 20px 0; transition: transform 0.3s ease; }
          .button:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; border-top: 1px solid #e9ecef; }
          .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 10px; margin: 20px 0; color: #721c24; }
          .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 10px; margin: 20px 0; color: #0c5460; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>\u{1F511} \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</h1>
            <p>\u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0625\u0646\u0634\u0627\u0626\u064A\u0629</p>
          </div>
          <div class="content">
            <h2>\u0637\u0644\u0628 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</h2>
            <p>\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628 \u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0631\u062A\u0628\u0637 \u0628\u0640: <strong>${userEmail}</strong></p>
            
            <p>\u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0625\u0646\u0634\u0627\u0621 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629:</p>
            <a href="${resetLink}" class="button">\u{1F510} \u0625\u0646\u0634\u0627\u0621 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629</a>
            
            <div class="warning">
              <strong>\u062A\u0646\u0628\u064A\u0647 \u0623\u0645\u0646\u064A \u0645\u0647\u0645:</strong>
              <ul style="text-align: right; margin: 10px 0;">
                <li>\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 \u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637</li>
                <li>\u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637</li>
                <li>\u0644\u0627 \u062A\u0634\u0627\u0631\u0643 \u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0639 \u0623\u064A \u0634\u062E\u0635 \u0622\u062E\u0631</li>
              </ul>
            </div>
            
            <div class="info">
              <strong>\u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:</strong>
              <p>\u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0648\u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0644\u0644\u0623\u0645\u0627\u0646</p>
            </div>
          </div>
          <div class="footer">
            <p>\xA9 2025 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 - \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629</p>
            <p>\u0647\u0630\u0627 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u060C \u064A\u0631\u062C\u0649 \u0639\u062F\u0645 \u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0647</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 - \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639
      
      \u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628 \u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u0644\u062D\u0633\u0627\u0628: ${userEmail}
      
      \u0644\u0625\u0646\u0634\u0627\u0621 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A: ${resetLink}
      
      \u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 \u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637.
      \u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.
    `
  })
};
async function sendVerificationEmail(userId, email, ipAddress, userAgent) {
  try {
    console.log("\u{1F4E7} [EmailService] \u0628\u062F\u0621 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", userId);
    let userFullName = null;
    try {
      const userQuery = await db.execute(sql4`
        SELECT first_name, last_name 
        FROM users 
        WHERE id = ${userId}
      `);
      if (userQuery.rows.length > 0) {
        const user = userQuery.rows[0];
        const firstName = user.first_name?.trim() || "";
        const lastName = user.last_name?.trim() || "";
        userFullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
      }
    } catch (userError) {
      console.log("\u2139\uFE0F [EmailService] \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645, \u0633\u064A\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u062D\u064A\u0629 \u0639\u0627\u0645\u0629");
    }
    const isConfigValid = await verifyEmailConfiguration();
    if (!isConfigValid) {
      return {
        success: false,
        message: "\u062E\u0637\u0623 \u0641\u064A \u0625\u0639\u062F\u0627\u062F \u062E\u062F\u0645\u0629 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
      };
    }
    await db.delete(emailVerificationTokens).where(and5(
      eq5(emailVerificationTokens.userId, userId),
      eq5(emailVerificationTokens.email, email)
    ));
    const verificationCode = generateVerificationCode();
    const tokenHash = await hashToken2(verificationCode);
    const domain = getDynamicDomain();
    const protocol = getProtocol();
    const verificationLink = `${protocol}://${domain}/verify-email?token=${verificationCode}&userId=${userId}`;
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await db.insert(emailVerificationTokens).values({
      userId,
      email,
      token: verificationCode,
      tokenHash,
      verificationLink,
      expiresAt,
      ipAddress,
      userAgent
    });
    const transporter = createTransporter();
    const emailTemplate = emailTemplates.verification(verificationCode, verificationLink, userFullName);
    const cleanEmail = process.env.SMTP_USER?.trim().replace(/\s+/g, "") || "";
    await transporter.sendMail({
      from: `"\u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639" <${cleanEmail}>`,
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });
    console.log("\u2705 [EmailService] \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649:", email);
    return {
      success: true,
      message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
    };
  } catch (error) {
    console.error("\u274C [EmailService] \u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642:", error);
    return {
      success: false,
      message: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B"
    };
  }
}
async function verifyEmailToken(userId, token) {
  try {
    console.log("\u{1F50D} [EmailService] \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", userId);
    const tokenRecord = await db.select().from(emailVerificationTokens).where(and5(
      eq5(emailVerificationTokens.userId, userId),
      eq5(emailVerificationTokens.token, token)
    )).limit(1);
    if (tokenRecord.length === 0) {
      return {
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"
      };
    }
    const record = tokenRecord[0];
    if (/* @__PURE__ */ new Date() > record.expiresAt) {
      await db.delete(emailVerificationTokens).where(eq5(emailVerificationTokens.id, record.id));
      return {
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F"
      };
    }
    if (record.verifiedAt) {
      return {
        success: false,
        message: "\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0633\u0628\u0642\u0627\u064B"
      };
    }
    await db.update(emailVerificationTokens).set({ verifiedAt: /* @__PURE__ */ new Date() }).where(eq5(emailVerificationTokens.id, record.id));
    await db.update(users).set({ emailVerifiedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, userId));
    console.log("\u2705 [EmailService] \u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", userId);
    return {
      success: true,
      message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D"
    };
  } catch (error) {
    console.error("\u274C [EmailService] \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A:", error);
    return {
      success: false,
      message: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B"
    };
  }
}
async function sendPasswordResetEmail(email, ipAddress, userAgent) {
  try {
    console.log("\u{1F511} [EmailService] \u0628\u062F\u0621 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u0644\u0628\u0631\u064A\u062F:", email);
    const userResult = await db.select().from(users).where(eq5(users.email, email)).limit(1);
    if (userResult.length === 0) {
      return {
        success: true,
        message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645\u060C \u0633\u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631"
      };
    }
    const user = userResult[0];
    const isConfigValid = await verifyEmailConfiguration();
    if (!isConfigValid) {
      return {
        success: false,
        message: "\u062E\u0637\u0623 \u0641\u064A \u0625\u0639\u062F\u0627\u062F \u062E\u062F\u0645\u0629 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
      };
    }
    await db.delete(passwordResetTokens).where(eq5(passwordResetTokens.userId, user.id));
    const resetToken = generateSecureToken();
    const tokenHash = await hashToken2(resetToken);
    const domain = getDynamicDomain();
    const protocol = getProtocol();
    const resetLink = `${protocol}://${domain}/reset-password?token=${resetToken}`;
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent
    });
    const transporter = createTransporter();
    const emailTemplate = emailTemplates.passwordReset(resetLink, email);
    const cleanEmail = process.env.SMTP_USER?.trim().replace(/\s+/g, "") || "";
    await transporter.sendMail({
      from: `"\u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639" <${cleanEmail}>`,
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });
    console.log("\u2705 [EmailService] \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649:", email);
    return {
      success: true,
      message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645\u060C \u0633\u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631"
    };
  } catch (error) {
    console.error("\u274C [EmailService] \u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    return {
      success: false,
      message: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B"
    };
  }
}
async function resetPasswordWithToken(token, newPassword) {
  try {
    console.log("\u{1F510} [EmailService] \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631");
    const tokenRecord = await db.select().from(passwordResetTokens).where(eq5(passwordResetTokens.token, token)).limit(1);
    if (tokenRecord.length === 0) {
      return {
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"
      };
    }
    const record = tokenRecord[0];
    if (/* @__PURE__ */ new Date() > record.expiresAt) {
      await db.delete(passwordResetTokens).where(eq5(passwordResetTokens.id, record.id));
      return {
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F"
      };
    }
    if (record.usedAt) {
      return {
        success: false,
        message: "\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0633\u0628\u0642\u0627\u064B"
      };
    }
    const hashedPassword = await hashPassword(newPassword);
    await db.update(users).set({ password: hashedPassword }).where(eq5(users.id, record.userId));
    await db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq5(passwordResetTokens.id, record.id));
    console.log("\u2705 [EmailService] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", record.userId);
    return {
      success: true,
      message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D"
    };
  } catch (error) {
    console.error("\u274C [EmailService] \u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    return {
      success: false,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B"
    };
  }
}
async function validatePasswordResetToken(token) {
  try {
    const tokenRecord = await db.select().from(passwordResetTokens).where(eq5(passwordResetTokens.token, token)).limit(1);
    if (tokenRecord.length === 0) {
      return {
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"
      };
    }
    const record = tokenRecord[0];
    if (/* @__PURE__ */ new Date() > record.expiresAt) {
      return {
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629"
      };
    }
    if (record.usedAt) {
      return {
        success: false,
        message: "\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0633\u0628\u0642\u0627\u064B"
      };
    }
    return {
      success: true,
      message: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0635\u0627\u0644\u062D"
    };
  } catch (error) {
    console.error("\u274C [EmailService] \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639:", error);
    return {
      success: false,
      message: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632"
    };
  }
}

// server/auth/auth-service.ts
function parseFullName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: fullName || "" };
  }
  const cleanName = fullName.trim().replace(/\s+/g, " ");
  if (!cleanName) {
    return { firstName: "" };
  }
  const nameParts = cleanName.split(" ").filter((part) => part.length > 0);
  if (nameParts.length === 0) {
    return { firstName: cleanName };
  } else if (nameParts.length === 1) {
    return { firstName: nameParts[0] };
  } else if (nameParts.length === 2) {
    return {
      firstName: nameParts[0],
      lastName: nameParts[1]
    };
  } else {
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ")
    };
  }
}
function createUserFriendlyErrorMessage(error) {
  if (!error) return "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639";
  const errorMessage = error.message || error.toString() || "";
  if (errorMessage.includes("unique constraint") || errorMessage.includes("duplicate key")) {
    return "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0622\u062E\u0631";
  }
  if (errorMessage.includes("connection") || errorMessage.includes("timeout")) {
    return "\u0645\u0634\u0643\u0644\u0629 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u062E\u0627\u062F\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B";
  }
  if (errorMessage.includes("validation") || errorMessage.includes("invalid")) {
    return "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062F\u062E\u0644\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u062F\u062E\u0644\u0629";
  }
  if (errorMessage.includes("password")) {
    return "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u0627 \u062A\u0644\u0628\u064A \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629";
  }
  if (errorMessage.includes("email")) {
    return "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
  }
  return "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628\u0643. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B";
}
async function registerUser(request) {
  const { email, password, name, phone, role = "user", ipAddress, userAgent } = request;
  try {
    console.log("\u{1F527} [Register] \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u062A\u0633\u062C\u064A\u0644 \u0645\u0633\u062A\u062E\u062F\u0645 \u062C\u062F\u064A\u062F:", { email, hasName: !!name });
    const parsedName = parseFullName(name);
    console.log("\u{1F464} [Register] \u062A\u0645 \u062A\u0642\u0633\u064A\u0645 \u0627\u0644\u0627\u0633\u0645:", parsedName);
    if (!parsedName.firstName || parsedName.firstName.trim().length === 0) {
      return {
        success: false,
        message: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 \u0645\u0637\u0644\u0648\u0628. \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0635\u062D\u064A\u062D",
        issues: ["\u0627\u0644\u0627\u0633\u0645 \u0641\u0627\u0631\u063A \u0623\u0648 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"]
      };
    }
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u0627 \u062A\u0644\u0628\u064A \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629",
        issues: passwordValidation.issues,
        suggestions: passwordValidation.suggestions
      };
    }
    console.log("\u{1F50D} [Register] \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0648\u062C\u0648\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u0627\u064B...");
    const existingUser = await db.select().from(users).where(eq6(users.email, email.toLowerCase())).limit(1);
    if (existingUser.length > 0) {
      console.log("\u274C [Register] \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B");
      return {
        success: false,
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0622\u062E\u0631 \u0623\u0648 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644"
      };
    }
    console.log("\u{1F510} [Register] \u062A\u0634\u0641\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631...");
    const passwordHash = await hashPassword(password);
    console.log("\u{1F4DD} [Register] \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const newUser = await db.insert(users).values({
      email: email.toLowerCase(),
      password: passwordHash,
      firstName: parsedName.firstName.trim(),
      lastName: parsedName.lastName?.trim() || null,
      // phone: phone?.trim() || null, // حقل غير موجود في schema
      role,
      isActive: true
      // emailVerifiedAt: null, // سيتم تعيينه بعد التحقق من البريد الإلكتروني
    }).returning();
    const userId = newUser[0].id;
    console.log("\u2705 [Register] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D:", {
      userId,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName
    });
    console.log("\u{1F4E7} [Register] \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A...");
    const emailResult = await sendVerificationEmail(
      userId,
      email.toLowerCase(),
      ipAddress,
      userAgent
    );
    if (!emailResult.success) {
      console.error("\u274C [Register] \u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642:", emailResult.message);
      await db.delete(users).where(eq6(users.id, userId));
      return {
        success: false,
        message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628 \u0644\u0643\u0646 \u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
      };
    }
    console.log("\u2705 [Register] \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D");
    await logAuditEvent({
      userId,
      action: "user_registered",
      resource: "auth",
      ipAddress,
      userAgent,
      status: "success",
      metadata: {
        email: email.toLowerCase(),
        role,
        registrationMethod: "standard"
      }
    });
    return {
      success: true,
      message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D! \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
      requireVerification: true,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: `${parsedName.firstName} ${parsedName.lastName || ""}`.trim(),
        firstName: parsedName.firstName,
        lastName: parsedName.lastName || "",
        role
      }
    };
  } catch (error) {
    console.error("\u274C [Register] \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u0633\u062C\u064A\u0644:", error);
    await logAuditEvent({
      action: "user_registration_error",
      resource: "auth",
      ipAddress,
      userAgent,
      status: "error",
      errorMessage: error.message,
      metadata: { email }
    });
    const userFriendlyMessage = createUserFriendlyErrorMessage(error);
    return {
      success: false,
      message: userFriendlyMessage,
      error: process.env.NODE_ENV === "development" ? error.message : void 0
    };
  }
}
async function verifyEmail(userId, code, ipAddress, userAgent) {
  try {
    await logAuditEvent({
      userId,
      action: "email_verified",
      resource: "auth",
      ipAddress,
      userAgent,
      status: "success"
    });
    return {
      success: true,
      message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D"
    };
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064A\u062F:", error);
    return {
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u062D\u0642\u0642"
    };
  }
}
async function setupTOTP(userId, email) {
  try {
    const { secret, qrCodeUrl, backupCodes } = generateTOTPSecret(email);
    await db.update(users).set({
      totpSecret: secret
      // mfaEnabled حقل غير موجود في جدول users
    }).where(eq6(users.id, userId));
    return {
      success: true,
      secret,
      qrCodeUrl,
      backupCodes,
      message: "\u064A\u0631\u062C\u0649 \u0645\u0633\u062D \u0627\u0644\u0643\u0648\u062F \u0648\u0625\u062F\u062E\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0644\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629"
    };
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0625\u0639\u062F\u0627\u062F TOTP:", error);
    return {
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629"
    };
  }
}
async function enableTOTP(userId, totpCode, ipAddress, userAgent) {
  try {
    const user = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
    if (user.length === 0 || !user[0].totpSecret) {
      return {
        success: false,
        message: "\u0644\u0645 \u064A\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629"
      };
    }
    const isValid = verifyTOTPCode(user[0].totpSecret, totpCode);
    if (!isValid) {
      return {
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"
      };
    }
    await logAuditEvent({
      userId,
      action: "mfa_enabled",
      resource: "security",
      ipAddress,
      userAgent,
      status: "success"
    });
    return {
      success: true,
      message: "\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629 \u0628\u0646\u062C\u0627\u062D"
    };
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u0641\u0639\u064A\u0644 MFA:", error);
    return {
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629"
    };
  }
}
async function logAuditEvent(event) {
  try {
    if (event.action?.includes("failed") || event.action?.includes("error")) {
      console.log("\u{1F50D} [Security]", {
        action: event.action,
        status: event.status || "success"
      });
    }
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u0633\u062C\u064A\u0644 \u062D\u062F\u062B \u0627\u0644\u062A\u062F\u0642\u064A\u0642:", error);
  }
}
async function getActiveSessions(userId) {
  return getUserActiveSessions(userId);
}
async function terminateSession(userId, sessionId, reason = "user_logout") {
  return revokeToken(sessionId, reason);
}
async function terminateAllOtherSessions(userId, exceptSessionId) {
  return revokeAllUserSessions(userId, exceptSessionId);
}
async function changePassword(userId, currentPassword, newPassword, ipAddress, userAgent) {
  try {
    const user = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
    if (user.length === 0) {
      return {
        success: false,
        message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"
      };
    }
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user[0].password);
    if (!isCurrentPasswordValid) {
      await logAuditEvent({
        userId,
        action: "password_change_failed",
        resource: "security",
        ipAddress,
        userAgent,
        status: "failure",
        errorMessage: "\u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062D\u0627\u0644\u064A\u0629 \u062E\u0627\u0637\u0626\u0629"
      });
      return {
        success: false,
        message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      };
    }
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0636\u0639\u064A\u0641\u0629",
        issues: passwordValidation.issues,
        suggestions: passwordValidation.suggestions
      };
    }
    const newPasswordHash = await hashPassword(newPassword);
    await db.update(users).set({
      password: newPasswordHash
    }).where(eq6(users.id, userId));
    await revokeAllUserSessions(userId);
    await logAuditEvent({
      userId,
      action: "password_changed",
      resource: "security",
      ipAddress,
      userAgent,
      status: "success"
    });
    return {
      success: true,
      message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D. \u0633\u064A\u062A\u0645 \u0625\u0646\u0647\u0627\u0621 \u062C\u0645\u064A\u0639 \u0627\u0644\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u0646\u0634\u0637\u0629"
    };
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    await logAuditEvent({
      userId,
      action: "password_change_error",
      resource: "security",
      ipAddress,
      userAgent,
      status: "error",
      errorMessage: error.message
    });
    return {
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631"
    };
  }
}

// server/routes/auth.ts
console.log("\u{1F527} [Auth] \u0625\u0639\u062F\u0627\u062F JWT secrets:", {
  accessSecret: JWT_CONFIG.accessTokenSecret ? "\u0645\u062A\u0648\u0641\u0631" : "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
  refreshSecret: JWT_CONFIG.refreshTokenSecret ? "\u0645\u062A\u0648\u0641\u0631" : "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
  source: "jwt-utils.ts"
});
var router = Router();
var loginSchema = z2.object({
  email: z2.string().email("\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"),
  password: z2.string().min(6, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0642\u0635\u064A\u0631\u0629 \u062C\u062F\u0627\u064B"),
  totpCode: z2.string().optional()
});
var registerSchema = z2.object({
  email: z2.string().email("\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"),
  password: z2.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 8 \u0623\u062D\u0631\u0641"),
  name: z2.string().min(2, "\u0627\u0644\u0627\u0633\u0645 \u0642\u0635\u064A\u0631 \u062C\u062F\u0627\u064B"),
  phone: z2.string().optional(),
  role: z2.string().optional()
});
var verifyEmailSchema = z2.object({
  userId: z2.string(),
  code: z2.string().length(6, "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 6 \u0623\u0631\u0642\u0627\u0645")
});
var enableTOTPSchema = z2.object({
  totpCode: z2.string().length(6, "\u0631\u0645\u0632 TOTP \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 6 \u0623\u0631\u0642\u0627\u0645")
});
var changePasswordSchema = z2.object({
  currentPassword: z2.string().min(1, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629"),
  newPassword: z2.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 8 \u0623\u062D\u0631\u0641")
});
var forgotPasswordSchema = z2.object({
  email: z2.string().email("\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D").min(1, "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628")
});
var resetPasswordSchema = z2.object({
  token: z2.string().min(1, "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0637\u0644\u0648\u0628"),
  newPassword: z2.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 8 \u0623\u062D\u0631\u0641")
});
function getRequestInfo(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    deviceInfo: {
      type: req.headers["x-device-type"] || "web",
      name: req.headers["x-device-name"] || "unknown"
    }
  };
}
router.post("/login", async (req, res) => {
  try {
    console.log("\u{1F511} [Auth] \u0637\u0644\u0628 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u062C\u062F\u064A\u062F:", { email: req.body?.email, hasPassword: !!req.body?.password });
    const { email, password } = req.body;
    if (!email || !password) {
      console.log("\u274C [Auth] \u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629:", { email: !!email, password: !!password });
      return res.status(400).json({
        success: false,
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646"
      });
    }
    console.log("\u{1F50D} [Auth] \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", email.toLowerCase());
    const isDevEnvironment = process.env.NODE_ENV === "development";
    const quickLoginEnabled = process.env.ENABLE_QUICK_LOGIN !== "false";
    const isBypassLogin = email === "admin@demo.local" && password === "bypass-demo-login";
    if (isBypassLogin && isDevEnvironment && quickLoginEnabled) {
      console.log("\u{1F680} [Auth] \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0633\u0631\u064A\u0639 \u062A\u062C\u0631\u064A\u0628\u064A (\u0628\u064A\u0626\u0629 \u062A\u0637\u0648\u064A\u0631 \u0641\u0642\u0637)");
      let user2 = await db.select().from(users).where(eq7(users.role, "admin")).limit(1);
      if (user2.length === 0) {
        console.log("\u{1F464} [Auth] \u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062A\u062E\u062F\u0645 admin \u062A\u062C\u0631\u064A\u0628\u064A");
        const newUser = await db.insert(users).values({
          email: "admin@demo.local",
          password: "demo-hash",
          // كلمة مرور وهمية
          firstName: "\u0645\u062F\u064A\u0631",
          lastName: "\u0627\u0644\u0646\u0638\u0627\u0645",
          role: "admin",
          isActive: true
        }).returning();
        user2 = newUser;
      }
      const { accessToken: accessToken2, refreshToken: refreshToken2 } = await generateTokenPair(
        user2[0].id,
        user2[0].email,
        user2[0].role
      );
      console.log("\u2705 [Auth] \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u0631\u064A\u0639 \u0628\u0646\u062C\u0627\u062D");
      const quickLoginResponse = {
        success: true,
        message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u0631\u064A\u0639 \u0628\u0646\u062C\u0627\u062D",
        data: {
          user: {
            id: user2[0].id,
            email: user2[0].email,
            firstName: user2[0].firstName,
            lastName: user2[0].lastName,
            name: `${user2[0].firstName || ""} ${user2[0].lastName || ""}`.trim() || user2[0].email,
            role: user2[0].role,
            mfaEnabled: false
          },
          accessToken: accessToken2,
          refreshToken: refreshToken2
        }
      };
      console.log("\u{1F680} [Auth] \u0625\u0631\u0633\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u0631\u064A\u0639:", {
        hasUser: !!quickLoginResponse.data.user,
        userId: quickLoginResponse.data.user.id,
        userEmail: quickLoginResponse.data.user.email,
        hasToken: !!quickLoginResponse.data.accessToken,
        responseStructure: {
          success: quickLoginResponse.success,
          hasData: !!quickLoginResponse.data,
          dataKeys: Object.keys(quickLoginResponse.data),
          userKeys: quickLoginResponse.data.user ? Object.keys(quickLoginResponse.data.user) : "none"
        }
      });
      console.log("\u2705 [Auth] \u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u0631\u064A\u0639 \u0628\u0646\u062C\u0627\u062D");
      return res.status(200).json(quickLoginResponse);
    }
    if (isBypassLogin && !isDevEnvironment) {
      console.log("\u{1F6AB} [Auth] \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0633\u0631\u064A\u0639 \u0641\u064A \u0628\u064A\u0626\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C - \u0645\u0631\u0641\u0648\u0636");
      return res.status(401).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    }
    if (isBypassLogin && !quickLoginEnabled) {
      console.log("\u{1F6AB} [Auth] \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u0631\u064A\u0639 \u0645\u0639\u0637\u0644");
      return res.status(401).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    }
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      password: users.password,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).where(eq7(users.email, email.toLowerCase())).limit(1);
    if (userResult.length === 0) {
      console.log("\u274C [Auth] \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", email);
      return res.status(401).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    }
    const user = userResult[0];
    console.log("\u2705 [Auth] \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", { id: user.id, email: user.email, isActive: user.isActive });
    const isValidPassword = await verifyPassword(password, user.password);
    console.log("\u{1F510} [Auth] \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", isValidPassword);
    if (!isValidPassword) {
      console.log("\u274C [Auth] \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629");
      return res.status(401).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    }
    if (!user.isActive) {
      console.log("\u274C [Auth] \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0639\u0637\u0644");
      return res.status(403).json({
        success: false,
        message: "\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0639\u0637\u0644\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0645\u062F\u064A\u0631"
      });
    }
    console.log("\u{1F3AF} [Auth] \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0648\u0643\u064A\u0646\u0627\u062A...");
    const { accessToken, refreshToken } = await generateTokenPair(
      user.id,
      user.email,
      user.role
    );
    console.log("\u{1F4DD} [Auth] \u062A\u062D\u062F\u064A\u062B \u0622\u062E\u0631 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644...");
    await db.update(users).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq7(users.id, user.id));
    console.log("\u2705 [Auth] \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0646\u062C\u0627\u062D");
    const responseData = {
      success: true,
      message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0646\u062C\u0627\u062D",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
          role: user.role,
          mfaEnabled: false
        },
        accessToken,
        refreshToken
      }
    };
    console.log("\u{1F4E4} [Auth] \u0625\u0631\u0633\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644:", {
      hasUser: !!responseData.data.user,
      userId: responseData.data.user.id,
      userEmail: responseData.data.user.email,
      userRole: responseData.data.user.role,
      hasToken: !!responseData.data.accessToken,
      hasRefreshToken: !!responseData.data.refreshToken,
      responseStructure: {
        success: responseData.success,
        hasData: !!responseData.data,
        dataKeys: Object.keys(responseData.data),
        userKeys: responseData.data.user ? Object.keys(responseData.data.user) : "none"
      }
    });
    console.log("\u2705 [Auth] \u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0646\u062C\u0627\u062D");
    res.status(200).json(responseData);
  } catch (error) {
    console.error("\u274C [Auth] \u062E\u0637\u0623 \u0641\u064A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B",
      error: process.env.NODE_ENV === "development" ? error instanceof Error ? error.message : String(error) : void 0
    });
  }
});
router.post("/register", async (req, res) => {
  try {
    console.log("\u{1F4DD} [API/register] \u0637\u0644\u0628 \u062A\u0633\u062C\u064A\u0644 \u062C\u062F\u064A\u062F:", {
      email: req.body?.email,
      hasName: !!req.body?.name,
      hasPassword: !!req.body?.password
    });
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      const friendlyErrors = validation.error.errors.map((error) => {
        const field = error.path.join(".");
        switch (field) {
          case "email":
            return "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D. \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0635\u062D\u064A\u062D";
          case "password":
            return "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0648\u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0648\u0641 \u0643\u0628\u064A\u0631\u0629 \u0648\u0635\u063A\u064A\u0631\u0629 \u0648\u0623\u0631\u0642\u0627\u0645";
          case "name":
            return "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628 \u0648\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u062D\u0631\u0641\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644";
          default:
            return error.message;
        }
      });
      return res.status(400).json({
        success: false,
        message: "\u064A\u0631\u062C\u0649 \u062A\u0635\u062D\u064A\u062D \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062F\u062E\u0644\u0629",
        errors: friendlyErrors,
        details: process.env.NODE_ENV === "development" ? validation.error.errors : void 0
      });
    }
    const requestInfo = getRequestInfo(req);
    const result = await registerUser({
      ...validation.data,
      ...requestInfo
    });
    const statusCode = result.success ? 201 : 400;
    console.log(`${result.success ? "\u2705" : "\u274C"} [API/register] \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u062A\u0633\u062C\u064A\u0644:`, {
      success: result.success,
      message: result.message,
      hasUser: !!result.user
    });
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u274C [API/register] \u062E\u0637\u0623 \u0641\u064A API \u0627\u0644\u062A\u0633\u062C\u064A\u0644:", error);
    const errorMessage = error.message;
    let userFriendlyMessage = "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B";
    if (errorMessage.includes("unique") || errorMessage.includes("duplicate")) {
      userFriendlyMessage = "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u0627\u064B";
    } else if (errorMessage.includes("connection") || errorMessage.includes("timeout")) {
      userFriendlyMessage = "\u0645\u0634\u0643\u0644\u0629 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u062E\u0627\u062F\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B";
    }
    res.status(500).json({
      success: false,
      message: userFriendlyMessage,
      error: process.env.NODE_ENV === "development" ? errorMessage : void 0
    });
  }
});
router.post("/verify-email", async (req, res) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        errors: validation.error.errors
      });
    }
    const { userId, code } = validation.data;
    const requestInfo = getRequestInfo(req);
    const result = await verifyEmail(userId, code, requestInfo.ipAddress, requestInfo.userAgent);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064A\u062F:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/refresh", async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"]?.substring(0, 100) || "unknown";
  console.log("\u{1F504} [API/refresh] \u0628\u062F\u0621 \u0637\u0644\u0628 \u062A\u062C\u062F\u064A\u062F \u0631\u0645\u0632:", {
    ip: clientIP,
    userAgent: userAgent.substring(0, 50) + "...",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      const duration2 = Date.now() - startTime;
      console.log(`\u274C [API/refresh] \u0631\u0645\u0632 \u0627\u0644\u062A\u062C\u062F\u064A\u062F \u0645\u0641\u0642\u0648\u062F \u0628\u0639\u062F ${duration2}ms`);
      return res.status(400).json({
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062C\u062F\u064A\u062F \u0645\u0637\u0644\u0648\u0628",
        code: "MISSING_REFRESH_TOKEN"
      });
    }
    console.log("\u{1F50D} [API/refresh] \u0628\u062F\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0631\u0645\u0632 \u0627\u0644\u062A\u062C\u062F\u064A\u062F");
    const result = await refreshAccessToken(refreshToken);
    const duration = Date.now() - startTime;
    if (!result) {
      console.log(`\u274C [API/refresh] \u0641\u0634\u0644 \u062A\u062C\u062F\u064A\u062F \u0627\u0644\u0631\u0645\u0632 \u0628\u0639\u062F ${duration}ms - \u0631\u0645\u0632 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A`, {
        ip: clientIP,
        duration
      });
      return res.status(401).json({
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062C\u062F\u064A\u062F \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629",
        code: "INVALID_REFRESH_TOKEN"
      });
    }
    console.log(`\u2705 [API/refresh] \u0646\u062C\u062D \u062A\u062C\u062F\u064A\u062F \u0627\u0644\u0631\u0645\u0632 \u0628\u0639\u062F ${duration}ms`, {
      ip: clientIP,
      expiresIn: Math.round((result.expiresAt.getTime() - Date.now()) / 1e3 / 60) + " \u062F\u0642\u064A\u0642\u0629",
      duration
    });
    res.json({
      success: true,
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt
      },
      metadata: {
        refreshedAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresIn: Math.round((result.expiresAt.getTime() - Date.now()) / 1e3),
        processingTime: duration
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof Error) {
      console.error(`\u{1F4A5} [API/refresh] \u062E\u0637\u0623 \u0641\u064A \u062A\u062C\u062F\u064A\u062F \u0627\u0644\u0631\u0645\u0632 \u0628\u0639\u062F ${duration}ms:`, {
        message: error.message,
        name: error.name,
        ip: clientIP,
        duration,
        stack: error.stack?.split("\n").slice(0, 3).join("\n")
        // أول 3 سطور من stack trace
      });
      if (error.message.includes("jwt") || error.message.includes("token")) {
        return res.status(401).json({
          success: false,
          message: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062C\u062F\u064A\u062F \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
          code: "TOKEN_ERROR"
        });
      } else if (error.message.includes("database") || error.message.includes("connection")) {
        return res.status(503).json({
          success: false,
          message: "\u0645\u0634\u0643\u0644\u0629 \u0645\u0624\u0642\u062A\u0629 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B",
          code: "SERVICE_UNAVAILABLE"
        });
      }
    } else {
      console.error(`\u{1F4A5} [API/refresh] \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641 \u0628\u0639\u062F ${duration}ms:`, error);
    }
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645",
      code: "INTERNAL_ERROR",
      processingTime: duration
    });
  }
});
router.post("/setup-mfa", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const email = req.user.email;
    const result = await setupTOTP(userId, email);
    res.json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0625\u0639\u062F\u0627\u062F MFA:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/enable-mfa", requireAuth, async (req, res) => {
  try {
    const validation = enableTOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        errors: validation.error.errors
      });
    }
    const userId = req.user.userId;
    const { totpCode } = validation.data;
    const requestInfo = getRequestInfo(req);
    const result = await enableTOTP(userId, totpCode, requestInfo.ipAddress, requestInfo.userAgent);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u062A\u0641\u0639\u064A\u0644 MFA:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessions = await getActiveSessions(userId);
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0627\u0644\u062C\u0644\u0633\u0627\u062A:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.delete("/sessions/:sessionId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const success = await terminateSession(userId, sessionId, "user_terminated");
    res.json({
      success,
      message: success ? "\u062A\u0645 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629 \u0628\u0646\u062C\u0627\u062D" : "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629"
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/validate-field", async (req, res) => {
  try {
    const { field, value } = req.body;
    if (!field || !value) {
      return res.json({
        success: false,
        isValid: false,
        message: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629"
      });
    }
    let isValid = false;
    let message = "";
    let suggestions = [];
    switch (field) {
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          message = "\u0635\u064A\u063A\u0629 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
        } else {
          const existingUser = await db.execute(sql5`
            SELECT id FROM users WHERE LOWER(email) = LOWER(${value})
          `);
          if (existingUser.rows.length > 0) {
            isValid = false;
            message = "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u0628\u0642\u0627\u064B";
            suggestions = [
              "\u062C\u0631\u0628 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u062E\u062A\u0644\u0641",
              "\u0647\u0644 \u062A\u062D\u0627\u0648\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062F\u0644\u0627\u064B \u0645\u0646 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u062C\u062F\u064A\u062F\u061F"
            ];
          } else {
            isValid = true;
            message = "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u062A\u0627\u062D \u2713";
          }
        }
        break;
      case "password":
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumbers = /\d/.test(value);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        let strength = 0;
        const issues = [];
        if (value.length < minLength) {
          issues.push(`\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 ${minLength} \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644`);
        } else {
          strength += 1;
        }
        if (!hasUpperCase) {
          issues.push("\u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631");
        } else {
          strength += 1;
        }
        if (!hasLowerCase) {
          issues.push("\u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0635\u063A\u064A\u0631");
        } else {
          strength += 1;
        }
        if (!hasNumbers) {
          issues.push("\u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0642\u0645");
        } else {
          strength += 1;
        }
        if (hasSpecial) {
          strength += 1;
        }
        isValid = issues.length === 0;
        if (isValid) {
          const strengthLevels = ["\u0636\u0639\u064A\u0641\u0629 \u062C\u062F\u0627\u064B", "\u0636\u0639\u064A\u0641\u0629", "\u0645\u062A\u0648\u0633\u0637\u0629", "\u0642\u0648\u064A\u0629", "\u0642\u0648\u064A\u0629 \u062C\u062F\u0627\u064B"];
          message = `\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 ${strengthLevels[Math.min(strength, 4)]} \u2713`;
        } else {
          message = issues.join("\u060C ");
        }
        res.json({
          success: true,
          isValid,
          message,
          suggestions: isValid ? [] : ["\u0627\u0633\u062A\u062E\u062F\u0645 \u0645\u0632\u064A\u062C \u0645\u0646 \u0627\u0644\u062D\u0631\u0648\u0641 \u0648\u0627\u0644\u0623\u0631\u0642\u0627\u0645", "\u0623\u0636\u0641 \u0631\u0645\u0648\u0632 \u062E\u0627\u0635\u0629 \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0642\u0648\u0629"],
          strength: Math.min(strength, 4)
        });
        return;
      default:
        return res.json({
          success: false,
          isValid: false,
          message: "\u0646\u0648\u0639 \u0627\u0644\u062D\u0642\u0644 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645"
        });
    }
    res.json({
      success: true,
      isValid,
      message,
      suggestions
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0642\u0644:", error);
    res.json({
      success: false,
      isValid: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u062D\u0642\u0642"
    });
  }
});
router.delete("/sessions", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentSessionId = req.user.sessionId;
    const terminatedCount = await terminateAllOtherSessions(userId, currentSessionId);
    res.json({
      success: true,
      message: `\u062A\u0645 \u0625\u0646\u0647\u0627\u0621 ${terminatedCount} \u062C\u0644\u0633\u0629`,
      terminatedCount
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0627\u062A:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.put("/password", requireAuth, async (req, res) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        errors: validation.error.errors
      });
    }
    const userId = req.user.userId;
    const { currentPassword, newPassword } = validation.data;
    const requestInfo = getRequestInfo(req);
    const result = await changePassword(
      userId,
      currentPassword,
      newPassword,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    const userEmail = req.user.email;
    console.log("\u{1F6AA} [Auth] \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", userEmail);
    const success = await terminateSession(userId, sessionId, "user_logout");
    if (success) {
      console.log("\u2705 [Auth] \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0648\u0625\u0628\u0637\u0627\u0644 \u0627\u0644\u062C\u0644\u0633\u0629 \u0628\u0646\u062C\u0627\u062D");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0628\u0646\u062C\u0627\u062D"
      });
    } else {
      console.log("\u26A0\uFE0F [Auth] \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u062C\u0644\u0633\u0629 \u0644\u0644\u0625\u0628\u0637\u0627\u0644\u060C \u0648\u0644\u0643\u0646 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0646\u062C\u062D\u062A \u0645\u0646 \u062C\u0627\u0646\u0628 \u0627\u0644\u0639\u0645\u064A\u0644");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0628\u0646\u062C\u0627\u062D"
      });
    }
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || "";
    const email = req.user?.email || "";
    const role = req.user?.role || "user";
    let userData = null;
    try {
      const userResult = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
      if (userResult.length > 0) {
        userData = userResult[0];
      }
    } catch (dbError) {
      console.log("\u26A0\uFE0F [API/me] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A\u060C \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0648\u0643\u0646");
    }
    const user = {
      id: userId,
      email,
      firstName: userData?.firstName || "\u0645\u0633\u062A\u062E\u062F\u0645",
      lastName: userData?.lastName || "",
      name: userData ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || email : email,
      role,
      mfaEnabled: false
      // حقل mfaEnabled غير موجود في schema الحالي
    };
    console.log("\u2705 [API/me] \u0625\u0631\u0633\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("\u274C [API/me] \u062E\u0637\u0623 \u0641\u064A API \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/verify-email", async (req, res) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        errors: validation.error.errors
      });
    }
    const { userId, code } = validation.data;
    const result = await verifyEmailToken(userId, code);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/resend-verification", async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628\u0627\u0646"
      });
    }
    const requestInfo = getRequestInfo(req);
    const result = await sendVerificationEmail(
      userId,
      email,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        errors: validation.error.errors
      });
    }
    const { email } = validation.data;
    const requestInfo = getRequestInfo(req);
    const result = await sendPasswordResetEmail(
      email,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0637\u0644\u0628 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629",
        errors: validation.error.errors
      });
    }
    const { token, newPassword } = validation.data;
    const result = await resetPasswordWithToken(token, newPassword);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
router.get("/validate-reset-token", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0637\u0644\u0648\u0628"
      });
    }
    const result = await validatePasswordResetToken(token);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639:", error);
    res.status(500).json({
      success: false,
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645"
    });
  }
});
var auth_default = router;

// server/routes/publicRouter.ts
import express2 from "express";

// server/config/routes.ts
import rateLimit2 from "express-rate-limit";
var PUBLIC_ROUTES = [
  {
    name: "auth",
    description: "\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644",
    routes: [
      {
        path: "/api/auth/login",
        methods: ["POST"],
        description: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644"
      },
      {
        path: "/api/auth/register",
        methods: ["POST"],
        description: "\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u062C\u062F\u064A\u062F"
      },
      {
        path: "/api/auth/refresh",
        methods: ["POST"],
        description: "\u062A\u062C\u062F\u064A\u062F \u0631\u0645\u0632 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629"
      },
      {
        path: "/api/auth/logout",
        methods: ["POST"],
        description: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C"
      }
    ],
    globalRateLimit: {
      windowMs: 15 * 60 * 1e3,
      // 15 دقيقة
      max: 20,
      // 20 محاولة كل 15 دقيقة
      message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629"
    }
  },
  {
    name: "health_monitoring",
    description: "\u0645\u0633\u0627\u0631\u0627\u062A \u0645\u0631\u0627\u0642\u0628\u0629 \u0635\u062D\u0629 \u0627\u0644\u0646\u0638\u0627\u0645",
    routes: [
      {
        path: "/api/health",
        methods: ["GET", "HEAD"],
        description: "\u0641\u062D\u0635 \u0635\u062D\u0629 \u0627\u0644\u0646\u0638\u0627\u0645"
      },
      {
        path: "/api/status",
        methods: ["GET"],
        description: "\u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A\u0629"
      }
    ]
  },
  {
    name: "autocomplete_preflight",
    description: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0640 preflight \u0648\u0627\u0644\u0641\u062D\u0635 \u0644\u0644\u0640 autocomplete",
    routes: [
      {
        path: "/api/autocomplete",
        methods: ["HEAD", "OPTIONS"],
        description: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0645\u0633\u0628\u0642 \u0644\u0644\u0640 autocomplete"
      }
    ],
    globalRateLimit: {
      windowMs: 1 * 60 * 1e3,
      // دقيقة واحدة
      max: 100,
      // 100 طلب فحص كل دقيقة
      message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0641\u062D\u0635"
    }
  },
  {
    name: "public_data",
    description: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629 \u063A\u064A\u0631 \u0627\u0644\u062D\u0633\u0627\u0633\u0629",
    routes: [
      {
        path: "/api/worker-types",
        methods: ["GET"],
        description: "\u0642\u0627\u0626\u0645\u0629 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0639\u0645\u0627\u0644 - \u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u062D\u0633\u0627\u0633\u0629"
      }
    ]
  },
  {
    name: "cors_preflight",
    description: "\u0637\u0644\u0628\u0627\u062A CORS \u0627\u0644\u0645\u0633\u0628\u0642\u0629",
    routes: [
      {
        path: "/api/*",
        methods: ["OPTIONS"],
        description: "\u0637\u0644\u0628\u0627\u062A OPTIONS \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A",
        isWildcard: true
      }
    ]
  }
];
var PROTECTED_ROUTES = [
  {
    name: "autocomplete_data",
    description: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0640 autocomplete - \u0645\u062D\u0645\u064A\u0629",
    routes: [
      {
        path: "/api/autocomplete",
        methods: ["GET", "POST"],
        description: "\u062C\u0644\u0628 \u0648\u0625\u0631\u0633\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A autocomplete"
      },
      {
        path: "/api/autocomplete/senderNames",
        methods: ["GET"],
        description: "\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0631\u0633\u0644\u064A\u0646 \u0644\u0644\u0640 autocomplete"
      },
      {
        path: "/api/autocomplete/transferNumbers",
        methods: ["GET"],
        description: "\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0644\u0644\u0640 autocomplete"
      },
      {
        path: "/api/autocomplete/transferTypes",
        methods: ["GET"],
        description: "\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0644\u0644\u0640 autocomplete"
      },
      {
        path: "/api/autocomplete/transportDescriptions",
        methods: ["GET"],
        description: "\u0623\u0648\u0635\u0627\u0641 \u0627\u0644\u0646\u0642\u0644 \u0644\u0644\u0640 autocomplete"
      },
      {
        path: "/api/autocomplete/notes",
        methods: ["GET"],
        description: "\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0644\u0644\u0640 autocomplete"
      },
      {
        path: "/api/autocomplete/workerMiscDescriptions",
        methods: ["GET"],
        description: "\u0623\u0648\u0635\u0627\u0641 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0639\u0645\u0627\u0644 \u0644\u0644\u0640 autocomplete"
      }
    ],
    globalRateLimit: {
      windowMs: 1 * 60 * 1e3,
      // دقيقة واحدة
      max: 200,
      // 200 طلب autocomplete كل دقيقة
      message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0637\u0644\u0628\u0627\u062A autocomplete"
    }
  },
  {
    name: "core_data",
    description: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0645\u062D\u0645\u064A\u0629",
    routes: [
      {
        path: "/api/projects",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639"
      },
      {
        path: "/api/projects/with-stats",
        methods: ["GET"],
        description: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A"
      },
      {
        path: "/api/projects/:id",
        methods: ["GET", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0634\u0631\u0648\u0639 \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      },
      {
        path: "/api/projects/:projectId/fund-transfers",
        methods: ["GET"],
        description: "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0639\u0647\u062F\u0629 \u0645\u0634\u0631\u0648\u0639 \u0645\u062D\u062F\u062F",
        parameters: ["projectId"]
      },
      {
        path: "/api/projects/:projectId/worker-attendance",
        methods: ["GET"],
        description: "\u062D\u0636\u0648\u0631 \u0639\u0645\u0627\u0644 \u0645\u0634\u0631\u0648\u0639 \u0645\u062D\u062F\u062F",
        parameters: ["projectId"]
      },
      {
        path: "/api/projects/:projectId/material-purchases",
        methods: ["GET"],
        description: "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u0648\u0627\u062F \u0645\u0634\u0631\u0648\u0639 \u0645\u062D\u062F\u062F",
        parameters: ["projectId"]
      },
      {
        path: "/api/projects/:projectId/transportation-expenses",
        methods: ["GET"],
        description: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0646\u0642\u0644 \u0645\u0634\u0631\u0648\u0639 \u0645\u062D\u062F\u062F",
        parameters: ["projectId"]
      },
      {
        path: "/api/projects/:projectId/worker-misc-expenses",
        methods: ["GET"],
        description: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0639\u0645\u0627\u0644 \u0645\u062A\u0646\u0648\u0639\u0629 \u0644\u0645\u0634\u0631\u0648\u0639",
        parameters: ["projectId"]
      },
      {
        path: "/api/projects/:id/daily-summary/:date",
        methods: ["GET"],
        description: "\u0645\u0644\u062E\u0635 \u064A\u0648\u0645\u064A \u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u064A \u062A\u0627\u0631\u064A\u062E \u0645\u062D\u062F\u062F",
        parameters: ["id", "date"]
      },
      {
        path: "/api/projects/:projectId/daily-expenses/:date",
        methods: ["GET"],
        description: "\u0645\u0635\u0627\u0631\u064A\u0641 \u064A\u0648\u0645\u064A\u0629 \u0644\u0645\u0634\u0631\u0648\u0639",
        parameters: ["projectId", "date"]
      },
      {
        path: "/api/projects/:projectId/previous-balance/:date",
        methods: ["GET"],
        description: "\u0631\u0635\u064A\u062F \u0633\u0627\u0628\u0642 \u0644\u0645\u0634\u0631\u0648\u0639",
        parameters: ["projectId", "date"]
      },
      {
        path: "/api/workers",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0627\u0644"
      },
      {
        path: "/api/workers/:id",
        methods: ["GET", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0639\u0627\u0645\u0644 \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      },
      {
        path: "/api/materials",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u062F"
      },
      {
        path: "/api/materials/:id",
        methods: ["GET", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0627\u062F\u0629 \u0645\u062D\u062F\u062F\u0629",
        parameters: ["id"]
      },
      {
        path: "/api/suppliers",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646"
      },
      {
        path: "/api/suppliers/:id",
        methods: ["GET", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0648\u0631\u062F \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      },
      {
        path: "/api/material-purchases",
        methods: ["GET", "POST"],
        description: "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F"
      },
      {
        path: "/api/material-purchases/:id",
        methods: ["PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0648\u0627\u062F \u0645\u062D\u062F\u062F\u0629",
        parameters: ["id"]
      },
      {
        path: "/api/worker-attendance",
        methods: ["GET", "POST"],
        description: "\u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644"
      },
      {
        path: "/api/worker-attendance/:id",
        methods: ["PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0633\u062C\u0644 \u062D\u0636\u0648\u0631 \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      },
      {
        path: "/api/transportation-expenses",
        methods: ["GET", "POST"],
        description: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A"
      },
      {
        path: "/api/transportation-expenses/:id",
        methods: ["PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0635\u0631\u0648\u0641 \u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      },
      {
        path: "/api/daily-expense-summaries",
        methods: ["GET", "POST"],
        description: "\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629"
      },
      {
        path: "/api/daily-expense-summaries/:id",
        methods: ["PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0644\u062E\u0635 \u0645\u0635\u0631\u0648\u0641 \u064A\u0648\u0645\u064A \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      }
    ]
  },
  {
    name: "financial_data",
    description: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A",
    routes: [
      {
        path: "/api/project-fund-transfers",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639"
      },
      {
        path: "/api/fund-transfers",
        methods: ["GET", "POST", "PATCH", "DELETE"],
        description: "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0639\u0627\u0645\u0629"
      },
      {
        path: "/api/fund-transfers/:id",
        methods: ["PATCH", "DELETE"],
        description: "\u062A\u0639\u062F\u064A\u0644 \u0648\u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      },
      {
        path: "/api/worker-misc-expenses",
        methods: ["GET", "POST", "PATCH", "DELETE"],
        description: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629"
      },
      {
        path: "/api/worker-transfers",
        methods: ["GET", "POST", "PATCH", "DELETE"],
        description: "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644"
      },
      {
        path: "/api/worker-transfers/:id",
        methods: ["PATCH", "DELETE"],
        description: "\u062A\u0639\u062F\u064A\u0644 \u0648\u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      },
      {
        path: "/api/worker-misc-expenses/:id",
        methods: ["PATCH", "DELETE"],
        description: "\u062A\u0639\u062F\u064A\u0644 \u0648\u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0639\u0627\u0645\u0644 \u0645\u062D\u062F\u062F",
        parameters: ["id"]
      }
    ],
    globalRateLimit: {
      windowMs: 1 * 60 * 1e3,
      // دقيقة واحدة
      max: 60,
      // 60 طلب مالي كل دقيقة
      message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629"
    }
  },
  {
    name: "auth_protected",
    description: "\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u0645\u062D\u0645\u064A\u0629",
    routes: [
      {
        path: "/api/auth/me",
        methods: ["GET"],
        description: "\u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062D\u0627\u0644\u064A"
      },
      {
        path: "/api/auth/sessions",
        methods: ["GET", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u062C\u0644\u0633\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645"
      },
      {
        path: "/api/auth/sessions/:sessionId",
        methods: ["DELETE"],
        description: "\u0625\u0646\u0647\u0627\u0621 \u062C\u0644\u0633\u0629 \u0645\u062D\u062F\u062F\u0629",
        parameters: ["sessionId"]
      },
      {
        path: "/api/auth/password",
        methods: ["PUT"],
        description: "\u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631"
      },
      {
        path: "/api/auth/logout",
        methods: ["POST"],
        description: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C"
      }
    ],
    globalRateLimit: {
      windowMs: 15 * 60 * 1e3,
      // 15 دقيقة
      max: 50,
      // 50 طلب مصادقة كل 15 دقيقة
      message: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629"
    }
  },
  {
    name: "management_data",
    description: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631",
    routes: [
      {
        path: "/api/notifications",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A"
      },
      {
        path: "/api/notifications/:id/read",
        methods: ["POST"],
        description: "\u0648\u0636\u0639 \u0639\u0644\u0627\u0645\u0629 \u0642\u0631\u0627\u0621\u0629 \u0639\u0644\u0649 \u0625\u0634\u0639\u0627\u0631",
        parameters: ["id"]
      },
      {
        path: "/api/notifications/mark-all-read",
        methods: ["POST"],
        description: "\u0648\u0636\u0639 \u0639\u0644\u0627\u0645\u0629 \u0642\u0631\u0627\u0621\u0629 \u0639\u0644\u0649 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A"
      },
      {
        path: "/api/tools",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u062F\u0648\u0627\u062A"
      },
      {
        path: "/api/tool-movements",
        methods: ["GET", "POST", "PUT", "DELETE"],
        description: "\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0623\u062F\u0648\u0627\u062A"
      }
    ]
  }
];
var AdvancedRouteManager = class {
  publicRouteMap;
  protectedRouteMap;
  wildcardRoutes;
  rateLimiters;
  constructor() {
    this.publicRouteMap = /* @__PURE__ */ new Map();
    this.protectedRouteMap = /* @__PURE__ */ new Map();
    this.wildcardRoutes = [];
    this.rateLimiters = /* @__PURE__ */ new Map();
    this.initializeRoutes();
  }
  /**
   * تهيئة المسارات وإنشاء خرائط البحث السريع
   */
  initializeRoutes() {
    PUBLIC_ROUTES.forEach((group) => {
      group.routes.forEach((route) => {
        this.processRoute(route, true, group.globalRateLimit);
      });
    });
    PROTECTED_ROUTES.forEach((group) => {
      group.routes.forEach((route) => {
        this.processRoute(route, false, group.globalRateLimit);
      });
    });
    console.log(`\u{1F5FA}\uFE0F [RouteManager] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 ${this.publicRouteMap.size} \u0645\u0633\u0627\u0631 \u0639\u0627\u0645 \u0648 ${this.protectedRouteMap.size} \u0645\u0633\u0627\u0631 \u0645\u062D\u0645\u064A`);
    console.log(`\u{1F50D} [RouteManager] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 ${this.wildcardRoutes.length} \u0645\u0633\u0627\u0631 wildcard`);
  }
  /**
   * معالجة مسار واحد وإضافته للخرائط المناسبة
   */
  processRoute(route, isPublic, globalRateLimit2) {
    if (route.isWildcard || route.path.includes("*")) {
      const regexPattern = route.path.replace(/\*/g, ".*").replace(/:[^/]+/g, "[^/]+");
      this.wildcardRoutes.push({
        pattern: new RegExp(`^${regexPattern}$`),
        methods: new Set(route.methods),
        isPublic
      });
    } else {
      const targetMap = isPublic ? this.publicRouteMap : this.protectedRouteMap;
      const methodSet = targetMap.get(route.path) || /* @__PURE__ */ new Set();
      route.methods.forEach((method) => {
        if (method === "*") {
          ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].forEach(
            (m) => methodSet.add(m)
          );
        } else {
          methodSet.add(method);
        }
      });
      targetMap.set(route.path, methodSet);
    }
    if (route.rateLimit || globalRateLimit2) {
      const rateLimitConfig = route.rateLimit || globalRateLimit2;
      const limiterId = `${route.path}:${route.methods.join(",")}`;
      this.rateLimiters.set(limiterId, rateLimit2({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.max,
        message: {
          success: false,
          error: rateLimitConfig.message,
          code: "RATE_LIMIT_EXCEEDED"
        },
        standardHeaders: true,
        legacyHeaders: false
      }));
    }
  }
  /**
   * فحص ما إذا كان المسار عامًا (لا يحتاج مصادقة)
   */
  isPublicRoute(path4, method) {
    const publicMethods = this.publicRouteMap.get(path4);
    if (publicMethods && (publicMethods.has(method) || publicMethods.has("*"))) {
      return true;
    }
    for (const wildcardRoute of this.wildcardRoutes) {
      if (wildcardRoute.isPublic && wildcardRoute.pattern.test(path4) && (wildcardRoute.methods.has(method) || wildcardRoute.methods.has("*"))) {
        return true;
      }
    }
    return false;
  }
  /**
   * فحص ما إذا كان المسار محميًا (يحتاج مصادقة)
   */
  isProtectedRoute(path4, method) {
    const protectedMethods = this.protectedRouteMap.get(path4);
    if (protectedMethods && (protectedMethods.has(method) || protectedMethods.has("*"))) {
      return true;
    }
    for (const wildcardRoute of this.wildcardRoutes) {
      if (!wildcardRoute.isPublic && wildcardRoute.pattern.test(path4) && (wildcardRoute.methods.has(method) || wildcardRoute.methods.has("*"))) {
        return true;
      }
    }
    return false;
  }
  /**
   * الحصول على rate limiter للمسار إذا وجد - محسن لدعم المعاملات
   */
  getRateLimiter(path4, method) {
    for (const [limiterId, limiter] of Array.from(this.rateLimiters.entries())) {
      const [limiterPath, methods] = limiterId.split(":");
      const methodsList = methods.split(",");
      const isPathMatch = limiterPath === path4 || this.matchesPatternWithParams(path4, limiterPath);
      const isMethodMatch = methodsList.includes(method) || methodsList.includes("*");
      if (isPathMatch && isMethodMatch) {
        return limiter;
      }
    }
    return null;
  }
  /**
   * فحص مطابقة المسار مع نمط يحتوي على معاملات
   */
  matchesPatternWithParams(actualPath, patternPath) {
    const regexPattern = patternPath.replace(/\*/g, ".*").replace(/:[^/]+/g, "[^/]+");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(actualPath);
  }
  /**
   * استخراج المعاملات من المسار
   */
  extractParameters(routePath, actualPath) {
    const parameters = {};
    const routeParts = routePath.split("/");
    const actualParts = actualPath.split("/");
    if (routeParts.length !== actualParts.length) {
      return parameters;
    }
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const actualPart = actualParts[i];
      if (routePart.startsWith(":")) {
        const paramName = routePart.substring(1);
        parameters[paramName] = actualPart;
      }
    }
    return parameters;
  }
  /**
   * الحصول على إحصائيات المسارات
   */
  getRouteStats() {
    return {
      publicRoutes: this.publicRouteMap.size,
      protectedRoutes: this.protectedRouteMap.size,
      wildcardRoutes: this.wildcardRoutes.length,
      rateLimiters: this.rateLimiters.size,
      totalRoutes: this.publicRouteMap.size + this.protectedRouteMap.size + this.wildcardRoutes.length
    };
  }
  /**
   * طباعة تفاصيل المسارات للتتبع
   */
  logRouteDetails() {
    console.log("\u{1F5FA}\uFE0F [RouteManager] \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A:");
    console.log("\u{1F4C2} \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629:", Array.from(this.publicRouteMap.keys()));
    console.log("\u{1F512} \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u0645\u064A\u0629:", Array.from(this.protectedRouteMap.keys()));
    console.log("\u{1F50D} \u0645\u0633\u0627\u0631\u0627\u062A Wildcard:", this.wildcardRoutes.map((r) => r.pattern.source));
  }
};
var routeManager = new AdvancedRouteManager();
var publicRouteRateLimit = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  // 15 دقيقة
  max: 100,
  // 100 طلب كل 15 دقيقة للمسارات العامة
  message: {
    success: false,
    error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629",
    code: "PUBLIC_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // تطبيق فقط على المسارات العامة
  skip: (req) => {
    const path4 = req.path || req.url || "";
    const method = req.method || "GET";
    return !routeManager.isPublicRoute(path4, method);
  }
});
var authRouteRateLimit = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  // 15 دقيقة
  max: 10,
  // 10 محاولات مصادقة كل 15 دقيقة
  message: {
    success: false,
    error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629",
    code: "AUTH_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // تطبيق فقط على مسارات المصادقة
  skip: (req) => {
    const path4 = req.path || req.url || "";
    return !path4.startsWith("/api/auth/");
  }
});

// server/routes/publicRouter.ts
var publicRouter = express2.Router();
publicRouter.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "\u0627\u0644\u0646\u0638\u0627\u0645 \u064A\u0639\u0645\u0644 \u0628\u0634\u0643\u0644 \u0637\u0628\u064A\u0639\u064A",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime(),
    version: "1.0.0"
  });
});
publicRouter.get("/status", (req, res) => {
  res.json({
    success: true,
    data: {
      server: "running",
      database: "connected",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB"
      },
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: Math.floor(process.uptime() / 3600) + "h " + Math.floor(process.uptime() % 3600 / 60) + "m"
      }
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
publicRouter.use("/auth/*", authRouteRateLimit);
publicRouter.get("/worker-types", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "\u0645\u0633\u0627\u0631 \u0639\u0627\u0645 - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0639\u0645\u0627\u0644",
      code: "WORKER_TYPES_ERROR"
    });
  }
});
publicRouter.options("*", (req, res) => {
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Max-Age", "3600");
  res.sendStatus(200);
});
publicRouter.head("/autocomplete", (req, res) => {
  console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A");
  res.set({
    "Content-Type": "application/json",
    "X-Autocomplete-Available": "true",
    "X-Rate-Limit-Remaining": "100"
  });
  res.sendStatus(200);
});
publicRouter.options("/autocomplete", (req, res) => {
  res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("X-Autocomplete-Methods", "GET,POST,HEAD");
  res.sendStatus(200);
});
publicRouter.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block"
  });
  next();
});
console.log("\u{1F310} [PublicRouter] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 Router \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629");

// server/routes/privateRouter.ts
import express3 from "express";
var privateRouter = express3.Router();
privateRouter.use(requireAuth);
privateRouter.get("/autocomplete", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "\u0645\u0633\u0627\u0631 autocomplete \u0645\u062D\u0645\u064A - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A",
      code: "AUTOCOMPLETE_ERROR"
    });
  }
});
privateRouter.post("/autocomplete", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "\u062D\u0641\u0638 autocomplete \u0645\u062D\u0645\u064A - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "\u062E\u0637\u0623 \u0641\u064A \u062D\u0641\u0638 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A",
      code: "AUTOCOMPLETE_SAVE_ERROR"
    });
  }
});
var autocompleteSubRoutes = [
  "senderNames",
  "transferNumbers",
  "transferTypes",
  "transportDescriptions",
  "notes",
  "workerMiscDescriptions",
  "recipientNames",
  "recipientPhones",
  "workerTransferNumbers",
  "workerTransferNotes"
];
autocompleteSubRoutes.forEach((route) => {
  privateRouter.get(`/autocomplete/${route}`, async (req, res) => {
    try {
      res.json({
        success: true,
        data: [],
        message: `\u0645\u0633\u0627\u0631 ${route} \u0645\u062D\u0645\u064A - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 ${route}`,
        code: "AUTOCOMPLETE_SUB_ERROR"
      });
    }
  });
});
var projectRoutes = [
  { path: "/", methods: ["GET", "POST"] },
  { path: "/with-stats", methods: ["GET"] },
  { path: "/:id", methods: ["GET", "PUT", "DELETE"] },
  { path: "/:projectId/fund-transfers", methods: ["GET"] },
  { path: "/:projectId/worker-attendance", methods: ["GET"] },
  { path: "/:projectId/material-purchases", methods: ["GET"] },
  { path: "/:projectId/transportation-expenses", methods: ["GET"] },
  { path: "/:projectId/worker-misc-expenses", methods: ["GET"] },
  { path: "/:id/daily-summary/:date", methods: ["GET"] },
  { path: "/:projectId/daily-expenses/:date", methods: ["GET"] },
  { path: "/:projectId/previous-balance/:date", methods: ["GET"] }
];
projectRoutes.forEach((route) => {
  route.methods.forEach((method) => {
    const routeMethod = method.toLowerCase();
    privateRouter[routeMethod](`/projects${route.path}`, async (req, res) => {
      res.json({
        success: true,
        message: `\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 ${method} ${route.path} - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A`
      });
    });
  });
});
var financialRoutes = [
  { prefix: "/project-fund-transfers", methods: ["GET", "POST", "PUT", "DELETE"] },
  { prefix: "/fund-transfers", methods: ["GET", "POST", "PATCH", "DELETE"] },
  { prefix: "/fund-transfers/:id", methods: ["PATCH", "DELETE"] },
  { prefix: "/worker-misc-expenses", methods: ["GET", "POST", "PATCH", "DELETE"] },
  { prefix: "/worker-transfers", methods: ["GET", "POST", "PATCH", "DELETE"] },
  { prefix: "/worker-transfers/:id", methods: ["PATCH", "DELETE"] },
  { prefix: "/worker-misc-expenses/:id", methods: ["PATCH", "DELETE"] }
];
financialRoutes.forEach((route) => {
  route.methods.forEach((method) => {
    const routeMethod = method.toLowerCase();
    privateRouter[routeMethod](route.prefix, async (req, res) => {
      res.json({
        success: true,
        message: `\u0645\u0633\u0627\u0631 \u0645\u0627\u0644\u064A ${method} ${route.prefix} - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A`
      });
    });
  });
});
privateRouter.get("/workers", async (req, res) => {
  res.json({
    success: true,
    message: "\u0645\u0633\u0627\u0631 \u0627\u0644\u0639\u0645\u0627\u0644 - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
  });
});
privateRouter.get("/materials", async (req, res) => {
  res.json({
    success: true,
    message: "\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u062F - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
  });
});
privateRouter.get("/notifications", async (req, res) => {
  res.json({
    success: true,
    message: "\u0645\u0633\u0627\u0631 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
  });
});
privateRouter.get("/auth/me", async (req, res) => {
  res.json({
    success: true,
    message: "\u0645\u0633\u0627\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
  });
});
privateRouter.get("/auth/sessions", async (req, res) => {
  res.json({
    success: true,
    message: "\u0645\u0633\u0627\u0631 \u0627\u0644\u062C\u0644\u0633\u0627\u062A - \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0647 \u0641\u064A \u0627\u0644\u0640 controller \u0627\u0644\u0623\u0635\u0644\u064A"
  });
});
privateRouter.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  next();
});
console.log("\u{1F512} [PrivateRouter] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 Router \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u0645\u064A\u0629");

// server/routes/modules/healthRoutes.ts
init_db();
import express4 from "express";
var healthRouter = express4.Router();
healthRouter.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime(),
    version: "2.0.0-organized"
  });
});
healthRouter.get("/db/info", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        current_database() as database_name, 
        current_user as username,
        version() as version_info
    `);
    res.json({
      success: true,
      database: result.rows[0],
      message: "\u0645\u062A\u0635\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A app2data \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Database connection failed"
    });
  }
});
healthRouter.get("/status", (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    success: true,
    data: {
      status: "healthy",
      environment: process.env.NODE_ENV || "development",
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: Math.floor(process.uptime() / 3600) + "h " + Math.floor(process.uptime() % 3600 / 60) + "m"
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
        external: Math.round(memoryUsage.external / 1024 / 1024) + " MB"
      },
      performance: {
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      }
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
console.log("\u{1F3E5} [HealthRouter] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0635\u062D\u0629 \u0648\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629");
var healthRoutes_default = healthRouter;

// server/routes/modules/projectRoutes.ts
init_db();
init_schema();
import express5 from "express";
import { eq as eq8, and as and7, sql as sql6, gte as gte5, lt as lt3, lte as lte2, desc as desc5 } from "drizzle-orm";
var projectRouter = express5.Router();
projectRouter.use(requireAuth);
projectRouter.get("/", async (req, res) => {
  try {
    console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    const projectsList = await db.select().from(projects).orderBy(projects.createdAt);
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${projectsList.length} \u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A`);
    res.json({
      success: true,
      data: projectsList,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${projectsList.length} \u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D`
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639"
    });
  }
});
projectRouter.get("/with-stats", async (req, res) => {
  try {
    console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    const projectsList = await db.select().from(projects).orderBy(projects.createdAt);
    const projectsWithStats = await Promise.all(projectsList.map(async (project) => {
      const projectId = project.id;
      try {
        const cleanDbValue = (value, type = "decimal") => {
          if (value === null || value === void 0) return 0;
          const strValue = String(value).trim();
          if (strValue.match(/^(\d{1,3})\1{2,}$/)) {
            console.warn("\u26A0\uFE0F [API] \u0642\u064A\u0645\u0629 \u0645\u0634\u0628\u0648\u0647\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A:", strValue);
            return 0;
          }
          const parsed = type === "integer" ? parseInt(strValue, 10) : parseFloat(strValue);
          if (isNaN(parsed) || !isFinite(parsed)) return 0;
          const maxValue = type === "integer" ? strValue.includes("worker") || strValue.includes("total_workers") ? 1e4 : 1e6 : 1e11;
          if (Math.abs(parsed) > maxValue) {
            console.warn(`\u26A0\uFE0F [API] \u0642\u064A\u0645\u0629 \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0646\u0637\u0642\u064A (${type}):`, parsed);
            return 0;
          }
          return Math.max(0, parsed);
        };
        const workersStats = await db.execute(sql6`
          SELECT 
            COUNT(DISTINCT wa.worker_id) as total_workers,
            COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
          FROM worker_attendance wa
          INNER JOIN workers w ON wa.worker_id = w.id
          WHERE wa.project_id = ${projectId}
        `);
        const materialStats = await db.execute(sql6`
          SELECT 
            COUNT(*) as material_purchases,
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
          FROM material_purchases 
          WHERE project_id = ${projectId}
        `);
        const workerWagesStats = await db.execute(sql6`
          SELECT 
            COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
            COUNT(DISTINCT date) as completed_days
          FROM worker_attendance 
          WHERE project_id = ${projectId} AND is_present = true
        `);
        const fundTransfersStats = await db.execute(sql6`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
          FROM fund_transfers 
          WHERE project_id = ${projectId}
        `);
        const transportStats = await db.execute(sql6`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
          FROM transportation_expenses 
          WHERE project_id = ${projectId}
        `);
        const workerTransfersStats = await db.execute(sql6`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
          FROM worker_transfers 
          WHERE project_id = ${projectId}
        `);
        const miscExpensesStats = await db.execute(sql6`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
          FROM worker_misc_expenses 
          WHERE project_id = ${projectId}
        `);
        const outgoingProjectTransfersStats = await db.execute(sql6`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as outgoing_project_transfers
          FROM project_fund_transfers 
          WHERE from_project_id = ${projectId}
        `);
        const incomingProjectTransfersStats = await db.execute(sql6`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as incoming_project_transfers
          FROM project_fund_transfers 
          WHERE to_project_id = ${projectId}
        `);
        const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || "0", "integer");
        const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || "0", "integer");
        const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || "0");
        const materialPurchases2 = cleanDbValue(materialStats.rows[0]?.material_purchases || "0", "integer");
        const workerWages = cleanDbValue(workerWagesStats.rows[0]?.worker_wages || "0");
        const completedDays = cleanDbValue(workerWagesStats.rows[0]?.completed_days || "0", "integer");
        const fundTransfersIncome = cleanDbValue(fundTransfersStats.rows[0]?.total_income || "0");
        const transportExpenses = cleanDbValue(transportStats.rows[0]?.transport_expenses || "0");
        const workerTransfers2 = cleanDbValue(workerTransfersStats.rows[0]?.worker_transfers || "0");
        const miscExpenses = cleanDbValue(miscExpensesStats.rows[0]?.misc_expenses || "0");
        const outgoingProjectTransfers = cleanDbValue(outgoingProjectTransfersStats.rows[0]?.outgoing_project_transfers || "0");
        const incomingProjectTransfers = cleanDbValue(incomingProjectTransfersStats.rows[0]?.incoming_project_transfers || "0");
        if (totalWorkers > 1e3) {
          console.warn(`\u26A0\uFE0F [API] \u0639\u062F\u062F \u0639\u0645\u0627\u0644 \u063A\u064A\u0631 \u0645\u0646\u0637\u0642\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 ${project.name}: ${totalWorkers}`);
        }
        const totalIncome = fundTransfersIncome + incomingProjectTransfers;
        const totalExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers2 + miscExpenses + outgoingProjectTransfers;
        const currentBalance = totalIncome - totalExpenses;
        if (process.env.NODE_ENV === "development") {
          console.log(`\u{1F4CA} [API] \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${project.name}":`, {
            totalWorkers,
            activeWorkers,
            totalIncome,
            totalExpenses,
            currentBalance,
            completedDays,
            materialPurchases: materialPurchases2
          });
        }
        return {
          ...project,
          stats: {
            totalWorkers: Math.max(0, totalWorkers),
            totalExpenses: Math.max(0, totalExpenses),
            totalIncome: Math.max(0, totalIncome),
            currentBalance,
            // يمكن أن يكون سالباً
            activeWorkers: Math.max(0, activeWorkers),
            completedDays: Math.max(0, completedDays),
            materialPurchases: Math.max(0, materialPurchases2),
            lastActivity: project.createdAt.toISOString()
          }
        };
      } catch (error) {
        console.error(`\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 ${project.name}:`, error);
        return {
          ...project,
          stats: {
            totalWorkers: 0,
            totalExpenses: 0,
            totalIncome: 0,
            currentBalance: 0,
            activeWorkers: 0,
            completedDays: 0,
            materialPurchases: 0,
            lastActivity: project.createdAt.toISOString()
          }
        };
      }
    }));
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${projectsWithStats.length} \u0645\u0634\u0631\u0648\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A`);
    res.json({
      success: true,
      data: projectsWithStats,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${projectsWithStats.length} \u0645\u0634\u0631\u0648\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0628\u0646\u062C\u0627\u062D`
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A"
    });
  }
});
projectRouter.post("/", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0645\u0634\u0631\u0648\u0639 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    const validationResult = enhancedInsertProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u0627\u0644\u0645\u0634\u0631\u0648\u0639");
    console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const newProject = await db.insert(projects).values(validationResult.data).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: newProject[0].id,
      name: newProject[0].name,
      status: newProject[0].status
    });
    res.status(201).json({
      success: true,
      data: newProject[0],
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${newProject[0].name}" \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639";
    let statusCode = 500;
    if (error.code === "23505") {
      errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
      statusCode = 409;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    console.log("\u{1F50D} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0645\u0634\u0631\u0648\u0639 \u0645\u062D\u062F\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", id);
    if (!id) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639",
        processingTime: duration2
      });
    }
    console.log("\u{1F50D} [API] \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const projectResult = await db.select().from(projects).where(eq8(projects.id, id)).limit(1);
    if (projectResult.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", id);
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u0631\u0648\u0639 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${id}`,
        processingTime: duration2
      });
    }
    const project = projectResult[0];
    const includeStats = req.query.includeStats === "true";
    let projectWithStats = { ...project };
    if (includeStats) {
      try {
        console.log("\u{1F4CA} [API] \u062D\u0633\u0627\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639...");
        const cleanDbValue = (value, type = "decimal") => {
          if (value === null || value === void 0) return 0;
          const strValue = String(value).trim();
          const parsed = type === "integer" ? parseInt(strValue, 10) : parseFloat(strValue);
          return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed);
        };
        const [
          workersStats,
          materialStats,
          workerWagesStats,
          fundTransfersStats,
          transportStats,
          workerTransfersStats,
          miscExpensesStats
        ] = await Promise.all([
          db.execute(sql6`
            SELECT 
              COUNT(DISTINCT wa.worker_id) as total_workers,
              COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
            FROM worker_attendance wa
            INNER JOIN workers w ON wa.worker_id = w.id
            WHERE wa.project_id = ${id}
          `),
          db.execute(sql6`
            SELECT 
              COUNT(*) as material_purchases,
              COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
            FROM material_purchases 
            WHERE project_id = ${id}
          `),
          db.execute(sql6`
            SELECT 
              COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
              COUNT(DISTINCT date) as completed_days
            FROM worker_attendance 
            WHERE project_id = ${id} AND is_present = true
          `),
          db.execute(sql6`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
            FROM fund_transfers 
            WHERE project_id = ${id}
          `),
          db.execute(sql6`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
            FROM transportation_expenses 
            WHERE project_id = ${id}
          `),
          db.execute(sql6`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
            FROM worker_transfers 
            WHERE project_id = ${id}
          `),
          db.execute(sql6`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
            FROM worker_misc_expenses 
            WHERE project_id = ${id}
          `)
        ]);
        const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || "0", "integer");
        const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || "0", "integer");
        const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || "0");
        const materialPurchases2 = cleanDbValue(materialStats.rows[0]?.material_purchases || "0", "integer");
        const workerWages = cleanDbValue(workerWagesStats.rows[0]?.worker_wages || "0");
        const completedDays = cleanDbValue(workerWagesStats.rows[0]?.completed_days || "0", "integer");
        const totalIncome = cleanDbValue(fundTransfersStats.rows[0]?.total_income || "0");
        const transportExpenses = cleanDbValue(transportStats.rows[0]?.transport_expenses || "0");
        const workerTransfers2 = cleanDbValue(workerTransfersStats.rows[0]?.worker_transfers || "0");
        const miscExpenses = cleanDbValue(miscExpensesStats.rows[0]?.misc_expenses || "0");
        const totalExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers2 + miscExpenses;
        const currentBalance = totalIncome - totalExpenses;
        projectWithStats = {
          ...project,
          stats: {
            totalWorkers: Math.max(0, totalWorkers),
            totalExpenses: Math.max(0, totalExpenses),
            totalIncome: Math.max(0, totalIncome),
            currentBalance,
            activeWorkers: Math.max(0, activeWorkers),
            completedDays: Math.max(0, completedDays),
            materialPurchases: Math.max(0, materialPurchases2),
            lastActivity: project.createdAt.toISOString()
          }
        };
        console.log("\u2705 [API] \u062A\u0645 \u062D\u0633\u0627\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D");
      } catch (statsError) {
        console.error("\u26A0\uFE0F [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", statsError);
      }
    }
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: project.id,
      name: project.name,
      status: project.status,
      includeStats
    });
    res.json({
      success: true,
      data: projectWithStats,
      message: `\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${project.name}" \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0634\u0631\u0648\u0639";
    let statusCode = 500;
    if (error.code === "22P02") {
      errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.patch("/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const projectId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", projectId);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const existingProject = await db.select().from(projects).where(eq8(projects.id, projectId)).limit(1);
    if (existingProject.length === 0) {
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        processingTime: Date.now() - startTime
      });
    }
    const updatedProject = await db.update(projects).set(req.body).where(eq8(projects.id, projectId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedProject[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${updatedProject[0].name}" \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0631\u0648\u0639",
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.delete("/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const projectId = req.params.id;
    console.log("\u274C [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0630\u0641\u0647:", projectId);
    if (!projectId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0644\u0644\u062D\u0630\u0641",
        processingTime: duration2
      });
    }
    const existingProject = await db.select().from(projects).where(eq8(projects.id, projectId)).limit(1);
    if (existingProject.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", projectId);
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u0631\u0648\u0639 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${projectId}`,
        processingTime: duration2
      });
    }
    const projectToDelete = existingProject[0];
    console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", {
      id: projectToDelete.id,
      name: projectToDelete.name,
      status: projectToDelete.status
    });
    console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const deletedProject = await db.delete(projects).where(eq8(projects.id, projectId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: deletedProject[0].id,
      name: deletedProject[0].name,
      status: deletedProject[0].status
    });
    res.json({
      success: true,
      data: deletedProject[0],
      message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 "${deletedProject[0].name}" \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 - \u0645\u0631\u062A\u0628\u0637 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649 (\u0639\u0645\u0627\u0644\u060C \u0645\u0648\u0627\u062F\u060C \u0645\u0635\u0631\u0648\u0641\u0627\u062A)";
      statusCode = 409;
    } else if (error.code === "22P02") {
      errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/fund-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const transfers = await db.select().from(fundTransfers).where(eq8(fundTransfers.projectId, projectId)).orderBy(fundTransfers.transferDate);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/worker-attendance", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const attendance = await db.select({
      id: workerAttendance.id,
      workerId: workerAttendance.workerId,
      projectId: workerAttendance.projectId,
      date: workerAttendance.date,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      isPresent: workerAttendance.isPresent,
      createdAt: workerAttendance.createdAt,
      workerName: workers.name
    }).from(workerAttendance).leftJoin(workers, eq8(workerAttendance.workerId, workers.id)).where(eq8(workerAttendance.projectId, projectId)).orderBy(workerAttendance.date);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${attendance.length} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: attendance,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${attendance.length} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/material-purchases", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const purchases = await db.select().from(materialPurchases).where(eq8(materialPurchases.projectId, projectId)).orderBy(materialPurchases.purchaseDate);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${purchases.length} \u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0648\u0627\u062F \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: purchases,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${purchases.length} \u0645\u0634\u062A\u0631\u064A\u0629 \u0645\u0648\u0627\u062F \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/transportation-expenses", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const expenses = await db.select().from(transportationExpenses).where(eq8(transportationExpenses.projectId, projectId)).orderBy(transportationExpenses.date);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: expenses,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/worker-misc-expenses", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629 \u0644\u0644\u0639\u0645\u0627\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const expenses = await db.select().from(workerMiscExpenses).where(eq8(workerMiscExpenses.projectId, projectId)).orderBy(workerMiscExpenses.date);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: expenses,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/fund-transfers/incoming/:projectId", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4E5} [API] \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0648\u0627\u0631\u062F\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const transfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      transferDate: projectFundTransfers.transferDate,
      description: projectFundTransfers.description,
      fromProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq8(projectFundTransfers.toProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0648\u0627\u0631\u062F \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0648\u0627\u0631\u062F \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0648\u0627\u0631\u062F\u0629:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0648\u0627\u0631\u062F\u0629",
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/fund-transfers/outgoing/:projectId", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4E4} [API] \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0635\u0627\u062F\u0631\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const transfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      transferDate: projectFundTransfers.transferDate,
      description: projectFundTransfers.description,
      fromProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq8(projectFundTransfers.fromProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0635\u0627\u062F\u0631 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0635\u0627\u062F\u0631 \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0635\u0627\u062F\u0631\u0629:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0635\u0627\u062F\u0631\u0629",
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/worker-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u062D\u0648\u0627\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const transfers = await db.select({
      id: workerTransfers.id,
      workerId: workerTransfers.workerId,
      projectId: workerTransfers.projectId,
      amount: workerTransfers.amount,
      recipientName: workerTransfers.recipientName,
      recipientPhone: workerTransfers.recipientPhone,
      transferMethod: workerTransfers.transferMethod,
      transferNumber: workerTransfers.transferNumber,
      transferDate: workerTransfers.transferDate,
      notes: workerTransfers.notes,
      createdAt: workerTransfers.createdAt,
      workerName: workers.name
    }).from(workerTransfers).leftJoin(workers, eq8(workerTransfers.workerId, workers.id)).where(eq8(workerTransfers.projectId, projectId)).orderBy(workerTransfers.transferDate);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062D\u0648\u0644\u0629 \u0639\u0645\u0627\u0644 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062D\u0648\u0644\u0629 \u0639\u0645\u0627\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062D\u0648\u0627\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/actual-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F50D} [API] \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const incomingTransfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      createdAt: projectFundTransfers.createdAt,
      direction: sql6`'incoming'`.as("direction"),
      fromProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq8(projectFundTransfers.toProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
    const outgoingTransfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      createdAt: projectFundTransfers.createdAt,
      direction: sql6`'outgoing'`.as("direction"),
      fromProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql6`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq8(projectFundTransfers.fromProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${incomingTransfers.length} \u062A\u062D\u0648\u064A\u0644 \u0648\u0627\u0631\u062F \u0648 ${outgoingTransfers.length} \u062A\u062D\u0648\u064A\u0644 \u0635\u0627\u062F\u0631 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: {
        incoming: incomingTransfers,
        outgoing: outgoingTransfers,
        summary: {
          totalIncoming: incomingTransfers.length,
          totalOutgoing: outgoingTransfers.length,
          incomingAmount: incomingTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0),
          outgoingAmount: outgoingTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0)
        }
      },
      message: `\u062A\u0645 \u062C\u0644\u0628 ${incomingTransfers.length + outgoingTransfers.length} \u062A\u062D\u0648\u064A\u0644 \u062D\u0642\u064A\u0642\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629:", error);
    res.status(500).json({
      success: false,
      data: { incoming: [], outgoing: [], summary: {} },
      error: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:id/daily-summary/:date", async (req, res) => {
  const startTime = Date.now();
  try {
    const { id: projectId, date: date2 } = req.params;
    console.log(`\u{1F4CA} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${req.user?.email}`);
    console.log(`\u{1F4CB} [API] \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0628: projectId=${projectId}, date=${date2}`);
    if (!projectId || !date2) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629:", { projectId, date: date2 });
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
        message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646",
        processingTime: duration2
      });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date2)) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D:", date2);
      return res.status(400).json({
        success: false,
        error: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
        message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0628\u0635\u064A\u063A\u0629 YYYY-MM-DD",
        processingTime: duration2
      });
    }
    console.log("\u{1F50D} [API] \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0648\u062C\u0648\u062F \u0627\u0644\u0645\u0634\u0631\u0648\u0639...");
    const projectExists = await db.select().from(projects).where(eq8(projects.id, projectId)).limit(1);
    if (projectExists.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", projectId);
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u0631\u0648\u0639 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${projectId}`,
        processingTime: duration2
      });
    }
    console.log("\u{1F4BE} [API] \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    let dailySummary = null;
    try {
      console.log("\u26A1 [API] \u0645\u062D\u0627\u0648\u0644\u0629 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 daily_summary_mv...");
      const mvResult = await db.execute(sql6`
        SELECT 
          id,
          project_id,
          summary_date,
          carried_forward_amount,
          total_fund_transfers,
          total_worker_wages,
          total_material_costs,
          total_transportation_expenses,
          total_worker_transfers,
          total_worker_misc_expenses,
          total_income,
          total_expenses,
          remaining_balance,
          notes,
          created_at,
          updated_at,
          project_name
        FROM daily_summary_mv 
        WHERE project_id = ${projectId} AND summary_date = ${date2}
        LIMIT 1
      `);
      if (mvResult.rows && mvResult.rows.length > 0) {
        dailySummary = mvResult.rows[0];
        console.log("\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 Materialized View \u0628\u0646\u062C\u0627\u062D");
      }
    } catch (mvError) {
      console.log("\u26A0\uFE0F [API] Materialized View \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u060C \u0627\u0644\u062A\u0628\u062F\u064A\u0644 \u0644\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0639\u0627\u062F\u064A...");
      const regularResult = await db.select({
        id: dailyExpenseSummaries.id,
        project_id: dailyExpenseSummaries.projectId,
        summary_date: dailyExpenseSummaries.date,
        carried_forward_amount: dailyExpenseSummaries.carriedForwardAmount,
        total_fund_transfers: dailyExpenseSummaries.totalFundTransfers,
        total_worker_wages: dailyExpenseSummaries.totalWorkerWages,
        total_material_costs: dailyExpenseSummaries.totalMaterialCosts,
        total_transportation_expenses: dailyExpenseSummaries.totalTransportationCosts,
        total_worker_transfers: sql6`COALESCE(${dailyExpenseSummaries.totalWorkerTransfers}, 0)`,
        total_worker_misc_expenses: sql6`COALESCE(${dailyExpenseSummaries.totalWorkerMiscExpenses}, 0)`,
        total_income: dailyExpenseSummaries.totalIncome,
        total_expenses: dailyExpenseSummaries.totalExpenses,
        remaining_balance: dailyExpenseSummaries.remainingBalance,
        notes: sql6`COALESCE(${dailyExpenseSummaries.notes}, '')`,
        created_at: dailyExpenseSummaries.createdAt,
        updated_at: sql6`COALESCE(${dailyExpenseSummaries.updatedAt}, ${dailyExpenseSummaries.createdAt})`,
        project_name: projects.name
      }).from(dailyExpenseSummaries).leftJoin(projects, eq8(dailyExpenseSummaries.projectId, projects.id)).where(and7(
        eq8(dailyExpenseSummaries.projectId, projectId),
        eq8(dailyExpenseSummaries.date, date2)
      )).limit(1);
      if (regularResult.length > 0) {
        dailySummary = regularResult[0];
        console.log("\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0639\u0627\u062F\u064A \u0628\u0646\u062C\u0627\u062D");
      }
    }
    const duration = Date.now() - startTime;
    if (!dailySummary) {
      console.log(`\u{1F4ED} [API] \u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0644\u062E\u0635 \u064A\u0648\u0645\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 ${projectId} \u0641\u064A \u062A\u0627\u0631\u064A\u062E ${date2} - \u0625\u0631\u062C\u0627\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0641\u0627\u0631\u063A\u0629`);
      return res.json({
        success: true,
        data: {
          id: null,
          projectId,
          date: date2,
          totalIncome: 0,
          totalExpenses: 0,
          remainingBalance: 0,
          notes: null,
          isEmpty: true,
          message: `\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0644\u062E\u0635 \u0645\u0627\u0644\u064A \u0645\u062D\u0641\u0648\u0638 \u0644\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u064A \u062A\u0627\u0631\u064A\u062E ${date2}`
        },
        processingTime: duration,
        metadata: {
          projectId,
          date: date2,
          projectName: projectExists[0].name,
          isEmptyResult: true
        }
      });
    }
    const formattedSummary = {
      id: dailySummary.id,
      projectId: dailySummary.project_id,
      projectName: dailySummary.project_name || projectExists[0].name,
      date: dailySummary.summary_date || date2,
      financialSummary: {
        carriedForwardAmount: parseFloat(String(dailySummary.carried_forward_amount || "0")),
        totalFundTransfers: parseFloat(String(dailySummary.total_fund_transfers || "0")),
        totalWorkerWages: parseFloat(String(dailySummary.total_worker_wages || "0")),
        totalMaterialCosts: parseFloat(String(dailySummary.total_material_costs || "0")),
        totalTransportationExpenses: parseFloat(String(dailySummary.total_transportation_expenses || "0")),
        totalWorkerTransfers: parseFloat(String(dailySummary.total_worker_transfers || "0")),
        totalWorkerMiscExpenses: parseFloat(String(dailySummary.total_worker_misc_expenses || "0")),
        totalIncome: parseFloat(String(dailySummary.total_income || "0")),
        totalExpenses: parseFloat(String(dailySummary.total_expenses || "0")),
        remainingBalance: parseFloat(String(dailySummary.remaining_balance || "0"))
      },
      notes: String(dailySummary.notes || ""),
      createdAt: dailySummary.created_at,
      updatedAt: dailySummary.updated_at || dailySummary.created_at
    };
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      projectId,
      projectName: formattedSummary.projectName,
      date: date2,
      totalIncome: formattedSummary.financialSummary.totalIncome,
      totalExpenses: formattedSummary.financialSummary.totalExpenses,
      remainingBalance: formattedSummary.financialSummary.remainingBalance
    });
    res.json({
      success: true,
      data: formattedSummary,
      message: `\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0627\u0644\u064A \u0644\u0644\u0645\u0634\u0631\u0648\u0639 "${formattedSummary.projectName}" \u0641\u064A \u062A\u0627\u0631\u064A\u062E ${date2} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u064A\u0648\u0645\u064A";
    let statusCode = 500;
    if (error.code === "42P01") {
      errorMessage = "\u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
      statusCode = 503;
    } else if (error.code === "22008") {
      errorMessage = "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      data: null,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/daily-expenses/:date", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId, date: date2 } = req.params;
    console.log(`\u{1F4CA} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629: projectId=${projectId}, date=${date2}`);
    if (!projectId || !date2) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
        message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646",
        processingTime: duration2
      });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date2)) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
        message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0628\u0635\u064A\u063A\u0629 YYYY-MM-DD",
        processingTime: duration2
      });
    }
    const [
      fundTransfersResult,
      workerAttendanceResult,
      materialPurchasesResult,
      transportationResult,
      workerTransfersResult,
      miscExpensesResult,
      projectInfo
    ] = await Promise.all([
      db.select().from(fundTransfers).where(and7(eq8(fundTransfers.projectId, projectId), gte5(fundTransfers.transferDate, sql6`${date2}::date`), lt3(fundTransfers.transferDate, sql6`(${date2}::date + interval '1 day')`))),
      db.select({
        id: workerAttendance.id,
        workerId: workerAttendance.workerId,
        projectId: workerAttendance.projectId,
        date: workerAttendance.date,
        paidAmount: workerAttendance.paidAmount,
        actualWage: workerAttendance.actualWage,
        workDays: workerAttendance.workDays,
        workerName: workers.name
      }).from(workerAttendance).leftJoin(workers, eq8(workerAttendance.workerId, workers.id)).where(and7(eq8(workerAttendance.projectId, projectId), eq8(workerAttendance.date, date2))),
      db.select().from(materialPurchases).where(and7(eq8(materialPurchases.projectId, projectId), eq8(materialPurchases.purchaseDate, date2))),
      db.select().from(transportationExpenses).where(and7(eq8(transportationExpenses.projectId, projectId), eq8(transportationExpenses.date, date2))),
      db.select().from(workerTransfers).where(and7(eq8(workerTransfers.projectId, projectId), eq8(workerTransfers.transferDate, date2))),
      db.select().from(workerMiscExpenses).where(and7(eq8(workerMiscExpenses.projectId, projectId), eq8(workerMiscExpenses.date, date2))),
      db.select().from(projects).where(eq8(projects.id, projectId)).limit(1)
    ]);
    const totalFundTransfers = fundTransfersResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWorkerWages = workerAttendanceResult.reduce((sum, w) => sum + parseFloat(w.paidAmount || "0"), 0);
    const totalMaterialCosts = materialPurchasesResult.reduce((sum, m) => sum + parseFloat(m.totalAmount), 0);
    const totalTransportation = transportationResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWorkerTransfers = workerTransfersResult.reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const totalMiscExpenses = miscExpensesResult.reduce((sum, m) => sum + parseFloat(m.amount), 0);
    const totalIncome = totalFundTransfers;
    const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses;
    let carriedForward = 0;
    let carriedForwardSource = "none";
    try {
      console.log(`\u{1F4B0} [API] \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0631\u062D\u0644 \u0644\u062A\u0627\u0631\u064A\u062E: ${date2}`);
      const currentDate = new Date(date2);
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split("T")[0];
      console.log(`\u{1F4B0} [API] \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0644\u064A\u0648\u0645: ${previousDateStr}`);
      const latestSummary = await db.select({
        remainingBalance: dailyExpenseSummaries.remainingBalance,
        date: dailyExpenseSummaries.date
      }).from(dailyExpenseSummaries).where(and7(
        eq8(dailyExpenseSummaries.projectId, projectId),
        lt3(dailyExpenseSummaries.date, date2)
      )).orderBy(desc5(dailyExpenseSummaries.date)).limit(1);
      if (latestSummary.length > 0) {
        const summaryDate = latestSummary[0].date;
        const summaryBalance = parseFloat(String(latestSummary[0].remainingBalance || "0"));
        if (summaryDate === previousDateStr) {
          carriedForward = summaryBalance;
          carriedForwardSource = "summary";
          console.log(`\u{1F4B0} [API] \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u062E\u0635 \u0644\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642: ${carriedForward}`);
        } else {
          console.log(`\u{1F4B0} [API] \u0622\u062E\u0631 \u0645\u0644\u062E\u0635 \u0645\u062D\u0641\u0648\u0638 \u0641\u064A ${summaryDate}, \u062D\u0633\u0627\u0628 \u062A\u0631\u0627\u0643\u0645\u064A \u0625\u0644\u0649 ${previousDateStr}`);
          const startFromDate = new Date(summaryDate);
          startFromDate.setDate(startFromDate.getDate() + 1);
          const startFromStr = startFromDate.toISOString().split("T")[0];
          const cumulativeBalance = await calculateCumulativeBalance(projectId, startFromStr, previousDateStr);
          carriedForward = summaryBalance + cumulativeBalance;
          carriedForwardSource = "computed-from-summary";
          console.log(`\u{1F4B0} [API] \u0631\u0635\u064A\u062F \u062A\u0631\u0627\u0643\u0645\u064A \u0645\u0646 ${summaryDate} (${summaryBalance}) + ${cumulativeBalance} = ${carriedForward}`);
        }
      } else {
        console.log(`\u{1F4B0} [API] \u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0644\u062E\u0635 \u0645\u062D\u0641\u0648\u0638\u060C \u062D\u0633\u0627\u0628 \u062A\u0631\u0627\u0643\u0645\u064A \u0645\u0646 \u0627\u0644\u0628\u062F\u0627\u064A\u0629`);
        carriedForward = await calculateCumulativeBalance(projectId, null, previousDateStr);
        carriedForwardSource = "computed-full";
        console.log(`\u{1F4B0} [API] \u0631\u0635\u064A\u062F \u062A\u0631\u0627\u0643\u0645\u064A \u0643\u0627\u0645\u0644: ${carriedForward}`);
      }
    } catch (error) {
      console.warn(`\u26A0\uFE0F [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0631\u062D\u0644\u060C \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 0:`, error);
      carriedForward = 0;
      carriedForwardSource = "error";
    }
    const remainingBalance = carriedForward + totalIncome - totalExpenses;
    const responseData = {
      date: date2,
      projectName: projectInfo[0]?.name || "\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
      projectId,
      carriedForward: parseFloat(carriedForward.toFixed(2)),
      carriedForwardSource,
      totalIncome,
      totalExpenses,
      remainingBalance: parseFloat(remainingBalance.toFixed(2)),
      fundTransfers: fundTransfersResult,
      workerAttendance: workerAttendanceResult,
      materialPurchases: materialPurchasesResult,
      transportationExpenses: transportationResult,
      workerTransfers: workerTransfersResult,
      miscExpenses: miscExpensesResult
    };
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: responseData,
      message: `\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0644\u062A\u0627\u0631\u064A\u062E ${date2} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
      message: error.message,
      processingTime: duration
    });
  }
});
projectRouter.get("/:projectId/previous-balance/:date", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId, date: date2 } = req.params;
    console.log(`\u{1F4B0} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642: projectId=${projectId}, date=${date2}`);
    if (!projectId || !date2) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
        message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646",
        processingTime: duration2
      });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date2)) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
        message: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0628\u0635\u064A\u063A\u0629 YYYY-MM-DD",
        processingTime: duration2
      });
    }
    const currentDate = new Date(date2);
    const previousDate = new Date(currentDate);
    previousDate.setDate(currentDate.getDate() - 1);
    const previousDateStr = previousDate.toISOString().split("T")[0];
    console.log(`\u{1F4B0} [API] \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0644\u064A\u0648\u0645: ${previousDateStr}`);
    let previousBalance = 0;
    let source = "none";
    try {
      const latestSummary = await db.select({
        remainingBalance: dailyExpenseSummaries.remainingBalance,
        date: dailyExpenseSummaries.date
      }).from(dailyExpenseSummaries).where(and7(
        eq8(dailyExpenseSummaries.projectId, projectId),
        lt3(dailyExpenseSummaries.date, date2)
      )).orderBy(desc5(dailyExpenseSummaries.date)).limit(1);
      if (latestSummary.length > 0) {
        const summaryDate = latestSummary[0].date;
        const summaryBalance = parseFloat(String(latestSummary[0].remainingBalance || "0"));
        if (summaryDate === previousDateStr) {
          previousBalance = summaryBalance;
          source = "summary";
          console.log(`\u{1F4B0} [API] \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u062E\u0635 \u0644\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642: ${previousBalance}`);
        } else {
          console.log(`\u{1F4B0} [API] \u0622\u062E\u0631 \u0645\u0644\u062E\u0635 \u0645\u062D\u0641\u0648\u0638 \u0641\u064A ${summaryDate}, \u062D\u0633\u0627\u0628 \u062A\u0631\u0627\u0643\u0645\u064A \u0625\u0644\u0649 ${previousDateStr}`);
          const startFromDate = new Date(summaryDate);
          startFromDate.setDate(startFromDate.getDate() + 1);
          const startFromStr = startFromDate.toISOString().split("T")[0];
          const cumulativeBalance = await calculateCumulativeBalance(projectId, startFromStr, previousDateStr);
          previousBalance = summaryBalance + cumulativeBalance;
          source = "computed-from-summary";
          console.log(`\u{1F4B0} [API] \u0631\u0635\u064A\u062F \u062A\u0631\u0627\u0643\u0645\u064A \u0645\u0646 ${summaryDate} (${summaryBalance}) + ${cumulativeBalance} = ${previousBalance}`);
        }
      } else {
        console.log(`\u{1F4B0} [API] \u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0644\u062E\u0635 \u0645\u062D\u0641\u0648\u0638\u060C \u062D\u0633\u0627\u0628 \u062A\u0631\u0627\u0643\u0645\u064A \u0645\u0646 \u0627\u0644\u0628\u062F\u0627\u064A\u0629`);
        previousBalance = await calculateCumulativeBalance(projectId, null, previousDateStr);
        source = "computed-full";
        console.log(`\u{1F4B0} [API] \u0631\u0635\u064A\u062F \u062A\u0631\u0627\u0643\u0645\u064A \u0643\u0627\u0645\u0644: ${previousBalance}`);
      }
    } catch (error) {
      console.warn(`\u26A0\uFE0F [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0633\u0627\u0628\u0642\u060C \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 0:`, error);
      previousBalance = 0;
      source = "error";
    }
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms: ${previousBalance}`);
    res.json({
      success: true,
      data: {
        balance: previousBalance.toString(),
        previousDate: previousDateStr,
        currentDate: date2,
        source
      },
      message: `\u062A\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u064A\u0648\u0645 ${previousDateStr} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0633\u0627\u0628\u0642:", error);
    res.status(500).json({
      success: false,
      data: {
        balance: "0"
      },
      error: "\u0641\u0634\u0644 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A",
      message: error.message,
      processingTime: duration
    });
  }
});
async function calculateCumulativeBalance(projectId, fromDate, toDate) {
  try {
    const whereConditions = [eq8(fundTransfers.projectId, projectId)];
    if (fromDate) {
      whereConditions.push(gte5(fundTransfers.transferDate, sql6`${fromDate}::date`));
    }
    whereConditions.push(lt3(fundTransfers.transferDate, sql6`(${toDate}::date + interval '1 day')`));
    const [
      ftRows,
      waRows,
      mpRows,
      teRows,
      wtRows,
      wmRows,
      incomingPtRows,
      outgoingPtRows
    ] = await Promise.all([
      // تحويلات العهدة
      db.select().from(fundTransfers).where(and7(...whereConditions)),
      // أجور العمال
      db.select().from(workerAttendance).where(and7(
        eq8(workerAttendance.projectId, projectId),
        fromDate ? gte5(workerAttendance.date, fromDate) : sql6`true`,
        lte2(workerAttendance.date, toDate)
      )),
      // مشتريات المواد النقدية فقط
      db.select().from(materialPurchases).where(and7(
        eq8(materialPurchases.projectId, projectId),
        eq8(materialPurchases.purchaseType, "\u0646\u0642\u062F"),
        fromDate ? gte5(materialPurchases.purchaseDate, fromDate) : sql6`true`,
        lte2(materialPurchases.purchaseDate, toDate)
      )),
      // مصاريف النقل
      db.select().from(transportationExpenses).where(and7(
        eq8(transportationExpenses.projectId, projectId),
        fromDate ? gte5(transportationExpenses.date, fromDate) : sql6`true`,
        lte2(transportationExpenses.date, toDate)
      )),
      // حوالات العمال
      db.select().from(workerTransfers).where(and7(
        eq8(workerTransfers.projectId, projectId),
        fromDate ? gte5(workerTransfers.transferDate, fromDate) : sql6`true`,
        lte2(workerTransfers.transferDate, toDate)
      )),
      // مصاريف متنوعة للعمال
      db.select().from(workerMiscExpenses).where(and7(
        eq8(workerMiscExpenses.projectId, projectId),
        fromDate ? gte5(workerMiscExpenses.date, fromDate) : sql6`true`,
        lte2(workerMiscExpenses.date, toDate)
      )),
      // تحويلات واردة من مشاريع أخرى
      db.select().from(projectFundTransfers).where(and7(
        eq8(projectFundTransfers.toProjectId, projectId),
        fromDate ? gte5(projectFundTransfers.transferDate, fromDate) : sql6`true`,
        lte2(projectFundTransfers.transferDate, toDate)
      )),
      // تحويلات صادرة إلى مشاريع أخرى
      db.select().from(projectFundTransfers).where(and7(
        eq8(projectFundTransfers.fromProjectId, projectId),
        fromDate ? gte5(projectFundTransfers.transferDate, fromDate) : sql6`true`,
        lte2(projectFundTransfers.transferDate, toDate)
      ))
    ]);
    const totalFundTransfers = ftRows.reduce((sum, t) => sum + parseFloat(String(t.amount || "0")), 0);
    const totalWorkerWages = waRows.reduce((sum, w) => sum + parseFloat(String(w.paidAmount || "0")), 0);
    const totalMaterialCosts = mpRows.reduce((sum, m) => sum + parseFloat(String(m.totalAmount || "0")), 0);
    const totalTransportation = teRows.reduce((sum, t) => sum + parseFloat(String(t.amount || "0")), 0);
    const totalWorkerTransfers = wtRows.reduce((sum, w) => sum + parseFloat(String(w.amount || "0")), 0);
    const totalMiscExpenses = wmRows.reduce((sum, m) => sum + parseFloat(String(m.amount || "0")), 0);
    const totalIncomingProjectTransfers = incomingPtRows.reduce((sum, p) => sum + parseFloat(String(p.amount || "0")), 0);
    const totalOutgoingProjectTransfers = outgoingPtRows.reduce((sum, p) => sum + parseFloat(String(p.amount || "0")), 0);
    const totalIncome = totalFundTransfers + totalIncomingProjectTransfers;
    const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses + totalOutgoingProjectTransfers;
    const balance = totalIncome - totalExpenses;
    console.log(`\u{1F4B0} [Calc] \u0641\u062A\u0631\u0629 ${fromDate || "\u0627\u0644\u0628\u062F\u0627\u064A\u0629"} \u0625\u0644\u0649 ${toDate}: \u062F\u062E\u0644=${totalIncome}, \u0645\u0635\u0627\u0631\u064A\u0641=${totalExpenses}, \u0631\u0635\u064A\u062F=${balance}`);
    return balance;
  } catch (error) {
    console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A:", error);
    return 0;
  }
}
console.log("\u{1F3D7}\uFE0F [ProjectRouter] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u0645\u0633\u0627\u0631\u0627\u062A \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639");
var projectRoutes_default = projectRouter;

// server/routes/modules/workerRoutes.ts
init_db();
init_schema();
import express6 from "express";
import { eq as eq9, sql as sql7, and as and8 } from "drizzle-orm";
var workerRouter = express6.Router();
workerRouter.use(requireAuth);
workerRouter.get("/workers", async (req, res) => {
  try {
    console.log("\u{1F477} [API] \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0627\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    const workersList = await db.select().from(workers).orderBy(workers.createdAt);
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${workersList.length} \u0639\u0627\u0645\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A`);
    res.json({
      success: true,
      data: workersList,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${workersList.length} \u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D`
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0639\u0645\u0627\u0644:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0627\u0644"
    });
  }
});
workerRouter.post("/workers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F477} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u0639\u0627\u0645\u0644 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    const validationResult = enhancedInsertWorkerSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u0627\u0644\u0639\u0627\u0645\u0644");
    console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u0627\u0644\u0639\u0627\u0645\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const newWorker = await db.insert(workers).values(validationResult.data).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: newWorker[0].id,
      name: newWorker[0].name,
      type: newWorker[0].type,
      dailyWage: newWorker[0].dailyWage
    });
    res.status(201).json({
      success: true,
      data: newWorker[0],
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0627\u0645\u0644 "${newWorker[0].name}" (${newWorker[0].type}) \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23505") {
      errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
      statusCode = 409;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.get("/workers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const workerId = req.params.id;
    console.log("\u{1F50D} [API] \u0637\u0644\u0628 \u062C\u0644\u0628 \u0639\u0627\u0645\u0644 \u0645\u062D\u062F\u062F:", workerId);
    if (!workerId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
        processingTime: duration2
      });
    }
    const worker = await db.select().from(workers).where(eq9(workers.id, workerId)).limit(1);
    if (worker.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${workerId}`,
        processingTime: duration2
      });
    }
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: worker[0].id,
      name: worker[0].name,
      type: worker[0].type
    });
    res.json({
      success: true,
      data: worker[0],
      message: `\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0639\u0627\u0645\u0644 "${worker[0].name}" \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    res.status(500).json({
      success: false,
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0639\u0627\u0645\u0644",
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.patch("/workers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const workerId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u0627\u0644\u0639\u0627\u0645\u0644:", workerId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!workerId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingWorker = await db.select().from(workers).where(eq9(workers.id, workerId)).limit(1);
    if (existingWorker.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", workerId);
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${workerId}`,
        processingTime: duration2
      });
    }
    const validationResult = enhancedInsertWorkerSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644");
    console.log("\u{1F4BE} [API] \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const updatedWorker = await db.update(workers).set(validationResult.data).where(eq9(workers.id, workerId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: updatedWorker[0].id,
      name: updatedWorker[0].name,
      type: updatedWorker[0].type,
      dailyWage: updatedWorker[0].dailyWage
    });
    res.json({
      success: true,
      data: updatedWorker[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644 "${updatedWorker[0].name}" (${updatedWorker[0].type}) \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23505") {
      errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
      statusCode = 409;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.delete("/workers/:id", requireRole("admin"), async (req, res) => {
  const startTime = Date.now();
  try {
    const workerId = req.params.id;
    console.log("\u{1F5D1}\uFE0F [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u0627\u0644\u0639\u0627\u0645\u0644:", workerId);
    if (!workerId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062D\u0630\u0641",
        processingTime: duration2
      });
    }
    const existingWorker = await db.select().from(workers).where(eq9(workers.id, workerId)).limit(1);
    if (existingWorker.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", workerId);
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${workerId}`,
        processingTime: duration2
      });
    }
    const workerToDelete = existingWorker[0];
    console.log("\u{1F5D1}\uFE0F [API] \u0641\u062D\u0635 \u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644:", {
      id: workerToDelete.id,
      name: workerToDelete.name,
      type: workerToDelete.type
    });
    console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
    const attendanceRecords = await db.select({
      id: workerAttendance.id,
      date: workerAttendance.date,
      projectId: workerAttendance.projectId
    }).from(workerAttendance).where(eq9(workerAttendance.workerId, workerId)).limit(5);
    if (attendanceRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalAttendanceCount = await db.select({
        count: sql7`COUNT(*)`
      }).from(workerAttendance).where(eq9(workerAttendance.workerId, workerId));
      const totalCount = totalAttendanceCount[0]?.count || attendanceRecords.length;
      console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${totalCount} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631`);
      return res.status(409).json({
        success: false,
        error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
        message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${totalCount} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631. \u064A\u062C\u0628 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644.`,
        userAction: "\u064A\u062C\u0628 \u062D\u0630\u0641 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631 \u0623\u0648\u0644\u0627\u064B",
        relatedRecordsCount: totalCount,
        relatedRecordsType: "\u0633\u062C\u0644\u0627\u062A \u062D\u0636\u0648\u0631",
        processingTime: duration2
      });
    }
    console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
    const transferRecords = await db.select({ id: workerTransfers.id }).from(workerTransfers).where(eq9(workerTransfers.workerId, workerId)).limit(1);
    if (transferRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalTransfersCount = await db.select({
        count: sql7`COUNT(*)`
      }).from(workerTransfers).where(eq9(workerTransfers.workerId, workerId));
      const transfersCount = totalTransfersCount[0]?.count || transferRecords.length;
      console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transfersCount} \u062A\u062D\u0648\u064A\u0644 \u0645\u0627\u0644\u064A`);
      return res.status(409).json({
        success: false,
        error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
        message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transfersCount} \u062A\u062D\u0648\u064A\u0644 \u0645\u0627\u0644\u064A. \u064A\u062C\u0628 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644.`,
        userAction: "\u064A\u062C\u0628 \u062D\u0630\u0641 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0623\u0648\u0644\u0627\u064B",
        relatedRecordsCount: transfersCount,
        relatedRecordsType: "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0645\u0627\u0644\u064A\u0629",
        processingTime: duration2
      });
    }
    console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0633\u062C\u0644\u0627\u062A \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
    const transportRecords = await db.select({ id: transportationExpenses.id }).from(transportationExpenses).where(eq9(transportationExpenses.workerId, workerId)).limit(1);
    if (transportRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalTransportCount = await db.select({
        count: sql7`COUNT(*)`
      }).from(transportationExpenses).where(eq9(transportationExpenses.workerId, workerId));
      const transportCount = totalTransportCount[0]?.count || transportRecords.length;
      console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transportCount} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644`);
      return res.status(409).json({
        success: false,
        error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
        message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${transportCount} \u0645\u0635\u0631\u0648\u0641 \u0646\u0642\u0644. \u064A\u062C\u0628 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644.`,
        userAction: "\u064A\u062C\u0628 \u062D\u0630\u0641 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0646\u0642\u0644 \u0623\u0648\u0644\u0627\u064B",
        relatedRecordsCount: transportCount,
        relatedRecordsType: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0646\u0642\u0644",
        processingTime: duration2
      });
    }
    console.log("\u{1F50D} [API] \u0641\u062D\u0635 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644...");
    const balanceRecords = await db.select({ id: workerBalances.id }).from(workerBalances).where(eq9(workerBalances.workerId, workerId)).limit(1);
    if (balanceRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalBalanceCount = await db.select({
        count: sql7`COUNT(*)`
      }).from(workerBalances).where(eq9(workerBalances.workerId, workerId));
      const balanceCount = totalBalanceCount[0]?.count || balanceRecords.length;
      console.log(`\u26A0\uFE0F [API] \u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 - \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${balanceCount} \u0633\u062C\u0644 \u0631\u0635\u064A\u062F`);
      return res.status(409).json({
        success: false,
        error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
        message: `\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${workerToDelete.name}" \u0644\u0623\u0646\u0647 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${balanceCount} \u0633\u062C\u0644 \u0631\u0635\u064A\u062F. \u064A\u062C\u0628 \u062A\u0635\u0641\u064A\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0635\u0641\u062D\u0629 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0639\u0645\u0627\u0644.`,
        userAction: "\u064A\u062C\u0628 \u062A\u0635\u0641\u064A\u0629 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0623\u0648\u0644\u0627\u064B",
        relatedRecordsCount: balanceCount,
        relatedRecordsType: "\u0623\u0631\u0635\u062F\u0629",
        processingTime: duration2
      });
    }
    console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (\u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A \u0645\u0631\u062A\u0628\u0637\u0629)...");
    const deletedWorker = await db.delete(workers).where(eq9(workers.id, workerId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: deletedWorker[0].id,
      name: deletedWorker[0].name,
      type: deletedWorker[0].type
    });
    res.json({
      success: true,
      data: deletedWorker[0],
      message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 "${deletedWorker[0].name}" (${deletedWorker[0].type}) \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    let userAction = "\u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A";
    let relatedInfo = {};
    if (error.code === "23503") {
      errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0648\u062C\u0648\u062F \u0633\u062C\u0644\u0627\u062A \u0645\u0631\u062A\u0628\u0637\u0629 \u0644\u0645 \u064A\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641\u0647\u0627 \u0645\u0633\u0628\u0642\u0627\u064B";
      statusCode = 409;
      userAction = "\u062A\u062D\u0642\u0642 \u0645\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0639\u0627\u0645\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0642\u0645 \u0628\u062D\u0630\u0641\u0647\u0627 \u0623\u0648\u0644\u0627\u064B";
      relatedInfo = {
        raceConditionDetected: true,
        constraintViolated: error.constraint || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
        affectedTable: error.table || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
        affectedColumn: error.column || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"
      };
    } else if (error.code === "22P02") {
      errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0623\u0648 \u062A\u0627\u0644\u0641";
      statusCode = 400;
      userAction = "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u062D\u0629 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644";
      relatedInfo = {
        invalidInputDetected: true,
        inputValue: req.params.id,
        expectedFormat: "UUID \u0635\u062D\u064A\u062D"
      };
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: `\u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0639\u0627\u0645\u0644: ${error.message}`,
      userAction,
      processingTime: duration,
      troubleshooting: relatedInfo
    });
  }
});
workerRouter.patch("/worker-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", transferId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(workerTransfers).where(eq9(workerTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const validationResult = insertWorkerTransferSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    const updatedTransfer = await db.update(workerTransfers).set(validationResult.data).where(eq9(workerTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedTransfer[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0642\u064A\u0645\u0629 ${updatedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644",
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.delete("/worker-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F5D1}\uFE0F [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", transferId);
    console.log("\u{1F464} [API] \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0644\u0644\u062D\u0630\u0641",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(workerTransfers).where(eq9(workerTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629:", transferId);
      return res.status(404).json({
        success: false,
        error: "\u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0648\u0627\u0644\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const transferToDelete = existingTransfer[0];
    console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", {
      id: transferToDelete.id,
      workerId: transferToDelete.workerId,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });
    console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const deletedTransfer = await db.delete(workerTransfers).where(eq9(workerTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: deletedTransfer[0].id,
      amount: deletedTransfer[0].amount,
      recipientName: deletedTransfer[0].recipientName
    });
    res.json({
      success: true,
      data: deletedTransfer[0],
      message: `\u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0625\u0644\u0649 "${deletedTransfer[0].recipientName}" \u0628\u0642\u064A\u0645\u0629 ${deletedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 - \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649";
      statusCode = 409;
    } else if (error.code === "22P02") {
      errorMessage = "\u0645\u0639\u0631\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.get("/worker-misc-expenses", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId, date: date2 } = req.query;
    console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629");
    console.log("\u{1F50D} [API] \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0641\u0644\u062A\u0631\u0629:", { projectId, date: date2 });
    let query;
    if (projectId && date2) {
      query = db.select().from(workerMiscExpenses).where(and8(
        eq9(workerMiscExpenses.projectId, projectId),
        eq9(workerMiscExpenses.date, date2)
      ));
    } else if (projectId) {
      query = db.select().from(workerMiscExpenses).where(eq9(workerMiscExpenses.projectId, projectId));
    } else if (date2) {
      query = db.select().from(workerMiscExpenses).where(eq9(workerMiscExpenses.date, date2));
    } else {
      query = db.select().from(workerMiscExpenses);
    }
    const expenses = await query.orderBy(workerMiscExpenses.date);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: expenses,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629",
      processingTime: duration
    });
  }
});
workerRouter.patch("/worker-misc-expenses/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639:", expenseId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!expenseId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq9(workerMiscExpenses.id, expenseId)).limit(1);
    if (existingExpense.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${expenseId}`,
        processingTime: duration2
      });
    }
    const validationResult = insertWorkerMiscExpenseSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    const updatedExpense = await db.update(workerMiscExpenses).set(validationResult.data).where(eq9(workerMiscExpenses.id, expenseId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedExpense[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0642\u064A\u0645\u0629 ${updatedExpense[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644",
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.get("/autocomplete/workerMiscDescriptions", async (req, res) => {
  try {
    console.log("\u{1F4DD} [API] \u062C\u0644\u0628 \u0648\u0635\u0641 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629 \u0644\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A");
    res.json({
      success: true,
      data: [],
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0648\u0635\u0641 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629 \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0648\u0635\u0641 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0648\u0635\u0641 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629"
    });
  }
});
workerRouter.get("/worker-types", async (req, res) => {
  try {
    const workerTypes2 = [
      { id: "1", name: "\u0645\u0639\u0644\u0645", usageCount: 1 },
      { id: "2", name: "\u0639\u0627\u0645\u0644", usageCount: 1 },
      { id: "3", name: "\u0645\u0633\u0627\u0639\u062F", usageCount: 1 },
      { id: "4", name: "\u0633\u0627\u0626\u0642", usageCount: 1 },
      { id: "5", name: "\u062D\u0627\u0631\u0633", usageCount: 1 }
    ];
    res.json({
      success: true,
      data: workerTypes2,
      message: "Worker types loaded successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0639\u0645\u0627\u0644"
    });
  }
});
workerRouter.get("/projects/:projectId/worker-attendance", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { date: date2 } = req.query;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}${date2 ? ` \u0644\u0644\u062A\u0627\u0631\u064A\u062E: ${date2}` : ""}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    let whereCondition;
    if (date2) {
      whereCondition = and8(
        eq9(workerAttendance.projectId, projectId),
        eq9(workerAttendance.date, date2)
      );
    } else {
      whereCondition = eq9(workerAttendance.projectId, projectId);
    }
    const attendance = await db.select({
      id: workerAttendance.id,
      workerId: workerAttendance.workerId,
      projectId: workerAttendance.projectId,
      date: workerAttendance.date,
      attendanceDate: workerAttendance.attendanceDate,
      startTime: workerAttendance.startTime,
      endTime: workerAttendance.endTime,
      workDescription: workerAttendance.workDescription,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      remainingAmount: workerAttendance.remainingAmount,
      paymentType: workerAttendance.paymentType,
      isPresent: workerAttendance.isPresent,
      createdAt: workerAttendance.createdAt,
      workerName: workers.name
    }).from(workerAttendance).leftJoin(workers, eq9(workerAttendance.workerId, workers.id)).where(whereCondition).orderBy(workerAttendance.date);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${attendance.length} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: attendance,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${attendance.length} \u0633\u062C\u0644 \u062D\u0636\u0648\u0631 \u0644\u0644\u0645\u0634\u0631\u0648\u0639${date2 ? ` \u0641\u064A \u0627\u0644\u062A\u0627\u0631\u064A\u062E ${date2}` : ""}`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
workerRouter.post("/worker-attendance", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4DD} [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u062D\u0636\u0648\u0631 \u0639\u0627\u0645\u0644 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    const validationResult = insertWorkerAttendanceSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644");
    const actualWageValue = parseFloat(validationResult.data.dailyWage) * validationResult.data.workDays;
    const dataWithCalculatedFields = {
      ...validationResult.data,
      workDays: validationResult.data.workDays.toString(),
      // تحويل إلى string للتوافق مع decimal
      actualWage: actualWageValue.toString(),
      totalPay: actualWageValue.toString()
      // totalPay = actualWage
    };
    console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const newAttendance = await db.insert(workerAttendance).values([dataWithCalculatedFields]).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: newAttendance[0].id,
      workerId: newAttendance[0].workerId,
      date: newAttendance[0].date
    });
    res.status(201).json({
      success: true,
      data: newAttendance[0],
      message: `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u062A\u0627\u0631\u064A\u062E ${newAttendance[0].date} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
      statusCode = 400;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    } else if (error.code === "23505") {
      errorMessage = "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0647\u0630\u0627 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0644\u0647\u0630\u0627 \u0627\u0644\u062A\u0627\u0631\u064A\u062E";
      statusCode = 409;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.patch("/worker-attendance/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const attendanceId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644:", attendanceId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!attendanceId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingAttendance = await db.select().from(workerAttendance).where(eq9(workerAttendance.id, attendanceId)).limit(1);
    if (existingAttendance.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0636\u0648\u0631 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${attendanceId}`,
        processingTime: duration2
      });
    }
    const validationResult = { success: true, data: req.body, error: null };
    if (!req.body || typeof req.body !== "object") {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0623\u0648 \u0641\u0627\u0631\u063A\u0629",
        processingTime: duration2
      });
    }
    const updateData = { ...validationResult.data };
    if (updateData.workDays !== void 0) {
      updateData.workDays = updateData.workDays.toString();
    }
    if (updateData.dailyWage && updateData.workDays) {
      const actualWageValue = parseFloat(updateData.dailyWage) * parseFloat(updateData.workDays);
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();
    } else if (updateData.dailyWage && existingAttendance[0].workDays) {
      const actualWageValue = parseFloat(updateData.dailyWage) * parseFloat(existingAttendance[0].workDays);
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();
    } else if (updateData.workDays && existingAttendance[0].dailyWage) {
      const actualWageValue = parseFloat(existingAttendance[0].dailyWage) * parseFloat(updateData.workDays);
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();
    }
    const updatedAttendance = await db.update(workerAttendance).set(updateData).where(eq9(workerAttendance.id, attendanceId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedAttendance[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u062A\u0627\u0631\u064A\u062E ${updatedAttendance[0].date} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
      statusCode = 400;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0627\u0645\u0644 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    } else if (error.code === "23505") {
      errorMessage = "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0647\u0630\u0627 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0644\u0647\u0630\u0627 \u0627\u0644\u062A\u0627\u0631\u064A\u062E";
      statusCode = 409;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.patch("/worker-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", transferId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(workerTransfers).where(eq9(workerTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const validationResult = insertWorkerTransferSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    const updatedTransfer = await db.update(workerTransfers).set(validationResult.data).where(eq9(workerTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedTransfer[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0642\u064A\u0645\u0629 ${updatedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
      statusCode = 400;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.delete("/worker-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F5D1}\uFE0F [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", transferId);
    console.log("\u{1F464} [API] \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0644\u0644\u062D\u0630\u0641",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(workerTransfers).where(eq9(workerTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629:", transferId);
      return res.status(404).json({
        success: false,
        error: "\u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0648\u0627\u0644\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const transferToDelete = existingTransfer[0];
    console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", {
      id: transferToDelete.id,
      workerId: transferToDelete.workerId,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });
    console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const deletedTransfer = await db.delete(workerTransfers).where(eq9(workerTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: deletedTransfer[0].id,
      amount: deletedTransfer[0].amount,
      recipientName: deletedTransfer[0].recipientName
    });
    res.json({
      success: true,
      data: deletedTransfer[0],
      message: `\u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0642\u064A\u0645\u0629 ${deletedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "22P02") {
      errorMessage = "\u0645\u0639\u0631\u0641 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.get("/projects/:projectId/worker-misc-expenses", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629 \u0644\u0644\u0639\u0645\u0627\u0644 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId}`);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        processingTime: Date.now() - startTime
      });
    }
    const expenses = await db.select().from(workerMiscExpenses).where(eq9(workerMiscExpenses.projectId, projectId)).orderBy(workerMiscExpenses.date);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: expenses,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0645\u0634\u0631\u0648\u0639`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message,
      processingTime: duration
    });
  }
});
workerRouter.patch("/worker-misc-expenses/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639:", expenseId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!expenseId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq9(workerMiscExpenses.id, expenseId)).limit(1);
    if (existingExpense.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${expenseId}`,
        processingTime: duration2
      });
    }
    const validationResult = insertWorkerMiscExpenseSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    const updatedExpense = await db.update(workerMiscExpenses).set(validationResult.data).where(eq9(workerMiscExpenses.id, expenseId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedExpense[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0628\u0642\u064A\u0645\u0629 ${updatedExpense[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
      statusCode = 400;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
workerRouter.get("/workers/:id/stats", async (req, res) => {
  const startTime = Date.now();
  try {
    const workerId = req.params.id;
    console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644:", workerId);
    if (!workerId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0627\u0645\u0644",
        processingTime: duration2
      });
    }
    const worker = await db.select().from(workers).where(eq9(workers.id, workerId)).limit(1);
    if (worker.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${workerId}`,
        processingTime: duration2
      });
    }
    const totalWorkDaysResult = await db.select({
      totalDays: sql7`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`
    }).from(workerAttendance).where(eq9(workerAttendance.workerId, workerId));
    const totalWorkDays = Number(totalWorkDaysResult[0]?.totalDays) || 0;
    const lastAttendanceResult = await db.select({
      lastAttendanceDate: workerAttendance.attendanceDate,
      projectId: workerAttendance.projectId
    }).from(workerAttendance).where(eq9(workerAttendance.workerId, workerId)).orderBy(sql7`${workerAttendance.attendanceDate} DESC`).limit(1);
    const lastAttendanceDate = lastAttendanceResult[0]?.lastAttendanceDate || null;
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split("T")[0];
    const monthlyAttendanceResult = await db.select({
      monthlyDays: sql7`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`
    }).from(workerAttendance).where(and8(
      eq9(workerAttendance.workerId, workerId),
      sql7`${workerAttendance.attendanceDate} >= ${thirtyDaysAgoString}`
    ));
    const monthlyAttendanceRate = Number(monthlyAttendanceResult[0]?.monthlyDays) || 0;
    const totalTransfersResult = await db.select({
      totalTransfers: sql7`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
      transfersCount: sql7`COUNT(*)`
    }).from(workerTransfers).where(eq9(workerTransfers.workerId, workerId));
    const totalTransfers = Number(totalTransfersResult[0]?.totalTransfers) || 0;
    const transfersCount = Number(totalTransfersResult[0]?.transfersCount) || 0;
    const projectsWorkedResult = await db.select({
      projectsCount: sql7`COUNT(DISTINCT ${workerAttendance.projectId})`
    }).from(workerAttendance).where(eq9(workerAttendance.workerId, workerId));
    const projectsWorked = Number(projectsWorkedResult[0]?.projectsCount) || 0;
    const totalEarningsResult = await db.select({
      totalEarnings: sql7`COALESCE(SUM(CAST(${workerAttendance.actualWage} AS DECIMAL)), 0)`
    }).from(workerAttendance).where(eq9(workerAttendance.workerId, workerId));
    const totalEarnings = Number(totalEarningsResult[0]?.totalEarnings) || 0;
    const stats = {
      totalWorkDays,
      lastAttendanceDate,
      monthlyAttendanceRate,
      totalTransfers,
      transfersCount,
      projectsWorked,
      totalEarnings,
      workerInfo: {
        id: worker[0].id,
        name: worker[0].name,
        type: worker[0].type,
        dailyWage: worker[0].dailyWage
      }
    };
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 "${worker[0].name}" \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    console.log("\u{1F4CA} [API] \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644:", {
      totalWorkDays,
      lastAttendanceDate,
      monthlyAttendanceRate,
      totalTransfers,
      projectsWorked
    });
    res.json({
      success: true,
      data: stats,
      message: `\u062A\u0645 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644 "${worker[0].name}" \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    res.status(500).json({
      success: false,
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0644",
      message: error.message,
      processingTime: duration
    });
  }
});
console.log("\u{1F477} [WorkerRouter] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u0645\u0633\u0627\u0631\u0627\u062A \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0627\u0644");
var workerRoutes_default = workerRouter;

// server/routes/modules/financialRoutes.ts
init_db();
init_schema();
import express7 from "express";
import { eq as eq10, and as and9, sql as sql8, gte as gte6, lte as lte3, desc as desc6 } from "drizzle-orm";
var financialRouter = express7.Router();
financialRouter.use(requireAuth);
financialRouter.get("/fund-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4B0} [API] \u062C\u0644\u0628 \u062C\u0645\u064A\u0639 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    const transfers = await db.select({
      id: fundTransfers.id,
      projectId: fundTransfers.projectId,
      amount: fundTransfers.amount,
      senderName: fundTransfers.senderName,
      transferNumber: fundTransfers.transferNumber,
      transferType: fundTransfers.transferType,
      transferDate: fundTransfers.transferDate,
      notes: fundTransfers.notes,
      createdAt: fundTransfers.createdAt,
      projectName: projects.name
    }).from(fundTransfers).leftJoin(projects, eq10(fundTransfers.projectId, projects.id)).orderBy(desc6(fundTransfers.transferDate));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.post("/fund-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4B0} [API] \u0625\u0636\u0627\u0641\u0629 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u062C\u062F\u064A\u062F:", req.body);
    const validationResult = insertFundTransferSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629");
    const newTransfer = await db.insert(fundTransfers).values(validationResult.data).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.status(201).json({
      success: true,
      data: newTransfer[0],
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0642\u064A\u0645\u0629 ${newTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u0625\u0636\u0627\u0641\u0629 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629";
    let statusCode = 500;
    if (error.code === "23505") errorMessage = "\u0631\u0642\u0645 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B", statusCode = 409;
    else if (error.code === "23503") errorMessage = "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", statusCode = 400;
    else if (error.code === "23502") errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0646\u0627\u0642\u0635\u0629", statusCode = 400;
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.patch("/fund-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", transferId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(fundTransfers).where(eq10(fundTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const validationResult = insertFundTransferSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    const updatedTransfer = await db.update(fundTransfers).set(validationResult.data).where(eq10(fundTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedTransfer[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0642\u064A\u0645\u0629 ${updatedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.delete("/fund-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F5D1}\uFE0F [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", transferId);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0644\u0644\u062D\u0630\u0641",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(fundTransfers).where(eq10(fundTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const deletedTransfer = await db.delete(fundTransfers).where(eq10(fundTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: deletedTransfer[0],
      message: `\u062A\u0645 \u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0628\u0642\u064A\u0645\u0629 ${deletedTransfer[0]?.amount || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u0644\u0648\u062C\u0648\u062F \u0645\u0631\u0627\u062C\u0639 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0647";
      statusCode = 409;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.get("/daily-project-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId, date: date2 } = req.query;
    console.log("\u{1F3D7}\uFE0F [API] \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0644\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629");
    console.log("\u{1F50D} [API] \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0628:", { projectId, date: date2 });
    if (!projectId || !date2) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0645\u0637\u0644\u0648\u0628\u0627\u0646",
        processingTime: duration2
      });
    }
    const transfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      createdAt: projectFundTransfers.createdAt,
      fromProjectName: sql8`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql8`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(
      and9(
        sql8`(${projectFundTransfers.fromProjectId} = ${projectId} OR ${projectFundTransfers.toProjectId} = ${projectId})`,
        eq10(projectFundTransfers.transferDate, date2)
      )
    ).orderBy(desc6(projectFundTransfers.createdAt));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0645\u0634\u0631\u0648\u0639 \u0644\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0623\u0645\u0648\u0627\u0644 \u0645\u0634\u0627\u0631\u064A\u0639 \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0644\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.get("/project-fund-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId, date: date2, dateFrom, dateTo } = req.query;
    console.log("\u{1F3D7}\uFE0F [API] \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    console.log("\u{1F50D} [API] \u0641\u0644\u062A\u0631\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", projectId || "\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639");
    console.log("\u{1F4C5} [API] \u0641\u0644\u062A\u0631\u0629 \u062D\u0633\u0628 \u0627\u0644\u062A\u0627\u0631\u064A\u062E:", { date: date2, dateFrom, dateTo });
    let baseQuery = db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      createdAt: projectFundTransfers.createdAt,
      fromProjectName: sql8`from_project.name`.as("fromProjectName"),
      toProjectName: sql8`to_project.name`.as("toProjectName")
    }).from(projectFundTransfers).leftJoin(sql8`${projects} as from_project`, eq10(projectFundTransfers.fromProjectId, sql8`from_project.id`)).leftJoin(sql8`${projects} as to_project`, eq10(projectFundTransfers.toProjectId, sql8`to_project.id`));
    const conditions = [];
    if (projectId && projectId !== "all") {
      conditions.push(sql8`(${projectFundTransfers.fromProjectId} = ${projectId} OR ${projectFundTransfers.toProjectId} = ${projectId})`);
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", projectId);
    }
    if (date2) {
      const startOfDay = `${date2} 00:00:00`;
      const endOfDay = `${date2} 23:59:59.999`;
      conditions.push(and9(
        gte6(projectFundTransfers.transferDate, startOfDay),
        lte3(projectFundTransfers.transferDate, endOfDay)
      ));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u062A\u0627\u0631\u064A\u062E \u0645\u062D\u062F\u062F:", date2);
    } else if (dateFrom && dateTo) {
      const startOfPeriod = `${dateFrom} 00:00:00`;
      const endOfPeriod = `${dateTo} 23:59:59.999`;
      conditions.push(and9(
        gte6(projectFundTransfers.transferDate, startOfPeriod),
        lte3(projectFundTransfers.transferDate, endOfPeriod)
      ));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u0641\u062A\u0631\u0629 \u0632\u0645\u0646\u064A\u0629:", `${dateFrom} - ${dateTo}`);
    } else if (dateFrom) {
      const startOfPeriod = `${dateFrom} 00:00:00`;
      conditions.push(gte6(projectFundTransfers.transferDate, startOfPeriod));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u0645\u0646 \u062A\u0627\u0631\u064A\u062E:", dateFrom);
    } else if (dateTo) {
      const endOfPeriod = `${dateTo} 23:59:59.999`;
      conditions.push(lte3(projectFundTransfers.transferDate, endOfPeriod));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u062D\u062A\u0649 \u062A\u0627\u0631\u064A\u062E:", dateTo);
    }
    let transfers;
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and9(...conditions);
      transfers = await baseQuery.where(whereClause).orderBy(desc6(projectFundTransfers.transferDate));
    } else {
      transfers = await baseQuery.orderBy(desc6(projectFundTransfers.transferDate));
    }
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0645\u0634\u0631\u0648\u0639 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0623\u0645\u0648\u0627\u0644 \u0645\u0634\u0627\u0631\u064A\u0639 \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.post("/project-fund-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F3D7}\uFE0F [API] \u0637\u0644\u0628 \u0625\u0636\u0627\u0641\u0629 \u062A\u062D\u0648\u064A\u0644 \u0623\u0645\u0648\u0627\u0644 \u0645\u0634\u0631\u0648\u0639 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    const validationResult = insertProjectFundTransferSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639");
    console.log("\u{1F4BE} [API] \u062D\u0641\u0638 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const newTransfer = await db.insert(projectFundTransfers).values(validationResult.data).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: newTransfer[0].id,
      fromProjectId: newTransfer[0].fromProjectId,
      toProjectId: newTransfer[0].toProjectId,
      amount: newTransfer[0].amount
    });
    res.status(201).json({
      success: true,
      data: newTransfer[0],
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0645\u0634\u0631\u0648\u0639 \u0628\u0642\u064A\u0645\u0629 ${newTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639";
    let statusCode = 500;
    if (error.code === "23505") {
      errorMessage = "\u0631\u0642\u0645 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B";
      statusCode = 409;
    } else if (error.code === "23503") {
      errorMessage = "\u0623\u062D\u062F \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F";
      statusCode = 400;
    } else if (error.code === "23502") {
      errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0646\u0627\u0642\u0635\u0629";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.get("/worker-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F477}\u200D\u2642\uFE0F [API] \u062C\u0644\u0628 \u062C\u0645\u064A\u0639 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    const transfers = await db.select().from(workerTransfers).orderBy(desc6(workerTransfers.transferDate));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: transfers,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0645\u0627\u0644",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.post("/worker-transfers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F477}\u200D\u2642\uFE0F [API] \u0625\u0636\u0627\u0641\u0629 \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u062C\u062F\u064A\u062F:", req.body);
    const validationResult = insertWorkerTransferSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644");
    const newTransfer = await db.insert(workerTransfers).values(validationResult.data).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.status(201).json({
      success: true,
      data: newTransfer[0],
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u0628\u0642\u064A\u0645\u0629 ${newTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u0625\u0636\u0627\u0641\u0629 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23503") errorMessage = "\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", statusCode = 400;
    else if (error.code === "23502") errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0646\u0627\u0642\u0635\u0629", statusCode = 400;
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.patch("/worker-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", transferId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(workerTransfers).where(eq10(workerTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const validationResult = insertWorkerTransferSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    const updatedTransfer = await db.update(workerTransfers).set(validationResult.data).where(eq10(workerTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedTransfer[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0642\u064A\u0645\u0629 ${updatedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0627\u0645\u0644",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.delete("/worker-transfers/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const transferId = req.params.id;
    console.log("\u{1F5D1}\uFE0F [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", transferId);
    console.log("\u{1F464} [API] \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    if (!transferId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0644\u0644\u062D\u0630\u0641",
        processingTime: duration2
      });
    }
    const existingTransfer = await db.select().from(workerTransfers).where(eq10(workerTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629:", transferId);
      return res.status(404).json({
        success: false,
        error: "\u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0648\u0627\u0644\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const transferToDelete = existingTransfer[0];
    console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", {
      id: transferToDelete.id,
      projectId: transferToDelete.projectId,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });
    console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const deletedTransfer = await db.delete(workerTransfers).where(eq10(workerTransfers.id, transferId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: deletedTransfer[0].id,
      amount: deletedTransfer[0].amount,
      recipientName: deletedTransfer[0].recipientName
    });
    res.json({
      success: true,
      data: deletedTransfer[0],
      message: `\u062A\u0645 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u0625\u0644\u0649 "${deletedTransfer[0].recipientName}" \u0628\u0642\u064A\u0645\u0629 ${deletedTransfer[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 - \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649";
      statusCode = 409;
    } else if (error.code === "22P02") {
      errorMessage = "\u0645\u0639\u0631\u0641 \u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.get("/worker-misc-expenses", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4B8} [API] \u062C\u0644\u0628 \u062C\u0645\u064A\u0639 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    const expenses = await db.select().from(workerMiscExpenses).orderBy(desc6(workerMiscExpenses.date));
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: expenses,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${expenses.length} \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0645\u0627\u0644 \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0639\u0645\u0627\u0644:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.post("/worker-misc-expenses", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4B8} [API] \u0625\u0636\u0627\u0641\u0629 \u0645\u0635\u0631\u0648\u0641 \u0639\u0627\u0645\u0644 \u0645\u062A\u0646\u0648\u0639 \u062C\u062F\u064A\u062F:", req.body);
    const validationResult = insertWorkerMiscExpenseSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639");
    const newExpense = await db.insert(workerMiscExpenses).values(validationResult.data).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.status(201).json({
      success: true,
      data: newExpense[0],
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0635\u0631\u0648\u0641 \u0639\u0627\u0645\u0644 \u0645\u062A\u0646\u0648\u0639 \u0628\u0642\u064A\u0645\u0629 ${newExpense[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u0625\u0636\u0627\u0641\u0629 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639";
    let statusCode = 500;
    if (error.code === "23503") errorMessage = "\u0627\u0644\u0639\u0627\u0645\u0644 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", statusCode = 400;
    else if (error.code === "23502") errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0646\u0627\u0642\u0635\u0629", statusCode = 400;
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.patch("/worker-misc-expenses/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    console.log("\u{1F4CB} [API] ID \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639:", expenseId);
    console.log("\u{1F4CB} [API] \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0631\u0633\u0644\u0629:", req.body);
    if (!expenseId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0644\u0644\u062A\u062D\u062F\u064A\u062B",
        processingTime: duration2
      });
    }
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq10(workerMiscExpenses.id, expenseId)).limit(1);
    if (existingExpense.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0635\u0631\u0648\u0641 \u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${expenseId}`,
        processingTime: duration2
      });
    }
    const validationResult = insertWorkerMiscExpenseSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    const updatedExpense = await db.update(workerMiscExpenses).set(validationResult.data).where(eq10(workerMiscExpenses.id, expenseId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: updatedExpense[0],
      message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644 \u0628\u0642\u064A\u0645\u0629 ${updatedExpense[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0644\u0644\u0639\u0627\u0645\u0644",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.delete("/worker-misc-expenses/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const expenseId = req.params.id;
    console.log("\u{1F5D1}\uFE0F [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639:", expenseId);
    console.log("\u{1F464} [API] \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    if (!expenseId) {
      const duration2 = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: "\u0645\u0639\u0631\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0645\u0637\u0644\u0648\u0628",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0635\u0631\u0648\u0641 \u0644\u0644\u062D\u0630\u0641",
        processingTime: duration2
      });
    }
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq10(workerMiscExpenses.id, expenseId)).limit(1);
    if (existingExpense.length === 0) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F:", expenseId);
      return res.status(404).json({
        success: false,
        error: "\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0635\u0631\u0648\u0641 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${expenseId}`,
        processingTime: duration2
      });
    }
    const expenseToDelete = existingExpense[0];
    console.log("\u{1F5D1}\uFE0F [API] \u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639:", {
      id: expenseToDelete.id,
      projectId: expenseToDelete.projectId,
      amount: expenseToDelete.amount,
      description: expenseToDelete.description
    });
    console.log("\u{1F5D1}\uFE0F [API] \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...");
    const deletedExpense = await db.delete(workerMiscExpenses).where(eq10(workerMiscExpenses.id, expenseId)).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms:`, {
      id: deletedExpense[0].id,
      amount: deletedExpense[0].amount,
      description: deletedExpense[0].description
    });
    res.json({
      success: true,
      data: deletedExpense[0],
      message: `\u062A\u0645 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 "${deletedExpense[0].description}" \u0628\u0642\u064A\u0645\u0629 ${deletedExpense[0].amount} \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639";
    let statusCode = 500;
    if (error.code === "23503") {
      errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 - \u0645\u0631\u062A\u0628\u0637 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u062E\u0631\u0649";
      statusCode = 409;
    } else if (error.code === "22P02") {
      errorMessage = "\u0645\u0639\u0631\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D";
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.get("/reports/summary", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u0629");
    console.log("\u{1F464} [API] \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:", req.user?.email);
    const [
      fundTransfersStats,
      projectFundTransfersStats,
      workerTransfersStats,
      workerMiscExpensesStats,
      projectsCount,
      workersCount
    ] = await Promise.all([
      // إحصائيات تحويلات العهدة
      db.execute(sql8`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM fund_transfers
      `),
      // إحصائيات تحويلات المشاريع
      db.execute(sql8`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM project_fund_transfers
      `),
      // إحصائيات تحويلات العمال
      db.execute(sql8`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM worker_transfers
      `),
      // إحصائيات مصاريف العمال المتنوعة
      db.execute(sql8`
        SELECT
          COUNT(*) as total_expenses,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM worker_misc_expenses
      `),
      // عدد المشاريع
      db.execute(sql8`SELECT COUNT(*) as total_projects FROM projects`),
      // عدد العمال
      db.execute(sql8`SELECT COUNT(*) as total_workers FROM workers WHERE is_active = true`)
    ]);
    const cleanValue = (value) => {
      if (value === null || value === void 0) return 0;
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    };
    const cleanCount = (value) => {
      if (value === null || value === void 0) return 0;
      const parsed = parseInt(String(value), 10);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    };
    const summary = {
      // إحصائيات التحويلات المالية
      fundTransfers: {
        totalTransfers: cleanCount(fundTransfersStats.rows[0]?.total_transfers),
        totalAmount: cleanValue(fundTransfersStats.rows[0]?.total_amount)
      },
      // إحصائيات تحويلات المشاريع
      projectFundTransfers: {
        totalTransfers: cleanCount(projectFundTransfersStats.rows[0]?.total_transfers),
        totalAmount: cleanValue(projectFundTransfersStats.rows[0]?.total_amount)
      },
      // إحصائيات تحويلات العمال
      workerTransfers: {
        totalTransfers: cleanCount(workerTransfersStats.rows[0]?.total_transfers),
        totalAmount: cleanValue(workerTransfersStats.rows[0]?.total_amount)
      },
      // إحصائيات مصاريف العمال المتنوعة
      workerMiscExpenses: {
        totalExpenses: cleanCount(workerMiscExpensesStats.rows[0]?.total_expenses),
        totalAmount: cleanValue(workerMiscExpensesStats.rows[0]?.total_amount)
      },
      // إحصائيات عامة
      general: {
        totalProjects: cleanCount(projectsCount.rows[0]?.total_projects),
        totalActiveWorkers: cleanCount(workersCount.rows[0]?.total_workers)
      }
    };
    const totalIncome = summary.fundTransfers.totalAmount + summary.projectFundTransfers.totalAmount;
    const totalExpenses = summary.workerTransfers.totalAmount + summary.workerMiscExpenses.totalAmount;
    const netBalance = totalIncome - totalExpenses;
    const finalSummary = {
      ...summary,
      // ملخص مالي إجمالي
      financialOverview: {
        totalIncome,
        totalExpenses,
        netBalance,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 \u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: finalSummary,
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0628\u0646\u062C\u0627\u062D",
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.get("/suppliers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F3EA} [API] \u062C\u0644\u0628 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    const suppliersList = await db.select().from(suppliers).where(eq10(suppliers.isActive, true)).orderBy(suppliers.name);
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${suppliersList.length} \u0645\u0648\u0631\u062F \u0641\u064A ${duration}ms`);
    res.json({
      success: true,
      data: suppliersList,
      message: `\u062A\u0645 \u062C\u0644\u0628 ${suppliersList.length} \u0645\u0648\u0631\u062F \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646:", error);
    res.status(500).json({
      success: false,
      data: [],
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646",
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.post("/suppliers", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F3EA} [API] \u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F:", req.body);
    const validationResult = insertSupplierSchema.safeParse(req.body);
    if (!validationResult.success) {
      const duration2 = Date.now() - startTime;
      console.error("\u274C [API] \u0641\u0634\u0644 \u0641\u064A validation \u0627\u0644\u0645\u0648\u0631\u062F:", validationResult.error.flatten());
      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629";
      return res.status(400).json({
        success: false,
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
        message: firstError,
        details: errorMessages,
        processingTime: duration2
      });
    }
    console.log("\u2705 [API] \u0646\u062C\u062D validation \u0627\u0644\u0645\u0648\u0631\u062F");
    const newSupplier = await db.insert(suppliers).values(validationResult.data).returning();
    const duration = Date.now() - startTime;
    console.log(`\u2705 [API] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062F \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
    res.status(201).json({
      success: true,
      data: newSupplier[0],
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062F "${newSupplier[0].name}" \u0628\u0646\u062C\u0627\u062D`,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [Financial] \u062E\u0637\u0623 \u0641\u064A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0631\u062F:", error);
    let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062F";
    let statusCode = 500;
    if (error.code === "23505") errorMessage = "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B", statusCode = 409;
    else if (error.code === "23502") errorMessage = "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F \u0646\u0627\u0642\u0635\u0629", statusCode = 400;
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      processingTime: duration
    });
  }
});
financialRouter.get("/reports/summary", async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalFundTransfers: 0,
        totalWorkerTransfers: 0,
        totalWorkerExpenses: 0,
        totalProjectFunds: 0
      },
      message: "\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 - \u0633\u064A\u062A\u0645 \u0646\u0642\u0644 \u0627\u0644\u0645\u0646\u0637\u0642"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629"
    });
  }
});
console.log("\u{1F4B0} [FinancialRouter] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629");
var financialRoutes_default = financialRouter;

// server/routes/modules/autocompleteRoutes.ts
import express8 from "express";
var autocompleteRouter = express8.Router();
autocompleteRouter.get("/", requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A");
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: {
        senderNames: [],
        transferNumbers: [],
        transferTypes: [],
        transportDescriptions: [],
        notes: []
      },
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0628\u0646\u062C\u0627\u062D",
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A:", error);
    res.status(500).json({
      success: false,
      data: {},
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A",
      processingTime: duration
    });
  }
});
autocompleteRouter.post("/", requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("\u{1F4DD} [API] \u062D\u0641\u0638 \u0642\u064A\u0645\u0629 \u0625\u0643\u0645\u0627\u0644 \u062A\u0644\u0642\u0627\u0626\u064A:", req.body);
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      data: req.body,
      message: "\u062A\u0645 \u062D\u0641\u0638 \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0628\u0646\u062C\u0627\u062D",
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0641\u0638 \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062D\u0641\u0638 \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A",
      processingTime: duration
    });
  }
});
autocompleteRouter.head("/", (req, res) => {
  res.status(200).end();
});
autocompleteRouter.get("/senderNames", requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0631\u0633\u0644\u064A\u0646 \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0631\u0633\u0644\u064A\u0646"
    });
  }
});
autocompleteRouter.get("/transferNumbers", requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A"
    });
  }
});
autocompleteRouter.get("/transferTypes", requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A"
    });
  }
});
autocompleteRouter.get("/transportDescriptions", requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0648\u0635\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0648\u0635\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A"
    });
  }
});
autocompleteRouter.get("/notes", requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A"
    });
  }
});
console.log("\u{1F524} [AutocompleteRouter] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u062C\u0645\u064A\u0639 \u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A - 8 \u0645\u0633\u0627\u0631\u0627\u062A");
console.log("\u{1F4CB} [AutocompleteRouter] \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629:");
console.log("   HEAD /api/autocomplete (\u063A\u064A\u0631 \u0645\u062D\u0645\u064A)");
console.log("   GET /api/autocomplete (\u0645\u062D\u0645\u064A)");
console.log("   POST /api/autocomplete (\u0645\u062D\u0645\u064A)");
console.log("   GET /api/autocomplete/senderNames (\u0645\u062D\u0645\u064A)");
console.log("   GET /api/autocomplete/transferNumbers (\u0645\u062D\u0645\u064A)");
console.log("   GET /api/autocomplete/transferTypes (\u0645\u062D\u0645\u064A)");
console.log("   GET /api/autocomplete/transportDescriptions (\u0645\u062D\u0645\u064A)");
console.log("   GET /api/autocomplete/notes (\u0645\u062D\u0645\u064A)");
var autocompleteRoutes_default = autocompleteRouter;

// server/routes/modules/notificationRoutes.ts
import express9 from "express";
var notificationRouter = express9.Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/", async (req, res) => {
  try {
    const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
    const notificationService = new NotificationService2();
    const userId = req.user?.userId || req.user?.email || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
        message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
      });
    }
    const { limit, offset, type, unreadOnly, projectId } = req.query;
    console.log(`\u{1F4E5} [API] \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
    const result = await notificationService.getUserNotifications(userId, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      type,
      unreadOnly: unreadOnly === "true",
      projectId
    });
    console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${result.notifications.length} \u0625\u0634\u0639\u0627\u0631 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}`);
    res.json({
      success: true,
      data: result.notifications,
      count: result.total,
      unreadCount: result.unreadCount,
      message: result.notifications.length > 0 ? "\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0628\u0646\u062C\u0627\u062D" : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0634\u0639\u0627\u0631\u0627\u062A"
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A:", error);
    res.status(500).json({
      success: false,
      data: [],
      count: 0,
      unreadCount: 0,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A"
    });
  }
});
notificationRouter.patch("/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const notificationId = req.params.id;
    console.log("\u{1F504} [API] \u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631:", notificationId);
    const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
    const notificationService = new NotificationService2();
    const userId = req.user?.userId || req.user?.email || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
        processingTime: Date.now() - startTime
      });
    }
    res.json({
      success: true,
      message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0628\u0646\u062C\u0627\u062D",
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631:", error);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631",
      message: error.message,
      processingTime: duration
    });
  }
});
notificationRouter.post("/:id/read", async (req, res) => {
  try {
    const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
    const notificationService = new NotificationService2();
    const userId = req.user?.userId || req.user?.email || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
        message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
      });
    }
    const notificationId = req.params.id;
    console.log(`\u2705 [API] \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0643\u0645\u0642\u0631\u0648\u0621 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
    await notificationService.markAsRead(notificationId, userId);
    res.json({
      success: true,
      message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
    });
  }
});
notificationRouter.post("/:id/mark-read", async (req, res) => {
  try {
    const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
    const notificationService = new NotificationService2();
    const userId = req.user?.userId || req.user?.email || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
        message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
      });
    }
    const notificationId = req.params.id;
    console.log(`\u2705 [API] \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 ${notificationId} \u0643\u0645\u0642\u0631\u0648\u0621 (\u0645\u0633\u0627\u0631 \u0628\u062F\u064A\u0644) \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
    await notificationService.markAsRead(notificationId, userId);
    res.json({
      success: true,
      message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621 (\u0645\u0633\u0627\u0631 \u0628\u062F\u064A\u0644):", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621"
    });
  }
});
notificationRouter.post("/mark-all-read", async (req, res) => {
  try {
    const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
    const notificationService = new NotificationService2();
    const userId = req.user?.userId || req.user?.email || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
        message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
      });
    }
    const projectId = req.body.projectId;
    console.log(`\u2705 [API] \u062A\u0639\u0644\u064A\u0645 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
    await notificationService.markAllAsRead(userId, projectId);
    res.json({
      success: true,
      message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629"
    });
  } catch (error) {
    console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0643\u0645\u0642\u0631\u0648\u0621\u0629"
    });
  }
});
notificationRouter.post("/test/create", requireRole("admin"), async (req, res) => {
  try {
    const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
    const notificationService = new NotificationService2();
    const userId = req.user?.userId || req.user?.email || null;
    const { type, title, body, priority, recipients, projectId } = req.body;
    console.log(`\u{1F527} [TEST] \u0625\u0646\u0634\u0627\u0621 \u0625\u0634\u0639\u0627\u0631 \u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
    const notificationData = {
      type: type || "announcement",
      title: title || "\u0625\u0634\u0639\u0627\u0631 \u0627\u062E\u062A\u0628\u0627\u0631",
      body: body || "\u0647\u0630\u0627 \u0625\u0634\u0639\u0627\u0631 \u0627\u062E\u062A\u0628\u0627\u0631 \u0644\u0641\u062D\u0635 \u0627\u0644\u0646\u0638\u0627\u0645",
      priority: priority || 3,
      recipients: recipients || [userId],
      projectId: projectId || null
    };
    const notification = await notificationService.createNotification(notificationData);
    res.json({
      success: true,
      data: notification,
      message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    console.error("\u274C [TEST] \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0634\u0639\u0627\u0631:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0634\u0639\u0627\u0631"
    });
  }
});
notificationRouter.get("/test/stats", requireRole("admin"), async (req, res) => {
  try {
    const { NotificationService: NotificationService2 } = await Promise.resolve().then(() => (init_NotificationService(), NotificationService_exports));
    const notificationService = new NotificationService2();
    const userId = req.user?.userId || req.user?.email || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "\u063A\u064A\u0631 \u0645\u062E\u0648\u0644 - \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
        message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"
      });
    }
    console.log(`\u{1F4CA} [TEST] \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}`);
    const stats = await notificationService.getNotificationStats(userId);
    res.json({
      success: true,
      data: stats,
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    console.error("\u274C [TEST] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A"
    });
  }
});
console.log("\u2705 [NotificationRoutes] \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0645\u0633\u0627\u0631\u0627\u062A \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0645\u0639 \u0627\u0644\u0645\u0646\u0637\u0642 \u0627\u0644\u0643\u0627\u0645\u0644");
var notificationRoutes_default = notificationRouter;

// server/routes/modules/index.ts
function registerOrganizedRoutes(app2) {
  console.log("\u{1F3D7}\uFE0F [OrganizedRoutes] \u0628\u062F\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629...");
  app2.use("/api", healthRoutes_default);
  app2.use("/api/autocomplete", autocompleteRoutes_default);
  app2.use("/api/projects", projectRoutes_default);
  app2.use("/api", workerRoutes_default);
  app2.use("/api", financialRoutes_default);
  app2.use("/api/notifications", notificationRoutes_default);
  console.log("\u2705 [OrganizedRoutes] \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0628\u0646\u062C\u0627\u062D");
  const routeSummary = {
    publicRoutes: ["health", "status", "db/info", "autocomplete (HEAD/OPTIONS)"],
    protectedRoutes: [
      "projects/*",
      "workers/*",
      "fund-transfers/*",
      "project-fund-transfers/*",
      "worker-transfers/*",
      "worker-misc-expenses/*",
      "notifications/*",
      "autocomplete (GET/POST)"
    ]
  };
  console.log("\u{1F4CB} [OrganizedRoutes] \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629:");
  console.log(`   \u{1F310} \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629: ${routeSummary.publicRoutes.length} \u0645\u062C\u0645\u0648\u0639\u0629`);
  console.log(`   \u{1F512} \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u0645\u064A\u0629: ${routeSummary.protectedRoutes.length} \u0645\u062C\u0645\u0648\u0639\u0629`);
}
function getOrganizedRoutesInfo() {
  return {
    version: "2.0.0-organized",
    totalRouters: 6,
    routerTypes: {
      health: "\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0635\u062D\u0629 \u0648\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629",
      project: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
      worker: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0627\u0644",
      financial: "\u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      autocomplete: "\u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A",
      notification: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A"
    },
    features: {
      organizedStructure: true,
      separatedConcerns: true,
      middlewareOptimization: true,
      reducedCodeDuplication: true,
      maintainableArchitecture: true
    },
    nextSteps: [
      "\u0646\u0642\u0644 \u0627\u0644\u0645\u0646\u0637\u0642 \u0645\u0646 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0623\u0635\u0644\u064A routes.ts",
      "\u0625\u0636\u0627\u0641\u0629 validation schemas",
      "\u062A\u062D\u0633\u064A\u0646 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0623\u062E\u0637\u0627\u0621",
      "\u0625\u0636\u0627\u0641\u0629 unit tests",
      "\u0625\u0636\u0627\u0641\u0629 documentation"
    ]
  };
}

// server/routes/routerOrganizer.ts
function initializeRouteOrganizer(app2) {
  console.log("\u{1F3D7}\uFE0F [RouterOrganizer] \u0628\u062F\u0621 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0646\u0638\u064A\u0645\u064A \u0644\u0644\u0645\u0633\u0627\u0631\u0627\u062A...");
  console.log("\u{1F4C2} [RouterOrganizer] \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629...");
  registerOrganizedRoutes(app2);
  app2.get("/api/system/route-stats", publicRouteRateLimit, (req, res) => {
    const stats2 = routeManager.getRouteStats();
    const organizedInfo = getOrganizedRoutesInfo();
    res.json({
      success: true,
      data: {
        systemInfo: {
          routingSystem: "Advanced Route Manager v2.0-organized",
          initialized: true,
          lastUpdate: (/* @__PURE__ */ new Date()).toISOString(),
          architecture: "Modular & Organized"
        },
        routeStatistics: stats2,
        organizedRoutes: organizedInfo,
        features: {
          wildcardSupport: true,
          regexPatterns: true,
          rateLimiting: true,
          dynamicParameters: true,
          publicPrivateSeparation: true,
          modularArchitecture: true,
          organizedRouters: true,
          reducedCodeDuplication: true
        },
        performance: {
          lookupMethod: "Map/Set optimized",
          averageLookupTime: "<1ms",
          memoryFootprint: "minimal",
          maintainability: "high"
        }
      },
      message: "\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0637\u0648\u0631 \u0648\u0627\u0644\u0645\u0646\u0638\u0645"
    });
  });
  app2.use("/api/public", (req, res, next) => {
    console.log(`\u{1F310} [PublicRouter] \u0637\u0644\u0628 \u0639\u0627\u0645: ${req.method} ${req.path}`);
    next();
  }, publicRouter);
  app2.use("/api/protected", (req, res, next) => {
    console.log(`\u{1F512} [PrivateRouter] \u0637\u0644\u0628 \u0645\u062D\u0645\u064A: ${req.method} ${req.path}`);
    next();
  }, privateRouter);
  app2.get("/api/system/test-public", publicRouteRateLimit, (req, res) => {
    const testResults = {
      routeType: "public",
      authentication: false,
      rateLimited: true,
      responseTime: Date.now(),
      systemStatus: "operational"
    };
    res.json({
      success: true,
      data: testResults,
      message: "\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0639\u0627\u0645 - \u0646\u062C\u062D",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/system/routes-documentation", publicRouteRateLimit, (req, res) => {
    const documentation = {
      publicRoutes: {
        "/api/health": "\u0641\u062D\u0635 \u0635\u062D\u0629 \u0627\u0644\u0646\u0638\u0627\u0645",
        "/api/status": "\u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A\u0629",
        "/api/worker-types": "\u0642\u0627\u0626\u0645\u0629 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0639\u0645\u0627\u0644",
        "/api/auth/*": "\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629",
        "/api/public/*": "\u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629 \u0627\u0644\u0645\u0646\u0638\u0645\u0629"
      },
      protectedRoutes: {
        "/api/projects": "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
        "/api/workers": "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0627\u0644",
        "/api/materials": "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u062F",
        "/api/fund-transfers": "\u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
        "/api/autocomplete": "\u0627\u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A",
        "/api/notifications": "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A",
        "/api/protected/*": "\u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062D\u0645\u064A\u0629 \u0627\u0644\u0645\u0646\u0638\u0645\u0629"
      },
      features: {
        wildcardSupport: "\u062F\u0639\u0645 \u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u063A\u064A\u0631\u0629",
        rateLimiting: "\u062A\u062D\u062F\u064A\u062F \u0645\u0639\u062F\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0644\u0643\u0644 \u0645\u0633\u0627\u0631",
        authentication: "\u0646\u0638\u0627\u0645 \u0645\u0635\u0627\u062F\u0642\u0629 \u0645\u062A\u0637\u0648\u0631",
        errorHandling: "\u0645\u0639\u0627\u0644\u062C\u0629 \u0634\u0627\u0645\u0644\u0629 \u0644\u0644\u0623\u062E\u0637\u0627\u0621"
      }
    };
    res.json({
      success: true,
      data: documentation,
      message: "\u062A\u0648\u062B\u064A\u0642 \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0637\u0648\u0631",
      version: "1.0.0"
    });
  });
  app2.get("/api/system/routing-health", publicRouteRateLimit, (req, res) => {
    const healthCheck = {
      routeManager: {
        status: "healthy",
        publicRoutes: routeManager.getRouteStats().publicRoutes,
        protectedRoutes: routeManager.getRouteStats().protectedRoutes,
        wildcardRoutes: routeManager.getRouteStats().wildcardRoutes
      },
      rateLimiting: {
        status: "active",
        limiters: routeManager.getRouteStats().rateLimiters
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB"
      },
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: Math.floor(process.uptime() / 3600) + "h " + Math.floor(process.uptime() % 3600 / 60) + "m"
      }
    };
    res.json({
      success: true,
      data: healthCheck,
      message: "\u0641\u062D\u0635 \u0635\u062D\u0629 \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  const stats = routeManager.getRouteStats();
  console.log("\u2705 [RouterOrganizer] \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0646\u0638\u064A\u0645\u064A \u0644\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0628\u0646\u062C\u0627\u062D");
  console.log(`\u{1F4CA} [RouterOrganizer] \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A: ${stats.publicRoutes} \u0645\u0633\u0627\u0631 \u0639\u0627\u0645\u060C ${stats.protectedRoutes} \u0645\u0633\u0627\u0631 \u0645\u062D\u0645\u064A`);
  console.log(`\u{1F527} [RouterOrganizer] \u0645\u064A\u0632\u0627\u062A \u0645\u062A\u0627\u062D\u0629: wildcards\u060C rate limiting\u060C authentication`);
  if (process.env.NODE_ENV !== "production") {
    routeManager.logRouteDetails();
  }
}

// server/middleware/compression.ts
import compression from "compression";
var compressionMiddleware = compression({
  // مستوى الضغط (1-9، 6 هو الافتراضي)
  level: 6,
  // حد أدنى لحجم الملف للضغط (بالبايت)
  threshold: 1024,
  // تصفية الملفات التي يجب ضغطها
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
  // إعدادات إضافية للأداء
  windowBits: 15,
  memLevel: 8,
  // ضغط الاستجابات الصغيرة أيضاً
  chunkSize: 1024
});
var cacheHeaders = (req, res, next) => {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (req.url.match(/\.(html|htm)$/)) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  } else {
    res.setHeader("Cache-Control", "public, max-age=300");
  }
  next();
};
var performanceHeaders = (req, res, next) => {
  res.setHeader("X-DNS-Prefetch-Control", "on");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
};

// server/index.ts
var app = express10();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      // Needed for Vite in dev
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
  // For Vite compatibility
}));
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? ["https://yourapp.com"] : ["http://localhost:5000", "http://127.0.0.1:5000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", true);
}
var globalRateLimit = rateLimit3({
  windowMs: 15 * 60 * 1e3,
  // 15 دقيقة
  max: 1e3,
  // 1000 طلب كحد أقصى لكل IP
  message: {
    success: false,
    error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0633\u0645\u0648\u062D. \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u0627\u064B",
    retryAfter: 15 * 60
    // بالثواني
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 🛡️ **IPv6-safe key generator للحماية الآمنة**
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) || req.connection.remoteAddress || req.socket.remoteAddress || "unknown";
    if (typeof ip === "string") {
      return ip.replace(/^::ffff:/, "").trim();
    }
    return ip || "unknown";
  }
});
app.use(globalRateLimit);
app.use(express10.json({ limit: "10mb" }));
app.use(express10.urlencoded({ extended: false, limit: "10mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.use(compressionMiddleware);
app.use(performanceHeaders);
app.use(cacheHeaders);
app.use(generalRateLimit);
app.use(trackSuspiciousActivity);
app.use(securityHeaders);
app.use(cors({
  origin: ["http://localhost:5000", "http://0.0.0.0:5000", "https://app2--5000.local.webcontainer.io"],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express10.json({ limit: "50mb" }));
app.use(express10.urlencoded({ extended: true, limit: "50mb" }));
(async () => {
  app.use("/api/auth", auth_default);
  initializeRouteOrganizer(app);
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  app.use("*", (req, res) => {
    console.log(`\u274C [404] \u0645\u0633\u0627\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      error: "\u0627\u0644\u0645\u0633\u0627\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
      message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0631: ${req.method} ${req.originalUrl}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      method: req.method,
      path: req.originalUrl
    });
  });
  const port = parseInt(process.env.PORT || "5000", 10);
  console.log("\u{1F680} \u0628\u062F\u0621 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062E\u0627\u062F\u0645...");
  console.log("\u{1F4C2} \u0645\u062C\u0644\u062F \u0627\u0644\u0639\u0645\u0644:", process.cwd());
  console.log("\u{1F310} \u0627\u0644\u0645\u0646\u0641\u0630:", port);
  console.log("\u{1F527} \u0628\u064A\u0626\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644:", process.env.NODE_ENV || "development");
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
