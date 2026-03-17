import { useState, useMemo } from "react";
import { useSyncData } from "@/hooks/useSyncData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2, RefreshCw, AlertCircle, Clock, Database, Activity,
  Calendar, Building2, CheckCircle2, XCircle,
  RotateCcw, AlertTriangle, Zap, History,
  ChevronDown, ChevronUp, Copy, Server, User,
  ChevronLeft, ChevronRight, Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig as DashFilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { API_ENDPOINTS } from "@/constants/api";

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return "غير محدد";
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `منذ ${seconds} ثانية`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function formatDateTime(timestamp: number): string {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSafe(dateValue: any): { date: string; time: string } {
  if (!dateValue) return { date: '', time: '' };
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'create': return 'إضافة';
    case 'update': return 'تعديل';
    case 'delete': return 'حذف';
    default: return action;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending': return <Badge variant="secondary" data-testid="badge-status-pending">في الانتظار</Badge>;
    case 'in-flight': return <Badge variant="default" data-testid="badge-status-inflight">قيد الإرسال</Badge>;
    case 'failed': return <Badge variant="destructive" data-testid="badge-status-failed">فاشل</Badge>;
    case 'conflict': return <Badge variant="warning" data-testid="badge-status-conflict">تعارض</Badge>;
    case 'duplicate-resolved': return <Badge variant="outline" data-testid="badge-status-duplicate">مكرر - تم الحل</Badge>;
    case 'success': return <Badge variant="success" data-testid="badge-status-success">نجح</Badge>;
    case 'duplicate': return <Badge variant="outline" data-testid="badge-status-dup-log">مكرر</Badge>;
    case 'skipped': return <Badge variant="secondary" data-testid="badge-status-skipped">تم التخطي</Badge>;
    default: return <Badge variant="secondary">{status || 'غير محدد'}</Badge>;
  }
}

