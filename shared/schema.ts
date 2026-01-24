import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, uuid, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper to add sync flags to any table
const syncFields = {
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
};

// --- CORE TABLES ---

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  totpSecret: text("totp_secret"),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  fcmToken: text("fcm_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  ...syncFields,
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ...syncFields,
});

export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  phone: text("phone"),
  status: text("status").default("active"),
  ...syncFields,
});

export const workerTypes = pgTable("worker_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used").defaultNow(),
});

export const fundTransfers = pgTable("fund_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transferNumber: text("transfer_number"),
  date: text("date").notNull(),
  ...syncFields,
});

export const workerAttendance = pgTable("worker_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  date: text("date").notNull(),
  wage: decimal("wage", { precision: 15, scale: 2 }).notNull(),
  ...syncFields,
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  ...syncFields,
});

export const materialPurchases = pgTable("material_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  materialId: varchar("material_id").notNull().references(() => materials.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  ...syncFields,
});

export const transportationExpenses = pgTable("transportation_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  ...syncFields,
});

export const workerTransfers = pgTable("worker_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  ...syncFields,
});

export const workerMiscExpenses = pgTable("worker_misc_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  ...syncFields,
});

export const dailyExpenseSummaries = pgTable("daily_expense_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
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

export const autocompleteData = pgTable("autocomplete_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  value: text("value").notNull(),
  usageCount: integer("usage_count").default(1).notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- MONITORING TABLES ---

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  severity: text("severity", { enum: ["critical", "warning", "info"] }).notNull(),
  status: text("status", { enum: ["open", "resolved", "investigating"] }).notNull(),
  affectedDevices: integer("affected_devices").default(0),
  appVersion: text("app_version").notNull(),
  lastOccurrence: timestamp("last_occurrence").defaultNow(),
  details: jsonb("details"),
});

export const monitoringMetrics = pgTable("monitoring_metrics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// --- WELLS & OTHER TABLES ---

export const wells = pgTable("wells", { id: serial("id").primaryKey(), name: text("name").notNull() });
export const wellTasks = pgTable("well_tasks", { id: serial("id").primaryKey(), wellId: integer("well_id").references(() => wells.id) });
export const wellTaskAccounts = pgTable("well_task_accounts", { id: serial("id").primaryKey(), taskId: integer("task_id").references(() => wellTasks.id) });
export const wellExpenses = pgTable("well_expenses", { id: serial("id").primaryKey(), wellId: integer("well_id").references(() => wells.id) });
export const wellAuditLogs = pgTable("well_audit_logs", { id: serial("id").primaryKey(), wellId: integer("well_id").references(() => wells.id) });

export const notifications = pgTable("notifications", { id: serial("id").primaryKey(), message: text("message").notNull() });
export const notificationReadStates = pgTable("notification_read_states", { id: serial("id").primaryKey(), userId: varchar("user_id").references(() => users.id) });

export const equipment = pgTable("equipment", { id: serial("id").primaryKey(), name: text("name").notNull() });
export const equipmentMovements = pgTable("equipment_movements", { id: serial("id").primaryKey(), equipmentId: integer("equipment_id").references(() => equipment.id) });

export const suppliers = pgTable("suppliers", { id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), name: text("name").notNull() });
export const supplierPayments = pgTable("supplier_payments", { id: serial("id").primaryKey(), supplierId: varchar("supplier_id").references(() => suppliers.id) });

export const printSettings = pgTable("print_settings", { id: serial("id").primaryKey(), name: text("name") });
export const projectFundTransfers = pgTable("project_fund_transfers", { id: serial("id").primaryKey(), amount: decimal("amount") });
export const reportTemplates = pgTable("report_templates", { id: serial("id").primaryKey(), name: text("name") });

