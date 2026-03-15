import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { Checkbox } from "@/components/ui/checkbox";
import { Sun, Download, Loader, BarChart3, Zap, Wrench, Edit, RefreshCw, MapPin, TrendingUp, CheckCircle, AlertCircle, XCircle, Clock, ArrowUpDown, Trash2 } from "lucide-react";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";

const INSTALLATION_STATUSES = [
  { value: "not_installed", label: "غير مركبة" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "partial", label: "مركب جزئياً" },
  { value: "installed", label: "مركب" },
  { value: "completed", label: "منجز" },
];

const INSTALLABLE_COMPONENTS = [
  { key: "inverter", label: "أنفرتر" },
  { key: "collectionBox", label: "صندوق تجميع" },
  { key: "carbonCarrier", label: "شيال كربون" },
  { key: "steelConverterTop", label: "تحويلة فوق استيل" },
  { key: "clampConverterBottom", label: "ملزمة تحت" },
  { key: "jointThermalLiquid", label: "جونتي سائل حراري" },
  { key: "groundingClip", label: "كليب تأريض" },
  { key: "groundingPlate", label: "صفيحة تأريض" },
  { key: "groundingRod", label: "سيخ تأريض" },
  { key: "submersiblePump", label: "غطاس" },
  { key: "panels", label: "ألواح شمسية" },
  { key: "pipes", label: "مواسير" },
  { key: "cables", label: "كيبلات" },
  { key: "fanCount", label: "مراوح" },
];

function getInstallationStatusLabel(status: string) {
  return INSTALLATION_STATUSES.find(s => s.value === status)?.label || "غير مركبة";
}

function getInstallationStatusColor(status: string) {
  switch (status) {
    case "not_installed": return "#9ca3af";
    case "in_progress": return "#f59e0b";
    case "partial": return "#3b82f6";
    case "installed": return "#22c55e";
    case "completed": return "#059669";
    default: return "#9ca3af";
  }
}

function getInstallationStatusBadgeClass(status: string) {
  switch (status) {
    case "not_installed": return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600";
    case "in_progress": return "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600";
    case "partial": return "bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600";
    case "installed": return "bg-green-100 text-green-800 border-green-400 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600";
    case "completed": return "bg-emerald-100 text-emerald-900 border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-500";
    default: return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600";
  }
}

function getInstallationStatusIcon(status: string) {
  switch (status) {
    case "not_installed": return XCircle;
    case "in_progress": return Clock;
    case "partial": return AlertCircle;
    case "installed": return CheckCircle;
    case "completed": return CheckCircle;
    default: return XCircle;
  }
}

