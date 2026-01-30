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
  MapPin,
  CheckCircle2,
  PieChart as PieChartIcon
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
import { arSA } from "date-fns/locale";
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

export default function AxionReports() {
  const { selectedProjectId, selectedProjectName, isAllProjects } = useSelectedProjectContext();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: null,
    workerId: "all"
  });

  const { data: workersList = [] } = useQuery({
    queryKey: ["/api/workers"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("/api/workers", "GET");
      // Handle different response formats safely
      let workersData = [];
      if (res && typeof res === 'object') {
        if (res.success && Array.isArray(res.data)) {
          workersData = res.data;
        } else if (Array.isArray(res)) {
          workersData = res;
        }
      }
      
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        return workersData.filter((w: any) => w.projectId === selectedProjectId);
      }
      return workersData;
    }
  });

  const filterConfig: FilterConfig[] = [
    {
      key: "dateRange",
      label: "الفترة الزمنية",
      type: "date-range",
    },
    {
      key: "workerId",
      label: "العامل",
      type: "select",
      showSearch: true,
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
    queryKey: ["/api/reports/worker-statement", selectedWorkerId, selectedProjectId, filterValues.dateRange],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const params = new URLSearchParams();
      params.append("workerId", selectedWorkerId);
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        params.append("projectId", selectedProjectId);
      }
      
      if (filterValues.dateRange?.from) {
        params.append("dateFrom", format(new Date(filterValues.dateRange.from), 'yyyy-MM-dd'));
      }
      if (filterValues.dateRange?.to) {
        params.append("dateTo", format(new Date(filterValues.dateRange.to), 'yyyy-MM-dd'));
      }
      
      const res = await apiRequest(`/api/reports/worker-statement?${params.toString()}`, "GET");
      return res.data;
    },
    enabled: !!selectedWorkerId
  });

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/reports/dashboard-kpis", selectedProjectId, filterValues.dateRange],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("projectId", selectedProjectId || 'all');
      
      if (filterValues.dateRange?.from) {
        params.append("dateFrom", format(new Date(filterValues.dateRange.from), 'yyyy-MM-dd'));
      }
      if (filterValues.dateRange?.to) {
        params.append("dateTo", format(new Date(filterValues.dateRange.to), 'yyyy-MM-dd'));
      }

      const res = await apiRequest(`/api/reports/dashboard-kpis?${params.toString()}`, "GET");
      return res.data;
    }
  });

  const exportToAxionExcel = async () => {
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
      description: "يتم الآن إنشاء الملف المحاسبي المطابق للنماذج...",
    });

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('كشف حساب');
      worksheet.views = [{ rightToLeft: true }];

      // Define standard styles matching images
      const mainHeaderFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0369a1' } }; // Sky 700
      const subHeaderFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f1f5f9' } }; // Slate 100
      const summaryFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10b981' } }; // Emerald 500
      const whiteFont = { color: { argb: 'FFFFFF' }, bold: true, name: 'Arial', size: 11 };
      const darkFont = { color: { argb: '0f172a' }, bold: true, name: 'Arial', size: 10 };
      const centerAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };
      const borderStyle: any = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };

      if (selectedWorkerId && workerStatement) {
        // Detailed Worker Statement matching IMAGE format
        const worker = workersList.find((w: any) => w.id === selectedWorkerId);
        
        // --- Company Header ---
        worksheet.mergeCells('A1:L1');
        const companyCell = worksheet.getCell('A1');
        companyCell.value = 'شركة الفتيني للمقاولات والاستشارات الهندسية';
        companyCell.font = { ...darkFont, size: 16, color: { argb: '0369a1' } };
        companyCell.alignment = centerAlign;
        
        worksheet.mergeCells('A2:L2');
        worksheet.getCell('A2').value = 'كشف حساب تفصيلي للعمال';
        worksheet.getCell('A2').font = { ...darkFont, size: 14 };
        worksheet.getCell('A2').alignment = centerAlign;

        worksheet.mergeCells('A3:L3');
        const dateRangeStr = filterValues.dateRange?.from ? 
          `للفترة: من ${format(new Date(filterValues.dateRange.from), 'yyyy/MM/dd')} إلى ${filterValues.dateRange?.to ? format(new Date(filterValues.dateRange.to), 'yyyy/MM/dd') : format(new Date(), 'yyyy/MM/dd')}` : 
          'الفترة: الكل';
        worksheet.getCell('A3').value = dateRangeStr;
        worksheet.getCell('A3').alignment = centerAlign;

        // --- Info Strip ---
        const infoRow = 5;
        worksheet.getRow(infoRow).values = [
          'اسم العامل:', worker?.name, '', '',
          'المهنة:', worker?.role || 'عامل', '', '',
          'إجمالي أيام العمل:', workerStatement?.summary?.totalDays || 0, '', '',
          'رقم الهاتف:', worker?.phone || '-'
        ];
        worksheet.getRow(infoRow).font = darkFont;
        worksheet.getRow(infoRow).fill = subHeaderFill;

        // --- Table Headers ---
        const tableHeaderRow = 7;
        worksheet.mergeCells(`A${tableHeaderRow}:L${tableHeaderRow}`);
        worksheet.getCell(`A${tableHeaderRow}`).value = 'كشف حساب تفصيلي للعمال';
        worksheet.getCell(`A${tableHeaderRow}`).fill = mainHeaderFill;
        worksheet.getCell(`A${tableHeaderRow}`).font = whiteFont;
        worksheet.getCell(`A${tableHeaderRow}`).alignment = centerAlign;

        const headerLabelsRow = tableHeaderRow + 1;
        worksheet.getRow(headerLabelsRow).values = [
          'م', 'التاريخ', 'اليوم', 'اسم المشروع', 'الأجر اليومي', 'أيام العمل', 'عدد الساعات', 'المبلغ المستحق', 'المبلغ المستلم', 'المتبقي', 'ملاحظات'
        ];
        worksheet.getRow(headerLabelsRow).eachCell(cell => {
          cell.fill = mainHeaderFill;
          cell.font = whiteFont;
          cell.border = borderStyle;
          cell.alignment = centerAlign;
        });

        // --- Data Rows ---
        let currentRow = headerLabelsRow + 1;
        workerStatement.statement.forEach((t: any, idx: number) => {
          const date = new Date(t.date);
          const rowValues = [
            idx + 1,
            format(date, 'yyyy/MM/dd'),
            format(date, 'EEEE', { locale: arSA }),
            t.projectName || selectedProjectName,
            worker?.dailyWage || 0,
            t.daysCount || 1,
            t.hoursCount || 8,
            parseFloat(t.amount || 0),
            parseFloat(t.paid || 0),
            parseFloat(t.balance || 0),
            t.description || ''
          ];
          const row = worksheet.addRow(rowValues);
          row.eachCell(cell => {
            cell.border = borderStyle;
            cell.alignment = centerAlign;
            if (typeof cell.value === 'number') cell.numFmt = '#,##0';
          });
          currentRow++;
        });

        // --- Totals Row ---
        const totalRow = worksheet.addRow([
          'الإجمالي', '', '', '', '', 
          workerStatement.summary.totalDays || 0,
          workerStatement.summary.totalHours || 0,
          parseFloat(workerStatement.summary.totalEarned || 0),
          parseFloat(workerStatement.summary.totalPaid || 0),
          parseFloat(workerStatement.summary.finalBalance || 0),
          ''
        ]);
        totalRow.eachCell(cell => {
          cell.fill = summaryFill;
          cell.font = whiteFont;
          cell.border = borderStyle;
          cell.alignment = centerAlign;
        });

        // --- Final Summary Box ---
        const summaryStartRow = currentRow + 3;
        worksheet.mergeCells(`A${summaryStartRow}:L${summaryStartRow}`);
        worksheet.getCell(`A${summaryStartRow}`).value = 'الملخص النهائي';
        worksheet.getCell(`A${summaryStartRow}`).font = { ...darkFont, size: 12 };
        worksheet.getCell(`A${summaryStartRow}`).alignment = centerAlign;
        worksheet.getCell(`A${summaryStartRow}`).fill = subHeaderFill;

        const summaryDataRow = summaryStartRow + 1;
        worksheet.getRow(summaryDataRow).values = [
          'إجمالي المبلغ المستحق:', formatCurrency(workerStatement.summary.totalEarned), '',
          'إجمالي المبلغ المستلم:', formatCurrency(workerStatement.summary.totalPaid), '',
          'إجمالي المبالغ المتبقية:', formatCurrency(workerStatement.summary.finalBalance), '',
          '', '', ''
        ];
        worksheet.getRow(summaryDataRow).font = darkFont;
        worksheet.getRow(summaryDataRow).alignment = centerAlign;

      } else {
        // Daily Report Export matching IMAGE format
        worksheet.addRow(['كشف المصروفات اليومية - سيتم دعمه لاحقاً بناءً على بيانات اليوم الواحد']);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `كشف_حساب_${workerSearch || selectedProjectName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
        {/* Header Section matching visual style */}
        <div className="text-center space-y-2 mb-8 border-b pb-6">
          <h1 className="text-2xl font-black text-slate-800">شركة الفتيني للمقاولات والاستشارات الهندسية</h1>
          <h2 className="text-lg font-bold text-slate-500">نظام التقارير المحاسبية والميدانية</h2>
        </div>

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
            setFilterValues({ dateRange: null, workerId: "all" });
            setSelectedWorkerId(null);
          }}
          actions={[
            {
              key: "export",
              label: "تصدير (Excel) مطابق للصور",
              icon: Download,
              onClick: exportToAxionExcel,
              variant: "default"
            }
          ]}
        />

        {selectedWorkerId && workerStatement ? (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
            {/* Worker Identity Strip */}
            <div className="bg-white border rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4 items-center shadow-sm">
              <div className="flex flex-col items-center border-l last:border-l-0">
                <span className="text-xs font-bold text-slate-400">اسم العامل</span>
                <span className="text-sm md:text-lg font-black text-slate-700">{workersList.find(w => w.id === selectedWorkerId)?.name || 'غير محدد'}</span>
              </div>
              <div className="flex flex-col items-center border-l last:border-l-0">
                <span className="text-xs font-bold text-slate-400">المهنة</span>
                <span className="text-sm md:text-lg font-black text-slate-700">{workersList.find(w => w.id === selectedWorkerId)?.role || 'عامل'}</span>
              </div>
              <div className="flex flex-col items-center border-l last:border-l-0">
                <span className="text-xs font-bold text-slate-400">إجمالي أيام العمل</span>
                <span className="text-sm md:text-lg font-black text-slate-700">{workerStatement?.summary?.totalDays || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400">رقم الهاتف</span>
                <span className="text-sm md:text-lg font-black text-slate-700">{workersList.find(w => w.id === selectedWorkerId)?.phone || '-'}</span>
              </div>
            </div>

            {/* Financial Summary Box matching image format */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <Wallet className="h-40 w-40" />
              </div>
              <h3 className="text-center text-xl font-black mb-8 border-b border-white/10 pb-4">الملخص المالي النهائي</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center space-y-1">
                  <p className="text-slate-400 text-xs font-bold">إجمالي المستحق</p>
                  <p className="text-2xl font-black text-blue-400">{formatCurrency(workerStatement.summary.totalEarned)}</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-slate-400 text-xs font-bold">إجمالي المستلم</p>
                  <p className="text-2xl font-black text-red-400">{formatCurrency(workerStatement.summary.totalPaid)}</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-slate-400 text-xs font-bold">إجمالي المحول</p>
                  <p className="text-2xl font-black text-orange-400">{formatCurrency(workerStatement.summary.totalTransferred || 0)}</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-slate-400 text-xs font-bold">الرصيد المتبقي</p>
                  <p className="text-2xl font-black text-emerald-400">{formatCurrency(workerStatement.summary.finalBalance)}</p>
                </div>
              </div>
            </div>

            {/* Statement Table matching image structure */}
            <div className="bg-white rounded-3xl border shadow-xl overflow-hidden">
              <div className="bg-sky-700 p-4 text-center">
                <h3 className="text-white font-black">كشف حساب تفصيلي للعمال</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-black text-slate-600 border-b">
                      <th className="p-4 border-l">م</th>
                      <th className="p-4 border-l">التاريخ</th>
                      <th className="p-4 border-l">اليوم</th>
                      <th className="p-4 border-l">اسم المشروع</th>
                      <th className="p-4 border-l">الأجر اليومي</th>
                      <th className="p-4 border-l">أيام العمل</th>
                      <th className="p-4 border-l">المبلغ المستحق</th>
                      <th className="p-4 border-l">المبلغ المستلم</th>
                      <th className="p-4 border-l">المتبقي</th>
                      <th className="p-4">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workerStatement.statement.map((row: any, i: number) => (
                      <tr key={i} className="text-xs font-bold border-b hover:bg-slate-50 transition-colors">
                        <td className="p-4 border-l text-center">{i + 1}</td>
                        <td className="p-4 border-l">{format(new Date(row.date), 'yyyy/MM/dd')}</td>
                        <td className="p-4 border-l">{format(new Date(row.date), 'EEEE', { locale: arSA })}</td>
                        <td className="p-4 border-l">{row.projectName || selectedProjectName}</td>
                        <td className="p-4 border-l">{formatCurrency(row.dailyWage || 0)}</td>
                        <td className="p-4 border-l text-center">{row.daysCount || 1}</td>
                        <td className="p-4 border-l text-blue-600">{formatCurrency(row.amount)}</td>
                        <td className="p-4 border-l text-red-600">{formatCurrency(row.paid)}</td>
                        <td className="p-4 border-l font-black text-emerald-600">{formatCurrency(row.balance)}</td>
                        <td className="p-4 text-slate-400">{row.description}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-500 text-white">
                    <tr className="font-black text-sm">
                      <td colSpan={5} className="p-4 border-l text-center">الإجماليـــــــــات</td>
                      <td className="p-4 border-l text-center">{workerStatement.summary.totalDays}</td>
                      <td className="p-4 border-l">{formatCurrency(workerStatement.summary.totalEarned)}</td>
                      <td className="p-4 border-l">{formatCurrency(workerStatement.summary.totalPaid)}</td>
                      <td className="p-4 border-l">{formatCurrency(workerStatement.summary.finalBalance)}</td>
                      <td className="p-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000">
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

            <UnifiedCard title="هيكل التكاليف" titleIcon={PieChartIcon}>
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
        )}
      </div>
    </div>
  );
}
