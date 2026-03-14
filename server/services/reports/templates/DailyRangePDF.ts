import type { DailyReportData } from '../../../../shared/report-types';
import {
  escapeHtml, formatNum, formatDateBR, PDF_COLORS,
  pdfHeader, pdfInfoBar, pdfKpiStrip, pdfSectionTitle,
  pdfTotalRow, pdfGrandTotalRow, pdfFooter, pdfWrap,
} from './shared-styles';

interface UnifiedExpense {
  category: string;
  description: string;
  amount: number;
  workDays: string;
  paidAmount: string;
  notes: string;
}

interface DayTotals {
  totalExpenses: number;
  totalFund: number;
}

function computeDayTotals(report: DailyReportData): DayTotals {
  const expenses = flattenExpenses(report);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const fundTransfers = report.fundTransfers || [];
  const totalFund = fundTransfers.reduce((s: number, r: any) => s + parseFloat(r.amount || '0'), 0);
  return { totalExpenses, totalFund };
}

function flattenExpenses(report: DailyReportData): UnifiedExpense[] {
  const expenses: UnifiedExpense[] = [];
  (report.attendance || []).forEach((r: any) => {
    const days = parseFloat(r.workDays || '0');
    const paid = parseFloat(r.paidAmount || '0');
    expenses.push({
      category: 'أجور عمال',
      description: r.workerName + (r.workerType ? ` (${r.workerType})` : ''),
      amount: paid,
      workDays: days > 0 ? days.toFixed(1) : '0',
      paidAmount: paid > 0 ? formatNum(paid) : '-',
      notes: r.workDescription || (days === 0 && paid > 0 ? 'مبلغ بدون عمل' : days > 0 && paid === 0 ? 'عمل بدون صرف' : days === 0 ? 'بدون عمل' : '-'),
    });
  });
  (report.materials || []).forEach((r: any) => {
    expenses.push({
      category: 'مواد',
      description: r.materialName + (r.quantity ? ` × ${r.quantity}` : ''),
      amount: parseFloat(r.totalAmount || '0'),
      workDays: '-',
      paidAmount: '-',
      notes: r.supplierName || '-',
    });
  });
  (report.transport || []).forEach((r: any) => {
    expenses.push({
      category: 'نقل',
      description: r.description || 'نقل',
      amount: parseFloat(r.amount || '0'),
      workDays: '-',
      paidAmount: '-',
      notes: r.workerName || '-',
    });
  });
  (report.miscExpenses || []).forEach((r: any) => {
    expenses.push({
      category: 'مصاريف متنوعة',
      description: r.description || '-',
      amount: parseFloat(r.amount || '0'),
      workDays: '-',
      paidAmount: '-',
      notes: r.notes || '-',
    });
  });
  (report.workerTransfers || []).forEach((r: any) => {
    const noteParts: string[] = [];
    if (r.recipientName) noteParts.push(`المستلم: ${r.recipientName}`);
    if (r.transferMethod) noteParts.push(r.transferMethod);
    if (r.transferNumber) noteParts.push(`رقم: ${r.transferNumber}`);
    expenses.push({
      category: 'حوالات عمال',
      description: r.workerName || '-',
      amount: parseFloat(r.amount || '0'),
      workDays: '-',
      paidAmount: '-',
      notes: noteParts.join(' | ') || '-',
    });
  });
  (report.projectTransfersOut || []).forEach((r: any) => {
    expenses.push({
      category: 'ترحيل لمشروع',
      description: r.toProjectName || 'مشروع آخر',
      amount: parseFloat(r.amount || '0'),
      workDays: '-',
      paidAmount: '-',
      notes: r.description || '-',
    });
  });
  return expenses;
}

