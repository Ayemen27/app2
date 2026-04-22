import {
  PDF_COLORS, formatNum, formatDateBR, nowDateBR, escapeHtml,
  pdfHeader, pdfInfoBar, pdfKpiStrip, pdfSectionTitle,
  pdfTotalRow, pdfGrandTotalRow, pdfSignatures, pdfFooter, pdfWrap,
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
  notes?: string | null;
  crews: any[];
  solar: any | null;
  transport: any[];
  receptions: any[];
  tasks: any[];
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

export function generateWellReportHTML(options: {
  projectName: string;
  engineerName?: string;
  wells: WellExportData[];
  reportType: 'comprehensive' | 'wells_only' | 'crews_only' | 'solar_only';
}): string {
  const { projectName, engineerName, wells, reportType } = options;

  const totalBases = wells.reduce((s, w) => s + (w.numberOfBases || 0), 0);
  const totalPanels = wells.reduce((s, w) => s + (w.numberOfPanels || 0), 0);
  const totalDepth = wells.reduce((s, w) => s + (w.wellDepth || 0), 0);
  const totalCrewWages = wells.reduce((s, w) => s + (w.crews || []).reduce((cs: number, c: any) => cs + safeNum(c.totalWages), 0), 0);
  const completed = wells.filter(w => w.status === 'completed').length;
  const withSolar = wells.filter(w => w.solar).length;

  let body = '';

  body += pdfHeader('تقرير إدارة الآبار');
  body += pdfInfoBar(
    [`<b>المشروع:</b> ${escapeHtml(projectName)}`, `<b>المهندس:</b> ${escapeHtml(engineerName || '-')}`],
    [`<b>التاريخ:</b> ${nowDateBR()}`, `<b>عدد الآبار:</b> ${wells.length}`]
  );

  body += pdfKpiStrip([
    { label: 'إجمالي الآبار', value: wells.length.toString() },
    { label: 'مكتمل', value: completed.toString(), color: PDF_COLORS.green },
    { label: 'القواعد', value: totalBases.toString() },
    { label: 'الألواح', value: totalPanels.toString() },
    { label: 'إجمالي الأعماق', value: `${totalDepth} م` },
    { label: 'إجمالي الأجور', value: formatNum(totalCrewWages), color: PDF_COLORS.navy },
  ]);

  if (reportType === 'comprehensive' || reportType === 'wells_only') {
    body += buildWellsTable(wells);
  }
  if (reportType === 'comprehensive' || reportType === 'crews_only') {
    body += buildCrewsTable(wells);
  }
  if (reportType === 'comprehensive' || reportType === 'solar_only') {
    body += buildSolarTable(wells);
  }
  if (reportType === 'comprehensive') {
    body += buildTransportTable(wells);
  }

  body += pdfSignatures(['المهندس المسؤول', 'مدير المشروع', 'المدير العام']);
  body += pdfFooter(new Date().toISOString());

  return pdfWrap('تقرير إدارة الآبار - ' + projectName, body);
}

function buildWellsTable(wells: WellExportData[]): string {
  let html = pdfSectionTitle('بيانات الآبار');
  html += '<table><thead><tr>';
  html += ['#', 'رقم', 'اسم المالك', 'المنطقة', 'قواعد', 'ألواح', 'العمق', 'مواسير', 'غطاس', 'الحالة', 'الإنجاز'].map(h => `<th>${h}</th>`).join('');
  html += '</tr></thead><tbody>';

  let totalBases = 0, totalPanels = 0, totalDepth = 0, totalPipes = 0;

  wells.forEach((w, i) => {
    totalBases += w.numberOfBases || 0;
    totalPanels += w.numberOfPanels || 0;
    totalDepth += w.wellDepth || 0;
    totalPipes += w.numberOfPipes || 0;

    html += `<tr>
      <td>${i + 1}</td>
      <td>${w.wellNumber}</td>
      <td>${escapeHtml(w.ownerName)}</td>
      <td>${escapeHtml(w.region)}</td>
      <td>${w.numberOfBases || 0}</td>
      <td>${w.numberOfPanels || 0}</td>
      <td>${w.wellDepth || 0}</td>
      <td>${w.numberOfPipes || 0}</td>
      <td>${w.pumpPower ? escapeHtml(String(w.pumpPower)) + ' kw' : '-'}</td>
      <td>${escapeHtml(STATUS_AR[w.status] || w.status)}</td>
      <td>${safeNum(w.completionPercentage)}%</td>
    </tr>`;
  });

  html += pdfTotalRow(['الإجمالي', '', '', '', totalBases.toString(), totalPanels.toString(), totalDepth + ' م', totalPipes.toString(), '', wells.length + ' بئر', '']);
  html += '</tbody></table>';
  return html;
}

function buildCrewsTable(wells: WellExportData[]): string {
  let html = pdfSectionTitle('فرق العمل');
  html += '<table><thead><tr>';
  html += ['#', 'رقم', 'المالك', 'نوع العمل', 'الفريق', 'عمال', 'أسطوات', 'أيام', 'إجمالي الأجور'].map(h => `<th>${h}</th>`).join('');
  html += '</tr></thead><tbody>';

  let idx = 0;
  let grandTotal = 0;

  for (const w of wells) {
    for (const c of (w.crews || [])) {
      idx++;
      const wages = safeNum(c.totalWages);
      grandTotal += wages;
      html += `<tr>
        <td>${idx}</td>
        <td>${w.wellNumber}</td>
        <td>${escapeHtml(w.ownerName)}</td>
        <td>${escapeHtml(CREW_TYPE_AR[c.crewType] || c.crewType)}</td>
        <td>${escapeHtml(c.teamName || '-')}</td>
        <td>${c.workersCount || 0}</td>
        <td>${c.mastersCount || 0}</td>
        <td>${safeNum(c.workDays)}</td>
        <td>${formatNum(wages)}</td>
      </tr>`;
    }
  }

  html += pdfGrandTotalRow(['الإجمالي العام', '', '', '', '', '', '', '', formatNum(grandTotal)]);
  html += '</tbody></table>';
  return html;
}

function buildSolarTable(wells: WellExportData[]): string {
  let html = pdfSectionTitle('المنظومة الشمسية');
  html += '<table><thead><tr>';
  html += ['#', 'رقم', 'المالك', 'الإنفرتر', 'صندوق تجميع', 'كيبل 16×3', 'كيبل 10×2', 'لوحة تأريض', 'غطاس'].map(h => `<th>${h}</th>`).join('');
  html += '</tr></thead><tbody>';

  let totalC16 = 0, totalC10 = 0;

  wells.forEach((w, i) => {
    const s = w.solar;
    const c16 = safeNum(s?.cable16x3mmLength);
    const c10 = safeNum(s?.cable10x2mmLength);
    totalC16 += c16;
    totalC10 += c10;

    html += `<tr>
      <td>${i + 1}</td>
      <td>${w.wellNumber}</td>
      <td>${escapeHtml(w.ownerName)}</td>
      <td>${escapeHtml(s?.inverter || '-')}</td>
      <td>${escapeHtml(s?.collectionBox || '-')}</td>
      <td>${c16 > 0 ? formatNum(c16) : '-'}</td>
      <td>${c10 > 0 ? formatNum(c10) : '-'}</td>
      <td>${escapeHtml(s?.groundingPlate || '-')}</td>
      <td>${s?.submersiblePump ? 'نعم' : 'لا'}</td>
    </tr>`;
  });

  html += pdfTotalRow(['الإجمالي', '', '', '', '', formatNum(totalC16), formatNum(totalC10), '', '']);
  html += '</tbody></table>';
  return html;
}

function buildTransportTable(wells: WellExportData[]): string {
  const hasTransport = wells.some(w => w.transport && w.transport.length > 0);
  if (!hasTransport) return '';

  let html = pdfSectionTitle('النقل والتوصيل');
  html += '<table><thead><tr>';
  html += ['#', 'رقم', 'المالك', 'نوع السكة', 'مع ألواح', 'سعر النقل', 'مستحقات الطاقم', 'التاريخ'].map(h => `<th>${h}</th>`).join('');
  html += '</tr></thead><tbody>';

  let idx = 0;
  let totalPrice = 0, totalDues = 0;

  for (const w of wells) {
    for (const t of (w.transport || [])) {
      idx++;
      const price = safeNum(t.transportPrice);
      const dues = safeNum(t.crewEntitlements);
      totalPrice += price;
      totalDues += dues;
      html += `<tr>
        <td>${idx}</td>
        <td>${w.wellNumber}</td>
        <td>${escapeHtml(w.ownerName)}</td>
        <td>${escapeHtml(t.railType === 'new' ? 'جديدة' : t.railType === 'old' ? 'قديمة' : (t.railType || '-'))}</td>
        <td>${t.withPanels ? 'نعم' : 'لا'}</td>
        <td>${formatNum(price)}</td>
        <td>${formatNum(dues)}</td>
        <td>${formatDateBR(t.transportDate) || '-'}</td>
      </tr>`;
    }
  }

  html += pdfGrandTotalRow(['الإجمالي', '', '', '', '', formatNum(totalPrice), formatNum(totalDues), '']);
  html += '</tbody></table>';
  return html;
}
