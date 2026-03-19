import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, MapPin, Loader, BarChart3, Wrench, TrendingUp, Download, Eye, Users, Truck, CheckCircle, DollarSign, FileText, Sun, ClipboardCheck, RefreshCw, ArrowUpDown } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { WellLifecycleForms } from "@/components/well-lifecycle-forms";

interface Well {
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
  status: 'pending' | 'in_progress' | 'completed';
  completionPercentage: number;
  startDate?: string;
  completionDate?: string;
  notes?: string;
  createdBy: string;
  created_at: string;
  crewCount?: number;
  transportCount?: number;
  hasSolar?: boolean;
  extraPipes?: number;
  receptionStatus?: string | null;
}

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

const STATUS_MAP = {
  pending: { label: 'لم يبدأ', color: '#9ca3af', badgeVariant: 'outline', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  in_progress: { label: 'قيد التنفيذ', color: '#f59e0b', badgeVariant: 'warning', badgeClass: 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600' },
  completed: { label: 'منجز', color: '#22c55e', badgeVariant: 'success', badgeClass: 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600' }
};

const RECEPTION_MAP: Record<string, string> = {
  pending: 'بانتظار',
  passed: 'تم الاستلام',
  failed: 'مرفوض',
};

export default function WellsPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const [regions, setRegions] = useState<string[]>(REGIONS);
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ region: 'all', status: 'all', depthRange: 'all' });

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue('');
    setFilterValues({ region: 'all', status: 'all' });
  }, []);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Well>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedWell, setSelectedWell] = useState<Partial<Well> | null>(null);
  const [showAddFanTypeDialog, setShowAddFanTypeDialog] = useState(false);
  const [newFanType, setNewFanType] = useState("");
  const [showAddPumpPowerDialog, setShowAddPumpPowerDialog] = useState(false);
  const [newPumpPower, setNewPumpPower] = useState("");
  const [lifecycleWell, setLifecycleWell] = useState<Well | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const { data: ownerNames = [] } = useQuery({
    queryKey: QUERY_KEYS.autocompleteOwnerNames(selectedProjectId),
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=ownerNames');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId
  });

  const { data: fanTypes = [] } = useQuery({
    queryKey: QUERY_KEYS.autocompleteFanTypes(selectedProjectId),
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=fanTypes');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId
  });

  const { data: pumpPowers = [] } = useQuery({
    queryKey: QUERY_KEYS.autocompletePumpPowers(selectedProjectId),
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=pumpPowers');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId
  });

  useEffect(() => {
    const handleFloatingAction = () => {
      setShowAddDialog(true);
    };
    setFloatingAction(handleFloatingAction, '+ بئر جديد');
    return () => { setFloatingAction(null); };
  }, [setFloatingAction]);

  const { data: wells = [], isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.wellsByProject(selectedProjectId),
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await apiRequest(`/api/wells?project_id=${selectedProjectId}`);
      return response.data || [];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: summaryData } = useQuery({
    queryKey: QUERY_KEYS.wellsSummary(selectedProjectId),
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const response = await apiRequest(`/api/wells/summary/${selectedProjectId}`);
      return response.data || null;
    },
    enabled: !!selectedProjectId && selectedProjectId !== 'all',
    staleTime: 5 * 60 * 1000,
  });

  const addFanTypeMutation = useMutation({
    mutationFn: async (value: string) => apiRequest('/api/autocomplete', 'POST', { category: 'fanTypes', value }),
    onSuccess: () => {
      toast({ title: "نجاح", description: "تمت إضافة نوع المروحة بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteFanTypesPrefix });
      setShowAddFanTypeDialog(false);
      setNewFanType("");
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في إضافة نوع المروحة"), variant: "destructive" }); }
  });

  const addPumpPowerMutation = useMutation({
    mutationFn: async (value: string) => apiRequest('/api/autocomplete', 'POST', { category: 'pumpPowers', value }),
    onSuccess: () => {
      toast({ title: "نجاح", description: "تمت إضافة قوة المضخة بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompletePumpPowersPrefix });
      setShowAddPumpPowerDialog(false);
      setNewPumpPower("");
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في إضافة قوة المضخة"), variant: "destructive" }); }
  });

  const addOwnerNameMutation = useMutation({
    mutationFn: async (value: string) => apiRequest('/api/autocomplete', 'POST', { category: 'ownerNames', value }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteOwnerNamesPrefix }); },
    onError: (error: any) => { console.error('خطأ في إضافة اسم المالك:', error); }
  });

  const handleOwnerNameChange = (value: string) => {
    setFormData({ ...formData, ownerName: value });
    if (value.trim() && !ownerNames.includes(value)) {
      addOwnerNameMutation.mutate(value);
    }
  };

  const createWellMutation = useMutation({
    mutationFn: async (data: Partial<Well>) => {
      if (!selectedProjectId || selectedProjectId === 'all') throw new Error('يرجى اختيار مشروع محدد أولاً');
      return apiRequest('/api/wells', 'POST', { ...data, project_id: selectedProjectId });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إنشاء البئر بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wells });
      setShowAddDialog(false);
      setFormData({});
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في إنشاء البئر"), variant: "destructive" }); }
  });

  const updateWellMutation = useMutation({
    mutationFn: async (data: Partial<Well>) => {
      if (!selectedWell?.id) throw new Error('معرف البئر غير موجود');
      return apiRequest(`/api/wells/${selectedWell.id}`, 'PUT', { ...data, project_id: selectedProjectId });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تحديث البئر بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wells });
      setShowEditDialog(false);
      setSelectedWell(null);
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في تحديث البئر"), variant: "destructive" }); }
  });

  const deleteWellMutation = useMutation({
    mutationFn: async (well_id: number) => apiRequest(`/api/wells/${well_id}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف البئر بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wells });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في حذف البئر"), variant: "destructive" }); }
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ wellId, status }: { wellId: number; status: string }) =>
      apiRequest(`/api/wells/${wellId}`, 'PUT', { status, project_id: selectedProjectId }),
    onSuccess: (_data, variables) => {
      const statusLabel = STATUS_MAP[variables.status as keyof typeof STATUS_MAP]?.label || variables.status;
      toast({ title: "نجاح", description: `تم تغيير حالة البئر إلى "${statusLabel}"` });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wells });
    },
    onError: (error: any) => { toast({ title: "خطأ", description: toUserMessage(error, "فشل في تغيير حالة البئر"), variant: "destructive" }); }
  });

  const filteredWells = useMemo(() => {
    return wells.filter((well: any) => {
      const matchesSearch =
        well.ownerName.toLowerCase().includes(searchValue.toLowerCase()) ||
        well.wellNumber.toString().includes(searchValue);
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;
      const depth = Number(well.wellDepth) || 0;
      const matchesDepth = filterValues.depthRange === 'all' ||
        (filterValues.depthRange === '0-50' && depth <= 50) ||
        (filterValues.depthRange === '51-100' && depth >= 51 && depth <= 100) ||
        (filterValues.depthRange === '101+' && depth >= 101);
      return matchesSearch && matchesRegion && matchesStatus && matchesDepth;
    });
  }, [wells, searchValue, filterValues]);

  const stats = useMemo(() => {
    const total = wells.length;
    const completed = wells.filter((w: any) => w.status === 'completed').length;
    const inProgress = wells.filter((w: any) => w.status === 'in_progress').length;
    const pending = wells.filter((w: any) => w.status === 'pending').length;

    const validCompletions = wells
      .map((w: any) => Number(w.completionPercentage))
      .filter((val: number) => Number.isFinite(val));
    const avgCompletion = validCompletions.length > 0
      ? Math.round(validCompletions.reduce((sum: number, val: number) => sum + val, 0) / validCompletions.length)
      : 0;

    const totalCrews = wells.reduce((sum: number, w: any) => sum + (Number(w.crewCount) || 0), 0);
    const totalTransport = wells.reduce((sum: number, w: any) => sum + (Number(w.transportCount) || 0), 0);
    const withSolar = wells.filter((w: any) => w.hasSolar).length;
    const receptionDone = wells.filter((w: any) => w.receptionStatus === 'passed').length;

    return { total, completed, inProgress, pending, avgCompletion, totalCrews, totalTransport, withSolar, receptionDone };
  }, [wells]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 4,
      gap: 'sm',
      items: [
        { key: 'total', label: 'إجمالي الآبار', value: summaryData?.totalWells ?? stats.total, icon: BarChart3, color: 'blue' },
        { key: 'completed', label: 'منجزة', value: summaryData?.completedWells ?? stats.completed, icon: CheckCircle, color: 'green' },
        { key: 'inProgress', label: 'قيد التنفيذ', value: summaryData?.inProgressWells ?? stats.inProgress, icon: TrendingUp, color: 'orange' },
        { key: 'pending', label: 'لم تبدأ', value: summaryData?.pendingWells ?? stats.pending, icon: MapPin, color: 'gray' },
      ]
    },
    {
      columns: 4,
      gap: 'sm',
      items: [
        { key: 'crews', label: 'فرق العمل', value: stats.totalCrews, icon: Users, color: 'indigo' },
        { key: 'transport', label: 'رحلات النقل', value: stats.totalTransport, icon: Truck, color: 'amber' },
        { key: 'solar', label: 'طاقة شمسية', value: stats.withSolar, icon: Sun, color: 'yellow' },
        { key: 'reception', label: 'تم الاستلام', value: stats.receptionDone, icon: ClipboardCheck, color: 'emerald' },
      ]
    }
  ], [stats, summaryData]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'region',
      label: 'المنطقة',
      type: 'select',
      placeholder: 'اختر المنطقة',
      options: [{ value: 'all', label: 'جميع المناطق' }, ...regions.map(r => ({ value: r, label: r }))],
      defaultValue: 'all'
    },
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      placeholder: 'اختر الحالة',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'pending', label: 'لم يبدأ', dotColor: '#9ca3af' },
        { value: 'in_progress', label: 'قيد التنفيذ', dotColor: '#f59e0b' },
        { value: 'completed', label: 'منجز', dotColor: '#22c55e' }
      ],
      defaultValue: 'all'
    },
    {
      key: 'depthRange',
      label: 'عمق البئر',
      type: 'select',
      placeholder: 'اختر النطاق',
      options: [
        { value: 'all', label: 'الكل' },
        { value: '0-50', label: '0 - 50 م' },
        { value: '51-100', label: '51 - 100 م' },
        { value: '101+', label: '101 م فأكثر' },
      ],
      defaultValue: 'all'
    },
  ], [regions]);

  const handleExportPdf = useCallback(async () => {
    if (filteredWells.length === 0) return;
    setIsExportingPdf(true);
    try {
      const { generateTablePDF } = await import('@/utils/pdfGenerator');
      const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
      const getStatusColor = (s: string) => s === 'completed' ? '#16a34a' : s === 'in_progress' ? '#ca8a04' : '#6b7280';
      const data = filteredWells.map((well: any, idx: number) => ({
        index: idx + 1, wellNumber: well.wellNumber, ownerName: well.ownerName, region: well.region || '-',
        status: getStatusText(well.status), completion: `${well.completionPercentage || 0}%`,
        wellDepth: well.wellDepth || 0, numberOfPanels: well.numberOfPanels || 0,
        numberOfPipes: (well.numberOfPipes || 0) + (well.extraPipes || 0), numberOfBases: well.numberOfBases || 0,
        crewCount: well.crewCount || 0, transportCount: well.transportCount || 0,
      }));
      const success = await generateTablePDF({
        reportTitle: 'تقرير إدارة الآبار',
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
        infoItems: [
          { label: 'عدد الآبار', value: filteredWells.length },
          { label: 'منجزة', value: stats.completed, color: '#16a34a' },
          { label: 'قيد التنفيذ', value: stats.inProgress, color: '#ca8a04' },
          { label: 'فرق العمل', value: stats.totalCrews },
          { label: 'رحلات النقل', value: stats.totalTransport },
        ],
        columns: [
          { header: '#', key: 'index', width: 5 },
          { header: 'رقم البئر', key: 'wellNumber', width: 10 },
          { header: 'المالك', key: 'ownerName', width: 20 },
          { header: 'المنطقة', key: 'region', width: 14 },
          { header: 'الحالة', key: 'status', width: 12, color: (val: any) => val === 'منجز' ? '#16a34a' : val === 'قيد التنفيذ' ? '#ca8a04' : '#6b7280' },
          { header: 'التقدم', key: 'completion', width: 10 },
          { header: 'العمق', key: 'wellDepth', width: 10 },
          { header: 'الألواح', key: 'numberOfPanels', width: 10 },
          { header: 'المواسير', key: 'numberOfPipes', width: 10 },
          { header: 'القواعد', key: 'numberOfBases', width: 10 },
          { header: 'فرق', key: 'crewCount', width: 8 },
          { header: 'نقل', key: 'transportCount', width: 8 },
        ],
        data,
        filename: `تقرير_الآبار_${new Date().toISOString().split('T')[0]}`,
        orientation: 'landscape',
      });
      if (success) toast({ title: "نجاح", description: "تم تصدير تقرير PDF بنجاح" });
      else toast({ title: "خطأ", description: "فشل في تصدير تقرير PDF", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في تصدير PDF"), variant: "destructive" });
    } finally { setIsExportingPdf(false); }
  }, [filteredWells, stats, toast]);

  const handleExportExcel = useCallback(async () => {
    if (filteredWells.length === 0) return;
    setIsExportingExcel(true);
    try {
      const { createProfessionalReport } = await import('@/utils/axion-export');
      const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
      const data = filteredWells.map((well: any, idx: number) => ({
        index: idx + 1, wellNumber: well.wellNumber, ownerName: well.ownerName, region: well.region || '-',
        wellDepth: well.wellDepth || 0, numberOfPanels: well.numberOfPanels || 0, numberOfBases: well.numberOfBases || 0,
        numberOfPipes: (well.numberOfPipes || 0) + (well.extraPipes || 0), fanType: well.fanType || '-', pumpPower: well.pumpPower || '-',
        waterLevel: well.waterLevel || '-', crewCount: well.crewCount || 0, transportCount: well.transportCount || 0,
        hasSolar: well.hasSolar ? 'نعم' : 'لا', receptionStatus: RECEPTION_MAP[well.receptionStatus || ''] || '-',
        status: getStatusText(well.status), completion: well.completionPercentage || 0,
      }));
      const success = await createProfessionalReport({
        sheetName: 'إدارة الآبار', reportTitle: 'تقرير إدارة الآبار',
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
        infoLines: [`عدد الآبار: ${data.length}`, `منجزة: ${stats.completed}`, `قيد التنفيذ: ${stats.inProgress}`, `فرق العمل: ${stats.totalCrews}`, `رحلات النقل: ${stats.totalTransport}`],
        columns: [
          { header: '#', key: 'index', width: 5 },
          { header: 'رقم البئر', key: 'wellNumber', width: 12 },
          { header: 'المالك', key: 'ownerName', width: 20 },
          { header: 'المنطقة', key: 'region', width: 16 },
          { header: 'العمق (م)', key: 'wellDepth', width: 12, numFmt: '#,##0' },
          { header: 'الألواح', key: 'numberOfPanels', width: 10, numFmt: '#,##0' },
          { header: 'المواسير', key: 'numberOfPipes', width: 10, numFmt: '#,##0' },
          { header: 'القواعد', key: 'numberOfBases', width: 10, numFmt: '#,##0' },
          { header: 'نوع المروحة', key: 'fanType', width: 14 },
          { header: 'قوة المضخة', key: 'pumpPower', width: 12 },
          { header: 'مستوى الماء', key: 'waterLevel', width: 14 },
          { header: 'فرق العمل', key: 'crewCount', width: 10, numFmt: '#,##0' },
          { header: 'رحلات النقل', key: 'transportCount', width: 10, numFmt: '#,##0' },
          { header: 'طاقة شمسية', key: 'hasSolar', width: 10 },
          { header: 'الاستلام', key: 'receptionStatus', width: 12 },
          { header: 'الحالة', key: 'status', width: 14 },
          { header: 'الإنجاز %', key: 'completion', width: 12, numFmt: '#,##0' },
        ],
        data,
        fileName: `تقرير_الآبار_${new Date().toISOString().split('T')[0]}.xlsx`,
      });
      if (success) toast({ title: "نجاح", description: "تم تصدير ملف Excel بنجاح" });
      else toast({ title: "خطأ", description: "فشل في تصدير ملف Excel", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في تصدير ملف Excel"), variant: "destructive" });
    } finally { setIsExportingExcel(false); }
  }, [filteredWells, stats]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'export-pdf',
      icon: FileText,
      label: 'تصدير PDF',
      onClick: handleExportPdf,
      variant: 'outline',
      loading: isExportingPdf,
      disabled: filteredWells.length === 0,
      tooltip: 'تصدير تقرير PDF للآبار المعروضة',
    },
    {
      key: 'export-excel',
      icon: Download,
      label: 'تصدير Excel',
      onClick: handleExportExcel,
      variant: 'outline',
      loading: isExportingExcel,
      disabled: filteredWells.length === 0,
      tooltip: 'تصدير البيانات إلى ملف Excel',
    }
  ], [handleExportPdf, handleExportExcel, isExportingPdf, isExportingExcel, filteredWells.length]);

  const resultsSummary = useMemo(() => ({
    totalCount: wells.length,
    filteredCount: filteredWells.length,
    totalLabel: 'إجمالي الآبار',
    filteredLabel: 'نتائج البحث',
    totalValue: `${stats.avgCompletion}%`,
    totalValueLabel: 'متوسط الإنجاز',
  }), [wells.length, filteredWells.length, stats.avgCompletion]);

  const getOwnerOptions = useCallback((currentValue?: string) => {
    const opts = ownerNames.map((name: string) => ({ value: name, label: name }));
    if (currentValue && !ownerNames.includes(currentValue)) {
      opts.unshift({ value: currentValue, label: currentValue });
    }
    return opts;
  }, [ownerNames]);

  const getRegionOptions = useCallback((currentValue?: string) => {
    const opts = regions.map(r => ({ value: r, label: r }));
    if (currentValue && !regions.includes(currentValue)) {
      opts.unshift({ value: currentValue, label: currentValue });
    }
    return opts;
  }, [regions]);

  const getFanTypeOptions = useCallback((currentValue?: string) => {
    const opts = fanTypes.map((type: string) => ({ value: type, label: type }));
    if (currentValue && !fanTypes.includes(currentValue)) {
      opts.unshift({ value: currentValue, label: currentValue });
    }
    return opts;
  }, [fanTypes]);

  const getPumpPowerOptions = useCallback((currentValue?: string) => {
    const opts = pumpPowers.map((power: any) => ({ value: String(power), label: String(power) }));
    if (currentValue && !pumpPowers.map(String).includes(String(currentValue))) {
      opts.unshift({ value: String(currentValue), label: String(currentValue) });
    }
    return opts;
  }, [pumpPowers]);

  if (!selectedProjectId || selectedProjectId === 'all') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500" data-testid="text-select-project">يرجى اختيار مشروع محدد لعرض وإدارة الآبار</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const renderWellForm = (data: Partial<Well>, setData: (d: Partial<Well>) => void, isEdit: boolean) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label className="text-sm font-semibold">رقم البئر *</Label>
        <Input type="number" value={data.wellNumber || ''} onChange={(e) => setData({ ...data, wellNumber: parseInt(e.target.value) })} placeholder="أدخل رقم البئر" className="h-10 text-base" data-testid="input-well-number" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">اسم المالك *</Label>
        <SearchableSelect value={data.ownerName || ''} onValueChange={(value) => { setData({ ...data, ownerName: value }); if (value.trim() && !ownerNames.includes(value)) addOwnerNameMutation.mutate(value); }} options={isEdit ? getOwnerOptions(data.ownerName) : ownerNames.map((n: string) => ({ value: n, label: n }))} placeholder="اختر أو اكتب اسم المالك" searchPlaceholder="ابحث عن اسم المالك..." showSearch={true} allowCustom={true} onCustomAdd={(v) => addOwnerNameMutation.mutate(v)} onAddNew={() => { const name = prompt("أدخل اسم المالك الجديد"); if (name?.trim()) { addOwnerNameMutation.mutate(name.trim()); setData({ ...data, ownerName: name.trim() }); } }} addNewLabel="إضافة مالك جديد" data-testid="select-owner-name" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">المنطقة *</Label>
        <SearchableSelect value={data.region || ''} onValueChange={(value) => setData({ ...data, region: value })} options={isEdit ? getRegionOptions(data.region) : regions.map(r => ({ value: r, label: r }))} placeholder="اختر المنطقة" searchPlaceholder="ابحث عن المنطقة..." showSearch={true} allowCustom={true} onCustomAdd={(v) => { if (!regions.includes(v)) setRegions(prev => [...prev, v]); }} onAddNew={() => { const region = prompt("أدخل اسم المنطقة الجديدة"); if (region?.trim()) { if (!regions.includes(region.trim())) setRegions(prev => [...prev, region.trim()]); setData({ ...data, region: region.trim() }); } }} addNewLabel="إضافة منطقة جديدة" data-testid="select-region" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">عمق البئر (متر) *</Label>
        <Input type="number" value={data.wellDepth || ''} onChange={(e) => setData({ ...data, wellDepth: parseInt(e.target.value) })} placeholder="أدخل عمق البئر" className="h-10 text-base" data-testid="input-well-depth" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">عدد الألواح *</Label>
        <Input type="number" value={data.numberOfPanels || ''} onChange={(e) => setData({ ...data, numberOfPanels: parseInt(e.target.value) })} placeholder="أدخل عدد الألواح" className="h-10 text-base" data-testid="input-panels" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">عدد القواعد *</Label>
        <Input type="number" value={data.numberOfBases || ''} onChange={(e) => setData({ ...data, numberOfBases: parseInt(e.target.value) })} placeholder="أدخل عدد القواعد" className="h-10 text-base" data-testid="input-bases" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">عدد المواسير *</Label>
        <Input type="number" value={data.numberOfPipes || ''} onChange={(e) => setData({ ...data, numberOfPipes: parseInt(e.target.value) })} placeholder="أدخل عدد المواسير" className="h-10 text-base" data-testid="input-pipes" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">مستوى الماء (متر)</Label>
        <Input type="number" value={data.waterLevel || ''} onChange={(e) => setData({ ...data, waterLevel: parseInt(e.target.value) })} placeholder="أدخل مستوى الماء" className="h-10 text-base" data-testid="input-water-level" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">نوع المروحة</Label>
        <SearchableSelect value={data.fanType || ''} onValueChange={(value) => setData({ ...data, fanType: value })} options={isEdit ? getFanTypeOptions(data.fanType) : fanTypes.map((t: string) => ({ value: t, label: t }))} placeholder="اختر نوع المروحة" searchPlaceholder="ابحث عن نوع المروحة..." showSearch={true} allowCustom={true} onCustomAdd={(v) => addFanTypeMutation.mutate(v)} onAddNew={() => setShowAddFanTypeDialog(true)} addNewLabel="إضافة نوع مروحة جديد" data-testid="select-fan-type" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">قوة المضخة</Label>
        <SearchableSelect value={data.pumpPower ? String(data.pumpPower) : ''} onValueChange={(value) => setData({ ...data, pumpPower: parseInt(value) })} options={isEdit ? getPumpPowerOptions(data.pumpPower ? String(data.pumpPower) : undefined) : pumpPowers.map((p: any) => ({ value: String(p), label: String(p) }))} placeholder="اختر قوة المضخة" searchPlaceholder="ابحث عن قوة المضخة..." showSearch={true} allowCustom={true} onCustomAdd={(v) => addPumpPowerMutation.mutate(v)} onAddNew={() => setShowAddPumpPowerDialog(true)} addNewLabel="إضافة قوة مضخة جديدة" data-testid="select-pump-power" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">الحالة</Label>
        <SearchableSelect value={data.status || ''} onValueChange={(value) => setData({ ...data, status: value as any })} options={[ { value: 'pending', label: 'لم يبدأ' }, { value: 'in_progress', label: 'قيد التنفيذ' }, { value: 'completed', label: 'منجز' } ]} placeholder="اختر الحالة" showSearch={false} data-testid="select-status" />
      </div>
      {isEdit && (
        <div className="space-y-1">
          <Label className="text-sm font-semibold">نسبة الإنجاز (%)</Label>
          <Input type="number" min="0" max="100" value={data.completionPercentage || ''} onChange={(e) => setData({ ...data, completionPercentage: parseInt(e.target.value) })} placeholder="أدخل نسبة الإنجاز" className="h-10 text-base" data-testid="input-completion" />
        </div>
      )}
      <div className={`space-y-1 ${isEdit ? '' : 'md:col-span-2'}`}>
        <Label className="text-sm font-semibold">الملاحظات</Label>
        <Input value={data.notes || ''} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="أضف ملاحظات اختيارية" className="h-10 text-base" data-testid="input-notes" />
      </div>
    </div>
  );

  return (
    <div className="p-4 slide-in space-y-4">
      <UnifiedFilterDashboard
        hideHeader={true}
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث باسم المالك أو رقم البئر..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellsByProject(selectedProjectId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellsSummary(selectedProjectId) });
        }}
        isRefreshing={isFetching}
        actions={actionsConfig}
        resultsSummary={resultsSummary}
      />

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2"><DialogTitle>إضافة بئر جديد</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 py-2">
            {renderWellForm(formData, setFormData, false)}
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} size="sm" data-testid="button-cancel-add">إلغاء</Button>
            <Button
              onClick={() => {
                if (!formData.wellNumber || !formData.ownerName || !formData.region || !formData.wellDepth || !formData.numberOfPanels || !formData.numberOfPipes || !formData.numberOfBases) {
                  toast({ title: "تنبيه", description: "يرجى ملء جميع الحقول الإجبارية", variant: "destructive" });
                  return;
                }
                createWellMutation.mutate(formData);
              }}
              size="sm"
              disabled={createWellMutation.isPending || !formData.wellNumber || !formData.ownerName || !formData.region || !formData.wellDepth || !formData.numberOfPanels || !formData.numberOfPipes || !formData.numberOfBases}
              data-testid="button-submit-add"
            >
              {createWellMutation.isPending ? 'جاري...' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddFanTypeDialog} onOpenChange={setShowAddFanTypeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة نوع مروحة جديد</DialogTitle></DialogHeader>
          <div className="space-y-4"><div><Label>اسم نوع المروحة</Label><Input placeholder="مثال: مروحة سقفية" value={newFanType} onChange={(e) => setNewFanType(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFanTypeMutation.mutate(newFanType)} data-testid="input-new-fan-type" /></div></div>
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowAddFanTypeDialog(false)} size="sm">إلغاء</Button><Button onClick={() => addFanTypeMutation.mutate(newFanType)} size="sm" data-testid="button-save-fan-type">{addFanTypeMutation.isPending ? 'جاري...' : 'إضافة'}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddPumpPowerDialog} onOpenChange={setShowAddPumpPowerDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة قوة مضخة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4"><div><Label>قوة المضخة</Label><Input placeholder="مثال: 1.5 أو 2.0" value={newPumpPower} onChange={(e) => setNewPumpPower(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPumpPowerMutation.mutate(newPumpPower)} data-testid="input-new-pump-power" /></div></div>
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowAddPumpPowerDialog(false)} size="sm">إلغاء</Button><Button onClick={() => addPumpPowerMutation.mutate(newPumpPower)} size="sm" data-testid="button-save-pump-power">{addPumpPowerMutation.isPending ? 'جاري...' : 'إضافة'}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2"><DialogTitle>تعديل بيانات البئر</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 py-2">
            {selectedWell && renderWellForm(selectedWell, (d) => setSelectedWell(d as Partial<Well>), true)}
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} size="sm" data-testid="button-cancel-edit">إلغاء</Button>
            <Button
              onClick={() => {
                if (!selectedWell?.wellNumber || !selectedWell?.ownerName || !selectedWell?.region || !selectedWell?.wellDepth || !selectedWell?.numberOfPanels || !selectedWell?.numberOfPipes || !selectedWell?.numberOfBases) {
                  toast({ title: "تنبيه", description: "يرجى ملء جميع الحقول الإجبارية", variant: "destructive" });
                  return;
                }
                updateWellMutation.mutate(selectedWell || {});
              }}
              size="sm"
              disabled={updateWellMutation.isPending || !selectedWell?.wellNumber || !selectedWell?.ownerName || !selectedWell?.region || !selectedWell?.wellDepth || !selectedWell?.numberOfPanels || !selectedWell?.numberOfPipes || !selectedWell?.numberOfBases}
              data-testid="button-submit-edit"
            >
              {updateWellMutation.isPending ? 'جاري...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UnifiedCardGrid columns={2}>
        {filteredWells.map((well: any) => (
          <UnifiedCard
            key={well.id}
            title={`بئر #${well.wellNumber} - ${well.ownerName}`}
            subtitle={well.region}
            titleIcon={MapPin}
            headerColor={STATUS_MAP[well.status as keyof typeof STATUS_MAP]?.color}
            badges={[
              {
                label: STATUS_MAP[well.status as keyof typeof STATUS_MAP]?.label,
                className: STATUS_MAP[well.status as keyof typeof STATUS_MAP]?.badgeClass,
              }
            ]}
            fields={[
              { label: 'المنطقة', value: well.region, icon: MapPin, color: 'info' as const },
              { label: 'العمق', value: `${well.wellDepth}م`, icon: TrendingUp, color: 'warning' as const },
              { label: 'الألواح', value: well.numberOfPanels, icon: BarChart3, color: 'success' as const },
              { label: 'المواسير', value: (well.numberOfPipes || 0) + (well.extraPipes || 0), icon: Wrench, color: 'success' as const },
              { label: 'القواعد', value: well.numberOfBases, icon: BarChart3, color: 'info' as const },
              { label: 'مستوى الماء', value: well.waterLevel ? `${well.waterLevel}م` : '-', icon: TrendingUp, color: 'info' as const },
              { label: 'التقدم', value: `${Number.isFinite(Number(well.completionPercentage)) ? Number(well.completionPercentage) : 0}%`, emphasis: true, color: 'info' as const, icon: TrendingUp },
              ...(well.fanType ? [{ label: 'نوع المروحة', value: well.fanType, icon: Wrench, color: 'info' as const }] : []),
              ...(well.pumpPower ? [{ label: 'قوة المضخة', value: `${well.pumpPower}`, icon: Wrench, color: 'warning' as const }] : []),
            ]}
            footer={
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap pt-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1" data-testid={`text-crew-count-${well.id}`}>
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                    <span>فرق: <b className="text-foreground">{well.crewCount || 0}</b></span>
                  </span>
                  <span className="flex items-center gap-1" data-testid={`text-transport-count-${well.id}`}>
                    <Truck className="h-3.5 w-3.5 text-amber-500" />
                    <span>نقل: <b className="text-foreground">{well.transportCount || 0}</b></span>
                  </span>
                  <span className="flex items-center gap-1" data-testid={`text-solar-status-${well.id}`}>
                    <Sun className="h-3.5 w-3.5 text-yellow-500" />
                    <span>شمسية: <b className={well.hasSolar ? 'text-green-600' : 'text-muted-foreground'}>{well.hasSolar ? '✓' : '-'}</b></span>
                  </span>
                  <span className="flex items-center gap-1" data-testid={`text-reception-status-${well.id}`}>
                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>الاستلام: <b className={well.receptionStatus === 'passed' ? 'text-green-600' : 'text-muted-foreground'}>{RECEPTION_MAP[well.receptionStatus || ''] || '-'}</b></span>
                  </span>
                </div>
              </div>
            }
            actions={[
              {
                icon: Eye,
                label: 'إدارة',
                onClick: () => setLifecycleWell(well),
                color: 'green'
              },
              {
                icon: Edit,
                label: 'تعديل',
                onClick: () => {
                  setSelectedWell({ ...well });
                  setShowEditDialog(true);
                },
                color: 'blue'
              },
              {
                icon: ArrowUpDown,
                label: 'تغيير الحالة',
                onClick: () => {},
                color: 'yellow',
                dropdown: Object.entries(STATUS_MAP)
                  .map(([key, val]) => ({
                    label: key === well.status ? `${val.label} ✓` : val.label,
                    onClick: () => { if (key !== well.status) changeStatusMutation.mutate({ wellId: well.id, status: key }); }
                  }))
              },
              {
                icon: Trash2,
                label: 'حذف',
                onClick: () => {
                  if (confirm('هل أنت متأكد من حذف هذا البئر؟')) {
                    deleteWellMutation.mutate(well.id);
                  }
                },
                color: 'red'
              }
            ]}
          />
        ))}
      </UnifiedCardGrid>

      {filteredWells.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-gray-500 text-lg" data-testid="text-no-wells">لا توجد آبار</p>
          <p className="text-gray-400 text-sm mt-1">أضف بئراً جديداً باستخدام الزر أدناه</p>
        </div>
      )}

      {lifecycleWell && (
        <WellLifecycleForms
          wellId={lifecycleWell.id}
          wellNumber={lifecycleWell.wellNumber}
          ownerName={lifecycleWell.ownerName}
          onClose={() => {
            setLifecycleWell(null);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellsByProject(selectedProjectId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellsSummary(selectedProjectId) });
          }}
        />
      )}
    </div>
  );
}
