import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, ClipboardList, Filter, AlertCircle, RefreshCw,
  FileSpreadsheet, FileText, PieChart as PieChartIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import type { MultiProjectFinalReportData } from "@shared/report-types";
import { COLORS, LoadingSpinner, EmptyState, ReportTable, safeFormatDate, secureDownloadExport } from "./utils";

export function MultiProjectFinalTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [autoDateApplied, setAutoDateApplied] = useState(false);

  const firstSelectedId = selectedProjectIds.length > 0 ? selectedProjectIds[0] : "";

  const { data: projectDateRange, isLoading: isLoadingDateRange, isError: isDateRangeError } = useQuery<{ success: boolean; data: { minDate: string | null; maxDate: string | null } }>({
    queryKey: ["project-date-range", firstSelectedId],
    queryFn: async () => {
      const params = new URLSearchParams({ project_id: firstSelectedId });
      const res = await fetch(`/api/reports/v2/export/project-date-range?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل في جلب نطاق التواريخ');
      return res.json();
    },
    enabled: !!firstSelectedId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!autoDateApplied && selectedProjectIds.length > 0) {
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
  }, [projectDateRange, autoDateApplied, selectedProjectIds, isDateRangeError]);

  useEffect(() => {
    setAutoDateApplied(false);
    setDateRange({});
  }, [firstSelectedId]);

  const { data: projectsList = [] } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000,
  });

  const allProjects = useMemo(() => {
    if (Array.isArray(projectsList)) return projectsList;
    if (projectsList && typeof projectsList === 'object' && 'data' in (projectsList as any)) return (projectsList as any).data || [];
    return [];
  }, [projectsList]);

  const dateFrom = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const dateTo = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const { data: multiReport, isLoading, isError, error, refetch } = useQuery<MultiProjectFinalReportData | null>({
    queryKey: ["reports-v2-multi-project-final", selectedProjectIds, dateFrom, dateTo],
    queryFn: async () => {
      if (selectedProjectIds.length === 0) return null;
      const params = new URLSearchParams({ project_ids: selectedProjectIds.join(","), dateFrom, dateTo });
      const res = await apiRequest(`/api/reports/v2/multi-project-final?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: selectedProjectIds.length > 0 && !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (multiReport && onStatsReady) {
      onStatsReady([
        { title: "إجمالي الوارد", value: multiReport.combinedTotals?.totalIncome || 0, icon: TrendingUp, color: "blue", formatter: formatCurrency },
        { title: "إجمالي المصروفات", value: multiReport.combinedTotals?.totalExpenses || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
        { title: "الرصيد", value: multiReport.combinedTotals?.balance || 0, icon: Wallet, color: "green", formatter: formatCurrency },
        { title: "عدد المشاريع", value: String(multiReport.projects?.length || 0), icon: ClipboardList, color: "orange" },
      ]);
    } else if (!multiReport && onStatsReady) {
      onStatsReady([]);
    }
  }, [multiReport, onStatsReady]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (selectedProjectIds.length === 0) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروع واحد على الأقل", variant: "destructive" });
      return;
    }
    secureDownloadExport("multi-project-final", fmt, { project_ids: selectedProjectIds.join(","), dateFrom, dateTo }, toast);
  };

  const filterConfig: FilterConfig[] = [{ key: "dateRange", label: "الفترة الزمنية", type: "date-range" }];
  const filterValues: Record<string, any> = { dateRange };
  const onFilterChange = (key: string, val: any) => {
    if (key === "dateRange" && val) setDateRange((prev) => ({ ...prev, ...val }));
  };
  const exportActions: ActionButton[] = [
    { key: "export-excel", icon: FileSpreadsheet, tooltip: "تصدير Excel", onClick: () => handleExport("xlsx"), disabled: selectedProjectIds.length === 0 },
    { key: "export-pdf", icon: FileText, tooltip: "تصدير PDF", onClick: () => handleExport("pdf"), disabled: selectedProjectIds.length === 0 },
  ];

  const pieData = useMemo(() => {
    if (!multiReport?.combinedTotals) return [];
    return [
      { name: "الأجور", value: multiReport.combinedTotals.totalWages || 0 },
      { name: "المواد", value: multiReport.combinedTotals.totalMaterials || 0 },
      { name: "النقل", value: multiReport.combinedTotals.totalTransport || 0 },
      { name: "متنوعة", value: multiReport.combinedTotals.totalMisc || 0 },
      { name: "تحويلات عمال", value: multiReport.combinedTotals.totalWorkerTransfers || 0 },
    ].filter((d) => d.value > 0);
  }, [multiReport]);

  return (
    <div className="space-y-4">
      <UnifiedFilterDashboard
        filters={filterConfig}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        actions={exportActions}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث في التقرير المجمع..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        onReset={() => { setSearchValue(""); setSelectedProjectIds([]); setAutoDateApplied(false); setDateRange({}); }}
      />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />اختيار المشاريع</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" data-testid="multi-project-selector">
            {allProjects.map((p: any) => {
              const isSelected = selectedProjectIds.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggleProject(p.id)} data-testid={`btn-project-toggle-${p.id}`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"}`}>
                  {p.name}{isSelected && <span className="mr-2">✓</span>}
                </button>
              );
            })}
          </div>
          {selectedProjectIds.length > 0 && <p className="text-xs text-muted-foreground mt-2" data-testid="text-selected-count">تم اختيار {selectedProjectIds.length} مشروع</p>}
        </CardContent>
      </Card>

      {selectedProjectIds.length === 0 && <EmptyState message="الرجاء اختيار مشروع واحد أو أكثر لعرض التقرير المجمع" icon={BarChart3} />}
      {selectedProjectIds.length > 0 && (isLoading || isLoadingDateRange || (!dateFrom || !dateTo)) && <LoadingSpinner message="جاري تحميل التقرير المجمع..." />}

      {selectedProjectIds.length > 0 && !isLoading && !isLoadingDateRange && !!dateFrom && !!dateTo && isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2" data-testid="multi-report-error">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-destructive font-medium">حدث خطأ في تحميل التقرير المجمع</p>
              <p className="text-xs text-muted-foreground">{(error as any)?.message || "خطأ غير معروف"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="btn-retry-multi-report">
                <RefreshCw className="h-3 w-3 ml-1" />إعادة المحاولة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {multiReport && (() => {
        const q = searchValue.trim().toLowerCase();
        const filteredWorkers = (multiReport.combinedSections?.attendance?.byWorker || []).filter((w: any) =>
          !q || [w.workerName, w.workerType, w.projectName].some((v: string) => v?.toLowerCase().includes(q))
        );
        const filteredMaterials = (multiReport.combinedSections?.materials?.items || []).filter((m: any) =>
          !q || [m.materialName, m.supplierName, m.projectName].some((v: string) => v?.toLowerCase().includes(q))
        );
        const filteredFundTransfers = (multiReport.combinedSections?.fundTransfers?.items || []).filter((f: any) =>
          !q || [f.senderName, f.transferType, f.projectName].some((v: string) => v?.toLowerCase().includes(q))
        );
        const filteredInterTransfers = (multiReport.interProjectTransfers || []).filter((t: any) =>
          !q || [t.fromProjectName, t.toProjectName, t.reason].some((v: string) => v?.toLowerCase().includes(q))
        );

        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />الإنفاق عبر الزمن</CardTitle></CardHeader>
                <CardContent>
                  {(multiReport.chartData?.length || 0) > 0 ? (
                    <div className="h-[300px] w-full" data-testid="chart-multi-spending-time">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={multiReport.chartData}>
                          <defs>
                            <linearGradient id="mColorWages" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="mColorMaterials" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip formatter={(val: number) => formatCurrency(val)} />
                          <Legend />
                          <Area type="monotone" dataKey="wages" name="الأجور" stroke="#2563eb" fill="url(#mColorWages)" />
                          <Area type="monotone" dataKey="materials" name="المواد" stroke="#10b981" fill="url(#mColorMaterials)" />
                          <Area type="monotone" dataKey="transport" name="النقل" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyState message="لا توجد بيانات رسم بياني" />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="h-4 w-4" />توزيع التكاليف المجمع</CardTitle></CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <div className="h-[300px] w-full" data-testid="chart-multi-cost-breakdown">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(val: number) => formatCurrency(val)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyState message="لا توجد بيانات كافية" />}
                </CardContent>
              </Card>
            </div>

            {multiReport.projects.map((proj) => (
              <Card key={proj.projectId}>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" />ملخص: {proj.projectName}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-md bg-blue-50 dark:bg-blue-950/30" data-testid={`stat-income-${proj.projectId}`}><p className="text-xs text-muted-foreground">الوارد</p><p className="font-bold text-sm mt-1 text-blue-600 dark:text-blue-400">{formatCurrency(proj.totals.totalIncome)}</p></div>
                    <div className="text-center p-3 rounded-md bg-red-50 dark:bg-red-950/30" data-testid={`stat-expenses-${proj.projectId}`}><p className="text-xs text-muted-foreground">المصروفات</p><p className="font-bold text-sm mt-1 text-red-600 dark:text-red-400">{formatCurrency(proj.totals.totalExpenses)}</p></div>
                    <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-950/30" data-testid={`stat-balance-${proj.projectId}`}><p className="text-xs text-muted-foreground">الرصيد</p><p className="font-bold text-sm mt-1 text-green-600 dark:text-green-400">{formatCurrency(proj.totals.balance)}</p></div>
                    <div className="text-center p-3 rounded-md bg-muted/30" data-testid={`stat-wages-${proj.projectId}`}><p className="text-xs text-muted-foreground">الأجور</p><p className="font-bold text-sm mt-1">{formatCurrency(proj.totals.totalWages)}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredWorkers.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">ملخص العمالة المجمع</CardTitle><Badge variant="secondary">{filteredWorkers.length} عامل</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-multi-attendance" headers={["اسم العامل", "المشروع", "النوع", "الأيام", "المستحق", "المدفوع", "الحوالات", "إجمالي المدفوع", "المتبقي"]}
                    rows={filteredWorkers.map((w: any) => [w.workerName, w.projectName, w.workerType, w.totalDays, formatCurrency(w.totalEarned), formatCurrency(w.totalDirectPaid ?? w.totalPaid), formatCurrency(w.totalTransfers ?? 0), formatCurrency(w.totalPaid), formatCurrency(w.balance ?? 0)])} />
                </CardContent>
              </Card>
            )}

            {filteredMaterials.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">ملخص المواد المجمع</CardTitle><Badge variant="secondary">{filteredMaterials.length} مادة</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-multi-materials" headers={["اسم المادة", "المشروع", "الكمية", "الإجمالي", "المورد"]}
                    rows={filteredMaterials.map((m: any) => [m.materialName, m.projectName, m.totalQuantity, formatCurrency(m.totalAmount), m.supplierName || "-"])} />
                </CardContent>
              </Card>
            )}

            {filteredInterTransfers.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">التحويلات بين المشاريع المحددة</CardTitle><Badge variant="secondary">{filteredInterTransfers.length}</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-multi-inter-transfers" headers={["التاريخ", "من مشروع", "إلى مشروع", "المبلغ", "السبب"]}
                    rows={filteredInterTransfers.map((t: any) => [safeFormatDate(t.date, "dd/MM/yyyy"), t.fromProjectName || "-", t.toProjectName || "-", formatCurrency(t.amount), t.reason || "-"])} />
                  <div className="text-center mt-3 p-2 rounded bg-muted/30" data-testid="stat-inter-transfer-total">
                    <p className="text-xs text-muted-foreground">إجمالي التحويلات بين المشاريع</p>
                    <p className="font-bold text-sm mt-1">{formatCurrency(multiReport.combinedTotals.totalInterProjectTransfers)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredFundTransfers.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2"><CardTitle className="text-base">التحويلات المالية المجمعة</CardTitle><Badge variant="secondary">{filteredFundTransfers.length}</Badge></CardHeader>
                <CardContent>
                  <ReportTable testId="table-multi-fund-transfers" headers={["التاريخ", "المبلغ", "المرسل", "النوع", "المشروع"]}
                    rows={filteredFundTransfers.map((f: any) => [safeFormatDate(f.date, "dd/MM/yyyy"), formatCurrency(f.amount), f.senderName || "-", f.transferType || "-", f.projectName || "-"])} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">الملخص المالي الشامل المجمع</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-md bg-blue-50 dark:bg-blue-950/30" data-testid="stat-combined-fund-transfers"><p className="text-xs text-muted-foreground">العهدة</p><p className="font-bold text-sm mt-1 text-blue-600 dark:text-blue-400">{formatCurrency(multiReport.combinedTotals.totalFundTransfers)}</p></div>
                  <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-950/30" data-testid="stat-combined-transfers-in"><p className="text-xs text-muted-foreground">ترحيل وارد</p><p className="font-bold text-sm mt-1 text-green-600 dark:text-green-400">{formatCurrency(multiReport.combinedTotals.totalProjectTransfersIn)}</p></div>
                  <div className="text-center p-3 rounded-md bg-orange-50 dark:bg-orange-950/30" data-testid="stat-combined-transfers-out"><p className="text-xs text-muted-foreground">ترحيل صادر</p><p className="font-bold text-sm mt-1 text-orange-600 dark:text-orange-400">{formatCurrency(multiReport.combinedTotals.totalProjectTransfersOut)}</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30" data-testid="stat-combined-wages"><p className="text-xs text-muted-foreground">الأجور</p><p className="font-bold text-sm mt-1">{formatCurrency(multiReport.combinedTotals.totalWages)}</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30" data-testid="stat-combined-materials"><p className="text-xs text-muted-foreground">المواد</p><p className="font-bold text-sm mt-1">{formatCurrency(multiReport.combinedTotals.totalMaterials)}</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30" data-testid="stat-combined-transport"><p className="text-xs text-muted-foreground">النقل</p><p className="font-bold text-sm mt-1">{formatCurrency(multiReport.combinedTotals.totalTransport)}</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30" data-testid="stat-combined-misc"><p className="text-xs text-muted-foreground">النثريات</p><p className="font-bold text-sm mt-1">{formatCurrency(multiReport.combinedTotals.totalMisc)}</p></div>
                  <div className="text-center p-3 rounded-md bg-muted/30" data-testid="stat-combined-worker-transfers"><p className="text-xs text-muted-foreground">حوالات العمال</p><p className="font-bold text-sm mt-1">{formatCurrency(multiReport.combinedTotals.totalWorkerTransfers)}</p></div>
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}
    </div>
  );
}
