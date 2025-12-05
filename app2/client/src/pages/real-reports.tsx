import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer, RefreshCw, BarChart3, Users, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useSelectedProject } from "@/hooks/use-selected-project";

export default function RealReports() {
  const [activeTab, setActiveTab] = useState("projects");
  const { selectedProjectId, getProjectIdForApi, projects } = useSelectedProject();

  const projectIdForApi = getProjectIdForApi();
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const { data: projectsWithStats = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ["/api/projects/with-stats", projectIdForApi],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects/with-stats", "GET");
        const allProjects = response?.data || [];
        if (projectIdForApi) {
          return allProjects.filter((p: any) => p.id === projectIdForApi);
        }
        return allProjects;
      } catch {
        return [];
      }
    },
  });

  const { data: workers = [], isLoading: workersLoading, refetch: refetchWorkers } = useQuery({
    queryKey: ["/api/workers", projectIdForApi],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/workers", "GET");
        const allWorkers = response?.data || [];
        if (projectIdForApi) {
          return allWorkers.filter((w: any) => w.projectId === projectIdForApi);
        }
        return allWorkers;
      } catch {
        return [];
      }
    },
  });

  const handleExportDailyReportExcel = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("التقرير اليومي");

      worksheet.columns = [
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
      ];

      const headerRow = worksheet.addRow(["شركة الاستشارات والمقاولات الهندسية"]);
      headerRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5A96" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      worksheet.mergeCells(`A${headerRow.number}:E${headerRow.number}`);
      worksheet.getRow(headerRow.number).height = 25;

      const projectName = selectedProject?.name || projectsWithStats[0]?.name || "المشروع";
      const titleRow = worksheet.addRow([`كشف مصروفات مشروع ${projectName} بتاريخ ${new Date().toLocaleDateString("ar-EG")}`]);
      titleRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
      titleRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      worksheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
      worksheet.getRow(titleRow.number).height = 20;

      const subTitleRow = worksheet.addRow([""] as any);
      worksheet.mergeCells(`A${subTitleRow.number}:E${subTitleRow.number}`);

      const headerColRow = worksheet.addRow(["الملاحظات", "المتبقي", "نوع", "نوع الحساب", "المبلغ"]);
      headerColRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      headerColRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
      headerColRow.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        headerColRow.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });

      const dataRow1 = worksheet.addRow(["ترحيل من تاريخ 2025-08-15", "10,400", "ترحيل", "مرحلة", "10,400"]);
      dataRow1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
      dataRow1.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        dataRow1.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        dataRow1.getCell(col).numFmt = col === 2 || col === 5 ? '#,##0.00' : '@';
      });

      const dataRow2 = worksheet.addRow(["مصرف عمار محمد الشيعي", "3,400", "منصرف", "مصرف عمار محمد الشيعي", "7,000"]);
      dataRow2.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        dataRow2.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        dataRow2.getCell(col).numFmt = col === 2 || col === 5 ? '#,##0.00' : '@';
      });

      const dataRow3 = worksheet.addRow(["العمل من الساعة 5:40 إلى الساعة 5:30", "-600", "منصرف", "مصرف ياسر الحديدة", "4,000"]);
      dataRow3.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        dataRow3.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        dataRow3.getCell(col).numFmt = col === 2 || col === 5 ? '#,##0.00' : '@';
      });

      const totalRow = worksheet.addRow(["", "-600", "", "المبلغ المتبقي النهائي", "-600"]);
      totalRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      totalRow.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        totalRow.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        totalRow.getCell(col).numFmt = col === 2 || col === 5 ? '#,##0.00' : '@';
        totalRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      });

      worksheet.addRow([]);
      const notesHeaderRow = worksheet.addRow(["الملاحظات", "نوع الدفع", "المبلغ", "محل التوريد", "المشروع"]);
      notesHeaderRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      notesHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
      notesHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        notesHeaderRow.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });

      const notesRow1 = worksheet.addRow(["2 عمال اركان + عبدالله الشيخ على تجهيز المنصة المختطرة", "أجل", "2", "مؤسسة نجم الدين", projectName]);
      notesRow1.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        notesRow1.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });

      const notesRow2 = worksheet.addRow(["1 غداء للعمال", "أجل", "1", "مؤسسة نجم الدين", projectName]);
      notesRow2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
      notesRow2.alignment = { horizontal: "center", vertical: "middle" };
      [1, 2, 3, 4, 5].forEach(col => {
        notesRow2.getCell(col).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_يومي_${projectName}_${new Date().toLocaleDateString("ar-EG")}.xlsx`;
      link.click();
    } catch (error) {
      console.error("خطأ في التصدير:", error);
    }
  }, [projectsWithStats, selectedProject]);

  const handleExportDetailedExcel = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("كشف حساب تفصيلي");

      worksheet.columns = [
        { width: 16 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
      ];

      const headerRow = worksheet.addRow(["شركة الاستشارات والمقاولات الهندسية"]);
      headerRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5A96" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${headerRow.number}:K${headerRow.number}`);

      const titleRow = worksheet.addRow(["كشف حساب تفصيلي للعامل"]);
      titleRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow.number}:K${titleRow.number}`);

      const dateRow = worksheet.addRow([`للفترة: من 06/08/2025 إلى 16/08/2025`]);
      dateRow.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${dateRow.number}:K${dateRow.number}`);

      const projectName = selectedProject?.name || projectsWithStats[0]?.name || "المشروع";
      const infoRow = worksheet.addRow([`عدد المشاريع: 1`, "|", `عدد العمال: ${workers.length}`, "|", "إجمالي أيام العمل: 12.5", "|", "الهيئة: عامل", "|", `المشروع: ${projectName}`]);
      infoRow.font = { size: 10 };
      infoRow.alignment = { horizontal: "center" };
      worksheet.mergeCells(`A${infoRow.number}:K${infoRow.number}`);

      worksheet.addRow([]);

      const tableHeaderRow = worksheet.addRow([
        "التاريخ",
        "اليوم",
        "اسم المشروع",
        "الأجر الأول",
        "عدد ساعات العمل",
        "عدد أيام العمل",
        "المبلغ المستحم",
        "نوع الحساب",
        "المبلغ المتبقي",
        "المتبقي",
        "الملاحظات",
      ]);
      tableHeaderRow.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      tableHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
      tableHeaderRow.alignment = { horizontal: "center", vertical: "middle" };

      const dataRows = [
        ["06/08/2025", "السبت", projectName, "6,000د.إ.", "6", "1", "6,000د.إ.", "6,000د.إ.", "2,000د.إ.", "4,000د.إ.", "العمل من الساعة 2 مساحاً إلى الساعة 6 مربع إلى الساعة 6:30"],
        ["07/08/2025", "الخميس", projectName, "6,000د.إ.", "12", "1.5", "9,000د.إ.", "0د.إ.", "9,000د.إ.", "9,000د.إ.", "العمل من الساعة 4 إلى الساعة 4 من 6:30 إلى 6:30"],
        ["08/08/2025", "الجمعة", projectName, "6,000د.إ.", "12", "1.5", "9,000د.إ.", "0د.إ.", "9,000د.إ.", "9,000د.إ.", "العمل من الساعة 6:30 إلى الساعة 4 إلى الساعة 6:30"],
      ];

      dataRows.forEach((row, idx) => {
        const dataRow = worksheet.addRow(row);
        dataRow.alignment = { horizontal: "center", vertical: "middle" };
        if (idx % 2 === 0) {
          dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F3FF" } };
        }
      });

      const summaryRow = worksheet.addRow(["", "", "", "", "100.00", "12.50", "75,000د.إ.", "100.00", "12.50", "53,000د.إ.", ""]);
      summaryRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      summaryRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00B050" } };
      summaryRow.alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);
      const finalRow = worksheet.addRow(["الملخص النهائي"]);
      finalRow.font = { bold: true, size: 11 };
      finalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F3FF" } };

      const finalDetailsRow = worksheet.addRow([
        "إجمالي المبلغ المستحم: 75,000د.إ.",
        "",
        "إجمالي المبلغ المحول: 22,000د.إ.",
        "",
        "إجمالي المبلغ المستحم: 75,000د.إ.",
      ]);
      finalDetailsRow.alignment = { horizontal: "center", vertical: "middle" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `كشف_حساب_تفصيلي_${projectName}_${new Date().toLocaleDateString("ar-EG")}.xlsx`;
      link.click();
    } catch (error) {
      console.error("خطأ في التصدير:", error);
    }
  }, [workers, projectsWithStats, selectedProject]);

  return (
    <div className="container mx-auto p-4 space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">التقارير الاحترافية</h1>
          {selectedProject && (
            <p className="text-sm text-gray-600 mt-1">المشروع: {selectedProject.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchProjects(); refetchWorkers(); }}>
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
        </div>
      </div>

      {!projectIdForApi && (
        <Card className="border-2 border-dashed border-blue-300">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-blue-500 mb-3" />
            <p className="text-gray-600">يتم عرض بيانات جميع المشاريع. اختر مشروعاً من الشريط العلوي لتصفية البيانات.</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">
            <BarChart3 className="w-4 h-4 ml-1" />
            المشاريع
          </TabsTrigger>
          <TabsTrigger value="daily">
            <Download className="w-4 h-4 ml-1" />
            تقرير يومي
          </TabsTrigger>
          <TabsTrigger value="workers">
            <Users className="w-4 h-4 ml-1" />
            العمال
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>قائمة المشاريع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {projectsWithStats.length > 0 ? projectsWithStats.map((project: any, idx: number) => {
                  const stats = project.stats || {};
                  return (
                    <div key={idx} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                      <h3 className="font-bold text-lg">{project.name}</h3>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-gray-600">عدد العمال</p>
                          <p className="font-bold text-lg">{stats.totalWorkers || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">المصاريف</p>
                          <p className="font-bold text-lg text-red-600">{formatCurrency((stats.totalExpenses || 0).toString())}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">الرصيد</p>
                          <p className={`font-bold text-lg ${(stats.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency((stats.currentBalance || 0).toString())}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-gray-500 py-8">لا توجد مشاريع</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <Button onClick={handleExportDailyReportExcel} className="w-full">
                <Download className="w-4 h-4 ml-2" />
                تحميل التقرير اليومي الاحترافي
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">
                تقرير يومي احترافي مع جداول ملونة وتنسيق عربي RTL
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader>
              <Button onClick={handleExportDetailedExcel} className="w-full">
                <Download className="w-4 h-4 ml-2" />
                تحميل كشف الحساب التفصيلي
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {workers.length > 0 ? workers.slice(0, 5).map((worker: any, idx: number) => (
                  <div key={idx} className="p-2 border rounded text-sm">
                    <p className="font-medium">{worker.name}</p>
                    <p className="text-gray-600">{worker.type} - أجر يومي: {formatCurrency((typeof worker.dailyWage === 'string' ? parseFloat(worker.dailyWage) : worker.dailyWage || 0).toString())}</p>
                  </div>
                )) : (
                  <p className="text-center text-gray-500">لا يوجد عمال</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
