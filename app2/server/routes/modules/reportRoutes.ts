/**
 * مسارات التقارير الاحترافية
 * Professional Reports API Routes
 * نظام تقارير متكامل يضاهي المنصات العالمية
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, and, sql, gte, lte, desc, asc, between } from 'drizzle-orm';
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

export const reportRouter = express.Router();

reportRouter.use(requireAuth);

/**
 * 📊 تقرير يومي شامل
 * Daily Comprehensive Report
 */
reportRouter.get('/reports/daily', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId, date } = req.query;

    if (!projectId || !date) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع والتاريخ مطلوبان',
        processingTime: Date.now() - startTime
      });
    }

    const dateStr = date as string;

    // جلب بيانات الحضور والأجور
    const attendanceData = await db
      .select({
        workerId: workerAttendance.workerId,
        workerName: workers.name,
        workerType: workers.type,
        workDays: workerAttendance.workDays,
        dailyWage: workerAttendance.dailyWage,
        actualWage: workerAttendance.actualWage,
        paidAmount: workerAttendance.paidAmount,
        remainingAmount: workerAttendance.remainingAmount,
        workDescription: workerAttendance.workDescription
      })
      .from(workerAttendance)
      .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
      .where(
        and(
          eq(workerAttendance.projectId, projectId as string),
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
          eq(materialPurchases.projectId, projectId as string),
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
      .leftJoin(workers, eq(transportationExpenses.workerId, workers.id))
      .where(
        and(
          eq(transportationExpenses.projectId, projectId as string),
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
          eq(workerMiscExpenses.projectId, projectId as string),
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
      .leftJoin(workers, eq(workerTransfers.workerId, workers.id))
      .where(
        and(
          eq(workerTransfers.projectId, projectId as string),
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
          eq(fundTransfers.projectId, projectId as string),
          sql`DATE(${fundTransfers.transferDate}) = ${dateStr}`
        )
      );

    // حساب الإجماليات
    const totalWorkerWages = attendanceData.reduce((sum, a) => sum + parseFloat(a.actualWage || '0'), 0);
    const totalPaidWages = attendanceData.reduce((sum, a) => sum + parseFloat(a.paidAmount || '0'), 0);
    const totalWorkDays = attendanceData.reduce((sum, a) => sum + parseFloat(a.workDays || '0'), 0);
    const totalMaterials = materialsData.reduce((sum, m) => sum + parseFloat(m.totalAmount || '0'), 0);
    const totalTransport = transportData.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const totalMiscExpenses = miscExpensesData.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
    const totalTransfers = transfersData.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const totalFundTransfers = fundTransfersData.reduce((sum, f) => sum + parseFloat(f.amount || '0'), 0);

    const totalExpenses = totalPaidWages + totalMaterials + totalTransport + totalMiscExpenses + totalTransfers;
    const balance = totalFundTransfers - totalExpenses;

    // جلب اسم المشروع
    const projectInfo = await db.select().from(projects).where(eq(projects.id, projectId as string)).limit(1);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        project: projectInfo[0] || null,
        date: dateStr,
        summary: {
          totalWorkers: attendanceData.length,
          totalWorkDays,
          totalWorkerWages,
          totalPaidWages,
          totalMaterials,
          totalTransport,
          totalMiscExpenses,
          totalTransfers,
          totalFundTransfers,
          totalExpenses,
          balance
        },
        kpis: {
          averageWagePerDay: totalWorkDays > 0 ? totalWorkerWages / totalWorkDays : 0,
          materialsPercentage: totalExpenses > 0 ? (totalMaterials / totalExpenses) * 100 : 0,
          wagesPercentage: totalExpenses > 0 ? (totalPaidWages / totalExpenses) * 100 : 0,
          transportPercentage: totalExpenses > 0 ? (totalTransport / totalExpenses) * 100 : 0
        },
        details: {
          attendance: attendanceData,
          materials: materialsData,
          transport: transportData,
          miscExpenses: miscExpensesData,
          workerTransfers: transfersData,
          fundTransfers: fundTransfersData
        }
      },
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
    const { projectId, dateFrom, dateTo, groupBy = 'day' } = req.query;

    if (!projectId || !dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع وفترة التاريخ مطلوبة',
        processingTime: Date.now() - startTime
      });
    }

    const dateFromStr = dateFrom as string;
    const dateToStr = dateTo as string;

    // جلب بيانات الحضور المجمعة
    const attendanceSummary = await db
      .select({
        date: workerAttendance.attendanceDate,
        totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalWages: sql<number>`COALESCE(SUM(CAST(${workerAttendance.actualWage} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
        workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.workerId})`
      })
      .from(workerAttendance)
      .where(
        and(
          eq(workerAttendance.projectId, projectId as string),
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
          eq(materialPurchases.projectId, projectId as string),
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
          eq(transportationExpenses.projectId, projectId as string),
          gte(transportationExpenses.date, dateFromStr),
          lte(transportationExpenses.date, dateToStr)
        )
      )
      .groupBy(transportationExpenses.date)
      .orderBy(asc(transportationExpenses.date));

    // جلب بيانات تحويلات العهدة
    const fundTransfersSummary = await db
      .select({
        date: sql<string>`DATE(${fundTransfers.transferDate})`,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${fundTransfers.amount} AS DECIMAL)), 0)`,
        transferCount: sql<number>`COUNT(*)`
      })
      .from(fundTransfers)
      .where(
        and(
          eq(fundTransfers.projectId, projectId as string),
          gte(sql`DATE(${fundTransfers.transferDate})`, dateFromStr),
          lte(sql`DATE(${fundTransfers.transferDate})`, dateToStr)
        )
      )
      .groupBy(sql`DATE(${fundTransfers.transferDate})`)
      .orderBy(asc(sql`DATE(${fundTransfers.transferDate})`));

    // حساب الإجماليات الكلية
    const totalWorkDays = attendanceSummary.reduce((sum, a) => sum + Number(a.totalWorkDays), 0);
    const totalWages = attendanceSummary.reduce((sum, a) => sum + Number(a.totalWages), 0);
    const totalPaidWages = attendanceSummary.reduce((sum, a) => sum + Number(a.totalPaid), 0);
    const totalMaterials = materialsSummary.reduce((sum, m) => sum + Number(m.totalAmount), 0);
    const totalTransport = transportSummary.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const totalFundTransfers = fundTransfersSummary.reduce((sum, f) => sum + Number(f.totalAmount), 0);
    const uniqueWorkers = Math.max(...attendanceSummary.map(a => Number(a.workerCount)), 0);
    const activeDays = attendanceSummary.length;
    const totalExpenses = totalPaidWages + totalMaterials + totalTransport;
    const balance = totalFundTransfers - totalExpenses;

    const totalStats = {
      totalWorkDays,
      totalWages,
      totalPaidWages,
      totalMaterials,
      totalTransport,
      totalFundTransfers,
      uniqueWorkers,
      activeDays,
      totalExpenses,
      balance
    };

    // جلب اسم المشروع
    const projectInfo = await db.select().from(projects).where(eq(projects.id, projectId as string)).limit(1);

    // بناء بيانات الرسم البياني
    const chartData = attendanceSummary.map(day => {
      const materialDay = materialsSummary.find(m => m.date === day.date);
      const transportDay = transportSummary.find(t => t.date === day.date);
      const fundDay = fundTransfersSummary.find(f => f.date === day.date);

      return {
        date: day.date,
        wages: Number(day.totalPaid),
        materials: materialDay ? Number(materialDay.totalAmount) : 0,
        transport: transportDay ? Number(transportDay.totalAmount) : 0,
        income: fundDay ? Number(fundDay.totalAmount) : 0,
        total: Number(day.totalPaid) + (materialDay ? Number(materialDay.totalAmount) : 0) + (transportDay ? Number(transportDay.totalAmount) : 0)
      };
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        project: projectInfo[0] || null,
        period: { from: dateFromStr, to: dateToStr },
        summary: totalStats,
        chartData,
        dailyBreakdown: {
          attendance: attendanceSummary,
          materials: materialsSummary,
          transport: transportSummary,
          fundTransfers: fundTransfersSummary
        }
      },
      processingTime: duration
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
 * 🏗️ ملخص المشروع الشامل
 * Project Summary Report
 */
reportRouter.get('/reports/project-summary/:projectId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectId } = req.params;
    const { dateFrom, dateTo } = req.query;

    // جلب معلومات المشروع
    const projectInfo = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

    if (!projectInfo.length) {
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود',
        processingTime: Date.now() - startTime
      });
    }

    let dateConditions: any[] = [eq(workerAttendance.projectId, projectId)];
    if (dateFrom && dateTo) {
      dateConditions.push(gte(workerAttendance.attendanceDate, dateFrom as string));
      dateConditions.push(lte(workerAttendance.attendanceDate, dateTo as string));
    }

    // إجمالي الحضور والأجور
    const attendanceStats = await db
      .select({
        totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalWages: sql<number>`COALESCE(SUM(CAST(${workerAttendance.actualWage} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
        totalRemaining: sql<number>`COALESCE(SUM(CAST(${workerAttendance.remainingAmount} AS DECIMAL)), 0)`,
        uniqueWorkers: sql<number>`COUNT(DISTINCT ${workerAttendance.workerId})`,
        activeDays: sql<number>`COUNT(DISTINCT ${workerAttendance.attendanceDate})`
      })
      .from(workerAttendance)
      .where(and(...dateConditions));

    // إجمالي المشتريات
    let materialConditions: any[] = [eq(materialPurchases.projectId, projectId)];
    if (dateFrom && dateTo) {
      materialConditions.push(gte(materialPurchases.purchaseDate, dateFrom as string));
      materialConditions.push(lte(materialPurchases.purchaseDate, dateTo as string));
    }

    const materialsStats = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${materialPurchases.paidAmount} AS DECIMAL)), 0)`,
        totalRemaining: sql<number>`COALESCE(SUM(CAST(${materialPurchases.remainingAmount} AS DECIMAL)), 0)`,
        purchaseCount: sql<number>`COUNT(*)`
      })
      .from(materialPurchases)
      .where(and(...materialConditions));

    // إجمالي النقل
    let transportConditions: any[] = [eq(transportationExpenses.projectId, projectId)];
    if (dateFrom && dateTo) {
      transportConditions.push(gte(transportationExpenses.date, dateFrom as string));
      transportConditions.push(lte(transportationExpenses.date, dateTo as string));
    }

    const transportStats = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(CAST(${transportationExpenses.amount} AS DECIMAL)), 0)`,
        tripCount: sql<number>`COUNT(*)`
      })
      .from(transportationExpenses)
      .where(and(...transportConditions));

    // إجمالي تحويلات العهدة
    const fundTransfersStats = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(CAST(${fundTransfers.amount} AS DECIMAL)), 0)`,
        transferCount: sql<number>`COUNT(*)`
      })
      .from(fundTransfers)
      .where(eq(fundTransfers.projectId, projectId));

    // إجمالي حوالات العمال
    const workerTransfersStats = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
        transferCount: sql<number>`COUNT(*)`
      })
      .from(workerTransfers)
      .where(eq(workerTransfers.projectId, projectId));

    // حساب الملخص النهائي
    const totalIncome = Number(fundTransfersStats[0]?.totalAmount || 0);
    const totalWagesPaid = Number(attendanceStats[0]?.totalPaid || 0);
    const totalMaterials = Number(materialsStats[0]?.totalAmount || 0);
    const totalTransport = Number(transportStats[0]?.totalAmount || 0);
    const totalWorkerTransfers = Number(workerTransfersStats[0]?.totalAmount || 0);

    const totalExpenses = totalWagesPaid + totalMaterials + totalTransport + totalWorkerTransfers;
    const currentBalance = totalIncome - totalExpenses;

    // توزيع المصروفات للرسم البياني الدائري
    const expenseBreakdown = [
      { name: 'أجور العمال', value: totalWagesPaid, color: '#3B82F6' },
      { name: 'مشتريات المواد', value: totalMaterials, color: '#10B981' },
      { name: 'مصاريف النقل', value: totalTransport, color: '#F59E0B' },
      { name: 'حوالات العمال', value: totalWorkerTransfers, color: '#EF4444' }
    ].filter(item => item.value > 0);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        project: projectInfo[0],
        period: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : 'all',
        financial: {
          totalIncome,
          totalExpenses,
          currentBalance,
          profitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(2) : 0
        },
        categories: {
          wages: {
            total: Number(attendanceStats[0]?.totalWages || 0),
            paid: totalWagesPaid,
            remaining: Number(attendanceStats[0]?.totalRemaining || 0)
          },
          materials: {
            total: totalMaterials,
            paid: Number(materialsStats[0]?.totalPaid || 0),
            remaining: Number(materialsStats[0]?.totalRemaining || 0),
            purchaseCount: Number(materialsStats[0]?.purchaseCount || 0)
          },
          transport: {
            total: totalTransport,
            tripCount: Number(transportStats[0]?.tripCount || 0)
          },
          workerTransfers: {
            total: totalWorkerTransfers,
            count: Number(workerTransfersStats[0]?.transferCount || 0)
          },
          fundTransfers: {
            total: totalIncome,
            count: Number(fundTransfersStats[0]?.transferCount || 0)
          }
        },
        workforce: {
          uniqueWorkers: Number(attendanceStats[0]?.uniqueWorkers || 0),
          totalWorkDays: Number(attendanceStats[0]?.totalWorkDays || 0),
          activeDays: Number(attendanceStats[0]?.activeDays || 0),
          avgWorkersPerDay: Number(attendanceStats[0]?.activeDays || 0) > 0 
            ? (Number(attendanceStats[0]?.totalWorkDays || 0) / Number(attendanceStats[0]?.activeDays || 0)).toFixed(2) 
            : 0
        },
        charts: {
          expenseBreakdown
        }
      },
      processingTime: duration
    });

  } catch (error: any) {
    console.error('❌ [Reports] خطأ في ملخص المشروع:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب ملخص المشروع',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 🔄 مقارنة المشاريع
 * Projects Comparison Report
 */
reportRouter.get('/reports/projects-comparison', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { projectIds, dateFrom, dateTo } = req.query;

    if (!projectIds) {
      return res.status(400).json({
        success: false,
        error: 'معرفات المشاريع مطلوبة',
        processingTime: Date.now() - startTime
      });
    }

    const projectIdArray = (projectIds as string).split(',');

    const comparisonData = await Promise.all(
      projectIdArray.map(async (projectId) => {
        // جلب معلومات المشروع
        const projectInfo = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

        if (!projectInfo.length) return null;

        // بناء شروط التاريخ
        let dateConditions: any[] = [eq(workerAttendance.projectId, projectId)];
        if (dateFrom && dateTo) {
          dateConditions.push(gte(workerAttendance.attendanceDate, dateFrom as string));
          dateConditions.push(lte(workerAttendance.attendanceDate, dateTo as string));
        }

        // إحصائيات الحضور
        const attendanceStats = await db
          .select({
            totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
            totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
            workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.workerId})`
          })
          .from(workerAttendance)
          .where(and(...dateConditions));

        // إحصائيات المواد
        let materialConditions: any[] = [eq(materialPurchases.projectId, projectId)];
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
        let transportConditions: any[] = [eq(transportationExpenses.projectId, projectId)];
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
          .where(eq(fundTransfers.projectId, projectId));

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
reportRouter.get('/reports/worker-statement/:workerId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { workerId } = req.params;
    const { projectId, dateFrom, dateTo } = req.query;

    // جلب معلومات العامل
    const workerInfo = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);

    if (!workerInfo.length) {
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        processingTime: Date.now() - startTime
      });
    }

    // بناء شروط الاستعلام
    let conditions: any[] = [eq(workerAttendance.workerId, workerId)];
    if (projectId) {
      conditions.push(eq(workerAttendance.projectId, projectId as string));
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
        projectId: workerAttendance.projectId,
        projectName: projects.name,
        workDays: workerAttendance.workDays,
        dailyWage: workerAttendance.dailyWage,
        actualWage: workerAttendance.actualWage,
        paidAmount: workerAttendance.paidAmount,
        remainingAmount: workerAttendance.remainingAmount,
        workDescription: workerAttendance.workDescription
      })
      .from(workerAttendance)
      .leftJoin(projects, eq(workerAttendance.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(workerAttendance.attendanceDate));

    // جلب حوالات العامل
    let transferConditions: any[] = [eq(workerTransfers.workerId, workerId)];
    if (projectId) {
      transferConditions.push(eq(workerTransfers.projectId, projectId as string));
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
      .leftJoin(projects, eq(workerTransfers.projectId, projects.id))
      .where(and(...transferConditions))
      .orderBy(desc(workerTransfers.transferDate));

    // حساب الإجماليات
    const totalWorkDays = attendanceRecords.reduce((sum, r) => sum + parseFloat(r.workDays || '0'), 0);
    const totalEarned = attendanceRecords.reduce((sum, r) => sum + parseFloat(r.actualWage || '0'), 0);
    const totalPaid = attendanceRecords.reduce((sum, r) => sum + parseFloat(r.paidAmount || '0'), 0);
    const totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const remainingBalance = totalEarned - totalPaid - totalTransfers;

    // بيانات الرسم البياني
    const chartData = attendanceRecords.map(r => ({
      date: r.date,
      earned: parseFloat(r.actualWage || '0'),
      paid: parseFloat(r.paidAmount || '0'),
      workDays: parseFloat(r.workDays || '0')
    })).reverse();

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
    const { projectId } = req.query;

    // الحصول على التاريخ الحالي وتاريخ بداية الشهر
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    let projectCondition = projectId ? eq(workerAttendance.projectId, projectId as string) : sql`1=1`;

    // إحصائيات اليوم
    const todayStats = await db
      .select({
        workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.workerId})`,
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

    // إحصائيات الشهر
    const monthStats = await db
      .select({
        workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.workerId})`,
        totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
        totalWages: sql<number>`COALESCE(SUM(CAST(${workerAttendance.actualWage} AS DECIMAL)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
        activeDays: sql<number>`COUNT(DISTINCT ${workerAttendance.attendanceDate})`
      })
      .from(workerAttendance)
      .where(
        and(
          projectCondition,
          gte(workerAttendance.attendanceDate, startOfMonth),
          lte(workerAttendance.attendanceDate, endOfMonth)
        )
      );

    // مشتريات الشهر
    let materialProjectCondition = projectId ? eq(materialPurchases.projectId, projectId as string) : sql`1=1`;
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
      .where(eq(workers.isActive, true));

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
