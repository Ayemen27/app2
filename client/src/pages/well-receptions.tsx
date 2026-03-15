import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { createProfessionalReport } from "@/utils/axion-export";
import { format, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import {
  ClipboardCheck, CheckCircle, XCircle, Clock, BarChart3, Download, Plus, Edit, Trash2, Loader,
  MapPin, Calendar, UserCheck, Users, Wrench, TrendingUp, ChevronRight, ChevronLeft, ArrowUpDown, FileText
} from "lucide-react";

const WELL_STATUS_MAP: Record<string, { label: string; color: string; badgeClass: string }> = {
  pending: { label: 'لم يبدأ', color: '#9ca3af', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  in_progress: { label: 'قيد التنفيذ', color: '#f59e0b', badgeClass: 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600' },
  completed: { label: 'منجز', color: '#22c55e', badgeClass: 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600' },
};

function toDateInputValue(val: any): string {
  if (!val) return "";
  const str = String(val);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function formatDateSafe(val: any, locale = "ar-SA"): string {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(locale);
}

const INSPECTION_STATUSES = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "passed", label: "مقبول" },
  { value: "failed", label: "مرفوض" },
];

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

const STATUS_COLOR_MAP: Record<string, string> = {
  passed: "green",
  failed: "red",
  pending: "orange",
};

interface WellFullData {
  id: number;
  project_id: string;
  wellNumber: number;
  ownerName: string;
  region: string;
  numberOfBases: number;
  numberOfPanels: number;
  wellDepth: number;
  waterLevel?: number;
  numberOfPipes: number;
  status: string;
  receptions: any[];
}

export default function WellReceptionsPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    region: "all", receptionStatus: "all", status: "all",
  });
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showReceptionDialog, setShowReceptionDialog] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [editingReceptionId, setEditingReceptionId] = useState<number | null>(null);
  const [receptionForm, setReceptionForm] = useState({
    receiverName: "",
    inspectionStatus: "pending",
    inspectionNotes: "",
    receptionDate: "",
    engineers: "",
    notes: "",
  });

  const [showAddStatusDialog, setShowAddStatusDialog] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [customStatuses, setCustomStatuses] = useState<Array<{value: string; label: string}>>([]);
  const [showAddReceiverDialog, setShowAddReceiverDialog] = useState(false);
  const [newReceiverName, setNewReceiverName] = useState("");
  const [customReceiverNames, setCustomReceiverNames] = useState<string[]>([]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue("");
    setFilterValues({ region: "all", receptionStatus: "all", status: "all" });
    setSelectedDate(undefined);
  }, []);

  const nextDate = useCallback(() => {
    if (!selectedDate) return;
    const date = addDays(new Date(selectedDate), 1);
    setSelectedDate(format(date, "yyyy-MM-dd"));
  }, [selectedDate]);

  const prevDate = useCallback(() => {
    if (!selectedDate) return;
    const date = subDays(new Date(selectedDate), 1);
    setSelectedDate(format(date, "yyyy-MM-dd"));
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }, []);

  const { data: wellsData = [], isLoading, isFetching } = useQuery({
    queryKey: ["wells-full-data", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId || selectedProjectId === "all") {
        const res = await apiRequest("/api/wells/export/full-data");
        return res.data || [];
      }
      const res = await apiRequest(`/api/wells/export/full-data?project_id=${selectedProjectId}`);
      return res.data || [];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000,
  });

  const receiverNameOptions = useMemo(() => {
    const names = new Set<string>();
    (wellsData as WellFullData[]).forEach(w => {
      (w.receptions || []).forEach((r: any) => {
        const name = r.receiverName || r.receiver_name;
        if (name) names.add(name);
      });
    });
    customReceiverNames.forEach(n => names.add(n));
    return Array.from(names).sort().map(n => ({ value: n, label: n }));
  }, [wellsData, customReceiverNames]);

  const allInspectionStatuses = useMemo(() => {
    const base = [...INSPECTION_STATUSES];
    customStatuses.forEach(cs => {
      if (!base.some(b => b.value === cs.value)) base.push(cs);
    });
    return base;
  }, [customStatuses]);

  useEffect(() => {
    const handleFloatingAction = () => {
      if (wellsData.length > 0) {
        setSelectedWellId(wellsData[0].id);
        setEditingReceptionId(null);
        setReceptionForm({ receiverName: "", inspectionStatus: "pending", inspectionNotes: "", receptionDate: "", engineers: "", notes: "" });
        setShowReceptionDialog(true);
      } else {
        toast({ title: "لا توجد آبار", description: "يرجى إضافة آبار أولاً", variant: "destructive" });
      }
    };
    setFloatingAction(handleFloatingAction, '+ استلام جديد');
    return () => { setFloatingAction(null); };
  }, [setFloatingAction, wellsData]);

  const filteredWells = useMemo(() => {
    return wellsData.filter((well: WellFullData) => {
      const matchesSearch =
        well.ownerName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        well.wellNumber?.toString().includes(searchValue);
      const matchesRegion = filterValues.region === "all" || well.region === filterValues.region;
      const matchesStatus = filterValues.status === "all" || well.status === filterValues.status;

      const latestReception = well.receptions?.[0];
      const receptionStatus = latestReception?.inspectionStatus || latestReception?.inspection_status || null;

      let matchesReceptionStatus = true;
      if (filterValues.receptionStatus === "pending") {
        matchesReceptionStatus = receptionStatus === "pending" || !receptionStatus;
      } else if (filterValues.receptionStatus === "passed") {
        matchesReceptionStatus = receptionStatus === "passed";
      } else if (filterValues.receptionStatus === "failed") {
        matchesReceptionStatus = receptionStatus === "failed";
      }

      let matchesDate = true;
      if (selectedDate) {
        const recDates = (well.receptions || []).map((r: any) =>
          r.receptionDate || r.reception_date || r.receivedAt || r.received_at
        ).filter(Boolean);
        if (recDates.length === 0) {
          matchesDate = false;
        } else {
          matchesDate = recDates.some((d: string) => {
            const dateStr = toDateInputValue(d);
            return dateStr === selectedDate;
          });
        }
      }

      return matchesSearch && matchesRegion && matchesReceptionStatus && matchesStatus && matchesDate;
    });
  }, [wellsData, searchValue, filterValues, selectedDate]);

  const stats = useMemo(() => {
    const total = wellsData.length;
    let received = 0, passed = 0, failed = 0, pendingCount = 0;
    for (const well of wellsData) {
      const latestReception = well.receptions?.[0];
      const status = latestReception?.inspectionStatus || latestReception?.inspection_status;
      if (status === "passed") { passed++; received++; }
      else if (status === "failed") { failed++; received++; }
      else if (status === "pending") { pendingCount++; received++; }
      else { pendingCount++; }
    }
    return { total, received, passed, failed, pending: pendingCount };
  }, [wellsData]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 5, gap: "sm",
      items: [
        { key: "total", label: "إجمالي الآبار", value: stats.total, icon: BarChart3, color: "blue" },
        { key: "received", label: "تم استلامها", value: stats.received, icon: ClipboardCheck, color: "indigo" },
        { key: "passed", label: "مقبولة", value: stats.passed, icon: CheckCircle, color: "green" },
        { key: "failed", label: "مرفوضة", value: stats.failed, icon: XCircle, color: "red" },
        { key: "pending", label: "بانتظار", value: stats.pending, icon: Clock, color: "orange" },
      ],
    },
  ], [stats]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: "region", label: "المنطقة", type: "select", placeholder: "اختر المنطقة",
      options: [{ value: "all", label: "جميع المناطق" }, ...REGIONS.map((r) => ({ value: r, label: r }))],
      defaultValue: "all",
    },
    {
      key: "status", label: "حالة البئر", type: "select", placeholder: "اختر الحالة",
      options: [
        { value: "all", label: "جميع الحالات" },
        { value: "pending", label: "لم يبدأ", dotColor: "#9ca3af" },
        { value: "in_progress", label: "قيد التنفيذ", dotColor: "#f59e0b" },
        { value: "completed", label: "منجز", dotColor: "#22c55e" },
      ],
      defaultValue: "all",
    },
    {
      key: "receptionStatus", label: "حالة الاستلام", type: "select", placeholder: "اختر حالة الاستلام",
      options: [
        { value: "all", label: "جميع الحالات" },
        { value: "pending", label: "بانتظار" },
        { value: "passed", label: "مقبول" },
        { value: "failed", label: "مرفوض" },
      ],
      defaultValue: "all",
    },
  ], []);

  const handleExportExcel = useCallback(async () => {
    if (filteredWells.length === 0) return;
    setIsExporting(true);
    try {
      const data = filteredWells.map((well: WellFullData, idx: number) => {
        const latestReception = well.receptions?.[0];
        const status = latestReception?.inspectionStatus || latestReception?.inspection_status || "";
        const statusLabel = INSPECTION_STATUSES.find((s) => s.value === status)?.label || "بانتظار";
        return {
          index: idx + 1,
          wellNumber: well.wellNumber,
          ownerName: well.ownerName,
          region: well.region || "-",
          receiverName: latestReception?.receiverName || latestReception?.receiver_name || "-",
          engineers: latestReception?.engineers || "-",
          inspectionStatus: statusLabel,
          inspectionNotes: latestReception?.inspectionNotes || latestReception?.inspection_notes || "-",
          receptionDate: formatDateSafe(latestReception?.receptionDate || latestReception?.reception_date, "en-GB"),
          notes: latestReception?.notes || "-",
        };
      });
      const success = await createProfessionalReport({
        sheetName: "سجلات الاستلام",
        reportTitle: "تقرير سجلات استلام الآبار",
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString("en-GB")}`,
        infoLines: [
          `إجمالي الآبار: ${data.length}`,
          `مقبولة: ${stats.passed}`,
          `مرفوضة: ${stats.failed}`,
          `بانتظار: ${stats.pending}`,
        ],
        columns: [
          { header: "#", key: "index", width: 5 },
          { header: "رقم البئر", key: "wellNumber", width: 10 },
          { header: "اسم المستفيد", key: "ownerName", width: 20 },
          { header: "المنطقة", key: "region", width: 14 },
          { header: "اسم المستلم", key: "receiverName", width: 18 },
          { header: "المهندسين", key: "engineers", width: 20 },
          { header: "حالة الفحص", key: "inspectionStatus", width: 14 },
          { header: "ملاحظات الفحص", key: "inspectionNotes", width: 25 },
          { header: "تاريخ الاستلام", key: "receptionDate", width: 14 },
          { header: "ملاحظات عامة", key: "notes", width: 20 },
        ],
        data,
        fileName: `سجلات_استلام_الآبار_${new Date().toISOString().split("T")[0]}.xlsx`,
      });
      if (success) toast({ title: "نجاح", description: "تم تصدير ملف Excel بنجاح" });
      else toast({ title: "خطأ", description: "فشل في تصدير ملف Excel", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل في تصدير ملف Excel", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [filteredWells, stats, toast]);

  const receptionColumns = [
    { header: "#", key: "index", width: 5 },
    { header: "رقم البئر", key: "wellNumber", width: 10 },
    { header: "اسم المستفيد", key: "ownerName", width: 20 },
    { header: "المنطقة", key: "region", width: 14 },
    { header: "اسم المستلم", key: "receiverName", width: 18 },
    { header: "المهندسين", key: "engineers", width: 20 },
    { header: "حالة الفحص", key: "inspectionStatus", width: 14 },
    { header: "ملاحظات الفحص", key: "inspectionNotes", width: 25 },
    { header: "تاريخ الاستلام", key: "receptionDate", width: 14 },
    { header: "ملاحظات عامة", key: "notes", width: 20 },
  ];

  const handleExportPdf = useCallback(async () => {
    if (filteredWells.length === 0) return;
    setIsExportingPdf(true);
    try {
      const { generateTablePDF } = await import("@/utils/pdfGenerator");
      const data = filteredWells.map((well: WellFullData, idx: number) => {
        const latestReception = well.receptions?.[0];
        const status = latestReception?.inspectionStatus || latestReception?.inspection_status || "";
        const statusLabel = INSPECTION_STATUSES.find((s) => s.value === status)?.label || "بانتظار";
        return {
          index: idx + 1,
          wellNumber: well.wellNumber,
          ownerName: well.ownerName,
          region: well.region || "-",
          receiverName: latestReception?.receiverName || latestReception?.receiver_name || "-",
          engineers: latestReception?.engineers || "-",
          inspectionStatus: statusLabel,
          inspectionNotes: latestReception?.inspectionNotes || latestReception?.inspection_notes || "-",
          receptionDate: formatDateSafe(latestReception?.receptionDate || latestReception?.reception_date, "en-GB"),
          notes: latestReception?.notes || "-",
        };
      });
      const success = await generateTablePDF({
        reportTitle: "تقرير سجلات استلام الآبار",
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString("en-GB")}`,
        infoItems: [
          { label: "إجمالي الآبار", value: data.length },
          { label: "مقبولة", value: stats.passed, color: "#16a34a" },
          { label: "مرفوضة", value: stats.failed, color: "#dc2626" },
          { label: "بانتظار", value: stats.pending, color: "#ca8a04" },
        ],
        columns: receptionColumns,
        data,
        filename: `سجلات_استلام_الآبار_${new Date().toISOString().split("T")[0]}`,
        orientation: "landscape",
      });
      if (success) toast({ title: "نجاح", description: "تم تصدير تقرير PDF بنجاح" });
      else toast({ title: "خطأ", description: "فشل في تصدير تقرير PDF", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل في تصدير PDF", variant: "destructive" });
    } finally { setIsExportingPdf(false); }
  }, [filteredWells, stats, toast]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: "export-pdf", icon: FileText, label: "تصدير PDF",
      onClick: handleExportPdf, variant: "outline",
      loading: isExportingPdf, disabled: filteredWells.length === 0,
      tooltip: "تصدير سجلات الاستلام إلى ملف PDF",
    },
    {
      key: "export-excel", icon: Download, label: "تصدير Excel",
      onClick: handleExportExcel, variant: "outline",
      loading: isExporting, disabled: filteredWells.length === 0,
      tooltip: "تصدير سجلات الاستلام إلى ملف Excel",
    },
  ], [handleExportExcel, handleExportPdf, isExporting, isExportingPdf, filteredWells.length]);

  const resultsSummary = useMemo(() => ({
    totalCount: wellsData.length,
    filteredCount: filteredWells.length,
    totalLabel: "إجمالي الآبار",
    filteredLabel: "نتائج البحث",
  }), [wellsData.length, filteredWells.length]);

  const resetReceptionForm = () => {
    setReceptionForm({ receiverName: "", inspectionStatus: "pending", inspectionNotes: "", receptionDate: "", engineers: "", notes: "" });
    setEditingReceptionId(null);
    setSelectedWellId(null);
    setShowReceptionDialog(false);
  };

  const openAddReception = (wellId: number) => {
    setSelectedWellId(wellId);
    setEditingReceptionId(null);
    setReceptionForm({ receiverName: "", inspectionStatus: "pending", inspectionNotes: "", receptionDate: "", engineers: "", notes: "" });
    setShowReceptionDialog(true);
  };

  const openEditReception = (wellId: number, reception: any) => {
    setSelectedWellId(wellId);
    setEditingReceptionId(reception.id);
    setReceptionForm({
      receiverName: reception.receiverName || reception.receiver_name || "",
      inspectionStatus: reception.inspectionStatus || reception.inspection_status || "pending",
      inspectionNotes: reception.inspectionNotes || reception.inspection_notes || "",
      receptionDate: toDateInputValue(reception.receptionDate || reception.reception_date),
      engineers: reception.engineers || "",
      notes: reception.notes || "",
    });
    setShowReceptionDialog(true);
  };

  const changeStatusMutation = useMutation({
    mutationFn: async ({ wellId, status }: { wellId: number; status: string }) =>
      apiRequest(`/api/wells/${wellId}`, 'PUT', { status, project_id: selectedProjectId }),
    onSuccess: (_data, variables) => {
      const statusLabel = WELL_STATUS_MAP[variables.status]?.label || variables.status;
      toast({ title: "نجاح", description: `تم تغيير حالة البئر إلى "${statusLabel}"` });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: error.message || "فشل في تغيير حالة البئر", variant: "destructive" }); }
  });

  const deleteWellMutation = useMutation({
    mutationFn: async (wellId: number) => apiRequest(`/api/wells/${wellId}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف البئر بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: error.message || "فشل في حذف البئر", variant: "destructive" }); }
  });

  const createMutation = useMutation({
    mutationFn: async (data: { wellId: number; form: any }) => {
      return apiRequest(`/api/wells/${data.wellId}/receptions`, "POST", { ...data.form, well_id: data.wellId });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تسجيل الاستلام بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      resetReceptionForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في تسجيل الاستلام", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { receptionId: number; form: any }) => {
      return apiRequest(`/api/wells/receptions/${data.receptionId}`, "PUT", data.form);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تحديث سجل الاستلام بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      resetReceptionForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في تحديث سجل الاستلام", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (receptionId: number) => {
      return apiRequest(`/api/wells/receptions/${receptionId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف سجل الاستلام" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في الحذف", variant: "destructive" });
    },
  });

  const getStatusLabel = (status: string) =>
    INSPECTION_STATUSES.find((s) => s.value === status)?.label || "بانتظار";

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" => {
    if (status === "passed") return "default";
    if (status === "failed") return "destructive";
    return "outline";
  };

  const wellOptions = useMemo(() => {
    return (wellsData as WellFullData[]).map(w => ({
      value: String(w.id),
      label: `بئر #${w.wellNumber} - ${w.ownerName}`,
    }));
  }, [wellsData]);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <UnifiedFilterDashboard
        hideHeader
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="بحث بالاسم أو رقم البئر..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["wells-full-data"] })}
        isRefreshing={isFetching}
        actions={actionsConfig}
        resultsSummary={resultsSummary}
      />

      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mx-auto w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={prevDate}
          title="اليوم السابق"
          disabled={!selectedDate}
          data-testid="button-prev-date"
        >
          <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Button>
        
        <div className="flex flex-col items-center flex-1 cursor-pointer" onClick={goToToday} data-testid="button-today">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">سجل الاستلام</span>
          <span className="text-sm font-black text-slate-900 dark:text-white arabic-numbers flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {selectedDate
              ? format(new Date(selectedDate), "EEEE, d MMMM yyyy", { locale: ar })
              : "جميع التواريخ"}
          </span>
          {!selectedDate && (
            <span className="text-[9px] text-primary font-medium">اضغط للانتقال لليوم</span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={nextDate}
          title="اليوم التالي"
          disabled={!selectedDate}
          data-testid="button-next-date"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Button>
      </div>
      {selectedDate && (
        <div className="flex justify-center">
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setSelectedDate(undefined)}
            data-testid="button-clear-date"
          >
            عرض جميع التواريخ
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredWells.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-gray-500 text-lg" data-testid="text-no-receptions-data">لا توجد بيانات استلام للعرض</p>
        </div>
      ) : (
        <UnifiedCardGrid columns={2}>
          {filteredWells.map((well: WellFullData) => {
            const latestReception = well.receptions?.[0];
            const status = latestReception?.inspectionStatus || latestReception?.inspection_status || "";
            const allReceptions = well.receptions || [];
            const hasReceptions = allReceptions.length > 0;

            return (
              <UnifiedCard
                key={well.id}
                data-testid={`card-well-reception-${well.id}`}
                title={`بئر #${well.wellNumber} - ${well.ownerName}`}
                subtitle={well.region}
                titleIcon={MapPin}
                headerColor={WELL_STATUS_MAP[well.status]?.color || '#9ca3af'}
                badges={[
                  { label: WELL_STATUS_MAP[well.status]?.label || 'لم يبدأ', className: WELL_STATUS_MAP[well.status]?.badgeClass || WELL_STATUS_MAP.pending.badgeClass },
                  ...(status ? [{
                    label: getStatusLabel(status),
                    variant: getStatusVariant(status) as any,
                  }] : [{
                    label: "لم يتم الاستلام",
                    variant: "outline" as any,
                  }]),
                ]}
                fields={[
                  { label: "المنطقة", value: well.region || "-", icon: MapPin, color: "info" as const },
                  { label: "العمق", value: `${well.wellDepth || 0}م`, icon: TrendingUp, color: "warning" as const },
                  { label: "الألواح", value: well.numberOfPanels || 0, icon: BarChart3, color: "success" as const },
                  { label: "القواعد", value: well.numberOfBases || 0, icon: Wrench, color: "info" as const },
                  { label: "تاريخ الاستلام", value: formatDateSafe(latestReception?.receptionDate || latestReception?.reception_date || latestReception?.receivedAt || latestReception?.received_at), icon: Calendar, color: hasReceptions ? "success" as const : "muted" as const },
                  { label: "سجلات الاستلام", value: allReceptions.length, icon: ClipboardCheck, color: hasReceptions ? "success" as const : "info" as const },
                ]}
                footer={
                  <div className="space-y-2 pt-1">
                    {hasReceptions ? (
                      allReceptions.map((rec: any) => {
                        const recStatus = rec.inspectionStatus || rec.inspection_status || "pending";
                        const recDate = rec.receptionDate || rec.reception_date || rec.receivedAt || rec.received_at;
                        const recEngineers = rec.engineers;
                        return (
                          <div key={rec.id} className="border rounded-lg p-3 space-y-2 bg-muted/30" data-testid={`reception-record-${rec.id}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={getStatusVariant(recStatus) as any} className="text-xs" data-testid={`badge-rec-status-${rec.id}`}>
                                  {getStatusLabel(recStatus)}
                                </Badge>
                                {recDate && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-reception-date-${rec.id}`}>
                                    <Calendar className="h-3 w-3" />
                                    {formatDateSafe(recDate)}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditReception(well.id, rec)} data-testid={`button-edit-reception-${rec.id}`}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("هل أنت متأكد من حذف سجل الاستلام؟")) deleteMutation.mutate(rec.id); }} data-testid={`button-delete-reception-${rec.id}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <span className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-blue-500" />
                                المستلم: <b className="text-foreground">{rec.receiverName || rec.receiver_name || "-"}</b>
                              </span>
                              {recEngineers && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-indigo-500" />
                                  المهندسين: <b className="text-foreground">{recEngineers}</b>
                                </span>
                              )}
                            </div>
                            {(rec.inspectionNotes || rec.inspection_notes) && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-inspection-notes-${rec.id}`}>
                                ملاحظات الفحص: {rec.inspectionNotes || rec.inspection_notes}
                              </p>
                            )}
                            {rec.notes && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-reception-notes-${rec.id}`}>
                                ملاحظات عامة: {rec.notes}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2" data-testid={`text-no-reception-${well.id}`}>
                        لا توجد سجلات استلام لهذا البئر
                      </p>
                    )}
                  </div>
                }
                actions={[
                  {
                    icon: Plus,
                    label: "تسجيل استلام",
                    onClick: () => openAddReception(well.id),
                    color: "blue",
                  },
                  {
                    icon: ArrowUpDown,
                    label: "تغيير الحالة",
                    onClick: () => {},
                    color: "yellow",
                    dropdown: Object.entries(WELL_STATUS_MAP)
                      .map(([key, val]) => ({
                        label: key === well.status ? `${val.label} ✓` : val.label,
                        onClick: () => { if (key !== well.status) changeStatusMutation.mutate({ wellId: well.id, status: key }); }
                      }))
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    onClick: () => {
                      if (confirm("هل أنت متأكد من حذف هذا البئر؟")) {
                        deleteWellMutation.mutate(well.id);
                      }
                    },
                    color: "red",
                  },
                ]}
              />
            );
          })}
        </UnifiedCardGrid>
      )}

      <Dialog open={showReceptionDialog} onOpenChange={() => resetReceptionForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-reception-dialog-title">
              {editingReceptionId ? "تعديل سجل استلام" : "تسجيل استلام جديد"}
            </DialogTitle>
          </DialogHeader>
          {!editingReceptionId && !selectedWellId && (
            <div className="space-y-1">
              <Label className="text-sm">البئر *</Label>
              <SearchableSelect
                value={selectedWellId ? String(selectedWellId) : ""}
                onValueChange={(v) => setSelectedWellId(Number(v))}
                options={wellOptions}
                placeholder="اختر البئر"
                data-testid="select-reception-well"
              />
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">اسم المستلم *</Label>
                <SearchableSelect
                  value={receptionForm.receiverName}
                  onValueChange={(v) => setReceptionForm({ ...receptionForm, receiverName: v })}
                  options={receiverNameOptions}
                  placeholder="اختر اسم المستلم"
                  searchPlaceholder="ابحث عن مستلم..."
                  allowCustom
                  onCustomAdd={(v) => {
                    setCustomReceiverNames(prev => prev.includes(v) ? prev : [...prev, v]);
                  }}
                  onAddNew={() => setShowAddReceiverDialog(true)}
                  addNewLabel="إضافة مستلم جديد"
                  data-testid="select-reception-receiver-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">حالة الفحص *</Label>
                <SearchableSelect
                  value={receptionForm.inspectionStatus}
                  onValueChange={(v) => setReceptionForm({ ...receptionForm, inspectionStatus: v })}
                  options={allInspectionStatuses}
                  placeholder="اختر حالة الفحص"
                  allowCustom
                  onCustomAdd={(v) => {
                    setCustomStatuses(prev => [...prev, { value: v, label: v }]);
                  }}
                  onAddNew={() => setShowAddStatusDialog(true)}
                  addNewLabel="إضافة حالة فحص جديدة"
                  data-testid="select-reception-inspection-status"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">تاريخ الاستلام</Label>
                <Input
                  type="date"
                  value={receptionForm.receptionDate}
                  onChange={(e) => setReceptionForm({ ...receptionForm, receptionDate: e.target.value })}
                  data-testid="input-reception-date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">المهندسين المكلفين</Label>
                <Input
                  value={receptionForm.engineers}
                  onChange={(e) => setReceptionForm({ ...receptionForm, engineers: e.target.value })}
                  placeholder="م. أحمد، م. خالد"
                  data-testid="input-reception-engineers"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-sm">ملاحظات الفحص</Label>
                <Input
                  value={receptionForm.inspectionNotes}
                  onChange={(e) => setReceptionForm({ ...receptionForm, inspectionNotes: e.target.value })}
                  placeholder="مثل: هبوط في القاعدة رقم 4، انحراف في الزاوية، مسامير غير مشطنه"
                  data-testid="input-reception-inspection-notes"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-sm">ملاحظات عامة</Label>
                <Input
                  value={receptionForm.notes}
                  onChange={(e) => setReceptionForm({ ...receptionForm, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية"
                  data-testid="input-reception-notes"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetReceptionForm} data-testid="button-cancel-reception">
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (editingReceptionId) {
                    updateMutation.mutate({ receptionId: editingReceptionId, form: receptionForm });
                  } else if (selectedWellId) {
                    createMutation.mutate({ wellId: selectedWellId, form: receptionForm });
                  }
                }}
                disabled={!receptionForm.receiverName || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-reception"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "جاري..."
                  : editingReceptionId ? "تحديث" : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddReceiverDialog} onOpenChange={setShowAddReceiverDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة مستلم جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm">اسم المستلم</Label><Input placeholder="مثال: م. أحمد" value={newReceiverName} onChange={(e) => setNewReceiverName(e.target.value)} data-testid="input-new-receiver-name" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAddReceiverDialog(false)}>إلغاء</Button>
            <Button size="sm" disabled={!newReceiverName.trim()} onClick={() => {
              const val = newReceiverName.trim();
              setCustomReceiverNames(prev => prev.includes(val) ? prev : [...prev, val]);
              setReceptionForm(f => ({ ...f, receiverName: val }));
              setNewReceiverName("");
              setShowAddReceiverDialog(false);
              toast({ title: "تم", description: `تمت إضافة المستلم "${val}"` });
            }} data-testid="button-save-new-receiver">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddStatusDialog} onOpenChange={setShowAddStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة حالة فحص جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm">اسم الحالة</Label><Input placeholder="مثال: تحت المراجعة" value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} data-testid="input-new-status" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAddStatusDialog(false)}>إلغاء</Button>
            <Button size="sm" disabled={!newStatusName.trim()} onClick={() => {
              const val = newStatusName.trim();
              setCustomStatuses(prev => [...prev, { value: val, label: val }]);
              setReceptionForm(f => ({ ...f, inspectionStatus: val }));
              setNewStatusName("");
              setShowAddStatusDialog(false);
              toast({ title: "تم", description: `تمت إضافة حالة الفحص "${val}"` });
            }} data-testid="button-save-new-status">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
