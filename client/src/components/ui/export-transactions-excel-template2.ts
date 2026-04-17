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
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
  ];

  const dayName = DAY_NAMES_AR[date.getDay()];

  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { day, month, year, monthName: HIJRI_MONTHS[month - 1] || '', dayName };
}

function getAccountTypeLabel(type: string, category: string): string {
  if (category === 'رصيد سابق') return 'نقل';
  if (type === 'income' || type === 'transfer_from_project') return 'نقل';
  if (category === 'أجور عمال') return 'أجور العمال';
  if (category === 'مواصلات') return 'مواصلات';
  if (category === 'حوالات عمال') return 'تنزيلات العمال';
  if (category === 'نثريات') return 'مصروفات';
  if (category === 'مشتريات مواد') return 'مصروفات';
  if (type === 'deferred') return 'آجل';
  return 'مصروفات';
}

function getEntryName(t: Transaction): string {
  if (t.category === 'رصيد سابق') return 'مرحل';
  if (t.category === 'عهدة' && t.description) return t.description;
  if (t.workerName && t.workerName !== 'غير محدد') return t.workerName;
  if (t.description) return t.description;
  if (t.recipientName) return t.recipientName;
  return t.category || '-';
}

function border(cell: any) {
  cell.border = {
    top:    { style: 'thin', color: { argb: 'FF999999' } },
    bottom: { style: 'thin', color: { argb: 'FF999999' } },
    left:   { style: 'thin', color: { argb: 'FF999999' } },
    right:  { style: 'thin', color: { argb: 'FF999999' } },
  };
}

function style(
  cell: any,
  opts: {
    bg?: string;
    fc?: string;
    bold?: boolean;
    size?: number;
    align?: 'left' | 'center' | 'right';
    fmt?: string;
    wrap?: boolean;
  }
) {
  if (opts.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
  cell.font = {
    bold: opts.bold ?? false,
    size: opts.size ?? 10,
    color: { argb: opts.fc ?? 'FF000000' },
    name: 'Arial',
  };
  cell.alignment = {
    horizontal: opts.align ?? 'center',
    vertical: 'middle',
    readingOrder: 2,
    wrapText: opts.wrap ?? false,
  };
  if (opts.fmt) cell.numFmt = opts.fmt;
  border(cell);
}

export async function exportTransactionsToExcelTemplate2(
  transactions: Transaction[],
  totals: Totals,
  projectName?: string,
  reportDate?: string
): Promise<boolean> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AXION';
  wb.created = new Date();

  const ws = wb.addWorksheet('كشف المصروفات اليومي', {
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

  const COL = 6;

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 24;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 30;

  const dateObj = reportDate
    ? (() => { const [y, m, d] = reportDate.split('-').map(Number); return new Date(y, m - 1, d, 12); })()
    : new Date();

  const hijri = gregorianToHijri(dateObj);
  const gFormatted = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
  const hijriStr = `${hijri.day} ${hijri.monthName} ${hijri.year}`;

  const GREEN  = 'FF1F7A3C';
  const WHITE  = 'FFFFFFFF';
  const GREY   = 'FFF5F5F5';
  const GREEN_MUTED = 'FFD6EAD7';
  const ORANGE_INCOME = 'FFFFF3E0';
  const SALMON = 'FFFA8072';
  const SALMON_LIGHT = 'FFFCE4D6';

  let r = 1;

  // ── صف 1: عنوان التقرير ───────────────────────────────────────────────────
  ws.mergeCells(r, 1, r, COL);
  const titleCell = ws.getRow(r).getCell(1);
  titleCell.value = `كشف مصروفات مشروع ${projectName || ''} الموافق ${gFormatted}`;
  style(titleCell, { bg: GREEN, fc: 'FFFFFFFF', bold: true, size: 12 });
  ws.getRow(r).height = 30;
  r++;

  // ── صف 2: رؤوس الأعمدة ───────────────────────────────────────────────────
  const HEADERS = ['المبلغ', 'نوع الحساب', 'الاسم', 'عدد الأيام', 'الرصيد التجميعي', 'ملاحظات'];
  ws.getRow(r).height = 22;
  HEADERS.forEach((h, i) => {
    const c = ws.getRow(r).getCell(i + 1);
    c.value = h;
    style(c, { bg: GREEN, fc: 'FFFFFFFF', bold: true });
  });
  r++;

  // ── ترتيب البيانات ────────────────────────────────────────────────────────
  const opening = transactions.filter(t => t.category === 'رصيد سابق');
  const income  = transactions.filter(t => t.category !== 'رصيد سابق' && (t.type === 'income' || t.type === 'transfer_from_project'));
  const expense = transactions.filter(t => t.category !== 'رصيد سابق' && t.type !== 'income' && t.type !== 'transfer_from_project');
  const ordered = [...opening, ...income, ...expense];

  let running = 0;

  ordered.forEach((t, idx) => {
    const isOpening = t.category === 'رصيد سابق';
    const isIncome  = t.type === 'income' || t.type === 'transfer_from_project';
    const amt = t.amount || 0;

    if (isOpening || isIncome) running += amt;
    else running -= amt;

    const row = ws.getRow(r);
    row.height = 20;

    let bg = idx % 2 === 0 ? WHITE : GREY;
    if (isOpening)                bg = GREEN_MUTED;
    if (isIncome && !isOpening)   bg = ORANGE_INCOME;

    const notesVal = t.notes || (t.description && t.description !== getEntryName(t) ? t.description : '') || '';

    const rowData = [
      amt,
      getAccountTypeLabel(t.type, t.category),
      getEntryName(t),
      t.workDays ?? null,
      running,
      notesVal,
    ];

    rowData.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val;
      style(cell, {
        bg,
        bold: isOpening,
        size: 10,
        fmt: (ci === 0 || ci === 4) && typeof val === 'number' ? '#,##0' : undefined,
        align: ci === 2 || ci === 5 ? 'right' : 'center',
        wrap: ci === 5,
      });
    });

    r++;
  });

  // ── صف المبلغ المتبقي (سلموني) ───────────────────────────────────────────
  ws.getRow(r).height = 24;

  ws.mergeCells(r, 1, r, 4);
  const lblCell = ws.getRow(r).getCell(1);
  lblCell.value = 'المبلغ المتبقي';
  style(lblCell, { bg: SALMON, fc: 'FF7B1D0B', bold: true, size: 11 });

  const valCell = ws.getRow(r).getCell(5);
  valCell.value = running;
  style(valCell, { bg: SALMON, fc: 'FF7B1D0B', bold: true, size: 11, fmt: '#,##0' });

  const extCell = ws.getRow(r).getCell(6);
  extCell.value = '';
  style(extCell, { bg: SALMON_LIGHT });
  r++;

  const buf = await wb.xlsx.writeBuffer();
  const safeName = (projectName || 'مشروع').replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `كشف_مصروفات_يومي_${safeName}_${reportDate || new Date().toISOString().split('T')[0]}.xlsx`;
  return await downloadExcelFile(buf as ArrayBuffer, fileName);
}
