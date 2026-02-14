import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 30000);

    console.log('[Download] Server proxy download triggered via iframe');
    return true;
  } catch (error) {
    console.error('[Download] Server proxy failed:', error);
    return false;
  }
}

async function downloadViaCapacitor(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');

    let writeResult;
    try {
      writeResult = await Filesystem.writeFile({
        path: `AXION/${sanitizedName}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      try {
        writeResult = await Filesystem.writeFile({
          path: `Download/AXION/${sanitizedName}`,
          data: base64Data,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
      } catch {
        writeResult = await Filesystem.writeFile({
          path: sanitizedName,
          data: base64Data,
          directory: Directory.Cache,
        });
      }
    }

    const fileUri = writeResult.uri;
    console.log('[Download] Capacitor: file written to', fileUri);

    try {
      await Share.share({
        title: fileName,
        url: fileUri,
        dialogTitle: fileName,
      });
      console.log('[Download] Capacitor Share completed');
    } catch (shareError) {
      const msg = (shareError as Error).message || '';
      if (msg.includes('canceled') || msg.includes('dismissed')) {
        console.log('[Download] User cancelled share - file still saved');
      } else {
        console.warn('[Download] Share failed, but file is saved at:', fileUri);
      }
    }

    return true;
  } catch (error) {
    console.error('[Download] Capacitor download failed:', error);
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
  });

  try {
    if (isCapacitorNative()) {
      console.log('[Download] Using Capacitor Filesystem + Share');
      const result = await downloadViaCapacitor(blob, fileName, actualMimeType);
      if (result) return true;
      console.log('[Download] Capacitor failed, trying server proxy');
    }

    if (isMobileWebView()) {
      console.log('[Download] Mobile WebView detected - using server proxy');
      const proxyResult = await downloadViaServerProxy(blob, fileName, actualMimeType);
      if (proxyResult) return true;
      console.log('[Download] Server proxy failed, trying other methods');
    }

    if (hasAndroidBridge()) {
      console.log('[Download] Using Android Bridge');
      return await downloadViaAndroidBridge(blob, fileName, actualMimeType);
    }

    if (hasIOSBridge()) {
      console.log('[Download] Using iOS Bridge');
      return await downloadViaIOSBridge(blob, fileName, actualMimeType);
    }

    if (isMobileWebView() && hasShareAPI()) {
      console.log('[Download] Using Share API');
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
      await navigator.share({
        files: [file],
        title: fileName
      });
      return true;
    }
    
    return false;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return true;
    }
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
  if (isWebView) {
    recommendedMethod = 'server-proxy';
  } else if (hasNativeBridge) {
    recommendedMethod = 'native-bridge';
  } else if (isWebView && shareAPI) {
    recommendedMethod = 'share-api';
  }
  
  return {
    isWebView,
    hasNativeBridge,
    hasShareAPI: shareAPI,
    recommendedMethod
  };
}
