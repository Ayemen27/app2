import { ENV } from "@/lib/env";
import { Capacitor } from '@capacitor/core';

// ─── كشف المنصة ──────────────────────────────────────────────────────────────

export function isCapacitorNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

const KNOWN_ANDROID_BROWSERS = [
  'chrome/', 'firefox/', 'edg/', 'edge/', 'opr/', 'opera/',
  'samsungbrowser/', 'ucbrowser/', 'brave/', 'vivaldi/',
  'kiwi', 'yandex/', 'duckduckgo/', 'ecosia/', 'puffin/',
  'miuibrowser/', 'huaweibrowser/', 'oppobrowser/',
];

export function isAndroidWebView(): boolean {
  if (isCapacitorNative()) return true;
  const ua = navigator.userAgent.toLowerCase();
  if (!ua.includes('android')) return false;
  if (ua.includes('; wv)') || ua.includes(';wv)')) return true;
  if (ua.includes('webview')) return true;
  if (KNOWN_ANDROID_BROWSERS.some(b => ua.includes(b))) return false;
  if (!ua.includes('chrome/') && ua.includes('version/')) return true;
  return false;
}

export function isIOSWebView(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  if (!(ua.includes('iphone') || ua.includes('ipad'))) return false;
  if (ua.includes('crios/') || ua.includes('fxios/') || ua.includes('edgios/') || ua.includes('opios/')) return false;
  return !ua.includes('safari/');
}

export function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('android') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('mobile');
}

export function isMobileWebView(): boolean {
  return isCapacitorNative() || isAndroidWebView() || isIOSWebView();
}

export function hasAndroidBridge(): boolean {
  return !!(window.Android?.downloadBase64File || window.Android?.downloadFile || window.Android?.shareFile);
}

export function hasIOSBridge(): boolean {
  return !!window.webkit?.messageHandlers?.downloadFile;
}

export function hasShareAPI(): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
}

declare global {
  interface Window {
    Android?: {
      downloadBase64File?: (base64: string, fileName: string, mimeType: string) => void;
      downloadFile?: (base64: string, fileName: string, mimeType: string) => void;
      shareFile?: (base64: string, fileName: string, mimeType: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        downloadFile?: {
          postMessage: (data: { base64: string; fileName: string; mimeType: string }) => void;
        };
      };
    };
  }
}

// ─── أدوات مساعدة ─────────────────────────────────────────────────────────────

function getMimeType(fileName: string, fallback: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf:  'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls:  'application/vnd.ms-excel',
    csv:  'text/csv',
    html: 'text/html',
    json: 'application/json',
    txt:  'text/plain',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return ext ? (map[ext] || fallback) : fallback;
}

/**
 * تنظيف اسم الملف للمشاركة الآمنة على Android/iOS:
 * - يحمي الامتداد من الاقتطاع (مشكلة xl.sx) باستبدال كل النقاط الداخلية بـ _
 * - يُبقي الأحرف العربية والإنجليزية والأرقام والشرطات
 * - يحدّ الطول إلى 120 محرفاً للاسم الأساسي (بعض الأنظمة تقطع عند 128)
 */
function sanitizeFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  let base = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  let ext  = lastDot > 0 ? fileName.substring(lastDot + 1) : '';

  // استبدل النقاط الداخلية بـ _ لمنع تشويش الامتدادات على Android
  base = base
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (base.length > 120) base = base.substring(0, 120);
  if (!base) base = 'file';

  // الامتداد: ASCII فقط بدون نقاط
  ext = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  return ext ? `${base}.${ext}` : base;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.substring(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── تتبع الأخطاء ─────────────────────────────────────────────────────────────

let _debugMode = true;

export function enableDownloadDebug(enable = true) {
  _debugMode = enable;
}

const lastErrors: Record<string, string> = {};

function debugLog(method: string, status: string, detail?: string) {
  const msg = `[DL] ${method}: ${status}${detail ? ' — ' + detail : ''}`;
  console.log(msg);
  if (status === 'ERROR' || status === 'UPLOAD_FAILED' || status === 'SKIP') {
    lastErrors[method] = detail || status;
  }
}

// ─── طرق التصدير — مرتبة من الأفضل إلى الأقل ─────────────────────────────────

/**
 * الطريقة 1: FileSharer (Capacitor native — الأفضل والأسرع)
 * تعمل على Android وiOS. تعرض قائمة المشاركة الأصلية.
 *
 * ملاحظة مهمة: لا نستخدم Capacitor.isPluginAvailable() لأنها تُرجع false
 * في Capacitor 8 حتى لو كانت الإضافة مُضمَّنة في APK. نستدعي الإضافة مباشرة.
 */
async function tryFileSharer(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  if (!isCapacitorNative()) return false;

  try {
    const { FileSharer } = await import('@byteowls/capacitor-filesharer');
    if (!FileSharer || typeof FileSharer.share !== 'function') {
      debugLog('FileSharer', 'SKIP', 'plugin object not available');
      return false;
    }

    const base64Data   = await blobToBase64(blob);
    const sanitized    = sanitizeFileName(fileName);
    const contentType  = getMimeType(sanitized, mimeType);

    debugLog('FileSharer', 'START', `${sanitized} (${blob.size} bytes)`);

    await Promise.race([
      FileSharer.share({ filename: sanitized, contentType, base64Data }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT: FileSharer > 15s')), 15000)
      ),
    ]);

    debugLog('FileSharer', 'OK');
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    debugLog('FileSharer', 'ERROR', msg);
    if (/cancel|Cancel|dismiss|USER_CANCELLED/i.test(msg)) return true;
    return false;
  }
}

/**
 * الطريقة 2: Capacitor Filesystem + Share
 * تكتب الملف في الـ Cache ثم تعرض قائمة المشاركة الأصلية.
 *
 * - Directory.Cache لا يحتاج صلاحيات على Android 10+ (API 29+)
 * - هذه الطريقة هي الأكثر موثوقية على Android بعد FileSharer
 * - لا نستخدم isPluginAvailable() — نستدعي مباشرة ونعالج الأخطاء
 */
async function tryCapacitorFsShare(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  if (!isCapacitorNative()) return false;

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share }                 = await import('@capacitor/share');

    const base64Data = await blobToBase64(blob);
    const sanitized  = sanitizeFileName(fileName);

    debugLog('CapFS', 'WRITING', sanitized);

    await Filesystem.writeFile({
      path: sanitized,
      data: base64Data,
      directory: Directory.Cache,
    });

    const { uri } = await Filesystem.getUri({
      directory: Directory.Cache,
      path: sanitized,
    });

    debugLog('CapFS', 'URI', uri);

    await Share.share({
      title:       fileName,
      url:         uri,
      dialogTitle: `مشاركة: ${fileName}`,
    });

    debugLog('CapShare', 'OK');
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    debugLog('CapFS+Share', 'ERROR', msg);
    if (/cancel|dismiss/i.test(msg)) return true;
    return false;
  }
}

/**
 * الطريقة 3: Web Share API (navigator.share)
 * تعمل في المتصفحات الحديثة وبعض WebViews — لكن ليس في Capacitor.
 * في Capacitor نتجاوز هذه الطريقة لصالح الطرق الأصلية أعلاه.
 */
async function tryWebShareAPI(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      debugLog('WebShare', 'SKIP', 'API not available');
      return false;
    }
    const file      = new File([blob], fileName, { type: mimeType });
    const shareData = { files: [file] };
    if (!navigator.canShare(shareData)) {
      debugLog('WebShare', 'SKIP', 'canShare=false');
      return false;
    }
    debugLog('WebShare', 'START', fileName);
    await navigator.share({ files: [file], title: fileName });
    debugLog('WebShare', 'OK');
    return true;
  } catch (err: any) {
    if (err?.name === 'AbortError') { debugLog('WebShare', 'CANCELLED'); return true; }
    debugLog('WebShare', 'ERROR', String(err?.message || err));
    return false;
  }
}

/**
 * الطريقة 4: Android/iOS Native Bridge (طريقة Java/Swift المُضمَّنة)
 */
async function tryNativeBridge(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const base64 = await blobToBase64(blob);

    if (hasAndroidBridge()) {
      debugLog('AndroidBridge', 'START', fileName);
      if (window.Android?.downloadBase64File) { window.Android.downloadBase64File(base64, fileName, mimeType); return true; }
      if (window.Android?.downloadFile)       { window.Android.downloadFile(base64, fileName, mimeType);       return true; }
      if (window.Android?.shareFile)          { window.Android.shareFile(base64, fileName, mimeType);          return true; }
    }

    if (hasIOSBridge()) {
      debugLog('iOSBridge', 'START', fileName);
      window.webkit?.messageHandlers?.downloadFile?.postMessage({ base64, fileName, mimeType });
      return true;
    }

    debugLog('NativeBridge', 'SKIP', 'no bridge available');
    return false;
  } catch (err: any) {
    debugLog('NativeBridge', 'ERROR', String(err?.message || err));
    return false;
  }
}

/**
 * الطريقة 4-ب: Server Proxy + Capacitor Browser
 * ترفع الملف للسيرفر مؤقتاً ثم تفتح رابط التحميل عبر متصفح Capacitor.
 * تُستخدم عندما تفشل FileSharer وFilesystem في التطبيق الأصلي.
 */
