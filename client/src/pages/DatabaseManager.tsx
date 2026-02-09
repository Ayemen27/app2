import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Database, RefreshCw, HardDrive, Server,
  ShieldCheck, Activity, Search, Table as TableIcon,
  CheckCircle2, Zap, Loader2, Settings,
  BarChart3, Wrench, AlertTriangle, ChevronDown, ChevronUp,
  Columns3, FileText
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

export default function DatabaseManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'size' | 'rows' | 'name'>('size');
  const [searchValue, setSearchValue] = useState("");

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<any>({
    queryKey: ["/api/db/overview"],
  });

  const { data: tables, isLoading: tablesLoading, refetch: refetchTables } = useQuery<any>({
    queryKey: ["/api/db/tables"],
  });

  const { data: performance, isLoading: perfLoading, refetch: refetchPerf } = useQuery<any>({
    queryKey: ["/api/db/performance"],
  });

  const { data: integrity, isLoading: integrityLoading, refetch: refetchIntegrity } = useQuery<any>({
    queryKey: ["/api/db/integrity"],
  });

  const { data: systemStats } = useQuery<any>({
    queryKey: ["/api/stats"],
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

  const db = overview?.data;
  const tableList = tables?.data || [];
  const perf = performance?.data;
  const integrityData = integrity?.data;
  const sysStats = systemStats?.data;

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

  const statsRows: StatsRowConfig[] = useMemo(() => [{
    items: [
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
        label: 'سلامة البيانات',
        value: integrityLoading ? '...' : `${integrityScore}%`,
        icon: ShieldCheck,
        color: integrityScore >= 90 ? 'emerald' as const : integrityScore >= 75 ? 'amber' as const : 'red' as const,
        showDot: !integrityLoading,
        dotColor: integrityScore >= 90 ? 'bg-emerald-500' : integrityScore >= 75 ? 'bg-yellow-500' : 'bg-red-500',
      },
    ],
    columns: 4,
    gap: 'md',
  }], [db, overviewLoading, integrityScore, integrityLoading, totalRows]);

  const refreshAction: ActionButton[] = [{
    key: 'refresh',
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-10" data-testid="tabs-db-manager">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-overview">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline">نظرة عامة</span><span className="sm:hidden">عامة</span>
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-tables">
            <TableIcon className="h-3.5 w-3.5 shrink-0" /> <span>الجداول</span>
          </TabsTrigger>
          <TabsTrigger value="integrity" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-integrity">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline">سلامة البيانات</span><span className="sm:hidden">السلامة</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-performance">
            <Activity className="h-3.5 w-3.5 shrink-0" /> <span>الأداء</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-maintenance">
            <Wrench className="h-3.5 w-3.5 shrink-0" /> <span>الصيانة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  معلومات القاعدة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overviewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : db ? (
                  <div className="space-y-2">
                    <InfoRow label="اسم القاعدة" value={db.name} />
                    <InfoRow label="الإصدار" value={db.version} />
                    <InfoRow label="الحجم الكلي" value={db.size} />
                    <InfoRow label="عدد الجداول" value={db.totalTables} />
                    <InfoRow label="إجمالي السجلات" value={(db.totalRows || 0).toLocaleString()} />
                    <InfoRow label="عدد الفهارس" value={db.totalIndexes} />
                    <InfoRow label="وقت التشغيل" value={db.uptime} />
                    <InfoRow label="الاتصالات النشطة" value={`${db.activeConnections} / ${db.maxConnections}`} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  موارد الخادم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sysStats ? (
                  <>
                    <div>
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span className="text-muted-foreground">استخدام المعالج</span>
                        <span className="font-medium">{sysStats.cpuUsage}%</span>
                      </div>
                      <Progress value={sysStats.cpuUsage} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span className="text-muted-foreground">استخدام الذاكرة</span>
                        <span className="font-medium">{sysStats.memoryUsage}%</span>
                      </div>
                      <Progress value={sysStats.memoryUsage} className="h-2" />
                    </div>
                    {sysStats.memoryDetails && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <span className="text-muted-foreground">Heap مستخدم</span>
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
          </div>

          {perf && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  ملخص الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceMetrics perf={perf} />
              </CardContent>
            </Card>
          )}
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

        <TabsContent value="integrity" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                صيانة قاعدة البيانات
              </CardTitle>
              <CardDescription>عمليات الصيانة والتحسين - تُنفذ على جميع الجداول</CardDescription>
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
                  description="تحديث إحصائيات المحسّن للاستعلامات"
                  action="analyze"
                  icon={<BarChart3 className="h-5 w-5" />}
                  onRun={() => maintenanceMutation.mutate({ action: 'analyze' })}
                  isLoading={maintenanceMutation.isPending}
                />
                <MaintenanceAction
                  title="إعادة بناء الفهارس"
                  description="إعادة بناء جميع الفهارس لتحسين الأداء"
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
        label: 'المعاملات المرتجعة',
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

function TableRowDetail({ table, expanded, onToggle, onMaintenance, isMaintenanceLoading }: {
  table: any; expanded: boolean; onToggle: () => void; onMaintenance: (action: string) => void; isMaintenanceLoading: boolean;
}) {
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadDetails = async () => {
    if (details) { onToggle(); return; }
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/db/tables/${table.name}`, { credentials: 'include' });
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
          variant="outline" size="sm" className="w-full gap-1"
          onClick={onRun}
          disabled={isLoading}
          data-testid={`button-maintenance-${action}`}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          تنفيذ
        </Button>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d} يوم ${h % 24} ساعة`;
  }
  return `${h} ساعة ${m} دقيقة`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
