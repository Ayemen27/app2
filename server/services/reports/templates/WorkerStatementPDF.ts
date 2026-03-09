import type { WorkerStatementData, ReportKPI } from '../../../../shared/report-types';

function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(num: number): string {
  return num.toLocaleString('ar-SA');
}

function formatKPIValue(kpi: ReportKPI): string {
  switch (kpi.format) {
    case 'currency':
      return `${formatNumber(kpi.value)} ر.ي`;
    case 'percentage':
      return `${kpi.value.toFixed(1)}%`;
    case 'days':
      return `${formatNumber(kpi.value)} يوم`;
    default:
      return formatNumber(kpi.value);
  }
}

function getKPIColor(kpi: ReportKPI): string {
  if (kpi.color) return kpi.color;
  switch (kpi.format) {
    case 'currency': return '#1F4E79';
    case 'percentage': return '#00B050';
    case 'days': return '#ED7D31';
    default: return '#1F4E79';
  }
}

export function generateWorkerStatementHTML(data: WorkerStatementData): string {
  const kpiStrip = data.kpis.map((kpi) => {
    const color = getKPIColor(kpi);
    return `<div style="flex:1;min-width:100px;text-align:center;padding:8px 6px;border-left:1px solid #E0E0E0;">
      <div style="font-size:9px;color:#666;margin-bottom:3px;">${kpi.label}</div>
      <div style="font-size:15px;font-weight:800;color:${color};">${formatKPIValue(kpi)}</div>
    </div>`;
  }).join('');

  const statementRows = data.statement.map((entry, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    const typeColor = entry.type === 'عمل' ? '#E2F0D9' : entry.type === 'دفعة' ? '#FBE2D5' : '#FCE4D6';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${entry.date}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:${typeColor};font-weight:600;">${escapeHtml(entry.type)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:9px;text-align:right;">${escapeHtml(entry.description)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(entry.projectName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${entry.workDays > 0 ? entry.workDays.toFixed(2) : '-'}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#E2F0D9;font-weight:700;">${entry.debit > 0 ? formatNumber(entry.debit) : '-'}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#FBE2D5;font-weight:700;">${entry.credit > 0 ? formatNumber(entry.credit) : '-'}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#DEEAF6;font-weight:700;">${formatNumber(entry.balance)}</td>
    </tr>`;
  }).join('');

  const projectSummaryRows = data.projectSummary.map((ps, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(ps.projectName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${ps.totalDays.toFixed(2)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#E2F0D9;font-weight:700;">${formatNumber(ps.totalEarned)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#FBE2D5;font-weight:700;">${formatNumber(ps.totalPaid)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#DEEAF6;font-weight:700;">${formatNumber(ps.balance)}</td>
    </tr>`;
  }).join('');

  const tableHeaderStyle = 'background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;';
  const sectionTitleStyle = 'background:#1F4E79;color:#fff;padding:6px 12px;font-size:12px;font-weight:800;border:1px solid #16365C;';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>كشف حساب العامل - ${escapeHtml(data.worker.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; background: #fff; color: #333; }
  @media print {
    .page-break { page-break-before: always; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body style="padding:15px;max-width:794px;margin:0 auto;">

<div style="background:#1F4E79;color:#fff;text-align:center;padding:14px 0;margin-bottom:4px;">
  <div style="font-size:20px;font-weight:800;">نظام إدارة مشاريع البناء</div>
  <div style="font-size:13px;margin-top:2px;opacity:0.9;">كشف حساب العامل التفصيلي والشامل</div>
</div>

<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#F2F7FB;border:1px solid #D6E4F0;margin-bottom:10px;">
  <div style="font-size:11px;">
    <div style="margin-bottom:4px;"><b style="display:inline-block;width:95px;">اسم العامل:</b> ${escapeHtml(data.worker.name)}</div>
    <div style="margin-bottom:4px;"><b style="display:inline-block;width:95px;">نوع العامل:</b> ${escapeHtml(data.worker.type)}</div>
    <div><b style="display:inline-block;width:95px;">الأجر اليومي:</b> ${formatNumber(data.worker.dailyWage)} ر.ي</div>
  </div>
  <div style="font-size:11px;text-align:left;">
    <div style="margin-bottom:4px;"><b style="display:inline-block;width:70px;">الفترة من:</b> ${data.period.from}</div>
    <div style="margin-bottom:4px;"><b style="display:inline-block;width:70px;">الفترة إلى:</b> ${data.period.to}</div>
    ${data.worker.phone ? `<div><b style="display:inline-block;width:70px;">الهاتف:</b> ${escapeHtml(data.worker.phone)}</div>` : ''}
    ${data.worker.nationality ? `<div><b style="display:inline-block;width:70px;">الجنسية:</b> ${data.worker.nationality}</div>` : ''}
  </div>
</div>

<div style="display:flex;background:#fff;border:1px solid #D6E4F0;border-radius:6px;margin-bottom:14px;overflow:hidden;">
  ${kpiStrip}
</div>

<div style="${sectionTitleStyle}">كشف الحساب التفصيلي</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}width:75px;">التاريخ</th>
      <th style="${tableHeaderStyle}width:50px;">النوع</th>
      <th style="${tableHeaderStyle}">الوصف</th>
      <th style="${tableHeaderStyle}width:90px;">المشروع</th>
      <th style="${tableHeaderStyle}width:45px;">الأيام</th>
      <th style="${tableHeaderStyle}width:70px;">مدين (مستحق)</th>
      <th style="${tableHeaderStyle}width:70px;">دائن (مدفوع)</th>
      <th style="${tableHeaderStyle}width:70px;">الرصيد</th>
    </tr>
  </thead>
  <tbody>
    ${statementRows}
    <tr style="background:#00B050;">
      <td colspan="5" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجماليات</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${data.totals.totalWorkDays.toFixed(2)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalEarned)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalPaid)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.finalBalance)}</td>
    </tr>
  </tbody>
</table>

${data.projectSummary.length > 1 ? `
<div class="page-break"></div>
<div style="${sectionTitleStyle}margin-top:20px;">ملخص المشاريع التفصيلي</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}">المشروع</th>
      <th style="${tableHeaderStyle}width:70px;">إجمالي الأيام</th>
      <th style="${tableHeaderStyle}width:90px;">إجمالي المستحق</th>
      <th style="${tableHeaderStyle}width:90px;">إجمالي المدفوع</th>
      <th style="${tableHeaderStyle}width:90px;">المتبقي</th>
    </tr>
  </thead>
  <tbody>
    ${projectSummaryRows}
  </tbody>
</table>
` : ''}

<div style="margin-top:20px;">
  <table style="width:300px;border:2px solid #1F4E79;border-collapse:collapse;">
    <tr><td colspan="2" style="background:#00B050;color:#fff;text-align:center;font-weight:800;padding:7px;font-size:13px;border:1px solid #00803A;">الملخص المالي</td></tr>
    <tr>
      <td style="padding:7px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">إجمالي أيام العمل:</td>
      <td style="padding:7px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">${data.totals.totalWorkDays.toFixed(2)} يوم</td>
    </tr>
    <tr>
      <td style="padding:7px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">إجمالي المستحق:</td>
      <td style="padding:7px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalEarned)} ر.ي</td>
    </tr>
    <tr>
      <td style="padding:7px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">إجمالي المدفوع:</td>
      <td style="padding:7px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">${formatNumber(data.totals.totalPaid)} ر.ي</td>
    </tr>
    <tr>
      <td style="padding:7px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">إجمالي الحوالات:</td>
      <td style="padding:7px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalTransfers)} ر.ي</td>
    </tr>
    <tr style="background:#1F4E79;">
      <td style="padding:7px 12px;font-weight:800;border:1px solid #16365C;font-size:13px;color:#fff;">الرصيد النهائي:</td>
      <td style="padding:7px 12px;text-align:left;border:1px solid #16365C;font-size:13px;font-weight:800;color:#fff;">${formatNumber(data.totals.finalBalance)} ر.ي</td>
    </tr>
  </table>
</div>

<div style="margin-top:40px;display:flex;justify-content:space-around;padding:0 20px;">
  <div style="text-align:center;min-width:150px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:40px;">العامل</div>
    <div style="border-top:2px solid #333;padding-top:5px;font-size:10px;color:#666;">التوقيع</div>
  </div>
  <div style="text-align:center;min-width:150px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:40px;">المهندس</div>
    <div style="border-top:2px solid #333;padding-top:5px;font-size:10px;color:#666;">التوقيع</div>
  </div>
  <div style="text-align:center;min-width:150px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:40px;">المدير</div>
    <div style="border-top:2px solid #333;padding-top:5px;font-size:10px;color:#666;">التوقيع</div>
  </div>
</div>

<div style="text-align:center;font-size:9px;color:#7F7F7F;margin-top:30px;padding:8px;border-top:1px solid #EEE;">
  تم إنشاء هذا التقرير بواسطة نظام إدارة مشاريع البناء | ${data.generatedAt}
</div>

</body>
</html>`;
}
