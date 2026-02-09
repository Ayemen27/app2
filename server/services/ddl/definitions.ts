import * as schema from "../../../shared/schema";
import { getTableConfig } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const DATABASE_DDL: Record<string, string> = {};

// تعاريف شاملة لجميع الجداول الأساسية والمهمة لضمان استقرار النظام عند الاستعادة
// تم استخراج هذه التعاريف بناءً على مخطط Drizzle الحالي (Schema)

DATABASE_DDL['users'] = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "password_algo" text DEFAULT 'argon2id' NOT NULL,
  "first_name" text,
  "last_name" text,
  "full_name" text,
  "phone" text,
  "birth_date" text,
  "birth_place" text,
  "gender" text,
  "role" text NOT NULL DEFAULT 'admin',
  "is_active" boolean DEFAULT true NOT NULL,
  "email_verified_at" timestamp,
  "totp_secret" text,
  "mfa_enabled" boolean DEFAULT false NOT NULL,
  "fcm_token" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_login" timestamp,
  "is_local" boolean DEFAULT false,
  "synced" boolean DEFAULT true,
  "pending_sync" boolean DEFAULT false,
  "version" integer DEFAULT 1 NOT NULL,
  "last_modified_by" varchar
);`;

DATABASE_DDL['refresh_tokens'] = `
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "replaced_by" uuid,
  "revoked" boolean DEFAULT false NOT NULL,
  "expires_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "device_fingerprint" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['audit_logs'] = `
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY,
  "user_id" varchar REFERENCES "users"("id"),
  "action" text NOT NULL,
  "meta" jsonb,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['project_types'] = `
CREATE TABLE IF NOT EXISTS "project_types" (
  "id" serial PRIMARY KEY,
  "name" varchar(100) NOT NULL UNIQUE,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_local" boolean DEFAULT false,
  "synced" boolean DEFAULT true,
  "pending_sync" boolean DEFAULT false,
  "version" integer DEFAULT 1 NOT NULL,
  "last_modified_by" varchar
);`;

DATABASE_DDL['projects'] = `
CREATE TABLE IF NOT EXISTS "projects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "description" text,
  "location" text,
  "client_name" text,
  "budget" decimal(15, 2),
  "start_date" date,
  "end_date" date,
  "status" text NOT NULL DEFAULT 'active',
  "engineer_id" varchar,
  "manager_name" text,
  "contact_phone" text,
  "notes" text,
  "image_url" text,
  "project_type_id" integer REFERENCES "project_types"("id") ON DELETE SET NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "is_local" boolean DEFAULT false,
  "synced" boolean DEFAULT true,
  "pending_sync" boolean DEFAULT false,
  "version" integer DEFAULT 1 NOT NULL,
  "last_modified_by" varchar
);`;

DATABASE_DDL['workers'] = `
CREATE TABLE IF NOT EXISTS "workers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "type" text NOT NULL,
  "daily_wage" decimal(15, 2) NOT NULL,
  "phone" text,
  "hire_date" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_local" boolean DEFAULT false,
  "synced" boolean DEFAULT true,
  "pending_sync" boolean DEFAULT false,
  "version" integer DEFAULT 1 NOT NULL,
  "last_modified_by" varchar
);`;

DATABASE_DDL['suppliers'] = `
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "contact_person" text,
  "phone" text,
  "address" text,
  "payment_terms" text DEFAULT 'نقد',
  "total_debt" decimal(12, 2) DEFAULT '0' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['materials'] = `
CREATE TABLE IF NOT EXISTS "materials" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "category" text NOT NULL,
  "unit" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['wells'] = `
CREATE TABLE IF NOT EXISTS "wells" (
  "id" serial PRIMARY KEY,
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "well_number" integer NOT NULL,
  "owner_name" text NOT NULL,
  "region" varchar(100) NOT NULL,
  "number_of_bases" integer NOT NULL,
  "base_count" integer,
  "number_of_panels" integer NOT NULL,
  "panel_count" integer,
  "well_depth" integer NOT NULL,
  "water_level" integer,
  "number_of_pipes" integer NOT NULL,
  "pipe_count" integer,
  "fan_type" varchar(100),
  "pump_power" integer,
  "status" text NOT NULL DEFAULT 'pending',
  "completion_percentage" decimal(5, 2) DEFAULT '0' NOT NULL,
  "start_date" date,
  "completion_date" date,
  "notes" text,
  "created_by" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "is_local" boolean DEFAULT false,
  "synced" boolean DEFAULT true,
  "pending_sync" boolean DEFAULT false,
  "version" integer DEFAULT 1 NOT NULL,
  "last_modified_by" varchar,
  UNIQUE(project_id, well_number)
);`;

