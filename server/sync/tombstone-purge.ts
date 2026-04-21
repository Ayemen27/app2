import { pool } from "../db";

/**
 * TombstonePurgeService
 * Purges (hard deletes) soft-deleted records older than a specific retention period.
 */
export class TombstonePurgeService {
  private static instance: TombstonePurgeService;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly SYNC_TABLES = [
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

  private constructor() {}

  public static getInstance(): TombstonePurgeService {
    if (!TombstonePurgeService.instance) {
      TombstonePurgeService.instance = new TombstonePurgeService();
    }
    return TombstonePurgeService.instance;
  }

  public async start(): Promise<void> {
    const enabled = process.env.TOMBSTONE_PURGE_ENABLED !== 'false'; // Default to true
    if (!enabled) {
      console.log('⏸️ [TombstonePurge] Service disabled via environment variable.');
      return;
    }

    console.log('🚀 [TombstonePurge] Service starting...');
    
    // Run once on startup after a short delay
    setTimeout(() => this.runPurge(), 30000);

    // Schedule to run every 24 hours
    this.intervalId = setInterval(() => this.runPurge(), 24 * 60 * 60 * 1000);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 [TombstonePurge] Service stopped.');
  }

  public async runPurge(): Promise<void> {
    const retentionDays = parseInt(process.env.TOMBSTONE_RETENTION_DAYS || '90', 10);
    console.log(`🧹 [TombstonePurge] Starting purge for records older than ${retentionDays} days...`);

    const client = await pool.connect();
    try {
      // Use pg_advisory_lock to prevent concurrent runs (lock ID 123456)
      const lockAcquired = await client.query('SELECT pg_try_advisory_lock(123456) as acquired');
      if (!lockAcquired.rows[0].acquired) {
        console.warn('⚠️ [TombstonePurge] Another instance is already running the purge. Skipping.');
        return;
      }

      let totalDeleted = 0;
      const stats: Record<string, number> = {};

      for (const table of this.SYNC_TABLES) {
        try {
          // Check if table exists
          const exists = await client.query(
            `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
            [table]
          );
          if (exists.rowCount === 0) continue;

          const result = await client.query(`
            DELETE FROM "${table}"
            WHERE deleted_at IS NOT NULL
            AND deleted_at < NOW() - INTERVAL '${retentionDays} days'
          `);

          if (result.rowCount && result.rowCount > 0) {
            stats[table] = result.rowCount;
            totalDeleted += result.rowCount;
            console.log(`✅ [TombstonePurge] Deleted ${result.rowCount} records from ${table}`);
          }
        } catch (err: any) {
          console.error(`❌ [TombstonePurge] Failed to purge table ${table}:`, err.message);
        }
      }

      console.log(`🏁 [TombstonePurge] Purge complete. Total deleted: ${totalDeleted}`);
      
      // Release lock
      await client.query('SELECT pg_advisory_unlock(123456)');
    } finally {
      client.release();
    }
  }

  public async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    const client = await pool.connect();
    try {
      for (const table of this.SYNC_TABLES) {
        try {
          const exists = await client.query(
            `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
            [table]
          );
          if (exists.rowCount === 0) continue;

          const result = await client.query(`
            SELECT COUNT(*) as count FROM "${table}" WHERE deleted_at IS NOT NULL
          `);
          stats[table] = parseInt(result.rows[0].count, 10);
        } catch (err) {}
      }
    } finally {
      client.release();
    }
    return stats;
  }
}

export const tombstonePurgeService = TombstonePurgeService.getInstance();
