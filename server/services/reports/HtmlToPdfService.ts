import puppeteer from 'puppeteer';

let browserInstance: any = null;

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  
  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--single-process',
    ],
  });
  
  return browserInstance;
}

export async function convertHtmlToPdf(htmlContent: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 15000 });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      preferCSSPageSize: true,
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closePdfBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {}
    browserInstance = null;
  }
}
