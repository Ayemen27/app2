import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Printer, RefreshCw, TrendingUp } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { UnifiedSearchFilter, FilterConfig } from "@/components/ui/unified-search-filter";
import '@/styles/excel-print-styles.css';

interface DailyExpenseData {
  date: string;
  workerWages: number;
  materialCosts: number;
  transportation: number;
  miscExpenses: number;
  total: number;
}

interface FilterValues {
  dateRange?: { from?: Date; to?: Date };
  reportType?: string;
}

export default function ExcelStyleDailyExpenses() {
  const [filterValues, setFilterValues] = useState<FilterValues>({
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 7)),
      to: new Date()
    },
    reportType: "daily"
  });
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const { selectedProjectId, projects } = useSelectedProject();
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const { data: expenseData, isLoading, refetch } = useQuery<DailyExpenseData>({
    queryKey: ["/api/daily-expenses-excel", selectedProjectId, selectedDate],
    queryFn: async () => {
      if (!selectedProjectId) return {
        date: selectedDate,
        workerWages: 0,
        materialCosts: 0,
        transportation: 0,
        miscExpenses: 0,
        total: 0
      };
      
      return apiRequest(`/api/daily-expenses-excel?projectId=${selectedProjectId}&date=${selectedDate}`, "GET");
    },
    enabled: !!selectedProjectId
  });

  const handleExportExcel = async () => {
    if (!expenseData || !selectedProject) return;
    
    try {
      // Dynamic import for ExcelJS
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('المصاريف اليومية');
      
      // Set column widths
      worksheet.columns = [
        { width: 25 },
        { width: 18 },
        { width: 15 }
      ];
      
      // Add title
      const titleRow = worksheet.addRow(['تقرير المصاريف اليومية']);
      titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
      
      // Add project info
      worksheet.addRow(['اسم المشروع:', selectedProject.name, '']);
      worksheet.addRow(['التاريخ:', selectedDate, '']);
      worksheet.addRow([]);
      
      // Add headers
      const headerRow = worksheet.addRow(['البند', 'المبلغ (ريال)', 'النسبة %']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Add data rows
      const dataRows = [
        ['أجور العمال', expenseData.workerWages, expenseData.total > 0 ? ((expenseData.workerWages / expenseData.total) * 100).toFixed(1) : 0],
        ['تكاليف المواد', expenseData.materialCosts, expenseData.total > 0 ? ((expenseData.materialCosts / expenseData.total) * 100).toFixed(1) : 0],
        ['النقل', expenseData.transportation, expenseData.total > 0 ? ((expenseData.transportation / expenseData.total) * 100).toFixed(1) : 0],
        ['مصاريف متنوعة', expenseData.miscExpenses, expenseData.total > 0 ? ((expenseData.miscExpenses / expenseData.total) * 100).toFixed(1) : 0]
      ];
      
      dataRows.forEach(row => {
        const r = worksheet.addRow(row);
        r.alignment = { horizontal: 'right', vertical: 'middle' };
        r.getCell(2).numFmt = '#,##0.00';
      });
      
      // Add total row
      const totalRow = worksheet.addRow(['الإجمالي', expenseData.total, 100]);
      totalRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      totalRow.alignment = { horizontal: 'center', vertical: 'middle' };
      totalRow.getCell(2).numFmt = '#,##0.00';
      
      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_المصاريف_${selectedProject.name}_${selectedDate}.xlsx`;
      link.click();
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!selectedProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">يرجى اختيار مشروع لعرض المصاريف</p>
            <div className="mt-4">
              <ProjectSelector onProjectChange={(projectId) => {
                console.log('تم تغيير المشروع في المصاريف Excel:', projectId);
              }} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: "dateRange",
      label: "نطاق التاريخ",
      type: "date-range",
      placeholder: "من التاريخ إلى التاريخ"
    },
    {
      key: "reportType",
      label: "نوع التقرير",
      type: "select",
      defaultValue: "daily",
      options: [
        { value: "daily", label: "يومي" },
        { value: "weekly", label: "أسبوعي" },
        { value: "monthly", label: "شهري" }
      ]
    }
  ];

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleReset = () => {
    setFilterValues({
      dateRange: {
        from: new Date(new Date().setDate(new Date().getDate() - 7)),
        to: new Date()
      },
      reportType: "daily"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 no-print">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            التقارير اليومية
          </h1>
          <p className="text-slate-600">عرض وتحليل المصاريف اليومية مع تصدير Excel</p>
        </div>

        {/* Project Selector */}
        <div className="mb-6">
          <ProjectSelector onProjectChange={() => {}} />
        </div>

        {/* Unified Filter */}
        <Card className="mb-6 shadow-sm border-0">
          <CardContent className="pt-6">
            <UnifiedSearchFilter
              filters={filterConfigs}
              filterValues={filterValues}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              showResetButton={true}
              showActiveFilters={true}
              showSearch={false}
              compact={true}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="gap-2"
            disabled={isLoading}
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
            onClick={handleExportExcel}
            variant="outline"
            className="gap-2"
            disabled={isLoading || !expenseData}
          >
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* تقرير بنمط Excel */}
      <div className="max-w-6xl mx-auto excel-style-report bg-white border border-gray-300 rounded-lg overflow-hidden print:shadow-none print:border-0">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 text-center">
          <h2 className="text-xl font-bold">تقرير المصاريف اليومية</h2>
          <p className="text-sm opacity-90">نمط Excel المحسن</p>
        </div>

        {/* معلومات المشروع */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">اسم المشروع:</span> {selectedProject?.name || 'غير محدد'}
            </div>
            <div>
              <span className="font-semibold">التاريخ:</span> {selectedDate}
            </div>
          </div>
        </div>

        {/* جدول المصاريف */}
        <div className="overflow-x-auto">
          <table className="w-full excel-table">
            <thead>
              <tr className="bg-gray-100">
                <th className="excel-cell header-cell">البند</th>
                <th className="excel-cell header-cell">المبلغ (ريال)</th>
                <th className="excel-cell header-cell">النسبة %</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="excel-cell text-center py-8">
                    جاري التحميل...
                  </td>
                </tr>
              ) : expenseData ? (
                <>
                  <tr>
                    <td className="excel-cell">أجور العمال</td>
                    <td className="excel-cell number-cell">
                      {formatCurrency(expenseData.workerWages.toString())}
                    </td>
                    <td className="excel-cell number-cell">
                      {expenseData.total > 0 ? ((expenseData.workerWages / expenseData.total) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-cell">تكاليف المواد</td>
                    <td className="excel-cell number-cell">
                      {formatCurrency(expenseData.materialCosts.toString())}
                    </td>
                    <td className="excel-cell number-cell">
                      {expenseData.total > 0 ? ((expenseData.materialCosts / expenseData.total) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-cell">النقل</td>
                    <td className="excel-cell number-cell">
                      {formatCurrency(expenseData.transportation.toString())}
                    </td>
                    <td className="excel-cell number-cell">
                      {expenseData.total > 0 ? ((expenseData.transportation / expenseData.total) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-cell">مصاريف متنوعة</td>
                    <td className="excel-cell number-cell">
                      {formatCurrency(expenseData.miscExpenses.toString())}
                    </td>
                    <td className="excel-cell number-cell">
                      {expenseData.total > 0 ? ((expenseData.miscExpenses / expenseData.total) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr className="total-row">
                    <td className="excel-cell total-cell">الإجمالي</td>
                    <td className="excel-cell total-cell number-cell">
                      {formatCurrency(expenseData.total.toString())}
                    </td>
                    <td className="excel-cell total-cell number-cell">100.0%</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={3} className="excel-cell text-center py-8">
                    لا توجد بيانات متاحة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
          <div className="flex justify-between">
            <span>تاريخ الإنشاء: {new Date().toLocaleDateString('ar-SA')}</span>
            <span>نظام إدارة المشاريع الإنشائية</span>
          </div>
        </div>
      </div>
    </div>
  );
}