/**
 * أداة تحميل الملفات المتوافقة مع Android WebView
 * WebView-Compatible File Download Utility
 */

export function isAndroidWebView(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('wv') ||
    userAgent.includes('webview') ||
    (userAgent.includes('android') && !userAgent.includes('chrome/'))
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
  return isAndroidWebView() || isIOSWebView();
}

export async function downloadFile(
  blob: Blob,
  fileName: string,
  mimeType?: string
): Promise<boolean> {
  try {
    if (isMobileWebView()) {
      return await downloadForWebView(blob, fileName, mimeType);
    } else {
      return downloadForBrowser(blob, fileName);
    }
  } catch (error) {
    console.error('❌ [Download] Error:', error);
    return downloadForBrowser(blob, fileName);
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
    console.error('❌ [Download] Browser download failed:', error);
    return false;
  }
}

async function downloadForWebView(
  blob: Blob,
  fileName: string,
  mimeType?: string
): Promise<boolean> {
  try {
    const base64 = await blobToBase64(blob);
    const dataUri = `data:${mimeType || blob.type};base64,${base64}`;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    if (iframe.contentWindow) {
      iframe.contentWindow.location.href = dataUri;
    }
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);

    const newWindow = window.open(dataUri, '_blank');
    if (newWindow) {
      return true;
    }

    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('❌ [Download] WebView download failed, trying fallback:', error);
    return downloadForBrowser(blob, fileName);
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
