import { pgTable, text, timestamp, integer, boolean, jsonb, serial, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// نموذج تسجيل الأخطاء
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  errorType: text("error_type").notNull(), // critical, warning, info
  errorCode: text("error_code"), // HTTP codes, build codes, etc
  title: text("title").notNull(),
  description: text("description"),
  stackTrace: text("stack_trace"),
  source: text("source").notNull(), // netlify, frontend, backend, build
  status: text("status").default("active"), // active, resolved, investigating
  severity: integer("severity").default(1), // 1-5 severity levels
  metadata: jsonb("metadata"), // Additional error context
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// نموذج سجلات البناء
export const buildLogs = pgTable("build_logs", {
  id: serial("id").primaryKey(),
  buildId: text("build_id").notNull(),
  status: text("status").notNull(), // success, failed, in_progress, cancelled
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  buildSize: decimal("build_size"), // in MB
  logContent: text("log_content"),
  errorDetails: jsonb("error_details"),
  environment: text("environment").default("production"),
  branch: text("branch").default("main"),
  commitHash: text("commit_hash"),
  deployUrl: text("deploy_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// نموذج مقاييس النظام
export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricType: text("metric_type").notNull(), // build_success_rate, avg_build_time, app_size, uptime
  value: decimal("value").notNull(),
  unit: text("unit"), // percentage, seconds, MB, hours
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

// نموذج التوصيات والإجراءات
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  errorLogId: integer("error_log_id").references(() => errorLogs.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  actionType: text("action_type").notNull(), // auto_fix, manual_fix, configuration, monitoring
  priority: integer("priority").default(3), // 1-5 priority levels
  status: text("status").default("pending"), // pending, applied, failed, dismissed
  autoFixScript: text("auto_fix_script"),
  manualSteps: jsonb("manual_steps"), // Array of manual steps
  estimatedTime: integer("estimated_time"), // in minutes
  appliedAt: timestamp("applied_at"),
  appliedBy: text("applied_by"),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// نموذج حالة النظام المباشرة
export const systemStatus = pgTable("system_status", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(), // netlify_build, frontend, api_functions, database
  status: text("status").notNull(), // operational, degraded, down, maintenance
  lastChecked: timestamp("last_checked").defaultNow().notNull(),
  responseTime: integer("response_time"), // in milliseconds
  uptime: decimal("uptime"), // percentage
  metadata: jsonb("metadata"),
});

// Insert and Select Schemas
export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBuildLogSchema = createInsertSchema(buildLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemMetricSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  recordedAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({
  id: true,
  lastChecked: true,
});

// Types
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export type BuildLog = typeof buildLogs.$inferSelect;
export type InsertBuildLog = z.infer<typeof insertBuildLogSchema>;

export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;

export type SystemStatus = typeof systemStatus.$inferSelect;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;

// Enums for type safety
export const ERROR_TYPES = {
  CRITICAL: "critical",
  WARNING: "warning", 
  INFO: "info"
} as const;

export const BUILD_STATUSES = {
  SUCCESS: "success",
  FAILED: "failed",
  IN_PROGRESS: "in_progress",
  CANCELLED: "cancelled"
} as const;

export const SERVICE_STATUSES = {
  OPERATIONAL: "operational",
  DEGRADED: "degraded",
  DOWN: "down",
  MAINTENANCE: "maintenance"
} as const;

export const ACTION_TYPES = {
  AUTO_FIX: "auto_fix",
  MANUAL_FIX: "manual_fix",
  CONFIGURATION: "configuration",
  MONITORING: "monitoring"
} as const;
