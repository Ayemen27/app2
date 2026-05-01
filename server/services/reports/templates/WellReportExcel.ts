import ExcelJS from 'exceljs';
import { currentReportHeader } from './header-context';
import {
  COLORS, BORDER, formatNum, formatInt, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader,
  xlTableHeader, xlDataRow, xlTotalsRow, xlGrandTotalRow,
  xlFooter, xlApplyBorders, xlSignatures,
} from './shared-styles';

interface WellExportData {
  id: number;
  wellNumber: number;
  ownerName: string;
  region: string;
  numberOfBases: number;
  numberOfPanels: number;
  wellDepth: number;
  waterLevel?: number | null;
  numberOfPipes: number;
  pumpPower?: number | null;
  fanType?: string | null;
  status: string;
  completionPercentage: string;
  startDate?: string | null;
  completionDate?: string | null;
  notes?: string | null;
  crews: any[];
  solar: any | null;
  transport: any[];
  receptions: any[];
  tasks: any[];
}

interface WellReportOptions {
  projectName: string;
  projectId: string;
  engineerName?: string;
  wells: WellExportData[];
  reportType: 'comprehensive' | 'wells_only' | 'crews_only' | 'solar_only';
}

const STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
};

const CREW_TYPE_AR: Record<string, string> = {
  steel_installation: 'تركيب حديد',
  panel_installation: 'تركيب ألواح',
  welding: 'لحام',
};

function safeNum(v: any): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return isNaN(n) ? 0 : n;
}

