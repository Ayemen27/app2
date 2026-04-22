import ExcelJS from 'exceljs';
import { currentReportHeader, hexToArgb } from './header-context.js';

// ===== Static color tokens (defaults) =====
// NOTE: navy/blue/accentBlue/totalBg/grandTotalBg are PER-USER overridable
// at runtime via the report header context. The static values below remain
// as fallbacks (and as defaults for any helper called outside a request).
const STATIC_COLORS = {
  navy:        'FF1B2A4A',
  blue:        'FF2E5090',
  accentBlue:  'FF4A90D9',
  lightBlue:   'FFF0F4F8',
  white:       'FFFFFFFF',
  black:       'FF1A1A1A',
  gray100:     'FFF8F9FA',
  gray200:     'FFF0F2F5',
  gray300:     'FFDEE2E6',
  gray500:     'FF8E99A4',
  gray700:     'FF495057',
  green:       'FF2E7D32',
  greenLight:  'FFE8F5E9',
  red:         'FFC62828',
  redLight:    'FFFFEBEE',
  amber:       'FFF57F17',
  totalBg:     'FFE8EDF2',
  grandTotalBg:'FF1B2A4A',
};

/**
 * Dynamic COLORS proxy.
 * Reading COLORS.navy / COLORS.blue / COLORS.accentBlue / COLORS.grandTotalBg
 * returns the CURRENT request's branded color (from AsyncLocalStorage).
 * All other keys return the static defaults.
 * Effect: every existing template that uses `COLORS.navy` etc. is auto-themed
 * per user with NO code change required in the templates themselves.
 */
export const COLORS: typeof STATIC_COLORS = new Proxy(STATIC_COLORS, {
  get(target, prop: string) {
    const h = currentReportHeader();
    if (prop === 'navy' || prop === 'grandTotalBg') return hexToArgb(h.primary_color);
    if (prop === 'blue') return hexToArgb(h.secondary_color);
    if (prop === 'accentBlue') return hexToArgb(h.accent_color);
    return (target as any)[prop];
  }
}) as typeof STATIC_COLORS;

const STATIC_PDF_COLORS = {
  navy:        '#1B2A4A',
  blue:        '#2E5090',
  accentBlue:  '#4A90D9',
  lightBg:     '#F8F9FA',
  altRow:      '#F0F4F8',
  border:      '#DEE2E6',
  borderDark:  '#C5CCD3',
  text:        '#1A1A1A',
  textMuted:   '#6C757D',
  green:       '#2E7D32',
  greenBg:     '#E8F5E9',
  red:         '#C62828',
  redBg:       '#FFEBEE',
  amber:       '#F57F17',
  totalBg:     '#E8EDF2',
  white:       '#FFFFFF',
};

export const PDF_COLORS: typeof STATIC_PDF_COLORS = new Proxy(STATIC_PDF_COLORS, {
  get(target, prop: string) {
    const h = currentReportHeader();
    if (prop === 'navy') return h.primary_color;
    if (prop === 'blue') return h.secondary_color;
    if (prop === 'accentBlue') return h.accent_color;
    return (target as any)[prop];
  }
}) as typeof STATIC_PDF_COLORS;

export function formatNum(n: number | string | null | undefined): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInt(n: number | string | null | undefined): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function nowDateBR(): string {
  return formatDateBR(new Date().toISOString());
}

export function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.gray300 } },
  left: { style: 'thin', color: { argb: COLORS.gray300 } },
  bottom: { style: 'thin', color: { argb: COLORS.gray300 } },
  right: { style: 'thin', color: { argb: COLORS.gray300 } },
};

export function xlApplyBorders(row: ExcelJS.Row, colCount: number) {
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = BORDER;
  }
}

