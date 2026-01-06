import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  Truck, Save, Plus, Edit, Trash2, 
  DollarSign, TrendingUp, RefreshCw, ChevronUp,
  FileSpreadsheet, Filter, XCircle, Calendar, Hash,
  MapPin, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { getCurrentDate, formatDate, formatCurrency } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { WellSelector } from "@/components/well-selector";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TransportationExpense, Worker } from "@shared/schema";
import * as XLSX from 'xlsx';

export default function TransportManagement() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, isAllProjects, getProjectIdForApi } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ 
    dateRange: undefined,
    specificDate: getCurrentDate()
  });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form states
  const [workerId, setWorkerId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(getCurrentDate());
  const [notes, setNotes] = useState<string>("");
  const [category, setCategory] = useState<string>("worker_transport");
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // Reset form logic
  const resetForm = useCallback(() => {
    setWorkerId("");
    setAmount("");
    setDescription("");
    setDate(getCurrentDate());
    setNotes("");
    setCategory("worker_transport");
    setSelectedWellId(undefined);
    setEditingExpenseId(null);
    setIsDialogOpen(false);
  }, []);

  // Unified Floating Button
  useEffect(() => {
    setFloatingAction(() => {
      setIsDialogOpen(true);
      setEditingExpenseId(null);
    }, "إضافة سجل نقل");
    
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const { data: expensesResponse, isLoading, refetch } = useQuery<{ success: boolean; data: TransportationExpense[] }>({
    queryKey: ["/api/projects", selectedProjectId, "transportation", filterValues.specificDate, filterValues.dateRange],
    queryFn: async () => {
      let url = isAllProjects 
        ? `/api/transportation-expenses` 
        : `/api/projects/${getProjectIdForApi()}/transportation-expenses`;
      
      const params = new URLSearchParams();
      if (filterValues.specificDate) {
        params.append("date", filterValues.specificDate);
      }
      if (filterValues.dateRange?.from) {
        params.append("dateFrom", formatDate(filterValues.dateRange.from));
      }
      if (filterValues.dateRange?.to) {
        params.append("dateTo", formatDate(filterValues.dateRange.to));
      }
      
      const queryString = params.toString();
      const response = await apiRequest(`${url}${queryString ? `?${queryString}` : ''}`, "GET");
      return response;
    },
    enabled: !!selectedProjectId || isAllProjects
  });

  const expenses = useMemo(() => expensesResponse?.data || [], [expensesResponse]);

  const statsData = useMemo(() => {
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = expenses.length;
    return [
      {
        title: "إجمالي تكلفة النقل",
        value: formatCurrency(totalAmount),
        icon: DollarSign,
        color: "blue" as const,
      },
      {
        title: "عدد الرحلات",
        value: count,
        icon: Truck,
        color: "green" as const,
      },
      {
        title: "متوسط تكلفة الرحلة",
        value: formatCurrency(count > 0 ? totalAmount / count : 0),
        icon: TrendingUp,
        color: "amber" as const,
      }
    ];
  }, [expenses]);

  const handleExportToExcel = () => {
    try {
      const dataToExport = expenses.map(expense => ({
        "التاريخ": expense.date,
        "البيان": expense.description,
        "المبلغ": Number(expense.amount),
        "العامل": workers.find(w => w.id === expense.workerId)?.name || "مصروف عام",
        "رقم البئر": expense.wellId || "N/A",
        "ملاحظات": expense.notes || ""
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transportation");
      XLSX.writeFile(wb, `Transportation_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast({ title: "تم التصدير بنجاح", description: "تم تحميل ملف إكسل بنجاح" });
    } catch (error) {
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setSearchValue("");
    setFilterValues({
      dateRange: undefined,
      specificDate: getCurrentDate()
    });
    toast({ title: "تمت إعادة التعيين", description: "تم مسح جميع الفلاتر" });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({ title: "تم التحديث", description: "تم تحديث البيانات بنجاح" });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingExpenseId) {
        return apiRequest(`/api/transportation-expenses/${editingExpenseId}`, "PATCH", data);
      }
      return apiRequest("/api/transportation-expenses", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-expenses"] });
      toast({ title: editingExpenseId ? "تم التعديل بنجاح" : "تم الحفظ بنجاح" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ في الحفظ", 
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/transportation-expenses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transportation-expenses"] });
      toast({ title: "تم الحذف بنجاح" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول الأساسية", variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      projectId: selectedProjectId,
      workerId: workerId || null,
      amount: amount,
      description: description,
      date: date,
      category: category,
      notes: notes,
      wellId: selectedWellId
    });
  };

  const handleEdit = (expense: TransportationExpense) => {
    setEditingExpenseId(expense.id);
    setWorkerId(expense.workerId || "");
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setDate(expense.date);
    setNotes(expense.notes || "");
    setCategory(expense.category || "worker_transport");
    setSelectedWellId(expense.wellId || undefined);
    setIsDialogOpen(true);
  };

  const filters: FilterConfig[] = [
    {
      key: "specificDate",
      type: "date",
      label: "تاريخ محدد",
      placeholder: "اختر التاريخ"
    },
    {
      key: "dateRange",
      type: "date-range",
      label: "فترة زمنية"
    }
  ];

  const actions: ActionButton[] = [
    {
      key: "export",
      icon: FileSpreadsheet,
      label: "تصدير إكسل",
      onClick: handleExportToExcel,
      variant: "outline",
      tooltip: "تحميل التقرير بصيغة إكسل"
    }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-7xl mx-auto w-full p-4 space-y-6">
          
          <UnifiedStats
            title="ملخص حركة النقل"
            stats={statsData}
            columns={3}
          />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
              <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-primary">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>
                  {editingExpenseId ? "تعديل سجل النقل" : "إضافة سجل نقل جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Edit className="h-3 w-3" /> البيان / الوصف
                      </Label>
                      <AutocompleteInput
                        category="transport_desc"
                        value={description}
                        onChange={setDescription}
                        placeholder="مثلاً: نقل عمال، توريد مياه..."
                        className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" /> المبلغ
                      </Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={amount} 
                          onChange={(e) => setAmount(e.target.value)} 
                          placeholder="0.00"
                          className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 pl-8 focus:ring-primary/20"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">RY</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> التاريخ
                      </Label>
                      <Input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Filter className="h-3 w-3" /> الفئة
                      </Label>
                      <Combobox
                        options={[
                          { value: "worker_transport", label: "نقل عمال" },
                          { value: "material_delivery", label: "توريد مواد" },
                          { value: "concrete_transport", label: "نقل خرسانة" },
                          { value: "iron_platforms", label: "نقل حديد ومنصات" },
                          { value: "loading_unloading", label: "تحميل وتنزيل" },
                          { value: "maintenance", label: "صيانة وإصلاح" },
                          { value: "water_supply", label: "توريد مياه" },
                          { value: "other", label: "أخرى" }
                        ].map(opt => opt.label)}
                        value={[
                          { value: "worker_transport", label: "نقل عمال" },
                          { value: "material_delivery", label: "توريد مواد" },
                          { value: "concrete_transport", label: "نقل خرسانة" },
                          { value: "iron_platforms", label: "نقل حديد ومنصات" },
                          { value: "loading_unloading", label: "تحميل وتنزيل" },
                          { value: "maintenance", label: "صيانة وإصلاح" },
                          { value: "water_supply", label: "توريد مياه" },
                          { value: "other", label: "أخرى" }
                        ].find(opt => opt.value === category)?.label || "أخرى"}
                        onValueChange={(val) => {
                          const opt = [
                            { value: "worker_transport", label: "نقل عمال" },
                            { value: "material_delivery", label: "توريد مواد" },
                            { value: "concrete_transport", label: "نقل خرسانة" },
                            { value: "iron_platforms", label: "نقل حديد ومنصات" },
                            { value: "loading_unloading", label: "تحميل وتنزيل" },
                            { value: "maintenance", label: "صيانة وإصلاح" },
                            { value: "water_supply", label: "توريد مياه" },
                            { value: "other", label: "أخرى" }
                          ].find(o => o.label === val);
                          if (opt) setCategory(opt.value);
                        }}
                        placeholder="اختر الفئة..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Plus className="h-3 w-3" /> العامل (اختياري)
                      </Label>
                      <Combobox
                        options={workers.map(w => String(w.name))}
                        value={workers.find(w => w.id === workerId)?.name || ""}
                        onValueChange={(val) => {
                          const worker = workers.find(w => w.name === val);
                          if (worker) setWorkerId(worker.id);
                        }}
                        placeholder="اختر العامل..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Hash className="h-3 w-3" /> تخصيص لبئر
                      </Label>
                      <WellSelector 
                        projectId={selectedProjectId}
                        value={selectedWellId} 
                        onChange={setSelectedWellId} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ملاحظات</Label>
                      <Textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="أي ملاحظات إضافية..."
                        className="min-h-[80px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-none py-3 focus:ring-primary/20 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={resetForm} className="flex-1 rounded-xl h-11 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold">إلغاء</Button>
                    <Button type="submit" className="flex-[2] rounded-xl h-11 shadow-lg shadow-primary/20 gap-2 font-bold" disabled={saveMutation.isPending}>
                      <Save className="h-4 w-4" />
                      {editingExpenseId ? "تحديث السجل" : "حفظ السجل"}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <UnifiedFilterDashboard
            filters={filters}
            filterValues={filterValues}
            onFilterChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}
            onSearchChange={setSearchValue}
            searchValue={searchValue}
            onReset={handleReset}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            actions={actions}
            searchPlaceholder="بحث في سجلات النقل..."
          />

          {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />)}
             </div>
          ) : expenses.length === 0 ? (
            <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-transparent rounded-2xl">
              <Truck className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-600">لا توجد سجلات</h3>
              <p className="text-sm text-slate-400 max-w-xs">لم يتم العثور على أي سجلات نقل للفترة المحددة.</p>
            </Card>
          ) : (
            <UnifiedCardGrid>
              {expenses
                .filter(e => e.description.toLowerCase().includes(searchValue.toLowerCase()) || 
                            workers.find(w => w.id === e.workerId)?.name.toLowerCase().includes(searchValue.toLowerCase()))
                .map((expense) => (
                <UnifiedCard
                  key={expense.id}
                  title={expense.description}
                  subtitle={workers.find(w => w.id === expense.workerId)?.name || "مصروف عام"}
                  icon={Truck}
                  fields={[
                    {
                      label: "المبلغ",
                      value: formatCurrency(Number(expense.amount)),
                      icon: DollarSign,
                      emphasis: true,
                      color: "success"
                    },
                    {
                      label: "الفئة",
                      value: [
                        { value: "worker_transport", label: "نقل عمال" },
                        { value: "material_delivery", label: "توريد مواد" },
                        { value: "concrete_transport", label: "نقل خرسانة" },
                        { value: "iron_platforms", label: "نقل حديد ومنصات" },
                        { value: "loading_unloading", label: "تحميل وتنزيل" },
                        { value: "maintenance", label: "صيانة وإصلاح" },
                        { value: "water_supply", label: "توريد مياه" },
                        { value: "other", label: "أخرى" }
                      ].find(opt => opt.value === expense.category)?.label || "أخرى",
                      icon: Filter,
                      color: "info"
                    },
                    {
                      label: "التاريخ",
                      value: expense.date,
                      icon: Calendar
                    },
                    {
                      label: "البئر",
                      value: expense.wellId ? `بئر ${expense.wellId}` : "N/A",
                      icon: Hash,
                      hidden: !expense.wellId
                    }
                  ]}
                  actions={[
                    {
                      icon: Edit,
                      label: "تعديل",
                      onClick: () => handleEdit(expense),
                      color: "blue"
                    },
                    {
                      icon: Trash2,
                      label: "حذف",
                      onClick: () => {
                        if (confirm("هل أنت متأكد من الحذف؟")) deleteMutation.mutate(expense.id);
                      },
                      color: "red"
                    }
                  ]}
                  footer={expense.notes && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-2">
                        <Info className="h-3 w-3 text-slate-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            {expense.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                />
              ))}
            </UnifiedCardGrid>
          )}
        </div>
      </div>
    </div>
  );
}
