import { downloadExcelFile } from '@/utils/webview-download';
import { 
  COMPANY_INFO, 
  EXCEL_STYLES,
  ALFATIHI_COLORS
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
  
  const worksheet = workbook.addWorksheet('سجل العمليات', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      horizontalCentered: true
    }
  });

  const totalColumns = 15;
  let currentRow = 1;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = COMPANY_INFO.name;
  applyStyle(titleCell, EXCEL_STYLES.headerMain);
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const subtitleCell = worksheet.getCell(`A${currentRow}`);
  subtitleCell.value = COMPANY_INFO.subtitle;
  applyStyle(subtitleCell, EXCEL_STYLES.headerSecondary);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const reportTitleCell = worksheet.getCell(`A${currentRow}`);
  const reportTitle = projectName 
    ? `سجل العمليات - ${projectName} - ${new Date().toLocaleDateString('en-GB')}`
    : `سجل العمليات - ${new Date().toLocaleDateString('en-GB')}`;
  reportTitleCell.value = reportTitle;
  reportTitleCell.font = { bold: true, size: 11, color: { argb: 'FF' + ALFATIHI_COLORS.headerDarkBlue } };
  reportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  currentRow++;

  const summaryData = [
    ['إجمالي الدخل', formatCurrency(totals.totalIncome)],
    ['إجمالي المصروفات', formatCurrency(totals.totalExpenses)],
    ['الرصيد الصافي', formatCurrency(totals.balance)]
  ];

  summaryData.forEach(([label, value]) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const labelCell = row.getCell(1);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 11 };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
    const valueCell = row.getCell(5);
    valueCell.value = value;
    valueCell.font = { bold: true, size: 11, color: { argb: label === 'الرصيد الصافي' ? (totals.balance >= 0 ? 'FF008000' : 'FFFF0000') : 'FF000000' } };
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    row.height = 22;
    currentRow++;
  });

  currentRow++;

  const headers = [
    '#', 'التاريخ', 'النوع', 'الفئة', 'المشروع', 'اسم العامل/المادة',
    'عدد الأيام', 'الأجر اليومي', 'المستحقات', 'الكمية', 'سعر الوحدة',
    'نوع الدفع', 'المورد/المستلم', 'طريقة التحويل', 'المبلغ المدفوع'
  ];
  
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    applyStyle(cell, EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 22;
  currentRow++;

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 12;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 14;
  worksheet.getColumn(5).width = 14;
  worksheet.getColumn(6).width = 16;
  worksheet.getColumn(7).width = 10;
  worksheet.getColumn(8).width = 11;
  worksheet.getColumn(9).width = 13;
  worksheet.getColumn(10).width = 8;
  worksheet.getColumn(11).width = 10;
  worksheet.getColumn(12).width = 9;
  worksheet.getColumn(13).width = 14;
  worksheet.getColumn(14).width = 11;
  worksheet.getColumn(15).width = 13;

  transactions.forEach((transaction, idx) => {
    const row = worksheet.getRow(currentRow);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    
    const dateObj = new Date(transaction.date);
    const formattedDate = dateObj.toLocaleDateString('en-GB');

    const getNameField = (): string => {
      if (transaction.workerName) return transaction.workerName;
      if (transaction.materialName) return transaction.materialName;
      if (transaction.description && transaction.description !== '-') return transaction.description;
      return '-';
    };

    const getRecipientOrSupplier = (): string => {
      if (transaction.supplierName) return transaction.supplierName;
      if (transaction.recipientName) return transaction.recipientName;
      return '-';
    };

    const rowData = [
      idx + 1,
      formattedDate,
      getTypeLabel(transaction.type),
      transaction.category,
      transaction.projectName || 'غير محدد',
      getNameField(),
      transaction.workDays ?? '-',
      transaction.dailyWage ? formatCurrency(transaction.dailyWage) : '-',
      transaction.payableAmount ? formatCurrency(transaction.payableAmount) : '-',
      transaction.quantity ?? '-',
      transaction.unitPrice ? formatCurrency(transaction.unitPrice) : '-',
      transaction.paymentType || '-',
      getRecipientOrSupplier(),
      transaction.transferMethod || '-',
      formatCurrency(transaction.amount)
    ];

    rowData.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = value;
      applyStyle(cell, style);

      if (colIdx === 2) {
        if (transaction.type === 'income' || transaction.type === 'transfer_from_project') {
          cell.font = { ...style.font, color: { argb: 'FF008000' } };
        } else if (transaction.type === 'expense') {
          cell.font = { ...style.font, color: { argb: 'FFFF0000' } };
        } else if (transaction.type === 'deferred') {
          cell.font = { ...style.font, color: { argb: 'FFFF8C00' } };
        }
      }

      if (colIdx === 8 && transaction.payableAmount && transaction.amount === 0) {
        cell.font = { ...style.font, bold: true, color: { argb: 'FFFF6600' } };
      }

      if (colIdx === 14) {
        if (transaction.type === 'income' || transaction.type === 'transfer_from_project') {
          cell.font = { ...style.font, bold: true, color: { argb: 'FF008000' } };
        } else if (transaction.type === 'expense') {
          cell.font = { ...style.font, bold: true, color: { argb: 'FFFF0000' } };
        } else if (transaction.type === 'deferred') {
          cell.font = { ...style.font, bold: true, color: { argb: 'FFFF8C00' } };
        }
      }
    });
    
    row.height = 20;
    currentRow++;
  });

  currentRow++;
  const summaryRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  applyStyle(summaryRow.getCell(1), EXCEL_STYLES.summaryRow);
  summaryRow.getCell(1).value = `إجمالي العمليات: ${transactions.length}`;

  worksheet.mergeCells(`H${currentRow}:O${currentRow}`);
  const dateCell = summaryRow.getCell(8);
  dateCell.value = `تاريخ التصدير: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.height = 22;
  currentRow += 2;

  const sigRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
  applyStyle(sigRow.getCell(1), EXCEL_STYLES.signatureBox);
  sigRow.getCell(1).value = 'توقيع المهندس\n.................................';
  sigRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  worksheet.mergeCells(`F${currentRow}:J${currentRow}`);
  applyStyle(sigRow.getCell(6), EXCEL_STYLES.signatureBox);
  sigRow.getCell(6).value = 'توقيع مدير المشروع\n.................................';
  sigRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  worksheet.mergeCells(`K${currentRow}:O${currentRow}`);
  applyStyle(sigRow.getCell(11), EXCEL_STYLES.signatureBox);
  sigRow.getCell(11).value = 'توقيع المدير العام\n.................................';
  sigRow.getCell(11).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sigRow.height = 40;
  currentRow += 2;

  worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
  const footerCell = worksheet.getCell(`A${currentRow}`);
  const now = new Date();
  footerCell.value = `تم إنشاء هذا التقرير آلياً بواسطة نظام إدارة مشاريع البناء - التاريخ والوقت: ${now.toLocaleDateString('en-GB')} - ${now.toLocaleTimeString('en-GB')}`;
  applyStyle(footerCell, EXCEL_STYLES.footer);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `سجل_العمليات_${projectName ? projectName + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
  return await downloadExcelFile(buffer as ArrayBuffer, fileName);
}
