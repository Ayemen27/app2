import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';
import { ENV } from '@/lib/env';

export const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

export function safeFormatDate(dateStr: string | null | undefined, fmt: string, options?: { locale?: any }): string {
  if (!dateStr || dateStr === '-' || dateStr.length < 8) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return format(d, fmt, options);
  } catch {
    return '-';
  }
}

export function buildExportUrl(type: string, fmt: string, params: Record<string, string>): string {
  const searchParams = new URLSearchParams({ format: fmt, ...params });
  return `/api/reports/v2/export/${type}?${searchParams.toString()}`;
}

function sanitizeForFileName(s: string): string {
  return (s || '')
    .replace(/[\/\\:*?"<>|\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildArabicReportFileName(opts: {
  type: string;
  fmt: string;
  projectName?: string;
  workerName?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  template?: string;
}): string {
  const { type, fmt, projectName, workerName, date, dateFrom, dateTo, template } = opts;
  const proj = sanitizeForFileName(projectName || 'مشروع');
  const worker = sanitizeForFileName(workerName || 'عامل');
  let base = '';
  switch (type) {
    case 'daily':
      base = template === '2'
        ? `كشف-مصروفات-يومي-${proj}-${date || ''}`
        : `التقرير-اليومي-${proj}-${date || ''}`;
      break;
    case 'daily-range':
      base = `التقارير-اليومية-${proj}-${dateFrom || ''}-${dateTo || ''}`;
      break;
    case 'worker-statement':
      base = `كشف-حساب-عامل-${worker}${dateFrom ? '-' + dateFrom : ''}${dateTo ? '-' + dateTo : ''}`;
      break;
    case 'period-final':
      base = `التقرير-الختامي-${proj}-${dateFrom || ''}-${dateTo || ''}`;
      break;
    case 'multi-project-final':
      base = `تقرير-متعدد-المشاريع-${proj}-${dateFrom || ''}-${dateTo || ''}`;
      break;
    case 'multi-project-compare':
      base = `مقارنة-المشاريع-${proj}-${dateFrom || ''}-${dateTo || ''}`;
      break;
    case 'project-comprehensive':
      base = `تقرير-شامل-${proj}-${dateFrom || ''}-${dateTo || ''}`;
      break;
    default:
      base = `تقرير-${type}`;
  }
  base = base.replace(/-+$/g, '').replace(/-{2,}/g, '-');
  return `${base}.${fmt}`;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const len = byteChars.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  try {
    const base = ENV.apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!base) return url;
    if (url.startsWith('/api/')) {
      const baseClean = base.replace(/\/+$/, '').replace(/\/api$/, '');
      return baseClean + url;
    }
    if (url.startsWith('/')) {
      const baseClean = base.replace(/\/+$/, '').replace(/\/api$/, '');
      return baseClean + url;
    }
    return base.replace(/\/+$/, '') + '/' + url;
  } catch {
    return url;
  }
}

async function nativeBinaryDownload(url: string, headers: Record<string, string>): Promise<{ blob: Blob; status: number; contentType: string; contentDisposition: string }> {
  const { CapacitorHttp } = await import('@capacitor/core');
  const absoluteUrl = toAbsoluteUrl(url);
  const res: any = await CapacitorHttp.request({
    method: 'GET',
    url: absoluteUrl,
    headers,
    responseType: 'blob',
    readTimeout: 120000,
    connectTimeout: 30000,
  });

  const respHeaders: Record<string, string> = {};
  if (res.headers && typeof res.headers === 'object') {
    for (const [k, v] of Object.entries(res.headers)) {
      respHeaders[k.toLowerCase()] = String(v);
    }
  }
  const contentType = respHeaders['content-type'] || '';
  const contentDisposition = respHeaders['content-disposition'] || '';
  const status: number = res.status || 0;

  let blob: Blob;
  const data = res.data;
  if (data instanceof Blob) {
    blob = data;
  } else if (typeof data === 'string') {
    if (contentType.includes('json') || contentType.includes('text')) {
      blob = new Blob([data], { type: contentType || 'text/plain' });
    } else {
      try {
        blob = base64ToBlob(data, contentType || 'application/octet-stream');
      } catch {
        blob = new Blob([data], { type: contentType || 'application/octet-stream' });
      }
    }
  } else if (data && typeof data === 'object') {
    blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  } else {
    blob = new Blob([], { type: contentType || 'application/octet-stream' });
  }

  return { blob, status, contentType, contentDisposition };
}

function webBinaryDownload(url: string, headers: Record<string, string>, withCredentials: boolean): Promise<{ blob: Blob; status: number; contentType: string; contentDisposition: string }> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.withCredentials = withCredentials;
      for (const [k, v] of Object.entries(headers || {})) {
        try { xhr.setRequestHeader(k, v); } catch {}
      }
      xhr.onload = () => {
        const contentType = xhr.getResponseHeader('content-type') || '';
        const contentDisposition = xhr.getResponseHeader('content-disposition') || '';
        const blob: Blob = xhr.response instanceof Blob ? xhr.response : new Blob([xhr.response || '']);
        resolve({ blob, status: xhr.status, contentType, contentDisposition });
      };
      xhr.onerror = () => reject(new Error('فشل الاتصال بالخادم'));
      xhr.ontimeout = () => reject(new Error('انتهت مهلة الاتصال بالخادم'));
      xhr.timeout = 120000;
      xhr.send();
    } catch (e) {
      reject(e);
    }
  });
}

