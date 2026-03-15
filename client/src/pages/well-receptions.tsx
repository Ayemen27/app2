import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { createProfessionalReport } from "@/utils/axion-export";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Download,
  Plus,
  Edit,
  Trash2,
  Loader,
  RefreshCw,
} from "lucide-react";

const INSPECTION_STATUSES = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "passed", label: "مقبول" },
  { value: "failed", label: "مرفوض" },
];

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

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
    region: "all",
    receptionStatus: "all",
    status: "all",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showReceptionDialog, setShowReceptionDialog] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [editingReceptionId, setEditingReceptionId] = useState<number | null>(null);
  const [receptionForm, setReceptionForm] = useState({
    receiverName: "",
    inspectionStatus: "pending",
    inspectionNotes: "",
    notes: "",
  });

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue("");
    setFilterValues({ region: "all", receptionStatus: "all", status: "all" });
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

  useEffect(() => {
    const handleFloatingAction = () => {
      if (wellsData.length > 0) {
        setSelectedWellId(wellsData[0].id);
        setEditingReceptionId(null);
        setReceptionForm({ receiverName: "", inspectionStatus: "pending", inspectionNotes: "", notes: "" });
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

      return matchesSearch && matchesRegion && matchesReceptionStatus && matchesStatus;
    });
  }, [wellsData, searchValue, filterValues]);

  const stats = useMemo(() => {
    const total = wellsData.length;
    let received = 0;
    let passed = 0;
    let failed = 0;
    let pendingCount = 0;

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
      columns: 5,
      gap: "sm",
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
      key: "region",
      label: "المنطقة",
      type: "select",
      placeholder: "اختر المنطقة",
      options: [{ value: "all", label: "جميع المناطق" }, ...REGIONS.map((r) => ({ value: r, label: r }))],
      defaultValue: "all",
    },
    {
      key: "status",
      label: "حالة البئر",
      type: "select",
      placeholder: "اختر الحالة",
      options: [
        { value: "all", label: "جميع الحالات" },
        { value: "pending", label: "لم يبدأ" },
        { value: "in_progress", label: "قيد التنفيذ" },
        { value: "completed", label: "منجز" },
      ],
      defaultValue: "all",
    },
    {
      key: "receptionStatus",
      label: "حالة الاستلام",
      type: "select",
      placeholder: "اختر حالة الاستلام",
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
          inspectionStatus: statusLabel,
          inspectionNotes: latestReception?.inspectionNotes || latestReception?.inspection_notes || "-",
          receivedAt: latestReception?.receivedAt || latestReception?.received_at
            ? new Date(latestReception.receivedAt || latestReception.received_at).toLocaleDateString("en-GB")
            : "-",
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
          { header: "حالة الفحص", key: "inspectionStatus", width: 14 },
          { header: "ملاحظات الفحص", key: "inspectionNotes", width: 25 },
          { header: "تاريخ الاستلام", key: "receivedAt", width: 14 },
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

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: "export-excel",
      icon: Download,
      label: "تصدير Excel",
      onClick: handleExportExcel,
      variant: "outline",
      loading: isExporting,
      disabled: filteredWells.length === 0,
      tooltip: "تصدير سجلات الاستلام إلى ملف Excel",
    },
  ], [handleExportExcel, isExporting, filteredWells.length]);

  const resultsSummary = useMemo(() => ({
    totalCount: wellsData.length,
    filteredCount: filteredWells.length,
    totalLabel: "إجمالي الآبار",
    filteredLabel: "نتائج البحث",
  }), [wellsData.length, filteredWells.length]);

  const resetReceptionForm = () => {
    setReceptionForm({ receiverName: "", inspectionStatus: "pending", inspectionNotes: "", notes: "" });
    setEditingReceptionId(null);
    setSelectedWellId(null);
    setShowReceptionDialog(false);
  };

  const openAddReception = (wellId: number) => {
    setSelectedWellId(wellId);
    setEditingReceptionId(null);
    setReceptionForm({ receiverName: "", inspectionStatus: "pending", inspectionNotes: "", notes: "" });
    setShowReceptionDialog(true);
  };

  const openEditReception = (wellId: number, reception: any) => {
    setSelectedWellId(wellId);
    setEditingReceptionId(reception.id);
    setReceptionForm({
      receiverName: reception.receiverName || reception.receiver_name || "",
      inspectionStatus: reception.inspectionStatus || reception.inspection_status || "pending",
      inspectionNotes: reception.inspectionNotes || reception.inspection_notes || "",
      notes: reception.notes || "",
    });
    setShowReceptionDialog(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: { wellId: number; form: any }) => {
      return apiRequest(`/api/wells/${data.wellId}/receptions`, "POST", {
        ...data.form,
        well_id: data.wellId,
      });
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

  const getStatusLabel = (status: string) => {
    return INSPECTION_STATUSES.find((s) => s.value === status)?.label || "بانتظار";
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" => {
    if (status === "passed") return "default";
    if (status === "failed") return "destructive";
    return "outline";
  };

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

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredWells.length === 0 ? (
        <Card className="p-8">
          <p className="text-center text-muted-foreground" data-testid="text-no-receptions-data">
            لا توجد بيانات استلام للعرض
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredWells.map((well: WellFullData) => {
            const latestReception = well.receptions?.[0];
            const status = latestReception?.inspectionStatus || latestReception?.inspection_status || "";
            const allReceptions = well.receptions || [];

            return (
              <Card key={well.id} className="p-4" data-testid={`card-well-reception-${well.id}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" data-testid={`text-well-number-${well.id}`}>
                        بئر #{well.wellNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">-</span>
                      <span className="text-sm" data-testid={`text-well-owner-${well.id}`}>
                        {well.ownerName}
                      </span>
                      <Badge variant="outline" data-testid={`badge-well-region-${well.id}`}>
                        {well.region}
                      </Badge>
                      {status && (
                        <Badge
                          variant={getStatusVariant(status)}
                          data-testid={`badge-reception-status-${well.id}`}
                        >
                          {getStatusLabel(status)}
                        </Badge>
                      )}
                      {!status && (
                        <Badge variant="outline" data-testid={`badge-reception-none-${well.id}`}>
                          لم يتم الاستلام
                        </Badge>
                      )}
                    </div>

                    {allReceptions.length > 0 ? (
                      <div className="space-y-2">
                        {allReceptions.map((rec: any) => (
                          <div
                            key={rec.id}
                            className="border rounded-md p-3 space-y-1"
                            data-testid={`reception-record-${rec.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium" data-testid={`text-receiver-${rec.id}`}>
                                  المستلم: {rec.receiverName || rec.receiver_name || "-"}
                                </span>
                                <Badge
                                  variant={getStatusVariant(rec.inspectionStatus || rec.inspection_status || "pending") as any}
                                  data-testid={`badge-rec-status-${rec.id}`}
                                >
                                  {getStatusLabel(rec.inspectionStatus || rec.inspection_status || "pending")}
                                </Badge>
                                {(rec.receivedAt || rec.received_at) && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(rec.receivedAt || rec.received_at).toLocaleDateString("ar-SA")}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditReception(well.id, rec)}
                                  data-testid={`button-edit-reception-${rec.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("هل أنت متأكد من حذف سجل الاستلام؟"))
                                      deleteMutation.mutate(rec.id);
                                  }}
                                  data-testid={`button-delete-reception-${rec.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {(rec.inspectionNotes || rec.inspection_notes) && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-inspection-notes-${rec.id}`}>
                                ملاحظات الفحص: {rec.inspectionNotes || rec.inspection_notes}
                              </p>
                            )}
                            {rec.notes && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-reception-notes-${rec.id}`}>
                                ملاحظات عامة: {rec.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid={`text-no-reception-${well.id}`}>
                        لا توجد سجلات استلام لهذا البئر
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAddReception(well.id)}
                    data-testid={`button-add-reception-${well.id}`}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    تسجيل استلام
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showReceptionDialog} onOpenChange={() => resetReceptionForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-reception-dialog-title">
              {editingReceptionId ? "تعديل سجل استلام" : "تسجيل استلام جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">اسم المستلم *</Label>
                <Input
                  value={receptionForm.receiverName}
                  onChange={(e) => setReceptionForm({ ...receptionForm, receiverName: e.target.value })}
                  placeholder="اسم المستلم"
                  data-testid="input-reception-receiver-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">حالة الفحص *</Label>
                <SearchableSelect
                  value={receptionForm.inspectionStatus}
                  onValueChange={(v) => setReceptionForm({ ...receptionForm, inspectionStatus: v })}
                  options={INSPECTION_STATUSES}
                  placeholder="اختر حالة الفحص"
                  data-testid="select-reception-inspection-status"
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
                  : editingReceptionId
                    ? "تحديث"
                    : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
