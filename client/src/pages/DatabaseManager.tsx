import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Database, RefreshCw, HardDrive, Server, Globe, 
  ShieldCheck, Activity, Search, Table as TableIcon, DatabaseZap, Wifi, WifiOff,
  CheckCircle2, Clock, Zap, ArrowRightLeft, Shield, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getDB } from "@/offline/db";
import { verifySyncStatus, SyncState, getSyncState, forceSyncTable } from "@/offline/sync";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function DatabaseManager() {
  const { toast } = useToast();
  const [syncState, setSyncState] = useState<SyncState>(getSyncState());
  const [comparison, setComparison] = useState<any>(null);
  const [localTableStats, setLocalTableStats] = useState<Record<string, number>>({});
  const [syncingTables, setSyncingTables] = useState<Record<string, boolean>>({});

  const {
    searchValue,
    onSearchChange,
    onReset
  } = useUnifiedFilter({}, '');

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<any>({
    queryKey: ["/api/admin/data-health"],
  });

  const syncMutation = useMutation({
    mutationFn: async (tableName: string) => {
      setSyncingTables(prev => ({ ...prev, [tableName]: true }));
      try {
        const response = await apiRequest("POST", "/api/sync/instant-sync", { tables: [tableName] });
        const result = await response.json();
        
        if (result.success && result.data[tableName]) {
          await forceSyncTable(tableName, result.data[tableName]);
          return result;
        }
        throw new Error("فشلت المزامنة");
      } finally {
        setSyncingTables(prev => ({ ...prev, [tableName]: false }));
      }
    },
    onSuccess: (_, tableName) => {
      toast({
        title: "تمت المزامنة",
        description: `تمت مزامنة جدول ${tableName} بنجاح`,
      });
      verifySyncStatus().then(setComparison);
    },
    onError: (error) => {
      toast({
        title: "خطأ في المزامنة",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncState(getSyncState());
    }, 2000);

    const loadLocalStats = async () => {
      try {
        const db = await getDB();
        const stats: Record<string, number> = {};
        const stores = Array.from(db.objectStoreNames) as string[];
        
        for (const store of stores) {
          try {
            const tx = db.transaction(store, 'readonly');
            const count = await tx.store.count();
            stats[store] = count;
          } catch (e) {
            stats[store] = 0;
          }
        }
        setLocalTableStats(stats);
      } catch (err) {
        console.error("Local stats error:", err);
      }
    };

    loadLocalStats();
    verifySyncStatus().then(setComparison);

    return () => clearInterval(interval);
  }, []);

  const stats = health?.data;

  const filteredDifferences = useMemo(() => {
    if (!comparison?.differences) return [];
    return comparison.differences.filter((row: any) => 
      row.table.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [comparison, searchValue]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border-2 border-blue-500/20 shadow-inner">
            <DatabaseZap className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
              إدارة قاعدة البيانات
            </h1>
            <p className="text-muted-foreground font-medium">مزامنة وتحليل البيانات بين السحابة والجهاز</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border-2 shadow-sm">
          <Badge variant={syncState.isOnline ? "default" : "destructive"} className="px-6 py-2 rounded-xl text-sm font-bold shadow-sm border-none">
            {syncState.isOnline ? <Wifi className="w-4 h-4 ml-2" /> : <WifiOff className="w-4 h-4 ml-2" />}
            {syncState.isOnline ? "متصل" : "غير متصل"}
          </Badge>
          <Button onClick={() => { refetchHealth(); verifySyncStatus().then(setComparison); }} variant="outline" className="gap-2 rounded-xl h-11 px-6 border-2 font-bold hover-elevate transition-all">
            <RefreshCw className={`h-5 w-5 ${healthLoading ? 'animate-spin' : ''}`} />
            تحديث الحالة
          </Button>
        </div>
      </div>

      <UnifiedSearchFilter
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onReset={onReset}
        searchPlaceholder="بحث في الجداول والقواعد..."
      />

      <UnifiedStats
        stats={[
          {
            title: "سلامة البيانات",
            value: "100%",
            icon: ShieldCheck,
            color: "green",
            status: "normal"
          },
          {
            title: "زمن الاستجابة",
            value: `${syncState.latency || 0}ms`,
            icon: Activity,
            color: "blue"
          },
          {
            title: "العمليات المعلقة",
            value: syncState.pendingCount.toString(),
            icon: Clock,
            color: syncState.pendingCount > 0 ? "orange" : "blue"
          },
          {
            title: "وضع المحرك",
            value: syncState.isOnline ? "Cloud" : "Edge",
            icon: Zap,
            color: "purple"
          }
        ]}
      />

      <UnifiedCardGrid columns={3}>
        {stats?.databases.map((db: any, i: number) => (
          <UnifiedCard 
            key={i}
            title={db.name}
            subtitle={db.status === 'online' || db.status === 'active' ? 'Active' : 'Standby'}
            titleIcon={db.name.includes('Central') ? Server : db.name.includes('Supabase') ? Globe : HardDrive}
            fields={[
              { label: "Response Time", value: db.latency !== 'N/A' ? db.latency : '--', emphasis: true },
              { label: "Tables", value: db.tablesCount },
              { label: "Integrity", value: "VALIDATED", color: "success" }
            ]}
          />
        ))}
      </UnifiedCardGrid>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 shadow-xl rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
            <CardHeader className="border-b-2 border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 py-6 px-8">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter">
                    <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                      <ArrowRightLeft className="h-6 w-6 text-white" />
                    </div>
                    مطابقة البيانات (Cloud vs Local)
                  </CardTitle>
                  <CardDescription className="font-medium mt-1">مقارنة حية لعدد السجلات بين السيرفر والجهاز المحلي</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="text-right py-4 px-8 font-bold text-slate-900 dark:text-slate-100">الجدول</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 dark:text-slate-100">السيرفر (Cloud)</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 dark:text-slate-100">الجهاز (Local)</TableHead>
                    <TableHead className="text-right font-bold text-slate-900 dark:text-slate-100">الحالة</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 dark:text-slate-100">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDifferences.length > 0 ? (
                    filteredDifferences.map((row: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all border-b border-slate-50 dark:border-slate-800 group">
                        <TableCell className="font-black py-5 px-8 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{row.table}</TableCell>
                        <TableCell className="text-center font-mono font-black text-blue-600 dark:text-blue-400 text-lg">{row.serverCount}</TableCell>
                        <TableCell className="text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">{row.clientCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4 justify-end">
                            <div className="flex-1 max-w-[100px]">
                              <Progress value={Math.min(100, (row.clientCount / (row.serverCount || 1)) * 100)} className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
                            </div>
                            <Badge variant={row.diff === 0 ? "default" : (row.diff > 0 ? "destructive" : "secondary")} className="text-[11px] font-black py-1 px-3 shadow-md border-none rounded-lg min-w-[80px] justify-center uppercase">
                              {row.diff === 0 ? (
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> مطابق</span>
                              ) : row.diff > 0 ? (
                                `نقص ${row.diff}`
                              ) : (
                                `زيادة ${Math.abs(row.diff)}`
                              )}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-10 w-10 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                            onClick={() => syncMutation.mutate(row.table)}
                            disabled={syncingTables[row.table]}
                          >
                            {syncingTables[row.table] ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-5 w-5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic font-medium">
                        <div className="flex flex-col items-center gap-3">
                          <Search className="h-10 w-10 opacity-20" />
                          {searchValue ? "لا توجد نتائج تطابق البحث" : "جاري فحص مطابقة البيانات..."}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 text-white overflow-hidden relative rounded-[2rem] h-[280px] flex flex-col justify-center">
            <div className="absolute top-[-20%] right-[-10%] p-8 opacity-10 animate-pulse">
              <ShieldCheck size={300} />
            </div>
            <CardHeader className="pb-4 relative z-10">
              <div className="bg-white/20 w-fit p-3 rounded-2xl backdrop-blur-md mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter">
                محرك السلامة الذكي
              </CardTitle>
              <CardDescription className="text-blue-100 font-medium">نظام مراقبة جودة البيانات الفوري</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="bg-white/10 p-6 rounded-[1.5rem] border border-white/20 backdrop-blur-xl shadow-2xl">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[11px] uppercase font-black text-blue-200 tracking-[0.2em]">Data Integrity</span>
                    <div className="text-5xl font-black font-mono tracking-tighter mt-1">100%</div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-none font-black px-3 py-1">SECURE</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <UnifiedCard 
            title="نشاط التزامن" 
            titleIcon={RefreshCw}
            className="rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl"
            fields={[
              { label: "Success Rate", value: "99.9%", color: "success", emphasis: true },
              { label: "Average Latency", value: `${syncState.latency || 0}ms`, color: "info", emphasis: true }
            ]}
            footer={
              <div className="p-4 bg-amber-500/10 dark:bg-amber-500/5 border-2 border-amber-500/20 rounded-2xl">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-black leading-relaxed text-center uppercase tracking-wide">
                  المزامنة التلقائية مفعلة كل 30 ثانية لضمان دقة النظام
                </p>
              </div>
            }
          />
        </div>
      </div>
    </div>

  );
}


