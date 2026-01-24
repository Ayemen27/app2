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
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Incident } from "@shared/schema";

export default function Dashboard() {
  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({ 
    queryKey: ["/api/incidents"] 
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({ 
    queryKey: ["/api/metrics/summary"] 
  });

  if (incidentsLoading || summaryLoading) {
    return <div className="p-8 flex items-center justify-center">Loading live telemetry...</div>;
  }

  const mockIncidents = incidents || [];
  const metrics = summary || {
    crashFree: "99.94%",
    coldStart: "1.2s",
    exceptions: 14,
    throughput: "4.2k"
  };
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] text-[#1e293b] dark:text-[#f1f5f9]">
      {/* Global Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-[#0f172a] border-b border-[#e2e8f0] dark:border-[#1e293b] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight text-lg">Android Sentinel</span>
          </div>
          <div className="h-6 w-px bg-[#e2e8f0] dark:bg-[#1e293b]" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <span>Production Fleet</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search traces, users, or logs..." 
              className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            Export Report
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Hero Section */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">System Observability</h1>
            <p className="text-muted-foreground mt-1">Real-time health telemetry across 1.2M active sessions</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            All Systems Operational
          </div>
        </div>

        {/* High-Impact KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Crash-Free Users" 
            value="99.94%" 
            trend="+0.02%" 
            up={true} 
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            description="Target SLA: 99.9%"
          />
          <MetricCard 
            title="Cold Start Time" 
            value="1.2s" 
            trend="-140ms" 
            up={true} 
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
            description="P95 Latency"
          />
          <MetricCard 
            title="Active Exceptions" 
            value="14" 
            trend="+3" 
            up={false} 
            icon={<AlertCircle className="w-5 h-5 text-destructive" />}
            description="Unresolved issues"
          />
          <MetricCard 
            title="Throughput" 
            value="4.2k" 
            trend="+12%" 
            up={true} 
            icon={<Activity className="w-5 h-5 text-blue-500" />}
            description="Requests per second"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Incident Feed */}
          <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-6 px-6">
              <div>
                <CardTitle className="text-xl">Critical Incident Feed</CardTitle>
                <CardDescription>Real-time crash reports and performance regressions</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="px-6">Issue ID</TableHead>
                    <TableHead>Diagnostic Message</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead className="text-right px-6">Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockIncidents.map((incident) => (
                    <TableRow key={incident.id} className="hover:bg-muted/50 cursor-pointer transition-colors group">
                      <TableCell className="px-6 font-mono text-xs text-primary font-bold">
                        {incident.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm line-clamp-1">{incident.title}</span>
                          <span className="text-xs text-muted-foreground italic">{incident.appVersion}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`capitalize text-[10px] px-2 py-0 h-5 font-bold border-none ${
                            incident.severity === 'critical' 
                            ? 'bg-red-500/10 text-red-600' 
                            : incident.severity === 'warning'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-blue-500/10 text-blue-600'
                          }`}
                        >
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{(incident.affectedDevices / 1000).toFixed(1)}k</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${incident.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} 
                              style={{ width: `${Math.min((incident.affectedDevices/5000)*100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground font-medium">
                          <Clock className="w-3 h-3" />
                          {incident.lastSeen}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Side Panels */}
          <div className="space-y-6">
            {/* Version Distribution */}
            <Card className="border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-gradient-to-br from-white to-slate-50 dark:from-[#0f172a] dark:to-[#1e293b]">
              <CardHeader>
                <CardTitle className="text-lg">Fleet Distribution</CardTitle>
                <CardDescription>App adoption by major version</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <VersionBar version="v2.4.1" percentage={65} color="bg-primary" />
                <VersionBar version="v2.4.0" percentage={25} color="bg-blue-400" />
                <VersionBar version="v2.3.9" percentage={8} color="bg-slate-400" />
                <VersionBar version="Others" percentage={2} color="bg-slate-200" />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5">
              <CardHeader>
                <CardTitle className="text-lg">Observation Tools</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <ToolButton icon={<Activity className="w-4 h-4" />} label="Metrics" />
                <ToolButton icon={<Zap className="w-4 h-4" />} label="Traces" />
                <ToolButton icon={<ShieldAlert className="w-4 h-4" />} label="Security" />
                <ToolButton icon={<Smartphone className="w-4 h-4" />} label="Sessions" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, value, trend, up, icon, description }: any) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 hover:ring-primary/20 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted/50">
            {icon}
          </div>
          <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          <div className={`flex items-center text-xs font-bold ${up ? 'text-green-500' : 'text-red-500'}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function VersionBar({ version, percentage, color }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span>{version}</span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ToolButton({ icon, label }: any) {
  return (
    <Button variant="outline" className="h-auto py-3 flex-col gap-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Button>
  );
}
