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
  if (type === 'income') return 'دخل';
  if (type === 'transfer_from_project') return 'دخل';
  if (category === 'أجور عمال') return 'أجور العمال';
  if (category === 'مواصلات') return 'مواصلات';
  if (category === 'حوالات عمال') return 'تنزيلات العمال';
  if (category === 'مشتريات مواد') return 'مشتريات';
  if (category === 'نثريات') return 'مصروفات';
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

function getRowBg(t: Transaction, idx: number): string {
  const isOpening      = t.category === 'رصيد سابق';
  const isNegOpening   = isOpening && t.type === 'expense';
  const isTransferProj = t.type === 'transfer_from_project';
  const isRegIncome    = !isOpening && t.type === 'income' && !isTransferProj;
  const isMaterial     = t.category === 'مشتريات مواد';

  if (isOpening && !isNegOpening) return '#ECFDF5';  // emerald-50
  if (isNegOpening)               return '#FEE2E2';  // rose-100
  if (isTransferProj)             return '#FEF3C7';  // amber-100
  if (isRegIncome)                return '#EFF6FF';  // blue-50
  if (isMaterial)                 return '#EDE9FE';  // violet-100
  return idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';      // slate-50 zebra
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
  const hijriStr = `${hijri.dayName} ${hijri.day} ${hijri.monthName} ${hijri.year}`;

  const opening = transactions.filter(t => t.category === 'رصيد سابق');
  const income  = transactions.filter(t => t.category !== 'رصيد سابق' && (t.type === 'income' || t.type === 'transfer_from_project'));
  const expense = transactions.filter(t => t.category !== 'رصيد سابق' && t.type !== 'income' && t.type !== 'transfer_from_project');
  const ordered = [...opening, ...income, ...expense];

  let running = 0;

  const rows = ordered.map((t, idx) => {
    const isOpening    = t.category === 'رصيد سابق';
    const isNegOpening = isOpening && t.type === 'expense';
    const amt          = t.amount || 0;

    if (isOpening && !isNegOpening) running += amt;
    else if (isNegOpening)          running -= amt;
    else if (t.type === 'income' || t.type === 'transfer_from_project') running += amt;
    else running -= amt;

    const bg      = getRowBg(t, idx);
    const fontW   = isOpening ? 'bold' : 'normal';
    const runColor = running < 0 ? '#c0392b' : '#145226';
    const notesVal = t.notes || (t.description && t.description !== getEntryName(t) ? t.description : '') || '';

    return `
      <tr style="background:${bg};">
        <td style="font-weight:${fontW};text-align:center;">${fmt(amt)}</td>
        <td style="text-align:center;">${getAccountType(t.type, t.category)}</td>
        <td style="text-align:right;">${getEntryName(t)}</td>
        <td style="text-align:center;">${t.workDays ?? ''}</td>
        <td style="text-align:center;font-weight:bold;color:${runColor};">${fmt(running)}</td>
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
  body { font-family: 'Cairo', 'Arial', sans-serif; background:#fff; direction:rtl; color:#0F172A; }
  .page { width:794px; padding:16px; }
  .company-row {
    background:#1E3A8A; color:#fff; text-align:center;
    font-size:14px; font-weight:bold; padding:10px 8px;
    border:1px solid #1E2A6B; letter-spacing:0.3px;
  }
  .title-row {
    background:#334155; color:#fff; text-align:center;
    font-size:12px; font-weight:bold; padding:8px 8px;
    border:1px solid #1E2A6B; border-top:none;
  }
  .hijri-row {
    background:#475569; color:#fff; text-align:center;
    font-size:10px; padding:5px 8px;
    border:1px solid #1E2A6B; border-top:none;
  }
  .legend {
    display:flex; gap:12px; flex-wrap:wrap;
    padding:6px 8px; font-size:9px; border:1px solid #CBD5E1; border-top:none;
    background:#F8FAFC; color:#334155;
  }
  .legend-item { display:flex; align-items:center; gap:4px; }
  .legend-box { width:12px; height:12px; border:1px solid #CBD5E1; display:inline-block; }
  table {
    width:100%; border-collapse:collapse;
    margin-top:0; font-size:11px;
  }
  th {
    background:#1E3A8A; color:#fff; font-weight:bold;
    padding:7px 5px; text-align:center;
    border:1px solid #1E2A6B;
  }
  td {
    padding:6px 5px; border:1px solid #E2E8F0;
    font-size:11px; vertical-align:middle;
  }
  .remain-row td {
    background:#334155 !important;
    color:#FFFFFF;
    font-weight:bold;
    font-size:12px;
    border-color:#1E2A6B;
  }
</style>
</head>
<body>
<div class="page">
  <div class="company-row">الفتيني للمقاولات العامة والاستشارات الهندسية</div>
  <div class="title-row">كشف مصروفات مشروع ${projectName || ''} الموافق ${gFormatted}</div>
  <div class="hijri-row">${hijriStr}</div>
  <div class="legend">
    <span class="legend-item"><span class="legend-box" style="background:#ECFDF5;"></span> رصيد مرحل موجب</span>
    <span class="legend-item"><span class="legend-box" style="background:#FEE2E2;"></span> رصيد مرحل سالب</span>
    <span class="legend-item"><span class="legend-box" style="background:#EFF6FF;"></span> دخل (عهدة/أموال واردة)</span>
    <span class="legend-item"><span class="legend-box" style="background:#FEF3C7;"></span> ترحيل بين مشاريع</span>
    <span class="legend-item"><span class="legend-box" style="background:#EDE9FE;"></span> مشتريات مواد</span>
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
        <td style="text-align:center;color:${running < 0 ? '#FCA5A5' : '#6EE7B7'};">${fmt(running)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>
</body>
</html>`;

  const safeProject = (projectName || 'مشروع').replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `كشف_مصروفات_يومي_${safeProject}_${reportDate || new Date().toISOString().split('T')[0]}`;

  return generatePDF({ html, filename: fileName, format: 'A4', orientation: 'portrait' });
}
