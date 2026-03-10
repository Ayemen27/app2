import ExcelJS from 'exceljs';
import { DailyReportData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter,
} from './shared-styles';

function xlMergedHeader(ws: ExcelJS.Worksheet, rowNum: number, cols: { col: number; text: string }[], merges: [number, number][], colCount: number): number {
  const r = ws.getRow(rowNum);
  merges.forEach(([s, e]) => ws.mergeCells(rowNum, s, rowNum, e));
  cols.forEach(({ col, text }) => {
    r.getCell(col).value = text;
    r.getCell(col).font = { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' };
    r.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    r.getCell(col).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    r.getCell(col).border = BORDER;
  });
  for (let c = 1; c <= colCount; c++) {
    if (!r.getCell(c).border) r.getCell(c).border = BORDER;
    if (!r.getCell(c).font?.bold) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    }
  }
  r.height = 26;
  return rowNum + 1;
}

function xlMergedDataRow(ws: ExcelJS.Worksheet, rowNum: number, cells: { col: number; value: any; rightAlign?: boolean }[], merges: [number, number][], colCount: number, isAlt: boolean): number {
  const r = ws.getRow(rowNum);
  merges.forEach(([s, e]) => ws.mergeCells(rowNum, s, rowNum, e));
  cells.forEach(({ col, value, rightAlign }) => {
    r.getCell(col).value = value;
    r.getCell(col).alignment = { horizontal: rightAlign ? 'right' : 'center', vertical: 'middle', wrapText: true };
    r.getCell(col).font = { size: 10, name: 'Calibri' };
    r.getCell(col).border = BORDER;
  });
  for (let c = 1; c <= colCount; c++) {
    if (!r.getCell(c).border) r.getCell(c).border = BORDER;
    if (!r.getCell(c).font) r.getCell(c).font = { size: 10, name: 'Calibri' };
    if (isAlt) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    }
  }
  r.height = 24;
  return rowNum + 1;
}

function xlMergedTotalsRow(ws: ExcelJS.Worksheet, rowNum: number, cells: { col: number; value: any }[], merges: [number, number][], colCount: number): number {
  const r = ws.getRow(rowNum);
  merges.forEach(([s, e]) => ws.mergeCells(rowNum, s, rowNum, e));
  cells.forEach(({ col, value }) => {
    r.getCell(col).value = value;
  });
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
    r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
    r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(c).border = BORDER;
  }
  r.height = 28;
  return rowNum + 1;
}

