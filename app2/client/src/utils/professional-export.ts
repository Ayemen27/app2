/**
 * نظام التصدير الاحترافي
 * Professional Export System
 * يدعم Excel و PDF مع ترويسة وتذييل احترافي
 */

import { formatCurrency } from '@/lib/utils';

export const COMPANY_INFO = {
  name: 'شركة الإدارة الهندسية',
  subtitle: 'Engineering Management Company',
  address: 'المملكة العربية السعودية',
  phone: '+966 XX XXXX XXX',
  email: 'info@company.com',
  website: 'www.company.com'
};

export const EXCEL_STYLES = {
  headerMain: {
    font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1F2937' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'medium' as const },
      bottom: { style: 'medium' as const },
      left: { style: 'medium' as const },
      right: { style: 'medium' as const }
    }
  },
  headerSecondary: {
    font: { bold: true, size: 12, color: { argb: 'FF1F2937' } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE5E7EB' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  tableHeader: {
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF3B82F6' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  tableCell: {
    font: { size: 10 },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  tableCellEven: {
    font: { size: 10 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF9FAFB' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  currency: {
    font: { size: 10, bold: true },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    numFmt: '#,##0.00" ريال"',
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  positiveAmount: {
    font: { size: 10, bold: true, color: { argb: 'FF059669' } },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    numFmt: '#,##0.00',
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  negativeAmount: {
    font: { size: 10, bold: true, color: { argb: 'FFDC2626' } },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    numFmt: '#,##0.00',
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  summaryRow: {
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1F2937' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'medium' as const },
      bottom: { style: 'medium' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  footer: {
    font: { size: 9, italic: true, color: { argb: 'FF6B7280' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  }
};

export interface ExportOptions {
  projectName?: string;
  reportTitle: string;
  reportType: 'daily' | 'periodic' | 'project-summary' | 'worker-statement' | 'comparison';
  dateRange?: { from: string; to: string };
  date?: string;
  includeCharts?: boolean;
  includeDetails?: boolean;
}

async function addProfessionalHeader(
  worksheet: any,
  options: ExportOptions,
  columnCount: number
): Promise<number> {
  let currentRow = 1;

  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const companyRow = worksheet.getRow(currentRow);
  companyRow.getCell(1).value = COMPANY_INFO.name;
  companyRow.getCell(1).font = EXCEL_STYLES.headerMain.font;
  companyRow.getCell(1).fill = EXCEL_STYLES.headerMain.fill;
  companyRow.getCell(1).alignment = EXCEL_STYLES.headerMain.alignment;
  companyRow.height = 30;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const subtitleRow = worksheet.getRow(currentRow);
  subtitleRow.getCell(1).value = COMPANY_INFO.subtitle;
  subtitleRow.getCell(1).font = { ...EXCEL_STYLES.headerMain.font, size: 12 };
  subtitleRow.getCell(1).fill = EXCEL_STYLES.headerMain.fill;
  subtitleRow.getCell(1).alignment = EXCEL_STYLES.headerMain.alignment;
  subtitleRow.height = 20;
  currentRow++;

  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const titleRow = worksheet.getRow(currentRow);
  titleRow.getCell(1).value = options.reportTitle;
  titleRow.getCell(1).font = EXCEL_STYLES.headerSecondary.font;
  titleRow.getCell(1).fill = EXCEL_STYLES.headerSecondary.fill;
  titleRow.getCell(1).alignment = EXCEL_STYLES.headerSecondary.alignment;
  titleRow.height = 25;
  currentRow++;

  if (options.projectName) {
    worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
    const projectRow = worksheet.getRow(currentRow);
    projectRow.getCell(1).value = `المشروع: ${options.projectName}`;
    projectRow.getCell(1).font = { size: 11, bold: true };
    projectRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    projectRow.height = 20;
    currentRow++;
  }

  if (options.dateRange) {
    worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
    const dateRow = worksheet.getRow(currentRow);
    dateRow.getCell(1).value = `الفترة: من ${options.dateRange.from} إلى ${options.dateRange.to}`;
    dateRow.getCell(1).font = { size: 10 };
    dateRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    dateRow.height = 18;
    currentRow++;
  } else if (options.date) {
    worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
    const dateRow = worksheet.getRow(currentRow);
    dateRow.getCell(1).value = `التاريخ: ${options.date}`;
    dateRow.getCell(1).font = { size: 10 };
    dateRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    dateRow.height = 18;
    currentRow++;
  }

  currentRow++;

  return currentRow;
}

function addProfessionalFooter(
  worksheet: any,
  startRow: number,
  columnCount: number
): void {
  const currentRow = startRow + 1;
  
  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const footerRow = worksheet.getRow(currentRow);
  const now = new Date();
  footerRow.getCell(1).value = `تم إنشاء التقرير في: ${now.toLocaleDateString('ar-EG')} الساعة ${now.toLocaleTimeString('ar-EG')}`;
  footerRow.getCell(1).font = EXCEL_STYLES.footer.font;
  footerRow.getCell(1).alignment = EXCEL_STYLES.footer.alignment;

  worksheet.mergeCells(currentRow + 1, 1, currentRow + 1, columnCount);
  const copyrightRow = worksheet.getRow(currentRow + 1);
  copyrightRow.getCell(1).value = `© ${now.getFullYear()} ${COMPANY_INFO.name} - جميع الحقوق محفوظة`;
  copyrightRow.getCell(1).font = EXCEL_STYLES.footer.font;
  copyrightRow.getCell(1).alignment = EXCEL_STYLES.footer.alignment;
}

export async function exportDailyReportToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('التقرير اليومي', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 25 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 20 }
  ];

  let currentRow = await addProfessionalHeader(worksheet, options, 6);

  const summaryHeaderRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 6);
  summaryHeaderRow.getCell(1).value = 'ملخص المصروفات';
  summaryHeaderRow.getCell(1).font = EXCEL_STYLES.tableHeader.font;
  summaryHeaderRow.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
  summaryHeaderRow.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
  summaryHeaderRow.height = 25;
  currentRow++;

  const summaryData = [
    ['البند', 'المبلغ'],
    ['أجور العمال', formatCurrency(data.summary?.totalPaidWages || 0)],
    ['مشتريات المواد', formatCurrency(data.summary?.totalMaterials || 0)],
    ['مصاريف النقل', formatCurrency(data.summary?.totalTransport || 0)],
    ['مصاريف متنوعة', formatCurrency(data.summary?.totalMiscExpenses || 0)],
    ['إجمالي المصروفات', formatCurrency(data.summary?.totalExpenses || 0)],
    ['تحويلات العهدة', formatCurrency(data.summary?.totalFundTransfers || 0)],
    ['الرصيد', formatCurrency(data.summary?.balance || 0)]
  ];

  summaryData.forEach((rowData, idx) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    worksheet.mergeCells(currentRow, 4, currentRow, 6);
    row.getCell(1).value = rowData[0];
    row.getCell(4).value = rowData[1];
    
    if (idx === 0) {
      row.getCell(1).font = EXCEL_STYLES.tableHeader.font;
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } };
      row.getCell(4).font = EXCEL_STYLES.tableHeader.font;
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } };
    } else if (idx === summaryData.length - 1 || idx === summaryData.length - 2) {
      row.getCell(1).font = EXCEL_STYLES.summaryRow.font;
      row.getCell(1).fill = EXCEL_STYLES.summaryRow.fill;
      row.getCell(4).font = EXCEL_STYLES.summaryRow.font;
      row.getCell(4).fill = EXCEL_STYLES.summaryRow.fill;
    } else {
      row.getCell(1).font = EXCEL_STYLES.tableCell.font;
      row.getCell(4).font = EXCEL_STYLES.tableCell.font;
      if (idx % 2 === 0) {
        row.getCell(1).fill = EXCEL_STYLES.tableCellEven.fill;
        row.getCell(4).fill = EXCEL_STYLES.tableCellEven.fill;
      }
    }
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).border = EXCEL_STYLES.tableCell.border;
    row.getCell(4).border = EXCEL_STYLES.tableCell.border;
    row.height = 22;
    currentRow++;
  });

  currentRow += 2;

  if (data.details?.attendance?.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    const attendanceHeader = worksheet.getRow(currentRow);
    attendanceHeader.getCell(1).value = 'تفاصيل حضور العمال';
    attendanceHeader.getCell(1).font = EXCEL_STYLES.tableHeader.font;
    attendanceHeader.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
    attendanceHeader.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
    attendanceHeader.height = 25;
    currentRow++;

    const headers = ['العامل', 'النوع', 'أيام العمل', 'الأجر المستحق', 'المدفوع', 'المتبقي'];
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, idx) => {
      headerRow.getCell(idx + 1).value = header;
      headerRow.getCell(idx + 1).font = EXCEL_STYLES.tableHeader.font;
      headerRow.getCell(idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } };
      headerRow.getCell(idx + 1).alignment = EXCEL_STYLES.tableHeader.alignment;
      headerRow.getCell(idx + 1).border = EXCEL_STYLES.tableCell.border;
    });
    headerRow.height = 22;
    currentRow++;

    data.details.attendance.forEach((record: any, idx: number) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = record.workerName || '-';
      row.getCell(2).value = record.workerType || '-';
      row.getCell(3).value = parseFloat(record.workDays || 0).toFixed(2);
      row.getCell(4).value = parseFloat(record.actualWage || 0);
      row.getCell(5).value = parseFloat(record.paidAmount || 0);
      row.getCell(6).value = parseFloat(record.remainingAmount || 0);

      for (let i = 1; i <= 6; i++) {
        row.getCell(i).font = EXCEL_STYLES.tableCell.font;
        row.getCell(i).alignment = EXCEL_STYLES.tableCell.alignment;
        row.getCell(i).border = EXCEL_STYLES.tableCell.border;
        if (idx % 2 === 1) {
          row.getCell(i).fill = EXCEL_STYLES.tableCellEven.fill;
        }
      }
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
      row.height = 20;
      currentRow++;
    });
  }

  addProfessionalFooter(worksheet, currentRow, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `تقرير_يومي_${options.date || new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportPeriodicReportToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('التقرير الدوري', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 15 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 }
  ];

  let currentRow = await addProfessionalHeader(worksheet, options, 6);

  const summaryHeaderRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 6);
  summaryHeaderRow.getCell(1).value = 'ملخص الفترة';
  summaryHeaderRow.getCell(1).font = EXCEL_STYLES.tableHeader.font;
  summaryHeaderRow.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
  summaryHeaderRow.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
  summaryHeaderRow.height = 25;
  currentRow++;

  const kpiData = [
    ['أيام نشطة', data.summary?.activeDays || 0],
    ['إجمالي أيام العمل', (data.summary?.totalWorkDays || 0).toFixed(1)],
    ['إجمالي الأجور', formatCurrency(data.summary?.totalPaidWages || 0)],
    ['إجمالي المواد', formatCurrency(data.summary?.totalMaterials || 0)],
    ['إجمالي النقل', formatCurrency(data.summary?.totalTransport || 0)],
    ['إجمالي المصروفات', formatCurrency(data.summary?.totalExpenses || 0)],
    ['تحويلات العهدة', formatCurrency(data.summary?.totalFundTransfers || 0)],
    ['الرصيد النهائي', formatCurrency(data.summary?.balance || 0)]
  ];

  kpiData.forEach((item, idx) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    worksheet.mergeCells(currentRow, 4, currentRow, 6);
    row.getCell(1).value = item[0];
    row.getCell(4).value = item[1];
    
    if (idx >= kpiData.length - 2) {
      row.getCell(1).font = EXCEL_STYLES.summaryRow.font;
      row.getCell(1).fill = EXCEL_STYLES.summaryRow.fill;
      row.getCell(4).font = EXCEL_STYLES.summaryRow.font;
      row.getCell(4).fill = EXCEL_STYLES.summaryRow.fill;
    } else {
      row.getCell(1).font = EXCEL_STYLES.tableCell.font;
      row.getCell(4).font = EXCEL_STYLES.tableCell.font;
      if (idx % 2 === 0) {
        row.getCell(1).fill = EXCEL_STYLES.tableCellEven.fill;
        row.getCell(4).fill = EXCEL_STYLES.tableCellEven.fill;
      }
    }
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).border = EXCEL_STYLES.tableCell.border;
    row.getCell(4).border = EXCEL_STYLES.tableCell.border;
    row.height = 22;
    currentRow++;
  });

  currentRow += 2;

  if (data.chartData?.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    const detailsHeader = worksheet.getRow(currentRow);
    detailsHeader.getCell(1).value = 'تفاصيل المصروفات اليومية';
    detailsHeader.getCell(1).font = EXCEL_STYLES.tableHeader.font;
    detailsHeader.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
    detailsHeader.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
    detailsHeader.height = 25;
    currentRow++;

    const headers = ['التاريخ', 'الأجور', 'المواد', 'النقل', 'الدخل', 'الإجمالي'];
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, idx) => {
      headerRow.getCell(idx + 1).value = header;
      headerRow.getCell(idx + 1).font = EXCEL_STYLES.tableHeader.font;
      headerRow.getCell(idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } };
      headerRow.getCell(idx + 1).alignment = EXCEL_STYLES.tableHeader.alignment;
      headerRow.getCell(idx + 1).border = EXCEL_STYLES.tableCell.border;
    });
    headerRow.height = 22;
    currentRow++;

    data.chartData.forEach((day: any, idx: number) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = day.date;
      row.getCell(2).value = day.wages || 0;
      row.getCell(3).value = day.materials || 0;
      row.getCell(4).value = day.transport || 0;
      row.getCell(5).value = day.income || 0;
      row.getCell(6).value = day.total || 0;

      for (let i = 1; i <= 6; i++) {
        row.getCell(i).font = EXCEL_STYLES.tableCell.font;
        row.getCell(i).alignment = EXCEL_STYLES.tableCell.alignment;
        row.getCell(i).border = EXCEL_STYLES.tableCell.border;
        if (idx % 2 === 1) {
          row.getCell(i).fill = EXCEL_STYLES.tableCellEven.fill;
        }
        if (i > 1) {
          row.getCell(i).numFmt = '#,##0.00';
        }
      }
      row.height = 20;
      currentRow++;
    });
  }

  addProfessionalFooter(worksheet, currentRow, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `تقرير_فترة_${options.dateRange?.from}_${options.dateRange?.to}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportWorkerStatementToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('بيان العامل', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 15 },
    { width: 20 },
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 25 }
  ];

  let currentRow = await addProfessionalHeader(worksheet, {
    ...options,
    reportTitle: `بيان حساب العامل: ${data.worker?.name || ''}`
  }, 6);

  worksheet.mergeCells(currentRow, 1, currentRow, 6);
  const workerInfoHeader = worksheet.getRow(currentRow);
  workerInfoHeader.getCell(1).value = 'معلومات العامل';
  workerInfoHeader.getCell(1).font = EXCEL_STYLES.tableHeader.font;
  workerInfoHeader.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
  workerInfoHeader.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
  workerInfoHeader.height = 25;
  currentRow++;

  const workerInfo = [
    ['اسم العامل', data.worker?.name || '-'],
    ['نوع العامل', data.worker?.type || '-'],
    ['الأجر اليومي', formatCurrency(data.worker?.dailyWage || 0)]
  ];

  workerInfo.forEach((item) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    worksheet.mergeCells(currentRow, 4, currentRow, 6);
    row.getCell(1).value = item[0];
    row.getCell(4).value = item[1];
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(4).font = { size: 10 };
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).border = EXCEL_STYLES.tableCell.border;
    row.getCell(4).border = EXCEL_STYLES.tableCell.border;
    row.height = 22;
    currentRow++;
  });

  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 6);
  const summaryHeader = worksheet.getRow(currentRow);
  summaryHeader.getCell(1).value = 'ملخص الحساب';
  summaryHeader.getCell(1).font = EXCEL_STYLES.tableHeader.font;
  summaryHeader.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
  summaryHeader.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
  summaryHeader.height = 25;
  currentRow++;

  const summaryData = [
    ['إجمالي أيام العمل', (data.summary?.totalWorkDays || 0).toFixed(1) + ' يوم'],
    ['إجمالي المستحق', formatCurrency(data.summary?.totalEarned || 0)],
    ['إجمالي المدفوع', formatCurrency(data.summary?.totalPaid || 0)],
    ['الحوالات', formatCurrency(data.summary?.totalTransfers || 0)],
    ['الرصيد المتبقي', formatCurrency(data.summary?.remainingBalance || 0)]
  ];

  summaryData.forEach((item, idx) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    worksheet.mergeCells(currentRow, 4, currentRow, 6);
    row.getCell(1).value = item[0];
    row.getCell(4).value = item[1];
    
    if (idx === summaryData.length - 1) {
      row.getCell(1).font = EXCEL_STYLES.summaryRow.font;
      row.getCell(1).fill = EXCEL_STYLES.summaryRow.fill;
      row.getCell(4).font = EXCEL_STYLES.summaryRow.font;
      row.getCell(4).fill = EXCEL_STYLES.summaryRow.fill;
    } else {
      row.getCell(1).font = EXCEL_STYLES.tableCell.font;
      row.getCell(4).font = EXCEL_STYLES.tableCell.font;
    }
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).border = EXCEL_STYLES.tableCell.border;
    row.getCell(4).border = EXCEL_STYLES.tableCell.border;
    row.height = 22;
    currentRow++;
  });

  currentRow += 2;

  if (data.attendance?.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    const detailsHeader = worksheet.getRow(currentRow);
    detailsHeader.getCell(1).value = 'سجل العمل التفصيلي';
    detailsHeader.getCell(1).font = EXCEL_STYLES.tableHeader.font;
    detailsHeader.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
    detailsHeader.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
    detailsHeader.height = 25;
    currentRow++;

    const headers = ['التاريخ', 'المشروع', 'أيام العمل', 'الأجر', 'المدفوع', 'الوصف'];
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, idx) => {
      headerRow.getCell(idx + 1).value = header;
      headerRow.getCell(idx + 1).font = EXCEL_STYLES.tableHeader.font;
      headerRow.getCell(idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } };
      headerRow.getCell(idx + 1).alignment = EXCEL_STYLES.tableHeader.alignment;
      headerRow.getCell(idx + 1).border = EXCEL_STYLES.tableCell.border;
    });
    headerRow.height = 22;
    currentRow++;

    data.attendance.forEach((record: any, idx: number) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = record.date;
      row.getCell(2).value = record.projectName || '-';
      row.getCell(3).value = parseFloat(record.workDays || 0).toFixed(2);
      row.getCell(4).value = parseFloat(record.actualWage || 0);
      row.getCell(5).value = parseFloat(record.paidAmount || 0);
      row.getCell(6).value = record.workDescription || '-';

      for (let i = 1; i <= 6; i++) {
        row.getCell(i).font = EXCEL_STYLES.tableCell.font;
        row.getCell(i).alignment = EXCEL_STYLES.tableCell.alignment;
        row.getCell(i).border = EXCEL_STYLES.tableCell.border;
        if (idx % 2 === 1) {
          row.getCell(i).fill = EXCEL_STYLES.tableCellEven.fill;
        }
      }
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
      row.height = 20;
      currentRow++;
    });
  }

  addProfessionalFooter(worksheet, currentRow, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `بيان_العامل_${data.worker?.name || 'تقرير'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportComparisonReportToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('مقارنة المشاريع', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 25 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 15 },
    { width: 15 }
  ];

  let currentRow = await addProfessionalHeader(worksheet, options, 6);

  worksheet.mergeCells(currentRow, 1, currentRow, 6);
  const tableHeader = worksheet.getRow(currentRow);
  tableHeader.getCell(1).value = 'مقارنة الأداء المالي للمشاريع';
  tableHeader.getCell(1).font = EXCEL_STYLES.tableHeader.font;
  tableHeader.getCell(1).fill = EXCEL_STYLES.tableHeader.fill;
  tableHeader.getCell(1).alignment = EXCEL_STYLES.tableHeader.alignment;
  tableHeader.height = 25;
  currentRow++;

  const headers = ['المشروع', 'الدخل', 'المصروفات', 'الرصيد', 'العمال', 'أيام العمل'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    headerRow.getCell(idx + 1).value = header;
    headerRow.getCell(idx + 1).font = EXCEL_STYLES.tableHeader.font;
    headerRow.getCell(idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } };
    headerRow.getCell(idx + 1).alignment = EXCEL_STYLES.tableHeader.alignment;
    headerRow.getCell(idx + 1).border = EXCEL_STYLES.tableCell.border;
  });
  headerRow.height = 22;
  currentRow++;

  if (data.projects?.length > 0) {
    data.projects.forEach((item: any, idx: number) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = item.project?.name || '-';
      row.getCell(2).value = item.metrics?.income || 0;
      row.getCell(3).value = item.metrics?.expenses || 0;
      row.getCell(4).value = item.metrics?.balance || 0;
      row.getCell(5).value = item.metrics?.workers || 0;
      row.getCell(6).value = (item.metrics?.workDays || 0).toFixed(1);

      for (let i = 1; i <= 6; i++) {
        row.getCell(i).font = EXCEL_STYLES.tableCell.font;
        row.getCell(i).alignment = EXCEL_STYLES.tableCell.alignment;
        row.getCell(i).border = EXCEL_STYLES.tableCell.border;
        if (idx % 2 === 1) {
          row.getCell(i).fill = EXCEL_STYLES.tableCellEven.fill;
        }
      }
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(4).font = {
        ...EXCEL_STYLES.tableCell.font,
        color: { argb: (item.metrics?.balance || 0) >= 0 ? 'FF059669' : 'FFDC2626' }
      };
      row.height = 22;
      currentRow++;
    });
  }

  currentRow++;
  const totalsRow = worksheet.getRow(currentRow);
  totalsRow.getCell(1).value = 'الإجمالي';
  totalsRow.getCell(2).value = data.totals?.totalIncome || 0;
  totalsRow.getCell(3).value = data.totals?.totalExpenses || 0;
  totalsRow.getCell(4).value = data.totals?.totalBalance || 0;

  for (let i = 1; i <= 6; i++) {
    totalsRow.getCell(i).font = EXCEL_STYLES.summaryRow.font;
    totalsRow.getCell(i).fill = EXCEL_STYLES.summaryRow.fill;
    totalsRow.getCell(i).alignment = EXCEL_STYLES.summaryRow.alignment;
    totalsRow.getCell(i).border = EXCEL_STYLES.summaryRow.border;
  }
  totalsRow.getCell(2).numFmt = '#,##0.00';
  totalsRow.getCell(3).numFmt = '#,##0.00';
  totalsRow.getCell(4).numFmt = '#,##0.00';
  totalsRow.height = 25;

  addProfessionalFooter(worksheet, currentRow + 1, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `مقارنة_المشاريع_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}
