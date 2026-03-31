/**
 * BatchFinancialStatsService
 * --------------------------
 * Replaces N×13 individual SQL queries with a single CTE-based query that
 * aggregates financial stats for ALL projects in one round-trip.
 *
 * Performance: O(1) queries instead of O(N×13)
 * For 20 projects: 260 queries → 1 query
 */

import { pool } from '../db';

export interface ProjectFinancialStats {
  id: string;
  name: string;
  status: string;
  totalWorkers: number;
  activeWorkers: number;
  completedDays: number;
  materialCashTotal: number;
  materialCreditTotal: number;
  workerWagesTotal: number;
  transportationTotal: number;
  workerTransfersTotal: number;
  miscExpensesTotal: number;
  fundTransfersTotal: number;
  projectTransfersOutTotal: number;
  projectTransfersInTotal: number;
  supplierPaymentsTotal: number;
  totalExpenses: number;
  totalIncome: number;
  cashBalance: number;
  totalBalance: number;
}

export class BatchFinancialStatsService {

  /**
   * Fetch financial summaries for all projects (or a subset) in a single CTE query.
   * @param projectIds Optional array of project IDs to filter. If empty/null, fetches all.
   */
  static async getAllProjectsStats(projectIds?: string[]): Promise<ProjectFinancialStats[]> {
    const hasFilter = projectIds && projectIds.length > 0;

    const projectFilter = hasFilter
      ? `WHERE p.id = ANY($1::text[])`
      : ``;

    const params: any[] = hasFilter ? [projectIds] : [];

    const query = `
      WITH
      material_cash AS (
        SELECT project_id,
          COALESCE(SUM(
            CASE
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND safe_numeric(paid_amount::text, 0) > 0
                THEN safe_numeric(paid_amount::text, 0)
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد')
                THEN safe_numeric(total_amount::text, 0)
              ELSE 0
            END
          ), 0) AS total
        FROM material_purchases
        WHERE (purchase_type = 'نقداً' OR purchase_type = 'نقد')
          ${hasFilter ? 'AND project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      ),
      material_credit AS (
        SELECT project_id,
          COALESCE(SUM(
            safe_numeric(total_amount::text, 0) - safe_numeric(paid_amount::text, 0)
          ), 0) AS total
        FROM material_purchases
        WHERE (purchase_type = 'آجل' OR purchase_type = 'اجل')
          ${hasFilter ? 'AND project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      ),
      worker_wages AS (
        SELECT project_id,
          COALESCE(SUM(safe_numeric(paid_amount::text, 0)), 0) AS total,
          COUNT(DISTINCT COALESCE(NULLIF(date, ''), attendance_date)) AS completed_days
        FROM worker_attendance
        WHERE (safe_numeric(paid_amount::text, 0) > 0 OR safe_numeric(work_days::text, 0) > 0)
          ${hasFilter ? 'AND project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      ),
      transport AS (
        SELECT project_id,
          COALESCE(SUM(safe_numeric(amount::text, 0)), 0) AS total
        FROM transportation_expenses
        ${hasFilter ? 'WHERE project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      ),
      worker_trf AS (
        SELECT project_id,
          COALESCE(SUM(safe_numeric(amount::text, 0)), 0) AS total
        FROM worker_transfers
        ${hasFilter ? 'WHERE project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      ),
      misc_exp AS (
        SELECT project_id,
          COALESCE(SUM(safe_numeric(amount::text, 0)), 0) AS total
        FROM worker_misc_expenses
        ${hasFilter ? 'WHERE project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      ),
      fund_trf AS (
        SELECT project_id,
          COALESCE(SUM(safe_numeric(amount::text, 0)), 0) AS total
        FROM fund_transfers
        ${hasFilter ? 'WHERE project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      ),
      proj_trf_out AS (
        SELECT from_project_id AS project_id,
          COALESCE(SUM(safe_numeric(amount::text, 0)), 0) AS total
        FROM project_fund_transfers
        WHERE (transfer_reason IS NULL OR transfer_reason != 'legacy_worker_rebalance')
          ${hasFilter ? 'AND from_project_id = ANY($1::text[])' : ''}
        GROUP BY from_project_id
      ),
      proj_trf_in AS (
        SELECT to_project_id AS project_id,
          COALESCE(SUM(safe_numeric(amount::text, 0)), 0) AS total
        FROM project_fund_transfers
        WHERE (transfer_reason IS NULL OR transfer_reason != 'legacy_worker_rebalance')
          ${hasFilter ? 'AND to_project_id = ANY($1::text[])' : ''}
        GROUP BY to_project_id
      ),
      workers_agg AS (
        SELECT wa.project_id,
          COUNT(DISTINCT wa.worker_id) AS total_workers,
          COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) AS active_workers
        FROM worker_attendance wa
        INNER JOIN workers w ON wa.worker_id = w.id
        ${hasFilter ? 'WHERE wa.project_id = ANY($1::text[])' : ''}
        GROUP BY wa.project_id
      ),
      supplier_pay AS (
        SELECT project_id,
          COALESCE(SUM(safe_numeric(amount::text, 0)), 0) AS total
        FROM supplier_payments
        ${hasFilter ? 'WHERE project_id = ANY($1::text[])' : ''}
        GROUP BY project_id
      )
      SELECT
        p.id,
        p.name,
        COALESCE(p.status, 'active') AS status,
        COALESCE(wa.total_workers, 0)            AS total_workers,
        COALESCE(wa.active_workers, 0)           AS active_workers,
        COALESCE(ww.completed_days, 0)           AS completed_days,
        COALESCE(mc.total, 0)                    AS material_cash_total,
        COALESCE(mcr.total, 0)                   AS material_credit_total,
        COALESCE(ww.total, 0)                    AS worker_wages_total,
        COALESCE(tr.total, 0)                    AS transportation_total,
        COALESCE(wt.total, 0)                    AS worker_transfers_total,
        COALESCE(me.total, 0)                    AS misc_expenses_total,
        COALESCE(ft.total, 0)                    AS fund_transfers_total,
        COALESCE(pto.total, 0)                   AS project_transfers_out_total,
        COALESCE(pti.total, 0)                   AS project_transfers_in_total,
        COALESCE(sp.total, 0)                    AS supplier_payments_total
      FROM projects p
      LEFT JOIN material_cash mc     ON mc.project_id   = p.id
      LEFT JOIN material_credit mcr  ON mcr.project_id  = p.id
      LEFT JOIN worker_wages ww      ON ww.project_id   = p.id
      LEFT JOIN transport tr         ON tr.project_id   = p.id
      LEFT JOIN worker_trf wt        ON wt.project_id   = p.id
      LEFT JOIN misc_exp me          ON me.project_id   = p.id
      LEFT JOIN fund_trf ft          ON ft.project_id   = p.id
      LEFT JOIN proj_trf_out pto     ON pto.project_id  = p.id
      LEFT JOIN proj_trf_in pti      ON pti.project_id  = p.id
      LEFT JOIN workers_agg wa       ON wa.project_id   = p.id
      LEFT JOIN supplier_pay sp      ON sp.project_id   = p.id
      ${projectFilter}
      ORDER BY p.created_at
    `;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => {
      const materialCashTotal       = parseFloat(row.material_cash_total)       || 0;
      const materialCreditTotal     = parseFloat(row.material_credit_total)     || 0;
      const workerWagesTotal        = parseFloat(row.worker_wages_total)        || 0;
      const transportationTotal     = parseFloat(row.transportation_total)      || 0;
      const workerTransfersTotal    = parseFloat(row.worker_transfers_total)    || 0;
      const miscExpensesTotal       = parseFloat(row.misc_expenses_total)       || 0;
      const fundTransfersTotal      = parseFloat(row.fund_transfers_total)      || 0;
      const projectTransfersOutTotal = parseFloat(row.project_transfers_out_total) || 0;
      const projectTransfersInTotal  = parseFloat(row.project_transfers_in_total)  || 0;
      const supplierPaymentsTotal   = parseFloat(row.supplier_payments_total)   || 0;

      const totalExpenses = materialCashTotal + workerWagesTotal + transportationTotal
        + workerTransfersTotal + miscExpensesTotal + projectTransfersOutTotal + supplierPaymentsTotal;

      const totalIncome = fundTransfersTotal + projectTransfersInTotal;

      const cashBalance  = totalIncome - totalExpenses;
      const totalBalance = cashBalance - materialCreditTotal;

      return {
        id:                      String(row.id),
        name:                    row.name,
        status:                  row.status,
        totalWorkers:            parseInt(row.total_workers)    || 0,
        activeWorkers:           parseInt(row.active_workers)   || 0,
        completedDays:           parseInt(row.completed_days)   || 0,
        materialCashTotal,
        materialCreditTotal,
        workerWagesTotal,
        transportationTotal,
        workerTransfersTotal,
        miscExpensesTotal,
        fundTransfersTotal,
        projectTransfersOutTotal,
        projectTransfersInTotal,
        supplierPaymentsTotal,
        totalExpenses,
        totalIncome,
        cashBalance,
        totalBalance,
      };
    });
  }
}
