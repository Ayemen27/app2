import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, CheckCircle, Info, Activity } from "lucide-react";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { apiRequest } from "@/lib/queryClient";

interface Anomaly {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

interface AnalysisResult {
  status: "healthy" | "degraded" | "critical";
  anomalies: Anomaly[];
  score: number;
  timestamp: string;
}

export default function AnalysisDashboard() {
  const { data: analysis, isLoading } = useQuery<AnalysisResult>({
    queryKey: ["/api/brain/analyze"],
    queryFn: async () => {
      const res = await apiRequest("/api/brain/analyze", "GET");
      return res;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingCard />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-500";
      case "degraded": return "text-yellow-500";
      case "critical": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive">حرج</Badge>;
      case "warning": return <Badge variant="warning">تحذير</Badge>;
      default: return <Badge variant="secondary">معلومات</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          تحليل الذكاء الاصطناعي (Brain)
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">حالة النظام:</span>
          <span className={`font-bold capitalize ${getStatusColor(analysis?.status || "")}`}>
            {analysis?.status === "healthy" ? "سليم" : analysis?.status === "degraded" ? "متراجع" : "حرج"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مؤشر الصحة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(100 - (analysis?.score || 0))}%</div>
            <p className="text-xs text-muted-foreground">سلامة النظام الإجمالية</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            التنبيهات المكتشفة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis?.anomalies && analysis.anomalies.length > 0 ? (
            <div className="space-y-4">
              {analysis.anomalies.map((anomaly) => (
                <div key={anomaly.id} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="mt-1">
                    {anomaly.severity === "critical" ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold capitalize">{anomaly.type}</span>
                      {getSeverityBadge(anomaly.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground">{anomaly.message}</p>
                    <span className="text-xs text-muted-foreground mt-2 block">
                      {new Date(anomaly.timestamp).toLocaleString("ar-YE")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p>لم يتم اكتشاف أي مشاكل. النظام يعمل بسلاسة.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
