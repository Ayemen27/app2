/**
 * خدمة دفتر الأستاذ المالي (كتابة + قيد مزدوج)
 * Financial Ledger Service - WRITE (Double-Entry Bookkeeping)
 * 
 * الدور: تسجيل القيود المحاسبية المزدوجة + التدقيق + المطابقة
 * كل عملية مالية تمر من هنا لتسجيل قيد مدين/دائن
 * 
 * الكتابة المحاسبية: هذه الخدمة (FinancialLedgerService)
 * القراءة والتقارير: ExpenseLedgerService
 */

import { db, pool, withTransaction } from '../db';
import { journalEntries, journalLines, financialAuditLog, reconciliationRecords, summaryInvalidations, projects } from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type pg from 'pg';
import { CentralLogService } from './CentralLogService';

const ACCOUNT_CODES = {
  CASH: '1100',
  FUND_TRANSFER_IN: '4000',
  PROJECT_TRANSFER_IN: '4100',
  MATERIAL_EXPENSE: '5000',
  WORKER_WAGES: '5100',
  TRANSPORT_EXPENSE: '5200',
  WORKER_TRANSFERS: '5300',
  MISC_EXPENSE: '5400',
  PROJECT_TRANSFER_OUT: '5500',
  SUPPLIER_PAYABLE: '2000',
} as const;

export class FinancialLedgerService {

