import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, ArrowDownToLine, ArrowUpFromLine, BarChart3, Settings, 
  Box, Truck, AlertTriangle, CheckCircle2, RefreshCw, DollarSign,
  FileText, Download, Pencil, Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { generateTablePDF } from '@/utils/pdfGenerator';
import { AddEquipmentDialog } from "@/components/equipment/add-equipment-dialog";
import { TransferEquipmentDialog } from "@/components/equipment/transfer-equipment-dialog";
import { EquipmentMovementHistoryDialog } from "@/components/equipment/equipment-movement-history-dialog";

interface InventoryItem {
  id: number;
  name: string;
  category: string | null;
  unit: string;
  sku: string | null;
  min_quantity: string;
  is_active: boolean;
  total_received: string;
  total_remaining: string;
  total_issued: string;
  stock_value: string;
  supplier_count: string;
  last_receipt_date: string | null;
}

interface InventoryTransaction {
  id: number;
  item_id: number;
  lot_id: number | null;
  type: string;
  quantity: string;
  unit_cost: string;
  total_cost: string;
  from_project_id: string | null;
  to_project_id: string | null;
  transaction_date: string;
  notes: string | null;
  performed_by: string | null;
  item_name: string;
  item_unit: string;
  item_category: string | null;
  from_project_name: string | null;
  to_project_name: string | null;
  supplier_name: string | null;
}

