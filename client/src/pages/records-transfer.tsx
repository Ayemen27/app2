import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftRight, ChevronRight, ChevronLeft, Calendar, Package,
  Truck, Users, Wallet, AlertTriangle, CheckCircle2, Loader2,
  ArrowRight, Eye, FileWarning, ClipboardList, TrendingUp,
  ChevronsRight, ChevronsLeft, RotateCcw, Trash2, ShieldAlert, Info,
  Send, DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";

interface MatchInfo {
  targetProjectName: string;
  targetRecordId: string;
  targetDate: string;
  targetDescription: string;
  targetAmount: number;
  matchedFields: Record<string, string>;
}

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
  matchInfo?: MatchInfo;
}

interface CrossWarning {
  recordId: string;
  table: string;
  tableLabel: string;
  workerName: string;
  workerId: string;
  recordAmount: number;
  otherPayments: { table: string; tableLabel: string; projectName: string; amount: number }[];
  totalOtherAmount: number;
}

interface PreviewResponse {
  transferableCount: number;
  duplicateCount: number;
  totalAmount: number;
  transferable: TransferRecord[];
  duplicates: TransferRecord[];
  crossWarnings: CrossWarning[];
  targetRecordCount: number;
}

interface Project {
  id: string;
  name: string;
}

const TABLE_ICONS: Record<string, any> = {
  fundTransfers: DollarSign,
  materialPurchases: Package,
  supplierPayments: Wallet,
  transportationExpenses: Truck,
  workerTransfers: ArrowLeftRight,
  workerMiscExpenses: ClipboardList,
  attendance: Users,
  fundTransferOut: Send,
  fundTransferIn: DollarSign,
};

const TABLE_COLORS: Record<string, string> = {
  fundTransfers: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  materialPurchases: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  supplierPayments: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  transportationExpenses: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  workerTransfers: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  workerMiscExpenses: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  attendance: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  fundTransferOut: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  fundTransferIn: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
};

const SUMMARY_COLORS: Record<string, string> = {
  fundTransfers: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
  materialPurchases: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  supplierPayments: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
  transportationExpenses: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
  workerTransfers: "from-green-500/10 to-green-500/5 border-green-500/20",
  workerMiscExpenses: "from-red-500/10 to-red-500/5 border-red-500/20",
  attendance: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
  fundTransferOut: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20",
  fundTransferIn: "from-teal-500/10 to-teal-500/5 border-teal-500/20",
};

const TABLE_LABELS: Record<string, string> = {
  fundTransfers: "العهدة",
  materialPurchases: "مشتريات المواد",
  supplierPayments: "مدفوعات الموردين",
  transportationExpenses: "أجور المواصلات",
  workerTransfers: "حوالات العمال",
  workerMiscExpenses: "نثريات العمال",
  attendance: "الحضور",
  fundTransferOut: "ترحيل أموال صادر",
  fundTransferIn: "ترحيل أموال وارد",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ar-SA", { weekday: "long" });
}

