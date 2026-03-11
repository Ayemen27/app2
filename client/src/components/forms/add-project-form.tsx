import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { Plus, Save, XCircle, RefreshCw } from "lucide-react";
import type { InsertProject } from "@shared/schema";

interface AddProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddProjectForm({ onSuccess, onCancel }: AddProjectFormProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [projectTypeId, setProjectTypeId] = useState<number | null>(null);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projectTypeOptions = [], isLoading: typesLoading } = useQuery<{ value: string; label: string; id: number | null }[]>({
    queryKey: QUERY_KEYS.projectTypes,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/autocomplete/project-types", "GET");
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 60000,
  });

  const addProjectTypeMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest("/api/autocomplete/project-types", "POST", { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectTypes });
    },
  });

  const deleteProjectTypeMutation = useMutation({
    mutationFn: async (label: string) => {
      return apiRequest(`/api/autocomplete/project-types/${encodeURIComponent(label)}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectTypes });
    },
  });

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

  const addProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      await Promise.all([
        saveAutocompleteValue('projectNames', data.name),
        saveAutocompleteValue('projectDescriptions', data.description)
      ]);
      return apiRequest("/api/projects", "POST", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      toast({
        title: "تم الحفظ",
        description: "تم إضافة المشروع بنجاح",
      });
      setName("");
      setStatus("active");
      setDescription("");
      setProjectTypeId(null);
      onSuccess?.();
    },
    onError: async (error: any, variables) => {
      await saveAutocompleteValue('projectNames', variables.name);
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة المشروع";
      toast({
        title: "فشل في إضافة المشروع",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المشروع",
        variant: "destructive",
      });
      return;
    }

    addProjectMutation.mutate({
      name: name.trim(),
      status,
      description: description || null,
      project_type_id: projectTypeId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CompactFieldGroup columns={2}>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            اسم المشروع *
          </Label>
          <AutocompleteInput
            category="projectNames"
            value={name}
            onChange={setName}
            placeholder="أدخل اسم المشروع..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            حالة المشروع
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="اختر حالة المشروع..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="paused">متوقف</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label className="text-sm font-medium text-foreground">
            نوع المشروع
          </Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchableSelect
                value={projectTypeId?.toString() || ""}
                onValueChange={(val) => setProjectTypeId(val ? parseInt(val) : null)}
                options={[
                  { value: '', label: 'بدون نوع' },
                  ...projectTypeOptions
                ]}
                placeholder={typesLoading ? "جاري التحميل..." : "اختر نوع المشروع..."}
                searchPlaceholder="ابحث عن نوع..."
                emptyText="لا توجد أنواع"
                allowCustom
                onCustomAdd={async (value) => {
                  const result = await addProjectTypeMutation.mutateAsync(value);
                  if (result?.data?.id) {
                    setProjectTypeId(result.data.id);
                  }
                }}
                onDeleteOption={(label) => {
                  const opt = projectTypeOptions.find(o => o.value === label || o.label === label);
                  if (opt) deleteProjectTypeMutation.mutate(opt.label);
                }}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setIsAddingType(!isAddingType)}
              data-testid="button-add-project-type"
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
                data-testid="input-new-project-type"
              />
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  if (newTypeName.trim()) {
                    const result = await addProjectTypeMutation.mutateAsync(newTypeName.trim());
                    if (result?.data?.id) {
                      setProjectTypeId(result.data.id);
                    }
                    setNewTypeName("");
                    setIsAddingType(false);
                  }
                }}
                disabled={!newTypeName.trim() || addProjectTypeMutation.isPending}
                data-testid="button-save-project-type"
              >
                {addProjectTypeMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => { setIsAddingType(false); setNewTypeName(""); }}
                data-testid="button-cancel-project-type"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 col-span-2">
          <Label className="text-sm font-medium text-foreground">
            وصف المشروع
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="أدخل وصف المشروع (اختياري)"
          />
        </div>
      </CompactFieldGroup>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={addProjectMutation.isPending}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {addProjectMutation.isPending ? "جاري الإضافة..." : "إضافة المشروع"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}
