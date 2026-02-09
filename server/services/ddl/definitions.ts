import * as schema from "../../../shared/schema";
import { getTableConfig } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const DATABASE_DDL: Record<string, string> = {};

// تعاريف يدوية للجداول الأساسية لضمان عمل BackupService بشكل صحيح
// نستخدم DDL متوافق مع PostgreSQL ويدعم JSONB والقيود

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
  "project_type_id" integer,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "is_local" boolean DEFAULT false,
  "synced" boolean DEFAULT true,
  "pending_sync" boolean DEFAULT false,
  "version" integer DEFAULT 1 NOT NULL,
  "last_modified_by" varchar
);`;

DATABASE_DDL['refresh_tokens'] = `
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL,
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
  "user_id" varchar,
  "action" text NOT NULL,
  "meta" jsonb,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

DATABASE_DDL['notifications'] = `
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" varchar,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);`;

// إضافة بقية الجداول تلقائياً من المخطط إذا أمكن
Object.entries(schema).forEach(([key, value]) => {
  if (typeof value === 'object' && value !== null && 'pgConfig' in (value as any)) {
    const table = value as any;
    const config = getTableConfig(table);
    if (!DATABASE_DDL[config.name]) {
       // fallback مبسط
       DATABASE_DDL[config.name] = \`CREATE TABLE IF NOT EXISTS "\${config.name}" (id serial PRIMARY KEY)\`;
    }
  }
});
