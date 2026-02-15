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

async function tryFileSharer(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const { FileSharer } = await import('@byteowls/capacitor-filesharer');
    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');
    const contentType = getMimeType(sanitizedName, mimeType);

    console.log('[DL] FileSharer: start', sanitizedName, contentType, blob.size);

    await FileSharer.share({
      filename: sanitizedName,
      contentType: contentType,
      base64Data: base64Data,
    });

    console.log('[DL] FileSharer: OK');
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    console.error('[DL] FileSharer error:', msg);
    if (msg.includes('cancel') || msg.includes('Cancel') || msg.includes('dismiss') || msg.includes('USER_CANCELLED')) {
      return true;
    }
    return false;
  }
}

async function tryCapacitorFsShare(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');

    console.log('[DL] CapFS: writing', sanitizedName);

    await Filesystem.writeFile({
      path: sanitizedName,
      data: base64Data,
      directory: Directory.Cache,
    });

    const uriResult = await Filesystem.getUri({
      directory: Directory.Cache,
      path: sanitizedName,
    });

    console.log('[DL] CapFS: uri =', uriResult.uri);

    await Share.share({
      title: fileName,
      url: uriResult.uri,
      dialogTitle: `مشاركة: ${fileName}`,
    });

    console.log('[DL] CapShare: OK');
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    console.error('[DL] CapFS+Share error:', msg);
    if (msg.includes('canceled') || msg.includes('dismissed') || msg.includes('cancel')) {
      return true;
    }
    return false;
  }
}

async function tryWebShareAPI(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      return false;
    }
    const file = new File([blob], fileName, { type: mimeType });
    const shareData = { files: [file] };
    if (!navigator.canShare(shareData)) {
      console.log('[DL] WebShare: canShare returned false');
      return false;
    }
    await navigator.share({ files: [file], title: fileName });
    console.log('[DL] WebShare: OK');
    return true;
  } catch (err: any) {
    if (err?.name === 'AbortError') return true;
    console.error('[DL] WebShare error:', err);
    return false;
  }
}

async function tryServerProxy(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    const response = await fetch('/api/temp-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ base64Data, fileName, mimeType }),
    });

    if (!response.ok) {
      console.error('[DL] ServerProxy: upload failed', response.status);
      return false;
    }

    const result = await response.json();
    if (!result.success || !result.downloadUrl) {
      console.error('[DL] ServerProxy: bad response');
      return false;
    }

    console.log('[DL] ServerProxy: URL =', result.downloadUrl);

    if (isMobileWebView()) {
      try {
        const dlResponse = await fetch(result.downloadUrl);
        if (!dlResponse.ok) return false;
        const dlBlob = await dlResponse.blob();

        const shareResult = await tryWebShareAPI(dlBlob, fileName, mimeType);
        if (shareResult) return true;
      } catch (e) {
        console.error('[DL] ServerProxy→WebShare failed:', e);
      }
      return false;
    }

    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('[DL] ServerProxy failed:', error);
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
    ua: navigator.userAgent.substring(0, 80),
  });

  const errors: string[] = [];

  if (onCapacitor) {
    console.log('[DL] [1/4] FileSharer...');
    try {
      const r = await tryFileSharer(blob, fileName, type);
      if (r) { console.log('[DL] === SUCCESS via FileSharer ==='); return true; }
    } catch (e: any) { errors.push('FileSharer: ' + (e?.message || e)); }

    console.log('[DL] [2/4] CapFS+Share...');
    try {
      const r = await tryCapacitorFsShare(blob, fileName, type);
      if (r) { console.log('[DL] === SUCCESS via CapFS+Share ==='); return true; }
    } catch (e: any) { errors.push('CapFS: ' + (e?.message || e)); }
  }

  if (onMobile) {
    console.log('[DL] [3/4] WebShare API...');
    try {
      const r = await tryWebShareAPI(blob, fileName, type);
      if (r) { console.log('[DL] === SUCCESS via WebShare ==='); return true; }
    } catch (e: any) { errors.push('WebShare: ' + (e?.message || e)); }

    console.log('[DL] [4/4] ServerProxy...');
    try {
      const r = await tryServerProxy(blob, fileName, type);
      if (r) { console.log('[DL] === SUCCESS via ServerProxy ==='); return true; }
    } catch (e: any) { errors.push('ServerProxy: ' + (e?.message || e)); }

    console.error('[DL] === ALL MOBILE METHODS FAILED ===', errors);
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
    hasNativeBridge: hasAndroidBridge() || hasIOSBridge(),
    hasShareAPI: hasShareAPI(),
    recommendedMethod: isCapacitorNative() ? 'filesharer' : isMobileWebView() ? 'webshare' : 'browser',
  };
}
