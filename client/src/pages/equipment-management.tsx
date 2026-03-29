import { ENV } from "@/lib/env";
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
  FileText, Download, Pencil, Trash2, FolderKanban, ToggleLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { useSelectedProject, ALL_PROJECTS_ID } from "@/hooks/use-selected-project";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { generateTablePDF } from '@/utils/pdfGenerator';
import { AddEquipmentDialog } from "@/components/equipment/add-equipment-dialog";
import { TransferEquipmentDialog } from "@/components/equipment/transfer-equipment-dialog";
import { EquipmentMovementHistoryDialog } from "@/components/equipment/equipment-movement-history-dialog";

interface InventoryItem {
  id: number;
  project_name?: string;
  name: string;
  category: string | null;
  unit: string;
  sku: string | null;
  min_quantity: string;
  is_active: boolean;
  total_received: string;
  total_remaining: string;
  total_issued: string;
  total_issued_gross: string;
  total_returned: string;
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
  reference_type: string | null;
  reference_id: string | null;
  item_name: string;
  item_unit: string;
  item_category: string | null;
  from_project_name: string | null;
  to_project_name: string | null;
  supplier_name: string | null;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  projects?: T;
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
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showEditTxDialog, setShowEditTxDialog] = useState(false);
  const [editingTx, setEditingTx] = useState<InventoryTransaction | null>(null);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', unit: '', min_quantity: '', adjustment_quantity: '' });
  const [showEditEquipmentDialog, setShowEditEquipmentDialog] = useState(false);
  const [showDeleteEquipmentConfirm, setShowDeleteEquipmentConfirm] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [editEquipmentForm, setEditEquipmentForm] = useState({ name: '', type: '', unit: '', quantity: '', description: '' });
  const [selectedNewStatus, setSelectedNewStatus] = useState('');
  const [customStatusInput, setCustomStatusInput] = useState('');
  const [isAddingCustomStatus, setIsAddingCustomStatus] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setFloatingAction, setSecondaryAction } = useFloatingButton();
  const { selectedProjectId } = useSelectedProject();
  const projectId = selectedProjectId === ALL_PROJECTS_ID ? '' : selectedProjectId;

  useEffect(() => {
    switch (activeTab) {
      case 'stock':
        setFloatingAction(() => setShowReceiveDialog(true), "إضافة مادة", "green");
        setSecondaryAction(() => setShowIssueDialog(true), "صرف مادة", "destructive");
        break;
      case 'incoming':
        setFloatingAction(() => setShowReceiveDialog(true), "إضافة وارد", "green");
        setSecondaryAction(null);
        break;
      case 'outgoing':
        setFloatingAction(() => setShowIssueDialog(true), "صرف مادة", "red");
        setSecondaryAction(null);
        break;
      case 'returns':
        setFloatingAction(() => setShowReturnDialog(true), "إضافة مرتجع", "cyan");
        setSecondaryAction(null);
        break;
      case 'assets':
        setFloatingAction(() => setShowAddEquipmentDialog(true), "إضافة معدة", "purple");
        setSecondaryAction(null);
        break;
      default:
        setFloatingAction(null);
        setSecondaryAction(null);
        break;
    }
    return () => {
      setFloatingAction(null);
      setSecondaryAction(null);
    };
  }, [activeTab, setFloatingAction, setSecondaryAction]);

  const { data: statsData } = useQuery<ApiResponse<any>>({
    queryKey: ['/api/inventory/stats', projectId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      return fetch(ENV.getApiUrl(`/api/inventory/stats?${params}`)).then(r => r.json());
    },
  });

  const { data: stockData, isLoading: stockLoading } = useQuery<ApiResponse<InventoryItem[]>>({
    queryKey: ['/api/inventory/stock', categoryFilter, searchTerm, projectId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (projectId) params.set('projectId', projectId);
      return fetch(ENV.getApiUrl(`/api/inventory/stock?${params}`)).then(r => r.json());
    },
  });

  const { data: transactionsData, isLoading: txLoading } = useQuery<ApiResponse<InventoryTransaction[]>>({
    queryKey: ['/api/inventory/transactions', txTypeFilter, projectId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (txTypeFilter && txTypeFilter !== 'all') params.set('type', txTypeFilter);
      if (projectId) params.set('projectId', projectId);
      return fetch(ENV.getApiUrl(`/api/inventory/transactions?${params}`)).then(r => r.json());
    },
    enabled: activeTab === 'incoming' || activeTab === 'outgoing' || activeTab === 'returns' || activeTab === 'transactions',
  });

  const { data: categoriesData } = useQuery<ApiResponse<string[]>>({
    queryKey: ['/api/inventory/categories'],
  });

  const { data: reportsData } = useQuery<ApiResponse<any[]>>({
    queryKey: ['/api/inventory/reports', reportGroupBy, projectId],
    queryFn: () => {
      const params = new URLSearchParams({ groupBy: reportGroupBy });
      if (projectId) params.set('projectId', projectId);
      return fetch(ENV.getApiUrl(`/api/inventory/reports?${params}`)).then(r => r.json());
    },
    enabled: activeTab === 'reports',
  });

  const { data: projectsData } = useQuery<any>({
    queryKey: ['/api/projects'],
  });

  const { data: equipmentData, isLoading: equipmentLoading } = useQuery<any>({
    queryKey: ['/api/equipment'],
    enabled: activeTab === 'assets',
  });

  const stats = statsData?.data || {};
  const stockItems: InventoryItem[] = stockData?.data || [];
  const transactions: InventoryTransaction[] = transactionsData?.data || [];
  const categories: string[] = useMemo(() => {
    const apiCats: string[] = categoriesData?.data || [];
    const itemCats = stockItems
      .map(i => i.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set([...apiCats, ...itemCats])].sort();
  }, [categoriesData, stockItems]);
  const reports = reportsData?.data || [];
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data || projectsData?.projects || []);
  const equipmentList = Array.isArray(equipmentData) ? equipmentData : (equipmentData?.data || []);

  const { data: statusesData } = useQuery<{ success: boolean; data: string[] }>({
    queryKey: ['/api/equipment/statuses'],
    queryFn: () => fetch(ENV.getApiUrl('/api/equipment/statuses')).then(r => r.json()),
  });
  const defaultStatusLabels: Record<string, string> = { available: 'متاح', assigned: 'مخصص', maintenance: 'صيانة', lost: 'مفقود', consumed: 'مستهلك', active: 'نشط' };
  const equipmentStatuses: string[] = statusesData?.data || Object.keys(defaultStatusLabels);
  const statusLabel = (s: string) => defaultStatusLabels[s] || s;

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

  const filtersConfig: FilterConfig[] = useMemo(() => {
    const baseFilters: FilterConfig[] = [
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
    ];
    if (activeTab === 'reports') {
      baseFilters.push({
        key: 'reportGroupBy',
        label: 'تجميع حسب',
        type: 'select',
        defaultValue: 'item',
        options: [
          { value: 'item', label: 'حسب المادة' },
          { value: 'supplier', label: 'حسب المورد' },
          { value: 'project', label: 'حسب المشروع' },
        ],
      });
    }
    return baseFilters;
  }, [categories, activeTab]);

  const filterValues = useMemo(() => ({
    category: categoryFilter,
    stockStatus: stockStatusFilter,
    reportGroupBy: reportGroupBy,
  }), [categoryFilter, stockStatusFilter, reportGroupBy]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'category') setCategoryFilter(value);
    if (key === 'stockStatus') setStockStatusFilter(value);
    if (key === 'reportGroupBy') setReportGroupBy(value);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStockStatusFilter('all');
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
  }, [queryClient]);

  const incomingTx = useMemo(() => transactions.filter(t => t.type === 'IN' || t.type === 'ADJUSTMENT_IN'), [transactions]);
  const outgoingTx = useMemo(() => transactions.filter(t => t.type === 'OUT' || t.type === 'ADJUSTMENT_OUT'), [transactions]);
  const returnTx = useMemo(() => transactions.filter(t => t.type === 'RETURN'), [transactions]);

  const tabExportConfig = useMemo(() => {
    const dateStr = new Date().toLocaleDateString('ar-SA');
    const dateFile = new Date().toISOString().split('T')[0];

    const txMapper = (list: InventoryTransaction[]) => list.map((tx, idx) => ({
      num: idx + 1,
      item_name: tx.item_name,
      category: tx.item_category || '-',
      unit: tx.item_unit,
      quantity: parseFloat(tx.quantity).toFixed(1),
      cost: parseFloat(tx.total_cost || '0') > 0 ? formatCurrency(parseFloat(tx.total_cost || '0')) : '-',
      date: typeof tx.transaction_date === 'string' ? tx.transaction_date.split('T')[0] : tx.transaction_date,
      project: tx.to_project_name || '-',
      notes: tx.notes || '-',
    }));

    const txColumns = [
      { header: 'م', key: 'num', width: 5 },
      { header: 'المادة', key: 'item_name', width: 22 },
      { header: 'الفئة', key: 'category', width: 12 },
      { header: 'الوحدة', key: 'unit', width: 8 },
      { header: 'الكمية', key: 'quantity', width: 10 },
      { header: 'التكلفة', key: 'cost', width: 12 },
      { header: 'التاريخ', key: 'date', width: 10 },
      { header: 'المشروع', key: 'project', width: 16 },
      { header: 'ملاحظات', key: 'notes', width: 14 },
    ];

    const txExcelColumns = txColumns.map(c => ({ ...c, ...(c.key === 'quantity' ? { numFmt: '#,##0.0' } : {}) }));

    const configs: Record<string, {
      title: string; pdfTitle: string; sheetName: string; fileName: string;
      headerColor: string; accentColor: string;
      pdfInfoItems: Array<{ label: string; value: string | number; color?: string }>;
      excelInfoLines: string[];
      columns: any[]; excelColumns: any[];
      getData: () => any[];
      totals?: any; excelTotals?: any;
      cellStyleFn?: any; pdfColorFn?: Record<string, (val: any, row: any) => string | undefined>;
    }> = {
      stock: {
        title: 'تقرير رصيد المخزون',
        pdfTitle: 'تقرير رصيد المخزون',
        sheetName: 'رصيد المخزون',
        fileName: `رصيد_المخزون_${dateFile}`,
        headerColor: '#10B981',
        accentColor: '#059669',
        pdfInfoItems: [
          { label: 'إجمالي المواد', value: stats.total_items || 0, color: '#10B981' },
          { label: 'مواد متوفرة', value: stats.items_in_stock || 0, color: '#059669' },
          { label: 'قيمة المخزون', value: formatCurrency(parseFloat(stats.total_stock_value || '0')), color: '#047857' },
          { label: 'نفذت', value: stats.out_of_stock_items || 0, color: '#EF4444' },
        ],
        excelInfoLines: [
          `عدد المواد: ${filteredStockItems.length}`,
          `قيمة المخزون: ${formatCurrency(filteredStockItems.reduce((s, i) => s + parseFloat(i.stock_value || '0'), 0))}`,
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
        excelColumns: [
          { header: 'م', key: 'num', width: 6 },
          { header: 'المادة', key: 'name', width: 28 },
          { header: 'الفئة', key: 'category', width: 14 },
          { header: 'الوحدة', key: 'unit', width: 10 },
          { header: 'الوارد', key: 'received', width: 14, numFmt: '#,##0.0' },
          { header: 'المنصرف', key: 'issued', width: 14, numFmt: '#,##0.0' },
          { header: 'المرتجع', key: 'returned', width: 14, numFmt: '#,##0.0' },
          { header: 'المتبقي', key: 'remaining', width: 14, numFmt: '#,##0.0' },
          { header: 'القيمة', key: 'value', width: 16, numFmt: '#,##0.00' },
          { header: 'الموردين', key: 'suppliers', width: 10 },
          ...(!projectId ? [{ header: 'المشروع', key: 'project_name', width: 22 }] : []),
        ],
        getData: () => filteredStockItems.map((item, idx) => ({
          num: idx + 1,
          name: item.name,
          category: item.category || '-',
          unit: item.unit,
          received: parseFloat(item.total_received || '0'),
          issued: parseFloat(item.total_issued_gross || item.total_issued || '0'),
          returned: parseFloat(item.total_returned || '0'),
          remaining: parseFloat(item.total_remaining || '0'),
          value: parseFloat(item.stock_value || '0'),
          suppliers: parseInt(item.supplier_count || '0'),
          project_name: item.project_name || '-',
        })),
        totals: {
          label: 'الإجمالي',
          values: {
            received: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_received || '0'), 0).toFixed(1),
            issued: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_issued_gross || i.total_issued || '0'), 0).toFixed(1),
            returned: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_returned || '0'), 0).toFixed(1),
            remaining: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_remaining || '0'), 0).toFixed(1),
          },
        },
        excelTotals: {
          label: 'الإجمالي',
          values: {
            received: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_received || '0'), 0),
            issued: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_issued_gross || i.total_issued || '0'), 0),
            returned: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_returned || '0'), 0),
            remaining: filteredStockItems.reduce((s, i) => s + parseFloat(i.total_remaining || '0'), 0),
            value: filteredStockItems.reduce((s, i) => s + parseFloat(i.stock_value || '0'), 0),
          },
        },
        cellStyleFn: (record: any, colKey: string) => {
          if (colKey === 'remaining' && record.remaining <= 0) return { fontColor: 'FFFF0000', bold: true };
          if (colKey === 'received') return { fontColor: 'FF008000' };
          if (colKey === 'issued') return { fontColor: 'FFFF0000' };
          return null;
        },
      },
      incoming: {
        title: 'تقرير حركة الوارد',
        pdfTitle: 'تقرير حركة الوارد',
        sheetName: 'حركة الوارد',
        fileName: `حركة_الوارد_${dateFile}`,
        headerColor: '#10B981',
        accentColor: '#059669',
        pdfInfoItems: [
          { label: 'عدد الحركات', value: incomingTx.length, color: '#10B981' },
          { label: 'إجمالي التكلفة', value: formatCurrency(incomingTx.reduce((s, t) => s + parseFloat(t.total_cost || '0'), 0)), color: '#059669' },
        ],
        excelInfoLines: [`عدد الحركات: ${incomingTx.length}`, `تاريخ: ${dateStr}`],
        columns: txColumns.map(c => c.key === 'quantity' ? { ...c, color: () => '#10B981' } : c),
        excelColumns: txExcelColumns,
        getData: () => txMapper(incomingTx),
        cellStyleFn: (_r: any, colKey: string) => colKey === 'quantity' ? { fontColor: 'FF008000', bold: true } : null,
      },
      outgoing: {
        title: 'تقرير حركة الصرف',
        pdfTitle: 'تقرير حركة الصرف',
        sheetName: 'حركة الصرف',
        fileName: `حركة_الصرف_${dateFile}`,
        headerColor: '#EF4444',
        accentColor: '#DC2626',
        pdfInfoItems: [
          { label: 'عدد الحركات', value: outgoingTx.length, color: '#EF4444' },
          { label: 'إجمالي التكلفة', value: formatCurrency(outgoingTx.reduce((s, t) => s + parseFloat(t.total_cost || '0'), 0)), color: '#DC2626' },
        ],
        excelInfoLines: [`عدد الحركات: ${outgoingTx.length}`, `تاريخ: ${dateStr}`],
        columns: txColumns.map(c => c.key === 'quantity' ? { ...c, color: () => '#EF4444' } : c),
        excelColumns: txExcelColumns,
        getData: () => txMapper(outgoingTx),
        cellStyleFn: (_r: any, colKey: string) => colKey === 'quantity' ? { fontColor: 'FFFF0000', bold: true } : null,
      },
      returns: {
        title: 'تقرير المرتجعات',
        pdfTitle: 'تقرير المرتجعات',
        sheetName: 'المرتجعات',
        fileName: `المرتجعات_${dateFile}`,
        headerColor: '#06B6D4',
        accentColor: '#0891B2',
        pdfInfoItems: [
          { label: 'عدد المرتجعات', value: returnTx.length, color: '#06B6D4' },
          { label: 'إجمالي الكمية', value: returnTx.reduce((s, t) => s + parseFloat(t.quantity), 0).toFixed(1), color: '#0891B2' },
        ],
        excelInfoLines: [`عدد المرتجعات: ${returnTx.length}`, `تاريخ: ${dateStr}`],
        columns: txColumns.map(c => c.key === 'quantity' ? { ...c, color: () => '#06B6D4' } : c),
        excelColumns: txExcelColumns,
        getData: () => txMapper(returnTx),
        cellStyleFn: (_r: any, colKey: string) => colKey === 'quantity' ? { fontColor: 'FF06B6D4', bold: true } : null,
      },
      reports: {
        title: 'تقرير ملخص المخزون',
        pdfTitle: 'التقرير التحليلي للمخزون',
        sheetName: 'ملخص المخزون',
        fileName: `ملخص_المخزون_${dateFile}`,
        headerColor: '#F59E0B',
        accentColor: '#D97706',
        pdfInfoItems: [
          { label: 'عدد التصنيفات', value: reports.length, color: '#F59E0B' },
        ],
        excelInfoLines: [`تصنيف حسب: ${reportGroupBy === 'item' ? 'المادة' : 'الفئة'}`, `تاريخ: ${dateStr}`],
        columns: [
          { header: 'م', key: 'num', width: 5 },
          { header: 'الاسم', key: 'name', width: 25 },
          { header: 'الوارد', key: 'total_in', width: 12, color: () => '#10B981' },
          { header: 'المنصرف', key: 'total_out', width: 12, color: () => '#EF4444' },
          { header: 'المتبقي', key: 'balance', width: 12, color: (val: any) => parseFloat(val) <= 0 ? '#EF4444' : '#1E293B' },
        ],
        excelColumns: [
          { header: 'م', key: 'num', width: 6 },
          { header: 'الاسم', key: 'name', width: 28 },
          { header: 'الوارد', key: 'total_in', width: 16, numFmt: '#,##0.0' },
          { header: 'المنصرف', key: 'total_out', width: 16, numFmt: '#,##0.0' },
          { header: 'المتبقي', key: 'balance', width: 16, numFmt: '#,##0.0' },
        ],
        getData: () => reports.map((r: any, idx: number) => ({
          num: idx + 1,
          name: r.name || r.category || '-',
          total_in: parseFloat(r.total_in || '0'),
          total_out: parseFloat(r.total_out || '0'),
          balance: parseFloat(r.balance || '0'),
        })),
        cellStyleFn: (record: any, colKey: string) => {
          if (colKey === 'balance' && record.balance <= 0) return { fontColor: 'FFFF0000', bold: true };
          if (colKey === 'total_in') return { fontColor: 'FF008000' };
          if (colKey === 'total_out') return { fontColor: 'FFFF0000' };
          return null;
        },
      },
      assets: {
        title: 'تقرير الأصول والمعدات',
        pdfTitle: 'تقرير الأصول والمعدات',
        sheetName: 'الأصول والمعدات',
        fileName: `الأصول_والمعدات_${dateFile}`,
        headerColor: '#8B5CF6',
        accentColor: '#7C3AED',
        pdfInfoItems: [
          { label: 'عدد المعدات', value: equipmentList.length, color: '#8B5CF6' },
        ],
        excelInfoLines: [`عدد المعدات: ${equipmentList.length}`, `تاريخ: ${dateStr}`],
        columns: [
          { header: 'م', key: 'num', width: 5 },
          { header: 'المعدة', key: 'name', width: 22 },
          { header: 'النوع', key: 'type', width: 12 },
          { header: 'الرقم التسلسلي', key: 'serial', width: 14 },
          { header: 'الحالة', key: 'status', width: 10 },
          { header: 'المشروع', key: 'project', width: 16 },
        ],
        excelColumns: [
          { header: 'م', key: 'num', width: 6 },
          { header: 'المعدة', key: 'name', width: 28 },
          { header: 'النوع', key: 'type', width: 16 },
          { header: 'الرقم التسلسلي', key: 'serial', width: 18 },
          { header: 'الحالة', key: 'status', width: 14 },
          { header: 'المشروع', key: 'project', width: 20 },
        ],
        getData: () => equipmentList.map((eq: any, idx: number) => ({
          num: idx + 1,
          name: eq.name || '-',
          type: eq.type || '-',
          serial: eq.serial_number || '-',
          status: eq.status === 'active' ? 'نشط' : eq.status === 'maintenance' ? 'صيانة' : eq.status || '-',
          project: eq.project_name || '-',
        })),
      },
    };
    return configs;
  }, [filteredStockItems, stats, incomingTx, outgoingTx, returnTx, reports, reportGroupBy, equipmentList, projectId]);

  const handleExportExcel = useCallback(async () => {
    const config = tabExportConfig[activeTab];
    if (!config) return;
    const data = config.getData();
    if (data.length === 0) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
    setIsExportingExcel(true);
    try {
      const { createProfessionalReport } = await import('@/utils/axion-export');
      const success = await createProfessionalReport({
        sheetName: config.sheetName,
        reportTitle: config.title,
        subtitle: `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')}`,
        infoLines: config.excelInfoLines,
        columns: config.excelColumns,
        data,
        totals: config.excelTotals,
        cellStyleFn: config.cellStyleFn,
        signatures: [
          { title: 'أمين المستودع' },
          { title: 'مدير المشروع' },
          { title: 'المدير العام' },
        ],
        fileName: `${config.fileName}.xlsx`,
        orientation: 'landscape',
      });
      if (success) toast({ title: "تم تصدير Excel بنجاح" });
      else toast({ title: "خطأ في التصدير", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error), variant: "destructive" });
    } finally { setIsExportingExcel(false); }
  }, [activeTab, tabExportConfig, toast]);

  const handleExportPdf = useCallback(async () => {
    const config = tabExportConfig[activeTab];
    if (!config) return;
    const data = config.getData();
    if (data.length === 0) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
    setIsExportingPdf(true);
    try {
      const success = await generateTablePDF({
        reportTitle: config.pdfTitle,
        subtitle: `تاريخ: ${new Date().toLocaleDateString('ar-SA')}`,
        infoItems: config.pdfInfoItems,
        columns: config.columns,
        data: data.map(row => {
          const mapped: Record<string, any> = {};
          for (const col of config.columns) {
            mapped[col.key] = row[col.key] ?? '-';
            if (typeof mapped[col.key] === 'number') mapped[col.key] = mapped[col.key].toLocaleString();
          }
          return mapped;
        }),
        totals: config.totals,
        filename: config.fileName,
        orientation: 'landscape',
        headerColor: config.headerColor,
        accentColor: config.accentColor,
      });
      if (success) toast({ title: "تم تصدير PDF بنجاح" });
      else toast({ title: "خطأ في التصدير", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error), variant: "destructive" });
    } finally { setIsExportingPdf(false); }
  }, [activeTab, tabExportConfig, toast]);

  const hasExportData = useMemo(() => {
    const config = tabExportConfig[activeTab];
    if (!config) return false;
    return config.getData().length > 0;
  }, [activeTab, tabExportConfig]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'export-pdf',
      icon: FileText,
      label: 'PDF',
      onClick: handleExportPdf,
      variant: 'outline',
      loading: isExportingPdf,
      disabled: !hasExportData,
      tooltip: 'تصدير تقرير PDF',
    },
    {
      key: 'export-excel',
      icon: Download,
      label: 'Excel',
      onClick: handleExportExcel,
      variant: 'outline',
      loading: isExportingExcel,
      disabled: !hasExportData,
      tooltip: 'تصدير تقرير Excel',
    },
  ], [handleExportPdf, handleExportExcel, isExportingPdf, isExportingExcel, hasExportData]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.startsWith('/api/inventory');
    }});
  }, [queryClient]);

  const issueMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/inventory/issue', 'POST', data),
    onSuccess: () => {
      invalidateAll();
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
      invalidateAll();
      setShowReceiveDialog(false);
      toast({ title: "تم الإضافة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الإضافة", description: err.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (data: { id: number; name: string; category: string; unit: string; min_quantity: string; adjustment_quantity?: string }) =>
      apiRequest(`/api/inventory/items/${data.id}`, 'PUT', data),
    onSuccess: () => {
      invalidateAll();
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
      invalidateAll();
      setShowDeleteConfirm(false);
      setEditingItem(null);
      toast({ title: "تم حذف المادة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/inventory/transactions/${id}`, 'DELETE'),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "تم حذف المعاملة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    },
  });

  const updateTxMutation = useMutation({
    mutationFn: (data: { id: number; quantity: number; notes: string; transactionDate: string }) =>
      apiRequest(`/api/inventory/transactions/${data.id}`, 'PATCH', data),
    onSuccess: () => {
      invalidateAll();
      setShowEditTxDialog(false);
      setEditingTx(null);
      toast({ title: "تم تعديل المعاملة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في التعديل", description: err.message, variant: "destructive" });
    },
  });

  const returnMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/inventory/return', 'POST', data),
    onSuccess: () => {
      invalidateAll();
      setShowReturnDialog(false);
      toast({ title: "تم إرجاع المادة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الإرجاع", description: err.message, variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: (data: { id: number; [key: string]: any }) => {
      const { id, ...body } = data;
      return apiRequest(`/api/equipment/${id}`, 'PUT', body);
    },
    onSuccess: () => {
      invalidateAll();
      setShowEditEquipmentDialog(false);
      setShowStatusDialog(false);
      setSelectedEquipment(null);
      toast({ title: "تم تحديث المعدة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في التحديث", description: toUserMessage(err), variant: "destructive" });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/equipment/${id}`, 'DELETE'),
    onSuccess: () => {
      invalidateAll();
      setShowDeleteEquipmentConfirm(false);
      setSelectedEquipment(null);
      toast({ title: "تم حذف المعدة بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الحذف", description: toUserMessage(err), variant: "destructive" });
    },
  });

  const handleEditEquipmentClick = useCallback((eq: any) => {
    setSelectedEquipment(eq);
    setEditEquipmentForm({
      name: eq.name || '',
      type: eq.type || '',
      unit: eq.unit || '',
      quantity: String(eq.quantity || 1),
      description: eq.description || '',
    });
    setShowEditEquipmentDialog(true);
  }, []);

  const handleDeleteEquipmentClick = useCallback((eq: any) => {
    setSelectedEquipment(eq);
    setShowDeleteEquipmentConfirm(true);
  }, []);

  const handleStatusClick = useCallback((eq: any) => {
    setSelectedEquipment(eq);
    setSelectedNewStatus(eq.status || 'available');
    setShowStatusDialog(true);
  }, []);

  const handleEditClick = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category || '',
      unit: item.unit,
      min_quantity: item.min_quantity || '0',
      adjustment_quantity: parseFloat(item.total_remaining || '0').toString(),
    });
    setShowEditItemDialog(true);
  }, []);

  const handleDeleteClick = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setShowDeleteConfirm(true);
  }, []);

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
        <TabsList className="grid grid-cols-6 w-full bg-white dark:bg-gray-800 shadow-sm" data-testid="tabs-inventory">
          <TabsTrigger value="stock" className="flex items-center gap-1 text-xs" data-testid="tab-stock">
            <Box className="w-4 h-4" /> الرصيد
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex items-center gap-1 text-xs" data-testid="tab-incoming">
            <ArrowDownToLine className="w-4 h-4" /> الوارد
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex items-center gap-1 text-xs" data-testid="tab-outgoing">
            <ArrowUpFromLine className="w-4 h-4" /> الصرف
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-1 text-xs" data-testid="tab-returns">
            <RefreshCw className="w-4 h-4" /> المرتجع
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1 text-xs" data-testid="tab-reports">
            <BarChart3 className="w-4 h-4" /> التقارير
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-1 text-xs" data-testid="tab-assets">
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
              <p className="text-sm mt-2">استخدم الزر العائم لإضافة مادة جديدة</p>
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
                      ...(!projectId && item.project_name ? [{ label: "المشروع", value: item.project_name, icon: FolderKanban, color: "info" as const }] : []),
                      { label: "المتبقي", value: `${remaining.toFixed(1)} ${item.unit}`, emphasis: true, color: isOut ? "danger" as const : isLow ? "warning" as const : "success" as const },
                      { label: "القيمة", value: formatCurrency(parseFloat(item.stock_value || '0')), color: "info" as const, icon: DollarSign },
                      { label: "الوارد", value: parseFloat(item.total_received || '0').toFixed(1), icon: ArrowDownToLine, color: "success" as const },
                      { label: "المنصرف", value: parseFloat(item.total_issued_gross || item.total_issued || '0').toFixed(1), icon: ArrowUpFromLine, color: "danger" as const },
                      ...(parseFloat(item.total_returned || '0') > 0 ? [{ label: "المرتجع", value: parseFloat(item.total_returned || '0').toFixed(1), icon: RefreshCw, color: "info" as const }] : []),
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
          <TransactionList transactions={incomingTx} loading={txLoading} emptyMessage="لا يوجد وارد مسجل" onDelete={(id) => deleteTxMutation.mutate(id)} deletingId={deleteTxMutation.isPending ? (deleteTxMutation.variables as number) : undefined} onEdit={(tx) => { setEditingTx(tx); setShowEditTxDialog(true); }} />
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          <TransactionList transactions={outgoingTx} loading={txLoading} emptyMessage="لا يوجد صرف مسجل" onDelete={(id) => deleteTxMutation.mutate(id)} deletingId={deleteTxMutation.isPending ? (deleteTxMutation.variables as number) : undefined} onEdit={(tx) => { setEditingTx(tx); setShowEditTxDialog(true); }} />
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <TransactionList transactions={returnTx} loading={txLoading} emptyMessage="لا يوجد مرتجع مسجل" onDelete={(id) => deleteTxMutation.mutate(id)} deletingId={deleteTxMutation.isPending ? (deleteTxMutation.variables as number) : undefined} onEdit={(tx) => { setEditingTx(tx); setShowEditTxDialog(true); }} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
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
              <p className="text-sm mt-2">استخدم الزر العائم لإضافة معدة جديدة</p>
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
                          <Badge variant="outline" className="text-xs">{{ heavy_machinery: 'معدات ثقيلة', light_tool: 'أدوات خفيفة', vehicle: 'مركبات', electrical: 'كهربائية', plumbing: 'سباكة', safety: 'سلامة', measuring: 'قياس', hand_tool: 'أدوات يدوية', power_tool: 'أدوات كهربائية', other: 'أخرى' }[eq.type] || eq.type || 'عام'}</Badge>
                          <Badge className={`text-xs ${eq.status === 'available' ? 'bg-emerald-100 text-emerald-800' : eq.status === 'assigned' ? 'bg-blue-100 text-blue-800' : eq.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : eq.status === 'lost' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {statusLabel(eq.status)}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1 text-gray-600">الكمية: {eq.quantity} {eq.unit}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="ghost" className="text-xs" data-testid={`btn-transfer-eq-${eq.id}`} onClick={() => { setSelectedEquipment(eq); setShowTransferDialog(true); }}>
                          <Truck className="w-3 h-3 ml-1" /> نقل
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs" data-testid={`btn-history-eq-${eq.id}`} onClick={() => { setSelectedEquipment(eq); setShowMovementHistoryDialog(true); }}>
                          <RefreshCw className="w-3 h-3 ml-1" /> سجل
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-blue-600" data-testid={`btn-edit-eq-${eq.id}`} onClick={() => handleEditEquipmentClick(eq)}>
                          <Pencil className="w-3 h-3 ml-1" /> تعديل
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-amber-600" data-testid={`btn-status-eq-${eq.id}`} onClick={() => handleStatusClick(eq)}>
                          <ToggleLeft className="w-3 h-3 ml-1" /> الحالة
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-red-600" data-testid={`btn-delete-eq-${eq.id}`} onClick={() => handleDeleteEquipmentClick(eq)}>
                          <Trash2 className="w-3 h-3 ml-1" /> حذف
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
              <Input data-testid="input-edit-category" value={editForm.category} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))} list="edit-categories-list" />
              <datalist id="edit-categories-list">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <Label>الوحدة</Label>
              <Input data-testid="input-edit-unit" value={editForm.unit} onChange={(e) => setEditForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <Label>الكمية الحالية ({editingItem?.unit || 'وحدة'})</Label>
              <Input data-testid="input-edit-quantity" type="number" step="0.001" value={editForm.adjustment_quantity} onChange={(e) => setEditForm(f => ({ ...f, adjustment_quantity: e.target.value }))} />
              {editingItem && parseFloat(editForm.adjustment_quantity || '0') !== parseFloat(editingItem.total_remaining || '0') && (
                <p className="text-xs text-amber-600 mt-1">
                  سيتم إنشاء تسوية مخزنية: الكمية الحالية {parseFloat(editingItem.total_remaining || '0').toFixed(1)} → {parseFloat(editForm.adjustment_quantity || '0').toFixed(1)}
                </p>
              )}
            </div>
            <div>
              <Label>الحد الأدنى للمخزون</Label>
              <Input data-testid="input-edit-min-qty" type="number" value={editForm.min_quantity} onChange={(e) => setEditForm(f => ({ ...f, min_quantity: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button data-testid="button-cancel-edit" variant="outline" onClick={() => { setShowEditItemDialog(false); setEditingItem(null); }}>إلغاء</Button>
            <Button data-testid="button-save-edit" disabled={updateItemMutation.isPending || !editForm.name || !editForm.category.trim() || !editForm.unit} onClick={() => {
              if (editingItem) {
                const hasQuantityChange = parseFloat(editForm.adjustment_quantity || '0') !== parseFloat(editingItem.total_remaining || '0');
                updateItemMutation.mutate({
                  id: editingItem.id,
                  name: editForm.name,
                  category: editForm.category,
                  unit: editForm.unit,
                  min_quantity: editForm.min_quantity,
                  ...(hasQuantityChange ? { adjustment_quantity: editForm.adjustment_quantity } : {}),
                });
              }
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
          equipment={selectedEquipment}
          projects={projects}
        />
      )}

      <ReturnDialog
        open={showReturnDialog}
        onClose={() => setShowReturnDialog(false)}
        stockItems={stockItems}
        projects={projects}
        onSubmit={(data) => returnMutation.mutate(data)}
        isPending={returnMutation.isPending}
      />

      <EditTransactionDialog
        open={showEditTxDialog}
        onClose={() => { setShowEditTxDialog(false); setEditingTx(null); }}
        transaction={editingTx}
        onSubmit={(data) => updateTxMutation.mutate(data)}
        isPending={updateTxMutation.isPending}
      />

      <Dialog open={showEditEquipmentDialog} onOpenChange={(open) => { if (!open) { setShowEditEquipmentDialog(false); setSelectedEquipment(null); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المعدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المعدة</Label>
              <Input data-testid="input-edit-eq-name" value={editEquipmentForm.name} onChange={(e) => setEditEquipmentForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={editEquipmentForm.type} onValueChange={(v) => setEditEquipmentForm(f => ({ ...f, type: v }))}>
                <SelectTrigger data-testid="select-edit-eq-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="heavy_machinery">معدات ثقيلة</SelectItem>
                  <SelectItem value="light_tool">أدوات خفيفة</SelectItem>
                  <SelectItem value="vehicle">مركبات</SelectItem>
                  <SelectItem value="electrical">كهربائية</SelectItem>
                  <SelectItem value="plumbing">سباكة</SelectItem>
                  <SelectItem value="safety">سلامة</SelectItem>
                  <SelectItem value="measuring">قياس</SelectItem>
                  <SelectItem value="hand_tool">أدوات يدوية</SelectItem>
                  <SelectItem value="power_tool">أدوات كهربائية</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الوحدة</Label>
              <Input data-testid="input-edit-eq-unit" value={editEquipmentForm.unit} onChange={(e) => setEditEquipmentForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <Label>الكمية</Label>
              <Input data-testid="input-edit-eq-quantity" type="number" min="1" value={editEquipmentForm.quantity} onChange={(e) => setEditEquipmentForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea data-testid="input-edit-eq-desc" value={editEquipmentForm.description} onChange={(e) => setEditEquipmentForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowEditEquipmentDialog(false); setSelectedEquipment(null); }}>إلغاء</Button>
            <Button data-testid="button-save-edit-eq" disabled={updateEquipmentMutation.isPending || !editEquipmentForm.name.trim()} onClick={() => {
              if (selectedEquipment) {
                updateEquipmentMutation.mutate({
                  id: selectedEquipment.id,
                  name: editEquipmentForm.name,
                  type: editEquipmentForm.type,
                  unit: editEquipmentForm.unit,
                  quantity: parseInt(editEquipmentForm.quantity) || 1,
                  description: editEquipmentForm.description,
                });
              }
            }}>
              {updateEquipmentMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusDialog} onOpenChange={(open) => { if (!open) { setShowStatusDialog(false); setSelectedEquipment(null); setIsAddingCustomStatus(false); setCustomStatusInput(''); } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير حالة المعدة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-3">{selectedEquipment?.name}</p>
          <div className="space-y-3">
            <Select value={selectedNewStatus} onValueChange={(v) => { setSelectedNewStatus(v); setIsAddingCustomStatus(false); }}>
              <SelectTrigger data-testid="select-eq-status"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
              <SelectContent>
                {equipmentStatuses.map(s => (
                  <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isAddingCustomStatus ? (
              <Button variant="outline" size="sm" className="w-full text-xs" data-testid="btn-add-custom-status" onClick={() => setIsAddingCustomStatus(true)}>
                + إضافة حالة مخصصة
              </Button>
            ) : (
              <div className="flex gap-2 items-center">
                <Input
                  data-testid="input-custom-status"
                  placeholder="اكتب اسم الحالة الجديدة..."
                  value={customStatusInput}
                  onChange={(e) => setCustomStatusInput(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" disabled={!customStatusInput.trim()} data-testid="btn-confirm-custom-status" onClick={() => {
                  const trimmed = customStatusInput.trim();
                  if (trimmed) {
                    setSelectedNewStatus(trimmed);
                    setCustomStatusInput('');
                    setIsAddingCustomStatus(false);
                  }
                }}>
                  تأكيد
                </Button>
              </div>
            )}
            {selectedNewStatus && !equipmentStatuses.includes(selectedNewStatus) && (
              <p className="text-xs text-blue-600">حالة مخصصة: <strong>{selectedNewStatus}</strong></p>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowStatusDialog(false); setSelectedEquipment(null); setIsAddingCustomStatus(false); setCustomStatusInput(''); }}>إلغاء</Button>
            <Button data-testid="button-save-status-eq" disabled={updateEquipmentMutation.isPending || !selectedNewStatus || selectedNewStatus === selectedEquipment?.status} onClick={() => {
              if (selectedEquipment) {
                updateEquipmentMutation.mutate({ id: selectedEquipment.id, status: selectedNewStatus });
                queryClient.invalidateQueries({ queryKey: ['/api/equipment/statuses'] });
              }
            }}>
              {updateEquipmentMutation.isPending ? 'جاري التحديث...' : 'تحديث الحالة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteEquipmentConfirm} onOpenChange={(open) => { if (!open) { setShowDeleteEquipmentConfirm(false); setSelectedEquipment(null); } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-600">تأكيد حذف المعدة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            هل أنت متأكد من حذف المعدة <strong>"{selectedEquipment?.name}"</strong>؟
          </p>
          <p className="text-xs text-amber-600 mt-1">هذا الإجراء لا يمكن التراجع عنه.</p>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowDeleteEquipmentConfirm(false); setSelectedEquipment(null); }}>إلغاء</Button>
            <Button data-testid="button-confirm-delete-eq" variant="destructive" disabled={deleteEquipmentMutation.isPending} onClick={() => {
              if (selectedEquipment) deleteEquipmentMutation.mutate(selectedEquipment.id);
            }}>
              {deleteEquipmentMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionList({ transactions, loading, emptyMessage, onDelete, deletingId, onEdit }: { 
  transactions: InventoryTransaction[]; loading: boolean; emptyMessage: string;
  onDelete?: (id: number) => void; deletingId?: number;
  onEdit?: (tx: InventoryTransaction) => void;
}) {
  if (loading) return <div className="text-center py-10 text-gray-500">جاري التحميل...</div>;
  if (transactions.length === 0) return (
    <Card className="py-10 text-center text-gray-500">
      <ArrowDownToLine className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>{emptyMessage}</p>
    </Card>
  );

  const getTypeInfo = (type: string): { label: string; color: string; badgeVariant: "default" | "destructive" | "outline" | "secondary" } => {
    switch (type) {
      case 'IN': return { label: 'وارد', color: '#10b981', badgeVariant: 'default' };
      case 'OUT': return { label: 'صادر', color: '#ef4444', badgeVariant: 'destructive' };
      case 'ADJUSTMENT_IN': return { label: 'تسوية +', color: '#3b82f6', badgeVariant: 'default' };
      case 'ADJUSTMENT_OUT': return { label: 'تسوية -', color: '#f59e0b', badgeVariant: 'secondary' };
      case 'RETURN': return { label: 'مرتجع', color: '#06b6d4', badgeVariant: 'default' };
      case 'TRANSFER': return { label: 'تحويل', color: '#8b5cf6', badgeVariant: 'outline' };
      default: return { label: type, color: '#6b7280', badgeVariant: 'outline' };
    }
  };

  return (
    <UnifiedCardGrid columns={1}>
      {transactions.map(tx => {
        const typeInfo = getTypeInfo(tx.type);
        const isIn = tx.type === 'IN' || tx.type === 'ADJUSTMENT_IN' || tx.type === 'RETURN';
        const isPurchaseLinked = tx.reference_type === 'purchase';
        const cost = parseFloat(tx.total_cost || '0');

        return (
          <UnifiedCard
            key={tx.id}
            data-testid={`card-tx-${tx.id}`}
            title={tx.item_name}
            titleIcon={isIn ? ArrowDownToLine : ArrowUpFromLine}
            compact
            headerColor={typeInfo.color}
            badges={[
              { label: typeInfo.label, variant: typeInfo.badgeVariant },
              ...(tx.item_category ? [{ label: tx.item_category, variant: "outline" as const }] : []),
              ...(isPurchaseLinked ? [{ label: 'من مشتراة', variant: "secondary" as const }] : []),
            ]}
            fields={[
              { label: "الكمية", value: `${parseFloat(tx.quantity).toFixed(1)} ${tx.item_unit}`, emphasis: true, color: isIn ? "success" as const : "danger" as const },
              ...(cost > 0 ? [{ label: "القيمة", value: formatCurrency(cost), icon: DollarSign, color: "info" as const }] : []),
              { label: "التاريخ", value: typeof tx.transaction_date === 'string' ? tx.transaction_date.split('T')[0] : tx.transaction_date },
              ...(tx.to_project_name ? [{ label: "المشروع", value: tx.to_project_name, icon: FolderKanban, color: "info" as const }] : []),
              ...(tx.from_project_name && tx.from_project_name !== tx.to_project_name ? [{ label: "من مشروع", value: tx.from_project_name, icon: FolderKanban }] : []),
              ...(tx.supplier_name ? [{ label: "المورد", value: tx.supplier_name, icon: Truck }] : []),
              ...(tx.notes ? [{ label: "ملاحظات", value: tx.notes }] : []),
            ]}
            actions={[
              ...(!isPurchaseLinked && onEdit ? [{
                icon: Pencil,
                label: "تعديل",
                onClick: () => onEdit(tx),
                color: "blue" as const,
              }] : []),
              ...(!isPurchaseLinked && onDelete ? [{
                icon: Trash2,
                label: "حذف",
                onClick: () => onDelete(tx.id),
                color: "red" as const,
                disabled: deletingId === tx.id,
              }] : []),
            ]}
          />
        );
      })}
    </UnifiedCardGrid>
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
    if (!category.trim()) {
      return;
    }
    onSubmit({ itemName, category: category.trim(), unit, quantity, unitCost: unitCost || '0', receiptDate, projectId: (projectId && projectId !== 'none') ? projectId : undefined, notes: notes || undefined });
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
              <Input data-testid="input-receive-cost" type="number" step="1" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
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

function ReturnDialog({ open, onClose, stockItems, projects, onSubmit, isPending }: {
  open: boolean; onClose: () => void;
  stockItems: InventoryItem[]; projects: any[]; onSubmit: (data: any) => void; isPending: boolean;
}) {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fromProjectId, setFromProjectId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const selectedItem = stockItems.find(i => String(i.id) === itemId);

  const handleSubmit = () => {
    if (!itemId || !quantity || !fromProjectId) return;
    onSubmit({ itemId, quantity, fromProjectId, transactionDate, notes: notes || undefined });
    setItemId(''); setQuantity(''); setFromProjectId(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            إرجاع مادة للمخزن
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>المادة</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger data-testid="select-return-item">
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {stockItems.map(item => (
                  <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <p className="text-xs text-gray-500 mt-1">المنصرف: {parseFloat(selectedItem.total_issued_gross || selectedItem.total_issued || '0').toFixed(1)} {selectedItem.unit}</p>
            )}
          </div>
          <div>
            <Label>المشروع المرتجع منه</Label>
            <Select value={fromProjectId} onValueChange={setFromProjectId}>
              <SelectTrigger data-testid="select-return-project">
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الكمية المرتجعة</Label>
              <Input data-testid="input-return-quantity" type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input data-testid="input-return-date" type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea data-testid="input-return-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="سبب الإرجاع..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button
            data-testid="button-submit-return"
            onClick={handleSubmit}
            disabled={isPending || !itemId || !quantity || !fromProjectId || parseFloat(quantity) <= 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending ? 'جاري الإرجاع...' : 'تأكيد الإرجاع'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTransactionDialog({ open, onClose, transaction, onSubmit, isPending }: {
  open: boolean; onClose: () => void;
  transaction: InventoryTransaction | null;
  onSubmit: (data: { id: number; quantity: number; notes: string; transactionDate: string }) => void;
  isPending: boolean;
}) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState('');

  useEffect(() => {
    if (transaction) {
      setQuantity(String(parseFloat(transaction.quantity)));
      setNotes(transaction.notes || '');
      const dateStr = typeof transaction.transaction_date === 'string' ? transaction.transaction_date.split('T')[0] : '';
      setTransactionDate(dateStr);
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSubmit = () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    onSubmit({
      id: transaction.id,
      quantity: parseFloat(quantity),
      notes,
      transactionDate,
    });
  };

  const typeLabels: Record<string, string> = {
    'IN': 'وارد', 'OUT': 'صادر', 'RETURN': 'مرتجع',
    'ADJUSTMENT_IN': 'تسوية +', 'ADJUSTMENT_OUT': 'تسوية -', 'TRANSFER': 'تحويل',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-500" />
            تعديل معاملة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500">المادة:</span> <span className="font-medium">{transaction.item_name}</span></p>
            <p><span className="text-gray-500">النوع:</span> <span className="font-medium">{typeLabels[transaction.type] || transaction.type}</span></p>
            {transaction.to_project_name && (
              <p><span className="text-gray-500">المشروع:</span> <span className="font-medium">{transaction.to_project_name}</span></p>
            )}
          </div>
          <div>
            <Label>الكمية</Label>
            <Input
              data-testid="input-edit-tx-quantity"
              type="number"
              step="0.1"
              min="0.1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label>التاريخ</Label>
            <Input
              data-testid="input-edit-tx-date"
              type="date"
              value={transactionDate}
              onChange={e => setTransactionDate(e.target.value)}
            />
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Input
              data-testid="input-edit-tx-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات (اختياري)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            data-testid="btn-save-edit-tx"
            onClick={handleSubmit}
            disabled={isPending || !quantity || parseFloat(quantity) <= 0}
            className="w-full"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EquipmentManagement;
