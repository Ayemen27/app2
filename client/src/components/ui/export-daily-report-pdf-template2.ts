import { generatePDF } from '@/utils/pdfGenerator';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project' | 'storage';
  category: string;
  amount: number;
  description: string;
  workDays?: number;
  dailyWage?: number;
  workerName?: string;
  recipientName?: string;
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
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year, monthName: HIJRI_MONTHS[month - 1] || '', dayName };
}

function getAccountType(type: string, category: string): string {
  if (category === 'رصيد سابق') return 'نقل';
  if (type === 'income' || type === 'transfer_from_project') return 'نقل';
  if (category === 'أجور عمال') return 'أجور العمال';
  if (category === 'مواصلات') return 'مواصلات';
  if (category === 'حوالات عمال') return 'تنزيلات العمال';
  if (category === 'نثريات' || category === 'مشتريات مواد') return 'مصروفات';
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

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export async function exportDailyReportPdfTemplate2(
  transactions: Transaction[],
  _totals: Totals,
  projectName?: string,
  reportDate?: string
): Promise<boolean> {
  const dateObj = reportDate
    ? (() => { const [y, m, d] = reportDate.split('-').map(Number); return new Date(y, m - 1, d, 12); })()
    : new Date();

  const hijri = gregorianToHijri(dateObj);
  const gFormatted = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
  const hijriStr = `${hijri.day} ${hijri.monthName} ${hijri.year}`;

  const opening = transactions.filter(t => t.category === 'رصيد سابق');
  const income  = transactions.filter(t => t.category !== 'رصيد سابق' && (t.type === 'income' || t.type === 'transfer_from_project'));
  const expense = transactions.filter(t => t.category !== 'رصيد سابق' && t.type !== 'income' && t.type !== 'transfer_from_project');
  const ordered = [...opening, ...income, ...expense];

  let running = 0;

  const rows = ordered.map((t, idx) => {
    const isOpening = t.category === 'رصيد سابق';
    const isIncome  = t.type === 'income' || t.type === 'transfer_from_project';
    const amt = t.amount || 0;

    if (isOpening || isIncome) running += amt;
    else running -= amt;

    let bg = idx % 2 === 0 ? '#ffffff' : '#f5f5f5';
    if (isOpening) bg = '#d6ead7';
    if (isIncome && !isOpening) bg = '#fff3e0';

    const notesVal = t.notes || (t.description && t.description !== getEntryName(t) ? t.description : '') || '';

    const fontW = isOpening ? 'bold' : 'normal';

    return `
      <tr style="background:${bg};">
        <td style="font-weight:${fontW};text-align:center;">${fmt(amt)}</td>
        <td style="text-align:center;">${getAccountType(t.type, t.category)}</td>
        <td style="text-align:right;">${getEntryName(t)}</td>
        <td style="text-align:center;">${t.workDays ?? ''}</td>
        <td style="text-align:center;font-weight:bold;color:${running < 0 ? '#c0392b' : '#145226'};">${fmt(running)}</td>
        <td style="text-align:right;font-size:10px;">${notesVal}</td>
      </tr>`;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Arial', sans-serif; background:#fff; direction:rtl; }
  .page { width:794px; padding:16px; }

  /* عنوان التقرير */
  .title-row {
    background:#1f7a3c; color:#fff; text-align:center;
    font-size:13px; font-weight:bold; padding:10px 8px;
    border:1px solid #999;
  }

  /* الجدول */
  table {
    width:100%; border-collapse:collapse;
    margin-top:0; font-size:11px;
  }
  th {
    background:#1f7a3c; color:#fff; font-weight:bold;
    padding:7px 5px; text-align:center;
    border:1px solid #999;
  }
  td {
    padding:6px 5px; border:1px solid #ccc;
    font-size:11px; vertical-align:middle;
  }
  tr:hover { background:#f0f0f0 !important; }

  /* صف المبلغ المتبقي */
  .remain-row td {
    background:#fa8072 !important;
    color:#7b1d0b;
    font-weight:bold;
    font-size:12px;
    border-color:#999;
  }
</style>
</head>
<body>
<div class="page">
  <div class="title-row">
    كشف مصروفات مشروع ${projectName || ''} الموافق ${gFormatted}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:12%;">المبلغ</th>
        <th style="width:14%;">نوع الحساب</th>
        <th style="width:22%;">الاسم</th>
        <th style="width:9%;">عدد الأيام</th>
        <th style="width:14%;">الرصيد التجميعي</th>
        <th style="width:29%;">ملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="remain-row">
        <td colspan="4" style="text-align:center;">المبلغ المتبقي</td>
        <td style="text-align:center;">${fmt(running)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>
</body>
</html>`;

  const safeProject = (projectName || 'مشروع').replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `كشف_مصروفات_يومي_${safeProject}_${reportDate || new Date().toISOString().split('T')[0]}.pdf`;

  return generatePDF({ html, filename: fileName, format: 'A4', orientation: 'portrait' });
}
