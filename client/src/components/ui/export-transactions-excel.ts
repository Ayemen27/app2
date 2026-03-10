import { downloadExcelFile } from '@/utils/webview-download';
import { 
  COMPANY_INFO, 
  EXCEL_STYLES,
  ALFATIHI_COLORS,
} from '@/utils/axion-export';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
  workDays?: number;
  dailyWage?: number;
  workerName?: string;
  transferMethod?: string;
  recipientName?: string;
  quantity?: number;
  unitPrice?: number;
  paymentType?: string;
  supplierName?: string;
  materialName?: string;
  payableAmount?: number;
}

interface Totals {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'income': 'دخل',
    'expense': 'مصروف',
    'deferred': 'آجل',
    'transfer_from_project': 'ترحيل وارد'
  };
  return labels[type] || type;
};

const TYPE_COLORS: Record<string, string> = {
  income: 'FF' + ALFATIHI_COLORS.incomeGreen,
  transfer_from_project: 'FF' + ALFATIHI_COLORS.incomeGreen,
  expense: 'FF' + ALFATIHI_COLORS.expenseRed,
  deferred: 'FF' + ALFATIHI_COLORS.deferredOrange,
};

function applyStyle(cell: any, style: any) {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
}

function applyRowStyle(row: any, style: any, startCol: number, endCol: number) {
  for (let i = startCol; i <= endCol; i++) {
    applyStyle(row.getCell(i), style);
  }
}

function addSectionTitle(worksheet: any, currentRow: number, title: string, colCount: number): number {
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const cell = worksheet.getRow(currentRow).getCell(1);
  cell.value = title;
  applyStyle(cell, EXCEL_STYLES.summaryRow);
  worksheet.getRow(currentRow).height = 24;
  return currentRow + 1;
}

