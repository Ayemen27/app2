import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Printer, User, RefreshCw } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, formatDate, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import '@/styles/excel-print-styles.css';

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

export default function ExcelStyleWorkerStatement() {
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(getCurrentDate());
  const { selectedProjectId } = useSelectedProject();
  
  // جلب معلومات المشروع
  const { data: selectedProject } = useQuery({
    queryKey: ["/api/projects", selectedProjectId],
    queryFn: () => selectedProjectId ? apiRequest(`/api/projects/${selectedProjectId}`, "GET") : null,
    enabled: !!selectedProjectId
  });

  // جلب قائمة العمال
  const { data: workers = [] } = useQuery({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/workers`, "GET");
        // معالجة هيكل الاستجابة
        if (response && response.data) {
          return Array.isArray(response.data) ? response.data : [];
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("❌ خطأ في جلب العمال:", error);
        return [];
      }
    }
  });

  // جلب بيان العامل
  const { data: statementData, isLoading, refetch } = useQuery<WorkerStatementData>({
    queryKey: ["/api/worker-statement-excel", selectedProjectId, selectedWorkerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!selectedProjectId || !selectedWorkerId) return null;
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        workerId: selectedWorkerId,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });
      return apiRequest(`/api/worker-statement-excel?${params}`, "GET");
    },
    enabled: !!selectedProjectId && !!selectedWorkerId
  });

  const handleExportExcel = async () => {
    if (!statementData || !selectedProject) return;
    
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('بيان العامل');
      
      worksheet.columns = [
        { width: 12 },
        { width: 12 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 20 }
      ];
      
      // Title
      const titleRow = worksheet.addRow(['بيان حساب العامل']);
      titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'center', rtl: true };
      worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
      
      // Worker info
      worksheet.addRow(['اسم العامل:', statementData.worker.name, '', 'نوع العامل:', statementData.worker.type]);
      worksheet.addRow(['الأجر اليومي:', formatCurrency(statementData.worker.dailyWage.toString()), '', 'المشروع:', selectedProject?.name]);
      worksheet.addRow(['من تاريخ:', dateFrom || 'البداية', '', 'إلى تاريخ:', dateTo]);
      worksheet.addRow([]);
      
      // Headers
      const headerRow = worksheet.addRow(['التاريخ', 'أيام العمل', 'الأجر اليومي', 'الأجر المستحق', 'المدفوع', 'المتبقي', 'وصف العمل']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'center', rtl: true };
      
      // Data rows
      statementData.attendance.forEach(record => {
        const row = worksheet.addRow([
          record.date,
          record.workDays,
          record.dailyWage,
          record.actualWage,
          record.paidAmount,
          record.remainingAmount,
          record.workDescription || '-'
        ]);
        row.alignment = { rtl: true };
        [2, 3, 4, 5, 6].forEach(col => {
          row.getCell(col).numFmt = '#,##0.00';
        });
      });
      
      // Summary
      worksheet.addRow([]);
      const sumRow1 = worksheet.addRow(['إجمالي أيام العمل:', statementData.summary.totalWorkDays + ' يوم']);
      sumRow1.font = { bold: true };
      sumRow1.alignment = { rtl: true };
      
      const sumRow2 = worksheet.addRow(['إجمالي الأجور المستحقة:', statementData.summary.totalEarned]);
      sumRow2.font = { bold: true };
      sumRow2.getCell(2).numFmt = '#,##0.00';
      sumRow2.alignment = { rtl: true };
      
      const sumRow3 = worksheet.addRow(['إجمالي المدفوع:', statementData.summary.totalPaid]);
      sumRow3.font = { bold: true };
      sumRow3.getCell(2).numFmt = '#,##0.00';
      sumRow3.alignment = { rtl: true };
      
      const balanceRow = worksheet.addRow(['الرصيد المتبقي:', statementData.summary.remainingBalance]);
      balanceRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      balanceRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      balanceRow.getCell(2).numFmt = '#,##0.00';
      balanceRow.alignment = { rtl: true };
      
      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `بيان_العامل_${statementData.worker.name}_${dateTo}.xlsx`;
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
            <p className="text-gray-500">يرجى اختيار مشروع لعرض بيان العامل</p>
            <div className="mt-4">
              <ProjectSelector onProjectChange={() => {}} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* أدوات التحكم */}
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold">بيان العامل - نمط Excel</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div>
          <label className="block text-sm font-medium">المشروع</label>
          <ProjectSelector onProjectChange={() => {}} />
        </div>
        <div>
          <label className="block text-sm font-medium">العامل</label>
          <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر العامل" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((worker: any) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name} - {worker.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium">من تاريخ</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">إلى تاريخ</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* بيان العامل بنمط Excel */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">جاري تحميل بيان العامل...</p>
          </CardContent>
        </Card>
      ) : !statementData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="text-gray-500">يرجى اختيار عامل لعرض البيان</p>
          </CardContent>
        </Card>
      ) : (
        <div className="excel-style-report">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 text-center">
            <h2 className="text-xl font-bold">بيان حساب العامل</h2>
            <p className="text-sm opacity-90">تفصيل كامل لحضور وأجور العامل</p>
          </div>

          {/* معلومات العامل والمشروع */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold">اسم العامل:</span> {statementData.worker.name}
              </div>
              <div>
                <span className="font-semibold">نوع العامل:</span> {statementData.worker.type}
              </div>
              <div>
                <span className="font-semibold">الأجر اليومي:</span> {formatCurrency(statementData.worker.dailyWage.toString())}
              </div>
              <div>
                <span className="font-semibold">المشروع:</span> {selectedProject?.name}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
              <div>
                <span className="font-semibold">الفترة من:</span> {dateFrom || 'البداية'}
              </div>
              <div>
                <span className="font-semibold">إلى:</span> {dateTo}
              </div>
            </div>
          </div>

          {/* جدول تفاصيل الحضور */}
          <div className="overflow-x-auto">
            <table className="w-full excel-table">
              <thead>
                <tr>
                  <th className="excel-cell header-cell">التاريخ</th>
                  <th className="excel-cell header-cell">أيام العمل</th>
                  <th className="excel-cell header-cell">الأجر اليومي</th>
                  <th className="excel-cell header-cell">الأجر المستحق</th>
                  <th className="excel-cell header-cell">المدفوع</th>
                  <th className="excel-cell header-cell">المتبقي</th>
                  <th className="excel-cell header-cell">وصف العمل</th>
                </tr>
              </thead>
              <tbody>
                {statementData.attendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="excel-cell text-center py-8">
                      لا توجد سجلات حضور في الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  statementData.attendance.map((record, index) => (
                    <tr key={index}>
                      <td className="excel-cell">{formatDate(record.date)}</td>
                      <td className="excel-cell number-cell">{record.workDays}</td>
                      <td className="excel-cell number-cell">
                        {formatCurrency(record.dailyWage.toString())}
                      </td>
                      <td className="excel-cell number-cell">
                        {formatCurrency(record.actualWage.toString())}
                      </td>
                      <td className="excel-cell number-cell">
                        {formatCurrency(record.paidAmount.toString())}
                      </td>
                      <td className="excel-cell number-cell">
                        <span className={record.remainingAmount > 0 ? 'positive-amount' : record.remainingAmount < 0 ? 'negative-amount' : 'zero-amount'}>
                          {formatCurrency(record.remainingAmount.toString())}
                        </span>
                      </td>
                      <td className="excel-cell text-wrap">
                        {record.workDescription || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ملخص الحساب */}
          <div className="p-4 bg-gray-50 border-t">
            <h3 className="font-bold text-lg text-center">ملخص الحساب</h3>
            <div className="overflow-x-auto">
              <table className="w-full excel-table">
                <tbody>
                  <tr>
                    <td className="excel-cell font-semibold">إجمالي أيام العمل</td>
                    <td className="excel-cell number-cell font-semibold">
                      {statementData.summary.totalWorkDays} يوم
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-cell font-semibold">إجمالي الأجور المستحقة</td>
                    <td className="excel-cell number-cell font-semibold positive-amount">
                      {formatCurrency(statementData.summary.totalEarned.toString())}
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-cell font-semibold">إجمالي المدفوع</td>
                    <td className="excel-cell number-cell font-semibold negative-amount">
                      {formatCurrency(statementData.summary.totalPaid.toString())}
                    </td>
                  </tr>
                  <tr className="total-row">
                    <td className="excel-cell total-cell">الرصيد المتبقي</td>
                    <td className="excel-cell total-cell number-cell">
                      <span className={statementData.summary.remainingBalance > 0 ? 'positive-amount' : statementData.summary.remainingBalance < 0 ? 'negative-amount' : 'zero-amount'}>
                        {formatCurrency(statementData.summary.remainingBalance.toString())}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
            <div className="flex justify-between">
              <span>تاريخ الإنشاء: {new Date().toLocaleDateString('ar-SA')}</span>
              <span>بيان حساب العامل - نظام إدارة المشاريع</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}