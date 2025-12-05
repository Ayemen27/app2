import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { Edit2, Trash2, Users, Clock, DollarSign, Calendar, User, Activity, Briefcase, Phone, Building, Power, CheckCircle, XCircle, Wallet, ArrowDownCircle, TrendingDown } from 'lucide-react';
import { UnifiedFilterDashboard } from "../../components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "../../components/ui/unified-filter-dashboard";
import { UnifiedCard, UnifiedCardGrid } from "../../components/ui/unified-card";
import { listWorkers, deleteWorker, updateWorker, countWorkers } from './repo';
import AddWorkerForm from './WorkerForm';
import type { Worker as RxDBWorker, WorkerType as WorkerTypeEnum } from '../../db/schema';

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  phone?: string | null;
  hireDate?: string | null;
  isActive: boolean;
  createdAt: string;
  nationalId?: string | null;
  notes?: string | null;
  projectId?: string | null;
  status?: 'active' | 'inactive' | 'terminated';
}

interface WorkerStats {
  totalWorkDays: number;
  totalTransfers: number;
  totalEarnings: number;
  projectsWorked: number;
  lastAttendanceDate: string | null;
  monthlyAttendanceRate: number;
}

const workerTypeLabels: Record<WorkerTypeEnum, string> = {
  skilled: 'ماهر',
  unskilled: 'عادي',
  supervisor: 'مشرف',
  driver: 'سائق',
  other: 'أخرى',
};

