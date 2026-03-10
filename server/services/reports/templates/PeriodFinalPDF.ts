import type { PeriodFinalReportData, ReportKPI } from '../../../../shared/report-types';
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

export function generatePeriodFinalHTML(data: PeriodFinalReportData): string {
  const kpis = data.kpis.map(k => {
    const d = kpiDisplay(k);
    return { label: k.label, value: d.value, color: d.color };
  });

  const attendanceByWorkerRows = data.sections.attendance.byWorker.map((w, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(w.workerName)}</td>
      <td>${escapeHtml(w.workerType)}</td>
      <td>${w.totalDays.toFixed(2)}</td>
      <td class="debit-cell">${formatNum(w.totalEarned)}</td>
      <td class="credit-cell">${formatNum(w.totalDirectPaid)}</td>
      <td style="color:#4A90D9;font-weight:600;">${formatNum(w.totalTransfers)}</td>
      <td class="credit-cell" style="font-weight:700;">${formatNum(w.totalPaid)}</td>
      <td style="color:${w.carriedForwardBalance >= 0 ? '#2E5090' : '#C0392B'};font-weight:600;">${formatNum(w.carriedForwardBalance)}</td>
      <td class="balance-cell" style="font-weight:700;">${formatNum(w.closingBalance)}</td>
    </tr>`
  ).join('');

  const materialItemRows = data.sections.materials.items.map((item, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(item.materialName)}</td>
      <td>${formatNum(item.totalQuantity)}</td>
      <td style="font-weight:700;">${formatNum(item.totalAmount)}</td>
      <td style="text-align:right;">${escapeHtml(item.supplierName)}</td>
    </tr>`
  ).join('');

  const fundTransferRows = data.sections.fundTransfers.items.map((ft, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td>${formatDateBR(ft.date)}</td>
      <td style="text-align:right;">${escapeHtml(ft.senderName)}</td>
      <td>${escapeHtml(ft.transferType)}</td>
      <td style="font-weight:700;">${formatNum(ft.amount)}</td>
    </tr>`
  ).join('');

  const attendanceSummaryRows = data.sections.attendance.summary.map((s) =>
    `<tr>
      <td>${formatDateBR(s.date)}</td>
      <td>${s.workerCount}</td>
      <td>${s.totalWorkDays.toFixed(2)}</td>
      <td style="font-weight:700;">${formatNum(s.totalWages)}</td>
      <td>${formatNum(s.totalPaid)}</td>
    </tr>`
  ).join('');

  let body = '';
  body += pdfHeader('الفتيني للمقاولات العامة والاستشارات الهندسية', 'التقرير النهائي للفترة');
  body += pdfInfoBar(
    [
      `<b>المشروع:</b> ${escapeHtml(data.project.name)}`,
      data.project.location ? `<b>الموقع:</b> ${escapeHtml(data.project.location)}` : '',
      data.project.engineerName ? `<b>المهندس:</b> ${escapeHtml(data.project.engineerName)}` : '',
      data.project.status ? `<b>الحالة:</b> ${escapeHtml(data.project.status)}` : '',
    ].filter(Boolean),
    [
      `<b>الفترة من:</b> ${formatDateBR(data.period.from)}`,
      `<b>الفترة إلى:</b> ${formatDateBR(data.period.to)}`,
      data.project.managerName ? `<b>المدير:</b> ${escapeHtml(data.project.managerName)}` : '',
      data.project.budget ? `<b>الميزانية:</b> ${formatNum(data.project.budget)} YER` : '',
    ].filter(Boolean)
  );
  body += pdfKpiStrip(kpis);

  if (data.sections.attendance.summary.length > 0) {
    body += pdfSectionTitle('ملخص الحضور اليومي');
    body += `<table><thead><tr>
      <th style="width:80px;">التاريخ</th><th style="width:70px;">عدد العمال</th>
      <th style="width:70px;">أيام العمل</th><th style="width:90px;">إجمالي الأجور</th>
      <th style="width:90px;">المدفوع</th>
    </tr></thead><tbody>${attendanceSummaryRows}</tbody></table>`;
  }

  if (data.sections.attendance.byWorker.length > 0) {
    body += `<div class="page-break"></div>`;
    body += pdfSectionTitle('ملخص العمالة حسب العامل');
    body += `<table><thead><tr>
      <th style="width:25px;">م</th><th>اسم العامل</th><th style="width:50px;">النوع</th>
      <th style="width:55px;">الأيام</th><th style="width:75px;">المستحق</th>
      <th style="width:75px;">المدفوع</th><th style="width:70px;">الحوالات</th>
      <th style="width:80px;">إجمالي المدفوع</th><th style="width:70px;">المرحل</th>
      <th style="width:80px;">الرصيد الختامي</th>
    </tr></thead><tbody>${attendanceByWorkerRows}
    ${pdfTotalRow([
      'الإجمالي',
      data.sections.attendance.byWorker.reduce((s, w) => s + w.totalDays, 0).toFixed(2),
      formatNum(data.sections.attendance.byWorker.reduce((s, w) => s + w.totalEarned, 0)),
      formatNum(data.sections.attendance.byWorker.reduce((s, w) => s + w.totalDirectPaid, 0)),
      formatNum(data.sections.attendance.byWorker.reduce((s, w) => s + w.totalTransfers, 0)),
      formatNum(data.sections.attendance.byWorker.reduce((s, w) => s + w.totalPaid, 0)),
      formatNum(data.sections.attendance.byWorker.reduce((s, w) => s + w.carriedForwardBalance, 0)),
      formatNum(data.sections.attendance.byWorker.reduce((s, w) => s + w.closingBalance, 0)),
    ], 3)}
    </tbody></table>`;
  }

  if (data.sections.materials.items.length > 0) {
    body += `<div class="page-break"></div>`;
    body += pdfSectionTitle('ملخص المواد والمشتريات');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>المادة</th><th style="width:80px;">الكمية الإجمالية</th>
      <th style="width:90px;">المبلغ الإجمالي</th><th>المورد</th>
    </tr></thead><tbody>${materialItemRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.sections.materials.total), `المدفوع: ${formatNum(data.sections.materials.totalPaid)}`], 3)}
    </tbody></table>`;
  }

  if (data.sections.fundTransfers.items.length > 0) {
    body += pdfSectionTitle('التحويلات المالية');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th style="width:80px;">التاريخ</th>
      <th>المرسل</th><th style="width:80px;">النوع</th><th style="width:90px;">المبلغ</th>
    </tr></thead><tbody>${fundTransferRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.sections.fundTransfers.total)], 4)}
    </tbody></table>`;
  }

  body += `<div class="page-break"></div>`;
  body += pdfSectionTitle('الملخص المالي الشامل');
  const summaryData = [
    ['إجمالي الدخل (التحويلات الواردة)', `${formatNum(data.totals.totalIncome)} YER`],
    ['إجمالي الأجور', `${formatNum(data.totals.totalWages)} YER`],
    ['إجمالي المواد', `${formatNum(data.totals.totalMaterials)} YER`],
    ['إجمالي النقل', `${formatNum(data.totals.totalTransport)} YER`],
    ['المصروفات المتنوعة', `${formatNum(data.totals.totalMisc)} YER`],
    ['حوالات العمال', `${formatNum(data.totals.totalWorkerTransfers)} YER`],
  ];
  body += `<table class="summary-table">
    ${summaryData.map(([l, v]) => `<tr><td class="label-cell">${l}</td><td class="value-cell">${v}</td></tr>`).join('')}
    ${pdfTotalRow(['إجمالي المصروفات', `${formatNum(data.totals.totalExpenses)} YER`])}
    ${pdfGrandTotalRow(['الرصيد النهائي', `${formatNum(data.totals.balance)} YER`])}
    ${data.totals.budgetUtilization !== undefined ? `<tr class="total-row"><td class="label-cell">نسبة استهلاك الميزانية</td><td class="value-cell" style="color:${PDF_COLORS.amber};font-weight:800;">${data.totals.budgetUtilization.toFixed(1)}%</td></tr>` : ''}
  </table>`;

  body += pdfSignatures(['المهندس', 'المدير', 'المدير المالي']);
  body += pdfFooter(data.generatedAt);

  return pdfWrap(`التقرير النهائي للفترة - ${escapeHtml(data.project.name)}`, body);
}
