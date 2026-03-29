import { pool } from '../db';
import { FinancialLedgerService } from './FinancialLedgerService';
import { FinancialIntegrityService } from './FinancialIntegrityService';
import type pg from 'pg';

interface ProjectBalance {
  projectId: string;
  projectName: string;
  totalEarned: number;
  totalPaid: number;
  totalTransferred: number;
  currentBalance: number;
}

interface AllocationLine {
  projectId: string;
  amount: number;
}

interface TransferMeta {
  recipientName: string;
  recipientPhone?: string;
  transferNumber?: string;
  transferMethod: string;
  transferDate: string;
  senderName?: string;
  notes?: string;
  description?: string;
}

interface AllocationResult {
  success: boolean;
  batchId: string;
  transferIds: string[];
  projectFundTransferIds: string[];
  allocations: AllocationLine[];
}

const safeNum = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export class PaymentAllocationService {

  static async getWorkerOpenBalances(workerId: string): Promise<ProjectBalance[]> {
    const result = await pool.query(`
      SELECT 
        p.id AS project_id,
        p.name AS project_name,
        COALESCE(att.total_earned, 0) AS total_earned,
        COALESCE(att.total_paid, 0) AS total_paid,
        COALESCE(tr.total_transferred, 0) AS total_transferred,
        COALESCE(att.total_earned, 0) - COALESCE(att.total_paid, 0) - COALESCE(tr.total_transferred, 0) AS current_balance
      FROM projects p
      INNER JOIN (
        SELECT DISTINCT project_id FROM worker_attendance WHERE worker_id = $1
        UNION
        SELECT DISTINCT project_id FROM worker_transfers WHERE worker_id = $1
      ) wp ON wp.project_id = p.id
      LEFT JOIN (
        SELECT project_id,
          SUM(CASE WHEN actual_wage IS NOT NULL AND actual_wage::text != '' AND actual_wage::text != 'NaN' 
            THEN safe_numeric(actual_wage::text, 0) 
            ELSE safe_numeric(daily_wage::text, 0) * safe_numeric(work_days::text, 0) END) AS total_earned,
          SUM(safe_numeric(paid_amount::text, 0)) AS total_paid
        FROM worker_attendance WHERE worker_id = $1
        GROUP BY project_id
      ) att ON att.project_id = p.id
      LEFT JOIN (
        SELECT project_id,
          SUM(safe_numeric(amount::text, 0)) AS total_transferred
        FROM worker_transfers WHERE worker_id = $1
          AND COALESCE(transfer_method, '') != 'settlement'
        GROUP BY project_id
      ) tr ON tr.project_id = p.id
      ORDER BY current_balance DESC
    `, [workerId]);

    return result.rows.map((r: any) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      totalEarned: safeNum(r.total_earned),
      totalPaid: safeNum(r.total_paid),
      totalTransferred: safeNum(r.total_transferred),
      currentBalance: safeNum(r.current_balance),
    }));
  }

  static suggestAllocation(
    balances: ProjectBalance[],
    totalAmount: number,
    mode: 'proportional' | 'fifo' = 'proportional'
  ): AllocationLine[] {
    const positiveBalances = balances.filter(b => b.currentBalance > 0);
    if (positiveBalances.length === 0) {
      return balances.length > 0
        ? [{ projectId: balances[0].projectId, amount: totalAmount }]
        : [];
    }

    if (mode === 'fifo') {
      return this._allocateFIFO(positiveBalances, totalAmount);
    }
    return this._allocateProportional(positiveBalances, totalAmount);
  }

  private static _allocateProportional(balances: ProjectBalance[], totalAmount: number): AllocationLine[] {
    const totalPositive = balances.reduce((s, b) => s + b.currentBalance, 0);
    const allocations: AllocationLine[] = [];
    let remaining = totalAmount;

    for (let i = 0; i < balances.length; i++) {
      if (i === balances.length - 1) {
        allocations.push({
          projectId: balances[i].projectId,
          amount: Math.round(remaining * 100) / 100,
        });
      } else {
        const ratio = balances[i].currentBalance / totalPositive;
        const amount = Math.round(totalAmount * ratio * 100) / 100;
        const capped = Math.min(amount, remaining);
        allocations.push({ projectId: balances[i].projectId, amount: capped });
        remaining -= capped;
      }
    }

    return allocations.filter(a => a.amount > 0);
  }

  private static _allocateFIFO(balances: ProjectBalance[], totalAmount: number): AllocationLine[] {
    const sorted = [...balances].sort((a, b) => b.currentBalance - a.currentBalance);
    const allocations: AllocationLine[] = [];
    let remaining = totalAmount;

    for (const balance of sorted) {
      if (remaining <= 0) break;
      const amount = Math.min(balance.currentBalance, remaining);
      allocations.push({ projectId: balance.projectId, amount: Math.round(amount * 100) / 100 });
      remaining -= amount;
    }

    if (remaining > 0 && allocations.length > 0) {
      allocations[allocations.length - 1].amount += Math.round(remaining * 100) / 100;
    }

    return allocations;
  }

  static async executeAllocation(
    workerId: string,
    payerProjectId: string,
    totalAmount: number,
    allocations: AllocationLine[],
    meta: TransferMeta,
    createdBy?: string
  ): Promise<AllocationResult> {
    const allocTotal = allocations.reduce((s, a) => s + a.amount, 0);
    const diff = Math.abs(allocTotal - totalAmount);
    if (diff > 0.01) {
      throw new Error(`مجموع التوزيع (${allocTotal}) لا يساوي مبلغ الحوالة (${totalAmount})`);
    }

    if (allocations.some(a => a.amount <= 0)) {
      throw new Error('جميع مبالغ التوزيع يجب أن تكون موجبة');
    }

    const workerBalances = await PaymentAllocationService.getWorkerOpenBalances(workerId);
    const balanceMap = new Map(workerBalances.map(b => [b.projectId, b.currentBalance]));

    for (const alloc of allocations) {
      if (!balanceMap.has(alloc.projectId)) {
        throw new Error(`المشروع ${alloc.projectId} ليس ضمن مشاريع العامل`);
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const batchIdResult = await client.query(`SELECT gen_random_uuid() AS id`);
      const batchId = batchIdResult.rows[0].id;

      const transferIds: string[] = [];
      const projectFundTransferIds: string[] = [];

      for (const alloc of allocations) {
        const insertResult = await client.query(`
          INSERT INTO worker_transfers 
            (id, worker_id, project_id, amount, transfer_number, sender_name, recipient_name, 
             recipient_phone, transfer_method, transfer_date, notes, description, 
             batch_id, allocation_source_project)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `, [
          workerId,
          alloc.projectId,
          alloc.amount,
          meta.transferNumber || null,
          meta.senderName || null,
          meta.recipientName,
          meta.recipientPhone || null,
          meta.transferMethod,
          meta.transferDate,
          meta.notes || null,
          meta.description || `توزيع حوالة (${alloc.amount} من ${totalAmount})`,
          batchId,
          payerProjectId,
        ]);

        const transferId = insertResult.rows[0].id;
        transferIds.push(transferId);

        await FinancialLedgerService.recordWorkerTransferWithClient(
          client, alloc.projectId, alloc.amount, meta.transferDate, transferId, createdBy
        );

        if (alloc.projectId !== payerProjectId) {
          const pftResult = await client.query(`
            INSERT INTO project_fund_transfers 
              (id, from_project_id, to_project_id, amount, description, transfer_reason, transfer_date)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
            RETURNING id
          `, [
            payerProjectId,
            alloc.projectId,
            alloc.amount,
            `ترحيل تلقائي - حوالة عامل (batch: ${batchId})`,
            'worker_transfer_allocation',
            meta.transferDate,
          ]);

          const pftId = pftResult.rows[0].id;
          projectFundTransferIds.push(pftId);

          await FinancialLedgerService.recordProjectTransferWithClient(
            client, payerProjectId, alloc.projectId, alloc.amount, 
            meta.transferDate, pftId, createdBy
          );
        }
      }

      await client.query('COMMIT');

      const affectedProjects = new Set(allocations.map(a => a.projectId));
      affectedProjects.add(payerProjectId);
      for (const projectId of affectedProjects) {
        try {
          await FinancialIntegrityService.syncWorkerBalance(workerId, projectId);
        } catch (e) {
          console.warn(`[PaymentAllocation] Failed to sync balance for project ${projectId}:`, e);
        }
      }

      return {
        success: true,
        batchId,
        transferIds,
        projectFundTransferIds,
        allocations,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async reverseBatch(batchId: string, createdBy?: string): Promise<{ success: boolean; reversedCount: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const transfers = await client.query(`
        SELECT id, worker_id, project_id, amount, transfer_date, allocation_source_project
        FROM worker_transfers WHERE batch_id = $1
      `, [batchId]);

      if (transfers.rows.length === 0) {
        throw new Error(`لم يتم العثور على حوالات بمعرف الدفعة: ${batchId}`);
      }

      const workerId = transfers.rows[0].worker_id;

      const fundTransfers = await client.query(`
        SELECT id FROM project_fund_transfers 
        WHERE transfer_reason = 'worker_transfer_allocation' 
          AND description LIKE $1
      `, [`%batch: ${batchId}%`]);

      const allSourceIds = [
        ...transfers.rows.map((r: any) => r.id),
        ...fundTransfers.rows.map((r: any) => r.id),
      ];

      if (allSourceIds.length > 0) {
        await client.query(`
          DELETE FROM journal_entries 
          WHERE source_id IN (SELECT unnest($1::text[]))
        `, [allSourceIds]);
      }

      await client.query(`DELETE FROM worker_transfers WHERE batch_id = $1`, [batchId]);

      await client.query(`
        DELETE FROM project_fund_transfers 
        WHERE transfer_reason = 'worker_transfer_allocation' 
          AND description LIKE $1
      `, [`%batch: ${batchId}%`]);

      await client.query('COMMIT');

      const affectedProjects = new Set(transfers.rows.map((r: any) => r.project_id));
      const sourceProject = transfers.rows[0].allocation_source_project;
      if (sourceProject) affectedProjects.add(sourceProject);

      for (const projectId of affectedProjects) {
        try {
          await FinancialIntegrityService.syncWorkerBalance(workerId, projectId as string);
        } catch (e) {
          console.warn(`[PaymentAllocation] Reverse sync failed for project ${projectId}:`, e);
        }
      }

      return { success: true, reversedCount: transfers.rows.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