  private static async _createJournalEntryWithClient(client: pg.PoolClient, params: {
    project_id: string;
    entryDate: string;
    description: string;
    sourceTable: string;
    sourceId: string;
    entryType?: string;
    reversalOfId?: string;
    lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      description?: string;
    }>;
    createdBy?: string;
  }): Promise<string> {
    const totalDebit = params.lines.reduce((sum, l) => sum + Math.round(l.debitAmount * 100), 0) / 100;
    const totalCredit = params.lines.reduce((sum, l) => sum + Math.round(l.creditAmount * 100), 0) / 100;

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`قيد غير متوازن: مدين=${totalDebit}, دائن=${totalCredit}`);
    }

    const entryResult = await client.query(
      `INSERT INTO journal_entries (project_id, entry_date, description, source_table, source_id, entry_type, reversal_of_id, total_amount, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        params.project_id,
        params.entryDate,
        params.description,
        params.sourceTable,
        params.sourceId,
        params.entryType || 'original',
        params.reversalOfId || null,
        totalDebit.toFixed(2),
        'posted',
        params.createdBy || null,
      ]
    );
    const entry = entryResult.rows[0];

    for (const line of params.lines) {
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_code, debit_amount, credit_amount, description) VALUES ($1, $2, $3, $4, $5)`,
        [
          entry.id,
          line.accountCode,
          line.debitAmount.toFixed(2),
          line.creditAmount.toFixed(2),
          line.description || null,
        ]
      );
    }

    console.log(`📒 [Ledger] قيد #${entry.entry_number}: ${params.description} (${totalDebit.toFixed(2)})`);

    CentralLogService.getInstance().logDomain({
      source: 'finance',
      module: 'مالية',
      action: params.entryType || 'journal_entry',
      level: 'info',
      status: 'success',
      actorUserId: params.createdBy,
      project_id: params.project_id,
      entityType: 'journal_entry',
      entityId: entry.id,
      message: `قيد محاسبي: ${params.description}`,
      amount: totalDebit,
      details: { sourceTable: params.sourceTable, sourceId: params.sourceId, entryNumber: entry.entry_number },
    });

    return entry.id;
  }

  static async createJournalEntry(params: {
    project_id: string;
    entryDate: string;
    description: string;
    sourceTable: string;
    sourceId: string;
    entryType?: string;
    reversalOfId?: string;
    lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      description?: string;
    }>;
    createdBy?: string;
  }): Promise<string> {
    return withTransaction(async (client) => this._createJournalEntryWithClient(client, params));
  }

  static async recordFundTransfer(project_id: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    const entryId = await this.createJournalEntry({
      project_id, entryDate: date,
      description: `تحويل عهدة بقيمة ${amount}`,
      sourceTable: 'fund_transfers', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: amount, creditAmount: 0, description: 'استلام عهدة' },
        { accountCode: ACCOUNT_CODES.FUND_TRANSFER_IN, debitAmount: 0, creditAmount: amount, description: 'تحويل عهدة وارد' },
      ]
    });
    await this.invalidateSummaries(project_id, date, 'تسجيل قيد: تحويل عهدة', 'fund_transfers', sourceId);
    return entryId;
  }

  static async recordMaterialPurchase(project_id: string, amount: number, date: string, sourceId: string, purchaseType: string, createdBy?: string) {
    if (purchaseType === 'نقد' || purchaseType === 'نقداً') {
      return this.createJournalEntry({
        project_id, entryDate: date,
        description: `شراء مواد نقداً بقيمة ${amount}`,
        sourceTable: 'material_purchases', sourceId,
        createdBy,
        lines: [
          { accountCode: ACCOUNT_CODES.MATERIAL_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'مصاريف مواد' },
          { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع نقدي' },
        ]
      });
    } else if (purchaseType === 'مخزن' || purchaseType === 'توريد' || purchaseType === 'مخزني') {
      return this.createJournalEntry({
        project_id, entryDate: date,
        description: `توريد مواد للمخزن بقيمة ${amount}`,
        sourceTable: 'material_purchases', sourceId,
        createdBy,
        lines: [
          { accountCode: ACCOUNT_CODES.MATERIAL_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'توريد مواد للمخزن' },
        ]
      });
    } else {
      return this.createJournalEntry({
        project_id, entryDate: date,
        description: `شراء مواد آجل بقيمة ${amount}`,
        sourceTable: 'material_purchases', sourceId,
        createdBy,
        lines: [
          { accountCode: ACCOUNT_CODES.MATERIAL_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'مصاريف مواد' },
          { accountCode: ACCOUNT_CODES.SUPPLIER_PAYABLE, debitAmount: 0, creditAmount: amount, description: 'ذمم دائنة - مورد' },
        ]
      });
    }
  }

  static async recordWorkerWage(project_id: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    const entryId = await this.createJournalEntry({
      project_id, entryDate: date,
      description: `أجر عامل بقيمة ${amount}`,
      sourceTable: 'worker_attendance', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.WORKER_WAGES, debitAmount: amount, creditAmount: 0, description: 'أجور عمال' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع أجر' },
      ]
    });
    await this.invalidateSummaries(project_id, date, 'تسجيل قيد: أجر عامل', 'worker_attendance', sourceId);
    return entryId;
  }

  static async recordTransportExpense(project_id: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    const entryId = await this.createJournalEntry({
      project_id, entryDate: date,
      description: `مصاريف نقل بقيمة ${amount}`,
      sourceTable: 'transportation_expenses', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.TRANSPORT_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'مصاريف نقل' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع نقل' },
      ]
    });
    await this.invalidateSummaries(project_id, date, 'تسجيل قيد: مصاريف نقل', 'transportation_expenses', sourceId);
    return entryId;
  }

  static async recordWorkerTransfer(project_id: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    const entryId = await this.createJournalEntry({
      project_id, entryDate: date,
      description: `حوالة عامل بقيمة ${amount}`,
      sourceTable: 'worker_transfers', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.WORKER_TRANSFERS, debitAmount: amount, creditAmount: 0, description: 'حوالة عامل' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع حوالة' },
      ]
    });
    await this.invalidateSummaries(project_id, date, 'تسجيل قيد: حوالة عامل', 'worker_transfers', sourceId);
    return entryId;
  }

  static async recordMiscExpense(project_id: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    const entryId = await this.createJournalEntry({
      project_id, entryDate: date,
      description: `مصروف متنوع بقيمة ${amount}`,
      sourceTable: 'worker_misc_expenses', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.MISC_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'مصاريف متنوعة' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع مصروف' },
      ]
    });
    await this.invalidateSummaries(project_id, date, 'تسجيل قيد: مصروف متنوع', 'worker_misc_expenses', sourceId);
    return entryId;
  }

  static async recordProjectTransfer(fromProjectId: string, toProjectId: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    await withTransaction(async (client) => {
      await this._createJournalEntryWithClient(client, {
        project_id: fromProjectId, entryDate: date,
        description: `تحويل صادر لمشروع آخر بقيمة ${amount}`,
        sourceTable: 'project_fund_transfers', sourceId,
        createdBy,
        lines: [
          { accountCode: ACCOUNT_CODES.PROJECT_TRANSFER_OUT, debitAmount: amount, creditAmount: 0 },
          { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount },
        ]
      });

      await this._createJournalEntryWithClient(client, {
        project_id: toProjectId, entryDate: date,
        description: `تحويل وارد من مشروع آخر بقيمة ${amount}`,
        sourceTable: 'project_fund_transfers', sourceId,
        createdBy,
        lines: [
          { accountCode: ACCOUNT_CODES.CASH, debitAmount: amount, creditAmount: 0 },
          { accountCode: ACCOUNT_CODES.PROJECT_TRANSFER_IN, debitAmount: 0, creditAmount: amount },
        ]
      });
    });
    await this.invalidateSummaries(fromProjectId, date, 'تسجيل قيد: تحويل صادر بين مشاريع', 'project_fund_transfers', sourceId);
    await this.invalidateSummaries(toProjectId, date, 'تسجيل قيد: تحويل وارد بين مشاريع', 'project_fund_transfers', sourceId);
  }

  static async reverseEntry(entryId: string, reason: string, createdBy?: string) {
    return withTransaction(async (client) => {
      const lockResult = await client.query(
        `SELECT * FROM journal_entries WHERE id = $1 FOR UPDATE`,
        [entryId]
      );
      const original = lockResult.rows[0];
      if (!original || original.status === 'reversed') {
        throw new Error('القيد غير موجود أو مُعكوس مسبقاً');
      }

      const linesResult = await client.query(
        `SELECT * FROM journal_lines WHERE journal_entry_id = $1`,
        [entryId]
      );
      const originalLines = linesResult.rows;

      const updateResult = await client.query(
        `UPDATE journal_entries SET status = 'reversed' WHERE id = $1 AND status != 'reversed'`,
        [entryId]
      );
      if (!updateResult.rowCount || updateResult.rowCount === 0) {
        throw new Error('فشل تحديث حالة القيد - ربما تم عكسه بواسطة عملية أخرى');
      }

      return this._createJournalEntryWithClient(client, {
        project_id: original.project_id || '',
        entryDate: original.entry_date,
        description: `عكس: ${original.description} - السبب: ${reason}`,
        sourceTable: original.source_table,
        sourceId: original.source_id,
        entryType: 'reversal',
        reversalOfId: entryId,
        createdBy,
        lines: originalLines.map((line: any) => ({
          accountCode: line.account_code,
          debitAmount: Math.round(parseFloat(String(line.credit_amount || '0')) * 100) / 100,
          creditAmount: Math.round(parseFloat(String(line.debit_amount || '0')) * 100) / 100,
          description: `عكس: ${line.description || ''}`,
        }))
      });
    });
  }

  static async logFinancialChange(params: {
    project_id?: string;
    action: string;
    entityType: string;
    entityId: string;
    previousData?: any;
    newData?: any;
    changedFields?: string[];
    user_id?: string;
    userEmail?: string;
    reason?: string;
  }) {
    try {
      await db.insert(financialAuditLog).values({
        project_id: params.project_id || undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousData: params.previousData,
        newData: params.newData,
        changedFields: params.changedFields,
        user_id: params.user_id || undefined,
        userEmail: params.userEmail,
        reason: params.reason,
      });

      CentralLogService.getInstance().logDomain({
        source: 'finance',
        module: 'مالية',
        action: params.action,
        level: 'info',
        status: 'success',
        actorUserId: params.user_id,
        project_id: params.project_id,
        entityType: params.entityType,
        entityId: params.entityId,
        message: `عملية مالية: ${params.action} على ${params.entityType} #${params.entityId}${params.reason ? ` - ${params.reason}` : ''}`,
        details: { previousData: params.previousData, newData: params.newData, changedFields: params.changedFields, reason: params.reason },
      });
    } catch (error) {
      console.error('⚠️ [AuditLog] فشل في تسجيل التدقيق:', error);
    }
  }

  static async findAndReverseBySource(sourceTable: string, sourceId: string, reason: string, createdBy?: string): Promise<string | null> {
    try {
      const existing = await db.select().from(journalEntries)
        .where(and(
          eq(journalEntries.sourceTable, sourceTable),
          eq(journalEntries.sourceId, sourceId),
          eq(journalEntries.status, 'posted')
        ));

      if (!existing.length) return null;

      for (const entry of existing) {
        await this.reverseEntry(entry.id, reason, createdBy);
        await this.invalidateSummaries(entry.project_id || '', entry.entryDate, reason, sourceTable, sourceId);
      }
      console.log(`🔄 [Ledger] عكس ${existing.length} قيد لـ ${sourceTable}/${sourceId}: ${reason}`);

      CentralLogService.getInstance().logDomain({
        source: 'finance',
        module: 'مالية',
        action: 'reversal',
        level: 'warn',
        status: 'success',
        actorUserId: createdBy,
        entityType: 'journal_entry',
        entityId: existing[0].id,
        message: `عكس ${existing.length} قيد لـ ${sourceTable}/${sourceId}: ${reason}`,
        details: { sourceTable, sourceId, reason, reversedCount: existing.length },
      });

      return existing[0].id;
    } catch (error) {
      console.error(`⚠️ [Ledger] فشل عكس قيود ${sourceTable}/${sourceId}:`, error);
      return null;
    }
  }

  static async safeRecord(fn: () => Promise<string>, context: string): Promise<void> {
    try {
      await fn();
    } catch (error) {
      console.error(`⚠️ [Ledger] فشل تسجيل قيد (${context}):`, error);
    }
  }

  static async invalidateSummaries(project_id: string, fromDate: string, reason: string, sourceTable?: string, sourceId?: string) {
    try {
      const { markInvalid } = await import('./SummaryRebuildService');
      await markInvalid(project_id, fromDate);
      console.log(`🔄 [Invalidation] أُبطلت ملخصات ${project_id} من ${fromDate}: ${reason}`);
    } catch (error) {
      console.error('⚠️ [Invalidation] فشل في إبطال الملخصات:', error);
    }
  }

  static async runReconciliation(project_id: string, date: string): Promise<{
    ledgerBalance: number;
    computedBalance: number;
    discrepancy: number;
    status: string;
  }> {
    const ledgerResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CAST(jl.debit_amount AS DECIMAL(15,2))), 0) - 
        COALESCE(SUM(CAST(jl.credit_amount AS DECIMAL(15,2))), 0) as balance
      FROM journal_lines jl
      INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE je.project_id = $1 AND je.entry_date <= $2 AND je.status = 'posted'
        AND jl.account_code = '1100'
    `, [project_id, date]);
    const ledgerBalance = Math.round(parseFloat(String(ledgerResult.rows[0]?.balance || '0')) * 100) / 100;

    const computedResult = await pool.query(`
      WITH income AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
        FROM fund_transfers WHERE project_id = $1 AND transfer_date::date <= $2::date
        UNION ALL
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total
        FROM project_fund_transfers WHERE to_project_id = $1 AND transfer_date::date <= $2::date
      ),
      expenses AS (
        SELECT COALESCE(SUM(CAST(paid_amount AS DECIMAL(15,2))), 0) as total
        FROM worker_attendance WHERE project_id = $1 AND attendance_date::date <= $2::date AND CAST(paid_amount AS DECIMAL) > 0
        UNION ALL
        SELECT COALESCE(SUM(
          CASE WHEN CAST(paid_amount AS DECIMAL) > 0 THEN CAST(paid_amount AS DECIMAL(15,2))
               ELSE CAST(total_amount AS DECIMAL(15,2)) END
        ), 0) as total
        FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقد' OR purchase_type = 'نقداً') AND purchase_date::date <= $2::date
        UNION ALL
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total FROM transportation_expenses WHERE project_id = $1 AND date::date <= $2::date
        UNION ALL
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total FROM worker_transfers WHERE project_id = $1 AND transfer_date::date <= $2::date
        UNION ALL
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total FROM worker_misc_expenses WHERE project_id = $1 AND date::date <= $2::date
        UNION ALL
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total FROM project_fund_transfers WHERE from_project_id = $1 AND transfer_date::date <= $2::date
        UNION ALL
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total FROM supplier_payments WHERE project_id = $1 AND payment_date::date <= $2::date
      )
      SELECT 
        COALESCE((SELECT SUM(total) FROM income), 0) - COALESCE((SELECT SUM(total) FROM expenses), 0) as balance
    `, [project_id, date]);
    const computedBalance = Math.round(parseFloat(String(computedResult.rows[0]?.balance || '0')) * 100) / 100;

    const discrepancy = Math.round(Math.abs(ledgerBalance - computedBalance) * 100) / 100;
    const status = discrepancy < 0.01 ? 'matched' : 'discrepancy';

    await db.insert(reconciliationRecords).values({
      project_id,
      reconciliationDate: date,
      ledgerBalance: ledgerBalance.toFixed(2),
      computedBalance: computedBalance.toFixed(2),
      discrepancy: discrepancy.toFixed(2),
      status,
    });

    console.log(`🔍 [Reconciliation] ${project_id}@${date}: دفتر=${ledgerBalance}, محسوب=${computedBalance}, فرق=${discrepancy}, حالة=${status}`);
    return { ledgerBalance, computedBalance, discrepancy, status };
  }

  static async getLedgerBalance(project_id: string, upToDate?: string): Promise<number> {
    const dateFilter = upToDate ? `AND je.entry_date <= $2` : '';
    const params = upToDate ? [project_id, upToDate] : [project_id];

    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(CAST(jl.debit_amount AS DECIMAL(15,2))), 0) - 
        COALESCE(SUM(CAST(jl.credit_amount AS DECIMAL(15,2))), 0) as balance
      FROM journal_lines jl
      INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE je.project_id = $1 AND je.status = 'posted'
        AND jl.account_code = '1100'
        ${dateFilter}
    `, params);

    return Math.round(parseFloat(String(result.rows[0]?.balance || '0')) * 100) / 100;
  }

  static async getProjectJournalEntries(project_id: string, fromDate?: string, toDate?: string) {
    const conditions: any[] = [eq(journalEntries.project_id, project_id)];
    if (fromDate) conditions.push(gte(journalEntries.entryDate, fromDate));
    if (toDate) conditions.push(lte(journalEntries.entryDate, toDate));

    return db.select().from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.created_at));
  }

  static async runDailyReconciliation(): Promise<void> {
    try {
      const activeProjects = await db.select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.status, 'active'));

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      console.log(`🔄 [Reconciliation] بدء المطابقة اليومية لـ ${activeProjects.length} مشروع (${dateStr})`);

      for (const project of activeProjects) {
        try {
          await this.runReconciliation(project.id, dateStr);
        } catch (err) {
          console.error(`⚠️ [Reconciliation] فشل مطابقة مشروع ${project.name}:`, err);
        }
      }

      console.log(`✅ [Reconciliation] اكتملت المطابقة اليومية`);
    } catch (error) {
      console.error('❌ [Reconciliation] خطأ في المطابقة التلقائية:', error);
    }
  }

  static async getTrialBalance(project_id: string, upToDate?: string) {
    const dateFilter = upToDate ? `AND je.entry_date <= $2` : '';
    const params = upToDate ? [project_id, upToDate] : [project_id];

    const result = await pool.query(`
      SELECT 
        jl.account_code,
        at.name_ar as account_name,
        at.category,
        COALESCE(SUM(CAST(jl.debit_amount AS DECIMAL(15,2))), 0) as total_debit,
        COALESCE(SUM(CAST(jl.credit_amount AS DECIMAL(15,2))), 0) as total_credit,
        COALESCE(SUM(CAST(jl.debit_amount AS DECIMAL(15,2))), 0) - 
        COALESCE(SUM(CAST(jl.credit_amount AS DECIMAL(15,2))), 0) as balance
      FROM journal_lines jl
      INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
      LEFT JOIN account_types at ON at.code = jl.account_code
      WHERE je.project_id = $1 AND je.status = 'posted'
        ${dateFilter}
      GROUP BY jl.account_code, at.name_ar, at.category
      ORDER BY jl.account_code
    `, params);

    return result.rows;
  }
}

export default FinancialLedgerService;
