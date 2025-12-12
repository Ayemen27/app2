/**
 * تصدير سجل العمليات إلى Excel بتنسيق احترافي
 * Export Transactions Log to Professional Excel Format
 */

import { downloadExcelFile } from '@/utils/webview-download';
import { 
  COMPANY_INFO, 
  EXCEL_STYLES
} from '@/utils/professional-export';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
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

export async function exportTransactionsToExcel(
  transactions: Transaction[],
  totals: Totals,
  formatCurrency: (amount: number) => string,
  projectName?: string
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('سجل العمليات', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  let currentRow = 1;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = COMPANY_INFO.name;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5A96' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const subtitleCell = worksheet.getCell(`A${currentRow}`);
  subtitleCell.value = COMPANY_INFO.subtitle;
  subtitleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 25;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const reportTitleCell = worksheet.getCell(`A${currentRow}`);
  const reportTitle = projectName 
    ? `سجل العمليات - ${projectName} - ${new Date().toLocaleDateString('ar-SA')}`
    : `سجل العمليات - ${new Date().toLocaleDateString('ar-SA')}`;
  reportTitleCell.value = reportTitle;
  reportTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1F5A96' } };
  reportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  currentRow++;

  const summaryData = [
    ['إجمالي الدخل', formatCurrency(totals.totalIncome)],
    ['إجمالي المصروفات', formatCurrency(totals.totalExpenses)],
    ['الرصيد الصافي', formatCurrency(totals.balance)]
  ];

  summaryData.forEach(([label, value]) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const labelCell = row.getCell(1);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 11 };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(`D${currentRow}:G${currentRow}`);
    const valueCell = row.getCell(4);
    valueCell.value = value;
    valueCell.font = { bold: true, size: 11, color: { argb: label === 'الرصيد الصافي' ? (totals.balance >= 0 ? 'FF008000' : 'FFFF0000') : 'FF000000' } };
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    row.height = 22;
    currentRow++;
  });

  currentRow++;

  const headers = ['#', 'التاريخ', 'النوع', 'الفئة', 'الوصف', 'المشروع', 'المبلغ'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = EXCEL_STYLES.tableHeader.font;
    cell.fill = EXCEL_STYLES.tableHeader.fill;
    cell.alignment = EXCEL_STYLES.tableHeader.alignment;
    cell.border = EXCEL_STYLES.tableHeader.border;
  });
  headerRow.height = 28;
  currentRow++;

  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 14;
  worksheet.getColumn(3).width = 12;
  worksheet.getColumn(4).width = 18;
  worksheet.getColumn(5).width = 30;
  worksheet.getColumn(6).width = 18;
  worksheet.getColumn(7).width = 16;

  transactions.forEach((transaction, idx) => {
    const row = worksheet.getRow(currentRow);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    
    const dateObj = new Date(transaction.date);
    const formattedDate = dateObj.toLocaleDateString('ar-SA');

    const rowData = [
      idx + 1,
      formattedDate,
      getTypeLabel(transaction.type),
      transaction.category,
      transaction.description,
      transaction.projectName || 'غير محدد',
      formatCurrency(transaction.amount)
    ];

    rowData.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = value;
      cell.font = style.font;
      if ((style as any).fill) cell.fill = (style as any).fill;
      cell.alignment = style.alignment;
      cell.border = style.border;

      if (colIdx === 2) {
        if (transaction.type === 'income' || transaction.type === 'transfer_from_project') {
          cell.font = { ...style.font, color: { argb: 'FF008000' } };
        } else if (transaction.type === 'expense') {
          cell.font = { ...style.font, color: { argb: 'FFFF0000' } };
        } else if (transaction.type === 'deferred') {
          cell.font = { ...style.font, color: { argb: 'FFFF8C00' } };
        }
      }
    });
    
    row.height = 24;
    currentRow++;
  });

  currentRow++;
  const summaryRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const summaryLabelCell = summaryRow.getCell(1);
  summaryLabelCell.value = `إجمالي العمليات: ${transactions.length}`;
  summaryLabelCell.font = EXCEL_STYLES.summaryRow.font;
  summaryLabelCell.fill = EXCEL_STYLES.summaryRow.fill;
  summaryLabelCell.alignment = EXCEL_STYLES.summaryRow.alignment;
  summaryLabelCell.border = EXCEL_STYLES.summaryRow.border;

  worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
  const dateCell = summaryRow.getCell(5);
  dateCell.value = `تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.height = 26;
  currentRow += 2;

  const signatureRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const sig1 = signatureRow.getCell(1);
  sig1.value = 'توقيع المدير المالي: ________________';
  sig1.font = EXCEL_STYLES.signatureBox.font;
  sig1.alignment = EXCEL_STYLES.signatureBox.alignment;
  sig1.border = EXCEL_STYLES.signatureBox.border;

  worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
  const sig2 = signatureRow.getCell(5);
  sig2.value = 'توقيع المدير العام: ________________';
  sig2.font = EXCEL_STYLES.signatureBox.font;
  sig2.alignment = EXCEL_STYLES.signatureBox.alignment;
  sig2.border = EXCEL_STYLES.signatureBox.border;
  signatureRow.height = 35;
  currentRow += 2;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const footerCell = worksheet.getCell(`A${currentRow}`);
  footerCell.value = `${COMPANY_INFO.name} | ${COMPANY_INFO.address} | تم إنشاء هذا التقرير آلياً`;
  footerCell.font = EXCEL_STYLES.footer.font;
  footerCell.alignment = EXCEL_STYLES.footer.alignment;

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `سجل_العمليات_${projectName ? projectName + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
  await downloadExcelFile(buffer as ArrayBuffer, fileName);
}
