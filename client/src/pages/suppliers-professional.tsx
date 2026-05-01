import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Building, Phone, MapPin, User, CreditCard, Calendar, TrendingUp, AlertCircle, Download, FolderOpen, FileText, Power, Wallet, ShoppingCart } from "lucide-react";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { type Supplier, type Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AddSupplierForm from "@/components/forms/add-supplier-form";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useSelectedProject, ALL_PROJECTS_ID } from "@/hooks/use-selected-project";
import SelectedProjectBadge from "@/components/selected-project-badge";

export default function SuppliersPage() {
  const { selectedProjectId } = useSelectedProject();
  const isAllProjects = !selectedProjectId || selectedProjectId === ALL_PROJECTS_ID;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all" });
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
    }).format(Math.round(amount)) + ' ر.ي';
  };

  const { data: suppliers = [], isLoading, refetch: refetchSuppliers } = useQuery({
    queryKey: QUERY_KEYS.suppliers,
  });

  // جلب جميع المشاريع للحصول على أسماء المشاريع المرتبطة بالموردين
  const { data: projectsList = [] } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
  });

  const projectsMap = useMemo(() => {
    const m = new Map<string, string>();
    (projectsList as Project[]).forEach((p) => {
      if (p?.id) m.set(p.id, p.name);
    });
    return m;
  }, [projectsList]);

  // جلب جميع مشتريات المواد - لمعرفة المشاريع المرتبطة بكل مورد + إجمالي مشترياته
  const { data: allPurchases = [] } = useQuery<any[]>({
    queryKey: ['/api/material-purchases', 'all'],
    queryFn: async () => {
      const response = await apiRequest('/api/material-purchases', 'GET');
      return response?.data || response || [];
    },
  });

  // خريطة لكل مورد: قائمة معرّفات المشاريع + إجمالي المشتريات
  const supplierProjectsMap = useMemo(() => {
    const map = new Map<string, { projectIds: Set<string>; totalPurchases: number; purchasesCount: number }>();
    (allPurchases as any[]).forEach((p: any) => {
      const sid = p.supplier_id || p.supplierId;
      if (!sid) return;
      if (!map.has(sid)) {
        map.set(sid, { projectIds: new Set(), totalPurchases: 0, purchasesCount: 0 });
      }
      const entry = map.get(sid)!;
      const pid = p.project_id || p.projectId;
      if (pid) entry.projectIds.add(pid);
      const amt = parseFloat(String(p.totalAmount || p.total_amount || 0)) || 0;
      entry.totalPurchases += amt;
      entry.purchasesCount += 1;
    });
    return map;
  }, [allPurchases]);

  // مشتريات المشروع المختار فقط (للفلترة عند اختيار مشروع)
  const projectSupplierIds = useMemo(() => {
    if (isAllProjects) return null;
    const ids = new Set<string>();
    (allPurchases as any[]).forEach((p: any) => {
      const pid = p.project_id || p.projectId;
      const sid = p.supplier_id || p.supplierId;
      if (pid === selectedProjectId && sid) ids.add(sid);
    });
    return ids;
  }, [allPurchases, isAllProjects, selectedProjectId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchSuppliers();
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
  }, [refetchSuppliers, toast]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/suppliers/${id}`, "DELETE");
      return response;
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
      queryClient.invalidateQueries({ queryKey: ['/api/material-purchases', 'all'] });
      if (response?.softDeleted) {
        toast({
          title: "تم تعطيل المورد",
          description: response.message || "تم تعطيل المورد لحماية المشتريات السابقة",
        });
      } else {
        toast({ title: "تم حذف المورد بنجاح" });
      }
    },
    onError: (err: any) => {
      toast({
        title: "خطأ في حذف المورد",
        description: err?.message || "فشل في حذف المورد",
        variant: "destructive"
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return await apiRequest(`/api/suppliers/${id}`, "PATCH", { is_active });
    },
    onSuccess: (_resp, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
      toast({
        title: vars.is_active ? "تم تفعيل المورد" : "تم تعطيل المورد",
      });
    },
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: err?.message || "فشل تغيير حالة المورد",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    const linked = supplierProjectsMap.get(supplier.id);
    const hasPurchases = (linked?.purchasesCount || 0) > 0;
    const msg = hasPurchases
      ? `للمورد "${supplier.name}" مشتريات سابقة (${linked!.purchasesCount} عملية شراء). سيتم تعطيله بدلاً من حذفه. هل تريد المتابعة؟`
      : `هل أنت متأكد من حذف المورد "${supplier.name}"؟`;
    if (confirm(msg)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  const handleToggleActive = (supplier: Supplier) => {
    toggleActiveMutation.mutate({ id: supplier.id, is_active: !supplier.is_active });
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(false);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    setFloatingAction(handleAddSupplier, "إضافة مورد جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const filteredSuppliers = useMemo(() => {
    return (suppliers as Supplier[]).filter((supplier: Supplier) => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchValue.toLowerCase())) ||
        (supplier.phone && supplier.phone.includes(searchValue));
      const matchesStatus = filterValues.status === 'all' || 
        (filterValues.status === 'active' && supplier.is_active) ||
        (filterValues.status === 'inactive' && !supplier.is_active);
      // فلترة حسب المشروع المختار: فقط الموردون الذين لديهم مشتريات في هذا المشروع
      const matchesProject = projectSupplierIds === null || projectSupplierIds.has(supplier.id);
      
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [suppliers, searchValue, filterValues, projectSupplierIds]);

  const stats = useMemo(() => {
    // عند اختيار مشروع، الإحصائيات تعكس موردي المشروع فقط
    const baseList = projectSupplierIds === null
      ? (suppliers as Supplier[])
      : (suppliers as Supplier[]).filter(s => projectSupplierIds.has(s.id));
    return {
      total: baseList.length,
      active: baseList.filter((s: Supplier) => s.is_active).length,
      inactive: baseList.filter((s: Supplier) => !s.is_active).length,
      totalDebt: baseList.reduce((sum: number, s: Supplier) => sum + (parseFloat(s.totalDebt?.toString() || '0') || 0), 0),
    };
  }, [suppliers, projectSupplierIds]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 2,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي الموردين',
          value: stats.total,
          icon: Building,
          color: 'blue',
        },
        {
          key: 'active',
          label: 'الموردين النشطين',
          value: stats.active,
          icon: TrendingUp,
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
          icon: AlertCircle,
          color: 'orange',
        },
        {
          key: 'totalDebt',
          label: 'إجمالي المديونية',
          value: formatCurrency(stats.totalDebt),
          icon: CreditCard,
          color: stats.totalDebt > 0 ? 'red' : 'green',
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
  ], []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-1">
        <div className="animate-pulse space-y-1">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-12"></div>
                  </div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-5 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                  <div className="h-3 bg-muted rounded w-28"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-2">
      <SelectedProjectBadge />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {selectedSupplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
            </DialogTitle>
            <DialogDescription>
              {selectedSupplier ? "قم بتعديل بيانات المورد المحدد" : "أدخل بيانات المورد الجديد"}
            </DialogDescription>
          </DialogHeader>

          <AddSupplierForm
            supplier={selectedSupplier as any}
            onSuccess={() => {
              resetForm();
              queryClient.refetchQueries({ queryKey: QUERY_KEYS.suppliers });
            }}
            onCancel={resetForm}
            submitLabel={selectedSupplier ? "تحديث المورد" : "إضافة المورد"}
          />
        </DialogContent>
      </Dialog>

      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في الموردين (الاسم، الشخص المسؤول، رقم الهاتف)..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        resultsSummary={(searchValue || filterValues.status !== 'all') ? {
          totalCount: (suppliers as Supplier[]).length,
          filteredCount: filteredSuppliers.length,
          totalLabel: 'النتائج',
          filteredLabel: 'من',
          totalValue: filteredSuppliers.reduce((sum, s) => sum + (parseFloat(s.totalDebt?.toString() || '0') || 0), 0),
          totalValueLabel: 'إجمالي المديونية',
          unit: 'ر.ي',
        } : undefined}
        actions={[
          {
            key: 'export',
            icon: Download,
            label: 'تصدير Excel',
            onClick: async () => {
              if (filteredSuppliers.length === 0) return;
              const { createProfessionalReport } = await import('@/utils/axion-export');
              const data = filteredSuppliers.map((s: Supplier, idx: number) => ({
                index: idx + 1,
                name: s.name,
                phone: s.phone || '-',
                contactPerson: s.contactPerson || '-',
                totalPurchases: parseFloat(s.totalDebt?.toString() || '0') + parseFloat((s as any).totalPaid?.toString() || '0'),
                totalPaid: parseFloat((s as any).totalPaid?.toString() || '0'),
                totalDebt: parseFloat(s.totalDebt?.toString() || '0'),
                address: s.address || '-',
              }));
              const totalPurchases = data.reduce((sum, r) => sum + r.totalPurchases, 0);
              const totalPaid = data.reduce((sum, r) => sum + r.totalPaid, 0);
              const totalDebt = data.reduce((sum, r) => sum + r.totalDebt, 0);
              await createProfessionalReport({
                sheetName: 'الموردين',
                reportTitle: 'تقرير إدارة الموردين',
                subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
                infoLines: [`عدد الموردين: ${data.length}`, `إجمالي المشتريات: ${totalPurchases.toLocaleString('en-US')} ريال`, `المتبقي: ${totalDebt.toLocaleString('en-US')} ريال`],
                columns: [
                  { header: '#', key: 'index', width: 5 },
                  { header: 'اسم المورد', key: 'name', width: 20 },
                  { header: 'الهاتف', key: 'phone', width: 14 },
                  { header: 'جهة الاتصال', key: 'contactPerson', width: 16 },
                  { header: 'إجمالي المشتريات', key: 'totalPurchases', width: 16, numFmt: '#,##0' },
                  { header: 'المدفوع', key: 'totalPaid', width: 14, numFmt: '#,##0' },
                  { header: 'المتبقي', key: 'totalDebt', width: 14, numFmt: '#,##0' },
                  { header: 'العنوان', key: 'address', width: 18 },
                ],
                data,
                totals: { label: 'الإجماليات', values: { totalPurchases, totalPaid, totalDebt } },
                fileName: `تقرير_الموردين_${new Date().toISOString().split('T')[0]}.xlsx`,
              });
            },
            variant: 'outline' as const,
            disabled: filteredSuppliers.length === 0,
            tooltip: 'تصدير بيانات الموردين'
          }
        ]}
      />

      {filteredSuppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium mt-4">
              {searchValue ? "لا توجد نتائج" : "لا توجد موردين"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              {searchValue 
                ? "لم يتم العثور على موردين يطابقون كلمات البحث المدخلة. جرب كلمات أخرى." 
                : "ابدأ ببناء قاعدة بيانات الموردين الخاصة بك عن طريق إضافة أول مورد."}
            </p>
            {!searchValue && (
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 mt-4">
                <Plus className="h-4 w-4" />
                إضافة مورد جديد
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <UnifiedCardGrid columns={4}>
          {filteredSuppliers.map((supplier: Supplier) => {
            const debt = parseFloat(supplier.totalDebt?.toString() || '0') || 0;
            const linked = supplierProjectsMap.get(supplier.id);
            const linkedProjectIds = linked ? Array.from(linked.projectIds) : [];
            const linkedProjectNames = linkedProjectIds
              .map((pid) => projectsMap.get(pid))
              .filter((n): n is string => Boolean(n));
            const totalPurchases = linked?.totalPurchases || 0;
            const purchasesCount = linked?.purchasesCount || 0;
            const isMultiProject = linkedProjectNames.length > 1;
            const projectsLabel = linkedProjectNames.length === 0
              ? "لا يوجد"
              : linkedProjectNames.length === 1
                ? linkedProjectNames[0]
                : `${linkedProjectNames.length} مشاريع: ${linkedProjectNames.slice(0, 2).join('، ')}${linkedProjectNames.length > 2 ? '...' : ''}`;
            
            return (
              <UnifiedCard
                key={supplier.id}
                title={supplier.name}
                subtitle={supplier.contactPerson || undefined}
                titleIcon={Building}
                headerColor={supplier.is_active ? '#22c55e' : '#6b7280'}
                badges={[
                  {
                    label: supplier.is_active ? "نشط" : "معطل",
                    variant: supplier.is_active ? "success" : "secondary",
                  },
                  ...(debt > 0 ? [{
                    label: "مديون",
                    variant: "destructive" as const,
                  }] : [{
                    label: "رصيد سليم",
                    variant: "success" as const,
                  }]),
                  ...(isMultiProject ? [{
                    label: `متعدد المشاريع (${linkedProjectNames.length})`,
                    variant: "outline" as const,
                  }] : []),
                ]}
                fields={[
                  {
                    label: "المديونية",
                    value: debt > 0 ? formatCurrency(debt) : "لا يوجد",
                    icon: CreditCard,
                    emphasis: debt > 0,
                    color: debt > 0 ? "danger" : "success",
                  },
                  {
                    label: "إجمالي المشتريات",
                    value: totalPurchases > 0 ? formatCurrency(totalPurchases) : "لا يوجد",
                    icon: ShoppingCart,
                    color: totalPurchases > 0 ? "info" : undefined,
                  },
                  {
                    label: "عدد عمليات الشراء",
                    value: purchasesCount > 0 ? `${purchasesCount}` : "لا يوجد",
                    icon: FileText,
                  },
                  {
                    label: linkedProjectNames.length > 1 ? "المشاريع المرتبطة" : "المشروع المرتبط",
                    value: projectsLabel,
                    icon: FolderOpen,
                    color: linkedProjectNames.length > 0 ? "info" : undefined,
                  },
                  {
                    label: "رقم الهاتف",
                    value: supplier.phone || "غير محدد",
                    icon: Phone,
                  },
                  {
                    label: "شروط الدفع",
                    value: supplier.paymentTerms || "غير محدد",
                    icon: Wallet,
                  },
                  {
                    label: "تاريخ الإضافة",
                    value: supplier.created_at ? new Date(supplier.created_at).toLocaleDateString('en-GB') : "غير محدد",
                    icon: Calendar,
                  },
                  ...(supplier.address ? [{
                    label: "العنوان",
                    value: supplier.address,
                    icon: MapPin,
                  }] : []),
                ]}
                actions={[
                  {
                    icon: FileText,
                    label: "كشف الحساب",
                    variant: "outline" as const,
                    onClick: () => {
                      window.location.href = `/supplier-accounts?supplier_id=${supplier.id}`;
                    },
                  },
                  {
                    icon: Edit2,
                    label: "تعديل",
                    onClick: () => handleEdit(supplier),
                  },
                  {
                    icon: Power,
                    label: supplier.is_active ? "تعطيل" : "تفعيل",
                    variant: "ghost" as const,
                    onClick: () => handleToggleActive(supplier),
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    variant: "ghost" as const,
                    onClick: () => handleDelete(supplier),
                  },
                ]}
                footer={supplier.notes ? (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                    <p className="line-clamp-2 text-amber-800 dark:text-amber-200">{supplier.notes}</p>
                  </div>
                ) : undefined}
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}
    </div>
  );
}
