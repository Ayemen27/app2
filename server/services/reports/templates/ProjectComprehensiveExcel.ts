import ExcelJS from 'exceljs';
import { ProjectComprehensiveReportData } from '../../../../shared/report-types';
import {
  COLORS, formatNum, formatInt, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter, xlSignatures,
} from './shared-styles';

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'جارية',
    completed: 'مكتملة',
    active: 'نشط',
    inactive: 'غير نشط',
    maintenance: 'صيانة',
    excellent: 'ممتاز',
    good: 'جيد',
    fair: 'متوسط',
    poor: 'ضعيف',
  };
  return map[status] || status;
}

export async function generateProjectComprehensiveExcel(data: ProjectComprehensiveReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction System';
  workbook.created = new Date();

  const COL_COUNT = 9;
  const ws = workbook.addWorksheet('التقرير الشامل', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 22 }, { width: 14 }, { width: 14 },
    { width: 15 }, { width: 15 }, { width: 14 }, { width: 15 }, { width: 15 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'التقرير الشامل للمشروع', COL_COUNT);
  row = xlInfoRow(ws, row, `المشروع: ${data.project.name}  |  الفترة: ${formatDateBR(data.period.from)} - ${formatDateBR(data.period.to)}  |  المهندس: ${data.project.engineerName || '-'}`, COL_COUNT);

  row++;
  const kpiData = [
    ['الإيرادات', formatNum(data.totals.totalIncome)],
    ['المصروفات', formatNum(data.totals.totalExpenses)],
    ['الرصيد', formatNum(data.totals.balance)],
    ['العمال', String(data.workforce.totalWorkers)],
    ['الآبار', String(data.wells.totalWells)],
    ['أيام العمل', formatNum(data.attendance.totalWorkDays)],
  ];
  const kpiPairs: [number, number][] = [[1, 1], [2, 3], [4, 5], [6, 6], [7, 7], [8, 9]];
  const kpiLabelR = ws.getRow(row);
  const kpiValR = ws.getRow(row + 1);
  kpiData.forEach(([label, val], i) => {
    if (i < kpiPairs.length) {
      const [s, e] = kpiPairs[i];
      if (s !== e) {
        ws.mergeCells(row, s, row, e);
        ws.mergeCells(row + 1, s, row + 1, e);
      }
      const labelCell = kpiLabelR.getCell(s);
      labelCell.value = label;
      labelCell.font = { size: 9, color: { argb: COLORS.gray700 }, name: 'Calibri' };
      labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };

      const valCell = kpiValR.getCell(s);
      valCell.value = val;
      valCell.font = { bold: true, size: 11, color: { argb: COLORS.navy }, name: 'Calibri' };
      valCell.alignment = { horizontal: 'center', vertical: 'middle' };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray200 } };
    }
  });
  row += 3;

  row = xlSectionHeader(ws, row, '👷 القوى العاملة', COL_COUNT);
  if (data.workforce.workersByType.length > 0) {
    row = xlTableHeader(ws, row, ['النوع', 'العدد', 'أيام العمل', 'إجمالي الأجور', '', '', '', '', '']);
    data.workforce.workersByType.forEach((w, i) => {
      row = xlDataRow(ws, row, [w.type, w.count, formatNum(w.totalDays), formatNum(w.totalWages), '', '', '', '', ''], i % 2 === 1);
    });
    row++;
  }

  if (data.workforce.topWorkers.length > 0) {
    row = xlInfoRow(ws, row, 'أعلى 20 عامل من حيث الأجور', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'الاسم', 'النوع', 'الأيام', 'المستحق', 'المدفوع', 'المتبقي', '', '']);
    data.workforce.topWorkers.forEach((w, i) => {
      row = xlDataRow(ws, row, [i + 1, w.name, w.type, formatNum(w.totalDays), formatNum(w.totalEarned), formatNum(w.totalPaid), formatNum(w.balance), '', ''], i % 2 === 1);
    });
    row++;
  }

  if (data.wells.totalWells > 0) {
    row = xlSectionHeader(ws, row, `🔵 الآبار (${data.wells.totalWells} بئر)`, COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'رقم البئر', 'المالك', 'المنطقة', 'العمق', 'الحالة', 'الإنجاز %', 'الطواقم', 'أجور الطواقم']);
    data.wells.wellsList.forEach((w, i) => {
      row = xlDataRow(ws, row, [
        i + 1, w.wellNumber, w.ownerName, w.region,
        `${w.depth} م`, statusLabel(w.status),
        `${w.completionPercentage.toFixed(0)}%`, w.crewCount, formatNum(w.totalCrewWages),
      ], i % 2 === 1);
    });
    row = xlTotalsRow(ws, row, ['', '', '', 'الإجمالي', `${data.wells.totalDepth} م`, '', `${data.wells.avgCompletionPercentage.toFixed(1)}%`, '', '']);
    row++;
  }

  row = xlSectionHeader(ws, row, '💰 ملخص المصروفات', COL_COUNT);
  row = xlTableHeader(ws, row, ['البند', 'المبلغ', 'النسبة', '', '', '', '', '', '']);
  const expenseItems = [
    { label: 'أجور العمال', amount: data.totals.totalWages },
    { label: 'مشتريات المواد', amount: data.totals.totalMaterials },
    { label: 'مصاريف النقل', amount: data.totals.totalTransport },
    { label: 'مصاريف متنوعة', amount: data.totals.totalMisc },
    { label: 'حوالات العمال', amount: data.totals.totalWorkerTransfers },
    { label: 'دفعات الموردين', amount: data.totals.totalSupplierPayments || 0 },
  ];
  expenseItems.forEach((item, i) => {
    const pct = data.totals.totalExpenses > 0 ? (item.amount / data.totals.totalExpenses * 100).toFixed(1) + '%' : '0%';
    row = xlDataRow(ws, row, [item.label, formatNum(item.amount), pct, '', '', '', '', '', ''], i % 2 === 1);
  });
  row = xlGrandTotalRow(ws, row, ['إجمالي المصروفات', formatNum(data.totals.totalExpenses), '100%', '', '', '', '', '', '']);
  row++;

  if (data.expenses.materials.byCategory.length > 0) {
    row = xlInfoRow(ws, row, 'المواد حسب الفئة', COL_COUNT);
    row = xlTableHeader(ws, row, ['الفئة', 'المبلغ', 'عدد المشتريات', '', '', '', '', '', '']);
    data.expenses.materials.byCategory.forEach((c, i) => {
      row = xlDataRow(ws, row, [c.category, formatNum(c.total), c.count, '', '', '', '', '', ''], i % 2 === 1);
    });
    row++;
  }

  row = xlSectionHeader(ws, row, '🏦 الصندوق والأمانات', COL_COUNT);
  row = xlTableHeader(ws, row, ['البند', 'المبلغ', '', '', '', '', '', '', '']);
  row = xlDataRow(ws, row, ['إجمالي التحويلات الواردة', formatNum(data.cashCustody.totalFundTransfersIn), '', '', '', '', '', '', ''], false);
  row = xlDataRow(ws, row, ['تحويلات من مشاريع أخرى', formatNum(data.cashCustody.totalProjectTransfersIn), '', '', '', '', '', '', ''], true);
  row = xlDataRow(ws, row, ['تحويلات لمشاريع أخرى', formatNum(data.cashCustody.totalProjectTransfersOut), '', '', '', '', '', '', ''], false);
  row = xlDataRow(ws, row, ['إجمالي المصروفات', formatNum(data.cashCustody.totalExpenses), '', '', '', '', '', '', ''], true);
  row = xlGrandTotalRow(ws, row, ['صافي الرصيد', formatNum(data.cashCustody.netBalance), '', '', '', '', '', '', '']);
  row++;

  if (data.cashCustody.fundTransferItems.length > 0) {
    row = xlInfoRow(ws, row, 'تفاصيل التحويلات', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'التاريخ', 'المرسل', 'النوع', 'المبلغ', '', '', '', '']);
    data.cashCustody.fundTransferItems.forEach((ft, i) => {
      row = xlDataRow(ws, row, [i + 1, formatDateBR(ft.date), ft.senderName, ft.transferType, formatNum(ft.amount), '', '', '', ''], i % 2 === 1);
    });
    row++;
  }

  if (data.equipmentSummary.totalEquipment > 0) {
    row = xlSectionHeader(ws, row, `🔧 المعدات (${data.equipmentSummary.totalEquipment})`, COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'الاسم', 'الكود', 'النوع', 'الحالة', 'الحالة الفنية', 'الكمية', '', '']);
    data.equipmentSummary.items.forEach((eq, i) => {
      row = xlDataRow(ws, row, [i + 1, eq.name, eq.code, eq.type, statusLabel(eq.status), statusLabel(eq.condition), eq.quantity, '', ''], i % 2 === 1);
    });
    row++;
  }

  row++;
  row = xlSignatures(ws, row, ['مدير المشروع', 'المهندس المسؤول', 'المحاسب'], [[1, 3], [4, 6], [7, 9]]);
  row++;
  row = xlFooter(ws, row, COL_COUNT);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
