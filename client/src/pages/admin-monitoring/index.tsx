
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Cpu, HardDrive, Zap, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminMonitoringUI } from "@/components/admin-monitoring-ui";

export default function AdminMonitoring() {
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/health/full"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/health/stats"],
    refetchInterval: 15000,
  });

  if (healthLoading || statsLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-2">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري تحميل بيانات المراقبة...</p>
      </div>
    </div>
  );

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">نظام المراقبة والتحكم</h1>
          <p className="text-muted-foreground">مراقبة أداء الخادم، صحة النظام، والعمليات الذكية.</p>
        </div>
        <Badge variant={health?.health?.status === 'healthy' ? 'success' : 'warning'} className="h-8 px-4 text-sm">
          {health?.health?.status === 'healthy' ? 'النظام مستقر' : 'تنبيه في النظام'}
        </Badge>
      </div>
      
      <UnifiedStats
        stats={[
          {
            title: "استهلاك المعالج",
            value: `${stats?.data?.cpuUsage || 0}%`,
            icon: Cpu,
            color: "blue",
            status: (stats?.data?.cpuUsage || 0) > 80 ? "critical" : "normal"
          },
          {
            title: "استهلاك الذاكرة",
            value: `${stats?.data?.memoryUsage || 0}%`,
            icon: HardDrive,
            color: "purple",
            status: (stats?.data?.memoryUsage || 0) > 85 ? "warning" : "normal"
          },
          {
            title: "وقت التشغيل",
            value: formatUptime(stats?.data?.uptime || 0),
            icon: Clock,
            color: "green"
          },
          {
            title: "حالة قاعدة البيانات",
            value: health?.health?.details?.database === 'healthy' ? "متصل" : "خطأ",
            icon: HardDrive,
            color: health?.health?.details?.database === 'healthy' ? "teal" : "red",
            status: health?.health?.details?.database === 'healthy' ? "normal" : "critical"
          }
        ]}
        columns={4}
        hideHeader={true}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                تحليل زمن الاستجابة (Latency)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={health?.health?.history || []}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorLatency)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AdminMonitoringUI />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                تنبيهات الأمان والحماية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Circuit Breakers</span>
                  <Badge variant="outline">{health?.circuitBreakers?.total || 0} نشط</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">حالة الطوارئ</span>
                  <Badge variant={health?.emergencyMode ? 'destructive' : 'secondary'}>
                    {health?.emergencyMode ? 'مفعلة' : 'متوقفة'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
