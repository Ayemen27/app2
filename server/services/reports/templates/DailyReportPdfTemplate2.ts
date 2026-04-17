import type { DailyReportData } from '../../../../shared/report-types';

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

interface Tx {
  type: string;
  category: string;
  amount: number;
  workDays?: number;
  workerName?: string;
  description: string;
  recipientName?: string;
  notes?: string;
}

function getAccountTypeLabel(type: string, category: string): string {
  if (category === 'رصيد سابق') return 'مرحل';
  if (type === 'income') return 'دخل';
  if (type === 'transfer_from_project') return 'دخل';
  if (category === 'أجور عمال') return 'أجور العمال';
  if (category === 'مواصلات') return 'مواصلات';
  if (category === 'حوالات عمال') return 'تنزيلات العمال';
  if (category === 'مشتريات مواد') return 'مشتريات';
  if (category === 'نثريات') return 'مصروفات';
  return 'مصروفات';
}

function getEntryName(t: Tx): string {
  if (t.category === 'رصيد سابق') return 'مرحل';
  if (t.category === 'عهدة' && t.description) return t.description;
  if (t.workerName && t.workerName !== 'غير محدد') return t.workerName;
  if (t.description) return t.description;
  if (t.recipientName) return t.recipientName;
  return t.category || '-';
}

function getRowBg(type: string, category: string, isNeg: boolean): string {
  if (category === 'رصيد سابق' && !isNeg) return '#d6ead7';
  if (category === 'رصيد سابق' && isNeg)  return '#fce4e4';
  if (type === 'transfer_from_project')     return '#fff0cc';
  if (type === 'income')                    return '#daeaf5';
  if (category === 'مشتريات مواد')          return '#eee8f8';
  return '';
}

function buildTransactions(data: DailyReportData, dateStr: string): Tx[] {
  const txs: Tx[] = [];

  const carried = Number(
    (data as any).carryForwardBalance ??
    (data as any).carriedForwardBalance ??
    (data.totals as any)?.carryForwardBalance ??
    0
  );

  if (carried !== 0) {
    const prevDateObj = new Date(dateStr);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const pd = prevDateObj.toISOString().split('T')[0];
    txs.push({
      type: carried >= 0 ? 'income' : 'expense',
      category: 'رصيد سابق',
      amount: Math.abs(carried),
      description: 'رصيد مرحل',
      notes: `مرحل من تاريخ ${pd}`,
    });
  }

  (data.fundTransfers || []).forEach((f: any) => {
    const noteParts: string[] = [];
    if (f.transferType && f.transferType !== '-') noteParts.push(`نوع: ${f.transferType}`);
    if (f.transferNumber && f.transferNumber !== '-') noteParts.push(`رقم الحوالة: ${f.transferNumber}`);
    txs.push({
      type: 'income',
      category: 'عهدة',
      amount: parseFloat(f.amount || '0'),
      description: `عهدة من ${f.senderName || 'غير محدد'}`,
      recipientName: f.senderName,
      notes: noteParts.join(' | ') || '',
    });
  });

  (data.attendance || []).forEach((a: any) => {
    const paid = parseFloat(a.paidAmount || '0');
    const payable = parseFloat(a.payableAmount || '0');
    txs.push({
      type: paid === 0 && payable > 0 ? 'deferred' : 'expense',
      category: 'أجور عمال',
      amount: paid,
      description: a.workDescription || 'أجر يومي',
      workerName: a.workerName || a.worker_name || 'غير محدد',
      workDays: parseFloat(a.workDays || a.work_days || '0') || undefined,
      notes: a.notes || a.workDescription || '',
    });
  });

  (data.materials || []).forEach((m: any) => {
    const isCash = (m.purchaseType || 'نقد') === 'نقد' || m.purchaseType === 'نقداً';
    if (!isCash) return;
    const paid = parseFloat(m.paidAmount || '0');
    const total = parseFloat(m.totalAmount || '0');
    txs.push({
      type: 'expense',
      category: 'مشتريات مواد',
      amount: paid > 0 ? paid : total,
      description: `شراء ${m.materialName || 'مادة'}`,
      notes: m.notes || m.materialName || m.supplier || m.supplierName || '',
    });
  });

  (data.transport || []).forEach((t: any) => {
    txs.push({
      type: 'expense',
      category: 'مواصلات',
      amount: parseFloat(t.amount || '0'),
      description: t.description || 'مصروف مواصلات',
      notes: t.notes || t.description || '',
    });
  });

  (data.miscExpenses || []).forEach((e: any) => {
    txs.push({
      type: 'expense',
      category: 'نثريات',
      amount: parseFloat(e.amount || '0'),
      description: e.description || 'مصروف متنوع',
      notes: e.notes || e.description || '',
    });
  });

  (data.workerTransfers || []).forEach((wt: any) => {
    txs.push({
      type: 'expense',
      category: 'حوالات عمال',
      amount: parseFloat(wt.amount || '0'),
      description: wt.notes || 'حوالة للعامل',
      workerName: wt.workerName || wt.worker_name || 'غير محدد',
      notes: wt.notes || wt.description || '',
    });
  });

  return txs;
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

  const allTxs = buildTransactions(data, dateStr);
  const opening = allTxs.filter(t => t.category === 'رصيد سابق');
  const income  = allTxs.filter(t => t.category !== 'رصيد سابق' && (t.type === 'income' || t.type === 'transfer_from_project'));
  const expense = allTxs.filter(t => t.category !== 'رصيد سابق' && t.type !== 'income' && t.type !== 'transfer_from_project');
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

    const bg       = getRowBg(t.type, t.category, isNegOpening);
    const bgStyle  = bg ? `background:${bg};` : (idx % 2 === 0 ? '' : 'background:#f5f5f5;');
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
