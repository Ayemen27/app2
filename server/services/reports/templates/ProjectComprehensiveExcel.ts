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
    available: 'متاح',
    unavailable: 'غير متاح',
    in_use: 'قيد الاستخدام',
    damaged: 'تالف',
    lost: 'مفقود',
    retired: 'مُستبعد',
    reserved: 'محجوز',
    under_repair: 'تحت الإصلاح',
    new: 'جديد',
    used: 'مستعمل',
    broken: 'معطل',
    rented: 'مؤجر',
    consumed: 'مستهلك',
    missing: 'مفقود',
    disposed: 'تم التخلص',
    transferred: 'منقول',
    out_of_service: 'خارج الخدمة',
    operational: 'تشغيلي',
    idle: 'عاطل',
    sold: 'مباع',
  };
  return map[status?.toLowerCase()] || status;
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
    { width: 5 }, { width: 18 }, { width: 18 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 10 }, { width: 14 }, { width: 14 },
    { width: 15 },
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
    let xlTotalTypeCount = 0, xlTotalTypeDays = 0, xlTotalTypeWages = 0;
    data.workforce.workersByType.forEach((w, i) => {
      xlTotalTypeCount += w.count;
      xlTotalTypeDays += w.totalDays;
      xlTotalTypeWages += w.totalWages;
      row = xlDataRow(ws, row, [w.type, w.count, formatNum(w.totalDays), formatNum(w.totalWages), '', '', '', '', ''], i % 2 === 1);
    });
    row = xlGrandTotalRow(ws, row, ['الإجمالي', xlTotalTypeCount, formatNum(xlTotalTypeDays), formatNum(xlTotalTypeWages), '', '', '', '', '']);
    row++;
  }

  if (data.workforce.topWorkers.length > 0) {
    row = xlInfoRow(ws, row, 'أعلى 20 عامل من حيث الأجور', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'الاسم', 'النوع', 'الأيام', 'المستحق', 'المدفوع', 'الحوالات', 'التسويات', 'التسوية البينية', 'المتبقي الصافي']);
    let xlTopDays = 0, xlTopEarned = 0, xlTopPaid = 0, xlTopTransfers = 0, xlTopSettled = 0, xlTopRebalance = 0, xlTopBalance = 0;
    data.workforce.topWorkers.forEach((w, i) => {
      xlTopDays += w.totalDays;
      xlTopEarned += w.totalEarned;
      xlTopPaid += w.totalPaid;
      xlTopTransfers += (w.totalTransfers || 0);
      xlTopSettled += (w.totalSettled || 0);
      xlTopRebalance += (w.rebalanceDelta || 0);
      xlTopBalance += w.balance;
      row = xlDataRow(ws, row, [i + 1, w.name, w.type, formatNum(w.totalDays), formatNum(w.totalEarned), formatNum(w.totalPaid), formatNum(w.totalTransfers || 0), formatNum(w.totalSettled || 0), formatNum(w.rebalanceDelta || 0), formatNum(w.balance)], i % 2 === 1);
    });
    row = xlGrandTotalRow(ws, row, ['', 'الإجمالي', '', formatNum(xlTopDays), formatNum(xlTopEarned), formatNum(xlTopPaid), formatNum(xlTopTransfers), formatNum(xlTopSettled), formatNum(xlTopRebalance), formatNum(xlTopBalance)]);
    row++;
  }

  if (data.wells.totalWells > 0) {
    row = xlSectionHeader(ws, row, `🔵 الآبار (${data.wells.totalWells} بئر)`, COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'رقم البئر', 'المالك', 'المنطقة', 'العمق', 'الألواح', 'القواعد', 'المواسير', 'الحالة']);
    data.wells.wellsList.forEach((w, i) => {
      row = xlDataRow(ws, row, [
        i + 1, w.wellNumber, w.ownerName, w.region,
        `${w.depth} م`, w.panelCount || 0, w.baseCount || 0, w.pipeCount || 0, statusLabel(w.status),
      ], i % 2 === 1);
    });
    row = xlGrandTotalRow(ws, row, ['', '', '', 'الإجمالي', `${data.wells.totalDepth} م`, data.wells.totalPanels || 0, data.wells.totalBases || 0, data.wells.totalPipes || 0, '']);
    row++;
  }

  row = xlSectionHeader(ws, row, '💰 ملخص المصروفات', COL_COUNT);
  row = xlTableHeader(ws, row, ['البند', 'المبلغ', 'النسبة', '', '', '', '', '', '']);
  const expenseItems = [
    { label: 'أجور العمال (المدفوع)', amount: data.totals.totalWages },
    { label: 'مشتريات المواد (نقداً)', amount: data.totals.totalMaterials },
    { label: 'مصاريف النقل', amount: data.totals.totalTransport },
    { label: 'مصاريف متنوعة', amount: data.totals.totalMisc },
    { label: 'حوالات العمال', amount: data.totals.totalWorkerTransfers },
    { label: 'تحويلات لمشاريع أخرى', amount: data.totals.totalProjectTransfersOut || 0 },
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

  if (data.expenses.supplierPayments?.items && data.expenses.supplierPayments.items.length > 0) {
    row = xlInfoRow(ws, row, 'تفاصيل دفعات الموردين', COL_COUNT);
    row = xlTableHeader(ws, row, ['#', 'المورد', 'التاريخ', 'المبلغ', 'طريقة الدفع', 'رقم المرجع', 'ملاحظات', '', '']);
    data.expenses.supplierPayments.items.forEach((sp, i) => {
      row = xlDataRow(ws, row, [i + 1, sp.supplierName, formatDateBR(sp.paymentDate), formatNum(sp.amount), sp.paymentMethod, sp.referenceNumber, sp.notes || '', '', ''], i % 2 === 1);
    });
    row = xlGrandTotalRow(ws, row, ['الإجمالي', '', '', formatNum(data.expenses.supplierPayments.total), '', '', '', '', '']);
    row++;
  }

  row = xlSectionHeader(ws, row, '🏦 الصندوق والأمانات', COL_COUNT);
  row = xlTableHeader(ws, row, ['البند', 'المبلغ', '', '', '', '', '', '', '']);
  const xlCustodyIncome = data.cashCustody.totalFundTransfersIn + data.cashCustody.totalProjectTransfersIn;
  row = xlDataRow(ws, row, ['إجمالي التحويلات الواردة', formatNum(data.cashCustody.totalFundTransfersIn), '', '', '', '', '', '', ''], false);
  row = xlDataRow(ws, row, ['تحويلات من مشاريع أخرى (وارد)', formatNum(data.cashCustody.totalProjectTransfersIn), '', '', '', '', '', '', ''], true);
  row = xlTotalsRow(ws, row, ['إجمالي الدخل', formatNum(xlCustodyIncome), '', '', '', '', '', '', '']);
  row = xlDataRow(ws, row, ['إجمالي المصروفات (شامل الترحيل الصادر)', formatNum(data.cashCustody.totalExpenses), '', '', '', '', '', '', ''], true);
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
