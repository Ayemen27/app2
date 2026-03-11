import ExcelJS from 'exceljs';
import { DailyReportData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter,
} from './shared-styles';

interface UnifiedExpense {
  category: string;
  description: string;
  amount: number;
  notes: string;
}

function flattenExpenses(report: DailyReportData): UnifiedExpense[] {
  const expenses: UnifiedExpense[] = [];
  (report.attendance || []).forEach((r: any) => {
    expenses.push({
      category: 'أجور عمال',
      description: r.workerName + (r.workerType ? ` (${r.workerType})` : ''),
      amount: r.totalWage || 0,
      notes: r.workDescription || '-',
    });
  });
  (report.materials || []).forEach((r: any) => {
    expenses.push({
      category: 'مواد',
      description: r.materialName + (r.quantity ? ` × ${r.quantity}` : ''),
      amount: r.totalAmount || 0,
      notes: r.supplierName || '-',
    });
  });
  (report.transport || []).forEach((r: any) => {
    expenses.push({
      category: 'نقل',
      description: r.description || 'نقل',
      amount: r.amount || 0,
      notes: r.workerName || '-',
    });
  });
  (report.miscExpenses || []).forEach((r: any) => {
    expenses.push({
      category: 'مصاريف متنوعة',
      description: r.description || '-',
      amount: r.amount || 0,
      notes: r.notes || '-',
    });
  });
  return expenses;
}

