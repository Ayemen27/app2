import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { 
  Building2, 
  FileText, 
  Download, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users,
  Package,
  CreditCard,
  AlertCircle,
  Phone,
  MapPin,
  Eye,
  ShoppingCart,
  Receipt,
  Wallet,
  Calendar,
  Edit2,
  Trash2
} from "lucide-react";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { downloadExcelFile } from "@/utils/webview-download";
import { useToast } from "@/hooks/use-toast";
import type { Supplier, MaterialPurchase, Project } from "@shared/schema";
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function SupplierAccountsPage() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId, getProjectIdForApi } = useSelectedProject();
  const { toast } = useToast();

  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects", "GET");
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Project[];
        }
        return Array.isArray(response) ? response as Project[] : [];
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    },
  });

  const { data: suppliers = [], isLoading: isLoadingSuppliers, error: suppliersError } = useQuery<Supplier[]>({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suppliers", "GET");
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Supplier[];
        }
        return Array.isArray(response) ? response as Supplier[] : [];
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: dateRange } = useQuery<{ minDate: string; maxDate: string }>({
    queryKey: QUERY_KEYS.materialPurchasesDateRange,
    staleTime: 300000,
  });

  const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery<MaterialPurchase[]>({
    queryKey: QUERY_KEYS.materialPurchasesFiltered(selectedProjectId, selectedSupplierId, dateFrom, dateTo, paymentTypeFilter),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // إضافة المورد فقط إذا كان محدداً وليس "all"
      if (selectedSupplierId && selectedSupplierId !== 'all') {
        params.append('supplier_id', selectedSupplierId);
      }
      
      const project_idForApi = getProjectIdForApi();
      if (project_idForApi) params.append('project_id', project_idForApi);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      // إصلاح: إرسال نوع الدفع بألف مد للتوافق مع قاعدة البيانات
      if (paymentTypeFilter && paymentTypeFilter !== 'all') {
        const normalizedType = paymentTypeFilter === 'أجل' ? 'آجل' : paymentTypeFilter;
        params.append('purchaseType', normalizedType);
      }
      
      try {
        const allPurchases = await apiRequest(`/api/material-purchases?${params.toString()}`);
        const data = allPurchases.data || allPurchases || [];
        
        // تطبيق فلترة إضافية على مستوى العميل للتأكد
        let filteredData = Array.isArray(data) ? data : [];
        
        if (paymentTypeFilter && paymentTypeFilter !== 'all') {
          const normalizedFilter = paymentTypeFilter === 'أجل' ? 'آجل' : paymentTypeFilter;
          filteredData = filteredData.filter(purchase => {
            const purchaseType = purchase.purchaseType?.replace(/['"]/g, '') || '';
            return purchaseType === normalizedFilter || 
                   (normalizedFilter === 'آجل' && (purchaseType === 'أجل' || purchaseType === 'آجل'));
          });
        }
        
        return filteredData;
      } catch (error) {
        console.error('خطأ في جلب المشتريات:', error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const { data: globalStats } = useQuery<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }>({
    queryKey: QUERY_KEYS.supplierStatistics,
    queryFn: async () => {
      // إرجاع بيانات فارغة لأننا سنعتمد على summary الموحد للإحصائيات العامة
      return {
        totalSuppliers: 0,
        totalCashPurchases: "0",
        totalCreditPurchases: "0",
        totalDebt: "0",
        totalPaid: "0",
        remainingDebt: "0",
        activeSuppliers: 0
      };
    },
    enabled: false // تعطيل هذا الاستعلام لتوحيد المصدر
  });

  const { data: supplierStats } = useQuery<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }>({
    queryKey: QUERY_KEYS.supplierStatisticsFiltered(selectedProjectId, selectedSupplierId, dateFrom, dateTo, paymentTypeFilter),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // إضافة المورد فقط إذا كان محدداً وليس "all"
      if (selectedSupplierId && selectedSupplierId !== 'all') {
        params.append('supplier_id', selectedSupplierId);
      }
      
      const project_idForApi = getProjectIdForApi();
      if (project_idForApi) params.append('project_id', project_idForApi);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      // إصلاح: إرسال نوع الدفع بألف مد للتوافق مع قاعدة البيانات
      if (paymentTypeFilter && paymentTypeFilter !== 'all') {
        const normalizedType = paymentTypeFilter === 'أجل' ? 'آجل' : paymentTypeFilter;
        params.append('purchaseType', normalizedType);
      }
      
      try {
        const result = await apiRequest(`/api/suppliers/statistics?${params.toString()}`);
        return result.data || result || {
          totalSuppliers: 0,
          totalCashPurchases: "0",
          totalCreditPurchases: "0",
          totalDebt: "0",
          totalPaid: "0",
          remainingDebt: "0",
          activeSuppliers: 0
        };
      } catch (error) {
        return {
          totalSuppliers: 0,
          totalCashPurchases: "0",
          totalCreditPurchases: "0",
          totalDebt: "0",
          totalPaid: "0",
          remainingDebt: "0",
          activeSuppliers: 0
        };
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000
  });

  const selectedSupplier = selectedSupplierId && selectedSupplierId !== 'all' 
    ? suppliers.find(s => s.id === selectedSupplierId) 
    : null;

  const totals = Array.isArray(purchases) ? purchases.reduce((acc, purchase) => {
    acc.totalAmount += parseFloat(purchase.totalAmount || "0");
    acc.paidAmount += parseFloat(purchase.paidAmount || "0");
    acc.remainingAmount += parseFloat(purchase.remainingAmount || "0");
    return acc;
  }, { totalAmount: 0, paidAmount: 0, remainingAmount: 0 }) : { totalAmount: 0, paidAmount: 0, remainingAmount: 0 };

  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();

  const isFiltered = (selectedSupplierId && selectedSupplierId !== 'all') || 
                    (selectedProjectId && selectedProjectId !== 'all') || 
                    dateFrom || dateTo || (paymentTypeFilter && paymentTypeFilter !== 'all') || searchTerm;

  const overallStats = {
    totalSuppliers: suppliers.length,
    totalCashPurchases: isFiltered ? (Array.isArray(purchases) ? purchases.filter(p => p.purchaseType === 'نقد').reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0).toString() : "0") : ((summary as any)?.totalCashMaterials || "0").toString(),
    totalCreditPurchases: isFiltered ? (Array.isArray(purchases) ? purchases.filter(p => p.purchaseType === 'آجل' || p.purchaseType === 'أجل').reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0).toString() : "0") : ((summary as any)?.totalCreditMaterials || "0").toString(),
    totalDebt: (summary as any)?.totalSuppliersDebt || "0",
    totalPaid: (summary as any)?.totalSuppliersPaid || "0",
    remainingDebt: (summary as any)?.totalSuppliersDebt || "0",
    activeSuppliers: suppliers.filter(s => parseFloat(s.totalDebt || '0') > 0).length,
    totalPurchases: Array.isArray(purchases) ? purchases.length : 0
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-US') + " ريال";
  };

  const exportToExcel = async () => {
    if (purchases.length === 0) return;

    const { createProfessionalReport, EXCEL_STYLES, ALFATIHI_COLORS, COMPANY_INFO } = await import('@/utils/axion-export');

    const data = purchases.map((purchase, index) => {
      const projectName = projects.find(p => p.id === purchase.project_id)?.name || 'غير محدد';
      return {
        index: index + 1,
        date: formatDate(purchase.invoiceDate || purchase.purchaseDate),
        invoiceNumber: purchase.invoiceNumber || '-',
        projectName,
        materialName: purchase.materialName || 'غير محدد',
        quantity: Number(purchase.quantity),
        unitPrice: parseFloat(purchase.unitPrice),
        totalAmount: parseFloat(purchase.totalAmount),
        purchaseType: purchase.purchaseType,
        paidAmount: parseFloat(purchase.paidAmount || "0"),
        remainingAmount: parseFloat(purchase.remainingAmount || "0"),
        status: parseFloat(purchase.remainingAmount || "0") === 0 ? 'مسدد' : 'مؤجل'
      };
    });

    const infoLines = [`إجمالي المشتريات: ${purchases.length}`];
    if (selectedSupplier) {
      infoLines.unshift(`المورد: ${selectedSupplier.name} | الهاتف: ${selectedSupplier.phone || 'غير محدد'}`);
    }
    infoLines.push(
      `إجمالي المبالغ: ${formatCurrency(totals.totalAmount)}`,
      `المدفوع: ${formatCurrency(totals.paidAmount)}`,
      `المتبقي: ${formatCurrency(totals.remainingAmount)}`
    );

    const downloadResult = await createProfessionalReport({
      sheetName: 'كشف حساب المورد',
      reportTitle: 'كشف حساب المورد - تقرير مفصل',
      subtitle: selectedSupplier ? `المورد: ${selectedSupplier.name}` : 'جميع الموردين',
      infoLines,
      columns: [
        { header: '#', key: 'index', width: 5 },
        { header: 'التاريخ', key: 'date', width: 13 },
        { header: 'المادة', key: 'materialName', width: 20 },
        { header: 'المشروع', key: 'projectName', width: 18 },
        { header: 'الإجمالي', key: 'totalAmount', width: 14, numFmt: '#,##0' },
        { header: 'المدفوع', key: 'paidAmount', width: 14, numFmt: '#,##0' },
        { header: 'المتبقي', key: 'remainingAmount', width: 14, numFmt: '#,##0' },
      ],
      data,
      totals: {
        label: 'الإجماليات',
        values: {
          totalAmount: totals.totalAmount,
          paidAmount: totals.paidAmount,
          remainingAmount: totals.remainingAmount
        }
      },
      signatures: [
        { title: 'توقيع المورد' },
        { title: 'توقيع المهندس المشرف' },
        { title: 'توقيع المدير العام' }
      ],
      orientation: 'landscape',
      fileName: selectedSupplier 
        ? `كشف-حساب-${selectedSupplier.name}-${new Date().toISOString().split('T')[0]}.xlsx`
        : `كشف-حساب-جميع-الموردين-${new Date().toISOString().split('T')[0]}.xlsx`,
    });

    if (!downloadResult) {
      toast({ title: "تعذر التنزيل", description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.", variant: "destructive" });
    }
  };

  const resetFilters = useCallback(() => {
    setSelectedSupplierId("all");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setPaymentTypeFilter("all");
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (selectedSupplierId && dateRange) {
      setDateFrom(dateRange.minDate);
      setDateTo(dateRange.maxDate);
    }
  }, [selectedSupplierId, dateRange]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalSuppliers',
          label: 'إجمالي الموردين',
          value: overallStats.totalSuppliers.toString(),
          icon: Users,
          color: 'blue',
        },
        {
          key: 'cashPurchases',
          label: 'المشتريات النقدية',
          value: formatCurrency(overallStats.totalCashPurchases),
          icon: Wallet,
          color: 'green',
        },
        {
          key: 'creditPurchases',
          label: 'المشتريات الآجلة',
          value: formatCurrency(overallStats.totalCreditPurchases),
          icon: CreditCard,
          color: 'orange',
        },
        {
          key: 'remainingDebt',
          label: 'إجمالي المديونية',
          value: formatCurrency(overallStats.remainingDebt),
          icon: AlertCircle,
          color: 'red',
        },
        {
          key: 'activeSuppliers',
          label: 'موردين نشطين',
          value: overallStats.activeSuppliers.toString(),
          icon: Package,
          color: 'purple',
        },
        {
          key: 'totalPaid',
          label: 'إجمالي المدفوع',
          value: formatCurrency(overallStats.totalPaid),
          icon: DollarSign,
          color: 'emerald',
        },
      ]
    },
    ...(selectedSupplierId && selectedSupplierId !== 'all' ? [{
      columns: 3 as const,
      gap: 'sm' as const,
      items: [
        {
          key: 'supplierTotal',
          label: 'مشتريات المورد',
          value: formatCurrency(totals.totalAmount),
          icon: ShoppingCart,
          color: 'purple' as const,
        },
        {
          key: 'supplierPaid',
          label: 'المدفوع للمورد',
          value: formatCurrency(totals.paidAmount),
          icon: TrendingUp,
          color: 'green' as const,
        },
        {
          key: 'supplierRemaining',
          label: 'المتبقي على المورد',
          value: formatCurrency(totals.remainingAmount),
          icon: TrendingDown,
          color: 'red' as const,
        },
        {
          key: 'supplierInvoices',
          label: 'عدد الفواتير',
          value: purchases.length.toString(),
          icon: Receipt,
          color: 'blue' as const,
        },
        {
          key: 'averageInvoice',
          label: 'متوسط الفاتورة',
          value: formatCurrency(purchases.length > 0 ? totals.totalAmount / purchases.length : 0),
          icon: FileText,
          color: 'amber' as const,
        },
        {
          key: 'paymentProgress',
          label: 'نسبة السداد',
          value: totals.totalAmount > 0 ? `${((totals.paidAmount / totals.totalAmount) * 100).toFixed(1)}%` : '0%',
          icon: TrendingUp,
          color: 'teal' as const,
        },
      ]
    }] : [])
  ], [overallStats, totals, purchases.length, selectedSupplierId, formatCurrency]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'supplier',
      label: 'المورد',
      type: 'select',
      placeholder: 'اختر المورد',
      options: [
        { value: 'all', label: 'جميع الموردين' },
        ...filteredSuppliers.map(s => ({
          value: s.id,
          label: `${s.name}${parseFloat(s.totalDebt) > 0 ? ` - ${formatCurrency(s.totalDebt)}` : ''}`
        }))
      ],
    },
    {
      key: 'paymentType',
      label: 'نوع الدفع',
      type: 'select',
      placeholder: 'نوع الدفع',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        { value: 'نقد', label: 'نقد' },
        { value: 'أجل', label: 'أجل' }
      ],
    }
  ], [filteredSuppliers, formatCurrency]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'supplier') {
      setSelectedSupplierId(value);
    } else if (key === 'paymentType') {
      setPaymentTypeFilter(value);
    }
  }, []);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="ابحث عن مورد..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={{
          supplier: selectedSupplierId,
          paymentType: paymentTypeFilter
        }}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={[
          {
            key: 'export',
            label: 'تصدير',
            icon: Download,
            onClick: exportToExcel,
            disabled: purchases.length === 0,
          },
        ]}
      />

      {selectedSupplier && (
        <UnifiedCard
          title={selectedSupplier.name}
          subtitle="معلومات المورد"
          titleIcon={Building2}
          headerColor="#3b82f6"
          fields={[
            {
              label: "المسؤول",
              value: selectedSupplier.contactPerson || "غير محدد",
              icon: Users,
              color: "default",
            },
            {
              label: "الهاتف",
              value: selectedSupplier.phone || "غير محدد",
              icon: Phone,
              color: "info",
            },
            {
              label: "العنوان",
              value: selectedSupplier.address || "غير محدد",
              icon: MapPin,
              color: "default",
            },
            {
              label: "المديونية",
              value: formatCurrency(overallStats.remainingDebt),
              icon: Wallet,
              color: "danger",
              emphasis: true,
            },
          ]}
          compact
        />
      )}

      <div className="space-y-3">
        {isLoadingPurchases ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">جاري تحميل البيانات...</p>
            </CardContent>
          </Card>
        ) : purchases.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-gray-500 text-lg mt-2">لا توجد مشتريات</p>
              <p className="text-gray-400 text-sm">جرب تغيير فلاتر البحث أو أضف مشتريات جديدة</p>
            </CardContent>
          </Card>
        ) : (
          <UnifiedCardGrid columns={2}>
            {purchases.map((purchase) => {
              const projectName = projects.find(p => p.id === purchase.project_id)?.name || 'غير محدد';
              const materialName = purchase.materialName || 'غير محدد';
              // إصلاح: استخدام supplierName من purchase أو البحث في قائمة suppliers
              const supplierName = purchase.supplierName || 
                                   suppliers.find(s => s.id === purchase.supplier_id)?.name || 
                                   'غير محدد';
              const remaining = parseFloat(purchase.remainingAmount || "0");
              const invoiceDateStr = purchase.invoiceDate || purchase.purchaseDate;
              
              return (
                <UnifiedCard
                  key={purchase.id}
                  title={materialName}
                  subtitle={projectName}
                  titleIcon={Package}
                  headerColor={remaining === 0 ? "#22c55e" : purchase.purchaseType === "نقد" ? "#3b82f6" : "#ef4444"}
                  badges={[
                    { 
                      label: remaining === 0 ? 'مسدد' : 'مؤجل', 
                      variant: remaining === 0 ? 'success' : 'destructive' 
                    },
                    { 
                      label: purchase.purchaseType, 
                      variant: purchase.purchaseType === "نقد" ? 'default' : 'warning' 
                    }
                  ]}
                  actions={[
                    {
                      icon: Edit2,
                      label: 'تعديل',
                      onClick: () => {
                        window.location.href = `/material-purchase?edit=${purchase.id}`;
                      },
                      color: 'blue',
                    },
                    {
                      icon: Trash2,
                      label: 'حذف',
                      onClick: async () => {
                        if (confirm('هل أنت متأكد من حذف هذه المشترى؟')) {
                          try {
                            await apiRequest(`/api/material-purchases/${purchase.id}`, 'DELETE');
                            await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materialPurchasesFiltered() });
                            await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
                            await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supplierStatistics });
                            toast({
                              title: '✅ تم الحذف',
                              description: 'تم حذف المشترى بنجاح',
                            });
                          } catch (error) {
                            toast({
                              title: '❌ خطأ',
                              description: 'فشل حذف المشترى',
                              variant: 'destructive',
                            });
                          }
                        }
                      },
                      color: 'red',
                    },
                  ]}
                  fields={[
                    {
                      label: "المورد",
                      value: supplierName,
                      icon: Building2,
                      color: "info",
                    },
                    {
                      label: "رقم الفاتورة",
                      value: purchase.invoiceNumber || 'بدون رقم',
                      icon: Receipt,
                      color: "default",
                    },
                    {
                      label: "التاريخ",
                      value: formatDate(invoiceDateStr),
                      icon: Calendar,
                      color: "muted",
                    },
                    {
                      label: "الكمية",
                      value: `${purchase.quantity} × ${formatCurrency(purchase.unitPrice)}`,
                      icon: Package,
                      color: "default",
                    },
                    {
                      label: "المبلغ الإجمالي",
                      value: formatCurrency(purchase.totalAmount),
                      icon: DollarSign,
                      color: "info",
                      emphasis: true,
                    },
                    {
                      label: "المدفوع",
                      value: formatCurrency(
                        purchase.purchaseType === 'نقد' 
                          ? purchase.totalAmount 
                          : (purchase.paidAmount || "0")
                      ),
                      icon: TrendingUp,
                      color: "success",
                    },
                    {
                      label: "المتبقي",
                      value: formatCurrency(
                        purchase.purchaseType === 'نقد' 
                          ? 0 
                          : (purchase.remainingAmount || "0")
                      ),
                      icon: TrendingDown,
                      color: (purchase.purchaseType === 'نقد' ? 0 : remaining) > 0 ? "danger" : "success",
                      emphasis: true,
                    },
                    ]}
                  footer={purchase.notes ? (
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                      <p className="line-clamp-2 text-amber-800 dark:text-amber-200">{purchase.notes}</p>
                    </div>
                  ) : undefined}
                  compact
                />
              );
            })}
          </UnifiedCardGrid>
        )}
      </div>
    </div>
  );
}
