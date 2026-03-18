import { pool } from '../db';
import type { PoolClient } from 'pg';

async function markInvalid(projectId: string, fromDate: string): Promise<void> {
  const dateStr = String(fromDate || '').substring(0, 10);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
  await pool.query(`
    INSERT INTO summary_invalidations (project_id, invalidated_from, reason, created_at)
    VALUES ($1, $2, 'auto-invalidation', NOW())
  `, [projectId, dateStr]);
}

function dateToNum(d: string): number {
  return parseInt(d.replace(/-/g, ''), 10);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

async function computeDaySummaryWithClient(client: PoolClient, projectId: string, date: string, carriedForward: number): Promise<{
  totalIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  totalFundTransfers: number;
  totalWorkerWages: number;
  totalMaterialCosts: number;
  totalTransportationCosts: number;
  totalWorkerTransfers: number;
  totalWorkerMiscExpenses: number;
}> {
  const result = await client.query(`
    WITH day_income AS (
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
      FROM fund_transfers
      WHERE project_id = $1
        AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
        AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
        AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
    ),
    day_incoming_transfers AS (
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
      FROM project_fund_transfers
      WHERE to_project_id = $1
        AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
        AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
        AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
    ),
    day_outgoing_transfers AS (
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
      FROM project_fund_transfers
      WHERE from_project_id = $1
        AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
        AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
        AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
    ),
    day_wages AS (
      SELECT COALESCE(SUM(CAST(paid_amount AS DECIMAL(15,2))), 0) as total
      FROM worker_attendance
      WHERE project_id = $1
        AND date = $2
        AND CAST(paid_amount AS DECIMAL) > 0
    ),
    day_materials AS (
      SELECT COALESCE(SUM(
        CASE
          WHEN CAST(paid_amount AS DECIMAL) > 0 THEN CAST(paid_amount AS DECIMAL(15,2))
          ELSE CAST(total_amount AS DECIMAL(15,2))
        END
      ), 0) as total
      FROM material_purchases
      WHERE project_id = $1
        AND (purchase_type = 'نقد' OR purchase_type = 'نقداً')
        AND purchase_date = $2
    ),
    day_transport AS (
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
      FROM transportation_expenses
      WHERE project_id = $1 AND date = $2
    ),
    day_worker_transfers AS (
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
      FROM worker_transfers
      WHERE project_id = $1
        AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
        AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
        AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
    ),
    day_misc AS (
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
      FROM worker_misc_expenses
      WHERE project_id = $1 AND date = $2
    ),
    day_supplier_payments AS (
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
      FROM supplier_payments
      WHERE project_id = $1 AND payment_date = $2
    )
    SELECT
      (SELECT total FROM day_income) as fund_transfers,
      (SELECT total FROM day_incoming_transfers) as incoming_transfers,
      (SELECT total FROM day_outgoing_transfers) as outgoing_transfers,
      (SELECT total FROM day_wages) as worker_wages,
      (SELECT total FROM day_materials) as material_costs,
      (SELECT total FROM day_transport) as transport_costs,
      (SELECT total FROM day_worker_transfers) as worker_transfer_costs,
      (SELECT total FROM day_misc) as misc_costs,
      (SELECT total FROM day_supplier_payments) as supplier_payments
  `, [projectId, date]);

  const row = result.rows[0];
  const fundTransfers = Math.round(parseFloat(row.fund_transfers || '0'));
  const incomingTransfers = Math.round(parseFloat(row.incoming_transfers || '0'));
  const outgoingTransfers = Math.round(parseFloat(row.outgoing_transfers || '0'));
  const workerWages = Math.round(parseFloat(row.worker_wages || '0'));
  const materialCosts = Math.round(parseFloat(row.material_costs || '0'));
  const transportCosts = Math.round(parseFloat(row.transport_costs || '0'));
  const workerTransferCosts = Math.round(parseFloat(row.worker_transfer_costs || '0'));
  const miscCosts = Math.round(parseFloat(row.misc_costs || '0'));
  const supplierPay = Math.round(parseFloat(row.supplier_payments || '0'));

  const totalFundTransfers = fundTransfers + incomingTransfers;
  const totalExpenses = workerWages + materialCosts + transportCosts + workerTransferCosts + miscCosts + outgoingTransfers + supplierPay;
  const totalIncome = carriedForward + totalFundTransfers;
  const remainingBalance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    remainingBalance,
    totalFundTransfers,
    totalWorkerWages: workerWages,
    totalMaterialCosts: materialCosts,
    totalTransportationCosts: transportCosts,
    totalWorkerTransfers: workerTransferCosts,
    totalWorkerMiscExpenses: miscCosts,
  };
}

