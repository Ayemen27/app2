import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export const generateWorkerPDF = (data: any, worker: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const totalEarned = parseFloat(data.summary.totalEarned || 0);
  const totalPaid = parseFloat(data.summary.totalPaid || 0);
  const balance = parseFloat(data.summary.finalBalance || 0);

  const html = `
    <html dir="rtl" lang="ar">
    <head>
      <title>كشف حساب - ${worker.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        body { font-family: 'Cairo', sans-serif; padding: 20px; color: #1e293b; }
        .header { background: #1e3a8a; color: white; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .report-title { font-size: 18px; opacity: 0.9; }
        
        .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .info-item { background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; }
        .info-label { font-weight: bold; color: #1e3a8a; font-size: 14px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #334155; color: white; padding: 12px; font-size: 14px; text-align: center; }
        td { padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; text-align: center; }
        tr:nth-child(even) { background: #f1f5f9; }
        
        .summary-section { display: flex; justify-content: flex-end; }
        .summary-box { width: 300px; border: 2px solid #1e3a8a; border-radius: 8px; overflow: hidden; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; }
        .summary-row:last-child { border-bottom: none; background: #dbeafe; font-weight: bold; }
        .amount-pos { color: #10b981; font-weight: bold; }
        .amount-neg { color: #f43f5e; font-weight: bold; }
        
        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        
        @media print {
          .header { -webkit-print-color-adjust: exact; }
          .summary-box { -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">شركة الفتيني للمقاولات العامة</div>
        <div class="report-title">كشف حساب مالي تفصيلي للموظف</div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">اسم الموظف:</span> ${worker.name}
        </div>
        <div class="info-item">
          <span class="info-label">المشروع:</span> ${data.projectName || 'جميع المشاريع'}
        </div>
        <div class="info-item">
          <span class="info-label">المسمى الوظيفي:</span> ${worker.type || 'عامل'}
        </div>
        <div class="info-item">
          <span class="info-label">تاريخ التقرير:</span> ${format(new Date(), 'yyyy/MM/dd')}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>اليوم</th>
            <th>المشروع</th>
            <th>تفاصيل العمل</th>
            <th>مستحق (+)</th>
            <th>مدفوع (-)</th>
          </tr>
        </thead>
        <tbody>
          ${(data.statement || []).map((item: any) => `
            <tr>
              <td>${format(new Date(item.date), 'yyyy/MM/dd')}</td>
              <td>${format(new Date(item.date), 'EEEE', { locale: arSA })}</td>
              <td>${item.projectName || '-'}</td>
              <td>${item.description || 'تنفيذ مهام العمل الموكلة'}</td>
              <td class="amount-pos">${parseFloat(item.amount || 0).toLocaleString()}</td>
              <td class="amount-neg">${parseFloat(item.paid || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="summary-box">
          <div class="summary-row">
            <span>إجمالي المستحقات:</span>
            <span class="amount-pos">${totalEarned.toLocaleString()} ر.ي</span>
          </div>
          <div class="summary-row">
            <span>إجمالي المدفوعات:</span>
            <span class="amount-neg">${totalPaid.toLocaleString()} ر.ي</span>
          </div>
          <div class="summary-row">
            <span>الرصيد المتبقي:</span>
            <span style="color: #1e3a8a">${balance.toLocaleString()} ر.ي</span>
          </div>
        </div>
      </div>

      <div class="footer">
        تم توليد هذا التقرير آلياً عبر نظام إدارة شركة الفتيني. التاريخ: ${format(new Date(), 'yyyy/MM/dd HH:mm')}
      </div>

      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.onafterprint = () => window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
