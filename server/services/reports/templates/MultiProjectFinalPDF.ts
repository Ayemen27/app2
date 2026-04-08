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

    // تجميع العمال بالـ workerId لضمان الدقة
    type WRow = typeof data.combinedSections.attendance.byWorker[0];
    const workerGroupMap = new Map<string, WRow[]>();
    for (const w of data.combinedSections.attendance.byWorker) {
      const key = w.workerId || w.workerName;
      if (!workerGroupMap.has(key)) workerGroupMap.set(key, []);
      workerGroupMap.get(key)!.push(w);
    }

    let workerSeq = 0;
    let workerRows = '';
    for (const [, rows] of workerGroupMap) {
      workerSeq++;
      const rowCount = rows.length;
      const totalRemaining = rows.reduce((s, r) => s + r.balance, 0);
      const bgStyle = workerSeq % 2 === 0 ? 'background:#EBF4FF;' : '';
      const displayName = rows[0].workerName;

      rows.forEach((r, ri) => {
        workerRows += `<tr style="${bgStyle}">`;
        if (ri === 0) {
          workerRows += `<td rowspan="${rowCount}" style="text-align:center;vertical-align:middle;">${workerSeq}</td>`;
          workerRows += `<td rowspan="${rowCount}" style="text-align:right;vertical-align:middle;font-weight:600;">${escapeHtml(displayName)}</td>`;
        }
        workerRows += `<td>${escapeHtml(r.projectName)}</td>`;
        workerRows += `<td>${escapeHtml(r.workerType)}</td>`;
        workerRows += `<td>${r.totalDays.toFixed(2)}</td>`;
        workerRows += `<td class="debit-cell">${formatNum(r.totalEarned)}</td>`;
        workerRows += `<td class="credit-cell">${formatNum(r.totalDirectPaid)}</td>`;
        workerRows += `<td style="color:#4A90D9;font-weight:600;">${formatNum(r.totalTransfers)}</td>`;
        workerRows += `<td class="credit-cell" style="font-weight:700;">${formatNum(r.totalPaid)}</td>`;
        workerRows += `<td class="balance-cell">${formatNum(r.balance)}</td>`;
        workerRows += `<td style="color:#7C3AED;font-weight:600;">${formatNum((r as any).rebalanceDelta ?? 0)}</td>`;
        if (ri === 0) {
          const totalAdjusted = rows.reduce((s, rr) => s + ((rr as any).adjustedBalance ?? rr.balance), 0);
          workerRows += `<td rowspan="${rowCount}" style="text-align:center;vertical-align:middle;font-weight:700;color:${totalAdjusted >= 0 ? '#16a34a' : '#C0392B'};">${formatNum(totalAdjusted)}</td>`;
        }
        workerRows += `</tr>`;
      });
    }

    body += `<table><thead><tr>
      <th style="width:25px;">م</th><th>اسم العامل</th><th>المشروع</th>
      <th style="width:50px;">النوع</th><th style="width:55px;">الأيام</th>
      <th style="width:75px;">المستحق</th><th style="width:75px;">المدفوع</th>
      <th style="width:70px;">الحوالات</th><th style="width:80px;">إجمالي المدفوع</th>
      <th style="width:80px;">المتبقي</th><th style="width:75px;">التصفية البينية</th><th style="width:85px;">المتبقي الصافي</th>
    </tr></thead><tbody>${workerRows}
    ${pdfTotalRow([
      'الإجمالي',
      data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalDays, 0).toFixed(2),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalEarned, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalDirectPaid, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalTransfers, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.totalPaid, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + w.balance, 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + ((w as any).rebalanceDelta ?? 0), 0)),
      formatNum(data.combinedSections.attendance.byWorker.reduce((s, w) => s + ((w as any).adjustedBalance ?? w.balance), 0)),
    ], 3)}
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

  if (data.rebalanceTransfers && data.rebalanceTransfers.length > 0) {
    body += pdfSectionTitle('التصفيات البينية للعمال بين المشاريع');

    // مصفوفة الديون
    if (data.projectDebtMatrix && data.projectDebtMatrix.length > 0) {
      body += `<div style="font-size:9px;font-weight:700;color:#7C3AED;margin:4px 0 3px;">ملخص الديون البينية بين المشاريع</div>`;
      const matrixRows = data.projectDebtMatrix.map((r, idx) =>
        `<tr>
          <td>${idx + 1}</td>
          <td style="text-align:right;color:#dc2626;font-weight:600;">${escapeHtml(r.fromProjectName)}</td>
          <td style="text-align:right;color:#16a34a;font-weight:600;">${escapeHtml(r.toProjectName)}</td>
          <td style="font-weight:700;color:#7C3AED;">${formatNum(r.totalAmount)}</td>
        </tr>`
      ).join('');
      const totalRebalance = data.projectDebtMatrix.reduce((s, r) => s + r.totalAmount, 0);
      body += `<table><thead><tr>
        <th style="width:30px;">م</th><th>المشروع الدافع</th><th>المشروع المستفيد</th><th style="width:100px;">إجمالي المحوَّل</th>
      </tr></thead><tbody>${matrixRows}
      ${pdfTotalRow(['الإجمالي الكلي', formatNum(totalRebalance) + ' YER'], 3)}
      </tbody></table>`;
    }

    // تفاصيل التسويات
    body += `<div style="font-size:9px;font-weight:700;color:#374151;margin:8px 0 3px;">تفاصيل التصفيات البينية</div>`;
    const rebalRows = data.rebalanceTransfers.map((t, idx) =>
      `<tr>
        <td>${idx + 1}</td>
        <td>${formatDateBR(t.date)}</td>
        <td style="text-align:right;">${escapeHtml(t.workerName)}</td>
        <td style="text-align:right;color:#dc2626;">${escapeHtml(t.fromProjectName)}</td>
        <td style="text-align:right;color:#16a34a;">${escapeHtml(t.toProjectName)}</td>
        <td style="font-weight:700;color:#7C3AED;">${formatNum(t.amount)}</td>
      </tr>`
    ).join('');
    const totalReb = data.rebalanceTransfers.reduce((s, t) => s + t.amount, 0);
    body += `<table><thead><tr>
      <th style="width:30px;">م</th><th style="width:75px;">التاريخ</th>
      <th>العامل</th><th>من مشروع</th><th>إلى مشروع</th><th style="width:90px;">المبلغ</th>
    </tr></thead><tbody>${rebalRows}
    ${pdfTotalRow(['الإجمالي', formatNum(totalReb) + ' YER'], 5)}
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
    ['إجمالي العهدة (التحويلات المالية)', `${formatNum(data.combinedTotals.totalFundTransfers)} YER`],
    ['ترحيل وارد من مشاريع أخرى', `${formatNum(data.combinedTotals.totalProjectTransfersIn)} YER`],
    ['إجمالي الإيرادات', `${formatNum(data.combinedTotals.totalIncome)} YER`],
    ['إجمالي الأجور', `${formatNum(data.combinedTotals.totalWages)} YER`],
    ['إجمالي المواد', `${formatNum(data.combinedTotals.totalMaterials)} YER`],
    ['إجمالي النقل', `${formatNum(data.combinedTotals.totalTransport)} YER`],
    ['النثريات', `${formatNum(data.combinedTotals.totalMisc)} YER`],
    ['حوالات العمال', `${formatNum(data.combinedTotals.totalWorkerTransfers)} YER`],
    ['ترحيل صادر لمشاريع أخرى', `${formatNum(data.combinedTotals.totalProjectTransfersOut)} YER`],
    ['تحويلات بين المشاريع المحددة', `${formatNum(data.combinedTotals.totalInterProjectTransfers)} YER`],
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
