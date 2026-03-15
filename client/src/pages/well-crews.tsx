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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { createProfessionalReport } from "@/utils/axion-export";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import {
  Users, Truck, Download, Loader, Plus, Edit, Trash2, BarChart3, Calendar, Wrench, MapPin, TrendingUp, Zap, ArrowUpDown
} from "lucide-react";

const WELL_STATUS_MAP: Record<string, { label: string }> = {
  pending: { label: 'لم يبدأ' },
  in_progress: { label: 'قيد التنفيذ' },
  completed: { label: 'منجز' },
};

const CREW_TYPES = [
  { value: "welding", label: "تلحيم العمدان" },
  { value: "steel_installation", label: "تركيب حديد" },
  { value: "panel_installation", label: "تركيب ألواح" },
];

const CREW_TYPE_MAP: Record<string, string> = {
  welding: "تلحيم العمدان",
  steel_installation: "تركيب حديد",
  panel_installation: "تركيب ألواح",
};

const CREW_TYPE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  welding: { bg: "bg-orange-50/60 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800", badge: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" },
  steel_installation: { bg: "bg-blue-50/60 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  panel_installation: { bg: "bg-green-50/60 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800", badge: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
};

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

interface WellFullData {
  id: number;
  wellNumber: number;
  ownerName: string;
  region: string;
  numberOfBases: number;
  numberOfPanels: number;
  wellDepth: number;
  waterLevel?: number;
  numberOfPipes: number;
  project_id: string;
  crews: any[];
  transport: any[];
}

export default function WellCrewsPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { setFloatingAction } = useFloatingButton();

  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    region: 'all', crewType: 'all', status: 'all', dateRange: undefined
  });
  const [showCrewForm, setShowCrewForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [editingCrew, setEditingCrew] = useState<any>(null);
  const [editingTransport, setEditingTransport] = useState<any>(null);
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const emptyCrewForm = {
    crewType: "", teamName: "", workersCount: 0, mastersCount: 0,
    workDays: "", workerDailyWage: "", masterDailyWage: "", totalWages: "",
    workDate: "", notes: "",
  };
  const [crewForm, setCrewForm] = useState(emptyCrewForm);

  const emptyTransportForm = {
    railType: "", withPanels: false, transportPrice: "",
    crewDues: "", transportDate: "", notes: "",
  };
  const [transportForm, setTransportForm] = useState(emptyTransportForm);

  const { data: fullData = [], isLoading } = useQuery({
    queryKey: ["wells-full-data", selectedProjectId],
    queryFn: async () => {
      const projectParam = selectedProjectId && selectedProjectId !== 'all'
        ? `?project_id=${selectedProjectId}` : '';
      const res = await apiRequest(`/api/wells/export/full-data${projectParam}`);
      return res.data || [];
    },
    enabled: !!selectedProjectId,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    const handleFloatingAction = () => {
      if (fullData.length > 0) {
        setSelectedWellId(fullData[0].id);
        setShowCrewForm(true);
      } else {
        toast({ title: "لا توجد آبار", description: "يرجى إضافة آبار أولاً", variant: "destructive" });
      }
    };
    setFloatingAction(handleFloatingAction, '+ فريق جديد');
    return () => { setFloatingAction(null); };
  }, [setFloatingAction, fullData]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue('');
    setFilterValues({ region: 'all', crewType: 'all', status: 'all', dateRange: undefined });
  }, []);

  const filteredData = useMemo(() => {
    const dateFrom = filterValues.dateRange?.from ? new Date(filterValues.dateRange.from) : null;
    const dateTo = filterValues.dateRange?.to ? new Date(filterValues.dateRange.to) : null;
    if (dateFrom) dateFrom.setHours(0, 0, 0, 0);
    if (dateTo) dateTo.setHours(23, 59, 59, 999);

    return (fullData as WellFullData[]).filter((well) => {
      const matchesSearch =
        well.ownerName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        String(well.wellNumber).includes(searchValue);
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      const matchesCrewType = filterValues.crewType === 'all' ||
        well.crews?.some((c: any) => (c.crewType || c.crew_type) === filterValues.crewType);
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const crewDates = (well.crews || []).map((c: any) => c.workDate || c.work_date).filter(Boolean);
        const transportDates = (well.transport || []).map((t: any) => t.transportDate || t.transport_date).filter(Boolean);
        const allDates = [...crewDates, ...transportDates];
        if (allDates.length === 0) {
          matchesDate = false;
        } else {
          matchesDate = allDates.some(d => {
            const date = new Date(d);
            if (dateFrom && date < dateFrom) return false;
            if (dateTo && date > dateTo) return false;
            return true;
          });
        }
      }

      return matchesSearch && matchesRegion && matchesCrewType && matchesStatus && matchesDate;
    });
  }, [fullData, searchValue, filterValues]);

  const stats = useMemo(() => {
    const allCrews = filteredData.flatMap(w => w.crews || []);
    const allTransport = filteredData.flatMap(w => w.transport || []);
    const totalWorkDays = allCrews.reduce((sum, c) => sum + (Number(c.workDays || c.work_days) || 0), 0);
    const totalWages = allCrews.reduce((sum, c) => sum + (Number(c.totalWages || c.total_wages) || 0), 0);
    const totalTransportCost = allTransport.reduce((sum, t) => sum + (Number(t.transportPrice || t.transport_price) || 0), 0);

    return {
      wellCount: filteredData.length,
      crewCount: allCrews.length,
      totalWorkDays,
      totalWages,
      transportCount: allTransport.length,
      totalTransportCost,
    };
  }, [filteredData]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'wells', label: 'عدد الآبار', value: stats.wellCount, icon: BarChart3, color: 'blue' },
        { key: 'crews', label: 'إجمالي الفرق', value: stats.crewCount, icon: Users, color: 'indigo' },
        { key: 'workDays', label: 'إجمالي أيام العمل', value: stats.totalWorkDays, icon: Calendar, color: 'green' },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'wages', label: 'إجمالي الأجور', value: `${stats.totalWages.toLocaleString()} ريال`, icon: Wrench, color: 'orange' },
        { key: 'transport', label: 'رحلات النقل', value: stats.transportCount, icon: Truck, color: 'amber' },
        { key: 'transportCost', label: 'تكلفة النقل', value: `${stats.totalTransportCost.toLocaleString()} ريال`, icon: Truck, color: 'purple' },
      ]
    }
  ], [stats]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'region', label: 'المنطقة', type: 'select', placeholder: 'اختر المنطقة',
      options: [{ value: 'all', label: 'جميع المناطق' }, ...REGIONS.map(r => ({ value: r, label: r }))],
      defaultValue: 'all'
    },
    {
      key: 'status', label: 'حالة البئر', type: 'select', placeholder: 'اختر الحالة',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'pending', label: 'لم يبدأ' },
        { value: 'in_progress', label: 'قيد التنفيذ' },
        { value: 'completed', label: 'منجز' },
      ],
      defaultValue: 'all'
    },
    {
      key: 'crewType', label: 'نوع الفريق', type: 'select', placeholder: 'اختر نوع الفريق',
      options: [{ value: 'all', label: 'جميع الأنواع' }, ...CREW_TYPES],
      defaultValue: 'all'
    },
    {
      key: 'dateRange', label: 'الفترة الزمنية', type: 'date-range' as any, placeholder: 'اختر الفترة',
    },
  ], []);

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

  const createCrewMutation = useMutation({
    mutationFn: async ({ wellId, data }: { wellId: number; data: any }) => {
      return apiRequest(`/api/wells/${wellId}/crews`, 'POST', { ...data, well_id: wellId });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إضافة طاقم العمل بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      resetCrewForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في إضافة طاقم العمل", variant: "destructive" });
    },
  });

  const updateCrewMutation = useMutation({
    mutationFn: async ({ crewId, data }: { crewId: number; data: any }) => {
      return apiRequest(`/api/wells/crews/${crewId}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تحديث طاقم العمل بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      resetCrewForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في تحديث طاقم العمل", variant: "destructive" });
    },
  });

  const deleteCrewMutation = useMutation({
    mutationFn: async (crewId: number) => {
      return apiRequest(`/api/wells/crews/${crewId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف طاقم العمل بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في حذف طاقم العمل", variant: "destructive" });
    },
  });

  const createTransportMutation = useMutation({
    mutationFn: async ({ wellId, data }: { wellId: number; data: any }) => {
      return apiRequest(`/api/wells/${wellId}/transport`, 'POST', { ...data, well_id: wellId });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إضافة سجل النقل بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      resetTransportForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في إضافة سجل النقل", variant: "destructive" });
    },
  });

  const updateTransportMutation = useMutation({
    mutationFn: async ({ transportId, data }: { transportId: number; data: any }) => {
      return apiRequest(`/api/wells/transport/${transportId}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تحديث سجل النقل بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      resetTransportForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في تحديث سجل النقل", variant: "destructive" });
    },
  });

  const deleteTransportMutation = useMutation({
    mutationFn: async (transportId: number) => {
      return apiRequest(`/api/wells/transport/${transportId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف سجل النقل بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في حذف سجل النقل", variant: "destructive" });
    },
  });

  const resetCrewForm = () => {
    setCrewForm(emptyCrewForm);
    setEditingCrew(null);
    setSelectedWellId(null);
    setShowCrewForm(false);
  };

  const resetTransportForm = () => {
    setTransportForm(emptyTransportForm);
    setEditingTransport(null);
    setSelectedWellId(null);
    setShowTransportForm(false);
  };

  const startEditCrew = (crew: any, wellId: number) => {
    setCrewForm({
      crewType: crew.crewType || crew.crew_type || "",
      teamName: crew.teamName || crew.team_name || "",
      workersCount: crew.workersCount ?? crew.workers_count ?? 0,
      mastersCount: crew.mastersCount ?? crew.masters_count ?? 0,
      workDays: String(crew.workDays ?? crew.work_days ?? ""),
      workerDailyWage: String(crew.workerDailyWage ?? crew.worker_daily_wage ?? ""),
      masterDailyWage: String(crew.masterDailyWage ?? crew.master_daily_wage ?? ""),
      totalWages: String(crew.totalWages ?? crew.total_wages ?? ""),
      workDate: crew.workDate || crew.work_date || "",
      notes: crew.notes || "",
    });
    setEditingCrew(crew);
    setSelectedWellId(wellId);
    setShowCrewForm(true);
  };

  const startEditTransport = (transport: any, wellId: number) => {
    setTransportForm({
      railType: transport.railType || transport.rail_type || "",
      withPanels: transport.withPanels ?? transport.with_panels ?? false,
      transportPrice: String(transport.transportPrice ?? transport.transport_price ?? ""),
      crewDues: String(transport.crewDues ?? transport.crew_dues ?? ""),
      transportDate: transport.transportDate || transport.transport_date || "",
      notes: transport.notes || "",
    });
    setEditingTransport(transport);
    setSelectedWellId(wellId);
    setShowTransportForm(true);
  };

  const handleExportExcel = useCallback(async () => {
    if (filteredData.length === 0) return;
    setIsExporting(true);
    try {
      const rows: Record<string, any>[] = [];
      let idx = 1;
      for (const well of filteredData) {
        const crews = well.crews || [];
        const transports = well.transport || [];
        const maxRows = Math.max(1, crews.length, transports.length);
        for (let i = 0; i < maxRows; i++) {
          const crew = crews[i];
          const transport = transports[i];
          rows.push({
            index: idx++,
            wellNumber: i === 0 ? well.wellNumber : '',
            ownerName: i === 0 ? well.ownerName : '',
            region: i === 0 ? well.region : '',
            numberOfBases: i === 0 ? well.numberOfBases : '',
            numberOfPanels: i === 0 ? well.numberOfPanels : '',
            crewType: crew ? (CREW_TYPE_MAP[crew.crewType || crew.crew_type] || '') : '',
            teamName: crew ? (crew.teamName || crew.team_name || '') : '',
            workersCount: crew ? (crew.workersCount ?? crew.workers_count ?? '') : '',
            mastersCount: crew ? (crew.mastersCount ?? crew.masters_count ?? '') : '',
            workDays: crew ? (crew.workDays ?? crew.work_days ?? '') : '',
            crewNotes: crew ? (crew.notes || '') : '',
            railType: transport ? (transport.railType || transport.rail_type || '') : '',
            withPanels: transport ? ((transport.withPanels ?? transport.with_panels) ? 'نعم' : 'لا') : '',
            transportPrice: transport ? (Number(transport.transportPrice || transport.transport_price) || '') : '',
            crewDues: transport ? (Number(transport.crewDues || transport.crew_dues) || '') : '',
            transportNotes: transport ? (transport.notes || '') : '',
          });
        }
      }

      const success = await createProfessionalReport({
        sheetName: 'كشف الفرق والنقل',
        reportTitle: 'كشف حسابات العمال والنقل',
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
        infoLines: [
          `عدد الآبار: ${stats.wellCount}`,
          `إجمالي الفرق: ${stats.crewCount}`,
          `إجمالي أيام العمل: ${stats.totalWorkDays}`,
          `رحلات النقل: ${stats.transportCount}`,
        ],
        columns: [
          { header: '#', key: 'index', width: 5 },
          { header: 'رقم البئر', key: 'wellNumber', width: 10 },
          { header: 'اسم المستفيد', key: 'ownerName', width: 18 },
          { header: 'المنطقة', key: 'region', width: 14 },
          { header: 'عدد القواعد', key: 'numberOfBases', width: 10 },
          { header: 'عدد الألواح', key: 'numberOfPanels', width: 10 },
          { header: 'نوع الفريق', key: 'crewType', width: 14 },
          { header: 'اسم الفريق', key: 'teamName', width: 14 },
          { header: 'عدد العمال', key: 'workersCount', width: 10 },
          { header: 'عدد المعلمين', key: 'mastersCount', width: 10 },
          { header: 'أيام العمل', key: 'workDays', width: 10 },
          { header: 'ملاحظات الفريق', key: 'crewNotes', width: 16 },
          { header: 'ريلات', key: 'railType', width: 10 },
          { header: 'مع ألواح', key: 'withPanels', width: 10 },
          { header: 'سعر النقل', key: 'transportPrice', width: 12, numFmt: '#,##0' },
          { header: 'مستحقات الفريق', key: 'crewDues', width: 12, numFmt: '#,##0' },
          { header: 'ملاحظات النقل', key: 'transportNotes', width: 16 },
        ],
        data: rows,
        totals: {
          label: 'الإجمالي',
          values: {
            transportPrice: stats.totalTransportCost,
            workDays: stats.totalWorkDays,
          },
        },
        fileName: `كشف_الفرق_والنقل_${new Date().toISOString().split('T')[0]}.xlsx`,
        orientation: 'landscape',
      });

      if (success) toast({ title: "نجاح", description: "تم تصدير ملف Excel بنجاح" });
      else toast({ title: "خطأ", description: "فشل في تصدير ملف Excel", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل في التصدير", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [filteredData, stats, toast]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'export-excel',
      icon: Download,
      label: 'تصدير Excel',
      onClick: handleExportExcel,
      variant: 'outline',
      loading: isExporting,
      disabled: filteredData.length === 0,
      tooltip: 'تصدير كشف الفرق والنقل إلى Excel',
    },
  ], [handleExportExcel, isExporting, filteredData.length]);

  const resultsSummary = useMemo(() => ({
    totalCount: (fullData as any[]).length,
    filteredCount: filteredData.length,
    totalLabel: 'إجمالي الآبار',
    filteredLabel: 'نتائج البحث',
  }), [(fullData as any[]).length, filteredData.length]);

  const wellOptions = useMemo(() => {
    return (fullData as WellFullData[]).map(w => ({
      value: String(w.id),
      label: `بئر #${w.wellNumber} - ${w.ownerName}`,
    }));
  }, [fullData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loader-crews-page">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="page-well-crews">
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
        actions={actionsConfig}
        resultsSummary={resultsSummary}
      />

      {filteredData.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-gray-500 text-lg" data-testid="text-no-wells">لا توجد آبار مطابقة للبحث</p>
        </div>
      ) : (
        <UnifiedCardGrid columns={2}>
          {filteredData.map((well) => {
            const crewCount = well.crews?.length || 0;
            const transportCount = well.transport?.length || 0;
            const totalCrewWages = (well.crews || []).reduce((s: number, c: any) => s + (Number(c.totalWages ?? c.total_wages) || 0), 0);
            const totalTransportCost = (well.transport || []).reduce((s: number, t: any) => s + (Number(t.transportPrice ?? t.transport_price) || 0), 0);

            return (
              <UnifiedCard
                key={well.id}
                data-testid={`card-well-crews-${well.id}`}
                title={`بئر #${well.wellNumber} - ${well.ownerName}`}
                titleIcon={MapPin}
                headerColor={crewCount > 0 ? "green" : "gray"}
                compact
                badges={[
                  { label: `${crewCount} فريق`, variant: crewCount > 0 ? "default" : "outline" as any },
                  ...(transportCount > 0 ? [{ label: `${transportCount} نقل`, variant: "secondary" as any }] : []),
                ]}
                fields={[
                  { label: "المنطقة", value: well.region || "-", icon: MapPin, color: "info" as const },
                  { label: "القواعد", value: well.numberOfBases || 0, icon: BarChart3, color: "info" as const },
                  { label: "الألواح", value: well.numberOfPanels || 0, icon: Zap, color: "success" as const },
                  { label: "إجمالي الأجور", value: totalCrewWages > 0 ? `${totalCrewWages.toLocaleString()} ر` : "-", icon: Wrench, color: totalCrewWages > 0 ? "warning" as const : "muted" as const },
                ]}
                actions={[
                  {
                    icon: Plus,
                    label: "إضافة فريق",
                    onClick: () => { setSelectedWellId(well.id); setShowCrewForm(true); },
                    color: "blue",
                    dropdown: [
                      { label: "إضافة فريق", onClick: () => { setSelectedWellId(well.id); setShowCrewForm(true); } },
                      { label: "إضافة نقل", onClick: () => { setSelectedWellId(well.id); setShowTransportForm(true); } },
                    ],
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
                footer={
                  <div className="space-y-1.5 pt-0.5">
                    {crewCount > 0 && (
                      <>
                        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-500" /> الفرق ({crewCount})
                        </div>
                        {well.crews.map((crew: any) => {
                          const crewTypeKey = crew.crewType || crew.crew_type || "";
                          const crewType = CREW_TYPE_MAP[crewTypeKey] || crewTypeKey;
                          const colors = CREW_TYPE_COLORS[crewTypeKey] || { bg: "bg-muted/30", border: "border-border", badge: "" };
                          const workDate = crew.workDate || crew.work_date;
                          return (
                            <div key={`crew-${crew.id}`} className={`border rounded-lg p-2.5 space-y-1.5 ${colors.bg} ${colors.border}`} data-testid={`row-crew-${crew.id}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${colors.badge}`}>{crewType}</Badge>
                                  <span className="text-xs font-semibold text-foreground">{crew.teamName || crew.team_name || '-'}</span>
                                  {workDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(workDate).toLocaleDateString('ar-SA')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditCrew(crew, well.id)} data-testid={`button-edit-crew-${crew.id}`}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("حذف هذا الفريق؟")) deleteCrewMutation.mutate(crew.id); }} data-testid={`button-delete-crew-${crew.id}`}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <span>عمال: <b className="text-foreground">{crew.workersCount ?? crew.workers_count ?? 0}</b></span>
                                <span>معلمين: <b className="text-foreground">{crew.mastersCount ?? crew.masters_count ?? 0}</b></span>
                                <span>أيام: <b className="text-foreground">{crew.workDays ?? crew.work_days ?? 0}</b></span>
                              </div>
                              {(Number(crew.totalWages ?? crew.total_wages) > 0) && (
                                <div className="text-xs">
                                  إجمالي: <b className="text-green-600 dark:text-green-400">{Number(crew.totalWages ?? crew.total_wages ?? 0).toLocaleString()} ر</b>
                                </div>
                              )}
                              {crew.notes && (
                                <div className="text-xs text-muted-foreground break-words">ملاحظات: {crew.notes}</div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {transportCount > 0 && (
                      <>
                        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mt-1">
                          <Truck className="h-3 w-3 text-amber-500" /> النقل ({transportCount})
                        </div>
                        {well.transport.map((t: any) => {
                          const tDate = t.transportDate || t.transport_date;
                          return (
                            <div key={`transport-${t.id}`} className="border rounded-lg p-2.5 space-y-1.5 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid={`row-transport-${t.id}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">{t.railType || t.rail_type || '-'}</Badge>
                                  {(t.withPanels ?? t.with_panels) && (
                                    <Badge variant="secondary" className="text-xs">مع ألواح</Badge>
                                  )}
                                  {tDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(tDate).toLocaleDateString('ar-SA')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditTransport(t, well.id)} data-testid={`button-edit-transport-${t.id}`}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("حذف سجل النقل؟")) deleteTransportMutation.mutate(t.id); }} data-testid={`button-delete-transport-${t.id}`}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <span>سعر النقل: <b className="text-foreground">{Number(t.transportPrice || t.transport_price || 0).toLocaleString()} ر</b></span>
                                <span>مستحقات الفريق: <b className="text-foreground">{Number(t.crewDues || t.crew_dues || 0).toLocaleString()} ر</b></span>
                              </div>
                              {t.notes && (
                                <div className="text-xs text-muted-foreground break-words">ملاحظات: {t.notes}</div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {crewCount === 0 && transportCount === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2" data-testid={`text-no-data-${well.id}`}>
                        لا توجد بيانات فرق أو نقل مسجلة
                      </p>
                    )}
                  </div>
                }
              />
            );
          })}
        </UnifiedCardGrid>
      )}

      <Dialog open={showCrewForm} onOpenChange={(open) => { if (!open) resetCrewForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-crew-form-title">
              {editingCrew ? "تعديل فريق عمل" : "إضافة فريق عمل جديد"}
            </DialogTitle>
          </DialogHeader>
          {!editingCrew && !selectedWellId && (
            <div className="space-y-1">
              <Label className="text-sm">البئر *</Label>
              <SearchableSelect
                value={selectedWellId ? String(selectedWellId) : ""}
                onValueChange={(v) => setSelectedWellId(Number(v))}
                options={wellOptions}
                placeholder="اختر البئر"
                data-testid="select-crew-well"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">نوع الطاقم *</Label>
              <SearchableSelect
                value={crewForm.crewType}
                onValueChange={(v) => setCrewForm({ ...crewForm, crewType: v })}
                options={CREW_TYPES}
                placeholder="اختر نوع الطاقم"
                data-testid="select-crew-type"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">اسم الفريق</Label>
              <Input value={crewForm.teamName} onChange={(e) => setCrewForm({ ...crewForm, teamName: e.target.value })} placeholder="اسم الفريق" data-testid="input-crew-team-name" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">عدد العمال</Label>
              <Input type="number" value={crewForm.workersCount || ""} onChange={(e) => setCrewForm({ ...crewForm, workersCount: parseInt(e.target.value) || 0 })} placeholder="0" data-testid="input-crew-workers" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">عدد المعلمين</Label>
              <Input type="number" value={crewForm.mastersCount || ""} onChange={(e) => setCrewForm({ ...crewForm, mastersCount: parseInt(e.target.value) || 0 })} placeholder="0" data-testid="input-crew-masters" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">أيام العمل</Label>
              <Input type="number" step="0.5" value={crewForm.workDays} onChange={(e) => setCrewForm({ ...crewForm, workDays: e.target.value })} placeholder="0" data-testid="input-crew-work-days" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">أجر العامل اليومي</Label>
              <Input type="number" value={crewForm.workerDailyWage} onChange={(e) => setCrewForm({ ...crewForm, workerDailyWage: e.target.value })} placeholder="0" data-testid="input-crew-worker-wage" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">أجر المعلم اليومي</Label>
              <Input type="number" value={crewForm.masterDailyWage} onChange={(e) => setCrewForm({ ...crewForm, masterDailyWage: e.target.value })} placeholder="0" data-testid="input-crew-master-wage" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">تاريخ العمل</Label>
              <Input type="date" value={crewForm.workDate} onChange={(e) => setCrewForm({ ...crewForm, workDate: e.target.value })} data-testid="input-crew-work-date" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-sm">ملاحظات</Label>
              <Input value={crewForm.notes} onChange={(e) => setCrewForm({ ...crewForm, notes: e.target.value })} placeholder="ملاحظات اختيارية" data-testid="input-crew-notes" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={resetCrewForm} data-testid="button-cancel-crew">إلغاء</Button>
            <Button
              size="sm"
              disabled={!crewForm.crewType || !selectedWellId || createCrewMutation.isPending || updateCrewMutation.isPending}
              onClick={() => {
                if (!selectedWellId) return;
                if (editingCrew) {
                  updateCrewMutation.mutate({ crewId: editingCrew.id, data: crewForm });
                } else {
                  createCrewMutation.mutate({ wellId: selectedWellId, data: crewForm });
                }
              }}
              data-testid="button-save-crew"
            >
              {(createCrewMutation.isPending || updateCrewMutation.isPending) ? "جاري..." : editingCrew ? "تحديث" : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransportForm} onOpenChange={(open) => { if (!open) resetTransportForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-transport-form-title">
              {editingTransport ? "تعديل سجل نقل" : "إضافة سجل نقل جديد"}
            </DialogTitle>
          </DialogHeader>
          {!editingTransport && !selectedWellId && (
            <div className="space-y-1">
              <Label className="text-sm">البئر *</Label>
              <SearchableSelect
                value={selectedWellId ? String(selectedWellId) : ""}
                onValueChange={(v) => setSelectedWellId(Number(v))}
                options={wellOptions}
                placeholder="اختر البئر"
                data-testid="select-transport-well"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">نوع الريلات</Label>
              <SearchableSelect
                value={transportForm.railType}
                onValueChange={(v) => setTransportForm({ ...transportForm, railType: v })}
                options={[{ value: "new", label: "جديد" }, { value: "old", label: "قديم" }]}
                placeholder="جديد / قديم"
                data-testid="select-transport-rail-type"
              />
            </div>
            <div className="space-y-1 flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={transportForm.withPanels}
                  onChange={(e) => setTransportForm({ ...transportForm, withPanels: e.target.checked })}
                  data-testid="checkbox-transport-with-panels"
                />
                مع ألواح
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">تاريخ النقل</Label>
              <Input type="date" value={transportForm.transportDate} onChange={(e) => setTransportForm({ ...transportForm, transportDate: e.target.value })} data-testid="input-transport-date" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">سعر النقل</Label>
              <Input type="number" value={transportForm.transportPrice} onChange={(e) => setTransportForm({ ...transportForm, transportPrice: e.target.value })} placeholder="0" data-testid="input-transport-price" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">مستحقات الفريق</Label>
              <Input type="number" value={transportForm.crewDues} onChange={(e) => setTransportForm({ ...transportForm, crewDues: e.target.value })} placeholder="0" data-testid="input-transport-crew-dues" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-sm">ملاحظات</Label>
              <Input value={transportForm.notes} onChange={(e) => setTransportForm({ ...transportForm, notes: e.target.value })} placeholder="ملاحظات اختيارية" data-testid="input-transport-notes" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={resetTransportForm} data-testid="button-cancel-transport">إلغاء</Button>
            <Button
              size="sm"
              disabled={!selectedWellId || createTransportMutation.isPending || updateTransportMutation.isPending}
              onClick={() => {
                if (!selectedWellId) return;
                if (editingTransport) {
                  updateTransportMutation.mutate({ transportId: editingTransport.id, data: transportForm });
                } else {
                  createTransportMutation.mutate({ wellId: selectedWellId, data: transportForm });
                }
              }}
              data-testid="button-save-transport"
            >
              {(createTransportMutation.isPending || updateTransportMutation.isPending) ? "جاري..." : editingTransport ? "تحديث" : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}