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

import { db, pool } from '../db';
import { journalEntries, journalLines, financialAuditLog, reconciliationRecords, summaryInvalidations } from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

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

  static async createJournalEntry(params: {
    projectId: string;
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
    const totalDebit = params.lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + l.creditAmount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`قيد غير متوازن: مدين=${totalDebit}, دائن=${totalCredit}`);
    }

    const [entry] = await db.insert(journalEntries).values({
      projectId: params.projectId,
      entryDate: params.entryDate,
      description: params.description,
      sourceTable: params.sourceTable,
      sourceId: params.sourceId,
      entryType: params.entryType || 'original',
      reversalOfId: params.reversalOfId || undefined,
      totalAmount: totalDebit.toFixed(2),
      status: 'posted',
      createdBy: params.createdBy || undefined,
    }).returning();

    await db.insert(journalLines).values(
      params.lines.map(line => ({
        journalEntryId: entry.id,
        accountCode: line.accountCode,
        debitAmount: line.debitAmount.toFixed(2),
        creditAmount: line.creditAmount.toFixed(2),
        description: line.description,
      }))
    );

    console.log(`📒 [Ledger] قيد #${entry.entryNumber}: ${params.description} (${totalDebit.toFixed(2)})`);
    return entry.id;
  }

  static async recordFundTransfer(projectId: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    return this.createJournalEntry({
      projectId, entryDate: date,
      description: `تحويل عهدة بقيمة ${amount}`,
      sourceTable: 'fund_transfers', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: amount, creditAmount: 0, description: 'استلام عهدة' },
        { accountCode: ACCOUNT_CODES.FUND_TRANSFER_IN, debitAmount: 0, creditAmount: amount, description: 'تحويل عهدة وارد' },
      ]
    });
  }

  static async recordMaterialPurchase(projectId: string, amount: number, date: string, sourceId: string, purchaseType: string, createdBy?: string) {
    if (purchaseType === 'نقد' || purchaseType === 'نقداً') {
      return this.createJournalEntry({
        projectId, entryDate: date,
        description: `شراء مواد نقداً بقيمة ${amount}`,
        sourceTable: 'material_purchases', sourceId,
        createdBy,
        lines: [
          { accountCode: ACCOUNT_CODES.MATERIAL_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'مصاريف مواد' },
          { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع نقدي' },
        ]
      });
    } else {
      return this.createJournalEntry({
        projectId, entryDate: date,
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

  static async recordWorkerWage(projectId: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    return this.createJournalEntry({
      projectId, entryDate: date,
      description: `أجر عامل بقيمة ${amount}`,
      sourceTable: 'worker_attendance', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.WORKER_WAGES, debitAmount: amount, creditAmount: 0, description: 'أجور عمال' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع أجر' },
      ]
    });
  }

  static async recordTransportExpense(projectId: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    return this.createJournalEntry({
      projectId, entryDate: date,
      description: `مصاريف نقل بقيمة ${amount}`,
      sourceTable: 'transportation_expenses', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.TRANSPORT_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'مصاريف نقل' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع نقل' },
      ]
    });
  }

  static async recordWorkerTransfer(projectId: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    return this.createJournalEntry({
      projectId, entryDate: date,
      description: `حوالة عامل بقيمة ${amount}`,
      sourceTable: 'worker_transfers', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.WORKER_TRANSFERS, debitAmount: amount, creditAmount: 0, description: 'حوالة عامل' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع حوالة' },
      ]
    });
  }

  static async recordMiscExpense(projectId: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    return this.createJournalEntry({
      projectId, entryDate: date,
      description: `مصروف متنوع بقيمة ${amount}`,
      sourceTable: 'worker_misc_expenses', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.MISC_EXPENSE, debitAmount: amount, creditAmount: 0, description: 'مصاريف متنوعة' },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount, description: 'دفع مصروف' },
      ]
    });
  }

  static async recordProjectTransfer(fromProjectId: string, toProjectId: string, amount: number, date: string, sourceId: string, createdBy?: string) {
    await this.createJournalEntry({
      projectId: fromProjectId, entryDate: date,
      description: `تحويل صادر لمشروع آخر بقيمة ${amount}`,
      sourceTable: 'project_fund_transfers', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.PROJECT_TRANSFER_OUT, debitAmount: amount, creditAmount: 0 },
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: 0, creditAmount: amount },
      ]
    });

    await this.createJournalEntry({
      projectId: toProjectId, entryDate: date,
      description: `تحويل وارد من مشروع آخر بقيمة ${amount}`,
      sourceTable: 'project_fund_transfers', sourceId,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.CASH, debitAmount: amount, creditAmount: 0 },
        { accountCode: ACCOUNT_CODES.PROJECT_TRANSFER_IN, debitAmount: 0, creditAmount: amount },
      ]
    });
  }

  static async reverseEntry(entryId: string, reason: string, createdBy?: string) {
    const original = await db.select().from(journalEntries).where(eq(journalEntries.id, entryId)).limit(1);
    if (!original.length || original[0].status === 'reversed') {
      throw new Error('القيد غير موجود أو مُعكوس مسبقاً');
    }

    const originalLines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, entryId));

    await db.update(journalEntries).set({ status: 'reversed' }).where(eq(journalEntries.id, entryId));

    return this.createJournalEntry({
      projectId: original[0].projectId || '',
      entryDate: original[0].entryDate,
      description: `عكس: ${original[0].description} - السبب: ${reason}`,
      sourceTable: original[0].sourceTable,
      sourceId: original[0].sourceId,
      entryType: 'reversal',
      reversalOfId: entryId,
      createdBy,
      lines: originalLines.map(line => ({
        accountCode: line.accountCode,
        debitAmount: parseFloat(String(line.creditAmount || '0')),
        creditAmount: parseFloat(String(line.debitAmount || '0')),
        description: `عكس: ${line.description || ''}`,
      }))
    });
  }

  static async logFinancialChange(params: {
    projectId?: string;
    action: string;
    entityType: string;
    entityId: string;
    previousData?: any;
    newData?: any;
    changedFields?: string[];
    userId?: string;
    userEmail?: string;
    reason?: string;
  }) {
    try {
      await db.insert(financialAuditLog).values({
        projectId: params.projectId || undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousData: params.previousData,
        newData: params.newData,
        changedFields: params.changedFields,
        userId: params.userId || undefined,
        userEmail: params.userEmail,
        reason: params.reason,
      });
    } catch (error) {
      console.error('⚠️ [AuditLog] فشل في تسجيل التدقيق:', error);
    }
  }

  static async invalidateSummaries(projectId: string, fromDate: string, reason: string, sourceTable?: string, sourceId?: string) {
    try {
      await db.insert(summaryInvalidations).values({
        projectId,
        invalidatedFrom: fromDate,
        reason,
        sourceTable: sourceTable || undefined,
        sourceId: sourceId || undefined,
      });
      console.log(`🔄 [Invalidation] أُبطلت ملخصات ${projectId} من ${fromDate}: ${reason}`);
    } catch (error) {
      console.error('⚠️ [Invalidation] فشل في إبطال الملخصات:', error);
    }
  }

  static async runReconciliation(projectId: string, date: string): Promise<{
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
    `, [projectId, date]);
    const ledgerBalance = parseFloat(String(ledgerResult.rows[0]?.balance || '0'));

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
      )
      SELECT 
        COALESCE((SELECT SUM(total) FROM income), 0) - COALESCE((SELECT SUM(total) FROM expenses), 0) as balance
    `, [projectId, date]);
    const computedBalance = parseFloat(String(computedResult.rows[0]?.balance || '0'));

    const discrepancy = Math.abs(ledgerBalance - computedBalance);
    const status = discrepancy < 0.01 ? 'matched' : 'discrepancy';

    await db.insert(reconciliationRecords).values({
      projectId,
      reconciliationDate: date,
      ledgerBalance: ledgerBalance.toFixed(2),
      computedBalance: computedBalance.toFixed(2),
      discrepancy: discrepancy.toFixed(2),
      status,
    });

    console.log(`🔍 [Reconciliation] ${projectId}@${date}: دفتر=${ledgerBalance}, محسوب=${computedBalance}, فرق=${discrepancy}, حالة=${status}`);
    return { ledgerBalance, computedBalance, discrepancy, status };
  }

  static async getLedgerBalance(projectId: string, upToDate?: string): Promise<number> {
    const dateFilter = upToDate ? `AND je.entry_date <= $2` : '';
    const params = upToDate ? [projectId, upToDate] : [projectId];

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

    return parseFloat(String(result.rows[0]?.balance || '0'));
  }

  static async getProjectJournalEntries(projectId: string, fromDate?: string, toDate?: string) {
    const conditions: any[] = [eq(journalEntries.projectId, projectId)];
    if (fromDate) conditions.push(gte(journalEntries.entryDate, fromDate));
    if (toDate) conditions.push(lte(journalEntries.entryDate, toDate));

    return db.select().from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.createdAt));
  }

  static async getTrialBalance(projectId: string, upToDate?: string) {
    const dateFilter = upToDate ? `AND je.entry_date <= $2` : '';
    const params = upToDate ? [projectId, upToDate] : [projectId];

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
