import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, AlertTriangle, Skull, Loader2, WifiOff, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAllSyncQueueItems, getDLQCount } from "@/offline/offline";

export type SyncStatus = "synced" | "pending" | "in-flight" | "failed" | "conflict" | "dlq" | "offline";

const STATUS_CONFIG: Record<SyncStatus, { label: string; color: string; icon: any; bg: string }> = {
  synced: { label: "متزامن", color: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900" },
  pending: { label: "بانتظار المزامنة", color: "text-amber-700 dark:text-amber-300", icon: Clock, bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900" },
  "in-flight": { label: "جاري الإرسال", color: "text-blue-700 dark:text-blue-300", icon: Loader2, bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900" },
  failed: { label: "فشل المزامنة", color: "text-red-700 dark:text-red-300", icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900" },
  conflict: { label: "تعارض", color: "text-orange-700 dark:text-orange-300", icon: AlertTriangle, bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900" },
  dlq: { label: "فشل نهائي", color: "text-red-800 dark:text-red-200", icon: Skull, bg: "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800" },
  offline: { label: "غير متصل", color: "text-slate-600 dark:text-slate-400", icon: WifiOff, bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
};

interface SyncStatusBadgeProps {
  status: SyncStatus;
  showLabel?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * شارة حالة المزامنة لسجل واحد - عرض ثابت
 */
export function SyncStatusBadge({ status, showLabel = true, size = "sm", className }: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const sizeCls = size === "xs" ? "h-2.5 w-2.5 text-[9px] px-1" : size === "md" ? "h-4 w-4 text-xs px-2" : "h-3 w-3 text-[10px] px-1.5";
  const isAnimated = status === "in-flight";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        config.bg,
        config.color,
        sizeCls,
        className
      )}
      data-testid={`sync-status-${status}`}
      title={config.label}
    >
      <Icon className={cn(size === "xs" ? "h-2.5 w-2.5" : size === "md" ? "h-4 w-4" : "h-3 w-3", isAnimated && "animate-spin")} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface RecordSyncBadgeProps {
  recordId: string;
  endpoint?: string;
  showLabel?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * شارة حالة المزامنة لسجل بناء على فحص الطابور المحلي
 * تبحث عن السجل في طابور IndexedDB وتُرجع حالته
 */
export function RecordSyncBadge({ recordId, endpoint, showLabel = true, size = "sm", className }: RecordSyncBadgeProps) {
  const [status, setStatus] = useState<SyncStatus>("synced");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const [queue, dlqCount] = await Promise.all([
          getAllSyncQueueItems(),
          getDLQCount(),
        ]);
        if (cancelled) return;

        // فحص DLQ أولاً - الأكثر خطورة
        if (dlqCount > 0) {
          // ملاحظة: DLQ يحتوي على originalId
          const dlqItems = await import("@/offline/offline").then((m) => m.getDLQItems());
          if (cancelled) return;
          const inDLQ = dlqItems.some(
            (i) => (i.payload?.id === recordId || i.originalId === recordId) &&
              (!endpoint || i.endpoint.includes(endpoint))
          );
          if (inDLQ) {
            setStatus("dlq");
            return;
          }
        }

        const matching = queue.filter(
          (i) => (i.payload?.id === recordId) && (!endpoint || i.endpoint.includes(endpoint))
        );

        if (matching.length === 0) {
          setStatus("synced");
        } else {
          // الأولوية: conflict > failed > in-flight > pending
          const priority: SyncStatus[] = ["conflict", "failed", "in-flight", "pending"];
          for (const p of priority) {
            if (matching.some((i) => i.status === p)) {
              setStatus(p);
              return;
            }
          }
          setStatus("pending");
        }
      } catch {
        if (!cancelled) setStatus("synced");
      }
    };

    check();
    const interval = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [recordId, endpoint]);

  if (status === "synced") return null; // لا نُظهر شيئاً للمتزامن - أنظف

  return <SyncStatusBadge status={status} showLabel={showLabel} size={size} className={className} />;
}

/**
 * شارة عامة تعرض إحصائيات الطابور كاملاً (للهيدر)
 */
export function GlobalSyncStatusBadge({ className }: { className?: string }) {
  const [counts, setCounts] = useState({ pending: 0, failed: 0, dlq: 0 });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const [queue, dlq] = await Promise.all([
          getAllSyncQueueItems(),
          getDLQCount(),
        ]);
        if (cancelled) return;
        const pending = queue.filter((i) => i.status === "pending" || i.status === "in-flight").length;
        const failed = queue.filter((i) => i.status === "failed" || i.status === "conflict").length;
        setCounts({ pending, failed, dlq });
      } catch {
        // تجاهل
      }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const total = counts.pending + counts.failed + counts.dlq;
  if (total === 0) {
    return (
      <Badge variant="outline" className={cn("gap-1 text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30", className)} data-testid="badge-sync-global-clean">
        <CheckCircle2 className="h-3 w-3" />
        متزامن
      </Badge>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {counts.pending > 0 && (
        <Badge variant="outline" className="gap-1 text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-[10px]" data-testid="badge-sync-pending">
          <Clock className="h-2.5 w-2.5" />
          {counts.pending}
        </Badge>
      )}
      {counts.failed > 0 && (
        <Badge variant="outline" className="gap-1 text-red-700 border-red-200 bg-red-50 dark:bg-red-950/30 text-[10px]" data-testid="badge-sync-failed">
          <AlertTriangle className="h-2.5 w-2.5" />
          {counts.failed}
        </Badge>
      )}
      {counts.dlq > 0 && (
        <Badge variant="outline" className="gap-1 text-red-800 border-red-300 bg-red-100 dark:bg-red-950/50 text-[10px]" data-testid="badge-sync-dlq">
          <Skull className="h-2.5 w-2.5" />
          {counts.dlq}
        </Badge>
      )}
    </div>
  );
}
