import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FileSharer } from '@byteowls/capacitor-filesharer';

export function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isAndroidWebView(): boolean {
  if (isCapacitorNative()) return true;
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('wv') ||
    userAgent.includes('webview') ||
    (userAgent.includes('android') && !userAgent.includes('chrome/')) ||
    (userAgent.includes('android') && userAgent.includes('version/'))
  );
}

export function isIOSWebView(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    (userAgent.includes('iphone') || userAgent.includes('ipad')) &&
    !userAgent.includes('safari/')
  );
}

export function isMobileWebView(): boolean {
  return isCapacitorNative() || isAndroidWebView() || isIOSWebView();
}

export function hasAndroidBridge(): boolean {
  return !!(
    window.Android?.downloadBase64File ||
    window.Android?.downloadFile ||
    window.Android?.shareFile
  );
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
  const mimeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'csv': 'text/csv',
    'html': 'text/html',
    'json': 'application/json',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
  };
  return ext ? (mimeMap[ext] || fallback) : fallback;
}

async function downloadViaFileSharer(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');
    const contentType = getMimeType(sanitizedName, mimeType);

    console.log('[Download] FileSharer: sharing', sanitizedName, 'type:', contentType, 'size:', blob.size);

    await FileSharer.share({
      filename: sanitizedName,
      contentType: contentType,
      base64Data: base64Data,
    });

    console.log('[Download] FileSharer: share dialog completed');
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error) || '';
    if (msg.includes('cancel') || msg.includes('Cancel') || msg.includes('dismiss') || msg.includes('USER_CANCELLED')) {
      console.log('[Download] FileSharer: user cancelled - file was prepared');
      return true;
    }
    console.error('[Download] FileSharer failed:', error);
    return false;
  }
}

async function downloadViaCapacitorFilesystemShare(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');

    console.log('[Download] Capacitor FS+Share: writing', sanitizedName);

    const writeResult = await Filesystem.writeFile({
      path: sanitizedName,
      data: base64Data,
      directory: Directory.Cache,
    });

    console.log('[Download] Capacitor FS: written to', writeResult.uri);

    const uriResult = await Filesystem.getUri({
      directory: Directory.Cache,
      path: sanitizedName,
    });

    console.log('[Download] Capacitor FS: getUri =', uriResult.uri);

    await Share.share({
      title: fileName,
      url: uriResult.uri,
      dialogTitle: `حفظ أو مشاركة: ${fileName}`,
    });

    console.log('[Download] Capacitor Share: dialog shown');
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error) || '';
    if (msg.includes('canceled') || msg.includes('dismissed') || msg.includes('cancel')) {
      console.log('[Download] User cancelled share - file still saved');
      return true;
    }
    console.error('[Download] Capacitor FS+Share failed:', error);
    return false;
  }
}

async function downloadViaServerProxy(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);

    const response = await fetch('/api/temp-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ base64Data, fileName, mimeType }),
    });

    if (!response.ok) {
      console.error('[Download] Server proxy upload failed:', response.status);
      return false;
    }

    const result = await response.json();
    if (!result.success || !result.downloadUrl) {
      console.error('[Download] Server proxy returned invalid response');
      return false;
    }

    const downloadUrl = result.downloadUrl;
    console.log('[Download] Server proxy URL:', downloadUrl);

    if (isCapacitorNative()) {
      try {
        const dlResponse = await fetch(downloadUrl);
        if (!dlResponse.ok) return false;
        const dlBlob = await dlResponse.blob();
        const fileSharerResult = await downloadViaFileSharer(dlBlob, fileName, mimeType);
        if (fileSharerResult) return true;
      } catch (capErr) {
        console.error('[Download] Capacitor from proxy failed:', capErr);
      }
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('[Download] Server proxy failed:', error);
    return false;
  }
}

