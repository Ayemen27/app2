import { pool } from '../db';
import { FinancialLedgerService } from './FinancialLedgerService';
import { FinancialIntegrityService } from './FinancialIntegrityService';
import { PaymentAllocationService } from './PaymentAllocationService';

export class RebalanceValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'RebalanceValidationError'; }
}
export class RebalanceNotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'RebalanceNotFoundError'; }
}
export class RebalanceConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'RebalanceConflictError'; }
}

interface RebalanceLine {
  fromProjectId: string;
  toProjectId: string;
  amount: number;
}

interface ProjectFundBalance {
  projectId: string;
  projectName: string;
  totalIncome: number;
  totalExpenses: number;
  fundBalance: number;
}

interface PreviewLine {
  fromProjectId: string;
  fromProjectName: string;
  fromWorkerBalanceBefore: number;
  fromWorkerBalanceAfter: number;
  toProjectId: string;
  toProjectName: string;
  toWorkerBalanceBefore: number;
  toWorkerBalanceAfter: number;
  amount: number;
}

interface RebalancePreview {
  workerId: string;
  workerName: string;
  lines: PreviewLine[];
  totalRebalanced: number;
  projectFundsBefore: ProjectFundBalance[];
  projectFundsAfter: ProjectFundBalance[];
}

interface RebalanceResult {
  success: boolean;
  rebalanceId: string;
  fundTransferIds: string[];
  lines: RebalanceLine[];
  note: string;
  projectFundsBefore: ProjectFundBalance[];
  projectFundsAfter: ProjectFundBalance[];
}