export const emergencyUsers = pgTable("emergency_users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authUserSessions = pgTable("auth_user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionToken: varchar("session_token"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- INSERT SCHEMAS & TYPES ---

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, lastOccurrence: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const insertWorkerSchema = createInsertSchema(workers).omit({ id: true });
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workers.$inferSelect;

export const insertWorkerTypeSchema = createInsertSchema(workerTypes).omit({ id: true });
export type InsertWorkerType = z.infer<typeof insertWorkerTypeSchema>;
export type WorkerType = typeof workerTypes.$inferSelect;

export const insertFundTransferSchema = createInsertSchema(fundTransfers).omit({ id: true });
export type InsertFundTransfer = z.infer<typeof insertFundTransferSchema>;
export type FundTransfer = typeof fundTransfers.$inferSelect;

export const insertWorkerAttendanceSchema = createInsertSchema(workerAttendance).omit({ id: true });
export type InsertWorkerAttendance = z.infer<typeof insertWorkerAttendanceSchema>;
export type WorkerAttendance = typeof workerAttendance.$inferSelect;

export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true });
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

export const insertMaterialPurchaseSchema = createInsertSchema(materialPurchases).omit({ id: true });
export type InsertMaterialPurchase = z.infer<typeof insertMaterialPurchaseSchema>;
export type MaterialPurchase = typeof materialPurchases.$inferSelect;

export const insertTransportationExpenseSchema = createInsertSchema(transportationExpenses).omit({ id: true });
export type InsertTransportationExpense = z.infer<typeof insertTransportationExpenseSchema>;
export type TransportationExpense = typeof transportationExpenses.$inferSelect;

export const insertDailyExpenseSummarySchema = createInsertSchema(dailyExpenseSummaries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyExpenseSummary = z.infer<typeof insertDailyExpenseSummarySchema>;
export type DailyExpenseSummary = typeof dailyExpenseSummaries.$inferSelect;

export const insertWorkerTransferSchema = createInsertSchema(workerTransfers).omit({ id: true });
export type InsertWorkerTransfer = z.infer<typeof insertWorkerTransferSchema>;
export type WorkerTransfer = typeof workerTransfers.$inferSelect;

export const insertWorkerMiscExpenseSchema = createInsertSchema(workerMiscExpenses).omit({ id: true });
export type InsertWorkerMiscExpense = z.infer<typeof insertWorkerMiscExpenseSchema>;
export type WorkerMiscExpense = typeof workerMiscExpenses.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertAutocompleteDataSchema = createInsertSchema(autocompleteData).omit({ id: true, createdAt: true });
export type InsertAutocompleteData = z.infer<typeof insertAutocompleteDataSchema>;
export type AutocompleteData = typeof autocompleteData.$inferSelect;

export type Well = typeof wells.$inferSelect;
export type InsertWell = z.infer<typeof createInsertSchema(wells)>;
export type WellTask = typeof wellTasks.$inferSelect;
export type InsertWellTask = z.infer<typeof createInsertSchema(wellTasks)>;
export type WellTaskAccount = typeof wellTaskAccounts.$inferSelect;
export type InsertWellTaskAccount = z.infer<typeof createInsertSchema(wellTaskAccounts)>;
export type WellExpense = typeof wellExpenses.$inferSelect;
export type InsertWellExpense = z.infer<typeof createInsertSchema(wellExpenses)>;
export type WellAuditLog = typeof wellAuditLogs.$inferSelect;
export type InsertWellAuditLog = z.infer<typeof createInsertSchema(wellAuditLogs)>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof createInsertSchema(notifications)>;
export type NotificationReadState = typeof notificationReadStates.$inferSelect;
export type InsertNotificationReadState = z.infer<typeof createInsertSchema(notificationReadStates)>;

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof createInsertSchema(equipment)>;
export type EquipmentMovement = typeof equipmentMovements.$inferSelect;
export type InsertEquipmentMovement = z.infer<typeof createInsertSchema(equipmentMovements)>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof createInsertSchema(suppliers)>;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type InsertSupplierPayment = z.infer<typeof createInsertSchema(supplierPayments)>;

export type PrintSettings = typeof printSettings.$inferSelect;
export type InsertPrintSettings = z.infer<typeof createInsertSchema(printSettings)>;
export type ProjectFundTransfer = typeof projectFundTransfers.$inferSelect;
export type InsertProjectFundTransfer = z.infer<typeof createInsertSchema(projectFundTransfers)>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof createInsertSchema(reportTemplates)>;

export type EmergencyUser = typeof emergencyUsers.$inferSelect;
export type InsertEmergencyUser = z.infer<typeof createInsertSchema(emergencyUsers)>;
