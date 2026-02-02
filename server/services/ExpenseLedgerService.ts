/**
 * خدمة دفتر المصروفات الموحد
 * Unified Expense Ledger Service
 */

import { db, pool } from '../db';
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
    
    // اكتشاف وحذف الأرقام المتكررة بشكل غير طبيعي (مثل 23232323)
    if (strValue.length > 5 && strValue.match(/^(\d{1,3})\1{2,}$/)) {
      console.warn(`⚠️ [ExpenseLedger] تم اكتشاف قيمة مشبوهة وتصفيرها: ${strValue}`);
      return 0;
    }

    const parsed = type === 'integer' ? parseInt(strValue, 10) : parseFloat(strValue);
    
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    
    // تصحيح القيم الضخمة غير المنطقية (مثلاً أكثر من مليار لمشروع واحد)
    if (parsed > 1000000000) {
      console.warn(`⚠️ [ExpenseLedger] تم اكتشاف قيمة ضخمة جداً وتصفيرها: ${parsed}`);
      return 0;
    }

    return parsed;
  }

  static async getProjectFinancialSummary(projectId: string, date?: string, dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      // تنظيف المدخلات لمنع أخطاء التواريخ الفارغة
      const cleanDate = date && date.trim() !== "" ? date : null;
      const cleanDateFrom = dateFrom && dateFrom.trim() !== "" ? dateFrom : null;
      const cleanDateTo = dateTo && dateTo.trim() !== "" ? dateTo : null;

      // إذا لم يكن هناك تاريخ محدد، نعتبره عرض تراكمي
      const isCumulative = !cleanDate && !cleanDateFrom && !cleanDateTo;
      
      // بناء فلاتر التواريخ كسلاسل نصية لاستخدامها مع pool.query
      const buildDateFilter = (dateColumn: string): string => {
        if (cleanDate) {
          return `AND ${dateColumn}::date = $2::date`;
        } else if (cleanDateFrom && cleanDateTo) {
          return `AND ${dateColumn}::date BETWEEN $2::date AND $3::date`;
        }
        return '';
      };

      console.log(`🔍 [ExpenseLedger] تطبيق الفلترة لـ ${projectId}:`, { date: cleanDate, dateFrom: cleanDateFrom, dateTo: cleanDateTo, isCumulative });

      const startDateStr = cleanDate || cleanDateFrom || new Date().toISOString().split('T')[0];
      
      // حساب الرصيد المرحل
      let carriedForwardBalance = 0;
      
      if (!isCumulative) {
        // حساب الدخل قبل التاريخ المحدد
        const prevIncomeResult = await pool.query(`
          WITH prev_income AS (
            SELECT amount FROM fund_transfers WHERE project_id = $1 AND transfer_date::date < $2::date
            UNION ALL
            SELECT amount FROM project_fund_transfers WHERE to_project_id = $1 AND transfer_date::date < $2::date
          )
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM prev_income
        `, [projectId, startDateStr]);

        // حساب المصروفات قبل التاريخ المحدد
        const prevExpensesResult = await pool.query(`
          WITH prev_expenses AS (
            SELECT 
              CASE 
                WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (CAST(paid_amount AS DECIMAL) > 0) THEN CAST(paid_amount AS DECIMAL)
                WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN CAST(total_amount AS DECIMAL)
                ELSE 0
              END as amount 
            FROM material_purchases 
            WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND purchase_date::date < $2::date
            UNION ALL
            SELECT CAST(paid_amount AS DECIMAL) as amount FROM worker_attendance WHERE project_id = $1 AND attendance_date::date < $2::date AND CAST(paid_amount AS DECIMAL) > 0
            UNION ALL
            SELECT amount FROM transportation_expenses WHERE project_id = $1 AND date::date < $2::date
            UNION ALL
            SELECT amount FROM worker_transfers WHERE project_id = $1 AND transfer_date::date < $2::date
            UNION ALL
            SELECT amount FROM worker_misc_expenses WHERE project_id = $1 AND date::date < $2::date
            UNION ALL
            SELECT amount FROM project_fund_transfers WHERE from_project_id = $1 AND transfer_date::date < $2::date
          )
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM prev_expenses
        `, [projectId, startDateStr]);

        const cleanTotalIncome = this.cleanDbValue(prevIncomeResult.rows[0]?.total);
        const cleanTotalExpenses = this.cleanDbValue(prevExpensesResult.rows[0]?.total);
        carriedForwardBalance = cleanTotalIncome - cleanTotalExpenses;
        
        if (Math.abs(carriedForwardBalance) < 1) {
          carriedForwardBalance = 0;
        }

        // حذف الملخص المالي القديم لهذا اليوم
        await pool.query(`
          DELETE FROM daily_expense_summaries 
          WHERE project_id = $1 AND date = $2
        `, [projectId, startDateStr]);
      }

      // جلب معلومات المشروع
      const projectInfo = await pool.query(
        `SELECT name, status, description FROM projects WHERE id = $1`,
        [projectId]
      );

      // بناء الاستعلامات بناءً على نوع الفلترة
      let materialCashStats, materialCreditStats, workerWagesStats, transportStats;
      let workerTransfersStats, miscExpensesStats, fundTransfersStats;
      let outgoingTransfersStats, incomingTransfersStats, workersStatsResult;

      if (isCumulative) {
        // استعلامات بدون فلتر تاريخ
        [materialCashStats, materialCreditStats, workerWagesStats, transportStats,
         workerTransfersStats, miscExpensesStats, fundTransfersStats,
         outgoingTransfersStats, incomingTransfersStats, workersStatsResult] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(
            CASE 
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (CAST(paid_amount AS DECIMAL) > 0) THEN CAST(paid_amount AS DECIMAL)
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN CAST(total_amount AS DECIMAL)
              ELSE 0
            END
          ), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد')`, [projectId]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(total_amount AS DECIMAL) - CAST(paid_amount AS DECIMAL)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'آجل' OR purchase_type = 'اجل')`, [projectId]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) as total, COUNT(DISTINCT attendance_date) as completed_days FROM worker_attendance WHERE project_id = $1 AND (CAST(paid_amount AS DECIMAL) > 0 OR CAST(work_days AS DECIMAL) > 0)`, [projectId]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM transportation_expenses WHERE project_id = $1`, [projectId]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_transfers WHERE project_id = $1`, [projectId]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_misc_expenses WHERE project_id = $1`, [projectId]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM fund_transfers WHERE project_id = $1`, [projectId]),
          pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE from_project_id = $1`, [projectId]),
          pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE to_project_id = $1`, [projectId]),
          pool.query(`SELECT COUNT(DISTINCT wa.worker_id) as total_workers, COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers FROM worker_attendance wa INNER JOIN workers w ON wa.worker_id = w.id WHERE wa.project_id = $1`, [projectId])
        ]);
      } else if (cleanDate) {
        // استعلامات مع فلتر تاريخ محدد
        [materialCashStats, materialCreditStats, workerWagesStats, transportStats,
         workerTransfersStats, miscExpensesStats, fundTransfersStats,
         outgoingTransfersStats, incomingTransfersStats, workersStatsResult] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(
            CASE 
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (CAST(paid_amount AS DECIMAL) > 0) THEN CAST(paid_amount AS DECIMAL)
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN CAST(total_amount AS DECIMAL)
              ELSE 0
            END
          ), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND purchase_date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(total_amount AS DECIMAL) - CAST(paid_amount AS DECIMAL)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'آجل' OR purchase_type = 'اجل') AND purchase_date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) as total, COUNT(DISTINCT attendance_date) as completed_days FROM worker_attendance WHERE project_id = $1 AND (CAST(paid_amount AS DECIMAL) > 0 OR CAST(work_days AS DECIMAL) > 0) AND attendance_date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM transportation_expenses WHERE project_id = $1 AND date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_transfers WHERE project_id = $1 AND transfer_date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_misc_expenses WHERE project_id = $1 AND date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM fund_transfers WHERE project_id = $1 AND transfer_date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE from_project_id = $1 AND transfer_date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE to_project_id = $1 AND transfer_date::date = $2::date`, [projectId, cleanDate]),
          pool.query(`SELECT COUNT(DISTINCT wa.worker_id) as total_workers, COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers FROM worker_attendance wa INNER JOIN workers w ON wa.worker_id = w.id WHERE wa.project_id = $1 AND wa.attendance_date::date = $2::date`, [projectId, cleanDate])
        ]);
      } else {
        // استعلامات مع نطاق تاريخ
        [materialCashStats, materialCreditStats, workerWagesStats, transportStats,
         workerTransfersStats, miscExpensesStats, fundTransfersStats,
         outgoingTransfersStats, incomingTransfersStats, workersStatsResult] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(
            CASE 
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (CAST(paid_amount AS DECIMAL) > 0) THEN CAST(paid_amount AS DECIMAL)
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN CAST(total_amount AS DECIMAL)
              ELSE 0
            END
          ), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND purchase_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(total_amount AS DECIMAL) - CAST(paid_amount AS DECIMAL)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'آجل' OR purchase_type = 'اجل') AND purchase_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) as total, COUNT(DISTINCT attendance_date) as completed_days FROM worker_attendance WHERE project_id = $1 AND (CAST(paid_amount AS DECIMAL) > 0 OR CAST(work_days AS DECIMAL) > 0) AND attendance_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM transportation_expenses WHERE project_id = $1 AND date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_transfers WHERE project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM worker_misc_expenses WHERE project_id = $1 AND date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM fund_transfers WHERE project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE from_project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM project_fund_transfers WHERE to_project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(DISTINCT wa.worker_id) as total_workers, COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers FROM worker_attendance wa INNER JOIN workers w ON wa.worker_id = w.id WHERE wa.project_id = $1 AND wa.attendance_date::date BETWEEN $2::date AND $3::date`, [projectId, cleanDateFrom, cleanDateTo])
        ]);
      }

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

      // إجمالي المصروفات النقدية
      const totalCashExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses + outgoingProjectTransfers;
      
      // الرصيد النقدي لليوم
      const totalIncome = fundTransfers + incomingProjectTransfers;
      const cashBalance = totalIncome - totalCashExpenses;
      
      // الرصيد التراكمي الشامل
      const totalIncomeWithCarried = totalIncome + carriedForwardBalance;
      const totalBalance = totalIncomeWithCarried - totalCashExpenses;
      const totalAllExpenses = totalCashExpenses + materialExpensesCredit; 

      return {
        projectId, projectName, status: projectStatus, description: projectDescription,
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
          totalIncome, 
          carriedForwardBalance, 
          totalIncomeWithCarried 
        },
        workers: { 
          totalWorkers: this.cleanDbValue(workersStatsResult.rows[0]?.total_workers, 'integer'), 
          activeWorkers: this.cleanDbValue(workersStatsResult.rows[0]?.active_workers, 'integer'), 
          completedDays: this.cleanDbValue(workerWagesStats.rows[0]?.completed_days, 'integer') 
        },
        cashBalance, 
        totalBalance,
        transportExpenses,
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
      const projectsList = await pool.query(`SELECT id, name FROM projects WHERE is_active = true ORDER BY created_at`);
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

  static async getAllProjectsDailySummary(date: string): Promise<any> {
    return await this.getTotalDailyFinancialSummary(date);
  }

  static async getTotalDailyFinancialSummary(date: string): Promise<any> {
    try {
      const projects = await this.getAllProjectsStats(date);
      
      const totals = {
        totalIncome: 0,
        totalCashExpenses: 0,
        totalAllExpenses: 0,
        cashBalance: 0,
        totalBalance: 0,
        carriedForwardBalance: 0,
        totalIncomeWithCarried: 0,
        materialExpensesCredit: 0,
        workerWages: 0,
        transportExpenses: 0,
        workerTransfers: 0,
        miscExpenses: 0,
        fundTransfers: 0,
        incomingProjectTransfers: 0,
        outgoingProjectTransfers: 0,
        totalWorkers: 0,
        activeWorkers: 0
      };

      projects.forEach(p => {
        totals.totalIncome += p.income.totalIncome;
        totals.totalCashExpenses += p.expenses.totalCashExpenses;
        totals.totalAllExpenses += p.expenses.totalAllExpenses;
        totals.cashBalance += p.cashBalance;
        totals.totalBalance += p.totalBalance;
        totals.carriedForwardBalance += (p.income.carriedForwardBalance || 0);
        totals.totalIncomeWithCarried += (p.income.totalIncomeWithCarried || 0);
        totals.materialExpensesCredit += p.expenses.materialExpensesCredit;
        totals.workerWages += p.expenses.workerWages;
        totals.transportExpenses += p.expenses.transportExpenses;
        totals.workerTransfers += p.expenses.workerTransfers;
        totals.miscExpenses += p.expenses.miscExpenses;
        totals.fundTransfers += p.income.fundTransfers;
        totals.incomingProjectTransfers += p.income.incomingProjectTransfers;
        totals.outgoingProjectTransfers += p.expenses.outgoingProjectTransfers;
        totals.totalWorkers += p.workers.totalWorkers;
        totals.activeWorkers += p.workers.activeWorkers;
      });

      console.log(`📊 [ExpenseLedger] إجمالي جميع المشاريع لتاريخ ${date}:`, {
        carriedForwardBalance: totals.carriedForwardBalance,
        totalIncome: totals.totalIncome,
        totalCashExpenses: totals.totalCashExpenses,
        totalBalance: totals.totalBalance
      });

      return totals;
    } catch (error) {
      console.error('❌ [ExpenseLedger] خطأ في حساب الإجمالي اليومي:', error);
      throw error;
    }
  }
}

export default ExpenseLedgerService;
