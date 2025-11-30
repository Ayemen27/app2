import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Calendar,
  DollarSign,
  AlertCircle,
  BarChart3,
  Truck,
  Download,
  Users
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

export default function DailyExpenses() {
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const { selectedProjectId, projects } = useSelectedProject();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

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
      try {
        const response = await apiRequest(
          `/api/daily-expenses-excel?projectId=${selectedProjectId}&date=${selectedDate}`,
          "GET"
        );
        return (response?.data || response) as DailyExpenseData;
      } catch (error) {
        console.error("❌ خطأ في جلب بيانات المصاريف:", error);
        return {
          date: selectedDate,
          workerWages: 0,
          materialCosts: 0,
          transportation: 0,
          miscExpenses: 0,
          total: 0,
        };
      }
    },
    enabled: !!selectedProjectId,
  });

  const handleReset = () => {
    setSelectedDate(getCurrentDate());
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
            <p className="text-sm text-gray-600">يرجى اختيار مشروع من القائمة لعرض المصاريف اليومية</p>
            <div className="pt-4">
              <ProjectSelector onProjectChange={() => {}} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden no-print">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* رأس الصفحة */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-300 shadow-sm">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900">{selectedProject?.name}</h1>
                  <p className="text-xs md:text-sm text-gray-500">المصاريف اليومية</p>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <ProjectSelector onProjectChange={() => {}} />
              </div>
            </div>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">أجور العمال</p>
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency((expenseData.workerWages || 0).toString())}</p>
                    <p className="text-xs text-gray-500 mt-1">{expenseData.total > 0 ? ((expenseData.workerWages / expenseData.total) * 100).toFixed(1) : 0}%</p>
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
        </div>
      </div>
    </div>
  );
}
