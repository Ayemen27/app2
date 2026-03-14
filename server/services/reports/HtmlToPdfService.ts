import puppeteer from 'puppeteer';

let browserInstance: any = null;

function getChromiumPath(): string {
  if (process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  return '';
}

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  
  const chromiumPath = getChromiumPath();
  const launchOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--single-process',
      '--font-render-hinting=none',
    ],
  };

  if (chromiumPath) {
    launchOptions.executablePath = chromiumPath;
  }

  browserInstance = await puppeteer.launch(launchOptions);
  
  return browserInstance;
}

export async function convertHtmlToPdf(htmlContent: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
    
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
