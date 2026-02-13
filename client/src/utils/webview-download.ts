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

async function downloadViaCapacitor(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');

    const writeResult = await Filesystem.writeFile({
      path: sanitizedName,
      data: base64Data,
      directory: Directory.Cache,
    });

    const fileUri = writeResult.uri;
    console.log('[Download] Capacitor: file written to', fileUri);

    await Share.share({
      title: fileName,
      url: fileUri,
      dialogTitle: fileName,
    });

    console.log('[Download] Capacitor Share completed');
    return true;
  } catch (error) {
    if ((error as Error).message?.includes('canceled') || (error as Error).message?.includes('dismissed')) {
      console.log('[Download] User cancelled share');
      return true;
    }
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
      console.log('[Download] Capacitor failed, trying fallbacks');
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

    if (isMobileWebView()) {
      console.log('[Download] WebView without bridge - trying alternatives');
      return await downloadForWebView(blob, fileName, actualMimeType);
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
      console.log('✅ [Download] تم إرسال الملف عبر downloadBase64File');
      return true;
    }
    
    if (window.Android?.downloadFile) {
      window.Android.downloadFile(base64, fileName, mimeType);
      console.log('✅ [Download] تم إرسال الملف عبر downloadFile');
      return true;
    }
    
    if (window.Android?.shareFile) {
      window.Android.shareFile(base64, fileName, mimeType);
      console.log('✅ [Download] تم مشاركة الملف عبر shareFile');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ [Download] فشل Android Bridge:', error);
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
      console.log('✅ [Download] تم إرسال الملف عبر iOS Bridge');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ [Download] فشل iOS Bridge:', error);
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
      console.log('✅ [Download] تم مشاركة الملف بنجاح');
      return true;
    }
    
    console.log('⚠️ [Download] Share API لا يدعم هذا النوع من الملفات');
    return false;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('ℹ️ [Download] تم إلغاء المشاركة من قبل المستخدم');
      return true;
    }
    console.error('❌ [Download] فشل Share API:', error);
    return false;
  }
}

async function downloadViaServer(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  try {
    const base64 = await blobToBase64(blob);
    
    const response = await fetch('/api/download-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({
        base64,
        fileName,
        mimeType
      })
    });
    
    if (!response.ok) {
      console.error('❌ [Download] Server download failed:', response.status);
      return false;
    }
    
    const downloadBlob = await response.blob();
    const url = URL.createObjectURL(downloadBlob);
    
    window.location.href = url;
    
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    
    console.log('✅ [Download] تم التنزيل عبر السيرفر');
    return true;
  } catch (error) {
    console.error('❌ [Download] فشل تنزيل السيرفر:', error);
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
    console.log('✅ [Download] تم التنزيل عبر المتصفح');
    return true;
  } catch (error) {
    console.error('❌ [Download] فشل تنزيل المتصفح:', error);
    return false;
  }
}

async function downloadForWebView(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  console.log('📱 [Download] محاولة التنزيل في WebView...');
  
  const serverResult = await downloadViaServer(blob, fileName, mimeType);
  if (serverResult) return true;
  
  const shareResult = await downloadViaShareAPI(blob, fileName, mimeType);
  if (shareResult) return true;

  try {
    const base64 = await blobToBase64(blob);
    const dataUri = `data:${mimeType};base64,${base64}`;
    
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    link.target = '_self';
    link.style.display = 'none';
    document.body.appendChild(link);
    
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    link.dispatchEvent(clickEvent);
    
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
    
    console.log('✅ [Download] تم إرسال طلب التنزيل');
    return true;
  } catch (error) {
    console.error('❌ [Download] فشل تنزيل WebView:', error);
  }

  console.log('[Download] WebView data-URI fallback attempted, trying browser download');
  return downloadForBrowser(blob, fileName);
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
  if (hasNativeBridge) {
    recommendedMethod = 'native-bridge';
  } else if (isWebView && shareAPI) {
    recommendedMethod = 'share-api';
  } else if (isWebView) {
    recommendedMethod = 'webview-fallback';
  }
  
  return {
    isWebView,
    hasNativeBridge,
    hasShareAPI: shareAPI,
    recommendedMethod
  };
}
