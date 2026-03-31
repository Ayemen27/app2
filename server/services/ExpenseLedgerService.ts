/**
 * خدمة تقارير المصروفات (قراءة فقط)
 * Expense Reports Service - READ ONLY
 * 
 * الدور: تجميع وعرض الملخصات المالية من جداول المصدر
 * لا تُنشئ قيوداً محاسبية - فقط تقرأ وتُلخّص
 * 
 * الكتابة المحاسبية: FinancialLedgerService (القيد المزدوج)
 * القراءة والتقارير: هذه الخدمة (ExpenseLedgerService)
 */

import { db, pool } from '../db';
import { sql } from 'drizzle-orm';
import { safeParseNum } from '../utils/safe-numbers';

export interface ExpenseSummary {
  materialExpenses: number;      // مصاريف المواد (النقدية فقط)
  materialExpensesCredit: number; // مصاريف المواد (الآجلة)
  materialExpensesStorage: number; // مصاريف المواد (المخزن)
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
  project_id: string;
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
    if (strValue === '' || strValue === 'null' || strValue === 'undefined') return 0;

    const parsed = type === 'integer' ? parseInt(strValue, 10) : safeParseNum(strValue);
    
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    
    if (parsed > 1000000000) {
      console.warn(`⚠️ [ExpenseLedger] قيمة كبيرة جداً (${parsed}) - يُرجى مراجعة البيانات يدوياً. القيمة مقبولة ولن تُصفّر.`);
    }

