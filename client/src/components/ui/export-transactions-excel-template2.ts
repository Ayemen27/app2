import { downloadExcelFile } from '@/utils/webview-download';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project' | 'storage';
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
  notes?: string;
}

interface Totals {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

function gregorianToHijri(date: Date): { day: number; month: number; year: number; monthName: string; dayName: string } {
  const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const HIJRI_MONTHS = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
    'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ];

  const dayName = DAY_NAMES_AR[date.getDay()];

  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { day, month, year, monthName: HIJRI_MONTHS[month - 1] || '', dayName };
}

function getAccountTypeLabel(type: string, category: string): string {
  if (type === 'income' || type === 'transfer_from_project') return 'دخل';
  if (category === 'أجور عمال') return 'أجور العمال';
  if (category === 'مواصلات') return 'مواصلات';
  if (category === 'حوالات عمال') return 'تنزيلات العمال';
  if (category === 'نثريات' || category === 'مشتريات مواد') return 'مصروفات';
  if (type === 'deferred') return 'آجل';
  if (type === 'storage') return 'مخزن';
  return 'مصروفات';
}

function getEntryName(t: Transaction): string {
  if (t.category === 'رصيد سابق') return 'مرحل';
  if (t.workerName && t.workerName !== 'غير محدد') return t.workerName;
  if (t.description) return t.description;
  if (t.recipientName) return t.recipientName;
  return t.category || '-';
}

function applyBorder(cell: any) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF999999' } },
    bottom: { style: 'thin', color: { argb: 'FF999999' } },
    left: { style: 'thin', color: { argb: 'FF999999' } },
    right: { style: 'thin', color: { argb: 'FF999999' } },
  };
}

function styleCell(cell: any, options: {
  bgColor?: string;
  fontColor?: string;
  bold?: boolean;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
  wrapText?: boolean;
}) {
  if (options.bgColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.bgColor } };
  }
  cell.font = {
    bold: options.bold ?? false,
    size: options.fontSize ?? 10,
    color: { argb: options.fontColor ?? 'FF000000' },
    name: 'Arial',
  };
  cell.alignment = {
    horizontal: options.align ?? 'center',
    vertical: 'middle',
    readingOrder: 2,
    wrapText: options.wrapText ?? false,
  };
  if (options.numFmt) cell.numFmt = options.numFmt;
  applyBorder(cell);
}

