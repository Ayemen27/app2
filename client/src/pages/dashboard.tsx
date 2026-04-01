import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import AddWorkerForm from "@/components/forms/add-worker-form";
import AddProjectForm from "@/components/forms/add-project-form";
import type { 
  Project, 
  DailyExpenseSummary, 
  Worker, 
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

        return projects as ProjectWithStats[];
      } catch (error) {
        return [] as ProjectWithStats[];
      }
    },
    ...queryOptions
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
    }).format(Math.round(amount)) + ' ر.ي';
  };

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
      completedDays: String(currentTotals.completedDays || 0), 
      materialPurchases: formatCurrency(currentTotals.totalMaterialCosts || 0),
      transportExpenses: currentTotals.totalTransportation || 0
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
              color: "red"
            },
            {
              title: "تحذيرات",
              value: "1 تحذير",
              icon: Zap,
              color: "amber"
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
          <AddWorkerForm
            projectId={selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : undefined}
            onSuccess={() => setShowWorkerModal(false)}
            onCancel={() => setShowWorkerModal(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء مشروع جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات المشروع الجديد
            </DialogDescription>
          </DialogHeader>
          <AddProjectForm
            onSuccess={() => setShowProjectModal(false)}
            onCancel={() => setShowProjectModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}