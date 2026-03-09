import ExcelJS from 'exceljs';
import { DailyReportData } from '../../../../shared/report-types';

const primaryColor = 'FF1F4E79';
const headerBlue = 'FF2E75B6';
const lightBlue = 'FFE7F3FF';
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

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateDailyReportExcel(data: DailyReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'نظام إدارة المشاريع';
  workbook.created = new Date();

  const COL_COUNT = 9;
  const ws = workbook.addWorksheet('التقرير اليومي', {
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
    { width: 5 }, { width: 20 }, { width: 12 }, { width: 10 },
    { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 25 },
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
  titleCell.value = 'التقرير اليومي الشامل';
  titleCell.font = { bold: true, size: 13, color: { argb: white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 28;
  row++;

  ws.mergeCells(row, 1, row, COL_COUNT);
  const infoCell = ws.getRow(row).getCell(1);
  infoCell.value = `المشروع: ${data.project.name}  |  التاريخ: ${data.date}  |  المهندس: ${data.project.engineerName || '-'}`;
  infoCell.font = { size: 10 };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 22;
  row++;

  row++;
  const kpiLabels = ['إجمالي الأجور', 'المواد', 'النقل', 'النثريات', 'تحويلات العهدة', 'الرصيد'];
  const kpiValues = [
    data.totals.totalWorkerWages, data.totals.totalMaterials, data.totals.totalTransport,
    data.totals.totalMiscExpenses, data.totals.totalFundTransfers, data.totals.balance,
  ];
  const kpiRow = ws.getRow(row);
  const kpiLabelRow = ws.getRow(row + 1);
  for (let i = 0; i < 6; i++) {
    const colStart = i < 3 ? i * 3 + 1 : i * 3 + 1;
  }
  const kpiColPairs = [[1, 1], [2, 3], [4, 4], [5, 5], [6, 7], [8, 9]];
  kpiColPairs.forEach(([s, e], i) => {
    if (s !== e) ws.mergeCells(row, s, row, e);
    if (s !== e) ws.mergeCells(row + 1, s, row + 1, e);
    const valCell = kpiRow.getCell(s);
    valCell.value = fmt(kpiValues[i]);
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

  sectionHeader(ws, row, 'سجل الحضور والأجور', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'اسم العامل', 'النوع', 'أيام العمل', 'الأجر اليومي', 'إجمالي الأجر', 'المدفوع', 'المتبقي', 'الوصف']);
  row++;
  data.attendance.forEach((rec, idx) => {
    dataRow(ws, row, [idx + 1, rec.workerName, rec.workerType, rec.workDays, fmt(rec.dailyWage), fmt(rec.totalWage), fmt(rec.paidAmount), fmt(rec.remainingAmount), rec.workDescription], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', 'الإجمالي', '', data.totals.totalWorkDays, '', fmt(data.totals.totalWorkerWages), fmt(data.totals.totalPaidWages), fmt(data.totals.totalWorkerWages - data.totals.totalPaidWages), ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'مشتريات المواد', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'اسم المادة', 'الفئة', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'المدفوع', 'المتبقي', 'المورد']);
  row++;
  data.materials.forEach((rec, idx) => {
    dataRow(ws, row, [idx + 1, rec.materialName, rec.category, rec.quantity, fmt(rec.unitPrice), fmt(rec.totalAmount), fmt(rec.paidAmount), fmt(rec.remainingAmount), rec.supplierName], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', 'الإجمالي', '', '', '', fmt(data.totals.totalMaterials), '', '', ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'مصاريف النقل', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'المبلغ', 'الوصف', 'اسم العامل', '', '', '', '', '']);
  row++;
  data.transport.forEach((rec, idx) => {
    dataRow(ws, row, [idx + 1, fmt(rec.amount), rec.description, rec.workerName, '', '', '', '', ''], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', fmt(data.totals.totalTransport), 'الإجمالي', '', '', '', '', '', ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'مصاريف متنوعة', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'المبلغ', 'الوصف', 'ملاحظات', '', '', '', '', '']);
  row++;
  data.miscExpenses.forEach((rec, idx) => {
    dataRow(ws, row, [idx + 1, fmt(rec.amount), rec.description, rec.notes, '', '', '', '', ''], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', fmt(data.totals.totalMiscExpenses), 'الإجمالي', '', '', '', '', '', ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'حوالات العمال', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'اسم العامل', 'المبلغ', 'المستلم', 'طريقة التحويل', '', '', '', '']);
  row++;
  data.workerTransfers.forEach((rec, idx) => {
    dataRow(ws, row, [idx + 1, rec.workerName, fmt(rec.amount), rec.recipientName, rec.transferMethod, '', '', '', ''], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', 'الإجمالي', fmt(data.totals.totalWorkerTransfers), '', '', '', '', '', ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'تحويلات العهدة', COL_COUNT);
  row++;
  tableHeaderRow(ws, row, ['#', 'المبلغ', 'المرسل', 'نوع التحويل', 'رقم التحويل', '', '', '', '']);
  row++;
  data.fundTransfers.forEach((rec, idx) => {
    dataRow(ws, row, [idx + 1, fmt(rec.amount), rec.senderName, rec.transferType, rec.transferNumber, '', '', '', ''], COL_COUNT, idx % 2 === 1);
    row++;
  });
  totalsRow(ws, row, ['', fmt(data.totals.totalFundTransfers), 'الإجمالي', '', '', '', '', '', ''], COL_COUNT);
  row += 2;

  sectionHeader(ws, row, 'ملخص اليوم', COL_COUNT);
  row++;
  const summaryItems = [
    ['إجمالي أجور العمال', fmt(data.totals.totalWorkerWages)],
    ['إجمالي المدفوعات', fmt(data.totals.totalPaidWages)],
    ['إجمالي المواد', fmt(data.totals.totalMaterials)],
    ['إجمالي النقل', fmt(data.totals.totalTransport)],
    ['إجمالي النثريات', fmt(data.totals.totalMiscExpenses)],
    ['إجمالي حوالات العمال', fmt(data.totals.totalWorkerTransfers)],
    ['إجمالي تحويلات العهدة', fmt(data.totals.totalFundTransfers)],
    ['إجمالي المصروفات', fmt(data.totals.totalExpenses)],
    ['الرصيد', fmt(data.totals.balance)],
  ];
  summaryItems.forEach(([label, value], idx) => {
    ws.mergeCells(row, 1, row, 5);
    ws.mergeCells(row, 6, row, COL_COUNT);
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = thinBorder;
    r.getCell(6).value = value;
    r.getCell(6).font = { bold: idx >= 7, size: 10 };
    r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(6).border = thinBorder;
    if (idx % 2 === 1) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
    }
    if (idx === summaryItems.length - 1) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellowBg } };
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellowBg } };
      r.getCell(1).font = { bold: true, size: 11 };
      r.getCell(6).font = { bold: true, size: 11 };
    }
    r.height = 22;
    row++;
  });

  row++;
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
