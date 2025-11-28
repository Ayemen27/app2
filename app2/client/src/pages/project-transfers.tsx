import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectFundTransferSchema } from "@shared/schema";
import type { InsertProjectFundTransfer, ProjectFundTransfer, Project } from "@shared/schema";
import { ArrowRightLeft, ArrowRight, Calendar, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, Minus, MoreVertical, Plus, ChevronRight, RefreshCw, Download, Upload, Settings, BarChart3, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import UnifiedSearchFilter, { useUnifiedFilter, FilterConfig } from "@/components/ui/unified-search-filter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { StatsCard } from "@/components/ui/stats-card";
import { cn } from "@/lib/utils";
import { z } from "zod";

type TransferFormData = z.infer<typeof insertProjectFundTransferSchema>;

export default function ProjectTransfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTransfer, setEditingTransfer] = useState<ProjectFundTransfer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter Configs
  const filterConfigs: FilterConfig[] = [
    {
      key: 'reason',
      label: 'السبب',
      type: 'select',
      placeholder: 'اختر السبب',
      options: [
        { value: 'payroll', label: 'الرواتب' },
        { value: 'materials', label: 'المواد' },
        { value: 'tools', label: 'الأدوات' },
        { value: 'maintenance', label: 'الصيانة' },
        { value: 'emergency', label: 'طارئ' },
        { value: 'other', label: 'أخرى' },
      ]
    },
    {
      key: 'dateRange',
      label: 'الفترة الزمنية',
      type: 'date-range',
      placeholder: 'اختر الفترة'
    }
  ];

  const { searchValue, filterValues, onSearchChange, onFilterChange, onReset } = useUnifiedFilter(
    { reason: '', dateRange: { from: undefined, to: undefined } },
    ''
  );

  // Fetch Projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch All Transfers
  const { data: allTransfers = [], isLoading: transfersLoading, refetch } = useQuery<ProjectFundTransfer[]>({
    queryKey: ["/api/project-fund-transfers"],
    queryFn: async () => {
      const response = await apiRequest('/api/project-fund-transfers', 'GET');
      return response.data || [];
    },
  });

  // Filter transfers based on search and filters
  const filteredTransfers = useMemo(() => {
    let filtered = allTransfers;

    if (searchValue) {
      const search = searchValue.toLowerCase();
      filtered = filtered.filter(t => 
        t.transferReason?.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        projects.find(p => p.id === t.fromProjectId)?.name.toLowerCase().includes(search) ||
        projects.find(p => p.id === t.toProjectId)?.name.toLowerCase().includes(search)
      );
    }

    if (filterValues.reason) {
      filtered = filtered.filter(t => t.transferReason?.includes(filterValues.reason));
    }

    if (filterValues.dateRange?.from || filterValues.dateRange?.to) {
      const from = filterValues.dateRange.from ? new Date(filterValues.dateRange.from).getTime() : 0;
      const to = filterValues.dateRange.to ? new Date(filterValues.dateRange.to).getTime() : Infinity;
      filtered = filtered.filter(t => {
        const date = new Date(t.transferDate).getTime();
        return date >= from && date <= to;
      });
    }

    return filtered;
  }, [allTransfers, searchValue, filterValues, projects]);

  // Calculate Stats
  const stats = useMemo(() => {
    return {
      total: allTransfers.length,
      totalAmount: allTransfers.reduce((sum, t) => sum + (parseFloat(t.amount?.toString() || '0') || 0), 0),
      filtered: filteredTransfers.length,
      outgoing: filteredTransfers.filter(t => !filteredTransfers.some(other => other.fromProjectId === other.toProjectId)).length,
      incoming: filteredTransfers.filter(t => filteredTransfers.some(other => other.toProjectId === other.fromProjectId)).length,
    };
  }, [allTransfers, filteredTransfers]);

  // Mutations
  const createTransferMutation = useMutation({
    mutationFn: async (data: InsertProjectFundTransfer) => {
      if (editingTransfer) {
        return apiRequest(`/api/project-fund-transfers/${editingTransfer.id}`, "PATCH", data);
      }
      return apiRequest("/api/project-fund-transfers", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-fund-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({
        title: "تم بنجاح",
        description: editingTransfer ? "تم تحديث عملية الترحيل" : "تم إنشاء عملية ترحيل جديدة",
      });
      form.reset();
      setEditingTransfer(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حفظ عملية الترحيل",
        variant: "destructive",
      });
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ [Client] حذف التحويل:', id);
      const result = await apiRequest(`/api/project-fund-transfers/${id}`, "DELETE");
      console.log('✅ [Client] نتيجة الحذف:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('✅ [Client] نجح الحذف، تحديث البيانات...', variables);
      // تحديث البيانات مباشرة من البيانات المحفوظة
      queryClient.setQueryData(["/api/project-fund-transfers"], (oldData: any) => {
        console.log('📊 [Client] البيانات القديمة:', oldData);
        const filtered = oldData?.data?.filter((t: any) => t.id !== variables) || [];
        const result = { ...oldData, data: filtered, success: true };
        console.log('📊 [Client] البيانات الجديدة:', result);
        return result;
      });
      
      // إبطال الاستعلامات
      queryClient.invalidateQueries({ queryKey: ["/api/project-fund-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      
      toast({
        title: "تم الحذف",
        description: "تم حذف عملية الترحيل بنجاح",
      });
    },
    onError: (error: any) => {
      console.error('❌ [Client] خطأ في الحذف:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف عملية الترحيل",
        variant: "destructive",
      });
    },
  });

  // Form
  const form = useForm<TransferFormData>({
    resolver: zodResolver(insertProjectFundTransferSchema),
    defaultValues: {
      fromProjectId: "",
      toProjectId: "",
      amount: "",
      transferReason: "",
      transferDate: new Date().toISOString().split('T')[0],
      description: "",
    },
  });

  const onSubmit = (data: TransferFormData) => {
    createTransferMutation.mutate(data);
  };

  const startEdit = (transfer: ProjectFundTransfer) => {
    setEditingTransfer(transfer);
    form.reset({
      fromProjectId: transfer.fromProjectId,
      toProjectId: transfer.toProjectId,
      amount: transfer.amount,
      transferReason: transfer.transferReason || "",
      transferDate: transfer.transferDate,
      description: transfer.description || "",
    });
    setSelectedTab('create');
  };

  const getProjectName = (projectId: string) => {
    return projects.find((p: Project) => p.id === projectId)?.name || "غير محدد";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ريال';
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col" dir="rtl">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3 md:px-6 md:py-6 w-full space-y-4 md:space-y-8">
          {/* Stats Cards - 3 in row */}
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <div>
              <StatsCard
                icon={ArrowRightLeft}
                label="إجمالي العمليات"
                value={stats.total}
                gradient="from-amber-500 to-orange-500"
                iconBg="bg-amber-100 dark:bg-amber-900/30"
                iconColor="text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <StatsCard
                icon={DollarSign}
                label="إجمالي المبالغ"
                value={formatCurrency(stats.totalAmount)}
                gradient="from-green-500 to-emerald-500"
                iconBg="bg-green-100 dark:bg-green-900/30"
                iconColor="text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <StatsCard
                icon={TrendingDown}
                label="النتائج المفلترة"
                value={stats.filtered}
                gradient="from-blue-500 to-indigo-500"
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <StatsCard
                icon={TrendingUp}
                label="عمليات اليوم"
                value={filteredTransfers.filter(t => new Date(t.transferDate).toDateString() === new Date().toDateString()).length}
                gradient="from-purple-500 to-pink-500"
                iconBg="bg-purple-100 dark:bg-purple-900/30"
                iconColor="text-purple-600 dark:text-purple-400"
              />
            </div>
            <div>
              <StatsCard
                icon={Calendar}
                label="متوسط العملية"
                value={formatCurrency(stats.total > 0 ? stats.totalAmount / stats.total : 0)}
                gradient="from-rose-500 to-pink-500"
                iconBg="bg-rose-100 dark:bg-rose-900/30"
                iconColor="text-rose-600 dark:text-rose-400"
              />
            </div>
            <div>
              <StatsCard
                icon={BarChart3}
                label="المشاريع النشطة"
                value={projects.length}
                gradient="from-cyan-500 to-blue-500"
                iconBg="bg-cyan-100 dark:bg-cyan-900/30"
                iconColor="text-cyan-600 dark:text-cyan-400"
              />
            </div>
          </div>

          {/* Unified Filter */}
          <UnifiedSearchFilter
            showSearch={true}
            searchPlaceholder="ابحث عن التحويلات..."
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            filters={filterConfigs}
            filterValues={filterValues}
            onFilterChange={onFilterChange}
            onReset={onReset}
            showResetButton={true}
            compact={false}
            showActiveFilters={true}
          />

          {/* List Tab Content - Always Displayed */}
          <div className="space-y-4 md:space-y-6">
              {transfersLoading ? (
                <div className="space-y-4 md:space-y-6">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="bg-white dark:bg-slate-900">
                      <CardContent className="p-4 md:p-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredTransfers.length === 0 ? (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <ArrowRightLeft className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">لا توجد تحويلات</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ابدأ بإضافة تحويل عهدة جديد</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {filteredTransfers.map(transfer => (
                    <Card key={transfer.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                              <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                                {formatCurrency(parseFloat(transfer.amount))}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {new Date(transfer.transferDate).toLocaleDateString('ar-EG')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mb-1">
                              <span>{getProjectName(transfer.fromProjectId)}</span>
                              <ArrowRight className="h-4 w-4" />
                              <span>{getProjectName(transfer.toProjectId)}</span>
                            </div>
                            {transfer.transferReason && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-medium">السبب:</span> {transfer.transferReason}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(transfer)}
                              className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTransferMutation.mutate(transfer.id)}
                              className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Floating Button for Create */}
      <div className="fixed bottom-10 left-6 z-50">
        <Button
          onClick={() => {
            setShowCreateModal(!showCreateModal);
            if (showCreateModal) {
              setEditingTransfer(null);
              form.reset();
            }
          }}
          className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center border-0"
        >
          {showCreateModal ? (
            <Minus className="h-5 w-5 md:h-6 md:w-6" />
          ) : (
            <Plus className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </Button>
      </div>

      {/* Modal for Create/Edit */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl w-full max-h-[90vh] md:max-h-[80vh] md:w-full md:max-w-2xl rounded-t-2xl md:rounded-xl overflow-y-auto">
            <CardHeader className="sticky top-0 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 md:p-5 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white text-base md:text-lg">
                  {editingTransfer ? 'تعديل عملية الترحيل' : 'إضافة عملية ترحيل جديدة'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTransfer(null);
                    form.reset();
                  }}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pb-4 md:pb-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                      {/* Row 1: Projects */}
                      <div className="grid grid-cols-2 gap-2 md:gap-4">
                        <FormField
                          control={form.control}
                          name="fromProjectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">المشروع المرسل</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="h-10 md:h-11 border-2 text-xs md:text-sm">
                                    <SelectValue placeholder="المرسل" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {projects.map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="toProjectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">المشروع المستقبل</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="h-10 md:h-11 border-2 text-xs md:text-sm">
                                    <SelectValue placeholder="المستقبل" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {projects.map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Row 2: Date and Amount */}
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <FormField
                          control={form.control}
                          name="transferDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">التاريخ</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="h-10 md:h-11 border-2 text-xs md:text-sm" />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold">المبلغ (ريال)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0" {...field} className="h-10 md:h-11 border-2 text-xs md:text-sm" />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Row 3: Reason */}
                      <FormField
                        control={form.control}
                        name="transferReason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">سبب التحويل</FormLabel>
                            <FormControl>
                              <Input placeholder="أدخل السبب" {...field} value={field.value || ""} className="h-10 md:h-11 border-2" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Row 4: Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">الملاحظات (اختياري)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="أدخل أي ملاحظات" {...field} value={field.value || ""} className="border-2 min-h-24 md:min-h-28" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Action Buttons - Sticky */}
                      <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 mt-6 -mx-4 md:-mx-6 z-50 flex gap-3 shadow-lg">
                        <Button
                          type="submit"
                          disabled={createTransferMutation.isPending}
                          className="flex-1 h-10 md:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30"
                        >
                          {createTransferMutation.isPending ? "جاري الحفظ..." : (editingTransfer ? "تحديث" : "إضافة تحويل")}
                        </Button>
                        {editingTransfer && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingTransfer(null);
                              form.reset();
                            }}
                            className="flex-1 h-10 md:h-11 border-2"
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
