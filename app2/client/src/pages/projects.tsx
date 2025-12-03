import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { 
  Edit, 
  Trash2, 
  Plus, 
  Users, 
  DollarSign, 
  Package, 
  TrendingUp,
  Clock,
  MapPin,
  BarChart3,
  Building2,
  Camera,
  Upload,
  X,
  ImageIcon,
  Eye,
  Calendar,
  Activity,
  Wallet,
  UserCog
} from "lucide-react";
import type { Project, InsertProject } from "@shared/schema";
import { insertProjectSchema } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { useAuth } from "@/components/AuthProvider";

interface ProjectStats {
  totalWorkers: number;
  totalExpenses: number;
  totalIncome: number;
  currentBalance: number;
  activeWorkers: number;
  completedDays: number;
  materialPurchases: number;
  lastActivity: string;
}

interface ProjectWithStats extends Project {
  stats: ProjectStats;
}

// Helper functions for cleaning and parsing numbers - محسنة
const cleanInteger = (value: any): number => {
  if (value === undefined || value === null || value === '') return 0;
  
  // التعامل مع الأرقام المباشرة
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : Math.max(0, Math.floor(value));
  }
  
  // التعامل مع النصوص
  const stringValue = String(value).trim();
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') return 0;
  
  // تنظيف النص من الرموز غير الرقمية (عدا الأرقام والنقطة والناقص)
  const cleanValue = stringValue.replace(/[^\d.-]/g, '');
  const num = parseInt(cleanValue, 10);
  
  return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num);
};

const cleanNumber = (value: any): number => {
  if (value === undefined || value === null || value === '') return 0;
  
  // التعامل مع الأرقام المباشرة
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : value;
  }
  
  // التعامل مع النصوص
  const stringValue = String(value).trim();
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') return 0;
  
  // تنظيف النص من الرموز غير الرقمية (عدا الأرقام والنقطة والناقص)
  const cleanValue = stringValue.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleanValue);
  
  return isNaN(num) || !isFinite(num) ? 0 : num;
};



