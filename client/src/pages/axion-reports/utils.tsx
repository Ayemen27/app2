import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';

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

export async function secureDownloadExport(type: string, fmt: string, params: Record<string, string>, toast: any) {
  const url = buildExportUrl(type, fmt, params);
  let phase = 'fetch';
  try {
    const response = await fetch(url, {
      credentials: getFetchCredentials(),
      headers: {
        ...getClientPlatformHeader(),
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      phase = 'server';
      let errorDetail = '';
      try {
        const errBody = await response.text();
        const parsed = JSON.parse(errBody);
        errorDetail = parsed.error || parsed.message || '';
      } catch {
        errorDetail = '';
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً');
      }
      if (response.status === 404) {
        throw new Error('البيانات المطلوبة غير موجودة');
      }
      throw new Error(errorDetail || `خطأ من الخادم (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      phase = 'server';
      const errBody = await response.json();
      if (errBody.success === false) {
        throw new Error(errBody.error || 'فشل إنشاء التقرير');
      }
      throw new Error('استجابة غير متوقعة من الخادم');
    }

    const contentDisposition = response.headers.get('content-disposition');
    let fileName = `report-${type}.${fmt}`;
    if (contentDisposition) {
      const starMatch = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''(.+?)(?:;|$)/);
      if (starMatch && starMatch[1]) {
        try {
          fileName = decodeURIComponent(starMatch[1].trim());
        } catch {
          fileName = starMatch[1].trim();
        }
      } else {
        const plainMatch = contentDisposition.match(/filename\s*=\s*"?([^";\n]+)"?/);
        if (plainMatch && plainMatch[1]) {
          fileName = plainMatch[1].trim();
        }
      }
    }

    phase = 'download';
    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('الخادم أرجع ملفاً فارغاً');
    }

    const { downloadFile } = await import('@/utils/webview-download');
    await downloadFile(blob, fileName);
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
}: {
  headers: string[];
  rows: (string | number)[][];
  testId: string;
  rowClassNames?: (string | undefined)[];
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
        </tbody>
      </table>
    </div>
  );
}