function generateDayPage(report: DailyReportData, carryForward: number, dayIndex: number, totalDays: number): string {
  const expenses = flattenExpenses(report);
  const fundTransfers = report.fundTransfers || [];
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalFund = fundTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const totalIncome = carryForward + totalFund;
  const dayBalance = totalIncome - totalExpenses;
  const dateLabel = formatDateBR(report.date);
  const balColor = dayBalance >= 0 ? PDF_COLORS.green : PDF_COLORS.red;

  let html = '';

  html += pdfHeader(
    'الفتيني للمقاولات العامة والاستشارات الهندسية',
    `التقرير اليومي المختصر — يوم ${dayIndex + 1} من ${totalDays}`
  );

  html += pdfInfoBar(
    [
      `<b>المشروع:</b> ${escapeHtml(report.project?.name || '-')}`,
      (report.project as Record<string, unknown> | undefined)?.engineerName ? `<b>المهندس:</b> ${escapeHtml(String((report.project as Record<string, unknown>).engineerName))}` : '',
    ].filter(Boolean),
    [
      `<b>التاريخ:</b> ${dateLabel}`,
      (report.project as Record<string, unknown> | undefined)?.managerName ? `<b>المدير:</b> ${escapeHtml(String((report.project as Record<string, unknown>).managerName))}` : '',
    ].filter(Boolean)
  );

  const kpis: { label: string; value: string; color?: string }[] = [
    { label: 'ترحيل سابق', value: `${formatNum(carryForward)} YER`, color: carryForward >= 0 ? PDF_COLORS.green : PDF_COLORS.red },
    { label: 'العهدة الواردة', value: `${formatNum(totalFund)} YER`, color: PDF_COLORS.green },
    { label: 'إجمالي المتاح', value: `${formatNum(totalIncome)} YER`, color: PDF_COLORS.navy },
    { label: 'المصروفات', value: `${formatNum(totalExpenses)} YER`, color: PDF_COLORS.red },
    { label: 'المتبقي', value: `${formatNum(dayBalance)} YER`, color: balColor },
    { label: 'عدد العمال', value: `${report.totals?.workerCount || 0}` },
  ];
  html += pdfKpiStrip(kpis);

  if (fundTransfers.length > 0) {
    html += `<div class="section-title" style="background:${PDF_COLORS.green};">العهدة (الوارد للصندوق)</div>`;
    html += `<table><thead><tr>
      <th style="width:28px;">م</th>
      <th style="width:80px;">المبلغ (YER)</th>
      <th>المرسل</th>
      <th style="width:75px;">نوع التحويل</th>
      <th style="width:90px;">رقم التحويل</th>
    </tr></thead><tbody>`;
    fundTransfers.forEach((r: any, idx: number) => {
      html += `<tr>
        <td>${idx + 1}</td>
        <td class="debit-cell">${formatNum(r.amount)}</td>
        <td style="text-align:right;">${escapeHtml(r.senderName || '-')}</td>
        <td>${escapeHtml(r.transferType || '-')}</td>
        <td>${escapeHtml(r.transferNumber || '-')}</td>
      </tr>`;
    });
    html += pdfTotalRow(['الإجمالي', formatNum(totalFund), '', '', ''], 1);
    html += `</tbody></table>`;
  }

  if (expenses.length > 0) {
    html += pdfSectionTitle('جدول المصروفات');
    html += `<table><thead><tr>
      <th style="width:24px;">م</th>
      <th style="width:65px;">القسم</th>
      <th>البيان</th>
      <th style="width:50px;">أيام العمل</th>
      <th style="width:80px;">المبلغ (YER)</th>
      <th>ملاحظات</th>
    </tr></thead><tbody>`;
    expenses.forEach((e, idx) => {
      let rowStyle = '';
      if (e.category === 'حوالات عمال') {
        rowStyle = `background:${PDF_COLORS.redBg};`;
      } else if (e.category === 'ترحيل لمشروع') {
        rowStyle = `background:#FFF3E0;`;
      }
      html += `<tr style="${rowStyle}">
        <td>${idx + 1}</td>
        <td>${escapeHtml(e.category)}</td>
        <td style="text-align:right;">${escapeHtml(e.description)}</td>
        <td>${e.workDays}</td>
        <td style="font-weight:700;">${formatNum(e.amount)}</td>
        <td style="text-align:right;font-size:8px;">${escapeHtml(e.notes)}</td>
      </tr>`;
    });
    html += pdfTotalRow([`الإجمالي (${expenses.length} عملية)`, '', '', formatNum(totalExpenses), ''], 2);
    html += `</tbody></table>`;
  }

  html += pdfSectionTitle('ملخص اليوم المالي');
  html += `<table class="summary-table" style="width:100%;">
    <tr><td class="label-cell">ترحيل من اليوم السابق</td><td class="value-cell">${formatNum(carryForward)} YER</td></tr>
    <tr><td class="label-cell">العهدة الواردة (الدخل)</td><td class="value-cell" style="color:${PDF_COLORS.green};">${formatNum(totalFund)} YER</td></tr>
    ${pdfTotalRow(['إجمالي المتاح (ترحيل + دخل)', `${formatNum(totalIncome)} YER`])}
    <tr><td class="label-cell">إجمالي المصروفات</td><td class="value-cell" style="color:${PDF_COLORS.red};">${formatNum(totalExpenses)} YER</td></tr>
    ${pdfGrandTotalRow(['المتبقي (يُرحّل لليوم التالي)', `${formatNum(dayBalance)} YER`])}
  </table>`;

  return html;
}