    return parsed;
  }

  static async recordExpense(data: {
    project_id: string;
    amount: string | number;
    category: string;
    referenceId: string;
    description: string;
    date: string;
  }): Promise<void> {
    // This is a stub to fix the TypeError. In a real scenario, this would update 
    // the ledger or cache, but given the cumulative queries in this service,
    // the data is already picked up by getProjectFinancialSummary from the source tables.
    console.log(`📝 [ExpenseLedger] Expense recorded: ${data.description} for amount ${data.amount}`);
  }

  static async getProjectFinancialSummary(project_id: string, date?: string, dateFrom?: string, dateTo?: string): Promise<any> {
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

      // استخدام الكاش إذا كان متاحاً (اختياري للتحسين المتقدم)
      // Note: This is a placeholder for more advanced caching if needed.

      const getLocalDateStr = (): string => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      };
      const startDateStr = cleanDate || cleanDateFrom || getLocalDateStr();
      
      // حساب الرصيد المرحل
      let carriedForwardBalance = 0;
      
      if (!isCumulative) {
        // حساب الدخل قبل التاريخ المحدد
        const prevIncomeResult = await pool.query(`
          WITH prev_income AS (
            SELECT amount FROM fund_transfers WHERE project_id = $1 AND transfer_date::date < $2::date
            UNION ALL
            SELECT amount FROM project_fund_transfers WHERE to_project_id = $1 AND transfer_date::date < $2::date AND (transfer_reason IS NULL OR transfer_reason != 'legacy_worker_rebalance')
          )
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM prev_income
        `, [project_id, startDateStr]);

        // حساب المصروفات قبل التاريخ المحدد
        const prevExpensesResult = await pool.query(`
          WITH prev_expenses AS (
            SELECT 
              CASE 
                WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (safe_numeric(paid_amount::text, 0) > 0) THEN safe_numeric(paid_amount::text, 0)
                WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN safe_numeric(total_amount::text, 0)
                ELSE 0
              END as amount 
            FROM material_purchases 
            WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND purchase_date::date < $2::date
            UNION ALL
            SELECT safe_numeric(paid_amount::text, 0) as amount FROM worker_attendance WHERE project_id = $1 AND COALESCE(NULLIF(date,''), attendance_date)::date < $2::date AND safe_numeric(paid_amount::text, 0) > 0
            UNION ALL
            SELECT amount FROM transportation_expenses WHERE project_id = $1 AND date::date < $2::date
            UNION ALL
            SELECT amount FROM worker_transfers WHERE project_id = $1 AND transfer_date::date < $2::date
            UNION ALL
            SELECT amount FROM worker_misc_expenses WHERE project_id = $1 AND date::date < $2::date
            UNION ALL
            SELECT amount FROM project_fund_transfers WHERE from_project_id = $1 AND transfer_date::date < $2::date AND (transfer_reason IS NULL OR transfer_reason != 'legacy_worker_rebalance')
            UNION ALL
            SELECT amount FROM supplier_payments WHERE project_id = $1 AND payment_date::date < $2::date
          )
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM prev_expenses
        `, [project_id, startDateStr]);

        const cleanTotalIncome = this.cleanDbValue(prevIncomeResult.rows[0]?.total);
        const cleanTotalExpenses = this.cleanDbValue(prevExpensesResult.rows[0]?.total);
        carriedForwardBalance = cleanTotalIncome - cleanTotalExpenses;
        
        if (Math.abs(carriedForwardBalance) < 0.01) {
          carriedForwardBalance = 0;
        }
      }

      // جلب معلومات المشروع
      const projectInfo = await pool.query(
        `SELECT name, status, description FROM projects WHERE id = $1`,
        [project_id]
      );

      // بناء الاستعلامات بناءً على نوع الفلترة
      let materialCashStats, materialCreditStats, materialStorageStats, workerWagesStats, transportStats;
      let workerTransfersStats, miscExpensesStats, fundTransfersStats;
      let outgoingTransfersStats, incomingTransfersStats, workersStatsResult;
      let supplierPaymentsStats;

      if (isCumulative) {
        [materialCashStats, materialCreditStats, materialStorageStats, workerWagesStats, transportStats,
         workerTransfersStats, miscExpensesStats, fundTransfersStats,
         outgoingTransfersStats, incomingTransfersStats, workersStatsResult, supplierPaymentsStats] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(
            CASE 
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (safe_numeric(paid_amount::text, 0) > 0) THEN safe_numeric(paid_amount::text, 0)
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN safe_numeric(total_amount::text, 0)
              ELSE 0
            END
          ), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد')`, [project_id]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(total_amount::text, 0) - safe_numeric(paid_amount::text, 0)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'آجل' OR purchase_type = 'اجل')`, [project_id]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(total_amount::text, 0)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'مخزن' OR purchase_type = 'توريد' OR purchase_type = 'مخزني')`, [project_id]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(paid_amount::text, 0)), 0) as total, COUNT(DISTINCT COALESCE(NULLIF(date,''), attendance_date)) as completed_days FROM worker_attendance WHERE project_id = $1 AND (safe_numeric(paid_amount::text, 0) > 0 OR safe_numeric(work_days::text, 0) > 0)`, [project_id]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM transportation_expenses WHERE project_id = $1`, [project_id]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM worker_transfers WHERE project_id = $1`, [project_id]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM worker_misc_expenses WHERE project_id = $1`, [project_id]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM fund_transfers WHERE project_id = $1`, [project_id]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM project_fund_transfers WHERE from_project_id = $1 AND (transfer_reason IS NULL OR transfer_reason != 'legacy_worker_rebalance')`, [project_id]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM project_fund_transfers WHERE to_project_id = $1 AND (transfer_reason IS NULL OR transfer_reason != 'legacy_worker_rebalance')`, [project_id]),
          pool.query(`SELECT COUNT(DISTINCT wa.worker_id) as total_workers, COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers FROM worker_attendance wa INNER JOIN workers w ON wa.worker_id = w.id WHERE wa.project_id = $1`, [project_id]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM supplier_payments WHERE project_id = $1`, [project_id])
        ]);
      } else if (cleanDate) {
        [materialCashStats, materialCreditStats, materialStorageStats, workerWagesStats, transportStats,
         workerTransfersStats, miscExpensesStats, fundTransfersStats,
         outgoingTransfersStats, incomingTransfersStats, workersStatsResult, supplierPaymentsStats] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(
            CASE 
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (safe_numeric(paid_amount::text, 0) > 0) THEN safe_numeric(paid_amount::text, 0)
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN safe_numeric(total_amount::text, 0)
              ELSE 0
            END
          ), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND purchase_date::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(total_amount::text, 0) - safe_numeric(paid_amount::text, 0)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'آجل' OR purchase_type = 'اجل') AND purchase_date::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(total_amount::text, 0)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'مخزن' OR purchase_type = 'توريد' OR purchase_type = 'مخزني') AND purchase_date::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(paid_amount::text, 0)), 0) as total, COUNT(DISTINCT COALESCE(NULLIF(date,''), attendance_date)) as completed_days FROM worker_attendance WHERE project_id = $1 AND (safe_numeric(paid_amount::text, 0) > 0 OR safe_numeric(work_days::text, 0) > 0) AND COALESCE(NULLIF(date,''), attendance_date)::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM transportation_expenses WHERE project_id = $1 AND date::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM worker_transfers WHERE project_id = $1 AND transfer_date::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM worker_misc_expenses WHERE project_id = $1 AND date::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM fund_transfers WHERE project_id = $1 AND transfer_date::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM project_fund_transfers WHERE from_project_id = $1 AND transfer_date::date = $2::date AND (transfer_reason IS NULL OR transfer_reason NOT IN ('legacy_worker_rebalance', 'settlement'))`, [project_id, cleanDate]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM project_fund_transfers WHERE to_project_id = $1 AND transfer_date::date = $2::date AND (transfer_reason IS NULL OR transfer_reason NOT IN ('legacy_worker_rebalance', 'settlement'))`, [project_id, cleanDate]),
          pool.query(`SELECT COUNT(DISTINCT wa.worker_id) as total_workers, COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers FROM worker_attendance wa INNER JOIN workers w ON wa.worker_id = w.id WHERE wa.project_id = $1 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date)::date = $2::date`, [project_id, cleanDate]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM supplier_payments WHERE project_id = $1 AND payment_date::date = $2::date`, [project_id, cleanDate])
        ]);
      } else {
        [materialCashStats, materialCreditStats, materialStorageStats, workerWagesStats, transportStats,
         workerTransfersStats, miscExpensesStats, fundTransfersStats,
         outgoingTransfersStats, incomingTransfersStats, workersStatsResult, supplierPaymentsStats] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(
            CASE 
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND (safe_numeric(paid_amount::text, 0) > 0) THEN safe_numeric(paid_amount::text, 0)
              WHEN (purchase_type = 'نقداً' OR purchase_type = 'نقد') THEN safe_numeric(total_amount::text, 0)
              ELSE 0
            END
          ), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقداً' OR purchase_type = 'نقد') AND purchase_date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(total_amount::text, 0) - safe_numeric(paid_amount::text, 0)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'آجل' OR purchase_type = 'اجل') AND purchase_date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(total_amount::text, 0)), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'مخزن' OR purchase_type = 'توريد' OR purchase_type = 'مخزني') AND purchase_date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(paid_amount::text, 0)), 0) as total, COUNT(DISTINCT COALESCE(NULLIF(date,''), attendance_date)) as completed_days FROM worker_attendance WHERE project_id = $1 AND (safe_numeric(paid_amount::text, 0) > 0 OR safe_numeric(work_days::text, 0) > 0) AND COALESCE(NULLIF(date,''), attendance_date)::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM transportation_expenses WHERE project_id = $1 AND date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM worker_transfers WHERE project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM worker_misc_expenses WHERE project_id = $1 AND date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM fund_transfers WHERE project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM project_fund_transfers WHERE from_project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date AND (transfer_reason IS NULL OR transfer_reason NOT IN ('legacy_worker_rebalance', 'settlement'))`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM project_fund_transfers WHERE to_project_id = $1 AND transfer_date::date BETWEEN $2::date AND $3::date AND (transfer_reason IS NULL OR transfer_reason NOT IN ('legacy_worker_rebalance', 'settlement'))`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COUNT(DISTINCT wa.worker_id) as total_workers, COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers FROM worker_attendance wa INNER JOIN workers w ON wa.worker_id = w.id WHERE wa.project_id = $1 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date)::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo]),
          pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM supplier_payments WHERE project_id = $1 AND payment_date::date BETWEEN $2::date AND $3::date`, [project_id, cleanDateFrom, cleanDateTo])
        ]);
      }

      const projectName = String(projectInfo.rows[0]?.name || 'مشروع غير معروف');
      const projectStatus = String(projectInfo.rows[0]?.status || 'active');
      const projectDescription = projectInfo.rows[0]?.description ? String(projectInfo.rows[0].description) : null;

      const materialExpenses = this.cleanDbValue(materialCashStats.rows[0]?.total);
      const materialExpensesCredit = this.cleanDbValue(materialCreditStats.rows[0]?.total);
      const materialExpensesStorage = this.cleanDbValue(materialStorageStats?.rows[0]?.total);
      const workerWages = this.cleanDbValue(workerWagesStats.rows[0]?.total);
      const transportExpenses = this.cleanDbValue(transportStats.rows[0]?.total);
      const workerTransfers = this.cleanDbValue(workerTransfersStats.rows[0]?.total);
      const miscExpenses = this.cleanDbValue(miscExpensesStats.rows[0]?.total);
      const fundTransfers = this.cleanDbValue(fundTransfersStats.rows[0]?.total);
      const outgoingProjectTransfers = this.cleanDbValue(outgoingTransfersStats.rows[0]?.total);
      const incomingProjectTransfers = this.cleanDbValue(incomingTransfersStats.rows[0]?.total);
      const supplierPayments = this.cleanDbValue(supplierPaymentsStats?.rows[0]?.total);

      const totalCashExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses + outgoingProjectTransfers + supplierPayments;
      
      // الرصيد النقدي لليوم
      const totalIncome = fundTransfers + incomingProjectTransfers;
      const cashBalance = totalIncome - totalCashExpenses;
      
      // الرصيد التراكمي الشامل
      const totalIncomeWithCarried = totalIncome + carriedForwardBalance;
      const totalBalance = totalIncomeWithCarried - totalCashExpenses;
      const totalAllExpenses = totalCashExpenses + materialExpensesCredit; 

      return {
        project_id, projectName, status: projectStatus, description: projectDescription,
        expenses: { 
          materialExpenses, 
          materialExpensesCredit, 
          materialExpensesStorage,
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
        counts: {
          materialPurchases: this.cleanDbValue(materialCashStats.rows[0]?.count, 'integer'),
          workerAttendance: this.cleanDbValue(workerWagesStats.rows[0]?.count, 'integer'),
          transportationExpenses: this.cleanDbValue(transportStats.rows[0]?.count, 'integer'),
          workerTransfers: this.cleanDbValue(workerTransfersStats.rows[0]?.count, 'integer'),
          miscExpenses: this.cleanDbValue(miscExpensesStats.rows[0]?.count, 'integer'),
          fundTransfers: this.cleanDbValue(fundTransfersStats.rows[0]?.count, 'integer'),
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ [ExpenseLedger] خطأ في جلب ملخص المشروع ${project_id}:`, error);
      throw error;
    }
  }

  static async getDailyFinancialSummary(project_id: string, date: string): Promise<DailyFinancialSummary> {
    const summary = await this.getProjectFinancialSummary(project_id, date);
    return { ...summary, date };
  }

  static async getAllProjectsStats(date?: string, dateFrom?: string, dateTo?: string): Promise<ProjectFinancialSummary[]> {
    try {
      const projectsList = await pool.query(`SELECT id, name FROM projects WHERE is_active = true ORDER BY created_at`);
      
      // تنفيذ الطلبات بالتوازي بدلاً من التسلسل لتقليل وقت الاستجابة الإجمالي
      const results = await Promise.all(projectsList.rows.map(project => 
        this.getProjectFinancialSummary(project.id as string, date, dateFrom, dateTo)
      ));
      
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
        materialExpensesStorage: 0,
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
        totals.materialExpensesStorage += (p.expenses.materialExpensesStorage || 0);
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
