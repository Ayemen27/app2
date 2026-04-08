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
      ['إجمالي الأجور', formatNum(proj.totals.totalWages)],
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

  // تجميع العمال حسب workerId لدمج من اشتغل في أكثر من مشروع في صف واحد
  const projectsList = data.projectNames;
  const nProjects = projectsList.length;

  const workerMap = new Map<string, {
    workerName: string;
    workerType: string;
    projects: Map<string, { days: number; earned: number; directPaid: number; transfers: number; paid: number; balance: number }>;
  }>();

  data.combinedSections.attendance.byWorker.forEach(w => {
    if (!workerMap.has(w.workerId)) {
      workerMap.set(w.workerId, { workerName: w.workerName, workerType: w.workerType, projects: new Map() });
    }
    const entry = workerMap.get(w.workerId)!;
    const existing = entry.projects.get(w.projectName);
    if (existing) {
      existing.days += w.totalDays;
      existing.earned += w.totalEarned;
      existing.directPaid += w.totalDirectPaid;
      existing.transfers += w.totalTransfers;
      existing.paid += w.totalPaid;
      existing.balance += w.balance;
    } else {
      entry.projects.set(w.projectName, {
        days: w.totalDays, earned: w.totalEarned, directPaid: w.totalDirectPaid,
        transfers: w.totalTransfers, paid: w.totalPaid, balance: w.balance,
      });
    }
  });

  // عدد الأعمدة: # + اسم + نوع + (أيام+مستحق لكل مشروع) + إجمالي الأيام + إجمالي المستحق + إجمالي المدفوع + الحوالات + المتبقي
  const workerTableCols = 3 + nProjects * 2 + 5;
  const workerSectionCols = Math.max(COL_COUNT, workerTableCols);

  // توسيع الأعمدة إن احتاج الجدول أكثر من COL_COUNT
  for (let i = COL_COUNT + 1; i <= workerTableCols; i++) {
    ws.getColumn(i).width = 13;
  }

  row = xlSectionHeader(ws, row, 'ملخص العمالة المجمع', workerSectionCols);

  // رأس الجدول الديناميكي
  {
    const hdr = ws.getRow(row);
    const headers: string[] = ['#', 'اسم العامل', 'النوع'];
    for (const pName of projectsList) {
      headers.push(`${pName}\nأيام`);
      headers.push(`${pName}\nمستحق`);
    }
    headers.push('إجمالي الأيام', 'إجمالي المستحق', 'إجمالي المدفوع', 'الحوالات', 'المتبقي');
    headers.forEach((h, i) => {
      const cell = hdr.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: COLORS.white }, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = BORDER;
    });
    hdr.height = 34;
    row++;
  }

  // بيانات العمال المجمعة
  let totalDays = 0, totalEarned = 0, totalPaid = 0, totalTransfers = 0, totalBal = 0;
  let workerIdx = 0;

  for (const [, wData] of workerMap) {
    workerIdx++;
    let sumDays = 0, sumEarned = 0, sumPaid = 0, sumTransfers = 0, sumBalance = 0;
    const rowVals: (string | number)[] = [workerIdx, wData.workerName, wData.workerType];

    for (const pName of projectsList) {
      const pd = wData.projects.get(pName);
      if (pd) {
        rowVals.push(pd.days, formatNum(pd.earned));
        sumDays += pd.days;
        sumEarned += pd.earned;
        sumPaid += pd.paid;
        sumTransfers += pd.transfers;
        sumBalance += pd.balance;
      } else {
        rowVals.push('-', '-');
      }
    }
    rowVals.push(sumDays, formatNum(sumEarned), formatNum(sumPaid), formatNum(sumTransfers), formatNum(sumBalance));

    const r = ws.getRow(row);
    rowVals.forEach((v, i) => {
      const cell = r.getCell(i + 1);
      cell.value = v;
      cell.alignment = { horizontal: (i === 1 || i === 2) ? 'right' : 'center', vertical: 'middle' };
      cell.font = { size: 10, name: 'Calibri' };
      cell.border = BORDER;
      if (workerIdx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      }
    });
    r.height = 24;
    row++;

    totalDays += sumDays;
    totalEarned += sumEarned;
    totalPaid += sumPaid;
    totalTransfers += sumTransfers;
    totalBal += sumBalance;
  }

  // صف الإجمالي النهائي
  {
    const r = ws.getRow(row);
    ws.mergeCells(row, 1, row, 3);
    r.getCell(1).value = 'الإجمالي العام';

    let col = 4;
    for (const pName of projectsList) {
      let projDays = 0, projEarned = 0;
      data.combinedSections.attendance.byWorker.forEach(w => {
        if (w.projectName === pName) { projDays += w.totalDays; projEarned += w.totalEarned; }
      });
      r.getCell(col).value = projDays;
      r.getCell(col + 1).value = formatNum(projEarned);
      col += 2;
    }
    r.getCell(col).value = totalDays;
    r.getCell(col + 1).value = formatNum(totalEarned);
    r.getCell(col + 2).value = formatNum(totalPaid);
    r.getCell(col + 3).value = formatNum(totalTransfers);
    r.getCell(col + 4).value = formatNum(totalBal);

    for (let c = 1; c <= workerTableCols; c++) {
      r.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
      r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(c).border = BORDER;
    }
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
    ['إجمالي العهدة (التحويلات المالية)', formatNum(data.combinedTotals.totalFundTransfers)],
    ['ترحيل وارد من مشاريع أخرى', formatNum(data.combinedTotals.totalProjectTransfersIn)],
    ['إجمالي الإيرادات', formatNum(data.combinedTotals.totalIncome)],
    ['إجمالي الأجور', formatNum(data.combinedTotals.totalWages)],
    ['إجمالي المواد', formatNum(data.combinedTotals.totalMaterials)],
    ['إجمالي النقل', formatNum(data.combinedTotals.totalTransport)],
    ['إجمالي النثريات', formatNum(data.combinedTotals.totalMisc)],
    ['حوالات العمال', formatNum(data.combinedTotals.totalWorkerTransfers)],
    ['ترحيل صادر لمشاريع أخرى', formatNum(data.combinedTotals.totalProjectTransfersOut)],
    ['تحويلات بين المشاريع المحددة', formatNum(data.combinedTotals.totalInterProjectTransfers)],
  ];
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
