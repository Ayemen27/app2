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
import { Sun, Download, Loader, BarChart3, Zap, Wrench, Edit, RefreshCw, MapPin, TrendingUp } from "lucide-react";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";

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
      const matchesSolar = filterValues.hasSolar === "all" ||
        (filterValues.hasSolar === "yes" && !!well.solar) ||
        (filterValues.hasSolar === "no" && !well.solar);
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
      (sum: number, w: WellFullData) => sum + (Number(w.numberOfPipes) || 0),
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
        label: "المنظومة الشمسية",
        type: "select",
        placeholder: "الكل",
        options: [
          { value: "all", label: "الكل" },
          { value: "yes", label: "مركّبة" },
          { value: "no", label: "غير مركّبة" },
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
          numberOfPipes: well.numberOfPipes || 0,
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
                title={`بئر #${well.wellNumber} - ${well.ownerName}`}
                subtitle={well.region}
                titleIcon={MapPin}
                headerColor={s ? "green" : "gray"}
                badges={[
                  {
                    label: s ? "منظومة شمسية ✓" : "بدون منظومة",
                    variant: s ? ("default" as any) : ("outline" as any),
                  },
                ]}
                fields={[
                  { label: "المنطقة", value: well.region || "-", icon: MapPin, color: "info" as const },
                  { label: "العمق", value: `${well.wellDepth || 0}م`, icon: TrendingUp, color: "warning" as const },
                  { label: "الألواح", value: well.numberOfPanels || 0, icon: Zap, color: "success" as const },
                  { label: "القواعد", value: well.numberOfBases || 0, icon: BarChart3, color: "info" as const },
                  { label: "المواسير", value: well.numberOfPipes || 0, icon: Wrench, color: "success" as const },
                  { label: "منسوب الماء", value: well.waterLevel ? `${well.waterLevel}م` : "-", icon: TrendingUp, color: "info" as const },
                ]}
                footer={
                  s ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Sun className="h-3.5 w-3.5 text-yellow-500" /> مكونات المنظومة الشمسية
                      </div>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                        <span>مراوح: <b className="text-foreground">{getVal(s, "fanCount", "fan_count")}</b></span>
                        <span>غطاس: <b className="text-foreground">{(s?.submersiblePump ?? s?.submersible_pump) ? "نعم" : "لا"}</b></span>
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
                        <span>مواسير إضافية: <b className="text-foreground">{getVal(s, "extraPipes", "extra_pipes")}</b></span>
                        <span>كيبل إضافي: <b className="text-foreground">{getVal(s, "extraCable", "extra_cable")}</b></span>
                      </div>
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
  const wellIdStr = String(wellId);

  const { data: solarComponents, isLoading } = useQuery({
    queryKey: QUERY_KEYS.wellSolarComponents(wellIdStr),
    queryFn: async () => {
      const res = await apiRequest(`/api/wells/${wellId}/solar-components`);
      return res.data || null;
    },
  });

  const existing = solarComponents;

  const [form, setForm] = useState(() => ({
    inverter: existing?.inverter || "نعم",
    collectionBox: existing?.collectionBox || existing?.collection_box || "نعم",
    carbonCarrier: existing?.carbonCarrier || existing?.carbon_carrier || "نعم",
    steelConverterTop: existing?.steelConverterTop || existing?.steel_converter_top || "نعم",
    clampConverterBottom: existing?.clampConverterBottom || existing?.clamp_converter_bottom || "نعم",
    bindingCable6mm: existing?.bindingCable6mm || existing?.binding_cable_6mm || "1",
    groundingCable10x2mm: existing?.groundingCable10x2mm || existing?.grounding_cable_10x2mm || "",
    jointThermalLiquid: existing?.jointThermalLiquid || existing?.joint_thermal_liquid || "نعم",
    groundingClip: existing?.groundingClip || existing?.grounding_clip || "نعم",
    groundingPlate: existing?.groundingPlate || existing?.grounding_plate || "نعم",
    groundingRod: existing?.groundingRod || existing?.grounding_rod || "نعم",
    cable16x3mmLength: existing?.cable16x3mmLength || existing?.cable_16x3mm_length || "",
    cable10x2mmLength: existing?.cable10x2mmLength || existing?.cable_10x2mm_length || "",
    fanCount: existing?.fanCount ?? existing?.fan_count ?? "",
    submersiblePump: existing?.submersiblePump ?? existing?.submersible_pump ?? true,
    extraPipes: existing?.extraPipes ?? existing?.extra_pipes ?? "",
    extraPipesReason: existing?.extraPipesReason || existing?.extra_pipes_reason || "",
    extraCable: existing?.extraCable ?? existing?.extra_cable ?? "",
    extraCableReason: existing?.extraCableReason || existing?.extra_cable_reason || "",
    notes: existing?.notes || "",
  }));

  const updateFormFromData = useCallback(
    (data: any) => {
      if (!data) return;
      setForm({
        inverter: data.inverter || "نعم",
        collectionBox: data.collectionBox || data.collection_box || "نعم",
        carbonCarrier: data.carbonCarrier || data.carbon_carrier || "نعم",
        steelConverterTop: data.steelConverterTop || data.steel_converter_top || "نعم",
        clampConverterBottom: data.clampConverterBottom || data.clamp_converter_bottom || "نعم",
        bindingCable6mm: data.bindingCable6mm || data.binding_cable_6mm || "1",
        groundingCable10x2mm: data.groundingCable10x2mm || data.grounding_cable_10x2mm || "",
        jointThermalLiquid: data.jointThermalLiquid || data.joint_thermal_liquid || "نعم",
        groundingClip: data.groundingClip || data.grounding_clip || "نعم",
        groundingPlate: data.groundingPlate || data.grounding_plate || "نعم",
        groundingRod: data.groundingRod || data.grounding_rod || "نعم",
        cable16x3mmLength: data.cable16x3mmLength || data.cable_16x3mm_length || "",
        cable10x2mmLength: data.cable10x2mmLength || data.cable_10x2mm_length || "",
        fanCount: data.fanCount ?? data.fan_count ?? "",
        submersiblePump: data.submersiblePump ?? data.submersible_pump ?? true,
        extraPipes: data.extraPipes ?? data.extra_pipes ?? "",
        extraPipesReason: data.extraPipesReason || data.extra_pipes_reason || "",
        extraCable: data.extraCable ?? data.extra_cable ?? "",
        extraCableReason: data.extraCableReason || data.extra_cable_reason || "",
        notes: data.notes || "",
      });
    },
    []
  );

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/wells/${wellId}/solar-components`, "POST", {
        ...data,
        well_id: wellId,
      });
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

  const boolFields = [
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {boolFields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-sm">{f.label}</Label>
                    <SearchableSelect
                      value={(form as any)[f.key]}
                      onValueChange={(v) => setForm({ ...form, [f.key]: v })}
                      options={[
                        { value: "نعم", label: "نعم" },
                        { value: "لا", label: "لا" },
                      ]}
                      placeholder="اختر"
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
  );
}
