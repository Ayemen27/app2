import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, ArrowDownToLine, ArrowUpFromLine, BarChart3, Settings, 
  Search, Plus, Minus, TrendingUp, TrendingDown, Box, Truck, Users,
  Calendar, Filter, Download, AlertTriangle, CheckCircle2, RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

  const [showAddEquipmentDialog, setShowAddEquipmentDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showMovementHistoryDialog, setShowMovementHistoryDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  const categories: string[] = categoriesData?.data || [];
  const reports = reportsData?.data || [];
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data || projectsData?.projects || []);
  const equipmentList = Array.isArray(equipmentData) ? equipmentData : (equipmentData?.data || []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">إدارة المخزن والأصول</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">إدارة شاملة للمواد المخزنية والمعدات والأصول</p>
          </div>
          <div className="flex gap-2">
            <Button data-testid="button-add-to-stock" onClick={() => setShowReceiveDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 ml-1" /> إضافة وارد
            </Button>
            <Button data-testid="button-issue-stock" onClick={() => setShowIssueDialog(true)} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              <Minus className="w-4 h-4 ml-1" /> صرف مادة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">إجمالي المواد</span>
              </div>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1" data-testid="text-total-items">{stats.total_items || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">مواد متوفرة</span>
              </div>
              <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-1" data-testid="text-in-stock">{stats.items_in_stock || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-300">قيمة المخزون</span>
              </div>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-200 mt-1" data-testid="text-stock-value">{formatCurrency(parseFloat(stats.total_stock_value || '0'))}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700 dark:text-red-300">نفذت من المخزن</span>
              </div>
              <p className="text-2xl font-bold text-red-800 dark:text-red-200 mt-1" data-testid="text-out-of-stock">{stats.out_of_stock_items || 0}</p>
            </CardContent>
          </Card>
        </div>

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
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  data-testid="input-search-stock"
                  placeholder="بحث في المواد..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {stockLoading ? (
              <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
            ) : stockItems.length === 0 ? (
              <Card className="py-10 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد مواد في المخزن</p>
                <Button data-testid="button-add-first" onClick={() => setShowReceiveDialog(true)} className="mt-3" variant="outline">إضافة مادة</Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {stockItems.map(item => {
                  const remaining = parseFloat(item.total_remaining || '0');
                  const received = parseFloat(item.total_received || '0');
                  const percentUsed = received > 0 ? ((received - remaining) / received) * 100 : 0;
                  const isLow = remaining <= parseFloat(item.min_quantity || '0') && remaining > 0;
                  const isOut = remaining <= 0;

                  return (
                    <Card key={item.id} data-testid={`card-stock-item-${item.id}`} className={`hover:shadow-md transition-shadow ${isOut ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20' : isLow ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                              {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                              {isOut && <Badge className="bg-red-500 text-white text-xs">نفذ</Badge>}
                              {isLow && !isOut && <Badge className="bg-amber-500 text-white text-xs">منخفض</Badge>}
                            </div>
                            <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <span>الوحدة: {item.unit}</span>
                              <span>الوارد: <strong>{parseFloat(item.total_received || '0').toFixed(1)}</strong></span>
                              <span>المنصرف: <strong>{parseFloat(item.total_issued || '0').toFixed(1)}</strong></span>
                              <span>الموردين: {item.supplier_count}</span>
                            </div>
                            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className={`h-2 rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, 100 - percentUsed)}%` }}></div>
                            </div>
                          </div>
                          <div className="text-left mr-4">
                            <p className={`text-2xl font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`} data-testid={`text-remaining-${item.id}`}>
                              {remaining.toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">{item.unit} متبقي</p>
                            <p className="text-xs text-gray-400 mt-1">{formatCurrency(parseFloat(item.stock_value || '0'))}</p>
                          </div>
                          <div className="flex flex-col gap-1 mr-3">
                            <Button data-testid={`button-issue-${item.id}`} size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => { setSelectedItem(item); setShowIssueDialog(true); }} disabled={isOut}>
                              <ArrowUpFromLine className="w-3 h-3 ml-1" /> صرف
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="incoming" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">سجل الوارد</h2>
              <Button data-testid="button-add-incoming" onClick={() => setShowReceiveDialog(true)} size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 ml-1" /> إضافة وارد
              </Button>
            </div>
            <TransactionList transactions={incomingTx} loading={txLoading} getTypeBadge={getTypeBadge} emptyMessage="لا يوجد وارد مسجل" />
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">سجل الصرف</h2>
              <Button data-testid="button-add-issue" onClick={() => setShowIssueDialog(true)} size="sm" variant="outline" className="border-red-300 text-red-600">
                <Minus className="w-4 h-4 ml-1" /> صرف مادة
              </Button>
            </div>
            <TransactionList transactions={outgoingTx} loading={txLoading} getTypeBadge={getTypeBadge} emptyMessage="لا يوجد صرف مسجل" />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">تقارير المخزن</h2>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">المعدات والأصول</h2>
              <Button data-testid="button-add-equipment" onClick={() => setShowAddEquipmentDialog(true)} size="sm">
                <Plus className="w-4 h-4 ml-1" /> إضافة معدة
              </Button>
            </div>

            {equipmentLoading ? (
              <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
            ) : equipmentList.length === 0 ? (
              <Card className="py-10 text-center text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد معدات مسجلة</p>
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
                            <Badge className={`text-xs ${eq.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
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
      </div>

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