export default function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { setFloatingAction } = useFloatingButton();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
    engineerId: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", engineerId: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر",
    });
  }, [toast]);



  // تعيين إجراء الزر العائم لإضافة مشروع جديد
  useEffect(() => {
    const handleAddProject = () => setIsCreateDialogOpen(true);
    setFloatingAction(handleAddProject, "إضافة مشروع جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // ✅ Fetch projects with statistics - استخدام default fetcher مع Authorization headers
  const { data: projectsData = [], isLoading, refetch: refetchProjects, error } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects/with-stats"],
    queryFn: async () => {
      try {
        console.log('📊 [Projects] جلب المشاريع مع الإحصائيات...');
        const response = await apiRequest("/api/projects/with-stats", "GET");
        console.log('📊 [Projects] استجابة المشاريع:', response);

        // معالجة هيكل الاستجابة المتعددة
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
          console.warn('⚠️ [Projects] البيانات ليست مصفوفة، تحويل إلى مصفوفة فارغة');
          projects = [];
        }

        console.log(`✅ [Projects] تم جلب ${projects.length} مشروع مع الإحصائيات`);
        return projects as ProjectWithStats[];
      } catch (error) {
        console.error('❌ [Projects] خطأ في جلب المشاريع:', error);
        // في حالة الخطأ، لا نرمي الخطأ لتجنب كسر الصفحة
        return [] as ProjectWithStats[];
      }
    },
    refetchInterval: 60000, // إعادة التحديث كل دقيقة
    staleTime: 30000, // البيانات طازجة لـ 30 ثانية
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // إذا كان خطأ 401 (غير مصرح)، لا نعيد المحاولة
      if ((error as any)?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // ✅ معالجة البيانات بعد الحصول عليها مع تنظيف إضافي
  const projects = Array.isArray(projectsData) ? projectsData.filter(project => project && typeof project === 'object') : [];

  // دالة التحديث مع إشعار
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchProjects();
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
  }, [refetchProjects, toast]);

  // جلب قائمة المستخدمين (للاستخدام في اختيار المهندس)
  const { data: usersData = [] } = useQuery<{id: string; name: string; email: string; role: string}[]>({
    queryKey: ["/api/users/list"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/users/list", "GET");
        if (response?.success && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.error('❌ [Projects] خطأ في جلب المستخدمين:', error);
        return [];
      }
    },
    staleTime: 60000,
  });

  // Create project form
  const createForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      status: "active",
      engineerId: null,
    },
  });

  // Edit project form
  const editForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      status: "active",
      engineerId: null,
    },
  });

  // دالة مساعدة لحفظ القيم في autocomplete_data
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      // تجاهل الأخطاء لأن هذه عملية مساعدة
      console.log(`Failed to save autocomplete value for ${category}:`, error);
    }
  };


  const handleImageCapture = (useCamera: boolean) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      if (useCamera) {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    createForm.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleEditImageCapture = (useCamera: boolean) => {
    if (editFileInputRef.current) {
      editFileInputRef.current.accept = "image/*";
      if (useCamera) {
        editFileInputRef.current.setAttribute('capture', 'environment');
      } else {
        editFileInputRef.current.removeAttribute('capture');
      }
      editFileInputRef.current.click();
    }
  };

  const handleEditRemoveImage = () => {
    editForm.setValue('imageUrl', '');
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) =>
      apiRequest("/api/projects", "POST", data),
    onSuccess: async (data, variables) => {
      // حفظ اسم المشروع في autocomplete_data
      await saveAutocompleteValue('projectNames', variables.name);

      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({ title: "تم إنشاء المشروع بنجاح" });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء المشروع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertProject }) =>
      apiRequest(`/api/projects/${id}`, "PATCH", data),
    onSuccess: async (result, variables) => {
      // حفظ اسم المشروع في autocomplete_data
      await saveAutocompleteValue('projectNames', variables.data.name);

      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({ title: "تم تحديث المشروع بنجاح" });
      setIsEditDialogOpen(false);
      setEditingProject(null);
      editForm.reset();
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديث المشروع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/projects/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({ title: "تم حذف المشروع بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حذف المشروع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = (data: InsertProject) => {
    createProjectMutation.mutate(data);
  };

  const handleEditProject = (data: InsertProject) => {
    if (!editingProject) {
      toast({
        title: "خطأ",
        description: "لم يتم تحديد المشروع للتعديل",
        variant: "destructive",
      });
      return;
    }
    
    console.log('🔄 [Projects] تحديث المشروع:', {
      id: editingProject.id,
      name: editingProject.name,
      newData: data
    });
    
    updateProjectMutation.mutate({ id: editingProject.id, data });
  };

  const handleDeleteProject = (id: string) => {
    deleteProjectMutation.mutate(id);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    editForm.reset({
      name: project.name,
      status: project.status,
      engineerId: project.engineerId || null,
    });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "نشط";
      case "completed":
        return "مكتمل";
      case "paused":
        return "متوقف";
      default:
        return status;
    }
  };

  // تعيين إجراء الزر العائم
  useEffect(() => {
    setFloatingAction(() => setIsCreateDialogOpen(true), "إضافة مشروع جديد");

    // تنظيف الزر عند مغادرة الصفحة
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // Helper function محسنة لتنظيف القيم النصية وتحويلها إلى أرقام
  const safeParseNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    if (typeof value === 'number') {
      return isNaN(value) || !isFinite(value) ? defaultValue : value;
    }
    
    if (typeof value === 'string') {
      const cleanValue = value.trim();
      if (cleanValue === '' || cleanValue === 'null' || cleanValue === 'undefined') return defaultValue;
      
      // تنظيف القيم المتكررة المشبوهة مثل 162162162
      if (cleanValue.match(/^(\d{1,3})\1{2,}$/)) return defaultValue;
      
      // إزالة الفواصل والرموز غير الرقمية
      const numericValue = cleanValue.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(numericValue);
      return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
    }
    
    return defaultValue;
  };

  // حساب الإحصائيات العامة مع تحسين معالجة البيانات - يجب أن يكون قبل أي return
  const overallStats = useMemo(() => {
    console.log('🔄 [Projects] حساب الإحصائيات العامة، عدد المشاريع:', projects.length);
    
    if (!Array.isArray(projects) || projects.length === 0) {
      console.log('⚠️ [Projects] لا توجد مشاريع للحساب');
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalWorkers: 0,
        materialPurchases: 0,
      };
    }

    const calculatedStats = projects.reduce((acc, project, index) => {
      // التأكد من وجود المشروع وصحة بياناته
      if (!project || typeof project !== 'object') {
        console.warn(`⚠️ [Projects] مشروع ${index} غير صحيح تم تخطيه:`, project);
        return acc;
      }

      const stats = project.stats || {};
      
      // تسجيل تفصيلي لكل مشروع
      console.log(`📊 [Projects] مشروع "${project.name}":`, {
        totalIncome: stats.totalIncome,
        totalExpenses: stats.totalExpenses,
        totalWorkers: stats.totalWorkers,
        materialPurchases: stats.materialPurchases,
        status: project.status
      });
      
      // استخدام دالة تنظيف محسنة للأرقام
      const safeIncome = safeParseNumber(stats.totalIncome, 0);
      const safeExpenses = safeParseNumber(stats.totalExpenses, 0);
      const safeWorkers = cleanInteger(stats.totalWorkers);
      const safePurchases = cleanInteger(stats.materialPurchases);

      console.log(`✅ [Projects] قيم منظفة للمشروع "${project.name}":`, {
        safeIncome,
        safeExpenses,
        safeWorkers,
        safePurchases
      });

      return {
        totalProjects: acc.totalProjects + 1,
        activeProjects: acc.activeProjects + (project.status === 'active' ? 1 : 0),
        totalIncome: acc.totalIncome + safeIncome,
        totalExpenses: acc.totalExpenses + safeExpenses,
        totalWorkers: acc.totalWorkers + safeWorkers,
        materialPurchases: acc.materialPurchases + safePurchases,
      };
    }, {
      totalProjects: 0,
      activeProjects: 0,
      totalIncome: 0,
      totalExpenses: 0,
      totalWorkers: 0,
      materialPurchases: 0,
    });

    console.log('✅ [Projects] إجمالي الإحصائيات المحسوبة:', calculatedStats);
    return calculatedStats;
  }, [projects]);

  const currentBalance = overallStats.totalIncome - overallStats.totalExpenses;

  // استخدام دالة formatCurrency من utils.ts لضمان التوحيد
  const formatCurrencyLocal = formatCurrency;

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (searchValue && !project.name.toLowerCase().includes(searchValue.toLowerCase())) {
        return false;
      }
      if (filterValues.status && filterValues.status !== "all" && project.status !== filterValues.status) {
        return false;
      }
      if (filterValues.engineerId && filterValues.engineerId !== "all") {
        if (filterValues.engineerId === "none") {
          if (project.engineerId) return false;
        } else {
          if (project.engineerId !== filterValues.engineerId) return false;
        }
      }
      return true;
    });
  }, [projects, searchValue, filterValues]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalProjects',
          label: 'جميع المشاريع',
          value: overallStats.totalProjects,
          icon: Building2,
          color: 'blue',
        },
        {
          key: 'activeProjects',
          label: 'مشاريع نشطة',
          value: overallStats.activeProjects,
          icon: Activity,
          color: 'blue',
          showDot: true,
          dotColor: 'bg-green-500',
        },
        {
          key: 'currentBalance',
          label: 'الرصيد الحالي',
          value: formatCurrency(currentBalance),
          icon: Wallet,
          color: currentBalance >= 0 ? 'blue' : 'red',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalIncome',
          label: 'إجمالي الدخل',
          value: formatCurrency(overallStats.totalIncome),
          icon: TrendingUp,
          color: 'green',
        },
        {
          key: 'totalWorkers',
          label: 'إجمالي العمال',
          subLabel: 'في جميع المشاريع',
          value: overallStats.totalWorkers,
          icon: Users,
          color: 'amber',
        },
        {
          key: 'materialPurchases',
          label: 'عمليات الشراء',
          subLabel: 'مواد ومعدات',
          value: overallStats.materialPurchases,
          icon: Package,
          color: 'gray',
        },
      ]
    }
  ], [overallStats, currentBalance]);

  const filtersConfig: FilterConfig[] = useMemo(() => {
    const baseFilters: FilterConfig[] = [
      {
        key: 'status',
        label: 'حالة المشروع',
        type: 'select',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'جميع الحالات' },
          { value: 'active', label: 'نشط' },
          { value: 'paused', label: 'متوقف' },
          { value: 'completed', label: 'مكتمل' },
        ],
      },
    ];
    
    if (isAdmin) {
      baseFilters.push({
        key: 'engineerId',
        label: 'المهندس المسؤول',
        type: 'select',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'جميع المهندسين' },
          { value: 'none', label: 'بدون مهندس' },
          ...usersData.map(u => ({ value: u.id, label: u.name })),
        ],
      });
    }
    
    return baseFilters;
  }, [usersData, isAdmin]);


  // معالجة حالة التحميل
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-1">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">جاري تحميل المشاريع...</p>
        </div>
      </div>
    );
  }

  // معالجة الأخطاء
  if (error) {
    console.error('❌ [Projects] خطأ في تحميل المشاريع:', error);
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-1">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            خطأ في تحميل المشاريع
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى.
          </p>
          <Button onClick={() => refetchProjects()} className="gap-2">
            <Plus className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 p-2">
        <UnifiedFilterDashboard
          statsRows={statsRowsConfig}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="البحث في المشاريع..."
          filters={filtersConfig}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          resultsSummary={(searchValue || filterValues.status !== 'all') ? {
            totalCount: projects.length,
            filteredCount: filteredProjects.length,
            totalLabel: 'النتائج',
            filteredLabel: 'من',
            totalValue: filteredProjects.reduce((acc, p) => acc + (p.stats?.currentBalance || 0), 0),
            totalValueLabel: 'الإجمالي',
            unit: 'ر.ي',
          } : undefined}
        />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء مشروع جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل المشروع الجديد
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateProject)} className="space-y-1">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المشروع</FormLabel>
                      <FormControl>
                        <AutocompleteInput 
                          value={field.value}
                          onChange={field.onChange}
                          category="projectNames"
                          placeholder="اسم المشروع"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isAdmin && (
                  <FormField
                    control={createForm.control}
                    name="engineerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المهندس / المشرف</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المهندس المسؤول" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">بدون مهندس</SelectItem>
                            {usersData.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>حالة المشروع</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر حالة المشروع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">نشط</SelectItem>
                          <SelectItem value="paused">متوقف</SelectItem>
                          <SelectItem value="completed">مكتمل</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? "جاري الإنشاء..." : "إنشاء المشروع"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المشروع</DialogTitle>
            <DialogDescription>
              عدّل تفاصيل المشروع
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditProject)} className="space-y-1">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المشروع</FormLabel>
                    <FormControl>
                      <AutocompleteInput 
                        value={field.value}
                        onChange={field.onChange}
                        category="projectNames"
                        placeholder="اسم المشروع"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isAdmin && (
                <FormField
                  control={editForm.control}
                  name="engineerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المهندس / المشرف</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المهندس المسؤول" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون مهندس</SelectItem>
                          {usersData.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة المشروع</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة المشروع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="paused">متوقف</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateProjectMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProjectMutation.isPending || !editingProject}
                  className="gap-2"
                >
                  {updateProjectMutation.isPending ? "⏳ جاري التحديث..." : "✅ تحديث المشروع"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Projects Grid - Using UnifiedCard */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">
            {projects.length === 0 ? "لا توجد مشاريع" : "لا توجد نتائج"}
          </h3>
          <p className="text-muted-foreground">
            {projects.length === 0 ? "ابدأ بإنشاء مشروعك الأول" : "جرب تغيير معايير البحث أو الفلاتر"}
          </p>
          {projects.length === 0 && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء مشروع جديد
            </Button>
          )}
        </Card>
      ) : (
        <UnifiedCardGrid columns={4}>
          {filteredProjects.map((project) => {
            const balance = safeParseNumber(project.stats?.currentBalance, 0);
            const statusBadgeVariant = project.status === 'active' ? 'success' : 
                                       project.status === 'completed' ? 'default' : 'destructive';
            
            return (
              <UnifiedCard
                key={project.id}
                title={project.name}
                subtitle={formatDate(project.createdAt)}
                titleIcon={Building2}
                headerColor={project.status === 'active' ? '#22c55e' : 
                            project.status === 'completed' ? '#3b82f6' : '#ef4444'}
                badges={[
                  {
                    label: getStatusText(project.status),
                    variant: statusBadgeVariant,
                  }
                ]}
                fields={[
                  {
                    label: "المتبقي",
                    value: formatCurrency(balance),
                    icon: BarChart3,
                    emphasis: true,
                    color: balance >= 0 ? "info" : "danger",
                  },
                  {
                    label: "الدخل",
                    value: formatCurrency(safeParseNumber(project.stats?.totalIncome, 0)),
                    icon: TrendingUp,
                    color: "success",
                  },
                  {
                    label: "المصروفات",
                    value: formatCurrency(safeParseNumber(project.stats?.totalExpenses, 0)),
                    icon: DollarSign,
                    color: "danger",
                  },
                  {
                    label: "العمال",
                    value: cleanInteger(project.stats?.totalWorkers),
                    icon: Users,
                  },
                  {
                    label: "المشتريات",
                    value: cleanInteger(project.stats?.materialPurchases),
                    icon: Package,
                  },
                  {
                    label: "الأيام النشطة",
                    value: cleanInteger(project.stats?.completedDays),
                    icon: Clock,
                  },
                ]}
                actions={[
                  {
                    icon: Edit,
                    label: "تعديل",
                    onClick: () => openEditDialog(project),
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    variant: "ghost",
                    onClick: () => {
                      if (confirm(`هل أنت متأكد من حذف المشروع "${project.name}"؟`)) {
                        handleDeleteProject(project.id);
                      }
                    },
                  },
                ]}
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}
      </div>
    </>
  );
}
