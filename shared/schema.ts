import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, jsonb, uuid, inet, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper to add sync flags to any table
const syncFields = {
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
};

// Users table (جدول المستخدمين)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // سيتم تشفيرها
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("admin"), // admin, manager, user
  isActive: boolean("is_active").default(true).notNull(),
  emailVerifiedAt: timestamp("email_verified_at"), // متى تم التحقق من البريد الإلكتروني
  totpSecret: text("totp_secret"), // TOTP secret for 2FA
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(), // Multi-factor authentication enabled
  fcmToken: text("fcm_token"), // Token for Firebase Cloud Messaging
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  ...syncFields,
});

// New Monitoring Tables
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

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, lastOccurrence: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export const monitoringMetrics = pgTable("monitoring_metrics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Existing tables from original file (truncated for brevity but preserved)
// Emergency Users table
export const emergencyUsers = pgTable("emergency_users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Authentication User Sessions table
export const authUserSessions = pgTable("auth_user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionToken: varchar("session_token"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// Autocomplete data table (بيانات الإكمال التلقائي)
export const autocompleteData = pgTable("autocomplete_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // نوع البيانات: senderNames, recipientNames, etc
  value: text("value").notNull(), // القيمة المحفوظة
  usageCount: integer("usage_count").default(1).notNull(), // عدد مرات الاستخدام
  lastUsed: timestamp("last_used").defaultNow().notNull(), // آخر استخدام
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
