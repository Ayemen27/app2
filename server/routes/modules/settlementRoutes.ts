import express from 'express';
import { Request, Response } from 'express';
import { pool, withTransaction } from '../../db.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess.js';
import { getAuthUser } from '../../internal/auth-user.js';
import { sendSuccess, sendError } from '../../middleware/api-response.js';

import { validateWholeAmounts } from '../../middleware/validateWholeAmounts';

const settlementRouter = express.Router();

settlementRouter.use(requireAuth);
settlementRouter.use(attachAccessibleProjects);

settlementRouter.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
    return validateWholeAmounts()(req, res, next);
  }
  next();
});

interface WorkerProjectBalance {
  projectId: string;
  projectName: string;
  earned: number;
  paid: number;
  transferred: number;
  balance: number;
}

interface WorkerSettlementPreview {
  workerId: string;
  workerName: string;
  projects: WorkerProjectBalance[];
  totalBalance: number;
}

interface FundTransferPreview {
  fromProjectId: string;
  fromProjectName: string;
  toProjectId: string;
  toProjectName: string;
  amount: number;
}

interface WorkerProjectBalanceWithFlag extends WorkerProjectBalance {
  isSettlementProject: boolean;
  cappedSettlementAmount: number;
}

interface WorkerSettlementPreviewFull {
  workerId: string;
  workerName: string;
  projects: WorkerProjectBalanceWithFlag[];
  totalBalance: number;
  totalPositiveBalance: number;
  totalNegativeBalance: number;
  netSettlementAmount: number;
}

