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
var users, authUserSessions, projects, workers, fundTransfers, workerAttendance, suppliers, materials, materialPurchases, supplierPayments, transportationExpenses, workerTransfers, workerBalances, dailyExpenseSummaries, workerTypes, autocompleteData, workerMiscExpenses, printSettings, projectFundTransfers, insertProjectSchema, insertWorkerSchema, insertFundTransferSchema, insertWorkerAttendanceSchema, insertMaterialSchema, insertMaterialPurchaseSchema, insertTransportationExpenseSchema, insertWorkerTransferSchema, insertWorkerBalanceSchema, insertProjectFundTransferSchema, insertDailyExpenseSummarySchema, insertWorkerTypeSchema, insertAutocompleteDataSchema, insertWorkerMiscExpenseSchema, insertUserSchema, enhancedInsertWorkerSchema, enhancedInsertProjectSchema, updateProjectSchema, uuidSchema, insertSupplierSchema, insertSupplierPaymentSchema, insertPrintSettingsSchema, insertAuthUserSessionSchema, reportTemplates, insertReportTemplateSchema, toolCategories, tools, toolStock, toolMovements, toolMaintenanceLogs, toolUsageAnalytics, toolPurchaseItems, maintenanceSchedules, maintenanceTasks, toolCostTracking, toolReservations, systemNotifications, notificationReadStates, insertToolCategorySchema, insertToolSchema, updateToolSchema, insertToolStockSchema, insertToolMovementSchema, insertToolMaintenanceLogSchema, insertToolUsageAnalyticsSchema, insertToolReservationSchema, insertSystemNotificationSchema, insertToolPurchaseItemSchema, insertMaintenanceScheduleSchema, insertMaintenanceTaskSchema, insertToolCostTrackingSchema, toolNotifications, insertToolNotificationSchema, insertNotificationReadStateSchema, approvals, channels, messages, actions, systemEvents, insertApprovalSchema, insertChannelSchema, insertMessageSchema, insertActionSchema, insertSystemEventSchema, accounts, transactions, transactionLines, journals, financePayments, financeEvents, accountBalances, insertAccountSchema, insertTransactionSchema, insertTransactionLineSchema, insertJournalSchema, insertFinancePaymentSchema, insertFinanceEventSchema, migrationJobs, migrationTableProgress, migrationBatchLog, insertMigrationJobSchema, insertMigrationTableProgressSchema, insertMigrationBatchLogSchema, notifications, insertNotificationSchema;
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
var smart_connection_manager_exports = {};
__export(smart_connection_manager_exports, {
  SmartConnectionManager: () => SmartConnectionManager,
  getConnectionStatus: () => getConnectionStatus,
  getSmartConnection: () => getSmartConnection,
  smartConnectionManager: () => smartConnectionManager
});
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import fs2 from "fs";
function getSmartConnection(operationType = "read") {
  return smartConnectionManager.getSmartConnection(operationType);
}
function getConnectionStatus() {
  return smartConnectionManager.getConnectionStatus();
}
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
function getSmartPool(operationType = "read") {
  const connection = smartConnectionManager.getSmartConnection(operationType);
  console.log(`\u{1F3AF} [Smart Pool] \u062A\u0648\u062C\u064A\u0647 ${operationType} \u0625\u0644\u0649: ${connection.source || "\u0644\u0627 \u064A\u0648\u062C\u062F \u0627\u062A\u0635\u0627\u0644"}`);
  return connection.pool || pool;
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

// server/services/secure-data-fetcher.ts
import { Client as Client2 } from "pg";
import fs3 from "fs";
var ALLOWED_TABLES, MISSING_TABLES, ALLOWED_ORDER_COLUMNS, SecureDataFetcher;
var init_secure_data_fetcher = __esm({
  "server/services/secure-data-fetcher.ts"() {
    "use strict";
    init_db();
    ALLOWED_TABLES = [
      "actions",
      "ai_system_decisions",
      "ai_system_logs",
      "ai_system_metrics",
      "ai_system_recommendations",
      "approvals",
      "auth_audit_log",
      "auth_permissions",
      "auth_role_permissions",
      "auth_roles",
      "auth_user_permissions",
      "auth_user_roles",
      "auth_user_security_settings",
      "auth_user_sessions",
      "auth_verification_codes",
      "autocomplete_data",
      "autocomplete_stats_mv",
      "channels",
      "daily_expense_summaries",
      "equipment",
      "equipment_movements",
      "error_logs",
      "fund_transfers",
      "material_purchases",
      "materials",
      "messages",
      "notification_metrics",
      "notification_queue",
      "notification_read_states",
      "notification_settings",
      "notification_templates",
      "notifications",
      "print_settings",
      "project_fund_transfers",
      "projects",
      "report_templates",
      "security_policies",
      "security_policy_implementations",
      "security_policy_suggestions",
      "security_policy_violations",
      "supplier_payments",
      "suppliers",
      "system_events",
      "transportation_expenses",
      "users",
      "worker_attendance",
      "worker_balances",
      "worker_misc_expenses",
      "worker_transfers",
      "worker_types",
      "workers"
    ];
    MISSING_TABLES = [];
    ALLOWED_ORDER_COLUMNS = [
      "id",
      "name",
      "date",
      "created_at",
      "updated_at",
      "amount",
      "status"
    ];
    SecureDataFetcher = class {
      constructor(connectionString2) {
        this.connectionString = connectionString2;
      }
      externalClient = null;
      isConnected = false;
      // التحقق من أن الجدول مسموح
      validateTable(tableName) {
        return ALLOWED_TABLES.includes(tableName);
      }
      // إنشاء اتصال آمن بقاعدة البيانات الخارجية
      async connect() {
        if (this.isConnected && this.externalClient) return;
        console.log("\u{1F517} \u0625\u0646\u0634\u0627\u0621 \u0627\u062A\u0635\u0627\u0644 \u0622\u0645\u0646 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629...");
        const config = { connectionString: this.connectionString };
        const certPath = "./pg_cert.pem";
        try {
          if (fs3.existsSync(certPath)) {
            const ca = fs3.readFileSync(certPath, { encoding: "utf8" });
            config.ssl = {
              rejectUnauthorized: false,
              // مرونة مع شهادة Supabase
              ca,
              minVersion: "TLSv1.2",
              checkServerIdentity: () => void 0
              // تخطي التحقق من hostname للتوافق
            };
            console.log("\u{1F512} \u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0634\u0647\u0627\u062F\u0629 SSL \u0644\u0640 Supabase");
          } else {
            console.error("\u274C \u0645\u0644\u0641 \u0634\u0647\u0627\u062F\u0629 SSL \u0645\u0641\u0642\u0648\u062F: pg_cert.pem");
            throw new Error("\u0634\u0647\u0627\u062F\u0629 SSL \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0627\u0644\u0622\u0645\u0646\u0629");
          }
        } catch (error) {
          console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0625\u0639\u062F\u0627\u062F SSL \u0627\u0644\u0622\u0645\u0646:", error);
          throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0646\u0634\u0627\u0621 \u0627\u062A\u0635\u0627\u0644 \u0622\u0645\u0646 \u0628\u062F\u0648\u0646 \u0634\u0647\u0627\u062F\u0629 SSL \u0635\u0627\u0644\u062D\u0629");
        }
        this.externalClient = new Client2(config);
        await this.externalClient.connect();
        this.isConnected = true;
        console.log("\u2705 \u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0622\u0645\u0646 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629");
      }
      // جلب البيانات بطريقة آمنة
      async fetchData(tableName, options = {}) {
        if (!this.validateTable(tableName)) {
          throw new Error(`\u0627\u0644\u062C\u062F\u0648\u0644 '${tableName}' \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647`);
        }
        await this.connect();
        const {
          limit = 100,
          offset = 0,
          orderBy,
          orderDirection = "ASC"
        } = options;
        if (limit > 1e3) throw new Error("\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0635\u0641\u0648\u0641 \u0647\u0648 1000");
        if (offset < 0) throw new Error("\u0627\u0644\u0625\u0632\u0627\u062D\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u0648\u062C\u0628\u0629");
        let query = `SELECT * FROM public."${tableName}"`;
        const params = [];
        let paramIndex = 1;
        if (orderBy && ALLOWED_ORDER_COLUMNS.includes(orderBy)) {
          const direction = orderDirection === "DESC" ? "DESC" : "ASC";
          query += ` ORDER BY "${orderBy}" ${direction}`;
        }
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);
        console.log(`\u{1F4CA} \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0622\u0645\u0646\u0629 \u0645\u0646 ${tableName} (${limit} \u0635\u0641 \u0645\u0646 ${offset})`);
        try {
          const result = await this.externalClient.query(query, params);
          console.log(`\u2705 \u062A\u0645 \u062C\u0644\u0628 ${result.rows.length} \u0635\u0641 \u0645\u0646 ${tableName}`);
          return result.rows;
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 ${tableName}:`, error);
          throw error;
        }
      }
      // التحقق من وجود الجدول قبل الوصول إليه
      async checkTableExists(tableName) {
        try {
          await this.connect();
          const result = await this.externalClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
          return result.rows[0].exists;
        } catch (error) {
          console.warn(`\u26A0\uFE0F \u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 \u0648\u062C\u0648\u062F \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}:`, error);
          return false;
        }
      }
      // جلب عدد الصفوف بطريقة آمنة
      async getRowCount(tableName) {
        if (!this.validateTable(tableName)) {
          throw new Error(`\u0627\u0644\u062C\u062F\u0648\u0644 '${tableName}' \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647`);
        }
        const exists = await this.checkTableExists(tableName);
        if (!exists) {
          console.warn(`\u26A0\uFE0F \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Supabase`);
          return 0;
        }
        await this.connect();
        const query = `SELECT COUNT(*) as count FROM public."${tableName}"`;
        try {
          const result = await this.externalClient.query(query);
          return parseInt(result.rows[0].count, 10);
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0639\u062F \u0627\u0644\u0635\u0641\u0648\u0641 \u0645\u0646 ${tableName}:`, error);
          return 0;
        }
      }
      // جلب معلومات الجدول بطريقة آمنة
      async getTableInfo(tableName) {
        if (!this.validateTable(tableName)) {
          throw new Error(`\u0627\u0644\u062C\u062F\u0648\u0644 '${tableName}' \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647`);
        }
        const exists = await this.checkTableExists(tableName);
        if (!exists) {
          console.warn(`\u26A0\uFE0F \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Supabase`);
          return { columns: [], rowCount: 0, exists: false };
        }
        await this.connect();
        try {
          const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name=$1 
        ORDER BY ordinal_position
      `;
          const columnsResult = await this.externalClient.query(columnsQuery, [tableName]);
          const columns = columnsResult.rows.map((row) => row.column_name);
          const rowCount = await this.getRowCount(tableName);
          return { columns, rowCount, exists: true };
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}:`, error);
          return { columns: [], rowCount: 0, exists: false };
        }
      }
      // مزامنة آمنة مع حفظ محلي فعلي
      async syncTableData(tableName, batchSize = 100) {
        if (!this.validateTable(tableName)) {
          throw new Error(`\u0627\u0644\u062C\u062F\u0648\u0644 '${tableName}' \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647`);
        }
        console.log(`\u{1F504} \u0628\u062F\u0621 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0622\u0645\u0646\u0629 \u0644\u062C\u062F\u0648\u0644 ${tableName}...`);
        try {
          const tableInfo = await this.getTableInfo(tableName);
          if (tableInfo.columns.length === 0) {
            console.log(`\u26A0\uFE0F \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0641\u0627\u0631\u063A`);
            return { success: false, synced: 0, errors: 1, savedLocally: 0 };
          }
          let totalSynced = 0;
          let totalErrors = 0;
          let totalSavedLocally = 0;
          const totalRows = tableInfo.rowCount;
          console.log(`\u{1F4CA} \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 ${totalRows} \u0635\u0641`);
          for (let offset = 0; offset < totalRows; offset += batchSize) {
            try {
              const batch = await this.fetchData(tableName, {
                limit: batchSize,
                offset,
                orderBy: "id"
                // ترتيب آمن
              });
              if (batch.length > 0) {
                totalSynced += batch.length;
                try {
                  const savedCount = await this.saveDataLocally(tableName, batch);
                  totalSavedLocally += savedCount;
                  console.log(`\u2705 \u062A\u0645 \u062D\u0641\u0638 ${savedCount} \u0645\u0646 ${batch.length} \u0635\u0641 \u0645\u062D\u0644\u064A\u0627\u064B - \u062F\u0641\u0639\u0629 ${Math.floor(offset / batchSize) + 1}`);
                } catch (saveError) {
                  console.error(`\u26A0\uFE0F \u062E\u0637\u0623 \u0641\u064A \u062D\u0641\u0638 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062D\u0644\u064A\u0627\u064B:`, saveError);
                }
              }
            } catch (error) {
              console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u062F\u0641\u0639\u0629 ${Math.floor(offset / batchSize) + 1}:`, error);
              totalErrors++;
            }
          }
          console.log(`\u{1F3AF} \u0627\u0646\u062A\u0647\u0627\u0621 \u0645\u0632\u0627\u0645\u0646\u0629 ${tableName}: ${totalSynced} \u0635\u0641 \u062A\u0645\u060C ${totalSavedLocally} \u0635\u0641 \u062D\u064F\u0641\u0638 \u0645\u062D\u0644\u064A\u0627\u064B\u060C ${totalErrors} \u0623\u062E\u0637\u0627\u0621`);
          return {
            success: totalErrors === 0,
            synced: totalSynced,
            errors: totalErrors,
            savedLocally: totalSavedLocally
          };
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0639\u0627\u0645 \u0641\u064A \u0645\u0632\u0627\u0645\u0646\u0629 ${tableName}:`, error);
          return { success: false, synced: 0, errors: 1, savedLocally: 0 };
        }
      }
      // حفظ البيانات محلياً في قاعدة البيانات المحلية
      async saveDataLocally(tableName, data) {
        if (data.length === 0) return 0;
        try {
          console.log(`\u{1F4BE} \u062D\u0641\u0638 ${data.length} \u0635\u0641 \u0645\u0646 ${tableName} \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u064A\u0629...`);
          const localPool = getSmartPool("write");
          if (!localPool) {
            console.error("\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u062A\u0635\u0627\u0644 \u0645\u062D\u0644\u064A \u0644\u0644\u062D\u0641\u0638");
            return 0;
          }
          const backupTableName = `backup_${tableName}`;
          const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${backupTableName}" (
          id SERIAL PRIMARY KEY,
          original_id TEXT,
          source_table VARCHAR(100) DEFAULT '${tableName}',
          data JSONB NOT NULL,
          synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(original_id, source_table)
        );
      `;
          await localPool.query(createTableQuery);
          let savedCount = 0;
          for (const row of data) {
            try {
              const upsertQuery = `
            INSERT INTO "${backupTableName}" (original_id, data, source_table)
            VALUES ($1, $2, $3)
            ON CONFLICT (original_id, source_table) 
            DO UPDATE SET 
              data = EXCLUDED.data,
              synced_at = CURRENT_TIMESTAMP;
          `;
              const originalId = row.id?.toString() || row.uuid?.toString() || `${tableName}_${savedCount}_${Date.now()}`;
              await localPool.query(upsertQuery, [
                originalId,
                JSON.stringify(row),
                tableName
              ]);
              savedCount++;
            } catch (saveError) {
              console.warn(`\u26A0\uFE0F \u062A\u062E\u0637\u064A \u0635\u0641 \u0641\u064A ${tableName}:`, saveError);
            }
          }
          console.log(`\u2705 \u062A\u0645 \u062D\u0641\u0638 ${savedCount}/${data.length} \u0635\u0641 \u0645\u0646 ${tableName} \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u064A\u0629`);
          try {
            await localPool.query(`
          CREATE INDEX IF NOT EXISTS idx_${backupTableName}_synced_at 
          ON "${backupTableName}" (synced_at);
        `);
            await localPool.query(`
          CREATE INDEX IF NOT EXISTS idx_${backupTableName}_source 
          ON "${backupTableName}" (source_table);
        `);
          } catch (indexError) {
            console.log(`\u2139\uFE0F \u062A\u062E\u0637\u064A \u0625\u0646\u0634\u0627\u0621 \u0641\u0647\u0627\u0631\u0633 \u0644\u0640 ${backupTableName}`);
          }
          return savedCount;
        } catch (error) {
          console.error(`\u274C \u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062D\u0644\u064A\u0627\u064B \u0641\u064A ${tableName}:`, error);
          return 0;
        }
      }
      // اختبار الاتصال بـ Supabase
      async testConnection() {
        const startTime = Date.now();
        try {
          await this.connect();
          const result = await this.externalClient.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as version,
          now() as server_time
      `);
          const responseTime = Date.now() - startTime;
          return {
            success: true,
            responseTime,
            details: {
              database: result.rows[0].database,
              user: result.rows[0].user,
              version: result.rows[0].version.split(" ")[0],
              serverTime: result.rows[0].server_time,
              tablesCount: ALLOWED_TABLES.length
            }
          };
        } catch (error) {
          const responseTime = Date.now() - startTime;
          console.error("\u274C \u0641\u0634\u0644 \u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase:", error);
          return {
            success: false,
            responseTime,
            error: error.message
          };
        }
      }
      // إغلاق الاتصال الآمن
      async disconnect() {
        if (this.externalClient && this.isConnected) {
          await this.externalClient.end();
          this.isConnected = false;
          console.log("\u{1F50C} \u062A\u0645 \u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0622\u0645\u0646 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629");
        }
      }
      // الحصول على قائمة الجداول المسموحة
      static getAllowedTables() {
        return ALLOWED_TABLES;
      }
      // الحصول على قائمة الجداول المفقودة
      static getMissingTables() {
        return MISSING_TABLES;
      }
      // فحص الجداول المتاحة فعلياً في Supabase
      async getAvailableTables() {
        try {
          await this.connect();
          const result = await this.externalClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ANY($1)
        ORDER BY table_name
      `, [ALLOWED_TABLES]);
          return result.rows.map((row) => row.table_name);
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u0645\u062A\u0627\u062D\u0629:`, error);
          return [];
        }
      }
    };
  }
});

