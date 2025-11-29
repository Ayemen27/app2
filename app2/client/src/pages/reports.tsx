import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Package,
  Truck,
  BarChart3,
  Download
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
      titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);

      worksheet.addRow(["اسم المشروع:", selectedProject.name, ""]);
      worksheet.addRow(["التاريخ:", selectedDate, ""]);
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(["البند", "المبلغ (ريال)", "النسبة %"]);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
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
      totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
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
      titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);

      worksheet.addRow(["اسم العامل:", statementData.worker.name, "", "نوع العامل:", statementData.worker.type]);
      worksheet.addRow(["الأجر اليومي:", formatCurrency(statementData.worker.dailyWage.toString()), "", "المشروع:", selectedProject?.name]);
      worksheet.addRow(["من تاريخ:", dateFrom || "البداية", "", "إلى تاريخ:", dateTo]);
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(["التاريخ", "أيام العمل", "الأجر اليومي", "الأجر المستحق", "المدفوع", "المتبقي", "وصف العمل"]);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
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
      balanceRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">مركز التقارير الشامل</h2>
              <p className="text-slate-600 mb-6">يرجى اختيار مشروع لعرض التقارير والإحصائيات</p>
              <ProjectSelector onProjectChange={() => {}} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 no-print">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">مركز التقارير الشامل</h1>
          </div>
          <p className="text-slate-600">إدارة وتحليل جميع تقارير المشروع - {selectedProject?.name}</p>
        </div>

        {/* Project Selector Card */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <ProjectSelector onProjectChange={() => {}} variant="compact" />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-2 gap-2 bg-white p-1 rounded-lg shadow-md">
            <TabsTrigger value="daily-expenses" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">المصاريف اليومية</span>
            </TabsTrigger>
            <TabsTrigger value="worker-statement" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">بيان العامل</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Daily Expenses */}
          <TabsContent value="daily-expenses" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  تقرير المصاريف اليومية
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Filter Bar */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex flex-col md:flex-row-reverse gap-4 items-end">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      إعادة تعيين
                    </Button>

                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">التاريخ</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    onClick={() => refetchExpenses()}
                    variant="outline"
                    className="gap-2"
                    disabled={expenseLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تحديث
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    طباعة
                  </Button>
                  <Button
                    onClick={handleExportDailyExpenses}
                    variant="outline"
                    className="gap-2"
                    disabled={expenseLoading || !expenseData}
                  >
                    <Download className="h-4 w-4" />
                    تصدير Excel
                  </Button>
                </div>

                {/* Report Data */}
                {expenseLoading ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600">جاري التحميل...</p>
                  </div>
                ) : expenseData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="px-4 py-3 text-right font-semibold">البند</th>
                          <th className="px-4 py-3 text-right font-semibold">المبلغ (ريال)</th>
                          <th className="px-4 py-3 text-right font-semibold">النسبة %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3">أجور العمال</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(expenseData.workerWages.toString())}</td>
                          <td className="px-4 py-3">{expenseData.total > 0 ? ((expenseData.workerWages / expenseData.total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3">تكاليف المواد</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(expenseData.materialCosts.toString())}</td>
                          <td className="px-4 py-3">{expenseData.total > 0 ? ((expenseData.materialCosts / expenseData.total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3">النقل</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(expenseData.transportation.toString())}</td>
                          <td className="px-4 py-3">{expenseData.total > 0 ? ((expenseData.transportation / expenseData.total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3">مصاريف متنوعة</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(expenseData.miscExpenses.toString())}</td>
                          <td className="px-4 py-3">{expenseData.total > 0 ? ((expenseData.miscExpenses / expenseData.total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr className="bg-blue-600 text-white font-bold">
                          <td className="px-4 py-3">الإجمالي</td>
                          <td className="px-4 py-3">{formatCurrency(expenseData.total.toString())}</td>
                          <td className="px-4 py-3">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Worker Statement */}
          <TabsContent value="worker-statement" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  بيان حساب العامل
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Filter Bar */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">العامل</Label>
                      <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="اختر العامل" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(workers) && workers.map((worker: any) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name} - {worker.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">من التاريخ</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">إلى التاريخ</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    onClick={() => refetchStatement()}
                    variant="outline"
                    className="gap-2"
                    disabled={statementLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تحديث
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    طباعة
                  </Button>
                  <Button
                    onClick={handleExportWorkerStatement}
                    variant="outline"
                    className="gap-2"
                    disabled={statementLoading || !statementData}
                  >
                    <Download className="h-4 w-4" />
                    تصدير Excel
                  </Button>
                </div>

                {/* Report Data */}
                {!selectedWorkerId ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600">اختر عامل لعرض بيانه</p>
                  </div>
                ) : statementLoading ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600">جاري التحميل...</p>
                  </div>
                ) : statementData ? (
                  <div className="space-y-6">
                    {/* Worker Info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div>
                        <p className="text-sm text-slate-600">اسم العامل</p>
                        <p className="font-bold text-lg">{statementData.worker.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">نوع العامل</p>
                        <p className="font-bold text-lg">{statementData.worker.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">الأجر اليومي</p>
                        <p className="font-bold text-lg">{formatCurrency(statementData.worker.dailyWage.toString())}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">الرصيد المتبقي</p>
                        <p className="font-bold text-lg text-green-600">{formatCurrency(statementData.summary.remainingBalance.toString())}</p>
                      </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-green-600 text-white">
                            <th className="px-4 py-3 text-right">التاريخ</th>
                            <th className="px-4 py-3 text-right">أيام العمل</th>
                            <th className="px-4 py-3 text-right">الأجر اليومي</th>
                            <th className="px-4 py-3 text-right">الأجر المستحق</th>
                            <th className="px-4 py-3 text-right">المدفوع</th>
                            <th className="px-4 py-3 text-right">المتبقي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementData.attendance.map((record, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="px-4 py-3">{record.date}</td>
                              <td className="px-4 py-3">{record.workDays}</td>
                              <td className="px-4 py-3">{formatCurrency(record.dailyWage.toString())}</td>
                              <td className="px-4 py-3 font-medium">{formatCurrency(record.actualWage.toString())}</td>
                              <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(record.paidAmount.toString())}</td>
                              <td className="px-4 py-3 font-medium text-orange-600">{formatCurrency(record.remainingAmount.toString())}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-green-600 text-white rounded-lg font-bold">
                      <div>
                        <p className="text-sm opacity-90">إجمالي أيام العمل</p>
                        <p className="text-2xl">{statementData.summary.totalWorkDays}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90">إجمالي المستحق</p>
                        <p className="text-2xl">{formatCurrency(statementData.summary.totalEarned.toString())}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90">إجمالي المدفوع</p>
                        <p className="text-2xl">{formatCurrency(statementData.summary.totalPaid.toString())}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90">الرصيد المتبقي</p>
                        <p className="text-2xl">{formatCurrency(statementData.summary.remainingBalance.toString())}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
