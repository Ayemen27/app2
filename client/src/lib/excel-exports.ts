import ExcelJS from 'exceljs';
import { downloadExcelFile } from '@/utils/webview-download';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { getBranding, argb, ensureBrandingLoaded, getReportEngineer } from '@/lib/report-branding';

/**
 * 🖼️ يضيف شعار الشركة (data URL) إلى ورقة Excel ضمن النطاق المحدد.
 * يُتجاهل بصمت إذا لم يكن هناك شعار أو فشل التحويل.
 */
export function addBrandingLogo(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  logoUrl: string | undefined,
  range: { tl: { col: number; row: number }; br: { col: number; row: number } }
): void {
  if (!logoUrl) return;
  try {
    const m = /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i.exec(logoUrl);
    if (!m) return;
    const ext = (m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase()) as 'png' | 'jpeg' | 'gif';
    const imageId = workbook.addImage({ base64: logoUrl, extension: ext });
    worksheet.addImage(imageId, range as any);
  } catch (e) {
    console.warn('[excel] addBrandingLogo failed:', (e as Error)?.message);
  }
}

/**
 * 🏛️ ترويسة letterhead موحّدة للإكسل — مطابقة لترويسة الـ PDF (buildLetterheadHeader).
 * تُنشئ:
 *   - صف 1: شريط الشركة (اسم عربي + tagline إنجليزي) بخلفية primary، مع شعار يطفو على اليمين
 *   - صف 2: شريط لون التمييز (accent) رفيع
 *   - صف 3 (اختياري): بيانات الاتصال (هاتف • عنوان • بريد • موقع)
 *   - صف 4: شريط عنوان التقرير بخلفية secondary
 *   - صف 5: تاريخ الاستخراج
 * يعيد رقم الصف التالي للاستخدام.
 */
