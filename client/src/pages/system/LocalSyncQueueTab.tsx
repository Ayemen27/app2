import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Clock, AlertTriangle, Trash2, Send, ChevronDown, ChevronUp,
  Server, Database, Calendar, Zap, AlertCircle, Loader2, Inbox
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getAllSyncQueueItems,
  removeSyncQueueItem,
  cancelSyncQueueItem,
  cancelAllSyncQueueItems,
  retryFailedItem,
  retryAllFailed,
  type SyncQueueItem,
} from "@/offline/offline";
import { syncOfflineData } from "@/offline/sync";

function formatRelative(ts: number): string {
  if (!ts) return "-";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "الآن";
  if (diff < 3600_000) return `منذ ${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return `منذ ${Math.floor(diff / 3600_000)} س`;
  return new Date(ts).toLocaleString("ar-SA");
}

function statusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="secondary" className="text-[10px]"><Clock className="h-2.5 w-2.5 ml-1" />معلق</Badge>;
    case "in-flight": return <Badge variant="default" className="text-[10px]"><Loader2 className="h-2.5 w-2.5 ml-1 animate-spin" />جاري الإرسال</Badge>;
    case "failed": return <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-2.5 w-2.5 ml-1" />فاشل</Badge>;
    case "conflict": return <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-2.5 w-2.5 ml-1" />تعارض</Badge>;
    case "duplicate-resolved": return <Badge variant="outline" className="text-[10px]">مكرر محلول</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  }
}

function actionBadge(action: string) {
  const map: Record<string, { label: string; variant: any }> = {
    create: { label: "إضافة", variant: "success" },
    update: { label: "تعديل", variant: "default" },
    delete: { label: "حذف", variant: "destructive" },
  };
  const info = map[action] || { label: action, variant: "secondary" };
  return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
}

interface QueueItemCardProps {
  item: SyncQueueItem;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  isBusy: boolean;
}

function QueueItemCard({ item, isExpanded, onToggle, onRetry, onCancel, onDelete, isBusy }: QueueItemCardProps) {
  const isFailed = item.status === "failed" || item.status === "conflict";
  const isPending = item.status === "pending";
  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md overflow-hidden" data-testid={`queue-item-${item.id}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {actionBadge(item.action)}
            {statusBadge(item.status)}
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {item.endpoint}
            </span>
            {item.retries > 0 && (
              <Badge variant="outline" className="text-[10px]">
                <RefreshCw className="h-2.5 w-2.5 ml-1" />
                {item.retries} محاولات
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isFailed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
                onClick={() => onRetry(item.id)}
                disabled={isBusy}
                data-testid={`button-retry-${item.id}`}
              >
                <Send className="h-3 w-3 ml-1" />
                إعادة
              </Button>
            )}
            {isPending && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg"
                onClick={() => onCancel(item.id)}
                disabled={isBusy}
                data-testid={`button-cancel-${item.id}`}
              >
                إلغاء
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
              onClick={() => onDelete(item.id)}
              disabled={isBusy}
              data-testid={`button-delete-${item.id}`}
              title="حذف نهائي"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg"
              onClick={onToggle}
              data-testid={`button-toggle-${item.id}`}
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatRelative(item.timestamp)}
          </span>
          {item.lastAttemptAt && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              آخر محاولة: {formatRelative(item.lastAttemptAt)}
            </span>
          )}
          {item.nextRetryAt && item.nextRetryAt > Date.now() && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              المحاولة التالية: {formatRelative(item.nextRetryAt)}
            </span>
          )}
        </div>

        {item.lastError && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/40">
            <p className="text-[11px] text-red-700 dark:text-red-300 break-all">
              <strong>خطأ:</strong> {item.lastError}
            </p>
          </div>
        )}

        {isExpanded && (
          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1">
            <div className="text-[11px]">
              <strong className="text-slate-600 dark:text-slate-400">ID:</strong>{" "}
              <span className="font-mono">{item.id.substring(0, 16)}…</span>
            </div>
            {item.idempotencyKey && (
              <div className="text-[11px]">
                <strong className="text-slate-600 dark:text-slate-400">مفتاح التكرار:</strong>{" "}
                <span className="font-mono">{item.idempotencyKey.substring(0, 30)}…</span>
              </div>
            )}
            <div className="text-[11px]">
              <strong className="text-slate-600 dark:text-slate-400">Payload:</strong>
              <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded text-[10px] overflow-x-auto max-h-40 font-mono">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LocalSyncQueueTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllSyncQueueItems();
      setItems(all);
    } catch (e: any) {
      toast({ title: "فشل قراءة الطابور المحلي", description: e?.message || "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const filtered = useMemo(() => {
    let r = items;
    if (statusFilter !== "all") r = r.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((i) =>
        i.endpoint.toLowerCase().includes(q) ||
        i.action.toLowerCase().includes(q) ||
        JSON.stringify(i.payload).toLowerCase().includes(q) ||
        (i.lastError || "").toLowerCase().includes(q)
      );
    }
    return r.sort((a, b) => b.timestamp - a.timestamp);
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: items.length, pending: 0, failed: 0, inFlight: 0, conflict: 0 };
    for (const i of items) {
      if (i.status === "pending") s.pending++;
      else if (i.status === "failed") s.failed++;
      else if (i.status === "in-flight") s.inFlight++;
      else if (i.status === "conflict") s.conflict++;
    }
    return s;
  }, [items]);

  const handleRetry = async (id: string) => {
    setBusy(true);
    try {
      await retryFailedItem(id);
      toast({ title: "تمت إعادة جدولة العملية" });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشلت إعادة المحاولة", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (id: string) => {
    setBusy(true);
    try {
      await cancelSyncQueueItem(id);
      toast({ title: "تم إلغاء العملية" });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشل الإلغاء", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await removeSyncQueueItem(id);
      toast({ title: "تم الحذف نهائياً" });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشل الحذف", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      await syncOfflineData();
      toast({ title: "اكتملت المزامنة", description: "تحقق من نتائج العمليات في الجدول" });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشلت المزامنة", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRetryAllFailed = async () => {
    setBusy(true);
    try {
      const count = await retryAllFailed();
      toast({ title: `تمت إعادة جدولة ${count} عملية فاشلة` });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشل", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCancelAll = async () => {
    setBusy(true);
    try {
      const count = await cancelAllSyncQueueItems();
      toast({ title: `تم إلغاء ${count} عملية معلقة` });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشل الإلغاء", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button onClick={() => setStatusFilter("all")} className={`p-2 rounded-xl border text-center transition ${statusFilter === "all" ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-700"}`} data-testid="stat-total">
          <div className="text-xs text-muted-foreground">الإجمالي</div>
          <div className="text-lg font-bold">{stats.total}</div>
        </button>
        <button onClick={() => setStatusFilter("pending")} className={`p-2 rounded-xl border text-center transition ${statusFilter === "pending" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-slate-200 dark:border-slate-700"}`} data-testid="stat-pending">
          <div className="text-xs text-muted-foreground">معلقة</div>
          <div className="text-lg font-bold text-amber-600">{stats.pending}</div>
        </button>
        <button onClick={() => setStatusFilter("in-flight")} className={`p-2 rounded-xl border text-center transition ${statusFilter === "in-flight" ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-700"}`} data-testid="stat-inflight">
          <div className="text-xs text-muted-foreground">جاري الإرسال</div>
          <div className="text-lg font-bold text-blue-600">{stats.inFlight}</div>
        </button>
        <button onClick={() => setStatusFilter("failed")} className={`p-2 rounded-xl border text-center transition ${statusFilter === "failed" ? "border-red-400 bg-red-50 dark:bg-red-950/30" : "border-slate-200 dark:border-slate-700"}`} data-testid="stat-failed">
          <div className="text-xs text-muted-foreground">فاشلة</div>
          <div className="text-lg font-bold text-red-600">{stats.failed}</div>
        </button>
        <button onClick={() => setStatusFilter("conflict")} className={`p-2 rounded-xl border text-center transition ${statusFilter === "conflict" ? "border-red-400 bg-red-50 dark:bg-red-950/30" : "border-slate-200 dark:border-slate-700"}`} data-testid="stat-conflict">
          <div className="text-xs text-muted-foreground">تعارض</div>
          <div className="text-lg font-bold text-red-700">{stats.conflict}</div>
        </button>
      </div>

      {/* أدوات */}
      <Card className="rounded-2xl">
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في endpoint أو payload أو الخطأ..."
            className="h-9 rounded-xl flex-1 min-w-[200px] text-xs"
            data-testid="input-search-queue"
          />
          <Button onClick={handleSyncNow} disabled={busy || stats.total === 0} size="sm" className="rounded-xl" data-testid="button-sync-now">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Send className="h-3.5 w-3.5 ml-1" />}
            مزامنة الآن
          </Button>
          {stats.failed > 0 && (
            <Button onClick={handleRetryAllFailed} disabled={busy} variant="outline" size="sm" className="rounded-xl text-blue-600" data-testid="button-retry-all">
              <RefreshCw className="h-3.5 w-3.5 ml-1" />
              إعادة الفاشلة ({stats.failed})
            </Button>
          )}
          {stats.pending > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl text-red-600" disabled={busy} data-testid="button-cancel-all">
                  <Trash2 className="h-3.5 w-3.5 ml-1" />
                  إلغاء كل المعلقة
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl" className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>إلغاء جميع العمليات المعلقة؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم إلغاء <strong>{stats.pending}</strong> عملية. لن تُرسل للخادم. هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogAction onClick={handleCancelAll} className="bg-red-600 hover:bg-red-700 rounded-xl">نعم، إلغاء الكل</AlertDialogAction>
                  <AlertDialogCancel className="rounded-xl">رجوع</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={refresh} variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0" disabled={loading} data-testid="button-refresh-queue">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardContent>
      </Card>

      {/* القائمة */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium text-muted-foreground">
              {items.length === 0 ? "الطابور المحلي فارغ - كل العمليات مزامنة" : "لا توجد عمليات بهذا الفلتر"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2 pl-2">
            {filtered.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                isExpanded={expanded.has(item.id)}
                onToggle={() => {
                  const next = new Set(expanded);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  setExpanded(next);
                }}
                onRetry={handleRetry}
                onCancel={handleCancel}
                onDelete={handleDelete}
                isBusy={busy}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