export async function generateWellReportExcel(options: WellReportOptions): Promise<Buffer> {
  const { projectName, wells, reportType, engineerName } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al-Fatihi Construction System';
  workbook.created = new Date();

  if (reportType === 'comprehensive' || reportType === 'wells_only') {
    buildWellsOverviewSheet(workbook, wells, projectName, engineerName);
  }
  if (reportType === 'comprehensive' || reportType === 'crews_only') {
    buildCrewsSheet(workbook, wells, projectName, engineerName);
  }
  if (reportType === 'comprehensive' || reportType === 'solar_only') {
    buildSolarSheet(workbook, wells, projectName, engineerName);
  }
  if (reportType === 'comprehensive') {
    buildTransportSheet(workbook, wells, projectName, engineerName);
    buildSummarySheet(workbook, wells, projectName, engineerName);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildWellsOverviewSheet(workbook: ExcelJS.Workbook, wells: WellExportData[], projectName: string, engineerName?: string) {
  const COL_COUNT = 13;
  const ws = workbook.addWorksheet('بيانات الآبار', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 8 }, { width: 22 }, { width: 14 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 12 }, { width: 14 },
    { width: 20 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'تقرير بيانات الآبار الشامل', COL_COUNT);
  row = xlInfoRow(ws, row, `المشروع: ${projectName}  |  المهندس: ${engineerName || '-'}  |  التاريخ: ${nowDateBR()}  |  عدد الآبار: ${wells.length}`, COL_COUNT);
  row++;

  row = xlTableHeader(ws, row, [
    '#', 'رقم البئر', 'اسم المالك', 'المنطقة',
    'عدد القواعد', 'عدد الألواح', 'عمق البئر', 'منسوب الماء',
    'عدد المواسير', 'قدرة الغطاس', 'الحالة', 'نسبة الإنجاز', 'ملاحظات'
  ]);

  let totalBases = 0, totalPanels = 0, totalDepth = 0, totalPipes = 0;
  wells.forEach((w, i) => {
    totalBases += w.numberOfBases || 0;
    totalPanels += w.numberOfPanels || 0;
    totalDepth += w.wellDepth || 0;
    totalPipes += w.numberOfPipes || 0;

    row = xlDataRow(ws, row, [
      i + 1,
      w.wellNumber,
      w.ownerName,
      w.region,
      w.numberOfBases || 0,
      w.numberOfPanels || 0,
      w.wellDepth || 0,
      w.waterLevel ?? '-',
      w.numberOfPipes || 0,
      w.pumpPower ? `${w.pumpPower} kw` : '-',
      STATUS_AR[w.status] || w.status,
      `${safeNum(w.completionPercentage)}%`,
      w.notes || '-',
    ], i % 2 === 1);
  });

  row = xlTotalsRow(ws, row, [
    '', 'الإجمالي', '', '',
    totalBases, totalPanels,
    `${totalDepth} م`, '',
    totalPipes, '',
    `${wells.length} بئر`, '', ''
  ]);

  row++;
  row = xlFooter(ws, row, COL_COUNT);
}

function buildCrewsSheet(workbook: ExcelJS.Workbook, wells: WellExportData[], projectName: string, engineerName?: string) {
  const COL_COUNT = 12;
  const ws = workbook.addWorksheet('فرق العمل', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 8 }, { width: 20 }, { width: 14 },
    { width: 16 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 12 }, { width: 12 }, { width: 14 }, { width: 18 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'تقرير فرق العمل في الآبار', COL_COUNT);
  const totalCrews = wells.reduce((s, w) => s + (w.crews?.length || 0), 0);
  row = xlInfoRow(ws, row, `المشروع: ${projectName}  |  المهندس: ${engineerName || '-'}  |  التاريخ: ${nowDateBR()}  |  إجمالي السجلات: ${totalCrews}`, COL_COUNT);
  row++;

  row = xlTableHeader(ws, row, [
    '#', 'رقم البئر', 'اسم المالك', 'نوع العمل',
    'اسم الفريق', 'عدد العمال', 'عدد الأسطوات', 'أيام العمل',
    'أجرة العامل', 'أجرة الأسطى', 'إجمالي الأجور', 'تاريخ العمل'
  ]);

  let idx = 0;
  let grandTotalWages = 0;
  let grandTotalWorkers = 0;
  let grandTotalMasters = 0;

  for (const w of wells) {
    if (!w.crews || w.crews.length === 0) continue;
    for (const c of w.crews) {
      idx++;
      const wages = safeNum(c.totalWages);
      grandTotalWages += wages;
      grandTotalWorkers += c.workersCount || 0;
      grandTotalMasters += c.mastersCount || 0;

      row = xlDataRow(ws, row, [
        idx,
        w.wellNumber,
        w.ownerName,
        CREW_TYPE_AR[c.crewType] || c.crewType,
        c.teamName || '-',
        c.workersCount || 0,
        c.mastersCount || 0,
        safeNum(c.workDays),
        formatNum(c.workerDailyWage),
        formatNum(c.masterDailyWage),
        formatNum(wages),
        formatDateBR(c.workDate) || '-',
      ], idx % 2 === 0);
    }
  }

  row = xlGrandTotalRow(ws, row, [
    '', '', 'الإجمالي العام', '',
    '', grandTotalWorkers, grandTotalMasters, '',
    '', '', formatNum(grandTotalWages), ''
  ]);

  row++;

  row = xlSectionHeader(ws, row, 'ملخص حسب نوع العمل', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'نوع العمل', 'عدد السجلات', 'إجمالي العمال', 'إجمالي الأسطوات', '', '', '', '', '', 'إجمالي الأجور', '']);

  const byType: Record<string, { count: number; workers: number; masters: number; wages: number }> = {};
  for (const w of wells) {
    for (const c of (w.crews || [])) {
      const t = c.crewType || 'unknown';
      if (!byType[t]) byType[t] = { count: 0, workers: 0, masters: 0, wages: 0 };
      byType[t].count++;
      byType[t].workers += c.workersCount || 0;
      byType[t].masters += c.mastersCount || 0;
      byType[t].wages += safeNum(c.totalWages);
    }
  }

  let ti = 0;
  for (const [type, data] of Object.entries(byType)) {
    ti++;
    row = xlDataRow(ws, row, [
      ti, CREW_TYPE_AR[type] || type, data.count, data.workers, data.masters,
      '', '', '', '', '', formatNum(data.wages), ''
    ], ti % 2 === 0);
  }

  row++;

  row = xlSectionHeader(ws, row, 'ملخص حسب الفريق', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'اسم الفريق', 'عدد الآبار', 'عدد السجلات', '', '', '', '', '', '', 'إجمالي الأجور', '']);

  const byTeam: Record<string, { wellSet: Set<number>; count: number; wages: number }> = {};
  for (const w of wells) {
    for (const c of (w.crews || [])) {
      const t = c.teamName || 'غير محدد';
      if (!byTeam[t]) byTeam[t] = { wellSet: new Set(), count: 0, wages: 0 };
      byTeam[t].wellSet.add(w.wellNumber);
      byTeam[t].count++;
      byTeam[t].wages += safeNum(c.totalWages);
    }
  }

  let tmi = 0;
  for (const [team, data] of Object.entries(byTeam)) {
    tmi++;
    row = xlDataRow(ws, row, [
      tmi, team, data.wellSet.size, data.count, '', '', '', '', '', '', formatNum(data.wages), ''
    ], tmi % 2 === 0);
  }

  row++;
  row = xlFooter(ws, row, COL_COUNT);
}

