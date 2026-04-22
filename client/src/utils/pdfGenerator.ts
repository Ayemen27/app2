import { downloadFile } from '@/utils/webview-download';
import DOMPurify from 'dompurify';
import { buildLetterheadHeader, buildLetterheadFooter } from '@/lib/pdf-exports';

interface PDFGenerationOptions {
  html: string;
  filename: string;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export async function generatePDF(options: PDFGenerationOptions): Promise<boolean> {
  try {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = options.orientation === 'landscape' ? '1122px' : '794px';
    container.style.background = '#fff';
    container.style.zIndex = '-1';
    container.innerHTML = DOMPurify.sanitize(options.html, { ADD_TAGS: ['style'], ADD_ATTR: ['dir', 'lang'] });
    document.body.appendChild(container);

    await new Promise(r => setTimeout(r, 300));

    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const containerWidth = options.orientation === 'landscape' ? 1122 : 794;
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: containerWidth,
      windowWidth: containerWidth,
    });

    document.body.removeChild(container);

    const isLandscape = options.orientation === 'landscape';
    const imgWidth = isLandscape ? 297 : 210;
    const a4Height = isLandscape ? 210 : 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let pdf: any;

    if (imgHeight <= a4Height) {
      // ✨ المحتوى يدخل في صفحة واحدة → استخدم حجم مخصّص = ارتفاع المحتوى الفعلي
      // عرض A4 ثابت (طبيعي للطباعة) + ارتفاع متكيّف → لا مساحة فارغة
      pdf = new jsPDF({
        orientation: isLandscape ? 'l' : 'p',
        unit: 'mm',
        format: [imgWidth, Math.max(imgHeight, 50)],
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // المحتوى أطول من صفحة → A4 عادي مع تقسيم على عدة صفحات
      pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', options.format === 'Letter' ? 'letter' : 'a4');
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= a4Height;
      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= a4Height;
      }
    }

    const pdfBlob = pdf.output('blob');
    const fileName = `${options.filename}.pdf`;

    return await downloadFile(pdfBlob, fileName, 'application/pdf');
  } catch (error) {
    return false;
  }
}

export interface TablePDFColumn {
  header: string;
  key: string;
  width?: number;
  color?: (val: any, row: Record<string, any>) => string | undefined;
}

export interface TablePDFOptions {
  reportTitle: string;
  subtitle?: string;
  infoItems?: Array<{ label: string; value: string | number; color?: string }>;
  columns: TablePDFColumn[];
  data: Record<string, any>[];
  totals?: { label: string; values: Record<string, string | number> };
  filename: string;
  orientation?: 'portrait' | 'landscape';
  headerColor?: string;
  accentColor?: string;
}