async function tryServerProxyBrowserDownload(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    debugLog('ServerProxyBrowser', 'UPLOADING', `${fileName} (${blob.size} bytes)`);

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-request-nonce': crypto.randomUUID(),
      'x-request-timestamp': new Date().toISOString(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(ENV.getApiUrl('/api/temp-download'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ base64Data, fileName, mimeType }),
    });

    if (!response.ok) {
      debugLog('ServerProxyBrowser', 'UPLOAD_FAILED', `status=${response.status}`);
      return false;
    }

    const result = await response.json();
    if (!result.success || !result.downloadUrl) {
      debugLog('ServerProxyBrowser', 'BAD_RESPONSE');
      return false;
    }

    const fullUrl = result.downloadUrl.startsWith('http')
      ? result.downloadUrl
      : ENV.getApiUrl(result.downloadUrl);
    debugLog('ServerProxyBrowser', 'URL_READY', fullUrl);

    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: fullUrl, presentationStyle: 'popover' });

    debugLog('ServerProxyBrowser', 'BROWSER_OPENED');
    return true;
  } catch (err: any) {
    debugLog('ServerProxyBrowser', 'ERROR', String(err?.message || err));
    return false;
  }
}

/**
 * الطريقة 5: Server Proxy — رفع الملف للسيرفر ثم فتح رابط التحميل
 * يُستخدم كخيار احتياطي في WebViews التي لا تدعم الطرق السابقة.
 */
async function tryServerProxyDownload(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    debugLog('ServerProxy', 'UPLOADING', `${fileName} (${blob.size} bytes)`);

    const response = await fetch(ENV.getApiUrl('/api/temp-download'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-nonce': crypto.randomUUID(),
        'x-request-timestamp': new Date().toISOString(),
      },
      credentials: 'include',
      body: JSON.stringify({ base64Data, fileName, mimeType }),
    });

    if (!response.ok) {
      debugLog('ServerProxy', 'UPLOAD_FAILED', `status=${response.status}`);
      return false;
    }

    const result = await response.json();
    if (!result.success || !result.downloadUrl) {
      debugLog('ServerProxy', 'BAD_RESPONSE');
      return false;
    }

    const fullUrl = new URL(result.downloadUrl, window.location.origin).href;
    debugLog('ServerProxy', 'URL_READY', fullUrl);

    if (isMobileWebView()) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'display:none;position:fixed;left:-9999px;';
      iframe.src = fullUrl;
      document.body.appendChild(iframe);
      await new Promise(r => setTimeout(r, 3000));
      try { document.body.removeChild(iframe); } catch {}
      debugLog('ServerProxy', 'IFRAME_DONE');
      return true;
    }

    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    debugLog('ServerProxy', 'BROWSER_CLICK_DONE');
    return true;
  } catch (err: any) {
    debugLog('ServerProxy', 'ERROR', String(err?.message || err));
    return false;
  }
}

/**
 * الطريقة 6: تحميل المتصفح التقليدي (createObjectURL)
 */
function downloadForBrowser(blob: Blob, fileName: string): boolean {
  try {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    debugLog('BrowserDownload', 'OK');
    return true;
  } catch {
    return false;
  }
}

// ─── الدالة الرئيسية للتصدير ──────────────────────────────────────────────────

/**
 * downloadFile — نقطة دخول موحّدة لتصدير الملفات
 *
 * على Android (Capacitor):
 *   1. CapFS+Share → يكتب الملف في Cache ثم يعرض قائمة المشاركة (الأفضل لاسم الملف)
 *   2. FileSharer  → احتياطي: يعرض قائمة المشاركة عبر intent extras
 *   3. NativeBridge → جسر Java إن وُجد
 *
 * على الويب / المتصفح:
 *   4. Web Share API
 *   5. Server Proxy
 *   6. تحميل المتصفح التقليدي
 *
 * ملاحظة: لا نستخدم Capacitor.isPluginAvailable() لأنها تُرجع false
 * في Capacitor 8 حتى للإضافات المُضمَّنة. نستدعي كل إضافة مباشرة ونعالج الأخطاء.
 */
