import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Users, 
  GitCompare, 
  Activity,
  Download,
  FileText,
  Printer,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Briefcase
} from "lucide-react";
import { LayoutShell } from "@/components/layout/layout-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ProfessionalReports() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/reports/dashboard-kpis"],
    queryFn: async () => {
      const res = await apiRequest("/api/reports/dashboard-kpis", "GET");
      return res.data;
    }
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(val);

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen" dir="rtl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">نظام التقارير الموحد</h1>
            <p className="text-slate-500 mt-1">تحليلات ذكية وشاملة لأداء المشاريع والعمال</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 bg-white">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Download className="h-4 w-4" />
              تصدير التقارير
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border p-1 h-12 shadow-sm rounded-xl">
            <TabsTrigger value="overview" className="gap-2 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Activity className="h-4 w-4" /> نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <DollarSign className="h-4 w-4" /> التقارير المالية
            </TabsTrigger>
            <TabsTrigger value="workers" className="gap-2 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="h-4 w-4" /> أداء العمال
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <GitCompare className="h-4 w-4" /> مقارنة المشاريع
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">المشاريع النشطة</p>
                      <h3 className="text-2xl font-bold mt-1">{stats?.overall?.activeProjects || 0}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Briefcase className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
                    <TrendingUp className="h-3 w-3 ml-1" />
                    <span>+12% من الشهر الماضي</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">القوى العاملة</p>
                      <h3 className="text-2xl font-bold mt-1">{stats?.overall?.activeWorkers || 0}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-slate-500">
                    <span>{stats?.month?.activeDays || 0} أيام عمل نشطة هذا الشهر</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">إجمالي المصاريف</p>
                      <h3 className="text-xl font-bold mt-1">{formatCurrency(stats?.month?.wages + stats?.month?.materials || 0)}</h3>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                      <DollarSign className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-red-600 font-medium">
                    <span>{formatCurrency(stats?.month?.materials || 0)} مواد</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">كفاءة العمل</p>
                      <h3 className="text-2xl font-bold mt-1">94%</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
                    <span>تحسن بنسبة 5%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b">
                  <CardTitle className="text-lg">توزيع التكاليف الشهرية</CardTitle>
                </CardHeader>
                <CardContent className="p-6 h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'أجور عمال', value: stats?.month?.wages || 0 },
                          { name: 'مواد بناء', value: stats?.month?.materials || 0 },
                          { name: 'مصاريف أخرى', value: 50000 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b">
                  <CardTitle className="text-lg">تطور حجم العمل</CardTitle>
                </CardHeader>
                <CardContent className="p-6 h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: 'الأسبوع 1', value: 400 },
                        { name: 'الأسبوع 2', value: 300 },
                        { name: 'الأسبوع 3', value: 600 },
                        { name: 'الأسبوع 4', value: 800 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="text-center py-20 bg-white rounded-2xl border-2 border-dashed">
            <DollarSign className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">تقارير مالية تفصيلية قريباً</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">نعمل على معالجة البيانات المالية لتقديم كشوفات حساب دقيقة للمقاولين والموردين</p>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}
