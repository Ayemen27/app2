/**
 * صفحة التقارير الاحترافية
 * Professional Reports Dashboard
 * نظام تقارير متكامل يضاهي المنصات العالمية
 */

import './professional-reports.print.css';
import React, { useState, useMemo, useCallback } from "react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from "recharts";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  BarChart3,
  PieChartIcon,
  Activity,
  Target,
  Wallet,
  Truck,
  FileText,
  Filter,
  Settings,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  GitCompare
} from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { LayoutShell } from "@/components/layout/layout-shell";
import { 
  exportDailyReportToExcel, 
  exportPeriodicReportToExcel, 
  exportWorkerStatementToExcel, 
  exportComparisonReportToExcel,
  exportWorkerSettlementReport,
  exportDetailedWorkerStatement
} from "@/utils/professional-export";
import { useToast } from "@/hooks/use-toast";

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
  subValue?: string;
}

function KPICard({ title, value, change, changeLabel, icon, color, subValue }: KPICardProps) {
  const isPositive = change && change >= 0;
  
  return (
    <Card className={`relative overflow-hidden border-none shadow-sm transition-all hover:shadow-md bg-white dark:bg-slate-900`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</h3>
              {change !== undefined && (
                <Badge variant={isPositive ? "outline" : "outline"} className={`text-[10px] px-1.5 py-0 border-none ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'}`}>
                  {isPositive ? <ArrowUpRight className="h-2.5 w-2.5 ml-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 ml-0.5" />}
                  {Math.abs(change).toFixed(1)}%
                </Badge>
              )}
            </div>
            {subValue && (
              <p className="text-[11px] text-muted-foreground font-medium">{subValue}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color.replace('border-l-', 'bg-').replace('-600', '-500/15')} text-${color.split('-')[2]}-600`}>
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-6 w-6" }) : icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfessionalReports() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(getCurrentDate());
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedProjectsForComparison, setSelectedProjectsForComparison] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const { selectedProjectId, projects, getProjectIdForApi } = useSelectedProject();
  const { toast } = useToast();

  const projectIdForApi = getProjectIdForApi();
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const { data: workers = [] } = useQuery({
    queryKey: ["/api/workers", projectIdForApi],
    queryFn: async () => {
      const response = await apiRequest(`/api/workers`, "GET");
      const allWorkers = response?.data || response || [];
      if (projectIdForApi) {
        return allWorkers.filter((w: any) => w.projectId === projectIdForApi);
      }
      return allWorkers;
    },
  });

  const { data: dashboardKPIs, isLoading: kpisLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ["/api/reports/dashboard-kpis", projectIdForApi],
    queryFn: async () => {
      const params = projectIdForApi ? `?projectId=${projectIdForApi}` : '';
      const response = await apiRequest(`/api/reports/dashboard-kpis${params}`, "GET");
      return response?.data || null;
    },
  });

  const { data: periodicReport, isLoading: periodicLoading, refetch: refetchPeriodic } = useQuery({
    queryKey: ["/api/reports/periodic", projectIdForApi, dateFrom, dateTo],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const response = await apiRequest(
        `/api/reports/periodic?projectId=${projectIdForApi}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        "GET"
      );
      return response?.data || null;
    },
    enabled: !!projectIdForApi,
  });

  const { data: projectSummary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["/api/reports/project-summary", projectIdForApi, dateFrom, dateTo],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const response = await apiRequest(
        `/api/reports/project-summary/${projectIdForApi}?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        "GET"
      );
      return response?.data || null;
    },
    enabled: !!projectIdForApi,
  });

  const { data: dailyReport, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ["/api/reports/daily", projectIdForApi, selectedDate],
    queryFn: async () => {
      if (!projectIdForApi) return null;
      const response = await apiRequest(
        `/api/reports/daily?projectId=${projectIdForApi}&date=${selectedDate}`,
        "GET"
      );
      return response?.data || null;
    },
    enabled: !!projectIdForApi,
  });

  const { data: workerStatement, isLoading: workerLoading, refetch: refetchWorker } = useQuery({
    queryKey: ["/api/reports/worker-statement", selectedWorkerId, projectIdForApi, dateFrom, dateTo],
    queryFn: async () => {
      if (!selectedWorkerId) return null;
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (projectIdForApi) params.append('projectId', projectIdForApi);
      const response = await apiRequest(
        `/api/reports/worker-statement/${selectedWorkerId}?${params}`,
        "GET"
      );
      return response?.data || null;
    },
    enabled: !!selectedWorkerId,
  });

  const { data: projectsComparison, isLoading: comparisonLoading, refetch: refetchComparison } = useQuery({
    queryKey: ["/api/reports/projects-comparison", selectedProjectsForComparison, dateFrom, dateTo],
    queryFn: async () => {
      if (selectedProjectsForComparison.length < 2) return null;
      const response = await apiRequest(
        `/api/reports/projects-comparison?projectIds=${selectedProjectsForComparison.join(',')}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        "GET"
      );
      return response?.data || null;
    },
    enabled: selectedProjectsForComparison.length >= 2,
  });

  const handleRefreshAll = () => {
    refetchKPIs();
    refetchPeriodic();
    refetchSummary();
    refetchDaily();
  };

  // تعيين التاريخ "من" إلى تاريخ أول سجل عمل تلقائياً
  React.useEffect(() => {
    if (workerStatement?.attendance && workerStatement.attendance.length > 0) {
      const firstRecordDate = workerStatement.attendance[0]?.date;
      if (firstRecordDate) {
        setDateFrom(firstRecordDate);
      }
    }
  }, [selectedWorkerId]);

  const handlePrint = () => {
    let printHTML = `
      <html>
        <head>
          <title>طباعة التقرير</title>
          <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
            .report-title { font-size: 20px; margin-top: 10px; color: #475569; }
            .kpi-container { display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .kpi { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; }
            .kpi-label { font-size: 12px; color: #64748b; margin-bottom: 5px; }
            .kpi-value { font-size: 18px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
            td { border: 1px solid #e2e8f0; padding: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">شركة الفتيني للمقاولات والاستشارات الهندسية</div>
            <div class="report-title">${activeTab === 'daily' ? 'التقرير اليومي' : activeTab === 'periodic' ? 'تقرير الفترة' : activeTab === 'worker' ? 'بيان العامل' : 'تقرير مقارنة'}</div>
          </div>
    `;

    if (activeTab === 'daily' && dailyReport) {
      printHTML += `
        <div class="kpi-container">
          <div class="kpi"><div class="kpi-label">العمال</div><div class="kpi-value">${dailyReport.summary?.totalWorkers || 0}</div></div>
          <div class="kpi"><div class="kpi-label">الأجور</div><div class="kpi-value">${formatCurrency(dailyReport.summary?.totalPaidWages || 0)}</div></div>
        </div>
      `;
    } else if (activeTab === 'periodic' && periodicReport) {
      printHTML += `
        <div class="summary">
          <div class="summary-row"><span>إجمالي الدخل:</span><b>${formatCurrency(periodicReport.summary?.totalFundTransfers || 0)}</b></div>
          <div class="summary-row"><span>إجمالي المصروفات:</span><b>${formatCurrency(periodicReport.summary?.totalExpenses || 0)}</b></div>
          <div class="summary-row"><span>الرصيد:</span><b>${formatCurrency(periodicReport.summary?.balance || 0)}</b></div>
        </div>
      `;
    }

    printHTML += `</body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
    }
  };

  const handleExportDailyReport = async () => {
    if (!dailyReport) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      await exportDailyReportToExcel(dailyReport, {
        reportTitle: 'التقرير اليومي التفصيلي',
        reportType: 'daily',
        projectName: selectedProject?.name,
        date: selectedDate
      });
      toast({ title: "تم تصدير التقرير بنجاح" });
    } catch (error: any) {
      console.error('❌ خطأ التصدير:', error);
      toast({ title: "فشل في تصدير التقرير", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPeriodicReport = async () => {
    if (!periodicReport) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      await exportPeriodicReportToExcel(periodicReport, {
        reportTitle: 'تقرير الفترة الزمنية',
        reportType: 'periodic',
        projectName: selectedProject?.name,
        dateRange: { from: dateFrom, to: dateTo }
      });
      toast({ title: "تم تصدير التقرير بنجاح" });
    } catch (error: any) {
      console.error('❌ خطأ التصدير:', error);
      toast({ title: "فشل في تصدير التقرير", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWorkerStatement = async () => {
    if (!workerStatement) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      await exportWorkerStatementToExcel(workerStatement, {
        reportTitle: 'بيان حساب العامل',
        reportType: 'worker-statement',
        projectName: selectedProject?.name,
        dateRange: { from: dateFrom, to: dateTo }
      });
      toast({ title: "تم تصدير بيان العامل بنجاح" });
    } catch (error: any) {
      console.error('❌ خطأ التصدير:', error);
      toast({ 
        title: "فشل في تصدير البيان", 
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportComparisonReport = async () => {
    if (!projectsComparison) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      await exportComparisonReportToExcel(projectsComparison, {
        reportTitle: 'تقرير مقارنة المشاريع',
        reportType: 'comparison',
        dateRange: { from: dateFrom, to: dateTo }
      });
      toast({ title: "تم تصدير تقرير المقارنة بنجاح" });
    } catch (error: any) {
      console.error('❌ خطأ التصدير:', error);
      toast({ 
        title: "فشل في تصدير التقرير", 
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleProjectForComparison = (projectId: string) => {
    setSelectedProjectsForComparison(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const chartConfig = {
    wages: { label: "الأجور", color: "#3B82F6" },
    materials: { label: "المواد", color: "#10B981" },
    transport: { label: "النقل", color: "#F59E0B" },
    income: { label: "الدخل", color: "#8B5CF6" },
    total: { label: "الإجمالي", color: "#EF4444" }
  };

  return (
    <LayoutShell showHeader={false}>
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden print:bg-white print:from-white print:to-white" dir="rtl">
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="no-print sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
            <div className="px-4 md:px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">لوحة التقارير الاحترافية</h1>
                    <p className="text-xs md:text-sm text-gray-500">تحليلات شاملة وتقارير تفصيلية</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefreshAll} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">تحديث</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">طباعة</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 md:px-6 py-6 pb-24">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="no-print grid w-full grid-cols-5 bg-white rounded-xl shadow-md border p-1 max-w-4xl">
                <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg">
                  <Activity className="h-4 w-4" />
                  <span className="hidden md:inline">لوحة التحكم</span>
                </TabsTrigger>
                <TabsTrigger value="daily" className="gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden md:inline">يومي</span>
                </TabsTrigger>
                <TabsTrigger value="periodic" className="gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span className="hidden md:inline">فترة</span>
                </TabsTrigger>
                <TabsTrigger value="worker" className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg">
                  <Users className="h-4 w-4" />
                  <span className="hidden md:inline">العامل</span>
                </TabsTrigger>
                <TabsTrigger value="comparison" className="gap-2 data-[state=active]:bg-pink-500 data-[state=active]:text-white rounded-lg">
                  <GitCompare className="h-4 w-4" />
                  <span className="hidden md:inline">مقارنة</span>
                </TabsTrigger>
              </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {kpisLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : dashboardKPIs ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard
                      title="عمال اليوم"
                      value={dashboardKPIs.today?.workers || 0}
                      icon={<Users className="h-5 w-5 text-blue-600" />}
                      color="border-l-blue-500"
                      subValue={`${dashboardKPIs.today?.workDays?.toFixed(1) || 0} يوم عمل`}
                    />
                    <KPICard
                      title="مصروفات اليوم"
                      value={formatCurrency(dashboardKPIs.today?.expenses || 0)}
                      icon={<DollarSign className="h-5 w-5 text-red-600" />}
                      color="border-l-red-500"
                    />
                    <KPICard
                      title="عمال الشهر"
                      value={dashboardKPIs.month?.workers || 0}
                      icon={<Users className="h-5 w-5 text-green-600" />}
                      color="border-l-green-500"
                      subValue={`${dashboardKPIs.month?.workDays?.toFixed(1) || 0} يوم عمل`}
                    />
                    <KPICard
                      title="أجور الشهر"
                      value={formatCurrency(dashboardKPIs.month?.wages || 0)}
                      icon={<Wallet className="h-5 w-5 text-purple-600" />}
                      color="border-l-purple-500"
                      subValue={`مدفوع: ${formatCurrency(dashboardKPIs.month?.paid || 0)}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KPICard
                      title="مشتريات الشهر"
                      value={formatCurrency(dashboardKPIs.month?.materials || 0)}
                      icon={<Layers className="h-5 w-5 text-amber-600" />}
                      color="border-l-amber-500"
                    />
                    <KPICard
                      title="المشاريع النشطة"
                      value={dashboardKPIs.overall?.activeProjects || 0}
                      icon={<Building2 className="h-5 w-5 text-cyan-600" />}
                      color="border-l-cyan-500"
                    />
                    <KPICard
                      title="العمال النشطين"
                      value={dashboardKPIs.overall?.activeWorkers || 0}
                      icon={<Users className="h-5 w-5 text-indigo-600" />}
                      color="border-l-indigo-500"
                    />
                  </div>

                  {projectSummary && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-blue-600" />
                            توزيع المصروفات
                          </CardTitle>
                          <CardDescription>
                            {selectedProject?.name || 'جميع المشاريع'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {projectSummary.charts?.expenseBreakdown?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={projectSummary.charts.expenseBreakdown}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {projectSummary.charts.expenseBreakdown.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-64 text-gray-500">
                              لا توجد بيانات
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-green-600" />
                            ملخص المشروع المالي
                          </CardTitle>
                          <CardDescription>
                            {selectedProject?.name || 'اختر مشروعاً'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <p className="text-sm text-green-700 font-medium">إجمالي الدخل</p>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(projectSummary.financial?.totalIncome || 0)}
                              </p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <p className="text-sm text-red-700 font-medium">إجمالي المصروفات</p>
                              <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(projectSummary.financial?.totalExpenses || 0)}
                              </p>
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg border ${(projectSummary.financial?.currentBalance || 0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                            <p className={`text-sm font-medium ${(projectSummary.financial?.currentBalance || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                              الرصيد الحالي
                            </p>
                            <p className={`text-3xl font-bold ${(projectSummary.financial?.currentBalance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              {formatCurrency(projectSummary.financial?.currentBalance || 0)}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-500">العمال</p>
                              <p className="text-lg font-bold">{projectSummary.workforce?.uniqueWorkers || 0}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-500">أيام العمل</p>
                              <p className="text-lg font-bold">{(projectSummary.workforce?.totalWorkDays || 0).toFixed(1)}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-500">أيام نشطة</p>
                              <p className="text-lg font-bold">{projectSummary.workforce?.activeDays || 0}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 text-center">
                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">اختر مشروعاً لعرض التحليلات</h3>
                    <p className="text-sm text-gray-500 mt-2">استخدم القائمة أعلاه لاختيار مشروع</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="daily" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    التقرير اليومي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <Label>اختر التاريخ</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={() => refetchDaily()} disabled={dailyLoading}>
                      <RefreshCw className={`h-4 w-4 ml-2 ${dailyLoading ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExportDailyReport} 
                      disabled={!dailyReport || isExporting}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      تصدير Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {dailyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : dailyReport ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard
                      title="عدد العمال"
                      value={dailyReport.summary?.totalWorkers || 0}
                      icon={<Users className="h-5 w-5 text-blue-600" />}
                      color="border-l-blue-500"
                      subValue={`${(dailyReport.summary?.totalWorkDays || 0).toFixed(1)} يوم`}
                    />
                    <KPICard
                      title="أجور مدفوعة"
                      value={formatCurrency(dailyReport.summary?.totalPaidWages || 0)}
                      icon={<Wallet className="h-5 w-5 text-green-600" />}
                      color="border-l-green-500"
                    />
                    <KPICard
                      title="مشتريات المواد"
                      value={formatCurrency(dailyReport.summary?.totalMaterials || 0)}
                      icon={<Layers className="h-5 w-5 text-amber-600" />}
                      color="border-l-amber-500"
                    />
                    <KPICard
                      title="الرصيد"
                      value={formatCurrency(dailyReport.summary?.balance || 0)}
                      icon={<DollarSign className="h-5 w-5 text-purple-600" />}
                      color="border-l-purple-500"
                    />
                  </div>

                  {dailyReport.details?.attendance?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>سجل الحضور</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-right font-medium">العامل</th>
                                <th className="px-4 py-3 text-right font-medium">النوع</th>
                                <th className="px-4 py-3 text-right font-medium">أيام العمل</th>
                                <th className="px-4 py-3 text-right font-medium">الأجر المستحق</th>
                                <th className="px-4 py-3 text-right font-medium">المدفوع</th>
                                <th className="px-4 py-3 text-right font-medium">المتبقي</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {dailyReport.details.attendance.map((record: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">{record.workerName}</td>
                                  <td className="px-4 py-3">
                                    <Badge variant={record.workerType === 'معلم' ? 'default' : 'secondary'}>
                                      {record.workerType}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">{parseFloat(record.workDays || 0).toFixed(2)}</td>
                                  <td className="px-4 py-3">{formatCurrency(record.actualWage || 0)}</td>
                                  <td className="px-4 py-3 text-green-600">{formatCurrency(record.paidAmount || 0)}</td>
                                  <td className="px-4 py-3 text-red-600">{formatCurrency(record.remainingAmount || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">لا توجد بيانات لهذا اليوم</h3>
                    <p className="text-sm text-gray-500 mt-2">اختر تاريخاً آخر أو مشروعاً مختلفاً</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="periodic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    تقرير الفترة الزمنية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label>من تاريخ</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={() => refetchPeriodic()} disabled={periodicLoading}>
                      <RefreshCw className={`h-4 w-4 ml-2 ${periodicLoading ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExportPeriodicReport} 
                      disabled={!periodicReport || isExporting}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      تصدير Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {periodicLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : periodicReport ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard
                      title="أيام نشطة"
                      value={periodicReport.summary?.activeDays || 0}
                      icon={<Calendar className="h-5 w-5 text-blue-600" />}
                      color="border-l-blue-500"
                    />
                    <KPICard
                      title="إجمالي أيام العمل"
                      value={(periodicReport.summary?.totalWorkDays || 0).toFixed(1)}
                      icon={<Users className="h-5 w-5 text-green-600" />}
                      color="border-l-green-500"
                    />
                    <KPICard
                      title="إجمالي المصروفات"
                      value={formatCurrency(periodicReport.summary?.totalExpenses || 0)}
                      icon={<DollarSign className="h-5 w-5 text-red-600" />}
                      color="border-l-red-500"
                    />
                    <KPICard
                      title="الرصيد"
                      value={formatCurrency(periodicReport.summary?.balance || 0)}
                      icon={<Wallet className="h-5 w-5 text-purple-600" />}
                      color="border-l-purple-500"
                    />
                  </div>

                  {periodicReport.chartData?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                          تحليل المصروفات اليومية
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <ComposedChart data={periodicReport.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="wages" name="الأجور" fill="#3B82F6" stackId="a" />
                            <Bar dataKey="materials" name="المواد" fill="#10B981" stackId="a" />
                            <Bar dataKey="transport" name="النقل" fill="#F59E0B" stackId="a" />
                            <Line type="monotone" dataKey="income" name="الدخل" stroke="#8B5CF6" strokeWidth={2} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">اختر مشروعاً وفترة زمنية</h3>
                    <p className="text-sm text-gray-500 mt-2">حدد نطاق التواريخ للحصول على التقرير</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="worker" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    بيان العامل التفصيلي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <Label>اختر العامل</Label>
                      <WorkerSelect
                        value={selectedWorkerId}
                        onValueChange={setSelectedWorkerId}
                        workers={workers || []}
                        placeholder="اختر عاملاً..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>من تاريخ</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={() => refetchWorker()} disabled={workerLoading || !selectedWorkerId}>
                      <RefreshCw className={`h-4 w-4 ml-2 ${workerLoading ? 'animate-spin' : ''}`} />
                      عرض البيان
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExportWorkerStatement} 
                      disabled={!workerStatement || isExporting}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      تصدير Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {workerLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : workerStatement ? (
                <>
                  <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-orange-100 p-3 rounded-full">
                          <Users className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{workerStatement.worker?.name}</h3>
                          <Badge variant="outline">{workerStatement.worker?.type}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500">أيام العمل</p>
                          <p className="text-xl font-bold text-blue-600">{(workerStatement.summary?.totalWorkDays || 0).toFixed(1)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500">إجمالي المستحق</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(workerStatement.summary?.totalEarned || 0)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500">إجمالي المدفوع</p>
                          <p className="text-xl font-bold text-amber-600">{formatCurrency(workerStatement.summary?.totalPaid || 0)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500">الحوالات</p>
                          <p className="text-xl font-bold text-purple-600">{formatCurrency(workerStatement.summary?.totalTransfers || 0)}</p>
                        </div>
                        <div className={`p-3 rounded-lg shadow-sm ${(workerStatement.summary?.remainingBalance || 0) >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                          <p className="text-xs text-gray-500">الرصيد المتبقي</p>
                          <p className={`text-xl font-bold ${(workerStatement.summary?.remainingBalance || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(workerStatement.summary?.remainingBalance || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {workerStatement.chartData?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>تحليل الأرباح والمدفوعات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={workerStatement.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Area type="monotone" dataKey="earned" name="المستحق" stroke="#10B981" fill="#10B98133" />
                            <Area type="monotone" dataKey="paid" name="المدفوع" stroke="#F59E0B" fill="#F59E0B33" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {workerStatement.attendance?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>سجل العمل التفصيلي</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                                <th className="px-4 py-3 text-right font-medium">المشروع</th>
                                <th className="px-4 py-3 text-right font-medium">أيام العمل</th>
                                <th className="px-4 py-3 text-right font-medium">الأجر</th>
                                <th className="px-4 py-3 text-right font-medium">المدفوع</th>
                                <th className="px-4 py-3 text-right font-medium">الوصف</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {workerStatement.attendance.map((record: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">{record.date}</td>
                                  <td className="px-4 py-3">{record.projectName}</td>
                                  <td className="px-4 py-3">{parseFloat(record.workDays || 0).toFixed(2)}</td>
                                  <td className="px-4 py-3">{formatCurrency(record.actualWage || 0)}</td>
                                  <td className="px-4 py-3 text-green-600">{formatCurrency(record.paidAmount || 0)}</td>
                                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{record.workDescription || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">اختر عاملاً لعرض بيانه</h3>
                    <p className="text-sm text-gray-500 mt-2">حدد العامل والفترة الزمنية</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitCompare className="h-5 w-5 text-pink-600" />
                    مقارنة المشاريع
                  </CardTitle>
                  <CardDescription>
                    اختر مشروعين أو أكثر للمقارنة بينهم
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {projects.map((project: any) => (
                      <div
                        key={project.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedProjectsForComparison.includes(project.id)
                            ? 'bg-pink-50 border-pink-300'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleProjectForComparison(project.id)}
                      >
                        <Checkbox
                          checked={selectedProjectsForComparison.includes(project.id)}
                          className="pointer-events-none"
                        />
                        <span className="text-sm font-medium">{project.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label>من تاريخ</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      onClick={() => refetchComparison()} 
                      disabled={comparisonLoading || selectedProjectsForComparison.length < 2}
                    >
                      <RefreshCw className={`h-4 w-4 ml-2 ${comparisonLoading ? 'animate-spin' : ''}`} />
                      مقارنة
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExportComparisonReport} 
                      disabled={!projectsComparison || isExporting}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      تصدير Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {comparisonLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-pink-500" />
                </div>
              ) : projectsComparison ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>مقارنة الأداء المالي</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={projectsComparison.chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="income" name="الدخل" fill="#10B981" />
                          <Bar dataKey="expenses" name="المصروفات" fill="#EF4444" />
                          <Bar dataKey="balance" name="الرصيد" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectsComparison.projects?.map((item: any, idx: number) => (
                      <Card key={idx} className="border-t-4" style={{ borderTopColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{item.project?.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">الدخل</span>
                            <span className="font-bold text-green-600">{formatCurrency(item.metrics?.income || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">المصروفات</span>
                            <span className="font-bold text-red-600">{formatCurrency(item.metrics?.expenses || 0)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">الرصيد</span>
                            <span className={`font-bold ${(item.metrics?.balance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              {formatCurrency(item.metrics?.balance || 0)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-500">العمال</p>
                              <p className="font-bold">{item.metrics?.workers || 0}</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-500">أيام العمل</p>
                              <p className="font-bold">{(item.metrics?.workDays || 0).toFixed(1)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold mb-4">ملخص المقارنة الإجمالي</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500">إجمالي الدخل</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(projectsComparison.totals?.totalIncome || 0)}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500">إجمالي المصروفات</p>
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(projectsComparison.totals?.totalExpenses || 0)}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500">إجمالي الرصيد</p>
                          <p className={`text-2xl font-bold ${(projectsComparison.totals?.totalBalance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatCurrency(projectsComparison.totals?.totalBalance || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 text-center">
                    <GitCompare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">اختر مشروعين على الأقل للمقارنة</h3>
                    <p className="text-sm text-gray-500 mt-2">انقر على المشاريع أعلاه لاختيارها</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </LayoutShell>
  );
}

export default ProfessionalReports;
