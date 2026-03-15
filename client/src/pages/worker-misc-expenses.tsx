import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Save, X, DollarSign, ChevronDown, ChevronUp, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { WellSelector } from "@/components/well-selector";
import { formatCurrency } from "@/lib/utils";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useEffect, useState as useStateAlias } from "react";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface WorkerMiscExpense {
  id: string;
  project_id: string;
  amount: string;
  description: string;
  date: string;
  notes?: string;
  well_id?: number | null;
  created_at: string;
}

interface WorkerMiscExpensesProps {
  project_id: string;
  selectedDate: string;
}

export default function WorkerMiscExpenses({ project_id, selectedDate }: WorkerMiscExpensesProps) {
  const [miscDescription, setMiscDescription] = useState("");
  const [miscAmount, setMiscAmount] = useState("");
  const [miscWellId, setMiscWellId] = useState<number | undefined>();
  const [editingMiscId, setEditingMiscId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // دالة مساعدة لحفظ قيم الإكمال التلقائي
  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;

    try {
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
      console.log(`✅ تم حفظ قيمة الإكمال التلقائي: ${field} = ${value.trim()}`);
    } catch (error) {
      console.warn(`Failed to save autocomplete value for ${field}:`, error);
    }
  };

  const { data: wells = [] } = useQuery<any[]>({
    queryKey: QUERY_KEYS.wellsByProject(project_id),
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/wells?project_id=${project_id}`);
        if (response && response.success && Array.isArray(response.data)) return response.data;
        return Array.isArray(response) ? response : (response.data || []);
      } catch { return []; }
    },
    enabled: !!project_id,
    staleTime: 5 * 60 * 1000
  });

  const getWellLabel = (wellId: number | null | undefined) => {
    if (!wellId) return null;
    const well = wells.find((w: any) => w.id === wellId);
    return well ? `بئر #${well.wellNumber}` : null;
  };

  const { data: todayMiscExpenses = [] } = useQuery<WorkerMiscExpense[]>({
    queryKey: QUERY_KEYS.workerMiscExpensesFiltered(project_id, selectedDate),
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/worker-misc-expenses?project_id=${project_id}&date=${selectedDate}`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as WorkerMiscExpense[];
        }
        return Array.isArray(response) ? response as WorkerMiscExpense[] : [];
      } catch (error) {
        console.error("Error fetching worker misc expenses:", error);
        return [];
      }
    },
    enabled: !!project_id,
  });

  // تحديث حالة التوسع عند تغير البيانات
  useEffect(() => {
    setIsExpanded(todayMiscExpenses.length > 0);
  }, [todayMiscExpenses]);

  const createMiscExpenseMutation = useMutation({
    mutationFn: (data: { amount: string; description: string; project_id: string; date: string }) =>
      apiRequest("/api/worker-misc-expenses", "POST", data),
    onSuccess: async () => {
      // حفظ قيم الإكمال التلقائي
      if (miscDescription && miscDescription.trim().length >= 2) {
        await saveAutocompleteValue('workerMiscDescriptions', miscDescription.trim());
      }
      
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteCategory('workerMiscDescriptions') });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerMiscExpenses });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      
      setMiscDescription("");
      setMiscAmount("");
      toast({
        title: "تم إضافة النثريات",
        description: "تم إضافة نثريات العمال بنجاح"
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "حدث خطأ أثناء إضافة النثريات";
      console.error("Error creating misc expense:", error);
      toast({
        title: "خطأ في إضافة النثريات",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const updateMiscExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkerMiscExpense> }) =>
      apiRequest(`/api/worker-misc-expenses/${id}`, "PATCH", data),
    onSuccess: async () => {
      // حفظ قيم الإكمال التلقائي
      if (miscDescription && miscDescription.trim().length >= 2) {
        await saveAutocompleteValue('workerMiscDescriptions', miscDescription.trim());
      }
      
      await queryClient.invalidateQueries({ queryKey: ['/api/autocomplete'] });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerMiscExpenses });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      
      resetMiscExpenseForm();
      toast({
        title: "تم تحديث النثريات",
        description: "تم تحديث النثريات بنجاح"
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "حدث خطأ أثناء تحديث النثريات";
      console.error("Error updating misc expense:", error);
      toast({
        title: "خطأ في تحديث النثريات",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const deleteMiscExpenseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-misc-expenses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerMiscExpenses });
      toast({
        title: "تم حذف النثريات",
        description: "تم حذف النثريات بنجاح"
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "حدث خطأ أثناء حذف النثريات";
      console.error("Error deleting misc expense:", error);
      toast({
        title: "خطأ في حذف النثريات",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const handleAddMiscExpense = async () => {
    if (!project_id || project_id === "all") {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة نثريات عند اختيار 'جميع المشاريع'. يرجى اختيار مشروع محدد أولاً.",
        variant: "destructive"
      });
      return;
    }

    if (!miscDescription.trim() || !miscAmount) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال الوصف والمبلغ",
        variant: "destructive"
      });
      return;
    }

    // حفظ الوصف في نظام الإكمال التلقائي فوراً
    if (miscDescription && miscDescription.trim().length >= 2) {
      await saveAutocompleteValue('workerMiscDescriptions', miscDescription.trim());
    }
    
    // Invalidate autocomplete queries to show the new value immediately
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocompleteCategory('workerMiscDescriptions') });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

    if (editingMiscId) {
      updateMiscExpenseMutation.mutate({
        id: editingMiscId,
        data: {
          description: miscDescription,
          amount: miscAmount,
          well_id: miscWellId || null
        }
      });
    } else {
      createMiscExpenseMutation.mutate({
        description: miscDescription,
        amount: miscAmount,
        project_id,
        date: selectedDate,
        well_id: miscWellId || null
      });
    }
  };

  const resetMiscExpenseForm = () => {
    setMiscDescription("");
    setMiscAmount("");
    setMiscWellId(undefined);
    setEditingMiscId(null);
  };

  const handleEditMiscExpense = (expense: WorkerMiscExpense) => {
    setMiscDescription(expense.description);
    setMiscAmount(expense.amount);
    setMiscWellId(expense.well_id ? Number(expense.well_id) : undefined);
    setEditingMiscId(expense.id);
  };

  // حساب إجمالي النثريات مع معالجة آمنة
  const totalMiscExpenses = Array.isArray(todayMiscExpenses) 
    ? todayMiscExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || "0"), 0)
    : 0;

  return (
    <div className="space-y-3">
      <WellSelector
        project_id={project_id}
        value={miscWellId}
        onChange={setMiscWellId}
        showLabel={false}
        optional={true}
      />
      <div className="grid grid-cols-2 gap-3">
            <AutocompleteInput
              value={miscDescription}
              onChange={setMiscDescription}
              category="workerMiscDescriptions"
              placeholder="الوصف"
            />
            <Input
              type="number"
              inputMode="decimal"
              value={miscAmount}
              onChange={(e) => setMiscAmount(e.target.value)}
              placeholder="المبلغ"
              className="text-center arabic-numbers"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddMiscExpense} 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700 transition-all duration-200 disabled:opacity-50"
              disabled={createMiscExpenseMutation.isPending || updateMiscExpenseMutation.isPending}
              data-testid="button-add-misc-expense"
            >
              {createMiscExpenseMutation.isPending || updateMiscExpenseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingMiscId ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
            {editingMiscId && (
              <Button 
                onClick={resetMiscExpenseForm} 
                size="sm" 
                variant="outline"
                disabled={createMiscExpenseMutation.isPending || updateMiscExpenseMutation.isPending}
                data-testid="button-cancel-edit-misc-expense"
              >
                إلغاء
              </Button>
            )}
          </div>
          
          {/* Show existing misc expenses */}
          {Array.isArray(todayMiscExpenses) && todayMiscExpenses.map((expense, index) => (
            <div key={expense.id || index} className="flex justify-between items-center p-2 bg-muted rounded">
              <div className="flex-1 min-w-0">
                <span className="text-sm block">{expense.description}</span>
                {getWellLabel(expense.well_id) && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">{getWellLabel(expense.well_id)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium arabic-numbers">{formatCurrency(expense.amount)}</span>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleEditMiscExpense(expense)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteMiscExpenseMutation.mutate(expense.id)}
                    disabled={deleteMiscExpenseMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {Array.isArray(todayMiscExpenses) && todayMiscExpenses.length > 0 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <div>
                <span className="text-sm text-muted-foreground">إجمالي النثريات: </span>
                <span className="font-bold text-purple-600 arabic-numbers">
                  {formatCurrency(totalMiscExpenses.toString())}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                data-testid="button-export-misc-expenses"
                onClick={async () => {
                  const { createProfessionalReport } = await import('@/utils/axion-export');
                  const data = todayMiscExpenses.map((expense: WorkerMiscExpense, idx: number) => ({
                    index: idx + 1,
                    date: expense.date || selectedDate,
                    description: expense.description || '-',
                    amount: parseFloat(expense.amount || '0'),
                    notes: expense.notes || '',
                  }));
                  await createProfessionalReport({
                    sheetName: 'نثريات العمال',
                    reportTitle: 'تقرير مصاريف العمال المتنوعة (النثريات)',
                    subtitle: `التاريخ: ${selectedDate}`,
                    infoLines: [`عدد العمليات: ${data.length}`, `الإجمالي: ${totalMiscExpenses.toLocaleString('en-US')} ريال`],
                    columns: [
                      { header: '#', key: 'index', width: 5 },
                      { header: 'التاريخ', key: 'date', width: 12 },
                      { header: 'الوصف', key: 'description', width: 30 },
                      { header: 'المبلغ', key: 'amount', width: 14, numFmt: '#,##0' },
                      { header: 'ملاحظات', key: 'notes', width: 25 },
                    ],
                    data,
                    totals: { label: 'الإجمالي', values: { amount: totalMiscExpenses } },
                    fileName: `نثريات_العمال_${selectedDate}.xlsx`,
                  });
                }}
              >
                <Download className="h-3 w-3" />
                تصدير
              </Button>
            </div>
          )}
        </div>
  );
}