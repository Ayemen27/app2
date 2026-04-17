import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, FilterType, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { createProfessionalReport } from "@/utils/axion-export";
import { formatDate, fmtNum } from "@/lib/utils";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import {
  Users, Truck, Download, Loader, Plus, Edit, Trash2, BarChart3, Calendar, Wrench, MapPin, TrendingUp, Zap, ArrowUpDown, FileText
} from "lucide-react";

interface CrewWorkerData {
  id: number;
  crew_id: number;
  worker_id: string;
  daily_wage_snapshot: string | null;
  work_days: string | null;
  crew_type: string | null;
  notes: string | null;
  created_at: string;
  worker_name: string | null;
  worker_type: string | null;
  worker_daily_wage: string | null;
}

function CrewLinkedWorkers({ crewId, manualWorkersCount, manualMastersCount, manualTotalWages }: { crewId: number; manualWorkersCount: number; manualMastersCount: number; manualTotalWages: number }) {
  const { data: workersData, isLoading } = useQuery<CrewWorkerData[]>({
    queryKey: ['/api/wells/crews', crewId, 'workers'],
    queryFn: async () => {
      const res = await apiRequest(`/api/wells/crews/${crewId}/workers`);
      return res.data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="text-[10px] text-muted-foreground animate-pulse" data-testid={`text-crew-workers-loading-${crewId}`}>
        جاري تحميل العمال...
      </div>
    );
  }

  if (!workersData || workersData.length === 0) return null;

  const autoWorkers = workersData.filter(w => w.worker_type === 'عامل').length;
  const autoMasters = workersData.filter(w => w.worker_type === 'معلم' || w.worker_type === 'مشرف').length;
  const autoTotalWages = workersData.reduce((sum, w) => {
    const wage = Number(w.daily_wage_snapshot || w.worker_daily_wage || 0);
    const days = Number(w.work_days || 1);
    return sum + (wage * days);
  }, 0);

  const hasDiscrepancy = (manualWorkersCount > 0 || manualMastersCount > 0) &&
    (autoWorkers !== manualWorkersCount || autoMasters !== manualMastersCount);

  return (
    <div className="space-y-1 mt-1" data-testid={`section-crew-workers-${crewId}`}>
      <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
        <Users className="h-2.5 w-2.5" /> العمال المرتبطون ({workersData.length})
      </div>
      <div className="space-y-0.5">
        {workersData.map((w) => (
          <div key={w.id} className="flex items-center justify-between gap-1 text-[10px] px-1.5 py-0.5 rounded bg-background/60 dark:bg-background/30" data-testid={`text-crew-worker-${w.id}`}>
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-medium text-foreground truncate">{w.worker_name || 'غير معروف'}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">
                {w.worker_type || '-'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
              {w.work_days && <span>{fmtNum(w.work_days)} يوم</span>}
              <span className="font-medium text-foreground">{Number(w.daily_wage_snapshot || w.worker_daily_wage || 0).toLocaleString('en-US')} ر</span>
            </div>
          </div>
        ))}
      </div>
      {hasDiscrepancy && (
        <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400" data-testid={`text-crew-discrepancy-${crewId}`}>
          <TrendingUp className="h-2.5 w-2.5 shrink-0" />
          <span>يدوي: {fmtNum(manualWorkersCount)} عمال / {fmtNum(manualMastersCount)} معلمين — تلقائي: {fmtNum(autoWorkers)} عمال / {fmtNum(autoMasters)} معلمين</span>
        </div>
      )}
      {manualTotalWages > 0 && autoTotalWages > 0 && Math.abs(manualTotalWages - autoTotalWages) > 1 && (
        <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400" data-testid={`text-crew-wages-comparison-${crewId}`}>
          <BarChart3 className="h-2.5 w-2.5 shrink-0" />
          <span>أجور يدوية: {manualTotalWages.toLocaleString('en-US')} ر — تلقائية: {autoTotalWages.toLocaleString('en-US')} ر</span>
        </div>
      )}
    </div>
  );
}

const WELL_STATUS_MAP: Record<string, { label: string; color: string; badgeClass: string }> = {
  pending: { label: 'لم يبدأ', color: '#9ca3af', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  in_progress: { label: 'قيد التنفيذ', color: '#f59e0b', badgeClass: 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600' },
  completed: { label: 'منجز', color: '#22c55e', badgeClass: 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600' },
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

const RAIL_TYPE_MAP: Record<string, string> = {
  new: "جديد",
  old: "قديم",
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
  status: string;
  crews: any[];
  transport: any[];
  operationalCosts?: {
    transportation: number;
    materials: number;
    misc: number;
    total: number;
    details: any[];
  };
}

export default function WellCrewsPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { setFloatingAction } = useFloatingButton();

  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    region: 'all', crewType: [], status: 'all', teamName: [], dateRange: undefined
  });
  const [showCrewForm, setShowCrewForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [editingCrew, setEditingCrew] = useState<any>(null);
  const [editingTransport, setEditingTransport] = useState<any>(null);
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [newWorkerForm, setNewWorkerForm] = useState({ worker_id: '', work_days: '' });

  const emptyCrewForm = {
    crewType: "", teamName: "", workersCount: 0, mastersCount: 0,
    workDays: "", workerDailyWage: "", masterDailyWage: "", totalWages: "",
    crewDues: "", workDate: "", notes: "",
  };
  const [crewForm, setCrewForm] = useState(emptyCrewForm);

  const computedCrewDues = useMemo(() => {
    const workers = Number(crewForm.workersCount) || 0;
    const masters = Number(crewForm.mastersCount) || 0;
    const days = Number(crewForm.workDays) || 0;
    const workerWage = Number(crewForm.workerDailyWage) || 0;
    const masterWage = Number(crewForm.masterDailyWage) || 0;
    return (workers * workerWage * days) + (masters * masterWage * days);
  }, [crewForm.workersCount, crewForm.mastersCount, crewForm.workDays, crewForm.workerDailyWage, crewForm.masterDailyWage]);

  useEffect(() => {
    if (computedCrewDues > 0) {
      setCrewForm(prev => ({ ...prev, crewDues: String(computedCrewDues) }));
    }
  }, [computedCrewDues]);

  const emptyTransportForm = {
    railType: "", withPanels: false, transportPrice: "",
    transportDate: "", notes: "",
  };
  const [transportForm, setTransportForm] = useState(emptyTransportForm);

  const [showAddCrewTypeDialog, setShowAddCrewTypeDialog] = useState(false);
  const [newCrewTypeName, setNewCrewTypeName] = useState("");
  const [showAddTeamNameDialog, setShowAddTeamNameDialog] = useState(false);
  const [newTeamNameValue, setNewTeamNameValue] = useState("");
  const [showAddRailTypeDialog, setShowAddRailTypeDialog] = useState(false);
  const [newRailTypeName, setNewRailTypeName] = useState("");

  const [customCrewTypes, setCustomCrewTypes] = useState<Array<{value: string; label: string}>>([]);
  const [customRailTypes, setCustomRailTypes] = useState<Array<{value: string; label: string}>>([]);
  const [customTeamNames, setCustomTeamNames] = useState<string[]>([]);

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

  const teamNameOptions = useMemo(() => {
    const names = new Set<string>();
    (fullData as WellFullData[]).forEach(w => {
      (w.crews || []).forEach((c: any) => {
        const name = c.teamName || c.team_name;
        if (name) names.add(name);
      });
    });
    customTeamNames.forEach(n => names.add(n));
    return Array.from(names).sort().map(n => ({ value: n, label: n }));
  }, [fullData, customTeamNames]);

  const allCrewTypeOptions = useMemo(() => {
    const merged = [...CREW_TYPES];
    customCrewTypes.forEach(ct => {
      if (!merged.some(m => m.value === ct.value)) merged.push(ct);
    });
    return merged;
  }, [customCrewTypes]);

  const allRailTypeOptions = useMemo(() => {
    const base = [{ value: "new", label: "جديد" }, { value: "old", label: "قديم" }];
    customRailTypes.forEach(ct => {
      if (!base.some(b => b.value === ct.value)) base.push(ct);
    });
    return base;
  }, [customRailTypes]);

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
    setFilterValues({ region: 'all', crewType: [], status: 'all', teamName: [], dateRange: undefined });
  }, []);

  const selectedCrewTypes: string[] = Array.isArray(filterValues.crewType) ? filterValues.crewType : [];
  const selectedTeamNames: string[] = Array.isArray(filterValues.teamName) ? filterValues.teamName : [];
  const hasCrewFilters = selectedCrewTypes.length > 0 || selectedTeamNames.length > 0;

  const filteredData = useMemo(() => {
    const dateFrom = filterValues.dateRange?.from ? new Date(filterValues.dateRange.from) : null;
    const dateTo = filterValues.dateRange?.to ? new Date(filterValues.dateRange.to) : null;
    if (dateFrom) dateFrom.setHours(0, 0, 0, 0);
    if (dateTo) dateTo.setHours(23, 59, 59, 999);

    const crewMatchesFn = (c: any) => {
      const ct = c.crewType || c.crew_type;
      const tn = c.teamName || c.team_name;
      const matchesCT = selectedCrewTypes.length === 0 || selectedCrewTypes.includes(ct);
      const matchesTN = selectedTeamNames.length === 0 || selectedTeamNames.includes(tn);
      let matchesD = true;
      if (dateFrom || dateTo) {
        const d = c.workDate || c.work_date;
        if (!d) { matchesD = false; }
        else {
          const date = new Date(d);
          if (dateFrom && date < dateFrom) matchesD = false;
          if (dateTo && date > dateTo) matchesD = false;
        }
      }
      return matchesCT && matchesTN && matchesD;
    };

    return (fullData as WellFullData[]).filter((well) => {
      const matchesSearch =
        well.ownerName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        String(well.wellNumber).includes(searchValue);
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;

      const hasMatchingCrews = !hasCrewFilters || well.crews?.some(crewMatchesFn);

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

      return matchesSearch && matchesRegion && hasMatchingCrews && matchesStatus && matchesDate;
    });
  }, [fullData, searchValue, filterValues, hasCrewFilters, selectedCrewTypes, selectedTeamNames]);

  const getFilteredCrews = useCallback((crews: any[]) => {
    if (!hasCrewFilters) return crews;
    return crews.filter((c: any) => {
      const ct = c.crewType || c.crew_type;
      const tn = c.teamName || c.team_name;
      const matchesCT = selectedCrewTypes.length === 0 || selectedCrewTypes.includes(ct);
      const matchesTN = selectedTeamNames.length === 0 || selectedTeamNames.includes(tn);
      return matchesCT && matchesTN;
    });
  }, [selectedCrewTypes, selectedTeamNames, hasCrewFilters]);

  const stats = useMemo(() => {
    const allCrews = filteredData.flatMap(w => getFilteredCrews(w.crews || []));
    const allTransport = filteredData.flatMap(w => w.transport || []);
    const totalWorkDays = allCrews.reduce((sum, c) => sum + (Number(c.workDays || c.work_days) || 0), 0);
    const totalWages = allCrews.reduce((sum, c) => sum + (Number(c.totalWages || c.total_wages) || 0), 0);
    const totalTransportCost = allTransport.reduce((sum, t) => sum + (Number(t.transportPrice || t.transport_price) || 0), 0);
    const totalOperationalCosts = filteredData.reduce((sum, w) => sum + (w.operationalCosts?.total || 0), 0);
    const totalWellCost = totalWages + totalTransportCost + totalOperationalCosts;

    return {
      wellCount: filteredData.length,
      crewCount: allCrews.length,
      totalWorkDays,
      totalWages,
      transportCount: allTransport.length,
      totalTransportCost,
      totalOperationalCosts,
      totalWellCost,
    };
  }, [filteredData, getFilteredCrews]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'wells', label: 'عدد الآبار', value: stats.wellCount, icon: BarChart3, color: 'blue' },
        { key: 'crews', label: 'إجمالي الفرق', value: stats.crewCount, icon: Users, color: 'indigo' },
        { key: 'workDays', label: 'إجمالي أيام العمل', value: fmtNum(stats.totalWorkDays), icon: Calendar, color: 'green' },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'wages', label: 'إجمالي الأجور', value: `${stats.totalWages.toLocaleString('en-US')} ر`, icon: Wrench, color: 'orange' },
        { key: 'transport', label: 'رحلات النقل', value: stats.transportCount, icon: Truck, color: 'amber' },
        { key: 'transportCost', label: 'تكلفة النقل', value: `${stats.totalTransportCost.toLocaleString('en-US')} ر`, icon: Truck, color: 'purple' },
      ]
    },
    {
      columns: 2,
      gap: 'sm',
      items: [
        { key: 'opCosts', label: 'مصاريف تشغيلية', value: `${stats.totalOperationalCosts.toLocaleString('en-US')} ر`, icon: Zap, color: 'red' },
        { key: 'totalCost', label: 'إجمالي تكلفة الآبار', value: `${stats.totalWellCost.toLocaleString('en-US')} ر`, icon: BarChart3, color: 'green' },
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
        { value: 'pending', label: 'لم يبدأ', dotColor: '#9ca3af' },
        { value: 'in_progress', label: 'قيد التنفيذ', dotColor: '#f59e0b' },
        { value: 'completed', label: 'منجز', dotColor: '#22c55e' },
      ],
      defaultValue: 'all'
    },
    {
      key: 'crewType', label: 'نوع العمل', type: 'multi-select' as FilterType, placeholder: 'اختر أنواع العمل',
      options: [...CREW_TYPES],
    },
    {
      key: 'teamName', label: 'اسم الفريق', type: 'multi-select' as FilterType, placeholder: 'اختر الفرق',
      options: [...teamNameOptions],
    },
    {
      key: 'dateRange', label: 'الفترة الزمنية', type: 'date-range' as any, placeholder: 'اختر الفترة',
    },
  ], [teamNameOptions]);

  const changeStatusMutation = useMutation({
    mutationFn: async ({ wellId, status }: { wellId: number; status: string }) =>
      apiRequest(`/api/wells/${wellId}`, 'PUT', { status, project_id: selectedProjectId }),
    onSuccess: (_data, variables) => {
      const statusLabel = WELL_STATUS_MAP[variables.status]?.label || variables.status;
      toast({ title: "نجاح", description: `تم تغيير حالة البئر إلى "${statusLabel}"` });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في تغيير حالة البئر"), variant: "destructive" }); }
  });

  const deleteWellMutation = useMutation({
    mutationFn: async (wellId: number) => apiRequest(`/api/wells/${wellId}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف البئر بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في حذف البئر"), variant: "destructive" }); }
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
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في إضافة طاقم العمل"), variant: "destructive" });
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
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في تحديث طاقم العمل"), variant: "destructive" });
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
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في حذف طاقم العمل"), variant: "destructive" });
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
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في إضافة سجل النقل"), variant: "destructive" });
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
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في تحديث سجل النقل"), variant: "destructive" });
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
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في حذف سجل النقل"), variant: "destructive" });
    },
  });

  // ---- عمال الفريق ----
  const { data: allWorkersData } = useQuery<any[]>({
    queryKey: ['/api/workers'],
    queryFn: async () => {
      const res = await apiRequest('/api/workers');
      return res.data || res || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: editingCrewWorkers = [], refetch: refetchCrewWorkers } = useQuery<CrewWorkerData[]>({
    queryKey: ['/api/wells/crews', editingCrew?.id, 'workers'],
    queryFn: async () => {
      if (!editingCrew?.id) return [];
      const res = await apiRequest(`/api/wells/crews/${editingCrew.id}/workers`);
      return res.data || [];
    },
    enabled: !!editingCrew?.id,
    staleTime: 0,
  });

  const addCrewWorkerMutation = useMutation({
    mutationFn: async ({ crewId, worker_id, work_days }: { crewId: number; worker_id: string; work_days: string }) =>
      apiRequest(`/api/wells/crews/${crewId}/workers`, 'POST', { worker_id, work_days: Number(work_days) || null }),
    onSuccess: () => {
      setNewWorkerForm({ worker_id: '', work_days: '' });
      refetchCrewWorkers();
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      toast({ title: 'تم ربط العامل بالطاقم' });
    },
    onError: (error: any) => toast({ title: 'خطأ', description: toUserMessage(error, 'فشل في ربط العامل'), variant: 'destructive' }),
  });

  const removeCrewWorkerMutation = useMutation({
    mutationFn: async ({ crewId, linkId }: { crewId: number; linkId: number }) =>
      apiRequest(`/api/wells/crews/${crewId}/workers/${linkId}`, 'DELETE'),
    onSuccess: () => {
      refetchCrewWorkers();
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
      toast({ title: 'تم إلغاء ربط العامل' });
    },
    onError: (error: any) => toast({ title: 'خطأ', description: toUserMessage(error, 'فشل في إلغاء ربط العامل'), variant: 'destructive' }),
  });

  const updateCrewWorkerMutation = useMutation({
    mutationFn: async ({ crewId, linkId, work_days }: { crewId: number; linkId: number; work_days: string }) =>
      apiRequest(`/api/wells/crews/${crewId}/workers/${linkId}`, 'PUT', { work_days: Number(work_days) }),
    onSuccess: () => {
      refetchCrewWorkers();
    },
    onError: (error: any) => toast({ title: 'خطأ', description: toUserMessage(error), variant: 'destructive' }),
  });

  const workerOptions = useMemo(() => {
    if (!allWorkersData) return [];
    const linkedIds = new Set(editingCrewWorkers.map(w => w.worker_id));
    return allWorkersData
      .filter((w: any) => !linkedIds.has(w.id || w.worker_id))
      .map((w: any) => ({ value: w.id || w.worker_id, label: `${w.name} - ${w.type || ''}` }));
  }, [allWorkersData, editingCrewWorkers]);

  const resetCrewForm = () => {
    setCrewForm(emptyCrewForm);
    setEditingCrew(null);
    setSelectedWellId(null);
    setShowCrewForm(false);
    setNewWorkerForm({ worker_id: '', work_days: '' });
  };

  const resetTransportForm = () => {
    setTransportForm(emptyTransportForm);
    setEditingTransport(null);
    setSelectedWellId(null);
    setShowTransportForm(false);
  };

  const normalizeDate = (val: any): string => {
    if (!val || val === '') return '';
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [d, m, y] = str.split('-');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return `${y}-${m}-${d}`;
    }
    try {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    } catch {}
    return '';
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
      crewDues: String(crew.crewDues ?? crew.crew_dues ?? ""),
      workDate: normalizeDate(crew.workDate || crew.work_date),
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
      transportDate: normalizeDate(transport.transportDate || transport.transport_date),
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
            crewDues: crew ? (Number(crew.crewDues || crew.crew_dues) || '') : '',
            crewDate: crew ? (crew.workDate || crew.work_date || '') : '',
            railType: transport ? (RAIL_TYPE_MAP[transport.railType || transport.rail_type] || transport.railType || transport.rail_type || '') : '',
            withPanels: transport ? ((transport.withPanels ?? transport.with_panels) ? 'نعم' : 'لا') : '',
            transportPrice: transport ? (Number(transport.transportPrice || transport.transport_price) || '') : '',
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
          { header: 'تاريخ العمل', key: 'crewDate', width: 12 },
          { header: 'عدد العمال', key: 'workersCount', width: 10 },
          { header: 'عدد المعلمين', key: 'mastersCount', width: 10 },
          { header: 'أيام العمل', key: 'workDays', width: 10 },
          { header: 'مستحقات الفريق', key: 'crewDues', width: 12, numFmt: '#,##0' },
          { header: 'ملاحظات الفريق', key: 'crewNotes', width: 16 },
          { header: 'ريلات', key: 'railType', width: 10 },
          { header: 'مع ألواح', key: 'withPanels', width: 10 },
          { header: 'سعر النقل', key: 'transportPrice', width: 12, numFmt: '#,##0' },
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
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في التصدير"), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [filteredData, stats, toast]);

  const crewColumns = [
    { header: '#', key: 'index', width: 5 },
    { header: 'رقم البئر', key: 'wellNumber', width: 10 },
    { header: 'اسم المستفيد', key: 'ownerName', width: 18 },
    { header: 'المنطقة', key: 'region', width: 14 },
    { header: 'القواعد', key: 'numberOfBases', width: 8 },
    { header: 'الألواح', key: 'numberOfPanels', width: 8 },
    { header: 'نوع الفريق', key: 'crewType', width: 14 },
    { header: 'اسم الفريق', key: 'teamName', width: 14 },
    { header: 'تاريخ العمل', key: 'crewDate', width: 12 },
    { header: 'العمال', key: 'workersCount', width: 8 },
    { header: 'المعلمين', key: 'mastersCount', width: 8 },
    { header: 'أيام العمل', key: 'workDays', width: 9 },
    { header: 'مستحقات الفريق', key: 'crewDues', width: 12 },
    { header: 'ملاحظات الفريق', key: 'crewNotes', width: 14 },
    { header: 'ريلات', key: 'railType', width: 8 },
    { header: 'مع ألواح', key: 'withPanels', width: 8 },
    { header: 'سعر النقل', key: 'transportPrice', width: 10 },
    { header: 'ملاحظات النقل', key: 'transportNotes', width: 14 },
  ];

  const handleExportPdf = useCallback(async () => {
    if (filteredData.length === 0) return;
    setIsExportingPdf(true);
    try {
      const { generateTablePDF } = await import("@/utils/pdfGenerator");
      const rows: Record<string, any>[] = [];
      let rowIdx = 0;
      for (const well of filteredData) {
        const maxLen = Math.max(well.crews?.length || 0, well.transport?.length || 0, 1);
        for (let i = 0; i < maxLen; i++) {
          const crew = well.crews?.[i];
          const transport = well.transport?.[i];
          rowIdx++;
          rows.push({
            index: i === 0 ? rowIdx : '',
            wellNumber: i === 0 ? well.wellNumber : '',
            ownerName: i === 0 ? well.ownerName : '',
            region: i === 0 ? (well.region || '-') : '',
            numberOfBases: i === 0 ? well.numberOfBases : '',
            numberOfPanels: i === 0 ? well.numberOfPanels : '',
            crewType: crew ? (CREW_TYPE_MAP[crew.crewType || crew.crew_type] || '') : '',
            teamName: crew ? (crew.teamName || crew.team_name || '') : '',
            crewDate: crew ? (crew.workDate || crew.work_date || '') : '',
            workersCount: crew ? (crew.workersCount ?? crew.workers_count ?? '') : '',
            mastersCount: crew ? (crew.mastersCount ?? crew.masters_count ?? '') : '',
            workDays: crew ? (crew.workDays ?? crew.work_days ?? '') : '',
            crewDues: crew ? (Number(crew.crewDues || crew.crew_dues) || '') : '',
            crewNotes: crew ? (crew.notes || '') : '',
            railType: transport ? (RAIL_TYPE_MAP[transport.railType || transport.rail_type] || '') : '',
            withPanels: transport ? ((transport.withPanels ?? transport.with_panels) ? 'نعم' : 'لا') : '',
            transportPrice: transport ? (Number(transport.transportPrice || transport.transport_price) || '') : '',
            transportNotes: transport ? (transport.notes || '') : '',
          });
        }
      }
      const success = await generateTablePDF({
        reportTitle: "كشف حسابات العمال والنقل",
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString("en-GB")}`,
        infoItems: [
          { label: "عدد الآبار", value: stats.wellCount },
          { label: "إجمالي الفرق", value: stats.crewCount },
          { label: "أيام العمل", value: stats.totalWorkDays },
          { label: "رحلات النقل", value: stats.transportCount },
        ],
        columns: crewColumns,
        data: rows,
        totals: { label: 'الإجمالي', values: { transportPrice: stats.totalTransportCost, workDays: stats.totalWorkDays } },
        filename: `كشف_الفرق_والنقل_${new Date().toISOString().split("T")[0]}`,
        orientation: "landscape",
      });
      if (success) toast({ title: "نجاح", description: "تم تصدير تقرير PDF بنجاح" });
      else toast({ title: "خطأ", description: "فشل في تصدير تقرير PDF", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في تصدير PDF"), variant: "destructive" });
    } finally { setIsExportingPdf(false); }
  }, [filteredData, stats, toast]);

  const [isRebuilding, setIsRebuilding] = useState(false);
  const handleRebuildCrewTotals = useCallback(async () => {
    setIsRebuilding(true);
    try {
      await apiRequest('/api/wells/crews/rebuild-totals', 'POST');
      toast({ title: 'تم إعادة بناء أجور الفرق بنجاح', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WELLS_FULL_EXPORT] });
      queryClient.invalidateQueries({ queryKey: ["wells-full-data"] });
    } catch (err) {
      toast({ title: 'فشل في إعادة بناء أجور الفرق', variant: 'destructive' });
    } finally {
      setIsRebuilding(false);
    }
  }, [toast, queryClient]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'rebuild-totals',
      icon: ArrowUpDown,
      label: 'مزامنة الأجور',
      onClick: handleRebuildCrewTotals,
      variant: 'outline',
      loading: isRebuilding,
      tooltip: 'إعادة حساب أجور الفرق من بيانات العمال المرتبطين',
    },
    {
      key: 'export-pdf',
      icon: FileText,
      label: 'تصدير PDF',
      onClick: handleExportPdf,
      variant: 'outline',
      loading: isExportingPdf,
      disabled: filteredData.length === 0,
      tooltip: 'تصدير كشف الفرق والنقل إلى PDF',
    },
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
  ], [handleExportExcel, handleExportPdf, handleRebuildCrewTotals, isExporting, isExportingPdf, isRebuilding, filteredData.length]);

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
            const visibleCrews = getFilteredCrews(well.crews || []);
            const crewCount = visibleCrews.length;
            const transportCount = well.transport?.length || 0;
            const totalCrewWages = visibleCrews.reduce((s: number, c: any) => s + (Number(c.totalWages ?? c.total_wages) || 0), 0);
            const totalTransportCost = (well.transport || []).reduce((s: number, t: any) => s + (Number(t.transportPrice ?? t.transport_price) || 0), 0);
            const opCosts = well.operationalCosts || { transportation: 0, materials: 0, misc: 0, total: 0 };
            const wellTotalCost = totalCrewWages + totalTransportCost + opCosts.total;

            return (
              <UnifiedCard
                key={well.id}
                data-testid={`card-well-crews-${well.id}`}
                title={`بئر #${well.wellNumber} - ${well.ownerName}`}
                titleIcon={MapPin}
                headerColor={WELL_STATUS_MAP[well.status]?.color || '#9ca3af'}
                compact
                badges={[
                  { label: WELL_STATUS_MAP[well.status]?.label || 'لم يبدأ', className: WELL_STATUS_MAP[well.status]?.badgeClass || WELL_STATUS_MAP.pending.badgeClass },
                  { label: `${crewCount} فريق`, variant: crewCount > 0 ? "default" : "outline" as any },
                  ...(transportCount > 0 ? [{ label: `${transportCount} نقل`, variant: "secondary" as any }] : []),
                ]}
                fields={[
                  { label: "المنطقة", value: well.region || "-", icon: MapPin, color: "info" as const },
                  { label: "القواعد", value: well.numberOfBases || 0, icon: BarChart3, color: "info" as const },
                  { label: "الألواح", value: well.numberOfPanels || 0, icon: Zap, color: "success" as const },
                  { label: "إجمالي الأجور", value: totalCrewWages > 0 ? `${totalCrewWages.toLocaleString('en-US')} ر` : "-", icon: Wrench, color: totalCrewWages > 0 ? "warning" as const : "muted" as const },
                  { label: "مصاريف تشغيلية", value: opCosts.total > 0 ? `${opCosts.total.toLocaleString('en-US')} ر` : "-", icon: Zap, color: opCosts.total > 0 ? "danger" as const : "muted" as const },
                  { label: "إجمالي تكلفة البئر", value: wellTotalCost > 0 ? `${wellTotalCost.toLocaleString('en-US')} ر` : "-", icon: BarChart3, color: wellTotalCost > 0 ? "success" as const : "muted" as const, emphasis: true },
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
                footer={
                  <div className="space-y-1 pt-0">
                    {crewCount > 0 && (
                      <>
                        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-500" /> الفرق ({crewCount})
                        </div>
                        {visibleCrews.map((crew: any) => {
                          const crewTypeKey = crew.crewType || crew.crew_type || "";
                          const crewType = CREW_TYPE_MAP[crewTypeKey] || crewTypeKey;
                          const colors = CREW_TYPE_COLORS[crewTypeKey] || { bg: "bg-muted/30", border: "border-border", badge: "" };
                          const workDate = crew.workDate || crew.work_date;
                          const crewDues = Number(crew.crewDues ?? crew.crew_dues ?? 0);
                          const totalWages = Number(crew.totalWages ?? crew.total_wages ?? 0);
                          return (
                            <div key={`crew-${crew.id}`} className={`border rounded-md p-2 space-y-1 ${colors.bg} ${colors.border}`} data-testid={`row-crew-${crew.id}`}>
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${colors.badge}`}>{crewType}</Badge>
                                  <span className="text-xs font-semibold text-foreground break-words">{crew.teamName || crew.team_name || '-'}</span>
                                </div>
                                <div className="flex gap-0.5 shrink-0">
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditCrew(crew, well.id)} data-testid={`button-edit-crew-${crew.id}`}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { if (confirm("حذف هذا الفريق؟")) deleteCrewMutation.mutate(crew.id); }} data-testid={`button-delete-crew-${crew.id}`}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[11px]">
                                <span>عمال: <b className="text-foreground">{fmtNum(crew.workersCount ?? crew.workers_count ?? 0)}</b></span>
                                <span>معلمين: <b className="text-foreground">{fmtNum(crew.mastersCount ?? crew.masters_count ?? 0)}</b></span>
                                <span>أيام: <b className="text-foreground">{fmtNum(crew.workDays ?? crew.work_days ?? 0)}</b></span>
                                {workDate ? (
                                  <span className="flex items-center gap-0.5">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <b className="text-foreground">{formatDate(workDate)}</b>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">بدون تاريخ</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 text-[11px]">
                                {totalWages > 0 && (
                                  <span>إجمالي الأجور: <b className="text-green-600 dark:text-green-400">{totalWages.toLocaleString('en-US')} ر</b></span>
                                )}
                                {crewDues > 0 && (
                                  <span>مستحقات الفريق: <b className="text-blue-600 dark:text-blue-400">{crewDues.toLocaleString('en-US')} ر</b></span>
                                )}
                              </div>
                              {crew.notes && (
                                <div className="text-[11px] text-muted-foreground break-words">ملاحظات: {crew.notes}</div>
                              )}
                              <CrewLinkedWorkers
                                crewId={crew.id}
                                manualWorkersCount={Number(crew.workersCount ?? crew.workers_count ?? 0)}
                                manualMastersCount={Number(crew.mastersCount ?? crew.masters_count ?? 0)}
                                manualTotalWages={totalWages}
                              />
                            </div>
                          );
                        })}
                      </>
                    )}

                    {transportCount > 0 && (
                      <>
                        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Truck className="h-3 w-3 text-amber-500" /> النقل ({transportCount})
                        </div>
                        {well.transport.map((t: any) => {
                          const tDate = t.transportDate || t.transport_date;
                          const rawRail = t.railType || t.rail_type || '-';
                          const railLabel = RAIL_TYPE_MAP[rawRail] || rawRail;
                          return (
                            <div key={`transport-${t.id}`} className="border rounded-md p-2 space-y-1 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid={`row-transport-${t.id}`}>
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">{railLabel}</Badge>
                                  {(t.withPanels ?? t.with_panels) && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">مع ألواح</Badge>
                                  )}
                                  {tDate && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(tDate)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-0.5 shrink-0">
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditTransport(t, well.id)} data-testid={`button-edit-transport-${t.id}`}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { if (confirm("حذف سجل النقل؟")) deleteTransportMutation.mutate(t.id); }} data-testid={`button-delete-transport-${t.id}`}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 text-[11px]">
                                <span>سعر النقل: <b className="text-foreground">{Number(t.transportPrice || t.transport_price || 0).toLocaleString('en-US')} ر</b></span>
                                {!tDate && <span className="text-muted-foreground">بدون تاريخ</span>}
                              </div>
                              {t.notes && (
                                <div className="text-[11px] text-muted-foreground break-words">ملاحظات: {t.notes}</div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {opCosts.total > 0 && (
                      <>
                        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Zap className="h-3 w-3 text-red-500" /> المصاريف التشغيلية
                        </div>
                        <div className="border rounded-md p-2 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800" data-testid={`section-op-costs-${well.id}`}>
                          <div className="grid grid-cols-3 gap-x-2 text-[11px]">
                            {opCosts.transportation > 0 && (
                              <span>مواصلات: <b className="text-red-600 dark:text-red-400">{opCosts.transportation.toLocaleString('en-US')} ر</b></span>
                            )}
                            {opCosts.materials > 0 && (
                              <span>مواد: <b className="text-red-600 dark:text-red-400">{opCosts.materials.toLocaleString('en-US')} ر</b></span>
                            )}
                            {opCosts.misc > 0 && (
                              <span>نثريات: <b className="text-red-600 dark:text-red-400">{opCosts.misc.toLocaleString('en-US')} ر</b></span>
                            )}
                          </div>
                          <div className="text-[11px] font-semibold mt-1 text-red-700 dark:text-red-300">
                            الإجمالي: {opCosts.total.toLocaleString('en-US')} ر
                          </div>
                        </div>
                      </>
                    )}

                    {crewCount === 0 && transportCount === 0 && opCosts.total === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-1" data-testid={`text-no-data-${well.id}`}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                options={allCrewTypeOptions}
                placeholder="اختر نوع الطاقم"
                allowCustom
                onCustomAdd={(v) => {
                  setCustomCrewTypes(prev => [...prev, { value: v, label: v }]);
                }}
                onAddNew={() => setShowAddCrewTypeDialog(true)}
                addNewLabel="إضافة نوع طاقم جديد"
                data-testid="select-crew-type"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">اسم الفريق</Label>
              <SearchableSelect
                value={crewForm.teamName}
                onValueChange={(v) => setCrewForm({ ...crewForm, teamName: v })}
                options={teamNameOptions}
                placeholder="اختر اسم الفريق"
                searchPlaceholder="ابحث عن فريق..."
                allowCustom
                onCustomAdd={(v) => {
                  setCustomTeamNames(prev => prev.includes(v) ? prev : [...prev, v]);
                }}
                onAddNew={() => setShowAddTeamNameDialog(true)}
                addNewLabel="إضافة فريق جديد"
                data-testid="select-crew-team-name"
              />
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
              <Label className="text-sm">مستحقات الفريق</Label>
              <Input type="number" value={crewForm.crewDues} readOnly className="bg-muted/50 font-semibold" data-testid="input-crew-dues" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">تاريخ العمل</Label>
              <Input type="date" value={crewForm.workDate} onChange={(e) => setCrewForm({ ...crewForm, workDate: e.target.value })} data-testid="input-crew-work-date" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-sm">ملاحظات</Label>
              <textarea
                value={crewForm.notes}
                onChange={(e) => setCrewForm({ ...crewForm, notes: e.target.value })}
                placeholder="ملاحظات اختيارية"
                data-testid="input-crew-notes"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden min-h-[38px]"
                rows={1}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = Math.max(38, el.scrollHeight) + 'px';
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.max(38, target.scrollHeight) + 'px';
                }}
              />
            </div>
          </div>
          {editingCrew && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> ربط العمال بالطاقم ({editingCrewWorkers.length})
              </p>
              {editingCrewWorkers.length > 0 && (
                <div className="space-y-1">
                  {editingCrewWorkers.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded bg-background border" data-testid={`row-crew-worker-${w.id}`}>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{w.worker_name || 'غير معروف'}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 mr-1">{w.worker_type || '-'}</Badge>
                        <span className="text-muted-foreground mr-1">{Number(w.daily_wage_snapshot || w.worker_daily_wage || 0).toLocaleString('en-US')} ر/يوم</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          className="h-6 w-16 text-xs px-1"
                          defaultValue={w.work_days || ''}
                          placeholder="أيام"
                          data-testid={`input-worker-days-${w.id}`}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== (w.work_days || '')) {
                              updateCrewWorkerMutation.mutate({ crewId: editingCrew.id, linkId: w.id, work_days: val });
                            }
                          }}
                        />
                        <span className="text-muted-foreground text-[10px]">
                          = {(Number(w.daily_wage_snapshot || w.worker_daily_wage || 0) * Number(w.work_days || 0)).toLocaleString('en-US')} ر
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:bg-destructive/10"
                          onClick={() => removeCrewWorkerMutation.mutate({ crewId: editingCrew.id, linkId: w.id })}
                          disabled={removeCrewWorkerMutation.isPending}
                          data-testid={`button-remove-worker-${w.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold text-green-700 dark:text-green-400 px-2">
                    إجمالي الأجور: {editingCrewWorkers.reduce((s, w) => s + Number(w.daily_wage_snapshot || w.worker_daily_wage || 0) * Number(w.work_days || 0), 0).toLocaleString('en-US')} ر
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2 pt-1">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">إضافة عامل</Label>
                  <SearchableSelect
                    value={newWorkerForm.worker_id}
                    onValueChange={(v) => setNewWorkerForm(f => ({ ...f, worker_id: v }))}
                    options={workerOptions}
                    placeholder="اختر عاملاً..."
                    searchPlaceholder="ابحث باسم العامل..."
                    data-testid="select-new-crew-worker"
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">الأيام</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    className="h-9"
                    placeholder="0"
                    value={newWorkerForm.work_days}
                    onChange={(e) => setNewWorkerForm(f => ({ ...f, work_days: e.target.value }))}
                    data-testid="input-new-crew-worker-days"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9"
                  disabled={!newWorkerForm.worker_id || addCrewWorkerMutation.isPending}
                  onClick={() => {
                    if (!newWorkerForm.worker_id) return;
                    addCrewWorkerMutation.mutate({
                      crewId: editingCrew.id,
                      worker_id: newWorkerForm.worker_id,
                      work_days: newWorkerForm.work_days,
                    });
                  }}
                  data-testid="button-add-crew-worker"
                >
                  {addCrewWorkerMutation.isPending ? <Loader className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}
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
                options={allRailTypeOptions}
                placeholder="جديد / قديم"
                allowCustom
                onCustomAdd={(v) => {
                  setCustomRailTypes(prev => [...prev, { value: v, label: v }]);
                }}
                onAddNew={() => setShowAddRailTypeDialog(true)}
                addNewLabel="إضافة نوع ريلات جديد"
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
            <div className="space-y-1 col-span-2">
              <Label className="text-sm">ملاحظات</Label>
              <textarea
                value={transportForm.notes}
                onChange={(e) => setTransportForm({ ...transportForm, notes: e.target.value })}
                placeholder="ملاحظات اختيارية"
                data-testid="input-transport-notes"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden min-h-[38px]"
                rows={1}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = Math.max(38, el.scrollHeight) + 'px';
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.max(38, target.scrollHeight) + 'px';
                }}
              />
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

      <Dialog open={showAddCrewTypeDialog} onOpenChange={setShowAddCrewTypeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة نوع طاقم جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm">اسم نوع الطاقم</Label><Input placeholder="مثال: تركيب كهرباء" value={newCrewTypeName} onChange={(e) => setNewCrewTypeName(e.target.value)} data-testid="input-new-crew-type" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAddCrewTypeDialog(false)}>إلغاء</Button>
            <Button size="sm" disabled={!newCrewTypeName.trim()} onClick={() => {
              const val = newCrewTypeName.trim();
              setCustomCrewTypes(prev => [...prev, { value: val, label: val }]);
              setCrewForm(f => ({ ...f, crewType: val }));
              setNewCrewTypeName("");
              setShowAddCrewTypeDialog(false);
              toast({ title: "تم", description: `تمت إضافة نوع الطاقم "${val}"` });
            }} data-testid="button-save-new-crew-type">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTeamNameDialog} onOpenChange={setShowAddTeamNameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة فريق جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm">اسم الفريق</Label><Input placeholder="مثال: فريق الجراحي" value={newTeamNameValue} onChange={(e) => setNewTeamNameValue(e.target.value)} data-testid="input-new-team-name" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAddTeamNameDialog(false)}>إلغاء</Button>
            <Button size="sm" disabled={!newTeamNameValue.trim()} onClick={() => {
              const val = newTeamNameValue.trim();
              setCustomTeamNames(prev => prev.includes(val) ? prev : [...prev, val]);
              setCrewForm(f => ({ ...f, teamName: val }));
              setNewTeamNameValue("");
              setShowAddTeamNameDialog(false);
              toast({ title: "تم", description: `تمت إضافة الفريق "${val}"` });
            }} data-testid="button-save-new-team-name">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRailTypeDialog} onOpenChange={setShowAddRailTypeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة نوع ريلات جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm">نوع الريلات</Label><Input placeholder="مثال: مستعمل" value={newRailTypeName} onChange={(e) => setNewRailTypeName(e.target.value)} data-testid="input-new-rail-type" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAddRailTypeDialog(false)}>إلغاء</Button>
            <Button size="sm" disabled={!newRailTypeName.trim()} onClick={() => {
              const val = newRailTypeName.trim();
              setCustomRailTypes(prev => [...prev, { value: val, label: val }]);
              setTransportForm(f => ({ ...f, railType: val }));
              setNewRailTypeName("");
              setShowAddRailTypeDialog(false);
              toast({ title: "تم", description: `تمت إضافة نوع الريلات "${val}"` });
            }} data-testid="button-save-new-rail-type">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}