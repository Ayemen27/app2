/**
 * مسارات إدارة المشاريع
 * Project Management Routes
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, and, sql, gte, lt, lte, desc, or } from 'drizzle-orm';
import { db, pool } from '../../db';
import {
  projects, workers, materials, suppliers, materialPurchases, workerAttendance,
  fundTransfers, transportationExpenses, dailyExpenseSummaries,
  workerTransfers, workerMiscExpenses, workerBalances, projectFundTransfers, supplierPayments,
  enhancedInsertProjectSchema, enhancedInsertWorkerSchema,
  insertMaterialSchema, insertSupplierSchema, insertMaterialPurchaseSchema,
  insertWorkerAttendanceSchema, insertFundTransferSchema, insertTransportationExpenseSchema,
  insertDailyExpenseSummarySchema,
  insertWorkerTransferSchema, insertWorkerMiscExpenseSchema, insertWorkerBalanceSchema
} from '../../../shared/schema';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { ExpenseLedgerService } from '../../services/ExpenseLedgerService';
import { attachAccessibleProjects, ProjectAccessRequest, requireProjectAccess } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';

export const projectRouter = express.Router();

const balanceCache = new Map<string, { value: number; timestamp: number }>();
const BALANCE_CACHE_TTL = 60_000;
const BALANCE_CACHE_MAX = 200;

function getCachedBalance(key: string): number | null {
  const entry = balanceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > BALANCE_CACHE_TTL) {
    balanceCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedBalance(key: string, value: number) {
  if (balanceCache.size >= BALANCE_CACHE_MAX) {
    const oldest = balanceCache.keys().next().value;
    if (oldest) balanceCache.delete(oldest);
  }
  balanceCache.set(key, { value, timestamp: Date.now() });
}

export function invalidateBalanceCache(project_id?: string) {
  if (project_id) {
    for (const key of balanceCache.keys()) {
      if (key.startsWith(project_id + ':')) {
        balanceCache.delete(key);
      }
    }
  } else {
    balanceCache.clear();
  }
}

// تطبيق المصادقة وتحميل المشاريع المتاحة على جميع مسارات المشاريع
projectRouter.use(requireAuth);
projectRouter.use(attachAccessibleProjects);

/**
 * 📊 جلب قائمة المشاريع
 * GET /api/projects
 */
import { sendSuccess, sendError } from '../../middleware/api-response.js';
import { inArray } from 'drizzle-orm';

projectRouter.get('/', async (req: Request, res: Response) => {
  try {
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    
    let projectsList;
    if (isAdminUser) {
      projectsList = await db.select().from(projects).orderBy(projects.created_at);
    } else {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (ids.length === 0) {
        projectsList = [];
      } else {
        projectsList = await db.select().from(projects)
          .where(inArray(projects.id, ids))
          .orderBy(projects.created_at);
      }
    }
    return sendSuccess(res, projectsList, `تم جلب ${projectsList.length} مشروع بنجاح`);
  } catch (error: any) {
    return sendError(res, "فشل في جلب قائمة المشاريع", 500, [{ message: error.message }]);
  }
});

/**
 * 📊 جلب المشاريع مع الإحصائيات
 * GET /api/projects/with-stats
 * يستخدم ExpenseLedgerService كمصدر موحد للحقيقة
 */
const statsCache = new Map<string, { data: any; timestamp: number }>();
const STATS_CACHE_TTL = 120_000;

function getStatsFromCache(key: string): any | null {
  const entry = statsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > STATS_CACHE_TTL) {
    statsCache.delete(key);
    return null;
  }
  return entry.data;
}

projectRouter.get('/with-stats', async (req: Request, res: Response) => {
  try {
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const userId = (accessReq.user as any)?.user_id || (accessReq.user as any)?.id || 'anon';
    const cacheKey = isAdminUser ? 'admin' : `user:${userId}`;

    const cached = getStatsFromCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        message: `تم جلب ${cached.length} مشروع مع الإحصائيات بنجاح (cached)`
      });
    }

    let projectsList;
    if (isAdminUser) {
      projectsList = await db.select().from(projects).orderBy(projects.created_at);
    } else {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (ids.length === 0) {
        projectsList = [];
      } else {
        projectsList = await db.select().from(projects)
          .where(inArray(projects.id, ids))
          .orderBy(projects.created_at);
      }
    }

    const BATCH_SIZE = 5;
    const projectsWithStats: any[] = [];
    for (let i = 0; i < projectsList.length; i += BATCH_SIZE) {
      const batch = projectsList.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (project: any) => {
        try {
          const summary = await ExpenseLedgerService.getProjectFinancialSummary(project.id);
          return {
            ...project,
            stats: {
              totalWorkers: summary.workers.totalWorkers,
              totalExpenses: summary.expenses.totalCashExpenses,
              totalExpensesAll: summary.expenses.totalAllExpenses,
              totalIncome: summary.income.totalIncome,
              currentBalance: summary.cashBalance,
              totalBalance: summary.totalBalance,
              activeWorkers: summary.workers.activeWorkers,
              completedDays: summary.workers.completedDays,
              materialPurchases: summary.counts?.materialPurchases || 0,
              materialExpensesCredit: summary.expenses?.materialExpensesCredit || 0,
              totalTransportation: summary.expenses?.totalTransportation || 0,
              totalMiscExpenses: summary.expenses?.totalMiscExpenses || 0,
              totalWorkerWages: summary.expenses?.totalWorkerWages || 0,
              totalFundTransfers: summary.expenses?.totalFundTransfers || 0,
              totalWorkerTransfers: summary.expenses?.totalWorkerTransfers || 0,
              lastActivity: project.created_at.toISOString()
            }
          };
        } catch {
          return {
            ...project,
            stats: {
              totalWorkers: 0, totalExpenses: 0, totalExpensesAll: 0,
              totalIncome: 0, currentBalance: 0, totalBalance: 0,
              activeWorkers: 0, completedDays: 0, materialPurchases: 0,
              materialExpensesCredit: 0, lastActivity: project.created_at.toISOString()
            }
          };
        }
      }));
      projectsWithStats.push(...batchResults);
    }

    statsCache.set(cacheKey, { data: projectsWithStats, timestamp: Date.now() });

    res.json({
      success: true,
      data: projectsWithStats,
      message: `تم جلب ${projectsWithStats.length} مشروع مع الإحصائيات بنجاح`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      data: [],
      error: error.error,
      message: "فشل في جلب قائمة المشاريع مع الإحصائيات"
    });
  }
});

/**
 * 📊 جلب جميع المصروفات من جميع المشاريع - مجمعة حسب المشروع
 * GET /api/projects/all-projects-expenses
 */