function buildSolarSheet(workbook: ExcelJS.Workbook, wells: WellExportData[], projectName: string, engineerName?: string) {
  const COL_COUNT = 14;
  const ws = workbook.addWorksheet('المنظومة الشمسية', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 8 }, { width: 20 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 10 }, { width: 10 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'تقرير المنظومة الشمسية للآبار', COL_COUNT);
  const withSolar = wells.filter(w => w.solar).length;
  row = xlInfoRow(ws, row, `المشروع: ${projectName}  |  المهندس: ${engineerName || '-'}  |  التاريخ: ${nowDateBR()}  |  آبار بمنظومة: ${withSolar}/${wells.length}`, COL_COUNT);
  row++;

  row = xlTableHeader(ws, row, [
    '#', 'رقم البئر', 'اسم المالك', 'الإنفرتر',
    'صندوق التجميع', 'حامل الكربون', 'كليب التأريض', 'لوحة التأريض',
    'قضيب التأريض', 'كيبل 16×3 (م)', 'كيبل 10×2 (م)', 'كيبل ربط 6مم',
    'مراوح', 'غطاس'
  ]);

  let idx = 0;
  let totalCable16 = 0, totalCable10 = 0;

  for (const w of wells) {
    idx++;
    const s = w.solar;
    const c16 = safeNum(s?.cable16x3mmLength);
    const c10 = safeNum(s?.cable10x2mmLength);
    totalCable16 += c16;
    totalCable10 += c10;

    row = xlDataRow(ws, row, [
      idx,
      w.wellNumber,
      w.ownerName,
      s?.inverter || '-',
      s?.collectionBox || '-',
      s?.carbonCarrier || '-',
      s?.groundingClip || '-',
      s?.groundingPlate || '-',
      s?.groundingRod || '-',
      c16 > 0 ? formatNum(c16) : '-',
      c10 > 0 ? formatNum(c10) : '-',
      s?.bindingCable6mm || '-',
      s?.fanCount ?? '-',
      s?.submersiblePump ? 'نعم' : 'لا',
    ], idx % 2 === 0);
  }

  row = xlTotalsRow(ws, row, [
    '', '', 'الإجمالي', '', '', '', '', '', '',
    formatNum(totalCable16), formatNum(totalCable10),
    '', '', ''
  ]);

  row++;
  row = xlFooter(ws, row, COL_COUNT);
}

function buildTransportSheet(workbook: ExcelJS.Workbook, wells: WellExportData[], projectName: string, engineerName?: string) {
  const COL_COUNT = 9;
  const ws = workbook.addWorksheet('النقل والتوصيل', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 8 }, { width: 22 }, { width: 14 },
    { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 20 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'تقرير النقل والتوصيل للآبار', COL_COUNT);
  const totalTransport = wells.reduce((s, w) => s + (w.transport?.length || 0), 0);
  row = xlInfoRow(ws, row, `المشروع: ${projectName}  |  المهندس: ${engineerName || '-'}  |  التاريخ: ${nowDateBR()}  |  عمليات النقل: ${totalTransport}`, COL_COUNT);
  row++;

  row = xlTableHeader(ws, row, [
    '#', 'رقم البئر', 'اسم المالك', 'نوع السكة',
    'مع ألواح', 'سعر النقل', 'مستحقات الطاقم', 'تاريخ النقل', 'ملاحظات'
  ]);

  let idx = 0;
  let grandTotalPrice = 0;
  let grandTotalDues = 0;

  for (const w of wells) {
    if (!w.transport || w.transport.length === 0) continue;
    for (const t of w.transport) {
      idx++;
      const price = safeNum(t.transportPrice);
      const dues = safeNum(t.crewEntitlements);
      grandTotalPrice += price;
      grandTotalDues += dues;

      row = xlDataRow(ws, row, [
        idx,
        w.wellNumber,
        w.ownerName,
        t.railType === 'new' ? 'جديدة' : t.railType === 'old' ? 'قديمة' : (t.railType || '-'),
        t.withPanels ? 'نعم' : 'لا',
        formatNum(price),
        formatNum(dues),
        formatDateBR(t.transportDate) || '-',
        t.notes || '-',
      ], idx % 2 === 0);
    }
  }

  row = xlGrandTotalRow(ws, row, [
    '', '', 'الإجمالي العام', '', '',
    formatNum(grandTotalPrice), formatNum(grandTotalDues), '', ''
  ]);

  row++;
  row = xlFooter(ws, row, COL_COUNT);
}

