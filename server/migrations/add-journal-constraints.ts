import { pool } from '../db';

export async function applyJournalConstraints(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_journal_lines_non_negative'
        ) THEN
          ALTER TABLE journal_lines ADD CONSTRAINT chk_journal_lines_non_negative
            CHECK (CAST(debit_amount AS DECIMAL) >= 0 AND CAST(credit_amount AS DECIMAL) >= 0);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_journal_lines_single_side'
        ) THEN
          ALTER TABLE journal_lines ADD CONSTRAINT chk_journal_lines_single_side
            CHECK (NOT (CAST(debit_amount AS DECIMAL) > 0 AND CAST(credit_amount AS DECIMAL) > 0));
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_source_unique
        ON journal_entries (source_table, source_id, project_id)
        WHERE status = 'posted' AND entry_type = 'original';
    `);

    await client.query(`
      INSERT INTO account_types (code, name, type, category)
      VALUES ('1200', 'أصول مخزون', 'asset', 'current_assets')
      ON CONFLICT (code) DO NOTHING;
    `).catch(() => {
      console.log('[Journal Constraints] account_types table may not exist or has different schema, skipping account insert');
    });

    console.log('✅ [Journal Constraints] Applied DB safety constraints successfully');
  } catch (error: any) {
    console.error('⚠️ [Journal Constraints] Error applying constraints:', error.message);
  } finally {
    client.release();
  }
}
