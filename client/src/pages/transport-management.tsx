import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { 
  Truck, Save, Plus, Edit, Trash2, 
  DollarSign, TrendingUp, RefreshCw, ChevronUp,
  FileSpreadsheet, Filter, XCircle, Calendar, Hash,
  MapPin, Info, User, Settings, Droplets, Package, Building2
} from "lucide-react";
import { downloadExcelFile } from '@/utils/webview-download';

const BORDER_COLORS = [
  "border-l-blue-500", "border-l-green-500", "border-l-orange-500",
  "border-l-slate-500", "border-l-red-500", "border-l-red-400",
  "border-l-amber-500", "border-l-purple-500", "border-l-cyan-500",
  "border-l-indigo-500", "border-l-pink-500", "border-l-teal-500",
  "border-l-lime-500", "border-l-rose-500", "border-l-emerald-500"
];
const ICON_COLORS = [
  "text-blue-500", "text-green-500", "text-orange-500",
  "text-slate-500", "text-red-500", "text-red-400",
  "text-amber-500", "text-purple-500", "text-cyan-500",
  "text-indigo-500", "text-pink-500", "text-teal-500",
  "text-lime-500", "text-rose-500", "text-emerald-500"
];
const getCategoryBorderColor = (cat: string, categories: string[]) => {
  const idx = categories.indexOf(cat);
  return idx >= 0 ? BORDER_COLORS[idx % BORDER_COLORS.length] : "border-l-slate-400";
};
const getCategoryIconColor = (cat: string, categories: string[]) => {
  const idx = categories.indexOf(cat);
  return idx >= 0 ? ICON_COLORS[idx % ICON_COLORS.length] : "text-slate-400";
};
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { cn, getCurrentDate, formatDate, formatCurrency, formatDateForApi } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { WellSelector } from "@/components/well-selector";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats, type UnifiedStatItem } from "@/components/ui/unified-stats";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TransportationExpense, Worker } from "@shared/schema";
import { QUERY_KEYS } from "@/constants/queryKeys";
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
  const [worker_id, setWorkerId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(getCurrentDate());
  const [notes, setNotes] = useState<string>("");
  const [category, setCategory] = useState<string>("");
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
    setCategory("");
    setSelectedWellId(undefined);
    setEditingExpenseId(null);
    setIsDialogOpen(false);
    setIsAddingCategory(false);
    setNewCategoryName("");
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
    queryKey: QUERY_KEYS.workers,
  });

  const { data: expensesResponse, isLoading, refetch } = useQuery<{ success: boolean; data: (TransportationExpense & { workerName?: string, projectName?: string })[] }>({
    queryKey: QUERY_KEYS.projectTransportation(selectedProjectId, filterValues.specificDate, filterValues.dateRange),
    queryFn: async () => {
      let url = isAllProjects 
        ? `/api/transportation-expenses` 
        : `/api/projects/${getProjectIdForApi()}/transportation-expenses`;
      
      const params = new URLSearchParams();
      if (filterValues.specificDate) {
        params.append("date", filterValues.specificDate);
      }
      if (filterValues.dateRange?.from) {
        params.append("dateFrom", formatDateForApi(filterValues.dateRange.from));
      }
      if (filterValues.dateRange?.to) {
        params.append("dateTo", formatDateForApi(filterValues.dateRange.to));
      }
      
      const queryString = params.toString();
      const response = await apiRequest(`${url}${queryString ? `?${queryString}` : ''}`, "GET");
      return response;
    },
    enabled: !!selectedProjectId || isAllProjects
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: autocompleteResponse } = useQuery({
    queryKey: QUERY_KEYS.autocompleteTransportCategories,
    queryFn: async () => apiRequest("/api/autocomplete/transport-categories", "GET")
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("/api/autocomplete", "POST", {
        category: "transport-categories",
        value: name,
      });
    },
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteTransportCategories });
      setCategory(name);
      setNewCategoryName("");
      setIsAddingCategory(false);
      toast({ title: "تم إضافة الفئة بنجاح", description: `تمت إضافة "${name}"` });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في إضافة الفئة", description: error?.message || "حدث خطأ", variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest(`/api/autocomplete/transport-categories/${encodeURIComponent(value)}`, "DELETE");
    },
    onSuccess: (_data, value) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteTransportCategories });
      if (category === value) setCategory("");
      toast({ title: "تم حذف الفئة", description: `تم حذف الفئة بنجاح` });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في حذف الفئة", description: error?.message || "حدث خطأ", variant: "destructive" });
    }
  });

  const dynamicCategories = useMemo(() => {
    if (!autocompleteResponse?.data || !Array.isArray(autocompleteResponse.data)) return [];
    return autocompleteResponse.data.map((cat: any) => ({
      value: typeof cat === 'string' ? cat : cat.value,
      label: typeof cat === 'string' ? cat : (cat.label || cat.value)
    }));
  }, [autocompleteResponse]);

  const allCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    dynamicCategories.forEach(cat => catMap.set(cat.value, cat.label));
    const expenseData = expensesResponse?.data || [];
    expenseData.forEach((e: any) => {
      if (e.category && !catMap.has(e.category)) {
        catMap.set(e.category, e.category);
      }
    });
    return Array.from(catMap.entries()).map(([value, label]) => ({ value, label }));
  }, [dynamicCategories, expensesResponse]);

  const categoryKeys = useMemo(() => allCategories.map(c => c.value), [allCategories]);

  const categoriesMap = useMemo(() => {
    const map: Record<string, string> = {};
    allCategories.forEach(cat => { map[cat.value] = cat.label; });
    return map;
  }, [allCategories]);

  const filterCategories = useMemo(() => {
    return [{ value: 'all', label: 'جميع الفئات' }, ...allCategories];
  }, [allCategories]);

  const formCategoryOptions = useMemo(() => {
    return [...allCategories];
  }, [allCategories]);

  const expenses = useMemo(() => expensesResponse?.data || [], [expensesResponse]);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (filterValues.category && filterValues.category !== 'all') {
      result = result.filter(e => e.category === filterValues.category);
    }
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      result = result.filter(e => 
        e.description.toLowerCase().includes(lowerSearch) || 
        (e.workerName && e.workerName.toLowerCase().includes(lowerSearch)) ||
        (e.projectName && e.projectName.toLowerCase().includes(lowerSearch))
      );
    }
    return result;
  }, [expenses, searchValue, filterValues.category]);

  const STAT_COLORS: Array<"blue" | "green" | "amber" | "purple" | "red" | "indigo" | "orange" | "slate" | "gray"> = [
    "purple", "red", "indigo", "orange", "slate", "gray", "blue", "green", "amber"
  ];
  const STAT_ICONS = [Package, Droplets, Truck, Building2, Settings, Info, DollarSign, TrendingUp, Filter];

  const statsData = useMemo(() => {
    const data = filteredExpenses;
    const totalAmount = data.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = data.length;

    const summaryStats: UnifiedStatItem[] = [
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

    const categoryStats: UnifiedStatItem[] = allCategories
      .map((cat, idx) => {
        const catTotal = data.filter(e => e.category === cat.value).reduce((sum, e) => sum + Number(e.amount), 0);
        return {
          title: cat.label,
          value: formatCurrency(catTotal),
          icon: STAT_ICONS[idx % STAT_ICONS.length],
          color: STAT_COLORS[idx % STAT_COLORS.length],
          _amount: catTotal,
        };
      })
      .filter(stat => stat._amount > 0)
      .map(({ _amount, ...stat }) => stat);

    return [...summaryStats, ...categoryStats];
  }, [filteredExpenses, allCategories]);

  const handleExportToExcel = async () => {
    try {
      const { createProfessionalReport } = await import('@/utils/axion-export');
      const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const data = expenses.map((expense, idx) => ({
        index: idx + 1,
        date: formatDate(expense.date),
        description: expense.description || '',
        amount: Number(expense.amount),
        category: categoriesMap[expense.category] || expense.category || "أخرى",
        worker: workers.find(w => w.id === expense.worker_id)?.name || "مصروف عام",
        well: expense.well_id || "-",
        notes: expense.notes || ""
      }));

      const downloadResult = await createProfessionalReport({
        sheetName: 'حركة النقل',
        reportTitle: 'تقرير حركة النقل والمواصلات',
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
        infoLines: [`إجمالي العمليات: ${expenses.length}`, `إجمالي المبالغ: ${totalAmount.toLocaleString('en-US')} ريال`],
        columns: [
          { header: '#', key: 'index', width: 5 },
          { header: 'التاريخ', key: 'date', width: 13 },
          { header: 'البيان / الوصف', key: 'description', width: 25 },
          { header: 'المبلغ', key: 'amount', width: 14, numFmt: '#,##0' },
          { header: 'الفئة', key: 'category', width: 16 },
          { header: 'العامل', key: 'worker', width: 18 },
          { header: 'رقم البئر', key: 'well', width: 12 },
          { header: 'ملاحظات', key: 'notes', width: 25 }
        ],
        data,
        totals: { label: 'الإجماليات', values: { amount: totalAmount } },
        signatures: [
          { title: 'توقيع السائق' },
          { title: 'توقيع المهندس المشرف' },
          { title: 'توقيع المدير العام' }
        ],
        fileName: `تقرير_النقل_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`,
      });
      
      if (downloadResult) {
        toast({ title: "تم التصدير بنجاح", description: "تم تحميل ملف إكسل احترافي" });
      } else {
        toast({ title: "تعذر التنزيل", description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setSearchValue("");
    setFilterValues({
      dateRange: undefined,
      specificDate: getCurrentDate(),
      category: undefined
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
      if (data.category && !dynamicCategories.some(c => c.value === data.category)) {
        try {
          await apiRequest("/api/autocomplete", "POST", {
            category: "transport-categories",
            value: data.category,
          });
        } catch (_e) {}
      }
      if (editingExpenseId) {
        return apiRequest(`/api/transportation-expenses/${editingExpenseId}`, "PATCH", data);
      }
      return apiRequest("/api/transportation-expenses", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transportationExpenses });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteTransportCategories });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transportationExpenses });
      toast({ title: "تم الحذف بنجاح" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول الأساسية (المبلغ، الوصف، الفئة)", variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      project_id: selectedProjectId,
      worker_id: worker_id || null,
      amount: amount,
      description: description,
      date: date,
      category: category,
      notes: notes,
      well_id: selectedWellId
    });
  };

  const handleEdit = (expense: TransportationExpense) => {
    setEditingExpenseId(expense.id);
    setWorkerId(expense.worker_id || "");
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setDate(expense.date);
    setNotes(expense.notes || "");
    setCategory(expense.category || "");
    setSelectedWellId(expense.well_id || undefined);
    setIsDialogOpen(true);
  };

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'specificDate') {
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        setFilterValues(prev => ({ ...prev, specificDate: `${year}-${month}-${day}`, dateRange: undefined }));
      } else {
        setFilterValues(prev => ({ ...prev, specificDate: undefined }));
      }
    } else if (key === 'dateRange') {
      setFilterValues(prev => ({ ...prev, [key]: value, specificDate: undefined }));
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  }, []);

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
    },
    {
      key: "category",
      type: "select",
      label: "الفئة",
      placeholder: "جميع الفئات",
      options: filterCategories
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
            <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
              <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-primary">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>
                  {editingExpenseId ? "تعديل سجل النقل" : "إضافة سجل نقل جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <Label data-testid="label-category" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Filter className="h-3 w-3" /> الفئة
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          options={formCategoryOptions}
                          value={category}
                          onValueChange={(val) => setCategory(val)}
                          allowCustom={true}
                          placeholder="اختر الفئة..."
                          triggerClassName="text-xs"
                          data-testid="select-category"
                          onDeleteOption={(val) => {
                            if (confirm(`هل تريد حذف الفئة "${val}"؟`)) {
                              deleteCategoryMutation.mutate(val);
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        data-testid="button-add-category"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {isAddingCategory && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="اسم الفئة الجديدة..."
                          className="flex-1 text-xs"
                          data-testid="input-new-category"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (newCategoryName.trim()) {
                              addCategoryMutation.mutate(newCategoryName.trim());
                            }
                          }}
                          disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                          data-testid="button-save-category"
                        >
                          {addCategoryMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }}
                          data-testid="button-cancel-category"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label data-testid="label-description" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Edit className="h-3 w-3" /> البيان / الوصف
                    </Label>
                    <AutocompleteInput
                      category="transport_desc"
                      value={description}
                      onChange={setDescription}
                      placeholder="مثلاً: نقل عمال، توريد مياه..."
                      className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20"
                      autoWidth
                      maxWidth={500}
                      data-testid="input-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label data-testid="label-amount" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" /> المبلغ
                      </Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={amount} 
                          onChange={(e) => setAmount(e.target.value)} 
                          placeholder="0.00"
                          className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 pl-7 focus:ring-primary/20 text-xs"
                          data-testid="input-amount"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">RY</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label data-testid="label-date" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> التاريخ
                      </Label>
                      <DatePickerField
                        value={date}
                        onChange={(d) => setDate(d ? format(d, "yyyy-MM-dd") : getCurrentDate())}
                        data-testid="input-date"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label data-testid="label-worker" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <User className="h-3 w-3" /> العامل (اختياري)
                      </Label>
                      <Combobox
                        options={workers.map(w => String(w.name))}
                        value={workers.find(w => w.id === worker_id)?.name || ""}
                        onValueChange={(val) => {
                          const worker = workers.find(w => w.name === val);
                          if (worker) setWorkerId(worker.id);
                        }}
                        placeholder="اختر العامل..."
                        data-testid="select-worker"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label data-testid="label-well" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Hash className="h-3 w-3" /> البئر
                      </Label>
                      <WellSelector 
                        project_id={selectedProjectId}
                        value={selectedWellId} 
                        onChange={setSelectedWellId}
                        showLabel={false}
                        data-testid="select-well"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label data-testid="label-notes" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Info className="h-3 w-3" /> ملاحظات
                    </Label>
                    <Textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="أي ملاحظات إضافية..."
                      className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20 text-xs"
                      autoHeight
                      minRows={2}
                      maxRows={6}
                      data-testid="input-notes"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={resetForm} className="flex-1 text-xs font-bold" data-testid="button-cancel">
                      إلغاء
                    </Button>
                    <Button type="submit" className="flex-[2] shadow-lg shadow-primary/20 gap-2 text-xs font-bold" disabled={saveMutation.isPending} data-testid="button-submit">
                      <Save className="h-4 w-4" />
                      {editingExpenseId ? "تحديث" : "حفظ"}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <UnifiedFilterDashboard
            hideHeader={true}
            filters={filters}
            filterValues={{
              ...filterValues,
              specificDate: filterValues.specificDate ? (() => {
                const [year, month, day] = filterValues.specificDate.split('-').map(Number);
                return new Date(year, month - 1, day, 12, 0, 0, 0);
              })() : undefined
            }}
            onFilterChange={handleFilterChange}
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
              {filteredExpenses.map((expense) => (
                <UnifiedCard
                  key={expense.id}
                  title={expense.description}
                  subtitle={
                    (() => {
                      const workerLabel = expense.workerName || "مصروف عام";
                      if (isAllProjects && expense.projectName) {
                        return `${workerLabel} - ${expense.projectName}`;
                      }
                      return workerLabel;
                    })()
                  }
                  titleIcon={Truck}
                  className={cn(
                    "hover-elevate active-elevate-2 transition-all duration-300 border-l-4 shadow-md hover:shadow-xl group py-2",
                    getCategoryBorderColor(expense.category, categoryKeys)
                  )}
                  compact={true}
                  fields={[
                    {
                      label: "المبلغ",
                      value: formatCurrency(Number(expense.amount)),
                      icon: DollarSign,
                      emphasis: true,
                      color: "success",
                      iconClassName: "text-green-600 dark:text-green-400"
                    },
                    {
                      label: "الفئة",
                      value: categoriesMap[expense.category] || expense.category || "أخرى",
                      icon: Filter,
                      emphasis: false,
                      iconClassName: getCategoryIconColor(expense.category, categoryKeys)
                    } as any,
                    {
                      label: "التاريخ",
                      value: expense.date,
                      icon: Calendar,
                      color: "info",
                      iconClassName: "text-sky-500"
                    },
                    {
                      label: "البئر",
                      value: expense.well_id ? `بئر ${expense.well_id}` : "N/A",
                      icon: Hash,
                      hidden: !expense.well_id,
                      color: "info",
                      iconClassName: "text-amber-500"
                    }
                  ]}
                  actions={[
                    {
                      icon: Edit,
                      label: "تعديل",
                      onClick: () => handleEdit(expense),
                      variant: "ghost"
                    },
                    {
                      icon: Trash2,
                      label: "حذف",
                      onClick: () => {
                        if (confirm("هل أنت متأكد من الحذف؟")) deleteMutation.mutate(expense.id);
                      },
                      variant: "ghost"
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