export function generateDailyRangeHTML(reports: DailyReportData[], dateFrom: string, dateTo: string): string {
  const projectName = reports[0]?.project?.name || '-';
  const filteredReports = reports.filter(r => {
    const exp = flattenExpenses(r);
    const fund = r.fundTransfers || [];
    const wt = r.workerTransfers || [];
    return exp.length > 0 || fund.length > 0 || wt.length > 0;
  });

  const dayTotalsMap = filteredReports.map(r => computeDayTotals(r));
  const grandTotalExpenses = dayTotalsMap.reduce((s, d) => s + d.totalExpenses, 0);
  const grandTotalFund = dayTotalsMap.reduce((s, d) => s + d.totalFund, 0);
  const grandBalance = grandTotalFund - grandTotalExpenses;
  const balColor = grandBalance >= 0 ? PDF_COLORS.green : PDF_COLORS.red;

  let body = pdfHeader(
    'الفتيني للمقاولات العامة والاستشارات الهندسية',
    `تقرير الفترة الزمنية — ${escapeHtml(projectName)}`
  );

  body += pdfInfoBar(
    [`<b>المشروع:</b> ${escapeHtml(projectName)}`, `<b>عدد الأيام:</b> ${filteredReports.length} يوم`],
    [`<b>من:</b> ${formatDateBR(dateFrom)}`, `<b>إلى:</b> ${formatDateBR(dateTo)}`]
  );

  body += pdfKpiStrip([
    { label: 'إجمالي العهدة الواردة', value: `${formatNum(grandTotalFund)} YER`, color: PDF_COLORS.green },
    { label: 'إجمالي المصروفات', value: `${formatNum(grandTotalExpenses)} YER`, color: PDF_COLORS.red },
    { label: 'المتبقي النهائي', value: `${formatNum(grandBalance)} YER`, color: balColor },
    { label: 'عدد الأيام', value: `${filteredReports.length}` },
  ]);

  if (filteredReports.length > 0) {
    body += pdfSectionTitle('فهرس الأيام');
    body += `<table><thead><tr>
      <th style="width:28px;">م</th>
      <th style="width:85px;">التاريخ</th>
      <th style="width:80px;">ترحيل سابق</th>
      <th style="width:80px;">العهدة</th>
      <th style="width:80px;">المصروفات</th>
      <th style="width:80px;">المتبقي</th>
    </tr></thead><tbody>`;
    let cf = 0;
    filteredReports.forEach((r, idx) => {
      const dt = dayTotalsMap[idx];
      const exp = dt.totalExpenses;
      const fund = dt.totalFund;
      const income = cf + fund;
      const bal = income - exp;
      const balC = bal >= 0 ? PDF_COLORS.green : PDF_COLORS.red;
      body += `<tr>
        <td>${idx + 1}</td>
        <td>${formatDateBR(r.date)}</td>
        <td>${formatNum(cf)}</td>
        <td class="debit-cell">${formatNum(fund)}</td>
        <td class="credit-cell">${formatNum(exp)}</td>
        <td style="font-weight:800;color:${balC};">${formatNum(bal)}</td>
      </tr>`;
      cf = bal;
    });
    body += pdfTotalRow([
      'الإجمالي',
      '',
      '',
      formatNum(grandTotalFund),
      formatNum(grandTotalExpenses),
      formatNum(grandBalance),
    ], 1);
    body += `</tbody></table>`;
  }

  body += '<div style="page-break-after: always;"></div>';

  let carryForward = 0;
  for (let i = 0; i < filteredReports.length; i++) {
    const report = filteredReports[i];
    const dt = dayTotalsMap[i];
    const totalIncome = carryForward + dt.totalFund;
    const dayBalance = totalIncome - dt.totalExpenses;

    body += generateDayPage(report, carryForward, i, filteredReports.length);

    carryForward = dayBalance;

    if (i < filteredReports.length - 1) {
      body += '<div style="page-break-after: always;"></div>';
    }
  }

  if (filteredReports.length === 0) {
    body += '<h2 style="text-align:center;padding:40px;color:#6C757D;">لا توجد بيانات في هذه الفترة</h2>';
  }

  body += pdfFooter(new Date().toISOString());

  return pdfWrap(`تقرير الفترة — ${escapeHtml(projectName)} — ${formatDateBR(dateFrom)} إلى ${formatDateBR(dateTo)}`, body);
}