export function buildExcelLetterhead(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  colCount: number,
  reportTitle: string
): number {
  const _b = getBranding();
  const mainBlue = argb(_b.primaryColor);
  const accentBlue = argb(_b.accentColor);
  const secondary = argb(_b.secondaryColor);
  const lastCol = colCount;

  // الصف 1: شريط الشركة الرئيسي
  worksheet.mergeCells(1, 1, 1, lastCol);
  const r1 = worksheet.getRow(1);
  const tagline = _b.companyNameEn ? `\n${_b.companyNameEn}` : '';
  r1.getCell(1).value = `${_b.companyName}${tagline}`;
  r1.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mainBlue } };
  r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  r1.height = tagline ? 64 : 50;

  // الشعار يطفو في يمين الصف الأول (في وضع RTL: العمود A هو اليمين البصري)
  // الحجم محسوب لينسجم مع ارتفاع الصف ويحافظ على نسبة الأبعاد المربّعة
  if (_b.logoUrl) {
    addBrandingLogo(workbook, worksheet, _b.logoUrl, {
      tl: { col: 0.1, row: 0.08 } as any,
      br: { col: 1.2, row: 0.92 } as any,
    });
  }

  // الصف 2: شريط accent
  worksheet.mergeCells(2, 1, 2, lastCol);
  const r2 = worksheet.getRow(2);
  r2.getCell(1).value = '';
  r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentBlue } };
  r2.height = 6;

  let cursor = 3;

  // الصف 3 (اختياري): بيانات الاتصال
  const contactParts: string[] = [];
  if (_b.phone)   contactParts.push(`☎  ${_b.phone}`);
  if (_b.address) contactParts.push(`📍  ${_b.address}`);
  if (_b.email)   contactParts.push(`✉  ${_b.email}`);
  if (_b.website) contactParts.push(`🌐  ${_b.website}`);
  if (contactParts.length > 0) {
    worksheet.mergeCells(cursor, 1, cursor, lastCol);
    const rc = worksheet.getRow(cursor);
    rc.getCell(1).value = contactParts.join('     •     ');
    rc.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };
    rc.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    rc.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    rc.height = 22;
    cursor++;
  }

  // صف عنوان التقرير
  worksheet.mergeCells(cursor, 1, cursor, lastCol);
  const rt = worksheet.getRow(cursor);
  rt.getCell(1).value = reportTitle;
  rt.getCell(1).font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  rt.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondary } };
  rt.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  rt.height = 30;
  cursor++;

  // صف تاريخ الاستخراج
  worksheet.mergeCells(cursor, 1, cursor, lastCol);
  const rd = worksheet.getRow(cursor);
  rd.getCell(1).value = `تاريخ الاستخراج: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
  rd.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  rd.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  rd.height = 18;
  cursor++;

  return cursor;
}

/**
 * 🦶 تذييل letterhead موحّد للإكسل — مطابق لتذييل الـ PDF (buildLetterheadFooter).
 * شريط accent رفيع + شريط primary فيه الهاتف والعنوان.
 */
export function buildExcelLetterheadFooter(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  colCount: number
): number {
  const _b = getBranding();
  const mainBlue = argb(_b.primaryColor);
  const accentBlue = argb(_b.accentColor);
  const eng = getReportEngineer();

  // 1. شريط accent العلوي
  worksheet.mergeCells(startRow, 1, startRow, colCount);
  const ra = worksheet.getRow(startRow);
  ra.getCell(1).value = '';
  ra.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentBlue } };
  ra.height = 6;

  let cursor = startRow + 1;

  // 2. 🧑‍💼 شريط المهندس المسؤول (اختياري — يظهر إذا كان للمشروع المختار مهندس مسجّل)
  if (eng) {
    worksheet.mergeCells(cursor, 1, cursor, colCount);
    const re = worksheet.getRow(cursor);
    re.getCell(1).value = `👷‍♂️  المهندس المسؤول: ${eng}`;
    re.getCell(1).font = { name: 'Calibri', bold: true, size: 11, color: { argb: mainBlue } };
    re.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    re.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    re.getCell(1).border = {
      top: { style: 'thin', color: { argb: accentBlue } },
      bottom: { style: 'thin', color: { argb: accentBlue } },
    };
    re.height = 22;
    cursor += 1;
  }

  // 3. شريط بيانات الاتصال (هاتف + عنوان)
  worksheet.mergeCells(cursor, 1, cursor, colCount);
  const rf = worksheet.getRow(cursor);
  const phone = _b.phone ? `☎  ${_b.phone}` : '';
  const addr = _b.address ? `📍  ${_b.address}` : '';
  rf.getCell(1).value = [phone, addr].filter(Boolean).join('     |     ') || _b.companyName;
  rf.getCell(1).font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  rf.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mainBlue } };
  rf.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  rf.height = 32;

  return cursor + 1;
}

export const exportWorkerStatement = async (data: any, worker: any): Promise<boolean> => {
  await ensureBrandingLoaded();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('كشف حساب عامل', {
    views: [{ rightToLeft: true, showGridLines: false }]
  });

  // 🎨 الألوان الديناميكية من إعدادات المستخدم
  const _b = getBranding();
  workbook.creator = _b.companyName;
  workbook.company = _b.companyName;
  const mainBlue = argb(_b.primaryColor);
  const accentBlue = argb(_b.accentColor);
  const softGray = 'FFF8FAFC';
  const borderGray = 'FFE2E8F0';
  const emeraldGreen = 'FF10B981';
  const roseRed = 'FFF43F5E';
  
  const whiteText = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const darkText = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
  const headerText = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  
  const centerAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const rightAlign: any = { horizontal: 'right', vertical: 'middle', wrapText: true, indent: 1 };
  
  const borderLight: any = {
    top: { style: 'thin', color: { argb: borderGray } },
    left: { style: 'thin', color: { argb: borderGray } },
    bottom: { style: 'thin', color: { argb: borderGray } },
    right: { style: 'thin', color: { argb: borderGray } }
  };

  // 1. ترويسة letterhead الموحّدة (مطابقة لـ PDF) — اسم شركة + شعار + بيانات اتصال + شريط accent + شريط عنوان
  const COL_COUNT_WS = 10; // الأعمدة A→J في كشف حساب العامل
  const nextRow = buildExcelLetterhead(workbook, worksheet, COL_COUNT_WS, 'التقرير المالي التفصيلي - كشف حساب عامل');

  // 3. قسم معلومات الكيان (Worker Info Section) - تصميم بطاقة حديثة
  const infoStartRow = nextRow + 1; // فراغ صف واحد بعد الترويسة
  worksheet.getRow(infoStartRow).height = 25;
  worksheet.getRow(infoStartRow + 1).height = 25;
  worksheet.getRow(infoStartRow + 2).height = 25;

  const styleInfoBox = (row: number, col: string, label: string, value: string, iconColor: string) => {
    const lCell = worksheet.getCell(`${col}${row}`);
    const vCell = worksheet.getCell(`${String.fromCharCode(col.charCodeAt(0) + 1)}${row}`);
    
    lCell.value = label;
    lCell.font = { ...headerText, color: { argb: iconColor } };
    lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGray } };
    lCell.alignment = rightAlign;
    lCell.border = borderLight;

    vCell.value = value;
    vCell.font = darkText;
    vCell.alignment = rightAlign;
    vCell.border = borderLight;
  };

  styleInfoBox(infoStartRow, 'A', '● اسم الموظف:', worker.name, accentBlue);
  styleInfoBox(infoStartRow, 'D', '● المشروع الحالي:', data.projectName || 'جميع المشاريع', accentBlue);
  styleInfoBox(infoStartRow + 1, 'A', '● المسمى الوظيفي:', worker.type || 'عامل', accentBlue);
  styleInfoBox(infoStartRow + 1, 'D', '● نطاق التقرير:', data.dateRange || 'السجل الكامل', accentBlue);
  styleInfoBox(infoStartRow + 2, 'A', '● الأجر الأساسي:', `${worker.dailyWage} ر.ي / يوم`, accentBlue);
  styleInfoBox(infoStartRow + 2, 'D', '● رقم القيد:', `W-${String(worker.id).slice(-4).toUpperCase()}`, accentBlue);

  // 4. جدول البيانات الرئيسي (Main Data Grid)
  const tableHeaderRow = infoStartRow + 4; // فراغ صف بعد المعلومات
  const headers = ['م', 'التاريخ', 'اليوم', 'المشروع المرتبط', 'وصف العمل والتفاصيل', 'أيام', 'ساعات', 'مستحق (+)', 'مدفوع (-)', 'المتبقي'];
  const headerRow = worksheet.getRow(tableHeaderRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
    cell.font = { ...whiteText, color: { argb: 'FFFFFFFF' } }; // Force pure white for contrast
    cell.alignment = centerAlign;
    cell.border = borderLight;
  });
  headerRow.height = 30;

  worksheet.columns = [
    { width: 6 }, // م
    { width: 14 }, // التاريخ
    { width: 12 }, // اليوم
    { width: 22 }, // المشروع
    { width: 48 }, // وصف العمل
    { width: 8 },  // أيام
    { width: 12 }, // ساعات
    { width: 16 }, // مستحق
    { width: 16 }, // مدفوع
    { width: 16 }  // المتبقي
  ];

  const statement = data.statement || [];
  let currentRow = tableHeaderRow + 1;
  statement.forEach((item: any, index: number) => {
    const row = worksheet.getRow(currentRow);
    const date = new Date(item.date);
    const isEven = index % 2 === 0;
    
    const amount = parseFloat(item.amount || 0);
    const paid = parseFloat(item.paid || 0);
    const balance = amount - paid;

    const workDaysVal = item.workDays !== undefined ? parseFloat(item.workDays) : (item.type === 'عمل' ? 1 : 0);

    row.values = [
      index + 1,
      format(date, 'dd/MM/yyyy'),
      format(date, 'EEEE', { locale: arSA }),
      item.projectName || '-',
      item.description || (item.type === 'حوالة' ? `حوالة لـ ${item.recipientName || '-'}` : 'تنفيذ مهام العمل الموكلة بالموقع'),
      workDaysVal,
      item.hours || (item.type === 'عمل' ? '8h' : '-'),
      amount,
      paid,
      balance
    ];

    row.eachCell((cell, colNum) => {
      cell.border = borderLight;
      cell.alignment = centerAlign;
      cell.font = darkText;
      if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      
      // تنسيق المبالغ
      if (colNum === 8 || colNum === 9 || colNum === 10) {
        cell.numFmt = '#,##0.00 "ر.ي"';
        if (colNum === 8) cell.font = { ...darkText, color: { argb: emeraldGreen }, bold: true };
        if (colNum === 9 && parseFloat(item.paid || 0) > 0) cell.font = { ...darkText, color: { argb: roseRed }, bold: true };
        if (colNum === 10) cell.font = { ...darkText, color: { argb: accentBlue }, bold: true };
      }
    });
    currentRow++;
  });

  // 5. صف الإجماليات الذكي
  const totalsRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
  const totalsLabel = worksheet.getCell(`A${currentRow}`);
  totalsLabel.value = 'إجماليات الحساب النهائية';
  totalsLabel.font = whiteText;
  totalsLabel.alignment = centerAlign;
  totalsLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

  const sumDays = worksheet.getCell(`F${currentRow}`);
  const sumEarned = worksheet.getCell(`H${currentRow}`);
  const sumPaid = worksheet.getCell(`I${currentRow}`);
  const finalBalanceCell = worksheet.getCell(`J${currentRow}`);

  sumDays.value = parseFloat(data.summary.totalWorkDays || 0);
  sumEarned.value = parseFloat(data.summary.totalEarned || 0);
  sumPaid.value = parseFloat(data.summary.totalPaid || 0);
  finalBalanceCell.value = parseFloat(data.summary.finalBalance || 0);
  
  [sumDays, sumEarned, sumPaid, finalBalanceCell].forEach(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    c.font = whiteText;
    if (c.address.startsWith('F')) {
      c.numFmt = '#,##0.00';
    } else {
      c.numFmt = '#,##0.00 "ر.ي"';
    }
    c.alignment = centerAlign;
  });
  totalsRow.height = 25;

  // 6. لوحة الملخص المالي الجانبية (Financial Dashboard Overlay)
  currentRow += 2;
  const summaryBoxStart = 8;
  const metrics = [
    { label: 'الوضع المالي الإجمالي', isHeader: true, color: mainBlue },
    { label: 'إجمالي المستحقات المعتمدة', value: data.summary.totalEarned, color: emeraldGreen },
    { label: 'إجمالي المدفوعات المسلمة', value: data.summary.totalPaid, color: roseRed },
    { label: 'صافي الرصيد المتبقي', value: data.summary.finalBalance, color: accentBlue, isFinal: true }
  ];

  metrics.forEach((m, i) => {
    const rIdx = currentRow + i;
    if (m.isHeader) {
      worksheet.mergeCells(rIdx, summaryBoxStart, rIdx, summaryBoxStart + 1);
      const c = worksheet.getCell(rIdx, summaryBoxStart);
      c.value = m.label;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m.color } };
      c.font = whiteText;
      c.alignment = centerAlign;
    } else {
      const lCell = worksheet.getCell(rIdx, summaryBoxStart + 1);
      const vCell = worksheet.getCell(rIdx, summaryBoxStart);
      
      lCell.value = m.label;
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGray } };
      lCell.font = headerText;
      lCell.border = borderLight;
      lCell.alignment = rightAlign;

      vCell.value = parseFloat(m.value || 0);
      vCell.font = { ...darkText, bold: true, color: { argb: m.color } };
      vCell.border = borderLight;
      vCell.alignment = centerAlign;
      vCell.numFmt = '#,##0.00 "ر.ي"';
      
      if (m.isFinal) {
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      }
    }
  });

  // 7. تذييل أمان (نص قانوني) — يغطي كل الأعمدة العشرة
  currentRow += metrics.length + 1;
  const lastColLetterWS = String.fromCharCode(64 + COL_COUNT_WS);
  worksheet.mergeCells(`A${currentRow}:${lastColLetterWS}${currentRow}`);
  const footer = worksheet.getCell(`A${currentRow}`);
  footer.value = 'تم توليد هذا التقرير آلياً عبر نظام إدارة أكسيون AXION. أي كشط أو تعديل يدوي يلغي صحة التقرير.';
  footer.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
  footer.alignment = centerAlign;

  // 8. تذييل letterhead الموحّد (مطابق لـ PDF)
  buildExcelLetterheadFooter(worksheet, currentRow + 2, COL_COUNT_WS);

  const buffer = await workbook.xlsx.writeBuffer();
  return await downloadExcelFile(buffer as ArrayBuffer, `Worker_Statement_${worker.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};

