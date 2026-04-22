/**
 * نظام التصدير الاحترافي - شركة الفتيني للمقاولات والاستشارات الهندسية
 * Professional Export System - Al-Fatihi Contracting & Engineering Consultancy
 * يدعم Excel مع ترويسة وتذييل احترافي مطابق لتصاميم Excel المرفقة
 */

import { formatCurrency } from '@/lib/utils';
import { downloadExcelFile } from '@/utils/webview-download';
import { getBranding, hexNoHash, ensureBrandingLoaded } from '@/lib/report-branding';

/**
 * 🖼️ يضيف شعار الشركة إلى ورقة Excel من data URL.
 * يُتجاهل بصمت إذا لا يوجد شعار أو فشل التحويل.
 */
export function addLogoToWorksheet(
  workbook: any,
  worksheet: any,
  range: { tl: { col: number; row: number }; br: { col: number; row: number } }
): void {
  const logoUrl = getBranding().logoUrl;
  if (!logoUrl) return;
  try {
    const m = /^data:image\/(png|jpeg|jpg|gif);base64,/i.exec(logoUrl);
    if (!m) return;
    const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
    const imageId = workbook.addImage({ base64: logoUrl, extension: ext });
    worksheet.addImage(imageId, range);
  } catch (e) {
    console.warn('[axion-export] addLogoToWorksheet failed:', (e as Error)?.message);
  }
}

// 🏢 معلومات الشركة — تُقرأ ديناميكياً من إعدادات المستخدم الحالي
// (Proxy: كل قراءة تجلب أحدث قيمة من cache report-branding)
export const COMPANY_INFO = new Proxy({} as {
  name: string; subtitle: string; address: string; phone: string; email: string; website: string;
}, {
  get(_t, key: string) {
    const b = getBranding();
    switch (key) {
      case 'name': return b.companyName;
      case 'subtitle': return b.companyNameEn;
      case 'address': return b.address;
      case 'phone': return b.phone;
      case 'email': return b.email;
      case 'website': return b.website;
      default: return undefined;
    }
  }
});

// 🎨 الهوية البصرية — Proxy على إعدادات المستخدم
// headerBlue/headerDarkBlue/accentBlue تتغيّر حسب primary/secondary/accent المستخدم.
// باقي الألوان (success/error/warn/zebra) ثابتة دلالياً.
const _SEMANTIC_COLORS = {
  lightBlue: 'EFF6FF',
  altRowBlue: 'F8FAFC',
  greenLight: 'ECFDF5',
  orangeLight: 'FEF3C7',
  white: 'FFFFFF',
  black: '0F172A',
  gray: '64748B',
  incomeGreen: '10B981',
  expenseRed: 'F43F5E',
  deferredOrange: 'F59E0B',
};