async function calculatePreviewData(
  workerIds: string[] | 'all',
  settlementProjectId: string,
  accessibleProjectIds: string[],
  queryFn: (text: string, params: any[]) => Promise<any>
) {
  let paramIndex = 1;
  let workerParams: any[] = [];

  let projectAccessFilter = '';
  if (accessibleProjectIds.length > 0) {
    const projectPlaceholders = accessibleProjectIds.map((_, i) => `$${paramIndex + i}`).join(',');
    projectAccessFilter = `AND wa.project_id IN (${projectPlaceholders})`;
    workerParams = [...workerParams, ...accessibleProjectIds];
    paramIndex += accessibleProjectIds.length;
  }

  let workerFilter = '';
  if (workerIds !== 'all') {
    const placeholders = workerIds.map((_, i) => `$${paramIndex + i}`).join(',');
    workerFilter = `AND w.id IN (${placeholders})`;
    workerParams = [...workerParams, ...workerIds];
  }

  const earnedResult = await queryFn(
    `SELECT wa.worker_id, wa.project_id, p.name as project_name, w.name as worker_name,
            COALESCE(SUM(
              CAST(COALESCE(wa.daily_wage, '0') AS DECIMAL(15,2)) *
              CAST(COALESCE(wa.work_days, '0') AS DECIMAL(15,2))
            ), 0) as total_earned,
            COALESCE(SUM(CAST(wa.paid_amount AS DECIMAL(15,2))), 0) as total_paid
     FROM worker_attendance wa
     JOIN workers w ON w.id = wa.worker_id
     JOIN projects p ON p.id = wa.project_id
     WHERE 1=1 ${projectAccessFilter} ${workerFilter}
     GROUP BY wa.worker_id, wa.project_id, p.name, w.name`,
    workerParams
  );

  let tParamIndex = 1;
  let transferParams: any[] = [];
  let tProjectAccessFilter = '';
  if (accessibleProjectIds.length > 0) {
    const projectPlaceholders = accessibleProjectIds.map((_, i) => `$${tParamIndex + i}`).join(',');
    tProjectAccessFilter = `AND wt.project_id IN (${projectPlaceholders})`;
    transferParams = [...transferParams, ...accessibleProjectIds];
    tParamIndex += accessibleProjectIds.length;
  }
  let tWorkerFilter = '';
  if (workerIds !== 'all') {
    const placeholders = workerIds.map((_, i) => `$${tParamIndex + i}`).join(',');
    tWorkerFilter = `AND w.id IN (${placeholders})`;
    transferParams = [...transferParams, ...workerIds];
  }

  const transferredResult = await queryFn(
    `SELECT wt.worker_id, wt.project_id,
            COALESCE(SUM(CAST(wt.amount AS DECIMAL(15,2))), 0) as total_transferred
     FROM worker_transfers wt
     JOIN workers w ON w.id = wt.worker_id
     WHERE 1=1 AND (wt.transfer_method IS NULL OR wt.transfer_method != 'settlement') ${tProjectAccessFilter} ${tWorkerFilter}
     GROUP BY wt.worker_id, wt.project_id`,
    transferParams
  );

  const transferMap = new Map<string, number>();
  for (const row of transferredResult.rows) {
    transferMap.set(`${row.worker_id}:${row.project_id}`, parseFloat(row.total_transferred));
  }

  let sParamIndex = 1;
  let settlementParams: any[] = [];
  let sProjectAccessFilter = '';
  if (accessibleProjectIds.length > 0) {
    const projectPlaceholders = accessibleProjectIds.map((_, i) => `$${sParamIndex + i}`).join(',');
    sProjectAccessFilter = `AND wsl.from_project_id IN (${projectPlaceholders})`;
    settlementParams = [...settlementParams, ...accessibleProjectIds];
    sParamIndex += accessibleProjectIds.length;
  }
  let sWorkerFilter = '';
  if (workerIds !== 'all') {
    const placeholders = workerIds.map((_, i) => `$${sParamIndex + i}`).join(',');
    sWorkerFilter = `AND wsl.worker_id IN (${placeholders})`;
    settlementParams = [...settlementParams, ...workerIds];
  }

  const settledResult = await queryFn(
    `SELECT wsl.worker_id, wsl.from_project_id as project_id,
            COALESCE(SUM(CAST(wsl.amount AS DECIMAL(15,2))), 0) as total_settled
     FROM worker_settlement_lines wsl
     JOIN worker_settlements ws ON ws.id = wsl.settlement_id
     WHERE ws.status = 'completed' ${sProjectAccessFilter} ${sWorkerFilter}
     GROUP BY wsl.worker_id, wsl.from_project_id`,
    settlementParams
  );

  const settledMap = new Map<string, number>();
  for (const row of settledResult.rows) {
    settledMap.set(`${row.worker_id}:${row.project_id}`, parseFloat(row.total_settled));
  }

  const workerMap = new Map<string, WorkerSettlementPreviewFull>();
  const warnings: string[] = [];

  for (const row of earnedResult.rows) {
    const transferred = transferMap.get(`${row.worker_id}:${row.project_id}`) || 0;
    const settled = settledMap.get(`${row.worker_id}:${row.project_id}`) || 0;
    const earned = Math.round(parseFloat(row.total_earned));
    const paid = Math.round(parseFloat(row.total_paid));
    const balance = Math.round(earned - paid - Math.round(transferred) - Math.round(settled));

    if (Math.abs(balance) < 1) continue;

    if (!workerMap.has(row.worker_id)) {
      workerMap.set(row.worker_id, {
        workerId: row.worker_id,
        workerName: row.worker_name,
        projects: [],
        totalBalance: 0,
        totalPositiveBalance: 0,
        totalNegativeBalance: 0,
        netSettlementAmount: 0,
      });
    }

    const isSettlementProject = row.project_id === settlementProjectId;

    const worker = workerMap.get(row.worker_id)!;
    worker.projects.push({
      projectId: row.project_id,
      projectName: row.project_name,
      earned,
      paid,
      transferred,
      balance,
      isSettlementProject,
      cappedSettlementAmount: 0,
    });
    worker.totalBalance += balance;
    if (balance > 0) {
      worker.totalPositiveBalance += balance;
    } else {
      worker.totalNegativeBalance += balance;
    }

    if (balance < 0) {
      warnings.push(`العامل ${row.worker_name} لديه رصيد سالب (${balance}) في مشروع ${row.project_name} — سيتم خصمه من الصافي`);
    }
  }

  for (const worker of workerMap.values()) {
    const netBalance = Math.max(0, worker.totalBalance);
    worker.netSettlementAmount = netBalance;

    if (worker.totalBalance <= 0 && worker.totalPositiveBalance > 0) {
      warnings.push(`العامل ${worker.workerName}: الصافي الكلي سالب أو صفر (${Math.round(worker.totalBalance)}) — لا يمكن تصفيته. الأرصدة السالبة (${Math.round(worker.totalNegativeBalance)}) أكبر من الموجبة (${Math.round(worker.totalPositiveBalance)})`);
    }

    if (netBalance > 0 && worker.totalPositiveBalance > 0) {
      const ratio = netBalance / worker.totalPositiveBalance;
      for (const proj of worker.projects) {
        if (proj.balance > 0) {
          proj.cappedSettlementAmount = Math.round(proj.balance * ratio);
        }
      }

      const cappedSum = worker.projects.reduce((s, p) => s + p.cappedSettlementAmount, 0);
      const diff = Math.round(netBalance - cappedSum);
      if (Math.abs(diff) > 0) {
        const largestPositive = worker.projects.reduce((max, p) =>
          p.cappedSettlementAmount > (max?.cappedSettlementAmount || 0) ? p : max, worker.projects[0]);
        if (largestPositive) {
          largestPositive.cappedSettlementAmount = Math.round(largestPositive.cappedSettlementAmount + diff);
        }
      }

      if (ratio < 1) {
        warnings.push(`العامل ${worker.workerName}: تم تخفيض مبلغ التصفية من ${Math.round(worker.totalPositiveBalance)} إلى ${Math.round(netBalance)} بسبب أرصدة سالبة في مشاريع أخرى (${Math.round(worker.totalNegativeBalance)})`);
      }
    }
  }

  const workers = Array.from(workerMap.values()).filter(w => w.netSettlementAmount > 0);

  const settlementProjectResult = await queryFn(
    `SELECT name FROM projects WHERE id = $1`,
    [settlementProjectId]
  );
  const settlementProjectName = settlementProjectResult.rows[0]?.name || '';

  const projectTotals = new Map<string, { fromProjectId: string; fromProjectName: string; amount: number }>();
  for (const worker of workers) {
    for (const proj of worker.projects) {
      if (proj.cappedSettlementAmount > 0 && !proj.isSettlementProject) {
        const existing = projectTotals.get(proj.projectId);
        if (existing) {
          existing.amount += proj.cappedSettlementAmount;
        } else {
          projectTotals.set(proj.projectId, {
            fromProjectId: proj.projectId,
            fromProjectName: proj.projectName,
            amount: proj.cappedSettlementAmount,
          });
        }
      }
    }
  }

  const fundTransfers: FundTransferPreview[] = Array.from(projectTotals.values()).map(t => ({
    fromProjectId: settlementProjectId,
    fromProjectName: settlementProjectName,
    toProjectId: t.fromProjectId,
    toProjectName: t.fromProjectName,
    amount: t.amount,
  }));

  const totalSettlementAmount = workers.reduce((sum, w) => sum + w.netSettlementAmount, 0);

  return { workers, fundTransfers, totalSettlementAmount, warnings, settlementProjectName };
}

