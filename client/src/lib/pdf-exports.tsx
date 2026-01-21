import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

/**
 * دالة بسيطة لتوليد ملف HTML وتحويله إلى PDF عبر متصفح العميل (الطباعة)
 * هذا الحل هو الأكثر استقراراً للمتصفحات الجوالة (Safari/Chrome on Mobile)
 */
export const generateWorkerPDF = async (data: any, worker: any) => {
  try {
    if (!data || !data.statement) {
      console.error("No data provided for PDF generation");
      return;
    }

    const workerName = worker?.name || 'عامل';
    const reportDate = format(new Date(), 'yyyy/MM/dd');
    const projectName = data?.projectName || 'جميع المشاريع';
    const workerType = worker?.type || 'عامل';

    // بناء محتوى التقرير بنظام HTML احترافي
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${workerName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          body { font-family: 'Cairo', sans-serif; padding: 20px; color: #1e293b; line-height: 1.6; background: #fff; }
          .header { background: #1e3a8a; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0; opacity: 0.9; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .info-item { font-size: 14px; text-align: right; }
          .info-item span { font-weight: bold; color: #1e3a8a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #334155; color: white; padding: 12px; text-align: center; }
          td { border-bottom: 1px solid #f1f5f9; padding: 10px; text-align: center; }
          tr:nth-child(even) { background: #f8fafc; }
          .amount-earned { color: #10b981; font-weight: bold; }
          .amount-paid { color: #f43f5e; font-weight: bold; }
          .summary-section { margin-top: 40px; display: flex; justify-content: flex-start; }
          .summary-box { border: 2px solid #1e3a8a; border-radius: 8px; width: 300px; overflow: hidden; }
          .summary-row { display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .summary-row:last-child { border-bottom: none; background: #dbeafe; }
          .summary-label { font-weight: bold; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .header { border-radius: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>شركة الفتيني للمقاولات العامة</h1>
          <p>كشف حساب مالي تفصيلي للموظف</p>
        </div>

        <div class="info-grid">
          <div class="info-item"><span>اسم الموظف:</span> ${workerName}</div>
          <div class="info-item"><span>المشروع:</span> ${projectName}</div>
          <div class="info-item"><span>المسمى الوظيفي:</span> ${workerType}</div>
          <div class="info-item"><span>تاريخ التقرير:</span> ${reportDate}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>اليوم</th>
              <th>المشروع</th>
              <th style="width: 30%">تفاصيل العمل</th>
              <th>مستحق (+)</th>
              <th>مدفوع (-)</th>
            </tr>
          </thead>
          <tbody>
            ${(data?.statement || []).map((item: any) => `
              <tr>
                <td>${item.date ? format(new Date(item.date), 'yyyy/MM/dd') : '-'}</td>
                <td>${item.date ? format(new Date(item.date), 'EEEE', { locale: arSA }) : '-'}</td>
                <td>${item.projectName || '-'}</td>
                <td style="text-align: right">${item.description || 'تنفيذ مهام العمل'}</td>
                <td class="amount-earned">${parseFloat(item.amount || 0).toLocaleString()}</td>
                <td class="amount-paid">${parseFloat(item.paid || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">إجمالي المستحقات:</span>
              <span class="amount-earned">${parseFloat(data?.summary?.totalEarned || 0).toLocaleString()} ر.ي</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">إجمالي المدفوعات:</span>
              <span class="amount-paid">${parseFloat(data?.summary?.totalPaid || 0).toLocaleString()} ر.ي</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">الرصيد المتبقي:</span>
              <span style="color: #1e3a8a; font-weight: bold;">${parseFloat(data?.summary?.finalBalance || 0).toLocaleString()} ر.ي</span>
            </div>
          </div>
        </div>

        <div class="footer">
          تم توليد هذا التقرير آلياً عبر نظام إدارة شركة الفتيني. تاريخ الاستخراج: ${format(new Date(), 'yyyy/MM/dd HH:mm')}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    // إنشاء Blob من محتوى HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // فتح نافذة جديدة
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) لعرض التقرير.");
    }

  } catch (error) {
    console.error("Critical Print Error:", error);
    alert("عذراً، تعذر إنشاء التقرير. يرجى المحاولة مرة أخرى.");
  }
};