export async function downloadFile(
  blob: Blob,
  fileName: string,
  mimeType?: string
): Promise<boolean> {
  const actualMimeType = mimeType || blob.type || 'application/octet-stream';

  console.log('[Download] Starting:', {
    fileName,
    mimeType: actualMimeType,
    size: blob.size,
    isCapacitor: isCapacitorNative(),
    isWebView: isMobileWebView(),
    platform: Capacitor.getPlatform?.() || 'unknown',
  });

  try {
    if (isCapacitorNative()) {
      console.log('[Download] Method 1: FileSharer (native share dialog)');
      const fileSharerResult = await downloadViaFileSharer(blob, fileName, actualMimeType);
      if (fileSharerResult) return true;

      console.log('[Download] Method 2: Capacitor Filesystem + Share');
      const capResult = await downloadViaCapacitorFilesystemShare(blob, fileName, actualMimeType);
      if (capResult) return true;

      console.log('[Download] Method 3: Server proxy');
      const proxyResult = await downloadViaServerProxy(blob, fileName, actualMimeType);
      if (proxyResult) return true;

      console.log('[Download] All Capacitor methods failed, trying browser');
      return downloadForBrowser(blob, fileName);
    }

    if (isMobileWebView()) {
      console.log('[Download] Mobile WebView - using server proxy');
      const proxyResult = await downloadViaServerProxy(blob, fileName, actualMimeType);
      if (proxyResult) return true;
    }

    if (hasAndroidBridge()) {
      console.log('[Download] Using Android Bridge');
      return await downloadViaAndroidBridge(blob, fileName, actualMimeType);
    }

    if (hasIOSBridge()) {
      console.log('[Download] Using iOS Bridge');
      return await downloadViaIOSBridge(blob, fileName, actualMimeType);
    }

    if (hasShareAPI()) {
      console.log('[Download] Using Web Share API');
      return await downloadViaShareAPI(blob, fileName, actualMimeType);
    }

    console.log('[Download] Using browser download');
    return downloadForBrowser(blob, fileName);
  } catch (error) {
    console.error('[Download] Error:', error);
    return downloadForBrowser(blob, fileName);
  }
}

async function downloadViaAndroidBridge(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64 = await blobToBase64(blob);
    if (window.Android?.downloadBase64File) {
      window.Android.downloadBase64File(base64, fileName, mimeType);
      return true;
    }
    if (window.Android?.downloadFile) {
      window.Android.downloadFile(base64, fileName, mimeType);
      return true;
    }
    if (window.Android?.shareFile) {
      window.Android.shareFile(base64, fileName, mimeType);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Download] Android Bridge failed:', error);
    return false;
  }
}

async function downloadViaIOSBridge(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64 = await blobToBase64(blob);
    if (window.webkit?.messageHandlers?.downloadFile) {
      window.webkit.messageHandlers.downloadFile.postMessage({
        base64,
        fileName,
        mimeType
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Download] iOS Bridge failed:', error);
    return false;
  }
}

async function downloadViaShareAPI(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: mimeType });
    const shareData = { files: [file] };
    if (typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      await navigator.share({ files: [file], title: fileName });
      return true;
    }
    return false;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return true;
    console.error('[Download] Share API failed:', error);
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
    console.error('[Download] Browser download failed:', error);
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadExcelFile(
  buffer: ArrayBuffer | Buffer,
  fileName: string
): Promise<boolean> {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  return downloadFile(blob, fileName);
}

export async function downloadPdfFile(
  buffer: ArrayBuffer | Buffer,
  fileName: string
): Promise<boolean> {
  const blob = new Blob([buffer], {
    type: 'application/pdf'
  });
  return downloadFile(blob, fileName);
}

export function getDownloadCapabilities(): {
  isWebView: boolean;
  hasNativeBridge: boolean;
  hasShareAPI: boolean;
  recommendedMethod: string;
} {
  const isWebView = isMobileWebView();
  const hasNativeBridge = hasAndroidBridge() || hasIOSBridge();
  const shareAPI = hasShareAPI();

  let recommendedMethod = 'browser';
  if (isCapacitorNative()) {
    recommendedMethod = 'filesharer';
  } else if (hasNativeBridge) {
    recommendedMethod = 'native-bridge';
  } else if (isWebView) {
    recommendedMethod = 'server-proxy';
  } else if (shareAPI) {
    recommendedMethod = 'share-api';
  }

  return {
    isWebView,
    hasNativeBridge,
    hasShareAPI: shareAPI,
    recommendedMethod
  };
}
