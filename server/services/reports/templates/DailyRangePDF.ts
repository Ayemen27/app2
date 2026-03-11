import type { DailyReportData } from '../../../../shared/report-types';
import {
  escapeHtml, formatNum, formatDateBR, PDF_COLORS,
  pdfHeader, pdfInfoBar, pdfSectionTitle,
  pdfTotalRow, pdfGrandTotalRow, pdfFooter, pdfWrap,
  PDF_BASE_STYLES,
} from './shared-styles';

interface UnifiedExpense {
  category: string;
  description: string;
  amount: number;
  notes: string;
}

function flattenExpenses(report: DailyReportData): UnifiedExpense[] {
  const expenses: UnifiedExpense[] = [];
  (report.attendance || []).forEach((r: any) => {
    expenses.push({
      category: 'أجور عمال',
      description: r.workerName + (r.workerType ? ` (${r.workerType})` : ''),
      amount: r.totalWage || 0,
      notes: r.workDescription || '-',
    });
  });
  (report.materials || []).forEach((r: any) => {
    expenses.push({
      category: 'مواد',
      description: r.materialName + (r.quantity ? ` × ${r.quantity}` : ''),
      amount: r.totalAmount || 0,
      notes: r.supplierName || '-',
    });
  });
  (report.transport || []).forEach((r: any) => {
    expenses.push({
      category: 'نقل',
      description: r.description || 'نقل',
      amount: r.amount || 0,
      notes: r.workerName || '-',
    });
  });
  (report.miscExpenses || []).forEach((r: any) => {
    expenses.push({
      category: 'مصاريف متنوعة',
      description: r.description || '-',
      amount: r.amount || 0,
      notes: r.notes || '-',
    });
  });
  return expenses;
}

function generateSingleDayHTML(report: DailyReportData): string {
  const expenses = flattenExpenses(report);
  const fundTransfers = report.fundTransfers || [];
  const workerTransfers = report.workerTransfers || [];
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalFund = fundTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const dateLabel = formatDateBR(report.date);

  let body = '';

  body += `<div class="day-header" style="background:linear-gradient(135deg, ${PDF_COLORS.navy} 0%, ${PDF_COLORS.blue} 100%); color:#fff; text-align:center; padding:8px 12px; border-radius:6px 6px 0 0; margin-top:12px;">
    <h2 style="font-size:13px; font-weight:800; margin:0;">تقرير يوم ${dateLabel}</h2>
    <div style="font-size:10px; opacity:0.85;">${escapeHtml(report.project?.name || '')}</div>
  </div>`;

  body += `<div class="info-bar" style="margin-bottom:6px;">
    <div><b>المشروع:</b> ${escapeHtml(report.project?.name || '-')}</div>
    <div><b>التاريخ:</b> ${dateLabel}</div>
  </div>`;

  if (expenses.length > 0) {
    body += pdfSectionTitle('جدول المصروفات');
    body += `<table><thead><tr>
      <th style="width:30px;">#</th>
      <th style="width:80px;">القسم</th>
      <th>البيان</th>
      <th style="width:80px;">المبلغ</th>
      <th>ملاحظات</th>
    </tr></thead><tbody>`;
    expenses.forEach((e, idx) => {
      body += `<tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(e.category)}</td>
        <td style="text-align:right;">${escapeHtml(e.description)}</td>
        <td style="font-weight:700;">${formatNum(e.amount)}</td>
        <td style="text-align:right;font-size:8px;">${escapeHtml(e.notes)}</td>
      </tr>`;
    });
    body += pdfTotalRow(['إجمالي المصروفات', formatNum(totalExpenses)], 3);
    body += `</tbody></table>`;
  }

  if (fundTransfers.length > 0) {
    body += `<div class="section-title" style="background:${PDF_COLORS.green};">العهدة (الوارد للصندوق)</div>`;
    body += `<table><thead><tr>
      <th style="width:30px;">#</th>
      <th style="width:80px;">المبلغ</th>
      <th>المرسل</th>
      <th style="width:80px;">نوع التحويل</th>
      <th>رقم التحويل</th>
    </tr></thead><tbody>`;
    fundTransfers.forEach((r: any, idx: number) => {
      body += `<tr>
        <td>${idx + 1}</td>
        <td style="font-weight:700; color:${PDF_COLORS.green};">${formatNum(r.amount)}</td>
        <td style="text-align:right;">${escapeHtml(r.senderName || '-')}</td>
        <td>${escapeHtml(r.transferType || '-')}</td>
        <td>${escapeHtml(r.transferNumber || '-')}</td>
      </tr>`;
    });
    body += pdfTotalRow(['الإجمالي', formatNum(totalFund)], 3);
    body += `</tbody></table>`;
  }

  if (workerTransfers.length > 0) {
    body += pdfSectionTitle('حوالات العمال');
    const totalWT = workerTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);
    body += `<table><thead><tr>
      <th style="width:30px;">#</th>
      <th style="width:80px;">المبلغ</th>
      <th>اسم العامل</th>
      <th>نوع التحويل</th>
    </tr></thead><tbody>`;
    workerTransfers.forEach((r: any, idx: number) => {
      body += `<tr>
        <td>${idx + 1}</td>
        <td style="font-weight:700;">${formatNum(r.amount)}</td>
        <td style="text-align:right;">${escapeHtml(r.workerName || '-')}</td>
        <td>${escapeHtml(r.transferType || '-')}</td>
      </tr>`;
    });
    body += pdfTotalRow(['الإجمالي', formatNum(totalWT)], 2);
    body += `</tbody></table>`;
  }

  body += `<div style="display:flex; gap:6px; flex-wrap:wrap; margin:8px 0;">
    <div style="flex:1; min-width:80px; text-align:center; padding:5px; border-radius:4px; background:#EFF6FF; border:1px solid #BFDBFE;">
      <div style="font-size:8px; color:${PDF_COLORS.textMuted};">عدد العمال</div>
      <div style="font-size:11px; font-weight:800; color:#1D4ED8;">${report.totals?.workerCount || 0}</div>
    </div>
    <div style="flex:1; min-width:80px; text-align:center; padding:5px; border-radius:4px; background:#FFF7ED; border:1px solid #FED7AA;">
      <div style="font-size:8px; color:${PDF_COLORS.textMuted};">المواد</div>
      <div style="font-size:11px; font-weight:800; color:#C2410C;">${formatNum(report.totals?.totalMaterials || 0)}</div>
    </div>
    <div style="flex:1; min-width:80px; text-align:center; padding:5px; border-radius:4px; background:#F5F3FF; border:1px solid #C4B5FD;">
      <div style="font-size:8px; color:${PDF_COLORS.textMuted};">الأجور</div>
      <div style="font-size:11px; font-weight:800; color:#7C3AED;">${formatNum(report.totals?.totalWorkerWages || 0)}</div>
    </div>
    <div style="flex:1; min-width:80px; text-align:center; padding:5px; border-radius:4px; background:#FEF2F2; border:1px solid #FECACA;">
      <div style="font-size:8px; color:${PDF_COLORS.textMuted};">إجمالي المصروفات</div>
      <div style="font-size:11px; font-weight:800; color:#DC2626;">${formatNum(report.totals?.totalExpenses || 0)}</div>
    </div>
  </div>`;

  return body;
}

