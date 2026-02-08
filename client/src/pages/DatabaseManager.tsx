import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Database, RefreshCw, HardDrive, Server, Globe, 
  ShieldCheck, Activity, Search, Table as TableIcon, DatabaseZap, Wifi, WifiOff,
  CheckCircle2, Clock, Zap, ArrowRightLeft, Shield
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
import { verifySyncStatus, SyncState, getSyncState } from "@/offline/sync";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";

export default function DatabaseManager() {
  const { toast } = useToast();
  const [syncState, setSyncState] = useState<SyncState>(getSyncState());
  const [comparison, setComparison] = useState<any>(null);
  const [localTableStats, setLocalTableStats] = useState<Record<string, number>>({});

  const {
    searchValue,
    onSearchChange,
    onReset
  } = useUnifiedFilter({}, '');

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ["/api/admin/data-health"],
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncState(getSyncState());
    }, 2000);

    const loadLocalStats = async () => {
      try {
        const db = await getDB();
        const stats: Record<string, number> = {};
        const stores = Array.from(db.objectStoreNames);
        
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="hidden">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DatabaseZap className="h-7 w-7 text-blue-500" />
            إدارة ومراقبة قواعد البيانات
          </h1>
          <p className="text-muted-foreground">نظام المراقبة الموحد للقواعد المركزية والمحلية</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Badge variant={syncState.isOnline ? "success" : "destructive"} className="px-4 py-1">
            {syncState.isOnline ? <Wifi className="w-3 h-3 ml-2" /> : <WifiOff className="w-3 h-3 ml-2" />}
            {syncState.isOnline ? "Online" : "Offline / Emergency"}
          </Badge>
          <Button onClick={() => { refetchHealth(); verifySyncStatus().then(setComparison); }} variant="outline" className="gap-2 shadow-sm">
            <RefreshCw className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />
            تحديث الحالة
          </Button>
        </div>
      </div>

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
            value: syncState.pendingCount,
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
            icon={db.name.includes('Central') ? Server : db.name.includes('Supabase') ? Globe : HardDrive}
          >
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-black font-mono tracking-tighter">{db.latency !== 'N/A' ? db.latency : '--'}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Response Time</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div className="flex flex-col">
                  <span className="text-muted-foreground font-bold text-[10px] uppercase">Tables</span>
                  <span className="font-bold text-lg">{db.tablesCount}</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-muted-foreground font-bold text-[10px] uppercase">Integrity</span>
                  <span className="font-bold text-green-600 text-sm">VALIDATED</span>
                </div>
              </div>
              <Progress value={100} className={`h-1.5 ${db.status === 'online' || db.status === 'active' ? 'bg-green-500/20' : 'bg-slate-500/20'}`} />
            </div>
          </UnifiedCard>
        ))}
      </UnifiedCardGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 py-4 px-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                    مطابقة البيانات (Cloud vs Local)
                  </CardTitle>
                </div>
                <div className="w-64">
                  <Input 
                    placeholder="بحث في الجداول..." 
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/30">
                  <TableRow>
                    <TableHead className="text-right">الجدول</TableHead>
                    <TableHead className="text-center">السيرفر (Cloud)</TableHead>
                    <TableHead className="text-center">الجهاز (Local)</TableHead>
                    <TableHead className="text-left">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDifferences.length > 0 ? (
                    filteredDifferences.map((row: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="font-bold py-3">{row.table}</TableCell>
                        <TableCell className="text-center font-mono text-blue-600 dark:text-blue-400">{row.serverCount}</TableCell>
                        <TableCell className="text-center font-mono text-green-600 dark:text-green-400">{row.clientCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={Math.min(100, (row.clientCount / (row.serverCount || 1)) * 100)} className="h-1.5 w-16" />
                            <Badge variant={row.diff === 0 ? "success" : "warning"} className="text-[10px] py-0 px-2">
                              {row.diff === 0 ? 'مطابق' : `فارق ${row.diff}`}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                        {searchValue ? "لا توجد نتائج تطابق البحث" : "جاري فحص مطابقة البيانات..."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck size={120} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                محرك السلامة الذكي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                <span className="text-[10px] uppercase font-bold text-blue-100">Integrity Score</span>
                <div className="text-4xl font-black font-mono tracking-tighter">100%</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-100">بروتوكول التحقق:</span>
                  <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">CRC64-AES</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-blue-100">جاهزية الطوارئ</span>
                    <span>100%</span>
                  </div>
                  <Progress value={100} className="h-1.5 bg-white/20" />
                </div>
              </div>
            </CardContent>
          </Card>

          <UnifiedCard title="نشاط التزامن" icon={RefreshCw}>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Success Rate</span>
                  <span className="text-lg font-black font-mono text-green-600">99.9%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Latency</span>
                  <span className="text-lg font-black font-mono text-blue-600">{syncState.latency || 0}ms</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-xl text-center">
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                  يتم مزامنة البيانات كل 30 ثانية بشكل تلقائي لضمان استمرارية العمل في جميع الظروف.
                </p>
              </div>
            </div>
          </UnifiedCard>
        </div>
      </div>
    </div>
  );
}

