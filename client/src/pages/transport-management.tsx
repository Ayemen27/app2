import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowRight, Save, Plus, Truck, Edit, Trash2, Users, DollarSign, TrendingUp, Calendar, FileSpreadsheet, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { getCurrentDate, formatCurrency } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { WellSelector } from "@/components/well-selector";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import type { TransportationExpense, Worker, Project } from "@shared/schema";

export default function TransportManagement() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, isAllProjects, getProjectIdForApi } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ 
    dateFrom: '',
    dateTo: '',
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

  // Disable floating button for this page
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const { data: expenses = [], isLoading } = useQuery<TransportationExpense[]>({
    queryKey: ["/api/projects", selectedProjectId, "transportation", filterValues.specificDate],
    queryFn: async () => {
      const url = `/api/projects/${getProjectIdForApi()}/transportation${filterValues.specificDate ? `?date=${filterValues.specificDate}` : ''}`;
      const response = await apiRequest(url, "GET");
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

  const resetForm = () => {
    setWorkerId("");
    setAmount("");
    setDescription("");
    setDate(getCurrentDate());
    setNotes("");
    setSelectedWellId(undefined);
    setEditingExpenseId(null);
    setIsFormCollapsed(true);
  };

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
    }
  ];

  const filterConfig: FilterConfig[] = [
    {
      id: "specificDate",
      type: "date",
      label: "التاريخ",
      placeholder: "اختر التاريخ"
    }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          إدارة النقل
        </h1>
        <Button 
          onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          variant={isFormCollapsed ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          {isFormCollapsed ? <Plus className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          {isFormCollapsed ? "إضافة سجل" : "إخفاء النموذج"}
        </Button>
      </div>

      {!isFormCollapsed && (
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>البيان / الوصف</Label>
                <AutocompleteInput
                  category="transport_desc"
                  value={description}
                  onChange={setDescription}
                  placeholder="مثلاً: نقل عمال، توريد مياه..."
                />
              </div>
              <div className="space-y-2">
                <Label>المبلغ</Label>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>العامل (اختياري)</Label>
                <Combobox
                  options={workers.map(w => ({ label: w.name, value: w.id }))}
                  value={workerId}
                  onSelect={setWorkerId}
                  placeholder="اختر العامل..."
                />
              </div>
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                />
              </div>
              <div className="md:col-span-2">
                <WellSelector 
                  selectedWellId={selectedWellId} 
                  onSelect={setSelectedWellId} 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>ملاحظات</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={resetForm}>إلغاء</Button>
                <Button type="submit" className="gap-2" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {editingExpenseId ? "تحديث السجل" : "حفظ السجل"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <UnifiedFilterDashboard
        statsConfigs={statsConfig}
        filterConfigs={filterConfig}
        filterValues={filterValues}
        onFilterChange={(id, val) => setFilterValues(prev => ({ ...prev, [id]: val }))}
        onSearchChange={setSearchValue}
        searchValue={searchValue}
        title="سجلات النقل"
      />

      <UnifiedCardGrid>
        {expenses.map((expense) => (
          <UnifiedCard
            key={expense.id}
            title={expense.description}
            subtitle={workers.find(w => w.id === expense.workerId)?.name || "مصروف عام"}
            amount={Number(expense.amount)}
            date={expense.date}
            badge={expense.wellId ? `بئر ${expense.wellId}` : undefined}
            icon={Truck}
            actions={
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => handleEdit(expense)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-destructive" 
                  onClick={() => {
                    if (confirm("هل أنت متأكد من الحذف؟")) deleteMutation.mutate(expense.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            {expense.notes && <p className="text-sm text-muted-foreground mt-2">{expense.notes}</p>}
          </UnifiedCard>
        ))}
      </UnifiedCardGrid>
    </div>
  );
}