projectRouter.get('/all-projects-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { date } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds;

    const rawDate = date as string || new Date().toISOString().split('T')[0];
    const effectiveDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().split('T')[0];

    console.log(`📊 [API] طلب جلب جميع المصروفات من جميع المشاريع للتاريخ: ${effectiveDate}`);
    const startTimeFetch = Date.now();

    const safeDateFilter = (col: string) => {
      const allowedCols = ['transfer_date', 'date', 'purchase_date'];
      if (!allowedCols.includes(col)) throw new Error('Invalid column name');
      return sql`(CASE 
        WHEN ${sql.raw(col)} IS NULL OR CAST(${sql.raw(col)} AS TEXT) = '' OR CAST(${sql.raw(col)} AS TEXT) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
        THEN '1970-01-01' 
        ELSE SUBSTRING(CAST(${sql.raw(col)} AS TEXT) FROM 1 FOR 10) 
      END) = ${effectiveDate}`;
    };

    const [
      fundTransfersResult,
      workerAttendanceResult,
      materialPurchasesResult,
      transportationResult,
      workerTransfersResult,
      miscExpensesResult,
      projectsList
    ] = await Promise.all([
      db.select().from(fundTransfers).where(safeDateFilter('transfer_date')).orderBy(desc(sql`CASE WHEN transfer_date IS NULL OR CAST(transfer_date AS TEXT) = '' THEN '1970-01-01'::text ELSE CAST(transfer_date AS TEXT) END`)),

      db.select({
            id: workerAttendance.id,
            worker_id: workerAttendance.worker_id,
            project_id: workerAttendance.project_id,
            date: workerAttendance.date,
            paidAmount: workerAttendance.paidAmount,
            actualWage: workerAttendance.actualWage,
            workDays: workerAttendance.workDays,
            workerName: workers.name
          })
          .from(workerAttendance)
          .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
          .where(and(
            eq(workerAttendance.date, effectiveDate),
            or(
              sql`CAST(${workerAttendance.workDays} AS DECIMAL) > 0`,
              sql`CAST(${workerAttendance.paidAmount} AS DECIMAL) > 0`
            )
          ))
          .orderBy(desc(sql`CASE WHEN date IS NULL OR CAST(date AS TEXT) = '' THEN '1970-01-01' ELSE date END`)),

      db.select().from(materialPurchases).where(eq(materialPurchases.purchaseDate, effectiveDate)).orderBy(desc(materialPurchases.purchaseDate)),

      db.select().from(transportationExpenses).where(eq(transportationExpenses.date, effectiveDate)).orderBy(desc(transportationExpenses.date)),

      db.select().from(workerTransfers).where(safeDateFilter('transfer_date')).orderBy(desc(sql`CASE WHEN transfer_date IS NULL OR CAST(transfer_date AS TEXT) = '' THEN '1970-01-01'::text ELSE CAST(transfer_date AS TEXT) END`)),

      db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.date, effectiveDate)).orderBy(desc(workerMiscExpenses.date)),

      db.select().from(projects)
    ]);

    const filterByAccess = <T extends { project_id?: string | null }>(data: T[]): T[] => {
      if (isAdminUser) return data;
      const ids = accessibleIds ?? [];
      if (ids.length === 0) return [];
      const idSet = new Set(ids);
      return data.filter(item => item.project_id && idSet.has(item.project_id));
    };

    // تصفية المشاريع والبيانات حسب الصلاحيات
    const filteredProjectsList = filterByAccess(projectsList as any[]);
    const filteredFundTransfers = filterByAccess(fundTransfersResult as any[]);
    const filteredWorkerAttendance = filterByAccess(workerAttendanceResult as any[]);
    const filteredMaterialPurchases = filterByAccess(materialPurchasesResult as any[]);
    const filteredTransportation = filterByAccess(transportationResult as any[]);
    const filteredWorkerTransfers = filterByAccess(workerTransfersResult as any[]);
    const filteredMiscExpenses = filterByAccess(miscExpensesResult as any[]);

    // إنشاء خريطة أسماء المشاريع
    const projectsMap = new Map(filteredProjectsList.map(p => [p.id, p.name]));

    // دالة استخراج التاريخ من أي سجل
    const extractDate = (record: any): string => {
      const dateField = record.transferDate || record.purchaseDate || record.date;
      if (!dateField) return 'unknown';
      if (typeof dateField === 'string') return dateField.split('T')[0];
      if (dateField instanceof Date) {
        return `${dateField.getFullYear()}-${String(dateField.getMonth() + 1).padStart(2, '0')}-${String(dateField.getDate()).padStart(2, '0')}`;
      }
      return String(dateField).split('T')[0];
    };

    // تجميع البيانات حسب (المشروع + التاريخ)
    const projectDateGroups = new Map<string, {
      project_id: string;
      projectName: string;
      date: string;
      fundTransfers: any[];
      workerAttendance: any[];
      materialPurchases: any[];
      transportationExpenses: any[];
      workerTransfers: any[];
      miscExpenses: any[];
    }>();

    // تهيئة المجموعات لكل (مشروع + تاريخ)
    const initProjectDateGroup = (project_id: string, dateStr: string) => {
      const key = `${project_id}__${dateStr}`;
      if (!projectDateGroups.has(key)) {
        projectDateGroups.set(key, {
          project_id,
          projectName: project_id === 'all' ? 'مصروفات عامة (غير محددة لمشروع)' : (projectsMap.get(project_id) || 'مشروع غير معروف'),
          date: dateStr,
          fundTransfers: [],
          workerAttendance: [],
          materialPurchases: [],
          transportationExpenses: [],
          workerTransfers: [],
          miscExpenses: []
        });
      }
      return projectDateGroups.get(key)!;
    };

    // تجميع تحويلات العهد حسب (المشروع + التاريخ)
    filteredFundTransfers.forEach((t: any) => {
      const dateStr = extractDate(t);
      const group = initProjectDateGroup(t.project_id, dateStr);
      group.fundTransfers.push({ ...t, projectName: group.projectName });
    });

    // تجميع حضور العمال حسب (المشروع + التاريخ)
    filteredWorkerAttendance.forEach((a: any) => {
      const dateStr = extractDate(a);
      const group = initProjectDateGroup(a.project_id, dateStr);
      group.workerAttendance.push({ ...a, projectName: group.projectName });
    });

    // تجميع مشتريات المواد حسب (المشروع + التاريخ)
    filteredMaterialPurchases.forEach((m: any) => {
      const dateStr = extractDate(m);
      const group = initProjectDateGroup(m.project_id, dateStr);
      group.materialPurchases.push({ ...m, projectName: group.projectName });
    });

    // تجميع مصاريف النقل حسب (المشروع + التاريخ)
    filteredTransportation.forEach((t: any) => {
      const dateStr = extractDate(t);
      const group = initProjectDateGroup(t.project_id, dateStr);
      group.transportationExpenses.push({ ...t, projectName: group.projectName });
    });

    // تجميع تحويلات العمال حسب (المشروع + التاريخ)
    filteredWorkerTransfers.forEach((w: any) => {
      const dateStr = extractDate(w);
      const group = initProjectDateGroup(w.project_id, dateStr);
      group.workerTransfers.push({ ...w, projectName: group.projectName });
    });

    // تجميع المصاريف المتنوعة حسب (المشروع + التاريخ)
    filteredMiscExpenses.forEach((m: any) => {
      const dateStr = extractDate(m);
      const group = initProjectDateGroup(m.project_id, dateStr);
      group.miscExpenses.push({ ...m, projectName: group.projectName });
    });

    // تحويل المجموعات إلى مصفوفة مع حساب الإجماليات لكل (مشروع + تاريخ)
    const groupedByProjectDate = Array.from(projectDateGroups.values())
      .map(group => {
        const totalFundTransfers = group.fundTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalWorkerWages = group.workerAttendance.reduce((sum, w) => sum + Number(w.paidAmount || 0), 0);
        const totalMaterialCosts = group.materialPurchases.reduce((sum, m) => sum + Number(m.totalAmount || 0), 0);
        const totalTransportation = group.transportationExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalWorkerTransfers = group.workerTransfers.reduce((sum, w) => sum + Number(w.amount || 0), 0);
        const totalMiscExpenses = group.miscExpenses.reduce((sum, m) => sum + Number(m.amount || 0), 0);

        const totalIncome = totalFundTransfers;
        const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses;
        const remainingBalance = totalIncome - totalExpenses;

        return {
          ...group,
          totalIncome,
          totalExpenses,
          totalFundTransfers,
          totalWorkerWages,
          totalMaterialCosts,
          totalTransportation,
          totalWorkerTransfers,
          totalMiscExpenses,
          remainingBalance: Number(remainingBalance.toFixed(2)),
          counts: {
            fundTransfers: group.fundTransfers.length,
            workerAttendance: group.workerAttendance.length,
            materialPurchases: group.materialPurchases.length,
            transportationExpenses: group.transportationExpenses.length,
            workerTransfers: group.workerTransfers.length,
            miscExpenses: group.miscExpenses.length
          }
        };
      })
      .sort((a, b) => {
        // ترتيب حسب التاريخ (الأحدث أولاً) ثم حسب اسم المشروع
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.projectName.localeCompare(b.projectName);
      });

    const overallSumsQuery = await pool.query(`
      SELECT
        COALESCE((SELECT SUM(CAST(amount AS DECIMAL(15,2))) FROM fund_transfers WHERE (CASE WHEN transfer_date IS NULL OR CAST(transfer_date AS TEXT) = '' OR CAST(transfer_date AS TEXT) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN NULL ELSE SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) END) = $1), 0) as total_fund_transfers,
        COALESCE((SELECT SUM(CAST(paid_amount AS DECIMAL(15,2))) FROM worker_attendance WHERE (CAST(work_days AS DECIMAL) > 0 OR CAST(paid_amount AS DECIMAL) > 0) AND date = $1), 0) as total_worker_wages,
        COALESCE((SELECT SUM(CAST(total_amount AS DECIMAL(15,2))) FROM material_purchases WHERE purchase_date = $1), 0) as total_material_costs,
        COALESCE((SELECT SUM(CAST(amount AS DECIMAL(15,2))) FROM transportation_expenses WHERE date = $1), 0) as total_transportation,
        COALESCE((SELECT SUM(CAST(amount AS DECIMAL(15,2))) FROM worker_transfers WHERE (CASE WHEN transfer_date IS NULL OR CAST(transfer_date AS TEXT) = '' OR CAST(transfer_date AS TEXT) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN NULL ELSE SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) END) = $1), 0) as total_worker_transfers,
        COALESCE((SELECT SUM(CAST(amount AS DECIMAL(15,2))) FROM worker_misc_expenses WHERE date = $1), 0) as total_misc_expenses
    `, [effectiveDate]);
    const overallSums = overallSumsQuery.rows[0];
    const overallTotalFundTransfers = Number(overallSums.total_fund_transfers);
    const overallTotalWorkerWages = Number(overallSums.total_worker_wages);
    const overallTotalMaterialCosts = Number(overallSums.total_material_costs);
    const overallTotalTransportation = Number(overallSums.total_transportation);
    const overallTotalWorkerTransfers = Number(overallSums.total_worker_transfers);
    const overallTotalMiscExpenses = Number(overallSums.total_misc_expenses);

    const overallTotalIncome = overallTotalFundTransfers;
    const overallTotalExpenses = overallTotalWorkerWages + overallTotalMaterialCosts + overallTotalTransportation + overallTotalWorkerTransfers + overallTotalMiscExpenses;
    const overallRemainingBalance = overallTotalIncome - overallTotalExpenses;

    // إنشاء مصفوفات مسطحة لجميع البيانات (للتوافق مع الكود القديم)
    const allFundTransfers = filteredFundTransfers.map((t: any) => ({ ...t, projectName: t.project_id === 'all' ? 'مصروفات عامة' : (projectsMap.get(t.project_id) || 'مشروع غير معروف') }));
    const allWorkerAttendance = filteredWorkerAttendance.map((a: any) => ({ ...a, projectName: a.project_id === 'all' ? 'مصروفات عامة' : (projectsMap.get(a.project_id) || 'مشروع غير معروف') }));
    const allMaterialPurchases = filteredMaterialPurchases.map((m: any) => ({ ...m, projectName: m.project_id === 'all' ? 'مصروفات عامة' : (projectsMap.get(m.project_id) || 'مشروع غير معروف') }));
    const allTransportation = filteredTransportation.map((t: any) => ({ ...t, projectName: t.project_id === 'all' ? 'مصروفات عامة' : (projectsMap.get(t.project_id) || 'مشروع غير معروف') }));
    const allWorkerTransfers = filteredWorkerTransfers.map((w: any) => ({ ...w, projectName: w.project_id === 'all' ? 'مصروفات عامة' : (projectsMap.get(w.project_id) || 'مشروع غير معروف') }));
    const allMiscExpenses = filteredMiscExpenses.map((m: any) => ({ ...m, projectName: m.project_id === 'all' ? 'مصروفات عامة' : (projectsMap.get(m.project_id) || 'مشروع غير معروف') }));

    const responseData = {
      // البيانات المجمعة حسب (المشروع + التاريخ) - الجديدة
      groupedByProjectDate,
      cardsCount: groupedByProjectDate.length,

      // الإجماليات العامة
      projectName: 'جميع المشاريع',
      totalIncome: overallTotalIncome,
      totalExpenses: overallTotalExpenses,
      remainingBalance: parseFloat(overallRemainingBalance.toFixed(2)),

      // البيانات المسطحة (للتوافق مع الكود القديم)
      fundTransfers: allFundTransfers,
      workerAttendance: allWorkerAttendance,
      materialPurchases: allMaterialPurchases,
      transportationExpenses: allTransportation,
      workerTransfers: allWorkerTransfers,
      miscExpenses: allMiscExpenses,

      counts: {
        fundTransfers: fundTransfersResult.length,
        workerAttendance: workerAttendanceResult.length,
        materialPurchases: materialPurchasesResult.length,
        transportationExpenses: transportationResult.length,
        workerTransfers: workerTransfersResult.length,
        miscExpenses: miscExpensesResult.length
      }
    };

    const duration = Date.now() - startTimeFetch;
    console.log(`✅ [API] تم جلب جميع المصروفات من جميع المشاريع بنجاح (${groupedByProjectDate.length} بطاقة) في ${duration}ms`);

    res.json({
      success: true,
      data: responseData,
      message: `تم جلب ${groupedByProjectDate.length} بطاقة مصروفات بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب جميع المصروفات من جميع المشاريع:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب جميع المصروفات',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📝 إضافة مشروع جديد
 * POST /api/projects
 */
projectRouter.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('📝 [API] طلب إضافة مشروع جديد من المستخدم:', req.user?.email);
    console.log('📋 [API] بيانات المشروع المرسلة:', req.body);

    // Validation باستخدام enhanced schema
    const validationResult = enhancedInsertProjectSchema.safeParse(req.body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation المشروع:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات المشروع غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات المشروع غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    console.log('✅ [API] نجح validation المشروع');

    const projectData = { ...validationResult.data };
    const currentUser = req.user as any;
    if (!projectData.engineerId && currentUser?.id) {
      projectData.engineerId = currentUser.id;
      console.log('🔧 [API] تعيين engineerId تلقائياً للمستخدم الحالي:', currentUser.id);
    }

    console.log('💾 [API] حفظ المشروع في قاعدة البيانات...');
    const newProject = await db.insert(projects).values(projectData).returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء المشروع بنجاح في ${duration}ms:`, {
      id: newProject[0].id,
      name: newProject[0].name,
      status: newProject[0].status
    });

    res.status(201).json({
      success: true,
      data: newProject[0],
      message: `تم إنشاء المشروع "${newProject[0].name}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إنشاء المشروع:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في إنشاء المشروع';
    let statusCode = 500;

    if (error.code === '23505') { // duplicate key
      errorMessage = 'اسم المشروع موجود مسبقاً';
      statusCode = 409;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات المشروع ناقصة';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب الملخص اليومي للمشروع
 * GET /api/projects/:id/daily-summary/:date
 */
projectRouter.get('/:id/daily-summary/:date', requireProjectAccess('view'), async (req: Request, res: Response) => {
  try {
    const { id, date } = req.params;
    console.log(`📊 [API] طلب جلب الملخص اليومي للمشروع: ${id} للتاريخ: ${date}`);

    if (id === 'all') {
      const summary = await ExpenseLedgerService.getAllProjectsDailySummary(date);
      return res.json({ success: true, data: summary });
    }

    const summary = await ExpenseLedgerService.getProjectFinancialSummary(id, date);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب الملخص اليومي:', error);
    res.status(500).json({ success: false, message: "فشل في جلب الملخص اليومي" });
  }
});

/**
 * 📝 إضافة مشترية مواد جديدة
 */
projectRouter.post('/:id/material-purchases', requireProjectAccess('add'), async (req: Request, res: Response) => {
  try {
    const { id: project_id } = req.params;
    const purchaseData = { ...req.body, project_id };

    const validation = insertMaterialPurchaseSchema.safeParse(purchaseData);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "بيانات المشتريات غير صحيحة",
        details: validation.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      });
    }

    const [newPurchase] = await db.insert(materialPurchases).values(validation.data).returning();
    
    try {
      await ExpenseLedgerService.recordExpense({
        project_id,
        amount: validation.data.totalAmount as string,
        category: 'material',
        referenceId: newPurchase.id,
        description: `شراء مواد: ${validation.data.materialName}`,
        date: validation.data.purchaseDate
      });
    } catch (ledgerError) {
      console.error('⚠️ [API] فشل تحديث سجل الأستاذ العام:', ledgerError);
    }

    res.status(201).json({
      success: true,
      data: newPurchase,
      message: "تم حفظ شراء المواد بنجاح"
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في إضافة مشترية مواد:', error);
    res.status(500).json({ success: false, message: "فشل في حفظ شراء المواد", error: error.message });
  }
});

/**
 * 🔍 جلب مشروع محدد
 * GET /api/projects/:id
 */
projectRouter.get('/:id', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    console.log('🔍 [API] طلب جلب مشروع محدد من المستخدم:', req.user?.email);
    console.log('📋 [API] معرف المشروع:', id);

    // Support for 'all' or 'all-projects-total' daily summary
    if (id === 'all' || id === 'all-projects-total') {
      const { date } = req.query;
      
      console.log(`📊 [API] جلب ملخص شامل لجميع المشاريع (ID: ${id})`);
      
      // جلب إحصائيات جميع المشاريع لهذا اليوم
      const projectsList = await db.select().from(projects);
      const summaries = await Promise.all(projectsList.map(async (p: any) => {
        try {
          return await ExpenseLedgerService.getProjectFinancialSummary(p.id, date as string);
        } catch (e) {
          return null;
        }
      }));

      return res.json({ 
        success: true, 
        data: { 
          message: "All projects summary",
          date,
          summaries: summaries.filter(s => s !== null)
        }, 
        message: "تم جلب ملخص جميع المشاريع" 
      });
    }

    // التحقق من وجود معرف المشروع
    if (!id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        message: 'لم يتم توفير معرف المشروع',
        processingTime: duration
      });
    }

    // البحث عن المشروع في قاعدة البيانات
    console.log('🔍 [API] البحث عن المشروع في قاعدة البيانات...');
    const projectResult = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

    if (projectResult.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] المشروع غير موجود:', id);
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود',
        message: `لم يتم العثور على مشروع بالمعرف: ${id}`,
        processingTime: duration
      });
    }

    const project = projectResult[0];

    // جلب إحصائيات المشروع (optional - يمكن إضافة query parameter للتحكم بها)
    const includeStats = req.query.includeStats === 'true';
    let projectWithStats = { ...project };

    if (includeStats) {
      try {
        console.log('📊 [API] حساب إحصائيات المشروع...');

        // دالة مساعدة لتنظيف القيم
        const cleanDbValue = (value: any, type: 'integer' | 'decimal' = 'decimal'): number => {
          if (value === null || value === undefined) return 0;
          const strValue = String(value).trim();
          const parsed = type === 'integer' ? parseInt(strValue, 10) : parseFloat(strValue);
          return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed);
        };

        // حساب الإحصائيات بشكل متوازي
        const [
          workersStats,
          materialStats,
          workerWagesStats,
          fundTransfersStats,
          transportStats,
          workerTransfersStats,
          miscExpensesStats
        ] = await Promise.all([
          db.execute(sql`
            SELECT
              COUNT(DISTINCT wa.worker_id) as total_workers,
              COUNT(DISTINCT CASE WHEN w.is_active = true THEN wa.worker_id END) as active_workers
            FROM worker_attendance wa
            INNER JOIN workers w ON wa.worker_id = w.id
            WHERE wa.project_id = ${id}
          `),
          db.execute(sql`
            SELECT
              COUNT(*) as material_purchases,
              COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as material_expenses
            FROM material_purchases
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT
              COALESCE(SUM(CAST(actual_wage AS DECIMAL)), 0) as worker_wages,
              COUNT(DISTINCT date) as completed_days
            FROM worker_attendance
            WHERE project_id = ${id} AND is_present = true
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_income
            FROM fund_transfers
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as transport_expenses
            FROM transportation_expenses
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as worker_transfers
            FROM worker_transfers
            WHERE project_id = ${id}
          `),
          db.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as misc_expenses
            FROM worker_misc_expenses
            WHERE project_id = ${id}
          `)
        ]);

        // استخراج القيم وتنظيفها
        const totalWorkers = cleanDbValue(workersStats.rows[0]?.total_workers || '0', 'integer');
        const activeWorkers = cleanDbValue(workersStats.rows[0]?.active_workers || '0', 'integer');
        const materialExpenses = cleanDbValue(materialStats.rows[0]?.material_expenses || '0');
        const materialPurchases = cleanDbValue(materialStats.rows[0]?.material_purchases || '0', 'integer');
        const workerWages = cleanDbValue(workerWagesStats.rows[0]?.worker_wages || '0');
        const completedDays = cleanDbValue(workerWagesStats.rows[0]?.completed_days || '0', 'integer');
        const totalIncome = cleanDbValue(fundTransfersStats.rows[0]?.total_income || '0');
        const transportExpenses = cleanDbValue(transportStats.rows[0]?.transport_expenses || '0');
        const workerTransfers = cleanDbValue(workerTransfersStats.rows[0]?.worker_transfers || '0');
        const miscExpenses = cleanDbValue(miscExpensesStats.rows[0]?.misc_expenses || '0');

        // حساب إجمالي المصروفات والرصيد
        const totalExpenses = materialExpenses + workerWages + transportExpenses + workerTransfers + miscExpenses;
        const currentBalance = totalIncome - totalExpenses;

        projectWithStats = {
          ...project,
          stats: {
            totalWorkers: Math.max(0, totalWorkers),
            totalExpenses: Math.max(0, totalExpenses),
            totalIncome: Math.max(0, totalIncome),
            currentBalance: currentBalance,
            activeWorkers: Math.max(0, activeWorkers),
            completedDays: Math.max(0, completedDays),
            materialPurchases: Math.max(0, materialPurchases),
            lastActivity: project.created_at.toISOString()
          }
        } as any;

        console.log('✅ [API] تم حساب إحصائيات المشروع بنجاح');
      } catch (statsError) {
        console.error('⚠️ [API] خطأ في حساب إحصائيات المشروع:', statsError);
        // إرجاع المشروع بدون إحصائيات في حالة فشل حساب الإحصائيات
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب المشروع بنجاح في ${duration}ms:`, {
      id: project.id,
      name: project.name,
      status: project.status,
      includeStats
    });

    res.json({
      success: true,
      data: projectWithStats,
      message: `تم جلب المشروع "${project.name}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب المشروع:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في جلب المشروع';
    let statusCode = 500;

    if (error.code === '22P02') { // invalid input syntax for UUID
      errorMessage = 'معرف المشروع غير صحيح';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 🔄 تعديل مشروع
 * PATCH /api/projects/:id
 */
projectRouter.patch('/:id', requireProjectAccess('edit'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const project_id = req.params.id;
    console.log('🔄 [API] طلب تحديث المشروع:', project_id);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    // التحقق من وجود المشروع
    const existingProject = await db.select().from(projects).where(eq(projects.id, project_id)).limit(1);

    if (existingProject.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود',
        processingTime: Date.now() - startTime
      });
    }

    const allowedFields = [
      'name', 'description', 'location', 'clientName', 'budget',
      'startDate', 'endDate', 'status', 'engineerId', 'managerName',
      'contactPhone', 'notes', 'imageUrl', 'project_type_id', 'is_active'
    ] as const;

    const sanitizedBody: Record<string, unknown> = {};
    for (const key of Object.keys(req.body)) {
      if ((allowedFields as readonly string[]).includes(key)) {
        sanitizedBody[key] = req.body[key];
      }
    }

    if (Object.keys(sanitizedBody).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد حقول صالحة للتحديث',
        processingTime: Date.now() - startTime
      });
    }

    sanitizedBody.updated_at = new Date();

    const updatedProject = await db
      .update(projects)
      .set(sanitizedBody)
      .where(eq(projects.id, project_id))
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث المشروع بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: updatedProject[0],
      message: `تم تحديث المشروع "${updatedProject[0].name}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث المشروع:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في تحديث المشروع',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب إحصائيات البيانات المرتبطة بالمشروع قبل الحذف
 * GET /api/projects/:id/deletion-stats
 * يتطلب أن يكون المستخدم مسؤول (admin) أو مالك المشروع
 */
projectRouter.get('/:id/deletion-stats', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const project_id = req.params.id;
    const user = req.user as any;

    console.log('📊 [API] طلب إحصائيات الحذف للمشروع:', project_id);
    console.log('👤 [API] المستخدم:', user?.email, 'الصلاحية:', user?.role);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    // التحقق من وجود المشروع
    const existingProject = await db.select().from(projects).where(eq(projects.id, project_id)).limit(1);

    if (existingProject.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود',
        message: `لم يتم العثور على مشروع بالمعرف: ${project_id}`,
        processingTime: Date.now() - startTime
      });
    }

    const project = existingProject[0];

    // التحقق من الصلاحيات - يجب أن يكون مسؤول أو مالك المشروع
    const isAdmin = user?.role === 'admin';
    const isOwner = project.engineerId === user?.id;

    // رفض الوصول للمستخدمين غير المصرح لهم
    if (!isAdmin && !isOwner) {
      const duration = Date.now() - startTime;
      console.warn('🚫 [API] رفض الوصول - المستخدم ليس مسؤول أو مالك:', { user_id: user?.id, projectOwner: project.engineerId });
      return res.status(403).json({
        success: false,
        error: 'غير مصرح',
        message: 'لا يمكنك عرض إحصائيات حذف مشروع لم تقم بإنشائه',
        processingTime: duration
      });
    }

    // جلب إحصائيات البيانات المرتبطة
    const [
      fundTransfersCount,
      workerAttendanceCount,
      materialPurchasesCount,
      transportationExpensesCount,
      workerTransfersCount,
      workerMiscExpensesCount,
      dailySummariesCount,
      projectTransfersFromCount,
      projectTransfersToCount,
      workerBalancesCount,
      supplierPaymentsCount
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(fundTransfers).where(eq(fundTransfers.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerAttendance).where(eq(workerAttendance.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(materialPurchases).where(eq(materialPurchases.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(transportationExpenses).where(eq(transportationExpenses.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerTransfers).where(eq(workerTransfers.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerMiscExpenses).where(eq(workerMiscExpenses.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(dailyExpenseSummaries).where(eq(dailyExpenseSummaries.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(projectFundTransfers).where(eq(projectFundTransfers.fromProjectId, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(projectFundTransfers).where(eq(projectFundTransfers.toProjectId, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerBalances).where(eq(workerBalances.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(supplierPayments).where(eq(supplierPayments.project_id, project_id))
    ]);

    const stats = {
      fundTransfers: Number(fundTransfersCount[0]?.count || 0),
      workerAttendance: Number(workerAttendanceCount[0]?.count || 0),
      materialPurchases: Number(materialPurchasesCount[0]?.count || 0),
      transportationExpenses: Number(transportationExpensesCount[0]?.count || 0),
      workerTransfers: Number(workerTransfersCount[0]?.count || 0),
      workerMiscExpenses: Number(workerMiscExpensesCount[0]?.count || 0),
      dailySummaries: Number(dailySummariesCount[0]?.count || 0),
      projectTransfersFrom: Number(projectTransfersFromCount[0]?.count || 0),
      projectTransfersTo: Number(projectTransfersToCount[0]?.count || 0),
      workerBalances: Number(workerBalancesCount[0]?.count || 0),
      supplierPayments: Number(supplierPaymentsCount[0]?.count || 0)
    };

    const totalLinkedRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
    const hasLinkedData = totalLinkedRecords > 0;

    // تحديد إمكانية الحذف بناءً على الصلاحيات
    let canDelete = false;
    let deleteBlockReason = '';

    if (isAdmin) {
      canDelete = true; // المسؤول يمكنه حذف أي مشروع
    } else if (isOwner && !hasLinkedData) {
      canDelete = true; // المالك يمكنه حذف مشروعه فقط إذا لم تكن هناك بيانات مرتبطة
    } else if (!isOwner) {
      deleteBlockReason = 'لا يمكنك حذف مشروع لم تقم بإنشائه';
    } else if (hasLinkedData) {
      deleteBlockReason = 'لا يمكنك حذف مشروع يحتوي على بيانات مرتبطة - تواصل مع المسؤول';
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب إحصائيات الحذف في ${duration}ms:`, { totalLinkedRecords, canDelete });

    res.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          engineerId: project.engineerId
        },
        stats,
        totalLinkedRecords,
        hasLinkedData,
        canDelete,
        deleteBlockReason,
        userRole: user?.role || 'user',
        isOwner
      },
      message: canDelete
        ? `يمكن حذف المشروع "${project.name}" - سيتم حذف ${totalLinkedRecords} سجل مرتبط`
        : deleteBlockReason,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب إحصائيات الحذف:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات الحذف',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 🗑️ حذف مشروع
 * DELETE /api/projects/:id
 * يتطلب صلاحية مسؤول (admin) أو مالك المشروع (بدون بيانات مرتبطة)
 */