export function xlCompanyHeader(ws: ExcelJS.Worksheet, rowNum: number, colCount: number): number {
  const h = currentReportHeader();
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const r = ws.getRow(rowNum);
  r.getCell(1).value = h.company_name;
  r.getCell(1).font = { bold: true, size: 14, color: { argb: COLORS.white }, name: 'Calibri' };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
  r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r.height = 34;
  xlApplyBorders(r, colCount);
  // Optional contact line
  const contact = [h.address, h.phone, h.email, h.website].filter(Boolean).join('  •  ');
  if (contact) {
    rowNum += 1;
    ws.mergeCells(rowNum, 1, rowNum, colCount);
    const cr = ws.getRow(rowNum);
    cr.getCell(1).value = contact;
    cr.getCell(1).font = { size: 9, color: { argb: COLORS.gray700 }, name: 'Calibri' };
    cr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
    cr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    cr.height = 18;
  }
  return rowNum + 1;
}

export function xlTitleRow(ws: ExcelJS.Worksheet, rowNum: number, title: string, colCount: number): number {
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const r = ws.getRow(rowNum);
  r.getCell(1).value = title;
  r.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.white }, name: 'Calibri' };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blue } };
  r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r.height = 28;
  xlApplyBorders(r, colCount);
  return rowNum + 1;
}

export function xlInfoRow(ws: ExcelJS.Worksheet, rowNum: number, text: string, colCount: number): number {
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const r = ws.getRow(rowNum);
  r.getCell(1).value = text;
  r.getCell(1).font = { size: 10, color: { argb: COLORS.gray700 }, name: 'Calibri' };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
  r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r.getCell(1).border = BORDER;
  r.height = 24;
  return rowNum + 1;
}

export function xlSectionHeader(ws: ExcelJS.Worksheet, rowNum: number, text: string, colCount: number): number {
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const r = ws.getRow(rowNum);
  r.getCell(1).value = text;
  r.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blue } };
  r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r.height = 26;
  xlApplyBorders(r, colCount);
  return rowNum + 1;
}

export function xlTableHeader(ws: ExcelJS.Worksheet, rowNum: number, headers: string[]): number {
  const r = ws.getRow(rowNum);
  headers.forEach((h, i) => {
    const c = r.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = BORDER;
  });
  r.height = 26;
  return rowNum + 1;
}

export function xlDataRow(ws: ExcelJS.Worksheet, rowNum: number, values: any[], isAlt: boolean): number {
  const r = ws.getRow(rowNum);
  values.forEach((v, i) => {
    const c = r.getCell(i + 1);
    c.value = v;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.font = { size: 10, name: 'Calibri' };
    if (isAlt) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    }
    c.border = BORDER;
  });
  r.height = 22;
  return rowNum + 1;
}