export async function downloadFile(
  blob: Blob,
  fileName: string,
  mimeType?: string,
): Promise<boolean> {
  const type        = mimeType || blob.type || 'application/octet-stream';
  const onCapacitor = isCapacitorNative();
  const onMobile    = isMobileWebView();
  const onDevice    = isMobileDevice();

  if (blob.size === 0) {
    throw new Error('الملف فارغ — لم يتم إنشاء التقرير بشكل صحيح');
  }

  Object.keys(lastErrors).forEach(k => delete lastErrors[k]);

  // ── تطبيق Capacitor (Android / iOS) ──
  // نستدعي الإضافات الأصلية مباشرة بدون فحص isPluginAvailable()
  if (onCapacitor) {
    // 1. Filesystem + Share — يكتب الملف فعلياً على القرص باسمه الكامل،
    //    فتقرأه WhatsApp/Drive/Gmail من content://URI بالاسم الصحيح.
    //    هذا الترتيب يضمن ظهور اسم وصفي كامل (تقرير_يومي_2026-04-24.pdf)
    //    بدلاً من اسم عام مثل "report-daily.pdf" الذي تولّده FileSharer.
    if (await tryCapacitorFsShare(blob, fileName, type)) return true;

    // 2. FileSharer — احتياطي: يعرض Share Sheet عبر intent extras
    if (await tryFileSharer(blob, fileName, type)) return true;

    // 3. Native Bridge المضمّن (Java / Swift) — نادراً ما يكون موجوداً
    if (hasAndroidBridge() || hasIOSBridge()) {
      if (await tryNativeBridge(blob, fileName, type)) return true;
    }

    // 4. Server Proxy + Browser — رفع للسيرفر ثم فتح عبر المتصفح المدمج
    if (await tryServerProxyBrowserDownload(blob, fileName, type)) return true;

    const errorDetails = Object.entries(lastErrors)
      .map(([m, e]) => `• ${m}: ${e}`)
      .join('\n');
    console.error('[DL] All native Capacitor methods failed:', lastErrors);
    throw new Error(
      `فشل تصدير الملف:\n${errorDetails || 'تعذّر الوصول إلى إضافات المشاركة الأصلية'}\n\nيرجى التحقق من صلاحيات التطبيق.`
    );
  }

  // ── Native Bridge المضمّن (Java / Swift) ──
  if (hasAndroidBridge() || hasIOSBridge()) {
    if (await tryNativeBridge(blob, fileName, type)) return true;
  }

  // ── Web Share API (متصفحات حديثة + بعض WebViews) ──
  if (onMobile || onDevice) {
    if (await tryWebShareAPI(blob, fileName, type)) return true;
  }

  // ── Server Proxy (WebView احتياطي) ──
  if (onMobile) {
    if (await tryServerProxyDownload(blob, fileName, type)) return true;
  }

  // ── تحميل المتصفح التقليدي ──
  if (downloadForBrowser(blob, fileName)) return true;

  const errorDetails = Object.entries(lastErrors)
    .map(([m, e]) => `• ${m}: ${e}`)
    .join('\n');

  console.error('[DL] All download methods failed:', lastErrors);
  throw new Error(
    `فشل تصدير الملف بعد تجربة جميع الطرق المتاحة:\n${errorDetails}\n\nيرجى التحقق من صلاحيات التطبيق أو تجربة متصفح آخر.`
  );
}

// ─── دوال مساعدة مُصدَّرة ────────────────────────────────────────────────────

export async function downloadExcelFile(buffer: ArrayBuffer | Buffer, fileName: string): Promise<boolean> {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return downloadFile(blob, fileName);
}

export async function downloadPdfFile(buffer: ArrayBuffer | Buffer, fileName: string): Promise<boolean> {
  const blob = new Blob([buffer], { type: 'application/pdf' });
  return downloadFile(blob, fileName);
}

export function getDownloadCapabilities() {
  return {
    isWebView:          isMobileWebView(),
    isCapacitor:        isCapacitorNative(),
    isMobile:           isMobileDevice(),
    hasNativeBridge:    hasAndroidBridge() || hasIOSBridge(),
    hasShareAPI:        hasShareAPI(),
    // ملاحظة: isPluginAvailable() لا تعمل في Capacitor 8 — نحاول مباشرة
    fileSharerReady:    isCapacitorNative(),
    filesystemReady:    isCapacitorNative(),
    sharePluginReady:   isCapacitorNative(),
    recommendedMethod:
      isCapacitorNative()  ? 'capacitor-filesharer' :
      hasAndroidBridge()   ? 'android-bridge'       :
      hasIOSBridge()       ? 'ios-bridge'           :
      hasShareAPI()        ? 'webshare'             :
                             'browser',
  };
}

export function exportDiagnostics() {
  return {
    timestamp:         new Date().toISOString(),
    capabilities:      getDownloadCapabilities(),
    userAgent:         navigator.userAgent,
    platform:          Capacitor.getPlatform(),
    isNative:          isCapacitorNative(),
    lastSessionErrors: { ...lastErrors },
    bridgeChecks: {
      hasAndroidBridge: hasAndroidBridge(),
      hasIOSBridge:     hasIOSBridge(),
      hasShareAPI:      hasShareAPI(),
      windowAndroid:    !!window.Android,
      windowWebkit:     !!window.webkit,
    },
  };
}
