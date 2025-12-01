import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer, RefreshCw, BarChart3, Users, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

export default function RealReports() {
  const [activeTab, setActiveTab] = useState("projects");

  // جلب بيانات المشاريع
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects/with-stats"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects/with-stats", "GET");
        return response?.data || [];
      } catch {
        return [];
      }
    },
  });

  // جلب بيانات العمال
  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/workers", "GET");
        return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      } catch {
        return [];
      }
    },
  });

  // تصدير Excel للمشاريع
  const handleExportProjectsExcel = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("تقرير المشاريع");

      worksheet.columns = [
        { width: 20 },
        { width: 15 },
        { width: 12 },
        { width: 12 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];

      // عنوان
      const title = worksheet.addRow(["تقرير المشاريع الشامل"]);
      title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      title.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${title.number}:G${title.number}`);

      worksheet.addRow([`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`]);
      worksheet.addRow([]);

      // رؤوس الأعمدة
      const header = worksheet.addRow([
        "اسم المشروع",
        "الحالة",
        "عدد العمال",
        "العمال النشطين",
        "إجمالي الدخل",
        "إجمالي المصاريف",
        "الرصيد الحالي",
      ]);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
      header.alignment = { horizontal: "center", vertical: "middle" };

      // البيانات
      projects.forEach((project: any) => {
        const row = worksheet.addRow([
          project.name,
          project.status || "قيد الإنجاز",
          project.totalWorkers || 0,
          project.activeWorkers || 0,
          project.totalIncome || 0,
          project.totalExpenses || 0,
          (project.totalIncome || 0) - (project.totalExpenses || 0),
        ]);
        row.alignment = { horizontal: "center", vertical: "middle" };
        [5, 6, 7].forEach((col) => (row.getCell(col).numFmt = "#,##0.00"));
      });

      // الإجمالي
      const totalIncome = projects.reduce((sum: number, p: any) => sum + (p.totalIncome || 0), 0);
      const totalExpenses = projects.reduce((sum: number, p: any) => sum + (p.totalExpenses || 0), 0);

      worksheet.addRow([]);
      const total = worksheet.addRow(["الإجمالي الكلي", "", "", "", totalIncome, totalExpenses, totalIncome - totalExpenses]);
      total.font = { bold: true, color: { argb: "FFFFFFFF" } };
      total.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      [5, 6, 7].forEach((col) => (total.getCell(col).numFmt = "#,##0.00"));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_المشاريع_${new Date().toLocaleDateString("ar-EG")}.xlsx`;
      link.click();
    } catch (error) {
      console.error("خطأ في التصدير:", error);
    }
  }, [projects]);

  // تصدير Excel للعمال
  const handleExportWorkersExcel = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("تقرير العمال");

      worksheet.columns = [
        { width: 20 },
        { width: 15 },
        { width: 12 },
        { width: 15 },
      ];

      const title = worksheet.addRow(["تقرير العمال الشامل"]);
      title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      title.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${title.number}:D${title.number}`);

      worksheet.addRow([`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`]);
      worksheet.addRow([]);

      const header = worksheet.addRow(["اسم العامل", "نوع العامل", "الأجر اليومي", "عدد أيام العمل"]);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
      header.alignment = { horizontal: "center", vertical: "middle" };

      workers.forEach((worker: any) => {
        const row = worksheet.addRow([worker.name, worker.type || "-", worker.dailyWage || 0, 0]);
        row.alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(3).numFmt = "#,##0.00";
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_العمال_${new Date().toLocaleDateString("ar-EG")}.xlsx`;
      link.click();
    } catch (error) {
      console.error("خطأ في التصدير:", error);
    }
  }, [workers]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">التقارير الشاملة</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            طباعة
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="projects" className="flex gap-2">
            <BarChart3 className="w-4 h-4" />
            المشاريع
          </TabsTrigger>
          <TabsTrigger value="workers" className="flex gap-2">
            <Users className="w-4 h-4" />
            العمال
          </TabsTrigger>
        </TabsList>

        {/* تقرير المشاريع */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تقرير المشاريع الشامل</CardTitle>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportProjectsExcel}
                disabled={projectsLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                تحميل Excel
              </Button>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <p className="text-center py-4">جاري التحميل...</p>
              ) : (
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-right">
                    <thead className="bg-gray-100 border-b-2">
                      <tr>
                        <th className="p-3">المشروع</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">العمال</th>
                        <th className="p-3">النشطين</th>
                        <th className="p-3">الدخل</th>
                        <th className="p-3">المصاريف</th>
                        <th className="p-3">الرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{project.name}</td>
                          <td className="p-3">{project.status || "قيد الإنجاز"}</td>
                          <td className="p-3">{project.totalWorkers || 0}</td>
                          <td className="p-3">{project.activeWorkers || 0}</td>
                          <td className="p-3">{formatCurrency((project.totalIncome || 0).toString())}</td>
                          <td className="p-3">{formatCurrency((project.totalExpenses || 0).toString())}</td>
                          <td className="p-3 font-semibold text-green-600">
                            {formatCurrency(((project.totalIncome || 0) - (project.totalExpenses || 0)).toString())}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تقرير العمال */}
        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تقرير العمال الشامل</CardTitle>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportWorkersExcel}
                disabled={workersLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                تحميل Excel
              </Button>
            </CardHeader>
            <CardContent>
              {workersLoading ? (
                <p className="text-center py-4">جاري التحميل...</p>
              ) : (
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-right">
                    <thead className="bg-gray-100 border-b-2">
                      <tr>
                        <th className="p-3">اسم العامل</th>
                        <th className="p-3">نوع العامل</th>
                        <th className="p-3">الأجر اليومي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map((worker: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{worker.name}</td>
                          <td className="p-3">{worker.type || "-"}</td>
                          <td className="p-3">{formatCurrency((worker.dailyWage || 0).toString())}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <style>{`
        @media print {
          .container { max-width: 100% !important; }
          button { display: none !important; }
          table { border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; }
        }
      `}</style>
    </div>
  );
}
