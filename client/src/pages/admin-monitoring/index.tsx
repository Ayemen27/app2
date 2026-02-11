
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Cpu, HardDrive, Zap, TrendingUp, TrendingDown, Clock, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminMonitoringUI } from "@/components/admin-monitoring-ui";

export default function AdminMonitoring() {
  // جلب بيانات الصحة الكاملة
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/health/full"],
    refetchInterval: 30000,
  });

  // جلب الإحصائيات اللحظية
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/health/stats"],
    refetchInterval: 15000,
  });

  if (healthLoading || statsLoading) return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Activity className="h-12 w-12 animate-spin text-primary opacity-20" />
          <Activity className="h-12 w-12 animate-ping text-primary absolute top-0 left-0" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">جاري تحليل أداء النظام...</p>
      </div>
    </div>
  );

  const stats = statsData?.data || {};
  const health = healthData?.health || {};
  const metrics = healthData?.metrics || {};

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0 ثانية";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h} ساعة و ${m} دقيقة`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">نظام الرصد المركزي</h1>
          <p className="text-muted-foreground mt-1">مراقبة حية لأداء الخادم، صحة البيانات، والعمليات الذكية.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={health?.status === 'healthy' ? 'success' : 'warning'} className="h-9 px-4 text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {health?.status === 'healthy' ? 'نظام مستقر' : 'تنبيه في الأداء'}
          </Badge>
          <div className="text-[10px] text-muted-foreground text-left hidden md:block">
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </div>
        </div>
      </div>
      
      <UnifiedStats
        stats={[
          {
            title: "استهلاك المعالج (CPU)",
            value: `${stats.cpuUsage || 0}%`,
            icon: Cpu,
            color: "blue",
            status: (stats.cpuUsage || 0) > 80 ? "critical" : "normal"
          },
          {
            title: "استهلاك الذاكرة",
            value: `${stats.memoryUsage || 0}%`,
            icon: HardDrive,
            color: "purple",
            status: (stats.memoryUsage || 0) > 85 ? "warning" : "normal"
          },
          {
            title: "وقت التشغيل المتواصل",
            value: formatUptime(stats.uptime || 0),
            icon: Clock,
            color: "green"
          },
          {
            title: "متوسط زمن الاستجابة",
            value: `${metrics.averageLatency || 0}ms`,
            icon: Zap,
            color: "orange",
            status: (metrics.averageLatency || 0) > 500 ? "warning" : "normal"
          }
        ]}
        columns={4}
        hideHeader={true}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                تحليل زمن استجابة قاعدة البيانات
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">تتبع تاريخي لزمن الوصول للبيانات (Latency History)</p>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthData?.health?.history || []}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))', 
                    borderRadius: 'var(--radius)',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                  labelFormatter={(label) => `التوقيت: ${new Date(label).toLocaleTimeString('ar-SA')}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="checks.database.latency" 
                  name="زمن الاستجابة"
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorLatency)" 
                  strokeWidth={2}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AdminMonitoringUI />
          
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                المؤشرات الأمنية والوقائية
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Circuit Breakers</span>
                    <span className="text-[10px] text-muted-foreground">أنظمة العزل التلقائي</span>
                  </div>
                  <Badge variant="outline" className="font-mono">{health?.checks?.circuitBreakers?.total || 0} نشط</Badge>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">وضع الطوارئ</span>
                    <span className="text-[10px] text-muted-foreground">Emergency Mode</span>
                  </div>
                  <Badge variant={health?.emergencyMode ? 'destructive' : 'secondary'} className="animate-pulse">
                    {health?.emergencyMode ? 'مفعل (خطر)' : 'متوقف'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">قاعدة البيانات</span>
                    <span className="text-[10px] text-muted-foreground">Database Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${health?.checks?.database?.status ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className="text-xs font-bold">{health?.checks?.database?.status ? 'متصلة' : 'منقطعة'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
