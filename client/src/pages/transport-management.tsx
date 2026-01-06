import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Truck, Save, Plus, Edit, Trash2, 
  DollarSign, TrendingUp, RefreshCw, ChevronUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { getCurrentDate, formatDate } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { WellSelector } from "@/components/well-selector";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import type { TransportationExpense, Worker } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function TransportManagement() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, isAllProjects, getProjectIdForApi } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ 
    dateRange: undefined,
    specificDate: getCurrentDate()
  });
  
  const [isFormCollapsed, setIsFormCollapsed] = useState(true);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form states
  const [workerId, setWorkerId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(getCurrentDate());
  const [notes, setNotes] = useState<string>("");
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
    setSelectedWellId(undefined);
    setEditingExpenseId(null);
    setIsFormCollapsed(true);
  }, []);

  // Unified Floating Button
  useEffect(() => {
    setFloatingAction(() => {
      setIsFormCollapsed(prev => !prev);
      if (!isFormCollapsed) resetForm();
    }, isFormCollapsed ? "إضافة سجل نقل" : "إلغاء الإضافة");
    
    return () => setFloatingAction(null);
  }, [setFloatingAction, isFormCollapsed, resetForm]);

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const { data: expenses = [], isLoading, refetch } = useQuery<TransportationExpense[]>({
    queryKey: ["/api/projects", selectedProjectId, "transportation", filterValues.specificDate, filterValues.dateRange],
    queryFn: async () => {
      let url = `/api/projects/${getProjectIdForApi()}/transportation`;
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
      return response.data || [];
    },
    enabled: !!selectedProjectId || isAllProjects
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingExpenseId) {
        return apiRequest(`/api/transportation/${editingExpenseId}`, "PATCH", data);
      }
      return apiRequest("/api/transportation", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "transportation"] });
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
    mutationFn: (id: string) => apiRequest(`/api/transportation/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "transportation"] });
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
    setSelectedWellId(expense.wellId || undefined);
    setIsFormCollapsed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const statsConfig: StatsRowConfig[] = [
    {
      id: "total",
      label: "إجمالي النقل",
      value: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      icon: DollarSign,
      variant: "primary",
      isCurrency: true
    },
    {
      id: "count",
      label: "عدد الرحلات",
      value: expenses.length,
      icon: Truck,
      variant: "secondary"
    },
    {
      id: "average",
      label: "متوسط الرحلة",
      value: expenses.length > 0 ? expenses.reduce((sum, e) => sum + Number(e.amount), 0) / expenses.length : 0,
      icon: TrendingUp,
      variant: "accent",
      isCurrency: true
    }
  ];

  const filterConfig: FilterConfig[] = [
    {
      id: "specificDate",
      type: "date",
      label: "تاريخ محدد",
      placeholder: "اختر التاريخ"
    },
    {
      id: "dateRange",
      type: "dateRange",
      label: "فترة زمنية"
    }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-7xl mx-auto w-full p-4 space-y-6">
          
          <AnimatePresence>
            {!isFormCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-primary/20 bg-white dark:bg-slate-900 shadow-xl overflow-hidden rounded-2xl mb-6">
                  <div className="p-4 border-b bg-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-primary">
                      <Truck className="h-4 w-4" />
                      {editingExpenseId ? "تعديل سجل النقل" : "إضافة سجل نقل جديد"}
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetForm}>إلغاء</Button>
                  </div>
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">البيان / الوصف</Label>
                        <AutocompleteInput
                          category="transport_desc"
                          value={description}
                          onChange={setDescription}
                          placeholder="مثلاً: نقل عمال، توريد مياه..."
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">المبلغ</Label>
                        <div className="relative">
                          <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            placeholder="0.00"
                            className="h-11 pr-10 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">التاريخ</Label>
                        <Input 
                          type="date" 
                          value={date} 
                          onChange={(e) => setDate(e.target.value)} 
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">العامل (اختياري)</Label>
                        <Combobox
                          options={workers.map(w => ({ label: w.name, value: w.id }))}
                          value={workerId}
                          onSelect={setWorkerId}
                          placeholder="اختر العامل..."
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">تخصيص لبئر</Label>
                        <WellSelector 
                          selectedWellId={selectedWellId} 
                          onSelect={setSelectedWellId} 
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-3 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">ملاحظات</Label>
                        <Textarea 
                          value={notes} 
                          onChange={(e) => setNotes(e.target.value)} 
                          placeholder="أي ملاحظات إضافية..."
                          className="min-h-[100px] rounded-xl resize-none"
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-4 border-t">
                        <Button type="submit" className="gap-2 rounded-xl px-8" disabled={saveMutation.isPending}>
                          <Save className="h-4 w-4" />
                          {editingExpenseId ? "تحديث السجل" : "حفظ السجل"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <UnifiedFilterDashboard
            statsConfigs={statsConfig}
            filterConfigs={filterConfig}
            filterValues={filterValues}
            onFilterChange={(id, val) => setFilterValues(prev => ({ ...prev, [id]: val }))}
            onSearchChange={setSearchValue}
            searchValue={searchValue}
            title="إدارة النقل"
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
                  amount={Number(expense.amount)}
                  date={expense.date}
                  badge={expense.wellId ? `بئر ${expense.wellId}` : undefined}
                  icon={Truck}
                  actions={
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(expense)} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" 
                        onClick={() => {
                          if (confirm("هل أنت متأكد من الحذف؟")) deleteMutation.mutate(expense.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                >
                  {expense.notes && (
                    <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">{expense.notes}</p>
                    </div>
                  )}
                </UnifiedCard>
              ))}
            </UnifiedCardGrid>
          )}
        </div>
      </div>
    </div>
  );
}
