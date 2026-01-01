/**
 * خدمة دفتر المصروفات الموحد
 * Unified Expense Ledger Service
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface ExpenseSummary {
  materialExpenses: number;      // مصاريف المواد (النقدية فقط)
  materialExpensesCredit: number; // مصاريف المواد (الآجلة)
  workerWages: number;           // أجور العمال
  transportExpenses: number;     // مصاريف النقل
  workerTransfers: number;       // تحويلات العمال
  miscExpenses: number;          // مصاريف متنوعة
  outgoingProjectTransfers: number; // تحويلات صادرة لمشاريع أخرى
  totalCashExpenses: number;     // إجمالي المصروفات النقدية
  totalAllExpenses: number;      // إجمالي جميع المصروفات
}

export interface IncomeSummary {
  fundTransfers: number;         // تحويلات العهدة
  incomingProjectTransfers: number; // تحويلات واردة من مشاريع أخرى
  totalIncome: number;           // إجمالي الدخل
  carriedForwardBalance?: number;
  totalIncomeWithCarried?: number;
}

export interface WorkerStats {
  totalWorkers: number;
  activeWorkers: number;
  completedDays: number;
}

export interface ProjectFinancialSummary {
  projectId: string;
  projectName: string;
  status: string;
  description: string | null;
  expenses: ExpenseSummary;
  income: IncomeSummary;
  workers: WorkerStats;
  cashBalance: number;
  totalBalance: number;
  counts: {
    materialPurchases: number;
    workerAttendance: number;
    transportationExpenses: number;
    workerTransfers: number;
    miscExpenses: number;
    fundTransfers: number;
  };
  lastUpdated: string;
}

export interface DailyFinancialSummary extends ProjectFinancialSummary {
  date: string;
}

export class ExpenseLedgerService {
  
  private static cleanDbValue(value: any, type: 'integer' | 'decimal' = 'decimal'): number {
    if (value === null || value === undefined) return 0;
    const strValue = String(value).trim();
    if (strValue.match(/^(\d{1,3})\1{2,}$/)) return 0;
    const parsed = type === 'integer' ? parseInt(strValue, 10) : parseFloat(strValue);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    return parsed;
  }

  static async getProjectFinancialSummary(projectId: string, date?: string, dateFrom?: string, dateTo?: string): Promise<ProjectFinancialSummary> {
    try {
      // تصحيح الفلترة لضمان عدم ظهور بيانات من تواريخ أخرى عند وجود فلتر
      const dateFilterMp = date ? sql`AND purchase_date::date = ${date}::date` : (dateFrom && dateTo ? sql`AND purchase_date::date BETWEEN ${dateFrom}::date AND ${dateTo}::date` : sql`AND 1=1`);
      const dateFilterWa = date ? sql`AND attendance_date::date = ${date}::date` : (dateFrom && dateTo ? sql`AND attendance_date::date BETWEEN ${dateFrom}::date AND ${dateTo}::date` : sql`AND 1=1`);
      const dateFilterTe = date ? sql`AND date::date = ${date}::date` : (dateFrom && dateTo ? sql`AND date::date BETWEEN ${dateFrom}::date AND ${dateTo}::date` : sql`AND 1=1`);
      const dateFilterWt = date ? sql`AND transfer_date::date = ${date}::date` : (dateFrom && dateTo ? sql`AND transfer_date::date BETWEEN ${dateFrom}::date AND ${dateTo}::date` : sql`AND 1=1`);
      const dateFilterMwe = date ? sql`AND date::date = ${date}::date` : (dateFrom && dateTo ? sql`AND date::date BETWEEN ${dateFrom}::date AND ${dateTo}::date` : sql`AND 1=1`);
      const dateFilterFt = date ? sql`AND transfer_date::date = ${date}::date` : (dateFrom && dateTo ? sql`AND transfer_date::date BETWEEN ${dateFrom}::date AND ${dateTo}::date` : sql`AND 1=1`);
      const dateFilterPft = date ? sql`AND transfer_date::date = ${date}::date` : (dateFrom && dateTo ? sql`AND transfer_date::date BETWEEN ${dateFrom}::date AND ${dateTo}::date` : sql`AND 1=1`);

      // إذا لم يكن هناك تاريخ محدد، نعتبره عرض تراكمي ونلغي فلاتر التواريخ لضمان جلب كل شيء
      const isCumulative = !date && !dateFrom && !dateTo;
      
      const finalFilterMp = isCumulative ? sql`` : dateFilterMp;
      const finalFilterWa = isCumulative ? sql`` : dateFilterWa;
      const finalFilterTe = isCumulative ? sql`` : dateFilterTe;
      const finalFilterWt = isCumulative ? sql`` : dateFilterWt;
      const finalFilterMwe = isCumulative ? sql`` : dateFilterMwe;
      const finalFilterFt = isCumulative ? sql`` : dateFilterFt;
      const finalFilterPft = isCumulative ? sql`` : dateFilterPft;

      console.log(`🔍 [ExpenseLedger] تطبيق الفلترة لـ ${projectId}:`, { date, dateFrom, dateTo, isCumulative });

      const startDateStr = date || dateFrom || new Date().toISOString().split('T')[0];
      
      // في حالة الفلترة المحددة، الرصيد المرحل يجب أن يكون من قبل تاريخ البداية
      // إذا كان هناك تاريخ محدد (مثل 25/11)، فنحن بحاجة لكل ما قبل 25/11 (تاريخ البداية)
      const [prevIncome, prevExpenses] = isCumulative ? [
        { rows: [{ total: 0 }] },
        { rows: [{ total: 0 }] }
      ] : await Promise.all([
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM (
            SELECT amount FROM fund_transfers WHERE project_id = ${projectId} AND transfer_date::date < ${startDateStr}::date
            UNION ALL
            SELECT amount FROM project_fund_transfers WHERE to_project_id = ${projectId} AND transfer_date::date < ${startDateStr}::date
          ) as prev_income
        `),
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM (
            SELECT 
              CASE 
                WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (CAST(paid_amount AS DECIMAL) = 0 OR paid_amount IS NULL) THEN CAST(total_amount AS DECIMAL)
                ELSE CAST(paid_amount AS DECIMAL)
              END as amount 
            FROM material_purchases 
            WHERE project_id = ${projectId} AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND purchase_date::date < ${startDateStr}::date
            UNION ALL
            SELECT paid_amount as amount FROM worker_attendance WHERE project_id = ${projectId} AND attendance_date::date < ${startDateStr}::date
            UNION ALL
            SELECT amount FROM transportation_expenses WHERE project_id = ${projectId} AND date::date < ${startDateStr}::date
            UNION ALL
            SELECT amount FROM worker_transfers WHERE project_id = ${projectId} AND transfer_date::date < ${startDateStr}::date
            UNION ALL
            SELECT amount FROM worker_misc_expenses WHERE project_id = ${projectId} AND date::date < ${startDateStr}::date
            UNION ALL
            SELECT amount FROM project_fund_transfers WHERE from_project_id = ${projectId} AND transfer_date::date < ${startDateStr}::date
          ) as prev_expenses
        `)
      ]);

      const carriedForwardBalance = isCumulative ? 0 : (this.cleanDbValue(prevIncome.rows[0]?.total) - this.cleanDbValue(prevExpenses.rows[0]?.total));

      const [
        projectInfo,
        materialCashStats,
        materialCreditStats,
        workerWagesStats,
        transportStats,
        workerTransfersStats,
        miscExpensesStats,
        fundTransfersStats,
        outgoingTransfersStats,
        incomingTransfersStats,
        workersStatsResult
      ] = await Promise.all([
        db.execute(sql`SELECT name, status, description FROM projects WHERE id = ${projectId}`),
        db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(
          CASE 
            WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (CAST(paid_amount AS DECIMAL) = 0 OR paid_amount IS NULL) THEN CAST(total_amount AS DECIMAL)
            ELSE CAST(paid_amount AS DECIMAL)
          END
        ), 0) as total FROM material_purchases WHERE project_id = ${projectId} AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') ${finalFilterMp}`),
        db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(CAST(total_amount - paid_amount AS DECIMAL)), 0) as total FROM material_purchases WHERE project_id = ${projectId} AND (purchase_type = 'آجل' OR purchase_type = 'اجل') ${finalFilterMp}`),
        db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) as total, COUNT(DISTINCT attendance_date) as completed_days FROM worker_attendance WHERE project_id = ${projectId} ${finalFilterWa}`),

        db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM transportation_expenses WHERE project_id = ${projectId} ${finalFilterTe}`),
        db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_transfers WHERE project_id = ${projectId} ${finalFilterWt}`),
        db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_misc_expenses WHERE project_id = ${projectId} ${finalFilterMwe}`),
        db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM fund_transfers WHERE project_id = ${projectId} ${finalFilterFt}`),
        db.execute(sql`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE from_project_id = ${projectId} ${finalFilterPft}`),
        db.execute(sql`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE to_project_id = ${projectId} ${finalFilterPft}`),
        db.execute(sql`SELECT COUNT(DISTINCT wa.worker_id) as total_workers, COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers FROM worker_attendance wa INNER JOIN workers w ON wa.worker_id = w.id WHERE wa.project_id = ${projectId} ${finalFilterWa}`)
      ]);

      const projectName = String(projectInfo.rows[0]?.name || 'مشروع غير معروف');
      const projectStatus = String(projectInfo.rows[0]?.status || 'active');
      const projectDescription = projectInfo.rows[0]?.description ? String(projectInfo.rows[0].description) : null;

      const materialExpenses = this.cleanDbValue(materialCashStats.rows[0]?.total);
      const materialExpensesCredit = this.cleanDbValue(materialCreditStats.rows[0]?.total);
      const workerWages = this.cleanDbValue(workerWagesStats.rows[0]?.total);
      const transportExpenses = this.cleanDbValue(transportStats.rows[0]?.total);
      const workerTransfers = this.cleanDbValue(workerTransfersStats.rows[0]?.total);
      const miscExpenses = this.cleanDbValue(miscExpensesStats.rows[0]?.total);
      const fundTransfers = this.cleanDbValue(fundTransfersStats.rows[0]?.total);
      const outgoingProjectTransfers = this.cleanDbValue(outgoingTransfersStats.rows[0]?.total);
      const incomingProjectTransfers = this.cleanDbValue(incomingTransfersStats.rows[0]?.total);

      // 4. إجمالي المصروفات النقدية (نجمع كل فئة مستقلة لضمان دقة البيانات كما طلب المستخدم)
      // أجور العمال، النثريات، المشتريات النقدية، المواصلات، وتحويلات العمال (كفئة مستقلة في المصروفات)
      const totalCashExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses + outgoingProjectTransfers;
      
      // 5. الرصيد النقدي لليوم (الدخل - المصروفات)
      const totalIncome = fundTransfers + incomingProjectTransfers;
      const cashBalance = totalIncome - totalCashExpenses;
      
      // 6. الرصيد التراكمي الشامل
      // المتبقي هو (الرصيد المرحل من سابقاً + دخل اليوم) - مصروفات اليوم
      const totalIncomeWithCarried = totalIncome + carriedForwardBalance;
      const totalBalance = totalIncomeWithCarried - totalCashExpenses;
      const totalAllExpenses = totalCashExpenses + materialExpensesCredit; 

      // إضافة سجل تفصيلي للحسابات في الـ console للتدقيق والمطابقة
      console.log(`✅ [UnifiedTruth] تدقيق الرصيد لليوم ${date || 'تراكمي'}:`, {
        carriedForward: carriedForwardBalance,
        todayIncome: totalIncome,
        todayCashExpenses: totalCashExpenses,
        todayCreditExpenses: materialExpensesCredit,
        computedBalance: totalBalance
      });

      console.log(`📊 [ExpenseLedger] الرصيد المالي:`, {
        carriedForward: carriedForwardBalance,
        incomeToday: totalIncome,
        expensesToday: totalCashExpenses,
        materialCredit: materialExpensesCredit,
        finalBalance: totalBalance
      });

      console.log(`📊 [ExpenseLedger] حسابات اليوم ${date || 'تراكمي'} لـ ${projectName}:`, {
        projectId, date: date || 'تراكمي', carriedForward: carriedForwardBalance, incomeToday: totalIncome, expensesToday: totalCashExpenses, totalAllExpenses
      });

      return {
        projectId, projectName, status: projectStatus, description: projectDescription,
        expenses: { materialExpenses, materialExpensesCredit, workerWages, transportExpenses, workerTransfers, miscExpenses, outgoingProjectTransfers, totalCashExpenses, totalAllExpenses },
        income: { fundTransfers, incomingProjectTransfers, totalIncome, carriedForwardBalance, totalIncomeWithCarried },
        workers: { totalWorkers: this.cleanDbValue(workersStatsResult.rows[0]?.total_workers, 'integer'), activeWorkers: this.cleanDbValue(workersStatsResult.rows[0]?.active_workers, 'integer'), completedDays: this.cleanDbValue(workerWagesStats.rows[0]?.completed_days, 'integer') },
        cashBalance, totalBalance,
        counts: {
          materialPurchases: this.cleanDbValue(materialCashStats.rows[0]?.count, 'integer') + this.cleanDbValue(materialCreditStats.rows[0]?.count, 'integer'),
          workerAttendance: this.cleanDbValue(workerWagesStats.rows[0]?.count, 'integer'),
          transportationExpenses: this.cleanDbValue(transportStats.rows[0]?.count, 'integer'),
          workerTransfers: this.cleanDbValue(workerTransfersStats.rows[0]?.count, 'integer'),
          miscExpenses: this.cleanDbValue(miscExpensesStats.rows[0]?.count, 'integer'),
          fundTransfers: this.cleanDbValue(fundTransfersStats.rows[0]?.count, 'integer')
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ [ExpenseLedger] خطأ في جلب ملخص المشروع ${projectId}:`, error);
      throw error;
    }
  }

  static async getDailyFinancialSummary(projectId: string, date: string): Promise<DailyFinancialSummary> {
    const summary = await this.getProjectFinancialSummary(projectId, date);
    return { ...summary, date };
  }

  static async getAllProjectsStats(date?: string, dateFrom?: string, dateTo?: string): Promise<ProjectFinancialSummary[]> {
    try {
      const projectsList = await db.execute(sql`SELECT id, name FROM projects WHERE is_active = true ORDER BY created_at`);
      // تحسين: تقليل عدد الطلبات المتزامنة لتجنب إرهاق قاعدة البيانات
      const results: ProjectFinancialSummary[] = [];
      for (const project of projectsList.rows) {
        const summary = await this.getProjectFinancialSummary(project.id as string, date, dateFrom, dateTo);
        results.push(summary);
      }
      return results;
    } catch (error) {
      console.error('❌ [ExpenseLedger] خطأ في جلب إحصائيات جميع المشاريع:', error);
      throw error;
    }
  }
}

export default ExpenseLedgerService;
