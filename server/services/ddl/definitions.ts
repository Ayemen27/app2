import { sql } from "drizzle-orm";

export const DATABASE_DDL: Record<string, string> = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      password_algo TEXT NOT NULL DEFAULT 'argon2id',
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      is_local BOOLEAN DEFAULT false,
      synced BOOLEAN DEFAULT true,
      pending_sync BOOLEAN DEFAULT false,
      version INTEGER NOT NULL DEFAULT 1
    )
  `,
  projects: `
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      location TEXT,
      client_name TEXT,
      budget DECIMAL(15,2),
      status TEXT NOT NULL DEFAULT 'active',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      is_local BOOLEAN DEFAULT false,
      synced BOOLEAN DEFAULT true,
      pending_sync BOOLEAN DEFAULT false,
      version INTEGER NOT NULL DEFAULT 1
    )
  `,
  workers: `
    CREATE TABLE IF NOT EXISTS workers (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      daily_wage DECIMAL(15,2) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      is_local BOOLEAN DEFAULT false,
      synced BOOLEAN DEFAULT true,
      pending_sync BOOLEAN DEFAULT false,
      version INTEGER NOT NULL DEFAULT 1
    )
  `,
  wells: `
    CREATE TABLE IF NOT EXISTS wells (
      id SERIAL PRIMARY KEY,
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      well_number INTEGER NOT NULL,
      owner_name TEXT NOT NULL,
      region VARCHAR(100) NOT NULL,
      number_of_bases INTEGER NOT NULL,
      number_of_panels INTEGER NOT NULL,
      well_depth INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      is_local BOOLEAN DEFAULT false,
      synced BOOLEAN DEFAULT true,
      pending_sync BOOLEAN DEFAULT false,
      version INTEGER NOT NULL DEFAULT 1
    )
  `,
  fund_transfers: `
    CREATE TABLE IF NOT EXISTS fund_transfers (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      amount DECIMAL(15,2) NOT NULL,
      transfer_number TEXT UNIQUE,
      transfer_type TEXT NOT NULL,
      transfer_date TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `,
  worker_attendance: `
    CREATE TABLE IF NOT EXISTS worker_attendance (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      worker_id VARCHAR(255) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      attendance_date TEXT NOT NULL,
      daily_wage DECIMAL(15,2) NOT NULL,
      total_pay DECIMAL(15,2) NOT NULL,
      is_present BOOLEAN,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE(worker_id, attendance_date, project_id)
    )
  `,
  suppliers: `
    CREATE TABLE IF NOT EXISTS suppliers (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      total_debt DECIMAL(12,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `,
  material_purchases: `
    CREATE TABLE IF NOT EXISTS material_purchases (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      supplier_id VARCHAR(255) REFERENCES suppliers(id) ON DELETE SET NULL,
      material_name TEXT NOT NULL,
      quantity DECIMAL(10,3) NOT NULL,
      unit_price DECIMAL(15,2) NOT NULL,
      total_amount DECIMAL(15,2) NOT NULL,
      purchase_type TEXT NOT NULL DEFAULT 'نقد',
      purchase_date TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `,
  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id),
      action TEXT NOT NULL,
      meta JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `,
  project_types: `
    CREATE TABLE IF NOT EXISTS project_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `,
  worker_balances: `
    CREATE TABLE IF NOT EXISTS worker_balances (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id VARCHAR(255) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      total_earned DECIMAL(15,2) DEFAULT 0 NOT NULL,
      total_paid DECIMAL(15,2) DEFAULT 0 NOT NULL,
      total_transferred DECIMAL(15,2) DEFAULT 0 NOT NULL,
      current_balance DECIMAL(15,2) DEFAULT 0 NOT NULL,
      last_updated TIMESTAMP DEFAULT now() NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `,
  worker_transfers: `
    CREATE TABLE IF NOT EXISTS worker_transfers (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id VARCHAR(255) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      amount DECIMAL(15,2) NOT NULL,
      recipient_name TEXT NOT NULL,
      transfer_method TEXT NOT NULL,
      transfer_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `,
  daily_activity_logs: `
    CREATE TABLE IF NOT EXISTS daily_activity_logs (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      engineer_id VARCHAR(255) NOT NULL REFERENCES users(id),
      log_date TEXT NOT NULL,
      activity_title TEXT NOT NULL,
      progress_percentage INTEGER DEFAULT 0,
      images JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT now() NOT NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `,
  // Equipment tables
  equipment: `
    CREATE TABLE IF NOT EXISTS equipment (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `,
  equipment_movements: `
    CREATE TABLE IF NOT EXISTS equipment_movements (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
      equipment_id VARCHAR(255) NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      from_project_id VARCHAR(255) REFERENCES projects(id),
      to_project_id VARCHAR(255) REFERENCES projects(id),
      movement_date TIMESTAMP DEFAULT now() NOT NULL,
      notes TEXT
    )
  `
};