export async function exportTransactionsToExcelTemplate2(
  transactions: Transaction[],
  totals: Totals,
  projectName?: string,
  reportDate?: string
): Promise<boolean> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AXION';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('كشف المصروفات اليومي', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      horizontalCentered: true,
    },
  });

  const COL_COUNT = 7;

  worksheet.getColumn(1).width = 14;
  worksheet.getColumn(2).width = 16;
  worksheet.getColumn(3).width = 20;
  worksheet.getColumn(4).width = 10;
  worksheet.getColumn(5).width = 14;
  worksheet.getColumn(6).width = 14;
  worksheet.getColumn(7).width = 26;

  const dateObj = reportDate ? (() => {
    const [y, m, d] = reportDate.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  })() : new Date();

  const hijri = gregorianToHijri(dateObj);
  const gregorianFormatted = dateObj.toLocaleDateString('en-GB');
  const hijriStr = `${hijri.day} ${hijri.monthName} ${hijri.year}`;

  const GREEN_HEADER = 'FF1F7A3C';
  const GREEN_LIGHT = 'FFD6E4D9';
  const GREEN_ROW_INCOME = 'FFE8F5E9';
  const SALMON = 'FFFA8072';
  const SALMON_LIGHT = 'FFFCE4D6';
  const WHITE = 'FFFFFFFF';
  const GREY_LIGHT = 'FFF5F5F5';
  const DARK_GREEN = 'FF145226';

  let currentRow = 1;

  // === الصف 1: عنوان التقرير ===
  worksheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  const titleCell = worksheet.getRow(currentRow).getCell(1);
  titleCell.value = `كشف مصروفات مشروع ${projectName || ''} يوم ${hijri.dayName} ${hijriStr} الموافق ${gregorianFormatted}`;
  styleCell(titleCell, { bgColor: GREEN_HEADER, fontColor: 'FFFFFFFF', bold: true, fontSize: 12, wrapText: true });
  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  // === الصف 2: معلومات التاريخ ===
  const metaRow = worksheet.getRow(currentRow);
  metaRow.height = 22;

  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  const metaCell1 = metaRow.getCell(1);
  metaCell1.value = `الموافق ${gregorianFormatted}`;
  styleCell(metaCell1, { bgColor: GREEN_HEADER, fontColor: 'FFFFFFFF', bold: true, fontSize: 10 });

  worksheet.mergeCells(currentRow, 3, currentRow, 4);
  const metaCell2 = metaRow.getCell(3);
  metaCell2.value = `${hijri.dayName} ${hijriStr}`;
  styleCell(metaCell2, { bgColor: GREEN_HEADER, fontColor: 'FFFFFFFF', bold: true, fontSize: 10 });

  worksheet.mergeCells(currentRow, 5, currentRow, COL_COUNT);
  const metaCell3 = metaRow.getCell(5);
  metaCell3.value = `الموقع: ${projectName || ''}`;
  styleCell(metaCell3, { bgColor: GREEN_HEADER, fontColor: 'FFFFFFFF', bold: true, fontSize: 10 });
  currentRow++;

  // === الصف 3: رؤوس الأعمدة ===
  const headers = ['المبلغ', 'نوع الحساب', 'الاسم', 'عدد الأيام', 'الرصيد التجميعي', 'الأجر اليومي', 'ملاحظات'];
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleCell(cell, { bgColor: GREEN_HEADER, fontColor: 'FFFFFFFF', bold: true, fontSize: 10 });
  });
  headerRow.height = 22;
  currentRow++;

  // === بناء صفوف البيانات ===
  // ترتيب: الرصيد المرحل أولاً، ثم الدخل، ثم المصروفات بالترتيب
  const openingTx = transactions.filter(t => t.category === 'رصيد سابق');
  const incomeTx = transactions.filter(t =>
    t.category !== 'رصيد سابق' &&
    (t.type === 'income' || t.type === 'transfer_from_project')
  );
  const expenseTx = transactions.filter(t =>
    t.category !== 'رصيد سابق' &&
    t.type !== 'income' &&
    t.type !== 'transfer_from_project'
  );

  const orderedTransactions = [...openingTx, ...incomeTx, ...expenseTx];

  let runningBalance = 0;

  orderedTransactions.forEach((t, idx) => {
    const isOpening = t.category === 'رصيد سابق';
    const isIncome = t.type === 'income' || t.type === 'transfer_from_project';
    const amount = t.amount || 0;

    if (isIncome || isOpening) {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }

    const dataRow = worksheet.getRow(currentRow);
    dataRow.height = 20;

    let rowBg = idx % 2 === 0 ? WHITE : GREY_LIGHT;
    if (isOpening) rowBg = GREEN_LIGHT;
    if (isIncome && !isOpening) rowBg = GREEN_ROW_INCOME;

    const accountType = getAccountTypeLabel(t.type, t.category);
    const entryName = getEntryName(t);
    const days = t.workDays ?? null;
    const dailyWage = t.dailyWage ?? null;
    const notes = t.notes || t.description || '';

    const rowData = [
      amount,
      accountType,
      entryName,
      days,
      runningBalance,
      dailyWage,
      notes,
    ];

    rowData.forEach((val, ci) => {
      const cell = dataRow.getCell(ci + 1);
      cell.value = val;
      styleCell(cell, {
        bgColor: rowBg,
        bold: isOpening,
        fontSize: 10,
        numFmt: (ci === 0 || ci === 4 || ci === 5) && typeof val === 'number' ? '#,##0' : undefined,
        align: ci === 2 || ci === 6 ? 'right' : 'center',
        wrapText: ci === 6,
      });
    });

    currentRow++;
  });

  // === صف المبلغ المتبقي ===
  const remainRow = worksheet.getRow(currentRow);
  remainRow.height = 24;

  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  const remainLabel = remainRow.getCell(1);
  remainLabel.value = 'المبلغ المتبقي';
  styleCell(remainLabel, { bgColor: SALMON, fontColor: 'FF7B1D0B', bold: true, fontSize: 11 });

  const remainVal = remainRow.getCell(5);
  remainVal.value = runningBalance;
  styleCell(remainVal, { bgColor: SALMON, fontColor: 'FF7B1D0B', bold: true, fontSize: 11, numFmt: '#,##0' });

  worksheet.mergeCells(currentRow, 6, currentRow, COL_COUNT);
  const remainExtra = remainRow.getCell(6);
  remainExtra.value = '';
  styleCell(remainExtra, { bgColor: SALMON_LIGHT, fontColor: 'FF7B1D0B', bold: true, fontSize: 11 });
  currentRow += 2;

  // === إجماليات ===
  const summaryItems = [
    { label: 'إجمالي الدخل', value: totals.totalIncome, color: 'FF1F7A3C', textColor: 'FFFFFFFF' },
    { label: 'إجمالي المصروفات', value: totals.totalExpenses, color: 'FFC0392B', textColor: 'FFFFFFFF' },
    { label: 'الرصيد الصافي', value: totals.balance, color: totals.balance >= 0 ? 'FF2E86C1' : 'FFC0392B', textColor: 'FFFFFFFF' },
  ];

  summaryItems.forEach(item => {
    const row = worksheet.getRow(currentRow);
    row.height = 22;
    worksheet.mergeCells(currentRow, 1, currentRow, 5);
    const labelCell = row.getCell(1);
    labelCell.value = item.label;
    styleCell(labelCell, { bgColor: item.color, fontColor: item.textColor, bold: true, fontSize: 10 });

    worksheet.mergeCells(currentRow, 6, currentRow, COL_COUNT);
    const valCell = row.getCell(6);
    valCell.value = item.value;
    styleCell(valCell, { bgColor: item.color, fontColor: item.textColor, bold: true, fontSize: 10, numFmt: '#,##0' });
    currentRow++;
  });

  currentRow += 2;

  // === صف التوقيع ===
  worksheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  const footerRow = worksheet.getRow(currentRow);
  footerRow.height = 30;
  const footerCell = footerRow.getCell(1);
  footerCell.value = `تم إنشاء هذا الكشف بتاريخ ${new Date().toLocaleDateString('en-GB')} - نظام إدارة مشاريع البناء`;
  styleCell(footerCell, { bgColor: DARK_GREEN, fontColor: 'FFFFFFFF', fontSize: 9 });

  const buffer = await workbook.xlsx.writeBuffer();
  const safeProjectName = (projectName || 'مشروع').replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `كشف_مصروفات_يومي_${safeProjectName}_${reportDate || new Date().toISOString().split('T')[0]}.xlsx`;
  return await downloadExcelFile(buffer as ArrayBuffer, fileName);
}
