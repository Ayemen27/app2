import { downloadFile, isMobileWebView } from '@/utils/webview-download';

interface PDFGenerationOptions {
  html: string;
  filename: string;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export async function generatePDF(options: PDFGenerationOptions): Promise<boolean> {
  try {
    if (isMobileWebView()) {
      return await mobileDownload(options);
    }
    return await browserPrint(options);
  } catch (error) {
    console.error('[PDF] Generation error:', error);
    return await mobileDownload(options);
  }
}

async function mobileDownload(options: PDFGenerationOptions): Promise<boolean> {
  try {
    const blob = new Blob([options.html], { type: 'text/html' });
    return await downloadFile(blob, `${options.filename}.html`, 'text/html');
  } catch (error) {
    console.error('[PDF] Mobile download error:', error);
    return false;
  }
}

async function browserPrint(options: PDFGenerationOptions): Promise<boolean> {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return await mobileDownload(options);
    }

    printWindow.document.write(options.html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };

    return true;
  } catch (error) {
    console.error('[PDF] Browser generation error:', error);
    return false;
  }
}

export default generatePDF;