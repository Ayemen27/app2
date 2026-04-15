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

  const invIssued = data.inventoryIssued || [];
  const inventoryRows = invIssued.map((inv, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td style="text-align:right;">${escapeHtml(inv.itemName)}</td>
      <td>${escapeHtml(inv.category)}</td>
      <td>${escapeHtml(inv.unit)}</td>
      <td style="font-weight:700;color:${PDF_COLORS.red};">${formatNum(inv.issuedQty)}</td>
      <td>${formatNum(inv.receivedQty)}</td>
      <td style="color:${inv.remainingQty > 0 ? PDF_COLORS.green : PDF_COLORS.red};">${formatNum(inv.remainingQty)}</td>
      <td style="text-align:right;font-size:9px;">${escapeHtml(inv.notes) || '-'}</td>
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

  if (data.fundTransfers.length > 0) {
    body += pdfSectionTitle('التحويلات المالية');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>المرسل</th><th style="width:80px;">النوع</th><th style="width:100px;">رقم التحويل</th><th style="width:80px;">المبلغ</th>
    </tr></thead><tbody>${fundTransferRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.totals.totalFundTransfers)], 4)}
    </tbody></table>`;
  }

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
    body += pdfSectionTitle('المواد والمشتريات');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>المادة</th><th style="width:70px;">الفئة</th>
      <th style="width:80px;">الكمية</th><th style="width:65px;">سعر الوحدة</th>
      <th style="width:70px;">الإجمالي</th><th style="width:70px;">المدفوع</th><th>المورد</th>
    </tr></thead><tbody>${materialRows}
    ${pdfTotalRow(['الإجمالي', formatNum(data.totals.totalMaterials), '-'], 5)}
    </tbody></table>`;
  }

  if (invIssued.length > 0) {
    const totalIssuedQty = invIssued.reduce((s, inv) => s + inv.issuedQty, 0);
    body += pdfSectionTitle('مواد المخزن المصروفة');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>اسم المادة</th><th style="width:70px;">الفئة</th>
      <th style="width:50px;">الوحدة</th><th style="width:65px;">الكمية المصروفة</th>
      <th style="width:65px;">إجمالي التوريد</th><th style="width:65px;">المتبقي</th><th>ملاحظات</th>
    </tr></thead><tbody>${inventoryRows}
    ${pdfTotalRow([`الإجمالي (${invIssued.length} مادة)`, '', '', formatNum(totalIssuedQty), '', '', ''], 1)}
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

  if ((data.projectTransfersOut || []).length > 0) {
    const ptOut = data.projectTransfersOut!;
    const totalPtOut = ptOut.reduce((s, p) => s + p.amount, 0);
    body += pdfSectionTitle('ترحيل لمشاريع أخرى');
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th>المشروع</th><th>البيان</th><th style="width:80px;">المبلغ</th>
    </tr></thead><tbody>`;
    ptOut.forEach((pt, idx) => {
      body += `<tr>
        <td>${idx + 1}</td>
        <td style="text-align:right;">${escapeHtml(pt.toProjectName)}</td>
        <td style="text-align:right;">${escapeHtml(pt.description)}</td>
        <td style="font-weight:700;">${formatNum(pt.amount)}</td>
      </tr>`;
    });
    body += pdfTotalRow(['الإجمالي', formatNum(totalPtOut)], 3);
    body += `</tbody></table>`;
  }

  body += pdfSectionTitle('ملخص اليوم المالي');
  const carryFwd = data.carryForwardBalance ?? 0;
  const unpaidWages = data.totals.totalWorkerWages - data.totals.totalPaidWages;
  const totalIncoming = carryFwd + data.totals.totalFundTransfers;
  const finalBalance = totalIncoming - data.totals.totalExpenses;

  // قسم الوارد
  const incomingRows: [string, string, string?][] = [
    ...(carryFwd !== 0 ? [['رصيد مرحّل من أيام سابقة', `${formatNum(carryFwd)} YER`, carryFwd >= 0 ? 'credit' : 'debit'] as [string, string, string]] : []),
    ['عهدة اليوم (وارد)', `${formatNum(data.totals.totalFundTransfers)} YER`],
  ];

  // قسم المصروفات
  const expenseRows: [string, string, string?][] = [
    ['أجور مدفوعة للعمال', `${formatNum(data.totals.totalPaidWages)} YER`],
    ...(unpaidWages > 0 ? [['مستحقات عمال معلقة (غير مدفوعة)', `${formatNum(unpaidWages)} YER`, 'info'] as [string, string, string]] : []),
    ['إجمالي المواد', `${formatNum(data.totals.totalMaterials)} YER`],
    ['إجمالي النقل', `${formatNum(data.totals.totalTransport)} YER`],
    ['المصروفات المتنوعة', `${formatNum(data.totals.totalMiscExpenses)} YER`],
    ['حوالات العمال', `${formatNum(data.totals.totalWorkerTransfers)} YER`],
  ];

  const renderRow = ([l, v, type]: [string, string, string?]) => {
    if (type === 'info') return `<tr style="background:#fffbeb;"><td class="label-cell" style="color:#b45309;font-style:italic;">⚠ ${l}</td><td class="value-cell" style="color:#b45309;font-style:italic;">${v}</td></tr>`;
    if (type === 'credit') return `<tr style="background:#f0fdf4;"><td class="label-cell" style="color:#15803d;font-weight:700;">↑ ${l}</td><td class="value-cell" style="color:#15803d;font-weight:700;">${v}</td></tr>`;
    if (type === 'debit') return `<tr style="background:#fef2f2;"><td class="label-cell" style="color:#dc2626;font-weight:700;">↓ ${l}</td><td class="value-cell" style="color:#dc2626;font-weight:700;">${v}</td></tr>`;
    return `<tr><td class="label-cell">${l}</td><td class="value-cell">${v}</td></tr>`;
  };

  body += `<table class="summary-table">
    <tr style="background:#e8f4fd;"><td colspan="2" class="label-cell" style="font-weight:700;color:#1e40af;border-bottom:1px solid #bfdbfe;">▶ الوارد</td></tr>
    ${incomingRows.map(renderRow).join('')}
    ${pdfTotalRow(['إجمالي الوارد', `${formatNum(totalIncoming)} YER`])}
    <tr style="background:#fff0f0;"><td colspan="2" class="label-cell" style="font-weight:700;color:#991b1b;border-bottom:1px solid #fecaca;margin-top:6px;">▶ المصروفات</td></tr>
    ${expenseRows.map(renderRow).join('')}
    ${pdfTotalRow(['إجمالي المصروفات', `${formatNum(data.totals.totalExpenses)} YER`])}
    ${pdfGrandTotalRow(['الرصيد النهائي', `${formatNum(finalBalance)} YER`])}
  </table>`;

  body += pdfFooter(data.generatedAt);

  return pdfWrap(`التقرير اليومي - ${escapeHtml(data.project.name)} - ${formatDateBR(data.date)}`, body);
}
