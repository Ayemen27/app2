import ExcelJS from 'exceljs';
import { DailyReportData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter,
} from './shared-styles';

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
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 20 }, { width: 12 }, { width: 10 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 22 },
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
  kpiRow.height = 24;
  kpiLabelRow.height = 18;
  row += 3;

  row = xlSectionHeader(ws, row, 'سجل الحضور والأجور', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم العامل', 'النوع', 'أيام العمل', 'الأجر اليومي', 'إجمالي الأجر', 'المدفوع', 'المتبقي', 'الوصف']);
  data.attendance.forEach((rec, idx) => {
    row = xlDataRow(ws, row, [idx + 1, rec.workerName, rec.workerType, rec.workDays, formatNum(rec.dailyWage), formatNum(rec.totalWage), formatNum(rec.paidAmount), formatNum(rec.remainingAmount), rec.workDescription], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', data.totals.totalWorkDays, '', formatNum(data.totals.totalWorkerWages), formatNum(data.totals.totalPaidWages), formatNum(data.totals.totalWorkerWages - data.totals.totalPaidWages), '']);
  row++;

  row = xlSectionHeader(ws, row, 'مشتريات المواد', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم المادة', 'الفئة', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'المدفوع', 'المتبقي', 'المورد']);
  data.materials.forEach((rec, idx) => {
    row = xlDataRow(ws, row, [idx + 1, rec.materialName, rec.category, rec.quantity, formatNum(rec.unitPrice), formatNum(rec.totalAmount), formatNum(rec.paidAmount), formatNum(rec.remainingAmount), rec.supplierName], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', '', '', formatNum(data.totals.totalMaterials), '', '', '']);
  row++;

  row = xlSectionHeader(ws, row, 'مصاريف النقل', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'المبلغ', 'الوصف', 'اسم العامل', '', '', '', '', '']);
  data.transport.forEach((rec, idx) => {
    row = xlDataRow(ws, row, [idx + 1, formatNum(rec.amount), rec.description, rec.workerName, '', '', '', '', ''], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', formatNum(data.totals.totalTransport), 'الإجمالي', '', '', '', '', '', '']);
  row++;

  row = xlSectionHeader(ws, row, 'مصاريف متنوعة', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'المبلغ', 'الوصف', 'ملاحظات', '', '', '', '', '']);
  data.miscExpenses.forEach((rec, idx) => {
    row = xlDataRow(ws, row, [idx + 1, formatNum(rec.amount), rec.description, rec.notes, '', '', '', '', ''], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', formatNum(data.totals.totalMiscExpenses), 'الإجمالي', '', '', '', '', '', '']);
  row++;

  row = xlSectionHeader(ws, row, 'حوالات العمال', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم العامل', 'المبلغ', 'المستلم', 'طريقة التحويل', '', '', '', '']);
  data.workerTransfers.forEach((rec, idx) => {
    row = xlDataRow(ws, row, [idx + 1, rec.workerName, formatNum(rec.amount), rec.recipientName, rec.transferMethod, '', '', '', ''], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', 'الإجمالي', formatNum(data.totals.totalWorkerTransfers), '', '', '', '', '', '']);
  row++;

  row = xlSectionHeader(ws, row, 'تحويلات العهدة', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'المبلغ', 'المرسل', 'نوع التحويل', 'رقم التحويل', '', '', '', '']);
  data.fundTransfers.forEach((rec, idx) => {
    row = xlDataRow(ws, row, [idx + 1, formatNum(rec.amount), rec.senderName, rec.transferType, rec.transferNumber, '', '', '', ''], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', formatNum(data.totals.totalFundTransfers), 'الإجمالي', '', '', '', '', '', '']);
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
    r.height = 22;
    row++;
  });

  row += 2;
  row = xlFooter(ws, row, COL_COUNT);

  ws.headerFooter = { oddFooter: '&C Page &P of &N' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
