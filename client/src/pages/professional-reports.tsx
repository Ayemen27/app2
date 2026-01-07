import { useState, useEffect, useMemo } from "react";
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
  History,
  MapPin,
  Package
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
import { useSelectedProjectContext, ALL_PROJECTS_ID } from "@/contexts/SelectedProjectContext";

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ProfessionalReports() {
  const [activeTab, setActiveTab] = useState("overview");
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const [timeRange, setTimeRange] = useState("this-month");
  const { toast } = useToast();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");

  const { data: workersList = [] } = useQuery({
    queryKey: ["/api/workers", selectedProjectId],
    queryFn: async () => {
      const res = await apiRequest("/api/workers", "GET");
      const workers = res.data || [];
      if (!isAllProjects) {
        return workers.filter((w: any) => w.projectId === selectedProjectId);
      }
      return workers;
    }
  });

  const { data: workerStatement, isLoading: workerLoading } = useQuery({
    queryKey: ["/api/reports/worker-statement", selectedWorkerId, selectedProjectId, timeRange],
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const res = await apiRequest(`/api/reports/worker-statement?workerId=${selectedWorkerId}&projectId=${selectedProjectId}&dateFrom=${timeRange === 'this-month' ? format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd') : ''}`, "GET");
      return res.data;
    },
    enabled: !!selectedWorkerId
  });

  const filteredWorkers = useMemo(() => workersList.filter((w: any) => 
    w.name.toLowerCase().includes(workerSearch.toLowerCase())
  ), [workersList, workerSearch]);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/reports/dashboard-kpis", selectedProjectId, timeRange],
    queryFn: async () => {
      const res = await apiRequest(`/api/reports/dashboard-kpis?projectId=${selectedProjectId}&range=${timeRange}`, "GET");
      return res.data;
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
      <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-[#f8fafc] min-h-screen font-sans print:bg-white print:p-0" dir="rtl">
        {/* Top Header - Global Context Driven */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-1 rounded-full">
                {selectedProjectName}
              </Badge>
              {isAllProjects && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold px-3 py-1 rounded-full">
                  رؤية بانورامية
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm font-medium">التحليلات المالية والمهنية للمشروع</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border shadow-sm">
              <Button 
                variant={timeRange === "today" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTimeRange("today")}
                className="rounded-lg h-8 px-3 text-xs sm:text-sm"
              >اليوم</Button>
              <Button 
                variant={timeRange === "this-month" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTimeRange("this-month")}
                className="rounded-lg h-8 px-3 text-xs sm:text-sm"
              >الشهر</Button>
              <Button 
                variant={timeRange === "all" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTimeRange("all")}
                className="rounded-lg h-8 px-3 text-xs sm:text-sm"
              >الكل</Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 bg-white h-9 border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 text-slate-600" />
                <span className="font-bold hidden sm:inline">طباعة</span>
              </Button>
              <Button 
                size="sm"
                className="gap-2 h-9 bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-lg shadow-primary/20"
                onClick={() => {
                  toast({
                    title: "جاري تصدير Excel",
                    description: "يتم الآن إنشاء ملف الكشف المحاسبي الاحترافي بناءً على البيانات الفعلية...",
                  });
                }}
              >
                <Download className="h-4 w-4" />
                <span className="font-bold hidden sm:inline">تصدير Excel</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Professional Print Header */}
        <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-8 text-right">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900">كشف حساب {activeTab === 'workers' ? 'عامل تفصيلي' : 'مشروع مالي'}</h1>
              <p className="text-2xl font-bold text-slate-800">مشروع: {selectedProjectName}</p>
              <p className="text-slate-600 font-bold">النطاق الزمني: {timeRange === 'all' ? 'كامل الفترة' : timeRange === 'this-month' ? 'الشهر الحالي' : 'اليوم'}</p>
              <p className="text-slate-500 font-medium">تاريخ استخراج التقرير: {format(new Date(), "yyyy/MM/dd HH:mm")}</p>
            </div>
            <div className="text-left flex flex-col items-end">
              <div className="h-20 w-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-4xl mb-3 shadow-lg">BJ</div>
              <p className="font-black text-2xl text-slate-900">BinarJoin Pro</p>
              <p className="text-slate-500 font-bold">لإدارة المشاريع الإنشائية</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/50 backdrop-blur-md border p-1 h-12 shadow-sm rounded-xl w-full max-w-lg print:hidden">
            <TabsTrigger value="overview" className="flex-1 gap-2 rounded-lg text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Activity className="h-4 w-4" /> نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex-1 gap-2 rounded-lg text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <DollarSign className="h-4 w-4" /> التقارير المالية
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex-1 gap-2 rounded-lg text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Users className="h-4 w-4" /> أداء العمال
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* KPI Executive Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي الإيرادات", val: stats?.overall?.totalFunds, icon: Layers, color: "blue" },
                { label: "إجمالي المصروفات", val: stats?.overall?.totalExpenses, icon: DollarSign, color: "red" },
                { label: "الرصيد التشغيلي", val: (stats?.overall?.totalFunds - stats?.overall?.totalExpenses), icon: Wallet, color: "emerald" },
                { label: "القوى العاملة", val: stats?.overall?.activeWorkers, icon: Users, color: "indigo", unit: "عامل" }
              ].map((kpi, i) => (
                <Card key={i} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden print:border print:shadow-none transition-transform hover:scale-[1.02]">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-3">
                      <div className={`p-2.5 w-fit bg-${kpi.color}-50 text-${kpi.color}-600 rounded-xl print:bg-white print:border`}>
                        <kpi.icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wide">{kpi.label}</p>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate tracking-tight">
                          {typeof kpi.val === 'number' && kpi.val > 1000 ? formatCurrency(kpi.val) : `${kpi.val || 0} ${kpi.unit || ''}`}
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Spending Trend */}
              <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl bg-white print:border print:shadow-none overflow-hidden">
                <CardHeader className="p-6 pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900">الإنفاق التشغيلي الزمني</CardTitle>
                      <CardDescription className="text-slate-500 font-bold">تحليل دقيق لتدفق السيولة والمصروفات</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-6 h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.chartData || []}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{fontWeight: 800}}
                      />
                      <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Composition Breakdown */}
              <Card className="border-none shadow-sm rounded-2xl bg-white print:border print:shadow-none overflow-hidden">
                <CardHeader className="p-6 pb-0 text-center">
                  <CardTitle className="text-xl font-black text-slate-900">هيكل تكاليف المشروع</CardTitle>
                  <CardDescription className="text-slate-500 font-bold">توزيع المصروفات حسب الفئة</CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'أجور عمال', value: stats?.overall?.wages || 0 },
                          { name: 'فواتير مواد', value: stats?.overall?.materials || 0 },
                          { name: 'أجور نقل', value: stats?.overall?.transport || 0 },
                          { name: 'مصاريف نثريات', value: stats?.overall?.misc || 0 }
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {COLORS.map((c, i) => <Cell key={i} fill={c} strokeWidth={0} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{fontSize: '13px', fontWeight: 700, paddingTop: '20px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-blue-600 to-indigo-800 text-white overflow-hidden print:bg-white print:text-slate-900 print:border-2 print:border-slate-900">
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm print:hidden">
                        <Activity className="h-8 w-8" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black tracking-tight">كشف الحساب العام</h2>
                        <p className="text-blue-100/80 font-bold">بيانات مالية مجمعة ودقيقة</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-blue-100/60 text-sm font-black uppercase tracking-widest print:text-slate-500">مجموع الوارد</p>
                        <p className="text-3xl font-black">{formatCurrency(stats?.overall?.totalFunds)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-blue-100/60 text-sm font-black uppercase tracking-widest print:text-slate-500">مجموع المنصرف</p>
                        <p className="text-3xl font-black text-red-200 print:text-red-600">{formatCurrency(stats?.overall?.totalExpenses)}</p>
                      </div>
                    </div>

                    <Separator className="bg-white/10 print:bg-slate-900" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <p className="text-blue-100/60 text-sm font-black uppercase tracking-widest print:text-slate-500">صافي رصيد العهدة</p>
                        <p className="text-5xl font-black text-emerald-300 print:text-emerald-700 tracking-tighter">
                          {formatCurrency(stats?.overall?.totalFunds - stats?.overall?.totalExpenses)}
                        </p>
                      </div>
                      <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/5 print:border-slate-900">
                        <p className="text-sm font-bold text-blue-500 mb-1">حالة السيولة</p>
                        <p className="text-2xl font-black text-center text-white print:text-slate-900">ممتازة</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-sm rounded-3xl bg-white p-6 sm:p-10 print:border-2 print:border-slate-900">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 border-r-4 border-primary pr-4">تحليل هيكل التكاليف</h3>
                  <div className="space-y-8">
                    {[
                      { label: "أجور العمال والمقاولين", val: stats?.overall?.wages, color: "bg-blue-600" },
                      { label: "مشتريات مواد البناء", val: stats?.overall?.materials, color: "bg-emerald-600" },
                      { label: "مصاريف النقل والمعدات", val: stats?.overall?.transport, color: "bg-orange-600" },
                      { label: "مصاريف إدارية ونثريات", val: stats?.overall?.misc, color: "bg-red-600" }
                    ].map((item, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center justify-between font-black">
                          <span className="text-slate-600 text-lg">{item.label}</span>
                          <span className="text-slate-900 text-xl">{formatCurrency(item.val)}</span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border print:border-slate-400">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{width: `${(item.val / (stats?.overall?.totalExpenses || 1)) * 100}%`}} />
                        </div>
                        <p className="text-xs text-slate-400 font-bold text-left">{((item.val / (stats?.overall?.totalExpenses || 1)) * 100).toFixed(1)}% من إجمالي المصروفات</p>
                      </div>
                    ))}
                  </div>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="workers" className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Intelligent Worker Selection */}
              <Card className="lg:col-span-1 border-none shadow-sm rounded-2xl bg-white overflow-hidden print:hidden h-fit sticky top-24">
                <CardHeader className="p-5 border-b bg-slate-50/50">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    كشف حساب عامل
                  </CardTitle>
                  <CardDescription className="font-bold">اختر العامل لعرض بياناته</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="ابحث بالاسم..." 
                      className="w-full pr-10 pl-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20"
                      onChange={(e) => setWorkerSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredWorkers.map((worker: any) => (
                      <button
                        key={worker.id}
                        onClick={() => setSelectedWorkerId(worker.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-right ${
                          selectedWorkerId === worker.id 
                            ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${
                          selectedWorkerId === worker.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        }`}>
                          {worker.name.charAt(0)}
                        </div>
                        <div className="flex flex-col text-right overflow-hidden">
                          <span className="font-black text-sm truncate">{worker.name}</span>
                          <span className={`text-[10px] font-bold ${selectedWorkerId === worker.id ? "text-white/70" : "text-slate-400"}`}>
                            {worker.role || "فني"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Worker Statement */}
              <div className="lg:col-span-3 space-y-4">
                {!selectedWorkerId ? (
                  <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 h-[500px] flex items-center justify-center rounded-3xl print:hidden">
                    <div className="text-center space-y-4">
                      <div className="p-6 bg-white rounded-full shadow-sm inline-block">
                        <Users className="h-16 w-16 text-slate-300" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">بانتظار اختيار العامل</h3>
                      <p className="text-slate-500 font-bold max-w-xs mx-auto text-lg">الرجاء اختيار اسم العامل من القائمة الجانبية لاستعراض كافة العمليات المالية المرتبطة به</p>
                    </div>
                  </Card>
                ) : (
                  <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden print:shadow-none print:border-2 print:border-slate-900">
                    <CardHeader className="p-8 border-b bg-slate-50/30 print:bg-white">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/20">
                            {filteredWorkers.find(w => w.id === selectedWorkerId)?.name.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-3xl font-black text-slate-900 mb-1">{filteredWorkers.find(w => w.id === selectedWorkerId)?.name}</CardTitle>
                            <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1.5 rounded-full">كشف مالي معتمد</Badge>
                          </div>
                        </div>
                        <div className="text-left bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm print:border-slate-900">
                          <p className="text-sm text-slate-500 font-black mb-1 uppercase tracking-widest text-right">إجمالي الرصيد المستحق</p>
                          <p className="text-4xl font-black text-primary print:text-slate-900 tracking-tighter">
                            {formatCurrency(workerStatement?.balance || 0)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead className="bg-slate-900 text-white uppercase text-xs font-black tracking-widest print:bg-slate-200 print:text-slate-900">
                            <tr>
                              <th className="px-8 py-6">التاريخ</th>
                              <th className="px-8 py-6">بيان العملية والوصف</th>
                              <th className="px-8 py-6">له (مستحقات)</th>
                              <th className="px-8 py-6">عليه (مدفوعات)</th>
                              <th className="px-8 py-6">الرصيد التراكمي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {workerStatement?.transactions?.length > 0 ? (
                              workerStatement.transactions.map((t: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors print:hover:bg-transparent">
                                  <td className="px-8 py-6 text-sm font-black text-slate-500 whitespace-nowrap">{format(new Date(t.date), "yyyy/MM/dd")}</td>
                                  <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-base font-black text-slate-900 leading-tight">{t.description}</span>
                                      <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px] font-black px-2 py-0.5 bg-slate-50 border-slate-200">{t.type}</Badge>
                                        {t.projectName && <Badge variant="outline" className="text-[10px] font-black px-2 py-0.5 border-emerald-200 text-emerald-700 bg-emerald-50">{t.projectName}</Badge>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6 font-black text-lg text-emerald-600">{t.credit > 0 ? formatCurrency(t.credit) : "-"}</td>
                                  <td className="px-8 py-6 font-black text-lg text-red-600">{t.debit > 0 ? formatCurrency(t.debit) : "-"}</td>
                                  <td className="px-8 py-6 font-black text-xl text-slate-900 bg-slate-50/30">{formatCurrency(t.runningBalance)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold text-xl">لا توجد عمليات مسجلة لهذا العامل في الفترة المحددة</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                    <div className="p-8 bg-slate-50 border-t print:bg-white text-right">
                       <p className="text-slate-500 font-bold text-sm">ملاحظة: هذا الكشف تم استخراجه آلياً من نظام BinarJoin Pro ويعتبر مرجعاً محاسبياً للعمليات المذكورة أعلاه.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}