async function upsertDailySummary(
  client: PoolClient,
  projectId: string,
  date: string,
  carriedForward: number,
  data: {
    totalFundTransfers: number;
    totalWorkerWages: number;
    totalMaterialCosts: number;
    totalTransportationCosts: number;
    totalWorkerTransfers: number;
    totalWorkerMiscExpenses: number;
    totalIncome: number;
    totalExpenses: number;
    remainingBalance: number;
  }
): Promise<void> {
  await client.query(`
    INSERT INTO daily_expense_summaries (id, project_id, date, carried_forward_amount,
      total_fund_transfers, total_worker_wages, total_material_costs,
      total_transportation_costs, total_worker_transfers, total_worker_misc_expenses,
      total_income, total_expenses, remaining_balance, created_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (project_id, date)
    DO UPDATE SET
      carried_forward_amount = EXCLUDED.carried_forward_amount,
      total_fund_transfers = EXCLUDED.total_fund_transfers,
      total_worker_wages = EXCLUDED.total_worker_wages,
      total_material_costs = EXCLUDED.total_material_costs,
      total_transportation_costs = EXCLUDED.total_transportation_costs,
      total_worker_transfers = EXCLUDED.total_worker_transfers,
      total_worker_misc_expenses = EXCLUDED.total_worker_misc_expenses,
      total_income = EXCLUDED.total_income,
      total_expenses = EXCLUDED.total_expenses,
      remaining_balance = EXCLUDED.remaining_balance
  `, [
    projectId, date, String(carriedForward),
    String(data.totalFundTransfers), String(data.totalWorkerWages), String(data.totalMaterialCosts),
    String(data.totalTransportationCosts), String(data.totalWorkerTransfers), String(data.totalWorkerMiscExpenses),
    String(data.totalIncome), String(data.totalExpenses), String(data.remainingBalance)
  ]);
}

async function getActiveDatesWithClient(client: PoolClient, projectId: string, fromDate: string | null, toDate: string): Promise<string[]> {
  const params: string[] = [projectId, toDate];
  let outerFromCondition = '';
  if (fromDate) {
    params.push(fromDate);
    outerFromCondition = `AND sub_date >= $3`;
  }

  const result = await client.query(`
    SELECT DISTINCT sub_date FROM (
      SELECT SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) as sub_date
      FROM fund_transfers
      WHERE project_id = $1
        AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
        AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
        AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) <= $2
      UNION
      SELECT date as sub_date FROM worker_attendance
      WHERE project_id = $1 AND date IS NOT NULL AND date != '' AND date <= $2
      UNION
      SELECT purchase_date as sub_date FROM material_purchases
      WHERE project_id = $1 AND purchase_date IS NOT NULL AND purchase_date != '' AND purchase_date <= $2
      UNION
      SELECT date as sub_date FROM transportation_expenses
      WHERE project_id = $1 AND date IS NOT NULL AND date != '' AND date <= $2
      UNION
      SELECT SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) as sub_date
      FROM worker_transfers
      WHERE project_id = $1
        AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
        AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
        AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) <= $2
      UNION
      SELECT date as sub_date FROM worker_misc_expenses
      WHERE project_id = $1 AND date IS NOT NULL AND date != '' AND date <= $2
      UNION
      SELECT SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) as sub_date
      FROM project_fund_transfers
      WHERE (from_project_id = $1 OR to_project_id = $1)
        AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
        AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
        AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) <= $2
      UNION
      SELECT payment_date as sub_date FROM supplier_payments
      WHERE project_id = $1 AND payment_date IS NOT NULL AND payment_date != '' AND payment_date <= $2
    ) dates
    WHERE sub_date IS NOT NULL AND sub_date != ''
    ${outerFromCondition}
    ORDER BY sub_date ASC
  `, params);

  return result.rows.map((r: any) => r.sub_date);
}