const mapRxDBWorkerToWorker = (rxdbWorker: RxDBWorker): Worker => ({
  id: rxdbWorker.id,
  name: rxdbWorker.name,
  type: workerTypeLabels[rxdbWorker.workerType] || rxdbWorker.workerType,
  dailyWage: String(rxdbWorker.dailyWage),
  phone: rxdbWorker.phone,
  hireDate: rxdbWorker.startDate,
  isActive: rxdbWorker.status === 'active',
  createdAt: new Date(rxdbWorker.createdAt).toISOString(),
  nationalId: rxdbWorker.nationalId,
  notes: rxdbWorker.notes,
  projectId: rxdbWorker.projectId,
  status: rxdbWorker.status,
});

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
          <p className="text-[10px] text-gray-500 dark:text-gray-400">المتبقي</p>
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
  formatCurrency,
  isToggling,
}: { 
  worker: Worker; 
  onEdit: () => void; 
  onDelete: () => void;
  onToggleStatus: () => void;
  formatCurrency: (amount: number) => string;
  isToggling: boolean;
}) => {
  const stats: WorkerStats = {
    totalWorkDays: 0,
    totalTransfers: 0,
    totalEarnings: 0,
    projectsWorked: 0,
    lastAttendanceDate: null,
    monthlyAttendanceRate: 0,
  };
  const statsLoading = false;
  const projectsCount = stats?.projectsWorked ?? 0;

  return (
    <UnifiedCard
      title={worker.name}
      subtitle={worker.hireDate ? new Date(worker.hireDate).toLocaleDateString('en-GB') : undefined}
      titleIcon={User}
      headerColor={worker.isActive ? '#22c55e' : '#ef4444'}
      badges={[
        {
          label: worker.type,
          variant: 'secondary',
        },
        {
          label: worker.isActive ? 'نشط' : 'غير نشط',
          variant: worker.isActive ? 'success' : 'destructive',
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
          icon: Edit2,
          label: "تعديل",
          onClick: onEdit,
          color: "blue",
        },
        {
          icon: Power,
          label: worker.isActive ? "إيقاف" : "تفعيل",
          onClick: onToggleStatus,
          disabled: isToggling,
          color: worker.isActive ? "yellow" : "green",
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
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();

  const loadWorkers = useCallback(async () => {
    try {
      setIsLoading(true);
      const rxdbWorkers = await listWorkers();
      const mappedWorkers = rxdbWorkers.map(mapRxDBWorkerToWorker);
      setWorkers(mappedWorkers);
    } catch (error) {
      console.error('خطأ في تحميل العمال:', error);
      setWorkers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadWorkers();
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
  }, [loadWorkers, toast]);

  const handleDeleteWorker = useCallback(async (worker: Worker) => {
    if (confirm(`هل أنت متأكد من حذف العامل "${worker.name}"؟`)) {
      try {
        await deleteWorker(worker.id);
        toast({
          title: "تم حذف العامل بنجاح",
          description: "تم حذف العامل من النظام بنجاح.",
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
        });
        await loadWorkers();
      } catch (error: any) {
        toast({
          title: "لا يمكن حذف العامل",
          description: error?.message || "حدث خطأ في حذف العامل",
          variant: "destructive",
        });
      }
    }
  }, [toast, loadWorkers]);

  const handleToggleStatus = useCallback(async (worker: Worker) => {
    setTogglingWorkerId(worker.id);
    try {
      await updateWorker({ 
        id: worker.id, 
        status: worker.isActive ? 'inactive' : 'active' 
      });
      toast({
        title: "تم بنجاح",
        description: "تم تحديث حالة العامل بنجاح",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
      await loadWorkers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تحديث العامل",
        variant: "destructive",
      });
    } finally {
      setTogglingWorkerId(null);
    }
  }, [toast, loadWorkers]);

  const filteredWorkers = useMemo(() => {
    return (Array.isArray(workers) ? workers : []).filter(worker => {
      const matchesSearch = worker.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                           worker.type.toLowerCase().includes(searchValue.toLowerCase()) ||
                           (worker.phone && worker.phone.includes(searchValue));
      const matchesStatus = filterValues.status === 'all' || 
                           (filterValues.status === 'active' && worker.isActive) ||
                           (filterValues.status === 'inactive' && !worker.isActive);
      const matchesType = filterValues.type === 'all' || worker.type === filterValues.type;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [workers, searchValue, filterValues]);

  const stats = useMemo(() => ({
    total: Array.isArray(workers) ? workers.length : 0,
    active: Array.isArray(workers) ? workers.filter(w => w.isActive).length : 0,
    inactive: Array.isArray(workers) ? workers.filter(w => !w.isActive).length : 0,
    avgWage: Array.isArray(workers) && workers.length > 0 
      ? workers.reduce((sum, w) => sum + parseFloat(w.dailyWage), 0) / workers.length 
      : 0
  }), [workers]);

  const workerTypeOptions = useMemo(() => {
    const types = [...new Set(workers.map(w => w.type))];
    return [
      { value: 'all', label: 'جميع الأنواع' },
      ...types.map(type => ({ value: type, label: type })),
    ];
  }, [workers]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 2,
      gap: 'sm',
      items: [
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
          showDot: true,
          dotColor: 'bg-green-500',
        },
      ]
    },
    {
      columns: 2,
      gap: 'sm',
      items: [
        {
          key: 'inactive',
          label: 'غير النشطين',
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
      ]
    }
  ], [stats]);

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
      options: workerTypeOptions,
    },
  ], [workerTypeOptions]);

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setShowDialog(true);
  };

  const handleNewWorker = () => {
    setEditingWorker(undefined);
    setShowDialog(true);
  };

  const handleDialogClose = useCallback(() => {
    setShowDialog(false);
    setEditingWorker(undefined);
    loadWorkers();
  }, [loadWorkers]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-1.5 bg-gray-300 dark:bg-gray-700 rounded-t-lg" />
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث عن عامل (الاسم، النوع، الهاتف)..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        resultsSummary={(searchValue || filterValues.status !== 'all' || filterValues.type !== 'all') ? {
          totalCount: workers.length,
          filteredCount: filteredWorkers.length,
          totalLabel: 'النتائج',
          filteredLabel: 'من',
        } : undefined}
      />

      {filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">
              لا توجد عمال
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {workers.length === 0 ? 'لم يتم إضافة أي عمال بعد' : 'لا توجد عمال تطابق معايير البحث'}
            </p>
            {workers.length === 0 && (
              <Button onClick={handleNewWorker} className="mt-4">
                إضافة أول عامل
              </Button>
            )}
          </CardContent>
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
              formatCurrency={formatCurrency}
              isToggling={togglingWorkerId === worker.id}
            />
          ))}
        </UnifiedCardGrid>
      )}

      <Button 
        onClick={handleNewWorker}
        className="fixed bottom-20 left-4 z-50 h-14 w-14 rounded-full shadow-lg"
      >
        +
      </Button>

      <WorkerDialog
        worker={editingWorker}
        onClose={handleDialogClose}
        isOpen={showDialog}
      />
    </div>
  );
}