export async function generateDailyReportExcel(data: DailyReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction System';
  workbook.created = new Date();

  const COL_COUNT = 9;
  const ws = workbook.addWorksheet('التقرير اليومي', {
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
    { width: 12 },
    { width: 10 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 26 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'التقرير اليومي الشامل', COL_COUNT);
  row = xlInfoRow(ws, row, `المشروع: ${data.project.name}  |  التاريخ: ${formatDateBR(data.date)}  |  المهندس: ${data.project.engineerName || '-'}`, COL_COUNT);

  row++;
  const kpiLabels = ['إجمالي الأجور', 'المواد', 'النقل', 'النثريات', 'تحويلات العهدة', 'الرصيد'];
  const kpiValues = [
    data.totals.totalWorkerWages, data.totals.totalMaterials, data.totals.totalTransport,
    data.totals.totalMiscExpenses, data.totals.totalFundTransfers, data.totals.balance,
  ];
  const kpiColPairs: [number, number][] = [[1, 1], [2, 3], [4, 4], [5, 5], [6, 7], [8, 9]];
  const kpiRow = ws.getRow(row);
  const kpiLabelRow = ws.getRow(row + 1);
  kpiColPairs.forEach(([s, e], i) => {
    if (s !== e) ws.mergeCells(row, s, row, e);
    if (s !== e) ws.mergeCells(row + 1, s, row + 1, e);
    const valCell = kpiRow.getCell(s);
    valCell.value = formatNum(kpiValues[i]);
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

  row = xlSectionHeader(ws, row, 'سجل الحضور والأجور', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم العامل', 'النوع', 'أيام العمل', 'الأجر اليومي', 'إجمالي الأجر', 'المدفوع', 'المتبقي', 'الوصف']);
  data.attendance.forEach((rec, idx) => {
    const r = ws.getRow(row);
    const vals = [idx + 1, rec.workerName, rec.workerType, rec.workDays, formatNum(rec.dailyWage), formatNum(rec.totalWage), formatNum(rec.paidAmount), formatNum(rec.remainingAmount), rec.workDescription];
    vals.forEach((v, i) => {
      r.getCell(i + 1).value = v;
      const isTextCol = i === 1 || i === 8;
      r.getCell(i + 1).alignment = { horizontal: isTextCol ? 'right' : 'center', vertical: 'middle', wrapText: true };
      r.getCell(i + 1).font = { size: 10, name: 'Calibri' };
      r.getCell(i + 1).border = BORDER;
      if (idx % 2 === 1) {
        r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      }
    });
    r.height = 24;
    row++;
  });
  {
    const r = ws.getRow(row);
    ws.mergeCells(row, 1, row, 3);
    r.getCell(1).value = 'الإجمالي';
    r.getCell(4).value = data.totals.totalWorkDays;
    r.getCell(6).value = formatNum(data.totals.totalWorkerWages);
    r.getCell(7).value = formatNum(data.totals.totalPaidWages);
    r.getCell(8).value = formatNum(data.totals.totalWorkerWages - data.totals.totalPaidWages);
    for (let c = 1; c <= COL_COUNT; c++) {
      r.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
      r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(c).border = BORDER;
    }
    r.height = 28;
    row++;
  }
  row++;

  row = xlSectionHeader(ws, row, 'مشتريات المواد', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم المادة', 'الفئة', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'المدفوع', 'المتبقي', 'المورد']);
  data.materials.forEach((rec, idx) => {
    const r = ws.getRow(row);
    const vals = [idx + 1, rec.materialName, rec.category, rec.quantity, formatNum(rec.unitPrice), formatNum(rec.totalAmount), formatNum(rec.paidAmount), formatNum(rec.remainingAmount), rec.supplierName];
    vals.forEach((v, i) => {
      r.getCell(i + 1).value = v;
      const isTextCol = i === 1 || i === 2 || i === 8;
      r.getCell(i + 1).alignment = { horizontal: isTextCol ? 'right' : 'center', vertical: 'middle', wrapText: true };
      r.getCell(i + 1).font = { size: 10, name: 'Calibri' };
      r.getCell(i + 1).border = BORDER;
      if (idx % 2 === 1) {
        r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      }
    });
    r.height = 24;
    row++;
  });
  row = xlMergedTotalsRow(ws, row,
    [{ col: 1, value: 'الإجمالي' }, { col: 6, value: formatNum(data.totals.totalMaterials) }],
    [[1, 5], [7, 9]], COL_COUNT);
  row++;

  row = xlSectionHeader(ws, row, 'مصاريف النقل', COL_COUNT);
  row = xlMergedHeader(ws, row,
    [{ col: 1, text: '#' }, { col: 2, text: 'المبلغ' }, { col: 3, text: 'الوصف' }, { col: 6, text: 'اسم العامل' }],
    [[3, 5], [6, 9]], COL_COUNT);
  data.transport.forEach((rec, idx) => {
    row = xlMergedDataRow(ws, row,
      [{ col: 1, value: idx + 1 }, { col: 2, value: formatNum(rec.amount) }, { col: 3, value: rec.description, rightAlign: true }, { col: 6, value: rec.workerName, rightAlign: true }],
      [[3, 5], [6, 9]], COL_COUNT, idx % 2 === 1);
  });
  row = xlMergedTotalsRow(ws, row,
    [{ col: 1, value: 'الإجمالي' }, { col: 2, value: formatNum(data.totals.totalTransport) }],
    [[1, 1], [3, 9]], COL_COUNT);
  row++;

  row = xlSectionHeader(ws, row, 'مصاريف متنوعة', COL_COUNT);
  row = xlMergedHeader(ws, row,
    [{ col: 1, text: '#' }, { col: 2, text: 'المبلغ' }, { col: 3, text: 'الوصف' }, { col: 6, text: 'ملاحظات' }],
    [[3, 5], [6, 9]], COL_COUNT);
  data.miscExpenses.forEach((rec, idx) => {
    row = xlMergedDataRow(ws, row,
      [{ col: 1, value: idx + 1 }, { col: 2, value: formatNum(rec.amount) }, { col: 3, value: rec.description, rightAlign: true }, { col: 6, value: rec.notes, rightAlign: true }],
      [[3, 5], [6, 9]], COL_COUNT, idx % 2 === 1);
  });
  row = xlMergedTotalsRow(ws, row,
    [{ col: 1, value: 'الإجمالي' }, { col: 2, value: formatNum(data.totals.totalMiscExpenses) }],
    [[1, 1], [3, 9]], COL_COUNT);
  row++;

  row = xlSectionHeader(ws, row, 'حوالات العمال', COL_COUNT);
  row = xlMergedHeader(ws, row,
    [{ col: 1, text: '#' }, { col: 2, text: 'اسم العامل' }, { col: 3, text: 'المبلغ' }, { col: 4, text: 'المستلم' }, { col: 6, text: 'طريقة التحويل' }],
    [[4, 5], [6, 9]], COL_COUNT);
  data.workerTransfers.forEach((rec, idx) => {
    row = xlMergedDataRow(ws, row,
      [{ col: 1, value: idx + 1 }, { col: 2, value: rec.workerName, rightAlign: true }, { col: 3, value: formatNum(rec.amount) }, { col: 4, value: rec.recipientName, rightAlign: true }, { col: 6, value: rec.transferMethod }],
      [[4, 5], [6, 9]], COL_COUNT, idx % 2 === 1);
  });
  row = xlMergedTotalsRow(ws, row,
    [{ col: 1, value: 'الإجمالي' }, { col: 3, value: formatNum(data.totals.totalWorkerTransfers) }],
    [[1, 2], [4, 9]], COL_COUNT);
  row++;

  row = xlSectionHeader(ws, row, 'تحويلات العهدة', COL_COUNT);
  row = xlMergedHeader(ws, row,
    [{ col: 1, text: '#' }, { col: 2, text: 'المبلغ' }, { col: 3, text: 'المرسل' }, { col: 5, text: 'نوع التحويل' }, { col: 7, text: 'رقم التحويل' }],
    [[3, 4], [5, 6], [7, 9]], COL_COUNT);
  data.fundTransfers.forEach((rec, idx) => {
    row = xlMergedDataRow(ws, row,
      [{ col: 1, value: idx + 1 }, { col: 2, value: formatNum(rec.amount) }, { col: 3, value: rec.senderName, rightAlign: true }, { col: 5, value: rec.transferType }, { col: 7, value: rec.transferNumber }],
      [[3, 4], [5, 6], [7, 9]], COL_COUNT, idx % 2 === 1);
  });
  row = xlMergedTotalsRow(ws, row,
    [{ col: 1, value: 'الإجمالي' }, { col: 2, value: formatNum(data.totals.totalFundTransfers) }],
    [[1, 1], [3, 9]], COL_COUNT);
  row++;

  row = xlSectionHeader(ws, row, 'ملخص اليوم', COL_COUNT);
  const summaryItems = [
    ['إجمالي أجور العمال', formatNum(data.totals.totalWorkerWages)],
    ['إجمالي المدفوعات', formatNum(data.totals.totalPaidWages)],
    ['إجمالي المواد', formatNum(data.totals.totalMaterials)],
    ['إجمالي النقل', formatNum(data.totals.totalTransport)],
    ['إجمالي النثريات', formatNum(data.totals.totalMiscExpenses)],
    ['إجمالي حوالات العمال', formatNum(data.totals.totalWorkerTransfers)],
    ['إجمالي تحويلات العهدة', formatNum(data.totals.totalFundTransfers)],
    ['إجمالي المصروفات', formatNum(data.totals.totalExpenses)],
    ['الرصيد', formatNum(data.totals.balance)],
  ];
  summaryItems.forEach(([label, value], idx) => {
    ws.mergeCells(row, 1, row, 5);
    ws.mergeCells(row, 6, row, COL_COUNT);
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = BORDER;
    r.getCell(6).value = value;
    r.getCell(6).font = { bold: idx >= 7, size: 10, name: 'Calibri' };
    r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(6).border = BORDER;
    if (idx % 2 === 1) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    }
    if (idx === summaryItems.length - 1) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      r.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
      r.getCell(6).font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
    }
    r.height = 24;
    row++;
  });

  row += 2;
  row = xlFooter(ws, row, COL_COUNT);

  ws.headerFooter = { oddFooter: '&C Page &P of &N' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
