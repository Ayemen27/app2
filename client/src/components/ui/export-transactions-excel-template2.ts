import { downloadExcelFile } from '@/utils/webview-download';
import { getBranding, hexNoHash , ensureBrandingLoaded } from '@/lib/report-branding';
import { buildExcelLetterhead, buildExcelLetterheadFooter } from '@/lib/excel-exports';

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


function getAccountTypeLabel(type: string, category: string): string {
  if (category === 'رصيد سابق') return 'مرحل';
  if (type === 'income') return 'دخل';
  if (type === 'transfer_from_project') return 'دخل';
  if (category === 'أجور عمال') return 'أجور العمال';
  if (category === 'مواصلات') return 'مواصلات';
  if (category === 'حوالات عمال') return 'تنزيلات العمال';
  if (category === 'نثريات') return 'مصروفات';
  if (category === 'مشتريات مواد') return 'مشتريات';
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
  await ensureBrandingLoaded();
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

  const gFormatted = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');

  // 🎨 الهوية البصرية الموحدة — تُقرأ من إعدادات المستخدم (report-branding)
  const _b = getBranding();
  const MAIN_BLUE    = 'FF' + hexNoHash(_b.primaryColor);
  const SLATE        = 'FF' + hexNoHash(_b.secondaryColor);
  const WHITE        = 'FFFFFFFF';
  const GREY         = 'FFF8FAFC';
  const GREEN_MUTED  = 'FFECFDF5';
  const RED_MUTED    = 'FFFEE2E2';
  const INCOME_BG    = 'FFEFF6FF';
  const TRANSFER_BG  = 'FFFEF3C7';
  const MATERIAL_BG  = 'FFEDE9FE';
  const TOTAL_BG     = SLATE;
  const TOTAL_BG_ALT = 'FFE2E8F0';

  // 🏛️ الترويسة الموحَّدة (مطابقة لكل التقارير) — تتضمن الشعار المُكبَّر
  // وبيانات الشركة وعنوان التقرير وتاريخ الاستخراج تلقائياً.
  const reportTitle = `كشف مصروفات مشروع ${projectName || ''} الموافق ${gFormatted}`;
  let r = buildExcelLetterhead(wb, ws, COL, reportTitle);

  const HEADERS = ['المبلغ', 'نوع الحساب', 'الاسم', 'عدد الأيام', 'الرصيد التجميعي', 'ملاحظات'];
  ws.getRow(r).height = 22;
  HEADERS.forEach((h, i) => {
    const c = ws.getRow(r).getCell(i + 1);
    c.value = h;
    style(c, { bg: MAIN_BLUE, fc: 'FFFFFFFF', bold: true });
  });
  r++;

  const opening = transactions.filter(t => t.category === 'رصيد سابق');
  const income  = transactions.filter(t => t.category !== 'رصيد سابق' && (t.type === 'income' || t.type === 'transfer_from_project'));
  const expense = transactions.filter(t => t.category !== 'رصيد سابق' && t.type !== 'income' && t.type !== 'transfer_from_project');
  const ordered = [...opening, ...income, ...expense];

  let running = 0;

  ordered.forEach((t, idx) => {
    const isOpening        = t.category === 'رصيد سابق';
    const isNegOpening     = isOpening && t.type === 'expense';
    const isTransferProj   = t.type === 'transfer_from_project';
    const isRegIncome      = !isOpening && t.type === 'income' && !isTransferProj;
    const isMaterial       = t.category === 'مشتريات مواد';
    const amt              = t.amount || 0;

    if (isOpening && !isNegOpening) running += amt;
    else if (isOpening && isNegOpening) running -= amt;
    else if (t.type === 'income' || t.type === 'transfer_from_project') running += amt;
    else running -= amt;

    const row = ws.getRow(r);
    row.height = 20;

    let bg: string;
    if (isOpening && !isNegOpening)  bg = GREEN_MUTED;
    else if (isNegOpening)            bg = RED_MUTED;
    else if (isTransferProj)          bg = TRANSFER_BG;
    else if (isRegIncome)             bg = INCOME_BG;
    else if (isMaterial)              bg = MATERIAL_BG;
    else                              bg = idx % 2 === 0 ? WHITE : GREY;

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
      const isRunningNeg = ci === 4 && running < 0;
      style(cell, {
        bg,
        bold: isOpening,
        fc: isRunningNeg ? 'FFCC0000' : undefined,
        size: 10,
        fmt: (ci === 0 || ci === 4) && typeof val === 'number' ? '#,##0' : undefined,
        align: ci === 2 || ci === 5 ? 'right' : 'center',
        wrap: ci === 5,
      });
    });

    r++;
  });

  ws.getRow(r).height = 24;

  ws.mergeCells(r, 1, r, 4);
  const lblCell = ws.getRow(r).getCell(1);
  lblCell.value = 'المبلغ المتبقي';
  style(lblCell, { bg: TOTAL_BG, fc: 'FFFFFFFF', bold: true, size: 11 });

  const valCell = ws.getRow(r).getCell(5);
  valCell.value = running;
  style(valCell, { bg: TOTAL_BG, fc: running < 0 ? 'FFFCA5A5' : 'FF6EE7B7', bold: true, size: 11, fmt: '#,##0' });

  const extCell = ws.getRow(r).getCell(6);
  extCell.value = '';
  style(extCell, { bg: TOTAL_BG_ALT });
  r++;

  // 🦶 تذييل موحَّد — يضم اسم المهندس المسؤول وبيانات الاتصال
  buildExcelLetterheadFooter(ws, r + 1, COL);

  const buf = await wb.xlsx.writeBuffer();
  const safeName = (projectName || 'مشروع').replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `كشف_مصروفات_يومي_${safeName}_${reportDate || new Date().toISOString().split('T')[0]}.xlsx`;
  return await downloadExcelFile(buf as ArrayBuffer, fileName);
}
