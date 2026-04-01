import { Badge } from "@/components/ui/badge";

export async function pollJob(jobId: string, intervalMs = 2000, timeoutMs = 600000): Promise<any> {
  const start = Date.now();
  let consecutiveErrors = 0;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`/api/wa-import/job/${jobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = await res.json();
      consecutiveErrors = 0;
      if (job.status === 'completed') return job.result;
      if (job.status === 'failed') throw new Error(job.error || 'Job failed');
    } catch (err: any) {
      if (err.message?.includes('Job failed')) throw err;
      consecutiveErrors++;
      if (consecutiveErrors > 10) throw new Error('فقد الاتصال بالسيرفر');
    }
    const backoff = Math.min(intervalMs * (1 + consecutiveErrors * 0.5), 10000);
    await new Promise(r => setTimeout(r, backoff));
  }
  throw new Error('انتهت مهلة الانتظار');
}

export function confidenceColor(c: number): string {
  if (c >= 0.9) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (c >= 0.7) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

export function matchStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    exact_match: { label: "مطابق", variant: "secondary" },
    near_match: { label: "قريب", variant: "outline" },
    conflict: { label: "تعارض", variant: "destructive" },
    new_entry: { label: "جديد", variant: "default" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant} data-testid={`badge-match-${status}`}>{info.label}</Badge>;
}

export function statusLabel(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    completed: { label: "مكتمل", variant: "default" },
    pending: { label: "قيد الانتظار", variant: "secondary" },
    processing: { label: "جاري المعالجة", variant: "outline" },
    failed: { label: "فشل", variant: "destructive" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
