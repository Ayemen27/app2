import type { DailyReportData, ReportKPI } from '../../../../shared/report-types';

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

export function generateDailyReportHTML(data: DailyReportData): string {
  const kpiCards = data.kpis.map((kpi) => {
    const color = getKPIColor(kpi);
    return `<div style="flex:1;min-width:120px;background:#fff;border:2px solid ${color};border-radius:6px;padding:10px 12px;text-align:center;">
      <div style="font-size:10px;color:#666;margin-bottom:4px;">${kpi.label}</div>
      <div style="font-size:16px;font-weight:800;color:${color};">${formatKPIValue(kpi)}</div>
    </div>`;
  }).join('');

  const attendanceRows = data.attendance.map((rec, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(rec.workerName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${rec.workerType}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${rec.workDays.toFixed(2)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${formatNumber(rec.dailyWage)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#E2F0D9;font-weight:700;">${formatNumber(rec.totalWage)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#FBE2D5;font-weight:700;">${formatNumber(rec.paidAmount)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;background:#DEEAF6;font-weight:700;">${formatNumber(rec.remainingAmount)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:9px;text-align:right;">${escapeHtml(rec.workDescription) || '-'}</td>
    </tr>`;
  }).join('');

  const materialRows = data.materials.map((mat, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(mat.materialName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${escapeHtml(mat.category)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${formatNumber(mat.quantity)} ${escapeHtml(mat.unit)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${formatNumber(mat.unitPrice)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(mat.totalAmount)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${formatNumber(mat.paidAmount)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(mat.supplierName)}</td>
    </tr>`;
  }).join('');

  const transportRows = data.transport.map((tr, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(tr.description)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(tr.workerName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(tr.amount)}</td>
    </tr>`;
  }).join('');

  const miscRows = data.miscExpenses.map((exp, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(exp.description)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:9px;text-align:right;">${escapeHtml(exp.notes) || '-'}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(exp.amount)}</td>
    </tr>`;
  }).join('');

  const workerTransferRows = data.workerTransfers.map((wt, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(wt.workerName)}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(wt.recipientName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${escapeHtml(wt.transferMethod)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(wt.amount)}</td>
    </tr>`;
  }).join('');

  const fundTransferRows = data.fundTransfers.map((ft, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#F2F7FB';
    return `<tr style="background:${bgColor};">
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 6px;border:1px solid #BFBFBF;font-size:10px;text-align:right;">${escapeHtml(ft.senderName)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${escapeHtml(ft.transferType)}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;">${escapeHtml(ft.transferNumber) || '-'}</td>
      <td style="padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;text-align:center;font-weight:700;">${formatNumber(ft.amount)}</td>
    </tr>`;
  }).join('');

  const tableHeaderStyle = 'background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;';
  const sectionTitleStyle = 'background:#1F4E79;color:#fff;padding:6px 12px;font-size:12px;font-weight:800;border:1px solid #16365C;margin-top:20px;';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>التقرير اليومي - ${escapeHtml(data.project.name)} - ${data.date}</title>
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
  <div style="font-size:13px;margin-top:2px;opacity:0.9;">التقرير اليومي التفصيلي</div>
</div>

<div style="display:flex;justify-content:space-between;padding:8px 10px;background:#F2F7FB;border:1px solid #D6E4F0;margin-bottom:12px;">
  <div style="font-size:11px;">
    <div style="margin-bottom:3px;"><b>المشروع:</b> ${escapeHtml(data.project.name)}</div>
    ${data.project.location ? `<div style="margin-bottom:3px;"><b>الموقع:</b> ${escapeHtml(data.project.location)}</div>` : ''}
    ${data.project.engineerName ? `<div><b>المهندس:</b> ${escapeHtml(data.project.engineerName)}</div>` : ''}
  </div>
  <div style="font-size:11px;text-align:left;">
    <div style="margin-bottom:3px;"><b>التاريخ:</b> ${data.date}</div>
    ${data.project.managerName ? `<div><b>المدير:</b> ${escapeHtml(data.project.managerName)}</div>` : ''}
  </div>
</div>

<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
  ${kpiCards}
</div>

${data.attendance.length > 0 ? `
<div style="${sectionTitleStyle}">سجل الحضور والعمالة</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">اسم العامل</th>
      <th style="${tableHeaderStyle}width:60px;">النوع</th>
      <th style="${tableHeaderStyle}width:50px;">الأيام</th>
      <th style="${tableHeaderStyle}width:65px;">الأجر اليومي</th>
      <th style="${tableHeaderStyle}width:70px;">المستحق</th>
      <th style="${tableHeaderStyle}width:70px;">المدفوع</th>
      <th style="${tableHeaderStyle}width:70px;">المتبقي</th>
      <th style="${tableHeaderStyle}">وصف العمل</th>
    </tr>
  </thead>
  <tbody>
    ${attendanceRows}
    <tr style="background:#00B050;">
      <td colspan="3" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${data.totals.totalWorkDays.toFixed(2)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">-</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalWorkerWages)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalPaidWages)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalWorkerWages - data.totals.totalPaidWages)}</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${data.totals.workerCount} عامل</td>
    </tr>
  </tbody>
</table>
` : ''}

${data.materials.length > 0 ? `
<div class="page-break"></div>
<div style="${sectionTitleStyle}">المواد والمشتريات</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">المادة</th>
      <th style="${tableHeaderStyle}width:70px;">الفئة</th>
      <th style="${tableHeaderStyle}width:80px;">الكمية</th>
      <th style="${tableHeaderStyle}width:65px;">سعر الوحدة</th>
      <th style="${tableHeaderStyle}width:70px;">الإجمالي</th>
      <th style="${tableHeaderStyle}width:70px;">المدفوع</th>
      <th style="${tableHeaderStyle}">المورد</th>
    </tr>
  </thead>
  <tbody>
    ${materialRows}
    <tr style="background:#00B050;">
      <td colspan="5" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalMaterials)}</td>
      <td colspan="2" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">-</td>
    </tr>
  </tbody>
</table>
` : ''}

${data.transport.length > 0 ? `
<div style="${sectionTitleStyle}">النقل والمواصلات</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">الوصف</th>
      <th style="${tableHeaderStyle}width:120px;">العامل</th>
      <th style="${tableHeaderStyle}width:80px;">المبلغ</th>
    </tr>
  </thead>
  <tbody>
    ${transportRows}
    <tr style="background:#00B050;">
      <td colspan="3" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalTransport)}</td>
    </tr>
  </tbody>
</table>
` : ''}

${data.miscExpenses.length > 0 ? `
<div style="${sectionTitleStyle}">مصروفات متنوعة</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">الوصف</th>
      <th style="${tableHeaderStyle}">ملاحظات</th>
      <th style="${tableHeaderStyle}width:80px;">المبلغ</th>
    </tr>
  </thead>
  <tbody>
    ${miscRows}
    <tr style="background:#00B050;">
      <td colspan="3" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalMiscExpenses)}</td>
    </tr>
  </tbody>
</table>
` : ''}

${data.workerTransfers.length > 0 ? `
<div style="${sectionTitleStyle}">حوالات العمال</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">العامل</th>
      <th style="${tableHeaderStyle}">المستلم</th>
      <th style="${tableHeaderStyle}width:80px;">الطريقة</th>
      <th style="${tableHeaderStyle}width:80px;">المبلغ</th>
    </tr>
  </thead>
  <tbody>
    ${workerTransferRows}
    <tr style="background:#00B050;">
      <td colspan="4" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalWorkerTransfers)}</td>
    </tr>
  </tbody>