export function xlTotalsRow(ws: ExcelJS.Worksheet, rowNum: number, values: any[]): number {
  const r = ws.getRow(rowNum);
  values.forEach((v, i) => {
    const c = r.getCell(i + 1);
    c.value = v;
    c.font = { bold: true, size: 10, color: { argb: COLORS.navy }, name: 'Calibri' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = BORDER;
  });
  r.height = 26;
  return rowNum + 1;
}

export function xlGrandTotalRow(ws: ExcelJS.Worksheet, rowNum: number, values: any[]): number {
  const r = ws.getRow(rowNum);
  values.forEach((v, i) => {
    const c = r.getCell(i + 1);
    c.value = v;
    c.font = { bold: true, size: 11, color: { argb: COLORS.white }, name: 'Calibri' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = BORDER;
  });
  r.height = 28;
  return rowNum + 1;
}

export function xlFooter(ws: ExcelJS.Worksheet, rowNum: number, colCount: number): number {
  const h = currentReportHeader();
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const r = ws.getRow(rowNum);
  const tail = h.footer_text || h.company_name_en || h.company_name;
  r.getCell(1).value = `Report generated: ${nowDateBR()} - ${tail}`;
  r.getCell(1).font = { size: 9, italic: true, color: { argb: COLORS.gray500 }, name: 'Calibri' };
  r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  return rowNum + 1;
}

export function xlSignatures(ws: ExcelJS.Worksheet, rowNum: number, names: string[], colRanges: [number, number][]): number {
  const r = ws.getRow(rowNum);
  r.height = 65;
  names.forEach((name, i) => {
    ws.mergeCells(rowNum, colRanges[i][0], rowNum, colRanges[i][1]);
    const c = r.getCell(colRanges[i][0]);
    c.value = `${name}\n\n.................................\nالتاريخ:     /     /`;
    c.font = { bold: true, size: 10, name: 'Calibri' };
    c.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
    c.border = BORDER;
  });
  return rowNum + 1;
}

// IMPORTANT: built as a function (not a const) so the proxied PDF_COLORS
// values are read PER REQUEST, allowing per-user color theming.
export function buildPdfBaseStyles(): string {
  return `
@font-face { font-family: "Cairo"; src: url("/fonts/cairo/Cairo-Variable.woff2") format("woff2-variations"); font-weight: 300 700; font-style: normal; font-display: swap; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
  direction: rtl;
  background: #fff;
  color: ${PDF_COLORS.text};
  font-size: 9px;
  line-height: 1.3;
}
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .section-title { break-after: avoid; }
  tr, thead { break-inside: avoid; }
  table { break-inside: auto; }
  thead { display: table-header-group; }
}
.report-container { padding: 10px; max-width: 794px; margin: 0 auto; }
.header-band {
  background: linear-gradient(135deg, ${PDF_COLORS.navy} 0%, ${PDF_COLORS.blue} 100%);
  color: #fff; text-align: center; padding: 10px 12px; margin-bottom: 0;
  border-radius: 6px 6px 0 0;
}
.header-band h1 { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px; }
.header-band .subtitle { font-size: 10px; opacity: 0.85; font-weight: 400; }
.info-bar {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 6px 10px; background: ${PDF_COLORS.lightBg};
  border: 1px solid ${PDF_COLORS.border}; border-top: none;
  margin-bottom: 8px; border-radius: 0 0 6px 6px; font-size: 9px;
}
.info-bar b { color: ${PDF_COLORS.navy}; }
.kpi-strip {
  display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;
}
.kpi-card {
  flex: 1; min-width: 86px; background: #fff;
  border: 1px solid ${PDF_COLORS.border}; border-radius: 6px;
  padding: 6px 6px; text-align: center;
  border-top: 2px solid ${PDF_COLORS.accentBlue};
}
.kpi-card .kpi-label { font-size: 8px; color: ${PDF_COLORS.textMuted}; margin-bottom: 2px; }
.kpi-card .kpi-value { font-size: 12px; font-weight: 800; color: ${PDF_COLORS.navy}; }
.section-title {
  background: ${PDF_COLORS.navy}; color: #fff;
  padding: 5px 10px; font-size: 10px; font-weight: 700;
  border-radius: 4px 4px 0 0; margin-top: 8px;
  letter-spacing: 0.3px;
}
table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
table th {
  background: ${PDF_COLORS.blue}; color: #fff;
  border: 1px solid ${PDF_COLORS.borderDark};
  padding: 4px 3px; font-size: 9px; font-weight: 700;
  text-align: center; white-space: nowrap;
}
table td {
  border: 1px solid ${PDF_COLORS.border};
  padding: 3px 4px; font-size: 9px; text-align: center;
}
table tbody tr:nth-child(even) { background: ${PDF_COLORS.altRow}; }
table tbody tr:hover { background: #E3EBF3; }
.total-row td {
  background: ${PDF_COLORS.totalBg} !important;
  font-weight: 700; color: ${PDF_COLORS.navy};
  border: 1px solid ${PDF_COLORS.borderDark};
  font-size: 9px; padding: 4px 3px;
}
.grand-total-row td {
  background: ${PDF_COLORS.navy} !important;
  font-weight: 800; color: #fff;
  border: 1px solid ${PDF_COLORS.navy};
  font-size: 10px; padding: 5px 3px;
}
.debit-cell { color: ${PDF_COLORS.green}; background: ${PDF_COLORS.greenBg} !important; font-weight: 700; }
.credit-cell { color: ${PDF_COLORS.red}; background: ${PDF_COLORS.redBg} !important; font-weight: 700; }
.balance-cell { color: ${PDF_COLORS.navy}; background: #E3EBF3 !important; font-weight: 700; }
.summary-table { width: 320px; margin-top: 4px; }
.summary-table td { padding: 5px 8px; font-size: 9px; }
.summary-table tr:nth-child(even) td { background: ${PDF_COLORS.altRow}; }
.summary-table .label-cell { font-weight: 700; text-align: right; }
.summary-table .value-cell { text-align: left; font-weight: 600; }
.signatures {
  margin-top: 16px; display: flex; justify-content: space-around; padding: 0 6px;
}
.sig-block { text-align: center; min-width: 140px; }
.sig-block .sig-title { font-size: 10px; font-weight: 700; margin-bottom: 24px; color: ${PDF_COLORS.navy}; }
.sig-block .sig-line { border-top: 2px solid ${PDF_COLORS.navy}; padding-top: 4px; font-size: 9px; color: ${PDF_COLORS.textMuted}; }
.report-footer {
  text-align: center; font-size: 8px; color: ${PDF_COLORS.textMuted};
  margin-top: 12px; padding: 5px; border-top: 1px solid ${PDF_COLORS.border};
}
`;
}

/**
 * @deprecated Kept for backward compatibility. Returns CURRENT defaults at
 * import time only — does NOT pick up per-user overrides. Templates that need
 * per-user theming should use buildPdfBaseStyles() inside pdfWrap (already wired).
 */
export const PDF_BASE_STYLES = buildPdfBaseStyles();

export function pdfHeader(title: string, subtitle: string): string {
  return `<div class="header-band">
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">${escapeHtml(subtitle)}</div>
</div>`;
}

export function pdfInfoBar(leftItems: string[], rightItems: string[]): string {
  const left = leftItems.map(i => `<div style="margin-bottom:1px;">${i}</div>`).join('');
  const right = rightItems.map(i => `<div style="margin-bottom:1px;">${i}</div>`).join('');
  return `<div class="info-bar">
  <div>${left}</div>
  <div style="text-align:left;">${right}</div>
</div>`;
}

export function pdfKpiStrip(kpis: { label: string; value: string; color?: string }[]): string {
  return `<div class="kpi-strip">${kpis.map(k =>
    `<div class="kpi-card"${k.color ? ` style="border-top-color:${k.color};"` : ''}>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value"${k.color ? ` style="color:${k.color};"` : ''}>${k.value}</div>
    </div>`
  ).join('')}</div>`;
}

export function pdfSectionTitle(text: string): string {
  return `<div class="section-title">${escapeHtml(text)}</div>`;
}

export function pdfTotalRow(cells: string[], colspan?: number): string {
  if (colspan) {
    return `<tr class="total-row"><td colspan="${colspan}">${cells[0]}</td>${cells.slice(1).map(c => `<td>${c}</td>`).join('')}</tr>`;
  }
  return `<tr class="total-row">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
}

export function pdfGrandTotalRow(cells: string[], colspan?: number): string {
  if (colspan) {
    return `<tr class="grand-total-row"><td colspan="${colspan}">${cells[0]}</td>${cells.slice(1).map(c => `<td>${c}</td>`).join('')}</tr>`;
  }
  return `<tr class="grand-total-row">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
}

export function pdfSignatures(names: string[]): string {
  return `<div class="signatures">${names.map(n =>
    `<div class="sig-block"><div class="sig-title">${n}</div><div class="sig-line">التوقيع والختم</div></div>`
  ).join('')}</div>`;
}

export function pdfFooter(generatedAt: string): string {
  const h = currentReportHeader();
  const parts = [
    h.footer_text,
    h.company_name_en,
    h.company_name,
  ].filter(Boolean);
  const tail = parts.length > 0 ? parts.join(' | ') : 'Report';
  return `<div class="report-footer">Report generated: ${escapeHtml(formatDateBR(generatedAt))} - ${escapeHtml(tail)}</div>`;
}

export function pdfWrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${buildPdfBaseStyles()}
@media print {
  .no-print { display: none !important; }
}
.print-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: ${PDF_COLORS.navy}; color: #fff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
.print-bar button { background: ${PDF_COLORS.accentBlue}; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
.print-bar button:hover { background: ${PDF_COLORS.blue}; }
.print-bar-spacer { height: 48px; }
</style>
</head>
<body>
<div class="print-bar no-print">
  <span>${escapeHtml(title)}</span>
  <button onclick="window.print()">طباعة / حفظ PDF</button>
</div>
<div class="print-bar-spacer no-print"></div>
<div class="report-container">
${body}
</div>
</body>
</html>`;
}
