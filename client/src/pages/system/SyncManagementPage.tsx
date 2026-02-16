import { useState, useMemo } from "react";
import { useSyncData } from "@/hooks/useSyncData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Trash2, RefreshCw, AlertCircle, Clock, Database, Activity,
  Search, Calendar, Building2, CheckCircle2, XCircle,
  RotateCcw, AlertTriangle, Wifi, WifiOff, Zap, History,
  ChevronDown, ChevronUp, Copy, Server, User, Filter,
  ChevronLeft, ChevronRight, Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
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
  return d.toLocaleDateString('ar-YE', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
    ' ' + d.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
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

export default function SyncManagementPage() {
  const {
    isSyncing, isOnline, manualSync, offlineCount,
    pendingItems, failedItems, duplicateItems, syncHistory,
    offlineStats, lastSync, latency,
    cancelOperation, cancelAllOperations,
    retryOperation, retryAllOperations, refreshData
  } = useSyncData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const {
    searchValue, filterValues, onSearchChange, onFilterChange, onReset
  } = useUnifiedFilter({ action: 'all', status: 'all' }, '');

  const { data: projects = [] } = useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      const res = await apiRequest("/api/projects", "GET");
      return res?.data || res || [];
    }
  });

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
  const failedLogs = syncHistory.filter(h => h.status === 'failed').length;
  const duplicateLogs = syncHistory.filter(h => h.status === 'duplicate').length;

  return (
    <div className="space-y-4 pb-20" data-testid="page-sync-management">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={isOnline ? "success" : "destructive"} data-testid="badge-connection-status">
          {isOnline ? <><Wifi className="h-3 w-3 ml-1" /> متصل</> : <><WifiOff className="h-3 w-3 ml-1" /> غير متصل</>}
        </Badge>
        {lastSync > 0 && (
          <Badge variant="outline" data-testid="badge-last-sync">
            <Clock className="h-3 w-3 ml-1" />
            آخر مزامنة: {formatTimeAgo(lastSync)}
          </Badge>
        )}
        {latency && latency > 0 && (
          <Badge variant="outline" data-testid="badge-latency">
            <Zap className="h-3 w-3 ml-1" />
            {latency}ms
          </Badge>
        )}
        {isSyncing && (
          <Badge variant="default" data-testid="badge-syncing">
            <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
            جاري المزامنة
          </Badge>
        )}
      </div>

      <UnifiedStats
        stats={[
          {
            title: "في الانتظار",
            value: offlineStats?.pendingSync ?? pendingItems.length,
            icon: Clock,
            color: pendingItems.length > 0 ? "orange" : "blue",
            status: pendingItems.length > 10 ? "warning" : "normal"
          },
          {
            title: "فاشلة",
            value: offlineStats?.failedSync ?? failedItems.length,
            icon: XCircle,
            color: failedItems.length > 0 ? "red" : "gray",
            status: failedItems.length > 0 ? "critical" : "normal"
          },
          {
            title: "ناجحة (آخر 100)",
            value: offlineStats?.totalSuccessful ?? successLogs,
            icon: CheckCircle2,
            color: "green"
          },
          {
            title: "مكررة تم حلها",
            value: offlineStats?.duplicateResolved ?? duplicateItems.length,
            icon: Copy,
            color: "purple"
          }
        ]}
        columns={4}
        hideHeader
      />

      <Card className="border-none shadow-sm">
        <CardContent className="p-3">
          <UnifiedSearchFilter
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            placeholder="بحث في العمليات، العناوين، أو رسائل الأخطاء..."
            filters={[
              {
                key: 'action',
                label: 'نوع العملية',
                options: [
                  { label: 'الكل', value: 'all' },
                  { label: 'إضافة', value: 'create' },
                  { label: 'تعديل', value: 'update' },
                  { label: 'حذف', value: 'delete' },
                ]
              },
              ...(activeTab === 'history' ? [{
                key: 'status',
                label: 'الحالة',
                options: [
                  { label: 'الكل', value: 'all' },
                  { label: 'ناجح', value: 'success' },
                  { label: 'فاشل', value: 'failed' },
                  { label: 'مكرر', value: 'duplicate' },
                  { label: 'تم التخطي', value: 'skipped' },
                ]
              }] : [])
            ]}
            filterValues={filterValues}
            onFilterChange={onFilterChange}
            onReset={onReset}
          />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-5 mb-4" data-testid="tabs-sync">
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
          <TabsTrigger value="history" className="gap-1" data-testid="tab-history">
            <History className="h-3.5 w-3.5" />
            السجل
          </TabsTrigger>
          <TabsTrigger value="server-audit" className="gap-1" data-testid="tab-server-audit">
            <Server className="h-3.5 w-3.5" />
            تدقيق الخادم
          </TabsTrigger>
        </TabsList>

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
            items={duplicateItems}
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

        <TabsContent value="server-audit">
          <ServerAuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServerAuditTab() {
  const [auditPage, setAuditPage] = useState(1);
  const [auditModule, setAuditModule] = useState("all");
  const [auditStatus, setAuditStatus] = useState("all");
  const [auditAction, setAuditAction] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [expandedAudit, setExpandedAudit] = useState<Set<number>>(new Set());

  const auditParams = useMemo(() => ({
    page: auditPage,
    limit: 30,
    module: auditModule !== 'all' ? auditModule : undefined,
    status: auditStatus !== 'all' ? auditStatus : undefined,
    action: auditAction !== 'all' ? auditAction : undefined,
    search: auditSearch || undefined,
  }), [auditPage, auditModule, auditStatus, auditAction, auditSearch]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(auditParams).forEach(([k, v]) => {
      if (v !== undefined) p.set(k, String(v));
    });
    return p.toString();
  }, [auditParams]);

  const { data: auditData, isLoading: auditLoading } = useQuery({
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

  const { data: auditModules } = useQuery({
    queryKey: QUERY_KEYS.syncAuditModules,
    queryFn: async () => {
      const res = await apiRequest(API_ENDPOINTS.syncAuditModules, "GET");
      return res?.data || res?.modules || [];
    },
  });

  const logs = auditData?.logs || [];
  const rawPagination = auditData?.pagination || {};
  const pagination = {
    total: rawPagination.total || 0,
    pages: rawPagination.totalPages || rawPagination.pages || 1,
  };
  const stats = auditStats || {};
  const modules: Array<{ value: string; label: string }> = Array.isArray(auditModules) ? auditModules : [];

  const toggleAuditExpand = (id: number) => {
    setExpandedAudit(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

  return (
    <div className="space-y-4" data-testid="server-audit-section">
      <UnifiedStats
        stats={[
          { title: "إجمالي العمليات", value: stats.total || 0, icon: Database, color: "blue" },
          { title: "ناجحة", value: stats.success || 0, icon: CheckCircle2, color: "green" },
          { title: "فاشلة", value: stats.failed || 0, icon: XCircle, color: (stats.failed || 0) > 0 ? "red" : "gray" },
          { title: "اليوم", value: stats.todayCount || 0, icon: Calendar, color: "purple" },
        ]}
        columns={4}
        hideHeader
      />

      <Card className="border-none shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في سجل التدقيق..."
                value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                className="pr-9"
                data-testid="input-audit-search"
              />
            </div>
            <Select value={auditModule} onValueChange={(v) => { setAuditModule(v); setAuditPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-audit-module">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {modules.map((m: any) => (
                  <SelectItem key={m.value || m} value={m.value || m}>{m.label || m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={auditStatus} onValueChange={(v) => { setAuditStatus(v); setAuditPage(1); }}>
              <SelectTrigger className="w-[120px]" data-testid="select-audit-status">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="success">ناجح</SelectItem>
                <SelectItem value="failed">فاشل</SelectItem>
                <SelectItem value="duplicate">مكرر</SelectItem>
                <SelectItem value="skipped">متخطى</SelectItem>
                <SelectItem value="conflict">تعارض</SelectItem>
              </SelectContent>
            </Select>
            <Select value={auditAction} onValueChange={(v) => { setAuditAction(v); setAuditPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-audit-action">
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمليات</SelectItem>
                <SelectItem value="create">إضافة</SelectItem>
                <SelectItem value="update">تعديل</SelectItem>
                <SelectItem value="delete">حذف</SelectItem>
                <SelectItem value="full_backup">نسخة كاملة</SelectItem>
                <SelectItem value="delta_sync">مزامنة تفاضلية</SelectItem>
                <SelectItem value="instant_sync">مزامنة فورية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {auditLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin ml-2" />
          <span>جاري التحميل...</span>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={Shield} message="لا توجد سجلات تدقيق بعد" />
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {logs.map((log: any) => {
              const isExpanded = expandedAudit.has(log.id);
              return (
                <div
                  key={log.id}
                  className="rounded-lg border bg-card overflow-hidden"
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="flex items-center justify-between p-3 gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 p-1.5 rounded-md ${
                        log.status === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                        log.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-900/30'
                      }`}>
                        {log.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                         log.status === 'failed' ? <XCircle className="h-4 w-4" /> :
                         <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getAuditStatusBadge(log.status)}
                          {getAuditActionBadge(log.action)}
                          <Badge variant="outline" className="text-[10px]">{log.module}</Badge>
                        </div>
                        <p className="text-sm truncate">{log.description}</p>
                        {log.errorMessage && (
                          <p className="text-xs text-destructive truncate">{log.errorMessage}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleDateString('ar-YE', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            {' '}
                            {new Date(log.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          {log.userName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.userName}
                            </span>
                          )}
                          {log.durationMs && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {log.durationMs}ms
                            </span>
                          )}
                          {log.projectName && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Building2 className="h-3 w-3" />
                              {log.projectName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => toggleAuditExpand(log.id)}
                      data-testid={`button-expand-audit-${log.id}`}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="border-t p-3 bg-muted/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">الجدول: </span>
                          <span>{log.tableName}</span>
                        </div>
                        {log.recordId && (
                          <div>
                            <span className="text-muted-foreground">معرّف السجل: </span>
                            <span className="font-mono text-[11px]">{log.recordId}</span>
                          </div>
                        )}
                        {log.syncType && (
                          <div>
                            <span className="text-muted-foreground">نوع المزامنة: </span>
                            <span>{log.syncType}</span>
                          </div>
                        )}
                        {log.ipAddress && (
                          <div>
                            <span className="text-muted-foreground">عنوان IP: </span>
                            <span className="font-mono text-[11px]" dir="ltr">{log.ipAddress}</span>
                          </div>
                        )}
                        {log.amount && (
                          <div>
                            <span className="text-muted-foreground">المبلغ: </span>
                            <span>{Number(log.amount).toLocaleString('ar-SA')}</span>
                          </div>
                        )}
                        {log.oldValues && (
                          <div className="col-span-full">
                            <details>
                              <summary className="text-muted-foreground cursor-pointer text-[11px]">القيم القديمة</summary>
                              <pre className="mt-1 p-2 rounded bg-muted text-[10px] overflow-auto max-h-32 font-mono" dir="ltr">
                                {JSON.stringify(log.oldValues, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                        {log.newValues && (
                          <div className="col-span-full">
                            <details>
                              <summary className="text-muted-foreground cursor-pointer text-[11px]">القيم الجديدة</summary>
                              <pre className="mt-1 p-2 rounded bg-muted text-[10px] overflow-auto max-h-32 font-mono" dir="ltr">
                                {JSON.stringify(log.newValues, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-2">
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