export function EquipmentManagement() {
  const [activeTab, setActiveTab] = useState("stock");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [reportGroupBy, setReportGroupBy] = useState("item");

  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showAddEquipmentDialog, setShowAddEquipmentDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showMovementHistoryDialog, setShowMovementHistoryDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', unit: '', min_quantity: '' });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setFloatingAction, setSecondaryAction } = useFloatingButton();

  useEffect(() => {
    setFloatingAction(() => setShowReceiveDialog(true), "إضافة وارد");
    setSecondaryAction(() => setShowIssueDialog(true), "صرف مادة", "destructive");
    return () => {
      setFloatingAction(null);
      setSecondaryAction(null);
    };
  }, [setFloatingAction, setSecondaryAction]);

  const { data: statsData } = useQuery({
    queryKey: ['/api/inventory/stats'],
  });

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['/api/inventory/stock', categoryFilter, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchTerm) params.set('search', searchTerm);
      return fetch(`/api/inventory/stock?${params}`).then(r => r.json());
    },
  });

  const { data: transactionsData, isLoading: txLoading } = useQuery({
    queryKey: ['/api/inventory/transactions', txTypeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (txTypeFilter && txTypeFilter !== 'all') params.set('type', txTypeFilter);
      return fetch(`/api/inventory/transactions?${params}`).then(r => r.json());
    },
    enabled: activeTab === 'incoming' || activeTab === 'outgoing' || activeTab === 'transactions',
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['/api/inventory/categories'],
  });

  const { data: reportsData } = useQuery({
    queryKey: ['/api/inventory/reports', reportGroupBy],
    queryFn: () => fetch(`/api/inventory/reports?groupBy=${reportGroupBy}`).then(r => r.json()),
    enabled: activeTab === 'reports',
  });

  const { data: projectsData } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: equipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ['/api/equipment'],
    enabled: activeTab === 'assets',
  });

  const stats = statsData?.data || {};
  const stockItems: InventoryItem[] = stockData?.data || [];
  const transactions: InventoryTransaction[] = transactionsData?.data || [];
  const DEFAULT_CATEGORIES = [
    'أسمنت', 'حديد', 'خشب', 'رمل', 'بلوك', 'بحص', 'دهانات', 'أدوات كهربائية',
    'أدوات سباكة', 'مواسير', 'أسلاك', 'مسامير', 'براغي', 'عدد يدوية', 'معدات ثقيلة',
    'مضخات', 'خراطيم', 'مواد عزل', 'بلاط', 'سيراميك', 'زجاج', 'ألمنيوم', 'وقود',
    'زيوت', 'قطع غيار', 'أخرى'
  ];
  const dbCategories: string[] = categoriesData?.data || [];
  const categories: string[] = dbCategories.length > 0
    ? [...new Set([...dbCategories, ...DEFAULT_CATEGORIES])]
    : DEFAULT_CATEGORIES;
  const reports = reportsData?.data || [];
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data || projectsData?.projects || []);
  const equipmentList = Array.isArray(equipmentData) ? equipmentData : (equipmentData?.data || []);

  const filteredStockItems = useMemo(() => {
    if (stockStatusFilter === 'all') return stockItems;
    return stockItems.filter(item => {
      const remaining = parseFloat(item.total_remaining || '0');
      const minQty = parseFloat(item.min_quantity || '0');
      if (stockStatusFilter === 'available') return remaining > minQty;
      if (stockStatusFilter === 'low') return remaining > 0 && remaining <= minQty;
      if (stockStatusFilter === 'out') return remaining <= 0;
      return true;
    });
  }, [stockItems, stockStatusFilter]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 2,
      gap: 'sm',
      items: [
        { key: 'total_items', label: 'إجمالي المواد', value: stats.total_items || 0, icon: Package, color: 'blue' },
        { key: 'items_in_stock', label: 'مواد متوفرة', value: stats.items_in_stock || 0, icon: CheckCircle2, color: 'green' },
      ]
    },
    {
      columns: 2,
      gap: 'sm',
      items: [
        { key: 'stock_value', label: 'قيمة المخزون', value: formatCurrency(parseFloat(stats.total_stock_value || '0')), icon: DollarSign, color: 'amber', unit: 'ر.ي' },
        { key: 'out_of_stock', label: 'نفذت من المخزن', value: stats.out_of_stock_items || 0, icon: AlertTriangle, color: 'red' },
      ]
    }
  ], [stats]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'category',
      label: 'الفئة',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'كل الفئات' },
        ...categories.map(c => ({ value: c, label: c })),
      ],
    },
    {
      key: 'stockStatus',
      label: 'حالة المخزون',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'available', label: 'متوفر', dotColor: 'bg-green-500' },
        { value: 'low', label: 'منخفض', dotColor: 'bg-amber-500' },
        { value: 'out', label: 'نفذ', dotColor: 'bg-red-500' },
      ],
    },
  ], [categories]);

  const filterValues = useMemo(() => ({
    category: categoryFilter,
    stockStatus: stockStatusFilter,
  }), [categoryFilter, stockStatusFilter]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'category') setCategoryFilter(value);
    if (key === 'stockStatus') setStockStatusFilter(value);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStockStatusFilter('all');
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
  }, [queryClient]);

  const handleExportExcel = useCallback(async () => {
    if (filteredStockItems.length === 0) return;
    setIsExportingExcel(true);
    try {
      const { createProfessionalReport } = await import('@/utils/axion-export');

      const totalReceived = filteredStockItems.reduce((s, i) => s + parseFloat(i.total_received || '0'), 0);
      const totalIssued = filteredStockItems.reduce((s, i) => s + parseFloat(i.total_issued || '0'), 0);
      const totalRemaining = filteredStockItems.reduce((s, i) => s + parseFloat(i.total_remaining || '0'), 0);
      const totalValue = filteredStockItems.reduce((s, i) => s + parseFloat(i.stock_value || '0'), 0);

      const success = await createProfessionalReport({
        sheetName: 'تقرير المخزون',
        reportTitle: 'تقرير المخزون - إدارة المعدات والمواد',
        subtitle: `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')}`,
        infoLines: [
          `عدد المواد: ${filteredStockItems.length}`,
          `قيمة المخزون: ${formatCurrency(totalValue)}`,
        ],
        columns: [
          { header: 'م', key: 'num', width: 6 },
          { header: 'المادة', key: 'name', width: 28 },
          { header: 'الفئة', key: 'category', width: 14 },
          { header: 'الوحدة', key: 'unit', width: 10 },
          { header: 'الوارد', key: 'received', width: 14, numFmt: '#,##0.0' },
          { header: 'المنصرف', key: 'issued', width: 14, numFmt: '#,##0.0' },
          { header: 'المتبقي', key: 'remaining', width: 14, numFmt: '#,##0.0' },
          { header: 'القيمة', key: 'value', width: 16, numFmt: '#,##0.00' },
          { header: 'الموردين', key: 'suppliers', width: 10 },
        ],
        data: filteredStockItems.map((item, idx) => ({
          num: idx + 1,
          name: item.name,
          category: item.category || '-',
          unit: item.unit,
          received: parseFloat(item.total_received || '0'),
          issued: parseFloat(item.total_issued || '0'),
          remaining: parseFloat(item.total_remaining || '0'),
          value: parseFloat(item.stock_value || '0'),
          suppliers: parseInt(item.supplier_count || '0'),
        })),
        totals: {
          label: 'الإجمالي',
          values: {
            received: totalReceived,
            issued: totalIssued,
            remaining: totalRemaining,
            value: totalValue,
          },
        },
        cellStyleFn: (record, colKey) => {
          if (colKey === 'remaining' && record.remaining <= 0) return { fontColor: 'FFFF0000', bold: true };
          if (colKey === 'received') return { fontColor: 'FF008000' };
          if (colKey === 'issued') return { fontColor: 'FFFF0000' };
          return null;
        },
        signatures: [
          { title: 'أمين المستودع' },
          { title: 'مدير المشروع' },
          { title: 'المدير العام' },
        ],
        fileName: `تقرير_المخزون_${new Date().toISOString().split('T')[0]}.xlsx`,
        orientation: 'landscape',
      });
      if (success) toast({ title: "تم تصدير Excel بنجاح" });
      else toast({ title: "خطأ في التصدير", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally { setIsExportingExcel(false); }
  }, [filteredStockItems, stats, toast]);

  const handleExportPdf = useCallback(async () => {
    if (filteredStockItems.length === 0) return;
    setIsExportingPdf(true);
    try {
      const success = await generateTablePDF({
        reportTitle: 'تقرير المخزون - إدارة المعدات والمواد',
        subtitle: `عدد المواد: ${filteredStockItems.length} | تاريخ: ${new Date().toLocaleDateString('ar-SA')}`,
        infoItems: [
          { label: 'إجمالي المواد', value: stats.total_items || 0, color: '#3B82F6' },
          { label: 'مواد متوفرة', value: stats.items_in_stock || 0, color: '#10B981' },
          { label: 'قيمة المخزون', value: formatCurrency(parseFloat(stats.total_stock_value || '0')), color: '#F59E0B' },
          { label: 'نفذت', value: stats.out_of_stock_items || 0, color: '#EF4444' },
        ],
        columns: [
          { header: 'م', key: 'num', width: 5 },
          { header: 'المادة', key: 'name', width: 25 },
          { header: 'الفئة', key: 'category', width: 12 },
          { header: 'الوحدة', key: 'unit', width: 8 },
          { header: 'الوارد', key: 'received', width: 10, color: () => '#10B981' },
          { header: 'المنصرف', key: 'issued', width: 10, color: () => '#EF4444' },
          { header: 'المتبقي', key: 'remaining', width: 10, color: (val: any) => parseFloat(val) <= 0 ? '#EF4444' : '#1E293B' },
          { header: 'الموردين', key: 'suppliers', width: 8 },
        ],
        data: filteredStockItems.map((item, idx) => ({
          num: idx + 1,
          name: item.name,
          category: item.category || '-',
          unit: item.unit,
          received: parseFloat(item.total_received || '0').toFixed(1),
          issued: parseFloat(item.total_issued || '0').toFixed(1),
          remaining: parseFloat(item.total_remaining || '0').toFixed(1),
          suppliers: item.supplier_count,
        })),
        filename: `تقرير_المخزون_${new Date().toISOString().split('T')[0]}`,
        orientation: 'landscape',
      });
      if (success) toast({ title: "تم تصدير PDF بنجاح" });
      else toast({ title: "خطأ في التصدير", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally { setIsExportingPdf(false); }
  }, [filteredStockItems, stats, toast]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'export-pdf',
      icon: FileText,
      label: 'PDF',
      onClick: handleExportPdf,
      variant: 'outline',
      loading: isExportingPdf,
      disabled: filteredStockItems.length === 0,
      tooltip: 'تصدير تقرير PDF',
    },
    {
      key: 'export-excel',
      icon: Download,
      label: 'Excel',
      onClick: handleExportExcel,
      variant: 'outline',
      loading: isExportingExcel,
      disabled: filteredStockItems.length === 0,
      tooltip: 'تصدير تقرير Excel',
    },
  ], [handleExportPdf, handleExportExcel, isExportingPdf, isExportingExcel, filteredStockItems.length]);

  const issueMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/inventory/issue', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setShowIssueDialog(false);
      setSelectedItem(null);
      toast({ title: "تم الصرف بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الصرف", description: err.message, variant: "destructive" });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/inventory/receive', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setShowReceiveDialog(false);
      toast({ title: "تم الإضافة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الإضافة", description: err.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (data: { id: number; name: string; category: string; unit: string; min_quantity: string }) =>
      apiRequest(`/api/inventory/items/${data.id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setShowEditItemDialog(false);
      setEditingItem(null);
      toast({ title: "تم تحديث المادة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في التحديث", description: err.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/inventory/items/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setShowDeleteConfirm(false);
      setEditingItem(null);
      toast({ title: "تم حذف المادة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    },
  });

  const handleEditClick = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category || '',
      unit: item.unit,
      min_quantity: item.min_quantity || '0',
    });
    setShowEditItemDialog(true);
  }, []);

  const handleDeleteClick = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setShowDeleteConfirm(true);
  }, []);

  const incomingTx = useMemo(() => transactions.filter(t => t.type === 'IN' || t.type === 'ADJUSTMENT_IN'), [transactions]);
  const outgoingTx = useMemo(() => transactions.filter(t => t.type === 'OUT' || t.type === 'ADJUSTMENT_OUT'), [transactions]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'IN': return 'وارد';
      case 'OUT': return 'صادر';
      case 'ADJUSTMENT_IN': return 'تسوية +';
      case 'ADJUSTMENT_OUT': return 'تسوية -';
      case 'TRANSFER': return 'تحويل';
      default: return type;
    }
  };

  const getTypeBadge = (type: string) => {
    const isIn = type === 'IN' || type === 'ADJUSTMENT_IN';
    return (
      <Badge data-testid={`badge-type-${type}`} className={isIn ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
        {isIn ? <ArrowDownToLine className="w-3 h-3 ml-1" /> : <ArrowUpFromLine className="w-3 h-3 ml-1" />}
        {getTypeLabel(type)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-4" dir="rtl">
      <UnifiedFilterDashboard
        hideHeader={true}
        statsRows={statsRowsConfig}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في المواد..."
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        actions={actionsConfig}
        resultsSummary={{
          totalCount: stockItems.length,
          filteredCount: filteredStockItems.length,
          totalLabel: 'إجمالي المواد',
          filteredLabel: 'معروض',
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full bg-white dark:bg-gray-800 shadow-sm" data-testid="tabs-inventory">
          <TabsTrigger value="stock" className="flex items-center gap-1" data-testid="tab-stock">
            <Box className="w-4 h-4" /> الرصيد
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex items-center gap-1" data-testid="tab-incoming">
            <ArrowDownToLine className="w-4 h-4" /> الوارد
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex items-center gap-1" data-testid="tab-outgoing">
            <ArrowUpFromLine className="w-4 h-4" /> الصرف
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1" data-testid="tab-reports">
            <BarChart3 className="w-4 h-4" /> التقارير
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-1" data-testid="tab-assets">
            <Settings className="w-4 h-4" /> الأصول
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">

          {stockLoading ? (
            <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
          ) : filteredStockItems.length === 0 ? (
            <Card className="py-10 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد مواد في المخزن</p>
              <Button data-testid="button-add-first" onClick={() => setShowReceiveDialog(true)} className="mt-3" variant="outline">إضافة مادة</Button>
            </Card>
          ) : (
            <UnifiedCardGrid columns={1}>
              {filteredStockItems.map(item => {
                const remaining = parseFloat(item.total_remaining || '0');
                const received = parseFloat(item.total_received || '0');
                const percentUsed = received > 0 ? ((received - remaining) / received) * 100 : 0;
                const isLow = remaining <= parseFloat(item.min_quantity || '0') && remaining > 0;
                const isOut = remaining <= 0;

                return (
                  <UnifiedCard
                    key={item.id}
                    data-testid={`card-stock-item-${item.id}`}
                    title={item.name}
                    titleIcon={Package}
                    compact
                    headerColor={isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981'}
                    badges={[
                      ...(item.category ? [{ label: item.category, variant: "outline" as const }] : []),
                      ...(isOut ? [{ label: 'نفذ', variant: "destructive" as const }] : []),
                      ...(isLow && !isOut ? [{ label: 'منخفض', variant: "warning" as const }] : []),
                    ]}
                    fields={[
                      { label: "المتبقي", value: `${remaining.toFixed(1)} ${item.unit}`, emphasis: true, color: isOut ? "danger" as const : isLow ? "warning" as const : "success" as const },
                      { label: "القيمة", value: formatCurrency(parseFloat(item.stock_value || '0')), color: "info" as const, icon: DollarSign },
                      { label: "الوارد", value: parseFloat(item.total_received || '0').toFixed(1), icon: ArrowDownToLine, color: "success" as const },
                      { label: "المنصرف", value: parseFloat(item.total_issued || '0').toFixed(1), icon: ArrowUpFromLine, color: "danger" as const },
                      { label: "الوحدة", value: item.unit, icon: Box },
                      { label: "الموردين", value: item.supplier_count, icon: Truck, color: "info" as const },
                    ]}
                    actions={[
                      { icon: ArrowUpFromLine, label: "صرف", onClick: () => { setSelectedItem(item); setShowIssueDialog(true); }, color: "red" as const, disabled: isOut },
                      { icon: Pencil, label: "تعديل", onClick: () => handleEditClick(item), color: "blue" as const },
                      { icon: Trash2, label: "حذف", onClick: () => handleDeleteClick(item), color: "red" as const },
                    ]}
                    customSection={
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className={`h-2 rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, 100 - percentUsed)}%` }} />
                      </div>
                    }
                  />
                );
              })}
            </UnifiedCardGrid>
          )}
        </TabsContent>

        <TabsContent value="incoming" className="space-y-4">
          <TransactionList transactions={incomingTx} loading={txLoading} getTypeBadge={getTypeBadge} emptyMessage="لا يوجد وارد مسجل" />
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          <TransactionList transactions={outgoingTx} loading={txLoading} getTypeBadge={getTypeBadge} emptyMessage="لا يوجد صرف مسجل" />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-end">
            <Select value={reportGroupBy} onValueChange={setReportGroupBy}>
              <SelectTrigger className="w-[180px]" data-testid="select-report-group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item">حسب المادة</SelectItem>
                <SelectItem value="supplier">حسب المورد</SelectItem>
                <SelectItem value="project">حسب المشروع</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportGroupBy === 'item' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="table-report-items">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-3 text-right text-sm font-semibold">المادة</th>
                    <th className="p-3 text-right text-sm font-semibold">الفئة</th>
                    <th className="p-3 text-right text-sm font-semibold">الوحدة</th>
                    <th className="p-3 text-center text-sm font-semibold">الوارد</th>
                    <th className="p-3 text-center text-sm font-semibold">المنصرف</th>
                    <th className="p-3 text-center text-sm font-semibold">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any, i: number) => (
                    <tr key={r.id || i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 text-gray-500">{r.category || '-'}</td>
                      <td className="p-3 text-gray-500">{r.unit}</td>
                      <td className="p-3 text-center text-green-600 font-semibold">{parseFloat(r.total_in || 0).toFixed(1)}</td>
                      <td className="p-3 text-center text-red-600 font-semibold">{parseFloat(r.total_out || 0).toFixed(1)}</td>
                      <td className="p-3 text-center font-bold">{parseFloat(r.balance || 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportGroupBy === 'supplier' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="table-report-suppliers">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-3 text-right text-sm font-semibold">المورد</th>
                    <th className="p-3 text-center text-sm font-semibold">عدد المواد</th>
                    <th className="p-3 text-center text-sm font-semibold">إجمالي الوارد</th>
                    <th className="p-3 text-center text-sm font-semibold">المنصرف</th>
                    <th className="p-3 text-center text-sm font-semibold">المتبقي</th>
                    <th className="p-3 text-center text-sm font-semibold">القيمة الإجمالية</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any, i: number) => (
                    <tr key={r.supplier_id || i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3 font-medium">{r.supplier_name}</td>
                      <td className="p-3 text-center">{r.item_count}</td>
                      <td className="p-3 text-center text-green-600">{parseFloat(r.total_supplied || 0).toFixed(1)}</td>
                      <td className="p-3 text-center text-red-600">{parseFloat(r.total_issued || 0).toFixed(1)}</td>
                      <td className="p-3 text-center font-bold">{parseFloat(r.total_remaining || 0).toFixed(1)}</td>
                      <td className="p-3 text-center">{formatCurrency(parseFloat(r.total_value || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportGroupBy === 'project' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="table-report-projects">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-3 text-right text-sm font-semibold">المشروع</th>
                    <th className="p-3 text-center text-sm font-semibold">عدد المواد</th>
                    <th className="p-3 text-center text-sm font-semibold">إجمالي المصروف</th>
                    <th className="p-3 text-center text-sm font-semibold">التكلفة الإجمالية</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any, i: number) => (
                    <tr key={r.project_id || i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3 font-medium">{r.project_name}</td>
                      <td className="p-3 text-center">{r.item_count}</td>
                      <td className="p-3 text-center text-red-600">{parseFloat(r.total_issued || 0).toFixed(1)}</td>
                      <td className="p-3 text-center font-bold">{formatCurrency(parseFloat(r.total_cost || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reports.length === 0 && (
            <Card className="py-10 text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد بيانات للتقارير</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          {equipmentLoading ? (
            <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
          ) : equipmentList.length === 0 ? (
            <Card className="py-10 text-center text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد معدات مسجلة</p>
              <Button data-testid="button-add-equipment-empty" onClick={() => setShowAddEquipmentDialog(true)} className="mt-3" variant="outline">إضافة معدة</Button>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {equipmentList.map((eq: any) => (
                <Card key={eq.id} data-testid={`card-equipment-${eq.id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{eq.name}</h3>
                        <p className="text-xs text-gray-500">{eq.code}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{eq.type || 'عام'}</Badge>
                          <Badge className={`text-xs ${eq.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                            {eq.status === 'active' ? 'نشط' : eq.status}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1 text-gray-600">الكمية: {eq.quantity} {eq.unit}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setSelectedEquipment(eq); setShowTransferDialog(true); }}>
                          <Truck className="w-3 h-3 ml-1" /> نقل
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setSelectedEquipment(eq); setShowMovementHistoryDialog(true); }}>
                          <RefreshCw className="w-3 h-3 ml-1" /> سجل
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <IssueDialog 
        open={showIssueDialog} 
        onClose={() => { setShowIssueDialog(false); setSelectedItem(null); }}
        selectedItem={selectedItem}
        stockItems={stockItems}
        projects={projects}
        onSubmit={(data) => issueMutation.mutate(data)}
        isPending={issueMutation.isPending}
      />

      <ReceiveDialog
        open={showReceiveDialog}
        onClose={() => setShowReceiveDialog(false)}
        categories={categories}
        projects={projects}
        onSubmit={(data) => receiveMutation.mutate(data)}
        isPending={receiveMutation.isPending}
      />

      <Dialog open={showEditItemDialog} onOpenChange={(open) => { if (!open) { setShowEditItemDialog(false); setEditingItem(null); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المادة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المادة</Label>
              <Input data-testid="input-edit-name" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>الفئة</Label>
              <Input data-testid="input-edit-category" value={editForm.category} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <Label>الوحدة</Label>
              <Input data-testid="input-edit-unit" value={editForm.unit} onChange={(e) => setEditForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <Label>الحد الأدنى للمخزون</Label>
              <Input data-testid="input-edit-min-qty" type="number" value={editForm.min_quantity} onChange={(e) => setEditForm(f => ({ ...f, min_quantity: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button data-testid="button-cancel-edit" variant="outline" onClick={() => { setShowEditItemDialog(false); setEditingItem(null); }}>إلغاء</Button>
            <Button data-testid="button-save-edit" disabled={updateItemMutation.isPending || !editForm.name || !editForm.unit} onClick={() => {
              if (editingItem) updateItemMutation.mutate({ id: editingItem.id, ...editForm });
            }}>
              {updateItemMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); setEditingItem(null); } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-600">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            هل أنت متأكد من حذف المادة <strong>"{editingItem?.name}"</strong>؟
          </p>
          <p className="text-xs text-gray-500 mt-1">
            لا يمكن حذف المواد التي لها حركات مخزنية (وارد/صادر).
          </p>
          <DialogFooter className="gap-2 mt-4">
            <Button data-testid="button-cancel-delete" variant="outline" onClick={() => { setShowDeleteConfirm(false); setEditingItem(null); }}>إلغاء</Button>
            <Button data-testid="button-confirm-delete" variant="destructive" disabled={deleteItemMutation.isPending} onClick={() => {
              if (editingItem) deleteItemMutation.mutate(editingItem.id);
            }}>
              {deleteItemMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showAddEquipmentDialog && (
        <AddEquipmentDialog
          open={showAddEquipmentDialog}
          onOpenChange={setShowAddEquipmentDialog}
          projects={projects}
        />
      )}

      {showTransferDialog && selectedEquipment && (
        <TransferEquipmentDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          equipment={selectedEquipment}
          projects={projects}
        />
      )}

      {showMovementHistoryDialog && selectedEquipment && (
        <EquipmentMovementHistoryDialog
          open={showMovementHistoryDialog}
          onOpenChange={setShowMovementHistoryDialog}
          equipmentId={selectedEquipment.id}
          equipmentName={selectedEquipment.name}
        />
      )}
    </div>
  );
}

function TransactionList({ transactions, loading, getTypeBadge, emptyMessage }: { transactions: InventoryTransaction[]; loading: boolean; getTypeBadge: (type: string) => JSX.Element; emptyMessage: string }) {
  if (loading) return <div className="text-center py-10 text-gray-500">جاري التحميل...</div>;
  if (transactions.length === 0) return (
    <Card className="py-10 text-center text-gray-500">
      <ArrowDownToLine className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>{emptyMessage}</p>
    </Card>
  );

  return (
    <div className="space-y-2">
      {transactions.map(tx => (
        <Card key={tx.id} data-testid={`card-tx-${tx.id}`} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getTypeBadge(tx.type)}
                <div>
                  <p className="font-medium text-sm">{tx.item_name}</p>
                  <p className="text-xs text-gray-500">
                    {tx.transaction_date}
                    {tx.to_project_name && ` • ${tx.to_project_name}`}
                    {tx.supplier_name && ` • ${tx.supplier_name}`}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">{parseFloat(tx.quantity).toFixed(1)} {tx.item_unit}</p>
                {parseFloat(tx.total_cost || '0') > 0 && (
                  <p className="text-xs text-gray-500">{formatCurrency(parseFloat(tx.total_cost))}</p>
                )}
              </div>
            </div>
            {tx.notes && <p className="text-xs text-gray-400 mt-1 pr-2">{tx.notes}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function IssueDialog({ open, onClose, selectedItem, stockItems, projects, onSubmit, isPending }: {
  open: boolean; onClose: () => void; selectedItem: InventoryItem | null;
  stockItems: InventoryItem[]; projects: any[]; onSubmit: (data: any) => void; isPending: boolean;
}) {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [toProjectId, setToProjectId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const currentItem = selectedItem || stockItems.find(i => String(i.id) === itemId);
  const available = currentItem ? parseFloat(currentItem.total_remaining || '0') : 0;

  const handleSubmit = () => {
    onSubmit({
      itemId: selectedItem?.id || parseInt(itemId),
      quantity: parseFloat(quantity),
      toProjectId,
      transactionDate,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-red-500" />
            صرف مادة من المخزن
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!selectedItem && (
            <div>
              <Label>المادة</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger data-testid="select-issue-item">
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.filter(i => parseFloat(i.total_remaining || '0') > 0).map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name} ({parseFloat(i.total_remaining || '0').toFixed(1)} {i.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedItem && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
              <p className="font-semibold">{selectedItem.name}</p>
              <p className="text-sm text-blue-600">المتاح: {available.toFixed(1)} {selectedItem.unit}</p>
            </div>
          )}
          <div>
            <Label>الكمية</Label>
            <Input data-testid="input-issue-quantity" type="number" step="0.1" min="0.1" max={available} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder={`الحد الأقصى: ${available}`} />
            {parseFloat(quantity) > available && <p className="text-xs text-red-500 mt-1">الكمية أكبر من المتاح!</p>}
          </div>
          <div>
            <Label>المشروع المستلم</Label>
            <Select value={toProjectId} onValueChange={setToProjectId}>
              <SelectTrigger data-testid="select-issue-project">
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>التاريخ</Label>
            <Input data-testid="input-issue-date" type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} />
          </div>
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Textarea data-testid="input-issue-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button 
            data-testid="button-submit-issue"
            onClick={handleSubmit} 
            disabled={isPending || !quantity || !toProjectId || parseFloat(quantity) > available || parseFloat(quantity) <= 0}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? 'جاري الصرف...' : 'تأكيد الصرف'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({ open, onClose, categories, projects, onSubmit, isPending }: {
  open: boolean; onClose: () => void; categories: string[]; projects: any[]; onSubmit: (data: any) => void; isPending: boolean;
}) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({ itemName, category: category || undefined, unit, quantity, unitCost: unitCost || '0', receiptDate, projectId: (projectId && projectId !== 'none') ? projectId : undefined, notes: notes || undefined });
    setItemName(''); setCategory(''); setUnit(''); setQuantity(''); setUnitCost(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-green-500" />
            إضافة مادة للمخزن
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>اسم المادة</Label>
            <Input data-testid="input-receive-name" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="مثال: أسمنت بورتلاندي" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الفئة</Label>
              <Input data-testid="input-receive-category" value={category} onChange={e => setCategory(e.target.value)} placeholder="أسمنت، حديد..." list="categories-list" />
              <datalist id="categories-list">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <Label>الوحدة</Label>
              <Input data-testid="input-receive-unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="كيس، طن، متر..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الكمية</Label>
              <Input data-testid="input-receive-quantity" type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>سعر الوحدة</Label>
              <Input data-testid="input-receive-cost" type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>التاريخ</Label>
            <Input data-testid="input-receive-date" type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
          </div>
          <div>
            <Label>المشروع (اختياري)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger data-testid="select-receive-project">
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون مشروع</SelectItem>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea data-testid="input-receive-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button 
            data-testid="button-submit-receive"
            onClick={handleSubmit}
            disabled={isPending || !itemName || !unit || !quantity || parseFloat(quantity) <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? 'جاري الإضافة...' : 'تأكيد الإضافة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EquipmentManagement;
