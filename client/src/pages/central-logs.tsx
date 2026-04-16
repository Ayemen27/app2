import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, AlertOctagon, Info, Bug, Download,
  FileJson, FileSpreadsheet, RefreshCw, Loader2, ChevronDown, ChevronLeft,
  Clock, Search, Trash2, Pause, Play,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface CentralLog {
  id: number;
  eventTime: string;
  level: string;
  source: string;
  module: string | null;
  action: string | null;
  status: string | null;
  actorUserId: string | null;
  project_id: string | null;
  entityType: string | null;
  entityId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  durationMs: number | null;
  message: string;
  details: any;
  amount: string | null;
  created_at: string;
}

interface LogsResponse {
  data: CentralLog[];
  total: number;
  page: number;
  limit: number;
}

interface StatsResponse {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  byModule: Record<string, number>;
  trend: { hour: string; count: number }[];
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  debug: { label: "تصحيح", color: "text-gray-500", variant: "secondary" },
  info: { label: "معلومات", color: "text-blue-500", variant: "default" },
  warn: { label: "تحذير", color: "text-orange-500", variant: "outline" },
  error: { label: "خطأ", color: "text-red-500", variant: "destructive" },
  critical: { label: "حرج", color: "text-red-700", variant: "destructive" },
};

const SOURCE_LABELS: Record<string, string> = {
  api: "واجهة برمجية",
  sync: "مزامنة",
  auth: "مصادقة",
  whatsapp: "واتساب",
  system: "نظام",
  db: "قاعدة بيانات",
  finance: "مالية",
  wells: "آبار",
};

const MODULE_LABELS: Record<string, string> = {
  "مالية": "مالية",
  "آبار": "آبار",
  "عمال": "عمال",
  "نظام": "نظام",
  "مزامنة": "مزامنة",
  "أمان": "أمان",
  "واتساب": "واتساب",
  "صلاحيات": "صلاحيات",
};

