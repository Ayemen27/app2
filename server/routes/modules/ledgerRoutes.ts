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

ledgerRouter.get('/trial-balance/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    const trialBalance = await FinancialLedgerService.getTrialBalance(
      projectId, date as string | undefined
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

ledgerRouter.get('/balance/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    const balance = await FinancialLedgerService.getLedgerBalance(
      projectId, date as string | undefined
    );

    res.json({
      success: true,
      data: { balance, projectId, date: date || 'cumulative' },
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, processingTime: Date.now() - startTime });
  }
});

ledgerRouter.get('/journal/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { fromDate, toDate } = req.query;

    const entries = await FinancialLedgerService.getProjectJournalEntries(
      projectId, fromDate as string | undefined, toDate as string | undefined
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

ledgerRouter.post('/reconcile/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: 'التاريخ مطلوب' });
    }

    const result = await FinancialLedgerService.runReconciliation(projectId, date);

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

ledgerRouter.get('/audit-log/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { limit: limitStr } = req.query;
    const limit = Math.min(parseInt(String(limitStr || '50'), 10), 200);

    const logs = await db.select().from(financialAuditLog)
      .where(eq(financialAuditLog.projectId, projectId))
      .orderBy(desc(financialAuditLog.createdAt))
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

ledgerRouter.get('/reconciliation-history/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;

    const records = await db.select().from(reconciliationRecords)
      .where(eq(reconciliationRecords.projectId, projectId))
      .orderBy(desc(reconciliationRecords.createdAt))
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

ledgerRouter.get('/summary/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    const summary = date
      ? await ExpenseLedgerService.getDailyFinancialSummary(projectId, date as string)
      : await ExpenseLedgerService.getProjectFinancialSummary(projectId);

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

ledgerRouter.get('/daily-summary/:projectId/:date', async (req: Request, res: Response) => {
  try {
    const { projectId, date } = req.params;

    const summary = await ExpenseLedgerService.getDailyFinancialSummary(projectId, date);

    res.json({ success: true, data: summary, message: 'تم جلب الملخص اليومي بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('📒 [LedgerRouter] تم تهيئة مسارات دفتر الأستاذ الموحّد (قيد مزدوج + ملخصات + تدقيق)');

export default ledgerRouter;
