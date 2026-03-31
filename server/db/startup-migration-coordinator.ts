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

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_posting_results_canonical_success
      ON wa_posting_results (canonical_transaction_id)
      WHERE posting_status = 'success';
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_posting_results_idempotency_success
      ON wa_posting_results (idempotency_key)
      WHERE posting_status = 'success';
    `);

    const waCheckConstraints = [
      { table: 'wa_extraction_candidates', col: 'candidate_type', vals: ['expense','transfer','loan','personal_account','custodian_receipt','settlement','salary','inline_expense','structured_receipt'] },
      { table: 'wa_extraction_candidates', col: 'match_status', vals: ['exact_match','near_match','conflict','new_entry'] },
      { table: 'wa_media_assets', col: 'media_status', vals: ['processed','skipped_too_large','skipped_unsupported','error','ocr_completed','ai_analyzed','ocr_failed','pending'] },
      { table: 'wa_posting_results', col: 'posting_status', vals: ['success','failed','skipped_duplicate'] },
      { table: 'wa_verification_queue', col: 'priority', vals: ['P1_critical','P2_high','P3_medium','P4_low'] },
    ];
    for (const c of waCheckConstraints) {
      const constraintName = `chk_${c.table}_${c.col}`;
      const valList = c.vals.map(v => `'${v}'`).join(', ');
      await client.query(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}') THEN
            ALTER TABLE ${c.table} DROP CONSTRAINT ${constraintName};
          END IF;
          ALTER TABLE ${c.table} ADD CONSTRAINT ${constraintName}
            CHECK (${c.col} IN (${valList}));
        END $$;
      `);
    }

    try {
      await client.query(`ALTER TABLE wa_canonical_transactions ADD COLUMN IF NOT EXISTS review_notes TEXT`);
      console.log("✅ [Migration] review_notes column ensured on wa_canonical_transactions");
    } catch (e: any) {
      console.warn("⚠️ [Migration] review_notes column migration skipped:", e.message);
    }

    try {
      await client.query(`ALTER TABLE worker_settlements ADD COLUMN IF NOT EXISTS idempotency_key TEXT`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_settlements_idempotency ON worker_settlements (idempotency_key) WHERE idempotency_key IS NOT NULL AND status = 'completed'`);
      console.log("✅ [Migration] settlement idempotency_key column + unique index ensured");
    } catch (e: any) {
      console.warn("⚠️ [Migration] settlement idempotency migration skipped:", e.message);
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_wa_extraction_candidates_batch_id ON wa_extraction_candidates (batch_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_wa_extraction_candidates_canonical ON wa_extraction_candidates (canonical_transaction_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_wa_verification_queue_candidate ON wa_verification_queue (candidate_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_wa_raw_messages_batch ON wa_raw_messages (batch_id)`);
      console.log("✅ [Migrations] WA import indexes created successfully");
    } catch (err) {
      console.error("⚠️ [Migrations] WA import indexes error (non-fatal):", err);
    }

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
