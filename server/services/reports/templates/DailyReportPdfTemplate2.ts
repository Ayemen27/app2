import type { DailyReportData } from '../../../../shared/report-types';
import {
  buildDailyTransactions,
  orderDailyTransactions,
  getAccountTypeLabel,
  getEntryName,
  getRowColors,
} from '../../../../shared/daily-transactions';

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

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function generateDailyReportTemplate2HTML(data: DailyReportData, dateStr: string): string {
  const dateObj = (() => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  })();

  const hijri = gregorianToHijri(dateObj);
  const gFormatted = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
  const hijriStr = `${hijri.dayName} ${hijri.day} ${hijri.monthName} ${hijri.year}`;
  const projectName = data.project?.name || '';

  const allTxs = buildDailyTransactions(data, dateStr);
  const ordered = orderDailyTransactions(allTxs);

  let running = 0;

  const rows = ordered.map((t, idx) => {
    const isOpening    = t.category === 'رصيد سابق';
    const isNegOpening = isOpening && t.type === 'expense';
    const amt          = t.amount || 0;

    if (isOpening && !isNegOpening) running += amt;
    else if (isNegOpening)          running -= amt;
    else if (t.type === 'income' || t.type === 'transfer_from_project') running += amt;
    else running -= amt;

    const colors   = getRowColors(t.type, t.category, isNegOpening);
    const bgStyle  = colors ? `background:${colors.bg};` : (idx % 2 === 0 ? '' : 'background:#f5f5f5;');
    const fontW    = isOpening ? 'font-weight:bold;' : '';
    const runColor = running < 0 ? '#c0392b' : '#145226';
    const notesVal = t.notes || (t.description && t.description !== getEntryName(t) ? t.description : '') || '';
    const name     = getEntryName(t);
    const acctType = getAccountTypeLabel(t.type, t.category);

    return `<tr style="${bgStyle}${fontW}">
      <td style="text-align:center;">${fmt(amt)}</td>
      <td style="text-align:center;">${acctType}</td>
      <td style="text-align:right;">${name}</td>
      <td style="text-align:center;">${t.workDays != null ? t.workDays : ''}</td>
      <td style="text-align:center;font-weight:bold;color:${runColor};">${fmt(running)}</td>
      <td style="text-align:right;font-size:9pt;">${notesVal}</td>
    </tr>`;
  }).join('\n');

  const runColor = running < 0 ? '#c0392b' : '#7b1d0b';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4; margin: 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Tahoma, sans-serif; background:#fff; direction:rtl; font-size:10pt; }
  .title-row {
    background:#1f7a3c; color:#fff; text-align:center;
    font-size:12pt; font-weight:bold; padding:8px;
    border:1px solid #999;
  }
  .legend {
    padding:4px 8px; font-size:8pt; border:1px solid #ccc; border-top:none;
    background:#fafafa;
  }
  .legend span { margin-left:12px; }
  .leg-box { display:inline-block; width:10px; height:10px; border:1px solid #aaa; vertical-align:middle; margin-left:3px; }
  table { width:100%; border-collapse:collapse; margin-top:0; font-size:9.5pt; }
  th {
    background:#1f7a3c; color:#fff; font-weight:bold;
    padding:6px 4px; text-align:center; border:1px solid #999;
  }
  td { padding:5px 4px; border:1px solid #ccc; vertical-align:middle; }
  .remain-row td {
    background:#fa8072 !important; color:${runColor};
    font-weight:bold; font-size:11pt; border-color:#999;
  }
</style>
</head>
<body>
<div class="title-row">كشف مصروفات مشروع ${projectName} الموافق ${gFormatted}</div>
<div class="legend">
  <span><span class="leg-box" style="background:#d6ead7;"></span> رصيد مرحل موجب</span>
  <span><span class="leg-box" style="background:#fce4e4;"></span> رصيد مرحل سالب</span>
  <span><span class="leg-box" style="background:#daeaf5;"></span> دخل (عهدة/أموال واردة)</span>
  <span><span class="leg-box" style="background:#fff0cc;"></span> ترحيل بين مشاريع</span>
  <span><span class="leg-box" style="background:#eee8f8;"></span> مشتريات مواد</span>
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
      <td style="text-align:center;color:${runColor};">${fmt(running)}</td>
      <td></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
}
