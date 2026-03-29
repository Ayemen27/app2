import { chromium, type Browser } from 'playwright';
import { existsSync } from 'fs';

let browserInstance: Browser | null = null;
let chromiumAvailable: boolean | null = null;

function findChromiumPath(): string | undefined {
  const candidates = [
    process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-131.0.6778.204/bin/chromium',
  ];

  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }

  return undefined;
}

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const execPath = findChromiumPath();

  try {
    browserInstance = await chromium.launch({
      ...(execPath ? { executablePath: execPath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--no-first-run',
      ],
    });
    chromiumAvailable = true;
    return browserInstance;
  } catch (err: unknown) {
    chromiumAvailable = false;
    console.error('[PDF] Chromium launch failed:', (err as Error)?.message);
    throw new Error('PDF_ENGINE_UNAVAILABLE');
  }
}

export function isPdfEngineAvailable(): boolean {
  if (chromiumAvailable !== null) return chromiumAvailable;
  const path = findChromiumPath();
  return path !== undefined;
}

export async function convertHtmlToPdf(htmlContent: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle', timeout: 30000 });

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfUint8);
  } finally {
    await page.close();
  }
}

export async function closePdfBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (err: unknown) {
      console.warn('[PDF] Browser close error (non-critical):', (err as Error)?.message);
    }
    browserInstance = null;
  }
}
