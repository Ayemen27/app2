import ExcelJS from 'exceljs';
import { PeriodFinalReportData } from '../../../../shared/report-types';

const primaryColor = 'FF1F4E79';
const headerBlue = 'FF2E75B6';
const lightBlue = 'FFE7F3FF';
const greenBg = 'FFC6EFCE';
const orangeBg = 'FFFCE4D6';
const yellowBg = 'FFFFFF00';
const white = 'FFFFFFFF';
const black = 'FF000000';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
  left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
  bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
  right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
};

function applyBorders(row: ExcelJS.Row, colCount: number) {
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = thinBorder;
  }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sectionHeader(ws: ExcelJS.Worksheet, row: number, text: string, colCount: number) {
  ws.mergeCells(row, 1, row, colCount);
  const r = ws.getRow(row);
  r.getCell(1).value = text;
  r.getCell(1).font = { bold: true, size: 12, color: { argb: white } };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r.height = 26;
  applyBorders(r, colCount);
}

function tableHeaderRow(ws: ExcelJS.Worksheet, row: number, headers: string[]) {
  const r = ws.getRow(row);
  headers.forEach((h, i) => {
    r.getCell(i + 1).value = h;
    r.getCell(i + 1).font = { bold: true, size: 10, color: { argb: white } };
    r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
    r.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    r.getCell(i + 1).border = thinBorder;
  });
  r.height = 24;
}

function dataRow(ws: ExcelJS.Worksheet, row: number, values: any[], colCount: number, isAlt: boolean) {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    r.getCell(i + 1).value = v;
    r.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    r.getCell(i + 1).font = { size: 10 };
    if (isAlt) {
      r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
    }
    r.getCell(i + 1).border = thinBorder;
  });
  r.height = 20;
}

function totalsRow(ws: ExcelJS.Worksheet, row: number, values: any[], colCount: number) {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    r.getCell(i + 1).value = v;
    r.getCell(i + 1).font = { bold: true, size: 10, color: { argb: black } };
    r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellowBg } };
    r.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(i + 1).border = thinBorder;
  });
  r.height = 24;
}

