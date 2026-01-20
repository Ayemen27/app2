import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export const exportWorkerStatement = async (data: any, worker: any) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('كشف حساب عامل', {
    views: [{ rightToLeft: true }]
  });

  // الألوان والخطوط (نماذج شركة الفتيني)
  const mainBlue = 'FF1F4E79'; 
  const emeraldGreen = 'FF00B050'; 
  const subHeaderGray = 'FFF1F5F9'; 
  const whiteText = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const darkText = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  const centerAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const borderThin: any = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 1. الترويسة العلوية الزرقاء
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'كشف حساب العامل التفصيلي والشامل';
  titleCell.font = { ...whiteText, size: 16 };
  titleCell.alignment = centerAlign;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mainBlue } };
  worksheet.getRow(1).height = 35;

  // 2. شبكة معلومات العامل
  const infoRowStart = 3;
  const setInfoCell = (row: number, label: string, value: string, colLabel: string, colValue: string) => {
    const lCell = worksheet.getCell(`${colLabel}${row}`);
    const vCell = worksheet.getCell(`${colValue}${row}`);
    lCell.value = label;
    lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subHeaderGray } };
    lCell.border = borderThin;
    lCell.font = darkText;
    vCell.value = value;
    vCell.border = borderThin;
    vCell.font = { name: 'Arial', size: 11 };
  };

  setInfoCell(3, 'اسم العامل:', worker.name, 'A', 'B');
  setInfoCell(3, 'المشروع:', data.projectName || 'جميع المشاريع', 'D', 'E');
  setInfoCell(4, 'نوع العامل:', worker.type || 'عامل', 'A', 'B');
  setInfoCell(4, 'الفترة:', data.dateRange || 'الكل', 'D', 'E');
  setInfoCell(5, 'الأجر اليومي:', `${worker.dailyWage} ر.ي`, 'A', 'B');
  setInfoCell(5, 'تاريخ الإصدار:', format(new Date(), 'yyyy/MM/dd'), 'D', 'E');

  // 3. جدول البيانات
  const tableHeaderRow = 7;
  const headers = ['م', 'التاريخ', 'اليوم', 'المشروع', 'وصف العمل', 'أيام العمل', 'الساعات', 'الأجر المستحق', 'المبلغ المدفوع'];
  const headerRow = worksheet.getRow(tableHeaderRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mainBlue } };
    cell.font = whiteText;
    cell.alignment = centerAlign;
    cell.border = borderThin;
  });
  headerRow.height = 25;

  worksheet.columns = [
    { width: 5 }, { width: 15 }, { width: 12 }, { width: 25 }, { width: 45 }, { width: 10 }, { width: 15 }, { width: 15 }, { width: 15 }
  ];

  let currentRow = tableHeaderRow + 1;
  const statement = data.statement || [];
  statement.forEach((item: any, index: number) => {
    const row = worksheet.getRow(currentRow);
    const date = new Date(item.date);
    row.values = [
      index + 1, format(date, 'yyyy/MM/dd'), format(date, 'EEEE', { locale: arSA }),
      item.projectName || '-', item.description || 'العمل على استكمال المشروع',
      item.workDays || '1', item.hours || '07:00-15:00', parseFloat(item.amount || 0), parseFloat(item.paid || 0)
    ];
    row.eachCell((cell) => { cell.border = borderThin; cell.alignment = centerAlign; });
    currentRow++;
  });

  // 4. صف الإجماليات
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const totalsCell = worksheet.getCell(`A${currentRow}`);
  totalsCell.value = 'الإجماليـــــــــات';
  const totalEarnedCell = worksheet.getCell(`H${currentRow}`);
  const totalPaidCell = worksheet.getCell(`I${currentRow}`);
  totalEarnedCell.value = parseFloat(data.summary.totalEarned || 0);
  totalPaidCell.value = parseFloat(data.summary.totalPaid || 0);
  [totalsCell, totalEarnedCell, totalPaidCell].forEach(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emeraldGreen } };
    cell.font = whiteText; cell.border = borderThin; cell.alignment = centerAlign;
  });

  // 5. الملخص المالي
  currentRow += 2;
  const summaryStartCol = 8;
  const summaryData = [
    { label: 'الملخص المالي', isHeader: true },
    { label: 'اجمالي المكتسب:', value: parseFloat(data.summary.totalEarned || 0) },
    { label: 'اجمالي المدفوع:', value: parseFloat(data.summary.totalPaid || 0) },
    { label: 'اجمالي المحول:', value: parseFloat(data.summary.totalTransferred || 0) },
    { label: 'الرصيد النهائي:', value: parseFloat(data.summary.finalBalance || 0), isRed: true }
  ];
  summaryData.forEach((item, idx) => {
    const rowIdx = currentRow + idx;
    if (item.isHeader) {
      worksheet.mergeCells(rowIdx, summaryStartCol, rowIdx, summaryStartCol + 1);
      const cell = worksheet.getCell(rowIdx, summaryStartCol);
      cell.value = item.label; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emeraldGreen } }; cell.font = whiteText;
    } else {
      const lCell = worksheet.getCell(rowIdx, summaryStartCol + 1);
      const vCell = worksheet.getCell(rowIdx, summaryStartCol);
      lCell.value = item.label; vCell.value = item.value;
      [lCell, vCell].forEach(c => { c.border = borderThin; c.font = darkText; c.alignment = centerAlign; });
      if (item.isRed) vCell.font = { ...darkText, color: { argb: 'FFFF0000' } };
      vCell.numFmt = '#,##0';
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `كشف_حساب_${worker.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};
