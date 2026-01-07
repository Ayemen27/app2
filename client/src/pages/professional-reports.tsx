import { useState, useEffect } from "react";
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
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  ChevronDown,
  LayoutDashboard,
  UserCheck,
  Wallet,
  History
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
import { formatCurrency } from "@/lib/utils";

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ProfessionalReports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProject, setSelectedProject] = useState("all");
  const [timeRange, setTimeRange] = useState("this-month");
  const { toast } = useToast();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");

  const { data: workersList = [] } = useQuery({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      const res = await apiRequest("/api/workers", "GET");
      return res.data || [];
    }
  });

  const { data: workerStatement, isLoading: workerLoading } = useQuery({
    queryKey: ["/api/reports/worker-statement", selectedWorkerId, selectedProject, timeRange],
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const res = await apiRequest(`/api/reports/worker-statement?workerId=${selectedWorkerId}&projectId=${selectedProject}&dateFrom=${timeRange === 'this-month' ? format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd') : ''}`, "GET");
      return res.data;
    },
    enabled: !!selectedWorkerId
  });

  const filteredWorkers = workersList.filter((w: any) => 
    w.name.toLowerCase().includes(workerSearch.toLowerCase())
  );

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/reports/dashboard-kpis", selectedProject, timeRange],
    queryFn: async () => {
      const res = await apiRequest(`/api/reports/dashboard-kpis?projectId=${selectedProject}&range=${timeRange}`, "GET");
      return res.data;
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("/api/projects", "GET");
      return res.data || [];
    }
  });

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-screen bg-slate-50/30">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            <p className="text-slate-500 font-medium animate-pulse text-lg">جاري تجهيز التقارير الذكية...</p>
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="p-4 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen font-sans" dir="rtl">
        {/* Top Header & Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">المركز التحليلي الموحد</h1>
            </div>
            <p className="text-slate-500 text-lg mr-11 font-medium">رؤية شاملة ودقيقة لأداء مشاريعك الإنشائية</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm">
              <Button 
                variant={timeRange === "today" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTimeRange("today")}
                className="rounded-lg h-9 px-4"
              >اليوم</Button>
              <Button 
                variant={timeRange === "this-month" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTimeRange("this-month")}
                className="rounded-lg h-9 px-4"
              >الشهر</Button>
              <Button 
                variant={timeRange === "all" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTimeRange("all")}
                className="rounded-lg h-9 px-4"
              >الكل</Button>
            </div>
            <Separator orientation="vertical" className="h-8 hidden md:block" />
            <Button 
              variant="outline" 
              className="gap-2 bg-white h-11 px-5 border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span className="font-bold">طباعة الكشف</span>
            </Button>
            <Button 
              className="gap-2 h-11 px-6 bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-lg shadow-primary/20"
              onClick={() => {
                toast({
                  title: "جاري تجهيز التقرير",
                  description: "يتم الآن تجميع البيانات وتوليد ملف التصدير الذكي...",
                });
                // سيتم هنا استدعاء وظيفة التصدير الفعلية مستقبلاً
              }}
            >
              <Download className="h-4 w-4" />
              <span className="font-bold text-base">تصدير ذكي</span>
            </Button>
          </div>
        </div>

        {/* Global Filters Bar */}
        <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
          <CardContent className="p-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <div className="bg-slate-100 p-2 rounded-lg">
                <Filter className="h-5 w-5 text-slate-600" />
              </div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-lg font-bold">
                  <SelectValue placeholder="اختر المشروع للتحليل" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-bold py-3">جميع المشاريع النشطة</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id} className="py-3 font-medium">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span>النظام محدث: {format(new Date(), "hh:mm a")}</span>
              </div>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/5" onClick={() => refetch()}>
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/50 backdrop-blur-md border p-1.5 h-14 shadow-sm rounded-2xl w-full max-w-2xl">
            <TabsTrigger value="overview" className="flex-1 gap-3 px-8 rounded-xl text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
              <Activity className="h-5 w-5" /> نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex-1 gap-3 px-8 rounded-xl text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
              <DollarSign className="h-5 w-5" /> التقارير المالية
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex-1 gap-3 px-8 rounded-xl text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
              <Users className="h-5 w-5" /> أداء العمال
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Executive Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "إجمالي العهدة", val: stats?.overall?.totalFunds, icon: Layers, color: "blue", trend: "+15%" },
                { label: "إجمالي المصروفات", val: stats?.overall?.totalExpenses, icon: DollarSign, color: "red", trend: "+8%" },
                { label: "الرصيد التشغيلي", val: (stats?.overall?.totalFunds - stats?.overall?.totalExpenses), icon: TrendingUp, color: "emerald", trend: "مستقر" },
                { label: "القوى العاملة", val: stats?.overall?.activeWorkers, icon: Users, color: "indigo", unit: "عامل", trend: "+3" }
              ].map((kpi, i) => (
                <Card key={i} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group rounded-2xl bg-white overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`h-1 w-full bg-${kpi.color}-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 bg-${kpi.color}-50 text-${kpi.color}-600 rounded-xl group-hover:scale-110 transition-transform`}>
                          <kpi.icon className="h-7 w-7" />
                        </div>
                        <Badge variant="outline" className={`bg-${kpi.color}-50/50 border-${kpi.color}-100 text-${kpi.color}-700 font-bold px-3 py-1 rounded-lg`}>
                          {kpi.trend}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500 font-bold text-sm tracking-wide uppercase">{kpi.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 leading-none">
                          {typeof kpi.val === 'number' && kpi.val > 1000 ? formatCurrency(kpi.val) : `${kpi.val || 0} ${kpi.unit || ''}`}
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Financial Composition Chart */}
              <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-8 pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-black text-slate-900">تحليل الإنفاق الزمني</CardTitle>
                      <CardDescription className="text-slate-500 text-base mt-1 font-medium">توزيع المصاريف على مدار الفترة المحددة</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full"><ChevronDown className="h-6 w-6 text-slate-400" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.chartData || []}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '16px'}}
                        itemStyle={{fontWeight: 700}}
                      />
                      <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expense Distribution Donut */}
              <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-8 pb-0 text-center">
                  <CardTitle className="text-2xl font-black text-slate-900">هيكل المصروفات</CardTitle>
                  <CardDescription className="text-slate-500 font-medium">النسب المئوية لكل فئة إنفاق</CardDescription>
                </CardHeader>
                <CardContent className="p-8 h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'أجور', value: stats?.overall?.wages || 0 },
                          { name: 'مواد', value: stats?.overall?.materials || 0 },
                          { name: 'نقل', value: stats?.overall?.transport || 0 },
                          { name: 'نثريات', value: stats?.overall?.misc || 0 }
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {COLORS.map((c, i) => <Cell key={i} fill={c} strokeWidth={0} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             {/* Extended Financial View */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm rounded-3xl p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Activity className="h-8 w-8" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black">البيان المالي الشامل</h2>
                        <p className="text-blue-100 font-medium opacity-80">تحليل الملاءة المالية للمشاريع</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="text-blue-100/70 text-sm font-bold uppercase tracking-wider">إجمالي الإيرادات</p>
                        <p className="text-3xl font-black">{formatCurrency(stats?.overall?.totalFunds)}</p>
                      </div>
                      <div className="space-y-1 text-left" dir="ltr">
                        <p className="text-blue-100/70 text-sm font-bold uppercase tracking-wider text-right">TOTAL INCOME</p>
                        <ArrowUpRight className="h-6 w-6 text-emerald-400 ml-auto" />
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-blue-100/70 text-sm font-bold uppercase tracking-wider">صافي الربح المتوقع</p>
                        <p className="text-4xl font-black text-emerald-300 tracking-tight">
                          {formatCurrency(stats?.overall?.totalFunds - stats?.overall?.totalExpenses)}
                        </p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/5">
                        <p className="text-sm font-bold text-blue-100 mb-1">نسبة الكفاءة</p>
                        <p className="text-2xl font-black text-center text-white">88.4%</p>
                      </div>
                    </div>
                  </div>
                  {/* Decorative Elements */}
                  <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl" />
                </Card>

                <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900">مقارنة فئات الإنفاق</h3>
                    <Badge className="bg-slate-100 text-slate-600 border-none font-bold py-1.5 px-4 rounded-xl">مفصل</Badge>
                  </div>
                  <div className="space-y-8">
                    {[
                      { label: "أجور العمال", val: stats?.overall?.wages, color: "bg-blue-500", percent: 45 },
                      { label: "مواد البناء", val: stats?.overall?.materials, color: "bg-emerald-500", percent: 30 },
                      { label: "أجور النقل", val: stats?.overall?.transport, color: "bg-orange-500", percent: 15 },
                      { label: "نثريات متنوعة", val: stats?.overall?.misc, color: "bg-red-500", percent: 10 }
                    ].map((item, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-700 text-lg">{item.label}</span>
                          <span className="text-slate-900 text-lg">{formatCurrency(item.val)}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{width: `${item.percent}%`}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="workers" className="space-y-8 animate-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Worker Selection Sidebar */}
              <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden h-fit">
                <CardHeader className="p-6 border-b bg-slate-50/50">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    تحديد العمال
                  </CardTitle>
                  <CardDescription>اختر عاملاً لاستخراج الكشف</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="بحث عن عامل..." 
                      className="w-full pr-10 pl-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                      onChange={(e) => setWorkerSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {filteredWorkers.map((worker: any) => (
                      <button
                        key={worker.id}
                        onClick={() => setSelectedWorkerId(worker.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                          selectedWorkerId === worker.id 
                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            selectedWorkerId === worker.id ? "bg-white/20" : "bg-primary/10 text-primary"
                          }`}>
                            {worker.name.charAt(0)}
                          </div>
                          <span className="font-bold text-sm">{worker.name}</span>
                        </div>
                        {selectedWorkerId === worker.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Worker Statement View */}
              <div className="lg:col-span-3 space-y-6">
                {!selectedWorkerId ? (
                  <Card className="border-dashed border-2 bg-slate-50/50 h-[600px] flex items-center justify-center rounded-3xl">
                    <div className="text-center space-y-4">
                      <div className="p-6 bg-white rounded-full shadow-sm inline-block">
                        <Users className="h-12 w-12 text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900">لم يتم اختيار عامل</h3>
                        <p className="text-slate-500">يرجى اختيار عامل من القائمة الجانبية لعرض كشف الحساب التفصيلي</p>
                      </div>
                    </div>
                  </Card>
                ) : workerLoading ? (
                  <div className="h-[600px] flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Worker Profile Mini Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">إجمالي المستحقات</p>
                        <h4 className="text-2xl font-black text-slate-900">{formatCurrency(workerStatement?.summary?.totalEarned)}</h4>
                      </Card>
                      <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">إجمالي المدفوعات</p>
                        <h4 className="text-2xl font-black text-emerald-600">{formatCurrency(workerStatement?.summary?.totalPaid)}</h4>
                      </Card>
                      <Card className="border-none shadow-sm rounded-2xl bg-primary p-6 text-white">
                        <p className="text-white/70 text-xs font-bold uppercase mb-1">الرصيد المتبقي</p>
                        <h4 className="text-2xl font-black">{formatCurrency(workerStatement?.summary?.finalBalance)}</h4>
                      </Card>
                    </div>

                    {/* Statement Table */}
                    <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden print:shadow-none">
                      <CardHeader className="p-8 border-b flex flex-row items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl font-black text-slate-900">كشف حساب تفصيلي</CardTitle>
                          <CardDescription className="text-base font-medium">بيان الحركات المالية والعمل للعامل: {workerStatement?.worker?.name}</CardDescription>
                        </div>
                        <Button variant="outline" className="rounded-xl font-bold h-11" onClick={() => window.print()}>
                          <Printer className="h-4 w-4 ml-2" />
                          طباعة الكشف
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-black tracking-wider">
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4">البيان</th>
                                <th className="px-6 py-4 text-blue-600">له (عمل)</th>
                                <th className="px-6 py-4 text-emerald-600">عليه (صرف)</th>
                                <th className="px-6 py-4 text-slate-900">الرصيد</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {workerStatement?.statement?.map((row: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-600">{row.date}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-900">{row.description}</span>
                                      <span className="text-xs text-slate-400 font-medium">{row.reference}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 font-black text-blue-600">
                                    {row.amount > 0 ? formatCurrency(row.amount) : "-"}
                                  </td>
                                  <td className="px-6 py-4 font-black text-emerald-600">
                                    {row.paid > 0 ? formatCurrency(row.paid) : "-"}
                                  </td>
                                  <td className="px-6 py-4 font-black text-slate-900">
                                    {formatCurrency(row.balance)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {(!workerStatement?.statement || workerStatement.statement.length === 0) && (
                          <div className="p-12 text-center text-slate-400 font-medium">
                            لا توجد حركات مسجلة لهذا العامل في الفترة المحددة
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}
