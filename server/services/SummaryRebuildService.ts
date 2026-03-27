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
        AND COALESCE(NULLIF(date,''), attendance_date) = $2
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
  const toTwo = (v: string) => Math.round(parseFloat(v || '0') * 100) / 100;
  const fundTransfers = toTwo(row.fund_transfers);
  const incomingTransfers = toTwo(row.incoming_transfers);
  const outgoingTransfers = toTwo(row.outgoing_transfers);
  const workerWages = toTwo(row.worker_wages);
  const materialCosts = toTwo(row.material_costs);
  const transportCosts = toTwo(row.transport_costs);
  const workerTransferCosts = toTwo(row.worker_transfer_costs);
  const miscCosts = toTwo(row.misc_costs);
  const supplierPay = toTwo(row.supplier_payments);

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
      SELECT COALESCE(NULLIF(date,''), attendance_date) as sub_date FROM worker_attendance
      WHERE project_id = $1 AND COALESCE(NULLIF(date,''), attendance_date) IS NOT NULL AND COALESCE(NULLIF(date,''), attendance_date) != '' AND COALESCE(NULLIF(date,''), attendance_date) <= $2
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
  const hasInvalidation = invalidation.rows.length > 0 && !!invalidation.rows[0].invalidated_from;
  const invalidFromDate = hasInvalidation ? invalidation.rows[0].invalidated_from : null;
  const invalidationRelevant = hasInvalidation && dateToNum(invalidFromDate!) <= dateToNum(targetDate);

  if (!invalidationRelevant) {
    const summaryCheck = await pool.query(
      `SELECT 1 FROM daily_expense_summaries WHERE project_id = $1 AND date = $2 LIMIT 1`,
      [projectId, targetDate]
    );
    if (summaryCheck.rows.length > 0) return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockId = Math.abs(hashCode(projectId)) % 2147483647;
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockId]);

    const recheckInvalidation = await client.query(
      `SELECT MIN(invalidated_from) as invalidated_from FROM summary_invalidations WHERE project_id = $1`,
      [projectId]
    );
    const hasInvalidationNow = recheckInvalidation.rows.length > 0 && !!recheckInvalidation.rows[0].invalidated_from;
    const confirmedInvalidFrom = hasInvalidationNow ? recheckInvalidation.rows[0].invalidated_from : null;
    const invalidationRelevantNow = hasInvalidationNow && dateToNum(confirmedInvalidFrom!) <= dateToNum(targetDate);

    const recheckSummary = await client.query(
      `SELECT 1 FROM daily_expense_summaries WHERE project_id = $1 AND date = $2 LIMIT 1`,
      [projectId, targetDate]
    );
    if (!invalidationRelevantNow && recheckSummary.rows.length > 0) {
      await client.query('COMMIT');
      return;
    }

    let rebuildFromDate: string;
    if (invalidationRelevantNow) {
      rebuildFromDate = confirmedInvalidFrom!;
      await client.query(
        `DELETE FROM daily_expense_summaries WHERE project_id = $1 AND date >= $2`,
        [projectId, rebuildFromDate]
      );
    } else {
      const lastSummary = await client.query(`
        SELECT date FROM daily_expense_summaries
        WHERE project_id = $1 AND date < $2
        ORDER BY date DESC LIMIT 1
      `, [projectId, targetDate]);
      if (lastSummary.rows.length > 0) {
        const lastDate = new Date(lastSummary.rows[0].date);
        lastDate.setDate(lastDate.getDate() + 1);
        rebuildFromDate = lastDate.toISOString().substring(0, 10);
      } else {
        const firstActivity = await client.query(`
          SELECT MIN(sub_date) as first_date FROM (
            SELECT COALESCE(NULLIF(date,''), attendance_date) as sub_date FROM worker_attendance WHERE project_id = $1 AND COALESCE(NULLIF(date,''), attendance_date) IS NOT NULL AND COALESCE(NULLIF(date,''), attendance_date) != ''
            UNION SELECT purchase_date FROM material_purchases WHERE project_id = $1 AND purchase_date IS NOT NULL AND purchase_date != ''
            UNION SELECT date FROM transportation_expenses WHERE project_id = $1 AND date IS NOT NULL AND date != ''
            UNION SELECT SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) FROM fund_transfers WHERE project_id = $1 AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
            UNION SELECT date FROM worker_misc_expenses WHERE project_id = $1 AND date IS NOT NULL AND date != ''
            UNION SELECT SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) FROM worker_transfers WHERE project_id = $1 AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
            UNION SELECT SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) FROM project_fund_transfers WHERE (from_project_id = $1 OR to_project_id = $1) AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
            UNION SELECT SUBSTRING(CAST(payment_date AS TEXT) FROM 1 FOR 10) FROM supplier_payments WHERE project_id = $1 AND payment_date IS NOT NULL AND CAST(payment_date AS TEXT) != ''
          ) all_dates
        `, [projectId]);
        rebuildFromDate = firstActivity.rows[0]?.first_date || targetDate;
      }
    }

    const lastValidResult = await client.query(`
      SELECT remaining_balance, date FROM daily_expense_summaries
      WHERE project_id = $1 AND date < $2
      ORDER BY date DESC LIMIT 1
    `, [projectId, rebuildFromDate]);

    let carriedForward = 0;
    if (lastValidResult.rows.length > 0) {
      carriedForward = Math.round(parseFloat(lastValidResult.rows[0].remaining_balance || '0') * 100) / 100;
    }

    const dates = await getActiveDatesWithClient(client, projectId, rebuildFromDate, targetDate);

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

    if (invalidationRelevantNow) {
      await client.query(
        `DELETE FROM summary_invalidations WHERE project_id = $1 AND invalidated_from <= $2`,
        [projectId, targetDate]
      );
    }
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
