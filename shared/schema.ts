import { pgTable, text, timestamp, integer, boolean, jsonb, serial, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// نموذج المشاريع
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"), // active, completed, on_hold, cancelled
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  location: text("location"),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// نموذج العمال
export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  type: text("type").notNull(), // carpenter, electrician, plumber, etc.
  dailyWage: decimal("daily_wage", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("active"), // active, inactive
  hiredDate: timestamp("hired_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// نموذج حضور العمال
export const workerAttendance = pgTable("worker_attendance", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").references(() => workers.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  attendanceDate: timestamp("attendance_date").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }).default("8.00"),
  overtime: decimal("overtime", { precision: 4, scale: 2 }).default("0.00"),
  dailyWage: decimal("daily_wage", { precision: 10, scale: 2 }).notNull(),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }).default("0.00"),
  totalPay: decimal("total_pay", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// نموذج المصروفات اليومية
export const dailyExpenses = pgTable("daily_expenses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  category: text("category").notNull(), // materials, labor, equipment, transportation, other
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receiptNumber: text("receipt_number"),
  supplierName: text("supplier_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// نموذج شراء المواد
export const materialPurchases = pgTable("material_purchases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  materialName: text("material_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(), // meter, kg, piece, box, etc.
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  supplierName: text("supplier_name"),
  receiptNumber: text("receipt_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// نموذج المعدات
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serialNumber: text("serial_number"),
  category: text("category").notNull(),
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  status: text("status").default("available"), // available, in_use, maintenance, retired
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// نموذج بيانات الإكمال التلقائي
export const autocompleteData = pgTable("autocomplete_data", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // worker_types, material_names, suppliers, etc.
  value: text("value").notNull(),
  frequency: integer("frequency").default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert and Select Schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkerSchema = createInsertSchema(workers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkerAttendanceSchema = createInsertSchema(workerAttendance).omit({
  id: true,
  createdAt: true,
});

export const insertDailyExpenseSchema = createInsertSchema(dailyExpenses).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialPurchaseSchema = createInsertSchema(materialPurchases).omit({
  id: true,
  createdAt: true,
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutocompleteDataSchema = createInsertSchema(autocompleteData).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

// Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = z.infer<typeof insertWorkerSchema>;

export type WorkerAttendance = typeof workerAttendance.$inferSelect;
export type InsertWorkerAttendance = z.infer<typeof insertWorkerAttendanceSchema>;

export type DailyExpense = typeof dailyExpenses.$inferSelect;
export type InsertDailyExpense = z.infer<typeof insertDailyExpenseSchema>;

export type MaterialPurchase = typeof materialPurchases.$inferSelect;
export type InsertMaterialPurchase = z.infer<typeof insertMaterialPurchaseSchema>;

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;

export type AutocompleteData = typeof autocompleteData.$inferSelect;
export type InsertAutocompleteData = z.infer<typeof insertAutocompleteDataSchema>;

// Enums for type safety
export const PROJECT_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
  CANCELLED: "cancelled",
} as const;

export const WORKER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const EQUIPMENT_STATUS = {
  AVAILABLE: "available",
  IN_USE: "in_use",
  MAINTENANCE: "maintenance",
  RETIRED: "retired",
} as const;

export const EXPENSE_CATEGORIES = {
  MATERIALS: "materials",
  LABOR: "labor",
  EQUIPMENT: "equipment",
  TRANSPORTATION: "transportation",
  OTHER: "other",
} as const;

// Helper types for dashboard
export interface DailyExpenseSummary {
  date: string;
  totalAmount: number;
  expenseCount: number;
  categories: {
    [key: string]: number;
  };
}

export interface ProjectStats {
  totalWorkers: string;
  totalExpenses: number;
  totalIncome: number;
  currentBalance: number;
  activeWorkers: string;
  completedDays: string;
  materialPurchases: string;
  lastActivity: string;
}

export interface ProjectWithStats extends Project {
  stats: ProjectStats;
}