const WELL_STATUS_MAP: Record<string, { label: string }> = {
  pending: { label: 'لم يبدأ' },
  in_progress: { label: 'قيد التنفيذ' },
  completed: { label: 'منجز' },
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
  fanType?: string;
  pumpPower?: number;
  status: string;
  notes?: string;
  solar?: any;
  crews?: any[];
  transport?: any[];
  receptions?: any[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "جميع الحالات" },
  { value: "pending", label: "لم يبدأ" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed", label: "منجز" },
];

const REGIONS = [
  "دار حمدين", "بيت الشعيب", "الشبيطا", "الحندج",
  "محيران", "جربياح", "الربعي", "بيت الزين",
];

export default function WellMaterialsPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { setFloatingAction } = useFloatingButton();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    region: "all",
    status: "all",
    depthRange: "all",
    hasSolar: "all",
  });
  const [editingWellId, setEditingWellId] = useState<number | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const changeStatusMutation = useMutation({
    mutationFn: async ({ wellId, status }: { wellId: number; status: string }) =>
      apiRequest(`/api/wells/${wellId}`, 'PUT', { status, project_id: selectedProjectId }),
    onSuccess: (_data, variables) => {
      const statusLabel = WELL_STATUS_MAP[variables.status]?.label || variables.status;
      toast({ title: "نجاح", description: `تم تغيير حالة البئر إلى "${statusLabel}"` });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data", selectedProjectId] });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: error.message || "فشل في تغيير حالة البئر", variant: "destructive" }); }
  });

  const deleteWellMutation = useMutation({
    mutationFn: async (wellId: number) => apiRequest(`/api/wells/${wellId}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف البئر بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data", selectedProjectId] });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: error.message || "فشل في حذف البئر", variant: "destructive" }); }
  });

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue("");
    setFilterValues({ region: "all", status: "all", depthRange: "all", hasSolar: "all" });
  }, []);

  const { data: wellsData = [], isLoading, isFetching } = useQuery({
    queryKey: ["wells-full-data", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const projectParam = selectedProjectId === "all" ? "" : `?project_id=${selectedProjectId}`;
      const response = await apiRequest(`/api/wells/export/full-data${projectParam}`);
      return response.data || [];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handleFloatingAction = () => {
      if (wellsData.length > 0) {
        setEditingWellId(wellsData[0].id);
      } else {
        toast({ title: "لا توجد آبار", description: "يرجى إضافة آبار أولاً", variant: "destructive" });
      }
    };
    setFloatingAction(handleFloatingAction, '+ تعديل مواد');
    return () => { setFloatingAction(null); };
  }, [setFloatingAction, wellsData]);

  const filteredWells = useMemo(() => {
    return wellsData.filter((well: WellFullData) => {
      const matchesSearch =
        well.ownerName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        well.wellNumber?.toString().includes(searchValue);
      const matchesRegion = filterValues.region === "all" || well.region === filterValues.region;
      const matchesStatus = filterValues.status === "all" || well.status === filterValues.status;
      const depth = Number(well.wellDepth) || 0;
      const matchesDepth = filterValues.depthRange === "all" ||
        (filterValues.depthRange === "0-50" && depth <= 50) ||
        (filterValues.depthRange === "51-100" && depth >= 51 && depth <= 100) ||
        (filterValues.depthRange === "101+" && depth >= 101);
      const solarStatus = well.solar?.installationStatus || well.solar?.installation_status || (well.solar ? "not_installed" : null);
      const matchesSolar = filterValues.hasSolar === "all" ||
        (filterValues.hasSolar === "no_solar" && !well.solar) ||
        (filterValues.hasSolar !== "no_solar" && solarStatus === filterValues.hasSolar);
      return matchesSearch && matchesRegion && matchesStatus && matchesDepth && matchesSolar;
    });
  }, [wellsData, searchValue, filterValues]);

  const stats = useMemo(() => {
    const total = filteredWells.length;
    const withSolar = filteredWells.filter((w: WellFullData) => w.solar).length;
    const totalPanels = filteredWells.reduce(
      (sum: number, w: WellFullData) => sum + (Number(w.numberOfPanels) || 0),
      0
    );
    const totalPipes = filteredWells.reduce(
      (sum: number, w: WellFullData) => {
        const basePipes = Number(w.numberOfPipes) || 0;
        const extraPipes = Number(w.solar?.extraPipes ?? w.solar?.extra_pipes ?? 0);
        return sum + basePipes + extraPipes;
      },
      0
    );
    return { total, withSolar, totalPanels, totalPipes };
  }, [filteredWells]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(
    () => [
      {
        columns: 4,
        gap: "sm",
        items: [
          { key: "total", label: "إجمالي الآبار", value: stats.total, icon: BarChart3, color: "blue" },
          { key: "withSolar", label: "منظومة شمسية", value: stats.withSolar, icon: Sun, color: "yellow" },
          { key: "totalPanels", label: "إجمالي الألواح", value: stats.totalPanels, icon: Zap, color: "orange" },
          { key: "totalPipes", label: "إجمالي المواسير", value: stats.totalPipes, icon: Wrench, color: "green" },
        ],
      },
    ],
    [stats]
  );

  const filtersConfig: FilterConfig[] = useMemo(
    () => [
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
        options: STATUS_OPTIONS,
        defaultValue: "all",
      },
      {
        key: "hasSolar",
        label: "حالة التركيب",
        type: "select",
        placeholder: "الكل",
        options: [
          { value: "all", label: "الكل" },
          { value: "not_installed", label: "غير مركبة" },
          { value: "in_progress", label: "قيد التنفيذ" },
          { value: "partial", label: "مركب جزئياً" },
          { value: "installed", label: "مركب" },
          { value: "completed", label: "منجز" },
          { value: "no_solar", label: "بدون منظومة" },
        ],
        defaultValue: "all",
      },
      {
        key: "depthRange",
        label: "عمق البئر",
        type: "select",
        placeholder: "اختر النطاق",
        options: [
          { value: "all", label: "الكل" },
          { value: "0-50", label: "0 - 50 م" },
          { value: "51-100", label: "51 - 100 م" },
          { value: "101+", label: "101 م فأكثر" },
        ],
        defaultValue: "all",
      },
    ],
    []
  );

  const handleExportExcel = useCallback(async () => {
    if (filteredWells.length === 0) return;
    setIsExportingExcel(true);
    try {
      const { createProfessionalReport } = await import("@/utils/axion-export");

      const data = filteredWells.map((well: WellFullData, idx: number) => {
        const s = well.solar;
        return {
          index: idx + 1,
          ownerName: well.ownerName,
          region: well.region || "-",
          numberOfBases: well.numberOfBases || 0,
          numberOfPanels: well.numberOfPanels || 0,
          wellDepth: well.wellDepth || 0,
          waterLevel: well.waterLevel || "-",
          numberOfPipes: (well.numberOfPipes || 0) + Number(s?.extraPipes ?? s?.extra_pipes ?? 0),
          fanCount: s?.fanCount ?? s?.fan_count ?? "-",
          submersiblePump: (s?.submersiblePump ?? s?.submersible_pump) ? "نعم" : "لا",
          inverter: s?.inverter || "-",
          collectionBox: s?.collectionBox || s?.collection_box || "-",
          carbonCarrier: s?.carbonCarrier || s?.carbon_carrier || "-",
          steelConverterTop: s?.steelConverterTop || s?.steel_converter_top || "-",
          clampConverterBottom: s?.clampConverterBottom || s?.clamp_converter_bottom || "-",
          groundingClip: s?.groundingClip || s?.grounding_clip || "-",
          groundingPlate: s?.groundingPlate || s?.grounding_plate || "-",
          groundingRod: s?.groundingRod || s?.grounding_rod || "-",
          jointThermalLiquid: s?.jointThermalLiquid || s?.joint_thermal_liquid || "-",
          bindingCable6mm: s?.bindingCable6mm || s?.binding_cable_6mm || "-",
          groundingCable10x2mm: s?.groundingCable10x2mm || s?.grounding_cable_10x2mm || "-",
          cable16x3mmLength: s?.cable16x3mmLength || s?.cable_16x3mm_length || "-",
          cable10x2mmLength: s?.cable10x2mmLength || s?.cable_10x2mm_length || "-",
          extraPipes: s?.extraPipes ?? s?.extra_pipes ?? "-",
          extraCable: s?.extraCable ?? s?.extra_cable ?? "-",
          notes: s?.notes || well.notes || "-",
        };
      });

      const success = await createProfessionalReport({
        sheetName: "كشف المواد",
        reportTitle: "كشف مواد الآبار الشمسية والمواسير",
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString("en-GB")}`,
        infoLines: [
          `عدد الآبار: ${data.length}`,
          `منظومة شمسية: ${stats.withSolar}`,
          `إجمالي الألواح: ${stats.totalPanels}`,
          `إجمالي المواسير: ${stats.totalPipes}`,
        ],
        columns: [
          { header: "م", key: "index", width: 5 },
          { header: "اسم المستفيد", key: "ownerName", width: 18 },
          { header: "المنطقة", key: "region", width: 14 },
          { header: "عدد القواعد", key: "numberOfBases", width: 10 },
          { header: "عدد الألواح", key: "numberOfPanels", width: 10 },
          { header: "عمق البئر", key: "wellDepth", width: 10 },
          { header: "منسوب الماء", key: "waterLevel", width: 10 },
          { header: "عدد المواسير", key: "numberOfPipes", width: 10 },
          { header: "مراوح", key: "fanCount", width: 8 },
          { header: "غطاس", key: "submersiblePump", width: 8 },
          { header: "أنفرتر", key: "inverter", width: 8 },
          { header: "صندوق تجميع", key: "collectionBox", width: 10 },
          { header: "شيال كربون", key: "carbonCarrier", width: 10 },
          { header: "تحويلة فوق استيل", key: "steelConverterTop", width: 12 },
          { header: "ملزمة تحت", key: "clampConverterBottom", width: 10 },
          { header: "كليب تأريض", key: "groundingClip", width: 10 },
          { header: "صفيحة تأريض", key: "groundingPlate", width: 10 },
          { header: "سيخ تأريض", key: "groundingRod", width: 10 },
          { header: "جونتي سائل حراري", key: "jointThermalLiquid", width: 12 },
          { header: "لفة كيبل 6ملي", key: "bindingCable6mm", width: 12 },
          { header: "كيبل تأريض 10×2مم", key: "groundingCable10x2mm", width: 14 },
          { header: "طول كيبل 16×3مم", key: "cable16x3mmLength", width: 14 },
          { header: "طول كيبل 10×2مم", key: "cable10x2mmLength", width: 14 },
          { header: "مواسير إضافية", key: "extraPipes", width: 12 },
          { header: "كيبل إضافي", key: "extraCable", width: 10 },
          { header: "ملاحظات", key: "notes", width: 20 },
        ],
        data,
        fileName: `كشف_مواد_الآبار_${new Date().toISOString().split("T")[0]}.xlsx`,
        orientation: "landscape",
      });

      if (success) toast({ title: "نجاح", description: "تم تصدير ملف Excel بنجاح" });
      else toast({ title: "خطأ", description: "فشل في تصدير ملف Excel", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل في تصدير ملف Excel", variant: "destructive" });
    } finally {
      setIsExportingExcel(false);
    }
  }, [filteredWells, stats, toast]);

  const actionsConfig: ActionButton[] = useMemo(
    () => [
      {
        key: "export-excel",
        icon: Download,
        label: "تصدير Excel",
        onClick: handleExportExcel,
        variant: "outline",
        loading: isExportingExcel,
        disabled: filteredWells.length === 0,
        tooltip: "تصدير كشف المواد إلى ملف Excel",
      },
      {
        key: "refresh",
        icon: RefreshCw,
        label: "تحديث",
        onClick: () => queryClient.invalidateQueries({ queryKey: ["wells-full-data", selectedProjectId] }),
        variant: "outline",
        loading: isFetching,
        tooltip: "تحديث البيانات",
      },
    ],
    [handleExportExcel, isExportingExcel, filteredWells.length, isFetching, queryClient, selectedProjectId]
  );

  const resultsSummary = useMemo(
    () => ({
      totalCount: wellsData.length,
      filteredCount: filteredWells.length,
      totalLabel: "إجمالي الآبار",
      filteredLabel: "نتائج البحث",
    }),
    [wellsData.length, filteredWells.length]
  );

  const getVal = (obj: any, camelKey: string, snakeKey: string) => {
    return obj?.[camelKey] ?? obj?.[snakeKey] ?? "-";
  };

  return (
    <div className="space-y-4 p-4">
      <UnifiedFilterDashboard
        hideHeader
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="بحث باسم المستفيد أو رقم البئر..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        actions={actionsConfig}
        resultsSummary={resultsSummary}
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-materials" />
        </div>
      ) : filteredWells.length === 0 ? (
        <div className="text-center py-12">
          <Sun className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-gray-500 text-lg" data-testid="text-no-materials">لا توجد بيانات آبار متاحة</p>
        </div>
      ) : (
        <UnifiedCardGrid columns={2}>
          {filteredWells.map((well: WellFullData) => {
            const s = well.solar;
            return (
              <UnifiedCard
                key={well.id}
                data-testid={`card-well-material-${well.id}`}
                title={`بئر #${well.wellNumber} - ${well.ownerName}`}
                subtitle={well.region}
                titleIcon={MapPin}
                headerColor={s ? getInstallationStatusColor(s?.installationStatus || s?.installation_status || "not_installed") : "#9ca3af"}
                badges={[
                  ...(s ? [{
                    label: getInstallationStatusLabel(s?.installationStatus || s?.installation_status || "not_installed"),
                    className: getInstallationStatusBadgeClass(s?.installationStatus || s?.installation_status || "not_installed"),
                  }] : [{
                    label: "بدون منظومة",
                    className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600",
                  }]),
                ]}
                fields={(() => {
                  const extraPipesVal = Number(s?.extraPipes ?? s?.extra_pipes ?? 0);
                  const totalPipes = (well.numberOfPipes || 0) + extraPipesVal;
                  return [
                    { label: "المنطقة", value: well.region || "-", icon: MapPin, color: "info" as const },
                    { label: "العمق", value: `${well.wellDepth || 0}م`, icon: TrendingUp, color: "warning" as const },
                    { label: "الألواح", value: well.numberOfPanels || 0, icon: Zap, color: "success" as const },
                    { label: "القواعد", value: well.numberOfBases || 0, icon: BarChart3, color: "info" as const },
                    { label: "المواسير", value: totalPipes, icon: Wrench, color: "success" as const },
                    { label: "منسوب الماء", value: well.waterLevel ? `${well.waterLevel}م` : "-", icon: TrendingUp, color: "info" as const },
                  ];
                })()}
                footer={
                  s ? (
                    <div className="space-y-2 pt-1">
                      {(s?.installationStatus || s?.installation_status) === "partial" && (s?.installedComponents || s?.installed_components) && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-xs">
                          <span className="font-semibold text-blue-700 dark:text-blue-300">المكونات المركبة: </span>
                          {(() => {
                            try {
                              const comps = JSON.parse(s.installedComponents || s.installed_components || "[]");
                              return comps.map((c: string) => INSTALLABLE_COMPONENTS.find(ic => ic.key === c)?.label || c).join("، ");
                            } catch { return s.installedComponents || s.installed_components; }
                          })()}
                        </div>
                      )}
                      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Sun className="h-3.5 w-3.5 text-yellow-500" /> مكونات المنظومة الشمسية
                      </div>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                        <span>مراوح: <b className="text-foreground">{getVal(s, "fanCount", "fan_count")}</b></span>
                        <span>غطاس: <b className="text-foreground">{(s?.submersiblePump ?? s?.submersible_pump) ? "نعم" : "-"}</b></span>
                        <span>أنفرتر: <b className="text-foreground">{getVal(s, "inverter", "inverter")}</b></span>
                        <span>صندوق تجميع: <b className="text-foreground">{getVal(s, "collectionBox", "collection_box")}</b></span>
                        <span>شيال كربون: <b className="text-foreground">{getVal(s, "carbonCarrier", "carbon_carrier")}</b></span>
                        <span>تحويلة استيل: <b className="text-foreground">{getVal(s, "steelConverterTop", "steel_converter_top")}</b></span>
                        <span>ملزمة تحت: <b className="text-foreground">{getVal(s, "clampConverterBottom", "clamp_converter_bottom")}</b></span>
                        <span>كليب تأريض: <b className="text-foreground">{getVal(s, "groundingClip", "grounding_clip")}</b></span>
                        <span>صفيحة تأريض: <b className="text-foreground">{getVal(s, "groundingPlate", "grounding_plate")}</b></span>
                        <span>سيخ تأريض: <b className="text-foreground">{getVal(s, "groundingRod", "grounding_rod")}</b></span>
                        <span>سائل حراري: <b className="text-foreground">{getVal(s, "jointThermalLiquid", "joint_thermal_liquid")}</b></span>
                        <span>كيبل 6ملي: <b className="text-foreground">{getVal(s, "bindingCable6mm", "binding_cable_6mm")}</b></span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t pt-1.5 mt-1">
                        <span>كيبل تأريض 10×2: <b className="text-foreground">{getVal(s, "groundingCable10x2mm", "grounding_cable_10x2mm")}</b></span>
                        <span>كيبل 16×3: <b className="text-foreground">{getVal(s, "cable16x3mmLength", "cable_16x3mm_length")}</b></span>
                        <span>كيبل 10×2: <b className="text-foreground">{getVal(s, "cable10x2mmLength", "cable_10x2mm_length")}</b></span>
                      </div>
                      {(() => {
                        const extraPipesVal = Number(s?.extraPipes ?? s?.extra_pipes ?? 0);
                        const extraCableVal = Number(s?.extraCable ?? s?.extra_cable ?? 0);
                        if (extraPipesVal <= 0 && extraCableVal <= 0) return null;
                        return (
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            {extraPipesVal > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-lg p-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                  مواسير إضافية: {extraPipesVal}
                                  {(s?.extraPipesReason || s?.extra_pipes_reason) && (
                                    <span className="font-normal text-blue-600 dark:text-blue-400 mr-1">({s.extraPipesReason || s.extra_pipes_reason})</span>
                                  )}
                                </span>
                              </div>
                            )}
                            {extraCableVal > 0 && (
                              <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700 rounded-lg p-2 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                                <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                                  كيبل إضافي: {extraCableVal} م
                                  {(s?.extraCableReason || s?.extra_cable_reason) && (
                                    <span className="font-normal text-orange-600 dark:text-orange-400 mr-1">({s.extraCableReason || s.extra_cable_reason})</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {(s?.notes || well.notes) && (
                        <div className="text-xs text-muted-foreground border-t pt-1 mt-1">
                          ملاحظات: {s?.notes || well.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-1">لا توجد بيانات منظومة شمسية</p>
                  )
                }
                actions={[
                  {
                    icon: Edit,
                    label: "تعديل المواد",
                    onClick: () => setEditingWellId(well.id),
                    color: "blue",
                  },
                  {
                    icon: ArrowUpDown,
                    label: "تغيير الحالة",
                    onClick: () => {},
                    color: "yellow",
                    dropdown: Object.entries(WELL_STATUS_MAP)
                      .filter(([key]) => key !== well.status)
                      .map(([key, val]) => ({
                        label: val.label,
                        onClick: () => changeStatusMutation.mutate({ wellId: well.id, status: key })
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

      {editingWellId && (
        <SolarEditDialog
          wellId={editingWellId}
          wellData={filteredWells.find((w: WellFullData) => w.id === editingWellId)}
          onClose={() => {
            setEditingWellId(null);
            queryClient.invalidateQueries({ queryKey: ["wells-full-data", selectedProjectId] });
          }}
        />
      )}
    </div>
  );
}

function SolarEditDialog({
  wellId,
  wellData,
  onClose,
}: {
  wellId: number;
  wellData?: WellFullData;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddInstallStatusDialog, setShowAddInstallStatusDialog] = useState(false);
  const [newInstallStatusName, setNewInstallStatusName] = useState("");
  const [customInstallStatuses, setCustomInstallStatuses] = useState<Array<{value: string; label: string}>>([]);

  const allInstallationStatuses = useMemo(() => {
    const base = [...INSTALLATION_STATUSES];
    customInstallStatuses.forEach(cs => {
      if (!base.some(b => b.value === cs.value)) base.push(cs);
    });
    return base;
  }, [customInstallStatuses]);
  const wellIdStr = String(wellId);

  const { data: solarComponents, isLoading } = useQuery({
    queryKey: QUERY_KEYS.wellSolarComponents(wellIdStr),
    queryFn: async () => {
      const res = await apiRequest(`/api/wells/${wellId}/solar-components`);
      return res.data || null;
    },
  });

  const existing = solarComponents;

  const parseInstalledComponents = (data: any): string[] => {
    const raw = data?.installedComponents || data?.installed_components;
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  const [form, setForm] = useState(() => ({
    inverter: "1",
    collectionBox: "1",
    carbonCarrier: "1",
    steelConverterTop: "1",
    clampConverterBottom: "1",
    bindingCable6mm: "1",
    groundingCable10x2mm: "",
    jointThermalLiquid: "1",
    groundingClip: "1",
    groundingPlate: "1",
    groundingRod: "1",
    cable16x3mmLength: "",
    cable10x2mmLength: "",
    fanCount: "1",
    submersiblePump: true,
    installationStatus: "not_installed",
    installedComponents: [] as string[],
    extraPipes: "0",
    extraPipesReason: "",
    extraCable: "0",
    extraCableReason: "",
    notes: "",
  }));

  const updateFormFromData = useCallback(
    (data: any) => {
      if (!data) return;
      setForm({
        inverter: String(data.inverter ?? data.inverter ?? "1"),
        collectionBox: String(data.collectionBox ?? data.collection_box ?? "1"),
        carbonCarrier: String(data.carbonCarrier ?? data.carbon_carrier ?? "1"),
        steelConverterTop: String(data.steelConverterTop ?? data.steel_converter_top ?? "1"),
        clampConverterBottom: String(data.clampConverterBottom ?? data.clamp_converter_bottom ?? "1"),
        bindingCable6mm: String(data.bindingCable6mm ?? data.binding_cable_6mm ?? "1"),
        groundingCable10x2mm: String(data.groundingCable10x2mm ?? data.grounding_cable_10x2mm ?? ""),
        jointThermalLiquid: String(data.jointThermalLiquid ?? data.joint_thermal_liquid ?? "1"),
        groundingClip: String(data.groundingClip ?? data.grounding_clip ?? "1"),
        groundingPlate: String(data.groundingPlate ?? data.grounding_plate ?? "1"),
        groundingRod: String(data.groundingRod ?? data.grounding_rod ?? "1"),
        cable16x3mmLength: String(data.cable16x3mmLength ?? data.cable_16x3mm_length ?? ""),
        cable10x2mmLength: String(data.cable10x2mmLength ?? data.cable_10x2mm_length ?? ""),
        fanCount: String(data.fanCount ?? data.fan_count ?? ""),
        submersiblePump: data.submersiblePump ?? data.submersible_pump ?? true,
        installationStatus: data.installationStatus || data.installation_status || "not_installed",
        installedComponents: parseInstalledComponents(data),
        extraPipes: String(data.extraPipes ?? data.extra_pipes ?? ""),
        extraPipesReason: data.extraPipesReason || data.extra_pipes_reason || "",
        extraCable: String(data.extraCable ?? data.extra_cable ?? ""),
        extraCableReason: data.extraCableReason || data.extra_cable_reason || "",
        notes: data.notes || "",
      });
    },
    []
  );

  useEffect(() => {
    if (solarComponents) {
      updateFormFromData(solarComponents);
    }
  }, [solarComponents, updateFormFromData]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        well_id: wellId,
        installedComponents: Array.isArray(data.installedComponents)
          ? JSON.stringify(data.installedComponents)
          : data.installedComponents,
      };
      return apiRequest(`/api/wells/${wellId}/solar-components`, "POST", payload);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حفظ مكونات الطاقة الشمسية بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellSolarComponents(wellIdStr) });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في حفظ البيانات", variant: "destructive" });
    },
  });

  const COUNT_OPTIONS = [
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "5", label: "5" },
  ];

  const componentFields = [
    { key: "inverter", label: "أنفرتر" },
    { key: "collectionBox", label: "صندوق تجميع" },
    { key: "carbonCarrier", label: "شيال كربون" },
    { key: "steelConverterTop", label: "تحويلة فوق استيل" },
    { key: "clampConverterBottom", label: "ملزمة تحت" },
    { key: "jointThermalLiquid", label: "جونتي سائل حراري" },
    { key: "groundingClip", label: "كليب تأريض" },
    { key: "groundingPlate", label: "صفيحة تأريض" },
    { key: "groundingRod", label: "سيخ تأريض" },
  ];

  return (
    <>
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle data-testid="text-solar-edit-title">
            تعديل مكونات الطاقة الشمسية - بئر #{wellData?.wellNumber} - {wellData?.ownerName}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-4 pt-2">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">حالة التركيب *</Label>
                  <SearchableSelect
                    value={form.installationStatus}
                    onValueChange={(v) => {
                      setForm({ ...form, installationStatus: v, installedComponents: v === "partial" ? form.installedComponents : [] });
                    }}
                    options={allInstallationStatuses}
                    placeholder="اختر حالة التركيب"
                    allowCustom
                    onCustomAdd={(v) => {
                      setCustomInstallStatuses(prev => [...prev, { value: v, label: v }]);
                    }}
                    onAddNew={() => setShowAddInstallStatusDialog(true)}
                    addNewLabel="إضافة حالة تركيب جديدة"
                    data-testid="select-installation-status"
                  />
                </div>
                {form.installationStatus === "partial" && (
                  <div className="border rounded-xl p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                    <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">حدد المكونات التي تم تركيبها:</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {INSTALLABLE_COMPONENTS.map((comp) => (
                        <label key={comp.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg p-1.5 transition-colors" data-testid={`checkbox-component-${comp.key}`}>
                          <Checkbox
                            checked={form.installedComponents.includes(comp.key)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...form.installedComponents, comp.key]
                                : form.installedComponents.filter((k: string) => k !== comp.key);
                              setForm({ ...form, installedComponents: updated });
                            }}
                          />
                          <span>{comp.label}</span>
                        </label>
                      ))}
                    </div>
                    {form.installedComponents.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        تم تحديد {form.installedComponents.length} من {INSTALLABLE_COMPONENTS.length} مكون
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {componentFields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-sm">{f.label}</Label>
                    <SearchableSelect
                      value={String((form as any)[f.key] ?? "1")}
                      onValueChange={(v) => setForm({ ...form, [f.key]: v })}
                      options={COUNT_OPTIONS}
                      placeholder="العدد"
                      data-testid={`select-material-${f.key}`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">لفة كيبل ربط 6مم</Label>
                  <Input
                    value={form.bindingCable6mm}
                    onChange={(e) => setForm({ ...form, bindingCable6mm: e.target.value })}
                    placeholder="1"
                    data-testid="input-material-binding-cable"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">كيبل تأريض 10×2مم</Label>
                  <Input
                    value={form.groundingCable10x2mm}
                    onChange={(e) => setForm({ ...form, groundingCable10x2mm: e.target.value })}
                    placeholder="الطول"
                    data-testid="input-material-grounding-cable"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">طول كيبل 16×3مم</Label>
                  <Input
                    type="number"
                    value={form.cable16x3mmLength}
                    onChange={(e) => setForm({ ...form, cable16x3mmLength: e.target.value })}
                    placeholder="0"
                    data-testid="input-material-cable-16x3"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">طول كيبل 10×2مم</Label>
                  <Input
                    type="number"
                    value={form.cable10x2mmLength}
                    onChange={(e) => setForm({ ...form, cable10x2mmLength: e.target.value })}
                    placeholder="0"
                    data-testid="input-material-cable-10x2"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">عدد المراوح</Label>
                  <Input
                    type="number"
                    value={form.fanCount}
                    onChange={(e) => setForm({ ...form, fanCount: e.target.value })}
                    placeholder="0"
                    data-testid="input-material-fan-count"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch
                    checked={form.submersiblePump}
                    onCheckedChange={(v) => setForm({ ...form, submersiblePump: v })}
                    data-testid="switch-material-pump"
                  />
                  <Label className="text-sm">غطاس</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">مواسير إضافية (عدد)</Label>
                  <Input
                    type="number"
                    value={form.extraPipes}
                    onChange={(e) => setForm({ ...form, extraPipes: e.target.value })}
                    placeholder="0"
                    data-testid="input-material-extra-pipes"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">سبب المواسير الإضافية</Label>
                  <Input
                    value={form.extraPipesReason}
                    onChange={(e) => setForm({ ...form, extraPipesReason: e.target.value })}
                    placeholder="السبب"
                    data-testid="input-material-extra-pipes-reason"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">كيبل إضافي (طول)</Label>
                  <Input
                    type="number"
                    value={form.extraCable}
                    onChange={(e) => setForm({ ...form, extraCable: e.target.value })}
                    placeholder="0"
                    data-testid="input-material-extra-cable"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">سبب الكيبل الإضافي</Label>
                  <Input
                    value={form.extraCableReason}
                    onChange={(e) => setForm({ ...form, extraCableReason: e.target.value })}
                    placeholder="السبب"
                    data-testid="input-material-extra-cable-reason"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">ملاحظات</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية"
                  data-testid="input-material-notes"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onClose} data-testid="button-cancel-material">
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-material"
                >
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showAddInstallStatusDialog} onOpenChange={setShowAddInstallStatusDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>إضافة حالة تركيب جديدة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-sm">اسم الحالة</Label><Input placeholder="مثال: قيد الصيانة" value={newInstallStatusName} onChange={(e) => setNewInstallStatusName(e.target.value)} data-testid="input-new-install-status" /></div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowAddInstallStatusDialog(false)}>إلغاء</Button>
          <Button size="sm" disabled={!newInstallStatusName.trim()} onClick={() => {
            const val = newInstallStatusName.trim();
            setCustomInstallStatuses(prev => [...prev, { value: val, label: val }]);
            setForm((f: any) => ({ ...f, installationStatus: val }));
            setNewInstallStatusName("");
            setShowAddInstallStatusDialog(false);
            toast({ title: "تم", description: `تمت إضافة حالة التركيب "${val}"` });
          }} data-testid="button-save-new-install-status">إضافة</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
