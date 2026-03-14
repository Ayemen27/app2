/**
 * مسارات التقارير الاحترافية
 * Professional Reports API Routes
 * نظام تقارير متكامل يضاهي المنصات العالمية
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, and, sql, gte, lte, desc, asc, between, inArray } from 'drizzle-orm';
import { db } from '../../db';
import {
  projects,
  workers,
  workerAttendance,
  materialPurchases,
  transportationExpenses,
  workerTransfers,
  workerMiscExpenses,
  fundTransfers,
  projectFundTransfers,
  dailyExpenseSummaries,
  suppliers
} from '@shared/schema';
import { requireAuth } from '../../middleware/auth.js';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';
import { reportDataService } from '../../services/reports/ReportDataService';
import { generateDailyReportExcel } from '../../services/reports/templates/DailyReportExcel';
import { generateWorkerStatementExcel } from '../../services/reports/templates/WorkerStatementExcel';
import { generatePeriodFinalExcel } from '../../services/reports/templates/PeriodFinalExcel';
import { generateDailyReportHTML } from '../../services/reports/templates/DailyReportPDF';
import { generateWorkerStatementHTML } from '../../services/reports/templates/WorkerStatementPDF';
import { generatePeriodFinalHTML } from '../../services/reports/templates/PeriodFinalPDF';
import { generateDailyRangeExcel } from '../../services/reports/templates/DailyRangeExcel';
import { generateDailyRangeHTML } from '../../services/reports/templates/DailyRangePDF';
import { generateMultiProjectFinalExcel } from '../../services/reports/templates/MultiProjectFinalExcel';
import { generateMultiProjectFinalHTML } from '../../services/reports/templates/MultiProjectFinalPDF';

export const reportRouter = express.Router();

reportRouter.use(requireAuth);
reportRouter.use(attachAccessibleProjects);

/**
 * 📊 تقرير يومي شامل
 * Daily Comprehensive Report
 */
