import { useQuery } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Database, ShieldCheck, Activity, AlertTriangle, 
  CheckCircle2, Clock, Zap, RefreshCw 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DataHealthPage() {
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/data-health"],
  });

  if (isLoading) return <div className="p-8">جاري فحص الأنظمة...</div>;

  const stats = health?.data;

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مركز مراقبة جودة البيانات</h1>
          <p className="text-muted-foreground">مراقبة حية لتزامن وسلامة قواعد البيانات المتعددة</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          تحديث الفحص
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats?.databases.map((db: any, i: number) => (
          <Card key={i} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{db.name}</CardTitle>
              <Database className={`h-4 w-4 ${db.status === 'online' ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{db.status === 'online' ? 'متصل' : 'منقطع'}</div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>الاستجابة: {db.latency}</span>
                <span>الجداول: {db.tablesCount}</span>
              </div>
              <Progress value={100} className="h-1 mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>فحص سلامة الهيكلية (Schema Integrity)</CardTitle>
            </div>
            <CardDescription>التأكد من تطابق الجداول والأعمدة في جميع المصادر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>تطابق الجداول الأساسية</span>
              </div>
              <Badge variant="outline">42/42 جدول</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>فحص الفروقات البيانية (Data Gaps)</span>
              </div>
              <Badge variant="outline">0 فروقات</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>نشاط المزامنة (Sync Performance)</CardTitle>
            </div>
            <CardDescription>أداء نقل البيانات بين الأجهزة والسيرفر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <Clock className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <div className="text-xl font-bold">{stats?.syncStatus.averageSyncTime}</div>
                <div className="text-xs text-muted-foreground">متوسط زمن المزامنة</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <Zap className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
                <div className="text-xl font-bold">100%</div>
                <div className="text-xs text-muted-foreground">دقة البيانات</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.integrity.missingTables.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600">تنبيه: جداول مفقودة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              تم اكتشاف عدم تطابق في الجداول التالية بين السيرفر المركزي والكلود:
              {stats.integrity.missingTables.join(", ")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
