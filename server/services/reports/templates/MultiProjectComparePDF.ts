/**
 * قالب HTML/PDF: مقارنة العمالة والتكاليف بين مشاريع متعددة — ورقة واحدة
 */
import type { MultiProjectFinalReportData } from '../../../../shared/report-types';
import {
  escapeHtml, formatNum, formatDateBR, PDF_COLORS,
  pdfHeader, pdfInfoBar, pdfSectionTitle, pdfFooter, pdfWrap,
} from './shared-styles';

// ─── ألوان المشاريع ──────────────────────────────────────────────────────────
const PROJ_COLORS = [
  '#2E5090', '#2E7D32', '#AD1457', '#E65100', '#4527A0', '#00695C',
];
function projColor(i: number) { return PROJ_COLORS[i % PROJ_COLORS.length]; }

export function generateMultiProjectCompareHTML(data: MultiProjectFinalReportData): string {
  const projects = data.projects;
  const N = projects.length;

  // ─── بناء pivot العمال ─────────────────────────────────────────────────────
  interface ProjData { days: number; earned: number; paid: number }
  interface WorkerPivot { name: string; type: string; projects: Record<string, ProjData>; totalDays: number; totalEarned: number; totalPaid: number }

  const workerMap = new Map<string, WorkerPivot>();
  for (const w of data.combinedSections.attendance.byWorker) {
    const key = w.workerName;
    if (!workerMap.has(key)) {
      workerMap.set(key, { name: w.workerName, type: w.workerType || '-', projects: {}, totalDays: 0, totalEarned: 0, totalPaid: 0 });
    }
    const wp = workerMap.get(key)!;
    const paid = w.totalPaid ?? ((w.totalDirectPaid ?? 0) + (w.totalTransfers ?? 0));
    wp.projects[String(w.projectId)] = { days: w.totalDays || 0, earned: w.totalEarned || 0, paid };
    wp.totalDays += w.totalDays || 0;
    wp.totalEarned += w.totalEarned || 0;
    wp.totalPaid += paid;
  }
  const workers = [...workerMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  // ─── حساب إجماليات الأعمدة ───────────────────────────────────────────────
  const colTotals: Record<string, ProjData> = {};
  let grandDays = 0, grandEarned = 0, grandPaid = 0;
  for (const w of workers) {
    for (let p = 0; p < N; p++) {
      const pid = String(projects[p].projectId);
      if (!colTotals[pid]) colTotals[pid] = { days: 0, earned: 0, paid: 0 };
      const pd = w.projects[pid];
      if (pd) { colTotals[pid].days += pd.days; colTotals[pid].earned += pd.earned; colTotals[pid].paid += pd.paid; }
    }
    grandDays += w.totalDays;
    grandEarned += w.totalEarned;
    grandPaid += w.totalPaid;
  }

  let body = '';

  // ─── رأس التقرير ─────────────────────────────────────────────────────────
  body += pdfHeader('الفتيني للمقاولات العامة والاستشارات الهندسية', 'جدول مقارنة العمالة الموحّد — ورقة واحدة');
  body += pdfInfoBar(
    [`<b>المشاريع:</b> ${data.projectNames.map(n => escapeHtml(n)).join(' ، ')}`],
    [`<b>الفترة من:</b> ${formatDateBR(data.period.from)}`, `<b>الفترة إلى:</b> ${formatDateBR(data.period.to)}`]
  );

  // ─── مفتاح ألوان المشاريع ─────────────────────────────────────────────────
  body += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">`;
  projects.forEach((p, i) => {
    body += `<span style="display:inline-flex;align-items:center;gap:4px;background:${projColor(i)};color:#fff;padding:3px 8px;border-radius:12px;font-size:9px;font-weight:700;">● ${escapeHtml(p.projectName)}</span>`;
  });
  body += `</div>`;

  // ─── جدول pivot العمال ────────────────────────────────────────────────────
  body += pdfSectionTitle('جدول العمالة الموحّد — ورقة واحدة');

  // أنماط CSS خاصة بالجدول
  const tableStyle = `width:100%;border-collapse:collapse;font-size:8.5px;margin-bottom:0;`;
  const thBase = `border:1px solid #fff;padding:4px 3px;text-align:center;color:#fff;font-weight:700;white-space:nowrap;`;
  const tdBase = `border:1px solid ${PDF_COLORS.border};padding:3px 3px;text-align:center;`;

  body += `<div style="overflow-x:auto;">`;
  body += `<table style="${tableStyle}">`;

  // ─── رأس 1: أسماء المشاريع ────────────────────────────────────────────────
  body += `<thead><tr>`;
  body += `<th rowspan="2" style="${thBase}background:${PDF_COLORS.navy};text-align:right;padding-right:6px;min-width:90px;">اسم العامل</th>`;
  body += `<th rowspan="2" style="${thBase}background:${PDF_COLORS.navy};min-width:55px;">النوع</th>`;
  projects.forEach((p, i) => {
    body += `<th colspan="3" style="${thBase}background:${projColor(i)};">${escapeHtml(p.projectName)}</th>`;
  });
  body += `<th colspan="3" style="${thBase}background:${PDF_COLORS.navy};">الإجمالي</th>`;
  body += `</tr>`;

  // ─── رأس 2: أيام / مستحق / مدفوع ────────────────────────────────────────
  body += `<tr>`;
  projects.forEach((_, i) => {
    body += `<th style="${thBase}background:${projColor(i)};opacity:0.85;font-size:8px;">أيام</th>`;
    body += `<th style="${thBase}background:${projColor(i)};opacity:0.85;font-size:8px;">مستحق</th>`;
    body += `<th style="${thBase}background:${projColor(i)};opacity:0.85;font-size:8px;">مدفوع</th>`;
  });
  body += `<th style="${thBase}background:${PDF_COLORS.navy};font-size:8px;">أيام</th>`;
  body += `<th style="${thBase}background:${PDF_COLORS.navy};font-size:8px;">مستحق</th>`;
  body += `<th style="${thBase}background:${PDF_COLORS.navy};font-size:8px;">مدفوع</th>`;
  body += `</tr></thead>`;

  // ─── صفوف البيانات ───────────────────────────────────────────────────────
  body += `<tbody>`;
  workers.forEach((w, idx) => {
    const bg = idx % 2 === 1 ? `background:${PDF_COLORS.altRow};` : '';
    body += `<tr>`;
    body += `<td style="${tdBase}${bg}text-align:right;padding-right:6px;font-weight:600;">${escapeHtml(w.name)}</td>`;
    body += `<td style="${tdBase}${bg}color:${PDF_COLORS.textMuted};">${escapeHtml(w.type)}</td>`;
    projects.forEach(p => {
      const pid = String(p.projectId);
      const pd = w.projects[pid];
      if (pd) {
        body += `<td style="${tdBase}${bg}font-weight:600;color:${PDF_COLORS.navy};">${pd.days}</td>`;
        body += `<td style="${tdBase}${bg}color:${PDF_COLORS.amber};">${formatNum(pd.earned)}</td>`;
        body += `<td style="${tdBase}${bg}color:${PDF_COLORS.green};font-weight:600;">${formatNum(pd.paid)}</td>`;
      } else {
        body += `<td style="${tdBase}${bg}color:${PDF_COLORS.textMuted};">—</td>`;
        body += `<td style="${tdBase}${bg}color:${PDF_COLORS.textMuted};">—</td>`;
        body += `<td style="${tdBase}${bg}color:${PDF_COLORS.textMuted};">—</td>`;
      }
    });
    body += `<td style="${tdBase}background:${PDF_COLORS.totalBg};font-weight:700;color:${PDF_COLORS.navy};">${w.totalDays}</td>`;
    body += `<td style="${tdBase}background:${PDF_COLORS.totalBg};font-weight:700;color:${PDF_COLORS.amber};">${formatNum(w.totalEarned)}</td>`;
    body += `<td style="${tdBase}background:${PDF_COLORS.totalBg};font-weight:700;color:${PDF_COLORS.green};">${formatNum(w.totalPaid)}</td>`;
    body += `</tr>`;
  });
  body += `</tbody>`;

  // ─── صف الإجماليات ────────────────────────────────────────────────────────
  body += `<tfoot><tr>`;
  body += `<td colspan="2" style="${tdBase}background:${PDF_COLORS.navy};color:#fff;font-weight:800;text-align:center;">الإجمالي العام</td>`;
  projects.forEach(p => {
    const ct = colTotals[String(p.projectId)] || { days: 0, earned: 0, paid: 0 };
    body += `<td style="${tdBase}background:${PDF_COLORS.navy};color:#FFD54F;font-weight:700;">${ct.days}</td>`;
    body += `<td style="${tdBase}background:${PDF_COLORS.navy};color:#FFD54F;font-weight:700;">${formatNum(ct.earned)}</td>`;
    body += `<td style="${tdBase}background:${PDF_COLORS.navy};color:#69F0AE;font-weight:700;">${formatNum(ct.paid)}</td>`;
  });
  body += `<td style="${tdBase}background:${PDF_COLORS.navy};color:#FFD54F;font-weight:800;">${grandDays}</td>`;
  body += `<td style="${tdBase}background:${PDF_COLORS.navy};color:#FFD54F;font-weight:800;">${formatNum(grandEarned)}</td>`;
  body += `<td style="${tdBase}background:${PDF_COLORS.navy};color:#69F0AE;font-weight:800;">${formatNum(grandPaid)}</td>`;
  body += `</tr></tfoot>`;
  body += `</table></div>`;

  // ─── الملخص المالي المقارن ────────────────────────────────────────────────
  body += pdfSectionTitle('الملخص المالي المقارن بين المشاريع');
  body += `<div style="overflow-x:auto;">`;
  body += `<table style="${tableStyle}">`;
  body += `<thead><tr>`;
  body += `<th style="${thBase}background:${PDF_COLORS.navy};text-align:right;padding-right:6px;">البند</th>`;
  projects.forEach((p, i) => {
    body += `<th style="${thBase}background:${projColor(i)};">${escapeHtml(p.projectName)}</th>`;
  });
  body += `<th style="${thBase}background:${PDF_COLORS.navy};">الإجمالي</th>`;
  body += `</tr></thead>`;

  body += `<tbody>`;
  const sumRows: [string, (p: typeof projects[0]) => number, boolean][] = [
    ['الوارد (العهدة)', p => p.totals.totalIncome || 0, false],
    ['الأجور المدفوعة', p => p.totals.totalPaidWages ?? p.totals.totalWages ?? 0, false],
    ['المواد', p => p.totals.totalMaterials || 0, false],
    ['النقل', p => p.totals.totalTransport || 0, false],
    ['النثريات', p => p.totals.totalMisc || 0, false],
    ['إجمالي المصروفات', p => p.totals.totalExpenses || 0, true],
    ['الرصيد', p => p.totals.balance || 0, true],
  ];

  sumRows.forEach(([label, getter, isBold], idx) => {
    const bg = isBold ? PDF_COLORS.totalBg : (idx % 2 === 1 ? PDF_COLORS.altRow : PDF_COLORS.lightBg);
    const fw = isBold ? 'font-weight:700;' : '';
    body += `<tr>`;
    body += `<td style="${tdBase}background:${bg};text-align:right;padding-right:6px;${fw}color:${PDF_COLORS.navy};">${label}</td>`;
    let grandVal = 0;
    projects.forEach(p => {
      const val = getter(p);
      grandVal += val;
      body += `<td style="${tdBase}background:${bg};${fw}">${formatNum(val)}</td>`;
    });
    body += `<td style="${tdBase}background:${isBold ? PDF_COLORS.navy : bg};color:${isBold ? '#fff' : PDF_COLORS.navy};${fw}">${formatNum(grandVal)}</td>`;
    body += `</tr>`;
  });
  body += `</tbody></table></div>`;

  // ─── جدول المواد المجمع ──────────────────────────────────────────────────
  if (data.combinedSections.materials.items.length > 0) {
    body += pdfSectionTitle('المواد — الورقة الموحّدة');
    body += `<div style="overflow-x:auto;">`;
    body += `<table style="${tableStyle}">`;
    body += `<thead><tr>`;
    body += `<th style="${thBase}background:${PDF_COLORS.navy};">#</th>`;
    body += `<th style="${thBase}background:${PDF_COLORS.navy};text-align:right;">اسم المادة</th>`;
    projects.forEach((p, i) => {
      body += `<th style="${thBase}background:${projColor(i)};font-size:8px;">${escapeHtml(p.projectName)}</th>`;
    });
    body += `<th style="${thBase}background:${PDF_COLORS.navy};">الكمية</th>`;
    body += `<th style="${thBase}background:${PDF_COLORS.navy};">الإجمالي</th>`;
    body += `<th style="${thBase}background:${PDF_COLORS.navy};text-align:right;">المورد</th>`;
    body += `</tr></thead>`;

    body += `<tbody>`;
    let totalQty = 0, totalAmt = 0;
    data.combinedSections.materials.items.forEach((m, idx) => {
      const projIdx = projects.findIndex(p => String(p.projectId) === String((m as any).projectId));
      const bg = idx % 2 === 1 ? PDF_COLORS.altRow : PDF_COLORS.lightBg;
      body += `<tr>`;
      body += `<td style="${tdBase}background:${bg};">${idx + 1}</td>`;
      body += `<td style="${tdBase}background:${bg};text-align:right;">${escapeHtml(m.materialName)}</td>`;
      projects.forEach((_, i) => {
        if (i === projIdx) {
          body += `<td style="${tdBase}background:${bg};"><span style="color:${projColor(i)};font-weight:700;font-size:11px;">●</span></td>`;
        } else {
          body += `<td style="${tdBase}background:${bg};color:${PDF_COLORS.textMuted};"></td>`;
        }
      });
      body += `<td style="${tdBase}background:${bg};">${formatNum(m.totalQuantity)}</td>`;
      body += `<td style="${tdBase}background:${bg};color:${PDF_COLORS.green};font-weight:600;">${formatNum(m.totalAmount)}</td>`;
      body += `<td style="${tdBase}background:${bg};text-align:right;">${escapeHtml(m.supplierName || '—')}</td>`;
      body += `</tr>`;
      totalQty += m.totalQuantity || 0;
      totalAmt += m.totalAmount || 0;
    });
    body += `</tbody>`;
    body += `<tfoot><tr>`;
    body += `<td colspan="2" style="${tdBase}background:${PDF_COLORS.totalBg};font-weight:700;color:${PDF_COLORS.navy};text-align:right;padding-right:6px;">الإجمالي</td>`;
    projects.forEach(() => { body += `<td style="${tdBase}background:${PDF_COLORS.totalBg};"></td>`; });
    body += `<td style="${tdBase}background:${PDF_COLORS.totalBg};font-weight:700;">${formatNum(totalQty)}</td>`;
    body += `<td style="${tdBase}background:${PDF_COLORS.totalBg};font-weight:700;color:${PDF_COLORS.green};">${formatNum(totalAmt)}</td>`;
    body += `<td style="${tdBase}background:${PDF_COLORS.totalBg};"></td>`;
    body += `</tr></tfoot>`;
    body += `</table></div>`;
  }

  // ─── توقيعات ─────────────────────────────────────────────────────────────
  body += `
  <div style="display:flex;gap:12px;margin-top:20px;page-break-inside:avoid;">
    ${['المهندس', 'المدير', 'المدير المالي'].map(sig => `
      <div style="flex:1;border:1px solid ${PDF_COLORS.border};border-radius:4px;padding:10px;text-align:center;font-size:10px;">
        <div style="font-weight:700;color:${PDF_COLORS.navy};margin-bottom:16px;">${sig}</div>
        <div style="border-bottom:1px solid ${PDF_COLORS.border};margin-bottom:6px;height:24px;"></div>
        <div style="font-size:9px;color:${PDF_COLORS.textMuted};">التوقيع</div>
        <div style="margin-top:8px;font-size:9px;">التاريخ: ......../......../........</div>
      </div>
    `).join('')}
  </div>`;

  body += pdfFooter();

  return pdfWrap('مقارنة العمالة الموحّدة', body);
}
