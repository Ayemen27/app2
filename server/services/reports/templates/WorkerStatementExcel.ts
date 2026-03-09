import ExcelJS from 'exceljs';
import { WorkerStatementData } from '../../../../shared/report-types';

const primaryColor = 'FF1F4E79';
const headerBlue = 'FF2E75B6';
const lightBlue = 'FFE7F3FF';
const greenBg = 'FFC6EFCE';
const orangeBg = 'FFFCE4D6';
const yellowBg = 'FFFFFF00';
const white = 'FFFFFFFF';
const black = 'FF000000';
const greenText = 'FF1B7E4E';
const redText = 'FFC0392B';

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

export async function generateWorkerStatementExcel(data: WorkerStatementData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'نظام إدارة المشاريع';
  workbook.created = new Date();

  const COL_COUNT = 9;
  const ws = workbook.addWorksheet('كشف حساب العامل', {
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
    { width: 5 }, { width: 14 }, { width: 12 }, { width: 18 },
    { width: 20 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 },
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
  titleCell.value = 'كشف حساب العامل التفصيلي';
  titleCell.font = { bold: true, size: 13, color: { argb: white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 28;
  row++;

  row++;
  ws.mergeCells(row, 1, row, COL_COUNT);
  const infoHeader = ws.getRow(row).getCell(1);
  infoHeader.value = 'بيانات العامل';
  infoHeader.font = { bold: true, size: 11, color: { argb: white } };
  infoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  infoHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 24;
  row++;

  const workerInfoRows = [
    ['الاسم', data.worker.name, '', '', 'النوع', data.worker.type, '', '', ''],
    ['الأجر اليومي', fmt(data.worker.dailyWage), '', '', 'الهاتف', data.worker.phone || '-', '', '', ''],
    ['الفترة من', data.period.from, '', '', 'الفترة إلى', data.period.to, '', '', ''],
  ];
  workerInfoRows.forEach((info) => {
    const r = ws.getRow(row);
    info.forEach((v, i) => {
      r.getCell(i + 1).value = v;
      r.getCell(i + 1).border = thinBorder;
      r.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
    });
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
    r.getCell(5).font = { bold: true, size: 10 };
    r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
    r.height = 20;
    row++;
  });

  row++;
  const kpiLabels = ['إجمالي الأيام', 'إجمالي المستحق', 'إجمالي المدفوع', 'إجمالي الحوالات', 'الرصيد'];
  const kpiValues = [
    data.totals.totalWorkDays, data.totals.totalEarned, data.totals.totalPaid,
    data.totals.totalTransfers, data.totals.finalBalance,
  ];
  const kpiRow = ws.getRow(row);
  const kpiLabelRow = ws.getRow(row + 1);
  const kpiPairs = [[1, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
  kpiPairs.forEach(([s, e], i) => {
    if (s !== e) ws.mergeCells(row, s, row, e);
    if (s !== e) ws.mergeCells(row + 1, s, row + 1, e);
    const valCell = kpiRow.getCell(s);
    valCell.value = i === 0 ? kpiValues[i] : fmt(kpiValues[i]);
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

  ws.mergeCells(row, 1, row, COL_COUNT);
  const stmtHeader = ws.getRow(row).getCell(1);
  stmtHeader.value = 'كشف الحساب التفصيلي';
  stmtHeader.font = { bold: true, size: 12, color: { argb: white } };
  stmtHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
  stmtHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 26;
  row++;

  const stmtHeaders = ['#', 'التاريخ', 'اليوم', 'المشروع', 'البيان', 'أيام العمل', 'مدين', 'دائن', 'الرصيد'];
  const hdrRow = ws.getRow(row);
  stmtHeaders.forEach((h, i) => {
    hdrRow.getCell(i + 1).value = h;
    hdrRow.getCell(i + 1).font = { bold: true, size: 10, color: { argb: white } };
    hdrRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
    hdrRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hdrRow.getCell(i + 1).border = thinBorder;
  });
  hdrRow.height = 24;
  row++;

  data.statement.forEach((entry, idx) => {
    const r = ws.getRow(row);
    const dayName = (() => {
      try { return new Date(entry.date).toLocaleDateString('ar-SA', { weekday: 'long' }); } catch { return '-'; }
    })();
    const values = [idx + 1, entry.date, dayName, entry.projectName, entry.description, entry.workDays, entry.debit, entry.credit, entry.balance];
    values.forEach((v, i) => {
      r.getCell(i + 1).value = i >= 6 ? fmt(v as number) : v;
      r.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      r.getCell(i + 1).font = { size: 10 };
      r.getCell(i + 1).border = thinBorder;
      if (idx % 2 === 1) {
        r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
      }
    });
    if (entry.debit > 0) {
      r.getCell(7).font = { size: 10, color: { argb: greenText } };
      r.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: greenBg } };
    }
    if (entry.credit > 0) {
      r.getCell(8).font = { size: 10, color: { argb: redText } };
      r.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: orangeBg } };
    }
    r.height = 20;
    row++;
  });

  const totalStmtRow = ws.getRow(row);
  const totalValues = ['', 'الإجمالي', '', '', '', data.totals.totalWorkDays, fmt(data.totals.totalEarned), fmt(data.totals.totalPaid), fmt(data.totals.finalBalance)];
  totalValues.forEach((v, i) => {
    totalStmtRow.getCell(i + 1).value = v;
    totalStmtRow.getCell(i + 1).font = { bold: true, size: 10, color: { argb: black } };
    totalStmtRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellowBg } };
    totalStmtRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
    totalStmtRow.getCell(i + 1).border = thinBorder;
  });
  totalStmtRow.height = 24;
  row += 2;

  if (data.projectSummary && data.projectSummary.length > 1) {
    ws.mergeCells(row, 1, row, COL_COUNT);
    const projHeader = ws.getRow(row).getCell(1);
    projHeader.value = 'ملخص حسب المشروع';
    projHeader.font = { bold: true, size: 12, color: { argb: white } };
    projHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
    projHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 26;
    row++;

    const projHeaders = ['#', 'المشروع', '', 'إجمالي الأيام', '', 'إجمالي المستحق', 'إجمالي المدفوع', '', 'الرصيد'];
    const pHdrRow = ws.getRow(row);
    projHeaders.forEach((h, i) => {
      pHdrRow.getCell(i + 1).value = h;
      pHdrRow.getCell(i + 1).font = { bold: true, size: 10, color: { argb: white } };
      pHdrRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBlue } };
      pHdrRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
      pHdrRow.getCell(i + 1).border = thinBorder;
    });
    pHdrRow.height = 24;
    row++;

    data.projectSummary.forEach((proj, idx) => {
      const r = ws.getRow(row);
      ws.mergeCells(row, 2, row, 3);
      ws.mergeCells(row, 4, row, 5);
      ws.mergeCells(row, 7, row, 8);
      r.getCell(1).value = idx + 1;
      r.getCell(2).value = proj.projectName;
      r.getCell(4).value = proj.totalDays;
      r.getCell(6).value = fmt(proj.totalEarned);
      r.getCell(7).value = fmt(proj.totalPaid);
      r.getCell(9).value = fmt(proj.balance);
      for (let c = 1; c <= COL_COUNT; c++) {
        r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(c).font = { size: 10 };
        r.getCell(c).border = thinBorder;
        if (idx % 2 === 1) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
        }
      }
      r.height = 20;
      row++;
    });
    row++;
  }

  row++;
  const sigRow = ws.getRow(row);
  sigRow.height = 60;
  const signatures = ['العامل', 'المهندس', 'المدير'];
  const sigCols = [[1, 3], [4, 6], [7, 9]];
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
