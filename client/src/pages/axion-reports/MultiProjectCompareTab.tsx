import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Filter, FileSpreadsheet, FileText, RefreshCw, AlertCircle, Users, Layers,
  BarChart3, TrendingUp, TrendingDown, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import type { MultiProjectFinalReportData } from "@shared/report-types";
import { COLORS, LoadingSpinner, EmptyState, secureDownloadExport, buildArabicReportFileName } from "./utils";

// ─── بنية صف العامل الموحّد (مع بيانات كل مشروع) ─────────────────────────────
interface WorkerProjectData {
  days: number;
  earned: number;
  paid: number;
  transfers: number;
  balance: number;
}

interface PivotedWorker {
  workerName: string;
  workerType: string;
  projects: Record<string, WorkerProjectData>;
  totalDays: number;
  totalEarned: number;
  totalPaid: number;
  totalBalance: number;
}

// ─── بنية صف الملخص المالي لكل مشروع ────────────────────────────────────────
interface ProjectSummaryRow {
  projectId: string;
  projectName: string;
  totalIncome: number;
  totalWages: number;
  totalMaterials: number;
  totalTransport: number;
  totalMisc: number;
  totalExpenses: number;
  balance: number;
}

export function MultiProjectCompareTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [autoDateApplied, setAutoDateApplied] = useState(false);

  // ─── جلب نطاق التواريخ الموحّد لكل المشاريع ──────────────────────────────
  const { data: allDateRanges, isLoading: isLoadingDates, isError: isDateErr } = useQuery<
    { id: string; minDate: string | null; maxDate: string | null }[]
  >({
    queryKey: ["compare-date-ranges", selectedProjectIds],
    queryFn: async () => {
      const results = await Promise.all(
        selectedProjectIds.map(async (pid) => {
          const params = new URLSearchParams({ project_id: pid });
          const res = await fetch(`/api/reports/v2/export/project-date-range?${params}`, { credentials: "include" });
          if (!res.ok) return { id: pid, minDate: null, maxDate: null };
          const json = await res.json();
          return { id: pid, minDate: json.data?.minDate || null, maxDate: json.data?.maxDate || null };
        })
      );
      return results;
    },
    enabled: selectedProjectIds.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!autoDateApplied && selectedProjectIds.length > 0 && allDateRanges) {
      const valid = allDateRanges.filter((r) => r.minDate && r.maxDate);
      if (valid.length > 0) {
        const minDate = valid.map((r) => r.minDate!).sort()[0];
        const maxDate = valid.map((r) => r.maxDate!).sort().reverse()[0];
        setDateRange({ from: new Date(minDate), to: new Date(maxDate) });
      } else {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        setDateRange({ from: d, to: new Date() });
      }
      setAutoDateApplied(true);
    } else if (!autoDateApplied && selectedProjectIds.length > 0 && isDateErr) {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      setDateRange({ from: d, to: new Date() });
      setAutoDateApplied(true);
    }
  }, [allDateRanges, autoDateApplied, selectedProjectIds, isDateErr]);

  useEffect(() => {
    setAutoDateApplied(false);
    setDateRange({});
  }, [JSON.stringify(selectedProjectIds)]);

  // ─── قائمة المشاريع ───────────────────────────────────────────────────────
  const { data: projectsList = [] } = useQuery({
    queryKey: ["/api/projects"],
    staleTime: 5 * 60 * 1000,
  });
  const allProjects = useMemo(() => {
    if (Array.isArray(projectsList)) return projectsList as any[];
    if (projectsList && typeof projectsList === "object" && "data" in (projectsList as any))
      return (projectsList as any).data || [];
    return [];
  }, [projectsList]);

  const dateFrom = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const dateTo = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  // ─── جلب بيانات التقرير ────────────────────────────────────────────────────
  const { data: report, isLoading, isError, error, refetch } = useQuery<MultiProjectFinalReportData | null>({
    queryKey: ["compare-multi-project", selectedProjectIds, dateFrom, dateTo],
    queryFn: async () => {
      if (selectedProjectIds.length === 0) return null;
      const params = new URLSearchParams({ project_ids: selectedProjectIds.join(","), dateFrom, dateTo });
      const res = await apiRequest(`/api/reports/v2/multi-project-final?${params}`, "GET");
      return res?.data || res;
    },
    enabled: selectedProjectIds.length >= 2 && !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000,
  });

  // ─── pivot: دمج العمال في جدول واحد بأعمدة المشاريع ──────────────────────
  const { pivotedWorkers, projectNames } = useMemo(() => {
    if (!report) return { pivotedWorkers: [], projectNames: [] };

    const projectNames = report.projects.map((p) => ({ id: String(p.projectId), name: p.projectName }));
    const allWorkers = report.combinedSections?.attendance?.byWorker || [];

    const workerMap: Record<string, PivotedWorker> = {};
    for (const w of allWorkers) {
      const key = w.workerName;
      if (!workerMap[key]) {
        workerMap[key] = {
          workerName: w.workerName,
          workerType: w.workerType || "-",
          projects: {},
          totalDays: 0,
          totalEarned: 0,
          totalPaid: 0,
          totalBalance: 0,
        };
      }
      const pid = String(w.projectId || "");
      const paid = (w.totalDirectPaid ?? 0) + (w.totalTransfers ?? 0);
      workerMap[key].projects[pid] = {
        days: w.totalDays || 0,
        earned: w.totalEarned || 0,
        paid: w.totalPaid ?? paid,
        transfers: w.totalTransfers ?? 0,
        balance: w.balance ?? 0,
      };
      workerMap[key].totalDays += w.totalDays || 0;
      workerMap[key].totalEarned += w.totalEarned || 0;
      workerMap[key].totalPaid += w.totalPaid ?? paid;
      workerMap[key].totalBalance += w.balance ?? 0;
    }

    const pivotedWorkers = Object.values(workerMap).sort((a, b) =>
      a.workerName.localeCompare(b.workerName, "ar")
    );
    return { pivotedWorkers, projectNames };
  }, [report]);

  // ─── ملخص المشاريع المالي ─────────────────────────────────────────────────
  const projectSummaries: ProjectSummaryRow[] = useMemo(() => {
    if (!report) return [];
    return report.projects.map((p) => ({
      projectId: String(p.projectId),
      projectName: p.projectName,
      totalIncome: p.totals.totalIncome || 0,
      totalWages: p.totals.totalPaidWages ?? p.totals.totalWages ?? 0,
      totalMaterials: p.totals.totalMaterials || 0,
      totalTransport: p.totals.totalTransport || 0,
      totalMisc: p.totals.totalMisc || 0,
      totalExpenses: p.totals.totalExpenses || 0,
      balance: p.totals.balance || 0,
    }));
  }, [report]);

  // ─── بث الإحصائيات للأعلى ─────────────────────────────────────────────────
  useEffect(() => {
    if (report && onStatsReady) {
      onStatsReady([
        { title: "إجمالي الوارد", value: report.combinedTotals?.totalIncome || 0, icon: TrendingUp, color: "blue", formatter: formatCurrency },
        { title: "إجمالي المصروفات", value: report.combinedTotals?.totalExpenses || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
        { title: "الرصيد المجمع", value: report.combinedTotals?.balance || 0, icon: Wallet, color: "green", formatter: formatCurrency },
        { title: "إجمالي العمال", value: String(pivotedWorkers.length), icon: Users, color: "orange" },
      ]);
    } else if (!report && onStatsReady) {
      onStatsReady([]);
    }
  }, [report, pivotedWorkers.length, onStatsReady]);

  const toggleProject = (id: string) =>
    setSelectedProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExport = async (fmt: "xlsx" | "pdf") => {
    if (selectedProjectIds.length < 2) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروعين على الأقل", variant: "destructive" });
      return;
    }
    const setLoading = fmt === "xlsx" ? setIsExportingXlsx : setIsExportingPdf;
    setLoading(true);
    try {
      const namesArr = selectedProjectIds
        .map((id) => allProjects.find((p: any) => p.id === id)?.name)
        .filter(Boolean) as string[];
      const namesJoined = namesArr.slice(0, 2).join('-') || 'مشاريع';
      await secureDownloadExport(
        "multi-project-compare",
        fmt,
        { project_ids: selectedProjectIds.join(","), dateFrom, dateTo },
        toast,
        buildArabicReportFileName({ type: "multi-project-compare", fmt, projectName: namesJoined, dateFrom, dateTo }),
      );
    } finally {
      setLoading(false);
    }
  };

  const filterConfig: FilterConfig[] = [{ key: "dateRange", label: "الفترة الزمنية", type: "date-range" }];
  const filterValues: Record<string, any> = { dateRange };
  const onFilterChange = (key: string, val: any) => {
    if (key === "dateRange" && val) setDateRange((prev) => ({ ...prev, ...val }));
  };
  const exportActions: ActionButton[] = [
    { key: "export-excel", icon: FileSpreadsheet, tooltip: "تصدير Excel", onClick: () => handleExport("xlsx"), disabled: selectedProjectIds.length < 2 || isExportingXlsx || isExportingPdf, loading: isExportingXlsx },
    { key: "export-pdf", icon: FileText, tooltip: "تصدير PDF", onClick: () => handleExport("pdf"), disabled: selectedProjectIds.length < 2 || isExportingPdf || isExportingXlsx, loading: isExportingPdf },
  ];

  const q = searchValue.trim().toLowerCase();
  const filteredWorkers = q
    ? pivotedWorkers.filter((w) => w.workerName.includes(q) || w.workerType.includes(q))
    : pivotedWorkers;

  const filteredMaterials = useMemo(() => {
    const items = report?.combinedSections?.materials?.items || [];
    return q
      ? items.filter((m: any) => [m.materialName, m.projectName, m.supplierName].some((v: string) => v?.toLowerCase().includes(q)))
      : items;
  }, [report, q]);

  // ─── مجموع كل عمود مشروع لإجمالي صف ─────────────────────────────────────
  const columnTotals = useMemo(() => {
    const totals: Record<string, WorkerProjectData & { totalDays: number; totalEarned: number; totalPaid: number; totalBalance: number }> = {};
    for (const w of filteredWorkers) {
      for (const pn of projectNames) {
        if (!totals[pn.id]) totals[pn.id] = { days: 0, earned: 0, paid: 0, transfers: 0, balance: 0, totalDays: 0, totalEarned: 0, totalPaid: 0, totalBalance: 0 };
        const d = w.projects[pn.id];
        if (d) {
          totals[pn.id].days += d.days;
          totals[pn.id].earned += d.earned;
          totals[pn.id].paid += d.paid;
          totals[pn.id].balance += d.balance;
        }
      }
    }
    return totals;
  }, [filteredWorkers, projectNames]);

  const grandTotals = useMemo(() => ({
    days: filteredWorkers.reduce((s, w) => s + w.totalDays, 0),
    earned: filteredWorkers.reduce((s, w) => s + w.totalEarned, 0),
    paid: filteredWorkers.reduce((s, w) => s + w.totalPaid, 0),
    balance: filteredWorkers.reduce((s, w) => s + w.totalBalance, 0),
  }), [filteredWorkers]);

  return (
    <div className="space-y-4">
      <UnifiedFilterDashboard
        filters={filterConfig}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        actions={exportActions}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث باسم العامل أو نوعه..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        onReset={() => { setSearchValue(""); setSelectedProjectIds([]); setAutoDateApplied(false); setDateRange({}); }}
      />

      {/* ─── اختيار المشاريع ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            اختيار المشاريع للمقارنة
            <Badge variant="outline" className="text-xs mr-2">مشروعان على الأقل</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" data-testid="compare-project-selector">
            {allProjects.map((p: any) => {
              const isSelected = selectedProjectIds.includes(p.id);
              const idx = selectedProjectIds.indexOf(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProject(p.id)}
                  data-testid={`btn-compare-toggle-${p.id}`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  {isSelected && (
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: COLORS[idx % COLORS.length], color: "#fff" }}
                    >
                      {idx + 1}
                    </span>
                  )}
                  {p.name}
                </button>
              );
            })}
          </div>
          {selectedProjectIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2" data-testid="text-compare-count">
              تم اختيار {selectedProjectIds.length} مشروع
              {selectedProjectIds.length < 2 && (
                <span className="text-amber-500 mr-2">— اختر مشروعاً ثانياً على الأقل للمقارنة</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedProjectIds.length < 2 && <EmptyState message="اختر مشروعين أو أكثر لعرض جدول المقارنة الموحّد" icon={Layers} />}

      {selectedProjectIds.length >= 2 && (isLoading || isLoadingDates || !dateFrom || !dateTo) && (
        <LoadingSpinner message="جاري تجميع بيانات المقارنة..." />
      )}

      {selectedProjectIds.length >= 2 && !isLoading && !isLoadingDates && !!dateFrom && !!dateTo && isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-destructive font-medium">حدث خطأ في تحميل بيانات المقارنة</p>
              <p className="text-xs text-muted-foreground">{(error as any)?.message || "خطأ غير معروف"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 ml-1" />إعادة المحاولة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* ─── ملخص مالي مقارن للمشاريع ──────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                الملخص المالي المقارن
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-compare-financial-summary">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-2 text-right font-semibold">المشروع</th>
                      <th className="p-2 text-center font-semibold text-blue-700 dark:text-blue-400">الوارد</th>
                      <th className="p-2 text-center font-semibold text-orange-700 dark:text-orange-400">الأجور المدفوعة</th>
                      <th className="p-2 text-center font-semibold text-emerald-700 dark:text-emerald-400">المواد</th>
                      <th className="p-2 text-center font-semibold text-amber-700 dark:text-amber-400">النقل</th>
                      <th className="p-2 text-center font-semibold text-red-700 dark:text-red-400">إجمالي المصروف</th>
                      <th className="p-2 text-center font-semibold text-green-700 dark:text-green-400">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSummaries.map((ps, i) => (
                      <tr key={ps.projectId} className={i % 2 === 0 ? "bg-muted/10" : ""} data-testid={`row-summary-${ps.projectId}`}>
                        <td className="p-2 font-bold flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          {ps.projectName}
                        </td>
                        <td className="p-2 text-center font-medium text-blue-600 dark:text-blue-400">{formatCurrency(ps.totalIncome)}</td>
                        <td className="p-2 text-center font-medium text-orange-600 dark:text-orange-400">{formatCurrency(ps.totalWages)}</td>
                        <td className="p-2 text-center font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(ps.totalMaterials)}</td>
                        <td className="p-2 text-center font-medium text-amber-600 dark:text-amber-400">{formatCurrency(ps.totalTransport)}</td>
                        <td className="p-2 text-center font-medium text-red-600 dark:text-red-400">{formatCurrency(ps.totalExpenses)}</td>
                        <td className={`p-2 text-center font-bold ${ps.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(ps.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-bold">
                      <td className="p-2">الإجمالي</td>
                      <td className="p-2 text-center text-blue-700 dark:text-blue-300">
                        {formatCurrency(projectSummaries.reduce((s, p) => s + p.totalIncome, 0))}
                      </td>
                      <td className="p-2 text-center text-orange-700 dark:text-orange-300">
                        {formatCurrency(projectSummaries.reduce((s, p) => s + p.totalWages, 0))}
                      </td>
                      <td className="p-2 text-center text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(projectSummaries.reduce((s, p) => s + p.totalMaterials, 0))}
                      </td>
                      <td className="p-2 text-center text-amber-700 dark:text-amber-300">
                        {formatCurrency(projectSummaries.reduce((s, p) => s + p.totalTransport, 0))}
                      </td>
                      <td className="p-2 text-center text-red-700 dark:text-red-300">
                        {formatCurrency(projectSummaries.reduce((s, p) => s + p.totalExpenses, 0))}
                      </td>
                      <td className="p-2 text-center text-green-700 dark:text-green-300">
                        {formatCurrency(projectSummaries.reduce((s, p) => s + p.balance, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ─── جدول المقارنة الموحّد للعمال (pivot) ───────────────────────── */}
          {filteredWorkers.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  جدول العمالة الموحّد — ورقة واحدة
                </CardTitle>
                <Badge variant="secondary" data-testid="badge-worker-count">{filteredWorkers.length} عامل</Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-testid="table-compare-workers">
                    <thead>
                      {/* ─── الصف الأول: أسماء المشاريع (رؤوس مجمّعة) ─────── */}
                      <tr className="border-b bg-muted/40">
                        <th className="p-2 text-right font-semibold" rowSpan={2}>العامل</th>
                        <th className="p-2 text-right font-semibold text-muted-foreground" rowSpan={2}>النوع</th>
                        {projectNames.map((pn, i) => (
                          <th
                            key={pn.id}
                            colSpan={3}
                            className="p-2 text-center font-bold border-x"
                            style={{ color: COLORS[i % COLORS.length], borderColor: COLORS[i % COLORS.length] + "55" }}
                          >
                            {pn.name}
                          </th>
                        ))}
                        <th className="p-2 text-center font-bold bg-primary/10 text-primary" colSpan={3} rowSpan={1}>الإجمالي</th>
                      </tr>
                      {/* ─── الصف الثاني: تفاصيل كل مشروع ──────────────────── */}
                      <tr className="border-b bg-muted/20 text-muted-foreground">
                        {projectNames.map((pn) => (
                          <>
                            <th key={`${pn.id}-d`} className="p-2 text-center border-r">أيام</th>
                            <th key={`${pn.id}-e`} className="p-2 text-center">مستحق</th>
                            <th key={`${pn.id}-p`} className="p-2 text-center border-l">مدفوع</th>
                          </>
                        ))}
                        <th className="p-2 text-center">أيام</th>
                        <th className="p-2 text-center">مستحق</th>
                        <th className="p-2 text-center">مدفوع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorkers.map((w, ri) => (
                        <tr
                          key={w.workerName}
                          className={`border-b hover:bg-muted/30 transition-colors ${ri % 2 === 0 ? "" : "bg-muted/10"}`}
                          data-testid={`row-compare-worker-${ri}`}
                        >
                          <td className="p-2 font-medium text-right whitespace-nowrap">{w.workerName}</td>
                          <td className="p-2 text-muted-foreground text-right whitespace-nowrap">{w.workerType}</td>
                          {projectNames.map((pn, i) => {
                            const d = w.projects[pn.id];
                            return (
                              <>
                                <td
                                  key={`${pn.id}-d`}
                                  className="p-2 text-center border-r"
                                  style={{ borderColor: COLORS[i % COLORS.length] + "33" }}
                                >
                                  {d ? (
                                    <span className="font-medium">{d.days}</span>
                                  ) : (
                                    <span className="text-muted-foreground/40">—</span>
                                  )}
                                </td>
                                <td key={`${pn.id}-e`} className="p-2 text-center">
                                  {d ? (
                                    <span className="text-orange-600 dark:text-orange-400">{formatCurrency(d.earned)}</span>
                                  ) : (
                                    <span className="text-muted-foreground/40">—</span>
                                  )}
                                </td>
                                <td
                                  key={`${pn.id}-p`}
                                  className="p-2 text-center border-l"
                                  style={{ borderColor: COLORS[i % COLORS.length] + "33" }}
                                >
                                  {d ? (
                                    <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(d.paid)}</span>
                                  ) : (
                                    <span className="text-muted-foreground/40">—</span>
                                  )}
                                </td>
                              </>
                            );
                          })}
                          {/* إجمالي العامل */}
                          <td className="p-2 text-center font-bold bg-primary/5">{w.totalDays}</td>
                          <td className="p-2 text-center font-bold text-orange-700 dark:text-orange-300 bg-primary/5">
                            {formatCurrency(w.totalEarned)}
                          </td>
                          <td className="p-2 text-center font-bold text-green-700 dark:text-green-300 bg-primary/5">
                            {formatCurrency(w.totalPaid)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* ─── صف الإجماليات ─────────────────────────────────────── */}
                    <tfoot>
                      <tr className="border-t-2 bg-muted/50 font-bold text-xs">
                        <td className="p-2 font-bold" colSpan={2}>الإجمالي</td>
                        {projectNames.map((pn, i) => {
                          const ct = columnTotals[pn.id];
                          return (
                            <>
                              <td key={`${pn.id}-td`} className="p-2 text-center border-r" style={{ borderColor: COLORS[i % COLORS.length] + "33" }}>
                                {ct ? ct.days : 0}
                              </td>
                              <td key={`${pn.id}-te`} className="p-2 text-center text-orange-700 dark:text-orange-300">
                                {ct ? formatCurrency(ct.earned) : "—"}
                              </td>
                              <td key={`${pn.id}-tp`} className="p-2 text-center text-green-700 dark:text-green-300 border-l" style={{ borderColor: COLORS[i % COLORS.length] + "33" }}>
                                {ct ? formatCurrency(ct.paid) : "—"}
                              </td>
                            </>
                          );
                        })}
                        <td className="p-2 text-center bg-primary/10 text-primary">{grandTotals.days}</td>
                        <td className="p-2 text-center bg-primary/10 text-orange-700 dark:text-orange-300">{formatCurrency(grandTotals.earned)}</td>
                        <td className="p-2 text-center bg-primary/10 text-green-700 dark:text-green-300">{formatCurrency(grandTotals.paid)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* ─── ملاحظة عمال بمشروع واحد فقط ──────────────────────────── */}
                {pivotedWorkers.filter((w) => Object.keys(w.projects).length < projectNames.length).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center border-t pt-2">
                    الخلايا الفارغة (—) تعني أن العامل لا يعمل في ذلك المشروع خلال الفترة المحددة
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState message="لا يوجد عمال في الفترة المحددة" icon={Users} />
          )}

          {/* ─── جدول المواد المقارن ─────────────────────────────────────────── */}
          {filteredMaterials.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">المواد — الورقة الموحّدة</CardTitle>
                <Badge variant="secondary">{filteredMaterials.length} صنف</Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-compare-materials">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        {projectNames.map((pn, i) => (
                          <th
                            key={pn.id}
                            className="p-2 text-center font-bold"
                            style={{ color: COLORS[i % COLORS.length] }}
                          >
                            {pn.name}
                          </th>
                        ))}
                        <th className="p-2 text-right font-semibold">اسم المادة</th>
                        <th className="p-2 text-center font-semibold">الكمية</th>
                        <th className="p-2 text-center font-semibold">الإجمالي</th>
                        <th className="p-2 text-right font-semibold">المورد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map((m: any, i: number) => {
                        const projIdx = projectNames.findIndex((pn) => String(pn.id) === String(m.projectId));
                        return (
                          <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/10"} data-testid={`row-compare-material-${i}`}>
                            {projectNames.map((pn, pi) => (
                              <td key={pn.id} className="p-2 text-center">
                                {pi === projIdx ? (
                                  <span
                                    className="inline-block w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[pi % COLORS.length] }}
                                  />
                                ) : null}
                              </td>
                            ))}
                            <td className="p-2 font-medium">{m.materialName}</td>
                            <td className="p-2 text-center">{m.totalQuantity}</td>
                            <td className="p-2 text-center font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(m.totalAmount)}
                            </td>
                            <td className="p-2 text-muted-foreground">{m.supplierName || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/50 font-bold">
                        {projectNames.map((pn) => <td key={pn.id} className="p-2" />)}
                        <td className="p-2">الإجمالي</td>
                        <td className="p-2 text-center">
                          {filteredMaterials.reduce((s: number, m: any) => s + (m.totalQuantity || 0), 0)}
                        </td>
                        <td className="p-2 text-center text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(filteredMaterials.reduce((s: number, m: any) => s + (m.totalAmount || 0), 0))}
                        </td>
                        <td className="p-2" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
