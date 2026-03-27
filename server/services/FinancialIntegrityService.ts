import { db, pool } from '../db.js';
import { workerAttendance, workerBalances, workerTransfers, financialAuditLog, reconciliationRecords } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export class FinancialIntegrityService {

  static async syncWorkerBalance(workerId: string, projectId: string): Promise<void> {
    await pool.query(`
      INSERT INTO worker_balances (id, worker_id, project_id, total_earned, total_paid, total_transferred, current_balance, last_updated, created_at)
      SELECT gen_random_uuid(), $1, $2,
        COALESCE(a.total_earned, 0), COALESCE(a.total_paid, 0), COALESCE(t.total_transferred, 0),
        COALESCE(a.total_earned, 0) - COALESCE(a.total_paid, 0) - COALESCE(t.total_transferred, 0),
        NOW(), NOW()
      FROM (
        SELECT SUM(CASE WHEN actual_wage IS NOT NULL AND actual_wage::text != '' AND actual_wage::text != 'NaN' THEN CAST(actual_wage AS DECIMAL(15,2)) ELSE CAST(COALESCE(NULLIF(daily_wage,''),'0') AS DECIMAL(15,2)) * CAST(COALESCE(NULLIF(work_days,''),'0') AS DECIMAL(15,2)) END) as total_earned,
               SUM(CAST(COALESCE(paid_amount,'0') AS DECIMAL(15,2))) as total_paid
        FROM worker_attendance WHERE worker_id = $1 AND project_id = $2
      ) a
      CROSS JOIN (
        SELECT COALESCE(SUM(CAST(COALESCE(amount,'0') AS DECIMAL(15,2))), 0) as total_transferred
        FROM worker_transfers WHERE worker_id = $1 AND project_id = $2
          AND COALESCE(transfer_method, '') != 'settlement'
      ) t
      ON CONFLICT (worker_id, project_id) DO UPDATE SET
        total_earned = EXCLUDED.total_earned,
        total_paid = EXCLUDED.total_paid,
        total_transferred = EXCLUDED.total_transferred,
        current_balance = EXCLUDED.current_balance,
        last_updated = NOW()
    `, [workerId, projectId]);
  }

  static async logFinancialChange(params: {
    projectId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    previousData?: any;
    newData?: any;
    changedFields?: any;
    userId?: string | null;
    userEmail?: string | null;
    reason?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const safeProjectId = params.projectId
        ? (await pool.query('SELECT id FROM projects WHERE id = $1', [params.projectId])).rows.length > 0
          ? params.projectId : null
        : null;

      await pool.query(`
        INSERT INTO financial_audit_log (project_id, action, entity_type, entity_id, previous_data, new_data, changed_fields, user_id, user_email, reason, ip_address, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        safeProjectId, params.action, params.entityType, params.entityId,
        params.previousData ? JSON.stringify(params.previousData) : null,
        params.newData ? JSON.stringify(params.newData) : null,
        params.changedFields ? JSON.stringify(params.changedFields) : null,
        params.userId || null, params.userEmail || null,
        params.reason || null, params.ipAddress || null
      ]);
    } catch (err) {
      console.error('[FinancialIntegrity] Audit log error:', err);
    }
  }

  static async runReconciliation(projectId?: string): Promise<{
    totalWorkers: number;
    totalChecked: number;
    discrepancies: Array<{
      workerId: string;
      workerName: string;
      projectId: string;
      projectName: string;
      storedBalance: number;
      computedBalance: number;
      difference: number;
    }>;
    missingBalanceRows: number;
    attendanceMismatches: number;
    negativeBalances: Array<{
      workerId: string;
      workerName: string;
      projectId: string;
      projectName: string;
      balance: number;
    }>;
    status: 'healthy' | 'warning' | 'critical';
    timestamp: string;
  }> {
    const params = projectId ? [projectId] : [];

    const balanceCheck = await pool.query(`
      SELECT wb.worker_id, w.name as worker_name, wb.project_id, p.name as project_name,
        CAST(wb.current_balance AS DECIMAL(15,2)) as stored_balance,
        (
          COALESCE((SELECT SUM(CASE WHEN actual_wage IS NOT NULL AND actual_wage::text != '' AND actual_wage::text != 'NaN' THEN CAST(actual_wage AS DECIMAL(15,2)) ELSE CAST(COALESCE(NULLIF(daily_wage,''),'0') AS DECIMAL(15,2)) * CAST(COALESCE(NULLIF(work_days,''),'0') AS DECIMAL(15,2)) END) FROM worker_attendance wa WHERE wa.worker_id=wb.worker_id AND wa.project_id=wb.project_id), 0)
          - COALESCE((SELECT SUM(CAST(COALESCE(paid_amount,'0') AS DECIMAL(15,2))) FROM worker_attendance wa WHERE wa.worker_id=wb.worker_id AND wa.project_id=wb.project_id), 0)
          - COALESCE((SELECT SUM(CAST(COALESCE(amount,'0') AS DECIMAL(15,2))) FROM worker_transfers wt WHERE wt.worker_id=wb.worker_id AND wt.project_id=wb.project_id AND COALESCE(wt.transfer_method,'')!='settlement'), 0)
        ) as computed_balance
      FROM worker_balances wb
      JOIN workers w ON w.id = wb.worker_id
      JOIN projects p ON p.id = wb.project_id
      ${projectId ? 'WHERE wb.project_id = $1' : ''}
    `, params);

    const discrepancies = balanceCheck.rows
      .filter(r => Math.abs(parseFloat(r.stored_balance) - parseFloat(r.computed_balance)) > 0.01)
      .map(r => ({
        workerId: r.worker_id,
        workerName: r.worker_name,
        projectId: r.project_id,
        projectName: r.project_name,
        storedBalance: parseFloat(r.stored_balance),
        computedBalance: parseFloat(r.computed_balance),
        difference: parseFloat(r.stored_balance) - parseFloat(r.computed_balance)
      }));

    const missingBalanceCheck = await pool.query(`
      SELECT COUNT(DISTINCT (wa.worker_id, wa.project_id)) as cnt
      FROM worker_attendance wa
      WHERE NOT EXISTS (
        SELECT 1 FROM worker_balances wb 
        WHERE wb.worker_id = wa.worker_id AND wb.project_id = wa.project_id
      )
      ${projectId ? 'AND wa.project_id = $1' : ''}
    `, params);

    const attendanceMismatchCount = await pool.query(`
      SELECT COUNT(*) as cnt FROM worker_attendance
      WHERE CAST(COALESCE(actual_wage, '0') AS DECIMAL(15,2)) != 
            (CAST(COALESCE(daily_wage, '0') AS DECIMAL(15,2)) * CAST(COALESCE(work_days, '0') AS DECIMAL(15,2)))
      ${projectId ? 'AND project_id = $1' : ''}
    `, params);

    const negativeBalances = balanceCheck.rows
      .filter(r => parseFloat(r.computed_balance) < -100)
      .map(r => ({
        workerId: r.worker_id,
        workerName: r.worker_name,
        projectId: r.project_id,
        projectName: r.project_name,
        balance: parseFloat(r.computed_balance)
      }))
      .sort((a, b) => a.balance - b.balance);

    const missingRows = parseInt(missingBalanceCheck.rows[0].cnt);
    const status = (discrepancies.length > 0 || missingRows > 0) ? 'critical' :
      negativeBalances.length > 5 ? 'warning' : 'healthy';

    const result = {
      totalWorkers: balanceCheck.rows.length,
      totalChecked: balanceCheck.rows.length,
      discrepancies,
      missingBalanceRows: missingRows,
      attendanceMismatches: parseInt(attendanceMismatchCount.rows[0].cnt),
      negativeBalances,
      status: status as 'healthy' | 'warning' | 'critical',
      timestamp: new Date().toISOString()
    };

    try {
      const safeProjectId = projectId
        ? (await pool.query('SELECT id FROM projects WHERE id = $1', [projectId])).rows.length > 0
          ? projectId : (await pool.query('SELECT id FROM projects LIMIT 1')).rows[0]?.id
        : (await pool.query('SELECT id FROM projects LIMIT 1')).rows[0]?.id;

      if (safeProjectId) {
        await pool.query(`
          INSERT INTO reconciliation_records (project_id, reconciliation_date, ledger_balance, computed_balance, discrepancy, status, notes, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          safeProjectId,
          new Date().toISOString().split('T')[0],
          balanceCheck.rows.reduce((sum: number, r: any) => sum + parseFloat(r.stored_balance || 0), 0).toString(),
          balanceCheck.rows.reduce((sum: number, r: any) => sum + parseFloat(r.computed_balance || 0), 0).toString(),
          discrepancies.reduce((sum, d) => sum + Math.abs(d.difference), 0).toString(),
          status === 'healthy' ? 'matched' : 'discrepancy',
          JSON.stringify({ discrepancies: discrepancies.length, missingBalanceRows: missingRows, negativeBalances: negativeBalances.length, attendanceMismatches: result.attendanceMismatches })
        ]);
      }
    } catch (err) {
      console.error('[Reconciliation] Record save error:', err);
    }

    return result;
  }

  static async rebuildAllBalances(): Promise<{ rebuilt: number; verified: number }> {
    const result = await pool.query(`
      WITH deleted AS (DELETE FROM worker_balances RETURNING 1),
      rebuilt AS (
        INSERT INTO worker_balances (id, worker_id, project_id, total_earned, total_paid, total_transferred, current_balance, last_updated, created_at)
        SELECT gen_random_uuid(), c.worker_id, c.project_id, c.total_earned, c.total_paid,
          COALESCE(t.total_transferred, 0),
          c.total_earned - c.total_paid - COALESCE(t.total_transferred, 0),
          NOW(), NOW()
        FROM (
          SELECT worker_id, project_id,
            SUM(CASE WHEN actual_wage IS NOT NULL AND actual_wage::text != '' AND actual_wage::text != 'NaN' THEN CAST(actual_wage AS DECIMAL(15,2)) ELSE CAST(COALESCE(NULLIF(daily_wage,''),'0') AS DECIMAL(15,2)) * CAST(COALESCE(NULLIF(work_days,''),'0') AS DECIMAL(15,2)) END) as total_earned,
            SUM(CAST(COALESCE(paid_amount,'0') AS DECIMAL(15,2))) as total_paid
          FROM worker_attendance GROUP BY worker_id, project_id
        ) c
        LEFT JOIN (
          SELECT worker_id, project_id, SUM(CAST(COALESCE(amount,'0') AS DECIMAL(15,2))) as total_transferred
          FROM worker_transfers WHERE COALESCE(transfer_method,'') != 'settlement'
          GROUP BY worker_id, project_id
        ) t ON t.worker_id = c.worker_id AND t.project_id = c.project_id
        RETURNING id
      )
      SELECT (SELECT COUNT(*) FROM rebuilt) as rebuilt
    `);

    return {
      rebuilt: parseInt(result.rows[0].rebuilt),
      verified: 0
    };
  }

  static async getBalanceWarnings(workerId: string, projectId: string): Promise<{
    isNegative: boolean;
    balance: number;
    warning?: string;
  }> {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN actual_wage IS NOT NULL AND actual_wage::text != '' AND actual_wage::text != 'NaN' THEN CAST(actual_wage AS DECIMAL(15,2)) ELSE CAST(COALESCE(NULLIF(daily_wage,''),'0') AS DECIMAL(15,2)) * CAST(COALESCE(NULLIF(work_days,''),'0') AS DECIMAL(15,2)) END), 0)
        - COALESCE(SUM(CAST(COALESCE(paid_amount,'0') AS DECIMAL(15,2))), 0) as net
      FROM worker_attendance WHERE worker_id = $1 AND project_id = $2
    `, [workerId, projectId]);

    const transfers = await pool.query(`
      SELECT COALESCE(SUM(CAST(COALESCE(amount,'0') AS DECIMAL(15,2))), 0) as total
      FROM worker_transfers WHERE worker_id = $1 AND project_id = $2
        AND COALESCE(transfer_method, '') != 'settlement'
    `, [workerId, projectId]);

    const balance = parseFloat(result.rows[0].net) - parseFloat(transfers.rows[0].total);

    return {
      isNegative: balance < 0,
      balance,
      warning: balance < -10000 ? `تحذير: رصيد العامل سالب بمبلغ كبير (${balance})` :
        balance < 0 ? `تنبيه: رصيد العامل سالب (${balance})` : undefined
    };
  }
}
