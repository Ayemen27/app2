import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Clock, 
  Users, 
  Activity,
  Download,
  FileText,
  Printer,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Wallet,
  History,
  Package,
  TrendingDown,
  CreditCard,
  Truck,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  AreaChart,
  Area
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useSelectedProjectContext, ALL_PROJECTS_ID } from "@/contexts/SelectedProjectContext";
import { saveAs } from "file-saver";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedCard } from "@/components/ui/unified-card";

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { FilterConfig } from "@/components/ui/unified-filter-dashboard/types";

export default function ProfessionalReports() {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    timeRange: "this-month",
    workerId: "all"
  });

  const { data: workersList = [] } = useQuery({
    queryKey: ["/api/workers"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("/api/workers", "GET");
      const workers = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        return workers.filter((w: any) => w.projectId === selectedProjectId);
      }
      return workers;
    }
  });

  const filterConfig: FilterConfig[] = [
    {
      key: "timeRange",
      label: "الفترة الزمنية",
      type: "select",
      options: [
        { label: "اليوم", value: "today" },
        { label: "الشهر الحالي", value: "this-month" },
        { label: "الكل", value: "all" },
      ]
    },
    {
      key: "workerId",
      label: "العامل",
      type: "select",
      options: [
        { label: "جميع العمال", value: "all" },
        ...workersList.map((w: any) => ({
          label: w.name,
          value: w.id
        }))
      ]
    }
  ];

  const onFilterChange = (key: string, val: any) => {
    setFilterValues(prev => ({ ...prev, [key]: val }));
    if (key === "workerId") {
      setSelectedWorkerId(val === "all" ? null : val);
    }
  };

  const { data: workerStatement, isLoading: workerLoading } = useQuery({
    queryKey: ["/api/reports/worker-statement", selectedWorkerId, selectedProjectId, filterValues.timeRange],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const params = new URLSearchParams();
      params.append("workerId", selectedWorkerId);
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        params.append("projectId", selectedProjectId);
      }
      if (filterValues.timeRange === 'this-month') {
        params.append("dateFrom", format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
      }
      
      const res = await apiRequest(`/api/reports/worker-statement?${params.toString()}`, "GET");
      return res.data;
    },
    enabled: !!selectedWorkerId
  });

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/reports/dashboard-kpis", selectedProjectId, filterValues.timeRange],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const url = `/api/reports/dashboard-kpis?projectId=${selectedProjectId || 'all'}&range=${filterValues.timeRange}`;
      const res = await apiRequest(url, "GET");
      return res.data;
    }
  });

  const exportToProfessionalExcel = async () => {
    if (selectedWorkerId && !workerStatement) {
      toast({
        title: "تنبيه",
        description: "الرجاء انتظار تحميل بيانات العامل أولاً",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "جاري تصدير Excel",
      description: "يتم الآن إنشاء الملف...",
    });

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('تقرير');
      worksheet.views = [{ rightToLeft: true }];

      // Basic styling and export logic... (Keeping it simple for now)
      worksheet.addRow(['تقرير التقارير الاحترافية']);
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `تقرير_${selectedProjectName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    } catch (error) {
      console.error("Excel Export Error:", error);
      toast({ title: "خطأ في التصدير", description: "حدث خطأ أثناء محاولة تصدير الملف.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50/30">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-slate-500 font-medium animate-pulse text-lg">جاري التجهيز...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in pb-40" dir="rtl">
      <div className="p-4 space-y-6 bg-slate-50/50 min-h-screen">
        <UnifiedStats
          stats={[
            { title: "إجمالي الوارد", value: stats?.overall?.totalFunds || 0, icon: TrendingUp, color: "blue", formatter: formatCurrency },
            { title: "إجمالي المنصرف", value: stats?.overall?.totalExpenses || 0, icon: TrendingDown, color: "red", formatter: formatCurrency },
            { title: "الرصيد التشغيلي", value: (stats?.overall?.totalFunds - stats?.overall?.totalExpenses) || 0, icon: Wallet, color: "green", formatter: formatCurrency },
            { title: "القوى العاملة", value: String(stats?.overall?.activeWorkers || 0), icon: Users, color: "purple" },
            { title: "المواد", value: String(stats?.overall?.materialsCount || 0), icon: Package, color: "orange" },
            { title: "الآبار", value: String(stats?.overall?.wellsCount || 0), icon: MapPin, color: "cyan" },
          ]}
          columns={3}
          hideHeader={true}
        />

        <UnifiedFilterDashboard
          filters={filterConfig}
          filterValues={filterValues}
          onFilterChange={onFilterChange}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="البحث..."
          isRefreshing={isLoading}
          onRefresh={refetch}
          onReset={() => {
            setSearchValue("");
            setFilterValues({ timeRange: "this-month", workerId: "all" });
            setSelectedWorkerId(null);
          }}
          actions={[
            {
              key: "export",
              label: "تصدير ذكي",
              icon: Download,
              onClick: exportToProfessionalExcel,
              variant: "default"
            }
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <UnifiedCard title="الإنفاق الزمني" titleIcon={TrendingUp} className="lg:col-span-2">
            <div className="h-[350px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.chartData || []}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke="#2563eb" fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </UnifiedCard>

          <UnifiedCard title="هيكل التكاليف" titleIcon={PieChart}>
            <div className="h-[350px] w-full mt-6">
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
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </UnifiedCard>
        </div>

        {selectedWorkerId && workerStatement && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-blue-50/50 border-blue-100">
                <p className="text-sm font-bold text-blue-600">المستحقات</p>
                <p className="text-3xl font-black text-blue-700">{formatCurrency(workerStatement.summary.totalEarned)}</p>
              </Card>
              <Card className="p-6 bg-red-50/50 border-red-100">
                <p className="text-sm font-bold text-red-600">المدفوعات</p>
                <p className="text-3xl font-black text-red-700">{formatCurrency(workerStatement.summary.totalPaid)}</p>
              </Card>
              <Card className="p-6 bg-green-50/50 border-green-100">
                <p className="text-sm font-bold text-green-600">الرصيد</p>
                <p className="text-3xl font-black text-green-700">{formatCurrency(workerStatement.summary.finalBalance)}</p>
              </Card>
            </div>

            <UnifiedCard title="سجل الحركات" titleIcon={History}>
              <ScrollArea className="h-[400px] w-full mt-4">
                <div className="space-y-2">
                  {workerStatement.statement.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${t.amount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                          {t.amount > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{t.description}</p>
                          <p className="text-xs text-slate-400">{t.date}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-black ${t.amount > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {t.amount > 0 ? `+${t.amount}` : `-${t.paid}`}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">الرصيد: {t.balance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </UnifiedCard>
          </div>
        )}
      </div>
    </div>
  );
}