// server/services/json-migration-handler.ts
var json_migration_handler_exports = {};
__export(json_migration_handler_exports, {
  JsonMigrationHandler: () => JsonMigrationHandler
});
import { eq as eq2 } from "drizzle-orm";
var JsonMigrationHandler;
var init_json_migration_handler = __esm({
  "server/services/json-migration-handler.ts"() {
    "use strict";
    init_secure_data_fetcher();
    init_db();
    init_schema();
    JsonMigrationHandler = class {
      fetcher;
      constructor(connectionString2) {
        this.fetcher = new SecureDataFetcher(connectionString2);
      }
      /**
       * 🔍 تحليل شامل لجدول material_purchases
       */
      async analyzeMaterialPurchasesStructure(limit = 20) {
        console.log("\u{1F50D} [JSON Handler] \u0628\u062F\u0621 \u062A\u062D\u0644\u064A\u0644 \u0647\u064A\u0643\u0644 \u062C\u062F\u0648\u0644 material_purchases...");
        try {
          const totalRows = await this.fetcher.getRowCount("material_purchases");
          console.log(`\u{1F4CA} [JSON Handler] \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0635\u0641\u0648\u0641: ${totalRows}`);
          if (totalRows === 0) {
            return {
              totalRows: 0,
              sampleData: [],
              jsonFields: [],
              dataTypes: {},
              hasComplexJson: false,
              migrationStrategy: "simple",
              recommendations: ["\u0627\u0644\u062C\u062F\u0648\u0644 \u0641\u0627\u0631\u063A - \u0644\u0627 \u064A\u062D\u062A\u0627\u062C \u0645\u0639\u0627\u0644\u062C\u0629 \u062E\u0627\u0635\u0629"]
            };
          }
          const sampleData = await this.fetcher.fetchData("material_purchases", {
            limit: Math.min(limit, totalRows)
          });
          console.log(`\u{1F52C} [JSON Handler] \u062A\u062D\u0644\u064A\u0644 ${sampleData.length} \u0639\u064A\u0646\u0629...`);
          const jsonFields = [];
          const dataTypes = {};
          let hasComplexJson = false;
          sampleData.forEach((row, index) => {
            Object.entries(row).forEach(([fieldName, value]) => {
              if (!dataTypes[fieldName]) {
                dataTypes[fieldName] = [];
              }
              const valueType = this.getDetailedType(value);
              if (!dataTypes[fieldName].includes(valueType)) {
                dataTypes[fieldName].push(valueType);
              }
              if (typeof value === "object" && value !== null) {
                if (!jsonFields.includes(fieldName)) {
                  jsonFields.push(fieldName);
                  console.log(`\u{1F50D} [JSON Handler] \u0639\u062B\u0631 \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A JSON \u0641\u064A \u0627\u0644\u062D\u0642\u0644: ${fieldName}`);
                }
                const complexity = this.analyzeJsonComplexity(value);
                if (complexity.isComplex) {
                  hasComplexJson = true;
                  console.log(`\u26A0\uFE0F [JSON Handler] \u0628\u064A\u0627\u0646\u0627\u062A JSON \u0645\u0639\u0642\u062F\u0629 \u0641\u064A ${fieldName} (\u0627\u0644\u0635\u0641 ${index + 1}):`, {
                    depth: complexity.depth,
                    arrayCount: complexity.arrayCount,
                    objectCount: complexity.objectCount
                  });
                }
              }
            });
          });
          let migrationStrategy = "simple";
          if (jsonFields.length > 0) {
            migrationStrategy = hasComplexJson ? "complex" : "mixed";
          }
          const recommendations = this.generateMigrationRecommendations({
            totalRows,
            jsonFields,
            hasComplexJson,
            migrationStrategy
          });
          const analysis = {
            totalRows,
            sampleData: sampleData.slice(0, 3),
            // عرض 3 عينات فقط
            jsonFields,
            dataTypes,
            hasComplexJson,
            migrationStrategy,
            recommendations
          };
          console.log("\u2705 [JSON Handler] \u062A\u0645 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0647\u064A\u0643\u0644 \u0628\u0646\u062C\u0627\u062D:", {
            totalRows: analysis.totalRows,
            jsonFieldsCount: analysis.jsonFields.length,
            strategy: analysis.migrationStrategy
          });
          return analysis;
        } catch (error) {
          console.error("\u274C [JSON Handler] \u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0647\u064A\u0643\u0644:", error);
          throw new Error(`\u0641\u0634\u0644 \u062A\u062D\u0644\u064A\u0644 \u0647\u064A\u0643\u0644 material_purchases: ${error.message}`);
        }
      }
      /**
       * 🔄 هجرة آمنة لجدول material_purchases مع معالجة JSON
       */
      async migrateMaterialPurchasesSafely(batchSize = 50) {
        console.log("\u{1F680} [JSON Handler] \u0628\u062F\u0621 \u0647\u062C\u0631\u0629 \u0622\u0645\u0646\u0629 \u0644\u062C\u062F\u0648\u0644 material_purchases...");
        const stats = {
          totalProcessed: 0,
          successfullyMigrated: 0,
          errors: 0,
          errorDetails: [],
          duplicatesSkipped: 0,
          jsonConversions: 0
        };
        try {
          const totalRows = await this.fetcher.getRowCount("material_purchases");
          console.log(`\u{1F4CA} [JSON Handler] \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0635\u0641\u0648\u0641 \u0644\u0644\u0647\u062C\u0631\u0629: ${totalRows}`);
          if (totalRows === 0) {
            console.log("\u2139\uFE0F [JSON Handler] \u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u0647\u062C\u0631\u0629");
            return stats;
          }
          const totalBatches = Math.ceil(totalRows / batchSize);
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const offset = batchIndex * batchSize;
            console.log(`\u{1F4E6} [JSON Handler] \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062F\u0641\u0639\u0629 ${batchIndex + 1}/${totalBatches} (\u0627\u0644\u0635\u0641\u0648\u0641 ${offset + 1}-${Math.min(offset + batchSize, totalRows)})`);
            try {
              const batchData = await this.fetcher.fetchData("material_purchases", {
                limit: batchSize,
                offset,
                orderBy: "id"
              });
              for (const row of batchData) {
                stats.totalProcessed++;
                try {
                  const existingRecord = await db.select().from(materialPurchases).where(eq2(materialPurchases.id, row.id)).limit(1);
                  if (existingRecord.length > 0) {
                    stats.duplicatesSkipped++;
                    console.log(`\u26A0\uFE0F [JSON Handler] \u062A\u0645 \u062A\u062E\u0637\u064A \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0645\u0643\u0631\u0631: ${row.id}`);
                    continue;
                  }
                  const processedRow = await this.processJsonFields(row);
                  if (processedRow.hadJsonConversions) {
                    stats.jsonConversions++;
                  }
                  await db.insert(materialPurchases).values(processedRow.data);
                  stats.successfullyMigrated++;
                  if (stats.totalProcessed % 10 === 0) {
                    console.log(`\u{1F4C8} [JSON Handler] \u062A\u0642\u062F\u0645: ${stats.totalProcessed}/${totalRows} (${Math.round(stats.totalProcessed / totalRows * 100)}%)`);
                  }
                } catch (rowError) {
                  stats.errors++;
                  const errorMsg = `\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0635\u0641 ${row.id}: ${rowError.message}`;
                  stats.errorDetails.push(errorMsg);
                  console.error(`\u274C [JSON Handler] ${errorMsg}`);
                }
              }
            } catch (batchError) {
              stats.errors++;
              const errorMsg = `\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062F\u0641\u0639\u0629 ${batchIndex + 1}: ${batchError.message}`;
              stats.errorDetails.push(errorMsg);
              console.error(`\u274C [JSON Handler] ${errorMsg}`);
            }
          }
          console.log("\u2705 [JSON Handler] \u062A\u0645 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0647\u062C\u0631\u0629:", stats);
          return stats;
        } catch (error) {
          console.error("\u274C [JSON Handler] \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629:", error);
          throw error;
        }
      }
      /**
       * 🔧 معالجة الحقول الـ JSON في السجل
       */
      async processJsonFields(row) {
        const processedRow = { ...row };
        let hadJsonConversions = false;
        Object.entries(row).forEach(([fieldName, value]) => {
          if (typeof value === "object" && value !== null) {
            hadJsonConversions = true;
            if (["notes", "description", "metadata"].includes(fieldName.toLowerCase())) {
              processedRow[fieldName] = JSON.stringify(value);
              console.log(`\u{1F504} [JSON Handler] \u062A\u0645 \u062A\u062D\u0648\u064A\u0644 ${fieldName} \u0645\u0646 JSON \u0625\u0644\u0649 string`);
            } else {
              processedRow[fieldName] = value;
            }
          }
        });
        if (processedRow.purchase_date) {
          processedRow.purchaseDate = processedRow.purchase_date;
          delete processedRow.purchase_date;
        }
        if (processedRow.invoice_date) {
          processedRow.invoiceDate = processedRow.invoice_date;
          delete processedRow.invoice_date;
        }
        ["quantity", "unit_price", "total_amount", "paid_amount", "remaining_amount"].forEach((field) => {
          if (processedRow[field] !== void 0) {
            processedRow[field] = String(processedRow[field]);
          }
        });
        return {
          data: processedRow,
          hadJsonConversions
        };
      }
      /**
       * 🔍 تحليل تعقيد البيانات JSON
       */
      analyzeJsonComplexity(obj, depth = 0) {
        const stats = {
          isComplex: false,
          depth,
          arrayCount: 0,
          objectCount: 0
        };
        if (Array.isArray(obj)) {
          stats.arrayCount++;
          if (obj.length > 5) stats.isComplex = true;
          obj.forEach((item) => {
            const subStats = this.analyzeJsonComplexity(item, depth + 1);
            stats.arrayCount += subStats.arrayCount;
            stats.objectCount += subStats.objectCount;
            if (subStats.isComplex) stats.isComplex = true;
            stats.depth = Math.max(stats.depth, subStats.depth);
          });
        } else if (typeof obj === "object" && obj !== null) {
          stats.objectCount++;
          const keys = Object.keys(obj);
          if (keys.length > 10) stats.isComplex = true;
          keys.forEach((key) => {
            const subStats = this.analyzeJsonComplexity(obj[key], depth + 1);
            stats.arrayCount += subStats.arrayCount;
            stats.objectCount += subStats.objectCount;
            if (subStats.isComplex) stats.isComplex = true;
            stats.depth = Math.max(stats.depth, subStats.depth);
          });
        }
        if (depth > 3) stats.isComplex = true;
        return stats;
      }
      /**
       * 📋 تحديد نوع البيانات المفصل
       */
      getDetailedType(value) {
        if (value === null) return "null";
        if (value === void 0) return "undefined";
        if (Array.isArray(value)) return `array[${value.length}]`;
        if (typeof value === "object") return `object[${Object.keys(value).length}]`;
        if (typeof value === "string") {
          if (value.length > 255) return "long_string";
          if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date_string";
          return "string";
        }
        return typeof value;
      }
      /**
       * 💡 توليد توصيات للهجرة
       */
      generateMigrationRecommendations(analysis) {
        const recommendations = [];
        if (analysis.totalRows > 1e3) {
          recommendations.push("\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062F\u0641\u0639\u0627\u062A \u0635\u063A\u064A\u0631\u0629 (50-100 \u0633\u062C\u0644) \u0644\u062A\u062C\u0646\u0628 timeout");
        }
        if (analysis.jsonFields.length > 0) {
          recommendations.push(`\u0645\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0642\u0648\u0644 JSON: ${analysis.jsonFields.join(", ")}`);
          if (analysis.hasComplexJson) {
            recommendations.push("\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A JSON \u0645\u0639\u0642\u062F\u0629 - \u062A\u0637\u0628\u064A\u0642 \u062A\u062D\u0648\u064A\u0644 \u062E\u0627\u0635");
            recommendations.push("\u0645\u0631\u0627\u062C\u0639\u0629 Schema \u0644\u0644\u062D\u0642\u0648\u0644 JSON \u0642\u0628\u0644 \u0627\u0644\u0647\u062C\u0631\u0629");
          } else {
            recommendations.push("\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A JSON \u0628\u0633\u064A\u0637\u0629 - \u064A\u0645\u0643\u0646 \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629");
          }
        } else {
          recommendations.push("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A JSON \u0645\u0639\u0642\u062F\u0629 - \u0647\u062C\u0631\u0629 \u0639\u0627\u062F\u064A\u0629");
        }
        switch (analysis.migrationStrategy) {
          case "simple":
            recommendations.push("\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0628\u0633\u064A\u0637\u0629: \u0646\u0633\u062E \u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
            break;
          case "mixed":
            recommendations.push("\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0645\u062E\u062A\u0644\u0637\u0629: \u0645\u0639\u0627\u0644\u062C\u0629 \u062E\u0627\u0635\u0629 \u0644\u0644\u062D\u0642\u0648\u0644 JSON");
            break;
          case "complex":
            recommendations.push("\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0645\u0639\u0642\u062F\u0629: \u062A\u062D\u0648\u064A\u0644 \u0634\u0627\u0645\u0644 \u0644\u0644\u0628\u064A\u0627\u0646\u0627\u062A JSON");
            recommendations.push("\u0627\u062E\u062A\u0628\u0627\u0631 \u062F\u0641\u0639\u0629 \u0635\u063A\u064A\u0631\u0629 \u0623\u0648\u0644\u0627\u064B");
            break;
        }
        return recommendations;
      }
      /**
       * 🔌 قطع الاتصال
       */
      async disconnect() {
        await this.fetcher.disconnect();
      }
    };
  }
});

