import type { Pool } from "pg";

/**
 * 🕐 G1 + G2: Hybrid Logical Clock + Tombstones (Soft Delete)
 *
 * Additive migration — لا يحذف ولا يعدّل بيانات قائمة:
 *  - يضيف عمود `hlc_timestamp TEXT NULL` (مرجع أزمنة موزّع لحل النزاعات)
 *  - يضيف عمود `deleted_at TIMESTAMPTZ NULL` (tombstone للحذف الناعم)
 *  - يضيف فهارس جزئية لتسريع pull (WHERE deleted_at IS NULL)
 *
 * السجلات القديمة: hlc_timestamp = NULL تُعامل كأقدم؛ deleted_at = NULL تعني نشطة.
 */

const SYNC_TABLES = [
  "projects",
  "workers",
  "wells",
  "fund_transfers",
  "worker_attendance",
  "suppliers",
  "materials",
  "material_purchases",
  "supplier_payments",
  "transportation_expenses",
  "worker_transfers",
  "worker_balances",
  "daily_expense_summaries",
  "worker_misc_expenses",
  "project_fund_transfers",
  "well_tasks",
  "well_expenses",
  "equipment",
  "equipment_movements",
  "well_work_crews",
  "well_crew_workers",
  "well_solar_components",
  "well_transport_details",
  "well_receptions",
  "worker_settlements",
  "worker_settlement_lines",
  "autocomplete_data",
  "material_categories",
  "project_types",
  "worker_types",
  "print_settings",
] as const;

export async function applyHlcTombstoneMigration(pool: Pool): Promise<void> {
  const client = await pool.connect();
  let added = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for (const table of SYNC_TABLES) {
      try {
        // تحقق من وجود الجدول
        const exists = await client.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
          [table]
        );
        if (exists.rowCount === 0) {
          skipped++;
          continue;
        }

        await client.query(`
          ALTER TABLE "${table}"
            ADD COLUMN IF NOT EXISTS hlc_timestamp TEXT NULL,
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
        `);

        // فهرس جزئي للسجلات النشطة (يسرّع 95٪ من القراءات)
        await client.query(`
          CREATE INDEX IF NOT EXISTS "idx_${table}_active"
          ON "${table}" (id) WHERE deleted_at IS NULL
        `);

        // فهرس على hlc_timestamp + deleted_at للـ incremental pull
        await client.query(`
          CREATE INDEX IF NOT EXISTS "idx_${table}_hlc"
          ON "${table}" (hlc_timestamp) WHERE hlc_timestamp IS NOT NULL
        `);

        added++;
      } catch (err: any) {
        failed++;
        console.warn(
          `⚠️ [HLC/Tombstones] فشل على جدول ${table}:`,
          err?.message || err
        );
      }
    }

    console.log(
      `✅ [HLC/Tombstones] migration مكتمل: مُطبّق=${added}, متخطّى=${skipped}, فاشل=${failed}`
    );
  } finally {
    client.release();
  }
}
