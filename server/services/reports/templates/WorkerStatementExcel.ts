import ExcelJS from 'exceljs';
import { WorkerStatementData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter, xlSignatures,
} from './shared-styles';

export async function generateWorkerStatementExcel(data: WorkerStatementData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction System';
  workbook.created = new Date();

  const COL_COUNT = 9;
  const ws = workbook.addWorksheet('كشف حساب العامل', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 14 }, { width: 12 }, { width: 18 },
    { width: 20 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'كشف حساب العامل التفصيلي', COL_COUNT);

  row++;
  row = xlSectionHeader(ws, row, 'بيانات العامل', COL_COUNT);

  const workerInfoRows = [
    ['الاسم', data.worker.name, '', '', 'النوع', data.worker.type, '', '', ''],
    ['الأجر اليومي', formatNum(data.worker.dailyWage), '', '', 'الهاتف', data.worker.phone || '-', '', '', ''],
    ['الفترة من', formatDateBR(data.period.from), '', '', 'الفترة إلى', formatDateBR(data.period.to), '', '', ''],
  ];
  workerInfoRows.forEach((info) => {
    const r = ws.getRow(row);
    info.forEach((v, i) => {
      r.getCell(i + 1).value = v;
      r.getCell(i + 1).border = BORDER;
      r.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(i + 1).font = { size: 10, name: 'Calibri' };
    });
    r.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    r.getCell(5).font = { bold: true, size: 10, name: 'Calibri' };
    r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    r.height = 22;
    row++;
  });

  row++;
  const kpiLabels = ['إجمالي الأيام', 'إجمالي المستحق', 'إجمالي المدفوع', 'إجمالي الحوالات', 'الرصيد'];
  const kpiValues = [
    data.totals.totalWorkDays, data.totals.totalEarned, data.totals.totalPaid,
    data.totals.totalTransfers, data.totals.finalBalance,
  ];
  const kpiPairs: [number, number][] = [[1, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
  const kpiRow = ws.getRow(row);
  const kpiLabelRow = ws.getRow(row + 1);
  kpiPairs.forEach(([s, e], i) => {
    if (s !== e) ws.mergeCells(row, s, row, e);
    if (s !== e) ws.mergeCells(row + 1, s, row + 1, e);
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
  kpiRow.height = 24;
  kpiLabelRow.height = 18;
  row += 3;

  row = xlSectionHeader(ws, row, 'كشف الحساب التفصيلي', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'التاريخ', 'اليوم', 'المشروع', 'البيان', 'أيام العمل', 'مدين', 'دائن', 'الرصيد']);

  data.statement.forEach((entry, idx) => {
    const dayName = (() => {
      try { return new Date(entry.date).toLocaleDateString('ar-SA', { weekday: 'long' }); } catch { return '-'; }
    })();
    const r = ws.getRow(row);
    const values = [idx + 1, formatDateBR(entry.date), dayName, entry.projectName, entry.description, entry.workDays, formatNum(entry.debit), formatNum(entry.credit), formatNum(entry.balance)];
    values.forEach((v, i) => {
      r.getCell(i + 1).value = v;
      r.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      r.getCell(i + 1).font = { size: 10, name: 'Calibri' };
      r.getCell(i + 1).border = BORDER;
      if (idx % 2 === 1) {
        r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
      }
    });
    if (entry.debit > 0) {
      r.getCell(7).font = { size: 10, color: { argb: COLORS.green }, name: 'Calibri' };
      r.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenLight } };
    }
    if (entry.credit > 0) {
      r.getCell(8).font = { size: 10, color: { argb: COLORS.red }, name: 'Calibri' };
      r.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.redLight } };
    }
    r.height = 22;
    row++;
  });

  row = xlTotalsRow(ws, row, ['', 'الإجمالي', '', '', '', data.totals.totalWorkDays, formatNum(data.totals.totalEarned), formatNum(data.totals.totalPaid), formatNum(data.totals.finalBalance)]);
  row++;

  if (data.projectSummary && data.projectSummary.length > 1) {
    row = xlSectionHeader(ws, row, 'ملخص حسب المشروع', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'المشروع', '', 'إجمالي الأيام', '', 'إجمالي المستحق', 'إجمالي المدفوع', '', 'الرصيد']);

    data.projectSummary.forEach((proj, idx) => {
      const r = ws.getRow(row);
      ws.mergeCells(row, 2, row, 3);
      ws.mergeCells(row, 4, row, 5);
      ws.mergeCells(row, 7, row, 8);
      r.getCell(1).value = idx + 1;
      r.getCell(2).value = proj.projectName;
      r.getCell(4).value = proj.totalDays;
      r.getCell(6).value = formatNum(proj.totalEarned);
      r.getCell(7).value = formatNum(proj.totalPaid);
      r.getCell(9).value = formatNum(proj.balance);
      for (let c = 1; c <= COL_COUNT; c++) {
        r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(c).font = { size: 10, name: 'Calibri' };
        r.getCell(c).border = BORDER;
        if (idx % 2 === 1) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
        }
      }
      r.height = 22;
      row++;
    });
    row++;
  }

  row++;
  row = xlSignatures(ws, row, ['العامل', 'المهندس', 'المدير'], [[1, 3], [4, 6], [7, 9]]);

  row += 2;
  row = xlFooter(ws, row, COL_COUNT);

  ws.headerFooter = { oddFooter: '&C Page &P of &N' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
