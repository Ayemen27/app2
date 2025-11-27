import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UnifiedSearchFilter, PROJECT_STATUS_OPTIONS } from "@/components/ui/unified-search-filter";
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
  Calendar
} from "lucide-react";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import type { Project, InsertProject } from "@shared/schema";
import { insertProjectSchema } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { useEffect } from "react";

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
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const { setFloatingAction } = useFloatingButton();

  // Image handling states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editSelectedImage, setEditSelectedImage] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

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

  // Create project form
  const createForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      status: "active",
      imageUrl: "",
    },
  });

  // Edit project form
  const editForm = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      status: "active",
      imageUrl: "",
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

  // Image handling functions for create form
  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
        createForm.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
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

  // Image handling functions for edit form
  const handleEditImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditSelectedImage(result);
        editForm.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
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
    setEditSelectedImage(null);
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

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
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

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({ title: "تم تحديث المشروع بنجاح" });
      setIsEditDialogOpen(false);
      setEditingProject(null);
      editForm.reset();
      setEditSelectedImage(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
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
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    }
  };

  const handleDeleteProject = (id: string) => {
    deleteProjectMutation.mutate(id);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    editForm.reset({
      name: project.name,
      status: project.status,
      imageUrl: project.imageUrl || '',
    });
    setEditSelectedImage(project.imageUrl || null);
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
    <div className="space-y-1 p-6">

      {/* إحصائيات عامة */}
      {/* شريط البحث والفلترة الموحد */}
      <UnifiedSearchFilter
        onFilterChange={setActiveFilters}
        enableSearch={true}
        enableFilters={true}
        filterOptions={PROJECT_STATUS_OPTIONS}
      />

      <StatsGrid>
        <StatsCard
          title="إجمالي المشاريع"
          value={overallStats.totalProjects.toString()}
          icon={Building2}
          color="blue"
        />
        <StatsCard
          title="المشاريع النشطة"
          value={overallStats.activeProjects.toString()}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="الرصيد الإجمالي"
          value={formatCurrencyLocal(currentBalance)}
          icon={DollarSign}
          color={currentBalance >= 0 ? "green" : "red"}
        />
        <StatsCard
          title="إجمالي العمال"
          value={overallStats.totalWorkers.toString()}
          icon={Users}
          color="purple"
        />
      </StatsGrid>
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

                {/* Image Upload Section */}
                <div className="space-y-1">
                  <FormLabel>صورة المشروع (اختيارية)</FormLabel>

                  {selectedImage ? (
                    <div className="relative">
                      <img 
                        src={selectedImage} 
                        alt="صورة المشروع" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">اختر صورة للمشروع</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageCapture(true)}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          كاميرا
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageCapture(false)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          رفع صورة
                        </Button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageSelect(file);
                      }
                    }}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? "جاري الإنشاء..." : "إنشاء المشروع"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">لا توجد مشاريع</h3>
          <p className="text-muted-foreground">ابدأ بإنشاء مشروعك الأول</p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إنشاء مشروع جديد
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(projects) ? projects.map((project) => (
            <Card key={project.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              {/* Project Image */}
              {project.imageUrl ? (
                <div className="relative h-48 overflow-hidden cursor-pointer group">
                  <img 
                    src={project.imageUrl} 
                    alt={project.name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnlargedImage(project.imageUrl!);
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-3 left-3 flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-500/80 rounded-full flex items-center justify-center">
                        <ImageIcon className="h-2 w-2 text-white" />
                      </div>
                      <span className="text-xs text-white font-medium">صورة المشروع</span>
                    </div>
                    <div className="absolute top-3 left-3">
                      <Eye className="text-white h-4 w-4" />
                    </div>
                  </div>
                  <Badge className={`absolute top-3 right-3 ${getStatusColor(project.status)}`}>
                    {getStatusText(project.status)}
                  </Badge>
                </div>
              ) : null}

              <CardHeader className={project.imageUrl ? "pb-3" : "pb-3"}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-2">{project.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      تم الإنشاء: {formatDate(project.createdAt)}
                    </CardDescription>
                  </div>
                  {!project.imageUrl && (
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusText(project.status)}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-1">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">الدخل</span>
                    </div>
                    <p className="text-sm font-bold text-green-800 dark:text-green-300 arabic-numbers">
                      {formatCurrency(safeParseNumber(project.stats.totalIncome, 0))}
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-medium text-red-700 dark:text-red-400">المصروفات</span>
                    </div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-300 arabic-numbers">
                      {formatCurrency(safeParseNumber(project.stats.totalExpenses, 0))}
                    </p>
                  </div>
                </div>

                {/* Current Balance */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">الرصيد الحالي</span>
                  </div>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-300 arabic-numbers">
                    {formatCurrency(safeParseNumber(project.stats.currentBalance, 0))}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">العمال</p>
                    <p className="text-sm font-semibold arabic-numbers">{cleanInteger(project.stats.totalWorkers)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">المشتريات</p>
                    <p className="text-sm font-semibold arabic-numbers">{cleanInteger(project.stats.materialPurchases)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">أيام العمل</p>
                    <p className="text-sm font-semibold arabic-numbers">{cleanInteger(project.stats.completedDays)}</p>
                  </div>
                </div>

                {/* Last Activity */}
                {project.stats.lastActivity && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    آخر نشاط: {formatDate(project.stats.lastActivity)}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(project)}
                    className="flex-1 gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    تعديل
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                        حذف
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف المشروع "{project.name}"؟ 
                          سيتم حذف جميع البيانات المرتبطة بهذا المشروع ولا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteProject(project.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          حذف المشروع
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )) : null}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المشروع</DialogTitle>
            <DialogDescription>
              تعديل تفاصيل المشروع
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
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة المشروع</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              {/* Image Upload Section */}
              <div className="space-y-1">
                <FormLabel>صورة المشروع (اختيارية)</FormLabel>

                {editSelectedImage ? (
                  <div className="relative">
                    <img 
                      src={editSelectedImage} 
                      alt="صورة المشروع" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleEditRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500">اختر صورة للمشروع</p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditImageCapture(true)}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        كاميرا
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditImageCapture(false)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        رفع صورة
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleEditImageSelect(file);
                    }
                  }}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={updateProjectMutation.isPending}>
                  {updateProjectMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض الصورة بالحجم الكامل */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img 
              src={enlargedImage}
              alt="صورة مكبرة"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}