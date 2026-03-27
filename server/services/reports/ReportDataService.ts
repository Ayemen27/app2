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
  workerProjectWages,
} from '@shared/schema';
import type {
  DailyReportData,
  WorkerStatementData,
  WorkerStatementEntry,
  WorkerProjectWageInfo,
  PeriodFinalReportData,
  MultiProjectFinalReportData,
  ProjectBreakdown,
  ReportKPI,
  ReportChartDataPoint,
  AttendanceRecord,
  MaterialRecord,
  TransportRecord,
  MiscExpenseRecord,
  WorkerTransferRecord,
  FundTransferRecord,
  InventoryIssuedRecord,
} from '../../../shared/report-types';
import { pool } from '../../db';

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
    const [projectInfo, attendanceData, materialsData, transportData, miscExpensesData, transfersData, fundTransfersData, projectFundTransfersData, projectFundTransfersOutData] = await Promise.all([
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
        .where(and(eq(workerAttendance.project_id, projectId), sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) = ${date}`)),

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

      db
        .select({
          id: projectFundTransfers.id,
          amount: projectFundTransfers.amount,
          description: projectFundTransfers.description,
          transferReason: projectFundTransfers.transferReason,
          toProjectId: projectFundTransfers.toProjectId,
          toProjectName: projects.name,
        })
        .from(projectFundTransfers)
        .leftJoin(projects, eq(projectFundTransfers.toProjectId, projects.id))
        .where(
          and(
            eq(projectFundTransfers.fromProjectId, projectId),
            eq(projectFundTransfers.transferDate, date)
          )
        ),
    ]);

    const inventoryIssuedResult = await pool.query(`
      WITH lot_totals AS (
        SELECT item_id,
               SUM(received_qty) AS total_received,
               SUM(remaining_qty) AS total_remaining
        FROM inventory_lots
        GROUP BY item_id
      )
      SELECT
        t.id,
        i.name AS item_name,
        COALESCE(i.category, '-') AS category,
        i.unit,
        t.quantity AS issued_qty,
        COALESCE(lt.total_received, 0) AS received_qty,
        COALESCE(lt.total_remaining, 0) AS remaining_qty,
        COALESCE(p.name, '-') AS project_name,
        COALESCE(t.notes, '') AS notes
      FROM inventory_transactions t
      JOIN inventory_items i ON i.id = t.item_id
      LEFT JOIN lot_totals lt ON lt.item_id = i.id
      LEFT JOIN projects p ON p.id = t.to_project_id
      WHERE t.type = 'OUT'
        AND t.transaction_date = $1
        ${projectId ? `AND (t.from_project_id = $2 OR t.to_project_id = $2)` : ''}
      ORDER BY t.id
    `, projectId ? [date, projectId] : [date]);

    const inventoryIssued: InventoryIssuedRecord[] = inventoryIssuedResult.rows.map((r: any) => ({
      id: Number(r.id),
      itemName: r.item_name || '-',
      category: r.category || '-',
      unit: r.unit || '-',
      issuedQty: Number(r.issued_qty) || 0,
      receivedQty: Number(r.received_qty) || 0,
      remainingQty: Number(r.remaining_qty) || 0,
      projectName: r.project_name || '-',
      notes: r.notes || '',
    }));

    const proj = projectInfo[0];

    const attendance: AttendanceRecord[] = attendanceData.map((a: any) => {
      const dw = safeNum(a.dailyWage);
      const wd = safeNum(a.workDays);
      const totalWage = a.actualWage != null ? safeNum(a.actualWage) : dw * wd;
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

    const materials: MaterialRecord[] = materialsData.map((m: any) => ({
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

    const transport: TransportRecord[] = transportData.map((t: any) => ({
      id: typeof t.id === 'string' ? parseInt(t.id, 10) || 0 : (t.id as number),
      amount: safeNum(t.amount),
      description: t.description || '',
      workerName: t.workerName || '-',
    }));

    const miscExpenses: MiscExpenseRecord[] = miscExpensesData.map((e: any) => ({
      id: typeof e.id === 'string' ? parseInt(e.id, 10) || 0 : (e.id as number),
      amount: safeNum(e.amount),
      description: e.description || '',
      notes: e.notes || '',
    }));

    const workerTransfersList: WorkerTransferRecord[] = transfersData.map((t: any) => ({
      id: typeof t.id === 'string' ? parseInt(t.id, 10) || 0 : (t.id as number),
      workerName: t.workerName || '-',
      amount: safeNum(t.amount),
      recipientName: t.recipientName || '-',
      transferMethod: t.transferMethod || '-',
    }));

    const fundTransfersList: FundTransferRecord[] = [
      ...fundTransfersData.map((f: any) => ({
        id: typeof f.id === 'string' ? parseInt(f.id, 10) || 0 : (f.id as number),
        amount: safeNum(f.amount),
        senderName: f.senderName || '-',
        transferType: f.transferType || '-',
        transferNumber: f.transferNumber || '-',
      })),
      ...projectFundTransfersData.map((pf: any) => ({
        id: typeof pf.id === 'string' ? parseInt(pf.id, 10) || 0 : 0,
        amount: safeNum(pf.amount),
        senderName: pf.fromProjectName || 'مشروع آخر',
        transferType: 'ترحيل من مشروع',
        transferNumber: pf.description || (pf.transferReason === 'settlement' ? 'تصفية حساب العمال' : pf.transferReason) || '-',
      })),
    ];

    const totalWorkerWages = attendance.reduce((s, a) => s + a.totalWage, 0);
    const totalPaidWages = attendance.reduce((s, a) => s + a.paidAmount, 0);
    const totalWorkDays = attendance.reduce((s, a) => s + a.workDays, 0);
    const totalMaterials = materials
      .filter(m => m.purchaseType === 'نقد' || m.purchaseType === 'نقداً')
      .reduce((s, m) => s + (m.paidAmount > 0 ? m.paidAmount : m.totalAmount), 0);
    const totalTransport = transport.reduce((s, t) => s + t.amount, 0);
    const totalMiscExpenses = miscExpenses.reduce((s, e) => s + e.amount, 0);
    const totalWorkerTransfers = workerTransfersList.reduce((s, t) => s + t.amount, 0);
    const totalFundTransfers = fundTransfersList.reduce((s, f) => s + f.amount, 0);
    const totalProjectTransfersOut = projectFundTransfersOutData.reduce((s: number, f: any) => s + safeNum(f.amount), 0);
    const supplierPaymentsResult = await pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total FROM supplier_payments WHERE project_id = $1 AND payment_date = $2`, [projectId, date]);
    const totalSupplierPayments = parseFloat(supplierPaymentsResult.rows[0]?.total || '0');
    const totalExpenses = totalPaidWages + totalMaterials + totalTransport + totalMiscExpenses + totalWorkerTransfers + totalProjectTransfersOut + totalSupplierPayments;
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
      inventoryIssued,
      projectTransfersOut: projectFundTransfersOutData.map((pf: any) => ({
        id: typeof pf.id === 'string' ? parseInt(pf.id, 10) || 0 : 0,
        amount: safeNum(pf.amount),
        toProjectName: pf.toProjectName || 'مشروع آخر',
        description: pf.description || (pf.transferReason === 'settlement' ? 'تصفية حساب العمال' : pf.transferReason) || '-',
      })),
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

    const effectiveAttDate = sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`;
    if (dateFrom) {
      attendanceFilters.push(gte(effectiveAttDate, dateFrom));
      transferFilters.push(gte(workerTransfers.transferDate, dateFrom));
    }
    if (dateTo) {
      attendanceFilters.push(lte(effectiveAttDate, dateTo));
      transferFilters.push(lte(workerTransfers.transferDate, dateTo));
    }

    const [attendanceRows, transferRows, projectWageRows] = await Promise.all([
      db
        .select({
          attendanceDate: sql<string>`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`,
          date: workerAttendance.date,
          workDescription: workerAttendance.workDescription,
          dailyWage: workerAttendance.dailyWage,
          actualWage: workerAttendance.actualWage,
          paidAmount: workerAttendance.paidAmount,
          workDays: workerAttendance.workDays,
          projectName: projects.name,
          project_id: workerAttendance.project_id,
        })
        .from(workerAttendance)
        .leftJoin(projects, eq(workerAttendance.project_id, projects.id))
        .where(and(...attendanceFilters))
        .orderBy(asc(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`)),

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

      db
        .select({
          dailyWage: workerProjectWages.dailyWage,
          effectiveFrom: workerProjectWages.effectiveFrom,
          effectiveTo: workerProjectWages.effectiveTo,
          projectName: projects.name,
        })
        .from(workerProjectWages)
        .leftJoin(projects, eq(workerProjectWages.project_id, projects.id))
        .where(
          and(
            eq(workerProjectWages.worker_id, workerId),
            eq(workerProjectWages.is_active, true)
          )
        )
        .orderBy(asc(workerProjectWages.effectiveFrom)),
    ]);

    const rawEntries: Array<{
      date: string;
      type: 'عمل' | 'حوالة' | 'دفعة' | 'تصفية';
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
      const earned = (a as any).actualWage != null ? safeNum((a as any).actualWage) : days * wage;
      const paid = safeNum(a.paidAmount);
      const effectiveDate = (a as any).date || a.attendanceDate;

      if (days > 0) {
        rawEntries.push({
          date: effectiveDate,
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
          date: effectiveDate,
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

    let settlementProjectFilter = '';
    const settlementParams: any[] = [workerId];
    let sParamIdx = 2;
    if (projectId && projectId !== 'all') {
      settlementProjectFilter += ` AND (wsl.from_project_id = $${sParamIdx} OR wsl.to_project_id = $${sParamIdx})`;
      settlementParams.push(projectId);
      sParamIdx++;
    } else if (!isAdmin && accessibleProjectIds && accessibleProjectIds.length > 0) {
      const placeholders = accessibleProjectIds.map((_: string, i: number) => `$${sParamIdx + i}`).join(',');
      settlementProjectFilter += ` AND (wsl.from_project_id IN (${placeholders}) OR wsl.to_project_id IN (${placeholders}))`;
      settlementParams.push(...accessibleProjectIds);
      sParamIdx += accessibleProjectIds.length;
    } else if (!isAdmin) {
      settlementProjectFilter += ' AND 1=0';
    }
    if (dateFrom) {
      settlementProjectFilter += ` AND ws.settlement_date >= $${sParamIdx}`;
      settlementParams.push(dateFrom);
      sParamIdx++;
    }
    if (dateTo) {
      settlementProjectFilter += ` AND ws.settlement_date <= $${sParamIdx}`;
      settlementParams.push(dateTo);
      sParamIdx++;
    }
    const settlementResult = await pool.query(`
      SELECT wsl.amount, wsl.balance_before, wsl.balance_after,
        ws.settlement_date, ws.notes,
        fp.name AS from_project_name, tp.name AS to_project_name,
        wsl.from_project_id, wsl.to_project_id
      FROM worker_settlement_lines wsl
      JOIN worker_settlements ws ON ws.id = wsl.settlement_id
      LEFT JOIN projects fp ON fp.id = wsl.from_project_id
      LEFT JOIN projects tp ON tp.id = wsl.to_project_id
      WHERE wsl.worker_id = $1 AND ws.status = 'completed'
      ${settlementProjectFilter}
      ORDER BY ws.settlement_date
    `, settlementParams);

    for (const s of settlementResult.rows) {
      const amt = parseFloat(s.amount) || 0;
      rawEntries.push({
        date: s.settlement_date,
        type: 'تصفية',
        description: `تصفية من ${s.from_project_name || '-'} إلى ${s.to_project_name || '-'}`,
        projectName: s.from_project_name || '-',
        workDays: 0,
        debit: 0,
        credit: amt,
        reference: 'تصفية حساب',
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
      existing.totalEarned += (a as any).actualWage != null ? safeNum((a as any).actualWage) : days * wage;
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
    const totalTransfers = transferRows.reduce((s: number, t: any) => s + safeNum(t.amount), 0);
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

    const projectWages: WorkerProjectWageInfo[] = projectWageRows.map((pw: any) => ({
      projectName: pw.projectName || '-',
      dailyWage: safeNum(pw.dailyWage),
      effectiveFrom: pw.effectiveFrom,
      effectiveTo: pw.effectiveTo || undefined,
    }));

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
      projectWages: projectWages.length > 0 ? projectWages : undefined,
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
          date: sql<string>`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`,
          totalWorkDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
          totalWages: sql<number>`COALESCE(SUM(CASE WHEN ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' THEN CAST(${workerAttendance.actualWage} AS DECIMAL) ELSE CAST(COALESCE(NULLIF(${workerAttendance.dailyWage},''),'0') AS DECIMAL) * CAST(COALESCE(NULLIF(${workerAttendance.workDays},''),'0') AS DECIMAL) END), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
          workerCount: sql<number>`COUNT(DISTINCT ${workerAttendance.worker_id})`,
        })
        .from(workerAttendance)
        .where(
          and(
            eq(workerAttendance.project_id, projectId),
            sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`,
            sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`
          )
        )
        .groupBy(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`)
        .orderBy(asc(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`)),

      db
        .select({
          workerId: workerAttendance.worker_id,
          workerName: workers.name,
          workerType: workers.type,
          totalDays: sql<number>`COALESCE(SUM(CAST(${workerAttendance.workDays} AS DECIMAL)), 0)`,
          totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' THEN CAST(${workerAttendance.actualWage} AS DECIMAL) ELSE CAST(COALESCE(NULLIF(${workerAttendance.dailyWage},''),'0') AS DECIMAL) * CAST(COALESCE(NULLIF(${workerAttendance.workDays},''),'0') AS DECIMAL) END), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(CAST(${workerAttendance.paidAmount} AS DECIMAL)), 0)`,
        })
        .from(workerAttendance)
        .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
        .where(
          and(
            eq(workerAttendance.project_id, projectId),
            sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`,
            sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`
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

    const supplierPaymentRows = await pool.query(`
      SELECT sp.id, s.name AS supplier_name, sp.amount, sp.payment_method,
        sp.payment_date, COALESCE(sp.reference_number, '') AS reference_number,
        COALESCE(mp.material_name, '') AS purchase_material,
        COALESCE(sp.notes, '') AS notes
      FROM supplier_payments sp
      LEFT JOIN suppliers s ON sp.supplier_id = s.id
      LEFT JOIN material_purchases mp ON sp.purchase_id = mp.id
      WHERE sp.project_id = $1 AND sp.payment_date >= $2 AND sp.payment_date <= $3
      ORDER BY sp.payment_date
    `, [projectId, dateFrom, dateTo]);

    const proj = projectInfo[0];

    const attendanceSummary = attendanceSummaryRows.map((r: any) => ({
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
    attendanceByWorkerRows.forEach((r: any) => allWorkerIds.add(r.workerId));
    transfersByWorkerRows.forEach((r: any) => allWorkerIds.add(r.workerId));

    const attendanceMap = new Map(attendanceByWorkerRows.map((r: any) => [r.workerId, r]));

    const attendanceByWorker = Array.from(allWorkerIds).map((wId) => {
      const att = attendanceMap.get(wId);
      const transfer = transfersByWorkerMap.get(wId) || 0;

      if (att) {
        const attData = att as { totalEarned?: number; totalPaid?: number; workerName?: string; workerType?: string; totalDays?: number };
        const earned = safeNum(attData.totalEarned);
        const directPaid = safeNum(attData.totalPaid);
        const totalPaid = directPaid + transfer;
        return {
          workerId: wId,
          workerName: attData.workerName || '-',
          workerType: attData.workerType || '-',
          totalDays: safeNum(attData.totalDays),
          totalEarned: earned,
          totalDirectPaid: directPaid,
          totalTransfers: transfer,
          totalPaid,
          balance: earned - totalPaid,
        };
      } else {
        const tw = transfersByWorkerRows.find((t: any) => t.workerId === wId);
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

    const materialItems = materialsRows.map((r: any) => ({
      materialName: r.materialName || '-',
      totalQuantity: safeNum(r.totalQuantity),
      totalAmount: safeNum(r.totalAmount),
      supplierName: r.supplierName || '-',
    }));

    const totalMaterialsAmount = materialItems.reduce((s: number, m: any) => s + m.totalAmount, 0);
    const totalMaterialsPaid = materialsRows.reduce((s: number, r: any) => s + safeNum(r.totalPaid), 0);
    const cashMaterialsResult = await pool.query(`SELECT COALESCE(SUM(
      CASE WHEN CAST(paid_amount AS DECIMAL) > 0 THEN CAST(paid_amount AS DECIMAL(15,2))
           ELSE CAST(total_amount AS DECIMAL(15,2)) END
    ), 0) as total FROM material_purchases WHERE project_id = $1 AND (purchase_type = 'نقد' OR purchase_type = 'نقداً') AND purchase_date >= $2 AND purchase_date <= $3`, [projectId, dateFrom, dateTo]);
    const totalMaterialsCash = parseFloat(cashMaterialsResult.rows[0]?.total || '0');

    const transportTotal = safeNum(transportRows[0]?.totalAmount);
    const transportTripCount = safeNum(transportRows[0]?.tripCount);

    const miscTotal = safeNum(miscRows[0]?.totalAmount);
    const miscCount = safeNum(miscRows[0]?.count);

    const fundTransferItems = fundTransfersRows.map((f: any) => ({
      date: f.date || '-',
      amount: safeNum(f.amount),
      senderName: f.senderName || '-',
      transferType: f.transferType || '-',
    }));
    const totalFundTransfersAmount = fundTransferItems.reduce((s: number, f: any) => s + f.amount, 0);

    const workerTransfersTotal = safeNum(workerTransfersRows[0]?.totalAmount);
    const workerTransfersCount = safeNum(workerTransfersRows[0]?.count);

    const projectTransferItems = [
      ...projectTransferOutRows.map((r: any) => ({
        date: r.transferDate || '-',
        amount: safeNum(r.amount),
        fromProjectName: proj?.name || '-',
        toProjectName: r.toProjectName || '-',
        reason: r.transferReason === 'settlement' ? 'تصفية حساب العمال' : (r.transferReason || '-'),
        direction: 'outgoing' as const,
      })),
      ...projectTransferInRows.map((r: any) => ({
        date: r.transferDate || '-',
        amount: safeNum(r.amount),
        fromProjectName: r.fromProjectName || '-',
        toProjectName: proj?.name || '-',
        reason: r.transferReason === 'settlement' ? 'تصفية حساب العمال' : (r.transferReason || '-'),
        direction: 'incoming' as const,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const totalProjectTransfersOut = projectTransferOutRows.reduce((s: number, r: any) => s + safeNum(r.amount), 0);
    const totalProjectTransfersIn = projectTransferInRows.reduce((s: number, r: any) => s + safeNum(r.amount), 0);
    const projectTransfersNet = totalProjectTransfersIn - totalProjectTransfersOut;

    const supplierPayPeriodResult = await pool.query(`SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as total FROM supplier_payments WHERE project_id = $1 AND payment_date >= $2 AND payment_date <= $3`, [projectId, dateFrom, dateTo]);
    const totalSupplierPaymentsPeriod = parseFloat(supplierPayPeriodResult.rows[0]?.total || '0');

    const inventoryPeriodResult = await pool.query(`
      WITH lot_totals AS (
        SELECT item_id,
          COALESCE(SUM(CAST(received_qty AS DECIMAL(15,2))), 0) AS received_qty,
          COALESCE(SUM(CAST(remaining_qty AS DECIMAL(15,2))), 0) AS remaining_qty
        FROM inventory_lots
        GROUP BY item_id
      )
      SELECT t.id, i.name AS item_name, i.category, i.unit,
        CAST(t.quantity AS DECIMAL(15,2)) AS issued_qty,
        COALESCE(lt.received_qty, 0) AS received_qty,
        COALESCE(lt.remaining_qty, 0) AS remaining_qty,
        COALESCE(p.name, '') AS project_name,
        COALESCE(t.notes, '') AS notes
      FROM inventory_transactions t
      JOIN inventory_items i ON i.id = t.item_id
      LEFT JOIN lot_totals lt ON lt.item_id = t.item_id
      LEFT JOIN projects p ON p.id = t.from_project_id
      WHERE t.type = 'OUT'
        AND t.transaction_date >= $2 AND t.transaction_date <= $3
        AND (t.from_project_id = $1 OR t.to_project_id = $1)
      ORDER BY t.transaction_date
    `, [projectId, dateFrom, dateTo]);

    const inventoryIssuedItems: InventoryIssuedRecord[] = inventoryPeriodResult.rows.map((r: any) => ({
      id: Number(r.id),
      itemName: r.item_name || '-',
      category: r.category || '-',
      unit: r.unit || '-',
      issuedQty: Number(r.issued_qty) || 0,
      receivedQty: Number(r.received_qty) || 0,
      remainingQty: Number(r.remaining_qty) || 0,
      projectName: r.project_name || '-',
      notes: r.notes || '',
    }));

    const totalWages = attendanceSummary.reduce((s: number, a: any) => s + a.totalWages, 0);
    const totalPaidWages = attendanceSummary.reduce((s: number, a: any) => s + a.totalPaid, 0);
    const totalExpenses = totalPaidWages + totalMaterialsCash + transportTotal + miscTotal + workerTransfersTotal + totalProjectTransfersOut + totalSupplierPaymentsPeriod;
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

    const matByDate = new Map(materialsByDateQuery.map((r: any) => [r.date, safeNum(r.totalAmount)]));
    const transByDate = new Map(transportByDateQuery.map((r: any) => [r.date, safeNum(r.totalAmount)]));
    const miscByDate = new Map(miscByDateQuery.map((r: any) => [r.date, safeNum(r.totalAmount)]));
    const wTransByDate = new Map(transfersByDateQuery.map((r: any) => [r.date, safeNum(r.totalAmount)]));
    const fundByDate = new Map<string, number>();
    for (const f of fundTransferItems) {
      fundByDate.set(f.date, (fundByDate.get(f.date) || 0) + f.amount);
    }

    const allDates = new Set<string>();
    attendanceSummary.forEach((a: any) => allDates.add(a.date));
    materialsByDateQuery.forEach((m: any) => allDates.add(m.date));
    transportByDateQuery.forEach((t: any) => allDates.add(t.date));
    miscByDateQuery.forEach((e: any) => allDates.add(e.date));
    transfersByDateQuery.forEach((t: any) => allDates.add(t.date));
    fundTransferItems.forEach((f: any) => { if (f.date !== '-') allDates.add(f.date); });

    const sortedDates = Array.from(allDates).sort();

    const chartData: ReportChartDataPoint[] = sortedDates.map((d) => {
      const attDay = attendanceSummary.find((a: any) => a.date === d);
      const wages = attDay ? (attDay as { totalPaid?: number }).totalPaid || 0 : 0;
      const materialsAmt = matByDate.get(d) || 0;
      const transportAmt = transByDate.get(d) || 0;
      const miscAmt = miscByDate.get(d) || 0;
      const transfersAmt = wTransByDate.get(d) || 0;
      const income = fundByDate.get(d) || 0;
      return {
        date: d,
        wages: Number(wages),
        materials: Number(materialsAmt),
        transport: Number(transportAmt),
        misc: Number(miscAmt),
        transfers: Number(transfersAmt),
        income: Number(income),
        total: Number(wages) + Number(materialsAmt) + Number(transportAmt) + Number(miscAmt) + Number(transfersAmt),
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
      { label: 'عدد أيام العمل', value: attendanceSummary.reduce((s: any, a: any) => s + a.totalWorkDays, 0), format: 'number' },
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
        supplierPayments: {
          total: totalSupplierPaymentsPeriod,
          count: supplierPaymentRows.rows.length,
          items: supplierPaymentRows.rows.map((r: any) => ({
            id: r.id,
            supplierName: r.supplier_name || '-',
            amount: parseFloat(r.amount) || 0,
            paymentMethod: r.payment_method || '-',
            paymentDate: r.payment_date || '-',
            referenceNumber: r.reference_number || '',
            purchaseMaterial: r.purchase_material || undefined,
            notes: r.notes || '',
          })),
        },
        inventoryIssued: inventoryIssuedItems.length > 0 ? {
          totalItems: inventoryIssuedItems.length,
          totalIssuedQty: inventoryIssuedItems.reduce((s, i) => s + i.issuedQty, 0),
          items: inventoryIssuedItems,
        } : undefined,
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
        totalSupplierPayments: totalSupplierPaymentsPeriod,
        balance,
        budgetUtilization,
      },
    };
  }

  async getMultiProjectFinalReport(projectIds: string[], dateFrom: string, dateTo: string): Promise<MultiProjectFinalReportData> {
    const projectReports: PeriodFinalReportData[] = [];
    for (const pid of projectIds) {
      const report = await this.getPeriodFinalReport(pid, dateFrom, dateTo);
      projectReports.push(report);
    }

    const projectIdSet = new Set(projectIds);
    const interProjectTransferRows = await db
      .select({
        fromProjectId: projectFundTransfers.fromProjectId,
        toProjectId: projectFundTransfers.toProjectId,
        amount: projectFundTransfers.amount,
        transferDate: projectFundTransfers.transferDate,
        transferReason: projectFundTransfers.transferReason,
      })
      .from(projectFundTransfers)
      .where(
        and(
          inArray(projectFundTransfers.fromProjectId, projectIds),
          inArray(projectFundTransfers.toProjectId, projectIds),
          gte(projectFundTransfers.transferDate, dateFrom),
          lte(projectFundTransfers.transferDate, dateTo)
        )
      )
      .orderBy(asc(projectFundTransfers.transferDate));

    const projectNameMap = new Map<string, string>();
    for (const r of projectReports) {
      projectNameMap.set(r.project.id, r.project.name);
    }

    const interProjectTransfers = interProjectTransferRows.map((t: any) => ({
      date: t.transferDate || '-',
      amount: safeNum(t.amount),
      fromProjectName: projectNameMap.get(t.fromProjectId) || '-',
      toProjectName: projectNameMap.get(t.toProjectId) || '-',
      reason: t.transferReason === 'settlement' ? 'تصفية حساب العمال' : (t.transferReason || '-'),
    }));

    const totalInterProjectAmount = interProjectTransfers.reduce((s: any, t: any) => s + t.amount, 0);

    const projectBreakdowns: ProjectBreakdown[] = projectReports.map((r) => ({
      projectId: r.project.id,
      projectName: r.project.name,
      location: r.project.location,
      managerName: r.project.managerName,
      budget: r.project.budget,
      status: r.project.status,
      totals: r.totals,
      sections: r.sections,
    }));

    const combinedFundTransfers = projectReports.reduce((s, r) => s + r.totals.totalIncome, 0);
    const combinedProjectTransfersIn = projectReports.reduce((s, r) => s + r.totals.totalProjectTransfersIn, 0);
    const combinedProjectTransfersOut = projectReports.reduce((s, r) => s + r.totals.totalProjectTransfersOut, 0);
    const combinedIncome = combinedFundTransfers + combinedProjectTransfersIn;
    const combinedWages = projectReports.reduce((s, r) => s + r.totals.totalWages, 0);
    const combinedMaterials = projectReports.reduce((s, r) => s + r.totals.totalMaterials, 0);
    const combinedTransport = projectReports.reduce((s, r) => s + r.totals.totalTransport, 0);
    const combinedMisc = projectReports.reduce((s, r) => s + r.totals.totalMisc, 0);
    const combinedWorkerTransfers = projectReports.reduce((s, r) => s + r.totals.totalWorkerTransfers, 0);
    const combinedExpenses = projectReports.reduce((s, r) => s + r.totals.totalExpenses, 0);
    const combinedBalance = projectReports.reduce((s, r) => s + r.totals.balance, 0);

    const allWorkers: MultiProjectFinalReportData['combinedSections']['attendance']['byWorker'] = [];
    for (const r of projectReports) {
      for (const w of r.sections.attendance.byWorker) {
        allWorkers.push({ ...w, projectName: r.project.name });
      }
    }

    const allMaterials: MultiProjectFinalReportData['combinedSections']['materials']['items'] = [];
    for (const r of projectReports) {
      for (const m of r.sections.materials.items) {
        allMaterials.push({ ...m, projectName: r.project.name });
      }
    }

    const allFundTransfers: MultiProjectFinalReportData['combinedSections']['fundTransfers']['items'] = [];
    for (const r of projectReports) {
      for (const f of r.sections.fundTransfers.items) {
        allFundTransfers.push({ ...f, projectName: r.project.name });
      }
    }
    allFundTransfers.sort((a, b) => a.date.localeCompare(b.date));

    const allDates = new Set<string>();
    for (const r of projectReports) {
      for (const c of r.chartData) {
        allDates.add(c.date);
      }
    }
    const sortedDates = Array.from(allDates).sort();
    const chartData: ReportChartDataPoint[] = sortedDates.map((d) => {
      let wages = 0, materials = 0, transport = 0, misc = 0, transfers = 0, income = 0;
      for (const r of projectReports) {
        const point = r.chartData.find((c) => c.date === d);
        if (point) {
          wages += point.wages;
          materials += point.materials;
          transport += point.transport;
          misc += point.misc;
          transfers += point.transfers;
          income += point.income;
        }
      }
      return { date: d, wages, materials, transport, misc, transfers, income, total: wages + materials + transport + misc + transfers };
    });

    const kpis: ReportKPI[] = [
      { label: 'إجمالي العهدة', value: combinedFundTransfers, format: 'currency' },
      { label: 'ترحيل وارد', value: combinedProjectTransfersIn, format: 'currency' },
      { label: 'إجمالي الإيرادات', value: combinedIncome, format: 'currency' },
      { label: 'إجمالي المصروفات', value: combinedExpenses, format: 'currency' },
      { label: 'ترحيل صادر', value: combinedProjectTransfersOut, format: 'currency' },
      { label: 'إجمالي الأجور', value: combinedWages, format: 'currency' },
      { label: 'إجمالي المواد', value: combinedMaterials, format: 'currency' },
      { label: 'إجمالي النقل', value: combinedTransport, format: 'currency' },
      { label: 'حوالات العمال', value: combinedWorkerTransfers, format: 'currency' },
      { label: 'تحويلات بين المشاريع', value: totalInterProjectAmount, format: 'currency' },
      { label: 'الرصيد', value: combinedBalance, format: 'currency' },
    ];

    return {
      reportType: 'multi-project-final',
      generatedAt: new Date().toISOString(),
      projectNames: projectReports.map((r) => r.project.name),
      period: { from: dateFrom, to: dateTo },
      kpis,
      chartData,
      projects: projectBreakdowns,
      interProjectTransfers,
      combinedTotals: {
        totalIncome: combinedIncome,
        totalFundTransfers: combinedFundTransfers,
        totalProjectTransfersIn: combinedProjectTransfersIn,
        totalProjectTransfersOut: combinedProjectTransfersOut,
        totalExpenses: combinedExpenses,
        totalWages: combinedWages,
        totalMaterials: combinedMaterials,
        totalTransport: combinedTransport,
        totalMisc: combinedMisc,
        totalWorkerTransfers: combinedWorkerTransfers,
        totalInterProjectTransfers: totalInterProjectAmount,
        balance: combinedBalance,
      },
      combinedSections: {
        attendance: { byWorker: allWorkers },
        materials: {
          total: allMaterials.reduce((s, m) => s + m.totalAmount, 0),
          totalPaid: projectReports.reduce((s, r) => s + r.sections.materials.totalPaid, 0),
          items: allMaterials,
        },
        fundTransfers: {
          total: allFundTransfers.reduce((s, f) => s + f.amount, 0),
          count: allFundTransfers.length,
          items: allFundTransfers,
        },
      },
    };
  }

  async getProjectComprehensiveReport(projectId: string, dateFrom: string, dateTo: string): Promise<import('../../../shared/report-types').ProjectComprehensiveReportData> {
    const client = await pool.connect();
    try {
      const projectInfo = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      const proj = projectInfo[0];
      if (!proj) throw new Error('المشروع غير موجود');

      const [
        workforceResult,
        workersByTypeResult,
        topWorkersResult,
        wellsResult,
        wellStatusResult,
        wellCrewsResult,
        attendanceDailyResult,
        attendanceTotalsResult,
        materialsTotalResult,
        materialsByCategoryResult,
        transportResult,
        miscResult,
        workerTransfersResult,
        fundTransfersResult,
        fundTransferItemsResult,
        projectTransfersInResult,
        projectTransfersOutResult,
        equipmentResult,
        equipmentByStatusResult,
      ] = await Promise.all([
        client.query(`
          SELECT
            COUNT(DISTINCT wa.worker_id) AS total_workers,
            COUNT(DISTINCT CASE WHEN COALESCE(NULLIF(wa.date,''), wa.attendance_date) >= $2 THEN wa.worker_id END) AS active_workers
          FROM worker_attendance wa
          WHERE wa.project_id = $1 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) >= $2 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(w.type, 'غير محدد') AS type,
            COUNT(DISTINCT wa.worker_id) AS count,
            COALESCE(SUM(CAST(wa.work_days AS DECIMAL)), 0) AS total_days,
            COALESCE(SUM(CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' THEN CAST(wa.actual_wage AS DECIMAL) ELSE CAST(COALESCE(NULLIF(wa.daily_wage,''),'0') AS DECIMAL) * CAST(COALESCE(NULLIF(wa.work_days,''),'0') AS DECIMAL) END), 0) AS total_wages
          FROM worker_attendance wa
          LEFT JOIN workers w ON wa.worker_id = w.id
          WHERE wa.project_id = $1 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) >= $2 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) <= $3
          GROUP BY w.type ORDER BY total_wages DESC
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            w.name, w.type,
            COALESCE(SUM(CAST(wa.work_days AS DECIMAL)), 0) AS total_days,
            COALESCE(SUM(CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' THEN CAST(wa.actual_wage AS DECIMAL) ELSE CAST(COALESCE(NULLIF(wa.daily_wage,''),'0') AS DECIMAL) * CAST(COALESCE(NULLIF(wa.work_days,''),'0') AS DECIMAL) END), 0) AS total_earned,
            COALESCE(SUM(CAST(wa.paid_amount AS DECIMAL)), 0) AS total_paid
          FROM worker_attendance wa
          LEFT JOIN workers w ON wa.worker_id = w.id
          WHERE wa.project_id = $1 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) >= $2 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) <= $3
          GROUP BY w.name, w.type
          ORDER BY total_earned DESC LIMIT 20
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT id, well_number, owner_name, region, well_depth, status,
            COALESCE(CAST(completion_percentage AS DECIMAL), 0) AS completion_percentage
          FROM wells WHERE project_id = $1
          ORDER BY well_number
        `, [projectId]),

        client.query(`
          SELECT status, COUNT(*) AS count FROM wells WHERE project_id = $1 GROUP BY status
        `, [projectId]),

        client.query(`
          SELECT wc.well_id,
            COUNT(*) AS crew_count,
            COALESCE(SUM(CAST(wc.total_wages AS DECIMAL)), 0) AS total_wages
          FROM well_work_crews wc
          JOIN wells w ON wc.well_id = w.id
          WHERE w.project_id = $1
          GROUP BY wc.well_id
        `, [projectId]),

        client.query(`
          SELECT
            COALESCE(NULLIF(wa.date,''), wa.attendance_date) AS date,
            COUNT(DISTINCT wa.worker_id) AS worker_count,
            COALESCE(SUM(CAST(wa.work_days AS DECIMAL)), 0) AS total_work_days,
            COALESCE(SUM(CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' THEN CAST(wa.actual_wage AS DECIMAL) ELSE CAST(COALESCE(NULLIF(wa.daily_wage,''),'0') AS DECIMAL) * CAST(COALESCE(NULLIF(wa.work_days,''),'0') AS DECIMAL) END), 0) AS total_wages
          FROM worker_attendance wa
          WHERE wa.project_id = $1 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) >= $2 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) <= $3
          GROUP BY COALESCE(NULLIF(wa.date,''), wa.attendance_date) ORDER BY COALESCE(NULLIF(wa.date,''), wa.attendance_date)
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(SUM(CAST(wa.work_days AS DECIMAL)), 0) AS total_work_days,
            COALESCE(SUM(CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' THEN CAST(wa.actual_wage AS DECIMAL) ELSE CAST(COALESCE(NULLIF(wa.daily_wage,''),'0') AS DECIMAL) * CAST(COALESCE(NULLIF(wa.work_days,''),'0') AS DECIMAL) END), 0) AS total_wages,
            COALESCE(SUM(CAST(wa.paid_amount AS DECIMAL)), 0) AS total_paid
          FROM worker_attendance wa
          WHERE wa.project_id = $1 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) >= $2 AND COALESCE(NULLIF(wa.date,''), wa.attendance_date) <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) AS total,
            COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) AS total_paid
          FROM material_purchases
          WHERE project_id = $1 AND purchase_date >= $2 AND purchase_date <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(material_category, 'غير مصنف') AS category,
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) AS total,
            COUNT(*) AS count
          FROM material_purchases
          WHERE project_id = $1 AND purchase_date >= $2 AND purchase_date <= $3
          GROUP BY material_category ORDER BY total DESC
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total,
            COUNT(*) AS trip_count
          FROM transportation_expenses
          WHERE project_id = $1 AND date >= $2 AND date <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total,
            COUNT(*) AS count
          FROM worker_misc_expenses
          WHERE project_id = $1 AND date >= $2 AND date <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total,
            COUNT(*) AS count
          FROM worker_transfers
          WHERE project_id = $1 AND transfer_date >= $2 AND transfer_date <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total
          FROM fund_transfers
          WHERE project_id = $1
            AND (CASE WHEN transfer_date IS NULL OR transfer_date::text = '' OR transfer_date::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE transfer_date::date END) >= $2::date
            AND (CASE WHEN transfer_date IS NULL OR transfer_date::text = '' OR transfer_date::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE transfer_date::date END) <= $3::date
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT
            (CASE WHEN transfer_date IS NULL OR transfer_date::text = '' OR transfer_date::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE transfer_date::date END)::text AS date,
            CAST(amount AS DECIMAL) AS amount,
            COALESCE(sender_name, '-') AS sender_name,
            COALESCE(transfer_type, '-') AS transfer_type
          FROM fund_transfers
          WHERE project_id = $1
            AND (CASE WHEN transfer_date IS NULL OR transfer_date::text = '' OR transfer_date::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE transfer_date::date END) >= $2::date
            AND (CASE WHEN transfer_date IS NULL OR transfer_date::text = '' OR transfer_date::text !~ '^\\d{4}-\\d{2}-\\d{2}' THEN NULL ELSE transfer_date::date END) <= $3::date
          ORDER BY transfer_date
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total
          FROM project_fund_transfers
          WHERE to_project_id = $1 AND transfer_date >= $2 AND transfer_date <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total
          FROM project_fund_transfers
          WHERE from_project_id = $1 AND transfer_date >= $2 AND transfer_date <= $3
        `, [projectId, dateFrom, dateTo]),

        client.query(`
          SELECT name, COALESCE(code, '-') AS code, COALESCE(type, '-') AS type,
            COALESCE(status, 'active') AS status, COALESCE(condition, '-') AS condition,
            COALESCE(quantity, 1) AS quantity
          FROM equipment WHERE project_id = $1
          ORDER BY name
        `, [projectId]),

        client.query(`
          SELECT COALESCE(status, 'active') AS status, COUNT(*) AS count
          FROM equipment WHERE project_id = $1
          GROUP BY status
        `, [projectId]),
      ]);

      const supplierPayCompResult = await client.query(`
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total, COUNT(*) AS count
        FROM supplier_payments
        WHERE project_id = $1 AND payment_date >= $2 AND payment_date <= $3
      `, [projectId, dateFrom, dateTo]);
      const totalSupplierPaymentsComp = safeNum(supplierPayCompResult.rows[0]?.total);
      const supplierPaymentsCount = safeNum(supplierPayCompResult.rows[0]?.count);

      const wf = workforceResult.rows[0];
      const totalWorkers = safeNum(wf?.total_workers);
      const activeWorkers = safeNum(wf?.active_workers);

      const att = attendanceTotalsResult.rows[0];
      const totalWorkDays = safeNum(att?.total_work_days);
      const totalWages = safeNum(att?.total_wages);
      const totalPaid = safeNum(att?.total_paid);

      const mat = materialsTotalResult.rows[0];
      const totalMaterials = safeNum(mat?.total);
      const totalMaterialsPaid = safeNum(mat?.total_paid);

      const trn = transportResult.rows[0];
      const totalTransport = safeNum(trn?.total);
      const tripCount = safeNum(trn?.trip_count);

      const misc = miscResult.rows[0];
      const totalMisc = safeNum(misc?.total);
      const miscCount = safeNum(misc?.count);

      const wt = workerTransfersResult.rows[0];
      const totalWorkerTransfers = safeNum(wt?.total);
      const wtCount = safeNum(wt?.count);

      const totalFundTransfersIn = safeNum(fundTransfersResult.rows[0]?.total);
      const totalProjectTransfersIn = safeNum(projectTransfersInResult.rows[0]?.total);
      const totalProjectTransfersOut = safeNum(projectTransfersOutResult.rows[0]?.total);

      const totalIncome = totalFundTransfersIn + totalProjectTransfersIn;
      const totalExpenses = totalWages + totalMaterials + totalTransport + totalMisc + totalWorkerTransfers + totalProjectTransfersOut + totalSupplierPaymentsComp;
      const balance = totalIncome - totalExpenses;

      const budget = proj.budget ? safeNum(proj.budget) : undefined;
      const budgetUtilization = budget && budget > 0 ? (totalExpenses / budget) * 100 : undefined;

      const crewMap = new Map<number, { crewCount: number; totalWages: number }>();
      for (const row of wellCrewsResult.rows) {
        crewMap.set(Number(row.well_id), {
          crewCount: safeNum(row.crew_count),
          totalWages: safeNum(row.total_wages),
        });
      }

      const wellsList = wellsResult.rows.map(w => {
        const crew = crewMap.get(Number(w.id)) || { crewCount: 0, totalWages: 0 };
        return {
          wellNumber: safeNum(w.well_number),
          ownerName: w.owner_name || '-',
          region: w.region || '-',
          depth: safeNum(w.well_depth),
          status: w.status || 'pending',
          completionPercentage: safeNum(w.completion_percentage),
          crewCount: crew.crewCount,
          totalCrewWages: crew.totalWages,
        };
      });

      const totalWells = wellsResult.rows.length;
      const avgCompletion = totalWells > 0
        ? wellsList.reduce((s, w) => s + w.completionPercentage, 0) / totalWells
        : 0;
      const totalDepth = wellsList.reduce((s, w) => s + w.depth, 0);

      const costPerWell = totalWells > 0 ? totalExpenses / totalWells : 0;
      const costPerWorkerDay = totalWorkDays > 0 ? totalExpenses / totalWorkDays : 0;

      const kpis: import('../../../shared/report-types').ReportKPI[] = [
        { label: 'إجمالي الإيرادات', value: totalIncome, format: 'currency' },
        { label: 'إجمالي المصروفات', value: totalExpenses, format: 'currency' },
        { label: 'الرصيد', value: balance, format: 'currency' },
        { label: 'عدد العمال', value: totalWorkers, format: 'number' },
        { label: 'عدد الآبار', value: totalWells, format: 'number' },
        { label: 'أيام العمل', value: totalWorkDays, format: 'days' },
        { label: 'تكلفة / بئر', value: costPerWell, format: 'currency' },
        { label: 'تكلفة / عامل / يوم', value: costPerWorkerDay, format: 'currency' },
      ];
      if (budgetUtilization !== undefined) {
        kpis.push({ label: 'نسبة استخدام الميزانية', value: budgetUtilization, format: 'percentage' });
      }

      return {
        reportType: 'project-comprehensive',
        generatedAt: new Date().toISOString(),
        project: {
          id: proj.id,
          name: proj.name || 'بدون اسم',
          location: proj.location || undefined,
          engineerName: proj.engineerName || undefined,
          managerName: proj.managerName || undefined,
          budget: budget,
          startDate: proj.startDate || undefined,
          status: proj.status || undefined,
        },
        period: { from: dateFrom, to: dateTo },
        kpis,
        workforce: {
          totalWorkers,
          activeWorkers,
          workersByType: workersByTypeResult.rows.map(r => ({
            type: r.type || 'غير محدد',
            count: safeNum(r.count),
            totalDays: safeNum(r.total_days),
            totalWages: safeNum(r.total_wages),
          })),
          topWorkers: topWorkersResult.rows.map(r => ({
            name: r.name || '-',
            type: r.type || '-',
            totalDays: safeNum(r.total_days),
            totalEarned: safeNum(r.total_earned),
            totalPaid: safeNum(r.total_paid),
            balance: safeNum(r.total_earned) - safeNum(r.total_paid),
          })),
        },
        wells: {
          totalWells,
          byStatus: wellStatusResult.rows.map(r => ({ status: r.status, count: safeNum(r.count) })),
          avgCompletionPercentage: avgCompletion,
          totalDepth,
          wellsList,
        },
        attendance: {
          totalWorkDays,
          totalWages,
          totalPaid,
          dailySummary: attendanceDailyResult.rows.map(r => ({
            date: r.date || '-',
            workerCount: safeNum(r.worker_count),
            totalWorkDays: safeNum(r.total_work_days),
            totalWages: safeNum(r.total_wages),
          })),
        },
        expenses: {
          materials: {
            total: totalMaterials,
            totalPaid: totalMaterialsPaid,
            byCategory: materialsByCategoryResult.rows.map(r => ({
              category: r.category || 'غير مصنف',
              total: safeNum(r.total),
              count: safeNum(r.count),
            })),
          },
          transport: { total: totalTransport, tripCount },
          miscExpenses: { total: totalMisc, count: miscCount },
          workerTransfers: { total: totalWorkerTransfers, count: wtCount },
          supplierPayments: { total: totalSupplierPaymentsComp, count: supplierPaymentsCount },
        },
        cashCustody: {
          totalFundTransfersIn,
          totalProjectTransfersIn,
          totalProjectTransfersOut,
          totalExpenses,
          netBalance: balance,
          fundTransferItems: fundTransferItemsResult.rows.map(r => ({
            date: r.date || '-',
            amount: safeNum(r.amount),
            senderName: r.sender_name || '-',
            transferType: r.transfer_type || '-',
          })),
        },
        equipmentSummary: {
          totalEquipment: equipmentResult.rows.length,
          byStatus: equipmentByStatusResult.rows.map(r => ({ status: r.status, count: safeNum(r.count) })),
          items: equipmentResult.rows.map(r => ({
            name: r.name || '-',
            code: r.code || '-',
            type: r.type || '-',
            status: r.status || 'active',
            condition: r.condition || '-',
            quantity: safeNum(r.quantity),
          })),
        },
        totals: {
          totalIncome,
          totalExpenses,
          totalWages,
          totalMaterials,
          totalTransport,
          totalMisc,
          totalWorkerTransfers,
          totalSupplierPayments: totalSupplierPaymentsComp,
          totalProjectTransfersOut,
          totalProjectTransfersIn,
          balance,
          budgetUtilization,
        },
      };
    } finally {
      client.release();
    }
  }
}

export const reportDataService = new ReportDataService();
