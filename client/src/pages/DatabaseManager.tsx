import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Database, RefreshCw, HardDrive, Server,
  ShieldCheck, Activity, Search, Table as TableIcon,
  CheckCircle2, Zap, Loader2, Settings,
  BarChart3, Wrench, AlertTriangle, ChevronDown, ChevronUp,
  Columns3, FileText, GitCompareArrows, Bell, ArrowLeftRight,
  Wifi, WifiOff, Cloud, MonitorSmartphone, CircleDot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, ActionButton, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export default function DatabaseManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'size' | 'rows' | 'name'>('size');
  const [searchValue, setSearchValue] = useState("");
  const [selectedSource, setSelectedSource] = useState("active");

  const fetchWithAuth = async (url: string) => {
    const token = localStorage.getItem("token");
    // تنظيف التوكن من أي علامات اقتباس أو مسافات
    let cleanToken = token?.trim() || "";
    if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }
    
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "x-auth-token": cleanToken,
        "x-access-token": cleanToken
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "فشلت عملية جلب البيانات");
    }
    return res.json();
  };

  const { data: connectionsData, isLoading: connectionsLoading } = useQuery<any>({
    queryKey: ["/api/db/connections"],
    queryFn: () => fetchWithAuth("/api/db/connections"),
  });

  const overviewUrl = selectedSource !== 'active' ? `/api/db/overview?source=${selectedSource}` : '/api/db/overview';
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview, error: overviewError } = useQuery<any>({
    queryKey: [overviewUrl],
    queryFn: () => fetchWithAuth(overviewUrl),
    retry: false,
  });

  const tablesUrl = selectedSource !== 'active' ? `/api/db/tables?source=${selectedSource}` : '/api/db/tables';
  const { data: tables, isLoading: tablesLoading, refetch: refetchTables, error: tablesError } = useQuery<any>({
    queryKey: [tablesUrl],
    queryFn: () => fetchWithAuth(tablesUrl),
    retry: false,
  });

  const perfUrl = selectedSource !== 'active' ? `/api/db/performance?source=${selectedSource}` : '/api/db/performance';
  const { data: performance, isLoading: perfLoading, refetch: refetchPerf } = useQuery<any>({
    queryKey: [perfUrl],
    queryFn: () => fetchWithAuth(perfUrl),
    retry: false,
  });

  const integrityUrl = selectedSource !== 'active' ? `/api/db/integrity?source=${selectedSource}` : '/api/db/integrity';
  const { data: integrity, isLoading: integrityLoading, refetch: refetchIntegrity } = useQuery<any>({
    queryKey: [integrityUrl],
    queryFn: () => fetchWithAuth(integrityUrl),
    retry: false,
  });

  const sourceError = overviewError || tablesError;

  const [compareSource1, setCompareSource1] = useState("local");
  const [compareSource2, setCompareSource2] = useState("");

  const compareUrl = `/api/db/compare?source1=${compareSource1}&source2=${compareSource2}`;
  const { data: comparison, isLoading: comparisonLoading, refetch: refetchComparison } = useQuery<any>({
    queryKey: [compareUrl],
    queryFn: () => fetchWithAuth(compareUrl),
    enabled: activeTab === 'compare' && !!compareSource1 && !!compareSource2,
  });

  const { data: systemStats } = useQuery<any>({
    queryKey: ["/api/stats"],
    queryFn: () => fetchWithAuth("/api/stats"),
  });

  const maintenanceMutation = useMutation({
    mutationFn: async ({ action, tableName }: { action: string; tableName?: string }) => {
      const res = await apiRequest("POST", "/api/db/maintenance", { action, tableName });
      return res.json();
    },
    onSuccess: (result) => {
      const data = result?.data;
      toast({
        title: data?.success ? "تمت العملية بنجاح" : "فشلت العملية",
        description: data?.message || "تمت العملية",
        variant: data?.success ? "default" : "destructive",
      });
      refetchAll();
    },
    onError: (error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  });

  const refetchAll = () => {
    refetchOverview();
    refetchTables();
    refetchPerf();
    refetchIntegrity();
  };

  const connections = Array.isArray(connectionsData) ? connectionsData : (connectionsData?.data || []);
  const db = overview && typeof overview === 'object' && !Array.isArray(overview) ? overview : null;
  const tableList = Array.isArray(tables) ? tables : (tables?.data || []);
  const perf = performance && typeof performance === 'object' && !Array.isArray(performance) ? performance : null;
  const integrityData = integrity && typeof integrity === 'object' && !Array.isArray(integrity) ? integrity : null;
  const sysStats = systemStats && typeof systemStats === 'object' ? systemStats : null;
  const compareData = comparison && typeof comparison === 'object' && !Array.isArray(comparison) ? comparison : null;

  const filteredTables = tableList
    .filter((t: any) => t.name.toLowerCase().includes(searchValue.toLowerCase()))
    .sort((a: any, b: any) => {
      if (sortBy === 'size') return b.totalSizeBytes - a.totalSizeBytes;
      if (sortBy === 'rows') return b.rowCount - a.rowCount;
      return a.name.localeCompare(b.name);
    });

  const totalRows = tableList.reduce((s: number, t: any) => s + t.rowCount, 0);
  const totalSizeBytes = tableList.reduce((s: number, t: any) => s + t.totalSizeBytes, 0);
  const integrityScore = integrityData?.score ?? 0;

  const alertsCount = compareData?.alerts?.length || 0;
  const criticalAlerts = compareData?.alerts?.filter((a: any) => a.severity === 'critical')?.length || 0;

  const statsRows: StatsRowConfig[] = useMemo(() => [{
    items: [
      {
        key: 'connections',
        label: 'الاتصالات',
        value: connections.filter((c: any) => c.connected).length + '/' + connections.length,
        icon: Wifi,
        color: connections.filter((c: any) => c.connected).length === connections.length ? 'emerald' as const : 'amber' as const,
      },
      {
        key: 'tables',
        label: 'الجداول',
        value: overviewLoading ? 0 : db?.totalTables || 0,
        icon: TableIcon,
        color: 'blue' as const,
      },
      {
        key: 'records',
        label: 'السجلات',
        value: overviewLoading ? 0 : (db?.totalRows || totalRows),
        icon: Database,
        color: 'green' as const,
      },
      {
        key: 'size',
        label: 'الحجم',
        value: overviewLoading ? '0 B' : db?.size || '0 B',
        icon: HardDrive,
        color: 'purple' as const,
      },
      {
        key: 'integrity',
        label: 'السلامة',
        value: integrityLoading ? '...' : `${integrityScore}%`,
        icon: ShieldCheck,
        color: integrityScore >= 90 ? 'emerald' as const : integrityScore >= 75 ? 'amber' as const : 'red' as const,
      },
    ],
    columns: 5 as any,
    gap: 'md',
  }], [db, overviewLoading, integrityScore, integrityLoading, totalRows, connections]);

  const refreshAction: ActionButton[] = [{
    key: 'db-refresh',
    icon: RefreshCw,
    label: 'تحديث',
    onClick: refetchAll,
    variant: 'outline',
    loading: overviewLoading,
  }];

  const sortFilters: FilterConfig[] = [{
    key: 'sort',
    label: 'ترتيب',
    type: 'select',
    options: [
      { value: 'size', label: 'الحجم' },
      { value: 'rows', label: 'السجلات' },
      { value: 'name', label: 'الاسم' },
    ],
    defaultValue: 'size',
  }];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedSource} onValueChange={setSelectedSource} data-testid="select-db-source">
          <SelectTrigger className="w-[220px]" data-testid="trigger-db-source">
            <div className="flex items-center gap-2">
              {selectedSource === 'active' && <CircleDot className="h-3.5 w-3.5 text-blue-500" />}
              {selectedSource === 'local' && <MonitorSmartphone className="h-3.5 w-3.5 text-emerald-500" />}
              {selectedSource === 'supabase' && <Cloud className="h-3.5 w-3.5 text-violet-500" />}
              <SelectValue placeholder="اختر قاعدة البيانات" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">النشطة (تلقائي)</SelectItem>
            {connections.map((conn: any) => (
              <SelectItem key={conn.id} value={conn.id}>
                <div className="flex items-center gap-2">
                  {conn.connected ? (
                    <Wifi className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  {conn.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 mr-auto">
          {connections.map((conn: any) => (
            <Badge
              key={conn.id}
              variant={conn.connected ? "default" : "destructive"}
              className="text-[11px]"
              data-testid={`badge-conn-${conn.id}`}
            >
              {conn.connected ? <Wifi className="h-3 w-3 ml-1" /> : <WifiOff className="h-3 w-3 ml-1" />}
              {conn.id === 'local' ? 'محلي' : 'سحابي'}
              {conn.connected && conn.tables > 0 && ` (${conn.tables})`}
            </Badge>
          ))}
          {alertsCount > 0 && (
            <Badge
              variant="destructive"
              className="text-[11px] cursor-pointer"
              onClick={() => setActiveTab('compare')}
              data-testid="badge-alerts-count"
            >
              <Bell className="h-3 w-3 ml-1" />
              {criticalAlerts > 0 ? `${criticalAlerts} تحذير حرج` : `${alertsCount} تنبيه`}
            </Badge>
          )}
        </div>
      </div>

      <UnifiedFilterDashboard
        hideHeader={true}
        statsRows={statsRows}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="بحث في الجداول..."
        showSearch={activeTab === 'tables'}
        actions={refreshAction}
        onRefresh={refetchAll}
        isRefreshing={overviewLoading}
        filters={activeTab === 'tables' ? sortFilters : []}
        filterValues={{ sort: sortBy }}
        onFilterChange={(key, value) => {
          if (key === 'sort') setSortBy(value);
        }}
        onReset={() => {
          setSearchValue("");
          setSortBy('size');
        }}
        resultsSummary={activeTab === 'tables' && tableList.length > 0 ? {
          totalCount: tableList.length,
          filteredCount: filteredTables.length,
          totalLabel: 'جدول',
          filteredLabel: 'معروض',
          totalValue: formatBytes(totalSizeBytes),
          totalValueLabel: 'الحجم الكلي',
          unit: '',
          categoryBreakdown: [
            { label: 'السجلات', value: totalRows, unit: 'سجل' },
            { label: 'الحجم', value: 0, unit: formatBytes(totalSizeBytes) },
          ],
          showBreakdown: true,
        } : undefined}
      />

      {sourceError && selectedSource !== 'active' && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <WifiOff className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">القاعدة المختارة غير متصلة</p>
                <p className="text-xs text-muted-foreground mt-1">
                  تعذر الاتصال بالقاعدة المحددة. اختر قاعدة أخرى أو تحقق من إعدادات الاتصال.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mr-auto shrink-0" onClick={() => setSelectedSource('active')} data-testid="button-reset-source">
                العودة للنشطة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-6 h-10" data-testid="tabs-db-manager">
          <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm" data-testid="tab-overview">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline">نظرة عامة</span><span className="sm:hidden">عامة</span>
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-1 text-xs sm:text-sm" data-testid="tab-tables">
            <TableIcon className="h-3.5 w-3.5 shrink-0" /> <span>الجداول</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-1 text-xs sm:text-sm relative" data-testid="tab-compare">
            <GitCompareArrows className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline">المقارنة</span><span className="sm:hidden">مقارنة</span>
            {alertsCount > 0 && (
              <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                {alertsCount > 9 ? '9+' : alertsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="integrity" className="gap-1 text-xs sm:text-sm" data-testid="tab-integrity">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline">السلامة</span><span className="sm:hidden">سلامة</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1 text-xs sm:text-sm" data-testid="tab-performance">
            <Activity className="h-3.5 w-3.5 shrink-0" /> <span>الأداء</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1 text-xs sm:text-sm" data-testid="tab-maintenance">
            <Wrench className="h-3.5 w-3.5 shrink-0" /> <span>الصيانة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((conn: any) => (
              <Card key={conn.id} data-testid={`card-connection-${conn.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {conn.id === 'local' ? <MonitorSmartphone className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                    {conn.label}
                    {conn.connected ? (
                      <Badge variant="default" className="mr-auto text-[10px]">متصل</Badge>
                    ) : (
                      <Badge variant="destructive" className="mr-auto text-[10px]">غير متصل</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conn.connected ? (
                    <div className="space-y-2">
                      <InfoRow label="اسم القاعدة" value={conn.dbName} />
                      <InfoRow label="الإصدار" value={conn.version} />
                      <InfoRow label="الحجم" value={conn.size} />
                      <InfoRow label="الجداول" value={conn.tables} />
                      <InfoRow label="السجلات" value={conn.rows?.toLocaleString()} />
                      {conn.latency && <InfoRow label="زمن الاستجابة" value={conn.latency} />}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-muted-foreground">
                      <WifiOff className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">غير متصل</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  القاعدة النشطة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overviewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : db ? (
                  <div className="space-y-2">
                    <InfoRow label="اسم القاعدة" value={db.name} />
                    <InfoRow label="الإصدار" value={db.version} />
                    <InfoRow label="الحجم" value={db.size} />
                    <InfoRow label="الجداول" value={db.totalTables} />
                    <InfoRow label="السجلات" value={(db.totalRows || 0).toLocaleString()} />
                    <InfoRow label="الفهارس" value={db.totalIndexes} />
                    <InfoRow label="وقت التشغيل" value={typeof db.uptime === 'object' ? `${db.uptime.days || 0} يوم ${db.uptime.hours || 0} ساعة` : db.uptime} />
                    <InfoRow label="الاتصالات" value={`${db.activeConnections} / ${db.maxConnections}`} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  موارد الخادم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sysStats ? (
                  <>
                    <div>
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span className="text-muted-foreground">المعالج</span>
                        <span className="font-medium">{sysStats.cpuUsage}%</span>
                      </div>
                      <Progress value={sysStats.cpuUsage} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span className="text-muted-foreground">الذاكرة</span>
                        <span className="font-medium">{sysStats.memoryUsage}%</span>
                      </div>
                      <Progress value={sysStats.memoryUsage} className="h-2" />
                    </div>
                    {sysStats.memoryDetails && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <span className="text-muted-foreground">Heap</span>
                          <p className="font-medium">{sysStats.memoryDetails.heapUsed} MB</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <span className="text-muted-foreground">RSS</span>
                          <p className="font-medium">{sysStats.memoryDetails.rss} MB</p>
                        </div>
                      </div>
                    )}
                    <InfoRow label="وقت التشغيل" value={formatUptime(sysStats.uptime)} />
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {perf && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    ملخص الأداء
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceMetrics perf={perf} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              {tablesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الجدول</TableHead>
                      <TableHead className="text-center">السجلات</TableHead>
                      <TableHead className="text-center">الحجم</TableHead>
                      <TableHead className="text-center">الأعمدة</TableHead>
                      <TableHead className="text-center">الفهارس</TableHead>
                      <TableHead className="text-center">تفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTables.length > 0 ? filteredTables.map((t: any) => (
                      <TableRowDetail
                        key={t.name}
                        table={t}
                        source={selectedSource}
                        expanded={expandedTable === t.name}
                        onToggle={() => setExpandedTable(expandedTable === t.name ? null : t.name)}
                        onMaintenance={(action: string) => maintenanceMutation.mutate({ action, tableName: t.name })}
                        isMaintenanceLoading={maintenanceMutation.isPending}
                      />
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          {searchValue ? "لا توجد نتائج" : "لا توجد جداول"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4 mt-4">
          <ComparisonTab
            data={compareData}
            loading={comparisonLoading}
            onRefresh={() => refetchComparison()}
            connections={connections}
            source1={compareSource1}
            source2={compareSource2}
            onSource1Change={setCompareSource1}
            onSource2Change={setCompareSource2}
          />
        </TabsContent>

        <TabsContent value="integrity" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  تقرير سلامة البيانات
                </CardTitle>
                <Button
                  variant="outline" size="sm"
                  onClick={() => refetchIntegrity()}
                  data-testid="button-recheck-integrity"
                >
                  <RefreshCw className={`h-4 w-4 ml-1 ${integrityLoading ? 'animate-spin' : ''}`} />
                  إعادة الفحص
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {integrityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : integrityData ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className={`text-5xl font-bold ${integrityScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' : integrityScore >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {integrityData.score}%
                    </div>
                    <div>
                      <Badge variant={integrityData.status === 'excellent' ? 'default' : integrityData.status === 'good' ? 'secondary' : 'destructive'}>
                        {integrityData.status === 'excellent' ? 'ممتاز' : integrityData.status === 'good' ? 'جيد' : integrityData.status === 'warning' ? 'تحذير' : 'حرج'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        آخر فحص: {new Date(integrityData.timestamp).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {integrityData.checks?.map((check: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        {check.status === 'pass' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        ) : check.status === 'warn' ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{check.name}</p>
                          <p className="text-xs text-muted-foreground">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                مؤشرات الأداء
              </CardTitle>
              <CardDescription>قياسات حقيقية من محرك PostgreSQL</CardDescription>
            </CardHeader>
            <CardContent>
              {perfLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : perf ? (
                <div className="space-y-4">
                  <PerformanceMetrics perf={perf} extended />
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-medium mb-2">استخدام الكتل</p>
                    <div className="flex gap-4 flex-wrap text-xs">
                      <span>قراءة من القرص: <strong>{perf.blocksRead?.toLocaleString()}</strong></span>
                      <span>قراءة من الذاكرة: <strong>{perf.blocksHit?.toLocaleString()}</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                صيانة قاعدة البيانات
              </CardTitle>
              <CardDescription>عمليات الصيانة والتحسين</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <MaintenanceAction
                  title="تنظيف وتحليل"
                  description="حذف السجلات الميتة وتحديث الإحصائيات"
                  action="vacuum"
                  icon={<RefreshCw className="h-5 w-5" />}
                  onRun={() => maintenanceMutation.mutate({ action: 'vacuum' })}
                  isLoading={maintenanceMutation.isPending}
                />
                <MaintenanceAction
                  title="تحليل الإحصائيات"
                  description="تحديث إحصائيات المحسّن"
                  action="analyze"
                  icon={<BarChart3 className="h-5 w-5" />}
                  onRun={() => maintenanceMutation.mutate({ action: 'analyze' })}
                  isLoading={maintenanceMutation.isPending}
                />
                <MaintenanceAction
                  title="إعادة بناء الفهارس"
                  description="إعادة بناء الفهارس لتحسين الأداء"
                  action="reindex"
                  icon={<Settings className="h-5 w-5" />}
                  onRun={() => maintenanceMutation.mutate({ action: 'reindex' })}
                  isLoading={maintenanceMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComparisonTab({ data, loading, onRefresh, connections, source1, source2, onSource1Change, onSource2Change }: {
  data: any; loading: boolean; onRefresh: () => void;
  connections: any[]; source1: string; source2: string;
  onSource1Change: (v: string) => void; onSource2Change: (v: string) => void;
}) {
  const connectedDbs = connections.filter((c: any) => c.connected);
  const noSelection = !source1 || !source2;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" />
            اختيار القواعد للمقارنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">القاعدة الأولى</label>
              <Select value={source1} onValueChange={onSource1Change} data-testid="select-compare-source1">
                <SelectTrigger data-testid="select-trigger-source1">
                  <SelectValue placeholder="اختر القاعدة الأولى" />
                </SelectTrigger>
                <SelectContent>
                  {connectedDbs.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} disabled={c.id === source2}>
                      {c.label} ({c.dbName || c.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground mt-4 shrink-0" />
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">القاعدة الثانية</label>
              <Select value={source2} onValueChange={onSource2Change} data-testid="select-compare-source2">
                <SelectTrigger data-testid="select-trigger-source2">
                  <SelectValue placeholder="اختر القاعدة الثانية" />
                </SelectTrigger>
                <SelectContent>
                  {connectedDbs.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} disabled={c.id === source1}>
                      {c.label} ({c.dbName || c.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="default" size="default"
              onClick={onRefresh}
              disabled={noSelection || loading}
              className="mt-4"
              data-testid="button-run-compare"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <GitCompareArrows className="h-4 w-4 ml-1" />}
              مقارنة
            </Button>
          </div>
          {connectedDbs.length < 2 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              يجب أن تكون قاعدتان على الأقل متصلتين لإجراء المقارنة
            </p>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">جاري مقارنة قواعد البيانات...</p>
          </div>
        </div>
      )}

      {!loading && noSelection && (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg font-medium mb-2">اختر قاعدتين</p>
            <p className="text-sm text-muted-foreground">
              اختر القاعدة الأولى والثانية من القوائم أعلاه ثم اضغط مقارنة
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !noSelection && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg font-medium mb-2">غير متاح</p>
            <p className="text-sm text-muted-foreground mb-4">
              تأكد أن القاعدتين المختارتين متصلتان ثم أعد المحاولة
            </p>
            <Button variant="outline" onClick={onRefresh} data-testid="button-retry-compare">
              <RefreshCw className="h-4 w-4 ml-1" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && data && <ComparisonResults data={data} onRefresh={onRefresh} />}
    </div>
  );
}

function ComparisonResults({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const totalIssues = (data.onlySource1Tables || 0) + (data.onlySource2Tables || 0) + (data.tablesWithDiffRows || 0) + (data.tablesWithDiffStructure || 0);
  const s1Name = data.source1Name || 'المصدر ١';
  const s2Name = data.source2Name || 'المصدر ٢';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {s1Name} <ArrowLeftRight className="h-3 w-3 inline mx-1" /> {s2Name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            آخر مقارنة: {new Date(data.timestamp).toLocaleString('ar-SA')}
          </span>
          <Button variant="outline" size="sm" onClick={onRefresh} data-testid="button-refresh-compare">
            <RefreshCw className="h-3.5 w-3.5 ml-1" />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <CompareStatCard label="متطابقة" value={data.matchingTables} color="emerald" />
        <CompareStatCard label="فرق سجلات" value={data.tablesWithDiffRows} color={data.tablesWithDiffRows > 0 ? "amber" : "emerald"} />
        <CompareStatCard label="فرق هيكلي" value={data.tablesWithDiffStructure} color={data.tablesWithDiffStructure > 0 ? "red" : "emerald"} />
        <CompareStatCard label={`${s1Name} فقط`} value={data.onlySource1Tables || 0} color={(data.onlySource1Tables || 0) > 0 ? "amber" : "emerald"} />
        <CompareStatCard label={`${s2Name} فقط`} value={data.onlySource2Tables || 0} color={(data.onlySource2Tables || 0) > 0 ? "amber" : "emerald"} />
      </div>

      {data.alerts?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              التنبيهات ({data.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((alert: any, i: number) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50' :
                  alert.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50' :
                  'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50'
                }`}
                data-testid={`alert-${alert.type}-${i}`}
              >
                {alert.severity === 'critical' ? (
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                ) : (
                  <CircleDot className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'outline'} className="text-[10px]">
                      {alert.severity === 'critical' ? 'حرج' : alert.severity === 'warning' ? 'تحذير' : 'معلومة'}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{alert.table}</span>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            مقارنة الجداول ({data.tables?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الجدول</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">{s1Name} (سجلات)</TableHead>
                <TableHead className="text-center">{s2Name} (سجلات)</TableHead>
                <TableHead className="text-center">الفرق</TableHead>
                <TableHead className="text-center">{s1Name} (حجم)</TableHead>
                <TableHead className="text-center">{s2Name} (حجم)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tables?.map((t: any) => (
                <TableRow
                  key={t.name}
                  className={
                    t.status === 'diff_structure' ? 'bg-red-50/50 dark:bg-red-900/10' :
                    t.status === 'only_source1' || t.status === 'only_source2' ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                    t.status === 'diff_rows' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                  }
                  data-testid={`compare-row-${t.name}`}
                >
                  <TableCell className="font-mono text-xs">{t.name}</TableCell>
                  <TableCell className="text-center">
                    <CompareStatusBadge status={t.status} s1Name={s1Name} s2Name={s2Name} />
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {t.source1Rows !== null && t.source1Rows !== undefined ? t.source1Rows.toLocaleString() : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {t.source2Rows !== null && t.source2Rows !== undefined ? t.source2Rows.toLocaleString() : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {t.rowDiff > 0 ? (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        +{t.rowDiff.toLocaleString()}
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs">{t.source1Size || '-'}</TableCell>
                  <TableCell className="text-center text-xs">{t.source2Size || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalIssues === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400">قواعد البيانات متطابقة تماماً</p>
          <p className="text-sm text-muted-foreground mt-1">جميع الجداول والسجلات متزامنة بين القاعدتين</p>
        </div>
      )}
    </div>
  );
}

function CompareStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = getColorClasses(color);
  return (
    <div className={`rounded-xl border p-3 ${colors.bg} ${colors.border}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
    </div>
  );
}

function CompareStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'match':
      return <Badge variant="default" className="text-[10px]">متطابق</Badge>;
    case 'diff_rows':
      return <Badge variant="secondary" className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">فرق سجلات</Badge>;
    case 'diff_structure':
      return <Badge variant="destructive" className="text-[10px]">فرق هيكلي</Badge>;
    case 'only_local':
      return <Badge variant="outline" className="text-[10px]">محلي فقط</Badge>;
    case 'only_supabase':
      return <Badge variant="outline" className="text-[10px]">سحابي فقط</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center gap-2 py-1.5 border-b border-muted/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function PerformanceMetrics({ perf, extended }: { perf: any; extended?: boolean }) {
  const perfStats: StatsRowConfig[] = useMemo(() => {
    const baseItems = [
      {
        key: 'cache',
        label: 'نسبة الذاكرة المؤقتة',
        value: `${perf.cacheHitRatio}%`,
        icon: Zap,
        color: (perf.cacheHitRatio > 95 ? 'emerald' : perf.cacheHitRatio > 80 ? 'amber' : 'red') as any,
      },
      {
        key: 'committed',
        label: 'المعاملات الناجحة',
        value: perf.transactionsCommitted?.toLocaleString() || '0',
        icon: CheckCircle2,
        color: 'green' as const,
      },
      {
        key: 'rolledback',
        label: 'المرتجعة',
        value: perf.transactionsRolledBack?.toLocaleString() || '0',
        icon: AlertTriangle,
        color: (perf.transactionsRolledBack > 10 ? 'red' : 'emerald') as any,
      },
      {
        key: 'dead',
        label: 'السجلات الميتة',
        value: perf.deadTuples?.toLocaleString() || '0',
        icon: Database,
        color: (perf.deadTuples > 1000 ? 'red' : 'emerald') as any,
      },
    ];

    if (extended) {
      baseItems.splice(1, 0, {
        key: 'avgquery',
        label: 'متوسط زمن الاستعلام',
        value: perf.avgQueryTime > 0 ? `${perf.avgQueryTime} ms` : 'غير متاح',
        icon: Activity,
        color: 'blue' as const,
      });
      baseItems.push({
        key: 'live',
        label: 'السجلات الحية',
        value: perf.liveTuples?.toLocaleString() || '0',
        icon: Database,
        color: 'blue' as const,
      });
    }

    return [{
      items: baseItems,
      columns: (extended ? 6 : 4) as any,
      gap: 'md' as const,
    }];
  }, [perf, extended]);

  return (
    <div>
      {perfStats.map((row, i) => (
        <div key={i} className={`grid gap-3 ${extended ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`}>
          {row.items.map((item) => {
            const colors = getColorClasses(item.color);
            return (
              <div key={item.key} className={`rounded-xl border p-3 ${colors.bg} ${colors.border}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className={`h-3.5 w-3.5 ${colors.icon}`} />
                  <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                </div>
                <p className={`text-lg font-bold ${colors.text}`}>{item.value}</p>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function getColorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20',
      border: 'border-emerald-100 dark:border-emerald-800/50',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: 'text-emerald-500',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/20',
      border: 'border-blue-100 dark:border-blue-800/50',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-500',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-amber-900/20',
      border: 'border-amber-100 dark:border-amber-800/50',
      text: 'text-amber-600 dark:text-amber-400',
      icon: 'text-amber-500',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/20',
      border: 'border-red-100 dark:border-red-800/50',
      text: 'text-red-600 dark:text-red-400',
      icon: 'text-red-500',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20',
      border: 'border-green-100 dark:border-green-800/50',
      text: 'text-green-600 dark:text-green-400',
      icon: 'text-green-500',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/20',
      border: 'border-purple-100 dark:border-purple-800/50',
      text: 'text-purple-600 dark:text-purple-400',
      icon: 'text-purple-500',
    },
  };
  return map[color] || map.blue;
}

function TableRowDetail({ table, source, expanded, onToggle, onMaintenance, isMaintenanceLoading }: {
  table: any; source: string; expanded: boolean; onToggle: () => void; onMaintenance: (action: string) => void; isMaintenanceLoading: boolean;
}) {
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadDetails = async () => {
    if (details) { onToggle(); return; }
    setDetailsLoading(true);
    try {
      const sourceParam = source !== 'active' ? `?source=${source}` : '';
      const res = await fetch(`/api/db/tables/${table.name}${sourceParam}`, { credentials: 'include' });
      const data = await res.json();
      setDetails(data?.data);
    } catch { }
    setDetailsLoading(false);
    onToggle();
  };

  return (
    <>
      <TableRow className="hover-elevate cursor-pointer" onClick={loadDetails} data-testid={`row-table-${table.name}`}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-xs">{table.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-center font-mono">{table.rowCount.toLocaleString()}</TableCell>
        <TableCell className="text-center text-xs">{table.totalSize}</TableCell>
        <TableCell className="text-center">{table.columns}</TableCell>
        <TableCell className="text-center">{table.indexes}</TableCell>
        <TableCell className="text-center">
          {detailsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : expanded ? (
            <ChevronUp className="h-4 w-4 mx-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 mx-auto" />
          )}
        </TableCell>
      </TableRow>
      {expanded && details && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/20 p-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">الأعمدة ({details.columns?.length || 0})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                  {details.columns?.map((col: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs p-1 rounded bg-background">
                      <Columns3 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-mono">{col.column_name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{col.data_type}</Badge>
                      {col.is_nullable === 'NO' && <Badge variant="outline" className="text-[10px] px-1 py-0">مطلوب</Badge>}
                    </div>
                  ))}
                </div>
              </div>
              {details.indexes?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">الفهارس ({details.indexes.length})</p>
                  <div className="space-y-1">
                    {details.indexes.map((idx: any, i: number) => (
                      <p key={i} className="text-xs font-mono text-muted-foreground bg-background p-1 rounded">{idx.indexname}</p>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button
                  size="sm" variant="outline"
                  onClick={(e) => { e.stopPropagation(); onMaintenance('vacuum'); }}
                  disabled={isMaintenanceLoading}
                  data-testid={`button-vacuum-${table.name}`}
                >
                  تنظيف
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={(e) => { e.stopPropagation(); onMaintenance('analyze'); }}
                  disabled={isMaintenanceLoading}
                  data-testid={`button-analyze-${table.name}`}
                >
                  تحليل
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function MaintenanceAction({ title, description, action, icon, onRun, isLoading }: {
  title: string; description: string; action: string; icon: React.ReactNode; onRun: () => void; isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          variant="outline" size="sm" className="w-full"
          onClick={onRun}
          disabled={isLoading}
          data-testid={`button-maintenance-${action}`}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
          تنفيذ
        </Button>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} يوم ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}
