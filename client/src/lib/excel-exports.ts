import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export const exportWorkerStatement = async (data: any, worker: any) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('كشف حساب عامل');

  // إعدادات الصفحة والاتجاه (من اليمين لليسار)
  worksheet.views = [{ rightToLeft: true }];

  // الألوان والخطوط (مطابقة للصور المرفقة)
  const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // أزرق غامق
  const subHeaderFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // رمادي فاتح جداً
  const emeraldFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // أخضر
  const whiteFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const darkFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  const centerAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const borderStyle: any = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 1. الترويسة العلوية (Header)
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'كشف حساب العامل التفصيلي والشامل';
  titleCell.font = { ...whiteFont, size: 16 };
  titleCell.alignment = centerAlign;
  titleCell.fill = headerFill;

  // 2. معلومات العامل (Worker Info Grid)
  const infoStartRow = 3;
  
  // Row 1 of info
  worksheet.getCell(`A${infoStartRow}`).value = 'اسم العامل:';
  worksheet.getCell(`B${infoStartRow}`).value = worker.name;
  worksheet.getCell(`D${infoStartRow}`).value = 'المشروع:';
  worksheet.getCell(`E${infoStartRow}`).value = data.projectName || 'جميع المشاريع';
  
  // Row 2 of info
  worksheet.getCell(`A${infoStartRow + 1}`).value = 'نوع العامل:';
  worksheet.getCell(`B${infoStartRow + 1}`).value = worker.type || 'عامل';
  worksheet.getCell(`D${infoStartRow + 1}`).value = 'الفترة:';
  worksheet.getCell(`E${infoStartRow + 1}`).value = data.dateRange || 'الكل';

  // Row 3 of info
  worksheet.getCell(`A${infoStartRow + 2}`).value = 'الأجر اليومي:';
  worksheet.getCell(`B${infoStartRow + 2}`).value = worker.dailyWage;
  worksheet.getCell(`D${infoStartRow + 2}`).value = 'تاريخ الإصدار:';
  worksheet.getCell(`E${infoStartRow + 2}`).value = format(new Date(), 'yyyy/MM/dd');

  // تنسيق خلايا المعلومات
  [infoStartRow, infoStartRow + 1, infoStartRow + 2].forEach(rowIdx => {
    worksheet.getRow(rowIdx).font = darkFont;
    ['A', 'D'].forEach(col => {
      worksheet.getCell(`${col}${rowIdx}`).fill = subHeaderFill;
      worksheet.getCell(`${col}${rowIdx}`).border = borderStyle;
    });
  });

  // 3. جدول البيانات الرئيسي (Table)
  const tableHeaderRow = 7;
  const columns = [
    { header: 'م', key: 'id', width: 5 },
    { header: 'المشروع', key: 'project', width: 25 },
    { header: 'التاريخ', key: 'date', width: 15 },
    { header: 'اليوم', key: 'day', width: 12 },
    { header: 'وصف العمل', key: 'description', width: 45 },
    { header: 'أيام العمل', key: 'workDays', width: 12 },
    { header: 'الساعات', key: 'hours', width: 15 },
    { header: 'الأجر المستحق', key: 'earned', width: 15 },
    { header: 'المبلغ المدفوع', key: 'paid', width: 15 },
    { header: 'المرجع', key: 'ref', width: 15 }
  ];

  const headerRow = worksheet.getRow(tableHeaderRow);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.fill = headerFill;
    cell.font = whiteFont;
    cell.alignment = centerAlign;
    cell.border = borderStyle;
    worksheet.getColumn(idx + 1).width = col.width;
  });

  // إضافة البيانات
  let totalEarned = 0;
  let totalPaid = 0;
  const statement = data.statement || [];

  statement.forEach((item: any, index: number) => {
    const rowIdx = tableHeaderRow + 1 + index;
    const date = new Date(item.date);
    const dayName = format(date, 'EEEE', { locale: arSA });
    
    const row = worksheet.getRow(rowIdx);
    row.values = [
      index + 1,
      item.projectName || '-',
      format(date, 'yyyy/MM/dd'),
      dayName,
      item.description || (item.type === 'عمل' ? 'تسجيل حضور ميداني' : 'صرف عهدة / حوالة'),
      item.workDays || (item.type === 'عمل' ? '1' : '-'),
      item.type === 'عمل' ? (item.hours || '07:00-15:00') : '-',
      parseFloat(item.amount || 0),
      parseFloat(item.paid || 0),
      item.reference || '-'
    ];

    totalEarned += parseFloat(item.amount || 0);
    totalPaid += parseFloat(item.paid || 0);

    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.alignment = centerAlign;
      if (item.type === 'حوالة') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      }
    });
  });

  // 4. صف الإجماليات
  const lastDataRow = tableHeaderRow + statement.length;
  const totalsRow = worksheet.getRow(lastDataRow + 1);
  totalsRow.getCell(1).value = 'الإجماليـــــــــات';
  worksheet.mergeCells(`A${lastDataRow + 1}:E${lastDataRow + 1}`);
  
  totalsRow.getCell(6).value = totalEarned;
  totalsRow.getCell(7).value = totalPaid;
  
  totalsRow.eachCell((cell) => {
    cell.fill = emeraldFill;
    cell.font = whiteFont;
    cell.border = borderStyle;
    cell.alignment = centerAlign;
  });

  // 5. الملخص المالي الجانبي (مطابق تماماً للصورة 3 و 4)
  const summaryStartRow = lastDataRow + 3;
  const summaryLabels = [
    { label: 'اجمالي المكتسب:', value: totalEarned },
    { label: 'اجمالي المدفوع:', value: totalPaid },
    { label: 'اجمالي المحول:', value: data.totalTransferred || 0 },
    { label: 'الرصيد النهائي:', value: totalEarned - totalPaid - (data.totalTransferred || 0) }
  ];

  // ترويسة الملخص
  worksheet.mergeCells(`F${summaryStartRow}:G${summaryStartRow}`);
  const summaryHeader = worksheet.getCell(`F${summaryStartRow}`);
  summaryHeader.value = 'الملخص المالي';
  summaryHeader.fill = emeraldFill;
  summaryHeader.font = whiteFont;
  summaryHeader.alignment = centerAlign;
  summaryHeader.border = borderStyle;

  summaryLabels.forEach((item, idx) => {
    const rowNum = summaryStartRow + 1 + idx;
    const labelCell = worksheet.getCell(`F${rowNum}`);
    const valueCell = worksheet.getCell(`G${rowNum}`);
    
    labelCell.value = item.label;
    valueCell.value = item.value;
    
    labelCell.border = borderStyle;
    valueCell.border = borderStyle;
    labelCell.font = darkFont;
    valueCell.font = darkFont;
    
    if (idx === summaryLabels.length - 1) {
      valueCell.font = { ...darkFont, color: { argb: 'FFEF4444' } }; // اللون الأحمر للرصيد النهائي
    }
  });

  // حفظ الملف
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `كشف_حساب_${worker.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};