const safeNum = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export class LegacyRebalanceService {

  static async getImbalancedWorkers(): Promise<Array<{
    workerId: string;
    workerName: string;
    projectCount: number;
    positiveProjects: number;
    negativeProjects: number;
    totalBalance: number;
    projects: Array<{
      projectId: string;
      projectName: string;
      earned: number;
      paid: number;
      transferred: number;
      balance: number;
    }>;
  }>> {
    const result = await pool.query(`
      WITH worker_project_balances AS (
        SELECT 
          wa.worker_id,
          w.name AS worker_name,
          wa.project_id,
          p.name AS project_name,
          COALESCE(SUM(
            CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' 
              THEN safe_numeric(wa.actual_wage::text, 0) 
              ELSE safe_numeric(wa.daily_wage::text, 0) * safe_numeric(wa.work_days::text, 0) 
            END
          ), 0) AS total_earned,
          COALESCE(SUM(safe_numeric(wa.paid_amount::text, 0)), 0) AS total_paid
        FROM worker_attendance wa
        JOIN workers w ON w.id = wa.worker_id
        JOIN projects p ON p.id = wa.project_id
        GROUP BY wa.worker_id, w.name, wa.project_id, p.name
      ),
      worker_project_transfers AS (
        SELECT 
          wt.worker_id,
          wt.project_id,
          COALESCE(SUM(safe_numeric(wt.amount::text, 0)), 0) AS total_transferred
        FROM worker_transfers wt
        GROUP BY wt.worker_id, wt.project_id
      ),
      rebalance_deltas AS (
        SELECT worker_id, project_id, SUM(delta) AS rebalance_delta FROM (
          SELECT 
            substring(pft.description FROM '\\[([0-9a-f\\-]+)\\]') AS worker_id,
            pft.to_project_id AS project_id,
            safe_numeric(pft.amount::text, 0) AS delta
          FROM project_fund_transfers pft
          WHERE pft.transfer_reason = 'legacy_worker_rebalance'
          UNION ALL
          SELECT 
            substring(pft.description FROM '\\[([0-9a-f\\-]+)\\]') AS worker_id,
            pft.from_project_id AS project_id,
            -safe_numeric(pft.amount::text, 0) AS delta
          FROM project_fund_transfers pft
          WHERE pft.transfer_reason = 'legacy_worker_rebalance'
        ) rd
        WHERE worker_id IS NOT NULL
        GROUP BY worker_id, project_id
      ),
      balances AS (
        SELECT 
          wpb.worker_id,
          wpb.worker_name,
          wpb.project_id,
          wpb.project_name,
          wpb.total_earned,
          wpb.total_paid,
          COALESCE(wpt.total_transferred, 0) AS total_transferred,
          COALESCE(rbd.rebalance_delta, 0) AS rebalance_delta,
          wpb.total_earned - wpb.total_paid - COALESCE(wpt.total_transferred, 0) + COALESCE(rbd.rebalance_delta, 0) AS balance
        FROM worker_project_balances wpb
        LEFT JOIN worker_project_transfers wpt 
          ON wpt.worker_id = wpb.worker_id AND wpt.project_id = wpb.project_id
        LEFT JOIN rebalance_deltas rbd
          ON rbd.worker_id = wpb.worker_id AND rbd.project_id = wpb.project_id
      )
      SELECT 
        b.worker_id,
        b.worker_name,
        COUNT(*) AS project_count,
        COUNT(*) FILTER (WHERE b.balance > 0.01) AS positive_projects,
        COUNT(*) FILTER (WHERE b.balance < -0.01) AS negative_projects,
        SUM(b.balance) AS total_balance,
        jsonb_agg(jsonb_build_object(
          'projectId', b.project_id,
          'projectName', b.project_name,
          'earned', b.total_earned,
          'paid', b.total_paid,
          'transferred', b.total_transferred,
          'balance', b.balance
        ) ORDER BY b.balance) AS projects
      FROM balances b
      GROUP BY b.worker_id, b.worker_name
      HAVING COUNT(*) > 1 
        AND COUNT(*) FILTER (WHERE b.balance < -0.01) > 0 
        AND COUNT(*) FILTER (WHERE b.balance > 0.01) > 0
      ORDER BY b.worker_name
    `);

    return result.rows.map((r: any) => ({
      workerId: r.worker_id,
      workerName: r.worker_name,
      projectCount: parseInt(r.project_count),
      positiveProjects: parseInt(r.positive_projects),
      negativeProjects: parseInt(r.negative_projects),
      totalBalance: safeNum(r.total_balance),
      projects: r.projects,
    }));
  }

  static async getProjectFundBalances(projectIds: string[]): Promise<ProjectFundBalance[]> {
    if (projectIds.length === 0) return [];
    const result = await pool.query(`
      SELECT p.id AS project_id, p.name AS project_name,
        COALESCE(inc.total, 0) AS total_income,
        COALESCE(exp.total, 0) AS total_expenses,
        COALESCE(inc.total, 0) - COALESCE(exp.total, 0) AS fund_balance
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(safe_numeric(amount::text, 0)) AS total FROM (
          SELECT project_id, amount FROM fund_transfers WHERE project_id = ANY($1)
          UNION ALL
          SELECT to_project_id AS project_id, amount FROM project_fund_transfers WHERE to_project_id = ANY($1)
        ) sub GROUP BY project_id
      ) inc ON inc.project_id = p.id
      LEFT JOIN (
        SELECT project_id, SUM(safe_numeric(amount::text, 0)) AS total FROM (
          SELECT project_id, paid_amount AS amount FROM worker_attendance WHERE project_id = ANY($1) AND safe_numeric(paid_amount::text, 0) > 0
          UNION ALL
          SELECT project_id, amount FROM worker_transfers WHERE project_id = ANY($1)
          UNION ALL
          SELECT project_id, amount FROM transportation_expenses WHERE project_id = ANY($1)
          UNION ALL
          SELECT project_id, amount FROM worker_misc_expenses WHERE project_id = ANY($1)
          UNION ALL
          SELECT project_id, CASE WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND safe_numeric(paid_amount::text, 0) > 0 THEN paid_amount WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN total_amount ELSE '0' END AS amount FROM material_purchases WHERE project_id = ANY($1) AND (purchase_type = 'نقداً' OR purchase_type = 'نقد')
          UNION ALL
          SELECT from_project_id AS project_id, amount FROM project_fund_transfers WHERE from_project_id = ANY($1)
          UNION ALL
          SELECT project_id, amount FROM supplier_payments WHERE project_id = ANY($1)
        ) sub GROUP BY project_id
      ) exp ON exp.project_id = p.id
      WHERE p.id = ANY($1)
      ORDER BY p.name
    `, [projectIds]);

    return result.rows.map((r: any) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      totalIncome: safeNum(r.total_income),
      totalExpenses: safeNum(r.total_expenses),
      fundBalance: safeNum(r.fund_balance),
    }));
  }

  static generateRebalancePlan(
    projects: Array<{ projectId: string; projectName: string; balance: number }>
  ): Array<{ fromProjectId: string; fromProjectName: string; toProjectId: string; toProjectName: string; amount: number }> {
    const positives = projects.filter(p => p.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const negatives = projects.filter(p => p.balance < -0.01).sort((a, b) => a.balance - b.balance);

    const lines: Array<{ fromProjectId: string; fromProjectName: string; toProjectId: string; toProjectName: string; amount: number }> = [];

    let pi = 0, ni = 0;
    const posRemaining = positives.map(p => p.balance);
    const negRemaining = negatives.map(p => Math.abs(p.balance));

    while (pi < positives.length && ni < negatives.length) {
      const amount = Math.min(posRemaining[pi], negRemaining[ni]);
      if (amount > 0.01) {
        lines.push({
          fromProjectId: positives[pi].projectId,
          fromProjectName: positives[pi].projectName,
          toProjectId: negatives[ni].projectId,
          toProjectName: negatives[ni].projectName,
          amount: Math.round(amount * 100) / 100,
        });
      }
      posRemaining[pi] -= amount;
      negRemaining[ni] -= amount;
      if (posRemaining[pi] < 0.01) pi++;
      if (negRemaining[ni] < 0.01) ni++;
    }

    return lines;
  }

  static async preview(workerId: string): Promise<RebalancePreview> {
    const balances = await PaymentAllocationService.getWorkerOpenBalances(workerId);

    const workerResult = await pool.query(`SELECT name FROM workers WHERE id = $1`, [workerId]);
    const workerName = workerResult.rows[0]?.name || workerId;

    const projectsData = balances.map(b => ({
      projectId: b.projectId,
      projectName: b.projectName,
      balance: b.currentBalance,
    }));

    const plan = this.generateRebalancePlan(projectsData);

    const affectedProjectIds = [...new Set(plan.flatMap(l => [l.fromProjectId, l.toProjectId]))];
    const projectFundsBefore = await this.getProjectFundBalances(affectedProjectIds);

    const fundAdjustments = new Map<string, number>();
    for (const line of plan) {
      fundAdjustments.set(line.fromProjectId, (fundAdjustments.get(line.fromProjectId) || 0) - line.amount);
      fundAdjustments.set(line.toProjectId, (fundAdjustments.get(line.toProjectId) || 0) + line.amount);
    }
    const projectFundsAfter = projectFundsBefore.map(pf => ({
      ...pf,
      fundBalance: Math.round((pf.fundBalance + (fundAdjustments.get(pf.projectId) || 0)) * 100) / 100,
    }));

    const balanceMap = new Map(balances.map(b => [b.projectId, b.currentBalance]));

    const workerAdjustments = new Map<string, number>();
    const lines = plan.map(line => {
      const fromBefore = balanceMap.get(line.fromProjectId)! + (workerAdjustments.get(line.fromProjectId) || 0);
      const toBefore = balanceMap.get(line.toProjectId)! + (workerAdjustments.get(line.toProjectId) || 0);

      workerAdjustments.set(line.fromProjectId, (workerAdjustments.get(line.fromProjectId) || 0) - line.amount);
      workerAdjustments.set(line.toProjectId, (workerAdjustments.get(line.toProjectId) || 0) + line.amount);

      return {
        fromProjectId: line.fromProjectId,
        fromProjectName: line.fromProjectName,
        fromWorkerBalanceBefore: Math.round(fromBefore * 100) / 100,
        fromWorkerBalanceAfter: Math.round((fromBefore - line.amount) * 100) / 100,
        toProjectId: line.toProjectId,
        toProjectName: line.toProjectName,
        toWorkerBalanceBefore: Math.round(toBefore * 100) / 100,
        toWorkerBalanceAfter: Math.round((toBefore + line.amount) * 100) / 100,
        amount: line.amount,
      };
    });

    return {
      workerId,
      workerName,
      lines,
      totalRebalanced: lines.reduce((s, l) => s + l.amount, 0),
      projectFundsBefore,
      projectFundsAfter,
    };
  }

  static async execute(
    workerId: string,
    lines: RebalanceLine[],
    date: string,
    createdBy?: string
  ): Promise<RebalanceResult> {
    const balances = await PaymentAllocationService.getWorkerOpenBalances(workerId);
    const balanceMap = new Map(balances.map(b => [b.projectId, b.currentBalance]));
    const nameMap = new Map(balances.map(b => [b.projectId, b.projectName]));

    const workerResult = await pool.query(`SELECT name FROM workers WHERE id = $1`, [workerId]);
    const workerName = workerResult.rows[0]?.name || workerId;

    const remainingFrom = new Map<string, number>();
    const remainingTo = new Map<string, number>();
    for (const line of lines) {
      if (!balanceMap.has(line.fromProjectId)) {
        throw new RebalanceValidationError(`المشروع المصدر ${line.fromProjectId} ليس ضمن مشاريع العامل`);
      }
      if (!balanceMap.has(line.toProjectId)) {
        throw new RebalanceValidationError(`المشروع الهدف ${line.toProjectId} ليس ضمن مشاريع العامل`);
      }
      if (line.amount <= 0) {
        throw new RebalanceValidationError('مبلغ الترحيل يجب أن يكون موجباً');
      }
      const effectiveFrom = remainingFrom.has(line.fromProjectId)
        ? remainingFrom.get(line.fromProjectId)!
        : balanceMap.get(line.fromProjectId)!;
      if (line.amount > effectiveFrom + 0.01) {
        throw new RebalanceValidationError(
          `مبلغ الترحيل (${line.amount}) يتجاوز الرصيد المتبقي (${effectiveFrom}) للمشروع المصدر — ${nameMap.get(line.fromProjectId)}`
        );
      }
      remainingFrom.set(line.fromProjectId, effectiveFrom - line.amount);

      const effectiveTo = remainingTo.has(line.toProjectId)
        ? remainingTo.get(line.toProjectId)!
        : balanceMap.get(line.toProjectId)!;
      if (effectiveTo >= 0) {
        throw new RebalanceValidationError(
          `المشروع الهدف (${nameMap.get(line.toProjectId)}) رصيده موجب (${effectiveTo}) — التسوية مخصصة لتغطية الأرصدة السالبة فقط`
        );
      }
      if (effectiveTo + line.amount > 0.01) {
        throw new RebalanceValidationError(
          `مبلغ الترحيل (${line.amount}) يتجاوز الرصيد السالب المتبقي (${effectiveTo}) للمشروع الهدف — ${nameMap.get(line.toProjectId)}`
        );
      }
      remainingTo.set(line.toProjectId, effectiveTo + line.amount);
    }

    const affectedProjectIds = [...new Set(lines.flatMap(l => [l.fromProjectId, l.toProjectId]))];
    const projectFundsBefore = await this.getProjectFundBalances(affectedProjectIds);

    const existingCheck = await pool.query(`
      SELECT id FROM project_fund_transfers 
      WHERE transfer_reason = 'legacy_worker_rebalance' 
        AND description LIKE $1
        AND transfer_date = $2
      LIMIT 1
    `, [`%${workerId}%`, date]);
    if (existingCheck.rows.length > 0) {
      throw new RebalanceConflictError(`يبدو أن تسوية لهذا العامل في هذا التاريخ موجودة بالفعل. تحقق من السجلات أو استخدم تاريخاً مختلفاً`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`SELECT id FROM workers WHERE id = $1 FOR UPDATE`, [workerId]);

      const recheck = await client.query(`
        SELECT id FROM project_fund_transfers 
        WHERE transfer_reason = 'legacy_worker_rebalance' 
          AND description LIKE $1
          AND transfer_date = $2
        LIMIT 1
      `, [`%${workerId}%`, date]);
      if (recheck.rows.length > 0) {
        throw new RebalanceConflictError(`يبدو أن تسوية لهذا العامل في هذا التاريخ موجودة بالفعل. تحقق من السجلات أو استخدم تاريخاً مختلفاً`);
      }

      const rebalanceIdResult = await client.query(`SELECT gen_random_uuid() AS id`);
      const rebalanceId = rebalanceIdResult.rows[0].id;

      const fundTransferIds: string[] = [];

      for (const line of lines) {
        const fromName = nameMap.get(line.fromProjectId) || line.fromProjectId;
        const toName = nameMap.get(line.toProjectId) || line.toProjectId;

        const description = `تسوية رصيد قديم — ترحيل مستحقات العامل "${workerName}" [${workerId}] من "${fromName}" إلى "${toName}" (rebalance: ${rebalanceId})`;

        const pftResult = await client.query(`
          INSERT INTO project_fund_transfers 
            (id, from_project_id, to_project_id, amount, description, transfer_reason, transfer_date)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          line.fromProjectId,
          line.toProjectId,
          line.amount,
          description,
          'legacy_worker_rebalance',
          date,
        ]);

        const pftId = pftResult.rows[0].id;
        fundTransferIds.push(pftId);

        await FinancialLedgerService.recordProjectTransferWithClient(
          client, line.fromProjectId, line.toProjectId, line.amount,
          date, pftId, createdBy
        );
      }

      await client.query('COMMIT');

      const affectedProjects = new Set<string>();
      for (const line of lines) {
        affectedProjects.add(line.fromProjectId);
        affectedProjects.add(line.toProjectId);
      }
      for (const projectId of affectedProjects) {
        try {
          await FinancialIntegrityService.syncWorkerBalance(workerId, projectId);
        } catch (e) {
          console.warn(`[LegacyRebalance] Failed to sync balance for project ${projectId}:`, e);
        }
      }

      const projectFundsAfter = await this.getProjectFundBalances(affectedProjectIds);

      const note = lines.map(l => {
        const fromName = nameMap.get(l.fromProjectId) || '';
        const toName = nameMap.get(l.toProjectId) || '';
        return `${l.amount} من "${fromName}" → "${toName}"`;
      }).join(' | ');

      return {
        success: true,
        rebalanceId,
        fundTransferIds,
        lines,
        note: `تسوية رصيد قديم للعامل "${workerName}": ${note}`,
        projectFundsBefore,
        projectFundsAfter,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async reverseRebalance(rebalanceId: string): Promise<{ success: boolean; reversedCount: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fundTransfers = await client.query(`
        SELECT id, from_project_id, to_project_id, amount
        FROM project_fund_transfers 
        WHERE transfer_reason = 'legacy_worker_rebalance' 
          AND description LIKE $1
      `, [`%rebalance: ${rebalanceId}%`]);

      if (fundTransfers.rows.length === 0) {
        throw new RebalanceNotFoundError(`لم يتم العثور على عمليات تسوية بالمعرف: ${rebalanceId}`);
      }

      const sourceIds = fundTransfers.rows.map((r: any) => r.id);
      if (sourceIds.length > 0) {
        await client.query(`
          DELETE FROM journal_entries 
          WHERE source_id IN (SELECT unnest($1::text[]))
        `, [sourceIds]);
      }

      await client.query(`
        DELETE FROM project_fund_transfers 
        WHERE transfer_reason = 'legacy_worker_rebalance' 
          AND description LIKE $1
      `, [`%rebalance: ${rebalanceId}%`]);

      await client.query('COMMIT');

      return { success: true, reversedCount: fundTransfers.rows.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
