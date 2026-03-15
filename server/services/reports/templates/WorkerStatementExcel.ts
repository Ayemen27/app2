import ExcelJS from 'exceljs';
import { WorkerStatementData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlSectionHeader,
  xlTableHeader, xlTotalsRow,
  xlFooter, xlSignatures,
} from './shared-styles';

export async function generateWorkerStatementExcel(data: WorkerStatementData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction System';
  workbook.created = new Date();

  const COL_COUNT = 10;
  const ws = workbook.addWorksheet('كشف حساب العامل', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 },
    { width: 12 },
    { width: 10 },
    { width: 20 },
    { width: 20 },
    { width: 22 },
    { width: 8 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'كشف حساب العامل التفصيلي', COL_COUNT);

  row++;
  row = xlSectionHeader(ws, row, 'بيانات العامل', COL_COUNT);

  const infoData: [string, string, string, string][] = [
    ['الاسم', data.worker.name, 'النوع', data.worker.type],
    ['الأجر اليومي', formatNum(data.worker.dailyWage), 'الهاتف', data.worker.phone || '-'],
    ['الفترة من', formatDateBR(data.period.from), 'الفترة إلى', formatDateBR(data.period.to)],
  ];
  infoData.forEach((info) => {
    const r = ws.getRow(row);
    ws.mergeCells(row, 1, row, 2);
    ws.mergeCells(row, 3, row, 5);
    ws.mergeCells(row, 6, row, 7);
    ws.mergeCells(row, 8, row, 10);

    r.getCell(1).value = info[0];
    r.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(1).border = BORDER;

    r.getCell(3).value = info[1];
    r.getCell(3).font = { size: 10, name: 'Calibri' };
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(3).border = BORDER;

    r.getCell(6).value = info[2];
    r.getCell(6).font = { bold: true, size: 10, name: 'Calibri' };
    r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(6).border = BORDER;

    r.getCell(8).value = info[3];
    r.getCell(8).font = { size: 10, name: 'Calibri' };
    r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(8).border = BORDER;

    for (let c = 1; c <= COL_COUNT; c++) {
      if (!r.getCell(c).border) r.getCell(c).border = BORDER;
    }
    r.height = 24;
    row++;
  });

  if (data.projectWages && data.projectWages.length > 0) {
    row++;
    row = xlSectionHeader(ws, row, 'أجور المشاريع', COL_COUNT);

    {
      const hdr = ws.getRow(row);
      ws.mergeCells(row, 1, row, 3);
      ws.mergeCells(row, 4, row, 5);
      ws.mergeCells(row, 6, row, 7);
      ws.mergeCells(row, 8, row, 10);
      const pwHeaders = [
        { col: 1, text: 'اسم المشروع' },
        { col: 4, text: 'الأجر اليومي' },
        { col: 6, text: 'من تاريخ' },
        { col: 8, text: 'إلى تاريخ' },
      ];
      pwHeaders.forEach(({ col, text }) => {
        hdr.getCell(col).value = text;
        hdr.getCell(col).font = { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' };
        hdr.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
        hdr.getCell(col).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        hdr.getCell(col).border = BORDER;
      });
      for (let c = 1; c <= COL_COUNT; c++) {
        if (!hdr.getCell(c).border) hdr.getCell(c).border = BORDER;
        if (!hdr.getCell(c).font?.bold) {
          hdr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
        }
      }
      hdr.height = 28;
      row++;
    }

    data.projectWages.forEach((pw, idx) => {
      const r = ws.getRow(row);
      ws.mergeCells(row, 1, row, 3);
      ws.mergeCells(row, 4, row, 5);
      ws.mergeCells(row, 6, row, 7);
      ws.mergeCells(row, 8, row, 10);
      r.getCell(1).value = pw.projectName;
      r.getCell(4).value = formatNum(pw.dailyWage);
      r.getCell(6).value = formatDateBR(pw.effectiveFrom);
      r.getCell(8).value = pw.effectiveTo ? formatDateBR(pw.effectiveTo) : 'مستمر';

      for (let c = 1; c <= COL_COUNT; c++) {
        r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        r.getCell(c).font = { size: 10, name: 'Calibri' };
        r.getCell(c).border = BORDER;
        if (idx % 2 === 1) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
        }
      }
      r.height = 24;
      row++;
    });

    const baseWageRow = ws.getRow(row);
    ws.mergeCells(row, 1, row, 5);
    ws.mergeCells(row, 6, row, 10);
    baseWageRow.getCell(1).value = 'الأجر الأساسي (الافتراضي)';
    baseWageRow.getCell(1).font = { bold: true, size: 9, color: { argb: COLORS.gray500 }, name: 'Calibri' };
    baseWageRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    baseWageRow.getCell(1).border = BORDER;
    baseWageRow.getCell(6).value = formatNum(data.worker.dailyWage);
    baseWageRow.getCell(6).font = { size: 9, color: { argb: COLORS.gray500 }, name: 'Calibri' };
    baseWageRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    baseWageRow.getCell(6).border = BORDER;
    baseWageRow.height = 22;
    row++;
  }

  row++;
  const kpiLabels = ['إجمالي الأيام', 'إجمالي المستحق', 'إجمالي المدفوع', 'إجمالي الحوالات', 'الرصيد'];
  const kpiValues = [
    data.totals.totalWorkDays, data.totals.totalEarned, data.totals.totalPaid,
    data.totals.totalTransfers, data.totals.finalBalance,
  ];
  const kpiPairs: [number, number][] = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];
  const kpiRow = ws.getRow(row);
  const kpiLabelRow = ws.getRow(row + 1);
  kpiPairs.forEach(([s, e], i) => {
    ws.mergeCells(row, s, row, e);
    ws.mergeCells(row + 1, s, row + 1, e);
    const valCell = kpiRow.getCell(s);
    valCell.value = i === 0 ? kpiValues[i] : formatNum(kpiValues[i]);
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

  row = xlSectionHeader(ws, row, 'كشف الحساب التفصيلي', COL_COUNT);

  {
    const hdr = ws.getRow(row);
    ws.mergeCells(row, 4, row, 5);
    const headers = [
      { col: 1, text: '#' },
      { col: 2, text: 'التاريخ' },
      { col: 3, text: 'اليوم' },
      { col: 4, text: 'المشروع' },
      { col: 6, text: 'البيان' },
      { col: 7, text: 'أيام العمل' },
      { col: 8, text: 'مدين' },
      { col: 9, text: 'دائن' },
      { col: 10, text: 'الرصيد' },
    ];
    headers.forEach(({ col, text }) => {
      hdr.getCell(col).value = text;
      hdr.getCell(col).font = { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' };
      hdr.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      hdr.getCell(col).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      hdr.getCell(col).border = BORDER;
    });
    for (let c = 1; c <= COL_COUNT; c++) {
      if (!hdr.getCell(c).border) hdr.getCell(c).border = BORDER;
      if (!hdr.getCell(c).font?.bold) {
        hdr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      }
    }
    hdr.height = 28;
    row++;
  }

  data.statement.forEach((entry, idx) => {
    const dayName = (() => {
      try { return new Date(entry.date).toLocaleDateString('ar-SA', { weekday: 'long' }); } catch { return '-'; }
    })();
    const r = ws.getRow(row);
    ws.mergeCells(row, 4, row, 5);

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = formatDateBR(entry.date);
    r.getCell(3).value = dayName;
    r.getCell(4).value = entry.projectName;
    r.getCell(6).value = entry.description;
    r.getCell(7).value = entry.workDays;
    r.getCell(8).value = formatNum(entry.debit);
    r.getCell(9).value = formatNum(entry.credit);
    r.getCell(10).value = formatNum(entry.balance);

    for (let c = 1; c <= COL_COUNT; c++) {
      const isTextCol = c === 4 || c === 6;
      r.getCell(c).alignment = { horizontal: isTextCol ? 'right' : 'center', vertical: 'middle', wrapText: true };
      r.getCell(c).font = { size: 10, name: 'Calibri' };
      r.getCell(c).border = BORDER;
      if (idx % 2 === 1) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      }
    }
    if (entry.debit > 0) {
      r.getCell(8).font = { size: 10, color: { argb: COLORS.green }, name: 'Calibri' };
      r.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenLight } };
    }
    if (entry.credit > 0) {
      r.getCell(9).font = { size: 10, color: { argb: COLORS.red }, name: 'Calibri' };
      r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.redLight } };
    }
    r.height = 24;
    row++;
  });

  {
    const totR = ws.getRow(row);
    ws.mergeCells(row, 1, row, 6);
    totR.getCell(1).value = 'الإجمالي';
    const totValues = [data.totals.totalWorkDays, formatNum(data.totals.totalEarned), formatNum(data.totals.totalPaid), formatNum(data.totals.finalBalance)];
    [7, 8, 9, 10].forEach((c, i) => {
      totR.getCell(c).value = totValues[i];
    });
    for (let c = 1; c <= COL_COUNT; c++) {
      totR.getCell(c).font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
      totR.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
      totR.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
      totR.getCell(c).border = BORDER;
    }
    totR.height = 28;
    row++;
  }
  row++;

  if (data.projectSummary && data.projectSummary.length > 1) {
    row = xlSectionHeader(ws, row, 'ملخص حسب المشروع', COL_COUNT);

    {
      const hdrRow = ws.getRow(row);
      ws.mergeCells(row, 2, row, 4);
      ws.mergeCells(row, 6, row, 7);
      ws.mergeCells(row, 8, row, 9);
      const summaryHeaders = [
        { col: 1, text: '#' },
        { col: 2, text: 'المشروع' },
        { col: 5, text: 'إجمالي الأيام' },
        { col: 6, text: 'إجمالي المستحق' },
        { col: 8, text: 'إجمالي المدفوع' },
        { col: 10, text: 'الرصيد' },
      ];
      summaryHeaders.forEach(({ col, text }) => {
        const c = hdrRow.getCell(col);
        c.value = text;
        c.font = { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = BORDER;
      });
      for (let c = 1; c <= COL_COUNT; c++) {
        if (!hdrRow.getCell(c).border) hdrRow.getCell(c).border = BORDER;
        if (!hdrRow.getCell(c).font?.bold) {
          hdrRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
        }
      }
      hdrRow.height = 28;
      row++;
    }

    data.projectSummary.forEach((proj, idx) => {
      const r = ws.getRow(row);
      ws.mergeCells(row, 2, row, 4);
      ws.mergeCells(row, 6, row, 7);
      ws.mergeCells(row, 8, row, 9);
      r.getCell(1).value = idx + 1;
      r.getCell(2).value = proj.projectName;
      r.getCell(5).value = proj.totalDays;
      r.getCell(6).value = formatNum(proj.totalEarned);
      r.getCell(8).value = formatNum(proj.totalPaid);
      r.getCell(10).value = formatNum(proj.balance);

      for (let c = 1; c <= COL_COUNT; c++) {
        const isTextCol = c === 2;
        r.getCell(c).alignment = { horizontal: isTextCol ? 'right' : 'center', vertical: 'middle', wrapText: true };
        r.getCell(c).font = { size: 10, name: 'Calibri' };
        r.getCell(c).border = BORDER;
        if (idx % 2 === 1) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
        }
      }
      r.height = 24;
      row++;
    });
    row++;
  }

  row++;
  row = xlSignatures(ws, row, ['العامل', 'المهندس', 'المدير'], [[1, 3], [4, 7], [8, 10]]);

  row += 2;
  row = xlFooter(ws, row, COL_COUNT);

  ws.headerFooter = { oddFooter: '&C Page &P of &N' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