async function ensureValidSummary(projectId: string, targetDate: string): Promise<void> {
  const invalidation = await pool.query(
    `SELECT MIN(invalidated_from) as invalidated_from FROM summary_invalidations WHERE project_id = $1`,
    [projectId]
  );
  if (invalidation.rows.length === 0 || !invalidation.rows[0].invalidated_from) return;
  const invalidFromDate = invalidation.rows[0].invalidated_from;
  if (dateToNum(invalidFromDate) > dateToNum(targetDate)) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockId = Math.abs(hashCode(projectId)) % 2147483647;
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockId]);

    const recheckResult = await client.query(
      `SELECT MIN(invalidated_from) as invalidated_from FROM summary_invalidations WHERE project_id = $1`,
      [projectId]
    );
    if (recheckResult.rows.length === 0 || !recheckResult.rows[0].invalidated_from) {
      await client.query('COMMIT');
      return;
    }
    const confirmedInvalidFrom = recheckResult.rows[0].invalidated_from;
    if (dateToNum(confirmedInvalidFrom) > dateToNum(targetDate)) {
      await client.query('COMMIT');
      return;
    }

    await client.query(
      `DELETE FROM daily_expense_summaries WHERE project_id = $1 AND date >= $2`,
      [projectId, confirmedInvalidFrom]
    );

    const lastValidResult = await client.query(`
      SELECT remaining_balance, date FROM daily_expense_summaries
      WHERE project_id = $1 AND date < $2
      ORDER BY date DESC LIMIT 1
    `, [projectId, confirmedInvalidFrom]);

    let carriedForward = 0;
    if (lastValidResult.rows.length > 0) {
      carriedForward = Math.round(parseFloat(lastValidResult.rows[0].remaining_balance || '0'));
    }

    const dates = await getActiveDatesWithClient(client, projectId, confirmedInvalidFrom, targetDate);

    for (const date of dates) {
      const daySummary = await computeDaySummaryWithClient(client, projectId, date, carriedForward);
      await upsertDailySummary(client, projectId, date, carriedForward, daySummary);
      carriedForward = daySummary.remainingBalance;
    }

    if (dates.length === 0 || dateToNum(dates[dates.length - 1]) < dateToNum(targetDate)) {
      const daySummary = await computeDaySummaryWithClient(client, projectId, targetDate, carriedForward);
      if (daySummary.totalIncome !== carriedForward || daySummary.totalExpenses !== 0) {
        await upsertDailySummary(client, projectId, targetDate, carriedForward, daySummary);
      }
    }

    await client.query(
      `DELETE FROM summary_invalidations WHERE project_id = $1 AND invalidated_from <= $2`,
      [projectId, targetDate]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[SummaryRebuildService] Error rebuilding summaries for project ${projectId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function rebuildProjectSummaries(projectId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockId = Math.abs(hashCode(projectId)) % 2147483647;
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockId]);

    await client.query(`DELETE FROM daily_expense_summaries WHERE project_id = $1`, [projectId]);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const dates = await getActiveDatesWithClient(client, projectId, null, todayStr);

    let carriedForward = 0;
    for (const date of dates) {
      const daySummary = await computeDaySummaryWithClient(client, projectId, date, carriedForward);
      await upsertDailySummary(client, projectId, date, carriedForward, daySummary);
      carriedForward = daySummary.remainingBalance;
    }

    await client.query(`DELETE FROM summary_invalidations WHERE project_id = $1`, [projectId]);
    await client.query('COMMIT');
    console.log(`[SummaryRebuildService] Full rebuild complete for project ${projectId}, processed ${dates.length} dates`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[SummaryRebuildService] Error in full rebuild for project ${projectId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export { markInvalid, ensureValidSummary, rebuildProjectSummaries };

export const SummaryRebuildService = {
  markInvalid,
  ensureValidSummary,
  rebuildProjectSummaries,
};
