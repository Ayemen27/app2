
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Cpu, HardDrive } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AdminMonitoring() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["/api/health-monitor"],
  });

  if (isLoading) return <div>جاري التحميل...</div>;

  const metrics = [
    { title: "حالة النظام", value: health?.systemHealth?.status || "Unknown", icon: Activity, color: "text-green-500" },
    { title: "استهلاك الذاكرة", value: health?.performanceMetrics?.memoryUsage?.heapUsed || "0MB", icon: Cpu, color: "text-blue-500" },
    { title: "زمن الاستجابة", value: health?.healthMetrics?.averageLatency || "0ms", icon: AlertTriangle, color: "text-yellow-500" },
    { title: "قاعدة البيانات", value: health?.databaseConnections?.healthy ? "Healthy" : "Error", icon: HardDrive, color: "text-purple-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">نظام مراقبة الأداء (Monitoring)</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>زمن استجابة الطلبات (Latency History)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[{ time: '00:00', latency: 45 }, { time: '04:00', latency: 52 }, { time: '08:00', latency: 48 }, { time: '12:00', latency: 61 }, { time: '16:00', latency: 55 }, { time: '20:00', latency: 49 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="latency" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
