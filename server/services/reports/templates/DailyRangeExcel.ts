import ExcelJS from 'exceljs';
import { DailyReportData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter, xlApplyBorders,
} from './shared-styles';

interface UnifiedExpense {
  category: string;
  description: string;
  amount: number;
  workDays: string;
  paidAmount: string;
  notes: string;
}

function flattenExpenses(report: DailyReportData): UnifiedExpense[] {
  const expenses: UnifiedExpense[] = [];
  (report.attendance || []).forEach((r: any) => {
    const days = parseFloat(r.workDays || '0');
    const paid = parseFloat(r.paidAmount || '0');
    expenses.push({
      category: 'أجور عمال',
      description: r.workerName + (r.workerType ? ` (${r.workerType})` : ''),
      amount: paid,
      workDays: days > 0 ? days.toFixed(1) : '0',
      paidAmount: paid > 0 ? formatNum(paid) : '-',
      notes: r.workDescription || (days === 0 && paid > 0 ? 'مبلغ بدون عمل' : days > 0 && paid === 0 ? 'عمل بدون صرف' : days === 0 ? 'بدون عمل' : '-'),
    });
  });
  (report.materials || []).forEach((r: any) => {
    expenses.push({
      category: 'مواد',
      description: r.materialName + (r.quantity ? ` × ${r.quantity}` : ''),
      amount: r.totalAmount || 0,
      workDays: '-',
      paidAmount: '-',
      notes: r.supplierName || '-',
    });
  });
  (report.transport || []).forEach((r: any) => {
    expenses.push({
      category: 'نقل',
      description: r.description || 'نقل',
      amount: r.amount || 0,
      workDays: '-',
      paidAmount: '-',
      notes: r.workerName || '-',
    });
  });
  (report.miscExpenses || []).forEach((r: any) => {
    expenses.push({
      category: 'مصاريف متنوعة',
      description: r.description || '-',
      amount: r.amount || 0,
      workDays: '-',
      paidAmount: '-',
      notes: r.notes || '-',
    });
  });
  return expenses;
}

function xlKpiBar(ws: ExcelJS.Worksheet, rowNum: number, items: { label: string; value: string; color?: string }[], colCount: number): number {
  const valR = ws.getRow(rowNum);
  const lblR = ws.getRow(rowNum + 1);
  const perItem = Math.floor(colCount / items.length);
  items.forEach((item, i) => {
    const startCol = i * perItem + 1;
    const endCol = i === items.length - 1 ? colCount : (i + 1) * perItem;
    if (startCol !== endCol) {
      ws.mergeCells(rowNum, startCol, rowNum, endCol);
      ws.mergeCells(rowNum + 1, startCol, rowNum + 1, endCol);
    }
    const vc = valR.getCell(startCol);
    vc.value = item.value;
    vc.font = { bold: true, size: 11, color: { argb: item.color || COLORS.navy }, name: 'Calibri' };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
    vc.border = BORDER;
    const lc = lblR.getCell(startCol);
    lc.value = item.label;
    lc.font = { size: 9, color: { argb: COLORS.gray500 }, name: 'Calibri' };
    lc.alignment = { horizontal: 'center', vertical: 'middle' };
    lc.border = BORDER;
  });
  valR.height = 26;
  lblR.height = 20;
  return rowNum + 2;
}

function xlCarryForwardRow(ws: ExcelJS.Worksheet, rowNum: number, amount: number, colCount: number): number {
  const r = ws.getRow(rowNum);
  ws.mergeCells(rowNum, 1, rowNum, Math.floor(colCount / 2));
  ws.mergeCells(rowNum, Math.floor(colCount / 2) + 1, rowNum, colCount);
  r.getCell(1).value = 'ترحيل من اليوم السابق';
  r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  r.getCell(Math.floor(colCount / 2) + 1).value = `${formatNum(amount)} YER`;
  r.getCell(Math.floor(colCount / 2) + 1).alignment = { horizontal: 'center', vertical: 'middle' };
  const isPositive = amount >= 0;
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).font = { bold: true, size: 11, color: { argb: isPositive ? COLORS.green : COLORS.red }, name: 'Calibri' };
    r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isPositive ? COLORS.greenLight : COLORS.redLight } };
    r.getCell(c).border = BORDER;
  }
  r.height = 28;
  return rowNum + 1;
}

