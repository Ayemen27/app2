import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Trash2, Users, Clock, DollarSign, Calendar, User, Activity } from 'lucide-react';
import { FilterStatsBar, type FilterConfig, type MetricConfig } from "@/components/ui/filter-stats-bar";
import { useFilterStats } from "@/hooks/use-filter-stats";
import { apiRequest } from '@/lib/queryClient';
import AddWorkerForm from '@/components/forms/add-worker-form';
import { useFloatingButton } from '@/components/layout/floating-button-context';

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  isActive: boolean;
  createdAt: string;
}

interface WorkerType {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

interface WorkerFormData {
  name: string;
  type: string;
  dailyWage: number;
  isActive?: boolean;
}

const WorkerCard = ({ worker, onEdit, onDelete, onToggleStatus }: {
  worker: Worker;
  onEdit: (worker: Worker) => void;
  onDelete: (workerId: string) => void;
  onToggleStatus: (workerId: string) => void;
}) => {
  return (
    <Card className={`transition-all duration-300 hover:shadow-lg border-r-4 ${
      worker.isActive ? 'border-r-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-950 dark:to-gray-900' 
      : 'border-r-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-950 dark:to-gray-900'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {worker.name.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {worker.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={worker.isActive ? "default" : "destructive"} className="text-xs">
                  {worker.isActive ? "نشط" : "غير نشط"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {worker.type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(worker)}
              className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              <Edit2 className="h-4 w-4 text-blue-600" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    حذف العامل
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p className="text-gray-700 dark:text-gray-300">
                      هل أنت متأكد من حذف العامل <span className="font-semibold text-blue-600">"{worker.name}"</span>؟
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <p className="font-medium">تنبيه مهم:</p>
                          <p>إذا كان لدى العامل سجلات حضور أو تحويلات مالية، فلن يتمكن من حذفه وستظهر رسالة خطأ توضح الخطوات المطلوبة.</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      هأ الإجراء لا يمكن التراجع عنه.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="flex items-center gap-2">
                    إلغاء
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(worker.id)} 
                    className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    تأكيد الحذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">الأجر اليومي</p>
              <p className="font-bold text-green-600">{parseFloat(worker.dailyWage).toFixed(0)} ر.ي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">تاريخ التسجيل</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(worker.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant={worker.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => onToggleStatus(worker.id)}
            className="flex items-center gap-2 text-xs"
          >
            <Activity className="h-3 w-3" />
            {worker.isActive ? "إيقاف" : "تفعيل"}
          </Button>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="h-3 w-3" />
            ID: {worker.id.slice(-8)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WorkerDialog = ({ worker, onClose, isOpen }: {
  worker?: Worker;
  onClose: () => void;
  isOpen: boolean;
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
            worker={worker}
            onSuccess={onClose}
            onCancel={onClose}
            submitLabel={worker ? 'حفظ التعديلات' : 'إضافة العامل'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
];

export default function WorkersPage() {
  const [editingWorker, setEditingWorker] = useState<Worker | undefined>();
  const [showDialog, setShowDialog] = useState(false);
  
  const {
    searchValue: searchTerm,
    filterValues,
    setSearchValue: setSearchTerm,
    setFilterValue,
    resetAll,
    refresh,
    isRefreshing,
  } = useFilterStats({
    initialFilters: { status: 'all', type: 'all' },
    queryKeys: ['/api/workers'],
  });

  const statusFilter = (filterValues.status || 'all') as 'all' | 'active' | 'inactive';
  const typeFilter = filterValues.type || 'all';
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // تعيين إجراء الزر العائم لإضافة عامل جديد
  useEffect(() => {
    const handleAddWorker = () => {
      setEditingWorker(undefined);
      setShowDialog(true);
    };
    setFloatingAction(handleAddWorker, "إضافة عامل جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  const { data: workers = [], isLoading, error } = useQuery<Worker[]>({
    queryKey: ['/api/workers'],
    queryFn: async () => {
      try {
        console.log('🔄 [Workers] جلب قائمة العمال...');
        const data = await apiRequest('/api/workers', 'GET');
        console.log('📊 [Workers] استجابة العمال:', data);
        
        // معالجة هيكل الاستجابة المتعددة
        let workers = [];
        if (data && typeof data === 'object') {
          if (data.success !== undefined && data.data !== undefined) {
            workers = Array.isArray(data.data) ? data.data : [];
          } else if (Array.isArray(data)) {
            workers = data;
          } else if (data.id) {
            workers = [data];
          }
        }
        
        if (!Array.isArray(workers)) {
          console.warn('⚠️ [Workers] البيانات ليست مصفوفة، تحويل إلى مصفوفة فارغة');
          workers = [];
        }
        
        console.log(`✅ [Workers] تم جلب ${workers.length} عامل بنجاح`);
        return workers as Worker[];
      } catch (error) {
        console.error('❌ [Workers] خطأ في جلب العمال:', error);
        return [] as Worker[];
      }
    },
    staleTime: 300000,
    retry: 2,
  });

  const { data: workerTypes = [], error: workerTypesError } = useQuery<WorkerType[]>({
    queryKey: ['/api/worker-types'],
    queryFn: async () => {
      try {
        console.log('🔄 [Workers] جلب أنواع العمال...');
        const response = await fetch('/api/worker-types');
        
        if (!response.ok) {
          console.error('❌ [Workers] خطأ في جلب أنواع العمال:', response.status);
          // في حالة عدم توفر الأنواع، أرجع مصفوفة فارغة ولا تكسر التطبيق
          return [] as WorkerType[];
        }
        
        const data = await response.json();
        console.log('📊 [Workers] أنواع العمال:', data);
        
        let workerTypes = [];
        if (data && typeof data === 'object') {
          if (data.success !== undefined && data.data !== undefined) {
            workerTypes = Array.isArray(data.data) ? data.data : [];
          } else if (Array.isArray(data)) {
            workerTypes = data;
          }
        }
        
        if (!Array.isArray(workerTypes)) {
          workerTypes = [];
        }
        
        console.log(`✅ [Workers] تم جلب ${workerTypes.length} نوع عامل`);
        return workerTypes as WorkerType[];
      } catch (error) {
        console.error('❌ [Workers] خطأ في جلب أنواع العمال:', error);
        return [] as WorkerType[];
      }
    },
    staleTime: 600000, // أنواع العمال أقل تغيراً - 10 دقائق
    retry: 1,
  });

  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'الحالة',
      placeholder: 'اختر الحالة',
      options: STATUS_FILTER_OPTIONS,
      defaultValue: 'all',
    },
    {
      key: 'type',
      label: 'نوع العامل',
      placeholder: 'اختر نوع العامل',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        ...(Array.isArray(workerTypes) ? workerTypes.map(type => ({
          value: type.name,
          label: type.name,
        })) : []),
      ],
      defaultValue: 'all',
    },
  ], [workerTypes]);

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/workers/${id}`, "DELETE"),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects/with-stats'] });
      toast({
        title: "✅ تم حذف العامل بنجاح",
        description: data?.message || "تم حذف العامل من النظام بنجاح. يمكنك إضافة عامل جديد إذا لزم الأمر.",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
    },
    onError: (error: any) => {
      console.log('📝 [Workers] تفاصيل خطأ حذف العامل:', error);
      
      // معالجة محسنة لرسائل الخطأ الجديدة
      let title = "⚠️ لا يمكن حذف العامل";
      let description = error?.message || "حدث خطأ في حذف العامل";
      
      // إذا كان هناك بيانات إضافية في رسالة الخطأ
      if (error?.userAction || error?.relatedRecordsCount) {
        const recordsInfo = error.relatedRecordsCount ? 
          `(العدد: ${error.relatedRecordsCount})` : '';
        
        const actionGuidance = error.userAction ? 
          `\n\n📝 ما يجب فعله: ${error.userAction}` : '';
        
        const recordsType = error.relatedRecordsType ? 
          `\n📁 السجلات المرتبطة: ${error.relatedRecordsType} ${recordsInfo}` : '';
          
        description = `${description}${recordsType}${actionGuidance}`;
      }
      
      // رسالة مخصصة للحضور
      if (error?.relatedRecordsType?.includes('سجلات حضور')) {
        title = "📅 يجب حذف سجلات الحضور أولاً";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000, // عرض الرسالة لمدة أطول لقراءة التفاصيل
        className: "max-w-md"
      });
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/workers/${id}`, "PATCH", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects/with-stats'] });
      toast({
        title: "تم بنجاح",
        description: "تم تحديث بيانات العامل بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تحديث العامل",
        variant: "destructive",
      });
    },
  });

  const filteredWorkers = Array.isArray(workers) ? workers.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && worker.isActive) ||
                         (statusFilter === 'inactive' && !worker.isActive);
    const matchesType = typeFilter === 'all' || worker.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) : [];

  const stats = {
    total: Array.isArray(workers) ? workers.length : 0,
    active: Array.isArray(workers) ? workers.filter(w => w.isActive).length : 0,
    inactive: Array.isArray(workers) ? workers.filter(w => !w.isActive).length : 0,
    avgWage: Array.isArray(workers) && workers.length > 0 ? workers.reduce((sum, w) => sum + parseFloat(w.dailyWage), 0) / workers.length : 0
  };



  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setShowDialog(true);
  };

  const handleDeleteWorker = (workerId: string) => {
    deleteWorkerMutation.mutate(workerId);
  };

  const handleToggleStatus = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      updateWorkerMutation.mutate({ 
        id: workerId, 
        data: { isActive: !worker.isActive }
      });
    }
  };

  const handleNewWorker = () => {
    setEditingWorker(undefined);
    setShowDialog(true);
  };

  // تعيين إجراء الزر العائم
  useEffect(() => {
    setFloatingAction(handleNewWorker, "إضافة عامل جديد");
    
    // تنظيف الزر عند مغادرة الصفحة
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-1">

      {/* شريط البحث والفلترة والإحصائيات الموحد */}
      <FilterStatsBar
        title="إدارة العمال"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="ابحث عن عامل..."
        filters={filterConfigs}
        filterValues={{ status: statusFilter, type: typeFilter }}
        onFilterChange={setFilterValue}
        onReset={resetAll}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        metrics={[
          {
            key: 'total',
            label: 'إجمالي العمال',
            value: stats.total,
            icon: Users,
            color: 'blue',
          },
          {
            key: 'active',
            label: 'العمال النشطون',
            value: stats.active,
            icon: Activity,
            color: 'green',
          },
          {
            key: 'inactive',
            label: 'العمال غير النشطين',
            value: stats.inactive,
            icon: Clock,
            color: 'orange',
          },
          {
            key: 'avgWage',
            label: 'متوسط الأجر',
            value: formatCurrency(stats.avgWage),
            icon: DollarSign,
            color: 'purple',
          },
        ]}
        actions={[
          {
            key: 'add',
            label: 'إضافة عامل',
            icon: Users,
            onClick: handleNewWorker,
          },
        ]}
      />

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              لا توجد عمال
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {workers.length === 0 ? 'لم يتم إضافة أي عمال بعد' : 'لا توجد عمال تطابق معايير البحث'}
            </p>
            {workers.length === 0 && (
              <Button onClick={handleNewWorker}>
                إضافة أول عامل
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWorkers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onEdit={handleEditWorker}
              onDelete={handleDeleteWorker}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Worker Dialog */}
      <WorkerDialog
        worker={editingWorker}
        onClose={() => {
          setShowDialog(false);
          setEditingWorker(undefined);
        }}
        isOpen={showDialog}
      />
    </div>
  );
}