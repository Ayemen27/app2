import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AlertCircle
} from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import "@/styles/excel-print-styles.css";

interface DailyExpenseData {
  date: string;
  workerWages: number;
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
  summary: {
    totalWorkDays: number;
    totalEarned: number;
    totalPaid: number;
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
  const { selectedProjectId, projects } = useSelectedProject();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // جلب قائمة العمال
  const { data: workers = [] } = useQuery({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/workers`, "GET");
        if (response && response.data) {
          return Array.isArray(response.data) ? response.data : [];
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("❌ خطأ في جلب العمال:", error);
        return [];
      }
    },
  });

  // جلب بيانات المصاريف اليومية
  const { data: expenseData, isLoading: expenseLoading, refetch: refetchExpenses } = useQuery<DailyExpenseData>({
    queryKey: ["/api/daily-expenses-excel", selectedProjectId, selectedDate],
    queryFn: async () => {
      if (!selectedProjectId)
        return {
          date: selectedDate,
          workerWages: 0,
          materialCosts: 0,
          transportation: 0,
          miscExpenses: 0,
          total: 0,
        };
      return apiRequest(
        `/api/daily-expenses-excel?projectId=${selectedProjectId}&date=${selectedDate}`,
        "GET"
      );
    },
    enabled: !!selectedProjectId,
  });

  // جلب بيان العامل
  const { data: statementData, isLoading: statementLoading, refetch: refetchStatement } = useQuery<WorkerStatementData>({
    queryKey: ["/api/worker-statement-excel", selectedProjectId, selectedWorkerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!selectedProjectId || !selectedWorkerId) return null;
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        workerId: selectedWorkerId,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      return apiRequest(`/api/worker-statement-excel?${params}`, "GET");
    },
    enabled: !!selectedProjectId && !!selectedWorkerId,
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
      worksheet.addRow(["الأجر اليومي:", formatCurrency(statementData.worker.dailyWage.toString()), "", "المشروع:", selectedProject?.name]);
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
      <div className="h-full flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">اختر مشروعاً</h2>
              <p className="text-sm text-gray-600">يرجى اختيار مشروع لعرض التقارير</p>
              <div className="pt-4">
                <ProjectSelector onProjectChange={() => {}} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden no-print">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* المشروع المختار */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 mb-1">المشروع المختار</p>
                <p className="text-sm md:text-base font-semibold text-gray-900 truncate">{selectedProject?.name}</p>
              </div>
              <div className="w-full md:w-auto">
                <ProjectSelector onProjectChange={() => {}} />
              </div>
            </div>
          </div>
        </div>

        {/* التبويبات والفلاتر */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b border-gray-200 rounded-none h-auto p-0 gap-0">
                  <TabsTrigger 
                    value="daily-expenses" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3 font-medium text-sm"
                  >
                    <DollarSign className="h-4 w-4 ml-2" />
                    <span className="hidden sm:inline">المصاريف اليومية</span>
                    <span className="sm:hidden">المصاريف</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="worker-statement" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3 font-medium text-sm"
                  >
                    <Users className="h-4 w-4 ml-2" />
                    <span className="hidden sm:inline">بيان العامل</span>
                    <span className="sm:hidden">العامل</span>
                  </TabsTrigger>
                </TabsList>

                {/* المحتوى */}
                <div className="flex-1 overflow-y-auto">
                  {/* Tab 1: Daily Expenses */}
                  <TabsContent value="daily-expenses" className="m-0 p-4 md:p-6 space-y-4">
                    <div className="max-w-7xl mx-auto w-full space-y-4">
                      {/* شريط الفلتر الموحد */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="flex flex-col md:flex-row-reverse gap-3 items-end">
                          <Button
                            onClick={handleReset}
                            variant="outline"
                            size="sm"
                            className="gap-2 w-full md:w-auto"
                          >
                            <RefreshCw className="h-4 w-4" />
                            إعادة تعيين
                          </Button>
                          <div className="flex-1 min-w-0 w-full">
                            <Label className="text-xs font-medium text-gray-700 block mb-2">التاريخ</Label>
                            <Input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="w-full h-9 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* أزرار العمليات */}
                      <div className="flex flex-wrap gap-2 md:gap-3">
                        <Button
                          onClick={() => refetchExpenses()}
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 md:flex-none"
                          disabled={expenseLoading}
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="hidden sm:inline">تحديث</span>
                        </Button>
                        <Button
                          onClick={handlePrint}
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 md:flex-none"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">طباعة</span>
                        </Button>
                        <Button
                          onClick={handleExportDailyExpenses}
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 md:flex-none"
                          disabled={expenseLoading || !expenseData}
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">تصدير</span>
                        </Button>
                      </div>

                      {/* البيانات */}
                      {expenseLoading ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                          <p className="text-gray-600 text-sm">جاري التحميل...</p>
                        </div>
                      ) : expenseData ? (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          {/* ملخص المصاريف - 4 بطاقات */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-gray-200">
                            <div className="p-4 border-l border-gray-200 last:border-l-0">
                              <p className="text-xs font-medium text-gray-600 mb-1">أجور العمال</p>
                              <p className="text-lg md:text-xl font-bold text-blue-600">{formatCurrency(expenseData.workerWages.toString())}</p>
                              <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.workerWages / expenseData.total) * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div className="p-4 border-l border-gray-200 last:border-l-0">
                              <p className="text-xs font-medium text-gray-600 mb-1">تكاليف المواد</p>
                              <p className="text-lg md:text-xl font-bold text-green-600">{formatCurrency(expenseData.materialCosts.toString())}</p>
                              <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.materialCosts / expenseData.total) * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div className="p-4 border-l border-gray-200 last:border-l-0">
                              <p className="text-xs font-medium text-gray-600 mb-1">النقل</p>
                              <p className="text-lg md:text-xl font-bold text-orange-600">{formatCurrency(expenseData.transportation.toString())}</p>
                              <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.transportation / expenseData.total) * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div className="p-4 border-l border-gray-200 last:border-l-0">
                              <p className="text-xs font-medium text-gray-600 mb-1">مصاريف متنوعة</p>
                              <p className="text-lg md:text-xl font-bold text-red-600">{formatCurrency(expenseData.miscExpenses.toString())}</p>
                              <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.miscExpenses / expenseData.total) * 100).toFixed(1) : 0}%</p>
                            </div>
                          </div>

                          {/* صف الإجمالي */}
                          <div className="bg-gray-900 text-white px-4 py-4 flex justify-between items-center">
                            <span className="font-semibold">الإجمالي</span>
                            <span className="text-xl font-bold">{formatCurrency(expenseData.total.toString())}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>

                  {/* Tab 2: Worker Statement */}
                  <TabsContent value="worker-statement" className="m-0 p-4 md:p-6 space-y-4">
                    <div className="max-w-7xl mx-auto w-full space-y-4">
                      {/* شريط الفلتر الموحد */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-gray-700 block mb-2">العامل</Label>
                            <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="اختر العامل" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(workers) && workers.map((worker: any) => (
                                  <SelectItem key={worker.id} value={worker.id}>
                                    {worker.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-medium text-gray-700 block mb-2">من التاريخ</Label>
                            <Input
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>

                          <div>
                            <Label className="text-xs font-medium text-gray-700 block mb-2">إلى التاريخ</Label>
                            <Input
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>

                          <div className="flex items-end gap-2">
                            <Button
                              onClick={handleReset}
                              variant="outline"
                              size="sm"
                              className="gap-2 flex-1"
                            >
                              <RefreshCw className="h-4 w-4" />
                              <span className="hidden sm:inline">إعادة</span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* أزرار العمليات */}
                      <div className="flex flex-wrap gap-2 md:gap-3">
                        <Button
                          onClick={() => refetchStatement()}
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 md:flex-none"
                          disabled={statementLoading}
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="hidden sm:inline">تحديث</span>
                        </Button>
                        <Button
                          onClick={handlePrint}
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 md:flex-none"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">طباعة</span>
                        </Button>
                        <Button
                          onClick={handleExportWorkerStatement}
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 md:flex-none"
                          disabled={statementLoading || !statementData}
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">تصدير</span>
                        </Button>
                      </div>

                      {/* البيانات */}
                      {!selectedWorkerId ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                          <p className="text-gray-600 text-sm">اختر عامل لعرض بيانه</p>
                        </div>
                      ) : statementLoading ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                          <p className="text-gray-600 text-sm">جاري التحميل...</p>
                        </div>
                      ) : statementData ? (
                        <div className="space-y-4">
                          {/* معلومات العامل - 4 بطاقات */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-xs font-medium text-gray-600 mb-2">اسم العامل</p>
                              <p className="text-sm md:text-base font-bold text-gray-900">{statementData.worker.name}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-xs font-medium text-gray-600 mb-2">نوع العامل</p>
                              <p className="text-sm md:text-base font-bold text-gray-900">{statementData.worker.type}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-xs font-medium text-gray-600 mb-2">الأجر اليومي</p>
                              <p className="text-sm md:text-base font-bold text-blue-600">{formatCurrency(statementData.worker.dailyWage.toString())}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-xs font-medium text-gray-600 mb-2">الرصيد المتبقي</p>
                              <p className="text-sm md:text-base font-bold text-green-600">{formatCurrency(statementData.summary.remainingBalance.toString())}</p>
                            </div>
                          </div>

                          {/* جدول السجل */}
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-900 text-white">
                                    <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                                    <th className="px-4 py-3 text-right font-semibold">أيام</th>
                                    <th className="px-4 py-3 text-right font-semibold">يومي</th>
                                    <th className="px-4 py-3 text-right font-semibold">مستحق</th>
                                    <th className="px-4 py-3 text-right font-semibold">مدفوع</th>
                                    <th className="px-4 py-3 text-right font-semibold">متبقي</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {statementData.attendance.map((record, idx) => (
                                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 text-gray-900">{record.date}</td>
                                      <td className="px-4 py-3 text-gray-900">{record.workDays}</td>
                                      <td className="px-4 py-3 text-gray-900">{formatCurrency(record.dailyWage.toString())}</td>
                                      <td className="px-4 py-3 font-medium text-blue-600">{formatCurrency(record.actualWage.toString())}</td>
                                      <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(record.paidAmount.toString())}</td>
                                      <td className="px-4 py-3 font-medium text-orange-600">{formatCurrency(record.remainingAmount.toString())}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* ملخص النهاية - 4 بطاقات */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-gray-900 text-white rounded-lg p-4 text-center">
                              <p className="text-xs font-medium opacity-80 mb-2">إجمالي أيام العمل</p>
                              <p className="text-2xl font-bold">{statementData.summary.totalWorkDays}</p>
                            </div>
                            <div className="bg-blue-600 text-white rounded-lg p-4 text-center">
                              <p className="text-xs font-medium opacity-80 mb-2">المستحق</p>
                              <p className="text-xl font-bold">{formatCurrency(statementData.summary.totalEarned.toString())}</p>
                            </div>
                            <div className="bg-green-600 text-white rounded-lg p-4 text-center">
                              <p className="text-xs font-medium opacity-80 mb-2">المدفوع</p>
                              <p className="text-xl font-bold">{formatCurrency(statementData.summary.totalPaid.toString())}</p>
                            </div>
                            <div className="bg-orange-600 text-white rounded-lg p-4 text-center">
                              <p className="text-xs font-medium opacity-80 mb-2">المتبقي</p>
                              <p className="text-xl font-bold">{formatCurrency(statementData.summary.remainingBalance.toString())}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