export async function generateTablePDF(options: TablePDFOptions): Promise<boolean> {
  const { ensureBrandingLoaded, getBranding } = await import('@/lib/report-branding');
  await ensureBrandingLoaded();
  const _b = getBranding();

  const containerWidth = options.orientation === 'landscape' ? 1122 : 794;
  const colCount = options.columns.length;
  const totalWeight = options.columns.reduce((s, c) => s + (c.width || 10), 0);

  // 🎨 الألوان من إعدادات المستخدم (مع إمكانية تجاوز عبر options)
  const hdrColor = options.headerColor || _b.primaryColor || '#1E3A8A';
  const accColor = options.accentColor || _b.secondaryColor || '#334155';

  // 🎨 حدود واضحة + توسيط أفقي/عمودي + حجم خط متكيف
  const fontSize = colCount > 14 ? 8 : colCount > 10 ? 9 : 10;
  const borderColor = '#475569'; // حدود أغمق وأوضح من قبل
  // عرض كل عمود كنسبة من المجموع (table-layout:fixed يلتزم بها)
  const colWidthPct = (w?: number) => `${(((w || 10) / totalWeight) * 100).toFixed(2)}%`;
  const thStyle = (col: TablePDFColumn) => `width:${colWidthPct(col.width)};padding:8px 6px;border:1.2px solid ${borderColor};font-size:${fontSize}px;font-weight:800;text-align:center;vertical-align:middle;color:#fff;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;`;
  const tdStyle = (alt: boolean) => `padding:7px 6px;border:1px solid ${borderColor};text-align:center;vertical-align:middle;font-size:${fontSize}px;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;line-height:1.4;${alt ? 'background:#F8FAFC;' : 'background:#fff;'}`;

  const headerCells = options.columns.map((col) =>
    `<th style="${thStyle(col)}">${col.header}</th>`
  ).join('');

  const dataRows = options.data.map((row, idx) => {
    const cells = options.columns.map((col) => {
      const val = row[col.key] ?? '-';
      const colorFn = col.color ? col.color(val, row) : undefined;
      const colorStyle = colorFn ? `color:${colorFn};font-weight:700;` : '';
      return `<td style="${tdStyle(idx % 2 !== 0)}${colorStyle}">${val}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  // 🎯 سطر الإجماليات: دمج العمودين الأوّلَين (م + الاسم) لتمركز التسمية بشكل صحيح
  let totalsRow = '';
  if (options.totals) {
    const totCellStyle = `padding:10px 6px;border:1.2px solid ${borderColor};font-size:${fontSize}px;font-weight:800;color:#fff;text-align:center;vertical-align:middle;`;
    const firstColW = colWidthPct((options.columns[0]?.width || 0) + (options.columns[1]?.width || 0));
    const labelExtra = options.totals.values[options.columns[1]?.key];
    const labelText = labelExtra !== undefined && labelExtra !== '' && labelExtra !== null
      ? `${options.totals.label} — ${labelExtra}`
      : options.totals.label;
    const labelCell = `<td colspan="2" style="${totCellStyle}width:${firstColW};">${labelText}</td>`;
    const restCells = options.columns.slice(2).map((col) => {
      const val = options.totals!.values[col.key];
      if (val !== undefined) return `<td style="${totCellStyle}width:${colWidthPct(col.width)};">${typeof val === 'number' ? val.toLocaleString() : val}</td>`;
      return `<td style="${totCellStyle}width:${colWidthPct(col.width)};"></td>`;
    }).join('');
    totalsRow = `<tr style="background:${accColor};">${labelCell}${restCells}</tr>`;
  }

  const infoHtml = options.infoItems?.length ? `
    <div style="display:flex;justify-content:center;gap:20px;padding:8px 16px;font-size:11px;background:#F8FAFC;margin:0 16px;border-radius:6px;flex-wrap:wrap;border:1px solid #E2E8F0;">
      ${options.infoItems.map(item => `<span>${item.label}: <b${item.color ? ` style="color:${item.color};"` : ''}>${item.value}</b></span>`).join('')}
    </div>
  ` : '';

  const html = `
    <div dir="rtl" lang="ar" style="font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;padding:0;margin:0;width:${containerWidth}px;">
      ${buildLetterheadHeader(options.reportTitle)}
      ${options.subtitle ? `<div style="text-align:center;padding:6px 16px 2px;font-size:11px;color:#6B7280;">${options.subtitle}</div>` : ''}
      ${infoHtml}
      <table style="width:auto;max-width:calc(100% - 32px);border-collapse:collapse;margin:12px auto;table-layout:auto;border:1.5px solid ${borderColor};">
        <thead>
          <tr style="background:${accColor};color:#fff;">${headerCells}</tr>
        </thead>
        <tbody>
          ${dataRows}
          ${totalsRow}
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-around;padding:20px 40px;margin-top:10px;">
        <div style="text-align:center;font-size:10px;"><b>توقيع المهندس</b><br/>.................................</div>
        <div style="text-align:center;font-size:10px;"><b>توقيع مدير المشروع</b><br/>.................................</div>
        <div style="text-align:center;font-size:10px;"><b>توقيع المدير العام</b><br/>.................................</div>
      </div>
      ${buildLetterheadFooter()}
      <div style="text-align:center;padding:8px 0;font-size:9px;color:#9CA3AF;margin:4px 16px 0;">
        تم إنشاء هذا التقرير آلياً - ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}
      </div>
    </div>
  `;

  return generatePDF({
    html,
    filename: options.filename,
    orientation: options.orientation || 'landscape',
    format: 'A4',
  });
}

export default generatePDF;
