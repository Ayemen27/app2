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
  const { selectedProjectId, selectedProjectName, ALL_PROJECTS_ID, isAllProjects } = useSelectedProjectContext();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    timeRange: "this-month"
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
    }
  ];

  const { data: workersList = [], isLoading: workersLoading } = useQuery({
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
    if (activeTab === 'workers' && !workerStatement) {
      toast({
        title: "تنبيه",
        description: "الرجاء اختيار عامل أولاً لعرض وتصدير كشف الحساب",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "جاري تصدير Excel",
      description: "يتم الآن إنشاء ملف الكشف المحاسبي الاحترافي...",
    });

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('كشف حساب');
      worksheet.views = [{ rightToLeft: true }];

      // Define standard styles
      const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a8a' } }; // Deep Navy
      const subHeaderFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f1f5f9' } }; // Slate 100
      const whiteFont = { color: { argb: 'FFFFFF' }, bold: true, name: 'Arial', size: 12 };
      const darkFont = { color: { argb: '0f172a' }, bold: true, name: 'Arial', size: 11 };
      const centerAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };
      const borderStyle: any = {
        top: { style: 'thin', color: { argb: 'cbd5e1' } },
        left: { style: 'thin', color: { argb: 'cbd5e1' } },
        bottom: { style: 'thin', color: { argb: 'cbd5e1' } },
        right: { style: 'thin', color: { argb: 'cbd5e1' } }
      };

      if (activeTab === 'daily') {
        // Daily Report Export matching IMAGE format
        worksheet.mergeCells('A1:I1');
        const mainTitle = worksheet.getCell('A1');
        mainTitle.value = 'كشف المصروفات اليومية التفصيلي والشامل';
        mainTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a8a' } };
        mainTitle.font = { ...whiteFont, size: 16 };
        mainTitle.alignment = centerAlign;
        worksheet.getRow(1).height = 35;

        worksheet.mergeCells('A2:D2');
        worksheet.getCell('A2').value = `المشروع: ${selectedProjectName}`;
        worksheet.mergeCells('E2:I2');
        worksheet.getCell('E2').value = `التاريخ: ${format(new Date(), 'yyyy/MM/dd')}`;
        worksheet.getRow(2).font = darkFont;

        // Trust & Incomes Table
        const trustRow = 4;
        worksheet.mergeCells(`A${trustRow}:I${trustRow}`);
        worksheet.getCell(`A${trustRow}`).value = 'جدول العهدة والواردات';
        worksheet.getCell(`A${trustRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'cbd5e1' } };
        worksheet.getCell(`A${trustRow}`).font = darkFont;
        worksheet.getCell(`A${trustRow}`).alignment = centerAlign;

        const trustHeader = trustRow + 1;
        worksheet.getRow(trustHeader).values = ['رقم', 'المبلغ (ر.ي)', 'اسم المرسل', 'رقم الحوالة', 'نوع التحويل', 'التاريخ', 'ملاحظات', '', ''];
        worksheet.getRow(trustHeader).eachCell(cell => {
           cell.border = borderStyle;
           cell.font = darkFont;
           cell.alignment = centerAlign;
        });

        // Detail Expenses Table
        const expRow = trustHeader + 4;
        worksheet.mergeCells(`A${expRow}:I${expRow}`);
        const expTitle = worksheet.getCell(`A${expRow}`);
        expTitle.value = 'جدول المصروفات التفصيلي';
        expTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ef4444' } };
        expTitle.font = whiteFont;
        expTitle.alignment = centerAlign;

        const expHeader = expRow + 1;
        worksheet.getRow(expHeader).values = ['رقم', 'المبلغ (ر.ي)', 'اسم العامل/المادة', 'المهنة/النوع', 'الوصف', 'المورد', 'الكمية', 'تاريخ الصرف', 'ملاحظات'];
        worksheet.getRow(expHeader).eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
          cell.font = whiteFont;
          cell.border = borderStyle;
        });

        // Financial Summary at the end
        const finalRow = expHeader + 10;
        worksheet.mergeCells(`A${finalRow}:I${finalRow}`);
        worksheet.getCell(`A${finalRow}`).value = 'الملخص المالي الشامل والنهائي';
        worksheet.getCell(`A${finalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'cbd5e1' } };
        worksheet.getCell(`A${finalRow}`).font = darkFont;

      } else if (activeTab === 'workers' && workerStatement) {
        const worker = workersList.find((w: any) => w.id === selectedWorkerId);
        
        // --- Header Section ---
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `كشف حساب تفصيلي: ${worker?.name || 'غير معروف'}`;
        titleCell.fill = headerFill;
        titleCell.font = { ...whiteFont, size: 16 };
        titleCell.alignment = centerAlign;
        worksheet.getRow(1).height = 45;

        worksheet.mergeCells('A2:B2');
        worksheet.getCell('A2').value = `المشروع: ${selectedProjectName}`;
        worksheet.getCell('A2').font = darkFont;
        
        worksheet.mergeCells('C2:E2');
        worksheet.getCell('C2').value = `تاريخ التصدير: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;
        worksheet.getCell('C2').alignment = { horizontal: 'left' };

        // --- Summary Box ---
        const summaryRow = 4;
        worksheet.getCell(`A${summaryRow}`).value = 'إجمالي المستحقات';
        worksheet.getCell(`B${summaryRow}`).value = 'إجمالي المدفوعات';
        worksheet.getCell(`C${summaryRow}`).value = 'الرصيد المتبقي';
        
        [1, 2, 3].forEach(col => {
          const cell = worksheet.getRow(summaryRow).getCell(col);
          cell.fill = subHeaderFill;
          cell.font = darkFont;
          cell.alignment = centerAlign;
          cell.border = borderStyle;
        });

        const dataSummaryRow = 5;
        worksheet.getCell(`A${dataSummaryRow}`).value = workerStatement.summary.totalEarned;
        worksheet.getCell(`B${dataSummaryRow}`).value = workerStatement.summary.totalPaid;
        worksheet.getCell(`C${dataSummaryRow}`).value = workerStatement.summary.balance;
        
        [1, 2, 3].forEach(col => {
          const cell = worksheet.getRow(dataSummaryRow).getCell(col);
          cell.numFmt = '#,##0.00 "SAR"';
          cell.font = { bold: true };
          cell.alignment = centerAlign;
          cell.border = borderStyle;
        });

        // --- Transactions Table ---
        const tableHeaderRow = 7;
        worksheet.getRow(tableHeaderRow).values = ['التاريخ', 'البيان', 'نوع الحركة', 'المبلغ', 'الرصيد التراكمي'];
        worksheet.getRow(tableHeaderRow).eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
          cell.font = whiteFont;
          cell.alignment = centerAlign;
          cell.border = borderStyle;
        });

        let currentBalance = 0;
        const rows = workerStatement.transactions.map((t: any) => {
          const isCredit = t.type === 'attendance';
          const amount = parseFloat(t.amount || 0);
          currentBalance += isCredit ? amount : -amount;
          return [
            format(new Date(t.date), 'yyyy-MM-dd'),
            t.description || (isCredit ? 'حضور يومي' : 'دفعة مالية'),
            isCredit ? 'مستحق (له)' : 'صرف (عليه)',
            amount,
            currentBalance
          ];
        });
        worksheet.addRows(rows);

        // Styling the data rows
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > tableHeaderRow) {
            row.eachCell((cell, colNumber) => {
              cell.border = borderStyle;
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              if (colNumber >= 4) cell.numFmt = '#,##0.00';
            });
          }
        });

        worksheet.getColumn(1).width = 15;
        worksheet.getColumn(2).width = 35;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 15;
        worksheet.getColumn(5).width = 18;

      } else {
        // Professional Dashboard Export
        worksheet.mergeCells('A1:C1');
        worksheet.getCell('A1').value = `تقرير الأداء المالي: ${selectedProjectName}`;
        worksheet.getCell('A1').fill = headerFill;
        worksheet.getCell('A1').font = whiteFont;
        worksheet.getCell('A1').alignment = centerAlign;
        
        worksheet.getRow(3).values = ['التاريخ', 'إجمالي المنصرف اليومي', 'ملاحظات'];
        worksheet.getRow(3).eachCell(cell => {
          cell.fill = subHeaderFill;
          cell.font = darkFont;
          cell.border = borderStyle;
        });

        const rows = stats?.chartData?.map((row: any) => [
          row.date,
          row.total,
          ''
        ]) || [];
        worksheet.addRows(rows);
        
        worksheet.getColumn(1).width = 20;
        worksheet.getColumn(2).width = 25;
        worksheet.getColumn(3).width = 30;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `تقرير_${selectedProjectName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    } catch (error) {
      console.error("Excel Export Error:", error);
      toast({ title: "خطأ في التصدير", description: "حدث خطأ أثناء محاولة تصدير الملف بشكل احترافي.", variant: "destructive" });
    }
  };

  const filteredWorkers = useMemo(() => workersList.filter((w: any) => 
    w.name.toLowerCase().includes(workerSearch.toLowerCase())
  ), [workersList, workerSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50/30">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-slate-500 font-medium animate-pulse text-lg">جاري تجهيز التقارير الذكية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in pb-40" dir="rtl">
      <div className="p-4 space-y-6 bg-slate-50/50 min-h-screen">
        {/* Executive KPIs - UnifiedStats */}
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
          onFilterChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="البحث في التقارير..."
          isRefreshing={isLoading}
          onRefresh={refetch}
          onReset={() => {
            setSearchValue("");
            setFilterValues({ timeRange: "this-month" });
          }}
          actions={[
            {
              key: "print",
              label: "طباعة",
              icon: Printer,
              onClick: () => window.print(),
              variant: "outline"
            },
            {
              key: "export",
              label: "تصدير ذكي",
              icon: Download,
              onClick: exportToProfessionalExcel,
              variant: "default"
            }
          ]}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center sm:justify-start overflow-x-auto pb-1 print:hidden">
            <TabsList className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-200/50 p-1 border border-slate-200">
              <TabsTrigger 
                value="overview" 
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md"
              >
                <Activity className="h-4 w-4" /> 
                <span className="whitespace-nowrap">نظرة بانورامية</span>
              </TabsTrigger>
              <TabsTrigger 
                value="daily" 
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md"
              >
                <Clock className="h-4 w-4" /> 
                <span className="whitespace-nowrap">التقارير اليومية</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md"
              >
                <DollarSign className="h-4 w-4" /> 
                <span className="whitespace-nowrap">التحليل المالي</span>
              </TabsTrigger>
              <TabsTrigger 
                value="workers" 
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md"
              >
                <UserCheck className="h-4 w-4" /> 
                <span className="whitespace-nowrap">كشوفات العمال</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <UnifiedCard title="الإنفاق التشغيلي الزمني" titleIcon={TrendingUp} className="lg:col-span-2">
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
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', background: '#fff'}} />
                      <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </UnifiedCard>

              <UnifiedCard title="هيكل تكاليف المشروع" titleIcon={PieChart} className="flex flex-col">
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
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={6}
                        dataKey="value"
                        animationBegin={200}
                        animationDuration={1500}
                      >
                        {COLORS.map((c, i) => <Cell key={i} fill={c} strokeWidth={0} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 700, paddingTop: '20px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </UnifiedCard>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-2">
            <UnifiedCard title="معاينة التقرير اليومي الشامل" titleIcon={Clock}>
              <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-4">
                <div className="p-6 bg-slate-50 rounded-full">
                  <FileText className="h-12 w-12 text-slate-300" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-slate-600">كشف المصروفات اليومية</h3>
                  <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto">سيتم تصدير التقرير بتنسيق مطابق للنماذج المعتمدة (جداول العهدة، المصروفات التفصيلية، والملخص المالي)</p>
                </div>
                <Button 
                  onClick={exportToProfessionalExcel}
                  className="rounded-xl font-black gap-2 h-11 px-8"
                >
                  <Download className="h-5 w-5" />
                  تصدير التقرير اليومي (Excel)
                </Button>
              </div>
            </UnifiedCard>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-xl rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent)] pointer-events-none" />
                <div className="p-10 space-y-10 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-blue-500/20 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                      <CreditCard className="h-7 w-7 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">مركز الثقل المالي</h3>
                      <p className="text-slate-400 font-bold text-sm">تحليل تدفقات السيولة الحالية</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-2">
                      <p className="text-slate-500 text-xs font-black uppercase tracking-widest">إجمالي التوريدات</p>
                      <p className="text-3xl font-black text-blue-400">{formatCurrency(stats?.overall?.totalFunds)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-slate-500 text-xs font-black uppercase tracking-widest">إجمالي المصروفات</p>
                      <p className="text-3xl font-black text-rose-400">{formatCurrency(stats?.overall?.totalExpenses)}</p>
                    </div>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between bg-white/5 p-8 rounded-[1.5rem] border border-white/5">
                    <div className="space-y-2">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">الصافي المتبقي في العهدة</p>
                      <p className="text-5xl font-black text-emerald-400 tracking-tighter">{formatCurrency(stats?.overall?.totalFunds - stats?.overall?.totalExpenses)}</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-20 w-20 rounded-full border-[6px] border-emerald-500/20 border-t-emerald-500 flex items-center justify-center">
                        <span className="text-emerald-400 font-black text-sm">100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <UnifiedCard title="تفكيك هيكل التكاليف" titleIcon={BarChart3}>
                <div className="space-y-7 mt-8 px-4 pb-4">
                  {[
                    { label: "أجور العمال والمقاولين", val: stats?.overall?.wages, color: "bg-blue-500", icon: Users },
                    { label: "توريدات ومشتريات المواد", val: stats?.overall?.materials, color: "bg-emerald-500", icon: Package },
                    { label: "النقل واللوجستيات", val: stats?.overall?.transport, color: "bg-amber-500", icon: Truck },
                    { label: "المصاريف النثرية والإدارية", val: stats?.overall?.misc, color: "bg-purple-500", icon: FileText }
                  ].map((item, i) => (
                    <div key={i} className="group cursor-default">
                      <div className="flex items-center gap-5 mb-3">
                        <div className={`p-2.5 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-all`}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-end mb-2">
                            <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                            <span className="font-black text-slate-900">{formatCurrency(item.val || 0)}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${item.color} transition-all duration-1500 ease-out rounded-full`} 
                              style={{ width: `${Math.min(100, (item.val / (stats?.overall?.totalExpenses || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </UnifiedCard>
            </div>
          </TabsContent>

          <TabsContent value="workers" className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-2">
            <UnifiedCard title="إدارة حسابات القوى العاملة" titleIcon={Users}>
              <div className="flex flex-col gap-8 mt-6">
                <div className="w-full space-y-5">
                  <div className="relative group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="ابحث باسم العامل أو التخصص..." 
                      className="pr-12 h-12 border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                      value={workerSearch}
                      onChange={(e) => setWorkerSearch(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-[250px] rounded-2xl border border-slate-100 bg-white p-3 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredWorkers.map((worker: any) => (
                        <button
                          key={worker.id}
                          onClick={() => setSelectedWorkerId(worker.id)}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                            selectedWorkerId === worker.id 
                            ? "bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]" 
                            : "hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
                          }`}
                        >
                          <div className="flex items-center gap-4 text-right">
                            <div className={`p-2 rounded-lg ${selectedWorkerId === worker.id ? "bg-white/10" : "bg-slate-100"}`}>
                              <User className="h-5 w-5" />
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black truncate max-w-[140px]">{worker.name}</p>
                              <p className={`text-[10px] font-bold ${selectedWorkerId === worker.id ? "text-slate-400" : "text-slate-500"}`}>{worker.type}</p>
                            </div>
                          </div>
                          {selectedWorkerId === worker.id ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 opacity-30" />}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="w-full">
                  {workerLoading ? (
                    <div className="h-[500px] flex flex-col items-center justify-center gap-4 text-slate-400">
                      <RefreshCw className="h-12 w-12 animate-spin text-primary opacity-25" />
                      <p className="text-sm font-black tracking-tight">جاري سحب كشف الحساب...</p>
                    </div>
                  ) : selectedWorkerId && workerStatement ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                              <FileText className="h-7 w-7" />
                            </div>
                            <div>
                              <h4 className="font-black text-xl text-slate-900">كشف حساب: {workersList.find((w: any) => w.id === selectedWorkerId)?.name}</h4>
                              <p className="text-xs font-bold text-slate-400">تحليل مالي مفصل للعمليات</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 px-4 py-1.5 rounded-full font-black text-xs">
                            {filterValues.timeRange === 'all' ? 'الأرشيف الكامل' : 'بيانات الشهر الحالي'}
                          </Badge>
                          <div className="flex gap-2 print:hidden">
                            <Button
                              variant={filterValues.timeRange === 'this-month' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setFilterValues(prev => ({ ...prev, timeRange: 'this-month' }))}
                              className="rounded-xl font-bold h-8"
                            >
                              الشهر الحالي
                            </Button>
                            <Button
                              variant={filterValues.timeRange === 'all' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setFilterValues(prev => ({ ...prev, timeRange: 'all' }))}
                              className="rounded-xl font-bold h-8"
                            >
                              كامل الفترة
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="bg-emerald-50/50 p-6 rounded-[1.5rem] border border-emerald-100/50 group hover:bg-emerald-50 transition-colors">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">إجمالي مستحقات العمل</p>
                            <p className="text-3xl font-black text-emerald-700 tracking-tighter">{formatCurrency(workerStatement.summary.totalEarned)}</p>
                          </div>
                          <div className="bg-blue-50/50 p-6 rounded-[1.5rem] border border-blue-100/50 group hover:bg-blue-50 transition-colors">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">إجمالي السلف والدفعات</p>
                            <p className="text-3xl font-black text-blue-700 tracking-tighter">{formatCurrency(workerStatement.summary.totalPaid)}</p>
                          </div>
                        </div>

                        <div className="bg-slate-900 text-white p-8 rounded-[1.5rem] flex items-center justify-between shadow-2xl shadow-slate-300 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                          <div className="relative z-10">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">صافي الرصيد المستحق</p>
                            <p className="text-4xl font-black tracking-tighter">{formatCurrency(workerStatement.summary.balance)}</p>
                          </div>
                          <div className={`relative z-10 p-4 rounded-2xl ${workerStatement.summary.balance > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"} backdrop-blur-md border border-white/5`}>
                            {workerStatement.summary.balance > 0 ? <TrendingUp className="h-8 w-8" /> : <TrendingDown className="h-8 w-8" />}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                              <History className="h-4 w-4 text-primary" /> سجل آخر 5 عمليات
                            </p>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black text-primary hover:bg-primary/5 rounded-lg">عرض السجل الكامل</Button>
                          </div>
                          <div className="space-y-2">
                            {workerStatement.transactions.slice(0, 5).map((t: any, i: number) => (
                              <div key={i} className="group bg-slate-50/50 hover:bg-white px-5 py-4 rounded-2xl border border-transparent hover:border-slate-100 hover:shadow-sm flex items-center justify-between transition-all">
                                <div className="flex items-center gap-4">
                                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${t.type === 'attendance' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {t.type === 'attendance' ? <Activity className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-800 text-sm">{t.description || (t.type === 'attendance' ? 'إثبات حضور يومي' : 'دفعة مالية محولة')}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{format(new Date(t.date), 'yyyy/MM/dd')}</p>
                                  </div>
                                </div>
                                <span className={`text-base font-black ${t.type === 'attendance' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                  {t.type === 'attendance' ? '+' : '-'}{formatCurrency(t.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[500px] flex flex-col items-center justify-center gap-6 text-slate-300 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-100 p-10">
                      <div className="p-8 bg-white rounded-full shadow-lg shadow-slate-100">
                        <Users className="h-16 w-16 text-slate-100" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-slate-400 tracking-tight">قاعدة بيانات العمال</h3>
                        <p className="text-sm font-bold text-slate-300 max-w-[280px]">اختر عاملاً من القائمة الجانبية لعرض وتصدير كشف الحساب التحليلي</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </UnifiedCard>
          </TabsContent>
        </Tabs>

        {/* Footer - Professional Branding */}
        <div className="pt-12 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-400 px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg">BJ</div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-slate-900">BinarJoin Pro <span className="text-primary">Intelligence</span></span>
              <span className="text-[10px] font-bold text-slate-400">نظام إدارة الموارد المتطور v2.0</span>
            </div>
          </div>
          <p className="text-[10px] font-bold bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
            © {new Date().getFullYear()} جميع الحقوق محفوظة - تم التصميم بمعايير عالمية
          </p>
        </div>
      </div>
    </div>
  );
}
