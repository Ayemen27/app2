import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, ClipboardList, Wallet, Users, Package, Truck,
  CreditCard, TrendingUp, TrendingDown, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { formatCurrency } from "@/lib/utils";
import { useSelectedProjectContext } from "@/contexts/SelectedProjectContext";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import type { DailyReportData } from "@shared/report-types";
import { LoadingSpinner, EmptyState, secureDownloadExport } from "./utils";
import { SingleDayReport } from "./SingleDayReport";
import { RangeDayPage } from "./RangeDayPage";

export function DailyReportTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [rangePageIndex, setRangePageIndex] = useState(0);
  const [rangeReports, setRangeReports] = useState<DailyReportData[]>([]);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [rangeDates, setRangeDates] = useState<string[]>([]);
  const [lastFetchedKey, setLastFetchedKey] = useState("");
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const projectIdForApi = isAllProjects ? "" : selectedProjectId;
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isRangeMode = !!(dateRange.from && dateRange.to);

  const { data: dailyReport, isLoading, refetch } = useQuery<DailyReportData | null>({
    queryKey: ["reports-v2-daily", projectIdForApi, dateStr],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const params = new URLSearchParams({ project_id: projectIdForApi, date: dateStr });
      const res = await apiRequest(`/api/reports/v2/daily?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: !!projectIdForApi && !!dateStr && !isRangeMode,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!isRangeMode) {
      if (dailyReport && onStatsReady) {
        onStatsReady([
          { title: "عدد العمال", value: String(dailyReport.totals?.workerCount || 0), icon: Users, color: "blue" },
          { title: "أجور مدفوعة", value: dailyReport.totals?.totalPaidWages || 0, icon: Wallet, color: "purple", formatter: formatCurrency },
          { title: "المواد", value: dailyReport.totals?.totalMaterials || 0, icon: Package, color: "orange", formatter: formatCurrency },
          { title: "النقل", value: dailyReport.totals?.totalTransport || 0, icon: Truck, color: "teal", formatter: formatCurrency },
          { title: "مصاريف متنوعة", value: dailyReport.totals?.totalMiscExpenses || 0, icon: CreditCard, color: "red", formatter: formatCurrency },
          { title: "الرصيد", value: dailyReport.totals?.balance || 0, icon: TrendingUp, color: "green", formatter: formatCurrency },
        ]);
      } else if (!dailyReport && onStatsReady) {
        onStatsReady([]);
      }
    }
  }, [dailyReport, onStatsReady, isRangeMode]);

  useEffect(() => {
    if (isRangeMode && rangeReports.length > 0 && onStatsReady) {
      const totalExpenses = rangeReports.reduce((s, r) => s + (r.totals?.totalExpenses || 0), 0);
      const totalWages = rangeReports.reduce((s, r) => s + (r.totals?.totalWorkerWages || 0), 0);
      const totalMaterials = rangeReports.reduce((s, r) => s + (r.totals?.totalMaterials || 0), 0);
      const daysWithData = rangeReports.filter(r => (r.totals?.totalExpenses || 0) > 0).length;
      onStatsReady([
        { title: "أيام الفترة", value: String(rangeDates.length), icon: Calendar, color: "blue" },
        { title: "أيام بها بيانات", value: String(daysWithData), icon: ClipboardList, color: "green" },
        { title: "إجمالي الأجور", value: totalWages, icon: Wallet, color: "purple", formatter: formatCurrency },
        { title: "إجمالي المواد", value: totalMaterials, icon: Package, color: "orange", formatter: formatCurrency },
        { title: "إجمالي المصروفات", value: totalExpenses, icon: TrendingDown, color: "red", formatter: formatCurrency },
      ]);
    } else if (isRangeMode && rangeReports.length === 0 && onStatsReady) {
      onStatsReady([]);
    }
  }, [rangeReports, rangeDates, onStatsReady, isRangeMode]);

  const generateDateRange = (from: Date, to: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      dates.push(format(current, "yyyy-MM-dd"));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const emptyReport = useCallback((d: string): DailyReportData => ({
    reportType: 'daily' as const, date: d, attendance: [], materials: [], transport: [], miscExpenses: [], workerTransfers: [], fundTransfers: [],
    totals: { totalWorkerWages: 0, totalPaidWages: 0, totalMaterials: 0, totalTransport: 0, totalMiscExpenses: 0, totalWorkerTransfers: 0, totalFundTransfers: 0, totalExpenses: 0, balance: 0, workerCount: 0, totalWorkDays: 0 },
    project: { id: projectIdForApi, name: selectedProjectName || "" }, generatedAt: new Date().toISOString(), kpis: [],
  }), [projectIdForApi, selectedProjectName]);

  const fetchRangeReports = useCallback(async (from: Date, to: Date) => {
    if (!projectIdForApi) return;
    if (from > to) return;
    const dates = generateDateRange(from, to);
    const fetchKey = `${projectIdForApi}-${format(from, "yyyy-MM-dd")}-${format(to, "yyyy-MM-dd")}`;
    if (fetchKey === lastFetchedKey) return;
    setLastFetchedKey(fetchKey);
    setIsLoadingRange(true);
    setRangeDates(dates);
    setRangePageIndex(0);
    try {
      const reports: DailyReportData[] = [];
      const batchSize = 5;
      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (d) => {
            try {
              const params = new URLSearchParams({ project_id: projectIdForApi, date: d });
              const res = await apiRequest(`/api/reports/v2/daily?${params.toString()}`, "GET");
              const data = res?.data || res;
              if (data && data.date) return data as DailyReportData;
              return emptyReport(d);
            } catch {
              return emptyReport(d);
            }
          })
        );
        reports.push(...batchResults);
      }
      setRangeReports(reports);
      const firstDataIndex = reports.findIndex(r => (r.totals?.totalExpenses || 0) > 0 || (r.attendance?.length || 0) > 0 || (r.materials?.length || 0) > 0 || (r.fundTransfers?.length || 0) > 0);
      if (firstDataIndex > 0) setRangePageIndex(firstDataIndex);
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل تحميل التقارير"), variant: "destructive" });
    } finally {
      setIsLoadingRange(false);
    }
  }, [projectIdForApi, lastFetchedKey, emptyReport, toast]);

  useEffect(() => {
    if (dateRange.from && dateRange.to && projectIdForApi) {
      fetchRangeReports(dateRange.from, dateRange.to);
    }
  }, [dateRange.from, dateRange.to, projectIdForApi, fetchRangeReports]);

  const handleExport = async (fmt: "xlsx" | "pdf") => {
    if (!projectIdForApi) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروع أولاً", variant: "destructive" });
      return;
    }
    const setLoading = fmt === "xlsx" ? setIsExportingXlsx : setIsExportingPdf;
    setLoading(true);
    try {
      if (isRangeMode && dateRange.from && dateRange.to) {
        await secureDownloadExport("daily-range", fmt, {
          project_id: projectIdForApi,
          dateFrom: format(dateRange.from, "yyyy-MM-dd"),
          dateTo: format(dateRange.to, "yyyy-MM-dd"),
        }, toast);
      } else {
        await secureDownloadExport("daily", fmt, { project_id: projectIdForApi, date: dateStr }, toast);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterConfig: FilterConfig[] = [
    { key: "specificDate", label: "التاريخ", type: "date" },
    { key: "dateRange", label: "فترة زمنية", type: "date-range" },
  ];

  const filterValues: Record<string, any> = {
    specificDate: isRangeMode ? undefined : selectedDate,
    dateRange: dateRange.from ? dateRange : undefined,
  };

  const onFilterChange = (key: string, val: any) => {
    if (key === "specificDate" && val) {
      setSelectedDate(val instanceof Date ? val : new Date(val));
      setDateRange({});
      setRangeReports([]);
      setRangeDates([]);
      setLastFetchedKey("");
    }
    if (key === "dateRange") {
      if (val && val.from && val.to) {
        setDateRange(val);
      } else if (val && val.from) {
        setDateRange({ from: val.from });
      } else {
        setDateRange({});
        setRangeReports([]);
        setRangeDates([]);
        setLastFetchedKey("");
      }
    }
  };

  const exportActions: ActionButton[] = [
    {
      key: "export-excel",
      icon: FileSpreadsheet,
      tooltip: "تصدير Excel",
      onClick: () => handleExport("xlsx"),
      disabled: !projectIdForApi || isExportingXlsx || isExportingPdf,
      loading: isExportingXlsx,
    },
    {
      key: "export-pdf",
      icon: FileText,
      tooltip: "تصدير PDF",
      onClick: () => handleExport("pdf"),
      disabled: !projectIdForApi || isExportingPdf || isExportingXlsx,
      loading: isExportingPdf,
    },
  ];

  const prevDate = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const nextDate = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

  const currentRangeReport = rangeReports[rangePageIndex];
  const currentRangeDate = rangeDates[rangePageIndex];

  const hasData = (r: DailyReportData) => (r.totals?.totalExpenses || 0) > 0 || (r.attendance?.length || 0) > 0 || (r.materials?.length || 0) > 0 || (r.fundTransfers?.length || 0) > 0;

  const goToPrevWithData = () => {
    for (let i = rangePageIndex - 1; i >= 0; i--) {
      if (hasData(rangeReports[i])) { setRangePageIndex(i); return; }
    }
    setRangePageIndex(Math.max(0, rangePageIndex - 1));
  };

  const goToNextWithData = () => {
    for (let i = rangePageIndex + 1; i < rangeReports.length; i++) {
      if (hasData(rangeReports[i])) { setRangePageIndex(i); return; }
    }
    setRangePageIndex(Math.min(rangeDates.length - 1, rangePageIndex + 1));
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
        searchPlaceholder="البحث في التقرير..."
        onRefresh={isRangeMode ? undefined : () => refetch()}
        isRefreshing={isRangeMode ? isLoadingRange : isLoading}
        onReset={() => { setSearchValue(""); setSelectedDate(new Date()); setDateRange({}); setRangeReports([]); setRangeDates([]); setLastFetchedKey(""); }}
      />

      {!isRangeMode && (
        <>
          {!isAllProjects && selectedDate && (
            <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mx-auto w-full max-w-md" data-testid="date-navigator">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={prevDate} data-testid="btn-prev-date">
                <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Button>
              <div className="flex flex-col items-center flex-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">التقرير اليومي</span>
                <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {format(selectedDate, "EEEE, d MMMM yyyy", { locale: arSA })}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={nextDate} data-testid="btn-next-date">
                <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Button>
            </div>
          )}

          {isAllProjects && <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقرير اليومي" icon={ClipboardList} />}
          {!isAllProjects && isLoading && <LoadingSpinner message="جاري تحميل التقرير اليومي..." />}
          {!isAllProjects && !isLoading && !dailyReport && <EmptyState message="لا توجد بيانات لهذا اليوم" />}
          {dailyReport && <SingleDayReport report={dailyReport} searchValue={searchValue} />}
        </>
      )}

      {isRangeMode && (
        <>
          {isAllProjects && <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقارير" icon={ClipboardList} />}
          {isLoadingRange && <LoadingSpinner message="جاري تحميل التقارير اليومية..." />}

          {!isLoadingRange && rangeReports.length > 0 && currentRangeReport && (
            <>
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" data-testid="range-page-nav">
                <div className="flex flex-col items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={goToPrevWithData} disabled={rangePageIndex === 0} data-testid="btn-range-prev">
                    <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </Button>
                </div>

                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-bold">
                      {rangePageIndex + 1} / {rangeDates.length}
                    </Badge>
                    {currentRangeReport && !hasData(currentRangeReport) && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 text-muted-foreground">بدون بيانات</Badge>
                    )}
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {currentRangeDate ? format(new Date(currentRangeDate), "EEEE, d MMMM yyyy", { locale: arSA }) : ""}
                  </span>
                  {dateRange.from && dateRange.to && (
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {format(dateRange.from, "d MMM yyyy", { locale: arSA })} — {format(dateRange.to, "d MMM yyyy", { locale: arSA })}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={goToNextWithData} disabled={rangePageIndex >= rangeDates.length - 1} data-testid="btn-range-next">
                    <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </Button>
                </div>
              </div>

              <RangeDayPage report={currentRangeReport} searchValue={searchValue} carryForward={
                rangeReports.slice(0, rangePageIndex).reduce((cf, r) => {
                  const fund = (r.fundTransfers || []).reduce((s: number, f: any) => s + parseFloat(f.amount || '0'), 0);
                  let exp = 0;
                  (r.attendance || []).forEach((a: any) => { exp += parseFloat(a.paidAmount || '0'); });
                  (r.materials || []).forEach((m: any) => {
                    const isNaqd = m.purchaseType === 'نقد' || m.purchaseType === 'نقداً';
                    if (isNaqd) {
                      const paid = parseFloat(m.paidAmount || '0');
                      exp += paid > 0 ? paid : parseFloat(m.totalAmount || '0');
                    }
                  });
                  (r.transport || []).forEach((t: any) => { exp += parseFloat(t.amount || '0'); });
                  (r.miscExpenses || []).forEach((e: any) => { exp += parseFloat(e.amount || '0'); });
                  (r.workerTransfers || []).forEach((wt: any) => { exp += parseFloat(wt.amount || '0'); });
                  (r.projectTransfersOut || []).forEach((pt: any) => { exp += parseFloat(pt.amount || '0'); });
                  return cf + fund - exp;
                }, 0)
              } />
            </>
          )}
        </>
      )}
    </div>
  );
}
