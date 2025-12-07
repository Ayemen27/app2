import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerSelect } from "@/components/ui/searchable-select";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  Download,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Wallet,
  Truck
} from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import "@/styles/excel-print-styles.css";

interface DailyExpenseData {
  date: string;
  workerWages: number;
  workDays: number;
  materialCosts: number;
  transportation: number;
  miscExpenses: number;
  total: number;
}

interface WorkerStatementData {
  worker: {
    id: string;
    name: string;
    type: string;
    dailyWage: number;
  };
  attendance: Array<{
    date: string;
    workDays: number;
    dailyWage: number;
    actualWage: number;
    paidAmount: number;
    remainingAmount: number;
    workDescription: string;
  }>;
  transfers?: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
    method: string;
  }>;
  summary: {
    totalWorkDays: number;
    totalEarned: number;
    totalPaid: number;
    totalTransfers?: number;
    remainingBalance: number;
  };
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("daily-expenses");
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(getCurrentDate());
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [searchAttendance, setSearchAttendance] = useState("");
  const { selectedProjectId, projects, getProjectIdForApi } = useSelectedProject();

  const projectIdForApi = getProjectIdForApi();
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // جلب قائمة العمال
  const { data: workers = [] } = useQuery({
    queryKey: ["/api/workers", projectIdForApi],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/workers`, "GET");
        let allWorkers = [];
        if (response && response.data) {
          allWorkers = Array.isArray(response.data) ? response.data : [];
        } else {
          allWorkers = Array.isArray(response) ? response : [];
        }
        if (projectIdForApi) {
          return allWorkers.filter((w: any) => w.projectId === projectIdForApi);
        }
        return allWorkers;
      } catch (error) {
        console.error("❌ خطأ في جلب العمال:", error);
        return [];
      }
    },
  });

  // جلب بيانات المصاريف اليومية
  const { data: expenseData, isLoading: expenseLoading, refetch: refetchExpenses } = useQuery<DailyExpenseData>({
    queryKey: ["/api/daily-expenses-excel", projectIdForApi, selectedDate],
    queryFn: async () => {
      if (!projectIdForApi)
        return {
          date: selectedDate,
          workerWages: 0,
          workDays: 0,
          materialCosts: 0,
          transportation: 0,
          miscExpenses: 0,
          total: 0,
        };
      try {
        const response = await apiRequest(
          `/api/daily-expenses-excel?projectId=${projectIdForApi}&date=${selectedDate}`,
          "GET"
        );
        return (response?.data || response) as DailyExpenseData;
      } catch (error) {
        console.error("❌ خطأ في جلب بيانات المصاريف:", error);
        return {
          date: selectedDate,
          workerWages: 0,
          workDays: 0,
          materialCosts: 0,
          transportation: 0,
          miscExpenses: 0,
          total: 0,
        };
      }
    },
    enabled: !!projectIdForApi,
  });

  // جلب تفاصيل سجلات الحضور اليومية
  const { data: attendanceDetails = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/daily-attendance-details", projectIdForApi, selectedDate],
    queryFn: async () => {
      if (!projectIdForApi) return [];
      try {
        const response = await apiRequest(
          `/api/daily-attendance-details?projectId=${projectIdForApi}&date=${selectedDate}`,
          "GET"
        );
        return (response?.data || []) as any[];
      } catch (error) {
        console.error("❌ خطأ في جلب تفاصيل الحضور:", error);
        return [];
      }
    },
    enabled: !!projectIdForApi,
  });

  // جلب بيان العامل
  const { data: statementData, isLoading: statementLoading, refetch: refetchStatement } = useQuery<WorkerStatementData | null>({
    queryKey: ["/api/worker-statement-excel", projectIdForApi, selectedWorkerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!projectIdForApi || !selectedWorkerId) return null;
      try {
        const params = new URLSearchParams({
          projectId: projectIdForApi,
          workerId: selectedWorkerId,
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
        });
        const response = await apiRequest(`/api/worker-statement-excel?${params}`, "GET");
        return (response?.data || response) as WorkerStatementData | null;
      } catch (error) {
        console.error("❌ خطأ في جلب بيان العامل:", error);
        return null;
      }
    },
    enabled: !!projectIdForApi && !!selectedWorkerId,
  });

  // جلب حوالات العامل
  const { data: transfersData = { transfers: [], total: 0 }, isLoading: transfersLoading } = useQuery({
    queryKey: ["/api/worker-transfers-by-period", projectIdForApi, selectedWorkerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!projectIdForApi || !selectedWorkerId) return { transfers: [], total: 0 };
      try {
        const params = new URLSearchParams({
          projectId: projectIdForApi,
          workerId: selectedWorkerId,
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
        });
        const response = await apiRequest(`/api/worker-transfers-by-period?${params}`, "GET");
        return (response?.data || { transfers: [], total: 0 }) as any;
      } catch (error) {
        console.error("❌ خطأ في جلب الحوالات:", error);
        return { transfers: [], total: 0 };
      }
    },
    enabled: !!projectIdForApi && !!selectedWorkerId,
  });

  const handleReset = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    setDateFrom(date.toISOString().split("T")[0]);
    setDateTo(getCurrentDate());
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportDailyExpenses = async () => {
    if (!expenseData || !selectedProject) return;
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("المصاريف اليومية");

      worksheet.columns = [
        { width: 25 },
        { width: 18 },
        { width: 15 },
      ];

      const titleRow = worksheet.addRow(["تقرير المصاريف اليومية"]);
      titleRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);

      worksheet.addRow(["اسم المشروع:", selectedProject.name, ""]);
      worksheet.addRow(["التاريخ:", selectedDate, ""]);
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(["البند", "المبلغ (ريال)", "النسبة %"]);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };

      const dataRows = [
        ["أجور العمال", expenseData.workerWages, expenseData.total > 0 ? ((expenseData.workerWages / expenseData.total) * 100).toFixed(1) : 0],
        ["تكاليف المواد", expenseData.materialCosts, expenseData.total > 0 ? ((expenseData.materialCosts / expenseData.total) * 100).toFixed(1) : 0],
        ["النقل", expenseData.transportation, expenseData.total > 0 ? ((expenseData.transportation / expenseData.total) * 100).toFixed(1) : 0],
        ["مصاريف متنوعة", expenseData.miscExpenses, expenseData.total > 0 ? ((expenseData.miscExpenses / expenseData.total) * 100).toFixed(1) : 0],
      ];

      dataRows.forEach((row) => {
        const r = worksheet.addRow(row);
        r.alignment = { horizontal: "right", vertical: "middle" };
        r.getCell(2).numFmt = "#,##0.00";
      });

      const totalRow = worksheet.addRow(["الإجمالي", expenseData.total, 100]);
      totalRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      totalRow.alignment = { horizontal: "center", vertical: "middle" };
      totalRow.getCell(2).numFmt = "#,##0.00";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_المصاريف_${selectedProject.name}_${selectedDate}.xlsx`;
      link.click();
    } catch (error) {
      console.error("خطأ في تصدير Excel:", error);
    }
  };

  const handleExportWorkerStatement = async () => {
    if (!statementData || !selectedProject) return;
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("بيان العامل");

      worksheet.columns = [
        { width: 12 },
        { width: 12 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 20 },
      ];

      const titleRow = worksheet.addRow(["بيان حساب العامل"]);
      titleRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);

      worksheet.addRow(["اسم العامل:", statementData.worker.name, "", "نوع العامل:", statementData.worker.type]);
      worksheet.addRow(["الأجر اليومي:", formatCurrency((statementData.worker.dailyWage || 0).toString()), "", "المشروع:", selectedProject?.name]);
      worksheet.addRow(["من تاريخ:", dateFrom || "البداية", "", "إلى تاريخ:", dateTo]);
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(["التاريخ", "أيام العمل", "الأجر اليومي", "الأجر المستحق", "المدفوع", "المتبقي", "وصف العمل"]);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };

      statementData.attendance.forEach((record) => {
        const row = worksheet.addRow([
          record.date,
          record.workDays,
          record.dailyWage,
          record.actualWage,
          record.paidAmount,
          record.remainingAmount,
          record.workDescription || "-",
        ]);
        row.alignment = { horizontal: "right", vertical: "middle" };
        [2, 3, 4, 5, 6].forEach((col) => {
          row.getCell(col).numFmt = "#,##0.00";
        });
      });

      worksheet.addRow([]);
      const sumRow1 = worksheet.addRow(["إجمالي أيام العمل:", statementData.summary.totalWorkDays + " يوم"]);
      sumRow1.font = { bold: true };

      const sumRow2 = worksheet.addRow(["إجمالي الأجور المستحقة:", statementData.summary.totalEarned]);
      sumRow2.font = { bold: true };
      sumRow2.getCell(2).numFmt = "#,##0.00";

      const sumRow3 = worksheet.addRow(["إجمالي المدفوع:", statementData.summary.totalPaid]);
      sumRow3.font = { bold: true };
      sumRow3.getCell(2).numFmt = "#,##0.00";

      const balanceRow = worksheet.addRow(["الرصيد المتبقي:", statementData.summary.remainingBalance]);
      balanceRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      balanceRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      balanceRow.getCell(2).numFmt = "#,##0.00";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `بيان_العامل_${statementData.worker.name}_${dateTo}.xlsx`;
      link.click();
    } catch (error) {
      console.error("خطأ في تصدير Excel:", error);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md border-2 border-dashed border-blue-300 shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <AlertCircle className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">اختر مشروعاً</h2>
            <p className="text-sm text-gray-600">يرجى اختيار مشروع من أيقونة المجلد في الشريط العلوي لعرض التقارير</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden no-print">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* رأس الصفحة مع المشروع */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-300 shadow-sm">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900">{selectedProject?.name}</h1>
                  <p className="text-xs md:text-sm text-gray-500">التقارير والإحصائيات</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* التبويبات والمحتوى الرئيسي */}
        <div className="flex-1 overflow-hidden px-4 md:px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* قائمة التبويبات */}
            <TabsList className="grid w-full grid-cols-2 bg-white rounded-lg shadow-md border border-gray-200 max-w-sm">
              <TabsTrigger value="daily-expenses" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">المصاريف اليومية</span>
                <span className="sm:hidden">المصاريف</span>
              </TabsTrigger>
              <TabsTrigger value="worker-statement" className="data-[state=active]:bg-green-500 data-[state=active]:text-white gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">بيان العامل</span>
                <span className="sm:hidden">العامل</span>
              </TabsTrigger>
            </TabsList>

            {/* المحتوى */}
            <div className="flex-1 overflow-y-auto mt-6">
              {/* تبويب المصاريف اليومية */}
              <TabsContent value="daily-expenses" className="space-y-4">
                {/* الفلاتر والأزرار */}
                <Card className="border-gray-300 shadow-md">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      <div className="flex-1 min-w-0">
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          اختر التاريخ
                        </Label>
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full h-10 text-sm"
                        />
                      </div>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="gap-2 w-full md:w-auto"
                      >
                        <RefreshCw className="h-4 w-4" />
                        إعادة تعيين
                      </Button>
                    </div>

                    {/* أزرار العمليات */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => refetchExpenses()}
                        variant="secondary"
                        size="sm"
                        className="gap-2 flex-1 md:flex-none"
                        disabled={expenseLoading}
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">تحديث</span>
                      </Button>
                      <Button
                        onClick={handlePrint}
                        variant="secondary"
                        size="sm"
                        className="gap-2 flex-1 md:flex-none"
                      >
                        <Printer className="h-4 w-4" />
                        <span className="hidden sm:inline">طباعة</span>
                      </Button>
                      <Button
                        onClick={handleExportDailyExpenses}
                        size="sm"
                        className="gap-2 flex-1 md:flex-none bg-blue-600 hover:bg-blue-700"
                        disabled={expenseLoading || !expenseData}
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">تصدير Excel</span>
                        <span className="sm:hidden">تصدير</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* البيانات */}
                {expenseLoading ? (
                  <Card className="border-gray-300 shadow-md">
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-600 text-sm animate-pulse">جاري التحميل...</p>
                    </CardContent>
                  </Card>
                ) : expenseData ? (
                  <Card className="border-gray-300 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                      <CardTitle className="text-lg text-gray-900">ملخص المصاريف</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-600">أجور العمال</p>
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <p className="text-2xl font-bold text-blue-600">{formatCurrency((expenseData.workerWages || 0).toString())}</p>
                          <p className="text-xs text-gray-500 mt-1">عدد الأيام: <span className="font-semibold">{(expenseData.workDays || 0).toFixed(2)}</span></p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-600">المواد</p>
                            <BarChart3 className="h-4 w-4 text-green-600" />
                          </div>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency((expenseData.materialCosts || 0).toString())}</p>
                          <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.materialCosts / expenseData.total) * 100).toFixed(1) : 0}%</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-600">النقل</p>
                            <Truck className="h-4 w-4 text-orange-600" />
                          </div>
                          <p className="text-2xl font-bold text-orange-600">{formatCurrency((expenseData.transportation || 0).toString())}</p>
                          <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.transportation / expenseData.total) * 100).toFixed(1) : 0}%</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-600">متنوعة</p>
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <p className="text-2xl font-bold text-red-600">{formatCurrency((expenseData.miscExpenses || 0).toString())}</p>
                          <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.miscExpenses / expenseData.total) * 100).toFixed(1) : 0}%</p>
                        </div>
                      </div>

                      {/* الإجمالي */}
                      <div className="mt-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-4 rounded-lg flex justify-between items-center shadow-lg">
                        <span className="font-semibold text-lg">الإجمالي</span>
                        <span className="text-3xl font-bold">{formatCurrency((expenseData.total || 0).toString())}</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* جدول تسجيل الحضور */}
                {attendanceDetails && attendanceDetails.length > 0 && (
                  <Card className="border-gray-300 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-gray-200">
                      <CardTitle className="text-lg text-gray-900">تفاصيل تسجيل الحضور</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                              <th className="px-4 py-3 text-right font-semibold">اسم العامل</th>
                              <th className="px-4 py-3 text-right font-semibold">أيام العمل</th>
                              <th className="px-4 py-3 text-right font-semibold">الأجر اليومي</th>
                              <th className="px-4 py-3 text-right font-semibold">الأجر المستحق</th>
                              <th className="px-4 py-3 text-right font-semibold">المدفوع</th>
                              <th className="px-4 py-3 text-right font-semibold">المتبقي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceDetails.map((record: any, idx: number) => (
                              <tr key={idx} className="border-t border-gray-200 hover:bg-purple-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{record.workerName || 'غير محدد'}</td>
                                <td className="px-4 py-3 text-gray-900">{parseFloat(record.workDays || '0').toFixed(2)}</td>
                                <td className="px-4 py-3 text-gray-900">{formatCurrency((parseFloat(record.dailyWage || '0')).toString())}</td>
                                <td className="px-4 py-3 font-medium text-blue-600">{formatCurrency((record.actualWage || 0).toString())}</td>
                                <td className="px-4 py-3 font-medium text-green-600">{formatCurrency((record.paidAmount || 0).toString())}</td>
                                <td className={`px-4 py-3 font-medium ${record.remainingAmount > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                                  {formatCurrency((record.remainingAmount || 0).toString())}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* تبويب بيان العامل */}
              <TabsContent value="worker-statement" className="space-y-4">
                {/* الفلاتر والأزرار */}
                <Card className="border-gray-300 shadow-md">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">العامل</Label>
                        <WorkerSelect
                          value={selectedWorkerId}
                          onValueChange={setSelectedWorkerId}
                          workers={workers || []}
                          placeholder="اختر العامل"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">من التاريخ</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">إلى التاريخ</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="gap-2 flex-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          إعادة
                        </Button>
                      </div>
                    </div>

                    {/* أزرار العمليات */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => refetchStatement()}
                        variant="secondary"
                        size="sm"
                        className="gap-2 flex-1 md:flex-none"
                        disabled={statementLoading}
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">تحديث</span>
                      </Button>
                      <Button
                        onClick={handlePrint}
                        variant="secondary"
                        size="sm"
                        className="gap-2 flex-1 md:flex-none"
                      >
                        <Printer className="h-4 w-4" />
                        <span className="hidden sm:inline">طباعة</span>
                      </Button>
                      <Button
                        onClick={handleExportWorkerStatement}
                        size="sm"
                        className="gap-2 flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                        disabled={statementLoading || !statementData}
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">تصدير Excel</span>
                        <span className="sm:hidden">تصدير</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* البيانات */}
                {!selectedWorkerId ? (
                  <Card className="border-gray-300 shadow-md">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 text-sm">اختر عامل من القائمة لعرض بيان حسابه</p>
                    </CardContent>
                  </Card>
                ) : statementLoading ? (
                  <Card className="border-gray-300 shadow-md">
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-600 text-sm animate-pulse">جاري التحميل...</p>
                    </CardContent>
                  </Card>
                ) : statementData ? (
                  <div className="space-y-4">
                    {/* معلومات العامل */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Card className="border-gray-300 shadow-md">
                        <CardContent className="p-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">اسم العامل</p>
                          <p className="text-lg font-bold text-gray-900">{statementData?.worker?.name}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-gray-300 shadow-md">
                        <CardContent className="p-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">نوع العامل</p>
                          <p className="text-lg font-bold text-gray-900">{statementData?.worker?.type}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-gray-300 shadow-md">
                        <CardContent className="p-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">الأجر اليومي</p>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency((statementData?.worker?.dailyWage || 0).toString())}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-gray-300 shadow-md">
                        <CardContent className="p-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">الرصيد المتبقي</p>
                          <p className={`text-lg font-bold ${(statementData?.summary?.remainingBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency((statementData?.summary?.remainingBalance || 0).toString())}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* جدول السجل */}
                    <Card className="border-gray-300 shadow-md">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
                        <div className="flex items-center justify-between gap-4">
                          <CardTitle className="text-lg text-gray-900">سجل الحضور والأجور</CardTitle>
                          <Input
                            type="text"
                            placeholder="ابحث في التاريخ أو وصف العمل..."
                            value={searchAttendance}
                            onChange={(e) => setSearchAttendance(e.target.value)}
                            className="w-full md:w-64 h-9 text-sm"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                                <th className="px-4 py-3 text-right font-semibold">اسم العامل</th>
                                <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                                <th className="px-4 py-3 text-right font-semibold">أيام</th>
                                <th className="px-4 py-3 text-right font-semibold">يومي</th>
                                <th className="px-4 py-3 text-right font-semibold">مستحق</th>
                                <th className="px-4 py-3 text-right font-semibold">مدفوع</th>
                                <th className="px-4 py-3 text-right font-semibold">متبقي</th>
                                <th className="px-4 py-3 text-right font-semibold">الوصف</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const filteredAttendance = statementData?.attendance && statementData.attendance.length > 0
                                  ? statementData.attendance.filter((record: any) => {
                                      const searchLower = searchAttendance.toLowerCase();
                                      return (
                                        record.date.toLowerCase().includes(searchLower) ||
                                        (record.workDescription && record.workDescription.toLowerCase().includes(searchLower))
                                      );
                                    })
                                  : [];
                                
                                return filteredAttendance.length > 0 ? (
                                  filteredAttendance.map((record: any, idx: number) => (
                                    <tr key={idx} className="border-t border-gray-200 hover:bg-blue-50 transition-colors">
                                      <td className="px-4 py-3 font-medium text-gray-900">{statementData?.worker?.name}</td>
                                      <td className="px-4 py-3 text-gray-900">{record.date}</td>
                                      <td className="px-4 py-3 text-gray-900">{record.workDays}</td>
                                      <td className="px-4 py-3 text-gray-900">{formatCurrency((record.dailyWage || 0).toString())}</td>
                                      <td className="px-4 py-3 font-medium text-blue-600">{formatCurrency((record.actualWage || 0).toString())}</td>
                                      <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(record.paidAmount.toString())}</td>
                                      <td className="px-4 py-3 font-medium text-orange-600">{formatCurrency(record.remainingAmount.toString())}</td>
                                      <td className="px-4 py-3 text-gray-600 text-xs">{record.workDescription || '-'}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                      {statementData?.attendance?.length === 0 ? 'لا توجد سجلات للفترة المختارة' : 'لا توجد نتائج للبحث'}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ملخص النهاية */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-lg p-4 text-center shadow-lg">
                        <p className="text-xs font-medium opacity-80 mb-2">أيام العمل</p>
                        <p className="text-3xl font-bold">{statementData?.summary?.totalWorkDays || 0}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 text-center shadow-lg">
                        <p className="text-xs font-medium opacity-80 mb-2">المستحق</p>
                        <p className="text-2xl font-bold">{formatCurrency((statementData?.summary?.totalEarned || 0).toString())}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 text-center shadow-lg">
                        <p className="text-xs font-medium opacity-80 mb-2">المدفوع</p>
                        <p className="text-2xl font-bold">{formatCurrency((statementData?.summary?.totalPaid || 0).toString())}</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 text-center shadow-lg">
                        <p className="text-xs font-medium opacity-80 mb-2">الحوالات</p>
                        <p className="text-2xl font-bold">{formatCurrency((transfersData.total || 0).toString())}</p>
                      </div>
                      <div className={`bg-gradient-to-br ${((statementData?.summary?.totalEarned || 0) - (statementData?.summary?.totalPaid || 0) - (transfersData.total || 0)) >= 0 ? 'from-orange-500 to-orange-600' : 'from-red-600 to-red-700'} text-white rounded-lg p-4 text-center shadow-lg`}>
                        <p className="text-xs font-medium opacity-80 mb-2">المتبقي</p>
                        <p className="text-2xl font-bold">{formatCurrency(((statementData?.summary?.totalEarned || 0) - (statementData?.summary?.totalPaid || 0) - (transfersData.total || 0)).toString())}</p>
                      </div>
                    </div>

                    {/* جدول الحوالات المرسلة */}
                    {transfersData.transfers && transfersData.transfers.length > 0 && (
                      <Card className="border-gray-300 shadow-md mt-6">
                        <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b border-gray-200">
                          <CardTitle className="text-lg text-gray-900">الحوالات المرسلة للعامل</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gradient-to-r from-red-800 to-red-900 text-white">
                                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                                  <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
                                  <th className="px-4 py-3 text-right font-semibold">الطريقة</th>
                                  <th className="px-4 py-3 text-right font-semibold">الوصف</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transfersData.transfers.filter((t: any) => {
                                  // فلترة الحوالات حسب نطاق التاريخ
                                  const tDate = new Date(t.date).toISOString().split('T')[0];
                                  const from = dateFrom || '';
                                  const to = dateTo || '';
                                  return (!from || tDate >= from) && (!to || tDate <= to);
                                }).map((transfer: any, idx: number) => (
                                  <tr key={idx} className="border-t border-gray-200 hover:bg-red-50">
                                    <td className="px-4 py-3 text-gray-900">{transfer.date}</td>
                                    <td className="px-4 py-3 font-medium text-red-600">{formatCurrency(transfer.amount.toString())}</td>
                                    <td className="px-4 py-3 text-gray-600">{transfer.method || '-'}</td>
                                    <td className="px-4 py-3 text-gray-600">{transfer.description || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-gray-100 border-t-2 border-gray-300">
                                  <td colSpan={3} className="px-4 py-3 font-bold text-gray-900 text-right">إجمالي الحوالات:</td>
                                  <td className="px-4 py-3 font-bold text-red-600">{formatCurrency((transfersData.total || 0).toString())}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : null}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
