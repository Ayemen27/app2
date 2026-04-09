import ExcelJS from 'exceljs';
import { MultiProjectFinalReportData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter, xlSignatures,
} from './shared-styles';

export async function generateMultiProjectFinalExcel(data: MultiProjectFinalReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction System';
  workbook.created = new Date();

  const COL_COUNT = 10;
  const ws = workbook.addWorksheet('التقرير المجمع', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'التقرير الختامي المجمع للمشاريع', COL_COUNT);
  row = xlInfoRow(ws, row, `المشاريع: ${data.projectNames.join(' + ')}  |  الفترة: ${formatDateBR(data.period.from)} - ${formatDateBR(data.period.to)}`, COL_COUNT);

  row++;
  const kpiLabels = ['الإيرادات', 'المصروفات', 'الرصيد', 'تحويلات بين المشاريع'];
  const kpiValues = [
    formatNum(data.combinedTotals.totalIncome),
    formatNum(data.combinedTotals.totalExpenses),
    formatNum(data.combinedTotals.balance),
    formatNum(data.combinedTotals.totalInterProjectTransfers),
  ];
  const kpiPairs: [number, number][] = [[1, 2], [3, 4], [5, 7], [8, 10]];
  const kpiRow = ws.getRow(row);
  const kpiLabelRow = ws.getRow(row + 1);
  kpiPairs.forEach(([s, e], i) => {
    ws.mergeCells(row, s, row, e);
    ws.mergeCells(row + 1, s, row + 1, e);
    const valCell = kpiRow.getCell(s);
    valCell.value = kpiValues[i];
    valCell.font = { bold: true, size: 11, color: { argb: COLORS.navy }, name: 'Calibri' };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
    valCell.border = BORDER;
    const lblCell = kpiLabelRow.getCell(s);
    lblCell.value = kpiLabels[i];
    lblCell.font = { size: 9, color: { argb: COLORS.gray500 }, name: 'Calibri' };
    lblCell.alignment = { horizontal: 'center', vertical: 'middle' };
    lblCell.border = BORDER;
  });
  kpiRow.height = 26;
  kpiLabelRow.height = 20;
  row += 3;

  for (const proj of data.projects) {
    row = xlSectionHeader(ws, row, `مشروع: ${proj.projectName}`, COL_COUNT);

    row = xlTableHeader(ws, row, ['البند', 'المبلغ']);
    const summaryItems = [
      ['إجمالي الإيرادات (العهدة)', formatNum(proj.totals.totalIncome)],
      ['أجور العمال المدفوعة', formatNum(proj.totals.totalPaidWages ?? proj.totals.totalWages)],
      ['إجمالي المواد', formatNum(proj.totals.totalMaterials)],
      ['إجمالي النقل', formatNum(proj.totals.totalTransport)],
      ['إجمالي النثريات', formatNum(proj.totals.totalMisc)],
      ['حوالات العمال', formatNum(proj.totals.totalWorkerTransfers)],
      ['ترحيل صادر', formatNum(proj.totals.totalProjectTransfersOut)],
      ['ترحيل وارد', formatNum(proj.totals.totalProjectTransfersIn)],
    ];
    summaryItems.forEach(([label, val], idx) => {
      const r = ws.getRow(row);
      r.getCell(1).value = label;
      r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(1).font = { size: 10, name: 'Calibri' };
      r.getCell(1).border = BORDER;
      ws.mergeCells(row, 1, row, 8);
      r.getCell(9).value = val;
      ws.mergeCells(row, 9, row, 10);
      r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(9).font = { size: 10, name: 'Calibri', bold: false };
      r.getCell(9).border = BORDER;
      if (idx % 2 === 1) {
        for (let c = 1; c <= COL_COUNT; c++) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
        }
      }
      r.height = 22;
      row++;
    });

    {
      const r = ws.getRow(row);
      ws.mergeCells(row, 1, row, 8);
      r.getCell(1).value = 'إجمالي المصروفات';
      r.getCell(1).font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
      r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(1).border = BORDER;
      ws.mergeCells(row, 9, row, 10);
      r.getCell(9).value = formatNum(proj.totals.totalExpenses);
      r.getCell(9).font = { bold: true, size: 10, color: { argb: COLORS.red }, name: 'Calibri' };
      r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
      r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(9).border = BORDER;
      r.height = 26;
      row++;
    }

    {
      const r = ws.getRow(row);
      ws.mergeCells(row, 1, row, 8);
      r.getCell(1).value = 'الرصيد';
      ws.mergeCells(row, 9, row, 10);
      r.getCell(9).value = formatNum(proj.totals.balance);
      const vals = [r.getCell(1), r.getCell(9)];
      vals.forEach(c => {
        c.font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = BORDER;
      });
      r.height = 28;
      row++;
    }
    row++;
  }

  // ─── جدول ملخص العمالة المجمع ───
  // الشكل: صف لكل مشروع، مع دمج خلايا (#، اسم العامل، إجمالي المتبقي) عبر صفوف نفس العامل
  // الأعمدة: # | اسم العامل | المشروع | النوع | الأيام | المستحق | المدفوع | الحوالات | إجمالي المدفوع | المتبقي | إجمالي المتبقي
  const hasRebalance = data.combinedSections.attendance.byWorker.some(w => ((w as any).rebalanceDelta ?? 0) !== 0);
  const WORKER_COL_COUNT = hasRebalance ? 13 : 12;

  if (!ws.getColumn(11).width) ws.getColumn(11).width = 14;
  if (!ws.getColumn(12).width) ws.getColumn(12).width = 16;
  if (hasRebalance && !ws.getColumn(13).width) ws.getColumn(13).width = 16;

  row = xlSectionHeader(ws, row, 'ملخص العمالة المجمع', WORKER_COL_COUNT);

  {
    const hdr = ws.getRow(row);
    const headers = hasRebalance
      ? ['#', 'اسم العامل', 'المشروع', 'النوع', 'الأيام', 'المستحق', 'أجور مدفوعة', 'الحوالات', 'إجمالي المدفوع', 'المتبقي', 'التصفية البينية', 'المتبقي الصافي', 'صافي المتبقي الكلي']
      : ['#', 'اسم العامل', 'المشروع', 'النوع', 'الأيام', 'المستحق', 'أجور مدفوعة', 'الحوالات', 'إجمالي المدفوع', 'المتبقي', 'المتبقي الصافي', 'صافي المتبقي الكلي'];
    headers.forEach((h, i) => {
      const cell = hdr.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = BORDER;
    });
    hdr.height = 30;
    row++;
  }

  // تجميع العمال: كل عامل → قائمة صفوف مشاريعه مرتبة
  type WorkerRows = {
    workerName: string;
    rows: Array<{
      projectName: string; workerType: string;
      totalDays: number; totalEarned: number;
      totalDirectPaid: number; totalTransfers: number;
      totalPaid: number; balance: number;
      rebalanceDelta: number; adjustedBalance: number;
    }>;
    totalBalance: number;
    totalAdjustedBalance?: number;
  };

  const workerGroupMap = new Map<string, WorkerRows>();
  data.combinedSections.attendance.byWorker.forEach(w => {
    if (!workerGroupMap.has(w.workerId)) {
      workerGroupMap.set(w.workerId, { workerName: w.workerName, rows: [], totalBalance: 0 });
    }
    const g = workerGroupMap.get(w.workerId)!;
    g.rows.push({
      projectName: w.projectName, workerType: w.workerType,
      totalDays: w.totalDays, totalEarned: w.totalEarned,
      totalDirectPaid: w.totalDirectPaid, totalTransfers: w.totalTransfers,
      totalPaid: w.totalPaid, balance: w.balance,
      rebalanceDelta: (w as any).rebalanceDelta ?? 0,
      adjustedBalance: (w as any).adjustedBalance ?? w.balance,
    });
    g.totalBalance += w.balance;
    g.totalAdjustedBalance = (g.totalAdjustedBalance || 0) + ((w as any).adjustedBalance ?? w.balance);
  });

  let grandDays = 0, grandEarned = 0, grandPaid = 0, grandTransfers = 0, grandBal = 0, grandRebalance = 0, grandAdjusted = 0;
  let workerSeq = 0;

  for (const [, wg] of workerGroupMap) {
    workerSeq++;
    const rowCount = wg.rows.length;
    const startRow = row;
    const bgColor = workerSeq % 2 === 0 ? COLORS.lightBlue : null;

    wg.rows.forEach((pRow) => {
      const r = ws.getRow(row);
      const vals = [
        workerSeq,
        wg.workerName,
        pRow.projectName,
        pRow.workerType,
        pRow.totalDays,
        formatNum(pRow.totalEarned),
        formatNum(pRow.totalDirectPaid),
        formatNum(pRow.totalTransfers),
        formatNum(pRow.totalPaid),
        formatNum(pRow.balance),
        ...(hasRebalance ? [formatNum(pRow.rebalanceDelta)] : []),
        formatNum(pRow.adjustedBalance),
        formatNum(wg.totalAdjustedBalance ?? wg.totalBalance),
      ];
      vals.forEach((v, ci) => {
        const cell = r.getCell(ci + 1);
        cell.value = v;
        cell.font = { size: 10, name: 'Calibri' };
        cell.border = BORDER;
        cell.alignment = {
          horizontal: ci === 1 || ci === 2 || ci === 3 ? 'right' : 'center',
          vertical: 'middle',
          wrapText: ci === 1 || ci === 2,
        };
        if (bgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      });
      r.height = 24;

      grandDays += pRow.totalDays;
      grandEarned += pRow.totalEarned;
      grandPaid += pRow.totalPaid;
      grandTransfers += pRow.totalTransfers;
      grandBal += pRow.balance;
      grandRebalance += pRow.rebalanceDelta;
      grandAdjusted += pRow.adjustedBalance;
      row++;
    });

    const lastCol = WORKER_COL_COUNT;
    if (rowCount > 1) {
      ws.mergeCells(startRow, 1, row - 1, 1);
      ws.mergeCells(startRow, 2, row - 1, 2);
      ws.mergeCells(startRow, lastCol, row - 1, lastCol);
      [1, 2, lastCol].forEach(ci => {
        const cell = ws.getCell(startRow, ci);
        cell.alignment = { horizontal: ci === 2 ? 'right' : 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 10, name: 'Calibri', bold: ci === lastCol };
        cell.border = BORDER;
        if (bgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      });
    }
  }

  {
    const r = ws.getRow(row);
    ws.mergeCells(row, 1, row, 4);
    r.getCell(1).value = 'الإجمالي العام';
    const totVals: (string | number | undefined)[] = [
      undefined, undefined, undefined, undefined,
      grandDays, formatNum(grandEarned), formatNum(grandPaid - grandTransfers),
      formatNum(grandTransfers), formatNum(grandPaid), formatNum(grandBal),
      ...(hasRebalance ? [formatNum(grandRebalance)] : []),
      formatNum(grandAdjusted), formatNum(grandAdjusted),
    ];
    totVals.forEach((v, i) => {
      const cell = r.getCell(i + 1);
      if (v !== undefined) cell.value = v;
      cell.font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER;
    });
    r.height = 26;
    row++;
  }

  row++;

  if (data.combinedSections.materials.items.length > 0) {
    row = xlSectionHeader(ws, row, 'ملخص المواد المجمع', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'المادة', 'المشروع', 'الكمية', 'المبلغ', 'المورد', '', '', '', '']);
    data.combinedSections.materials.items.forEach((m, idx) => {
      row = xlDataRow(ws, row, [
        idx + 1, m.materialName, m.projectName, formatNum(m.totalQuantity),
        formatNum(m.totalAmount), m.supplierName, '', '', '', '',
      ], idx % 2 === 1);
    });
    row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', '', formatNum(data.combinedSections.materials.total), `المدفوع: ${formatNum(data.combinedSections.materials.totalPaid)}`, '', '', '', '']);
    row++;
  }

  if (data.rebalanceTransfers && data.rebalanceTransfers.length > 0) {
    row = xlSectionHeader(ws, row, 'التصفيات البينية للعمال بين المشاريع', COL_COUNT);

    // مصفوفة الديون
    if (data.projectDebtMatrix && data.projectDebtMatrix.length > 0) {
      row = xlInfoRow(ws, row, 'ملخص الديون البينية بين المشاريع', COL_COUNT);
      row = xlTableHeader(ws, row, ['#', 'المشروع الدافع', 'المشروع المستفيد', 'إجمالي المحوَّل', '', '', '', '', '', '']);
      data.projectDebtMatrix.forEach((r, idx) => {
        row = xlDataRow(ws, row, [
          idx + 1, r.fromProjectName, r.toProjectName,
          formatNum(r.totalAmount), '', '', '', '', '', '',
        ], idx % 2 === 1);
      });
      const totalMatrix = data.projectDebtMatrix.reduce((s, r) => s + r.totalAmount, 0);
      row = xlTotalsRow(ws, row, ['', 'الإجمالي الكلي', '', formatNum(totalMatrix), '', '', '', '', '', '']);
      row++;
    }

    // تفاصيل التسويات
    row = xlInfoRow(ws, row, 'تفاصيل التصفيات البينية', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'التاريخ', 'اسم العامل', 'من مشروع', 'إلى مشروع', 'المبلغ', '', '', '', '']);
    data.rebalanceTransfers.forEach((t, idx) => {
      row = xlDataRow(ws, row, [
        idx + 1, formatDateBR(t.date), t.workerName,
        t.fromProjectName, t.toProjectName, formatNum(t.amount),
        '', '', '', '',
      ], idx % 2 === 1);
    });
    const totalReb = data.rebalanceTransfers.reduce((s, t) => s + t.amount, 0);
    row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', '', '', formatNum(totalReb), '', '', '', '']);
    row++;
  }

  if (data.interProjectTransfers.length > 0) {
    row = xlSectionHeader(ws, row, 'التحويلات بين المشاريع المحددة', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'التاريخ', 'من مشروع', 'إلى مشروع', 'المبلغ', 'السبب', '', '', '', '']);
    data.interProjectTransfers.forEach((t, idx) => {
      row = xlDataRow(ws, row, [
        idx + 1, formatDateBR(t.date), t.fromProjectName, t.toProjectName,
        formatNum(t.amount), t.reason, '', '', '', '',
      ], idx % 2 === 1);
    });
    const totalInterProject = data.interProjectTransfers.reduce((s, t) => s + t.amount, 0);
    row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', '', formatNum(totalInterProject), '', '', '', '', '']);
    row++;
  }

  row = xlSectionHeader(ws, row, 'الملخص المالي الشامل المجمع', COL_COUNT);
  const grandSummary = [
    ['إجمالي العهدة (التحويلات المالية)', data.combinedTotals.totalFundTransfers],
    ['ترحيل وارد من مشاريع أخرى', data.combinedTotals.totalProjectTransfersIn],
    ['إجمالي الإيرادات', data.combinedTotals.totalIncome],
    ['أجور العمال المدفوعة', data.combinedTotals.totalPaidWages ?? data.combinedTotals.totalWages],
    ['إجمالي المواد', data.combinedTotals.totalMaterials],
    ['إجمالي النقل', data.combinedTotals.totalTransport],
    ['إجمالي النثريات', data.combinedTotals.totalMisc],
    ['حوالات العمال', data.combinedTotals.totalWorkerTransfers],
    ['ترحيل صادر لمشاريع أخرى', data.combinedTotals.totalProjectTransfersOut],
    ['تحويلات بين المشاريع المحددة', data.combinedTotals.totalInterProjectTransfers],
  ].filter(([, val]) => (val as number) > 0) as [string, number][];
  grandSummary.forEach(([label, val], idx) => {
    const r = ws.getRow(row);
    ws.mergeCells(row, 1, row, 8);
    r.getCell(1).value = label;
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).font = { size: 10, name: 'Calibri' };
    r.getCell(1).border = BORDER;
    ws.mergeCells(row, 9, row, 10);
    r.getCell(9).value = val;
    r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(9).font = { size: 10, name: 'Calibri' };
    r.getCell(9).border = BORDER;
    if (idx % 2 === 1) {
      for (let c = 1; c <= COL_COUNT; c++) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      }
    }
    r.height = 22;
    row++;
  });

  row = xlTotalsRow(ws, row, ['', '', '', '', '', '', '', 'إجمالي المصروفات', formatNum(data.combinedTotals.totalExpenses), '']);
  row = xlGrandTotalRow(ws, row, ['', '', '', '', '', '', '', 'الرصيد النهائي', formatNum(data.combinedTotals.balance), '']);

  row++;
  row = xlSignatures(ws, row, ['المهندس', 'المدير', 'المدير المالي'], [[1, 3], [4, 7], [8, 10]]);
  row++;
  row = xlFooter(ws, row, COL_COUNT);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