function xlSummarySection(ws: ExcelJS.Worksheet, rowNum: number, items: { label: string; value: string; bold?: boolean; bgColor?: string; fontColor?: string }[], colCount: number): number {
  let row = rowNum;
  items.forEach((item, idx) => {
    ws.mergeCells(row, 1, row, Math.floor(colCount * 0.6));
    ws.mergeCells(row, Math.floor(colCount * 0.6) + 1, row, colCount);
    const r = ws.getRow(row);
    r.getCell(1).value = item.label;
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(Math.floor(colCount * 0.6) + 1).value = item.value;
    r.getCell(Math.floor(colCount * 0.6) + 1).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= colCount; c++) {
      r.getCell(c).font = {
        bold: !!item.bold,
        size: item.bold ? 11 : 10,
        name: 'Calibri',
        color: { argb: item.fontColor || COLORS.navy },
      };
      r.getCell(c).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: item.bgColor || (idx % 2 === 0 ? COLORS.gray100 : COLORS.white) },
      };
      r.getCell(c).border = BORDER;
    }
    r.height = item.bold ? 28 : 24;
    row++;
  });
  return row;
}

export async function generateDailyRangeExcel(reports: DailyReportData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction Management System';
  workbook.created = new Date();
  workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  const COL_COUNT = 6;
  let carryForward = 0;

  for (const report of reports) {
    const expenses = flattenExpenses(report);
    const fundTransfers = report.fundTransfers || [];
    const workerTransfers = report.workerTransfers || [];
    const hasData = expenses.length > 0 || fundTransfers.length > 0 || workerTransfers.length > 0;
    if (!hasData) continue;

    const dateLabel = formatDateBR(report.date);
    const sheetName = (report.date || '-').replace(/[\\/*?:\[\]]/g, '').slice(0, 31);
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true }],
      pageSetup: {
        paperSize: 9, orientation: 'landscape', fitToPage: true,
        fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
    });

    ws.columns = [
      { width: 5 },
      { width: 14 },
      { width: 34 },
      { width: 10 },
      { width: 16 },
      { width: 28 },
    ];

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalFund = fundTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const totalIncome = carryForward + totalFund;
    const dayBalance = totalIncome - totalExpenses;

    let row = 1;

    row = xlCompanyHeader(ws, row, COL_COUNT);
    row = xlTitleRow(ws, row, 'التقرير اليومي المختصر', COL_COUNT);
    row = xlInfoRow(ws, row,
      `المشروع: ${report.project?.name || '-'}  |  التاريخ: ${dateLabel}  |  المهندس: ${(report.project as any)?.engineerName || '-'}`,
      COL_COUNT
    );

    row++;
    const kpis = [
      { label: 'ترحيل سابق', value: `${formatNum(carryForward)} YER`, color: carryForward >= 0 ? COLORS.green : COLORS.red },
      { label: 'العهدة الواردة', value: `${formatNum(totalFund)} YER`, color: COLORS.green },
      { label: 'إجمالي المتاح', value: `${formatNum(totalIncome)} YER`, color: COLORS.blue },
      { label: 'المصروفات', value: `${formatNum(totalExpenses)} YER`, color: COLORS.red },
      { label: 'المتبقي', value: `${formatNum(dayBalance)} YER`, color: dayBalance >= 0 ? COLORS.green : COLORS.red },
      { label: 'عدد العمال', value: `${report.totals?.workerCount || 0}` },
    ];
    row = xlKpiBar(ws, row, kpis, COL_COUNT);

    row++;
    if (expenses.length > 0) {
      row = xlSectionHeader(ws, row, 'جدول المصروفات', COL_COUNT);
      row = xlTableHeader(ws, row, ['م', 'القسم', 'البيان', 'أيام العمل', 'المبلغ (YER)', 'ملاحظات']);
      expenses.forEach((e, idx) => {
        row = xlDataRow(ws, row, [idx + 1, e.category, e.description, e.workDays, formatNum(e.amount), e.notes], idx % 2 === 1);
      });

      const totR = ws.getRow(row);
      ws.mergeCells(row, 1, row, 3);
      totR.getCell(1).value = 'إجمالي المصروفات';
      totR.getCell(4).value = '';
      totR.getCell(5).value = formatNum(totalExpenses);
      totR.getCell(6).value = `${expenses.length} عملية`;
      for (let c = 1; c <= COL_COUNT; c++) {
        totR.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
        totR.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
        totR.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        totR.getCell(c).border = BORDER;
      }
      totR.height = 28;
      row++;
    }

    if (fundTransfers.length > 0) {
      row++;
      const secR = ws.getRow(row);
      ws.mergeCells(row, 1, row, COL_COUNT);
      secR.getCell(1).value = 'العهدة (الوارد للصندوق)';
      secR.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
      secR.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green } };
      secR.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      secR.height = 26;
      xlApplyBorders(secR, COL_COUNT);
      row++;

      const fHeaders = ['م', 'المبلغ (YER)', 'المرسل', 'نوع التحويل', 'رقم التحويل', 'ملاحظات'];
      row = xlTableHeader(ws, row, fHeaders);
      fundTransfers.forEach((r: any, idx: number) => {
        row = xlDataRow(ws, row, [
          idx + 1,
          formatNum(r.amount),
          r.senderName || '-',
          r.transferType || '-',
          r.transferNumber || '-',
          r.status || 'مؤكد',
        ], idx % 2 === 1);
      });
      const ftR = ws.getRow(row);
      ws.mergeCells(row, 1, row, 1);
      ftR.getCell(1).value = 'الإجمالي';
      ftR.getCell(2).value = formatNum(totalFund);
      for (let c = 1; c <= COL_COUNT; c++) {
        ftR.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.green }, name: 'Calibri' };
        ftR.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenLight } };
        ftR.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        ftR.getCell(c).border = BORDER;
      }
      ftR.height = 26;
      row++;
    }

    if (workerTransfers.length > 0) {
      row++;
      row = xlSectionHeader(ws, row, 'حوالات العمال', COL_COUNT);
      const wtHeaders = ['م', 'المبلغ (YER)', 'اسم العامل', 'المستلم', 'الطريقة', 'ملاحظات'];
      row = xlTableHeader(ws, row, wtHeaders);
      const totalWT = workerTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      workerTransfers.forEach((r: any, idx: number) => {
        row = xlDataRow(ws, row, [
          idx + 1,
          formatNum(r.amount),
          r.workerName || '-',
          r.recipientName || '-',
          r.transferMethod || '-',
          r.status || 'مكتمل',
        ], idx % 2 === 1);
      });
      row = xlTotalsRow(ws, row, ['الإجمالي', formatNum(totalWT), '', '', '', '']);
    }

    row += 2;
    row = xlSectionHeader(ws, row, 'ملخص اليوم المالي', COL_COUNT);
    row = xlSummarySection(ws, row, [
      { label: 'ترحيل من اليوم السابق', value: `${formatNum(carryForward)} YER` },
      { label: 'العهدة الواردة (الدخل)', value: `${formatNum(totalFund)} YER` },
      { label: 'إجمالي المتاح (ترحيل + دخل)', value: `${formatNum(totalIncome)} YER`, bold: true, bgColor: COLORS.totalBg },
      { label: 'إجمالي المصروفات', value: `${formatNum(totalExpenses)} YER`, fontColor: COLORS.red },
      { label: 'المتبقي (يُرحّل لليوم التالي)', value: `${formatNum(dayBalance)} YER`, bold: true, bgColor: dayBalance >= 0 ? COLORS.green : COLORS.red, fontColor: COLORS.white },
    ], COL_COUNT);

    row += 2;
    row = xlFooter(ws, row, COL_COUNT);

    ws.headerFooter = { oddFooter: '&C Page &P of &N' };

    carryForward = dayBalance;
  }

  if (workbook.worksheets.length === 0) {
    const ws = workbook.addWorksheet('لا توجد بيانات', { views: [{ rightToLeft: true }] });
    ws.mergeCells(1, 1, 1, COL_COUNT);
    const r = ws.getRow(1);
    r.getCell(1).value = 'لا توجد بيانات في هذه الفترة';
    r.getCell(1).font = { bold: true, size: 14, name: 'Calibri', color: { argb: COLORS.navy } };
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.height = 40;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
