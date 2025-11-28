import { useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingDown, TrendingUp, Calendar, Package, UserCheck, Plus } from "lucide-react";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { QuickActionsGrid } from "@/components/ui/quick-actions-grid";

import { formatDate } from "@/lib/utils";
import { LoadingCard, LoadingSpinner } from "@/components/ui/loading-spinner";
import { useEffect } from "react";

import { apiRequest } from "@/lib/queryClient";
import type { 
  Project, 
  DailyExpenseSummary, 
  Worker, 
  AutocompleteData as WorkerType 
} from "@shared/schema";
import { UnifiedStats } from "@/components/ui/unified-stats";

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
    description: ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        console.log('📊 [Dashboard] استجابة المشاريع:', response);

        let projects = [];
        if (response && typeof response === 'object') {
          if (response.success !== undefined && response.data !== undefined) {
            projects = Array.isArray(response.data) ? response.data : [];
            console.log('✅ [Dashboard] استخراج البيانات من response.data');
          }
          else if (Array.isArray(response)) {
            projects = response;
            console.log('✅ [Dashboard] استخدام الاستجابة كمصفوفة مباشرة');
          }
          else if (response.id) {
            projects = [response];
            console.log('✅ [Dashboard] تحويل كائن واحد لمصفوفة');
          }
          else if (response.data) {
            projects = Array.isArray(response.data) ? response.data : [];
            console.log('✅ [Dashboard] استخراج البيانات من data فقط');
          }
        }

        if (!Array.isArray(projects)) {
          console.warn('⚠️ [Dashboard] البيانات ليست مصفوفة، تحويل إلى مصفوفة فارغة');
          projects = [];
        }

        console.log(`✅ [Dashboard] تم جلب ${projects.length} مشروع مع الإحصائيات`);
        return projects as ProjectWithStats[];
      } catch (error) {
        console.error("❌ [Dashboard] خطأ في جلب المشاريع:", error);
        return [] as ProjectWithStats[];
      }
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    retry: 2,
    refetchOnWindowFocus: false,
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

  const addWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      await Promise.all([
        saveAutocompleteValue('workerNames', data.name),
        saveAutocompleteValue('workerTypes', data.type)
      ]);

      return apiRequest("/api/workers", "POST", data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });

      queryClient.refetchQueries({ queryKey: ["/api/workers"] });
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
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });

      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({
        title: "نجح الحفظ",
        description: "تم إضافة المشروع بنجاح",
      });
      setShowProjectModal(false);
      setProjectData({ name: '', status: 'active', description: '' });
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
    onSuccess: (newType) => {
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم الحفظ",
        description: "تم إضافة نوع العامل بنجاح",
      });
      setWorkerData({...workerData, type: newType.name});
      setNewTypeName("");
      setShowAddTypeDialog(false);
      queryClient.refetchQueries({ queryKey: ["/api/worker-types"] });
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

  const selectedProject = Array.isArray(projects) ? projects.find((p: ProjectWithStats) => p.id === selectedProjectId) : undefined;

  useEffect(() => {
    if (selectedProject) {
      console.log('🔍 بيانات المشروع المحدد في Frontend:', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        totalIncome: selectedProject.stats?.totalIncome,
        totalExpenses: selectedProject.stats?.totalExpenses,
        currentBalance: selectedProject.stats?.currentBalance
      });

      if (selectedProject.name.includes('الحبشي')) {
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

  if (projectsLoading) {
    return <LoadingCard />;
  }

  return (
    <div className="p-4 fade-in space-y-4">
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectChange={(projectId, projectName) => selectProject(projectId, projectName)}
      />

      {selectedProject && (
        <div className="mb-4">
          <UnifiedStats
            stats={[
              {
                title: "إجمالي التوريد",
                value: selectedProject?.stats?.totalIncome || 0,
                icon: TrendingUp,
                color: "blue",
                formatter: formatCurrency
              },
              {
                title: "إجمالي المنصرف",
                value: selectedProject?.stats?.totalExpenses || 0,
                icon: TrendingDown,
                color: "red",
                formatter: formatCurrency
              },
              {
                title: "المتبقي الحالي",
                value: selectedProject?.stats?.currentBalance || 0,
                icon: DollarSign,
                color: "green",
                formatter: formatCurrency
              },
              {
                title: "العمال النشطين",
                value: selectedProject?.stats?.activeWorkers || "0",
                icon: UserCheck,
                color: "purple"
              },
              {
                title: "أيام العمل المكتملة",
                value: selectedProject?.stats?.completedDays || "0",
                icon: Calendar,
                color: "teal"
              },
              {
                title: "مشتريات المواد",
                value: selectedProject?.stats?.materialPurchases || "0",
                icon: Package,
                color: "indigo"
              }
            ]}
            columns={3}
            hideHeader={true}
          />
        </div>
      )}

      <QuickActionsGrid 
        onAddWorker={() => setShowWorkerModal(true)}
        onAddProject={() => setShowProjectModal(true)}
      />

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
                <Select value={workerData.type} onValueChange={(value) => setWorkerData({...workerData, type: value})}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="اختر نوع العامل..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(workerTypes) ? workerTypes.map((workerType) => (
                      <SelectItem key={workerType.id} value={workerType.name}>
                        {workerType.name}
                      </SelectItem>
                    )) : null}
                    {workerTypes.length === 0 && (
                      <>
                        <SelectItem value="معلم">معلم</SelectItem>
                        <SelectItem value="عامل">عامل</SelectItem>
                        <SelectItem value="حداد">حداد</SelectItem>
                        <SelectItem value="نجار">نجار</SelectItem>
                        <SelectItem value="سائق">سائق</SelectItem>
                        <SelectItem value="كهربائي">كهربائي</SelectItem>
                        <SelectItem value="سباك">سباك</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="إضافة نوع جديد">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
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
                          onClick={() => {
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
              </div>
            </div>
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
              >
                {addWorkerMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowWorkerModal(false)}>
                إلغاء
              </Button>
            </div>
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
                      description: projectData.description || null
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