export default function CentralLogsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchValue, setSearchValue] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    level: "all",
    source: "all",
    module: "all",
    status: "all",
    project_id: "all",
    dateFrom: "",
    dateTo: "",
  });

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (filterValues.level && filterValues.level !== "all") params.set("level", filterValues.level);
    if (filterValues.source && filterValues.source !== "all") params.set("source", filterValues.source);
    if (filterValues.module && filterValues.module !== "all") params.set("module", filterValues.module);
    if (filterValues.status && filterValues.status !== "all") params.set("status", filterValues.status);
    if (filterValues.project_id && filterValues.project_id !== "all") params.set("project_id", filterValues.project_id);
    if (filterValues.dateFrom) params.set("dateFrom", filterValues.dateFrom);
    if (filterValues.dateTo) params.set("dateTo", filterValues.dateTo);
    if (searchValue) params.set("search", searchValue);
    return params.toString();
  }, [page, pageSize, filterValues, searchValue]);

  const { data: logsResponse, isLoading: logsLoading, refetch: refetchLogs } = useQuery<LogsResponse>({
    queryKey: ["/api/central-logs", buildQueryString()],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/central-logs/stats", "timeRange=24h"],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const logs = useMemo(() => logsResponse?.data || [], [logsResponse]);
  const totalLogs = logsResponse?.total || 0;
  const totalPages = Math.ceil(totalLogs / pageSize);

  const { data: projectsData } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const projectOptions = useMemo(() => {
    const opts = [{ label: "الكل", value: "all" }];
    if (Array.isArray(projectsData)) {
      projectsData.forEach((p: any) => {
        opts.push({ label: p.name, value: p.id });
      });
    }
    return opts;
  }, [projectsData]);

  useEffect(() => {
    setPage(1);
  }, [filterValues, searchValue]);

  const statsConfig: StatsRowConfig[] = useMemo(() => [{
    columns: 5 as const,
    gap: "sm" as const,
    items: [
      {
        key: "total",
        label: "إجمالي السجلات",
        value: statsData?.total?.toLocaleString('en-US') || "0",
        icon: Activity,
        color: "blue" as const,
      },
      {
        key: "errors",
        label: "أخطاء",
        value: (statsData?.byLevel?.error || 0).toLocaleString('en-US'),
        icon: AlertTriangle,
        color: "red" as const,
      },
      {
        key: "warnings",
        label: "تحذيرات",
        value: (statsData?.byLevel?.warn || 0).toLocaleString('en-US'),
        icon: AlertTriangle,
        color: "orange" as const,
      },
      {
        key: "info",
        label: "معلومات",
        value: (statsData?.byLevel?.info || 0).toLocaleString('en-US'),
        icon: Info,
        color: "green" as const,
      },
      {
        key: "critical",
        label: "حرج",
        value: (statsData?.byLevel?.critical || 0).toLocaleString('en-US'),
        icon: AlertOctagon,
        color: "purple" as const,
      },
    ],
  }], [statsData]);

  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: "level",
      label: "المستوى",
      type: "select" as const,
      options: [
        { label: "الكل", value: "all" },
        { label: "تصحيح", value: "debug" },
        { label: "معلومات", value: "info" },
        { label: "تحذير", value: "warn" },
        { label: "خطأ", value: "error" },
        { label: "حرج", value: "critical" },
      ],
    },
    {
      key: "source",
      label: "المصدر",
      type: "select" as const,
      options: [
        { label: "الكل", value: "all" },
        { label: "واجهة برمجية", value: "api" },
        { label: "مزامنة", value: "sync" },
        { label: "مصادقة", value: "auth" },
        { label: "واتساب", value: "whatsapp" },
        { label: "نظام", value: "system" },
        { label: "قاعدة بيانات", value: "db" },
        { label: "مالية", value: "finance" },
        { label: "آبار", value: "wells" },
      ],
    },
    {
      key: "module",
      label: "الوحدة",
      type: "select" as const,
      options: [
        { label: "الكل", value: "all" },
        { label: "مالية", value: "مالية" },
        { label: "آبار", value: "آبار" },
        { label: "عمال", value: "عمال" },
        { label: "نظام", value: "نظام" },
        { label: "مزامنة", value: "مزامنة" },
        { label: "أمان", value: "أمان" },
        { label: "صلاحيات", value: "صلاحيات" },
      ],
    },
    {
      key: "status",
      label: "الحالة",
      type: "select" as const,
      options: [
        { label: "الكل", value: "all" },
        { label: "نجاح", value: "success" },
        { label: "فشل", value: "failed" },
        { label: "تعارض", value: "conflict" },
        { label: "مكرر", value: "duplicate" },
        { label: "تم التخطي", value: "skipped" },
      ],
    },
    {
      key: "project_id",
      label: "المشروع",
      type: "select" as const,
      options: projectOptions,
    },
  ], [projectOptions]);

  const handleExportCSV = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("format", "csv");
      if (filterValues.level && filterValues.level !== "all") params.set("level", filterValues.level);
      if (filterValues.source && filterValues.source !== "all") params.set("source", filterValues.source);
      if (filterValues.module && filterValues.module !== "all") params.set("module", filterValues.module);
      if (filterValues.status && filterValues.status !== "all") params.set("status", filterValues.status);
      if (searchValue) params.set("search", searchValue);
      if (filterValues.dateFrom) params.set("dateFrom", filterValues.dateFrom);
      if (filterValues.dateTo) params.set("dateTo", filterValues.dateTo);

      const result = await apiRequest(`/api/central-logs/export?${params.toString()}`);
      if (typeof result === "string") {
        const blob = new Blob([result], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `central-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: "تم التصدير", description: "تم تصدير السجلات بنجاح" });
    } catch (err: any) {
      toast({ title: "فشل التصدير", description: err.message, variant: "destructive" });
    }
  }, [filterValues, searchValue, toast]);

  const handleExportJSON = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("format", "json");
      if (filterValues.level && filterValues.level !== "all") params.set("level", filterValues.level);
      if (filterValues.source && filterValues.source !== "all") params.set("source", filterValues.source);
      if (searchValue) params.set("search", searchValue);

      const result = await apiRequest(`/api/central-logs/export?${params.toString()}`);
      const blob = new Blob([JSON.stringify(result?.data || result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `central-logs-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "تم التصدير", description: "تم تصدير السجلات بصيغة JSON" });
    } catch (err: any) {
      toast({ title: "فشل التصدير", description: err.message, variant: "destructive" });
    }
  }, [filterValues, searchValue, toast]);

  const handlePurge = useCallback(async () => {
    try {
      const result = await apiRequest("/api/central-logs/purge", "DELETE");
      toast({ title: "تم التنظيف", description: result?.message || "تم تنظيف السجلات القديمة" });
      queryClient.invalidateQueries({ queryKey: ["/api/central-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/central-logs/stats"] });
    } catch (err: any) {
      toast({ title: "فشل التنظيف", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  const getLevelBadge = (level: string) => {
    const config = LEVEL_CONFIG[level] || { label: level, variant: "secondary" as const };
    return (
      <Badge variant={config.variant} data-testid={`badge-level-${level}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="fade-in pb-32" dir="rtl">
      <UnifiedFilterDashboard
        title="بنك السجلات المركزي"
        subtitle="مراقبة وتتبع جميع أحداث النظام"
        statsRows={statsConfig}
        filters={filterConfig}
        searchValue={searchValue}
        filterValues={filterValues}
        onSearchChange={setSearchValue}
        onFilterChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}
        onReset={() => {
          setSearchValue("");
          setFilterValues({
            level: "all",
            source: "all",
            module: "all",
            status: "all",
            project_id: "all",
            dateFrom: "",
            dateTo: "",
          });
          setPage(1);
        }}
        onRefresh={() => {
          refetchLogs();
          queryClient.invalidateQueries({ queryKey: ["/api/central-logs/stats"] });
        }}
        isRefreshing={logsLoading}
        searchPlaceholder="البحث في السجلات..."
        resultsSummary={{
          totalCount: totalLogs,
          filteredCount: logs.length,
          totalLabel: "إجمالي السجلات",
          filteredLabel: "النتائج الحالية",
        }}
        actions={[
          {
            key: "auto-refresh",
            icon: autoRefresh ? Pause : Play,
            label: autoRefresh ? "إيقاف التحديث" : "تشغيل التحديث",
            onClick: () => setAutoRefresh(!autoRefresh),
            variant: "outline" as const,
          },
          {
            key: "export-csv",
            icon: FileSpreadsheet,
            label: "تصدير CSV",
            onClick: handleExportCSV,
            variant: "outline" as const,
            disabled: totalLogs === 0,
          },
          {
            key: "export-json",
            icon: FileJson,
            label: "تصدير JSON",
            onClick: handleExportJSON,
            variant: "outline" as const,
            disabled: totalLogs === 0,
          },
          {
            key: "purge",
            icon: Trash2,
            label: "تنظيف قديم",
            onClick: handlePurge,
            variant: "destructive" as const,
          },
        ]}
      />

      <div className="mt-4 px-4">
        <Card className="overflow-hidden">
          {logsLoading && logs.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20" data-testid="text-no-logs">
              <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground">لا توجد سجلات</h3>
              <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto mt-2">
                لم يتم العثور على سجلات مطابقة للفلاتر المحددة
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-central-logs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead data-testid="th-time">الوقت</TableHead>
                    <TableHead data-testid="th-level">المستوى</TableHead>
                    <TableHead data-testid="th-source">المصدر</TableHead>
                    <TableHead data-testid="th-module">الوحدة</TableHead>
                    <TableHead data-testid="th-action">الإجراء</TableHead>
                    <TableHead data-testid="th-status">الحالة</TableHead>
                    <TableHead data-testid="th-message">الرسالة</TableHead>
                    <TableHead data-testid="th-user">المستخدم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        data-testid={`row-log-${log.id}`}
                      >
                        <TableCell>
                          <ChevronLeft className={`h-4 w-4 transition-transform ${expandedRow === log.id ? "-rotate-90" : ""}`} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-time-${log.id}`}>
                          {formatTime(log.eventTime)}
                        </TableCell>
                        <TableCell data-testid={`cell-level-${log.id}`}>
                          {getLevelBadge(log.level)}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-source-${log.id}`}>
                          {SOURCE_LABELS[log.source] || log.source}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-module-${log.id}`}>
                          {log.module || "-"}
                        </TableCell>
                        <TableCell className="text-sm font-mono" data-testid={`text-action-${log.id}`}>
                          {log.action || "-"}
                        </TableCell>
                        <TableCell data-testid={`cell-status-${log.id}`}>
                          {log.status ? (
                            <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                              {log.status === "success" ? "نجاح" : log.status === "failed" ? "فشل" : log.status === "conflict" ? "تعارض" : log.status}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate" data-testid={`text-message-${log.id}`} title={log.message}>
                          {log.message}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground" data-testid={`text-user-${log.id}`}>
                          {log.actorUserId || "-"}
                        </TableCell>
                      </TableRow>
                      {expandedRow === log.id && (
                        <TableRow key={`${log.id}-details`} data-testid={`row-details-${log.id}`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              {log.entityType && (
                                <div>
                                  <span className="text-muted-foreground">نوع الكيان:</span>{" "}
                                  <span className="font-medium">{log.entityType}</span>
                                </div>
                              )}
                              {log.entityId && (
                                <div>
                                  <span className="text-muted-foreground">معرف الكيان:</span>{" "}
                                  <span className="font-mono text-xs">{log.entityId}</span>
                                </div>
                              )}
                              {log.durationMs != null && (
                                <div>
                                  <span className="text-muted-foreground">المدة:</span>{" "}
                                  <span className="font-medium">{log.durationMs}ms</span>
                                </div>
                              )}
                              {log.amount && (
                                <div>
                                  <span className="text-muted-foreground">المبلغ:</span>{" "}
                                  <span className="font-medium">{parseFloat(log.amount).toLocaleString('en-US')}</span>
                                </div>
                              )}
                              {log.ipAddress && (
                                <div>
                                  <span className="text-muted-foreground">IP:</span>{" "}
                                  <span className="font-mono text-xs">{log.ipAddress}</span>
                                </div>
                              )}
                              {log.requestId && (
                                <div>
                                  <span className="text-muted-foreground">معرف الطلب:</span>{" "}
                                  <span className="font-mono text-xs">{log.requestId}</span>
                                </div>
                              )}
                              {log.project_id && (
                                <div>
                                  <span className="text-muted-foreground">المشروع:</span>{" "}
                                  <span className="font-mono text-xs">{log.project_id}</span>
                                </div>
                              )}
                            </div>
                            {log.details && (
                              <div>
                                <span className="text-sm text-muted-foreground mb-1 block">التفاصيل:</span>
                                <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-[200px] overflow-y-auto" dir="ltr" data-testid={`text-details-${log.id}`}>
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 p-4 border-t" data-testid="pagination-controls">
              <span className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                صفحة {page} من {totalPages} ({totalLogs.toLocaleString('en-US')} سجل)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  data-testid="button-prev-page"
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {autoRefresh && (
        <div className="fixed bottom-20 left-4 z-50">
          <Badge variant="outline" className="bg-background shadow-md gap-1" data-testid="badge-auto-refresh">
            <RefreshCw className="h-3 w-3 animate-spin" />
            تحديث تلقائي كل 30 ثانية
          </Badge>
        </div>
      )}
    </div>
  );
}