export async function exportTransactionsToExcel(
  transactions: Transaction[],
  totals: Totals,
  formatCurrency: (amount: number) => string,
  projectName?: string
): Promise<boolean> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const COL_COUNT = 7;

  const worksheet = workbook.addWorksheet('سجل العمليات', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      horizontalCentered: true
    }
  });

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 13;
  worksheet.getColumn(3).width = 12;
  worksheet.getColumn(4).width = 16;
  worksheet.getColumn(5).width = 18;
  worksheet.getColumn(6).width = 25;
  worksheet.getColumn(7).width = 16;

  let currentRow = 1;

  worksheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  const companyCell = worksheet.getRow(currentRow).getCell(1);
  companyCell.value = COMPANY_INFO.name;
  applyStyle(companyCell, EXCEL_STYLES.headerMain);
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  const titleCell = worksheet.getRow(currentRow).getCell(1);
  titleCell.value = COMPANY_INFO.subtitle;
  applyStyle(titleCell, EXCEL_STYLES.headerSecondary);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  const reportTitle = projectName
    ? `سجل العمليات - ${projectName}`
    : 'سجل العمليات - جميع المشاريع';
  worksheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  const reportCell = worksheet.getRow(currentRow).getCell(1);
  reportCell.value = reportTitle;
  reportCell.font = { bold: true, size: 11, color: { argb: 'FF' + ALFATIHI_COLORS.headerDarkBlue } };
  reportCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  currentRow++;

  const summaryData = [
    { label: 'إجمالي الدخل', value: formatCurrency(totals.totalIncome), color: 'FF' + ALFATIHI_COLORS.incomeGreen },
    { label: 'إجمالي المصروفات', value: formatCurrency(totals.totalExpenses), color: 'FF' + ALFATIHI_COLORS.expenseRed },
    { label: 'الرصيد الصافي', value: formatCurrency(totals.balance), color: totals.balance >= 0 ? 'FF' + ALFATIHI_COLORS.incomeGreen : 'FF' + ALFATIHI_COLORS.expenseRed },
  ];

  summaryData.forEach(item => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    row.getCell(1).value = item.label;
    row.getCell(1).font = { bold: true, size: 11 };
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(currentRow, 4, currentRow, COL_COUNT);
    row.getCell(4).value = item.value;
    row.getCell(4).font = { bold: true, size: 11, color: { argb: item.color } };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.height = 22;
    currentRow++;
  });

  currentRow++;

  currentRow = addSectionTitle(worksheet, currentRow, `سجل العمليات الرئيسي (${transactions.length} عملية)`, COL_COUNT);

  const mainHeaders = ['#', 'التاريخ', 'النوع', 'الفئة', 'المشروع', 'الوصف / الاسم', 'المبلغ'];
  const headerRow = worksheet.getRow(currentRow);
  mainHeaders.forEach((header, idx) => {
    headerRow.getCell(idx + 1).value = header;
    applyStyle(headerRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 22;
  currentRow++;

  transactions.forEach((t, idx) => {
    const row = worksheet.getRow(currentRow);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;

    const description = t.workerName || t.materialName || (t.description !== '-' ? t.description : '') || '-';

    const rowData = [
      idx + 1,
      new Date(t.date).toLocaleDateString('en-GB'),
      getTypeLabel(t.type),
      t.category,
      t.projectName || 'غير محدد',
      description,
      t.amount,
    ];

    rowData.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = value;
      applyStyle(cell, style);

      if (colIdx === 6) {
        cell.numFmt = '#,##0';
        const color = TYPE_COLORS[t.type];
        if (color) cell.font = { ...style.font, bold: true, color: { argb: color } };
      }
      if (colIdx === 2) {
        const color = TYPE_COLORS[t.type];
        if (color) cell.font = { ...style.font, color: { argb: color } };
      }
    });
    row.height = 20;
    currentRow++;
  });

  const totalRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 6);
  totalRow.getCell(1).value = `إجمالي العمليات: ${transactions.length}`;
  totalRow.getCell(7).value = totals.totalExpenses + totals.totalIncome;
  totalRow.getCell(7).numFmt = '#,##0';
  applyRowStyle(totalRow, EXCEL_STYLES.greenRow, 1, COL_COUNT);
  totalRow.height = 22;
  currentRow++;

  const workerTransactions = transactions.filter(t => t.workerName && (t.workDays || t.dailyWage));
  if (workerTransactions.length > 0) {
    currentRow += 2;
    currentRow = addSectionTitle(worksheet, currentRow, `تفاصيل أجور العمال (${workerTransactions.length} سجل)`, COL_COUNT);

    const wHeaders = ['#', 'التاريخ', 'اسم العامل', 'المشروع', 'أيام العمل', 'الأجر اليومي', 'المستحق'];
    const wHeaderRow = worksheet.getRow(currentRow);
    wHeaders.forEach((header, idx) => {
      wHeaderRow.getCell(idx + 1).value = header;
      applyStyle(wHeaderRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
    });
    wHeaderRow.height = 22;
    currentRow++;

    let totalWorkerAmount = 0;
    workerTransactions.forEach((t, idx) => {
      const row = worksheet.getRow(currentRow);
      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
      const due = (t.workDays || 0) * (t.dailyWage || 0);
      totalWorkerAmount += due || t.amount;

      [idx + 1, new Date(t.date).toLocaleDateString('en-GB'), t.workerName, t.projectName || 'غير محدد',
        t.workDays || '-', t.dailyWage || 0, due || t.amount].forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        applyStyle(cell, style);
        if (ci >= 4 && typeof val === 'number') cell.numFmt = '#,##0';
      });
      row.height = 20;
      currentRow++;
    });

    const wTotalRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    wTotalRow.getCell(1).value = `إجمالي أجور العمال`;
    wTotalRow.getCell(7).value = totalWorkerAmount;
    wTotalRow.getCell(7).numFmt = '#,##0';
    applyRowStyle(wTotalRow, EXCEL_STYLES.greenRow, 1, COL_COUNT);
    wTotalRow.height = 22;
    currentRow++;
  }

  const materialTransactions = transactions.filter(t => t.materialName || t.supplierName || (t.quantity && t.unitPrice));
  if (materialTransactions.length > 0) {
    currentRow += 2;
    currentRow = addSectionTitle(worksheet, currentRow, `تفاصيل المواد والمشتريات (${materialTransactions.length} سجل)`, COL_COUNT);

    const mHeaders = ['#', 'التاريخ', 'المادة', 'المورد', 'الكمية', 'سعر الوحدة', 'المبلغ'];
    const mHeaderRow = worksheet.getRow(currentRow);
    mHeaders.forEach((header, idx) => {
      mHeaderRow.getCell(idx + 1).value = header;
      applyStyle(mHeaderRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
    });
    mHeaderRow.height = 22;
    currentRow++;

    let totalMaterialAmount = 0;
    materialTransactions.forEach((t, idx) => {
      const row = worksheet.getRow(currentRow);
      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.orangeRow;
      totalMaterialAmount += t.amount;

      [idx + 1, new Date(t.date).toLocaleDateString('en-GB'), t.materialName || t.description || '-',
        t.supplierName || '-', t.quantity || '-', t.unitPrice || 0, t.amount].forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        applyStyle(cell, style);
        if (ci >= 4 && typeof val === 'number') cell.numFmt = '#,##0';
      });
      row.height = 20;
      currentRow++;
    });

    const mTotalRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    mTotalRow.getCell(1).value = `إجمالي المواد والمشتريات`;
    mTotalRow.getCell(7).value = totalMaterialAmount;
    mTotalRow.getCell(7).numFmt = '#,##0';
    applyRowStyle(mTotalRow, EXCEL_STYLES.greenRow, 1, COL_COUNT);
    mTotalRow.height = 22;
    currentRow++;
  }

  const transferTransactions = transactions.filter(t => t.transferMethod && t.recipientName);
  if (transferTransactions.length > 0) {
    currentRow += 2;
    currentRow = addSectionTitle(worksheet, currentRow, `تفاصيل التحويلات (${transferTransactions.length} سجل)`, COL_COUNT);

    const tHeaders = ['#', 'التاريخ', 'المستلم', 'المشروع', 'طريقة التحويل', 'نوع الدفع', 'المبلغ'];
    const tHeaderRow = worksheet.getRow(currentRow);
    tHeaders.forEach((header, idx) => {
      tHeaderRow.getCell(idx + 1).value = header;
      applyStyle(tHeaderRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
    });
    tHeaderRow.height = 22;
    currentRow++;

    let totalTransferAmount = 0;
    transferTransactions.forEach((t, idx) => {
      const row = worksheet.getRow(currentRow);
      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.greenLightRow;
      totalTransferAmount += t.amount;

      [idx + 1, new Date(t.date).toLocaleDateString('en-GB'), t.recipientName,
        t.projectName || 'غير محدد', t.transferMethod, t.paymentType || '-', t.amount].forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        applyStyle(cell, style);
        if (ci === 6 && typeof val === 'number') cell.numFmt = '#,##0';
      });
      row.height = 20;
      currentRow++;
    });

    const tTotalRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    tTotalRow.getCell(1).value = `إجمالي التحويلات`;
    tTotalRow.getCell(7).value = totalTransferAmount;
    tTotalRow.getCell(7).numFmt = '#,##0';
    applyRowStyle(tTotalRow, EXCEL_STYLES.greenRow, 1, COL_COUNT);
    tTotalRow.height = 22;
    currentRow++;
  }

  currentRow += 2;

  const sigRow = worksheet.getRow(currentRow);
  sigRow.height = 40;
  const sigs = ['توقيع المهندس', 'توقيع مدير المشروع', 'توقيع المدير العام'];
  const colsPerSig = Math.floor(COL_COUNT / sigs.length);
  sigs.forEach((sig, idx) => {
    const startCol = idx * colsPerSig + 1;
    const endCol = idx === sigs.length - 1 ? COL_COUNT : startCol + colsPerSig - 1;
    worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
    const cell = sigRow.getCell(startCol);
    cell.value = `${sig}\n.................................\nالتاريخ:`;
    applyStyle(cell, EXCEL_STYLES.signatureBox);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  currentRow += 2;

  worksheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  const footerCell = worksheet.getRow(currentRow).getCell(1);
  const now = new Date();
  footerCell.value = `تم إنشاء هذا التقرير آلياً بواسطة نظام إدارة مشاريع البناء - التاريخ والوقت: ${now.toLocaleDateString('en-GB')} - ${now.toLocaleTimeString('en-GB')}`;
  applyStyle(footerCell, EXCEL_STYLES.footer);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `سجل_العمليات_${projectName ? projectName + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
  return await downloadExcelFile(buffer as ArrayBuffer, fileName);
}
