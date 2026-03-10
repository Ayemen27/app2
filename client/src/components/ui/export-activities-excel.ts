import { downloadExcelFile } from '@/utils/webview-download';
import { 
  COMPANY_INFO, 
  EXCEL_STYLES,
  ALFATIHI_COLORS,
  addReportHeader
} from '@/utils/axion-export';

interface ActivityItem {
  id?: number;
  actionType: string;
  actionLabel?: string;
  userName?: string;
  projectName?: string;
  amount?: number;
  description?: string;
  createdAt: string;
}

const getActionLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    'transfer': 'تحويل',
    'expense': 'مصروف',
    'income': 'دخل',
    'attendance': 'حضور',
    'material': 'مواد',
    'transport': 'نقل',
    'payment': 'دفعة'
  };
  return labels[actionType] || actionType;
};

function applyStyle(cell: any, style: any) {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
}

export async function exportActivitiesToExcel(
  activities: ActivityItem[],
  formatCurrency: (amount: number) => string
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
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      horizontalCentered: true
    }
  });

  const totalColumns = 7;
  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 15;
  worksheet.getColumn(3).width = 18;
  worksheet.getColumn(4).width = 20;
  worksheet.getColumn(5).width = 18;
  worksheet.getColumn(6).width = 30;
  worksheet.getColumn(7).width = 22;

  let currentRow = addReportHeader(
    worksheet,
    'سجل العمليات والنشاطات',
    `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
    [`إجمالي العمليات: ${activities.length}`]
  );

  const headers = ['#', 'نوع العملية', 'المستخدم', 'المشروع', 'المبلغ', 'الوصف', 'التاريخ والوقت'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    applyStyle(cell, EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 22;
  currentRow++;

  let totalAmount = 0;
  activities.forEach((activity, idx) => {
    const row = worksheet.getRow(currentRow);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    
    const dateTime = new Date(activity.createdAt);
    const formattedDate = dateTime.toLocaleDateString('en-GB');
    const formattedTime = dateTime.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    const rowData = [
      idx + 1,
      activity.actionLabel || getActionLabel(activity.actionType),
      activity.userName || 'النظام',
      activity.projectName || 'الكل',
      activity.amount ? formatCurrency(activity.amount) : '-',
      activity.description || '-',
      `${formattedDate} ${formattedTime}`
    ];

    rowData.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = value;
      applyStyle(cell, style);
    });
    
    row.height = 20;
    if (activity.amount) totalAmount += activity.amount;
    currentRow++;
  });

  currentRow++;
  const summaryRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  applyStyle(summaryRow.getCell(1), EXCEL_STYLES.summaryRow);
  summaryRow.getCell(1).value = `إجمالي العمليات: ${activities.length}`;

  applyStyle(summaryRow.getCell(5), EXCEL_STYLES.greenRow);
  summaryRow.getCell(5).value = formatCurrency(totalAmount);

  worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
  summaryRow.getCell(6).value = `تاريخ التصدير: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`;
  summaryRow.getCell(6).font = { size: 10, italic: true };
  summaryRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.height = 22;
  currentRow += 2;

  const sigRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  applyStyle(sigRow.getCell(1), EXCEL_STYLES.signatureBox);
  sigRow.getCell(1).value = 'توقيع المهندس\n.................................';
  sigRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
  applyStyle(sigRow.getCell(5), EXCEL_STYLES.signatureBox);
  sigRow.getCell(5).value = 'توقيع المدير العام\n.................................';
  sigRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sigRow.height = 40;
  currentRow += 2;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const footerCell = worksheet.getCell(`A${currentRow}`);
  const now = new Date();
  footerCell.value = `تم إنشاء هذا التقرير آلياً بواسطة نظام إدارة مشاريع البناء - التاريخ والوقت: ${now.toLocaleDateString('en-GB')} - ${now.toLocaleTimeString('en-GB')}`;
  applyStyle(footerCell, EXCEL_STYLES.footer);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `سجل_العمليات_${new Date().toISOString().split('T')[0]}.xlsx`;
  return await downloadExcelFile(buffer as ArrayBuffer, fileName);
}