export function generateDailyRangeHTML(reports: DailyReportData[], dateFrom: string, dateTo: string): string {
  const projectName = reports[0]?.project?.name || '-';

  let body = pdfHeader(
    'الفتيني للمقاولات العامة والاستشارات الهندسية',
    `تقرير الفترة الزمنية - ${escapeHtml(projectName)}`
  );

  body += pdfInfoBar(
    [`<b>المشروع:</b> ${escapeHtml(projectName)}`, `<b>عدد الأيام:</b> ${reports.length} يوم`],
    [`<b>من:</b> ${formatDateBR(dateFrom)}`, `<b>إلى:</b> ${formatDateBR(dateTo)}`]
  );

  const grandTotalExpenses = reports.reduce((s, r) => s + (r.totals?.totalExpenses || 0), 0);
  const grandTotalFund = reports.reduce((s, r) => s + (r.totals?.totalFundTransfers || 0), 0);

  body += `<div style="display:flex; gap:6px; margin:8px 0;">
    <div style="flex:1; text-align:center; padding:6px; border-radius:6px; background:${PDF_COLORS.navy}; color:#fff;">
      <div style="font-size:8px; opacity:0.8;">إجمالي مصروفات الفترة</div>
      <div style="font-size:13px; font-weight:800;">${formatNum(grandTotalExpenses)} YER</div>
    </div>
    <div style="flex:1; text-align:center; padding:6px; border-radius:6px; background:${PDF_COLORS.green}; color:#fff;">
      <div style="font-size:8px; opacity:0.8;">إجمالي العهدة الواردة</div>
      <div style="font-size:13px; font-weight:800;">${formatNum(grandTotalFund)} YER</div>
    </div>
    <div style="flex:1; text-align:center; padding:6px; border-radius:6px; background:#7C3AED; color:#fff;">
      <div style="font-size:8px; opacity:0.8;">عدد الأيام</div>
      <div style="font-size:13px; font-weight:800;">${reports.length}</div>
    </div>
  </div>`;

  for (let i = 0; i < reports.length; i++) {
    body += generateSingleDayHTML(reports[i]);
    if (i < reports.length - 1) {
      body += '<div style="page-break-after: always;"></div>';
    }
  }

  if (reports.length === 0) {
    body += '<h2 style="text-align:center;padding:40px;">لا توجد بيانات في هذه الفترة</h2>';
  }

  body += pdfFooter(new Date().toISOString());

  return pdfWrap(`تقرير الفترة - ${escapeHtml(projectName)} - ${formatDateBR(dateFrom)} إلى ${formatDateBR(dateTo)}`, body);
}
