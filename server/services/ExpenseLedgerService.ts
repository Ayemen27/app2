/**
 * خدمة دفتر المصروفات الموحد
 * Unified Expense Ledger Service
 * 
 * هذه الخدمة هي المصدر الوحيد للحقيقة لجميع حسابات المصروفات
 * مستوحاة من أنظمة SAP وOracle المالية
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
}

export interface WorkerStats {
  totalWorkers: number;
  activeWorkers: number;
  completedDays: number;
}

export interface ProjectFinancialSummary {
  projectId: string;
  projectName: string;
  status: string;                // حالة المشروع (active, completed, paused)
  description: string | null;    // وصف المشروع
  expenses: ExpenseSummary;
  income: IncomeSummary;
  workers: WorkerStats;
  cashBalance: number;           // الرصيد النقدي (الدخل - المصروفات النقدية)
  totalBalance: number;          // الرصيد الإجمالي (الدخل - جميع المصروفات)
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

/**
 * خدمة دفتر المصروفات الموحد
 */
export class ExpenseLedgerService {
  
  private static cleanDbValue(value: any, type: 'integer' | 'decimal' = 'decimal'): number {
    if (value === null || value === undefined) return 0;
    const strValue = String(value).trim();
    if (strValue.match(/^(\d{1,3})\1{2,}$/)) {
      console.warn('⚠️ [ExpenseLedger] قيمة مشبوهة:', strValue);
      return 0;
    }
    const parsed = type === 'integer' ? parseInt(strValue, 10) : parseFloat(strValue);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    const maxValue = type === 'integer' ? 1000000000 : 100000000000;
    return parsed;
  }

  /**
   * جلب الملخص المالي لمشروع معين
   * هذه الدالة هي المصدر الوحيد للحقيقة
   */
  static async getProjectFinancialSummary(projectId: string, date?: string): Promise<ProjectFinancialSummary> {
    try {
      const dateFilter = date ? sql`AND DATE(purchase_date) = ${date}` : sql``;
      const dateFilterTransfer = date ? sql`AND DATE(transfer_date) = ${date}` : sql``;
      const dateFilterAttendance = date ? sql`AND date = ${date}` : sql``;
      const dateFilterTransport = date ? sql`AND date = ${date}` : sql``;
      const dateFilterMisc = date ? sql`AND date = ${date}` : sql``;

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
        
        db.execute(sql`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
          FROM material_purchases 
          WHERE project_id = ${projectId} AND purchase_type = 'نقد' ${dateFilter}
        `),
        
        db.execute(sql`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
          FROM material_purchases 
          WHERE project_id = ${projectId} AND purchase_type = 'آجل' ${dateFilter}
        `),
        
        db.execute(sql`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as total,
            COUNT(DISTINCT date) as completed_days
          FROM worker_attendance 
          WHERE project_id = ${projectId} AND is_present = true ${dateFilterAttendance}
        `),
        
        db.execute(sql`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM transportation_expenses 
          WHERE project_id = ${projectId} ${dateFilterTransport}
        `),
        
        db.execute(sql`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM worker_transfers 
          WHERE project_id = ${projectId} ${dateFilterTransfer}
        `),
        
        db.execute(sql`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM worker_misc_expenses 
          WHERE project_id = ${projectId} ${dateFilterMisc}
        `),
        
        db.execute(sql`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM fund_transfers 
          WHERE project_id = ${projectId} ${dateFilterTransfer}
        `),
        
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM project_fund_transfers 
          WHERE from_project_id = ${projectId} ${dateFilterTransfer}
        `),
        
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM project_fund_transfers 
          WHERE to_project_id = ${projectId} ${dateFilterTransfer}
        `),
        
        db.execute(sql`
          SELECT 
            COUNT(DISTINCT wa.worker_id) as total_workers,
            COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
          FROM worker_attendance wa
          INNER JOIN workers w ON wa.worker_id = w.id
          WHERE wa.project_id = ${projectId} ${dateFilterAttendance}
        `)
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

      const totalCashExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses + outgoingProjectTransfers;
      // المصروفات الكلية تشمل الكاش فقط، والآجل يظهر في التقارير كفئة منفصلة ولا يخصم من الرصيد
      // ملاحظة: تم تعديل هذا المنطق لاستبعاد فئات معينة إذا لزم الأمر، ولكن حالياً نعتمد على أن النقد هو ما يخصم من الرصيد
      const totalAllExpenses = totalCashExpenses; 
      
      const totalIncome = fundTransfers + incomingProjectTransfers;
      
      const cashBalance = totalIncome - totalCashExpenses;
      // تصحيح: الرصيد الإجمالي يجب أن يخصم منه المصاريف الآجلة أيضاً ليعبر عن المديونية الكلية للمشروع
      // بينما الرصيد النقدي (cashBalance) يمثل ما تبقى في الخزنة فعلياً
      const totalBalance = totalIncome - (totalCashExpenses + materialExpensesCredit);

      const totalWorkers = this.cleanDbValue(workersStatsResult.rows[0]?.total_workers, 'integer');
      const activeWorkers = this.cleanDbValue(workersStatsResult.rows[0]?.active_workers, 'integer');
      const completedDays = this.cleanDbValue(workerWagesStats.rows[0]?.completed_days, 'integer');

      return {
        projectId,
        projectName,
        status: projectStatus,
        description: projectDescription,
        expenses: {
          materialExpenses,
          materialExpensesCredit,
          workerWages,
          transportExpenses,
          workerTransfers,
          miscExpenses,
          outgoingProjectTransfers,
          totalCashExpenses,
          totalAllExpenses
        },
        income: {
          fundTransfers,
          incomingProjectTransfers,
          totalIncome
        },
        workers: {
          totalWorkers,
          activeWorkers,
          completedDays
        },
        cashBalance,
        totalBalance,
        counts: {
          materialPurchases: this.cleanDbValue(materialCashStats.rows[0]?.count, 'integer') + 
                            this.cleanDbValue(materialCreditStats.rows[0]?.count, 'integer'),
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

  /**
   * جلب الملخص المالي اليومي لمشروع معين
   */
  static async getDailyFinancialSummary(projectId: string, date: string): Promise<DailyFinancialSummary> {
    const summary = await this.getProjectFinancialSummary(projectId, date);
    return {
      ...summary,
      date
    };
  }

  /**
   * جلب إحصائيات جميع المشاريع
   */
  static async getAllProjectsStats(): Promise<ProjectFinancialSummary[]> {
    try {
      const projectsList = await db.execute(sql`SELECT id, name FROM projects ORDER BY created_at`);
      
      const summaries = await Promise.all(
        projectsList.rows.map(async (project: any) => {
          return this.getProjectFinancialSummary(project.id);
        })
      );

      return summaries;
    } catch (error) {
      console.error('❌ [ExpenseLedger] خطأ في جلب إحصائيات جميع المشاريع:', error);
      throw error;
    }
  }
}

export default ExpenseLedgerService;
