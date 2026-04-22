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

    // ✅ نستخدم صفحة A4 قياسية دائماً لضمان عرض متّسق على كل عارضات PDF
    // (عارضات الجوال/سامسونج/جوجل تعرض الصفحات المخصّصة داخل إطار A4 وهمي
    //  مما يجعل المحتوى يبدو "مقصوصاً" ومتمركزاً في صفحة بهوامش بيضاء كبيرة).
    const pdf: any = new jsPDF(isLandscape ? 'l' : 'p', 'mm', options.format === 'Letter' ? 'letter' : 'a4');

    if (imgHeight <= a4Height) {
      // محتوى يدخل في صفحة واحدة → ضعه في الأعلى داخل صفحة A4 كاملة
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // محتوى أطول من صفحة → تقسيم على عدة صفحات A4
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
  /** اسم المشروع — يُلحَق تلقائياً بعنوان التقرير إن وُجد، ويوحّد تنسيقه عبر كل التقارير. */
  projectName?: string | null;
  infoItems?: Array<{ label: string; value: string | number; color?: string }>;
  columns: TablePDFColumn[];
  data: Record<string, any>[];
  totals?: { label: string; values: Record<string, string | number> };
  filename: string;
  orientation?: 'portrait' | 'landscape';
  headerColor?: string;
  accentColor?: string;
}

/** يُنظّف "تاريخ الإصدار" من subtitle (مكرر في الفوتر تلقائياً). */
function _stripIssueDate(s?: string): string | undefined {
  if (!s) return s;
  const cleaned = s
    .replace(/تاريخ\s*(الإصدار|الاستخراج|التقرير|الإنشاء)\s*[:：]?\s*[^|•·\-—\n]+/g, '')
    .replace(/^[\s|•·\-—]+|[\s|•·\-—]+$/g, '')
    .replace(/[\s]*[|•·]+[\s]*[|•·]+[\s]*/g, ' • ')
    .trim();
  return cleaned || undefined;
}

/** يُحاول قراءة اسم المشروع المختار من localStorage إن لم يُمرَّر صراحةً. */
function _autoProjectName(passed?: string | null): string | null {
  if (passed !== undefined) return passed;
  try {
    return (typeof window !== 'undefined' && window.localStorage)
      ? window.localStorage.getItem('construction-app-selected-project-name')
      : null;
  } catch { return null; }
}

/** يُلحق "— مشروع X" أو "— جميع المشاريع" بعنوان التقرير. مصدر موحّد للتنسيق. */
export function decorateTitleWithProject(title: string, projectName?: string | null): string {
  const t = (title || '').trim();
  const name = (projectName || '').trim();
  if (!name) return t;
  if (name === 'جميع المشاريع' || name === 'all') return `${t} — جميع المشاريع`;
  return `${t} — مشروع ${name}`;
}

export async function generateTablePDF(options: TablePDFOptions): Promise<boolean> {
  const { ensureBrandingLoaded, getBranding } = await import('@/lib/report-branding');
  await ensureBrandingLoaded();
  // 🏗️ توحيد تلقائي: دمج اسم المشروع (من القيمة المُمرَّرة أو من localStorage) + إزالة "تاريخ الإصدار" من subtitle
  const autoProj = _autoProjectName(options.projectName);
  options = {
    ...options,
    reportTitle: decorateTitleWithProject(options.reportTitle, autoProj),
    subtitle: _stripIssueDate(options.subtitle),
  };
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
