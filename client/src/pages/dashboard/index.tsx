import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  Zap, 
  ShieldAlert, 
  Smartphone, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  MoreHorizontal,
  Search,
  LineChart as LineChartIcon,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Incident } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const chartData = [
  { time: '00:00', errors: 12, latency: 280 },
  { time: '04:00', errors: 8, latency: 310 },
  { time: '08:00', errors: 25, latency: 450 },
  { time: '12:00', errors: 18, latency: 320 },
  { time: '16:00', errors: 35, latency: 510 },
  { time: '20:00', errors: 15, latency: 290 },
  { time: '23:59', errors: 10, latency: 275 },
];

export default function Dashboard() {
  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({ 
    queryKey: ["/api/incidents"] 
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({ 
    queryKey: ["/api/metrics/summary"] 
  });

  if (incidentsLoading || summaryLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen space-y-4">
        <Activity className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Syncing live telemetry from edge nodes...</p>
      </div>
    );
  }

  const mockIncidents = incidents || [];
  const metricsData = summary || {
    crashFree: "99.96%",
    coldStart: "1.1s",
    exceptions: 12,
    throughput: "4.5k"
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] text-[#1e293b] dark:text-[#f1f5f9]">
      {/* Global Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-[#e2e8f0] dark:border-[#1e293b] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20 shadow-sm shadow-primary/5">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Android Sentinel</span>
          </div>
          <div className="h-6 w-px bg-[#e2e8f0] dark:bg-[#1e293b]" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <Smartphone className="w-4 h-4" />
            <span className="font-medium">Production Fleet</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search traces, users, or logs..." 
              className="pl-10 h-10 bg-muted/30 border-[#e2e8f0] dark:border-[#1e293b] focus-visible:ring-primary/20 rounded-xl"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2 h-10 px-4 rounded-xl border-[#e2e8f0] dark:border-[#1e293b]">
            <Filter className="w-4 h-4" />
            Advanced
          </Button>
          <Button size="sm" className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            Export Analytics
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Hero Section */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold py-0 h-5 border-primary/30 text-primary">Live Monitor</Badge>
              <span className="text-xs text-muted-foreground font-mono">Last updated: Just now</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">System Observability</h1>
            <p className="text-muted-foreground font-medium">Monitoring 1.2M active sessions with 99.9% reliability</p>
          </div>
          <div className="flex items-center gap-3 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-2xl border border-green-500/20 shadow-sm shadow-green-500/5">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
            <span className="font-bold text-sm">Operational Global Nodes</span>
          </div>
        </div>

        {/* High-Impact KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Crash-Free Users" 
            value={metricsData.crashFree} 
            trend="+0.02%" 
            up={true} 
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            description="Target SLA: 99.9%"
          />
          <MetricCard 
            title="Cold Start Time" 
            value={metricsData.coldStart} 
            trend="-140ms" 
            up={true} 
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
            description="P95 Response"
          />
          <MetricCard 
            title="Active Exceptions" 
            value={metricsData.exceptions.toString()} 
            trend="+3" 
            up={false} 
            icon={<AlertCircle className="w-5 h-5 text-destructive" />}
            description="Pending triage"
          />
          <MetricCard 
            title="Throughput" 
            value={metricsData.throughput} 
            trend="+12%" 
            up={true} 
            icon={<Activity className="w-5 h-5 text-blue-500" />}
            description="Req / Sec"
          />
        </div>

        {/* Charts and Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl shadow-black/5 dark:shadow-none ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0f172a] rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#f1f5f9] dark:border-[#1e293b] pb-6 px-8 pt-8">
              <div>
                <CardTitle className="text-xl font-black">Performance Trends</CardTitle>
                <CardDescription>Error frequency vs System Latency</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-8">24h</Button>
                <Button variant="secondary" size="sm" className="text-xs h-8">7d</Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="errors" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorErrors)" />
                    <Area type="monotone" dataKey="latency" stroke="#fbbf24" strokeWidth={3} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-black/5 dark:shadow-none ring-1 ring-black/5 dark:ring-white/5 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl">
              <CardHeader className="pt-8 px-8">
                <CardTitle className="text-lg font-black">Fleet Health</CardTitle>
                <CardDescription>Major release stability</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-5">
                <VersionBar version="v2.4.1" percentage={65} color="bg-primary" />
                <VersionBar version="v2.4.0" percentage={25} color="bg-blue-400" />
                <VersionBar version="v2.3.9" percentage={8} color="bg-slate-400" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-black/5 dark:shadow-none ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0f172a] rounded-3xl">
              <CardHeader className="pt-8 px-8">
                <CardTitle className="text-lg font-black">Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 px-8 pb-8">
                <ToolButton icon={<LineChartIcon className="w-5 h-5" />} label="Metrics" />
                <ToolButton icon={<BarChart3 className="w-5 h-5" />} label="Distribution" />
                <ToolButton icon={<Zap className="w-5 h-5" />} label="Traces" />
                <ToolButton icon={<Smartphone className="w-5 h-5" />} label="Sessions" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Incident Feed */}
        <Card className="border-none shadow-xl shadow-black/5 dark:shadow-none ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0f172a] rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#f1f5f9] dark:border-[#1e293b] py-8 px-8">
            <div>
              <CardTitle className="text-2xl font-black">Live Incident Stream</CardTitle>
              <CardDescription>Critical regressions and unhandled exceptions across the fleet</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl font-bold text-xs h-9">Ignore Muted</Button>
              <Button className="rounded-xl font-bold text-xs h-9 px-6 shadow-md shadow-primary/10">Triage All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-none">
                  <TableHead className="px-8 py-4 uppercase text-[10px] font-black tracking-widest">ID / Reference</TableHead>
                  <TableHead className="py-4 uppercase text-[10px] font-black tracking-widest">Issue & Context</TableHead>
                  <TableHead className="py-4 uppercase text-[10px] font-black tracking-widest">Severity</TableHead>
                  <TableHead className="py-4 uppercase text-[10px] font-black tracking-widest">Blast Radius</TableHead>
                  <TableHead className="text-right px-8 py-4 uppercase text-[10px] font-black tracking-widest">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockIncidents.length > 0 ? mockIncidents.map((incident) => (
                  <TableRow key={incident.id} className="hover:bg-muted/30 cursor-pointer transition-all border-b border-[#f1f5f9] dark:border-[#1e293b] last:border-none group">
                    <TableCell className="px-8 py-6 font-mono text-[11px] text-primary font-black">
                      #{incident.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{incident.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] font-black py-0 h-4 rounded-md uppercase">{incident.appVersion}</Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">Production Node • EU-West-1</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge 
                        className={`capitalize text-[10px] px-3 py-0 h-6 font-black border-none shadow-sm ${
                          incident.severity === 'critical' 
                          ? 'bg-red-500 text-white' 
                          : incident.severity === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-500 text-white'
                        }`}
                      >
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black italic">{incident.affectedDevices.toLocaleString()}</span>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full transition-all duration-1000 ${incident.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min((incident.affectedDevices/2000)*100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-8 py-6">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-black">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          Just now
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Real-time update</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-12 h-12 text-green-500/20" />
                        No active incidents reported in the last 24 hours.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MetricCard({ title, value, trend, up, icon, description }: any) {
  return (
    <Card className="border-none shadow-xl shadow-black/5 dark:shadow-none ring-1 ring-black/5 dark:ring-white/5 hover:ring-primary/40 transition-all group overflow-hidden relative bg-white dark:bg-[#0f172a] rounded-3xl">
      <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-500 rotate-12">
        {icon}
      </div>
      <CardHeader className="pb-2 pt-8 px-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-muted/30 group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
          <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tighter">{value}</span>
          <div className={`flex items-center text-sm font-black ${up ? 'text-green-500' : 'text-red-500'}`}>
            {up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {trend}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${up ? 'bg-green-500' : 'bg-red-500'} opacity-20`} style={{ width: '70%' }} />
          </div>
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function VersionBar({ version, percentage, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-black uppercase tracking-tight">{version}</span>
        <span className="text-[11px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full">{percentage}%</span>
      </div>
      <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden p-0.5 border border-muted/20">
        <div 
          className={`h-full ${color} rounded-full shadow-lg shadow-primary/20 transition-all duration-1000`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}

function ToolButton({ icon, label }: any) {
  return (
    <Button variant="outline" className="h-auto py-5 flex-col gap-3 border-none bg-muted/20 hover:bg-primary/10 hover:text-primary transition-all rounded-2xl group ring-1 ring-inset ring-black/5 dark:ring-white/5">
      <div className="p-2 rounded-xl bg-white dark:bg-black/20 shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </Button>
  );
}
