import { useState, useMemo } from "react";
import { useSyncData } from "@/hooks/useSyncData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, AlertCircle, Clock, Database,
  Calendar, Building2, CheckCircle2, XCircle,
  AlertTriangle, Zap, History,
  ChevronDown, ChevronUp, Copy, Server, User,
  ChevronLeft, ChevronRight, Shield,
  FileSpreadsheet, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig as DashFilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { API_ENDPOINTS } from "@/constants/api";
import { createProfessionalReport } from "@/utils/axion-export";
import { generateTablePDF } from "@/utils/pdfGenerator";
import type { ActionButton, ResultsSummaryConfig } from "@/components/ui/unified-filter-dashboard/types";

function formatDateSafe(dateValue: any): { date: string; time: string } {
  if (!dateValue) return { date: '', time: '' };
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function getAuditStatusBadge(status: string) {
  switch (status) {
    case 'success': return <Badge variant="success">ناجح</Badge>;
    case 'failed': return <Badge variant="destructive">فاشل</Badge>;
    case 'duplicate': return <Badge variant="outline">مكرر</Badge>;
    case 'skipped': return <Badge variant="secondary">متخطى</Badge>;
    case 'conflict': return <Badge variant="destructive">تعارض</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

function getAuditActionBadge(action: string) {
  const labels: Record<string, { label: string; variant: string }> = {
    'create': { label: 'إضافة', variant: 'success' },
    'update': { label: 'تعديل', variant: 'default' },
    'delete': { label: 'حذف', variant: 'destructive' },
    'sync_push': { label: 'رفع', variant: 'default' },
    'sync_pull': { label: 'سحب', variant: 'default' },
    'full_backup': { label: 'نسخة كاملة', variant: 'outline' },
    'delta_sync': { label: 'مزامنة تفاضلية', variant: 'outline' },
    'instant_sync': { label: 'مزامنة فورية', variant: 'outline' },
  };
  const info = labels[action] || { label: action, variant: 'secondary' };
  return <Badge variant={info.variant as any} className="text-[10px]">{info.label}</Badge>;
}

export default function SyncManagementPage() {
  const { isSyncing, manualSync, refreshData } = useSyncData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [auditPage, setAuditPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ action: 'all', status: 'all', module: 'all', dateRange: undefined });

  const tabStatusMap: Record<string, string | string[] | undefined> = {
    'server-audit': undefined,
    'history': ['success', 'skipped'],
    'failed': 'failed',
    'duplicates': 'duplicate',
    'pending': 'conflict',
  };

  const { data: projects = [] } = useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      const res = await apiRequest("/api/projects", "GET");
      return res?.data || res || [];
    }
  });

  const { data: auditModules } = useQuery({
    queryKey: QUERY_KEYS.syncAuditModules,
    queryFn: async () => {
      const res = await apiRequest(API_ENDPOINTS.syncAuditModules, "GET");
      return res?.data || res?.modules || [];
    },
  });

  const isAuditTab = activeTab === 'server-audit';

  const tabStatus = tabStatusMap[activeTab];
  const effectiveStatus = isAuditTab
    ? (filterValues.status !== 'all' ? filterValues.status : undefined)
    : (Array.isArray(tabStatus) ? tabStatus.join(',') : tabStatus);

  const auditParams = useMemo(() => ({
    page: auditPage,
    limit: 30,
    module: filterValues.module !== 'all' ? filterValues.module : undefined,
    status: effectiveStatus,
    action: filterValues.action !== 'all' ? filterValues.action : undefined,
    search: searchValue || undefined,
    dateFrom: filterValues.dateRange?.from ? new Date(filterValues.dateRange.from).toISOString().split('T')[0] : undefined,
    dateTo: filterValues.dateRange?.to ? new Date(filterValues.dateRange.to).toISOString().split('T')[0] : undefined,
  }), [auditPage, filterValues, searchValue, effectiveStatus]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(auditParams).forEach(([k, v]) => {
      if (v !== undefined) p.set(k, String(v));
    });
    return p.toString();
  }, [auditParams]);

  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: QUERY_KEYS.syncAuditLogsFiltered(auditParams),
    queryFn: async () => {
      const res = await apiRequest(`${API_ENDPOINTS.syncAuditLogs}?${queryString}`, "GET");
      return res;
    },
    refetchInterval: 30000,
  });

  const { data: auditStats } = useQuery({
    queryKey: QUERY_KEYS.syncAuditStats,
    queryFn: async () => {
      const res = await apiRequest(API_ENDPOINTS.syncAuditStats, "GET");
      return res?.data || res || {};
    },
    refetchInterval: 60000,
  });

  const modules: Array<{ value: string; label: string }> = Array.isArray(auditModules) ? auditModules : [];

  const stats = auditStats || {};

  const statsConfig: StatsRowConfig[] = useMemo(() => {
    return [{
      items: [
        { key: 'pending', label: 'في الانتظار', value: stats.conflict || 0, icon: Clock, color: ((stats.conflict || 0) > 0 ? 'orange' : 'blue') as any },
        { key: 'failed', label: 'فاشلة', value: stats.failed || 0, icon: XCircle, color: ((stats.failed || 0) > 0 ? 'red' : 'gray') as any },
      ],
      columns: 2 as const,
    }, {
      items: [
        { key: 'success', label: 'ناجحة (آخر 100)', value: stats.success || 0, icon: CheckCircle2, color: 'green' as const },
        { key: 'duplicate', label: 'مكررة تم حلها', value: stats.duplicate || 0, icon: Copy, color: 'purple' as const },
      ],
      columns: 2 as const,
    }];
  }, [stats]);

  const filtersConfig: DashFilterConfig[] = useMemo(() => {
    const baseFilters: DashFilterConfig[] = [];
    baseFilters.push({
      key: 'dateRange',
      label: 'الفترة الزمنية',
      type: 'date-range' as const,
    });
    baseFilters.push({
      key: 'module',
      label: 'القسم',
      options: [
        { label: 'كل الأقسام', value: 'all' },
        ...modules.map((m: any) => ({ label: m.label || m, value: m.value || m })),
      ]
    });
    if (isAuditTab) {
      baseFilters.push({
        key: 'status',
        label: 'الحالة',
        options: [
          { label: 'الكل', value: 'all' },
          { label: 'ناجح', value: 'success' },
          { label: 'فاشل', value: 'failed' },
          { label: 'مكرر', value: 'duplicate' },
          { label: 'متخطى', value: 'skipped' },
          { label: 'تعارض', value: 'conflict' },
        ]
      });
    }
    baseFilters.push({
      key: 'action',
      label: 'نوع العملية',
      options: [
        { label: 'الكل', value: 'all' },
        { label: 'إضافة', value: 'create' },
        { label: 'تعديل', value: 'update' },
        { label: 'حذف', value: 'delete' },
        { label: 'نسخة كاملة', value: 'full_backup' },
        { label: 'مزامنة تفاضلية', value: 'delta_sync' },
        { label: 'مزامنة فورية', value: 'instant_sync' },
      ]
    });
    return baseFilters;
  }, [isAuditTab, modules]);

  const searchPlaceholder = "بحث في سجلات المزامنة...";

  const auditLogs = auditData?.logs || [];
  const rawPagination = auditData?.pagination || {};
  const pagination = {
    total: rawPagination.total || 0,
    pages: rawPagination.totalPages || rawPagination.pages || 1,
  };

  const [expandedAudit, setExpandedAudit] = useState<Set<number>>(new Set());
  const toggleAuditExpand = (id: number) => {
    setExpandedAudit(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    if (isAuditTab) setAuditPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (isAuditTab) setAuditPage(1);
  };

  const handleReset = () => {
    setSearchValue('');
    setFilterValues({ action: 'all', status: 'all', module: 'all', dateRange: undefined });
    if (isAuditTab) setAuditPage(1);
  };

  const handleRefresh = () => {
    refetchAudit();
  };

  const actionLabels: Record<string, string> = {
    'create': 'إضافة', 'update': 'تعديل', 'delete': 'حذف',
    'full_backup': 'نسخة كاملة', 'delta_sync': 'مزامنة تفاضلية', 'instant_sync': 'مزامنة فورية',
    'batch_sync': 'مزامنة دفعية',
  };
  const statusLabels: Record<string, string> = {
    'success': 'ناجح', 'failed': 'فاشل', 'duplicate': 'مكرر', 'skipped': 'متخطى', 'conflict': 'تعارض',
  };

  const handleExportExcel = async () => {
    if (auditLogs.length === 0) {
      toast({ title: "لا توجد بيانات", description: "لا توجد سجلات للتصدير" });
      return;
    }
    try {
      const exportData = auditLogs.map((log: any) => ({
        id: log.id,
        action: actionLabels[log.action] || log.action,
        status: statusLabels[log.status] || log.status,
        module: log.module,
        tableName: log.tableName || log.table_name || '',
        description: log.description,
        userName: log.userName || log.user_name || '',
        recordId: log.recordId || log.record_id || '',
        durationMs: log.durationMs || log.duration_ms || '',
        ipAddress: log.ipAddress || log.ip_address || '',
        date: formatDateSafe(log.created_at || log.createdAt).date,
        time: formatDateSafe(log.created_at || log.createdAt).time,
      }));

      await createProfessionalReport({
        sheetName: 'سجل التدقيق',
        reportTitle: 'تقرير تدقيق المزامنة',
        subtitle: `${pagination.total} سجل - تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}`,
        columns: [
          { header: '#', key: 'id', width: 8 },
          { header: 'العملية', key: 'action', width: 12 },
          { header: 'الحالة', key: 'status', width: 10 },
          { header: 'القسم', key: 'module', width: 12 },
          { header: 'الجدول', key: 'tableName', width: 15 },
          { header: 'الوصف', key: 'description', width: 30 },
          { header: 'المستخدم', key: 'userName', width: 15 },
          { header: 'التاريخ', key: 'date', width: 12 },
          { header: 'الوقت', key: 'time', width: 10 },
          { header: 'المدة (ms)', key: 'durationMs', width: 10 },
        ],
        data: exportData,
        fileName: `تقرير_تدقيق_المزامنة_${new Date().toISOString().split('T')[0]}`,
      });
      toast({ title: "تم التصدير", description: "تم تصدير التقرير بصيغة Excel بنجاح" });
    } catch (err) {
      toast({ title: "خطأ", description: "فشل تصدير التقرير", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    if (auditLogs.length === 0) {
      toast({ title: "لا توجد بيانات", description: "لا توجد سجلات للتصدير" });
      return;
    }
    try {
      const exportData = auditLogs.map((log: any) => ({
        id: log.id,
        action: actionLabels[log.action] || log.action,
        status: statusLabels[log.status] || log.status,
        module: log.module,
        description: (log.description || '').substring(0, 40),
        userName: log.userName || log.user_name || '',
        date: formatDateSafe(log.created_at || log.createdAt).date,
        time: formatDateSafe(log.created_at || log.createdAt).time,
      }));

      await generateTablePDF({
        reportTitle: 'تقرير تدقيق المزامنة',
        subtitle: `${pagination.total} سجل`,
        columns: [
          { header: '#', key: 'id', width: 6 },
          { header: 'العملية', key: 'action', width: 10 },
          { header: 'الحالة', key: 'status', width: 8, color: (val: any) => val === 'فاشل' ? '#DC2626' : val === 'ناجح' ? '#16A34A' : undefined },
          { header: 'القسم', key: 'module', width: 10 },
          { header: 'الوصف', key: 'description', width: 25 },
          { header: 'المستخدم', key: 'userName', width: 12 },
          { header: 'التاريخ', key: 'date', width: 10 },
          { header: 'الوقت', key: 'time', width: 8 },
        ],
        data: exportData,
        filename: `تقرير_تدقيق_المزامنة_${new Date().toISOString().split('T')[0]}`,
        orientation: 'landscape',
      });
      toast({ title: "تم التصدير", description: "تم تصدير التقرير بصيغة PDF بنجاح" });
    } catch (err) {
      toast({ title: "خطأ", description: "فشل تصدير التقرير", variant: "destructive" });
    }
  };

  const dashboardActions: ActionButton[] = useMemo(() => {
    return [
      {
        key: 'export-excel',
        icon: FileSpreadsheet,
        label: 'Excel',
        onClick: handleExportExcel,
        variant: 'outline' as const,
        disabled: auditLogs.length === 0,
        tooltip: 'تصدير Excel',
      },
      {
        key: 'export-pdf',
        icon: FileText,
        label: 'PDF',
        onClick: handleExportPDF,
        variant: 'outline' as const,
        disabled: auditLogs.length === 0,
        tooltip: 'تصدير PDF',
      },
    ];
  }, [auditLogs.length]);

  const resultsSummary: ResultsSummaryConfig | undefined = useMemo(() => {
    if (!auditData) return undefined;
    return {
      totalCount: pagination.total,
      filteredCount: auditLogs.length,
      totalLabel: 'إجمالي السجلات',
      filteredLabel: 'معروض',
      unit: 'سجل',
    };
  }, [auditData, pagination.total, auditLogs.length]);

  return (
    <div className="space-y-4 pb-20" data-testid="page-sync-management">
      <UnifiedFilterDashboard
        hideHeader
        statsRows={statsConfig}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={searchPlaceholder}
        onReset={handleReset}
        onRefresh={handleRefresh}
        isRefreshing={auditLoading || isSyncing}
        actions={dashboardActions}
        resultsSummary={resultsSummary}
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); handleReset(); setAuditPage(1); }} className="w-full" dir="rtl">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-5 mb-4 no-scrollbar" data-testid="tabs-sync">
          <TabsTrigger value="pending" className="gap-1" data-testid="tab-pending">
            <Clock className="h-3.5 w-3.5" />
            معلقة
            {(stats.conflict || 0) > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{stats.conflict}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1" data-testid="tab-failed">
            <AlertTriangle className="h-3.5 w-3.5" />
            فاشلة
            {(stats.failed || 0) > 0 && (
              <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{stats.failed}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-1" data-testid="tab-duplicates">
            <Copy className="h-3.5 w-3.5" />
            مكررة
            {(stats.duplicate || 0) > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{stats.duplicate}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1" data-testid="tab-history">
            <History className="h-3.5 w-3.5" />
            السجل
            {(stats.success || 0) > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{stats.success}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="server-audit" className="gap-1" data-testid="tab-server-audit">
            <Server className="h-3.5 w-3.5" />
            تدقيق الخادم
          </TabsTrigger>
        </TabsList>

        {auditLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin ml-2" />
            <span>جاري التحميل...</span>
          </div>
        ) : auditLogs.length === 0 ? (
          <EmptyState
            icon={activeTab === 'server-audit' ? Shield : activeTab === 'history' ? History : activeTab === 'failed' ? AlertTriangle : activeTab === 'duplicates' ? Copy : Clock}
            message={
              activeTab === 'server-audit' ? 'لا توجد سجلات تدقيق بعد' :
              activeTab === 'history' ? 'لا يوجد سجل مزامنة بعد' :
              activeTab === 'failed' ? 'لا توجد عمليات فاشلة' :
              activeTab === 'duplicates' ? 'لا توجد عمليات مكررة' :
              'لا توجد عمليات معلقة'
            }
          />
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {auditLogs.map((log: any) => (
                <AuditLogCard
                  key={log.id}
                  log={log}
                  isExpanded={expandedAudit.has(log.id)}
                  onToggle={() => toggleAuditExpand(log.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-2 mt-3">
            <span className="text-xs text-muted-foreground">
              صفحة {auditPage} من {pagination.pages} ({pagination.total} سجل)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                data-testid="button-audit-prev"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={auditPage >= pagination.pages}
                onClick={() => setAuditPage(p => p + 1)}
                data-testid="button-audit-next"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}

function AuditLogCard({ log, isExpanded, onToggle }: { log: any; isExpanded: boolean; onToggle: () => void }) {
  const logDate = log.created_at || log.createdAt;
  const { date: formattedDate, time: formattedTime } = formatDateSafe(logDate);
  const userName = log.userName || log.user_name || '';
  const tableName = log.tableName || log.table_name || '';
  const syncType = log.syncType || log.sync_type || '';
  const recordId = log.recordId || log.record_id || '';
  const ipAddress = log.ipAddress || log.ip_address || '';
  const errorMessage = log.errorMessage || log.error_message || '';
  const durationMs = log.durationMs || log.duration_ms;
  const projectName = log.projectName || log.project_name || '';
  const oldValues = log.oldValues || log.old_values;
  const newValues = log.newValues || log.new_values;
  const userAgent = log.userAgent || log.user_agent || '';

  return (
    <div
      className="rounded-lg border bg-card overflow-hidden cursor-pointer"
      data-testid={`audit-log-${log.id}`}
      onClick={onToggle}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className={`p-1.5 rounded-md shrink-0 ${
              log.status === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
              log.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
              log.status === 'duplicate' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
              'bg-gray-100 text-gray-600 dark:bg-gray-900/30'
            }`}>
              {log.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
               log.status === 'failed' ? <XCircle className="h-4 w-4" /> :
               log.status === 'duplicate' ? <Copy className="h-4 w-4" /> :
               <AlertCircle className="h-4 w-4" />}
            </div>
            {getAuditStatusBadge(log.status)}
            {getAuditActionBadge(log.action)}
            <Badge variant="outline" className="text-[10px]">{log.module}</Badge>
          </div>
          <div className="shrink-0">
            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        <p className="text-sm font-medium leading-tight">{log.description}</p>

        {errorMessage && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{errorMessage}</p>
        )}

        <div className="flex items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground flex-wrap">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {formattedDate} {formattedTime}
            </span>
          )}
          {userName && (
            <span className="flex items-center gap-1 font-medium text-foreground/70">
              <User className="h-3 w-3 shrink-0" />
              {userName}
            </span>
          )}
          {durationMs != null && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 shrink-0" />
              {durationMs}ms
            </span>
          )}
          {projectName && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Building2 className="h-3 w-3 shrink-0" />
              {projectName}
            </span>
          )}
          {tableName && tableName !== 'sync_operation' && (
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3 shrink-0" />
              {tableName}
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-3 bg-muted/30 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-semibold text-foreground/80 text-[11px]">معلومات العملية</h4>
              <div className="space-y-1 bg-background/60 rounded-md p-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رقم السجل:</span>
                  <span className="font-mono">#{log.id}</span>
                </div>
                {tableName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الجدول:</span>
                    <span>{tableName}</span>
                  </div>
                )}
                {recordId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">معرّف السجل:</span>
                    <span className="font-mono text-[10px] max-w-[120px] truncate" dir="ltr">{recordId}</span>
                  </div>
                )}
                {syncType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نوع المزامنة:</span>
                    <span>{syncType}</span>
                  </div>
                )}
                {log.amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبلغ:</span>
                    <span className="font-semibold">{Number(log.amount).toLocaleString('ar-SA')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-foreground/80 text-[11px]">معلومات المستخدم</h4>
              <div className="space-y-1 bg-background/60 rounded-md p-2">
                {userName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المستخدم:</span>
                    <span className="font-medium">{userName}</span>
                  </div>
                )}
                {formattedDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التاريخ:</span>
                    <span dir="ltr">{formattedDate}</span>
                  </div>
                )}
                {formattedTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الوقت:</span>
                    <span dir="ltr">{formattedTime}</span>
                  </div>
                )}
                {ipAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عنوان IP:</span>
                    <span className="font-mono text-[10px]" dir="ltr">{ipAddress}</span>
                  </div>
                )}
                {durationMs != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المدة:</span>
                    <span>{durationMs}ms</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {userAgent && (
            <div className="text-[10px]">
              <span className="text-muted-foreground">المتصفح: </span>
              <span className="text-muted-foreground/70 break-all" dir="ltr">{userAgent.substring(0, 120)}</span>
            </div>
          )}

          {oldValues && (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer text-[11px] font-medium hover:text-foreground transition-colors">
                القيم القديمة
              </summary>
              <pre className="mt-1 p-2 rounded bg-muted text-[10px] overflow-auto max-h-32 font-mono" dir="ltr">
                {JSON.stringify(oldValues, null, 2)}
              </pre>
            </details>
          )}
          {newValues && (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer text-[11px] font-medium hover:text-foreground transition-colors">
                القيم الجديدة
              </summary>
              <pre className="mt-1 p-2 rounded bg-muted text-[10px] overflow-auto max-h-32 font-mono" dir="ltr">
                {JSON.stringify(newValues, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
      <Icon className="h-12 w-12 opacity-15" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

