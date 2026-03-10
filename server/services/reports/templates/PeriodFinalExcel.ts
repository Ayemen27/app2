import ExcelJS from 'exceljs';
import { PeriodFinalReportData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter, xlSignatures,
} from './shared-styles';

export async function generatePeriodFinalExcel(data: PeriodFinalReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction System';
  workbook.created = new Date();

  const COL_COUNT = 10;
  const ws = workbook.addWorksheet('التقرير الختامي', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 18 }, { width: 10 }, { width: 10 },
    { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 },
    { width: 12 }, { width: 14 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'التقرير الختامي للفترة', COL_COUNT);
  row = xlInfoRow(ws, row, `المشروع: ${data.project.name}  |  الفترة: ${formatDateBR(data.period.from)} - ${formatDateBR(data.period.to)}  |  المهندس: ${data.project.engineerName || '-'}`, COL_COUNT);

  row++;
  const kpiLabels = ['الإيرادات', 'المصروفات', 'الرصيد', 'حوالات العمال', 'نسبة الاستخدام'];
  const kpiValues = [
    formatNum(data.totals.totalIncome),
    formatNum(data.totals.totalExpenses),
    formatNum(data.totals.balance),
    formatNum(data.totals.totalWorkerTransfers),
    data.totals.budgetUtilization != null ? `${data.totals.budgetUtilization.toFixed(1)}%` : '-',
  ];
  const kpiPairs: [number, number][] = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];
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
  kpiRow.height = 24;
  kpiLabelRow.height = 18;
  row += 3;

  row = xlSectionHeader(ws, row, 'ملخص الحضور حسب العامل', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم العامل', 'النوع', 'الأيام', 'المستحق', 'المدفوع', 'الحوالات', 'إجمالي المدفوع', 'المرحل', 'الرصيد الختامي']);
  let totalAttDays = 0, totalAttEarned = 0, totalAttDirectPaid = 0, totalAttTransfers = 0, totalAttPaid = 0, totalAttCarried = 0, totalAttClosing = 0;
  data.sections.attendance.byWorker.forEach((w, idx) => {
    row = xlDataRow(ws, row, [idx + 1, w.workerName, w.workerType, w.totalDays, formatNum(w.totalEarned), formatNum(w.totalDirectPaid), formatNum(w.totalTransfers), formatNum(w.totalPaid), formatNum(w.carriedForwardBalance), formatNum(w.closingBalance)], idx % 2 === 1);
    totalAttDays += w.totalDays;
    totalAttEarned += w.totalEarned;
    totalAttDirectPaid += w.totalDirectPaid;
    totalAttTransfers += w.totalTransfers;
    totalAttPaid += w.totalPaid;
    totalAttCarried += w.carriedForwardBalance;
    totalAttClosing += w.closingBalance;
  });
  row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', totalAttDays, formatNum(totalAttEarned), formatNum(totalAttDirectPaid), formatNum(totalAttTransfers), formatNum(totalAttPaid), formatNum(totalAttCarried), formatNum(totalAttClosing)]);
  row++;

  row = xlSectionHeader(ws, row, 'ملخص المواد', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم المادة', 'الكمية', 'الإجمالي', 'المورد', '', '', '', '', '']);
  data.sections.materials.items.forEach((m, idx) => {
    row = xlDataRow(ws, row, [idx + 1, m.materialName, m.totalQuantity, formatNum(m.totalAmount), m.supplierName, '', '', '', '', ''], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', formatNum(data.sections.materials.total), '', '', '', '', '', '']);
  row++;

  row = xlSectionHeader(ws, row, 'تحويلات العهدة', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'التاريخ', 'المبلغ', 'المرسل', 'نوع التحويل', '', '', '', '', '']);
  data.sections.fundTransfers.items.forEach((ft, idx) => {
    row = xlDataRow(ws, row, [idx + 1, formatDateBR(ft.date), formatNum(ft.amount), ft.senderName, ft.transferType, '', '', '', '', ''], idx % 2 === 1);
  });
  row = xlTotalsRow(ws, row, ['', 'الإجمالي', formatNum(data.sections.fundTransfers.total), '', '', '', '', '', '', '']);
  row++;

  row = xlSectionHeader(ws, row, 'الملخص الشامل', COL_COUNT);
  const summaryItems = [
    ['إجمالي الإيرادات', formatNum(data.totals.totalIncome)],
    ['إجمالي الأجور', formatNum(data.totals.totalWages)],
    ['إجمالي المواد', formatNum(data.totals.totalMaterials)],
    ['إجمالي النقل', formatNum(data.totals.totalTransport)],
    ['إجمالي النثريات', formatNum(data.totals.totalMisc)],
    ['إجمالي حوالات العمال', formatNum(data.totals.totalWorkerTransfers)],
    ['إجمالي المصروفات', formatNum(data.totals.totalExpenses)],
    ['الرصيد النهائي', formatNum(data.totals.balance)],
  ];
  summaryItems.forEach(([label, value], idx) => {
    ws.mergeCells(row, 1, row, 4);
    ws.mergeCells(row, 5, row, COL_COUNT);
    const r = ws.getRow(row);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = BORDER;
    r.getCell(5).value = value;
    r.getCell(5).font = { bold: idx >= 6, size: 10, name: 'Calibri' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).border = BORDER;
    if (idx % 2 === 1) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    }
    if (idx === summaryItems.length - 1) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      r.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
      r.getCell(5).font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
    }
    r.height = 22;
    row++;
  });

  if (data.totals.budgetUtilization != null) {
    ws.mergeCells(row, 1, row, 4);
    ws.mergeCells(row, 5, row, COL_COUNT);
    const r = ws.getRow(row);
    r.getCell(1).value = 'نسبة استخدام الميزانية';
    r.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = BORDER;
    r.getCell(5).value = `${data.totals.budgetUtilization.toFixed(1)}%`;
    r.getCell(5).font = { bold: true, size: 11, color: { argb: COLORS.amber }, name: 'Calibri' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).border = BORDER;
    r.height = 22;
    row++;
  }

  row += 2;
  row = xlSignatures(ws, row, ['المهندس', 'المدير', 'المدير المالي'], [[1, 3], [4, 7], [8, 10]]);

  row += 2;
  row = xlFooter(ws, row, COL_COUNT);

  ws.headerFooter = { oddFooter: '&C Page &P of &N' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