export const ALFATIHI_COLORS = new Proxy({} as Record<string, string>, {
  get(_t, key: string) {
    const b = getBranding();
    switch (key) {
      case 'headerBlue': return hexNoHash(b.primaryColor);
      case 'headerDarkBlue': return hexNoHash(b.secondaryColor);
      case 'accentBlue': return hexNoHash(b.accentColor);
      case 'greenTotal': return hexNoHash(b.secondaryColor);
      default: return (_SEMANTIC_COLORS as any)[key];
    }
  },
  ownKeys() {
    return ['headerBlue','headerDarkBlue','accentBlue','greenTotal', ...Object.keys(_SEMANTIC_COLORS)];
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});

// 🎨 EXCEL_STYLES — Proxy ديناميكي: كل property تُبنى عند الطلب
// لتعكس أحدث ألوان المستخدم (تجنّب تجميد القيم وقت import).
const _buildExcelStyles = () => ({
  fonts: {
    header: { bold: true, size: 11, color: { argb: 'FF' + ALFATIHI_COLORS.white } },
    data: { size: 10 },
    bold: { bold: true, size: 10 }
  },
  colors: {
    headerBg: 'FF' + ALFATIHI_COLORS.headerBlue,
    altRow: 'FF' + ALFATIHI_COLORS.lightBlue,
    green: 'FF' + ALFATIHI_COLORS.greenTotal,
    navy: 'FF' + ALFATIHI_COLORS.headerDarkBlue,
    orange: 'FF' + ALFATIHI_COLORS.orangeLight
  },
  borders: {
    thin: { style: 'thin' as const },
    medium: { style: 'medium' as const }
  },
  headerMain: {
    font: { bold: true, size: 12, color: { argb: 'FF' + ALFATIHI_COLORS.white } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.headerDarkBlue } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  headerSecondary: {
    font: { bold: true, size: 11, color: { argb: 'FF' + ALFATIHI_COLORS.white } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.headerBlue } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  tableHeader: {
    font: { bold: true, size: 10, color: { argb: 'FF' + ALFATIHI_COLORS.white } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.headerBlue } },
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
  tableCellAlt: {
    font: { size: 10 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.lightBlue } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  greenRow: {
    font: { bold: true, size: 10, color: { argb: 'FF' + ALFATIHI_COLORS.white } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.greenTotal } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  greenLightRow: {
    font: { size: 10 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.greenLight } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  yellowRow: {
    font: { bold: true, size: 10, color: { argb: 'FF' + ALFATIHI_COLORS.white } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.headerDarkBlue } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  orangeRow: {
    font: { size: 10 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.orangeLight } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  summaryRow: {
    font: { bold: true, size: 10, color: { argb: 'FF' + ALFATIHI_COLORS.white } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + ALFATIHI_COLORS.headerBlue } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  signatureBox: {
    font: { size: 10, bold: true },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  },
  footer: {
    font: { size: 9, italic: true, color: { argb: 'FF' + ALFATIHI_COLORS.gray } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
  }
});

export const EXCEL_STYLES = new Proxy({} as ReturnType<typeof _buildExcelStyles>, {
  get(_t, key: string) {
    return (_buildExcelStyles() as any)[key];
  },
});

export interface ExportOptions {
  projectName?: string;
  reportTitle: string;
  reportType: 'daily' | 'periodic' | 'project-summary' | 'worker-statement' | 'worker-settlement' | 'comparison' | 'daily-expenses';
  dateRange?: { from: string; to: string };
  date?: string;
  includeCharts?: boolean;
  includeDetails?: boolean;
}

function applyStyle(cell: any, style: any) {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
}

function applyRowStyle(row: any, style: any, startCol: number, endCol: number) {
  for (let i = startCol; i <= endCol; i++) {
    applyStyle(row.getCell(i), style);
  }
}

async function addAlFatihiHeader(
  worksheet: any,
  title: string,
  subtitle: string,
  columnCount: number
): Promise<number> {
  let currentRow = 1;

  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const companyRow = worksheet.getRow(currentRow);
  companyRow.getCell(1).value = COMPANY_INFO.name;
  applyStyle(companyRow.getCell(1), EXCEL_STYLES.headerMain);
  companyRow.height = 20;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const titleRow = worksheet.getRow(currentRow);
  titleRow.getCell(1).value = title;
  applyStyle(titleRow.getCell(1), EXCEL_STYLES.headerSecondary);
  titleRow.height = 20;
  currentRow++;

  if (subtitle) {
    worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
    const subtitleRow = worksheet.getRow(currentRow);
    subtitleRow.getCell(1).value = subtitle;
    applyStyle(subtitleRow.getCell(1), {
      font: { size: 9 },
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    subtitleRow.height = 18;
    currentRow++;
  }

  return currentRow;
}

function addSignatureSection(
  worksheet: any,
  startRow: number,
  signatures: Array<{ title: string; name?: string }>,
  columnCount: number
): number {
  let currentRow = startRow + 1;
  
  const colsPerSig = Math.floor(columnCount / signatures.length);
  
  const sigRow = worksheet.getRow(currentRow);
  sigRow.height = 40;
  
  signatures.forEach((sig, idx) => {
    const startCol = idx * colsPerSig + 1;
    const endCol = idx === signatures.length - 1 ? columnCount : startCol + colsPerSig - 1;
    
    worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
    const cell = sigRow.getCell(startCol);
    cell.value = `${sig.title}\n.................................\nالتاريخ:`;
    applyStyle(cell, EXCEL_STYLES.signatureBox);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  
  currentRow++;
  return currentRow;
}

function addReportFooter(
  worksheet: any,
  startRow: number,
  columnCount: number
): void {
  const currentRow = startRow + 1;
  
  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const footerRow = worksheet.getRow(currentRow);
  const now = new Date();
  footerRow.getCell(1).value = `تم إنشاء هذا التقرير آلياً بواسطة نظام إدارة مشاريع البناء - التاريخ والوقت: ${now.toLocaleDateString('en-GB')} - ${now.toLocaleTimeString('en-GB')}`;
  applyStyle(footerRow.getCell(1), EXCEL_STYLES.footer);
}

export function addReportHeader(
  worksheet: any,
  title: string,
  subtitle: string,
  infoLines?: string[]
): number {
  let currentRow = 1;
  
  const columnCount = worksheet.columns?.length || 8;

  // 🖼️ صف الشعار + اسم الشركة (الشعار في يمين RTL = العمود A)
  if (getBranding().logoUrl) {
    worksheet.mergeCells(currentRow, 1, currentRow, 2);
    worksheet.mergeCells(currentRow, 3, currentRow, columnCount);
    const logoFill = worksheet.getRow(currentRow).getCell(1);
    applyStyle(logoFill, EXCEL_STYLES.headerMain);
    addLogoToWorksheet(worksheet.workbook, worksheet, {
      tl: { col: 0.15, row: currentRow - 1 + 0.1 },
      br: { col: 1.85, row: currentRow - 1 + 0.95 },
    });
    const companyCell = worksheet.getRow(currentRow).getCell(3);
    companyCell.value = COMPANY_INFO.name;
    applyStyle(companyCell, EXCEL_STYLES.headerMain);
    worksheet.getRow(currentRow).height = 60;
  } else {
    worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
    const companyRow = worksheet.getRow(currentRow);
    companyRow.getCell(1).value = COMPANY_INFO.name;
    applyStyle(companyRow.getCell(1), EXCEL_STYLES.headerMain);
    companyRow.height = 20;
  }
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
  const titleRow = worksheet.getRow(currentRow);
  titleRow.getCell(1).value = title;
  applyStyle(titleRow.getCell(1), EXCEL_STYLES.headerSecondary);
  titleRow.height = 20;
  currentRow++;

  if (subtitle) {
    worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
    const subtitleRow = worksheet.getRow(currentRow);
    subtitleRow.getCell(1).value = subtitle;
    applyStyle(subtitleRow.getCell(1), {
      font: { size: 9 },
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    subtitleRow.height = 18;
    currentRow++;
  }

  if (infoLines && infoLines.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, columnCount);
    const infoRow = worksheet.getRow(currentRow);
    infoRow.getCell(1).value = infoLines.join(' | ');
    applyStyle(infoRow.getCell(1), {
      font: { size: 9 },
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    infoRow.height = 16;
    currentRow++;
  }

  currentRow++;
  return currentRow;
}

export interface ProfessionalReportColumn {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
}

export interface ProfessionalReportTotals {
  label: string;
  values: Record<string, number | string>;
}

export interface ProfessionalReportOptions {
  sheetName: string;
  reportTitle: string;
  subtitle?: string;
  infoLines?: string[];
  columns: ProfessionalReportColumn[];
  data: Record<string, any>[];
  totals?: ProfessionalReportTotals;
  signatures?: Array<{ title: string }>;
  fileName: string;
  orientation?: 'landscape' | 'portrait';
  cellStyleFn?: (record: Record<string, any>, colKey: string, colIdx: number) => { fontColor?: string; bold?: boolean } | null;
  summaryRows?: Array<{ label: string; value: string; valueColor?: string }>;
}

export async function createProfessionalReport(options: ProfessionalReportOptions): Promise<boolean> {
  await ensureBrandingLoaded();
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.company = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(options.sheetName, {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: options.orientation || 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      horizontalCentered: true
    }
  });

  const colCount = options.columns.length;
  options.columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });

  let currentRow = await addAlFatihiHeader(
    worksheet,
    options.reportTitle,
    options.subtitle || '',
    colCount
  );

  if (options.infoLines && options.infoLines.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, colCount);
    const infoRow = worksheet.getRow(currentRow);
    infoRow.getCell(1).value = options.infoLines.join(' | ');
    applyStyle(infoRow.getCell(1), {
      font: { size: 9 },
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    infoRow.height = 18;
    currentRow++;
  }

  if (options.summaryRows && options.summaryRows.length > 0) {
    const halfCol = Math.ceil(colCount / 2);
    options.summaryRows.forEach(sr => {
      worksheet.mergeCells(currentRow, 1, currentRow, halfCol);
      const labelCell = worksheet.getRow(currentRow).getCell(1);
      labelCell.value = sr.label;
      labelCell.font = { bold: true, size: 11 };
      labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

      worksheet.mergeCells(currentRow, halfCol + 1, currentRow, colCount);
      const valueCell = worksheet.getRow(currentRow).getCell(halfCol + 1);
      valueCell.value = sr.value;
      valueCell.font = { bold: true, size: 11, color: sr.valueColor ? { argb: sr.valueColor } : undefined };
      valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
      worksheet.getRow(currentRow).height = 22;
      currentRow++;
    });
  }

  currentRow++;

  const headerRow = worksheet.getRow(currentRow);
  options.columns.forEach((col, idx) => {
    headerRow.getCell(idx + 1).value = col.header;
    applyStyle(headerRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 22;
  currentRow++;

  options.data.forEach((record, idx) => {
    const row = worksheet.getRow(currentRow);
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;

    options.columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = record[col.key] ?? '';
      applyStyle(cell, style);
      if (col.numFmt && typeof record[col.key] === 'number') {
        cell.numFmt = col.numFmt;
      }
      if (options.cellStyleFn) {
        const customStyle = options.cellStyleFn(record, col.key, colIdx);
        if (customStyle) {
          cell.font = {
            ...cell.font,
            ...(customStyle.fontColor ? { color: { argb: customStyle.fontColor } } : {}),
            ...(customStyle.bold !== undefined ? { bold: customStyle.bold } : {})
          };
        }
      }
    });
    row.height = 20;
    currentRow++;
  });

  if (options.totals) {
    const totalsRow = worksheet.getRow(currentRow);
    const totalKeys = Object.keys(options.totals.values);
    const firstTotalColIdx = options.columns.findIndex(c => totalKeys.includes(c.key));
    const labelEndCol = firstTotalColIdx > 0 ? firstTotalColIdx : Math.floor(colCount / 2);

    if (labelEndCol > 1) {
      worksheet.mergeCells(currentRow, 1, currentRow, labelEndCol);
    }
    totalsRow.getCell(1).value = options.totals.label;

    options.columns.forEach((col, colIdx) => {
      if (options.totals!.values[col.key] !== undefined) {
        const cell = totalsRow.getCell(colIdx + 1);
        cell.value = options.totals!.values[col.key];
        if (col.numFmt && typeof options.totals!.values[col.key] === 'number') {
          cell.numFmt = col.numFmt;
        }
      }
    });

    applyRowStyle(totalsRow, EXCEL_STYLES.greenRow, 1, colCount);
    totalsRow.height = 22;
    currentRow++;
  }

  currentRow++;

  const sigs = options.signatures || [
    { title: 'توقيع المهندس' },
    { title: 'توقيع مدير المشروع' },
    { title: 'توقيع المدير العام' }
  ];
  currentRow = addSignatureSection(worksheet, currentRow, sigs, colCount);
  addReportFooter(worksheet, currentRow, colCount);

  const buffer = await workbook.xlsx.writeBuffer();
  return await downloadExcelFile(buffer as ArrayBuffer, options.fileName);
}

export async function exportDailyExpensesReport(
  data: {
    projectName: string;
    date: string;
    carriedForward?: { amount: number; fromDate: string; fromProject?: string };
    expenses: Array<{
      amount: number;
      accountType: string;
      type: string;
      remaining: number;
      notes: string;
    }>;
    finalRemaining: number;
    materials?: Array<{
      project: string;
      supplier: string;
      amount: number;
      paymentType: string;
      notes: string;
    }>;
  }
): Promise<void> {
  await ensureBrandingLoaded();
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('كشف المصروفات', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 15 },
    { width: 20 },
    { width: 12 },
    { width: 15 },
    { width: 35 }
  ];

  const dayName = new Date(data.date).toLocaleDateString('en-GB', { weekday: 'long' });
  let currentRow = await addAlFatihiHeader(
    worksheet,
    `كشف مصروفات مشروع ${data.projectName} يوم ${dayName} تاريخ ${new Date(data.date).toLocaleDateString('en-GB')}`,
    '',
    5
  );

  currentRow++;

  const headers = ['المبلغ', 'نوع الحساب', 'نوع', 'المتبقي', 'ملاحظات'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    headerRow.getCell(idx + 1).value = header;
    applyStyle(headerRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 20;
  currentRow++;

  if (data.carriedForward) {
    const cfRow = worksheet.getRow(currentRow);
    const cfNote = data.carriedForward.fromProject 
      ? `مرحل من مشروع: ${data.carriedForward.fromProject} بتاريخ ${data.carriedForward.fromDate}`
      : `مرحل من تاريخ ${data.carriedForward.fromDate}`;
    
    cfRow.getCell(1).value = data.carriedForward.amount;
    cfRow.getCell(2).value = data.carriedForward.fromProject ? 'مرحل من مشروع آخر' : 'مرحلة';
    cfRow.getCell(3).value = 'ترحيل';
    cfRow.getCell(4).value = data.carriedForward.amount;
    cfRow.getCell(5).value = cfNote;
    
    applyRowStyle(cfRow, EXCEL_STYLES.greenLightRow, 1, 5);
    cfRow.getCell(1).numFmt = '#,##0.00';
    cfRow.getCell(4).numFmt = '#,##0.00';
    cfRow.height = 18;
    currentRow++;
  }

  data.expenses.forEach((expense, idx) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = expense.amount;
    row.getCell(2).value = expense.accountType;
    row.getCell(3).value = expense.type;
    row.getCell(4).value = expense.remaining;
    row.getCell(5).value = expense.notes;
    
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    applyRowStyle(row, style, 1, 5);
    row.getCell(1).numFmt = '#,##0.00';
    row.getCell(4).numFmt = '#,##0.00';
    row.height = 18;
    currentRow++;
  });

  const totalRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 3);
  totalRow.getCell(1).value = 'المبلغ المتبقي النهائي';
  totalRow.getCell(4).value = data.finalRemaining;
  totalRow.getCell(5).value = '';
  applyRowStyle(totalRow, EXCEL_STYLES.yellowRow, 1, 5);
  totalRow.getCell(4).numFmt = '#,##0.00';
  totalRow.height = 20;
  currentRow++;

  if (data.materials && data.materials.length > 0) {
    currentRow += 2;
    
    const matHeaders = ['المشروع', 'محل التوريد', 'المبلغ', 'نوع الدفع', 'الملاحظات'];
    const matHeaderRow = worksheet.getRow(currentRow);
    matHeaders.forEach((header, idx) => {
      matHeaderRow.getCell(idx + 1).value = header;
      applyStyle(matHeaderRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
    });
    matHeaderRow.height = 20;
    currentRow++;

    data.materials.forEach((mat, idx) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = mat.project;
      row.getCell(2).value = mat.supplier;
      row.getCell(3).value = mat.amount;
      row.getCell(4).value = mat.paymentType;
      row.getCell(5).value = mat.notes;
      
      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.orangeRow;
      applyRowStyle(row, style, 1, 5);
      row.getCell(3).numFmt = '#,##0.00';
      row.height = 22;
      currentRow++;
    });
  }

  addReportFooter(worksheet, currentRow, 5);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelFile(buffer as ArrayBuffer, `كشف_مصروفات_${data.projectName}_${data.date}.xlsx`);
}

export async function exportWorkerSettlementReport(
  data: {
    dateRange: { from: string; to: string };
    workersCount: number;
    projectsCount: number;
    totalWorkDays: number;
    recordsCount: number;
    workers: Array<{
      index: number;
      name: string;
      profession: string;
      projectName: string;
      dailyWage: number;
      workDays: number;
      totalHours: number;
      amountDue: number;
      amountReceived: number;
      remaining: number;
      notes: string;
    }>;
    summary: {
      totalDue: number;
      totalTransferred: number;
      totalRemaining: number;
    };
  }
): Promise<void> {
  await ensureBrandingLoaded();
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('كشف تصفية العمال', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 5 },
    { width: 18 },
    { width: 12 },
    { width: 18 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 25 }
  ];

  let currentRow = await addAlFatihiHeader(
    worksheet,
    'كشف تصفية للعمال',
    `للفترة: من ${new Date(data.dateRange.from).toLocaleDateString('en-GB')} إلى ${new Date(data.dateRange.to).toLocaleDateString('en-GB')}`,
    11
  );

  const infoRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
  infoRow.getCell(1).value = `عدد العمال: ${data.workersCount} | إجمالي أيام العمل: ${data.totalWorkDays} | عدد المشاريع: ${data.projectsCount} | عدد السجلات: ${data.recordsCount}`;
  applyStyle(infoRow.getCell(1), {
    font: { size: 10 },
    alignment: { horizontal: 'center', vertical: 'middle' }
  });
  infoRow.height = 22;
  currentRow++;

  currentRow++;

  const sectionHeader = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
  sectionHeader.getCell(1).value = 'كشف التصفية للعمال';
  applyStyle(sectionHeader.getCell(1), EXCEL_STYLES.headerSecondary);
  sectionHeader.height = 20;
  currentRow++;

  const headers = ['م', 'الاسم', 'المهنة', 'اسم المشروع', 'الأجر اليومي', 'أيام العمل', 'إجمالي الساعات', 'المبلغ المستحق', 'المبلغ المستلم', 'المتبقي', 'ملاحظات'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    headerRow.getCell(idx + 1).value = header;
    applyStyle(headerRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 22;
  currentRow++;

  data.workers.forEach((worker, idx) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = worker.index;
    row.getCell(2).value = worker.name;
    row.getCell(3).value = worker.profession;
    row.getCell(4).value = worker.projectName;
    row.getCell(5).value = worker.dailyWage;
    row.getCell(6).value = worker.workDays;
    row.getCell(7).value = worker.totalHours;
    row.getCell(8).value = worker.amountDue;
    row.getCell(9).value = worker.amountReceived;
    row.getCell(10).value = worker.remaining;
    row.getCell(11).value = worker.notes;
    
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    applyRowStyle(row, style, 1, 11);
    
    row.getCell(5).numFmt = '#,##0.00" ر.ي."';
    row.getCell(8).numFmt = '#,##0.00" ر.ي."';
    row.getCell(9).numFmt = '#,##0.00" ر.ي."';
    row.getCell(10).numFmt = '#,##0.00" ر.ي."';
    row.height = 20;
    currentRow++;
  });

  const totalsRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  totalsRow.getCell(1).value = 'الإجماليات';
  totalsRow.getCell(5).value = '';
  totalsRow.getCell(6).value = data.totalWorkDays;
  totalsRow.getCell(7).value = '';
  totalsRow.getCell(8).value = data.summary.totalDue;
  totalsRow.getCell(9).value = data.summary.totalTransferred;
  totalsRow.getCell(10).value = data.summary.totalRemaining;
  totalsRow.getCell(11).value = '';
  applyRowStyle(totalsRow, EXCEL_STYLES.greenRow, 1, 11);
  totalsRow.getCell(8).numFmt = '#,##0.00" ر.ي."';
  totalsRow.getCell(9).numFmt = '#,##0.00" ر.ي."';
  totalsRow.getCell(10).numFmt = '#,##0.00" ر.ي."';
  totalsRow.height = 22;
  currentRow++;

  currentRow += 2;

  const summaryHeader = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
  summaryHeader.getCell(1).value = 'الملخص النهائي';
  applyStyle(summaryHeader.getCell(1), EXCEL_STYLES.headerSecondary);
  summaryHeader.height = 20;
  currentRow++;

  const summaryRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 3);
  worksheet.mergeCells(currentRow, 4, currentRow, 6);
  worksheet.mergeCells(currentRow, 7, currentRow, 9);
  worksheet.mergeCells(currentRow, 10, currentRow, 11);
  
  summaryRow.getCell(1).value = `إجمالي المبلغ المستحق: ر.ي. ${data.summary.totalDue.toLocaleString()}`;
  summaryRow.getCell(4).value = `إجمالي المبلغ المستلم: ر.ي. ${data.summary.totalTransferred.toLocaleString()}`;
  summaryRow.getCell(7).value = `إجمالي المبلغ المحول: ر.ي. ${(data.summary.totalTransferred || 0).toLocaleString()}`;
  summaryRow.getCell(10).value = `إجمالي المبالغ المتبقية: ر.ي. ${data.summary.totalRemaining.toLocaleString()}`;
  
  applyRowStyle(summaryRow, {
    font: { size: 10, bold: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: EXCEL_STYLES.tableCell.border
  }, 1, 11);
  summaryRow.height = 22;
  currentRow++;

  currentRow = addSignatureSection(worksheet, currentRow, [
    { title: 'توقيع المهندس' },
    { title: 'توقيع مدير المشروع' },
    { title: 'توقيع المدير العام' }
  ], 11);

  addReportFooter(worksheet, currentRow, 11);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelFile(buffer as ArrayBuffer, `كشف_تصفية_العمال_${data.dateRange.from}_${data.dateRange.to}.xlsx`);
}

export async function exportDetailedWorkerStatement(
  data: {
    workerName: string;
    profession: string;
    totalWorkDays: number;
    projectsCount: number;
    dateRange: { from: string; to: string };
    records: Array<{
      date: string;
      day: string;
      projectName: string;
      dailyWage: number;
      workDays: number;
      workHours: number;
      amountDue: number;
      amountReceived: number;
      remaining: number;
      notes: string;
    }>;
    summary: {
      totalWorkDays: number;
      totalHours: number;
      totalDue: number;
      totalReceived: number;
      totalTransferred: number;
      totalRemaining: number;
    };
  }
): Promise<void> {
  await ensureBrandingLoaded();
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('كشف حساب تفصيلي', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 5 },
    { width: 14 },
    { width: 12 },
    { width: 18 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 30 }
  ];

  let currentRow = await addAlFatihiHeader(
    worksheet,
    'كشف حساب تفصيلي للعامل',
    `للفترة: من ${new Date(data.dateRange.from).toLocaleDateString('en-GB')} إلى ${new Date(data.dateRange.to).toLocaleDateString('en-GB')}`,
    11
  );

  const infoRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
  infoRow.getCell(1).value = `اسم العامل: ${data.workerName} | المهنة: ${data.profession} | إجمالي أيام العمل: ${data.totalWorkDays} | عدد المشاريع: ${data.projectsCount}`;
  applyStyle(infoRow.getCell(1), {
    font: { size: 10, bold: true },
    alignment: { horizontal: 'right', vertical: 'middle' }
  });
  infoRow.height = 22;
  currentRow++;

  currentRow++;

  const sectionHeader = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
  sectionHeader.getCell(1).value = 'كشف حساب تفصيلي للعامل';
  applyStyle(sectionHeader.getCell(1), EXCEL_STYLES.headerSecondary);
  sectionHeader.height = 20;
  currentRow++;

  const headers = ['م', 'التاريخ', 'اليوم', 'اسم المشروع', 'الأجر اليومي', 'أيام العمل', 'عدد الساعات', 'المبلغ المستحق', 'المبلغ المستلم', 'المتبقي', 'ملاحظات'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    headerRow.getCell(idx + 1).value = header;
    applyStyle(headerRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 22;
  currentRow++;

  data.records.forEach((record, idx) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = record.date;
    row.getCell(3).value = record.day;
    row.getCell(4).value = record.projectName;
    row.getCell(5).value = record.dailyWage;
    row.getCell(6).value = record.workDays;
    row.getCell(7).value = record.workHours;
    row.getCell(8).value = record.amountDue;
    row.getCell(9).value = record.amountReceived;
    row.getCell(10).value = record.remaining;
    row.getCell(11).value = record.notes;
    
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    applyRowStyle(row, style, 1, 11);
    
    row.getCell(5).numFmt = '#,##0.00" ر.ي."';
    row.getCell(8).numFmt = '#,##0.00" ر.ي."';
    row.getCell(9).numFmt = '#,##0.00" ر.ي."';
    row.getCell(10).numFmt = '#,##0.00" ر.ي."';
    row.height = 20;
    currentRow++;
  });

  const totalsRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  totalsRow.getCell(1).value = 'الإجماليات';
  totalsRow.getCell(5).value = '';
  totalsRow.getCell(6).value = data.summary.totalWorkDays;
  totalsRow.getCell(7).value = data.summary.totalHours;
  totalsRow.getCell(8).value = data.summary.totalDue;
  totalsRow.getCell(9).value = data.summary.totalReceived;
  totalsRow.getCell(10).value = data.summary.totalRemaining;
  totalsRow.getCell(11).value = '';
  applyRowStyle(totalsRow, EXCEL_STYLES.greenRow, 1, 11);
  totalsRow.getCell(8).numFmt = '#,##0.00" ر.ي."';
  totalsRow.getCell(9).numFmt = '#,##0.00" ر.ي."';
  totalsRow.getCell(10).numFmt = '#,##0.00" ر.ي."';
  totalsRow.height = 22;
  currentRow++;

  currentRow += 2;

  const summaryHeader = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
  summaryHeader.getCell(1).value = 'الملخص النهائي';
  applyStyle(summaryHeader.getCell(1), EXCEL_STYLES.headerSecondary);
  summaryHeader.height = 20;
  currentRow++;

  const summaryRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 3);
  worksheet.mergeCells(currentRow, 4, currentRow, 6);
  worksheet.mergeCells(currentRow, 7, currentRow, 9);
  worksheet.mergeCells(currentRow, 10, currentRow, 11);
  
  summaryRow.getCell(1).value = `إجمالي المبلغ المستحق: ر.ي. ${data.summary.totalDue.toLocaleString()}`;
  summaryRow.getCell(4).value = `إجمالي المبلغ المستلم: ر.ي. ${data.summary.totalReceived.toLocaleString()}`;
  summaryRow.getCell(7).value = `إجمالي المبلغ المحول: ر.ي. ${data.summary.totalTransferred.toLocaleString()}`;
  summaryRow.getCell(10).value = `إجمالي المبالغ المتبقية: ر.ي. ${data.summary.totalRemaining.toLocaleString()}`;
  
  applyRowStyle(summaryRow, {
    font: { size: 10, bold: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: EXCEL_STYLES.tableCell.border
  }, 1, 11);
  summaryRow.height = 22;
  currentRow++;

  // حساب ملخص المشاريع التفصيلي عند اختيار "تعدد مشاريع"
  const projectSummaryMap: Record<string, { earned: number, paid: number, days: number }> = {};
  data.records.forEach(record => {
    const pName = record.projectName || 'غير محدد';
    if (!projectSummaryMap[pName]) {
      projectSummaryMap[pName] = { earned: 0, paid: 0, days: 0 };
    }
    projectSummaryMap[pName].earned += (parseFloat(record.amountDue as any) || 0);
    projectSummaryMap[pName].paid += (parseFloat(record.amountReceived as any) || 0);
    projectSummaryMap[pName].days += (parseFloat(record.workDays as any) || 0);
  });

  const projectNames = Object.keys(projectSummaryMap);
  if (projectNames.length > 1) {
    currentRow += 1;
    worksheet.mergeCells(currentRow, 1, currentRow, 11);
    const summaryTitleCell = worksheet.getCell(currentRow, 1);
    summaryTitleCell.value = 'ملخص المشاريع التفصيلي المجمع';
    applyStyle(summaryTitleCell, EXCEL_STYLES.headerSecondary);
    currentRow++;

    const summaryHeaders = ['المشروع', 'إجمالي الأيام', 'إجمالي المستحق', 'إجمالي المدفوع', 'المتبقي', '', '', '', '', '', ''];
    const summaryHeaderRow = worksheet.getRow(currentRow);
    summaryHeaders.forEach((h, i) => {
      if (h) {
        const cell = summaryHeaderRow.getCell(i + 1);
        cell.value = h;
        applyStyle(cell, EXCEL_STYLES.tableHeader);
      }
    });
    currentRow++;

    projectNames.forEach((pName, idx) => {
      const stats = projectSummaryMap[pName];
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = pName;
      row.getCell(2).value = stats.days;
      row.getCell(3).value = stats.earned;
      row.getCell(4).value = stats.paid;
      row.getCell(5).value = stats.earned - stats.paid;

      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
      applyRowStyle(row, style, 1, 5);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
      currentRow++;
    });
  }

  currentRow = addSignatureSection(worksheet, currentRow, [
    { title: 'توقيع العامل' },
    { title: 'توقيع المهندس المشرف' },
    { title: 'توقيع المحاسب' }
  ], 11);

  addReportFooter(worksheet, currentRow, 11);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelFile(buffer as ArrayBuffer, `كشف_حساب_تفصيلي_${data.workerName}_${data.dateRange.to}.xlsx`);
}

export async function exportDailyReportToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  await ensureBrandingLoaded();
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('التقرير اليومي', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 15 },
    { width: 20 },
    { width: 12 },
    { width: 15 },
    { width: 35 }
  ];

  const dayName = options.date ? new Date(options.date).toLocaleDateString('ar-EG', { weekday: 'long' }) : '';
  let currentRow = await addAlFatihiHeader(
    worksheet,
    `كشف مصروفات مشروع ${options.projectName || ''} يوم ${dayName} تاريخ ${options.date || ''}`,
    '',
    5
  );

  currentRow++;

  const headers = ['المبلغ', 'نوع الحساب', 'نوع', 'المتبقي', 'ملاحظات'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, idx) => {
    headerRow.getCell(idx + 1).value = header;
    applyStyle(headerRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 20;
  currentRow++;

  const expenses = data.details?.expenses || [];
  let runningTotal = data.summary?.carriedForward || 0;
  
  if (data.summary?.carriedForward) {
    const cfRow = worksheet.getRow(currentRow);
    cfRow.getCell(1).value = data.summary.carriedForward;
    cfRow.getCell(2).value = 'مرحلة';
    cfRow.getCell(3).value = 'ترحيل';
    cfRow.getCell(4).value = data.summary.carriedForward;
    cfRow.getCell(5).value = `مرحل من تاريخ ${data.summary.carriedForwardDate || ''}`;
    applyRowStyle(cfRow, EXCEL_STYLES.greenLightRow, 1, 5);
    cfRow.getCell(1).numFmt = '#,##0.00';
    cfRow.getCell(4).numFmt = '#,##0.00';
    cfRow.height = 22;
    currentRow++;
  }

  expenses.forEach((expense: any, idx: number) => {
    const row = worksheet.getRow(currentRow);
    runningTotal -= (expense.amount || 0);
    
    row.getCell(1).value = expense.amount || 0;
    row.getCell(2).value = expense.accountType || expense.description || '';
    row.getCell(3).value = expense.type || 'منصرف';
    row.getCell(4).value = runningTotal;
    row.getCell(5).value = expense.notes || '';
    
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    applyRowStyle(row, style, 1, 5);
    row.getCell(1).numFmt = '#,##0.00';
    row.getCell(4).numFmt = '#,##0.00';
    row.height = 22;
    currentRow++;
  });

  const totalRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 3);
  totalRow.getCell(1).value = 'المبلغ المتبقي النهائي';
  totalRow.getCell(4).value = data.summary?.balance || runningTotal;
  totalRow.getCell(5).value = '';
  applyRowStyle(totalRow, EXCEL_STYLES.yellowRow, 1, 5);
  totalRow.getCell(4).numFmt = '#,##0.00';
  totalRow.height = 20;
  currentRow++;

  if (data.details?.materials?.length > 0) {
    currentRow += 2;
    
    const matHeaders = ['المشروع', 'محل التوريد', 'المبلغ', 'نوع الدفع', 'الملاحظات'];
    const matHeaderRow = worksheet.getRow(currentRow);
    matHeaders.forEach((header, idx) => {
      matHeaderRow.getCell(idx + 1).value = header;
      applyStyle(matHeaderRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
    });
    matHeaderRow.height = 20;
    currentRow++;

    data.details.materials.forEach((mat: any, idx: number) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = mat.projectName || options.projectName || '';
      row.getCell(2).value = mat.supplier || mat.supplierName || '';
      row.getCell(3).value = mat.amount || 0;
      row.getCell(4).value = mat.paymentType || 'آجل';
      row.getCell(5).value = mat.notes || mat.description || '';
      
      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.orangeRow;
      applyRowStyle(row, style, 1, 5);
      row.getCell(3).numFmt = '#,##0.00';
      row.height = 22;
      currentRow++;
    });
  }

  addReportFooter(worksheet, currentRow, 5);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelFile(buffer as ArrayBuffer, `تقرير_يومي_${options.projectName || ''}_${options.date || new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function exportPeriodicReportToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  await ensureBrandingLoaded();
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('التقرير الدوري', {
    views: [{ rightToLeft: true }]
  });

  worksheet.columns = [
    { width: 15 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 }
  ];

  let currentRow = await addAlFatihiHeader(
    worksheet,
    options.reportTitle || 'تقرير الفترة الزمنية',
    options.dateRange ? `للفترة: من ${options.dateRange.from} إلى ${options.dateRange.to}` : '',
    7
  );

  if (options.projectName) {
    const projectRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    projectRow.getCell(1).value = `المشروع: ${options.projectName}`;
    applyStyle(projectRow.getCell(1), {
      font: { size: 11, bold: true },
      alignment: { horizontal: 'center', vertical: 'middle' }
    });
    projectRow.height = 22;
    currentRow++;
  }

  currentRow++;

  const summaryHeaderRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  summaryHeaderRow.getCell(1).value = 'ملخص الفترة';
  applyStyle(summaryHeaderRow.getCell(1), EXCEL_STYLES.headerSecondary);
  summaryHeaderRow.height = 20;
  currentRow++;

  const kpiData = [
    ['أيام نشطة', data.summary?.activeDays || 0],
    ['إجمالي أيام العمل', (data.summary?.totalWorkDays || 0).toFixed(1)],
    ['إجمالي الأجور', formatCurrency(data.summary?.totalPaidWages || 0)],
    ['إجمالي المواد', formatCurrency(data.summary?.totalMaterials || 0)],
    ['إجمالي النقل', formatCurrency(data.summary?.totalTransport || 0)],
    ['نثريات العهدة', formatCurrency(data.summary?.totalMiscExpenses || 0)],
    ['إجمالي المصروفات', formatCurrency(data.summary?.totalExpenses || 0)],
    ['تحويلات العهدة', formatCurrency(data.summary?.totalFundTransfers || 0)],
    ['الرصيد النهائي', formatCurrency(data.summary?.balance || 0)]
  ];

  kpiData.forEach((item, idx) => {
    const row = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    worksheet.mergeCells(currentRow, 4, currentRow, 7);
    row.getCell(1).value = item[0];
    row.getCell(4).value = item[1];
    
    if (idx >= kpiData.length - 2) {
      applyRowStyle(row, EXCEL_STYLES.greenRow, 1, 7);
    } else {
      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
      applyRowStyle(row, style, 1, 7);
    }
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.height = 22;
    currentRow++;
  });

  currentRow += 2;

  if (data.chartData?.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    const detailsHeader = worksheet.getRow(currentRow);
    detailsHeader.getCell(1).value = 'تفاصيل المصروفات اليومية';
    applyStyle(detailsHeader.getCell(1), EXCEL_STYLES.headerSecondary);
    detailsHeader.height = 20;
    currentRow++;

    const headers = ['التاريخ', 'الأجور', 'المواد', 'النقل', 'النثريات', 'الدخل', 'الإجمالي'];
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, idx) => {
      headerRow.getCell(idx + 1).value = header;
      applyStyle(headerRow.getCell(idx + 1), EXCEL_STYLES.tableHeader);
    });
    headerRow.height = 22;
    currentRow++;

    data.chartData.forEach((day: any, idx: number) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = day.date;
      row.getCell(2).value = day.wages || 0;
      row.getCell(3).value = day.materials || 0;
      row.getCell(4).value = day.transport || 0;
      row.getCell(5).value = day.misc || 0;
      row.getCell(6).value = day.income || 0;
      row.getCell(7).value = day.total || 0;

      const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
      applyRowStyle(row, style, 1, 7);
      
      for (let i = 2; i <= 7; i++) {
        row.getCell(i).numFmt = '#,##0.00';
      }
      row.height = 20;
      currentRow++;
    });
  }

  addReportFooter(worksheet, currentRow, 7);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelFile(buffer as ArrayBuffer, `تقرير_فترة_${options.dateRange?.from}_${options.dateRange?.to}.xlsx`);
}

export async function exportWorkerStatementToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  await ensureBrandingLoaded();
  const formattedData = {
    workerName: data.worker?.name || '',
    profession: data.worker?.type || '',
    totalWorkDays: data.summary?.totalWorkDays || 0,
    projectsCount: 1,
    dateRange: options.dateRange || { from: '', to: '' },
    records: (data.attendance || []).map((record: any, idx: number) => ({
      date: record.date,
      day: new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'long' }),
      projectName: record.projectName || options.projectName || '',
      dailyWage: record.dailyWage || data.worker?.dailyWage || 0,
      workDays: record.workDays || 0,
      workHours: (record.workDays || 0) * 8,
      amountDue: record.actualWage || 0,
      amountReceived: record.paidAmount || 0,
      remaining: record.remainingAmount || 0,
      notes: record.workDescription || ''
    })),
    summary: {
      totalWorkDays: data.summary?.totalWorkDays || 0,
      totalHours: (data.summary?.totalWorkDays || 0) * 8,
      totalDue: data.summary?.totalEarned || 0,
      totalReceived: data.summary?.totalPaid || 0,
      totalTransferred: data.summary?.totalTransfers || 0,
      totalRemaining: data.summary?.remainingBalance || 0
    }
  };

  await exportDetailedWorkerStatement(formattedData);
}

export async function exportComparisonReportToExcel(
  data: any,
  options: ExportOptions
): Promise<void> {
  await ensureBrandingLoaded();
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('مقارنة المشاريع', {
    views: [{ rightToLeft: true }]
  });

  const projects = data.projects || [];
  const colCount = projects.length + 1;
  
  const colWidths = [{ width: 20 }];
  projects.forEach(() => colWidths.push({ width: 18 }));
  worksheet.columns = colWidths;

  let currentRow = await addAlFatihiHeader(
    worksheet,
    'تقرير مقارنة المشاريع',
    options.dateRange ? `للفترة: من ${options.dateRange.from} إلى ${options.dateRange.to}` : '',
    colCount
  );

  currentRow++;

  const headerRow = worksheet.getRow(currentRow);
  headerRow.getCell(1).value = 'البند';
  applyStyle(headerRow.getCell(1), EXCEL_STYLES.tableHeader);
  
  projects.forEach((project: any, idx: number) => {
    headerRow.getCell(idx + 2).value = project.name;
    applyStyle(headerRow.getCell(idx + 2), EXCEL_STYLES.tableHeader);
  });
  headerRow.height = 22;
  currentRow++;

  const metrics = [
    { label: 'إجمالي العمال', key: 'totalWorkers' },
    { label: 'أيام العمل', key: 'totalWorkDays' },
    { label: 'إجمالي الأجور', key: 'totalWages', isCurrency: true },
    { label: 'إجمالي المواد', key: 'totalMaterials', isCurrency: true },
    { label: 'إجمالي المصروفات', key: 'totalExpenses', isCurrency: true },
    { label: 'الرصيد الحالي', key: 'currentBalance', isCurrency: true }
  ];

  metrics.forEach((metric, idx) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = metric.label;
    
    projects.forEach((project: any, pIdx: number) => {
      const value = project.stats?.[metric.key] || 0;
      row.getCell(pIdx + 2).value = metric.isCurrency ? formatCurrency(value) : value;
    });
    
    const style = idx % 2 === 0 ? EXCEL_STYLES.tableCell : EXCEL_STYLES.tableCellAlt;
    applyRowStyle(row, style, 1, colCount);
    row.height = 20;
    currentRow++;
  });

  addReportFooter(worksheet, currentRow, colCount);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadExcelFile(buffer as ArrayBuffer, `مقارنة_المشاريع_${options.dateRange?.from}_${options.dateRange?.to}.xlsx`);
}
