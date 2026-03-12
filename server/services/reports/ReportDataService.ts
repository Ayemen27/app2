import { eq, and, sql, gte, lte, desc, asc, inArray } from 'drizzle-orm';
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
} from '@shared/schema';
import type {
  DailyReportData,
  WorkerStatementData,
  WorkerStatementEntry,
  PeriodFinalReportData,
  ReportKPI,
  ReportChartDataPoint,
  AttendanceRecord,
  MaterialRecord,
  TransportRecord,
  MiscExpenseRecord,
  WorkerTransferRecord,
  FundTransferRecord,
} from '../../../shared/report-types';

const SAFE_DATE_EXPR = (col: any) =>
  sql`(CASE WHEN ${col} IS NULL OR ${col}::text = '' OR ${col}::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE ${col}::date END)`;

function safeNum(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

interface WorkerStatementOptions {
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  accessibleProjectIds?: string[];
  isAdmin?: boolean;
}

export class ReportDataService {
  async getDailyReport(projectId: string, date: string): Promise<DailyReportData> {
    const [projectInfo, attendanceData, materialsData, transportData, miscExpensesData, transfersData, fundTransfersData, projectFundTransfersData] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),

      db
        .select({
          worker_id: workerAttendance.worker_id,
          workerName: workers.name,
          workerType: workers.type,
          workDays: workerAttendance.workDays,
          dailyWage: workerAttendance.dailyWage,
          actualWage: workerAttendance.actualWage,
          paidAmount: workerAttendance.paidAmount,
          remainingAmount: workerAttendance.remainingAmount,
          workDescription: workerAttendance.workDescription,
        })
        .from(workerAttendance)
        .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
        .where(and(eq(workerAttendance.project_id, projectId), eq(workerAttendance.attendanceDate, date))),

      db
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
          purchaseType: materialPurchases.purchaseType,
        })
        .from(materialPurchases)
        .where(and(eq(materialPurchases.project_id, projectId), eq(materialPurchases.purchaseDate, date))),

      db
        .select({
          id: transportationExpenses.id,
          amount: transportationExpenses.amount,
          description: transportationExpenses.description,
          workerName: workers.name,
        })
        .from(transportationExpenses)
        .leftJoin(workers, eq(transportationExpenses.worker_id, workers.id))
        .where(and(eq(transportationExpenses.project_id, projectId), eq(transportationExpenses.date, date))),

      db
        .select({
          id: workerMiscExpenses.id,
          amount: workerMiscExpenses.amount,
          description: workerMiscExpenses.description,
          notes: workerMiscExpenses.notes,
        })
        .from(workerMiscExpenses)
        .where(and(eq(workerMiscExpenses.project_id, projectId), eq(workerMiscExpenses.date, date))),

      db
        .select({
          id: workerTransfers.id,
          workerName: workers.name,
          amount: workerTransfers.amount,
          recipientName: workerTransfers.recipientName,
          transferMethod: workerTransfers.transferMethod,
        })
        .from(workerTransfers)
        .leftJoin(workers, eq(workerTransfers.worker_id, workers.id))
        .where(and(eq(workerTransfers.project_id, projectId), eq(workerTransfers.transferDate, date))),

      db
        .select({
          id: fundTransfers.id,
          amount: fundTransfers.amount,
          senderName: fundTransfers.senderName,
          transferType: fundTransfers.transferType,
          transferNumber: fundTransfers.transferNumber,
        })
        .from(fundTransfers)
        .where(
          and(
            eq(fundTransfers.project_id, projectId),
            sql`${SAFE_DATE_EXPR(fundTransfers.transferDate)} = ${date}::date`
          )
        ),

      db
        .select({
          id: projectFundTransfers.id,
          amount: projectFundTransfers.amount,
          description: projectFundTransfers.description,
          transferReason: projectFundTransfers.transferReason,
          fromProjectId: projectFundTransfers.fromProjectId,
          fromProjectName: projects.name,
        })
        .from(projectFundTransfers)
        .leftJoin(projects, eq(projectFundTransfers.fromProjectId, projects.id))
        .where(
          and(
            eq(projectFundTransfers.toProjectId, projectId),
            eq(projectFundTransfers.transferDate, date)
          )
        ),
    ]);

    const proj = projectInfo[0];

    const attendance: AttendanceRecord[] = attendanceData.map((a) => {
      const dw = safeNum(a.dailyWage);
      const wd = safeNum(a.workDays);
      const totalWage = dw * wd;
      const paid = safeNum(a.paidAmount);
      return {
        workerId: a.worker_id,
        workerName: a.workerName || '-',
        workerType: a.workerType || '-',
        workDays: wd,
        dailyWage: dw,
        totalWage,
        paidAmount: paid,
        remainingAmount: totalWage - paid,
        workDescription: a.workDescription || '',
      };
    });

    const materials: MaterialRecord[] = materialsData.map((m) => ({
      id: typeof m.id === 'string' ? parseInt(m.id, 10) || 0 : (m.id as number),
      materialName: m.materialName || '-',
      category: m.materialCategory || '-',
      quantity: safeNum(m.quantity),
      unit: m.unit || '-',
      unitPrice: safeNum(m.unitPrice),
      totalAmount: safeNum(m.totalAmount),
      paidAmount: safeNum(m.paidAmount),
      remainingAmount: safeNum(m.remainingAmount),
      supplierName: m.supplierName || '-',
      purchaseType: m.purchaseType || '-',
    }));

    const transport: TransportRecord[] = transportData.map((t) => ({
      id: typeof t.id === 'string' ? parseInt(t.id, 10) || 0 : (t.id as number),
      amount: safeNum(t.amount),
      description: t.description || '',
      workerName: t.workerName || '-',
    }));

    const miscExpenses: MiscExpenseRecord[] = miscExpensesData.map((e) => ({
      id: typeof e.id === 'string' ? parseInt(e.id, 10) || 0 : (e.id as number),
      amount: safeNum(e.amount),
      description: e.description || '',
      notes: e.notes || '',
    }));

    const workerTransfersList: WorkerTransferRecord[] = transfersData.map((t) => ({
      id: typeof t.id === 'string' ? parseInt(t.id, 10) || 0 : (t.id as number),
      workerName: t.workerName || '-',
      amount: safeNum(t.amount),
      recipientName: t.recipientName || '-',
      transferMethod: t.transferMethod || '-',
    }));

    const fundTransfersList: FundTransferRecord[] = [
      ...fundTransfersData.map((f) => ({
        id: typeof f.id === 'string' ? parseInt(f.id, 10) || 0 : (f.id as number),
        amount: safeNum(f.amount),
        senderName: f.senderName || '-',
        transferType: f.transferType || '-',
        transferNumber: f.transferNumber || '-',
      })),
      ...projectFundTransfersData.map((pf) => ({
        id: typeof pf.id === 'string' ? parseInt(pf.id, 10) || 0 : 0,
        amount: safeNum(pf.amount),
        senderName: pf.fromProjectName || 'مشروع آخر',
        transferType: 'ترحيل من مشروع',
        transferNumber: pf.description || pf.transferReason || '-',
      })),
    ];

    const totalWorkerWages = attendance.reduce((s, a) => s + a.totalWage, 0);
    const totalPaidWages = attendance.reduce((s, a) => s + a.paidAmount, 0);
    const totalWorkDays = attendance.reduce((s, a) => s + a.workDays, 0);
    const totalMaterials = materials.reduce((s, m) => s + m.totalAmount, 0);
    const totalTransport = transport.reduce((s, t) => s + t.amount, 0);
    const totalMiscExpenses = miscExpenses.reduce((s, e) => s + e.amount, 0);
    const totalWorkerTransfers = workerTransfersList.reduce((s, t) => s + t.amount, 0);
    const totalFundTransfers = fundTransfersList.reduce((s, f) => s + f.amount, 0);
    const totalExpenses = totalPaidWages + totalMaterials + totalTransport + totalMiscExpenses + totalWorkerTransfers;
    const balance = totalFundTransfers - totalExpenses;

    const kpis: ReportKPI[] = [
      { label: 'إجمالي أجور العمال', value: totalWorkerWages, format: 'currency' },
      { label: 'إجمالي المدفوع', value: totalPaidWages, format: 'currency' },
      { label: 'إجمالي المواد', value: totalMaterials, format: 'currency' },
      { label: 'إجمالي النقل', value: totalTransport, format: 'currency' },
      { label: 'إجمالي النثريات', value: totalMiscExpenses, format: 'currency' },
      { label: 'إجمالي الحوالات', value: totalWorkerTransfers, format: 'currency' },
      { label: 'إجمالي تحويلات العهدة', value: totalFundTransfers, format: 'currency' },
      { label: 'إجمالي المصروفات', value: totalExpenses, format: 'currency' },
      { label: 'الرصيد', value: balance, format: 'currency' },
      { label: 'عدد العمال', value: attendance.length, format: 'number' },
      { label: 'إجمالي أيام العمل', value: totalWorkDays, format: 'number' },
    ];

    return {
      reportType: 'daily',
      generatedAt: new Date().toISOString(),
      project: {
        id: proj?.id || projectId,
        name: proj?.name || '-',
        location: proj?.location || undefined,
        engineerName: undefined,
        managerName: proj?.managerName || undefined,
      },
      date,
      kpis,
      attendance,
      materials,
      transport,
      miscExpenses,
      workerTransfers: workerTransfersList,
      fundTransfers: fundTransfersList,
      totals: {
        totalWorkerWages,
        totalPaidWages,
        totalMaterials,
        totalTransport,
        totalMiscExpenses,
        totalWorkerTransfers,
        totalFundTransfers,
        totalExpenses,
        balance,
        workerCount: attendance.length,
        totalWorkDays,
      },
    };
  }

  async getWorkerStatement(workerId: string, options: WorkerStatementOptions = {}): Promise<WorkerStatementData> {
    const { dateFrom, dateTo, projectId, accessibleProjectIds, isAdmin } = options;

    const workerRows = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    if (!workerRows.length) {
      throw new Error('العامل غير موجود');
    }
    const worker = workerRows[0];

    const attendanceFilters: any[] = [eq(workerAttendance.worker_id, workerId)];
    const transferFilters: any[] = [eq(workerTransfers.worker_id, workerId)];

    if (projectId && projectId !== 'all') {
      if (!isAdmin && accessibleProjectIds && !accessibleProjectIds.includes(projectId)) {
        attendanceFilters.push(sql`1=0`);
        transferFilters.push(sql`1=0`);
      } else {
        attendanceFilters.push(eq(workerAttendance.project_id, projectId));
        transferFilters.push(eq(workerTransfers.project_id, projectId));
      }
    } else if (!isAdmin && accessibleProjectIds && accessibleProjectIds.length > 0) {
      attendanceFilters.push(inArray(workerAttendance.project_id, accessibleProjectIds));
      transferFilters.push(inArray(workerTransfers.project_id, accessibleProjectIds));
    } else if (!isAdmin) {
      attendanceFilters.push(sql`1=0`);
      transferFilters.push(sql`1=0`);
    }

    if (dateFrom) {
      attendanceFilters.push(gte(workerAttendance.attendanceDate, dateFrom));
      transferFilters.push(gte(workerTransfers.transferDate, dateFrom));
    }
    if (dateTo) {
      attendanceFilters.push(lte(workerAttendance.attendanceDate, dateTo));
      transferFilters.push(lte(workerTransfers.transferDate, dateTo));
    }

    const [attendanceRows, transferRows] = await Promise.all([
      db
        .select({
          attendanceDate: workerAttendance.attendanceDate,
          workDescription: workerAttendance.workDescription,
          dailyWage: workerAttendance.dailyWage,
          paidAmount: workerAttendance.paidAmount,
          workDays: workerAttendance.workDays,
          projectName: projects.name,
          project_id: workerAttendance.project_id,
        })
        .from(workerAttendance)
        .leftJoin(projects, eq(workerAttendance.project_id, projects.id))
        .where(and(...attendanceFilters))
        .orderBy(asc(workerAttendance.attendanceDate)),

      db
        .select({
          transferDate: workerTransfers.transferDate,
          recipientName: workerTransfers.recipientName,
          amount: workerTransfers.amount,
          transferNumber: workerTransfers.transferNumber,
          projectName: projects.name,
          project_id: workerTransfers.project_id,
        })
        .from(workerTransfers)
        .leftJoin(projects, eq(workerTransfers.project_id, projects.id))
        .where(and(...transferFilters))
        .orderBy(asc(workerTransfers.transferDate)),
    ]);

    const rawEntries: Array<{
      date: string;
      type: 'عمل' | 'حوالة' | 'دفعة';
      description: string;
      projectName: string;
      workDays: number;
      debit: number;
      credit: number;
      reference: string;
    }> = [];

    for (const a of attendanceRows) {
      const days = safeNum(a.workDays);
      const wage = safeNum(a.dailyWage);
      const earned = days * wage;
      const paid = safeNum(a.paidAmount);

      if (days > 0) {
        rawEntries.push({
          date: a.attendanceDate,
          type: 'عمل',
          description: a.workDescription || 'تنفيذ مهام العمل الموكلة',
          projectName: a.projectName || '-',
          workDays: days,
          debit: earned,
          credit: 0,
          reference: 'حضور',
        });
      }

      if (paid > 0) {
        rawEntries.push({
          date: a.attendanceDate,
          type: 'دفعة',
          description: 'دفعة نقدية',
          projectName: a.projectName || '-',
          workDays: 0,
          debit: 0,
          credit: paid,
          reference: 'صرف',
        });
      }
    }

    for (const t of transferRows) {
      rawEntries.push({
        date: t.transferDate,
        type: 'حوالة',
        description: `حوالة لـ ${t.recipientName}`,
        projectName: t.projectName || '-',
        workDays: 0,
        debit: 0,
        credit: safeNum(t.amount),
        reference: t.transferNumber || 'حوالة',
      });
    }

    rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const statement: WorkerStatementEntry[] = rawEntries.map((item) => {
      runningBalance += item.debit - item.credit;
      return {
        date: item.date,
        type: item.type,
        description: item.description,
        projectName: item.projectName,
        workDays: item.workDays,
        debit: item.debit,
        credit: item.credit,
        balance: runningBalance,
        reference: item.reference,
      };
    });

    const projectMap = new Map<string, { projectName: string; totalDays: number; totalEarned: number; totalPaid: number }>();

    for (const a of attendanceRows) {
      const pName = a.projectName || '-';
      const key = a.project_id || pName;
      const existing = projectMap.get(key) || { projectName: pName, totalDays: 0, totalEarned: 0, totalPaid: 0 };
      const days = safeNum(a.workDays);
      const wage = safeNum(a.dailyWage);
      existing.totalDays += days;
      existing.totalEarned += days * wage;
      existing.totalPaid += safeNum(a.paidAmount);
      projectMap.set(key, existing);
    }

    for (const t of transferRows) {
      const pName = t.projectName || '-';
      const key = t.project_id || pName;
      const existing = projectMap.get(key) || { projectName: pName, totalDays: 0, totalEarned: 0, totalPaid: 0 };
      existing.totalPaid += safeNum(t.amount);
      projectMap.set(key, existing);
    }

    const projectSummary = Array.from(projectMap.values()).map((p) => ({
      projectName: p.projectName,
      totalDays: p.totalDays,
      totalEarned: p.totalEarned,
      totalPaid: p.totalPaid,
      balance: p.totalEarned - p.totalPaid,
    }));

    const totalWorkDays = statement.reduce((s, i) => s + i.workDays, 0);
    const totalEarned = statement.reduce((s, i) => s + i.debit, 0);
    const totalPaid = statement.reduce((s, i) => s + i.credit, 0);
    const totalTransfers = transferRows.reduce((s, t) => s + safeNum(t.amount), 0);
    const finalBalance = totalEarned - totalPaid;

    const kpis: ReportKPI[] = [
      { label: 'إجمالي أيام العمل', value: totalWorkDays, format: 'number' },
      { label: 'إجمالي المستحقات', value: totalEarned, format: 'currency' },
      { label: 'إجمالي المدفوع', value: totalPaid, format: 'currency' },
      { label: 'إجمالي الحوالات', value: totalTransfers, format: 'currency' },
      { label: 'الرصيد النهائي', value: finalBalance, format: 'currency' },
    ];

    const effectiveFrom = dateFrom || (statement.length > 0 ? statement[0].date : new Date().toISOString().split('T')[0]);
    const effectiveTo = dateTo || (statement.length > 0 ? statement[statement.length - 1].date : new Date().toISOString().split('T')[0]);

    return {
      reportType: 'worker-statement',
      generatedAt: new Date().toISOString(),
      worker: {
        id: worker.id,
        name: worker.name,
        type: worker.type,
        dailyWage: safeNum(worker.dailyWage),
        phone: worker.phone || undefined,
        nationality: undefined,
      },
      period: {
        from: effectiveFrom,
        to: effectiveTo,
      },
      kpis,
      statement,
      projectSummary,
      totals: {
        totalWorkDays,
        totalEarned,
        totalPaid,
        totalTransfers,
        finalBalance,
      },
    };
  }

  async getPeriodFinalReport(projectId: string, dateFrom: string, dateTo: string): Promise<PeriodFinalReportData> {
    const [
      projectInfo,
      attendanceSummaryRows,
      attendanceByWorkerRows,
      materialsRows,
      transportRows,
      miscRows,
      fundTransfersRows,
      workerTransfersRows,
    ] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),

      db
        .select({
          date: workerAttendance.attendanceDate,
          totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
          totalWages: sql<number>`COALESCE(SUM(CAST(${workerAttendance.dailyWage} AS DECIMAL) * CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
          workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.worker_id})`,
        })
        .from(workerAttendance)
        .where(
          and(
            eq(workerAttendance.project_id, projectId),
            gte(workerAttendance.attendanceDate, dateFrom),
            lte(workerAttendance.attendanceDate, dateTo)
          )
        )
        .groupBy(workerAttendance.attendanceDate)
        .orderBy(asc(workerAttendance.attendanceDate)),

      db
        .select({
          workerId: workerAttendance.worker_id,
          workerName: workers.name,
          workerType: workers.type,
          totalDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
          totalEarned: sql<number>`COALESCE(SUM(CAST(${workerAttendance.dailyWage} AS DECIMAL) * CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
        })
        .from(workerAttendance)
        .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
        .where(
          and(
            eq(workerAttendance.project_id, projectId),
            gte(workerAttendance.attendanceDate, dateFrom),
            lte(workerAttendance.attendanceDate, dateTo)
          )
        )
        .groupBy(workerAttendance.worker_id, workers.name, workers.type),

      db
        .select({
          materialName: materialPurchases.materialName,
          totalQuantity: sql<number>`COALESCE(SUM(CAST(${materialPurchases.quantity} AS DECIMAL)), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL)), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(CAST(${materialPurchases.paidAmount} AS DECIMAL)), 0)`,
          supplierName: materialPurchases.supplierName,
        })
        .from(materialPurchases)
        .where(
          and(
            eq(materialPurchases.project_id, projectId),
            gte(materialPurchases.purchaseDate, dateFrom),
            lte(materialPurchases.purchaseDate, dateTo)
          )
        )
        .groupBy(materialPurchases.materialName, materialPurchases.supplierName),

      db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${transportationExpenses.amount} AS DECIMAL)), 0)`,
          tripCount: sql<number>`COUNT(*)`,
        })
        .from(transportationExpenses)
        .where(
          and(
            eq(transportationExpenses.project_id, projectId),
            gte(transportationExpenses.date, dateFrom),
            lte(transportationExpenses.date, dateTo)
          )
        ),

      db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${workerMiscExpenses.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(workerMiscExpenses)
        .where(
          and(
            eq(workerMiscExpenses.project_id, projectId),
            gte(workerMiscExpenses.date, dateFrom),
            lte(workerMiscExpenses.date, dateTo)
          )
        ),

      db
        .select({
          date: sql<string>`${SAFE_DATE_EXPR(fundTransfers.transferDate)}::text`,
          amount: fundTransfers.amount,
          senderName: fundTransfers.senderName,
          transferType: fundTransfers.transferType,
        })
        .from(fundTransfers)
        .where(
          and(
            eq(fundTransfers.project_id, projectId),
            gte(sql`${SAFE_DATE_EXPR(fundTransfers.transferDate)}`, dateFrom),
            lte(sql`${SAFE_DATE_EXPR(fundTransfers.transferDate)}`, dateTo)
          )
        )
        .orderBy(asc(sql`${SAFE_DATE_EXPR(fundTransfers.transferDate)}`)),

      db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(workerTransfers)
        .where(
          and(
            eq(workerTransfers.project_id, projectId),
            gte(workerTransfers.transferDate, dateFrom),
            lte(workerTransfers.transferDate, dateTo)
          )
        ),
    ]);

    const transfersByWorkerRows = await db
      .select({
        workerId: workerTransfers.worker_id,
        workerName: workers.name,
        workerType: workers.type,
        totalTransferred: sql<number>`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
      })
      .from(workerTransfers)
      .leftJoin(workers, eq(workerTransfers.worker_id, workers.id))
      .where(
        and(
          eq(workerTransfers.project_id, projectId),
          gte(workerTransfers.transferDate, dateFrom),
          lte(workerTransfers.transferDate, dateTo)
        )
      )
      .groupBy(workerTransfers.worker_id, workers.name, workers.type);

    const projectTransferOutRows = await db
      .select({
        id: projectFundTransfers.id,
        toProjectId: projectFundTransfers.toProjectId,
        toProjectName: projects.name,
        amount: projectFundTransfers.amount,
        transferReason: projectFundTransfers.transferReason,
        transferDate: projectFundTransfers.transferDate,
      })
      .from(projectFundTransfers)
      .leftJoin(projects, eq(projectFundTransfers.toProjectId, projects.id))
      .where(
        and(
          eq(projectFundTransfers.fromProjectId, projectId),
          gte(projectFundTransfers.transferDate, dateFrom),
          lte(projectFundTransfers.transferDate, dateTo)
        )
      )
      .orderBy(asc(projectFundTransfers.transferDate));

    const projectTransferInRows = await db
      .select({
        id: projectFundTransfers.id,
        fromProjectId: projectFundTransfers.fromProjectId,
        fromProjectName: projects.name,
        amount: projectFundTransfers.amount,
        transferReason: projectFundTransfers.transferReason,
        transferDate: projectFundTransfers.transferDate,
      })
      .from(projectFundTransfers)
      .leftJoin(projects, eq(projectFundTransfers.fromProjectId, projects.id))
      .where(
        and(
          eq(projectFundTransfers.toProjectId, projectId),
          gte(projectFundTransfers.transferDate, dateFrom),
          lte(projectFundTransfers.transferDate, dateTo)
        )
      )
      .orderBy(asc(projectFundTransfers.transferDate));

    const proj = projectInfo[0];

    const attendanceSummary = attendanceSummaryRows.map((r) => ({
      date: r.date,
      workerCount: safeNum(r.workerCount),
      totalWorkDays: safeNum(r.totalWorkDays),
      totalWages: safeNum(r.totalWages),
      totalPaid: safeNum(r.totalPaid),
    }));

    const transfersByWorkerMap = new Map<string, number>();
    for (const t of transfersByWorkerRows) {
      transfersByWorkerMap.set(t.workerId, safeNum(t.totalTransferred));
    }

    const allWorkerIds = new Set<string>();
    attendanceByWorkerRows.forEach((r) => allWorkerIds.add(r.workerId));
    transfersByWorkerRows.forEach((r) => allWorkerIds.add(r.workerId));

    const attendanceMap = new Map(attendanceByWorkerRows.map((r) => [r.workerId, r]));

    const attendanceByWorker = Array.from(allWorkerIds).map((wId) => {
      const att = attendanceMap.get(wId);
      const transfer = transfersByWorkerMap.get(wId) || 0;

      if (att) {
        const earned = safeNum(att.totalEarned);
        const directPaid = safeNum(att.totalPaid);
        const totalPaid = directPaid + transfer;
        return {
          workerId: wId,
          workerName: att.workerName || '-',
          workerType: att.workerType || '-',
          totalDays: safeNum(att.totalDays),
          totalEarned: earned,
          totalDirectPaid: directPaid,
          totalTransfers: transfer,
          totalPaid,
          balance: earned - totalPaid,
        };
      } else {
        const tw = transfersByWorkerRows.find((t) => t.workerId === wId);
        return {
          workerId: wId,
          workerName: tw?.workerName || '-',
          workerType: tw?.workerType || '-',
          totalDays: 0,
          totalEarned: 0,
          totalDirectPaid: 0,
          totalTransfers: transfer,
          totalPaid: transfer,
          balance: -transfer,
        };
      }
    });

    const materialItems = materialsRows.map((r) => ({
      materialName: r.materialName || '-',
      totalQuantity: safeNum(r.totalQuantity),
      totalAmount: safeNum(r.totalAmount),
      supplierName: r.supplierName || '-',
    }));

    const totalMaterialsAmount = materialItems.reduce((s, m) => s + m.totalAmount, 0);
    const totalMaterialsPaid = materialsRows.reduce((s, r) => s + safeNum(r.totalPaid), 0);

    const transportTotal = safeNum(transportRows[0]?.totalAmount);
    const transportTripCount = safeNum(transportRows[0]?.tripCount);

    const miscTotal = safeNum(miscRows[0]?.totalAmount);
    const miscCount = safeNum(miscRows[0]?.count);

    const fundTransferItems = fundTransfersRows.map((f) => ({
      date: f.date || '-',
      amount: safeNum(f.amount),
      senderName: f.senderName || '-',
      transferType: f.transferType || '-',
    }));
    const totalFundTransfersAmount = fundTransferItems.reduce((s, f) => s + f.amount, 0);

    const workerTransfersTotal = safeNum(workerTransfersRows[0]?.totalAmount);
    const workerTransfersCount = safeNum(workerTransfersRows[0]?.count);

    const projectTransferItems = [
      ...projectTransferOutRows.map((r) => ({
        date: r.transferDate || '-',
        amount: safeNum(r.amount),
        fromProjectName: proj?.name || '-',
        toProjectName: r.toProjectName || '-',
        reason: r.transferReason || '-',
        direction: 'outgoing' as const,
      })),
      ...projectTransferInRows.map((r) => ({
        date: r.transferDate || '-',
        amount: safeNum(r.amount),
        fromProjectName: r.fromProjectName || '-',
        toProjectName: proj?.name || '-',
        reason: r.transferReason || '-',
        direction: 'incoming' as const,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const totalProjectTransfersOut = projectTransferOutRows.reduce((s, r) => s + safeNum(r.amount), 0);
    const totalProjectTransfersIn = projectTransferInRows.reduce((s, r) => s + safeNum(r.amount), 0);
    const projectTransfersNet = totalProjectTransfersIn - totalProjectTransfersOut;

    const totalWages = attendanceSummary.reduce((s, a) => s + a.totalWages, 0);
    const totalPaidWages = attendanceSummary.reduce((s, a) => s + a.totalPaid, 0);
    const totalExpenses = totalPaidWages + totalMaterialsAmount + transportTotal + miscTotal + workerTransfersTotal + totalProjectTransfersOut;
    const balance = (totalFundTransfersAmount + totalProjectTransfersIn) - totalExpenses;

    const budgetVal = safeNum(proj?.budget);
    const budgetUtilization = budgetVal > 0 ? (totalExpenses / budgetVal) * 100 : undefined;

    const materialsByDateQuery = await db
      .select({
        date: materialPurchases.purchaseDate,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${materialPurchases.totalAmount} AS DECIMAL)), 0)`,
      })
      .from(materialPurchases)
      .where(
        and(
          eq(materialPurchases.project_id, projectId),
          gte(materialPurchases.purchaseDate, dateFrom),
          lte(materialPurchases.purchaseDate, dateTo)
        )
      )
      .groupBy(materialPurchases.purchaseDate);

    const transportByDateQuery = await db
      .select({
        date: transportationExpenses.date,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${transportationExpenses.amount} AS DECIMAL)), 0)`,
      })
      .from(transportationExpenses)
      .where(
        and(
          eq(transportationExpenses.project_id, projectId),
          gte(transportationExpenses.date, dateFrom),
          lte(transportationExpenses.date, dateTo)
        )
      )
      .groupBy(transportationExpenses.date);

    const miscByDateQuery = await db
      .select({
        date: workerMiscExpenses.date,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${workerMiscExpenses.amount} AS DECIMAL)), 0)`,
      })
      .from(workerMiscExpenses)
      .where(
        and(
          eq(workerMiscExpenses.project_id, projectId),
          gte(workerMiscExpenses.date, dateFrom),
          lte(workerMiscExpenses.date, dateTo)
        )
      )
      .groupBy(workerMiscExpenses.date);

    const transfersByDateQuery = await db
      .select({
        date: workerTransfers.transferDate,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${workerTransfers.amount} AS DECIMAL)), 0)`,
      })
      .from(workerTransfers)
      .where(
        and(
          eq(workerTransfers.project_id, projectId),
          gte(workerTransfers.transferDate, dateFrom),
          lte(workerTransfers.transferDate, dateTo)
        )
      )
      .groupBy(workerTransfers.transferDate);

    const matByDate = new Map(materialsByDateQuery.map((r) => [r.date, safeNum(r.totalAmount)]));
    const transByDate = new Map(transportByDateQuery.map((r) => [r.date, safeNum(r.totalAmount)]));
    const miscByDate = new Map(miscByDateQuery.map((r) => [r.date, safeNum(r.totalAmount)]));
    const wTransByDate = new Map(transfersByDateQuery.map((r) => [r.date, safeNum(r.totalAmount)]));
    const fundByDate = new Map<string, number>();
    for (const f of fundTransferItems) {
      fundByDate.set(f.date, (fundByDate.get(f.date) || 0) + f.amount);
    }

    const allDates = new Set<string>();
    attendanceSummary.forEach((a) => allDates.add(a.date));
    materialsByDateQuery.forEach((m) => allDates.add(m.date));
    transportByDateQuery.forEach((t) => allDates.add(t.date));
    miscByDateQuery.forEach((e) => allDates.add(e.date));
    transfersByDateQuery.forEach((t) => allDates.add(t.date));
    fundTransferItems.forEach((f) => { if (f.date !== '-') allDates.add(f.date); });

    const sortedDates = Array.from(allDates).sort();

    const chartData: ReportChartDataPoint[] = sortedDates.map((d) => {
      const attDay = attendanceSummary.find((a) => a.date === d);
      const wages = attDay ? attDay.totalPaid : 0;
      const materialsAmt = matByDate.get(d) || 0;
      const transportAmt = transByDate.get(d) || 0;
      const miscAmt = miscByDate.get(d) || 0;
      const transfersAmt = wTransByDate.get(d) || 0;
      const income = fundByDate.get(d) || 0;
      return {
        date: d,
        wages,
        materials: materialsAmt,
        transport: transportAmt,
        misc: miscAmt,
        transfers: transfersAmt,
        income,
        total: wages + materialsAmt + transportAmt + miscAmt + transfersAmt,
      };
    });

    const kpis: ReportKPI[] = [
      { label: 'إجمالي الإيرادات (العهدة)', value: totalFundTransfersAmount, format: 'currency' },
      { label: 'إجمالي المصروفات', value: totalExpenses, format: 'currency' },
      { label: 'إجمالي الأجور', value: totalWages, format: 'currency' },
      { label: 'إجمالي المواد', value: totalMaterialsAmount, format: 'currency' },
      { label: 'إجمالي النقل', value: transportTotal, format: 'currency' },
      { label: 'إجمالي النثريات', value: miscTotal, format: 'currency' },
      { label: 'إجمالي حوالات العمال', value: workerTransfersTotal, format: 'currency' },
      { label: 'ترحيل صادر', value: totalProjectTransfersOut, format: 'currency' },
      { label: 'ترحيل وارد', value: totalProjectTransfersIn, format: 'currency' },
      { label: 'الرصيد', value: balance, format: 'currency' },
      { label: 'عدد أيام العمل', value: attendanceSummary.reduce((s, a) => s + a.totalWorkDays, 0), format: 'number' },
      { label: 'أيام النشاط', value: attendanceSummary.length, format: 'days' },
    ];

    if (budgetUtilization !== undefined) {
      kpis.push({ label: 'نسبة استهلاك الميزانية', value: budgetUtilization, format: 'percentage' });
    }

    return {
      reportType: 'period-final',
      generatedAt: new Date().toISOString(),
      project: {
        id: proj?.id || projectId,
        name: proj?.name || '-',
        location: proj?.location || undefined,
        engineerName: undefined,
        managerName: proj?.managerName || undefined,
        budget: budgetVal || undefined,
        startDate: proj?.startDate || undefined,
        status: proj?.status || undefined,
      },
      period: {
        from: dateFrom,
        to: dateTo,
      },
      kpis,
      chartData,
      sections: {
        attendance: {
          summary: attendanceSummary,
          byWorker: attendanceByWorker,
        },
        materials: {
          total: totalMaterialsAmount,
          totalPaid: totalMaterialsPaid,
          items: materialItems,
        },
        transport: {
          total: transportTotal,
          tripCount: transportTripCount,
        },
        miscExpenses: {
          total: miscTotal,
          count: miscCount,
        },
        fundTransfers: {
          total: totalFundTransfersAmount,
          count: fundTransferItems.length,
          items: fundTransferItems,
        },
        workerTransfers: {
          total: workerTransfersTotal,
          count: workerTransfersCount,
        },
        projectTransfers: {
          totalOutgoing: totalProjectTransfersOut,
          totalIncoming: totalProjectTransfersIn,
          net: projectTransfersNet,
          items: projectTransferItems,
        },
      },
      totals: {
        totalIncome: totalFundTransfersAmount,
        totalExpenses,
        totalWages,
        totalMaterials: totalMaterialsAmount,
        totalTransport: transportTotal,
        totalMisc: miscTotal,
        totalWorkerTransfers: workerTransfersTotal,
        totalProjectTransfersOut,
        totalProjectTransfersIn,
        balance,
        budgetUtilization,
      },
    };
  }
}

export const reportDataService = new ReportDataService();
