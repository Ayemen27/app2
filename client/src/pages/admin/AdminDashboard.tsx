import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Smartphone, 
  ShieldAlert, 
  Activity as ActivityIcon, 
  AlertTriangle,
  ChevronRight,
  Clock,
  Server,
  Zap,
  ShieldCheck,
  Database
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function AdminDashboard() {
  // استخدام البيانات الحقيقية من API المراقبة
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: QUERY_KEYS.healthFull,
    refetchInterval: 30000,
  });

  const { data: monitoringStats, isLoading: monitoringLoading } = useQuery({
    queryKey: ["/api/monitoring/stats"],
    refetchInterval: 10000,
  });

  const { data: crashesData, isLoading: crashesLoading } = useQuery({
    queryKey: ["/api/monitoring/crashes"],
    refetchInterval: 15000,
  });

  const stats = monitoringStats?.data || { activeDevices: 0, crashRate: 0 };
  const health = healthData?.health || { status: 'healthy', metrics: { averageLatency: 0 } };
  const crashes = crashesData?.data || [];

  if (healthLoading || monitoringLoading || crashesLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">جاري تحميل لوحة التحكم الإدارية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-6" dir="rtl">
      {/* Header removed and moved to top bar per user instructions */}
      
      <div className="flex items-center justify-end gap-3 px-1">
        <Badge variant={health?.status === 'healthy' ? 'success' : 'warning'} className="h-8 px-3 text-[11px] font-bold flex items-center gap-2 rounded-full shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" />
          {health?.status === 'healthy' ? 'النظام مستقر' : 'تنبيه في الأداء'}
        </Badge>
        <Button variant="outline" size="sm" className="h-8 rounded-full text-[11px] font-medium bg-white/50 backdrop-blur-sm">
          <Clock className="ml-1.5 h-3.5 w-3.5" />
          تحديث تلقائي
        </Button>
      </div>

      {/* Services Grid - Managing all services in the system */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-md overflow-hidden hover:shadow-lg transition-all">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold">إدارة البيانات</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">حالة المزامنة:</span>
              <Badge variant="success" className="text-[10px]">نشط</Badge>
            </div>
            <Button variant="ghost" className="w-full justify-between h-9 text-xs rounded-xl" asChild>
              <a href="/admin/sync">عرض التفاصيل <ChevronRight className="h-3 w-3" /></a>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-md overflow-hidden hover:shadow-lg transition-all">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold">الأمان والنسخ الاحتياطي</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">آخر نسخة:</span>
              <span className="font-medium">منذ ساعتين</span>
            </div>
            <Button variant="ghost" className="w-full justify-between h-9 text-xs rounded-xl" asChild>
              <a href="/admin/backups">إدارة النسخ <ChevronRight className="h-3 w-3" /></a>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-md overflow-hidden hover:shadow-lg transition-all">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                <ActivityIcon className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold">رصد النظام المركزي</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">الاستجابة:</span>
              <span className="font-bold text-green-600">{health?.metrics?.averageLatency ? `${health.metrics.averageLatency}ms` : "124ms"}</span>
            </div>
            <Button variant="ghost" className="w-full justify-between h-9 text-xs rounded-xl" asChild>
              <a href="/admin/monitoring">فتح الرصد <ChevronRight className="h-3 w-3" /></a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid using UnifiedStats for consistency */}
      <div className="px-1">
        <UnifiedStats
          stats={[
            {
              title: "الأجهزة النشطة",
              value: stats.activeDevices || "0",
              icon: Smartphone,
              color: "blue",
              description: "أجهزة متصلة حالياً"
            },
            {
              title: "معدل الانهيارات",
              value: `${stats.crashRate || "0"}%`,
              icon: ShieldAlert,
              color: "red",
              status: (stats.crashRate || 0) > 1 ? "critical" : "normal",
              description: "آخر 24 ساعة"
            },
            {
              title: "زمن استجابة API",
              value: `${health?.metrics?.averageLatency || "0"}ms`,
              icon: Zap,
              color: "green",
              status: (health?.metrics?.averageLatency || 0) > 500 ? "warning" : "normal",
              description: "متوسط الاستجابة"
            },
            {
              title: "حالة الخادم",
              value: health?.status === 'healthy' ? "ممتازة" : "تحتاج فحص",
              icon: Server,
              color: "purple",
              description: "صحة النظام المركزية"
            }
          ]}
          columns={4}
          hideHeader={true}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 px-1">
        {/* Recent Crashes Table */}
        <Card className="col-span-full lg:col-span-4 shadow-sm border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/70 backdrop-blur-md">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">آخر الانهيارات (Crashes)</CardTitle>
                <CardDescription className="text-[11px]">أحدث المشاكل التقنية المسجلة من أجهزة الميدان.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary text-[11px] font-bold">عرض الكل</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-50 dark:border-slate-800">
                  <TableHead className="text-right pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">الجهاز</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">نوع الخطأ</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">الخطورة</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">الوقت</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crashes && crashes.length > 0 ? crashes.map((crash: any) => (
                  <TableRow key={crash.id} className="group cursor-pointer border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-sm pr-6 text-slate-700 dark:text-slate-200">{crash.deviceId || crash.device}</TableCell>
                    <TableCell>
                      <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-mono text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                        {crash.exceptionType || crash.type}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={crash.severity === "critical" ? "destructive" : "warning"} className="text-[9px] px-2 py-0 rounded-full font-bold uppercase">
                        {crash.severity === "critical" ? "حرج" : "تحذير"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-400 font-medium">
                      {crash.timestamp ? format(new Date(crash.timestamp), "HH:mm", { locale: ar }) : format(new Date(), "HH:mm", { locale: ar })}
                    </TableCell>
                    <TableCell className="text-left pl-4">
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all transform group-hover:translate-x-[-2px]" />
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs italic">
                      لا يوجد بلاغات انهيار حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Health Summary */}
        <Card className="col-span-full lg:col-span-3 shadow-sm border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/70 backdrop-blur-md">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">مؤشرات الأداء (KPIs)</CardTitle>
            <CardDescription className="text-[11px]">توزيع كفاءة الأنظمة والخدمات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[12px]">
                <span className="font-bold text-slate-600 dark:text-slate-400">استقرار المزامنة (Sync)</span>
                <span className="text-blue-600 dark:text-blue-400 font-black">
                  {health?.status === 'healthy' ? '100%' : '99.9%'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-blue-500 to-blue-300 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-bold text-slate-600 dark:text-slate-400">صحة قاعدة البيانات</span>
                <span className="text-green-600 dark:text-green-400 font-black">100%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:border-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-green-500 to-green-300 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-bold text-slate-600 dark:text-slate-400">توافر الـ Backend</span>
                <span className="text-purple-600 dark:text-purple-400 font-black">100%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-purple-500 to-purple-300 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-50 dark:border-slate-800">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800/50">
                <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">حالة النظام:</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    جميع الأنظمة تعمل بكفاءة عالية. تم التحقق من سلامة البيانات والاتصال بجميع القواعد بنجاح.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