async function downloadBinary(url: string, headers: Record<string, string>, withCredentials: boolean) {
  let isNative = false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNative = Capacitor.isNativePlatform();
  } catch {}
  if (isNative) return nativeBinaryDownload(url, headers);
  return webBinaryDownload(url, headers, withCredentials);
}

async function blobToText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('فشل قراءة الرد'));
    r.readAsText(blob, 'utf-8');
  });
}

export async function secureDownloadExport(
  type: string,
  fmt: string,
  params: Record<string, string>,
  toast: any,
  suggestedFileName?: string,
): Promise<void> {
  const url = buildExportUrl(type, fmt, params);
  let phase = 'fetch';
  try {
    const headers: Record<string, string> = {
      ...getClientPlatformHeader(),
      ...getAuthHeaders(),
    };
    const withCredentials = getFetchCredentials() !== 'omit';

    const { blob: rawBlob, status, contentType, contentDisposition } = await downloadBinary(url, headers, withCredentials);

    if (status >= 400) {
      phase = 'server';
      let errorDetail = '';
      try {
        const errText = await blobToText(rawBlob);
        const parsed = JSON.parse(errText);
        errorDetail = parsed.error || parsed.message || '';
      } catch {
        errorDetail = '';
      }
      if (status === 401 || status === 403) {
        throw new Error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً');
      }
      if (status === 404) {
        throw new Error('البيانات المطلوبة غير موجودة');
      }
      throw new Error(errorDetail || `خطأ من الخادم (${status})`);
    }

    if (contentType.includes('application/json')) {
      phase = 'server';
      const errText = await blobToText(rawBlob);
      try {
        const errBody = JSON.parse(errText);
        if (errBody.success === false) {
          throw new Error(errBody.error || 'فشل إنشاء التقرير');
        }
      } catch (parseErr: any) {
        if (parseErr?.message && !parseErr.message.includes('JSON')) throw parseErr;
      }
      throw new Error('استجابة غير متوقعة من الخادم');
    }

    let fileName = suggestedFileName && suggestedFileName.trim()
      ? suggestedFileName.trim()
      : `report-${type}.${fmt}`;

    if (!suggestedFileName && contentDisposition) {
      const starMatch = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''(.+?)(?:;|$)/);
      if (starMatch && starMatch[1]) {
        try { fileName = decodeURIComponent(starMatch[1].trim()); } catch { fileName = starMatch[1].trim(); }
      } else {
        const plainMatch = contentDisposition.match(/filename\s*=\s*"?([^";\n]+)"?/);
        if (plainMatch && plainMatch[1]) fileName = plainMatch[1].trim();
      }
    }

    phase = 'download';

    const expectedMime = fmt === 'pdf'
      ? 'application/pdf'
      : (fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : (contentType || 'application/octet-stream'));
    const blob = rawBlob.type ? rawBlob : new Blob([rawBlob], { type: expectedMime });

    if (blob.size === 0) {
      throw new Error('الخادم أرجع ملفاً فارغاً');
    }

    const { downloadFile } = await import('@/utils/webview-download');
    await downloadFile(blob, fileName, expectedMime);
  } catch (error: any) {
    const defaultMessages: Record<string, string> = {
      fetch: 'فشل الاتصال بالخادم - تحقق من الإنترنت',
      server: 'فشل إنشاء التقرير في الخادم',
      download: 'تم إنشاء التقرير لكن فشل تحميل الملف',
    };
    toast({
      title: 'خطأ في التصدير',
      description: error?.message || defaultMessages[phase] || 'فشل تحميل الملف',
      variant: 'destructive',
    });
  }
}

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="loading-spinner">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message || "جاري التحميل..."}</p>
    </div>
  );
}

export function EmptyState({ message, icon: Icon }: { message: string; icon?: typeof AlertCircle }) {
  const EmptyIcon = Icon || AlertCircle;
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="empty-state">
      <EmptyIcon className="h-12 w-12 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}

export function ReportTable({
  headers,
  rows,
  testId,
  rowClassNames,
  totalsRow,
}: {
  headers: string[];
  rows: (string | number)[][];
  testId: string;
  rowClassNames?: (string | undefined)[];
  totalsRow?: (string | number | null)[];
}) {
  if (!rows || rows.length === 0) {
    return <EmptyState message="لا توجد بيانات لعرضها" />;
  }
  return (
    <div className="overflow-x-auto rounded-md border" data-testid={testId}>
      <table className="w-full text-right border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h, i) => (
              <th key={i} className="p-3 font-bold text-muted-foreground border-b whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={rowClassNames?.[i] || (i % 2 === 0 ? "bg-background" : "bg-muted/20")}
            >
              {row.map((cell, j) => (
                <td key={j} className="p-3 border-b whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {totalsRow && (
            <tr className="bg-muted/60 font-bold border-t-2 border-border">
              {totalsRow.map((cell, j) => (
                <td key={j} className="p-3 whitespace-nowrap">
                  {cell ?? ""}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
