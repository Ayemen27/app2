import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { downloadFile } from '@/utils/webview-download';

function buildWorkerHTML(data: any, worker: any): string {
  const workerName = worker?.name || 'عامل';
  const workerType = worker?.type || 'عامل';
  const dailyWage = worker?.dailyWage ? `${parseFloat(worker.dailyWage).toLocaleString()} ر.ي` : '-';
  const reportDate = format(new Date(), 'yyyy/MM/dd');
  const totalEarned = parseFloat(data?.summary?.totalEarned || 0);
  const totalPaid = parseFloat(data?.summary?.totalPaid || 0);
  const finalBalance = parseFloat(data?.summary?.finalBalance || 0);

  const rows = (data?.statement || []).map((item: any, idx: number) => {
    const amount = parseFloat(item.amount || 0);
    const paid = parseFloat(item.paid || 0);
    const balance = amount - paid;
    return `<tr>
      <td style="width:30px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;">${idx + 1}</td>
      <td style="width:75px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;">${item.date ? format(new Date(item.date), 'yyyy/MM/dd') : '-'}</td>
      <td style="width:55px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;">${item.date ? format(new Date(item.date), 'EEEE', { locale: arSA }) : '-'}</td>
      <td style="width:100px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:9px;">${item.projectName || item.project_name || '-'}</td>
      <td style="text-align:right;padding:5px 6px;border:1px solid #BFBFBF;font-size:9px;line-height:1.3;">${item.description || (item.type === 'حوالة' ? `حوالة لـ ${item.recipientName || '-'}` : 'تنفيذ مهام العمل')}</td>
      <td style="width:40px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;">${item.type === 'عمل' ? (item.workDays !== undefined ? parseFloat(item.workDays).toFixed(2) : '1.00') : '-'}</td>
      <td style="width:65px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;">${item.type === 'عمل' ? (item.hours || '07:00-15:00') : '-'}</td>
      <td style="width:65px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;background:#E2F0D9;font-weight:700;">${amount.toLocaleString()}</td>
      <td style="width:65px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;background:#FBE2D5;font-weight:700;">${paid.toLocaleString()}</td>
      <td style="width:65px;text-align:center;padding:5px 3px;border:1px solid #BFBFBF;font-size:10px;background:#DEEAF6;font-weight:700;">${balance.toLocaleString()}</td>
    </tr>`;
  }).join('');

  return `<div style="direction:rtl;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;padding:0;margin:0;width:794px;">
    <div style="background:#1F4E79;color:#fff;text-align:center;padding:10px 0;font-size:18px;font-weight:800;margin-bottom:12px;">كشف حساب العامل التفصيلي والشامل</div>
    <div style="display:flex;justify-content:space-between;margin:0 10px 12px 10px;font-size:12px;">
      <div>
        <div style="margin-bottom:4px;"><b style="display:inline-block;width:90px;">اسم العامل:</b> ${workerName}</div>
        <div style="margin-bottom:4px;"><b style="display:inline-block;width:90px;">نوع العامل:</b> ${workerType}</div>
        <div><b style="display:inline-block;width:90px;">الأجر اليومي:</b> ${dailyWage}</div>
      </div>
      <div>
        <div style="margin-bottom:4px;"><b style="display:inline-block;width:90px;">المشروع:</b> ${data?.projectName || 'تعدد مشاريع'}</div>
        <div><b style="display:inline-block;width:90px;">تاريخ الإصدار:</b> ${reportDate}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead>
        <tr>
          <th style="width:30px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">م</th>
          <th style="width:75px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">التاريخ</th>
          <th style="width:55px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">اليوم</th>
          <th style="width:100px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">المشروع</th>
          <th style="background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">وصف العمل</th>
          <th style="width:40px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">الأيام</th>
          <th style="width:65px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">الساعات</th>
          <th style="width:65px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">المستحق</th>
          <th style="width:65px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">المدفوع</th>
          <th style="width:65px;background:#1F4E79;color:#fff;border:1px solid #16365C;padding:7px 3px;font-size:10px;font-weight:800;text-align:center;">المتبقي</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="5" style="background:#00B050;color:#fff;font-weight:800;font-size:12px;text-align:center;padding:7px;border:1px solid #00803A;">الإجماليــــــات</td>
          <td style="background:#00B050;color:#fff;font-weight:800;font-size:11px;text-align:center;padding:7px;border:1px solid #00803A;">${parseFloat(data?.summary?.totalWorkDays || 0).toLocaleString()}</td>
          <td style="background:#00B050;color:#fff;font-weight:800;font-size:11px;text-align:center;padding:7px;border:1px solid #00803A;">-</td>
          <td style="background:#00B050;color:#fff;font-weight:800;font-size:11px;text-align:center;padding:7px;border:1px solid #00803A;">${totalEarned.toLocaleString()}</td>
          <td style="background:#00B050;color:#fff;font-weight:800;font-size:11px;text-align:center;padding:7px;border:1px solid #00803A;">${totalPaid.toLocaleString()}</td>
          <td style="background:#00B050;color:#fff;font-weight:800;font-size:11px;text-align:center;padding:7px;border:1px solid #00803A;">${finalBalance.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:20px;">
      <table style="width:300px;border:2px solid #1F4E79;border-collapse:collapse;">
        <tr><td colspan="2" style="background:#00B050;color:#fff;text-align:center;font-weight:800;padding:6px;font-size:13px;border:1px solid #00803A;">الملخص المالي</td></tr>
        <tr><td style="padding:6px 10px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">إجمالي المكتسب:</td><td style="padding:6px 10px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${totalEarned.toLocaleString()}</td></tr>
        <tr><td style="padding:6px 10px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;">إجمالي المدفوع:</td><td style="padding:6px 10px;text-align:left;border:1px solid #BFBFBF;font-size:12px;">${totalPaid.toLocaleString()}</td></tr>
        <tr><td style="padding:6px 10px;font-weight:700;border:1px solid #BFBFBF;font-size:12px;background:#F2F2F2;">الرصيد النهائي:</td><td style="padding:6px 10px;text-align:left;border:1px solid #BFBFBF;font-size:12px;font-weight:800;background:#F2F2F2;">${finalBalance.toLocaleString()}</td></tr>
      </table>
    </div>
    <div style="text-align:center;font-size:9px;color:#7F7F7F;margin-top:20px;padding:5px;border-top:1px solid #EEE;">
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

    const html = buildWorkerHTML(data, worker);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.background = '#fff';
    container.style.zIndex = '-1';
    container.innerHTML = html;
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
