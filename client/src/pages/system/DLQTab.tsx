import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, AlertTriangle, Trash2, Send, ChevronDown, ChevronUp,
  Calendar, Loader2, Inbox, Skull, Archive, Download
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
  getDLQItems,
  retryDLQItem,
  retryAllDLQ,
  removeDLQItem,
  clearDLQ,
  type DeadLetterItem,
} from "@/offline/offline";
import { getArchivedDLQ, clearArchivedDLQ } from "@/offline/storage-recovery";

function formatRelative(ts: number): string {
  if (!ts) return "-";
  const d = Date.now() - ts;
  if (d < 60_000) return "الآن";
  if (d < 3600_000) return `منذ ${Math.floor(d / 60_000)} د`;
  if (d < 86_400_000) return `منذ ${Math.floor(d / 3600_000)} س`;
  return new Date(ts).toLocaleString("ar-SA");
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

interface DLQCardProps {
  item: DeadLetterItem;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  isBusy: boolean;
  isArchived?: boolean;
}

function DLQCard({ item, isExpanded, onToggle, onRetry, onDelete, isBusy, isArchived }: DLQCardProps) {
  return (
    <Card className={`rounded-2xl border ${isArchived ? "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30" : "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10"} backdrop-blur-md`} data-testid={`dlq-item-${item.id}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isArchived ? (
              <Badge variant="outline" className="text-[10px]">
                <Archive className="h-2.5 w-2.5 ml-1" />
                مؤرشف
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px]">
                <Skull className="h-2.5 w-2.5 ml-1" />
                ميتة
              </Badge>
            )}
            {actionBadge(item.action)}
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {item.endpoint}
            </span>
            <Badge variant="outline" className="text-[10px]">
              <RefreshCw className="h-2.5 w-2.5 ml-1" />
              {item.totalRetries} محاولات
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {!isArchived && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
                onClick={() => onRetry(item.id)}
                disabled={isBusy}
                data-testid={`button-restore-${item.id}`}
                title="استعادة للطابور"
              >
                <Send className="h-3 w-3 ml-1" />
                استعادة
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
              onClick={() => onDelete(item.id)}
              disabled={isBusy}
              data-testid={`button-dlq-delete-${item.id}`}
              title="حذف نهائي"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg"
              onClick={onToggle}
              data-testid={`button-dlq-toggle-${item.id}`}
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            أُنشئ: {formatRelative(item.timestamp)}
          </span>
          <span className="flex items-center gap-1">
            <Skull className="h-3 w-3" />
            نُقل لـ DLQ: {formatRelative(item.movedAt)}
          </span>
          {item.errorType && (
            <Badge variant="outline" className="text-[10px]">{item.errorType}</Badge>
          )}
        </div>

        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/40">
          <p className="text-[11px] text-red-700 dark:text-red-300 break-all">
            <strong>سبب الفشل:</strong> {item.lastError || "غير معروف"}
          </p>
        </div>

        {isExpanded && (
          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1">
            <div className="text-[11px]">
              <strong>ID الأصلي:</strong>{" "}
              <span className="font-mono">{item.originalId.substring(0, 16)}…</span>
            </div>
            {item.idempotencyKey && (
              <div className="text-[11px]">
                <strong>مفتاح التكرار:</strong>{" "}
                <span className="font-mono">{item.idempotencyKey.substring(0, 30)}…</span>
              </div>
            )}
            <div className="text-[11px]">
              <strong>Payload:</strong>
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

export default function DLQTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<DeadLetterItem[]>([]);
  const [archived, setArchived] = useState<DeadLetterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "archived">("active");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [active, arch] = await Promise.all([
        getDLQItems(),
        Promise.resolve(getArchivedDLQ()),
      ]);
      setItems(active);
      setArchived(arch as DeadLetterItem[]);
    } catch (e: any) {
      toast({ title: "فشل قراءة DLQ", description: e?.message || "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const list = view === "active" ? items : archived;
  const filtered = useMemo(() => {
    if (!search.trim()) return list.sort((a, b) => b.movedAt - a.movedAt);
    const q = search.toLowerCase();
    return list
      .filter((i) =>
        i.endpoint.toLowerCase().includes(q) ||
        (i.lastError || "").toLowerCase().includes(q) ||
        JSON.stringify(i.payload).toLowerCase().includes(q)
      )
      .sort((a, b) => b.movedAt - a.movedAt);
  }, [list, search]);

  const handleRetry = async (id: string) => {
    setBusy(true);
    try {
      await retryDLQItem(id);
      toast({ title: "تم استعادة العملية للطابور" });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشلت الاستعادة", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await removeDLQItem(id);
      toast({ title: "تم الحذف نهائياً" });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشل الحذف", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRetryAll = async () => {
    setBusy(true);
    try {
      const count = await retryAllDLQ();
      toast({ title: `تمت استعادة ${count} عملية للطابور` });
      await refresh();
    } catch (e: any) {
      toast({ title: "فشل", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    setBusy(true);
    try {
      if (view === "active") {
        const count = await clearDLQ();
        toast({ title: `تم مسح ${count} عملية ميتة` });
      } else {
        clearArchivedDLQ();
        toast({ title: `تم مسح الأرشيف` });
      }
      await refresh();
    } catch (e: any) {
      toast({ title: "فشل المسح", description: e?.message || "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    const data = view === "active" ? items : archived;
    if (data.length === 0) {
      toast({ title: "لا يوجد ما يُصدّر" });
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dlq-${view}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم تصدير DLQ" });
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Toggle بين النشط والأرشيف */}
      <div className="flex items-center gap-2">
        <Button
          variant={view === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("active")}
          className="rounded-xl"
          data-testid="button-view-active"
        >
          <Skull className="h-3.5 w-3.5 ml-1" />
          نشط ({items.length})
        </Button>
        <Button
          variant={view === "archived" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("archived")}
          className="rounded-xl"
          data-testid="button-view-archived"
        >
          <Archive className="h-3.5 w-3.5 ml-1" />
          مؤرشف ({archived.length})
        </Button>
        {view === "archived" && archived.length > 0 && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            ⚡ هذه عمليات أُرشفت تلقائياً عند امتلاء التخزين
          </span>
        )}
      </div>

      {/* أدوات */}
      <Card className="rounded-2xl">
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في endpoint أو الخطأ..."
            className="h-9 rounded-xl flex-1 min-w-[200px] text-xs"
            data-testid="input-search-dlq"
          />
          {view === "active" && items.length > 0 && (
            <Button onClick={handleRetryAll} disabled={busy} variant="outline" size="sm" className="rounded-xl text-blue-600" data-testid="button-retry-all-dlq">
              <Send className="h-3.5 w-3.5 ml-1" />
              استعادة الكل
            </Button>
          )}
          <Button onClick={handleExport} variant="outline" size="sm" className="rounded-xl" disabled={list.length === 0} data-testid="button-export-dlq">
            <Download className="h-3.5 w-3.5 ml-1" />
            تصدير JSON
          </Button>
          {list.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl text-red-600" disabled={busy} data-testid="button-clear-dlq">
                  <Trash2 className="h-3.5 w-3.5 ml-1" />
                  مسح {view === "active" ? "DLQ" : "الأرشيف"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl" className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    تأكيد المسح النهائي
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      سيتم حذف <strong>{list.length}</strong> عملية {view === "active" ? "ميتة" : "مؤرشفة"} نهائياً.
                    </span>
                    <span className="block bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-2 rounded-lg text-xs">
                      💡 يُنصح بالتصدير أولاً إذا كنت تحتاج لمراجعة هذه العمليات لاحقاً.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700 rounded-xl">نعم، احذف نهائياً</AlertDialogAction>
                  <AlertDialogCancel className="rounded-xl">رجوع</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={refresh} variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0" disabled={loading} data-testid="button-refresh-dlq">
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
              {view === "active" ? "لا توجد عمليات ميتة - رائع!" : "الأرشيف فارغ"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2 pl-2">
            {filtered.map((item) => (
              <DLQCard
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
                onDelete={handleDelete}
                isBusy={busy}
                isArchived={view === "archived"}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