export async function generatePeriodFinalExcel(data: PeriodFinalReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'نظام إدارة المشاريع';
  workbook.created = new Date();

  const COL_COUNT = 8;
  const ws = workbook.addWorksheet('التقرير الختامي', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 20 }, { width: 14 }, { width: 12 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  let row = 1;

  ws.mergeCells(row, 1, row, COL_COUNT);
  const companyCell = ws.getRow(row).getCell(1);
  companyCell.value = 'الفتيني للمقاولات العامة والاستشارات الهندسية';
  companyCell.font = { bold: true, size: 14, color: { argb: white } };
  companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 32;
  row++;

  ws.mergeCells(row, 1, row, COL_COUNT);
  const titleCell = ws.getRow(row).getCell(1);
  titleCell.value = 'التقرير الختامي للفترة';
  titleCell.font = { bold: true, size: 13, color: { argb: white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 28;
  row++;

  ws.mergeCells(row, 1, row, COL_COUNT);
  const infoCell = ws.getRow(row).getCell(1);
  infoCell.value = `المشروع: ${data.project.name}  |  الفترة: ${data.period.from} إلى ${data.period.to}  |  المهندس: ${data.project.engineerName || '-'}`;
  infoCell.font = { size: 10 };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 22;
  row++;

  row++;
  const kpiLabels = ['الإيرادات', 'المصروفات', 'الرصيد', 'نسبة الاستخدام'];
  const kpiValues = [
    fmt(data.totals.totalIncome),
    fmt(data.totals.totalExpenses),
    fmt(data.totals.balance),
    data.totals.budgetUtilization != null ? `${data.totals.budgetUtilization.toFixed(1)}%` : '-',
  ];
  const kpiRow = ws.getRow(row);
  const kpiLabelRow = ws.getRow(row + 1);
  const kpiPairs = [[1, 2], [3, 4], [5, 6], [7, 8]];
  kpiPairs.forEach(([s, e], i) => {
    ws.mergeCells(row, s, row, e);
    ws.mergeCells(row + 1, s, row + 1, e);
    const valCell = kpiRow.getCell(s);
    valCell.value = kpiValues[i];
    valCell.font = { bold: true, size: 11, color: { argb: primaryColor } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valCell.border = thinBorder;
    const lblCell = kpiLabelRow.getCell(s);
    lblCell.value = kpiLabels[i];
    lblCell.font = { size: 9, color: { argb: 'FF666666' } };
    lblCell.alignment = { horizontal: 'center', vertical: 'middle' };
    lblCell.border = thinBorder;
  });
  kpiRow.height = 22;
  kpiLabelRow.height = 18;
  row += 3;

  sectionHeader(ws, row, 'ملخص الحضور حسب العامل', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'اسم العامل', 'النوع', 'إجمالي الأيام', 'إجمالي المستحق', 'إجمالي المدفوع', 'الرصيد', '']);
  row++;
  let totalAttDays = 0, totalAttEarned = 0, totalAttPaid = 0, totalAttBalance = 0;
  data.sections.attendance.byWorker.forEach((w, idx) => {
    dataRow(ws, row, [idx + 1, w.workerName, w.workerType, w.totalDays, fmt(w.totalEarned), fmt(w.totalPaid), fmt(w.balance), ''], COL_COUNT, idx % 2 === 1);
    totalAttDays += w.totalDays;
    totalAttEarned += w.totalEarned;
    totalAttPaid += w.totalPaid;
    totalAttBalance += w.balance;
    row++;
  });
  totalsRow(ws, row, ['', 'الإجمالي', '', totalAttDays, fmt(totalAttEarned), fmt(totalAttPaid), fmt(totalAttBalance), ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'ملخص المواد', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'اسم المادة', 'الكمية', 'الإجمالي', 'المورد', '', '', '']);
  row++;
  data.sections.materials.items.forEach((m, idx) => {
    dataRow(ws, row, [idx + 1, m.materialName, m.totalQuantity, fmt(m.totalAmount), m.supplierName, '', '', ''], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', 'الإجمالي', '', fmt(data.sections.materials.total), '', '', '', ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'تحويلات العهدة', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'التاريخ', 'المبلغ', 'المرسل', 'نوع التحويل', '', '', '']);
  row++;
  data.sections.fundTransfers.items.forEach((ft, idx) => {
    dataRow(ws, row, [idx + 1, ft.date, fmt(ft.amount), ft.senderName, ft.transferType, '', '', ''], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', 'الإجمالي', fmt(data.sections.fundTransfers.total), '', '', '', '', ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'الملخص الشامل', COL_COUNT);
  row++;
  const summaryItems = [
    ['إجمالي الإيرادات', fmt(data.totals.totalIncome)],
    ['إجمالي الأجور', fmt(data.totals.totalWages)],
    ['إجمالي المواد', fmt(data.totals.totalMaterials)],
    ['إجمالي النقل', fmt(data.totals.totalTransport)],
    ['إجمالي النثريات', fmt(data.totals.totalMisc)],
    ['إجمالي حوالات العمال', fmt(data.totals.totalWorkerTransfers)],
    ['إجمالي المصروفات', fmt(data.totals.totalExpenses)],
    ['الرصيد النهائي', fmt(data.totals.balance)],
  ];
  summaryItems.forEach(([label, value], idx) => {
    ws.mergeCells(row, 1, row, 4);
    ws.mergeCells(row, 5, row, COL_COUNT);
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = thinBorder;
    r.getCell(5).value = value;
    r.getCell(5).font = { bold: idx >= 6, size: 10 };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).border = thinBorder;
    if (idx % 2 === 1) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
      r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
    }
    if (idx === summaryItems.length - 1) {
      const bgColor = data.totals.balance >= 0 ? greenBg : orangeBg;
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      r.getCell(1).font = { bold: true, size: 11 };
      r.getCell(5).font = { bold: true, size: 11 };
    }
    r.height = 22;
    row++;
  });

  if (data.totals.budgetUtilization != null) {
    ws.mergeCells(row, 1, row, 4);
    ws.mergeCells(row, 5, row, COL_COUNT);
    const r = ws.getRow(row);
    r.getCell(1).value = 'نسبة استخدام الميزانية';
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = thinBorder;
    r.getCell(5).value = `${data.totals.budgetUtilization.toFixed(1)}%`;
    r.getCell(5).font = { bold: true, size: 11 };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).border = thinBorder;
    r.height = 22;
    row++;
  }

  row += 2;
  const sigRow = ws.getRow(row);
  sigRow.height = 60;
  const signatures = ['المهندس', 'المدير', 'المدير المالي'];
  const sigCols: [number, number][] = [[1, 2], [3, 5], [6, 8]];
  signatures.forEach((sig, i) => {
    ws.mergeCells(row, sigCols[i][0], row, sigCols[i][1]);
    const cell = sigRow.getCell(sigCols[i][0]);
    cell.value = `${sig}\n.................................\nالتاريخ:`;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  row += 2;
  ws.mergeCells(row, 1, row, COL_COUNT);
  const footerRow = ws.getRow(row);
  footerRow.getCell(1).value = `تم إنشاء التقرير بتاريخ: ${new Date().toLocaleDateString('ar-SA')} - نظام إدارة المشاريع`;
  footerRow.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF888888' } };
  footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.headerFooter = {
    oddFooter: '&C صفحة &P من &N',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
