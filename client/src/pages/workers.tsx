import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { FileText, Edit2, Trash2, Users, Clock, DollarSign, Calendar, User, Activity, Briefcase, Phone, Building, Power, CheckCircle, XCircle, Wallet, ArrowDownCircle, TrendingDown, Plus, FolderOpen } from 'lucide-react';
import { exportWorkerStatement } from '@/lib/excel-exports';
import { generateWorkerPDF } from '@/lib/pdf-exports.tsx';
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { apiRequest } from '@/lib/queryClient';
import AddWorkerForm from '@/components/forms/add-worker-form';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { useSelectedProject, ALL_PROJECTS_ID } from '@/hooks/use-selected-project';
import { QUERY_KEYS } from "@/constants/queryKeys";

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  phone?: string | null;
  hireDate?: string | null;
  is_active: boolean;
  created_at: string;
}

interface WorkerStats {
  totalWorkDays: number;
  totalTransfers: number;
  totalEarnings: number;
  projectsWorked: number;
  lastAttendanceDate: string | null;
  monthlyAttendanceRate: number;
}

const WorkerDialog = ({ worker, onClose, isOpen, projectId }: {
  worker?: Worker;
  onClose: () => void;
  isOpen: boolean;
  projectId?: string | null;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{worker ? 'تعديل العامل' : 'إضافة عامل جديد'}</DialogTitle>
          <DialogDescription>
            {worker ? 'قم بتعديل بيانات العامل المحدد' : 'أدخل بيانات العامل الجديد'}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <AddWorkerForm
            worker={worker as any}
            projectId={projectId}
            onSuccess={onClose}
            onCancel={onClose}
            submitLabel={worker ? 'حفظ التعديلات' : 'إضافة العامل'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface WorkerProjectWageData {
  id: string;
  worker_id: string;
  project_id: string;
  dailyWage: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  projectName?: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface WageFormData {
  project_id: string;
  dailyWage: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const ProjectWagesDialog = ({ worker, isOpen, onClose }: {
  worker: Worker;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWageForm, setShowWageForm] = useState(false);
  const [editingWage, setEditingWage] = useState<WorkerProjectWageData | null>(null);
  const [wageForm, setWageForm] = useState<WageFormData>({
    project_id: '',
    dailyWage: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
  });

  const { data: wagesResponse, isLoading: wagesLoading } = useQuery<{ success: boolean; data: WorkerProjectWageData[] }>({
    queryKey: QUERY_KEYS.workerProjectWages(worker.id),
    queryFn: () => apiRequest(`/api/workers/${worker.id}/project-wages`, 'GET'),
    enabled: isOpen,
  });

  const wages = wagesResponse?.data || (Array.isArray(wagesResponse) ? wagesResponse : []);

  const { data: projectsResponse } = useQuery<ProjectOption[]>({
    queryKey: QUERY_KEYS.projects,
    enabled: isOpen,
  });

  const projectsList: ProjectOption[] = Array.isArray(projectsResponse) 
    ? projectsResponse 
    : (projectsResponse as any)?.data || [];

  const getProjectName = (projectId: string) => {
    return projectsList.find(p => p.id === projectId)?.name || 'غير معروف';
  };

  const resetForm = () => {
    setWageForm({
      project_id: '',
      dailyWage: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
    });
    setEditingWage(null);
    setShowWageForm(false);
  };

  const createWageMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/worker-project-wages', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerProjectWages(worker.id) });
      toast({ title: "تم بنجاح", description: "تم إضافة أجر المشروع بنجاح" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error?.message || "فشل في إضافة أجر المشروع", variant: "destructive" });
    },
  });

  const updateWageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/worker-project-wages/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerProjectWages(worker.id) });
      toast({ title: "تم بنجاح", description: "تم تحديث أجر المشروع بنجاح" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error?.message || "فشل في تحديث أجر المشروع", variant: "destructive" });
    },
  });

  const deleteWageMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-project-wages/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerProjectWages(worker.id) });
      toast({ title: "تم بنجاح", description: "تم حذف أجر المشروع بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error?.message || "فشل في حذف أجر المشروع", variant: "destructive" });
    },
  });

  const handleSubmitWage = () => {
    if (!wageForm.project_id || !wageForm.dailyWage || !wageForm.effectiveFrom) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const payload = {
      worker_id: worker.id,
      project_id: wageForm.project_id,
      dailyWage: wageForm.dailyWage,
      effectiveFrom: wageForm.effectiveFrom,
      effectiveTo: wageForm.effectiveTo || null,
      is_active: true,
    };

    if (editingWage) {
      updateWageMutation.mutate({ id: editingWage.id, data: payload });
    } else {
      createWageMutation.mutate(payload);
    }
  };

  const handleEditWage = (wage: WorkerProjectWageData) => {
    setEditingWage(wage);
    setWageForm({
      project_id: wage.project_id,
      dailyWage: wage.dailyWage,
      effectiveFrom: wage.effectiveFrom,
      effectiveTo: wage.effectiveTo || '',
    });
    setShowWageForm(true);
  };

  const handleDeleteWage = (wage: WorkerProjectWageData) => {
    if (confirm('هل أنت متأكد من حذف هذا الأجر؟')) {
      deleteWageMutation.mutate(wage.id);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num) + ' ر.ي';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg leading-tight truncate">أجور المشاريع - {worker.name}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">إدارة الأجور اليومية حسب المشروع</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">
              الأجر الافتراضي: {formatCurrency(worker.dailyWage)}
            </span>
            <Button
              size="sm"
              className="w-full sm:w-auto text-xs"
              onClick={() => { resetForm(); setShowWageForm(true); }}
              data-testid="button-add-project-wage"
            >
              <Plus className="h-4 w-4 ml-1" />
              إضافة أجر مشروع
            </Button>
          </div>

          {showWageForm && (
            <Card>
              <CardContent className="p-3 sm:p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">المشروع *</Label>
                  <Select
                    value={wageForm.project_id}
                    onValueChange={(v) => setWageForm(prev => ({ ...prev, project_id: v }))}
                  >
                    <SelectTrigger data-testid="select-project" className="text-sm">
                      <SelectValue placeholder="اختر المشروع" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsList.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الأجر اليومي (ر.ي) *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={wageForm.dailyWage}
                    onChange={(e) => setWageForm(prev => ({ ...prev, dailyWage: e.target.value }))}
                    placeholder="0"
                    className="text-sm"
                    data-testid="input-wage-amount"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ساري من *</Label>
                    <Input
                      type="date"
                      value={wageForm.effectiveFrom}
                      onChange={(e) => setWageForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                      className="text-sm"
                      data-testid="input-effective-from"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ساري حتى</Label>
                    <Input
                      type="date"
                      value={wageForm.effectiveTo}
                      onChange={(e) => setWageForm(prev => ({ ...prev, effectiveTo: e.target.value }))}
                      className="text-sm"
                      data-testid="input-effective-to"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none text-xs"
                    onClick={handleSubmitWage}
                    disabled={createWageMutation.isPending || updateWageMutation.isPending}
                    data-testid="button-save-wage"
                  >
                    {createWageMutation.isPending || updateWageMutation.isPending ? 'جاري الحفظ...' : (editingWage ? 'تحديث' : 'حفظ')}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs" onClick={resetForm}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {wagesLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : wages.length === 0 ? (
            <div className="text-center py-6">
              <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">لا توجد أجور مخصصة للمشاريع</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="table-project-wages">
              {wages.map((wage: WorkerProjectWageData) => (
                <div key={wage.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{wage.projectName || getProjectName(wage.project_id)}</p>
                      <p className="text-base font-bold text-primary mt-0.5">{formatCurrency(wage.dailyWage)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Badge variant={wage.is_active ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {wage.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleEditWage(wage)}
                        data-testid={`button-edit-wage-${wage.id}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteWage(wage)}
                        disabled={deleteWageMutation.isPending}
                        data-testid={`button-delete-wage-${wage.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>من: {wage.effectiveFrom}</span>
                    <span>إلى: {wage.effectiveTo || 'مفتوح'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FinancialStatsFooter = ({ 
  stats,
  formatCurrency,
  isLoading
}: { 
  stats: WorkerStats | undefined;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
}) => {
  const totalBalance = stats?.totalEarnings ?? 0;
  const totalWithdrawals = stats?.totalTransfers ?? 0;
  const remaining = totalBalance - totalWithdrawals;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
          <Wallet className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المستحقات</p>
        </div>
        <p className="text-xs font-bold text-green-600 dark:text-green-400">
          {isLoading ? '...' : formatCurrency(totalBalance)}
        </p>
      </div>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400 mb-1">
          <ArrowDownCircle className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">السحبيات</p>
        </div>
        <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
          {isLoading ? '...' : formatCurrency(totalWithdrawals)}
        </p>
      </div>
      
      <div className={`${remaining >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-2 text-center`}>
        <div className={`flex items-center justify-center gap-1 ${remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} mb-1`}>
          <TrendingDown className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المتبقي</p>
        </div>
        <p className={`text-xs font-bold ${remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
          {isLoading ? '...' : formatCurrency(remaining)}
        </p>
      </div>
    </div>
  );
};

const WorkerCardWrapper = ({ 
  worker, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  onExport,
  onShowProjectWages,
  formatCurrency,
  isToggling,
  selectedProjectId,
  isExporting,
  exportProgress,
  exportingWorkerId
}: { 
  worker: Worker; 
  onEdit: () => void; 
  onDelete: () => void;
  onToggleStatus: () => void;
  onExport: (type: 'excel' | 'pdf') => void;
  onShowProjectWages: () => void;
  formatCurrency: (amount: number) => string;
  isToggling: boolean;
  selectedProjectId: string | null;
  isExporting?: boolean;
  exportProgress?: number;
  exportingWorkerId: string | null;
}) => {
  const project_idForApi = selectedProjectId === ALL_PROJECTS_ID ? undefined : selectedProjectId;
  
  const { data: statsData, isLoading: statsLoading } = useQuery<{ success: boolean; data: WorkerStats }>({
    queryKey: QUERY_KEYS.workerStats(worker.id, selectedProjectId ?? undefined),
    queryFn: async () => {
      const url = project_idForApi 
        ? `/api/workers/${worker.id}/stats?project_id=${project_idForApi}`
        : `/api/workers/${worker.id}/stats`;
      return apiRequest(url, 'GET');
    },
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000,   
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    enabled: worker.is_active,
  });

  const stats = statsData?.data;
  const projectsCount = stats?.projectsWorked ?? 0;

  return (
    <div className="relative group">
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-lg border-2 border-primary animate-in fade-in zoom-in duration-300">
          <div className="w-full space-y-4 text-center">
            <div className="relative h-16 w-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
              ></div>
              <FileText className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-primary animate-pulse">جاري تجهيز كشف الحساب...</p>
              <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">{exportProgress}%</p>
            </div>
          </div>
        </div>
      )}
      <UnifiedCard
        title={worker.name}
        subtitle={worker.hireDate ? new Date(worker.hireDate).toLocaleDateString('en-GB') : undefined}
        titleIcon={User}
        headerColor={worker.is_active ? '#22c55e' : '#ef4444'}
        badges={[
          {
            label: worker.type,
            variant: 'secondary',
          },
          {
            label: worker.is_active ? 'نشط' : 'غير نشط',
            variant: worker.is_active ? 'success' : 'destructive',
          }
        ]}
        fields={[
          {
            label: "الأجر اليومي",
            value: formatCurrency(parseFloat(worker.dailyWage)),
            icon: DollarSign,
            emphasis: true,
            color: "success",
          },
          {
            label: "الهاتف",
            value: worker.phone || 'غير محدد',
            icon: Phone,
            color: worker.phone ? "success" : "muted",
          },
          {
            label: "المشاريع",
            value: statsLoading ? '...' : projectsCount > 0 ? `${projectsCount} مشروع` : 'لا يوجد',
            icon: Building,
            color: projectsCount > 0 ? "info" : "muted",
          },
          {
            label: "أيام العمل",
            value: statsLoading ? '...' : `${stats?.totalWorkDays ?? 0} يوم`,
            icon: Calendar,
            color: "warning",
          },
        ]}
        actions={[
          {
            icon: FileText,
            label: "تصدير كشف",
            disabled: !!exportingWorkerId,
            color: "green",
            onClick: () => {}, 
            dropdown: [
              { label: "ملف PDF جاهز", onClick: () => onExport('pdf') },
              { label: "تصدير إلى Excel", onClick: () => onExport('excel') },
              { label: "طباعة مباشرة", onClick: () => onExport('pdf') }
            ]
          },
          {
            icon: Briefcase,
            label: "أجور المشاريع",
            onClick: onShowProjectWages,
            color: "purple",
          },
          {
            icon: Edit2,
            label: "تعديل",
            onClick: onEdit,
            color: "blue",
          },
          {
            icon: Power,
            label: worker.is_active ? "إيقاف" : "تفعيل",
            onClick: onToggleStatus,
            disabled: isToggling,
            color: worker.is_active ? "yellow" : "green",
          },
          {
            icon: Trash2,
            label: "حذف",
            onClick: onDelete,
            color: "red",
          },
        ]}
        footer={
          <FinancialStatsFooter 
            stats={stats} 
            formatCurrency={formatCurrency} 
            isLoading={statsLoading}
          />
        }
        compact
      />
    </div>
  );
};

export default function WorkersPage() {
  const [editingWorker, setEditingWorker] = useState<Worker | undefined>();
  const [showDialog, setShowDialog] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
    type: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingWorkerId, setTogglingWorkerId] = useState<string | null>(null);
  const [exportingWorkerId, setExportingWorkerId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportOptions, setShowExportOptions] = useState<string | null>(null);
  const [projectWagesWorker, setProjectWagesWorker] = useState<Worker | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId } = useSelectedProject();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", type: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر",
    });
  }, [toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  const { data: workers = [], isLoading, refetch: refetchWorkers } = useQuery<Worker[]>({
    queryKey: QUERY_KEYS.workers,
    queryFn: async () => {
      try {
        const res = await apiRequest('/api/workers', 'GET');
        
        let workersData = [];
        if (res && typeof res === 'object') {
          if (res.success && Array.isArray(res.data)) {
            workersData = res.data;
          } else if (Array.isArray(res)) {
            workersData = res;
          }
        }
        
        return workersData as Worker[];
      } catch (error) {
        console.error("Error fetching workers:", error);
        return [] as Worker[];
      }
    },
    staleTime: 30000, 
    gcTime: 60000,   
    retry: 2,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: true, 
  });

  const { data: workerTypeOptions = [] } = useQuery<{ value: string; label: string }[]>({
    queryKey: QUERY_KEYS.workerTypes,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/autocomplete/worker-types", "GET");
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 900000, 
    gcTime: 1800000,  
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchWorkers();
      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchWorkers, toast]);

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/workers/${id}`, "DELETE"),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.workers });
      const previousData = queryClient.getQueryData<Worker[]>(QUERY_KEYS.workers);
      if (Array.isArray(previousData)) {
        queryClient.setQueryData<Worker[]>(QUERY_KEYS.workers, 
          previousData.filter(worker => worker.id !== id)
        );
      }
      return { previousData };
    },
    onSuccess: (data) => {
      toast({
        title: "تم حذف العامل بنجاح",
        description: (data as any)?.message || "تم حذف العامل من النظام بنجاح.",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
    },
    onError: (error: any, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.workers, context.previousData);
      }
      toast({
        title: "خطأ في حذف العامل",
        description: error?.message || "حدث خطأ في حذف العامل",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/workers/${id}`, "PATCH", data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.workers });
      const previousData = queryClient.getQueryData<Worker[]>(QUERY_KEYS.workers);
      if (Array.isArray(previousData)) {
        queryClient.setQueryData<Worker[]>(QUERY_KEYS.workers, 
          previousData.map(worker => 
            worker.id === id ? { ...worker, ...data } : worker
          )
        );
      }
      return { previousData };
    },
    onSuccess: (data) => {
      toast({
        title: "تم بنجاح",
        description: (data as any)?.message || "تم تحديث بيانات العامل وحساباته بنجاح",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.workers, context.previousData);
      }
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تحديث العامل",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingWorkerId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
    },
  });

  const filteredWorkers = useMemo(() => {
    return (Array.isArray(workers) ? workers : []).filter(worker => {
      const matchesSearch = worker.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                           worker.type.toLowerCase().includes(searchValue.toLowerCase()) ||
                           (worker.phone && worker.phone.includes(searchValue));
      const matchesStatus = filterValues.status === 'all' || 
                           (filterValues.status === 'active' && worker.is_active) ||
                           (filterValues.status === 'inactive' && !worker.is_active);
      const matchesType = filterValues.type === 'all' || worker.type === filterValues.type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [workers, searchValue, filterValues]);

  const stats = useMemo(() => ({
    total: Array.isArray(workers) ? workers.length : 0,
    active: Array.isArray(workers) ? workers.filter(w => w.is_active).length : 0,
    inactive: Array.isArray(workers) ? workers.filter(w => !w.is_active).length : 0,
    avgWage: Array.isArray(workers) && workers.length > 0 
      ? workers.reduce((sum, w) => sum + parseFloat(w.dailyWage), 0) / workers.length 
      : 0
  }), [workers]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'total', label: 'إجمالي العمال', value: stats.total, icon: Users, color: 'blue' },
        { key: 'active', label: 'العمال النشطون', value: stats.active, icon: Activity, color: 'green', showDot: true, dotColor: 'bg-green-500' },
        { key: 'inactive', label: 'غير النشطين', value: stats.inactive, icon: Clock, color: 'orange' },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'avgWage', label: 'متوسط الأجر', value: formatCurrency(stats.avgWage), icon: DollarSign, color: 'purple' },
        { key: 'totalTypes', label: 'أنواع العمال', value: workerTypeOptions.length, icon: Briefcase, color: 'teal' },
        { key: 'totalWorkDays', label: 'مجموع أيام العمل', value: '-', icon: Calendar, color: 'indigo' },
      ]
    }
  ], [stats, workerTypeOptions]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
      ],
    },
    {
      key: 'type',
      label: 'نوع العامل',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        ...workerTypeOptions,
      ],
    },
  ], [workerTypeOptions]);

  const handleNewWorker = () => {
    setEditingWorker(undefined);
    setShowDialog(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setShowDialog(true);
  };

  const handleDeleteWorker = (worker: Worker) => {
    if (confirm(`هل أنت متأكد من حذف العامل "${worker.name}"؟`)) {
      deleteWorkerMutation.mutate(worker.id);
    }
  };

  const handleToggleStatus = (worker: Worker) => {
    setTogglingWorkerId(worker.id);
    updateWorkerMutation.mutate({ id: worker.id, data: { is_active: !worker.is_active } });
  };

  const handleExportStatement = async (worker: Worker, type: 'excel' | 'pdf' = 'excel') => {
    setExportingWorkerId(worker.id);
    setExportProgress(10);
    setShowExportOptions(null);
    
    try {
      const project_idForApi = selectedProjectId === ALL_PROJECTS_ID ? undefined : selectedProjectId;
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const url = `/api/reports/worker-statement?worker_id=${worker.id}${project_idForApi ? `&project_id=${project_idForApi}` : ''}`;
      const res = await apiRequest(url, 'GET');
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      if (res.success) {
        let downloadResult = false;
        if (type === 'pdf') {
          downloadResult = await generateWorkerPDF(res.data, worker);
        } else {
          downloadResult = await exportWorkerStatement(res.data, worker);
        }
        if (downloadResult) {
          toast({ title: "تم التصدير", description: `تم تجهيز كشف حساب ${worker.name} بنجاح` });
        } else {
          toast({ title: "تعذر التنزيل", description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error("Error exporting statement:", error);
      toast({ title: "خطأ في التصدير", description: "فشل في تجهيز كشف الحساب", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setExportingWorkerId(null);
        setExportProgress(0);
      }, 500);
    }
  };

  useEffect(() => {
    setFloatingAction(handleNewWorker, "إضافة عامل جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <UnifiedFilterDashboard
        hideHeader={true}
        title=""
        subtitle=""
        statsRows={statsRowsConfig}
        filters={filtersConfig}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchValue}
        searchValue={searchValue}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {isLoading ? (
        <UnifiedCardGrid columns={4}>
          {Array.from({ length: 8 }).map((_, i) => (
            <UnifiedCard key={i} title="" fields={[]} isLoading={true} compact />
          ))}
        </UnifiedCardGrid>
      ) : filteredWorkers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Users className="h-12 w-12 opacity-20" />
            <p className="text-lg">لا يوجد عمال يطابقون خيارات البحث</p>
            <Button variant="outline" onClick={handleResetFilters}>مسح الفلاتر</Button>
          </div>
        </Card>
      ) : (
        <UnifiedCardGrid columns={4}>
          {filteredWorkers.map((worker) => (
            <WorkerCardWrapper
              key={worker.id}
              worker={worker}
              onEdit={() => handleEditWorker(worker)}
              onDelete={() => handleDeleteWorker(worker)}
              onToggleStatus={() => handleToggleStatus(worker)}
              onExport={(type) => handleExportStatement(worker, type)}
              onShowProjectWages={() => setProjectWagesWorker(worker)}
              formatCurrency={formatCurrency}
              isToggling={togglingWorkerId === worker.id}
              selectedProjectId={selectedProjectId}
              isExporting={exportingWorkerId === worker.id}
              exportProgress={exportProgress}
              exportingWorkerId={exportingWorkerId}
            />
          ))}
        </UnifiedCardGrid>
      )}

      <WorkerDialog
        worker={editingWorker}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        projectId={selectedProjectId}
      />

      {projectWagesWorker && (
        <ProjectWagesDialog
          worker={projectWagesWorker}
          isOpen={!!projectWagesWorker}
          onClose={() => setProjectWagesWorker(null)}
        />
      )}
    </div>
  );
}
