import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeftRight, ChevronRight, ChevronLeft, Calendar, Package,
  Truck, Users, Wallet, AlertTriangle, CheckCircle2, Loader2,
  ArrowRight, Eye, FileWarning, ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TransferRecord {
  id: string;
  table: string;
  tableLabel: string;
  date: string;
  amount: number;
  description: string;
  workerId: string | null;
  supplierId: string | null;
  fingerprint: string;
  raw: any;
}

interface ReviewResponse {
  date: string;
  projectId: string;
  records: TransferRecord[];
  count: number;
}

interface PreviewResponse {
  transferableCount: number;
  duplicateCount: number;
  totalAmount: number;
  transferable: TransferRecord[];
  duplicates: TransferRecord[];
}

interface Project {
  id: string;
  name: string;
}

const TABLE_ICONS: Record<string, any> = {
  materialPurchases: Package,
  supplierPayments: Wallet,
  transportationExpenses: Truck,
  workerTransfers: ArrowLeftRight,
  workerMiscExpenses: ClipboardList,
  attendance: Users,
};

const TABLE_COLORS: Record<string, string> = {
  materialPurchases: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  supplierPayments: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  transportationExpenses: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  workerTransfers: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  workerMiscExpenses: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  attendance: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function RecordsTransfer() {
  const { toast } = useToast();
  const [sourceProjectId, setSourceProjectId] = useState<string>("");
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRecords, setSelectedRecords] = useState<{ table: string; id: string }[]>([]);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projects = projectsData || [];

  const { data: sourceData, isLoading: sourceLoading, refetch: refetchSource } = useQuery<ReviewResponse>({
    queryKey: ["/api/record-transfer/review", sourceProjectId, currentDate],
    queryFn: () => apiRequest(`/api/record-transfer/review?projectId=${sourceProjectId}&date=${currentDate}`),
    enabled: !!sourceProjectId,
  });

  const { data: targetData, isLoading: targetLoading, refetch: refetchTarget } = useQuery<ReviewResponse>({
    queryKey: ["/api/record-transfer/review", targetProjectId, currentDate],
    queryFn: () => apiRequest(`/api/record-transfer/review?projectId=${targetProjectId}&date=${currentDate}`),
    enabled: !!targetProjectId,
  });

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedRecords([]);
    setPreviewData(null);
    setIsPreview(false);
  }, [currentDate, sourceProjectId, targetProjectId]);

  const sourceRecords = sourceData?.records || [];
  const targetRecords = targetData?.records || [];

  const targetFingerprints = new Set(targetRecords.map(r => r.fingerprint));

  const goDay = (delta: number) => {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const toggleRecord = (record: TransferRecord) => {
    const newSet = new Set(selectedIds);
    const key = `${record.table}:${record.id}`;
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedIds(newSet);
    setSelectedRecords(
      Array.from(newSet).map(k => {
        const [table, id] = k.split(":");
        return { table, id };
      })
    );
  };

  const toggleAll = () => {
    if (selectedIds.size === sourceRecords.length) {
      setSelectedIds(new Set());
      setSelectedRecords([]);
    } else {
      const all = new Set(sourceRecords.map(r => `${r.table}:${r.id}`));
      setSelectedIds(all);
      setSelectedRecords(sourceRecords.map(r => ({ table: r.table, id: r.id })));
    }
  };

  const handlePreview = async () => {
    if (!selectedRecords.length) {
      toast({ title: "اختر سجلات للنقل أولاً", variant: "destructive" });
      return;
    }
    setIsPreviewing(true);
    try {
      const data = await apiRequest("/api/record-transfer/preview", "POST", {
        sourceProjectId,
        targetProjectId,
        date: currentDate,
        selections: selectedRecords,
      });
      setPreviewData(data);
      setIsPreview(true);
    } catch (error: any) {
      toast({ title: "فشل المعاينة", description: error.message, variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setIsTransferring(true);
    try {
      const transferSelections = previewData.transferable.map(r => ({ table: r.table, id: r.id }));
      const result = await apiRequest("/api/record-transfer/confirm", "POST", {
        sourceProjectId,
        targetProjectId,
        selections: transferSelections,
      });
      toast({
        title: `تم نقل ${result.movedCount} سجل بنجاح`,
        description: `إجمالي المبالغ المنقولة: ${formatCurrency(result.totalAmountMoved)}`,
      });
      setIsPreview(false);
      setPreviewData(null);
      setSelectedIds(new Set());
      setSelectedRecords([]);
      refetchSource();
      refetchTarget();
    } catch (error: any) {
      toast({ title: "فشل النقل", description: error.message, variant: "destructive" });
    } finally {
      setIsTransferring(false);
    }
  };

  const groupByTable = (records: TransferRecord[]) => {
    const groups: Record<string, TransferRecord[]> = {};
    for (const r of records) {
      if (!groups[r.table]) groups[r.table] = [];
      groups[r.table].push(r);
    }
    return groups;
  };

  const renderRecordCard = (record: TransferRecord, side: "source" | "target") => {
    const Icon = TABLE_ICONS[record.table] || Package;
    const isDuplicate = side === "source" && targetFingerprints.has(record.fingerprint);
    const isSelected = selectedIds.has(`${record.table}:${record.id}`);

    return (
      <div
        key={record.id}
        data-testid={`record-${side}-${record.id}`}
        className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all ${
          isDuplicate
            ? "border-amber-500/30 bg-amber-500/5"
            : isSelected
            ? "border-blue-500/40 bg-blue-500/5"
            : "border-border/50 bg-muted/20 hover:bg-muted/40"
        }`}
      >
        {side === "source" && (
          <Checkbox
            data-testid={`checkbox-${record.id}`}
            checked={isSelected}
            onCheckedChange={() => toggleRecord(record)}
            className="mt-1 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${TABLE_COLORS[record.table]} text-[9px] border gap-1 px-1.5 py-0`}>
              <Icon className="h-2.5 w-2.5" />
              {record.tableLabel}
            </Badge>
            {isDuplicate && (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] border gap-1 px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5" />
                مكرر
              </Badge>
            )}
          </div>
          <p className="text-xs text-foreground truncate">{record.description || "-"}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{formatCurrency(record.amount)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectColumn = (
    title: string,
    records: TransferRecord[],
    loading: boolean,
    side: "source" | "target"
  ) => {
    const groups = groupByTable(records);
    const totalAmount = records.reduce((s, r) => s + r.amount, 0);

    return (
      <Card className="bg-card border-border flex-1" data-testid={`card-${side}`}>
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{records.length} سجل</Badge>
              <span className="text-[10px] font-mono text-muted-foreground">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          {side === "source" && records.length > 0 && (
            <Button
              data-testid="button-select-all"
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="text-[10px] h-6 px-2 mt-1 text-blue-600 dark:text-blue-400"
            >
              {selectedIds.size === records.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <ScrollArea className="h-[400px] sm:h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">لا توجد سجلات في هذا اليوم</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groups).map(([table, recs]) => (
                  <div key={table}>
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">
                      {recs[0]?.tableLabel} ({recs.length})
                    </p>
                    <div className="space-y-1.5">
                      {recs.map(r => renderRecordCard(r, side))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <ArrowLeftRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground" data-testid="page-title">مراجعة ونقل السجلات بين المشاريع</h1>
            <p className="text-xs text-muted-foreground">راجع السجلات يومياً وانقل ما يلزم للمشروع الصحيح</p>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs text-muted-foreground mb-1 block">المشروع المصدر</label>
                <Select value={sourceProjectId} onValueChange={setSourceProjectId}>
                  <SelectTrigger data-testid="select-source-project" className="h-9">
                    <SelectValue placeholder="اختر المشروع المصدر" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} disabled={p.id === targetProjectId}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 hidden sm:block rotate-180" />

              <div className="flex-1 w-full">
                <label className="text-xs text-muted-foreground mb-1 block">المشروع الهدف</label>
                <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                  <SelectTrigger data-testid="select-target-project" className="h-9">
                    <SelectValue placeholder="اختر المشروع الهدف" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} disabled={p.id === sourceProjectId}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              <div className="flex items-center gap-1">
                <Button data-testid="button-prev-day" variant="outline" size="icon" className="h-9 w-9" onClick={() => goDay(-1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-3 h-9 border rounded-md bg-muted/30 min-w-[130px] justify-center">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono" data-testid="text-current-date" dir="ltr">{formatDate(currentDate)}</span>
                </div>
                <Button data-testid="button-next-day" variant="outline" size="icon" className="h-9 w-9" onClick={() => goDay(1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {sourceProjectId && targetProjectId ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderProjectColumn(
                projects.find(p => p.id === sourceProjectId)?.name || "المصدر",
                sourceRecords,
                sourceLoading,
                "source"
              )}
              {renderProjectColumn(
                projects.find(p => p.id === targetProjectId)?.name || "الهدف",
                targetRecords,
                targetLoading,
                "target"
              )}
            </div>

            {selectedIds.size > 0 && !isPreview && (
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                      {selectedIds.size} سجل محدد
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      إجمالي: <span className="font-mono font-semibold text-foreground">
                        {formatCurrency(
                          sourceRecords
                            .filter(r => selectedIds.has(`${r.table}:${r.id}`))
                            .reduce((s, r) => s + r.amount, 0)
                        )}
                      </span>
                    </span>
                  </div>
                  <Button
                    data-testid="button-preview-transfer"
                    onClick={handlePreview}
                    disabled={isPreviewing}
                    className="gap-2"
                  >
                    {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    معاينة النقل
                  </Button>
                </CardContent>
              </Card>
            )}

            {isPreview && previewData && (
              <Card className="bg-card border-2 border-blue-500/30">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                    <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ملخص المعاينة قبل النقل
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{previewData.transferableCount}</p>
                      <p className="text-[10px] text-muted-foreground">جاهز للنقل</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{previewData.duplicateCount}</p>
                      <p className="text-[10px] text-muted-foreground">مكرر (لن ينقل)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center col-span-2">
                      <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{formatCurrency(previewData.totalAmount)}</p>
                      <p className="text-[10px] text-muted-foreground">إجمالي المبالغ للنقل</p>
                    </div>
                  </div>

                  {previewData.duplicates.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
                        <FileWarning className="h-3.5 w-3.5" />
                        سجلات مكررة (موجودة في المشروع الهدف)
                      </p>
                      <div className="space-y-1">
                        {previewData.duplicates.map(d => (
                          <p key={d.id} className="text-[10px] text-muted-foreground">
                            {d.tableLabel}: {d.description} ({formatCurrency(d.amount)})
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => { setIsPreview(false); setPreviewData(null); }}
                      data-testid="button-cancel-preview"
                    >
                      إلغاء
                    </Button>
                    <Button
                      data-testid="button-confirm-transfer"
                      onClick={handleConfirm}
                      disabled={isTransferring || previewData.transferableCount === 0}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {isTransferring ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      تأكيد نقل {previewData.transferableCount} سجل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">اختر المشروع المصدر والمشروع الهدف للبدء</p>
              <p className="text-xs mt-1">ستظهر سجلات كل مشروع جنباً لجنب للمقارنة</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
