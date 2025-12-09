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

export interface ProjectFinancialSummary {
  projectId: string;
  projectName: string;
  expenses: ExpenseSummary;
  income: IncomeSummary;
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
    const maxValue = type === 'integer' ? 1000000 : 100000000000;
    if (Math.abs(parsed) > maxValue) {
      console.warn(`⚠️ [ExpenseLedger] قيمة تتجاوز الحد:`, parsed);
      return 0;
    }
    return Math.max(0, parsed);
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
        incomingTransfersStats
      ] = await Promise.all([
        db.execute(sql`SELECT name FROM projects WHERE id = ${projectId}`),
        
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
            COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as total
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
        `)
      ]);

      const projectName = String(projectInfo.rows[0]?.name || 'مشروع غير معروف');

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
      const totalAllExpenses = totalCashExpenses + materialExpensesCredit;
      
      const totalIncome = fundTransfers + incomingProjectTransfers;
      
      const cashBalance = totalIncome - totalCashExpenses;
      const totalBalance = totalIncome - totalAllExpenses;

      return {
        projectId,
        projectName,
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