function transformDailyExpensesToRecords(data: any, projectId: string): TransferRecord[] {
  if (!data?.data) return [];
  const d = data.data;
  const records: TransferRecord[] = [];

  if (d.fundTransfers) {
    for (const r of d.fundTransfers) {
      const amount = parseFloat(r.amount || "0");
      if (amount <= 0) continue;
      records.push({
        id: r.id,
        table: "fundTransfers",
        tableLabel: TABLE_LABELS.fundTransfers,
        date: r.transferDate || d.date,
        amount,
        description: `${r.senderName || r.sender_name || ""} - ${r.transferType || r.transfer_type || ""} ${r.notes ? `| ${r.notes}` : ""}`.trim(),
        workerId: null,
        supplierId: null,
        fingerprint: `ft_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.materialPurchases) {
    for (const r of d.materialPurchases) {
      records.push({
        id: r.id,
        table: "materialPurchases",
        tableLabel: TABLE_LABELS.materialPurchases,
        date: r.purchaseDate || d.date,
        amount: parseFloat(r.totalAmount || "0"),
        description: `${r.materialName || ""} - ${r.supplierName || ""} (${r.quantity} ${r.unit})`,
        workerId: null,
        supplierId: r.supplier_id || null,
        fingerprint: `mp_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.workerAttendance) {
    for (const r of d.workerAttendance) {
      const paid = parseFloat(r.paidAmount || "0");
      const wage = parseFloat(r.actualWage || r.dailyWage || "0");
      const workDays = parseFloat(r.workDays || "0");
      const total = wage * workDays;
      const amount = paid > 0 ? paid : total;
      if (amount <= 0) continue;
      const parts = [`أيام: ${r.workDays || "0"}`];
      parts.push(`يومي: ${formatCurrency(wage)}`);
      parts.push(`مستحق: ${formatCurrency(total)}`);
      if (paid > 0) parts.push(`مدفوع: ${formatCurrency(paid)}`);
      records.push({
        id: r.id,
        table: "attendance",
        tableLabel: TABLE_LABELS.attendance,
        date: r.date || r.attendanceDate || d.date,
        amount,
        description: `${r.workerName || ""} | ${parts.join(" | ")}`,
        workerId: r.worker_id || null,
        supplierId: null,
        fingerprint: `att_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.transportationExpenses) {
    for (const r of d.transportationExpenses) {
      records.push({
        id: r.id,
        table: "transportationExpenses",
        tableLabel: TABLE_LABELS.transportationExpenses,
        date: r.date || d.date,
        amount: parseFloat(r.amount || "0"),
        description: r.description || "",
        workerId: r.worker_id || null,
        supplierId: null,
        fingerprint: `te_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.workerTransfers) {
    for (const r of d.workerTransfers) {
      records.push({
        id: r.id,
        table: "workerTransfers",
        tableLabel: TABLE_LABELS.workerTransfers,
        date: r.transferDate || d.date,
        amount: parseFloat(r.amount || "0"),
        description: `حوالة لـ ${r.recipientName || ""} - ${r.transferMethod || ""}`,
        workerId: r.worker_id || null,
        supplierId: null,
        fingerprint: `wt_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.miscExpenses) {
    for (const r of d.miscExpenses) {
      records.push({
        id: r.id,
        table: "workerMiscExpenses",
        tableLabel: TABLE_LABELS.workerMiscExpenses,
        date: r.date || d.date,
        amount: parseFloat(r.amount || "0"),
        description: r.description || r.notes || "",
        workerId: r.worker_id || null,
        supplierId: null,
        fingerprint: `wme_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.supplierPayments) {
    for (const r of d.supplierPayments) {
      records.push({
        id: r.id,
        table: "supplierPayments",
        tableLabel: TABLE_LABELS.supplierPayments,
        date: r.paymentDate || d.date,
        amount: parseFloat(r.amount || "0"),
        description: `دفعة ${r.paymentMethod || ""} - مرجع: ${r.referenceNumber || "-"}`,
        workerId: null,
        supplierId: r.supplier_id || null,
        fingerprint: `sp_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.projectFundTransfersOut) {
    for (const r of d.projectFundTransfersOut) {
      records.push({
        id: r.id,
        table: "fundTransferOut",
        tableLabel: TABLE_LABELS.fundTransferOut,
        date: r.transferDate || d.date,
        amount: parseFloat(r.amount || "0"),
        description: `صادر إلى: ${r._toProjectName || r.toProjectId}${r.description ? ` - ${r.description}` : ""}`,
        workerId: null,
        supplierId: null,
        fingerprint: `fto_${r.id}`,
        raw: r,
      });
    }
  }

  if (d.projectFundTransfersIn) {
    for (const r of d.projectFundTransfersIn) {
      records.push({
        id: r.id,
        table: "fundTransferIn",
        tableLabel: TABLE_LABELS.fundTransferIn,
        date: r.transferDate || d.date,
        amount: parseFloat(r.amount || "0"),
        description: `وارد من: ${r._fromProjectName || r.fromProjectId}${r.description ? ` - ${r.description}` : ""}`,
        workerId: null,
        supplierId: null,
        fingerprint: `fti_${r.id}`,
        raw: r,
      });
    }
  }

  return records;
}

export default function RecordsTransfer() {
  const { toast } = useToast();
  const [sourceProjectId, setSourceProjectId] = useState<string>(() => localStorage.getItem("rt_source") || "");
  const [targetProjectId, setTargetProjectId] = useState<string>(() => localStorage.getItem("rt_target") || "");
  const [currentDate, setCurrentDate] = useState(() => {
    const saved = localStorage.getItem("rt_date");
    if (saved) return saved;
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRecords, setSelectedRecords] = useState<{ table: string; id: string }[]>([]);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isForceTransferring, setIsForceTransferring] = useState(false);
  const [fundAmount, setFundAmount] = useState<string>("");
  const [isSendingFund, setIsSendingFund] = useState(false);

  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projects = projectsData || [];

  const { data: sourceRawData, isLoading: sourceLoading, refetch: refetchSource } = useQuery({
    queryKey: ["/api/projects", sourceProjectId, "daily-expenses", currentDate],
    queryFn: () => apiRequest(`/api/projects/${sourceProjectId}/daily-expenses/${currentDate}`),
    enabled: !!sourceProjectId,
  });

  const { data: targetRawData, isLoading: targetLoading, refetch: refetchTarget } = useQuery({
    queryKey: ["/api/projects", targetProjectId, "daily-expenses", currentDate],
    queryFn: () => apiRequest(`/api/projects/${targetProjectId}/daily-expenses/${currentDate}`),
    enabled: !!targetProjectId,
  });

  const sourceRecords = useMemo(() => transformDailyExpensesToRecords(sourceRawData, sourceProjectId), [sourceRawData, sourceProjectId]);
  const targetRecords = useMemo(() => transformDailyExpensesToRecords(targetRawData, targetProjectId), [targetRawData, targetProjectId]);

  const { summary: sourceFinancial } = useFinancialSummary({
    project_id: sourceProjectId || undefined,
    date: currentDate,
    enabled: !!sourceProjectId,
  });

  const { summary: targetFinancial } = useFinancialSummary({
    project_id: targetProjectId || undefined,
    date: currentDate,
    enabled: !!targetProjectId,
  });

  useEffect(() => { localStorage.setItem("rt_source", sourceProjectId); }, [sourceProjectId]);
  useEffect(() => { localStorage.setItem("rt_target", targetProjectId); }, [targetProjectId]);
  useEffect(() => { localStorage.setItem("rt_date", currentDate); }, [currentDate]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedRecords([]);
    setPreviewData(null);
    setIsPreview(false);
  }, [currentDate, sourceProjectId, targetProjectId]);

  const targetFingerprints = new Set(targetRecords.map(r => r.fingerprint));

  const toLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const changeDateBy = (type: "day" | "month" | "year", delta: number) => {
    const d = new Date(currentDate + "T12:00:00");
    if (type === "day") d.setDate(d.getDate() + delta);
    else if (type === "month") d.setMonth(d.getMonth() + delta);
    else d.setFullYear(d.getFullYear() + delta);
    setCurrentDate(toLocalDateStr(d));
  };

  const goToToday = () => setCurrentDate(toLocalDateStr(new Date()));

  const sourceSummary = useMemo(() => {
    const groups: Record<string, { count: number; total: number; label: string }> = {};
    for (const r of sourceRecords) {
      if (!groups[r.table]) groups[r.table] = { count: 0, total: 0, label: r.tableLabel };
      groups[r.table].count++;
      groups[r.table].total += r.amount;
    }
    return groups;
  }, [sourceRecords]);

  const targetSummary = useMemo(() => {
    const groups: Record<string, { count: number; total: number; label: string }> = {};
    for (const r of targetRecords) {
      if (!groups[r.table]) groups[r.table] = { count: 0, total: 0, label: r.tableLabel };
      groups[r.table].count++;
      groups[r.table].total += r.amount;
    }
    return groups;
  }, [targetRecords]);

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

  const toggleTable = (tableName: string) => {
    const tableRecords = sourceRecords.filter(r => r.table === tableName);
    const tableKeys = tableRecords.map(r => `${r.table}:${r.id}`);
    const allSelected = tableKeys.every(k => selectedIds.has(k));

    const newSet = new Set(selectedIds);
    if (allSelected) {
      tableKeys.forEach(k => newSet.delete(k));
    } else {
      tableKeys.forEach(k => newSet.add(k));
    }
    setSelectedIds(newSet);
    setSelectedRecords(
      Array.from(newSet).map(k => {
        const [table, id] = k.split(":");
        return { table, id };
      })
    );
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
      resetAndRefresh();
    } catch (error: any) {
      toast({ title: "فشل النقل", description: error.message, variant: "destructive" });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleForceTransfer = async () => {
    if (!previewData || !previewData.duplicates.length) return;
    setIsForceTransferring(true);
    try {
      const forceSelections = previewData.duplicates.map(r => ({ table: r.table, id: r.id }));
      const result = await apiRequest("/api/record-transfer/confirm", "POST", {
        sourceProjectId,
        targetProjectId,
        selections: forceSelections,
        force: true,
      });
      toast({
        title: `تم نقل ${result.movedCount} سجل إجبارياً`,
        description: result.errors?.length ? result.errors.join("\n") : `إجمالي: ${formatCurrency(result.totalAmountMoved)}`,
      });
      resetAndRefresh();
    } catch (error: any) {
      toast({ title: "فشل النقل الإجباري", description: error.message, variant: "destructive" });
    } finally {
      setIsForceTransferring(false);
    }
  };

  const handleDeleteDuplicates = async (which: "source" | "target") => {
    if (!previewData || !previewData.duplicates.length) return;
    setIsDeleting(true);
    try {
      let selections: { table: string; id: string }[];
      let projectId: string;

      if (which === "source") {
        selections = previewData.duplicates.map(r => ({ table: r.table, id: r.id }));
        projectId = sourceProjectId;
      } else {
        selections = previewData.duplicates
          .filter(r => r.matchInfo?.targetRecordId)
          .map(r => ({ table: r.table, id: r.matchInfo!.targetRecordId }));
        projectId = targetProjectId;
      }

      if (!selections.length) {
        toast({ title: "لا توجد سجلات للحذف", variant: "destructive" });
        setIsDeleting(false);
        return;
      }

      const result = await apiRequest("/api/record-transfer/delete", "POST", {
        projectId,
        selections,
      });
      const label = which === "source" ? "المصدر" : "الهدف";
      toast({
        title: `تم حذف ${result.deletedCount} سجل مكرر من ${label}`,
        description: result.errors?.length ? result.errors.join("\n") : undefined,
      });
      resetAndRefresh();
    } catch (error: any) {
      toast({ title: "فشل الحذف", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFundTransfer = async () => {
    const amt = parseFloat(fundAmount);
    if (!amt || amt <= 0) {
      toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
      return;
    }
    if (!sourceProjectId || !targetProjectId) {
      toast({ title: "اختر المشروع المصدر والهدف", variant: "destructive" });
      return;
    }
    setIsSendingFund(true);
    try {
      await apiRequest("/api/project-fund-transfers", "POST", {
        fromProjectId: sourceProjectId,
        toProjectId: targetProjectId,
        amount: String(amt),
        transferDate: currentDate,
        description: `ترحيل من صفحة نقل السجلات`,
        transferReason: "ترحيل أموال بين المشاريع",
      });
      const srcName = projects.find(p => p.id === sourceProjectId)?.name || "";
      const tgtName = projects.find(p => p.id === targetProjectId)?.name || "";
      toast({
        title: `تم ترحيل ${formatCurrency(amt)} بنجاح`,
        description: `من "${srcName}" إلى "${tgtName}"`,
      });
      setFundAmount("");
      resetAndRefresh();
    } catch (error: any) {
      toast({ title: "فشل الترحيل", description: error.message, variant: "destructive" });
    } finally {
      setIsSendingFund(false);
    }
  };

  const resetAndRefresh = () => {
    setIsPreview(false);
    setPreviewData(null);
    setSelectedIds(new Set());
    setSelectedRecords([]);
    queryClient.invalidateQueries({ queryKey: ["/api/projects", sourceProjectId, "daily-expenses", currentDate] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects", targetProjectId, "daily-expenses", currentDate] });
    queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
  };

  const groupByTable = (records: TransferRecord[]) => {
    const groups: Record<string, TransferRecord[]> = {};
    for (const r of records) {
      if (!groups[r.table]) groups[r.table] = [];
      groups[r.table].push(r);
    }
    return groups;
  };

  const renderSummaryBar = (summary: Record<string, { count: number; total: number; label: string }>, records: TransferRecord[]) => {
    const totalAmount = records.reduce((s, r) => s + r.amount, 0);
    const entries = Object.entries(summary);
    if (entries.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-foreground">ملخص المصروفات</span>
          </div>
          <span className="text-xs font-mono font-bold text-foreground">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {entries.map(([table, info]) => {
            const Icon = TABLE_ICONS[table] || Package;
            return (
              <div key={table} className={`flex items-center gap-1.5 p-1.5 rounded-md border bg-gradient-to-br ${SUMMARY_COLORS[table] || "from-gray-500/10 to-gray-500/5 border-gray-500/20"}`}>
                <Icon className="h-3 w-3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-muted-foreground truncate">{info.label}</p>
                  <p className="text-[10px] font-mono font-semibold">{formatCurrency(info.total)} <span className="text-muted-foreground font-normal">({info.count})</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRecordCard = (record: TransferRecord, side: "source" | "target") => {
    const Icon = TABLE_ICONS[record.table] || Package;
    const isSelected = selectedIds.has(`${record.table}:${record.id}`);

    return (
      <div
        key={record.id}
        data-testid={`record-${side}-${record.id}`}
        className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${
          isSelected
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
          <div className="flex items-center gap-1.5 mb-0.5">
            <Badge className={`${TABLE_COLORS[record.table] || "bg-gray-500/10 text-gray-600 border-gray-500/20"} text-[8px] border gap-0.5 px-1 py-0`}>
              <Icon className="h-2 w-2" />
              {record.tableLabel}
            </Badge>
          </div>
          <p className="text-[11px] text-foreground truncate">{record.description || "-"}</p>
          <span className="text-[10px] font-mono font-semibold text-foreground">{formatCurrency(record.amount)}</span>
        </div>
      </div>
    );
  };

  const renderProjectColumn = (
    title: string,
    records: TransferRecord[],
    loading: boolean,
    side: "source" | "target",
    summary: Record<string, { count: number; total: number; label: string }>,
    financial: any | null
  ) => {
    const groups = groupByTable(records);
    const totalAmount = records.reduce((s, r) => s + r.amount, 0);

    const income = financial?.income;
    const expenses = financial?.expenses;
    const carriedForward = income?.carriedForwardBalance || 0;
    const totalIncome = income?.totalIncome || 0;
    const availableBalance = totalIncome + carriedForward;
    const totalCashExpenses = expenses?.totalCashExpenses || 0;
    const remainingBalance = availableBalance - totalCashExpenses;
    const incomingTransfers = income?.incomingProjectTransfers || 0;
    const outgoingTransfers = expenses?.outgoingProjectTransfers || 0;

    return (
      <Card className="bg-card border-border flex-1" data-testid={`card-${side}`}>
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${side === "source" ? "bg-blue-500" : "bg-green-500"}`} />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] h-5">{records.length} سجل</Badge>
              <span className="text-[10px] font-mono font-bold text-foreground">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          {financial && (
            <div className="mt-1.5 space-y-1">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-1.5 rounded-md border bg-blue-500/5 border-blue-500/20">
                  <p className="text-[8px] text-muted-foreground">العهدة (المرحل)</p>
                  <p className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(carriedForward)}</p>
                </div>
                <div className="p-1.5 rounded-md border bg-green-500/5 border-green-500/20">
                  <p className="text-[8px] text-muted-foreground">الدخل اليوم</p>
                  <p className="text-[10px] font-mono font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="p-1.5 rounded-md border bg-red-500/5 border-red-500/20">
                  <p className="text-[8px] text-muted-foreground">المصروفات</p>
                  <p className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400">{formatCurrency(totalCashExpenses)}</p>
                </div>
                <div className={`p-1.5 rounded-md border ${remainingBalance >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                  <p className="text-[8px] text-muted-foreground">المتبقي</p>
                  <p className={`text-[10px] font-mono font-bold ${remainingBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(remainingBalance)}</p>
                </div>
              </div>
              {(incomingTransfers > 0 || outgoingTransfers > 0) && (
                <div className="flex items-center gap-2 text-[8px] text-muted-foreground px-1">
                  {incomingTransfers > 0 && <span>وارد: <span className="font-mono font-semibold text-green-600">{formatCurrency(incomingTransfers)}</span></span>}
                  {outgoingTransfers > 0 && <span>صادر: <span className="font-mono font-semibold text-red-600">{formatCurrency(outgoingTransfers)}</span></span>}
                </div>
              )}
            </div>
          )}
          {side === "source" && records.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <Button
                data-testid="button-select-all"
                variant="outline"
                size="sm"
                onClick={toggleAll}
                className="text-[9px] h-6 px-2"
              >
                {selectedIds.size === records.length ? "إلغاء الكل" : "تحديد الكل"}
              </Button>
              {Object.keys(groups).length > 1 && Object.entries(groups).map(([table, recs]) => (
                <Button
                  key={table}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTable(table)}
                  className={`text-[8px] h-5 px-1.5 ${TABLE_COLORS[table] || ""}`}
                >
                  {recs[0]?.tableLabel}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {!loading && records.length > 0 && renderSummaryBar(summary, records)}

          <ScrollArea className="h-[350px] sm:h-[450px]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-7 w-7 mx-auto mb-2 opacity-20" />
                <p className="text-[11px]">لا توجد سجلات في هذا اليوم</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(groups).map(([table, recs]) => (
                  <div key={table}>
                    <p className="text-[9px] font-semibold text-muted-foreground mb-1">
                      {recs[0]?.tableLabel} ({recs.length}) - {formatCurrency(recs.reduce((s, r) => s + r.amount, 0))}
                    </p>
                    <div className="space-y-1">
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

  const renderDuplicateDetail = (dup: TransferRecord) => {
    const Icon = TABLE_ICONS[dup.table] || Package;
    const match = dup.matchInfo;

    return (
      <div key={dup.id} className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge className={`${TABLE_COLORS[dup.table] || "bg-gray-500/10 text-gray-600 border-gray-500/20"} text-[8px] border gap-0.5 px-1 py-0`}>
                <Icon className="h-2 w-2" />
                {dup.tableLabel}
              </Badge>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[8px] border gap-0.5 px-1 py-0">
                <AlertTriangle className="h-2 w-2" />
                مكرر
              </Badge>
            </div>
            <p className="text-[11px] text-foreground">{dup.description}</p>
            <p className="text-[10px] font-mono font-semibold">{formatCurrency(dup.amount)}</p>
          </div>
        </div>

        {match && (
          <div className="p-2 rounded-md bg-muted/40 border border-border/50 space-y-1.5">
            <p className="text-[10px] font-semibold text-foreground flex items-center gap-1">
              <Info className="h-3 w-3 text-blue-500" />
              سبب التكرار: سجل مطابق في "{match.targetProjectName}"
            </p>
            <p className="text-[9px] text-muted-foreground mr-4">
              تاريخ: {match.targetDate} | {match.targetDescription} | المبلغ: {formatCurrency(match.targetAmount)}
            </p>
            <div className="mr-4">
              <p className="text-[9px] text-muted-foreground font-semibold mb-0.5">الحقول المتطابقة:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {match.matchedFields && Object.entries(match.matchedFields).map(([key, val]) => (
                  <p key={key} className="text-[8px] text-muted-foreground">
                    <span className="font-medium">{key}:</span> {val || "-"}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const isToday = currentDate === toLocalDateStr(new Date());

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-2.5">
        <Card className="bg-card border-border">
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-muted-foreground mb-1 block">المشروع المصدر</label>
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

              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block rotate-180" />

              <div className="flex-1 w-full">
                <label className="text-[10px] text-muted-foreground mb-1 block">المشروع الهدف</label>
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
            </div>

            <Separator />

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                <Button data-testid="button-next-year" variant="ghost" size="sm" className="h-7 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => changeDateBy("year", 1)}>
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
                <Button data-testid="button-next-month" variant="ghost" size="sm" className="h-7 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => changeDateBy("month", 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button data-testid="button-next-day" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => changeDateBy("day", 1)}>
                  التالي
                </Button>

                <div className="flex items-center gap-1.5 px-3 h-8 border rounded-md bg-muted/40 min-w-[140px] justify-center">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-mono font-semibold" data-testid="text-current-date" dir="ltr">{formatDate(currentDate)}</span>
                </div>

                <Button data-testid="button-prev-day" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => changeDateBy("day", -1)}>
                  السابق
                </Button>
                <Button data-testid="button-prev-month" variant="ghost" size="sm" className="h-7 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => changeDateBy("month", -1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button data-testid="button-prev-year" variant="ghost" size="sm" className="h-7 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => changeDateBy("year", -1)}>
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{getDayName(currentDate)}</span>
                {!isToday && (
                  <Button data-testid="button-today" variant="ghost" size="sm" className="h-5 px-2 text-[9px] text-blue-600 dark:text-blue-400" onClick={goToToday}>
                    <RotateCcw className="h-2.5 w-2.5 ml-1" />
                    اليوم
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {sourceProjectId && targetProjectId && (
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-[11px] font-semibold text-foreground">ترحيل أموال</span>
                </div>
                <Input
                  data-testid="input-fund-amount"
                  type="number"
                  placeholder="المبلغ"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleFundTransfer(); }}
                  className="h-8 w-32 text-xs font-mono text-center"
                  min="0"
                  dir="ltr"
                />
                <Button
                  data-testid="button-fund-transfer"
                  size="sm"
                  onClick={handleFundTransfer}
                  disabled={isSendingFund || !fundAmount}
                  className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
                >
                  {isSendingFund ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  ترحيل
                </Button>
                <span className="text-[9px] text-muted-foreground">
                  من {projects.find(p => p.id === sourceProjectId)?.name || "المصدر"} → {projects.find(p => p.id === targetProjectId)?.name || "الهدف"} | {formatDate(currentDate)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {sourceProjectId && targetProjectId ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {renderProjectColumn(
                projects.find(p => p.id === sourceProjectId)?.name || "المصدر",
                sourceRecords,
                sourceLoading,
                "source",
                sourceSummary,
                sourceFinancial
              )}
              {renderProjectColumn(
                projects.find(p => p.id === targetProjectId)?.name || "الهدف",
                targetRecords,
                targetLoading,
                "target",
                targetSummary,
                targetFinancial
              )}
            </div>

            {selectedIds.size > 0 && !isPreview && (
              <Card className="bg-blue-500/5 border-blue-500/20 sticky bottom-2 z-10 shadow-lg">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600 text-white text-[10px] h-6 px-2">
                        {selectedIds.size} سجل محدد
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        إجمالي: <span className="font-mono font-bold text-foreground">
                          {formatCurrency(
                            sourceRecords
                              .filter(r => selectedIds.has(`${r.table}:${r.id}`))
                              .reduce((s, r) => s + r.amount, 0)
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedIds(new Set()); setSelectedRecords([]); }}
                        className="text-[10px] h-8"
                      >
                        إلغاء
                      </Button>
                      <Button
                        data-testid="button-preview-transfer"
                        onClick={handlePreview}
                        disabled={isPreviewing}
                        className="gap-1.5 h-8 text-xs"
                      >
                        {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                        معاينة النقل
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isPreview && previewData && (
              <Card className="bg-card border-2 border-blue-500/30 sticky bottom-2 z-10 shadow-lg">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                    <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    معاينة النقل
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-3">
                  <div className={`grid gap-2 ${previewData.crossWarnings?.length > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
                    <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{previewData.transferableCount}</p>
                      <p className="text-[9px] text-muted-foreground">جاهز للنقل</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{previewData.duplicateCount}</p>
                      <p className="text-[9px] text-muted-foreground">مكرر</p>
                    </div>
                    {previewData.crossWarnings?.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 text-center">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{previewData.crossWarnings.length}</p>
                        <p className="text-[9px] text-muted-foreground">تحذير مبالغ</p>
                      </div>
                    )}
                    <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                      <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{formatCurrency(previewData.totalAmount)}</p>
                      <p className="text-[9px] text-muted-foreground">المبلغ</p>
                    </div>
                  </div>

                  {previewData.duplicates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <FileWarning className="h-3.5 w-3.5" />
                        سجلات مكررة ({previewData.duplicates.length})
                      </p>
                      <ScrollArea className="max-h-[250px]">
                        <div className="space-y-2">
                          {previewData.duplicates.map(d => renderDuplicateDetail(d))}
                        </div>
                      </ScrollArea>
                      <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-[10px] text-muted-foreground w-full mb-1">خيارات التعامل مع المكرر:</p>
                        <Button
                          data-testid="button-force-transfer"
                          variant="outline"
                          size="sm"
                          onClick={handleForceTransfer}
                          disabled={isForceTransferring || isDeleting}
                          className="text-[10px] h-7 gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                        >
                          {isForceTransferring ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldAlert className="h-3 w-3" />}
                          نقل إجباري من المصدر
                        </Button>
                        <Button
                          data-testid="button-delete-source-dup"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDuplicates("source")}
                          disabled={isDeleting || isForceTransferring}
                          className="text-[10px] h-7 gap-1 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        >
                          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          حذف المكرر من المصدر
                        </Button>
                        <Button
                          data-testid="button-delete-target-dup"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDuplicates("target")}
                          disabled={isDeleting || isForceTransferring}
                          className="text-[10px] h-7 gap-1 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                        >
                          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          حذف المكرر من الهدف
                        </Button>
                      </div>
                    </div>
                  )}

                  {previewData.crossWarnings && previewData.crossWarnings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        تحذير: عمال استلموا مبالغ من مشاريع أخرى بنفس اليوم ({previewData.crossWarnings.length})
                      </p>
                      <ScrollArea className="max-h-[250px]">
                        <div className="space-y-2">
                          {previewData.crossWarnings.map((cw) => (
                            <div key={cw.recordId} className="p-2.5 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-1.5" data-testid={`cross-warning-${cw.recordId}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-foreground">{cw.workerName}</span>
                                <Badge variant="outline" className="text-[8px] h-4 border-orange-500/30 text-orange-600">{cw.tableLabel}</Badge>
                              </div>
                              <div className="text-[9px] text-muted-foreground">
                                المبلغ الحالي: <span className="font-mono font-bold text-foreground">{formatCurrency(cw.recordAmount)}</span>
                              </div>
                              <div className="space-y-1 mt-1">
                                <p className="text-[9px] font-semibold text-orange-600 dark:text-orange-400">مدفوعات من مشاريع أخرى:</p>
                                {cw.otherPayments.map((op, idx) => (
                                  <div key={idx} className="flex items-center justify-between px-2 py-1 rounded bg-background/60 border border-border/50">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-foreground font-medium">{op.projectName}</span>
                                      <span className="text-[8px] text-muted-foreground">({op.tableLabel})</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400">{formatCurrency(op.amount)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-orange-500/20">
                                <span className="text-[9px] text-muted-foreground">إجمالي من مشاريع أخرى:</span>
                                <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400">{formatCurrency(cw.totalOtherAmount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setIsPreview(false); setPreviewData(null); }}
                      data-testid="button-cancel-preview"
                    >
                      إلغاء
                    </Button>
                    {previewData.transferableCount > 0 && (
                      <Button
                        data-testid="button-confirm-transfer"
                        size="sm"
                        onClick={handleConfirm}
                        disabled={isTransferring}
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                      >
                        {isTransferring ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        تأكيد نقل {previewData.transferableCount} سجل
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center text-muted-foreground">
              <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">اختر المشروع المصدر والمشروع الهدف للبدء</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
