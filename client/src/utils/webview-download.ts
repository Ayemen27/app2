import { Capacitor } from '@capacitor/core';

export function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isAndroidWebView(): boolean {
  if (isCapacitorNative()) return true;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('wv') ||
    ua.includes('webview') ||
    (ua.includes('android') && !ua.includes('chrome/')) ||
    (ua.includes('android') && ua.includes('version/'))
  );
}

export function isIOSWebView(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return (ua.includes('iphone') || ua.includes('ipad')) && !ua.includes('safari/');
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

function getMimeType(fileName: string, fallback: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    html: 'text/html',
    json: 'application/json',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return ext ? (map[ext] || fallback) : fallback;
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

let _debugMode = false;
export function enableDownloadDebug(enable: boolean = true) {
  _debugMode = enable;
}

function debugLog(method: string, status: string, detail?: string) {
  const msg = `[DL] ${method}: ${status}${detail ? ' - ' + detail : ''}`;
  console.log(msg);
  if (_debugMode) {
    try { alert(msg); } catch {}
  }
}

async function tryFileSharer(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const mod = await import('@byteowls/capacitor-filesharer');
    const FileSharer = mod.FileSharer;
    if (!FileSharer || typeof FileSharer.share !== 'function') {
      debugLog('FileSharer', 'SKIP', 'plugin not available');
      return false;
    }

    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');
    const contentType = getMimeType(sanitizedName, mimeType);

    debugLog('FileSharer', 'START', `${sanitizedName} (${blob.size} bytes)`);

    await FileSharer.share({
      filename: sanitizedName,
      contentType: contentType,
      base64Data: base64Data,
    });

    debugLog('FileSharer', 'OK');
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    debugLog('FileSharer', 'ERROR', msg);
    if (msg.includes('cancel') || msg.includes('Cancel') || msg.includes('dismiss') || msg.includes('USER_CANCELLED')) {
      return true;
    }
    return false;
  }
}

async function tryCapacitorFsShare(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const fsMod = await import('@capacitor/filesystem');
    const shareMod = await import('@capacitor/share');
    const Filesystem = fsMod.Filesystem;
    const Directory = fsMod.Directory;
    const Share = shareMod.Share;

    if (!Filesystem || !Share) {
      debugLog('CapFS+Share', 'SKIP', 'plugins not available');
      return false;
    }

    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');

    debugLog('CapFS', 'WRITING', sanitizedName);

    await Filesystem.writeFile({
      path: sanitizedName,
      data: base64Data,
      directory: Directory.Cache,
    });

    const uriResult = await Filesystem.getUri({
      directory: Directory.Cache,
      path: sanitizedName,
    });

    debugLog('CapFS', 'URI', uriResult.uri);

    await Share.share({
      title: fileName,
      url: uriResult.uri,
      dialogTitle: `مشاركة: ${fileName}`,
    });

    debugLog('CapShare', 'OK');
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    debugLog('CapFS+Share', 'ERROR', msg);
    if (msg.includes('canceled') || msg.includes('dismissed') || msg.includes('cancel')) {
      return true;
    }
    return false;
  }
}

async function tryWebShareAPI(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      debugLog('WebShare', 'SKIP', 'API not available');
      return false;
    }
    const file = new File([blob], fileName, { type: mimeType });
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
    if (err?.name === 'AbortError') {
      debugLog('WebShare', 'CANCELLED');
      return true;
    }
    debugLog('WebShare', 'ERROR', String(err?.message || err));
    return false;
  }
}

async function tryServerProxyDownload(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);

    debugLog('ServerProxy', 'UPLOADING', `${fileName} (${blob.size} bytes)`);

    const response = await fetch('/api/temp-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      debugLog('ServerProxy', 'MOBILE_REDIRECT', 'using window.location for download');
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = fullUrl;
      document.body.appendChild(iframe);

      await new Promise(resolve => setTimeout(resolve, 3000));
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
  } catch (error: any) {
    debugLog('ServerProxy', 'ERROR', String(error?.message || error));
    return false;
  }
}

function downloadForBrowser(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('[DL] Browser failed:', error);
    return false;
  }
}

export async function downloadFile(
  blob: Blob,
  fileName: string,
  mimeType?: string
): Promise<boolean> {
  const type = mimeType || blob.type || 'application/octet-stream';
  const onMobile = isMobileWebView();
  const onCapacitor = isCapacitorNative();

  console.log('[DL] === START ===', {
    fileName,
    type,
    size: blob.size,
    capacitor: onCapacitor,
    mobile: onMobile,
    ua: navigator.userAgent.substring(0, 100),
  });

  const tried: string[] = [];

  if (onCapacitor) {
    tried.push('FileSharer');
    try {
      const r = await tryFileSharer(blob, fileName, type);
      if (r) {
        console.log('[DL] === SUCCESS via FileSharer ===');
        return true;
      }
    } catch (e: any) {
      console.error('[DL] FileSharer threw:', e?.message || e);
    }

    tried.push('CapFS+Share');
    try {
      const r = await tryCapacitorFsShare(blob, fileName, type);
      if (r) {
        console.log('[DL] === SUCCESS via CapFS+Share ===');
        return true;
      }
    } catch (e: any) {
      console.error('[DL] CapFS+Share threw:', e?.message || e);
    }
  }

  if (onMobile) {
    tried.push('WebShare');
    try {
      const r = await tryWebShareAPI(blob, fileName, type);
      if (r) {
        console.log('[DL] === SUCCESS via WebShare ===');
        return true;
      }
    } catch (e: any) {
      console.error('[DL] WebShare threw:', e?.message || e);
    }

    tried.push('ServerProxy');
    try {
      const r = await tryServerProxyDownload(blob, fileName, type);
      if (r) {
        console.log('[DL] === SUCCESS via ServerProxy (iframe) ===');
        return true;
      }
    } catch (e: any) {
      console.error('[DL] ServerProxy threw:', e?.message || e);
    }

    console.error('[DL] === ALL MOBILE METHODS FAILED ===', tried);
    return false;
  }

  if (hasAndroidBridge()) {
    try {
      const base64 = await blobToBase64(blob);
      if (window.Android?.downloadBase64File) { window.Android.downloadBase64File(base64, fileName, type); return true; }
      if (window.Android?.downloadFile) { window.Android.downloadFile(base64, fileName, type); return true; }
      if (window.Android?.shareFile) { window.Android.shareFile(base64, fileName, type); return true; }
    } catch (e) { console.error('[DL] AndroidBridge:', e); }
  }

  if (hasIOSBridge()) {
    try {
      const base64 = await blobToBase64(blob);
      window.webkit?.messageHandlers?.downloadFile?.postMessage({ base64, fileName, mimeType: type });
      return true;
    } catch (e) { console.error('[DL] iOSBridge:', e); }
  }

  console.log('[DL] Using browser download');
  return downloadForBrowser(blob, fileName);
}

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
    isWebView: isMobileWebView(),
    isCapacitor: isCapacitorNative(),
    hasNativeBridge: hasAndroidBridge() || hasIOSBridge(),
    hasShareAPI: hasShareAPI(),
    recommendedMethod: isCapacitorNative() ? 'filesharer' : isMobileWebView() ? 'webshare' : 'browser',
  };
}