function buildSummarySheet(workbook: ExcelJS.Workbook, wells: WellExportData[], projectName: string, engineerName?: string) {
  const COL_COUNT = 6;
  const ws = workbook.addWorksheet('الملخص العام', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, orientation: 'portrait', fitToPage: true,
      fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 5 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 },
  ];

  let row = 1;
  row = xlCompanyHeader(ws, row, COL_COUNT);
  row = xlTitleRow(ws, row, 'الملخص العام لمشروع الآبار', COL_COUNT);
  row = xlInfoRow(ws, row, `المشروع: ${projectName}  |  المهندس: ${engineerName || '-'}  |  التاريخ: ${nowDateBR()}`, COL_COUNT);
  row++;

  row = xlSectionHeader(ws, row, 'إحصائيات الآبار', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'البند', 'القيمة', '', '', '']);

  const totalBases = wells.reduce((s, w) => s + (w.numberOfBases || 0), 0);
  const totalPanels = wells.reduce((s, w) => s + (w.numberOfPanels || 0), 0);
  const totalDepth = wells.reduce((s, w) => s + (w.wellDepth || 0), 0);
  const totalPipes = wells.reduce((s, w) => s + (w.numberOfPipes || 0), 0);
  const avgDepth = wells.length > 0 ? totalDepth / wells.length : 0;
  const completed = wells.filter(w => w.status === 'completed').length;
  const inProgress = wells.filter(w => w.status === 'in_progress').length;
  const pending = wells.filter(w => w.status === 'pending').length;

  const stats = [
    ['إجمالي الآبار', wells.length.toString()],
    ['مكتمل', completed.toString()],
    ['قيد التنفيذ', inProgress.toString()],
    ['قيد الانتظار', pending.toString()],
    ['إجمالي القواعد', totalBases.toString()],
    ['إجمالي الألواح', totalPanels.toString()],
    ['إجمالي الأعماق (م)', totalDepth.toString()],
    ['متوسط العمق (م)', avgDepth.toFixed(1)],
    ['إجمالي المواسير', totalPipes.toString()],
  ];

  stats.forEach(([label, val], i) => {
    row = xlDataRow(ws, row, [i + 1, label, val, '', '', ''], i % 2 === 1);
  });

  row++;
  row = xlSectionHeader(ws, row, 'ملخص المالي', COL_COUNT);
  row = xlTableHeader(ws, row, ['#', 'البند', 'القيمة', '', '', '']);

  const totalCrewWages = wells.reduce((s, w) => s + (w.crews || []).reduce((cs: number, c: any) => cs + safeNum(c.totalWages), 0), 0);
  const totalTransportCost = wells.reduce((s, w) => s + (w.transport || []).reduce((ts: number, t: any) => ts + safeNum(t.transportPrice), 0), 0);
  const totalTransportDues = wells.reduce((s, w) => s + (w.transport || []).reduce((ts: number, t: any) => ts + safeNum(t.crewEntitlements), 0), 0);
  const totalCrewRecords = wells.reduce((s, w) => s + (w.crews?.length || 0), 0);

  const financials = [
    ['إجمالي أجور فرق العمل', formatNum(totalCrewWages)],
    ['إجمالي تكاليف النقل', formatNum(totalTransportCost)],
    ['إجمالي مستحقات طواقم النقل', formatNum(totalTransportDues)],
    ['إجمالي التكاليف', formatNum(totalCrewWages + totalTransportCost + totalTransportDues)],
    ['عدد سجلات فرق العمل', totalCrewRecords.toString()],
    ['آبار بمنظومة شمسية', `${wells.filter(w => w.solar).length} من ${wells.length}`],
  ];

  financials.forEach(([label, val], i) => {
    row = xlDataRow(ws, row, [i + 1, label, val, '', '', ''], i % 2 === 1);
  });

  row++;
  row = xlSignatures(ws, row, [
    { title: 'المهندس المسؤول', name: engineerName },
    { title: 'مدير المشروع' },
    { title: 'المحاسب', name: currentReportHeader().accountant_name || undefined },
  ], [[1, 2], [3, 4], [5, 6]]);

  row++;
  row = xlFooter(ws, row, COL_COUNT);
}
