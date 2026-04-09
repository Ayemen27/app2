import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, FileSpreadsheet, FileText,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useSelectedProjectContext } from "@/contexts/SelectedProjectContext";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import type { PeriodFinalReportData } from "@shared/report-types";
import { COLORS, LoadingSpinner, EmptyState, ReportTable, safeFormatDate, secureDownloadExport } from "./utils";

export function PeriodFinalTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
  const { selectedProjectId, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [autoDateApplied, setAutoDateApplied] = useState(false);

  const projectIdForApi = isAllProjects ? "" : selectedProjectId;

  const { data: projectDateRange, isLoading: isLoadingDateRange, isError: isDateRangeError } = useQuery<{ success: boolean; data: { minDate: string | null; maxDate: string | null } }>({
    queryKey: ["project-date-range", projectIdForApi],
    queryFn: async () => {
      const params = new URLSearchParams({ project_id: projectIdForApi });
      const res = await fetch(`/api/reports/v2/export/project-date-range?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل في جلب نطاق التواريخ');
      return res.json();
    },
    enabled: !!projectIdForApi,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!autoDateApplied) {
      if (projectDateRange?.data) {
        const { minDate, maxDate } = projectDateRange.data;
        if (minDate && maxDate) {
          setDateRange({ from: new Date(minDate), to: new Date(maxDate) });
        } else {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          setDateRange({ from: sixMonthsAgo, to: new Date() });
        }
        setAutoDateApplied(true);
      } else if (isDateRangeError) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        setDateRange({ from: sixMonthsAgo, to: new Date() });
        setAutoDateApplied(true);
      }
    }
  }, [projectDateRange, autoDateApplied, isDateRangeError]);

  useEffect(() => {
    setAutoDateApplied(false);
    setDateRange({});
  }, [projectIdForApi]);

  const dateFrom = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const dateTo = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "";
  const isDateRangeReady = !!dateFrom && !!dateTo;

  const { data: periodReport, isLoading, refetch } = useQuery<PeriodFinalReportData | null>({
    queryKey: ["reports-v2-period-final", projectIdForApi, dateFrom, dateTo],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const params = new URLSearchParams({ project_id: projectIdForApi, dateFrom, dateTo });
      const res = await apiRequest(`/api/reports/v2/period-final?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: !!projectIdForApi && !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (periodReport && onStatsReady) {
      onStatsReady([
        { title: "إجمالي الوارد", value: periodReport.totals?.totalIncome || 0, icon: TrendingUp, color: "blue", formatter: formatCurrency },
        { title: "إجمالي المصروفات", value: periodReport.totals?.totalExpenses || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
        { title: "الرصيد", value: periodReport.totals?.balance || 0, icon: Wallet, color: "green", formatter: formatCurrency },
        {
          title: "نسبة استخدام الميزانية",
          value: periodReport.totals?.budgetUtilization != null ? `${Math.round(periodReport.totals.budgetUtilization)}%` : "غير محدد",
          icon: PieChartIcon,
          color: "orange",
        },
      ]);
    } else if (!periodReport && onStatsReady) {
      onStatsReady([]);
    }
  }, [periodReport, onStatsReady]);

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (!projectIdForApi) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروع أولاً", variant: "destructive" });
      return;
    }
    secureDownloadExport("period-final", fmt, { project_id: projectIdForApi, dateFrom, dateTo }, toast);
  };

  const filterConfig: FilterConfig[] = [{ key: "dateRange", label: "الفترة الزمنية", type: "date-range" }];
  const filterValues: Record<string, any> = { dateRange };
  const onFilterChange = (key: string, val: any) => {
    if (key === "dateRange" && val) setDateRange((prev) => ({ ...prev, ...val }));
  };
  const exportActions: ActionButton[] = [
    { key: "export-excel", icon: FileSpreadsheet, tooltip: "تصدير Excel", onClick: () => handleExport("xlsx"), disabled: !projectIdForApi },
    { key: "export-pdf", icon: FileText, tooltip: "تصدير PDF", onClick: () => handleExport("pdf"), disabled: !projectIdForApi },
  ];

  const pieData = useMemo(() => {
    if (!periodReport?.totals) return [];
    const paidWages = periodReport.totals.totalPaidWages ?? periodReport.totals.totalWages;
    return [
      { name: "أجور العمال المدفوعة", value: paidWages || 0 },
      { name: "حوالات العمال", value: periodReport.totals.totalWorkerTransfers || 0 },
      { name: "المواد", value: periodReport.totals.totalMaterials || 0 },
      { name: "النقل", value: periodReport.totals.totalTransport || 0 },
      { name: "متنوعة", value: periodReport.totals.totalMisc || 0 },
    ].filter((d) => d.value > 0);
  }, [periodReport]);

  return (
    <div className="space-y-4">
      <UnifiedFilterDashboard
        filters={filterConfig}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        actions={exportActions}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في التقرير..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        onReset={() => { setSearchValue(""); setAutoDateApplied(false); setDateRange({}); }}
      />

      {isAllProjects && <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقرير الختامي" icon={BarChart3} />}
      {!isAllProjects && (isLoading || isLoadingDateRange || !isDateRangeReady) && <LoadingSpinner message="جاري تحميل التقرير الختامي..." />}
      {!isAllProjects && !isLoading && !isLoadingDateRange && isDateRangeReady && !periodReport && <EmptyState message="لا توجد بيانات للفترة المحددة" />}

      {periodReport && (() => {
        const q = searchValue.trim().toLowerCase();
        const filteredWorkers = (periodReport.sections?.attendance?.byWorker || []).filter((w: any) =>
          !q || [w.workerName, w.workerType].some((v: string) => v?.toLowerCase().includes(q))
        );
        const filteredMaterials = (periodReport.sections?.materials?.items || []).filter((m: any) =>
          !q || [m.materialName, m.supplierName].some((v: string) => v?.toLowerCase().includes(q))
        );
        const filteredFundTransfers = (periodReport.sections?.fundTransfers?.items || []).filter((f: any) =>
          !q || [f.senderName, f.transferType].some((v: string) => v?.toLowerCase().includes(q))
        );
        const filteredProjectTransfers = (periodReport.sections?.projectTransfers?.items || []).filter((pt: any) =>
          !q || [pt.toProjectName, pt.fromProjectName, pt.reason].some((v: string) => v?.toLowerCase().includes(q))
        );
        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />الإنفاق عبر الزمن</CardTitle></CardHeader>
                <CardContent>
                  {(periodReport.chartData?.length || 0) > 0 ? (
                    <div className="h-[300px] w-full" data-testid="chart-spending-time">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={periodReport.chartData}>
                          <defs>
                            <linearGradient id="colorWages" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorMaterials" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip formatter={(val: number) => formatCurrency(val)} />
                          <Legend />
                          <Area type="monotone" dataKey="wages" name="الأجور" stroke="#2563eb" fill="url(#colorWages)" />
                          <Area type="monotone" dataKey="materials" name="المواد" stroke="#10b981" fill="url(#colorMaterials)" />
                          <Area type="monotone" dataKey="transport" name="النقل" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyState message="لا توجد بيانات رسم بياني" />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="h-4 w-4" />توزيع التكاليف</CardTitle></CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <div className="h-[300px] w-full" data-testid="chart-cost-breakdown">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(val: number) => formatCurrency(val)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyState message="لا توجد بيانات كافية لعرض التوزيع" />}
                </CardContent>
              </Card>
            </div>

            {filteredWorkers.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">ملخص الحضور</CardTitle><Badge variant="secondary">{filteredWorkers.length} عامل</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-period-attendance" headers={["اسم العامل", "النوع", "الأيام", "المستحق", "أجور مدفوعة", "حوالات", "إجمالي المدفوع", "المتبقي"]}
                    rows={filteredWorkers.map((w: any) => [w.workerName, w.workerType, w.totalDays, formatCurrency(w.totalEarned), formatCurrency(w.totalDirectPaid ?? 0), formatCurrency(w.totalTransfers ?? 0), formatCurrency(w.totalPaid ?? (w.totalDirectPaid ?? 0) + (w.totalTransfers ?? 0)), formatCurrency(w.balance ?? 0)])} />
                </CardContent>
              </Card>
            )}

            {filteredMaterials.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">ملخص المواد</CardTitle><Badge variant="secondary">{filteredMaterials.length} مادة</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-period-materials" headers={["اسم المادة", "الكمية", "الإجمالي", "المورد"]}
                    rows={filteredMaterials.map((m: any) => [m.materialName, m.totalQuantity, formatCurrency(m.totalAmount), m.supplierName || "-"])} />
                </CardContent>
              </Card>
            )}

            {filteredFundTransfers.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">تحويلات الصناديق</CardTitle><Badge variant="secondary">{filteredFundTransfers.length}</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-period-fund-transfers" headers={["التاريخ", "المبلغ", "المرسل", "نوع التحويل"]}
                    rows={filteredFundTransfers.map((f: any) => [safeFormatDate(f.date, "dd/MM/yyyy"), formatCurrency(f.amount), f.senderName || "-", f.transferType || "-"])} />
                </CardContent>
              </Card>
            )}

            {filteredProjectTransfers.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">ترحيل الأموال بين المشاريع</CardTitle><Badge variant="secondary">{filteredProjectTransfers.length}</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-period-project-transfers" headers={["التاريخ", "المشروع", "الاتجاه", "السبب", "المبلغ"]}
                    rows={filteredProjectTransfers.map((pt: any) => [safeFormatDate(pt.date, "dd/MM/yyyy"), pt.direction === 'outgoing' ? (pt.toProjectName || '-') : (pt.fromProjectName || '-'), pt.direction === 'outgoing' ? 'صادر' : 'وارد', pt.reason || '-', formatCurrency(pt.amount)])} />
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                    <div className="p-2 rounded bg-red-50 dark:bg-red-950/30"><p className="text-xs text-muted-foreground">إجمالي الصادر</p><p className="font-bold text-red-600">{formatCurrency(periodReport.sections.projectTransfers.totalOutgoing)}</p></div>
                    <div className="p-2 rounded bg-green-50 dark:bg-green-950/30"><p className="text-xs text-muted-foreground">إجمالي الوارد</p><p className="font-bold text-green-600">{formatCurrency(periodReport.sections.projectTransfers.totalIncoming)}</p></div>
                    <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30"><p className="text-xs text-muted-foreground">الصافي</p><p className="font-bold text-blue-600">{formatCurrency(periodReport.sections.projectTransfers.net)}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">ملخص الأقسام</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-md bg-muted/30"><p className="text-xs text-muted-foreground">النقل</p><p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.transport?.total || 0)}</p><p className="text-xs text-muted-foreground">{periodReport.sections?.transport?.tripCount || 0} رحلة</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30"><p className="text-xs text-muted-foreground">مصاريف متنوعة</p><p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.miscExpenses?.total || 0)}</p><p className="text-xs text-muted-foreground">{periodReport.sections?.miscExpenses?.count || 0} عملية</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30"><p className="text-xs text-muted-foreground">تحويلات الصناديق</p><p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.fundTransfers?.total || 0)}</p><p className="text-xs text-muted-foreground">{periodReport.sections?.fundTransfers?.count || 0} تحويل</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30"><p className="text-xs text-muted-foreground">تحويلات العمال</p><p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.workerTransfers?.total || 0)}</p><p className="text-xs text-muted-foreground">{periodReport.sections?.workerTransfers?.count || 0} تحويل</p></div>
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}
    </div>
  );
}
