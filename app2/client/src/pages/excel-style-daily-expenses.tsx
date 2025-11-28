import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import '@/styles/excel-print-styles.css';

interface DailyExpenseData {
  date: string;
  workerWages: number;
  materialCosts: number;
  transportation: number;
  miscExpenses: number;
  total: number;
}

export default function ExcelStyleDailyExpenses() {
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
      titleRow.alignment = { horizontal: 'center', vertical: 'center', rtl: true };
      worksheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
      
      // Add project info
      worksheet.addRow(['اسم المشروع:', selectedProject.name, '']);
      worksheet.addRow(['التاريخ:', selectedDate, '']);
      worksheet.addRow([]);
      
      // Add headers
      const headerRow = worksheet.addRow(['البند', 'المبلغ (ريال)', 'النسبة %']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'center', rtl: true };
      
      // Add data rows
      const dataRows = [
        ['أجور العمال', expenseData.workerWages, expenseData.total > 0 ? ((expenseData.workerWages / expenseData.total) * 100).toFixed(1) : 0],
        ['تكاليف المواد', expenseData.materialCosts, expenseData.total > 0 ? ((expenseData.materialCosts / expenseData.total) * 100).toFixed(1) : 0],
        ['النقل', expenseData.transportation, expenseData.total > 0 ? ((expenseData.transportation / expenseData.total) * 100).toFixed(1) : 0],
        ['مصاريف متنوعة', expenseData.miscExpenses, expenseData.total > 0 ? ((expenseData.miscExpenses / expenseData.total) * 100).toFixed(1) : 0]
      ];
      
      dataRows.forEach(row => {
        const r = worksheet.addRow(row);
        r.alignment = { rtl: true };
        r.getCell(2).numFmt = '#,##0.00';
      });
      
      // Add total row
      const totalRow = worksheet.addRow(['الإجمالي', expenseData.total, 100]);
      totalRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      totalRow.alignment = { horizontal: 'center', vertical: 'center', rtl: true };
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* أدوات التحكم */}
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold">المصاريف اليومية - نمط Excel</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            طباعة
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* فلاتر */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
        <div>
          <label className="block text-sm font-medium">المشروع</label>
          <ProjectSelector onProjectChange={(projectId) => {
            console.log('تم تغيير المشروع في Excel Style:', projectId);
          }} />
        </div>
        <div>
          <label className="block text-sm font-medium">التاريخ</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* تقرير بنمط Excel */}
      <div className="excel-style-report bg-white border border-gray-300 rounded-lg overflow-hidden">
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