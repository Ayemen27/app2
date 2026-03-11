import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { Phone, User, Briefcase, DollarSign, Plus, Save, XCircle, RefreshCw } from "lucide-react";
import type { InsertWorker } from "@shared/schema";

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  phone?: string | null;
  hireDate?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AddWorkerFormProps {
  worker?: Worker;
  projectId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

interface WorkerTypeOption {
  value: string;
  label: string;
}

export default function AddWorkerForm({ worker, projectId, onSuccess, onCancel, submitLabel = "إضافة العامل" }: AddWorkerFormProps) {
  const [name, setName] = useState(worker?.name || "");
  const [type, setType] = useState(worker?.type || "");
  const [dailyWage, setDailyWage] = useState(worker ? worker.dailyWage : "");
  const [phone, setPhone] = useState(worker?.phone || "");
  const [hireDate, setHireDate] = useState(worker?.hireDate || "");
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (worker) {
      setName(worker.name || "");
      setType(worker.type || "");
      setDailyWage(worker.dailyWage || "");
      setPhone(worker.phone || "");
      setHireDate(worker.hireDate || "");
    }
  }, [worker]);

  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
    }
  };

  const { data: workerTypeOptions = [] } = useQuery<WorkerTypeOption[]>({
    queryKey: QUERY_KEYS.workerTypes,
    queryFn: async () => {
      const response = await apiRequest("/api/autocomplete/worker-types", "GET");
      if (response?.data && Array.isArray(response.data)) {
        return response.data as WorkerTypeOption[];
      }
      return [];
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest("/api/autocomplete", "POST", { category: 'worker-types', value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerTypes });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest(`/api/autocomplete/worker-types/${encodeURIComponent(value)}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerTypes });
      toast({ title: "تم الحذف", description: "تم حذف نوع العامل بنجاح" });
    },
  });

  const addWorkerMutation = useMutation({
    mutationFn: async (data: InsertWorker & { phone?: string; hireDate?: string }) => {
      await Promise.all([
        saveAutocompleteValue('workerNames', data.name),
        saveAutocompleteValue('workerTypes', data.type)
      ]);
      
      if (worker) {
        return apiRequest(`/api/workers/${worker.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/workers", "POST", data);
      }
    },
    onSuccess: async (newWorker, variables) => {
      // تحديث قائمة العمال فقط، وعدم عمل invalidate للمشاريع والإحصائيات الثقيلة فوراً
      queryClient.setQueryData(['/api/workers'], (old: any[] | undefined) => {
        if (!old) return [newWorker.data];
        return [newWorker.data, ...old];
      });
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workerTypes }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete })
      ]);
      
      toast({
        title: "تم الحفظ",
        description: worker ? "تم تعديل العامل بنجاح" : "تم إضافة العامل بنجاح",
      });
      if (!worker) {
        setName("");
        setType("");
        setDailyWage("");
        setPhone("");
        setHireDate("");
      }
      onSuccess?.();
    },
    onError: async (error: any, variables) => {
      await Promise.all([
        saveAutocompleteValue('workerNames', variables.name),
        saveAutocompleteValue('workerTypes', variables.type)
      ]);
      
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      
      const errorMessage = error?.message || (worker ? "حدث خطأ أثناء تعديل العامل" : "حدث خطأ أثناء إضافة العامل");
      toast({
        title: worker ? "فشل في تعديل العامل" : "فشل في إضافة العامل",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type || !dailyWage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const parsedWage = parseFloat(dailyWage);
    
    if (isNaN(parsedWage) || parsedWage <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح للأجر اليومي",
        variant: "destructive",
      });
      return;
    }

    addWorkerMutation.mutate({
      name: name.trim(),
      type,
      dailyWage: parsedWage.toString(),
      phone: phone.trim() || undefined,
      hireDate: hireDate || undefined,
      isActive: worker?.isActive ?? true,
      ...(!worker && projectId && projectId !== 'all' ? { project_id: projectId } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CompactFieldGroup columns={2}>
        <div className="space-y-2">
          <Label htmlFor="worker-name" className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            اسم العامل *
          </Label>
          <Textarea
            id="worker-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم العامل..."
            required
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-type" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-500" />
            نوع العامل *
          </Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchableSelect
                value={type}
                onValueChange={setType}
                options={workerTypeOptions}
                placeholder="اختر نوع العامل..."
                searchPlaceholder="ابحث عن نوع..."
                emptyText="لا توجد أنواع"
                allowCustom
                onCustomAdd={(value) => addCategoryMutation.mutate(value)}
                onDeleteOption={(value) => deleteCategoryMutation.mutate(value)}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setIsAddingType(!isAddingType)}
              data-testid="button-add-worker-type"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {isAddingType && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="اسم النوع الجديد..."
                className="flex-1 text-xs"
                data-testid="input-new-worker-type"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (newTypeName.trim()) {
                    addCategoryMutation.mutate(newTypeName.trim());
                    setType(newTypeName.trim());
                    setNewTypeName("");
                    setIsAddingType(false);
                  }
                }}
                disabled={!newTypeName.trim() || addCategoryMutation.isPending}
                data-testid="button-save-worker-type"
              >
                {addCategoryMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => { setIsAddingType(false); setNewTypeName(""); }}
                data-testid="button-cancel-worker-type"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CompactFieldGroup>

      <CompactFieldGroup columns={3}>
        <div className="space-y-2">
          <Label htmlFor="daily-wage" className="text-sm font-medium text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            الأجر اليومي (ر.ي) *
          </Label>
          <Input
            id="daily-wage"
            type="number"
            inputMode="decimal"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
            placeholder="0"
            className="text-center arabic-numbers min-h-11"
            required
            autoWidth
            maxWidth={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            رقم الهاتف
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="966XXXXXXXXX+"
            className="text-left ltr"
            dir="ltr"
          />
        </div>

        <DatePickerField
          id="hire-date"
          label="تاريخ التوظيف"
          value={hireDate}
          onChange={(date) => setHireDate(date ? format(date, "yyyy-MM-dd") : "")}
        />
      </CompactFieldGroup>

      <div className="flex gap-2">
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={addWorkerMutation.isPending}
        >
          {addWorkerMutation.isPending ? "جاري الحفظ..." : submitLabel}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}
