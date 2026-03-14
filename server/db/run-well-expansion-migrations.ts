import { db } from "../db";
import { sql } from "drizzle-orm";

export async function runWellExpansionMigrations() {
  console.log('🚀 بدء تطبيق migrations توسعة الآبار...');

  try {
    await db.execute(sql`ALTER TABLE wells ADD COLUMN IF NOT EXISTS beneficiary_phone TEXT`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS well_work_crews (
        id SERIAL PRIMARY KEY,
        well_id INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
        crew_type VARCHAR(50) NOT NULL,
        team_name TEXT,
        workers_count INTEGER NOT NULL DEFAULT 0,
        masters_count INTEGER NOT NULL DEFAULT 0,
        work_days DECIMAL(10,2) NOT NULL DEFAULT 0,
        worker_daily_wage DECIMAL(12,2),
        master_daily_wage DECIMAL(12,2),
        total_wages DECIMAL(12,2),
        work_date DATE,
        notes TEXT,
        created_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS well_solar_components (
        id SERIAL PRIMARY KEY,
        well_id INTEGER NOT NULL UNIQUE REFERENCES wells(id) ON DELETE CASCADE,
        inverter TEXT,
        collection_box TEXT,
        carbon_carrier TEXT,
        steel_converter_top TEXT,
        clamp_converter_bottom TEXT,
        binding_cable_6mm TEXT,
        grounding_cable_10x2mm TEXT,
        joint_thermal_liquid TEXT,
        grounding_clip TEXT,
        grounding_plate TEXT,
        grounding_rod TEXT,
        cable_16x3mm_length DECIMAL(10,2),
        cable_10x2mm_length DECIMAL(10,2),
        extra_pipes INTEGER,
        extra_pipes_reason TEXT,
        extra_cable DECIMAL(10,2),
        extra_cable_reason TEXT,
        fan_count INTEGER,
        submersible_pump BOOLEAN DEFAULT true,
        notes TEXT,
        created_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`ALTER TABLE well_solar_components ADD COLUMN IF NOT EXISTS fan_count INTEGER`);
    await db.execute(sql`ALTER TABLE well_solar_components ADD COLUMN IF NOT EXISTS submersible_pump BOOLEAN DEFAULT true`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS well_transport_details (
        id SERIAL PRIMARY KEY,
        well_id INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
        rail_type VARCHAR(20),
        with_panels BOOLEAN DEFAULT false,
        transport_price DECIMAL(12,2),
        crew_entitlements DECIMAL(12,2),
        transport_date DATE,
        notes TEXT,
        created_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`ALTER TABLE well_transport_details ADD COLUMN IF NOT EXISTS crew_entitlements DECIMAL(12,2)`);
    await db.execute(sql`ALTER TABLE well_transport_details ADD COLUMN IF NOT EXISTS transport_date DATE`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS well_receptions (
        id SERIAL PRIMARY KEY,
        well_id INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
        received_by VARCHAR REFERENCES users(id),
        receiver_name TEXT,
        inspection_status VARCHAR(50) DEFAULT 'pending',
        inspection_notes TEXT,
        received_at TIMESTAMP,
        notes TEXT,
        created_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    console.log('✅ تم تطبيق migrations توسعة الآبار بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تطبيق migrations توسعة الآبار:', error);
  }
}
