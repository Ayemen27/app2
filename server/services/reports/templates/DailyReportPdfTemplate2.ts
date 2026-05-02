import type { DailyReportData } from '../../../../shared/report-types';
import {
  buildDailyTransactions,
  orderDailyTransactions,
  mergeWorkerWageAndTransferForTemplate,
  getAccountTypeLabel,
  getEntryName,
  getRowColors,
} from '../../../../shared/daily-transactions';
import { pdfWrap, pdfHeader, pdfSignatures } from './shared-styles';
import { currentReportHeader } from './header-context';

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
  // 🔀 دمج صرفة العامل + حوالة العامل لنفس العامل في صف واحد (في القالب فقط)
  const merged = mergeWorkerWageAndTransferForTemplate(allTxs);
  const ordered = orderDailyTransactions(merged);

  let running = 0;

  const rows = ordered.map((t: any, idx) => {
    const isOpening    = t.category === 'رصيد سابق';
    const isNegOpening = isOpening && t.type === 'expense';
    const amt          = t.amount || 0;
    // للمواد الآجل: المبلغ المعروض هو _displayAmount لكن لا يُخصم من الرصيد
    const displayAmt   = t._displayAmount != null ? t._displayAmount : amt;
    const isDeferred   = t.type === 'deferred' && t.category === 'مشتريات مواد';

    if (isOpening && !isNegOpening) running += amt;
    else if (isNegOpening)          running -= amt;
    else if (t.type === 'income' || t.type === 'transfer_from_project') running += amt;
    else running -= amt;

    const colors   = getRowColors(t.type, t.category, isNegOpening);
    // المواد الآجل: لون مميز أفتح
    const bgStyle  = isDeferred
      ? 'background:#f3f0fc;'
      : colors ? `background:${colors.bg};` : (idx % 2 === 0 ? '' : 'background:#f5f5f5;');
    const fontW    = isOpening ? 'font-weight:bold;' : '';
    const runColor = running < 0 ? '#c0392b' : '#145226';
    const notesVal = t.notes || (t.description && t.description !== getEntryName(t) ? t.description : '') || '';
    const name     = getEntryName(t);
    const acctType = isDeferred ? 'مشتريات (آجل)' : getAccountTypeLabel(t.type, t.category);
    // للآجل: عرض المبلغ الحقيقي بلون رمادي (غير مخصوم)
    const amtStyle = isDeferred ? 'color:#7c6f9e;font-style:italic;' : '';

    return `<tr style="${bgStyle}${fontW}">
      <td style="text-align:center;${amtStyle}">${displayAmt > 0 ? fmt(displayAmt) : '—'}</td>
      <td style="text-align:center;">${acctType}</td>
      <td style="text-align:right;">${name}</td>
      <td style="text-align:center;">${t.workDays != null ? t.workDays : ''}</td>
      <td style="text-align:center;font-weight:bold;color:${runColor};">${fmt(running)}</td>
      <td style="text-align:right;font-size:9pt;">${notesVal}</td>
    </tr>`;
  }).join('\n');

  const runColor = running < 0 ? '#c0392b' : '#7b1d0b';
  const h = currentReportHeader();
  const cPrimary = h.primary_color || '#15807F';
  const cSecondary = h.secondary_color || '#0F6B6B';

  const body = `
${pdfHeader(`كشف مصروفات مشروع ${projectName} الموافق ${gFormatted}`)}
<div class="legend" style="padding:4px 8px;font-size:8pt;border:1px solid #ccc;background:#fafafa;margin:0 0 6px 0;">
  <span style="margin-left:12px;"><span style="display:inline-block;width:10px;height:10px;border:1px solid #aaa;background:#d6ead7;vertical-align:middle;margin-left:3px;"></span> رصيد مرحل موجب</span>
  <span style="margin-left:12px;"><span style="display:inline-block;width:10px;height:10px;border:1px solid #aaa;background:#fce4e4;vertical-align:middle;margin-left:3px;"></span> رصيد مرحل سالب</span>
  <span style="margin-left:12px;"><span style="display:inline-block;width:10px;height:10px;border:1px solid #aaa;background:#daeaf5;vertical-align:middle;margin-left:3px;"></span> دخل (عهدة/أموال واردة)</span>
  <span style="margin-left:12px;"><span style="display:inline-block;width:10px;height:10px;border:1px solid #aaa;background:#fff0cc;vertical-align:middle;margin-left:3px;"></span> ترحيل بين مشاريع</span>
  <span style="margin-left:12px;"><span style="display:inline-block;width:10px;height:10px;border:1px solid #aaa;background:#eee8f8;vertical-align:middle;margin-left:3px;"></span> مشتريات مواد (نقد)</span>
  <span style="margin-left:12px;"><span style="display:inline-block;width:10px;height:10px;border:1px solid #aaa;background:#f3f0fc;vertical-align:middle;margin-left:3px;"></span> مشتريات مواد (آجل — لا تُخصم من الرصيد)</span>
</div>
<table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
  <thead>
    <tr>
      <th style="width:12%;background:${cPrimary};color:#fff;font-weight:bold;padding:6px 4px;text-align:center;border:1px solid ${cSecondary};">المبلغ</th>
      <th style="width:14%;background:${cPrimary};color:#fff;font-weight:bold;padding:6px 4px;text-align:center;border:1px solid ${cSecondary};">نوع الحساب</th>
      <th style="width:22%;background:${cPrimary};color:#fff;font-weight:bold;padding:6px 4px;text-align:center;border:1px solid ${cSecondary};">الاسم</th>
      <th style="width:9%;background:${cPrimary};color:#fff;font-weight:bold;padding:6px 4px;text-align:center;border:1px solid ${cSecondary};">عدد الأيام</th>
      <th style="width:14%;background:${cPrimary};color:#fff;font-weight:bold;padding:6px 4px;text-align:center;border:1px solid ${cSecondary};">الرصيد التجميعي</th>
      <th style="width:29%;background:${cPrimary};color:#fff;font-weight:bold;padding:6px 4px;text-align:center;border:1px solid ${cSecondary};">ملاحظات</th>
    </tr>
  </thead>
  <tbody>
${rows}
    <tr>
      <td colspan="4" style="text-align:center;background:#fa8072;color:${runColor};font-weight:bold;font-size:11pt;border:1px solid #999;padding:5px 4px;">المبلغ المتبقي</td>
      <td style="text-align:center;background:#fa8072;color:${runColor};font-weight:bold;font-size:11pt;border:1px solid #999;padding:5px 4px;">${fmt(running)}</td>
      <td style="background:#fa8072;border:1px solid #999;padding:5px 4px;"></td>
    </tr>
  </tbody>
</table>
${pdfSignatures([
  { title: 'المهندس المسؤول', name: data.project?.engineerName },
  { title: 'المدير', name: data.project?.managerName },
  { title: 'المحاسب', name: currentReportHeader().accountant_name || undefined },
])}`;

  return pdfWrap(`كشف مصروفات ${projectName}`, body);
}
