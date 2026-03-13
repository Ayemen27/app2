import type { MultiProjectFinalReportData } from '../../../../shared/report-types';
import {
  escapeHtml, formatNum, formatDateBR, PDF_COLORS,
  pdfHeader, pdfInfoBar, pdfKpiStrip, pdfSectionTitle,
  pdfTotalRow, pdfGrandTotalRow, pdfSignatures, pdfFooter, pdfWrap,
} from './shared-styles';

export function generateMultiProjectFinalHTML(data: MultiProjectFinalReportData): string {
  const kpis = data.kpis.map(k => ({
    label: k.label,
    value: k.format === 'currency' ? `${formatNum(k.value)} YER` : formatNum(k.value),
    color: k.format === 'currency' ? PDF_COLORS.navy : undefined,
  }));

  let body = '';
  body += pdfHeader('الفتيني للمقاولات العامة والاستشارات الهندسية', 'التقرير الختامي المجمع للمشاريع');
  body += pdfInfoBar(
    [
      `<b>المشاريع:</b> ${data.projectNames.map(n => escapeHtml(n)).join(' + ')}`,
    ],
    [
      `<b>الفترة من:</b> ${formatDateBR(data.period.from)}`,
      `<b>الفترة إلى:</b> ${formatDateBR(data.period.to)}`,
    ]
  );
  body += pdfKpiStrip(kpis);

  for (const proj of data.projects) {
    body += pdfSectionTitle(`مشروع: ${escapeHtml(proj.projectName)}`);
    const summaryData = [
      ['إجمالي الإيرادات (العهدة)', `${formatNum(proj.totals.totalIncome)} YER`],
      ['إجمالي الأجور', `${formatNum(proj.totals.totalWages)} YER`],
      ['إجمالي المواد', `${formatNum(proj.totals.totalMaterials)} YER`],
      ['إجمالي النقل', `${formatNum(proj.totals.totalTransport)} YER`],
      ['إجمالي النثريات', `${formatNum(proj.totals.totalMisc)} YER`],
      ['حوالات العمال', `${formatNum(proj.totals.totalWorkerTransfers)} YER`],
      ['ترحيل صادر', `${formatNum(proj.totals.totalProjectTransfersOut)} YER`],
      ['ترحيل وارد', `${formatNum(proj.totals.totalProjectTransfersIn)} YER`],
    ];
    body += `<table class="summary-table" style="width:100%;">
      ${summaryData.map(([l, v]) => `<tr><td class="label-cell">${l}</td><td class="value-cell">${v}</td></tr>`).join('')}
      ${pdfTotalRow(['إجمالي المصروفات', `${formatNum(proj.totals.totalExpenses)} YER`])}
      ${pdfGrandTotalRow(['الرصيد', `${formatNum(proj.totals.balance)} YER`])}
    </table>`;
  }

  if (data.combinedSections.attendance.byWorker.length > 0) {
    body += pdfSectionTitle('ملخص العمالة المجمع');
    const workerRows = data.combinedSections.attendance.byWorker.map((w, idx) =>
      `<tr>
        <td>${idx + 1}</td>
        <td style="text-align:right;">${escapeHtml(w.workerName)}</td>
        <td>${escapeHtml(w.projectName)}</td>
        <td>${escapeHtml(w.workerType)}</td>
        <td>${w.totalDays.toFixed(2)}</td>
        <td class="debit-cell">${formatNum(w.totalEarned)}</td>
        <td class="credit-cell">${formatNum(w.totalDirectPaid)}</td>
        <td style="color:#4A90D9;font-weight:600;">${formatNum(w.totalTransfers)}</td>
        <td class="credit-cell" style="font-weight:700;">${formatNum(w.totalPaid)}</td>
        <td class="balance-cell">${formatNum(w.balance)}</td>
      </tr>`
    ).join('');

    body += `<table><thead><tr>
      <th style="width:25px;">م</th><th>اسم العامل</th><th>المشروع</th>
      <th style="width:50px;">النوع</th><th style="width:55px;">الأيام</th>
      <th style="width:75px;">المستحق</th><th style="width:75px;">المدفوع</th>
      <th style="width:70px;">الحوالات</th><th style="width:80px;">إجمالي المدفوع</th>
      <th style="width:80px;">المتبقي</th>
    </tr></thead><tbody>${workerRows}
    ${pdfTotalRow([
      'الإجمالي',
      data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalDays, 0).toFixed(2),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalEarned, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalDirectPaid, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalTransfers, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalPaid, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.balance, 0)),
    ], 4)}
    </tbody></table>`;
  }

  if (data.combinedSections.materials.items.length > 0) {
    body += pdfSectionTitle('ملخص المواد المجمع');
    const materialRows = data.combinedSections.materials.items.map((m, idx) =>
      `<tr>
        <td>${idx + 1}</td>
        <td style="text-align:right;">${escapeHtml(m.materialName)}</td>
        <td>${escapeHtml(m.projectName)}</td>
        <td>${formatNum(m.totalQuantity)}</td>
        <td style="font-weight:700;">${formatNum(m.totalAmount)}</td>
        <td style="text-align:right;">${escapeHtml(m.supplierName)}</td>
      </tr>`
    ).join('');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>المادة</th><th>المشروع</th>
      <th style="width:80px;">الكمية</th><th style="width:90px;">المبلغ</th><th>المورد</th>
    </tr></thead><tbody>${materialRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.combinedSections.materials.total), `المدفوع: ${formatNum(data.combinedSections.materials.totalPaid)}`], 4)}
    </tbody></table>`;
  }

  if (data.interProjectTransfers.length > 0) {
    body += pdfSectionTitle('التحويلات بين المشاريع المحددة');
    const ptRows = data.interProjectTransfers.map((t, idx) =>
      `<tr>
        <td>${idx + 1}</td>
        <td>${formatDateBR(t.date)}</td>
        <td style="text-align:right;">${escapeHtml(t.fromProjectName)}</td>
        <td style="text-align:right;">${escapeHtml(t.toProjectName)}</td>
        <td style="font-weight:700;">${formatNum(t.amount)}</td>
        <td style="text-align:right;font-size:11px;">${escapeHtml(t.reason)}</td>
      </tr>`
    ).join('');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th style="width:80px;">التاريخ</th>
      <th>من مشروع</th><th>إلى مشروع</th>
      <th style="width:90px;">المبلغ</th><th>السبب</th>
    </tr></thead><tbody>${ptRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.combinedTotals.totalInterProjectTransfers) + ' YER'], 5)}
    </tbody></table>`;
  }

  if (data.combinedSections.fundTransfers.items.length > 0) {
    body += pdfSectionTitle('التحويلات المالية المجمعة');
    const ftRows = data.combinedSections.fundTransfers.items.map((f, idx) =>
      `<tr>
        <td>${idx + 1}</td>
        <td>${formatDateBR(f.date)}</td>
        <td style="text-align:right;">${escapeHtml(f.senderName)}</td>
        <td>${escapeHtml(f.transferType)}</td>
        <td>${escapeHtml(f.projectName)}</td>
        <td style="font-weight:700;">${formatNum(f.amount)}</td>
      </tr>`
    ).join('');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th style="width:80px;">التاريخ</th>
      <th>المرسل</th><th style="width:80px;">النوع</th><th>المشروع</th><th style="width:90px;">المبلغ</th>
    </tr></thead><tbody>${ftRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.combinedSections.fundTransfers.total) + ' YER'], 5)}
    </tbody></table>`;
  }

  body += pdfSectionTitle('الملخص المالي الشامل المجمع');
  const grandSummary = [
    ['إجمالي الإيرادات (العهدة)', `${formatNum(data.combinedTotals.totalIncome)} YER`],
    ['إجمالي الأجور', `${formatNum(data.combinedTotals.totalWages)} YER`],
    ['إجمالي المواد', `${formatNum(data.combinedTotals.totalMaterials)} YER`],
    ['إجمالي النقل', `${formatNum(data.combinedTotals.totalTransport)} YER`],
    ['النثريات', `${formatNum(data.combinedTotals.totalMisc)} YER`],
    ['حوالات العمال', `${formatNum(data.combinedTotals.totalWorkerTransfers)} YER`],
    ['تحويلات بين المشاريع', `${formatNum(data.combinedTotals.totalInterProjectTransfers)} YER`],
  ];
  body += `<table class="summary-table" style="width:100%;">
    ${grandSummary.map(([l, v]) => `<tr><td class="label-cell">${l}</td><td class="value-cell">${v}</td></tr>`).join('')}
    ${pdfTotalRow(['إجمالي المصروفات', `${formatNum(data.combinedTotals.totalExpenses)} YER`])}
    ${pdfGrandTotalRow(['الرصيد النهائي', `${formatNum(data.combinedTotals.balance)} YER`])}
  </table>`;

  body += pdfSignatures(['المهندس', 'المدير', 'المدير المالي']);
  body += pdfFooter(data.generatedAt);

  return pdfWrap(`التقرير الختامي المجمع - ${data.projectNames.join(' + ')}`, body);
}
