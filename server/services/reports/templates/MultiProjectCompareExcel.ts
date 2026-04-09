/**
 * قالب Excel: مقارنة العمالة والتكاليف بين مشاريع متعددة على ورقة واحدة
 * جدول pivot: كل عامل في سطر واحد، وأعمدة لكل مشروع
 */
import ExcelJS from 'exceljs';
import { MultiProjectFinalReportData } from '../../../../shared/report-types';
import {
  COLORS, BORDER, formatNum, formatDateBR, nowDateBR,
  xlCompanyHeader, xlTitleRow, xlInfoRow, xlSectionHeader, xlFooter, xlSignatures,
} from './shared-styles';

// ─── أكواد لوان المشاريع (خلفية رؤوس الأعمدة) ────────────────────────────────
const PROJECT_HEADER_COLORS = [
  'FF2E5090', // أزرق داكن
  'FF2E7D32', // أخضر داكن
  'FFAD1457', // وردي داكن
  'FFE65100', // برتقالي داكن
  'FF4527A0', // بنفسجي داكن
  'FF00695C', // فيروزي داكن
];

function projHeaderBg(i: number): string {
  return PROJECT_HEADER_COLORS[i % PROJECT_HEADER_COLORS.length];
}

// ─── مساعد: تطبيق تنسيق خلية رأس ────────────────────────────────────────────
function styleHeader(
  cell: ExcelJS.Cell,
  value: string | number,
  bgArgb: string,
  opts: { bold?: boolean; size?: number; wrapText?: boolean; hAlign?: ExcelJS.Alignment['horizontal'] } = {}
) {
  cell.value = value;
  cell.font = { bold: opts.bold ?? true, size: opts.size ?? 10, color: { argb: COLORS.white }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
  cell.alignment = { horizontal: opts.hAlign ?? 'center', vertical: 'middle', wrapText: opts.wrapText ?? true };
  cell.border = BORDER;
}

// ─── مساعد: تطبيق تنسيق خلية بيانات ─────────────────────────────────────────
function styleData(
  cell: ExcelJS.Cell,
  value: string | number | null,
  opts: { bg?: string; bold?: boolean; color?: string; hAlign?: ExcelJS.Alignment['horizontal'] } = {}
) {
  cell.value = value ?? '';
  cell.font = { bold: opts.bold ?? false, size: 10, color: { argb: opts.color ?? COLORS.black }, name: 'Calibri' };
  if (opts.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
  cell.alignment = { horizontal: opts.hAlign ?? 'center', vertical: 'middle', wrapText: true };
  cell.border = BORDER;
}

export async function generateMultiProjectCompareExcel(data: MultiProjectFinalReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AXION Reports';
  workbook.created = new Date();

  const projects = data.projects;
  const N = projects.length;

  // ─── عدد الأعمدة الكلي: 2 ثابت + 3×N مشاريع + 3 إجمالي ────────────────────
  const TOTAL_COLS = 2 + N * 3 + 3;

  // ─── ورقة العمال pivot ───────────────────────────────────────────────────────
  const ws = workbook.addWorksheet('مقارنة العمالة', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  // ─── عرض الأعمدة ──────────────────────────────────────────────────────────────
  ws.getColumn(1).width = 22; // اسم العامل
  ws.getColumn(2).width = 12; // النوع
  for (let p = 0; p < N; p++) {
    ws.getColumn(3 + p * 3).width = 8;  // أيام
    ws.getColumn(4 + p * 3).width = 14; // مستحق
    ws.getColumn(5 + p * 3).width = 14; // مدفوع
  }
  ws.getColumn(3 + N * 3).width = 8;  // إجمالي أيام
  ws.getColumn(4 + N * 3).width = 14; // إجمالي مستحق
  ws.getColumn(5 + N * 3).width = 14; // إجمالي مدفوع

  let row = 1;
  row = xlCompanyHeader(ws, row, TOTAL_COLS);
  row = xlTitleRow(ws, row, 'جدول مقارنة العمالة الموحّد — ورقة واحدة', TOTAL_COLS);
  row = xlInfoRow(
    ws, row,
    `المشاريع: ${data.projectNames.join(' + ')}  |  الفترة: ${formatDateBR(data.period.from)} - ${formatDateBR(data.period.to)}  |  تاريخ الطباعة: ${nowDateBR()}`,
    TOTAL_COLS
  );
  row++;

  // ─── صف رأس 1: أسماء المشاريع (merged) ──────────────────────────────────────
  {
    const hdr = ws.getRow(row);
    hdr.height = 30;

    // خلية العامل
    ws.mergeCells(row, 1, row + 1, 1);
    styleHeader(ws.getCell(row, 1), 'اسم العامل', COLORS.navy, { size: 10 });

    // خلية النوع
    ws.mergeCells(row, 2, row + 1, 2);
    styleHeader(ws.getCell(row, 2), 'النوع', COLORS.navy, { size: 10 });

    // أعمدة كل مشروع
    for (let p = 0; p < N; p++) {
      const startCol = 3 + p * 3;
      ws.mergeCells(row, startCol, row, startCol + 2);
      styleHeader(ws.getCell(row, startCol), projects[p].projectName, projHeaderBg(p), { size: 10 });
    }

    // أعمدة الإجمالي
    const totalStart = 3 + N * 3;
    ws.mergeCells(row, totalStart, row, totalStart + 2);
    styleHeader(ws.getCell(row, totalStart), 'الإجمالي', COLORS.navy, { size: 10 });

    row++;
  }

  // ─── صف رأس 2: أيام / مستحق / مدفوع لكل مشروع ──────────────────────────────
  {
    const hdr = ws.getRow(row);
    hdr.height = 24;

    for (let p = 0; p < N; p++) {
      const startCol = 3 + p * 3;
      styleHeader(ws.getCell(row, startCol), 'أيام', projHeaderBg(p), { size: 9 });
      styleHeader(ws.getCell(row, startCol + 1), 'مستحق', projHeaderBg(p), { size: 9 });
      styleHeader(ws.getCell(row, startCol + 2), 'مدفوع', projHeaderBg(p), { size: 9 });
    }
    const totalStart = 3 + N * 3;
    styleHeader(ws.getCell(row, totalStart), 'أيام', COLORS.navy, { size: 9 });
    styleHeader(ws.getCell(row, totalStart + 1), 'مستحق', COLORS.navy, { size: 9 });
    styleHeader(ws.getCell(row, totalStart + 2), 'مدفوع', COLORS.navy, { size: 9 });
    row++;
  }

  // ─── بناء pivot: كل عامل → بياناته لكل مشروع ────────────────────────────────
  interface ProjData { days: number; earned: number; paid: number }
  interface WorkerPivot { name: string; type: string; projects: Record<string, ProjData>; totalDays: number; totalEarned: number; totalPaid: number }

  const workerMap = new Map<string, WorkerPivot>();
  for (const w of data.combinedSections.attendance.byWorker) {
    const key = w.workerName;
    if (!workerMap.has(key)) {
      workerMap.set(key, { name: w.workerName, type: w.workerType || '-', projects: {}, totalDays: 0, totalEarned: 0, totalPaid: 0 });
    }
    const wp = workerMap.get(key)!;
    const paid = w.totalPaid ?? ((w.totalDirectPaid ?? 0) + (w.totalTransfers ?? 0));
    wp.projects[String(w.projectId)] = { days: w.totalDays || 0, earned: w.totalEarned || 0, paid };
    wp.totalDays += w.totalDays || 0;
    wp.totalEarned += w.totalEarned || 0;
    wp.totalPaid += paid;
  }

  const workers = [...workerMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  // ─── أعمدة إجمالية لصف الإجمالي ──────────────────────────────────────────────
  const colTotals: Record<string, ProjData> = {};
  let grandDays = 0, grandEarned = 0, grandPaid = 0;

  let seq = 0;
  for (const w of workers) {
    seq++;
    const isAlt = seq % 2 === 0;
    const bg = isAlt ? COLORS.lightBlue : undefined;

    const r = ws.getRow(row);
    r.height = 22;

    // اسم العامل + النوع
    styleData(ws.getCell(row, 1), w.name, { bg, hAlign: 'right' });
    styleData(ws.getCell(row, 2), w.type, { bg, hAlign: 'right' });

    // بيانات كل مشروع
    for (let p = 0; p < N; p++) {
      const pid = String(projects[p].projectId);
      const pd = w.projects[pid];
      const startCol = 3 + p * 3;

      if (!colTotals[pid]) colTotals[pid] = { days: 0, earned: 0, paid: 0 };

      if (pd) {
        styleData(ws.getCell(row, startCol), pd.days, { bg, color: COLORS.navy });
        styleData(ws.getCell(row, startCol + 1), formatNum(pd.earned), { bg, color: COLORS.amber });
        styleData(ws.getCell(row, startCol + 2), formatNum(pd.paid), { bg, color: COLORS.green });
        colTotals[pid].days += pd.days;
        colTotals[pid].earned += pd.earned;
        colTotals[pid].paid += pd.paid;
      } else {
        styleData(ws.getCell(row, startCol), '—', { bg, color: COLORS.gray500 });
        styleData(ws.getCell(row, startCol + 1), '—', { bg, color: COLORS.gray500 });
        styleData(ws.getCell(row, startCol + 2), '—', { bg, color: COLORS.gray500 });
      }
    }

    // إجمالي العامل
    const totalStart = 3 + N * 3;
    styleData(ws.getCell(row, totalStart), w.totalDays, { bg: COLORS.totalBg, bold: true, color: COLORS.navy });
    styleData(ws.getCell(row, totalStart + 1), formatNum(w.totalEarned), { bg: COLORS.totalBg, bold: true, color: COLORS.amber });
    styleData(ws.getCell(row, totalStart + 2), formatNum(w.totalPaid), { bg: COLORS.totalBg, bold: true, color: COLORS.green });

    grandDays += w.totalDays;
    grandEarned += w.totalEarned;
    grandPaid += w.totalPaid;
    row++;
  }

  // ─── صف الإجماليات ──────────────────────────────────────────────────────────
  {
    const r = ws.getRow(row);
    r.height = 28;
    styleData(ws.getCell(row, 1), 'الإجمالي العام', { bg: COLORS.grandTotalBg, bold: true, color: COLORS.white, hAlign: 'center' });
    ws.mergeCells(row, 1, row, 2);
    styleData(ws.getCell(row, 2), '', { bg: COLORS.grandTotalBg });

    for (let p = 0; p < N; p++) {
      const pid = String(projects[p].projectId);
      const ct = colTotals[pid] || { days: 0, earned: 0, paid: 0 };
      const startCol = 3 + p * 3;
      styleData(ws.getCell(row, startCol), ct.days, { bg: COLORS.grandTotalBg, bold: true, color: COLORS.white });
      styleData(ws.getCell(row, startCol + 1), formatNum(ct.earned), { bg: COLORS.grandTotalBg, bold: true, color: 'FFFFD54F' });
      styleData(ws.getCell(row, startCol + 2), formatNum(ct.paid), { bg: COLORS.grandTotalBg, bold: true, color: 'FF69F0AE' });
    }

    const totalStart = 3 + N * 3;
    styleData(ws.getCell(row, totalStart), grandDays, { bg: COLORS.grandTotalBg, bold: true, color: COLORS.white });
    styleData(ws.getCell(row, totalStart + 1), formatNum(grandEarned), { bg: COLORS.grandTotalBg, bold: true, color: 'FFFFD54F' });
    styleData(ws.getCell(row, totalStart + 2), formatNum(grandPaid), { bg: COLORS.grandTotalBg, bold: true, color: 'FF69F0AE' });
    row++;
  }

  row++;

  // ─── جدول الملخص المالي المقارن ─────────────────────────────────────────────
  const SUMMARY_COLS = N + 2;
  row = xlSectionHeader(ws, row, 'الملخص المالي المقارن بين المشاريع', SUMMARY_COLS);

  // رأس الملخص
  {
    const hdr = ws.getRow(row);
    hdr.height = 24;
    styleHeader(ws.getCell(row, 1), 'البند', COLORS.navy, { size: 10 });
    for (let p = 0; p < N; p++) {
      styleHeader(ws.getCell(row, 2 + p), projects[p].projectName, projHeaderBg(p), { size: 9 });
    }
    styleHeader(ws.getCell(row, 2 + N), 'الإجمالي', COLORS.navy, { size: 10 });
    row++;
  }

  const summaryRows: [string, (p: typeof projects[0]) => number][] = [
    ['الوارد (العهدة)', p => p.totals.totalIncome || 0],
    ['الأجور المدفوعة', p => p.totals.totalPaidWages ?? p.totals.totalWages ?? 0],
    ['المواد', p => p.totals.totalMaterials || 0],
    ['النقل', p => p.totals.totalTransport || 0],
    ['النثريات', p => p.totals.totalMisc || 0],
    ['إجمالي المصروفات', p => p.totals.totalExpenses || 0],
    ['الرصيد', p => p.totals.balance || 0],
  ];

  summaryRows.forEach(([label, getter], idx) => {
    const r = ws.getRow(row);
    r.height = 22;
    const isAlt = idx % 2 === 1;
    const bg = isAlt ? COLORS.lightBlue : undefined;
    const isTotalRow = label === 'إجمالي المصروفات' || label === 'الرصيد';
    const rowBg = isTotalRow ? COLORS.totalBg : bg;

    styleData(ws.getCell(row, 1), label, { bg: rowBg, bold: isTotalRow, hAlign: 'right' });
    let grandVal = 0;
    for (let p = 0; p < N; p++) {
      const val = getter(projects[p]);
      grandVal += val;
      styleData(ws.getCell(row, 2 + p), formatNum(val), { bg: rowBg, bold: isTotalRow });
    }
    styleData(ws.getCell(row, 2 + N), formatNum(grandVal), { bg: isTotalRow ? COLORS.grandTotalBg : rowBg, bold: true, color: isTotalRow ? COLORS.white : COLORS.navy });
    row++;
  });

  row++;

  // ─── جدول المواد المجمع ──────────────────────────────────────────────────────
  if (data.combinedSections.materials.items.length > 0) {
    const MAT_COLS = 5 + N;
    row = xlSectionHeader(ws, row, 'المواد — الورقة الموحّدة', MAT_COLS);

    {
      const hdr = ws.getRow(row);
      hdr.height = 24;
      styleHeader(ws.getCell(row, 1), '#', COLORS.navy, { size: 9 });
      styleHeader(ws.getCell(row, 2), 'اسم المادة', COLORS.navy, { size: 9 });
      for (let p = 0; p < N; p++) {
        styleHeader(ws.getCell(row, 3 + p), projects[p].projectName, projHeaderBg(p), { size: 9 });
      }
      styleHeader(ws.getCell(row, 3 + N), 'الكمية', COLORS.navy, { size: 9 });
      styleHeader(ws.getCell(row, 4 + N), 'الإجمالي', COLORS.navy, { size: 9 });
      styleHeader(ws.getCell(row, 5 + N), 'المورد', COLORS.navy, { size: 9 });
      row++;
    }

    data.combinedSections.materials.items.forEach((m, idx) => {
      const r = ws.getRow(row);
      r.height = 20;
      const isAlt = idx % 2 === 1;
      const bg = isAlt ? COLORS.lightBlue : undefined;
      const projIdx = projects.findIndex(p => String(p.projectId) === String((m as any).projectId));

      styleData(ws.getCell(row, 1), idx + 1, { bg });
      styleData(ws.getCell(row, 2), m.materialName, { bg, hAlign: 'right' });
      for (let p = 0; p < N; p++) {
        styleData(ws.getCell(row, 3 + p), p === projIdx ? '●' : '', { bg, color: projIdx >= 0 ? projHeaderBg(projIdx) : COLORS.gray500 });
      }
      styleData(ws.getCell(row, 3 + N), formatNum(m.totalQuantity), { bg });
      styleData(ws.getCell(row, 4 + N), formatNum(m.totalAmount), { bg, color: COLORS.green });
      styleData(ws.getCell(row, 5 + N), m.supplierName || '—', { bg, hAlign: 'right' });
      row++;
    });

    // صف إجمالي المواد
    {
      const r = ws.getRow(row);
      r.height = 24;
      styleData(ws.getCell(row, 1), '', { bg: COLORS.totalBg });
      styleData(ws.getCell(row, 2), 'الإجمالي', { bg: COLORS.totalBg, bold: true, hAlign: 'right' });
      for (let p = 0; p < N; p++) styleData(ws.getCell(row, 3 + p), '', { bg: COLORS.totalBg });
      styleData(ws.getCell(row, 3 + N), formatNum(data.combinedSections.materials.items.reduce((s, m) => s + (m.totalQuantity || 0), 0)), { bg: COLORS.totalBg, bold: true });
      styleData(ws.getCell(row, 4 + N), formatNum(data.combinedSections.materials.total || 0), { bg: COLORS.totalBg, bold: true, color: COLORS.green });
      styleData(ws.getCell(row, 5 + N), '', { bg: COLORS.totalBg });
      row++;
    }
    row++;
  }

  row = xlSignatures(ws, row, ['المهندس', 'المدير', 'المدير المالي'], [[1, Math.ceil(TOTAL_COLS / 3)], [Math.ceil(TOTAL_COLS / 3) + 1, Math.ceil(2 * TOTAL_COLS / 3)], [Math.ceil(2 * TOTAL_COLS / 3) + 1, TOTAL_COLS]]);
  row++;
  row = xlFooter(ws, row, TOTAL_COLS);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
