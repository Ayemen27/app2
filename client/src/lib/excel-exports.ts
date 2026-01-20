import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportWorkerStatement = async (data: any, worker: any) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('كشف حساب عامل');

  // إعدادات الصفحة والاتجاه (من اليمين لليسار)
  worksheet.views = [{ rightToLeft: true }];

  // العنوان الرئيسي
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'كشف حساب العامل التفصيلي والشامل';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

  // بيانات الترويسة
  worksheet.mergeCells('A2:B2');
  worksheet.getCell('A2').value = `اسم العامل: ${worker.name}`;
  worksheet.mergeCells('C2:E2');
  worksheet.getCell('C2').value = `المشروع: ${data.projectName || 'جميع المشاريع'}`;
  
  worksheet.mergeCells('A3:B3');
  worksheet.getCell('A3').value = `نوع العامل: ${worker.type}`;
  worksheet.mergeCells('C3:E3');
  worksheet.getCell('C3').value = `الفترة: ${data.dateRange || 'الكل'}`;
  
  worksheet.mergeCells('A4:B4');
  worksheet.getCell('A4').value = `الأجر اليومي: ${worker.dailyWage} ر.ي`;
  worksheet.mergeCells('C4:E4');
  worksheet.getCell('C4').value = `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-YE')}`;

  // ترويسة الجدول
  const headerRow = worksheet.getRow(6);
  headerRow.values = ['م', 'التاريخ', 'اليوم', 'وصف العمل', 'الساعات', 'الأجر المستحق', 'المبلغ المدفوع'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // إضافة البيانات
  let totalEarned = 0;
  let totalPaid = 0;
  
  const attendance = data.attendance || [];
  attendance.forEach((item: any, index: number) => {
    const row = worksheet.addRow([
      index + 1,
      item.date,
      new Date(item.date).toLocaleDateString('ar-YE', { weekday: 'long' }),
      item.notes || 'العمال تم عمل...',
      '07:00-15:00',
      parseFloat(item.totalPay || 0),
      parseFloat(item.paidAmount || 0)
    ]);
    
    totalEarned += parseFloat(item.totalPay || 0);
    totalPaid += parseFloat(item.paidAmount || 0);
    
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    row.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  // تذييل الجدول (الإجماليات)
  const footerRow = worksheet.addRow(['', '', '', 'الإجماليات', '', totalEarned, totalPaid]);
  footerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  footerRow.eachCell((cell, colNumber) => {
    if (colNumber >= 4) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    }
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    cell.alignment = { horizontal: 'center' };
  });

  // الملخص المالي الجانبي
  worksheet.addRow([]);
  const summaryStartRow = worksheet.rowCount + 1;
  
  worksheet.mergeCells(`F${summaryStartRow}:G${summaryStartRow}`);
  worksheet.getCell(`F${summaryStartRow}`).value = 'الملخص المالي';
  worksheet.getCell(`F${summaryStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  worksheet.getCell(`F${summaryStartRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell(`F${summaryStartRow}`).alignment = { horizontal: 'center' };

  const addSummaryRow = (label: string, value: number, color?: string) => {
    const rowNum = worksheet.rowCount + 1;
    worksheet.getCell(`F${rowNum}`).value = label;
    worksheet.getCell(`G${rowNum}`).value = value;
    worksheet.getCell(`F${rowNum}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    worksheet.getCell(`G${rowNum}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  };

  addSummaryRow('اجمالي المكتسب:', totalEarned);
  addSummaryRow('اجمالي المدفوع:', totalPaid);
  addSummaryRow('اجمالي المحول:', data.totalTransferred || 0);
  addSummaryRow('الرصيد النهائي:', totalEarned - totalPaid - (data.totalTransferred || 0));

  // تنسيق الأعمدة
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 15;
  worksheet.getColumn(3).width = 12;
  worksheet.getColumn(4).width = 40;
  worksheet.getColumn(5).width = 15;
  worksheet.getColumn(6).width = 15;
  worksheet.getColumn(7).width = 15;

  // حفظ الملف
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `كشف_حساب_${worker.name}_${new Date().getTime()}.xlsx`);
};
