import type { DailyReportData, ReportKPI } from '../../../../shared/report-types';
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

export function generateDailyReportHTML(data: DailyReportData): string {
  const kpis = data.kpis.map(k => {
    const d = kpiDisplay(k);
    return { label: k.label, value: d.value, color: d.color };
  });

  const attendanceRows = data.attendance.map((rec, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(rec.workerName)}</td>
      <td>${escapeHtml(rec.workerType)}</td>
      <td>${rec.workDays.toFixed(2)}</td>
      <td>${formatNum(rec.dailyWage)}</td>
      <td class="debit-cell">${formatNum(rec.totalWage)}</td>
      <td class="credit-cell">${formatNum(rec.paidAmount)}</td>
      <td class="balance-cell">${formatNum(rec.remainingAmount)}</td>
      <td style="text-align:right;font-size:9px;">${escapeHtml(rec.workDescription) || '-'}</td>
    </tr>`
  ).join('');

  const materialRows = data.materials.map((mat, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(mat.materialName)}</td>
      <td>${escapeHtml(mat.category)}</td>
      <td>${formatNum(mat.quantity)} ${escapeHtml(mat.unit)}</td>
      <td>${formatNum(mat.unitPrice)}</td>
      <td style="font-weight:700;">${formatNum(mat.totalAmount)}</td>
      <td>${formatNum(mat.paidAmount)}</td>
      <td style="text-align:right;">${escapeHtml(mat.supplierName)}</td>
    </tr>`
  ).join('');

  const transportRows = data.transport.map((tr, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(tr.description)}</td>
      <td style="text-align:right;">${escapeHtml(tr.workerName)}</td>
      <td style="font-weight:700;">${formatNum(tr.amount)}</td>
    </tr>`
  ).join('');

  const miscRows = data.miscExpenses.map((exp, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(exp.description)}</td>
      <td style="text-align:right;">${escapeHtml(exp.notes) || '-'}</td>
      <td style="font-weight:700;">${formatNum(exp.amount)}</td>
    </tr>`
  ).join('');

  const workerTransferRows = data.workerTransfers.map((wt, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(wt.workerName)}</td>
      <td style="text-align:right;">${escapeHtml(wt.recipientName)}</td>
      <td>${escapeHtml(wt.transferMethod)}</td>
      <td style="font-weight:700;">${formatNum(wt.amount)}</td>
    </tr>`
  ).join('');

  const fundTransferRows = data.fundTransfers.map((ft, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(ft.senderName)}</td>
      <td>${escapeHtml(ft.transferType)}</td>
      <td>${escapeHtml(ft.transferNumber) || '-'}</td>
      <td style="font-weight:700;">${formatNum(ft.amount)}</td>
    </tr>`
  ).join('');

  let body = '';
  body += pdfHeader('الفتيني للمقاولات العامة والاستشارات الهندسية', 'التقرير اليومي التفصيلي');
  body += pdfInfoBar(
    [
      `<b>المشروع:</b> ${escapeHtml(data.project.name)}`,
      data.project.location ? `<b>الموقع:</b> ${escapeHtml(data.project.location)}` : '',
      data.project.engineerName ? `<b>المهندس:</b> ${escapeHtml(data.project.engineerName)}` : '',
    ].filter(Boolean),
    [
      `<b>التاريخ:</b> ${formatDateBR(data.date)}`,
      data.project.managerName ? `<b>المدير:</b> ${escapeHtml(data.project.managerName)}` : '',
    ].filter(Boolean)
  );
  body += pdfKpiStrip(kpis);

  if (data.attendance.length > 0) {
    body += pdfSectionTitle('سجل الحضور والعمالة');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>اسم العامل</th><th style="width:60px;">النوع</th>
      <th style="width:50px;">الأيام</th><th style="width:65px;">الأجر اليومي</th>
      <th style="width:70px;">المستحق</th><th style="width:70px;">المدفوع</th>
      <th style="width:70px;">المتبقي</th><th>وصف العمل</th>
    </tr></thead><tbody>${attendanceRows}
    ${pdfTotalRow(['الإجمالي', data.totals.totalWorkDays.toFixed(2), '-', formatNum(data.totals.totalWorkerWages), formatNum(data.totals.totalPaidWages), formatNum(data.totals.totalWorkerWages - data.totals.totalPaidWages), `${data.totals.workerCount} عامل`], 3)}
    </tbody></table>`;
  }

  if (data.materials.length > 0) {
    body += `<div class="page-break"></div>`;
    body += pdfSectionTitle('المواد والمشتريات');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>المادة</th><th style="width:70px;">الفئة</th>
      <th style="width:80px;">الكمية</th><th style="width:65px;">سعر الوحدة</th>
      <th style="width:70px;">الإجمالي</th><th style="width:70px;">المدفوع</th><th>المورد</th>
    </tr></thead><tbody>${materialRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.totals.totalMaterials), '-'], 5)}
    </tbody></table>`;
  }

  if (data.transport.length > 0) {
    body += pdfSectionTitle('النقل والمواصلات');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>الوصف</th><th style="width:120px;">العامل</th><th style="width:80px;">المبلغ</th>
    </tr></thead><tbody>${transportRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.totals.totalTransport)], 3)}
    </tbody></table>`;
  }

  if (data.miscExpenses.length > 0) {
    body += pdfSectionTitle('مصروفات متنوعة');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>الوصف</th><th>ملاحظات</th><th style="width:80px;">المبلغ</th>
    </tr></thead><tbody>${miscRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.totals.totalMiscExpenses)], 3)}
    </tbody></table>`;
  }

  if (data.workerTransfers.length > 0) {
    body += pdfSectionTitle('حوالات العمال');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>العامل</th><th>المستلم</th><th style="width:80px;">الطريقة</th><th style="width:80px;">المبلغ</th>
    </tr></thead><tbody>${workerTransferRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.totals.totalWorkerTransfers)], 4)}
    </tbody></table>`;
  }

  if (data.fundTransfers.length > 0) {
    body += pdfSectionTitle('التحويلات المالية');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>المرسل</th><th style="width:80px;">النوع</th><th style="width:100px;">رقم التحويل</th><th style="width:80px;">المبلغ</th>
    </tr></thead><tbody>${fundTransferRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.totals.totalFundTransfers)], 4)}
    </tbody></table>`;
  }

  body += `<div class="page-break"></div>`;
  body += pdfSectionTitle('ملخص اليوم المالي');
  const summaryRows = [
    ['إجمالي أجور العمال', `${formatNum(data.totals.totalWorkerWages)} YER`],
    ['إجمالي المواد', `${formatNum(data.totals.totalMaterials)} YER`],
    ['إجمالي النقل', `${formatNum(data.totals.totalTransport)} YER`],
    ['المصروفات المتنوعة', `${formatNum(data.totals.totalMiscExpenses)} YER`],
    ['حوالات العمال', `${formatNum(data.totals.totalWorkerTransfers)} YER`],
    ['التحويلات المالية', `${formatNum(data.totals.totalFundTransfers)} YER`],
  ];
  body += `<table class="summary-table">
    ${summaryRows.map(([l, v]) => `<tr><td class="label-cell">${l}</td><td class="value-cell">${v}</td></tr>`).join('')}
    ${pdfTotalRow(['إجمالي المصروفات', `${formatNum(data.totals.totalExpenses)} YER`])}
    ${pdfGrandTotalRow(['الرصيد', `${formatNum(data.totals.balance)} YER`])}
  </table>`;

  body += pdfFooter(data.generatedAt);

  return pdfWrap(`التقرير اليومي - ${escapeHtml(data.project.name)} - ${formatDateBR(data.date)}`, body);
}
