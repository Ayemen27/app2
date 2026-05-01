import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, TrendingDown, Wallet, User, FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useSelectedProjectContext, ALL_PROJECTS_ID } from "@/contexts/SelectedProjectContext";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { WorkerStatementData } from "@shared/report-types";
import { LoadingSpinner, EmptyState, ReportTable, safeFormatDate, secureDownloadExport, buildArabicReportFileName } from "./utils";

export function WorkerStatementTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: null,
    worker_id: "all",
    project_scope: "all",
  });

  const { data: workersList = [] } = useQuery({
    queryKey: QUERY_KEYS.workers,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("/api/workers", "GET");
      let workersData: any[] = [];
      if (res && typeof res === "object") {
        if (res.success && Array.isArray(res.data)) workersData = res.data;
        else if (Array.isArray(res)) workersData = res;
      }
      return workersData;
    },
  });

  const filterConfig: FilterConfig[] = [
    { key: "dateRange", label: "الفترة الزمنية", type: "date-range" },
    {
      key: "worker_id",
      label: "العامل",
      type: "select",
      options: [
        { label: "جميع العمال", value: "all" },
        ...workersList.map((w: any) => ({ label: w.name, value: w.id })),
      ],
    },
    {
      key: "project_scope",
      label: "نطاق المشاريع",
      type: "select",
      options: [
        { label: "جميع المشاريع", value: "all" },
        ...(selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID
          ? [{ label: selectedProjectName || "المشروع الحالي", value: selectedProjectId }]
          : []),
      ],
    },
  ];

  const onFilterChange = (key: string, val: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: val }));
    if (key === "worker_id") setSelectedWorkerId(val === "all" ? null : val);
  };

  const workerProjectScope = filterValues.project_scope !== "all" ? filterValues.project_scope : undefined;

  const { data: workerStatement, isLoading: workerLoading, refetch } = useQuery<WorkerStatementData | null>({
    queryKey: ["reports-v2-worker-statement", selectedWorkerId, workerProjectScope, filterValues.dateRange],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const params = new URLSearchParams();
      params.append("worker_id", selectedWorkerId);
      if (workerProjectScope) params.append("project_id", workerProjectScope);
      if (filterValues.dateRange?.from) params.append("dateFrom", format(new Date(filterValues.dateRange.from), "yyyy-MM-dd"));
      if (filterValues.dateRange?.to) params.append("dateTo", format(new Date(filterValues.dateRange.to), "yyyy-MM-dd"));
      const res = await apiRequest(`/api/reports/v2/worker-statement?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: !!selectedWorkerId,
  });

  useEffect(() => {
    if (selectedWorkerId && !workerLoading && workerStatement && onStatsReady) {
      onStatsReady([
        { title: "إجمالي أيام العمل", value: String(workerStatement.totals?.totalWorkDays || 0), icon: Calendar, color: "blue" },
        { title: "إجمالي المستحق", value: workerStatement.totals?.totalEarned || 0, icon: TrendingUp, color: "green", formatter: formatCurrency },
        { title: "إجمالي المدفوع", value: workerStatement.totals?.totalPaid || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
        { title: "الرصيد المتبقي", value: workerStatement.totals?.finalBalance || 0, icon: Wallet, color: "purple", formatter: formatCurrency },
      ]);
    } else if (onStatsReady && (!selectedWorkerId || (!workerLoading && !workerStatement))) {
      onStatsReady([]);
    }
  }, [workerStatement, workerLoading, selectedWorkerId, onStatsReady]);

  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExport = async (fmt: "xlsx" | "pdf") => {
    if (!selectedWorkerId) {
      toast({ title: "تنبيه", description: "الرجاء اختيار عامل أولاً", variant: "destructive" });
      return;
    }
    const exportParams: Record<string, string> = { worker_id: selectedWorkerId };
    if (workerProjectScope) exportParams.project_id = workerProjectScope;
    if (filterValues.dateRange?.from) exportParams.dateFrom = format(new Date(filterValues.dateRange.from), "yyyy-MM-dd");
    if (filterValues.dateRange?.to) exportParams.dateTo = format(new Date(filterValues.dateRange.to), "yyyy-MM-dd");
    const setLoading = fmt === "xlsx" ? setIsExportingXlsx : setIsExportingPdf;
    setLoading(true);
    try {
      await secureDownloadExport(
        "worker-statement",
        fmt,
        exportParams,
        toast,
        buildArabicReportFileName({
          type: "worker-statement",
          fmt,
          workerName: workerStatement?.worker?.name,
          dateFrom: exportParams.dateFrom,
          dateTo: exportParams.dateTo,
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const exportActions: ActionButton[] = [
    { key: "export-excel", icon: FileSpreadsheet, tooltip: "تصدير Excel", onClick: () => handleExport("xlsx"), disabled: !selectedWorkerId || isExportingXlsx || isExportingPdf, loading: isExportingXlsx },
    { key: "export-pdf", icon: FileText, tooltip: "تصدير PDF", onClick: () => handleExport("pdf"), disabled: !selectedWorkerId || isExportingPdf || isExportingXlsx, loading: isExportingPdf },
  ];

  return (
    <div className="space-y-4">
      <UnifiedFilterDashboard
        filters={filterConfig}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        actions={exportActions}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث عن عامل..."
        isRefreshing={workerLoading}
        onRefresh={() => refetch()}
        onReset={() => {
          setSearchValue("");
          setFilterValues({ dateRange: null, worker_id: "all", project_scope: "all" });
          setSelectedWorkerId(null);
        }}
      />

      {!selectedWorkerId && <EmptyState message="الرجاء اختيار عامل من القائمة لعرض كشف الحساب" icon={User} />}
      {selectedWorkerId && workerLoading && <LoadingSpinner message="جاري تحميل كشف حساب العامل..." />}

      {selectedWorkerId && !workerLoading && workerStatement && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">اسم العامل</p><p className="text-base font-bold mt-1" data-testid="text-worker-name">{workerStatement.worker?.name || "-"}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">نوع العامل</p><p className="text-base font-bold mt-1" data-testid="text-worker-type">{workerStatement.worker?.type || "عامل"}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">الأجر اليومي</p><p className="text-base font-bold mt-1 text-blue-600 dark:text-blue-400" data-testid="text-worker-wage">{formatCurrency(workerStatement.worker?.dailyWage || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground font-medium">الهاتف</p><p className="text-base font-bold mt-1" data-testid="text-worker-phone">{workerStatement.worker?.phone || "-"}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">كشف الحساب التفصيلي</CardTitle>
              <Badge variant="secondary">{workerStatement.statement?.length || 0} حركة</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border" data-testid="table-worker-statement">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      {["#", "التاريخ", "اليوم", "النوع", "المشروع", "أيام العمل", "مدين", "دائن", "الرصيد", "الوصف"].map((h, i) => (
                        <th key={i} className="p-3 font-bold text-muted-foreground border-b whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(workerStatement.statement || []).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="p-3 border-b whitespace-nowrap">{i + 1}</td>
                        <td className="p-3 border-b whitespace-nowrap">{safeFormatDate(row.date, "dd/MM/yyyy")}</td>
                        <td className="p-3 border-b whitespace-nowrap">{safeFormatDate(row.date, "EEEE", { locale: arSA })}</td>
                        <td className="p-3 border-b whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            row.type === 'عمل' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' :
                            row.type === 'دفعة' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                            row.type === 'حوالة' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' :
                            row.type === 'تصفية' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' :
                            'bg-muted text-muted-foreground'
                          }`}>{row.type || "-"}</span>
                        </td>
                        <td className="p-3 border-b whitespace-nowrap">{row.projectName || selectedProjectName || "-"}</td>
                        <td className="p-3 border-b whitespace-nowrap">{row.workDays || 0}</td>
                        <td className="p-3 border-b whitespace-nowrap font-medium text-blue-600 dark:text-blue-400">
                          {(row.debit || 0) > 0 ? formatCurrency(row.debit) : "-"}
                        </td>
                        <td className="p-3 border-b whitespace-nowrap font-medium text-green-600 dark:text-green-400">
                          {(row.credit || 0) > 0 ? formatCurrency(row.credit) : "-"}
                        </td>
                        <td className={`p-3 border-b whitespace-nowrap font-bold ${(row.balance || 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(row.balance || 0)}
                        </td>
                        <td className="p-3 border-b whitespace-nowrap text-muted-foreground">{row.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  {(workerStatement.statement?.length || 0) > 1 && (
                    <tfoot>
                      <tr className="bg-muted/60 font-bold border-t-2 border-border">
                        <td className="p-3" colSpan={6}>الإجمالي</td>
                        <td className="p-3 whitespace-nowrap text-blue-600 dark:text-blue-400">
                          {formatCurrency((workerStatement.statement || []).reduce((s, r) => s + (r.debit || 0), 0))}
                        </td>
                        <td className="p-3 whitespace-nowrap text-green-600 dark:text-green-400">
                          {formatCurrency((workerStatement.statement || []).reduce((s, r) => s + (r.credit || 0), 0))}
                        </td>
                        <td className="p-3 whitespace-nowrap" colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {(workerStatement.projectSummary?.length || 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">ملخص المشاريع</CardTitle>
                <Badge variant="secondary" data-testid="badge-project-count">{workerStatement.projectSummary.length} مشروع</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-worker-project-summary"
                  headers={["المشروع", "أيام العمل", "المستحق", "المدفوع", "المتبقي"]}
                  rows={[
                    ...(workerStatement.projectSummary || []).map((p) => [
                      p.projectName, p.totalDays,
                      formatCurrency(p.totalEarned), formatCurrency(p.totalPaid), formatCurrency(p.balance),
                    ]),
                  ]}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t">
                  <div className="text-center p-2 rounded-md bg-blue-50 dark:bg-blue-950/30" data-testid="stat-total-projects-days"><p className="text-xs text-muted-foreground">إجمالي الأيام</p><p className="font-bold text-sm mt-1">{workerStatement.projectSummary.reduce((s, p) => s + p.totalDays, 0).toFixed(1)}</p></div>
                  <div className="text-center p-2 rounded-md bg-green-50 dark:bg-green-950/30" data-testid="stat-total-projects-earned"><p className="text-xs text-muted-foreground">إجمالي المستحق</p><p className="font-bold text-sm mt-1 text-green-700 dark:text-green-400">{formatCurrency(workerStatement.projectSummary.reduce((s, p) => s + p.totalEarned, 0))}</p></div>
                  <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-950/30" data-testid="stat-total-projects-paid"><p className="text-xs text-muted-foreground">إجمالي المدفوع</p><p className="font-bold text-sm mt-1 text-red-700 dark:text-red-400">{formatCurrency(workerStatement.projectSummary.reduce((s, p) => s + p.totalPaid, 0))}</p></div>
                  <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/30" data-testid="stat-total-projects-balance"><p className="text-xs text-muted-foreground">المتبقي</p><p className="font-bold text-sm mt-1 text-amber-700 dark:text-amber-400">{formatCurrency(workerStatement.projectSummary.reduce((s, p) => s + p.balance, 0))}</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
