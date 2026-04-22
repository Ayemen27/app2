import { useState, useEffect, useMemo, useCallback } from 'react';
import SelectedProjectBadge from "@/components/selected-project-badge";
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
import { toUserMessage } from '@/lib/error-utils';
import { FileText, Edit2, Trash2, Users, Clock, DollarSign, Calendar, User, Activity, Briefcase, Phone, Building, Power, CheckCircle, XCircle, Wallet, ArrowDownCircle, TrendingDown, Plus, FolderOpen, Download } from 'lucide-react';
import { exportWorkerStatement, exportWorkersListReport, type WorkerSummaryRow } from '@/lib/excel-exports';
import { generateWorkerPDF } from '@/lib/pdf-exports.tsx';
import { generateTablePDF } from '@/utils/pdfGenerator';
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
  totalSettled?: number;
  projectsWorked: number;
  projectsCount: number;
  isMultiProject: boolean;
  projectNames?: { id: string; name: string }[];
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
                    onValueChange={(v: string) => setWageForm(prev => ({ ...prev, project_id: v }))}
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
  isLoading,
  isFilteredByProject
}: { 
  stats: WorkerStats | undefined;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
  isFilteredByProject?: boolean;
}) => {
  const totalEarnings = stats?.totalEarnings ?? 0;
  const totalWithdrawals = stats?.totalTransfers ?? 0;
  const totalSettled = stats?.totalSettled ?? 0;
  const rebalanceDelta = (stats as any)?.rebalanceDelta ?? 0;
  const remaining = totalEarnings - totalWithdrawals - totalSettled + rebalanceDelta;
  const isMultiProject = stats?.isMultiProject;

  return (
    <div className="space-y-1">
      {isMultiProject && isFilteredByProject && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-1 text-center" data-testid="multi-project-notice">
          <p className="text-[9px] text-amber-700 dark:text-amber-300">
            ⚠️ الأرقام تخص المشروع المحدد فقط — للرصيد الكلي اختر "كل المشاريع"
          </p>
        </div>
      )}
      <div className={`grid ${totalSettled > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
          <Wallet className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المستحقات</p>
        </div>
        <p className="text-xs font-bold text-green-600 dark:text-green-400" data-testid="text-total-earnings">
          {isLoading ? '...' : formatCurrency(totalEarnings)}
        </p>
      </div>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 text-center">
        <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400 mb-1">
          <ArrowDownCircle className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">السحبيات</p>
        </div>
        <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-total-withdrawals">
          {isLoading ? '...' : formatCurrency(totalWithdrawals)}
        </p>
      </div>

      {totalSettled > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
            <ArrowDownCircle className="h-3 w-3" />
            <p className="text-[10px] text-gray-500 dark:text-gray-400">التصفيات</p>
          </div>
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400" data-testid="text-total-settled">
            {isLoading ? '...' : formatCurrency(totalSettled)}
          </p>
        </div>
      )}
      
      <div className={`${remaining >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-2 text-center`}>
        <div className={`flex items-center justify-center gap-1 ${remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} mb-1`}>
          <TrendingDown className="h-3 w-3" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المتبقي</p>
        </div>
        <p className={`text-xs font-bold ${remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-remaining">
          {isLoading ? '...' : formatCurrency(remaining)}
        </p>
      </div>
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
  const projectNames = stats?.projectNames ?? [];

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
          },
          ...(stats?.isMultiProject ? [{
            label: `متعدد المشاريع (${stats.projectsCount})`,
            variant: 'warning' as const,
          }] : []),
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
            label: "أيام العمل",
            value: statsLoading ? '...' : `${stats?.totalWorkDays ?? 0} يوم`,
            icon: Calendar,
            color: "warning",
          },
          ...(statsLoading
            ? [{ label: "المشاريع", value: "...", icon: Building, color: "info" as const }]
            : projectNames.length > 0
              ? projectNames.map((p, i) => ({
                  label: projectNames.length === 1 ? "المشروع" : `مشروع ${i + 1}`,
                  value: p.name,
                  icon: Building,
                  color: "info" as const,
                }))
              : [{ label: "المشاريع", value: "لا يوجد", icon: Building, color: "muted" as const }]
          ),
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
            color: "blue",
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
            isFilteredByProject={!!selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID}
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
    balance: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingWorkerId, setTogglingWorkerId] = useState<string | null>(null);
  const [exportingWorkerId, setExportingWorkerId] = useState<string | null>(null);
  const [isExportingList, setIsExportingList] = useState(false);
  const [isExportingListPdf, setIsExportingListPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportOptions, setShowExportOptions] = useState<string | null>(null);
  const [projectWagesWorker, setProjectWagesWorker] = useState<Worker | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId, selectedProjectName } = useSelectedProject();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", type: "all", balance: "all" });
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

  const projectParam = selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID ? selectedProjectId : undefined;

  const { data: workers = [], isLoading, refetch: refetchWorkers } = useQuery<Worker[]>({
    queryKey: [...QUERY_KEYS.workers, projectParam ?? 'all'],
    queryFn: async () => {
      try {
        const url = projectParam ? `/api/workers?project_id=${projectParam}` : '/api/workers';
        const res = await apiRequest(url, 'GET');
        
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
        return [] as Worker[];
      }
    },
    staleTime: 10000, 
    gcTime: 60000,   
    retry: 2,
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

  const { data: workersSummary = [] } = useQuery<WorkerSummaryRow[]>({
    queryKey: ['/api/workers/summary', selectedProjectId ?? 'all'],
    queryFn: async () => {
      const projectParam2 = selectedProjectId === ALL_PROJECTS_ID ? undefined : selectedProjectId;
      const url = projectParam2 ? `/api/workers/summary?project_id=${projectParam2}` : '/api/workers/summary';
      const response = await apiRequest(url, 'GET');
      return Array.isArray(response?.data) ? response.data : [];
    },
    staleTime: 30000,
    gcTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: workerBalances = {} } = useQuery<Record<string, number>>({
    queryKey: QUERY_KEYS.workerBalances(selectedProjectId ?? undefined),
    queryFn: async () => {
      try {
        const projectParam2 = selectedProjectId === ALL_PROJECTS_ID ? undefined : selectedProjectId;
        const url = projectParam2 ? `/api/workers/balances?project_id=${projectParam2}` : '/api/workers/balances';
        const response = await apiRequest(url, 'GET');
        return response?.data || {};
      } catch {
        return {};
      }
    },
    staleTime: 30000,
    gcTime: 60000,
    retry: 1,
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

  const workersQueryKey = [...QUERY_KEYS.workers, projectParam ?? 'all'];

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/workers/${id}`, "DELETE"),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workersQueryKey });
      const previousData = queryClient.getQueryData<Worker[]>(workersQueryKey);
      if (Array.isArray(previousData)) {
        queryClient.setQueryData<Worker[]>(workersQueryKey, 
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
        queryClient.setQueryData(workersQueryKey, context.previousData);
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
      await queryClient.cancelQueries({ queryKey: workersQueryKey });
      const previousData = queryClient.getQueryData<Worker[]>(workersQueryKey);
      if (Array.isArray(previousData)) {
        queryClient.setQueryData<Worker[]>(workersQueryKey, 
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
        queryClient.setQueryData(workersQueryKey, context.previousData);
      }
      toast({
        title: "خطأ",
        description: toUserMessage(error, "حدث خطأ في تحديث العامل"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingWorkerId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
    },
  });

  // فهرس الملخّص حسب worker_id لربط البيانات بسرعة
  const summaryById = useMemo(() => {
    const map: Record<string, WorkerSummaryRow> = {};
    (workersSummary || []).forEach(s => { map[s.worker_id] = s; });
    return map;
  }, [workersSummary]);

  const filteredWorkers = useMemo(() => {
    return (Array.isArray(workers) ? workers : []).filter(worker => {
      const matchesSearch = worker.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                           worker.type.toLowerCase().includes(searchValue.toLowerCase()) ||
                           (worker.phone && worker.phone.includes(searchValue));
      const matchesStatus = filterValues.status === 'all' || 
                           (filterValues.status === 'active' && worker.is_active) ||
                           (filterValues.status === 'inactive' && !worker.is_active);
      const matchesType = filterValues.type === 'all' || worker.type === filterValues.type;
      
      const balanceFilter = filterValues.balance || 'all';
      let matchesBalance = true;
      if (balanceFilter !== 'all') {
        const balance = workerBalances[worker.id] ?? 0;
        if (balanceFilter === 'has_balance') {
          matchesBalance = balance !== 0;
        } else if (balanceFilter === 'positive') {
          matchesBalance = balance > 0;
        } else if (balanceFilter === 'negative') {
          matchesBalance = balance < 0;
        } else if (balanceFilter === 'zero') {
          matchesBalance = balance === 0;
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesBalance;
    });
  }, [workers, searchValue, filterValues, workerBalances]);

  const stats = useMemo(() => ({
    total: Array.isArray(workers) ? workers.length : 0,
    active: Array.isArray(workers) ? workers.filter(w => w.is_active).length : 0,
    inactive: Array.isArray(workers) ? workers.filter(w => !w.is_active).length : 0,
    avgWage: Array.isArray(workers) && workers.length > 0 
      ? workers.reduce((sum, w) => sum + parseFloat(w.dailyWage), 0) / workers.length 
      : 0
  }), [workers]);

  // 📊 إحصائيات العمال المفلترين (مبنية على summaryById)
  const filteredAggregates = useMemo(() => {
    let totalDays = 0, totalEarnings = 0, totalPaid = 0, totalRemaining = 0, withBalance = 0;
    filteredWorkers.forEach(w => {
      const s = summaryById[w.id];
      if (!s) return;
      totalDays += s.totalWorkDays || 0;
      totalEarnings += s.totalEarnings || 0;
      totalPaid += (s.totalWithdrawals || 0) + (s.totalTransfers || 0) + (s.totalSettled || 0);
      totalRemaining += s.balance || 0;
      if ((s.balance || 0) !== 0) withBalance++;
    });
    return { totalDays, totalEarnings, totalPaid, totalRemaining, withBalance };
  }, [filteredWorkers, summaryById]);

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
        { key: 'totalWorkDays', label: 'مجموع أيام العمل', subLabel: 'للمفلترين', value: filteredAggregates.totalDays.toLocaleString('en-US', { maximumFractionDigits: 1 }), icon: Calendar, color: 'indigo' },
        { key: 'totalEarnings', label: 'إجمالي المستحقات', subLabel: 'أصبح لهم', value: formatCurrency(filteredAggregates.totalEarnings), icon: Wallet, color: 'emerald' },
        { key: 'totalPaid', label: 'إجمالي المسلَّم', subLabel: 'الذي بأيديهم', value: formatCurrency(filteredAggregates.totalPaid), icon: ArrowDownCircle, color: 'amber' },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'totalRemaining', label: 'إجمالي المتبقي', subLabel: 'الرصيد الصافي', value: formatCurrency(filteredAggregates.totalRemaining), icon: TrendingDown, color: filteredAggregates.totalRemaining >= 0 ? 'cyan' : 'red' },
        { key: 'withBalance', label: 'لديهم رصيد', value: filteredAggregates.withBalance, icon: DollarSign, color: 'purple' },
        { key: 'totalTypes', label: 'أنواع العمال', value: workerTypeOptions.length, icon: Briefcase, color: 'teal' },
      ]
    }
  ], [stats, workerTypeOptions, filteredAggregates]);

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
    {
      key: 'balance',
      label: 'المبلغ المتبقي',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع العمال' },
        { value: 'has_balance', label: 'لديهم رصيد متبقي' },
        { value: 'positive', label: 'رصيد موجب (مستحقات)' },
        { value: 'negative', label: 'رصيد سالب (سلف)' },
        { value: 'zero', label: 'رصيد صفري' },
      ],
    },
  ], [workerTypeOptions]);

  // 📤 تصدير قائمة العمال المفلترة إلى Excel (قالب موحّد)
  const handleExportListExcel = useCallback(async () => {
    if (filteredWorkers.length === 0) {
      toast({ title: 'لا توجد بيانات', description: 'لا يوجد عمال للتصدير', variant: 'destructive' });
      return;
    }
    setIsExportingList(true);
    try {
      const rows: WorkerSummaryRow[] = filteredWorkers.map(w => {
        const s = summaryById[w.id];
        return {
          worker_id: w.id,
          name: w.name,
          type: w.type,
          dailyWage: parseFloat(w.dailyWage) || 0,
          totalWorkDays: s?.totalWorkDays || 0,
          totalEarnings: s?.totalEarnings || 0,
          totalWithdrawals: s?.totalWithdrawals || 0,
          totalTransfers: s?.totalTransfers || 0,
          totalSettled: s?.totalSettled || 0,
          balance: s?.balance ?? (workerBalances[w.id] || 0),
        };
      });
      const statusOption = filtersConfig.find(f => f.key === 'status')?.options?.find(o => o.value === filterValues.status);
      const typeOption = filtersConfig.find(f => f.key === 'type')?.options?.find(o => o.value === filterValues.type);
      const ok = await exportWorkersListReport(rows, {
        title: 'كشف العمال - تقرير شامل',
        projectName: selectedProjectName || 'جميع المشاريع',
        statusLabel: statusOption?.label || 'الكل',
        typeLabel: typeOption?.label || 'الكل',
      });
      if (ok) toast({ title: 'تم التصدير', description: `تم تصدير ${rows.length} عامل بنجاح` });
      else toast({ title: 'تعذر التنزيل', description: 'فشل تنزيل الملف', variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'خطأ في التصدير', description: e?.message || 'فشل التصدير', variant: 'destructive' });
    } finally {
      setIsExportingList(false);
    }
  }, [filteredWorkers, summaryById, workerBalances, filtersConfig, filterValues, selectedProjectName, toast]);

  // 📤 تصدير قائمة العمال المفلترة إلى PDF (نفس البيانات والترتيب)
  const handleExportListPdf = useCallback(async () => {
    if (filteredWorkers.length === 0) {
      toast({ title: 'لا توجد بيانات', description: 'لا يوجد عمال للتصدير', variant: 'destructive' });
      return;
    }
    setIsExportingListPdf(true);
    try {
      const data: any[] = [];
      let totalDays = 0, totalEarnings = 0, totalWithdrawals = 0, totalTransfers = 0, totalOnHand = 0, totalRemaining = 0;
      filteredWorkers.forEach((w, idx) => {
        const s = summaryById[w.id];
        const earnings = s?.totalEarnings || 0;
        const withdrawals = s?.totalWithdrawals || 0;
        const transfers = s?.totalTransfers || 0;
        const settled = s?.totalSettled || 0;
        const onHand = withdrawals + transfers + settled;
        const remaining = s?.balance ?? (workerBalances[w.id] || 0);
        const days = s?.totalWorkDays || 0;
        totalDays += days; totalEarnings += earnings; totalWithdrawals += withdrawals;
        totalTransfers += transfers; totalOnHand += onHand; totalRemaining += remaining;
        data.push({
          index: idx + 1,
          name: w.name,
          days: days.toLocaleString('en-US', { maximumFractionDigits: 1 }),
          dailyWage: (parseFloat(w.dailyWage) || 0).toLocaleString('en-US'),
          earnings: earnings.toLocaleString('en-US'),
          withdrawals: withdrawals.toLocaleString('en-US'),
          transfers: transfers.toLocaleString('en-US'),
          onHand: onHand.toLocaleString('en-US'),
          remaining: remaining.toLocaleString('en-US'),
          notes: w.type || '-',
        });
      });
      const statusOption = filtersConfig.find(f => f.key === 'status')?.options?.find(o => o.value === filterValues.status);
      const typeOption = filtersConfig.find(f => f.key === 'type')?.options?.find(o => o.value === filterValues.type);
      const ok = await generateTablePDF({
        reportTitle: 'كشف العمال - تقرير شامل',
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')} | المشروع: ${selectedProjectName || 'جميع المشاريع'}`,
        infoItems: [
          { label: 'عدد العمال', value: filteredWorkers.length },
          { label: 'الحالة', value: statusOption?.label || 'الكل' },
          { label: 'النوع', value: typeOption?.label || 'الكل' },
          { label: 'إجمالي المستحقات', value: `${totalEarnings.toLocaleString('en-US')} ر.ي`, color: '#10b981' },
          { label: 'إجمالي المسلَّم', value: `${totalOnHand.toLocaleString('en-US')} ر.ي`, color: '#f43f5e' },
          { label: 'الرصيد المتبقي', value: `${totalRemaining.toLocaleString('en-US')} ر.ي`, color: totalRemaining >= 0 ? '#10b981' : '#f43f5e' },
        ],
        columns: [
          { header: 'م', key: 'index', width: 3 },
          { header: 'الاسم', key: 'name', width: 18 },
          { header: 'الأيام', key: 'days', width: 6 },
          { header: 'اليومية', key: 'dailyWage', width: 8 },
          { header: 'أصبح له', key: 'earnings', width: 10, color: () => '#3b82f6' },
          { header: 'السحبيات', key: 'withdrawals', width: 10 },
          { header: 'الحوالات', key: 'transfers', width: 10 },
          { header: 'الذي بيده', key: 'onHand', width: 10 },
          { header: 'المتبقي له', key: 'remaining', width: 11, color: (_v, r) => {
            const num = Number(String(r.remaining).replace(/,/g, ''));
            return num > 0 ? '#10b981' : num < 0 ? '#f43f5e' : '#64748b';
          }},
          { header: 'ملاحظات', key: 'notes', width: 16 },
        ],
        data,
        totals: {
          label: 'الإجماليات',
          values: {
            name: `${filteredWorkers.length} عامل`,
            days: totalDays.toLocaleString('en-US', { maximumFractionDigits: 1 }),
            earnings: totalEarnings.toLocaleString('en-US'),
            withdrawals: totalWithdrawals.toLocaleString('en-US'),
            transfers: totalTransfers.toLocaleString('en-US'),
            onHand: totalOnHand.toLocaleString('en-US'),
            remaining: totalRemaining.toLocaleString('en-US'),
          },
        },
        filename: `Workers_Report_${new Date().toISOString().split('T')[0]}`,
        orientation: 'portrait',
      });
      if (ok) toast({ title: 'تم التصدير', description: `تم تصدير ${filteredWorkers.length} عامل بنجاح` });
      else toast({ title: 'تعذر التنزيل', description: 'فشل تنزيل الملف', variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'خطأ في التصدير', description: e?.message || 'فشل التصدير', variant: 'destructive' });
    } finally {
      setIsExportingListPdf(false);
    }
  }, [filteredWorkers, summaryById, workerBalances, filtersConfig, filterValues, selectedProjectName, toast]);

  const exportActions = useMemo(() => [
    {
      key: 'export-excel',
      icon: Download,
      label: 'تصدير Excel',
      onClick: handleExportListExcel,
      loading: isExportingList,
      disabled: filteredWorkers.length === 0,
      tooltip: 'تصدير كشف Excel',
    },
    {
      key: 'export-pdf',
      icon: FileText,
      label: 'تصدير PDF',
      onClick: handleExportListPdf,
      loading: isExportingListPdf,
      disabled: filteredWorkers.length === 0,
      tooltip: 'تصدير كشف PDF',
    },
  ], [handleExportListExcel, handleExportListPdf, isExportingList, isExportingListPdf, filteredWorkers.length]);

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
      <SelectedProjectBadge />
      <UnifiedFilterDashboard
        hideHeader={true}
        title=""
        subtitle=""
        statsRows={statsRowsConfig}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="البحث بالاسم، النوع، أو الهاتف..."
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={exportActions}
        resultsSummary={{
          totalCount: Array.isArray(workers) ? workers.length : 0,
          filteredCount: filteredWorkers.length,
          totalLabel: 'إجمالي العمال',
          filteredLabel: 'نتائج الفلترة',
        }}
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
