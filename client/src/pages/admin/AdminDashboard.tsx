import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Smartphone, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  ShieldAlert,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

// Mock Data for UI/UX demonstration (as per strict realistic protocol)
const MOCK_STATS = [
  { title: "الأجهزة المتصلة", value: "1,284", icon: Smartphone, color: "text-blue-600", description: "أجهزة نشطة حالياً" },
  { title: "معدل الانهيارات", value: "0.42%", icon: ShieldAlert, color: "text-red-600", description: "آخر 24 ساعة" },
  { title: "متوسط الاستجابة", value: "185ms", icon: Activity, color: "text-green-600", description: "استجابة API" },
  { title: "تنبيهات نشطة", value: "12", icon: AlertTriangle, color: "text-orange-600", description: "تحتاج لمراجعة" },
];

const MOCK_CRASHES = [
  { id: 1, device: "Samsung S21", type: "NullPointerException", severity: "critical", time: new Date() },
  { id: 2, device: "Pixel 6", type: "TimeoutException", severity: "warning", time: new Date(Date.now() - 3600000) },
  { id: 3, device: "Huawei P40", type: "OutOfMemoryError", severity: "critical", time: new Date(Date.now() - 7200000) },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">لوحة مراقبة النظام</h1>
          <p className="text-muted-foreground">مراقبة أداء الأجهزة والانهيارات في الوقت الفعلي.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Clock className="ml-2 h-4 w-4" />
            تحديث تلقائي
          </Button>
          <Button size="sm">تصدير التقارير</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {MOCK_STATS.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Crashes Table */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>آخر الانهيارات (Crashes)</CardTitle>
            <CardDescription>عرض تفصيلي لأحدث المشاكل التقنية المسجلة.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الجهاز</TableHead>
                  <TableHead className="text-right">نوع الخطأ</TableHead>
                  <TableHead className="text-right">الخطورة</TableHead>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_CRASHES.map((crash) => (
                  <TableRow key={crash.id}>
                    <TableCell className="font-medium">{crash.device}</TableCell>
                    <TableCell className="font-mono text-xs">{crash.type}</TableCell>
                    <TableCell>
                      <Badge variant={crash.severity === "critical" ? "destructive" : "outline"} className="capitalize">
                        {crash.severity === "critical" ? "حرج" : "تحذير"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(crash.time, "HH:mm", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Health / Metrics Summary */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>صحة النظام</CardTitle>
            <CardDescription>توزيع الأداء عبر الأقاليم.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>تغطية الاختبارات</span>
                <span className="font-medium">94%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[94%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>استقرار الـ Backend</span>
                <span className="font-medium">99.9%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-600 w-[99.9%]" />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>جميع الأنظمة تعمل بكفاءة عالية.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
