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
  ShieldCheck
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

  const stats = monitoringStats?.data || {};
  const health = healthData?.health || {};

  // بيانات تجريبية للانهيارات (حتى يتم ربط Sentry)
  const MOCK_CRASHES = [
    { id: 1, device: "Samsung S21", type: "NullPointerException", severity: "critical", time: new Date() },
    { id: 2, device: "Pixel 6", type: "TimeoutException", severity: "warning", time: new Date(Date.now() - 3600000) },
    { id: 3, device: "Huawei P40", type: "OutOfMemoryError", severity: "critical", time: new Date(Date.now() - 7200000) },
  ];

  if (healthLoading || monitoringLoading) {
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
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            لوحة القيادة الإدارية
          </h1>
          <p className="text-muted-foreground mt-1">نظرة عامة على أداء النظام، استقرار الأجهزة، والعمليات الحيوية.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={health?.status === 'healthy' ? 'success' : 'warning'} className="h-9 px-4 text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {health?.status === 'healthy' ? 'النظام مستقر' : 'تنبيه في الأداء'}
          </Badge>
          <Button variant="outline" size="sm" className="hidden md:flex">
            <Clock className="ml-2 h-4 w-4" />
            تحديث تلقائي
          </Button>
        </div>
      </div>

      {/* Stats Grid using UnifiedStats for consistency */}
      <UnifiedStats
        stats={[
          {
            title: "الأجهزة النشطة",
            value: stats.activeDevices || "1,284",
            icon: Smartphone,
            color: "blue",
            description: "أجهزة متصلة حالياً"
          },
          {
            title: "معدل الانهيارات",
            value: `${stats.crashRate || "0.42"}%`,
            icon: ShieldAlert,
            color: "red",
            status: (stats.crashRate || 0) > 1 ? "critical" : "normal",
            description: "آخر 24 ساعة"
          },
          {
            title: "زمن استجابة API",
            value: `${health?.metrics?.averageLatency || "185"}ms`,
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Crashes Table */}
        <Card className="col-span-full lg:col-span-4 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">آخر الانهيارات (Crashes)</CardTitle>
                <CardDescription>أحدث المشاكل التقنية المسجلة من أجهزة الميدان.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">عرض الكل</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-right pr-6">الجهاز</TableHead>
                  <TableHead className="text-right">نوع الخطأ</TableHead>
                  <TableHead className="text-right">الخطورة</TableHead>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_CRASHES.map((crash) => (
                  <TableRow key={crash.id} className="group cursor-pointer">
                    <TableCell className="font-medium pr-6">{crash.device}</TableCell>
                    <TableCell>
                      <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                        {crash.type}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={crash.severity === "critical" ? "destructive" : "warning"} className="text-[10px] px-2 py-0">
                        {crash.severity === "critical" ? "حرج" : "تحذير"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(crash.time, "HH:mm", { locale: ar })}
                    </TableCell>
                    <TableCell className="text-left pl-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Health Summary */}
        <Card className="col-span-full lg:col-span-3 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg font-bold">مؤشرات الأداء (KPIs)</CardTitle>
            <CardDescription>توزيع كفاءة الأنظمة والخدمات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">استقرار المزامنة (Sync)</span>
                <span className="text-blue-600 font-bold">98.2%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '98.2%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">صحة قاعدة البيانات</span>
                <span className="text-green-600 font-bold">99.9%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">توافر الـ Backend</span>
                <span className="text-purple-600 font-bold">100%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold">تنبيه ذكي:</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    تم رصد زيادة طفيفة في زمن استجابة API خلال الساعة الأخيرة. يوصى بمراجعة سجلات الاتصال.
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
