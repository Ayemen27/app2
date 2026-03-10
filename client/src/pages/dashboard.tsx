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
import { DollarSign, TrendingDown, TrendingUp, Calendar, Package, UserCheck, Plus, Users, Building2, Eye, CheckCircle, Activity, User, ArrowRightLeft, Clock, Truck, AlertCircle, Zap } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { QuickActionsGrid } from "@/components/ui/quick-actions-grid";
import { RecentActivitiesStrip } from "@/components/ui/recent-activities-strip";

import { formatDate } from "@/lib/utils";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { useEffect } from "react";

import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
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
import { useFinancialSummary, type ProjectFinancialSummary } from "@/hooks/useFinancialSummary";

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
  id: string;
  name: string;
  status: string;
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
    project_type_id: null as number | null
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
  const { totals: currentTotals, isLoading: financialLoading } = useFinancialSummary({
    project_id: selectedProjectId || 'all',
    enabled: true
  });

  // تحسين خيارات الاستعلام لزيادة السرعة وتقليل الضغط على الخادم
  const queryOptions = {
    staleTime: 1000 * 60 * 5, // 5 دقائق
    gcTime: 1000 * 60 * 30, // 30 دقيقة
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  };

  // جلب المشاريع مع الإحصائيات
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery<ProjectWithStats[]>({
    queryKey: QUERY_KEYS.projectsWithStats,
    queryFn: async () => {
      try {
        console.log('🔄 [Dashboard] جلب المشاريع مع الإحصائيات...');
        const response = await apiRequest("/api/projects/with-stats", "GET");
        
        let projects = [];
        if (response && typeof response === 'object') {
          if (response.success !== undefined && response.data !== undefined) {
            projects = Array.isArray(response.data) ? response.data : [];
          } else if (Array.isArray(response)) {
            projects = response;
          } else if (response.id) {
            projects = [response];
          } else if (response.data) {
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
    ...queryOptions
  });

  const { data: workerTypes = [] } = useQuery<WorkerType[]>({
    queryKey: QUERY_KEYS.workerTypes,
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
    queryKey: QUERY_KEYS.projectTypes,
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
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
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
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      toast({
        title: "نجح الحفظ",
        description: "تم إضافة المشروع بنجاح",
      });
      setShowProjectModal(false);
      setProjectData({ name: '', status: 'active', description: '', project_type_id: null });
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
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerTypes });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
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
    queryKey: QUERY_KEYS.dailySummary(selectedProjectId, new Date().toISOString().split('T')[0]),
    enabled: !!selectedProjectId,
    staleTime: 1000 * 30,
  });

  // جلب آخر الإجراءات
  const { data: recentActivities = [] } = useQuery({
    queryKey: QUERY_KEYS.recentActivitiesByProject(selectedProjectId),
    queryFn: async () => {
      try {
        const projectFilter = selectedProjectId ? `?project_id=${selectedProjectId}` : '';
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

  // جلب إحصائيات المراقبة (SigNoz/Prometheus)
  const { data: monitoringStats, isLoading: monitoringLoading } = useQuery({
    queryKey: QUERY_KEYS.healthStats,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/health/stats", "GET");
        // التعامل مع التنسيقات المختلفة للاستجابة
        const statsData = response?.data || response;
        
        if (!statsData || typeof statsData !== 'object') {
          return null;
        }

        return {
          cpuUsage: statsData.cpuUsage || 0,
          memoryUsage: statsData.memoryUsage || 0,
          activeRequests: statsData.activeRequests || 0,
          errorRate: statsData.errorRate || 0,
          uptime: statsData.uptime || 0
        };
      } catch (error) {
        console.error("❌ [Dashboard] خطأ في جلب إحصائيات المراقبة:", error);
        return null;
      }
    },
    refetchInterval: 15000, // تحديث كل 15 ثانية
  });

  const selectedProject = Array.isArray(projects) ? projects.find((p: ProjectWithStats) => p.id === selectedProjectId) : undefined;

  const filteredProjects = useMemo(() => {
    if (!Array.isArray(projects)) return [];

    return projects.filter((project: ProjectWithStats) => {
      const matchesSearch = !searchValue || 
        (project.name || '').toLowerCase().includes(searchValue.toLowerCase());

      const matchesStatus = filterValues.status === 'all' || (project.status || 'active') === filterValues.status;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchValue, filterValues.status]);

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

  // وظيفة للحصول على قيم الإكمال التلقائي
  const saveAutocompleteValue = useCallback(async (category: string, value: string) => {
    if (!value || value.trim().length < 2) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { category, value: value.trim() });
    } catch (error) {
      console.warn(`[Dashboard] Failed to save autocomplete: ${category}`, error);
    }
  }, []);

  // الإحصائيات الحالية - من ExpenseLedgerService فقط (مصدر موحد للحقيقة)
  const currentStats = useMemo(() => {
    if (!currentTotals) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        currentBalance: 0,
        activeWorkers: "0",
        completedDays: "0",
        materialPurchases: "0 ر.ي",
        transportExpenses: 0
      };
    }

    // التوريد الصافي
    const rawIncome = currentTotals.totalIncome || 0;
    
    // المنصرف الصافي
    const rawExpenses = currentTotals.totalAllExpenses || 0;
    
    return {
      totalIncome: rawIncome,
      totalExpenses: rawExpenses,
      currentBalance: currentTotals.totalBalance || (rawIncome - rawExpenses),
      activeWorkers: String(currentTotals.totalWorkers || 0),
      completedDays: String((currentTotals as any).completedDays || 0), 
      materialPurchases: formatCurrency(currentTotals.totalAllExpenses || 0),
      transportExpenses: (currentTotals as any).transportExpenses || 0
    };
  }, [currentTotals]);

  // وظيفة للحصول على إحصائيات مشروع معين من قائمة المشاريع الكلية
  const getProjectStats = useCallback((project_id: string) => {
    const project = projects.find(p => p.id === project_id);
    return project?.stats || {
      totalIncome: 0,
      totalExpenses: 0,
      currentBalance: 0,
      activeWorkers: 0
    };
  }, [projects]);

  if (projectsLoading) {
    return <LoadingCard />;
  }

  return (
    <div className="p-4 fade-in space-y-4">
      {/* قسم المراقبة والإحصائيات */}
      <div className="mb-4">
        {monitoringStats && (
          <div className="mb-6">
            <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span>حالة النظام والمراقبة (SigNoz)</span>
            </div>
            <UnifiedStats
              stats={[
                {
                  title: "استهلاك المعالج",
                  value: `${monitoringStats.cpuUsage}%`,
                  icon: Activity,
                  color: "blue",
                  status: monitoringStats.cpuUsage > 80 ? "critical" : "normal"
                },
                {
                  title: "استهلاك الذاكرة",
                  value: `${monitoringStats.memoryUsage}%`,
                  icon: Package,
                  color: "teal",
                  status: monitoringStats.memoryUsage > 85 ? "warning" : "normal"
                },
                {
                  title: "الطلبات النشطة",
                  value: monitoringStats.activeRequests,
                  icon: ArrowRightLeft,
                  color: "purple"
                },
                {
                  title: "معدل الخطأ",
                  value: `${monitoringStats.errorRate}%`,
                  icon: TrendingDown,
                  color: "green",
                  status: monitoringStats.errorRate > 5 ? "critical" : "normal"
                }
              ]}
              columns={4}
              hideHeader={true}
            />
          </div>
        )}

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
              title: "أيام العمل",
              value: currentStats.completedDays,
              icon: Calendar,
              color: "teal"
            },
            {
              title: "مشتريات المواد",
              value: currentStats.materialPurchases,
              icon: Package,
              color: "indigo"
            },
            {
              title: "النقل",
              value: currentStats.transportExpenses,
              icon: Truck,
              color: "orange",
              formatter: formatCurrency
            },
            {
              title: "عناصر حرجة",
              value: "1 عنصر حرج",
              icon: AlertCircle,
              color: "critical"
            },
            {
              title: "تحذيرات",
              value: "1 تحذير",
              icon: Zap,
              color: "warning"
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
              const project_id = project.id || '';
              const projectName = project.name || '';
              const projectStatus = project.status || 'active';
              const statusBadge = getStatusBadge(projectStatus);
              const isSelected = project_id === selectedProjectId;
              // استخدام بيانات ExpenseLedgerService للإحصائيات المالية
              const projectStats = getProjectStats(project_id);
              const income = projectStats?.totalIncome || 0;
              const expenses = projectStats?.totalExpenses || 0;
              const balance = projectStats?.currentBalance || 0;
              const workers = projectStats?.activeWorkers || 0;
              return (
                <UnifiedCard
                  key={project_id}
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
                      onClick: () => selectProject(project_id),
                      color: isSelected ? "green" : "blue"
                    }
                  ]}
                  onClick={() => selectProject(project_id)}
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
                    is_active: true,
                    ...(selectedProjectId && selectedProjectId !== 'all' ? { project_id: selectedProjectId } : {}),
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
                value={projectData.project_type_id?.toString() || ""}
                onValueChange={(val) => setProjectData({...projectData, project_type_id: val ? parseInt(val) : null})}
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
                      project_type_id: projectData.project_type_id
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