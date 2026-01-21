import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

/**
 * دالة توليد كشف حساب مطابق للهوية البصرية لشركة الفتيني
 * تدعم تكرار الرأس في كل صفحة وتصميم جداول احترافي
 */
export const generateWorkerPDF = async (data: any, worker: any) => {
  try {
    if (!data || !data.statement) {
      console.error("No data provided for PDF generation");
      return;
    }

    const workerName = worker?.name || 'عامل';
    const workerType = worker?.type || 'عامل';
    const dailyWage = worker?.dailyWage ? `${parseFloat(worker.dailyWage).toLocaleString()} ر.ي` : '-';
    const reportDate = format(new Date(), 'yyyy/MM/dd');
    const totalEarned = parseFloat(data?.summary?.totalEarned || 0);
    const totalPaid = parseFloat(data?.summary?.totalPaid || 0);
    const finalBalance = parseFloat(data?.summary?.finalBalance || 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب العامل - ${workerName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; color: #000; background: #fff; }
          
          @page {
            size: A4;
            margin: 10mm 5mm 15mm 5mm;
          }
          
          .print-container { width: 100%; padding: 0; }

          /* تكرار الرأس في كل صفحة */
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            table-layout: fixed;
          }
          
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
          
          /* تصميم ترويسة التقرير */
          .report-header-content {
            padding: 0;
            margin: 0;
            width: 100%;
          }

          .main-title-bar {
            background-color: #1F4E79;
            color: white;
            text-align: center;
            padding: 8px 0;
            font-size: 18px;
            font-weight: 800;
            width: 100%;
            margin-bottom: 15px;
            border-bottom: 2px solid #16365C;
          }

          .header-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 0 10px 15px 10px;
            font-size: 13px;
          }
          
          .info-col { display: flex; flex-direction: column; gap: 4px; }
          .info-row { display: flex; justify-content: flex-start; align-items: baseline; }
          .info-label { font-weight: 700; width: 100px; color: #333; }
          .info-value { font-weight: 400; color: #000; }
          
          th {
            background-color: #1F4E79;
            color: #FFFFFF;
            border: 1px solid #16365C;
            padding: 8px 4px;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
          }

          td {
            border: 1px solid #BFBFBF;
            padding: 6px 4px;
            font-size: 10px;
            text-align: center;
            vertical-align: middle;
            word-wrap: break-word;
          }

          .col-m { width: 30px; }
          .col-date { width: 80px; }
          .col-day { width: 60px; }
          .col-project { width: 110px; }
          .col-desc { width: auto; text-align: right; padding-right: 8px; font-size: 9px; line-height: 1.4; }
          .col-days-count { width: 45px; }
          .col-hours { width: 85px; }
          .col-earned { width: 70px; background-color: #E2F0D9; font-weight: 700; }
          .col-paid { width: 70px; background-color: #FBE2D5; font-weight: 700; }
          .col-balance { width: 70px; background-color: #DEEAF6; font-weight: 700; }

          .totals-row td {
            background-color: #00B050;
            color: white;
            font-weight: 800;
            font-size: 12px;
            border: 1px solid #00803A;
          }

          .summary-wrapper {
            display: flex;
            justify-content: flex-start;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          
          .summary-table {
            width: 320px;
            border: 2px solid #1F4E79;
          }
          
          .summary-header {
            background-color: #00B050;
            color: white;
            text-align: center;
            font-weight: 800;
            padding: 6px;
            font-size: 14px;
          }
          
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid #BFBFBF;
            font-size: 13px;
          }
          
          .summary-item:last-child { border-bottom: none; background-color: #F2F2F2; font-weight: 800; }
          .summary-label { font-weight: 700; }
          .summary-val { font-family: sans-serif; }

          .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: #7F7F7F;
            padding: 5px;
            border-top: 1px solid #EEE;
            background: white;
          }

          @media print {
            thead { display: table-header-group; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <table>
            <thead>
              <tr>
                <th colspan="10" style="padding: 0; border: none; background: none;">
                  <div class="report-header-content">
                    <div class="main-title-bar">كشف حساب العامل التفصيلي والشامل</div>
                    <div class="header-info-grid">
                      <div class="info-col">
                        <div class="info-row"><span class="info-label">اسم العامل:</span><span class="info-value">${workerName}</span></div>
                        <div class="info-row"><span class="info-label">نوع العامل:</span><span class="info-value">${workerType}</span></div>
                        <div class="info-row"><span class="info-label">الأجر اليومي:</span><span class="info-value">${dailyWage}</span></div>
                      </div>
                      <div class="info-col">
                        <div class="info-row"><span class="info-label">حالة المشروع:</span><span class="info-value">${data?.projectName || 'تعدد مشاريع'}</span></div>
                        <div class="info-row"><span class="info-label">تاريخ الإصدار:</span><span class="info-value">${reportDate}</span></div>
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
              <tr>
                <th class="col-m">م</th>
                <th class="col-date">التاريخ</th>
                <th class="col-day">اليوم</th>
                <th class="col-project">المشروع</th>
                <th class="col-desc">وصف العمل</th>
                <th class="col-days-count">الأيام</th>
                <th class="col-hours">الساعات</th>
                <th class="col-earned">الأجر المستحق</th>
                <th class="col-paid">المبلغ المدفوع</th>
                <th class="col-balance">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${(data?.statement || []).map((item: any, idx: number) => `
                <tr>
                  <td class="col-m">${idx + 1}</td>
                  <td class="col-date">${item.date ? format(new Date(item.date), 'yyyy/MM/dd') : '-'}</td>
                  <td class="col-day">${item.date ? format(new Date(item.date), 'EEEE', { locale: arSA }) : '-'}</td>
                  <td class="col-project">${item.projectName || item.project_name || '-'}</td>
                  <td class="col-desc">${item.description || (item.type === 'حوالة' ? `حوالة لـ ${item.recipientName || '-'}` : 'تنفيذ مهام العمل الموكلة')}</td>
                  <td class="col-days-count">${item.type === 'عمل' ? (item.workDays || item.work_days || '1.00') : '-'}</td>
                  <td class="col-hours">${item.type === 'عمل' ? (item.hours || '07:00-15:00') : '-'}</td>
                  <td class="col-earned">${parseFloat(item.amount || 0).toLocaleString()}</td>
                  <td class="col-paid">${parseFloat(item.paid || 0).toLocaleString()}</td>
                  <td class="col-balance">${parseFloat(item.balance || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td colspan="7" style="text-align: center;">الإجماليــــــــــــــــــــــــات</td>
                <td>${totalEarned.toLocaleString()}</td>
                <td>${totalPaid.toLocaleString()}</td>
                <td>${finalBalance.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary-wrapper">
            <div class="summary-table">
              <div class="summary-header">الملخص المالي</div>
              <div class="summary-item">
                <span class="summary-label">إجمالي المكتسب:</span>
                <span class="summary-val">${totalEarned.toLocaleString()}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">إجمالي المدفوع:</span>
                <span class="summary-val">${totalPaid.toLocaleString()}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">إجمالي المحول:</span>
                <span class="summary-val">0</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">الرصيد النهائي:</span>
                <span class="summary-val">${finalBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="page-footer">
          تم إنشاء هذا التقرير بواسطة نظام إدارة مشاريع البناء | ${format(new Date(), 'dd/MM/yyyy HH:mm')}
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

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة لعرض التقرير.");
    }

  } catch (error) {
    console.error("Critical Print Error:", error);
    alert("عذراً، تعذر إنشاء التقرير.");
  }
};
