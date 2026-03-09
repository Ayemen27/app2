import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Package,
  Truck,
  Calendar,
  User,
  ClipboardList,
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  DollarSign,
  CreditCard,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { arSA } from "date-fns/locale";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useSelectedProjectContext, ALL_PROJECTS_ID } from "@/contexts/SelectedProjectContext";
import { downloadExcelFile, downloadFile } from "@/utils/webview-download";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type {
  DailyReportData,
  WorkerStatementData,
  PeriodFinalReportData,
} from "@shared/report-types";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function safeFormatDate(dateStr: string | null | undefined, fmt: string, options?: { locale?: any }): string {
  if (!dateStr || dateStr === '-' || dateStr.length < 8) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return format(d, fmt, options);
  } catch {
    return '-';
  }
}

function getAuthToken(): string {
  return localStorage.getItem("accessToken") || localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
}

function buildExportUrl(type: string, format: string, params: Record<string, string>): string {
  const searchParams = new URLSearchParams({ format, ...params, token: getAuthToken() });
  return `/api/reports/v2/export/${type}?${searchParams.toString()}`;
}

function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="loading-spinner">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message || "جاري التحميل..."}</p>
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message: string; icon?: typeof AlertCircle }) {
  const EmptyIcon = Icon || AlertCircle;
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="empty-state">
      <EmptyIcon className="h-12 w-12 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}

function ExportButtons({
  onExcel,
  onPdf,
  disabled,
}: {
  onExcel: () => void;
  onPdf: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        onClick={onExcel}
        disabled={disabled}
        data-testid="button-export-excel"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
      >
        <FileSpreadsheet className="h-4 w-4 ml-1" />
        تصدير Excel
      </Button>
      <Button
        variant="outline"
        onClick={onPdf}
        disabled={disabled}
        data-testid="button-export-pdf"
        className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
      >
        <FileText className="h-4 w-4 ml-1" />
        تصدير PDF
      </Button>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  testId,
}: {
  headers: string[];
  rows: (string | number)[][];
  testId: string;
}) {
  if (!rows || rows.length === 0) {
    return <EmptyState message="لا توجد بيانات لعرضها" />;
  }
  return (
    <div className="overflow-x-auto rounded-md border" data-testid={testId}>
      <table className="w-full text-right border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h, i) => (
              <th key={i} className="p-3 font-bold text-muted-foreground border-b whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
            >
              {row.map((cell, j) => (
                <td key={j} className="p-3 border-b whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyReportTab() {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const projectIdForApi = isAllProjects ? "" : selectedProjectId;

  const { data: dailyReport, isLoading } = useQuery<DailyReportData | null>({
    queryKey: ["reports-v2-daily", projectIdForApi, selectedDate],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const params = new URLSearchParams({ project_id: projectIdForApi, date: selectedDate });
      const res = await apiRequest(`/api/reports/v2/daily?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: !!projectIdForApi && !!selectedDate,
    staleTime: 2 * 60 * 1000,
  });

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (!projectIdForApi) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروع أولاً", variant: "destructive" });
      return;
    }
    const url = buildExportUrl("daily", fmt, { project_id: projectIdForApi, date: selectedDate });
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-44"
              data-testid="input-daily-date"
            />
          </div>
          <Badge variant="outline" data-testid="badge-project-name">
            {selectedProjectName || "جميع المشاريع"}
          </Badge>
        </div>
        <ExportButtons
          onExcel={() => handleExport("xlsx")}
          onPdf={() => handleExport("pdf")}
          disabled={!projectIdForApi}
        />
      </div>

      {isAllProjects && (
        <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقرير اليومي" icon={ClipboardList} />
      )}

      {!isAllProjects && isLoading && <LoadingSpinner message="جاري تحميل التقرير اليومي..." />}

      {!isAllProjects && !isLoading && !dailyReport && (
        <EmptyState message="لا توجد بيانات لهذا اليوم" />
      )}

      {dailyReport && (
        <>
          <UnifiedStats
            stats={[
              { title: "عدد العمال", value: String(dailyReport.totals?.workerCount || 0), icon: Users, color: "blue" },
              { title: "إجمالي الأجور", value: dailyReport.totals?.totalWorkerWages || 0, icon: Wallet, color: "purple", formatter: formatCurrency },
              { title: "المواد", value: dailyReport.totals?.totalMaterials || 0, icon: Package, color: "orange", formatter: formatCurrency },
              { title: "النقل", value: dailyReport.totals?.totalTransport || 0, icon: Truck, color: "teal", formatter: formatCurrency },
              { title: "مصاريف متنوعة", value: dailyReport.totals?.totalMiscExpenses || 0, icon: CreditCard, color: "red", formatter: formatCurrency },
              { title: "الرصيد", value: dailyReport.totals?.balance || 0, icon: TrendingUp, color: "green", formatter: formatCurrency },
            ]}
            columns={3}
            hideHeader={true}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">سجل الحضور</CardTitle>
              <Badge variant="secondary">{dailyReport.attendance?.length || 0}</Badge>
            </CardHeader>
            <CardContent>
              <ReportTable
                testId="table-daily-attendance"
                headers={["#", "اسم العامل", "نوع العامل", "أيام العمل", "الأجر اليومي", "إجمالي الأجر", "المدفوع", "المتبقي", "وصف العمل"]}
                rows={(dailyReport.attendance || []).map((r, i) => [
                  i + 1,
                  r.workerName,
                  r.workerType,
                  r.workDays,
                  formatCurrency(r.dailyWage),
                  formatCurrency(r.totalWage),
                  formatCurrency(r.paidAmount),
                  formatCurrency(r.remainingAmount),
                  r.workDescription || "-",
                ])}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">المواد والمشتريات</CardTitle>
              <Badge variant="secondary">{dailyReport.materials?.length || 0}</Badge>
            </CardHeader>
            <CardContent>
              <ReportTable
                testId="table-daily-materials"
                headers={["#", "اسم المادة", "الصنف", "الكمية", "الوحدة", "سعر الوحدة", "الإجمالي", "المورد"]}
                rows={(dailyReport.materials || []).map((r, i) => [
                  i + 1,
                  r.materialName,
                  r.category || "-",
                  r.quantity,
                  r.unit || "-",
                  formatCurrency(r.unitPrice),
                  formatCurrency(r.totalAmount),
                  r.supplierName || "-",
                ])}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">مصاريف النقل</CardTitle>
              <Badge variant="secondary">{dailyReport.transport?.length || 0}</Badge>
            </CardHeader>
            <CardContent>
              <ReportTable
                testId="table-daily-transport"
                headers={["#", "المبلغ", "الوصف", "اسم العامل"]}
                rows={(dailyReport.transport || []).map((r, i) => [
                  i + 1,
                  formatCurrency(r.amount),
                  r.description || "-",
                  r.workerName || "-",
                ])}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">مصاريف متنوعة</CardTitle>
              <Badge variant="secondary">{dailyReport.miscExpenses?.length || 0}</Badge>
            </CardHeader>
            <CardContent>
              <ReportTable
                testId="table-daily-misc"
                headers={["#", "المبلغ", "الوصف", "ملاحظات"]}
                rows={(dailyReport.miscExpenses || []).map((r, i) => [
                  i + 1,
                  formatCurrency(r.amount),
                  r.description || "-",
                  r.notes || "-",
                ])}
              />
            </CardContent>
          </Card>

          {(dailyReport.fundTransfers?.length || 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">تحويلات الصناديق</CardTitle>
                <Badge variant="secondary">{dailyReport.fundTransfers?.length || 0}</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-daily-fund-transfers"
                  headers={["#", "المبلغ", "المرسل", "نوع التحويل", "رقم التحويل"]}
                  rows={(dailyReport.fundTransfers || []).map((r, i) => [
                    i + 1,
                    formatCurrency(r.amount),
                    r.senderName || "-",
                    r.transferType || "-",
                    r.transferNumber || "-",
                  ])}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function WorkerStatementTab() {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: null,
    worker_id: "all",
  });

  const { data: workersList = [] } = useQuery({
    queryKey: QUERY_KEYS.workers,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("/api/workers", "GET");
      let workersData: any[] = [];
      if (res && typeof res === "object") {
        if (res.success && Array.isArray(res.data)) {
          workersData = res.data;
        } else if (Array.isArray(res)) {
          workersData = res;
        }
      }
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        return workersData.filter((w: any) => w.project_id === selectedProjectId);
      }
      return workersData;
    },
  });

  const filterConfig: FilterConfig[] = [
    {
      key: "dateRange",
      label: "الفترة الزمنية",
      type: "date-range",
    },
    {
      key: "worker_id",
      label: "العامل",
      type: "select",
      showSearch: true,
      options: [
        { label: "جميع العمال", value: "all" },
        ...workersList.map((w: any) => ({
          label: w.name,
          value: w.id,
        })),
      ],
    },
  ];

  const onFilterChange = (key: string, val: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: val }));
    if (key === "worker_id") {
      setSelectedWorkerId(val === "all" ? null : val);
    }
  };

  const { data: workerStatement, isLoading: workerLoading } = useQuery<WorkerStatementData | null>({
    queryKey: ["reports-v2-worker-statement", selectedWorkerId, selectedProjectId, filterValues.dateRange],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const params = new URLSearchParams();
      params.append("worker_id", selectedWorkerId);
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        params.append("project_id", selectedProjectId);
      }
      if (filterValues.dateRange?.from) {
        params.append("dateFrom", format(new Date(filterValues.dateRange.from), "yyyy-MM-dd"));
      }
      if (filterValues.dateRange?.to) {
        params.append("dateTo", format(new Date(filterValues.dateRange.to), "yyyy-MM-dd"));
      }
      const res = await apiRequest(`/api/reports/v2/worker-statement?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: !!selectedWorkerId,
  });

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (!selectedWorkerId) {
      toast({ title: "تنبيه", description: "الرجاء اختيار عامل أولاً", variant: "destructive" });
      return;
    }
    const exportParams: Record<string, string> = { worker_id: selectedWorkerId };
    if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
      exportParams.project_id = selectedProjectId;
    }
    if (filterValues.dateRange?.from) {
      exportParams.dateFrom = format(new Date(filterValues.dateRange.from), "yyyy-MM-dd");
    }
    if (filterValues.dateRange?.to) {
      exportParams.dateTo = format(new Date(filterValues.dateRange.to), "yyyy-MM-dd");
    }
    const url = buildExportUrl("worker-statement", fmt, exportParams);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0" />
        <ExportButtons
          onExcel={() => handleExport("xlsx")}
          onPdf={() => handleExport("pdf")}
          disabled={!selectedWorkerId}
        />
      </div>

      <UnifiedFilterDashboard
        filters={filterConfig}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث عن عامل..."
        isRefreshing={workerLoading}
        onReset={() => {
          setSearchValue("");
          setFilterValues({ dateRange: null, worker_id: "all" });
          setSelectedWorkerId(null);
        }}
      />

      {!selectedWorkerId && (
        <EmptyState message="الرجاء اختيار عامل من القائمة لعرض كشف الحساب" icon={User} />
      )}

      {selectedWorkerId && workerLoading && <LoadingSpinner message="جاري تحميل كشف حساب العامل..." />}

      {selectedWorkerId && !workerLoading && workerStatement && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">اسم العامل</p>
                <p className="text-base font-bold mt-1" data-testid="text-worker-name">{workerStatement.worker?.name || "-"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">نوع العامل</p>
                <p className="text-base font-bold mt-1" data-testid="text-worker-type">{workerStatement.worker?.type || "عامل"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">الأجر اليومي</p>
                <p className="text-base font-bold mt-1 text-blue-600 dark:text-blue-400" data-testid="text-worker-wage">
                  {formatCurrency(workerStatement.worker?.dailyWage || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">الهاتف</p>
                <p className="text-base font-bold mt-1" data-testid="text-worker-phone">{workerStatement.worker?.phone || "-"}</p>
              </CardContent>
            </Card>
          </div>

          <UnifiedStats
            stats={[
              { title: "إجمالي أيام العمل", value: String(workerStatement.totals?.totalWorkDays || 0), icon: Calendar, color: "blue" },
              { title: "إجمالي المستحق", value: workerStatement.totals?.totalEarned || 0, icon: TrendingUp, color: "green", formatter: formatCurrency },
              { title: "إجمالي المدفوع", value: workerStatement.totals?.totalPaid || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
              { title: "الرصيد المتبقي", value: workerStatement.totals?.finalBalance || 0, icon: Wallet, color: "purple", formatter: formatCurrency },
            ]}
            columns={4}
            hideHeader={true}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">كشف الحساب التفصيلي</CardTitle>
              <Badge variant="secondary">{workerStatement.statement?.length || 0} حركة</Badge>
            </CardHeader>
            <CardContent>
              <ReportTable
                testId="table-worker-statement"
                headers={["#", "التاريخ", "اليوم", "النوع", "المشروع", "أيام العمل", "مدين", "دائن", "الرصيد", "الوصف"]}
                rows={(workerStatement.statement || []).map((row, i) => [
                  i + 1,
                  safeFormatDate(row.date, "dd/MM/yyyy"),
                  safeFormatDate(row.date, "EEEE", { locale: arSA }),
                  row.type || "-",
                  row.projectName || selectedProjectName || "-",
                  row.workDays || 0,
                  formatCurrency(row.debit || 0),
                  formatCurrency(row.credit || 0),
                  formatCurrency(row.balance || 0),
                  row.description || "-",
                ])}
              />
            </CardContent>
          </Card>

          {(workerStatement.projectSummary?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ملخص المشاريع</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-worker-project-summary"
                  headers={["المشروع", "أيام العمل", "المستحق", "المدفوع", "الرصيد"]}
                  rows={(workerStatement.projectSummary || []).map((p) => [
                    p.projectName,
                    p.totalDays,
                    formatCurrency(p.totalEarned),
                    formatCurrency(p.totalPaid),
                    formatCurrency(p.balance),
                  ])}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function PeriodFinalTab() {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const projectIdForApi = isAllProjects ? "" : selectedProjectId;

  const { data: periodReport, isLoading } = useQuery<PeriodFinalReportData | null>({
    queryKey: ["reports-v2-period-final", projectIdForApi, dateFrom, dateTo],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const params = new URLSearchParams({
        project_id: projectIdForApi,
        dateFrom,
        dateTo,
      });
      const res = await apiRequest(`/api/reports/v2/period-final?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: !!projectIdForApi && !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000,
  });

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (!projectIdForApi) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروع أولاً", variant: "destructive" });
      return;
    }
    const url = buildExportUrl("period-final", fmt, {
      project_id: projectIdForApi,
      dateFrom,
      dateTo,
    });
    window.open(url, "_blank");
  };

  const pieData = useMemo(() => {
    if (!periodReport?.totals) return [];
    return [
      { name: "الأجور", value: periodReport.totals.totalWages || 0 },
      { name: "المواد", value: periodReport.totals.totalMaterials || 0 },
      { name: "النقل", value: periodReport.totals.totalTransport || 0 },
      { name: "متنوعة", value: periodReport.totals.totalMisc || 0 },
      { name: "تحويلات عمال", value: periodReport.totals.totalWorkerTransfers || 0 },
    ].filter((d) => d.value > 0);
  }, [periodReport]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">من:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
              data-testid="input-period-from"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">إلى:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
              data-testid="input-period-to"
            />
          </div>
          <Badge variant="outline" data-testid="badge-period-project">
            {selectedProjectName || "جميع المشاريع"}
          </Badge>
        </div>
        <ExportButtons
          onExcel={() => handleExport("xlsx")}
          onPdf={() => handleExport("pdf")}
          disabled={!projectIdForApi}
        />
      </div>

      {isAllProjects && (
        <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقرير الختامي" icon={BarChart3} />
      )}

      {!isAllProjects && isLoading && <LoadingSpinner message="جاري تحميل التقرير الختامي..." />}

      {!isAllProjects && !isLoading && !periodReport && (
        <EmptyState message="لا توجد بيانات للفترة المحددة" />
      )}

      {periodReport && (
        <>
          <UnifiedStats
            stats={[
              { title: "إجمالي الوارد", value: periodReport.totals?.totalIncome || 0, icon: TrendingUp, color: "blue", formatter: formatCurrency },
              { title: "إجمالي المصروفات", value: periodReport.totals?.totalExpenses || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
              { title: "الرصيد", value: periodReport.totals?.balance || 0, icon: Wallet, color: "green", formatter: formatCurrency },
              {
                title: "نسبة استخدام الميزانية",
                value: periodReport.totals?.budgetUtilization != null
                  ? `${Math.round(periodReport.totals.budgetUtilization)}%`
                  : "غير محدد",
                icon: PieChartIcon,
                color: "orange",
              },
            ]}
            columns={4}
            hideHeader={true}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  الإنفاق عبر الزمن
                </CardTitle>
              </CardHeader>
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
                ) : (
                  <EmptyState message="لا توجد بيانات رسم بياني" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  توزيع التكاليف
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="h-[300px] w-full" data-testid="chart-cost-breakdown">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="لا توجد بيانات كافية لعرض التوزيع" />
                )}
              </CardContent>
            </Card>
          </div>

          {(periodReport.sections?.attendance?.byWorker?.length || 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">ملخص الحضور</CardTitle>
                <Badge variant="secondary">{periodReport.sections.attendance.byWorker.length} عامل</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-period-attendance"
                  headers={["اسم العامل", "نوع العامل", "أيام العمل", "المستحق", "المدفوع", "الرصيد"]}
                  rows={periodReport.sections.attendance.byWorker.map((w) => [
                    w.workerName,
                    w.workerType,
                    w.totalDays,
                    formatCurrency(w.totalEarned),
                    formatCurrency(w.totalPaid),
                    formatCurrency(w.balance),
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {(periodReport.sections?.materials?.items?.length || 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">ملخص المواد</CardTitle>
                <Badge variant="secondary">{periodReport.sections.materials.items.length} مادة</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-period-materials"
                  headers={["اسم المادة", "الكمية", "الإجمالي", "المورد"]}
                  rows={periodReport.sections.materials.items.map((m) => [
                    m.materialName,
                    m.totalQuantity,
                    formatCurrency(m.totalAmount),
                    m.supplierName || "-",
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {(periodReport.sections?.fundTransfers?.items?.length || 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">تحويلات الصناديق</CardTitle>
                <Badge variant="secondary">{periodReport.sections.fundTransfers.items.length}</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-period-fund-transfers"
                  headers={["التاريخ", "المبلغ", "المرسل", "نوع التحويل"]}
                  rows={periodReport.sections.fundTransfers.items.map((f) => [
                    safeFormatDate(f.date, "dd/MM/yyyy"),
                    formatCurrency(f.amount),
                    f.senderName || "-",
                    f.transferType || "-",
                  ])}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ملخص الأقسام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">النقل</p>
                  <p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.transport?.total || 0)}</p>
                  <p className="text-xs text-muted-foreground">{periodReport.sections?.transport?.tripCount || 0} رحلة</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">مصاريف متنوعة</p>
                  <p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.miscExpenses?.total || 0)}</p>
                  <p className="text-xs text-muted-foreground">{periodReport.sections?.miscExpenses?.count || 0} عملية</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">تحويلات الصناديق</p>
                  <p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.fundTransfers?.total || 0)}</p>
                  <p className="text-xs text-muted-foreground">{periodReport.sections?.fundTransfers?.count || 0} تحويل</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">تحويلات العمال</p>
                  <p className="font-bold text-sm mt-1">{formatCurrency(periodReport.sections?.workerTransfers?.total || 0)}</p>
                  <p className="text-xs text-muted-foreground">{periodReport.sections?.workerTransfers?.count || 0} تحويل</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function AxionReports() {
  const [activeTab, setActiveTab] = useState("daily");

  return (
    <div className="fade-in pb-40" dir="rtl">
      <div className="p-4 space-y-6 min-h-screen">
        <div className="text-center space-y-1 mb-6 border-b pb-4">
          <h1 className="text-xl sm:text-2xl font-black text-foreground" data-testid="text-company-name">
            شركة الفتيني للمقاولات والاستشارات الهندسية
          </h1>
          <h2 className="text-sm sm:text-base font-bold text-muted-foreground" data-testid="text-report-center">
            مركز التقارير الاحترافي
          </h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3" data-testid="tabs-report-center">
            <TabsTrigger value="daily" className="gap-1 text-xs sm:text-sm" data-testid="tab-daily">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">التقرير اليومي</span>
              <span className="sm:hidden">يومي</span>
            </TabsTrigger>
            <TabsTrigger value="worker" className="gap-1 text-xs sm:text-sm" data-testid="tab-worker">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">كشف حساب العمال</span>
              <span className="sm:hidden">العمال</span>
            </TabsTrigger>
            <TabsTrigger value="final" className="gap-1 text-xs sm:text-sm" data-testid="tab-final">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">التقرير الختامي</span>
              <span className="sm:hidden">ختامي</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            <DailyReportTab />
          </TabsContent>

          <TabsContent value="worker" className="mt-4">
            <WorkerStatementTab />
          </TabsContent>

          <TabsContent value="final" className="mt-4">
            <PeriodFinalTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
