import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, MapPin, Loader, BarChart3, X, CirclePlus, Wrench, TrendingUp, Download, Eye, Users, Truck, CheckCircle, DollarSign, FileText } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
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
}

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

const STATUS_MAP = {
  pending: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-800', badgeVariant: 'outline' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-800', badgeVariant: 'warning' },
  completed: { label: 'منجز', color: 'bg-green-100 text-green-800', badgeVariant: 'success' }
};

export default function WellsPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  
  // إدارة المناطق
  const [regions, setRegions] = useState<string[]>(REGIONS);
  
  // استخدام UnifiedFilter للبحث والفلترة
  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset,
  } = useUnifiedFilter({
    region: 'all',
    status: 'all'
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Well>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedWell, setSelectedWell] = useState<Partial<Well> | null>(null);
  
  // إضافة خيارات جديدة
  const [showAddFanTypeDialog, setShowAddFanTypeDialog] = useState(false);
  const [newFanType, setNewFanType] = useState("");
  const [showAddPumpPowerDialog, setShowAddPumpPowerDialog] = useState(false);
  const [newPumpPower, setNewPumpPower] = useState("");
  const [lifecycleWell, setLifecycleWell] = useState<Well | null>(null);

  // جلب بيانات الإكمال التلقائي
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

  // تعيين الزر العائم عند دخول الصفحة
  useEffect(() => {
    const handleFloatingAction = () => {
      setShowAddDialog(true);
    };
    
    setFloatingAction(handleFloatingAction, '+ بئر جديد');
    
    // تنظيف عند مغادرة الصفحة
    return () => {
      setFloatingAction(null);
    };
  }, [setFloatingAction]);

  // جلب الآبار
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
    retry: 1
  });

  // إضافة نوع مروحة جديد
  const addFanTypeMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest('/api/autocomplete', 'POST', {
        category: 'fanTypes',
        value
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تمت إضافة نوع المروحة بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteFanTypesPrefix });
      setShowAddFanTypeDialog(false);
      setNewFanType("");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إضافة نوع المروحة",
        variant: "destructive"
      });
    }
  });

  // إضافة قوة مضخة جديدة
  const addPumpPowerMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest('/api/autocomplete', 'POST', {
        category: 'pumpPowers',
        value
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تمت إضافة قوة المضخة بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompletePumpPowersPrefix });
      setShowAddPumpPowerDialog(false);
      setNewPumpPower("");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إضافة قوة المضخة",
        variant: "destructive"
      });
    }
  });

  // إضافة اسم مالك جديد
  const addOwnerNameMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest('/api/autocomplete', 'POST', {
        category: 'ownerNames',
        value
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteOwnerNamesPrefix });
    },
    onError: (error: any) => {
      console.error('خطأ في إضافة اسم المالك:', error);
    }
  });

  // معالج تغيير اسم المالك مع الإضافة التلقائية
  const handleOwnerNameChange = (value: string) => {
    setFormData({ ...formData, ownerName: value });
    // إذا لم تكن القيمة موجودة في القائمة، أضفها تلقائياً
    if (value.trim() && !ownerNames.includes(value)) {
      addOwnerNameMutation.mutate(value);
    }
  };

  // إنشاء بئر
  const createWellMutation = useMutation({
    mutationFn: async (data: Partial<Well>) => {
      if (!selectedProjectId || selectedProjectId === 'all') {
        throw new Error('يرجى اختيار مشروع محدد أولاً');
      }
      return apiRequest('/api/wells', 'POST', {
        ...data,
        project_id: selectedProjectId
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تم إنشاء البئر بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wells });
      setShowAddDialog(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء البئر",
        variant: "destructive"
      });
    }
  });

  // تحديث بئر
  const updateWellMutation = useMutation({
    mutationFn: async (data: Partial<Well>) => {
      if (!selectedWell?.id) throw new Error('معرف البئر غير موجود');
      return apiRequest(`/api/wells/${selectedWell.id}`, 'PUT', {
        ...data,
        project_id: selectedProjectId
      });
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تم تحديث البئر بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wells });
      setShowEditDialog(false);
      setSelectedWell(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث البئر",
        variant: "destructive"
      });
    }
  });

  // حذف بئر
  const deleteWellMutation = useMutation({
    mutationFn: async (well_id: number) => {
      return apiRequest(`/api/wells/${well_id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "نجاح",
        description: "تم حذف البئر بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wells });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف البئر",
        variant: "destructive"
      });
    }
  });

  // فلترة الآبار
  const filteredWells = useMemo(() => {
    return wells.filter((well: any) => {
      const matchesSearch = 
        well.ownerName.toLowerCase().includes(searchValue.toLowerCase()) ||
        well.wellNumber.toString().includes(searchValue);
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;
      
      return matchesSearch && matchesRegion && matchesStatus;
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

    const totalCrews = wells.reduce((sum: number, w: any) => {
      const val = Number(w.crewCount);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
    const totalTransport = wells.reduce((sum: number, w: any) => {
      const val = Number(w.transportCount);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
    const receptionDone = wells.filter((w: any) => w.receptionStatus === 'completed' || w.receptionStatus === 'done').length;

    return { total, completed, inProgress, pending, avgCompletion, totalCrews, totalTransport, receptionDone };
  }, [wells]);

  if (!selectedProjectId || selectedProjectId === 'all') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">يرجى اختيار مشروع محدد لعرض وإدارة الآبار</p>
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* شريط الإحصائيات الموحد */}
      <UnifiedStats
        title="إحصائيات الآبار"
        hideHeader={false}
        stats={[
          {
            title: 'إجمالي الآبار',
            value: summaryData?.totalWells ?? stats.total,
            icon: BarChart3,
            color: 'blue',
            status: stats.total === 0 ? 'normal' : undefined
          },
          {
            title: 'منجزة',
            value: summaryData?.completedWells ?? stats.completed,
            icon: CheckCircle,
            color: 'green',
            status: stats.completed > stats.inProgress ? 'normal' : 'warning'
          },
          {
            title: 'قيد التنفيذ',
            value: summaryData?.inProgressWells ?? stats.inProgress,
            icon: Loader,
            color: 'amber',
            status: stats.inProgress > 0 ? 'normal' : undefined
          },
          {
            title: 'لم تبدأ بعد',
            value: summaryData?.pendingWells ?? stats.pending,
            icon: MapPin,
            color: 'gray',
            status: stats.pending > stats.completed ? 'warning' : undefined
          },
          {
            title: 'متوسط التقدم',
            value: `${Number.isFinite(summaryData?.averageCompletion) ? summaryData.averageCompletion : stats.avgCompletion}%`,
            icon: TrendingUp,
            color: 'indigo'
          },
          {
            title: 'عدد الطواقم',
            value: stats.totalCrews,
            icon: Users,
            color: 'blue'
          },
          {
            title: 'رحلات النقل',
            value: stats.totalTransport,
            icon: Truck,
            color: 'amber'
          },
          {
            title: 'تم الاستلام',
            value: stats.receptionDone,
            icon: CheckCircle,
            color: 'green'
          }
        ]}
        columns={4}
        showStatus={true}
      />

      {/* شريط البحث والفلترة الموحد */}
      <UnifiedSearchFilter
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="ابحث باسم المالك أو رقم البئر..."
        showSearch={true}
        filters={[
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
              { value: 'pending', label: 'لم يبدأ' },
              { value: 'in_progress', label: 'قيد التنفيذ' },
              { value: 'completed', label: 'منجز' }
            ],
            defaultValue: 'all'
          }
        ]}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        onReset={onReset}
        showResetButton={true}
        showActiveFilters={true}
        compact={false}
      />

      {/* أزرار التصدير */}
      <div className="flex justify-end gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (filteredWells.length === 0) return;
            const { generatePDF } = await import('@/utils/pdfGenerator');
            const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
            const getStatusColor = (s: string) => s === 'completed' ? '#16a34a' : s === 'in_progress' ? '#ca8a04' : '#6b7280';

            const tableRows = filteredWells.map((well: any, idx: number) => `
              <tr style="background:${idx % 2 === 0 ? '#fff' : '#F0F4F8'};">
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${idx + 1}</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${well.wellNumber}</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:right;font-size:10px;">${well.ownerName}</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${well.region || '-'}</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;"><span style="color:${getStatusColor(well.status)};font-weight:700;">${getStatusText(well.status)}</span></td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${well.completionPercentage || 0}%</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${well.wellDepth || 0}</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${well.numberOfPanels || 0}</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${well.numberOfPipes || 0}</td>
                <td style="padding:6px 4px;border:1px solid #CBD5E1;text-align:center;font-size:10px;">${well.numberOfBases || 0}</td>
              </tr>
            `).join('');

            const html = `
              <div dir="rtl" lang="ar" style="font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;padding:0;margin:0;width:794px;">
                <div style="background:#1B2A4A;color:#fff;text-align:center;padding:10px 0;font-size:16px;font-weight:800;">الفتيني للمقاولات العامة والاستشارات الهندسية</div>
                <div style="background:#2E5090;color:#fff;text-align:center;padding:8px 0;font-size:14px;font-weight:700;">تقرير إدارة الآبار</div>
                <div style="text-align:center;padding:6px 0;font-size:11px;color:#6B7280;">تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}</div>
                <div style="display:flex;justify-content:center;gap:24px;padding:8px 16px;font-size:11px;background:#F0F4F8;margin:0 16px;border-radius:4px;">
                  <span>عدد الآبار: <b>${filteredWells.length}</b></span>
                  <span>منجزة: <b style="color:#16a34a;">${stats.completed}</b></span>
                  <span>قيد التنفيذ: <b style="color:#ca8a04;">${stats.inProgress}</b></span>
                  <span>لم تبدأ: <b style="color:#6b7280;">${stats.pending}</b></span>
                  <span>متوسط التقدم: <b>${stats.avgCompletion}%</b></span>
                </div>
                <table style="width:calc(100% - 32px);border-collapse:collapse;margin:12px 16px;table-layout:auto;">
                  <thead>
                    <tr style="background:#1B2A4A;color:#fff;">
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">#</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">رقم البئر</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">المالك</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">المنطقة</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">الحالة</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">التقدم</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">العمق (م)</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">الألواح</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">المواسير</th>
                      <th style="padding:6px 4px;border:1px solid #2E5090;font-size:9px;font-weight:800;text-align:center;">القواعد</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>
                <div style="text-align:center;padding:8px 0;font-size:9px;color:#9CA3AF;border-top:1px solid #E5E7EB;margin:8px 16px 0;">
                  تم إنشاء هذا التقرير آلياً بواسطة نظام إدارة مشاريع البناء - ${new Date().toLocaleDateString('en-GB')} - ${new Date().toLocaleTimeString('en-GB')}
                </div>
              </div>
            `;

            const success = await generatePDF({
              html,
              filename: `تقرير_الآبار_${new Date().toISOString().split('T')[0]}`,
              orientation: 'landscape',
              format: 'A4',
            });

            if (success) {
              toast({ title: "نجاح", description: "تم تصدير تقرير PDF بنجاح" });
            } else {
              toast({ title: "خطأ", description: "فشل في تصدير تقرير PDF", variant: "destructive" });
            }
          }}
          disabled={filteredWells.length === 0}
          className="gap-2"
          data-testid="button-export-wells-pdf"
        >
          <FileText className="h-4 w-4" />
          تصدير PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (filteredWells.length === 0) return;
            const { createProfessionalReport } = await import('@/utils/axion-export');
            const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
            const data = filteredWells.map((well: any, idx: number) => ({
              index: idx + 1,
              wellNumber: well.wellNumber,
              ownerName: well.ownerName,
              region: well.region || '-',
              wellDepth: well.wellDepth || 0,
              numberOfPanels: well.numberOfPanels || 0,
              numberOfBases: well.numberOfBases || 0,
              numberOfPipes: well.numberOfPipes || 0,
              fanType: well.fanType || '-',
              pumpPower: well.pumpPower || '-',
              waterLevel: well.waterLevel || '-',
              status: getStatusText(well.status),
              completion: well.completionPercentage || 0,
            }));
            await createProfessionalReport({
              sheetName: 'إدارة الآبار',
              reportTitle: 'تقرير إدارة الآبار',
              subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
              infoLines: [`عدد الآبار: ${data.length}`, `منجزة: ${stats.completed}`, `قيد التنفيذ: ${stats.inProgress}`, `لم تبدأ: ${stats.pending}`],
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
                { header: 'مستوى الماء (م)', key: 'waterLevel', width: 14 },
                { header: 'الحالة', key: 'status', width: 14 },
                { header: 'الإنجاز %', key: 'completion', width: 12, numFmt: '#,##0' },
              ],
              data,
              fileName: `تقرير_الآبار_${new Date().toISOString().split('T')[0]}.xlsx`,
            });
          }}
          disabled={filteredWells.length === 0}
          className="gap-2"
          data-testid="button-export-wells"
        >
          <Download className="h-4 w-4" />
          تصدير Excel
        </Button>
      </div>

      {/* نموذج إضافة بئر جديد */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle>إضافة بئر جديد</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">رقم البئر *</Label>
                <Input
                  type="number"
                  value={formData.wellNumber || ''}
                  onChange={(e) => setFormData({ ...formData, wellNumber: parseInt(e.target.value) })}
                  placeholder="أدخل رقم البئر"
                  className="h-10 text-base"
                  autoWidth
                  maxWidth={200}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">اسم المالك *</Label>
                <SearchableSelect
                  value={formData.ownerName || ''}
                  onValueChange={handleOwnerNameChange}
                  options={ownerNames.map((name: string) => ({ value: name, label: name }))}
                  placeholder="اختر أو اكتب اسم المالك"
                  searchPlaceholder="ابحث عن اسم المالك..."
                  showSearch={true}
                  allowCustom={true}
                  onCustomAdd={(value) => addOwnerNameMutation.mutate(value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">المنطقة *</Label>
                <SearchableSelect
                  value={formData.region || ''}
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                  options={regions.map(region => ({ value: region, label: region }))}
                  placeholder="اختر المنطقة"
                  searchPlaceholder="ابحث عن المنطقة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عمق البئر (متر) *</Label>
                <Input
                  type="number"
                  value={formData.wellDepth || ''}
                  onChange={(e) => setFormData({ ...formData, wellDepth: parseInt(e.target.value) })}
                  placeholder="أدخل عمق البئر"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عدد الألواح *</Label>
                <Input
                  type="number"
                  value={formData.numberOfPanels || ''}
                  onChange={(e) => setFormData({ ...formData, numberOfPanels: parseInt(e.target.value) })}
                  placeholder="أدخل عدد الألواح"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عدد القواعد *</Label>
                <Input
                  type="number"
                  value={formData.numberOfBases || ''}
                  onChange={(e) => setFormData({ ...formData, numberOfBases: parseInt(e.target.value) })}
                  placeholder="أدخل عدد القواعد"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عدد المواسير *</Label>
                <Input
                  type="number"
                  value={formData.numberOfPipes || ''}
                  onChange={(e) => setFormData({ ...formData, numberOfPipes: parseInt(e.target.value) })}
                  placeholder="أدخل عدد المواسير"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">مستوى الماء (متر)</Label>
                <Input
                  type="number"
                  value={formData.waterLevel || ''}
                  onChange={(e) => setFormData({ ...formData, waterLevel: parseInt(e.target.value) })}
                  placeholder="أدخل مستوى الماء"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 mb-1">
                  <Label className="text-sm font-semibold flex-1">نوع المروحة</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowAddFanTypeDialog(true)}
                  >
                    + إضافة
                  </Button>
                </div>
                <SearchableSelect
                  value={formData.fanType || ''}
                  onValueChange={(value) => setFormData({ ...formData, fanType: value })}
                  options={fanTypes.map((type: string) => ({ value: type, label: type }))}
                  placeholder="اختر نوع المروحة"
                  searchPlaceholder="ابحث عن نوع المروحة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 mb-1">
                  <Label className="text-sm font-semibold flex-1">قوة المضخة</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowAddPumpPowerDialog(true)}
                  >
                    + إضافة
                  </Button>
                </div>
                <SearchableSelect
                  value={formData.pumpPower ? String(formData.pumpPower) : ''}
                  onValueChange={(value) => setFormData({ ...formData, pumpPower: parseInt(value) })}
                  options={pumpPowers.map((power: any) => ({ value: String(power), label: String(power) }))}
                  placeholder="اختر قوة المضخة"
                  searchPlaceholder="ابحث عن قوة المضخة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-sm font-semibold">الحالة</Label>
                <SearchableSelect
                  value={formData.status || ''}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  options={[
                    { value: 'pending', label: 'لم يبدأ' },
                    { value: 'in_progress', label: 'قيد التنفيذ' },
                    { value: 'completed', label: 'منجز' }
                  ]}
                  placeholder="اختر الحالة"
                  searchPlaceholder="ابحث عن الحالة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-sm font-semibold">الملاحظات</Label>
                <Input
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أضف ملاحظات اختيارية"
                  className="h-10 text-base"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} size="sm">إلغاء</Button>
            <Button 
              onClick={() => {
                if (!formData.wellNumber || !formData.ownerName || !formData.region || !formData.wellDepth || !formData.numberOfPanels || !formData.numberOfPipes || !formData.numberOfBases) {
                  toast({
                    title: "تنبيه",
                    description: "يرجى ملء جميع الحقول الإجبارية",
                    variant: "destructive"
                  });
                  return;
                }
                createWellMutation.mutate(formData);
              }} 
              size="sm"
              disabled={createWellMutation.isPending || !formData.wellNumber || !formData.ownerName || !formData.region || !formData.wellDepth || !formData.numberOfPanels || !formData.numberOfPipes || !formData.numberOfBases}
            >
              {createWellMutation.isPending ? 'جاري...' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نموذج إضافة نوع مروحة جديد */}
      <Dialog open={showAddFanTypeDialog} onOpenChange={setShowAddFanTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة نوع مروحة جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم نوع المروحة</Label>
              <Input
                placeholder="مثال: مروحة سقفية"
                value={newFanType}
                onChange={(e) => setNewFanType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFanTypeMutation.mutate(newFanType)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddFanTypeDialog(false)} size="sm">إلغاء</Button>
            <Button onClick={() => addFanTypeMutation.mutate(newFanType)} size="sm">
              {addFanTypeMutation.isPending ? 'جاري...' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نموذج إضافة قوة مضخة جديدة */}
      <Dialog open={showAddPumpPowerDialog} onOpenChange={setShowAddPumpPowerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة قوة مضخة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>قوة المضخة</Label>
              <Input
                placeholder="مثال: 1.5 أو 2.0"
                value={newPumpPower}
                onChange={(e) => setNewPumpPower(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPumpPowerMutation.mutate(newPumpPower)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddPumpPowerDialog(false)} size="sm">إلغاء</Button>
            <Button onClick={() => addPumpPowerMutation.mutate(newPumpPower)} size="sm">
              {addPumpPowerMutation.isPending ? 'جاري...' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نموذج تعديل بئر */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle>تعديل بيانات البئر</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">رقم البئر *</Label>
                <Input
                  type="number"
                  value={selectedWell?.wellNumber || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, wellNumber: parseInt(e.target.value) })}
                  placeholder="أدخل رقم البئر"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">اسم المالك *</Label>
                <SearchableSelect
                  value={selectedWell?.ownerName || ''}
                  onValueChange={(value) => setSelectedWell({ ...selectedWell, ownerName: value })}
                  options={ownerNames.map((name: string) => ({ value: name, label: name }))}
                  placeholder="اختر اسم المالك"
                  searchPlaceholder="ابحث عن اسم المالك..."
                  showSearch={true}
                  allowCustom={true}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">المنطقة *</Label>
                <SearchableSelect
                  value={selectedWell?.region || ''}
                  onValueChange={(value) => setSelectedWell({ ...selectedWell, region: value })}
                  options={regions.map(region => ({ value: region, label: region }))}
                  placeholder="اختر المنطقة"
                  searchPlaceholder="ابحث عن المنطقة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عمق البئر (متر) *</Label>
                <Input
                  type="number"
                  value={selectedWell?.wellDepth || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, wellDepth: parseInt(e.target.value) })}
                  placeholder="أدخل عمق البئر"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عدد الألواح *</Label>
                <Input
                  type="number"
                  value={selectedWell?.numberOfPanels || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, numberOfPanels: parseInt(e.target.value) })}
                  placeholder="أدخل عدد الألواح"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عدد القواعد *</Label>
                <Input
                  type="number"
                  value={selectedWell?.numberOfBases || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, numberOfBases: parseInt(e.target.value) })}
                  placeholder="أدخل عدد القواعد"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">عدد المواسير *</Label>
                <Input
                  type="number"
                  value={selectedWell?.numberOfPipes || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, numberOfPipes: parseInt(e.target.value) })}
                  placeholder="أدخل عدد المواسير"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">مستوى الماء (متر)</Label>
                <Input
                  type="number"
                  value={selectedWell?.waterLevel || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, waterLevel: parseInt(e.target.value) })}
                  placeholder="أدخل مستوى الماء"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">نوع المروحة</Label>
                <SearchableSelect
                  value={selectedWell?.fanType || ''}
                  onValueChange={(value) => setSelectedWell({ ...selectedWell, fanType: value })}
                  options={fanTypes.map((type: string) => ({ value: type, label: type }))}
                  placeholder="اختر نوع المروحة"
                  searchPlaceholder="ابحث عن نوع المروحة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">قوة المضخة</Label>
                <SearchableSelect
                  value={selectedWell?.pumpPower ? String(selectedWell.pumpPower) : ''}
                  onValueChange={(value) => setSelectedWell({ ...selectedWell, pumpPower: parseInt(value) })}
                  options={pumpPowers.map((power: any) => ({ value: String(power), label: String(power) }))}
                  placeholder="اختر قوة المضخة"
                  searchPlaceholder="ابحث عن قوة المضخة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">الحالة</Label>
                <SearchableSelect
                  value={selectedWell?.status || ''}
                  onValueChange={(value) => setSelectedWell({ ...selectedWell, status: value as any })}
                  options={[
                    { value: 'pending', label: 'لم يبدأ' },
                    { value: 'in_progress', label: 'قيد التنفيذ' },
                    { value: 'completed', label: 'منجز' }
                  ]}
                  placeholder="اختر الحالة"
                  searchPlaceholder="ابحث عن الحالة..."
                  showSearch={true}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">نسبة الإنجاز (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedWell?.completionPercentage || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, completionPercentage: parseInt(e.target.value) })}
                  placeholder="أدخل نسبة الإنجاز"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-sm font-semibold">الملاحظات</Label>
                <Input
                  value={selectedWell?.notes || ''}
                  onChange={(e) => setSelectedWell({ ...selectedWell, notes: e.target.value })}
                  placeholder="أضف ملاحظات اختيارية"
                  className="h-10 text-base"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} size="sm">إلغاء</Button>
            <Button 
              onClick={() => {
                if (!selectedWell?.wellNumber || !selectedWell?.ownerName || !selectedWell?.region || !selectedWell?.wellDepth || !selectedWell?.numberOfPanels || !selectedWell?.numberOfPipes || !selectedWell?.numberOfBases) {
                  toast({
                    title: "تنبيه",
                    description: "يرجى ملء جميع الحقول الإجبارية",
                    variant: "destructive"
                  });
                  return;
                }
                updateWellMutation.mutate(selectedWell || {});
              }} 
              size="sm"
              disabled={updateWellMutation.isPending || !selectedWell?.wellNumber || !selectedWell?.ownerName || !selectedWell?.region || !selectedWell?.wellDepth || !selectedWell?.numberOfPanels || !selectedWell?.numberOfPipes || !selectedWell?.numberOfBases}
            >
              {updateWellMutation.isPending ? 'جاري...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* قائمة الآبار بالبطاقات الموحدة */}
      <UnifiedCardGrid columns={2}>
        {filteredWells.map((well: any) => (
          <UnifiedCard
            key={well.id}
            title={`بئر #${well.wellNumber} - ${well.ownerName}`}
            subtitle={well.region}
            titleIcon={MapPin}
            badges={[
              {
                label: STATUS_MAP[well.status as keyof typeof STATUS_MAP]?.label,
                variant: STATUS_MAP[well.status as keyof typeof STATUS_MAP]?.badgeVariant as any
              }
            ]}
            fields={[
              { label: 'المنطقة', value: well.region, icon: MapPin, color: 'info' as const },
              { label: 'الألواح', value: well.numberOfPanels, icon: BarChart3, color: 'success' as const },
              { label: 'المواسير', value: well.numberOfPipes, icon: Wrench, color: 'success' as const },
              { label: 'العمق', value: `${well.wellDepth}م`, icon: TrendingUp, color: 'warning' as const },
              { label: 'القواعد', value: well.numberOfBases, icon: BarChart3, color: 'info' as const },
              { label: 'مستوى الماء', value: well.waterLevel ? `${well.waterLevel}م` : '-', icon: TrendingUp, color: 'info' as const },
              { label: 'التقدم', value: `${Number.isFinite(Number(well.completionPercentage)) ? Number(well.completionPercentage) : 0}%`, emphasis: true, color: 'info' as const, icon: TrendingUp },
              ...(well.fanType ? [{ label: 'نوع المروحة', value: well.fanType, icon: Wrench, color: 'info' as const }] : []),
              ...(well.pumpPower ? [{ label: 'قوة المضخة', value: `${well.pumpPower}`, icon: Wrench, color: 'warning' as const }] : []),
              ...(well.notes ? [{ label: 'الملاحظات', value: well.notes, color: 'muted' as const }] : [])
            ]}
            actions={[
              {
                icon: Eye,
                label: 'التفاصيل',
                onClick: () => setLifecycleWell(well),
                color: 'green'
              },
              {
                icon: Edit,
                label: 'تعديل',
                onClick: () => {
                  setSelectedWell(well);
                  setShowEditDialog(true);
                },
                color: 'blue'
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

      {filteredWells.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد آبار</p>
        </div>
      )}

      {lifecycleWell && (
        <WellLifecycleForms
          wellId={lifecycleWell.id}
          wellNumber={lifecycleWell.wellNumber}
          ownerName={lifecycleWell.ownerName}
          onClose={() => setLifecycleWell(null)}
        />
      )}
    </div>
  );
}
