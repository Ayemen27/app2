import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { downloadFile } from '@/utils/webview-download';
import { getBranding } from '@/lib/report-branding';

function buildWorkerHTML(data: any, worker: any): string {
  // 🎨 ألوان مأخوذة من إعدادات المستخدم (ترويسة التقارير في الإعدادات)
  const _b = getBranding();
  const cPrimary = _b.primaryColor;     // إجماليات/تذييل
  const cSecondary = _b.secondaryColor; // ترويسة الجدول والمربعات
  const cBorder = '#CBD5E1';
  const cZebra = '#F8FAFC';
  const cAccentBg = '#EFF6FF';
  const cPaidBg = '#FEE2E2';

  const workerName = worker?.name || 'عامل';
  const workerType = worker?.type || 'عامل';
  const dailyWage = worker?.dailyWage ? `${parseFloat(worker.dailyWage).toLocaleString('en-US')} ر.ي` : '-';
  const reportDate = format(new Date(), 'dd/MM/yyyy');
  const totalEarned = parseFloat(data?.summary?.totalEarned || 0);
  const totalPaid = parseFloat(data?.summary?.totalPaid || 0);
  const finalBalance = parseFloat(data?.summary?.finalBalance || 0);

  const rows = (data?.statement || []).map((item: any, idx: number) => {
    const amount = parseFloat(item.amount || 0);
    const paid = parseFloat(item.paid || 0);
    const balance = amount - paid;
    return `<tr>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;white-space:nowrap;">${idx + 1}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;white-space:nowrap;">${item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;white-space:nowrap;">${item.date ? format(new Date(item.date), 'EEEE', { locale: arSA }) : '-'}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;">${item.projectName || item.project_name || '-'}</td>
      <td style="text-align:right;padding:3px 6px;border:1px solid ${cBorder};font-size:9px;line-height:1.3;">${item.description || (item.type === 'حوالة' ? `حوالة لـ ${item.recipientName || '-'}` : 'تنفيذ مهام العمل')}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;white-space:nowrap;">${item.type === 'عمل' ? (item.workDays !== undefined ? parseFloat(item.workDays).toFixed(2) : '1.00') : '-'}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;white-space:nowrap;">${item.type === 'عمل' ? (item.hours || '07:00-15:00') : '-'}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;background:${cAccentBg};font-weight:700;white-space:nowrap;">${amount.toLocaleString('en-US')}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;background:${cPaidBg};font-weight:700;white-space:nowrap;">${paid.toLocaleString('en-US')}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${cBorder};font-size:9px;background:${cZebra};font-weight:700;white-space:nowrap;">${balance.toLocaleString('en-US')}</td>
    </tr>`;
  }).join('');

  const projectSummaryMap = (data?.statement || []).reduce((acc: any, item: any) => {
    const pName = item.projectName || item.project_name || 'غير محدد';
    if (!acc[pName]) {
      acc[pName] = { earned: 0, paid: 0, days: 0 };
    }
    const amount = parseFloat(item.amount || 0);
    const paid = parseFloat(item.paid || 0);
    const days = item.type === 'عمل' ? parseFloat(item.workDays || 0) : 0;
    
    acc[pName].earned += amount;
    acc[pName].paid += paid;
    acc[pName].days += days;
    return acc;
  }, {});

  const projectSummaryRows = Object.entries(projectSummaryMap).map(([name, stats]: [string, any]) => `
    <tr>
      <td style="padding:3px 4px;border:1px solid ${cBorder};font-size:9px;">${name}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${cBorder};font-size:9px;">${stats.days.toFixed(2)}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${cBorder};font-size:9px;">${stats.earned.toLocaleString('en-US')}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${cBorder};font-size:9px;">${stats.paid.toLocaleString('en-US')}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${cBorder};font-size:9px;font-weight:700;">${(stats.earned - stats.paid).toLocaleString('en-US')}</td>
    </tr>
  `).join('');

  const projectSummaryTable = (data?.statement || []).length > 0 && Object.keys(projectSummaryMap).length > 1 ? `
    <div style="margin-top:10px;">
      <div style="background:${cSecondary};color:#fff;padding:4px 8px;font-size:10px;font-weight:800;border:1px solid ${cSecondary};">ملخص المشاريع التفصيلي</div>
      <table style="width:100%;border-collapse:collapse;margin-top:1px;">
        <thead>
          <tr style="background:${cZebra};">
            <th style="padding:3px 4px;border:1px solid ${cBorder};font-size:9px;text-align:right;">المشروع</th>
            <th style="padding:3px;border:1px solid ${cBorder};font-size:9px;text-align:center;">إجمالي الأيام</th>
            <th style="padding:3px;border:1px solid ${cBorder};font-size:9px;text-align:center;">إجمالي المستحق</th>
            <th style="padding:3px;border:1px solid ${cBorder};font-size:9px;text-align:center;">إجمالي المدفوع</th>
            <th style="padding:3px;border:1px solid ${cBorder};font-size:9px;text-align:center;">المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${projectSummaryRows}
        </tbody>
      </table>
    </div>
  ` : '';

  return `<div style="direction:rtl;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;padding:0;margin:0;width:794px;">
    <div style="background:${cSecondary};color:#fff;text-align:center;padding:6px 0;font-size:14px;font-weight:800;margin-bottom:8px;">كشف حساب العامل التفصيلي والشامل</div>
    <div style="display:flex;justify-content:space-between;margin:0 8px 8px 8px;font-size:10px;">
      <div>
        <div style="margin-bottom:2px;"><b style="display:inline-block;width:80px;">اسم العامل:</b> ${workerName}</div>
        <div style="margin-bottom:2px;"><b style="display:inline-block;width:80px;">نوع العامل:</b> ${workerType}</div>
        <div><b style="display:inline-block;width:80px;">الأجر اليومي:</b> ${dailyWage}</div>
      </div>
      <div>
        <div style="margin-bottom:2px;"><b style="display:inline-block;width:80px;">المشروع:</b> ${data?.projectName || 'تعدد مشاريع'}</div>
        <div><b style="display:inline-block;width:80px;">تاريخ الإصدار:</b> ${reportDate}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;table-layout:auto;">
      <thead>
        <tr>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">م</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">التاريخ</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">اليوم</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المشروع</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">وصف العمل</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">الأيام</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">الساعات</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المستحق</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المدفوع</th>
          <th style="background:${cSecondary};color:#fff;border:1px solid ${cPrimary};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المتبقي</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="5" style="background:${cPrimary};color:#fff;font-weight:800;font-size:10px;text-align:center;padding:4px;border:1px solid ${cSecondary};">الإجماليــــــات</td>
          <td style="background:${cPrimary};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${cSecondary};">${parseFloat(data?.summary?.totalWorkDays || 0).toLocaleString('en-US')}</td>
          <td style="background:${cPrimary};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${cSecondary};">-</td>
          <td style="background:${cPrimary};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${cSecondary};">${totalEarned.toLocaleString('en-US')}</td>
          <td style="background:${cPrimary};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${cSecondary};">${totalPaid.toLocaleString('en-US')}</td>
          <td style="background:${cPrimary};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${cSecondary};">${finalBalance.toLocaleString('en-US')}</td>
        </tr>
      </tbody>
    </table>
    ${projectSummaryTable}
    <div style="margin-top:10px;">
      <table style="width:280px;border:1px solid ${cSecondary};border-collapse:collapse;">
        <tr><td colspan="2" style="background:${cSecondary};color:#fff;text-align:center;font-weight:800;padding:4px;font-size:11px;border:1px solid ${cSecondary};">الملخص المالي</td></tr>
        <tr><td style="padding:3px 6px;font-weight:700;border:1px solid ${cBorder};font-size:10px;">إجمالي المكتسب:</td><td style="padding:3px 6px;text-align:left;border:1px solid ${cBorder};font-size:10px;">${totalEarned.toLocaleString('en-US')}</td></tr>
        <tr><td style="padding:3px 6px;font-weight:700;border:1px solid ${cBorder};font-size:10px;">إجمالي المدفوع:</td><td style="padding:3px 6px;text-align:left;border:1px solid ${cBorder};font-size:10px;">${totalPaid.toLocaleString('en-US')}</td></tr>
        <tr><td style="padding:3px 6px;font-weight:700;border:1px solid ${cBorder};font-size:10px;background:${cZebra};">الرصيد النهائي:</td><td style="padding:3px 6px;text-align:left;border:1px solid ${cBorder};font-size:10px;font-weight:800;background:${cZebra};">${finalBalance.toLocaleString('en-US')}</td></tr>
      </table>
    </div>
    <div style="text-align:center;font-size:8px;color:#7F7F7F;margin-top:12px;padding:4px;border-top:1px solid #EEE;">
      تم إنشاء هذا التقرير بواسطة نظام إدارة مشاريع البناء | ${format(new Date(), 'dd/MM/yyyy HH:mm')}
    </div>
  </div>`;
}

export const generateWorkerPDF = async (data: any, worker: any): Promise<boolean> => {
  try {
    if (!data || !data.statement) {
      console.error("No data provided for PDF generation");
      return false;
    }

    const DOMPurify = (await import('dompurify')).default;
    const html = buildWorkerHTML(data, worker);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.background = '#fff';
    container.style.zIndex = '-1';
    container.innerHTML = DOMPurify.sanitize(html, { ADD_TAGS: ['style'], ADD_ATTR: ['dir', 'lang'] });
    document.body.appendChild(container);

    await new Promise(r => setTimeout(r, 300));

    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    document.body.removeChild(container);

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', 'a4');

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    const fileName = `كشف_حساب_${worker?.name || 'عامل'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    return await downloadFile(pdfBlob, fileName, 'application/pdf');
  } catch (error) {
    console.error("PDF generation error:", error);
    return false;
  }
};
