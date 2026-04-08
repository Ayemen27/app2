import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Wallet, Users, BarChart3, AlertCircle, Building2,
  FileSpreadsheet, FileText, PieChart as PieChartIcon, DollarSign, Droplets, Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useSelectedProjectContext } from "@/contexts/SelectedProjectContext";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import type { ProjectComprehensiveReportData } from "@shared/report-types";
import { COLORS, LoadingSpinner, EmptyState, safeFormatDate, secureDownloadExport } from "./utils";

export function ProjectComprehensiveTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
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

  const { data: report, isLoading, isError, error, refetch } = useQuery<ProjectComprehensiveReportData | null>({
    queryKey: ["reports-v2-project-comprehensive", projectIdForApi, dateFrom, dateTo],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const params = new URLSearchParams({ project_id: projectIdForApi, dateFrom, dateTo });
      const res = await apiRequest(`/api/reports/v2/export/project-comprehensive?${params.toString()}&format=json`, "GET");
      const data = res?.data || res;
      if (!data || typeof data !== 'object' || !data.reportType) return null;
      return data;
    },
    enabled: !!projectIdForApi && !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (report && onStatsReady) {
      onStatsReady([
        { title: "إجمالي الوارد", value: report.totals?.totalIncome || 0, icon: TrendingUp, color: "blue", formatter: formatCurrency },
        { title: "إجمالي المصروفات", value: report.totals?.totalExpenses || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
        { title: "الرصيد", value: report.totals?.balance || 0, icon: Wallet, color: "green", formatter: formatCurrency },
        { title: "عدد العمال", value: report.workforce?.totalWorkers || 0, icon: Users, color: "purple" },
      ]);
    } else if (!report && onStatsReady) {
      onStatsReady([]);
    }
  }, [report, onStatsReady]);

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (!projectIdForApi) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروع أولاً", variant: "destructive" });
      return;
    }
    secureDownloadExport("project-comprehensive", fmt, { project_id: projectIdForApi, dateFrom, dateTo }, toast);
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
    if (!report?.totals) return [];
    return [
      { name: "الأجور", value: report.totals.totalWages || 0 },
      { name: "المواد", value: report.totals.totalMaterials || 0 },
      { name: "النقل", value: report.totals.totalTransport || 0 },
      { name: "متنوعة", value: report.totals.totalMisc || 0 },
      { name: "تحويلات عمال", value: report.totals.totalWorkerTransfers || 0 },
    ].filter((d) => d.value > 0);
  }, [report]);

  const statusMap: Record<string, string> = {
    pending: 'قيد الانتظار', in_progress: 'جارية', completed: 'مكتملة',
    active: 'نشط', cancelled: 'ملغية', on_hold: 'معلّقة',
    consumed: 'مستهلك', missing: 'مفقود', disposed: 'تم التخلص',
    transferred: 'منقول', out_of_service: 'خارج الخدمة',
    operational: 'تشغيلي', idle: 'عاطل', sold: 'مباع',
    maintenance: 'صيانة', inactive: 'غير نشط',
  };

  return (
    <div className="space-y-4">
      <UnifiedFilterDashboard
        filters={filterConfig}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        actions={exportActions}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في التقرير الشامل..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        onReset={() => { setSearchValue(""); setAutoDateApplied(false); setDateRange({}); }}
      />

      {isAllProjects && <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقرير الشامل" icon={Building2} />}
      {!isAllProjects && (isLoading || isLoadingDateRange || !isDateRangeReady) && <LoadingSpinner message="جاري تحميل التقرير الشامل..." />}
      {!isAllProjects && !isLoading && !isLoadingDateRange && isDateRangeReady && isError && <EmptyState message={`حدث خطأ أثناء تحميل التقرير: ${(error as any)?.message || 'خطأ غير معروف'}`} icon={AlertCircle} />}
      {!isAllProjects && !isLoading && !isLoadingDateRange && isDateRangeReady && !isError && !report && <EmptyState message="لا توجد بيانات للفترة المحددة" />}

      {report && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="h-4 w-4" />توزيع التكاليف</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="h-[300px] w-full" data-testid="chart-comprehensive-pie">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyState message="لا توجد بيانات" />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />ملخص المصروفات</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="expense-summary-comprehensive">
                  {[
                    { label: "أجور العمال", value: report.totals.totalWages, color: "#2563eb" },
                    { label: "مشتريات المواد", value: report.totals.totalMaterials, color: "#10b981" },
                    { label: "مصاريف النقل", value: report.totals.totalTransport, color: "#f59e0b" },
                    { label: "مصاريف متنوعة", value: report.totals.totalMisc, color: "#ef4444" },
                    { label: "حوالات العمال", value: report.totals.totalWorkerTransfers, color: "#8b5cf6" },
                  ].map((item) => {
                    const pct = report.totals.totalExpenses > 0 ? (item.value / report.totals.totalExpenses * 100) : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm"><span>{item.label}</span><span className="font-semibold">{formatCurrency(item.value)}</span></div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: item.color }} />
                        </div>
                        <div className="text-xs text-muted-foreground text-left">{pct.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {(report.workforce?.topWorkers?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />القوى العاملة ({report.workforce.totalWorkers} عامل، {report.workforce.activeWorkers} نشط)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-comprehensive-workers">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-right">#</th><th className="p-2 text-right">الاسم</th><th className="p-2 text-right">النوع</th>
                        <th className="p-2 text-right">الأيام</th><th className="p-2 text-right">المستحق</th><th className="p-2 text-right">المدفوع</th>
                        <th className="p-2 text-right">الحوالات</th><th className="p-2 text-right">التسويات</th><th className="p-2 text-right">التصفية البينية</th><th className="p-2 text-right">المتبقي الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.workforce.topWorkers
                        .filter(w => !searchValue.trim() || w.name?.toLowerCase().includes(searchValue.trim().toLowerCase()))
                        .map((w, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            <td className="p-2">{i + 1}</td>
                            <td className="p-2 font-medium">{w.name}</td>
                            <td className="p-2"><Badge variant="outline">{w.type}</Badge></td>
                            <td className="p-2">{Number(w.totalDays).toFixed(1)}</td>
                            <td className="p-2 text-green-600 font-semibold">{formatCurrency(w.totalEarned)}</td>
                            <td className="p-2 text-red-600">{formatCurrency(w.totalPaid)}</td>
                            <td className="p-2 text-orange-600">{formatCurrency(w.totalTransfers ?? 0)}</td>
                            <td className="p-2 text-blue-600">{formatCurrency(w.totalSettled ?? 0)}</td>
                            <td className="p-2 text-purple-600">{formatCurrency(w.rebalanceDelta ?? 0)}</td>
                            <td className="p-2 font-bold" style={{ color: (w.balance) >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(w.balance)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {(report.wells?.wellsList?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4" />الآبار ({report.wells.totalWells} بئر — متوسط الإنجاز {report.wells.avgCompletionPercentage.toFixed(0)}%)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-comprehensive-wells">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-right">#</th><th className="p-2 text-right">رقم البئر</th><th className="p-2 text-right">المالك</th>
                        <th className="p-2 text-right">المنطقة</th><th className="p-2 text-right">العمق</th><th className="p-2 text-right">الألواح</th>
                        <th className="p-2 text-right">القواعد</th><th className="p-2 text-right">المواسير</th><th className="p-2 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.wells.wellsList
                        .filter(w => !searchValue.trim() || w.ownerName?.toLowerCase().includes(searchValue.trim().toLowerCase()) || w.region?.toLowerCase().includes(searchValue.trim().toLowerCase()))
                        .map((w, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            <td className="p-2">{i + 1}</td>
                            <td className="p-2 font-medium">{w.wellNumber}</td>
                            <td className="p-2">{w.ownerName}</td>
                            <td className="p-2">{w.region}</td>
                            <td className="p-2">{w.depth} م</td>
                            <td className="p-2">{w.panelCount || 0}</td>
                            <td className="p-2">{w.baseCount || 0}</td>
                            <td className="p-2">{w.pipeCount || 0}</td>
                            <td className="p-2"><Badge variant={w.status === 'completed' ? 'default' : w.status === 'in_progress' ? 'secondary' : 'outline'}>{statusMap[w.status?.toLowerCase()] || w.status}</Badge></td>
                          </tr>
                        ))}
                      <tr className="border-t-2 bg-muted/70 font-bold">
                        <td className="p-2" colSpan={4}>الإجمالي</td>
                        <td className="p-2">{report.wells.totalDepth} م</td>
                        <td className="p-2">{report.wells.totalPanels || 0}</td>
                        <td className="p-2">{report.wells.totalBases || 0}</td>
                        <td className="p-2">{report.wells.totalPipes || 0}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {(report.equipmentSummary?.items?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" />المعدات ({report.equipmentSummary.totalEquipment})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-comprehensive-equipment">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-right">#</th><th className="p-2 text-right">الاسم</th><th className="p-2 text-right">الكود</th>
                        <th className="p-2 text-right">النوع</th><th className="p-2 text-right">الحالة</th><th className="p-2 text-right">الكمية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.equipmentSummary.items.map((eq, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2 font-medium">{eq.name}</td>
                          <td className="p-2">{eq.code}</td>
                          <td className="p-2">{eq.type}</td>
                          <td className="p-2"><Badge variant={eq.status === 'active' ? 'default' : 'outline'}>{eq.status === 'active' ? 'نشط' : eq.status}</Badge></td>
                          <td className="p-2">{eq.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />الصندوق والأمانات</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" data-testid="cash-custody-summary">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg"><div className="text-xs text-muted-foreground">التحويلات الواردة</div><div className="text-lg font-bold text-green-600">{formatCurrency(report.cashCustody.totalFundTransfersIn)}</div></div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg"><div className="text-xs text-muted-foreground">من مشاريع أخرى</div><div className="text-lg font-bold text-blue-600">{formatCurrency(report.cashCustody.totalProjectTransfersIn)}</div></div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg"><div className="text-xs text-muted-foreground">لمشاريع أخرى</div><div className="text-lg font-bold text-red-600">{formatCurrency(report.cashCustody.totalProjectTransfersOut)}</div></div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg"><div className="text-xs text-muted-foreground">صافي الرصيد</div><div className="text-lg font-bold text-purple-600">{formatCurrency(report.cashCustody.netBalance)}</div></div>
              </div>
              {(report.cashCustody.fundTransferItems?.length || 0) > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-comprehensive-transfers">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-right">#</th><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">المرسل</th>
                        <th className="p-2 text-right">النوع</th><th className="p-2 text-right">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.cashCustody.fundTransferItems.map((ft, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2">{safeFormatDate(ft.date, "dd/MM/yyyy")}</td>
                          <td className="p-2">{ft.senderName}</td>
                          <td className="p-2">{ft.transferType}</td>
                          <td className="p-2 font-semibold text-green-600">{formatCurrency(ft.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
