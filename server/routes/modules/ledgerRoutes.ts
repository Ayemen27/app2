import express from 'express';
import { Request, Response } from 'express';
import { FinancialLedgerService } from '../../services/FinancialLedgerService';
import { ExpenseLedgerService } from '../../services/ExpenseLedgerService';
import { db } from '../../db';
import { financialAuditLog, journalEntries, journalLines, reconciliationRecords } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth.js';

export const ledgerRouter = express.Router();

ledgerRouter.use(requireAuth);

ledgerRouter.get('/trial-balance/:project_id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;
    const { date } = req.query;

    const trialBalance = await FinancialLedgerService.getTrialBalance(
      project_id, date as string | undefined
    );

    const totalDebit = trialBalance.reduce((sum: number, row: any) => sum + parseFloat(row.total_debit || '0'), 0);
    const totalCredit = trialBalance.reduce((sum: number, row: any) => sum + parseFloat(row.total_credit || '0'), 0);

    res.json({
      success: true,
      data: {
        accounts: trialBalance,
        totals: { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 },
      },
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.get('/balance/:project_id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;
    const { date } = req.query;

    const balance = await FinancialLedgerService.getLedgerBalance(
      project_id, date as string | undefined
    );

    res.json({
      success: true,
      data: { balance, project_id, date: date || 'cumulative' },
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.get('/journal/:project_id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;
    const { fromDate, toDate } = req.query;

    const entries = await FinancialLedgerService.getProjectJournalEntries(
      project_id, fromDate as string | undefined, toDate as string | undefined
    );

    res.json({
      success: true,
      data: entries,
      count: entries.length,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.get('/journal-entry/:entryId/lines', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { entryId } = req.params;

    const lines = await db.select().from(journalLines)
      .where(eq(journalLines.journalEntryId, entryId));

    res.json({
      success: true,
      data: lines,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.post('/reconcile/:project_id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: 'التاريخ مطلوب' });
    }

    const result = await FinancialLedgerService.runReconciliation(project_id, date);

    res.json({
      success: true,
      data: result,
      message: result.status === 'matched' ? 'المطابقة ناجحة - لا يوجد فرق' : `تم اكتشاف فرق: ${result.discrepancy}`,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.get('/audit-log/:project_id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;
    const { limit: limitStr } = req.query;
    const limit = Math.min(parseInt(String(limitStr || '50'), 10), 200);

    const logs = await db.select().from(financialAuditLog)
      .where(eq(financialAuditLog.project_id, project_id))
      .orderBy(desc(financialAuditLog.created_at))
      .limit(limit);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.get('/reconciliation-history/:project_id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    const records = await db.select().from(reconciliationRecords)
      .where(eq(reconciliationRecords.project_id, project_id))
      .orderBy(desc(reconciliationRecords.created_at))
      .limit(30);

    res.json({
      success: true,
      data: records,
      count: records.length,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.post('/reverse-entry/:entryId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { entryId } = req.params;
    const { reason } = req.body;
    const user = req.user as any;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'سبب العكس مطلوب' });
    }

    const reversalId = await FinancialLedgerService.reverseEntry(entryId, reason, user?.id);

    res.json({
      success: true,
      data: { reversalId, originalEntryId: entryId },
      message: 'تم عكس القيد بنجاح',
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.get('/summary/:project_id', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.params;
    const { date } = req.query;

    const summary = date
      ? await ExpenseLedgerService.getDailyFinancialSummary(project_id, date as string)
      : await ExpenseLedgerService.getProjectFinancialSummary(project_id);

    res.json({ success: true, data: summary, message: 'تم جلب الملخص المالي بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

ledgerRouter.get('/projects-stats', async (_req: Request, res: Response) => {
  try {
    const summaries = await ExpenseLedgerService.getAllProjectsStats();

    res.json({
      success: true,
      data: summaries,
      message: `تم جلب إحصائيات ${summaries.length} مشروع بنجاح`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

ledgerRouter.get('/daily-summary/:project_id/:date', async (req: Request, res: Response) => {
  try {
    const { project_id, date } = req.params;

    const summary = await ExpenseLedgerService.getDailyFinancialSummary(project_id, date);

    res.json({ success: true, data: summary, message: 'تم جلب الملخص اليومي بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('📒 [LedgerRouter] تم تهيئة مسارات دفتر الأستاذ الموحّد (قيد مزدوج + ملخصات + تدقيق)');

export default ledgerRouter;
