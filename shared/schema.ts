import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, jsonb, uuid, inet, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle- zod";
import { z } from "zod";

// Helper to add sync flags to any table
const syncFields = {
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
};

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Android Devices Table
export const devices = pgTable("monitoring_devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").unique().notNull(),
  model: text("model"),
  osVersion: text("os_version"),
  appVersion: text("app_version"),
  lastSeen: timestamp("last_seen").defaultNow(),
  status: text("status").default("active"), // active, inactive
});

// Monitoring Metrics (OTel compatible)
export const monitoringMetrics = pgTable("monitoring_metrics", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  name: text("name").notNull(), // cpu_usage, mem_usage, etc.
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit"), // percentage, bytes, ms
  timestamp: timestamp("timestamp").defaultNow(),
});

// Error Logs (Sentry/Crashlytics style)
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  severity: text("severity").notNull(), // error, warning, critical
  metadata: jsonb("metadata"), // extra context
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert Schemas
export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, lastSeen: true });
export const insertMetricSchema = createInsertSchema(monitoringMetrics).omit({ id: true, timestamp: true });
export const insertErrorSchema = createInsertSchema(errorLogs).omit({ id: true, timestamp: true });

// Types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type MonitoringMetric = typeof monitoringMetrics.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertError = z.infer<typeof insertErrorSchema>;
