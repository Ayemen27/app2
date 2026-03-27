import { pool, db } from "../db";
import { sql } from "drizzle-orm";
import { runWellExpansionMigrations } from "./run-well-expansion-migrations";
import { runInventoryMigrations } from "./run-inventory-migrations";
import { applyJournalConstraints } from "../migrations/add-journal-constraints";

const MIGRATION_LOCK_ID = 900100;

export async function runAllStartupMigrations(): Promise<void> {
  const instanceId = process.env.NODE_APP_INSTANCE || process.env.pm_id || "0";

  if (instanceId !== "0" && instanceId !== undefined) {
    console.log(`⏭️ [Migrations] تخطي - instance #${instanceId} (فقط instance 0 ينفذ migrations)`);
    return;
  }

  const client = await pool.connect();
  let lockAcquired = false;

  try {
    const lockResult = await client.query(
      `SELECT pg_try_advisory_lock($1) AS locked`,
      [MIGRATION_LOCK_ID]
    );
    lockAcquired = lockResult.rows[0]?.locked === true;

    if (!lockAcquired) {
      console.log("⏳ [Migrations] instance أخرى تنفذ migrations حالياً - تخطي");
      return;
    }

    console.log("🔒 [Migrations] تم الحصول على قفل migrations - بدء التنفيذ...");

    await runWellExpansionMigrations();
    await runInventoryMigrations();
    await applyJournalConstraints();
    await db.execute(sql`ALTER TABLE build_deployments ADD COLUMN IF NOT EXISTS release_notes TEXT`);

    await client.query(`
      CREATE OR REPLACE FUNCTION safe_numeric(v text, d numeric DEFAULT 0)
      RETURNS numeric
      LANGUAGE plpgsql
      IMMUTABLE
      AS $$
      DECLARE t text;
      BEGIN
        IF v IS NULL THEN RETURN d; END IF;
        t := replace(btrim(v), ',', '');
        IF t = '' OR lower(t) IN ('nan','inf','+inf','-inf','infinity','+infinity','-infinity') THEN
          RETURN d;
        END IF;
        IF t ~ '^[+-]?((\\d+(\\.\\d*)?)|(\\.\\d+))([eE][+-]?\\d+)?$' THEN
          RETURN t::numeric;
        END IF;
        RETURN d;
      EXCEPTION WHEN others THEN
        RETURN d;
      END;
      $$;
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION safe_numeric_logged(v text, d numeric DEFAULT 0, ctx text DEFAULT 'unknown')
      RETURNS numeric
      LANGUAGE plpgsql
      STABLE
      AS $$
      DECLARE result numeric;
      BEGIN
        result := safe_numeric(v, d);
        IF result = d AND v IS NOT NULL AND btrim(v) != '' AND btrim(v) NOT IN ('0', '0.0', '0.00', '+0', '-0') THEN
          RAISE WARNING '[safe_numeric] fallback to default for value=% in context=%', v, ctx;
        END IF;
        RETURN result;
      END;
      $$;
    `);

    console.log("✅ [Migrations] تم تنفيذ جميع migrations بنجاح");
  } catch (error) {
    console.error("❌ [Migrations] خطأ أثناء تنفيذ migrations:", error);
    throw error;
  } finally {
    if (lockAcquired) {
      await client.query(`SELECT pg_advisory_unlock($1)`, [MIGRATION_LOCK_ID]).catch(() => {});
    }
    client.release();
  }
}
