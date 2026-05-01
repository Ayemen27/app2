import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { ArrowUpDown, Package } from "lucide-react";

const bulkTransferSchema = z.object({
  toProjectId: z.string().nullable(),
  reason: z.string().min(1, "سبب النقل مطلوب"),
  performedBy: z.string().min(1, "اسم من قام بالنقل مطلوب"),
  notes: z.string().optional(),
  transferDate: z.string().min(1, "تاريخ النقل مطلوب"),
});

type BulkTransferFormData = z.infer<typeof bulkTransferSchema>;

interface BulkTransferEquipmentDialogProps {
  equipmentIds: number[];
  equipmentNames?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  projects: any[];
}

export function BulkTransferEquipmentDialog({
  equipmentIds,
  equipmentNames = [],
  open,
  onOpenChange,
  onSuccess,
  projects,
}: BulkTransferEquipmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BulkTransferFormData>({
    resolver: zodResolver(bulkTransferSchema),
    defaultValues: {
      toProjectId: null,
      reason: "",
      performedBy: "",
      notes: "",
      transferDate: new Date().toISOString().slice(0, 10),
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        toProjectId: null,
        reason: "",
        performedBy: "",
        notes: "",
        transferDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open]);

  const transferMutation = useMutation({
    mutationFn: (data: BulkTransferFormData) =>
      apiRequest(`/api/equipment/bulk-transfer`, "POST", {
        ...data,
        equipmentIds,
        toProjectId: data.toProjectId || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipment });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipmentMovements });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
      toast({
        title: "نجح النقل",
        description: `تم نقل ${equipmentIds.length} معدة بنجاح`,
        variant: "default",
      });
      form.reset();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في النقل الجماعي",
        description: toUserMessage(error, "فشل في نقل المعدات"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkTransferFormData) => {
    transferMutation.mutate(data);
  };

  const projectOptions: SelectOption[] = [
    { value: "warehouse", label: "المستودع" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir="rtl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowUpDown className="h-5 w-5" />
            نقل جماعي للأصول
          </DialogTitle>
          <DialogDescription className="text-sm">
            نقل {equipmentIds.length} معدة محددة إلى موقع جديد
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  المعدات المحددة ({equipmentIds.length})
                </span>
              </div>
              {equipmentNames.length > 0 && (
                <div
                  className="text-xs text-blue-800 dark:text-blue-300 max-h-20 overflow-y-auto leading-relaxed"
                  data-testid="text-bulk-equipment-names"
                >
                  {equipmentNames.slice(0, 8).join("، ")}
                  {equipmentNames.length > 8 && ` ... و${equipmentNames.length - 8} أخرى`}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="transferDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">تاريخ النقل *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      {...field}
                      data-testid="input-bulk-transfer-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toProjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">المشروع المقصود *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || ""}
                      onValueChange={(value) => field.onChange(value === "warehouse" ? null : value)}
                      options={projectOptions}
                      placeholder="اختر المشروع المقصود (أو المستودع)"
                      searchPlaceholder="ابحث عن مشروع..."
                      emptyText="لا توجد مشاريع"
                      triggerClassName="h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CompactFieldGroup columns={2}>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">سبب النقل *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="سبب النقل"
                        className="h-9 text-sm"
                        {...field}
                        data-testid="input-bulk-transfer-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="performedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">تم بواسطة *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="اسم المسؤول"
                        className="h-9 text-sm"
                        {...field}
                        data-testid="input-bulk-performed-by"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CompactFieldGroup>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ملاحظات أو تفاصيل إضافية..."
                      className="resize-none text-sm"
                      {...field}
                      autoHeight
                      minRows={2}
                      maxRows={6}
                      data-testid="textarea-bulk-transfer-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9 text-sm"
                data-testid="button-cancel-bulk-transfer"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={transferMutation.isPending || equipmentIds.length === 0}
                className="h-9 text-sm"
                data-testid="button-confirm-bulk-transfer"
              >
                {transferMutation.isPending
                  ? "جاري النقل..."
                  : `تأكيد نقل ${equipmentIds.length} معدة`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
