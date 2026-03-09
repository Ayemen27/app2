import type { WorkerStatementData, ReportKPI } from '../../../../shared/report-types';
import {
  escapeHtml, formatNum, formatDateBR, PDF_COLORS,
  pdfHeader, pdfInfoBar, pdfKpiStrip, pdfSectionTitle,
  pdfTotalRow, pdfGrandTotalRow, pdfSignatures, pdfFooter, pdfWrap,
} from './shared-styles';

function kpiDisplay(kpi: ReportKPI): { value: string; color?: string } {
  switch (kpi.format) {
    case 'currency': return { value: `${formatNum(kpi.value)} YER`, color: PDF_COLORS.navy };
    case 'percentage': return { value: `${kpi.value.toFixed(1)}%`, color: PDF_COLORS.amber };
    case 'days': return { value: `${formatNum(kpi.value)}`, color: '#ED7D31' };
    default: return { value: formatNum(kpi.value) };
  }
}

export function generateWorkerStatementHTML(data: WorkerStatementData): string {
  const kpis = data.kpis.map(k => {
    const d = kpiDisplay(k);
    return { label: k.label, value: d.value, color: d.color };
  });

  const statementRows = data.statement.map((entry, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td>${formatDateBR(entry.date)}</td>
      <td style="font-weight:600;">${escapeHtml(entry.type)}</td>
      <td style="text-align:right;font-size:9px;">${escapeHtml(entry.description)}</td>
      <td style="text-align:right;">${escapeHtml(entry.projectName)}</td>
      <td>${entry.workDays > 0 ? entry.workDays.toFixed(2) : '-'}</td>
      <td class="${entry.debit > 0 ? 'debit-cell' : ''}">${entry.debit > 0 ? formatNum(entry.debit) : '-'}</td>
      <td class="${entry.credit > 0 ? 'credit-cell' : ''}">${entry.credit > 0 ? formatNum(entry.credit) : '-'}</td>
      <td class="balance-cell">${formatNum(entry.balance)}</td>
    </tr>`
  ).join('');

  const projectSummaryRows = data.projectSummary.map((ps, idx) =>
    `<tr>
      <td style="text-align:right;">${escapeHtml(ps.projectName)}</td>
      <td>${ps.totalDays.toFixed(2)}</td>
      <td class="debit-cell">${formatNum(ps.totalEarned)}</td>
      <td class="credit-cell">${formatNum(ps.totalPaid)}</td>
      <td class="balance-cell">${formatNum(ps.balance)}</td>
    </tr>`
  ).join('');

  let body = '';
  body += pdfHeader('الفتيني للمقاولات العامة والاستشارات الهندسية', 'كشف حساب العامل التفصيلي');
  body += pdfInfoBar(
    [
      `<b>اسم العامل:</b> ${escapeHtml(data.worker.name)}`,
      `<b>نوع العامل:</b> ${escapeHtml(data.worker.type)}`,
      `<b>الأجر اليومي:</b> ${formatNum(data.worker.dailyWage)} YER`,
    ],
    [
      `<b>الفترة من:</b> ${formatDateBR(data.period.from)}`,
      `<b>الفترة إلى:</b> ${formatDateBR(data.period.to)}`,
      data.worker.phone ? `<b>الهاتف:</b> ${escapeHtml(data.worker.phone)}` : '',
    ].filter(Boolean)
  );
  body += pdfKpiStrip(kpis);

  body += pdfSectionTitle('كشف الحساب التفصيلي');
  body += `<table><thead><tr>
    <th style="width:30px;">م</th><th style="width:75px;">التاريخ</th>
    <th style="width:50px;">النوع</th><th>الوصف</th>
    <th style="width:90px;">المشروع</th><th style="width:45px;">الأيام</th>
    <th style="width:70px;">مدين (مستحق)</th><th style="width:70px;">دائن (مدفوع)</th>
    <th style="width:70px;">الرصيد</th>
  </tr></thead><tbody>${statementRows}
  ${pdfTotalRow(['الإجماليات', data.totals.totalWorkDays.toFixed(2), formatNum(data.totals.totalEarned), formatNum(data.totals.totalPaid), formatNum(data.totals.finalBalance)], 5)}
  </tbody></table>`;

  if (data.projectSummary.length > 1) {
    body += `<div class="page-break"></div>`;
    body += pdfSectionTitle('ملخص المشاريع التفصيلي');
    body += `<table><thead><tr>
      <th>المشروع</th><th style="width:70px;">إجمالي الأيام</th>
      <th style="width:90px;">إجمالي المستحق</th><th style="width:90px;">إجمالي المدفوع</th>
      <th style="width:90px;">المتبقي</th>
    </tr></thead><tbody>${projectSummaryRows}</tbody></table>`;
  }

  body += pdfSectionTitle('الملخص المالي');
  const summaryRows = [
    ['إجمالي أيام العمل', `${data.totals.totalWorkDays.toFixed(2)} يوم`],
    ['إجمالي المستحق', `${formatNum(data.totals.totalEarned)} YER`],
    ['إجمالي المدفوع', `${formatNum(data.totals.totalPaid)} YER`],
    ['إجمالي الحوالات', `${formatNum(data.totals.totalTransfers)} YER`],
  ];
  body += `<table class="summary-table">
    ${summaryRows.map(([l, v]) => `<tr><td class="label-cell">${l}</td><td class="value-cell">${v}</td></tr>`).join('')}
    ${pdfGrandTotalRow(['الرصيد النهائي', `${formatNum(data.totals.finalBalance)} YER`])}
  </table>`;

  body += pdfSignatures(['العامل', 'المهندس', 'المدير']);
  body += pdfFooter(data.generatedAt);

  return pdfWrap(`كشف حساب العامل - ${escapeHtml(data.worker.name)}`, body);
}