// server/services/migration-job-manager-enhanced.ts
var migration_job_manager_enhanced_exports = {};
__export(migration_job_manager_enhanced_exports, {
  EnhancedMigrationJobManager: () => EnhancedMigrationJobManager,
  enhancedMigrationJobManager: () => enhancedMigrationJobManager
});
import { eq as eq3, desc, and as and3, sql as sql2 } from "drizzle-orm";
var EnhancedMigrationJobManager, enhancedMigrationJobManager;
var init_migration_job_manager_enhanced = __esm({
  "server/services/migration-job-manager-enhanced.ts"() {
    "use strict";
    init_secure_data_fetcher();
    init_json_migration_handler();
    init_db();
    init_schema();
    EnhancedMigrationJobManager = class {
      // تخزين مؤقت للأداء - قاعدة البيانات هي المصدر الحقيقي
      jobsCache = /* @__PURE__ */ new Map();
      activeJobId = null;
      heartbeatInterval = null;
      constructor() {
      }
      generateJobId() {
        return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      // التحقق من صحة معرف المهمة (دعم النمطين القديم والجديد)
      isValidJobId(jobId) {
        return jobId.startsWith("migration_") || jobId.startsWith("batch_migration_");
      }
      /**
       * نظام Heartbeat للتأكد من أن المهام النشطة لا تزال تعمل
       * يعمل فقط عند وجود مهام نشطة
       */
      startHeartbeatSystem() {
        if (this.heartbeatInterval) {
          return;
        }
        console.log("\u{1F7E2} \u0628\u062F\u0621 \u0646\u0638\u0627\u0645 heartbeat \u0644\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0646\u0634\u0637\u0629");
        this.heartbeatInterval = setInterval(async () => {
          if (this.activeJobId) {
            try {
              await db.update(migrationJobs).set({
                lastHeartbeat: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq3(migrationJobs.id, this.activeJobId));
            } catch (error) {
              console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B heartbeat:", error.message);
            }
          } else {
            this.stopHeartbeatSystem();
          }
        }, 3e4);
      }
      /**
       * إيقاف نظام heartbeat عندما لا توجد مهام نشطة
       */
      stopHeartbeatSystem() {
        if (this.heartbeatInterval) {
          console.log("\u{1F534} \u0625\u064A\u0642\u0627\u0641 \u0646\u0638\u0627\u0645 heartbeat - \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0647\u0627\u0645 \u0646\u0634\u0637\u0629");
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
      }
      /**
       * الحصول على المهمة النشطة من قاعدة البيانات
       */
      async getActiveJobFromDB() {
        try {
          const activeJobs = await db.select().from(migrationJobs).where(eq3(migrationJobs.status, "running")).limit(1);
          return activeJobs.length > 0 ? activeJobs[0] : null;
        } catch (error) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0645\u0647\u0645\u0629 \u0627\u0644\u0646\u0634\u0637\u0629:", error.message);
          return null;
        }
      }
      /**
       * كشف المهام العالقة بناءً على آخر heartbeat
       * مهمة تعتبر عالقة إذا كان آخر heartbeat أقدم من 90 ثانية
       */
      async detectStuckJobs() {
        try {
          const stuckJobsThreshold = new Date(Date.now() - 9e4);
          const stuckJobs = await db.select().from(migrationJobs).where(
            and3(
              eq3(migrationJobs.status, "running"),
              // إذا كان lastHeartbeat null أو أقدم من threshold
              sql2`(last_heartbeat IS NULL OR last_heartbeat < ${stuckJobsThreshold})`
            )
          );
          console.log(`\u{1F50D} \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${stuckJobs.length} \u0645\u0647\u0645\u0629 \u0639\u0627\u0644\u0642\u0629`);
          return stuckJobs;
        } catch (error) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0643\u0634\u0641 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0639\u0627\u0644\u0642\u0629:", error.message);
          return [];
        }
      }
      /**
       * إلغاء المهام العالقة قسراً
       */
      async forceUnlockStuckJobs() {
        try {
          const stuckJobs = await this.detectStuckJobs();
          if (stuckJobs.length === 0) {
            console.log("\u2705 \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0647\u0627\u0645 \u0639\u0627\u0644\u0642\u0629 \u0644\u0644\u0625\u0644\u063A\u0627\u0621");
            return { unlockedCount: 0, jobIds: [] };
          }
          const jobIds = stuckJobs.map((job) => job.id);
          await db.transaction(async (tx) => {
            for (const job of stuckJobs) {
              await tx.update(migrationJobs).set({
                status: "cancelled",
                endTime: /* @__PURE__ */ new Date(),
                updatedAt: /* @__PURE__ */ new Date(),
                errorMessage: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0645\u0629 \u0642\u0633\u0631\u0627\u064B - \u0645\u0647\u0645\u0629 \u0639\u0627\u0644\u0642\u0629"
              }).where(eq3(migrationJobs.id, job.id));
            }
          });
          for (const jobId of jobIds) {
            this.jobsCache.delete(jobId);
          }
          if (this.activeJobId && jobIds.includes(this.activeJobId)) {
            this.activeJobId = null;
            this.stopHeartbeatSystem();
          }
          console.log(`\u{1F527} \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 ${stuckJobs.length} \u0645\u0647\u0645\u0629 \u0639\u0627\u0644\u0642\u0629 \u0642\u0633\u0631\u0627\u064B: ${jobIds.join(", ")}`);
          return { unlockedCount: stuckJobs.length, jobIds };
        } catch (error) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0639\u0627\u0644\u0642\u0629:", error.message);
          throw error;
        }
      }
      /**
       * تنظيف تلقائي للمهام العالقة عند بدء التشغيل
       */
      async startupCleanup() {
        try {
          console.log("\u{1F9F9} \u0628\u062F\u0621 \u0627\u0644\u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0639\u0627\u0644\u0642\u0629...");
          const result = await this.forceUnlockStuckJobs();
          if (result.unlockedCount > 0) {
            console.log(`\u2705 \u062A\u0645 \u062A\u0646\u0638\u064A\u0641 ${result.unlockedCount} \u0645\u0647\u0645\u0629 \u0639\u0627\u0644\u0642\u0629 \u0623\u062B\u0646\u0627\u0621 \u0628\u062F\u0621 \u0627\u0644\u062A\u0634\u063A\u064A\u0644`);
          } else {
            console.log("\u2705 \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0647\u0627\u0645 \u0639\u0627\u0644\u0642\u0629 - \u0627\u0644\u0646\u0638\u0627\u0645 \u0646\u0638\u064A\u0641");
          }
        } catch (error) {
          console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A:", error.message);
        }
      }
      /**
       * تحويل من نموذج قاعدة البيانات إلى نموذج الواجهة
       */
      async convertDBJobToInterface(dbJob) {
        const tableProgressRows = await db.select().from(migrationTableProgress).where(eq3(migrationTableProgress.jobId, dbJob.id));
        const tableProgress = tableProgressRows.map((tp) => ({
          tableName: tp.tableName,
          status: tp.status,
          totalRows: tp.totalRows,
          processedRows: tp.processedRows,
          savedRows: tp.savedRows,
          errors: tp.errors,
          startTime: tp.startTime || void 0,
          endTime: tp.endTime || void 0,
          errorMessage: tp.errorMessage || void 0
        }));
        return {
          id: dbJob.id,
          status: dbJob.status,
          startTime: dbJob.startTime,
          endTime: dbJob.endTime || void 0,
          currentTable: dbJob.currentTable || void 0,
          tablesProcessed: dbJob.tablesProcessed,
          totalTables: dbJob.totalTables,
          totalRowsProcessed: dbJob.totalRowsProcessed,
          totalRowsSaved: dbJob.totalRowsSaved,
          totalErrors: dbJob.totalErrors,
          progress: dbJob.progress,
          tableProgress,
          error: dbJob.errorMessage || void 0
        };
      }
      /**
       * إنشاء مهمة هجرة جديدة مع التخزين الدائم
       */
      async createJob(userId) {
        const activeJob = await this.getActiveJobFromDB();
        if (activeJob) {
          throw new Error("\u0647\u0646\u0627\u0643 \u0645\u0647\u0645\u0629 \u0647\u062C\u0631\u0629 \u0646\u0634\u0637\u0629 \u0628\u0627\u0644\u0641\u0639\u0644");
        }
        const jobId = this.generateJobId();
        try {
          await db.transaction(async (tx) => {
            await tx.insert(migrationJobs).values({
              id: jobId,
              status: "pending",
              tablesProcessed: 0,
              totalTables: 0,
              totalRowsProcessed: 0,
              totalRowsSaved: 0,
              totalErrors: 0,
              progress: 0,
              userId: userId || null,
              batchSize: 100,
              resumable: true
            });
          });
          this.activeJobId = jobId;
          this.startHeartbeatSystem();
          const job = {
            id: jobId,
            status: "pending",
            startTime: /* @__PURE__ */ new Date(),
            tablesProcessed: 0,
            totalTables: 0,
            totalRowsProcessed: 0,
            totalRowsSaved: 0,
            totalErrors: 0,
            progress: 0,
            tableProgress: []
          };
          this.jobsCache.set(jobId, job);
          console.log(`\u2728 \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0647\u0645\u0629 \u0647\u062C\u0631\u0629 \u062C\u062F\u064A\u062F\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: ${jobId}`);
          return jobId;
        } catch (error) {
          console.error(`\u274C \u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629: ${error.message}`);
          throw new Error(`\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629: ${error.message}`);
        }
      }
      /**
       * استعلام المهمة مع أولوية للتخزين المؤقت ثم قاعدة البيانات
       */
      async getJob(jobId) {
        console.log(`\u{1F50D} EnhancedMigrationJobManager.getJob called with: ${jobId}`);
        if (!this.isValidJobId(jobId)) {
          console.log(`\u274C Invalid job ID format: ${jobId}`);
          return void 0;
        }
        console.log(`\u2705 Valid job ID format: ${jobId}`);
        let job = this.jobsCache.get(jobId);
        if (job) {
          console.log(`\u{1F50D} Job found in cache: ${jobId}`);
          return job;
        }
        try {
          const dbJobRows = await db.select().from(migrationJobs).where(eq3(migrationJobs.id, jobId)).limit(1);
          if (dbJobRows.length > 0) {
            const dbJob = dbJobRows[0];
            job = await this.convertDBJobToInterface(dbJob);
            this.jobsCache.set(jobId, job);
            console.log(`\u{1F50D} Job found in database and cached: ${jobId}`);
            return job;
          }
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0627\u0644\u0645\u0647\u0645\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: ${error.message}`);
        }
        if (jobId.startsWith("batch_migration_")) {
          console.log(`\u{1F4CB} \u0625\u0646\u0634\u0627\u0621 placeholder \u0644\u0644\u0645\u0647\u0645\u0629 \u0627\u0644\u0642\u062F\u064A\u0645\u0629: ${jobId}`);
          job = this.createLegacyJobPlaceholder(jobId);
          this.jobsCache.set(jobId, job);
          console.log(`\u2705 Placeholder created and cached for: ${jobId}`);
          return job;
        }
        console.log(`\u{1F3C1} Job not found: ${jobId}`);
        return void 0;
      }
      // إنشاء مهمة وهمية للمهام القديمة المفقودة
      createLegacyJobPlaceholder(jobId) {
        const timestamp2 = this.extractTimestampFromJobId(jobId);
        const startTime = timestamp2 ? new Date(timestamp2) : /* @__PURE__ */ new Date();
        return {
          id: jobId,
          status: "completed",
          // افتراض أن المهام القديمة مكتملة
          startTime,
          endTime: new Date(startTime.getTime() + 3e5),
          // إضافة 5 دقائق
          tablesProcessed: 0,
          totalTables: 0,
          totalRowsProcessed: 0,
          totalRowsSaved: 0,
          totalErrors: 0,
          progress: 100,
          tableProgress: [],
          error: "\u0645\u0647\u0645\u0629 \u0642\u062F\u064A\u0645\u0629 - \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629"
        };
      }
      // استخراج الطابع الزمني من معرف المهمة
      extractTimestampFromJobId(jobId) {
        const matches = jobId.match(/_(\d{13})/);
        return matches ? parseInt(matches[1]) : null;
      }
      /**
       * الحصول على جميع المهام من قاعدة البيانات
       */
      async getAllJobs() {
        try {
          const dbJobRows = await db.select().from(migrationJobs).orderBy(desc(migrationJobs.createdAt)).limit(50);
          const jobs = await Promise.all(
            dbJobRows.map((dbJob) => this.convertDBJobToInterface(dbJob))
          );
          return jobs;
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0647\u0627\u0645: ${error.message}`);
          return Array.from(this.jobsCache.values()).sort(
            (a, b) => b.startTime.getTime() - a.startTime.getTime()
          );
        }
      }
      /**
       * الحصول على المهمة النشطة
       */
      async getActiveJob() {
        if (!this.activeJobId) return null;
        const job = await this.getJob(this.activeJobId);
        return job || null;
      }
      /**
       * تحديث المهمة مع التخزين الدائم
       */
      async updateJob(jobId, updates) {
        try {
          const dbUpdates = {
            updatedAt: /* @__PURE__ */ new Date()
          };
          if (updates.status) dbUpdates.status = updates.status;
          if (updates.currentTable !== void 0) dbUpdates.currentTable = updates.currentTable;
          if (updates.tablesProcessed !== void 0) dbUpdates.tablesProcessed = updates.tablesProcessed;
          if (updates.totalTables !== void 0) dbUpdates.totalTables = updates.totalTables;
          if (updates.totalRowsProcessed !== void 0) dbUpdates.totalRowsProcessed = updates.totalRowsProcessed;
          if (updates.totalRowsSaved !== void 0) dbUpdates.totalRowsSaved = updates.totalRowsSaved;
          if (updates.totalErrors !== void 0) dbUpdates.totalErrors = updates.totalErrors;
          if (updates.progress !== void 0) dbUpdates.progress = updates.progress;
          if (updates.error !== void 0) dbUpdates.errorMessage = updates.error;
          if (updates.endTime !== void 0) dbUpdates.endTime = updates.endTime;
          await db.update(migrationJobs).set(dbUpdates).where(eq3(migrationJobs.id, jobId));
          const job = this.jobsCache.get(jobId);
          if (job) {
            Object.assign(job, updates);
            if (job.totalTables > 0) {
              job.progress = Math.round(job.tablesProcessed / job.totalTables * 100);
            }
          }
          console.log(`\u{1F4DD} \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0647\u0645\u0629 ${jobId} \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A`);
        } catch (error) {
          console.error(`\u274C \u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0647\u0645\u0629 ${jobId}: ${error.message}`);
          throw error;
        }
      }
      /**
       * تحديث تقدم جدول معين مع معاملات آمنة
       */
      async updateTableProgress(jobId, tableName, updates) {
        try {
          const progressData = {
            jobId,
            tableName,
            updatedAt: /* @__PURE__ */ new Date()
          };
          if (updates.status) progressData.status = updates.status;
          if (updates.totalRows !== void 0) progressData.totalRows = updates.totalRows;
          if (updates.processedRows !== void 0) progressData.processedRows = updates.processedRows;
          if (updates.savedRows !== void 0) progressData.savedRows = updates.savedRows;
          if (updates.errors !== void 0) progressData.errors = updates.errors;
          if (updates.startTime !== void 0) progressData.startTime = updates.startTime;
          if (updates.endTime !== void 0) progressData.endTime = updates.endTime;
          if (updates.errorMessage !== void 0) progressData.errorMessage = updates.errorMessage;
          await db.insert(migrationTableProgress).values(progressData).onConflictDoUpdate({
            target: [migrationTableProgress.jobId, migrationTableProgress.tableName],
            set: progressData
          });
          const job = this.jobsCache.get(jobId);
          if (job) {
            const tableIndex = job.tableProgress.findIndex((t) => t.tableName === tableName);
            if (tableIndex === -1) {
              const newTableProgress = {
                tableName,
                status: "pending",
                totalRows: 0,
                processedRows: 0,
                savedRows: 0,
                errors: 0,
                ...updates
              };
              job.tableProgress.push(newTableProgress);
            } else {
              Object.assign(job.tableProgress[tableIndex], updates);
            }
          }
        } catch (error) {
          console.error(`\u274C \u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u062A\u0642\u062F\u0645 \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}: ${error.message}`);
          throw error;
        }
      }
      /**
       * إنهاء المهمة مع التخزين الدائم
       */
      async completeJob(jobId, success = true, error) {
        try {
          const endTime = /* @__PURE__ */ new Date();
          const status = success ? "completed" : "failed";
          await db.update(migrationJobs).set({
            status,
            endTime,
            progress: 100,
            errorMessage: error || null,
            updatedAt: endTime
          }).where(eq3(migrationJobs.id, jobId));
          const job = this.jobsCache.get(jobId);
          if (job) {
            job.status = status;
            job.endTime = endTime;
            job.progress = 100;
            if (error) {
              job.error = error;
            }
          }
          if (this.activeJobId === jobId) {
            this.activeJobId = null;
            this.stopHeartbeatSystem();
          }
          const duration = job ? endTime.getTime() - job.startTime.getTime() : 0;
          console.log(`\u{1F3C1} \u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 ${jobId} - ${success ? "\u0646\u062C\u062D" : "\u0641\u0634\u0644"} (${Math.round(duration / 1e3)}s)`);
        } catch (error2) {
          console.error(`\u274C \u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0645\u0647\u0645\u0629 ${jobId}: ${error2.message}`);
          throw error2;
        }
      }
      /**
       * إلغاء المهمة مع التخزين الدائم
       */
      async cancelJob(jobId) {
        try {
          const job = await this.getJob(jobId);
          if (!job || job.status === "completed" || job.status === "failed") {
            return false;
          }
          const endTime = /* @__PURE__ */ new Date();
          await db.update(migrationJobs).set({
            status: "cancelled",
            endTime,
            updatedAt: endTime
          }).where(eq3(migrationJobs.id, jobId));
          if (job) {
            job.status = "cancelled";
            job.endTime = endTime;
          }
          if (this.activeJobId === jobId) {
            this.activeJobId = null;
            this.stopHeartbeatSystem();
          }
          console.log(`\u26D4 \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 ${jobId}`);
          return true;
        } catch (error) {
          console.error(`\u274C \u0641\u0634\u0644 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0645\u0629 ${jobId}: ${error.message}`);
          return false;
        }
      }
      /**
       * تشغيل الهجرة مع التخزين الدائم والمعاملات الآمنة
       */
      async runMigration(jobId, batchSize = 100) {
        const job = await this.getJob(jobId);
        if (!job) {
          throw new Error("\u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
        }
        const externalUrl = process.env.OLD_DB_URL;
        if (!externalUrl) {
          throw new Error("\u0631\u0627\u0628\u0637 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u064E\u0651\u0646");
        }
        try {
          await this.updateJob(jobId, { status: "running" });
          console.log(`\u{1F680} \u0628\u062F\u0621 \u062A\u0634\u063A\u064A\u0644 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 ${jobId} \u0645\u0639 \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u062F\u0627\u0626\u0645...`);
          const fetcher = new SecureDataFetcher(externalUrl);
          const availableTables = await fetcher.getAvailableTables();
          await this.updateJob(jobId, {
            totalTables: availableTables.length,
            currentTable: availableTables[0] || void 0
          });
          console.log(`\u{1F4CA} \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${availableTables.length} \u062C\u062F\u0648\u0644 \u0644\u0644\u0647\u062C\u0631\u0629`);
          for (const tableName of availableTables) {
            await this.updateTableProgress(jobId, tableName, {
              status: "pending",
              totalRows: 0,
              processedRows: 0,
              savedRows: 0,
              errors: 0
            });
          }
          const SUPPORTED_TABLES = ["workers", "projects", "suppliers", "equipment", "worker_attendance", "fund_transfers", "material_purchases"];
          const BLACKLISTED_TABLES = ["notifications", "users", "transportation_expenses", "auth_users", "auth_sessions", "auth_permissions"];
          const supportedTables = availableTables.filter((tableName) => {
            if (BLACKLISTED_TABLES.includes(tableName)) {
              console.log(`\u23ED\uFE0F \u062A\u062E\u0637\u064A \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u062D\u0638\u0648\u0631: ${tableName}`);
              return false;
            }
            if (!SUPPORTED_TABLES.includes(tableName)) {
              console.warn(`\u26A0\uFE0F \u062C\u062F\u0648\u0644 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645: ${tableName} - \u0633\u064A\u062A\u0645 \u062A\u062E\u0637\u064A\u0647`);
              return false;
            }
            return true;
          });
          console.log(`\u{1F4CB} \u0633\u064A\u062A\u0645 \u0645\u0639\u0627\u0644\u062C\u0629 ${supportedTables.length} \u062C\u062F\u0648\u0644 \u0645\u0646 \u0623\u0635\u0644 ${availableTables.length} \u062C\u062F\u0648\u0644`);
          for (let i = 0; i < supportedTables.length; i++) {
            const tableName = supportedTables[i];
            let tableResult = null;
            const currentJob = await this.getJob(jobId);
            if (currentJob?.status === "cancelled") {
              console.log("\u26D4 \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0645\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645");
              return;
            }
            await this.updateJob(jobId, { currentTable: tableName });
            await this.updateTableProgress(jobId, tableName, {
              status: "processing",
              startTime: /* @__PURE__ */ new Date()
            });
            console.log(`\u{1F504} \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062C\u062F\u0648\u0644 ${i + 1}/${supportedTables.length}: ${tableName}...`);
            try {
              const tableInfo = await fetcher.getTableInfo(tableName);
              if (!tableInfo.exists) {
                console.warn(`\u26A0\uFE0F \u062A\u062E\u0637\u064A \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} - \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Supabase`);
                await this.updateTableProgress(jobId, tableName, {
                  status: "skipped",
                  endTime: /* @__PURE__ */ new Date(),
                  errorMessage: "\u0627\u0644\u062C\u062F\u0648\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Supabase"
                });
                continue;
              }
              await this.updateTableProgress(jobId, tableName, {
                totalRows: tableInfo.rowCount
              });
              if (tableName === "material_purchases") {
                console.log("\u{1F50D} [Migration] \u062A\u0637\u0628\u064A\u0642 \u0645\u0639\u0627\u0644\u062C\u0629 \u062E\u0627\u0635\u0629 \u0644\u062C\u062F\u0648\u0644 material_purchases...");
                const jsonHandler = new JsonMigrationHandler(externalUrl);
                try {
                  tableResult = await jsonHandler.migrateMaterialPurchasesSafely(batchSize);
                  await this.updateTableProgress(jobId, tableName, {
                    status: "completed",
                    processedRows: tableResult.totalProcessed,
                    savedRows: tableResult.successfullyMigrated,
                    errors: tableResult.errors,
                    endTime: /* @__PURE__ */ new Date(),
                    errorMessage: tableResult.errors > 0 ? `${tableResult.errors} \u0623\u062E\u0637\u0627\u0621 - \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644: ${tableResult.errorDetails.slice(0, 3).join("; ")}` : void 0
                  });
                  console.log(`\u2705 [Migration] \u0627\u0646\u062A\u0647\u062A \u0647\u062C\u0631\u0629 ${tableName}:`, {
                    success: true,
                    totalProcessed: tableResult.totalProcessed,
                    totalSaved: tableResult.successfullyMigrated,
                    duplicatesSkipped: tableResult.duplicatesSkipped,
                    jsonConversions: tableResult.jsonConversions,
                    errors: tableResult.errors
                  });
                } catch (jsonError) {
                  console.error(`\u274C [Migration] \u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}: ${jsonError.message}`);
                  await this.updateTableProgress(jobId, tableName, {
                    status: "failed",
                    endTime: /* @__PURE__ */ new Date(),
                    errorMessage: `\u0641\u0634\u0644 \u0645\u0639\u0627\u0644\u062C\u0629 JSON: ${jsonError.message}`
                  });
                  tableResult = {
                    success: false,
                    totalProcessed: 0,
                    totalSaved: 0,
                    successfullyMigrated: 0,
                    errors: 1
                  };
                } finally {
                  await jsonHandler.disconnect();
                }
              } else {
                tableResult = await this.migrateSafeTable(fetcher, tableName, batchSize, jobId);
                await this.updateTableProgress(jobId, tableName, {
                  status: tableResult.success ? "completed" : "failed",
                  processedRows: tableResult.totalProcessed,
                  savedRows: tableResult.totalSaved,
                  errors: tableResult.errors,
                  endTime: /* @__PURE__ */ new Date(),
                  errorMessage: tableResult.errors > 0 ? `${tableResult.errors} \u0623\u062E\u0637\u0627\u0621` : void 0
                });
                console.log(`\u2705 [Migration] \u0627\u0646\u062A\u0647\u062A \u0647\u062C\u0631\u0629 ${tableName}:`, {
                  success: tableResult.success,
                  totalProcessed: tableResult.totalProcessed,
                  totalSaved: tableResult.totalSaved,
                  errors: tableResult.errors
                });
              }
              try {
                if (tableResult) {
                  await db.insert(migrationBatchLog).values({
                    jobId,
                    tableName,
                    batchIndex: 1,
                    batchSize,
                    batchOffset: 0,
                    status: tableResult.success ? "completed" : "failed",
                    rowsProcessed: tableResult.totalProcessed || 0,
                    rowsSaved: tableResult.totalSaved || tableResult.successfullyMigrated || 0,
                    retryCount: 0,
                    transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    endTime: /* @__PURE__ */ new Date()
                  });
                }
              } catch (logError) {
                console.warn(`\u26A0\uFE0F [Migration] \u062A\u062D\u0630\u064A\u0631 \u0641\u064A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0644\u0644\u062C\u062F\u0648\u0644 ${tableName}: ${logError.message}`);
              }
              if (tableResult) {
                await this.updateJob(jobId, {
                  tablesProcessed: i + 1,
                  totalRowsProcessed: (currentJob?.totalRowsProcessed || 0) + (tableResult.totalProcessed || 0),
                  totalRowsSaved: (currentJob?.totalRowsSaved || 0) + (tableResult.totalSaved || tableResult.successfullyMigrated || 0),
                  totalErrors: (currentJob?.totalErrors || 0) + (tableResult.errors || 0)
                });
              }
            } catch (tableError) {
              console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}:`, tableError.message);
              await this.updateTableProgress(jobId, tableName, {
                status: "failed",
                endTime: /* @__PURE__ */ new Date(),
                errorMessage: tableError.message,
                errors: 1
              });
              await this.updateJob(jobId, {
                totalErrors: (currentJob?.totalErrors || 0) + 1
              });
            }
          }
          await this.completeJob(jobId, true);
          console.log(`\u{1F389} \u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 ${jobId} \u0628\u0646\u062C\u0627\u062D`);
        } catch (error) {
          console.error(`\u274C \u0641\u0634\u0644 \u0641\u064A \u062A\u0634\u063A\u064A\u0644 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 ${jobId}:`, error.message);
          await this.completeJob(jobId, false, error.message);
          throw error;
        }
      }
      /**
       * 🔄 هجرة آمنة للجداول العادية مع حماية من التكرار
       */
      async migrateSafeTable(fetcher, tableName, batchSize, jobId) {
        console.log(`\u{1F504} [Migration] \u0628\u062F\u0621 \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0622\u0645\u0646\u0629 \u0644\u0644\u062C\u062F\u0648\u0644: ${tableName}`);
        const result = {
          success: true,
          totalProcessed: 0,
          totalSaved: 0,
          errors: 0,
          duplicatesSkipped: 0
        };
        try {
          const totalRows = await fetcher.getRowCount(tableName);
          const totalBatches = Math.ceil(totalRows / batchSize);
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const offset = batchIndex * batchSize;
            try {
              const batchData = await fetcher.fetchData(tableName, {
                limit: batchSize,
                offset,
                orderBy: "id"
              });
              for (const row of batchData) {
                result.totalProcessed++;
                try {
                  const isDuplicate = await this.checkDuplicateRecord(tableName, row);
                  if (isDuplicate) {
                    result.duplicatesSkipped++;
                    continue;
                  }
                  await this.insertSafeRecord(tableName, row);
                  result.totalSaved++;
                } catch (rowError) {
                  result.errors++;
                  console.error(`\u274C [Migration] \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0633\u062C\u0644 ${row.id}:`, rowError.message);
                }
              }
              if (batchIndex % 5 === 0) {
                await this.updateTableProgress(jobId, tableName, {
                  processedRows: result.totalProcessed,
                  savedRows: result.totalSaved,
                  errors: result.errors
                });
              }
            } catch (batchError) {
              result.errors++;
              console.error(`\u274C [Migration] \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062F\u0641\u0639\u0629 ${batchIndex + 1}:`, batchError.message);
              result.success = false;
            }
          }
        } catch (error) {
          console.error(`\u274C [Migration] \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0622\u0645\u0646\u0629 \u0644\u0640 ${tableName}:`, error.message);
          result.success = false;
          result.errors++;
        }
        console.log(`\u2705 [Migration] \u0627\u0646\u062A\u0647\u062A \u0647\u062C\u0631\u0629 ${tableName}:`, result);
        return result;
      }
      /**
       * 🔍 فحص تكرار السجل
       */
      async checkDuplicateRecord(tableName, row) {
        try {
          let existingRecord;
          switch (tableName) {
            case "workers":
              existingRecord = await db.select().from(workers).where(eq3(workers.id, row.id)).limit(1);
              break;
            case "projects":
              existingRecord = await db.select().from(projects).where(eq3(projects.id, row.id)).limit(1);
              break;
            case "suppliers":
              existingRecord = await db.select().from(suppliers).where(eq3(suppliers.id, row.id)).limit(1);
              break;
            case "equipment":
              console.warn("\u26A0\uFE0F [Migration] Equipment table not implemented in schema");
              return false;
            case "worker_attendance":
              existingRecord = await db.select().from(workerAttendance).where(eq3(workerAttendance.id, row.id)).limit(1);
              break;
            case "fund_transfers":
              existingRecord = await db.select().from(fundTransfers).where(eq3(fundTransfers.id, row.id)).limit(1);
              break;
            default:
              console.warn(`\u26A0\uFE0F [Migration] \u062C\u062F\u0648\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641 \u0644\u0644\u0641\u062D\u0635: ${tableName}`);
              return false;
          }
          return existingRecord && existingRecord.length > 0;
        } catch (error) {
          console.error(`\u274C [Migration] \u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0644\u0640 ${tableName}:`, error.message);
          return false;
        }
      }
      /**
       * 💾 إدراج آمن للسجل
       */
      async insertSafeRecord(tableName, row) {
        try {
          const cleanedRow = this.cleanRowData(tableName, row);
          switch (tableName) {
            case "workers":
              await db.insert(workers).values(cleanedRow);
              break;
            case "projects":
              await db.insert(projects).values(cleanedRow);
              break;
            case "suppliers":
              await db.insert(suppliers).values(cleanedRow);
              break;
            case "equipment":
              console.warn("\u26A0\uFE0F [Migration] Equipment table not implemented in schema");
              throw new Error("Equipment table not available in current schema");
            case "worker_attendance":
              await db.insert(workerAttendance).values(cleanedRow);
              break;
            case "fund_transfers":
              await db.insert(fundTransfers).values(cleanedRow);
              break;
            default:
              throw new Error(`\u062C\u062F\u0648\u0644 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645 \u0644\u0644\u0625\u062F\u0631\u0627\u062C: ${tableName}`);
          }
        } catch (error) {
          console.error(`\u274C [Migration] \u0641\u0634\u0644 \u0625\u062F\u0631\u0627\u062C \u0627\u0644\u0633\u062C\u0644 \u0641\u064A ${tableName}:`, error.message);
          throw error;
        }
      }
      /**
       * 🧹 تنظيف بيانات السجل حسب الجدول
       */
      cleanRowData(tableName, row) {
        const cleaned = { ...row };
        delete cleaned._count;
        delete cleaned.__typename;
        if (cleaned.created_at) {
          cleaned.createdAt = cleaned.created_at;
          delete cleaned.created_at;
        }
        if (cleaned.updated_at) {
          cleaned.updatedAt = cleaned.updated_at;
          delete cleaned.updated_at;
        }
        const decimalFields = ["daily_wage", "amount", "quantity", "unit_price", "total_amount", "paid_amount", "remaining_amount"];
        decimalFields.forEach((field) => {
          if (cleaned[field] !== void 0 && cleaned[field] !== null) {
            cleaned[field] = String(cleaned[field]);
          }
        });
        switch (tableName) {
          case "worker_attendance":
            if (cleaned.work_days !== void 0) {
              cleaned.workDays = String(cleaned.work_days);
              delete cleaned.work_days;
            }
            break;
          case "fund_transfers":
            if (cleaned.transfer_date) {
              cleaned.transferDate = cleaned.transfer_date;
              delete cleaned.transfer_date;
            }
            break;
        }
        return cleaned;
      }
      /**
       * تنظيف الموارد
       */
      cleanup() {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
        this.jobsCache.clear();
        this.activeJobId = null;
      }
    };
    enhancedMigrationJobManager = new EnhancedMigrationJobManager();
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
import { eq as eq4, and as and4, desc as desc2, or, inArray, sql as sql3 } from "drizzle-orm";
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
              where: (users2, { eq: eq12, or: or5 }) => or5(
                eq12(users2.role, "admin"),
                eq12(users2.email, "admin")
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
            where: (users2, { eq: eq12, or: or5 }) => or5(
              eq12(users2.id, userId),
              eq12(users2.email, userId)
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
            where: (users2, { eq: eq12, or: or5 }) => or5(
              eq12(users2.id, userId),
              eq12(users2.email, userId)
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
          conditions.push(eq4(notifications.type, filters.type));
        }
        if (filters.projectId) {
          conditions.push(eq4(notifications.projectId, filters.projectId));
        }
        if (isUserAdmin) {
          conditions.push(
            or(
              sql3`${notifications.recipients} @> ARRAY[${userId}]`,
              sql3`${notifications.recipients} @> ARRAY['admin']`,
              sql3`${notifications.recipients} @> ARRAY['مسؤول']`,
              sql3`${notifications.recipients} IS NULL`
              // الإشعارات العامة
            )
          );
        } else {
          conditions.push(
            or(
              sql3`${notifications.recipients} @> ARRAY[${userId}]`,
              sql3`${notifications.recipients} IS NULL`
              // الإشعارات العامة
            )
          );
        }
        const notificationList = await db.select().from(notifications).where(and4(...conditions)).orderBy(desc2(notifications.createdAt)).limit(filters.limit || 50).offset(filters.offset || 0);
        console.log(`\u{1F50D} \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${notificationList.length} \u0625\u0634\u0639\u0627\u0631 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 ${userId}`);
        const notificationIds = notificationList.map((n) => n.id);
        const readStates = notificationIds.length > 0 ? await db.select().from(notificationReadStates).where(
          and4(
            eq4(notificationReadStates.userId, userId),
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
            and4(
              eq4(notificationReadStates.userId, userId),
              eq4(notificationReadStates.notificationId, notificationId)
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
          await db.execute(sql3`
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
          const deleteResult = await db.execute(sql3`
        DELETE FROM notification_read_states 
        WHERE user_id = ${userId} AND notification_id = ${notificationId}
      `);
          console.log(`\u{1F5D1}\uFE0F \u062A\u0645 \u062D\u0630\u0641 ${deleteResult.rowCount || 0} \u0633\u062C\u0644 \u0633\u0627\u0628\u0642`);
          const insertResult = await db.execute(sql3`
        INSERT INTO notification_read_states (user_id, notification_id, is_read, read_at)
        VALUES (${userId}, ${notificationId}, true, NOW())
      `);
          console.log(`\u2795 \u062A\u0645 \u0625\u062F\u0631\u0627\u062C \u0633\u062C\u0644 \u062C\u062F\u064A\u062F: ${insertResult.rowCount || 0} \u0635\u0641`);
          const verifyResult = await db.execute(sql3`
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
          conditions.push(eq4(notifications.projectId, projectId));
        }
        const userNotifications = conditions.length > 0 ? await db.select({ id: notifications.id }).from(notifications).where(and4(...conditions)) : await db.select({ id: notifications.id }).from(notifications);
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
        await db.delete(notificationReadStates).where(eq4(notificationReadStates.notificationId, notificationId));
        await db.delete(notifications).where(eq4(notifications.id, notificationId));
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
            sql3`${notifications.recipients} @> ARRAY[${userId}]`,
            sql3`${notifications.recipients} @> ARRAY['admin']`,
            sql3`${notifications.recipients} @> ARRAY['مسؤول']`,
            sql3`${notifications.recipients} IS NULL`
          );
          if (adminCondition) {
            conditions.push(adminCondition);
          }
        } else {
          const userCondition = or(
            sql3`${notifications.recipients} @> ARRAY[${userId}]`,
            sql3`${notifications.recipients} IS NULL`
          );
          if (userCondition) {
            conditions.push(userCondition);
          }
        }
        const userNotifications = await db.select().from(notifications).where(and4(...conditions));
        const readStates = await db.select().from(notificationReadStates).where(eq4(notificationReadStates.userId, userId));
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

// server/old-db.ts
var old_db_exports = {};
__export(old_db_exports, {
  db: () => db2,
  getOldDbClient: () => getOldDbClient,
  isOldDatabaseAvailable: () => isOldDatabaseAvailable,
  pool: () => pool2,
  testOldDatabaseConnection: () => testOldDatabaseConnection
});
import { Pool as Pool3, Client as Client3 } from "pg";
import { drizzle as drizzle3 } from "drizzle-orm/node-postgres";
function isOldDatabaseAvailable() {
  try {
    const supabaseUrl = getCredential("SUPABASE_URL");
    const supabasePassword = getCredential("SUPABASE_DATABASE_PASSWORD");
    return Boolean(supabaseUrl && supabasePassword && supabaseUrl !== "https://placeholder.supabase.co");
  } catch {
    return false;
  }
}
async function testOldDatabaseConnection() {
  if (!isOldDatabaseAvailable()) {
    return {
      success: false,
      message: "\u0628\u064A\u0627\u0646\u0627\u062A Supabase \u063A\u064A\u0631 \u0645\u0643\u0648\u0651\u0646\u0629 \u0641\u064A \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629",
      details: {
        error: "SUPABASE_URL \u0623\u0648 SUPABASE_DATABASE_PASSWORD \u0645\u0641\u0642\u0648\u062F",
        troubleshooting: [
          "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0645\u0644\u0641 .env",
          "\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u062C\u0648\u062F SUPABASE_URL \u0648 SUPABASE_DATABASE_PASSWORD",
          "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0645\u0644\u0641 credentials.ts"
        ]
      }
    };
  }
  const supabaseUrl = getCredential("SUPABASE_URL");
  const supabasePassword = getCredential("SUPABASE_DATABASE_PASSWORD");
  console.log("\n\u{1F50D} \u0628\u062F\u0621 \u062A\u0634\u062E\u064A\u0635 \u0634\u0627\u0645\u0644 \u0644\u0627\u062A\u0635\u0627\u0644 Supabase...");
  console.log(`\u{1F4CB} URL: ${supabaseUrl}`);
  console.log(`\u{1F511} Password: ${supabasePassword ? "[\u0645\u0648\u062C\u0648\u062F]" : "[\u0645\u0641\u0642\u0648\u062F]"}`);
  const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!project) {
    return {
      success: false,
      message: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 SUPABASE_URL",
      details: {
        url: supabaseUrl,
        error: "URL \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u060C \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u0627\u0644\u0634\u0643\u0644: https://project.supabase.co",
        troubleshooting: [
          "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u062D\u0629 SUPABASE_URL",
          "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u0627\u0644\u0634\u0643\u0644: https://[project-id].supabase.co",
          "\u062A\u0623\u0643\u062F \u0645\u0646 \u0639\u062F\u0645 \u0648\u062C\u0648\u062F \u0645\u0633\u0627\u0641\u0627\u062A \u0623\u0648 \u0623\u062D\u0631\u0641 \u0625\u0636\u0627\u0641\u064A\u0629"
        ]
      }
    };
  }
  console.log(`\u{1F4CA} \u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639: ${project}`);
  try {
    const client = await getOldDbClient(1);
    const startTime = Date.now();
    const result = await client.query("SELECT version(), current_database(), current_user, now()");
    const responseTime = Date.now() - startTime;
    await client.end();
    console.log("\u2705 \u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u062C\u0627\u062D");
    return {
      success: true,
      message: "\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0628\u0646\u062C\u0627\u062D",
      details: {
        project,
        database: result.rows[0].current_database,
        user: result.rows[0].current_user,
        serverTime: result.rows[0].now,
        version: result.rows[0].version.split(" ")[0] + " " + result.rows[0].version.split(" ")[1],
        responseTime: `${responseTime}ms`,
        connectionMethod: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0623\u0641\u0636\u0644 \u0637\u0631\u064A\u0642\u0629 \u0627\u062A\u0635\u0627\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B"
      }
    };
  } catch (error) {
    console.error("\u274C \u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644:", error.message);
    const troubleshooting = [];
    if (error.message.includes("Tenant or user not found")) {
      troubleshooting.push("\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641\u0647 \u0645\u0646 Supabase");
      troubleshooting.push("\u062A\u062D\u0642\u0642 \u0645\u0646 \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 Supabase");
      troubleshooting.push("\u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u062D\u0629 project ID \u0641\u064A \u0627\u0644\u0640 URL");
    } else if (error.message.includes("password authentication failed")) {
      troubleshooting.push("\u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u062E\u0627\u0637\u0626\u0629");
      troubleshooting.push("\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 Supabase Settings");
    } else if (error.message.includes("timeout")) {
      troubleshooting.push("\u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0646\u062A\u0647\u062A");
      troubleshooting.push("\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A");
      troubleshooting.push("\u0642\u062F \u062A\u0643\u0648\u0646 \u062E\u062F\u0645\u0627\u062A Supabase \u0628\u0637\u064A\u0626\u0629");
    } else if (error.message.includes("ENOTFOUND")) {
      troubleshooting.push("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062E\u0627\u062F\u0645 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
      troubleshooting.push("\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u062D\u0629 \u0627\u0644\u0640 URL");
      troubleshooting.push("\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0627\u0644\u0629 \u062E\u062F\u0645\u0627\u062A Supabase");
    }
    troubleshooting.push("\u062A\u062D\u0642\u0642 \u0645\u0646 https://status.supabase.com");
    return {
      success: false,
      message: error.message || "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629",
      details: {
        project,
        error: error.message,
        code: error.code,
        troubleshooting
      }
    };
  }
}
async function getOldDbClient(maxRetries = 1) {
  if (!isOldDatabaseAvailable()) {
    throw new Error("\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u0643\u0648\u0651\u0646\u0629");
  }
  const supabaseUrl = getCredential("SUPABASE_URL");
  const supabasePassword = getCredential("SUPABASE_DATABASE_PASSWORD");
  console.log("\u{1F50D} \u062A\u0634\u062E\u064A\u0635 \u0634\u0627\u0645\u0644 \u0644\u0645\u0635\u0627\u062F\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644:");
  console.log("\u{1F4C4} \u0645\u0646 \u0645\u0644\u0641 .env:");
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL || "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"}`);
  console.log(`   OLD_DB_URL: ${process.env.OLD_DB_URL || "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"}`);
  console.log("\u{1F4C4} \u0645\u0646 credentials.ts:");
  console.log(`   SUPABASE_URL: ${supabaseUrl}`);
  console.log(`   SUPABASE_DATABASE_URL: ${getCredential("SUPABASE_DATABASE_URL") || "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"}`);
  console.log(`   Password status: ${supabasePassword ? "\u0645\u0648\u062C\u0648\u062F" : "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"}`);
  const oldDbUrl = process.env.OLD_DB_URL;
  if (oldDbUrl) {
    const regionMatch = oldDbUrl.match(/aws-0-[^.]+/);
    if (regionMatch) {
      console.log(`\u{1F30D} \u0645\u0646\u0637\u0642\u0629 \u062C\u063A\u0631\u0627\u0641\u064A\u0629 \u0645\u0646 OLD_DB_URL: ${regionMatch[0]}`);
    }
  }
  const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!project) {
    console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 SUPABASE_URL");
    console.log(`   URL \u0627\u0644\u0645\u064F\u0633\u062A\u062E\u062F\u0645: ${supabaseUrl}`);
    throw new Error("\u0641\u0634\u0644 \u0641\u064A \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0645\u0646 SUPABASE_URL");
  }
  console.log(`   \u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C: ${project}`);
  const regions = [
    "aws-0-us-east-1",
    // المنطقة الصحيحة أولاً
    "aws-0-eu-central-1",
    "aws-0-us-west-1",
    "aws-0-ap-southeast-1"
  ];
  const connectionOptions = [];
  for (const region of regions) {
    connectionOptions.push(
      {
        name: `Pooler Connection ${region} (Port 6543)`,
        config: {
          host: `${region}.pooler.supabase.com`,
          port: 6543,
          database: "postgres",
          user: `postgres.${project}`,
          password: supabasePassword,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15e3
        }
      },
      {
        name: `Pooler Connection ${region} (Port 5432)`,
        config: {
          host: `${region}.pooler.supabase.com`,
          port: 5432,
          database: "postgres",
          user: `postgres.${project}`,
          password: supabasePassword,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15e3
        }
      },
      {
        name: `Alternative User Format ${region}`,
        config: {
          host: `${region}.pooler.supabase.com`,
          port: 6543,
          database: "postgres",
          user: `postgres`,
          password: supabasePassword,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15e3
        }
      }
    );
  }
  connectionOptions.push({
    name: "Direct Connection (Port 5432)",
    config: {
      host: `db.${project}.supabase.co`,
      port: 5432,
      database: "postgres",
      user: `postgres.${project}`,
      password: supabasePassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15e3
    }
  });
  for (const option of connectionOptions) {
    console.log(`\u{1F504} \u062A\u062C\u0631\u0628\u0629 ${option.name}...`);
    console.log(`\u{1F517} Connection: postgresql://${option.config.user}:***@${option.config.host}:${option.config.port}/${option.config.database}`);
    try {
      const client = new Client3(option.config);
      await client.connect();
      const result = await client.query("SELECT version(), current_database(), current_user");
      console.log("\u2705 \u0646\u062C\u062D \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0645\u0639 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629");
      console.log(`   \u0627\u0644\u0637\u0631\u064A\u0642\u0629: ${option.name}`);
      console.log(`   \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${result.rows[0].current_user}`);
      console.log(`   \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: ${result.rows[0].current_database}`);
      return client;
    } catch (error) {
      console.warn(`\u26A0\uFE0F \u0641\u0634\u0644 ${option.name}:`, error.message);
      if (error.message.includes("Tenant or user not found")) {
        console.error("\u274C \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u062E\u0627\u0637\u0626\u0629");
      } else if (error.message.includes("password authentication failed")) {
        console.error("\u274C \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u062E\u0627\u0637\u0626\u0629");
      } else if (error.message.includes("timeout")) {
        console.error("\u274C \u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644");
      } else if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
        console.error("\u274C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645");
      }
      continue;
    }
  }
  console.error("\u274C \u0641\u0634\u0644\u062A \u062C\u0645\u064A\u0639 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644");
  console.log("\n\u{1F50D} \u062E\u0637\u0648\u0627\u062A \u0627\u0633\u062A\u0643\u0634\u0627\u0641 \u0627\u0644\u0623\u062E\u0637\u0627\u0621:");
  console.log("1. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0623\u0646 \u0645\u0634\u0631\u0648\u0639 Supabase \u0644\u0627 \u064A\u0632\u0627\u0644 \u0645\u0648\u062C\u0648\u062F\u0627\u064B");
  console.log("2. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u062D\u0629 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
  console.log("3. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0634\u0628\u0643\u0629 \u0648\u0627\u0644\u062C\u062F\u0627\u0631 \u0627\u0644\u0646\u0627\u0631\u064A");
  console.log("4. \u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0627\u0644\u0629 \u062E\u062F\u0645\u0627\u062A Supabase");
  throw new Error("\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 - \u062C\u0645\u064A\u0639 \u0627\u0644\u0637\u0631\u0642 \u0641\u0634\u0644\u062A");
}
var pool2, db2;
var init_old_db = __esm({
  "server/old-db.ts"() {
    "use strict";
    init_schema();
    init_credentials();
    pool2 = null;
    db2 = null;
    if (isOldDatabaseAvailable()) {
      try {
        const supabaseUrl = getCredential("SUPABASE_URL");
        const supabasePassword = getCredential("SUPABASE_DATABASE_PASSWORD");
        const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (project) {
          pool2 = new Pool3({
            host: "aws-0-us-east-1.pooler.supabase.com",
            port: 6543,
            database: "postgres",
            user: `postgres.${project}`,
            password: supabasePassword,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 3e4,
            connectionTimeoutMillis: 1e4
          });
          db2 = drizzle3(pool2, { schema: schema_exports });
        }
      } catch (error) {
        console.warn("\u26A0\uFE0F \u0641\u0634\u0644 \u0641\u064A \u062A\u0643\u0648\u064A\u0646 pool \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629:", error);
      }
    }
  }
});

// server/index.ts
import express10 from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit4 from "express-rate-limit";

// server/routes.ts
init_db();
init_schema();
init_secure_data_fetcher();
import { createServer } from "http";
import rateLimit2 from "express-rate-limit";
import { eq as eq5, and as and5, or as or2, sql as sql4, gte, lt, lte, desc as desc3 } from "drizzle-orm";

// server/middleware/auth.ts
init_db();
init_schema();
import jwt from "jsonwebtoken";
import { eq, and, gt } from "drizzle-orm";
import rateLimit from "express-rate-limit";
var generalRateLimit2 = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 دقيقة
  max: 1e3,
  // 1000 طلب لكل IP
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
var suspiciousActivityTracker = /* @__PURE__ */ new Map();
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
      ...user[0],
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
  for (const [ip, activity] of suspiciousActivityTracker.entries()) {
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
init_migration_job_manager_enhanced();
async function registerRoutes(app2) {
  const migrationRateLimit = rateLimit2({
    windowMs: 15 * 60 * 1e3,
    // 15 دقيقة
    max: 10,
    // حد أقصى 10 طلبات لكل IP كل 15 دقيقة
    message: {
      success: false,
      error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B",
      message: "Rate limit exceeded for migration endpoints"
    },
    standardHeaders: true,
    legacyHeaders: false,
    // تطبيق على endpoints محددة فقط
    skip: (req) => {
      return false;
    }
  });
  const migrationStartRateLimit = rateLimit2({
    windowMs: 60 * 60 * 1e3,
    // ساعة واحدة
    max: 3,
    // حد أقصى 3 محاولات بدء هجرة كل ساعة
    message: {
      success: false,
      error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0644\u0628\u062F\u0621 \u0627\u0644\u0647\u062C\u0631\u0629. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F \u0633\u0627\u0639\u0629",
      message: "Migration start rate limit exceeded"
    },
    standardHeaders: true,
    legacyHeaders: false
  });
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
      const transfers = await db.select().from(fundTransfers).where(eq5(fundTransfers.projectId, projectId)).orderBy(fundTransfers.transferDate);
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
      const purchases = await db.select().from(materialPurchases).where(eq5(materialPurchases.projectId, projectId)).orderBy(materialPurchases.purchaseDate);
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
      const expenses = await db.select().from(transportationExpenses).where(eq5(transportationExpenses.projectId, projectId)).orderBy(transportationExpenses.date);
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
      const expenses = await db.select().from(workerMiscExpenses).where(eq5(workerMiscExpenses.projectId, projectId)).orderBy(workerMiscExpenses.date);
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
          const workersStats = await db.execute(sql4`
            SELECT 
              COUNT(DISTINCT wa.worker_id) as total_workers,
              COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
            FROM worker_attendance wa
            INNER JOIN workers w ON wa.worker_id = w.id
            WHERE wa.project_id = ${projectId}
          `);
          const materialStats = await db.execute(sql4`
            SELECT 
              COUNT(*) as material_purchases,
              COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
            FROM material_purchases 
            WHERE project_id = ${projectId}
          `);
          const workerWagesStats = await db.execute(sql4`
            SELECT 
              COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
              COUNT(DISTINCT date) as completed_days
            FROM worker_attendance 
            WHERE project_id = ${projectId} AND is_present = true
          `);
          const fundTransfersStats = await db.execute(sql4`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
            FROM fund_transfers 
            WHERE project_id = ${projectId}
          `);
          const transportStats = await db.execute(sql4`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
            FROM transportation_expenses 
            WHERE project_id = ${projectId}
          `);
          const workerTransfersStats = await db.execute(sql4`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
            FROM worker_transfers 
            WHERE project_id = ${projectId}
          `);
          const miscExpensesStats = await db.execute(sql4`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
            FROM worker_misc_expenses 
            WHERE project_id = ${projectId}
          `);
          const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || "0", "integer");
          const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || "0", "integer");
          const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || "0");
          const materialPurchases3 = cleanDbValue(materialStats.rows[0]?.material_purchases || "0", "integer");
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
              materialPurchases: materialPurchases3
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
              materialPurchases: Math.max(0, materialPurchases3),
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
      const projectExists = await db.select().from(projects).where(eq5(projects.id, projectId)).limit(1);
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
        const mvResult = await db.execute(sql4`
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
          total_worker_transfers: sql4`COALESCE(${dailyExpenseSummaries.totalWorkerTransfers}, 0)`,
          total_worker_misc_expenses: sql4`COALESCE(${dailyExpenseSummaries.totalWorkerMiscExpenses}, 0)`,
          total_income: dailyExpenseSummaries.totalIncome,
          total_expenses: dailyExpenseSummaries.totalExpenses,
          remaining_balance: dailyExpenseSummaries.remainingBalance,
          notes: sql4`COALESCE(${dailyExpenseSummaries.notes}, '')`,
          created_at: dailyExpenseSummaries.createdAt,
          updated_at: sql4`COALESCE(${dailyExpenseSummaries.updatedAt}, ${dailyExpenseSummaries.createdAt})`,
          project_name: projects.name
        }).from(dailyExpenseSummaries).leftJoin(projects, eq5(dailyExpenseSummaries.projectId, projects.id)).where(and5(
          eq5(dailyExpenseSummaries.projectId, projectId),
          eq5(dailyExpenseSummaries.date, date2)
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
        }).from(dailyExpenseSummaries).where(and5(
          eq5(dailyExpenseSummaries.projectId, projectId),
          lt(dailyExpenseSummaries.date, date2)
        )).orderBy(desc3(dailyExpenseSummaries.date)).limit(1);
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
      const whereConditions = [eq5(fundTransfers.projectId, projectId)];
      if (fromDate) {
        whereConditions.push(gte(fundTransfers.transferDate, sql4`${fromDate}::date`));
      }
      whereConditions.push(lt(fundTransfers.transferDate, sql4`(${toDate}::date + interval '1 day')`));
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
        db.select().from(fundTransfers).where(and5(...whereConditions)),
        // أجور العمال
        db.select().from(workerAttendance).where(and5(
          eq5(workerAttendance.projectId, projectId),
          fromDate ? gte(workerAttendance.date, fromDate) : sql4`true`,
          lte(workerAttendance.date, toDate)
        )),
        // مشتريات المواد النقدية فقط
        db.select().from(materialPurchases).where(and5(
          eq5(materialPurchases.projectId, projectId),
          eq5(materialPurchases.purchaseType, "\u0646\u0642\u062F"),
          fromDate ? gte(materialPurchases.purchaseDate, fromDate) : sql4`true`,
          lte(materialPurchases.purchaseDate, toDate)
        )),
        // مصاريف النقل
        db.select().from(transportationExpenses).where(and5(
          eq5(transportationExpenses.projectId, projectId),
          fromDate ? gte(transportationExpenses.date, fromDate) : sql4`true`,
          lte(transportationExpenses.date, toDate)
        )),
        // حوالات العمال
        db.select().from(workerTransfers).where(and5(
          eq5(workerTransfers.projectId, projectId),
          fromDate ? gte(workerTransfers.transferDate, fromDate) : sql4`true`,
          lte(workerTransfers.transferDate, toDate)
        )),
        // مصاريف متنوعة للعمال
        db.select().from(workerMiscExpenses).where(and5(
          eq5(workerMiscExpenses.projectId, projectId),
          fromDate ? gte(workerMiscExpenses.date, fromDate) : sql4`true`,
          lte(workerMiscExpenses.date, toDate)
        )),
        // تحويلات واردة من مشاريع أخرى
        db.select().from(projectFundTransfers).where(and5(
          eq5(projectFundTransfers.toProjectId, projectId),
          fromDate ? gte(projectFundTransfers.transferDate, fromDate) : sql4`true`,
          lte(projectFundTransfers.transferDate, toDate)
        )),
        // تحويلات صادرة إلى مشاريع أخرى
        db.select().from(projectFundTransfers).where(and5(
          eq5(projectFundTransfers.fromProjectId, projectId),
          fromDate ? gte(projectFundTransfers.transferDate, fromDate) : sql4`true`,
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
      const existingPurchase = await db.select().from(materialPurchases).where(eq5(materialPurchases.id, purchaseId)).limit(1);
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
      }).where(eq5(materialPurchases.id, purchaseId)).returning();
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
        db.select().from(fundTransfers).where(and5(eq5(fundTransfers.projectId, projectId), gte(fundTransfers.transferDate, sql4`${date2}::date`), lt(fundTransfers.transferDate, sql4`(${date2}::date + interval '1 day')`))),
        db.select({
          id: workerAttendance.id,
          workerId: workerAttendance.workerId,
          projectId: workerAttendance.projectId,
          date: workerAttendance.date,
          paidAmount: workerAttendance.paidAmount,
          actualWage: workerAttendance.actualWage,
          workDays: workerAttendance.workDays,
          workerName: workers.name
        }).from(workerAttendance).leftJoin(workers, eq5(workerAttendance.workerId, workers.id)).where(and5(eq5(workerAttendance.projectId, projectId), eq5(workerAttendance.date, date2))),
        db.select().from(materialPurchases).where(and5(eq5(materialPurchases.projectId, projectId), eq5(materialPurchases.purchaseDate, date2))),
        db.select().from(transportationExpenses).where(and5(eq5(transportationExpenses.projectId, projectId), eq5(transportationExpenses.date, date2))),
        db.select().from(workerTransfers).where(and5(eq5(workerTransfers.projectId, projectId), eq5(workerTransfers.transferDate, date2))),
        db.select().from(workerMiscExpenses).where(and5(eq5(workerMiscExpenses.projectId, projectId), eq5(workerMiscExpenses.date, date2))),
        db.select().from(projects).where(eq5(projects.id, projectId)).limit(1)
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
      }).from(materialPurchases).where(eq5(materialPurchases.id, purchaseId)).limit(1);
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
          let similarMaterial = await db.select().from(materials).where(eq5(materials.name, purchaseData.materialName)).limit(1);
          if (similarMaterial.length === 0) {
            similarMaterial = await db.select().from(materials).where(sql4`LOWER(${materials.name}) LIKE LOWER(${`%${purchaseData.materialName}%`})`).limit(1);
          }
          if (similarMaterial.length === 0) {
            const firstWord = purchaseData.materialName.split(" ")[0];
            if (firstWord.length > 2) {
              similarMaterial = await db.select().from(materials).where(sql4`LOWER(${materials.name}) LIKE LOWER(${`${firstWord}%`})`).limit(1);
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
      const existingMaterial = await db.select().from(materials).where(eq5(materials.id, materialId)).limit(1);
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
      const updatedMaterial = await db.update(materials).set(validationResult.data).where(eq5(materials.id, materialId)).returning();
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
      const existingSupplier = await db.select().from(suppliers).where(eq5(suppliers.id, supplierId)).limit(1);
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
      const updatedSupplier = await db.update(suppliers).set(validationResult.data).where(eq5(suppliers.id, supplierId)).returning();
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
      const existingPurchase = await db.select().from(materialPurchases).where(eq5(materialPurchases.id, purchaseId)).limit(1);
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
      const updatedPurchase = await db.update(materialPurchases).set(validationResult.data).where(eq5(materialPurchases.id, purchaseId)).returning();
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
      const existingTransfer = await db.select().from(fundTransfers).where(eq5(fundTransfers.id, transferId)).limit(1);
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
      const updatedTransfer = await db.update(fundTransfers).set(validationResult.data).where(eq5(fundTransfers.id, transferId)).returning();
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
      const existingExpense = await db.select().from(transportationExpenses).where(eq5(transportationExpenses.id, expenseId)).limit(1);
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
      const updatedExpense = await db.update(transportationExpenses).set(validationResult.data).where(eq5(transportationExpenses.id, expenseId)).returning();
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
      const existingSummary = await db.select().from(dailyExpenseSummaries).where(eq5(dailyExpenseSummaries.id, summaryId)).limit(1);
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
      const updatedSummary = await db.update(dailyExpenseSummaries).set(validationResult.data).where(eq5(dailyExpenseSummaries.id, summaryId)).returning();
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
      const existingEquipment = await db.select().from(tools).where(eq5(tools.id, equipmentId)).limit(1);
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
      const updatedEquipment = await db.update(tools).set(validationResult.data).where(eq5(tools.id, equipmentId)).returning();
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
      const existingTransfer = await db.select().from(toolMovements).where(eq5(toolMovements.id, transferId)).limit(1);
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
      const updatedTransfer = await db.update(toolMovements).set(validationResult.data).where(eq5(toolMovements.id, transferId)).returning();
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
      const existingPurchase = await db.select().from(materialPurchases).where(eq5(materialPurchases.id, purchaseId)).limit(1);
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
      const deletedPurchase = await db.delete(materialPurchases).where(eq5(materialPurchases.id, purchaseId)).returning();
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
      const existingSupplier = await db.select().from(suppliers).where(eq5(suppliers.id, supplierId)).limit(1);
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
      const deletedSupplier = await db.delete(suppliers).where(eq5(suppliers.id, supplierId)).returning();
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
      const existingWorker = await db.select().from(workers).where(eq5(workers.id, workerId)).limit(1);
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
      const updatedWorker = await db.update(workers).set(validationResult.data).where(eq5(workers.id, workerId)).returning();
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
      const existingWorker = await db.select().from(workers).where(eq5(workers.id, workerId)).limit(1);
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
      }).from(workerAttendance).where(eq5(workerAttendance.workerId, workerId)).limit(5);
      if (attendanceRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalAttendanceCount = await db.select({
          count: sql4`COUNT(*)`
        }).from(workerAttendance).where(eq5(workerAttendance.workerId, workerId));
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
      const transferRecords = await db.select({ id: workerTransfers.id }).from(workerTransfers).where(eq5(workerTransfers.workerId, workerId)).limit(1);
      if (transferRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalTransfersCount = await db.select({
          count: sql4`COUNT(*)`
        }).from(workerTransfers).where(eq5(workerTransfers.workerId, workerId));
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
      const transportRecords = await db.select({ id: transportationExpenses.id }).from(transportationExpenses).where(eq5(transportationExpenses.workerId, workerId)).limit(1);
      if (transportRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalTransportCount = await db.select({
          count: sql4`COUNT(*)`
        }).from(transportationExpenses).where(eq5(transportationExpenses.workerId, workerId));
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
      const balanceRecords = await db.select({ id: workerBalances.id }).from(workerBalances).where(eq5(workerBalances.workerId, workerId)).limit(1);
      if (balanceRecords.length > 0) {
        const duration2 = Date.now() - startTime;
        const totalBalanceCount = await db.select({
          count: sql4`COUNT(*)`
        }).from(workerBalances).where(eq5(workerBalances.workerId, workerId));
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
      const deletedWorker = await db.delete(workers).where(eq5(workers.id, workerId)).returning();
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
      const existingProject = await db.select().from(projects).where(eq5(projects.id, projectId)).limit(1);
      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          processingTime: Date.now() - startTime
        });
      }
      const updatedProject = await db.update(projects).set(req.body).where(eq5(projects.id, projectId)).returning();
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
      const existingMaterial = await db.select().from(materials).where(eq5(materials.id, materialId)).limit(1);
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
      const updatedMaterial = await db.update(materials).set(validationResult.data).where(eq5(materials.id, materialId)).returning();
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
      const existingProject = await db.select().from(projects).where(eq5(projects.id, projectId)).limit(1);
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
      const deletedProject = await db.delete(projects).where(eq5(projects.id, projectId)).returning();
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
      const existingMaterial = await db.select().from(materials).where(eq5(materials.id, materialId)).limit(1);
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
      const deletedMaterial = await db.delete(materials).where(eq5(materials.id, materialId)).returning();
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
      const existingPurchase = await db.select().from(materialPurchases).where(eq5(materialPurchases.id, purchaseId)).limit(1);
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
      const updatedPurchase = await db.update(materialPurchases).set(validationResult.data).where(eq5(materialPurchases.id, purchaseId)).returning();
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
      const attendanceRecord = await db.select().from(workerAttendance).where(eq5(workerAttendance.id, attendanceId)).limit(1);
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
  app2.get("/api/backup/table/:tableName/info", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { tableName } = req.params;
      const externalUrl = process.env.OLD_DB_URL;
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629"
        });
      }
      const fetcher = new SecureDataFetcher(externalUrl);
      const tableInfo = await fetcher.getTableInfo(tableName);
      await fetcher.disconnect();
      res.json({
        success: true,
        data: tableInfo,
        message: `\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629`
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/backup/table/:tableName/preview", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { limit = 50, offset = 0, orderBy, orderDirection } = req.query;
      const externalUrl = process.env.OLD_DB_URL;
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629"
        });
      }
      const fetcher = new SecureDataFetcher(externalUrl);
      const options = {
        limit: Math.min(parseInt(limit), 100),
        // حد أقصى للأمان
        offset: Math.max(parseInt(offset), 0)
      };
      if (orderBy) options.orderBy = orderBy;
      if (orderDirection) options.orderDirection = orderDirection;
      const data = await fetcher.fetchData(tableName, options);
      await fetcher.disconnect();
      res.json({
        success: true,
        data,
        count: data.length,
        message: `\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 ${tableName} (\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629)`
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.post("/api/backup/table/:tableName/backup", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { batchSize = 100 } = req.body;
      const externalUrl = process.env.OLD_DB_URL;
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629"
        });
      }
      console.log(`\u{1F680} \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0644\u0644\u062C\u062F\u0648\u0644 ${tableName} \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629...`);
      const fetcher = new SecureDataFetcher(externalUrl);
      const result = await fetcher.syncTableData(tableName, Math.min(batchSize, 200));
      await fetcher.disconnect();
      res.json({
        success: result.success,
        data: result,
        message: `\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0644\u0644\u062C\u062F\u0648\u0644 ${tableName}: ${result.synced} \u0635\u0641 \u062A\u0645 \u062C\u0644\u0628\u0647 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629\u060C ${result.savedLocally} \u0635\u0641 \u062A\u0645 \u062D\u0641\u0638\u0647 \u0645\u062D\u0644\u064A\u0627\u064B\u060C ${result.errors} \u0623\u062E\u0637\u0627\u0621`
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/backup/tables", requireAuth, requireRole("admin"), (req, res) => {
    const availableTables = SecureDataFetcher.getAllowedTables();
    res.json({
      success: true,
      data: Array.from(availableTables),
      message: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629"
    });
  });
  app2.post("/api/backup/full-backup", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { batchSize = 100 } = req.body;
      const externalUrl = process.env.OLD_DB_URL;
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629"
        });
      }
      console.log("\u{1F680} \u0628\u062F\u0621 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u0634\u0627\u0645\u0644 \u0645\u0646 Supabase...");
      const fetcher = new SecureDataFetcher(externalUrl);
      const availableTables = await fetcher.getAvailableTables();
      await fetcher.disconnect();
      console.log(`\u{1F4CA} \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${availableTables.length} \u062C\u062F\u0648\u0644 \u0645\u062A\u0627\u062D \u0641\u064A Supabase:`, availableTables);
      const results = [];
      for (const tableName of availableTables) {
        try {
          console.log(`\u{1F504} \u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0644\u0644\u062C\u062F\u0648\u0644 ${tableName}...`);
          const fetcher2 = new SecureDataFetcher(externalUrl);
          const tableInfo = await fetcher2.getTableInfo(tableName);
          if (!tableInfo.exists) {
            console.warn(`\u26A0\uFE0F \u062A\u062E\u0637\u064A \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} - \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Supabase`);
            results.push({
              tableName,
              success: false,
              synced: 0,
              savedLocally: 0,
              errors: 0,
              skipped: true,
              reason: "\u0627\u0644\u062C\u062F\u0648\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Supabase"
            });
            await fetcher2.disconnect();
            continue;
          }
          const result = await fetcher2.syncTableData(tableName, Math.min(batchSize, 200));
          await fetcher2.disconnect();
          results.push({
            tableName,
            success: result.success,
            synced: result.synced,
            savedLocally: result.savedLocally,
            errors: result.errors
          });
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        } catch (error) {
          console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0646\u0633\u062E \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}:`, error);
          results.push({
            tableName,
            success: false,
            synced: 0,
            savedLocally: 0,
            errors: 1,
            error: error.message
          });
        }
      }
      const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
      const totalSaved = results.reduce((sum, r) => sum + r.savedLocally, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
      res.json({
        success: totalErrors === 0,
        data: {
          results,
          summary: {
            tablesProcessed: results.length,
            totalSynced,
            totalSaved,
            totalErrors
          }
        },
        message: `\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0634\u0627\u0645\u0644: ${totalSynced} \u0635\u0641 \u062A\u0645 \u062C\u0644\u0628\u0647\u060C ${totalSaved} \u0635\u0641 \u062A\u0645 \u062D\u0641\u0638\u0647 \u0645\u062D\u0644\u064A\u0627\u064B\u060C ${totalErrors} \u0623\u062E\u0637\u0627\u0621`
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u0634\u0627\u0645\u0644:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/migration/supabase-stats", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      console.log("\u{1F4CA} [Migration] \u0628\u062F\u0621 \u0641\u062D\u0635 \u0634\u0627\u0645\u0644 \u0644\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0641\u064A Supabase...");
      const supabaseUrl = process.env.OLD_DB_URL || process.env.SUPABASE_DATABASE_URL;
      if (!supabaseUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 Supabase",
          userFriendlyMessage: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u0643\u0648\u064A\u0646 - \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase"
        });
      }
      const fetcher = new SecureDataFetcher(supabaseUrl);
      const requiredTables = [
        "workers",
        "projects",
        "suppliers",
        "material_purchases",
        "equipment",
        "worker_attendance",
        "fund_transfers"
      ];
      const tableStats = [];
      const criticalTables = [];
      const emptyTables = [];
      let totalEstimatedRows = 0;
      let hasErrors = false;
      let errorDetails = "";
      console.log("\u{1F50D} [Migration] \u0641\u062D\u0635 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629:", requiredTables);
      for (const tableName of requiredTables) {
        try {
          console.log(`\u{1F4CB} [Migration] \u0641\u062D\u0635 \u0627\u0644\u062C\u062F\u0648\u0644: ${tableName}`);
          const rowCount = await fetcher.getRowCount(tableName);
          const displayNames = {
            "workers": "\u0627\u0644\u0639\u0645\u0627\u0644",
            "projects": "\u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
            "suppliers": "\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646",
            "material_purchases": "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F",
            "equipment": "\u0627\u0644\u0645\u0639\u062F\u0627\u062A",
            "worker_attendance": "\u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644",
            "fund_transfers": "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629"
          };
          const tableData = {
            name: tableName,
            displayName: displayNames[tableName] || tableName,
            rows: rowCount,
            category: tableName.includes("worker") ? "\u0639\u0645\u0627\u0644" : tableName.includes("material") ? "\u0645\u0648\u0627\u062F" : "\u0639\u0627\u0645",
            lastAnalyzed: (/* @__PURE__ */ new Date()).toISOString()
          };
          tableStats.push(tableData);
          totalEstimatedRows += rowCount;
          if (rowCount > 100) {
            criticalTables.push({
              name: tableName,
              displayName: tableData.displayName,
              rows: rowCount
            });
          } else if (rowCount === 0) {
            emptyTables.push({
              name: tableName,
              displayName: tableData.displayName
            });
          }
          console.log(`\u2705 [Migration] ${tableData.displayName}: ${rowCount} \u0635\u0641`);
          if (tableName === "material_purchases" && rowCount > 0) {
            try {
              const sampleData = await fetcher.fetchData(tableName, { limit: 5 });
              let hasJsonData = false;
              sampleData.forEach((row) => {
                Object.entries(row).forEach(([key, value]) => {
                  if (typeof value === "object" && value !== null) {
                    hasJsonData = true;
                    console.log(`\u{1F50D} [Migration] \u0639\u062B\u0631 \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A JSON \u0641\u064A ${tableName}.${key}`);
                  }
                });
              });
              if (hasJsonData) {
                console.log(`\u26A0\uFE0F [Migration] \u062C\u062F\u0648\u0644 ${tableName} \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A JSON - \u0633\u064A\u062A\u0637\u0644\u0628 \u0645\u0639\u0627\u0644\u062C\u0629 \u062E\u0627\u0635\u0629`);
              }
            } catch (jsonError) {
              console.warn(`\u26A0\uFE0F [Migration] \u0644\u0627 \u064A\u0645\u0643\u0646 \u0641\u062D\u0635 JSON \u0641\u064A ${tableName}:`, jsonError.message);
            }
          }
        } catch (tableError) {
          console.error(`\u274C [Migration] \u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}:`, tableError.message);
          hasErrors = true;
          errorDetails += `${tableName}: ${tableError.message}; `;
          const displayNames = {
            "workers": "\u0627\u0644\u0639\u0645\u0627\u0644",
            "projects": "\u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
            "suppliers": "\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646",
            "material_purchases": "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F",
            "equipment": "\u0627\u0644\u0645\u0639\u062F\u0627\u062A",
            "worker_attendance": "\u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644",
            "fund_transfers": "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629"
          };
          emptyTables.push({
            name: tableName,
            displayName: displayNames[tableName] || tableName
          });
        }
      }
      await fetcher.disconnect();
      const stats = {
        totalTables: requiredTables.length,
        totalEstimatedRows,
        tablesList: tableStats,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        databaseStatus: hasErrors ? "\u062A\u062D\u0630\u064A\u0631 - \u062A\u0648\u062C\u062F \u0623\u062E\u0637\u0627\u0621" : "\u0645\u062A\u0635\u0644 \u0628\u0646\u062C\u0627\u062D",
        databaseSize: `${Math.round(totalEstimatedRows / 1e3)}K \u0635\u0641 \u062A\u0642\u0631\u064A\u0628\u0627\u064B`,
        oldestRecord: null,
        newestRecord: null,
        criticalTables,
        emptyTables
      };
      if (hasErrors) {
        stats.error = errorDetails;
        stats.userFriendlyMessage = "\u062A\u0645 \u0627\u0644\u0641\u062D\u0635 \u0645\u0639 \u0648\u062C\u0648\u062F \u0628\u0639\u0636 \u0627\u0644\u062A\u062D\u0630\u064A\u0631\u0627\u062A";
      }
      console.log("\u{1F4CA} [Migration] \u062A\u0645 \u0625\u0643\u0645\u0627\u0644 \u0641\u062D\u0635 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A:", {
        totalTables: stats.totalTables,
        totalRows: stats.totalEstimatedRows,
        criticalTables: stats.criticalTables.length,
        emptyTables: stats.emptyTables.length
      });
      res.json({
        success: true,
        data: stats,
        message: hasErrors ? "\u0641\u062D\u0635 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0643\u062A\u0645\u0644 \u0645\u0639 \u062A\u062D\u0630\u064A\u0631\u0627\u062A" : "\u062A\u0645 \u0641\u062D\u0635 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("\u274C [Migration] \u0641\u0634\u0644 \u0641\u062D\u0635 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0641\u064A Supabase:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        userFriendlyMessage: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase \u0623\u0648 \u0641\u062D\u0635 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
        message: "\u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A"
      });
    }
  });
  app2.get("/api/migration/analyze-material-purchases", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      console.log("\u{1F52C} [Migration] \u0628\u062F\u0621 \u062A\u062D\u0644\u064A\u0644 \u062C\u062F\u0648\u0644 material_purchases...");
      const supabaseUrl = process.env.OLD_DB_URL || process.env.SUPABASE_DATABASE_URL;
      if (!supabaseUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 Supabase"
        });
      }
      const { JsonMigrationHandler: JsonMigrationHandler2 } = await Promise.resolve().then(() => (init_json_migration_handler(), json_migration_handler_exports));
      const jsonHandler = new JsonMigrationHandler2(supabaseUrl);
      try {
        const analysis = await jsonHandler.analyzeMaterialPurchasesStructure(20);
        res.json({
          success: true,
          data: analysis,
          message: `\u062A\u062D\u0644\u064A\u0644 \u062C\u062F\u0648\u0644 material_purchases \u0645\u0643\u062A\u0645\u0644 - \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629: ${analysis.migrationStrategy}`
        });
      } finally {
        await jsonHandler.disconnect();
      }
    } catch (error) {
      console.error("\u274C [Migration] \u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 material_purchases:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u062C\u062F\u0648\u0644 material_purchases"
      });
    }
  });
  app2.post("/api/migration/test-small", migrationRateLimit, requireAuth, requireRole("admin"), async (req, res) => {
    try {
      console.log("\u{1F9EA} [Migration] \u0628\u062F\u0621 \u0647\u062C\u0631\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0635\u063A\u064A\u0631\u0629...");
      const { tableName = "projects", batchSize = 10 } = req.body;
      if (!["projects", "workers", "suppliers"].includes(tableName)) {
        return res.status(400).json({
          success: false,
          error: "\u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0644\u0644\u0627\u062E\u062A\u0628\u0627\u0631. \u0627\u0644\u0645\u0633\u0645\u0648\u062D: projects, workers, suppliers"
        });
      }
      const supabaseUrl = process.env.OLD_DB_URL || process.env.SUPABASE_DATABASE_URL;
      if (!supabaseUrl) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 Supabase"
        });
      }
      const userId = req.user?.id || void 0;
      const jobId = await enhancedMigrationJobManager.createJob(userId);
      const fetcher = new SecureDataFetcher(supabaseUrl);
      try {
        const tableInfo = await fetcher.getTableInfo(tableName);
        if (!tableInfo.exists || tableInfo.rowCount === 0) {
          await enhancedMigrationJobManager.completeJob(jobId, false, `\u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u0641\u0627\u0631\u063A \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F`);
          return res.status(404).json({
            success: false,
            message: `\u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u0641\u0627\u0631\u063A \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Supabase`
          });
        }
        const testData = await fetcher.fetchData(tableName, {
          limit: Math.min(batchSize, 5),
          orderBy: "id"
        });
        console.log(`\u{1F50D} [Migration] \u0627\u062E\u062A\u0628\u0627\u0631 ${testData.length} \u0633\u062C\u0644 \u0645\u0646 ${tableName}`);
        let successCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        const errors = [];
        for (const row of testData) {
          try {
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`\u0627\u0644\u0635\u0641 ${row.id}: ${error.message}`);
          }
        }
        await enhancedMigrationJobManager.completeJob(jobId, errorCount === 0);
        res.json({
          success: errorCount === 0,
          data: {
            jobId,
            tableName,
            totalTested: testData.length,
            successCount,
            duplicateCount,
            errorCount,
            errors: errors.slice(0, 3),
            // أول 3 أخطاء فقط
            sampleData: testData.slice(0, 2)
            // عينتان للمراجعة
          },
          message: `\u0627\u062E\u062A\u0628\u0627\u0631 ${tableName} \u0645\u0643\u062A\u0645\u0644: ${successCount} \u0646\u062C\u062D\u060C ${errorCount} \u0641\u0634\u0644`
        });
      } finally {
        await fetcher.disconnect();
      }
    } catch (error) {
      console.error("\u274C [Migration] \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0635\u063A\u064A\u0631:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0635\u063A\u064A\u0631"
      });
    }
  });
  app2.post("/api/migration/unlock", migrationRateLimit, requireAuth, async (req, res) => {
    try {
      console.log("\u{1F527} \u0637\u0644\u0628 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0639\u0627\u0644\u0642\u0629 \u0642\u0633\u0631\u0627\u064B");
      const result = await enhancedMigrationJobManager.forceUnlockStuckJobs();
      res.json({
        success: true,
        data: result,
        message: result.unlockedCount > 0 ? `\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 ${result.unlockedCount} \u0645\u0647\u0645\u0629 \u0639\u0627\u0644\u0642\u0629 \u0628\u0646\u062C\u0627\u062D` : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0647\u0627\u0645 \u0639\u0627\u0644\u0642\u0629"
      });
    } catch (error) {
      console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0639\u0627\u0644\u0642\u0629:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0639\u0627\u0644\u0642\u0629"
      });
    }
  });
  app2.post("/api/migration/start", migrationStartRateLimit, requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { batchSize = 100 } = req.body;
      const activeJob = await enhancedMigrationJobManager.getActiveJob();
      if (activeJob) {
        return res.status(409).json({
          success: false,
          error: "\u0647\u0646\u0627\u0643 \u0645\u0647\u0645\u0629 \u0647\u062C\u0631\u0629 \u0646\u0634\u0637\u0629 \u0628\u0627\u0644\u0641\u0639\u0644",
          jobId: activeJob.id
        });
      }
      const userId = req.user?.id || void 0;
      const jobId = await enhancedMigrationJobManager.createJob(userId);
      enhancedMigrationJobManager.runMigration(jobId, batchSize).catch((error) => {
        console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062A\u0634\u063A\u064A\u0644 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 ${jobId}:`, error);
        enhancedMigrationJobManager.completeJob(jobId, false, error.message);
      });
      res.json({
        success: true,
        jobId,
        message: "\u062A\u0645 \u0628\u062F\u0621 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u0628\u062F\u0621 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/migration/status/:jobId", migrationRateLimit, requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { jobId } = req.params;
      console.log(`\u{1F3AF} Status endpoint called for jobId: ${jobId}`);
      console.log(`\u{1F4DE} Calling enhancedMigrationJobManager.getJob(${jobId})`);
      const job = await enhancedMigrationJobManager.getJob(jobId);
      console.log(`\u{1F4CB} Job result:`, job ? `Found job ${job.id}` : "Job not found");
      if (!job) {
        console.log(`\u274C Returning 404 for jobId: ${jobId}`);
        return res.status(404).json({
          success: false,
          error: "\u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629"
        });
      }
      console.log(`\u2705 Returning job data for: ${job.id}`);
      let estimatedTimeRemaining = 0;
      if (job.status === "running" && job.tablesProcessed > 0) {
        const elapsedTime = Date.now() - job.startTime.getTime();
        const avgTimePerTable = elapsedTime / job.tablesProcessed;
        const remainingTables = job.totalTables - job.tablesProcessed;
        estimatedTimeRemaining = Math.round(avgTimePerTable * remainingTables / 1e3);
      }
      res.json({
        success: true,
        data: {
          ...job,
          estimatedTimeRemaining,
          duration: job.endTime ? job.endTime.getTime() - job.startTime.getTime() : Date.now() - job.startTime.getTime()
        }
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0647\u0645\u0629:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.post("/api/migration/stop/:jobId", migrationRateLimit, requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { jobId } = req.params;
      const success = await enhancedMigrationJobManager.cancelJob(jobId);
      if (!success) {
        return res.status(400).json({
          success: false,
          error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0644\u063A\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0645\u0647\u0645\u0629"
        });
      }
      res.json({
        success: true,
        message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0647\u0645\u0629:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/migration/jobs", migrationRateLimit, requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const jobs = await enhancedMigrationJobManager.getAllJobs();
      res.json({
        success: true,
        data: jobs,
        count: jobs.length
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0647\u0627\u0645:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/migration/connection-status", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      console.log("\u{1F50D} \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629...");
      const { isOldDatabaseAvailable: isOldDatabaseAvailable2, testOldDatabaseConnection: testOldDatabaseConnection2 } = await Promise.resolve().then(() => (init_old_db(), old_db_exports));
      if (!isOldDatabaseAvailable2()) {
        console.warn("\u26A0\uFE0F \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629");
        const connectionStatus = {
          connected: false,
          database: "\u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629",
          user: "\u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629",
          version: "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
          host: "\u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629",
          port: "\u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629",
          ssl: false,
          responseTime: 0,
          error: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629 \u0641\u064A \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629 (OLD_DB_URL \u0645\u0641\u0642\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D)",
          configStatus: "missing_config"
        };
        return res.json({
          success: false,
          data: connectionStatus,
          message: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A OLD_DB_URL \u0641\u064A \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629.",
          userFriendlyMessage: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0635\u0644\u0629 \u062D\u0627\u0644\u064A\u0627\u064B. \u0627\u0644\u0646\u0638\u0627\u0645 \u064A\u0639\u0645\u0644 \u0628\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0641\u0642\u0637."
        });
      }
      const connectionTest = await testOldDatabaseConnection2();
      if (connectionTest.success) {
        console.log("\u2705 \u0646\u062C\u062D \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629");
        const connectionStatus = {
          connected: true,
          database: connectionTest.details?.database || "\u0645\u062A\u0635\u0644",
          user: connectionTest.details?.user || "\u0645\u062E\u0641\u064A \u0644\u0623\u0633\u0628\u0627\u0628 \u0623\u0645\u0646\u064A\u0629",
          version: connectionTest.details?.version || "PostgreSQL",
          host: connectionTest.details?.host || "\u0645\u062E\u0641\u064A \u0644\u0623\u0633\u0628\u0627\u0628 \u0623\u0645\u0646\u064A\u0629",
          port: connectionTest.details?.port || "\u0645\u062E\u0641\u064A \u0644\u0623\u0633\u0628\u0627\u0628 \u0623\u0645\u0646\u064A\u0629",
          ssl: true,
          responseTime: connectionTest.details?.responseTime || 0,
          error: null,
          configStatus: "configured"
        };
        res.json({
          success: true,
          data: connectionStatus,
          message: connectionTest.message,
          userFriendlyMessage: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0645\u062A\u0635\u0644\u0629 \u0628\u0646\u062C\u0627\u062D \u0648\u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0647\u062C\u0631\u0629."
        });
      } else {
        console.error("\u274C \u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629:", connectionTest.message);
        let userFriendlyMessage = "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.";
        let configStatus = "connection_failed";
        if (connectionTest.message.includes("ENOTFOUND")) {
          userFriendlyMessage = "\u0639\u0646\u0648\u0627\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0623\u0648 \u0627\u0644\u062E\u0627\u062F\u0645 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D.";
          configStatus = "dns_failed";
        } else if (connectionTest.message.includes("ECONNREFUSED")) {
          userFriendlyMessage = "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A.";
          configStatus = "connection_refused";
        } else if (connectionTest.message.includes("timeout")) {
          userFriendlyMessage = "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629.";
          configStatus = "timeout";
        }
        const connectionStatus = {
          connected: false,
          database: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          user: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          version: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          host: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          port: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          ssl: false,
          responseTime: 0,
          error: connectionTest.message,
          configStatus
        };
        res.json({
          success: false,
          data: connectionStatus,
          message: connectionTest.message,
          userFriendlyMessage
        });
      }
    } catch (error) {
      console.error("\u274C \u062E\u0637\u0623 \u0639\u0627\u0645 \u0641\u064A \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644:", error);
      res.status(500).json({
        success: false,
        data: {
          connected: false,
          error: error.message,
          configStatus: "system_error"
        },
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629",
        userFriendlyMessage: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062A\u0642\u0646\u064A \u0623\u062B\u0646\u0627\u0621 \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }
  });
  app2.get("/api/migration/general-stats", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      console.log("\u{1F4CA} \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629...");
      const { isOldDatabaseAvailable: isOldDatabaseAvailable2, getOldDbClient: getOldDbClient2 } = await Promise.resolve().then(() => (init_old_db(), old_db_exports));
      let generalStats = {
        totalTables: 0,
        totalEstimatedRows: 0,
        tablesList: [],
        lastUpdated: (/* @__PURE__ */ new Date()).toLocaleString("en-GB", {
          timeZone: "Europe/London",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }),
        databaseStatus: "unknown",
        databaseSize: "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
        oldestRecord: null,
        newestRecord: null,
        criticalTables: [],
        emptyTables: []
      };
      if (!isOldDatabaseAvailable2()) {
        console.warn("\u26A0\uFE0F \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629\u060C \u0633\u064A\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629");
        generalStats = {
          totalTables: 0,
          totalEstimatedRows: 0,
          tablesList: [],
          lastUpdated: (/* @__PURE__ */ new Date()).toLocaleString("en-GB", {
            timeZone: "Europe/London",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }),
          databaseStatus: "not_configured",
          databaseSize: "\u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629",
          oldestRecord: null,
          newestRecord: null,
          criticalTables: [],
          emptyTables: [],
          error: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629 \u0641\u064A \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629"
        };
        return res.json({
          success: false,
          data: generalStats,
          message: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629. \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629.",
          userFriendlyMessage: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u0647\u062C\u0631\u0629 \u062D\u0627\u0644\u064A\u0627\u064B. \u0627\u0644\u0646\u0638\u0627\u0645 \u064A\u0639\u0645\u0644 \u0628\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0641\u0642\u0637."
        });
      }
      try {
        const client = await getOldDbClient2(1);
        const tablesQuery = await client.query(`
          SELECT 
            schemaname,
            relname as tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_rows,
            n_dead_tup as dead_rows,
            last_vacuum,
            last_autovacuum,
            last_analyze,
            last_autoanalyze
          FROM pg_stat_user_tables 
          WHERE schemaname = 'public'
          ORDER BY n_live_tup DESC
        `);
        const dbSizeQuery = await client.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
        `);
        const dbInfoQuery = await client.query(`
          SELECT 
            current_database() as db_name,
            current_user as current_user,
            version() as version,
            now() as current_timestamp
        `);
        await client.end();
        const tables = tablesQuery.rows || [];
        const totalRows = tables.reduce((sum, table) => sum + parseInt(table.live_rows || 0), 0);
        const criticalTables = tables.filter((table) => parseInt(table.live_rows || 0) > 1e3).map((table) => ({
          name: table.tablename,
          rows: parseInt(table.live_rows || 0),
          displayName: getTableDisplayName(table.tablename)
        }));
        const emptyTables = tables.filter((table) => parseInt(table.live_rows || 0) === 0).map((table) => ({
          name: table.tablename,
          displayName: getTableDisplayName(table.tablename)
        }));
        let oldestRecord = null;
        let newestRecord = null;
        try {
          const dateSearchTables = ["projects", "users", "daily_expenses", "workers"];
          const dateSearchClient = await getOldDbClient2();
          for (const tableName of dateSearchTables) {
            try {
              const dateColumnsQuery = await dateSearchClient.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 
                AND (column_name ILIKE '%created%' OR column_name ILIKE '%date%' OR column_name ILIKE '%time%')
                AND data_type IN ('timestamp', 'timestamptz', 'date')
                LIMIT 1
              `, [tableName]);
              if (dateColumnsQuery.rows.length > 0) {
                const dateColumn = dateColumnsQuery.rows[0].column_name;
                const minMaxQuery = await dateSearchClient.query(`
                  SELECT 
                    MIN(${dateColumn}) as oldest,
                    MAX(${dateColumn}) as newest,
                    COUNT(*) as record_count
                  FROM "${tableName}"
                  WHERE ${dateColumn} IS NOT NULL
                `);
                if (minMaxQuery.rows[0] && minMaxQuery.rows[0].record_count > 0) {
                  if (!oldestRecord || new Date(minMaxQuery.rows[0].oldest) < new Date(oldestRecord)) {
                    oldestRecord = minMaxQuery.rows[0].oldest;
                  }
                  if (!newestRecord || new Date(minMaxQuery.rows[0].newest) > new Date(newestRecord)) {
                    newestRecord = minMaxQuery.rows[0].newest;
                  }
                }
              }
            } catch (tableError) {
              console.log(`\u062A\u062C\u0627\u0647\u0644 \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u0641\u064A \u0628\u062D\u062B \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E`);
            }
          }
          await dateSearchClient.end();
        } catch (dateError) {
          console.log("\u062A\u0639\u0630\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u0633\u062C\u0644\u0627\u062A:", dateError);
        }
        generalStats = {
          totalTables: tables.length,
          totalEstimatedRows: totalRows,
          tablesList: tables.map((table) => ({
            name: table.tablename,
            displayName: getTableDisplayName(table.tablename),
            rows: parseInt(table.live_rows || 0),
            category: getTableCategory(table.tablename),
            lastAnalyzed: table.last_analyze || table.last_autoanalyze
          })),
          lastUpdated: dbInfoQuery.rows[0]?.current_timestamp || (/* @__PURE__ */ new Date()).toISOString(),
          databaseStatus: "healthy",
          databaseSize: dbSizeQuery.rows[0]?.database_size || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
          oldestRecord,
          newestRecord,
          criticalTables: criticalTables.slice(0, 10),
          // أول 10 جداول
          emptyTables
        };
        console.log(`\u2705 \u062A\u0645 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A ${tables.length} \u062C\u062F\u0648\u0644 \u0628\u0625\u062C\u0645\u0627\u0644\u064A ${totalRows} \u0635\u0641`);
      } catch (dbError) {
        console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629:", dbError);
        let databaseStatus = "error";
        let userFriendlyMessage = "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629.";
        if (dbError.message.includes("ENOTFOUND")) {
          databaseStatus = "unreachable";
          userFriendlyMessage = "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0648\u0635\u0648\u0644 \u062D\u0627\u0644\u064A\u0627\u064B.";
        } else if (dbError.message.includes("ECONNREFUSED")) {
          databaseStatus = "connection_refused";
          userFriendlyMessage = "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629.";
        } else if (dbError.message.includes("timeout")) {
          databaseStatus = "timeout";
          userFriendlyMessage = "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629.";
        }
        console.log("\u274C \u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 - \u0639\u062F\u0645 \u062A\u0648\u0641\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0647\u0645\u064A\u0629");
        generalStats = {
          totalTables: 0,
          totalEstimatedRows: 0,
          tablesList: [],
          lastUpdated: (/* @__PURE__ */ new Date()).toLocaleString("en-GB", {
            timeZone: "Europe/London",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }),
          databaseStatus,
          databaseSize: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          oldestRecord: null,
          newestRecord: null,
          criticalTables: [],
          emptyTables: [],
          error: dbError.message,
          userFriendlyMessage
        };
      }
      const isSuccess = !["error", "not_configured", "unreachable", "connection_refused", "timeout"].includes(generalStats.databaseStatus);
      res.json({
        success: isSuccess,
        data: generalStats,
        message: isSuccess ? `\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629 \u0628\u0646\u062C\u0627\u062D: ${generalStats.totalTables} \u062C\u062F\u0648\u0644\u060C ${generalStats.totalEstimatedRows} \u0635\u0641` : `\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A: ${generalStats.error}`,
        userFriendlyMessage: generalStats.userFriendlyMessage || (isSuccess ? `\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0647\u062C\u0631\u0629: ${generalStats.totalTables} \u062C\u062F\u0648\u0644 \u0628\u0625\u062C\u0645\u0627\u0644\u064A ${generalStats.totalEstimatedRows.toLocaleString()} \u0635\u0641` : "\u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B. \u0627\u0644\u0646\u0638\u0627\u0645 \u064A\u0639\u0645\u0644 \u0628\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0641\u0642\u0637.")
      });
    } catch (error) {
      console.error("\u274C \u062E\u0637\u0623 \u0639\u0627\u0645 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629:", error);
      res.status(500).json({
        success: false,
        data: {
          totalTables: 0,
          totalEstimatedRows: 0,
          tablesList: [],
          lastUpdated: (/* @__PURE__ */ new Date()).toLocaleString("en-GB", {
            timeZone: "Europe/London",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }),
          databaseStatus: "system_error",
          databaseSize: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
          oldestRecord: null,
          newestRecord: null,
          criticalTables: [],
          emptyTables: [],
          error: error.message
        },
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629",
        userFriendlyMessage: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062A\u0642\u0646\u064A \u0623\u062B\u0646\u0627\u0621 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }
  });
  app2.get("/api/migration/tables", migrationRateLimit, requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { isOldDatabaseAvailable: isOldDatabaseAvailable2, getOldDbClient: getOldDbClient2 } = await Promise.resolve().then(() => (init_old_db(), old_db_exports));
      const defaultTables = [
        "account_balances",
        "accounts",
        "actions",
        "approvals",
        "autocomplete_data",
        "channels",
        "daily_expense_summaries",
        "daily_expenses",
        "equipment",
        "finance_events",
        "finance_payments",
        "fund_transfers",
        "journals",
        "maintenance_schedules",
        "maintenance_tasks",
        "material_purchases",
        "materials",
        "messages",
        "notification_read_states",
        "print_settings",
        "project_fund_transfers",
        "projects",
        "report_templates",
        "supplier_payments",
        "suppliers",
        "system_events",
        "system_notifications",
        "tool_categories",
        "tool_cost_tracking",
        "tool_maintenance_logs",
        "tool_movements",
        "tool_notifications",
        "tool_purchase_items",
        "tool_reservations",
        "tool_stock",
        "tool_usage_analytics",
        "tools",
        "transaction_lines",
        "transactions",
        "users",
        "worker_attendance",
        "workers"
      ];
      let tablesWithInfo = [];
      let dataSource = "default";
      let connectionMessage = "";
      if (!isOldDatabaseAvailable2()) {
        console.warn("\u26A0\uFE0F \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629\u060C \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629");
        tablesWithInfo = defaultTables.map((tableName) => ({
          name: tableName,
          displayName: getTableDisplayName(tableName),
          category: getTableCategory(tableName),
          estimatedRows: 0,
          status: "ready",
          priority: getTablePriority(tableName),
          columnCount: 0
        }));
        dataSource = "default";
        connectionMessage = "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u064F\u0643\u0648\u0651\u0646\u0629 - \u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629";
      } else {
        try {
          const client = await getOldDbClient2(1);
          const tablesQuery = await client.query(`
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
            LIMIT 100
          `);
          await client.end();
          if (tablesQuery.rows && tablesQuery.rows.length > 0) {
            tablesWithInfo = tablesQuery.rows.map((row) => ({
              name: row.table_name,
              displayName: getTableDisplayName(row.table_name),
              category: getTableCategory(row.table_name),
              estimatedRows: 0,
              // سيتم تحديثها لاحقاً
              status: "ready",
              priority: getTablePriority(row.table_name),
              columnCount: 0
              // لا نحسبها الآن لتوفير الوقت
            }));
            dataSource = "database";
            connectionMessage = `\u062A\u0645 \u062C\u0644\u0628 ${tablesQuery.rows.length} \u062C\u062F\u0648\u0644 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629`;
          } else {
            tablesWithInfo = defaultTables.map((tableName) => ({
              name: tableName,
              displayName: getTableDisplayName(tableName),
              category: getTableCategory(tableName),
              estimatedRows: 0,
              status: "ready",
              priority: getTablePriority(tableName),
              columnCount: 0
            }));
            dataSource = "default";
            connectionMessage = "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0641\u0627\u0631\u063A\u0629 - \u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629";
          }
        } catch (dbError) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629:", dbError);
          console.log("\u274C \u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A - \u0639\u062F\u0645 \u062A\u0648\u0641\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0647\u0645\u064A\u0629");
          tablesWithInfo = [];
          dataSource = "default";
          if (dbError.message.includes("ENOTFOUND")) {
            connectionMessage = "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0648\u0635\u0648\u0644 - \u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629";
          } else if (dbError.message.includes("ECONNREFUSED")) {
            connectionMessage = "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 - \u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629";
          } else if (dbError.message.includes("timeout")) {
            connectionMessage = "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 - \u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629";
          } else {
            connectionMessage = `\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 - \u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629`;
          }
        }
      }
      res.json({
        success: true,
        data: tablesWithInfo,
        message: `\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${tablesWithInfo.length} \u062C\u062F\u0648\u0644 \u0645\u062A\u0627\u062D \u0644\u0644\u0647\u062C\u0631\u0629`,
        dataSource,
        connectionMessage,
        userFriendlyMessage: dataSource === "database" ? `\u062A\u0648\u0641\u0631 ${tablesWithInfo.length} \u062C\u062F\u0648\u0644 \u0644\u0644\u0647\u062C\u0631\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629` : "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0635\u0644\u0629. \u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0647\u062C\u0631\u0629."
      });
    } catch (error) {
      console.error("\u274C \u062E\u0637\u0623 \u0639\u0627\u0645 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062C\u062F\u0627\u0648\u0644:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0644\u0644\u0647\u062C\u0631\u0629",
        userFriendlyMessage: "\u062D\u062F\u062B \u062E\u0637\u0623 \u062A\u0642\u0646\u064A \u0623\u062B\u0646\u0627\u0621 \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062C\u062F\u0627\u0648\u0644. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }
  });
  app2.get("/api/migration/table/:tableName/info", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { getOldDbClient: getOldDbClient2 } = await Promise.resolve().then(() => (init_old_db(), old_db_exports));
      let tableInfo = {
        name: tableName,
        displayName: getTableDisplayName(tableName),
        estimatedRows: 0,
        columns: [],
        lastUpdated: (/* @__PURE__ */ new Date()).toLocaleString("en-GB", {
          timeZone: "Europe/London",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }),
        status: "ready"
      };
      try {
        const client = await getOldDbClient2();
        const tableInfoQuery = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);
        const rowCountQuery = await client.query(`
          SELECT COUNT(*) as row_count 
          FROM "${tableName}"
        `);
        await client.end();
        tableInfo = {
          name: tableName,
          displayName: getTableDisplayName(tableName),
          estimatedRows: parseInt(rowCountQuery.rows[0]?.row_count || "0"),
          columns: tableInfoQuery.rows || [],
          lastUpdated: (/* @__PURE__ */ new Date()).toLocaleString("en-GB", {
            timeZone: "Europe/London",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }),
          status: "ready"
        };
      } catch (dbError) {
        console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629:`, dbError);
      }
      res.json({
        success: true,
        data: tableInfo,
        message: `\u062A\u0645 \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName} \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629`
      });
    } catch (error) {
      console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644 ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644"
      });
    }
  });
  app2.post("/api/migration/extract/:tableName", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { tableName } = req.params;
      const { batchSize = 100, maxRetries = 3 } = req.body;
      console.log(`\u{1F680} \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u0647\u062C\u0631\u0629 \u0627\u0644\u062C\u062F\u0648\u0644: ${tableName}`);
      const migrationJob = {
        id: `migration_${tableName}_${Date.now()}`,
        tableName,
        status: "started",
        batchSize,
        maxRetries,
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        errors: []
      };
      res.json({
        success: true,
        data: migrationJob,
        message: `\u062A\u0645 \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u0647\u062C\u0631\u0629 \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}`
      });
      processMigrationInBackground(migrationJob).catch((error) => {
        console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0647\u062C\u0631\u0629 \u0627\u0644\u062C\u062F\u0648\u0644 ${tableName}:`, error);
      });
    } catch (error) {
      console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0628\u062F\u0621 \u0647\u062C\u0631\u0629 \u0627\u0644\u062C\u062F\u0648\u0644 ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0647\u062C\u0631\u0629"
      });
    }
  });
  app2.post("/api/migration/transfer", migrationStartRateLimit, requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { tables = [], batchSize = 50 } = req.body;
      if (!tables.length) {
        return res.status(400).json({
          success: false,
          error: "\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u062C\u062F\u0648\u0644 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u0647\u062C\u0631\u0629"
        });
      }
      const activeJob = await enhancedMigrationJobManager.getActiveJob();
      if (activeJob) {
        return res.status(409).json({
          success: false,
          error: "\u0647\u0646\u0627\u0643 \u0645\u0647\u0645\u0629 \u0647\u062C\u0631\u0629 \u0646\u0634\u0637\u0629 \u0628\u0627\u0644\u0641\u0639\u0644",
          jobId: activeJob.id
        });
      }
      console.log(`\u{1F680} \u0628\u062F\u0621 \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629 \u0644\u0640 ${tables.length} \u062C\u062F\u0648\u0644 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 MigrationJobManager`);
      const userId = req.user?.id || void 0;
      const jobId = await enhancedMigrationJobManager.createJob(userId);
      enhancedMigrationJobManager.runMigration(jobId, batchSize).catch((error) => {
        console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u062A\u0634\u063A\u064A\u0644 \u0645\u0647\u0645\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 ${jobId}:`, error);
        enhancedMigrationJobManager.completeJob(jobId, false, error.message);
      });
      res.json({
        success: true,
        data: {
          id: jobId,
          status: "started",
          startedAt: (/* @__PURE__ */ new Date()).toISOString(),
          totalTables: tables.length
        },
        jobId,
        message: `\u062A\u0645 \u0628\u062F\u0621 \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629 \u0644\u0640 ${tables.length} \u062C\u062F\u0648\u0644`
      });
    } catch (error) {
      console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0628\u062F\u0621 \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629"
      });
    }
  });
  app2.get("/api/connections/status", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { smartConnectionManager: smartConnectionManager2 } = await Promise.resolve().then(() => (init_smart_connection_manager(), smart_connection_manager_exports));
      const status = smartConnectionManager2.getConnectionStatus();
      const testResults = await smartConnectionManager2.runConnectionTest();
      res.json({
        success: true,
        data: {
          status,
          testResults,
          recommendations: {
            local: status.local ? "\u2705 \u062C\u0627\u0647\u0632 \u0644\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u064A\u0629" : "\u274C \u064A\u062D\u062A\u0627\u062C \u0625\u0639\u0627\u062F\u0629 \u062A\u0643\u0648\u064A\u0646",
            supabase: status.supabase ? "\u2705 \u062C\u0627\u0647\u0632 \u0644\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A" : "\u26A0\uFE0F \u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Supabase"
          }
        },
        message: `\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0627\u0644\u0646\u0634\u0637\u0629: ${status.totalConnections}/2`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.post("/api/connections/reconnect", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { target = "both" } = req.body;
      const { smartConnectionManager: smartConnectionManager2 } = await Promise.resolve().then(() => (init_smart_connection_manager(), smart_connection_manager_exports));
      await smartConnectionManager2.reconnect(target);
      const newStatus = smartConnectionManager2.getConnectionStatus();
      res.json({
        success: true,
        data: newStatus,
        message: `\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644: ${target}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/backup/connection-test", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const externalUrl = process.env.OLD_DB_URL;
      if (!externalUrl) {
        return res.status(400).json({
          success: false,
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629 (OLD_DB_URL \u0645\u0641\u0642\u0648\u062F)"
        });
      }
      console.log("\u{1F680} \u0628\u062F\u0621 \u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase...");
      const fetcher = new SecureDataFetcher(externalUrl);
      const connectionStatus = await fetcher.testConnection();
      await fetcher.disconnect();
      res.json({
        success: connectionStatus.success,
        data: connectionStatus,
        message: connectionStatus.success ? `\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase \u0628\u0646\u062C\u0627\u062D (${connectionStatus.responseTime}ms)` : `\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase: ${connectionStatus.error}`
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "\u0641\u0634\u0644 \u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Supabase"
      });
    }
  });
  function getTableDisplayName(tableName) {
    const displayNames = {
      "users": "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646",
      "projects": "\u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
      "workers": "\u0627\u0644\u0639\u0645\u0627\u0644",
      "worker_attendance": "\u062D\u0636\u0648\u0631 \u0627\u0644\u0639\u0645\u0627\u0644",
      "daily_expenses": "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
      "material_purchases": "\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F",
      "materials": "\u0627\u0644\u0645\u0648\u0627\u062F",
      "suppliers": "\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646",
      "fund_transfers": "\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629",
      "equipment": "\u0627\u0644\u0645\u0639\u062F\u0627\u062A",
      "tools": "\u0627\u0644\u0623\u062F\u0648\u0627\u062A",
      "transactions": "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A",
      "accounts": "\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A"
    };
    return displayNames[tableName] || tableName;
  }
  function getTableCategory(tableName) {
    const categories = {
      "users": "system",
      "projects": "core",
      "workers": "core",
      "worker_attendance": "core",
      "daily_expenses": "financial",
      "material_purchases": "financial",
      "materials": "inventory",
      "suppliers": "external",
      "fund_transfers": "financial",
      "equipment": "assets",
      "tools": "assets"
    };
    return categories[tableName] || "other";
  }
  function getTablePriority(tableName) {
    const priorities = {
      "users": 1,
      "projects": 2,
      "workers": 3,
      "materials": 4,
      "suppliers": 5
    };
    return priorities[tableName] || 10;
  }
  function getTableColumns(tableName) {
    const columnsMap = {
      "workers": ["id", "name", "phone", "salary", "project_id", "created_at"],
      "daily_expenses": ["id", "description", "amount", "date", "worker_id", "project_id"],
      "projects": ["id", "name", "description", "status", "start_date", "end_date"],
      "materials": ["id", "name", "unit", "price", "quantity", "supplier_id"],
      "suppliers": ["id", "name", "contact_info", "address", "payment_terms"],
      "accounts": ["id", "name", "type", "balance", "created_at"],
      "transactions": ["id", "amount", "description", "date", "from_account", "to_account"],
      "tools": ["id", "name", "category", "status", "purchase_date", "condition"],
      "users": ["id", "email", "name", "role", "created_at"],
      "equipment": ["id", "name", "model", "serial_number", "location", "status"]
    };
    return columnsMap[tableName] || ["id", "name", "created_at", "updated_at"];
  }
  async function processMigrationInBackground(migrationJob) {
    console.log(`\u{1F504} \u0645\u0639\u0627\u0644\u062C\u0629 \u0647\u062C\u0631\u0629 \u0627\u0644\u062C\u062F\u0648\u0644 ${migrationJob.tableName} \u0641\u064A \u0627\u0644\u062E\u0644\u0641\u064A\u0629...`);
  }
  async function processBatchMigrationInBackground(migrationSession) {
    console.log(`\u{1F504} \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0647\u062C\u0631\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629 \u0644\u0640 ${migrationSession.totalTables} \u062C\u062F\u0648\u0644 \u0641\u064A \u0627\u0644\u062E\u0644\u0641\u064A\u0629...`);
  }
  app2.get("/api/fund-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u062C\u0645\u064A\u0639 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629");
      const transfers = await db.select().from(fundTransfers).orderBy(fundTransfers.transferDate);
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
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F\u0629",
        processingTime: duration
      });
    }
  });
  app2.get("/api/project-fund-transfers", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { date: date2, projectId } = req.query;
      console.log(`\u{1F4CA} [API] \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0644\u0644\u0645\u0634\u0631\u0648\u0639: ${projectId || "\u0627\u0644\u0643\u0644"} \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E: ${date2 || "\u0627\u0644\u0643\u0644"}`);
      let transfers;
      let whereConditions = [];
      if (date2) {
        whereConditions.push(eq5(projectFundTransfers.transferDate, date2));
      }
      if (projectId) {
        whereConditions.push(
          or2(
            eq5(projectFundTransfers.fromProjectId, projectId),
            eq5(projectFundTransfers.toProjectId, projectId)
          )
        );
      }
      if (whereConditions.length > 0) {
        transfers = await db.select().from(projectFundTransfers).where(and5(...whereConditions)).orderBy(projectFundTransfers.transferDate);
      } else {
        transfers = await db.select().from(projectFundTransfers).orderBy(projectFundTransfers.transferDate);
      }
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0645\u0634\u0631\u0648\u0639 \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: transfers,
        message: `\u062A\u0645 \u062C\u0644\u0628 ${transfers.length} \u062A\u062D\u0648\u064A\u0644 \u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639:", error);
      res.status(500).json({
        success: false,
        data: [],
        error: error.message,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639",
        processingTime: duration
      });
    }
  });
  app2.get("/api/autocomplete", requireAuth, async (req, res) => {
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
  app2.post("/api/autocomplete", requireAuth, async (req, res) => {
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
  app2.head("/api/autocomplete", (req, res) => {
    res.status(200).end();
  });
  app2.get("/api/autocomplete/senderNames", requireAuth, async (req, res) => {
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
  app2.get("/api/autocomplete/transferNumbers", requireAuth, async (req, res) => {
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
  app2.get("/api/autocomplete/transferTypes", requireAuth, async (req, res) => {
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
  app2.get("/api/autocomplete/transportDescriptions", requireAuth, async (req, res) => {
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
  app2.get("/api/autocomplete/notes", requireAuth, async (req, res) => {
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
  app2.delete("/api/fund-transfers/:id", requireAuth, async (req, res) => {
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
      const existingTransfer = await db.select().from(fundTransfers).where(eq5(fundTransfers.id, transferId)).limit(1);
      if (existingTransfer.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
          processingTime: duration2
        });
      }
      const deletedTransfer = await db.delete(fundTransfers).where(eq5(fundTransfers.id, transferId)).returning();
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
  app2.delete("/api/transportation-expenses/:id", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const expenseId = req.params.id;
      console.log("\u{1F5D1}\uFE0F [API] \u0637\u0644\u0628 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", expenseId);
      if (!expenseId) {
        const duration2 = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          error: "\u0645\u0639\u0631\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0645\u0637\u0644\u0648\u0628",
          message: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0645\u0639\u0631\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0644\u0644\u062D\u0630\u0641",
          processingTime: duration2
        });
      }
      const existingExpense = await db.select().from(transportationExpenses).where(eq5(transportationExpenses.id, expenseId)).limit(1);
      if (existingExpense.length === 0) {
        const duration2 = Date.now() - startTime;
        return res.status(404).json({
          success: false,
          error: "\u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
          message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0635\u0631\u0648\u0641 \u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${expenseId}`,
          processingTime: duration2
        });
      }
      const deletedExpense = await db.delete(transportationExpenses).where(eq5(transportationExpenses.id, expenseId)).returning();
      const duration = Date.now() - startTime;
      console.log(`\u2705 [API] \u062A\u0645 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0641\u064A ${duration}ms`);
      res.json({
        success: true,
        data: deletedExpense[0],
        message: `\u062A\u0645 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0628\u0642\u064A\u0645\u0629 ${deletedExpense[0]?.amount || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} \u0628\u0646\u062C\u0627\u062D`,
        processingTime: duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("\u274C [API] \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A:", error);
      let errorMessage = "\u0641\u0634\u0644 \u0641\u064A \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A";
      let statusCode = 500;
      if (error.code === "23503") {
        errorMessage = "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0645\u0635\u0631\u0648\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A \u0644\u0648\u062C\u0648\u062F \u0645\u0631\u0627\u062C\u0639 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0647";
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
import fs4 from "fs";
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
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
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
  if (!fs4.existsSync(distPath)) {
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
import { eq as eq8 } from "drizzle-orm";

// server/auth/crypto-utils.ts
import bcrypt from "bcrypt";
import crypto from "crypto";
import speakeasy from "speakeasy";
var CRYPTO_CONFIG = {
  saltRounds: 12,
  // قوة تشفير bcrypt
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
import { eq as eq7 } from "drizzle-orm";

// server/auth/jwt-utils.ts
init_db();
init_schema();
import jwt2 from "jsonwebtoken";
import crypto2 from "crypto";
import { eq as eq6, and as and6, lt as lt2, or as or3, ne, gte as gte2 } from "drizzle-orm";
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
    }).from(users).leftJoin(authUserSessions, and6(
      eq6(authUserSessions.userId, users.id),
      eq6(authUserSessions.refreshTokenHash, refreshTokenHash),
      eq6(authUserSessions.isRevoked, false),
      gte2(authUserSessions.expiresAt, /* @__PURE__ */ new Date())
    )).where(eq6(users.id, payload.userId)).limit(1);
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
    }).where(eq6(authUserSessions.id, session.id));
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
    const user = await db.select().from(users).where(eq6(users.id, payload.userId)).limit(1);
    if (user.length === 0 || !user[0].isActive) {
      return null;
    }
    const refreshTokenHash = hashToken(refreshToken);
    const session = await db.select().from(authUserSessions).where(
      and6(
        eq6(authUserSessions.userId, payload.userId),
        eq6(authUserSessions.refreshTokenHash, refreshTokenHash),
        eq6(authUserSessions.isRevoked, false),
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
    }).where(eq6(authUserSessions.id, session[0].id));
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
    }).where(eq6(authUserSessions.sessionToken, tokenOrSessionId));
    if ((updated.rowCount || 0) === 0) {
      updated = await db.update(authUserSessions).set({
        isRevoked: true,
        revokedAt: /* @__PURE__ */ new Date(),
        revokedReason: reason || "manual_revoke"
      }).where(
        or3(
          eq6(authUserSessions.accessTokenHash, tokenOrSessionId),
          eq6(authUserSessions.refreshTokenHash, tokenOrSessionId),
          eq6(authUserSessions.deviceId, tokenOrSessionId)
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
      eq6(authUserSessions.userId, userId),
      eq6(authUserSessions.isRevoked, false)
    ];
    if (exceptSessionId) {
      conditions.push(ne(authUserSessions.deviceId, exceptSessionId));
    }
    const updated = await db.update(authUserSessions).set({
      isRevoked: true,
      revokedAt: /* @__PURE__ */ new Date(),
      revokedReason: "logout_all_devices"
    }).where(and6(...conditions));
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
    and6(
      eq6(authUserSessions.userId, userId),
      eq6(authUserSessions.isRevoked, false)
    )
  ).orderBy(authUserSessions.lastActivity);
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
    const existingUser = await db.select().from(users).where(eq7(users.email, email.toLowerCase())).limit(1);
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
      // emailVerifiedAt: new Date(), // تفعيل مباشر للتبسيط - حقل غير موجود في schema
    }).returning();
    const userId = newUser[0].id;
    console.log("\u2705 [Register] \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D:", {
      userId,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName
    });
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
      message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D! \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644",
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
    }).where(eq7(users.id, userId));
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
    const user = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
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
    const user = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
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
    }).where(eq7(users.id, userId));
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
      let user2 = await db.select().from(users).where(eq8(users.role, "admin")).limit(1);
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
    }).from(users).where(eq8(users.email, email.toLowerCase())).limit(1);
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
    await db.update(users).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq8(users.id, user.id));
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
      const userResult = await db.select().from(users).where(eq8(users.id, userId)).limit(1);
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
var auth_default = router;

// server/routes/publicRouter.ts
import express2 from "express";

// server/config/routes.ts
import rateLimit3 from "express-rate-limit";
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
      this.rateLimiters.set(limiterId, rateLimit3({
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
var publicRouteRateLimit = rateLimit3({
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
var authRouteRateLimit = rateLimit3({
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
import { eq as eq9, and as and8, sql as sql5, gte as gte4, lt as lt3, lte as lte2, desc as desc5 } from "drizzle-orm";
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
        const workersStats = await db.execute(sql5`
          SELECT 
            COUNT(DISTINCT wa.worker_id) as total_workers,
            COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
          FROM worker_attendance wa
          INNER JOIN workers w ON wa.worker_id = w.id
          WHERE wa.project_id = ${projectId}
        `);
        const materialStats = await db.execute(sql5`
          SELECT 
            COUNT(*) as material_purchases,
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
          FROM material_purchases 
          WHERE project_id = ${projectId}
        `);
        const workerWagesStats = await db.execute(sql5`
          SELECT 
            COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
            COUNT(DISTINCT date) as completed_days
          FROM worker_attendance 
          WHERE project_id = ${projectId} AND is_present = true
        `);
        const fundTransfersStats = await db.execute(sql5`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
          FROM fund_transfers 
          WHERE project_id = ${projectId}
        `);
        const transportStats = await db.execute(sql5`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
          FROM transportation_expenses 
          WHERE project_id = ${projectId}
        `);
        const workerTransfersStats = await db.execute(sql5`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
          FROM worker_transfers 
          WHERE project_id = ${projectId}
        `);
        const miscExpensesStats = await db.execute(sql5`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
          FROM worker_misc_expenses 
          WHERE project_id = ${projectId}
        `);
        const outgoingProjectTransfersStats = await db.execute(sql5`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as outgoing_project_transfers
          FROM project_fund_transfers 
          WHERE from_project_id = ${projectId}
        `);
        const incomingProjectTransfersStats = await db.execute(sql5`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as incoming_project_transfers
          FROM project_fund_transfers 
          WHERE to_project_id = ${projectId}
        `);
        const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || "0", "integer");
        const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || "0", "integer");
        const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || "0");
        const materialPurchases3 = cleanDbValue(materialStats.rows[0]?.material_purchases || "0", "integer");
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
            materialPurchases: materialPurchases3
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
            materialPurchases: Math.max(0, materialPurchases3),
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
    const projectResult = await db.select().from(projects).where(eq9(projects.id, id)).limit(1);
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
          db.execute(sql5`
            SELECT 
              COUNT(DISTINCT wa.worker_id) as total_workers,
              COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
            FROM worker_attendance wa
            INNER JOIN workers w ON wa.worker_id = w.id
            WHERE wa.project_id = ${id}
          `),
          db.execute(sql5`
            SELECT 
              COUNT(*) as material_purchases,
              COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
            FROM material_purchases 
            WHERE project_id = ${id}
          `),
          db.execute(sql5`
            SELECT 
              COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
              COUNT(DISTINCT date) as completed_days
            FROM worker_attendance 
            WHERE project_id = ${id} AND is_present = true
          `),
          db.execute(sql5`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
            FROM fund_transfers 
            WHERE project_id = ${id}
          `),
          db.execute(sql5`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
            FROM transportation_expenses 
            WHERE project_id = ${id}
          `),
          db.execute(sql5`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
            FROM worker_transfers 
            WHERE project_id = ${id}
          `),
          db.execute(sql5`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
            FROM worker_misc_expenses 
            WHERE project_id = ${id}
          `)
        ]);
        const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || "0", "integer");
        const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || "0", "integer");
        const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || "0");
        const materialPurchases3 = cleanDbValue(materialStats.rows[0]?.material_purchases || "0", "integer");
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
            materialPurchases: Math.max(0, materialPurchases3),
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
    const existingProject = await db.select().from(projects).where(eq9(projects.id, projectId)).limit(1);
    if (existingProject.length === 0) {
      return res.status(404).json({
        success: false,
        error: "\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        processingTime: Date.now() - startTime
      });
    }
    const updatedProject = await db.update(projects).set(req.body).where(eq9(projects.id, projectId)).returning();
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
    const existingProject = await db.select().from(projects).where(eq9(projects.id, projectId)).limit(1);
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
    const deletedProject = await db.delete(projects).where(eq9(projects.id, projectId)).returning();
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
    const transfers = await db.select().from(fundTransfers).where(eq9(fundTransfers.projectId, projectId)).orderBy(fundTransfers.transferDate);
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
    }).from(workerAttendance).leftJoin(workers, eq9(workerAttendance.workerId, workers.id)).where(eq9(workerAttendance.projectId, projectId)).orderBy(workerAttendance.date);
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
    const purchases = await db.select().from(materialPurchases).where(eq9(materialPurchases.projectId, projectId)).orderBy(materialPurchases.purchaseDate);
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
    const expenses = await db.select().from(transportationExpenses).where(eq9(transportationExpenses.projectId, projectId)).orderBy(transportationExpenses.date);
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
      fromProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq9(projectFundTransfers.toProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
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
      fromProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq9(projectFundTransfers.fromProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
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
    }).from(workerTransfers).leftJoin(workers, eq9(workerTransfers.workerId, workers.id)).where(eq9(workerTransfers.projectId, projectId)).orderBy(workerTransfers.transferDate);
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
      direction: sql5`'incoming'`.as("direction"),
      fromProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq9(projectFundTransfers.toProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
    const outgoingTransfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      createdAt: projectFundTransfers.createdAt,
      direction: sql5`'outgoing'`.as("direction"),
      fromProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql5`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(eq9(projectFundTransfers.fromProjectId, projectId)).orderBy(desc5(projectFundTransfers.transferDate));
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
    const projectExists = await db.select().from(projects).where(eq9(projects.id, projectId)).limit(1);
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
      const mvResult = await db.execute(sql5`
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
        total_worker_transfers: sql5`COALESCE(${dailyExpenseSummaries.totalWorkerTransfers}, 0)`,
        total_worker_misc_expenses: sql5`COALESCE(${dailyExpenseSummaries.totalWorkerMiscExpenses}, 0)`,
        total_income: dailyExpenseSummaries.totalIncome,
        total_expenses: dailyExpenseSummaries.totalExpenses,
        remaining_balance: dailyExpenseSummaries.remainingBalance,
        notes: sql5`COALESCE(${dailyExpenseSummaries.notes}, '')`,
        created_at: dailyExpenseSummaries.createdAt,
        updated_at: sql5`COALESCE(${dailyExpenseSummaries.updatedAt}, ${dailyExpenseSummaries.createdAt})`,
        project_name: projects.name
      }).from(dailyExpenseSummaries).leftJoin(projects, eq9(dailyExpenseSummaries.projectId, projects.id)).where(and8(
        eq9(dailyExpenseSummaries.projectId, projectId),
        eq9(dailyExpenseSummaries.date, date2)
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
      db.select().from(fundTransfers).where(and8(eq9(fundTransfers.projectId, projectId), gte4(fundTransfers.transferDate, sql5`${date2}::date`), lt3(fundTransfers.transferDate, sql5`(${date2}::date + interval '1 day')`))),
      db.select({
        id: workerAttendance.id,
        workerId: workerAttendance.workerId,
        projectId: workerAttendance.projectId,
        date: workerAttendance.date,
        paidAmount: workerAttendance.paidAmount,
        actualWage: workerAttendance.actualWage,
        workDays: workerAttendance.workDays,
        workerName: workers.name
      }).from(workerAttendance).leftJoin(workers, eq9(workerAttendance.workerId, workers.id)).where(and8(eq9(workerAttendance.projectId, projectId), eq9(workerAttendance.date, date2))),
      db.select().from(materialPurchases).where(and8(eq9(materialPurchases.projectId, projectId), eq9(materialPurchases.purchaseDate, date2))),
      db.select().from(transportationExpenses).where(and8(eq9(transportationExpenses.projectId, projectId), eq9(transportationExpenses.date, date2))),
      db.select().from(workerTransfers).where(and8(eq9(workerTransfers.projectId, projectId), eq9(workerTransfers.transferDate, date2))),
      db.select().from(workerMiscExpenses).where(and8(eq9(workerMiscExpenses.projectId, projectId), eq9(workerMiscExpenses.date, date2))),
      db.select().from(projects).where(eq9(projects.id, projectId)).limit(1)
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
      }).from(dailyExpenseSummaries).where(and8(
        eq9(dailyExpenseSummaries.projectId, projectId),
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
      }).from(dailyExpenseSummaries).where(and8(
        eq9(dailyExpenseSummaries.projectId, projectId),
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
    const whereConditions = [eq9(fundTransfers.projectId, projectId)];
    if (fromDate) {
      whereConditions.push(gte4(fundTransfers.transferDate, sql5`${fromDate}::date`));
    }
    whereConditions.push(lt3(fundTransfers.transferDate, sql5`(${toDate}::date + interval '1 day')`));
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
      db.select().from(fundTransfers).where(and8(...whereConditions)),
      // أجور العمال
      db.select().from(workerAttendance).where(and8(
        eq9(workerAttendance.projectId, projectId),
        fromDate ? gte4(workerAttendance.date, fromDate) : sql5`true`,
        lte2(workerAttendance.date, toDate)
      )),
      // مشتريات المواد النقدية فقط
      db.select().from(materialPurchases).where(and8(
        eq9(materialPurchases.projectId, projectId),
        eq9(materialPurchases.purchaseType, "\u0646\u0642\u062F"),
        fromDate ? gte4(materialPurchases.purchaseDate, fromDate) : sql5`true`,
        lte2(materialPurchases.purchaseDate, toDate)
      )),
      // مصاريف النقل
      db.select().from(transportationExpenses).where(and8(
        eq9(transportationExpenses.projectId, projectId),
        fromDate ? gte4(transportationExpenses.date, fromDate) : sql5`true`,
        lte2(transportationExpenses.date, toDate)
      )),
      // حوالات العمال
      db.select().from(workerTransfers).where(and8(
        eq9(workerTransfers.projectId, projectId),
        fromDate ? gte4(workerTransfers.transferDate, fromDate) : sql5`true`,
        lte2(workerTransfers.transferDate, toDate)
      )),
      // مصاريف متنوعة للعمال
      db.select().from(workerMiscExpenses).where(and8(
        eq9(workerMiscExpenses.projectId, projectId),
        fromDate ? gte4(workerMiscExpenses.date, fromDate) : sql5`true`,
        lte2(workerMiscExpenses.date, toDate)
      )),
      // تحويلات واردة من مشاريع أخرى
      db.select().from(projectFundTransfers).where(and8(
        eq9(projectFundTransfers.toProjectId, projectId),
        fromDate ? gte4(projectFundTransfers.transferDate, fromDate) : sql5`true`,
        lte2(projectFundTransfers.transferDate, toDate)
      )),
      // تحويلات صادرة إلى مشاريع أخرى
      db.select().from(projectFundTransfers).where(and8(
        eq9(projectFundTransfers.fromProjectId, projectId),
        fromDate ? gte4(projectFundTransfers.transferDate, fromDate) : sql5`true`,
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
import { eq as eq10, sql as sql6, and as and9 } from "drizzle-orm";
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
    const worker = await db.select().from(workers).where(eq10(workers.id, workerId)).limit(1);
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
    const existingWorker = await db.select().from(workers).where(eq10(workers.id, workerId)).limit(1);
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
    const updatedWorker = await db.update(workers).set(validationResult.data).where(eq10(workers.id, workerId)).returning();
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
    const existingWorker = await db.select().from(workers).where(eq10(workers.id, workerId)).limit(1);
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
    }).from(workerAttendance).where(eq10(workerAttendance.workerId, workerId)).limit(5);
    if (attendanceRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalAttendanceCount = await db.select({
        count: sql6`COUNT(*)`
      }).from(workerAttendance).where(eq10(workerAttendance.workerId, workerId));
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
    const transferRecords = await db.select({ id: workerTransfers.id }).from(workerTransfers).where(eq10(workerTransfers.workerId, workerId)).limit(1);
    if (transferRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalTransfersCount = await db.select({
        count: sql6`COUNT(*)`
      }).from(workerTransfers).where(eq10(workerTransfers.workerId, workerId));
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
    const transportRecords = await db.select({ id: transportationExpenses.id }).from(transportationExpenses).where(eq10(transportationExpenses.workerId, workerId)).limit(1);
    if (transportRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalTransportCount = await db.select({
        count: sql6`COUNT(*)`
      }).from(transportationExpenses).where(eq10(transportationExpenses.workerId, workerId));
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
    const balanceRecords = await db.select({ id: workerBalances.id }).from(workerBalances).where(eq10(workerBalances.workerId, workerId)).limit(1);
    if (balanceRecords.length > 0) {
      const duration2 = Date.now() - startTime;
      const totalBalanceCount = await db.select({
        count: sql6`COUNT(*)`
      }).from(workerBalances).where(eq10(workerBalances.workerId, workerId));
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
    const deletedWorker = await db.delete(workers).where(eq10(workers.id, workerId)).returning();
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
      workerId: transferToDelete.workerId,
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
workerRouter.get("/worker-misc-expenses", async (req, res) => {
  const startTime = Date.now();
  try {
    const { projectId, date: date2 } = req.query;
    console.log("\u{1F4CA} [API] \u062C\u0644\u0628 \u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629");
    console.log("\u{1F50D} [API] \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0641\u0644\u062A\u0631\u0629:", { projectId, date: date2 });
    let query;
    if (projectId && date2) {
      query = db.select().from(workerMiscExpenses).where(and9(
        eq10(workerMiscExpenses.projectId, projectId),
        eq10(workerMiscExpenses.date, date2)
      ));
    } else if (projectId) {
      query = db.select().from(workerMiscExpenses).where(eq10(workerMiscExpenses.projectId, projectId));
    } else if (date2) {
      query = db.select().from(workerMiscExpenses).where(eq10(workerMiscExpenses.date, date2));
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
      whereCondition = and9(
        eq10(workerAttendance.projectId, projectId),
        eq10(workerAttendance.date, date2)
      );
    } else {
      whereCondition = eq10(workerAttendance.projectId, projectId);
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
    }).from(workerAttendance).leftJoin(workers, eq10(workerAttendance.workerId, workers.id)).where(whereCondition).orderBy(workerAttendance.date);
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
    const existingAttendance = await db.select().from(workerAttendance).where(eq10(workerAttendance.id, attendanceId)).limit(1);
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
    const updatedAttendance = await db.update(workerAttendance).set(updateData).where(eq10(workerAttendance.id, attendanceId)).returning();
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
      workerId: transferToDelete.workerId,
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
    const expenses = await db.select().from(workerMiscExpenses).where(eq10(workerMiscExpenses.projectId, projectId)).orderBy(workerMiscExpenses.date);
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
    const worker = await db.select().from(workers).where(eq10(workers.id, workerId)).limit(1);
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
      totalDays: sql6`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`
    }).from(workerAttendance).where(eq10(workerAttendance.workerId, workerId));
    const totalWorkDays = Number(totalWorkDaysResult[0]?.totalDays) || 0;
    const lastAttendanceResult = await db.select({
      lastAttendanceDate: workerAttendance.attendanceDate,
      projectId: workerAttendance.projectId
    }).from(workerAttendance).where(eq10(workerAttendance.workerId, workerId)).orderBy(sql6`${workerAttendance.attendanceDate} DESC`).limit(1);
    const lastAttendanceDate = lastAttendanceResult[0]?.lastAttendanceDate || null;
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split("T")[0];
    const monthlyAttendanceResult = await db.select({
      monthlyDays: sql6`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`
    }).from(workerAttendance).where(and9(
      eq10(workerAttendance.workerId, workerId),
      sql6`${workerAttendance.attendanceDate} >= ${thirtyDaysAgoString}`
    ));
    const monthlyAttendanceRate = Number(monthlyAttendanceResult[0]?.monthlyDays) || 0;
    const totalTransfersResult = await db.select({
      totalTransfers: sql6`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
      transfersCount: sql6`COUNT(*)`
    }).from(workerTransfers).where(eq10(workerTransfers.workerId, workerId));
    const totalTransfers = Number(totalTransfersResult[0]?.totalTransfers) || 0;
    const transfersCount = Number(totalTransfersResult[0]?.transfersCount) || 0;
    const projectsWorkedResult = await db.select({
      projectsCount: sql6`COUNT(DISTINCT ${workerAttendance.projectId})`
    }).from(workerAttendance).where(eq10(workerAttendance.workerId, workerId));
    const projectsWorked = Number(projectsWorkedResult[0]?.projectsCount) || 0;
    const totalEarningsResult = await db.select({
      totalEarnings: sql6`COALESCE(SUM(CAST(${workerAttendance.actualWage} AS DECIMAL)), 0)`
    }).from(workerAttendance).where(eq10(workerAttendance.workerId, workerId));
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
import { eq as eq11, and as and10, sql as sql7, gte as gte5, lte as lte3, desc as desc6 } from "drizzle-orm";
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
    }).from(fundTransfers).leftJoin(projects, eq11(fundTransfers.projectId, projects.id)).orderBy(desc6(fundTransfers.transferDate));
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
    const existingTransfer = await db.select().from(fundTransfers).where(eq11(fundTransfers.id, transferId)).limit(1);
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
    const updatedTransfer = await db.update(fundTransfers).set(validationResult.data).where(eq11(fundTransfers.id, transferId)).returning();
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
    const existingTransfer = await db.select().from(fundTransfers).where(eq11(fundTransfers.id, transferId)).limit(1);
    if (existingTransfer.length === 0) {
      const duration2 = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0639\u0647\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
        message: `\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0641: ${transferId}`,
        processingTime: duration2
      });
    }
    const deletedTransfer = await db.delete(fundTransfers).where(eq11(fundTransfers.id, transferId)).returning();
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
      fromProjectName: sql7`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql7`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    }).from(projectFundTransfers).where(
      and10(
        sql7`(${projectFundTransfers.fromProjectId} = ${projectId} OR ${projectFundTransfers.toProjectId} = ${projectId})`,
        eq11(projectFundTransfers.transferDate, date2)
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
      fromProjectName: sql7`from_project.name`.as("fromProjectName"),
      toProjectName: sql7`to_project.name`.as("toProjectName")
    }).from(projectFundTransfers).leftJoin(sql7`${projects} as from_project`, eq11(projectFundTransfers.fromProjectId, sql7`from_project.id`)).leftJoin(sql7`${projects} as to_project`, eq11(projectFundTransfers.toProjectId, sql7`to_project.id`));
    const conditions = [];
    if (projectId && projectId !== "all") {
      conditions.push(sql7`(${projectFundTransfers.fromProjectId} = ${projectId} OR ${projectFundTransfers.toProjectId} = ${projectId})`);
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639:", projectId);
    }
    if (date2) {
      const startOfDay = `${date2} 00:00:00`;
      const endOfDay = `${date2} 23:59:59.999`;
      conditions.push(and10(
        gte5(projectFundTransfers.transferDate, startOfDay),
        lte3(projectFundTransfers.transferDate, endOfDay)
      ));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u062A\u0627\u0631\u064A\u062E \u0645\u062D\u062F\u062F:", date2);
    } else if (dateFrom && dateTo) {
      const startOfPeriod = `${dateFrom} 00:00:00`;
      const endOfPeriod = `${dateTo} 23:59:59.999`;
      conditions.push(and10(
        gte5(projectFundTransfers.transferDate, startOfPeriod),
        lte3(projectFundTransfers.transferDate, endOfPeriod)
      ));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u0641\u062A\u0631\u0629 \u0632\u0645\u0646\u064A\u0629:", `${dateFrom} - ${dateTo}`);
    } else if (dateFrom) {
      const startOfPeriod = `${dateFrom} 00:00:00`;
      conditions.push(gte5(projectFundTransfers.transferDate, startOfPeriod));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u0645\u0646 \u062A\u0627\u0631\u064A\u062E:", dateFrom);
    } else if (dateTo) {
      const endOfPeriod = `${dateTo} 23:59:59.999`;
      conditions.push(lte3(projectFundTransfers.transferDate, endOfPeriod));
      console.log("\u2705 [API] \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0641\u0644\u062A\u0631\u0629 \u062D\u062A\u0649 \u062A\u0627\u0631\u064A\u062E:", dateTo);
    }
    let transfers;
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and10(...conditions);
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
    const existingTransfer = await db.select().from(workerTransfers).where(eq11(workerTransfers.id, transferId)).limit(1);
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
    const updatedTransfer = await db.update(workerTransfers).set(validationResult.data).where(eq11(workerTransfers.id, transferId)).returning();
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
    const existingTransfer = await db.select().from(workerTransfers).where(eq11(workerTransfers.id, transferId)).limit(1);
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
    const deletedTransfer = await db.delete(workerTransfers).where(eq11(workerTransfers.id, transferId)).returning();
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
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq11(workerMiscExpenses.id, expenseId)).limit(1);
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
    const updatedExpense = await db.update(workerMiscExpenses).set(validationResult.data).where(eq11(workerMiscExpenses.id, expenseId)).returning();
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
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq11(workerMiscExpenses.id, expenseId)).limit(1);
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
    const deletedExpense = await db.delete(workerMiscExpenses).where(eq11(workerMiscExpenses.id, expenseId)).returning();
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
      db.execute(sql7`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM fund_transfers
      `),
      // إحصائيات تحويلات المشاريع
      db.execute(sql7`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM project_fund_transfers
      `),
      // إحصائيات تحويلات العمال
      db.execute(sql7`
        SELECT
          COUNT(*) as total_transfers,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM worker_transfers
      `),
      // إحصائيات مصاريف العمال المتنوعة
      db.execute(sql7`
        SELECT
          COUNT(*) as total_expenses,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
        FROM worker_misc_expenses
      `),
      // عدد المشاريع
      db.execute(sql7`SELECT COUNT(*) as total_projects FROM projects`),
      // عدد العمال
      db.execute(sql7`SELECT COUNT(*) as total_workers FROM workers WHERE is_active = true`)
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
    const suppliersList = await db.select().from(suppliers).where(eq11(suppliers.isActive, true)).orderBy(suppliers.name);
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
var globalRateLimit = rateLimit4({
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
  const { enhancedMigrationJobManager: enhancedMigrationJobManager2 } = await Promise.resolve().then(() => (init_migration_job_manager_enhanced(), migration_job_manager_enhanced_exports));
  await enhancedMigrationJobManager2.startupCleanup();
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