settlementRouter.get('/preview', async (req: Request, res: Response) => {
  try {
    const { worker_ids, settlement_project_id } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const accessibleProjectIds = accessReq.accessibleProjectIds || [];

    if (!settlement_project_id) {
      return sendError(res, 'معرف مشروع التصفية مطلوب', 400);
    }

    if (accessibleProjectIds.length > 0 && !accessibleProjectIds.includes(settlement_project_id as string)) {
      return sendError(res, 'ليس لديك صلاحية الوصول لهذا المشروع', 403);
    }

    const rawIds = worker_ids as string | undefined;
    let parsedWorkerIds: string[] | 'all';
    if (!rawIds || rawIds === 'all') {
      parsedWorkerIds = 'all';
    } else {
      const ids = rawIds.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        return sendError(res, 'قائمة العمال فارغة', 400);
      }
      parsedWorkerIds = ids;
    }

    const preview = await calculatePreviewData(
      parsedWorkerIds,
      settlement_project_id as string,
      accessibleProjectIds,
      (text, params) => pool.query(text, params)
    );

    return sendSuccess(res, {
      workers: preview.workers,
      fundTransfers: preview.fundTransfers,
      totalSettlementAmount: preview.totalSettlementAmount,
      warnings: preview.warnings,
    }, 'تم حساب معاينة التصفية بنجاح');
  } catch (error: any) {
    console.error('[Settlement] Error in preview:', error);
    return sendError(res, 'فشل في حساب معاينة التصفية', 500);
  }
});

settlementRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const { worker_ids, settlement_project_id, notes, excluded_projects, settlement_date } = req.body;
    const accessReq = req as ProjectAccessRequest;
    const accessibleProjectIds = accessReq.accessibleProjectIds || [];

    if (!worker_ids || !Array.isArray(worker_ids) || worker_ids.length === 0) {
      return sendError(res, 'قائمة العمال مطلوبة', 400);
    }
    if (!settlement_project_id) {
      return sendError(res, 'معرف مشروع التصفية مطلوب', 400);
    }

    if (accessibleProjectIds.length > 0 && !accessibleProjectIds.includes(settlement_project_id as string)) {
      return sendError(res, 'ليس لديك صلاحية الوصول لهذا المشروع', 403);
    }

    const workerExclusions: Record<string, string[]> = excluded_projects && typeof excluded_projects === 'object'
      ? excluded_projects : {};

    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

    if (idempotencyKey) {
      const existingResult = await pool.query(
        `SELECT id, total_amount, worker_count FROM worker_settlements 
         WHERE notes LIKE '%' || $1 || '%' AND status = 'completed'
         LIMIT 1`,
        [idempotencyKey]
      );
      if (existingResult.rows.length > 0) {
        return sendSuccess(res, {
          settlementId: existingResult.rows[0].id,
          workerCount: existingResult.rows[0].worker_count,
          totalAmount: parseFloat(existingResult.rows[0].total_amount),
          duplicate: true,
        }, 'تم تنفيذ هذه التصفية مسبقاً');
      }
    }

    const recentDuplicate = await pool.query(
      `SELECT id FROM worker_settlements 
       WHERE settlement_project_id = $1 
         AND status = 'completed'
         AND created_at > NOW() - INTERVAL '10 seconds'
       LIMIT 1`,
      [settlement_project_id]
    );
    if (recentDuplicate.rows.length > 0) {
      return sendError(res, 'تم إرسال طلب تصفية مشابه مؤخراً، انتظر قليلاً', 409);
    }

    const authUser = getAuthUser(req);
    const userId = authUser?.user_id || null;

    const result = await withTransaction(async (client) => {
      const preview = await calculatePreviewData(
        worker_ids,
        settlement_project_id,
        accessibleProjectIds,
        (text, params) => client.query(text, params)
      );

      if (preview.workers.length === 0) {
        throw new Error('لا يوجد عمال مؤهلون للتصفية — جميع الأرصدة الصافية سالبة أو صفر');
      }

      const isProjectIncluded = (workerId: string, proj: WorkerProjectBalanceWithFlag) => {
        if (proj.cappedSettlementAmount <= 0) return false;
        const excluded = workerExclusions[workerId];
        if (excluded && Array.isArray(excluded) && excluded.includes(proj.projectId)) return false;
        return true;
      };

      const eligibleWorkers = preview.workers.filter(w =>
        w.netSettlementAmount > 0 && w.projects.some(p => isProjectIncluded(w.workerId, p))
      );

      if (eligibleWorkers.length === 0) {
        throw new Error('لا يوجد عمال بأرصدة صافية موجبة قابلة للتصفية');
      }

      for (const worker of eligibleWorkers) {
        const excluded = workerExclusions[worker.workerId];
        if (excluded && Array.isArray(excluded) && excluded.length > 0) {
          const includedProjects = worker.projects.filter(p => isProjectIncluded(worker.workerId, p));
          const includedSum = includedProjects.reduce((s, p) => s + p.cappedSettlementAmount, 0);
          const excludedPositive = worker.projects
            .filter(p => p.cappedSettlementAmount > 0 && excluded.includes(p.projectId))
            .reduce((s, p) => s + p.cappedSettlementAmount, 0);

          if (includedSum <= 0) continue;

          const newNet = Math.max(0, worker.netSettlementAmount - excludedPositive);
          if (newNet < includedSum) {
            const ratio = newNet / includedSum;
            for (const proj of includedProjects) {
              proj.cappedSettlementAmount = Math.round(proj.cappedSettlementAmount * ratio);
            }
          }
        }
      }

      const today = settlement_date || new Date().toISOString().split('T')[0];

      const positiveTotal = eligibleWorkers.reduce((sum, w) => {
        return sum + w.projects.filter(p => isProjectIncluded(w.workerId, p)).reduce((s, p) => s + p.cappedSettlementAmount, 0);
      }, 0);

      const settlementResult = await client.query(
        `INSERT INTO worker_settlements (settlement_date, settlement_project_id, total_amount, worker_count, transfer_count, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          today,
          settlement_project_id,
          Math.round(positiveTotal).toString(),
          eligibleWorkers.length,
          0,
          'completed',
          idempotencyKey ? `${notes || ''}[idem:${idempotencyKey}]` : (notes || null),
          userId,
        ]
      );
      const settlementId = settlementResult.rows[0].id;

      const actualFundTotals = new Map<string, { fromProjectId: string; fromProjectName: string; amount: number; workerNames: string[] }>();

      for (const worker of eligibleWorkers) {
        for (const proj of worker.projects) {
          if (!isProjectIncluded(worker.workerId, proj)) continue;

          const settlementAmount = proj.cappedSettlementAmount;
          const balanceAfter = Math.round(proj.balance - settlementAmount);

          await client.query(
            `INSERT INTO worker_settlement_lines (settlement_id, worker_id, from_project_id, to_project_id, amount, balance_before, balance_after)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              settlementId,
              worker.workerId,
              proj.projectId,
              settlement_project_id,
              Math.round(settlementAmount).toString(),
              Math.round(proj.balance).toString(),
              balanceAfter.toString(),
            ]
          );

          if (!proj.isSettlementProject) {
            const existing = actualFundTotals.get(proj.projectId);
            if (existing) {
              existing.amount = Math.round(existing.amount + settlementAmount);
              if (!existing.workerNames.includes(worker.workerName)) {
                existing.workerNames.push(worker.workerName);
              }
            } else {
              actualFundTotals.set(proj.projectId, {
                fromProjectId: proj.projectId,
                fromProjectName: proj.projectName,
                amount: Math.round(settlementAmount),
                workerNames: [worker.workerName],
              });
            }
          }
        }
      }

      for (const worker of eligibleWorkers) {
        for (const proj of worker.projects) {
          if (!isProjectIncluded(worker.workerId, proj)) continue;

          const settlementAmount = proj.cappedSettlementAmount;
          const transferNotes = proj.isSettlementProject
            ? `تصفية حساب - تسوية مباشرة في مشروع التصفية`
            : `تصفية حساب - ترحيل إلى مشروع التصفية`;
          const transferDesc = proj.isSettlementProject
            ? `تصفية حساب العامل ${worker.workerName} مباشرة في مشروع التصفية ${proj.projectName}`
            : `تصفية حساب العامل ${worker.workerName} من مشروع ${proj.projectName}`;

          await client.query(
            `INSERT INTO worker_transfers (id, worker_id, project_id, amount, transfer_method, transfer_date, notes, description, sender_name, recipient_name, created_at)
             VALUES (gen_random_uuid(), $1, $2, CAST($3 AS DECIMAL(15,2)), 'settlement', $4, $5, $6, $7, $8, NOW())`,
            [
              worker.workerId,
              proj.projectId,
              Math.round(settlementAmount).toString(),
              today,
              transferNotes,
              transferDesc,
              proj.projectName,
              worker.workerName,
            ]
          );
        }
      }

      for (const transfer of actualFundTotals.values()) {
        const projectWorkerNames = transfer.workerNames.join('، ');
        await client.query(
          `INSERT INTO project_fund_transfers (from_project_id, to_project_id, amount, description, transfer_reason, transfer_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            settlement_project_id,
            transfer.fromProjectId,
            Math.round(transfer.amount).toString(),
            `تصفية حساب العمال: ${projectWorkerNames}`,
            'settlement',
            today,
          ]
        );
      }

      await client.query(
        `UPDATE worker_settlements SET transfer_count = $1 WHERE id = $2`,
        [actualFundTotals.size, settlementId]
      );

      try {
        await client.query(
          `INSERT INTO audit_logs (user_id, action, meta, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [
            userId || null,
            'SETTLEMENT_EXECUTED',
            JSON.stringify({
              settlementId,
              settlementProjectId: settlement_project_id,
              workerCount: eligibleWorkers.length,
              totalAmount: positiveTotal,
              transferCount: actualFundTotals.size,
              triggeredBy: userId,
              netBalanceCapping: true,
            }),
          ]
        );
      } catch (auditErr) {
        console.warn('[Settlement] Failed to insert audit log, continuing:', auditErr);
      }

      return {
        settlementId,
        workerCount: eligibleWorkers.length,
        totalAmount: positiveTotal,
        transferCount: actualFundTotals.size,
        warnings: preview.warnings,
      };
    });

    return sendSuccess(res, result, 'تم تنفيذ التصفية بنجاح');
  } catch (error: any) {
    console.error('[Settlement] ❌ Execute ERROR:', error?.message || error);
    console.error('[Settlement] ❌ Stack:', error?.stack);
    console.error('[Settlement] ❌ Request body:', JSON.stringify({ settlement_project_id: req.body?.settlement_project_id, worker_ids_count: req.body?.worker_ids?.length || req.body?.worker_ids }));
    const safeMsg = error.message?.includes('عمال') || error.message?.includes('تصفية')
      ? error.message : 'فشل في تنفيذ التصفية';
    return sendError(res, safeMsg, 500);
  }
});

