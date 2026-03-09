import type { PeriodFinalReportData, ReportKPI } from '../../../../shared/report-types';

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

export function generatePeriodFinalHTML(data: PeriodFinalReportData): string {
  const kpiCards = data.kpis.map((kpi) => {
    const color = getKPIColor(kpi);
    return `<div style="flex:1;min-width:110px;background:#fff;border:2px solid ${color};border-radius:6px;padding:10px 10px;text-align:center;">
      <div style="font-size:9px;color:#666;margin-bottom:3px;">${kpi.label}</div>
      <div style="font-size:15px;font-weight:800;color:${color};">${formatKPIValue(kpi)}</div>
    </div>`;
  }).join('');

  const attendanceByWorkerRows = data.sections.attendance.byWorker.map((w, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(w.workerName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${w.workerType}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${w.totalDays.toFixed(2)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#E2F0D9;font-weight:700;">${formatNumber(w.totalEarned)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#FBE2D5;font-weight:700;">${formatNumber(w.totalPaid)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#DEEAF6;font-weight:700;">${formatNumber(w.balance)}</td>
    </tr>`;
  }).join('');

  const materialItemRows = data.sections.materials.items.map((item, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(item.materialName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${formatNumber(item.totalQuantity)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(item.totalAmount)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(item.supplierName)}</td>
    </tr>`;
  }).join('');

  const fundTransferRows = data.sections.fundTransfers.items.map((ft, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${ft.date}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${ft.senderName}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${ft.transferType}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(ft.amount)}</td>
    </tr>`;
  }).join('');

  const attendanceSummaryRows = data.sections.attendance.summary.map((s, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${s.date}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${s.workerCount}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${s.totalWorkDays.toFixed(2)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(s.totalWages)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${formatNumber(s.totalPaid)}</td>
    </tr>`;
  }).join('');

  const tableHeaderStyle = 'background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;';
  const sectionTitleStyle = 'background:#1F4E79;color:#fff;padding:6px 12px;font-size:12px;font-weight:800;border:1px solid #16365C;margin-top:20px;';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>التقرير النهائي للفترة - ${escapeHtml(data.project.name)}</title>
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
  <div style="font-size:13px;margin-top:2px;opacity:0.9;">التقرير النهائي للفترة</div>
</div>

<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#F2F7FB;border:1px solid #D6E4F0;margin-bottom:10px;">
  <div style="font-size:11px;">
    <div style="margin-bottom:3px;"><b>المشروع:</b> ${escapeHtml(data.project.name)}</div>
    ${data.project.location ? `<div style="margin-bottom:3px;"><b>الموقع:</b> ${escapeHtml(data.project.location)}</div>` : ''}
    ${data.project.engineerName ? `<div style="margin-bottom:3px;"><b>المهندس:</b> ${escapeHtml(data.project.engineerName)}</div>` : ''}
    ${data.project.status ? `<div><b>الحالة:</b> ${data.project.status}</div>` : ''}
  </div>
  <div style="font-size:11px;text-align:left;">
    <div style="margin-bottom:3px;"><b>الفترة من:</b> ${data.period.from}</div>
    <div style="margin-bottom:3px;"><b>الفترة إلى:</b> ${data.period.to}</div>
    ${data.project.managerName ? `<div style="margin-bottom:3px;"><b>المدير:</b> ${escapeHtml(data.project.managerName)}</div>` : ''}
    ${data.project.budget ? `<div><b>الميزانية:</b> ${formatNumber(data.project.budget)} ر.ي</div>` : ''}
  </div>
</div>

<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
  ${kpiCards}
</div>

${data.sections.attendance.summary.length > 0 ? `
<div style="${sectionTitleStyle}">ملخص الحضور اليومي</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:80px;">التاريخ</th>
      <th style="${tableHeaderStyle}width:70px;">عدد العمال</th>
      <th style="${tableHeaderStyle}width:70px;">أيام العمل</th>
      <th style="${tableHeaderStyle}width:90px;">إجمالي الأجور</th>
      <th style="${tableHeaderStyle}width:90px;">المدفوع</th>
    </tr>
  </thead>
  <tbody>
    ${attendanceSummaryRows}
  </tbody>
</table>
` : ''}

${data.sections.attendance.byWorker.length > 0 ? `
<div class="page-break"></div>
<div style="${sectionTitleStyle}">ملخص العمالة حسب العامل</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">اسم العامل</th>
      <th style="${tableHeaderStyle}width:60px;">النوع</th>
      <th style="${tableHeaderStyle}width:60px;">إجمالي الأيام</th>
      <th style="${tableHeaderStyle}width:80px;">المستحق</th>
      <th style="${tableHeaderStyle}width:80px;">المدفوع</th>
      <th style="${tableHeaderStyle}width:80px;">المتبقي</th>
    </tr>
  </thead>
  <tbody>
    ${attendanceByWorkerRows}
    <tr style="background:#00B050;">
      <td colspan="3" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${data.sections.attendance.byWorker.reduce((s, w) => s + w.totalDays, 0).toFixed(2)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalWages)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.sections.attendance.byWorker.reduce((s, w) => s + w.totalPaid, 0))}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.sections.attendance.byWorker.reduce((s, w) => s + w.balance, 0))}</td>
    </tr>
  </tbody>
</table>
` : ''}

${data.sections.materials.items.length > 0 ? `
<div class="page-break"></div>
<div style="${sectionTitleStyle}">ملخص المواد والمشتريات</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">المادة</th>
      <th style="${tableHeaderStyle}width:80px;">الكمية الإجمالية</th>
      <th style="${tableHeaderStyle}width:90px;">المبلغ الإجمالي</th>
      <th style="${tableHeaderStyle}">المورد</th>
    </tr>
  </thead>
  <tbody>
    ${materialItemRows}
    <tr style="background:#00B050;">
      <td colspan="3" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.sections.materials.total)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">المدفوع: ${formatNumber(data.sections.materials.totalPaid)}</td>
    </tr>
  </tbody>
</table>
` : ''}

${data.sections.fundTransfers.items.length > 0 ? `
<div style="${sectionTitleStyle}">التحويلات المالية</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}width:80px;">التاريخ</th>
      <th style="${tableHeaderStyle}">المرسل</th>
      <th style="${tableHeaderStyle}width:80px;">النوع</th>
      <th style="${tableHeaderStyle}width:90px;">المبلغ</th>
    </tr>
  </thead>
  <tbody>
    ${fundTransferRows}
    <tr style="background:#00B050;">
      <td colspan="4" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.sections.fundTransfers.total)}</td>
    </tr>
  </tbody>
</table>
` : ''}

<div class="page-break"></div>
<div style="${sectionTitleStyle}">الملخص المالي الشامل</div>
<table style="width:400px;border-collapse:collapse;margin-top:4px;">
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#E2F0D9;">إجمالي الدخل (التحويلات الواردة)</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;background:#E2F0D9;font-weight:700;">${formatNumber(data.totals.totalIncome)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">إجمالي الأجور</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalWages)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">إجمالي المواد</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">${formatNumber(data.totals.totalMaterials)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">إجمالي النقل</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalTransport)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">المصروفات المتنوعة</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">${formatNumber(data.totals.totalMisc)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">حوالات العمال</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalWorkerTransfers)} ر.ي</td>
  </tr>
  <tr style="background:#FBE2D5;">
    <td style="padding:8px 12px;font-weight:800;border:1px solid #BFBFBF;font-size:13px;">إجمالي المصروفات</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:13px;font-weight:800;">${formatNumber(data.totals.totalExpenses)} ر.ي</td>
  </tr>
  <tr style="background:#1F4E79;">
    <td style="padding:8px 12px;font-weight:800;border:1px solid #16365C;font-size:14px;color:#fff;">الرصيد النهائي</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #16365C;font-size:14px;font-weight:800;color:#fff;">${formatNumber(data.totals.balance)} ر.ي</td>
  </tr>
  ${data.totals.budgetUtilization !== undefined ? `
  <tr style="background:#ED7D31;">
    <td style="padding:8px 12px;font-weight:800;border:1px solid #C55A11;font-size:12px;color:#fff;">نسبة استهلاك الميزانية</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #C55A11;font-size:12px;font-weight:800;color:#fff;">${data.totals.budgetUtilization.toFixed(1)}%</td>
  </tr>
  ` : ''}
</table>

<div style="margin-top:50px;display:flex;justify-content:space-around;padding:0 10px;">
  <div style="text-align:center;min-width:140px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:45px;">المهندس</div>
    <div style="border-top:2px solid #333;padding-top:5px;font-size:10px;color:#666;">التوقيع والختم</div>
  </div>
  <div style="text-align:center;min-width:140px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:45px;">المدير</div>
    <div style="border-top:2px solid #333;padding-top:5px;font-size:10px;color:#666;">التوقيع والختم</div>
  </div>
  <div style="text-align:center;min-width:140px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:45px;">المدير المالي</div>
    <div style="border-top:2px solid #333;padding-top:5px;font-size:10px;color:#666;">التوقيع والختم</div>
  </div>
</div>

<div style="text-align:center;font-size:9px;color:#7F7F7F;margin-top:30px;padding:8px;border-top:1px solid #EEE;">
  تم إنشاء هذا التقرير بواسطة نظام إدارة مشاريع البناء | ${data.generatedAt}
</div>

</body>
</html>`;
}
