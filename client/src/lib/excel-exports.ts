import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export const exportWorkerStatement = async (data: any, worker: any) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('كشف حساب عامل', {
    views: [{ rightToLeft: true, showGridLines: false }]
  });

  // المعايير العالمية للألوان والخطوط (Modern Corporate Theme)
  const mainBlue = 'FF1E3A8A'; // Deep Navy Blue
  const accentBlue = 'FF3B82F6'; // Modern Bright Blue
  const softGray = 'FFF8FAFC'; // Lightest Gray Background
  const borderGray = 'FFE2E8F0'; // Modern Border Color
  const emeraldGreen = 'FF10B981'; // Success Green
  const roseRed = 'FFF43F5E'; // Error/Debit Red
  
  const whiteText = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const darkText = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
  const headerText = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  
  const centerAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const rightAlign: any = { horizontal: 'right', vertical: 'middle', wrapText: true, indent: 1 };
  
  const borderLight: any = {
    top: { style: 'thin', color: { argb: borderGray } },
    left: { style: 'thin', color: { argb: borderGray } },
    bottom: { style: 'thin', color: { argb: borderGray } },
    right: { style: 'thin', color: { argb: borderGray } }
  };

  // 1. ترويسة الصفحة الاحترافية (Professional Header)
  worksheet.mergeCells('A1:I1');
  const mainTitle = worksheet.getCell('A1');
  mainTitle.value = 'التقرير المالي التفصيلي - كشف حساب عامل';
  mainTitle.font = { ...whiteText, size: 18 };
  mainTitle.alignment = centerAlign;
  mainTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mainBlue } };
  worksheet.getRow(1).height = 45;

  // 2. تذييل الترويسة (Subtitle/Timestamp)
  worksheet.mergeCells('A2:I2');
  const subTitle = worksheet.getCell('A2');
  subTitle.value = `تاريخ الاستخراج: ${format(new Date(), 'yyyy/MM/dd HH:mm')} | شركة الفتيني للمقاولات العامة`;
  subTitle.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
  subTitle.alignment = centerAlign;
  worksheet.getRow(2).height = 20;

  // 3. قسم معلومات الكيان (Worker Info Section) - تصميم بطاقة حديثة
  const infoStartRow = 4;
  worksheet.getRow(infoStartRow).height = 25;
  worksheet.getRow(infoStartRow + 1).height = 25;
  worksheet.getRow(infoStartRow + 2).height = 25;

  const styleInfoBox = (row: number, col: string, label: string, value: string, iconColor: string) => {
    const lCell = worksheet.getCell(`${col}${row}`);
    const vCell = worksheet.getCell(`${String.fromCharCode(col.charCodeAt(0) + 1)}${row}`);
    
    lCell.value = label;
    lCell.font = { ...headerText, color: { argb: iconColor } };
    lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGray } };
    lCell.alignment = rightAlign;
    lCell.border = borderLight;

    vCell.value = value;
    vCell.font = darkText;
    vCell.alignment = rightAlign;
    vCell.border = borderLight;
  };

  styleInfoBox(4, 'A', '● اسم الموظف:', worker.name, accentBlue);
  styleInfoBox(4, 'D', '● المشروع الحالي:', data.projectName || 'جميع المشاريع', accentBlue);
  styleInfoBox(5, 'A', '● المسمى الوظيفي:', worker.type || 'عامل', accentBlue);
  styleInfoBox(5, 'D', '● نطاق التقرير:', data.dateRange || 'السجل الكامل', accentBlue);
  styleInfoBox(6, 'A', '● الأجر الأساسي:', `${worker.dailyWage} ر.ي / يوم`, accentBlue);
  styleInfoBox(6, 'D', '● رقم القيد:', `W-${worker.id.toString().slice(-4).toUpperCase()}`, accentBlue);

  // 4. جدول البيانات الرئيسي (Main Data Grid)
  const tableHeaderRow = 8;
  const headers = ['م', 'التاريخ', 'اليوم', 'المشروع المرتبط', 'وصف العمل والتفاصيل', 'أيام', 'ساعات', 'مستحق (+)', 'مدفوع (-)'];
  const headerRow = worksheet.getRow(tableHeaderRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
    cell.font = whiteText;
    cell.alignment = centerAlign;
    cell.border = borderLight;
  });
  headerRow.height = 30;

  worksheet.columns = [
    { width: 6 }, // م
    { width: 14 }, // التاريخ
    { width: 12 }, // اليوم
    { width: 22 }, // المشروع
    { width: 48 }, // وصف العمل
    { width: 8 },  // أيام
    { width: 12 }, // ساعات
    { width: 16 }, // مستحق
    { width: 16 }  // مدفوع
  ];

  let currentRow = tableHeaderRow + 1;
  const statement = data.statement || [];
  statement.forEach((item: any, index: number) => {
    const row = worksheet.getRow(currentRow);
    const date = new Date(item.date);
    const isEven = index % 2 === 0;
    
    row.values = [
      index + 1,
      format(date, 'yyyy/MM/dd'),
      format(date, 'EEEE', { locale: arSA }),
      item.projectName || '-',
      item.description || 'تنفيذ مهام العمل الموكلة بالموقع',
      item.workDays || '1',
      item.hours || '8h',
      parseFloat(item.amount || 0),
      parseFloat(item.paid || 0)
    ];

    row.eachCell((cell, colNum) => {
      cell.border = borderLight;
      cell.alignment = centerAlign;
      cell.font = darkText;
      if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      
      // تنسيق المبالغ
      if (colNum === 8 || colNum === 9) {
        cell.numFmt = '#,##0.00 "ر.ي"';
        if (colNum === 8) cell.font = { ...darkText, color: { argb: emeraldGreen }, bold: true };
        if (colNum === 9 && parseFloat(item.paid || 0) > 0) cell.font = { ...darkText, color: { argb: roseRed }, bold: true };
      }
    });
    currentRow++;
  });

  // 5. صف الإجماليات الذكي
  const totalsRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const totalsLabel = worksheet.getCell(`A${currentRow}`);
  totalsLabel.value = 'إجماليات الحساب النهائية';
  totalsLabel.font = whiteText;
  totalsLabel.alignment = centerAlign;
  totalsLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

  const sumEarned = worksheet.getCell(`H${currentRow}`);
  const sumPaid = worksheet.getCell(`I${currentRow}`);
  sumEarned.value = parseFloat(data.summary.totalEarned || 0);
  sumPaid.value = parseFloat(data.summary.totalPaid || 0);
  
  [sumEarned, sumPaid].forEach(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    c.font = whiteText;
    c.numFmt = '#,##0.00 "ر.ي"';
    c.alignment = centerAlign;
  });
  totalsRow.height = 25;

  // 6. لوحة الملخص المالي الجانبية (Financial Dashboard Overlay)
  currentRow += 2;
  const summaryBoxStart = 8;
  const metrics = [
    { label: 'الوضع المالي الإجمالي', isHeader: true, color: mainBlue },
    { label: 'إجمالي المستحقات المعتمدة', value: data.summary.totalEarned, color: emeraldGreen },
    { label: 'إجمالي المدفوعات المسلمة', value: data.summary.totalPaid, color: roseRed },
    { label: 'صافي الرصيد المتبقي', value: data.summary.finalBalance, color: accentBlue, isFinal: true }
  ];

  metrics.forEach((m, i) => {
    const rIdx = currentRow + i;
    if (m.isHeader) {
      worksheet.mergeCells(rIdx, summaryBoxStart, rIdx, summaryBoxStart + 1);
      const c = worksheet.getCell(rIdx, summaryBoxStart);
      c.value = m.label;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m.color } };
      c.font = whiteText;
      c.alignment = centerAlign;
    } else {
      const lCell = worksheet.getCell(rIdx, summaryBoxStart + 1);
      const vCell = worksheet.getCell(rIdx, summaryBoxStart);
      
      lCell.value = m.label;
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGray } };
      lCell.font = headerText;
      lCell.border = borderLight;
      lCell.alignment = rightAlign;

      vCell.value = parseFloat(m.value || 0);
      vCell.font = { ...darkText, bold: true, color: { argb: m.color } };
      vCell.border = borderLight;
      vCell.alignment = centerAlign;
      vCell.numFmt = '#,##0.00 "ر.ي"';
      
      if (m.isFinal) {
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      }
    }
  });

  // 7. تذييل التقرير (Footer/Security)
  currentRow += metrics.length + 1;
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const footer = worksheet.getCell(`A${currentRow}`);
  footer.value = 'تم توليد هذا التقرير آلياً عبر نظام إدارة شركة الفتيني - Al-Fatihi Construction Management System. أي كشط أو تعديل يدوي يلغي صحة التقرير.';
  footer.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
  footer.alignment = centerAlign;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Worker_Statement_${worker.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};