</table>
` : ''}

${data.fundTransfers.length > 0 ? `
<div style="${sectionTitleStyle}">التحويلات المالية</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <thead>
    <tr>
      <th style="${tableHeaderStyle}width:30px;">م</th>
      <th style="${tableHeaderStyle}">المرسل</th>
      <th style="${tableHeaderStyle}width:80px;">النوع</th>
      <th style="${tableHeaderStyle}width:100px;">رقم التحويل</th>
      <th style="${tableHeaderStyle}width:80px;">المبلغ</th>
    </tr>
  </thead>
  <tbody>
    ${fundTransferRows}
    <tr style="background:#00B050;">
      <td colspan="4" style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">الإجمالي</td>
      <td style="color:#fff;font-weight:800;font-size:11px;text-align:center;padding:6px;border:1px solid #00803A;">${formatNumber(data.totals.totalFundTransfers)}</td>
    </tr>
  </tbody>
</table>
` : ''}

<div class="page-break"></div>
<div style="${sectionTitleStyle}">ملخص اليوم المالي</div>
<table style="width:350px;border-collapse:collapse;margin-top:4px;">
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">إجمالي أجور العمال</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalWorkerWages)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">إجمالي المواد</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalMaterials)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">إجمالي النقل</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">${formatNumber(data.totals.totalTransport)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">المصروفات المتنوعة</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalMiscExpenses)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">حوالات العمال</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;background:#F2F7FB;">${formatNumber(data.totals.totalWorkerTransfers)} ر.ي</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">التحويلات المالية</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${formatNumber(data.totals.totalFundTransfers)} ر.ي</td>
  </tr>
  <tr style="background:#1F4E79;">
    <td style="padding:8px 12px;font-weight:800;border:1px solid #16365C;font-size:13px;color:#fff;">إجمالي المصروفات</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #16365C;font-size:13px;font-weight:800;color:#fff;">${formatNumber(data.totals.totalExpenses)} ر.ي</td>
  </tr>
  <tr style="background:#00B050;">
    <td style="padding:8px 12px;font-weight:800;border:1px solid #00803A;font-size:13px;color:#fff;">الرصيد</td>
    <td style="padding:8px 12px;text-align:left;border:1px solid #00803A;font-size:13px;font-weight:800;color:#fff;">${formatNumber(data.totals.balance)} ر.ي</td>
  </tr>
</table>

<div style="text-align:center;font-size:9px;color:#7F7F7F;margin-top:30px;padding:8px;border-top:1px solid #EEE;">
  تم إنشاء هذا التقرير بواسطة نظام إدارة مشاريع البناء | ${data.generatedAt}
</div>

</body>
</html>`;
}
