import { downloadFile, isMobileWebView } from '@/utils/webview-download';

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
    container.style.width = '794px';
    container.style.background = '#fff';
    container.style.zIndex = '-1';
    container.innerHTML = options.html;
    document.body.appendChild(container);

    await new Promise(r => setTimeout(r, 300));

    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    document.body.removeChild(container);

    const isLandscape = options.orientation === 'landscape';
    const imgWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', options.format === 'Letter' ? 'letter' : 'a4');

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    const fileName = `${options.filename}.pdf`;

    return await downloadFile(pdfBlob, fileName, 'application/pdf');
  } catch (error) {
    console.error('[PDF] Generation error:', error);
    return false;
  }
}

export default generatePDF;