projectRouter.delete('/:id', requireProjectAccess('delete'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const project_id = req.params.id;
    const user = req.user as any;
    const { confirmDeletion } = req.body || {};

    console.log('❌ [API] طلب حذف المشروع من المستخدم:', user?.email, 'الصلاحية:', user?.role);
    console.log('📋 [API] ID المشروع المراد حذفه:', project_id);

    if (!project_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        message: 'لم يتم توفير معرف المشروع للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود المشروع أولاً وجلب بياناته
    const existingProject = await db.select().from(projects).where(eq(projects.id, project_id)).limit(1);

    if (existingProject.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] المشروع غير موجود:', project_id);
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود',
        message: `لم يتم العثور على مشروع بالمعرف: ${project_id}`,
        processingTime: duration
      });
    }

    const projectToDelete = existingProject[0];

    // التحقق من الصلاحيات
    const isAdmin = user?.role === 'admin';
    const isOwner = projectToDelete.engineerId === user?.id;

    // التحقق أولاً: هل المستخدم مالك أو مسؤول؟
    if (!isAdmin && !isOwner) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] محاولة حذف مشروع من غير مالكه:', { user_id: user?.id, projectOwner: projectToDelete.engineerId });
      return res.status(403).json({
        success: false,
        error: 'غير مصرح',
        message: 'لا يمكنك حذف مشروع لم تقم بإنشائه',
        processingTime: duration
      });
    }

    // جلب عدد البيانات المرتبطة من جميع الجداول (نفس الجداول في deletion-stats)
    const [
      ftCount, waCount, mpCount, teCount, wtCount, wmCount,
      dsCount, ptFromCount, ptToCount, wbCount, spCount
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(fundTransfers).where(eq(fundTransfers.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerAttendance).where(eq(workerAttendance.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(materialPurchases).where(eq(materialPurchases.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(transportationExpenses).where(eq(transportationExpenses.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerTransfers).where(eq(workerTransfers.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerMiscExpenses).where(eq(workerMiscExpenses.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(dailyExpenseSummaries).where(eq(dailyExpenseSummaries.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(projectFundTransfers).where(eq(projectFundTransfers.fromProjectId, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(projectFundTransfers).where(eq(projectFundTransfers.toProjectId, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(workerBalances).where(eq(workerBalances.project_id, project_id)),
      db.select({ count: sql<number>`count(*)` }).from(supplierPayments).where(eq(supplierPayments.project_id, project_id))
    ]);

    const totalLinked = Number(ftCount[0]?.count || 0) + Number(waCount[0]?.count || 0) +
                       Number(mpCount[0]?.count || 0) + Number(teCount[0]?.count || 0) +
                       Number(wtCount[0]?.count || 0) + Number(wmCount[0]?.count || 0) +
                       Number(dsCount[0]?.count || 0) + Number(ptFromCount[0]?.count || 0) +
                       Number(ptToCount[0]?.count || 0) + Number(wbCount[0]?.count || 0) +
                       Number(spCount[0]?.count || 0);

    const hasLinkedData = totalLinked > 0;

    // للمستخدم العادي: رفض الحذف إذا كانت هناك بيانات مرتبطة
    if (!isAdmin && hasLinkedData) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] محاولة حذف مشروع يحتوي على بيانات من مستخدم عادي:', { totalLinked });
      return res.status(403).json({
        success: false,
        error: 'غير مصرح',
        message: `لا يمكنك حذف مشروع يحتوي على ${totalLinked} سجل مرتبط - تواصل مع المسؤول`,
        processingTime: duration
      });
    }

    // للمسؤول: التحقق من تأكيد الحذف إذا كانت هناك بيانات مرتبطة
    if (isAdmin && hasLinkedData && !confirmDeletion) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'تأكيد الحذف مطلوب',
        message: `يرجى تأكيد حذف المشروع مع ${totalLinked} سجل مرتبط`,
        requireConfirmation: true,
        totalLinkedRecords: totalLinked,
        processingTime: duration
      });
    }

    console.log('🗑️ [API] سيتم حذف المشروع:', {
      id: projectToDelete.id,
      name: projectToDelete.name,
      status: projectToDelete.status,
      deletedBy: user?.email,
      isAdmin
    });

    // حذف المشروع من قاعدة البيانات (CASCADE سيحذف البيانات المرتبطة تلقائياً)
    console.log('🗑️ [API] حذف المشروع من قاعدة البيانات...');
    const deletedProject = await db
      .delete(projects)
      .where(eq(projects.id, project_id))
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف المشروع بنجاح في ${duration}ms:`, {
      id: deletedProject[0].id,
      name: deletedProject[0].name,
      status: deletedProject[0].status,
      deletedBy: user?.email
    });

    res.json({
      success: true,
      data: deletedProject[0],
      message: `تم حذف المشروع "${deletedProject[0].name}" وجميع البيانات المرتبطة بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف المشروع:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في حذف المشروع';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'لا يمكن حذف المشروع - مرتبط ببيانات أخرى (عمال، مواد، مصروفات)';
      statusCode = 409;
    } else if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف المشروع غير صحيح';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 مسارات فرعية للمشروع
 * Project sub-routes
 */

/**
 * 📊 جلب تحويلات العهدة من جميع المشاريع
 * GET /api/projects/all/fund-transfers
 */
projectRouter.get('/all/fund-transfers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('📊 [API] جلب تحويلات العهدة من جميع المشاريع');

    const transfers = await db.select({
      id: fundTransfers.id,
      project_id: fundTransfers.project_id,
      amount: fundTransfers.amount,
      senderName: fundTransfers.senderName,
      transferNumber: fundTransfers.transferNumber,
      transferType: fundTransfers.transferType,
      transferDate: fundTransfers.transferDate,
      notes: fundTransfers.notes,
      created_at: fundTransfers.created_at,
      projectName: projects.name
    })
    .from(fundTransfers)
    .leftJoin(projects, eq(fundTransfers.project_id, projects.id))
    .orderBy(desc(fundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل عهدة من جميع المشاريع في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل عهدة بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب تحويلات العهدة من جميع المشاريع:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب تحويلات العهدة لمشروع محدد
 * GET /api/projects/:project_id/fund-transfers
 */
projectRouter.get('/:project_id/fund-transfers', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📊 [API] جلب تحويلات العهدة للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const transfers = await db.select({
      id: fundTransfers.id,
      project_id: fundTransfers.project_id,
      amount: fundTransfers.amount,
      senderName: fundTransfers.senderName,
      transferNumber: fundTransfers.transferNumber,
      transferType: fundTransfers.transferType,
      transferDate: fundTransfers.transferDate,
      notes: fundTransfers.notes,
      created_at: fundTransfers.created_at,
      projectName: projects.name
    })
    .from(fundTransfers)
    .leftJoin(projects, eq(fundTransfers.project_id, projects.id))
    .where(eq(fundTransfers.project_id, project_id))
    .orderBy(desc(fundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل عهدة في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل عهدة للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب تحويلات العهدة:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب حضور العمال لمشروع محدد
 * GET /api/projects/:project_id/worker-attendance
 */
projectRouter.get('/:project_id/worker-attendance', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;
    const { date } = req.query;

    console.log(`📊 [API] جلب حضور العمال للمشروع: ${project_id}${date ? ` للتاريخ: ${date}` : ''}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    // بناء شروط الـ WHERE
    const conditions = [eq(workerAttendance.project_id, project_id)];
    if (date && date !== '') {
      conditions.push(eq(workerAttendance.date, date as string));
      console.log(`🔍 [API] تطبيق فلترة التاريخ: ${date}`);
    }

    const attendance = await db.select({
      id: workerAttendance.id,
      worker_id: workerAttendance.worker_id,
      project_id: workerAttendance.project_id,
      date: workerAttendance.date,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      isPresent: workerAttendance.isPresent,
      created_at: workerAttendance.created_at,
      workerName: workers.name
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
    .where(and(...conditions))
    .orderBy(workerAttendance.date);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);

    res.json({
      success: true,
      data: attendance,
      message: `تم جلب ${attendance.length} سجل حضور للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب حضور العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب مشتريات المواد لمشروع محدد
 * GET /api/projects/:project_id/material-purchases
 */
projectRouter.get('/:project_id/material-purchases', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📊 [API] جلب مشتريات المواد للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const isAllProjects = project_id === 'all';
    const { date } = req.query;

    let purchases;
    if (isAllProjects) {
      // جلب جميع المشتريات مع اسم المشروع
      let query = db.select({
        id: materialPurchases.id,
        project_id: materialPurchases.project_id,
        projectName: projects.name,
        supplier_id: materialPurchases.supplier_id,
        materialName: materialPurchases.materialName,
        materialCategory: materialPurchases.materialCategory,
        materialUnit: materialPurchases.materialUnit,
        quantity: materialPurchases.quantity,
        unit: materialPurchases.unit,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        paidAmount: materialPurchases.paidAmount,
        remainingAmount: materialPurchases.remainingAmount,
        supplierName: materialPurchases.supplierName,
        receiptNumber: materialPurchases.receiptNumber,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        dueDate: materialPurchases.dueDate,
        invoicePhoto: materialPurchases.invoicePhoto,
        notes: materialPurchases.notes,
        purchaseDate: materialPurchases.purchaseDate,
        created_at: materialPurchases.created_at,
      })
        .from(materialPurchases)
        .leftJoin(projects, eq(materialPurchases.project_id, projects.id));
      
      if (date) {
        query = query.where(eq(materialPurchases.purchaseDate, date as string)) as any;
      }
      
      purchases = await query.orderBy(desc(materialPurchases.purchaseDate));
    } else {
      // جلب مشتريات مشروع محدد مع اسم المشروع
      let query = db.select({
        id: materialPurchases.id,
        project_id: materialPurchases.project_id,
        projectName: projects.name,
        supplier_id: materialPurchases.supplier_id,
        materialName: materialPurchases.materialName,
        materialCategory: materialPurchases.materialCategory,
        materialUnit: materialPurchases.materialUnit,
        quantity: materialPurchases.quantity,
        unit: materialPurchases.unit,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        paidAmount: materialPurchases.paidAmount,
        remainingAmount: materialPurchases.remainingAmount,
        supplierName: materialPurchases.supplierName,
        receiptNumber: materialPurchases.receiptNumber,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        dueDate: materialPurchases.dueDate,
        invoicePhoto: materialPurchases.invoicePhoto,
        notes: materialPurchases.notes,
        purchaseDate: materialPurchases.purchaseDate,
        created_at: materialPurchases.created_at,
      })
        .from(materialPurchases)
        .leftJoin(projects, eq(materialPurchases.project_id, projects.id));
      
      const conditions = [eq(materialPurchases.project_id, project_id)];
      if (date) {
        conditions.push(eq(materialPurchases.purchaseDate, date as string));
      }
      
      purchases = await query.where(and(...conditions)).orderBy(desc(materialPurchases.purchaseDate));
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${purchases.length} مشترية مواد في ${duration}ms`);

    res.json({
      success: true,
      data: purchases,
      message: `تم جلب ${purchases.length} مشترية مواد للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب مشتريات المواد:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message || error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب مشتريات المواد (مسار عام مع فلاتر)
 * GET /api/material-purchases
 */
projectRouter.get('/material-purchases-unified', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;
    console.log('📊 [API] جلب مشتريات المواد الموحد:', { project_id, date });

    let query = db.select({
      id: materialPurchases.id,
      project_id: materialPurchases.project_id,
      projectName: projects.name,
      supplier_id: materialPurchases.supplier_id,
      materialName: materialPurchases.materialName,
      materialCategory: materialPurchases.materialCategory,
      materialUnit: materialPurchases.materialUnit,
      quantity: materialPurchases.quantity,
      unit: materialPurchases.unit,
      unitPrice: materialPurchases.unitPrice,
      totalAmount: materialPurchases.totalAmount,
      purchaseType: materialPurchases.purchaseType,
      paidAmount: materialPurchases.paidAmount,
      remainingAmount: materialPurchases.remainingAmount,
      supplierName: materialPurchases.supplierName,
      receiptNumber: materialPurchases.receiptNumber,
      invoiceNumber: materialPurchases.invoiceNumber,
      invoiceDate: materialPurchases.invoiceDate,
      dueDate: materialPurchases.dueDate,
      invoicePhoto: materialPurchases.invoicePhoto,
      notes: materialPurchases.notes,
      purchaseDate: materialPurchases.purchaseDate,
      created_at: materialPurchases.created_at,
    })
    .from(materialPurchases)
    .leftJoin(projects, eq(materialPurchases.project_id, projects.id));

    const conditions = [];
    if (project_id && project_id !== 'all') {
      conditions.push(eq(materialPurchases.project_id, project_id as string));
    }
    // تعديل: لا نطبق فلترة التاريخ إذا كانت القيمة فارغة أو غير موجودة
    if (date && date !== "" && date !== "undefined") {
      conditions.push(eq(materialPurchases.purchaseDate, date as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const purchases = await query.orderBy(desc(materialPurchases.purchaseDate));

    res.json({
      success: true,
      data: purchases,
      message: `تم جلب ${purchases.length} سجل`,
      processingTime: Date.now() - startTime
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

    /**
     * POST /api/projects/:project_id/material-purchases
     * إضافة مشترية مواد لمشروع محدد
     */
    projectRouter.post('/:project_id/material-purchases', requireProjectAccess('add'), async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const { project_id } = req.params;
        const body = { ...req.body, project_id };

        // Validation
        const validationResult = insertMaterialPurchaseSchema.safeParse(body);
        if (!validationResult.success) {
          console.error('❌ [API] فشل في validation مشتريات المواد:', validationResult.error.flatten());
          return res.status(400).json({
            success: false,
            error: 'بيانات غير صحيحة',
            details: validationResult.error.flatten().fieldErrors,
            processingTime: Date.now() - startTime
          });
        }

        const purchaseData = {
          ...validationResult.data,
          unitPrice: validationResult.data.unitPrice || "0",
          totalAmount: validationResult.data.totalAmount || "0"
        };

        const newPurchase = await db.insert(materialPurchases).values(purchaseData).returning();
        
        res.status(201).json({
          success: true,
          data: newPurchase[0],
          message: 'تمت إضافة المشتريات بنجاح',
          processingTime: Date.now() - startTime
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });

    /**
     * 📊 جلب مصاريف النقل لمشروع محدد
     * GET /api/projects/:project_id/transportation-expenses
     */
    projectRouter.get('/:project_id/transportation-expenses', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📊 [API] جلب مصاريف النقل للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const expenses = await db.select()
      .from(transportationExpenses)
      .where(eq(transportationExpenses.project_id, project_id))
      .orderBy(transportationExpenses.date);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${expenses.length} مصروف نقل في ${duration}ms`);

    res.json({
      success: true,
      data: expenses,
      message: `تم جلب ${expenses.length} مصروف نقل للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب مصاريف النقل:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب المصاريف المتنوعة للعمال لمشروع محدد
 * GET /api/projects/:project_id/worker-misc-expenses
 */
projectRouter.get('/:project_id/worker-misc-expenses', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📊 [API] جلب المصاريف المتنوعة للعمال للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const expenses = await db.select()
      .from(workerMiscExpenses)
      .where(eq(workerMiscExpenses.project_id, project_id))
      .orderBy(workerMiscExpenses.date);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${expenses.length} مصروف متنوع في ${duration}ms`);

    res.json({
      success: true,
      data: expenses,
      message: `تم جلب ${expenses.length} مصروف متنوع للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب المصاريف المتنوعة:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.error,
      processingTime: duration
    });
  }
});

/**
 * 🔄 جلب التحويلات الواردة لمشروع محدد (من مشاريع أخرى)
 * GET /api/project-fund-transfers?toProjectId=:project_id
 */
projectRouter.get('/fund-transfers/incoming/:project_id', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📥 [API] جلب التحويلات الواردة للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const transfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      transferDate: projectFundTransfers.transferDate,
      description: projectFundTransfers.description,
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.toProjectId, project_id))
    .orderBy(desc(projectFundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل وارد في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل وارد بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب التحويلات الواردة:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب التحويلات الواردة',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 🔄 جلب التحويلات الصادرة لمشروع محدد (إلى مشاريع أخرى)
 * GET /api/project-fund-transfers?fromProjectId=:project_id
 */
projectRouter.get('/fund-transfers/outgoing/:project_id', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📤 [API] جلب التحويلات الصادرة للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const transfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      transferDate: projectFundTransfers.transferDate,
      description: projectFundTransfers.description,
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.fromProjectId, project_id))
    .orderBy(desc(projectFundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} تحويل صادر في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} تحويل صادر بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب التحويلات الصادرة:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب التحويلات الصادرة',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب حوالات العمال لمشروع محدد
 * GET /api/projects/:project_id/worker-transfers
 */
projectRouter.get('/:project_id/worker-transfers', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📊 [API] جلب حوالات العمال للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const transfers = await db.select({
      id: workerTransfers.id,
      worker_id: workerTransfers.worker_id,
      project_id: workerTransfers.project_id,
      amount: workerTransfers.amount,
      recipientName: workerTransfers.recipientName,
      recipientPhone: workerTransfers.recipientPhone,
      transferMethod: workerTransfers.transferMethod,
      transferNumber: workerTransfers.transferNumber,
      transferDate: workerTransfers.transferDate,
      notes: workerTransfers.notes,
      created_at: workerTransfers.created_at,
      workerName: workers.name
    })
    .from(workerTransfers)
    .leftJoin(workers, eq(workerTransfers.worker_id, workers.id))
    .where(eq(workerTransfers.project_id, project_id))
    .orderBy(workerTransfers.transferDate);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${transfers.length} حولة عمال في ${duration}ms`);

    res.json({
      success: true,
      data: transfers,
      message: `تم جلب ${transfers.length} حولة عمال للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب حوالات العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.error,
      processingTime: duration
    });
  }
});

/**
 * 🔍 جلب التحويلات الحقيقية بين المشاريع (للتشخيص)
 * GET /api/projects/:project_id/actual-transfers
 */
projectRouter.get('/:project_id/actual-transfers', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`🔍 [API] جلب التحويلات الحقيقية للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    // جلب التحويلات الواردة الحقيقية
    const incomingTransfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      created_at: projectFundTransfers.created_at,
      direction: sql`'incoming'`.as('direction'),
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.toProjectId, project_id))
    .orderBy(desc(projectFundTransfers.transferDate));

    // جلب التحويلات الصادرة الحقيقية
    const outgoingTransfers = await db.select({
      id: projectFundTransfers.id,
      fromProjectId: projectFundTransfers.fromProjectId,
      toProjectId: projectFundTransfers.toProjectId,
      amount: projectFundTransfers.amount,
      description: projectFundTransfers.description,
      transferReason: projectFundTransfers.transferReason,
      transferDate: projectFundTransfers.transferDate,
      created_at: projectFundTransfers.created_at,
      direction: sql`'outgoing'`.as('direction'),
      fromProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.fromProjectId})`,
      toProjectName: sql`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`
    })
    .from(projectFundTransfers)
    .where(eq(projectFundTransfers.fromProjectId, project_id))
    .orderBy(desc(projectFundTransfers.transferDate));

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${incomingTransfers.length} تحويل وارد و ${outgoingTransfers.length} تحويل صادر في ${duration}ms`);

    res.json({
      success: true,
      data: {
        incoming: incomingTransfers,
        outgoing: outgoingTransfers,
        summary: {
          totalIncoming: incomingTransfers.length,
          totalOutgoing: outgoingTransfers.length,
          incomingAmount: incomingTransfers.reduce((sum: any, t: any) => sum + parseFloat(t.amount), 0),
          outgoingAmount: outgoingTransfers.reduce((sum: any, t: any) => sum + parseFloat(t.amount), 0)
        }
      },
      message: `تم جلب ${incomingTransfers.length + outgoingTransfers.length} تحويل حقيقي للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب التحويلات الحقيقية:', error);
    res.status(500).json({
      success: false,
      data: { incoming: [], outgoing: [], summary: {} },
      error: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب الملخص اليومي للمشروع - جلب الملخص المالي ليوم محدد
 * GET /api/projects/:id/daily-summary/:date
 */
projectRouter.get('/:id/daily-summary/:date', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { id: project_id, date } = req.params;

    console.log(`📊 [API] طلب جلب الملخص اليومي للمشروع من المستخدم: ${req.user?.email}`);
    console.log(`📋 [API] معاملات الطلب: project_id=${project_id}, date=${date}`);

    // Validation للمعاملات
    if (!project_id || !date) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] معاملات مطلوبة مفقودة:', { project_id, date });
      return res.status(400).json({
        success: false,
        error: 'معاملات مطلوبة مفقودة',
        message: 'معرف المشروع والتاريخ مطلوبان',
        processingTime: duration
      });
    }

    // تحويل صيغة ISO إلى YYYY-MM-DD
    let normalizedDate = date;
    if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
      normalizedDate = date.split('T')[0];
    }
    
    // التحقق من صحة تنسيق التاريخ (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(normalizedDate)) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] تنسيق التاريخ غير صحيح:', date);
      return res.status(400).json({
        success: false,
        error: 'تنسيق التاريخ غير صحيح',
        message: 'يجب أن يكون التاريخ بصيغة YYYY-MM-DD',
        processingTime: duration
      });
    }
    
    // التحقق من وجود المشروع أولاً
    console.log('🔍 [API] التحقق من وجود المشروع...');
    const projectExists = await db.select().from(projects).where(eq(projects.id, project_id)).limit(1);

    if (projectExists.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] المشروع غير موجود:', project_id);
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود',
        message: `لم يتم العثور على مشروع بالمعرف: ${project_id}`,
        processingTime: duration
      });
    }

    // محاولة جلب البيانات من Materialized View أولاً (للأداء الأفضل)
    console.log('💾 [API] جلب الملخص اليومي من قاعدة البيانات...');
    let dailySummary = null;

    try {
      // محاولة استخدام Materialized View للأداء الأفضل
      console.log('⚡ [API] محاولة جلب البيانات من daily_summary_mv...');
      const mvResult = await db.execute(sql`
        SELECT
          id,
          project_id,
          summary_date,
          carried_forward_amount,
          total_fund_transfers,
          total_worker_wages,
          total_material_costs,
          total_transportation_expenses,
          total_worker_transfers,
          total_worker_misc_expenses,
          total_income,
          total_expenses,
          remaining_balance,
          notes,
          created_at,
          updated_at,
          project_name
        FROM daily_summary_mv
        WHERE project_id = ${project_id} AND summary_date = ${normalizedDate}
        LIMIT 1
      `);

      if (mvResult.rows && mvResult.rows.length > 0) {
        dailySummary = mvResult.rows[0];
        console.log('✅ [API] تم جلب البيانات من Materialized View بنجاح');
      }
    } catch (mvError) {
      console.log('⚠️ [API] Materialized View غير متاح، التبديل للجدول العادي...');
      // Fallback للجدول العادي
      const regularResult = await db.select({
        id: dailyExpenseSummaries.id,
        project_id: dailyExpenseSummaries.project_id,
        summary_date: dailyExpenseSummaries.date,
        carried_forward_amount: dailyExpenseSummaries.carriedForwardAmount,
        total_fund_transfers: dailyExpenseSummaries.totalFundTransfers,
        total_worker_wages: dailyExpenseSummaries.totalWorkerWages,
        total_material_costs: dailyExpenseSummaries.totalMaterialCosts,
        total_transportation_expenses: dailyExpenseSummaries.totalTransportationCosts,
        total_worker_transfers: sql`COALESCE(CAST(${dailyExpenseSummaries.totalWorkerTransfers} AS DECIMAL), 0)`,
        total_worker_misc_expenses: sql`COALESCE(CAST(${dailyExpenseSummaries.totalWorkerMiscExpenses} AS DECIMAL), 0)`,
        total_income: dailyExpenseSummaries.totalIncome,
        total_expenses: dailyExpenseSummaries.totalExpenses,
        remaining_balance: dailyExpenseSummaries.remainingBalance,
        notes: dailyExpenseSummaries.notes,
        created_at: dailyExpenseSummaries.created_at,
        updated_at: dailyExpenseSummaries.updated_at,
        project_name: projects.name
      })
      .from(dailyExpenseSummaries)
      .leftJoin(projects, eq(dailyExpenseSummaries.project_id, projects.id))
      .where(and(
        eq(dailyExpenseSummaries.project_id, project_id),
        eq(dailyExpenseSummaries.date, normalizedDate)
      ))
      .limit(1);

      if (regularResult.length > 0) {
        dailySummary = regularResult[0];
        console.log('✅ [API] تم جلب البيانات من الجدول العادي بنجاح');
      }
    }

    const duration = Date.now() - startTime;

    if (!dailySummary) {
      console.log(`📭 [API] لا توجد بيانات ملخص يومي للمشروع ${project_id} في تاريخ ${date} - إرجاع بيانات فارغة`);
      // ✅ إصلاح: إرجاع بيانات فارغة بدلاً من 404
      return res.json({
        success: true,
        data: {
          id: null,
          project_id,
          date,
          totalIncome: 0,
          totalExpenses: 0,
          remainingBalance: 0,
          notes: null,
          isEmpty: true,
          message: `لا يوجد ملخص مالي محفوظ للمشروع في تاريخ ${date}`
        },
        processingTime: duration,
        metadata: {
          project_id,
          date,
          projectName: projectExists[0].name,
          isEmptyResult: true
        }
      });
    }

    // تنسيق البيانات للإرجاع
    const formattedSummary = {
      id: dailySummary.id,
      project_id: dailySummary.project_id,
      projectName: dailySummary.project_name || projectExists[0].name,
      date: dailySummary.summary_date || date,
      financialSummary: {
        carriedForwardAmount: parseFloat(String(dailySummary.carried_forward_amount || '0')),
        totalFundTransfers: parseFloat(String(dailySummary.total_fund_transfers || '0')),
        totalWorkerWages: parseFloat(String(dailySummary.total_worker_wages || '0')),
        totalMaterialCosts: parseFloat(String(dailySummary.total_material_costs || '0')),
        totalTransportationExpenses: parseFloat(String(dailySummary.total_transportation_expenses || '0')),
        totalWorkerTransfers: parseFloat(String(dailySummary.total_worker_transfers || '0')),
        totalWorkerMiscExpenses: parseFloat(String(dailySummary.total_worker_misc_expenses || '0')),
        totalIncome: parseFloat(String(dailySummary.total_income || '0')),
        totalExpenses: parseFloat(String(dailySummary.total_expenses || '0')),
        remainingBalance: parseFloat(String(dailySummary.remaining_balance || '0'))
      },
      notes: String(dailySummary.notes || ''),
      created_at: dailySummary.created_at,
      updated_at: dailySummary.updated_at || dailySummary.created_at
    };

    console.log(`✅ [API] تم جلب الملخص اليومي بنجاح في ${duration}ms:`, {
      project_id,
      projectName: formattedSummary.projectName,
      date,
      totalIncome: formattedSummary.financialSummary.totalIncome,
      totalExpenses: formattedSummary.financialSummary.totalExpenses,
      remainingBalance: formattedSummary.financialSummary.remainingBalance
    });

    res.json({
      success: true,
      data: formattedSummary,
      message: `تم جلب الملخص المالي للمشروع "${formattedSummary.projectName}" في تاريخ ${date} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب الملخص اليومي:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في جلب الملخص اليومي';
    let statusCode = 500;

    if (error.code === '42P01') { // relation does not exist
      errorMessage = 'جدول الملخصات اليومية غير موجود';
      statusCode = 503;
    } else if (error.code === '22008') { // invalid date format
      errorMessage = 'تنسيق التاريخ غير صحيح';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      data: null,
      error: errorMessage,
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب المصاريف اليومية للمشروع
 * GET /api/projects/:project_id/daily-expenses/:date
 */
projectRouter.get('/:project_id/daily-expenses/:date', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.params;

    console.log(`📊 [API] طلب جلب المصروفات اليومية: project_id=${project_id}, date=${date}`);

    // التحقق من صحة المعاملات
    if (!project_id || !date) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معاملات مطلوبة مفقودة',
        message: 'معرف المشروع والتاريخ مطلوبان',
        processingTime: duration
      });
    }

    // تحويل صيغة ISO إلى YYYY-MM-DD
    let normalizedDate = date;
    if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
      normalizedDate = date.split('T')[0];
    }
    
    // التحقق من تنسيق التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(normalizedDate)) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'تنسيق التاريخ غير صحيح',
        message: 'يجب أن يكون التاريخ بصيغة YYYY-MM-DD',
        processingTime: duration
      });
    }
    
    // استخدام التاريخ المحول - Fix: Use finalDate to avoid assignment to constant
    const finalDate = normalizedDate;

    // جلب جميع البيانات المطلوبة
    const [
      fundTransfersResult,
      workerAttendanceResult,
      materialPurchasesResult,
      transportationResult,
      workerTransfersResult,
      miscExpensesResult,
      projectInfo,
      supplierPaymentsResult,
      projectFundTransfersOutResult,
      projectFundTransfersInResult
    ] = await Promise.all([
      db.select().from(fundTransfers)
        .where(and(eq(fundTransfers.project_id, project_id), gte(sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END)`, sql`${finalDate}::date`), lt(sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END)`, sql`(${finalDate}::date + interval '1 day')`))),
      db.select({
        id: workerAttendance.id,
        worker_id: workerAttendance.worker_id,
        project_id: workerAttendance.project_id,
        date: workerAttendance.date,
        paidAmount: workerAttendance.paidAmount,
        actualWage: workerAttendance.actualWage,
        workDays: workerAttendance.workDays,
        workerName: workers.name
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
      .where(and(
        eq(workerAttendance.project_id, project_id), 
        eq(workerAttendance.date, finalDate),
        or(
          sql`CAST(${workerAttendance.workDays} AS DECIMAL) > 0`,
          sql`CAST(${workerAttendance.paidAmount} AS DECIMAL) > 0`
        )
      )),
      db.select().from(materialPurchases)
        .where(and(eq(materialPurchases.project_id, project_id), eq(materialPurchases.purchaseDate, finalDate))),
      db.select().from(transportationExpenses)
        .where(and(eq(transportationExpenses.project_id, project_id), eq(transportationExpenses.date, finalDate))),
      db.select().from(workerTransfers)
        .where(and(eq(workerTransfers.project_id, project_id), eq(workerTransfers.transferDate, finalDate))),
      db.select().from(workerMiscExpenses)
        .where(and(eq(workerMiscExpenses.project_id, project_id), eq(workerMiscExpenses.date, finalDate))),
      db.select().from(projects).where(eq(projects.id, project_id)).limit(1),
      db.select().from(supplierPayments)
        .where(and(eq(supplierPayments.project_id, project_id), eq(supplierPayments.paymentDate, finalDate))),
      db.select().from(projectFundTransfers)
        .where(and(eq(projectFundTransfers.fromProjectId, project_id), eq(projectFundTransfers.transferDate, finalDate))),
      db.select().from(projectFundTransfers)
        .where(and(eq(projectFundTransfers.toProjectId, project_id), eq(projectFundTransfers.transferDate, finalDate)))
    ]);

    // حساب المجاميع
    const totalFundTransfers = fundTransfersResult.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
    const totalWorkerWages = workerAttendanceResult.reduce((sum: number, w: any) => sum + parseFloat(w.paidAmount || '0'), 0);
    const totalMaterialCosts = materialPurchasesResult.reduce((sum: number, m: any) => sum + parseFloat(m.totalAmount || '0'), 0);
    const totalTransportation = transportationResult.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
    const totalWorkerTransfers = workerTransfersResult.reduce((sum: number, w: any) => sum + parseFloat(w.amount || '0'), 0);
    const totalMiscExpenses = miscExpensesResult.reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);
    const totalSupplierPayments = supplierPaymentsResult.reduce((sum: number, s: any) => sum + parseFloat(s.amount || '0'), 0);

    const totalIncome = totalFundTransfers;
    const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses + totalSupplierPayments;

    // 💰 جلب الرصيد المرحل من اليوم السابق
    let carriedForward = 0;
    let carriedForwardSource = 'none';

    try {
      console.log(`💰 [API] حساب الرصيد المرحل لتاريخ: ${finalDate}`);

      // حساب التاريخ السابق - تحويل محلي آمن
      const [cfYear, cfMonth, cfDay] = finalDate.split('-').map(Number);
      const previousDate2 = new Date(cfYear, cfMonth - 1, cfDay - 1);
      const previousDateStr = `${previousDate2.getFullYear()}-${String(previousDate2.getMonth() + 1).padStart(2, '0')}-${String(previousDate2.getDate()).padStart(2, '0')}`;

      console.log(`💰 [API] البحث عن الرصيد المتبقي ليوم: ${previousDateStr}`);

      // أولاً: محاولة العثور على أحدث ملخص محفوظ قبل التاريخ المطلوب
      const latestSummary = await db.select({
        remainingBalance: dailyExpenseSummaries.remainingBalance,
        date: dailyExpenseSummaries.date
      })
      .from(dailyExpenseSummaries)
      .where(and(
        eq(dailyExpenseSummaries.project_id, project_id),
        lt(dailyExpenseSummaries.date, finalDate)
      ))
      .orderBy(desc(dailyExpenseSummaries.date))
      .limit(1);

      if (latestSummary.length > 0) {
        const summaryDate = latestSummary[0].date;
        const summaryBalance = parseFloat(String(latestSummary[0].remainingBalance || '0'));

        // إذا كان الملخص الموجود هو لليوم السابق مباشرة، استخدمه
        if (summaryDate === previousDateStr) {
          carriedForward = summaryBalance;
          carriedForwardSource = 'summary';
          console.log(`💰 [API] تم العثور على ملخص لليوم السابق: ${carriedForward}`);
        } else {
          // إذا كان الملخص لتاريخ أقدم، احسب من ذلك التاريخ إلى اليوم السابق
          console.log(`💰 [API] آخر ملخص محفوظ في ${summaryDate}, حساب تراكمي إلى ${previousDateStr}`);

          const [sf2Year, sf2Month, sf2Day] = String(summaryDate).split('-').map(Number);
          const startFromDate2 = new Date(sf2Year, sf2Month - 1, sf2Day + 1);
          const startFromStr = `${startFromDate2.getFullYear()}-${String(startFromDate2.getMonth() + 1).padStart(2, '0')}-${String(startFromDate2.getDate()).padStart(2, '0')}`;

          // حساب تراكمي من startFromStr إلى previousDateStr
          const cumulativeBalance = await calculateCumulativeBalance(project_id, startFromStr, previousDateStr);
          carriedForward = summaryBalance + cumulativeBalance;
          carriedForwardSource = 'computed-from-summary';
          console.log(`💰 [API] رصيد تراكمي من ${summaryDate} (${summaryBalance}) + ${cumulativeBalance} = ${carriedForward}`);
        }
      } else {
        // لا يوجد ملخص محفوظ، حساب تراكمي من البداية
        console.log(`💰 [API] لا يوجد ملخص محفوظ، حساب تراكمي من البداية`);
        carriedForward = await calculateCumulativeBalance(project_id, null, previousDateStr);
        carriedForwardSource = 'computed-full';
        console.log(`💰 [API] رصيد تراكمي كامل: ${carriedForward}`);
      }
    } catch (error) {
      console.warn(`⚠️ [API] خطأ في حساب الرصيد المرحل، استخدام القيمة الافتراضية 0:`, error);
      carriedForward = 0;
      carriedForwardSource = 'error';
    }

    // 💡 الحساب الصحيح: الرصيد المرحل + الدخل - المصروفات
    const remainingBalance = carriedForward + totalIncome - totalExpenses;

    const allProjectIds = new Set<string>();
    for (const r of projectFundTransfersOutResult) { if (r.toProjectId) allProjectIds.add(r.toProjectId); }
    for (const r of projectFundTransfersInResult) { if (r.fromProjectId) allProjectIds.add(r.fromProjectId); }
    const projectNameMap: Record<string, string> = {};
    if (allProjectIds.size > 0) {
      try {
        const pRows = await db.select({ id: projects.id, name: projects.name }).from(projects)
          .where(sql`${projects.id} IN (${sql.join([...allProjectIds].map(id => sql`${id}`), sql`, `)})`);
        for (const p of pRows) { projectNameMap[p.id] = p.name; }
      } catch (_) {}
    }

    const fundTransfersOut = projectFundTransfersOutResult.map((r: any) => ({
      ...r,
      _toProjectName: projectNameMap[r.toProjectId] || r.toProjectId,
    }));
    const fundTransfersIn = projectFundTransfersInResult.map((r: any) => ({
      ...r,
      _fromProjectName: projectNameMap[r.fromProjectId] || r.fromProjectId,
    }));

    const responseData = {
      date: finalDate,
      projectName: projectInfo[0]?.name || 'مشروع غير معروف',
      project_id,
      carriedForward: parseFloat(carriedForward.toFixed(2)),
      carriedForwardSource,
      totalIncome,
      totalExpenses,
      remainingBalance: parseFloat(remainingBalance.toFixed(2)),
      fundTransfers: fundTransfersResult,
      workerAttendance: workerAttendanceResult,
      materialPurchases: materialPurchasesResult,
      transportationExpenses: transportationResult,
      workerTransfers: workerTransfersResult,
      miscExpenses: miscExpensesResult,
      supplierPayments: supplierPaymentsResult,
      projectFundTransfersOut: fundTransfersOut,
      projectFundTransfersIn: fundTransfersIn
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب المصروفات اليومية بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: responseData,
      message: `تم جلب المصروفات اليومية لتاريخ ${finalDate} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب المصروفات اليومية:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب المصروفات اليومية',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب جميع المصاريف للمشروع (مجمعة حسب التاريخ)
 * GET /api/projects/:project_id/all-expenses
 */
projectRouter.get('/:project_id/all-expenses', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.params;

    console.log(`📊 [API] طلب جلب جميع المصروفات: project_id=${project_id}`);

    if (!project_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: duration
      });
    }

    // جلب جميع البيانات بدون فلترة بالتاريخ
    const [
      fundTransfersResult,
      workerAttendanceResult,
      materialPurchasesResult,
      transportationResult,
      workerTransfersResult,
      miscExpensesResult,
      projectInfo
    ] = await Promise.all([
      db.select().from(fundTransfers)
        .where(eq(fundTransfers.project_id, project_id))
        .orderBy(desc(fundTransfers.transferDate)),
      db.select({
        id: workerAttendance.id,
        worker_id: workerAttendance.worker_id,
        project_id: workerAttendance.project_id,
        date: workerAttendance.date,
        paidAmount: workerAttendance.paidAmount,
        actualWage: workerAttendance.actualWage,
        workDays: workerAttendance.workDays,
        workerName: workers.name
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
      .where(and(
        eq(workerAttendance.project_id, project_id),
        or(
          sql`CAST(${workerAttendance.workDays} AS DECIMAL) > 0`,
          sql`CAST(${workerAttendance.paidAmount} AS DECIMAL) > 0`
        )
      ))
      .orderBy(desc(workerAttendance.date)),
      db.select().from(materialPurchases)
        .where(eq(materialPurchases.project_id, project_id))
        .orderBy(desc(materialPurchases.purchaseDate)),
      db.select().from(transportationExpenses)
        .where(eq(transportationExpenses.project_id, project_id))
        .orderBy(desc(transportationExpenses.date)),
      db.select().from(workerTransfers)
        .where(eq(workerTransfers.project_id, project_id))
        .orderBy(desc(workerTransfers.transferDate)),
      db.select().from(workerMiscExpenses)
        .where(eq(workerMiscExpenses.project_id, project_id))
        .orderBy(desc(workerMiscExpenses.date)),
      db.select().from(projects).where(eq(projects.id, project_id)).limit(1)
    ]);

    const projectName = projectInfo[0]?.name || 'مشروع غير معروف';

    // دالة استخراج التاريخ من أي سجل
    const extractDate = (record: any): string => {
      const dateField = record.transferDate || record.purchaseDate || record.date;
      if (!dateField) return 'unknown';
      if (typeof dateField === 'string') return dateField.split('T')[0];
      if (dateField instanceof Date) {
        return `${dateField.getFullYear()}-${String(dateField.getMonth() + 1).padStart(2, '0')}-${String(dateField.getDate()).padStart(2, '0')}`;
      }
      return String(dateField).split('T')[0];
    };

    // تجميع البيانات حسب التاريخ
    const dateGroups = new Map<string, {
      project_id: string;
      projectName: string;
      date: string;
      fundTransfers: any[];
      workerAttendance: any[];
      materialPurchases: any[];
      transportationExpenses: any[];
      workerTransfers: any[];
      miscExpenses: any[];
    }>();

    // تهيئة المجموعات لكل تاريخ
    const initDateGroup = (dateStr: string) => {
      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, {
          project_id,
          projectName,
          date: dateStr,
          fundTransfers: [],
          workerAttendance: [],
          materialPurchases: [],
          transportationExpenses: [],
          workerTransfers: [],
          miscExpenses: []
        });
      }
      return dateGroups.get(dateStr)!;
    };

    // تجميع تحويلات العهد حسب التاريخ
    fundTransfersResult.forEach((t: any) => {
      const dateStr = extractDate(t);
      const group = initDateGroup(dateStr);
      group.fundTransfers.push({ ...t, projectName });
    });

    // تجميع حضور العمال حسب التاريخ
    workerAttendanceResult.forEach((a: any) => {
      const dateStr = extractDate(a);
      const group = initDateGroup(dateStr);
      // التأكد من شمول من لديهم مبالغ مدفوعة أو أيام عمل
      if (parseFloat(a.workDays || '0') > 0 || parseFloat(a.paidAmount || '0') > 0) {
        group.workerAttendance.push({ ...a, projectName });
      }
    });

    // تجميع مشتريات المواد حسب التاريخ
    materialPurchasesResult.forEach((m: any) => {
      const dateStr = extractDate(m);
      const group = initDateGroup(dateStr);
      group.materialPurchases.push({ ...m, projectName });
    });

    // تجميع مصاريف النقل حسب التاريخ
    transportationResult.forEach((t: any) => {
      const dateStr = extractDate(t);
      const group = initDateGroup(dateStr);
      group.transportationExpenses.push({ ...t, projectName });
    });

    // تجميع تحويلات العمال حسب التاريخ
    workerTransfersResult.forEach((w: any) => {
      const dateStr = extractDate(w);
      const group = initDateGroup(dateStr);
      group.workerTransfers.push({ ...w, projectName });
    });

    // تجميع المصاريف المتنوعة حسب التاريخ
    miscExpensesResult.forEach((m: any) => {
      const dateStr = extractDate(m);
      const group = initDateGroup(dateStr);
      group.miscExpenses.push({ ...m, projectName });
    });

    // تحويل المجموعات إلى مصفوفة مع حساب الإجماليات لكل تاريخ
    const groupedByProjectDate = Array.from(dateGroups.values())
      .map(group => {
        const totalFundTransfers = group.fundTransfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
        const totalWorkerWages = group.workerAttendance.reduce((sum, w) => sum + parseFloat(w.paidAmount || '0'), 0);
        const totalMaterialCosts = group.materialPurchases.reduce((sum, m) => sum + parseFloat(m.totalAmount || '0'), 0);
        const totalTransportation = group.transportationExpenses.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
        const totalWorkerTransfers = group.workerTransfers.reduce((sum, w) => sum + parseFloat(w.amount || '0'), 0);
        const totalMiscExpenses = group.miscExpenses.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

        const totalIncome = totalFundTransfers;
        const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportation + totalWorkerTransfers + totalMiscExpenses;
        const remainingBalance = totalIncome - totalExpenses;

        return {
          ...group,
          totalIncome,
          totalExpenses,
          totalFundTransfers,
          totalWorkerWages,
          totalMaterialCosts,
          totalTransportation,
          totalWorkerTransfers,
          totalMiscExpenses,
          remainingBalance: parseFloat(remainingBalance.toFixed(2)),
          counts: {
            fundTransfers: group.fundTransfers.length,
            workerAttendance: group.workerAttendance.length,
            materialPurchases: group.materialPurchases.length,
            transportationExpenses: group.transportationExpenses.length,
            workerTransfers: group.workerTransfers.length,
            miscExpenses: group.miscExpenses.length
          }
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // ترتيب حسب التاريخ (الأحدث أولاً)

    // حساب الإجماليات العامة
    const overallTotalFundTransfers = fundTransfersResult.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
    const overallTotalWorkerWages = workerAttendanceResult.reduce((sum: number, w: any) => sum + parseFloat(w.paidAmount || '0'), 0);
    const overallTotalMaterialCosts = materialPurchasesResult.reduce((sum: number, m: any) => sum + parseFloat(m.totalAmount || '0'), 0);
    const overallTotalTransportation = transportationResult.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
    const overallTotalWorkerTransfers = workerTransfersResult.reduce((sum: number, w: any) => sum + parseFloat(w.amount || '0'), 0);
    const overallTotalMiscExpenses = miscExpensesResult.reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const overallTotalIncome = overallTotalFundTransfers;
    const overallTotalExpenses = overallTotalWorkerWages + overallTotalMaterialCosts + overallTotalTransportation + overallTotalWorkerTransfers + overallTotalMiscExpenses;
    const overallRemainingBalance = overallTotalIncome - overallTotalExpenses;

    const responseData = {
      // البيانات المجمعة حسب التاريخ (بطاقات متعددة)
      groupedByProjectDate,

      // الإجماليات العامة
      projectName,
      project_id,
      totalIncome: overallTotalIncome,
      totalExpenses: overallTotalExpenses,
      remainingBalance: parseFloat(overallRemainingBalance.toFixed(2)),

      // البيانات المسطحة (للتوافق مع الكود القديم)
      fundTransfers: fundTransfersResult.map((t: any) => ({ ...t, projectName })),
      workerAttendance: workerAttendanceResult.map((a: any) => ({ ...a, projectName })),
      materialPurchases: materialPurchasesResult.map((m: any) => ({ ...m, projectName })),
      transportationExpenses: transportationResult.map((t: any) => ({ ...t, projectName })),
      workerTransfers: workerTransfersResult.map((w: any) => ({ ...w, projectName })),
      miscExpenses: miscExpensesResult.map((m: any) => ({ ...m, projectName })),

      // إحصائيات
      totalCards: groupedByProjectDate.length,
      totalRecords: {
        fundTransfers: fundTransfersResult.length,
        workerAttendance: workerAttendanceResult.length,
        materialPurchases: materialPurchasesResult.length,
        transportationExpenses: transportationResult.length,
        workerTransfers: workerTransfersResult.length,
        miscExpenses: miscExpensesResult.length
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب جميع المصروفات بنجاح (${groupedByProjectDate.length} بطاقة) في ${duration}ms`);

    res.json({
      success: true,
      data: responseData,
      message: `تم جلب جميع المصروفات للمشروع بنجاح (${groupedByProjectDate.length} بطاقة)`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب جميع المصروفات:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في جلب جميع المصروفات',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 💰 جلب الرصيد المتبقي من اليوم السابق
 * GET /api/projects/:project_id/previous-balance/:date
 */
projectRouter.get('/:project_id/previous-balance/:date', requireProjectAccess('view'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.params;

    console.log(`💰 [API] طلب جلب الرصيد المتبقي من اليوم السابق: project_id=${project_id}, date=${date}`);

    // التحقق من صحة المعاملات
    if (!project_id || !date) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معاملات مطلوبة مفقودة',
        message: 'معرف المشروع والتاريخ مطلوبان',
        processingTime: duration
      });
    }

    // تحويل صيغة ISO إلى YYYY-MM-DD
    let normalizedDate = date;
    if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
      normalizedDate = date.split('T')[0];
    }
    
    // التحقق من تنسيق التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(normalizedDate)) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'تنسيق التاريخ غير صحيح',
        message: 'يجب أن يكون التاريخ بصيغة YYYY-MM-DD',
        processingTime: duration
      });
    }
    
    // استخدام التاريخ المحول - Fix: Use finalDate to avoid assignment to constant
    const finalDate = normalizedDate;

    // حساب التاريخ السابق - تحويل محلي آمن بدون toISOString لمنع انزياح المنطقة الزمنية
    const [year, month, day] = finalDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    const previousDate = new Date(year, month - 1, day - 1);
    const previousDateStr = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(previousDate.getDate()).padStart(2, '0')}`;

    console.log(`💰 [API] البحث عن الرصيد المتبقي ليوم: ${previousDateStr}`);

    let previousBalance = 0;
    let source = 'none';

    try {
      // أولاً: محاولة العثور على أحدث ملخص محفوظ قبل التاريخ المطلوب
      const latestSummary = await db.select({
        remainingBalance: dailyExpenseSummaries.remainingBalance,
        date: dailyExpenseSummaries.date
      })
      .from(dailyExpenseSummaries)
      .where(and(
        eq(dailyExpenseSummaries.project_id, project_id),
        lt(dailyExpenseSummaries.date, finalDate)
      ))
      .orderBy(desc(dailyExpenseSummaries.date))
      .limit(1);

      if (latestSummary.length > 0) {
        const summaryDate = latestSummary[0].date;
        const summaryBalance = parseFloat(String(latestSummary[0].remainingBalance || '0'));

        // إذا كان الملخص الموجود هو لليوم السابق مباشرة، استخدمه
        if (summaryDate === previousDateStr) {
          previousBalance = summaryBalance;
          source = 'summary';
          console.log(`💰 [API] تم العثور على ملخص لليوم السابق: ${previousBalance}`);
        } else {
          // إذا كان الملخص لتاريخ أقدم، احسب من ذلك التاريخ إلى اليوم السابق
          console.log(`💰 [API] آخر ملخص محفوظ في ${summaryDate}, حساب تراكمي إلى ${previousDateStr}`);

          const [sfYear, sfMonth, sfDay] = String(summaryDate).split('-').map(Number);
          const startFromDate = new Date(sfYear, sfMonth - 1, sfDay + 1);
          const startFromStr = `${startFromDate.getFullYear()}-${String(startFromDate.getMonth() + 1).padStart(2, '0')}-${String(startFromDate.getDate()).padStart(2, '0')}`;

          // حساب تراكمي من startFromStr إلى previousDateStr
          const cumulativeBalance = await calculateCumulativeBalance(project_id, startFromStr, previousDateStr);
          previousBalance = summaryBalance + cumulativeBalance;
          source = 'computed-from-summary';
          console.log(`💰 [API] رصيد تراكمي من ${summaryDate} (${summaryBalance}) + ${cumulativeBalance} = ${previousBalance}`);
        }
      } else {
        // لا يوجد ملخص محفوظ، حساب تراكمي من البداية
        console.log(`💰 [API] لا يوجد ملخص محفوظ، حساب تراكمي من البداية`);
        previousBalance = await calculateCumulativeBalance(project_id, null, previousDateStr);
        source = 'computed-full';
        console.log(`💰 [API] رصيد تراكمي كامل: ${previousBalance}`);
      }
    } catch (error) {
      console.warn(`⚠️ [API] خطأ في حساب الرصيد السابق، استخدام القيمة الافتراضية 0:`, error);
      previousBalance = 0;
      source = 'error';
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حساب الرصيد المتبقي من اليوم السابق بنجاح في ${duration}ms: ${previousBalance}`);

    res.json({
      success: true,
      data: {
        balance: previousBalance.toString(),
        previousDate: previousDateStr,
        currentDate: finalDate,
        source
      },
      message: `تم حساب الرصيد المتبقي من يوم ${previousDateStr} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حساب الرصيد المتبقي من اليوم السابق:', error);

    res.status(500).json({
      success: false,
      data: {
        balance: "0"
      },
      error: 'فشل في حساب الرصيد المتبقي',
      message: error.error,
      processingTime: duration
    });
  }
});

/**
 * 💰 دالة مساعدة لحساب الرصيد التراكمي
 * Helper function for calculating cumulative balance
 */
async function calculateCumulativeBalance(project_id: string, fromDate: string | null, toDate: string): Promise<number> {
  const cacheKey = `${project_id}:${fromDate || 'start'}:${toDate}`;
  const cached = getCachedBalance(cacheKey);
  if (cached !== null) {
    console.log(`💰 [Cache HIT] ${cacheKey} = ${cached}`);
    return cached;
  }

  try {
    const result = await pool.query(`
      WITH all_income AS (
        SELECT CAST(amount AS DECIMAL(15,2)) as amount
        FROM fund_transfers 
        WHERE project_id = $1 
          AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != '' AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
        UNION ALL
        SELECT CAST(amount AS DECIMAL(15,2)) as amount
        FROM project_fund_transfers 
        WHERE to_project_id = $1 
          AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != '' AND CAST(transfer_date AS TEXT) ~ '^\d{4}-\d{2}-\d{2}'
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
      ),
      all_expenses AS (
        SELECT CAST(paid_amount AS DECIMAL(15,2)) as amount
        FROM worker_attendance 
        WHERE project_id = $1 
          AND attendance_date IS NOT NULL AND CAST(attendance_date AS TEXT) != ''
          AND CAST(SUBSTRING(CAST(attendance_date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(attendance_date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
          AND CAST(paid_amount AS DECIMAL) > 0
        UNION ALL
        SELECT 
          CASE 
            WHEN CAST(paid_amount AS DECIMAL) > 0 THEN CAST(paid_amount AS DECIMAL(15,2))
            ELSE CAST(total_amount AS DECIMAL(15,2))
          END as amount
        FROM material_purchases 
        WHERE project_id = $1 
          AND (purchase_type = 'نقد' OR purchase_type = 'نقداً')
          AND purchase_date IS NOT NULL AND CAST(purchase_date AS TEXT) != ''
          AND CAST(SUBSTRING(CAST(purchase_date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(purchase_date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
        UNION ALL
        SELECT CAST(amount AS DECIMAL(15,2)) as amount
        FROM transportation_expenses 
        WHERE project_id = $1 
          AND date IS NOT NULL AND CAST(date AS TEXT) != ''
          AND CAST(SUBSTRING(CAST(date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
        UNION ALL
        SELECT CAST(amount AS DECIMAL(15,2)) as amount
        FROM worker_transfers 
        WHERE project_id = $1 
          AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != '' AND CAST(transfer_date AS TEXT) ~ '^\d{4}-\d{2}-\d{2}'
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
        UNION ALL
        SELECT CAST(amount AS DECIMAL(15,2)) as amount
        FROM worker_misc_expenses 
        WHERE project_id = $1 
          AND date IS NOT NULL AND CAST(date AS TEXT) != ''
          AND CAST(SUBSTRING(CAST(date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
        UNION ALL
        SELECT CAST(amount AS DECIMAL(15,2)) as amount
        FROM project_fund_transfers 
        WHERE from_project_id = $1 
          AND transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != '' AND CAST(transfer_date AS TEXT) ~ '^\d{4}-\d{2}-\d{2}'
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) >= COALESCE($2::date, '1900-01-01'::date)
          AND CAST(SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) AS date) <= $3::date
      )
      SELECT 
        COALESCE((SELECT SUM(amount) FROM all_income), 0) as total_income,
        COALESCE((SELECT SUM(amount) FROM all_expenses), 0) as total_expenses
    `, [project_id, fromDate, toDate]);

    const totalIncome = parseFloat(String(result.rows[0]?.total_income || '0'));
    const totalExpenses = parseFloat(String(result.rows[0]?.total_expenses || '0'));
    const balance = totalIncome - totalExpenses;
    setCachedBalance(cacheKey, balance);

    console.log(`💰 [Calc] فترة ${fromDate || 'البداية'} إلى ${toDate}: دخل=${totalIncome}, مصاريف=${totalExpenses}, رصيد=${balance}`);

    return balance;
  } catch (error) {
    console.error('❌ خطأ في حساب الرصيد التراكمي:', error);
    return 0;
  }
}

console.log('🏗️ [ProjectRouter] تم تهيئة مسارات إدارة المشاريع');

export default projectRouter;