// ====================================================================
// 📋 كشف العمال الجماعي (Workers List Report) — مطابق للقالب المرجعي
// أعمدة: م | الاسم | الأيام | اليومية | أصبح له | السحبيات | الحوالات | الذي بيده | المتبقي له | ملاحظات
// ====================================================================
export interface WorkerSummaryRow {
  worker_id: string;
  name: string;
  type?: string;
  dailyWage: number;
  totalWorkDays: number;
  totalEarnings: number;       // أصبح له
  totalWithdrawals: number;    // السحبيات (نقد على الحضور)
  totalTransfers: number;      // الحوالات
  totalSettled?: number;       // التصفيات (اختياري)
  balance: number;             // المتبقي له
}

export const exportWorkersListReport = async (
  rows: WorkerSummaryRow[],
  meta: { title?: string; projectName?: string; statusLabel?: string; typeLabel?: string }
): Promise<boolean> => {
  await ensureBrandingLoaded();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('كشف العمال', {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } as any,
  });

  // 🎨 الهوية البصرية الموحدة — تُقرأ من إعدادات المستخدم
  const _b = getBranding();
  workbook.creator = _b.companyName;
  workbook.company = _b.companyName;
  const mainBlue = argb(_b.primaryColor);
  const accentBlue = argb(_b.accentColor);
  const slateHeader = argb(_b.secondaryColor);
  const slateTotals = 'FF475569';
  const softGray = 'FFF8FAFC';
  const altRow = 'FFF1F5F9';
  const borderGray = 'FFE2E8F0';
  const emeraldGreen = 'FF10B981';
  const roseRed = 'FFF43F5E';
  const amber = 'FFD97706';

  const whiteText = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const darkText = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
  const headerText = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  const centerAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const rightAlign: any = { horizontal: 'right', vertical: 'middle', wrapText: true, indent: 1 };
  const borderLight: any = {
    top: { style: 'thin', color: { argb: borderGray } },
    left: { style: 'thin', color: { argb: borderGray } },
    bottom: { style: 'thin', color: { argb: borderGray } },
    right: { style: 'thin', color: { argb: borderGray } },
  };

  const COLS = 10; // م، الاسم، الأيام، اليومية، أصبح له، السحبيات، الحوالات، الذي بيده، المتبقي له، ملاحظات
  const lastColLetter = String.fromCharCode(64 + COLS); // 'J'

  // 1) ترويسة letterhead الموحّدة (مطابقة لـ PDF)
  const headerNextRow = buildExcelLetterhead(workbook, worksheet, COLS, meta.title || 'كشف العمال - تقرير شامل');

  // 2) صف معلومات الفلاتر
  const infoRow = headerNextRow + 1; // فراغ صف بعد الترويسة
  worksheet.getRow(infoRow).height = 25;
  const infoCells: Array<[string, string, string]> = [
    ['A', '● المشروع:', meta.projectName || 'جميع المشاريع'],
    ['D', '● الحالة:', meta.statusLabel || 'الكل'],
    ['G', '● النوع:', meta.typeLabel || 'الكل'],
  ];
  infoCells.forEach(([col, label, value]) => {
    const lCell = worksheet.getCell(`${col}${infoRow}`);
    const vCellAddr = `${String.fromCharCode(col.charCodeAt(0) + 1)}${infoRow}`;
    const v2Addr = `${String.fromCharCode(col.charCodeAt(0) + 2)}${infoRow}`;
    worksheet.mergeCells(`${vCellAddr}:${v2Addr}`);
    const vCell = worksheet.getCell(vCellAddr);
    lCell.value = label;
    lCell.font = { ...headerText, color: { argb: accentBlue } };
    lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGray } };
    lCell.alignment = rightAlign;
    lCell.border = borderLight;
    vCell.value = value;
    vCell.font = darkText;
    vCell.alignment = rightAlign;
    vCell.border = borderLight;
  });

  // 3) رأس الجدول
  const headerRowIdx = infoRow + 2; // فراغ صف بعد صف الفلاتر
  const headers = ['م', 'الاسم', 'الأيام', 'اليومية', 'أصبح له', 'السحبيات', 'الحوالات', 'الذي بيده', 'المتبقي له', 'ملاحظات'];
  const headerRow = worksheet.getRow(headerRowIdx);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: slateHeader } };
    cell.font = { ...whiteText, color: { argb: 'FFFFFFFF' } };
    cell.alignment = centerAlign;
    cell.border = borderLight;
  });
  headerRow.height = 30;

  // عرض الأعمدة
  worksheet.columns = [
    { width: 5 },   // م
    { width: 28 },  // الاسم
    { width: 9 },   // الأيام
    { width: 11 },  // اليومية
    { width: 13 },  // أصبح له
    { width: 13 },  // السحبيات
    { width: 13 },  // الحوالات
    { width: 13 },  // الذي بيده
    { width: 14 },  // المتبقي له
    { width: 18 },  // ملاحظات
  ];

  // 4) صفوف البيانات
  let currentRow = headerRowIdx + 1;
  let sumDays = 0, sumDaily = 0, sumEarnings = 0, sumWithdrawals = 0, sumTransfers = 0, sumOnHand = 0, sumRemaining = 0;

  rows.forEach((r, idx) => {
    const row = worksheet.getRow(currentRow);
    const isEven = idx % 2 === 0;
    // الذي بيده = السحبيات + الحوالات (مدفوع للعامل)
    const onHand = (r.totalWithdrawals || 0) + (r.totalTransfers || 0) + (r.totalSettled || 0);
    const remaining = r.balance;

    sumDays += r.totalWorkDays;
    sumDaily += r.dailyWage;
    sumEarnings += r.totalEarnings;
    sumWithdrawals += r.totalWithdrawals;
    sumTransfers += r.totalTransfers;
    sumOnHand += onHand;
    sumRemaining += remaining;

    row.values = [
      idx + 1,
      r.name,
      r.totalWorkDays,
      r.dailyWage,
      r.totalEarnings,
      r.totalWithdrawals,
      r.totalTransfers,
      onHand,
      remaining,
      r.type || '-',
    ];

    row.eachCell((cell, colNum) => {
      cell.border = borderLight;
      cell.font = darkText;
      cell.alignment = colNum === 2 || colNum === 10 ? rightAlign : centerAlign;
      if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRow } };
      // تنسيق الأرقام
      if (colNum === 3) cell.numFmt = '#,##0.0'; // الأيام
      if (colNum === 4 || colNum === 5 || colNum === 6 || colNum === 7 || colNum === 8) cell.numFmt = '#,##0';
      if (colNum === 9) {
        cell.numFmt = '#,##0';
        if (remaining > 0) cell.font = { ...darkText, bold: true, color: { argb: emeraldGreen } };
        else if (remaining < 0) cell.font = { ...darkText, bold: true, color: { argb: roseRed } };
        else cell.font = { ...darkText, color: { argb: 'FF64748B' } };
      }
      if (colNum === 5) cell.font = { ...darkText, color: { argb: accentBlue } };
      if (colNum === 6 && r.totalWithdrawals > 0) cell.font = { ...darkText, color: { argb: amber } };
    });
    row.height = 22;
    currentRow++;
  });

  // 5) صف الإجماليات
  const totalsRow = worksheet.getRow(currentRow);
  totalsRow.values = [
    '',
    'الإجماليات',
    sumDays,
    '',
    sumEarnings,
    sumWithdrawals,
    sumTransfers,
    sumOnHand,
    sumRemaining,
    `${rows.length} عامل`,
  ];
  totalsRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: slateTotals } };
    cell.font = whiteText;
    cell.alignment = colNum === 2 || colNum === 10 ? rightAlign : centerAlign;
    cell.border = borderLight;
    if (colNum === 3) cell.numFmt = '#,##0.0';
    if (colNum >= 5 && colNum <= 9) cell.numFmt = '#,##0 "ر.ي"';
  });
  totalsRow.height = 28;
  currentRow++;

  // 6) لوحة الملخص المالي
  currentRow += 1;
  const summaryStart = currentRow;
  worksheet.mergeCells(`A${summaryStart}:${lastColLetter}${summaryStart}`);
  const summaryHeader = worksheet.getCell(`A${summaryStart}`);
  summaryHeader.value = 'الملخص المالي العام';
  summaryHeader.font = { ...whiteText, size: 13 };
  summaryHeader.alignment = centerAlign;
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mainBlue } };
  worksheet.getRow(summaryStart).height = 28;

  const metricsList = [
    { label: 'إجمالي عدد العمال', value: rows.length, isCount: true, color: mainBlue },
    { label: 'مجموع أيام العمل', value: sumDays, isCount: true, color: accentBlue },
    { label: 'إجمالي المستحقات (أصبح له)', value: sumEarnings, color: emeraldGreen },
    { label: 'إجمالي المسلَّم (الذي بيده)', value: sumOnHand, color: roseRed },
    { label: 'الرصيد المتبقي الصافي', value: sumRemaining, color: sumRemaining >= 0 ? emeraldGreen : roseRed, isFinal: true },
  ];
  metricsList.forEach((m, i) => {
    const r = summaryStart + 1 + i;
    worksheet.mergeCells(`A${r}:E${r}`);
    worksheet.mergeCells(`F${r}:${lastColLetter}${r}`);
    const lCell = worksheet.getCell(`A${r}`);
    const vCell = worksheet.getCell(`F${r}`);
    lCell.value = m.label;
    lCell.font = headerText;
    lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGray } };
    lCell.alignment = rightAlign;
    lCell.border = borderLight;
    vCell.value = m.value;
    vCell.font = { ...darkText, bold: true, color: { argb: m.color } };
    vCell.alignment = centerAlign;
    vCell.border = borderLight;
    vCell.numFmt = m.isCount ? '#,##0' : '#,##0 "ر.ي"';
    if (m.isFinal) vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    worksheet.getRow(r).height = 22;
  });

  // 7) تذييل أمان (نص قانوني)
  const legalRow = summaryStart + metricsList.length + 2;
  worksheet.mergeCells(`A${legalRow}:${lastColLetter}${legalRow}`);
  const legal = worksheet.getCell(`A${legalRow}`);
  legal.value = 'تم توليد هذا التقرير آلياً عبر نظام إدارة أكسيون AXION. أي كشط أو تعديل يدوي يلغي صحة التقرير.';
  legal.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
  legal.alignment = centerAlign;

  // 8) تذييل letterhead الموحّد (مطابق لـ PDF)
  buildExcelLetterheadFooter(worksheet, legalRow + 2, COLS);

  const buffer = await workbook.xlsx.writeBuffer();
  return await downloadExcelFile(buffer as ArrayBuffer, `Workers_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
};
