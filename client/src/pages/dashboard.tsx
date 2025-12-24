import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, ProjectTypeSelect, type SelectOption } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// @ts-ignore
import { DollarSign, TrendingDown, TrendingUp, Calendar, Package, UserCheck, Plus, Users, Building2, Eye, CheckCircle, Activity, User, ArrowRightLeft, Clock } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { QuickActionsGrid } from "@/components/ui/quick-actions-grid";
import { RecentActivitiesStrip } from "@/components/ui/recent-activities-strip";

import { formatDate } from "@/lib/utils";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { useEffect } from "react";

import { apiRequest } from "@/lib/queryClient";
import type { 
  Project, 
  DailyExpenseSummary, 
  Worker, 
  AutocompleteData as WorkerType,
  ProjectType
} from "@shared/schema";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedSearchFilter, useUnifiedFilter, PROJECT_STATUS_OPTIONS } from "@/components/ui/unified-search-filter";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";

interface ProjectStats {
  totalWorkers: string;
  totalExpenses: number;
  totalIncome: number;
  currentBalance: number;
  activeWorkers: string;
  completedDays: string;
  materialPurchases: string;
  lastActivity: string;
}

interface ProjectWithStats extends Project {
  stats: ProjectStats;
  id?: string;
  name?: string;
  status?: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const [workerData, setWorkerData] = useState({
    name: '',
    phone: '',
    type: '',
    dailyWage: ''
  });

  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [projectData, setProjectData] = useState({
    name: '',
    status: 'active',
    description: '',
    projectTypeId: null as number | null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset
  } = useUnifiedFilter({ status: 'all' }, '');

  // استخدام الملخص المالي الموحد من ExpenseLedgerService
  const { allProjects: financialData, isLoading: financialLoading } = useFinancialSummary({
    projectId: 'all',
    enabled: true
  });

  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      console.log(`Failed to save autocomplete value for ${category}:`, error);
    }
  };

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects/with-stats"],
    queryFn: async () => {
      try {
        console.log('🔄 [Dashboard] جلب المشاريع مع الإحصائيات...');
        const response = await apiRequest("/api/projects/with-stats", "GET");

        let projects = [];
        if (response && typeof response === 'object') {
          if (response.success !== undefined && response.data !== undefined) {
            projects = Array.isArray(response.data) ? response.data : [];
          }
          else if (Array.isArray(response)) {
            projects = response;
          }
          else if (response.id) {
            projects = [response];
          }
          else if (response.data) {
            projects = Array.isArray(response.data) ? response.data : [];
          }
        }

        if (!Array.isArray(projects)) {
          projects = [];
        }

        console.log(`✅ [Dashboard] تم جلب ${projects.length} مشروع مع الإحصائيات`);
        return projects as ProjectWithStats[];
      } catch (error) {
        console.error("❌ [Dashboard] خطأ في جلب المشاريع:", error);
        return [] as ProjectWithStats[];
      }
    },
    staleTime: 1000 * 3,
    gcTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const { data: workerTypes = [] } = useQuery<WorkerType[]>({
    queryKey: ["/api/worker-types"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/worker-types", "GET");
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as WorkerType[];
        }
        return Array.isArray(response) ? response as WorkerType[] : [];
      } catch (error) {
        console.error("Error fetching worker types:", error);
        return [];
      }
    },
  });

  // جلب قائمة أنواع المشاريع
  const { data: projectTypes = [], isLoading: typesLoading } = useQuery<ProjectType[]>({
    queryKey: ["/api/project-types"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/project-types", "GET");
        if (response?.success && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.error('❌ [Dashboard] خطأ في جلب أنواع المشاريع:', error);
        return [];
      }
    },
    staleTime: 60000,
  });

  const addWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      await Promise.all([
        saveAutocompleteValue('workerNames', data.name),
        saveAutocompleteValue('workerTypes', data.type)
      ]);

      return apiRequest("/api/workers", "POST", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      toast({
        title: "نجح الحفظ",
        description: "تم إضافة العامل بنجاح",
      });
      setShowWorkerModal(false);
      setWorkerData({ name: '', phone: '', type: '', dailyWage: '' });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة العامل",
        variant: "destructive",
      });
    },
  });

  const addProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      await Promise.all([
        saveAutocompleteValue('projectNames', data.name),
        saveAutocompleteValue('projectDescriptions', data.description)
      ]);

      return apiRequest("/api/projects", "POST", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      toast({
        title: "نجح الحفظ",
        description: "تم إضافة المشروع بنجاح",
      });
      setShowProjectModal(false);
      setProjectData({ name: '', status: 'active', description: '', projectTypeId: null });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة المشروع",
        variant: "destructive",
      });
    },
  });

  const addWorkerTypeMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      await saveAutocompleteValue('workerTypes', data.name);

      return apiRequest("/api/worker-types", "POST", data);
    },
    onSuccess: async (newType) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/worker-types"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      toast({
        title: "تم الحفظ",
        description: "تم إضافة نوع العامل بنجاح",
      });
      setWorkerData({...workerData, type: newType.name});
      setNewTypeName("");
      setShowAddTypeDialog(false);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة نوع العامل",
        variant: "destructive",
      });
    },
  });

  const { data: todaySummary } = useQuery<DailyExpenseSummary>({
    queryKey: ["/api/projects", selectedProjectId, "daily-summary", new Date().toISOString().split('T')[0]],
    enabled: !!selectedProjectId,
    staleTime: 1000 * 30,
  });

  // جلب آخر الإجراءات
  const { data: recentActivities = [] } = useQuery({
    queryKey: ["/api/recent-activities", selectedProjectId],
    queryFn: async () => {
      try {
        const projectFilter = selectedProjectId ? `?projectId=${selectedProjectId}` : '';
        const response = await apiRequest(`/api/recent-activities${projectFilter}`, "GET");
        return response?.data || [];
      } catch (error) {
        console.error("خطأ في جلب آخر الإجراءات:", error);
        return [];
      }
    },
    staleTime: 1000 * 10,
    refetchInterval: 30000, // تحديث كل 30 ثانية
  });

  const selectedProject = Array.isArray(projects) ? projects.find((p: ProjectWithStats) => p.id === selectedProjectId) : undefined;

  // إنشاء map للوصول السريع لبيانات المشاريع المالية من ExpenseLedgerService
  const financialProjectsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (financialData?.projects) {
      financialData.projects.forEach((p: any) => {
        map.set(p.projectId, p);
      });
    }
    return map;
  }, [financialData?.projects]);

  const filteredProjects = useMemo(() => {
    if (!Array.isArray(projects)) return [];

    return projects.filter((project: ProjectWithStats) => {
      const matchesSearch = !searchValue || 
        (project.name || '').toLowerCase().includes(searchValue.toLowerCase());

      const matchesStatus = filterValues.status === 'all' || (project.status || 'active') === filterValues.status;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchValue, filterValues.status]);

  // دالة للحصول على إحصائيات المشروع من ExpenseLedgerService
  const getProjectStats = useCallback((projectId: string) => {
    const financialProject = financialProjectsMap.get(projectId);
    if (financialProject) {
      return {
        totalIncome: financialProject.income?.totalIncome || 0,
        totalExpenses: financialProject.expenses?.totalCashExpenses || 0,
        currentBalance: financialProject.cashBalance || 0,
        activeWorkers: financialProject.workers?.activeWorkers || 0,
        completedDays: financialProject.workers?.completedDays || 0,
        materialPurchases: financialProject.counts?.materialPurchases || 0
      };
    }
    return null;
  }, [financialProjectsMap]);

  // الإجماليات من /api/financial-summary - مصدر موحد من ExpenseLedgerService (لا حسابات محلية)
  const totalStats = useMemo(() => {
    if (financialData?.totals) {
      return {
        totalIncome: financialData.totals.totalIncome || 0,
        totalExpenses: financialData.totals.totalCashExpenses || 0,
        currentBalance: financialData.totals.cashBalance || 0,
        activeWorkers: financialData.totals.activeWorkers || 0,
        completedDays: 0,
        materialPurchases: 0,
        projectsCount: financialData.projectsCount || projects.length || 0
      };
    }
    return {
      totalIncome: 0,
      totalExpenses: 0,
      currentBalance: 0,
      activeWorkers: 0,
      completedDays: 0,
      materialPurchases: 0,
      projectsCount: 0
    };
  }, [financialData, projects.length]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'نشط', variant: 'success' as const };
      case 'completed':
        return { label: 'مكتمل', variant: 'default' as const };
      case 'paused':
        return { label: 'متوقف', variant: 'warning' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'completed':
        return '#3b82f6';
      case 'paused':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  useEffect(() => {
    if (selectedProject) {
      console.log('🔍 بيانات المشروع المحدد في Frontend:', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        totalIncome: selectedProject.stats?.totalIncome,
        totalExpenses: selectedProject.stats?.totalExpenses,
        currentBalance: selectedProject.stats?.currentBalance
      });

      if ((selectedProject.name || '').includes('الحبشي')) {
        console.warn('🚨 مشروع الحبشي - تحقق من البيانات:', {
          مشروع: selectedProject.name,
          الدخل: selectedProject.stats?.totalIncome,
          المصاريف: selectedProject.stats?.totalExpenses,
          هل_متساوية: selectedProject.stats?.totalIncome === selectedProject.stats?.totalExpenses,
          fullStats: selectedProject.stats
        });
      }
    }
  }, [selectedProject]);

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') {
      const num = parseFloat(String(amount));
      if (isNaN(num)) return '0 ر.ي';
      amount = num;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  // الإحصائيات الحالية - من ExpenseLedgerService فقط (مصدر موحد للحقيقة)
  // نقل هذا useMemo قبل أي return مبكر لتجنب خطأ Hooks
  const currentStats = useMemo(() => {
    if (selectedProject && selectedProjectId) {
      const projectStats = getProjectStats(selectedProjectId);
      if (projectStats) {
        return {
          totalIncome: projectStats.totalIncome,
          totalExpenses: projectStats.totalExpenses,
          currentBalance: projectStats.currentBalance,
          activeWorkers: String(projectStats.activeWorkers),
          completedDays: String(projectStats.completedDays),
          materialPurchases: String(projectStats.materialPurchases)
        };
      }
    }
    return {
      totalIncome: totalStats.totalIncome,
      totalExpenses: totalStats.totalExpenses,
      currentBalance: totalStats.currentBalance,
      activeWorkers: String(totalStats.activeWorkers),
      completedDays: String(totalStats.completedDays),
      materialPurchases: String(totalStats.materialPurchases)
    };
  }, [selectedProject, selectedProjectId, getProjectStats, totalStats]);

  if (projectsLoading) {
    return <LoadingCard />;
  }

  return (
    <div className="p-4 fade-in space-y-4">
      {/* قسم آخر الإجراءات - تم نقله إلى الأسفل */}
      {/* {recentActivities.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              آخر الإجراءات
              <Badge variant="secondary" className="mr-auto">
                {recentActivities.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {recentActivities.slice(0, 10).map((activity: any, index: number) => (
              <div
                key={activity.id || index}
                className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-100 dark:border-blue-800 hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">من</div>
                      <div className="font-medium text-foreground">{activity.userName || 'غير محدد'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">أين</div>
                      <div className="font-medium text-foreground truncate">{activity.projectName || 'جميع المشاريع'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">كيف</div>
                      <Badge variant={
                        activity.actionType === 'transfer' ? 'default' :
                        activity.actionType === 'expense' ? 'destructive' :
                        activity.actionType === 'income' ? 'success' :
                        'secondary'
                      } className="text-xs">
                        {activity.actionLabel || activity.actionType}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">التاريخ</div>
                      <div className="font-medium text-foreground">{formatDate(activity.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">الوقت</div>
                      <div className="font-medium text-foreground" dir="ltr">
                        {new Date(activity.createdAt).toLocaleTimeString('ar-SA', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                {activity.amount && (
                  <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-800 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(activity.amount)}
                    </span>
                    {activity.description && (
                      <span className="text-xs text-muted-foreground mr-auto truncate">
                        {activity.description}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )} */}

      <div className="mb-4">
        {selectedProject && (
          <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>إحصائيات: <strong className="text-foreground">{selectedProject.name}</strong></span>
          </div>
        )}
        {!selectedProject && projects.length > 0 && (
          <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>إحصائيات جميع المشاريع ({projects.length} مشروع)</span>
          </div>
        )}
        <UnifiedStats
          stats={[
            {
              title: "إجمالي التوريد",
              value: currentStats.totalIncome,
              icon: TrendingUp,
              color: "blue",
              formatter: formatCurrency
            },
            {
              title: "إجمالي المنصرف",
              value: currentStats.totalExpenses,
              icon: TrendingDown,
              color: "red",
              formatter: formatCurrency
            },
            {
              title: "المتبقي الحالي",
              value: currentStats.currentBalance,
              icon: DollarSign,
              color: "green",
              formatter: formatCurrency
            },
            {
              title: "العمال النشطين",
              value: currentStats.activeWorkers,
              icon: UserCheck,
              color: "purple"
            },
            {
              title: "أيام العمل المكتملة",
              value: currentStats.completedDays,
              icon: Calendar,
              color: "teal"
            },
            {
              title: "مشتريات المواد",
              value: currentStats.materialPurchases,
              icon: Package,
              color: "indigo"
            }
          ]}
          columns={3}
          hideHeader={true}
        />
      </div>

      <QuickActionsGrid 
        onAddWorker={() => setShowWorkerModal(true)}
        onAddProject={() => setShowProjectModal(true)}
      />

      {filteredProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              المشاريع ({filteredProjects.length})
            </h3>
          </div>
          <UnifiedCardGrid columns={2}>
            {filteredProjects.map((project: ProjectWithStats) => {
              const projectId = project.id || '';
              const projectName = project.name || '';
              const projectStatus = project.status || 'active';
              const statusBadge = getStatusBadge(projectStatus);
              const isSelected = projectId === selectedProjectId;
              // استخدام بيانات ExpenseLedgerService للإحصائيات المالية
              const projectStats = getProjectStats(projectId);
              const income = projectStats?.totalIncome || 0;
              const expenses = projectStats?.totalExpenses || 0;
              const balance = projectStats?.currentBalance || 0;
              const workers = projectStats?.activeWorkers || 0;
              return (
                <UnifiedCard
                  key={projectId}
                  title={projectName}
                  titleIcon={Building2}
                  headerColor={getStatusColor(projectStatus)}
                  badges={[statusBadge]}
                  className={isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
                  fields={[
                    {
                      label: "التوريد",
                      value: formatCurrency(income),
                      icon: TrendingUp,
                      color: "info"
                    },
                    {
                      label: "المنصرف",
                      value: formatCurrency(expenses),
                      icon: TrendingDown,
                      color: "danger"
                    },
                    {
                      label: "المتبقي",
                      value: formatCurrency(balance),
                      icon: DollarSign,
                      color: "success",
                      emphasis: true
                    },
                    {
                      label: "العمال",
                      value: String(workers),
                      icon: Users,
                      color: "default"
                    }
                  ]}
                  actions={[
                    {
                      icon: isSelected ? CheckCircle : Eye,
                      label: isSelected ? "محدد" : "تحديد",
                      onClick: () => selectProject(projectId),
                      color: isSelected ? "green" : "blue"
                    }
                  ]}
                  onClick={() => selectProject(projectId)}
                  compact
                />
              );
            })}
          </UnifiedCardGrid>
        </div>
      )}

      {/* شريط آخر الإجراءات الأفقي */}
      {recentActivities.length > 0 && (
        <RecentActivitiesStrip 
          activities={recentActivities} 
          formatCurrency={formatCurrency}
        />
      )}

      <Dialog open={showWorkerModal} onOpenChange={setShowWorkerModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة عامل جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات العامل الجديد لإضافته إلى النظام
            </DialogDescription>
          </DialogHeader>
          <div className="form-grid">
            <div className="form-field form-field-full">
              <Label htmlFor="worker-name">اسم العامل</Label>
              <Input
                id="worker-name"
                value={workerData.name}
                onChange={(e) => setWorkerData({...workerData, name: e.target.value})}
                placeholder="أدخل اسم العامل"
              />
            </div>
            <div className="form-field">
              <Label htmlFor="worker-phone">رقم الهاتف</Label>
              <Input
                id="worker-phone"
                value={workerData.phone}
                onChange={(e) => setWorkerData({...workerData, phone: e.target.value})}
                placeholder="أدخل رقم الهاتف"
              />
            </div>
            <div className="form-field">
              <Label htmlFor="worker-wage">الأجر اليومي (ر.ي)</Label>
              <Input
                id="worker-wage"
                type="number"
                inputMode="decimal"
                value={workerData.dailyWage}
                onChange={(e) => setWorkerData({...workerData, dailyWage: e.target.value})}
                placeholder="0"
                className="text-center"
                required
              />
            </div>
            <div className="form-field form-field-full">
              <Label htmlFor="worker-type">نوع العامل</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  value={workerData.type || ""}
                  onValueChange={(value) => setWorkerData({...workerData, type: value})}
                  options={
                    Array.isArray(workerTypes) && workerTypes.length > 0 
                      ? workerTypes.map((workerType) => ({
                          value: workerType.value,
                          label: workerType.value,
                        }))
                      : [
                          { value: "معلم", label: "معلم" },
                          { value: "عامل", label: "عامل" },
                          { value: "حداد", label: "حداد" },
                          { value: "نجار", label: "نجار" },
                          { value: "سائق", label: "سائق" },
                          { value: "كهربائي", label: "كهربائي" },
                          { value: "سباك", label: "سباك" },
                          { value: "تمرير", label: "تمرير" },
                        ]
                  }
                  placeholder="اختر نوع العامل..."
                  searchPlaceholder="ابحث عن نوع..."
                  emptyText="لا توجد أنواع"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Separate Dialog for Adding New Worker Type */}
            <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>إضافة نوع عامل جديد</DialogTitle>
                  <DialogDescription>
                    أدخل اسم نوع العامل الجديد ليتم حفظه في قاعدة البيانات
                  </DialogDescription>
                </DialogHeader>
                <div className="form-grid">
                  <div className="form-field form-field-full">
                    <Label htmlFor="new-type-name">اسم نوع العامل</Label>
                    <Input
                      id="new-type-name"
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="مثال: كهربائي، سباك، حداد..."
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (newTypeName.trim()) {
                          addWorkerTypeMutation.mutate({ name: newTypeName.trim() });
                        }
                      }}
                      disabled={!newTypeName.trim() || addWorkerTypeMutation.isPending}
                    >
                      {addWorkerTypeMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddTypeDialog(false);
                        setNewTypeName("");
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="form-actions">
              <Button
                onClick={() => {
                  if (!workerData.name.trim() || !workerData.type || !workerData.dailyWage) {
                    toast({
                      title: "خطأ",
                      description: "يرجى ملء جميع البيانات المطلوبة",
                      variant: "destructive",
                    });
                    return;
                  }
                  const parsedWage = parseFloat(workerData.dailyWage);
                  if (isNaN(parsedWage) || parsedWage <= 0) {
                    toast({
                      title: "خطأ",
                      description: "يرجى إدخال مبلغ صحيح للأجر اليومي",
                      variant: "destructive",
                    });
                    return;
                  }
                  addWorkerMutation.mutate({
                    name: workerData.name.trim(),
                    phone: workerData.phone || null,
                    type: workerData.type,
                    dailyWage: parsedWage.toString(),
                    isActive: true,
                  });
                }}
                disabled={addWorkerMutation.isPending}
                className="gap-2"
              >
                {addWorkerMutation.isPending ? "⏳ جاري الحفظ..." : "✅ حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowWorkerModal(false)}>
                إلغاء
              </Button>
            </div>

            {/* Button to add new worker type - moved outside of form */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddTypeDialog(true)}
              className="w-full gap-2 mt-2"
            >
              <Plus className="h-4 w-4" />
              إضافة نوع عامل جديد
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة مشروع جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات المشروع الجديد لإضافته إلى النظام
            </DialogDescription>
          </DialogHeader>
          <div className="form-grid">
            <div className="form-field form-field-full">
              <Label htmlFor="project-name">اسم المشروع</Label>
              <Input
                id="project-name"
                value={projectData.name}
                onChange={(e) => setProjectData({...projectData, name: e.target.value})}
                placeholder="أدخل اسم المشروع"
              />
            </div>
            <div className="form-field">
              <Label htmlFor="project-type">نوع المشروع</Label>
              <ProjectTypeSelect
                value={projectData.projectTypeId?.toString() || ""}
                onValueChange={(val) => setProjectData({...projectData, projectTypeId: val ? parseInt(val) : null})}
                projectTypes={projectTypes}
                placeholder={typesLoading ? "جاري التحميل..." : "اختر نوع المشروع..."}
                disabled={typesLoading}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="project-status">حالة المشروع</Label>
              <Select value={projectData.status} onValueChange={(value) => setProjectData({...projectData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="paused">متوقف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="form-field form-field-full">
              <Label htmlFor="project-description">وصف المشروع</Label>
              <Input
                id="project-description"
                value={projectData.description}
                onChange={(e) => setProjectData({...projectData, description: e.target.value})}
                placeholder="أدخل وصف المشروع (اختياري)"
              />
            </div>
            <div className="form-actions">
              <Button
                onClick={() => {
                  if (projectData.name) {
                    addProjectMutation.mutate({
                      name: projectData.name,
                      status: projectData.status,
                      description: projectData.description || null,
                      projectTypeId: projectData.projectTypeId
                    });
                  }
                }}
                disabled={!projectData.name || addProjectMutation.isPending}
              >
                {addProjectMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowProjectModal(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}