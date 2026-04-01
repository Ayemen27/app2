import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { InsertWorker } from "@shared/schema";
import { getAccessToken, isWebCookieMode } from '@/lib/auth-token-store';

interface EnhancedAddWorkerFormProps {
  onSuccess?: () => void;
}

export default function EnhancedAddWorkerForm({ onSuccess }: EnhancedAddWorkerFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [dailyWage, setDailyWage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // دالة مساعدة لحفظ القيم في autocomplete_data
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      // تجاهل الأخطاء لأن هذه عملية مساعدة

    }
  };

  const { data: workerTypeOptions = [], isLoading: loadingTypes } = useQuery<{ value: string; label: string }[]>({
    queryKey: QUERY_KEYS.workerTypes,
    queryFn: async () => {
      const response = await apiRequest("/api/autocomplete/worker-types", "GET");
      if (response?.data && Array.isArray(response.data)) {
        return response.data;
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
    mutationFn: async (data: InsertWorker) => {
      
      try {
        if (!isWebCookieMode()) {
          const accessToken = getAccessToken();
          if (!accessToken) {
            throw new Error('لا يوجد رمز مصادقة - يرجى تسجيل الدخول مرة أخرى');
          }
        }
        
        // حفظ القيم في autocomplete_data قبل العملية الأساسية
        await Promise.all([
          saveAutocompleteValue('workerNames', data.name),
          saveAutocompleteValue('workerTypes', data.type)
        ]);
        
        const result = await apiRequest("/api/workers", "POST", data);
        
        return result;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: async (newWorker, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      
      toast({
        title: "تم الحفظ",
        description: "تم إضافة العامل بنجاح",
      });
      setName("");
      setType("");
      setDailyWage("");
      onSuccess?.();
    },
    onError: async (error: any, variables) => {
      // حفظ القيم في autocomplete_data حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('workerNames', variables.name),
        saveAutocompleteValue('workerTypes', variables.type)
      ]);
      
      // تحديث كاش autocomplete
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة العامل";
      toast({
        title: "فشل في إضافة العامل",
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

    addWorkerMutation.mutate({
      name: name.trim(),
      type,
      dailyWage,
      is_active: true,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="worker-name" className="block text-sm font-medium text-foreground">
            اسم العامل
          </Label>
          <Input
            id="worker-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم العامل..."
            required
            autoWidth
            maxWidth={400}
          />
        </div>

        <div>
          <Label htmlFor="worker-type" className="block text-sm font-medium text-foreground">
            نوع العامل
          </Label>
          <SearchableSelect
            value={type}
            onValueChange={setType}
            options={
              loadingTypes 
                ? [{ value: "loading", label: "جاري التحميل...", disabled: true }]
                : workerTypeOptions
            }
            placeholder="اختر نوع العامل..."
            searchPlaceholder="ابحث عن نوع..."
            emptyText="لا توجد أنواع"
            className="flex-1"
            allowCustom
            onCustomAdd={(value) => addCategoryMutation.mutate(value)}
            onDeleteOption={(value) => deleteCategoryMutation.mutate(value)}
          />
        </div>

        <div>
          <Label htmlFor="daily-wage" className="block text-sm font-medium text-foreground">
            الأجر اليومي (ر.ي)
          </Label>
          <Input
            id="daily-wage"
            type="number"
            inputMode="decimal"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
            placeholder="0"
            className="text-center arabic-numbers"
            required
            autoWidth
            maxWidth={200}
          />
        </div>

        <Button
          type="submit"
          disabled={addWorkerMutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {addWorkerMutation.isPending ? "جاري الإضافة..." : "إضافة العامل"}
        </Button>
      </form>

    </>
  );
}