DATABASE_DDL['fund_transfers'] = `
CREATE TABLE IF NOT EXISTS "fund_transfers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "amount" decimal(15, 2) NOT NULL,
  "sender_name" text,
  "transfer_number" text UNIQUE,
  "transfer_type" text NOT NULL,
  "transfer_date" text NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['worker_attendance'] = `
CREATE TABLE IF NOT EXISTS "worker_attendance" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "worker_id" varchar NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
  "attendance_date" text NOT NULL,
  "date" text,
  "start_time" text,
  "end_time" text,
  "work_description" text,
  "is_present" boolean,
  "hours_worked" decimal(5, 2) DEFAULT '8.00',
  "overtime" decimal(5, 2) DEFAULT '0.00',
  "overtime_rate" decimal(15, 2) DEFAULT '0.00',
  "work_days" decimal(10, 2) DEFAULT '0.00',
  "daily_wage" decimal(15, 2) NOT NULL,
  "actual_wage" decimal(15, 2),
  "total_pay" decimal(15, 2) NOT NULL,
  "paid_amount" decimal(15, 2) DEFAULT '0',
  "remaining_amount" decimal(15, 2) DEFAULT '0',
  "payment_type" text DEFAULT 'partial',
  "notes" text,
  "well_id" integer REFERENCES "wells"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE(worker_id, attendance_date, project_id)
);`;

DATABASE_DDL['material_purchases'] = `
CREATE TABLE IF NOT EXISTS "material_purchases" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "supplier_id" varchar REFERENCES "suppliers"("id") ON DELETE SET NULL,
  "material_id" varchar REFERENCES "materials"("id") ON DELETE SET NULL,
  "material_name" text NOT NULL,
  "material_category" text,
  "material_unit" text,
  "quantity" decimal(10, 3) NOT NULL,
  "unit" text NOT NULL,
  "unit_price" decimal(15, 2) NOT NULL,
  "total_amount" decimal(15, 2) NOT NULL,
  "purchase_type" text NOT NULL DEFAULT 'نقد',
  "paid_amount" decimal(15, 2) DEFAULT '0' NOT NULL,
  "remaining_amount" decimal(15, 2) DEFAULT '0' NOT NULL,
  "supplier_name" text,
  "receipt_number" text,
  "invoice_number" text,
  "invoice_date" text,
  "due_date" text,
  "invoice_photo" text,
  "notes" text,
  "purchase_date" text NOT NULL,
  "well_id" integer REFERENCES "wells"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['transportation_expenses'] = `
CREATE TABLE IF NOT EXISTS "transportation_expenses" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "worker_id" varchar REFERENCES "workers"("id") ON DELETE SET NULL,
  "amount" decimal(15, 2) NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL DEFAULT 'other',
  "date" text NOT NULL,
  "notes" text,
  "well_id" integer REFERENCES "wells"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['worker_transfers'] = `
CREATE TABLE IF NOT EXISTS "worker_transfers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_id" varchar NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "amount" decimal(15, 2) NOT NULL,
  "transfer_number" text,
  "sender_name" text,
  "recipient_name" text NOT NULL,
  "recipient_phone" text,
  "transfer_method" text NOT NULL,
  "transfer_date" text NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['worker_balances'] = `
CREATE TABLE IF NOT EXISTS "worker_balances" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_id" varchar NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "total_earned" decimal(15, 2) DEFAULT '0' NOT NULL,
  "total_paid" decimal(15, 2) DEFAULT '0' NOT NULL,
  "total_transferred" decimal(15, 2) DEFAULT '0' NOT NULL,
  "current_balance" decimal(15, 2) DEFAULT '0' NOT NULL,
  "last_updated" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['daily_activity_logs'] = `
CREATE TABLE IF NOT EXISTS "daily_activity_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "engineer_id" varchar NOT NULL REFERENCES "users"("id"),
  "log_date" text NOT NULL,
  "activity_title" text NOT NULL,
  "description" text,
  "progress_percentage" integer DEFAULT 0,
  "weather_conditions" text,
  "images" jsonb DEFAULT '[]',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['daily_expense_summaries'] = `
CREATE TABLE IF NOT EXISTS "daily_expense_summaries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" text NOT NULL,
  "total_transfers" decimal(15, 2) DEFAULT '0' NOT NULL,
  "total_expenses" decimal(15, 2) DEFAULT '0' NOT NULL,
  "total_purchases" decimal(15, 2) DEFAULT '0' NOT NULL,
  "total_wages" decimal(15, 2) DEFAULT '0' NOT NULL,
  "opening_balance" decimal(15, 2) DEFAULT '0' NOT NULL,
  "closing_balance" decimal(15, 2) DEFAULT '0' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['notifications'] = `
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" varchar REFERENCES "users"("id"),
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['notification_read_states'] = `
CREATE TABLE IF NOT EXISTS "notification_read_states" (
  "id" serial PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "notification_id" varchar NOT NULL,
  "notification_type" text NOT NULL,
  "read_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE(user_id, notification_id, notification_type)
);`;

