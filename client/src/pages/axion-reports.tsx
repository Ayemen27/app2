import { useState, useMemo, useEffect, useCallback } from "react";
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
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
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

import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
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

function buildExportUrl(type: string, fmt: string, params: Record<string, string>): string {
  const searchParams = new URLSearchParams({ format: fmt, ...params });
  return `/api/reports/v2/export/${type}?${searchParams.toString()}`;
}

async function secureDownloadExport(type: string, fmt: string, params: Record<string, string>, toast: any) {
  const url = buildExportUrl(type, fmt, params);
  try {
    const token = getAuthToken();
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const contentDisposition = response.headers.get('content-disposition');
    let fileName = `report-${type}.${fmt}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        fileName = match[1].replace(/['"]/g, '');
      }
    }

    const blob = await response.blob();
    const { downloadFile } = await import('@/utils/webview-download');
    await downloadFile(blob, fileName);
  } catch (error: any) {
    console.error('[Export] Download failed:', error);
    toast({
      title: 'خطأ في التصدير',
      description: error.message || 'فشل تحميل الملف',
      variant: 'destructive',
    });
  }
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

function SingleDayReport({ report, searchValue }: { report: DailyReportData; searchValue: string }) {
  const q = searchValue.trim().toLowerCase();
  const filteredAttendance = (report.attendance || []).filter((r: any) =>
    !q || [r.workerName, r.workerType, r.workDescription].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredMaterials = (report.materials || []).filter((r: any) =>
    !q || [r.materialName, r.category, r.supplierName].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredTransport = (report.transport || []).filter((r: any) =>
    !q || [r.description, r.workerName].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredMisc = (report.miscExpenses || []).filter((r: any) =>
    !q || [r.description, r.notes].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredFundTransfers = (report.fundTransfers || []).filter((r: any) =>
    !q || [r.senderName, r.transferType, r.transferNumber].some((v: string) => v?.toLowerCase().includes(q))
  );
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">سجل الحضور</CardTitle>
          <Badge variant="secondary">{filteredAttendance.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-attendance"
            headers={["#", "اسم العامل", "نوع العامل", "أيام العمل", "الأجر اليومي", "إجمالي الأجر", "المدفوع", "المتبقي", "وصف العمل"]}
            rows={filteredAttendance.map((r: any, i: number) => [
              i + 1, r.workerName, r.workerType, r.workDays, formatCurrency(r.dailyWage),
              formatCurrency(r.totalWage), formatCurrency(r.paidAmount), formatCurrency(r.remainingAmount), r.workDescription || "-",
            ])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">المواد والمشتريات</CardTitle>
          <Badge variant="secondary">{filteredMaterials.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-materials"
            headers={["#", "اسم المادة", "الصنف", "الكمية", "الوحدة", "سعر الوحدة", "الإجمالي", "المورد"]}
            rows={filteredMaterials.map((r: any, i: number) => [
              i + 1, r.materialName, r.category || "-", r.quantity, r.unit || "-",
              formatCurrency(r.unitPrice), formatCurrency(r.totalAmount), r.supplierName || "-",
            ])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">مصاريف النقل</CardTitle>
          <Badge variant="secondary">{filteredTransport.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-transport"
            headers={["#", "المبلغ", "الوصف", "اسم العامل"]}
            rows={filteredTransport.map((r: any, i: number) => [
              i + 1, formatCurrency(r.amount), r.description || "-", r.workerName || "-",
            ])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">مصاريف متنوعة</CardTitle>
          <Badge variant="secondary">{filteredMisc.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-misc"
            headers={["#", "المبلغ", "الوصف", "ملاحظات"]}
            rows={filteredMisc.map((r: any, i: number) => [
              i + 1, formatCurrency(r.amount), r.description || "-", r.notes || "-",
            ])}
          />
        </CardContent>
      </Card>

      {filteredFundTransfers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">تحويلات الصناديق</CardTitle>
            <Badge variant="secondary">{filteredFundTransfers.length}</Badge>
          </CardHeader>
          <CardContent>
            <ReportTable
              testId="table-daily-fund-transfers"
              headers={["#", "المبلغ", "المرسل", "نوع التحويل", "رقم التحويل"]}
              rows={filteredFundTransfers.map((r: any, i: number) => [
                i + 1, formatCurrency(r.amount), r.senderName || "-", r.transferType || "-", r.transferNumber || "-",
              ])}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function RangeDayPage({ report, searchValue }: { report: DailyReportData; searchValue: string }) {
  const q = searchValue.trim().toLowerCase();

  const allExpenses: { category: string; description: string; amount: number; notes: string }[] = [];

  (report.attendance || []).forEach((r: any) => {
    if (!q || [r.workerName, r.workerType].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "أجور عمال", description: r.workerName + (r.workerType ? ` (${r.workerType})` : ""), amount: r.totalWage || 0, notes: r.workDescription || "-" });
  });
  (report.materials || []).forEach((r: any) => {
    if (!q || [r.materialName, r.supplierName].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "مواد", description: r.materialName + (r.quantity ? ` × ${r.quantity}` : ""), amount: r.totalAmount || 0, notes: r.supplierName || "-" });
  });
  (report.transport || []).forEach((r: any) => {
    if (!q || [r.description, r.workerName].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "نقل", description: r.description || "نقل", amount: r.amount || 0, notes: r.workerName || "-" });
  });
  (report.miscExpenses || []).forEach((r: any) => {
    if (!q || [r.description, r.notes].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "مصاريف متنوعة", description: r.description || "-", amount: r.amount || 0, notes: r.notes || "-" });
  });

  const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);

  const fundTransfers = (report.fundTransfers || []).filter((r: any) =>
    !q || [r.senderName, r.transferType].some((v: string) => v?.toLowerCase().includes(q))
  );
  const totalFundTransfers = fundTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);

  const workerTransfers = (report.workerTransfers || []).filter((r: any) =>
    !q || [r.workerName, r.transferType].some((v: string) => v?.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            جدول المصروفات
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{allExpenses.length} عملية</Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20">{formatCurrency(totalExpenses)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {allExpenses.length > 0 ? (
            <ReportTable
              testId="table-range-expenses"
              headers={["#", "القسم", "البيان", "المبلغ", "ملاحظات"]}
              rows={allExpenses.map((e, i) => [
                i + 1, e.category, e.description, formatCurrency(e.amount), e.notes,
              ])}
            />
          ) : (
            <EmptyState message="لا توجد مصروفات لهذا اليوم" />
          )}
          {allExpenses.length > 0 && (
            <div className="flex justify-end mt-3 pt-3 border-t">
              <div className="text-sm font-bold text-foreground">
                إجمالي المصروفات: <span className="text-primary mr-1">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {fundTransfers.length > 0 && (
        <Card className="border-green-200 dark:border-green-800/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <Wallet className="h-4 w-4" />
              العهدة (الوارد للصندوق)
            </CardTitle>
            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">{formatCurrency(totalFundTransfers)}</Badge>
          </CardHeader>
          <CardContent>
            <ReportTable
              testId="table-range-fund-transfers"
              headers={["#", "المبلغ", "المرسل", "نوع التحويل", "رقم التحويل"]}
              rows={fundTransfers.map((r: any, i: number) => [
                i + 1, formatCurrency(r.amount), r.senderName || "-", r.transferType || "-", r.transferNumber || "-",
              ])}
            />
          </CardContent>
        </Card>
      )}

      {workerTransfers.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <ArrowUpDown className="h-4 w-4" />
              الأموال الواردة من مشروع آخر
            </CardTitle>
            <Badge variant="secondary">{workerTransfers.length}</Badge>
          </CardHeader>
          <CardContent>
            <ReportTable
              testId="table-range-worker-transfers"
              headers={["#", "المبلغ", "اسم العامل", "نوع التحويل"]}
              rows={workerTransfers.map((r: any, i: number) => [
                i + 1, formatCurrency(r.amount), r.workerName || "-", r.transferType || "-",
              ])}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
          <p className="text-[10px] text-muted-foreground font-medium">عدد العمال</p>
          <p className="font-bold text-blue-700 dark:text-blue-400 text-sm mt-0.5">{report.totals?.workerCount || 0}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
          <p className="text-[10px] text-muted-foreground font-medium">المواد</p>
          <p className="font-bold text-orange-700 dark:text-orange-400 text-sm mt-0.5">{formatCurrency(report.totals?.totalMaterials || 0)}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
          <p className="text-[10px] text-muted-foreground font-medium">الأجور</p>
          <p className="font-bold text-purple-700 dark:text-purple-400 text-sm mt-0.5">{formatCurrency(report.totals?.totalWorkerWages || 0)}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
          <p className="text-[10px] text-muted-foreground font-medium">إجمالي المصروفات</p>
          <p className="font-bold text-red-700 dark:text-red-400 text-sm mt-0.5">{formatCurrency(report.totals?.totalExpenses || 0)}</p>
        </div>
      </div>
    </div>
  );
}

function DailyReportTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchValue, setSearchValue] = useState("");
  const [reportMode, setReportMode] = useState<"single" | "range">("single");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [rangePageIndex, setRangePageIndex] = useState(0);
  const [rangeReports, setRangeReports] = useState<DailyReportData[]>([]);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [rangeDates, setRangeDates] = useState<string[]>([]);

  const projectIdForApi = isAllProjects ? "" : selectedProjectId;
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: dailyReport, isLoading, refetch } = useQuery<DailyReportData | null>({
    queryKey: ["reports-v2-daily", projectIdForApi, dateStr],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const params = new URLSearchParams({ project_id: projectIdForApi, date: dateStr });
      const res = await apiRequest(`/api/reports/v2/daily?${params.toString()}`, "GET");
      return res?.data || res;
    },
    enabled: !!projectIdForApi && !!dateStr && reportMode === "single",
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (reportMode === "single") {
      if (dailyReport && onStatsReady) {
        onStatsReady([
          { title: "عدد العمال", value: String(dailyReport.totals?.workerCount || 0), icon: Users, color: "blue" },
          { title: "إجمالي الأجور", value: dailyReport.totals?.totalWorkerWages || 0, icon: Wallet, color: "purple", formatter: formatCurrency },
          { title: "المواد", value: dailyReport.totals?.totalMaterials || 0, icon: Package, color: "orange", formatter: formatCurrency },
          { title: "النقل", value: dailyReport.totals?.totalTransport || 0, icon: Truck, color: "teal", formatter: formatCurrency },
          { title: "مصاريف متنوعة", value: dailyReport.totals?.totalMiscExpenses || 0, icon: CreditCard, color: "red", formatter: formatCurrency },
          { title: "الرصيد", value: dailyReport.totals?.balance || 0, icon: TrendingUp, color: "green", formatter: formatCurrency },
        ]);
      } else if (!dailyReport && onStatsReady) {
        onStatsReady([]);
      }
    }
  }, [dailyReport, onStatsReady, reportMode]);

  useEffect(() => {
    if (reportMode === "range" && rangeReports.length > 0 && onStatsReady) {
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
    } else if (reportMode === "range" && rangeReports.length === 0 && onStatsReady) {
      onStatsReady([]);
    }
  }, [rangeReports, rangeDates, onStatsReady, reportMode]);

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

  const fetchRangeReports = async () => {
    if (!projectIdForApi || !dateRange.from || !dateRange.to) {
      toast({ title: "تنبيه", description: "الرجاء اختيار المشروع وتحديد الفترة الزمنية", variant: "destructive" });
      return;
    }
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    if (from > to) {
      toast({ title: "خطأ", description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية", variant: "destructive" });
      return;
    }
    const dates = generateDateRange(from, to);
    if (dates.length > 60) {
      toast({ title: "تنبيه", description: "الحد الأقصى للفترة 60 يوماً", variant: "destructive" });
      return;
    }
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
              return { reportType: 'daily' as const, date: d, attendance: [], materials: [], transport: [], miscExpenses: [], workerTransfers: [], fundTransfers: [], totals: { totalWorkerWages: 0, totalPaidWages: 0, totalMaterials: 0, totalTransport: 0, totalMiscExpenses: 0, totalWorkerTransfers: 0, totalFundTransfers: 0, totalExpenses: 0, balance: 0, workerCount: 0, totalWorkDays: 0 }, project: { id: projectIdForApi, name: selectedProjectName || "" }, generatedAt: new Date().toISOString(), kpis: [] } as DailyReportData;
            } catch {
              return { reportType: 'daily' as const, date: d, attendance: [], materials: [], transport: [], miscExpenses: [], workerTransfers: [], fundTransfers: [], totals: { totalWorkerWages: 0, totalPaidWages: 0, totalMaterials: 0, totalTransport: 0, totalMiscExpenses: 0, totalWorkerTransfers: 0, totalFundTransfers: 0, totalExpenses: 0, balance: 0, workerCount: 0, totalWorkDays: 0 }, project: { id: projectIdForApi, name: selectedProjectName || "" }, generatedAt: new Date().toISOString(), kpis: [] } as DailyReportData;
            }
          })
        );
        reports.push(...batchResults);
      }
      setRangeReports(reports);
      toast({ title: "تم التحميل", description: `تم تحميل ${reports.length} تقرير يومي` });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل تحميل التقارير", variant: "destructive" });
    } finally {
      setIsLoadingRange(false);
    }
  };

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (!projectIdForApi) {
      toast({ title: "تنبيه", description: "الرجاء اختيار مشروع أولاً", variant: "destructive" });
      return;
    }
    secureDownloadExport("daily", fmt, { project_id: projectIdForApi, date: dateStr }, toast);
  };

  const filterConfigSingle: FilterConfig[] = [
    { key: "specificDate", label: "تاريخ محدد", type: "date" },
  ];

  const filterConfigRange: FilterConfig[] = [
    { key: "dateRange", label: "الفترة الزمنية", type: "date-range" },
  ];

  const filterValuesSingle: Record<string, any> = { specificDate: selectedDate };
  const filterValuesRange: Record<string, any> = { dateRange };

  const onFilterChange = (key: string, val: any) => {
    if (key === "specificDate" && val) {
      setSelectedDate(val instanceof Date ? val : new Date(val));
    }
    if (key === "dateRange") {
      setDateRange(val || {});
    }
  };

  const exportActions: ActionButton[] = [
    {
      key: "export-excel",
      icon: FileSpreadsheet,
      tooltip: "تصدير Excel",
      onClick: () => handleExport("xlsx"),
      disabled: !projectIdForApi,
    },
    {
      key: "export-pdf",
      icon: FileText,
      tooltip: "تصدير PDF",
      onClick: () => handleExport("pdf"),
      disabled: !projectIdForApi,
    },
  ];

  const prevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const nextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const currentRangeReport = rangeReports[rangePageIndex];
  const currentRangeDate = rangeDates[rangePageIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit mx-auto" data-testid="mode-toggle">
        <Button
          variant={reportMode === "single" ? "default" : "ghost"}
          size="sm"
          className="text-xs h-8 px-3 gap-1.5 rounded-md"
          onClick={() => { setReportMode("single"); setRangeReports([]); setRangeDates([]); }}
          data-testid="btn-mode-single"
        >
          <Calendar className="h-3.5 w-3.5" />
          يوم واحد
        </Button>
        <Button
          variant={reportMode === "range" ? "default" : "ghost"}
          size="sm"
          className="text-xs h-8 px-3 gap-1.5 rounded-md"
          onClick={() => setReportMode("range")}
          data-testid="btn-mode-range"
        >
          <FileText className="h-3.5 w-3.5" />
          فترة زمنية
        </Button>
      </div>

      {reportMode === "single" && (
        <>
          <UnifiedFilterDashboard
            filters={filterConfigSingle}
            filterValues={filterValuesSingle}
            onFilterChange={onFilterChange}
            actions={exportActions}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="البحث في التقرير..."
            onRefresh={() => refetch()}
            isRefreshing={isLoading}
            onReset={() => { setSearchValue(""); setSelectedDate(new Date()); }}
          />

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

      {reportMode === "range" && (
        <>
          <UnifiedFilterDashboard
            filters={filterConfigRange}
            filterValues={filterValuesRange}
            onFilterChange={onFilterChange}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="البحث في التقرير..."
            onReset={() => { setSearchValue(""); setDateRange({}); setRangeReports([]); setRangeDates([]); }}
          />

          {isAllProjects && <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقارير" icon={ClipboardList} />}

          {!isAllProjects && (
            <div className="flex justify-center">
              <Button
                onClick={fetchRangeReports}
                disabled={isLoadingRange || !dateRange.from || !dateRange.to}
                className="gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 min-h-[44px]"
                data-testid="btn-generate-range"
              >
                {isLoadingRange ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isLoadingRange ? "جاري إنتاج التقارير..." : "إنتاج التقارير"}
              </Button>
            </div>
          )}

          {isLoadingRange && <LoadingSpinner message="جاري تحميل التقارير اليومية..." />}

          {!isLoadingRange && rangeReports.length > 0 && currentRangeReport && (
            <>
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" data-testid="range-page-nav">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setRangePageIndex(Math.max(0, rangePageIndex - 1))}
                  disabled={rangePageIndex === 0}
                  data-testid="btn-range-prev"
                >
                  <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Button>

                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-bold">
                      {rangePageIndex + 1} / {rangeDates.length}
                    </Badge>
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {currentRangeDate ? format(new Date(currentRangeDate), "EEEE, d MMMM yyyy", { locale: arSA }) : ""}
                  </span>
                  {dateRange.from && dateRange.to && (
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {format(dateRange.from, "d MMM", { locale: arSA })} — {format(dateRange.to, "d MMM yyyy", { locale: arSA })}
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setRangePageIndex(Math.min(rangeDates.length - 1, rangePageIndex + 1))}
                  disabled={rangePageIndex >= rangeDates.length - 1}
                  data-testid="btn-range-next"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Button>
              </div>

              <RangeDayPage report={currentRangeReport} searchValue={searchValue} />
            </>
          )}

          {!isLoadingRange && rangeReports.length === 0 && dateRange.from && dateRange.to && (
            <EmptyState message="اضغط على 'إنتاج التقارير' لتحميل التقارير اليومية للفترة المحددة" icon={FileText} />
          )}
        </>
      )}
    </div>
  );
}

function WorkerStatementTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
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
        if (res.success && Array.isArray(res.data)) {
          workersData = res.data;
        } else if (Array.isArray(res)) {
          workersData = res;
        }
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
    if (key === "worker_id") {
      setSelectedWorkerId(val === "all" ? null : val);
    }
  };

  const workerProjectScope = filterValues.project_scope !== "all" ? filterValues.project_scope : undefined;

  const { data: workerStatement, isLoading: workerLoading, refetch } = useQuery<WorkerStatementData | null>({
    queryKey: ["reports-v2-worker-statement", selectedWorkerId, workerProjectScope, filterValues.dateRange],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const params = new URLSearchParams();
      params.append("worker_id", selectedWorkerId);
      if (workerProjectScope) {
        params.append("project_id", workerProjectScope);
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

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (!selectedWorkerId) {
      toast({ title: "تنبيه", description: "الرجاء اختيار عامل أولاً", variant: "destructive" });
      return;
    }
    const exportParams: Record<string, string> = { worker_id: selectedWorkerId };
    if (workerProjectScope) {
      exportParams.project_id = workerProjectScope;
    }
    if (filterValues.dateRange?.from) {
      exportParams.dateFrom = format(new Date(filterValues.dateRange.from), "yyyy-MM-dd");
    }
    if (filterValues.dateRange?.to) {
      exportParams.dateTo = format(new Date(filterValues.dateRange.to), "yyyy-MM-dd");
    }
    secureDownloadExport("worker-statement", fmt, exportParams, toast);
  };

  const exportActions: ActionButton[] = [
    {
      key: "export-excel",
      icon: FileSpreadsheet,
      tooltip: "تصدير Excel",
      onClick: () => handleExport("xlsx"),
      disabled: !selectedWorkerId,
    },
    {
      key: "export-pdf",
      icon: FileText,
      tooltip: "تصدير PDF",
      onClick: () => handleExport("pdf"),
      disabled: !selectedWorkerId,
    },
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
          setFilterValues({ dateRange: null, worker_id: "all" });
          setSelectedWorkerId(null);
        }}
      />

      {!selectedWorkerId && (
        <EmptyState message="الرجاء اختيار عامل من القائمة لعرض كشف الحساب" icon={User} />
      )}

      {selectedWorkerId && workerLoading && <LoadingSpinner message="جاري تحميل كشف حساب العامل..." />}

      {selectedWorkerId && !workerLoading && workerStatement && (
        <div className="space-y-4">
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
                      p.projectName,
                      p.totalDays,
                      formatCurrency(p.totalEarned),
                      formatCurrency(p.totalPaid),
                      formatCurrency(p.balance),
                    ]),
                  ]}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t">
                  <div className="text-center p-2 rounded-md bg-blue-50 dark:bg-blue-950/30" data-testid="stat-total-projects-days">
                    <p className="text-xs text-muted-foreground">إجمالي الأيام</p>
                    <p className="font-bold text-sm mt-1">{workerStatement.projectSummary.reduce((s, p) => s + p.totalDays, 0).toFixed(1)}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-green-50 dark:bg-green-950/30" data-testid="stat-total-projects-earned">
                    <p className="text-xs text-muted-foreground">إجمالي المستحق</p>
                    <p className="font-bold text-sm mt-1 text-green-700 dark:text-green-400">{formatCurrency(workerStatement.projectSummary.reduce((s, p) => s + p.totalEarned, 0))}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-950/30" data-testid="stat-total-projects-paid">
                    <p className="text-xs text-muted-foreground">إجمالي المدفوع</p>
                    <p className="font-bold text-sm mt-1 text-red-700 dark:text-red-400">{formatCurrency(workerStatement.projectSummary.reduce((s, p) => s + p.totalPaid, 0))}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/30" data-testid="stat-total-projects-balance">
                    <p className="text-xs text-muted-foreground">المتبقي</p>
                    <p className="font-bold text-sm mt-1 text-amber-700 dark:text-amber-400">{formatCurrency(workerStatement.projectSummary.reduce((s, p) => s + p.balance, 0))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function PeriodFinalTab({ onStatsReady }: { onStatsReady?: (stats: any[]) => void }) {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    return { from: sixMonthsAgo, to: new Date() };
  });

  const projectIdForApi = isAllProjects ? "" : selectedProjectId;
  const dateFrom = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const dateTo = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const { data: periodReport, isLoading, refetch } = useQuery<PeriodFinalReportData | null>({
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

  useEffect(() => {
    if (periodReport && onStatsReady) {
      onStatsReady([
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
    secureDownloadExport("period-final", fmt, {
      project_id: projectIdForApi,
      dateFrom,
      dateTo,
    }, toast);
  };

  const filterConfig: FilterConfig[] = [
    { key: "dateRange", label: "الفترة الزمنية", type: "date-range" },
  ];

  const filterValues: Record<string, any> = {
    dateRange,
  };

  const onFilterChange = (key: string, val: any) => {
    if (key === "dateRange" && val) {
      setDateRange((prev) => ({ ...prev, ...val }));
    }
  };

  const exportActions: ActionButton[] = [
    {
      key: "export-excel",
      icon: FileSpreadsheet,
      tooltip: "تصدير Excel",
      onClick: () => handleExport("xlsx"),
      disabled: !projectIdForApi,
    },
    {
      key: "export-pdf",
      icon: FileText,
      tooltip: "تصدير PDF",
      onClick: () => handleExport("pdf"),
      disabled: !projectIdForApi,
    },
  ];

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
        onReset={() => {
          setSearchValue("");
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          sixMonthsAgo.setDate(1);
          setDateRange({ from: sixMonthsAgo, to: new Date() });
        }}
      />

      {isAllProjects && (
        <EmptyState message="الرجاء اختيار مشروع محدد لعرض التقرير الختامي" icon={BarChart3} />
      )}

      {!isAllProjects && isLoading && <LoadingSpinner message="جاري تحميل التقرير الختامي..." />}

      {!isAllProjects && !isLoading && !periodReport && (
        <EmptyState message="لا توجد بيانات للفترة المحددة" />
      )}

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

          {filteredWorkers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">ملخص الحضور</CardTitle>
                <Badge variant="secondary">{filteredWorkers.length} عامل</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-period-attendance"
                  headers={["اسم العامل", "النوع", "الأيام", "المستحق", "المدفوع", "الحوالات", "إجمالي المدفوع", "المتبقي"]}
                  rows={filteredWorkers.map((w: any) => [
                    w.workerName,
                    w.workerType,
                    w.totalDays,
                    formatCurrency(w.totalEarned),
                    formatCurrency(w.totalDirectPaid ?? w.totalPaid),
                    formatCurrency(w.totalTransfers ?? 0),
                    formatCurrency(w.totalPaid),
                    formatCurrency(w.balance ?? 0),
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {filteredMaterials.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">ملخص المواد</CardTitle>
                <Badge variant="secondary">{filteredMaterials.length} مادة</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-period-materials"
                  headers={["اسم المادة", "الكمية", "الإجمالي", "المورد"]}
                  rows={filteredMaterials.map((m: any) => [
                    m.materialName,
                    m.totalQuantity,
                    formatCurrency(m.totalAmount),
                    m.supplierName || "-",
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {filteredFundTransfers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">تحويلات الصناديق</CardTitle>
                <Badge variant="secondary">{filteredFundTransfers.length}</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-period-fund-transfers"
                  headers={["التاريخ", "المبلغ", "المرسل", "نوع التحويل"]}
                  rows={filteredFundTransfers.map((f: any) => [
                    safeFormatDate(f.date, "dd/MM/yyyy"),
                    formatCurrency(f.amount),
                    f.senderName || "-",
                    f.transferType || "-",
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {filteredProjectTransfers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">ترحيل الأموال بين المشاريع</CardTitle>
                <Badge variant="secondary">{filteredProjectTransfers.length}</Badge>
              </CardHeader>
              <CardContent>
                <ReportTable
                  testId="table-period-project-transfers"
                  headers={["التاريخ", "المشروع", "الاتجاه", "السبب", "المبلغ"]}
                  rows={filteredProjectTransfers.map((pt: any) => [
                    safeFormatDate(pt.date, "dd/MM/yyyy"),
                    pt.direction === 'outgoing' ? (pt.toProjectName || '-') : (pt.fromProjectName || '-'),
                    pt.direction === 'outgoing' ? 'صادر' : 'وارد',
                    pt.reason || '-',
                    formatCurrency(pt.amount),
                  ])}
                />
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                  <div className="p-2 rounded bg-red-50 dark:bg-red-950/30">
                    <p className="text-xs text-muted-foreground">إجمالي الصادر</p>
                    <p className="font-bold text-red-600">{formatCurrency(periodReport.sections.projectTransfers.totalOutgoing)}</p>
                  </div>
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <p className="text-xs text-muted-foreground">إجمالي الوارد</p>
                    <p className="font-bold text-green-600">{formatCurrency(periodReport.sections.projectTransfers.totalIncoming)}</p>
                  </div>
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-xs text-muted-foreground">الصافي</p>
                    <p className="font-bold text-blue-600">{formatCurrency(periodReport.sections.projectTransfers.net)}</p>
                  </div>
                </div>
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
        );
      })()}
    </div>
  );
}

export default function AxionReports() {
  const [activeTab, setActiveTab] = useState("daily");
  const [currentStats, setCurrentStats] = useState<any[]>([]);

  const handleTabChange = useCallback((tab: string) => {
    setCurrentStats([]);
    setActiveTab(tab);
  }, []);

  const handleStatsReady = useCallback((stats: any[]) => {
    setCurrentStats(stats);
  }, []);

  return (
    <div className="fade-in pb-40" dir="rtl">
      <div className="p-4 space-y-4 min-h-screen">
        {currentStats.length > 0 && (
          <UnifiedStats
            stats={currentStats}
            columns={2}
            hideHeader={true}
          />
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
            <DailyReportTab onStatsReady={handleStatsReady} />
          </TabsContent>

          <TabsContent value="worker" className="mt-4">
            <WorkerStatementTab onStatsReady={handleStatsReady} />
          </TabsContent>

          <TabsContent value="final" className="mt-4">
            <PeriodFinalTab onStatsReady={handleStatsReady} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