function getEndpointLabel(endpoint: string): string {
  const parts = endpoint.split('/');
  const table = parts[2] || endpoint;
  const labels: Record<string, string> = {
    'fund-transfers': 'تحويلات مالية',
    'project-fund-transfers': 'تحويلات المشاريع',
    'workers': 'العمال',
    'worker-attendance': 'حضور العمال',
    'suppliers': 'الموردين',
    'materials': 'المواد',
    'material-purchases': 'مشتريات المواد',
    'supplier-payments': 'مدفوعات الموردين',
    'transportation-expenses': 'مصاريف النقل',
    'projects': 'المشاريع',
  };
  return labels[table] || table;
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
  const {
    isSyncing, manualSync, offlineCount,
    pendingItems, failedItems, duplicateItems, syncHistory,
    offlineStats,
    cancelOperation, cancelAllOperations,
    retryOperation, retryAllOperations, refreshData
  } = useSyncData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("server-audit");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [auditPage, setAuditPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ action: 'all', status: 'all', module: 'all' });

  const isAuditTab = activeTab === 'server-audit';
  const isHistoryTab = activeTab === 'history';

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

  const auditParams = useMemo(() => ({
    page: auditPage,
    limit: 30,
    module: filterValues.module !== 'all' ? filterValues.module : undefined,
    status: filterValues.status !== 'all' ? filterValues.status : undefined,
    action: filterValues.action !== 'all' ? filterValues.action : undefined,
    search: searchValue || undefined,
  }), [auditPage, filterValues, searchValue]);

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
    enabled: isAuditTab,
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

  const filterItems = (items: any[]) => {
    return items.filter(item => {
      const matchesSearch = !searchValue ||
        (item.endpoint || '').toLowerCase().includes(searchValue.toLowerCase()) ||
        (item.id || '').toLowerCase().includes(searchValue.toLowerCase()) ||
        (item.lastError || '').toLowerCase().includes(searchValue.toLowerCase());
      const matchesAction = filterValues.action === 'all' || item.action === filterValues.action;
      return matchesSearch && matchesAction;
    });
  };

  const filteredPending = useMemo(() => filterItems(pendingItems), [pendingItems, searchValue, filterValues]);
  const filteredFailed = useMemo(() => filterItems(failedItems), [failedItems, searchValue, filterValues]);
  const filteredDuplicates = useMemo(() => filterItems(duplicateItems), [duplicateItems, searchValue, filterValues]);
  const filteredHistory = useMemo(() => {
    return syncHistory.filter(item => {
      const matchesSearch = !searchValue ||
        (item.endpoint || '').toLowerCase().includes(searchValue.toLowerCase()) ||
        (item.errorMessage || '').toLowerCase().includes(searchValue.toLowerCase());
      const matchesStatus = filterValues.status === 'all' || item.status === filterValues.status;
      return matchesSearch && matchesStatus;
    });
  }, [syncHistory, searchValue, filterValues]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCancel = async (id: string) => {
    await cancelOperation(id);
    toast({ title: "تم الإلغاء", description: "تمت إزالة العملية من قائمة الانتظار" });
  };

  const handleRetry = async (id: string) => {
    await retryOperation(id);
    toast({ title: "تمت الإعادة", description: "تم إعادة العملية إلى قائمة الانتظار" });
  };

  const handleRetryAll = async () => {
    await retryAllOperations();
    toast({ title: "تمت الإعادة", description: "تم إعادة جميع العمليات الفاشلة" });
  };

  const successLogs = syncHistory.filter(h => h.status === 'success').length;
  const stats = auditStats || {};

  const statsConfig: StatsRowConfig[] = useMemo(() => {
    if (isAuditTab) {
      return [{
        items: [
          { key: 'total', label: 'إجمالي العمليات', value: stats.total || 0, icon: Database, color: 'blue' as const },
          { key: 'success', label: 'ناجحة', value: stats.success || 0, icon: CheckCircle2, color: 'green' as const },
        ],
        columns: 2 as const,
      }, {
        items: [
          { key: 'failed', label: 'فاشلة', value: stats.failed || 0, icon: XCircle, color: (stats.failed || 0) > 0 ? 'red' as const : 'gray' as const },
          { key: 'today', label: 'اليوم', value: stats.todayCount || 0, icon: Calendar, color: 'purple' as const },
        ],
        columns: 2 as const,
      }];
    }
    return [{
      items: [
        { key: 'pending', label: 'في الانتظار', value: offlineStats?.pendingSync ?? pendingItems.length, icon: Clock, color: (pendingItems.length > 0 ? 'orange' : 'blue') as any },
        { key: 'failed', label: 'فاشلة', value: offlineStats?.failedSync ?? failedItems.length, icon: XCircle, color: (failedItems.length > 0 ? 'red' : 'gray') as any },
      ],
      columns: 2 as const,
    }, {
      items: [
        { key: 'success', label: 'ناجحة (آخر 100)', value: offlineStats?.totalSuccessful ?? successLogs, icon: CheckCircle2, color: 'green' as const },
        { key: 'duplicate', label: 'مكررة تم حلها', value: offlineStats?.duplicateResolved ?? duplicateItems.length, icon: Copy, color: 'purple' as const },
      ],
      columns: 2 as const,
    }];
  }, [isAuditTab, stats, offlineStats, pendingItems, failedItems, successLogs, duplicateItems]);

  const filtersConfig: DashFilterConfig[] = useMemo(() => {
    const baseFilters: DashFilterConfig[] = [];

    if (isAuditTab) {
      baseFilters.push({
        key: 'module',
        label: 'القسم',
        options: [
          { label: 'كل الأقسام', value: 'all' },
          ...modules.map((m: any) => ({ label: m.label || m, value: m.value || m })),
        ]
      });
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
    } else {
      baseFilters.push({
        key: 'action',
        label: 'نوع العملية',
        options: [
          { label: 'الكل', value: 'all' },
          { label: 'إضافة', value: 'create' },
          { label: 'تعديل', value: 'update' },
          { label: 'حذف', value: 'delete' },
        ]
      });
      if (isHistoryTab) {
        baseFilters.push({
          key: 'status',
          label: 'الحالة',
          options: [
            { label: 'الكل', value: 'all' },
            { label: 'ناجح', value: 'success' },
            { label: 'فاشل', value: 'failed' },
            { label: 'مكرر', value: 'duplicate' },
            { label: 'تم التخطي', value: 'skipped' },
          ]
        });
      }
    }

    return baseFilters;
  }, [isAuditTab, isHistoryTab, modules]);

  const searchPlaceholder = isAuditTab
    ? "بحث في سجل التدقيق..."
    : "بحث في العمليات، العناوين، أو رسائل الأخطاء...";

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
    setFilterValues({ action: 'all', status: 'all', module: 'all' });
    if (isAuditTab) setAuditPage(1);
  };

  const handleRefresh = () => {
    if (isAuditTab) {
      refetchAudit();
    } else {
      refreshData();
    }
  };

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
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); handleReset(); }} className="w-full" dir="rtl">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-5 mb-4 no-scrollbar" data-testid="tabs-sync">
          <TabsTrigger value="server-audit" className="gap-1" data-testid="tab-server-audit">
            <Server className="h-3.5 w-3.5" />
            تدقيق الخادم
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1" data-testid="tab-history">
            <History className="h-3.5 w-3.5" />
            السجل
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1" data-testid="tab-pending">
            <Clock className="h-3.5 w-3.5" />
            معلقة
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{pendingItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1" data-testid="tab-failed">
            <AlertTriangle className="h-3.5 w-3.5" />
            فاشلة
            {failedItems.length > 0 && (
              <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{failedItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-1" data-testid="tab-duplicates">
            <Copy className="h-3.5 w-3.5" />
            مكررة
            {duplicateItems.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{duplicateItems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="server-audit">
          {auditLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <EmptyState icon={Shield} message="لا توجد سجلات تدقيق بعد" />
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
        </TabsContent>

        <TabsContent value="history">
          <ScrollArea className="h-[500px]">
            {filteredHistory.length === 0 ? (
              <EmptyState icon={History} message="لا يوجد سجل مزامنة بعد" />
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    data-testid={`log-entry-${entry.id.substring(0,8)}`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 p-1.5 rounded-md ${
                        entry.status === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                        entry.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                        entry.status === 'duplicate' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-900/30'
                      }`}>
                        {entry.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                         entry.status === 'failed' ? <XCircle className="h-4 w-4" /> :
                         entry.status === 'duplicate' ? <Copy className="h-4 w-4" /> :
                         <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(entry.status)}
                          <Badge variant="outline" className="text-[10px]">{getActionLabel(entry.action)}</Badge>
                          <span className="text-xs text-muted-foreground truncate">{getEndpointLabel(entry.endpoint)}</span>
                        </div>
                        {entry.errorMessage && (
                          <p className="text-xs text-destructive truncate">{entry.errorMessage}</p>
                        )}
                        {entry.payloadSummary && (
                          <p className="text-xs text-muted-foreground truncate">{entry.payloadSummary}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(entry.timestamp)}
                          </span>
                          {entry.duration && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {entry.duration}ms
                            </span>
                          )}
                          {entry.retryCount !== undefined && entry.retryCount > 0 && (
                            <span>محاولة #{entry.retryCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="pending">
          <SyncItemsList
            items={filteredPending}
            emptyMessage="لا توجد عمليات معلقة"
            emptyIcon={CheckCircle2}
            expandedItems={expandedItems}
            onToggleExpand={toggleExpand}
            actions={(item) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleCancel(item.id)}
                  data-testid={`button-cancel-${item.id.substring(0,8)}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
            projects={projects}
          />
        </TabsContent>

        <TabsContent value="failed">
          {failedItems.length > 0 && (
            <div className="flex justify-end mb-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleRetryAll} data-testid="button-retry-all">
                <RotateCcw className="h-3.5 w-3.5 ml-1" />
                إعادة محاولة الكل ({failedItems.length})
              </Button>
            </div>
          )}
          <SyncItemsList
            items={filteredFailed}
            emptyMessage="لا توجد عمليات فاشلة"
            emptyIcon={CheckCircle2}
            showError
            expandedItems={expandedItems}
            onToggleExpand={toggleExpand}
            actions={(item) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleRetry(item.id)}
                  data-testid={`button-retry-${item.id.substring(0,8)}`}>
                  <RotateCcw className="h-4 w-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleCancel(item.id)}
                  data-testid={`button-delete-${item.id.substring(0,8)}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
            projects={projects}
          />
        </TabsContent>

        <TabsContent value="duplicates">
          <SyncItemsList
            items={filteredDuplicates}
            emptyMessage="لا توجد عمليات مكررة"
            emptyIcon={Copy}
            showError
            expandedItems={expandedItems}
            onToggleExpand={toggleExpand}
            actions={(item) => (
              <Button variant="ghost" size="icon" onClick={() => handleCancel(item.id)}
                data-testid={`button-clear-dup-${item.id.substring(0,8)}`}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            projects={projects}
          />
        </TabsContent>
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

function SyncItemsList({
  items, emptyMessage, emptyIcon: EmptyIcon, showError, expandedItems, onToggleExpand, actions, projects
}: {
  items: any[];
  emptyMessage: string;
  emptyIcon: any;
  showError?: boolean;
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
  actions: (item: any) => React.ReactNode;
  projects: any[];
}) {
  if (items.length === 0) {
    return <EmptyState icon={EmptyIcon} message={emptyMessage} />;
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2">
        {items.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const payload = item.payload || {};
          const projectName = projects.find((p: any) => p.id === payload.projectId)?.name;

          return (
            <div
              key={item.id}
              className="rounded-lg border bg-card overflow-hidden"
              data-testid={`sync-item-${item.id.substring(0,8)}`}
            >
              <div className="flex items-center justify-between p-3 gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-0.5 p-1.5 rounded-md ${
                    item.action === 'create' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                    item.action === 'update' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                    'bg-red-100 text-red-600 dark:bg-red-900/30'
                  }`}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(item.status)}
                      <Badge variant={
                        item.action === 'create' ? 'success' :
                        item.action === 'update' ? 'default' :
                        'destructive'
                      } className="text-[10px]">
                        {getActionLabel(item.action)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{getEndpointLabel(item.endpoint)}</span>
                      <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.id.substring(0, 8)}
                      </span>
                    </div>
                    {showError && item.lastError && (
                      <p className="text-xs text-destructive flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="truncate">{item.lastError}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(item.timestamp)}
                      </span>
                      {item.retries > 0 && (
                        <span className="flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {item.retries} محاولة
                        </span>
                      )}
                      {projectName && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Building2 className="h-3 w-3" />
                          {projectName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onToggleExpand(item.id)}
                    data-testid={`button-expand-${item.id.substring(0,8)}`}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {actions(item)}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t p-3 bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">المسار: </span>
                      <span className="font-mono text-[11px]">{item.endpoint}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المعرّف الكامل: </span>
                      <span className="font-mono text-[11px]">{item.id}</span>
                    </div>
                    {item.idempotencyKey && (
                      <div className="col-span-full">
                        <span className="text-muted-foreground">مفتاح التكرار: </span>
                        <span className="font-mono text-[11px]">{item.idempotencyKey}</span>
                      </div>
                    )}
                    {item.errorType && (
                      <div>
                        <span className="text-muted-foreground">نوع الخطأ: </span>
                        <Badge variant="outline" className="text-[10px]">{item.errorType}</Badge>
                      </div>
                    )}
                    {item.lastAttemptAt && (
                      <div>
                        <span className="text-muted-foreground">آخر محاولة: </span>
                        <span>{formatTimeAgo(item.lastAttemptAt)}</span>
                      </div>
                    )}
                    {item.lastError && (
                      <div className="col-span-full">
                        <span className="text-muted-foreground">رسالة الخطأ: </span>
                        <span className="text-destructive">{item.lastError}</span>
                      </div>
                    )}
                    <div className="col-span-full">
                      <details>
                        <summary className="text-muted-foreground cursor-pointer text-[11px]">
                          عرض البيانات الكاملة (JSON)
                        </summary>
                        <pre className="mt-1 p-2 rounded bg-muted text-[10px] overflow-auto max-h-40 font-mono" dir="ltr">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