DATABASE_DDL['print_settings'] = `
CREATE TABLE IF NOT EXISTS "print_settings" (
  "id" serial PRIMARY KEY,
  "report_type" text NOT NULL,
  "user_id" varchar REFERENCES "users"("id"),
  "header_text" text,
  "footer_text" text,
  "logo_url" text,
  "is_default" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['report_templates'] = `
CREATE TABLE IF NOT EXISTS "report_templates" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "content" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['equipment'] = `
CREATE TABLE IF NOT EXISTS "equipment" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "type" text,
  "status" text DEFAULT 'available',
  "project_id" varchar REFERENCES "projects"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['equipment_movements'] = `
CREATE TABLE IF NOT EXISTS "equipment_movements" (
  "id" serial PRIMARY KEY,
  "equipment_id" varchar NOT NULL REFERENCES "equipment"("id") ON DELETE CASCADE,
  "from_project_id" varchar REFERENCES "projects"("id"),
  "to_project_id" varchar REFERENCES "projects"("id"),
  "movement_date" timestamp DEFAULT now() NOT NULL,
  "notes" text
);`;

DATABASE_DDL['worker_misc_expenses'] = `
CREATE TABLE IF NOT EXISTS "worker_misc_expenses" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "worker_id" varchar NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
  "amount" decimal(15, 2) NOT NULL,
  "description" text NOT NULL,
  "date" text NOT NULL,
  "well_id" integer REFERENCES "wells"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['project_fund_transfers'] = `
CREATE TABLE IF NOT EXISTS "project_fund_transfers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "from_project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "to_project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "amount" decimal(15, 2) NOT NULL,
  "transfer_date" text NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['ai_chat_messages'] = `
CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
  "id" serial PRIMARY KEY,
  "user_id" varchar REFERENCES "users"("id"),
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['ai_usage_stats'] = `
CREATE TABLE IF NOT EXISTS "ai_usage_stats" (
  "id" serial PRIMARY KEY,
  "user_id" varchar REFERENCES "users"("id"),
  "tokens_used" integer NOT NULL,
  "feature" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['security_policies'] = `
CREATE TABLE IF NOT EXISTS "security_policies" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "rules" jsonb NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['autocomplete_data'] = `
CREATE TABLE IF NOT EXISTS "autocomplete_data" (
  "id" serial PRIMARY KEY,
  "category" text NOT NULL,
  "value" text NOT NULL,
  "usage_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE(category, value)
);`;

DATABASE_DDL['worker_types'] = `
CREATE TABLE IF NOT EXISTS "worker_types" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "usage_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['well_tasks'] = `
CREATE TABLE IF NOT EXISTS "well_tasks" (
  "id" serial PRIMARY KEY,
  "well_id" integer NOT NULL REFERENCES "wells"("id") ON DELETE CASCADE,
  "task_name" text NOT NULL,
  "status" text DEFAULT 'pending',
  "progress" integer DEFAULT 0,
  "start_date" date,
  "end_date" date,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['well_task_accounts'] = `
CREATE TABLE IF NOT EXISTS "well_task_accounts" (
  "id" serial PRIMARY KEY,
  "well_id" integer NOT NULL REFERENCES "wells"("id") ON DELETE CASCADE,
  "task_id" integer NOT NULL REFERENCES "well_tasks"("id") ON DELETE CASCADE,
  "total_budget" decimal(15, 2) NOT NULL,
  "actual_expense" decimal(15, 2) DEFAULT '0',
  "remaining_budget" decimal(15, 2),
  "notes" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['well_expenses'] = `
CREATE TABLE IF NOT EXISTS "well_expenses" (
  "id" serial PRIMARY KEY,
  "well_id" integer NOT NULL REFERENCES "wells"("id") ON DELETE CASCADE,
  "expense_type" text NOT NULL,
  "amount" decimal(15, 2) NOT NULL,
  "description" text NOT NULL,
  "expense_date" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['well_audit_logs'] = `
CREATE TABLE IF NOT EXISTS "well_audit_logs" (
  "id" serial PRIMARY KEY,
  "well_id" integer REFERENCES "wells"("id") ON DELETE SET NULL,
  "task_id" integer,
  "action" text NOT NULL,
  "meta" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

// ضمان إضافة أي جداول أخرى من المخطط بهيكل مبسط إذا لم تكن معرفة أعلاه
Object.entries(schema).forEach(([key, value]) => {
  if (typeof value === 'object' && value !== null && 'pgConfig' in (value as any)) {
    const table = value as any;
    const config = getTableConfig(table);
    if (!DATABASE_DDL[config.name]) {
       DATABASE_DDL[config.name] = `CREATE TABLE IF NOT EXISTS "${config.name}" (id serial PRIMARY KEY)`;
    }
  }
});