settlementRouter.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;
    const dateFilter = req.query.date as string | undefined;
    const accessReq = req as ProjectAccessRequest;
    const accessibleProjectIds = accessReq.accessibleProjectIds || [];

    const conditions: string[] = [];
    let params: any[] = [limit, offset];
    let paramIndex = 3;

    if (accessibleProjectIds.length > 0) {
      const placeholders = accessibleProjectIds.map((_, i) => `$${paramIndex + i}`).join(',');
      conditions.push(`ws.settlement_project_id IN (${placeholders})`);
      params = [...params, ...accessibleProjectIds];
      paramIndex += accessibleProjectIds.length;
    }

    if (dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
      conditions.push(`ws.created_at::date = $${paramIndex}`);
      params.push(dateFilter);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT ws.*, p.name as settlement_project_name
       FROM worker_settlements ws
       LEFT JOIN projects p ON p.id = ws.settlement_project_id
       ${whereClause}
       ORDER BY ws.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    let countConditions: string[] = [];
    let countParams: any[] = [];
    let countParamIndex = 1;
    if (accessibleProjectIds.length > 0) {
      const placeholders = accessibleProjectIds.map((_, i) => `$${countParamIndex + i}`).join(',');
      countConditions.push(`settlement_project_id IN (${placeholders})`);
      countParams = [...accessibleProjectIds];
      countParamIndex += accessibleProjectIds.length;
    }
    if (dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
      countConditions.push(`created_at::date = $${countParamIndex}`);
      countParams.push(dateFilter);
      countParamIndex++;
    }
    const countFilter = countConditions.length > 0 ? `WHERE ${countConditions.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM worker_settlements ${countFilter}`, countParams);
    const total = parseInt(countResult.rows[0].total);

    return sendSuccess(res, {
      settlements: result.rows,
      pagination: { total, limit, offset },
    }, 'تم جلب قائمة التصفيات بنجاح');
  } catch (error: any) {
    console.error('[Settlement] Error listing settlements:', error);
    return sendError(res, 'فشل في جلب قائمة التصفيات', 500);
  }
});

settlementRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accessReq = req as ProjectAccessRequest;
    const accessibleProjectIds = accessReq.accessibleProjectIds || [];

    const headerResult = await pool.query(
      `SELECT ws.*, p.name as settlement_project_name
       FROM worker_settlements ws
       LEFT JOIN projects p ON p.id = ws.settlement_project_id
       WHERE ws.id = $1`,
      [id]
    );

    if (headerResult.rows.length === 0) {
      return sendError(res, 'التصفية غير موجودة', 404);
    }

    if (accessibleProjectIds.length > 0 && !accessibleProjectIds.includes(headerResult.rows[0].settlement_project_id)) {
      return sendError(res, 'ليس لديك صلاحية الوصول لهذه التصفية', 403);
    }

    const linesResult = await pool.query(
      `SELECT wsl.*, w.name as worker_name, 
              fp.name as from_project_name, tp.name as to_project_name
       FROM worker_settlement_lines wsl
       LEFT JOIN workers w ON w.id = wsl.worker_id
       LEFT JOIN projects fp ON fp.id = wsl.from_project_id
       LEFT JOIN projects tp ON tp.id = wsl.to_project_id
       WHERE wsl.settlement_id = $1
       ORDER BY w.name, fp.name`,
      [id]
    );

    return sendSuccess(res, {
      settlement: headerResult.rows[0],
      lines: linesResult.rows,
    }, 'تم جلب تفاصيل التصفية بنجاح');
  } catch (error: any) {
    console.error('[Settlement] Error getting settlement details:', error);
    return sendError(res, 'فشل في جلب تفاصيل التصفية', 500);
  }
});

settlementRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accessReq = req as ProjectAccessRequest;
    const accessibleProjectIds = accessReq.accessibleProjectIds || [];
    const userId = getAuthUser(req)?.id || null;

    const headerResult = await pool.query(
      `SELECT * FROM worker_settlements WHERE id = $1`,
      [id]
    );

    if (headerResult.rows.length === 0) {
      return sendError(res, 'التصفية غير موجودة', 404);
    }

    const settlement = headerResult.rows[0];

    if (accessibleProjectIds.length > 0 && !accessibleProjectIds.includes(settlement.settlement_project_id)) {
      return sendError(res, 'ليس لديك صلاحية لحذف هذه التصفية', 403);
    }

    const result = await withTransaction(async (client) => {
      const lines = await client.query(
        `SELECT * FROM worker_settlement_lines WHERE settlement_id = $1`,
        [id]
      );

      const workerIds = [...new Set(lines.rows.map((l: any) => l.worker_id))];

      await client.query(
        `DELETE FROM worker_transfers 
         WHERE transfer_method = 'settlement' 
         AND transfer_date = $1 
         AND worker_id = ANY($2::text[])`,
        [settlement.settlement_date, workerIds]
      );

      await client.query(
        `DELETE FROM project_fund_transfers 
         WHERE transfer_reason = 'settlement' 
         AND transfer_date = $1
         AND (from_project_id = $2 OR to_project_id = $2)`,
        [settlement.settlement_date, settlement.settlement_project_id]
      );

      await client.query(
        `DELETE FROM worker_settlement_lines WHERE settlement_id = $1`,
        [id]
      );

      await client.query(
        `DELETE FROM worker_settlements WHERE id = $1`,
        [id]
      );

      try {
        await client.query(
          `INSERT INTO audit_logs (user_id, action, meta, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [
            userId,
            'SETTLEMENT_DELETED',
            JSON.stringify({
              settlementId: id,
              settlementProjectId: settlement.settlement_project_id,
              totalAmount: settlement.total_amount,
              workerCount: settlement.worker_count,
              deletedBy: userId,
            }),
          ]
        );
      } catch (auditErr) {
        console.warn('[Settlement] Failed to insert audit log for delete:', auditErr);
      }

      return {
        deletedLines: lines.rows.length,
        workerCount: workerIds.length,
      };
    });

    console.log(`🗑️ [Settlement] تم حذف التصفية ${id} بنجاح - ${result.deletedLines} سطر، ${result.workerCount} عامل`);
    return sendSuccess(res, result, 'تم حذف التصفية بنجاح وعكس جميع التحويلات المرتبطة');
  } catch (error: any) {
    console.error('[Settlement] ❌ Delete ERROR:', error?.message || error);
    return sendError(res, 'فشل في حذف التصفية', 500);
  }
});

export default settlementRouter;
