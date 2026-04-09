import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Building2,
  Info,
  type LucideIcon,
  ArrowRightLeft,
  Users,
  Package,
  Truck,
  DollarSign,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import {
  UnifiedSearchFilter,
  useUnifiedFilter,
} from "@/components/ui/unified-search-filter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSelectedProject, ALL_PROJECTS_ID } from "@/hooks/use-selected-project";
import { UnifiedStats } from "@/components/ui/unified-stats";

function formatCurrency(val: string | number | null | undefined): string {
  const num = parseFloat(String(val || "0"));
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

interface DailySummaryRow {
  id: string;
  project_id: string;
  project_name: string;
  date: string;
  carried_forward_amount: string;
  total_fund_transfers: string;
  total_worker_wages: string;
  total_material_costs: string;
  total_transportation_costs: string;
  total_worker_transfers: string;
  total_worker_misc_expenses: string;
  total_income: string;
  total_expenses: string;
  remaining_balance: string;
  created_at: string;
  updated_at: string;
}

export default function DailySummariesAdminPage() {
  const { toast } = useToast();
  const { selectedProjectId, selectedProjectName } = useSelectedProject();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const isAllProjects = !selectedProjectId || selectedProjectId === ALL_PROJECTS_ID;

  const queryKey = ["/api/daily-summaries", selectedProjectId];
  const queryUrl = isAllProjects
    ? "/api/daily-summaries"
    : `/api/daily-summaries?projectId=${selectedProjectId}`;

  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: DailySummaryRow[]; total: number }>({
    queryKey,
    queryFn: () => apiRequest(queryUrl, "GET"),
    refetchOnWindowFocus: false,
  });

  const allSummaries: DailySummaryRow[] = data?.data || [];
  const total = data?.total || 0;

  const { searchValue, filterValues, onSearchChange, onFilterChange, onReset } =
    useUnifiedFilter<{ dateFrom: string; dateTo: string }>(
      { dateFrom: "", dateTo: "" },
      ""
    );

  const summaries = useMemo(() => {
    let result = allSummaries;

    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter(
        (r) =>
          formatDate(r.date).includes(q) ||
          r.project_name?.toLowerCase().includes(q)
      );
    }

    if (filterValues.dateFrom) {
      result = result.filter((r) => r.date >= filterValues.dateFrom);
    }
    if (filterValues.dateTo) {
      result = result.filter((r) => r.date <= filterValues.dateTo);
    }

    return result;
  }, [allSummaries, searchValue, filterValues]);

  const totalIncome = summaries.reduce((s, r) => s + parseFloat(r.total_income || "0"), 0);
  const totalExpenses = summaries.reduce((s, r) => s + parseFloat(r.total_expenses || "0"), 0);
  const uniqueProjects = new Set(summaries.map((r) => r.project_id)).size;

  const deleteMutation = useMutation({
    mutationFn: () => {
      const url = isAllProjects
        ? "/api/daily-summaries"
        : `/api/daily-summaries?projectId=${selectedProjectId}`;
      return apiRequest(url, "DELETE");
    },
    onSuccess: (res: any) => {
      toast({ title: "تم الحذف بنجاح", description: res?.message || "تم حذف الملخصات اليومية" });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summaries"] });
    },
    onError: () => {
      toast({ title: "فشل الحذف", description: "حدث خطأ أثناء حذف الملخصات", variant: "destructive" });
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/daily-summaries/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم الحذف", description: "تم حذف الملخص بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summaries"] });
      setDeleteTargetId(null);
    },
    onError: () => {
      toast({ title: "فشل الحذف", description: "حدث خطأ أثناء حذف الملخص", variant: "destructive" });
    },
  });

  const rebuildMutation = useMutation({
    mutationFn: () => {
      const url = isAllProjects
        ? "/api/daily-summaries/rebuild"
        : `/api/daily-summaries/rebuild?projectId=${selectedProjectId}`;
      return apiRequest(url, "POST");
    },
    onSuccess: (res: any) => {
      toast({ title: "تمت إعادة البناء بنجاح", description: res?.message || "تمت إعادة بناء الملخصات اليومية" });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summaries"] });
    },
    onError: () => {
      toast({ title: "فشلت إعادة البناء", description: "حدث خطأ أثناء إعادة بناء الملخصات", variant: "destructive" });
    },
  });

  const isBusy = deleteMutation.isPending || rebuildMutation.isPending || deleteOneMutation.isPending;
  const projectLabel = isAllProjects ? "جميع المشاريع" : (selectedProjectName || "المشروع المحدد");

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24 md:pb-8" dir="rtl">

      {/* شريط الأزرار */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-8 px-3 text-[11px] font-bold flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
            data-testid="badge-project-label"
          >
            <Building2 className="h-3.5 w-3.5" />
            {projectLabel}
          </Badge>
          <Badge
            variant="outline"
            className="h-8 px-3 text-[11px] font-medium rounded-full bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
            data-testid="badge-total-count"
          >
            {total.toLocaleString("en-US")} ملخص
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* حذف الجميع */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-[11px] font-medium border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                disabled={isBusy || total === 0}
                data-testid="button-delete-all"
              >
                {deleteMutation.isPending ? <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="ml-1.5 h-3.5 w-3.5" />}
                حذف جميع الملخصات
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-right">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  تأكيد الحذف
                </AlertDialogTitle>
                <AlertDialogDescription className="text-right">
                  سيتم حذف <strong>{total.toLocaleString("en-US")}</strong> ملخص يومي
                  {isAllProjects ? " لجميع المشاريع" : ` للمشروع: ${selectedProjectName}`}.
                  <br />
                  هذا الإجراء لا يمكن التراجع عنه، لكن يمكنك إعادة البناء لاحقاً.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700 text-white rounded-xl" data-testid="button-confirm-delete">
                  نعم، احذف الملخصات
                </AlertDialogAction>
                <AlertDialogCancel className="rounded-xl" data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* إعادة البناء */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 rounded-full text-[11px] font-medium bg-primary hover:bg-primary/90"
                disabled={isBusy}
                data-testid="button-rebuild-all"
              >
                {rebuildMutation.isPending ? <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="ml-1.5 h-3.5 w-3.5" />}
                إعادة بناء الملخصات
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-right">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  تأكيد إعادة البناء
                </AlertDialogTitle>
                <AlertDialogDescription className="text-right">
                  سيتم إعادة حساب وبناء جميع الملخصات اليومية{" "}
                  {isAllProjects ? "لجميع المشاريع" : `للمشروع: ${selectedProjectName}`}.
                  <br />
                  قد تستغرق هذه العملية بعض الوقت حسب حجم البيانات.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction onClick={() => rebuildMutation.mutate()} className="bg-primary hover:bg-primary/90 rounded-xl" data-testid="button-confirm-rebuild">
                  نعم، أعد البناء
                </AlertDialogAction>
                <AlertDialogCancel className="rounded-xl" data-testid="button-cancel-rebuild">إلغاء</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* الإحصائيات */}
      <UnifiedStats
        columns={4}
        stats={[
          { title: "إجمالي الملخصات", value: summaries.length.toLocaleString("en-US"), color: "blue", icon: CalendarDays as LucideIcon },
          { title: "إجمالي الإيرادات", value: formatCurrency(totalIncome), color: "green", icon: TrendingUp as LucideIcon },
          { title: "إجمالي المصروفات", value: formatCurrency(totalExpenses), color: "red", icon: TrendingDown as LucideIcon },
          {
            title: isAllProjects ? "عدد المشاريع" : "الرصيد الأخير",
            value: isAllProjects ? uniqueProjects.toLocaleString("en-US") : formatCurrency(summaries[0]?.remaining_balance),
            color: "purple",
            icon: (isAllProjects ? Building2 : Wallet) as LucideIcon,
          },
        ]}
      />

      {/* شريط البحث والفلترة */}
      <UnifiedSearchFilter
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="بحث بالتاريخ أو اسم المشروع..."
        filters={[
          {
            key: "dateFrom",
            label: "من تاريخ",
            type: "date",
            placeholder: "من تاريخ",
          },
          {
            key: "dateTo",
            label: "إلى تاريخ",
            type: "date",
            placeholder: "إلى تاريخ",
          },
        ]}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        onReset={onReset}
        showResetButton
        showActiveFilters
      />

      {/* مؤشر التحميل أو العملية الجارية */}
      {(rebuildMutation.isPending || deleteMutation.isPending) && (
        <Card className="rounded-2xl border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 backdrop-blur-md">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {rebuildMutation.isPending ? "جاري إعادة بناء الملخصات... قد تستغرق العملية بعض الوقت" : "جاري حذف الملخصات..."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* نافذة تأكيد حذف ملخص واحد */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent dir="rtl" className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-right">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              حذف الملخص
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف هذا الملخص اليومي؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={() => deleteTargetId && deleteOneMutation.mutate(deleteTargetId)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              disabled={deleteOneMutation.isPending}
            >
              {deleteOneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، احذف"}
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* الجدول / البطاقات */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">الملخصات اليومية</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isAllProjects ? "عرض ملخصات جميع المشاريع" : `مشروع: ${selectedProjectName}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isBusy}
              className="h-8 w-8 rounded-xl p-0"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
              <p className="text-sm text-muted-foreground animate-pulse">جاري تحميل الملخصات...</p>
            </div>
          ) : summaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <Info className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">لا توجد ملخصات يومية</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {allSummaries.length > 0
                  ? "لا توجد نتائج تطابق البحث أو الفلترة المحددة."
                  : isAllProjects
                    ? "لم يتم بناء أي ملخصات بعد. اضغط على زر إعادة البناء لإنشائها."
                    : "لا توجد ملخصات لهذا المشروع. اضغط على إعادة البناء لإنشائها."}
              </p>
            </div>
          ) : (
            <>
              {/* جدول - شاشات متوسطة وكبيرة */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      {isAllProjects && (
                        <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400 w-28">المشروع</TableHead>
                      )}
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400 w-24">التاريخ</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">المرحّل</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">تحويلات الصندوق</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">الإيرادات</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">الأجور</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">المواد</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">النقل</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">تحويلات العمال</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">متنوعة</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">إجمالي المصروف</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">الرصيد</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((row, idx) => {
                      const balance = parseFloat(row.remaining_balance || "0");
                      const isPositive = balance >= 0;
                      return (
                        <TableRow
                          key={row.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                          data-testid={`row-summary-${idx}`}
                        >
                          {isAllProjects && (
                            <TableCell className="text-xs font-medium py-2">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate max-w-[100px]">{row.project_name || row.project_id}</span>
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-xs font-mono py-2" data-testid={`text-date-${idx}`}>
                            {formatDate(row.date)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">
                            {formatCurrency(row.carried_forward_amount)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2">
                            {formatCurrency(row.total_fund_transfers)}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-emerald-700 dark:text-emerald-400 py-2">
                            {formatCurrency(row.total_income)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2">
                            {formatCurrency(row.total_worker_wages)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2">
                            {formatCurrency(row.total_material_costs)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2">
                            {formatCurrency(row.total_transportation_costs)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2">
                            {formatCurrency(row.total_worker_transfers)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2">
                            {formatCurrency(row.total_worker_misc_expenses)}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-red-600 dark:text-red-400 py-2">
                            {formatCurrency(row.total_expenses)}
                          </TableCell>
                          <TableCell className="py-2">
                            <span className={`text-xs font-bold ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                              {isPositive ? "+" : ""}{formatCurrency(row.remaining_balance)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                              onClick={() => setDeleteTargetId(row.id)}
                              disabled={isBusy}
                              data-testid={`button-delete-row-${idx}`}
                              title="حذف هذا الملخص"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* بطاقات - شاشات الهاتف */}
              <div className="md:hidden p-3">
                <UnifiedCardGrid columns={1}>
                  {summaries.map((row, idx) => {
                    const balance = parseFloat(row.remaining_balance || "0");
                    const isPositive = balance >= 0;
                    return (
                      <UnifiedCard
                        key={row.id}
                        data-testid={`card-summary-${idx}`}
                        compact
                        title={formatDate(row.date)}
                        titleIcon={CalendarDays}
                        subtitle={isAllProjects ? (row.project_name || row.project_id) : undefined}
                        badges={[
                          {
                            label: isPositive
                              ? `+${formatCurrency(row.remaining_balance)}`
                              : formatCurrency(row.remaining_balance),
                            variant: isPositive ? "success" : "destructive",
                          },
                        ]}
                        fields={[
                          { label: "المرحّل", value: formatCurrency(row.carried_forward_amount), color: "muted", icon: ArrowRightLeft },
                          { label: "تحويلات الصندوق", value: formatCurrency(row.total_fund_transfers), color: "info", icon: Banknote },
                          { label: "الإيرادات", value: formatCurrency(row.total_income), color: "success", icon: TrendingUp },
                          { label: "الأجور", value: formatCurrency(row.total_worker_wages), color: "default", icon: Users },
                          { label: "المواد", value: formatCurrency(row.total_material_costs), color: "default", icon: Package },
                          { label: "النقل", value: formatCurrency(row.total_transportation_costs), color: "default", icon: Truck },
                          { label: "تحويلات العمال", value: formatCurrency(row.total_worker_transfers), color: "default", icon: ArrowRightLeft },
                          { label: "متنوعة", value: formatCurrency(row.total_worker_misc_expenses), color: "default", icon: DollarSign },
                          { label: "إجمالي المصروف", value: formatCurrency(row.total_expenses), color: "danger", icon: TrendingDown, emphasis: true },
                          { label: "الرصيد المتبقي", value: (isPositive ? "+" : "") + formatCurrency(row.remaining_balance), color: isPositive ? "success" : "danger", icon: Wallet, emphasis: true },
                        ]}
                        actions={[
                          {
                            icon: Trash2,
                            label: "حذف",
                            onClick: () => setDeleteTargetId(row.id),
                            color: "red",
                            disabled: isBusy,
                          },
                        ]}
                      />
                    );
                  })}
                </UnifiedCardGrid>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {summaries.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>
            عرض {summaries.length.toLocaleString("en-US")}
            {summaries.length !== total && ` (من أصل ${total.toLocaleString("en-US")})`} ملخص
          </span>
        </div>
      )}
    </div>
  );
}
