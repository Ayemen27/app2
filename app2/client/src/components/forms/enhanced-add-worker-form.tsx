import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertWorker, InsertWorkerType, WorkerType } from "@shared/schema";
import { Plus } from "lucide-react";

interface EnhancedAddWorkerFormProps {
  onSuccess?: () => void;
}

export default function EnhancedAddWorkerForm({ onSuccess }: EnhancedAddWorkerFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [dailyWage, setDailyWage] = useState("");
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
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

  // جلب أنواع العمال المتاحة
  const { data: workerTypes = [], isLoading: loadingTypes } = useQuery<WorkerType[]>({
    queryKey: ["/api/worker-types"],
    queryFn: () => apiRequest("/api/worker-types", "GET"),
  });

  const addWorkerMutation = useMutation({
    mutationFn: async (data: InsertWorker) => {
      console.log('🔧 [AddWorker] بدء إضافة عامل:', data);
      
      try {
        // التحقق من وجود رمز المصادقة
        const accessToken = localStorage.getItem('accessToken');
        console.log('🔑 [AddWorker] فحص رمز المصادقة:', {
          hasToken: !!accessToken,
          tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : 'لا يوجد'
        });
        
        if (!accessToken) {
          throw new Error('لا يوجد رمز مصادقة - يرجى تسجيل الدخول مرة أخرى');
        }
        
        // حفظ القيم في autocomplete_data قبل العملية الأساسية
        console.log('💾 [AddWorker] حفظ في autocomplete...');
        await Promise.all([
          saveAutocompleteValue('workerNames', data.name),
          saveAutocompleteValue('workerTypes', data.type)
        ]);
        console.log('✅ [AddWorker] تم حفظ autocomplete');
        
        console.log('📤 [AddWorker] إرسال طلب إضافة العامل...');
        const result = await apiRequest("/api/workers", "POST", data);
        console.log('✅ [AddWorker] نجح إضافة العامل:', result);
        
        return result;
      } catch (error) {
        console.error('❌ [AddWorker] خطأ في إضافة العامل:', error);
        throw error;
      }
    },
    onSuccess: async (newWorker, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
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
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة العامل";
      toast({
        title: "فشل في إضافة العامل",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addWorkerTypeMutation = useMutation({
    mutationFn: (data: InsertWorkerType) => apiRequest("/api/worker-types", "POST", data),
    onSuccess: async (newWorkerType: WorkerType) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/worker-types"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      toast({
        title: "تم الحفظ",
        description: "تم إضافة نوع العامل بنجاح",
      });
      setNewTypeName("");
      setShowAddTypeDialog(false);
      setType(newWorkerType.name); // اختيار النوع الجديد تلقائياً
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة نوع العامل";
      toast({
        title: "فشل في إضافة نوع العامل",
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
      isActive: true,
    });
  };

  const handleAddNewType = () => {
    if (!newTypeName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم نوع العامل",
        variant: "destructive",
      });
      return;
    }

    addWorkerTypeMutation.mutate({
      name: newTypeName.trim(),
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
          />
        </div>

        <div>
          <Label htmlFor="worker-type" className="block text-sm font-medium text-foreground">
            نوع العامل
          </Label>
          <div className="flex gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="اختر نوع العامل..." />
              </SelectTrigger>
              <SelectContent>
                {loadingTypes ? (
                  <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                ) : (
                  workerTypes.map((workerType) => (
                    <SelectItem key={workerType.id} value={workerType.name}>
                      {workerType.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowAddTypeDialog(true)}
              title="إضافة نوع جديد"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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

      {/* نافذة إضافة نوع عامل جديد */}
      <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة نوع عامل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-type-name" className="block text-sm font-medium text-foreground">
                اسم نوع العامل
              </Label>
              <Input
                id="new-type-name"
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="مثال: بلاط، دهان، تكييف..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewType();
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddTypeDialog(false);
                  setNewTypeName("");
                }}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleAddNewType}
                disabled={addWorkerTypeMutation.isPending}
              >
                {addWorkerTypeMutation.isPending ? "جاري الإضافة..." : "إضافة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}