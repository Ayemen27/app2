import ExcelJS from 'exceljs';
import { DailyReportData } from '../../../../shared/report-types';
import { currentReportHeader } from './header-context';
import {
  COLORS, BORDER, formatNum, formatDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlFooter, xlSignatures,
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

function xlKpiCards(ws: ExcelJS.Worksheet, rowNum: number, data: DailyReportData, colCount: number): number {
  const carryForward = (data as any).carryForwardBalance ?? 0;
  const finalBalance = carryForward + data.totals.totalFundTransfers - data.totals.totalExpenses;

  const rows = [
    [
      { label: 'إجمالي أجور العمال', value: formatNum(data.totals.totalWorkerWages) },
      { label: 'إجمالي المدفوع', value: formatNum(data.totals.totalPaidWages) },
      { label: 'إجمالي المواد', value: formatNum(data.totals.totalMaterials) },
      { label: 'إجمالي النقل', value: formatNum(data.totals.totalTransport) },
    ],
    [
      { label: 'إجمالي المصروفات', value: formatNum(data.totals.totalExpenses) },
      { label: 'عهدة اليوم (وارد)', value: formatNum(data.totals.totalFundTransfers) },
      { label: 'إجمالي الحوالات', value: formatNum(data.totals.totalWorkerTransfers) },
      { label: 'إجمالي النثريات', value: formatNum(data.totals.totalMiscExpenses) },
    ],
    [
      { label: 'إجمالي أيام العمل', value: String(data.totals.totalWorkDays ?? 0) },
      { label: 'عدد العمال', value: String(data.totals.workerCount ?? 0) },
      { label: 'الرصيد المرحّل من السابق', value: formatNum(carryForward) },
      { label: 'الرصيد النهائي', value: formatNum(finalBalance) },
    ],
  ];

  const colWidth = Math.floor(colCount / 4);

  for (const cardRow of rows) {
    const lblRowNum = rowNum;
    const valRowNum = rowNum + 1;
    const lblRow = ws.getRow(lblRowNum);
    const valRow = ws.getRow(valRowNum);

    cardRow.forEach((card, i) => {
      const startCol = i * colWidth + 1;
      const endCol = i === 3 ? colCount : startCol + colWidth - 1;
      if (startCol !== endCol) {
        ws.mergeCells(lblRowNum, startCol, lblRowNum, endCol);
        ws.mergeCells(valRowNum, startCol, valRowNum, endCol);
      }
      const lblCell = lblRow.getCell(startCol);
      lblCell.value = card.label;
      lblCell.font = { bold: true, size: 9, color: { argb: COLORS.white }, name: 'Calibri' };
      lblCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
      lblCell.border = BORDER;

      const valCell = valRow.getCell(startCol);
      valCell.value = card.value;
      valCell.font = { bold: true, size: 12, color: { argb: COLORS.navy }, name: 'Calibri' };
      valCell.alignment = { horizontal: 'center', vertical: 'middle' };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
      valCell.border = BORDER;
    });

    lblRow.height = 20;
    valRow.height = 28;
    rowNum += 2;
  }
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
  row = xlTitleRow(ws, row, 'التقرير اليومي التفصيلي', COL_COUNT);
  row = xlInfoRow(ws, row, `المشروع: ${data.project.name}  |  التاريخ: ${formatDateBR(data.date)}  |  المهندس: ${data.project.engineerName || '-'}`, COL_COUNT);

  row++;
  row = xlKpiCards(ws, row, data, COL_COUNT);

  // ─── 1. سجل الحضور والعمالة ────────────────────────────────────────────
  if (data.attendance.length > 0) {
    row = xlSectionHeader(ws, row, 'سجل الحضور والعمالة', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'اسم العامل', 'النوع', 'الأيام', 'الأجر اليومي', 'المستحق', 'المدفوع', 'المتبقي', 'وصف العمل']);
    data.attendance.forEach((rec, idx) => {
      const r = ws.getRow(row);
      const vals = [
        idx + 1,
        rec.workerName,
        rec.workerType,
        rec.workDays,
        formatNum(rec.dailyWage),
        formatNum(rec.totalWage),
        formatNum(rec.paidAmount),
        formatNum(rec.remainingAmount),
        rec.workDescription,
      ];
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
  }

  // ─── 2. المواد والمشتريات ──────────────────────────────────────────────
  if (data.materials.length > 0) {
    row = xlSectionHeader(ws, row, 'المواد والمشتريات', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'اسم المادة', 'الفئة', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'المدفوع', 'المتبقي', 'المورد']);
    data.materials.forEach((rec, idx) => {
      const r = ws.getRow(row);
      const vals = [
        idx + 1,
        rec.materialName,
        rec.category,
        rec.quantity,
        formatNum(rec.unitPrice),
        formatNum(rec.totalAmount),
        formatNum(rec.paidAmount),
        formatNum(rec.remainingAmount),
        rec.supplierName,
      ];
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
  }

  // ─── حركة المخزن (اختيارية) ──────────────────────────────────────────
  const invIssued = data.inventoryIssued || [];
  if (invIssued.length > 0) {
    row = xlSectionHeader(ws, row, 'حركة المخزن', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'اسم المادة', 'الفئة', 'النوع', 'الكمية', 'الوحدة', 'الحالة', 'المشروع / الوجهة', 'متبقي بالمشروع']);
    invIssued.forEach((rec, idx) => {
      const r = ws.getRow(row);
      const isTransfer = rec.transactionType === 'نقل';
      const projectCell = isTransfer && rec.targetProjectName
        ? `${rec.projectName} ← ${rec.targetProjectName}`
        : (rec.projectName || '-');
      const vals = [idx + 1, rec.itemName, rec.category, rec.transactionType, rec.issuedQty, rec.unit, rec.status, projectCell, rec.remainingInProject];
      vals.forEach((v, i) => {
        r.getCell(i + 1).value = v;
        const isTextCol = i === 1 || i === 2 || i === 7;
        r.getCell(i + 1).alignment = { horizontal: isTextCol ? 'right' : 'center', vertical: 'middle', wrapText: true };
        r.getCell(i + 1).font = { size: 10, name: 'Calibri' };
        r.getCell(i + 1).border = BORDER;
        if (idx % 2 === 1) {
          r.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
        }
      });
      // تلوين النوع/الحالة/الكمية
      if (isTransfer) {
        r.getCell(4).font = { size: 10, name: 'Calibri', bold: true, color: { argb: 'FF92400E' } };
        r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        r.getCell(7).font = { size: 10, name: 'Calibri', bold: true, color: { argb: 'FF92400E' } };
      } else {
        r.getCell(4).font = { size: 10, name: 'Calibri', bold: true, color: { argb: 'FF1E40AF' } };
        r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        r.getCell(7).font = { size: 10, name: 'Calibri', bold: true, color: { argb: 'FF991B1B' } };
      }
      r.getCell(5).font = { size: 10, name: 'Calibri', bold: true, color: { argb: COLORS.red } };
      r.height = 24;
      row++;
    });
    const totalIssuedQty = invIssued.reduce((s, inv) => s + inv.issuedQty, 0);
    const transferCount = invIssued.filter(i => i.transactionType === 'نقل').length;
    const issueCount = invIssued.length - transferCount;
    row = xlMergedTotalsRow(ws, row,
      [{ col: 1, value: `إجمالي ${invIssued.length} حركة • صرف: ${issueCount} • نقل: ${transferCount}` }, { col: 5, value: formatNum(totalIssuedQty) }],
      [[1, 4], [6, 9]], COL_COUNT);
    {
      const noteRow = ws.getRow(row);
      ws.mergeCells(row, 1, row, COL_COUNT);
      noteRow.getCell(1).value = 'ملاحظة: المواد المنقولة بين المشاريع لا تُحتسب ضمن "المشتريات الجديدة" — هي حركة مخزنية فقط بدون أثر مالي.';
      noteRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' }, name: 'Calibri' };
      noteRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      noteRow.height = 18;
      row++;
    }
    row++;
  }

  // ─── 3. النقل والمواصلات ──────────────────────────────────────────────
  if (data.transport.length > 0) {
    row = xlSectionHeader(ws, row, 'النقل والمواصلات', COL_COUNT);
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
  }

  // ─── 4. مصاريف متنوعة ────────────────────────────────────────────────
  if (data.miscExpenses.length > 0) {
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
  }

  // ─── 5. التحويلات المالية (العهدة الواردة) ────────────────────────────
  if (data.fundTransfers.length > 0) {
    row = xlSectionHeader(ws, row, 'التحويلات المالية (العهدة الواردة)', COL_COUNT);
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
  }

  // ─── 6. حوالات العمال ────────────────────────────────────────────────
  if (data.workerTransfers.length > 0) {
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
  }

  // ─── ترحيل لمشاريع أخرى (اختياري) ───────────────────────────────────
  const ptOut = data.projectTransfersOut || [];
  if (ptOut.length > 0) {
    row = xlSectionHeader(ws, row, 'ترحيل لمشاريع أخرى', COL_COUNT);
    row = xlMergedHeader(ws, row,
      [{ col: 1, text: '#' }, { col: 2, text: 'المشروع' }, { col: 4, text: 'البيان' }, { col: 7, text: 'المبلغ' }],
      [[2, 3], [4, 6], [7, 9]], COL_COUNT);
    ptOut.forEach((rec, idx) => {
      row = xlMergedDataRow(ws, row,
        [{ col: 1, value: idx + 1 }, { col: 2, value: rec.toProjectName, rightAlign: true }, { col: 4, value: rec.description, rightAlign: true }, { col: 7, value: formatNum(rec.amount) }],
        [[2, 3], [4, 6], [7, 9]], COL_COUNT, idx % 2 === 1);
    });
    const totalPtOut = ptOut.reduce((s, p) => s + p.amount, 0);
    row = xlMergedTotalsRow(ws, row,
      [{ col: 1, value: 'الإجمالي' }, { col: 7, value: formatNum(totalPtOut) }],
      [[1, 6], [7, 9]], COL_COUNT);
    row++;
  }

  // ─── 7. ملخص اليوم ───────────────────────────────────────────────────
  row = xlSectionHeader(ws, row, 'ملخص اليوم المالي', COL_COUNT);
  const carryForward = (data as any).carryForwardBalance ?? 0;
  const finalBalance = carryForward + data.totals.totalFundTransfers - data.totals.totalExpenses;
  const summaryItems: [string, string][] = [
    ['عهدة اليوم (وارد)', formatNum(data.totals.totalFundTransfers)],
    ['إجمالي أجور العمال', formatNum(data.totals.totalWorkerWages)],
    ['إجمالي المدفوع للعمال', formatNum(data.totals.totalPaidWages)],
    ['إجمالي المواد', formatNum(data.totals.totalMaterials)],
    ['إجمالي النقل', formatNum(data.totals.totalTransport)],
    ['إجمالي النثريات', formatNum(data.totals.totalMiscExpenses)],
    ['إجمالي حوالات العمال', formatNum(data.totals.totalWorkerTransfers)],
    ['إجمالي المصروفات', formatNum(data.totals.totalExpenses)],
    ['الرصيد المرحّل من السابق', formatNum(carryForward)],
    ['الرصيد النهائي', formatNum(finalBalance)],
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
    r.getCell(6).font = { bold: idx >= summaryItems.length - 2, size: 10, name: 'Calibri' };
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
  // ✅ تذييل التوقيعات: المهندس والمدير من بيانات المشروع، والمحاسب من إعدادات الشركة
  row = xlSignatures(ws, row, [
    { title: 'المهندس المسؤول', name: data.project.engineerName },
    { title: 'المدير', name: (data.project as any)?.managerName },
    { title: 'المحاسب', name: currentReportHeader().accountant_name || undefined },
  ], [[1, 2], [3, 4], [5, 6]]);
  row += 2;
  row = xlFooter(ws, row, COL_COUNT);

  ws.headerFooter = { oddFooter: '&C Page &P of &N' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