reportRouter.get('/reports/daily', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;

    if (!project_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع والتاريخ مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const dateStr = date as string;

    // جلب بيانات الحضور والأجور - استخدام الأجر المسجل في سجل الحضور نفسه
    const attendanceData = await db
      .select({
        worker_id: workerAttendance.worker_id,
        workerName: workers.name,
        workerType: workers.type,
        workDays: workerAttendance.workDays,
        dailyWage: workerAttendance.dailyWage, // الأجر المسجل في السجل
        actualWage: workerAttendance.actualWage,
        paidAmount: workerAttendance.paidAmount,
        remainingAmount: workerAttendance.remainingAmount,
        workDescription: workerAttendance.workDescription
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
      .where(
        and(
          eq(workerAttendance.project_id, project_id as string),
          eq(workerAttendance.attendanceDate, dateStr)
        )
      );

    // جلب مشتريات المواد
    const materialsData = await db
      .select({
        id: materialPurchases.id,
        materialName: materialPurchases.materialName,
        materialCategory: materialPurchases.materialCategory,
        quantity: materialPurchases.quantity,
        unit: materialPurchases.unit,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        paidAmount: materialPurchases.paidAmount,
        remainingAmount: materialPurchases.remainingAmount,
        supplierName: materialPurchases.supplierName,
        purchaseType: materialPurchases.purchaseType
      })
      .from(materialPurchases)
      .where(
        and(
          eq(materialPurchases.project_id, project_id as string),
          eq(materialPurchases.purchaseDate, dateStr)
        )
      );

    // جلب مصاريف النقل
    const transportData = await db
      .select({
        id: transportationExpenses.id,
        amount: transportationExpenses.amount,
        description: transportationExpenses.description,
        workerName: workers.name
      })
      .from(transportationExpenses)
      .leftJoin(workers, eq(transportationExpenses.worker_id, workers.id))
      .where(
        and(
          eq(transportationExpenses.project_id, project_id as string),
          eq(transportationExpenses.date, dateStr)
        )
      );

    // جلب مصاريف العمال المتنوعة
    const miscExpensesData = await db
      .select({
        id: workerMiscExpenses.id,
        amount: workerMiscExpenses.amount,
        description: workerMiscExpenses.description,
        notes: workerMiscExpenses.notes
      })
      .from(workerMiscExpenses)
      .where(
        and(
          eq(workerMiscExpenses.project_id, project_id as string),
          eq(workerMiscExpenses.date, dateStr)
        )
      );

    // جلب حوالات العمال
    const transfersData = await db
      .select({
        id: workerTransfers.id,
        workerName: workers.name,
        amount: workerTransfers.amount,
        recipientName: workerTransfers.recipientName,
        transferMethod: workerTransfers.transferMethod
      })
      .from(workerTransfers)
      .leftJoin(workers, eq(workerTransfers.worker_id, workers.id))
      .where(
        and(
          eq(workerTransfers.project_id, project_id as string),
          eq(workerTransfers.transferDate, dateStr)
        )
      );

    // جلب تحويلات العهدة
    const fundTransfersData = await db
      .select({
        id: fundTransfers.id,
        amount: fundTransfers.amount,
        senderName: fundTransfers.senderName,
        transferType: fundTransfers.transferType,
        transferNumber: fundTransfers.transferNumber
      })
      .from(fundTransfers)
      .where(
        and(
          eq(fundTransfers.project_id, project_id as string),
          sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END) = ${dateStr}::date`
        )
      );

    // حساب الإجماليات - باستخدام الأجر الحالي للعامل × عدد أيام العمل
    const totalWorkerWages = attendanceData.reduce((sum: any, a: any) => {
      const currentDailyWage = parseFloat(a.dailyWage || '0');
      const workDays = parseFloat(a.workDays || '0');
      return sum + (currentDailyWage * workDays);
    }, 0);
    const totalPaidWages = attendanceData.reduce((sum: any, a: any) => sum + parseFloat(a.paidAmount || '0'), 0);
    const totalWorkDays = attendanceData.reduce((sum: any, a: any) => sum + parseFloat(a.workDays || '0'), 0);
    const totalMaterials = materialsData.reduce((sum: any, m: any) => sum + parseFloat(m.totalAmount || '0'), 0);
    const totalTransport = transportData.reduce((sum: any, t: any) => sum + parseFloat(t.amount || '0'), 0);
    const totalMiscExpenses = miscExpensesData.reduce((sum: any, e: any) => sum + parseFloat(e.amount || '0'), 0);
    const totalTransfers = transfersData.reduce((sum: any, t: any) => sum + parseFloat(t.amount || '0'), 0);
    const totalFundTransfers = fundTransfersData.reduce((sum: any, f: any) => sum + parseFloat(f.amount || '0'), 0);

    const totalExpenses = totalPaidWages + totalMaterials + totalTransport + totalMiscExpenses + totalTransfers;
    const balance = totalFundTransfers - totalExpenses;

    const projectInfo = await db.select().from(projects).where(eq(projects.id, project_id as string)).limit(1);

    const reportData = {
      project: projectInfo[0] || { id: project_id, name: 'غير محدد' },
      date: dateStr,
      attendance: attendanceData,
      materials: materialsData,
      transport: transportData,
      miscExpenses: miscExpensesData,
      workerTransfers: transfersData,
      fundTransfers: fundTransfersData,
      totals: {
        totalWorkerWages,
        totalPaidWages,
        totalWorkDays,
        totalMaterials,
        totalTransport,
        totalMiscExpenses,
        totalTransfers,
        totalFundTransfers,
        totalExpenses,
        balance,
        workerCount: attendanceData.length
      }
    };

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: reportData,
      report: reportData,
      processingTime: duration
    });

  } catch (error: any) {
    console.error('❌ [Reports] خطأ في التقرير اليومي:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب التقرير اليومي',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 📅 تقرير أسبوعي/شهري
 * Weekly/Monthly Report
 */
reportRouter.get('/reports/periodic', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, dateFrom, dateTo, groupBy = 'day' } = req.query;

    if (!project_id || !dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع وفترة التاريخ مطلوبة',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const dateFromStr = dateFrom as string;
    const dateToStr = dateTo as string;

    // جلب بيانات الحضور المجمعة - استخدام الأجر المسجل في سجل الحضور
    const attendanceSummary = await db
      .select({
        date: workerAttendance.attendanceDate,
        totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalWages: sql<number>`COALESCE(SUM(CAST(${workerAttendance.dailyWage} AS DECIMAL) * CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
        workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.worker_id})`
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
      .where(
        and(
          eq(workerAttendance.project_id, project_id as string),
          gte(workerAttendance.attendanceDate, dateFromStr),
          lte(workerAttendance.attendanceDate, dateToStr)
        )
      )
      .groupBy(workerAttendance.attendanceDate)
      .orderBy(asc(workerAttendance.attendanceDate));

    // جلب بيانات المشتريات المجمعة
    const materialsSummary = await db
      .select({
        date: materialPurchases.purchaseDate,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${materialPurchases.paidAmount} AS DECIMAL)), 0)`,
        purchaseCount: sql<number>`COUNT(*)`
      })
      .from(materialPurchases)
      .where(
        and(
          eq(materialPurchases.project_id, project_id as string),
          gte(materialPurchases.purchaseDate, dateFromStr),
          lte(materialPurchases.purchaseDate, dateToStr)
        )
      )
      .groupBy(materialPurchases.purchaseDate)
      .orderBy(asc(materialPurchases.purchaseDate));

    // جلب بيانات النقل المجمعة
    const transportSummary = await db
      .select({
        date: transportationExpenses.date,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${transportationExpenses.amount} AS DECIMAL)), 0)`,
        tripCount: sql<number>`COUNT(*)`
      })
      .from(transportationExpenses)
      .where(
        and(
          eq(transportationExpenses.project_id, project_id as string),
          gte(transportationExpenses.date, dateFromStr),
          lte(transportationExpenses.date, dateToStr)
        )
      )
      .groupBy(transportationExpenses.date)
      .orderBy(asc(transportationExpenses.date));

    // جلب بيانات تحويلات العهدة
    const fundTransfersSummary = await db
      .select({
        date: sql<string>`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END)`,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${fundTransfers.amount} AS DECIMAL)), 0)`,
        transferCount: sql<number>`COUNT(*)`
      })
      .from(fundTransfers)
      .where(
        and(
          eq(fundTransfers.project_id, project_id as string),
          gte(sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END)`, dateFromStr),
          lte(sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END)`, dateToStr)
        )
      )
      .groupBy(sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END)`)
      .orderBy(asc(sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END)`));

    // جلب بيانات النثريات المجمعة (مصاريف العمال المتنوعة)
    const miscExpensesSummary = await db
      .select({
        date: workerMiscExpenses.date,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${workerMiscExpenses.amount} AS DECIMAL)), 0)`,
        expenseCount: sql<number>`COUNT(*)`
      })
      .from(workerMiscExpenses)
      .where(
        and(
          eq(workerMiscExpenses.project_id, project_id as string),
          gte(workerMiscExpenses.date, dateFromStr),
          lte(workerMiscExpenses.date, dateToStr)
        )
      )
      .groupBy(workerMiscExpenses.date)
      .orderBy(asc(workerMiscExpenses.date));

    // حساب الإجماليات الكلية
    const totalWorkDays = attendanceSummary.reduce((sum: any, a: any) => sum + Number(a.totalWorkDays), 0);
    const totalWages = attendanceSummary.reduce((sum: any, a: any) => sum + Number(a.totalWages), 0);
    const totalPaidWages = attendanceSummary.reduce((sum: any, a: any) => sum + Number(a.totalPaid), 0);
    const totalMaterials = materialsSummary.reduce((sum: any, m: any) => sum + Number(m.totalAmount), 0);
    const totalTransport = transportSummary.reduce((sum: any, t: any) => sum + Number(t.totalAmount), 0);
    const totalFundTransfers = fundTransfersSummary.reduce((sum: any, f: any) => sum + Number(f.totalAmount), 0);
    const totalMiscExpenses = miscExpensesSummary.reduce((sum: any, e: any) => sum + Number(e.totalAmount), 0);
    const uniqueWorkers = Math.max(...attendanceSummary.map((a: any) => Number(a.workerCount)), 0);
    const activeDays = attendanceSummary.length;
    const totalExpenses = totalPaidWages + totalMaterials + totalTransport + totalMiscExpenses;
    const balance = totalFundTransfers - totalExpenses;

    const totalStats = {
      totalWorkDays,
      totalWages,
      totalPaidWages,
      totalMaterials,
      totalTransport,
      totalMiscExpenses,
      totalFundTransfers,
      uniqueWorkers,
      activeDays,
      totalExpenses,
      balance
    };

    // جلب اسم المشروع
    const projectInfo = await db.select().from(projects).where(eq(projects.id, project_id as string)).limit(1);

    // بناء بيانات الرسم البياني
    const chartData = attendanceSummary.map((day: any) => {
      const materialDay = materialsSummary.find((m: any) => m.date === day.date);
      const transportDay = transportSummary.find((t: any) => t.date === day.date);
      const fundDay = fundTransfersSummary.find((f: any) => f.date === day.date);
      const miscDay = miscExpensesSummary.find((e: any) => e.date === day.date);

      const miscAmount = miscDay ? Number(miscDay.totalAmount) : 0;
      const materialAmount = materialDay ? Number(materialDay.totalAmount) : 0;
      const transportAmount = transportDay ? Number(transportDay.totalAmount) : 0;

      return {
        date: day.date,
        wages: Number(day.totalPaid),
        materials: materialAmount,
        transport: transportAmount,
        misc: miscAmount,
        income: fundDay ? Number(fundDay.totalAmount) : 0,
        total: Number(day.totalPaid) + materialAmount + transportAmount + miscAmount
      };
    });

    const duration = Date.now() - startTime;

    // حساب الإجماليات الكلية للمشروع
    const [totalFundsResult] = await db.select({ sum: sql<string>`SUM(CAST(${fundTransfers.amount} AS DECIMAL))` }).from(fundTransfers).where(eq(fundTransfers.project_id, project_id as string));
    const [totalWagesResult] = await db.select({ sum: sql<string>`SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL))` }).from(workerAttendance).where(eq(workerAttendance.project_id, project_id as string));
    const [totalMaterialsResult] = await db.select({ sum: sql<string>`SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL))` }).from(materialPurchases).where(eq(materialPurchases.project_id, project_id as string));
    const [totalTransportResult] = await db.select({ sum: sql<string>`SUM(CAST(${transportationExpenses.amount} AS DECIMAL))` }).from(transportationExpenses).where(eq(transportationExpenses.project_id, project_id as string));
    const [totalMiscResult] = await db.select({ sum: sql<string>`SUM(CAST(${workerMiscExpenses.amount} AS DECIMAL))` }).from(workerMiscExpenses).where(eq(workerMiscExpenses.project_id, project_id as string));

    const overallTotalFunds = Number(totalFundsResult?.sum || 0);
    const overallTotalWages = Number(totalWagesResult?.sum || 0);
    const overallTotalMaterials = Number(totalMaterialsResult?.sum || 0);
    const overallTotalTransport = Number(totalTransportResult?.sum || 0);
    const overallTotalMisc = Number(totalMiscResult?.sum || 0);

    const [activeProjectsCount] = await db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.is_active, true));
    const [activeWorkersCount] = await db.select({ count: sql<number>`count(*)` }).from(workers).where(eq(workers.is_active, true));

    res.json({
      success: true,
      data: {
        overall: {
          activeProjects: Number(activeProjectsCount?.count || 0),
          activeWorkers: Number(activeWorkersCount?.count || 0),
          totalFunds: overallTotalFunds,
          totalExpenses: overallTotalWages + overallTotalMaterials + overallTotalTransport + overallTotalMisc,
          wages: overallTotalWages,
          materials: overallTotalMaterials,
          transport: overallTotalTransport,
          misc: overallTotalMisc
        },
        month: totalStats,
        chartData
      }
    });

  } catch (error: any) {
    console.error('❌ [Reports] خطأ في التقرير الدوري:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب التقرير الدوري',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 👷 تقرير كشف حساب عامل احترافي
 * Professional Worker Statement Report
 */
reportRouter.get('/reports/worker-statement', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { worker_id, dateFrom, dateTo, project_id } = req.query;

    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'معرف العامل مطلوب' });
    }

    const worker = await db.select().from(workers).where(eq(workers.id, worker_id as string)).limit(1);
    if (!worker.length) {
      return res.status(404).json({ success: false, error: 'العامل غير موجود' });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && worker[0].project_id && !accessibleIds.includes(worker[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا العامل' });
    }

    // بناء الفلاتر
    const filters = [eq(workerAttendance.worker_id, worker_id as string)];
    const transferFilters = [eq(workerTransfers.worker_id, worker_id as string)];

    if (project_id && project_id !== 'all') {
      filters.push(eq(workerAttendance.project_id, project_id as string));
      transferFilters.push(eq(workerTransfers.project_id, project_id as string));
    } else if (!isAdminUser && accessibleIds.length > 0) {
      filters.push(inArray(workerAttendance.project_id, accessibleIds));
      transferFilters.push(inArray(workerTransfers.project_id, accessibleIds));
    } else if (!isAdminUser) {
      filters.push(sql`1=0`);
      transferFilters.push(sql`1=0`);
    }
    if (dateFrom) {
      filters.push(gte(workerAttendance.attendanceDate, dateFrom as string));
      transferFilters.push(gte(workerTransfers.transferDate, dateFrom as string));
    }
    if (dateTo) {
      filters.push(lte(workerAttendance.attendanceDate, dateTo as string));
      transferFilters.push(lte(workerTransfers.transferDate, dateTo as string));
    }

    // جلب البيانات مع أسماء المشاريع
    const attendance = await db
      .select({
        attendanceDate: workerAttendance.attendanceDate,
        workDescription: workerAttendance.workDescription,
        actualWage: workerAttendance.actualWage,
        dailyWage: workerAttendance.dailyWage,
        paidAmount: workerAttendance.paidAmount,
        workDays: workerAttendance.workDays,
        projectName: projects.name
      })
      .from(workerAttendance)
      .leftJoin(projects, eq(workerAttendance.project_id, projects.id))
      .where(and(...filters))
      .orderBy(asc(workerAttendance.attendanceDate));

    const transfers = await db
      .select({
        transferDate: workerTransfers.transferDate,
        recipientName: workerTransfers.recipientName,
        amount: workerTransfers.amount,
        transferNumber: workerTransfers.transferNumber,
        projectName: projects.name
      })
      .from(workerTransfers)
      .leftJoin(projects, eq(workerTransfers.project_id, projects.id))
      .where(and(...transferFilters))
      .orderBy(asc(workerTransfers.transferDate));
    
    // تجميع الحركات في كشف واحد مع تصفية السجلات الفارغة وغير المكتملة
    const statement = [
      ...attendance
        .filter((a: any) => {
          const days = parseFloat(a.workDays || '0');
          const paid = parseFloat(a.paidAmount || '0');
          // الاحتفاظ بالسجل فقط إذا كان هناك عمل (أيام > 0) أو مبلغ مدفوع (دفعة)
          return days > 0 || paid > 0;
        })
        .map((a: any) => {
          const days = parseFloat(a.workDays || '0');
          const wage = parseFloat(a.dailyWage || '0');
          const earnedAmount = days * wage;
          
          return {
            date: a.attendanceDate,
            type: 'عمل',
            description: a.workDescription || (days > 0 ? 'تنفيذ مهام العمل الموكلة' : 'تسجيل حضور'),
            amount: earnedAmount,
            paid: parseFloat(a.paidAmount || '0'),
            workDays: days,
            projectName: a.projectName || '-',
            reference: 'حضور'
          };
        }),
      ...transfers.map((t: any) => ({
        date: t.transferDate,
        type: 'حوالة',
        description: `حوالة لـ ${t.recipientName}`,
        amount: 0,
        paid: parseFloat(t.amount || '0'),
        workDays: 0,
        projectName: t.projectName || '-',
        reference: t.transferNumber || 'حوالة'
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // حساب الرصيد التراكمي
    let runningBalance = 0;
    const finalStatement = statement.map(item => {
      runningBalance += (item.amount - item.paid);
      return { ...item, balance: runningBalance };
    });

    const totalWorkDays = finalStatement.reduce((sum, i) => sum + i.workDays, 0);

    res.json({
      success: true,
      data: {
        worker: worker[0],
        statement: finalStatement,
        summary: {
          totalEarned: finalStatement.reduce((sum, i) => sum + i.amount, 0),
          totalPaid: finalStatement.reduce((sum, i) => sum + i.paid, 0),
          totalWorkDays: totalWorkDays,
          finalBalance: runningBalance
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📊 مؤشرات الأداء الأساسية (Dashboard KPIs)
 */
reportRouter.get('/reports/dashboard-kpis', async (req: Request, res: Response) => {
  const { project_id, range } = req.query;
  const startTime = Date.now();

  try {
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && (!project_id || project_id === 'all' || project_id === 'undefined')) {
      return res.status(400).json({ success: false, message: 'يجب تحديد مشروع معين' });
    }
    if (!isAdminUser && project_id && project_id !== 'all' && project_id !== 'undefined' && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // تصفية حسب التاريخ إذا تم توفيره
    let dateFilter = sql`1=1`;
    if (range === 'today') {
      const today = new Date().toISOString().split('T')[0];
      dateFilter = sql`(CASE WHEN ${workerAttendance.attendanceDate} IS NULL OR ${workerAttendance.attendanceDate} = '' OR ${workerAttendance.attendanceDate} !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${workerAttendance.attendanceDate}::date END) = ${today}::date`;
    } else if (range === 'this-month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      dateFilter = sql`${workerAttendance.attendanceDate} >= ${firstDay}`;
    }

    // تطبيق الفلاتر على الاستعلامات
    const projectFilter = project_id && project_id !== 'all' && project_id !== 'undefined' ? eq(fundTransfers.project_id, project_id as string) : sql`1=1`;
    const attendanceFilter = and(
      project_id && project_id !== 'all' && project_id !== 'undefined' ? eq(workerAttendance.project_id, project_id as string) : sql`1=1`,
      range === 'today' ? sql`(CASE WHEN ${workerAttendance.attendanceDate} IS NULL OR ${workerAttendance.attendanceDate} = '' OR ${workerAttendance.attendanceDate} !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${workerAttendance.attendanceDate}::date END) = ${new Date().toISOString().split('T')[0]}::date` : 
      range === 'this-month' ? sql`${workerAttendance.attendanceDate} >= ${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}` : sql`1=1`
    );
    const materialsFilter = and(
      project_id && project_id !== 'all' && project_id !== 'undefined' ? eq(materialPurchases.project_id, project_id as string) : sql`1=1`,
      range === 'today' ? eq(materialPurchases.purchaseDate, new Date().toISOString().split('T')[0]) : 
      range === 'this-month' ? gte(materialPurchases.purchaseDate, new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]) : sql`1=1`
    );
    const transportFilter = and(
      project_id && project_id !== 'all' && project_id !== 'undefined' ? eq(transportationExpenses.project_id, project_id as string) : sql`1=1`,
      range === 'today' ? eq(transportationExpenses.date, new Date().toISOString().split('T')[0]) : 
      range === 'this-month' ? gte(transportationExpenses.date, new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]) : sql`1=1`
    );
    const miscFilter = and(
      project_id && project_id !== 'all' && project_id !== 'undefined' ? eq(workerMiscExpenses.project_id, project_id as string) : sql`1=1`,
      range === 'today' ? eq(workerMiscExpenses.date, new Date().toISOString().split('T')[0]) : 
      range === 'this-month' ? gte(workerMiscExpenses.date, new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]) : sql`1=1`
    );
    const fundsTimeFilter = and(
      projectFilter,
      range === 'today' ? sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END) = ${new Date().toISOString().split('T')[0]}::date` : 
      range === 'this-month' ? sql`(CASE WHEN ${fundTransfers.transferDate} IS NULL OR ${fundTransfers.transferDate}::text = '' OR ${fundTransfers.transferDate}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${fundTransfers.transferDate}::date END) >= ${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}::date` : sql`1=1`
    );

    const [totalFunds] = await db.select({ sum: sql<string>`SUM(CAST(${fundTransfers.amount} AS DECIMAL))` }).from(fundTransfers).where(fundsTimeFilter);
    const [totalWages] = await db.select({ sum: sql<string>`SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL))` }).from(workerAttendance).where(attendanceFilter);
    const [totalMaterials] = await db.select({ sum: sql<string>`SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL))` }).from(materialPurchases).where(materialsFilter);
    const [totalTransport] = await db.select({ sum: sql<string>`SUM(CAST(${transportationExpenses.amount} AS DECIMAL))` }).from(transportationExpenses).where(transportFilter);
    const [totalMisc] = await db.select({ sum: sql<string>`SUM(CAST(${workerMiscExpenses.amount} AS DECIMAL))` }).from(workerMiscExpenses).where(miscFilter);

    const [activeWorkers] = await db.select({ count: sql<number>`count(distinct ${workerAttendance.worker_id})` }).from(workerAttendance).where(attendanceFilter);

    // بناء بيانات الرسم البياني الزمني (آخر 7 أيام كعينة)
    const chartData = await db.select({
      date: workerAttendance.attendanceDate,
      total: sql<number>`SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL))`
    }).from(workerAttendance)
    .where(attendanceFilter)
    .groupBy(workerAttendance.attendanceDate)
    .orderBy(desc(workerAttendance.attendanceDate))
    .limit(15);

    res.json({
      success: true,
      data: {
        overall: {
          totalFunds: Number(totalFunds?.sum || 0),
          totalExpenses: Number(totalWages?.sum || 0) + Number(totalMaterials?.sum || 0) + Number(totalTransport?.sum || 0) + Number(totalMisc?.sum || 0),
          wages: Number(totalWages?.sum || 0),
          materials: Number(totalMaterials?.sum || 0),
          transport: Number(totalTransport?.sum || 0),
          misc: Number(totalMisc?.sum || 0),
          activeWorkers: Number(activeWorkers?.count || 0)
        },
        chartData: chartData.reverse()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 🔄 مقارنة المشاريع
 * Projects Comparison Report
 */
reportRouter.get('/reports/projects-comparison', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_ids, dateFrom, dateTo } = req.query;

    if (!project_ids) {
      return res.status(400).json({
        success: false,
        error: 'معرفات المشاريع مطلوبة',
        processingTime: Date.now() - startTime
      });
    }

    const project_idArray = (project_ids as string).split(',');

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    const filteredProjectIds = isAdminUser ? project_idArray : project_idArray.filter(id => accessibleIds.includes(id));
    if (!isAdminUser && filteredProjectIds.length === 0) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذه المشاريع' });
    }

    const comparisonData = await Promise.all(
      filteredProjectIds.map(async (project_id) => {
        // جلب معلومات المشروع
        const projectInfo = await db.select().from(projects).where(eq(projects.id, project_id)).limit(1);

        if (!projectInfo.length) return null;

        // بناء شروط التاريخ
        let dateConditions: any[] = [eq(workerAttendance.project_id, project_id)];
        if (dateFrom && dateTo) {
          dateConditions.push(gte(workerAttendance.attendanceDate, dateFrom as string));
          dateConditions.push(lte(workerAttendance.attendanceDate, dateTo as string));
        }

        // إحصائيات الحضور
        const attendanceStats = await db
          .select({
            totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
            totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
            workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.worker_id})`
          })
          .from(workerAttendance)
          .where(and(...dateConditions));

        // إحصائيات المواد
        let materialConditions: any[] = [eq(materialPurchases.project_id, project_id)];
        if (dateFrom && dateTo) {
          materialConditions.push(gte(materialPurchases.purchaseDate, dateFrom as string));
          materialConditions.push(lte(materialPurchases.purchaseDate, dateTo as string));
        }

        const materialsStats = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL)), 0)`
          })
          .from(materialPurchases)
          .where(and(...materialConditions));

        // إحصائيات النقل
        let transportConditions: any[] = [eq(transportationExpenses.project_id, project_id)];
        if (dateFrom && dateTo) {
          transportConditions.push(gte(transportationExpenses.date, dateFrom as string));
          transportConditions.push(lte(transportationExpenses.date, dateTo as string));
        }

        const transportStats = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${transportationExpenses.amount} AS DECIMAL)), 0)`
          })
          .from(transportationExpenses)
          .where(and(...transportConditions));

        // إحصائيات الدخل
        const fundStats = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${fundTransfers.amount} AS DECIMAL)), 0)`
          })
          .from(fundTransfers)
          .where(eq(fundTransfers.project_id, project_id));

        const totalIncome = Number(fundStats[0]?.total || 0);
        const totalWages = Number(attendanceStats[0]?.totalPaid || 0);
        const totalMaterials = Number(materialsStats[0]?.total || 0);
        const totalTransport = Number(transportStats[0]?.total || 0);
        const totalExpenses = totalWages + totalMaterials + totalTransport;

        return {
          project: projectInfo[0],
          metrics: {
            income: totalIncome,
            expenses: totalExpenses,
            balance: totalIncome - totalExpenses,
            wages: totalWages,
            materials: totalMaterials,
            transport: totalTransport,
            workers: Number(attendanceStats[0]?.workerCount || 0),
            workDays: Number(attendanceStats[0]?.totalWorkDays || 0)
          }
        };
      })
    );

    // تصفية النتائج الفارغة
    const validData = comparisonData.filter(d => d !== null);

    // بناء بيانات المقارنة للرسوم البيانية
    const chartData = validData.map(item => ({
      name: item!.project.name,
      income: item!.metrics.income,
      expenses: item!.metrics.expenses,
      balance: item!.metrics.balance
    }));

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        period: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : 'all',
        projects: validData,
        chartData,
        totals: {
          totalIncome: validData.reduce((sum, p) => sum + p!.metrics.income, 0),
          totalExpenses: validData.reduce((sum, p) => sum + p!.metrics.expenses, 0),
          totalBalance: validData.reduce((sum, p) => sum + p!.metrics.balance, 0)
        }
      },
      processingTime: duration
    });

  } catch (error: any) {
    console.error('❌ [Reports] خطأ في مقارنة المشاريع:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب مقارنة المشاريع',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 👷 بيان العامل التفصيلي
 * Worker Detailed Statement
 */
reportRouter.get('/reports/worker-statement/:worker_id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { worker_id } = req.params;
    const { project_id, dateFrom, dateTo } = req.query;

    // جلب معلومات العامل
    const workerInfo = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (!workerInfo.length) {
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        processingTime: Date.now() - startTime
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && workerInfo[0].project_id && !accessibleIds.includes(workerInfo[0].project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا العامل' });
    }

    // بناء شروط الاستعلام
    let conditions: any[] = [eq(workerAttendance.worker_id, worker_id)];
    if (project_id) {
      conditions.push(eq(workerAttendance.project_id, project_id as string));
    } else if (!isAdminUser && accessibleIds.length > 0) {
      conditions.push(inArray(workerAttendance.project_id, accessibleIds));
    } else if (!isAdminUser) {
      conditions.push(sql`1=0`);
    }
    if (dateFrom) {
      conditions.push(gte(workerAttendance.attendanceDate, dateFrom as string));
    }
    if (dateTo) {
      conditions.push(lte(workerAttendance.attendanceDate, dateTo as string));
    }

    // جلب سجلات الحضور
    const attendanceRecords = await db
      .select({
        id: workerAttendance.id,
        date: workerAttendance.attendanceDate,
        project_id: workerAttendance.project_id,
        projectName: projects.name,
        workDays: workerAttendance.workDays,
        dailyWage: workerAttendance.dailyWage,
        actualWage: workerAttendance.actualWage,
        paidAmount: workerAttendance.paidAmount,
        remainingAmount: workerAttendance.remainingAmount,
        workDescription: workerAttendance.workDescription
      })
      .from(workerAttendance)
      .leftJoin(projects, eq(workerAttendance.project_id, projects.id))
      .where(and(...conditions))
      .orderBy(desc(workerAttendance.attendanceDate));

    // جلب حوالات العامل
    let transferConditions: any[] = [eq(workerTransfers.worker_id, worker_id)];
    if (project_id) {
      transferConditions.push(eq(workerTransfers.project_id, project_id as string));
    } else if (!isAdminUser && accessibleIds.length > 0) {
      transferConditions.push(inArray(workerTransfers.project_id, accessibleIds));
    } else if (!isAdminUser) {
      transferConditions.push(sql`1=0`);
    }
    if (dateFrom) {
      transferConditions.push(gte(workerTransfers.transferDate, dateFrom as string));
    }
    if (dateTo) {
      transferConditions.push(lte(workerTransfers.transferDate, dateTo as string));
    }

    const transfers = await db
      .select({
        id: workerTransfers.id,
        date: workerTransfers.transferDate,
        projectName: projects.name,
        amount: workerTransfers.amount,
        recipientName: workerTransfers.recipientName,
        transferMethod: workerTransfers.transferMethod,
        notes: workerTransfers.notes
      })
      .from(workerTransfers)
      .leftJoin(projects, eq(workerTransfers.project_id, projects.id))
      .where(and(...transferConditions))
      .orderBy(desc(workerTransfers.transferDate));

    // حساب الإجماليات - باستخدام الأجر الحالي للعامل
    const currentDailyWage = parseFloat(workerInfo[0].dailyWage || '0');
    const totalWorkDays = attendanceRecords.reduce((sum: any, r: any) => sum + parseFloat(r.workDays || '0'), 0);
    const totalEarned = currentDailyWage * totalWorkDays;
    const totalPaid = attendanceRecords.reduce((sum: any, r: any) => sum + parseFloat(r.paidAmount || '0'), 0);
    const totalTransfers = transfers.reduce((sum: any, t: any) => sum + parseFloat(t.amount || '0'), 0);
    const remainingBalance = totalEarned - totalPaid - totalTransfers;

    // بيانات الرسم البياني - باستخدام الأجر الحالي
    const chartData = attendanceRecords.map((r: any) => {
      const workDays = parseFloat(r.workDays || '0');
      return {
        date: r.date,
        earned: currentDailyWage * workDays,
        paid: parseFloat(r.paidAmount || '0'),
        workDays: workDays
      };
    }).reverse();

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        worker: workerInfo[0],
        period: {
          from: dateFrom || 'all',
          to: dateTo || 'all'
        },
        summary: {
          totalWorkDays,
          totalEarned,
          totalPaid,
          totalTransfers,
          remainingBalance
        },
        attendance: attendanceRecords,
        transfers,
        chartData
      },
      processingTime: duration
    });

  } catch (error: any) {
    console.error('❌ [Reports] خطأ في بيان العامل:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب بيان العامل',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 📈 إحصائيات KPIs للوحة التحكم
 * Dashboard KPIs Statistics
 */
reportRouter.get('/reports/dashboard-kpis', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id } = req.query;

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && (!project_id || project_id === 'all' || project_id === 'undefined')) {
      return res.status(400).json({ success: false, message: 'يجب تحديد مشروع معين' });
    }
    if (!isAdminUser && project_id && project_id !== 'all' && project_id !== 'undefined' && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // الحصول على التاريخ الحالي وتاريخ بداية الشهر
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    let projectCondition = project_id ? eq(workerAttendance.project_id, project_id as string) : sql`1=1`;

    // إحصائيات اليوم
    const todayStats = await db
      .select({
        workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.worker_id})`,
        totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`
      })
      .from(workerAttendance)
      .where(
        and(
          projectCondition,
          eq(workerAttendance.attendanceDate, todayStr)
        )
      );

    // إحصائيات الشهر - باستخدام الأجر الحالي للعامل
    const monthStats = await db
      .select({
        workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.worker_id})`,
        totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalWages: sql<number>`COALESCE(SUM(CAST(${workers.dailyWage} AS DECIMAL) * CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
        activeDays: sql<number>`COUNT(DISTINCT ${workerAttendance.attendanceDate})`
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
      .where(
        and(
          projectCondition,
          gte(workerAttendance.attendanceDate, startOfMonth),
          lte(workerAttendance.attendanceDate, endOfMonth)
        )
      );

    // مشتريات الشهر
    let materialProjectCondition = project_id ? eq(materialPurchases.project_id, project_id as string) : sql`1=1`;
    const monthMaterials = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL)), 0)`
      })
      .from(materialPurchases)
      .where(
        and(
          materialProjectCondition,
          gte(materialPurchases.purchaseDate, startOfMonth),
          lte(materialPurchases.purchaseDate, endOfMonth)
        )
      );

    // عدد المشاريع النشطة
    const activeProjects = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(projects)
      .where(eq(projects.status, 'active'));

    // عدد العمال النشطين
    const activeWorkers = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(workers)
      .where(eq(workers.is_active, true));

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        today: {
          workers: Number(todayStats[0]?.workerCount || 0),
          workDays: Number(todayStats[0]?.totalWorkDays || 0),
          expenses: Number(todayStats[0]?.totalPaid || 0)
        },
        month: {
          workers: Number(monthStats[0]?.workerCount || 0),
          workDays: Number(monthStats[0]?.totalWorkDays || 0),
          wages: Number(monthStats[0]?.totalWages || 0),
          paid: Number(monthStats[0]?.totalPaid || 0),
          materials: Number(monthMaterials[0]?.total || 0),
          activeDays: Number(monthStats[0]?.activeDays || 0)
        },
        overall: {
          activeProjects: Number(activeProjects[0]?.count || 0),
          activeWorkers: Number(activeWorkers[0]?.count || 0)
        },
        period: {
          today: todayStr,
          monthStart: startOfMonth,
          monthEnd: endOfMonth
        }
      },
      processingTime: duration
    });

  } catch (error: any) {
    console.error('❌ [Reports] خطأ في إحصائيات KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات KPIs',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 📊 V2 APIs - التقارير الاحترافية المحسنة
 */

reportRouter.get('/reports/v2/daily', async (req: Request, res: Response) => {
  try {
    const { project_id, date } = req.query;
    if (!project_id || !date) {
      return res.status(400).json({ success: false, error: 'معرف المشروع والتاريخ مطلوبان' });
    }
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    const data = await reportDataService.getDailyReport(project_id as string, date as string);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ [Reports V2] خطأ في التقرير اليومي:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

reportRouter.get('/reports/v2/worker-statement', async (req: Request, res: Response) => {
  try {
    const { worker_id, dateFrom, dateTo, project_id } = req.query;
    if (!worker_id) {
      return res.status(400).json({ success: false, error: 'معرف العامل مطلوب' });
    }
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (project_id && project_id !== 'all' && !isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    const data = await reportDataService.getWorkerStatement(worker_id as string, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      projectId: project_id as string,
      accessibleProjectIds: accessibleIds,
      isAdmin: isAdminUser
    });
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ [Reports V2] خطأ في كشف حساب العامل:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

reportRouter.get('/reports/v2/period-final', async (req: Request, res: Response) => {
  try {
    const { project_id, dateFrom, dateTo } = req.query;
    if (!project_id || !dateFrom || !dateTo) {
      return res.status(400).json({ success: false, error: 'معرف المشروع وفترة التاريخ مطلوبة' });
    }
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }
    const data = await reportDataService.getPeriodFinalReport(project_id as string, dateFrom as string, dateTo as string);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ [Reports V2] خطأ في التقرير الختامي:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

reportRouter.get('/reports/v2/multi-project-final', async (req: Request, res: Response) => {
  try {
    const { project_ids, dateFrom, dateTo } = req.query;
    if (!project_ids || !dateFrom || !dateTo) {
      return res.status(400).json({ success: false, error: 'معرفات المشاريع وفترة التاريخ مطلوبة' });
    }
    const ids = (project_ids as string).split(',').filter(Boolean);
    if (ids.length < 1) {
      return res.status(400).json({ success: false, error: 'يجب تحديد مشروع واحد على الأقل' });
    }
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser) {
      const unauthorized = ids.filter(id => !accessibleIds.includes(id));
      if (unauthorized.length > 0) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لبعض المشاريع' });
      }
    }
    const data = await reportDataService.getMultiProjectFinalReport(ids, dateFrom as string, dateTo as string);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ [Reports V2] خطأ في التقرير المجمع:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

reportRouter.get('/reports/v2/export/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { format, project_id, date, worker_id, dateFrom, dateTo } = req.query;

    if (!format || !['pdf', 'xlsx'].includes(format as string)) {
      return res.status(400).json({ success: false, error: 'صيغة التصدير مطلوبة (pdf أو xlsx)' });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    if (type === 'daily') {
      if (!project_id || !date) {
        return res.status(400).json({ success: false, error: 'معرف المشروع والتاريخ مطلوبان' });
      }
      if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
      }
      const data = await reportDataService.getDailyReport(project_id as string, date as string);
      if (format === 'xlsx') {
        const buffer = await generateDailyReportExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="daily-report-${date}.xlsx"`);
        return res.send(Buffer.from(buffer));
      } else {
        const html = generateDailyReportHTML(data);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    if (type === 'worker-statement') {
      if (!worker_id) {
        return res.status(400).json({ success: false, error: 'معرف العامل مطلوب' });
      }
      if (project_id && project_id !== 'all' && !isAdminUser && !accessibleIds.includes(project_id as string)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
      }
      const data = await reportDataService.getWorkerStatement(worker_id as string, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        projectId: project_id as string,
        accessibleProjectIds: accessibleIds,
        isAdmin: isAdminUser
      });
      if (format === 'xlsx') {
        const buffer = await generateWorkerStatementExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const safeWorkerName = encodeURIComponent(data.worker?.name || 'worker');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''worker-statement-${safeWorkerName}.xlsx`);
        return res.send(Buffer.from(buffer));
      } else {
        const html = generateWorkerStatementHTML(data);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    if (type === 'daily-range') {
      if (!project_id || !dateFrom || !dateTo) {
        return res.status(400).json({ success: false, error: 'معرف المشروع وفترة التاريخ مطلوبة' });
      }
      if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
      }
      const from = new Date(dateFrom as string);
      const to = new Date(dateTo as string);
      const dates: string[] = [];
      const current = new Date(from);
      while (current <= to) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      const allReports: any[] = [];
      for (const d of dates) {
        try {
          const data = await reportDataService.getDailyReport(project_id as string, d);
          if (data) allReports.push(data);
        } catch { /* skip */ }
      }

      if (format === 'xlsx') {
        const buffer = await generateDailyRangeExcel(allReports);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="daily-range-${dateFrom}-${dateTo}.xlsx"`);
        return res.send(buffer);
      } else {
        const html = generateDailyRangeHTML(allReports, dateFrom as string, dateTo as string);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    if (type === 'period-final') {
      if (!project_id || !dateFrom || !dateTo) {
        return res.status(400).json({ success: false, error: 'معرف المشروع وفترة التاريخ مطلوبة' });
      }
      if (!isAdminUser && !accessibleIds.includes(project_id as string)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
      }
      const data = await reportDataService.getPeriodFinalReport(project_id as string, dateFrom as string, dateTo as string);
      if (format === 'xlsx') {
        const buffer = await generatePeriodFinalExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="period-report-${dateFrom}-${dateTo}.xlsx"`);
        return res.send(Buffer.from(buffer));
      } else {
        const html = generatePeriodFinalHTML(data);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    if (type === 'multi-project-final') {
      const { project_ids } = req.query;
      if (!project_ids || !dateFrom || !dateTo) {
        return res.status(400).json({ success: false, error: 'معرفات المشاريع وفترة التاريخ مطلوبة' });
      }
      const ids = (project_ids as string).split(',').filter(Boolean);
      if (ids.length < 1) {
        return res.status(400).json({ success: false, error: 'يجب تحديد مشروع واحد على الأقل' });
      }
      if (!isAdminUser) {
        const unauthorized = ids.filter(id => !accessibleIds.includes(id));
        if (unauthorized.length > 0) {
          return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
        }
      }
      const data = await reportDataService.getMultiProjectFinalReport(ids, dateFrom as string, dateTo as string);
      if (format === 'xlsx') {
        const buffer = await generateMultiProjectFinalExcel(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="multi-project-report-${dateFrom}-${dateTo}.xlsx"`);
        return res.send(Buffer.from(buffer));
      } else {
        const html = generateMultiProjectFinalHTML(data);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    }

    return res.status(400).json({ success: false, error: 'نوع التقرير غير صالح' });
  } catch (error: any) {
    console.error('❌ [Reports V2] خطأ في التصدير:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