export async function generateDailyRangeExcel(reports: DailyReportData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction Management System';
  workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  const COL_COUNT = 5;

  for (const report of reports) {
    const expenses = flattenExpenses(report);
    const fundTransfers = report.fundTransfers || [];
    const workerTransfers = report.workerTransfers || [];
    const hasData = expenses.length > 0 || fundTransfers.length > 0;
    if (!hasData) continue;

    const dateLabel = formatDateBR(report.date);
    const sheetName = (report.date || '-').replace(/[\\/*?:\[\]]/g, '').slice(0, 31);
    const ws = workbook.addWorksheet(sheetName);
    ws.views = [{ rightToLeft: true }];
    ws.columns = [
      { width: 6 },
      { width: 18 },
      { width: 30 },
      { width: 16 },
      { width: 24 },
    ];

    let row = 1;
    row = xlCompanyHeader(ws, row, COL_COUNT);
    row = xlTitleRow(ws, row, `تقرير يوم ${dateLabel} - ${report.project?.name || ''}`, COL_COUNT);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalFund = fundTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);

    const infoR = ws.getRow(row);
    ws.mergeCells(row, 1, row, 3);
    infoR.getCell(1).value = `المشروع: ${report.project?.name || '-'}`;
    infoR.getCell(1).font = { bold: true, size: 10, name: 'Calibri', color: { argb: COLORS.navy } };
    infoR.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    infoR.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
    ws.mergeCells(row, 4, row, 5);
    infoR.getCell(4).value = `التاريخ: ${dateLabel}`;
    infoR.getCell(4).font = { bold: true, size: 10, name: 'Calibri', color: { argb: COLORS.navy } };
    infoR.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    infoR.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
    for (let c = 1; c <= COL_COUNT; c++) infoR.getCell(c).border = BORDER;
    infoR.height = 24;
    row++;

    row++;
    if (expenses.length > 0) {
      row = xlSectionHeader(ws, row, 'جدول المصروفات', COL_COUNT);
      row = xlTableHeader(ws, row, ['#', 'القسم', 'البيان', 'المبلغ', 'ملاحظات']);
      expenses.forEach((e, idx) => {
        row = xlDataRow(ws, row, [idx + 1, e.category, e.description, formatNum(e.amount), e.notes], idx % 2 === 1);
      });
      const totR = ws.getRow(row);
      ws.mergeCells(row, 1, row, 3);
      totR.getCell(1).value = 'إجمالي المصروفات';
      totR.getCell(4).value = formatNum(totalExpenses);
      totR.getCell(5).value = '';
      for (let c = 1; c <= COL_COUNT; c++) {
        totR.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
        totR.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
        totR.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        totR.getCell(c).border = BORDER;
      }
      totR.height = 26;
      row++;
    }

    row++;
    if (fundTransfers.length > 0) {
      const greenFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green } };
      const greenLightFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenLight } };

      const secR = ws.getRow(row);
      ws.mergeCells(row, 1, row, COL_COUNT);
      secR.getCell(1).value = 'العهدة (الوارد للصندوق)';
      secR.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
      secR.getCell(1).fill = greenFill;
      secR.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      secR.height = 26;
      for (let c = 1; c <= COL_COUNT; c++) secR.getCell(c).border = BORDER;
      row++;

      row = xlTableHeader(ws, row, ['#', 'المبلغ', 'المرسل', 'نوع التحويل', 'رقم التحويل']);
      fundTransfers.forEach((r: any, idx: number) => {
        row = xlDataRow(ws, row, [idx + 1, formatNum(r.amount), r.senderName || '-', r.transferType || '-', r.transferNumber || '-'], idx % 2 === 1);
      });
      const ftTotR = ws.getRow(row);
      ws.mergeCells(row, 1, row, 1);
      ftTotR.getCell(1).value = 'الإجمالي';
      ftTotR.getCell(2).value = formatNum(totalFund);
      ftTotR.getCell(3).value = '';
      ftTotR.getCell(4).value = '';
      ftTotR.getCell(5).value = '';
      for (let c = 1; c <= COL_COUNT; c++) {
        ftTotR.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.green }, name: 'Calibri' };
        ftTotR.getCell(c).fill = greenLightFill;
        ftTotR.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        ftTotR.getCell(c).border = BORDER;
      }
      ftTotR.height = 26;
      row++;
    }

    if (workerTransfers.length > 0) {
      row++;
      row = xlSectionHeader(ws, row, 'حوالات العمال', COL_COUNT);
      row = xlTableHeader(ws, row, ['#', 'المبلغ', 'اسم العامل', 'نوع التحويل', 'ملاحظات']);
      const totalWT = workerTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      workerTransfers.forEach((r: any, idx: number) => {
        row = xlDataRow(ws, row, [idx + 1, formatNum(r.amount), r.workerName || '-', r.transferType || '-', r.recipientName || '-'], idx % 2 === 1);
      });
      row = xlTotalsRow(ws, row, ['الإجمالي', formatNum(totalWT), '', '', '']);
      row++;
    }

    row++;
    row = xlSectionHeader(ws, row, 'ملخص اليوم', COL_COUNT);
    const summaryItems: [string, string][] = [
      ['عدد العمال', `${report.totals?.workerCount || 0}`],
      ['إجمالي أجور العمال', `${formatNum(report.totals?.totalWorkerWages || 0)} YER`],
      ['إجمالي المواد', `${formatNum(report.totals?.totalMaterials || 0)} YER`],
      ['إجمالي النقل', `${formatNum(report.totals?.totalTransport || 0)} YER`],
      ['المصاريف المتنوعة', `${formatNum(report.totals?.totalMiscExpenses || 0)} YER`],
      ['إجمالي المصروفات', `${formatNum(report.totals?.totalExpenses || 0)} YER`],
    ];
    summaryItems.forEach(([label, val], idx) => {
      const sr = ws.getRow(row);
      ws.mergeCells(row, 1, row, 3);
      sr.getCell(1).value = label;
      sr.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.mergeCells(row, 4, row, 5);
      sr.getCell(4).value = val;
      sr.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      const isLast = idx === summaryItems.length - 1;
      for (let c = 1; c <= COL_COUNT; c++) {
        sr.getCell(c).font = { bold: isLast, size: isLast ? 11 : 10, name: 'Calibri', color: { argb: isLast ? COLORS.white : COLORS.navy } };
        sr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLast ? COLORS.navy : (idx % 2 === 0 ? COLORS.gray100 : COLORS.white) } };
        sr.getCell(c).border = BORDER;
      }
      sr.height = 24;
      row++;
    });

    row += 2;
    row = xlFooter(ws, row, COL_COUNT);
  }

  if (workbook.worksheets.length === 0) {
    const ws = workbook.addWorksheet('لا توجد بيانات');
    ws.views = [{ rightToLeft: true }];
    ws.mergeCells(1, 1, 1, 5);
    ws.getRow(1).getCell(1).value = 'لا توجد بيانات في هذه الفترة';
    ws.getRow(1).getCell(1).font = { bold: true, size: 14, name: 'Calibri' };
    ws.getRow(1).getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
